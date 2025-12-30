/**
 * Safety Controls for Real Trading
 * 
 * Implements safeguards to protect against:
 * - Excessive position sizes
 * - Daily loss limits
 * - System-wide emergency stops
 */

export interface SafetyConfig {
  maxPositionSize: number;    // Maximum USDC per position
  dailyLossLimit: number;     // Maximum daily loss in USDC
  maxOpenPositions: number;   // Maximum concurrent positions
  enabled: boolean;           // Kill switch
}

export interface PositionTracker {
  marketId: string;
  sizeUsd: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export class SafetyControls {
  private config: SafetyConfig;
  private dailyPnl: number = 0;
  private lastReset: Date = new Date();
  private positions: Map<string, PositionTracker> = new Map();

  constructor(config: SafetyConfig) {
    this.config = config;
  }

  /**
   * Check if a new trade is allowed
   */
  canTrade(marketId: string, sizeUsd: number): {
    allowed: boolean;
    reason?: string;
  } {
    // Kill switch check
    if (!this.config.enabled) {
      return {
        allowed: false,
        reason: "Trading disabled by kill switch",
      };
    }

    // Position size check
    if (sizeUsd > this.config.maxPositionSize) {
      return {
        allowed: false,
        reason: `Position size ${sizeUsd} exceeds maximum ${this.config.maxPositionSize}`,
      };
    }

    // Daily loss limit check
    this.resetDailyPnlIfNeeded();
    if (this.dailyPnl < -this.config.dailyLossLimit) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${this.dailyPnl.toFixed(2)} USDC`,
      };
    }

    // Max open positions check
    if (this.positions.size >= this.config.maxOpenPositions) {
      return {
        allowed: false,
        reason: `Maximum open positions (${this.config.maxOpenPositions}) reached`,
      };
    }

    // Check if position already exists for this market
    if (this.positions.has(marketId)) {
      return {
        allowed: false,
        reason: "Position already exists for this market (no averaging down)",
      };
    }

    return { allowed: true };
  }

  /**
   * Register a new position
   */
  addPosition(marketId: string, sizeUsd: number, entryPrice: number): void {
    this.positions.set(marketId, {
      marketId,
      sizeUsd,
      entryPrice,
      currentPrice: entryPrice,
      unrealizedPnl: 0,
    });
  }

  /**
   * Update position with current price
   */
  updatePosition(marketId: string, currentPrice: number): void {
    const position = this.positions.get(marketId);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.unrealizedPnl = (currentPrice - position.entryPrice) * position.sizeUsd;
  }

  /**
   * Close a position and record P&L
   */
  closePosition(marketId: string, exitPrice: number): number {
    const position = this.positions.get(marketId);
    if (!position) return 0;

    const realizedPnl = (exitPrice - position.entryPrice) * position.sizeUsd;
    this.dailyPnl += realizedPnl;
    this.positions.delete(marketId);

    return realizedPnl;
  }

  /**
   * Get current positions
   */
  getPositions(): PositionTracker[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get total unrealized P&L
   */
  getTotalUnrealizedPnl(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      total += position.unrealizedPnl;
    }
    return total;
  }

  /**
   * Get daily P&L
   */
  getDailyPnl(): number {
    this.resetDailyPnlIfNeeded();
    return this.dailyPnl;
  }

  /**
   * Emergency stop - disable all trading
   */
  enableKillSwitch(reason: string): void {
    this.config.enabled = false;
    console.error(`🚨 KILL SWITCH ACTIVATED: ${reason}`);
  }

  /**
   * Re-enable trading after kill switch
   */
  disableKillSwitch(): void {
    this.config.enabled = true;
    console.log("✅ Trading re-enabled");
  }

  /**
   * Check if trading is enabled
   */
  isTradingEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Reset daily P&L at midnight UTC
   */
  private resetDailyPnlIfNeeded(): void {
    const now = new Date();
    const lastResetDate = this.lastReset.toISOString().split("T")[0];
    const currentDate = now.toISOString().split("T")[0];

    if (lastResetDate !== currentDate) {
      console.log(`📊 Daily P&L reset (previous: ${this.dailyPnl.toFixed(2)} USDC)`);
      this.dailyPnl = 0;
      this.lastReset = now;
    }
  }

  /**
   * Get safety status
   */
  getStatus(): {
    tradingEnabled: boolean;
    dailyPnl: number;
    openPositions: number;
    maxPositions: number;
    dailyLossLimit: number;
    dailyLossRemaining: number;
  } {
    this.resetDailyPnlIfNeeded();
    
    return {
      tradingEnabled: this.config.enabled,
      dailyPnl: this.dailyPnl,
      openPositions: this.positions.size,
      maxPositions: this.config.maxOpenPositions,
      dailyLossLimit: this.config.dailyLossLimit,
      dailyLossRemaining: this.config.dailyLossLimit + this.dailyPnl,
    };
  }
}
