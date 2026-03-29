/**
 * Agent system types and interfaces
 */

/**
 * Agent types enumeration
 */
export enum AgentType {
  SNIPER = 'SNIPER',
  ANALYST = 'ANALYST',
  RISK_MANAGER = 'RISK_MANAGER',
  STRATEGY = 'STRATEGY',
  EXECUTOR = 'EXECUTOR',
  COORDINATOR = 'COORDINATOR',
}

/**
 * Decision types
 */
export enum Decision {
  BUY = 'BUY',
  SELL = 'SELL',
  SKIP = 'SKIP',
  HOLD = 'HOLD',
}

/**
 * Agent confidence levels
 */
export enum ConfidenceLevel {
  VERY_LOW = 0.2,
  LOW = 0.4,
  MEDIUM = 0.6,
  HIGH = 0.8,
  VERY_HIGH = 1.0,
}

/**
 * Token analysis data
 */
export interface TokenData {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
  createdAt?: Date;
}

/**
 * Market data for analysis
 */
export interface MarketData {
  tokenData: TokenData;
  solPrice: number;
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatility: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  score: number; // 0-100, higher is riskier
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  approved: boolean;
}

export interface RiskFactor {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  score: number;
}

/**
 * Strategy signal
 */
export interface StrategySignal {
  action: Decision;
  confidence: number;
  reason: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeHorizon?: 'SHORT' | 'MEDIUM' | 'LONG';
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  signature?: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  error?: string;
}

/**
 * Agent output interface
 */
export interface AgentOutput<T = unknown> {
  agentType: AgentType;
  action: string;
  decision: Decision;
  confidence: number;
  data: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Coordinator decision
 */
export interface CoordinatorDecision {
  action: Decision;
  confidence: number;
  reasoning: string;
  agentVotes: Record<AgentType, AgentOutput>;
  tokenMint: string;
  recommendedAmount?: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  enabled: boolean;
  intervalMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  mockMode: boolean;
}

/**
 * Base agent interface - config is protected in implementation
 */
export interface IAgent {
  type: AgentType;

  /**
   * Initialize the agent
   */
  initialize(): Promise<void>;

  /**
   * Process input and return output
   */
  process(input: unknown): Promise<AgentOutput>;

  /**
   * Run the agent's main loop
   */
  run(): Promise<void>;

  /**
   * Stop the agent
   */
  stop(): void;

  /**
   * Get agent status
   */
  getStatus(): AgentStatus;
}

/**
 * Agent status
 */
export interface AgentStatus {
  type: AgentType;
  running: boolean;
  lastRun?: Date;
  lastAction?: string;
  decisionsCount: number;
  successRate: number;
}

/**
 * Logger interface for agents
 */
export interface AgentLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}
