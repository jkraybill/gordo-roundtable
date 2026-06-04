/**
 * Consensus Roundtable — State Machine
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1 §5, §6
 */

import { randomUUID } from "node:crypto";
import type {
  ConsensusState,
  ConsensusConfig,
  ParsedAction,
  Proposal,
  Objection,
  Assent,
  ConvergenceMetrics,
} from "./types.js";
import { ConsensusStateSchema } from "./types.js";
import { updateConvergenceMetrics } from "./convergence.js";

/**
 * Create initial state for a new consensus roundtable.
 */
export function createInitialState(
  question: string,
  context: string | undefined,
  config: ConsensusConfig
): ConsensusState {
  const participants = config.participants.map(
    (_, i) => `Party ${String.fromCharCode(65 + i)}`
  );

  const initialPositionMap: Record<string, string | null> = {};
  for (const p of participants) {
    initialPositionMap[p] = null;
  }

  return {
    question,
    context,
    participants,
    session_id: randomUUID(),
    config,

    phase: config.bootstrap_rounds > 0 ? "bootstrap" : "deliberation",
    standing_rules: [],
    current_speaker_index: 0,
    turn_count: 0,
    round_count: 0,

    proposals: [],
    objections: [],
    assents: [],

    convergence_metrics: {
      entropy: 0,
      stability_count: 0,
      position_map: initialPositionMap,
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
  }

  return { valid: true };
}

// Turn logging data
export interface TurnLogData {
  rawResponse: string;
  promptSent: string;
  reasoning?: string;
  durationMs?: number;
  usage?: { prompt_tokens: number; completion_tokens: number; cost_usd?: number };
}

/**
 * Apply an action to state, returning new state.
 * Assumes action has been validated.
 */
export function applyAction(
  state: ConsensusState,
  speaker: string,
  action: ParsedAction,
  logData: TurnLogData
): ConsensusState {
  const now = Date.now();
  const newState = structuredClone(state);

  switch (action.action) {
    case "propose": {
      const proposal: Proposal = {
        id: `p-${newState.proposals.length + 1}`,
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "substantive",
      };
      newState.proposals.push(proposal);

      // Proposer implicitly assents (spec §5.1 rule 5)
      newState.assents.push({
        proposal_id: proposal.id,
        party: speaker,
        explicit: false, // implicit from proposing
        timestamp: now,
        retracted: false,
      });
      break;
    }

    case "meta_propose": {
      const proposal: Proposal = {
        id: `p-${newState.proposals.length + 1}`,
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "meta",
      };
      newState.proposals.push(proposal);

      newState.assents.push({
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      });
      break;
    }

    case "synthesize": {
      const proposal: Proposal = {
        id: `p-${newState.proposals.length + 1}`,
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "substantive",
      };
      newState.proposals.push(proposal);

      newState.assents.push({
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      });
      break;
    }

    case "narrow": {
      const proposal: Proposal = {
        id: `p-${newState.proposals.length + 1}`,
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "narrow",
        parent_id: action.target_id,
      };
      newState.proposals.push(proposal);

      newState.assents.push({
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      });
      break;
    }

    case "amend": {
      const proposal: Proposal = {
        id: `p-${newState.proposals.length + 1}`,
        content: action.content!,
        proposer: speaker,
        timestamp: now,
        type: "amendment",
        parent_id: action.target_id,
      };
      newState.proposals.push(proposal);

      newState.assents.push({
        proposal_id: proposal.id,
        party: speaker,
        explicit: false,
        timestamp: now,
        retracted: false,
      });
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
      newState.assents.push({
        proposal_id: action.target_id!,
        party: speaker,
        explicit: true,
        timestamp: now,
        retracted: false,
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
  }

  // Log the turn (maximally verbose)
  newState.turn_log.push({
    turn: newState.turn_count,
    round: newState.round_count,
    speaker,
    action,
    prompt_sent: logData.promptSent,
    raw_response: logData.rawResponse,
    reasoning: logData.reasoning,
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
