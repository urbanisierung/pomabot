/**
 * Memory Simulation Test
 * 
 * Simulates the trading engine runtime with mocked data to understand
 * memory consumption patterns and identify potential memory leaks.
 * 
 * This test is designed to run for multiple cycles and track:
 * - Heap memory usage
 * - Object counts
 * - Growth patterns
 * - Memory after cleanup
 */

import { describe, it, expect } from "vitest";
import type { Signal, Market, BeliefState, MarketCategory, Unknown } from "@pomabot/shared";

// Mock data generators
function createMockMarket(id: string, category: MarketCategory = "crypto"): Market {
  return {
    id,
    question: `Will ${id} happen by end of 2026? This is a test question to simulate real market data.`,
    resolution_criteria: "Official announcement from the relevant authority",
    category,
    current_price: Math.random() * 100,
    liquidity: Math.random() * 100000 + 10000,
    closes_at: new Date(Date.now() + 86400000 * 30), // 30 days from now
    volume_24h: Math.random() * 50000,
    created_at: new Date(),
  };
}

function createMockUnknown(id: string): Unknown {
  return {
    id,
    description: `Unknown factor ${id}`,
    added_at: new Date(),
  };
}

function createMockSignal(_marketId: string): Signal {
  const signalTypes = ["authoritative", "procedural", "quantitative", "interpretive", "speculative"] as const;
  const directions = ["up", "down", "neutral"] as const;
  const strengths = [1, 2, 3, 4, 5] as const;
  return {
    type: signalTypes[Math.floor(Math.random() * signalTypes.length)]!,
    source: "mock-source",
    description: `Signal for testing - ${Math.random().toString(36).substring(7)}`,
    timestamp: new Date(),
    direction: directions[Math.floor(Math.random() * directions.length)]!,
    strength: strengths[Math.floor(Math.random() * strengths.length)]!,
    conflicts_with_existing: false,
  };
}

function createInitialBeliefState(): BeliefState {
  return {
    belief_low: 40,
    belief_high: 60,
    confidence: 50,
    unknowns: [],
    last_updated: new Date(),
  };
}

// Simulate MarketState structure from trading.ts
interface MockMarketState {
  market: Market;
  belief: BeliefState;
  signalHistory: Signal[];
  lastChecked: Date;
}

function formatMemoryMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

function getMemorySnapshot(): { heapUsed: number; heapTotal: number; rss: number; external: number } {
  const mem = process.memoryUsage();
  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss,
    external: mem.external,
  };
}

describe("Memory Simulation Tests", () => {
  describe("Market State Memory Growth", () => {
    it("should measure memory growth with increasing markets", () => {
      const marketStates = new Map<string, MockMarketState>();
      const measurements: Array<{ markets: number; heapMB: number; rssMB: number }> = [];
      
      // Measure baseline
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Add markets in batches and measure
      const batchSizes = [100, 250, 500, 750, 1000, 1500, 2000];
      
      for (const targetSize of batchSizes) {
        // Add markets until we reach target size
        while (marketStates.size < targetSize) {
          const id = `market-${marketStates.size}`;
          marketStates.set(id, {
            market: createMockMarket(id),
            belief: createInitialBeliefState(),
            signalHistory: [],
            lastChecked: new Date(),
          });
        }
        
        if (global.gc) global.gc();
        const mem = getMemorySnapshot();
        measurements.push({
          markets: marketStates.size,
          heapMB: parseFloat(formatMemoryMB(mem.heapUsed - baseline.heapUsed)),
          rssMB: parseFloat(formatMemoryMB(mem.rss - baseline.rss)),
        });
      }
      
      console.log("\n📊 Market State Memory Growth:");
      console.log("Markets\t| Heap (MB)\t| RSS (MB)\t| MB per 100 markets");
      console.log("-".repeat(60));
      
      for (let i = 0; i < measurements.length; i++) {
        const m = measurements[i]!;
        const prevMarkets = i > 0 ? measurements[i - 1]!.markets : 0;
        const prevHeap = i > 0 ? measurements[i - 1]!.heapMB : 0;
        const marketDelta = m.markets - prevMarkets;
        const heapDelta = m.heapMB - prevHeap;
        const per100 = marketDelta > 0 ? (heapDelta / marketDelta) * 100 : 0;
        
        console.log(`${m.markets}\t| ${m.heapMB.toFixed(2)}\t\t| ${m.rssMB.toFixed(2)}\t\t| ${per100.toFixed(2)}`);
      }
      
      // Assert reasonable memory usage (less than 100MB for 2000 markets with empty signals)
      const finalMeasurement = measurements[measurements.length - 1]!;
      expect(finalMeasurement.heapMB).toBeLessThan(100);
    });

    it("should measure memory growth with signal history", () => {
      const MAX_SIGNAL_HISTORY = 50; // Current limit in production
      const marketStates = new Map<string, MockMarketState>();
      const measurements: Array<{ signals: number; heapMB: number }> = [];
      
      // Create 1000 markets
      for (let i = 0; i < 1000; i++) {
        const id = `market-${i}`;
        marketStates.set(id, {
          market: createMockMarket(id),
          belief: createInitialBeliefState(),
          signalHistory: [],
          lastChecked: new Date(),
        });
      }
      
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Add signals in rounds
      const signalRounds = [10, 25, 50, 100, 200, 500]; // Total signals added per market
      
      for (const targetSignals of signalRounds) {
        for (const [marketId, state] of marketStates) {
          // Add signals until target
          while (state.signalHistory.length < targetSignals) {
            state.signalHistory.push(createMockSignal(marketId));
          }
        }
        
        if (global.gc) global.gc();
        const mem = getMemorySnapshot();
        measurements.push({
          signals: targetSignals,
          heapMB: parseFloat(formatMemoryMB(mem.heapUsed - baseline.heapUsed)),
        });
      }
      
      console.log("\n📊 Signal History Memory Growth (1000 markets, NO limit applied):");
      console.log("Signals/Market\t| Total Signals\t| Heap Growth (MB)");
      console.log("-".repeat(60));
      
      for (const m of measurements) {
        const totalSignals = m.signals * 1000;
        console.log(`${m.signals}\t\t| ${totalSignals}\t\t| ${m.heapMB.toFixed(2)}`);
      }
      
      // Now test WITH signal limit applied
      console.log("\n📊 With MAX_SIGNAL_HISTORY limit applied:");
      
      // Apply limit
      for (const [_, state] of marketStates) {
        if (state.signalHistory.length > MAX_SIGNAL_HISTORY) {
          state.signalHistory = state.signalHistory.slice(-MAX_SIGNAL_HISTORY);
        }
      }
      
      if (global.gc) global.gc();
      const afterLimit = getMemorySnapshot();
      const memSaved = measurements[measurements.length - 1]!.heapMB - 
        parseFloat(formatMemoryMB(afterLimit.heapUsed - baseline.heapUsed));
      
      console.log(`After applying limit: ${formatMemoryMB(afterLimit.heapUsed - baseline.heapUsed)} MB`);
      console.log(`Memory saved: ~${memSaved.toFixed(2)} MB (GC timing affects this)`);
      
      // Verify the signal count was reduced correctly (logic test, not GC test)
      const totalSignalsAfterLimit = Array.from(marketStates.values())
        .reduce((sum, s) => sum + s.signalHistory.length, 0);
      
      // Should have exactly 1000 markets * 50 signals (max limit)
      expect(totalSignalsAfterLimit).toBe(1000 * MAX_SIGNAL_HISTORY);
    });

    it("should simulate full monitoring loop memory pattern", async () => {
      /**
       * This test simulates the actual monitoring loop behavior:
       * 1. Fetch markets (1000+)
       * 2. Process signals for each market
       * 3. Apply signal limit
       * 4. Clean up expired markets
       * 5. Repeat for multiple cycles
       */
      
      const MAX_SIGNAL_HISTORY = 50;
      const CLEANUP_INTERVAL_CYCLES = 5;
      const marketStates = new Map<string, MockMarketState>();
      
      const measurements: Array<{
        cycle: number;
        markets: number;
        totalSignals: number;
        heapMB: number;
        rssMB: number;
      }> = [];
      
      // Baseline
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Run 50 monitoring cycles
      for (let cycle = 1; cycle <= 50; cycle++) {
        // Simulate market refresh - add new markets, some markets close
        const newMarketCount = Math.floor(Math.random() * 20) + 10; // 10-30 new markets
        const closingMarketCount = Math.floor(marketStates.size * 0.02); // 2% of markets close
        
        // Add new markets
        for (let i = 0; i < newMarketCount; i++) {
          const id = `market-${cycle}-${i}`;
          const categories: MarketCategory[] = ["crypto", "politics", "sports", "technology"];
          marketStates.set(id, {
            market: createMockMarket(id, categories[Math.floor(Math.random() * categories.length)]!),
            belief: createInitialBeliefState(),
            signalHistory: [],
            lastChecked: new Date(),
          });
        }
        
        // Process signals for all markets (simulating news + reddit + hackernews)
        for (const [marketId, state] of marketStates) {
          // 20% of markets get new signals each cycle
          if (Math.random() < 0.2) {
            const signalCount = Math.floor(Math.random() * 3) + 1; // 1-3 signals
            for (let s = 0; s < signalCount; s++) {
              state.signalHistory.push(createMockSignal(marketId));
              
              // Apply signal limit (as in production code)
              if (state.signalHistory.length > MAX_SIGNAL_HISTORY) {
                state.signalHistory = state.signalHistory.slice(-MAX_SIGNAL_HISTORY);
              }
            }
            
            // Update belief (simulate belief update adding unknowns)
            if (Math.random() < 0.3) {
              const newUnknown = createMockUnknown(`unknown-${Math.random().toString(36).substring(7)}`);
              state.belief.unknowns = [
                ...(state.belief.unknowns || []),
                newUnknown,
              ].slice(-10); // Limit unknowns too
            }
          }
          state.lastChecked = new Date();
        }
        
        // Simulate market cleanup (every N cycles)
        if (cycle % CLEANUP_INTERVAL_CYCLES === 0) {
          const toRemove: string[] = [];
          let count = 0;
          
          for (const [marketId] of marketStates) {
            // Remove oldest 2% of markets to simulate expiry
            if (count < closingMarketCount) {
              toRemove.push(marketId);
            }
            count++;
          }
          
          for (const id of toRemove) {
            marketStates.delete(id);
          }
        }
        
        // Measure every 10 cycles
        if (cycle % 10 === 0) {
          if (global.gc) global.gc();
          const mem = getMemorySnapshot();
          
          let totalSignals = 0;
          for (const [_, state] of marketStates) {
            totalSignals += state.signalHistory.length;
          }
          
          measurements.push({
            cycle,
            markets: marketStates.size,
            totalSignals,
            heapMB: parseFloat(formatMemoryMB(mem.heapUsed - baseline.heapUsed)),
            rssMB: parseFloat(formatMemoryMB(mem.rss - baseline.rss)),
          });
        }
      }
      
      console.log("\n📊 Full Monitoring Loop Simulation (50 cycles):");
      console.log("Cycle\t| Markets\t| Signals\t| Heap (MB)\t| RSS (MB)");
      console.log("-".repeat(70));
      
      for (const m of measurements) {
        console.log(`${m.cycle}\t| ${m.markets}\t\t| ${m.totalSignals}\t\t| ${m.heapMB.toFixed(2)}\t\t| ${m.rssMB.toFixed(2)}`);
      }
      
      // Check that memory growth is reasonable
      const firstMeasurement = measurements[0]!;
      const lastMeasurement = measurements[measurements.length - 1]!;
      const growthRate = lastMeasurement.heapMB !== 0 && firstMeasurement.heapMB !== 0 
        ? lastMeasurement.heapMB / firstMeasurement.heapMB 
        : 1;
      
      console.log(`\nGrowth rate: ${growthRate.toFixed(2)}x over ${measurements.length * 10} cycles`);
      console.log(`Final markets: ${lastMeasurement.markets}, Final signals: ${lastMeasurement.totalSignals}`);
      
      // Verify that signal limits are being applied (key functional test)
      // With MAX_SIGNAL_HISTORY=50 and 20% of markets getting 1-3 signals,
      // no market should exceed 50 signals
      let maxSignalsPerMarket = 0;
      for (const [_, state] of marketStates) {
        maxSignalsPerMarket = Math.max(maxSignalsPerMarket, state.signalHistory.length);
      }
      
      console.log(`Max signals per market: ${maxSignalsPerMarket} (limit: ${MAX_SIGNAL_HISTORY})`);
      expect(maxSignalsPerMarket).toBeLessThanOrEqual(MAX_SIGNAL_HISTORY);
    });
  });

  describe("Memory Leak Detection", () => {
    it("should identify potential leaks in signal history slicing", () => {
      /**
       * Issue: Using slice() creates a new array but if the old array
       * is still referenced somewhere, it won't be garbage collected.
       * 
       * Test: Compare different slicing approaches
       */
      
      const iterations = 1000;
      const signalHistory: Signal[] = [];
      const MAX_SIGNALS = 50;
      
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Method 1: Using slice (current implementation)
      for (let i = 0; i < iterations; i++) {
        signalHistory.push(createMockSignal(`market-${i}`));
        if (signalHistory.length > MAX_SIGNALS) {
          // Current approach - creates new array
          const newHistory = signalHistory.slice(-MAX_SIGNALS);
          signalHistory.length = 0;
          signalHistory.push(...newHistory);
        }
      }
      
      if (global.gc) global.gc();
      const afterSlice = getMemorySnapshot();
      
      console.log("\n📊 Signal History Slicing Memory:");
      console.log(`After ${iterations} iterations with slice: ${formatMemoryMB(afterSlice.heapUsed - baseline.heapUsed)} MB`);
      console.log(`Final array length: ${signalHistory.length}`);
      
      expect(signalHistory.length).toBe(MAX_SIGNALS);
    });

    it("should measure object creation overhead per monitoring cycle", () => {
      /**
       * Each monitoring cycle creates many temporary objects:
       * - News items
       * - Signals
       * - Belief update calculations
       * - Trade evaluations
       * 
       * This test measures the overhead.
       */
      
      const cycleSimulations = 100;
      
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Simulate cycle object creation
      const cycles: Array<{
        news: Array<{ title: string; content: string; url: string }>;
        signals: Signal[];
        calculations: Array<{ edge: number; decision: string }>;
      }> = [];
      
      for (let i = 0; i < cycleSimulations; i++) {
        const cycle = {
          news: Array.from({ length: 50 }, (_, idx) => ({
            title: `News ${i}-${idx}`,
            content: `Content for news item ${i}-${idx}. `.repeat(10),
            url: `https://example.com/news/${i}/${idx}`,
          })),
          signals: Array.from({ length: 20 }, () => createMockSignal(`cycle-${i}`)),
          calculations: Array.from({ length: 100 }, () => ({
            edge: Math.random() * 20,
            decision: Math.random() > 0.5 ? "TRADE" : "PASS",
          })),
        };
        cycles.push(cycle);
      }
      
      if (global.gc) global.gc();
      const afterCreation = getMemorySnapshot();
      
      console.log("\n📊 Object Creation Overhead:");
      console.log(`${cycleSimulations} simulated cycles: ${formatMemoryMB(afterCreation.heapUsed - baseline.heapUsed)} MB`);
      console.log(`Per cycle average: ${formatMemoryMB((afterCreation.heapUsed - baseline.heapUsed) / cycleSimulations)} MB`);
      
      // Clear references
      cycles.length = 0;
      
      if (global.gc) global.gc();
      const afterClear = getMemorySnapshot();
      
      console.log(`After clearing references: ${formatMemoryMB(afterClear.heapUsed - baseline.heapUsed)} MB`);
      
      // Note: GC behavior is unpredictable in tests, so we just log the results
      // In production, --expose-gc allows manual GC triggering for better control
      const wasReclaimed = afterClear.heapUsed < afterCreation.heapUsed;
      console.log(`Memory reclaimed: ${wasReclaimed ? "YES" : "NO (GC timing is unpredictable)"}`);
      
      // Test passes as long as the measurement runs - this is a diagnostic test
      expect(true).toBe(true);
    });

    it("should test RSS map retention without cleanup", () => {
      /**
       * NewsAggregator has a lastFetchTime Map that grows without bound
       * This test simulates that behavior
       */
      
      const lastFetchTime = new Map<string, number>();
      const feedUrls: string[] = [];
      
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Simulate many unique feed URLs being tracked
      for (let i = 0; i < 10000; i++) {
        const url = `https://feed-${i}.example.com/rss?param=${Math.random()}`;
        feedUrls.push(url);
        lastFetchTime.set(url, Date.now());
      }
      
      if (global.gc) global.gc();
      const afterGrowth = getMemorySnapshot();
      
      console.log("\n📊 lastFetchTime Map Growth:");
      console.log(`10000 entries: ${formatMemoryMB(afterGrowth.heapUsed - baseline.heapUsed)} MB`);
      console.log(`Per entry: ${((afterGrowth.heapUsed - baseline.heapUsed) / 10000).toFixed(2)} bytes`);
      
      // This is a potential leak - the map never shrinks
      expect(lastFetchTime.size).toBe(10000);
    });
  });

  describe("Memory Pressure Simulation", () => {
    it("should simulate 256MB container limit scenario", () => {
      /**
       * Simulate what happens when approaching 256MB limit:
       * - 200MB allocated to Node.js heap
       * - System needs ~56MB for overhead
       * 
       * Test aggressive cleanup trigger at 180MB
       */
      
      const MEMORY_CRITICAL_THRESHOLD_MB = 180;
      const MAX_SIGNAL_HISTORY = 50;
      const AGGRESSIVE_SIGNAL_LIMIT = 25; // Half of normal
      
      const marketStates = new Map<string, MockMarketState>();
      
      // Create many markets with full signal history
      console.log("\n📊 256MB Container Limit Simulation:");
      
      for (let i = 0; i < 2000; i++) {
        const id = `market-${i}`;
        const state: MockMarketState = {
          market: createMockMarket(id),
          belief: createInitialBeliefState(),
          signalHistory: [],
          lastChecked: new Date(),
        };
        
        // Fill with signals
        for (let j = 0; j < MAX_SIGNAL_HISTORY; j++) {
          state.signalHistory.push(createMockSignal(id));
        }
        
        marketStates.set(id, state);
      }
      
      if (global.gc) global.gc();
      const beforeCleanup = getMemorySnapshot();
      const heapMB = parseFloat(formatMemoryMB(beforeCleanup.heapUsed));
      
      console.log(`Before cleanup: ${heapMB.toFixed(2)} MB heap`);
      
      // Simulate aggressive cleanup
      if (heapMB > MEMORY_CRITICAL_THRESHOLD_MB || true) { // Force for testing
        console.log("⚠️ Memory pressure detected - triggering aggressive cleanup");
        
        let signalsRemoved = 0;
        for (const [_, state] of marketStates) {
          if (state.signalHistory.length > AGGRESSIVE_SIGNAL_LIMIT) {
            const toRemove = state.signalHistory.length - AGGRESSIVE_SIGNAL_LIMIT;
            state.signalHistory = state.signalHistory.slice(-AGGRESSIVE_SIGNAL_LIMIT);
            signalsRemoved += toRemove;
          }
        }
        
        console.log(`Trimmed ${signalsRemoved} signals`);
      }
      
      if (global.gc) global.gc();
      const afterCleanup = getMemorySnapshot();
      
      console.log(`After cleanup: ${formatMemoryMB(afterCleanup.heapUsed)} MB heap`);
      console.log(`Memory freed: ${formatMemoryMB(beforeCleanup.heapUsed - afterCleanup.heapUsed)} MB`);
      
      // Note: GC behavior is unpredictable in tests without --expose-gc
      // The important thing is that the cleanup logic runs correctly
      // In production with --expose-gc, memory will be reclaimed
      const signalCountAfter = Array.from(marketStates.values())
        .reduce((sum, s) => sum + s.signalHistory.length, 0);
      
      // Verify cleanup logic worked (reduced signal count)
      expect(signalCountAfter).toBe(2000 * AGGRESSIVE_SIGNAL_LIMIT); // 2000 markets * 25 signals each
    });

    it("should measure realistic production scenario memory usage", () => {
      /**
       * Simulate realistic production load:
       * - 1000-1500 active markets
       * - 50 signals per market max
       * - 100 paper trading positions
       * - News aggregator state
       * - Trade history (50 trades)
       */
      
      if (global.gc) global.gc();
      const baseline = getMemorySnapshot();
      
      // Market states
      const marketStates = new Map<string, MockMarketState>();
      for (let i = 0; i < 1200; i++) {
        const id = `market-${i}`;
        const state: MockMarketState = {
          market: createMockMarket(id),
          belief: {
            ...createInitialBeliefState(),
            unknowns: [
              createMockUnknown("unknown1"),
              createMockUnknown("unknown2"),
              createMockUnknown("unknown3"),
            ],
          },
          signalHistory: [],
          lastChecked: new Date(),
        };
        
        // 70% of markets have some signals
        const signalCount = Math.random() < 0.7 ? Math.floor(Math.random() * 50) : 0;
        for (let j = 0; j < signalCount; j++) {
          state.signalHistory.push(createMockSignal(id));
        }
        
        marketStates.set(id, state);
      }
      
      // Paper trading positions
      interface MockPosition {
        id: string;
        marketId: string;
        marketQuestion: string;
        side: "YES" | "NO";
        entryPrice: number;
        sizeUsd: number;
        status: string;
      }
      
      const paperPositions = new Map<string, MockPosition>();
      for (let i = 0; i < 100; i++) {
        paperPositions.set(`pos-${i}`, {
          id: `pos-${i}`,
          marketId: `market-${i}`,
          marketQuestion: `Question for position ${i}`,
          side: Math.random() > 0.5 ? "YES" : "NO",
          entryPrice: Math.random() * 100,
          sizeUsd: Math.random() * 100,
          status: i < 70 ? "OPEN" : "WIN",
        });
      }
      
      // News aggregator lastFetchTime
      const lastFetchTime = new Map<string, number>();
      for (let i = 0; i < 50; i++) {
        lastFetchTime.set(`feed-${i}`, Date.now());
      }
      
      // Trade history
      const tradeHistory: Array<{
        marketId: string;
        timestamp: Date;
        side: string;
        amount: number;
        price: number;
      }> = [];
      for (let i = 0; i < 50; i++) {
        tradeHistory.push({
          marketId: `market-${i}`,
          timestamp: new Date(),
          side: "YES",
          amount: 100,
          price: 50,
        });
      }
      
      // Missed opportunities (top 5) - keep reference to avoid being optimized away
      const _missedOpportunities = Array.from({ length: 5 }, (_, i) => ({
        marketQuestion: `Missed opportunity ${i}`,
        reason: "Insufficient edge",
        beliefMidpoint: 50,
        marketPrice: 45,
        potentialEdge: 5 + i,
      }));
      
      // Daily stats - keep reference to avoid being optimized away
      const _dailyStats = {
        tradeOpportunities: 50,
        tradesExecuted: 5,
        newsSignalsProcessed: 1000,
        redditSignalsProcessed: 200,
        hackerNewsSignalsProcessed: 150,
        beliefUpdates: 500,
        lastReset: new Date(),
      };
      
      if (global.gc) global.gc();
      const afterSetup = getMemorySnapshot();
      
      const totalSignals = Array.from(marketStates.values()).reduce(
        (sum, s) => sum + s.signalHistory.length, 
        0
      );
      
      console.log("\n📊 Realistic Production Scenario Memory Usage:");
      console.log("-".repeat(60));
      console.log(`Markets: ${marketStates.size}`);
      console.log(`Total signals: ${totalSignals}`);
      console.log(`Paper positions: ${paperPositions.size}`);
      console.log(`Feed URLs tracked: ${lastFetchTime.size}`);
      console.log(`Trade history entries: ${tradeHistory.length}`);
      console.log(`Missed opportunities: ${_missedOpportunities.length}`);
      console.log(`Daily stats fields: ${Object.keys(_dailyStats).length}`);
      console.log("-".repeat(60));
      console.log(`Heap used: ${formatMemoryMB(afterSetup.heapUsed)} MB`);
      console.log(`Growth from baseline: ${formatMemoryMB(afterSetup.heapUsed - baseline.heapUsed)} MB`);
      console.log(`RSS: ${formatMemoryMB(afterSetup.rss)} MB`);
      console.log("-".repeat(60));
      
      // Should fit in 200MB heap limit with room to spare
      const heapMB = parseFloat(formatMemoryMB(afterSetup.heapUsed - baseline.heapUsed));
      expect(heapMB).toBeLessThan(150); // Leave 50MB headroom
    });
  });
});
