/**
 * Core domain models for the Polymarket AI system
 * Based on: polymarket_ai_deterministic_spec.md Section 2
 */

/**
 * Signal types with different impact caps (Section 4.2)
 * 
 * - authoritative: ±20% - Official statements, legal rulings, authoritative decisions
 * - procedural: ±15% - Process milestones, procedural updates
 * - quantitative: ±10% - Data-driven signals, polling, statistics
 * - interpretive: ±7% - Analysis, expert opinions, interpretations
 * - speculative: ±3% - Speculation, rumors (cannot move beliefs alone)
 */
export type SignalType = 
  | "authoritative" 
  | "procedural" 
  | "quantitative" 
  | "interpretive" 
  | "speculative";

export type SignalDirection = "up" | "down" | "neutral";

export interface Signal {
  type: SignalType;
  direction: SignalDirection;
  strength: 1 | 2 | 3 | 4 | 5;
  conflicts_with_existing: boolean;
  timestamp: Date;
  source?: string;
  description?: string;
}

export interface Unknown {
  id: string;
  description: string;
  added_at: Date;
  resolved_at?: Date;
  resolution_reason?: string;
}

/**
 * BeliefState represents the system's probabilistic view of a market
 * Invariant: beliefs are ranges, never point estimates
 */
export interface BeliefState {
  belief_low: number;   // 0-100
  belief_high: number;  // 0-100
  confidence: number;   // 0-100
  unknowns: Unknown[];
  last_updated: Date;
  last_signal?: Signal;
}

export type TradeSide = "YES" | "NO" | "NONE";

export interface ExitCondition {
  type: "invalidation" | "profit" | "emergency";
  description: string;
  trigger_belief_shift?: number; // For invalidation exits
  trigger_price_level?: number;  // For profit exits
}

export interface TradeDecision {
  side: TradeSide;
  size_usd: number;
  entry_price: number;
  exit_conditions: ExitCondition[];
  rationale_hash: string;
  rationale: string;
  timestamp: Date;
}

export interface Market {
  id: string;
  question: string;
  resolution_criteria: string;
  category: "politics" | "crypto";
  current_price: number;
  liquidity: number;
  volume_24h: number;
  created_at: Date;
  closes_at?: Date;
  resolved_at?: Date;
  resolution_outcome?: boolean;
}

export interface ResolutionCriteria {
  authority: string;
  authority_is_clear: boolean;
  outcome_is_objective: boolean;
  verification_source?: string;
}

/**
 * System State Machine states
 * Section 3 of spec
 */
export type SystemState = 
  | "OBSERVE"
  | "INGEST_SIGNAL"
  | "UPDATE_BELIEF"
  | "EVALUATE_TRADE"
  | "EXECUTE_TRADE"
  | "MONITOR"
  | "HALT";

export interface StateTransition {
  from: SystemState;
  to: SystemState;
  timestamp: Date;
  reason: string;
}

/**
 * Calibration tracking
 */
export interface CalibrationRecord {
  market_id: string;
  belief_at_entry: BeliefState;
  confidence_at_entry: number;
  unknowns_at_entry: number;
  outcome: boolean;
  resolved_at: Date;
  edge_at_entry: number;
}

export interface CalibrationMetrics {
  range_coverage: number;      // % of outcomes within belief range
  confidence_accuracy: number;  // Calibration of confidence buckets
  edge_effectiveness: number;   // Realized edge vs predicted
  unknown_density: number;      // Avg unknowns per market
  total_markets: number;
  last_updated: Date;
}
