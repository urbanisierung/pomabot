/**
 * Calibration System
 * Implementation of Sections 11-12 from polymarket_ai_deterministic_spec.md
 * 
 * Tracks system performance and triggers auto-adjustments.
 */

import type { CalibrationRecord, CalibrationMetrics } from "@pomabot/shared";
import { THRESHOLDS } from "@pomabot/shared";

export class CalibrationSystem {
  private records: CalibrationRecord[] = [];
  private currentMetrics: CalibrationMetrics = {
    range_coverage: 0,
    confidence_accuracy: 0,
    edge_effectiveness: 0,
    unknown_density: 0,
    total_markets: 0,
    last_updated: new Date(),
  };

  /**
   * Add a resolved market outcome
   */
  addRecord(record: CalibrationRecord): void {
    this.records.push(record);
    this.recalculateMetrics();
  }

  /**
   * Get current calibration metrics
   */
  getMetrics(): CalibrationMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get all calibration records
   */
  getRecords(): CalibrationRecord[] {
    return [...this.records];
  }

  /**
   * Section 11: Calculate Calibration Metrics
   */
  private recalculateMetrics(): void {
    if (this.records.length === 0) {
      return;
    }

    // Range Coverage: % of outcomes within belief range
    const rangeCoverage = this.calculateRangeCoverage();

    // Confidence Bucket Accuracy
    const confidenceAccuracy = this.calculateConfidenceAccuracy();

    // Edge Effectiveness
    const edgeEffectiveness = this.calculateEdgeEffectiveness();

    // Unknown Density
    const unknownDensity = this.calculateUnknownDensity();

    this.currentMetrics = {
      range_coverage: rangeCoverage,
      confidence_accuracy: confidenceAccuracy,
      edge_effectiveness: edgeEffectiveness,
      unknown_density: unknownDensity,
      total_markets: this.records.length,
      last_updated: new Date(),
    };
  }

  /**
   * Calculate what % of outcomes fell within the belief range
   */
  private calculateRangeCoverage(): number {
    let withinRange = 0;

    for (const record of this.records) {
      // Convert boolean outcome to percentage (0 or 100)
      const outcomeValue = record.outcome ? 100 : 0;
      
      if (
        outcomeValue >= record.belief_at_entry.belief_low &&
        outcomeValue <= record.belief_at_entry.belief_high
      ) {
        withinRange++;
      }
    }

    return withinRange / this.records.length;
  }

  /**
   * Calculate confidence bucket calibration
   * High-confidence predictions should be more accurate than low-confidence
   */
  private calculateConfidenceAccuracy(): number {
    const buckets = {
      high: { correct: 0, total: 0 }, // confidence >= 75
      medium: { correct: 0, total: 0 }, // confidence 60-75
      low: { correct: 0, total: 0 }, // confidence < 60
    };

    for (const record of this.records) {
      const confidence = record.confidence_at_entry;
      const outcomeValue = record.outcome ? 100 : 0;
      const withinRange =
        outcomeValue >= record.belief_at_entry.belief_low &&
        outcomeValue <= record.belief_at_entry.belief_high;

      if (confidence >= 75) {
        buckets.high.total++;
        if (withinRange) buckets.high.correct++;
      } else if (confidence >= 60) {
        buckets.medium.total++;
        if (withinRange) buckets.medium.correct++;
      } else {
        buckets.low.total++;
        if (withinRange) buckets.low.correct++;
      }
    }

    // Calculate weighted accuracy
    let totalAccuracy = 0;
    let totalWeight = 0;

    for (const bucket of Object.values(buckets)) {
      if (bucket.total > 0) {
        const accuracy = bucket.correct / bucket.total;
        totalAccuracy += accuracy * bucket.total;
        totalWeight += bucket.total;
      }
    }

    return totalWeight > 0 ? totalAccuracy / totalWeight : 0;
  }

  /**
   * Calculate how effective the edge calculation was
   */
  private calculateEdgeEffectiveness(): number {
    if (this.records.length === 0) return 0;

    let totalEdgeRatio = 0;

    for (const record of this.records) {
      // Simple measure: did we profit?
      const outcomeValue = record.outcome ? 100 : 0;
      const withinRange =
        outcomeValue >= record.belief_at_entry.belief_low &&
        outcomeValue <= record.belief_at_entry.belief_high;

      if (withinRange) {
        totalEdgeRatio += 1;
      }
    }

    return totalEdgeRatio / this.records.length;
  }

  /**
   * Calculate average unknowns per market
   */
  private calculateUnknownDensity(): number {
    if (this.records.length === 0) return 0;

    const totalUnknowns = this.records.reduce(
      (sum, record) => sum + record.unknowns_at_entry,
      0
    );

    return totalUnknowns / this.records.length;
  }

  /**
   * Section 12: Auto-Adjustment Rules
   * 
   * Returns adjustment recommendations based on calibration
   */
  getAdjustmentRecommendations(): {
    increaseEdgeThreshold?: number;
    decreaseConfidence?: number;
    narrowBeliefRanges?: number;
  } {
    const recommendations: ReturnType<CalibrationSystem["getAdjustmentRecommendations"]> = {};

    // Need minimum data for adjustments
    if (this.records.length < 10) {
      return recommendations;
    }

    // Overconfidence detected: coverage < 75%
    if (this.currentMetrics.range_coverage < 0.75) {
      recommendations.increaseEdgeThreshold = 0.03; // +3%
      recommendations.decreaseConfidence = 5; // -5 points
    }

    // Underconfidence detected: coverage > 95% (only after ≥50 markets)
    if (this.records.length >= 50 && this.currentMetrics.range_coverage > 0.95) {
      recommendations.narrowBeliefRanges = 0.02; // -2%
    }

    return recommendations;
  }

  /**
   * Section 13: Check if calibration failure should halt system
   */
  shouldHalt(): { shouldHalt: boolean; reason?: string } {
    if (this.records.length < 20) {
      // Need minimum data before halting on calibration
      return { shouldHalt: false };
    }

    // Coverage deviation > 15%
    const expectedCoverage = 0.85; // Targeting 85% coverage
    const deviation = Math.abs(this.currentMetrics.range_coverage - expectedCoverage);
    
    if (deviation > THRESHOLDS.CALIBRATION_COVERAGE_DEVIATION_HALT) {
      return {
        shouldHalt: true,
        reason: `Coverage deviation ${(deviation * 100).toFixed(1)}% exceeds 15% threshold`,
      };
    }

    return { shouldHalt: false };
  }

  /**
   * Check if high-confidence bucket underperforms low-confidence
   * This is a critical calibration failure
   */
  checkConfidenceBucketInversion(): boolean {
    const buckets = {
      high: { correct: 0, total: 0 },
      low: { correct: 0, total: 0 },
    };

    for (const record of this.records) {
      const confidence = record.confidence_at_entry;
      const outcomeValue = record.outcome ? 100 : 0;
      const withinRange =
        outcomeValue >= record.belief_at_entry.belief_low &&
        outcomeValue <= record.belief_at_entry.belief_high;

      if (confidence >= 75) {
        buckets.high.total++;
        if (withinRange) buckets.high.correct++;
      } else if (confidence < 60) {
        buckets.low.total++;
        if (withinRange) buckets.low.correct++;
      }
    }

    // Need minimum samples
    if (buckets.high.total < 5 || buckets.low.total < 5) {
      return false;
    }

    const highAccuracy = buckets.high.correct / buckets.high.total;
    const lowAccuracy = buckets.low.correct / buckets.low.total;

    return highAccuracy < lowAccuracy;
  }
}
