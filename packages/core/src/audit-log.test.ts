/**
 * Audit Logger Tests
 * 
 * Tests for the audit logging system
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuditLogger } from "./audit-log.js";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

describe("AuditLogger", () => {
  const testLogDir = "./test-audit-logs";
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger(testLogDir);
  });

  afterEach(async () => {
    // Clean up test logs
    if (existsSync(testLogDir)) {
      await rm(testLogDir, { recursive: true, force: true });
    }
  });

  it("should initialize and create log directory", async () => {
    await logger.initialize();
    expect(existsSync(testLogDir)).toBe(true);
  });

  it("should log system start event", async () => {
    await logger.initialize();
    await logger.logSystemStart(100, "SIMULATION");
    // Log should be created
    expect(existsSync(testLogDir)).toBe(true);
  });

  it("should log system stop event", async () => {
    await logger.initialize();
    await logger.logSystemStop("Manual shutdown");
    expect(existsSync(testLogDir)).toBe(true);
  });

  it("should log error event", async () => {
    await logger.initialize();
    const error = new Error("Test error");
    await logger.logError(error, "Test context");
    expect(existsSync(testLogDir)).toBe(true);
  });

  it("should get singleton instance", () => {
    const instance1 = AuditLogger.getInstance(testLogDir);
    const instance2 = AuditLogger.getInstance(testLogDir);
    expect(instance1).toBe(instance2);
  });
});
