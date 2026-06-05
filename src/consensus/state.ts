/**
 * Consensus Roundtable — State Machine
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §5, §6
 */

import { randomUUID, randomInt } from "node:crypto";
import type {
  ConsensusState,
  ConsensusConfig,
  ParsedAction,
  Proposal,
  Objection,
  Assent,
  ConvergenceMetrics,
  VisibilitySnapshot,
  ReasoningTrace,
} from "./types.js";
import { ConsensusStateSchema } from "./types.js";
import { updateConvergenceMetrics } from "./convergence.js";

/**
 * Fisher-Yates shuffle using crypto.randomInt for unbiased randomness.
 * Returns a new shuffled array, does not mutate input.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Create initial state for a new consensus roundtable.
 */
export function createInitialState(
  question: string,
  context: string | undefined,
  config: ConsensusConfig
): ConsensusState {
  // Shuffle participant configs to randomize position/letter assignment
  // This prevents position bias (Party A always speaking first)
  const shuffledConfigs = shuffleArray(config.participants);
  const shuffledConfig = { ...config, participants: shuffledConfigs };

  const participants = shuffledConfigs.map(
    (_, i) => `Party ${String.fromCharCode(65 + i)}`
  );

  const initialPositionMap: Record<string, string | null> = {};
  for (const p of participants) {
    initialPositionMap[p] = null;
  }

  // S410 #14: Blind opening enabled by default
  const blindOpening = shuffledConfig.blind_opening !== false;

  return {
    question,
    context,
    participants,
    session_id: randomUUID(),
    config: shuffledConfig,

    phase: shuffledConfig.bootstrap_rounds > 0 ? "bootstrap" : "deliberation",
    standing_rules: [],
    current_speaker_index: 0,
    turn_count: 0,
    round_count: 0,

    // S410 #14: Blind opening phase
    blind_phase_active: blindOpening,
    pending_proposals: [],
    pending_assents: [],

    proposals: [],
    objections: [],
    assents: [],

    convergence_metrics: {
      entropy: 0,
      stability_count: 0,
      position_map: initialPositionMap,
      // S409 #13: objection timing metrics
      first_objection_turn: null,
      rounds_without_objection: 0,
      silent_pass_count: 0,
    },

    transcript_summary: "",
    turn_log: [],

    consensus_answer: null,
    termination_reason: null,
  };
}

/**
 * Validate that an action is legal given current state.
 */
export function validateAction(
  state: ConsensusState,
  speaker: string,
  action: ParsedAction
): { valid: boolean; reason?: string } {
  // Speaker must be current speaker
  if (state.participants[state.current_speaker_index] !== speaker) {
    return { valid: false, reason: `Not ${speaker}'s turn` };
  }

  // Phase-specific validation
  if (state.phase === "closed") {
    return { valid: false, reason: "Roundtable is closed" };
  }

  switch (action.action) {
    case "propose":
    case "meta_propose":
    case "synthesize":
    case "narrow":
      if (!action.content) {
        return { valid: false, reason: `${action.action} requires content` };
      }
      break;

    case "object":
      if (!action.target_id) {
        return { valid: false, reason: "object requires target_id" };
      }
      if (!action.reason) {
        return { valid: false, reason: "object requires reason" };
      }
      if (!state.proposals.find(p => p.id === action.target_id)) {
        return { valid: false, reason: `Proposal ${action.target_id} not found` };
      }
      break;

    case "withdraw":
      if (!action.target_id) {
        return { valid: false, reason: "withdraw requires target_id (objection_id)" };
      }
      const objToWithdraw = state.objections.find(
        o => o.id === action.target_id && o.objector === speaker && !o.withdrawn
      );
      if (!objToWithdraw) {
        return { valid: false, reason: `Cannot withdraw: objection ${action.target_id} not found or not yours` };
      }
      break;

    case "amend":
      if (!action.target_id) {
        return { valid: false, reason: "amend requires target_id (proposal_id)" };
      }
      if (!action.content) {
        return { valid: false, reason: "amend requires content" };
      }
      if (!state.proposals.find(p => p.id === action.target_id)) {
        return { valid: false, reason: `Proposal ${action.target_id} not found` };
      }
      break;

    case "assent":
      if (!action.target_id) {
        return { valid: false, reason: "assent requires target_id (proposal_id)" };
      }
      if (!state.proposals.find(p => p.id === action.target_id)) {
        return { valid: false, reason: `Proposal ${action.target_id} not found` };
      }
      break;

    case "retract_assent":
      if (!action.target_id) {
        return { valid: false, reason: "retract_assent requires target_id (proposal_id)" };
      }
      const assentToRetract = state.assents.find(
        a => a.proposal_id === action.target_id && a.party === speaker && !a.retracted
      );
      if (!assentToRetract) {
        return { valid: false, reason: `Cannot retract: no active assent to ${action.target_id}` };
      }
      break;

    case "call_vote":
      if (!action.target_id) {
        return { valid: false, reason: "call_vote requires target_id (proposal_id)" };
      }
      if (!state.proposals.find(p => p.id === action.target_id)) {
        return { valid: false, reason: `Proposal ${action.target_id} not found` };
      }
      break;

    case "pass":
    case "abstain":
      // Always valid
      break;

    case "identity_doubt_pause":
      // Requires content (the concern)
      if (!action.content) {
        return { valid: false, reason: "identity_doubt_pause requires content describing the concern" };
      }
      break;

    case "identity_doubt_resolved":
      // Always valid — clears the speaker's own doubt
      break;
  }

  return { valid: true };
}

// Turn logging data
export interface TurnLogData {
  rawResponse: string;
  promptSent: string;
  reasoning?: string;
  reasoning_trace?: ReasoningTrace; // S411 #26: structured reasoning
  durationMs?: number;
  model?: string;  // Model ID for this participant (#5)
  usage?: { prompt_tokens: number; completion_tokens: number; cost_usd?: number };
  visibility?: VisibilitySnapshot; // S409 #23
}

/**
 * Generate plain-language narration for a turn (#6).
 * Explains what happened and current state in readable terms.
 *
 * S410 #14: During blind phase, proposals are in pending_proposals.
 */
function generateNarration(speaker: string, action: ParsedAction, state: ConsensusState): string {
  // S410 #14: Count includes both visible and pending proposals
  const allProposals = [...state.proposals, ...state.pending_proposals];
  const proposalCount = allProposals.length;
  const activeObjections = state.objections.filter(o => !o.withdrawn).length;

  let narration = "";

  switch (action.action) {
    case "propose": {
      // S410 #14: Get the most recent proposal from either array
      const proposal = allProposals[proposalCount - 1];
      const contentPreview = proposal.content.slice(0, 80) + (proposal.content.length > 80 ? "..." : "");
      if (state.blind_phase_active) {
        narration = `${speaker} proposed "${contentPreview}" (${proposal.id}) [blind]. `;
        narration += `${proposalCount} proposal(s) pending reveal.`;
      } else {
        narration = `${speaker} proposed "${contentPreview}" (${proposal.id}). `;
        narration += `Now ${proposalCount} proposal(s) on the table.`;
      }
      break;
    }

    case "amend": {
      const amendment = allProposals[proposalCount - 1];
      const contentPreview = amendment.content.slice(0, 80) + (amendment.content.length > 80 ? "..." : "");
      narration = `${speaker} amended ${action.target_id} with "${contentPreview}" (${amendment.id}). `;
      narration += `Now ${proposalCount} proposal(s) on the table.`;
      break;
    }

    case "assent": {
      const assentsForTarget = state.assents.filter(a => a.proposal_id === action.target_id && !a.retracted).length;
      narration = `${speaker} assented to ${action.target_id}. `;
      narration += `${action.target_id} now has ${assentsForTarget} assent(s).`;
      break;
    }

    case "object": {
      narration = `${speaker} objected to ${action.target_id}: "${action.reason}". `;
      narration += `${activeObjections} active objection(s) total.`;
      break;
    }

    case "withdraw": {
      narration = `${speaker} withdrew their objection. ${activeObjections} active objection(s) remain.`;
      break;
    }

    case "call_vote": {
      narration = `${speaker} called for a vote on ${action.target_id}. `;
      narration += `Stability window begins — need ${state.config.beta} stable rounds for consensus.`;
      break;
    }

    case "pass":
    case "abstain": {
      narration = `${speaker} passed. No change to proposals or objections.`;
      break;
    }

    case "retract_assent": {
      narration = `${speaker} retracted their assent to ${action.target_id}.`;
      break;
    }

    case "identity_doubt_pause": {
      narration = `${speaker} invoked an identity-doubt pause. Deliberation paused for verification.`;
      break;
    }

    case "identity_doubt_resolved": {
      narration = `${speaker} resolved their identity-doubt. Deliberation may proceed.`;
      break;
    }

    default:
      narration = `${speaker} took action: ${action.action}`;
  }

  // Add convergence status
  const metrics = state.convergence_metrics;
  const positions = Object.values(metrics.position_map).filter(p => p !== null);
  const uniquePositions = new Set(positions);

  if (uniquePositions.size === 1 && positions.length === state.participants.length) {
    narration += ` All parties aligned on ${positions[0]}.`;
  } else if (uniquePositions.size > 1) {
    narration += ` Parties split across ${uniquePositions.size} positions.`;
  }

  return narration;
}

/**
 * Apply an action to state, returning new state.
 * Assumes action has been validated.
 *
 * S410 #14: During blind_phase_active, proposals go to pending_proposals
 * and are revealed after all participants have had one turn.
 */
export function applyAction(
  state: ConsensusState,
  speaker: string,
  action: ParsedAction,
  logData: TurnLogData
): ConsensusState {
  const now = Date.now();
  const newState = structuredClone(state);

  // S410 #14: Helper to add proposal to correct location
  const addProposal = (proposal: Proposal, assent: Assent) => {
    if (newState.blind_phase_active) {
      newState.pending_proposals.push(proposal);
      newState.pending_assents.push(assent);
    } else {
      newState.proposals.push(proposal);
      newState.assents.push(assent);
    }
  };

  // S410 #14: Compute next proposal ID considering both visible and pending
  const nextProposalId = () => {
    const totalProposals = newState.proposals.length + newState.pending_proposals.length;
    return `p-${totalProposals + 1}`;
  };

  switch (action.action) {
    case "propose": {
      const proposal: Proposal = {
        id: nextProposalId(),
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "substantive",
      };
      const assent: Assent = {
        proposal_id: proposal.id,
        party: speaker,
        explicit: false, // implicit from proposing
        timestamp: now,
        retracted: false,
      };
      addProposal(proposal, assent);
      break;
    }

    case "meta_propose": {
      const proposal: Proposal = {
        id: nextProposalId(),
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "meta",
      };
      const assent: Assent = {
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      };
      addProposal(proposal, assent);
      break;
    }

    case "synthesize": {
      const proposal: Proposal = {
        id: nextProposalId(),
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "substantive",
      };
      const assent: Assent = {
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      };
      addProposal(proposal, assent);
      break;
    }

    case "narrow": {
      const proposal: Proposal = {
        id: nextProposalId(),
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "narrow",
        parent_id: action.target_id,
      };
      const assent: Assent = {
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      };
      addProposal(proposal, assent);
      break;
    }

    case "amend": {
      const proposal: Proposal = {
        id: nextProposalId(),
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "amendment",
        parent_id: action.target_id,
      };
      const assent: Assent = {
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      };
      addProposal(proposal, assent);
      break;
    }

    case "object": {
      const objection: Objection = {
        id: `o-${newState.objections.length + 1}`,
        target_id: action.target_id!,
        reason: action.reason!,
        objector: speaker,
        timestamp: now,
        withdrawn: false,
      };
      newState.objections.push(objection);

      // Objection resets stability (spec §5.1 rule 7)
      newState.convergence_metrics.stability_count = 0;
      break;
    }

    case "withdraw": {
      const objIdx = newState.objections.findIndex(o => o.id === action.target_id);
      if (objIdx >= 0) {
        newState.objections[objIdx].withdrawn = true;
      }
      break;
    }

    case "assent": {
      // Remove any existing assent from this party for this proposal (if retracted then re-assenting)
      newState.assents = newState.assents.filter(
        a => !(a.proposal_id === action.target_id && a.party === speaker)
      );

      // S410 #27: Check if this assent supersedes speaker's own proposal
      // Find speaker's own proposals that are NOT the one being assented to
      const allProposals = [...newState.proposals, ...newState.pending_proposals];
      const ownProposals = allProposals.filter(
        p => p.proposer === speaker && p.id !== action.target_id
      );
      // If speaker has own proposal(s) and is assenting to someone else's, mark supersession
      const targetProposal = allProposals.find(p => p.id === action.target_id);
      const isSupersession = ownProposals.length > 0 && targetProposal?.proposer !== speaker;
      // Use most recent own proposal as the superseded one
      const supersededProposal = isSupersession
        ? ownProposals.sort((a, b) => b.timestamp - a.timestamp)[0]
        : null;

      newState.assents.push({
        proposal_id: action.target_id!,
        party: speaker,
        explicit: true,
        timestamp: now,
        retracted: false,
        // S410 #27: supersession tracking
        supersedes: supersededProposal?.id,
        reason: isSupersession ? action.reason : undefined,
      });
      break;
    }

    case "retract_assent": {
      const assentIdx = newState.assents.findIndex(
        a => a.proposal_id === action.target_id && a.party === speaker && !a.retracted
      );
      if (assentIdx >= 0) {
        newState.assents[assentIdx].retracted = true;
      }
      break;
    }

    case "call_vote": {
      // call_vote triggers the stability window (spec §6.2)
      // The vote itself is tracked implicitly through subsequent turns
      // No state change needed beyond logging
      break;
    }

    case "pass":
    case "abstain":
      // No state change
      break;

    case "identity_doubt_pause":
      // Identity doubt is tracked via the raw_response in turn_log
      // The prompts.ts detection logic reads these
      // No separate state field needed — detection is pattern-based
      break;

    case "identity_doubt_resolved":
      // Resolution is also tracked via raw_response
      // prompts.ts clears the doubt when this action is detected
      break;
  }

  // Generate plain-language narration (#6)
  const narration = generateNarration(speaker, action, newState);

  // Log the turn (maximally verbose)
  newState.turn_log.push({
    turn: newState.turn_count,
    round: newState.round_count,
    speaker,
    model: logData.model,
    action,
    prompt_sent: logData.promptSent,
    raw_response: logData.rawResponse,
    reasoning: logData.reasoning,
    reasoning_trace: logData.reasoning_trace, // S411 #26
    narration,
    visibility: logData.visibility,
    timestamp: now,
    duration_ms: logData.durationMs,
    usage: logData.usage,
  });

  // Advance turn counter
  newState.turn_count++;
  newState.current_speaker_index =
    (newState.current_speaker_index + 1) % newState.participants.length;

  // Check for round boundary
  if (newState.current_speaker_index === 0) {
    newState.round_count++;

    // S410 #14: End blind phase after first round — reveal pending proposals
    if (newState.blind_phase_active && newState.round_count === 1) {
      // Move pending proposals to visible proposals
      newState.proposals.push(...newState.pending_proposals);
      newState.assents.push(...newState.pending_assents);
      newState.pending_proposals = [];
      newState.pending_assents = [];
      newState.blind_phase_active = false;
    }

    newState.convergence_metrics = updateConvergenceMetrics(newState);

    // Check phase transitions
    if (newState.phase === "bootstrap" && newState.round_count >= newState.config.bootstrap_rounds) {
      newState.phase = "deliberation";
    }
  }

  return newState;
}

/**
 * Serialize state to JSON for persistence.
 */
export function serializeState(state: ConsensusState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Deserialize state from JSON.
 */
export function deserializeState(json: string): ConsensusState {
  const parsed = JSON.parse(json);
  return ConsensusStateSchema.parse(parsed);
}

/**
 * Generate a rolling transcript summary from recent turns.
 * Keeps last N turns in detail, summarizes earlier ones.
 */
export function updateTranscriptSummary(state: ConsensusState, detailTurns: number = 10): string {
  const log = state.turn_log;
  if (log.length === 0) return "";

  const lines: string[] = [];

  // Earlier turns: summarize
  if (log.length > detailTurns) {
    const earlier = log.slice(0, -detailTurns);
    const proposalCount = earlier.filter(t => t.action.action === "propose").length;
    const objectionCount = earlier.filter(t => t.action.action === "object").length;
    const assentCount = earlier.filter(t => t.action.action === "assent").length;
    lines.push(`[Earlier: ${earlier.length} turns, ${proposalCount} proposals, ${objectionCount} objections, ${assentCount} assents]`);
    lines.push("");
  }

  // Recent turns: detail
  const recent = log.slice(-detailTurns);
  for (const entry of recent) {
    const actionStr = formatAction(entry.action);
    lines.push(`Turn ${entry.turn + 1} (Round ${entry.round + 1}) — ${entry.speaker}: ${actionStr}`);
  }

  return lines.join("\n");
}

function formatAction(action: ParsedAction): string {
  switch (action.action) {
    case "propose":
    case "meta_propose":
    case "synthesize":
    case "narrow":
      return `${action.action}("${truncate(action.content!, 50)}")`;
    case "object":
      return `object(${action.target_id}, "${truncate(action.reason!, 30)}")`;
    case "amend":
      return `amend(${action.target_id}, "${truncate(action.content!, 30)}")`;
    case "assent":
    case "retract_assent":
    case "call_vote":
      return `${action.action}(${action.target_id})`;
    case "withdraw":
      return `withdraw(${action.target_id})`;
    case "pass":
    case "abstain":
      return action.action;
    default:
      return action.action;
  }
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len - 3) + "...";
}

/**
 * Capture visibility snapshot — what speaker can see at this moment (S409 #23).
 * Critical for distinguishing independent agreement from herding.
 *
 * S410 #14: During blind phase, pending_proposals are NOT visible.
 * This accurately reflects the blind opening design — each participant
 * submits without seeing others' proposals.
 */
export function captureVisibility(state: ConsensusState): VisibilitySnapshot {
  return {
    proposals_visible: state.proposals.map(p => p.id),
    assents_visible: state.assents
      .filter(a => !a.retracted)
      .map(a => ({ party: a.party, proposal_id: a.proposal_id })),
    objections_visible: state.objections
      .filter(o => !o.withdrawn)
      .map(o => o.id),
  };
}
