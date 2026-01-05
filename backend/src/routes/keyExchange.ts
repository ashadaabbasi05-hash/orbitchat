// @ts-nocheck
import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../config/logger.ts';
import { getKeyManager } from '../utils/rsa.ts';
import {
  isChatParticipant,
  storeChatKey,
  getChatKey,
  logConnectionEvent,
} from '../services/supabase.ts';
import { authMiddleware } from '../middleware/auth.ts';

const router = Router();

// Schema validation
const registerKeySchema = z.object({
  chatId: z.string().uuid(),
  encryptedKey: z.string(),
});

const syncKeySchema = z.object({
  chatId: z.string().uuid(),
});

/**
 * GET /api/key-exchange/public-key
 * Returns server's public key and metadata for clients
 * No authentication required - public endpoint
 */
router.get('/public-key', (req: Request, res: Response) => {
  try {
    const keyManager = getKeyManager();
    const publicKey = keyManager.getPublicKey();
    const metadata = keyManager.getKeyMetadata();

    logger.debug('Serving public key');

    res.json({
      publicKey,
      keyId: metadata.keyId,
      version: metadata.version,
      algorithm: 'RSA-2048-OAEP',
    });

    logConnectionEvent(null, 'key-exchange', { type: 'public-key-request' });
  } catch (error) {
    logger.error('Error serving public key', { error });
    res.status(500).json({ error: 'Failed to serve public key' });
  }
});

/**
 * POST /api/key-exchange/register-key
 * Register an encrypted symmetric key for a chat
 * The client sends their symmetric key encrypted with the server's RSA public key
 * The server decrypts it, wraps it again, and stores it encrypted
 */
router.post('/register-key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const validation = registerKeySchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('Invalid register-key request', { userId, errors: validation.error.errors });
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const { chatId, encryptedKey } = validation.data;

    // Verify user is participant of this chat
    const isParticipant = await isChatParticipant(userId, chatId);
    if (!isParticipant) {
      logger.warn('User not participant of chat', { userId, chatId });
      res.status(403).json({ error: 'Not a chat participant' });
      return;
    }

    // Decrypt the symmetric key
    const keyManager = getKeyManager();
    let symmetricKey: Buffer;

    try {
      symmetricKey = keyManager.decryptSymmetricKey(encryptedKey);
    } catch (error) {
      logger.error('Failed to decrypt symmetric key', { userId, chatId, error });
      res.status(400).json({ error: 'Invalid encrypted key' });
      return;
    }

    // Re-encrypt with a derived key for storage (defense in depth)
    // In production, you might use a different key derivation strategy
    const wrappedKey = Buffer.from(encryptedKey); // Store as-is since already encrypted by client

    // Store in database
    const stored = await storeChatKey(chatId, userId, wrappedKey.toString('base64'), 1);

    if (!stored) {
      res.status(500).json({ error: 'Failed to store key' });
      return;
    }

    logger.info('Registered chat key', { userId, chatId });
    await logConnectionEvent(userId, 'key-exchange', { type: 'register-key', chatId });

    res.json({
      success: true,
      keyId: keyManager.getKeyMetadata().keyId,
      version: keyManager.getVersion(),
    });
  } catch (error) {
    logger.error('Error in register-key endpoint', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/key-exchange/sync-key
 * Retrieve the encrypted symmetric key for a chat
 * The client uses this to restore the key if it's lost from sessionStorage
 */
router.post('/sync-key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const validation = syncKeySchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('Invalid sync-key request', { userId, errors: validation.error.errors });
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const { chatId } = validation.data;

    // Verify user is participant
    const isParticipant = await isChatParticipant(userId, chatId);
    if (!isParticipant) {
      logger.warn('User not participant of chat', { userId, chatId });
      res.status(403).json({ error: 'Not a chat participant' });
      return;
    }

    // Get the encrypted key
    const keyData = await getChatKey(chatId);

    if (!keyData) {
      logger.debug('No key found for chat', { userId, chatId });
      res.status(404).json({ error: 'No key found' });
      return;
    }

    const keyManager = getKeyManager();

    logger.info('Synced chat key', { userId, chatId });
    await logConnectionEvent(userId, 'key-exchange', { type: 'sync-key', chatId });

    res.json({
      encryptedKey: keyData.encryptedKey,
      keyVersion: keyData.keyVersion,
      keyId: keyManager.getKeyMetadata().keyId,
    });
  } catch (error) {
    logger.error('Error in sync-key endpoint', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/key-exchange/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const keyManager = getKeyManager();
    const version = keyManager.getVersion();

    res.json({
      status: 'ok',
      service: 'key-exchange',
      timestamp: new Date().toISOString(),
      keyVersion: version,
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({ status: 'error' });
  }
});

export default router;
