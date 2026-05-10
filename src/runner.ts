import { dispatchOpenRouter } from "./providers/openrouter.js";
import { dispatchOllama } from "./providers/ollama.js";
import type { Reviewer, ReviewerResult } from "./types.js";

const RETRY_DELAY_MS = 30_000;
const MAX_ATTEMPTS = 2;

export async function dispatchOne(
  reviewer: Reviewer,
  briefText: string,
  systemPrompt: string | undefined,
): Promise<ReviewerResult> {
  const start = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const fn = reviewer.provider === "openrouter" ? dispatchOpenRouter : dispatchOllama;
      const result = await fn(reviewer, briefText, systemPrompt);
      return {
        reviewer_id: reviewer.id,
        status: "ok",
        reasoning: result.reasoning,
        content: result.content,
        duration_ms: Date.now() - start,
        usage: result.usage,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS - 1 && isRetriable(err)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }

  return {
    reviewer_id: reviewer.id,
    status: "error",
    error: errorMessage(lastError),
    duration_ms: Date.now() - start,
  };
}

function isRetriable(err: unknown): boolean {
  const anyErr = err as { status?: number; response?: { status?: number }; message?: string };
  const status = anyErr?.status ?? anyErr?.response?.status;
  if (typeof status === "number" && (status === 429 || status >= 500)) return true;
  const msg = String(anyErr?.message ?? "");
  return /overload|timeout|ECONNRESET|ETIMEDOUT|PREMATURE_CLOSE/i.test(msg);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
