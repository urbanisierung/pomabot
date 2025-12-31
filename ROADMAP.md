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

**Status:** ✅ Complete  
**Duration:** 1 week
**Priority:** HIGH - Enables monitoring without constant dashboard checking

### Goals
- Real-time notifications for trading events
- P&L tracking and daily summaries
- Error/warning alerts for system issues

### Milestones

#### 2.1 Slack Webhook Integration
- [x] Create Slack app and incoming webhook (user setup required)
- [x] Add `SLACK_WEBHOOK_URL` environment variable support
- [x] Create notification service (`packages/core/src/notifications.ts`)

#### 2.2 Event Notifications
- [x] Trade opportunity detected (new market passes 8-check gate)
- [x] Trade executed (when live trading enabled)
- [x] Position closed (exit conditions met)
- [x] Error alerts (API failures, execution errors)
- [x] System start/halt notifications

#### 2.3 Summary Reports
- [x] Daily P&L summary (scheduled at midnight UTC)
- [x] Open positions status
- [x] Market opportunities count

### Implementation Details

**File:** `packages/core/src/notifications.ts`

```typescript
// SlackNotifier class with methods:
// - sendTradeOpportunity(opportunity) - Trade opportunity with edge, belief, rationale
// - sendTradeExecuted(order, market) - Order execution details
// - sendPositionClosed(order, market, pnl, reason) - Position close with P&L
// - sendDailySummary(summary) - Daily stats at midnight UTC
// - sendSystemStart(marketsCount, mode) - Bot startup notification
// - sendSystemHalt(reason) - System halt alert
// - sendError(error, context) - Error with stack trace
```

**Features:**
- Rate limiting (10 messages/minute default)
- Event-based filtering (enable/disable specific notifications)
- Rich Slack Block Kit formatting
- Singleton pattern for easy access

### Usage

```bash
# Set your Slack webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Run the bot - notifications will be sent automatically
SIMULATION_DATA=true POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev
```

---

## Phase 3: Fly.io Deployment & Audit Logging 🚀

**Status:** ✅ Complete  
**Duration:** 1-2 weeks
**Priority:** HIGH - Required for production deployment

### Goals
- Deploy entire application to Fly.io on a single small machine
- Minimize resource usage for cost-effective hosting (~$2-5/month)
- Implement persistent audit logging with Git-based storage
- Integrate with external logging service for observability

### Fly.io Research Summary

**Machine Sizing:**
| Preset | vCPU | RAM | Monthly Cost |
|--------|------|-----|--------------|
| shared-cpu-1x | 1 shared | 256MB | ~$1.94 |
| shared-cpu-1x | 1 shared | 512MB | ~$3.19 |
| shared-cpu-1x | 1 shared | 1GB | ~$5.70 |

**Recommendation:** Use `shared-cpu-1x` with 256-512MB RAM for PomaBot (bot + dashboard)

### Milestones

#### 3.1 Fly.io Setup
- [x] Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [x] Create Fly account and authenticate: `fly auth login`
- [x] Create app: `fly launch` (generates fly.toml)
- [x] Configure single machine deployment

#### 3.2 Dockerfile Configuration
- [x] Created optimized multi-stage Dockerfile for minimal image size

#### 3.3 fly.toml Configuration
- [x] Created fly.toml with shared-cpu-1x (256MB RAM) configuration
- [x] Auto-stop/start machines for cost savings
- [x] HTTPS and health checks configured

#### 3.4 Resource Optimization Tips
- [x] Auto-stop/start configuration
- [x] Single process deployment
- [x] Minimal memory configuration
- [x] Graceful shutdown handling

#### 3.5 Audit Logging System
- [x] Implemented persistent CSV audit logs
- [x] Git-based persistence support
- [x] Event types: SYSTEM_START, SYSTEM_STOP, MARKET_EVALUATED, TRADE_OPPORTUNITY, etc.
- [x] CSV format with all trade details
- [x] Integrated into TradingService

#### 3.6 External Logging Services
- [x] Logtail (Better Stack) integration
- [x] Optional HTTP endpoint for log shipping
- [x] Structured JSON logs
- [x] Free tier support (1GB/month)

### Deployment Guide

See **DEPLOYMENT.md** for complete step-by-step deployment instructions.

### Action Items
- [x] Create Fly.io account (user action required)
- [x] Install Fly CLI locally (user action required)
- [x] Create Dockerfile with multi-stage build
- [x] Create fly.toml configuration
- [x] Implement audit-log.ts for CSV logging
- [x] Set up Git-based log persistence
- [x] Integrate audit logging into TradingService
- [x] Add Logtail integration (optional)
- [x] Deploy and test (user action required)
- [x] Document deployment process (see DEPLOYMENT.md)

---

## Phase 4: Real Trading Execution 💰

**Status:** ✅ Complete  
**Duration:** 2-3 weeks
**Priority:** HIGH - Core functionality

### Goals
- Execute real limit orders on Polymarket CLOB
- Proper wallet integration with signing
- Token allowances and balance management

### Milestones

#### 4.1 Wallet Integration
- [x] Add private key configuration (secure env vars)
- [x] Implement wallet signing with `ethers.js`
- [x] Polygon network (chain_id: 137) support

#### 4.2 Polymarket CLOB Authentication
Based on py-clob-client reference:

```typescript
// apps/api/src/connectors/polymarket.ts - Implemented
interface ClobClientConfig {
  host: string;                    // https://clob.polymarket.com
  privateKey: string;              // Wallet private key
  chainId: number;                 // 137 for Polygon
  signatureType: SignatureType;    // 0=EOA, 1=Magic, 2=Proxy
  funderAddress?: string;          // Optional for proxy wallets
}

// API key derivation - ✅ Implemented
// - Derives API credentials from wallet signature
// - GET /auth/nonce with address
// - POST /auth/api-key with L1 signature
```

- [x] Implement CLOB authentication flow
- [x] API key derivation from wallet signature
- [x] Support for EOA (Externally Owned Account) wallets

#### 4.3 Token Allowances
Required contract approvals for EOA wallets:

| Token | Contract Address | Purpose |
|-------|------------------|---------|
| USDC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | Collateral |
| CTF | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` | Conditional tokens |
| Exchange | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` | CLOB exchange |
| Neg Risk Exchange | `0xC5d563A36AE78145C45a50134d48A1215220f80a` | Neg risk adapter |

**Note:** Token allowance management must be handled externally (e.g., via Polymarket web interface or separate script) before live trading.

#### 4.4 Order Execution
- [x] Implement `placeOrder()` with proper signing
- [x] POST to `/order` endpoint with signed order (EIP-712)
- [x] Order types: GTC (Good Till Cancel), GTD (Good Till Date)
- [x] Order tracking and status updates
- [x] Order cancellation support

```typescript
// Limit order creation flow - ✅ Implemented
interface OrderArgs {
  tokenId: string;      // Market token ID (YES or NO)
  price: number;        // 0.01 to 0.99
  size: number;         // Amount in USDC terms
  side: 'BUY' | 'SELL';
}

// 1. Create order: client.createOrder(orderArgs)
// 2. Sign with wallet using EIP-712
// 3. Submit: client.postOrder(signedOrder, OrderType.GTC)
```

#### 4.5 Safety Controls
- [x] Maximum position size limits
- [x] Daily loss limits
- [x] Maximum open positions limit
- [x] Kill switch for emergency stop
- [x] Position tracking with P&L monitoring
- [x] Safety checks before trade execution

### Implementation Details

**Files Created:**
- `apps/api/src/connectors/wallet.ts` - Wallet management and signing operations
- `packages/core/src/safety-controls.ts` - Safety limits and position tracking

**Files Modified:**
- `apps/api/src/connectors/polymarket.ts` - CLOB authentication and order execution
- `packages/core/src/execution.ts` - Real order execution support
- `apps/api/src/services/trading.ts` - Integrated wallet, execution, and safety controls
- `packages/core/src/index.ts` - Export safety controls module

### Action Items
- [x] Install ethers.js for wallet operations
- [x] Create secure key management system
- [x] Implement CLOB authentication flow
- [x] Update `ExecutionLayer.executeTrade()` to submit real orders
- [x] Add order status polling support
- [x] Implement position tracking from order data
- [x] Add safety controls module
- [x] Integrate safety checks into trade execution flow
- [ ] **User action required:** Set up token allowances via Polymarket interface
- [ ] **User action required:** Configure wallet private key in environment
- [ ] **User action required:** Test with small position sizes first

### Environment Configuration

```bash
# Wallet (SECURE - use secrets manager)
WALLET_PRIVATE_KEY=<private-key>
POLYGON_RPC_URL=https://polygon-rpc.com  # Optional
CHAIN_ID=137                              # Polygon mainnet

# Trading Limits
MAX_POSITION_SIZE=100                     # Max USDC per position
DAILY_LOSS_LIMIT=50                       # Max daily loss
MAX_OPEN_POSITIONS=5                      # Max concurrent positions
```

### Testing Checklist

Before enabling live trading with real funds:

- [ ] Test wallet connection and signing
- [ ] Verify CLOB authentication works
- [ ] Confirm token allowances are set
- [ ] Test with minimal position sizes (e.g., $1)
- [ ] Monitor order status updates
- [ ] Verify safety controls activate correctly
- [ ] Test kill switch functionality
- [ ] Monitor Slack notifications
- [ ] Gradually increase position sizes

---

## Phase 5: Reddit Data Integration 📊

**Status:** ✅ Complete  
**Duration:** 2-3 weeks
**Priority:** MEDIUM - Enhances prediction accuracy

### Goals
- Monitor relevant subreddits for market sentiment
- Extract signals from post content and comments
- Adjust belief engine based on Reddit activity

### Milestones

#### 5.1 Reddit API Integration ✅
```typescript
// apps/api/src/connectors/reddit.ts - Implemented
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

- [x] Create Reddit app credentials support
- [x] Implement rate-limited Reddit fetcher (60 req/min)
- [x] Build keyword-to-market mapping
- [x] OAuth2 authentication flow

#### 5.2 Relevant Subreddits to Monitor ✅
| Market Category | Subreddits |
|-----------------|------------|
| Politics | r/politics, r/PoliticalDiscussion, r/Conservative, r/neoliberal |
| Crypto | r/CryptoCurrency, r/Bitcoin, r/ethereum |
| Finance | r/wallstreetbets, r/investing, r/stocks |
| Sports | r/sportsbook, r/nba, r/nfl |
| General | r/news, r/worldnews |

#### 5.3 Sentiment Analysis ✅
- [x] Keyword extraction from titles and content
- [x] Basic sentiment scoring (positive/negative/neutral)
- [x] Volume tracking (post frequency)
- [x] Notable event detection

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

#### 5.4 Belief Engine Integration ✅
- [x] Weight Reddit signals in belief calculations
- [x] Time decay for older signals
- [x] Credibility scoring by subreddit
- [x] Convert Reddit signals to belief engine Signal types
- [x] Integrate with TradingService

### Implementation Details

**Files Created:**
- `apps/api/src/connectors/reddit.ts` - Reddit API connector with OAuth2 authentication
- `packages/core/src/reddit.test.ts` - Comprehensive test suite for Reddit integration

**Files Modified:**
- `apps/api/src/services/trading.ts` - Integrated Reddit connector into trading service

**Features:**
- OAuth2 authentication with Reddit API
- Rate limiting (60 requests/minute)
- Subreddit-specific credibility scoring
- Sentiment analysis from post titles and content
- Volume and momentum tracking
- Conversion to belief engine Signal types (quantitative/interpretive/speculative)
- Time-weighted scoring based on recency and score

### Environment Configuration

```bash
# Reddit (optional - enables Reddit integration)
REDDIT_CLIENT_ID=<client-id>
REDDIT_CLIENT_SECRET=<client-secret>
REDDIT_USER_AGENT="pomabot/1.0"
REDDIT_USERNAME=<username>      # Optional: for user-authenticated access
REDDIT_PASSWORD=<password>      # Optional: for user-authenticated access
```

### Usage

1. **Create Reddit App**: Visit https://www.reddit.com/prefs/apps to create a script app
2. **Set environment variables** with your credentials
3. **Run the bot** - Reddit signals will be automatically integrated

```bash
# With Reddit integration
REDDIT_CLIENT_ID=abc123 REDDIT_CLIENT_SECRET=xyz789 pnpm --filter @pomabot/api dev

# Reddit integration will be enabled automatically if credentials are provided
```

### Action Items
- [x] Create Reddit app credentials support
- [x] Implement rate-limited Reddit fetcher (respect 60 req/min)
- [x] Build keyword-to-market mapping
- [x] Add sentiment analysis
- [x] Update belief engine to incorporate Reddit signals
- [x] Test correlation with market movements
- [x] Create comprehensive test suite
- [x] Integrate into TradingService
- [x] Document environment variables

---

## Phase 6: Additional Data Sources 📰

**Status:** ✅ Complete  
**Duration:** 1 week
**Priority:** MEDIUM - Enhances prediction accuracy

### Goals
- Diverse data sources for better predictions
- Multi-source signal aggregation
- Reduced dependency on any single source

### Implementation Summary

Phase 6 implements comprehensive news integration through RSS feeds, providing the belief engine with real-time news signals from authoritative sources across multiple market categories.

### Milestones

#### 6.1 News RSS Feed Integration ✅
- [x] RSS feed parsing using `rss-parser` library
- [x] Organized feeds by market category
- [x] Rate limiting (5-minute minimum between fetches per source)
- [x] News deduplication by title similarity
- [x] Fallback to simulation data for testing

**RSS Sources by Category:**

| Market Category | Sources |
|-----------------|---------|
| Politics | SEC press releases, Associated Press |
| Crypto | SEC, CoinTelegraph, CoinDesk |
| Sports | ESPN, BBC Sport |
| Economics | Federal Reserve, Reuters Business, MarketWatch |
| Entertainment | Variety, Hollywood Reporter, Deadline |
| Technology | TechCrunch, The Verge, Ars Technica |
| World | Reuters World, UN, BBC World, Al Jazeera |
| Weather | NOAA |

#### 6.2 Signal Generation from News ✅
- [x] Relevance scoring based on keyword matching
- [x] Signal type classification (authoritative, procedural, quantitative, interpretive, speculative)
- [x] Sentiment analysis (positive/negative/neutral direction)
- [x] Strength calculation (1-5 scale) based on source credibility

```typescript
// News signal generation flow
const allNews = await newsAggregator.fetchNews(category);
const signals = await newsAggregator.generateSignals(allNews, marketKeywords);

// Signals are automatically integrated by TradingService
// No additional configuration required
```

#### 6.3 Integration with TradingService ✅
- [x] Automatic news fetching during market evaluation
- [x] News signals combined with Reddit signals
- [x] Unified signal processing through belief engine
- [x] No configuration required - works out of the box

### Features

**Intelligent Signal Classification:**
- **Authoritative** (±20%): Official statements, SEC rulings
- **Procedural** (±15%): Filing submissions, deadlines
- **Quantitative** (±10%): Data, statistics, polls
- **Interpretive** (±7%): Expert analysis, predictions
- **Speculative** (±3%): Rumors, unconfirmed reports

**Smart Relevance Scoring:**
- Title matches: +0.3 relevance
- Content matches: +0.15 relevance
- Minimum threshold: 0.3 to generate signal

**Automatic Deduplication:**
- Prevents duplicate signals from similar headlines
- Normalizes titles for comparison

### Testing

Test script validates all functionality:

```bash
# Run news integration test
npx tsx apps/api/src/test-news.ts
```

Tests cover:
1. RSS feed fetching from multiple sources
2. Category-specific news filtering
3. Signal generation with keyword matching
4. Simulation data fallback

### Future Enhancements

The following data sources are planned for future phases:

#### Potential Sources (Phase 7+)
- [ ] NewsAPI.org for broader headline coverage
- [ ] Prediction Markets (Metaculus, Manifold Markets, Kalshi)
- [ ] Social Media (Twitter/X API, Telegram groups)
- [ ] Official Government APIs (economic indicators, sports stats)
- [ ] Weather APIs (NOAA, AccuWeather)

### Action Items
- [x] Design RSS feed integration architecture
- [x] Install and configure rss-parser library
- [x] Implement RSS feed fetching by category
- [x] Add rate limiting and error handling
- [x] Build news deduplication logic
- [x] Enhance signal generation with relevance scoring
- [x] Create comprehensive test suite
- [x] Integrate with existing TradingService (already integrated)
- [x] Document RSS feed sources
- [x] Test with simulation data

---

## Phase 7: Advanced Features 🚀

**Status:** ✅ Complete  
**Duration:** 1-2 weeks
**Priority:** MEDIUM - Enhances trading performance and observability

### Goals
- Historical trade performance analysis
- Risk-adjusted position sizing
- Enhanced observability and visualization

### Milestones

#### 7.1 Machine Learning / Historical Analysis ✅
- [x] Trade history analyzer with CSV parsing
- [x] Performance metrics calculation (win rate, P&L, profit factor, etc.)
- [x] Pattern recognition by category, edge range, belief width
- [x] Time-of-day performance analysis
- [x] Edge accuracy tracking

#### 7.2 Portfolio Management ✅
- [x] Risk-adjusted position sizing using Kelly Criterion
- [x] Simplified Kelly formula for prediction markets
- [x] Correlation-based diversification checks
- [x] Drawdown protection with portfolio peak tracking
- [x] Position tracking and unrealized P&L calculation
- [x] Portfolio status monitoring (capital allocation, open positions)

#### 7.3 Market Making
- [ ] Two-sided quotes
- [ ] Spread capture strategies
- [ ] Inventory management

**Note:** Market making deferred to future phase as it requires more sophisticated infrastructure.

#### 7.4 Web Dashboard Enhancements ✅
- [x] Performance metrics dashboard component
- [x] P&L tracking visualization
- [x] Trade journal with recent trades table
- [x] Portfolio status display
- [x] Pattern analysis visualization (best/worst categories)
- [x] Navigation between dashboard and performance views

### Implementation Details

**Files Created:**
- `packages/core/src/trade-history.ts` - Historical trade analysis with pattern recognition
- `packages/core/src/portfolio-manager.ts` - Portfolio management with Kelly Criterion
- `apps/web/src/components/PerformanceDashboard.tsx` - Performance visualization component
- `apps/web/src/pages/performance.astro` - Performance dashboard page

**Files Modified:**
- `packages/core/src/index.ts` - Export new modules
- `apps/api/src/index.ts` - Add `/api/performance`, `/api/trade-history`, `/api/portfolio` endpoints
- `apps/api/src/services/trading.ts` - Integrate trade history and portfolio manager
- `apps/web/src/layouts/Layout.astro` - Add navigation links

**Features:**
- **Trade History Analysis:**
  - Loads trade data from audit logs
  - Calculates comprehensive performance metrics
  - Identifies winning/losing patterns by category
  - Analyzes optimal edge ranges and belief widths
  - Time-of-day performance tracking

- **Portfolio Management:**
  - Kelly Criterion position sizing (quarter-Kelly for safety)
  - Automatic risk limit enforcement (max 2% per trade default)
  - Category concentration detection
  - Keyword-based correlation analysis
  - Drawdown tracking and protection
  - Real-time portfolio status

- **Web Dashboard:**
  - Real-time performance metrics display
  - Historical P&L tracking
  - Trade journal with sortable columns
  - Pattern analysis visualization
  - Responsive design with auto-refresh

### Environment Configuration

```bash
# Portfolio Management (optional - Phase 7 enhancements)
PORTFOLIO_CAPITAL=1000              # Total capital for trading (default: 1000)
MAX_RISK_PER_TRADE=0.02            # Max % of capital per trade (default: 2%)
KELLY_FRACTION=0.25                # Fraction of Kelly to use (default: 0.25 = quarter-Kelly)
CORRELATION_THRESHOLD=0.7          # Max correlation for diversification (default: 0.7)
MAX_DRAWDOWN_PERCENT=10            # Max portfolio drawdown % (default: 10%)
```

### Testing

Comprehensive test suites added:
- `packages/core/src/trade-history.test.ts` - 6 tests for trade history analysis
- `packages/core/src/portfolio-manager.test.ts` - 14 tests for portfolio management

All 77 tests passing ✅

### Usage

```bash
# View performance dashboard
# Navigate to http://localhost:3000/performance

# API endpoints available:
GET /api/performance      # Performance metrics and pattern analysis
GET /api/trade-history    # Historical trade records
GET /api/portfolio        # Current portfolio status
```

### Future Enhancements (Phase 8+)

The following features are planned for future phases:
- [ ] Advanced ML for price prediction
- [ ] Market making strategies
- [ ] Backtesting framework with historical data
- [ ] Advanced charting with time series visualization
- [ ] Strategy optimization using genetic algorithms
- [ ] Multi-timeframe analysis

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
# Fly.io (set via fly secrets)
# All secrets are managed by Fly.io's secrets management

# Audit Logging
LOGTAIL_TOKEN=<logtail-source-token>   # Optional: for external logging
AUDIT_LOG_PATH=./audit-logs             # Path for CSV audit logs (default)
```

### Phase 4 Additions (✅ Implemented)
```bash
# Wallet (SECURE - use secrets manager)
WALLET_PRIVATE_KEY=<private-key>
POLYGON_RPC_URL=https://polygon-rpc.com  # Optional, for RPC calls
CHAIN_ID=137                              # Polygon mainnet (default)

# Trading Limits
MAX_POSITION_SIZE=100                 # Max USDC per position (default: 100)
DAILY_LOSS_LIMIT=50                   # Max daily loss in USDC (default: 50)
MAX_OPEN_POSITIONS=5                  # Max concurrent positions (default: 5)
```

**Note:** If `WALLET_PRIVATE_KEY` is not set, the system runs in simulation mode.

### Phase 5 Additions
```bash
# Reddit (optional - enables Reddit integration)
REDDIT_CLIENT_ID=<client-id>
REDDIT_CLIENT_SECRET=<client-secret>
REDDIT_USER_AGENT="pomabot/1.0"
REDDIT_USERNAME=<username>      # Optional: for user-authenticated access
REDDIT_PASSWORD=<password>      # Optional: for user-authenticated access
```

**Note:** If Reddit credentials are not set, the system runs without Reddit integration.

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
| 2 | Slack Notifications | 1 week | ✅ Complete |
| 3 | Fly.io Deployment & Audit Logging | 1-2 weeks | ✅ Complete |
| 4 | Real Trading Execution | 2-3 weeks | ✅ Complete |
| 5 | Reddit Data Integration | 2-3 weeks | ✅ Complete |
| 6 | Additional Data Sources (News RSS) | 1 week | ✅ Complete |
| 7 | Advanced Features (Analysis & Portfolio) | 1-2 weeks | ✅ Complete |

---

## Contributing

When working on any phase:
1. Create feature branch
2. Implement with tests
3. Run `pnpm verify` before committing
4. Update this roadmap with progress
5. Document changes in `copilot.changes.md`

---

*Last updated: December 31, 2025*
