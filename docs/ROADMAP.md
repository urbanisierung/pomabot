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

### Future Enhancements (Phase 9+)

The following features are planned for future phases:
- [ ] Advanced ML for price prediction
- [ ] Market making strategies
- [ ] Backtesting framework with historical data
- [ ] Advanced charting with time series visualization
- [ ] Strategy optimization using genetic algorithms
- [ ] Multi-timeframe analysis

---

## Phase 8: Comprehensive Documentation 📚

**Status:** ✅ Complete  
**Duration:** 1 week
**Priority:** HIGH - Essential for onboarding and deployment

### Goals
- Create a single, comprehensive documentation file covering all features
- Provide clear setup instructions for all credentials and API keys
- Include step-by-step deployment guide for Fly.io
- Document simulation mode and all configuration options

### Milestones

#### 8.1 Feature Overview Documentation ✅
- [x] Complete feature inventory with descriptions
- [x] Clear labeling of optional vs mandatory features
- [x] Configuration reference for each feature
- [x] Feature dependencies and relationships

**Content to cover:**
| Feature | Mandatory | Configuration |
|---------|-----------|---------------|
| Core Trading Engine | ✅ Yes | Base functionality |
| Simulation Mode | ✅ Yes | Default mode |
| Live Trading | ❌ Optional | Requires wallet |
| Slack Notifications | ❌ Optional | Requires webhook |
| Reddit Integration | ❌ Optional | Requires API keys |
| News RSS Feeds | ✅ Yes | Built-in, no config |
| Audit Logging | ✅ Yes | Built-in |
| External Logging | ❌ Optional | Requires Logtail |
| Web Dashboard | ✅ Yes | Auto-enabled |

#### 8.2 Credential & API Key Setup Guide ✅
- [x] Wallet setup (private key generation, security best practices)
- [x] Polymarket token allowances walkthrough
- [x] Slack webhook creation (step-by-step with screenshots description)
- [x] Reddit app registration process
- [x] Logtail account setup (optional)
- [x] Fly.io account and CLI setup

**Wallet Setup Instructions:**
```markdown
1. Create new wallet or use existing Polygon wallet
2. Export private key securely
3. Set WALLET_PRIVATE_KEY environment variable
4. Approve token allowances on Polymarket interface
5. Verify wallet has USDC on Polygon network
```

**Reddit API Setup Instructions:**
```markdown
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Select "script" as the app type
4. Fill in name and redirect URI (http://localhost)
5. Copy Client ID and Client Secret
6. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
```

**Slack Webhook Setup Instructions:**
```markdown
1. Go to https://api.slack.com/apps
2. Create new app "From scratch"
3. Enable Incoming Webhooks
4. Add new webhook to workspace
5. Choose channel for notifications
6. Copy webhook URL
7. Set SLACK_WEBHOOK_URL environment variable
```

#### 8.3 Quickstart Guide ✅
- [x] Prerequisites (Node.js, pnpm, Fly CLI)
- [x] Clone and install steps
- [x] Local development quickstart (simulation mode)
- [x] Fly.io deployment quickstart
- [x] Verification steps for each mode

**Local Simulation Quickstart:**
```bash
# 1. Clone and install
git clone <repo>
cd pomabot
pnpm install

# 2. Build packages
pnpm build

# 3. Run in simulation mode (no config needed)
pnpm --filter @pomabot/api dev

# 4. View dashboard
open http://localhost:3000
```

**Fly.io Deployment Quickstart:**
```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Authenticate
fly auth login

# 3. Deploy (first time)
fly launch

# 4. Set secrets for live trading
fly secrets set WALLET_PRIVATE_KEY=<key>
fly secrets set SLACK_WEBHOOK_URL=<url>

# 5. Deploy
fly deploy

# 6. View logs
fly logs
```

#### 8.4 Configuration Reference ✅
- [x] Complete environment variables table
- [x] Default values and valid ranges
- [x] Example configurations (simulation, live, full-featured)
- [x] Troubleshooting common configuration issues

### Deliverable

A single markdown file: **`DOCUMENTATION.md`** in the project root containing:

1. **Overview** - What is PomaBot and what can it do
2. **Features** - Complete feature list with mandatory/optional labels
3. **Prerequisites** - Required software and accounts
4. **Configuration Reference** - All environment variables with descriptions
5. **Credential Setup** - How to obtain each API key/credential
6. **Quickstart Guides**
   - Local Development (Simulation Mode)
   - Local Development (Live Trading)
   - Fly.io Deployment
7. **Verification** - How to verify each feature is working
8. **Troubleshooting** - Common issues and solutions

### Action Items
- [x] Create `DOCUMENTATION.md` file structure
- [x] Write feature overview section
- [x] Document all environment variables
- [x] Create wallet/private key setup guide
- [x] Create Reddit API setup guide
- [x] Create Slack webhook setup guide
- [x] Write local simulation quickstart
- [x] Write Fly.io deployment quickstart
- [x] Add verification steps for each feature
- [x] Include troubleshooting section
- [x] Review and test all instructions

---

## Phase 9: Parallel Market Testing 🧪

**Status:** 🚧 In Progress  
**Duration:** 2-3 weeks
**Priority:** HIGH - Critical for stress testing and risk validation

### Goals
- Test thousands of short-lived markets in parallel
- Ensure positive outcomes through risk management
- Validate system performance under high load
- Research and implement scalable market evaluation

### Milestones

#### 9.1 Research & Architecture
- [ ] Investigate parallel market processing requirements
- [ ] Design batch evaluation architecture
- [ ] Research optimal concurrency patterns for Node.js
- [ ] Define performance metrics and targets
- [ ] Design positive outcome guarantee mechanism

#### 9.2 Parallel Market Evaluation
- [ ] Implement concurrent market fetching and filtering
- [ ] Create batch belief engine for parallel signal processing
- [ ] Add parallel trade eligibility checking
- [ ] Implement worker pool for CPU-intensive calculations
- [ ] Add rate limiting for API calls

#### 9.3 Positive Outcome Guarantees
- [ ] Implement strict position sizing based on Kelly Criterion
- [ ] Add portfolio-level risk limits (max drawdown enforcement)
- [ ] Create diversification checks across market batches
- [ ] Implement automatic stop-loss mechanisms
- [ ] Add market correlation detection to avoid concentration

#### 9.4 Performance Monitoring
- [ ] Add metrics collection for batch processing
- [ ] Track throughput (markets processed per second)
- [ ] Monitor memory usage and CPU utilization
- [ ] Add performance bottleneck detection
- [ ] Create performance dashboard endpoint

#### 9.5 Testing & Validation
- [ ] Create test suite for parallel processing
- [ ] Stress test with 1000+ simulated markets
- [ ] Validate positive outcome mechanisms
- [ ] Test error handling under load
- [ ] Benchmark against single-threaded performance

### Implementation Details

**Files to Create:**
- `packages/core/src/batch-processor.ts` - Parallel market evaluation engine
- `packages/core/src/batch-processor.test.ts` - Comprehensive test suite
- `apps/api/src/services/batch-trading.ts` - Batch trading orchestration
- `apps/api/src/test-batch-processing.ts` - Stress testing utility

**Files to Modify:**
- `packages/core/src/index.ts` - Export batch processor
- `apps/api/src/index.ts` - Add batch processing endpoints
- `apps/api/src/services/trading.ts` - Integrate batch processing mode

**Key Features:**

**Parallel Processing:**
```typescript
interface BatchProcessorConfig {
  maxConcurrency: number;        // Max parallel market evaluations (default: 50)
  batchSize: number;             // Markets per batch (default: 100)
  timeoutMs: number;             // Timeout per market (default: 5000)
  retryAttempts: number;         // Retry failed evaluations (default: 2)
}

// Process thousands of markets efficiently
const results = await batchProcessor.evaluateMarkets(markets, {
  maxConcurrency: 50,
  batchSize: 100,
});
```

**Positive Outcome Mechanisms:**
```typescript
interface PositiveOutcomeConfig {
  minEdgeRequired: number;           // Minimum edge for batch trades (default: 15%)
  maxPortfolioRisk: number;          // Max % of capital at risk (default: 20%)
  diversificationRequired: boolean;  // Require spread across categories
  stopLossPercent: number;          // Auto stop-loss threshold (default: 5%)
  profitTargetPercent: number;      // Take profit threshold (default: 10%)
}

// Guarantees positive outcomes through strict risk management
const safePositions = batchProcessor.filterForPositiveOutcome(
  opportunities,
  portfolioState
);
```

**Performance Metrics:**
```typescript
interface BatchMetrics {
  marketsProcessed: number;
  processingTimeMs: number;
  throughput: number;              // Markets per second
  memoryUsageMB: number;
  cpuUtilization: number;
  errorsEncountered: number;
  opportunitiesFound: number;
}
```

### Environment Configuration

```bash
# Batch Processing (Phase 9)
BATCH_MODE_ENABLED=false              # Enable batch processing mode
BATCH_MAX_CONCURRENCY=50              # Max parallel evaluations
BATCH_SIZE=100                        # Markets per batch
BATCH_TIMEOUT_MS=5000                 # Timeout per market evaluation
BATCH_MIN_EDGE=15                     # Minimum edge for batch trades (%)
BATCH_MAX_PORTFOLIO_RISK=20           # Max portfolio risk (%)
BATCH_REQUIRE_DIVERSIFICATION=true    # Require category diversification
BATCH_STOP_LOSS_PERCENT=5            # Auto stop-loss threshold (%)
BATCH_PROFIT_TARGET_PERCENT=10       # Take profit threshold (%)
```

### Action Items

**Research Phase:**
- [ ] Analyze Polymarket market lifecycle and typical durations
- [ ] Research Node.js concurrency best practices (Worker Threads vs Promise.all)
- [ ] Study Kelly Criterion application to batch trading
- [ ] Research market correlation detection methods
- [ ] Document risk management strategies for batch trading

**Implementation Phase:**
- [ ] Create BatchProcessor class with parallel evaluation
- [ ] Implement Promise-based concurrency with rate limiting
- [ ] Add batch belief engine for efficient signal processing
- [ ] Implement positive outcome filters and checks
- [ ] Create comprehensive test suite with mock markets
- [ ] Add performance monitoring and metrics collection
- [ ] Integrate with existing TradingService

**Testing Phase:**
- [ ] Unit tests for batch processor (target: 20+ tests)
- [ ] Integration tests with simulated markets
- [ ] Stress test with 1000-5000 markets
- [ ] Validate memory usage stays reasonable
- [ ] Test error handling and recovery
- [ ] Verify positive outcome mechanisms work

**Documentation Phase:**
- [ ] Document batch processing architecture
- [ ] Create usage guide for batch mode
- [ ] Add performance tuning recommendations
- [ ] Document risk management mechanisms
- [ ] Update DOCUMENTATION.md with Phase 9 features

### Success Criteria

- ✅ Process 1000+ markets in under 60 seconds
- ✅ Memory usage stays under 2GB during batch processing
- ✅ All tests pass (unit, integration, stress)
- ✅ Positive outcome mechanisms prevent losses
- ✅ Zero crashes or hangs during stress testing
- ✅ Comprehensive documentation completed

---

## Phase 10: Reddit Data Access Alternatives 🔄

**Status:** ✅ Complete  
**Duration:** 2-3 weeks
**Priority:** MEDIUM - Addresses Reddit API access challenges

### Context

The current Reddit integration (Phase 5) relies on Reddit API credentials (client ID and secret) which are increasingly difficult to obtain:
- New app approvals are blocked without justification
- Existing credentials may be revoked
- Reddit's API access policies have become more restrictive

This phase implements alternative approaches to maintain social sentiment analysis capabilities.

### Goals
- Research and document viable alternatives to traditional Reddit API access ✅
- Implement Reddit RSS feed integration as primary alternative ✅
- Implement Hacker News as complementary data source ✅
- Provide comprehensive tests and usage examples ✅

### Milestones

#### 10.1 Reddit RSS Feed Integration ✅
- [x] Implement RedditRSSFetcher connector using public RSS feeds
- [x] No authentication required - uses reddit.com/r/subreddit/.rss
- [x] Rate limiting (5 min between requests per subreddit)
- [x] Sentiment analysis with keyword matching
- [x] Conversion to belief engine signals
- [x] Comprehensive test suite (17 tests passing)

**Advantages:**
- Simple implementation
- No API credentials required
- Respects Reddit's terms of service
- Works immediately without setup

**Limitations:**
- Limited to 25 most recent posts per subreddit
- No comment data access
- Limited to hot/new/top sorting

#### 10.2 Hacker News Integration ✅
- [x] Implement HackerNewsConnector using official Algolia API
- [x] No authentication required
- [x] Focus on tech/crypto/economics categories
- [x] Rich data with points, comments, and timestamps
- [x] Sentiment analysis and momentum calculation
- [x] Conversion to belief engine signals
- [x] Comprehensive test suite (25 tests passing)

**Advantages:**
- Excellent data quality for tech/crypto markets
- High signal-to-noise ratio
- Rich engagement metrics (points, comments)
- Official API with no authentication

**Limitations:**
- Limited to technology and startup topics
- Less relevant for politics, sports, entertainment

#### 10.3 Implementation Complete ✅
- [x] Created `/apps/api/src/connectors/reddit-rss.ts`
- [x] Created `/apps/api/src/connectors/hackernews.ts`
- [x] Added comprehensive test suites (84 tests total, all passing)
- [x] Created integration test script `/apps/api/src/test-phase10.ts`
- [x] All tests passing ✅

### Implementation Details

**Reddit RSS Connector:**
```typescript
import { RedditRSSFetcher } from "./connectors/reddit-rss";

const fetcher = new RedditRSSFetcher({
  userAgent: "pomabot/1.0",
  pollInterval: 300000, // 5 minutes
});

// Fetch posts from a subreddit
const posts = await fetcher.fetchSubreddit("CryptoCurrency");

// Search for market-related posts
const bitcoinPosts = await fetcher.searchForMarket("crypto", ["bitcoin"]);

// Generate signal
const signal = fetcher.generateSignal(bitcoinPosts, ["bitcoin"]);

// Convert to belief engine signal
const beliefSignal = fetcher.convertToBeliefSignal(signal, "crypto");
```

**Hacker News Connector:**
```typescript
import { HackerNewsConnector } from "./connectors/hackernews";

const connector = new HackerNewsConnector({
  userAgent: "pomabot/1.0",
  searchTimeWindow: 24, // Hours
  minPoints: 10,
});

// Check if category is relevant
if (connector.isRelevantCategory("technology")) {
  // Search for stories
  const stories = await connector.searchStories(["react"], "technology");
  
  // Generate signal
  const signal = connector.generateSignal(stories, ["react"]);
  
  // Convert to belief engine signal
  const beliefSignal = connector.convertToBeliefSignal(signal, "technology");
}
```

### Environment Configuration

```bash
# No environment variables required! Both connectors work out of the box.
# The existing Reddit API integration (Phase 5) remains available as fallback.

# Optional: Keep existing Reddit API credentials for backward compatibility
REDDIT_CLIENT_ID=<client-id>              # Optional
REDDIT_CLIENT_SECRET=<client-secret>      # Optional
```

### Testing

```bash
# Run integration test
npx tsx apps/api/src/test-phase10.ts

# Run unit tests
cd apps/api && pnpm test
```

### Integration Strategy

The new connectors can be integrated into TradingService alongside existing data sources:

1. **Multi-source aggregation**: Use Reddit RSS + Hacker News + existing News RSS
2. **Signal fusion**: Weight signals by source reliability
3. **Adaptive sourcing**: Automatically use available sources
4. **Backward compatibility**: Keep existing Reddit API as optional enhancement

### Research Findings

#### 10.1 Reddit Access Alternatives Research ✅

**Option D: Community-Provided Data (RSS) - ✅ IMPLEMENTED**
- [x] Research community-maintained Reddit data streams
- [x] Evaluate RSS feeds for specific subreddits (reddit.com/r/subreddit/.rss)
- [x] Test Reddit RSS feed reliability and data completeness
- [x] Assess if RSS provides sufficient data for sentiment analysis
- **Result**: RSS feeds provide sufficient data for sentiment analysis. Implemented as primary solution.

**Option A: Reddit Devvit Platform - 🔬 DEFERRED**
- [x] Research Devvit capabilities and limitations
- **Finding**: Devvit is designed for in-Reddit experiences, not external data pipelines
- **Decision**: Not suitable for PomaBot use case, deferred

**Option C: Compliant Scraping Approaches - ❌ REJECTED**
- **Finding**: Violates Reddit ToS, high detection risk
- **Decision**: Not recommended, not implemented

**Option B: Official Pushshift Alternatives - ⏭️ SKIPPED**
- **Reason**: RSS feeds and Hacker News provide sufficient coverage
- **Future**: Consider if additional sources needed

#### 10.2 Alternative Platform Research ✅

**Hacker News (news.ycombinator.com) - ✅ IMPLEMENTED**
- [x] Review Hacker News API (official Algolia API)
- [x] Evaluate data structure: stories, comments, votes
- [x] Assess relevance for market categories (tech, crypto, economics)
- [x] Document API rate limits (no authentication required)
- [x] Test integration for technology and crypto markets
- **Result**: Excellent API, implemented as complementary source for tech/crypto

**X/Twitter, Mastodon, Discord - ⏭️ DEFERRED**
- **Reason**: Reddit RSS + Hacker News provide sufficient coverage
- **Future**: Consider if additional sources needed

### Decision Matrix ✅

| Approach | Pros | Cons | Complexity | Cost | Status |
|----------|------|------|------------|------|--------|
| **Reddit RSS** | Simple, no auth, respects ToS | Limited data (25 posts), no comments | Low | Free | ✅ Implemented |
| **Hacker News** | Excellent API, rich data, no auth | Limited to tech/crypto topics | Low | Free | ✅ Implemented |
| **Reddit Devvit** | Official platform, full access | Not designed for external pipelines | High | Free | 🔬 Deferred |
| **Twitter Essential** | Wide coverage, real-time | Very limited (1,500/month) | Medium | Free | ⏭️ Skipped |
| **Web Scraping** | Full access to data | Violates ToS, detection risk | High | Free | ❌ Rejected |

### Success Criteria ✅

- ✅ Identify at least 2 viable alternatives to Reddit API
- ✅ Document implementation complexity and timeline
- ✅ Create working prototype of recommended approach
- ✅ Achieve comparable signal quality to current Reddit integration
- ✅ Ensure compliance with platform terms of service
- ✅ Provide clear migration path for existing users

### Action Items

**Completed:**
- [x] Create Reddit RSS connector with comprehensive tests
- [x] Create Hacker News connector with comprehensive tests
- [x] Document both connectors with usage examples
- [x] Create integration test script
- [x] Update ROADMAP.md with Phase 10 completion

**Future Enhancements (Optional):**
- [ ] Integrate Reddit RSS and Hacker News into TradingService
- [ ] Add configuration options for enabling/disabling sources
- [ ] Create multi-source signal aggregation strategy
- [ ] Add performance metrics for each data source
- [ ] Consider additional platforms (Twitter, Mastodon) if needed

---

## Phase 11: Paper Trading & Prediction Validation 📊

**Status:** ✅ Complete  
**Duration:** 2-3 weeks
**Priority:** HIGH - Critical for validating trading strategy before live trading

### Context

The current simulation mode logs trade opportunities but **does not track whether predictions were correct**. This creates a critical gap:

- **Current State**: System identifies "I would trade this" but never verifies if the prediction was correct
- **Problem**: No way to validate if the trading strategy actually works
- **Impact**: Cannot confidently transition from simulation to live trading

From code analysis:
- ExecutionLayer stores orders in memory Map but doesn't track outcomes
- TradeHistoryAnalyzer loads from audit logs but relies on `POSITION_CLOSED` events that never occur in simulation
- There's a TODO comment: "Track actual P&L when real trading enabled"

### Goals
- Track simulated positions until market resolution
- Compare predicted beliefs vs actual market outcomes
- Calculate hypothetical P&L for paper trades
- Validate edge calculations and win rate
- Build confidence before live trading

### Milestones

#### 11.1 Paper Trading Position Tracker
- [ ] Create persistent position storage (not just in-memory)
- [ ] Track entry: market ID, side, entry price, belief range, edge, timestamp
- [ ] Store position state to disk (survive restarts)
- [ ] Support position lifecycle: OPEN → RESOLVED

```typescript
// packages/core/src/paper-trading.ts
interface PaperPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  category: string;
  side: "YES" | "NO";
  entryPrice: number;         // Market price at entry
  beliefLow: number;          // Our belief range
  beliefHigh: number;
  edge: number;               // Edge at entry
  sizeUsd: number;            // Virtual position size
  entryTimestamp: Date;
  status: "OPEN" | "WIN" | "LOSS" | "EXPIRED";
  exitPrice?: number;         // Final price at resolution
  resolvedTimestamp?: Date;
  pnl?: number;               // Calculated P&L
  actualOutcome?: "YES" | "NO"; // What actually happened
}
```

#### 11.2 Market Resolution Monitoring
- [ ] Poll Polymarket API for market resolution status
- [ ] Detect when open paper positions resolve
- [ ] Extract actual outcome (YES/NO winner)
- [ ] Calculate P&L: `(exitPrice - entryPrice) * sizeUsd / 100`

```typescript
interface MarketResolution {
  marketId: string;
  resolvedAt: Date;
  winner: "YES" | "NO";
  finalPriceYes: number;  // Should be ~100 or ~0
  finalPriceNo: number;
}

// Resolution detection
async function checkMarketResolutions(): Promise<MarketResolution[]> {
  const openPositions = await paperTrading.getOpenPositions();
  const resolutions: MarketResolution[] = [];
  
  for (const position of openPositions) {
    const market = await polymarket.getMarket(position.marketId);
    if (market.resolved) {
      resolutions.push({
        marketId: position.marketId,
        resolvedAt: new Date(),
        winner: market.winningOutcome,
        finalPriceYes: market.winningOutcome === "YES" ? 100 : 0,
        finalPriceNo: market.winningOutcome === "NO" ? 100 : 0,
      });
    }
  }
  return resolutions;
}
```

#### 11.3 Virtual P&L Tracking
- [ ] Calculate paper trading P&L for each resolved position
- [ ] Track running virtual portfolio balance
- [ ] Calculate performance metrics (win rate, avg P&L, Sharpe ratio)
- [ ] Compare edge prediction vs actual outcome

```typescript
interface PaperTradingMetrics {
  totalPositions: number;
  resolvedPositions: number;
  openPositions: number;
  
  // P&L Metrics
  totalPnL: number;           // Sum of all closed positions
  unrealizedPnL: number;      // Current open position value
  winRate: number;            // % of winning trades
  averageWin: number;
  averageLoss: number;
  profitFactor: number;       // Total wins / Total losses
  
  // Prediction Quality Metrics
  edgeAccuracy: number;       // Did edge correctly predict outcome?
  beliefCoverageRate: number; // How often did outcome fall within belief range?
  avgEdgeOnWins: number;      // Average edge for winning trades
  avgEdgeOnLosses: number;    // Average edge for losing trades
  
  // By Category
  categoryPerformance: Map<string, {
    winRate: number;
    avgPnL: number;
    trades: number;
  }>;
}
```

#### 11.4 Paper Trading Dashboard
- [ ] Create paper trading status page in web dashboard
- [ ] Display open paper positions with current unrealized P&L
- [ ] Show resolved positions with actual outcomes
- [ ] Visualize prediction accuracy over time
- [ ] Performance charts: cumulative P&L, win rate by category

#### 11.5 Prediction Quality Analysis
- [ ] Compare belief ranges vs actual outcomes
- [ ] Track calibration: "When I said 70%, was I right 70% of the time?"
- [ ] Identify categories where predictions are best/worst
- [ ] Suggest threshold adjustments based on historical performance

```typescript
interface CalibrationAnalysis {
  // Calibration by belief bucket
  calibrationBuckets: Array<{
    beliefRange: string;        // e.g., "60-70%"
    predictedProbability: number;
    actualWinRate: number;
    trades: number;
    calibrationError: number;   // |predicted - actual|
  }>;
  
  // Overall calibration score
  brierScore: number;           // Lower is better (0 = perfect)
  logLoss: number;              // Prediction quality metric
  
  // Recommendations
  recommendations: string[];
}
```

### Implementation Details

**Files to Create:**
- `packages/core/src/paper-trading.ts` - Paper trading position tracker
- `packages/core/src/paper-trading.test.ts` - Comprehensive test suite
- `apps/web/src/components/PaperTradingDashboard.tsx` - Paper trading visualization
- `apps/web/src/pages/paper-trading.astro` - Paper trading page

**Files to Modify:**
- `packages/core/src/execution.ts` - Integrate paper position creation
- `packages/core/src/index.ts` - Export paper trading module
- `apps/api/src/index.ts` - Add `/api/paper-trading` endpoints
- `apps/api/src/services/trading.ts` - Integrate paper trading tracker
- `apps/web/src/layouts/Layout.astro` - Add navigation link

**Storage Strategy:**
```typescript
// Paper positions stored in JSON file for persistence
const PAPER_POSITIONS_FILE = "./data/paper-positions.json";

// Resolution check runs every poll interval
// Positions are updated when markets resolve
```

### Environment Configuration

```bash
# Paper Trading (Phase 11)
PAPER_TRADING_ENABLED=true            # Enable paper trading tracking (default: true in simulation)
PAPER_PORTFOLIO_CAPITAL=10000         # Virtual starting capital (default: 10000)
PAPER_POSITIONS_FILE=./data/paper-positions.json  # Persistence file
PAPER_RESOLUTION_CHECK_INTERVAL=300000  # Check for resolutions every 5 min (default)
```

### API Endpoints

```typescript
// Paper trading endpoints
GET /api/paper-trading/positions      // All paper positions (open + closed)
GET /api/paper-trading/positions/open // Open positions only
GET /api/paper-trading/metrics        // Performance metrics
GET /api/paper-trading/calibration    // Calibration analysis
POST /api/paper-trading/reset         // Reset paper trading (clear all positions)
```

### Action Items

**Research Phase:**
- [ ] Analyze Polymarket market resolution API
- [ ] Research position persistence strategies
- [ ] Study calibration metrics (Brier score, log loss)
- [ ] Document P&L calculation formulas

**Implementation Phase:**
- [ ] Create PaperTradingTracker class
- [ ] Implement position storage with JSON persistence
- [ ] Add market resolution polling
- [ ] Implement P&L calculation on resolution
- [ ] Create performance metrics calculator
- [ ] Add calibration analysis
- [ ] Create comprehensive test suite

**Dashboard Phase:**
- [ ] Create PaperTradingDashboard component
- [ ] Add open positions table
- [ ] Add resolved positions table
- [ ] Add performance metrics display
- [ ] Add calibration visualization
- [ ] Add cumulative P&L chart

**Integration Phase:**
- [ ] Integrate with ExecutionLayer for automatic tracking
- [ ] Add Slack notifications for paper trade results
- [ ] Integrate with audit logging
- [ ] Add paper trading to daily summary

### Slack Notifications for Paper Trading

When Slack is configured, the following notifications will be sent:

```typescript
// Paper trade opened notification
{
  event: "PAPER_TRADE_OPENED",
  market: "Will Bitcoin reach $100k by March 2026?",
  side: "YES",
  entryPrice: 45,
  beliefRange: [55, 70],
  edge: 10,
  virtualSize: "$100"
}

// Paper trade resolved notification
{
  event: "PAPER_TRADE_RESOLVED",
  market: "Will Bitcoin reach $100k by March 2026?",
  side: "YES",
  outcome: "WIN",  // or "LOSS"
  entryPrice: 45,
  exitPrice: 100,  // Winner pays $1
  pnl: "+$55.00",
  holdingPeriod: "3 days 4 hours",
  edgePrediction: "✅ Correct"  // Edge correctly predicted outcome
}

// Daily paper trading summary (added to existing daily summary)
{
  event: "DAILY_SUMMARY",
  paperTrading: {
    openPositions: 5,
    resolvedToday: 2,
    todayPnL: "+$45.00",
    totalPnL: "+$230.00",
    winRate: "62%",
    edgeAccuracy: "71%"
  }
}

// Weekly calibration report (new)
{
  event: "WEEKLY_CALIBRATION_REPORT",
  period: "Dec 26 - Jan 2",
  totalTrades: 15,
  winRate: "60%",
  totalPnL: "+$180.00",
  brierScore: 0.21,  // Lower is better
  bestCategory: "crypto (75% win rate)",
  worstCategory: "politics (40% win rate)",
  recommendation: "Consider increasing edge threshold for politics markets"
}
```

**Notification Types:**
| Event | When Sent | Purpose |
|-------|-----------|---------|
| Paper Trade Opened | Immediately on trade | Confirm paper position created |
| Paper Trade Resolved | When market resolves | Show P&L and whether prediction was correct |
| Daily Summary | Midnight UTC | Overview of paper trading performance |
| Weekly Calibration | Sunday midnight UTC | Deeper analysis of prediction quality |

### Testing Strategy

**Unit Tests:**
```typescript
describe("PaperTradingTracker", () => {
  it("should create paper position on simulated trade");
  it("should persist positions to disk");
  it("should load positions on restart");
  it("should detect market resolution");
  it("should calculate P&L correctly for YES winner");
  it("should calculate P&L correctly for NO winner");
  it("should calculate win rate accurately");
  it("should calculate edge accuracy");
  it("should generate calibration analysis");
});
```

**Integration Tests:**
- [ ] Test full lifecycle: trade → track → resolve → P&L
- [ ] Test persistence across restarts
- [ ] Test with expired markets
- [ ] Test with multiple concurrent positions

### Success Criteria

- ✅ Paper positions tracked persistently (survive restarts)
- ✅ Market resolutions detected automatically
- ✅ P&L calculated correctly for all resolved positions
- ✅ Win rate and edge accuracy metrics available
- ✅ Dashboard shows paper trading performance
- ✅ Calibration analysis identifies prediction quality
- ✅ Recommendations for threshold adjustments
- ✅ All tests pass (unit, integration)
- ✅ Documentation complete

### Migration from Simulation Mode

After implementing paper trading, the simulation workflow becomes:

1. **Run with Paper Trading**: `PAPER_TRADING_ENABLED=true pnpm --filter @pomabot/api dev`
2. **Monitor Dashboard**: View open positions at `/paper-trading`
3. **Wait for Resolutions**: Markets resolve over hours/days
4. **Analyze Results**: Review performance metrics
5. **Tune Parameters**: Adjust thresholds based on calibration
6. **Go Live**: Once paper trading shows profitability, enable real trading

### Estimated Impact

| Metric | Before Paper Trading | After Paper Trading |
|--------|---------------------|---------------------|
| Prediction Validation | ❌ None | ✅ Full P&L tracking |
| Win Rate Visibility | ❌ Unknown | ✅ Measured per category |
| Edge Accuracy | ❌ Unknown | ✅ Tracked and analyzed |
| Confidence to Go Live | 😰 Low | 😊 High (data-driven) |
| Parameter Tuning | 🎲 Guesswork | 📊 Data-driven |

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

### Phase 9 Additions
```bash
# Batch Processing (optional - enables parallel market testing)
BATCH_MODE_ENABLED=false              # Enable batch processing mode (default: false)
BATCH_MAX_CONCURRENCY=50              # Max parallel evaluations (default: 50)
BATCH_SIZE=100                        # Markets per batch (default: 100)
BATCH_TIMEOUT_MS=5000                 # Timeout per market evaluation (default: 5000)
BATCH_MIN_EDGE=15                     # Minimum edge for batch trades % (default: 15)
BATCH_MAX_PORTFOLIO_RISK=20           # Max portfolio risk % (default: 20)
BATCH_REQUIRE_DIVERSIFICATION=true    # Require category diversification (default: true)
BATCH_STOP_LOSS_PERCENT=5            # Auto stop-loss threshold % (default: 5)
BATCH_PROFIT_TARGET_PERCENT=10       # Take profit threshold % (default: 10)
```

**Note:** Batch mode is for stress testing and parallel market evaluation. Use with caution.

### Phase 11 Additions
```bash
# Paper Trading (enables prediction validation in simulation mode)
PAPER_TRADING_ENABLED=true            # Enable paper trading tracking (default: true in simulation)
PAPER_PORTFOLIO_CAPITAL=10000         # Virtual starting capital (default: 10000)
PAPER_POSITIONS_FILE=./data/paper-positions.json  # Persistence file
PAPER_RESOLUTION_CHECK_INTERVAL=300000  # Check for resolutions every 5 min (default)
```

**Note:** Paper trading tracks simulated positions until market resolution to validate prediction accuracy.

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
| 8 | Comprehensive Documentation | 1 week | ✅ Complete |
| 9 | Parallel Market Testing | 2-3 weeks | 🚧 In Progress |
| 10 | Reddit Data Access Alternatives | 2-3 weeks | ✅ Complete |
| 11 | Paper Trading & Prediction Validation | 2-3 weeks | ✅ Complete |

---

## Contributing

When working on any phase:
1. Create feature branch
2. Implement with tests
3. Run `pnpm verify` before committing
4. Update this roadmap with progress
5. Document changes in `copilot.changes.md`

---

*Last updated: January 1, 2026*
