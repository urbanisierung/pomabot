
# Polymarket Autonomous Trading AI — Implementation Guide

## Purpose
This document is a **machine-readable and human-auditable instruction manual** for building a fully automated Polymarket trading system.
The system trades **US politics and crypto regulation markets** using belief-based decision making, not price chasing.

The AI must:
- Update beliefs conservatively
- Trade rarely
- Respect resolution mechanics
- Prefer inaction over low-quality trades

---

## TECH STACK (FIXED)

### Backend
- Node.js
- TypeScript
- Runtime: long-running service (24/7)

### Frontend
- Astro
- React
- TailwindCSS

---

## SYSTEM OVERVIEW

```
Data Ingestion → Belief Engine → Trade Eligibility → Execution → Monitoring → Calibration
```

The system is **event-driven**, not tick-driven.

---

# PHASE 0 — FOUNDATIONS (MUST COMPLETE FIRST)

## Milestone 0.1 — Repository & Structure

### Action Items
- Create monorepo:
  - /backend
  - /frontend
  - /shared (types, schemas)
- Enforce strict TypeScript
- Add environment-based configuration

### Success Criteria
- Clean build
- No runtime secrets in code
- Deterministic startup

---

## Milestone 0.2 — Core Domain Models

### Required Types (shared)
- Market
- ResolutionCriteria
- BeliefState
- ConfidenceScore
- Unknown
- Signal
- TradeDecision
- CalibrationRecord

### Success Criteria
- All domain objects serializable
- Versioned schemas

---

# PHASE 1 — DATA INGESTION

## Milestone 1.1 — Polymarket Connector

### Action Items
- Fetch markets
- Store resolution text verbatim
- Poll price, volume, order book
- Persist snapshots

### Rules
- No trading logic here
- No derived signals

### Success Criteria
- Historical price reconstruction possible
- Resolution text immutable once stored

---

## Milestone 1.2 — Primary Source Ingestion

### Required Sources
- SEC filings
- Court rulings
- Official calendars
- Polling data (politics)

### Action Items
- Normalize timestamps
- Tag source type
- Store raw + parsed text

### Success Criteria
- No duplicate ingestion
- All sources traceable

---

# PHASE 2 — BELIEF ENGINE (CORE INTELLIGENCE)

## Milestone 2.1 — Prior Generator

### Action Items
- Initialize belief per market
- Use historical/process-based priors
- Do NOT use market price as prior

### Success Criteria
- Every market has a belief state
- Belief ranges are non-degenerate

---

## Milestone 2.2 — Signal Classification

### Signal Classes
- Authoritative
- Procedural
- Quantitative
- Interpretive
- Speculative

### Action Items
- Enforce max impact caps
- Reject speculative-only updates

### Success Criteria
- No uncapped belief updates
- Signal audit log exists

---

## Milestone 2.3 — Belief Update Logic

### Rules (MANDATORY)
- Update ranges, not points
- Weak/conflicting signals widen range
- Confidence reflects stability, not optimism

### Success Criteria
- Belief updates reproducible
- Unknowns ledger maintained

---

# PHASE 3 — TRADE DECISION ENGINE

## Milestone 3.1 — Tradeability Gate

### Hard Checks
- Clear resolution authority
- Objective outcome
- Liquidity thresholds
- Correlation limits

### Success Criteria
- Non-tradeable markets auto-rejected

---

## Milestone 3.2 — Threshold Enforcement

### Required Thresholds
- Edge: 10–15%
- Confidence: ≥65
- Belief width caps
- Time-to-resolution rules

### Success Criteria
- No trade without passing all checks

---

## Milestone 3.3 — Exit Planning

### Action Items
- Precompute invalidation conditions
- Define belief-based stop exits
- Define profit exits

### Success Criteria
- No trade without an exit plan

---

# PHASE 4 — EXECUTION LAYER

## Milestone 4.1 — Order Execution

### Action Items
- Prefer limit orders
- Partial fills supported
- Slippage checks

### Rules
- Execution cannot override belief logic

---

## Milestone 4.2 — Kill Switches

### Conditions
- Data outages
- Calibration failure
- Consecutive belief stop-outs

### Success Criteria
- System halts safely
- Manual restart required

---

# PHASE 5 — CALIBRATION & LEARNING

## Milestone 5.1 — Outcome Logging

### Action Items
- Log resolved outcomes
- Store belief at entry
- Store confidence & unknowns

---

## Milestone 5.2 — Calibration Metrics

### Required Metrics
- Range coverage
- Confidence bucket accuracy
- Edge effectiveness
- Unknown density

### Auto-Adjustments
- Raise thresholds if overconfident
- Halt if calibration breaks

---

# PHASE 6 — FRONTEND (OBSERVABILITY)

## Milestone 6.1 — Dashboard

### Views
- Active markets
- Belief ranges vs prices
- Confidence over time
- Unknowns ledger

---

## Milestone 6.2 — Audit & Postmortem

### Required
- Full belief history per market
- Trade rationale logs
- Calibration charts

---

# PHASE 7 — DRY RUN & DEPLOYMENT

## Milestone 7.1 — Paper Trading

### Duration
- Minimum 30–60 days

### Criteria
- Calibration health
- Low trade frequency
- No forced overrides

---

## Milestone 7.2 — Limited Capital Launch

### Rules
- Tiny bankroll
- No parameter changes
- Observe behavior, not profit

---

# FINAL COMMANDMENTS

- Do nothing is success
- Beliefs > prices
- Ranges > points
- Calibration > PnL
- Survival > activity

---

## End of Instructions
