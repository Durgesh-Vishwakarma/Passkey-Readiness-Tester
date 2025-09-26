import { Router, Request, Response } from 'express';
import { getDatabase } from '@/db/index.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    const db = getDatabase();
    await db.admin().ping(); // MongoDB ping instead of SQL
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'],
      version: '1.0.0',
      services: {
        database: 'connected',
        webauthn: 'ready'
      }
    };
    
    res.json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

router.get('/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

router.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

export { router as healthRoutes };