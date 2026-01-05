// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.ts';
import logger from '../config/logger.ts';

// Initialize Supabase client with service role key (admin access)
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Log connection event to database
 */
export async function logConnectionEvent(
  userId: string | null,
  eventType: 'connect' | 'disconnect' | 'key-exchange' | 'auth' | 'error',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.from('connection_logs').insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata || {},
    });

    if (error) {
      logger.error('Failed to log connection event', { error, eventType });
    } else {
      logger.debug('Logged connection event', { eventType, userId });
    }
  } catch (error) {
    logger.error('Error logging connection event', { error });
  }
}

/**
 * Verify JWT token and get user
 */
export async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.debug('Token verification failed', { error });
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    logger.error('Error verifying token', { error });
    return null;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      logger.debug('Profile not found', { userId });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error fetching user profile', { error });
    return null;
  }
}

/**
 * Check if user is chat participant
 */
export async function isChatParticipant(userId: string, chatId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('chat_participants')
      .select('id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    logger.error('Error checking chat participant', { error });
    return false;
  }
}

/**
 * Store encrypted chat key
 */
export async function storeChatKey(
  chatId: string,
  userId: string,
  encryptedKey: string,
  keyVersion: number = 1
): Promise<boolean> {
  try {
    const { error } = await supabase.from('chat_keys').insert({
      chat_id: chatId,
      encrypted_key: encryptedKey,
      key_version: keyVersion,
      created_by: userId,
    });

    if (error) {
      logger.error('Failed to store chat key', { error, chatId });
      return false;
    }

    logger.debug('Stored encrypted chat key', { chatId });
    return true;
  } catch (error) {
    logger.error('Error storing chat key', { error });
    return false;
  }
}

/**
 * Retrieve encrypted chat key
 */
export async function getChatKey(chatId: string): Promise<{ encryptedKey: string; keyVersion: number } | null> {
  try {
    const { data, error } = await supabase
      .from('chat_keys')
      .select('encrypted_key, key_version')
      .eq('chat_id', chatId)
      .single();

    if (error) {
      logger.debug('Chat key not found', { chatId });
      return null;
    }

    return {
      encryptedKey: data.encrypted_key,
      keyVersion: data.key_version,
    };
  } catch (error) {
    logger.error('Error fetching chat key', { error });
    return null;
  }
}
