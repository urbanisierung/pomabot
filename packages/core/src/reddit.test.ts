/**
 * Test Suite: Reddit Connector
 * 
 * Tests Reddit API integration, sentiment analysis, and signal generation
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { RedditConnector } from "../../../apps/api/src/connectors/reddit";
import type { RedditPost } from "../../../apps/api/src/connectors/reddit";

describe("Reddit Connector", () => {
  let connector: RedditConnector;

  beforeEach(() => {
    connector = new RedditConnector({
      clientId: "test_client_id",
      clientSecret: "test_secret",
      userAgent: "pomabot-test/1.0",
    });
  });

  describe("generateSignal", () => {
    test("should return undefined for empty posts", () => {
      const signal = connector.generateSignal([], ["bitcoin"]);
      expect(signal).toBeUndefined();
    });

    test("should generate signal from posts", () => {
      const posts: RedditPost[] = [
        {
          id: "1",
          title: "Bitcoin approved for ETF trading",
          selftext: "Major breakthrough for crypto",
          score: 500,
          num_comments: 100,
          created_utc: Date.now() / 1000 - 3600, // 1 hour ago
          url: "https://reddit.com/r/CryptoCurrency/1",
          subreddit: "CryptoCurrency",
          author: "test_user",
        },
        {
          id: "2",
          title: "Bitcoin price surge continues",
          selftext: "Positive momentum in the market",
          score: 300,
          num_comments: 50,
          created_utc: Date.now() / 1000 - 7200, // 2 hours ago
          url: "https://reddit.com/r/CryptoCurrency/2",
          subreddit: "CryptoCurrency",
          author: "test_user2",
        },
      ];

      const signal = connector.generateSignal(posts, ["bitcoin"]);

      expect(signal).toBeDefined();
      expect(signal?.subreddit).toBe("CryptoCurrency");
      expect(signal?.keyword).toBe("bitcoin");
      expect(signal?.sentiment).toBeGreaterThan(0); // Positive sentiment
      expect(signal?.volume).toBeGreaterThan(0);
      expect(signal?.topPosts).toHaveLength(2);
    });

    test("should detect positive sentiment", () => {
      const posts: RedditPost[] = [
        {
          id: "1",
          title: "Great success with approved policy",
          selftext: "Positive gains and victory",
          score: 100,
          num_comments: 20,
          created_utc: Date.now() / 1000 - 1800,
          url: "https://reddit.com/r/politics/1",
          subreddit: "politics",
          author: "user1",
        },
      ];

      const signal = connector.generateSignal(posts, ["policy"]);

      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeGreaterThan(0);
    });

    test("should detect negative sentiment", () => {
      const posts: RedditPost[] = [
        {
          id: "1",
          title: "Major failure and rejection",
          selftext: "Negative decline and defeat",
          score: 150,
          num_comments: 30,
          created_utc: Date.now() / 1000 - 1800,
          url: "https://reddit.com/r/politics/1",
          subreddit: "politics",
          author: "user1",
        },
      ];

      const signal = connector.generateSignal(posts, ["failure"]);

      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeLessThan(0);
    });

    test("should weight by score and recency", () => {
      const recentHighScore: RedditPost = {
        id: "1",
        title: "Approved policy gains success",
        selftext: "Positive outcome",
        score: 1000,
        num_comments: 200,
        created_utc: Date.now() / 1000 - 1800, // 30 min ago
        url: "https://reddit.com/r/politics/1",
        subreddit: "politics",
        author: "user1",
      };

      const oldLowScore: RedditPost = {
        id: "2",
        title: "Minor policy update",
        selftext: "Some changes",
        score: 10,
        num_comments: 5,
        created_utc: Date.now() / 1000 - 86400, // 24 hours ago
        url: "https://reddit.com/r/politics/2",
        subreddit: "politics",
        author: "user2",
      };

      const signal1 = connector.generateSignal([recentHighScore], ["policy"]);
      const signal2 = connector.generateSignal([oldLowScore], ["policy"]);

      expect(signal1?.sentiment).not.toBe(0);
      // Recent high-score post should have stronger signal
      expect(Math.abs(signal1?.sentiment || 0)).toBeGreaterThan(
        Math.abs(signal2?.sentiment || 0)
      );
    });
  });

  describe("convertToBeliefSignal", () => {
    test("should convert high credibility signal to quantitative", () => {
      const redditSignal = {
        subreddit: "news", // High credibility
        keyword: "election",
        sentiment: 0.6,
        volume: 25,
        momentum: 0.8,
        topPosts: [
          {
            title: "Election results announced",
            score: 500,
            url: "https://reddit.com/r/news/1",
          },
        ],
      };

      const signal = connector.convertToBeliefSignal(redditSignal, "politics");

      expect(signal.type).toBe("quantitative");
      expect(signal.direction).toBe("up");
      expect(signal.strength).toBeGreaterThanOrEqual(1);
      expect(signal.strength).toBeLessThanOrEqual(5);
    });

    test("should convert medium credibility signal to interpretive", () => {
      const redditSignal = {
        subreddit: "investing", // Medium credibility (0.75)
        keyword: "stocks",
        sentiment: 0.5,
        volume: 15,
        momentum: 0.6,
        topPosts: [
          {
            title: "Stock market analysis",
            score: 200,
            url: "https://reddit.com/r/investing/1",
          },
        ],
      };

      const signal = connector.convertToBeliefSignal(redditSignal, "economics");

      expect(signal.type).toBe("interpretive");
      expect(signal.source).toBe("reddit:investing");
    });

    test("should convert low credibility signal to speculative", () => {
      const redditSignal = {
        subreddit: "wallstreetbets", // Low credibility
        keyword: "stock",
        sentiment: 0.3,
        volume: 5,
        momentum: 0.4,
        topPosts: [
          {
            title: "Stock prediction",
            score: 50,
            url: "https://reddit.com/r/wallstreetbets/1",
          },
        ],
      };

      const signal = connector.convertToBeliefSignal(redditSignal, "economics");

      expect(signal.type).toBe("speculative");
    });

    test("should determine direction from sentiment", () => {
      const positiveSignal = {
        subreddit: "politics",
        keyword: "election",
        sentiment: 0.5,
        volume: 10,
        momentum: 0.5,
        topPosts: [],
      };

      const negativeSignal = {
        ...positiveSignal,
        sentiment: -0.5,
      };

      const neutralSignal = {
        ...positiveSignal,
        sentiment: 0.1,
      };

      expect(connector.convertToBeliefSignal(positiveSignal, "politics").direction).toBe("up");
      expect(connector.convertToBeliefSignal(negativeSignal, "politics").direction).toBe("down");
      expect(connector.convertToBeliefSignal(neutralSignal, "politics").direction).toBe("neutral");
    });

    test("should calculate strength from sentiment and volume", () => {
      const weakSignal = {
        subreddit: "politics",
        keyword: "test",
        sentiment: 0.1,
        volume: 2,
        momentum: 0.2,
        topPosts: [],
      };

      const strongSignal = {
        subreddit: "politics",
        keyword: "test",
        sentiment: 0.9,
        volume: 50,
        momentum: 0.9,
        topPosts: [],
      };

      const weak = connector.convertToBeliefSignal(weakSignal, "politics");
      const strong = connector.convertToBeliefSignal(strongSignal, "politics");

      expect(weak.strength).toBeLessThan(strong.strength);
      expect(weak.strength).toBeGreaterThanOrEqual(1);
      expect(strong.strength).toBeLessThanOrEqual(5);
    });
  });

  describe("getCredibilityScore", () => {
    test("should return high score for news subreddits", () => {
      expect(connector.getCredibilityScore("news")).toBeGreaterThanOrEqual(0.85);
      expect(connector.getCredibilityScore("worldnews")).toBeGreaterThanOrEqual(0.85);
    });

    test("should return medium score for opinion subreddits", () => {
      const score = connector.getCredibilityScore("politics");
      expect(score).toBeGreaterThanOrEqual(0.6);
      expect(score).toBeLessThan(0.85);
    });

    test("should return low score for speculation subreddits", () => {
      const score = connector.getCredibilityScore("wallstreetbets");
      expect(score).toBeLessThan(0.6);
    });

    test("should return default score for unknown subreddits", () => {
      const score = connector.getCredibilityScore("unknown_subreddit");
      expect(score).toBe(0.7); // DEFAULT_CREDIBILITY
    });
  });
});
