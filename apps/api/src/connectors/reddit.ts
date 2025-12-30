/**
 * Reddit Data Connector
 * 
 * Monitors relevant subreddits for market sentiment and generates signals.
 * Uses Reddit API with OAuth2 authentication.
 * 
 * API Documentation: https://www.reddit.com/dev/api/
 * Rate Limit: 60 requests per minute for authenticated clients
 */

import type { Signal, SignalType, MarketCategory } from "@pomabot/shared";
import fetch from "node-fetch";

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  username?: string;
  password?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  subreddit: string;
  author: string;
}

export interface RedditSignal {
  subreddit: string;
  keyword: string;
  sentiment: number; // -1 to 1
  volume: number; // Posts in last 24h
  momentum: number; // Volume change rate
  topPosts: Array<{
    title: string;
    score: number;
    url: string;
  }>;
}

/**
 * Subreddit configuration by market category
 */
const SUBREDDIT_MAP: Record<MarketCategory, string[]> = {
  politics: ["politics", "PoliticalDiscussion", "Conservative", "neoliberal"],
  crypto: ["CryptoCurrency", "Bitcoin", "ethereum", "CryptoMarkets"],
  sports: ["sportsbook", "nba", "nfl", "soccer"],
  economics: ["wallstreetbets", "investing", "stocks", "economy"],
  entertainment: ["movies", "television", "entertainment", "Oscars"],
  weather: ["weather", "TropicalWeather"],
  technology: ["technology", "programming", "technews"],
  world: ["news", "worldnews", "geopolitics"],
  other: ["all"],
};

/**
 * Subreddit credibility scoring (1.0 = most credible)
 */
const SUBREDDIT_CREDIBILITY: Record<string, number> = {
  // High credibility - moderated, fact-focused
  news: 0.9,
  worldnews: 0.9,
  PoliticalDiscussion: 0.85,
  geopolitics: 0.85,
  
  // Medium credibility - mix of data and opinion
  politics: 0.7,
  CryptoCurrency: 0.7,
  investing: 0.75,
  stocks: 0.75,
  technology: 0.8,
  
  // Lower credibility - speculation heavy
  wallstreetbets: 0.5,
  Conservative: 0.6,
  neoliberal: 0.6,
  Bitcoin: 0.6,
  ethereum: 0.6,
  
  // Sports/entertainment - event-focused
  sportsbook: 0.8,
  nba: 0.85,
  nfl: 0.85,
  movies: 0.75,
  Oscars: 0.8,
};

const DEFAULT_CREDIBILITY = 0.7;

export class RedditConnector {
  private config: RedditConfig;
  private accessToken?: string;
  private tokenExpiry?: number;
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (60/min)

  constructor(config: RedditConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Reddit API using OAuth2
   */
  async authenticate(): Promise<boolean> {
    try {
      const auth = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString("base64");

      const params = new URLSearchParams({
        grant_type: "client_credentials",
      });

      // If username/password provided, use password grant
      if (this.config.username && this.config.password) {
        params.set("grant_type", "password");
        params.set("username", this.config.username);
        params.set("password", this.config.password);
      }

      const response = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.config.userAgent,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error("Reddit authentication failed:", response.statusText);
        return false;
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;

      console.log("✅ Reddit authentication successful");
      return true;
    } catch (error) {
      console.error("Reddit authentication error:", error);
      return false;
    }
  }

  /**
   * Rate limiting: Ensure we don't exceed 60 requests per minute
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Make authenticated request to Reddit API
   */
  private async makeRequest<T>(endpoint: string): Promise<T | undefined> {
    // Check if token needs refresh
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }

    await this.rateLimit();

    try {
      const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "User-Agent": this.config.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`Reddit API error: ${response.statusText}`);
        return undefined;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("Reddit API request error:", error);
      return undefined;
    }
  }

  /**
   * Fetch hot posts from a subreddit
   */
  async fetchHotPosts(
    subreddit: string,
    limit = 25
  ): Promise<RedditPost[]> {
    const data = await this.makeRequest<{
      data: { children: Array<{ data: RedditPost }> };
    }>(`/r/${subreddit}/hot.json?limit=${limit}`);

    if (!data?.data?.children) {
      return [];
    }

    return data.data.children.map((child) => child.data);
  }

  /**
   * Fetch new posts from a subreddit
   */
  async fetchNewPosts(
    subreddit: string,
    limit = 25
  ): Promise<RedditPost[]> {
    const data = await this.makeRequest<{
      data: { children: Array<{ data: RedditPost }> };
    }>(`/r/${subreddit}/new.json?limit=${limit}`);

    if (!data?.data?.children) {
      return [];
    }

    return data.data.children.map((child) => child.data);
  }

  /**
   * Search posts within a subreddit
   */
  async searchPosts(
    subreddit: string,
    query: string,
    limit = 25
  ): Promise<RedditPost[]> {
    const encodedQuery = encodeURIComponent(query);
    const data = await this.makeRequest<{
      data: { children: Array<{ data: RedditPost }> };
    }>(`/r/${subreddit}/search.json?q=${encodedQuery}&limit=${limit}&restrict_sr=true`);

    if (!data?.data?.children) {
      return [];
    }

    return data.data.children.map((child) => child.data);
  }

  /**
   * Fetch posts from multiple subreddits for a market category
   */
  async fetchPostsForCategory(
    category: MarketCategory,
    limit = 10
  ): Promise<RedditPost[]> {
    const subreddits = SUBREDDIT_MAP[category] || [];
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
      const posts = await this.fetchHotPosts(subreddit, limit);
      allPosts.push(...posts);
    }

    // Sort by score descending
    return allPosts.sort((a, b) => b.score - a.score);
  }

  /**
   * Search for posts matching market keywords across relevant subreddits
   */
  async searchForMarket(
    category: MarketCategory,
    keywords: string[]
  ): Promise<RedditPost[]> {
    const subreddits = SUBREDDIT_MAP[category] || [];
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
      for (const keyword of keywords) {
        const posts = await this.searchPosts(subreddit, keyword, 10);
        allPosts.push(...posts);
      }
    }

    // Deduplicate by post ID
    const uniquePosts = Array.from(
      new Map(allPosts.map((post) => [post.id, post])).values()
    );

    // Sort by relevance (score * recency)
    return uniquePosts.sort((a, b) => {
      const now = Date.now() / 1000;
      const aScore = a.score * Math.exp(-(now - a.created_utc) / (24 * 3600));
      const bScore = b.score * Math.exp(-(now - b.created_utc) / (24 * 3600));
      return bScore - aScore;
    });
  }

  /**
   * Analyze posts and generate Reddit signal
   */
  generateSignal(
    posts: RedditPost[],
    keywords: string[]
  ): RedditSignal | undefined {
    if (posts.length === 0) {
      return undefined;
    }

    // Calculate volume (posts in last 24h)
    const now = Date.now() / 1000;
    const volume = posts.filter((p) => now - p.created_utc < 24 * 3600).length;

    // Calculate sentiment from post titles and content
    const sentiment = this.calculateSentiment(posts, keywords);

    // Get top posts
    const topPosts = posts
      .slice(0, 5)
      .map((post) => ({
        title: post.title,
        score: post.score,
        url: post.url,
      }));

    // Calculate momentum (simplified - would need historical data)
    const momentum = volume / Math.max(posts.length, 1);

    // Extract primary subreddit
    const subreddit = posts[0]?.subreddit || "unknown";

    // Extract primary keyword
    const keyword = keywords[0] || "";

    return {
      subreddit,
      keyword,
      sentiment,
      volume,
      momentum,
      topPosts,
    };
  }

  /**
   * Calculate sentiment from posts (-1 to 1)
   */
  private calculateSentiment(posts: RedditPost[], keywords: string[]): number {
    if (posts.length === 0) {
      return 0;
    }

    const positiveWords = [
      "approved",
      "passed",
      "won",
      "victory",
      "gains",
      "increase",
      "positive",
      "success",
      "favorable",
      "bullish",
      "surge",
      "breakthrough",
    ];

    const negativeWords = [
      "denied",
      "rejected",
      "lost",
      "defeat",
      "decline",
      "decrease",
      "negative",
      "failure",
      "unfavorable",
      "bearish",
      "crash",
      "concern",
    ];

    let totalSentiment = 0;
    let weightSum = 0;

    for (const post of posts) {
      const text = `${post.title} ${post.selftext}`.toLowerCase();
      
      // Check keyword relevance
      const isRelevant = keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      );
      
      if (!isRelevant) {
        continue;
      }

      // Weight by score and recency
      const now = Date.now() / 1000;
      const recencyWeight = Math.exp(-(now - post.created_utc) / (24 * 3600));
      const weight = (1 + Math.log10(post.score + 1)) * recencyWeight;

      // Count positive and negative words
      const positiveCount = positiveWords.filter((w) => text.includes(w)).length;
      const negativeCount = negativeWords.filter((w) => text.includes(w)).length;

      // Calculate post sentiment
      let postSentiment = 0;
      if (positiveCount > negativeCount) {
        postSentiment = Math.min(1, positiveCount / 5);
      } else if (negativeCount > positiveCount) {
        postSentiment = -Math.min(1, negativeCount / 5);
      }

      totalSentiment += postSentiment * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? totalSentiment / weightSum : 0;
  }

  /**
   * Convert Reddit signal to belief engine Signal
   */
  convertToBeliefSignal(
    redditSignal: RedditSignal,
    _category: MarketCategory
  ): Signal {
    // Determine signal type based on subreddit credibility and volume
    const credibility = SUBREDDIT_CREDIBILITY[redditSignal.subreddit] ?? DEFAULT_CREDIBILITY;
    
    let signalType: SignalType;
    if (credibility >= 0.85 && redditSignal.volume >= 20) {
      signalType = "quantitative"; // High credibility + high volume
    } else if (credibility >= 0.75 && redditSignal.volume >= 10) {
      signalType = "interpretive"; // Medium credibility
    } else {
      signalType = "speculative"; // Lower credibility or volume
    }

    // Determine direction from sentiment
    let direction: "up" | "down" | "neutral";
    if (redditSignal.sentiment > 0.2) {
      direction = "up";
    } else if (redditSignal.sentiment < -0.2) {
      direction = "down";
    } else {
      direction = "neutral";
    }

    // Calculate strength (1-5) based on sentiment magnitude and volume
    const sentimentMagnitude = Math.abs(redditSignal.sentiment);
    const volumeScore = Math.min(redditSignal.volume / 50, 1); // Normalize to 0-1
    const strengthScore = (sentimentMagnitude + volumeScore) / 2;
    const strength = Math.ceil(strengthScore * 5) as 1 | 2 | 3 | 4 | 5;

    return {
      type: signalType,
      direction,
      strength: Math.max(1, Math.min(5, strength)) as 1 | 2 | 3 | 4 | 5,
      conflicts_with_existing: false, // Will be determined by belief engine
      timestamp: new Date(),
      source: `reddit:${redditSignal.subreddit}`,
      description: `Reddit sentiment from r/${redditSignal.subreddit}: ${redditSignal.topPosts[0]?.title || ""}`,
    };
  }

  /**
   * Get subreddit credibility score
   */
  getCredibilityScore(subreddit: string): number {
    return SUBREDDIT_CREDIBILITY[subreddit] ?? DEFAULT_CREDIBILITY;
  }
}
