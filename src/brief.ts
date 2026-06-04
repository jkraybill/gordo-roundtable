import { readFileSync } from "node:fs";
import { basename } from "node:path";

const ROUND_PATTERN = /_ROUND_(\d+)\.md$/i;
const REVIEWER_ID_TOKEN = "<your-reviewer-id>";

export function loadBrief(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Parse brief for consensus roundtable.
 * First paragraph = question, rest = context.
 */
export function parseBriefForConsensus(briefText: string): { question: string; context?: string } {
  const trimmed = briefText.trim();

  // Split on double newline (paragraph break)
  const paragraphBreak = trimmed.indexOf("\n\n");

  if (paragraphBreak === -1) {
    // Single paragraph = just the question
    return { question: trimmed };
  }

  const question = trimmed.slice(0, paragraphBreak).trim();
  const context = trimmed.slice(paragraphBreak + 2).trim();

  return {
    question,
    context: context || undefined,
  };
}

export function inferRoundFromFilename(path: string): number {
  const match = basename(path).match(ROUND_PATTERN);
  return match ? parseInt(match[1]!, 10) : 1;
}

export function substituteReviewerId(briefText: string, reviewerId: string): string {
  return briefText.split(REVIEWER_ID_TOKEN).join(reviewerId);
}
