import type { Env } from './env';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear the cached env module
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to import fresh module after env changes
  const getEnvModule = () => require('./env');

  describe('Required Environment Variables', () => {
    it('should fail when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;

      const { validateEnv } = getEnvModule();
      expect(() => {
        validateEnv();
      }).toThrow('Invalid environment configuration');
    });

    it('should fail when DATABASE_URL is not a valid URL', () => {
      process.env.DATABASE_URL = 'not-a-url';

      const { validateEnv } = getEnvModule();
      expect(() => {
        validateEnv();
      }).toThrow('Invalid environment configuration');
    });

    it('should accept valid DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.DATABASE_URL).toBe('postgresql://user:password@localhost/dbname');
    });
  });

  describe('Optional Environment Variables with Defaults', () => {
    it('should default NODE_ENV to development', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
      delete process.env.NODE_ENV;

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.NODE_ENV).toBe('development');
    });

    it('should accept valid NODE_ENV values', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';

      const envValues = ['development', 'production', 'test'] as const;
      for (const nodeEnv of envValues) {
        process.env.NODE_ENV = nodeEnv;
        const { validateEnv } = getEnvModule();
        const result = validateEnv();
        expect(result.NODE_ENV).toBe(nodeEnv);
      }
    });

    it('should reject invalid NODE_ENV values', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
      process.env.NODE_ENV = 'invalid-env';

      const { validateEnv } = getEnvModule();
      expect(() => {
        validateEnv();
      }).toThrow('Invalid environment configuration');
    });

    it('should default LOG_LEVEL to info', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
      delete process.env.LOG_LEVEL;

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should accept valid LOG_LEVEL values', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';

      const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
      for (const logLevel of logLevels) {
        process.env.LOG_LEVEL = logLevel;
        const { validateEnv } = getEnvModule();
        const result = validateEnv();
        expect(result.LOG_LEVEL).toBe(logLevel);
      }
    });

    it('should reject invalid LOG_LEVEL values', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
      process.env.LOG_LEVEL = 'invalid-level';

      const { validateEnv } = getEnvModule();
      expect(() => {
        validateEnv();
      }).toThrow('Invalid environment configuration');
    });
  });

  describe('Optional Integration Environment Variables', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
    });

    it('should accept optional TMDB_API_KEY', () => {
      process.env.TMDB_API_KEY = 'tmdb-key-123';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.TMDB_API_KEY).toBe('tmdb-key-123');
    });

    it('should be undefined when TMDB_API_KEY is missing', () => {
      delete process.env.TMDB_API_KEY;

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.TMDB_API_KEY).toBeUndefined();
    });

    it('should accept optional RAWG_API_KEY', () => {
      process.env.RAWG_API_KEY = 'rawg-key-123';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.RAWG_API_KEY).toBe('rawg-key-123');
    });

    it('should accept optional PLEX_URL', () => {
      process.env.PLEX_URL = 'http://plex.example.com:32400';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.PLEX_URL).toBe('http://plex.example.com:32400');
    });

    it('should accept optional PLEX_TOKEN', () => {
      process.env.PLEX_TOKEN = 'plex-token-123';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.PLEX_TOKEN).toBe('plex-token-123');
    });

    it('should accept optional PLEX_WEBHOOK_SECRET', () => {
      process.env.PLEX_WEBHOOK_SECRET = 'webhook-secret-123';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.PLEX_WEBHOOK_SECRET).toBe('webhook-secret-123');
    });

    it('should accept optional TUYA_CLIENT_ID', () => {
      process.env.TUYA_CLIENT_ID = 'tuya-client-id';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.TUYA_CLIENT_ID).toBe('tuya-client-id');
    });

    it('should accept optional TUYA_CLIENT_SECRET', () => {
      process.env.TUYA_CLIENT_SECRET = 'tuya-client-secret';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.TUYA_CLIENT_SECRET).toBe('tuya-client-secret');
    });

    it('should accept optional MICROSOFT_CLIENT_ID', () => {
      process.env.MICROSOFT_CLIENT_ID = 'ms-client-id';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.MICROSOFT_CLIENT_ID).toBe('ms-client-id');
    });

    it('should accept optional MICROSOFT_CLIENT_SECRET', () => {
      process.env.MICROSOFT_CLIENT_SECRET = 'ms-client-secret';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.MICROSOFT_CLIENT_SECRET).toBe('ms-client-secret');
    });

    it('should accept optional HARDCOVER_API_TOKEN', () => {
      process.env.HARDCOVER_API_TOKEN = 'hardcover-token-123';

      const { validateEnv } = getEnvModule();
      const result = validateEnv();
      expect(result.HARDCOVER_API_TOKEN).toBe('hardcover-token-123');
    });
  });

  describe('Type Safety', () => {
    it('should export correct type', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';

      const { validateEnv } = getEnvModule();
      const result: Env = validateEnv();
      expect(result).toHaveProperty('DATABASE_URL');
      expect(result).toHaveProperty('NODE_ENV');
      expect(result).toHaveProperty('LOG_LEVEL');
    });
  });

  describe('Singleton Pattern', () => {
    it('should cache env validation on module import', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@localhost/dbname';
      process.env.NODE_ENV = 'production';

      const { env } = getEnvModule();
      expect(env.DATABASE_URL).toBe('postgresql://user:password@localhost/dbname');
      expect(env.NODE_ENV).toBe('production');
    });
  });
});
