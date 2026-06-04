/**
 * Advisory Panel Module
 * Per ADVISORY_INDUCTION_SPEC_V1.md (S405 consensus)
 */

export {
  buildAdvisorySystemPrompt,
  wrapAdvisoryBrief,
  buildAdvisoryFollowOnSystemPrompt,
  wrapAdvisoryFollowOnBrief,
  anonymizeFindings,
} from "./prompts.js";
