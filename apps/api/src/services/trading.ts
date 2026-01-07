/**
 * Trading Service
 * 
 * Main orchestration service that:
 * - Monitors Polymarket markets
 * - Aggregates news and signals
 * - Updates beliefs
 * - Evaluates trades
 * - Executes orders (simulation or real)
 * 
 * Phase 4: Real trading execution with safety controls
 */

import {
  performBeliefUpdate,
  evaluateTrade,
  StateMachine,
  ExecutionLayer,
  SafetyControls,
  SlackNotifier,
  AuditLogger,
  TradeHistoryAnalyzer,
  PortfolioManager,
  PaperTradingTracker,
  type DailySummary,
} from "@pomabot/core";
import type { BeliefState, Signal, Market, TradeDecision } from "@pomabot/shared";
import { PolymarketConnector } from "../connectors/polymarket.js";
import { NewsAggregator } from "../connectors/news.js";
import { RedditConnector } from "../connectors/reddit.js";
import { WalletManager } from "../connectors/wallet.js";

export interface MarketState {
  market: Market;
  belief: BeliefState;
  signalHistory: Signal[];
  lastChecked: Date;
}

export class TradingService {
  private polymarket: PolymarketConnector;
  private news: NewsAggregator;
  private reddit?: RedditConnector;
  private stateMachine: StateMachine;
  private execution: ExecutionLayer;
  private safetyControls: SafetyControls;
  private notifier: SlackNotifier;
  private auditLogger: AuditLogger;
  private wallet?: WalletManager;
  private simulationMode: boolean;
  private redditEnabled: boolean;
  
  // Phase 7: Advanced features
  private tradeHistory: TradeHistoryAnalyzer;
  private portfolioManager: PortfolioManager;
  
  // Phase 11: Paper trading
  private paperTrading: PaperTradingTracker;
  private paperTradingEnabled: boolean;
  private resolutionCheckInterval: number;
  
  private marketStates: Map<string, MarketState> = new Map();
  private pollInterval = parseInt(process.env.POLL_INTERVAL ?? "60000", 10); // Default 60s, configurable
  
  // Memory management constants
  private readonly MAX_SIGNAL_HISTORY = 50; // Keep only last 50 signals per market
  private readonly MARKET_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up markets every 5 minutes
  private readonly MEMORY_CHECK_INTERVAL = 10 * 60 * 1000; // Check memory every 10 minutes
  private readonly MEMORY_CRITICAL_THRESHOLD = 180; // MB - trigger aggressive cleanup
  
  // Track service start time for uptime calculation
  private startTime = new Date();
  
  // Daily summary tracking - enhanced with signal counts
  private dailyStats = {
    tradeOpportunities: 0,
    tradesExecuted: 0,
    newsSignalsProcessed: 0,
    redditSignalsProcessed: 0,
    hackerNewsSignalsProcessed: 0,
    beliefUpdates: 0,
    lastReset: new Date(),
  };

  constructor() {
    // Check if wallet credentials are provided
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    const chainId = parseInt(process.env.CHAIN_ID ?? "137", 10); // Polygon mainnet
    
    // Initialize wallet if private key is provided
    if (privateKey) {
      this.wallet = new WalletManager({
        privateKey,
        chainId,
        rpcUrl: process.env.POLYGON_RPC_URL,
      });
      this.simulationMode = false;
      console.log("🔴 LIVE TRADING MODE ENABLED");
    } else {
      this.simulationMode = true;
      console.log("🟢 SIMULATION MODE (no wallet configured)");
    }

    // Initialize Polymarket connector with wallet
    this.polymarket = new PolymarketConnector(this.wallet);
    
    // Initialize other services
    this.news = new NewsAggregator();
    this.stateMachine = new StateMachine();
    this.notifier = new SlackNotifier();
    this.auditLogger = AuditLogger.getInstance(
      process.env.AUDIT_LOG_PATH ?? "./audit-logs"
    );

    // Initialize Reddit connector if credentials provided
    const redditClientId = process.env.REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.REDDIT_CLIENT_SECRET;
    const redditUserAgent = process.env.REDDIT_USER_AGENT ?? "pomabot/1.0";
    
    if (redditClientId && redditClientSecret) {
      this.reddit = new RedditConnector({
        clientId: redditClientId,
        clientSecret: redditClientSecret,
        userAgent: redditUserAgent,
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD,
      });
      this.redditEnabled = true;
      console.log("📱 Reddit integration ENABLED");
    } else {
      this.redditEnabled = false;
      console.log("📱 Reddit integration DISABLED (no credentials)");
    }

    // Initialize execution layer with connector
    this.execution = new ExecutionLayer(
      this.polymarket,
      this.simulationMode
    );

    // Initialize safety controls
    this.safetyControls = new SafetyControls({
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE ?? "100"),
      dailyLossLimit: parseFloat(process.env.DAILY_LOSS_LIMIT ?? "50"),
      maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS ?? "5", 10),
      enabled: true, // Kill switch initially enabled
    });

    // Phase 7: Initialize advanced features
    this.tradeHistory = new TradeHistoryAnalyzer(
      process.env.AUDIT_LOG_PATH ?? "./audit-logs"
    );
    
    this.portfolioManager = new PortfolioManager({
      totalCapital: parseFloat(process.env.PORTFOLIO_CAPITAL ?? "1000"),
      maxRiskPerTrade: parseFloat(process.env.MAX_RISK_PER_TRADE ?? "0.02"), // 2%
      kellyFraction: parseFloat(process.env.KELLY_FRACTION ?? "0.25"), // Quarter-Kelly
      correlationThreshold: parseFloat(process.env.CORRELATION_THRESHOLD ?? "0.7"),
      maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT ?? "10"),
    });
    
    // Phase 11: Initialize paper trading with Slack notifier
    this.paperTradingEnabled = process.env.PAPER_TRADING_ENABLED !== "false"; // Default true
    this.resolutionCheckInterval = parseInt(
      process.env.PAPER_RESOLUTION_CHECK_INTERVAL ?? "300000", 
      10
    ); // Default 5 minutes
    
    this.paperTrading = new PaperTradingTracker(this.notifier);
  }

  /**
   * Start the trading service
   */
  async start(): Promise<void> {
    const mode = this.simulationMode ? "SIMULATION" : "LIVE";
    
    console.log("🚀 Starting Polymarket trading service...");
    console.log(`   Poll interval: ${this.pollInterval / 1000}s`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Verbose: ${process.env.VERBOSE === "true" ? "ON" : "OFF"}`);
    console.log(`   Slack notifications: ${this.notifier.isEnabled() ? "ON" : "OFF"}`);
    console.log(`   Reddit integration: ${this.redditEnabled ? "ON" : "OFF"}`);
    
    // Authenticate with CLOB if in live mode
    if (!this.simulationMode && this.wallet) {
      console.log("🔐 Authenticating with Polymarket CLOB...");
      const authenticated = await this.polymarket.authenticate();
      
      if (!authenticated) {
        console.error("❌ Failed to authenticate with CLOB - starting in simulation mode");
        this.simulationMode = true;
        // Update execution layer to simulation mode
        this.execution = new ExecutionLayer(undefined, true);
      } else {
        console.log("✅ CLOB authentication successful - real trading enabled");
      }
    }
    
    // Authenticate with Reddit if enabled
    if (this.redditEnabled && this.reddit) {
      console.log("🔐 Authenticating with Reddit API...");
      const authenticated = await this.reddit.authenticate();
      
      if (!authenticated) {
        console.warn("⚠️ Failed to authenticate with Reddit - disabling Reddit integration");
        this.redditEnabled = false;
      } else {
        console.log("✅ Reddit authentication successful");
      }
    }
    
    // Initialize audit logger
    await this.auditLogger.initialize();
    console.log(`   Audit logging: ENABLED`);
    
    // Phase 11: Initialize paper trading
    if (this.paperTradingEnabled && this.simulationMode) {
      await this.paperTrading.initialize();
      console.log(`   Paper trading: ENABLED`);
      console.log(`     Storage: ${process.env.PAPER_POSITIONS_FILE ?? "./data/paper-positions.json"}`);
      console.log(`     Virtual capital: $${process.env.PAPER_PORTFOLIO_CAPITAL ?? "10000"}`);
    }
    
    // Display safety controls status
    const safetyStatus = this.safetyControls.getStatus();
    console.log(`   Safety Controls:`);
    console.log(`     Max position size: $${safetyStatus.maxPositions}`);
    console.log(`     Daily loss limit: $${safetyStatus.dailyLossLimit}`);
    console.log(`     Max open positions: ${safetyStatus.maxPositions}`);
    
    // Initial market load
    await this.loadMarkets();
    
    // Log system start
    await this.auditLogger.logSystemStart(this.marketStates.size, mode);
    
    // Send startup notification
    await this.notifier.sendSystemStart(this.marketStates.size, mode);
    
    // Run first monitoring cycle immediately
    await this.monitorLoop();
    
    // Start monitoring loop
    setInterval(() => this.monitorLoop(), this.pollInterval);
    
    // Phase 11: Start paper trading resolution checking
    if (this.paperTradingEnabled && this.simulationMode) {
      setInterval(
        () => this.checkPaperTradingResolutions(), 
        this.resolutionCheckInterval
      );
      console.log(`   Paper trading resolution checks every ${this.resolutionCheckInterval / 1000}s`);
    }
    
    // Memory optimization: Periodically clean up expired markets
    setInterval(() => this.cleanupExpiredMarkets(), this.MARKET_CLEANUP_INTERVAL);
    console.log(`   Market cleanup every ${this.MARKET_CLEANUP_INTERVAL / 1000}s`);
    
    // Memory optimization: Periodic memory pressure check
    setInterval(() => this.checkMemoryPressure(), this.MEMORY_CHECK_INTERVAL);
    console.log(`   Memory pressure check every ${this.MEMORY_CHECK_INTERVAL / 1000}s`);
    
    // Schedule daily summary (send at midnight UTC)
    this.scheduleDailySummary();
    
    console.log("✅ Trading service running");
  }

  /**
   * Check memory pressure and trigger aggressive cleanup if needed
   */
  private checkMemoryPressure(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    console.log(`🧠 Memory check: ${heapUsedMB}MB heap / ${rssMB}MB RSS`);
    
    if (heapUsedMB > this.MEMORY_CRITICAL_THRESHOLD) {
      console.warn(`⚠️ Memory pressure detected (${heapUsedMB}MB > ${this.MEMORY_CRITICAL_THRESHOLD}MB threshold)`);
      this.performAggressiveCleanup();
    }
  }

  /**
   * Aggressive cleanup when memory is under pressure
   */
  private performAggressiveCleanup(): void {
    console.log("🧹 Performing aggressive memory cleanup...");
    
    // 1. Reduce signal history to half
    let signalsRemoved = 0;
    for (const [_marketId, state] of this.marketStates) {
      const halfLimit = Math.floor(this.MAX_SIGNAL_HISTORY / 2);
      if (state.signalHistory.length > halfLimit) {
        const toRemove = state.signalHistory.length - halfLimit;
        state.signalHistory = state.signalHistory.slice(-halfLimit);
        signalsRemoved += toRemove;
      }
    }
    console.log(`   Trimmed ${signalsRemoved} signals from history`);
    
    // 2. Clean up resolved paper trading positions older than 7 days
    if (this.paperTradingEnabled) {
      const removedPositions = this.paperTrading.cleanupOldPositions(7);
      console.log(`   Cleaned up ${removedPositions} old resolved positions`);
    }
    
    // 3. Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log("   Forced garbage collection");
    }
    
    const memUsage = process.memoryUsage();
    console.log(`   Post-cleanup: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap`);
  }

  /**
   * Main monitoring loop
   */
  private async monitorLoop(): Promise<void> {
    try {
      // Check if halted
      if (this.stateMachine.isHalted()) {
        console.warn("⚠️ System is halted:", this.stateMachine.getHaltReason());
        return;
      }

      // Only transition to OBSERVE if we're in MONITOR state (valid path)
      // Skip initial transition if already in OBSERVE
      const currentState = this.stateMachine.getCurrentState();
      if (currentState === "MONITOR") {
        this.stateMachine.transition("OBSERVE", "Monitoring cycle started");
      }

      // Fetch latest news and signals
      const news = await this.news.fetchNews();
      // const polls = await this.polling.fetchPolls();

      // Update markets
      await this.updateMarkets();

      // Process each market
      for (const [marketId, state] of this.marketStates) {
        await this.processMarket(marketId, state, news);
      }

      console.log(`✓ Processed ${this.marketStates.size} markets`);
      
      // Memory monitoring: Log memory usage periodically
      const memUsage = process.memoryUsage();
      console.log(`   Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap / ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);


    } catch (error) {
      console.error("Error in monitoring loop:", error);
      await this.auditLogger.logError(error as Error, "Monitoring loop error");
    }
  }

  /**
   * Load initial markets from Polymarket
   */
  private async loadMarkets(): Promise<void> {
    console.log("📊 Loading markets from Polymarket...");
    
    const markets = await this.polymarket.fetchMarkets();
    
    console.log(`Found ${markets.length} active markets`);

    for (const market of markets) {
      // Initialize belief state for new markets
      if (!this.marketStates.has(market.id)) {
        this.marketStates.set(market.id, {
          market,
          belief: this.initializeBeliefState(),
          signalHistory: [],
          lastChecked: new Date(),
        });
      }
    }
  }

  /**
   * Update market data from Polymarket
   * In simulation mode, skip individual fetches (too slow for 1000+ markets)
   */
  private async updateMarkets(): Promise<void> {
    // Skip individual market updates in simulation - use batch data from fetchMarkets
    // This is much faster and sufficient for testing
    if (!process.env.POLYMARKET_API_KEY) {
      return;
    }
    
    for (const [marketId, state] of this.marketStates) {
      const updatedMarket = await this.polymarket.getMarket(marketId);
      
      if (updatedMarket) {
        state.market = updatedMarket;
        state.lastChecked = new Date();
      }
    }
  }

  /**
   * Memory optimization: Clean up expired/closed markets to prevent memory growth
   */
  private cleanupExpiredMarkets(): void {
    const now = new Date();
    let removedCount = 0;
    
    for (const [marketId, state] of this.marketStates) {
      const market = state.market;
      
      // Remove markets that have closed or are past their end date
      const shouldRemove = 
        (market.closes_at && market.closes_at < now) ||
        market.resolved_at !== undefined ||
        market.resolution_outcome !== undefined;
      
      if (shouldRemove) {
        this.marketStates.delete(marketId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired markets (${this.marketStates.size} remaining)`);
      
      // Log memory usage after cleanup
      if (global.gc) {
        global.gc();
      }
      
      const memUsage = process.memoryUsage();
      console.log(`   Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap / ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
    }
  }

  /**
   * Process a single market: generate signals, update beliefs, evaluate trades
   */
  private async processMarket(
    marketId: string,
    state: MarketState,
    news: Array<any>
  ): Promise<void> {
    try {
      // Extract market keywords for signal matching
      const keywords = this.extractKeywords(state.market.question);

      // Generate signals from news
      const newsSignals = await this.news.generateSignals(news, keywords);
      
      // Generate signals from Reddit if enabled
      const redditSignals: Signal[] = [];
      if (this.redditEnabled && this.reddit) {
        try {
          const redditPosts = await this.reddit.searchForMarket(
            state.market.category,
            keywords
          );
          
          if (redditPosts.length > 0) {
            const redditSignal = this.reddit.generateSignal(redditPosts, keywords);
            
            if (redditSignal) {
              const beliefSignal = this.reddit.convertToBeliefSignal(
                redditSignal,
                state.market.category
              );
              redditSignals.push(beliefSignal);
              
              if (process.env.VERBOSE === "true") {
                console.log(`📱 Reddit signal for ${state.market.question}:`, {
                  subreddit: redditSignal.subreddit,
                  sentiment: redditSignal.sentiment.toFixed(2),
                  volume: redditSignal.volume,
                  type: beliefSignal.type,
                  direction: beliefSignal.direction,
                  strength: beliefSignal.strength,
                });
              }
            }
          }
        } catch (error) {
          console.warn("Failed to fetch Reddit signals:", error);
        }
      }
      
      // Combine all signals
      const signals = [...newsSignals, ...redditSignals];
      
      // Track signal counts for daily summary
      this.dailyStats.newsSignalsProcessed += newsSignals.length;
      this.dailyStats.redditSignalsProcessed += redditSignals.length;
      // Note: HackerNews signals are included in newsSignals from the news aggregator

      // Skip state machine transitions for markets without signals (optimization)
      if (signals.length === 0) {
        return;
      }

      // Process each new signal
      for (const signal of signals) {
        if (this.stateMachine.isHalted()) return;
        
        // Ensure we're in OBSERVE state before starting a new signal cycle
        const currentState = this.stateMachine.getCurrentState();
        if (currentState === "UPDATE_BELIEF" || currentState === "EVALUATE_TRADE") {
          // Complete current cycle by going back to OBSERVE
          this.stateMachine.transition("OBSERVE", "Resetting for next signal");
        }
        
        // Now start fresh cycle: OBSERVE → INGEST_SIGNAL
        if (this.stateMachine.getCurrentState() === "OBSERVE") {
          this.stateMachine.transition("INGEST_SIGNAL", `Processing ${signal.type} signal`);
        }
        
        if (this.stateMachine.isHalted()) return;

        // Update belief
        try {
          const updatedBelief = performBeliefUpdate(
            state.belief,
            signal,
            state.signalHistory
          );

          this.stateMachine.transition("UPDATE_BELIEF", "Belief updated");

          state.belief = updatedBelief;
          state.signalHistory.push(signal);
          
          // Memory optimization: Keep only the most recent signals
          if (state.signalHistory.length > this.MAX_SIGNAL_HISTORY) {
            state.signalHistory = state.signalHistory.slice(-this.MAX_SIGNAL_HISTORY);
          }
          
          // Track belief update for daily summary
          this.dailyStats.beliefUpdates++;

          console.log(`📈 Updated belief for ${state.market.question}:`, {
            range: [updatedBelief.belief_low, updatedBelief.belief_high],
            confidence: updatedBelief.confidence,
          });

        } catch (error) {
          // Signal rejected - this is expected behavior, reduce logging noise
          if (process.env.VERBOSE === "true") {
            console.warn(`Signal rejected for ${marketId}:`, error);
          }
          // Go back to OBSERVE for next signal
          if (this.stateMachine.getCurrentState() === "INGEST_SIGNAL") {
            this.stateMachine.transition("OBSERVE", "Signal rejected, continuing");
          }
          continue;
        }
      }

      // Evaluate trade
      await this.evaluateTradeForMarket(state);

    } catch (error) {
      console.error(`Error processing market ${marketId}:`, error);
    }
  }

  /**
   * Evaluate and potentially execute a trade
   */
  private async evaluateTradeForMarket(state: MarketState): Promise<void> {
    // Only transition if we're in UPDATE_BELIEF state
    const currentState = this.stateMachine.getCurrentState();
    if (currentState === "UPDATE_BELIEF") {
      this.stateMachine.transition("EVALUATE_TRADE", "Checking trade eligibility");
    }

    const criteria = {
      authority: "Polymarket resolution",
      authority_is_clear: true,
      outcome_is_objective: true,
    };

    const decision = evaluateTrade(state.belief, state.market, criteria);

    // Check if trade is recommended
    if ("side" in decision && decision.side !== "NONE") {
      const edge = this.calculateEdge(decision, state.belief);
      
      console.log(`💡 Trade opportunity: ${decision.side} on ${state.market.question}`);
      console.log(`   Entry: ${decision.entry_price}%`);
      console.log(`   Edge: ${edge}%`);
      console.log(`   Rationale: ${decision.rationale}`);

      // Track for daily summary
      this.dailyStats.tradeOpportunities++;
      
      // Log trade opportunity
      await this.auditLogger.logTradeOpportunity(
        state.market,
        state.belief,
        edge,
        decision.rationale
      );
      
      // Send Slack notification
      await this.notifier.sendTradeOpportunity({
        market: state.market,
        decision,
        belief: state.belief,
        edge,
      });

      // Check safety controls before executing
      const safetyCheck = this.safetyControls.canTrade(state.market.id, decision.size_usd);
      
      if (!safetyCheck.allowed) {
        console.warn(`⚠️ Trade blocked by safety controls: ${safetyCheck.reason}`);
        await this.notifier.sendError(
          new Error(`Trade blocked: ${safetyCheck.reason}`),
          "Safety controls"
        );
        
        // Transition back to OBSERVE
        if (this.stateMachine.getCurrentState() === "EVALUATE_TRADE") {
          this.stateMachine.transition("OBSERVE", "Trade blocked by safety controls");
        }
        return;
      }

      // Execute trade (real or simulation)
      if (this.stateMachine.getCurrentState() === "EVALUATE_TRADE") {
        this.stateMachine.transition("EXECUTE_TRADE", 
          this.simulationMode ? "[SIMULATION] Trade would be executed" : "Executing real trade"
        );

        // Get token ID for the YES/NO outcome
        const tokenId = this.getTokenIdForOutcome(state.market, decision.side);
        
        if (!tokenId && !this.simulationMode) {
          console.error("❌ Cannot execute trade: token ID not found");
          this.stateMachine.transition("MONITOR", "Trade execution failed");
          this.stateMachine.transition("OBSERVE", "Ready for next cycle");
          return;
        }

        // Execute the trade
        const result = await this.execution.executeTrade(decision, state.market.id, tokenId);
        
        if (result.success) {
          this.dailyStats.tradesExecuted++;
          
          // Register position with safety controls
          this.safetyControls.addPosition(
            state.market.id,
            decision.size_usd,
            decision.entry_price
          );
          
          // Phase 11: Create paper position for tracking
          if (this.simulationMode && this.paperTradingEnabled) {
            await this.paperTrading.createPosition({
              marketId: state.market.id,
              marketQuestion: state.market.question,
              category: state.market.category,
              side: decision.side,
              entryPrice: decision.entry_price,
              beliefLow: state.belief.belief_low,
              beliefHigh: state.belief.belief_high,
              edge,
              sizeUsd: decision.size_usd,
            });
          }
          
          // Log and notify
          if (!this.simulationMode && result.order) {
            console.log(`✅ Real trade executed: Order ${result.order.id}`);
            await this.notifier.sendTradeExecuted(result.order, state.market);
          } else {
            console.log(`✅ Simulated trade logged`);
          }
        } else {
          console.error(`❌ Trade execution failed: ${result.error}`);
          await this.notifier.sendError(
            new Error(result.error ?? "Unknown execution error"),
            "Trade execution"
          );
        }
        
        // Transition through MONITOR back to OBSERVE for proper state flow
        this.stateMachine.transition("MONITOR", "Trade execution complete");
        this.stateMachine.transition("OBSERVE", "Ready for next cycle");
      }

    } else if ("eligible" in decision && !decision.eligible) {
      // Log evaluation result
      await this.auditLogger.logMarketEvaluated(
        state.market,
        state.belief,
        false,
        decision.reason
      );
      
      // Verbose logging in simulation mode
      if (process.env.VERBOSE === "true") {
        console.log(`⏸️ No trade for ${state.market.question}: ${decision.reason}`);
      }
      // Go back to OBSERVE from EVALUATE_TRADE (valid transition)
      if (this.stateMachine.getCurrentState() === "EVALUATE_TRADE") {
        this.stateMachine.transition("OBSERVE", "No trade - continuing observation");
      }
    }
  }

  /**
   * Get token ID for YES/NO outcome from market data
   */
  private getTokenIdForOutcome(_market: Market, _side: "YES" | "NO"): string | undefined {
    // This would need to be populated from the market data
    // For now, return undefined in simulation mode
    if (this.simulationMode) {
      return "simulated-token-id";
    }
    
    // In real mode, this should be fetched from market.tokens array
    // The PolymarketMarketResponse includes token_id in tokens array
    return undefined;
  }

  /**
   * Initialize belief state for a new market
   */
  private initializeBeliefState(): BeliefState {
    return {
      belief_low: 40,
      belief_high: 60,
      confidence: 50,
      unknowns: [],
      last_updated: new Date(),
    };
  }

  /**
   * Extract keywords from market question for signal matching
   */
  private extractKeywords(question: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = question.toLowerCase()
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return words;
  }

  /**
   * Calculate edge percentage for logging
   */
  private calculateEdge(decision: TradeDecision, belief: BeliefState): number {
    if (decision.side === "YES") {
      return belief.belief_low - decision.entry_price;
    } else if (decision.side === "NO") {
      return decision.entry_price - belief.belief_high;
    }
    return 0;
  }

  /**
   * Get current system status
   */
  getStatus(): {
    state: string;
    markets: number;
    halted: boolean;
    haltReason?: string;
  } {
    return {
      state: this.stateMachine.getCurrentState(),
      markets: this.marketStates.size,
      halted: this.stateMachine.isHalted(),
      haltReason: this.stateMachine.getHaltReason(),
    };
  }

  /**
   * Get all market states for dashboard
   */
  getMarketStates(): MarketState[] {
    return Array.from(this.marketStates.values());
  }

  /**
   * Schedule daily summary to be sent at midnight UTC
   */
  private scheduleDailySummary(): void {
    // Calculate ms until next midnight UTC
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Schedule first summary, then repeat every 24 hours
    setTimeout(() => {
      this.sendDailySummaryReport();
      setInterval(() => this.sendDailySummaryReport(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
    
    console.log(`📅 Daily summary scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
  }

  /**
   * Send daily summary report
   */
  private async sendDailySummaryReport(): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0] ?? now.toISOString();
    
    // Calculate uptime in hours
    const uptimeMs = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    
    // Get paper trading metrics if enabled
    let paperTradingMetrics: { totalTrades: number; winRate: number; totalPnl: number } | undefined;
    if (this.paperTradingEnabled) {
      const ptMetrics = this.paperTrading.calculateMetrics();
      paperTradingMetrics = {
        totalTrades: ptMetrics.totalPositions,
        winRate: ptMetrics.winRate / 100, // Convert percentage to decimal
        totalPnl: ptMetrics.totalPnL,
      };
    }
    
    const summary: DailySummary = {
      date: dateStr,
      totalPnl: 0, // TODO: Track actual P&L when real trading enabled
      tradesExecuted: this.dailyStats.tradesExecuted,
      tradeOpportunities: this.dailyStats.tradeOpportunities,
      openPositions: [], // TODO: Track positions when real trading enabled
      marketsMonitored: this.marketStates.size,
      // Enhanced fields
      uptimeHours,
      newsSignalsProcessed: this.dailyStats.newsSignalsProcessed,
      redditSignalsProcessed: this.dailyStats.redditSignalsProcessed,
      hackerNewsSignalsProcessed: this.dailyStats.hackerNewsSignalsProcessed,
      beliefUpdates: this.dailyStats.beliefUpdates,
      systemHealth: this.stateMachine.isHalted() ? "unhealthy" : "healthy",
      mode: this.simulationMode ? "Simulation" : "Live Trading",
      paperTradingMetrics,
    };
    
    // Log daily summary
    await this.auditLogger.logDailySummary({
      date: dateStr,
      totalMarkets: this.marketStates.size,
      opportunitiesFound: this.dailyStats.tradeOpportunities,
      tradesExecuted: this.dailyStats.tradesExecuted,
      positionsClosed: 0,
      totalPnL: 0,
      systemUptime: uptimeHours,
    });
    
    await this.notifier.sendDailySummary(summary);
    
    // Reset daily stats
    this.dailyStats = {
      tradeOpportunities: 0,
      tradesExecuted: 0,
      newsSignalsProcessed: 0,
      redditSignalsProcessed: 0,
      hackerNewsSignalsProcessed: 0,
      beliefUpdates: 0,
      lastReset: now,
    };
    
    console.log(`📊 Daily summary sent for ${dateStr}`);
  }

  /**
   * Send halt notification
   */
  async notifyHalt(reason: string): Promise<void> {
    await this.auditLogger.logSystemStop(reason);
    await this.notifier.sendSystemHalt(reason);
  }

  /**
   * Send error notification
   */
  async notifyError(error: Error, context?: string): Promise<void> {
    await this.auditLogger.logError(error, context);
    await this.notifier.sendError(error, context);
  }

  /**
   * Phase 7: Get performance metrics from trade history
   */
  async getPerformanceMetrics() {
    await this.tradeHistory.loadTradeHistory();
    const metrics = this.tradeHistory.calculatePerformanceMetrics();
    const patterns = this.tradeHistory.analyzePatterns();
    
    return {
      metrics,
      patterns,
      recentTrades: this.tradeHistory.getRecentTrades(30),
    };
  }

  /**
   * Phase 7: Get trade history
   */
  getTradeHistory() {
    return {
      trades: this.tradeHistory.getTradeRecords(),
      total: this.tradeHistory.getTradeRecords().length,
    };
  }

  /**
   * Phase 7: Get portfolio status
   */
  getPortfolioStatus() {
    return this.portfolioManager.getPortfolioStatus();
  }
  
  /**
   * Phase 11: Check for paper trading position resolutions
   */
  private async checkPaperTradingResolutions(): Promise<void> {
    if (!this.paperTradingEnabled || !this.simulationMode) {
      return;
    }
    
    try {
      const openPositions = this.paperTrading.getOpenPositions();
      
      if (openPositions.length === 0) {
        return;
      }
      
      console.log(`🔍 Checking ${openPositions.length} open paper positions for resolution...`);
      
      for (const position of openPositions) {
        try {
          // Fetch latest market data
          const market = await this.polymarket.getMarket(position.marketId);
          
          if (!market) {
            // Market no longer available - mark as expired
            await this.paperTrading.expirePosition(position.id);
            continue;
          }
          
          // Check if market has resolved
          if (market.resolved_at || market.resolution_outcome !== undefined) {
            // Market is resolved
            const actualOutcome: "YES" | "NO" = market.resolution_outcome === true ? "YES" : "NO";
            const exitPrice = actualOutcome === "YES" ? 100 : 0;
            
            await this.paperTrading.resolvePosition(
              position.id,
              actualOutcome,
              exitPrice
            );
            
            // Log resolution
            await this.auditLogger.logPaperTradeResolved(
              position.marketId,
              position.marketQuestion,
              position.side,
              actualOutcome,
              `${position.beliefLow}-${position.beliefHigh}`,
              position.edge,
              position.sizeUsd,
              position.pnl ?? 0
            );
          }
        } catch (error) {
          console.error(`Failed to check resolution for position ${position.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error checking paper trading resolutions:", error);
    }
  }
  
  /**
   * Phase 11: Get paper trading metrics
   */
  getPaperTradingMetrics() {
    if (!this.paperTradingEnabled) {
      return undefined;
    }
    return this.paperTrading.calculateMetrics();
  }
  
  /**
   * Phase 11: Get paper trading calibration
   */
  getPaperTradingCalibration() {
    if (!this.paperTradingEnabled) {
      return undefined;
    }
    return this.paperTrading.calculateCalibration();
  }
  
  /**
   * Phase 11: Get paper trading positions
   */
  getPaperTradingPositions() {
    if (!this.paperTradingEnabled) {
      return undefined;
    }
    return this.paperTrading.getAllPositions();
  }
}
