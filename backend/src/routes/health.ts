// @ts-nocheck
import express, { Router, Request, Response } from 'express';
import logger from '../config/logger.ts';
import { logConnectionEvent } from '../services/supabase.ts';
import { authMiddleware } from '../middleware/auth.ts';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'orbit-chat-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * POST /api/auth/log-event
 * Log authentication events
 */
router.post('/auth/log-event', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { eventType, metadata } = req.body;

    await logConnectionEvent(userId, 'auth', {
      eventType,
      ...metadata,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error logging auth event', { error });
    res.status(500).json({ error: 'Failed to log event' });
  }
});

export default router;
