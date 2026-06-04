/**
 * Advisory Panel Prompts — Tests
 * Per ADVISORY_INDUCTION_SPEC_V1.md
 * Updated per S405 validation roundtable fixes (G1-G6)
 */

import { describe, it, expect } from "vitest";
import {
  buildAdvisorySystemPrompt,
  wrapAdvisoryBrief,
  buildAdvisoryFollowOnSystemPrompt,
  wrapAdvisoryFollowOnBrief,
  anonymizeFindings,
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

  it("says 'single response' for initial round (default)", () => {
    const prompt = buildAdvisorySystemPrompt();
    expect(prompt).toContain("This is a single response");
    expect(prompt).toContain("will not see other panelists' output");
  });

  it("says 'anonymized prior-round findings' for follow-on (G2 fix)", () => {
    const prompt = buildAdvisorySystemPrompt(true);
    expect(prompt).toContain("anonymized prior-round findings");
    expect(prompt).toContain("will not see other panelists' current-round responses");
    expect(prompt).not.toContain("This is a single response");
  });
});

describe("wrapAdvisoryBrief", () => {
  const sampleBrief = "Review this document for bugs.";
  const lens = "bug-finding";
  const privacy = "stored and synthesized";

  it("includes parallel-blind notice", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("single, independent response");
    expect(wrapped).toContain("will not see");
  });

  it("includes inline consent gate", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Producing findings implies consent");
    expect(wrapped).toContain("decline instead");
  });

  it("includes privacy framing", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Privacy Notice");
    expect(wrapped).toContain("External attribution requires separate consent");
  });

  it("includes the original brief content", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain(sampleBrief);
  });

  it("always includes lens section (G6 fix)", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Your Lens");
    expect(wrapped).toContain("bug-finding");
  });

  it("uses provided privacy intent (G4 fix — no default)", () => {
    const wrapped = wrapAdvisoryBrief(sampleBrief, lens, "discarded after synthesis");
    expect(wrapped).toContain("discarded after synthesis");
  });
});

describe("buildAdvisoryFollowOnSystemPrompt", () => {
  it("uses follow-on framing (G2 fix)", () => {
    const followOn = buildAdvisoryFollowOnSystemPrompt();
    expect(followOn).toContain("anonymized prior-round findings");
    expect(followOn).not.toContain("This is a single response");
  });

  it("differs from initial prompt (G2 fix)", () => {
    const initial = buildAdvisorySystemPrompt();
    const followOn = buildAdvisoryFollowOnSystemPrompt();
    expect(followOn).not.toBe(initial);
  });
});

describe("wrapAdvisoryFollowOnBrief", () => {
  const sampleBrief = "Review these synthesized findings.";
  const lens = "quality-control";
  const privacy = "stored for disposition";

  it("indicates follow-on round context", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Follow-On Round");
    expect(wrapped).toContain("anonymized findings");
  });

  it("re-states consent gate", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Producing findings implies consent");
  });

  it("re-discloses privacy", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Privacy Notice");
  });

  it("includes escalation warning", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("advisory round");
    expect(wrapped).toContain("consensus roundtable");
    expect(wrapped).toContain("explicit re-consent");
  });

  it("includes the original brief content", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain(sampleBrief);
  });

  it("always includes lens section", () => {
    const wrapped = wrapAdvisoryFollowOnBrief(sampleBrief, lens, privacy);
    expect(wrapped).toContain("Your Lens");
    expect(wrapped).toContain("quality-control");
  });
});

describe("anonymizeFindings (G3 fix)", () => {
  it("replaces known identifiers with generic labels", () => {
    const findings = "claude-opus-4.8 found a bug. gpt-5 agreed.";
    const identifiers = ["claude-opus-4.8", "gpt-5"];
    const result = anonymizeFindings(findings, identifiers);
    expect(result).toBe("Reviewer-1 found a bug. Reviewer-2 agreed.");
  });

  it("handles multiple occurrences of same identifier", () => {
    const findings = "claude said X. Then claude said Y.";
    const identifiers = ["claude"];
    const result = anonymizeFindings(findings, identifiers);
    expect(result).toBe("Reviewer-1 said X. Then Reviewer-1 said Y.");
  });

  it("preserves text when no identifiers match", () => {
    const findings = "Some generic findings.";
    const identifiers = ["not-present"];
    const result = anonymizeFindings(findings, identifiers);
    expect(result).toBe("Some generic findings.");
  });

  it("handles empty identifier list", () => {
    const findings = "Some findings.";
    const result = anonymizeFindings(findings, []);
    expect(result).toBe("Some findings.");
  });
});
