# Polymarket AI Trading System

An autonomous trading system for Polymarket that uses deterministic belief-based decision making with real-time market and news integration.

## Overview

This system implements a conservative, truth-first approach to prediction market trading:

- **Truthful probability statements** matter more than profits
- **Inaction is success** - most of the time, doing nothing is the correct choice
- **Survival beats cleverness** - conservative beliefs ensure long-term viability
- **Real-time integration** - Connects to Polymarket API and news sources

## Architecture

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
                           │
                           ▼
                    ┌──────────────┐
                    │ Calibration  │
                    │   System     │
                    └──────────────┘
```

## Project Structure

```
pomabot/
├── apps/
│   ├── api/              # Trading service with integrations
│   │   ├── connectors/   # Polymarket & news APIs
│   │   └── services/     # Trading orchestration
│   └── web/              # Observability dashboard
├── packages/
│   ├── core/             # Belief engine, trade engine, state machine
│   └── shared/           # Common types and utilities
```

## Quick Start

### Prerequisites

- Node.js 22+ (or 20+ with warnings)
- pnpm 9+

### Installation

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Running the Trading Bot

```bash
# Set your Polymarket API key (optional for read-only mode)
export POLYMARKET_API_KEY=your_key_here

# Start the trading service
pnpm --filter @pomabot/api dev
```

### Running the Dashboard

```bash
# Start the web dashboard
pnpm dev
```

Open `http://localhost:3000` to view real-time system state.

## Core Components

### Polymarket Integration (`apps/api/connectors/polymarket.ts`)

Real-time integration with Polymarket's CLOB API:
- Fetches active markets and price data
- Places limit orders
- Monitors order book depth
- Tracks market liquidity

### News Aggregation (`apps/api/connectors/news.ts`)

Automated signal generation from multiple sources across **9 market categories**:

**Politics & Crypto:**
- **SEC announcements** - Official regulatory decisions (authoritative signals)
- **Financial news** - Reuters, Bloomberg feeds (interpretive signals)  
- **Polling data** - FiveThirtyEight, RealClearPolitics (quantitative signals)
- **Court rulings** - Federal court decisions (authoritative signals)

**Sports:**
- **ESPN, USA Today Sports** - Game results, statistics (quantitative signals)
- **Official league APIs** - NBA, NFL, MLB, NHL data (authoritative signals)

**Economics:**
- **BEA, Federal Reserve** - Economic indicators, interest rates (authoritative signals)
- **BLS** - Employment and labor data (quantitative signals)

**Entertainment:**
- **Variety, Hollywood Reporter** - Awards coverage (interpretive signals)
- **Official announcements** - Nominees and winners (authoritative signals)

**Weather:**
- **National Weather Service, NOAA** - Weather forecasts (quantitative signals)

**Technology:**
- **TechCrunch, The Verge** - Product launches, tech news (interpretive signals)

**World Events:**
- **Reuters, UN** - Geopolitical news (interpretive signals)

See `MARKET_CATEGORIES.md` for detailed information on all supported categories and edge thresholds.

### Belief Engine (`packages/core/src/belief-engine.ts`)

Deterministically updates belief ranges based on signals:

- **Signal types**: Authoritative, Procedural, Quantitative, Interpretive, Speculative
- **Impact caps**: Each signal type has a maximum impact (e.g., ±20% for authoritative)
- **Conflict handling**: Conflicting signals widen belief ranges
- **Confidence calculation**: Factors in signal quality, unknowns, time decay

### Trade Decision Engine (`packages/core/src/trade-engine.ts`)

Evaluates trade eligibility through ordered checks:

1. Resolution authority clear?
2. Outcome objectively verifiable?
3. Liquidity ≥ minimum?
4. Belief width ≤ 25%?
5. Confidence ≥ 65?
6. Market price outside belief range?
7. Edge ≥ threshold (12% politics, 15% crypto)?
8. Exit plan defined?

**Fail any check → No trade**

### State Machine (`packages/core/src/state-machine.ts`)

Controls system flow:

- States: OBSERVE, INGEST_SIGNAL, UPDATE_BELIEF, EVALUATE_TRADE, EXECUTE_TRADE, MONITOR, HALT
- Enforces valid transitions only
- Immediate HALT on invariant breach

### Calibration System (`packages/core/src/calibration.ts`)

Tracks performance metrics:

- Range coverage (% of outcomes within belief ranges)
- Confidence bucket accuracy
- Edge effectiveness
- Unknown density
- Auto-adjusts thresholds if overconfident
- Halts system if calibration fails

## Global Invariants

These rules are **non-negotiable** and enforced at all times:

1. Beliefs are ranges, never point estimates
2. Confidence cannot increase if unknown count increases
3. Trades cannot occur outside belief bounds
4. Trades cannot occur without predefined exits
5. Speculative signals cannot move beliefs alone
6. Calibration failure halts trading
7. Inaction is always valid and preferred

**Violation of any invariant = system halt**

## Installation

```bash
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development

### API Service (Trading Bot)

```bash
# Development mode with hot reload
pnpm --filter @pomabot/api dev

# Production build
pnpm --filter @pomabot/api build
pnpm --filter @pomabot/api start
```

### Web Dashboard

```bash
# Development server
pnpm dev  # or: pnpm --filter @pomabot/web dev

# Production build
pnpm --filter @pomabot/web build
```

### Core Package (Belief/Trade Engines)

```bash
cd packages/core
pnpm build
pnpm test
```

## Market Categories

The system now supports **9 market categories** with category-specific edge thresholds:

| Category | Edge Threshold | Characteristics |
|----------|----------------|-----------------|
| Weather | 8% | Highly predictable, scientific models |
| Sports | 10% | Rich statistics, clear outcomes |
| Politics | 12% | Polls, official data |
| Economics | 12% | Official indicators, some volatility |
| Crypto | 15% | High volatility, speculation |
| Technology | 15% | Surprise announcements |
| Entertainment | 18% | High subjectivity |
| World | 20% | Geopolitical uncertainty |
| Other | 25% | Unclassified, most conservative |

For complete details on news sources and implementation, see `MARKET_CATEGORIES.md`.

## Configuration

### Environment Variables

```bash
# Required for live trading (optional for monitoring)
POLYMARKET_API_KEY=your_api_key_here

# Optional: Polling interval in milliseconds
POLL_INTERVAL=60000
```

## Testing

All tests are based on Appendix A test vectors from the specification:

- **A1**: Belief update with authoritative signal
- **A2**: Conflicting procedural signal handling
- **A3**: Confidence decay over time
- **A4**: Trade eligibility edge check
- **A5**: Trade eligibility belief width check
- **A7**: Invariant enforcement

All tests must pass within ±0.5% tolerance.

## Configuration

System thresholds (defined in `packages/shared/src/utils.ts`):

- **MIN_CONFIDENCE**: 65
- **MAX_BELIEF_WIDTH**: 25%
- **MIN_EDGE**: 12% (politics), 15% (crypto)
- **TIME_DECAY_RATE**: 0.5 per day
- **UNKNOWN_PENALTY**: 7 per unknown
- **BASE_CONFIDENCE**: 50

## Philosophy

> The system exists to make truthful probabilistic statements and only trade when the market is meaningfully wrong.

- Profit is a consequence, not a control variable
- Ranges > Points
- Calibration > PnL
- Survival > Activity

## Specification

Full implementation details in:

- `polymarket_ai_deterministic_spec.md` - Authoritative specification
- `polymarket_ai_implementation_guide.md` - Implementation phases
- `polymarket_ai_implementation_prompt.md` - Implementation constraints

## License

MIT