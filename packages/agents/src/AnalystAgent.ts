import { BaseAgent } from './base';
import { AgentType, AgentOutput, Decision, TokenData, MarketData, AgentConfig } from './types';

/**
 * AnalystAgent configuration
 */
export interface AnalystAgentConfig extends AgentConfig {
  technicalAnalysisWeight: number;
  fundamentalAnalysisWeight: number;
  sentimentAnalysisWeight: number;
  minConfidence: number;
}

/**
 * Technical analysis indicators
 */
export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
}

/**
 * Fundamental analysis metrics
 */
export interface FundamentalMetrics {
  liquidityScore: number;
  holderDistribution: number;
  contractVerified: boolean;
  mintAuthorityDisabled: boolean;
  freezeAuthorityDisabled: boolean;
  topHolderPercent: number;
  score: number;
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysis {
  socialScore: number;
  newsScore: number;
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  trending: boolean;
  score: number;
}

/**
 * AnalystAgent - Performs comprehensive token analysis
 * 
 * This agent analyzes tokens using:
 * - Technical analysis (RSI, MACD, Moving Averages)
 * - Fundamental analysis (liquidity, holders, contract safety)
 * - Sentiment analysis (social, news)
 */
export class AnalystAgent extends BaseAgent {
  readonly type = AgentType.ANALYST;
  
  private config: AnalystAgentConfig;

  constructor(config: Partial<AnalystAgentConfig> = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? false,
      technicalAnalysisWeight: 0.4,
      fundamentalAnalysisWeight: 0.4,
      sentimentAnalysisWeight: 0.2,
      minConfidence: 0.5,
      ...config,
    };
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('AnalystAgent initialized', {
      weights: {
        technical: this.config.technicalAnalysisWeight,
        fundamental: this.config.fundamentalAnalysisWeight,
        sentiment: this.config.sentimentAnalysisWeight,
      },
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput> {
    const marketData = input as MarketData;
    
    // Perform all analyses
    const [technical, fundamental, sentiment] = await Promise.all([
      this.performTechnicalAnalysis(marketData),
      this.performFundamentalAnalysis(marketData),
      this.performSentimentAnalysis(marketData),
    ]);

    // Calculate weighted score
    const overallScore = (
      technical.strength * this.config.technicalAnalysisWeight +
      fundamental.score * this.config.fundamentalAnalysisWeight +
      sentiment.score * this.config.sentimentAnalysisWeight
    );

    // Determine decision
    let decision: Decision = Decision.SKIP;
    if (overallScore >= 0.7) {
      decision = Decision.BUY;
    } else if (overallScore <= 0.3) {
      decision = Decision.SELL;
    }

    const confidence = Math.max(overallScore, 1 - overallScore);

    if (confidence < this.config.minConfidence) {
      decision = Decision.SKIP;
    }

    return this.createOutput(
      'analysis_complete',
      decision,
      confidence,
      {
        technical,
        fundamental,
        sentiment,
        overallScore,
        decision,
        confidence,
      }
    );
  }

  /**
   * Perform technical analysis on token
   */
  private async performTechnicalAnalysis(marketData: MarketData): Promise<TechnicalIndicators> {
    const token = marketData.tokenData;
    
    // Simulate RSI calculation
    // In production, this would use actual price history
    const rsi = this.calculateRSI(token.priceChange24h);
    
    // Simulate MACD
    const macd = {
      value: token.priceChange24h * 0.1,
      signal: token.priceChange24h * 0.05,
      histogram: token.priceChange24h * 0.05,
    };

    // Determine signal based on indicators
    let bullishSignals = 0;
    let bearishSignals = 0;

    if (rsi < 30) bullishSignals++;
    if (rsi > 70) bearishSignals++;
    if (macd.histogram > 0) bullishSignals++;
    if (macd.histogram < 0) bearishSignals++;
    if (token.priceChange24h > 0) bullishSignals++;
    if (token.priceChange24h < 0) bearishSignals++;

    const signal = bullishSignals > bearishSignals ? 'BULLISH' 
      : bearishSignals > bullishSignals ? 'BEARISH' 
      : 'NEUTRAL';

    const strength = Math.abs(bullishSignals - bearishSignals) / 6;

    return {
      rsi,
      macd,
      movingAverages: {
        sma20: token.price * (1 + token.priceChange24h / 100 * 0.5),
        sma50: token.price * (1 + token.priceChange24h / 100 * 0.3),
        ema12: token.price * (1 + token.priceChange24h / 100 * 0.6),
        ema26: token.price * (1 + token.priceChange24h / 100 * 0.4),
      },
      bollingerBands: {
        upper: token.price * 1.1,
        middle: token.price,
        lower: token.price * 0.9,
      },
      signal,
      strength,
    };
  }

  /**
   * Perform fundamental analysis on token
   */
  private async performFundamentalAnalysis(marketData: MarketData): Promise<FundamentalMetrics> {
    const token = marketData.tokenData;

    // Liquidity score
    const liquidityScore = Math.min(1, token.liquidity / 100000);

    // Holder distribution score (more holders = better distribution)
    const holderDistribution = Math.min(1, token.holders / 1000);

    // Top holder concentration (lower is better)
    const topHolderPercent = Math.min(100, 50 - (token.holders / 100));
    const holderScore = 1 - (topHolderPercent / 100);

    // Contract safety (in production, would check actual contract)
    const contractVerified = true;
    const mintAuthorityDisabled = true;
    const freezeAuthorityDisabled = true;

    const score = (
      liquidityScore * 0.3 +
      holderDistribution * 0.25 +
      holderScore * 0.25 +
      (contractVerified ? 0.1 : 0) +
      (mintAuthorityDisabled ? 0.05 : 0) +
      (freezeAuthorityDisabled ? 0.05 : 0)
    );

    return {
      liquidityScore,
      holderDistribution,
      contractVerified,
      mintAuthorityDisabled,
      freezeAuthorityDisabled,
      topHolderPercent,
      score,
    };
  }

  /**
   * Perform sentiment analysis on token
   */
  private async performSentimentAnalysis(marketData: MarketData): Promise<SentimentAnalysis> {
    const token = marketData.tokenData;

    // Social score based on volume and price action
    const volumeScore = Math.min(1, token.volume24h / (token.liquidity * 0.3));
    const priceActionScore = token.priceChange24h > 0 ? 
      Math.min(1, token.priceChange24h / 100) : 0;
    const socialScore = (volumeScore + priceActionScore) / 2;

    // News score (simulated)
    const newsScore = marketData.marketSentiment === 'BULLISH' ? 0.8 
      : marketData.marketSentiment === 'BEARISH' ? 0.2 
      : 0.5;

    const overallSentiment = socialScore > 0.6 ? 'POSITIVE'
      : socialScore < 0.4 ? 'NEGATIVE'
      : 'NEUTRAL';

    const trending = token.volume24h > token.liquidity * 0.5;

    const score = (socialScore * 0.6 + newsScore * 0.4);

    return {
      socialScore,
      newsScore,
      overallSentiment,
      trending,
      score,
    };
  }

  /**
   * Calculate RSI from price change
   */
  private calculateRSI(priceChange24h: number): number {
    // Simplified RSI calculation
    // In production, would use actual price history
    if (priceChange24h > 50) return 80;
    if (priceChange24h > 20) return 65;
    if (priceChange24h > 5) return 55;
    if (priceChange24h > -5) return 50;
    if (priceChange24h > -20) return 35;
    if (priceChange24h > -50) return 20;
    return 10;
  }
}
