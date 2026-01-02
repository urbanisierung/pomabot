/**
 * Polymarket Trading Bot - API Service
 * 
 * Main entry point for the autonomous trading system
 * Includes HTTP server for dashboard integration
 */

import { createServer } from "node:http";
import { TradingService } from "./services/trading.js";

const HTTP_PORT = parseInt(process.env.API_PORT ?? "4000", 10);

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
  const tradingService = new TradingService();

  // Start the service
  await tradingService.start();

  // Create HTTP server for dashboard
  const server = createServer((req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/api/status") {
      const status = tradingService.getStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.url === "/api/markets") {
      const marketStates = tradingService.getMarketStates();
      // Transform for JSON serialization
      const markets = marketStates.map(state => ({
        marketId: state.market.id,
        question: state.market.question,
        category: state.market.category,
        currentPrice: state.market.current_price,
        liquidity: state.market.liquidity,
        closesAt: state.market.closes_at?.toISOString() ?? new Date().toISOString(),
        belief: {
          belief_low: state.belief.belief_low,
          belief_high: state.belief.belief_high,
          confidence: state.belief.confidence,
          unknowns: state.belief.unknowns,
          last_updated: state.belief.last_updated.toISOString(),
        },
        signalCount: state.signalHistory.length,
        lastChecked: state.lastChecked.toISOString(),
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ markets, total: markets.length }));
      return;
    }

    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === "/api/performance") {
      const performance = tradingService.getPerformanceMetrics();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(performance));
      return;
    }

    if (req.url === "/api/trade-history") {
      const history = tradingService.getTradeHistory();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(history));
      return;
    }

    if (req.url === "/api/portfolio") {
      const portfolio = tradingService.getPortfolioStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(portfolio));
      return;
    }

    // Phase 9: Batch processing endpoints
    if (req.url === "/api/batch/config") {
      const config = {
        batchMode: process.env.BATCH_MODE_ENABLED === "true",
        maxConcurrency: parseInt(process.env.BATCH_MAX_CONCURRENCY || "50", 10),
        batchSize: parseInt(process.env.BATCH_SIZE || "100", 10),
        timeoutMs: parseInt(process.env.BATCH_TIMEOUT_MS || "5000", 10),
        minEdge: parseInt(process.env.BATCH_MIN_EDGE || "15", 10),
        maxPortfolioRisk: parseInt(process.env.BATCH_MAX_PORTFOLIO_RISK || "20", 10),
        diversificationRequired: process.env.BATCH_REQUIRE_DIVERSIFICATION !== "false",
        stopLossPercent: parseInt(process.env.BATCH_STOP_LOSS_PERCENT || "5", 10),
        profitTargetPercent: parseInt(process.env.BATCH_PROFIT_TARGET_PERCENT || "10", 10),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(config));
      return;
    }
    
    // Phase 11: Paper trading endpoints
    if (req.url === "/api/paper-trading/positions") {
      const positions = tradingService.getPaperTradingPositions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ positions: positions ?? [], total: positions?.length ?? 0 }));
      return;
    }
    
    if (req.url === "/api/paper-trading/metrics") {
      const metrics = tradingService.getPaperTradingMetrics();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(metrics ?? {}));
      return;
    }
    
    if (req.url === "/api/paper-trading/calibration") {
      const calibration = tradingService.getPaperTradingCalibration();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(calibration ?? {}));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP API server running on http://localhost:${HTTP_PORT}`);
    console.log(`   Endpoints: /api/status, /api/markets, /api/health, /api/performance, /api/trade-history, /api/portfolio, /api/batch/config, /api/paper-trading/*`);
  });

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
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down gracefully...");
    
    // Log system stop
    try {
      const { AuditLogger } = await import("@pomabot/core");
      const logger = AuditLogger.getInstance();
      await logger.logSystemStop("SIGINT received");
    } catch {
      // Ignore errors during shutdown
    }
    
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n\n🛑 Shutting down gracefully...");
    
    // Log system stop
    try {
      const { AuditLogger } = await import("@pomabot/core");
      const logger = AuditLogger.getInstance();
      await logger.logSystemStop("SIGTERM received");
    } catch {
      // Ignore errors during shutdown
    }
    
    server.close();
    process.exit(0);
  });
}

// Start the bot
main().catch(async error => {
  console.error("❌ Fatal error:", error);
  
  // Try to send error notification
  try {
    const { SlackNotifier } = await import("@pomabot/core");
    const notifier = new SlackNotifier();
    await notifier.sendError(error as Error, "Fatal startup error");
  } catch {
    // Ignore notification errors during fatal error
  }
  
  process.exit(1);
});
