/**
 * Trade Decision Engine
 * Implementation of Section 7 from polymarket_ai_deterministic_spec.md
 * 
 * Evaluates whether a trade should be executed based on ordered checks.
 * All checks must pass for a trade to be approved.
 */

import type { 
  BeliefState, 
  Market, 
  ResolutionCriteria, 
  TradeDecision,
  TradeSide,
  ExitCondition
} from "@pomabot/shared";
import { MIN_EDGE, THRESHOLDS, hashString } from "@pomabot/shared";

/**
 * Section 7: Trade Eligibility Check (Ordered)
 * 
 * Each check is strictly sequential.
 * Fail any step → STOP (no trade)
 */
export interface TradeEligibilityResult {
  eligible: boolean;
  failedCheck?: string;
  reason?: string;
}

/**
 * Check 1: Resolution authority clear?
 */
export function checkResolutionAuthority(
  criteria: ResolutionCriteria
): TradeEligibilityResult {
  if (!criteria.authority_is_clear) {
    return {
      eligible: false,
      failedCheck: "resolution_authority",
      reason: "Resolution authority is not clear",
    };
  }
  return { eligible: true };
}

/**
 * Check 2: Outcome objectively verifiable?
 */
export function checkObjectiveOutcome(
  criteria: ResolutionCriteria
): TradeEligibilityResult {
  if (!criteria.outcome_is_objective) {
    return {
      eligible: false,
      failedCheck: "objective_outcome",
      reason: "Outcome is not objectively verifiable",
    };
  }
  return { eligible: true };
}

/**
 * Check 3: Liquidity ≥ minimum?
 */
export function checkLiquidity(market: Market): TradeEligibilityResult {
  if (market.liquidity < THRESHOLDS.MIN_LIQUIDITY) {
    return {
      eligible: false,
      failedCheck: "liquidity",
      reason: `Liquidity ${market.liquidity} below minimum ${THRESHOLDS.MIN_LIQUIDITY}`,
    };
  }
  return { eligible: true };
}

/**
 * Check 4: Belief width ≤ 25%?
 */
export function checkBeliefWidth(belief: BeliefState): TradeEligibilityResult {
  const width = belief.belief_high - belief.belief_low;
  if (width > THRESHOLDS.MAX_BELIEF_WIDTH) {
    return {
      eligible: false,
      failedCheck: "belief_width",
      reason: `Belief width ${width.toFixed(1)}% exceeds maximum ${THRESHOLDS.MAX_BELIEF_WIDTH}%`,
    };
  }
  return { eligible: true };
}

/**
 * Check 5: Confidence ≥ 65?
 */
export function checkConfidence(belief: BeliefState): TradeEligibilityResult {
  if (belief.confidence < THRESHOLDS.MIN_CONFIDENCE) {
    return {
      eligible: false,
      failedCheck: "confidence",
      reason: `Confidence ${belief.confidence.toFixed(1)} below minimum ${THRESHOLDS.MIN_CONFIDENCE}`,
    };
  }
  return { eligible: true };
}

/**
 * Check 6: Market price outside belief range?
 */
export function checkPriceOutsideRange(
  belief: BeliefState,
  marketPrice: number
): TradeEligibilityResult {
  const priceInRange = marketPrice >= belief.belief_low && 
                       marketPrice <= belief.belief_high;
  
  if (priceInRange) {
    return {
      eligible: false,
      failedCheck: "price_outside_range",
      reason: `Market price ${marketPrice.toFixed(1)}% is within belief range [${belief.belief_low.toFixed(1)}, ${belief.belief_high.toFixed(1)}]`,
    };
  }
  return { eligible: true };
}

/**
 * Section 8: Edge Calculation
 */
export function calculateEdge(
  belief: BeliefState,
  marketPrice: number
): { edge: number; side: TradeSide } {
  // If price below belief range, buy YES
  if (marketPrice < belief.belief_low) {
    return {
      edge: belief.belief_low - marketPrice,
      side: "YES",
    };
  }
  
  // If price above belief range, buy NO
  if (marketPrice > belief.belief_high) {
    return {
      edge: marketPrice - belief.belief_high,
      side: "NO",
    };
  }
  
  // Price within range (shouldn't reach here after check 6)
  return {
    edge: 0,
    side: "NONE",
  };
}

/**
 * Check 7: Edge ≥ threshold?
 */
export function checkEdge(
  edge: number,
  category: string
): TradeEligibilityResult {
  // Get minimum edge for category, default to 'other' (highest threshold)
  // If category not found, use 0.25 (25%) as the most conservative threshold
  const minEdge: number = MIN_EDGE[category] ?? 0.25;
  
  if (edge < minEdge) {
    return {
      eligible: false,
      failedCheck: "edge",
      reason: `Edge ${edge.toFixed(3)} below minimum ${minEdge.toFixed(3)} for category ${category}`,
    };
  }
  return { eligible: true };
}

/**
 * Section 9: Generate Exit Conditions (Mandatory)
 */
export function generateExitConditions(
  belief: BeliefState,
  side: TradeSide,
  _entryPrice: number
): ExitCondition[] {
  const conditions: ExitCondition[] = [];
  
  // Invalidation Exit: Belief range shifts against position by ≥50%
  conditions.push({
    type: "invalidation",
    description: `Belief shifts against ${side} position by ≥${THRESHOLDS.BELIEF_INVALIDATION_THRESHOLD * 100}%`,
    trigger_belief_shift: THRESHOLDS.BELIEF_INVALIDATION_THRESHOLD,
  });
  
  // Profit Exit: Market converges inside belief range midpoint
  const midpoint = (belief.belief_low + belief.belief_high) / 2;
  conditions.push({
    type: "profit",
    description: `Market price converges to belief midpoint (${midpoint.toFixed(1)}%)`,
    trigger_price_level: midpoint,
  });
  
  // Emergency Exit: Invariant breach or data feed failure
  conditions.push({
    type: "emergency",
    description: "Invariant breach or data feed failure",
  });
  
  return conditions;
}

/**
 * Check 8: Exit plan defined?
 * (This is implicit in our implementation - we always generate exits)
 */

/**
 * Complete trade eligibility evaluation
 * Returns a trade decision if all checks pass
 */
export function evaluateTrade(
  belief: BeliefState,
  market: Market,
  criteria: ResolutionCriteria
): TradeDecision | TradeEligibilityResult {
  // Check 1: Resolution authority
  const authCheck = checkResolutionAuthority(criteria);
  if (!authCheck.eligible) return authCheck;
  
  // Check 2: Objective outcome
  const objectiveCheck = checkObjectiveOutcome(criteria);
  if (!objectiveCheck.eligible) return objectiveCheck;
  
  // Check 3: Liquidity
  const liquidityCheck = checkLiquidity(market);
  if (!liquidityCheck.eligible) return liquidityCheck;
  
  // Check 4: Belief width
  const widthCheck = checkBeliefWidth(belief);
  if (!widthCheck.eligible) return widthCheck;
  
  // Check 5: Confidence
  const confidenceCheck = checkConfidence(belief);
  if (!confidenceCheck.eligible) return confidenceCheck;
  
  // Check 6: Price outside range
  const priceCheck = checkPriceOutsideRange(belief, market.current_price);
  if (!priceCheck.eligible) return priceCheck;
  
  // Calculate edge and determine side
  const { edge, side } = calculateEdge(belief, market.current_price);
  
  // Check 7: Edge threshold
  const edgeCheck = checkEdge(edge / 100, market.category);
  if (!edgeCheck.eligible) return edgeCheck;
  
  // Check 8: Generate exit conditions (always succeeds)
  const exitConditions = generateExitConditions(belief, side, market.current_price);
  
  // All checks passed - create trade decision
  const rationale = `Trade ${side} at ${market.current_price.toFixed(1)}% with edge ${edge.toFixed(1)}%. ` +
    `Belief: [${belief.belief_low.toFixed(1)}, ${belief.belief_high.toFixed(1)}], ` +
    `Confidence: ${belief.confidence.toFixed(1)}`;
  
  const decision: TradeDecision = {
    side,
    size_usd: 0, // To be determined by position sizing logic
    entry_price: market.current_price,
    exit_conditions: exitConditions,
    rationale,
    rationale_hash: hashString(rationale),
    timestamp: new Date(),
  };
  
  return decision;
}

/**
 * Global Invariant Check: Trades cannot occur outside belief bounds
 * Section 1, Invariant #3
 */
export function validateTradeBoundsInvariant(
  decision: TradeDecision,
  belief: BeliefState
): boolean {
  if (decision.side === "NONE") return true;
  
  // For YES trades, price must be below belief range
  if (decision.side === "YES" && decision.entry_price >= belief.belief_low) {
    return false; // INVARIANT VIOLATION
  }
  
  // For NO trades, price must be above belief range
  if (decision.side === "NO" && decision.entry_price <= belief.belief_high) {
    return false; // INVARIANT VIOLATION
  }
  
  return true;
}

/**
 * Global Invariant Check: Trades cannot occur without predefined exits
 * Section 1, Invariant #4
 */
export function validateTradeExitsInvariant(decision: TradeDecision): boolean {
  if (decision.side === "NONE") return true;
  
  if (decision.exit_conditions.length === 0) {
    return false; // INVARIANT VIOLATION
  }
  
  // Must have at least invalidation and profit exits
  const hasInvalidation = decision.exit_conditions.some(e => e.type === "invalidation");
  const hasProfit = decision.exit_conditions.some(e => e.type === "profit");
  
  if (!hasInvalidation || !hasProfit) {
    return false; // INVARIANT VIOLATION
  }
  
  return true;
}
