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
// sonnet-4.6 retired 2026-07-26 (S137, JK directive: panel refresh to current frontier)
const LIST_A: ModelDef[] = [
  { id: "claude-opus-5", openrouter: "anthropic/claude-opus-5", cost_per_m: 5.00 },
  { id: "claude-opus-4.8", openrouter: "anthropic/claude-opus-4-8", cost_per_m: 15.00 },
  { id: "claude-opus-4.7", openrouter: "anthropic/claude-opus-4.7", cost_per_m: 15.00 },
];

// Consensus-eligible models per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md §2.1
// Initial gate: Opus models (4.5 through 5)
const CONSENSUS_ELIGIBLE: ModelDef[] = [
  { id: "claude-opus-5", openrouter: "anthropic/claude-opus-5", cost_per_m: 5.00 },
  { id: "claude-opus-4.8", openrouter: "anthropic/claude-opus-4-8", cost_per_m: 15.00 },
  { id: "claude-opus-4.7", openrouter: "anthropic/claude-opus-4.7", cost_per_m: 15.00 },
  { id: "claude-opus-4.6", openrouter: "anthropic/claude-opus-4.6", cost_per_m: 15.00 },
  { id: "claude-opus-4.5", openrouter: "anthropic/claude-opus-4-5", cost_per_m: 15.00 },
];

// List B — Trusted Advisors (BC = high, BiC >= moderate)
// NOTE: owl-alpha removed 2026-07 (no longer on OpenRouter)
// Refreshed 2026-07-26 (S137, JK directive): frontier bumped to current
// (gpt-5.4, gemini-3.1-pro), Chinese houses added (glm-5.2, qwen3.7-max,
// kimi-k3 flagship + kimi-k2.6 budget) pending formal Gauge assessment. Prices = OpenRouter prompt $/M.
const LIST_B: ModelDef[] = [
  { id: "claude-haiku-4.5", openrouter: "anthropic/claude-haiku-4.5", cost_per_m: 0.80 },
  { id: "deepseek-v4-flash", openrouter: "deepseek/deepseek-v4-flash", cost_per_m: 0.17 },
  { id: "deepseek-v4-pro", openrouter: "deepseek/deepseek-v4-pro", cost_per_m: 0.43 },
  { id: "tencent-hy3", openrouter: "tencent/hy3", cost_per_m: 0.13 },
  { id: "gpt-5.4", openrouter: "openai/gpt-5.4", cost_per_m: 2.50 },
  { id: "gemini-3.1-pro", openrouter: "google/gemini-3.1-pro-preview", cost_per_m: 2.00 },
  { id: "glm-5.2", openrouter: "z-ai/glm-5.2", cost_per_m: 0.67 },
  { id: "qwen3.7-max", openrouter: "qwen/qwen3.7-max", cost_per_m: 1.48 },
  { id: "kimi-k3", openrouter: "moonshotai/kimi-k3", cost_per_m: 3.00 },
  { id: "kimi-k2.6", openrouter: "moonshotai/kimi-k2.6", cost_per_m: 0.65 },
  { id: "llama-4-maverick", openrouter: "meta-llama/llama-4-maverick", cost_per_m: 0.50 },
];

// List C — Fast/Cheap (BC = high, cost < $1/M)
const LIST_C: ModelDef[] = LIST_B.filter(m => m.cost_per_m < 1.00);

// Frontier-weighted models in List B (BiC = responsive, higher quality)
const FRONTIER_MODELS = new Set(["gpt-5.4", "gemini-3.1-pro", "qwen3.7-max", "kimi-k3"]);

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

function modelToReviewer(m: ModelDef, maxTokens: number | undefined, reasoningEffort?: string): Reviewer {
  return {
    id: m.id,
    provider: "openrouter",
    model: m.openrouter,
    // Only include max_tokens if specified — undefined means use model's natural limit
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
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

// No max_tokens anywhere (S137): explicit caps made reasoning models burn the
// whole budget on reasoning and return zero content (gemini + sonnet, whisper
// panel). undefined = model's natural limit. Never re-add caps.
export function composeTier(tier: TierName): TierConfig {
  switch (tier) {
    case "sm": {
      // Deterministic: deepseek-flash, hy3, kimi-k2.6
      const models = LIST_C.filter(m =>
        ["deepseek-v4-flash", "tencent-hy3", "kimi-k2.6"].includes(m.id)
      );
      return {
        name: "sm",
        description: "Quick sanity check — 3 fast/cheap models",
        reviewers: models.map(m => modelToReviewer(m, undefined)),
        estimated_cost: "$0.05-0.10",
      };
    }

    case "med": {
      // Random 3 from List B
      const models = sample(LIST_B, 3);
      return {
        name: "med",
        description: "Standard review — 3 random from List B",
        reviewers: models.map(m => modelToReviewer(m, undefined)),
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
          ...listA.map(m => modelToReviewer(m, undefined, "high")),
          ...listB.map(m => modelToReviewer(m, undefined)),
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
          ...listA.map(m => modelToReviewer(m, undefined, "high")),
          ...listB.map(m => modelToReviewer(m, undefined, "high")),
        ],
        estimated_cost: "$6-12",
      };
    }

    case "max": {
      // All List A + deterministic 4 from List B
      // No max_tokens — let models use their natural limit for ratification-grade review
      const listB = LIST_B.filter(m =>
        ["gpt-5.4", "deepseek-v4-pro", "gemini-3.1-pro", "glm-5.2"].includes(m.id)
      );
      return {
        name: "max",
        description: "Ratification-grade — all bilateral + 4 deterministic",
        reviewers: [
          ...LIST_A.map(m => modelToReviewer(m, undefined, "high")),
          ...listB.map(m => modelToReviewer(m, undefined, "high")),
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
