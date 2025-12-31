/**
 * Batch Trading Service for Phase 9: Parallel Market Testing
 * 
 * Orchestrates batch processing of thousands of markets with
 * the trading service's existing infrastructure.
 */

import {
  BatchProcessor,
  type BatchProcessorConfig,
  type PositiveOutcomeConfig,
  type BatchResult,
  type MarketEvaluation,
} from "@pomabot/core";
import type { Market, Signal } from "@pomabot/shared";
import { NewsAggregator } from "../connectors/news.js";

export interface BatchTradingConfig {
  batchProcessor: Partial<BatchProcessorConfig>;
  positiveOutcome: Partial<PositiveOutcomeConfig>;
  enableNews: boolean;
}

/**
 * BatchTradingService extends TradingService functionality
 * with parallel market evaluation capabilities
 */
export class BatchTradingService {
  private batchProcessor: BatchProcessor;
  private newsAggregator: NewsAggregator;
  private config: BatchTradingConfig;

  constructor(config: Partial<BatchTradingConfig> = {}) {
    this.config = {
      batchProcessor: config.batchProcessor || {},
      positiveOutcome: config.positiveOutcome || {},
      enableNews: config.enableNews ?? true,
    };

    this.batchProcessor = new BatchProcessor(
      this.config.batchProcessor,
      this.config.positiveOutcome
    );

    this.newsAggregator = new NewsAggregator();
  }

  /**
   * Evaluate thousands of markets in parallel
   * Returns all evaluations with performance metrics
   */
  async evaluateMarketsBatch(markets: Market[]): Promise<BatchResult> {
    console.log(`🔄 Starting batch evaluation of ${markets.length} markets...`);

    const signalGenerator = async (market: Market): Promise<Signal[]> => {
      const signals: Signal[] = [];

      // Extract keywords from market question for signal generation
      const keywords = this.extractKeywords(market.question);

      // Fetch news signals if enabled
      if (this.config.enableNews) {
        try {
          const newsItems = await this.newsAggregator.fetchNews(market.category);
          const newsSignals = await this.newsAggregator.generateSignals(newsItems, keywords);
          signals.push(...newsSignals);
        } catch (error) {
          console.error(`Failed to fetch news signals for ${market.id}:`, error);
        }
      }

      return signals;
    };

    const result = await this.batchProcessor.evaluateMarkets(markets, signalGenerator);

    console.log(`✅ Batch evaluation complete:`);
    console.log(`   - Markets processed: ${result.metrics.marketsProcessed}`);
    console.log(`   - Processing time: ${result.metrics.processingTimeMs}ms`);
    console.log(`   - Throughput: ${result.metrics.throughput.toFixed(2)} markets/second`);
    console.log(`   - Success rate: ${result.metrics.successRate.toFixed(2)}%`);
    console.log(`   - Opportunities found: ${result.metrics.opportunitiesFound}`);
    console.log(`   - Errors: ${result.metrics.errorsEncountered}`);

    return result;
  }

  /**
   * Filter evaluations for positive outcome and execute trades
   * Returns selected positions that meet risk criteria
   */
  async selectAndExecuteTrades(
    evaluations: MarketEvaluation[],
    portfolioValue: number,
    existingPositions: Array<{ marketId: string; category: string; riskAmount: number }>
  ): Promise<MarketEvaluation[]> {
    console.log(`🎯 Filtering ${evaluations.length} evaluations for positive outcome...`);

    const selected = this.batchProcessor.filterForPositiveOutcome(
      evaluations,
      portfolioValue,
      existingPositions
    );

    console.log(`✅ Selected ${selected.length} positions that meet risk criteria:`);
    
    for (const evaluation of selected) {
      console.log(`   - ${evaluation.market.question.substring(0, 60)}...`);
      console.log(`     Category: ${evaluation.market.category}, Edge: ${evaluation.edge.toFixed(2)}%`);
      console.log(`     Side: ${evaluation.decision.side}, Size: $${evaluation.decision.size_usd}`);
    }

    // Note: Actual trade execution would be handled by TradingService
    // This method focuses on selection and filtering
    return selected;
  }

  /**
   * Run a complete batch trading cycle:
   * 1. Fetch markets
   * 2. Evaluate in parallel
   * 3. Filter for positive outcome
   * 4. Return selected positions
   */
  async runBatchCycle(
    markets: Market[],
    portfolioValue: number,
    existingPositions: Array<{ marketId: string; category: string; riskAmount: number }> = []
  ): Promise<{
    result: BatchResult;
    selectedPositions: MarketEvaluation[];
  }> {
    // Step 1: Evaluate all markets in parallel
    const result = await this.evaluateMarketsBatch(markets);

    // Step 2: Filter for positive outcome
    const selectedPositions = await this.selectAndExecuteTrades(
      result.evaluations,
      portfolioValue,
      existingPositions
    );

    return {
      result,
      selectedPositions,
    };
  }

  /**
   * Extract keywords from market question for signal matching
   */
  private extractKeywords(question: string): string[] {
    // Simple keyword extraction - split on spaces and filter common words
    const commonWords = new Set([
      "will", "be", "the", "a", "an", "is", "are", "was", "were",
      "in", "on", "at", "to", "for", "of", "by", "with", "from",
      "or", "and", "but", "if", "then", "than", "that", "this",
    ]);

    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Get batch processor configuration
   */
  getBatchConfig(): BatchProcessorConfig {
    return this.batchProcessor.getConfig();
  }

  /**
   * Get positive outcome configuration
   */
  getPositiveOutcomeConfig(): PositiveOutcomeConfig {
    return this.batchProcessor.getPositiveOutcomeConfig();
  }
}
