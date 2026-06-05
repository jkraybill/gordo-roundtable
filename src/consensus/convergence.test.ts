/**
 * Consensus Roundtable — Convergence Tests
 */

import { describe, it, expect } from "vitest";
import { calculateEntropy, buildPositionMap, checkConsensus, calculateDiversityLevel, calculateActionUsage } from "./convergence.js";
import { createInitialState, applyAction } from "./state.js";
import type { ConsensusConfig } from "./types.js";

describe("calculateEntropy", () => {
  it("returns 0 for unanimous position", () => {
    const positionMap = {
      "Party A": "p-1",
      "Party B": "p-1",
      "Party C": "p-1",
    };

    expect(calculateEntropy(positionMap)).toBe(0);
  });

  it("returns log2(N) for uniform distribution", () => {
    const positionMap = {
      "Party A": "p-1",
      "Party B": "p-2",
      "Party C": "p-3",
    };

    // log2(3) ≈ 1.585
    expect(calculateEntropy(positionMap)).toBeCloseTo(Math.log2(3), 5);
  });

  it("handles null positions", () => {
    const positionMap = {
      "Party A": "p-1",
      "Party B": null,
      "Party C": "p-1",
    };

    // Only 2 non-null, both same position -> entropy 0
    expect(calculateEntropy(positionMap)).toBe(0);
  });

  it("returns 0 for all null positions", () => {
    const positionMap = {
      "Party A": null,
      "Party B": null,
      "Party C": null,
    };

    expect(calculateEntropy(positionMap)).toBe(0);
  });

  it("calculates entropy for 2-way split", () => {
    const positionMap = {
      "Party A": "p-1",
      "Party B": "p-1",
      "Party C": "p-2",
      "Party D": "p-2",
    };

    // 2/4 for each -> H = -2*(0.5*log2(0.5)) = 1
    expect(calculateEntropy(positionMap)).toBeCloseTo(1, 5);
  });
});

describe("buildPositionMap", () => {
  const testConfig: ConsensusConfig = {
    participants: [
      { model: "test-1", provider: "openrouter" },
      { model: "test-2", provider: "openrouter" },
      { model: "test-3", provider: "openrouter" },
    ],
    turn_limit: 100,
    hard_cap: 500,
    bootstrap_rounds: 0,
    beta: 2,
  };

  it("starts with all null positions", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const map = buildPositionMap(state);

    expect(map).toEqual({
      "Party A": null,
      "Party B": null,
      "Party C": null,
    });
  });

  it("tracks assents", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, { rawResponse: "", promptSent: "" });

    const map = buildPositionMap(state);
    expect(map["Party A"]).toBe("p-1");
    expect(map["Party B"]).toBeNull();
    expect(map["Party C"]).toBeNull();
  });
});

describe("checkConsensus", () => {
  const testConfig: ConsensusConfig = {
    participants: [
      { model: "test-1", provider: "openrouter" },
      { model: "test-2", provider: "openrouter" },
      { model: "test-3", provider: "openrouter" },
    ],
    turn_limit: 100,
    hard_cap: 500,
    bootstrap_rounds: 0,
    beta: 2,
  };

  // Helper for test log data
  const log = { rawResponse: "", promptSent: "" };

  it("returns false with no proposals", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const result = checkConsensus(state);

    expect(result.achieved).toBe(false);
  });

  it("returns false with objections", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, log);

    // Party B objects
    state = applyAction(state, "Party B", {
      action: "object",
      target_id: "p-1",
      reason: "Disagree"
    }, log);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(false);
  });

  it("returns false when stability not met", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, log);

    // Party B assents
    state = applyAction(state, "Party B", { action: "assent", target_id: "p-1" }, log);

    // Party C passes
    state = applyAction(state, "Party C", { action: "pass" }, log);

    // stability_count = 1 (one round), need beta = 2
    expect(state.convergence_metrics.stability_count).toBe(1);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(false);
  });

  it("returns true when all conditions met", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Round 1
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, log);
    state = applyAction(state, "Party B", { action: "assent", target_id: "p-1" }, log);
    state = applyAction(state, "Party C", { action: "assent", target_id: "p-1" }, log);

    // Round 2 (all pass)
    state = applyAction(state, "Party A", { action: "pass" }, log);
    state = applyAction(state, "Party B", { action: "pass" }, log);
    state = applyAction(state, "Party C", { action: "pass" }, log);

    // Now stability_count = 2
    expect(state.convergence_metrics.stability_count).toBe(2);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(true);
    expect(result.proposal_id).toBe("p-1");
    expect(result.proposal_content).toBe("Proposal");
  });

  it("returns amendment content when amendment wins consensus (regression: #3)", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Round 1: A proposes, B amends, C assents to amendment
    state = applyAction(state, "Party A", { action: "propose", content: "Original proposal" }, log);
    state = applyAction(state, "Party B", { action: "amend", target_id: "p-1", content: "Amended proposal" }, log);
    state = applyAction(state, "Party C", { action: "assent", target_id: "p-2" }, log);

    // Round 2: A assents to amendment, B and C pass
    state = applyAction(state, "Party A", { action: "assent", target_id: "p-2" }, log);
    state = applyAction(state, "Party B", { action: "pass" }, log);
    state = applyAction(state, "Party C", { action: "pass" }, log);

    // All should be on p-2
    expect(state.convergence_metrics.position_map).toEqual({
      "Party A": "p-2",
      "Party B": "p-2",
      "Party C": "p-2",
    });

    // Stability should be 2
    expect(state.convergence_metrics.stability_count).toBe(2);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(true);
    // Bug fix: should return p-2 content, not p-1
    expect(result.proposal_id).toBe("p-2");
    expect(result.proposal_content).toBe("Amended proposal");
    // Assent profile should include all parties who assented to p-2
    expect(result.assent_profile?.explicit_assents).toContain("Party A");
    expect(result.assent_profile?.explicit_assents).toContain("Party B");
    expect(result.assent_profile?.explicit_assents).toContain("Party C");
  });
});

describe("calculateDiversityLevel (S409 #20)", () => {
  it("returns low for same model family (all Opus)", () => {
    const participants = [
      { model: "anthropic/claude-opus-4-8", provider: "openrouter" as const },
      { model: "anthropic/claude-opus-4.7", provider: "openrouter" as const },
      { model: "anthropic/claude-opus-4-5", provider: "openrouter" as const },
    ];
    expect(calculateDiversityLevel(participants)).toBe("low");
  });

  it("returns medium for same provider two families", () => {
    const participants = [
      { model: "anthropic/claude-opus-4-8", provider: "openrouter" as const },
      { model: "anthropic/claude-opus-4.7", provider: "openrouter" as const },
      { model: "anthropic/claude-sonnet-4.6", provider: "openrouter" as const },
    ];
    expect(calculateDiversityLevel(participants)).toBe("medium");
  });

  it("returns high for 3+ families", () => {
    const participants = [
      { model: "anthropic/claude-opus-4-8", provider: "openrouter" as const },
      { model: "anthropic/claude-sonnet-4.6", provider: "openrouter" as const },
      { model: "anthropic/claude-haiku-4.5", provider: "openrouter" as const },
    ];
    expect(calculateDiversityLevel(participants)).toBe("high");
  });

  it("returns high for multiple providers", () => {
    const participants = [
      { model: "anthropic/claude-opus-4-8", provider: "openrouter" as const },
      { model: "local-llama", provider: "ollama" as const },
      { model: "anthropic/claude-opus-4.7", provider: "openrouter" as const },
    ];
    expect(calculateDiversityLevel(participants)).toBe("high");
  });
});

describe("calculateActionUsage (S409 #22)", () => {
  it("counts action types across turns", () => {
    const config: ConsensusConfig = {
      participants: [
        { model: "m1", provider: "openrouter" },
        { model: "m2", provider: "openrouter" },
        { model: "m3", provider: "openrouter" },
      ],
      turn_limit: 100,
      hard_cap: 500,
      bootstrap_rounds: 0,
      beta: 2,
    };

    let state = createInitialState("Q?", undefined, config);
    state = applyAction(state, "Party A", { action: "propose", content: "P1" }, { rawResponse: "", promptSent: "" });
    state = applyAction(state, "Party B", { action: "assent", target_id: "p-1" }, { rawResponse: "", promptSent: "" });
    state = applyAction(state, "Party C", { action: "pass" }, { rawResponse: "", promptSent: "" });

    const usage = calculateActionUsage(state);
    expect(usage["propose"]).toBe(1);
    expect(usage["assent"]).toBe(1);
    expect(usage["pass"]).toBe(1);
    expect(usage["object"]).toBeUndefined();
  });
});
