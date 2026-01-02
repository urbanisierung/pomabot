# Phase 11: Paper Trading Implementation - Summary

## Overview

Phase 11 implements **Paper Trading & Prediction Validation**, enabling the bot to track simulated positions until market resolution, calculate actual P&L, and validate trading strategy performance.

## Key Features

### 1. Position Tracking
- **Persistent Storage**: Paper positions saved to `./data/paper-positions.json` (configurable)
- **Lifecycle Management**: Positions tracked from OPEN → RESOLVED (WIN/LOSS/EXPIRED)
- **Restart Safe**: Positions survive bot restarts

### 2. Automatic Resolution Detection
- **Background Polling**: Checks every 5 minutes (configurable)
- **Market Status**: Detects resolved, closed, or expired markets
- **Outcome Extraction**: Determines YES/NO winner from Polymarket API

### 3. Performance Metrics
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Total wins / Total losses
- **Edge Accuracy**: How often edge predictions were correct
- **Category Performance**: Win rates by market category (crypto, sports, etc.)

### 4. Calibration Analysis
- **Brier Score**: Measures prediction accuracy (lower is better)
- **Calibration Buckets**: Groups trades by belief ranges
- **Recommendations**: Suggests threshold adjustments

## Usage

### Environment Variables

```bash
# Enable paper trading (enabled by default in simulation mode)
PAPER_TRADING_ENABLED=true

# Virtual starting capital
PAPER_PORTFOLIO_CAPITAL=10000

# Storage location
PAPER_POSITIONS_FILE=./data/paper-positions.json

# Resolution check interval (5 minutes default)
PAPER_RESOLUTION_CHECK_INTERVAL=300000
```

### Running the Bot

```bash
# Start in simulation mode with paper trading
pnpm --filter @pomabot/api dev

# The bot will:
# 1. Create paper positions for each simulated trade
# 2. Store them to disk
# 3. Check for resolutions every 5 minutes
# 4. Calculate P&L when markets resolve
```

### API Endpoints

#### Get All Positions
```bash
curl http://localhost:4000/api/paper-trading/positions
```

Response:
```json
{
  "positions": [
    {
      "id": "paper_abc123_xyz",
      "marketId": "0x123...",
      "marketQuestion": "Will Bitcoin reach $100k by March 2026?",
      "category": "crypto",
      "side": "YES",
      "entryPrice": 45,
      "beliefLow": 55,
      "beliefHigh": 70,
      "edge": 10,
      "sizeUsd": 100,
      "entryTimestamp": "2026-01-01T00:00:00Z",
      "status": "OPEN"
    }
  ],
  "total": 1
}
```

#### Get Performance Metrics
```bash
curl http://localhost:4000/api/paper-trading/metrics
```

Response:
```json
{
  "totalPositions": 10,
  "resolvedPositions": 8,
  "openPositions": 2,
  "totalPnL": 150.50,
  "unrealizedPnL": 0,
  "winRate": 62.5,
  "averageWin": 45.20,
  "averageLoss": 30.10,
  "profitFactor": 2.15,
  "edgeAccuracy": 75.0,
  "beliefCoverageRate": 87.5,
  "avgEdgeOnWins": 12.5,
  "avgEdgeOnLosses": 8.3,
  "categoryPerformance": {
    "crypto": {
      "winRate": 66.7,
      "avgPnL": 25.50,
      "trades": 6
    }
  }
}
```

#### Get Calibration Analysis
```bash
curl http://localhost:4000/api/paper-trading/calibration
```

Response:
```json
{
  "calibrationBuckets": [
    {
      "beliefRange": "60-70%",
      "predictedProbability": 65,
      "actualWinRate": 62.5,
      "trades": 8,
      "calibrationError": 2.5
    }
  ],
  "brierScore": 0.18,
  "overallCalibration": 3.2,
  "recommendations": [
    "Good calibration overall",
    "Consider more data for 80-90% range"
  ]
}
```

## How It Works

### 1. Position Creation
When a simulated trade is executed:
```typescript
// Automatically created by TradingService
await paperTrading.createPosition({
  marketId: "0x123...",
  marketQuestion: "Will Bitcoin reach $100k?",
  category: "crypto",
  side: "YES",
  entryPrice: 45,
  beliefLow: 55,
  beliefHigh: 70,
  edge: 10,
  sizeUsd: 100,
});
```

### 2. Resolution Detection
Every 5 minutes (configurable), the system checks:
```typescript
async function checkPaperTradingResolutions() {
  const openPositions = paperTrading.getOpenPositions();
  
  for (const position of openPositions) {
    const market = await polymarket.getMarket(position.marketId);
    
    if (market.resolved_at || market.resolution_outcome !== undefined) {
      const actualOutcome = market.resolution_outcome === true ? "YES" : "NO";
      const exitPrice = actualOutcome === "YES" ? 100 : 0;
      
      await paperTrading.resolvePosition(
        position.id,
        actualOutcome,
        exitPrice
      );
    }
  }
}
```

### 3. P&L Calculation
```typescript
// P&L = (exitPrice - entryPrice) * sizeUsd / 100

// Example: YES position at 45%, market resolves YES (exitPrice = 100)
pnl = (100 - 45) * 100 / 100 = $55 profit

// Example: YES position at 60%, market resolves NO (exitPrice = 0)
pnl = (0 - 60) * 100 / 100 = -$60 loss
```

## Testing

Run the test suite:
```bash
cd packages/core
pnpm test paper-trading.test.ts
```

All 23 paper trading tests should pass:
- Position creation and persistence ✅
- Position resolution (WIN/LOSS/EXPIRED) ✅
- P&L calculations ✅
- Performance metrics ✅
- Calibration analysis ✅

## Files Changed

### New Files
- `packages/core/src/paper-trading.ts` - Core paper trading implementation
- `packages/core/src/paper-trading.test.ts` - Comprehensive test suite

### Modified Files
- `packages/core/src/index.ts` - Export paper trading module
- `apps/api/src/index.ts` - Add paper trading API endpoints
- `apps/api/src/services/trading.ts` - Integrate paper trading
- `ROADMAP.md` - Update Phase 11 status to Complete

## Next Steps

1. **Run in Simulation Mode**: Let the bot create paper positions
2. **Wait for Resolutions**: Markets will resolve over hours/days
3. **Analyze Performance**: Check metrics at `/api/paper-trading/metrics`
4. **Tune Parameters**: Use calibration analysis to adjust thresholds
5. **Go Live**: Once paper trading shows consistent profitability, enable real trading

## Future Enhancements (Optional)

- [ ] Web dashboard for paper trading visualization
- [ ] Slack notifications for paper trade results
- [ ] Weekly calibration reports
- [ ] Unrealized P&L tracking based on current prices

---

*Last updated: January 2, 2026*
