import { BaseAgent } from './base';
import { AgentType, AgentOutput, Decision, MarketData, StrategySignal, AgentConfig } from './types';

/**
 * Strategy types
 */
export enum StrategyType {
  CONSERVATIVE = 'CONSERVATIVE',
  BALANCED = 'BALANCED',
  AGGRESSIVE = 'AGGRESSIVE',
  SCALPING = 'SCALPING',
  SWING = 'SWING',
}

/**
 * StrategyAgent configuration
 */
export interface StrategyAgentConfig extends AgentConfig {
  strategyType: StrategyType;
  maxPositionSize: number;
  minPositionSize: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  maxOpenPositions: number;
  cooldownPeriodMs: number;
}

/**
 * Position management
 */
export interface Position {
  mint: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
}

/**
 * StrategyAgent - Determines trading strategy and position sizing
 * 
 * This agent:
 * - Applies trading strategy rules
 * - Calculates position sizes
 * - Sets take profit and stop loss levels
 * - Manages open positions
 */
export class StrategyAgent extends BaseAgent {
  readonly type = AgentType.STRATEGY;
  
  private agentConfig: StrategyAgentConfig;
  private openPositions: Map<string, Position> = new Map();
  private lastTradeTime: Map<string, number> = new Map();

  constructor(config: Partial<StrategyAgentConfig> = {}) {
    super();
    this.agentConfig = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? false,
      strategyType: StrategyType.BALANCED,
      maxPositionSize: 1, // 1 SOL
      minPositionSize: 0.01, // 0.01 SOL
      takeProfitPercent: 20,
      stopLossPercent: 10,
      trailingStopEnabled: true,
      trailingStopPercent: 5,
      maxOpenPositions: 5,
      cooldownPeriodMs: 60000, // 1 minute
      ...config,
    };
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('StrategyAgent initialized', {
      strategyType: this.agentConfig.strategyType,
      maxPositionSize: this.agentConfig.maxPositionSize,
      takeProfitPercent: this.agentConfig.takeProfitPercent,
      stopLossPercent: this.agentConfig.stopLossPercent,
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput> {
    const marketData = input as MarketData;
    const mint = marketData.tokenData.mint;

    // Check cooldown
    if (this.isInCooldown(mint)) {
      return this.createOutput(
        'cooldown_active',
        Decision.SKIP,
        1.0,
        { reason: 'Token is in cooldown period' }
      );
    }

    // Check if we have an existing position
    const existingPosition = this.openPositions.get(mint);
    
    if (existingPosition) {
      // Manage existing position
      return this.managePosition(existingPosition, marketData);
    }

    // Check position limit
    if (this.openPositions.size >= this.agentConfig.maxOpenPositions) {
      return this.createOutput(
        'position_limit_reached',
        Decision.SKIP,
        1.0,
        { reason: 'Maximum open positions reached' }
      );
    }

    // Generate new signal
    const signal = await this.generateSignal(marketData);

    return this.createOutput(
      'signal_generated',
      signal.action,
      signal.confidence,
      { signal }
    );
  }

  /**
   * Generate trading signal based on strategy
   */
  private async generateSignal(marketData: MarketData): Promise<StrategySignal> {
    const { tokenData, marketSentiment, trend } = marketData;

    // Base confidence from market data
    let baseConfidence = 0.5;

    // Adjust based on sentiment
    if (marketSentiment === 'BULLISH') baseConfidence += 0.2;
    if (marketSentiment === 'BEARISH') baseConfidence -= 0.2;

    // Adjust based on trend
    if (trend === 'UP') baseConfidence += 0.15;
    if (trend === 'DOWN') baseConfidence -= 0.15;

    // Adjust based on strategy type
    switch (this.config.strategyType) {
      case StrategyType.CONSERVATIVE:
        baseConfidence *= 0.9; // Require higher confidence
        break;
      case StrategyType.AGGRESSIVE:
        baseConfidence *= 1.1; // More willing to trade
        break;
      case StrategyType.SCALPING:
        baseConfidence *= 1.05; // Quick trades
        break;
    }

    // Calculate position size
    const recommendedAmount = this.calculatePositionSize(baseConfidence);

    // Set targets based on strategy
    const { takeProfit, stopLoss } = this.calculateTargets(tokenData.price);

    // Determine action
    let action: Decision = Decision.SKIP;
    const confidence = Math.min(1, Math.max(0, baseConfidence));

    if (confidence >= this.getEntryThreshold()) {
      action = Decision.BUY;
    }

    return {
      action,
      confidence,
      reason: this.generateReason(action, marketData),
      targetPrice: takeProfit,
      stopLoss,
      timeHorizon: this.getTimeHorizon(),
    };
  }

  /**
   * Manage existing position
   */
  private managePosition(position: Position, marketData: MarketData): AgentOutput {
    const currentPrice = marketData.tokenData.price;
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Update position
    position.currentPrice = currentPrice;
    position.pnl = (currentPrice - position.entryPrice) * position.amount;
    position.pnlPercent = pnlPercent;

    // Check take profit
    if (pnlPercent >= this.config.takeProfitPercent) {
      return this.createOutput(
        'take_profit_triggered',
        Decision.SELL,
        1.0,
        { position, reason: 'Take profit target reached' }
      );
    }

    // Check stop loss
    if (pnlPercent <= -this.config.stopLossPercent) {
      return this.createOutput(
        'stop_loss_triggered',
        Decision.SELL,
        1.0,
        { position, reason: 'Stop loss triggered' }
      );
    }

    // Check trailing stop
    if (this.config.trailingStopEnabled && pnlPercent > 0) {
      const peakPnl = Math.max(0, ...Array.from(this.openPositions.values())
        .filter(p => p.mint === position.mint)
        .map(p => p.pnlPercent));
      
      if (peakPnl - pnlPercent >= this.config.trailingStopPercent) {
        return this.createOutput(
          'trailing_stop_triggered',
          Decision.SELL,
          0.9,
          { position, reason: 'Trailing stop triggered' }
        );
      }
    }

    // Hold position
    return this.createOutput(
      'position_held',
      Decision.HOLD,
      0.8,
      { position }
    );
  }

  /**
   * Calculate position size based on confidence and strategy
   */
  private calculatePositionSize(confidence: number): number {
    const baseSize = this.config.minPositionSize;
    const maxSize = this.config.maxPositionSize;

    switch (this.config.strategyType) {
      case StrategyType.CONSERVATIVE:
        return baseSize + (maxSize - baseSize) * (confidence * 0.5);
      case StrategyType.AGGRESSIVE:
        return baseSize + (maxSize - baseSize) * confidence;
      case StrategyType.SCALPING:
        return baseSize + (maxSize - baseSize) * (confidence * 0.7);
      default:
        return baseSize + (maxSize - baseSize) * (confidence * 0.8);
    }
  }

  /**
   * Calculate take profit and stop loss levels
   */
  private calculateTargets(entryPrice: number): { takeProfit: number; stopLoss: number } {
    const takeProfit = entryPrice * (1 + this.config.takeProfitPercent / 100);
    const stopLoss = entryPrice * (1 - this.config.stopLossPercent / 100);

    return { takeProfit, stopLoss };
  }

  /**
   * Get entry threshold based on strategy
   */
  private getEntryThreshold(): number {
    switch (this.config.strategyType) {
      case StrategyType.CONSERVATIVE:
        return 0.75;
      case StrategyType.AGGRESSIVE:
        return 0.55;
      case StrategyType.SCALPING:
        return 0.6;
      default:
        return 0.65;
    }
  }

  /**
   * Get time horizon based on strategy
   */
  private getTimeHorizon(): 'SHORT' | 'MEDIUM' | 'LONG' {
    switch (this.config.strategyType) {
      case StrategyType.SCALPING:
        return 'SHORT';
      case StrategyType.SWING:
        return 'MEDIUM';
      case StrategyType.CONSERVATIVE:
        return 'LONG';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Generate reason for decision
   */
  private generateReason(action: Decision, marketData: MarketData): string {
    if (action === Decision.BUY) {
      return `Bullish signal: ${marketData.marketSentiment} sentiment, ${marketData.trend} trend`;
    }
    if (action === Decision.SELL) {
      return `Bearish signal: ${marketData.marketSentiment} sentiment, ${marketData.trend} trend`;
    }
    return 'Insufficient signal strength for entry';
  }

  /**
   * Check if token is in cooldown
   */
  private isInCooldown(mint: string): boolean {
    const lastTrade = this.lastTradeTime.get(mint);
    if (!lastTrade) return false;

    return Date.now() - lastTrade < this.config.cooldownPeriodMs;
  }

  /**
   * Record a trade for cooldown tracking
   */
  recordTrade(mint: string): void {
    this.lastTradeTime.set(mint, Date.now());
  }

  /**
   * Add a position to tracking
   */
  addPosition(position: Position): void {
    this.openPositions.set(position.mint, position);
    this.recordTrade(position.mint);
    this.logger.info('Position opened', { 
      mint: position.mint, 
      entryPrice: position.entryPrice,
      amount: position.amount 
    });
  }

  /**
   * Remove a position from tracking
   */
  removePosition(mint: string): void {
    const position = this.openPositions.get(mint);
    if (position) {
      this.openPositions.delete(mint);
      this.logger.info('Position closed', { 
        mint, 
        pnl: position.pnl, 
        pnlPercent: position.pnlPercent 
      });
    }
  }

  /**
   * Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.openPositions.values());
  }

  /**
   * Get total portfolio value
   */
  getPortfolioValue(currentPrices: Map<string, number>): number {
    let total = 0;
    for (const position of this.openPositions.values()) {
      const currentPrice = currentPrices.get(position.mint) || position.currentPrice;
      total += currentPrice * position.amount;
    }
    return total;
  }

  /**
   * Update configuration
   */
  updateStrategy(strategyType: StrategyType): void {
    this.config.strategyType = strategyType;
    this.logger.info('Strategy updated', { strategyType });
  }
}
