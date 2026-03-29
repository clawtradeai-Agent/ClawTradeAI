import { prisma, User, Wallet, Transaction, Trade, Portfolio, AgentLog, AgentType, TransactionType, TransactionStatus, TradeType, TradeStatus } from './index';

/**
 * Database client wrapper with typed methods
 */
export class DatabaseClient {
  private static instance: DatabaseClient;

  private constructor() {}

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  // ==========================================
  // User Operations
  // ==========================================

  async createUser(email: string, password: string, username: string): Promise<User> {
    return prisma.user.create({
      data: { email, password, username },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { wallets: true },
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { wallets: true, portfolio: true },
    });
  }

  // ==========================================
  // Wallet Operations
  // ==========================================

  async createWallet(
    userId: string,
    address: string,
    encryptedPrivateKey: string,
    publicKey: string
  ): Promise<Wallet> {
    return prisma.wallet.create({
      data: {
        userId,
        address,
        encryptedPrivateKey,
        publicKey,
      },
    });
  }

  async findWalletByAddress(address: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { address },
    });
  }

  async findWalletById(id: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { id },
    });
  }

  async updateUserWalletBalance(
    walletId: string,
    balanceSOL?: number,
    balanceUSDC?: number
  ): Promise<Wallet> {
    return prisma.wallet.update({
      where: { id: walletId },
      data: {
        balanceSOL: balanceSOL !== undefined ? balanceSOL : undefined,
        balanceUSDC: balanceUSDC !== undefined ? balanceUSDC : undefined,
      },
    });
  }

  // ==========================================
  // Transaction Operations
  // ==========================================

  async createTransaction(
    userId: string,
    walletId: string,
    type: TransactionType,
    amount: number,
    tokenMint?: string,
    signature?: string
  ): Promise<Transaction> {
    return prisma.transaction.create({
      data: {
        userId,
        walletId,
        type,
        amount,
        tokenMint,
        signature,
        status: TransactionStatus.PENDING,
      },
    });
  }

  async updateTransactionStatus(
    id: string,
    status: TransactionStatus,
    signature?: string
  ): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        signature: signature ?? undefined,
      },
    });
  }

  async getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // Trade Operations
  // ==========================================

  async createTrade(
    userId: string,
    walletId: string,
    type: TradeType,
    inputMint: string,
    outputMint: string,
    inputAmount: number,
    outputAmount: number,
    price: number,
    slippageBps: number,
    agentDecision?: string,
    strategyId?: string
  ): Promise<Trade> {
    return prisma.trade.create({
      data: {
        userId,
        walletId,
        type,
        inputMint,
        outputMint,
        inputAmount,
        outputAmount,
        price,
        slippageBps,
        agentDecision,
        strategyId,
        status: TradeStatus.PENDING,
      },
    });
  }

  async updateTradeStatus(id: string, status: TradeStatus, signature?: string): Promise<Trade> {
    return prisma.trade.update({
      where: { id },
      data: {
        status,
        signature: signature ?? undefined,
      },
    });
  }

  async getUserTrades(userId: string, limit = 50): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // Portfolio Operations
  // ==========================================

  async upsertPortfolio(
    userId: string,
    tokenMint: string,
    tokenSymbol: string,
    tokenName: string,
    balance: number,
    averagePrice: number,
    currentValue: number
  ): Promise<Portfolio> {
    const pnl = currentValue - averagePrice * balance;
    const pnlPercent = averagePrice > 0 ? (pnl / (averagePrice * balance)) * 100 : 0;

    return prisma.portfolio.upsert({
      where: {
        userId_tokenMint: {
          userId,
          tokenMint,
        },
      },
      update: {
        balance,
        averagePrice,
        currentValue,
        pnl,
        pnlPercent,
      },
      create: {
        userId,
        tokenMint,
        tokenSymbol,
        tokenName,
        balance,
        averagePrice,
        currentValue,
        pnl,
        pnlPercent,
      },
    });
  }

  async getUserPortfolio(userId: string): Promise<Portfolio[]> {
    return prisma.portfolio.findMany({
      where: { userId },
      orderBy: { currentValue: 'desc' },
    });
  }

  // ==========================================
  // Agent Log Operations
  // ==========================================

  async logAgentAction(
    agentType: AgentType,
    action: string,
    input?: Record<string, unknown>,
    output?: Record<string, unknown>,
    decision?: string,
    confidence?: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<AgentLog> {
    return prisma.agentLog.create({
      data: {
        userId,
        agentType,
        action,
        input: input ? JSON.stringify(input) : undefined,
        output: output ? JSON.stringify(output) : undefined,
        decision,
        confidence,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  }

  async getAgentLogs(agentType: AgentType, limit = 100): Promise<AgentLog[]> {
    return prisma.agentLog.findMany({
      where: { agentType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export const db = DatabaseClient.getInstance();
