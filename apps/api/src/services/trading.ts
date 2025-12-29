/**
 * Trading Service
 * 
 * Main orchestration service that:
 * - Monitors Polymarket markets
 * - Aggregates news and signals
 * - Updates beliefs
 * - Evaluates trades
 * - Executes orders
 */

import {
  performBeliefUpdate,
  evaluateTrade,
  StateMachine,
  // CalibrationSystem,
  // ExecutionLayer,
} from "@pomabot/core";
import type { BeliefState, Signal, Market, TradeDecision } from "@pomabot/shared";
import { PolymarketConnector } from "../connectors/polymarket.js";
import { NewsAggregator } from "../connectors/news.js";

export interface MarketState {
  market: Market;
  belief: BeliefState;
  signalHistory: Signal[];
  lastChecked: Date;
}

export class TradingService {
  private polymarket: PolymarketConnector;
  private news: NewsAggregator;
  // private polling: PollingAggregator;
  private stateMachine: StateMachine;
  // private calibration: CalibrationSystem;
  // private execution: ExecutionLayer;
  
  private marketStates: Map<string, MarketState> = new Map();
  private pollInterval = parseInt(process.env.POLL_INTERVAL ?? "60000", 10); // Default 60s, configurable

  constructor(apiKey?: string) {
    this.polymarket = new PolymarketConnector(apiKey);
    this.news = new NewsAggregator();
    // this.polling = new PollingAggregator();
    this.stateMachine = new StateMachine();
    // this.calibration = new CalibrationSystem();
    // this.execution = new ExecutionLayer();
  }

  /**
   * Start the trading service
   */
  async start(): Promise<void> {
    console.log("🚀 Starting Polymarket trading service...");
    console.log(`   Poll interval: ${this.pollInterval / 1000}s`);
    console.log(`   Mode: ${process.env.POLYMARKET_API_KEY ? "LIVE" : "SIMULATION (read-only)"}`);
    console.log(`   Verbose: ${process.env.VERBOSE === "true" ? "ON" : "OFF"}`);
    
    // Initial market load
    await this.loadMarkets();
    
    // Run first monitoring cycle immediately
    await this.monitorLoop();
    
    // Start monitoring loop
    setInterval(() => this.monitorLoop(), this.pollInterval);
    
    console.log("✅ Trading service running");
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

    } catch (error) {
      console.error("Error in monitoring loop:", error);
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
      const signals = await this.news.generateSignals(news, keywords);

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
      console.log(`💡 Trade opportunity: ${decision.side} on ${state.market.question}`);
      console.log(`   Entry: ${decision.entry_price}%`);
      console.log(`   Edge: ${this.calculateEdge(decision, state.belief)}%`);
      console.log(`   Rationale: ${decision.rationale}`);

      // In simulation mode, just log it
      if (this.stateMachine.getCurrentState() === "EVALUATE_TRADE") {
        this.stateMachine.transition("EXECUTE_TRADE", "[SIMULATION] Trade would be executed");
        // Transition through MONITOR back to OBSERVE for proper state flow
        this.stateMachine.transition("MONITOR", "Simulated trade complete");
        this.stateMachine.transition("OBSERVE", "Ready for next cycle");
      }

    } else if ("eligible" in decision && !decision.eligible) {
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
}
