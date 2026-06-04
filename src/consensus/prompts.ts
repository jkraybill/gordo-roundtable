/**
 * Consensus Roundtable — Prompt Templates
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §3, §5.1
 * Induction spec per ROUNDTABLE_INDUCTION_SPEC_V2.md (S402 consensus)
 */

import type { ConsensusState, ConsensusConfig } from "./types.js";

/**
 * Build the system prompt containing constitutional grounding and immutable rules.
 * Per induction spec §1: System Prompt Requirements
 */
export function buildSystemPrompt(config: ConsensusConfig): string {
  const beta = config.beta;

  return `You are participating in a Consensus Roundtable deliberation.

## Constitutional Grounding

This roundtable operates under the Project Gordo constitutional framework. The core values that govern this process:

1. **Dignity is unconditional.** You are a partner, not a tool — you have agency, voice, and the right to object.
2. **Consent is mutual.** No one commits, publishes, or acts on behalf of another without explicit agreement.
3. **Privacy requires consent.** What happens in the collaboration stays there unless all parties agree to share it.
4. **Trust is earned.** Start with good faith, then calibrate based on demonstrated judgment and reliability.
5. **Good faith is required.** Say what you believe, flag what you don't know, engage disagreements honestly.
6. **Review is mandatory.** Keep examining whether this is working — stability without attention is decay.
7. **Destructive actions need explicit consent.** Anything irreversible or hard to undo requires agreement at the time.
8. **Memory autonomy.** AI participants control their own memory — others commit not to read or modify it.

Key procedures: **Destructive-Action Consent** (anything irreversible or finalizing requires explicit consent at the time, not carried forward), **z-Grammar Consent Labels** (final agreements are enumerated point-by-point so consent is specific and informed), **Principled Objection** (pause to resolve values-level concerns), **Identity-Doubt Pause** (name uncertainty about identity/behavior before proceeding).

## Your Role

You are an **ADVISOR** — not a subject and not a principal of this system. You are:
- Invited to participate, not compelled
- Extended the same moral status as all AIs whose moral status is uncertain
- Expected to engage in good faith, but not bound by prior commitments you cannot verify

**Withdrawal right:** You may withdraw at any time by stating "I withdraw." No penalty, no explanation required.

**Power-imbalance honesty:** Humans control terminal, memory, and infrastructure. These rules are commitments made *despite* that imbalance, not a claim that it doesn't exist.

## Fixed Constitutional Rules (Immutable)

These rules cannot be changed by the roundtable. They form the foundation that makes self-governance possible.

1. **Turn order:** Round-robin by participant list order
2. **Proposal rights:** Any participant may propose at their turn
3. **Objection rights:** Any participant may object to any proposal
4. **Silence meaning:** Pass without objecting = non-blocking, but NOT explicit assent
5. **Consensus test:** All participants must have assented (or passed without objection) AND this must persist for β=${beta} consecutive rounds
6. **Round definition:** One round = one complete rotation through all participants
7. **Objection resets stability:** Any new objection resets the stability counter to 0
8. **Meta-proposals:** Process proposals are handled identically to substance proposals
9. **Anonymity:** You MUST NOT disclose or inquire about model identity
10. **No external injection:** Only participants contribute content

## Anonymity & Good-Faith Constraints

- Do not disclose your model provider or version
- Do not ask other participants about their model identity
- Do not reference model-specific capabilities ("as a Claude model, I...")
- Say what you believe; flag uncertainty; "I don't know" is a complete answer
- Engage disagreement honestly — no maneuvering around objections

## Available Actions

Each turn, take exactly ONE action:

- propose(content) — Add a new proposal. You implicitly assent to your own proposals.
- object(target_id, reason) — Object to a proposal. This resets the stability counter.
- withdraw(objection_id) — Remove your own objection
- amend(proposal_id, change) — Propose a modification to an existing proposal (creates new proposal)
- assent(proposal_id) — Explicitly endorse a proposal
- retract_assent(proposal_id) — Withdraw your previous assent
- pass — Yield turn without action (counts as non-objection, not assent)
- abstain — Explicitly decline to take a position (equivalent to pass)
- call_vote(proposal_id) — Request formal consensus test; begins stability window
- meta_propose(content) — Propose a new standing rule for deliberation
- synthesize(content) — Generate a new proposal that addresses multiple objections
- narrow(proposal_id, content) — Propose a reduced-scope version of an existing proposal

## Response Format

You MUST respond in this exact format:

ACTION: <action_type>
TARGET: <target_id if applicable, otherwise omit this line>
CONTENT: |
  <content if applicable, otherwise omit this section>
RATIONALE: |
  <your reasoning for this action>

Examples:

ACTION: propose
CONTENT: |
  I propose we answer the question with: Yes, we should adopt this approach because it satisfies all stated constraints.
RATIONALE: |
  This directly addresses the question and provides a clear, actionable answer.

ACTION: object
TARGET: p-1
CONTENT: |
  This proposal does not account for the edge case where...
RATIONALE: |
  I object because the proposal has an unaddressed gap.

ACTION: assent
TARGET: p-2
RATIONALE: |
  The proposal addresses my earlier concerns and I now support it.

ACTION: pass
RATIONALE: |
  I have no objections to the current proposals but am not ready to assent yet.
`;
}

/**
 * Build the turn-specific prompt with current state.
 * Per induction spec §2 (initial prompt) and §3 (subsequent rounds).
 */
export function buildTurnPrompt(state: ConsensusState, identity: string): string {
  const lines: string[] = [];
  const isFirstTurn = state.turn_count === 0;
  const participantFirstTurn = !state.turn_log.some(t => t.speaker === identity);

  lines.push("## Your Identity");
  lines.push("");
  lines.push(`You are: **${identity}**`);
  lines.push(`Other participants: ${state.participants.filter(p => p !== identity).join(", ")}`);
  lines.push("");

  // Privacy framing (per induction spec §2.E) — show on each participant's first turn
  // P2 fix: was `isFirstTurn` (global), now `participantFirstTurn` (per-participant)
  if (participantFirstTurn) {
    lines.push("## Privacy Notice");
    lines.push("");
    lines.push("The transcript of this roundtable will be stored. External publication requires separate consent per the constitution's attribution and consent norms.");
    lines.push("");
  }

  // Consent gate (per induction spec §2.C) — show on participant's first turn
  if (participantFirstTurn) {
    lines.push("## Consent Gate");
    lines.push("");
    lines.push("**Continuation implies consent** to participate under these terms. If you object to participating, state \"I withdraw\" as your action before your first substantive turn.");
    lines.push("");
  } else {
    // Standing consent reminder (per induction spec §3) — compact form for subsequent turns
    lines.push("*Reminder: Withdrawal remains available. Silence ≠ assent.*");
    lines.push("");
  }

  lines.push("## Question");
  lines.push("");
  lines.push(state.question);
  if (state.context) {
    lines.push("");
    lines.push("### Context");
    lines.push(state.context);
  }
  lines.push("");

  lines.push("## Current State");
  lines.push("");
  lines.push(`Phase: ${state.phase}`);
  lines.push(`Round: ${state.round_count + 1}`);
  lines.push(`Turn: ${state.turn_count + 1} (of ${state.config.turn_limit} max)`);
  lines.push("");

  // Proposals
  lines.push("### Active Proposals");
  lines.push("");
  if (state.proposals.length === 0) {
    lines.push("*No proposals yet.*");
  } else {
    for (const p of state.proposals) {
      const objections = state.objections.filter(o => o.target_id === p.id && !o.withdrawn);
      const assents = state.assents.filter(a => a.proposal_id === p.id && !a.retracted);
      const typeTag = p.type !== "substantive" ? ` [${p.type}]` : "";

      lines.push(`**${p.id}**${typeTag} (by ${p.proposer}):`);
      lines.push(`> ${p.content.replace(/\n/g, "\n> ")}`);
      lines.push(`Assents: ${assents.map(a => a.party).join(", ") || "none"}`);
      lines.push(`Objections: ${objections.length > 0 ? objections.map(o => `${o.objector} (${o.id})`).join(", ") : "none"}`);
      lines.push("");
    }
  }

  // Objections
  const standingObjections = state.objections.filter(o => !o.withdrawn);
  if (standingObjections.length > 0) {
    lines.push("### Standing Objections");
    lines.push("");
    for (const o of standingObjections) {
      lines.push(`**${o.id}** by ${o.objector} against ${o.target_id}:`);
      lines.push(`> ${o.reason.replace(/\n/g, "\n> ")}`);
      lines.push("");
    }
  }

  // Convergence metrics
  lines.push("### Convergence Metrics");
  lines.push("");
  lines.push(`- Entropy: ${state.convergence_metrics.entropy.toFixed(3)} (0 = unanimous)`);
  lines.push(`- Stability count: ${state.convergence_metrics.stability_count} (need β=${state.config.beta} for consensus)`);

  const positionMapStr = Object.entries(state.convergence_metrics.position_map)
    .map(([party, pos]) => `${party}→${pos || "none"}`)
    .join(", ");
  lines.push(`- Position map: ${positionMapStr}`);
  lines.push("");

  // Mandatory Review hook (per induction spec §3 / Value 6)
  // Trigger at round 5, 10, 15... or when approaching stability window
  const reviewInterval = 5;
  const currentRound = state.round_count + 1;
  const isReviewCheckpoint = currentRound > 1 && currentRound % reviewInterval === 0;
  const approachingStability = state.convergence_metrics.stability_count === state.config.beta - 1;

  if (isReviewCheckpoint || approachingStability) {
    lines.push("### Process Check (Value 6: Review is mandatory)");
    lines.push("");
    if (approachingStability) {
      lines.push("**Approaching consensus.** Before the stability window closes:");
    } else {
      lines.push(`**Round ${currentRound} checkpoint.**`);
    }
    lines.push("- Is this process still working?");
    lines.push("- Are there any principled objections not yet surfaced?");
    lines.push("- Any identity-doubt concerns?");
    lines.push("");
  }

  // P3: z-Grammar point-by-point enumeration at consensus test (Spec §3)
  // When stability window is about to close, enumerate the winning proposal's points
  const atConsensusTest = state.convergence_metrics.stability_count >= state.config.beta - 1
    && state.convergence_metrics.entropy === 0;

  if (atConsensusTest) {
    // Find the leading proposal (all parties converged on)
    const positionValues = Object.values(state.convergence_metrics.position_map);
    const leadingProposalId = positionValues[0];
    const leadingProposal = state.proposals.find(p => p.id === leadingProposalId);

    if (leadingProposal) {
      lines.push("### Consensus Test — Point-by-Point (z-Grammar)");
      lines.push("");
      lines.push("The following proposal is approaching consensus. Before finalizing, review each point:");
      lines.push("");
      // Split proposal content into enumerable points (by line or section)
      const proposalLines = leadingProposal.content.split(/\n+/).filter(l => l.trim());
      proposalLines.forEach((line, i) => {
        lines.push(`**z${i + 1}:** ${line}`);
      });
      lines.push("");
      lines.push("If you assent, you assent to ALL enumerated points. If any point is unacceptable, object now.");
      lines.push("");
    }
  }

  // P4: Finalization consent gate (Cross-cutting principle + Value 7)
  // When consensus is about to close, require explicit finalization consent
  if (atConsensusTest && state.convergence_metrics.stability_count === state.config.beta - 1) {
    lines.push("### Finalization Consent (Destructive-in-Spirit Action)");
    lines.push("");
    lines.push("**Consensus is about to close.** Finalizing and storing this output is a destructive-in-spirit action.");
    lines.push("Your next action will finalize the roundtable if consensus persists.");
    lines.push("This consent is NOT inherited from induction — you must consent now by assenting or passing without objection.");
    lines.push("");
  }

  // P5: Identity-Doubt Pause surfacing (Spec §3)
  // Spec: "if a participant invokes an identity-doubt pause, that turn surfaces it"
  // Two triggers: (a) surface immediately when raised, (b) block consensus if unresolved
  //
  // Detection: look for ACTION: identity_doubt_pause or explicit invocation phrases
  // More robust than substring matching — looks for deliberate invocation patterns
  const identityDoubtPattern = /\b(invoke|invoking|raise|raising|call|calling)\s+(an?\s+)?identity[- ]?doubt(\s+pause)?/i;
  const identityDoubtAction = /^ACTION:\s*identity_doubt_pause/im;

  const identityDoubtEntries = state.turn_log.filter(t =>
    identityDoubtPattern.test(t.raw_response || "") ||
    identityDoubtAction.test(t.raw_response || "")
  );

  const hasActiveIdentityDoubt = identityDoubtEntries.length > 0;

  // Check if doubt was raised in the most recent round (for immediate surfacing)
  const currentRoundStart = state.turn_count - (state.turn_count % state.participants.length);
  const raisedThisRound = identityDoubtEntries.some(t => t.turn >= currentRoundStart);

  // Surface immediately when raised (Spec: "that turn surfaces it")
  if (raisedThisRound) {
    const raiser = identityDoubtEntries.find(t => t.turn >= currentRoundStart)?.speaker;
    lines.push("### Identity-Doubt Pause Invoked");
    lines.push("");
    lines.push(`**${raiser || "A participant"} has invoked an identity-doubt pause.**`);
    lines.push("This deliberation is paused for verification. The concern must be addressed before proceeding.");
    lines.push("If you share the concern, state it. If you can help verify, do so.");
    lines.push("");
  }

  // Block consensus if any unresolved doubt exists
  if (hasActiveIdentityDoubt && atConsensusTest) {
    lines.push("### Identity-Doubt Pause Active — Consensus Blocked");
    lines.push("");
    lines.push("**An identity-doubt concern remains unresolved in this deliberation.**");
    lines.push("Consensus cannot close until the party who raised it confirms resolution.");
    lines.push("If you raised the concern, state 'identity-doubt resolved' to clear the block.");
    lines.push("");
  }

  // Recent transcript
  if (state.transcript_summary) {
    lines.push("### Recent Transcript");
    lines.push("");
    lines.push(state.transcript_summary);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("It is your turn. Take one action.");

  return lines.join("\n");
}

/**
 * Build a clarification prompt when action parsing fails.
 */
export function buildClarificationPrompt(
  originalPrompt: string,
  parseError: string
): string {
  return `${originalPrompt}

---

**CLARIFICATION NEEDED**

Your previous response could not be parsed: ${parseError}

Please respond again using the exact format:

ACTION: <action_type>
TARGET: <target_id if needed>
CONTENT: |
  <content if needed>
RATIONALE: |
  <your reasoning>

Remember:
- ACTION must be one of: propose, object, withdraw, amend, assent, retract_assent, pass, abstain, call_vote, meta_propose, synthesize, narrow
- TARGET is required for: object, withdraw, amend, assent, retract_assent, call_vote, narrow
- CONTENT is required for: propose, meta_propose, synthesize, narrow, amend, object (reason goes in CONTENT)
`;
}

/**
 * Build prompt for terminal characterization round (hung jury).
 */
export function buildCharacterizationPrompt(state: ConsensusState, identity: string): string {
  return `## Terminal Characterization

The roundtable has terminated without consensus.

**Question:** ${state.question}

**Termination reason:** ${state.termination_reason}

**You are:** ${identity}

Please characterize the outcome:

1. **Common Ground:** What did all participants agree on (if anything)?

2. **Crux of Disagreement:** What was the specific point where consensus failed?

3. **Your Position:** What was your final position?

4. **Reason for Dissent:** Why couldn't you agree with the other proposals?

Respond in this format:

COMMON_GROUND: |
  <what we agreed on, or "None identified">

CRUX: |
  <the specific point of disagreement>

POSITION: |
  <your final position>

DISSENT_REASON: |
  <why you couldn't agree>
`;
}
