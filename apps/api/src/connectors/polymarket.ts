/**
 * Polymarket API Connector
 * 
 * Integrates with Polymarket's CLOB API to:
 * - Fetch market data (with pagination)
 * - Monitor price changes
 * - Place and manage orders
 * - Authenticate with wallet signatures
 */

import type { Market } from "@pomabot/shared";
import { WalletManager } from "./wallet.js";

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
  tokens?: Array<{ outcome: string; price: number; winner?: boolean; token_id?: string }>;
  active?: boolean;
  closed?: boolean;
}

export interface PolymarketApiResponse {
  data: PolymarketMarketResponse[];
  next_cursor?: string;
}

export interface OrderRequest {
  tokenId: string;       // Market token ID (from market.tokens[].token_id)
  price: number;         // 0.01 to 0.99
  size: number;          // Amount in USDC terms
  side: "BUY" | "SELL";
  feeRateBps?: number;   // Fee rate in basis points (default: 0)
  nonce?: number;        // Nonce for order uniqueness
  expiration?: number;   // Unix timestamp for order expiration
}

export interface ClobAuthCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

export enum SignatureType {
  EOA = 0,      // Externally Owned Account
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

export class PolymarketConnector {
  private baseUrl = "https://clob.polymarket.com";
  private wallet?: WalletManager;
  private authCredentials?: ClobAuthCredentials;

  constructor(wallet?: WalletManager) {
    this.wallet = wallet;
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
   * Authenticate with CLOB API using wallet signature
   * Derives API credentials from wallet signature
   */
  async authenticate(): Promise<boolean> {
    if (!this.wallet) {
      console.warn("Wallet required for authentication");
      return false;
    }

    try {
      // Step 1: Get nonce from server
      const address = this.wallet.getAddress();
      const nonceResponse = await fetch(`${this.baseUrl}/auth/nonce?address=${address}`);
      
      if (!nonceResponse.ok) {
        throw new Error("Failed to get authentication nonce");
      }

      const { nonce } = await nonceResponse.json() as { nonce: string };

      // Step 2: Sign the nonce with wallet
      const message = `This message attests that I control the given wallet\nNonce: ${nonce}`;
      const signature = await this.wallet.signMessage(message);

      // Step 3: Derive API credentials
      const credentialsResponse = await fetch(`${this.baseUrl}/auth/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          nonce,
          signature,
          signatureType: SignatureType.EOA,
        }),
      });

      if (!credentialsResponse.ok) {
        throw new Error("Failed to derive API credentials");
      }

      this.authCredentials = await credentialsResponse.json() as ClobAuthCredentials;
      console.log("✅ CLOB API authentication successful");
      return true;

    } catch (error) {
      console.error("CLOB authentication failed:", error);
      return false;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authCredentials !== undefined;
  }

  /**
   * Place a limit order on CLOB
   * Requires authentication
   */
  async placeOrder(request: OrderRequest): Promise<{ orderId: string } | undefined> {
    if (!this.wallet || !this.authCredentials) {
      console.warn("Wallet and authentication required for trading");
      return undefined;
    }

    try {
      // Build order object
      const timestamp = Math.floor(Date.now() / 1000);
      const order = {
        salt: Math.floor(Math.random() * 1000000000),
        maker: this.wallet.getAddress(),
        signer: this.wallet.getAddress(),
        taker: "0x0000000000000000000000000000000000000000",
        tokenId: request.tokenId,
        makerAmount: Math.floor(request.size * 1e6).toString(), // Convert to USDC units (6 decimals)
        takerAmount: Math.floor((request.size * request.price) * 1e6).toString(),
        side: request.side,
        feeRateBps: request.feeRateBps?.toString() ?? "0",
        nonce: request.nonce ?? timestamp,
        expiration: request.expiration ?? timestamp + 86400, // Default 24 hours
        signatureType: SignatureType.EOA,
      };

      // Sign order with EIP-712
      const domain = {
        name: "Polymarket CTF Exchange",
        version: "1",
        chainId: this.wallet.getChainId(),
        verifyingContract: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E", // Polymarket exchange contract
      };

      const types = {
        Order: [
          { name: "salt", type: "uint256" },
          { name: "maker", type: "address" },
          { name: "signer", type: "address" },
          { name: "taker", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "makerAmount", type: "uint256" },
          { name: "takerAmount", type: "uint256" },
          { name: "expiration", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "feeRateBps", type: "uint256" },
          { name: "side", type: "uint8" },
          { name: "signatureType", type: "uint8" },
        ],
      };

      const signature = await this.wallet.signTypedData(domain, types, order);

      // Submit order to CLOB
      const response = await fetch(`${this.baseUrl}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "POLY-API-KEY": this.authCredentials.apiKey,
          "POLY-SIGNATURE": signature,
          "POLY-TIMESTAMP": timestamp.toString(),
          "POLY-PASSPHRASE": this.authCredentials.apiPassphrase,
        },
        body: JSON.stringify({
          order,
          signature,
          orderType: "GTC", // Good Till Cancel
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order placement failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as { orderId: string; success: boolean };
      
      if (result.success) {
        console.log(`✅ Order placed successfully: ${result.orderId}`);
        return { orderId: result.orderId };
      }
      
      return undefined;

    } catch (error) {
      console.error("Failed to place order:", error);
      return undefined;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<{
    status: "LIVE" | "MATCHED" | "CANCELLED";
    filledAmount?: number;
  } | undefined> {
    if (!this.authCredentials) {
      console.warn("Authentication required for order status");
      return undefined;
    }

    try {
      const response = await fetch(`${this.baseUrl}/order/${orderId}`, {
        headers: {
          "POLY-API-KEY": this.authCredentials.apiKey,
        },
      });

      if (!response.ok) {
        return undefined;
      }

      const result = await response.json() as {
        status: "LIVE" | "MATCHED" | "CANCELLED";
        original_size: string;
        size_matched: string;
      };

      return {
        status: result.status,
        filledAmount: parseFloat(result.size_matched),
      };
    } catch (error) {
      console.error(`Failed to get order status for ${orderId}:`, error);
      return undefined;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.wallet || !this.authCredentials) {
      console.warn("Wallet and authentication required for order cancellation");
      return false;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const response = await fetch(`${this.baseUrl}/order`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "POLY-API-KEY": this.authCredentials.apiKey,
          "POLY-TIMESTAMP": timestamp.toString(),
          "POLY-PASSPHRASE": this.authCredentials.apiPassphrase,
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        throw new Error(`Order cancellation failed: ${response.statusText}`);
      }

      console.log(`✅ Order cancelled: ${orderId}`);
      return true;

    } catch (error) {
      console.error("Failed to cancel order:", error);
      return false;
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
