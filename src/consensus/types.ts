/**
 * Consensus Roundtable — Type Definitions
 * Per CONSENSUS_ROUNDTABLE_SPEC_DRAFT.md v0.2.1
 */

import { z } from "zod";

// Action types per spec §6.1
export const ActionTypeSchema = z.enum([
  "propose",
  "object",
  "withdraw",
  "amend",
  "assent",
  "retract_assent",
  "pass",
  "abstain",
  "call_vote",
  "meta_propose",
  "synthesize",
  "narrow",
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// Parsed action from LLM response
export const ParsedActionSchema = z.object({
  action: ActionTypeSchema,
  target_id: z.string().optional(),
  content: z.string().optional(),
  reason: z.string().optional(),
  objection_ids: z.array(z.string()).optional(),
});

export type ParsedAction = z.infer<typeof ParsedActionSchema>;

// Proposal
export const ProposalSchema = z.object({
  id: z.string(),
  content: z.string(),
  proposer: z.string(),
  timestamp: z.number(),
  parent_id: z.string().optional(), // for amendments/narrows
  type: z.enum(["substantive", "meta", "amendment", "narrow"]).default("substantive"),
});

export type Proposal = z.infer<typeof ProposalSchema>;

// Objection
export const ObjectionSchema = z.object({
  id: z.string(),
  target_id: z.string(),
  reason: z.string(),
  objector: z.string(),
  timestamp: z.number(),
  withdrawn: z.boolean().default(false),
});

export type Objection = z.infer<typeof ObjectionSchema>;

// Assent
export const AssentSchema = z.object({
  proposal_id: z.string(),
  party: z.string(),
  explicit: z.boolean(), // true = assent action, false = implicit from propose
  timestamp: z.number(),
  retracted: z.boolean().default(false),
});

export type Assent = z.infer<typeof AssentSchema>;

// Standing rule (for bootstrap/meta-propose)
export const RuleSchema = z.object({
  id: z.string(),
  content: z.string(),
  proposer: z.string(),
  adopted_at_round: z.number(),
});

export type Rule = z.infer<typeof RuleSchema>;

// Turn log entry — maximally verbose for post-hoc analysis
export const TurnLogEntrySchema = z.object({
  turn: z.number(),
  round: z.number(),
  speaker: z.string(),
  action: ParsedActionSchema,
  prompt_sent: z.string(),           // Full turn prompt sent to participant
  raw_response: z.string(),          // Full response content
  reasoning: z.string().optional(),  // Thinking/reasoning block if present
  timestamp: z.number(),
  duration_ms: z.number().optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    cost_usd: z.number().optional(),
  }).optional(),
});

export type TurnLogEntry = z.infer<typeof TurnLogEntrySchema>;

// Convergence metrics per spec §4.3
export const ConvergenceMetricsSchema = z.object({
  entropy: z.number(), // Shannon entropy of position distribution
  stability_count: z.number(), // Consecutive rounds with same leading proposal
  position_map: z.record(z.string().nullable()), // party -> proposal_id or null
});

export type ConvergenceMetrics = z.infer<typeof ConvergenceMetricsSchema>;

// Phase per spec
export const PhaseSchema = z.enum([
  "bootstrap",
  "deliberation",
  "voting",
  "terminal_characterization",
  "closed",
]);

export type Phase = z.infer<typeof PhaseSchema>;

// Participant config (internal, maps to Reviewer for dispatch)
export const ParticipantConfigSchema = z.object({
  model: z.string(),
  provider: z.enum(["openrouter", "ollama"]).default("openrouter"),
  reasoning_effort: z.enum(["low", "medium", "high"]).optional(),
  max_tokens: z.number().int().positive().default(8000),
});

export type ParticipantConfig = z.infer<typeof ParticipantConfigSchema>;

// Consensus config
export const ConsensusConfigSchema = z.object({
  participants: z.array(ParticipantConfigSchema).min(3).max(11),
  turn_limit: z.number().int().positive().default(100),
  hard_cap: z.number().int().positive().default(500),
  bootstrap_rounds: z.number().int().min(0).default(3),
  alpha: z.number().int().positive().optional(), // Default: N (unanimous)
  beta: z.number().int().positive().default(2),
  state_file: z.string().optional(),
});

export type ConsensusConfig = z.infer<typeof ConsensusConfigSchema>;

// Main state object per spec §4.1
export const ConsensusStateSchema = z.object({
  // Immutable
  question: z.string(),
  context: z.string().optional(),
  participants: z.array(z.string()), // ["Party A", "Party B", ...]
  session_id: z.string(),
  config: ConsensusConfigSchema,

  // Procedural
  phase: PhaseSchema,
  standing_rules: z.array(RuleSchema).default([]),
  current_speaker_index: z.number().int().min(0),
  turn_count: z.number().int().min(0),
  round_count: z.number().int().min(0),

  // Substantive
  proposals: z.array(ProposalSchema),
  objections: z.array(ObjectionSchema),
  assents: z.array(AssentSchema),

  // Convergence tracking
  convergence_metrics: ConvergenceMetricsSchema,

  // Transcript
  transcript_summary: z.string(),
  turn_log: z.array(TurnLogEntrySchema),

  // Identity mapping (sealed, for post-hoc analysis only)
  // Maps Party A/B/C to actual model identifiers
  // NOT exposed to participants during deliberation per spec §2.3
  identity_map: z.record(z.string()).optional(),

  // System prompt used (logged once, same for all)
  system_prompt: z.string().optional(),

  // Termination
  consensus_answer: z.string().nullable(),
  termination_reason: z.string().nullable(),
});

export type ConsensusState = z.infer<typeof ConsensusStateSchema>;

// Assent profile for consensus output per spec §7.1
export const AssentProfileSchema = z.object({
  explicit_assents: z.array(z.string()),
  pass_based_non_objectors: z.array(z.string()),
});

export type AssentProfile = z.infer<typeof AssentProfileSchema>;

// Consensus output per spec §7.1
export const ConsensusOutputSchema = z.object({
  answer: z.string(),
  assent_profile: AssentProfileSchema,
  rounds_to_consensus: z.number(),
  final_entropy: z.number(),
});

export type ConsensusOutput = z.infer<typeof ConsensusOutputSchema>;

// Near-consensus proposal per spec §9.2
export const NearConsensusProposalSchema = z.object({
  proposal_id: z.string(),
  blocking_party: z.string(),
  blocking_objection: z.string(),
});

export type NearConsensusProposal = z.infer<typeof NearConsensusProposalSchema>;

// Minority report per spec §9.2
export const MinorityReportSchema = z.object({
  party: z.string(),
  position: z.string().nullable(),
  proposed_crux: z.string(),
  reason_for_dissent: z.string(),
});

export type MinorityReport = z.infer<typeof MinorityReportSchema>;

// Hung jury report per spec §9.2
export const HungJuryReportSchema = z.object({
  question: z.string(),
  termination_reason: z.string(),
  proposals_considered: z.array(z.object({
    id: z.string(),
    content: z.string(),
    explicit_assents: z.array(z.string()),
    non_objectors: z.array(z.string()),
    standing_objections: z.array(ObjectionSchema),
  })),
  common_ground: z.string().nullable(),
  crux_of_disagreement: z.array(z.string()).nullable(),
  minority_reports: z.array(MinorityReportSchema),
  near_consensus_proposals: z.array(NearConsensusProposalSchema),
  final_entropy: z.number(),
  turns_used: z.number(),
  rounds_completed: z.number(),
});

export type HungJuryReport = z.infer<typeof HungJuryReportSchema>;

// Final result
export const ConsensusResultSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("consensus"),
    state: ConsensusStateSchema,
    output: ConsensusOutputSchema,
  }),
  z.object({
    outcome: z.literal("hung_jury"),
    state: ConsensusStateSchema,
    report: HungJuryReportSchema,
  }),
  z.object({
    outcome: z.literal("error"),
    state: ConsensusStateSchema,
    error: z.string(),
  }),
]);

export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;
