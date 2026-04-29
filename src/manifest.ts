import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ManifestSchema, type Manifest, type Reviewer } from "./types.js";

export function loadManifest(path: string): { manifest: Manifest; manifestDir: string } {
  const text = readFileSync(path, "utf8");
  const parsed = parseYaml(text);
  const manifest = ManifestSchema.parse(parsed);
  return { manifest, manifestDir: dirname(resolve(path)) };
}

export function resolveSystemPrompt(reviewer: Reviewer, manifestDir: string): string | undefined {
  if (reviewer.system_prompt) return reviewer.system_prompt;
  if (reviewer.system_prompt_file) {
    return readFileSync(resolve(manifestDir, reviewer.system_prompt_file), "utf8");
  }
  return undefined;
}
