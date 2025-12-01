import { z } from 'zod';

/**
 * Environment schema definition
 * Validates required and optional environment variables
 */
const envSchema = z.object({
  // Required variables
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Optional variables with defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Optional third-party integrations
  TMDB_API_KEY: z.string().optional(),
  RAWG_API_KEY: z.string().optional(),
  PLEX_URL: z.string().optional(),
  PLEX_TOKEN: z.string().optional(),
  PLEX_WEBHOOK_SECRET: z.string().optional(),
  TUYA_CLIENT_ID: z.string().optional(),
  TUYA_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  HARDCOVER_API_TOKEN: z.string().optional(),
});

/** Type-safe environment variables */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the schema
 * Fails fast if required variables are missing or invalid
 *
 * @throws {Error} If environment validation fails
 * @returns {Env} Validated environment variables
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

/**
 * Lazy-loaded, type-safe environment variables
 * Validates only on first access in production
 * Allows tests to mock environment before initialization
 */
let envInitialized = false;
const envProxy = new Proxy<Env>({} as Env, {
  get(target, prop) {
    if (!envInitialized) {
      const validated = validateEnv();
      Object.assign(target, validated);
      envInitialized = true;
    }
    return target[prop as keyof Env];
  },
});

export const env = envProxy;
