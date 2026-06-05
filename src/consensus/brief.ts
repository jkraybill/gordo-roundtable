/**
 * Consensus Roundtable — Decision Brief Generator
 * S411 #17: Actionable summary for external consumers
 */

import type {
  ConsensusState,
  ConsensusResult,
  DecisionBrief,
  Proposal,
} from "./types.js";

/**
 * Generate a decision brief from consensus result and final state.
 * Transforms rich audit trail into actionable decision artifact.
 */
export function generateDecisionBrief(
  result: ConsensusResult,
  state: ConsensusState
): DecisionBrief {
  const isConsensus = result.outcome === "consensus";
  const isHungJury = result.outcome === "hung_jury";

  // (a) What was decided
  let decision: string;
  if (isConsensus && result.outcome === "consensus") {
    decision = result.output.answer;
  } else if (isHungJury && result.outcome === "hung_jury") {
    const hasNearConsensus = result.report.near_consensus_proposals.length > 0;
    decision = `No consensus reached. ${hasNearConsensus ? "Near-consensus proposals exist." : "No near-consensus proposals."}`;
  } else {
    decision = `Terminated: ${state.termination_reason || "unknown reason"}`;
  }

  const decision_type = isConsensus
    ? "consensus"
    : isHungJury
      ? "hung_jury"
      : "terminated";

  // (b) Alternatives considered — proposals that didn't win
  const winningProposalId = isConsensus
    ? findWinningProposalId(state)
    : null;

  const alternatives_considered = state.proposals
    .filter(p => p.id !== winningProposalId)
    .map(p => ({
      proposal_id: p.id,
      summary: summarizeProposal(p),
      rejection_reason: determineRejectionReason(p, state, winningProposalId),
    }));

  // (c) Confidence level and basis
  const confidence = assessConfidence(result, state);

  // (d) Next actions — extract from decision if present
  const next_actions = extractNextActions(decision);

  // Metadata
  const firstTurn = state.turn_log[0];
  const lastTurn = state.turn_log[state.turn_log.length - 1];
  const duration_ms = firstTurn && lastTurn
    ? lastTurn.timestamp - firstTurn.timestamp
    : undefined;

  return {
    decision,
    decision_type,
    alternatives_considered,
    confidence,
    next_actions: next_actions.length > 0 ? next_actions : undefined,
    question: state.question,
    participants: state.participants.length,
    rounds: state.round_count,
    duration_ms,
  };
}

/**
 * Find the proposal ID that achieved consensus.
 */
function findWinningProposalId(state: ConsensusState): string | null {
  const positions = Object.values(state.convergence_metrics.position_map);
  const nonNull = positions.filter((p): p is string => p !== null && p !== "none");
  if (nonNull.length === 0) return null;

  // All positions should be the same at consensus
  const allSame = nonNull.every(p => p === nonNull[0]);
  return allSame ? nonNull[0] : null;
}

/**
 * Summarize a proposal to ~100 chars.
 */
function summarizeProposal(p: Proposal): string {
  const content = p.content.replace(/\n+/g, " ").trim();
  if (content.length <= 100) return content;
  return content.slice(0, 97) + "...";
}

/**
 * Determine why a proposal didn't achieve consensus.
 */
function determineRejectionReason(
  p: Proposal,
  state: ConsensusState,
  winningId: string | null
): string | undefined {
  // Check for standing objections
  const objections = state.objections.filter(
    o => o.target_id === p.id && !o.withdrawn
  );
  if (objections.length > 0) {
    return `${objections.length} objection(s): ${objections[0].reason.slice(0, 50)}...`;
  }

  // Check for supersession
  const assents = state.assents.filter(a => a.proposal_id === p.id && !a.retracted);
  if (assents.length === 0) {
    return "No assents received";
  }

  // Was superseded by synthesis
  if (winningId && p.id !== winningId) {
    const supersededBy = state.proposals.find(sp => sp.id === winningId);
    if (supersededBy?.type === "substantive" && supersededBy.proposer !== p.proposer) {
      return "Superseded by synthesis";
    }
  }

  return "Did not achieve unanimous support";
}

/**
 * Assess confidence in the decision based on deliberation dynamics.
 */
function assessConfidence(
  result: ConsensusResult,
  state: ConsensusState
): { level: "high" | "medium" | "low"; basis: string[] } {
  const basis: string[] = [];
  let score = 0;

  if (result.outcome !== "consensus") {
    return {
      level: "low",
      basis: ["No consensus reached"],
    };
  }

  const output = result.output;

  // Factor 1: Entropy (lower is better)
  if (output.final_entropy === 0) {
    score += 2;
    basis.push("Zero entropy (unanimous convergence)");
  } else if (output.final_entropy < 0.5) {
    score += 1;
    basis.push("Low entropy");
  }

  // Factor 2: Rounds to consensus (fewer is stronger signal, but not too few)
  if (output.rounds_to_consensus >= 3 && output.rounds_to_consensus <= 6) {
    score += 2;
    basis.push(`${output.rounds_to_consensus} rounds (sufficient deliberation)`);
  } else if (output.rounds_to_consensus < 3) {
    score += 1;
    basis.push(`${output.rounds_to_consensus} rounds (quick consensus — may lack depth)`);
  } else {
    basis.push(`${output.rounds_to_consensus} rounds (extended deliberation)`);
  }

  // Factor 3: Consensus type
  if (output.consensus_type === "convergent-via-synthesis") {
    score += 2;
    basis.push("Achieved through synthesis (integrated perspectives)");
  } else if (output.consensus_type === "convergent-independent") {
    score += 2;
    basis.push("Independent convergence (strong agreement)");
  } else if (output.consensus_type === "uncontested") {
    score += 1;
    basis.push("Uncontested (no objections — may indicate shallow engagement)");
  }

  // Factor 4: Explicit assents vs passes
  const explicitCount = output.assent_profile.explicit_assents.length;
  const passCount = output.assent_profile.pass_based_non_objectors.length;
  if (explicitCount > passCount) {
    score += 1;
    basis.push(`${explicitCount} explicit assents (active endorsement)`);
  } else if (passCount > explicitCount) {
    basis.push(`${passCount} pass-based (implicit non-objection)`);
  }

  // Factor 5: Residual concerns
  if (output.residual_concerns && output.residual_concerns.length > 0) {
    score -= 1;
    basis.push(`${output.residual_concerns.length} residual concern(s) noted`);
  }

  // Factor 6: Diversity
  if (output.diversity_level === "high") {
    score += 1;
    basis.push("High participant diversity");
  } else if (output.diversity_level === "low") {
    basis.push("Low participant diversity (may share blind spots)");
  }

  // Map score to level
  const level: "high" | "medium" | "low" =
    score >= 5 ? "high" :
    score >= 2 ? "medium" :
    "low";

  return { level, basis };
}

/**
 * Extract next actions from decision text.
 * Looks for action-oriented phrases.
 */
function extractNextActions(decision: string): string[] {
  const actions: string[] = [];

  // Look for numbered action items
  const numberedMatches = decision.match(/^\s*\d+[.)]\s*(.+)$/gm);
  if (numberedMatches) {
    const actionPhrases = numberedMatches.filter(m =>
      /should|must|need to|recommend|suggest|implement|add|create|update|remove|fix/i.test(m)
    );
    actions.push(...actionPhrases.map(m => m.replace(/^\s*\d+[.)]\s*/, "").trim()));
  }

  // Look for bullet action items
  const bulletMatches = decision.match(/^\s*[-•*]\s*(.+)$/gm);
  if (bulletMatches) {
    const actionPhrases = bulletMatches.filter(m =>
      /should|must|need to|recommend|suggest|implement|add|create|update|remove|fix/i.test(m)
    );
    actions.push(...actionPhrases.map(m => m.replace(/^\s*[-•*]\s*/, "").trim()));
  }

  // Look for "Next step:" or "Action:" prefixes
  const prefixMatches = decision.match(/(?:next\s+step|action|todo|recommendation):\s*([^.\n]+)/gi);
  if (prefixMatches) {
    actions.push(...prefixMatches.map(m =>
      m.replace(/^(?:next\s+step|action|todo|recommendation):\s*/i, "").trim()
    ));
  }

  return [...new Set(actions)]; // Dedupe
}

/**
 * Format decision brief as markdown.
 */
export function formatDecisionBrief(brief: DecisionBrief): string {
  const lines: string[] = [];

  lines.push("# Decision Brief");
  lines.push("");
  lines.push(`**Question:** ${brief.question}`);
  lines.push(`**Outcome:** ${brief.decision_type === "consensus" ? "Consensus reached" : brief.decision_type === "hung_jury" ? "Hung jury" : "Terminated"}`);
  lines.push(`**Participants:** ${brief.participants}`);
  lines.push(`**Rounds:** ${brief.rounds}`);
  if (brief.duration_ms) {
    const seconds = Math.round(brief.duration_ms / 1000);
    lines.push(`**Duration:** ${seconds}s`);
  }
  lines.push("");

  lines.push("## Decision");
  lines.push("");
  lines.push(brief.decision);
  lines.push("");

  if (brief.alternatives_considered.length > 0) {
    lines.push("## Alternatives Considered");
    lines.push("");
    for (const alt of brief.alternatives_considered) {
      lines.push(`### ${alt.proposal_id}`);
      lines.push(`> ${alt.summary}`);
      if (alt.rejection_reason) {
        lines.push(`*${alt.rejection_reason}*`);
      }
      lines.push("");
    }
  }

  lines.push("## Confidence Assessment");
  lines.push("");
  lines.push(`**Level:** ${brief.confidence.level.toUpperCase()}`);
  lines.push("");
  lines.push("**Basis:**");
  for (const factor of brief.confidence.basis) {
    lines.push(`- ${factor}`);
  }
  lines.push("");

  if (brief.next_actions && brief.next_actions.length > 0) {
    lines.push("## Recommended Next Actions");
    lines.push("");
    for (const action of brief.next_actions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("*Generated by gordo-roundtable*");

  return lines.join("\n");
}
