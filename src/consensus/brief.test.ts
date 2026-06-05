/**
 * Consensus Roundtable — Decision Brief Tests
 * S411 #17
 */

import { describe, it, expect } from "vitest";
import { generateDecisionBrief, formatDecisionBrief } from "./brief.js";
import type { ConsensusResult, ConsensusState, ConsensusOutput } from "./types.js";

const baseState: ConsensusState = {
  question: "Should we adopt option A?",
  context: undefined,
  participants: ["Party A", "Party B", "Party C"],
  session_id: "test-session",
  config: {
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
  },
  phase: "closed",
  standing_rules: [],
  current_speaker_index: 0,
  turn_count: 12,
  round_count: 4,
  blind_phase_active: false,
  pending_proposals: [],
  pending_assents: [],
  proposals: [
    { id: "p-1", content: "Yes, adopt option A because it's efficient", proposer: "Party A", timestamp: 1000, type: "substantive" },
    { id: "p-2", content: "No, option B is better for long-term", proposer: "Party B", timestamp: 2000, type: "substantive" },
    { id: "p-3", content: "Synthesis: Adopt option A with B's safeguards", proposer: "Party C", timestamp: 3000, type: "substantive" },
  ],
  objections: [
    { id: "o-1", target_id: "p-1", reason: "Doesn't consider long-term", objector: "Party B", timestamp: 1500, withdrawn: true },
    { id: "o-2", target_id: "p-2", reason: "Too slow to implement", objector: "Party A", timestamp: 2500, withdrawn: true },
  ],
  assents: [
    { proposal_id: "p-1", party: "Party A", explicit: false, timestamp: 1000, retracted: false },
    { proposal_id: "p-3", party: "Party A", explicit: true, timestamp: 4000, retracted: false },
    { proposal_id: "p-3", party: "Party B", explicit: true, timestamp: 4100, retracted: false },
    { proposal_id: "p-3", party: "Party C", explicit: false, timestamp: 3000, retracted: false },
  ],
  convergence_metrics: {
    entropy: 0,
    stability_count: 2,
    position_map: { "Party A": "p-3", "Party B": "p-3", "Party C": "p-3" },
  },
  transcript_summary: "",
  turn_log: [
    { turn: 0, round: 0, speaker: "Party A", action: { action: "propose" }, prompt_sent: "", raw_response: "", timestamp: 1000 },
    { turn: 11, round: 3, speaker: "Party C", action: { action: "assent", target_id: "p-3" }, prompt_sent: "", raw_response: "", timestamp: 5000 },
  ],
  consensus_answer: "Synthesis: Adopt option A with B's safeguards",
  termination_reason: "consensus-achieved",
};

const baseOutput: ConsensusOutput = {
  answer: "Synthesis: Adopt option A with B's safeguards",
  assent_profile: {
    explicit_assents: ["Party A", "Party B"],
    pass_based_non_objectors: ["Party C"],
  },
  rounds_to_consensus: 4,
  final_entropy: 0,
  consensus_type: "convergent-via-synthesis",
  self_synthesis: false,
  diversity_level: "high",
};

describe("generateDecisionBrief", () => {
  it("generates brief for consensus outcome", () => {
    const result: ConsensusResult = {
      outcome: "consensus",
      state: baseState,
      output: baseOutput,
    };

    const brief = generateDecisionBrief(result, baseState);

    expect(brief.decision_type).toBe("consensus");
    expect(brief.decision).toBe("Synthesis: Adopt option A with B's safeguards");
    expect(brief.question).toBe("Should we adopt option A?");
    expect(brief.participants).toBe(3);
    expect(brief.rounds).toBe(4);
  });

  it("identifies alternatives considered", () => {
    const result: ConsensusResult = {
      outcome: "consensus",
      state: baseState,
      output: baseOutput,
    };

    const brief = generateDecisionBrief(result, baseState);

    // p-1 and p-2 should be alternatives (p-3 won)
    expect(brief.alternatives_considered.length).toBe(2);
    expect(brief.alternatives_considered.some(a => a.proposal_id === "p-1")).toBe(true);
    expect(brief.alternatives_considered.some(a => a.proposal_id === "p-2")).toBe(true);
  });

  it("assesses confidence based on deliberation dynamics", () => {
    const result: ConsensusResult = {
      outcome: "consensus",
      state: baseState,
      output: baseOutput,
    };

    const brief = generateDecisionBrief(result, baseState);

    expect(["high", "medium", "low"]).toContain(brief.confidence.level);
    expect(brief.confidence.basis.length).toBeGreaterThan(0);
    // Should mention synthesis
    expect(brief.confidence.basis.some(b => b.toLowerCase().includes("synthesis"))).toBe(true);
  });

  it("handles hung jury outcome", () => {
    const hungState = {
      ...baseState,
      termination_reason: "turn-limit-reached",
      consensus_answer: null,
    };

    const result: ConsensusResult = {
      outcome: "hung_jury",
      state: hungState,
      report: {
        near_consensus_proposals: [],
        minority_reports: [],
        common_ground: "All agree something should be done",
        crux: "Disagreement on timeline",
      },
    };

    const brief = generateDecisionBrief(result, hungState);

    expect(brief.decision_type).toBe("hung_jury");
    expect(brief.decision).toContain("No consensus reached");
    expect(brief.confidence.level).toBe("low");
  });

  it("extracts next actions from decision text", () => {
    const stateWithActions = {
      ...baseState,
      consensus_answer: "We should:\n1. Implement option A by Friday\n2. Add safeguards from B\n- Update the documentation",
    };
    const outputWithActions = {
      ...baseOutput,
      answer: stateWithActions.consensus_answer,
    };

    const result: ConsensusResult = {
      outcome: "consensus",
      state: stateWithActions,
      output: outputWithActions,
    };

    const brief = generateDecisionBrief(result, stateWithActions);

    expect(brief.next_actions).toBeDefined();
    expect(brief.next_actions!.length).toBeGreaterThan(0);
  });
});

describe("formatDecisionBrief", () => {
  it("produces valid markdown", () => {
    const result: ConsensusResult = {
      outcome: "consensus",
      state: baseState,
      output: baseOutput,
    };

    const brief = generateDecisionBrief(result, baseState);
    const markdown = formatDecisionBrief(brief);

    expect(markdown).toContain("# Decision Brief");
    expect(markdown).toContain("## Decision");
    expect(markdown).toContain("## Confidence Assessment");
    expect(markdown).toContain("**Level:**");
  });

  it("includes alternatives section when present", () => {
    const result: ConsensusResult = {
      outcome: "consensus",
      state: baseState,
      output: baseOutput,
    };

    const brief = generateDecisionBrief(result, baseState);
    const markdown = formatDecisionBrief(brief);

    expect(markdown).toContain("## Alternatives Considered");
    expect(markdown).toContain("p-1");
    expect(markdown).toContain("p-2");
  });
});
