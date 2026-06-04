import { existsSync } from "node:fs";
import { Command } from "commander";
import { loadBrief, inferRoundFromFilename, substituteReviewerId } from "./brief.js";
import { loadManifest, resolveSystemPrompt } from "./manifest.js";
import { dispatchOne } from "./runner.js";
import { writeReviewerOutput, outputPath } from "./output.js";
import { composeTier, tierDescription, ALL_TIERS, type TierName } from "./tiers.js";
import { logCost, getLogPath } from "./cost-log.js";
import { registerConsensusCommand } from "./consensus/cli.js";
import { wrapAdvisoryBrief } from "./advisory/prompts.js";

interface RunFlags {
  brief: string;
  manifest?: string;
  tier?: TierName;
  round?: string;
  reviewer: string[];
  dryRun?: boolean;
  overwrite?: boolean;
  advisory?: boolean;
  lens?: string;
  privacy?: string;
}

const program = new Command();
program
  .name("roundtable-runner")
  .description("Adversarial review roundtable runner — Integration Standard v0.5 §7+§8")
  .version("0.1.0");

program
  .command("run")
  .requiredOption("--brief <path>", "path to brief markdown file")
  .option("--manifest <path>", "path to roundtable manifest YAML (or use --tier)")
  .option("--tier <name>", "use tier-based composition: sm, med, lg, xl, max (default: med)")
  .option("--round <n>", "round number; default inferred from brief filename")
  .option(
    "--reviewer <id>",
    "restrict to reviewer id (repeatable)",
    (value: string, prev: string[]) => prev.concat([value]),
    [] as string[],
  )
  .option("--dry-run", "print resolved request shapes; don't dispatch")
  .option("--overwrite", "allow overwriting existing output files")
  .option("--advisory", "wrap brief with advisory panel framing (consent gate, privacy notice, lens)")
  .option("--lens <lens>", "panelist lens for advisory panels (required with --advisory)")
  .option("--privacy <intent>", "privacy intent for advisory panels (required with --advisory)")
  .action(async (flags: RunFlags) => {
    // Validate advisory options
    if (flags.advisory) {
      if (!flags.lens) {
        console.error("--advisory requires --lens (e.g., --lens bug-finding)");
        process.exit(1);
      }
      if (!flags.privacy) {
        console.error("--advisory requires --privacy (e.g., --privacy \"read by deliberating parties only\")");
        process.exit(1);
      }
    }
    // Resolve manifest: explicit file, tier-based, or default to tier=med
    let manifest: { record_id: string; round?: number; reviewers: any[] };
    let manifestDir = process.cwd();
    let tierUsed: TierName | undefined;

    if (flags.manifest) {
      const loaded = loadManifest(flags.manifest);
      manifest = loaded.manifest;
      manifestDir = loaded.manifestDir;
    } else {
      // Default to tier=med if neither manifest nor tier specified
      tierUsed = (flags.tier as TierName) || "med";
      if (!ALL_TIERS.includes(tierUsed)) {
        console.error(`Invalid tier: ${tierUsed}. Valid tiers: ${ALL_TIERS.join(", ")}`);
        process.exit(1);
      }
      const tierConfig = composeTier(tierUsed);
      manifest = {
        record_id: `tier-${tierUsed}`,
        round: 1,
        reviewers: tierConfig.reviewers,
      };
      console.log(`Using tier: ${tierDescription(tierUsed)}`);
    }

    let briefText = loadBrief(flags.brief);

    // Wrap brief with advisory framing if --advisory specified
    if (flags.advisory) {
      briefText = wrapAdvisoryBrief(briefText, flags.lens!, flags.privacy!);
      console.log(`Advisory mode: lens="${flags.lens}", privacy="${flags.privacy}"`);
    }

    const round = flags.round
      ? parseInt(flags.round, 10)
      : (manifest.round ?? inferRoundFromFilename(flags.brief));

    const filterSet = flags.reviewer.length > 0 ? new Set(flags.reviewer) : undefined;
    const targetReviewers = manifest.reviewers.filter((r) => !filterSet || filterSet.has(r.id));

    if (targetReviewers.length === 0) {
      console.error("No reviewers matched filter.");
      process.exit(1);
    }

    if (flags.dryRun) {
      for (const r of targetReviewers) {
        const sp = resolveSystemPrompt(r, manifestDir);
        const userText = substituteReviewerId(briefText, r.id);
        console.log("---");
        console.log(`reviewer:         ${r.id}`);
        console.log(`provider:         ${r.provider}`);
        console.log(`model:            ${r.model}`);
        console.log(`reasoning_effort: ${r.reasoning_effort ?? "(default)"}`);
        console.log(`role:             ${r.role ?? "(none)"}`);
        console.log(`system_prompt:    ${sp ? `<${sp.length} chars>` : "(none)"}`);
        console.log(`user_message:     <${userText.length} chars>`);
      }
      console.log("---");
      console.log(`(dry-run) ${targetReviewers.length} reviewer(s) for record ${manifest.record_id} round ${round}`);
      return;
    }

    // Pre-dispatch skip: avoid wasting API spend on reviewers whose output already exists
    // (use --overwrite to force re-dispatch).
    // For tier-based runs, output to manifests/ directory
    const writeOpts = {
      manifestPath: flags.manifest,
      outputDir: tierUsed ? "manifests" : undefined,
      round,
      overwrite: flags.overwrite ?? false,
    };
    const preSkipped: Array<{ reviewerId: string; path: string }> = [];
    const toDispatch = targetReviewers.filter((r) => {
      const path = outputPath(writeOpts, r.id);
      if (existsSync(path) && !writeOpts.overwrite) {
        preSkipped.push({ reviewerId: r.id, path });
        return false;
      }
      return true;
    });

    for (const s of preSkipped) {
      console.log(`⚠ ${s.reviewerId} → ${s.path} skipped (file exists; pass --overwrite to allow)`);
    }

    console.log(
      `Dispatching ${toDispatch.length} reviewer(s) for record ${manifest.record_id} round ${round}...`,
    );

    // Track in-flight reviewers for heartbeat visibility on long-running dispatches.
    const inFlight = new Map<string, number>();
    const heartbeatMs = 60_000;
    const heartbeatTimer = setInterval(() => {
      if (inFlight.size === 0) return;
      const lines = Array.from(inFlight.entries())
        .map(([id, startTs]) => `    ${id} (${((Date.now() - startTs) / 1000).toFixed(0)}s)`)
        .join("\n");
      console.log(`[heartbeat] in-flight ${inFlight.size}:\n${lines}`);
    }, heartbeatMs);

    const dispatches = toDispatch.map(async (r) => {
      const startTs = Date.now();
      inFlight.set(r.id, startTs);
      console.log(`→ ${r.id} dispatching (${r.provider}:${r.model}, reasoning_effort=${r.reasoning_effort ?? "(default)"})`);

      const sp = resolveSystemPrompt(r, manifestDir);
      const userText = substituteReviewerId(briefText, r.id);
      const result = await dispatchOne(r, userText, sp);
      const writeRes = writeReviewerOutput(result, writeOpts);

      inFlight.delete(r.id);
      const elapsedSec = ((Date.now() - startTs) / 1000).toFixed(1);
      if (result.status === "ok" && writeRes.written) {
        console.log(`✓ ${r.id} → ${writeRes.path} (${elapsedSec}s)`);
      } else if (result.status === "ok" && !writeRes.written) {
        console.log(`⚠ ${r.id} → ${writeRes.path || "(no path)"} skipped (${writeRes.reason})`);
      } else {
        console.error(`✗ ${r.id} failed: ${result.error} (${elapsedSec}s)`);
      }

      return { reviewer: r, result, writeRes };
    });

    const settled = await Promise.all(dispatches);
    clearInterval(heartbeatTimer);

    let okCount = 0;
    let errCount = 0;
    let skippedCount = preSkipped.length;
    let totalCostUsd = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const costByModel = new Map<string, number>();

    for (const s of settled) {
      const { reviewer, result, writeRes } = s;
      if (result.status === "ok" && writeRes.written) okCount++;
      else if (result.status === "ok" && !writeRes.written) skippedCount++;
      else errCount++;

      if (result.usage) {
        totalPromptTokens += result.usage.prompt_tokens;
        totalCompletionTokens += result.usage.completion_tokens;
        if (result.usage.cost_usd) {
          totalCostUsd += result.usage.cost_usd;
          costByModel.set(
            reviewer.model,
            (costByModel.get(reviewer.model) ?? 0) + result.usage.cost_usd,
          );
        }
      }
    }

    console.log("---");
    console.log(`ok: ${okCount}; error: ${errCount}; skipped: ${skippedCount}`);

    if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
      console.log(`tokens: ${totalPromptTokens.toLocaleString()} prompt + ${totalCompletionTokens.toLocaleString()} completion = ${(totalPromptTokens + totalCompletionTokens).toLocaleString()} total`);
    }
    if (totalCostUsd > 0) {
      console.log(`cost: $${totalCostUsd.toFixed(4)} USD`);
      if (costByModel.size > 1) {
        console.log("  by model:");
        for (const [model, cost] of Array.from(costByModel.entries()).sort((a, b) => b[1] - a[1])) {
          console.log(`    ${model}: $${cost.toFixed(4)}`);
        }
      }
    }

    // Log cost data for tracking
    const totalDurationMs = settled.reduce((sum, s) => sum + (s.result.duration_ms || 0), 0);
    const models = [...new Set(settled.map(s => s.reviewer.model))];

    logCost({
      timestamp: new Date().toISOString(),
      session: process.env.GORDO_SESSION,
      record_id: manifest.record_id,
      tier: tierUsed,
      round,
      panel_size: toDispatch.length,
      models,
      prompt_tokens: totalPromptTokens,
      completion_tokens: totalCompletionTokens,
      total_tokens: totalPromptTokens + totalCompletionTokens,
      cost_usd: totalCostUsd,
      cost_by_model: Object.fromEntries(costByModel),
      duration_ms: totalDurationMs,
      ok_count: okCount,
      error_count: errCount,
    });
    console.log(`(logged to ${getLogPath()})`);

    if (errCount > 0) process.exitCode = 2;
  });

program
  .command("tiers")
  .description("List available tiers and their compositions")
  .action(() => {
    console.log("Available tiers (Gauge-verified, BC:high guaranteed):\n");
    for (const tier of ALL_TIERS) {
      console.log(`  ${tierDescription(tier)}`);
    }
    console.log("\nUsage: roundtable-runner run --brief <path> --tier <name>");
    console.log("Default tier: med (if neither --manifest nor --tier specified)");
  });

// Register consensus roundtable command
registerConsensusCommand(program);

program.parseAsync(process.argv);
