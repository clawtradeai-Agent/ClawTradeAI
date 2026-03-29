import { BaseAgent } from './base';
import { AgentType, AgentOutput, Decision, MarketData, RiskAssessment, RiskFactor, AgentConfig } from './types';

/**
 * RiskManagerAgent configuration
 */
export interface RiskManagerAgentConfig extends AgentConfig {
  maxRiskScore: number;
  requireLiquidity: number;
  requireMinHolders: number;
  blockHighConcentration: number;
  enableMintAuthorityCheck: boolean;
  enableFreezeAuthorityCheck: boolean;
}

/**
 * RiskManagerAgent - Performs risk assessment on trades
 * 
 * This agent evaluates:
 * - Liquidity risk
 * - Contract risk
 * - Market manipulation risk
 * - Concentration risk
 * 
 * It acts as a gatekeeper, blocking high-risk trades
 */
export class RiskManagerAgent extends BaseAgent {
  readonly type = AgentType.RISK_MANAGER;
  
  private agentConfig: RiskManagerAgentConfig;
  private blockedTokens = new Set<string>();

  constructor(config: Partial<RiskManagerAgentConfig> = {}) {
    super();
    this.agentConfig = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? false,
      maxRiskScore: 70,
      requireLiquidity: 5000,
      requireMinHolders: 50,
      blockHighConcentration: 30,
      enableMintAuthorityCheck: true,
      enableFreezeAuthorityCheck: true,
      ...config,
    };
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('RiskManagerAgent initialized', {
      maxRiskScore: this.agentConfig.maxRiskScore,
      requireLiquidity: this.agentConfig.requireLiquidity,
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput> {
    const marketData = input as MarketData;
    
    // Perform risk assessment
    const assessment = await this.assessRisk(marketData);

    // Determine decision based on risk
    let decision: Decision = Decision.SKIP;
    let confidence = 1 - (assessment.score / 100);

    if (assessment.approved) {
      decision = Decision.BUY;
    } else {
      decision = Decision.SELL;
      this.blockedTokens.add(marketData.tokenData.mint);
    }

    return this.createOutput(
      'risk_assessment',
      decision,
      confidence,
      { assessment }
    );
  }

  /**
   * Perform comprehensive risk assessment
   */
  private async assessRisk(marketData: MarketData): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    const token = marketData.tokenData;

    // 1. Liquidity Risk (max 25 points)
    const liquidityRisk = this.assessLiquidityRisk(token);
    factors.push(liquidityRisk);
    totalScore += liquidityRisk.score;

    // 2. Contract Risk (max 25 points)
    const contractRisk = this.assessContractRisk(marketData);
    factors.push(contractRisk);
    totalScore += contractRisk.score;

    // 3. Concentration Risk (max 25 points)
    const concentrationRisk = this.assessConcentrationRisk(token);
    factors.push(concentrationRisk);
    totalScore += concentrationRisk.score;

    // 4. Market Risk (max 25 points)
    const marketRisk = this.assessMarketRisk(marketData);
    factors.push(marketRisk);
    totalScore += marketRisk.score;

    // Determine risk level
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (totalScore < 25) level = 'LOW';
    else if (totalScore < 50) level = 'MEDIUM';
    else if (totalScore < 75) level = 'HIGH';
    else level = 'CRITICAL';

    const approved = totalScore <= this.config.maxRiskScore;

    return {
      score: totalScore,
      level,
      factors,
      approved,
    };
  }

  /**
   * Assess liquidity risk
   */
  private assessLiquidityRisk(token: { liquidity: number; volume24h: number }): RiskFactor {
    const { liquidity, volume24h } = token;
    
    if (liquidity < 1000) {
      return {
        name: 'Extremely Low Liquidity',
        severity: 'CRITICAL',
        description: `Liquidity of $${liquidity} is dangerously low`,
        score: 25,
      };
    }

    if (liquidity < this.config.requireLiquidity) {
      return {
        name: 'Low Liquidity',
        severity: 'HIGH',
        description: `Liquidity of $${liquidity} is below minimum requirement`,
        score: 20,
      };
    }

    // Check volume to liquidity ratio
    const volumeRatio = volume24h / liquidity;
    if (volumeRatio > 2) {
      return {
        name: 'High Volume/Liquidity Ratio',
        severity: 'MEDIUM',
        description: `Volume is ${volumeRatio.toFixed(1)}x liquidity, potential volatility`,
        score: 10,
      };
    }

    if (liquidity < 50000) {
      return {
        name: 'Moderate Liquidity',
        severity: 'LOW',
        description: `Liquidity of $${liquidity} is acceptable but limited`,
        score: 5,
      };
    }

    return {
      name: 'Good Liquidity',
      severity: 'LOW',
      description: `Liquidity of $${liquidity} is healthy`,
      score: 0,
    };
  }

  /**
   * Assess contract/safety risk
   */
  private assessContractRisk(marketData: MarketData): RiskFactor {
    // In production, this would check actual contract data
    // For now, we simulate based on available data
    
    const hasLowHolders = marketData.tokenData.holders < this.config.requireMinHolders;
    
    if (hasLowHolders) {
      return {
        name: 'Low Holder Count',
        severity: 'HIGH',
        description: `Only ${marketData.tokenData.holders} holders, potential rug pull risk`,
        score: 20,
      };
    }

    if (marketData.tokenData.holders < 100) {
      return {
        name: 'Moderate Holder Count',
        severity: 'MEDIUM',
        description: `${marketData.tokenData.holders} holders, still early stage`,
        score: 10,
      };
    }

    return {
      name: 'Healthy Distribution',
      severity: 'LOW',
      description: `${marketData.tokenData.holders} holders indicates good distribution`,
      score: 0,
    };
  }

  /**
   * Assess concentration risk
   */
  private assessConcentrationRisk(token: { holders: number; marketCap: number }): RiskFactor {
    const { holders, marketCap } = token;

    // Estimate top holder concentration based on holder count
    // In production, would check actual holder distribution
    const estimatedTopHolderPercent = Math.min(100, 100 / Math.sqrt(holders));

    if (estimatedTopHolderPercent > this.config.blockHighConcentration) {
      return {
        name: 'High Concentration Risk',
        severity: 'HIGH',
        description: `Estimated top holder controls ${estimatedTopHolderPercent.toFixed(1)}%`,
        score: 20,
      };
    }

    if (estimatedTopHolderPercent > 15) {
      return {
        name: 'Moderate Concentration',
        severity: 'MEDIUM',
        description: `Estimated top holder controls ${estimatedTopHolderPercent.toFixed(1)}%`,
        score: 10,
      };
    }

    return {
      name: 'Good Distribution',
      severity: 'LOW',
      description: 'Holder distribution appears healthy',
      score: 0,
    };
  }

  /**
   * Assess market risk
   */
  private assessMarketRisk(marketData: MarketData): RiskFactor {
    const { tokenData, volatility, marketSentiment } = marketData;

    // High volatility risk
    if (volatility > 50) {
      return {
        name: 'Extreme Volatility',
        severity: 'HIGH',
        description: `Volatility of ${volatility}% indicates extreme price swings`,
        score: 20,
      };
    }

    if (volatility > 25) {
      return {
        name: 'High Volatility',
        severity: 'MEDIUM',
        description: `Volatility of ${volatility}% indicates significant price swings`,
        score: 10,
      };
    }

    // Bearish market sentiment
    if (marketSentiment === 'BEARISH') {
      return {
        name: 'Bearish Market',
        severity: 'MEDIUM',
        description: 'Overall market sentiment is bearish',
        score: 10,
      };
    }

    // Large price drop
    if (tokenData.priceChange24h < -30) {
      return {
        name: 'Significant Price Drop',
        severity: 'HIGH',
        description: `Price down ${Math.abs(tokenData.priceChange24h)}% in 24h`,
        score: 15,
      };
    }

    return {
      name: 'Stable Market Conditions',
      severity: 'LOW',
      description: 'Market conditions appear stable',
      score: 0,
    };
  }

  /**
   * Check if a token is blocked
   */
  isTokenBlocked(mint: string): boolean {
    return this.blockedTokens.has(mint);
  }

  /**
   * Get all blocked tokens
   */
  getBlockedTokens(): string[] {
    return Array.from(this.blockedTokens);
  }

  /**
   * Unblock a token (manual override)
   */
  unblockToken(mint: string): void {
    this.blockedTokens.delete(mint);
    this.logger.info('Token unblocked', { mint });
  }

  /**
   * Clear all blocked tokens
   */
  clearBlockedTokens(): void {
    this.blockedTokens.clear();
    this.logger.info('All blocked tokens cleared');
  }
}
