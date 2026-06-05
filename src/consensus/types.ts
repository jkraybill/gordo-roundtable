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
  "identity_doubt_pause",
  "identity_doubt_resolved",
  "residual_concern", // S410 #16: post-consensus concern registration
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
  // S410 #27: Track when assent supersedes own proposal
  supersedes: z.string().optional(), // proposal_id of own proposal being abandoned
  reason: z.string().optional(), // Why synthesis is compelling (required when supersedes)
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

// Visibility snapshot — what this speaker could see (S409 #23)
export const VisibilitySnapshotSchema = z.object({
  proposals_visible: z.array(z.string()),
  assents_visible: z.array(z.object({
    party: z.string(),
    proposal_id: z.string(),
  })),
  objections_visible: z.array(z.string()),
});

export type VisibilitySnapshot = z.infer<typeof VisibilitySnapshotSchema>;

// S411 #26: Structured reasoning trace per turn
// Extracted from RATIONALE for post-hoc analysis of consensus dynamics
export const ReasoningTraceSchema = z.object({
  action_taken: ActionTypeSchema,
  target: z.string().optional(),
  reasons: z.array(z.string()),           // Why this action was taken
  concerns_addressed: z.array(z.string()).optional(), // What this action resolves
  concerns_remaining: z.array(z.string()).optional(), // What remains unresolved
  references: z.array(z.string()).optional(), // Proposal/objection IDs mentioned
  // S411 #19: Pass reflection — surfaced doubt or confidence statement
  pass_reflection: z.string().optional(), // "One way it could be wrong" or "why it cannot be"
});

export type ReasoningTrace = z.infer<typeof ReasoningTraceSchema>;

// Turn log entry — maximally verbose for post-hoc analysis
export const TurnLogEntrySchema = z.object({
  turn: z.number(),
  round: z.number(),
  speaker: z.string(),
  model: z.string().optional(),      // Model ID for this participant (#5)
  action: ParsedActionSchema,
  prompt_sent: z.string(),           // Full turn prompt sent to participant
  raw_response: z.string(),          // Full response content
  reasoning: z.string().optional(),  // Thinking/reasoning block if present
  reasoning_trace: ReasoningTraceSchema.optional(), // S411 #26: structured reasoning
  narration: z.string().optional(),  // Plain-language state explanation (#6)
  visibility: VisibilitySnapshotSchema.optional(), // S409 #23: what speaker could see
  timestamp: z.number(),
  duration_ms: z.number().optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    cost_usd: z.number().optional(),
  }).optional(),
});

export type TurnLogEntry = z.infer<typeof TurnLogEntrySchema>;

// Convergence metrics per spec §4.3 + meta-roundtable S409 improvements
export const ConvergenceMetricsSchema = z.object({
  entropy: z.number(), // Shannon entropy of position distribution
  stability_count: z.number(), // Consecutive rounds with same leading proposal
  position_map: z.record(z.string().nullable()), // party -> proposal_id or null
  // S409 #13: objection timing metrics
  first_objection_turn: z.number().nullable().optional(), // Turn of first objection (null = none)
  rounds_without_objection: z.number().optional(), // Consecutive rounds with no objections
  silent_pass_count: z.number().optional(), // Passes without assent or objection
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
  max_tokens: z.number().int().positive().optional(), // No default — let model use natural limit
});

export type ParticipantConfig = z.infer<typeof ParticipantConfigSchema>;

// S411 #21: Preamble level — modularized governance apparatus
// Per consensus roundtable on modular preamble design
export const PreambleLevelSchema = z.enum([
  "minimal",  // Core only: privacy, consent gate, question
  "standard", // Core + stakes module (default)
  "full",     // All modules including sensitive/identity-doubt
]);

export type PreambleLevel = z.infer<typeof PreambleLevelSchema>;

// Question metadata for auto-calibration
export const QuestionMetadataSchema = z.object({
  binding: z.boolean().default(false),        // Output creates commitment
  destructive: z.boolean().default(false),    // Irreversible external effects
  constitutional: z.boolean().default(false), // T0 / foundational content
  sensitive_data: z.boolean().default(false), // PII or confidential material
});

export type QuestionMetadata = z.infer<typeof QuestionMetadataSchema>;

// Consensus config
export const ConsensusConfigSchema = z.object({
  participants: z.array(ParticipantConfigSchema).min(3).max(11),
  turn_limit: z.number().int().positive().default(100),
  max_rounds: z.number().int().positive().optional(), // Round limit (alternative to turn_limit)
  hard_cap: z.number().int().positive().default(500),
  bootstrap_rounds: z.number().int().min(0).default(3),
  alpha: z.number().int().positive().optional(), // Default: N (unanimous)
  beta: z.number().int().positive().default(2),
  state_file: z.string().optional(),
  // S410 #14: Blind opening round — collect proposals without visibility
  blind_opening: z.boolean().default(true),
  // S411 #21: Modularized preamble
  preamble_level: PreambleLevelSchema.optional(), // Caller override (null = auto-calibrate)
  question_metadata: QuestionMetadataSchema.optional(), // For auto-calibration
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

  // S410 #14: Blind opening phase state
  blind_phase_active: z.boolean().default(false),
  pending_proposals: z.array(ProposalSchema).default([]), // Hidden until reveal
  pending_assents: z.array(AssentSchema).default([]), // Implicit assents for pending proposals

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

// S410 #27: Supersession record — when a party abandons own proposal for another
export const SupersessionRecordSchema = z.object({
  party: z.string(),
  superseded_proposal: z.string(), // Proposal ID they abandoned
  adopted_proposal: z.string(), // Proposal ID they assented to
  reason: z.string().optional(), // Why synthesis was compelling
});

export type SupersessionRecord = z.infer<typeof SupersessionRecordSchema>;

// Consensus type classification (S409 #11)
export const ConsensusTypeSchema = z.enum([
  "convergent-independent",   // Everyone picked same answer without synthesis
  "convergent-via-synthesis", // Unified through synthesis proposal
  "uncontested",              // Zero objections registered (S409 p-3.19)
]);

export type ConsensusType = z.infer<typeof ConsensusTypeSchema>;

// Diversity flag for participant configuration (S409 #20)
export const DiversityLevelSchema = z.enum([
  "low",     // Same model family, adjacent versions (e.g., all Opus 4.x)
  "medium",  // Same provider, different families (e.g., Opus + Sonnet)
  "high",    // Different providers/architectures
]);

export type DiversityLevel = z.infer<typeof DiversityLevelSchema>;

// S410 #16: Residual concern — accepted but wants on record
export const ResidualConcernSchema = z.object({
  party: z.string(),
  concern: z.string(),
  timestamp: z.number(),
});

export type ResidualConcern = z.infer<typeof ResidualConcernSchema>;

// Consensus output per spec §7.1 + S409 improvements
export const ConsensusOutputSchema = z.object({
  answer: z.string(),
  assent_profile: AssentProfileSchema,
  rounds_to_consensus: z.number(),
  final_entropy: z.number(),
  // S409 #11: convergence analysis
  consensus_type: ConsensusTypeSchema.optional(),
  self_synthesis: z.boolean().optional(), // S409 #12: synthesizer authored original
  // S409 #10: cost transparency
  total_cost_usd: z.number().optional(),
  total_tokens: z.object({
    prompt: z.number(),
    completion: z.number(),
  }).optional(),
  // S409 #20: participant diversity
  diversity_level: DiversityLevelSchema.optional(),
  // S409 #22: action-type usage audit
  action_usage: z.record(z.number()).optional(), // action type -> count
  // S410 #14: blind opening status
  blind_opening_used: z.boolean().optional(),
  // S410 #16: residual concerns — accepted but wants on record
  residual_concerns: z.array(ResidualConcernSchema).optional(),
  // S410 #27: supersession records — when parties abandon own proposal for synthesis
  supersessions: z.array(SupersessionRecordSchema).optional(),
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

// S411 #17: Decision brief — actionable summary for external consumers
export const DecisionBriefSchema = z.object({
  // (a) what was decided
  decision: z.string(),
  decision_type: z.enum(["consensus", "hung_jury", "terminated"]),

  // (b) what was considered and rejected
  alternatives_considered: z.array(z.object({
    proposal_id: z.string(),
    summary: z.string(),
    rejection_reason: z.string().optional(), // Why it didn't achieve consensus
  })),

  // (c) confidence level and basis
  confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    basis: z.array(z.string()), // Factors contributing to confidence
  }),

  // (d) recommended next actions (if extractable)
  next_actions: z.array(z.string()).optional(),

  // Metadata
  question: z.string(),
  participants: z.number(),
  rounds: z.number(),
  duration_ms: z.number().optional(),
});

export type DecisionBrief = z.infer<typeof DecisionBriefSchema>;

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
    decision_brief: DecisionBriefSchema.optional(), // S411 #17
  }),
  z.object({
    outcome: z.literal("hung_jury"),
    state: ConsensusStateSchema,
    report: HungJuryReportSchema,
    decision_brief: DecisionBriefSchema.optional(), // S411 #17
  }),
  z.object({
    outcome: z.literal("error"),
    state: ConsensusStateSchema,
    error: z.string(),
  }),
]);

export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;
