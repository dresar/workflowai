import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  AI_TIMEOUT: z.string().default('60000').transform(Number),
  AI_MAX_RETRIES: z.string().default('3').transform(Number),
  AI_COOLDOWN_MINUTES: z.string().default('5').transform(Number),
  AI_ROTATION: z.enum(['round_robin', 'priority', 'random', 'fallback']).default('round_robin'),

  GEMINI_API_KEYS: z.string().default(''),
  GROQ_API_KEYS: z.string().default(''),

  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_UPLOAD_SIZE: z.string().default('10485760').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export const geminiApiKeys = env.GEMINI_API_KEYS
  ? env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
  : [];

export const groqApiKeys = env.GROQ_API_KEYS
  ? env.GROQ_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
  : [];

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
