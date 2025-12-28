# API Service - Polymarket Integration

The API service provides real-time integration with Polymarket and news sources to power the autonomous trading system.

## Features

### Polymarket Integration (`connectors/polymarket.ts`)

- **Market Data**: Fetches active markets from Polymarket CLOB API
- **Order Execution**: Places limit orders via API
- **Order Book**: Monitors bid/ask spreads
- **Price Updates**: Tracks real-time price changes

### News Aggregation (`connectors/news.ts`)

- **SEC Announcements**: Monitors official SEC filings and press releases
- **Financial News**: Aggregates from Reuters, Bloomberg, and other sources
- **Polling Data**: Fetches political polling from FiveThirtyEight and RealClearPolitics
- **Signal Generation**: Automatically classifies news into signal types (authoritative, procedural, quantitative, interpretive, speculative)

### Trading Service (`services/trading.ts`)

Orchestrates the complete trading workflow:

1. **Monitor**: Continuously polls Polymarket and news sources
2. **Aggregate**: Generates signals from news relevant to each market
3. **Update**: Applies signals to belief engine
4. **Evaluate**: Checks trade eligibility through 8 ordered gates
5. **Execute**: Places orders when all conditions met
6. **Track**: Logs calibration data for performance monitoring

## Setup

### Environment Variables

```bash
# Required for placing trades (optional for read-only mode)
POLYMARKET_API_KEY=your_api_key_here

# Optional: Configure polling interval (default: 60000ms = 1 minute)
POLL_INTERVAL=60000
```

### Running the Service

```bash
# Development mode with hot reload
pnpm --filter @pomabot/api dev

# Production mode
pnpm --filter @pomabot/api build
pnpm --filter @pomabot/api start
```

## Architecture

```
┌─────────────────────┐
│  Polymarket API     │
│  - Markets          │
│  - Prices           │
│  - Order Book       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐     ┌──────────────────┐
│  Trading Service    │────▶│   News Feeds     │
│  - Monitor Loop     │     │   - SEC          │
│  - Signal Gen       │     │   - Reuters      │
│  - Belief Update    │     │   - Polls        │
│  - Trade Eval       │     └──────────────────┘
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Core Engine       │
│   - Belief Engine   │
│   - Trade Engine    │
│   - State Machine   │
│   - Calibration     │
└─────────────────────┘
```

## Polymarket API Endpoints

The connector uses these Polymarket CLOB API endpoints:

- `GET /markets?active=true` - List active markets
- `GET /markets/:id` - Get specific market
- `GET /markets/:id/book` - Get order book
- `POST /orders` - Place order

Full API documentation: https://docs.polymarket.com/

## News Sources

### Authoritative Sources
- **SEC**: https://www.sec.gov/news/pressreleases.rss
- **Court Rulings**: Federal court dockets

### Quantitative Sources
- **FiveThirtyEight**: Polling aggregation
- **RealClearPolitics**: Polling averages

### Financial News
- **Reuters**: Business news feed
- **Bloomberg**: Financial market updates

## Signal Classification

The news aggregator automatically classifies signals:

| Type | Sources | Impact Cap | Examples |
|------|---------|------------|----------|
| **Authoritative** | SEC, Courts | ±20% | "SEC approves Bitcoin ETF" |
| **Procedural** | Filings, Schedules | ±15% | "Hearing scheduled for March 1" |
| **Quantitative** | Polls, Data | ±10% | "Poll shows 52% approval" |
| **Interpretive** | Analysts | ±7% | "Experts predict approval likely" |
| **Speculative** | Rumors | ±3% | "Sources suggest delay possible" |

## Monitoring

The service logs key events:

```
🚀 Starting Polymarket trading service...
📊 Loading markets from Polymarket...
Found 143 active markets
✅ Trading service running

📈 Updated belief for "Will Bitcoin ETF be approved?":
   Range: [65, 80]
   Confidence: 75

💡 Trade opportunity: YES on "Will Bitcoin ETF be approved?"
   Entry: 52%
   Edge: 13%
   Rationale: Market underpriced relative to belief
```

## Safety Features

- **Read-Only Mode**: Works without API key for monitoring only
- **State Machine**: Enforces valid state transitions
- **Halt Conditions**: Automatic stop on calibration failure
- **Rate Limiting**: Respects API rate limits
- **Error Handling**: Graceful degradation on API failures

## Development

### Adding New News Sources

1. Add RSS feed URL to `NEWS_AGGREGATOR.RSS_FEEDS`
2. Implement parsing logic in `fetchNews()`
3. Update signal classification rules

### Customizing Signal Generation

Edit `analyzeNewsItem()` in `news.ts` to adjust:
- Keyword matching
- Sentiment analysis
- Signal strength calculation
- Direction determination

## Testing

```bash
# Run without API key to test news aggregation
pnpm --filter @pomabot/api dev

# Monitor console for signal generation
# No trades will be placed without POLYMARKET_API_KEY
```

## Production Deployment

1. Set `POLYMARKET_API_KEY` in environment
2. Configure monitoring/alerting
3. Set up logging infrastructure
4. Start with small capital for validation
5. Monitor calibration metrics closely

## Troubleshooting

**No markets loaded**: Check Polymarket API availability
**No signals generated**: Verify news feed URLs are accessible
**Orders not placing**: Confirm API key is valid and has permissions
**System halted**: Check calibration metrics, may need manual reset
