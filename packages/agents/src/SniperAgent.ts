import { BaseAgent } from './base';
import { AgentType, AgentOutput, Decision, TokenData, MarketData, AgentConfig } from './types';

/**
 * SniperAgent configuration
 */
export interface SniperAgentConfig extends AgentConfig {
  minLiquidity: number;
  maxMarketCap: number;
  excludeKnownTokens: boolean;
  watchList: string[];
}

/**
 * New token opportunity detected by sniper
 */
export interface SniperOpportunity {
  tokenData: TokenData;
  liquidityScore: number;
  freshnessScore: number;
  overallScore: number;
  risks: string[];
}

/**
 * SniperAgent - Scans for new token opportunities
 *
 * This agent monitors the Solana blockchain for:
 * - New token launches
 * - New liquidity pools
 * - Significant volume spikes
 */
export class SniperAgent extends BaseAgent {
  readonly type = AgentType.SNIPER;

  private sniperConfig: SniperAgentConfig;
  private scannedTokens = new Set<string>();
  private opportunities: SniperOpportunity[] = [];

  constructor(config: Partial<SniperAgentConfig> = {}) {
    super();
    this.sniperConfig = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? false,
      minLiquidity: 10000, // $10,000 minimum liquidity
      maxMarketCap: 1000000, // $1M maximum market cap
      excludeKnownTokens: true,
      watchList: [],
      ...config,
    };
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('SniperAgent initialized', {
      minLiquidity: this.sniperConfig.minLiquidity,
      maxMarketCap: this.sniperConfig.maxMarketCap,
      watchListSize: this.sniperConfig.watchList.length,
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput> {
    const marketData = input as MarketData;
    
    // Check if token is already scanned
    if (this.scannedTokens.has(marketData.tokenData.mint)) {
      return this.createOutput(
        'scan_skip',
        Decision.SKIP,
        1.0,
        { reason: 'Already scanned' }
      );
    }

    // Analyze the token
    const opportunity = await this.analyzeToken(marketData.tokenData);
    
    if (opportunity.overallScore >= 0.7) {
      this.opportunities.push(opportunity);
      this.scannedTokens.add(marketData.tokenData.mint);
      
      return this.createOutput(
        'opportunity_found',
        Decision.BUY,
        opportunity.overallScore,
        { opportunity }
      );
    }

    this.scannedTokens.add(marketData.tokenData.mint);
    
    return this.createOutput(
      'scan_complete',
      Decision.SKIP,
      1 - opportunity.overallScore,
      { opportunity }
    );
  }

  protected async onTick(): Promise<void> {
    // In production, this would scan DEXes for new pools
    // For now, we simulate the scanning process
    this.logger.debug('Scanning for new tokens...');
    
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Analyze a token for sniping potential
   */
  private async analyzeToken(tokenData: TokenData): Promise<SniperOpportunity> {
    const risks: string[] = [];
    
    // Liquidity score (0-1)
    const liquidityScore = Math.min(1, tokenData.liquidity / this.sniperConfig.maxMarketCap);
    if (tokenData.liquidity < this.sniperConfig.minLiquidity) {
      risks.push('Low liquidity');
    }

    // Freshness score - newer tokens get higher scores
    const ageInHours = tokenData.createdAt 
      ? (Date.now() - tokenData.createdAt.getTime()) / (1000 * 60 * 60)
      : 24;
    const freshnessScore = Math.max(0, 1 - ageInHours / 24);
    if (ageInHours > 24) {
      risks.push('Token is not new');
    }

    // Market cap score
    const marketCapScore = tokenData.marketCap < this.sniperConfig.maxMarketCap ? 1 : 0.5;
    if (tokenData.marketCap > this.sniperConfig.maxMarketCap) {
      risks.push('Market cap too high');
    }

    // Volume score
    const volumeScore = Math.min(1, tokenData.volume24h / (tokenData.liquidity * 0.5));

    // Calculate overall score
    const overallScore = (
      liquidityScore * 0.3 +
      freshnessScore * 0.3 +
      marketCapScore * 0.2 +
      volumeScore * 0.2
    );

    return {
      tokenData,
      liquidityScore,
      freshnessScore,
      overallScore,
      risks,
    };
  }

  /**
   * Add token to watch list
   */
  addToWatchList(mint: string): void {
    if (!this.sniperConfig.watchList.includes(mint)) {
      this.sniperConfig.watchList.push(mint);
      this.logger.info('Added to watch list', { mint });
    }
  }

  /**
   * Remove token from watch list
   */
  removeFromWatchList(mint: string): void {
    this.sniperConfig.watchList = this.sniperConfig.watchList.filter(m => m !== mint);
    this.logger.info('Removed from watch list', { mint });
  }

  /**
   * Get current opportunities
   */
  getOpportunities(): SniperOpportunity[] {
    return [...this.opportunities];
  }

  /**
   * Clear scanned tokens cache
   */
  clearScannedCache(): void {
    this.scannedTokens.clear();
    this.logger.info('Scanned tokens cache cleared');
  }
}
