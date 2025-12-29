/**
 * Shared utilities and constants
 */

/**
 * Impact caps per signal type (Section 4.2)
 */
export const IMPACT_CAPS: Record<string, number> = {
  authoritative: 0.20,  // ±20%
  procedural: 0.15,     // ±15%
  quantitative: 0.10,   // ±10%
  interpretive: 0.07,   // ±7%
  speculative: 0.03,    // ±3%
};

/**
 * Minimum edge thresholds by category (Section 8)
 * 
 * Thresholds are set based on:
 * - Predictability: More predictable markets have lower thresholds
 * - Volatility: More volatile markets require higher edges
 * - Information quality: Markets with better data sources can use lower thresholds
 */
export const MIN_EDGE: Record<string, number> = {
  politics: 0.12,       // 12% - Polls, official statements (medium predictability)
  crypto: 0.15,         // 15% - High volatility, speculation-driven
  sports: 0.10,         // 10% - Rich statistics, historical data, lower volatility
  economics: 0.12,      // 12% - Official data, but subject to revisions
  entertainment: 0.18,  // 18% - High subjectivity, industry politics
  weather: 0.08,        // 8% - Scientific models, meteorological data
  technology: 0.15,     // 15% - Company secrecy, surprise announcements
  world: 0.20,          // 20% - Geopolitical uncertainty, many unknowns
  other: 0.25,          // 25% - Miscellaneous/unclassified, highest bar
};

/**
 * Global system thresholds
 */
export const THRESHOLDS = {
  MIN_CONFIDENCE: 65,
  MAX_BELIEF_WIDTH: 25,
  MIN_LIQUIDITY: 1000,  // USD
  TIME_DECAY_RATE: 0.5,  // per day
  UNKNOWN_PENALTY: 7,    // per unknown
  CONFLICT_PENALTY: 10,
  BASE_CONFIDENCE: 50,
  MIN_CONFIDENCE_BOUND: 30,
  MAX_CONFIDENCE_BOUND: 95,
  CONFIDENCE_AUTHORITATIVE_BONUS: 10,
  CONFIDENCE_PROCEDURAL_BONUS: 5,
  MAX_RANGE_SHIFT_RATIO: 0.6,
  CONFLICT_WIDENING_RATIO: 0.25,
  BELIEF_INVALIDATION_THRESHOLD: 0.50,  // 50% shift against position
  CALIBRATION_COVERAGE_DEVIATION_HALT: 0.15,  // 15%
  CONSECUTIVE_INVALIDATIONS_HALT: 3,
};

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.abs(date2.getTime() - date1.getTime()) / MS_PER_DAY;
}

/**
 * Hash a string for rationale tracking
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
