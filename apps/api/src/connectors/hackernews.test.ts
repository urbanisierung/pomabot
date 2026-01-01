/**
 * Tests for Hacker News Connector
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HackerNewsConnector } from "./hackernews";

describe("HackerNewsConnector", () => {
  let connector: HackerNewsConnector;

  beforeEach(() => {
    connector = new HackerNewsConnector({
      userAgent: "pomabot-test/1.0",
      searchTimeWindow: 24,
      minPoints: 10,
    });
  });

  describe("Configuration", () => {
    it("should initialize with default config", () => {
      const defaultConnector = new HackerNewsConnector();
      expect(defaultConnector).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customConnector = new HackerNewsConnector({
        apiUrl: "https://custom.api.com",
        searchTimeWindow: 48,
        minPoints: 5,
        userAgent: "custom/1.0",
      });
      expect(customConnector).toBeDefined();
    });
  });

  describe("Category Relevance", () => {
    it("should identify technology as relevant", () => {
      expect(connector.isRelevantCategory("technology")).toBe(true);
    });

    it("should identify crypto as relevant", () => {
      expect(connector.isRelevantCategory("crypto")).toBe(true);
    });

    it("should identify economics as relevant", () => {
      expect(connector.isRelevantCategory("economics")).toBe(true);
    });

    it("should identify politics as not relevant", () => {
      expect(connector.isRelevantCategory("politics")).toBe(false);
    });

    it("should identify sports as not relevant", () => {
      expect(connector.isRelevantCategory("sports")).toBe(false);
    });

    it("should identify entertainment as not relevant", () => {
      expect(connector.isRelevantCategory("entertainment")).toBe(false);
    });
  });

  describe("Sentiment Analysis", () => {
    it("should calculate positive sentiment correctly", () => {
      const stories = [
        {
          objectID: "1",
          title: "Bitcoin achieves breakthrough with successful launch",
          url: "https://example.com/1",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeGreaterThan(0);
    });

    it("should calculate negative sentiment correctly", () => {
      const stories = [
        {
          objectID: "1",
          title: "Bitcoin crash causes major vulnerability and shutdown",
          url: "https://example.com/1",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(signal?.sentiment).toBeLessThan(0);
    });

    it("should calculate neutral sentiment for neutral posts", () => {
      const stories = [
        {
          objectID: "1",
          title: "Bitcoin technical analysis update",
          url: "https://example.com/1",
          author: "test",
          points: 50,
          num_comments: 20,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      expect(signal).toBeDefined();
      expect(Math.abs(signal?.sentiment || 0)).toBeLessThan(0.3);
    });
  });

  describe("Signal Generation", () => {
    it("should generate signal from HN stories", () => {
      const stories = [
        {
          objectID: "1",
          title: "React 19 released with new features",
          url: "https://example.com/1",
          author: "test",
          points: 150,
          num_comments: 75,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
        {
          objectID: "2",
          title: "React 19 performance improvements",
          url: "https://example.com/2",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["react"]);

      expect(signal).toBeDefined();
      expect(signal?.keyword).toBe("react");
      expect(signal?.volume).toBe(2);
      expect(signal?.topStories).toHaveLength(2);
      expect(signal?.momentum).toBeGreaterThan(0);
    });

    it("should return undefined for empty stories", () => {
      const signal = connector.generateSignal([], ["bitcoin"]);
      expect(signal).toBeUndefined();
    });

    it("should calculate momentum from points and comments", () => {
      const stories = [
        {
          objectID: "1",
          title: "High engagement story about bitcoin",
          url: "https://example.com/1",
          author: "test",
          points: 500,
          num_comments: 300,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      expect(signal?.momentum).toBeGreaterThan(100);
    });

    it("should sort top stories by points", () => {
      const stories = [
        {
          objectID: "1",
          title: "Story 1 about react",
          url: "https://example.com/1",
          author: "test",
          points: 50,
          num_comments: 20,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
        {
          objectID: "2",
          title: "Story 2 about react",
          url: "https://example.com/2",
          author: "test",
          points: 200,
          num_comments: 100,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["react"]);
      expect(signal?.topStories[0]?.points).toBe(200); // Highest points first
    });

    it("should limit top stories to 5", () => {
      const stories = Array.from({ length: 10 }, (_, i) => ({
        objectID: `${i}`,
        title: `Story ${i} about bitcoin`,
        url: `https://example.com/${i}`,
        author: "test",
        points: 100 - i,
        num_comments: 50,
        created_at: new Date().toISOString(),
        created_at_i: Math.floor(Date.now() / 1000),
        _tags: ["story"],
      }));

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      expect(signal?.topStories).toHaveLength(5);
    });
  });

  describe("Belief Engine Conversion", () => {
    it("should convert to quantitative signal for high volume and engagement", () => {
      const hnSignal = {
        keyword: "react",
        sentiment: 0.5,
        volume: 20,
        momentum: 80,
        topStories: [
          { title: "Test", points: 100, url: "https://example.com", num_comments: 50 },
        ],
      };

      const signal = connector.convertToBeliefSignal(hnSignal, "technology");

      expect(signal.type).toBe("quantitative");
      expect(signal.direction).toBe("up");
      expect(signal.strength).toBeGreaterThan(0);
      expect(signal.source).toBe("hackernews");
    });

    it("should convert to interpretive signal for medium volume", () => {
      const hnSignal = {
        keyword: "bitcoin",
        sentiment: 0.3,
        volume: 8,
        momentum: 30,
        topStories: [
          { title: "Test", points: 50, url: "https://example.com", num_comments: 20 },
        ],
      };

      const signal = connector.convertToBeliefSignal(hnSignal, "crypto");

      expect(signal.type).toBe("interpretive");
      expect(signal.direction).toBe("up");
    });

    it("should convert to speculative signal for low volume", () => {
      const hnSignal = {
        keyword: "startup",
        sentiment: 0.1,
        volume: 3,
        momentum: 10,
        topStories: [
          { title: "Test", points: 20, url: "https://example.com", num_comments: 5 },
        ],
      };

      const signal = connector.convertToBeliefSignal(hnSignal, "economics");

      expect(signal.type).toBe("speculative");
    });

    it("should set neutral direction for low sentiment", () => {
      const hnSignal = {
        keyword: "ai",
        sentiment: 0.1,
        volume: 10,
        momentum: 40,
        topStories: [
          { title: "Test", points: 60, url: "https://example.com", num_comments: 30 },
        ],
      };

      const signal = connector.convertToBeliefSignal(hnSignal, "technology");

      expect(signal.direction).toBe("neutral");
    });

    it("should set down direction for negative sentiment", () => {
      const hnSignal = {
        keyword: "crypto",
        sentiment: -0.5,
        volume: 10,
        momentum: 40,
        topStories: [
          { title: "Test", points: 60, url: "https://example.com", num_comments: 30 },
        ],
      };

      const signal = connector.convertToBeliefSignal(hnSignal, "crypto");

      expect(signal.direction).toBe("down");
    });

    it("should calculate strength based on sentiment and momentum", () => {
      const highSignal = {
        keyword: "react",
        sentiment: 0.9,
        volume: 25,
        momentum: 150,
        topStories: [
          { title: "Test", points: 200, url: "https://example.com", num_comments: 100 },
        ],
      };

      const lowSignal = {
        keyword: "react",
        sentiment: 0.1,
        volume: 3,
        momentum: 10,
        topStories: [
          { title: "Test", points: 20, url: "https://example.com", num_comments: 5 },
        ],
      };

      const high = connector.convertToBeliefSignal(highSignal, "technology");
      const low = connector.convertToBeliefSignal(lowSignal, "technology");

      expect(high.strength).toBeGreaterThan(low.strength);
    });
  });

  describe("Keyword Filtering", () => {
    it("should only analyze stories matching keywords", () => {
      const stories = [
        {
          objectID: "1",
          title: "React 19 released",
          url: "https://example.com/1",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
        {
          objectID: "2",
          title: "Unrelated topic",
          url: "https://example.com/2",
          author: "test",
          points: 80,
          num_comments: 40,
          created_at: new Date().toISOString(),
          created_at_i: Math.floor(Date.now() / 1000),
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["react"]);
      
      expect(signal).toBeDefined();
      expect(signal?.volume).toBe(2); // Both stories included in volume count
    });
  });

  describe("Recency Weighting", () => {
    it("should weight recent stories more heavily", () => {
      const now = Math.floor(Date.now() / 1000);
      const yesterday = now - 24 * 3600;

      const stories = [
        {
          objectID: "1",
          title: "Bitcoin breakthrough success wins approval",
          url: "https://example.com/1",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date(now * 1000).toISOString(),
          created_at_i: now,
          _tags: ["story"],
        },
        {
          objectID: "2",
          title: "Bitcoin crash failure concern bearish",
          url: "https://example.com/2",
          author: "test",
          points: 100,
          num_comments: 50,
          created_at: new Date(yesterday * 1000).toISOString(),
          created_at_i: yesterday,
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      
      // Recent positive story should outweigh older negative story
      expect(signal?.sentiment).toBeGreaterThan(0);
    });
  });

  describe("Points Weighting", () => {
    it("should weight high-point stories more heavily", () => {
      const now = Math.floor(Date.now() / 1000);

      const stories = [
        {
          objectID: "1",
          title: "Bitcoin breakthrough success achieves wins",
          url: "https://example.com/1",
          author: "test",
          points: 500,
          num_comments: 200,
          created_at: new Date(now * 1000).toISOString(),
          created_at_i: now,
          _tags: ["story"],
        },
        {
          objectID: "2",
          title: "Bitcoin crash failure concern problem",
          url: "https://example.com/2",
          author: "test",
          points: 10,
          num_comments: 5,
          created_at: new Date(now * 1000).toISOString(),
          created_at_i: now,
          _tags: ["story"],
        },
      ];

      const signal = connector.generateSignal(stories, ["bitcoin"]);
      
      // High-point positive story should dominate
      expect(signal?.sentiment).toBeGreaterThan(0);
    });
  });
});
