/**
 * Consensus Roundtable — Orchestrator Tests
 */

import { describe, it, expect } from "vitest";
import { parseAction, extractReasoningTrace } from "./orchestrator.js";

describe("parseAction", () => {
  it("parses propose action", () => {
    const response = `ACTION: propose
CONTENT: |
  I propose we answer: Yes
RATIONALE: |
  This is the correct answer.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("propose");
      expect(result.content).toBe("I propose we answer: Yes");
    }
  });

  it("parses object action", () => {
    const response = `ACTION: object
TARGET: p-1
CONTENT: |
  This proposal is incomplete.
RATIONALE: |
  It doesn't address the edge case.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("object");
      expect(result.target_id).toBe("p-1");
      expect(result.reason).toBe("This proposal is incomplete.");
    }
  });

  it("parses assent action", () => {
    const response = `ACTION: assent
TARGET: p-2
RATIONALE: |
  I agree with this proposal.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("assent");
      expect(result.target_id).toBe("p-2");
    }
  });

  it("parses pass action", () => {
    const response = `ACTION: pass
RATIONALE: |
  I need more information.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("pass");
    }
  });

  it("returns error for missing ACTION", () => {
    const response = `TARGET: p-1
CONTENT: Something`;

    const result = parseAction(response);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("No ACTION found");
    }
  });

  it("returns error for unknown action type", () => {
    const response = `ACTION: explode
RATIONALE: Boom`;

    const result = parseAction(response);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Unknown action type");
    }
  });

  it("handles case-insensitive action", () => {
    const response = `ACTION: PROPOSE
CONTENT: |
  My proposal`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("propose");
    }
  });

  it("parses single-line content", () => {
    const response = `ACTION: propose
CONTENT: Simple one-line proposal
RATIONALE: Brief`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.content).toBe("Simple one-line proposal");
    }
  });

  it("parses call_vote action", () => {
    const response = `ACTION: call_vote
TARGET: p-3
RATIONALE: |
  I believe we have reached agreement.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("call_vote");
      expect(result.target_id).toBe("p-3");
    }
  });

  it("parses withdraw action", () => {
    const response = `ACTION: withdraw
TARGET: o-1
RATIONALE: |
  My objection has been addressed.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("withdraw");
      expect(result.target_id).toBe("o-1");
    }
  });

  it("parses multi-line content with blank lines inside", () => {
    const response = `ACTION: synthesize
CONTENT: |
  **Roundtable Induction Spec (v2)**

  This is paragraph one.

  This is paragraph two with a blank line before it.

  ## Section Header

  More content here.
RATIONALE: |
  Synthesizing multiple proposals.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.action).toBe("synthesize");
      expect(result.content).toContain("**Roundtable Induction Spec (v2)**");
      expect(result.content).toContain("paragraph one");
      expect(result.content).toContain("paragraph two");
      expect(result.content).toContain("## Section Header");
      expect(result.content).toContain("More content here");
      // Should NOT include RATIONALE
      expect(result.content).not.toContain("Synthesizing");
    }
  });

  it("parses content at end of response (no RATIONALE)", () => {
    const response = `ACTION: propose
CONTENT: |
  This is a proposal.

  With multiple paragraphs.`;

    const result = parseAction(response);

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.content).toContain("This is a proposal");
      expect(result.content).toContain("multiple paragraphs");
    }
  });
});

describe("extractReasoningTrace", () => {
  it("extracts reasons from bullet points", () => {
    const response = `ACTION: assent
TARGET: p-3
RATIONALE: |
  - Addresses my concern about borrowed interiority
  - Compatible with epistemic honesty stance
  - Builds on prior discussion`;

    const action = { action: "assent" as const, target_id: "p-3" };
    const trace = extractReasoningTrace(response, action);

    expect(trace.action_taken).toBe("assent");
    expect(trace.target).toBe("p-3");
    expect(trace.reasons).toContain("Addresses my concern about borrowed interiority");
    expect(trace.reasons).toContain("Compatible with epistemic honesty stance");
    expect(trace.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts reasons from 'because' clauses", () => {
    const response = `ACTION: object
TARGET: p-1
CONTENT: |
  This is incomplete.
RATIONALE: |
  I object because the proposal does not handle edge cases. This matters because users will encounter these scenarios.`;

    const action = { action: "object" as const, target_id: "p-1" };
    const trace = extractReasoningTrace(response, action);

    expect(trace.reasons).toContain("the proposal does not handle edge cases");
    expect(trace.reasons.some(r => r.includes("users will encounter"))).toBe(true);
  });

  it("extracts concerns addressed", () => {
    const response = `ACTION: assent
TARGET: p-2
RATIONALE: |
  This addresses my concern about data privacy. It also resolves the issue with authentication flow.`;

    const action = { action: "assent" as const, target_id: "p-2" };
    const trace = extractReasoningTrace(response, action);

    expect(trace.concerns_addressed).toBeDefined();
    expect(trace.concerns_addressed!.some(c => c.includes("data privacy"))).toBe(true);
  });

  it("extracts concerns remaining", () => {
    const response = `ACTION: pass
RATIONALE: |
  The proposal is good but still doesn't address the performance question. However, my concern about security remains.`;

    const action = { action: "pass" as const };
    const trace = extractReasoningTrace(response, action);

    expect(trace.concerns_remaining).toBeDefined();
    expect(trace.concerns_remaining!.some(c => c.includes("performance"))).toBe(true);
  });

  it("extracts proposal/objection references", () => {
    const response = `ACTION: synthesize
CONTENT: |
  Combined approach
RATIONALE: |
  This synthesizes p-1 and p-2, while addressing objection o-1.`;

    const action = { action: "synthesize" as const };
    const trace = extractReasoningTrace(response, action);

    expect(trace.references).toBeDefined();
    expect(trace.references).toContain("p-1");
    expect(trace.references).toContain("p-2");
    expect(trace.references).toContain("o-1");
  });

  it("handles single-line rationale", () => {
    const response = `ACTION: pass
RATIONALE: I have no objections at this time.`;

    const action = { action: "pass" as const };
    const trace = extractReasoningTrace(response, action);

    expect(trace.reasons.length).toBe(1);
    expect(trace.reasons[0]).toContain("no objections");
  });

  it("handles empty rationale gracefully", () => {
    const response = `ACTION: pass
TARGET: none`;

    const action = { action: "pass" as const };
    const trace = extractReasoningTrace(response, action);

    expect(trace.action_taken).toBe("pass");
    expect(trace.reasons).toEqual([]);
  });
});
