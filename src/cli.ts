import { existsSync } from "node:fs";
import { Command } from "commander";
import { loadBrief, inferRoundFromFilename, substituteReviewerId } from "./brief.js";
import { loadManifest, resolveSystemPrompt } from "./manifest.js";
import { dispatchOne } from "./runner.js";
import { writeReviewerOutput, outputPath } from "./output.js";

interface RunFlags {
  brief: string;
  manifest: string;
  round?: string;
  reviewer: string[];
  dryRun?: boolean;
  overwrite?: boolean;
}

const program = new Command();
program
  .name("panel-runner")
  .description("Adversarial review panel runner — Integration Standard v0.5 §7+§8")
  .version("0.1.0");

program
  .command("run")
  .requiredOption("--brief <path>", "path to brief markdown file")
  .requiredOption("--manifest <path>", "path to panel manifest YAML")
  .option("--round <n>", "round number; default inferred from brief filename")
  .option(
    "--reviewer <id>",
    "restrict to reviewer id (repeatable)",
    (value: string, prev: string[]) => prev.concat([value]),
    [] as string[],
  )
  .option("--dry-run", "print resolved request shapes; don't dispatch")
  .option("--overwrite", "allow overwriting existing output files")
  .action(async (flags: RunFlags) => {
    const { manifest, manifestDir } = loadManifest(flags.manifest);
    const briefText = loadBrief(flags.brief);
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
    const writeOpts = { manifestPath: flags.manifest, round, overwrite: flags.overwrite ?? false };
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
    for (const s of settled) {
      const { result, writeRes } = s;
      if (result.status === "ok" && writeRes.written) okCount++;
      else if (result.status === "ok" && !writeRes.written) skippedCount++;
      else errCount++;
    }
    console.log("---");
    console.log(`ok: ${okCount}; error: ${errCount}; skipped: ${skippedCount}`);
    if (errCount > 0) process.exitCode = 2;
  });

program.parseAsync(process.argv);
