/**
 * System State Machine
 * Implementation of Section 3 from polymarket_ai_deterministic_spec.md
 * 
 * Controls valid state transitions and enforces halt conditions.
 */

import type { SystemState, StateTransition } from "@pomabot/shared";

/**
 * Valid state transitions (Section 3)
 * Any transition not listed here is ILLEGAL
 */
const VALID_TRANSITIONS: Record<SystemState, SystemState[]> = {
  OBSERVE: ["INGEST_SIGNAL", "HALT"],
  INGEST_SIGNAL: ["UPDATE_BELIEF", "HALT"],
  UPDATE_BELIEF: ["EVALUATE_TRADE", "HALT"],
  EVALUATE_TRADE: ["EXECUTE_TRADE", "OBSERVE", "HALT"],
  EXECUTE_TRADE: ["MONITOR", "HALT"],
  MONITOR: ["OBSERVE", "HALT"],
  HALT: [], // Terminal state - no transitions out
};

export class StateMachine {
  private currentState: SystemState = "OBSERVE";
  private transitionHistory: StateTransition[] = [];
  private haltReason?: string;

  getCurrentState(): SystemState {
    return this.currentState;
  }

  getTransitionHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }

  getHaltReason(): string | undefined {
    return this.haltReason;
  }

  isHalted(): boolean {
    return this.currentState === "HALT";
  }

  /**
   * Attempt to transition to a new state
   * Returns true if successful, false if illegal
   */
  transition(to: SystemState, reason: string): boolean {
    // If already halted, no transitions allowed
    if (this.currentState === "HALT") {
      return false;
    }

    // Check if transition is valid
    const validNextStates = VALID_TRANSITIONS[this.currentState];
    if (!validNextStates?.includes(to)) {
      // Illegal transition - force halt
      this.forceHalt(`Illegal transition attempted: ${this.currentState} → ${to}`);
      return false;
    }

    // Record transition
    const transition: StateTransition = {
      from: this.currentState,
      to,
      timestamp: new Date(),
      reason,
    };
    this.transitionHistory.push(transition);

    // Update state
    this.currentState = to;

    // If transitioning to HALT, record reason
    if (to === "HALT") {
      this.haltReason = reason;
    }

    return true;
  }

  /**
   * Force immediate halt (called on invariant breach)
   * Section 1: "Violation of any invariant = system halt"
   */
  forceHalt(reason: string): void {
    this.haltReason = reason;
    this.transitionHistory.push({
      from: this.currentState,
      to: "HALT",
      timestamp: new Date(),
      reason: `EMERGENCY HALT: ${reason}`,
    });
    this.currentState = "HALT";
  }

  /**
   * Reset state machine (manual restart after halt)
   */
  reset(): void {
    this.currentState = "OBSERVE";
    this.haltReason = undefined;
    // Keep transition history for audit
  }
}

/**
 * Section 13: Halt Conditions
 * 
 * These conditions trigger immediate system halt.
 * Manual restart is required after halt.
 */
export interface HaltConditions {
  coverageDeviation: number;
  highConfidenceUnderperforms: boolean;
  consecutiveInvalidations: number;
  unknownDensityRising: boolean;
}

export function checkHaltConditions(
  conditions: HaltConditions,
  stateMachine: StateMachine
): void {
  // Coverage deviation > 15%
  if (Math.abs(conditions.coverageDeviation) > 0.15) {
    stateMachine.forceHalt(
      `Coverage deviation ${(conditions.coverageDeviation * 100).toFixed(1)}% exceeds 15% threshold`
    );
    return;
  }

  // High-confidence bucket underperforms low-confidence
  if (conditions.highConfidenceUnderperforms) {
    stateMachine.forceHalt(
      "High-confidence bucket underperforming low-confidence bucket - calibration failure"
    );
    return;
  }

  // 3 belief invalidations in a row
  if (conditions.consecutiveInvalidations >= 3) {
    stateMachine.forceHalt(
      `${conditions.consecutiveInvalidations} consecutive belief invalidations`
    );
    return;
  }

  // Unknown density rising system-wide
  if (conditions.unknownDensityRising) {
    stateMachine.forceHalt(
      "Unknown density rising system-wide - increasing uncertainty"
    );
    return;
  }
}

/**
 * Helper: Check if state machine is in a valid state
 */
export function validateStateMachineState(stateMachine: StateMachine): boolean {
  const state = stateMachine.getCurrentState();
  
  // State must be one of the defined states
  const validStates: SystemState[] = [
    "OBSERVE",
    "INGEST_SIGNAL",
    "UPDATE_BELIEF",
    "EVALUATE_TRADE",
    "EXECUTE_TRADE",
    "MONITOR",
    "HALT",
  ];
  
  return validStates.includes(state);
}
