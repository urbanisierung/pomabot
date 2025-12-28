/**
 * Test Suite: Trade Decision Engine
 */

import { describe, test, expect } from "vitest";
import {
  evaluateTrade,
  checkBeliefWidth,
  checkConfidence,
  checkEdge,
  calculateEdge,
  validateTradeBoundsInvariant,
  validateTradeExitsInvariant,
} from "./trade-engine";
import type { BeliefState, Market, ResolutionCriteria, TradeDecision } from "@pomabot/shared";

describe("Trade Eligibility Checks", () => {
  test("should reject trade when belief width exceeds 25%", () => {
    const belief: BeliefState = {
      belief_low: 40,
      belief_high: 75,
      confidence: 85,
      unknowns: [],
      last_updated: new Date(),
    };

    const result = checkBeliefWidth(belief);
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("belief_width");
  });

  test("should reject trade when confidence is below 65", () => {
    const belief: BeliefState = {
      belief_low: 50,
      belief_high: 70,
      confidence: 60,
      unknowns: [],
      last_updated: new Date(),
    };

    const result = checkConfidence(belief);
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("confidence");
  });

  test("should reject crypto trade when edge is below 15%", () => {
    const edge = 0.13; // 13%
    const result = checkEdge(edge, "crypto");
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("edge");
  });

  test("should accept politics trade when edge is above 12%", () => {
    const edge = 0.13; // 13%
    const result = checkEdge(edge, "politics");
    
    expect(result.eligible).toBe(true);
  });

  test("should accept sports trade when edge is above 10%", () => {
    const edge = 0.11; // 11%
    const result = checkEdge(edge, "sports");
    
    expect(result.eligible).toBe(true);
  });

  test("should reject sports trade when edge is below 10%", () => {
    const edge = 0.09; // 9%
    const result = checkEdge(edge, "sports");
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("edge");
  });

  test("should accept weather trade when edge is above 8%", () => {
    const edge = 0.09; // 9%
    const result = checkEdge(edge, "weather");
    
    expect(result.eligible).toBe(true);
  });

  test("should reject entertainment trade when edge is below 18%", () => {
    const edge = 0.15; // 15%
    const result = checkEdge(edge, "entertainment");
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("edge");
  });

  test("should reject world trade when edge is below 20%", () => {
    const edge = 0.18; // 18%
    const result = checkEdge(edge, "world");
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("edge");
  });

  test("should use highest threshold (25%) for unknown category", () => {
    const edge = 0.22; // 22%
    const result = checkEdge(edge, "unknown-category");
    
    expect(result.eligible).toBe(false);
    expect(result.failedCheck).toBe("edge");
  });
});

describe("Edge Calculation", () => {
  test("should calculate positive edge for YES trade when price below belief", () => {
    const belief: BeliefState = {
      belief_low: 65,
      belief_high: 80,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const marketPrice = 52;
    const { edge, side } = calculateEdge(belief, marketPrice);

    expect(side).toBe("YES");
    expect(edge).toBe(13); // 65 - 52
  });

  test("should calculate positive edge for NO trade when price above belief", () => {
    const belief: BeliefState = {
      belief_low: 30,
      belief_high: 45,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const marketPrice = 60;
    const { edge, side } = calculateEdge(belief, marketPrice);

    expect(side).toBe("NO");
    expect(edge).toBe(15); // 60 - 45
  });

  test("should return NONE when price is within belief range", () => {
    const belief: BeliefState = {
      belief_low: 40,
      belief_high: 60,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const marketPrice = 50;
    const { edge, side } = calculateEdge(belief, marketPrice);

    expect(side).toBe("NONE");
    expect(edge).toBe(0);
  });
});

describe("Trade Invariants", () => {
  test("should validate trade within bounds for YES trade", () => {
    const belief: BeliefState = {
      belief_low: 65,
      belief_high: 80,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const decision: TradeDecision = {
      side: "YES",
      size_usd: 100,
      entry_price: 55, // Below belief_low
      exit_conditions: [],
      rationale: "Test",
      rationale_hash: "abc123",
      timestamp: new Date(),
    };

    const isValid = validateTradeBoundsInvariant(decision, belief);
    expect(isValid).toBe(true);
  });

  test("should detect invariant violation for YES trade above belief range", () => {
    const belief: BeliefState = {
      belief_low: 65,
      belief_high: 80,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const decision: TradeDecision = {
      side: "YES",
      size_usd: 100,
      entry_price: 70, // Within belief range - VIOLATION
      exit_conditions: [],
      rationale: "Test",
      rationale_hash: "abc123",
      timestamp: new Date(),
    };

    const isValid = validateTradeBoundsInvariant(decision, belief);
    expect(isValid).toBe(false);
  });

  test("should detect missing exit conditions", () => {
    const decision: TradeDecision = {
      side: "YES",
      size_usd: 100,
      entry_price: 55,
      exit_conditions: [], // EMPTY - VIOLATION
      rationale: "Test",
      rationale_hash: "abc123",
      timestamp: new Date(),
    };

    const isValid = validateTradeExitsInvariant(decision);
    expect(isValid).toBe(false);
  });

  test("should validate trade with proper exit conditions", () => {
    const decision: TradeDecision = {
      side: "YES",
      size_usd: 100,
      entry_price: 55,
      exit_conditions: [
        { type: "invalidation", description: "Belief shifts against position" },
        { type: "profit", description: "Target reached" },
      ],
      rationale: "Test",
      rationale_hash: "abc123",
      timestamp: new Date(),
    };

    const isValid = validateTradeExitsInvariant(decision);
    expect(isValid).toBe(true);
  });
});

describe("Complete Trade Evaluation", () => {
  test("should reject trade when resolution authority is unclear", () => {
    const belief: BeliefState = {
      belief_low: 65,
      belief_high: 80,
      confidence: 75,
      unknowns: [],
      last_updated: new Date(),
    };

    const market: Market = {
      id: "market1",
      question: "Will X happen?",
      resolution_criteria: "TBD",
      category: "politics",
      current_price: 50,
      liquidity: 10000,
      volume_24h: 5000,
      created_at: new Date(),
    };

    const criteria: ResolutionCriteria = {
      authority: "Unknown",
      authority_is_clear: false, // Not clear
      outcome_is_objective: true,
    };

    const result = evaluateTrade(belief, market, criteria);

    expect("eligible" in result).toBe(true);
    if ("eligible" in result) {
      expect(result.eligible).toBe(false);
      expect(result.failedCheck).toBe("resolution_authority");
    }
  });
});
