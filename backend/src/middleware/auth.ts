// @ts-nocheck
import express, { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.ts';
import { verifyToken } from '../services/supabase.ts';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware - Verifies JWT token
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const user = await verifyToken(token);

    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
}
