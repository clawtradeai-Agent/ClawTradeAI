import { Worker, Queue, Job } from 'bullmq';
import { Connection } from '@solana/web3.js';
import { config } from '@clawtrade/config';
import { createConnection } from '@clawtrade/blockchain';
import {
  CoordinatorAgent,
  SniperAgent,
  AnalystAgent,
  RiskManagerAgent,
  StrategyAgent,
  ExecutorAgent,
  AgentType,
  MarketData,
} from '@clawtrade/agents';
import { prisma } from '@clawtrade/database';
import { JupiterClient } from '@clawtrade/trading';

/**
 * Agent job types
 */
export interface AgentJob {
  type: 'SCAN' | 'ANALYZE' | 'EXECUTE';
  tokenMint?: string;
  userId?: string;
  data?: unknown;
}

/**
 * Agent worker for processing trading jobs
 */
export class AgentWorker {
  private queue: Queue;
  private worker: Worker;
  private connection: Connection;
  private coordinator: CoordinatorAgent;
  private jupiterClient: JupiterClient;
  private isRunning = false;

  constructor() {
    this.connection = createConnection(config.solana.rpcUrl);
    this.jupiterClient = new JupiterClient(config.jupiter.apiUrl);
    
    // Initialize coordinator and agents
    this.coordinator = new CoordinatorAgent({
      riskManagerVeto: true,
      minConfidence: 0.6,
    });

    // Register agents with coordinator
    this.coordinator.registerAgent(new SniperAgent());
    this.coordinator.registerAgent(new AnalystAgent());
    this.coordinator.registerAgent(new RiskManagerAgent());
    this.coordinator.registerAgent(new StrategyAgent());
    this.coordinator.registerAgent(new ExecutorAgent(this.connection));

    // Initialize BullMQ
    this.queue = new Queue('agent-jobs', {
      connection: {
        url: config.redis.url,
      },
    });

    this.worker = new Worker(
      'agent-jobs',
      async (job) => this.processJob(job),
      {
        connection: {
          url: config.redis.url,
        },
        concurrency: 5,
      }
    );

    this.setupWorkerHandlers();
  }

  /**
   * Setup worker event handlers
   */
  private setupWorkerHandlers(): void {
    this.worker.on('completed', (job: Job) => {
      console.log(`Job ${job.id} completed:`, job.returnvalue);
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      console.error(`Job failed:`, error);
      if (job) {
        console.error(`Job ${job.id} failed:`, job.data);
      }
    });

    this.worker.on('error', (error: Error) => {
      console.error('Worker error:', error);
    });
  }

  /**
   * Process a job
   */
  private async processJob(job: Job<AgentJob>): Promise<unknown> {
    const { type, tokenMint, userId, data } = job.data;

    console.log(`Processing job ${job.id}: ${type}`, { tokenMint, userId });

    switch (type) {
      case 'SCAN':
        return this.handleScanJob(tokenMint);
      
      case 'ANALYZE':
        return this.handleAnalyzeJob(tokenMint, userId);
      
      case 'EXECUTE':
        return this.handleExecuteJob(data as { tokenMint: string; amount: number; userId: string });
      
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Handle scan job
   */
  private async handleScanJob(tokenMint?: string): Promise<unknown> {
    // If no token mint provided, scan for new tokens
    if (!tokenMint) {
      // In production, this would query DEXes for new pools
      // For now, return mock data
      return {
        scanned: true,
        tokensFound: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Get token data
    const marketData = await this.fetchMarketData(tokenMint);
    
    // Process through coordinator
    const result = await this.coordinator.process(marketData);

    // Log agent decision
    if (userId) {
      await prisma.agentLog.create({
        data: {
          userId,
          agentType: AgentType.COORDINATOR,
          action: 'scan_complete',
          decision: result.decision,
          confidence: result.confidence,
          metadata: result.data,
        },
      });
    }

    return result;
  }

  /**
   * Handle analyze job
   */
  private async handleAnalyzeJob(tokenMint: string, userId?: string): Promise<unknown> {
    const marketData = await this.fetchMarketData(tokenMint);

    // Process through all agents via coordinator
    const result = await this.coordinator.process(marketData);

    // Log to database
    if (userId) {
      await prisma.agentLog.create({
        data: {
          userId,
          agentType: AgentType.ANALYST,
          action: 'analysis_complete',
          decision: result.decision,
          confidence: result.confidence,
          metadata: result.data,
        },
      });
    }

    return result;
  }

  /**
   * Handle execute job
   */
  private async handleExecuteJob(data: { tokenMint: string; amount: number; userId: string }): Promise<unknown> {
    const { tokenMint, amount, userId } = data;

    // Get user's wallet
    const wallet = await prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('No wallet found for user');
    }

    // In production, this would execute the actual trade
    // For now, return mock result
    return {
      executed: true,
      tokenMint,
      amount,
      mockSignature: `mock_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch market data for a token
   */
  private async fetchMarketData(tokenMint: string): Promise<MarketData> {
    // Get token price
    const price = await this.jupiterClient.getPrice(tokenMint);

    // Mock market data - in production, this would come from real sources
    return {
      tokenData: {
        mint: tokenMint,
        symbol: 'TOKEN',
        name: 'Token',
        price,
        priceChange24h: (Math.random() - 0.5) * 20,
        volume24h: Math.random() * 100000,
        liquidity: Math.random() * 500000,
        marketCap: Math.random() * 10000000,
        holders: Math.floor(Math.random() * 10000),
      },
      solPrice: 100,
      marketSentiment: 'NEUTRAL',
      volatility: Math.random() * 50,
      trend: 'SIDEWAYS',
    };
  }

  /**
   * Add a job to the queue
   */
  async addJob(job: AgentJob, options?: { delay?: number; priority?: number }): Promise<Job> {
    return this.queue.add('agent-job', job, {
      delay: options?.delay,
      priority: options?.priority || 0,
    });
  }

  /**
   * Start continuous scanning loop
   */
  async startScanning(intervalMs = config.agent.intervalMs): Promise<void> {
    if (this.isRunning) {
      console.log('Scanner is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting continuous scanning (interval: ${intervalMs}ms)`);

    const scanLoop = async () => {
      while (this.isRunning) {
        try {
          await this.addJob({ type: 'SCAN' });
        } catch (error) {
          console.error('Scan job failed:', error);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    };

    scanLoop();
  }

  /**
   * Stop scanning
   */
  stopScanning(): void {
    this.isRunning = false;
    console.log('Scanner stopped');
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const waiting = await this.queue.getWaitingCount();
    const active = await this.queue.getActiveCount();
    const completed = await this.queue.getCompletedCount();
    const failed = await this.queue.getFailedCount();

    return { waiting, active, completed, failed };
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    this.stopScanning();
    await this.worker.close();
    await this.queue.close();
  }
}

// Export singleton instance
export const agentWorker = new AgentWorker();
