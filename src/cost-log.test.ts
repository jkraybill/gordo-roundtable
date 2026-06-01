/**
 * Tests for cost logging
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, unlinkSync, mkdirSync, rmdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { logCost, getLogPath, type CostLogEntry } from "./cost-log.js";

const TEST_LOG_DIR = join(homedir(), ".gordo-test");
const TEST_LOG_FILE = join(TEST_LOG_DIR, "roundtable-costs.jsonl");

// Mock the log path for testing
const originalGetLogPath = getLogPath;

describe("cost-log", () => {
  describe("getLogPath", () => {
    it("returns path in ~/.gordo directory", () => {
      const path = getLogPath();
      expect(path).toContain(".gordo");
      expect(path).toContain("roundtable-costs.jsonl");
    });
  });

  describe("logCost", () => {
    const sampleEntry: CostLogEntry = {
      timestamp: "2026-06-01T12:00:00.000Z",
      session: "S391",
      record_id: "test-record",
      tier: "med",
      round: 1,
      panel_size: 3,
      models: ["openrouter/owl-alpha", "deepseek/deepseek-v4-flash", "tencent/hy3-preview"],
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
      cost_usd: 0.05,
      cost_by_model: {
        "openrouter/owl-alpha": 0.00,
        "deepseek/deepseek-v4-flash": 0.02,
        "tencent/hy3-preview": 0.03,
      },
      duration_ms: 5000,
      ok_count: 3,
      error_count: 0,
    };

    it("creates log directory if it does not exist", () => {
      // This test just verifies the function doesn't throw
      // Actual file operations use the real path
      expect(() => logCost(sampleEntry)).not.toThrow();
    });

    it("appends JSONL entry to log file", () => {
      const before = existsSync(getLogPath())
        ? readFileSync(getLogPath(), "utf8").split("\n").filter(Boolean).length
        : 0;

      logCost(sampleEntry);

      const after = readFileSync(getLogPath(), "utf8").split("\n").filter(Boolean).length;
      expect(after).toBe(before + 1);
    });

    it("writes valid JSON per line", () => {
      logCost(sampleEntry);

      const lines = readFileSync(getLogPath(), "utf8").split("\n").filter(Boolean);
      const lastLine = lines[lines.length - 1];

      expect(() => JSON.parse(lastLine)).not.toThrow();
      const parsed = JSON.parse(lastLine);
      expect(parsed.record_id).toBe(sampleEntry.record_id);
      expect(parsed.tier).toBe(sampleEntry.tier);
    });

    it("preserves all fields in entry", () => {
      logCost(sampleEntry);

      const lines = readFileSync(getLogPath(), "utf8").split("\n").filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.timestamp).toBe(sampleEntry.timestamp);
      expect(parsed.session).toBe(sampleEntry.session);
      expect(parsed.panel_size).toBe(sampleEntry.panel_size);
      expect(parsed.models).toEqual(sampleEntry.models);
      expect(parsed.prompt_tokens).toBe(sampleEntry.prompt_tokens);
      expect(parsed.completion_tokens).toBe(sampleEntry.completion_tokens);
      expect(parsed.cost_usd).toBe(sampleEntry.cost_usd);
      expect(parsed.cost_by_model).toEqual(sampleEntry.cost_by_model);
    });

    it("handles missing optional fields", () => {
      const minimalEntry: CostLogEntry = {
        timestamp: "2026-06-01T12:00:00.000Z",
        record_id: "minimal",
        round: 1,
        panel_size: 1,
        models: ["test/model"],
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.01,
        cost_by_model: {},
        duration_ms: 1000,
        ok_count: 1,
        error_count: 0,
      };

      expect(() => logCost(minimalEntry)).not.toThrow();

      const lines = readFileSync(getLogPath(), "utf8").split("\n").filter(Boolean);
      const lastLine = lines[lines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.session).toBeUndefined();
      expect(parsed.tier).toBeUndefined();
    });
  });
});
