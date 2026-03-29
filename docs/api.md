# API Documentation

## Base URL

```
Development: http://localhost:3001
Production: https://api.clawtrade.ai
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Getting a Token

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Using the Token

Include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints

### Authentication

#### POST /auth/register

Register a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "trader123"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `400` - Email already registered
- `400` - Username already taken
- `400` - Validation error

---

#### POST /auth/login

Login to existing account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401` - Invalid email or password

---

#### GET /auth/me

Get current authenticated user.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123",
    "createdAt": "2024-01-01T00:00:00Z",
    "wallets": [
      {
        "id": "uuid",
        "address": "SolanaAddress...",
        "balanceSOL": 1.5,
        "balanceUSDC": 100
      }
    ]
  }
}
```

---

### User

#### GET /user/profile

Get user profile and statistics.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "trader123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "wallets": [
      {
        "id": "uuid",
        "address": "SolanaAddress...",
        "balanceSOL": 1.5,
        "balanceUSDC": 100,
        "isActive": true
      }
    ],
    "_count": {
      "trades": 25,
      "transactions": 50
    }
  }
}
```

---

#### GET /user/stats

Get user trading statistics.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "stats": {
    "totalTrades": 25,
    "completedTrades": 23,
    "totalPnl": 150.50,
    "winRate": "65.22"
  }
}
```

---

### Wallet

#### GET /wallet/list

List all user wallets.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "wallets": [
    {
      "id": "uuid",
      "address": "SolanaAddress...",
      "balanceSOL": 1.5,
      "balanceUSDC": 100,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST /wallet/create

Create a new wallet.

**Headers**:
```
Authorization: Bearer <token>
```

**Request** (optional):
```json
{
  "secretKey": "base58-encoded-secret-key"
}
```

**Response** (201):
```json
{
  "wallet": {
    "id": "uuid",
    "address": "SolanaAddress...",
    "balanceSOL": 0,
    "balanceUSDC": 0,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### GET /wallet/:id

Get wallet details.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "wallet": {
    "id": "uuid",
    "address": "SolanaAddress...",
    "balanceSOL": 1.5,
    "balanceUSDC": 100,
    "isActive": true,
    "transactions": [
      {
        "id": "uuid",
        "type": "DEPOSIT",
        "amount": 1.0,
        "status": "CONFIRMED",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### POST /wallet/deposit

Record a deposit.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "walletId": "uuid",
  "amount": 1.0
}
```

**Response** (200):
```json
{
  "transaction": {
    "id": "uuid",
    "type": "DEPOSIT",
    "amount": 1.0,
    "status": "CONFIRMED"
  }
}
```

---

#### POST /wallet/withdraw

Process a withdrawal.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "walletId": "uuid",
  "amount": 0.5,
  "address": "DestinationSolanaAddress..."
}
```

**Response** (200):
```json
{
  "transaction": {
    "id": "uuid",
    "type": "WITHDRAWAL",
    "amount": 0.5,
    "status": "CONFIRMED",
    "toAddress": "DestinationSolanaAddress..."
  }
}
```

---

### Trading

#### GET /trading/quote

Get a quote for a token swap.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `inputMint` - Input token mint address
- `outputMint` - Output token mint address
- `amount` - Amount in smallest units
- `slippageBps` - Slippage in basis points (optional)

**Request**:
```
GET /trading/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50
```

**Response** (200):
```json
{
  "quote": {
    "inputMint": "So11111111111111111111111111111111111111112",
    "inputAmount": "1000000000",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "outputAmount": "99500000",
    "priceImpactPct": "0.005",
    "slippageBps": 50,
    "routePlan": [
      {
        "swapInfo": {
          "ammKey": "pool_address",
          "label": "Raydium",
          "inputMint": "So11111111111111111111111111111111111111112",
          "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          "inAmount": "1000000000",
          "outAmount": "99500000"
        },
        "percent": 100
      }
    ],
    "priceImpact": 0.5,
    "effectivePrice": 0.0995
  }
}
```

---

#### POST /trading/execute

Execute a trade.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "type": "BUY",
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": 1.0,
  "walletId": "uuid",
  "slippageBps": 50
}
```

**Response** (200):
```json
{
  "trade": {
    "id": "uuid",
    "type": "BUY",
    "inputAmount": 1.0,
    "outputAmount": 99.5,
    "status": "COMPLETED",
    "mock": true
  }
}
```

---

#### GET /trading/history

Get trading history.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` - Number of trades to return (default: 50)
- `status` - Filter by status (optional)

**Request**:
```
GET /trading/history?limit=20&status=COMPLETED
```

**Response** (200):
```json
{
  "trades": [
    {
      "id": "uuid",
      "userId": "uuid",
      "walletId": "uuid",
      "type": "BUY",
      "inputMint": "So11111111111111111111111111111111111111112",
      "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "inputAmount": "1000000000",
      "outputAmount": "99500000",
      "price": 0.0995,
      "slippageBps": 50,
      "signature": "tx_signature",
      "status": "COMPLETED",
      "pnl": 5.25,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "wallet": {
        "address": "SolanaAddress..."
      }
    }
  ]
}
```

---

#### GET /trading/:id

Get trade details.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "trade": {
    "id": "uuid",
    "type": "BUY",
    "inputMint": "...",
    "outputMint": "...",
    "inputAmount": "1000000000",
    "outputAmount": "99500000",
    "price": 0.0995,
    "status": "COMPLETED",
    "signature": "tx_signature",
    "pnl": 5.25,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### GET /trading/prices

Get token prices.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `tokens` - Comma-separated list of token mints

**Request**:
```
GET /trading/prices?tokens=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**Response** (200):
```json
{
  "prices": {
    "So11111111111111111111111111111111111111112": {
      "id": "So11111111111111111111111111111111111111112",
      "mintSymbol": "SOL",
      "vsToken": "USDC",
      "vsTokenSymbol": "USDC",
      "price": 100.50
    },
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
      "id": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintSymbol": "USDC",
      "vsToken": "USDC",
      "vsTokenSymbol": "USDC",
      "price": 1.0
    }
  }
}
```

---

### Portfolio

#### GET /portfolio

Get user portfolio.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "portfolio": [
    {
      "id": "uuid",
      "userId": "uuid",
      "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "tokenSymbol": "USDC",
      "tokenName": "USD Coin",
      "balance": 100.5,
      "averagePrice": 1.0,
      "currentValue": 100.5,
      "pnl": 0.5,
      "pnlPercent": 0.5,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "summary": {
    "totalValue": 100.5,
    "totalPnl": 0.5,
    "totalPnlPercent": "0.50",
    "positions": 1
  }
}
```

---

#### GET /portfolio/:mint

Get specific token position.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "position": {
    "id": "uuid",
    "tokenMint": "...",
    "tokenSymbol": "USDC",
    "tokenName": "USD Coin",
    "balance": 100.5,
    "averagePrice": 1.0,
    "currentValue": 100.5,
    "pnl": 0.5,
    "pnlPercent": 0.5,
    "currentPrice": 1.0
  }
}
```

---

#### POST /portfolio/sync

Sync portfolio with current prices.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "portfolio": [...],
  "summary": {
    "totalValue": 100.5,
    "totalPnl": 0.5,
    "totalPnlPercent": "0.50",
    "positions": 1
  }
}
```

---

#### GET /portfolio/performance

Get portfolio performance metrics.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "performance": {
    "totalTrades": 25,
    "winningTrades": 15,
    "losingTrades": 10,
    "winRate": "60.00",
    "totalPnl": 150.50,
    "averagePnl": 6.02,
    "bestTrade": {
      "pnl": 50.0,
      "type": "BUY",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "worstTrade": {
      "pnl": -20.0,
      "type": "BUY",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## WebSocket API

Connect to the WebSocket server for real-time updates.

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Authenticate
socket.emit('auth', 'your-jwt-token');

// Subscribe to channels
socket.emit('subscribe', 'trades');
socket.emit('subscribe', 'portfolio');

// Listen for events
socket.on('trade:completed', (data) => {
  console.log('Trade completed:', data);
});

socket.on('portfolio:update', (data) => {
  console.log('Portfolio updated:', data);
});

socket.on('agent:decision', (data) => {
  console.log('Agent decision:', data);
});
```

### WebSocket Events

**Client → Server**:
- `auth` - Authenticate with JWT token
- `subscribe` - Subscribe to channel
- `unsubscribe` - Unsubscribe from channel

**Server → Client**:
- `connected` - Connection established
- `authenticated` - Authentication successful
- `error` - Error occurred
- `trade:pending` - Trade initiated
- `trade:completed` - Trade completed
- `trade:failed` - Trade failed
- `agent:decision` - Agent made decision
- `portfolio:update` - Portfolio updated
- `balance:update` - Balance updated
- `price:update` - Price updated

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "details": [] // Optional validation errors
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Validation Errors

```json
{
  "error": "Validation Error",
  "details": [
    {
      "code": "invalid_type",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

---

## Rate Limiting

API requests are rate limited:

- **Default**: 100 requests per minute
- **WebSocket**: 50 connections per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Health Check

```bash
GET /health
```

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```
