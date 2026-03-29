import '@fastify/jwt';
import { Server } from 'socket.io';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    io?: Server;
    solanaConnection?: unknown;
  }

  interface FastifyRequest {
    user: {
      userId: string;
    };
  }
}
