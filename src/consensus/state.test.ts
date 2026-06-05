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
    { model: "test-model-1", provider: "openrouter" },
    { model: "test-model-2", provider: "openrouter" },
    { model: "test-model-3", provider: "openrouter" },
  ],
  turn_limit: 100,
  hard_cap: 500,
  bootstrap_rounds: 0,
  beta: 2,
  blind_opening: false, // Disable for unit tests; tested separately
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

// Helper to create minimal log data for tests
const testLogData = (raw: string = "raw response") => ({
  rawResponse: raw,
  promptSent: "test prompt",
});

describe("applyAction", () => {
  it("applies propose action and creates assent", () => {
    const state = createInitialState("Test?", undefined, testConfig);
    const action: ParsedAction = { action: "propose", content: "My answer" };

    const newState = applyAction(state, "Party A", action, testLogData());

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
    state = applyAction(state, "Party A", { action: "propose", content: "Proposal" }, testLogData());

    // Party B objects
    state = applyAction(state, "Party B", {
      action: "object",
      target_id: "p-1",
      reason: "I disagree"
    }, testLogData());

    expect(state.objections.length).toBe(1);
    expect(state.objections[0].objector).toBe("Party B");
    expect(state.objections[0].reason).toBe("I disagree");
    expect(state.convergence_metrics.stability_count).toBe(0);
  });

  it("advances round at boundary", () => {
    let state = createInitialState("Test?", undefined, testConfig);

    // 3 turns = 1 round
    state = applyAction(state, "Party A", { action: "pass" }, testLogData());
    state = applyAction(state, "Party B", { action: "pass" }, testLogData());
    state = applyAction(state, "Party C", { action: "pass" }, testLogData());

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

// S410 #14: Blind opening phase tests
describe("blind opening phase", () => {
  const blindConfig: ConsensusConfig = {
    ...testConfig,
    blind_opening: true,
  };

  it("starts with blind_phase_active when enabled", () => {
    const state = createInitialState("Test?", undefined, blindConfig);
    expect(state.blind_phase_active).toBe(true);
    expect(state.pending_proposals).toEqual([]);
    expect(state.pending_assents).toEqual([]);
  });

  it("places proposals in pending_proposals during blind phase", () => {
    let state = createInitialState("Test?", undefined, blindConfig);
    state = applyAction(state, "Party A", { action: "propose", content: "A's answer" }, testLogData());

    // Proposal should be in pending, not visible
    expect(state.proposals.length).toBe(0);
    expect(state.pending_proposals.length).toBe(1);
    expect(state.pending_proposals[0].content).toBe("A's answer");
    expect(state.pending_proposals[0].id).toBe("p-1");

    // Assent also pending
    expect(state.assents.length).toBe(0);
    expect(state.pending_assents.length).toBe(1);
  });

  it("reveals pending proposals after first round completes", () => {
    let state = createInitialState("Test?", undefined, blindConfig);

    // All three parties propose (blind)
    state = applyAction(state, "Party A", { action: "propose", content: "A's answer" }, testLogData());
    state = applyAction(state, "Party B", { action: "propose", content: "B's answer" }, testLogData());
    state = applyAction(state, "Party C", { action: "propose", content: "C's answer" }, testLogData());

    // After round 1 completes, blind phase should end
    expect(state.blind_phase_active).toBe(false);
    expect(state.round_count).toBe(1);

    // All proposals should now be visible
    expect(state.proposals.length).toBe(3);
    expect(state.pending_proposals.length).toBe(0);
    expect(state.assents.length).toBe(3);
    expect(state.pending_assents.length).toBe(0);

    // Check IDs are sequential
    expect(state.proposals.map(p => p.id)).toEqual(["p-1", "p-2", "p-3"]);
  });

  it("keeps proposals visible after reveal (round 2+)", () => {
    let state = createInitialState("Test?", undefined, blindConfig);

    // Round 1: all propose (blind)
    state = applyAction(state, "Party A", { action: "propose", content: "A" }, testLogData());
    state = applyAction(state, "Party B", { action: "propose", content: "B" }, testLogData());
    state = applyAction(state, "Party C", { action: "propose", content: "C" }, testLogData());

    // Round 2: Party A proposes again (should be immediately visible)
    state = applyAction(state, "Party A", { action: "propose", content: "A's second" }, testLogData());

    expect(state.proposals.length).toBe(4);
    expect(state.pending_proposals.length).toBe(0);
    expect(state.proposals[3].content).toBe("A's second");
    expect(state.proposals[3].id).toBe("p-4");
  });
});
