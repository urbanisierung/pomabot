/**
 * Reddit RSS Connector
 * 
 * Alternative Reddit data source using public RSS feeds.
 * No authentication required - uses publicly available RSS feeds.
 * 
 * RSS Documentation: https://www.reddit.com/.rss
 * Rate Limit: Respectful polling (minimum 5 minutes between requests)
 * 
 * Advantages:
 * - No API credentials required
 * - Respects Reddit's terms of service
 * - Simple to implement and maintain
 * 
 * Limitations:
 * - Limited to 25 most recent posts per feed
 * - No comment data access
 * - Limited to hot/new/top sorting options
 */

import type { Signal, SignalType, MarketCategory } from "@pomabot/shared";
import Parser from "rss-parser";

export interface RedditRSSConfig {
  userAgent: string;
  pollInterval: number; // Minimum milliseconds between requests (default: 5 minutes)
}

export interface RSSItem {
  id: string;
  title: string;
  content: string;
  link: string;
  pubDate: Date;
  author: string;
  subreddit: string;
}

export interface RedditRSSSignal {
  subreddit: string;
  keyword: string;
  sentiment: number; // -1 to 1
  volume: number; // Posts in feed
  topPosts: Array<{
    title: string;
    link: string;
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
const DEFAULT_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class RedditRSSFetcher {
  private config: RedditRSSConfig;
  private parser: Parser;
  private lastFetchTime: Map<string, number> = new Map();

  constructor(config?: Partial<RedditRSSConfig>) {
    this.config = {
      userAgent: config?.userAgent || "pomabot/1.0",
      pollInterval: config?.pollInterval || DEFAULT_POLL_INTERVAL,
    };
    
    this.parser = new Parser({
      headers: {
        "User-Agent": this.config.userAgent,
      },
      timeout: 10000,
    });
  }

  /**
   * Fetch RSS feed from a subreddit
   */
  async fetchSubreddit(subreddit: string): Promise<RSSItem[]> {
    // Rate limiting check
    const lastFetch = this.lastFetchTime.get(subreddit) || 0;
    const now = Date.now();
    
    if (now - lastFetch < this.config.pollInterval) {
      console.log(`⏱️  Rate limit: Skipping r/${subreddit} (last fetch ${Math.round((now - lastFetch) / 1000)}s ago)`);
      return [];
    }

    try {
      const url = `https://www.reddit.com/r/${subreddit}/.rss`;
      console.log(`📡 Fetching RSS feed: r/${subreddit}`);
      
      const feed = await this.parser.parseURL(url);
      this.lastFetchTime.set(subreddit, now);

      const items: RSSItem[] = feed.items.map((item) => ({
        id: item.id || item.guid || "",
        title: item.title || "",
        content: item.content || item.contentSnippet || "",
        link: item.link || "",
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
        author: item.creator || item.author || "unknown",
        subreddit,
      }));

      console.log(`✅ Fetched ${items.length} posts from r/${subreddit}`);
      return items;
    } catch (error) {
      console.error(`❌ Error fetching r/${subreddit}:`, error);
      return [];
    }
  }

  /**
   * Fetch posts from multiple subreddits for a market category
   */
  async fetchPostsForCategory(category: MarketCategory): Promise<RSSItem[]> {
    const subreddits = SUBREDDIT_MAP[category] || [];
    const allPosts: RSSItem[] = [];

    for (const subreddit of subreddits) {
      const posts = await this.fetchSubreddit(subreddit);
      allPosts.push(...posts);
    }

    // Sort by publication date descending
    return allPosts.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  }

  /**
   * Search for posts matching keywords across relevant subreddits
   */
  async searchForMarket(
    category: MarketCategory,
    keywords: string[]
  ): Promise<RSSItem[]> {
    const allPosts = await this.fetchPostsForCategory(category);
    
    // Filter posts that match any keyword
    const matchingPosts = allPosts.filter((post) => {
      const text = `${post.title} ${post.content}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });

    return matchingPosts;
  }

  /**
   * Generate signal from RSS items
   */
  generateSignal(
    items: RSSItem[],
    keywords: string[]
  ): RedditRSSSignal | undefined {
    if (items.length === 0) {
      return undefined;
    }

    // Calculate sentiment from post titles and content
    const sentiment = this.calculateSentiment(items, keywords);

    // Get top posts
    const topPosts = items
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        link: item.link,
      }));

    // Extract primary subreddit
    const subreddit = items[0]?.subreddit || "unknown";

    // Extract primary keyword
    const keyword = keywords[0] || "";

    return {
      subreddit,
      keyword,
      sentiment,
      volume: items.length,
      topPosts,
    };
  }

  /**
   * Calculate sentiment from posts (-1 to 1)
   */
  private calculateSentiment(items: RSSItem[], keywords: string[]): number {
    if (items.length === 0) {
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

    for (const item of items) {
      const text = `${item.title} ${item.content}`.toLowerCase();
      
      // Check keyword relevance
      const isRelevant = keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      );
      
      if (!isRelevant) {
        continue;
      }

      // Weight by recency (RSS feeds are already recent)
      const now = Date.now();
      const age = now - item.pubDate.getTime();
      const recencyWeight = Math.exp(-age / (24 * 3600 * 1000)); // 24 hour decay
      const weight = recencyWeight;

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
   * Convert Reddit RSS signal to belief engine Signal
   */
  convertToBeliefSignal(
    rssSignal: RedditRSSSignal,
    _category: MarketCategory
  ): Signal {
    // Determine signal type based on subreddit credibility and volume
    const credibility = SUBREDDIT_CREDIBILITY[rssSignal.subreddit] ?? DEFAULT_CREDIBILITY;
    
    let signalType: SignalType;
    if (credibility >= 0.85 && rssSignal.volume >= 10) {
      signalType = "quantitative"; // High credibility + reasonable volume
    } else if (credibility >= 0.75 && rssSignal.volume >= 5) {
      signalType = "interpretive"; // Medium credibility
    } else {
      signalType = "speculative"; // Lower credibility or volume
    }

    // Determine direction from sentiment
    let direction: "up" | "down" | "neutral";
    if (rssSignal.sentiment > 0.2) {
      direction = "up";
    } else if (rssSignal.sentiment < -0.2) {
      direction = "down";
    } else {
      direction = "neutral";
    }

    // Calculate strength (1-5) based on sentiment magnitude and volume
    const sentimentMagnitude = Math.abs(rssSignal.sentiment);
    const volumeScore = Math.min(rssSignal.volume / 25, 1); // Normalize to 0-1 (RSS max is 25)
    const strengthScore = (sentimentMagnitude + volumeScore) / 2;
    const strength = Math.ceil(strengthScore * 5) as 1 | 2 | 3 | 4 | 5;

    return {
      type: signalType,
      direction,
      strength: Math.max(1, Math.min(5, strength)) as 1 | 2 | 3 | 4 | 5,
      conflicts_with_existing: false,
      timestamp: new Date(),
      source: `reddit-rss:${rssSignal.subreddit}`,
      description: `Reddit RSS from r/${rssSignal.subreddit}: ${rssSignal.topPosts[0]?.title || ""}`,
    };
  }

  /**
   * Get subreddit credibility score
   */
  getCredibilityScore(subreddit: string): number {
    return SUBREDDIT_CREDIBILITY[subreddit] ?? DEFAULT_CREDIBILITY;
  }
}
