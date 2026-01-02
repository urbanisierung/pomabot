/**
 * Paper Trading Module
 * Phase 11: Track simulated positions until market resolution
 * 
 * Validates trading strategy by:
 * - Tracking paper positions from entry to resolution
 * - Calculating actual P&L when markets resolve
 * - Measuring prediction quality (edge accuracy, calibration)
 * - Building confidence before live trading
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import type { TradeSide } from "@pomabot/shared";

export interface PaperPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  category: string;
  side: TradeSide;
  entryPrice: number;          // Market price at entry
  beliefLow: number;           // Our belief range
  beliefHigh: number;
  edge: number;                // Edge at entry
  sizeUsd: number;             // Virtual position size
  entryTimestamp: Date;
  status: "OPEN" | "WIN" | "LOSS" | "EXPIRED";
  exitPrice?: number;          // Final price at resolution
  resolvedTimestamp?: Date;
  pnl?: number;                // Calculated P&L
  actualOutcome?: "YES" | "NO"; // What actually happened
}

export interface PaperTradingMetrics {
  totalPositions: number;
  resolvedPositions: number;
  openPositions: number;
  
  // P&L Metrics
  totalPnL: number;            // Sum of all closed positions
  unrealizedPnL: number;       // Current open position value
  winRate: number;             // % of winning trades
  averageWin: number;
  averageLoss: number;
  profitFactor: number;        // Total wins / Total losses
  
  // Prediction Quality Metrics
  edgeAccuracy: number;        // Did edge correctly predict outcome?
  beliefCoverageRate: number;  // How often did outcome fall within belief range?
  avgEdgeOnWins: number;       // Average edge for winning trades
  avgEdgeOnLosses: number;     // Average edge for losing trades
  
  // By Category
  categoryPerformance: Map<string, {
    winRate: number;
    avgPnL: number;
    trades: number;
  }>;
}

export interface CalibrationBucket {
  beliefRange: string;         // e.g., "60-70%"
  predictedProbability: number;
  actualWinRate: number;
  trades: number;
  calibrationError: number;    // |predicted - actual|
}

export interface CalibrationAnalysis {
  calibrationBuckets: CalibrationBucket[];
  brierScore: number;          // Lower is better (0 = perfect)
  overallCalibration: number;  // Average calibration error
  recommendations: string[];
}

/**
 * PaperTradingTracker - Tracks simulated positions until resolution
 */
export class PaperTradingTracker {
  private positions: Map<string, PaperPosition> = new Map();
  private storageFile: string;

  constructor(
    storageFile: string = "./data/paper-positions.json",
    _portfolioCapital: number = 10000
  ) {
    this.storageFile = storageFile;
  }

  /**
   * Initialize - load existing positions from disk
   */
  async initialize(): Promise<void> {
    try {
      if (existsSync(this.storageFile)) {
        const content = await readFile(this.storageFile, "utf-8");
        const data = JSON.parse(content);
        
        // Restore positions with Date objects
        for (const [id, pos] of Object.entries(data)) {
          const position = pos as PaperPosition;
          this.positions.set(id, {
            ...position,
            entryTimestamp: new Date(position.entryTimestamp),
            resolvedTimestamp: position.resolvedTimestamp 
              ? new Date(position.resolvedTimestamp) 
              : undefined,
          });
        }
        
        console.log(`📊 Loaded ${this.positions.size} paper positions from disk`);
      } else {
        console.log("📊 No existing paper positions found - starting fresh");
      }
    } catch (error) {
      console.error("Failed to load paper positions:", error);
    }
  }

  /**
   * Create a paper position for a simulated trade
   */
  async createPosition(params: {
    marketId: string;
    marketQuestion: string;
    category: string;
    side: TradeSide;
    entryPrice: number;
    beliefLow: number;
    beliefHigh: number;
    edge: number;
    sizeUsd: number;
  }): Promise<PaperPosition> {
    const position: PaperPosition = {
      id: this.generatePositionId(),
      marketId: params.marketId,
      marketQuestion: params.marketQuestion,
      category: params.category,
      side: params.side,
      entryPrice: params.entryPrice,
      beliefLow: params.beliefLow,
      beliefHigh: params.beliefHigh,
      edge: params.edge,
      sizeUsd: params.sizeUsd,
      entryTimestamp: new Date(),
      status: "OPEN",
    };

    this.positions.set(position.id, position);
    await this.persist();

    console.log(`📝 Paper position created: ${params.side} on "${params.marketQuestion}" @ ${params.entryPrice}%`);
    return position;
  }

  /**
   * Resolve a paper position when market resolves
   */
  async resolvePosition(
    positionId: string,
    actualOutcome: "YES" | "NO",
    exitPrice: number
  ): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    // Calculate P&L
    // If we bet YES and YES won, we profit (exitPrice should be ~100)
    // If we bet YES and NO won, we lose (exitPrice should be ~0)
    const isWin = position.side === actualOutcome;
    
    // P&L calculation: (exitPrice - entryPrice) * sizeUsd / 100
    // For winners: bought at entryPrice, sells at 100
    // For losers: bought at entryPrice, sells at 0
    const pnl = ((exitPrice - position.entryPrice) * position.sizeUsd) / 100;

    position.status = isWin ? "WIN" : "LOSS";
    position.actualOutcome = actualOutcome;
    position.exitPrice = exitPrice;
    position.pnl = pnl;
    position.resolvedTimestamp = new Date();

    await this.persist();

    console.log(
      `✅ Paper position resolved: ${position.status} | P&L: ${pnl > 0 ? "+" : ""}$${pnl.toFixed(2)} | ${position.marketQuestion}`
    );
  }

  /**
   * Mark position as expired (market closed without resolution data)
   */
  async expirePosition(positionId: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.status = "EXPIRED";
    position.resolvedTimestamp = new Date();
    position.pnl = 0; // No P&L for expired positions

    await this.persist();
    console.log(`⏰ Paper position expired: ${position.marketQuestion}`);
  }

  /**
   * Get all positions
   */
  getAllPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get open positions only
   */
  getOpenPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).filter(p => p.status === "OPEN");
  }

  /**
   * Get resolved positions (WIN/LOSS/EXPIRED)
   */
  getResolvedPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).filter(
      p => p.status !== "OPEN"
    );
  }

  /**
   * Get position by ID
   */
  getPosition(id: string): PaperPosition | undefined {
    return this.positions.get(id);
  }

  /**
   * Get position by market ID
   */
  getPositionByMarketId(marketId: string): PaperPosition | undefined {
    return Array.from(this.positions.values()).find(
      p => p.marketId === marketId
    );
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(): PaperTradingMetrics {
    const allPositions = this.getAllPositions();
    const resolvedPositions = this.getResolvedPositions();
    const openPositions = this.getOpenPositions();

    // Filter out expired positions for win rate calculation
    const tradedPositions = resolvedPositions.filter(p => p.status !== "EXPIRED");
    const winningTrades = tradedPositions.filter(p => p.status === "WIN");
    const losingTrades = tradedPositions.filter(p => p.status === "LOSS");

    // P&L calculations
    const totalPnL = resolvedPositions.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
    const unrealizedPnL = 0; // TODO: Calculate based on current market prices
    
    const winRate = tradedPositions.length > 0 
      ? (winningTrades.length / tradedPositions.length) * 100 
      : 0;
    
    const totalWins = winningTrades.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, p) => sum + (p.pnl ?? 0), 0));
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Edge accuracy: Did our edge correctly predict the outcome?
    const tradesWithCorrectEdge = tradedPositions.filter(p => {
      if (p.status === "WIN") {
        // If we won, our edge was correct
        return true;
      }
      return false;
    });
    const edgeAccuracy = tradedPositions.length > 0 
      ? (tradesWithCorrectEdge.length / tradedPositions.length) * 100 
      : 0;

    // Belief coverage: Did actual outcome fall within our belief range?
    // For paper trading, we check if our belief range included the winning side
    const beliefCoverageCount = tradedPositions.filter(p => {
      if (p.actualOutcome === "YES") {
        // YES won - check if our belief range was high enough
        return p.beliefHigh >= 50;
      } else {
        // NO won - check if our belief range was low enough
        return p.beliefLow <= 50;
      }
    }).length;
    const beliefCoverageRate = tradedPositions.length > 0 
      ? (beliefCoverageCount / tradedPositions.length) * 100 
      : 0;

    const avgEdgeOnWins = winningTrades.length > 0
      ? winningTrades.reduce((sum, p) => sum + p.edge, 0) / winningTrades.length
      : 0;
    
    const avgEdgeOnLosses = losingTrades.length > 0
      ? losingTrades.reduce((sum, p) => sum + p.edge, 0) / losingTrades.length
      : 0;

    // Category performance
    const categoryPerformance = new Map<string, {
      winRate: number;
      avgPnL: number;
      trades: number;
    }>();

    const categoriesSet = new Set(tradedPositions.map(p => p.category));
    for (const category of categoriesSet) {
      const categoryTrades = tradedPositions.filter(p => p.category === category);
      const categoryWins = categoryTrades.filter(p => p.status === "WIN");
      const categoryPnL = categoryTrades.reduce((sum, p) => sum + (p.pnl ?? 0), 0);

      categoryPerformance.set(category, {
        winRate: (categoryWins.length / categoryTrades.length) * 100,
        avgPnL: categoryPnL / categoryTrades.length,
        trades: categoryTrades.length,
      });
    }

    return {
      totalPositions: allPositions.length,
      resolvedPositions: resolvedPositions.length,
      openPositions: openPositions.length,
      totalPnL,
      unrealizedPnL,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      edgeAccuracy,
      beliefCoverageRate,
      avgEdgeOnWins,
      avgEdgeOnLosses,
      categoryPerformance,
    };
  }

  /**
   * Calculate calibration analysis
   * Checks if our probability estimates match actual outcomes
   */
  calculateCalibration(): CalibrationAnalysis {
    const resolvedPositions = this.getResolvedPositions().filter(
      p => p.status !== "EXPIRED"
    );

    // Group trades by belief buckets
    const buckets = new Map<string, { predicted: number; wins: number; total: number }>();
    const bucketRanges = [
      { min: 0, max: 60, label: "0-60%" },
      { min: 60, max: 70, label: "60-70%" },
      { min: 70, max: 80, label: "70-80%" },
      { min: 80, max: 90, label: "80-90%" },
      { min: 90, max: 100, label: "90-100%" },
    ];

    for (const range of bucketRanges) {
      buckets.set(range.label, { predicted: (range.min + range.max) / 2, wins: 0, total: 0 });
    }

    // Calculate actual win rates per bucket
    for (const position of resolvedPositions) {
      const midpoint = (position.beliefLow + position.beliefHigh) / 2;
      
      for (const range of bucketRanges) {
        if (midpoint >= range.min && midpoint < range.max) {
          const bucket = buckets.get(range.label);
          if (bucket) {
            bucket.total++;
            if (position.status === "WIN") {
              bucket.wins++;
            }
          }
          break;
        }
      }
    }

    // Build calibration buckets
    const calibrationBuckets: CalibrationBucket[] = [];
    for (const [label, data] of buckets.entries()) {
      if (data.total > 0) {
        const actualWinRate = (data.wins / data.total) * 100;
        calibrationBuckets.push({
          beliefRange: label,
          predictedProbability: data.predicted,
          actualWinRate,
          trades: data.total,
          calibrationError: Math.abs(data.predicted - actualWinRate),
        });
      }
    }

    // Calculate Brier score (lower is better)
    let brierScore = 0;
    for (const position of resolvedPositions) {
      const predicted = (position.beliefLow + position.beliefHigh) / 2 / 100; // Convert to 0-1
      const actual = position.status === "WIN" ? 1 : 0;
      brierScore += Math.pow(predicted - actual, 2);
    }
    brierScore = resolvedPositions.length > 0 ? brierScore / resolvedPositions.length : 0;

    // Overall calibration error
    const overallCalibration = calibrationBuckets.length > 0
      ? calibrationBuckets.reduce((sum, b) => sum + b.calibrationError, 0) / calibrationBuckets.length
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (brierScore > 0.25) {
      recommendations.push("High Brier score indicates poor prediction accuracy. Consider refining belief calculations.");
    }
    
    if (overallCalibration > 15) {
      recommendations.push("Significant calibration error detected. Your confidence estimates may be off.");
    }

    // Check for over/under confidence
    for (const bucket of calibrationBuckets) {
      if (bucket.calibrationError > 20 && bucket.trades >= 3) {
        if (bucket.actualWinRate < bucket.predictedProbability) {
          recommendations.push(
            `Over-confident in ${bucket.beliefRange} range. Consider lowering belief estimates.`
          );
        } else {
          recommendations.push(
            `Under-confident in ${bucket.beliefRange} range. Your predictions are better than estimated.`
          );
        }
      }
    }

    return {
      calibrationBuckets,
      brierScore,
      overallCalibration,
      recommendations,
    };
  }

  /**
   * Clear all positions (for testing)
   */
  async reset(): Promise<void> {
    this.positions.clear();
    await this.persist();
    console.log("🔄 Paper trading positions reset");
  }

  /**
   * Persist positions to disk
   */
  private async persist(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(this.storageFile);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Convert Map to object for JSON serialization
      const data: Record<string, PaperPosition> = {};
      for (const [id, position] of this.positions.entries()) {
        data[id] = position;
      }

      await writeFile(this.storageFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to persist paper positions:", error);
    }
  }

  /**
   * Generate unique position ID
   */
  private generatePositionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 36).toString(36)
    ).join("");
    return `paper_${timestamp}_${randomPart}`;
  }
}
