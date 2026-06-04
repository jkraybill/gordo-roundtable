/**
 * Consensus Roundtable — CLI Command
 */

import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import type { ConsensusConfig, ParticipantConfig } from "./types.js";
import { createInitialState } from "./state.js";
import { runConsensusRoundtable, resumeFromFile } from "./orchestrator.js";
import { logCost, getLogPath } from "../cost-log.js";
import { loadBrief, parseBriefForConsensus } from "../brief.js";

interface PanelFile {
  name: string;
  description?: string;
  participants: ParticipantConfig[];
}

interface ConsensusFlags {
  brief: string;
  panel?: string;
  participants: string;
  turnLimit: string;
  maxRounds?: string;
  beta: string;
  bootstrapRounds: string;
  stateFile?: string;
  resume?: string;
  dryRun?: boolean;
  outputDir?: string;
}

/**
 * Load panel configuration from YAML file.
 * Resolves relative paths from package panels/ directory.
 */
function loadPanel(panelPath: string): PanelFile {
  // Check if it's a built-in panel name (no path separators, no .yaml)
  if (!panelPath.includes("/") && !panelPath.includes("\\") && !panelPath.endsWith(".yaml")) {
    const builtinPath = resolve(dirname(new URL(import.meta.url).pathname), "../../panels", `${panelPath}.yaml`);
    if (existsSync(builtinPath)) {
      panelPath = builtinPath;
    }
  }

  const resolved = resolve(panelPath);
  if (!existsSync(resolved)) {
    throw new Error(`Panel file not found: ${resolved}`);
  }

  const content = readFileSync(resolved, "utf-8");
  const parsed = YAML.parse(content) as PanelFile;

  if (!parsed.participants || !Array.isArray(parsed.participants) || parsed.participants.length === 0) {
    throw new Error(`Panel file must have at least one participant: ${resolved}`);
  }

  return parsed;
}

export function registerConsensusCommand(program: Command): void {
  program
    .command("consensus")
    .description("Run a consensus roundtable — multi-turn AI deliberation for unanimous agreement")
    .requiredOption("--brief <path>", "Path to brief markdown file (first paragraph = question, rest = context)")
    .option("--panel <path>", "Panel YAML file (built-in: opus, sonnet, mixed; default: opus)")
    .option("--participants <n>", "Number of participants (overrides panel size if specified)")
    .option("--turn-limit <n>", "Maximum turns (default: 100)", "100")
    .option("--max-rounds <n>", "Maximum rounds (alternative to turn-limit)")
    .option("--beta <n>", "Stability horizon for consensus (default: 2)", "2")
    .option("--bootstrap-rounds <n>", "Rounds for optional bootstrap phase (0 to skip, default: 3)", "3")
    .option("--state-file <path>", "Path to save state for crash recovery")
    .option("--resume <path>", "Resume from saved state file")
    .requiredOption("--output-dir <path>", "Directory to write results (must not be under gordo-roundtable)")
    .option("--dry-run", "Print config without running")
    .action(async (flags: ConsensusFlags) => {
      const turnLimit = parseInt(flags.turnLimit, 10);
      const maxRounds = flags.maxRounds ? parseInt(flags.maxRounds, 10) : undefined;
      const beta = parseInt(flags.beta, 10);
      const bootstrapRounds = parseInt(flags.bootstrapRounds, 10);

      // Load panel configuration
      const panelName = flags.panel || "opus";
      let panel: PanelFile;
      try {
        panel = loadPanel(panelName);
        console.log(`Panel: ${panel.name}${panel.description ? ` — ${panel.description}` : ""}`);
      } catch (err) {
        console.error(`Error loading panel: ${(err as Error).message}`);
        process.exit(1);
      }

      // Use panel participants, optionally limited by --participants flag
      let participants = panel.participants;
      if (flags.participants) {
        const requestedCount = parseInt(flags.participants, 10);
        if (requestedCount < 3 || requestedCount > 11) {
          console.error("Error: participants must be between 3 and 11 (per spec §2.2)");
          process.exit(1);
        }
        // Cycle through panel participants if requested count exceeds panel size
        participants = [];
        for (let i = 0; i < requestedCount; i++) {
          participants.push(panel.participants[i % panel.participants.length]);
        }
      }

      if (participants.length < 3) {
        console.error("Error: panel must have at least 3 participants (per spec §2.2)");
        process.exit(1);
      }
      if (participants.length > 11) {
        console.error("Error: panel must have at most 11 participants (per spec §2.2)");
        process.exit(1);
      }

      const config: ConsensusConfig = {
        participants,
        turn_limit: turnLimit,
        max_rounds: maxRounds,
        hard_cap: 500,
        bootstrap_rounds: bootstrapRounds,
        beta,
        state_file: flags.stateFile,
      };

      // Parse brief file
      const briefText = loadBrief(flags.brief);
      const { question, context } = parseBriefForConsensus(briefText);
      console.log(`Question: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);
      if (context) {
        console.log(`Context: ${context.slice(0, 80)}${context.length > 80 ? "..." : ""}`);
      }

      if (flags.dryRun) {
        console.log("\n=== DRY RUN ===\n");
        console.log("Question:", question);
        if (context) console.log("Context:", context);
        console.log("\nConfig:");
        console.log(YAML.stringify(config));
        console.log("\nParticipants:");
        for (let i = 0; i < participants.length; i++) {
          const p = participants[i];
          console.log(`  Party ${String.fromCharCode(65 + i)}: ${p.model}`);
        }
        return;
      }

      // Create or resume state
      let state;
      if (flags.resume) {
        console.log(`Resuming from: ${flags.resume}`);
        state = resumeFromFile(flags.resume);
        console.log(`Resumed at turn ${state.turn_count}, round ${state.round_count}`);
      } else {
        state = createInitialState(question, context, config);
      }

      // Validate and create output directory
      // STRONG RULE: artifacts must NOT go under gordo-roundtable project
      const outputDir = resolve(flags.outputDir!);
      const packageRoot = resolve(dirname(new URL(import.meta.url).pathname), "../..");
      if (outputDir.startsWith(packageRoot)) {
        console.error(`Error: --output-dir must not be under gordo-roundtable project`);
        console.error(`       Got: ${outputDir}`);
        console.error(`       Package root: ${packageRoot}`);
        console.error(`       Use a path in your calling project, e.g., ./roundtable-results`);
        process.exit(1);
      }
      mkdirSync(outputDir, { recursive: true });

      // Track costs
      const startTime = Date.now();
      let totalCost = 0;
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      // Run the roundtable
      const result = await runConsensusRoundtable(state, {
        onLog: console.log,
        onStateChange: (newState) => {
          // Accumulate costs from turn log
          const lastTurn = newState.turn_log[newState.turn_log.length - 1];
          if (lastTurn?.usage) {
            totalPromptTokens += lastTurn.usage.prompt_tokens;
            totalCompletionTokens += lastTurn.usage.completion_tokens;
            totalCost += lastTurn.usage.cost_usd || 0;
          }
        },
      });

      // Write results
      const sessionId = state.session_id.slice(0, 8);
      const resultFile = `${outputDir}/consensus-${sessionId}.yaml`;
      writeFileSync(resultFile, YAML.stringify(result, { lineWidth: 0 }));
      console.log(`\nResult written to: ${resultFile}`);

      // Log cost
      const durationMs = Date.now() - startTime;
      logCost({
        timestamp: new Date().toISOString(),
        session: process.env.GORDO_SESSION,
        record_id: `consensus-${sessionId}`,
        round: state.round_count,
        panel_size: participants.length,
        models: [...new Set(participants.map(p => p.model))],
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalPromptTokens + totalCompletionTokens,
        cost_usd: totalCost,
        cost_by_model: {},
        duration_ms: durationMs,
        ok_count: state.turn_count,
        error_count: 0,
      });
      console.log(`(logged to ${getLogPath()})`);

      // Summary
      console.log("\n=== SUMMARY ===");
      console.log(`Outcome: ${result.outcome}`);
      console.log(`Turns: ${result.state.turn_count}`);
      console.log(`Rounds: ${result.state.round_count}`);
      console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`Cost: $${totalCost.toFixed(4)}`);

      if (result.outcome === "consensus") {
        console.log(`\nAnswer: ${result.output.answer}`);
      } else if (result.outcome === "hung_jury") {
        console.log(`\nTermination: ${result.report.termination_reason}`);
        if (result.report.common_ground) {
          console.log(`Common ground: ${result.report.common_ground}`);
        }
        if (result.report.crux_of_disagreement) {
          console.log(`Crux: ${result.report.crux_of_disagreement.join("; ")}`);
        }
      }

      // Exit code based on outcome
      if (result.outcome === "error") {
        process.exitCode = 1;
      }
    });
}
