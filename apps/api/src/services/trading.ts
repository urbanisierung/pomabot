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
  private pollInterval = 60000; // 1 minute

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
    
    // Initial market load
    await this.loadMarkets();
    
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

      this.stateMachine.transition("OBSERVE", "Monitoring cycle started");

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
   */
  private async updateMarkets(): Promise<void> {
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

      // Process each new signal
      for (const signal of signals) {
        this.stateMachine.transition("INGEST_SIGNAL", `Processing ${signal.type} signal`);

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
          console.warn(`Signal rejected for ${marketId}:`, error);
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
    this.stateMachine.transition("EVALUATE_TRADE", "Checking trade eligibility");

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

      // In production mode, execute the trade
      // For now, just log it
      this.stateMachine.transition("EXECUTE_TRADE", "Trade approved");
      
      // const result = await this.execution.executeTrade(decision, state.market.id);
      // if (result.success) {
      //   console.log("✓ Order placed:", result.order?.id);
      // }

    } else if ("eligible" in decision && !decision.eligible) {
      console.log(`⏸️ No trade for ${state.market.question}: ${decision.reason}`);
    }

    this.stateMachine.transition("OBSERVE", "Trade evaluation complete");
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
