import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@clawtrade/database';

/**
 * User routes plugin
 */
export const userRoutes: FastifyPluginAsync = async (server) => {
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

  /**
   * GET /user/profile
   * Get user profile
   */
  server.get('/profile', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        wallets: {
          select: {
            id: true,
            address: true,
            balanceSOL: true,
            balanceUSDC: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            trades: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.send({ user });
  });

  /**
   * GET /user/stats
   * Get user trading statistics
   */
  server.get('/stats', async (request, reply) => {
    const userId = request.user.userId;

    // Get trade statistics
    const trades = await prisma.trade.findMany({
      where: { userId },
      select: {
        type: true,
        inputAmount: true,
        outputAmount: true,
        pnl: true,
        status: true,
        createdAt: true,
      },
    });

    const totalTrades = trades.length;
    const completedTrades = trades.filter(t => t.status === 'COMPLETED').length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;

    return reply.send({
      stats: {
        totalTrades,
        completedTrades,
        totalPnl,
        winRate: winRate.toFixed(2),
        winningTrades,
      },
    });
  });
};
