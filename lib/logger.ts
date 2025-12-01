import pino, { Logger } from 'pino';

/**
 * Sensitive field paths that should be redacted from logs
 * Includes authorization headers, credentials, and API keys
 */
const REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.secret',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.api_key',
] as const;

/**
 * Redaction censor string used for sensitive fields
 */
const REDACTION_CENSOR = '[REDACTED]' as const;

/**
 * Determine if running in development environment
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get the configured log level from environment or use default based on environment
 * In development: 'debug', in production: 'info'
 */
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Main logger instance with environment-aware configuration
 * - JSON format in production for structured logging
 * - Pretty-printed format in development for readability
 * - Sensitive fields automatically redacted from all logs
 */
export const logger: Logger = pino({
  level: getLogLevel(),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  redact: {
    paths: REDACTION_PATHS as any,
    censor: REDACTION_CENSOR,
  },
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 * Useful for adding request ID, user ID, or other contextual information to logs
 *
 * @param context - Object containing context information to be added to logs
 * @returns Child logger instance with inherited methods and added context
 */
export const createChildLogger = (
  context: Record<string, unknown>
): Logger => {
  return logger.child(context);
};
