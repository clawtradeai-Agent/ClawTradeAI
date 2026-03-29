/**
 * Application configuration
 */
export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  frontendUrl: string;
  apiUrl: string;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  url: string;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  url: string;
}

/**
 * Solana configuration
 */
export interface SolanaConfig {
  rpcUrl: string;
  devnetRpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
}

/**
 * Jupiter configuration
 */
export interface JupiterConfig {
  apiUrl: string;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  walletEncryptionKey: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Trading configuration
 */
export interface TradingConfig {
  enabled: boolean;
  mockTrading: boolean;
  maxTradeAmountSOL: number;
  minTradeAmountSOL: number;
  slippageBps: number;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  intervalMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  port: number;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  origins: string[];
}

/**
 * Full application configuration
 */
export interface FullConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  solana: SolanaConfig;
  jupiter: JupiterConfig;
  security: SecurityConfig;
  rateLimit: RateLimitConfig;
  trading: TradingConfig;
  agent: AgentConfig;
  websocket: WebSocketConfig;
  cors: CorsConfig;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): FullConfig {
  return {
    app: {
      nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      port: parseInt(process.env.APP_PORT || '3001', 10),
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      apiUrl: process.env.API_URL || 'http://localhost:3001',
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/clawtrade_ai',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      devnetRpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      network: (process.env.SOLANA_NETWORK as 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet') || 'mainnet-beta',
    },
    jupiter: {
      apiUrl: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
    },
    security: {
      walletEncryptionKey: process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
      jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    trading: {
      enabled: process.env.TRADING_ENABLED === 'true',
      mockTrading: process.env.MOCK_TRADING !== 'false',
      maxTradeAmountSOL: parseFloat(process.env.MAX_TRADE_AMOUNT_SOL || '1'),
      minTradeAmountSOL: parseFloat(process.env.MIN_TRADE_AMOUNT_SOL || '0.01'),
      slippageBps: parseInt(process.env.SLIPPAGE_BPS || '50', 10),
    },
    agent: {
      intervalMs: parseInt(process.env.AGENT_INTERVAL_MS || '5000', 10),
      logLevel: (process.env.AGENT_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
    websocket: {
      port: parseInt(process.env.WS_PORT || '3002', 10),
    },
    cors: {
      origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: FullConfig): void {
  const errors: string[] = [];

  // Security checks
  if (config.app.nodeEnv === 'production') {
    if (config.security.walletEncryptionKey.includes('default')) {
      errors.push('WALLET_ENCRYPTION_KEY must be changed in production');
    }
    if (config.security.jwtSecret.includes('default')) {
      errors.push('JWT_SECRET must be changed in production');
    }
  }

  // Trading checks
  if (config.trading.maxTradeAmountSOL <= config.trading.minTradeAmountSOL) {
    errors.push('MAX_TRADE_AMOUNT_SOL must be greater than MIN_TRADE_AMOUNT_SOL');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

// Export singleton instance
export const config = loadConfig();
