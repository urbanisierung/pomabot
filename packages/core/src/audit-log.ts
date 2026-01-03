/**
 * Audit Logging System
 * 
 * Implements persistent CSV audit logs for all system events.
 * Logs are committed to Git for historical tracking.
 */

import { writeFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Market, BeliefState, TradeDecision } from "@pomabot/shared";

export type AuditEventType =
  | "SYSTEM_START"
  | "SYSTEM_STOP"
  | "MARKET_EVALUATED"
  | "TRADE_OPPORTUNITY"
  | "TRADE_EXECUTED"
  | "POSITION_CLOSED"
  | "PAPER_TRADE_RESOLVED"
  | "ERROR"
  | "DAILY_SUMMARY";

export interface AuditEntry {
  timestamp: string; // ISO 8601
  event: AuditEventType;
  marketId?: string;
  marketQuestion?: string;
  action?: string;
  details?: string;
  belief?: number;
  edge?: number;
  amount?: number;
  pnl?: number;
}

export interface AuditDailySummary {
  date: string;
  totalMarkets: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  positionsClosed: number;
  totalPnL?: number;
  systemUptime: number; // hours
}

/**
 * AuditLogger - CSV-based audit logging with Git persistence
 * 
 * Features:
 * - Append-only CSV logging
 * - Daily log files
 * - Git-based persistence
 * - Optional external logging integration
 */
export class AuditLogger {
  private logDir: string;
  private currentLogFile: string;
  private currentDate: string;
  private externalLogEnabled: boolean;
  private logtailToken?: string;

  constructor(logDir: string = "/app/audit-logs") {
    this.logDir = logDir;
    this.currentDate = this.getDateString();
    this.currentLogFile = this.getLogFilePath();
    this.logtailToken = process.env.LOGTAIL_TOKEN;
    this.externalLogEnabled = !!this.logtailToken;
  }

  /**
   * Initialize the audit logger
   * Creates log directory and CSV header if needed
   */
  async initialize(): Promise<void> {
    // Create log directory if it doesn't exist
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
    }

    // Create CSV file with header if it doesn't exist
    if (!existsSync(this.currentLogFile)) {
      const header =
        "timestamp,event,marketId,marketQuestion,action,details,belief,edge,amount,pnl\n";
      await writeFile(this.currentLogFile, header, "utf-8");
    }
  }

  /**
   * Log system start event
   */
  async logSystemStart(marketsCount: number, mode: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "SYSTEM_START",
      details: `Started in ${mode} mode with ${marketsCount} markets`,
    });
  }

  /**
   * Log system stop event
   */
  async logSystemStop(reason: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "SYSTEM_STOP",
      details: reason,
    });
  }

  /**
   * Log market evaluation
   */
  async logMarketEvaluated(
    market: Market,
    belief: BeliefState,
    passed: boolean,
    failedCheck?: string,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "MARKET_EVALUATED",
      marketId: market.id,
      marketQuestion: market.question,
      action: passed ? "PASSED" : "FAILED",
      details: failedCheck ?? "All checks passed",
      belief: (belief.belief_low + belief.belief_high) / 2,
    });
  }

  /**
   * Log trade opportunity detection
   */
  async logTradeOpportunity(
    market: Market,
    belief: BeliefState,
    edge: number,
    rationale: string,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "TRADE_OPPORTUNITY",
      marketId: market.id,
      marketQuestion: market.question,
      details: rationale,
      belief: (belief.belief_low + belief.belief_high) / 2,
      edge: edge,
    });
  }

  /**
   * Log trade execution
   */
  async logTradeExecuted(
    market: Market,
    decision: TradeDecision,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "TRADE_EXECUTED",
      marketId: market.id,
      marketQuestion: market.question,
      action: decision.side,
      details: decision.rationale,
      amount: decision.size_usd,
    });
  }

  /**
   * Log position close
   */
  async logPositionClosed(
    market: Market,
    pnl: number,
    reason: string,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "POSITION_CLOSED",
      marketId: market.id,
      marketQuestion: market.question,
      details: reason,
      pnl: pnl,
    });
  }

  /**
   * Log error
   */
  async logError(error: Error, context?: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "ERROR",
      details: `${context ?? "Error"}: ${error.message}`,
    });
  }

  /**
   * Log daily summary
   */
  async logDailySummary(summary: AuditDailySummary): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "DAILY_SUMMARY",
      details: JSON.stringify(summary),
    });
  }

  /**
   * Log paper trade resolution
   */
  async logPaperTradeResolved(
    marketId: string,
    marketQuestion: string,
    side: string,
    outcome: string,
    beliefRange: string,
    edge: number,
    sizeUsd: number,
    pnl: number,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: "PAPER_TRADE_RESOLVED",
      marketId: marketId,
      marketQuestion: marketQuestion,
      action: side,
      details: `Resolved: ${outcome}. Belief: ${beliefRange}`,
      edge: edge,
      amount: sizeUsd,
      pnl: pnl,
    });
  }

  /**
   * Internal log method - writes to CSV and optionally ships to external service
   */
  private async log(entry: AuditEntry): Promise<void> {
    // Check if we need to rotate log file (new day)
    const currentDate = this.getDateString();
    if (currentDate !== this.currentDate) {
      this.currentDate = currentDate;
      this.currentLogFile = this.getLogFilePath();
      await this.initialize(); // Create new file with header
    }

    // Format CSV row
    const row = this.formatCsvRow(entry);

    // Append to CSV file
    try {
      await appendFile(this.currentLogFile, row, "utf-8");
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }

    // Ship to external logging service if enabled
    if (this.externalLogEnabled) {
      await this.shipToLogtail(entry);
    }
  }

  /**
   * Format entry as CSV row
   */
  private formatCsvRow(entry: AuditEntry): string {
    const escapeCsv = (value: string | undefined): string => {
      if (!value) return "";
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    return [
      entry.timestamp,
      entry.event,
      entry.marketId ?? "",
      escapeCsv(entry.marketQuestion),
      entry.action ?? "",
      escapeCsv(entry.details),
      entry.belief?.toFixed(2) ?? "",
      entry.edge?.toFixed(2) ?? "",
      entry.amount?.toFixed(2) ?? "",
      entry.pnl?.toFixed(2) ?? "",
    ].join(",") + "\n";
  }

  /**
   * Ship log entry to Logtail (Better Stack)
   */
  private async shipToLogtail(entry: AuditEntry): Promise<void> {
    if (!this.logtailToken) return;

    try {
      const response = await fetch("https://in.logtail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.logtailToken}`,
        },
        body: JSON.stringify({
          dt: entry.timestamp,
          level: entry.event === "ERROR" ? "error" : "info",
          message: entry.details ?? entry.event,
          ...entry,
        }),
      });

      if (!response.ok) {
        console.error("Failed to ship log to Logtail:", response.statusText);
      }
    } catch (error) {
      // Silently fail - external logging is optional
      console.error("Error shipping to Logtail:", error);
    }
  }

  /**
   * Get current date string (YYYY-MM-DD)
   */
  private getDateString(): string {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    if (!dateStr) {
      throw new Error("Failed to extract date from ISO string");
    }
    return dateStr;
  }

  /**
   * Get log file path for current date
   */
  private getLogFilePath(): string {
    return join(this.logDir, `audit-${this.currentDate}.csv`);
  }

  /**
   * Get singleton instance
   */
  private static instance: AuditLogger | undefined;

  static getInstance(logDir?: string): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(logDir);
    }
    return AuditLogger.instance;
  }
}
