/**
 * Consensus Roundtable — Integration Tests with Mock Dispatch
 *
 * Tests the full orchestrator flow with mocked API responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runConsensusRoundtable } from "./orchestrator.js";
import { createInitialState } from "./state.js";
import type { ConsensusConfig } from "./types.js";
import * as runner from "../runner.js";

// Mock the runner module
vi.mock("../runner.js", () => ({
  dispatchOne: vi.fn(),
}));

const mockDispatchOne = vi.mocked(runner.dispatchOne);

const testConfig: ConsensusConfig = {
  participants: [
    { model: "test-model-a", provider: "openrouter" },
    { model: "test-model-b", provider: "openrouter" },
    { model: "test-model-c", provider: "openrouter" },
  ],
  turn_limit: 50,
  hard_cap: 100,
  bootstrap_rounds: 0,
  beta: 2,
  blind_opening: false, // Disable for integration tests; tested separately
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runConsensusRoundtable integration", () => {
  it("achieves consensus with all participants assenting", async () => {
    // Mock responses: A proposes, B assents, C assents, then all pass twice for stability
    const responses = [
      // Round 1
      mockResponse("propose", "The answer is 42", "Party A proposes"),
      mockResponse("assent", "p-1", "Party B agrees"),
      mockResponse("assent", "p-1", "Party C agrees"),
      // Round 2 (stability)
      mockResponse("pass", undefined, "Party A maintains"),
      mockResponse("pass", undefined, "Party B maintains"),
      mockResponse("pass", undefined, "Party C maintains"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const state = createInitialState("What is the meaning of life?", undefined, testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("consensus");
    if (result.outcome === "consensus") {
      expect(result.output.answer).toBe("The answer is 42");
      expect(result.output.assent_profile.explicit_assents).toContain("Party A");
      expect(result.output.assent_profile.explicit_assents).toContain("Party B");
      expect(result.output.assent_profile.explicit_assents).toContain("Party C");
    }
  });

  it("reaches hung jury when turn limit exhausted", async () => {
    // Mock responses: endless passing without consensus
    mockDispatchOne.mockImplementation(async () => ({
      reviewer_id: "test",
      status: "ok" as const,
      content: mockResponse("pass", undefined, "I pass"),
      duration_ms: 50,
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    }));

    const shortConfig: ConsensusConfig = {
      ...testConfig,
      turn_limit: 6, // Only 2 rounds
      beta: 3,       // Need 3 rounds for stability (won't achieve)
    };

    const state = createInitialState("Impossible question?", undefined, shortConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("hung_jury");
    if (result.outcome === "hung_jury") {
      expect(result.report.termination_reason).toBe("turn-limit-exhausted");
    }
  });

  it("handles objections and reaches consensus after amendment", async () => {
    // Simpler scenario: A proposes, B and C assent to amended version
    const responses = [
      // Round 1: A proposes, B objects, C waits
      mockResponse("propose", "First proposal", "A proposes"),
      mockResponse("object", "p-1", "B objects because incomplete"),
      mockResponse("pass", undefined, "C waits"),
      // Round 2: A proposes new (synthesizes), B assents, C assents
      mockResponse("propose", "Amended proposal with fixes", "A proposes better version"),
      mockResponse("assent", "p-2", "B now agrees"),
      mockResponse("assent", "p-2", "C agrees"),
      // Round 3: all pass (stability = 1)
      mockResponse("pass", undefined, "A maintains"),
      mockResponse("pass", undefined, "B maintains"),
      mockResponse("pass", undefined, "C maintains"),
      // Round 4: all pass (stability = 2 -> consensus!)
      mockResponse("pass", undefined, "A maintains"),
      mockResponse("pass", undefined, "B maintains"),
      mockResponse("pass", undefined, "C maintains"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const state = createInitialState("Complex question", undefined, testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("consensus");
    if (result.outcome === "consensus") {
      expect(result.output.answer).toContain("Amended proposal");
    }
  });

  it("handles API errors gracefully as pass", async () => {
    const responses = [
      // Round 1: A proposes, B errors (becomes pass), C assents
      mockResponse("propose", "Proposal despite errors", "A proposes"),
      null, // B errors
      mockResponse("assent", "p-1", "C agrees"),
      // Rounds 2-3 for stability
      mockResponse("pass", undefined, "A"),
      mockResponse("pass", undefined, "B recovered"),
      mockResponse("pass", undefined, "C"),
      mockResponse("pass", undefined, "A"),
      mockResponse("pass", undefined, "B"),
      mockResponse("pass", undefined, "C"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      if (resp === null) {
        return {
          reviewer_id: "test",
          status: "error" as const,
          error: "API timeout",
          duration_ms: 30000,
        };
      }
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const state = createInitialState("Error handling test", undefined, testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    // Should still reach consensus (B's error treated as pass)
    expect(result.outcome).toBe("consensus");
  });

  it("logs full prompts and responses in turn_log", async () => {
    const responses = [
      mockResponse("propose", "Test proposal", "A proposes"),
      mockResponse("assent", "p-1", "B assents"),
      mockResponse("assent", "p-1", "C assents"),
      mockResponse("pass", undefined, "A"),
      mockResponse("pass", undefined, "B"),
      mockResponse("pass", undefined, "C"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        reasoning: "Extended thinking content here",
        duration_ms: 150,
        usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300, cost_usd: 0.01 },
      };
    });

    const state = createInitialState("Logging test", "With context", testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("consensus");

    // Check turn_log has full logging
    const turnLog = result.state.turn_log;
    expect(turnLog.length).toBeGreaterThan(0);

    const firstTurn = turnLog[0];
    expect(firstTurn.prompt_sent).toBeDefined();
    expect(firstTurn.prompt_sent.length).toBeGreaterThan(0);
    expect(firstTurn.raw_response).toBeDefined();
    expect(firstTurn.reasoning).toBe("Extended thinking content here");
    expect(firstTurn.duration_ms).toBe(150);
    expect(firstTurn.usage?.cost_usd).toBe(0.01);
  });

  it("includes identity_map and system_prompt in state", async () => {
    mockDispatchOne.mockImplementation(async () => ({
      reviewer_id: "test",
      status: "ok" as const,
      content: mockResponse("pass", undefined, "pass"),
      duration_ms: 50,
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    }));

    const shortConfig: ConsensusConfig = {
      ...testConfig,
      turn_limit: 3,
    };

    const state = createInitialState("Identity test", undefined, shortConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    // Should have identity map (note: participant order is shuffled for anonymity)
    expect(result.state.identity_map).toBeDefined();
    const models = Object.values(result.state.identity_map!);
    expect(models).toHaveLength(3);
    expect(models).toContain("test-model-a");
    expect(models).toContain("test-model-b");
    expect(models).toContain("test-model-c");

    // Should have system prompt logged
    expect(result.state.system_prompt).toBeDefined();
    expect(result.state.system_prompt!.length).toBeGreaterThan(100);
    expect(result.state.system_prompt).toContain("Consensus Roundtable");
  });

  it("logs proposal content to stdout for midstream visibility", async () => {
    const proposalContent = "This is my detailed proposal for answering the question with specific evidence and reasoning.";
    const responses = [
      mockResponse("propose", proposalContent, "A proposes with details"),
      mockResponse("assent", "p-1", "B assents"),
      mockResponse("assent", "p-1", "C assents"),
      mockResponse("pass", undefined, "A"),
      mockResponse("pass", undefined, "B"),
      mockResponse("pass", undefined, "C"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    // Capture log output
    const logOutput: string[] = [];
    const state = createInitialState("Logging test", undefined, testConfig);
    const result = await runConsensusRoundtable(state, {
      onLog: (msg) => logOutput.push(msg)
    });

    expect(result.outcome).toBe("consensus");

    // Check that proposal content was logged
    const proposalLogLine = logOutput.find(line => line.includes("Proposal:"));
    expect(proposalLogLine).toBeDefined();
    expect(proposalLogLine).toContain("This is my detailed proposal");
  });

  it("truncates long proposal content in logs", async () => {
    const longContent = "A".repeat(300); // 300 chars, should truncate at 200
    const responses = [
      mockResponse("propose", longContent, "A proposes long"),
      mockResponse("assent", "p-1", "B assents"),
      mockResponse("assent", "p-1", "C assents"),
      mockResponse("pass", undefined, "A"),
      mockResponse("pass", undefined, "B"),
      mockResponse("pass", undefined, "C"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const logOutput: string[] = [];
    const state = createInitialState("Truncation test", undefined, testConfig);
    await runConsensusRoundtable(state, {
      onLog: (msg) => logOutput.push(msg)
    });

    const proposalLogLine = logOutput.find(line => line.includes("Proposal:"));
    expect(proposalLogLine).toBeDefined();
    // Should be truncated with "..."
    expect(proposalLogLine).toContain("...");
    // Should not contain the full 300 chars
    expect(proposalLogLine!.length).toBeLessThan(300);
  });

  it("handles parse failures with retry and fallback to pass", async () => {
    // First call returns garbage, retry also garbage, then falls back to pass
    let callCount = 0;
    mockDispatchOne.mockImplementation(async () => {
      callCount++;
      if (callCount <= 3) {
        // First participant gets garbage responses
        return {
          reviewer_id: "test",
          status: "ok" as const,
          content: "This is not a valid action format at all! @#$%",
          duration_ms: 100,
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
      }
      // Subsequent participants respond correctly
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: mockResponse("pass", undefined, "pass"),
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const shortConfig: ConsensusConfig = {
      ...testConfig,
      turn_limit: 6,
    };

    const state = createInitialState("Parse test", undefined, shortConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    // Should complete without crashing
    expect(["consensus", "hung_jury"]).toContain(result.outcome);

    // First turn should be logged as pass (fallback)
    expect(result.state.turn_log[0].action.action).toBe("pass");
  });

  it("tracks supersession when party assents to another's proposal (S410 #27)", async () => {
    // A proposes, B proposes, C assents to A's, then B assents to A's (supersession)
    const responses = [
      // Round 1: A and B propose, C assents to A
      mockResponse("propose", "A's proposal", "A proposes"),
      mockResponse("propose", "B's proposal", "B proposes"),
      mockResponse("assent", "p-1", "C agrees with A"),
      // Round 2: A passes, B assents to A (supersedes own), C passes
      mockResponse("pass", undefined, "A maintains"),
      "ACTION: assent\nTARGET: p-1\nRATIONALE: |\n  A's proposal better addresses the core question\n",
      mockResponse("pass", undefined, "C maintains"),
      // Residual concern round
      mockResponse("pass", undefined, "A satisfied"),
      mockResponse("pass", undefined, "B satisfied"),
      mockResponse("pass", undefined, "C satisfied"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const state = createInitialState("Supersession test", undefined, testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("consensus");
    if (result.outcome === "consensus") {
      expect(result.output.supersessions).toBeDefined();
      expect(result.output.supersessions!.length).toBe(1);
      expect(result.output.supersessions![0].party).toBe("Party B");
      expect(result.output.supersessions![0].superseded_proposal).toBe("p-2");
      expect(result.output.supersessions![0].adopted_proposal).toBe("p-1");
      expect(result.output.supersessions![0].reason).toContain("core question");
    }
  });

  it("collects residual concerns after consensus (S410 #16)", async () => {
    // Responses for consensus + residual concern round
    const responses = [
      // Round 1: consensus achieved
      mockResponse("propose", "The answer is 42", "A proposes"),
      mockResponse("assent", "p-1", "B agrees"),
      mockResponse("assent", "p-1", "C agrees"),
      // Round 2: stability
      mockResponse("pass", undefined, "A maintains"),
      mockResponse("pass", undefined, "B maintains"),
      mockResponse("pass", undefined, "C maintains"),
      // Residual concern round: A has concern, B passes, C has concern
      mockResponse("residual_concern", "Would have preferred a longer explanation", "A's concern"),
      mockResponse("pass", undefined, "B satisfied"),
      mockResponse("residual_concern", "Edge cases not fully addressed", "C's concern"),
    ];

    let callIndex = 0;
    mockDispatchOne.mockImplementation(async () => {
      const resp = responses[callIndex++];
      return {
        reviewer_id: "test",
        status: "ok" as const,
        content: resp,
        duration_ms: 100,
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    });

    const state = createInitialState("Residual concern test", undefined, testConfig);
    const result = await runConsensusRoundtable(state, { onLog: () => {} });

    expect(result.outcome).toBe("consensus");
    if (result.outcome === "consensus") {
      expect(result.output.residual_concerns).toBeDefined();
      expect(result.output.residual_concerns!.length).toBe(2);
      expect(result.output.residual_concerns![0].party).toBe("Party A");
      expect(result.output.residual_concerns![0].concern).toContain("longer explanation");
      expect(result.output.residual_concerns![1].party).toBe("Party C");
      expect(result.output.residual_concerns![1].concern).toContain("Edge cases");
    }
  });
});

// Helper to create mock response strings
function mockResponse(action: string, targetOrContent?: string, rationale: string = "Test rationale"): string {
  let response = `ACTION: ${action}\n`;

  if (action === "propose" || action === "meta_propose" || action === "synthesize" || action === "amend" || action === "residual_concern") {
    response += `CONTENT: |\n  ${targetOrContent}\n`;
  } else if (action === "object") {
    response += `TARGET: ${targetOrContent}\nCONTENT: |\n  Objection reason\n`;
  } else if (targetOrContent && ["assent", "retract_assent", "call_vote", "withdraw", "narrow"].includes(action)) {
    response += `TARGET: ${targetOrContent}\n`;
  }

  response += `RATIONALE: |\n  ${rationale}`;
  return response;
}
