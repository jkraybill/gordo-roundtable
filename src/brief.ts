import { readFileSync } from "node:fs";
import { basename } from "node:path";

const ROUND_PATTERN = /_ROUND_(\d+)\.md$/i;
const REVIEWER_ID_TOKEN = "<your-reviewer-id>";

export function loadBrief(path: string): string {
  return readFileSync(path, "utf8");
}

export function inferRoundFromFilename(path: string): number {
  const match = basename(path).match(ROUND_PATTERN);
  return match ? parseInt(match[1]!, 10) : 1;
}

export function substituteReviewerId(briefText: string, reviewerId: string): string {
  return briefText.split(REVIEWER_ID_TOKEN).join(reviewerId);
}
