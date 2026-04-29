import { Agent, fetch } from "undici";
import type { Reviewer } from "../types.js";

const DEFAULT_NUM_CTX = 32768;

// Local Ollama on hybrid VRAM/CPU systems can take 5-30min just for model loading + memory
// allocation before any response headers are sent. Streaming generation on CPU spillover can
// further run for hours. Override undici defaults (5min headers / 5min body) accordingly.
const ollamaDispatcher = new Agent({
  headersTimeout: 30 * 60 * 1000,
  bodyTimeout: 0,
});

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  options: { num_ctx: number };
  stream: boolean;
}

interface OllamaStreamChunk {
  model?: string;
  message?: { role?: string; content?: string };
  done?: boolean;
  error?: string;
}

export async function dispatchOllama(
  reviewer: Reviewer,
  briefText: string,
  systemPrompt: string | undefined,
): Promise<{ reasoning?: string; content: string }> {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const numCtx = reviewer.num_ctx ?? DEFAULT_NUM_CTX;

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: briefText });

  const body: OllamaChatRequest = {
    model: reviewer.model,
    messages,
    options: { num_ctx: numCtx },
    stream: true,
  };

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      dispatcher: ollamaDispatcher,
    });
  } catch (err: any) {
    const parts: string[] = [];
    if (err?.name) parts.push(`name=${err.name}`);
    if (err?.code) parts.push(`code=${err.code}`);
    if (err?.message) parts.push(`message=${err.message}`);
    if (err?.cause) {
      const c = err.cause as any;
      const causeParts: string[] = [];
      if (c?.code) causeParts.push(`code=${c.code}`);
      if (c?.errno) causeParts.push(`errno=${c.errno}`);
      if (c?.syscall) causeParts.push(`syscall=${c.syscall}`);
      if (c?.message) causeParts.push(`message=${c.message}`);
      parts.push(`cause={${causeParts.join(", ")}}`);
    }
    throw new Error(`Ollama fetch failed for ${reviewer.id} model=${reviewer.model} host=${host}: ${parts.join("; ")}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "(unreadable response body)");
    throw new Error(`Ollama returned HTTP ${response.status} for ${reviewer.id} model=${reviewer.model}: ${text.slice(0, 500)}`);
  }
  if (!response.body) {
    throw new Error(`Ollama returned no response body for ${reviewer.id} model=${reviewer.model}`);
  }

  // NDJSON stream — one JSON object per line; accumulate message.content from each chunk.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let firstChunkSeen = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let chunk: OllamaStreamChunk;
      try {
        chunk = JSON.parse(line);
      } catch {
        continue;
      }
      if (chunk.error) {
        throw new Error(`Ollama stream error for ${reviewer.id}: ${chunk.error}`);
      }
      const piece = chunk.message?.content;
      if (typeof piece === "string" && piece.length > 0) {
        if (!firstChunkSeen) {
          firstChunkSeen = true;
          console.log(`  [${reviewer.id}] first chunk received — model loaded, generation in progress`);
        }
        content += piece;
      }
    }
  }
  if (buffer.trim()) {
    try {
      const chunk = JSON.parse(buffer) as OllamaStreamChunk;
      if (typeof chunk.message?.content === "string") content += chunk.message.content;
    } catch {
      /* trailing partial line — ignore */
    }
  }

  if (content.length === 0) {
    throw new Error(`Ollama returned empty content for ${reviewer.id} model=${reviewer.model} (stream ended without content)`);
  }
  // qwen3-thinking-style models emit `<think>...</think>` blocks inline; preserve as-is.
  return { content };
}
