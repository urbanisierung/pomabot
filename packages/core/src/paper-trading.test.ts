/**
 * Paper Trading Module Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PaperTradingTracker } from "./paper-trading.js";

describe("PaperTradingTracker", () => {
  let tracker: PaperTradingTracker;

  beforeEach(async () => {
    tracker = new PaperTradingTracker();
    await tracker.initialize();
  });

  describe("Position Creation", () => {
    it("should create a paper position", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Will Bitcoin reach $100k?",
        category: "crypto",
        side: "YES",
        entryPrice: 45,
        beliefLow: 55,
        beliefHigh: 70,
        edge: 10,
        sizeUsd: 100,
      });

      expect(position.id).toBeDefined();
      expect(position.marketId).toBe("market-1");
      expect(position.status).toBe("OPEN");
      expect(position.side).toBe("YES");
      expect(position.entryPrice).toBe(45);
    });

    it("should keep position in memory", async () => {
      await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test market",
        category: "crypto",
        side: "YES",
        entryPrice: 50,
        beliefLow: 60,
        beliefHigh: 75,
        edge: 10,
        sizeUsd: 100,
      });

      // Verify position is in memory
      const positions = tracker.getAllPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].marketId).toBe("market-1");
    });
  });

  describe("Position Resolution", () => {
    it("should resolve position as WIN when prediction is correct", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Will Bitcoin reach $100k?",
        category: "crypto",
        side: "YES",
        entryPrice: 45,
        beliefLow: 55,
        beliefHigh: 70,
        edge: 10,
        sizeUsd: 100,
      });

      // Market resolves YES (our prediction was correct)
      await tracker.resolvePosition(position.id, "YES", 100);

      const resolved = tracker.getPosition(position.id);
      expect(resolved?.status).toBe("WIN");
      expect(resolved?.actualOutcome).toBe("YES");
      expect(resolved?.exitPrice).toBe(100);
      expect(resolved?.pnl).toBeGreaterThan(0);
    });

    it("should resolve position as LOSS when prediction is wrong", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Will Bitcoin reach $100k?",
        category: "crypto",
        side: "YES",
        entryPrice: 45,
        beliefLow: 55,
        beliefHigh: 70,
        edge: 10,
        sizeUsd: 100,
      });

      // Market resolves NO (our prediction was wrong)
      await tracker.resolvePosition(position.id, "NO", 0);

      const resolved = tracker.getPosition(position.id);
      expect(resolved?.status).toBe("LOSS");
      expect(resolved?.actualOutcome).toBe("NO");
      expect(resolved?.exitPrice).toBe(0);
      expect(resolved?.pnl).toBeLessThan(0);
    });

    it("should calculate P&L correctly for YES winner", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test",
        category: "crypto",
        side: "YES",
        entryPrice: 40,
        beliefLow: 50,
        beliefHigh: 65,
        edge: 10,
        sizeUsd: 100,
      });

      await tracker.resolvePosition(position.id, "YES", 100);

      const resolved = tracker.getPosition(position.id);
      // P&L = (100 - 40) * 100 / 100 = 60
      expect(resolved?.pnl).toBe(60);
    });

    it("should calculate P&L correctly for NO winner", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test",
        category: "crypto",
        side: "YES",
        entryPrice: 60,
        beliefLow: 70,
        beliefHigh: 85,
        edge: 10,
        sizeUsd: 100,
      });

      await tracker.resolvePosition(position.id, "NO", 0);

      const resolved = tracker.getPosition(position.id);
      // P&L = (0 - 60) * 100 / 100 = -60
      expect(resolved?.pnl).toBe(-60);
    });

    it("should mark position as expired", async () => {
      const position = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test",
        category: "crypto",
        side: "YES",
        entryPrice: 50,
        beliefLow: 60,
        beliefHigh: 75,
        edge: 10,
        sizeUsd: 100,
      });

      await tracker.expirePosition(position.id);

      const expired = tracker.getPosition(position.id);
      expect(expired?.status).toBe("EXPIRED");
      expect(expired?.pnl).toBe(0);
    });
  });

  describe("Position Queries", () => {
    beforeEach(async () => {
      // Create test positions
      await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test 1",
        category: "crypto",
        side: "YES",
        entryPrice: 45,
        beliefLow: 55,
        beliefHigh: 70,
        edge: 10,
        sizeUsd: 100,
      });

      await tracker.createPosition({
        marketId: "market-2",
        marketQuestion: "Test 2",
        category: "sports",
        side: "NO",
        entryPrice: 55,
        beliefLow: 35,
        beliefHigh: 50,
        edge: 5,
        sizeUsd: 50,
      });
    });

    it("should get all positions", () => {
      const positions = tracker.getAllPositions();
      expect(positions.length).toBe(2);
    });

    it("should get open positions only", async () => {
      const openBefore = tracker.getOpenPositions();
      expect(openBefore.length).toBe(2);

      // Resolve one position
      const position = openBefore[0];
      await tracker.resolvePosition(position.id, "YES", 100);

      const openAfter = tracker.getOpenPositions();
      expect(openAfter.length).toBe(1);
    });

    it("should get resolved positions only", async () => {
      const resolvedBefore = tracker.getResolvedPositions();
      expect(resolvedBefore.length).toBe(0);

      // Resolve one position
      const position = tracker.getAllPositions()[0];
      await tracker.resolvePosition(position.id, "YES", 100);

      const resolvedAfter = tracker.getResolvedPositions();
      expect(resolvedAfter.length).toBe(1);
    });

    it("should get position by market ID", () => {
      const position = tracker.getPositionByMarketId("market-1");
      expect(position).toBeDefined();
      expect(position?.marketQuestion).toBe("Test 1");
    });
  });

  describe("Performance Metrics", () => {
    beforeEach(async () => {
      // Create and resolve positions with different outcomes
      const pos1 = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test 1",
        category: "crypto",
        side: "YES",
        entryPrice: 40,
        beliefLow: 55,
        beliefHigh: 70,
        edge: 15,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos1.id, "YES", 100); // Win: +$60

      const pos2 = await tracker.createPosition({
        marketId: "market-2",
        marketQuestion: "Test 2",
        category: "crypto",
        side: "YES",
        entryPrice: 60,
        beliefLow: 70,
        beliefHigh: 85,
        edge: 10,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos2.id, "NO", 0); // Loss: -$60

      const pos3 = await tracker.createPosition({
        marketId: "market-3",
        marketQuestion: "Test 3",
        category: "sports",
        side: "YES",
        entryPrice: 30,
        beliefLow: 50,
        beliefHigh: 65,
        edge: 20,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos3.id, "YES", 100); // Win: +$70

      // One open position
      await tracker.createPosition({
        marketId: "market-4",
        marketQuestion: "Test 4",
        category: "politics",
        side: "NO",
        entryPrice: 55,
        beliefLow: 30,
        beliefHigh: 45,
        edge: 10,
        sizeUsd: 50,
      });
    });

    it("should calculate basic metrics", () => {
      const metrics = tracker.calculateMetrics();

      expect(metrics.totalPositions).toBe(4);
      expect(metrics.resolvedPositions).toBe(3);
      expect(metrics.openPositions).toBe(1);
    });

    it("should calculate P&L correctly", () => {
      const metrics = tracker.calculateMetrics();

      // Total P&L: +60 - 60 + 70 = +70
      expect(metrics.totalPnL).toBe(70);
    });

    it("should calculate win rate correctly", () => {
      const metrics = tracker.calculateMetrics();

      // 2 wins out of 3 resolved = 66.67%
      expect(metrics.winRate).toBeCloseTo(66.67, 1);
    });

    it("should calculate average win and loss", () => {
      const metrics = tracker.calculateMetrics();

      // Average win: (60 + 70) / 2 = 65
      expect(metrics.averageWin).toBe(65);

      // Average loss: 60 / 1 = 60
      expect(metrics.averageLoss).toBe(60);
    });

    it("should calculate profit factor", () => {
      const metrics = tracker.calculateMetrics();

      // Profit factor: 130 / 60 = 2.17
      expect(metrics.profitFactor).toBeCloseTo(2.17, 2);
    });

    it("should calculate edge accuracy", () => {
      const metrics = tracker.calculateMetrics();

      // Edge accuracy: 2 wins out of 3 = 66.67%
      expect(metrics.edgeAccuracy).toBeCloseTo(66.67, 1);
    });

    it("should calculate category performance", () => {
      const metrics = tracker.calculateMetrics();

      expect(metrics.categoryPerformance.size).toBeGreaterThan(0);
      
      const cryptoPerf = metrics.categoryPerformance.get("crypto");
      expect(cryptoPerf).toBeDefined();
      expect(cryptoPerf?.trades).toBe(2);
      expect(cryptoPerf?.winRate).toBe(50); // 1 win, 1 loss
    });
  });

  describe("Calibration Analysis", () => {
    beforeEach(async () => {
      // Create positions with different belief ranges
      const pos1 = await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test 1",
        category: "crypto",
        side: "YES",
        entryPrice: 40,
        beliefLow: 60,
        beliefHigh: 70,
        edge: 10,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos1.id, "YES", 100); // Win

      const pos2 = await tracker.createPosition({
        marketId: "market-2",
        marketQuestion: "Test 2",
        category: "crypto",
        side: "YES",
        entryPrice: 40,
        beliefLow: 65,
        beliefHigh: 75,
        edge: 10,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos2.id, "NO", 0); // Loss

      const pos3 = await tracker.createPosition({
        marketId: "market-3",
        marketQuestion: "Test 3",
        category: "crypto",
        side: "YES",
        entryPrice: 30,
        beliefLow: 80,
        beliefHigh: 90,
        edge: 10,
        sizeUsd: 100,
      });
      await tracker.resolvePosition(pos3.id, "YES", 100); // Win
    });

    it("should calculate calibration buckets", () => {
      const calibration = tracker.calculateCalibration();

      expect(calibration.calibrationBuckets.length).toBeGreaterThan(0);
      
      // Check that buckets have required fields
      for (const bucket of calibration.calibrationBuckets) {
        expect(bucket.beliefRange).toBeDefined();
        expect(bucket.predictedProbability).toBeGreaterThanOrEqual(0);
        expect(bucket.actualWinRate).toBeGreaterThanOrEqual(0);
        expect(bucket.trades).toBeGreaterThan(0);
        expect(bucket.calibrationError).toBeGreaterThanOrEqual(0);
      }
    });

    it("should calculate Brier score", () => {
      const calibration = tracker.calculateCalibration();

      expect(calibration.brierScore).toBeGreaterThanOrEqual(0);
      expect(calibration.brierScore).toBeLessThanOrEqual(1);
    });

    it("should calculate overall calibration", () => {
      const calibration = tracker.calculateCalibration();

      expect(calibration.overallCalibration).toBeGreaterThanOrEqual(0);
    });

    it("should generate recommendations", () => {
      const calibration = tracker.calculateCalibration();

      expect(Array.isArray(calibration.recommendations)).toBe(true);
    });
  });

  describe("Reset", () => {
    it("should clear all positions", async () => {
      await tracker.createPosition({
        marketId: "market-1",
        marketQuestion: "Test",
        category: "crypto",
        side: "YES",
        entryPrice: 50,
        beliefLow: 60,
        beliefHigh: 75,
        edge: 10,
        sizeUsd: 100,
      });

      expect(tracker.getAllPositions().length).toBe(1);

      await tracker.reset();

      expect(tracker.getAllPositions().length).toBe(0);
    });
  });
});
