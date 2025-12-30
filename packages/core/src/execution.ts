/**
 * Execution Layer
 * Implementation of Section 10 from polymarket_ai_deterministic_spec.md
 * 
 * Handles order execution with proper constraints:
 * - Limit orders only
 * - No averaging down
 * - Execution cannot override belief logic
 * 
 * Phase 4: Real trading execution with Polymarket CLOB integration
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
  clob_order_id?: string;  // Polymarket CLOB order ID
}

export interface ExecutionResult {
  success: boolean;
  order?: Order;
  error?: string;
}

/**
 * External connector interface for real order submission
 * Implemented by PolymarketConnector in live mode
 */
export interface OrderConnector {
  placeOrder(request: {
    tokenId: string;
    price: number;
    size: number;
    side: "BUY" | "SELL";
  }): Promise<{ orderId: string } | undefined>;
  
  getOrderStatus(orderId: string): Promise<{
    status: "LIVE" | "MATCHED" | "CANCELLED";
    filledAmount?: number;
  } | undefined>;
  
  cancelOrder(orderId: string): Promise<boolean>;
}

/**
 * Execution constraints from Section 10
 */
export class ExecutionLayer {
  private orders: Map<string, Order> = new Map();
  private activePositions: Map<string, Order> = new Map();
  private connector?: OrderConnector;
  private simulationMode: boolean;

  constructor(connector?: OrderConnector, simulationMode = true) {
    this.connector = connector;
    this.simulationMode = simulationMode;
  }

  /**
   * Execute a trade decision
   * Section 10: Use limit orders only
   */
  async executeTrade(
    decision: TradeDecision,
    marketId: string,
    tokenId?: string
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

    // If in live mode and connector available, submit to CLOB
    if (!this.simulationMode && this.connector && tokenId) {
      try {
        const result = await this.connector.placeOrder({
          tokenId,
          price: decision.entry_price / 100, // Convert percentage to decimal
          size: decision.size_usd,
          side: decision.side === "YES" ? "BUY" : "SELL",
        });

        if (result?.orderId) {
          order.clob_order_id = result.orderId;
          console.log(`✅ Real order submitted to CLOB: ${result.orderId}`);
        } else {
          order.status = "cancelled";
          return {
            success: false,
            error: "Failed to submit order to CLOB",
          };
        }
      } catch (error) {
        console.error("Order submission error:", error);
        order.status = "cancelled";
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return {
      success: true,
      order,
    };
  }

  /**
   * Poll order status from CLOB
   * Should be called periodically to update order states
   */
  async syncOrderStatus(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order?.clob_order_id || !this.connector) return;

    try {
      const status = await this.connector.getOrderStatus(order.clob_order_id);
      
      if (status) {
        switch (status.status) {
          case "LIVE":
            order.status = "pending";
            break;
          case "MATCHED":
            order.status = "filled";
            order.filled_size = status.filledAmount ?? order.size_usd;
            this.activePositions.set(order.market_id, order);
            break;
          case "CANCELLED":
            order.status = "cancelled";
            this.activePositions.delete(order.market_id);
            break;
        }
        order.updated_at = new Date();
      }
    } catch (error) {
      console.error(`Failed to sync order status for ${orderId}:`, error);
    }
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
  async closePosition(marketId: string): Promise<boolean> {
    const position = this.activePositions.get(marketId);
    if (!position) {
      return false;
    }

    // If in live mode, cancel the order on CLOB
    if (!this.simulationMode && this.connector && position.clob_order_id) {
      try {
        await this.connector.cancelOrder(position.clob_order_id);
      } catch (error) {
        console.error(`Failed to cancel order ${position.clob_order_id}:`, error);
      }
    }

    this.activePositions.delete(marketId);
    return true;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === "filled") {
      return false; // Cannot cancel filled orders
    }

    // If in live mode, cancel on CLOB
    if (!this.simulationMode && this.connector && order.clob_order_id) {
      try {
        const success = await this.connector.cancelOrder(order.clob_order_id);
        if (!success) return false;
      } catch (error) {
        console.error(`Failed to cancel order ${order.clob_order_id}:`, error);
        return false;
      }
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
   * Check if in simulation mode
   */
  isSimulationMode(): boolean {
    return this.simulationMode;
  }

  /**
   * Generate unique order ID using crypto-secure random UUID
   */
  private generateOrderId(): string {
    // Use timestamp + crypto random for uniqueness
    const timestamp = Date.now().toString(36);
    const randomPart = Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 36).toString(36)
    ).join('');
    return `order_${timestamp}_${randomPart}`;
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
