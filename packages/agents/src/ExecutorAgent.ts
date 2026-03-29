import { BaseAgent } from './base';
import { AgentType, AgentOutput, Decision, ExecutionResult, AgentConfig } from './types';
import { Connection, Keypair } from '@solana/web3.js';
import { TradingEngine, createTradingEngine } from '@clawtrade/trading';
import { TOKENS } from '@clawtrade/blockchain';

/**
 * ExecutorAgent configuration
 */
export interface ExecutorAgentConfig extends AgentConfig {
  mockMode: boolean;
  maxSlippageBps: number;
  maxRetries: number;
  retryDelayMs: number;
  confirmTimeoutMs: number;
}

/**
 * Trade execution request
 */
export interface TradeRequest {
  type: 'BUY' | 'SELL';
  tokenMint: string;
  amount: number; // in SOL for BUY, in token units for SELL
  keypair: Keypair;
  slippageBps?: number;
}

/**
 * ExecutorAgent - Executes trades on the blockchain
 * 
 * This agent:
 * - Executes buy/sell orders via Jupiter
 * - Handles transaction retries
 * - Confirms transactions
 * - Reports execution results
 */
export class ExecutorAgent extends BaseAgent {
  readonly type = AgentType.EXECUTOR;
  
  private agentConfig: ExecutorAgentConfig;
  private connection: Connection;
  private tradingEngine: TradingEngine;
  private pendingTrades = new Map<string, TradeRequest>();
  private executedTrades: ExecutionResult[] = [];

  constructor(
    connection: Connection,
    config: Partial<ExecutorAgentConfig> = {}
  ) {
    super();
    this.agentConfig = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? true,
      maxSlippageBps: 100,
      maxRetries: 3,
      retryDelayMs: 1000,
      confirmTimeoutMs: 60000,
      ...config,
    };

    this.connection = connection;
    this.tradingEngine = createTradingEngine(connection);
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('ExecutorAgent initialized', {
      mockMode: this.agentConfig.mockMode,
      maxSlippageBps: this.agentConfig.maxSlippageBps,
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput<ExecutionResult>> {
    const request = input as TradeRequest;

    // Validate request
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return this.createOutput(
        'validation_failed',
        Decision.SKIP,
        1.0,
        { success: false, inputAmount: '0', outputAmount: '0', priceImpact: 0, error: validation.error } as ExecutionResult
      );
    }

    // Execute trade
    const result = await this.executeTrade(request);

    if (result.success) {
      this.executedTrades.push(result);

      return this.createOutput(
        'trade_executed',
        request.type === 'BUY' ? Decision.BUY : Decision.SELL,
        1.0,
        result
      );
    }

    return this.createOutput(
      'trade_failed',
      Decision.SKIP,
      0.0,
      result
    );
  }

  /**
   * Validate trade request
   */
  private validateRequest(request: TradeRequest): { valid: boolean; error?: string } {
    if (!request.tokenMint) {
      return { valid: false, error: 'Token mint is required' };
    }

    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be positive' };
    }

    if (!request.keypair) {
      return { valid: false, error: 'Keypair is required' };
    }

    const slippage = request.slippageBps || this.config.maxSlippageBps;
    if (slippage > 500) {
      return { valid: false, error: 'Slippage too high (max 5%)' };
    }

    return { valid: true };
  }

  /**
   * Execute a trade with retries
   */
  private async executeTrade(request: TradeRequest): Promise<ExecutionResult> {
    const { type, tokenMint, amount, keypair, slippageBps } = request;

    this.logger.info('Executing trade', {
      type,
      tokenMint,
      amount,
      slippageBps: slippageBps || this.config.maxSlippageBps,
    });

    // Mock mode - simulate execution
    if (this.config.mockMode) {
      return this.mockExecuteTrade(request);
    }

    // Real execution with retries
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.pendingTrades.set(tokenMint, request);

        let result: Awaited<ReturnType<typeof this.tradingEngine.buy>>;

        if (type === 'BUY') {
          result = await this.tradingEngine.buy(tokenMint, amount, keypair);
        } else {
          // For SELL, we need token decimals - using SOL as default
          result = await this.tradingEngine.sell(tokenMint, amount, 9, keypair);
        }

        this.pendingTrades.delete(tokenMint);

        if (result.success && result.signature) {
          return {
            success: true,
            signature: result.signature,
            inputAmount: result.inputAmount,
            outputAmount: result.outputAmount,
            priceImpact: result.priceImpact,
          };
        }

        return {
          success: false,
          inputAmount: amount.toString(),
          outputAmount: '0',
          priceImpact: 0,
          error: result.error,
        };
      } catch (error) {
        this.logger.warn(`Attempt ${attempt} failed`, { error });

        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }

    return {
      success: false,
      inputAmount: amount.toString(),
      outputAmount: '0',
      priceImpact: 0,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Mock trade execution for testing
   */
  private mockExecuteTrade(request: TradeRequest): ExecutionResult {
    const { type, tokenMint, amount } = request;

    // Simulate network delay
    const delay = Math.random() * 500 + 100;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = Date.now() + delay; // Placeholder for delay usage

    // Simulate success/failure (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      const mockSignature = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const priceImpact = Math.random() * 2; // 0-2%

      return {
        success: true,
        signature: mockSignature,
        inputAmount: amount.toString(),
        outputAmount: (amount * (1 - priceImpact / 100)).toString(),
        priceImpact,
      };
    }

    return {
      success: false,
      inputAmount: amount.toString(),
      outputAmount: '0',
      priceImpact: 0,
      error: 'Mock execution failure',
    };
  }

  /**
   * Execute a BUY order
   */
  async buy(
    tokenMint: string,
    amountSOL: number,
    keypair: Keypair,
    slippageBps?: number
  ): Promise<ExecutionResult> {
    return this.process({
      type: 'BUY',
      tokenMint,
      amount: amountSOL,
      keypair,
      slippageBps,
    } as unknown as unknown) as Promise<ExecutionResult>;
  }

  /**
   * Execute a SELL order
   */
  async sell(
    tokenMint: string,
    amount: number,
    keypair: Keypair,
    slippageBps?: number
  ): Promise<ExecutionResult> {
    return this.process({
      type: 'SELL',
      tokenMint,
      amount,
      keypair,
      slippageBps,
    } as unknown as unknown) as Promise<ExecutionResult>;
  }

  /**
   * Get pending trades
   */
  getPendingTrades(): Map<string, TradeRequest> {
    return new Map(this.pendingTrades);
  }

  /**
   * Get executed trades history
   */
  getExecutedTrades(): ExecutionResult[] {
    return [...this.executedTrades];
  }

  /**
   * Clear trade history
   */
  clearTradeHistory(): void {
    this.executedTrades = [];
    this.logger.info('Trade history cleared');
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    successRate: number;
  } {
    const total = this.executedTrades.length;
    const successful = this.executedTrades.filter(t => t.success).length;
    const failed = total - successful;

    return {
      totalTrades: total,
      successfulTrades: successful,
      failedTrades: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }

  /**
   * Update mock mode
   */
  setMockMode(enabled: boolean): void {
    this.config.mockMode = enabled;
    this.logger.info(`Mock mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export a factory function for creating executor with proper types
export function createExecutorAgent(
  connection: Connection,
  config?: Partial<ExecutorAgentConfig>
): ExecutorAgent {
  return new ExecutorAgent(connection, config);
}
