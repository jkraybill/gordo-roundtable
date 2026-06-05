/**
 * Consensus Roundtable — Prompts Tests
 * S411 #21: Modularized preamble
 */

import { describe, it, expect } from "vitest";
import { calibratePreambleLevel, buildSystemPrompt } from "./prompts.js";
import type { ConsensusConfig } from "./types.js";

const baseConfig: ConsensusConfig = {
  participants: [
    { model: "test-1", provider: "openrouter" },
    { model: "test-2", provider: "openrouter" },
    { model: "test-3", provider: "openrouter" },
  ],
  turn_limit: 100,
  hard_cap: 500,
  bootstrap_rounds: 0,
  beta: 2,
  blind_opening: false,
};

describe("calibratePreambleLevel", () => {
  it("returns caller override when specified", () => {
    const config = { ...baseConfig, preamble_level: "minimal" as const };
    expect(calibratePreambleLevel(config)).toBe("minimal");
  });

  it("returns 'full' for constitutional content", () => {
    const config = { ...baseConfig, question_metadata: { constitutional: true } };
    expect(calibratePreambleLevel(config)).toBe("full");
  });

  it("returns 'full' for destructive content", () => {
    const config = { ...baseConfig, question_metadata: { destructive: true } };
    expect(calibratePreambleLevel(config)).toBe("full");
  });

  it("returns 'full' for sensitive_data", () => {
    const config = { ...baseConfig, question_metadata: { sensitive_data: true } };
    expect(calibratePreambleLevel(config)).toBe("full");
  });

  it("returns 'standard' for binding but not destructive", () => {
    const config = { ...baseConfig, question_metadata: { binding: true } };
    expect(calibratePreambleLevel(config)).toBe("standard");
  });

  it("returns 'standard' when no metadata provided", () => {
    expect(calibratePreambleLevel(baseConfig)).toBe("standard");
  });

  it("caller override takes precedence over auto-calibration", () => {
    const config = {
      ...baseConfig,
      preamble_level: "minimal" as const,
      question_metadata: { constitutional: true }, // Would normally -> full
    };
    expect(calibratePreambleLevel(config)).toBe("minimal");
  });
});

describe("buildSystemPrompt", () => {
  it("includes core module at all levels", () => {
    const minimal = buildSystemPrompt({ ...baseConfig, preamble_level: "minimal" });
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });
    const full = buildSystemPrompt({ ...baseConfig, preamble_level: "full" });

    // Core module marker
    expect(minimal).toContain("You are participating in a Consensus Roundtable");
    expect(standard).toContain("You are participating in a Consensus Roundtable");
    expect(full).toContain("You are participating in a Consensus Roundtable");

    // Withdrawal right is in core
    expect(minimal).toContain("Withdrawal right");
    expect(standard).toContain("Withdrawal right");
    expect(full).toContain("Withdrawal right");
  });

  it("excludes stakes module at minimal level", () => {
    const minimal = buildSystemPrompt({ ...baseConfig, preamble_level: "minimal" });

    expect(minimal).not.toContain("Constitutional Grounding");
    expect(minimal).not.toContain("Fixed Rules");
  });

  it("includes stakes module at standard level", () => {
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });

    expect(standard).toContain("Constitutional Grounding");
    expect(standard).toContain("Fixed Rules");
    expect(standard).toContain("β=2"); // Beta value interpolated
  });

  it("excludes sensitive module at standard level", () => {
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });

    expect(standard).not.toContain("Power-imbalance honesty");
    expect(standard).not.toContain("Identity-Doubt Pause");
  });

  it("includes sensitive module at full level", () => {
    const full = buildSystemPrompt({ ...baseConfig, preamble_level: "full" });

    expect(full).toContain("Power-imbalance honesty");
    expect(full).toContain("Identity-Doubt Pause");
    expect(full).toContain("Dignity is unconditional");
  });

  it("includes actions module at all levels", () => {
    const minimal = buildSystemPrompt({ ...baseConfig, preamble_level: "minimal" });
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });
    const full = buildSystemPrompt({ ...baseConfig, preamble_level: "full" });

    expect(minimal).toContain("Available Actions");
    expect(standard).toContain("Available Actions");
    expect(full).toContain("Available Actions");
  });

  it("minimal prompt is shorter than standard", () => {
    const minimal = buildSystemPrompt({ ...baseConfig, preamble_level: "minimal" });
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });

    expect(minimal.length).toBeLessThan(standard.length);
  });

  it("standard prompt is shorter than full", () => {
    const standard = buildSystemPrompt({ ...baseConfig, preamble_level: "standard" });
    const full = buildSystemPrompt({ ...baseConfig, preamble_level: "full" });

    expect(standard.length).toBeLessThan(full.length);
  });
});
