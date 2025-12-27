/**
 * Execution Layer
 * Implementation of Section 10 from polymarket_ai_deterministic_spec.md
 * 
 * Handles order execution with proper constraints:
 * - Limit orders only
 * - No averaging down
 * - Execution cannot override belief logic
 */

import type { TradeDecision, TradeSide } from "@pomabot/shared";

export interface Order {
  id: string;
  market_id: string;
  side: TradeSide;
  size_usd: number;
  limit_price: number;
  status: "pending" | "partial" | "filled" | "cancelled";
  filled_size: number;
  created_at: Date;
  updated_at: Date;
}

export interface ExecutionResult {
  success: boolean;
  order?: Order;
  error?: string;
}

/**
 * Execution constraints from Section 10
 */
export class ExecutionLayer {
  private orders: Map<string, Order> = new Map();
  private activePositions: Map<string, Order> = new Map();

  /**
   * Execute a trade decision
   * Section 10: Use limit orders only
   */
  async executeTrade(
    decision: TradeDecision,
    marketId: string
  ): Promise<ExecutionResult> {
    // Validation: No trades without decisions
    if (decision.side === "NONE") {
      return {
        success: false,
        error: "Cannot execute NONE trade",
      };
    }

    // Check for existing position (no averaging down)
    if (this.activePositions.has(marketId)) {
      return {
        success: false,
        error: "Position already exists - no averaging down allowed",
      };
    }

    // Create limit order
    const order: Order = {
      id: this.generateOrderId(),
      market_id: marketId,
      side: decision.side,
      size_usd: decision.size_usd,
      limit_price: decision.entry_price,
      status: "pending",
      filled_size: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.orders.set(order.id, order);

    // In a real implementation, this would submit to Polymarket API
    // For now, we'll mark it as pending
    return {
      success: true,
      order,
    };
  }

  /**
   * Check if a position exists for a market
   */
  hasPosition(marketId: string): boolean {
    return this.activePositions.has(marketId);
  }

  /**
   * Get active position for a market
   */
  getPosition(marketId: string): Order | undefined {
    return this.activePositions.get(marketId);
  }

  /**
   * Get all active positions
   */
  getAllPositions(): Order[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Update order status (would be called by market data feed)
   */
  updateOrderStatus(
    orderId: string,
    status: Order["status"],
    filledSize?: number
  ): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.status = status;
    order.updated_at = new Date();

    if (filledSize !== undefined) {
      order.filled_size = filledSize;
    }

    // If filled, add to active positions
    if (status === "filled") {
      this.activePositions.set(order.market_id, order);
    }

    // If cancelled, remove from active positions
    if (status === "cancelled") {
      this.activePositions.delete(order.market_id);
    }
  }

  /**
   * Close a position
   */
  closePosition(marketId: string): boolean {
    if (!this.activePositions.has(marketId)) {
      return false;
    }

    this.activePositions.delete(marketId);
    return true;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === "filled") {
      return false; // Cannot cancel filled orders
    }

    this.updateOrderStatus(orderId, "cancelled");
    return true;
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Global Invariant Check: Execution cannot override belief logic
 * This is enforced by requiring a valid TradeDecision to execute
 */
export function validateExecutionInvariant(decision: TradeDecision): boolean {
  // Must have exit conditions
  if (decision.exit_conditions.length === 0) {
    return false;
  }

  // Must have valid side
  if (decision.side === "NONE") {
    return false;
  }

  // Must have positive size
  if (decision.size_usd <= 0) {
    return false;
  }

  return true;
}
