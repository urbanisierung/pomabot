/**
 * Tests for Reddit RSS Connector
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RedditRSSFetcher } from "./reddit-rss";

describe("RedditRSSFetcher", () => {
  let fetcher: RedditRSSFetcher;

  beforeEach(() => {
    fetcher = new RedditRSSFetcher({
      userAgent: "pomabot-test/1.0",
      pollInterval: 0, // Disable rate limiting for tests
    });
  });

  describe("Configuration", () => {
    it("should initialize with default config", () => {
      const defaultFetcher = new RedditRSSFetcher();
      expect(defaultFetcher).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customFetcher = new RedditRSSFetcher({
        userAgent: "custom-agent/2.0",
        pollInterval: 60000,
      });
      expect(customFetcher).toBeDefined();
    });
  });

  describe("Sentiment Analysis", () => {
    it("should calculate positive sentiment correctly", () => {
      const items = [
        {
          id: "1",
          title: "Bitcoin gains momentum with positive breakthrough",
          content: "Approved by regulators, success in adoption",
          link: "https://reddit.com/1",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeGreaterThan(0);
    });

    it("should calculate negative sentiment correctly", () => {
      const items = [
        {
          id: "1",
          title: "Bitcoin crash leads to major losses and failures",
          content: "Rejected by regulators, negative outlook bearish",
          link: "https://reddit.com/1",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeLessThan(0);
    });

    it("should calculate neutral sentiment for mixed posts", () => {
      const items = [
        {
          id: "1",
          title: "Bitcoin price remains stable",
          content: "No major changes observed",
          link: "https://reddit.com/1",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(Math.abs(signal?.sentiment || 0)).toBeLessThan(0.3);
    });
  });

  describe("Signal Generation", () => {
    it("should generate signal from RSS items", () => {
      const items = [
        {
          id: "1",
          title: "Bitcoin reaches new highs",
          content: "Positive market sentiment",
          link: "https://reddit.com/1",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
        {
          id: "2",
          title: "Ethereum follows Bitcoin trend",
          content: "Market analysis",
          link: "https://reddit.com/2",
          pubDate: new Date(),
          author: "test",
          subreddit: "ethereum",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin", "ethereum"]);

      expect(signal).toBeDefined();
      expect(signal?.keyword).toBe("bitcoin");
      expect(signal?.volume).toBe(2);
      expect(signal?.topPosts).toHaveLength(2);
    });

    it("should return undefined for empty items", () => {
      const signal = fetcher.generateSignal([], ["bitcoin"]);
      expect(signal).toBeUndefined();
    });

    it("should include top posts in signal", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        title: `Post ${i} about Bitcoin`,
        content: "Content",
        link: `https://reddit.com/${i}`,
        pubDate: new Date(),
        author: "test",
        subreddit: "CryptoCurrency",
      }));

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      expect(signal?.topPosts).toHaveLength(5); // Should limit to 5
    });
  });

  describe("Belief Engine Conversion", () => {
    it("should convert to quantitative signal for high credibility", () => {
      const rssSignal = {
        subreddit: "news", // High credibility (0.9)
        keyword: "election",
        sentiment: 0.5,
        volume: 15,
        topPosts: [{ title: "Test", link: "https://reddit.com" }],
      };

      const signal = fetcher.convertToBeliefSignal(rssSignal, "politics");

      expect(signal.type).toBe("quantitative");
      expect(signal.direction).toBe("up"); // Positive sentiment
      expect(signal.strength).toBeGreaterThan(0);
      expect(signal.source).toContain("reddit-rss");
    });

    it("should convert to interpretive signal for medium credibility", () => {
      const rssSignal = {
        subreddit: "investing", // Medium credibility (0.75)
        keyword: "stocks",
        sentiment: 0.3,
        volume: 8,
        topPosts: [{ title: "Test", link: "https://reddit.com" }],
      };

      const signal = fetcher.convertToBeliefSignal(rssSignal, "economics");

      expect(signal.type).toBe("interpretive");
      expect(signal.direction).toBe("up");
    });

    it("should convert to speculative signal for low credibility", () => {
      const rssSignal = {
        subreddit: "wallstreetbets", // Low credibility (0.5)
        keyword: "stock",
        sentiment: 0.1,
        volume: 3,
        topPosts: [{ title: "Test", link: "https://reddit.com" }],
      };

      const signal = fetcher.convertToBeliefSignal(rssSignal, "economics");

      expect(signal.type).toBe("speculative");
    });

    it("should set neutral direction for low sentiment", () => {
      const rssSignal = {
        subreddit: "technology",
        keyword: "ai",
        sentiment: 0.1, // Below 0.2 threshold
        volume: 5,
        topPosts: [{ title: "Test", link: "https://reddit.com" }],
      };

      const signal = fetcher.convertToBeliefSignal(rssSignal, "technology");

      expect(signal.direction).toBe("neutral");
    });

    it("should set down direction for negative sentiment", () => {
      const rssSignal = {
        subreddit: "technology",
        keyword: "ai",
        sentiment: -0.5,
        volume: 5,
        topPosts: [{ title: "Test", link: "https://reddit.com" }],
      };

      const signal = fetcher.convertToBeliefSignal(rssSignal, "technology");

      expect(signal.direction).toBe("down");
    });
  });

  describe("Credibility Scoring", () => {
    it("should return correct credibility for known subreddits", () => {
      expect(fetcher.getCredibilityScore("news")).toBe(0.9);
      expect(fetcher.getCredibilityScore("wallstreetbets")).toBe(0.5);
      expect(fetcher.getCredibilityScore("technology")).toBe(0.8);
    });

    it("should return default credibility for unknown subreddits", () => {
      expect(fetcher.getCredibilityScore("unknown_subreddit")).toBe(0.7);
    });
  });

  describe("Keyword Filtering", () => {
    it("should only analyze posts matching keywords", () => {
      const items = [
        {
          id: "1",
          title: "Bitcoin news",
          content: "Crypto market update",
          link: "https://reddit.com/1",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
        {
          id: "2",
          title: "Unrelated topic",
          content: "Different subject",
          link: "https://reddit.com/2",
          pubDate: new Date(),
          author: "test",
          subreddit: "CryptoCurrency",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      
      // Sentiment should only be based on bitcoin-related post
      expect(signal).toBeDefined();
      expect(signal?.volume).toBe(2); // Both posts included in volume
    });
  });

  describe("Recency Weighting", () => {
    it("should weight recent posts more heavily", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const items = [
        {
          id: "1",
          title: "Bitcoin positive breakthrough success",
          content: "Recent news",
          link: "https://reddit.com/1",
          pubDate: now,
          author: "test",
          subreddit: "CryptoCurrency",
        },
        {
          id: "2",
          title: "Bitcoin negative crash failure",
          content: "Old news",
          link: "https://reddit.com/2",
          pubDate: yesterday,
          author: "test",
          subreddit: "CryptoCurrency",
        },
      ];

      const signal = fetcher.generateSignal(items, ["bitcoin"]);
      
      // Recent positive post should outweigh older negative post
      expect(signal?.sentiment).toBeGreaterThan(0);
    });
  });
});
