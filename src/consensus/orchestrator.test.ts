/**
 * Consensus Roundtable — Orchestrator Tests
 */

import { describe, it, expect } from "vitest";
import { parseAction } from "./orchestrator.js";

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
