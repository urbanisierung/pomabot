/**
 * Polymarket API Connector
 * 
 * Integrates with Polymarket's CLOB API to:
 * - Fetch market data
 * - Monitor price changes
 * - Place and manage orders
 */

import type { Market } from "@pomabot/shared";

export interface PolymarketMarketResponse {
  condition_id: string;
  question: string;
  description: string;
  end_date_iso: string;
  outcomes: string[];
  volume: string;
  liquidity: string;
  last_price: string;
}

export interface OrderRequest {
  market_id: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  size: number;
  price: number;
  type: "LIMIT" | "MARKET";
}

export class PolymarketConnector {
  private baseUrl = "https://clob.polymarket.com";
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch all active markets from Polymarket
   */
  async fetchMarkets(): Promise<Market[]> {
    try {
      const response = await fetch(`${this.baseUrl}/markets?active=true`);
      
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.statusText}`);
      }

      const data = await response.json() as PolymarketMarketResponse[];
      
      return data.map(market => this.transformMarket(market));
    } catch (error) {
      console.error("Failed to fetch Polymarket markets:", error);
      return [];
    }
  }

  /**
   * Get specific market by ID
   */
  async getMarket(marketId: string): Promise<Market | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/markets/${marketId}`);
      
      if (!response.ok) {
        return undefined;
      }

      const data = await response.json() as PolymarketMarketResponse;
      return this.transformMarket(data);
    } catch (error) {
      console.error(`Failed to fetch market ${marketId}:`, error);
      return undefined;
    }
  }

  /**
   * Place a limit order
   */
  async placeOrder(request: OrderRequest): Promise<{ orderId: string } | undefined> {
    if (!this.apiKey) {
      console.warn("API key required for trading");
      return undefined;
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          market: request.market_id,
          side: request.side,
          outcome: request.outcome,
          size: request.size.toString(),
          price: request.price.toString(),
          type: request.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`Order placement failed: ${response.statusText}`);
      }

      const result = await response.json() as { orderId: string };
      return result;
    } catch (error) {
      console.error("Failed to place order:", error);
      return undefined;
    }
  }

  /**
   * Get current order book for a market
   */
  async getOrderBook(marketId: string): Promise<{
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/markets/${marketId}/book`);
      
      if (!response.ok) {
        return { bids: [], asks: [] };
      }

      const result = await response.json() as {
        bids: Array<{ price: number; size: number }>;
        asks: Array<{ price: number; size: number }>;
      };
      return result;
    } catch (error) {
      console.error(`Failed to fetch order book for ${marketId}:`, error);
      return { bids: [], asks: [] };
    }
  }

  /**
   * Transform Polymarket API response to internal Market type
   */
  private transformMarket(data: PolymarketMarketResponse): Market {
    const category = this.categorizeMarket(data.question);
    
    return {
      id: data.condition_id,
      question: data.question,
      resolution_criteria: data.description,
      category,
      current_price: parseFloat(data.last_price) * 100, // Convert to percentage
      liquidity: parseFloat(data.liquidity),
      volume_24h: parseFloat(data.volume),
      created_at: new Date(),
      closes_at: new Date(data.end_date_iso),
    };
  }

  /**
   * Categorize market based on question content
   */
  private categorizeMarket(question: string): "politics" | "crypto" {
    const lowerQuestion = question.toLowerCase();
    
    const politicsKeywords = [
      "election", "president", "senate", "congress", "vote",
      "trump", "biden", "democrat", "republican", "governor"
    ];
    
    const cryptoKeywords = [
      "bitcoin", "btc", "ethereum", "eth", "crypto", "sec",
      "etf", "blockchain", "defi", "nft"
    ];
    
    // Check for crypto keywords first (more specific)
    if (cryptoKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      return "crypto";
    }
    
    // Default to politics
    if (politicsKeywords.some(keyword => lowerQuestion.includes(keyword))) {
      return "politics";
    }
    
    // Default fallback
    return "politics";
  }
}
