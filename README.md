# Polymarket AI Trading System

An autonomous trading system for Polymarket that uses deterministic belief-based decision making.

## Overview

This system implements a conservative, truth-first approach to prediction market trading:

- **Truthful probability statements** matter more than profits
- **Inaction is success** - most of the time, doing nothing is the correct choice
- **Survival beats cleverness** - conservative beliefs ensure long-term viability

## Architecture

```
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

- `/packages/shared` - Core domain models and types
- `/packages/backend` - Belief engine, trade engine, state machine, calibration
- `/packages/frontend` - Observability dashboard (Astro + React + TailwindCSS)

## Core Components

### Belief Engine

Deterministically updates belief ranges based on signals:

- **Signal types**: Authoritative, Procedural, Quantitative, Interpretive, Speculative
- **Impact caps**: Each signal type has a maximum impact (e.g., ±20% for authoritative)
- **Conflict handling**: Conflicting signals widen belief ranges
- **Confidence calculation**: Factors in signal quality, unknowns, time decay

### Trade Decision Engine

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

### State Machine

Controls system flow:

- States: OBSERVE, INGEST_SIGNAL, UPDATE_BELIEF, EVALUATE_TRADE, EXECUTE_TRADE, MONITOR, HALT
- Enforces valid transitions only
- Immediate HALT on invariant breach

### Calibration System

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
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

## Development

### Backend

```bash
cd packages/backend
npm run build
npm test
```

### Frontend

```bash
cd packages/frontend
npm run dev    # Start dev server at http://localhost:3000
npm run build  # Build for production
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