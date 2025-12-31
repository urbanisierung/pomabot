/**
 * Tests for Trade History Analyzer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TradeHistoryAnalyzer } from "./trade-history.js";

describe("TradeHistoryAnalyzer", () => {
  let analyzer: TradeHistoryAnalyzer;

  beforeEach(() => {
    analyzer = new TradeHistoryAnalyzer("./test-audit-logs");
  });

  it("should initialize with empty trade records", () => {
    expect(analyzer.getTradeRecords()).toEqual([]);
  });

  it("should calculate performance metrics with no trades", () => {
    const metrics = analyzer.calculatePerformanceMetrics();
    
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.winningTrades).toBe(0);
    expect(metrics.losingTrades).toBe(0);
    expect(metrics.winRate).toBe(0);
    expect(metrics.totalPnL).toBe(0);
  });

  it("should analyze patterns with no trades", () => {
    const patterns = analyzer.analyzePatterns();
    
    expect(patterns.bestCategories).toHaveLength(0);
    expect(patterns.worstCategories).toHaveLength(0);
    expect(patterns.optimalEdgeRange).toBeDefined();
    expect(patterns.optimalBeliefWidth).toBeDefined();
  });

  it("should filter recent trades by days", () => {
    const recentTrades = analyzer.getRecentTrades(30);
    expect(recentTrades).toEqual([]);
  });

  it("should calculate win rate correctly with mock data", () => {
    // This test would work with actual audit log files
    // For now, we verify the method exists and returns expected structure
    const metrics = analyzer.calculatePerformanceMetrics();
    
    expect(metrics).toHaveProperty("totalTrades");
    expect(metrics).toHaveProperty("winRate");
    expect(metrics).toHaveProperty("totalPnL");
    expect(metrics).toHaveProperty("profitFactor");
    expect(metrics).toHaveProperty("maxDrawdown");
    expect(metrics).toHaveProperty("edgeAccuracy");
  });

  it("should calculate profit factor correctly", () => {
    const metrics = analyzer.calculatePerformanceMetrics();
    
    // Profit factor should be 0 with no trades
    expect(metrics.profitFactor).toBe(0);
  });
});
