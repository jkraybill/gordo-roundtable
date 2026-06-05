/**
 * Consensus Roundtable — Orchestrator
 * Main driver for multi-turn deliberation.
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import type { Reviewer } from "../types.js";
import { dispatchOne } from "../runner.js";
import type {
  ConsensusState,
  ConsensusConfig,
  ConsensusResult,
  ParsedAction,
  ParticipantConfig,
  HungJuryReport,
} from "./types.js";
import { ActionTypeSchema } from "./types.js";
import {
  createInitialState,
  applyAction,
  validateAction,
  serializeState,
  deserializeState,
  updateTranscriptSummary,
  captureVisibility,
} from "./state.js";
import {
  checkConsensus,
  findNearConsensusProposals,
  determineConsensusType,
  checkSelfSynthesis,
  calculateTotalCost,
  calculateDiversityLevel,
  calculateActionUsage,
} from "./convergence.js";
import { buildSystemPrompt, buildTurnPrompt, buildClarificationPrompt, buildCharacterizationPrompt } from "./prompts.js";

const MAX_PARSE_RETRIES = 2;

/**
 * Parse action from LLM response.
 */
export function parseAction(response: string): ParsedAction | { error: string } {
  // Extract ACTION
  const actionMatch = response.match(/^ACTION:\s*(\w+)/mi);
  if (!actionMatch) {
    return { error: "No ACTION found in response" };
  }

  const actionType = actionMatch[1].toLowerCase();
  const validActions = ActionTypeSchema.options;
  if (!validActions.includes(actionType as any)) {
    return { error: `Unknown action type: ${actionType}. Valid: ${validActions.join(", ")}` };
  }

  // Extract TARGET (optional)
  const targetMatch = response.match(/^TARGET:\s*(.+?)$/mi);
  const target_id = targetMatch?.[1]?.trim();

  // Extract CONTENT (optional, multiline)
  // The regex must handle multi-line content with blank lines inside.
  // We look for CONTENT: followed by optional | and newline, then capture everything
  // until we hit RATIONALE:/TARGET:/ACTION: at the start of a line, or end of string.
  // Strategy: try to match with a following section header first, then fall back to end-of-string.
  let content: string | undefined;

  // First, try multiline content ending at a section header
  const contentWithHeader = response.match(/^CONTENT:\s*\|?\s*\n([\s\S]*?)(?=\n(?:RATIONALE|TARGET|ACTION):)/mi);
  if (contentWithHeader) {
    content = contentWithHeader[1].trim();
  } else {
    // No following section header — content goes to end of string
    const contentToEnd = response.match(/^CONTENT:\s*\|?\s*\n([\s\S]*)$/mi);
    if (contentToEnd) {
      content = contentToEnd[1].trim();
    } else {
      // Try single-line content (no pipe, no newline after CONTENT:)
      const singleLineMatch = response.match(/^CONTENT:\s*([^\n]+)/mi);
      if (singleLineMatch) {
        content = singleLineMatch[1].trim();
      }
    }
  }

  // For object action, reason might be in CONTENT
  let reason: string | undefined;
  if (actionType === "object") {
    reason = content;
  }

  // Extract OBJECTION_IDS for synthesize
  const objectionIdsMatch = response.match(/^OBJECTION_IDS:\s*(.+?)$/mi);
  const objection_ids = objectionIdsMatch?.[1]?.split(",").map(s => s.trim());

  return {
    action: actionType as any,
    target_id,
    content,
    reason,
    objection_ids,
  };
}

/**
 * Convert ParticipantConfig to Reviewer for dispatch.
 */
function toReviewer(config: ParticipantConfig, id: string): Reviewer {
  return {
    id,
    provider: config.provider,
    model: config.model,
    ...(config.max_tokens ? { max_tokens: config.max_tokens } : {}),
    ...(config.reasoning_effort ? { reasoning_effort: config.reasoning_effort } : {}),
  };
}

// Dispatch result with full logging data
interface DispatchResult {
  action: ParsedAction;
  raw: string;
  reasoning?: string;
  duration_ms?: number;
  prompt_sent: string;
  usage?: { prompt_tokens: number; completion_tokens: number; cost_usd?: number };
}

/**
 * Dispatch a turn with retry on parse failure.
 */
async function dispatchWithRetry(
  participantConfig: ParticipantConfig,
  participantId: string,
  turnPrompt: string,
  systemPrompt: string,
  onLog: (msg: string) => void
): Promise<DispatchResult> {
  const reviewer = toReviewer(participantConfig, participantId);
  let lastError = "";
  let prompt = turnPrompt;

  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
    if (attempt > 0) {
      onLog(`  Retry ${attempt}/${MAX_PARSE_RETRIES} for ${participantId}...`);
      prompt = buildClarificationPrompt(turnPrompt, lastError);
    }

    const result = await dispatchOne(reviewer, prompt, systemPrompt);

    if (result.status === "error") {
      onLog(`  API error for ${participantId}: ${result.error}`);
      // Treat API error as pass
      return {
        action: { action: "pass" },
        raw: `(API error: ${result.error})`,
        prompt_sent: prompt,
        duration_ms: result.duration_ms,
        usage: result.usage,
      };
    }

    const parsed = parseAction(result.content || "");
    if ("error" in parsed) {
      lastError = parsed.error;
      onLog(`  Parse error: ${lastError}`);
      continue;
    }

    return {
      action: parsed,
      raw: result.content || "",
      reasoning: result.reasoning,
      duration_ms: result.duration_ms,
      prompt_sent: prompt,
      usage: result.usage,
    };
  }

  // Max retries exhausted, treat as pass
  onLog(`  Parse failed after ${MAX_PARSE_RETRIES} retries, treating as pass`);
  return {
    action: { action: "pass" },
    prompt_sent: prompt,
    raw: `(parse failure after ${MAX_PARSE_RETRIES} retries: ${lastError})`,
  };
}

export interface OrchestratorOptions {
  onLog?: (msg: string) => void;
  onStateChange?: (state: ConsensusState) => void;
}

/**
 * Run a consensus roundtable from initial state or resume.
 */
export async function runConsensusRoundtable(
  initialState: ConsensusState,
  options: OrchestratorOptions = {}
): Promise<ConsensusResult> {
  const log = options.onLog ?? console.log;
  const onStateChange = options.onStateChange;

  let state = initialState;
  const config = state.config;
  const systemPrompt = buildSystemPrompt(config);

  // Build identity map (sealed, for post-hoc analysis)
  // Maps anonymous Party labels to actual model identifiers
  const identityMap: Record<string, string> = {};
  for (let i = 0; i < state.participants.length; i++) {
    identityMap[state.participants[i]] = config.participants[i].model;
  }

  // Store system prompt and identity map in state
  state = {
    ...state,
    system_prompt: systemPrompt,
    identity_map: identityMap,
  };

  log(`Starting consensus roundtable: ${state.session_id}`);
  log(`Question: ${state.question}`);
  log(`Participants: ${state.participants.join(", ")}`);
  const limitsStr = config.max_rounds
    ? `max_rounds=${config.max_rounds}, turn_limit=${config.turn_limit}`
    : `turn_limit=${config.turn_limit}`;
  log(`Config: ${limitsStr}, beta=${config.beta}`);
  log("");

  // Main deliberation loop
  while (state.phase !== "closed") {
    // Check termination conditions
    if (state.turn_count >= config.hard_cap) {
      log(`Hard cap (${config.hard_cap} turns) reached. Terminating.`);
      state = { ...state, phase: "closed", termination_reason: "hard-cap-reached" };
      break;
    }

    if (state.turn_count >= config.turn_limit) {
      log(`Turn limit (${config.turn_limit}) reached. Terminating.`);
      state = { ...state, phase: "closed", termination_reason: "turn-limit-exhausted" };
      break;
    }

    if (config.max_rounds && state.round_count >= config.max_rounds) {
      log(`Round limit (${config.max_rounds}) reached. Terminating.`);
      state = { ...state, phase: "closed", termination_reason: "round-limit-exhausted" };
      break;
    }

    // Check for consensus
    const consensusCheck = checkConsensus(state);
    if (consensusCheck.achieved) {
      // S409 improvements: determine consensus characteristics
      const consensusType = determineConsensusType(state, consensusCheck.proposal_id!);
      const selfSynthesis = checkSelfSynthesis(state, consensusCheck.proposal_id!);
      const costData = calculateTotalCost(state);
      const diversityLevel = calculateDiversityLevel(config.participants);
      const actionUsage = calculateActionUsage(state);

      log(`\n=== CONSENSUS ACHIEVED ===`);
      log(`Proposal: ${consensusCheck.proposal_id}`);
      log(`Answer: ${consensusCheck.proposal_content}`);
      log(`Explicit assents: ${consensusCheck.assent_profile!.explicit_assents.join(", ")}`);
      log(`Pass-based non-objectors: ${consensusCheck.assent_profile!.pass_based_non_objectors.join(", ")}`);

      state = {
        ...state,
        phase: "closed",
        consensus_answer: consensusCheck.proposal_content!,
        termination_reason: "consensus-achieved",
      };

      return {
        outcome: "consensus",
        state,
        output: {
          answer: consensusCheck.proposal_content!,
          assent_profile: consensusCheck.assent_profile!,
          rounds_to_consensus: state.round_count,
          final_entropy: state.convergence_metrics.entropy,
          // S409 improvements
          consensus_type: consensusType,
          self_synthesis: selfSynthesis,
          total_cost_usd: costData.total_cost_usd,
          total_tokens: costData.total_tokens,
          diversity_level: diversityLevel,
          action_usage: actionUsage,
        },
      };
    }

    // Get current speaker
    const speakerIndex = state.current_speaker_index;
    const speaker = state.participants[speakerIndex];
    const participantConfig = config.participants[speakerIndex];
    const modelId = participantConfig.model;

    // Update transcript before turn
    state = { ...state, transcript_summary: updateTranscriptSummary(state) };

    // S409 #23: Capture what speaker can see BEFORE they act
    const visibility = captureVisibility(state);

    // Build turn prompt
    const turnPrompt = buildTurnPrompt(state, speaker);

    log(`Turn ${state.turn_count + 1} (Round ${state.round_count + 1}) — ${speaker}...`);

    // Dispatch and get action
    const dispatchResult = await dispatchWithRetry(
      participantConfig,
      speaker,
      turnPrompt,
      systemPrompt,
      log
    );

    const logData = {
      rawResponse: dispatchResult.raw,
      promptSent: dispatchResult.prompt_sent,
      reasoning: dispatchResult.reasoning,
      durationMs: dispatchResult.duration_ms,
      model: modelId,  // Include model ID for observability (#5)
      usage: dispatchResult.usage,
      visibility, // S409 #23: what speaker could see
    };

    // Validate action
    let actionDesc: string;
    const validation = validateAction(state, speaker, dispatchResult.action);
    if (!validation.valid) {
      log(`  Invalid action: ${validation.reason}. Treating as pass.`);
      state = applyAction(state, speaker, { action: "pass" }, logData);
      actionDesc = "pass (invalid action)";
    } else {
      actionDesc = `${dispatchResult.action.action}${dispatchResult.action.target_id ? `(${dispatchResult.action.target_id})` : ""}`;
      log(`  Action: ${actionDesc}`);
      // Log proposal content for midstream visibility
      if (dispatchResult.action.action === "propose" && dispatchResult.action.content) {
        const preview = dispatchResult.action.content.slice(0, 200);
        const truncated = dispatchResult.action.content.length > 200 ? "..." : "";
        log(`  Proposal: ${preview}${truncated}`);
      }
      state = applyAction(state, speaker, dispatchResult.action, logData);
    }

    // Notify state change
    onStateChange?.(state);

    // Persist state if configured
    if (config.state_file) {
      writeFileSync(config.state_file, serializeState(state));
    }

    // Log convergence at round boundaries
    if (state.current_speaker_index === 0) {
      log(`\n--- Round ${state.round_count} complete ---`);
      log(`  Entropy: ${state.convergence_metrics.entropy.toFixed(3)}`);
      log(`  Stability: ${state.convergence_metrics.stability_count}/${config.beta}`);
      log("");
    }
  }

  // Hung jury - run terminal characterization
  if (state.termination_reason !== "consensus-achieved") {
    log("\n=== HUNG JURY ===");
    log(`Reason: ${state.termination_reason}`);
    log("Running terminal characterization round...");

    const report = await runTerminalCharacterization(state, config, systemPrompt, log);

    return {
      outcome: "hung_jury",
      state,
      report,
    };
  }

  // Should not reach here
  return {
    outcome: "error",
    state,
    error: "Unexpected state",
  };
}

/**
 * Run terminal characterization for hung jury.
 */
async function runTerminalCharacterization(
  state: ConsensusState,
  config: ConsensusConfig,
  systemPrompt: string,
  log: (msg: string) => void
): Promise<HungJuryReport> {
  const characterizations: Array<{
    party: string;
    common_ground: string;
    crux: string;
    position: string;
    dissent_reason: string;
  }> = [];

  for (let i = 0; i < state.participants.length; i++) {
    const party = state.participants[i];
    const participantConfig = config.participants[i];
    const prompt = buildCharacterizationPrompt(state, party);

    log(`  Characterization from ${party}...`);
    const result = await dispatchOne(
      toReviewer(participantConfig, party),
      prompt,
      systemPrompt
    );

    if (result.status === "ok" && result.content) {
      const char = parseCharacterization(result.content);
      characterizations.push({ party, ...char });
    } else {
      characterizations.push({
        party,
        common_ground: "Unable to characterize",
        crux: "Unable to characterize",
        position: "Unknown",
        dissent_reason: "API error",
      });
    }
  }

  // Find consensus on characterizations
  const commonGrounds = characterizations.map(c => c.common_ground);
  const cruxes = characterizations.map(c => c.crux);

  const commonGroundConsensus = findConsensusString(commonGrounds);
  const cruxConsensus = findConsensusString(cruxes);

  // Build proposals considered
  const proposalsConsidered = state.proposals.map(p => {
    const assents = state.assents.filter(a => a.proposal_id === p.id && !a.retracted);
    const objections = state.objections.filter(o => o.target_id === p.id && !o.withdrawn);
    const objectors = new Set(objections.map(o => o.objector));
    const assenters = new Set(assents.map(a => a.party));
    const nonObjectors = state.participants.filter(
      party => !objectors.has(party) && !assenters.has(party)
    );

    return {
      id: p.id,
      content: p.content,
      explicit_assents: assents.map(a => a.party),
      non_objectors: nonObjectors,
      standing_objections: objections,
    };
  });

  return {
    question: state.question,
    termination_reason: state.termination_reason!,
    proposals_considered: proposalsConsidered,
    common_ground: commonGroundConsensus,
    crux_of_disagreement: cruxConsensus ? [cruxConsensus] : null,
    minority_reports: characterizations.map(c => ({
      party: c.party,
      position: c.position,
      proposed_crux: c.crux,
      reason_for_dissent: c.dissent_reason,
    })),
    near_consensus_proposals: findNearConsensusProposals(state),
    final_entropy: state.convergence_metrics.entropy,
    turns_used: state.turn_count,
    rounds_completed: state.round_count,
  };
}

function parseCharacterization(response: string): {
  common_ground: string;
  crux: string;
  position: string;
  dissent_reason: string;
} {
  const extract = (pattern: RegExp, fallback: string): string => {
    const match = response.match(pattern);
    return match?.[1]?.trim() || fallback;
  };

  return {
    common_ground: extract(/COMMON_GROUND:\s*\|?\s*\n([\s\S]*?)(?=^(?:CRUX|POSITION|DISSENT):|$)/mi, "Not specified"),
    crux: extract(/CRUX:\s*\|?\s*\n([\s\S]*?)(?=^(?:COMMON_GROUND|POSITION|DISSENT):|$)/mi, "Not specified"),
    position: extract(/POSITION:\s*\|?\s*\n([\s\S]*?)(?=^(?:COMMON_GROUND|CRUX|DISSENT):|$)/mi, "Not specified"),
    dissent_reason: extract(/DISSENT_REASON:\s*\|?\s*\n([\s\S]*?)$/mi, "Not specified"),
  };
}

function findConsensusString(strings: string[]): string | null {
  // Simple heuristic: if all strings are similar (>80% overlap), return first one
  // Otherwise return null
  if (strings.length === 0) return null;

  const normalized = strings.map(s => s.toLowerCase().replace(/\s+/g, " ").trim());
  const first = normalized[0];

  const allSimilar = normalized.every(s => {
    const overlap = calculateOverlap(first, s);
    return overlap > 0.8;
  });

  return allSimilar ? strings[0] : null;
}

function calculateOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }

  const total = wordsA.size + wordsB.size - common;
  return total === 0 ? 1 : common / total;
}

/**
 * Resume a roundtable from saved state file.
 */
export function resumeFromFile(stateFile: string): ConsensusState {
  if (!existsSync(stateFile)) {
    throw new Error(`State file not found: ${stateFile}`);
  }
  const json = readFileSync(stateFile, "utf-8");
  return deserializeState(json);
}
