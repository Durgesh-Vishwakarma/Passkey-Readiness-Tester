import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(4000),
  RP_ID: z.string().min(1).default('localhost'),
  RP_NAME: z.string().min(1).default('Passkey Readiness Tester'),
  // Allow both 3000 and 3001 by default for Next.js dev port auto-shift
  CORS_ORIGINS: z
    .string()
    .transform((val) => val.split(',').map(s => s.trim()))
    .default('http://localhost:3000,http://localhost:3001'),
  JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-change-in-production-minimum-32-chars'),
  MONGODB_URL: z.string().url().default('mongodb+srv://username:password@cluster.mongodb.net/database'),
  DATABASE_NAME: z.string().default('cyber'),
  ENABLE_ATTESTATION: z.coerce.boolean().default(false),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }
  
  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first.');
  }
  return cachedEnv;
}