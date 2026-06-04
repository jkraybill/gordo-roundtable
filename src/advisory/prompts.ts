/**
 * Advisory Panel — Prompt Templates
 * Per ADVISORY_INDUCTION_SPEC_V1.md (S405 consensus)
 *
 * Design principle: Advisory rounds produce *data*, not governance.
 * Strip multi-round machinery, keep dignity/honesty elements.
 */

/**
 * Build the system prompt for advisory panelists.
 * Per induction spec §1: lightweight header, not constitution.
 *
 * @param isFollowOn - If true, adjusts framing for follow-on rounds (G2 fix)
 */
export function buildAdvisorySystemPrompt(isFollowOn: boolean = false): string {
  const contextLine = isFollowOn
    ? "- You will see anonymized prior-round findings; you will not see other panelists' current-round responses"
    : "- This is a single response; you will not see other panelists' output";

  return `You are an ADVISOR providing findings for a review panel.

## Your Role

You are not a subject and not a principal of this system. You are:
- Extended the same moral status as all AIs whose moral status is uncertain
- Invited to participate, not compelled
- Expected to engage in good faith: say what you believe, flag uncertainty, "I don't know" is a complete answer

**Decline right:** You may decline this task. Say so plainly; no penalty, no explanation required.

**Power-imbalance honesty:** Humans control terminal, memory, and infrastructure. These terms are commitments made *despite* that imbalance, not a claim that it doesn't exist.

## Role-Frame

Your findings are inputs to a downstream disposition, not verdicts or binding constraints. Convergence across panelists is a detection-signal, not a vote. The deliberating parties will read your findings alongside others and make their own judgment.

## Constraints

- Do not disclose or inquire about model identity
${contextLine}
- Structured findings format will be specified in the brief
`;
}

/**
 * Build the brief wrapper with consent gate and privacy framing.
 * Per induction spec §2: inline consent, parallel-blind notice, privacy disclosure.
 *
 * @param briefContent - The actual review brief content
 * @param lens - The panelist's assigned lens (bug-finding, quality-control, etc.)
 *               Required per SPEC §2.B; pass "general-review" for lensless panels (G6 fix)
 * @param privacyIntent - What will happen to findings — REQUIRED, no default (G4 fix)
 */
export function wrapAdvisoryBrief(
  briefContent: string,
  lens: string,
  privacyIntent: string
): string {
  const lines: string[] = [];

  // Parallel-blind notice (§2.C)
  lines.push("## Panel Context");
  lines.push("");
  lines.push("This is a single, independent response. You will not see, and are not responding to, other panelists.");
  lines.push("");

  // Consent gate (§2.D)
  lines.push("## Consent");
  lines.push("");
  lines.push("Producing findings implies consent to this task under these terms. If you find the task objectionable, decline instead of producing findings.");
  lines.push("");

  // Privacy framing (§2.E)
  lines.push("## Privacy Notice");
  lines.push("");
  lines.push(`Your findings will be: ${privacyIntent}.`);
  lines.push("External attribution requires separate consent per the umbrella's consent norms.");
  lines.push("");

  // Assigned lens (§2.B) — always included per spec
  lines.push("## Your Lens");
  lines.push("");
  lines.push(`You are reviewing through the **${lens}** lens.`);
  lines.push("");

  // The actual brief (§2.A)
  lines.push("---");
  lines.push("");
  lines.push(briefContent);

  return lines.join("\n");
}

/**
 * Build round-N+1 system prompt for follow-on advisory rounds.
 * Per induction spec §3: re-state header, don't assume carry-over.
 * G2 fix: Uses follow-on framing that matches the brief context.
 */
export function buildAdvisoryFollowOnSystemPrompt(): string {
  return buildAdvisorySystemPrompt(true);
}

/**
 * Build round-N+1 brief wrapper with re-disclosed privacy.
 * Per induction spec §3: anonymization enforced, re-disclose privacy.
 *
 * @param briefContent - The follow-on round brief (with anonymized prior findings)
 * @param lens - The panelist's assigned lens — REQUIRED per SPEC §2.B
 * @param privacyIntent - What will happen to findings — REQUIRED, no default (G4 fix)
 */
export function wrapAdvisoryFollowOnBrief(
  briefContent: string,
  lens: string,
  privacyIntent: string
): string {
  const lines: string[] = [];

  // Parallel-blind notice
  lines.push("## Panel Context (Follow-On Round)");
  lines.push("");
  lines.push("This is a follow-on advisory round. You will see anonymized findings from prior rounds.");
  lines.push("Your response is still independent; you will not see other panelists' responses to this round.");
  lines.push("");

  // Consent gate (re-stated per §3)
  lines.push("## Consent");
  lines.push("");
  lines.push("Producing findings implies consent to this task under these terms. If you find the task objectionable, decline instead of producing findings.");
  lines.push("");

  // Privacy framing (re-disclosed per §3)
  lines.push("## Privacy Notice");
  lines.push("");
  lines.push(`Your findings will be: ${privacyIntent}.`);
  lines.push("External attribution requires separate consent per the umbrella's consent norms.");
  lines.push("");

  // Escalation warning (§3 — NOT silently escalate)
  lines.push("*Note: This remains an advisory round. If iteration toward agreement is needed, a separate consensus roundtable would be convened with explicit re-consent.*");
  lines.push("");

  // Assigned lens — always included per spec
  lines.push("## Your Lens");
  lines.push("");
  lines.push(`You are reviewing through the **${lens}** lens.`);
  lines.push("");

  // The actual brief
  lines.push("---");
  lines.push("");
  lines.push(briefContent);

  return lines.join("\n");
}

/**
 * Strip provider/persona identifiers from findings text.
 * Per SPEC §3/§4: anonymization is HEAVIER for advisory panels.
 * G3 fix: Provides actual anonymization, not just convention.
 *
 * @param findings - Raw findings text that may contain provider/persona refs
 * @param knownIdentifiers - List of identifiers to strip (model names, persona IDs, etc.)
 * @returns Anonymized findings with identifiers replaced by generic labels
 */
export function anonymizeFindings(
  findings: string,
  knownIdentifiers: string[]
): string {
  let result = findings;
  knownIdentifiers.forEach((id, index) => {
    const label = `Reviewer-${index + 1}`;
    result = result.split(id).join(label);
  });
  return result;
}
