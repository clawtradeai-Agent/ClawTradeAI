import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, validateConfig, type FullConfig } from './index';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default config in development mode', () => {
      const config = loadConfig();
      
      expect(config.app.nodeEnv).toBe('development');
      expect(config.app.port).toBe(3001);
      expect(config.database.url).toBe('postgresql://localhost:5432/clawtrade_ai');
      expect(config.redis.url).toBe('redis://localhost:6379');
    });

    it('should load config from environment variables', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_PORT = '8080';
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      
      const config = loadConfig();
      
      expect(config.app.nodeEnv).toBe('production');
      expect(config.app.port).toBe(8080);
      expect(config.database.url).toBe('postgresql://user:pass@host:5432/db');
    });

    it('should have correct default trading config', () => {
      const config = loadConfig();
      
      expect(config.trading.enabled).toBe(false);
      expect(config.trading.mockTrading).toBe(true);
      expect(config.trading.maxTradeAmountSOL).toBe(1);
      expect(config.trading.minTradeAmountSOL).toBe(0.01);
      expect(config.trading.slippageBps).toBe(50);
    });
  });

  describe('validateConfig', () => {
    it('should not throw for valid config', () => {
      const config = loadConfig();
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw for production with default encryption key', () => {
      const config: FullConfig = {
        ...loadConfig(),
        app: { ...loadConfig().app, nodeEnv: 'production' },
        security: {
          ...loadConfig().security,
          walletEncryptionKey: 'default-encryption-key-change-in-production',
        },
      };
      
      expect(() => validateConfig(config)).toThrow('WALLET_ENCRYPTION_KEY must be changed in production');
    });

    it('should throw for production with default JWT secret', () => {
      const config: FullConfig = {
        ...loadConfig(),
        app: { ...loadConfig().app, nodeEnv: 'production' },
        security: {
          ...loadConfig().security,
          jwtSecret: 'default-jwt-secret-change-in-production',
        },
      };
      
      expect(() => validateConfig(config)).toThrow('JWT_SECRET must be changed in production');
    });

    it('should throw when max trade amount is less than min', () => {
      const config: FullConfig = {
        ...loadConfig(),
        trading: {
          ...loadConfig().trading,
          maxTradeAmountSOL: 0.005,
          minTradeAmountSOL: 0.01,
        },
      };
      
      expect(() => validateConfig(config)).toThrow('MAX_TRADE_AMOUNT_SOL must be greater than MIN_TRADE_AMOUNT_SOL');
    });
  });
});
