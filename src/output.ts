import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ReviewerResult } from "./types.js";

export interface WriteOptions {
  manifestPath?: string;
  outputDir?: string;
  round: number;
  overwrite: boolean;
}

export function outputPath(opts: WriteOptions, reviewerId: string): string {
  // Outputs live alongside the manifest, or in outputDir if specified (for tier-based runs)
  const baseDir = opts.outputDir ?? (opts.manifestPath ? dirname(opts.manifestPath) : ".");
  return join(baseDir, `${reviewerId}-ROUND_${opts.round}.md`);
}

export function writeReviewerOutput(
  result: ReviewerResult,
  opts: WriteOptions,
): { path: string; written: boolean; reason?: string } {
  if (result.status !== "ok") {
    return { path: "", written: false, reason: `reviewer status: error — ${result.error}` };
  }
  const path = outputPath(opts, result.reviewer_id);
  if (existsSync(path) && !opts.overwrite) {
    return { path, written: false, reason: "file exists; pass --overwrite to allow" };
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatBody(result), "utf8");
  return { path, written: true };
}

function formatBody(result: ReviewerResult): string {
  const content = (result.content ?? "").trim();
  if (result.reasoning && result.reasoning.length > 0) {
    return `<reasoning>\n${result.reasoning.trim()}\n</reasoning>\n\n${content}\n`;
  }
  return `${content}\n`;
}
