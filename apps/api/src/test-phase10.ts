/**
 * Phase 10 Integration Test
 * 
 * Demonstrates usage of Reddit RSS and Hacker News connectors.
 * This script can be run to test the new data sources.
 */

import { RedditRSSFetcher } from "./connectors/reddit-rss";
import { HackerNewsConnector } from "./connectors/hackernews";

async function testPhase10() {
  console.log("🧪 Phase 10: Testing Reddit RSS and Hacker News Connectors\n");

  // Test Reddit RSS
  console.log("=" .repeat(60));
  console.log("📡 Testing Reddit RSS Connector");
  console.log("=" .repeat(60));

  const rssFetcher = new RedditRSSFetcher({
    userAgent: "pomabot-test/1.0",
    pollInterval: 0, // Disable rate limiting for testing
  });

  try {
    console.log("\n1. Fetching posts from r/CryptoCurrency...");
    const cryptoPosts = await rssFetcher.fetchSubreddit("CryptoCurrency");
    console.log(`   ✅ Fetched ${cryptoPosts.length} posts`);
    
    if (cryptoPosts.length > 0) {
      console.log(`   Top post: "${cryptoPosts[0]?.title || 'N/A'}"`);
    }

    console.log("\n2. Searching for Bitcoin-related posts...");
    const bitcoinPosts = await rssFetcher.searchForMarket("crypto", ["bitcoin"]);
    console.log(`   ✅ Found ${bitcoinPosts.length} Bitcoin posts`);

    if (bitcoinPosts.length > 0) {
      console.log("\n3. Generating signal from Bitcoin posts...");
      const signal = rssFetcher.generateSignal(bitcoinPosts, ["bitcoin"]);
      
      if (signal) {
        console.log(`   ✅ Signal generated:`);
        console.log(`      Subreddit: r/${signal.subreddit}`);
        console.log(`      Sentiment: ${signal.sentiment.toFixed(3)}`);
        console.log(`      Volume: ${signal.volume} posts`);
        console.log(`      Top post: "${signal.topPosts[0]?.title}"`);

        console.log("\n4. Converting to belief engine signal...");
        const beliefSignal = rssFetcher.convertToBeliefSignal(signal, "crypto");
        console.log(`   ✅ Belief signal:`);
        console.log(`      Type: ${beliefSignal.type}`);
        console.log(`      Direction: ${beliefSignal.direction}`);
        console.log(`      Strength: ${beliefSignal.strength}/5`);
        console.log(`      Source: ${beliefSignal.source}`);
      } else {
        console.log("   ⚠️  No signal generated (no matching posts)");
      }
    }
  } catch (error) {
    console.error("   ❌ Error testing Reddit RSS:", error);
  }

  // Test Hacker News
  console.log("\n" + "=".repeat(60));
  console.log("📡 Testing Hacker News Connector");
  console.log("=" .repeat(60));

  const hnConnector = new HackerNewsConnector({
    userAgent: "pomabot-test/1.0",
    searchTimeWindow: 24,
    minPoints: 10,
  });

  try {
    console.log("\n1. Checking category relevance...");
    console.log(`   Technology: ${hnConnector.isRelevantCategory("technology") ? "✅" : "❌"}`);
    console.log(`   Crypto: ${hnConnector.isRelevantCategory("crypto") ? "✅" : "❌"}`);
    console.log(`   Politics: ${hnConnector.isRelevantCategory("politics") ? "✅" : "❌"}`);

    console.log("\n2. Searching for React stories...");
    const reactStories = await hnConnector.searchStories(["react", "react 19"], "technology");
    console.log(`   ✅ Found ${reactStories.length} React stories`);

    if (reactStories.length > 0) {
      console.log(`   Top story: "${reactStories[0]?.title || 'N/A'}" (${reactStories[0]?.points || 0} points)`);

      console.log("\n3. Generating signal from React stories...");
      const signal = hnConnector.generateSignal(reactStories, ["react"]);
      
      if (signal) {
        console.log(`   ✅ Signal generated:`);
        console.log(`      Keyword: ${signal.keyword}`);
        console.log(`      Sentiment: ${signal.sentiment.toFixed(3)}`);
        console.log(`      Volume: ${signal.volume} stories`);
        console.log(`      Momentum: ${signal.momentum.toFixed(1)}`);
        console.log(`      Top story: "${signal.topStories[0]?.title}"`);

        console.log("\n4. Converting to belief engine signal...");
        const beliefSignal = hnConnector.convertToBeliefSignal(signal, "technology");
        console.log(`   ✅ Belief signal:`);
        console.log(`      Type: ${beliefSignal.type}`);
        console.log(`      Direction: ${beliefSignal.direction}`);
        console.log(`      Strength: ${beliefSignal.strength}/5`);
        console.log(`      Source: ${beliefSignal.source}`);
      } else {
        console.log("   ⚠️  No signal generated");
      }
    }

    console.log("\n3. Searching for Bitcoin stories...");
    const bitcoinStories = await hnConnector.searchStories(["bitcoin", "btc"], "crypto");
    console.log(`   ✅ Found ${bitcoinStories.length} Bitcoin stories`);

    if (bitcoinStories.length > 0) {
      console.log(`   Top story: "${bitcoinStories[0]?.title || 'N/A'}" (${bitcoinStories[0]?.points || 0} points)`);
    }

  } catch (error) {
    console.error("   ❌ Error testing Hacker News:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Phase 10 Integration Test Complete!");
  console.log("=".repeat(60));
  console.log("\nSummary:");
  console.log("- Reddit RSS: Simple, no auth, 25 posts per subreddit");
  console.log("- Hacker News: Excellent for tech/crypto, rich engagement data");
  console.log("- Both connectors ready for integration into TradingService");
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPhase10().catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
}

export { testPhase10 };
