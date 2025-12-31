/**
 * Portfolio Management Module
 * 
 * Implements advanced portfolio management features:
 * - Risk-adjusted position sizing (Kelly Criterion)
 * - Correlation-based diversification
 * - Enhanced drawdown protection
 */

export interface PortfolioConfig {
  totalCapital: number; // Total capital available for trading
  maxRiskPerTrade: number; // Maximum % of capital to risk per trade (default: 2%)
  kellyFraction: number; // Fraction of Kelly to use (default: 0.25 for quarter-Kelly)
  correlationThreshold: number; // Max correlation for diversification (default: 0.7)
  maxDrawdownPercent: number; // Max portfolio drawdown % (default: 10%)
}

export interface Position {
  marketId: string;
  marketQuestion: string;
  category: string;
  sizeUsd: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  correlation: Map<string, number>; // Correlation with other positions
}

export interface PositionSizingRecommendation {
  recommendedSize: number; // USD amount
  method: "KELLY" | "FIXED" | "CONSERVATIVE";
  reasoning: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  warnings: string[];
}

/**
 * PortfolioManager - Advanced portfolio management and position sizing
 */
export class PortfolioManager {
  private config: PortfolioConfig;
  private positions: Map<string, Position> = new Map();
  private portfolioValue: number;
  private portfolioPeak: number = 0;
  private historicalReturns: number[] = [];

  constructor(config: PortfolioConfig) {
    this.config = config;
    this.portfolioValue = config.totalCapital;
    this.portfolioPeak = config.totalCapital;
  }

  /**
   * Calculate optimal position size using Kelly Criterion
   * 
   * Kelly formula: f = (bp - q) / b
   * Where:
   * - f = fraction of capital to bet
   * - b = odds received (edge / (1 - winProb))
   * - p = probability of winning (confidence)
   * - q = probability of losing (1 - p)
   * 
   * We use fractional Kelly (typically 1/4 Kelly) for safety
   */
  calculateKellySize(
    edge: number,
    confidence: number,
    winRate?: number
  ): PositionSizingRecommendation {
    const warnings: string[] = [];

    // Use historical win rate if available, otherwise use confidence as proxy
    const p = winRate !== undefined ? winRate : confidence / 100;
    const q = 1 - p;

    // Edge represents the expected value advantage
    // Convert edge to odds: if edge is 10%, and we expect 60% win, odds are edge/(1-p)
    const b = edge / q;

    // Kelly fraction
    const kellyFraction = (b * p - q) / b;

    // Apply fractional Kelly for safety
    const adjustedKelly = Math.max(0, kellyFraction * this.config.kellyFraction);

    // Calculate position size
    const rawSize = this.portfolioValue * adjustedKelly;

    // Apply risk limits
    const maxRiskSize = this.portfolioValue * this.config.maxRiskPerTrade;
    const recommendedSize = Math.min(rawSize, maxRiskSize);

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    const riskPercent = (recommendedSize / this.portfolioValue) * 100;

    if (riskPercent > 5) {
      riskLevel = "HIGH";
      warnings.push(`High risk: ${riskPercent.toFixed(1)}% of portfolio`);
    } else if (riskPercent > 2) {
      riskLevel = "MEDIUM";
    }

    // Validate Kelly calculation
    if (kellyFraction < 0) {
      warnings.push("Negative Kelly - no edge detected");
      return {
        recommendedSize: 0,
        method: "CONSERVATIVE",
        reasoning: "Negative Kelly indicates no positive edge",
        riskLevel: "LOW",
        warnings,
      };
    }

    if (kellyFraction > 0.5) {
      warnings.push(`Very high Kelly (${(kellyFraction * 100).toFixed(1)}%) - using conservative limit`);
    }

    return {
      recommendedSize: Math.round(recommendedSize * 100) / 100,
      method: "KELLY",
      reasoning: `Quarter-Kelly sizing: ${(adjustedKelly * 100).toFixed(1)}% of portfolio, limited by ${this.config.maxRiskPerTrade * 100}% max risk`,
      riskLevel,
      warnings,
    };
  }

  /**
   * Check correlation with existing positions for diversification
   */
  checkDiversification(
    marketCategory: string,
    marketKeywords: string[]
  ): {
    diversified: boolean;
    correlationScore: number;
    reason: string;
  } {
    if (this.positions.size === 0) {
      return {
        diversified: true,
        correlationScore: 0,
        reason: "No existing positions",
      };
    }

    // Calculate simple correlation based on category and keyword overlap
    const categoryPositions = Array.from(this.positions.values()).filter(
      (p) => p.category === marketCategory
    );

    const categoryConcentration = categoryPositions.length / this.positions.size;

    // Check keyword overlap with existing positions
    let maxCorrelation = 0;
    let correlatedMarket = "";

    for (const position of this.positions.values()) {
      const positionKeywords = position.marketQuestion.toLowerCase().split(" ");
      const overlapCount = marketKeywords.filter((kw) =>
        positionKeywords.some((pk) => pk.includes(kw.toLowerCase()))
      ).length;

      const correlation = overlapCount / Math.max(marketKeywords.length, positionKeywords.length);

      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        correlatedMarket = position.marketQuestion;
      }
    }

    // Consider diversified if:
    // 1. Category concentration < 50%
    // 2. Keyword correlation < threshold
    const diversified =
      categoryConcentration < 0.5 && maxCorrelation < this.config.correlationThreshold;

    let reason = "";
    if (!diversified) {
      if (categoryConcentration >= 0.5) {
        reason = `High category concentration: ${(categoryConcentration * 100).toFixed(0)}% in ${marketCategory}`;
      } else {
        reason = `High correlation (${(maxCorrelation * 100).toFixed(0)}%) with "${correlatedMarket}"`;
      }
    } else {
      reason = "Well diversified across categories and topics";
    }

    return {
      diversified,
      correlationScore: Math.max(categoryConcentration, maxCorrelation),
      reason,
    };
  }

  /**
   * Check drawdown protection
   */
  checkDrawdownProtection(): {
    withinLimit: boolean;
    currentDrawdown: number;
    reason: string;
  } {
    this.portfolioPeak = Math.max(this.portfolioPeak, this.portfolioValue);
    const drawdown = (this.portfolioPeak - this.portfolioValue) / this.portfolioPeak;
    const drawdownPercent = drawdown * 100;

    const withinLimit = drawdownPercent <= this.config.maxDrawdownPercent;

    return {
      withinLimit,
      currentDrawdown: drawdownPercent,
      reason: withinLimit
        ? `Drawdown ${drawdownPercent.toFixed(1)}% within ${this.config.maxDrawdownPercent}% limit`
        : `Drawdown ${drawdownPercent.toFixed(1)}% exceeds ${this.config.maxDrawdownPercent}% limit - reduce exposure`,
    };
  }

  /**
   * Add a new position to the portfolio
   */
  addPosition(position: Position): void {
    this.positions.set(position.marketId, position);
    this.portfolioValue -= position.sizeUsd; // Reduce available capital
  }

  /**
   * Update position with current price
   */
  updatePosition(marketId: string, currentPrice: number): void {
    const position = this.positions.get(marketId);
    if (position) {
      position.currentPrice = currentPrice;
      position.unrealizedPnl = (currentPrice - position.entryPrice) * position.sizeUsd;
    }
  }

  /**
   * Close a position and realize P&L
   */
  closePosition(marketId: string, exitPrice: number): number {
    const position = this.positions.get(marketId);
    if (!position) return 0;

    const realizedPnl = (exitPrice - position.entryPrice) * position.sizeUsd;
    this.portfolioValue += position.sizeUsd + realizedPnl;
    this.historicalReturns.push(realizedPnl / position.sizeUsd);

    this.positions.delete(marketId);
    return realizedPnl;
  }

  /**
   * Get current portfolio status
   */
  getPortfolioStatus(): {
    totalValue: number;
    availableCapital: number;
    allocatedCapital: number;
    openPositions: number;
    unrealizedPnl: number;
    drawdown: number;
  } {
    const allocatedCapital = Array.from(this.positions.values()).reduce(
      (sum, p) => sum + p.sizeUsd,
      0
    );
    const unrealizedPnl = Array.from(this.positions.values()).reduce(
      (sum, p) => sum + p.unrealizedPnl,
      0
    );

    const totalValue = this.portfolioValue + allocatedCapital + unrealizedPnl;
    const drawdown = (this.portfolioPeak - totalValue) / this.portfolioPeak;

    return {
      totalValue,
      availableCapital: this.portfolioValue,
      allocatedCapital,
      openPositions: this.positions.size,
      unrealizedPnl,
      drawdown: drawdown * 100,
    };
  }

  /**
   * Get all positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Calculate Sharpe ratio (if enough historical data)
   */
  calculateSharpeRatio(riskFreeRate: number = 0.05): number | undefined {
    if (this.historicalReturns.length < 10) return undefined;

    const avgReturn =
      this.historicalReturns.reduce((sum, r) => sum + r, 0) / this.historicalReturns.length;
    const variance =
      this.historicalReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      this.historicalReturns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return undefined;

    return (avgReturn - riskFreeRate) / stdDev;
  }
}
