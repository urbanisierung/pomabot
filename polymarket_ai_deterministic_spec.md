
# Polymarket Autonomous Trading AI  
## Deterministic Execution Specification (Authoritative)

**Audience:** AI systems and engineers implementing the system  
**Goal:** Eliminate interpretation ambiguity  
**Status:** This document overrides all previous specs

---

# 0. SYSTEM PRIME DIRECTIVE

> The system exists to make *truthful probabilistic statements* and only trade when the market is meaningfully wrong.

Profit is a consequence, not a control variable.

---

# 1. GLOBAL INVARIANTS (NON-NEGOTIABLE)

These rules are enforced at all times.

1. Beliefs are ranges, never point estimates
2. Confidence cannot increase if unknown count increases
3. Trades cannot occur outside belief bounds
4. Trades cannot occur without predefined exits
5. Speculative signals cannot move beliefs alone
6. Calibration failure halts trading
7. Inaction is always a valid and preferred outcome

Violation of any invariant = system halt.

---

# 2. CORE DATA MODELS (LOGIC-LEVEL)

## 2.1 BeliefState
```
belief_low: number   // 0–100
belief_high: number  // 0–100
confidence: number   // 0–100
unknowns: Unknown[]
last_updated: timestamp
```

## 2.2 Signal
```
type: authoritative | procedural | quantitative | interpretive | speculative
direction: up | down | neutral
strength: 1–5
conflicts_with_existing: boolean
timestamp
```

## 2.3 TradeDecision
```
side: YES | NO | NONE
size_usd
entry_price
exit_conditions
rationale_hash
```

---

# 3. SYSTEM STATE MACHINE

## States
```
OBSERVE
INGEST_SIGNAL
UPDATE_BELIEF
EVALUATE_TRADE
EXECUTE_TRADE
MONITOR
HALT
```

## Transitions
- OBSERVE → INGEST_SIGNAL (new data)
- INGEST_SIGNAL → UPDATE_BELIEF (validated)
- UPDATE_BELIEF → EVALUATE_TRADE (belief changed)
- EVALUATE_TRADE → EXECUTE_TRADE (all checks pass)
- EVALUATE_TRADE → OBSERVE (no trade)
- ANY → HALT (invariant breach)

No other transitions allowed.

---

# 4. BELIEF UPDATE ALGORITHM (DETERMINISTIC)

## 4.1 Signal Eligibility
```
IF signal.type == speculative AND no other signal present:
  REJECT update
```

## 4.2 Impact Caps
```
authoritative: ±20%
procedural: ±15%
quantitative: ±10%
interpretive: ±7%
speculative: ±3%
```

## 4.3 Update Formula

```
range_width = belief_high − belief_low
max_shift = impact_cap * (signal.strength / 5)

direction_multiplier =
  +1 if signal.direction == up
  -1 if signal.direction == down
  0 if neutral

shift = min(max_shift, range_width * 0.6)

belief_low  += shift * direction_multiplier
belief_high += shift * direction_multiplier
```

## 4.4 Conflict Handling
```
IF signal.conflicts_with_existing:
  belief_low  -= range_width * 0.25
  belief_high += range_width * 0.25
```

Clamp beliefs to [0,100].

---

# 5. CONFIDENCE CALCULATION (EXACT)

## 5.1 Base
```
confidence = 50
```

## 5.2 Adjustments
```
+10 per authoritative signal
+5 per procedural signal
−7 per unresolved unknown
−10 if conflicting signals present
−time_decay
```

## 5.3 Time Decay
```
time_decay = days_since_last_signal * 0.5
```

## 5.4 Bounds
```
confidence = clamp(confidence, 30, 95)
```

---

# 6. UNKNOWNS LEDGER RULES

## Add Unknown When:
- Outcome depends on unresolved legal decision
- Authority intent unclear
- Timeline ambiguous

## Remove Unknown When:
- Official ruling issued
- Authority statement resolves ambiguity

## Enforcement
```
IF unknowns increase:
  confidence MUST decrease
```

---

# 7. TRADE ELIGIBILITY CHECK (ORDERED)

Evaluation is strict and sequential.

1. Resolution authority clear?
2. Outcome objectively verifiable?
3. Liquidity ≥ minimum?
4. Belief width ≤ 25%?
5. Confidence ≥ 65?
6. Market price outside belief range?
7. Edge ≥ threshold?
8. Exit plan defined?

Fail any step → STOP (no trade).

---

# 8. EDGE CALCULATION

```
edge =
  if buying YES:
    belief_low − market_price
  if buying NO:
    market_price − belief_high
```

### Minimum Edge
- Politics: 12%
- Crypto: 15%

---

# 9. EXIT CONDITIONS (MANDATORY)

Each trade must define:

### Invalidation Exit
- Belief range shifts against position by ≥50%

### Profit Exit
- Market converges inside belief range midpoint

### Emergency Exit
- Invariant breach
- Data feed failure

---

# 10. EXECUTION RULES

- Use limit orders only
- No averaging down
- Partial fills allowed
- Execution cannot override belief logic

---

# 11. CALIBRATION METRICS

Tracked per resolved market:

- Range coverage
- Confidence bucket accuracy
- Edge vs outcome
- Unknown density

---

# 12. AUTO-ADJUSTMENT RULES

## Overconfidence Detected
- Increase edge threshold +3%
- Decrease confidence by −5 globally

## Underconfidence Detected
- Narrow belief ranges −2%
- Only after ≥50 resolved markets

---

# 13. HALT CONDITIONS

Immediate halt if:

- Coverage deviation >15%
- High-confidence bucket underperforms low-confidence
- 3 belief invalidations in a row
- Unknown density rising system-wide

Manual restart required.

---

# 14. FRONTEND REQUIREMENTS (OBSERVABILITY)

Dashboard must show:
- Belief ranges vs market prices
- Confidence over time
- Unknowns per market
- State machine state
- Trade rationales

---

# 15. FINAL RULE

> If forced to choose between action and truthfulness — choose truthfulness.

END OF SPEC


---

# APPENDIX A — TEST VECTORS (MANDATORY)

This appendix defines **canonical input → output examples**.
Any compliant implementation MUST reproduce these results (±0.5% tolerance).

---

## A1. Belief Update — Single Authoritative Signal

### Input
```
BeliefState:
  belief_low: 40
  belief_high: 60
  confidence: 55
  unknowns: 2

Signal:
  type: authoritative
  direction: up
  strength: 4
  conflicts_with_existing: false
```

### Calculation
```
range_width = 20
impact_cap = 20%
max_shift = 20 * (4/5) = 16
shift = min(16, 20 * 0.6) = 12
```

### Expected Output
```
belief_low: 52
belief_high: 72
confidence: 65
```

---

## A2. Belief Update — Conflicting Procedural Signal

### Input
```
BeliefState:
  belief_low: 55
  belief_high: 70
  confidence: 68
  unknowns: 1

Signal:
  type: procedural
  direction: down
  strength: 3
  conflicts_with_existing: true
```

### Calculation
```
range_width = 15
impact_cap = 15%
max_shift = 15 * (3/5) = 9
shift = min(9, 15 * 0.6) = 9
Conflict widening = 15 * 0.25 = 3.75
```

### Expected Output
```
belief_low: 42.25
belief_high: 73.75
confidence: 51
```

---

## A3. Confidence Decay with No New Signals

### Input
```
BeliefState:
  confidence: 70
days_since_last_signal: 10
unknowns: 2
```

### Calculation
```
time_decay = 10 * 0.5 = 5
unknown_penalty = 2 * 7 = 14
```

### Expected Output
```
confidence = 70 - 5 - 14 = 51
```

---

## A4. Trade Eligibility — PASS Case

### Input
```
belief_low: 65
belief_high: 80
confidence: 78
market_price: 52
category: crypto
```

### Calculation
```
edge = 65 - 52 = 13%
minimum_edge = 15%
```

### Expected Output
```
TRADE = NO (edge insufficient)
```

---

## A5. Trade Eligibility — FAIL on Width

### Input
```
belief_low: 40
belief_high: 75
confidence: 85
market_price: 20
```

### Expected Output
```
NO TRADE (belief width > 25%)
```

---

## A6. Halt Condition — Overconfidence

### Input (Calibration Window)
```
Expected coverage: 85%
Observed coverage: 65%
```

### Expected Output
```
SYSTEM STATE → HALT
```

---

## A7. Invariant Enforcement

### Input
```
unknowns increase from 1 → 3
confidence increases from 60 → 65
```

### Expected Output
```
INVALID STATE → HALT
```

---

# END OF APPENDIX
