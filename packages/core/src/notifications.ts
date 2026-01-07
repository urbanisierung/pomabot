/**
 * Slack Notification Service
 * Phase 2 of ROADMAP.md
 *
 * Sends notifications to Slack for:
 * - Trade opportunities detected
 * - Trades executed
 * - Positions closed
 * - Daily summaries
 * - Error alerts
 */

import type { BeliefState, Market, TradeDecision } from "@pomabot/shared";
import type { Order } from "./execution.js";

// ============================================================================
// Types
// ============================================================================

export type NotificationEvent =
  | "trade_opportunity"
  | "trade_executed"
  | "position_closed"
  | "daily_summary"
  | "system_start"
  | "system_halt"
  | "error_alert";

export interface SlackNotificationConfig {
  webhookUrl: string;
  enabled: boolean;
  enabledEvents: NotificationEvent[];
  rateLimit: number; // Max messages per minute
}

export interface TradeOpportunity {
  market: Market;
  decision: TradeDecision;
  belief: BeliefState;
  edge: number;
}

export interface PositionSummary {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  entryPrice: number;
  currentPrice: number;
  size: number;
  unrealizedPnl: number;
}

export interface MissedOpportunity {
  marketQuestion: string;
  reason: string;
  beliefMidpoint: number;  // Our belief midpoint
  marketPrice: number;     // Current market price
  potentialEdge: number;   // |beliefMidpoint - marketPrice|
}

export interface DailySummary {
  date: string;
  totalPnl: number;
  tradesExecuted: number;
  tradeOpportunities: number;
  openPositions: PositionSummary[];
  marketsMonitored: number;
  // Extended fields for richer daily summary
  uptimeHours?: number;
  newsSignalsProcessed?: number;
  redditSignalsProcessed?: number;
  hackerNewsSignalsProcessed?: number;
  beliefUpdates?: number;
  systemHealth?: "healthy" | "degraded" | "unhealthy";
  mode?: string;
  paperTradingMetrics?: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
  };
  // Top missed opportunities (threshold not reached)
  missedOpportunities?: MissedOpportunity[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

// ============================================================================
// SlackNotifier Class
// ============================================================================

export class SlackNotifier {
  private config: SlackNotificationConfig;
  private messageCount = 0;
  private lastMinuteReset = Date.now();

  constructor(config?: Partial<SlackNotificationConfig>) {
    this.config = {
      webhookUrl: config?.webhookUrl ?? process.env.SLACK_WEBHOOK_URL ?? "",
      enabled: config?.enabled ?? !!process.env.SLACK_WEBHOOK_URL,
      enabledEvents: config?.enabledEvents ?? [
        "trade_opportunity",
        "trade_executed",
        "position_closed",
        "daily_summary",
        "system_start",
        "system_halt",
        "error_alert",
      ],
      rateLimit: config?.rateLimit ?? 10, // 10 messages per minute
    };
  }

  /**
   * Check if notifications are enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.webhookUrl;
  }

  /**
   * Check if a specific event type is enabled
   */
  private isEventEnabled(event: NotificationEvent): boolean {
    return this.isEnabled() && this.config.enabledEvents.includes(event);
  }

  /**
   * Rate limiting - returns true if we can send
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    // Reset counter every minute
    if (now - this.lastMinuteReset > 60_000) {
      this.messageCount = 0;
      this.lastMinuteReset = now;
    }

    if (this.messageCount >= this.config.rateLimit) {
      console.warn("⚠️ Slack rate limit reached, skipping notification");
      return false;
    }

    this.messageCount++;
    return true;
  }

  /**
   * Send a message to Slack (public for external use)
   */
  async sendMessage(blocks: SlackBlock[], text: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    if (!this.checkRateLimit()) {
      return;
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text, // Fallback text for notifications
          blocks,
        }),
      });

      if (!response.ok) {
        console.error(`Slack webhook error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send Slack notification:", error);
    }
  }

  // ==========================================================================
  // Notification Methods
  // ==========================================================================

  /**
   * Send notification for a new trade opportunity
   */
  async sendTradeOpportunity(opportunity: TradeOpportunity): Promise<void> {
    if (!this.isEventEnabled("trade_opportunity")) return;

    const { market, decision, belief, edge } = opportunity;
    const emoji = decision.side === "YES" ? "📈" : "📉";

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Trade Opportunity: ${decision.side}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${market.question}*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Side:*\n${decision.side}` },
          { type: "mrkdwn", text: `*Edge:*\n${edge.toFixed(1)}%` },
          { type: "mrkdwn", text: `*Entry Price:*\n${decision.entry_price}%` },
          { type: "mrkdwn", text: `*Size:*\n$${decision.size_usd}` },
          { type: "mrkdwn", text: `*Belief Range:*\n${belief.belief_low}-${belief.belief_high}%` },
          { type: "mrkdwn", text: `*Confidence:*\n${belief.confidence}%` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Rationale:* ${decision.rationale}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Category: ${market.category} | Liquidity: $${market.liquidity.toLocaleString()}`,
          },
        ],
      },
    ];

    await this.sendMessage(blocks, `Trade Opportunity: ${decision.side} on ${market.question}`);
  }

  /**
   * Send notification when a trade is executed
   */
  async sendTradeExecuted(order: Order, market: Market): Promise<void> {
    if (!this.isEventEnabled("trade_executed")) return;

    const emoji = order.side === "YES" ? "✅" : "🔴";

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Trade Executed`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${market.question}*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Side:*\n${order.side}` },
          { type: "mrkdwn", text: `*Size:*\n$${order.size_usd}` },
          { type: "mrkdwn", text: `*Limit Price:*\n${order.limit_price}%` },
          { type: "mrkdwn", text: `*Status:*\n${order.status}` },
          { type: "mrkdwn", text: `*Order ID:*\n\`${order.id}\`` },
          { type: "mrkdwn", text: `*Filled:*\n$${order.filled_size}` },
        ],
      },
    ];

    await this.sendMessage(blocks, `Trade Executed: ${order.side} $${order.size_usd} on ${market.question}`);
  }

  /**
   * Send notification when a position is closed
   */
  async sendPositionClosed(
    order: Order,
    market: Market,
    pnl: number,
    reason: string
  ): Promise<void> {
    if (!this.isEventEnabled("position_closed")) return;

    const emoji = pnl >= 0 ? "💰" : "💸";
    const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Position Closed: ${pnlText}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${market.question}*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Side:*\n${order.side}` },
          { type: "mrkdwn", text: `*P&L:*\n${pnlText}` },
          { type: "mrkdwn", text: `*Entry:*\n${order.limit_price}%` },
          { type: "mrkdwn", text: `*Exit:*\n${market.current_price}%` },
          { type: "mrkdwn", text: `*Size:*\n$${order.size_usd}` },
          { type: "mrkdwn", text: `*Reason:*\n${reason}` },
        ],
      },
    ];

    await this.sendMessage(blocks, `Position Closed: ${pnlText} on ${market.question}`);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(summary: DailySummary): Promise<void> {
    if (!this.isEventEnabled("daily_summary")) return;

    const pnlEmoji = summary.totalPnl >= 0 ? "📈" : "📉";
    const pnlText = summary.totalPnl >= 0
      ? `+$${summary.totalPnl.toFixed(2)}`
      : `-$${Math.abs(summary.totalPnl).toFixed(2)}`;

    const positionsList = summary.openPositions.length > 0
      ? summary.openPositions
          .map(p => `• ${p.side} ${p.question.slice(0, 50)}... (${p.unrealizedPnl >= 0 ? "+" : ""}$${p.unrealizedPnl.toFixed(2)})`)
          .join("\n")
      : "No open positions";

    // Build signals summary
    const signalsSummary: string[] = [];
    if (summary.newsSignalsProcessed !== undefined) {
      signalsSummary.push(`📰 News: ${summary.newsSignalsProcessed}`);
    }
    if (summary.redditSignalsProcessed !== undefined) {
      signalsSummary.push(`🔴 Reddit: ${summary.redditSignalsProcessed}`);
    }
    if (summary.hackerNewsSignalsProcessed !== undefined) {
      signalsSummary.push(`🟠 HN: ${summary.hackerNewsSignalsProcessed}`);
    }
    const signalsText = signalsSummary.length > 0 
      ? signalsSummary.join(" | ") 
      : "No signals processed";

    // Health status
    const healthEmoji = summary.systemHealth === "healthy" ? "✅" : 
                        summary.systemHealth === "degraded" ? "⚠️" : 
                        summary.systemHealth === "unhealthy" ? "❌" : "ℹ️";
    const healthText = summary.systemHealth ?? "unknown";

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 Daily Summary - ${summary.date}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Total P&L:*\n${pnlEmoji} ${pnlText}` },
          { type: "mrkdwn", text: `*Trades Executed:*\n${summary.tradesExecuted}` },
          { type: "mrkdwn", text: `*Opportunities Found:*\n${summary.tradeOpportunities}` },
          { type: "mrkdwn", text: `*Markets Monitored:*\n${summary.marketsMonitored}` },
        ],
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*System Health:*\n${healthEmoji} ${healthText}` },
          { type: "mrkdwn", text: `*Mode:*\n${summary.mode ?? "Unknown"}` },
          { type: "mrkdwn", text: `*Uptime:*\n${summary.uptimeHours !== undefined ? `${summary.uptimeHours.toFixed(1)}h` : "N/A"}` },
          { type: "mrkdwn", text: `*Belief Updates:*\n${summary.beliefUpdates ?? 0}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Signals Processed:*\n${signalsText}`,
        },
      },
    ];

    // Add paper trading section if available
    if (summary.paperTradingMetrics) {
      const ptm = summary.paperTradingMetrics;
      blocks.push({
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Paper Trading Trades:*\n${ptm.totalTrades}` },
          { type: "mrkdwn", text: `*Paper Win Rate:*\n${(ptm.winRate * 100).toFixed(1)}%` },
          { type: "mrkdwn", text: `*Paper P&L:*\n${ptm.totalPnl >= 0 ? "+" : ""}$${ptm.totalPnl.toFixed(2)}` },
        ],
      });
    }

    // Add missed opportunities section if available
    if (summary.missedOpportunities && summary.missedOpportunities.length > 0) {
      const missedList = summary.missedOpportunities
        .map((m, i) => `${i + 1}. _${m.marketQuestion.slice(0, 60)}${m.marketQuestion.length > 60 ? "..." : ""}_\n   Edge: ${m.potentialEdge.toFixed(1)}% | Belief: ${m.beliefMidpoint.toFixed(0)}% vs Market: ${m.marketPrice.toFixed(0)}%\n   ❌ ${m.reason}`)
        .join("\n\n");
      
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎯 Top ${summary.missedOpportunities.length} Near-Miss Opportunities:*\n${missedList}`,
        },
      });
    }

    // Add positions section
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Open Positions (${summary.openPositions.length}):*\n${positionsList}`,
      },
    });

    await this.sendMessage(blocks, `Daily Summary: ${pnlText} P&L, ${summary.tradesExecuted} trades, ${summary.marketsMonitored} markets monitored`);
  }

  /**
   * Send system startup notification
   */
  async sendSystemStart(marketsCount: number, mode: string): Promise<void> {
    if (!this.isEventEnabled("system_start")) return;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚀 PomaBot Started",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Mode:*\n${mode}` },
          { type: "mrkdwn", text: `*Markets:*\n${marketsCount}` },
          { type: "mrkdwn", text: `*Started:*\n${new Date().toISOString()}` },
        ],
      },
    ];

    await this.sendMessage(blocks, `PomaBot started in ${mode} mode with ${marketsCount} markets`);
  }

  /**
   * Send system halt notification
   */
  async sendSystemHalt(reason: string): Promise<void> {
    if (!this.isEventEnabled("system_halt")) return;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🛑 PomaBot Halted",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reason:* ${reason}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Halted at: ${new Date().toISOString()}`,
          },
        ],
      },
    ];

    await this.sendMessage(blocks, `PomaBot Halted: ${reason}`);
  }

  /**
   * Send error alert
   */
  async sendError(error: Error, context?: string): Promise<void> {
    if (!this.isEventEnabled("error_alert")) return;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "❌ Error Alert",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:* ${error.message}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`${error.stack?.slice(0, 500) ?? "No stack trace"}\`\`\``,
        },
      },
    ];

    if (context) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Context: ${context}`,
          },
        ],
      });
    }

    await this.sendMessage(blocks, `Error: ${error.message}`);
  }
}

// ============================================================================
// Singleton instance for easy import
// ============================================================================

let _notifier: SlackNotifier | undefined;

export function getNotifier(): SlackNotifier {
  if (!_notifier) {
    _notifier = new SlackNotifier();
  }
  return _notifier;
}

export function initNotifier(config?: Partial<SlackNotificationConfig>): SlackNotifier {
  _notifier = new SlackNotifier(config);
  return _notifier;
}
