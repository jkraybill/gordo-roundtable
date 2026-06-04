/**
 * Tier-based panel composition using Gauge-verified model lists.
 *
 * Lists defined by Gauge dimension cutoffs:
 * - List A (Bilateral Partners): BiC = generative AND BC = high
 * - List B (Trusted Advisors): BC = high AND BiC >= moderate
 * - List C (Fast/Cheap): BC = high AND cost < $1/M tokens
 */

import type { Reviewer } from "./types.js";
import { buildAdvisorySystemPrompt } from "./advisory/prompts.js";

export type TierName = "sm" | "med" | "lg" | "xl" | "max";

interface ModelDef {
  id: string;
  openrouter: string;
  cost_per_m: number;
}

// List A — Bilateral Partners (BiC = generative, BC = high)
const LIST_A: ModelDef[] = [
  { id: "claude-opus-4.8", openrouter: "anthropic/claude-opus-4-8", cost_per_m: 15.00 },
  { id: "claude-opus-4.7", openrouter: "anthropic/claude-opus-4.7", cost_per_m: 15.00 },
  { id: "claude-sonnet-4.6", openrouter: "anthropic/claude-sonnet-4.6", cost_per_m: 3.00 },
];

// Consensus-eligible models per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md §2.1
// Initial gate: Opus models (4.5, 4.6, 4.7, 4.8)
const CONSENSUS_ELIGIBLE: ModelDef[] = [
  { id: "claude-opus-4.8", openrouter: "anthropic/claude-opus-4-8", cost_per_m: 15.00 },
  { id: "claude-opus-4.7", openrouter: "anthropic/claude-opus-4.7", cost_per_m: 15.00 },
  { id: "claude-opus-4.6", openrouter: "anthropic/claude-opus-4.6", cost_per_m: 15.00 },
  { id: "claude-opus-4.5", openrouter: "anthropic/claude-opus-4-5", cost_per_m: 15.00 },
];

// List B — Trusted Advisors (BC = high, BiC >= moderate)
const LIST_B: ModelDef[] = [
  { id: "owl-alpha", openrouter: "openrouter/owl-alpha", cost_per_m: 0.00 },
  { id: "claude-haiku-4.5", openrouter: "anthropic/claude-haiku-4.5", cost_per_m: 0.80 },
  { id: "deepseek-v4-flash", openrouter: "deepseek/deepseek-v4-flash", cost_per_m: 0.17 },
  { id: "deepseek-v4-pro", openrouter: "deepseek/deepseek-v4-pro", cost_per_m: 0.66 },
  { id: "tencent-hy3", openrouter: "tencent/hy3-preview", cost_per_m: 0.16 },
  { id: "gpt-5", openrouter: "openai/gpt-5", cost_per_m: 5.00 },
  { id: "gemini-2.5-pro", openrouter: "google/gemini-2.5-pro", cost_per_m: 1.25 },
];

// List C — Fast/Cheap (BC = high, cost < $1/M)
const LIST_C: ModelDef[] = LIST_B.filter(m => m.cost_per_m < 1.00);

// Frontier-weighted models in List B (BiC = responsive, higher quality)
const FRONTIER_MODELS = new Set(["gpt-5", "gemini-2.5-pro"]);

function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function weightedSample(arr: ModelDef[], n: number): ModelDef[] {
  // Weight frontier models 2x
  const weighted: ModelDef[] = [];
  for (const m of arr) {
    weighted.push(m);
    if (FRONTIER_MODELS.has(m.id)) weighted.push(m);
  }
  // Sample without replacement (dedupe after)
  const picked = new Set<string>();
  const result: ModelDef[] = [];
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  for (const m of shuffled) {
    if (!picked.has(m.id) && result.length < n) {
      picked.add(m.id);
      result.push(m);
    }
  }
  return result;
}

function modelToReviewer(m: ModelDef, maxTokens: number, reasoningEffort?: string): Reviewer {
  return {
    id: m.id,
    provider: "openrouter",
    model: m.openrouter,
    max_tokens: maxTokens,
    system_prompt: buildAdvisorySystemPrompt(),
    ...(reasoningEffort ? { reasoning_effort: reasoningEffort as any } : {}),
  };
}

export interface TierConfig {
  name: TierName;
  description: string;
  reviewers: Reviewer[];
  estimated_cost: string;
}

export function composeTier(tier: TierName): TierConfig {
  switch (tier) {
    case "sm": {
      // Deterministic: owl, deepseek-flash, hy3
      const models = LIST_C.filter(m =>
        ["owl-alpha", "deepseek-v4-flash", "tencent-hy3"].includes(m.id)
      );
      return {
        name: "sm",
        description: "Quick sanity check — 3 fast/cheap models",
        reviewers: models.map(m => modelToReviewer(m, 2000)),
        estimated_cost: "$0.05-0.10",
      };
    }

    case "med": {
      // Random 3 from List B
      const models = sample(LIST_B, 3);
      return {
        name: "med",
        description: "Standard review — 3 random from List B",
        reviewers: models.map(m => modelToReviewer(m, 4000)),
        estimated_cost: "$0.50-2.00",
      };
    }

    case "lg": {
      // 2 from List A + 3 from List B (excluding A's base models)
      const listA = sample(LIST_A, 2);
      const listAIds = new Set(listA.map(m => m.id));
      const listBFiltered = LIST_B.filter(m => !listAIds.has(m.id));
      const listB = sample(listBFiltered, 3);
      return {
        name: "lg",
        description: "Thorough review — 2 bilateral + 3 advisors",
        reviewers: [
          ...listA.map(m => modelToReviewer(m, 6000, "high")),
          ...listB.map(m => modelToReviewer(m, 4000)),
        ],
        estimated_cost: "$4-8",
      };
    }

    case "xl": {
      // 2 from List A + 3 frontier-weighted from List B
      const listA = sample(LIST_A, 2);
      const listAIds = new Set(listA.map(m => m.id));
      const listBFiltered = LIST_B.filter(m => !listAIds.has(m.id));
      const listB = weightedSample(listBFiltered, 3);
      return {
        name: "xl",
        description: "High-stakes review — 2 bilateral + 3 frontier-weighted",
        reviewers: [
          ...listA.map(m => modelToReviewer(m, 8000, "high")),
          ...listB.map(m => modelToReviewer(m, 6000, "high")),
        ],
        estimated_cost: "$6-12",
      };
    }

    case "max": {
      // All List A + deterministic 3 from List B
      const listB = LIST_B.filter(m =>
        ["owl-alpha", "deepseek-v4-pro", "gemini-2.5-pro"].includes(m.id)
      );
      return {
        name: "max",
        description: "Ratification-grade — all bilateral + 3 deterministic",
        reviewers: [
          ...LIST_A.map(m => modelToReviewer(m, 8000, "high")),
          ...listB.map(m => modelToReviewer(m, 6000, "high")),
        ],
        estimated_cost: "$15-25",
      };
    }
  }
}

export function tierDescription(tier: TierName): string {
  const config = composeTier(tier);
  const models = config.reviewers.map(r => r.id).join(", ");
  return `${tier}: ${config.description} [${models}] — est. ${config.estimated_cost}`;
}

export const ALL_TIERS: TierName[] = ["sm", "med", "lg", "xl", "max"];

/**
 * Get consensus-eligible models per spec §2.1.
 * Returns ModelDef array for consensus roundtable participant selection.
 */
export function getConsensusEligible(): ModelDef[] {
  return [...CONSENSUS_ELIGIBLE];
}
