// @ts-nocheck
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',

  // RSA Keys (in production, use environment variables or secure vault)
  RSA_PRIVATE_KEY: process.env.RSA_PRIVATE_KEY || '',
  RSA_PUBLIC_KEY: process.env.RSA_PUBLIC_KEY || '',
  RSA_KEY_ID: process.env.RSA_KEY_ID || 'server-key-v1',

  // Security
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validation
if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}
