/**
 * Consensus Roundtable — Prompt Templates
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §3, §5.1
 */

import type { ConsensusState, ConsensusConfig } from "./types.js";

/**
 * Build the system prompt containing immutable rules (spec §5.1).
 * This is the same for all participants.
 */
export function buildSystemPrompt(config: ConsensusConfig): string {
  const beta = config.beta;

  return `You are participating in a Consensus Roundtable deliberation.

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
 */
export function buildTurnPrompt(state: ConsensusState, identity: string): string {
  const lines: string[] = [];

  lines.push("## Your Identity");
  lines.push("");
  lines.push(`You are: **${identity}**`);
  lines.push(`Other participants: ${state.participants.filter(p => p !== identity).join(", ")}`);
  lines.push("");

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
