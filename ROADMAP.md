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

**Status:** 📋 Planned  
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
- [ ] Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Create Fly account and authenticate: `fly auth login`
- [ ] Create app: `fly launch` (generates fly.toml)
- [ ] Configure single machine deployment

#### 3.2 Dockerfile Configuration
Create optimized multi-stage Dockerfile for minimal image size:

```dockerfile
# Dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy only production dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
```

#### 3.3 fly.toml Configuration
```toml
# fly.toml
app = "pomabot"
primary_region = "fra"  # Frankfurt (or choose closest region)

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  API_PORT = "4000"

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = "stop"      # Stop when idle (saves costs)
  auto_start_machines = true       # Auto-start on request
  min_machines_running = 0         # Allow scaling to zero
  
  [http_service.concurrency]
    type = "requests"
    soft_limit = 100
    hard_limit = 200

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"                 # Minimal memory for cost savings
```

#### 3.4 Resource Optimization Tips
- **Auto-stop/start**: Machines stop when idle, restart on HTTP request
- **Single process**: Combine API + frontend in one process
- **No volumes needed**: Use Git for persistent audit logs
- **Minimal memory**: Node.js + small dashboard runs in 256MB
- **Kill signal**: Use SIGTERM for graceful shutdown

#### 3.5 Audit Logging System
Implement persistent CSV audit logs committed to GitHub:

```typescript
// packages/core/src/audit-log.ts
interface AuditEntry {
  timestamp: string;          // ISO 8601
  event: AuditEventType;
  marketId?: string;
  marketQuestion?: string;
  action?: string;
  details?: string;
  belief?: number;
  edge?: number;
  amount?: number;
  pnl?: number;
}

type AuditEventType = 
  | 'SYSTEM_START'
  | 'SYSTEM_STOP'
  | 'MARKET_EVALUATED'
  | 'TRADE_OPPORTUNITY'
  | 'TRADE_EXECUTED'
  | 'POSITION_CLOSED'
  | 'ERROR'
  | 'DAILY_SUMMARY';

// CSV format: timestamp,event,marketId,marketQuestion,action,details,belief,edge,amount,pnl
```

**Git-based Persistence Strategy:**
```bash
# Scheduled job (e.g., daily via cron or on shutdown)
git add audit-logs/
git commit -m "chore: update audit logs $(date +%Y-%m-%d)"
git push origin main
```

#### 3.6 External Logging Services Research

**Free/Cheap Options:**

| Service | Free Tier | Pricing | Features |
|---------|-----------|---------|----------|
| **Logtail/Better Stack** | 1GB/month | $0/mo (free tier) | Structured logs, alerts, dashboards |
| **Papertrail** | 48hr search, 100MB/mo | Free tier | Real-time tail, search |
| **Logflare** | 5M events/mo | $0/mo (free tier) | Cloudflare Workers friendly |
| **Axiom** | 500GB ingest/mo | $0/mo (free tier) | S3-backed, SQL queries |
| **Fly.io Native** | Built-in | Included | `fly logs` command |

**Recommendation:** Use **Logtail/Better Stack** (free tier: 1GB/month)
- Easy integration: HTTP endpoint for log shipping
- Structured JSON logs
- Free alerting and dashboards

```typescript
// packages/core/src/logtail.ts
const LOGTAIL_SOURCE_TOKEN = process.env.LOGTAIL_TOKEN;

async function shipLog(entry: AuditEntry): Promise<void> {
  if (!LOGTAIL_SOURCE_TOKEN) return; // Skip if not configured
  
  await fetch('https://in.logtail.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOGTAIL_SOURCE_TOKEN}`
    },
    body: JSON.stringify(entry)
  });
}
```

### Deployment Guide

#### Prerequisites
1. Create Fly.io account: https://fly.io/app/sign-up
2. Install Fly CLI
3. Create Slack webhook (Phase 2)
4. (Optional) Create Logtail account for external logging

#### Step-by-Step Deployment

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Authenticate
fly auth login

# 3. Launch app (creates fly.toml)
fly launch --name pomabot --region fra --no-deploy

# 4. Set secrets
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
fly secrets set LOGTAIL_TOKEN="..."  # Optional

# 5. Deploy
fly deploy

# 6. View logs
fly logs

# 7. Check status
fly status

# 8. SSH into machine (debugging)
fly ssh console
```

#### Estimated Monthly Cost
| Resource | Cost |
|----------|------|
| Machine (shared-cpu-1x, 256MB) | ~$1.94 |
| Stopped machine (rootfs) | ~$0.15/GB |
| SSL Certificate | Free (first 10) |
| Bandwidth (100GB) | Free |
| **Total** | **~$2-5/month** |

### Action Items
- [ ] Create Fly.io account
- [ ] Install Fly CLI locally
- [ ] Create Dockerfile with multi-stage build
- [ ] Create fly.toml configuration
- [ ] Implement audit-log.ts for CSV logging
- [ ] Set up Git-based log persistence
- [ ] (Optional) Set up Logtail account
- [ ] Deploy and test
- [ ] Document deployment process

---

## Phase 4: Real Trading Execution 💰

**Status:** 📋 Planned  
**Duration:** 2-3 weeks
**Priority:** HIGH - Core functionality

### Goals
- Execute real limit orders on Polymarket CLOB
- Proper wallet integration with signing
- Token allowances and balance management

### Milestones

#### 4.1 Wallet Integration
- [ ] Add private key configuration (secure env vars)
- [ ] Implement wallet signing with `ethers.js` or `viem`
- [ ] Polygon network (chain_id: 137) support

#### 4.2 Polymarket CLOB Authentication
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

#### 4.3 Token Allowances
Required contract approvals for EOA wallets:

| Token | Contract Address | Purpose |
|-------|------------------|---------|
| USDC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | Collateral |
| CTF | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` | Conditional tokens |
| Exchange | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` | CLOB exchange |
| Neg Risk Exchange | `0xC5d563A36AE78145C45a50134d48A1215220f80a` | Neg risk adapter |

#### 4.4 Order Execution
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

#### 4.5 Safety Controls
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

## Phase 5: Reddit Data Integration 📊

**Status:** 📋 Planned  
**Duration:** 2-3 weeks
**Priority:** MEDIUM - Enhances prediction accuracy

### Goals
- Monitor relevant subreddits for market sentiment
- Extract signals from post content and comments
- Adjust belief engine based on Reddit activity

### Milestones

#### 5.1 Reddit API Integration
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

#### 5.2 Relevant Subreddits to Monitor
| Market Category | Subreddits |
|-----------------|------------|
| Politics | r/politics, r/PoliticalDiscussion, r/Conservative, r/neoliberal |
| Crypto | r/CryptoCurrency, r/Bitcoin, r/ethereum |
| Finance | r/wallstreetbets, r/investing, r/stocks |
| Sports | r/sportsbook, r/nba, r/nfl |
| General | r/news, r/worldnews |

#### 5.3 Sentiment Analysis
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

#### 5.4 Belief Engine Integration
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

## Phase 6: Additional Data Sources 📰

**Status:** 📋 Planned  
**Duration:** 3-4 weeks
**Priority:** LOW - Future enhancement

### Goals
- Diverse data sources for better predictions
- Multi-source signal aggregation
- Reduced dependency on any single source

### Potential Sources

#### 6.1 News APIs
- [ ] NewsAPI.org for headlines
- [ ] Bing News Search
- [ ] Google News RSS

#### 6.2 Prediction Markets
- [ ] Metaculus (scientific forecasts)
- [ ] Manifold Markets (user predictions)
- [ ] Kalshi (regulated markets)

#### 6.3 Social Media
- [ ] Twitter/X API (if accessible)
- [ ] Telegram groups
- [ ] Discord sentiment

#### 6.4 Official Sources
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

## Phase 7: Advanced Features 🚀

**Status:** 📋 Future
**Duration:** Ongoing

### Potential Enhancements

#### 7.1 Machine Learning
- [ ] Historical trade analysis
- [ ] Pattern recognition in price movements
- [ ] Optimal entry/exit timing

#### 7.2 Portfolio Management
- [ ] Risk-adjusted position sizing
- [ ] Correlation-based diversification
- [ ] Drawdown protection

#### 7.3 Market Making
- [ ] Two-sided quotes
- [ ] Spread capture strategies
- [ ] Inventory management

#### 7.4 Web Dashboard Enhancements
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
# Fly.io (set via fly secrets)
# All secrets are managed by Fly.io's secrets management

# Audit Logging
LOGTAIL_TOKEN=<logtail-source-token>   # Optional: for external logging
AUDIT_LOG_PATH=/app/audit-logs         # Path for CSV audit logs
```

### Phase 4 Additions
```bash
# Wallet (SECURE - use secrets manager)
WALLET_PRIVATE_KEY=<private-key>
POLYGON_RPC_URL=https://polygon-rpc.com

# Trading Limits
MAX_POSITION_SIZE=100                 # Max USDC per position
DAILY_LOSS_LIMIT=50                   # Max daily loss
```

### Phase 5 Additions
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
| 2 | Slack Notifications | 1 week | ✅ Complete |
| 3 | Fly.io Deployment & Audit Logging | 1-2 weeks | 🔄 Next |
| 4 | Real Trading Execution | 2-3 weeks | 📋 Planned |
| 5 | Reddit Data Integration | 2-3 weeks | 📋 Planned |
| 6 | Additional Data Sources | 3-4 weeks | 📋 Future |
| 7 | Advanced Features | Ongoing | 📋 Future |

---

## Contributing

When working on any phase:
1. Create feature branch
2. Implement with tests
3. Run `pnpm verify` before committing
4. Update this roadmap with progress
5. Document changes in `copilot.changes.md`

---

*Last updated: December 2025*
