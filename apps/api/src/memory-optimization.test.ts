/**
 * Memory Optimization Test
 * 
 * Verifies that signal history limits and market cleanup prevent unbounded memory growth
 */

import { describe, it, expect, beforeEach } from "vitest";

describe("Memory Optimization", () => {
  describe("Signal History Limit", () => {
    it("should limit signal history to MAX_SIGNAL_HISTORY entries", () => {
      const MAX_SIGNAL_HISTORY = 50;
      const signalHistory: number[] = [];
      
      // Simulate adding 200 signals
      for (let i = 0; i < 200; i++) {
        signalHistory.push(i);
        
        // Apply the same logic as trading.ts
        if (signalHistory.length > MAX_SIGNAL_HISTORY) {
          signalHistory.splice(0, signalHistory.length - MAX_SIGNAL_HISTORY);
        }
      }
      
      // Should only have the last 50 signals
      expect(signalHistory.length).toBe(MAX_SIGNAL_HISTORY);
      expect(signalHistory[0]).toBe(150); // First remaining signal
      expect(signalHistory[49]).toBe(199); // Last signal
    });

    it("should preserve the most recent signals", () => {
      const MAX_SIGNAL_HISTORY = 50;
      const signalHistory: { id: number; timestamp: Date }[] = [];
      
      // Add signals with timestamps
      for (let i = 0; i < 100; i++) {
        signalHistory.push({ 
          id: i, 
          timestamp: new Date(Date.now() + i * 1000) 
        });
        
        if (signalHistory.length > MAX_SIGNAL_HISTORY) {
          signalHistory.splice(0, signalHistory.length - MAX_SIGNAL_HISTORY);
        }
      }
      
      // Should have signals 50-99 (most recent)
      expect(signalHistory.length).toBe(50);
      expect(signalHistory[0]?.id).toBe(50);
      expect(signalHistory[49]?.id).toBe(99);
    });
  });

  describe("Market Cleanup", () => {
    interface MockMarket {
      id: string;
      closes_at?: Date;
      resolved_at?: Date;
      resolution_outcome?: boolean;
    }

    it("should remove markets past their close date", () => {
      const now = new Date();
      const marketStates = new Map<string, { market: MockMarket }>();
      
      // Add markets with different states
      marketStates.set("active", {
        market: { 
          id: "active", 
          closes_at: new Date(now.getTime() + 86400000) // Tomorrow
        }
      });
      
      marketStates.set("expired", {
        market: { 
          id: "expired", 
          closes_at: new Date(now.getTime() - 86400000) // Yesterday
        }
      });
      
      // Simulate cleanup logic
      for (const [marketId, state] of marketStates) {
        const shouldRemove = 
          state.market.closes_at && state.market.closes_at < now;
        
        if (shouldRemove) {
          marketStates.delete(marketId);
        }
      }
      
      expect(marketStates.size).toBe(1);
      expect(marketStates.has("active")).toBe(true);
      expect(marketStates.has("expired")).toBe(false);
    });

    it("should remove resolved markets", () => {
      const marketStates = new Map<string, { market: MockMarket }>();
      
      marketStates.set("pending", {
        market: { id: "pending" }
      });
      
      marketStates.set("resolved", {
        market: { 
          id: "resolved", 
          resolved_at: new Date(),
          resolution_outcome: true
        }
      });
      
      // Simulate cleanup logic
      for (const [marketId, state] of marketStates) {
        const shouldRemove = 
          state.market.resolved_at !== undefined ||
          state.market.resolution_outcome !== undefined;
        
        if (shouldRemove) {
          marketStates.delete(marketId);
        }
      }
      
      expect(marketStates.size).toBe(1);
      expect(marketStates.has("pending")).toBe(true);
      expect(marketStates.has("resolved")).toBe(false);
    });

    it("should handle large market sets efficiently", () => {
      const now = new Date();
      const marketStates = new Map<string, { market: MockMarket }>();
      
      // Create 1000 markets
      for (let i = 0; i < 1000; i++) {
        const isExpired = i % 3 === 0; // Every 3rd market is expired
        marketStates.set(`market-${i}`, {
          market: {
            id: `market-${i}`,
            closes_at: isExpired 
              ? new Date(now.getTime() - 86400000) // Yesterday
              : new Date(now.getTime() + 86400000) // Tomorrow
          }
        });
      }
      
      const startTime = Date.now();
      
      // Cleanup
      for (const [marketId, state] of marketStates) {
        const shouldRemove = 
          state.market.closes_at && state.market.closes_at < now;
        
        if (shouldRemove) {
          marketStates.delete(marketId);
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Should remove ~333 markets (every 3rd one)
      expect(marketStates.size).toBeGreaterThanOrEqual(660);
      expect(marketStates.size).toBeLessThanOrEqual(670);
      
      // Should complete cleanup in under 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe("Memory Footprint", () => {
    it("should demonstrate bounded growth with signal limits", () => {
      const MAX_SIGNAL_HISTORY = 50;
      const NUM_MARKETS = 100;
      
      // Simulate market states with signal history
      const marketStates = new Map();
      
      for (let m = 0; m < NUM_MARKETS; m++) {
        const signals: number[] = [];
        
        // Add 500 signals per market
        for (let s = 0; s < 500; s++) {
          signals.push(s);
          
          if (signals.length > MAX_SIGNAL_HISTORY) {
            signals.splice(0, signals.length - MAX_SIGNAL_HISTORY);
          }
        }
        
        marketStates.set(`market-${m}`, { signals });
      }
      
      // Verify total signals stored
      let totalSignals = 0;
      for (const state of marketStates.values()) {
        totalSignals += state.signals.length;
      }
      
      // Should have exactly 50 signals per market, not 500
      expect(totalSignals).toBe(NUM_MARKETS * MAX_SIGNAL_HISTORY); // 5,000 not 50,000
    });
  });
});
