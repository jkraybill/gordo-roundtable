/**
 * Tests for tier-based panel composition
 */

import { describe, it, expect } from "vitest";
import { composeTier, tierDescription, ALL_TIERS, type TierName } from "./tiers.js";

describe("composeTier", () => {
  describe("tier sm", () => {
    it("returns exactly 3 deterministic cheap models", () => {
      const tier = composeTier("sm");
      expect(tier.reviewers).toHaveLength(3);
      expect(tier.reviewers.map(r => r.id).sort()).toEqual([
        "deepseek-v4-flash",
        "owl-alpha",
        "tencent-hy3",
      ]);
    });

    it("is deterministic across calls", () => {
      const tier1 = composeTier("sm");
      const tier2 = composeTier("sm");
      expect(tier1.reviewers.map(r => r.id).sort())
        .toEqual(tier2.reviewers.map(r => r.id).sort());
    });

    it("uses low max_tokens for fast responses", () => {
      const tier = composeTier("sm");
      for (const r of tier.reviewers) {
        expect(r.max_tokens).toBe(2000);
      }
    });
  });

  describe("tier med", () => {
    it("returns exactly 3 models from List B", () => {
      const tier = composeTier("med");
      expect(tier.reviewers).toHaveLength(3);
    });

    it("randomizes selection across calls", () => {
      const selections = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const tier = composeTier("med");
        selections.add(tier.reviewers.map(r => r.id).sort().join(","));
      }
      // With 7 models choose 3, expect some variance
      expect(selections.size).toBeGreaterThan(1);
    });

    it("all reviewers are BC:high (from List B)", () => {
      const tier = composeTier("med");
      const listBIds = [
        "owl-alpha", "claude-haiku-4.5", "deepseek-v4-flash",
        "deepseek-v4-pro", "tencent-hy3", "gpt-5", "gemini-2.5-pro",
      ];
      for (const r of tier.reviewers) {
        expect(listBIds).toContain(r.id);
      }
    });
  });

  describe("tier lg", () => {
    it("returns 5 models: 2 from List A + 3 from List B", () => {
      const tier = composeTier("lg");
      expect(tier.reviewers).toHaveLength(5);
    });

    it("includes at least 2 List A models", () => {
      const listAIds = ["claude-opus-4.8", "claude-opus-4.7", "claude-sonnet-4.6"];
      const tier = composeTier("lg");
      const listACount = tier.reviewers.filter(r => listAIds.includes(r.id)).length;
      expect(listACount).toBe(2);
    });

    it("List A models have reasoning_effort: high", () => {
      const listAIds = ["claude-opus-4.8", "claude-opus-4.7", "claude-sonnet-4.6"];
      const tier = composeTier("lg");
      for (const r of tier.reviewers) {
        if (listAIds.includes(r.id)) {
          expect(r.reasoning_effort).toBe("high");
        }
      }
    });

    it("does not duplicate models between List A and List B picks", () => {
      for (let i = 0; i < 20; i++) {
        const tier = composeTier("lg");
        const ids = tier.reviewers.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });
  });

  describe("tier xl", () => {
    it("returns 5 models: 2 from List A + 3 frontier-weighted from List B", () => {
      const tier = composeTier("xl");
      expect(tier.reviewers).toHaveLength(5);
    });

    it("frontier models (gpt-5, gemini-2.5-pro) appear more frequently", () => {
      const frontierCounts: Record<string, number> = { "gpt-5": 0, "gemini-2.5-pro": 0 };
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const tier = composeTier("xl");
        for (const r of tier.reviewers) {
          if (r.id in frontierCounts) frontierCounts[r.id]++;
        }
      }
      // With 2x weighting, frontier models should appear > 30% of trials
      expect(frontierCounts["gpt-5"] / trials).toBeGreaterThan(0.3);
      expect(frontierCounts["gemini-2.5-pro"] / trials).toBeGreaterThan(0.3);
    });

    it("all reviewers have reasoning_effort: high", () => {
      const tier = composeTier("xl");
      for (const r of tier.reviewers) {
        expect(r.reasoning_effort).toBe("high");
      }
    });
  });

  describe("tier max", () => {
    it("returns 6 models: all 3 from List A + 3 deterministic from List B", () => {
      const tier = composeTier("max");
      expect(tier.reviewers).toHaveLength(6);
    });

    it("includes all List A models", () => {
      const tier = composeTier("max");
      const listAIds = ["claude-opus-4.8", "claude-opus-4.7", "claude-sonnet-4.6"];
      for (const id of listAIds) {
        expect(tier.reviewers.map(r => r.id)).toContain(id);
      }
    });

    it("includes deterministic List B picks", () => {
      const tier = composeTier("max");
      const expected = ["owl-alpha", "deepseek-v4-pro", "gemini-2.5-pro"];
      for (const id of expected) {
        expect(tier.reviewers.map(r => r.id)).toContain(id);
      }
    });

    it("is deterministic across calls", () => {
      const tier1 = composeTier("max");
      const tier2 = composeTier("max");
      expect(tier1.reviewers.map(r => r.id).sort())
        .toEqual(tier2.reviewers.map(r => r.id).sort());
    });
  });

  describe("all tiers", () => {
    it("all reviewers use openrouter provider", () => {
      for (const tierName of ALL_TIERS) {
        const tier = composeTier(tierName);
        for (const r of tier.reviewers) {
          expect(r.provider).toBe("openrouter");
        }
      }
    });

    it("all reviewers have valid OpenRouter model IDs", () => {
      for (const tierName of ALL_TIERS) {
        const tier = composeTier(tierName);
        for (const r of tier.reviewers) {
          expect(r.model).toMatch(/^[a-z0-9-]+\/[a-z0-9.-]+$/);
        }
      }
    });

    it("tier metadata is complete", () => {
      for (const tierName of ALL_TIERS) {
        const tier = composeTier(tierName);
        expect(tier.name).toBe(tierName);
        expect(tier.description).toBeTruthy();
        expect(tier.estimated_cost).toMatch(/^\$[\d.]+-[\d.]+$/);
        expect(tier.reviewers.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("tierDescription", () => {
  it("returns formatted description for each tier", () => {
    for (const tierName of ALL_TIERS) {
      const desc = tierDescription(tierName);
      expect(desc).toContain(tierName);
      expect(desc).toContain("$");
      expect(desc).toContain("[");
    }
  });
});

describe("ALL_TIERS", () => {
  it("contains exactly 5 tiers in order", () => {
    expect(ALL_TIERS).toEqual(["sm", "med", "lg", "xl", "max"]);
  });
});
