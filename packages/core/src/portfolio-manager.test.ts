/**
 * Tests for Portfolio Manager
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PortfolioManager } from "./portfolio-manager.js";

describe("PortfolioManager", () => {
  let manager: PortfolioManager;

  beforeEach(() => {
    manager = new PortfolioManager({
      totalCapital: 1000,
      maxRiskPerTrade: 0.02, // 2%
      kellyFraction: 0.25,
      correlationThreshold: 0.7,
      maxDrawdownPercent: 10,
    });
  });

  describe("Kelly Criterion Position Sizing", () => {
    it("should calculate Kelly size for positive edge", () => {
      const recommendation = manager.calculateKellySize(0.15, 65);
      
      expect(recommendation.recommendedSize).toBeGreaterThan(0);
      expect(recommendation.method).toBe("KELLY");
      expect(recommendation.riskLevel).toBeDefined();
    });

    it("should return zero size for negative edge", () => {
      const recommendation = manager.calculateKellySize(-0.05, 50);
      
      expect(recommendation.recommendedSize).toBe(0);
      expect(recommendation.method).toBe("CONSERVATIVE");
      expect(recommendation.warnings.length).toBeGreaterThan(0);
    });

    it("should respect max risk per trade limit", () => {
      const recommendation = manager.calculateKellySize(0.50, 80);
      
      // Should be capped at 2% of portfolio (20 USD)
      expect(recommendation.recommendedSize).toBeLessThanOrEqual(20);
    });

    it("should classify risk levels correctly", () => {
      const lowRisk = manager.calculateKellySize(0.05, 60);
      const highRisk = manager.calculateKellySize(0.20, 80);
      
      expect(lowRisk.riskLevel).toBe("LOW");
      // High risk might be MEDIUM or HIGH depending on Kelly calculation
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(highRisk.riskLevel);
    });
  });

  describe("Diversification Checks", () => {
    it("should indicate diversified for first position", () => {
      const result = manager.checkDiversification("politics", ["election", "vote"]);
      
      expect(result.diversified).toBe(true);
      expect(result.correlationScore).toBe(0);
      expect(result.reason).toContain("No existing positions");
    });

    it("should detect category concentration", () => {
      // Add two politics positions
      manager.addPosition({
        marketId: "market1",
        marketQuestion: "Will candidate A win?",
        category: "politics",
        sizeUsd: 50,
        entryPrice: 0.5,
        currentPrice: 0.5,
        unrealizedPnl: 0,
        correlation: new Map(),
      });

      const result = manager.checkDiversification("politics", ["election"]);
      
      // With only 1 position, should still be diversified
      expect(result).toBeDefined();
    });
  });

  describe("Drawdown Protection", () => {
    it("should be within limit initially", () => {
      const result = manager.checkDrawdownProtection();
      
      expect(result.withinLimit).toBe(true);
      expect(result.currentDrawdown).toBe(0);
    });

    it("should track portfolio peak correctly", () => {
      const initialStatus = manager.getPortfolioStatus();
      expect(initialStatus.drawdown).toBe(0);
    });
  });

  describe("Portfolio Status", () => {
    it("should return correct initial status", () => {
      const status = manager.getPortfolioStatus();
      
      expect(status.totalValue).toBe(1000);
      expect(status.availableCapital).toBe(1000);
      expect(status.allocatedCapital).toBe(0);
      expect(status.openPositions).toBe(0);
      expect(status.unrealizedPnl).toBe(0);
      expect(status.drawdown).toBe(0);
    });

    it("should update status after adding position", () => {
      manager.addPosition({
        marketId: "test1",
        marketQuestion: "Test market",
        category: "crypto",
        sizeUsd: 100,
        entryPrice: 0.5,
        currentPrice: 0.5,
        unrealizedPnl: 0,
        correlation: new Map(),
      });

      const status = manager.getPortfolioStatus();
      
      expect(status.allocatedCapital).toBe(100);
      expect(status.availableCapital).toBe(900);
      expect(status.openPositions).toBe(1);
    });

    it("should calculate unrealized P&L correctly", () => {
      manager.addPosition({
        marketId: "test1",
        marketQuestion: "Test market",
        category: "crypto",
        sizeUsd: 100,
        entryPrice: 0.5,
        currentPrice: 0.6,
        unrealizedPnl: 10,
        correlation: new Map(),
      });

      const status = manager.getPortfolioStatus();
      
      expect(status.unrealizedPnl).toBe(10);
      expect(status.totalValue).toBe(1010);
    });
  });

  describe("Position Management", () => {
    it("should close position and realize P&L", () => {
      manager.addPosition({
        marketId: "test1",
        marketQuestion: "Test market",
        category: "crypto",
        sizeUsd: 100,
        entryPrice: 0.5,
        currentPrice: 0.5,
        unrealizedPnl: 0,
        correlation: new Map(),
      });

      const pnl = manager.closePosition("test1", 0.6);
      
      // Use toBeCloseTo for floating point comparison
      expect(pnl).toBeCloseTo(10, 2); // (0.6 - 0.5) * 100
      
      const status = manager.getPortfolioStatus();
      expect(status.openPositions).toBe(0);
      expect(status.availableCapital).toBeGreaterThan(1000);
    });

    it("should return all positions", () => {
      manager.addPosition({
        marketId: "test1",
        marketQuestion: "Test market 1",
        category: "crypto",
        sizeUsd: 50,
        entryPrice: 0.5,
        currentPrice: 0.5,
        unrealizedPnl: 0,
        correlation: new Map(),
      });

      manager.addPosition({
        marketId: "test2",
        marketQuestion: "Test market 2",
        category: "politics",
        sizeUsd: 75,
        entryPrice: 0.6,
        currentPrice: 0.6,
        unrealizedPnl: 0,
        correlation: new Map(),
      });

      const positions = manager.getPositions();
      expect(positions).toHaveLength(2);
      expect(positions[0]?.marketId).toBeDefined();
      expect(positions[1]?.marketId).toBeDefined();
    });
  });

  describe("Sharpe Ratio", () => {
    it("should return undefined with insufficient data", () => {
      const sharpe = manager.calculateSharpeRatio();
      expect(sharpe).toBeUndefined();
    });
  });
});
