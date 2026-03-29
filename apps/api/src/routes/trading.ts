import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@clawtrade/database';
import { JupiterClient, createTradingEngine } from '@clawtrade/trading';
import { config, createConnection } from '@clawtrade/blockchain';

/**
 * Request validation schemas
 */
const quoteSchema = z.object({
  inputMint: z.string(),
  outputMint: z.string(),
  amount: z.number().positive(),
  slippageBps: z.number().min(0).max(500).optional(),
});

const tradeSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  inputMint: z.string(),
  outputMint: z.string(),
  amount: z.number().positive(),
  walletId: z.string().optional(),
  slippageBps: z.number().min(0).max(500).optional(),
});

/**
 * Trading routes plugin
 */
export const tradingRoutes: FastifyPluginAsync = async (server) => {
  // All routes require authentication
  server.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
  });

  const jupiterClient = new JupiterClient(config.jupiter.apiUrl);
  const connection = createConnection(config.solana.rpcUrl);
  const tradingEngine = createTradingEngine(connection);

  /**
   * GET /trading/quote
   * Get a quote for a swap
   */
  server.get('/quote', async (request, reply) => {
    try {
      const query = quoteSchema.parse(request.query);

      const quote = await jupiterClient.getQuote({
        inputMint: query.inputMint,
        outputMint: query.outputMint,
        amount: query.amount,
        slippageBps: query.slippageBps || config.trading.slippageBps,
      });

      const priceImpact = jupiterClient.calculatePriceImpact(quote);
      const effectivePrice = jupiterClient.calculateEffectivePrice(quote);

      return reply.send({
        quote: {
          ...quote,
          priceImpact,
          effectivePrice,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * POST /trading/execute
   * Execute a trade
   */
  server.post('/execute', async (request, reply) => {
    try {
      const body = tradeSchema.parse(request.body);
      const userId = request.user.userId;

      // Get wallet
      let walletId = body.walletId;
      if (!walletId) {
        const primaryWallet = await prisma.wallet.findFirst({
          where: { userId },
        });
        if (!primaryWallet) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'No wallet found. Please create a wallet first.',
          });
        }
        walletId = primaryWallet.id;
      }

      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Wallet not found',
        });
      }

      // Check if trading is enabled
      if (!config.trading.enabled && !config.trading.mockTrading) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Trading is currently disabled',
        });
      }

      // Create trade record
      const trade = await prisma.trade.create({
        data: {
          userId,
          walletId,
          type: body.type,
          inputMint: body.inputMint,
          outputMint: body.outputMint,
          inputAmount: body.amount,
          outputAmount: 0, // Will be updated after execution
          price: 0,
          slippageBps: body.slippageBps || config.trading.slippageBps,
          status: 'PENDING',
        },
      });

      // In mock mode, simulate the trade
      if (config.trading.mockTrading) {
        // Simulate trade execution
        const simulatedOutput = body.amount * (0.99 + Math.random() * 0.02); // 1% slippage simulation
        
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            outputAmount: simulatedOutput,
            price: simulatedOutput / body.amount,
            status: 'COMPLETED',
            signature: `mock_${Date.now()}`,
          },
        });

        // Emit WebSocket event
        server.io?.emit('trade:completed', {
          tradeId: trade.id,
          type: body.type,
          inputAmount: body.amount,
          outputAmount: simulatedOutput,
        });

        return reply.send({
          trade: {
            id: trade.id,
            type: body.type,
            inputAmount: body.amount,
            outputAmount: simulatedOutput,
            status: 'COMPLETED',
            mock: true,
          },
        });
      }

      // In production mode, execute the actual trade
      // This would require the user's encrypted private key
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Production trading requires wallet authentication',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  /**
   * GET /trading/history
   * Get user's trading history
   */
  server.get('/history', async (request, reply) => {
    const { limit = 50, status } = request.query as { limit?: number; status?: string };

    const trades = await prisma.trade.findMany({
      where: {
        userId: request.user.userId,
        status: status as any || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        wallet: {
          select: {
            address: true,
          },
        },
      },
    });

    return reply.send({ trades });
  });

  /**
   * GET /trading/:id
   * Get trade details
   */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const trade = await prisma.trade.findFirst({
      where: {
        id,
        userId: request.user.userId,
      },
      include: {
        wallet: {
          select: {
            address: true,
          },
        },
      },
    });

    if (!trade) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Trade not found',
      });
    }

    return reply.send({ trade });
  });

  /**
   * GET /trading/prices
   * Get token prices
   */
  server.get('/prices', async (request, reply) => {
    const { tokens } = request.query as { tokens?: string };

    if (!tokens) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tokens parameter is required',
      });
    }

    const tokenList = tokens.split(',');
    const prices = await jupiterClient.getPrices(tokenList);

    return reply.send({ prices });
  });
};
