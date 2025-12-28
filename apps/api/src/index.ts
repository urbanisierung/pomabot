/**
 * Polymarket Trading Bot - API Service
 * 
 * Main entry point for the autonomous trading system
 */

import { TradingService } from "./services/trading.js";

async function main() {
  console.log("=".repeat(60));
  console.log("  Polymarket Autonomous Trading Bot");
  console.log("=".repeat(60));
  console.log("");

  // Get API key from environment
  const apiKey = process.env.POLYMARKET_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️  No POLYMARKET_API_KEY found - running in read-only mode");
    console.warn("   Set POLYMARKET_API_KEY to enable trading");
  }

  // Initialize trading service
  const tradingService = new TradingService(apiKey);

  // Start the service
  await tradingService.start();

  // Log status every 5 minutes
  setInterval(() => {
    const status = tradingService.getStatus();
    console.log("");
    console.log("📊 Status Update:");
    console.log(`   State: ${status.state}`);
    console.log(`   Markets: ${status.markets}`);
    console.log(`   Halted: ${status.halted ? "YES - " + status.haltReason : "NO"}`);
    console.log("");
  }, 5 * 60 * 1000);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n🛑 Shutting down gracefully...");
    process.exit(0);
  });
}

// Start the bot
main().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
