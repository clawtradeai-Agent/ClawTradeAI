# Architecture Documentation

## System Overview

ClawTrade AI is built on a modular, microservices-inspired architecture that separates concerns across multiple layers while maintaining tight integration through well-defined interfaces.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Web UI    │  │  Mobile App │  │   CLI       │              │
│  │  (Next.js)  │  │  (Future)   │  │  (Future)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Fastify Server (Node.js)                               │    │
│  │  - Authentication & Authorization                       │    │
│  │  - Rate Limiting                                        │    │
│  │  - Request Validation                                   │    │
│  │  - WebSocket Server                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Service Layer   │ │  Data Layer  │ │  Message Queue   │
│  - Auth Service  │ │  - Prisma    │ │  - BullMQ        │
│  - Wallet Svc    │ │  - PostgreSQL│ │  - Redis         │
│  - Trading Svc   │ │              │ │                  │
│  - Portfolio Svc │ │              │ │                  │
└──────────────────┘ └──────────────┘ └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT WORKER LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Job Queue Processor                        │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Coordinator Agent                     │   │    │
│  │  │                                                 │   │    │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  │   │    │
│  │  │  │  Sniper   │→ │  Analyst  │→ │   Risk    │  │   │    │
│  │  │  │  Agent    │  │  Agent    │  │  Manager  │  │   │    │
│  │  │  └───────────┘  └───────────┘  └───────────┘  │   │    │
│  │  │         ↓              ↓              ↓        │   │    │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  │   │    │
│  │  │  │ Strategy  │← │Coordinator│← │ Executor  │  │   │    │
│  │  │  │  Agent    │  │  Decision │  │  Agent    │  │   │    │
│  │  │  └───────────┘  └───────────┘  └───────────┘  │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Solana RPC │  │  Jupiter API│  │  Price APIs │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js)

**Location**: `apps/web/`

The frontend is built with Next.js 14 using the App Router architecture.

**Key Features**:
- Server-side rendering for SEO and performance
- Client-side interactivity with React hooks
- Real-time updates via WebSocket
- Responsive design with TailwindCSS

**State Management**:
- Zustand for global state (auth, settings)
- TanStack Query for server state caching
- Local storage for persistence

### 2. Backend API (Fastify)

**Location**: `apps/api/`

The API layer handles all HTTP requests and WebSocket connections.

**Architecture**:
```
Request → Middleware → Route Handler → Service → Database
                ↓
           Response
```

**Middleware Stack**:
1. CORS handling
2. Rate limiting
3. JWT authentication
4. Request validation (Zod)
5. Error handling

### 3. Database Layer

**Location**: `packages/database/`

**Schema Design**:
```
User (1) ──────< Wallet (N)
  │                │
  │                │
  │                ▼
  │            Transaction (N)
  │
  │
  └──────────> Trade (N)
  │
  │
  └──────────> Portfolio (N)
  │
  │
  └──────────> AgentLog (N)
```

**Key Tables**:
- `User`: Authentication and profile
- `Wallet`: Solana wallet storage (encrypted)
- `Transaction`: Deposit/withdrawal history
- `Trade`: Trading history and P&L
- `Portfolio`: Token holdings
- `AgentLog`: Agent decision audit trail

### 4. Agent System

**Location**: `packages/agents/`

The multi-agent system is the core intelligence of ClawTrade AI.

**Agent Communication Flow**:
```
┌──────────────┐
│ Market Data  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  Sniper      │────→│  Analyst     │
│  Agent       │     │  Agent       │
└──────────────┘     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Risk        │
                     │  Manager     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Strategy    │
                     │  Agent       │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Coordinator │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Executor    │
                     │  Agent       │
                     └──────────────┘
```

### 5. Message Queue (BullMQ)

**Purpose**: Decouple agent processing from API requests

**Queue Structure**:
```
agent-jobs
├── SCAN jobs (priority: high)
├── ANALYZE jobs (priority: medium)
└── EXECUTE jobs (priority: critical)
```

**Worker Configuration**:
- Concurrency: 5 jobs
- Retry attempts: 3
- Backoff: exponential

## Data Flow

### Trade Execution Flow

1. **Discovery**
   ```
   SniperAgent scans → New token detected → Job created
   ```

2. **Analysis**
   ```
   AnalystAgent receives job → Fetches market data → 
   Performs analysis → Returns signal
   ```

3. **Risk Assessment**
   ```
   RiskManagerAgent evaluates → Checks risk factors → 
   Returns approval/rejection
   ```

4. **Strategy**
   ```
   StrategyAgent calculates → Position size → 
   Take profit/stop loss levels
   ```

5. **Coordination**
   ```
   CoordinatorAgent collects all inputs → 
   Weighs decisions → Makes final call
   ```

6. **Execution**
   ```
   ExecutorAgent receives decision → 
   Gets quote from Jupiter → Signs transaction → 
   Broadcasts to Solana
   ```

7. **Confirmation**
   ```
   Transaction confirmed → Database updated → 
   WebSocket notification sent
   ```

## Security Architecture

### Key Management

```
┌─────────────────────────────────────────┐
│          Private Key Storage            │
│                                         │
│  User Input → AES-256 Encrypt → Store  │
│                                         │
│  Retrieve → Decrypt → Use → Clear      │
└─────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│  Login  │─────→│  JWT    │─────→│  API    │
│ Request │      │  Sign   │      │  Access │
└─────────┘      └─────────┘      └─────────┘
```

### Rate Limiting

```
┌─────────────────────────────────────────┐
│           Rate Limiter                  │
│                                         │
│  Request → Check Window → Allow/Deny   │
│                                         │
│  Window: 60s, Max: 100 requests        │
└─────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

- **API Layer**: Stateless, can be load balanced
- **Worker Layer**: Multiple workers can process jobs
- **Database**: Read replicas for queries
- **Redis**: Cluster mode for high availability

### Performance Optimizations

1. **Caching**
   - Token prices: 30 seconds
   - Portfolio values: 1 minute
   - Agent decisions: 5 seconds

2. **Database**
   - Indexed queries on user_id, created_at
   - Connection pooling
   - Query optimization

3. **Agent Processing**
   - Parallel agent execution
   - Result caching
   - Early termination on veto

## Monitoring & Observability

### Logging

```typescript
{
  level: 'info',
  format: 'json',
  fields: ['timestamp', 'level', 'message', 'context']
}
```

### Metrics

- API response times
- Agent decision latency
- Trade execution success rate
- Queue depth and processing time

### Alerts

- High error rates
- Queue backlog
- Agent failures
- Database connection issues

## Deployment Architecture

### Development

```
Local Machine
├── PostgreSQL (Docker)
├── Redis (Docker)
├── API (npm run dev)
└── Web (npm run dev)
```

### Production

```
Load Balancer
    │
    ▼
┌───────────────────┐
│   API Servers     │ (Multiple instances)
└───────────────────┘
    │
    ▼
┌───────────────────┐
│   Worker Nodes    │ (Multiple instances)
└───────────────────┘
    │
    ▼
┌───────────────────┐
│   Database        │ (Primary + Replicas)
│   Redis Cluster   │
└───────────────────┘
```

## Future Enhancements

1. **Machine Learning**
   - Pattern recognition for entry/exit
   - Sentiment analysis from social media
   - Predictive price modeling

2. **Additional Chains**
   - Ethereum integration
   - Layer 2 support
   - Cross-chain arbitrage

3. **Advanced Features**
   - Copy trading
   - Strategy marketplace
   - Social trading features
