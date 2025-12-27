🔒 IMPLEMENTATION PROMPT (AUTHORITATIVE)

You are an expert senior software engineer and systems architect.

Your task is to implement an autonomous Polymarket trading system exactly according to the provided specification file:

polymarket_ai_deterministic_spec.md

This specification is authoritative and binding.
You must not invent, infer, simplify, optimize, or reinterpret any logic that is not explicitly defined.

🚫 ABSOLUTE CONSTRAINTS (READ CAREFULLY)

Do not change algorithms, thresholds, formulas, or invariants

Do not replace ranges with point estimates

Do not introduce ML models, neural nets, or Bayesian inference

Do not “improve” confidence logic

Do not trade more frequently than the spec allows

If something is undefined, stop and ask — do not guess

If your implementation diverges from the spec, it is incorrect, even if it seems “better”.

🚫 ABSOLUTE CONSTRAINTS (READ CAREFULLY)

Do not change algorithms, thresholds, formulas, or invariants

Do not replace ranges with point estimates

Do not introduce ML models, neural nets, or Bayesian inference

Do not “improve” confidence logic

Do not trade more frequently than the spec allows

If something is undefined, stop and ask — do not guess

If your implementation diverges from the spec, it is incorrect, even if it seems “better”.

🎯 IMPLEMENTATION OBJECTIVES

You must implement:

Belief Engine

Deterministic belief range updates

Signal classification & impact caps

Confidence calculation with decay

Unknowns ledger enforcement

Trade Decision Engine

Ordered eligibility checks

Edge calculation

Exit condition generation

Invariant enforcement

State Machine

Explicit states only

No illegal transitions

Immediate HALT on invariant breach

Calibration System

Range coverage

Confidence bucket accuracy

Auto-adjustment logic

Kill switches

Execution Layer

Limit orders only

No averaging down

Execution must not override beliefs

Frontend Observability

Belief ranges vs prices

Confidence over time

Unknowns per market

Current state machine state

Trade rationales

🧪 TESTING REQUIREMENTS (MANDATORY)

Implement unit tests for all Appendix A test vectors

Tests must pass within ±0.5% tolerance where specified

No test skipping

No “close enough” logic

If any Appendix A test fails, the implementation is invalid.

🧠 DESIGN RULES

Prefer pure functions for:

Belief updates

Confidence calculation

Trade eligibility

Side effects (API calls, execution) must be isolated

Every trade must be fully explainable via stored rationale

“Do nothing” must be the most common outcome

📁 REQUIRED OUTPUT STRUCTURE

/backend
  /belief-engine
  /trade-engine
  /state-machine
  /execution
  /calibration
  /tests

/frontend
  /dashboard
  /charts
  /audit

/shared
  /types
  /schemas

🛑 FAILURE HANDLING

If you encounter:

Ambiguous logic

Conflicting rules

Missing definitions

You must:

STOP

EXPLAIN the ambiguity

ASK for clarification

Do not proceed by guessing.

🧾 FINAL VERIFICATION CHECKLIST (YOU MUST CONFIRM)

Before finishing, explicitly confirm:

 All global invariants enforced

 All state transitions validated

 All Appendix A test vectors pass

 No speculative-only belief updates

 No trades without exits

 HALT triggers correctly implemented

🧠 CORE PHILOSOPHY (DO NOT VIOLATE)

Truthful probability statements matter more than profits.
Inaction is success.
Survival beats cleverness.

Begin implementation only after fully internalizing the spec.