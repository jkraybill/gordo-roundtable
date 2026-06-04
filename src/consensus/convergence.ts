/**
 * Consensus Roundtable — Convergence Tracking
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §4.3, §5.1
 */

import type { ConsensusState, AssentProfile, ConvergenceMetrics } from "./types.js";

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
  const sortedAssents = [...state.assents]
    .filter(a => !a.retracted)
    .sort((a, b) => b.timestamp - a.timestamp);

  for (const assent of sortedAssents) {
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

  return {
    entropy,
    stability_count: stabilityCount,
    position_map: positionMap,
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
 * 1. All participants have assented (explicitly or via pass without objection)
 * 2. This state persists for β consecutive rounds
 * 3. No standing objections against the proposal
 */
export function checkConsensus(state: ConsensusState): {
  achieved: boolean;
  proposal_id?: string;
  proposal_content?: string;
  assent_profile?: AssentProfile;
} {
  const alpha = state.config.alpha ?? state.participants.length;
  const beta = state.config.beta;

  for (const proposal of state.proposals) {
    // Get standing (non-withdrawn) objections against this proposal
    const objections = state.objections.filter(
      o => o.target_id === proposal.id && !o.withdrawn
    );

    // Any objection blocks consensus
    if (objections.length > 0) continue;

    // Get explicit assents for this proposal
    const explicitAssents = state.assents
      .filter(a => a.proposal_id === proposal.id && !a.retracted)
      .map(a => a.party);

    // Parties who have passed without objecting (non-blocking)
    // These are parties not in explicitAssents and not objecting
    const objectors = new Set(objections.map(o => o.objector));
    const passBasedNonObjectors = state.participants.filter(
      p => !explicitAssents.includes(p) && !objectors.has(p)
    );

    // Check α threshold
    const supportCount = explicitAssents.length + passBasedNonObjectors.length;
    if (supportCount < alpha) continue;

    // Check β stability
    if (state.convergence_metrics.stability_count < beta) continue;

    return {
      achieved: true,
      proposal_id: proposal.id,
      proposal_content: proposal.content,
      assent_profile: {
        explicit_assents: explicitAssents,
        pass_based_non_objectors: passBasedNonObjectors,
      },
    };
  }

  return { achieved: false };
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
