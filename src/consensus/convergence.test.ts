/**
 * Consensus Roundtable — Convergence Tests
 */

import { describe, it, expect } from "vitest";
import { calculateEntropy, buildPositionMap, checkConsensus } from "./convergence.js";
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
      { model: "test-1", provider: "openrouter", max_tokens: 1000 },
      { model: "test-2", provider: "openrouter", max_tokens: 1000 },
      { model: "test-3", provider: "openrouter", max_tokens: 1000 },
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
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, "");

    const map = buildPositionMap(state);
    expect(map["Party A"]).toBe("p-1");
    expect(map["Party B"]).toBeNull();
    expect(map["Party C"]).toBeNull();
  });
});

describe("checkConsensus", () => {
  const testConfig: ConsensusConfig = {
    participants: [
      { model: "test-1", provider: "openrouter", max_tokens: 1000 },
      { model: "test-2", provider: "openrouter", max_tokens: 1000 },
      { model: "test-3", provider: "openrouter", max_tokens: 1000 },
    ],
    turn_limit: 100,
    hard_cap: 500,
    bootstrap_rounds: 0,
    beta: 2,
  };

  it("returns false with no proposals", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const result = checkConsensus(state);

    expect(result.achieved).toBe(false);
  });

  it("returns false with objections", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, "");

    // Party B objects
    state = applyAction(state, "Party B", {
      action: "object",
      target_id: "p-1",
      reason: "Disagree"
    }, "");

    const result = checkConsensus(state);
    expect(result.achieved).toBe(false);
  });

  it("returns false when stability not met", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, "");

    // Party B assents
    state = applyAction(state, "Party B", { action: "assent", target_id: "p-1" }, "");

    // Party C passes
    state = applyAction(state, "Party C", { action: "pass" }, "");

    // stability_count = 1 (one round), need beta = 2
    expect(state.convergence_metrics.stability_count).toBe(1);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(false);
  });

  it("returns true when all conditions met", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Round 1
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, "");
    state = applyAction(state, "Party B", { action: "assent", target_id: "p-1" }, "");
    state = applyAction(state, "Party C", { action: "assent", target_id: "p-1" }, "");

    // Round 2 (all pass)
    state = applyAction(state, "Party A", { action: "pass" }, "");
    state = applyAction(state, "Party B", { action: "pass" }, "");
    state = applyAction(state, "Party C", { action: "pass" }, "");

    // Now stability_count = 2
    expect(state.convergence_metrics.stability_count).toBe(2);

    const result = checkConsensus(state);
    expect(result.achieved).toBe(true);
    expect(result.proposal_id).toBe("p-1");
    expect(result.proposal_content).toBe("Proposal");
  });
});
