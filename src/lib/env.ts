import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  SCAN_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  SOURCE_DEMO_MODE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  REQUEST_DELAY_MS: z.coerce.number().int().min(0).default(1250),
  CAPTCHA_MANUAL_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Invalid environment: ' + parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  _env = parsed.data;
  return _env;
}

export function getEnv(): Env {
  return loadEnv();
}
