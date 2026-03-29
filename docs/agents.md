# Agent System Documentation

## Overview

ClawTrade AI uses a multi-agent system where each agent has a specialized role in the trading process. The agents work together through a coordinated pipeline to make informed trading decisions.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Pipeline                            │
│                                                              │
│  Input → [Sniper] → [Analyst] → [Risk] → [Strategy] →       │
│                      ↓                                       │
│                  [Coordinator] → [Executor] → Output        │
└─────────────────────────────────────────────────────────────┘
```

## Agents

### 1. SniperAgent 🎯

**Purpose**: Discover new trading opportunities by monitoring the Solana blockchain.

**Location**: `packages/agents/src/SniperAgent.ts`

**Responsibilities**:
- Scan for new token launches
- Monitor new liquidity pools
- Detect volume spikes
- Track watchlist tokens

**Configuration**:
```typescript
interface SniperAgentConfig {
  minLiquidity: number;      // Minimum liquidity threshold
  maxMarketCap: number;      // Maximum market cap
  excludeKnownTokens: boolean;
  watchList: string[];       // Tokens to prioritize
}
```

**Output**:
```typescript
interface SniperOpportunity {
  tokenData: TokenData;
  liquidityScore: number;
  freshnessScore: number;
  overallScore: number;
  risks: string[];
}
```

**Decision Logic**:
```
IF liquidity >= minLiquidity AND
   marketCap <= maxMarketCap AND
   age <= 24 hours
THEN score = high
ELSE score = low
```

---

### 2. AnalystAgent 📊

**Purpose**: Perform comprehensive analysis on tokens using multiple methodologies.

**Location**: `packages/agents/src/AnalystAgent.ts`

**Responsibilities**:
- Technical analysis (RSI, MACD, Moving Averages)
- Fundamental analysis (liquidity, holders, contract safety)
- Sentiment analysis (social, news, market sentiment)

**Configuration**:
```typescript
interface AnalystAgentConfig {
  technicalAnalysisWeight: number;   // 0.4
  fundamentalAnalysisWeight: number; // 0.4
  sentimentAnalysisWeight: number;   // 0.2
  minConfidence: number;             // 0.5
}
```

**Technical Indicators**:
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- SMA/EMA (Simple/Exponential Moving Averages)
- Bollinger Bands

**Output**:
```typescript
interface AnalysisResult {
  technical: TechnicalIndicators;
  fundamental: FundamentalMetrics;
  sentiment: SentimentAnalysis;
  overallScore: number;
}
```

**Decision Logic**:
```
overallScore = (
  technical.strength * 0.4 +
  fundamental.score * 0.4 +
  sentiment.score * 0.2
)

IF overallScore >= 0.7 → BUY
IF overallScore <= 0.3 → SELL
ELSE → SKIP
```

---

### 3. RiskManagerAgent 🛡️

**Purpose**: Evaluate and mitigate trading risks. Acts as a gatekeeper.

**Location**: `packages/agents/src/RiskManagerAgent.ts`

**Responsibilities**:
- Liquidity risk assessment
- Contract safety verification
- Concentration risk analysis
- Market volatility evaluation
- Veto high-risk trades

**Configuration**:
```typescript
interface RiskManagerAgentConfig {
  maxRiskScore: number;           // 70
  requireLiquidity: number;       // 5000
  requireMinHolders: number;      // 50
  blockHighConcentration: number; // 30%
  enableMintAuthorityCheck: boolean;
  enableFreezeAuthorityCheck: boolean;
}
```

**Risk Factors**:
| Factor | Max Score | Description |
|--------|-----------|-------------|
| Liquidity | 25 | Low liquidity increases risk |
| Contract | 25 | Unsafe contract functions |
| Concentration | 25 | Top holder concentration |
| Market | 25 | Volatility and sentiment |

**Output**:
```typescript
interface RiskAssessment {
  score: number;           // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  approved: boolean;
}
```

**Veto Power**:
The RiskManager has veto power - if it rejects a trade, the Coordinator will not proceed regardless of other agents' opinions.

---

### 4. StrategyAgent 🧠

**Purpose**: Determine optimal position sizing and risk management parameters.

**Location**: `packages/agents/src/StrategyAgent.ts`

**Responsibilities**:
- Position size calculation
- Take profit level setting
- Stop loss level setting
- Trailing stop management
- Position tracking

**Configuration**:
```typescript
interface StrategyAgentConfig {
  strategyType: StrategyType;     // CONSERVATIVE | BALANCED | AGGRESSIVE
  maxPositionSize: number;        // 1 SOL
  minPositionSize: number;        // 0.01 SOL
  takeProfitPercent: number;      // 20%
  stopLossPercent: number;        // 10%
  trailingStopEnabled: boolean;
  trailingStopPercent: number;    // 5%
  maxOpenPositions: number;       // 5
}
```

**Strategy Types**:
| Type | Entry Threshold | Position Sizing | Risk |
|------|----------------|-----------------|------|
| CONSERVATIVE | 0.75 | 50% of max | Low |
| BALANCED | 0.65 | 80% of max | Medium |
| AGGRESSIVE | 0.55 | 100% of max | High |
| SCALPING | 0.60 | 70% of max | Medium |

**Output**:
```typescript
interface StrategySignal {
  action: Decision;
  confidence: number;
  reason: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
}
```

**Position Management**:
```typescript
interface Position {
  mint: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
}
```

---

### 5. ExecutorAgent ⚡

**Purpose**: Execute trades on the blockchain with optimal routing.

**Location**: `packages/agents/src/ExecutorAgent.ts`

**Responsibilities**:
- Transaction building
- Jupiter integration
- Slippage management
- Transaction confirmation
- Retry logic

**Configuration**:
```typescript
interface ExecutorAgentConfig {
  mockMode: boolean;
  maxSlippageBps: number;      // 100 (1%)
  maxRetries: number;          // 3
  retryDelayMs: number;        // 1000
  confirmTimeoutMs: number;    // 60000
}
```

**Execution Flow**:
```
1. Validate trade request
2. Get quote from Jupiter
3. Build transaction
4. Sign with wallet
5. Send transaction
6. Wait for confirmation
7. Report result
```

**Output**:
```typescript
interface ExecutionResult {
  success: boolean;
  signature?: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  error?: string;
}
```

**Mock Mode**:
For testing without real funds, mock mode simulates trades with realistic delays and success rates.

---

### 6. CoordinatorAgent 🤖

**Purpose**: Orchestrate all agents and make final trading decisions.

**Location**: `packages/agents/src/CoordinatorAgent.ts`

**Responsibilities**:
- Collect agent outputs
- Weigh and combine decisions
- Apply veto rules
- Make final decision
- Coordinate execution

**Configuration**:
```typescript
interface CoordinatorAgentConfig {
  requireUnanimous: boolean;
  minConfidence: number;       // 0.6
  riskManagerVeto: boolean;    // true
  agentWeights: {
    SNIPER: 0.15;
    ANALYST: 0.25;
    RISK_MANAGER: 0.25;
    STRATEGY: 0.25;
    EXECUTOR: 0.10;
  };
}
```

**Decision Algorithm**:
```typescript
function calculateDecision(votes: AgentVote[]): Decision {
  // Calculate weighted scores
  const scores = {
    BUY: sum(vote.confidence * vote.weight for BUY votes),
    SELL: sum(vote.confidence * vote.weight for SELL votes),
    SKIP: sum(vote.confidence * vote.weight for SKIP votes),
  };

  // Check risk manager veto
  if (riskManagerVeto && riskVote === SELL) {
    return SKIP;
  }

  // Check unanimous requirement
  if (requireUnanimous && !allVotesSame) {
    return SKIP;
  }

  // Return best decision above threshold
  return bestScore >= minConfidence ? bestDecision : SKIP;
}
```

**Output**:
```typescript
interface CoordinatorDecision {
  action: Decision;
  confidence: number;
  reasoning: string;
  agentVotes: Record<AgentType, AgentOutput>;
  tokenMint: string;
  recommendedAmount?: number;
  stopLoss?: number;
  takeProfit?: number;
}
```

---

## Agent Communication

### Input/Output Interface

All agents implement the `IAgent` interface:

```typescript
interface IAgent {
  type: AgentType;
  config: AgentConfig;
  initialize(): Promise<void>;
  process(input: unknown): Promise<AgentOutput>;
  run(): Promise<void>;
  stop(): void;
  getStatus(): AgentStatus;
}
```

### Agent Output

```typescript
interface AgentOutput<T = unknown> {
  agentType: AgentType;
  action: string;
  decision: Decision;
  confidence: number;
  data: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

### Decision Types

```typescript
enum Decision {
  BUY = 'BUY',
  SELL = 'SELL',
  SKIP = 'SKIP',
  HOLD = 'HOLD',
}
```

---

## Usage Examples

### Creating Agents

```typescript
import {
  SniperAgent,
  AnalystAgent,
  RiskManagerAgent,
  StrategyAgent,
  ExecutorAgent,
  CoordinatorAgent,
} from '@clawtrade/agents';

// Create individual agents
const sniper = new SniperAgent({
  minLiquidity: 10000,
  maxMarketCap: 500000,
});

const analyst = new AnalystAgent({
  technicalAnalysisWeight: 0.4,
  fundamentalAnalysisWeight: 0.4,
});

const riskManager = new RiskManagerAgent({
  maxRiskScore: 70,
  requireLiquidity: 5000,
});

const strategy = new StrategyAgent({
  strategyType: StrategyType.BALANCED,
  maxPositionSize: 1,
});

const executor = new ExecutorAgent(connection, {
  mockMode: true,
});

// Create coordinator and register agents
const coordinator = new CoordinatorAgent({
  riskManagerVeto: true,
  minConfidence: 0.6,
});

coordinator.registerAgent(sniper);
coordinator.registerAgent(analyst);
coordinator.registerAgent(riskManager);
coordinator.registerAgent(strategy);
coordinator.registerAgent(executor);
```

### Processing Market Data

```typescript
const marketData: MarketData = {
  tokenData: {
    mint: 'TOKEN_MINT_ADDRESS',
    symbol: 'TOKEN',
    name: 'Token Name',
    price: 0.001,
    priceChange24h: 15.5,
    volume24h: 50000,
    liquidity: 100000,
    marketCap: 500000,
    holders: 500,
  },
  solPrice: 100,
  marketSentiment: 'BULLISH',
  volatility: 25,
  trend: 'UP',
};

// Process through coordinator
const decision = await coordinator.process(marketData);

console.log(`Decision: ${decision.decision}`);
console.log(`Confidence: ${decision.confidence}`);
console.log(`Reasoning: ${decision.reasoning}`);
```

### Running Agent Loop

```typescript
// Initialize all agents
await coordinator.initialize();

// Start continuous scanning
await coordinator.startAllAgents();

// Or run manually
setInterval(async () => {
  const marketData = await fetchMarketData();
  const decision = await coordinator.process(marketData);
  
  if (decision.action === Decision.BUY) {
    await executeTrade(decision);
  }
}, 5000);
```

---

## Monitoring Agents

### Agent Status

```typescript
const status = agent.getStatus();
console.log(status);
// {
//   type: 'SNIPER',
//   running: true,
//   lastRun: Date,
//   lastAction: 'opportunity_found',
//   decisionsCount: 150,
//   successRate: 67.5
// }
```

### Agent Logs

All agent decisions are logged to the `AgentLog` table:

```typescript
await prisma.agentLog.create({
  data: {
    agentType: 'COORDINATOR',
    action: 'decision_made',
    decision: 'BUY',
    confidence: 0.85,
    metadata: {
      tokenMint: '...',
      reasoning: 'Strong buy signal...',
    },
  },
});
```

---

## Best Practices

1. **Always use mock mode for testing**
   ```typescript
   const executor = new ExecutorAgent(connection, { mockMode: true });
   ```

2. **Configure risk limits conservatively**
   ```typescript
   const riskManager = new RiskManagerAgent({
     maxRiskScore: 50, // Start lower
     requireLiquidity: 10000,
   });
   ```

3. **Monitor agent performance**
   ```typescript
   const status = coordinator.getAgentStatus();
   console.log(status);
   ```

4. **Log all decisions for audit**
   ```typescript
   await db.logAgentAction(...);
   ```

5. **Implement circuit breakers**
   ```typescript
   if (lossesToday > maxDailyLoss) {
     coordinator.stopAllAgents();
   }
   ```
