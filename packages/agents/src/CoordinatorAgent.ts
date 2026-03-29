import { BaseAgent } from './base';
import {
  AgentType,
  AgentOutput,
  Decision,
  CoordinatorDecision,
  MarketData,
  AgentConfig,
} from './types';
import { SniperAgent } from './SniperAgent';
import { AnalystAgent } from './AnalystAgent';
import { RiskManagerAgent } from './RiskManagerAgent';
import { StrategyAgent } from './StrategyAgent';
import { ExecutorAgent } from './ExecutorAgent';

/**
 * CoordinatorAgent configuration
 */
export interface CoordinatorAgentConfig extends AgentConfig {
  requireUnanimous: boolean;
  minConfidence: number;
  riskManagerVeto: boolean;
  agentWeights: Partial<Record<AgentType, number>>;
}

/**
 * Agent voting result
 */
export interface AgentVote {
  agentType: AgentType;
  decision: Decision;
  confidence: number;
  weight: number;
}

/**
 * CoordinatorAgent - Orchestrates all agents and makes final decisions
 * 
 * This agent:
 * - Collects decisions from all agents
 * - Weighs and combines outputs
 * - Makes final trading decision
 * - Coordinates execution
 */
export class CoordinatorAgent extends BaseAgent {
  readonly type = AgentType.COORDINATOR;
  
  private agentConfig: CoordinatorAgentConfig;
  private agents: Map<AgentType, BaseAgent> = new Map();
  private decisions: CoordinatorDecision[] = [];

  constructor(config: Partial<CoordinatorAgentConfig> = {}) {
    super();
    this.agentConfig = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      logLevel: config.logLevel ?? 'info',
      mockMode: config.mockMode ?? false,
      requireUnanimous: false,
      minConfidence: 0.6,
      riskManagerVeto: true,
      agentWeights: {
        [AgentType.SNIPER]: 0.15,
        [AgentType.ANALYST]: 0.25,
        [AgentType.RISK_MANAGER]: 0.25,
        [AgentType.STRATEGY]: 0.25,
        [AgentType.EXECUTOR]: 0.1,
      },
      ...config,
    };
  }

  /**
   * Register an agent with the coordinator
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.type, agent);
    this.logger.info('Agent registered', { agentType: agent.type });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentType: AgentType): void {
    this.agents.delete(agentType);
    this.logger.info('Agent unregistered', { agentType });
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('CoordinatorAgent initialized', {
      registeredAgents: Array.from(this.agents.keys()),
      requireUnanimous: this.agentConfig.requireUnanimous,
      riskManagerVeto: this.agentConfig.riskManagerVeto,
    });
  }

  protected async onProcess(input: unknown): Promise<AgentOutput> {
    const marketData = input as MarketData;
    
    // Collect decisions from all agents
    const votes = await this.collectVotes(marketData);

    // Apply risk manager veto if enabled
    if (this.agentConfig.riskManagerVeto) {
      const riskVote = votes.find(v => v.agentType === AgentType.RISK_MANAGER);
      if (riskVote && riskVote.decision === Decision.SELL) {
        return this.createOutput(
          'veto_applied',
          Decision.SKIP,
          1.0,
          { reason: 'Risk manager veto' }
        );
      }
    }

    // Calculate final decision
    const finalDecision = this.calculateDecision(votes, marketData);

    // Store decision
    this.decisions.push(finalDecision);

    return this.createOutput(
      'coordination_complete',
      finalDecision.action,
      finalDecision.confidence,
      { decision: finalDecision }
    );
  }

  /**
   * Collect votes from all registered agents
   */
  private async collectVotes(marketData: MarketData): Promise<AgentVote[]> {
    const votes: AgentVote[] = [];

    const agentPromises = Array.from(this.agents.entries()).map(
      async ([agentType, agent]) => {
        try {
          const output = await agent.process(marketData);
          const weight = this.config.agentWeights[agentType] || 0.1;

          return {
            agentType,
            decision: output.decision,
            confidence: output.confidence,
            weight,
          } as AgentVote;
        } catch (error) {
          this.logger.error(`Agent ${agentType} failed`, { error });
          return {
            agentType,
            decision: Decision.SKIP,
            confidence: 0,
            weight: 0,
          } as AgentVote;
        }
      }
    );

    const results = await Promise.all(agentPromises);
    votes.push(...results);

    this.logger.debug('Votes collected', {
      votes: votes.map(v => ({
        agent: v.agentType,
        decision: v.decision,
        confidence: v.confidence,
      })),
    });

    return votes;
  }

  /**
   * Calculate final decision from votes
   */
  private calculateDecision(
    votes: AgentVote[],
    marketData: MarketData
  ): CoordinatorDecision {
    // Calculate weighted scores for each decision
    const scores: Record<Decision, number> = {
      [Decision.BUY]: 0,
      [Decision.SELL]: 0,
      [Decision.SKIP]: 0,
      [Decision.HOLD]: 0,
    };

    let totalWeight = 0;

    for (const vote of votes) {
      scores[vote.decision] += vote.confidence * vote.weight;
      totalWeight += vote.weight;
    }

    // Normalize scores
    if (totalWeight > 0) {
      for (const decision of Object.keys(scores) as Decision[]) {
        scores[decision] /= totalWeight;
      }
    }

    // Check for unanimous decision if required
    if (this.config.requireUnanimous) {
      const buyVotes = votes.filter(v => v.decision === Decision.BUY);
      const sellVotes = votes.filter(v => v.decision === Decision.SELL);

      if (buyVotes.length === votes.length) {
        return this.createCoordinatorDecision(
          Decision.BUY,
          scores[Decision.BUY],
          'Unanimous BUY decision',
          votes,
          marketData.tokenData.mint
        );
      }

      if (sellVotes.length === votes.length) {
        return this.createCoordinatorDecision(
          Decision.SELL,
          scores[Decision.SELL],
          'Unanimous SELL decision',
          votes,
          marketData.tokenData.mint
        );
      }

      return this.createCoordinatorDecision(
        Decision.SKIP,
        1.0,
        'No unanimous decision',
        votes,
        marketData.tokenData.mint
      );
    }

    // Find the best decision
    let bestDecision: Decision = Decision.SKIP;
    let bestScore = scores[Decision.SKIP];

    for (const [decision, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDecision = decision as Decision;
      }
    }

    // Apply minimum confidence threshold
    if (bestScore < this.config.minConfidence) {
      bestDecision = Decision.SKIP;
    }

    const reasoning = this.generateReasoning(bestDecision, votes, scores);

    return this.createCoordinatorDecision(
      bestDecision,
      bestScore,
      reasoning,
      votes,
      marketData.tokenData.mint
    );
  }

  /**
   * Create a coordinator decision object
   */
  private createCoordinatorDecision(
    action: Decision,
    confidence: number,
    reasoning: string,
    votes: AgentVote[],
    tokenMint: string
  ): CoordinatorDecision {
    const agentVotes: Record<AgentType, AgentOutput> = {} as Record<AgentType, AgentOutput>;

    for (const vote of votes) {
      agentVotes[vote.agentType] = {
        agentType: vote.agentType,
        action: `${vote.agentType}_vote`,
        decision: vote.decision,
        confidence: vote.confidence,
        data: { weight: vote.weight },
        timestamp: new Date(),
      };
    }

    // Calculate recommended amount based on confidence
    const recommendedAmount = confidence >= 0.8 ? 1.0
      : confidence >= 0.6 ? 0.5
      : confidence >= 0.4 ? 0.25
      : undefined;

    return {
      action,
      confidence,
      reasoning,
      agentVotes,
      tokenMint,
      stopLoss: action === Decision.BUY ? 0.9 : undefined,
      takeProfit: action === Decision.BUY ? 1.2 : undefined,
    };
  }

  /**
   * Generate reasoning for the decision
   */
  private generateReasoning(
    decision: Decision,
    votes: AgentVote[],
    scores: Record<Decision, number>
  ): string {
    const buyScore = scores[Decision.BUY];
    const sellScore = scores[Decision.SELL];
    const skipScore = scores[Decision.SKIP];

    const reasons: string[] = [];

    // Agent agreement analysis
    const buyAgents = votes.filter(v => v.decision === Decision.BUY).map(v => v.agentType);
    const sellAgents = votes.filter(v => v.decision === Decision.SELL).map(v => v.agentType);

    if (decision === Decision.BUY) {
      reasons.push(`Strong buy signal (confidence: ${(buyScore * 100).toFixed(1)}%)`);
      if (buyAgents.length > 0) {
        reasons.push(`Supported by: ${buyAgents.join(', ')}`);
      }
      if (sellScore > 0.3) {
        reasons.push(`Some sell pressure detected (${(sellScore * 100).toFixed(1)}%)`);
      }
    } else if (decision === Decision.SELL) {
      reasons.push(`Strong sell signal (confidence: ${(sellScore * 100).toFixed(1)}%)`);
      if (sellAgents.length > 0) {
        reasons.push(`Supported by: ${sellAgents.join(', ')}`);
      }
    } else {
      reasons.push(`Insufficient signal strength`);
      reasons.push(`Buy: ${(buyScore * 100).toFixed(1)}%, Sell: ${(sellScore * 100).toFixed(1)}%, Skip: ${(skipScore * 100).toFixed(1)}%`);
    }

    return reasons.join('. ');
  }

  /**
   * Execute a coordinated trade
   */
  async executeDecision(
    decision: CoordinatorDecision,
    executor: ExecutorAgent,
    keypair: import('@solana/web3.js').Keypair
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (decision.action === Decision.SKIP) {
      return { success: false, error: 'Decision is SKIP' };
    }

    if (!decision.recommendedAmount) {
      return { success: false, error: 'No recommended amount' };
    }

    try {
      if (decision.action === Decision.BUY) {
        const result = await executor.buy(
          decision.tokenMint,
          decision.recommendedAmount,
          keypair
        );

        return {
          success: result.success,
          signature: result.signature,
          error: result.error,
        };
      } else {
        const result = await executor.sell(
          decision.tokenMint,
          decision.recommendedAmount,
          keypair
        );

        return {
          success: result.success,
          signature: result.signature,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get decision history
   */
  getDecisions(): CoordinatorDecision[] {
    return [...this.decisions];
  }

  /**
   * Get agent status summary
   */
  getAgentStatus(): Record<AgentType, { running: boolean; decisionsCount: number }> {
    const status: Record<AgentType, { running: boolean; decisionsCount: number }> = 
      {} as Record<AgentType, { running: boolean; decisionsCount: number }>;

    for (const [agentType, agent] of this.agents.entries()) {
      const agentStatus = agent.getStatus();
      status[agentType] = {
        running: agentStatus.running,
        decisionsCount: agentStatus.decisionsCount,
      };
    }

    return status;
  }

  /**
   * Start all registered agents
   */
  async startAllAgents(): Promise<void> {
    const promises = Array.from(this.agents.values()).map(agent => agent.run());
    await Promise.all(promises);
    this.logger.info('All agents started');
  }

  /**
   * Stop all registered agents
   */
  stopAllAgents(): void {
    for (const agent of this.agents.values()) {
      agent.stop();
    }
    this.logger.info('All agents stopped');
  }
}
