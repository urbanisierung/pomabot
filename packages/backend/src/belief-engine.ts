/**
 * Belief Engine - Deterministic belief update logic
 * Implementation of Section 4 from polymarket_ai_deterministic_spec.md
 * 
 * CRITICAL: This implementation follows the spec exactly.
 * Do not modify algorithms, thresholds, or formulas without spec approval.
 */

import type { BeliefState, Signal } from "@pomabot/shared";
import { 
  IMPACT_CAPS, 
  THRESHOLDS, 
  clamp,
  daysBetween 
} from "@pomabot/shared";

/**
 * Section 4.1: Signal Eligibility
 * Speculative signals alone cannot update beliefs
 */
export function isSignalEligible(
  signal: Signal,
  existingSignals: Signal[]
): boolean {
  // Reject speculative-only updates
  if (signal.type === "speculative" && existingSignals.length === 0) {
    return false;
  }
  return true;
}

/**
 * Section 4.3: Belief Update Formula
 * 
 * This is the core deterministic belief update algorithm.
 * It must match the test vectors in Appendix A exactly.
 */
export function updateBelief(
  currentBelief: BeliefState,
  signal: Signal
): BeliefState {
  const rangeWidth = currentBelief.belief_high - currentBelief.belief_low;
  
  // Get impact cap for signal type (Section 4.2)
  const impactCap = IMPACT_CAPS[signal.type] ?? 0;
  
  // Calculate maximum shift based on signal strength
  const maxShift = impactCap * 100 * (signal.strength / 5);
  
  // Limit shift to 60% of range width
  const shift = Math.min(maxShift, rangeWidth * THRESHOLDS.MAX_RANGE_SHIFT_RATIO);
  
  // Direction multiplier
  let directionMultiplier = 0;
  if (signal.direction === "up") {
    directionMultiplier = 1;
  } else if (signal.direction === "down") {
    directionMultiplier = -1;
  }
  
  // Apply shift
  let newLow = currentBelief.belief_low + (shift * directionMultiplier);
  let newHigh = currentBelief.belief_high + (shift * directionMultiplier);
  
  // Section 4.4: Conflict Handling
  // Conflicting signals widen the range
  if (signal.conflicts_with_existing) {
    const wideningAmount = rangeWidth * THRESHOLDS.CONFLICT_WIDENING_RATIO;
    newLow -= wideningAmount;
    newHigh += wideningAmount;
  }
  
  // Clamp to [0, 100]
  newLow = clamp(newLow, 0, 100);
  newHigh = clamp(newHigh, 0, 100);
  
  return {
    belief_low: newLow,
    belief_high: newHigh,
    confidence: currentBelief.confidence, // Will be recalculated separately
    unknowns: currentBelief.unknowns,
    last_updated: new Date(),
    last_signal: signal,
  };
}

/**
 * Section 5: Confidence Calculation (Exact)
 * 
 * Confidence reflects the stability and quality of our belief,
 * not optimism about the outcome.
 */
export function calculateConfidence(
  belief: BeliefState,
  authoritativeCount: number,
  proceduralCount: number,
  hasConflicts: boolean,
  daysSinceLastSignal: number
): number {
  // Section 5.1: Base confidence
  let confidence = THRESHOLDS.BASE_CONFIDENCE;
  
  // Section 5.2: Adjustments
  confidence += authoritativeCount * THRESHOLDS.CONFIDENCE_AUTHORITATIVE_BONUS;
  confidence += proceduralCount * THRESHOLDS.CONFIDENCE_PROCEDURAL_BONUS;
  
  // Unknown penalty
  const unknownPenalty = belief.unknowns.length * THRESHOLDS.UNKNOWN_PENALTY;
  confidence -= unknownPenalty;
  
  // Conflict penalty
  if (hasConflicts) {
    confidence -= THRESHOLDS.CONFLICT_PENALTY;
  }
  
  // Section 5.3: Time decay
  const timeDecay = daysSinceLastSignal * THRESHOLDS.TIME_DECAY_RATE;
  confidence -= timeDecay;
  
  // Section 5.4: Bounds
  confidence = clamp(
    confidence, 
    THRESHOLDS.MIN_CONFIDENCE_BOUND, 
    THRESHOLDS.MAX_CONFIDENCE_BOUND
  );
  
  return confidence;
}

/**
 * Complete belief update including confidence recalculation
 */
export function performBeliefUpdate(
  currentBelief: BeliefState,
  signal: Signal,
  signalHistory: Signal[]
): BeliefState {
  // Check eligibility
  if (!isSignalEligible(signal, signalHistory)) {
    throw new Error("Signal not eligible: speculative-only updates rejected");
  }
  
  // Update belief range
  const updatedBelief = updateBelief(currentBelief, signal);
  
  // Count signal types for confidence
  const authoritativeCount = signalHistory.filter(
    s => s.type === "authoritative"
  ).length + (signal.type === "authoritative" ? 1 : 0);
  
  const proceduralCount = signalHistory.filter(
    s => s.type === "procedural"
  ).length + (signal.type === "procedural" ? 1 : 0);
  
  const hasConflicts = signal.conflicts_with_existing || 
    signalHistory.some(s => s.conflicts_with_existing);
  
  const daysSinceLast = currentBelief.last_signal 
    ? daysBetween(currentBelief.last_signal.timestamp, signal.timestamp)
    : 0;
  
  // Recalculate confidence
  const newConfidence = calculateConfidence(
    updatedBelief,
    authoritativeCount,
    proceduralCount,
    hasConflicts,
    daysSinceLast
  );
  
  return {
    ...updatedBelief,
    confidence: newConfidence,
  };
}

/**
 * Global Invariant Check: Confidence cannot increase if unknowns increase
 * Section 1, Invariant #2
 */
export function validateConfidenceInvariant(
  oldBelief: BeliefState,
  newBelief: BeliefState
): boolean {
  const unknownsIncreased = newBelief.unknowns.length > oldBelief.unknowns.length;
  const confidenceIncreased = newBelief.confidence > oldBelief.confidence;
  
  if (unknownsIncreased && confidenceIncreased) {
    return false; // INVARIANT VIOLATION
  }
  
  return true;
}
