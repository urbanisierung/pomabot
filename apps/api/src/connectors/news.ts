/**
 * News & Signal Aggregator
 * 
 * Monitors various news sources and generates signals for the belief engine.
 * Supports multiple market categories with appropriate sources for each:
 * 
 * Politics: SEC filings, court rulings, polling data, official statements
 * Crypto: SEC crypto announcements, blockchain news, regulatory decisions
 * Sports: ESPN, USA Today Sports, official league announcements
 * Economics: BEA, Fed announcements, Bureau of Labor Statistics
 * Entertainment: Variety, Hollywood Reporter, award show coverage
 * Weather: National Weather Service, NOAA, meteorological services
 * Technology: Tech company announcements, patent filings, regulatory news
 * World: Reuters international, UN announcements, diplomatic news
 */

import type { Signal, SignalType, MarketCategory } from "@pomabot/shared";
import Parser from "rss-parser";

export interface NewsItem {
  source: string;
  title: string;
  content: string;
  url: string;
  published_at: Date;
  relevance_score: number;
  category?: MarketCategory;
}

export class NewsAggregator {
  private parser: Parser;
  private lastFetchTime: Map<string, number> = new Map();
  private minFetchInterval = 300000; // 5 minutes between fetches per source
  
  // RSS feeds organized by market category
  private readonly RSS_SOURCES: Record<MarketCategory, string[]> = {
    politics: [
      "https://www.sec.gov/news/pressreleases.rss",
    ],
    crypto: [
      "https://www.sec.gov/news/pressreleases.rss", // Crypto regulation
      "https://cointelegraph.com/rss",
      "https://www.coindesk.com/arc/outboundfeeds/rss/",
    ],
    sports: [
      "https://www.espn.com/espn/rss/news",
    ],
    economics: [
      "https://www.federalreserve.gov/feeds/press_all.xml",
      "https://www.reuters.com/rssFeed/businessNews",
    ],
    entertainment: [
      "https://variety.com/feed/",
      "https://www.hollywoodreporter.com/feed/",
      "https://deadline.com/feed/",
    ],
    weather: [
      "https://www.noaa.gov/rss",
    ],
    technology: [
      "https://techcrunch.com/feed/",
      "https://www.theverge.com/rss/index.xml",
    ],
    world: [
      "https://www.reuters.com/rssFeed/worldNews",
      "https://www.un.org/en/rss.xml",
    ],
    other: [],
  };

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ['description', 'summary'],
          ['content:encoded', 'content']
        ]
      }
    });
  }

  /**
   * Fetch news from multiple sources, optionally filtered by category
   */
  async fetchNews(category?: MarketCategory): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    try {
      // Determine which categories to fetch
      const categoriesToFetch: MarketCategory[] = category 
        ? [category]
        : ["politics", "crypto", "sports", "economics", "entertainment", "technology", "world", "weather"];

      // Fetch from RSS feeds for each category
      for (const cat of categoriesToFetch) {
        const feeds = this.RSS_SOURCES[cat] || [];
        for (const feedUrl of feeds) {
          try {
            const items = await this.fetchRSSFeed(feedUrl, cat);
            allNews.push(...items);
          } catch (error) {
            console.error(`Failed to fetch ${feedUrl}:`, error instanceof Error ? error.message : error);
          }
        }
      }

      // In simulation mode, also add mock data for testing
      if (process.env.SIMULATION_DATA === "true") {
        allNews.push(...this.getSimulationData(category));
      }

    } catch (error) {
      console.error("Failed to fetch news:", error);
    }

    // Remove duplicates and sort by date
    const uniqueNews = this.deduplicateNews(allNews);
    return uniqueNews.sort((a, b) => 
      b.published_at.getTime() - a.published_at.getTime()
    );
  }

  /**
   * Fetch and parse an RSS feed
   */
  private async fetchRSSFeed(url: string, category: MarketCategory): Promise<NewsItem[]> {
    // Rate limiting - don't fetch same source too frequently
    const lastFetch = this.lastFetchTime.get(url) || 0;
    const now = Date.now();
    if (now - lastFetch < this.minFetchInterval) {
      console.log(`Skipping ${url} - fetched recently`);
      return [];
    }

    console.log(`Fetching RSS feed: ${url}`);
    const feed = await this.parser.parseURL(url);
    this.lastFetchTime.set(url, now);

    const items: NewsItem[] = [];
    const maxItems = 10; // Limit items per feed

    for (const item of feed.items.slice(0, maxItems)) {
      if (!item.title) continue;

      const content = item.content || item.summary || item.contentSnippet || "";
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      items.push({
        source: new URL(url).hostname,
        title: item.title,
        content: content,
        url: item.link || url,
        published_at: pubDate,
        relevance_score: 0.7, // Default, will be adjusted by keyword matching
        category,
      });
    }

    return items;
  }

  /**
   * Deduplicate news items by title similarity
   */
  private deduplicateNews(items: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    const unique: NewsItem[] = [];

    for (const item of items) {
      // Create a normalized key from title
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Get simulation data for testing
   */
  private getSimulationData(category?: MarketCategory): NewsItem[] {
    const simData: NewsItem[] = [];

    if (!category || category === "crypto") {
      simData.push({
        source: "sec.gov",
        title: "SEC Approves New Bitcoin ETF Applications",
        content: "The Securities and Exchange Commission has approved multiple spot Bitcoin ETF applications, marking a historic moment for cryptocurrency regulation.",
        url: "https://sec.gov/news/press-release/2024-btc-etf",
        published_at: new Date(),
        relevance_score: 0.95,
        category: "crypto",
      });
    }

    if (!category || category === "politics") {
      simData.push({
        source: "sec.gov",
        title: "SEC Issues Guidance on Election Market Regulations",
        content: "New regulatory guidance clarifies rules for prediction markets during election season.",
        url: "https://sec.gov/news/press-release/2024-election",
        published_at: new Date(),
        relevance_score: 0.8,
        category: "politics",
      });
    }

    if (!category || category === "sports") {
      simData.push({
        source: "espn.com",
        title: "NBA Finals: Lakers Lead Series 3-1",
        content: "The Los Angeles Lakers have taken a commanding 3-1 series lead in the NBA Finals after a dominant performance.",
        url: "https://espn.com/nba/story/finals-2024",
        published_at: new Date(),
        relevance_score: 0.9,
        category: "sports",
      });
    }

    return simData;
  }

  /**
   * Generate signals from news items
   */
  async generateSignals(news: NewsItem[], marketKeywords: string[]): Promise<Signal[]> {
    const signals: Signal[] = [];

    for (const item of news) {
      // Update relevance score based on keyword matching
      const relevanceScore = this.calculateRelevanceScore(item, marketKeywords);
      if (relevanceScore < 0.3) {
        continue; // Skip irrelevant news
      }

      const signal = this.analyzeNewsItem({ ...item, relevance_score: relevanceScore }, marketKeywords);
      if (signal) {
        signals.push(signal);
      }
    }

    return signals;
  }

  /**
   * Calculate relevance score based on keyword matching
   */
  private calculateRelevanceScore(item: NewsItem, keywords: string[]): number {
    const lowerContent = `${item.title} ${item.content}`.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerContent.includes(lowerKeyword)) {
        // Title matches are more important
        if (item.title.toLowerCase().includes(lowerKeyword)) {
          score += 0.3;
        } else {
          score += 0.15;
        }
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Analyze news item and generate signal if relevant
   */
  private analyzeNewsItem(item: NewsItem, keywords: string[]): Signal | undefined {
    const lowerContent = `${item.title} ${item.content}`.toLowerCase();
    
    // Check if news is relevant to market
    const isRelevant = keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
    
    if (!isRelevant) {
      return undefined;
    }

    // Classify signal type based on source and content
    const signalType = this.classifySignalType(item);
    const direction = this.determineDirection(item);
    const strength = this.calculateStrength(item);

    return {
      type: signalType,
      direction,
      strength,
      conflicts_with_existing: false,
      timestamp: item.published_at,
      source: item.source,
      description: item.title,
    };
  }

  /**
   * Classify signal type based on news source and content
   */
  private classifySignalType(item: NewsItem): SignalType {
    const lowerContent = `${item.title} ${item.content}`.toLowerCase();
    
    // Authoritative: Official announcements, rulings
    if (
      item.source.includes("sec.gov") ||
      lowerContent.includes("court ruling") ||
      lowerContent.includes("official announcement") ||
      lowerContent.includes("regulatory decision")
    ) {
      return "authoritative";
    }

    // Procedural: Process updates, timelines
    if (
      lowerContent.includes("hearing scheduled") ||
      lowerContent.includes("filing submitted") ||
      lowerContent.includes("deadline") ||
      lowerContent.includes("review process")
    ) {
      return "procedural";
    }

    // Quantitative: Polls, data, statistics
    if (
      lowerContent.includes("poll") ||
      lowerContent.includes("survey") ||
      lowerContent.includes("%") ||
      lowerContent.includes("data shows")
    ) {
      return "quantitative";
    }

    // Interpretive: Analysis, expert opinion
    if (
      lowerContent.includes("analysts say") ||
      lowerContent.includes("experts believe") ||
      lowerContent.includes("likely") ||
      lowerContent.includes("expected")
    ) {
      return "interpretive";
    }

    // Default to speculative
    return "speculative";
  }

  /**
   * Determine signal direction from news sentiment
   */
  private determineDirection(item: NewsItem): "up" | "down" | "neutral" {
    const lowerContent = `${item.title} ${item.content}`.toLowerCase();
    
    // Positive indicators
    const positiveWords = [
      "approved", "passed", "won", "victory", "gains",
      "increase", "positive", "success", "favorable"
    ];
    
    // Negative indicators
    const negativeWords = [
      "denied", "rejected", "lost", "defeat", "decline",
      "decrease", "negative", "failure", "unfavorable"
    ];
    
    const positiveCount = positiveWords.filter(w => 
      lowerContent.includes(w)
    ).length;
    
    const negativeCount = negativeWords.filter(w => 
      lowerContent.includes(w)
    ).length;
    
    if (positiveCount > negativeCount) return "up";
    if (negativeCount > positiveCount) return "down";
    return "neutral";
  }

  /**
   * Calculate signal strength (1-5) based on relevance and importance
   */
  private calculateStrength(item: NewsItem): 1 | 2 | 3 | 4 | 5 {
    let strength = 3; // Default medium strength
    
    // Increase strength for official sources
    if (item.source.includes("gov") || item.source.includes("court")) {
      strength += 1;
    }
    
    // Increase for high relevance
    if (item.relevance_score > 0.8) {
      strength += 1;
    }
    
    // Cap at 5
    return Math.min(5, Math.max(1, strength)) as 1 | 2 | 3 | 4 | 5;
  }
}

/**
 * Polling Data Aggregator
 * Fetches and analyzes polling data for political markets
 */
export class PollingAggregator {
  // Polling sources for future implementation
  // private readonly POLLING_SOURCES = [
  //   "https://projects.fivethirtyeight.com/polls/",
  //   "https://www.realclearpolitics.com/",
  // ];

  /**
   * Fetch latest polling data
   */
  async fetchPolls(): Promise<Array<{
    question: string;
    date: Date;
    sample_size: number;
    results: Record<string, number>;
  }>> {
    // Mock implementation - would fetch from actual polling aggregators
    console.log("Fetching polling data...");
    return [];
  }

  /**
   * Generate quantitative signals from polling data
   */
  async generatePollSignals(polls: Array<{
    question: string;
    date: Date;
    results: Record<string, number>;
  }>): Promise<Signal[]> {
    const signals: Signal[] = [];

    for (const poll of polls) {
      // Analyze polling trends
      const signal = this.analyzePoll(poll);
      if (signal) {
        signals.push(signal);
      }
    }

    return signals;
  }

  private analyzePoll(_poll: {
    question: string;
    date: Date;
    results: Record<string, number>;
  }): Signal | undefined {
    // Implementation would analyze poll results
    // and generate quantitative signals
    return undefined;
  }
}
