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
  ReasoningTrace,
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
  extractSupersessions,
} from "./convergence.js";
import { buildSystemPrompt, buildTurnPrompt, buildClarificationPrompt, buildCharacterizationPrompt, buildResidualConcernPrompt } from "./prompts.js";
import type { ResidualConcern } from "./types.js";

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

  // S410 #27: For assent action, capture RATIONALE as reason (explains supersession)
  if (actionType === "assent") {
    // Extract RATIONALE for assent-with-reason
    const rationaleMatch = response.match(/^RATIONALE:\s*\|?\s*\n([\s\S]*?)$/mi);
    if (rationaleMatch) {
      reason = rationaleMatch[1].trim();
    } else {
      // Single-line rationale
      const singleRationale = response.match(/^RATIONALE:\s*([^\n]+)/mi);
      if (singleRationale) {
        reason = singleRationale[1].trim();
      }
    }
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
 * S411 #26: Extract structured reasoning trace from RATIONALE.
 * Parses natural language reasoning into structured fields for post-hoc analysis.
 */
export function extractReasoningTrace(
  response: string,
  parsedAction: ParsedAction
): ReasoningTrace {
  // Extract full RATIONALE block
  let rationale = "";
  const rationaleWithHeader = response.match(/^RATIONALE:\s*\|?\s*\n([\s\S]*?)(?=\n(?:CONTENT|TARGET|ACTION):)/mi);
  if (rationaleWithHeader) {
    rationale = rationaleWithHeader[1].trim();
  } else {
    // RATIONALE at end of response
    const rationaleToEnd = response.match(/^RATIONALE:\s*\|?\s*\n([\s\S]*)$/mi);
    if (rationaleToEnd) {
      rationale = rationaleToEnd[1].trim();
    } else {
      // Single-line rationale
      const singleLine = response.match(/^RATIONALE:\s*([^\n]+)/mi);
      if (singleLine) {
        rationale = singleLine[1].trim();
      }
    }
  }

  // Extract reasons — sentences/bullets that explain the action
  const reasons: string[] = [];

  // Look for bullet points (may be indented)
  const bulletMatches = rationale.match(/^\s*[-•*]\s*(.+)$/gm);
  if (bulletMatches) {
    reasons.push(...bulletMatches.map(b => b.replace(/^\s*[-•*]\s*/, "").trim()));
  }

  // Look for "because" clauses
  const becauseMatches = rationale.match(/because\s+([^.]+)/gi);
  if (becauseMatches) {
    reasons.push(...becauseMatches.map(b => b.replace(/^because\s+/i, "").trim()));
  }

  // If no structured reasons found, use first sentence as reason
  if (reasons.length === 0 && rationale) {
    const firstSentence = rationale.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
      reasons.push(firstSentence[0].trim());
    } else if (rationale.length < 200) {
      reasons.push(rationale);
    }
  }

  // Extract concerns addressed — look for "addresses", "resolves", "satisfies"
  const concernsAddressed: string[] = [];
  const addressPatterns = [
    /address(?:es|ed|ing)?\s+(?:my\s+)?(?:concern\s+(?:about|regarding|with)\s+)?([^,.]+)/gi,
    /resolv(?:es|ed|ing)?\s+(?:my\s+)?(?:concern\s+(?:about|regarding|with)\s+)?([^,.]+)/gi,
    /satisf(?:ies|ied|ying)?\s+(?:my\s+)?(?:concern\s+(?:about|regarding|with)\s+)?([^,.]+)/gi,
  ];
  for (const pattern of addressPatterns) {
    const matches = rationale.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) concernsAddressed.push(match[1].trim());
    }
  }

  // Extract concerns remaining — look for "still", "doesn't", "however", "but"
  const concernsRemaining: string[] = [];
  const remainingPatterns = [
    /(?:still|doesn't|does not|however|but)\s+(?:fully\s+)?(?:address|resolve|satisfy)\s+([^,.]+)/gi,
    /concern(?:s)?\s+(?:remain|remaining)\s*(?:about|regarding|with)?\s*([^,.]+)/gi,
    /(?:unresolved|open)\s+(?:concern|question|issue)\s*(?:about|regarding|with)?\s*([^,.]+)/gi,
  ];
  for (const pattern of remainingPatterns) {
    const matches = rationale.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) concernsRemaining.push(match[1].trim());
    }
  }

  // Extract references to proposals/objections
  const references: string[] = [];
  const refMatches = rationale.match(/\b(p-\d+|o-\d+)\b/gi);
  if (refMatches) {
    references.push(...new Set(refMatches.map(r => r.toLowerCase())));
  }

  return {
    action_taken: parsedAction.action,
    target: parsedAction.target_id,
    reasons: [...new Set(reasons)], // Dedupe
    concerns_addressed: concernsAddressed.length > 0 ? [...new Set(concernsAddressed)] : undefined,
    concerns_remaining: concernsRemaining.length > 0 ? [...new Set(concernsRemaining)] : undefined,
    references: references.length > 0 ? references : undefined,
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
 * Run residual concern round (S410 #16).
 * Each participant gets one turn to register concerns they accept but want on record.
 */
async function runResidualConcernRound(
  state: ConsensusState,
  config: ConsensusConfig,
  systemPrompt: string,
  consensusAnswer: string,
  log: (msg: string) => void
): Promise<ResidualConcern[]> {
  const concerns: ResidualConcern[] = [];

  log("\n--- Residual Concern Round ---");

  for (let i = 0; i < state.participants.length; i++) {
    const party = state.participants[i];
    const participantConfig = config.participants[i];
    const prompt = buildResidualConcernPrompt(state, party, consensusAnswer);

    log(`  ${party}...`);
    const result = await dispatchWithRetry(
      participantConfig,
      party,
      prompt,
      systemPrompt,
      log
    );

    if (result.action.action === "residual_concern" && result.action.content) {
      concerns.push({
        party,
        concern: result.action.content,
        timestamp: Date.now(),
      });
      log(`    Registered concern: "${result.action.content.slice(0, 80)}${result.action.content.length > 80 ? "..." : ""}"`);
    } else {
      log(`    No concerns`);
    }
  }

  if (concerns.length === 0) {
    log("  No residual concerns registered.");
  } else {
    log(`  ${concerns.length} concern(s) registered.`);
  }

  return concerns;
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
  // S410 #14: Log blind opening status
  if (state.blind_phase_active) {
    log(`Blind opening: enabled — proposals hidden until round 1 completes`);
  }
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

      // S410 #16: Run residual concern round
      const residualConcerns = await runResidualConcernRound(
        state,
        config,
        systemPrompt,
        consensusCheck.proposal_content!,
        log
      );

      state = {
        ...state,
        phase: "closed",
        consensus_answer: consensusCheck.proposal_content!,
        termination_reason: "consensus-achieved",
      };

      // S410 #27: Extract supersession records
      const supersessions = extractSupersessions(state);

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
          // S410 #14: blind opening status
          blind_opening_used: config.blind_opening !== false,
          // S410 #16: residual concerns
          residual_concerns: residualConcerns.length > 0 ? residualConcerns : undefined,
          // S410 #27: supersession records
          supersessions: supersessions.length > 0 ? supersessions : undefined,
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

    // S411 #26: Extract structured reasoning trace
    const reasoning_trace = extractReasoningTrace(dispatchResult.raw, dispatchResult.action);

    const logData = {
      rawResponse: dispatchResult.raw,
      promptSent: dispatchResult.prompt_sent,
      reasoning: dispatchResult.reasoning,
      reasoning_trace, // S411 #26
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

      // S410 #14: Log blind phase reveal
      if (state.round_count === 1 && !state.blind_phase_active && state.proposals.length > 0) {
        log(`  Blind phase ended — ${state.proposals.length} proposals revealed simultaneously`);
      }

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
