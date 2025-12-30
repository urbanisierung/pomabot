# PomaBot Roadmap

> A phased approach to building a production-ready Polymarket trading bot

## Overview

This roadmap outlines the path from simulation mode to a fully automated trading system with real market execution, enhanced data sources, and operational notifications.

---

## Phase 1: Simulation & Validation 🧪

**Status:** ✅ Complete  
**Duration:** 1-2 weeks of observation

### Goals
- Validate trading strategy without risking capital
- Verify market selection and belief engine accuracy
- Monitor dashboard for trade opportunity quality

### Milestones

#### 1.1 Simulation Mode Running ✅
- [x] Core trading engine with 8-check eligibility gate
- [x] Belief engine with confidence/uncertainty calculations
- [x] State machine for market tracking
- [x] Simulation mode flag (no real orders)

#### 1.2 Live Market Data ✅
- [x] Polymarket API cursor-based pagination (fetch ALL markets)
- [x] Filter closed/expired/resolved markets
- [x] HTTP API server for dashboard

#### 1.3 Dashboard Observability ✅
- [x] Live dashboard fetching from API
- [x] Trade opportunities display
- [x] Position tracking (simulated)

### Action Items
- [x] Run simulation for several days
- [x] Monitor trade opportunity quality
- [ ] **Analyze simulation results** - Review which trades would have been profitable
- [ ] **Tune parameters** - Adjust confidence thresholds, edge requirements

---

## Phase 2: Slack Notifications 📢

**Status:** 🔄 In Progress  
**Duration:** 1 week
**Priority:** HIGH - Enables monitoring without constant dashboard checking

### Goals
- Real-time notifications for trading events
- P&L tracking and daily summaries
- Error/warning alerts for system issues

### Milestones

#### 2.1 Slack Webhook Integration
- [ ] Create Slack app and incoming webhook
- [ ] Add `SLACK_WEBHOOK_URL` environment variable
- [ ] Create notification service (`packages/core/src/notifications.ts`)

#### 2.2 Event Notifications
- [ ] Trade opportunity detected (new market passes 8-check gate)
- [ ] Trade executed (when live trading enabled)
- [ ] Position closed (exit conditions met)
- [ ] Error alerts (API failures, execution errors)

#### 2.3 Summary Reports
- [ ] Daily P&L summary
- [ ] Open positions status
- [ ] Market opportunities count

### Action Items

```typescript
// packages/core/src/notifications.ts - Planned structure
export interface SlackNotificationConfig {
  webhookUrl: string;
  channel?: string;
  enabledEvents: NotificationEvent[];
}

export type NotificationEvent = 
  | 'trade_opportunity'
  | 'trade_executed'
  | 'position_closed'
  | 'daily_summary'
  | 'error_alert';

export class SlackNotifier {
  async sendTradeOpportunity(market: Market, edge: number): Promise<void>;
  async sendTradeExecuted(order: Order): Promise<void>;
  async sendDailySummary(pnl: number, positions: Position[]): Promise<void>;
  async sendError(error: Error): Promise<void>;
}
```

#### Technical Requirements
- HTTP POST to Slack webhook URL
- Structured message blocks for rich formatting
- Rate limiting (1 message/second max)
- Error handling for failed notifications

---

## Phase 3: Real Trading Execution 💰

**Status:** 📋 Planned  
**Duration:** 2-3 weeks
**Priority:** HIGH - Core functionality

### Goals
- Execute real limit orders on Polymarket CLOB
- Proper wallet integration with signing
- Token allowances and balance management

### Milestones

#### 3.1 Wallet Integration
- [ ] Add private key configuration (secure env vars)
- [ ] Implement wallet signing with `ethers.js` or `viem`
- [ ] Polygon network (chain_id: 137) support

#### 3.2 Polymarket CLOB Authentication
Based on py-clob-client reference:

```typescript
// apps/api/src/connectors/polymarket.ts - Required changes
interface ClobClientConfig {
  host: string;                    // https://clob.polymarket.com
  privateKey: string;              // Wallet private key
  chainId: number;                 // 137 for Polygon
  signatureType: SignatureType;    // 0=EOA, 1=Magic, 2=Proxy
  funderAddress?: string;          // Optional for proxy wallets
}

// API key derivation
// - Derives API credentials from wallet signature
// - GET /auth/api-key with L1 signature
```

#### 3.3 Token Allowances
Required contract approvals for EOA wallets:

| Token | Contract Address | Purpose |
|-------|------------------|---------|
| USDC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | Collateral |
| CTF | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` | Conditional tokens |
| Exchange | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` | CLOB exchange |
| Neg Risk Exchange | `0xC5d563A36AE78145C45a50134d48A1215220f80a` | Neg risk adapter |

#### 3.4 Order Execution
- [ ] Implement `createOrder()` with proper signing
- [ ] POST to `/order` endpoint with signed order
- [ ] Order types: GTC (Good Till Cancel), GTD (Good Till Date)
- [ ] Order tracking and status updates

```typescript
// Limit order creation flow
interface OrderArgs {
  tokenId: string;      // Market token ID (YES or NO)
  price: number;        // 0.01 to 0.99
  size: number;         // Amount in USDC terms
  side: 'BUY' | 'SELL';
}

// 1. Create order: client.createOrder(orderArgs)
// 2. Sign with wallet
// 3. Submit: client.postOrder(signedOrder, OrderType.GTC)
```

#### 3.5 Safety Controls
- [ ] Maximum position size limits
- [ ] Daily loss limits
- [ ] Order confirmation delays
- [ ] Kill switch for emergency stop

### Action Items
- [ ] Install ethers.js or viem for wallet operations
- [ ] Create secure key management system
- [ ] Implement token approval flow
- [ ] Update `ExecutionLayer.executeTrade()` to submit real orders
- [ ] Add order status polling
- [ ] Implement position tracking from on-chain data

---

## Phase 4: Reddit Data Integration 📊

**Status:** 📋 Planned  
**Duration:** 2-3 weeks
**Priority:** MEDIUM - Enhances prediction accuracy

### Goals
- Monitor relevant subreddits for market sentiment
- Extract signals from post content and comments
- Adjust belief engine based on Reddit activity

### Milestones

#### 4.1 Reddit API Integration
```typescript
// packages/core/src/connectors/reddit.ts
interface RedditConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  username?: string;      // For authorized access
  password?: string;
}

// Key endpoints:
// - GET /r/{subreddit}/hot - Hot posts
// - GET /r/{subreddit}/new - New posts
// - GET /r/{subreddit}/search - Search within subreddit
// - GET /r/{subreddit}/comments/{article} - Post comments
```

#### 4.2 Relevant Subreddits to Monitor
| Market Category | Subreddits |
|-----------------|------------|
| Politics | r/politics, r/PoliticalDiscussion, r/Conservative, r/neoliberal |
| Crypto | r/CryptoCurrency, r/Bitcoin, r/ethereum |
| Finance | r/wallstreetbets, r/investing, r/stocks |
| Sports | r/sportsbook, r/nba, r/nfl |
| General | r/news, r/worldnews |

#### 4.3 Sentiment Analysis
- [ ] Keyword extraction from titles and content
- [ ] Basic sentiment scoring (positive/negative/neutral)
- [ ] Volume tracking (post frequency)
- [ ] Notable event detection

```typescript
interface RedditSignal {
  subreddit: string;
  keyword: string;
  sentiment: number;      // -1 to 1
  volume: number;         // Posts in last 24h
  momentum: number;       // Volume change rate
  topPosts: Array<{
    title: string;
    score: number;
    url: string;
  }>;
}
```

#### 4.4 Belief Engine Integration
- [ ] Weight Reddit signals in belief calculations
- [ ] Time decay for older signals
- [ ] Credibility scoring by subreddit
- [ ] Conflict resolution when signals disagree

### Action Items
- [ ] Create Reddit app credentials
- [ ] Implement rate-limited Reddit fetcher (respect 60 req/min)
- [ ] Build keyword-to-market mapping
- [ ] Add sentiment analysis (consider OpenAI API)
- [ ] Update belief engine to incorporate Reddit signals
- [ ] Test correlation with market movements

---

## Phase 5: Additional Data Sources 📰

**Status:** 📋 Planned  
**Duration:** 3-4 weeks
**Priority:** LOW - Future enhancement

### Goals
- Diverse data sources for better predictions
- Multi-source signal aggregation
- Reduced dependency on any single source

### Potential Sources

#### 5.1 News APIs
- [ ] NewsAPI.org for headlines
- [ ] Bing News Search
- [ ] Google News RSS

#### 5.2 Prediction Markets
- [ ] Metaculus (scientific forecasts)
- [ ] Manifold Markets (user predictions)
- [ ] Kalshi (regulated markets)

#### 5.3 Social Media
- [ ] Twitter/X API (if accessible)
- [ ] Telegram groups
- [ ] Discord sentiment

#### 5.4 Official Sources
- [ ] Government data feeds
- [ ] Sports APIs (for sports markets)
- [ ] Economic indicators (FRED API)

### Action Items
- [ ] Evaluate API costs and rate limits
- [ ] Design unified signal interface
- [ ] Implement source adapters
- [ ] Build aggregation layer
- [ ] A/B test prediction accuracy improvements

---

## Phase 6: Advanced Features 🚀

**Status:** 📋 Future
**Duration:** Ongoing

### Potential Enhancements

#### 6.1 Machine Learning
- [ ] Historical trade analysis
- [ ] Pattern recognition in price movements
- [ ] Optimal entry/exit timing

#### 6.2 Portfolio Management
- [ ] Risk-adjusted position sizing
- [ ] Correlation-based diversification
- [ ] Drawdown protection

#### 6.3 Market Making
- [ ] Two-sided quotes
- [ ] Spread capture strategies
- [ ] Inventory management

#### 6.4 Web Dashboard Enhancements
- [ ] Historical performance charts
- [ ] P&L tracking
- [ ] Trade journal
- [ ] Strategy backtesting

---

## Environment Configuration

### Current Variables
```bash
# Polymarket
POLYMARKET_API_KEY=<your-api-key>    # For data fetching

# Server
API_PORT=4000                         # HTTP API port
SIMULATION_MODE=true                  # Enable simulation
```

### Phase 2 Additions
```bash
# Slack
SLACK_WEBHOOK_URL=<webhook-url>
SLACK_CHANNEL=#trading-bot
```

### Phase 3 Additions
```bash
# Wallet (SECURE - use secrets manager)
WALLET_PRIVATE_KEY=<private-key>
POLYGON_RPC_URL=https://polygon-rpc.com

# Trading Limits
MAX_POSITION_SIZE=100                 # Max USDC per position
DAILY_LOSS_LIMIT=50                   # Max daily loss
```

### Phase 4 Additions
```bash
# Reddit
REDDIT_CLIENT_ID=<client-id>
REDDIT_CLIENT_SECRET=<client-secret>
REDDIT_USER_AGENT="pomabot/1.0"
```

---

## Risk Management Checklist

Before enabling live trading:

- [ ] Run simulation for at least 1 week
- [ ] Verify all 8 eligibility checks work correctly
- [ ] Test with minimal position sizes first
- [ ] Ensure Slack notifications work
- [ ] Set up daily loss limits
- [ ] Have kill switch ready
- [ ] Secure private key storage
- [ ] Monitor first trades manually
- [ ] Gradually increase position sizes

---

## Timeline Summary

| Phase | Feature | Duration | Status |
|-------|---------|----------|--------|
| 1 | Simulation & Validation | 1-2 weeks | ✅ Complete |
| 2 | Slack Notifications | 1 week | 🔄 Next |
| 3 | Real Trading Execution | 2-3 weeks | 📋 Planned |
| 4 | Reddit Data Integration | 2-3 weeks | 📋 Planned |
| 5 | Additional Data Sources | 3-4 weeks | 📋 Future |
| 6 | Advanced Features | Ongoing | 📋 Future |

---

## Contributing

When working on any phase:
1. Create feature branch
2. Implement with tests
3. Run `pnpm verify` before committing
4. Update this roadmap with progress
5. Document changes in `copilot.changes.md`

---

*Last updated: June 2025*
