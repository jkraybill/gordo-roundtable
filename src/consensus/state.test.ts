/**
 * Consensus Roundtable — State Machine Tests
 */

import { describe, it, expect } from "vitest";
import {
  createInitialState,
  applyAction,
  validateAction,
  serializeState,
  deserializeState,
} from "./state.js";
import type { ConsensusConfig, ParsedAction } from "./types.js";

const testConfig: ConsensusConfig = {
  participants: [
    { model: "test-model-1", provider: "openrouter", max_tokens: 1000 },
    { model: "test-model-2", provider: "openrouter", max_tokens: 1000 },
    { model: "test-model-3", provider: "openrouter", max_tokens: 1000 },
  ],
  turn_limit: 100,
  hard_cap: 500,
  bootstrap_rounds: 0,
  beta: 2,
};

describe("createInitialState", () => {
  it("creates state with correct participants", () => {
    const state = createInitialState("Test question?", undefined, testConfig);

    expect(state.question).toBe("Test question?");
    expect(state.participants).toEqual(["Party A", "Party B", "Party C"]);
    expect(state.phase).toBe("deliberation"); // bootstrap_rounds = 0
    expect(state.turn_count).toBe(0);
    expect(state.round_count).toBe(0);
    expect(state.proposals).toEqual([]);
    expect(state.objections).toEqual([]);
  });

  it("starts in bootstrap phase when bootstrap_rounds > 0", () => {
    const configWithBootstrap = { ...testConfig, bootstrap_rounds: 3 };
    const state = createInitialState("Test?", undefined, configWithBootstrap);

    expect(state.phase).toBe("bootstrap");
  });
});

describe("validateAction", () => {
  it("validates propose action", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "propose", content: "My proposal" };

    const result = validateAction(state, "Party A", action);
    expect(result.valid).toBe(true);
  });

  it("rejects action from wrong speaker", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "pass" };

    const result = validateAction(state, "Party B", action); // A's turn, not B
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Not Party B's turn");
  });

  it("rejects object without target_id", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "object", reason: "Because" };

    const result = validateAction(state, "Party A", action);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("target_id");
  });

  it("rejects object to non-existent proposal", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "object", target_id: "p-999", reason: "Because" };

    const result = validateAction(state, "Party A", action);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not found");
  });
});

describe("applyAction", () => {
  it("applies propose action and creates assent", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "propose", content: "My answer" };

    const newState = applyAction(state, "Party A", action, "raw response");

    expect(newState.proposals.length).toBe(1);
    expect(newState.proposals[0].content).toBe("My answer");
    expect(newState.proposals[0].proposer).toBe("Party A");
    expect(newState.proposals[0].id).toBe("p-1");

    // Implicit assent
    expect(newState.assents.length).toBe(1);
    expect(newState.assents[0].party).toBe("Party A");
    expect(newState.assents[0].explicit).toBe(false);

    // Turn advanced
    expect(newState.turn_count).toBe(1);
    expect(newState.current_speaker_index).toBe(1);
  });

  it("applies object action and resets stability", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // Party A proposes
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, "");

    // Party B objects
    state = applyAction(state, "Party B", {
      action: "object",
      target_id: "p-1",
      reason: "I disagree"
    }, "");

    expect(state.objections.length).toBe(1);
    expect(state.objections[0].objector).toBe("Party B");
    expect(state.objections[0].reason).toBe("I disagree");
    expect(state.convergence_metrics.stability_count).toBe(0);
  });

  it("advances round at boundary", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // 3 turns = 1 round
    state = applyAction(state, "Party A", { action: "pass" }, "");
    state = applyAction(state, "Party B", { action: "pass" }, "");
    state = applyAction(state, "Party C", { action: "pass" }, "");

    expect(state.turn_count).toBe(3);
    expect(state.round_count).toBe(1);
    expect(state.current_speaker_index).toBe(0);
  });
});

describe("serialization", () => {
  it("round-trips state through serialize/deserialize", () => {
    const state = createInitialState("Test?", "Context", testConfig);
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.question).toBe(state.question);
    expect(restored.context).toBe(state.context);
    expect(restored.participants).toEqual(state.participants);
    expect(restored.session_id).toBe(state.session_id);
  });
});
