/**
 * Hacker News Connector
 * 
 * Integrates with Hacker News via the official Algolia API.
 * Excellent for technology, crypto, and startup-related markets.
 * 
 * API Documentation: https://hn.algolia.com/api
 * Rate Limit: No explicit limit, but be respectful
 * 
 * Advantages:
 * - No authentication required
 * - Rich data: stories, comments, votes
 * - Real-time updates
 * - High signal quality for tech/crypto markets
 * 
 * Limitations:
 * - Focused on technology and startup topics
 * - Less relevant for politics, sports, entertainment
 */

import type { Signal, SignalType, MarketCategory } from "@pomabot/shared";
import fetch from "node-fetch";

export interface HackerNewsConfig {
  apiUrl: string;
  searchTimeWindow: number; // Hours to look back
  minPoints: number; // Minimum story score
  userAgent: string;
}

export interface HNStory {
  objectID: string;
  title: string;
  url: string;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  created_at_i: number;
  _tags: string[];
}

export interface HNComment {
  objectID: string;
  author: string;
  comment_text: string;
  points: number;
  created_at: string;
  parent_id: number;
  story_id: number;
}

export interface HNSignal {
  keyword: string;
  sentiment: number; // -1 to 1
  volume: number; // Stories found
  momentum: number; // Engagement rate
  topStories: Array<{
    title: string;
    points: number;
    url: string;
    num_comments: number;
  }>;
}

/**
 * Market categories relevant for Hacker News
 * HN is most relevant for: technology, crypto, economics
 */
const RELEVANT_CATEGORIES: MarketCategory[] = [
  "technology",
  "crypto",
  "economics",
];

const DEFAULT_API_URL = "https://hn.algolia.com/api/v1";
const DEFAULT_TIME_WINDOW = 24; // 24 hours
const DEFAULT_MIN_POINTS = 10;

export class HackerNewsConnector {
  private config: HackerNewsConfig;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 500; // 500ms between requests

  constructor(config?: Partial<HackerNewsConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || DEFAULT_API_URL,
      searchTimeWindow: config?.searchTimeWindow || DEFAULT_TIME_WINDOW,
      minPoints: config?.minPoints || DEFAULT_MIN_POINTS,
      userAgent: config?.userAgent || "pomabot/1.0",
    };
  }

  /**
   * Rate limiting: Be respectful to HN API
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
  }

  /**
   * Check if category is relevant for Hacker News
   */
  isRelevantCategory(category: MarketCategory): boolean {
    return RELEVANT_CATEGORIES.includes(category);
  }

  /**
   * Search for stories matching keywords
   */
  async searchStories(keywords: string[], category: MarketCategory): Promise<HNStory[]> {
    if (!this.isRelevantCategory(category)) {
      console.log(`⏭️  Hacker News: Category ${category} not relevant, skipping`);
      return [];
    }

    await this.rateLimit();

    try {
      // Build search query
      const query = keywords.join(" OR ");
      
      // Calculate timestamp for time window
      const timeWindowSeconds = this.config.searchTimeWindow * 3600;
      const timestampFilter = Math.floor(Date.now() / 1000) - timeWindowSeconds;

      // Build URL with search parameters
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `created_at_i>${timestampFilter},points>=${this.config.minPoints}`,
        hitsPerPage: "25",
      });

      const url = `${this.config.apiUrl}/search?${params.toString()}`;
      console.log(`📡 Searching Hacker News for: ${keywords.join(", ")}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": this.config.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`❌ Hacker News API error: ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as {
        hits: HNStory[];
        nbHits: number;
      };

      console.log(`✅ Found ${data.hits.length} HN stories`);
      return data.hits;
    } catch (error) {
      console.error("❌ Hacker News API request error:", error);
      return [];
    }
  }

  /**
   * Fetch comments for a story (optional, for deeper analysis)
   */
  async fetchComments(storyId: string): Promise<HNComment[]> {
    await this.rateLimit();

    try {
      const url = `${this.config.apiUrl}/items/${storyId}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.config.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`❌ Hacker News comments error: ${response.statusText}`);
        return [];
      }

      const data = (await response.json()) as {
        children: HNComment[];
      };

      return data.children || [];
    } catch (error) {
      console.error("❌ Hacker News comments fetch error:", error);
      return [];
    }
  }

  /**
   * Generate signal from HN stories
   */
  generateSignal(stories: HNStory[], keywords: string[]): HNSignal | undefined {
    if (stories.length === 0) {
      return undefined;
    }

    // Calculate sentiment from story titles
    const sentiment = this.calculateSentiment(stories, keywords);

    // Calculate momentum (engagement rate)
    const totalPoints = stories.reduce((sum, s) => sum + s.points, 0);
    const totalComments = stories.reduce((sum, s) => sum + s.num_comments, 0);
    const momentum = stories.length > 0 ? (totalPoints + totalComments) / stories.length : 0;

    // Get top stories
    const topStories = stories
      .sort((a, b) => b.points - a.points)
      .slice(0, 5)
      .map((story) => ({
        title: story.title,
        points: story.points,
        url: story.url,
        num_comments: story.num_comments,
      }));

    return {
      keyword: keywords[0] || "",
      sentiment,
      volume: stories.length,
      momentum,
      topStories,
    };
  }

  /**
   * Calculate sentiment from stories (-1 to 1)
   */
  private calculateSentiment(stories: HNStory[], keywords: string[]): number {
    if (stories.length === 0) {
      return 0;
    }

    const positiveWords = [
      "approved",
      "breakthrough",
      "success",
      "launch",
      "release",
      "wins",
      "achieves",
      "surges",
      "bullish",
      "innovative",
      "revolutionary",
      "adoption",
    ];

    const negativeWords = [
      "crash",
      "failure",
      "vulnerability",
      "hack",
      "scam",
      "banned",
      "shutdown",
      "concern",
      "bearish",
      "decline",
      "problem",
      "issue",
    ];

    let totalSentiment = 0;
    let weightSum = 0;

    for (const story of stories) {
      const text = story.title.toLowerCase();
      
      // Check keyword relevance
      const isRelevant = keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      );
      
      if (!isRelevant) {
        continue;
      }

      // Weight by points and recency
      const now = Date.now() / 1000;
      const recencyWeight = Math.exp(-(now - story.created_at_i) / (24 * 3600));
      const weight = (1 + Math.log10(story.points + 1)) * recencyWeight;

      // Count positive and negative words
      const positiveCount = positiveWords.filter((w) => text.includes(w)).length;
      const negativeCount = negativeWords.filter((w) => text.includes(w)).length;

      // Calculate story sentiment
      let storySentiment = 0;
      if (positiveCount > negativeCount) {
        storySentiment = Math.min(1, positiveCount / 5);
      } else if (negativeCount > positiveCount) {
        storySentiment = -Math.min(1, negativeCount / 5);
      }

      totalSentiment += storySentiment * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? totalSentiment / weightSum : 0;
  }

  /**
   * Convert HN signal to belief engine Signal
   */
  convertToBeliefSignal(hnSignal: HNSignal, _category: MarketCategory): Signal {
    // HN is high credibility for tech topics
    let signalType: SignalType;
    if (hnSignal.volume >= 15 && hnSignal.momentum >= 50) {
      signalType = "quantitative"; // High volume + engagement
    } else if (hnSignal.volume >= 5 && hnSignal.momentum >= 20) {
      signalType = "interpretive"; // Medium volume
    } else {
      signalType = "speculative"; // Lower volume
    }

    // Determine direction from sentiment
    let direction: "up" | "down" | "neutral";
    if (hnSignal.sentiment > 0.2) {
      direction = "up";
    } else if (hnSignal.sentiment < -0.2) {
      direction = "down";
    } else {
      direction = "neutral";
    }

    // Calculate strength (1-5) based on sentiment magnitude and momentum
    const sentimentMagnitude = Math.abs(hnSignal.sentiment);
    const momentumScore = Math.min(hnSignal.momentum / 100, 1); // Normalize
    const strengthScore = (sentimentMagnitude + momentumScore) / 2;
    const strength = Math.ceil(strengthScore * 5) as 1 | 2 | 3 | 4 | 5;

    return {
      type: signalType,
      direction,
      strength: Math.max(1, Math.min(5, strength)) as 1 | 2 | 3 | 4 | 5,
      conflicts_with_existing: false,
      timestamp: new Date(),
      source: `hackernews`,
      description: `Hacker News: ${hnSignal.topStories[0]?.title || ""}`,
    };
  }
}
