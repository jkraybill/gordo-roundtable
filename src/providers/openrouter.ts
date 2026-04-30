import OpenAI from "openai";
import type { Reviewer } from "../types.js";

const BASE_URL = "https://openrouter.ai/api/v1";

export async function dispatchOpenRouter(
  reviewer: Reviewer,
  briefText: string,
  systemPrompt: string | undefined,
): Promise<{ reasoning?: string; content: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY env var not set");
  }
  const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: briefText });

  const requestBody: Record<string, unknown> = {
    model: reviewer.model,
    messages,
    max_tokens: 32000,
  };
  if (reviewer.reasoning_effort) {
    requestBody.reasoning = { effort: reviewer.reasoning_effort };
  }

  // OpenRouter supports OpenAI-compat fields plus extras (`reasoning`); cast to bypass strict SDK types.
  let response: any;
  try {
    response = await client.chat.completions.create(requestBody as any);
  } catch (err: any) {
    const parts: string[] = [];
    if (err?.name) parts.push(`name=${err.name}`);
    if (err?.status) parts.push(`status=${err.status}`);
    if (err?.code) parts.push(`code=${err.code}`);
    if (err?.type) parts.push(`type=${err.type}`);
    if (err?.message) parts.push(`message=${err.message}`);
    if (err?.cause) {
      const c = err.cause as any;
      const causeParts: string[] = [];
      if (c?.name) causeParts.push(`name=${c.name}`);
      if (c?.code) causeParts.push(`code=${c.code}`);
      if (c?.errno) causeParts.push(`errno=${c.errno}`);
      if (c?.syscall) causeParts.push(`syscall=${c.syscall}`);
      if (c?.message) causeParts.push(`message=${c.message}`);
      parts.push(`cause={${causeParts.join(", ")}}`);
    }
    if (err?.error) parts.push(`error=${JSON.stringify(err.error)}`);
    throw new Error(`OpenRouter request failed for ${reviewer.id} model=${reviewer.model}: ${parts.join("; ")}`);
  }
  const choice = response?.choices?.[0];
  if (!choice) {
    throw new Error(`OpenRouter returned no choices for ${reviewer.id}`);
  }
  const message = choice.message ?? {};
  const content: string = typeof message.content === "string" ? message.content : "";
  const reasoning = extractReasoning(message);
  return { reasoning, content };
}

function extractReasoning(message: any): string | undefined {
  const details = message.reasoning_details;
  if (Array.isArray(details) && details.length > 0) {
    const joined = details
      .map((d: any) => (typeof d?.text === "string" ? d.text : typeof d?.summary === "string" ? d.summary : ""))
      .filter((s: string) => s.length > 0)
      .join("\n\n");
    if (joined.length > 0) return joined;
  }
  if (typeof message.reasoning === "string" && message.reasoning.length > 0) {
    return message.reasoning;
  }
  return undefined;
}
