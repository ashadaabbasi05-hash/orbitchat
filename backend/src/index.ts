// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.ts';
import logger from './config/logger.ts';
import { initializeKeyManager } from './utils/rsa.ts';
import { requestLogger, errorHandler } from './middleware/auth.ts';
import keyExchangeRoutes from './routes/keyExchange.ts';
import healthRoutes from './routes/health.ts';

const app = express();

// Initialize key manager
initializeKeyManager();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use(requestLogger);

// Routes
app.use('/api/key-exchange', keyExchangeRoutes);
app.use('/api', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info(`Orbit Chat Backend running on port ${PORT}`, {
    env: config.NODE_ENV,
    frontendUrl: config.FRONTEND_URL,
  });
});

export default app;
