/**
 * Consensus Roundtable — Convergence Tracking
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §4.3, §5.1
 */

import type { ConsensusState, AssentProfile, ConvergenceMetrics, ConsensusType } from "./types.js";

/**
 * Calculate Shannon entropy of position distribution.
 * H = -Σ p(x) log₂ p(x)
 *
 * H = 0 means unanimous (all support same proposal)
 * H = log₂(N) means maximum disagreement (uniform distribution)
 */
export function calculateEntropy(positionMap: Record<string, string | null>): number {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const pos of Object.values(positionMap)) {
    if (pos !== null) {
      counts[pos] = (counts[pos] || 0) + 1;
      total++;
    }
  }

  if (total === 0) return 0;

  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Build position map from current state.
 * Each party maps to their most recently assented proposal, or null.
 */
export function buildPositionMap(state: ConsensusState): Record<string, string | null> {
  const map: Record<string, string | null> = {};

  for (const party of state.participants) {
    map[party] = null;
  }

  // Find each party's most recent non-retracted assent
  // Use array index as tiebreaker when timestamps are equal (same millisecond)
  const indexedAssents = state.assents
    .map((a, i) => ({ ...a, index: i }))
    .filter(a => !a.retracted)
    .sort((a, b) => b.timestamp - a.timestamp || b.index - a.index);

  for (const assent of indexedAssents) {
    if (map[assent.party] === null) {
      map[assent.party] = assent.proposal_id;
    }
  }

  return map;
}

/**
 * Update convergence metrics after a round completes.
 * Called at round boundaries (when current_speaker_index wraps to 0).
 */
export function updateConvergenceMetrics(state: ConsensusState): ConvergenceMetrics {
  const positionMap = buildPositionMap(state);
  const entropy = calculateEntropy(positionMap);

  // Check if leading proposal changed
  const previousLeader = getMostSupportedProposal(state.convergence_metrics.position_map);
  const currentLeader = getMostSupportedProposal(positionMap);

  // Stability increments if:
  // 1. There is a current leader (not null)
  // 2. Either this is the first round with a leader (previousLeader null), or leader unchanged
  let stabilityCount: number;
  if (currentLeader === null) {
    // No clear leader yet
    stabilityCount = 0;
  } else if (previousLeader === null) {
    // First round with a leader - start counting
    stabilityCount = 1;
  } else if (previousLeader === currentLeader) {
    // Same leader as before - increment
    stabilityCount = state.convergence_metrics.stability_count + 1;
  } else {
    // Leader changed - reset
    stabilityCount = 1;
  }

  // S409 #13: Track objection timing
  const objectionMetrics = calculateObjectionMetrics(state);

  return {
    entropy,
    stability_count: stabilityCount,
    position_map: positionMap,
    ...objectionMetrics,
  };
}

/**
 * Calculate objection-related metrics (S409 #13).
 * Surfaces absence-of-dissent as data.
 */
function calculateObjectionMetrics(state: ConsensusState): {
  first_objection_turn: number | null;
  rounds_without_objection: number;
  silent_pass_count: number;
} {
  // Find first objection turn
  let firstObjectionTurn: number | null = null;
  for (const entry of state.turn_log) {
    if (entry.action.action === "object") {
      firstObjectionTurn = entry.turn;
      break;
    }
  }

  // Count consecutive rounds without objection from the end
  let roundsWithoutObjection = 0;
  const objectionsByRound = new Map<number, boolean>();
  for (const entry of state.turn_log) {
    if (entry.action.action === "object") {
      objectionsByRound.set(entry.round, true);
    }
  }
  // Count from current round backwards
  for (let r = state.round_count; r >= 0; r--) {
    if (objectionsByRound.has(r)) break;
    roundsWithoutObjection++;
  }

  // Count silent passes (pass without assent in same round)
  let silentPassCount = 0;
  for (const entry of state.turn_log) {
    if (entry.action.action === "pass" || entry.action.action === "abstain") {
      silentPassCount++;
    }
  }

  return {
    first_objection_turn: firstObjectionTurn,
    rounds_without_objection: roundsWithoutObjection,
    silent_pass_count: silentPassCount,
  };
}

/**
 * Get the proposal with the most support.
 */
function getMostSupportedProposal(positionMap: Record<string, string | null>): string | null {
  const counts: Record<string, number> = {};

  for (const pos of Object.values(positionMap)) {
    if (pos !== null) {
      counts[pos] = (counts[pos] || 0) + 1;
    }
  }

  let maxCount = 0;
  let leader: string | null = null;

  for (const [proposal, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      leader = proposal;
    }
  }

  return leader;
}

/**
 * Check if consensus has been achieved per spec §5.1 rule 5.
 *
 * Consensus requires:
 * 1. All positioned participants aligned on the same proposal (per position_map)
 * 2. No standing objections against that proposal
 * 3. This state persists for β consecutive rounds (stability_count >= beta)
 *
 * Parties with null position (passed without assenting) are non-blocking.
 */
export function checkConsensus(state: ConsensusState): {
  achieved: boolean;
  proposal_id?: string;
  proposal_content?: string;
  assent_profile?: AssentProfile;
} {
  const beta = state.config.beta;
  const positionMap = state.convergence_metrics.position_map;

  // Check β stability first — if not stable, no consensus
  if (state.convergence_metrics.stability_count < beta) {
    return { achieved: false };
  }

  // Find the consensus proposal from position_map
  // All non-null positions must be on the same proposal
  const positions = Object.values(positionMap);
  const nonNullPositions = positions.filter((p): p is string => p !== null);

  // Need at least one positioned party
  if (nonNullPositions.length === 0) {
    return { achieved: false };
  }

  // Check all non-null positions are the same
  const consensusProposalId = nonNullPositions[0];
  if (!nonNullPositions.every(p => p === consensusProposalId)) {
    return { achieved: false };
  }

  // Find the proposal
  const proposal = state.proposals.find(p => p.id === consensusProposalId);
  if (!proposal) {
    return { achieved: false };
  }

  // Check no standing objections against this proposal
  const objections = state.objections.filter(
    o => o.target_id === consensusProposalId && !o.withdrawn
  );
  if (objections.length > 0) {
    return { achieved: false };
  }

  // Build assent profile from assents to the consensus proposal
  // Include both explicit assents and implicit assents (from proposing)
  const allAssents = state.assents
    .filter(a => a.proposal_id === consensusProposalId && !a.retracted)
    .map(a => a.party);

  // Unique assenting parties
  const uniqueAssenters = [...new Set(allAssents)];

  // Pass-based non-objectors: parties who passed (null position or same position)
  // and don't have any assent record — they're not blocking
  const passBasedNonObjectors = state.participants.filter(
    p => !uniqueAssenters.includes(p) &&
         (positionMap[p] === null || positionMap[p] === consensusProposalId)
  );

  return {
    achieved: true,
    proposal_id: proposal.id,
    proposal_content: proposal.content,
    assent_profile: {
      explicit_assents: uniqueAssenters,
      pass_based_non_objectors: passBasedNonObjectors,
    },
  };
}

/**
 * Determine the type of consensus achieved (S409 #11).
 * Distinguishes how convergence happened, not just that it happened.
 */
export function determineConsensusType(
  state: ConsensusState,
  consensusProposalId: string
): ConsensusType {
  // Check if any objections were ever raised
  const anyObjections = state.objections.length > 0;
  if (!anyObjections) {
    return "uncontested";
  }

  // Check if consensus is on a synthesis proposal
  const proposal = state.proposals.find(p => p.id === consensusProposalId);
  if (!proposal) {
    return "convergent-independent";
  }

  // Was this proposal created via synthesize action?
  const synthesisTurn = state.turn_log.find(
    t => t.action.action === "synthesize" &&
         state.proposals.find(p => p.proposer === t.speaker && p.timestamp === t.timestamp)?.id === consensusProposalId
  );

  if (synthesisTurn) {
    return "convergent-via-synthesis";
  }

  return "convergent-independent";
}

/**
 * Check if the consensus proposal was a self-synthesis (S409 #12).
 * Self-synthesis: proposer of synthesis also proposed one of the original proposals being synthesized.
 */
export function checkSelfSynthesis(
  state: ConsensusState,
  consensusProposalId: string
): boolean {
  const proposal = state.proposals.find(p => p.id === consensusProposalId);
  if (!proposal) return false;

  // Count how many proposals this party made
  const proposerProposals = state.proposals.filter(p => p.proposer === proposal.proposer);

  // Self-synthesis if proposer has more than one proposal (their original + the synthesis)
  return proposerProposals.length > 1;
}

/**
 * Calculate total cost from turn log (S409 #10).
 */
export function calculateTotalCost(state: ConsensusState): {
  total_cost_usd: number;
  total_tokens: { prompt: number; completion: number };
} {
  let totalCost = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for (const turn of state.turn_log) {
    if (turn.usage) {
      promptTokens += turn.usage.prompt_tokens;
      completionTokens += turn.usage.completion_tokens;
      if (turn.usage.cost_usd) {
        totalCost += turn.usage.cost_usd;
      }
    }
  }

  return {
    total_cost_usd: totalCost,
    total_tokens: { prompt: promptTokens, completion: completionTokens },
  };
}

/**
 * Find proposals that achieved (N-1) support (near-consensus).
 * Useful for hung jury reports.
 */
export function findNearConsensusProposals(state: ConsensusState): Array<{
  proposal_id: string;
  blocking_party: string;
  blocking_objection: string;
}> {
  const results: Array<{
    proposal_id: string;
    blocking_party: string;
    blocking_objection: string;
  }> = [];

  const n = state.participants.length;

  for (const proposal of state.proposals) {
    const objections = state.objections.filter(
      o => o.target_id === proposal.id && !o.withdrawn
    );

    // Near-consensus: exactly one objection
    if (objections.length === 1) {
      const obj = objections[0];
      results.push({
        proposal_id: proposal.id,
        blocking_party: obj.objector,
        blocking_objection: obj.reason,
      });
    }
  }

  return results;
}
