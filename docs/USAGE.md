# Usage Guide

## Quick Start

### Prerequisites

- Node.js 20+ (ideally 22+)
- npm or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/urbanisierung/pomabot.git
cd pomabot

# Install dependencies
npm install --legacy-peer-deps

# Build all packages
npm run build

# Run tests to verify installation
npm test
```

Expected output:
```
✓ src/belief-engine.test.ts (8 tests)
✓ src/trade-engine.test.ts (12 tests)
✓ src/state-machine.test.ts (12 tests)
Test Files  3 passed (3)
Tests  32 passed (32)
```

## Running the Dashboard

Start the observability dashboard to see the system in action:

```bash
cd packages/frontend
npm run dev
```

Open your browser to `http://localhost:3000` to view:
- Current system state
- Active markets with belief ranges
- Confidence levels
- Trade recommendations
- Unknowns ledger

![Dashboard Preview](docs/dashboard-preview.png)

## Using the Backend API

### Basic Example: Evaluating a Market

```typescript
import {
  performBeliefUpdate,
  evaluateTrade,
  StateMachine,
} from "@pomabot/backend";
import type { BeliefState, Signal, Market, ResolutionCriteria } from "@pomabot/shared";

// 1. Initialize belief state for a market
const initialBelief: BeliefState = {
  belief_low: 40,
  belief_high: 60,
  confidence: 50,
  unknowns: [],
  last_updated: new Date(),
};

// 2. Process a new signal
const signal: Signal = {
  type: "authoritative",
  direction: "up",
  strength: 4,
  conflicts_with_existing: false,
  timestamp: new Date(),
};

const updatedBelief = performBeliefUpdate(
  initialBelief,
  signal,
  [] // signal history
);

console.log("Updated belief:", {
  range: [updatedBelief.belief_low, updatedBelief.belief_high],
  confidence: updatedBelief.confidence,
});

// 3. Evaluate trade eligibility
const market: Market = {
  id: "market1",
  question: "Will Bitcoin ETF be approved?",
  resolution_criteria: "SEC official announcement",
  category: "crypto",
  current_price: 35, // Below belief range
  liquidity: 50000,
  volume_24h: 10000,
  created_at: new Date(),
};

const criteria: ResolutionCriteria = {
  authority: "SEC",
  authority_is_clear: true,
  outcome_is_objective: true,
};

const decision = evaluateTrade(updatedBelief, market, criteria);

if ("side" in decision && decision.side !== "NONE") {
  console.log("Trade recommendation:", {
    side: decision.side,
    entry_price: decision.entry_price,
    exits: decision.exit_conditions,
    rationale: decision.rationale,
  });
} else {
  console.log("No trade:", decision.reason);
}
```

### Working with the State Machine

```typescript
import { StateMachine, checkHaltConditions } from "@pomabot/backend";

const stateMachine = new StateMachine();

// Transition through states
stateMachine.transition("INGEST_SIGNAL", "New data arrived");
stateMachine.transition("UPDATE_BELIEF", "Signal validated");
stateMachine.transition("EVALUATE_TRADE", "Belief updated");

console.log("Current state:", stateMachine.getCurrentState());

// Check halt conditions
checkHaltConditions(
  {
    coverageDeviation: 0.20, // 20% deviation triggers halt
    highConfidenceUnderperforms: false,
    consecutiveInvalidations: 0,
    unknownDensityRising: false,
  },
  stateMachine
);

if (stateMachine.isHalted()) {
  console.log("System halted:", stateMachine.getHaltReason());
}
```

### Calibration Tracking

```typescript
import { CalibrationSystem } from "@pomabot/backend";

const calibration = new CalibrationSystem();

// Add resolved market outcome
calibration.addRecord({
  market_id: "market1",
  belief_at_entry: updatedBelief,
  confidence_at_entry: 75,
  unknowns_at_entry: 0,
  outcome: true, // Market resolved to YES
  resolved_at: new Date(),
  edge_at_entry: 0.15,
});

// Get performance metrics
const metrics = calibration.getMetrics();
console.log("Calibration metrics:", {
  range_coverage: (metrics.range_coverage * 100).toFixed(1) + "%",
  confidence_accuracy: (metrics.confidence_accuracy * 100).toFixed(1) + "%",
  total_markets: metrics.total_markets,
});

// Check for auto-adjustment recommendations
const adjustments = calibration.getAdjustmentRecommendations();
if (adjustments.increaseEdgeThreshold) {
  console.log("Recommendation: Increase edge threshold by", 
    adjustments.increaseEdgeThreshold * 100 + "%");
}
```

## Configuration

### Adjusting System Thresholds

Edit `packages/shared/src/utils.ts` to modify system parameters:

```typescript
export const THRESHOLDS = {
  MIN_CONFIDENCE: 65,        // Minimum confidence for trades
  MAX_BELIEF_WIDTH: 25,      // Maximum belief range width (%)
  MIN_LIQUIDITY: 1000,       // Minimum market liquidity (USD)
  TIME_DECAY_RATE: 0.5,      // Confidence decay per day
  UNKNOWN_PENALTY: 7,        // Confidence penalty per unknown
  CONFLICT_PENALTY: 10,      // Penalty for conflicting signals
  // ... more thresholds
};
```

**Note**: Changing thresholds requires rebuilding: `npm run build`

### Signal Type Impact Caps

Defined in `packages/shared/src/utils.ts`:

```typescript
export const IMPACT_CAPS: Record<string, number> = {
  authoritative: 0.20,  // ±20%
  procedural: 0.15,     // ±15%
  quantitative: 0.10,   // ±10%
  interpretive: 0.07,   // ±7%
  speculative: 0.03,    // ±3%
};
```

## Development Workflow

### Adding a New Signal

```typescript
const newSignal: Signal = {
  type: "quantitative",      // Choose appropriate type
  direction: "up",           // up, down, or neutral
  strength: 3,               // 1-5 scale
  conflicts_with_existing: false,
  timestamp: new Date(),
  source: "Polling data",    // Optional
  description: "Latest polls show 55% approval", // Optional
};
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/backend
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- belief-engine.test.ts
```

### Building for Production

```bash
# Build all packages
npm run build

# Build specific package
cd packages/backend
npm run build

# Type check without building
npm run check
```

## Understanding the System

### System States

The state machine progresses through these states:

1. **OBSERVE** - Monitoring markets, waiting for new data
2. **INGEST_SIGNAL** - Processing incoming signal
3. **UPDATE_BELIEF** - Updating belief ranges based on signal
4. **EVALUATE_TRADE** - Checking trade eligibility
5. **EXECUTE_TRADE** - Placing order (if eligible)
6. **MONITOR** - Watching active positions
7. **HALT** - Emergency stop (requires manual reset)

### Trade Eligibility Checks

A trade must pass **all 8 checks** in order:

1. ✅ Resolution authority is clear
2. ✅ Outcome is objectively verifiable
3. ✅ Liquidity meets minimum threshold
4. ✅ Belief width ≤ 25%
5. ✅ Confidence ≥ 65
6. ✅ Market price is outside belief range
7. ✅ Edge meets minimum (12% politics, 15% crypto)
8. ✅ Exit conditions are defined

**Any failure = No trade**

### Philosophy in Practice

The system is designed to:

- **Do nothing most of the time** - High bar for trade entry
- **Maintain truthful beliefs** - Ranges widen on conflicting signals
- **Survive long-term** - Multiple halt conditions prevent catastrophic losses
- **Be auditable** - Complete history of all decisions

## Common Issues

### Build Fails with "Unsupported engine"

**Solution**: The project requires Node.js 22+, but will work with 20.x. The warning can be safely ignored.

### "No test files found" Error

**Solution**: The shared package has no tests. This is expected. Run tests from backend package:
```bash
cd packages/backend && npm test
```

### Frontend Build Fails

**Solution**: Install dependencies with legacy peer deps flag:
```bash
npm install --legacy-peer-deps
```

### Type Errors in IDE

**Solution**: Build the shared package first:
```bash
cd packages/shared && npm run build
```

## Advanced Usage

### Implementing Data Ingestion

To connect real Polymarket data:

1. Create a data ingestion service in `packages/backend/src/data-ingestion.ts`
2. Poll Polymarket API for market data
3. Transform API responses into `Market` and `Signal` types
4. Feed signals to the belief engine
5. Store belief states per market

### Connecting to Polymarket API

```typescript
// Example structure (not implemented)
class PolymarketConnector {
  async fetchMarkets(): Promise<Market[]> {
    // Fetch from Polymarket API
  }
  
  async placeOrder(decision: TradeDecision): Promise<Order> {
    // Submit limit order
  }
  
  async monitorPositions(): Promise<Position[]> {
    // Check order fills
  }
}
```

### Creating Custom Signal Sources

```typescript
class SignalGenerator {
  async checkSECFilings(): Promise<Signal | undefined> {
    // Scrape SEC website for new filings
    // Return authoritative signal if found
  }
  
  async analyzePollData(): Promise<Signal | undefined> {
    // Aggregate polling data
    // Return quantitative signal
  }
}
```

## Testing Your Changes

Always run the verification suite before committing:

```bash
npm run verify
```

This runs:
1. Linting (code quality)
2. Type checking (TypeScript)
3. Tests (all test vectors)
4. Build (production build)

## Getting Help

- **Specification**: Read `polymarket_ai_deterministic_spec.md` for detailed logic
- **Architecture**: See `IMPLEMENTATION_SUMMARY.md` for component details
- **Philosophy**: Review `README.md` for core principles
- **Tests**: Check `packages/backend/src/*.test.ts` for usage examples

## Next Steps

For production deployment:

1. **Phase 7: Paper Trading** (30-60 days)
   - Run system without executing trades
   - Log all decisions
   - Validate calibration

2. **Phase 8: Limited Launch**
   - Small capital ($100-500)
   - Monitor behavior
   - No parameter changes

3. **Production Enhancements**
   - Add persistent storage (database)
   - Implement real-time data feeds
   - Create alert system
   - Build advanced analytics

## License

MIT - See LICENSE file for details
