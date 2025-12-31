# PomaBot - Comprehensive Documentation

**Version:** 0.1.0  
**Last Updated:** December 31, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Configuration Reference](#configuration-reference)
5. [Credential Setup](#credential-setup)
6. [Quickstart Guides](#quickstart-guides)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is PomaBot?

PomaBot is an autonomous trading system for Polymarket that uses deterministic belief-based decision making with real-time market and news integration. The system implements a conservative, truth-first approach to prediction market trading where **truthful probability statements matter more than profits**.

### Core Philosophy

- **Inaction is success** - Most of the time, doing nothing is the correct choice
- **Survival beats cleverness** - Conservative beliefs ensure long-term viability
- **Truth-first approach** - Maintain honest probability assessments
- **Deterministic logic** - All decisions are reproducible and auditable

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  Polymarket  │────▶│    News      │────▶│     Signal     │
│     API      │     │  Aggregator  │     │  Generation    │
└──────────────┘     └──────────────┘     └────────┬───────┘
                                                     │
                                                     ▼
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Data      │────▶│   Belief     │────▶│   Trade        │
│  Ingestion  │     │   Engine     │     │   Engine       │
└─────────────┘     └──────────────┘     └────────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌────────────────┐
                     │    State     │────▶│  Execution     │
                     │   Machine    │     │    Layer       │
                     └──────────────┘     └────────────────┘
```

### Key Components

- **Belief Engine** - Updates probability ranges based on signals
- **Trade Engine** - 8-check eligibility gate for trade decisions
- **State Machine** - Controls system flow and enforces invariants
- **Execution Layer** - Places orders on Polymarket CLOB
- **Calibration System** - Tracks accuracy and adjusts thresholds
- **News Aggregator** - RSS feeds from 50+ authoritative sources
- **Reddit Integration** - Sentiment analysis from relevant subreddits
- **Portfolio Manager** - Kelly Criterion position sizing and risk controls

---

## Features

### Mandatory Features (Always Active)

| Feature | Description | Configuration Required |
|---------|-------------|----------------------|
| **Core Trading Engine** | 8-check eligibility gate, belief-based decisions | None (built-in) |
| **Simulation Mode** | Test system without executing real trades | Default mode |
| **News RSS Feeds** | 50+ authoritative news sources across 9 categories | None (built-in) |
| **Audit Logging** | CSV audit logs with all trade details | Optional path config |
| **Web Dashboard** | Real-time observability at `http://localhost:3000` | None (auto-enabled) |
| **State Machine** | Enforces valid state transitions | None (built-in) |
| **Calibration System** | Tracks performance and adjusts thresholds | None (built-in) |

### Optional Features (Require Configuration)

| Feature | Description | Prerequisites |
|---------|-------------|--------------|
| **Live Trading** | Execute real orders on Polymarket CLOB | Wallet private key, token allowances |
| **Slack Notifications** | Real-time alerts for trades, errors, summaries | Slack webhook URL |
| **Reddit Integration** | Sentiment analysis from subreddit data | Reddit API credentials |
| **External Logging** | Ship logs to Logtail (Better Stack) | Logtail source token |
| **Portfolio Management** | Risk-adjusted position sizing (Kelly Criterion) | Capital configuration |

### Market Categories Supported

The system supports **9 market categories** with category-specific edge thresholds:

| Category | Edge Threshold | Data Sources | Characteristics |
|----------|----------------|--------------|-----------------|
| Weather | 8% | NOAA, National Weather Service | Highly predictable, scientific models |
| Sports | 10% | ESPN, official league APIs, USA Today | Rich statistics, clear outcomes |
| Politics | 12% | SEC announcements, polling data, FiveThirtyEight | Polls, official data |
| Economics | 12% | Federal Reserve, BEA, BLS | Official indicators, some volatility |
| Crypto | 15% | SEC, CoinTelegraph, CoinDesk | High volatility, speculation |
| Technology | 15% | TechCrunch, The Verge | Surprise announcements |
| Entertainment | 18% | Variety, Hollywood Reporter | High subjectivity |
| World | 20% | Reuters, UN, BBC World | Geopolitical uncertainty |
| Other | 25% | Various sources | Unclassified, most conservative |

---

## Prerequisites

### Required Software

- **Node.js**: 22.0.0 or higher (20.x works with warnings)
- **pnpm**: 10.26.2 or higher
- **Git**: Any recent version

### Optional Software

- **Fly CLI**: For deployment to Fly.io (install instructions below)
- **Docker**: For containerized deployment (optional)

### Required Accounts (Optional Features)

- **Polymarket Account**: For live trading
  - Polygon wallet with USDC
  - Token allowances approved
- **Slack Workspace**: For notifications
- **Reddit Account**: For sentiment analysis
- **Logtail Account**: For external logging (Better Stack)
- **Fly.io Account**: For cloud deployment

---

## Configuration Reference

### Environment Variables

All environment variables are optional. The system runs in simulation mode by default.

#### Core Configuration

```bash
# API Server
API_PORT=4000                    # HTTP API port (default: 4000)
POLL_INTERVAL=60000              # Market polling interval in ms (default: 60000)
SIMULATION_DATA=false            # Generate mock news data for testing (default: false)
VERBOSE=false                    # Enable detailed logging (default: false)
```

#### Wallet & Trading (Live Trading)

```bash
# Wallet Configuration (SECURE - use secrets manager in production)
WALLET_PRIVATE_KEY=<private-key>          # Polygon wallet private key (no 0x prefix)
POLYGON_RPC_URL=https://polygon-rpc.com   # Optional: Polygon RPC endpoint
CHAIN_ID=137                               # Polygon mainnet (default: 137)

# Trading Limits
MAX_POSITION_SIZE=100            # Max USDC per position (default: 100)
DAILY_LOSS_LIMIT=50              # Max daily loss in USDC (default: 50)
MAX_OPEN_POSITIONS=5             # Max concurrent positions (default: 5)
```

**Security Note**: Never commit `WALLET_PRIVATE_KEY` to version control. Use environment variables, secrets managers (Fly.io secrets), or encrypted credential stores.

#### Portfolio Management (Phase 7)

```bash
# Portfolio Configuration
PORTFOLIO_CAPITAL=1000           # Total capital for trading (default: 1000)
MAX_RISK_PER_TRADE=0.02         # Max % of capital per trade (default: 2%)
KELLY_FRACTION=0.25             # Fraction of Kelly to use (default: 0.25 = quarter-Kelly)
CORRELATION_THRESHOLD=0.7       # Max correlation for diversification (default: 0.7)
MAX_DRAWDOWN_PERCENT=10         # Max portfolio drawdown % (default: 10%)
```

#### Notifications (Phase 2)

```bash
# Slack Integration
SLACK_WEBHOOK_URL=<webhook-url>  # Slack incoming webhook URL
```

#### Data Sources (Phase 5 & 6)

```bash
# Reddit Integration (optional)
REDDIT_CLIENT_ID=<client-id>         # Reddit app client ID
REDDIT_CLIENT_SECRET=<client-secret> # Reddit app client secret
REDDIT_USER_AGENT="pomabot/1.0"      # User agent string
REDDIT_USERNAME=<username>           # Optional: for user-authenticated access
REDDIT_PASSWORD=<password>           # Optional: for user-authenticated access

# Polymarket API (optional - read-only mode works without)
POLYMARKET_API_KEY=<api-key>         # Optional: for rate limit increases
```

#### Logging (Phase 3)

```bash
# Audit Logging
AUDIT_LOG_PATH=./audit-logs      # Path for CSV audit logs (default: ./audit-logs)

# External Logging (optional)
LOGTAIL_TOKEN=<logtail-token>    # Logtail (Better Stack) source token
```

### Configuration Examples

#### Example 1: Local Simulation (Minimal)

```bash
# No configuration needed! Just run:
pnpm --filter @pomabot/api dev
```

#### Example 2: Full Testing with Mock Data

```bash
SIMULATION_DATA=true
VERBOSE=true
POLL_INTERVAL=10000
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

#### Example 3: Live Trading (Full-Featured)

```bash
# Wallet & Trading
WALLET_PRIVATE_KEY=your_private_key_here
MAX_POSITION_SIZE=100
DAILY_LOSS_LIMIT=50
MAX_OPEN_POSITIONS=5

# Portfolio
PORTFOLIO_CAPITAL=1000
MAX_RISK_PER_TRADE=0.02
KELLY_FRACTION=0.25

# Notifications
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Data Sources
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# Logging
LOGTAIL_TOKEN=your_logtail_token
```

---

## Credential Setup

### 1. Wallet Setup (Live Trading)

#### Creating/Using a Polygon Wallet

**Option A: Create New Wallet**

```bash
# Using Node.js
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"
```

**Option B: Use Existing Wallet**

1. Export private key from MetaMask or other wallet
2. Ensure wallet has USDC on Polygon network
3. Verify wallet address on PolygonScan

**Security Best Practices:**

- ✅ Use a dedicated wallet for trading (not your main wallet)
- ✅ Store private key in secure location (password manager, secrets manager)
- ✅ Never commit private key to version control
- ✅ Use environment variables or Fly.io secrets
- ✅ Start with small amounts ($10-50) for testing
- ❌ Never share private key
- ❌ Never store in plain text files

#### Setting Up Token Allowances

Before live trading, approve token allowances on Polymarket:

1. **Visit Polymarket**: Go to https://polymarket.com
2. **Connect Wallet**: Connect your trading wallet
3. **Deposit USDC**: Ensure you have USDC on Polygon
4. **Approve Contracts**: Polymarket will prompt for approvals
5. **Verify Allowances**: Check that these contracts are approved:
   - USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
   - CTF (Conditional Token Framework): `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`
   - Exchange: `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`
   - Neg Risk Exchange: `0xC5d563A36AE78145C45a50134d48A1215220f80a`

**Alternative Method: Manual Approval**

Use Polygonscan to manually approve token allowances:

1. Go to USDC contract: https://polygonscan.com/address/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
2. Connect wallet
3. Go to "Write Contract" tab
4. Find `approve(address,uint256)` function
5. Approve Exchange contract with high amount (e.g., 1,000,000 USDC)
6. Repeat for other contracts

#### Environment Configuration

```bash
# Set private key (without 0x prefix)
export WALLET_PRIVATE_KEY=your_private_key_without_0x_prefix

# Optional: Custom RPC endpoint
export POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Verify wallet is configured (this should print your address)
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY);
console.log('Wallet Address:', wallet.address);
"
```

---

### 2. Slack Webhook Setup

#### Step-by-Step Instructions

1. **Go to Slack API**: Visit https://api.slack.com/apps
2. **Create New App**: Click "Create New App" → "From scratch"
3. **Name Your App**: e.g., "PomaBot Notifications"
4. **Select Workspace**: Choose your workspace
5. **Enable Incoming Webhooks**: 
   - Go to "Incoming Webhooks" in sidebar
   - Toggle "Activate Incoming Webhooks" to **On**
6. **Add Webhook to Workspace**:
   - Scroll down to "Webhook URLs for Your Workspace"
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., `#trading-bot`)
   - Click "Allow"
7. **Copy Webhook URL**: Copy the webhook URL (starts with `https://hooks.slack.com/services/`)

#### Environment Configuration

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
```

#### Notification Types

When enabled, you'll receive:

- **Trade Opportunities** - New markets that pass 8-check gate
- **Trade Executions** - Order placements and fills
- **Position Closures** - Exit conditions met with P&L
- **Daily Summaries** - Daily P&L and open positions (midnight UTC)
- **System Events** - Start/halt notifications
- **Error Alerts** - API failures, execution errors

#### Testing Your Webhook

```bash
# Test webhook with curl
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message from PomaBot"}'
```

---

### 3. Reddit API Setup

#### Step-by-Step Instructions

1. **Go to Reddit Apps**: Visit https://www.reddit.com/prefs/apps
2. **Scroll to Bottom**: Click "Create App" or "Create Another App"
3. **Fill in Details**:
   - **Name**: "PomaBot"
   - **App type**: Select **"script"** (not web app)
   - **Description**: "Polymarket trading bot"
   - **About URL**: Leave blank or use your GitHub
   - **Redirect URI**: `http://localhost` (required but not used)
4. **Click Create**: App will be created
5. **Copy Credentials**:
   - **Client ID**: Text under app name (short alphanumeric)
   - **Client Secret**: Text next to "secret" (longer alphanumeric)

#### Environment Configuration

```bash
# Required
export REDDIT_CLIENT_ID="your_client_id"
export REDDIT_CLIENT_SECRET="your_client_secret"
export REDDIT_USER_AGENT="pomabot/1.0"

# Optional (for authenticated access, higher rate limits)
export REDDIT_USERNAME="your_reddit_username"
export REDDIT_PASSWORD="your_reddit_password"
```

#### Monitored Subreddits

The bot monitors these subreddits by category:

| Category | Subreddits |
|----------|-----------|
| Politics | r/politics, r/PoliticalDiscussion, r/Conservative, r/neoliberal |
| Crypto | r/CryptoCurrency, r/Bitcoin, r/ethereum |
| Finance | r/wallstreetbets, r/investing, r/stocks |
| Sports | r/sportsbook, r/nba, r/nfl |
| General | r/news, r/worldnews |

#### Testing Reddit Integration

```bash
# Run bot with Reddit enabled
REDDIT_CLIENT_ID=your_id REDDIT_CLIENT_SECRET=your_secret pnpm --filter @pomabot/api dev

# Check logs for: "✅ Reddit integration enabled"
```

---

### 4. Logtail Setup (Optional)

Logtail (Better Stack) provides centralized logging with search, alerts, and dashboards.

#### Step-by-Step Instructions

1. **Create Account**: Go to https://betterstack.com/logtail
2. **Click "Get Started"**: Sign up with email
3. **Create Source**:
   - Click "Sources" → "Add source"
   - Select **"Node.js"**
   - Name it "PomaBot"
4. **Copy Source Token**: Copy the token (starts with `logtail_`)

#### Environment Configuration

```bash
export LOGTAIL_TOKEN="logtail_XXXXXXXXXXXXXXXXXXXX"
```

#### Features

- **Structured Logs**: JSON format with all audit fields
- **Real-time Search**: Query logs instantly
- **Alerts**: Set up notifications for errors
- **Dashboards**: Visualize system activity
- **SQL Queries**: Analyze historical data

#### Free Tier

- **1 GB/month** of log ingestion (plenty for PomaBot)
- **3 days** of retention
- **Unlimited** team members

---

### 5. Fly.io Setup (Deployment)

#### Step-by-Step Instructions

**1. Install Fly CLI**

```bash
# Linux/macOS
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
fly version
```

**2. Create Fly.io Account**

```bash
# Open browser for authentication
fly auth login
```

**3. Launch App (First Time)**

```bash
# From project root
cd pomabot

# Create app (don't deploy yet)
fly launch --name pomabot --region fra --no-deploy

# Choose region close to you:
# - fra (Frankfurt, Germany)
# - iad (Virginia, USA)
# - syd (Sydney, Australia)
# - sin (Singapore)
```

**4. Configure Secrets**

```bash
# Required: Slack webhook
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Optional: Wallet for live trading
fly secrets set WALLET_PRIVATE_KEY="your_private_key"

# Optional: Reddit integration
fly secrets set REDDIT_CLIENT_ID="your_client_id"
fly secrets set REDDIT_CLIENT_SECRET="your_client_secret"

# Optional: External logging
fly secrets set LOGTAIL_TOKEN="your_logtail_token"

# Verify secrets
fly secrets list
```

**5. Deploy**

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status

# View logs
fly logs

# Open in browser
fly open
```

For complete deployment details, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Quickstart Guides

### Quickstart 1: Local Development (Simulation Mode)

Perfect for testing and understanding the system without risk.

#### Installation

```bash
# 1. Clone repository
git clone https://github.com/urbanisierung/pomabot.git
cd pomabot

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run tests to verify
pnpm test
```

#### Running in Simulation Mode

```bash
# Option A: Basic simulation (real market monitoring)
pnpm --filter @pomabot/api dev

# Option B: Full simulation with mock news data (recommended for testing)
SIMULATION_DATA=true POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev

# Option C: Verbose mode (detailed logging)
SIMULATION_DATA=true VERBOSE=true POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev
```

#### View Dashboard

```bash
# In another terminal, start the web dashboard
pnpm dev

# Open browser to http://localhost:3000
```

#### What You'll See

- **Console**: System status, market evaluations, belief updates
- **Dashboard**: Real-time markets, belief ranges, confidence levels
- **No Orders**: System evaluates opportunities but doesn't execute

**This mode requires no configuration or API keys.**

---

### Quickstart 2: Live Trading (Production)

**⚠️ Warning**: This involves real money. Start with small amounts ($10-50) for testing.

#### Prerequisites Checklist

Before enabling live trading:

- [ ] Wallet created and funded with USDC on Polygon
- [ ] Token allowances approved on Polymarket
- [ ] Private key exported and stored securely
- [ ] Slack webhook configured (recommended)
- [ ] Reddit integration configured (optional but recommended)
- [ ] Run simulation mode for at least 1 week
- [ ] Understand trading limits and safety controls

#### Configuration

Create `.env` file in project root:

```bash
# Wallet (SECURE - use secrets manager in production)
WALLET_PRIVATE_KEY=your_private_key_without_0x_prefix

# Trading Limits (start conservative!)
MAX_POSITION_SIZE=10              # Start with $10 positions
DAILY_LOSS_LIMIT=20               # Max $20 loss per day
MAX_OPEN_POSITIONS=2              # Max 2 concurrent positions

# Portfolio
PORTFOLIO_CAPITAL=100             # Start with $100 total
MAX_RISK_PER_TRADE=0.02          # 2% max risk per trade
KELLY_FRACTION=0.25              # Quarter-Kelly sizing

# Notifications (HIGHLY RECOMMENDED)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Data Sources (recommended)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
```

#### Running with Live Trading

```bash
# Load environment variables
source .env

# OR set them inline
WALLET_PRIVATE_KEY=xxx SLACK_WEBHOOK_URL=yyy pnpm --filter @pomabot/api dev
```

#### Monitoring

- **Watch Console**: All trade decisions logged
- **Check Slack**: Receive notifications for all events
- **Monitor Dashboard**: Real-time positions and P&L
- **Review Audit Logs**: `./audit-logs/audit-YYYY-MM-DD.csv`

#### Safety Controls Active

When live trading is enabled:

- ✅ Maximum position size limits
- ✅ Daily loss limits (system halts if exceeded)
- ✅ Maximum open positions limit
- ✅ Kelly Criterion position sizing
- ✅ Drawdown protection
- ✅ Category diversification checks
- ✅ All 8 eligibility checks enforced

#### Gradually Scaling Up

1. **Week 1**: $10 positions, 2 max open, $20 daily limit
2. **Week 2**: If profitable, increase to $25 positions, $50 daily limit
3. **Week 3**: If still profitable, increase to $50 positions, $100 daily limit
4. **Month 2+**: Scale according to performance and comfort

---

### Quickstart 3: Fly.io Deployment

Deploy to production on Fly.io for ~$2-5/month.

#### Prerequisites

- [ ] Fly.io account created
- [ ] Fly CLI installed
- [ ] Slack webhook configured
- [ ] All credentials ready (wallet, Reddit, Logtail)

#### One-Time Setup

```bash
# 1. Authenticate with Fly.io
fly auth login

# 2. Launch app (from project root)
cd pomabot
fly launch --name pomabot --region fra --no-deploy

# 3. Configure secrets
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX"
fly secrets set WALLET_PRIVATE_KEY="your_private_key"  # If live trading
fly secrets set REDDIT_CLIENT_ID="your_client_id"
fly secrets set REDDIT_CLIENT_SECRET="your_client_secret"
fly secrets set LOGTAIL_TOKEN="your_logtail_token"  # Optional

# 4. Deploy
fly deploy
```

#### Verify Deployment

```bash
# Check app status
fly status

# View logs
fly logs

# Open in browser
fly open

# Test API
curl https://pomabot.fly.dev/api/health
```

#### Post-Deployment

```bash
# Monitor logs in real-time
fly logs -f

# SSH into machine
fly ssh console

# Check audit logs
fly ssh console -C "cat /app/audit-logs/audit-$(date +%Y-%m-%d).csv"

# Update app
git pull origin main
fly deploy
```

#### Cost Optimization

The default configuration uses:
- **Machine**: shared-cpu-1x, 256MB RAM (~$1.94/month)
- **Auto-stop**: Stops when idle (saves money)
- **Auto-start**: Starts on request
- **Total**: ~$2-5/month

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete details.

---

## Verification

### Verifying Installation

```bash
# 1. Check Node.js version
node --version  # Should be 22.x or 20.x

# 2. Check pnpm version
pnpm --version  # Should be 10.26.2 or higher

# 3. Install dependencies
pnpm install

# 4. Run verification suite
pnpm verify
```

Expected output:
```
✓ Linting passed
✓ Type checking passed
✓ Tests passed (77 tests)
✓ Build successful
```

### Verifying Simulation Mode

```bash
# Start API service
pnpm --filter @pomabot/api dev
```

Expected console output:
```
============================================================
  Polymarket Autonomous Trading Bot
============================================================

✅ System starting in SIMULATION mode
✅ News RSS feeds initialized (50+ sources)
⚠️  No POLYMARKET_API_KEY found - running in read-only mode
🔄 Starting market monitoring...
```

### Verifying Dashboard

```bash
# Start web dashboard (in another terminal)
pnpm dev

# Open http://localhost:3000
```

Verify you see:
- ✅ System status panel
- ✅ Market list with belief ranges
- ✅ Navigation to performance page

### Verifying Live Trading Setup

```bash
# 1. Check wallet configuration
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY);
console.log('✅ Wallet Address:', wallet.address);
"

# 2. Check USDC balance on Polygon
# Visit: https://polygonscan.com/address/YOUR_WALLET_ADDRESS
# Verify USDC balance > 0

# 3. Start bot with wallet
WALLET_PRIVATE_KEY=your_key pnpm --filter @pomabot/api dev
```

Expected console output:
```
✅ Wallet configured: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
✅ CLOB authentication successful
✅ Live trading ENABLED
```

### Verifying Slack Integration

```bash
# Test webhook with curl
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from PomaBot"}'

# Start bot with Slack
SLACK_WEBHOOK_URL=your_url pnpm --filter @pomabot/api dev
```

Expected:
- ✅ Console shows "Slack notifications enabled"
- ✅ Receive "System Start" message in Slack

### Verifying Reddit Integration

```bash
REDDIT_CLIENT_ID=your_id REDDIT_CLIENT_SECRET=your_secret \
  pnpm --filter @pomabot/api dev
```

Expected console output:
```
✅ Reddit integration enabled
🔄 Fetching Reddit signals from r/politics, r/CryptoCurrency...
```

### Verifying Fly.io Deployment

```bash
# Check deployment status
fly status

# Test health endpoint
curl https://pomabot.fly.dev/api/health

# Expected: {"ok":true,"timestamp":"2025-12-31T..."}

# Check logs for startup
fly logs

# Expected: "System starting", "Slack notifications enabled", etc.
```

### Verifying Audit Logs

```bash
# Check local audit logs
ls -la audit-logs/

# Expected: audit-YYYY-MM-DD.csv files

# View today's log
cat audit-logs/audit-$(date +%Y-%m-%d).csv

# Expected: CSV with columns: timestamp, event, marketId, action, ...
```

---

## Troubleshooting

### Installation Issues

#### Problem: "Unsupported engine" Error

**Symptom:**
```
error pomabot-monorepo@0.1.0: The engine "node" is incompatible with this module
```

**Solution:**
- Upgrade to Node.js 22.x: `nvm install 22` or `nvm use 22`
- Or use Node.js 20.x (works with warnings)
- Check version: `node --version`

---

#### Problem: pnpm Not Found

**Symptom:**
```
bash: pnpm: command not found
```

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (Node.js 16.9+)
corepack enable
corepack prepare pnpm@10.26.2 --activate

# Verify
pnpm --version
```

---

#### Problem: Build Fails with Type Errors

**Symptom:**
```
error TS2307: Cannot find module '@pomabot/core'
```

**Solution:**
```bash
# Clean and rebuild from root
pnpm run build

# Or rebuild individual packages in order
cd packages/shared && pnpm build
cd ../core && pnpm build
cd ../../apps/api && pnpm build
```

---

### Configuration Issues

#### Problem: "No POLYMARKET_API_KEY" Warning

**Symptom:**
```
⚠️  No POLYMARKET_API_KEY found - running in read-only mode
```

**Solution:**
- **This is normal for simulation mode** - no action needed
- For live trading, this is expected unless you need higher rate limits
- API key is optional for basic usage

---

#### Problem: Wallet Private Key Not Recognized

**Symptom:**
```
Error: invalid private key
```

**Solution:**
- Ensure private key has NO `0x` prefix: `WALLET_PRIVATE_KEY=abcd1234...` (not `0x abcd1234...`)
- Check for spaces or newlines in environment variable
- Verify key length: Should be 64 hex characters (32 bytes)

```bash
# Test wallet parsing
node -e "
const { ethers } = require('ethers');
try {
  const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY);
  console.log('✅ Valid wallet:', wallet.address);
} catch (e) {
  console.error('❌ Invalid private key:', e.message);
}
"
```

---

#### Problem: Token Allowances Not Set

**Symptom:**
```
Error: insufficient allowance
```

**Solution:**
1. Visit https://polymarket.com
2. Connect your trading wallet
3. Approve token allowances (USDC, CTF, Exchange)
4. Verify on Polygonscan that allowances are set
5. Wait 1-2 minutes for confirmations

---

### Runtime Issues

#### Problem: No Markets Found

**Symptom:**
```
🔍 Fetched 0 active markets
```

**Solution:**
- Check internet connection
- Verify Polymarket API is accessible: `curl https://gamma-api.polymarket.com/markets`
- Try increasing `POLL_INTERVAL` if rate limited
- Check console for API error messages

---

#### Problem: Slack Notifications Not Received

**Symptom:**
- Console shows "Slack notifications enabled"
- But no messages in Slack channel

**Solution:**
1. Test webhook directly:
   ```bash
   curl -X POST "$SLACK_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text": "Test"}'
   ```
2. Verify webhook URL is correct (starts with `https://hooks.slack.com/services/`)
3. Check Slack app is installed in workspace
4. Verify channel permissions
5. Check for rate limiting (max 10 messages/minute)

---

#### Problem: Reddit Integration Not Working

**Symptom:**
```
❌ Reddit authentication failed
```

**Solution:**
1. Verify credentials:
   ```bash
   echo $REDDIT_CLIENT_ID
   echo $REDDIT_CLIENT_SECRET
   ```
2. Check app type is **"script"** (not web app)
3. Verify redirect URI is `http://localhost`
4. Test authentication:
   ```bash
   npx tsx apps/api/src/test-reddit.ts
   ```
5. Check for rate limiting (60 requests/minute)

---

#### Problem: System Halts Immediately

**Symptom:**
```
⚠️  System HALTED: Calibration failure
```

**Solution:**
- **This is expected behavior** when calibration fails
- Review halt reason in console and audit logs
- Common causes:
  - Coverage deviation too high (>15%)
  - Consecutive invalidations (>5)
  - Drawdown exceeded threshold
- To reset: Restart the bot
- To prevent: Adjust thresholds in configuration

---

### Fly.io Deployment Issues

#### Problem: Build Fails on Fly.io

**Symptom:**
```
Error: failed to build
```

**Solution:**
```bash
# View detailed build logs
fly logs

# Force rebuild without cache
fly deploy --no-cache

# Check fly.toml is present
cat fly.toml
```

---

#### Problem: Out of Memory on Fly.io

**Symptom:**
```
Error: JavaScript heap out of memory
```

**Solution:**
```bash
# Increase memory to 512MB
fly scale memory 512

# Restart app
fly apps restart pomabot

# Check current scale
fly scale show
```

---

#### Problem: Can't Access Deployed App

**Symptom:**
- `fly open` fails or shows error page
- `curl https://pomabot.fly.dev/api/health` times out

**Solution:**
```bash
# Check app status
fly status

# Check if machine is running
fly machine list

# View logs for errors
fly logs -f

# Restart app
fly apps restart pomabot

# Check health check endpoint
curl https://pomabot.fly.dev/api/health
```

---

### Performance Issues

#### Problem: High CPU Usage

**Symptom:**
- CPU constantly at 100%
- Slow response times

**Solution:**
1. Increase `POLL_INTERVAL` to reduce polling frequency:
   ```bash
   POLL_INTERVAL=120000  # 2 minutes
   ```
2. Disable verbose logging: `VERBOSE=false`
3. On Fly.io, scale up to 512MB: `fly scale memory 512`

---

#### Problem: Dashboard Not Updating

**Symptom:**
- Dashboard shows stale data
- No real-time updates

**Solution:**
1. Check API is running: `curl http://localhost:4000/api/health`
2. Verify WebSocket connection (check browser console)
3. Refresh browser: `Ctrl+R` or `Cmd+R`
4. Restart API service: `pnpm --filter @pomabot/api dev`

---

### Trading Issues

#### Problem: No Trades Executed

**Symptom:**
- System finds opportunities
- But no orders placed

**Solution:**
- **This is expected!** High bar for trade entry
- Check eligibility checks in logs
- Common failures:
  - Edge too small (< threshold)
  - Belief width too wide (> 25%)
  - Confidence too low (< 65)
  - Liquidity insufficient
- Review market details: `curl http://localhost:4000/api/markets`

---

#### Problem: Order Rejected

**Symptom:**
```
Error: Order rejected by CLOB
```

**Solution:**
1. Verify wallet has sufficient USDC balance
2. Check token allowances are approved
3. Verify order size is within limits
4. Check market is still open
5. Review CLOB error message in logs

---

### Audit Log Issues

#### Problem: Audit Logs Not Created

**Symptom:**
- `./audit-logs/` directory empty
- No CSV files generated

**Solution:**
1. Check `AUDIT_LOG_PATH` environment variable
2. Verify write permissions: `ls -la audit-logs/`
3. Create directory manually: `mkdir -p audit-logs`
4. Check for errors in console logs

---

#### Problem: Logtail Not Receiving Logs

**Symptom:**
- Logtail dashboard shows no data
- Console shows logs but Logtail empty

**Solution:**
1. Verify `LOGTAIL_TOKEN` is set correctly
2. Check token format: starts with `logtail_`
3. Test connectivity: Check for HTTP errors in logs
4. Verify source is active in Logtail dashboard
5. Wait 1-2 minutes for first logs to appear

---

### Getting Additional Help

If you encounter issues not covered here:

1. **Check Logs**: Review console output and audit logs for error messages
2. **Enable Verbose Mode**: Run with `VERBOSE=true` for detailed logging
3. **Review Documentation**: See [ROADMAP.md](ROADMAP.md), [DEPLOYMENT.md](DEPLOYMENT.md), [USAGE.md](USAGE.md)
4. **GitHub Issues**: Report bugs at https://github.com/urbanisierung/pomabot/issues
5. **Fly.io Support**: For deployment issues, see https://community.fly.io

---

## Additional Resources

### Documentation Files

- **[README.md](README.md)** - Project overview and architecture
- **[ROADMAP.md](ROADMAP.md)** - Development phases and feature roadmap
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed Fly.io deployment guide
- **[USAGE.md](USAGE.md)** - Developer usage examples
- **[MARKET_CATEGORIES.md](MARKET_CATEGORIES.md)** - Supported categories and sources

### Phase Implementation Guides

- **[PHASE3_IMPLEMENTATION.md](PHASE3_IMPLEMENTATION.md)** - Fly.io & Audit Logging
- **[PHASE4_IMPLEMENTATION.md](PHASE4_IMPLEMENTATION.md)** - Live Trading Execution
- **[PHASE5_REDDIT_SETUP.md](PHASE5_REDDIT_SETUP.md)** - Reddit Integration
- **[PHASE6_IMPLEMENTATION.md](PHASE6_IMPLEMENTATION.md)** - News RSS Feeds
- **[PHASE7_IMPLEMENTATION.md](PHASE7_IMPLEMENTATION.md)** - Advanced Features

### External Resources

- **Polymarket**: https://polymarket.com
- **Fly.io Documentation**: https://fly.io/docs
- **Slack API**: https://api.slack.com
- **Reddit API**: https://www.reddit.com/dev/api
- **Logtail**: https://betterstack.com/logtail

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Last Updated:** December 31, 2025  
**Version:** 0.1.0  
**Maintained by:** PomaBot Team
