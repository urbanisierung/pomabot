/**
 * Test Suite: State Machine & Calibration
 * Tests for Appendix A6: Halt Conditions
 */

import { describe, test, expect } from "vitest";
import { StateMachine, checkHaltConditions } from "./state-machine";
import { CalibrationSystem } from "./calibration";

/**
 * A6. Halt Condition — Overconfidence
 */
describe("A6: Halt Condition - Overconfidence", () => {
  test("should halt when coverage deviation exceeds 15%", () => {
    const stateMachine = new StateMachine();

    // Expected coverage: 85%
    // Observed coverage: 65%
    // Deviation: 20%
    checkHaltConditions(
      {
        coverageDeviation: 0.20, // 20% deviation
        highConfidenceUnderperforms: false,
        consecutiveInvalidations: 0,
        unknownDensityRising: false,
      },
      stateMachine
    );

    expect(stateMachine.isHalted()).toBe(true);
    expect(stateMachine.getHaltReason()).toContain("Coverage deviation");
  });

  test("should not halt when coverage deviation is within tolerance", () => {
    const stateMachine = new StateMachine();

    checkHaltConditions(
      {
        coverageDeviation: 0.10, // 10% deviation - within tolerance
        highConfidenceUnderperforms: false,
        consecutiveInvalidations: 0,
        unknownDensityRising: false,
      },
      stateMachine
    );

    expect(stateMachine.isHalted()).toBe(false);
  });

  test("should halt when high-confidence underperforms low-confidence", () => {
    const stateMachine = new StateMachine();

    checkHaltConditions(
      {
        coverageDeviation: 0.05,
        highConfidenceUnderperforms: true,
        consecutiveInvalidations: 0,
        unknownDensityRising: false,
      },
      stateMachine
    );

    expect(stateMachine.isHalted()).toBe(true);
    expect(stateMachine.getHaltReason()).toContain("High-confidence bucket underperforming");
  });

  test("should halt after 3 consecutive invalidations", () => {
    const stateMachine = new StateMachine();

    checkHaltConditions(
      {
        coverageDeviation: 0.05,
        highConfidenceUnderperforms: false,
        consecutiveInvalidations: 3,
        unknownDensityRising: false,
      },
      stateMachine
    );

    expect(stateMachine.isHalted()).toBe(true);
    expect(stateMachine.getHaltReason()).toContain("consecutive belief invalidations");
  });

  test("should halt when unknown density is rising", () => {
    const stateMachine = new StateMachine();

    checkHaltConditions(
      {
        coverageDeviation: 0.05,
        highConfidenceUnderperforms: false,
        consecutiveInvalidations: 0,
        unknownDensityRising: true,
      },
      stateMachine
    );

    expect(stateMachine.isHalted()).toBe(true);
    expect(stateMachine.getHaltReason()).toContain("Unknown density rising");
  });
});

describe("State Machine Transitions", () => {
  test("should allow valid transitions", () => {
    const stateMachine = new StateMachine();

    expect(stateMachine.getCurrentState()).toBe("OBSERVE");

    const success1 = stateMachine.transition("INGEST_SIGNAL", "New data arrived");
    expect(success1).toBe(true);
    expect(stateMachine.getCurrentState()).toBe("INGEST_SIGNAL");

    const success2 = stateMachine.transition("UPDATE_BELIEF", "Signal validated");
    expect(success2).toBe(true);
    expect(stateMachine.getCurrentState()).toBe("UPDATE_BELIEF");

    const success3 = stateMachine.transition("EVALUATE_TRADE", "Belief updated");
    expect(success3).toBe(true);
    expect(stateMachine.getCurrentState()).toBe("EVALUATE_TRADE");

    const success4 = stateMachine.transition("OBSERVE", "No trade");
    expect(success4).toBe(true);
    expect(stateMachine.getCurrentState()).toBe("OBSERVE");
  });

  test("should reject illegal transitions and force halt", () => {
    const stateMachine = new StateMachine();

    expect(stateMachine.getCurrentState()).toBe("OBSERVE");

    // Try to jump directly to EXECUTE_TRADE from OBSERVE
    const success = stateMachine.transition("EXECUTE_TRADE", "Trying illegal transition");
    expect(success).toBe(false);
    expect(stateMachine.isHalted()).toBe(true);
    expect(stateMachine.getHaltReason()).toContain("Illegal transition");
  });

  test("should not allow transitions from HALT", () => {
    const stateMachine = new StateMachine();

    stateMachine.forceHalt("Test halt");
    expect(stateMachine.isHalted()).toBe(true);

    const success = stateMachine.transition("OBSERVE", "Trying to escape halt");
    expect(success).toBe(false);
    expect(stateMachine.getCurrentState()).toBe("HALT");
  });

  test("should allow manual reset after halt", () => {
    const stateMachine = new StateMachine();

    stateMachine.forceHalt("Test halt");
    expect(stateMachine.isHalted()).toBe(true);

    stateMachine.reset();
    expect(stateMachine.getCurrentState()).toBe("OBSERVE");
    expect(stateMachine.getHaltReason()).toBeUndefined();
  });
});

describe("Calibration System", () => {
  test("should calculate range coverage correctly", () => {
    const calibration = new CalibrationSystem();

    // Add some records
    calibration.addRecord({
      market_id: "market1",
      belief_at_entry: {
        belief_low: 40,
        belief_high: 60,
        confidence: 70,
        unknowns: [],
        last_updated: new Date(),
      },
      confidence_at_entry: 70,
      unknowns_at_entry: 0,
      outcome: true, // 100% - within range [40, 60]? No!
      resolved_at: new Date(),
      edge_at_entry: 0.15,
    });

    calibration.addRecord({
      market_id: "market2",
      belief_at_entry: {
        belief_low: 40,
        belief_high: 60,
        confidence: 70,
        unknowns: [],
        last_updated: new Date(),
      },
      confidence_at_entry: 70,
      unknowns_at_entry: 0,
      outcome: false, // 0% - within range [40, 60]? No!
      resolved_at: new Date(),
      edge_at_entry: 0.15,
    });

    const metrics = calibration.getMetrics();

    // Neither outcome (0% or 100%) falls within [40, 60]
    expect(metrics.range_coverage).toBe(0);
    expect(metrics.total_markets).toBe(2);
  });

  test("should recommend adjustments when overconfident", () => {
    const calibration = new CalibrationSystem();

    // Add 15 records with poor coverage
    for (let i = 0; i < 15; i++) {
      calibration.addRecord({
        market_id: `market${i}`,
        belief_at_entry: {
          belief_low: 45,
          belief_high: 55,
          confidence: 80,
          unknowns: [],
          last_updated: new Date(),
        },
        confidence_at_entry: 80,
        unknowns_at_entry: 0,
        outcome: i % 2 === 0, // Alternating outcomes (0% or 100%)
        resolved_at: new Date(),
        edge_at_entry: 0.15,
      });
    }

    const recommendations = calibration.getAdjustmentRecommendations();

    // Should recommend increasing edge threshold and decreasing confidence
    expect(recommendations.increaseEdgeThreshold).toBe(0.03);
    expect(recommendations.decreaseConfidence).toBe(5);
  });

  test("should check for confidence bucket inversion", () => {
    const calibration = new CalibrationSystem();

    // Add high-confidence records with poor accuracy
    for (let i = 0; i < 10; i++) {
      calibration.addRecord({
        market_id: `high${i}`,
        belief_at_entry: {
          belief_low: 45,
          belief_high: 55,
          confidence: 80,
          unknowns: [],
          last_updated: new Date(),
        },
        confidence_at_entry: 80,
        unknowns_at_entry: 0,
        outcome: false, // All outcomes are 0% (outside range)
        resolved_at: new Date(),
        edge_at_entry: 0.15,
      });
    }

    // Add low-confidence records with better accuracy
    for (let i = 0; i < 10; i++) {
      calibration.addRecord({
        market_id: `low${i}`,
        belief_at_entry: {
          belief_low: 0,
          belief_high: 100,
          confidence: 50,
          unknowns: [],
          last_updated: new Date(),
        },
        confidence_at_entry: 50,
        unknowns_at_entry: 0,
        outcome: i % 2 === 0, // All outcomes within range
        resolved_at: new Date(),
        edge_at_entry: 0.05,
      });
    }

    const hasInversion = calibration.checkConfidenceBucketInversion();
    expect(hasInversion).toBe(true);
  });
});
