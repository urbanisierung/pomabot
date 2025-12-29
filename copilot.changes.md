# Copilot Changes

## 2024-12-29: Fix Polymarket API Response Parsing

### Problem
Running `pnpm --filter @pomabot/api dev` failed with error:
```
Failed to fetch Polymarket markets: TypeError: data.map is not a function
```

### Root Cause
The Polymarket CLOB API returns markets wrapped in a `data` property:
```json
{"data": [...markets...]}
```

But the code expected a raw array response.

### Changes Made

**File:** [apps/api/src/connectors/polymarket.ts](apps/api/src/connectors/polymarket.ts)

1. **Added `PolymarketApiResponse` interface** to properly type the wrapped response
2. **Updated `PolymarketMarketResponse` interface** to match actual API response (uses `tokens` array for prices)
3. **Fixed `fetchMarkets()` method** to extract markets from `data` property
4. **Fixed `transformMarket()` method** to get price from tokens array
5. **Added validation in `getMarket()`** to check required fields before transforming

---

## 2024-12-29: Add Simulation Mode Support

### Problem
The system would halt immediately due to state machine transition issues when processing multiple markets and signals.

### Changes Made

**File:** [apps/api/src/services/trading.ts](apps/api/src/services/trading.ts)

1. **Made poll interval configurable** via `POLL_INTERVAL` environment variable
2. **Added simulation mode logging** - shows mode, poll interval, and verbose status on startup
3. **Skipped individual market fetches in simulation** - uses batch data instead (faster)
4. **Fixed state machine transitions** for multi-signal and multi-market processing
5. **Added `SIMULATION_DATA` env var** to enable mock news data
6. **Reduced logging noise** - verbose signal rejections only when `VERBOSE=true`

**File:** [packages/core/src/state-machine.ts](packages/core/src/state-machine.ts)

1. **Added valid transitions for recovery:**
   - `INGEST_SIGNAL → OBSERVE` (for rejected signals)
   - `UPDATE_BELIEF → OBSERVE` (for multi-signal handling)

**File:** [apps/api/src/connectors/news.ts](apps/api/src/connectors/news.ts)

1. **Added mock SEC news** when `SIMULATION_DATA=true`
2. **Added mock sports news** when `SIMULATION_DATA=true`

### How to Run Simulation

```bash
# Basic simulation (no mock data, just real market monitoring)
pnpm --filter @pomabot/api dev

# Full simulation with mock news data (recommended for testing)
SIMULATION_DATA=true POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev

# Verbose mode (shows all signal rejections)
SIMULATION_DATA=true VERBOSE=true POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POLL_INTERVAL` | 60000 | Polling interval in milliseconds |
| `SIMULATION_DATA` | false | Enable mock news data for testing |
| `VERBOSE` | false | Show detailed signal rejection logs |
| `POLYMARKET_API_KEY` | - | Required for live trading (optional for simulation) |

### Result
- API successfully loads 1000+ markets from Polymarket
- Simulation runs continuously with belief updates
- Confidence evolves over time with multiple signals
- No state machine halts during normal operation
