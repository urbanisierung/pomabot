/**
 * Polymarket API Connector
 * 
 * Integrates with Polymarket's CLOB API to:
 * - Fetch market data (with pagination)
 * - Monitor price changes
 * - Place and manage orders
 */

import type { Market } from "@pomabot/shared";

// Pagination end marker
const END_CURSOR = "LTE=";

export interface PolymarketMarketResponse {
  condition_id: string;
  question: string;
  description: string;
  end_date_iso: string;
  outcomes: string[];
  volume: string;
  liquidity: string;
  tokens?: Array<{ outcome: string; price: number; winner?: boolean }>;
  active?: boolean;
  closed?: boolean;
}

export interface PolymarketApiResponse {
  data: PolymarketMarketResponse[];
  next_cursor?: string;
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
   * Fetch all active markets from Polymarket with pagination
   * Filters out closed/expired markets
   */
  async fetchMarkets(): Promise<Market[]> {
    try {
      const allMarkets: Market[] = [];
      let nextCursor = "MA=="; // Start cursor
      let pageCount = 0;
      const maxPages = 50; // Safety limit to prevent infinite loops
      
      console.log("📡 Fetching markets from Polymarket CLOB API...");
      
      while (nextCursor !== END_CURSOR && pageCount < maxPages) {
        const response = await fetch(
          `${this.baseUrl}/markets?next_cursor=${nextCursor}`
        );
        
        if (!response.ok) {
          throw new Error(`Polymarket API error: ${response.statusText}`);
        }

        const result = await response.json() as PolymarketApiResponse;
        const data = result.data ?? [];
        
        // Filter and transform markets
        const now = new Date();
        for (const market of data) {
          // Skip closed or already resolved markets
          if (market.closed) continue;
          
          // Skip markets that have already ended
          const endDate = new Date(market.end_date_iso);
          if (endDate < now) continue;
          
          // Skip markets with a winner already (resolved)
          const hasWinner = market.tokens?.some(t => t.winner === true);
          if (hasWinner) continue;
          
          allMarkets.push(this.transformMarket(market));
        }
        
        nextCursor = result.next_cursor ?? END_CURSOR;
        pageCount++;
        
        if (process.env.VERBOSE === "true") {
          console.log(`   Page ${pageCount}: ${data.length} markets (${allMarkets.length} active total)`);
        }
      }
      
      console.log(`✅ Fetched ${allMarkets.length} active markets from ${pageCount} pages`);
      return allMarkets;
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
      
      // Validate required fields exist
      if (!data.question || !data.condition_id) {
        return undefined;
      }
      
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
    
    // Get price from tokens array (first token's price, convert to percentage)
    const price = data.tokens?.[0]?.price ?? 0.5;
    
    return {
      id: data.condition_id,
      question: data.question,
      resolution_criteria: data.description,
      category,
      current_price: price * 100, // Convert to percentage
      liquidity: parseFloat(data.liquidity ?? "0"),
      volume_24h: parseFloat(data.volume ?? "0"),
      created_at: new Date(),
      closes_at: new Date(data.end_date_iso),
    };
  }

  /**
   * Categorize market based on question content
   * Uses keyword matching to classify markets into appropriate categories
   */
  private categorizeMarket(question: string): Market["category"] {
    const lowerQuestion = question.toLowerCase();
    
    // Define keywords for each category (ordered by specificity)
    const categoryKeywords = {
      crypto: [
        "bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency",
        "blockchain", "defi", "nft", "token", "coin", "wallet",
        "satoshi", "mining", "web3", "dao"
      ],
      sports: [
        "nfl", "nba", "mlb", "nhl", "uefa", "fifa", "olympics",
        "super bowl", "world cup", "championship", "playoff", "team",
        "win", "lose", "score", "game", "match", "tournament",
        "player", "coach", "mvp", "draft"
      ],
      weather: [
        "temperature", "weather", "hurricane", "storm", "rain",
        "snow", "celsius", "fahrenheit", "climate", "tornado",
        "flood", "drought", "heat wave", "cold snap"
      ],
      entertainment: [
        "oscar", "grammy", "emmy", "golden globe", "cannes",
        "movie", "film", "album", "song", "celebrity", "actor",
        "actress", "tv show", "series", "season finale", "award"
      ],
      economics: [
        "gdp", "inflation", "interest rate", "federal reserve", "fed",
        "unemployment", "jobs report", "cpi", "dow", "s&p 500",
        "nasdaq", "stock market", "recession", "economic growth"
      ],
      technology: [
        "apple", "google", "microsoft", "amazon", "meta", "tesla",
        "iphone", "android", "ai", "artificial intelligence",
        "product launch", "tech", "software", "hardware", "app"
      ],
      world: [
        "war", "peace", "treaty", "nato", "un", "united nations",
        "international", "country", "nuclear", "sanction",
        "diplomat", "summit", "g7", "g20", "conflict"
      ],
      politics: [
        "election", "president", "senate", "congress", "vote",
        "democrat", "republican", "governor", "mayor", "bill",
        "legislation", "policy", "government", "impeachment"
      ],
    };
    
    // Check each category in order of specificity
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return category as Market["category"];
      }
    }
    
    // Default to "other" if no match
    return "other";
  }
}
