/**
 * Test script for Phase 6 news integration
 * 
 * Tests:
 * 1. RSS feed fetching from multiple sources
 * 2. News deduplication
 * 3. Signal generation from news items
 * 4. Relevance scoring
 */

import { NewsAggregator } from "./connectors/news.js";

async function testNewsIntegration() {
  console.log("🧪 Testing Phase 6: News Integration\n");

  const news = new NewsAggregator();

  // Test 1: Fetch news from all categories
  console.log("📰 Test 1: Fetching news from RSS feeds...");
  try {
    const allNews = await news.fetchNews();
    console.log(`✅ Fetched ${allNews.length} news items`);
    
    // Show sample items
    if (allNews.length > 0) {
      console.log("\n📋 Sample news items:");
      allNews.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   Source: ${item.source}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Published: ${item.published_at.toISOString()}`);
        console.log(`   Relevance: ${item.relevance_score.toFixed(2)}`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to fetch news:", error);
  }

  // Test 2: Fetch category-specific news
  console.log("\n\n📊 Test 2: Fetching crypto-specific news...");
  try {
    const cryptoNews = await news.fetchNews("crypto");
    console.log(`✅ Fetched ${cryptoNews.length} crypto news items`);
  } catch (error) {
    console.error("❌ Failed to fetch crypto news:", error);
  }

  // Test 3: Generate signals from news
  console.log("\n\n🔮 Test 3: Generating signals from news...");
  try {
    const allNews = await news.fetchNews();
    const keywords = ["bitcoin", "crypto", "sec", "election", "nba", "technology"];
    const signals = await news.generateSignals(allNews, keywords);
    
    console.log(`✅ Generated ${signals.length} signals`);
    
    // Show sample signals
    if (signals.length > 0) {
      console.log("\n🎯 Sample signals:");
      signals.slice(0, 3).forEach((signal, i) => {
        console.log(`\n${i + 1}. Type: ${signal.type} | Direction: ${signal.direction} | Strength: ${signal.strength}`);
        console.log(`   Source: ${signal.source}`);
        console.log(`   Description: ${signal.description}`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to generate signals:", error);
  }

  // Test 4: Test with simulation data
  console.log("\n\n🎮 Test 4: Testing with simulation data...");
  try {
    process.env.SIMULATION_DATA = "true";
    const simNews = await news.fetchNews();
    console.log(`✅ Fetched ${simNews.length} news items (with simulation data)`);
    
    // Generate signals from simulation data
    const keywords = ["bitcoin", "sec", "lakers", "election"];
    const signals = await news.generateSignals(simNews, keywords);
    console.log(`✅ Generated ${signals.length} signals from simulation data`);
  } catch (error) {
    console.error("❌ Failed with simulation data:", error);
  }

  console.log("\n\n✨ Phase 6 News Integration Tests Complete!");
}

// Run tests
testNewsIntegration().catch(console.error);
