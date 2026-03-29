import { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { config } from '@clawtrade/config';

/**
 * WebSocket events
 */
export interface WebSocketEvents {
  // Client -> Server
  'auth': (token: string) => void;
  'subscribe': (channel: string) => void;
  'unsubscribe': (channel: string) => void;

  // Server -> Client
  'connected': (data: { clientId: string }) => void;
  'authenticated': (data: { userId: string }) => void;
  'error': (data: { message: string }) => void;

  // Trading events
  'trade:pending': (data: { tradeId: string; type: string; inputAmount: number }) => void;
  'trade:completed': (data: { tradeId: string; type: string; inputAmount: number; outputAmount: number }) => void;
  'trade:failed': (data: { tradeId: string; error: string }) => void;

  // Agent events
  'agent:decision': (data: { agentType: string; decision: string; confidence: number; tokenMint: string }) => void;
  'agent:scan': (data: { tokensScanned: number; opportunities: number }) => void;

  // Portfolio events
  'portfolio:update': (data: { totalValue: number; pnl: number; positions: number }) => void;
  'balance:update': (data: { walletId: string; balanceSOL: number; balanceUSDC: number }) => void;

  // Market events
  'price:update': (data: { mint: string; price: number; change24h: number }) => void;
}

/**
 * Setup WebSocket server
 */
export function setupWebSocket(server: FastifyInstance): void {
  const io = new Server(server.server, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    path: '/socket.io',
  });

  // Store server reference for routes
  server.decorate('io', io);

  io.on('connection', (socket) => {
    server.log.info(`Client connected: ${socket.id}`);

    // Send connection confirmation
    socket.emit('connected', { clientId: socket.id });

    /**
     * Handle authentication
     */
    socket.on('auth', async (token: string) => {
      try {
        // Verify JWT token
        const payload = server.jwt.verify<{ userId: string }>(token);
        
        socket.data.userId = payload.userId;
        
        socket.emit('authenticated', { userId: payload.userId });
        
        server.log.info(`Client authenticated: ${socket.id} (user: ${payload.userId})`);
      } catch (error) {
        socket.emit('error', { message: 'Invalid authentication token' });
        server.log.warn(`Authentication failed for client: ${socket.id}`);
      }
    });

    /**
     * Handle channel subscriptions
     */
    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
      server.log.info(`Client ${socket.id} subscribed to ${channel}`);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
      server.log.info(`Client ${socket.id} unsubscribed from ${channel}`);
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      server.log.info(`Client disconnected: ${socket.id}`);
    });
  });

  server.log.info(`WebSocket server initialized on port ${config.websocket.port}`);
}

/**
 * Broadcast helper functions
 */
export function broadcastToChannel(
  io: Server | undefined,
  channel: string,
  event: keyof WebSocketEvents,
  data: unknown
): void {
  if (io) {
    io.to(channel).emit(event, data);
  }
}

export function broadcastToAll(
  io: Server | undefined,
  event: keyof WebSocketEvents,
  data: unknown
): void {
  if (io) {
    io.emit(event, data);
  }
}

export function broadcastToUser(
  io: Server | undefined,
  userId: string,
  event: keyof WebSocketEvents,
  data: unknown
): void {
  if (io) {
    // In production, you would track user sockets
    io.emit(event, data);
  }
}
