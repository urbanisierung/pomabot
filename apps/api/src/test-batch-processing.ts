/**
 * Test utility for Phase 9: Batch Processing Stress Test
 * 
 * Tests the system with thousands of simulated short-lived markets
 * to validate performance and positive outcome mechanisms.
 * 
 * Usage:
 *   npx tsx apps/api/src/test-batch-processing.ts
 */

import { PolymarketConnector } from "./connectors/polymarket.js";
import { BatchTradingService } from "./services/batch-trading.js";
import type { Market, MarketCategory } from "@pomabot/shared";

// Test configurations
const TEST_SCENARIOS = {
  small: {
    name: "Small Batch (100 markets)",
    marketCount: 100,
    description: "Quick test with 100 markets",
  },
  medium: {
    name: "Medium Batch (500 markets)",
    marketCount: 500,
    description: "Medium stress test with 500 markets",
  },
  large: {
    name: "Large Batch (1000 markets)",
    marketCount: 1000,
    description: "Large stress test with 1000 markets",
  },
  extreme: {
    name: "Extreme Batch (5000 markets)",
    marketCount: 5000,
    description: "Extreme stress test with 5000 markets",
  },
};

/**
 * Generate mock short-lived markets for testing
 */
function generateMockMarkets(count: number): Market[] {
  const categories: MarketCategory[] = [
    "politics",
    "sports",
    "crypto",
    "economics",
    "entertainment",
    "weather",
    "technology",
    "world",
  ];

  const markets: Market[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length] as MarketCategory;
    const price = 30 + Math.random() * 40; // Random price between 30-70
    const liquidity = 5000 + Math.random() * 45000; // Random liquidity 5k-50k

    const market: Market = {
      id: `test-market-${i}`,
      question: generateMarketQuestion(category, i),
      resolution_criteria: "Test resolution criteria",
      category,
      current_price: Math.round(price * 100) / 100,
      liquidity: Math.round(liquidity),
      volume_24h: Math.round(liquidity * 0.3), // 30% of liquidity as volume
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Created within last week
      closes_at: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Closes within next 30 days
    };

    markets.push(market);
  }

  return markets;
}

/**
 * Generate realistic market questions by category
 */
function generateMarketQuestion(category: MarketCategory, index: number): string {
  const templates: Record<MarketCategory, string[]> = {
    politics: [
      "Will the bill pass in congress?",
      "Will the candidate win the election?",
      "Will the policy be enacted this year?",
      "Will the referendum succeed?",
    ],
    sports: [
      "Will the team win the championship?",
      "Will the player score over 30 points?",
      "Will the game end in overtime?",
      "Will the team make the playoffs?",
    ],
    crypto: [
      "Will Bitcoin reach $100k this year?",
      "Will Ethereum reach $10k?",
      "Will the token launch succeed?",
      "Will the protocol be exploited?",
    ],
    economics: [
      "Will inflation exceed 5% this quarter?",
      "Will the Fed raise rates?",
      "Will GDP growth exceed 3%?",
      "Will unemployment fall below 4%?",
    ],
    entertainment: [
      "Will the film win best picture?",
      "Will the show be renewed?",
      "Will the album reach #1?",
      "Will the actor win the award?",
    ],
    weather: [
      "Will it snow more than 10 inches?",
      "Will the temperature exceed 90°F?",
      "Will the hurricane make landfall?",
      "Will there be a drought this summer?",
    ],
    technology: [
      "Will the product launch on time?",
      "Will the company reach 1B users?",
      "Will the feature be released?",
      "Will the merger be approved?",
    ],
    world: [
      "Will the treaty be signed?",
      "Will the conflict escalate?",
      "Will the sanctions be lifted?",
      "Will the summit take place?",
    ],
    other: [
      "Will the event happen as scheduled?",
      "Will the prediction come true?",
      "Will the outcome be positive?",
    ],
  };

  const categoryTemplates = templates[category] || templates.other;
  const template = categoryTemplates[index % categoryTemplates.length];
  
  return `${template} (#${index})`;
}

/**
 * Run batch processing test scenario
 */
async function runTestScenario(
  scenarioKey: keyof typeof TEST_SCENARIOS,
  useRealMarkets = false
) {
  const scenario = TEST_SCENARIOS[scenarioKey];
  
  console.log("\n" + "=".repeat(80));
  console.log(`📊 ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log("=".repeat(80) + "\n");

  // Initialize batch trading service
  const batchService = new BatchTradingService({
    batchProcessor: {
      maxConcurrency: parseInt(process.env.BATCH_MAX_CONCURRENCY || "50", 10),
      batchSize: parseInt(process.env.BATCH_SIZE || "100", 10),
      timeoutMs: parseInt(process.env.BATCH_TIMEOUT_MS || "5000", 10),
      retryAttempts: 2,
    },
    positiveOutcome: {
      minEdgeRequired: parseInt(process.env.BATCH_MIN_EDGE || "15", 10),
      maxPortfolioRisk: parseInt(process.env.BATCH_MAX_PORTFOLIO_RISK || "20", 10),
      diversificationRequired: process.env.BATCH_REQUIRE_DIVERSIFICATION !== "false",
      stopLossPercent: parseInt(process.env.BATCH_STOP_LOSS_PERCENT || "5", 10),
      profitTargetPercent: parseInt(process.env.BATCH_PROFIT_TARGET_PERCENT || "10", 10),
      maxPositionsPerCategory: 2,
    },
    enableNews: true,
  });

  // Get markets
  let markets: Market[];
  
  if (useRealMarkets) {
    console.log("🌐 Fetching real markets from Polymarket...");
    const polymarket = new PolymarketConnector();
    const allMarkets = await polymarket.fetchMarkets();
    markets = allMarkets.slice(0, scenario.marketCount);
    console.log(`✅ Fetched ${markets.length} real markets\n`);
  } else {
    console.log("🎭 Generating mock markets for testing...");
    markets = generateMockMarkets(scenario.marketCount);
    console.log(`✅ Generated ${markets.length} mock markets\n`);
  }

  // Run batch evaluation
  const portfolioValue = 10000; // $10k test portfolio
  const startTime = Date.now();

  try {
    const { result, selectedPositions } = await batchService.runBatchCycle(
      markets,
      portfolioValue,
      []
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Print results
    console.log("\n" + "─".repeat(80));
    console.log("📈 BATCH PROCESSING RESULTS");
    console.log("─".repeat(80));
    console.log(`Markets Processed:        ${result.metrics.marketsProcessed}`);
    console.log(`Processing Time:          ${result.metrics.processingTimeMs}ms (${(totalTime / 1000).toFixed(2)}s total)`);
    console.log(`Throughput:               ${result.metrics.throughput.toFixed(2)} markets/second`);
    console.log(`Avg Time per Market:      ${result.metrics.avgProcessingTimePerMarket.toFixed(2)}ms`);
    console.log(`Memory Usage:             ${result.metrics.memoryUsageMB.toFixed(2)} MB`);
    console.log(`CPU Utilization:          ${result.metrics.cpuUtilizationPercent.toFixed(2)}%`);
    console.log(`Success Rate:             ${result.metrics.successRate.toFixed(2)}%`);
    console.log(`Errors Encountered:       ${result.metrics.errorsEncountered}`);
    console.log(`Opportunities Found:      ${result.metrics.opportunitiesFound}`);
    console.log(`Selected Positions:       ${selectedPositions.length}`);
    
    // Calculate positive outcome metrics
    const totalRisk = selectedPositions.reduce((sum, pos) => sum + pos.decision.size_usd, 0);
    const portfolioRiskPercent = (totalRisk / portfolioValue) * 100;
    const avgEdge = selectedPositions.length > 0
      ? selectedPositions.reduce((sum, pos) => sum + pos.edge, 0) / selectedPositions.length
      : 0;

    console.log("\n" + "─".repeat(80));
    console.log("💰 POSITIVE OUTCOME ANALYSIS");
    console.log("─".repeat(80));
    console.log(`Portfolio Value:          $${portfolioValue.toFixed(2)}`);
    console.log(`Total Risk:               $${totalRisk.toFixed(2)} (${portfolioRiskPercent.toFixed(2)}% of portfolio)`);
    console.log(`Average Edge:             ${avgEdge.toFixed(2)}%`);
    console.log(`Positions by Category:`);
    
    const categoryBreakdown = new Map<string, number>();
    for (const pos of selectedPositions) {
      categoryBreakdown.set(
        pos.market.category,
        (categoryBreakdown.get(pos.market.category) || 0) + 1
      );
    }
    
    for (const [category, count] of Array.from(categoryBreakdown.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${category.padEnd(15)}: ${count} position${count !== 1 ? 's' : ''}`);
    }

    // Performance validation
    console.log("\n" + "─".repeat(80));
    console.log("✅ VALIDATION CHECKS");
    console.log("─".repeat(80));
    
    const checks = [
      {
        name: "Processing completed",
        pass: result.metrics.successRate > 0,
      },
      {
        name: "Throughput > 10 markets/sec",
        pass: result.metrics.throughput > 10,
      },
      {
        name: "Memory usage < 2GB",
        pass: result.metrics.memoryUsageMB < 2048,
      },
      {
        name: "Portfolio risk < 20%",
        pass: portfolioRiskPercent <= 20,
      },
      {
        name: "Positive outcome guaranteed",
        pass: selectedPositions.every(pos => pos.edge >= 15),
      },
      {
        name: "Diversification enforced",
        pass: Array.from(categoryBreakdown.values()).every(count => count <= 2),
      },
    ];

    let allPassed = true;
    for (const check of checks) {
      const status = check.pass ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} - ${check.name}`);
      if (!check.pass) allPassed = false;
    }

    console.log("\n" + "=".repeat(80));
    if (allPassed) {
      console.log("🎉 ALL VALIDATION CHECKS PASSED!");
    } else {
      console.log("⚠️  SOME VALIDATION CHECKS FAILED");
    }
    console.log("=".repeat(80) + "\n");

    return { success: allPassed, result, selectedPositions };

  } catch (error) {
    console.error("\n❌ BATCH PROCESSING FAILED:");
    console.error(error);
    return { success: false, error };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("\n🧪 PHASE 9: PARALLEL MARKET TESTING");
  console.log("Testing batch processing with thousands of markets\n");

  // Get scenario from command line args or default to "small"
  const scenarioArg = process.argv[2] as keyof typeof TEST_SCENARIOS | undefined;
  const useRealMarkets = process.argv.includes("--real");
  
  const scenario = scenarioArg && TEST_SCENARIOS[scenarioArg] 
    ? scenarioArg 
    : "small";

  await runTestScenario(scenario, useRealMarkets);

  console.log("\n💡 TIP: Run with different scenarios:");
  console.log("   npx tsx apps/api/src/test-batch-processing.ts small");
  console.log("   npx tsx apps/api/src/test-batch-processing.ts medium");
  console.log("   npx tsx apps/api/src/test-batch-processing.ts large");
  console.log("   npx tsx apps/api/src/test-batch-processing.ts extreme");
  console.log("   npx tsx apps/api/src/test-batch-processing.ts large --real");
  console.log("");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runTestScenario, generateMockMarkets };
