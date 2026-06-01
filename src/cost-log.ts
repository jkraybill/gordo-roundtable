/**
 * Cost logging for roundtable runs.
 *
 * Logs each run to ~/.gordo/roundtable-costs.jsonl for tracking
 * relative costs per panel/token/model over time.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CostLogEntry {
  timestamp: string;
  session?: string;
  record_id: string;
  tier?: string;
  round: number;
  panel_size: number;
  models: string[];
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_by_model: Record<string, number>;
  duration_ms: number;
  ok_count: number;
  error_count: number;
}

const LOG_DIR = join(homedir(), ".gordo");
const LOG_FILE = join(LOG_DIR, "roundtable-costs.jsonl");

export function logCost(entry: CostLogEntry): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  const line = JSON.stringify(entry) + "\n";
  appendFileSync(LOG_FILE, line, "utf8");
}

export function getLogPath(): string {
  return LOG_FILE;
}
