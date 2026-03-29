import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@clawtrade/database';

/**
 * Request validation schemas
 */
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Auth routes plugin
 */
export const authRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /auth/register
   * Register a new user
   */
  server.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { username: body.username },
          ],
        },
      });

      if (existingUser) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: existingUser.email === body.email 
            ? 'Email already registered' 
            : 'Username already taken',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          username: body.username,
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = server.jwt.sign({ userId: user.id });

      return reply.status(201).send({
        user,
        token,
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
   * POST /auth/login
   * Login user
   */
  server.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(body.password, user.password);

      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = server.jwt.sign({ userId: user.id });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token,
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
   * GET /auth/me
   * Get current user
   */
  server.get('/me', {
    preHandler: [async (request) => {
      await request.jwtVerify();
    }],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        wallets: {
          select: {
            id: true,
            address: true,
            balanceSOL: true,
            balanceUSDC: true,
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
};
