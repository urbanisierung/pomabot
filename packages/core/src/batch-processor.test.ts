/**
 * Tests for BatchProcessor (Phase 9)
 * 
 * Validates parallel market evaluation, risk management,
 * and positive outcome guarantees.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BatchProcessor } from "./batch-processor.js";
import type { Market, Signal, MarketCategory } from "@pomabot/shared";

describe("BatchProcessor", () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    processor = new BatchProcessor();
  });

  // Helper function to create mock markets
  function createMockMarket(
    id: string,
    category: MarketCategory = "politics",
    price = 50,
    liquidity = 10000
  ): Market {
    return {
      id,
      question: `Test market ${id}`,
      resolution_criteria: "Test criteria",
      category,
      current_price: price,
      liquidity,
      volume_24h: 5000,
      created_at: new Date(),
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };
  }

  // Helper function to create mock signal generator
  function createMockSignalGenerator(
    signalCount = 2,
    strength: 1 | 2 | 3 | 4 | 5 = 3
  ) {
    return async (market: Market): Promise<Signal[]> => {
      const signals: Signal[] = [];
      for (let i = 0; i < signalCount; i++) {
        signals.push({
          type: "quantitative",
          direction: "up",
          strength,
          conflicts_with_existing: false,
          timestamp: new Date(),
          source: "test",
          description: `Test signal ${i} for ${market.id}`,
        });
      }
      return signals;
    };
  }

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = processor.getConfig();
      expect(config.maxConcurrency).toBe(50);
      expect(config.batchSize).toBe(100);
      expect(config.timeoutMs).toBe(5000);
      expect(config.retryAttempts).toBe(2);
    });

    it("should accept custom configuration", () => {
      const customProcessor = new BatchProcessor({
        maxConcurrency: 10,
        batchSize: 20,
        timeoutMs: 2000,
        retryAttempts: 1,
      });

      const config = customProcessor.getConfig();
      expect(config.maxConcurrency).toBe(10);
      expect(config.batchSize).toBe(20);
      expect(config.timeoutMs).toBe(2000);
      expect(config.retryAttempts).toBe(1);
    });

    it("should accept custom positive outcome configuration", () => {
      const customProcessor = new BatchProcessor(
        {},
        {
          minEdgeRequired: 20,
          maxPortfolioRisk: 15,
          diversificationRequired: false,
          stopLossPercent: 3,
          profitTargetPercent: 15,
          maxPositionsPerCategory: 3,
        }
      );

      const config = customProcessor.getPositiveOutcomeConfig();
      expect(config.minEdgeRequired).toBe(20);
      expect(config.maxPortfolioRisk).toBe(15);
      expect(config.diversificationRequired).toBe(false);
      expect(config.stopLossPercent).toBe(3);
      expect(config.profitTargetPercent).toBe(15);
      expect(config.maxPositionsPerCategory).toBe(3);
    });
  });

  describe("Market Evaluation", () => {
    it("should evaluate a single market", async () => {
      const markets = [createMockMarket("market1")];
      const signalGenerator = createMockSignalGenerator(2);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.evaluations).toHaveLength(1);
      expect(result.evaluations[0].market.id).toBe("market1");
      expect(result.evaluations[0].signals).toHaveLength(2);
      expect(result.evaluations[0].belief).toBeDefined();
      expect(result.evaluations[0].decision).toBeDefined();
    });

    it("should evaluate multiple markets in parallel", async () => {
      const markets = Array.from({ length: 10 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(2);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.evaluations).toHaveLength(10);
      expect(result.metrics.marketsProcessed).toBe(10);
      expect(result.metrics.successRate).toBe(100);
    });

    it("should process large batches efficiently", async () => {
      const markets = Array.from({ length: 500 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(3);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.evaluations.length).toBe(500);
      expect(result.metrics.throughput).toBeGreaterThan(0);
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      
      // Should process at least 10 markets per second (conservative estimate)
      expect(result.metrics.throughput).toBeGreaterThan(10);
    });

    it("should handle markets with varying signals", async () => {
      const markets = [
        createMockMarket("market1"),
        createMockMarket("market2"),
        createMockMarket("market3"),
      ];

      let callCount = 0;
      const signalGenerator = async (market: Market): Promise<Signal[]> => {
        callCount++;
        // Each market gets different number of signals
        const signalCount = callCount;
        const signals: Signal[] = [];
        for (let i = 0; i < signalCount; i++) {
          signals.push({
            type: "quantitative",
            direction: "up",
            strength: 3,
            conflicts_with_existing: false,
            timestamp: new Date(),
          });
        }
        return signals;
      };

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.evaluations).toHaveLength(3);
      expect(result.evaluations[0].signals).toHaveLength(1);
      expect(result.evaluations[1].signals).toHaveLength(2);
      expect(result.evaluations[2].signals).toHaveLength(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle signal generation errors gracefully", async () => {
      const markets = [
        createMockMarket("market1"),
        createMockMarket("market2"),
      ];

      const signalGenerator = async (market: Market): Promise<Signal[]> => {
        if (market.id === "market1") {
          throw new Error("Signal generation failed");
        }
        return [{
          type: "quantitative",
          direction: "up",
          strength: 3,
          conflicts_with_existing: false,
          timestamp: new Date(),
        }];
      };

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      // Should have one successful evaluation and one error
      expect(result.evaluations.length).toBeLessThanOrEqual(2);
      expect(result.metrics.errorsEncountered).toBeGreaterThan(0);
    });

    it("should track error rate correctly", async () => {
      const markets = Array.from({ length: 10 }, (_, i) => 
        createMockMarket(`market${i}`)
      );

      const signalGenerator = async (market: Market): Promise<Signal[]> => {
        // Fail on markets with even IDs
        if (parseInt(market.id.replace("market", "")) % 2 === 0) {
          throw new Error("Even market failure");
        }
        return [{
          type: "quantitative",
          direction: "up",
          strength: 3,
          conflicts_with_existing: false,
          timestamp: new Date(),
        }];
      };

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.metrics.errorsEncountered).toBe(5); // markets 0, 2, 4, 6, 8
      expect(result.metrics.successRate).toBe(50);
    });
  });

  describe("Performance Metrics", () => {
    it("should calculate throughput correctly", async () => {
      const markets = Array.from({ length: 100 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(2);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.metrics.throughput).toBeGreaterThan(0);
      expect(result.metrics.marketsProcessed).toBe(100);
      
      // Verify throughput calculation
      const expectedThroughput = (100 / result.metrics.processingTimeMs) * 1000;
      expect(result.metrics.throughput).toBeCloseTo(expectedThroughput, 0);
    });

    it("should track average processing time per market", async () => {
      const markets = Array.from({ length: 50 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(2);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.metrics.avgProcessingTimePerMarket).toBeGreaterThan(0);
      expect(result.metrics.avgProcessingTimePerMarket).toBeLessThan(result.metrics.processingTimeMs);
    });

    it("should track memory usage", async () => {
      const markets = Array.from({ length: 100 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(3);

      const result = await processor.evaluateMarkets(markets, signalGenerator);

      expect(result.metrics.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Positive Outcome Filtering", () => {
    it("should filter by minimum edge requirement", () => {
      const evaluations = [
        {
          market: createMockMarket("market1", "politics", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 20, // High edge
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market2", "politics", 48),
          belief: { belief_low: 50, belief_high: 60, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 48, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 7, // Low edge
          signals: [],
          processingTimeMs: 100,
        },
      ];

      const filtered = processor.filterForPositiveOutcome(evaluations, 1000, []);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].market.id).toBe("market1");
    });

    it("should enforce portfolio risk limits", () => {
      const evaluations = Array.from({ length: 10 }, (_, i) => ({
        market: createMockMarket(`market${i}`, "politics", 40),
        belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
        decision: { side: "YES" as const, size_usd: 100, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
        edge: 20,
        signals: [],
        processingTimeMs: 100,
      }));

      // Portfolio has $1000, max risk is 20% = $200
      // Each position is $100, so should only select 2
      const filtered = processor.filterForPositiveOutcome(evaluations, 1000, []);

      expect(filtered.length).toBeLessThanOrEqual(2);
    });

    it("should enforce diversification requirements", () => {
      const evaluations = [
        {
          market: createMockMarket("market1", "politics", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 25,
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market2", "politics", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 23,
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market3", "politics", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 21,
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market4", "sports", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 20,
          signals: [],
          processingTimeMs: 100,
        },
      ];

      const filtered = processor.filterForPositiveOutcome(evaluations, 1000, []);

      // Should limit to 2 per category with diversification enabled
      const categoryCounts = new Map<string, number>();
      for (const evaluation of filtered) {
        const count = categoryCounts.get(evaluation.market.category) || 0;
        categoryCounts.set(evaluation.market.category, count + 1);
        expect(count).toBeLessThan(2);
      }
    });

    it("should consider existing positions in risk calculations", () => {
      const evaluations = Array.from({ length: 5 }, (_, i) => ({
        market: createMockMarket(`market${i}`, "politics", 40),
        belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
        decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
        edge: 20,
        signals: [],
        processingTimeMs: 100,
      }));

      // Already have 3 positions of $50 each = $150 risk
      // Portfolio is $1000, max risk is 20% = $200
      // Only $50 remaining, so should select 1 more position
      const existingPositions = [
        { marketId: "existing1", category: "crypto", riskAmount: 50 },
        { marketId: "existing2", category: "sports", riskAmount: 50 },
        { marketId: "existing3", category: "weather", riskAmount: 50 },
      ];

      const filtered = processor.filterForPositiveOutcome(evaluations, 1000, existingPositions);

      expect(filtered).toHaveLength(1);
    });

    it("should sort by edge and select highest edge opportunities", () => {
      const evaluations = [
        {
          market: createMockMarket("market1", "politics", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 18,
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market2", "sports", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 25, // Highest
          signals: [],
          processingTimeMs: 100,
        },
        {
          market: createMockMarket("market3", "crypto", 40),
          belief: { belief_low: 55, belief_high: 65, confidence: 70, unknowns: [], last_updated: new Date() },
          decision: { side: "YES" as const, size_usd: 50, entry_price: 40, exit_conditions: [], rationale_hash: "", rationale: "", timestamp: new Date() },
          edge: 22,
          signals: [],
          processingTimeMs: 100,
        },
      ];

      const filtered = processor.filterForPositiveOutcome(evaluations, 1000, []);

      // Should be sorted by edge descending
      expect(filtered[0].edge).toBeGreaterThanOrEqual(filtered[filtered.length - 1].edge);
      expect(filtered[0].market.id).toBe("market2"); // Highest edge
    });
  });

  describe("Batch Processing", () => {
    it("should respect batch size configuration", async () => {
      const customProcessor = new BatchProcessor({ batchSize: 10 });
      const markets = Array.from({ length: 25 }, (_, i) => 
        createMockMarket(`market${i}`)
      );
      const signalGenerator = createMockSignalGenerator(2);

      const result = await customProcessor.evaluateMarkets(markets, signalGenerator);

      // Should process in 3 batches: 10, 10, 5
      expect(result.evaluations.length).toBe(25);
      expect(result.metrics.successRate).toBe(100);
    });

    it("should handle empty market list", async () => {
      const signalGenerator = createMockSignalGenerator(2);

      const result = await processor.evaluateMarkets([], signalGenerator);

      expect(result.evaluations).toHaveLength(0);
      expect(result.metrics.marketsProcessed).toBe(0);
      expect(result.metrics.opportunitiesFound).toBe(0);
    });
  });

  describe("Stress Testing", () => {
    it("should handle 1000+ markets efficiently", async () => {
      const markets = Array.from({ length: 1000 }, (_, i) => 
        createMockMarket(`market${i}`, ["politics", "sports", "crypto", "weather"][i % 4] as MarketCategory)
      );
      const signalGenerator = createMockSignalGenerator(3, 3);

      const startTime = Date.now();
      const result = await processor.evaluateMarkets(markets, signalGenerator);
      const endTime = Date.now();

      expect(result.evaluations.length).toBeLessThanOrEqual(1000);
      expect(result.metrics.successRate).toBeGreaterThan(95); // At least 95% success rate
      
      // Should complete in reasonable time (less than 60 seconds)
      expect(endTime - startTime).toBeLessThan(60000);
      
      console.log(`Processed ${result.evaluations.length} markets in ${result.metrics.processingTimeMs}ms`);
      console.log(`Throughput: ${result.metrics.throughput.toFixed(2)} markets/second`);
      console.log(`Success rate: ${result.metrics.successRate.toFixed(2)}%`);
    });
  });
});
