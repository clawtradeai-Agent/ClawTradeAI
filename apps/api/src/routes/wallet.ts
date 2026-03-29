import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@clawtrade/database';
import { WalletManager } from '@clawtrade/blockchain';
import { config } from '@clawtrade/config';
import { createConnection } from '@clawtrade/blockchain';

/**
 * Request validation schemas
 */
const createWalletSchema = z.object({
  secretKey: z.string().optional(), // Optional - if not provided, create new wallet
});

const depositSchema = z.object({
  amount: z.number().positive(),
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  address: z.string(),
});

/**
 * Wallet routes plugin
 */
export const walletRoutes: FastifyPluginAsync = async (server) => {
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

  const walletManager = new WalletManager(
    createConnection(config.solana.rpcUrl),
    config.security.walletEncryptionKey
  );

  /**
   * GET /wallet/list
   * Get all user wallets
   */
  server.get('/list', async (request, reply) => {
    const wallets = await prisma.wallet.findMany({
      where: { userId: request.user.userId },
      select: {
        id: true,
        address: true,
        balanceSOL: true,
        balanceUSDC: true,
        isActive: true,
        createdAt: true,
      },
    });

    return reply.send({ wallets });
  });

  /**
   * POST /wallet/create
   * Create a new wallet
   */
  server.post('/create', async (request, reply) => {
    try {
      const body = createWalletSchema.parse(request.body);

      let walletData: { encryptedPrivateKey: string; address: string; publicKey: string };

      if (body.secretKey) {
        // Import existing wallet
        walletData = walletManager.importWallet(body.secretKey);
      } else {
        // Create new wallet
        walletData = walletManager.createWallet();
      }

      // Save to database
      const wallet = await prisma.wallet.create({
        data: {
          userId: request.user.userId,
          address: walletData.address,
          encryptedPrivateKey: walletData.encryptedPrivateKey,
          publicKey: walletData.publicKey,
        },
        select: {
          id: true,
          address: true,
          balanceSOL: true,
          balanceUSDC: true,
          isActive: true,
          createdAt: true,
        },
      });

      return reply.status(201).send({ wallet });
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
   * GET /wallet/:id
   * Get wallet details
   */
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const wallet = await prisma.wallet.findFirst({
      where: {
        id,
        userId: request.user.userId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Wallet not found',
      });
    }

    return reply.send({ wallet });
  });

  /**
   * POST /wallet/deposit
   * Record a deposit
   */
  server.post('/deposit', async (request, reply) => {
    try {
      const body = depositSchema.parse(request.body);
      const { walletId } = request.body as { walletId?: string };

      // Get user's primary wallet
      let targetWalletId = walletId;
      if (!targetWalletId) {
        const primaryWallet = await prisma.wallet.findFirst({
          where: { userId: request.user.userId },
        });
        if (!primaryWallet) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'No wallet found. Please create a wallet first.',
          });
        }
        targetWalletId = primaryWallet.id;
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: request.user.userId,
          walletId: targetWalletId,
          type: 'DEPOSIT',
          amount: body.amount,
          status: 'PENDING',
        },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: targetWalletId },
        data: { balanceSOL: { increment: body.amount } },
      });

      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CONFIRMED' },
      });

      return reply.send({
        transaction: {
          id: transaction.id,
          type: 'DEPOSIT',
          amount: body.amount,
          status: 'CONFIRMED',
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
   * POST /wallet/withdraw
   * Process a withdrawal
   */
  server.post('/withdraw', async (request, reply) => {
    try {
      const body = withdrawSchema.parse(request.body);
      const { walletId } = request.body as { walletId?: string };

      // Get user's primary wallet
      let targetWalletId = walletId;
      if (!targetWalletId) {
        const primaryWallet = await prisma.wallet.findFirst({
          where: { userId: request.user.userId },
        });
        if (!primaryWallet) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'No wallet found. Please create a wallet first.',
          });
        }
        targetWalletId = primaryWallet.id;
      }

      const wallet = await prisma.wallet.findUnique({
        where: { id: targetWalletId },
      });

      if (!wallet || wallet.balanceSOL < body.amount) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Insufficient balance',
        });
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: request.user.userId,
          walletId: targetWalletId,
          type: 'WITHDRAWAL',
          amount: body.amount,
          status: 'PENDING',
          metadata: {
            toAddress: body.address,
          },
        },
      });

      // In production, this would execute the actual blockchain transfer
      // For now, we'll just update the balance
      await prisma.wallet.update({
        where: { id: targetWalletId },
        data: { balanceSOL: { decrement: body.amount } },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CONFIRMED' },
      });

      return reply.send({
        transaction: {
          id: transaction.id,
          type: 'WITHDRAWAL',
          amount: body.amount,
          status: 'CONFIRMED',
          toAddress: body.address,
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
};
