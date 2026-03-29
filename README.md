# 🦾 ClawTrade AI

> **Autonomous Intelligence for On-Chain Trading**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-purple.svg)](https://solana.com/)
[![Website](https://img.shields.io/badge/Website-clawtradeai.xyz-blue.svg)](https://clawtradeai.xyz)
[![X (Twitter)](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fx.com%2FClawtradeAISol)](https://x.com/ClawtradeAISol)

ClawTrade AI is an open-source autonomous trading platform built on Solana using a multi-agent AI architecture. It scans, analyzes, and executes trades in real-time through a coordinated system of specialized AI agents.

## ✨ Features

- **Multi-Agent System**: Six specialized AI agents working together
  - 🎯 **Sniper Agent**: Scans for new token launches and liquidity pools
  - 📊 **Analyst Agent**: Technical, fundamental, and sentiment analysis
  - 🛡️ **Risk Manager**: Evaluates liquidity, contract safety, and concentration risks
  - 🧠 **Strategy Agent**: Determines position sizing and risk management
  - ⚡ **Executor Agent**: Executes trades via Jupiter with optimal routing
  - 🤖 **Coordinator**: Combines all agent outputs for final decisions

- **Real-Time Trading**: Continuous market monitoring and instant execution
- **Risk Management**: Built-in safety checks and configurable risk limits
- **Jupiter Integration**: Best price routing across Solana DEXes
- **WebSocket Updates**: Live portfolio and trade updates
- **Mock Trading Mode**: Test strategies without real funds

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  Dashboard | Portfolio | Trades | Settings                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API (Fastify)                          │
│  Auth | Wallet | Trading | Portfolio | Agent Control        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │    Redis     │ │   Solana RPC     │
│   (Database)     │ │  (Queue)     │ │   (Blockchain)   │
└──────────────────┘ └──────────────┘ └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Worker (BullMQ)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Coordinator Agent                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │ Sniper  │ │Analyst  │ │  Risk   │ │Strategy │    │   │
│  │  │ Agent   │ │ Agent   │ │ Manager │ │ Agent   │    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  │                      ┌─────────┐                     │   │
│  │                      │Executor │                     │   │
│  │                      │ Agent   │                     │   │
│  │                      └─────────┘                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Jupiter Aggregator                        │
│  Best price routing across Solana DEXes                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (optional, for infrastructure)
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/clawtrade/clawtrade-ai.git
cd clawtrade-ai

# Run setup script
# On Linux/Mac:
./infra/scripts/setup.sh

# On Windows:
.\infra\scripts\setup.bat

# Or manually:
npm install
npm run db:generate --workspace=@clawtrade/database
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

```env
# Database
DATABASE_URL=postgresql://clawtrade:clawtrade@localhost:5432/clawtrade_ai

# Redis
REDIS_URL=redis://localhost:6379

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Security (CHANGE THESE IN PRODUCTION!)
WALLET_ENCRYPTION_KEY=your-32-character-key
JWT_SECRET=your-super-secret-key

# Trading
TRADING_ENABLED=false
MOCK_TRADING=true
```

### Running

```bash
# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate --workspace=@clawtrade/database

# Seed database
npm run db:seed --workspace=@clawtrade/database

# Start development servers
npm run dev
```

Access the application at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Health: http://localhost:3001/health

## 📁 Project Structure

```
clawtrade-ai/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Fastify backend
├── packages/
│   ├── agents/              # Multi-agent system
│   ├── blockchain/          # Solana utilities
│   ├── config/              # Shared configuration
│   ├── database/            # Prisma schema & client
│   ├── trading/             # Jupiter integration
│   └── ui/                  # Shared UI components
├── infra/
│   ├── docker/              # Dockerfiles
│   ├── nginx/               # Nginx config
│   └── scripts/             # Setup scripts
├── docs/                    # Documentation
└── docker-compose.yml       # Docker orchestration
```

## 🤖 Agent System

### Agent Flow

1. **Scan**: SniperAgent monitors for new tokens/pools
2. **Analyze**: AnalystAgent performs technical/fundamental analysis
3. **Risk Check**: RiskManagerAgent evaluates safety
4. **Strategy**: StrategyAgent determines position sizing
5. **Coordinate**: CoordinatorAgent combines all inputs
6. **Execute**: ExecutorAgent performs the trade

### Agent Configuration

```typescript
// Example: Configure agent behavior
{
  sniper: {
    minLiquidity: 10000,
    maxMarketCap: 1000000,
  },
  riskManager: {
    maxRiskScore: 70,
    requireLiquidity: 5000,
  },
  strategy: {
    maxPositionSize: 1, // SOL
    takeProfitPercent: 20,
    stopLossPercent: 10,
  }
}
```

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Wallet
- `GET /wallet/list` - List wallets
- `POST /wallet/create` - Create wallet
- `POST /wallet/deposit` - Record deposit
- `POST /wallet/withdraw` - Process withdrawal

### Trading
- `GET /trading/quote` - Get swap quote
- `POST /trading/execute` - Execute trade
- `GET /trading/history` - Trade history
- `GET /trading/prices` - Token prices

### Portfolio
- `GET /portfolio` - Get portfolio
- `POST /portfolio/sync` - Sync prices
- `GET /portfolio/performance` - Performance metrics

## 🔒 Security

- **Private Key Encryption**: AES-256 encryption for wallet keys
- **Rate Limiting**: Configurable API rate limits
- **Transaction Simulation**: Pre-execution validation
- **Input Validation**: Zod schemas for all inputs
- **JWT Authentication**: Secure session management

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific package tests
npm test --workspace=@clawtrade/agents
```

## 📖 Documentation

- [Architecture](docs/architecture.md) - System design and data flow
- [Agents](docs/agents.md) - Detailed agent documentation
- [API](docs/api.md) - API reference and examples

## 🛠️ Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Zustand (state management)
- TanStack Query

**Backend**
- Node.js 20
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- Redis (BullMQ)
- Socket.io

**Blockchain**
- Solana Web3.js
- Jupiter Aggregator
- SPL Token

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**This software is for educational purposes only.**

Trading cryptocurrencies involves substantial risk of loss. This software is provided "as is" without warranty of any kind. Past performance does not guarantee future results.

- Do not trade with funds you cannot afford to lose
- Always do your own research
- The developers are not responsible for any financial losses
- Test thoroughly in mock mode before using real funds

## 🙏 Acknowledgments

- [Solana](https://solana.com/) - High-performance blockchain
- [Jupiter](https://jup.ag/) - Best DEX aggregator on Solana
- [OpenClaw AI](https://github.com/openclaw) - AI Agent Framework inspiration

## 📬 Contact

- Website: [clawtradeai.xyz](https://clawtradeai.xyz)
- X (Twitter): [@ClawtradeAISol](https://x.com/ClawtradeAISol)
- GitHub: [@clawtrade](https://github.com/clawtrade)
- Discord: [Join our server](https://discord.gg/clawtrade)

---

Built with ❤️ by the ClawTrade AI Team
