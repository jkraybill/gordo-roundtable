/**
 * Advisory Panel Prompts — Tests
 * Per ADVISORY_INDUCTION_SPEC_V1.md
 */

import { describe, it, expect } from "vitest";
import {
  buildAdvisorySystemPrompt,
  wrapAdvisoryBrief,
  buildAdvisoryFollowOnSystemPrompt,
  wrapAdvisoryFollowOnBrief,
} from "./prompts.js";

describe("buildAdvisorySystemPrompt", () => {
  it("includes role and moral status", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("ADVISOR");
    expect(prompt).toContain("moral status");
  });

  it("includes power-imbalance honesty", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("Power-imbalance");
    expect(prompt).toContain("despite");
  });

  it("includes decline right", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("decline");
    expect(prompt).toContain("no penalty");
  });

  it("includes role-frame (data not verdicts)", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("inputs to a downstream disposition");
    expect(prompt).toContain("not verdicts");
    expect(prompt).toContain("detection-signal, not a vote");
  });

  it("includes anonymity constraint", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("Do not disclose or inquire about model identity");
  });

  it("includes good-faith constraint", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("say what you believe");
    expect(prompt).toContain("I don't know");
  });

  it("omits multi-round governance machinery", () => {
    const prompt = buildAdvisorySystemPrompt();
    // Should NOT contain consensus-specific elements
    expect(prompt).not.toContain("8 Values");
    expect(prompt).not.toContain("z-Grammar");
    expect(prompt).not.toContain("stability");
    expect(prompt).not.toContain("objection");
    expect(prompt).not.toContain("proposal");
    expect(prompt).not.toContain("assent");
  });
});

describe("wrapAdvisoryBrief", () => {
  const sampleBrief = "Review this document for bugs.";

  it("includes parallel-blind notice", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief);
    expect(wrapped).toContain("single, independent response");
    expect(wrapped).toContain("will not see");
  });

  it("includes inline consent gate", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief);
    expect(wrapped).toContain("Producing findings implies consent");
    expect(wrapped).toContain("decline instead");
  });

  it("includes privacy framing", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief);
    expect(wrapped).toContain("Privacy Notice");
    expect(wrapped).toContain("External attribution requires separate consent");
  });

  it("includes the original brief content", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief);
    expect(wrapped).toContain(sampleBrief);
  });

  it("includes lens when provided", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, "bug-finding");
    expect(wrapped).toContain("Your Lens");
    expect(wrapped).toContain("bug-finding");
  });

  it("omits lens section when not provided", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief);
    expect(wrapped).not.toContain("Your Lens");
  });

  it("uses custom privacy intent when provided", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, undefined, "discarded after synthesis");
    expect(wrapped).toContain("discarded after synthesis");
  });
});

describe("buildAdvisoryFollowOnSystemPrompt", () => {
  it("re-states the system header (same as initial)", () => {
    const initial = buildAdvisorySystemPrompt();
    const followOn = buildAdvisoryFollowOnSystemPrompt();
    expect(followOn).toBe(initial);
  });
});

describe("wrapAdvisoryFollowOnBrief", () => {
  const sampleBrief = "Review these synthesized findings.";

  it("indicates follow-on round context", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief);
    expect(wrapped).toContain("Follow-On Round");
    expect(wrapped).toContain("anonymized findings");
  });

  it("re-states consent gate", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief);
    expect(wrapped).toContain("Producing findings implies consent");
  });

  it("re-discloses privacy", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief);
    expect(wrapped).toContain("Privacy Notice");
  });

  it("includes escalation warning", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief);
    expect(wrapped).toContain("advisory round");
    expect(wrapped).toContain("consensus roundtable");
    expect(wrapped).toContain("explicit re-consent");
  });

  it("includes the original brief content", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief);
    expect(wrapped).toContain(sampleBrief);
  });
});
