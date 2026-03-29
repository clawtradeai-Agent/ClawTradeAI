import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config, validateConfig } from '@clawtrade/config';
import { prisma } from '@clawtrade/database';
import { createConnection } from '@clawtrade/blockchain';
import { fileURLToPath } from 'url';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { walletRoutes } from './routes/wallet';
import { tradingRoutes } from './routes/trading';
import { portfolioRoutes } from './routes/portfolio';

// Import WebSocket server
import { setupWebSocket } from './websocket';

/**
 * Create and configure Fastify server
 */
export async function createServer(): Promise<FastifyInstance> {
  // Validate configuration
  validateConfig(config);

  const server = Fastify({
    logger: {
      level: config.agent.logLevel,
    },
  });

  // Register CORS
  await server.register(cors, {
    origin: config.cors.origins,
    credentials: true,
  });

  // Register rate limiting
  await server.register(rateLimit, {
    max: config.rateLimit.maxRequests,
    timeWindow: config.rateLimit.windowMs,
  });

  // Register JWT
  await server.register(jwt, {
    secret: config.security.jwtSecret,
    sign: {
      expiresIn: config.security.jwtExpiresIn,
    },
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(userRoutes, { prefix: '/user' });
  await server.register(walletRoutes, { prefix: '/wallet' });
  await server.register(tradingRoutes, { prefix: '/trading' });
  await server.register(portfolioRoutes, { prefix: '/portfolio' });

  // Health check endpoint
  server.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  // Error handling
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    if (error.validation) {
      reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    } else if (error.statusCode === 401) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    } else {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: config.app.nodeEnv === 'development' ? error.message : 'Something went wrong',
      });
    }
  });

  return server;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  const server = await createServer();

  // Initialize database connection
  await prisma.$connect();
  server.log.info('Database connected');

  // Initialize Solana connection
  const solanaConnection = createConnection(config.solana.rpcUrl);
  server.decorate('solanaConnection', solanaConnection);
  server.log.info(`Connected to Solana ${config.solana.network}`);

  // Setup WebSocket
  const httpServer = await server.listen({
    port: config.app.port,
    host: '0.0.0.0',
  });

  server.log.info(`Server listening on ${httpServer}`);

  // Setup WebSocket server
  setupWebSocket(server);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start server if run directly (ES Module compatible)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
