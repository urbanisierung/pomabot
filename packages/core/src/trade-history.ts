/**
 * Trade History Analysis Module
 * 
 * Analyzes historical trades to identify patterns and calculate performance metrics.
 * Uses audit logs as the source of truth for trade history.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface TradeRecord {
  timestamp: Date;
  marketId: string;
  marketQuestion: string;
  action: "BUY_YES" | "BUY_NO";
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl?: number;
  holdingPeriod?: number; // hours
  belief: { low: number; high: number };
  edge: number;
  outcome: "OPEN" | "WIN" | "LOSS" | "BREAK_EVEN";
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number; // Total wins / Total losses
  sharpeRatio?: number;
  maxDrawdown: number;
  averageHoldingPeriod: number; // hours
  edgeAccuracy: number; // % of trades where edge prediction was correct
}

export interface PatternAnalysis {
  bestCategories: Array<{ category: string; winRate: number; avgPnL: number; trades: number }>;
  worstCategories: Array<{ category: string; winRate: number; avgPnL: number; trades: number }>;
  optimalEdgeRange: { min: number; max: number; winRate: number };
  optimalBeliefWidth: { min: number; max: number; winRate: number };
  timeOfDayPatterns: Array<{ hour: number; winRate: number; trades: number }>;
}

/**
 * TradeHistoryAnalyzer - Analyzes historical trading performance
 */
export class TradeHistoryAnalyzer {
  private logDir: string;
  private tradeRecords: TradeRecord[] = [];

  constructor(logDir: string = "./audit-logs") {
    this.logDir = logDir;
  }

  /**
   * Load trade history from audit logs
   */
  async loadTradeHistory(): Promise<void> {
    if (!existsSync(this.logDir)) {
      console.warn(`Audit log directory not found: ${this.logDir}`);
      return;
    }

    const files = await readdir(this.logDir);
    const csvFiles = files.filter((f) => f.endsWith(".csv"));

    const trades = new Map<string, Partial<TradeRecord>>();

    for (const file of csvFiles) {
      const content = await readFile(join(this.logDir, file), "utf-8");
      const lines = content.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const [timestamp, event, marketId, marketQuestion, action, details, belief, edge, amount, pnl] =
          line.split(",");

        if (event === "TRADE_EXECUTED") {
          // Parse belief range from details (format: "belief: 45-55")
          const beliefMatch = details?.match(/belief:\s*(\d+)-(\d+)/);
          const beliefLow = beliefMatch?.[1] ? parseFloat(beliefMatch[1]) : 0;
          const beliefHigh = beliefMatch?.[2] ? parseFloat(beliefMatch[2]) : 100;

          if (marketId) {
            trades.set(marketId, {
              timestamp: new Date(timestamp || new Date().toISOString()),
              marketId,
              marketQuestion: marketQuestion || "Unknown",
              action: action as "BUY_YES" | "BUY_NO",
              entryPrice: parseFloat(belief || "0"),
              amount: parseFloat(amount || "0"),
              belief: { low: beliefLow, high: beliefHigh },
              edge: parseFloat(edge || "0"),
              outcome: "OPEN",
            });
          }
        } else if (event === "POSITION_CLOSED" && marketId && trades.has(marketId)) {
          const trade = trades.get(marketId)!;
          const exitPrice = parseFloat(belief || "0");
          const tradePnL = parseFloat(pnl || "0");
          const holdingPeriod =
            (new Date(timestamp || new Date().toISOString()).getTime() - trade.timestamp!.getTime()) / (1000 * 60 * 60);

          trade.exitPrice = exitPrice;
          trade.pnl = tradePnL;
          trade.holdingPeriod = holdingPeriod;
          trade.outcome = tradePnL > 0.5 ? "WIN" : tradePnL < -0.5 ? "LOSS" : "BREAK_EVEN";

          this.tradeRecords.push(trade as TradeRecord);
          trades.delete(marketId);
        }
      }
    }

    // Add open positions
    for (const trade of trades.values()) {
      if (trade.timestamp && trade.marketId) {
        this.tradeRecords.push(trade as TradeRecord);
      }
    }

    console.log(`Loaded ${this.tradeRecords.length} trade records`);
  }

  /**
   * Calculate overall performance metrics
   */
  calculatePerformanceMetrics(): PerformanceMetrics {
    const closedTrades = this.tradeRecords.filter((t) => t.outcome !== "OPEN");
    const winningTrades = closedTrades.filter((t) => t.outcome === "WIN");
    const losingTrades = closedTrades.filter((t) => t.outcome === "LOSS");

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

    const averageHoldingPeriod =
      closedTrades.reduce((sum, t) => sum + (t.holdingPeriod || 0), 0) / (closedTrades.length || 1);

    // Calculate edge accuracy (did edge predict profit correctly?)
    const edgeAccurate = closedTrades.filter((t) => {
      const predictedProfit = t.edge > 0;
      const actualProfit = (t.pnl || 0) > 0;
      return predictedProfit === actualProfit;
    }).length;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of closedTrades) {
      runningPnL += trade.pnl || 0;
      peak = Math.max(peak, runningPnL);
      const drawdown = peak - runningPnL;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0,
      totalPnL,
      averagePnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
      averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      maxDrawdown,
      averageHoldingPeriod,
      edgeAccuracy: closedTrades.length > 0 ? edgeAccurate / closedTrades.length : 0,
    };
  }

  /**
   * Analyze patterns in trade performance
   */
  analyzePatterns(): PatternAnalysis {
    const closedTrades = this.tradeRecords.filter((t) => t.outcome !== "OPEN");

    // Category performance (extract from market question)
    const categoryMap = new Map<string, { wins: number; losses: number; totalPnL: number; trades: number }>();

    for (const trade of closedTrades) {
      // Simple category extraction from question (improve with better categorization)
      const question = trade.marketQuestion.toLowerCase();
      let category = "other";
      
      if (question.includes("election") || question.includes("president") || question.includes("vote")) {
        category = "politics";
      } else if (question.includes("crypto") || question.includes("bitcoin") || question.includes("eth")) {
        category = "crypto";
      } else if (question.includes("sport") || question.includes("nfl") || question.includes("nba")) {
        category = "sports";
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { wins: 0, losses: 0, totalPnL: 0, trades: 0 });
      }

      const stats = categoryMap.get(category)!;
      stats.trades++;
      stats.totalPnL += trade.pnl || 0;
      if (trade.outcome === "WIN") stats.wins++;
      if (trade.outcome === "LOSS") stats.losses++;
    }

    const categoryStats = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        winRate: stats.trades > 0 ? stats.wins / stats.trades : 0,
        avgPnL: stats.trades > 0 ? stats.totalPnL / stats.trades : 0,
        trades: stats.trades,
      }))
      .sort((a, b) => b.winRate - a.winRate);

    // Edge range analysis
    const edgeRanges = [
      { min: 0, max: 10, wins: 0, losses: 0 },
      { min: 10, max: 15, wins: 0, losses: 0 },
      { min: 15, max: 20, wins: 0, losses: 0 },
      { min: 20, max: 100, wins: 0, losses: 0 },
    ];

    for (const trade of closedTrades) {
      const edgePercent = trade.edge * 100;
      const range = edgeRanges.find((r) => edgePercent >= r.min && edgePercent < r.max);
      if (range) {
        if (trade.outcome === "WIN") range.wins++;
        if (trade.outcome === "LOSS") range.losses++;
      }
    }

    const optimalEdge = edgeRanges
      .map((r) => ({
        min: r.min,
        max: r.max,
        winRate: r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)[0] || { min: 0, max: 0, winRate: 0 };

    // Belief width analysis
    const beliefWidthRanges = [
      { min: 0, max: 10, wins: 0, losses: 0 },
      { min: 10, max: 15, wins: 0, losses: 0 },
      { min: 15, max: 20, wins: 0, losses: 0 },
      { min: 20, max: 25, wins: 0, losses: 0 },
    ];

    for (const trade of closedTrades) {
      const width = trade.belief.high - trade.belief.low;
      const range = beliefWidthRanges.find((r) => width >= r.min && width < r.max);
      if (range) {
        if (trade.outcome === "WIN") range.wins++;
        if (trade.outcome === "LOSS") range.losses++;
      }
    }

    const optimalBeliefWidth = beliefWidthRanges
      .map((r) => ({
        min: r.min,
        max: r.max,
        winRate: r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)[0] || { min: 0, max: 0, winRate: 0 };

    // Time of day analysis
    const hourStats = new Map<number, { wins: number; losses: number; trades: number }>();
    
    for (const trade of closedTrades) {
      const hour = trade.timestamp.getUTCHours();
      if (!hourStats.has(hour)) {
        hourStats.set(hour, { wins: 0, losses: 0, trades: 0 });
      }
      const stats = hourStats.get(hour)!;
      stats.trades++;
      if (trade.outcome === "WIN") stats.wins++;
      if (trade.outcome === "LOSS") stats.losses++;
    }

    const timeOfDayPatterns = Array.from(hourStats.entries())
      .map(([hour, stats]) => ({
        hour,
        winRate: stats.trades > 0 ? stats.wins / stats.trades : 0,
        trades: stats.trades,
      }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      bestCategories: categoryStats.slice(0, 3),
      worstCategories: categoryStats.slice(-3).reverse(),
      optimalEdgeRange: optimalEdge,
      optimalBeliefWidth: optimalBeliefWidth,
      timeOfDayPatterns: timeOfDayPatterns.slice(0, 5),
    };
  }

  /**
   * Get all trade records
   */
  getTradeRecords(): TradeRecord[] {
    return this.tradeRecords;
  }

  /**
   * Get recent trades (last N days)
   */
  getRecentTrades(days: number = 30): TradeRecord[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.tradeRecords.filter((t) => t.timestamp >= cutoffDate);
  }
}
