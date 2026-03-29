import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@clawtrade/database';
import { JupiterClient } from '@clawtrade/trading';
import { config } from '@clawtrade/config';

/**
 * Portfolio routes plugin
 */
export const portfolioRoutes: FastifyPluginAsync = async (server) => {
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

  /**
   * GET /portfolio
   * Get user's portfolio
   */
  server.get('/', async (request, reply) => {
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: request.user.userId },
      orderBy: { currentValue: 'desc' },
    });

    // Calculate total portfolio value
    const totalValue = portfolio.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = portfolio.reduce((sum, p) => sum + p.pnl, 0);
    const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

    return reply.send({
      portfolio,
      summary: {
        totalValue,
        totalPnl,
        totalPnlPercent: totalPnlPercent.toFixed(2),
        positions: portfolio.length,
      },
    });
  });

  /**
   * GET /portfolio/:mint
   * Get specific token position
   */
  server.get('/:mint', async (request, reply) => {
    const { mint } = request.params as { mint: string };

    const position = await prisma.portfolio.findFirst({
      where: {
        userId: request.user.userId,
        tokenMint: mint,
      },
    });

    if (!position) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Position not found',
      });
    }

    // Get current price
    try {
      const currentPrice = await jupiterClient.getPrice(mint);
      const currentValue = position.balance * currentPrice;
      const pnl = currentValue - (position.averagePrice * position.balance);
      const pnlPercent = position.averagePrice > 0 ? (pnl / (position.averagePrice * position.balance)) * 100 : 0;

      return reply.send({
        position: {
          ...position,
          currentPrice,
          currentValue,
          pnl,
          pnlPercent,
        },
      });
    } catch {
      return reply.send({ position });
    }
  });

  /**
   * POST /portfolio/sync
   * Sync portfolio with current prices
   */
  server.post('/sync', async (request, reply) => {
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: request.user.userId },
    });

    if (portfolio.length === 0) {
      return reply.send({
        portfolio: [],
        summary: {
          totalValue: 0,
          totalPnl: 0,
          totalPnlPercent: '0',
          positions: 0,
        },
      });
    }

    // Get current prices for all tokens
    const mints = portfolio.map(p => p.tokenMint);
    const prices = await jupiterClient.getPrices(mints);

    // Update portfolio values
    const updatedPositions = [];
    for (const position of portfolio) {
      const priceData = prices[position.tokenMint];
      if (priceData) {
        const currentPrice = priceData.price;
        const currentValue = position.balance * currentPrice;
        const pnl = currentValue - (position.averagePrice * position.balance);
        const pnlPercent = position.averagePrice > 0 ? (pnl / (position.averagePrice * position.balance)) * 100 : 0;

        const updated = await prisma.portfolio.update({
          where: {
            userId_tokenMint: {
              userId: request.user.userId,
              tokenMint: position.tokenMint,
            },
          },
          data: {
            currentValue,
            pnl,
            pnlPercent,
          },
        });

        updatedPositions.push({
          ...updated,
          currentPrice,
        });
      } else {
        updatedPositions.push(position);
      }
    }

    // Calculate totals
    const totalValue = updatedPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = updatedPositions.reduce((sum, p) => sum + p.pnl, 0);
    const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

    return reply.send({
      portfolio: updatedPositions,
      summary: {
        totalValue,
        totalPnl,
        totalPnlPercent: totalPnlPercent.toFixed(2),
        positions: updatedPositions.length,
      },
    });
  });

  /**
   * GET /portfolio/performance
   * Get portfolio performance metrics
   */
  server.get('/performance', async (request, reply) => {
    const portfolio = await prisma.portfolio.findMany({
      where: { userId: request.user.userId },
    });

    const trades = await prisma.trade.findMany({
      where: {
        userId: request.user.userId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate performance metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate best and worst trades
    const sortedTrades = [...trades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    const bestTrade = sortedTrades[0];
    const worstTrade = sortedTrades[sortedTrades.length - 1];

    return reply.send({
      performance: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: winRate.toFixed(2),
        totalPnl,
        averagePnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
        bestTrade: bestTrade ? {
          pnl: bestTrade.pnl,
          type: bestTrade.type,
          createdAt: bestTrade.createdAt,
        } : null,
        worstTrade: worstTrade ? {
          pnl: worstTrade.pnl,
          type: worstTrade.type,
          createdAt: worstTrade.createdAt,
        } : null,
      },
    });
  });
};
