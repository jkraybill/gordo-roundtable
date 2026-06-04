/**
 * Consensus Roundtable — CLI Command
 */

import { Command } from "commander";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import YAML from "yaml";
import type { ConsensusConfig, ParticipantConfig } from "./types.js";
import { createInitialState } from "./state.js";
import { runConsensusRoundtable, resumeFromFile } from "./orchestrator.js";
import { getConsensusEligible } from "../tiers.js";
import { logCost, getLogPath } from "../cost-log.js";

interface ConsensusFlags {
  question: string;
  context?: string;
  participants: string;
  turnLimit: string;
  beta: string;
  bootstrapRounds: string;
  stateFile?: string;
  resume?: string;
  dryRun?: boolean;
  outputDir?: string;
}

export function registerConsensusCommand(program: Command): void {
  program
    .command("consensus")
    .description("Run a consensus roundtable — multi-turn AI deliberation for unanimous agreement")
    .requiredOption("--question <text>", "The question for the roundtable to answer")
    .option("--context <text>", "Optional context for the question")
    .option("--participants <n>", "Number of participants (3-11, default: 5)", "5")
    .option("--turn-limit <n>", "Maximum turns (default: 100)", "100")
    .option("--beta <n>", "Stability horizon for consensus (default: 2)", "2")
    .option("--bootstrap-rounds <n>", "Rounds for optional bootstrap phase (0 to skip, default: 3)", "3")
    .option("--state-file <path>", "Path to save state for crash recovery")
    .option("--resume <path>", "Resume from saved state file")
    .option("--output-dir <path>", "Directory to write results (default: ./consensus-results)")
    .option("--dry-run", "Print config without running")
    .action(async (flags: ConsensusFlags) => {
      const participantCount = parseInt(flags.participants, 10);
      if (participantCount < 3 || participantCount > 11) {
        console.error("Error: participants must be between 3 and 11 (per spec §2.2)");
        process.exit(1);
      }

      const turnLimit = parseInt(flags.turnLimit, 10);
      const beta = parseInt(flags.beta, 10);
      const bootstrapRounds = parseInt(flags.bootstrapRounds, 10);

      // Build participant configs from consensus-eligible models
      const eligibleModels = getConsensusEligible();
      if (eligibleModels.length === 0) {
        console.error("Error: No consensus-eligible models available");
        process.exit(1);
      }

      const participants: ParticipantConfig[] = [];
      for (let i = 0; i < participantCount; i++) {
        const model = eligibleModels[i % eligibleModels.length];
        participants.push({
          model: model.openrouter,
          provider: "openrouter",
          reasoning_effort: "high",
          max_tokens: 8000,
        });
      }

      const config: ConsensusConfig = {
        participants,
        turn_limit: turnLimit,
        hard_cap: 500,
        bootstrap_rounds: bootstrapRounds,
        beta,
        state_file: flags.stateFile,
      };

      if (flags.dryRun) {
        console.log("=== DRY RUN ===\n");
        console.log("Question:", flags.question);
        if (flags.context) console.log("Context:", flags.context);
        console.log("\nConfig:");
        console.log(YAML.stringify(config));
        console.log("\nEligible models:");
        for (const m of eligibleModels) {
          console.log(`  - ${m.id}: ${m.openrouter}`);
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
        state = createInitialState(flags.question, flags.context, config);
      }

      // Ensure output directory exists
      const outputDir = flags.outputDir || "./consensus-results";
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
        panel_size: participantCount,
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
