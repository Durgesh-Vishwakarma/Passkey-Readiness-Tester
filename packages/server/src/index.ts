import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { errorHandler, notFoundHandler } from '@/middleware/error.js';
import { validateEnv } from '@/utils/env.js';
import { initializeDatabase } from '@/db/index.js';

// Route imports
import { authRoutes } from '@/routes/auth.js';
import { webauthnRoutes } from '@/routes/webauthn.js';
import { metricsRoutes } from '@/routes/metrics.js';
import { securityRoutes } from '@/routes/security.js';
import { healthRoutes } from '@/routes/health.js';
import { recordResponseTime } from '@/utils/metrics.js';
// Simple in-memory response time tracker
function trackResponseTime(req: express.Request, res: express.Response, next: express.NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000; // ns to ms
    recordResponseTime(ms);
  });
  next();
}

async function createApp() {
  console.log('🔧 Creating app...');
  // Validate environment variables
  const env = validateEnv();
  console.log('🔑 Environment loaded');
  
  // Initialize database
  console.log('🗄️ Initializing database...');
  await initializeDatabase();
  console.log('✅ Database initialized');
  
  const app = express();
  
  // Logger
  const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug'
  });
  
  app.use(pinoHttp());
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'production' ? 100 : 1000,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
  // Response time tracking
  app.use(trackResponseTime);
  
  // Compression and parsing
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  // API routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/webauthn', webauthnRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/security', securityRoutes);
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Passkey Readiness Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  });
  
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return { app, logger };
}

async function startServer() {
  try {
    console.log('🚀 Starting server...');
    const { app, logger } = await createApp();
    console.log('📱 App created successfully');
    const env = validateEnv();
    console.log('✅ Environment validated');
    
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📊 Environment: ${env.NODE_ENV}`);
      logger.info(`🔐 WebAuthn RP ID: ${env.RP_ID}`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);

export { createApp };