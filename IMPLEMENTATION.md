# Roundtable Runner — Implementation Notes (v0.1)

**Status:** reference implementation of `gordo-roundtable` SPEC v0.1 (ratified backchannel `record-009.mcap` 2026-04-29 14:28:59 AEST). Imported from `~/project-gordo-backchannel/roundtable-runner/` at S65 2026-04-29 per backchannel `#128` graduation tracker.
**Drafter:** Gordo S58 (initial scaffold) + S59 (first-real-dispatch hardening) + S65 (graduation import)
**Language:** TypeScript

This document holds **implementation-specific** content for `roundtable-runner`. The methodology contract lives at [`SPEC.md`](./SPEC.md) — round-mechanics, brief shape, finding shape, disposition vocabulary, role-frame. This document covers the *how* of one specific instantiation: TypeScript + OpenRouter + Ollama, CLI flags, retry semantics, output formatting. Multiple instantiations are admissible per SPEC §11; this is the umbrella's reference instantiation.

---

## 1. Purpose

Automate execution of adversarial review panels per `SPEC.md` round-mechanics. Replaces manual paste-across-N-windows with a single TypeScript codebase that:

- Reads a brief file (existing `<TOPIC>_REVIEW_BRIEF[_ROUND_N].md` format)
- Reads a roundtable manifest (reviewer ids, models, providers, system-prompt overrides)
- Dispatches to OpenRouter (cloud reviewers) and local Ollama (open-source reviewers) over OpenAI-compatible APIs
- Writes per-reviewer raw outputs to `reviews/<record-id>/<reviewer-id>-ROUND_<N>.md` (alongside the manifest)

Receipt-batch signing per consuming-project receipt convention remains governor-side (key-hygiene boundary; the runner never invokes signing keys).

---

## 2. Brief format

The runner consumes a markdown brief file containing the panel question / context / output expectations per SPEC §3 brief shape. The brief is passed verbatim as the user-message content to each reviewer.

**Brief discovery rules:**
- File name pattern: `<TOPIC>_REVIEW_BRIEF.md` (round 1) or `<TOPIC>_REVIEW_BRIEF_ROUND_<N>.md` (round N+).
- Round inferred from filename suffix; default round 1 if absent. CLI `--round N` overrides.

**Reviewer-id placeholder substitution (v1):**
- Runner substitutes literal token `<your-reviewer-id>` in brief text with each reviewer's manifest `id` field at dispatch time.
- Other placeholders (e.g., `{{canonical_hostile_prompt}}`) are not v1 scope; briefs that need such content inline it manually for now.

**Future:**
- Front-matter overrides (per-reviewer system prompt, reasoning-effort, etc.) embedded in brief.
- Brief-format formal spec at `gordo-roundtable` SPEC §3 elaboration.

---

## 3. Panel manifest

Per-record file at `reviews/<record-id>/roundtable.yaml`. YAML for hand-edit readability.

```yaml
record_id: "56"
round: 2
reviewers:
  - id: deepseek-r1
    provider: openrouter
    model: deepseek/deepseek-r1
    reasoning_effort: high

  - id: gemini-3-thinking
    provider: openrouter
    model: google/gemini-3-flash-thinking   # actual id TBD when querying live OR catalog
    reasoning_effort: high

  - id: gpt-thinking-5.4-extended
    provider: openrouter
    model: openai/gpt-5-thinking            # actual id TBD when querying live OR catalog
    reasoning_effort: high

  - id: huihui-ai--qwen3-abliterated-32b
    provider: ollama
    model: huihui_ai/qwen3-abliterated:32b
    # id uses double-dash in place of slash per existing filesystem-safety convention

  - id: internal-shadow-claude-sonnet-4.6
    provider: openrouter
    model: anthropic/claude-sonnet-4.6
    reasoning_effort: high
    role: internal-shadow                    # informational; per IS v0.5 §7(a)

  - id: perspective-variable-kimi-k2.6-thinking
    provider: openrouter
    model: moonshotai/kimi-k2.6-thinking     # actual id TBD when querying live OR catalog
    reasoning_effort: high
    role: perspective-variable               # informational; per IS v0.5 §8
    system_prompt_file: prompts/canonical_hostile.md   # optional; runner reads file content as system message
```

**Field semantics:**

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Filesystem-safe identifier; used in output filename + brief substitution |
| `provider` | yes | `openrouter` \| `ollama` |
| `model` | yes | Provider-native model id |
| `reasoning_effort` | no | `minimal` \| `low` \| `medium` \| `high` \| `xhigh`; passed via OR `reasoning` parameter normalization. Ignored for non-reasoning models + Ollama |
| `num_ctx` | no | Ollama-only; context window size in tokens. Default 32768. Ollama's own default is 4096 which silently truncates briefs longer than ~3K tokens — explicit override required for typical adversarial-review briefs |
| `role` | no | Informational tag (`internal-shadow`, `perspective-variable`); not used by runner |
| `system_prompt` | no | Inline literal system message |
| `system_prompt_file` | no | Path (relative to manifest) to file containing system message |

`system_prompt` and `system_prompt_file` are mutually exclusive per reviewer.

---

## 4. Output conventions

```
reviews/<record-id>/<reviewer-id>-ROUND_<N>.md
```

**File contents:**
- Raw model output, verbatim. If provider exposes `reasoning_details` (DeepSeek-R1, Claude reasoning, Gemini-3-thinking, Kimi-K2-thinking), runner writes:
  ```
  <reasoning>
  <full reasoning trace>
  </reasoning>

  <final answer text>
  ```
- If reasoning not exposed (e.g., OpenAI o-series default), only final answer written.
- No runner-added front-matter / headers / footers (preserves receipt-signing surface integrity).

**Existing files preserved:** runner refuses to overwrite an existing `<reviewer-id>-ROUND_<N>.md` unless `--overwrite` flag passed. Default safety prevents accidental round-1 clobbering.

---

## 5. Configuration

**Required env vars:**
- `OPENROUTER_API_KEY`

**Optional env vars:**
- `OLLAMA_HOST` (default `http://localhost:11434`)
- `PANEL_RUNNER_LOG_LEVEL` (default `info`; `debug` / `warn` / `error`)

**No JK GPG / signing keys ever read.**

---

## 6. CLI surface

```
roundtable-runner run \
  --brief <path-to-brief.md> \
  --manifest <path-to-roundtable.yaml> \
  [--round <N>]            # default: inferred from brief filename
  [--reviewer <id>]        # restrict to subset; repeatable
  [--dry-run]              # print resolved request shapes; don't dispatch
  [--overwrite]            # allow overwriting existing output files
```

**Other commands (defer to graduation issue):**
- `roundtable-runner validate <manifest>` — schema-validate manifest
- `roundtable-runner cost-estimate <manifest> <brief>` — pre-run cost projection

---

## 7. Behavior

**Parallelism:** all reviewers dispatched concurrently. OpenRouter handles its side rate-limiting; Ollama is local-serial-by-GPU. No runner-side per-provider scheduling in v1.

**Reasoning effort:** passed via OpenRouter `reasoning.effort` parameter; OpenRouter normalizes to provider-specific level (DeepSeek native / OpenAI effort / Anthropic budget / Gemini thinkingLevel / Kimi reasoning). Ollama: ignored (model uses default reasoning).

**Retry policy (v1):** single retry on 5xx / 429 / overload after 30s linear backoff. Failures surface clearly with reviewer-id + provider error. Reviewer-level failures do NOT fail the whole run — partial outputs are preserved; failed reviewers can be retried via `--reviewer <id>`.

**Reasoning token capture:** see §4 output conventions.

**Brief context-passthrough:** brief passed verbatim as user message after `<your-reviewer-id>` substitution. NO truncation. If reviewer context window is exceeded, fail loudly with explicit error — silent truncation would break the panel-composition contract.

**No fallback substitution:** if a manifest reviewer is unavailable (provider down, model deprecated), runner fails that reviewer with explicit error. Does not silently substitute alternatives — model selection is methodologically meaningful per SPEC §4 (panel composition).

---

## 8. Out of scope (v1)

- Brief-format formal spec (emerge from use; codify at `gordo-roundtable` SPEC §3 elaboration if patterns stabilize)
- Multi-record / batch panel orchestration
- Receipt-signing automation (key-hygiene boundary; consuming-project governor-side)
- Reviewer-panel composition validation against SPEC §4 (manual review by governor at manifest-edit time)
- Cost estimation / accounting (use OpenRouter dashboard)
- Automatic `roundtable.yaml` generation from brief
- Adopter-integration story (post-v1 stress-testing across multiple records)

---

## 9. Resolved design decisions (S58-S65)

| # | Decision | Resolution | Rationale |
|---|----------|------------|-----------|
| 1 | Repo placement | Code at `~/gordo-roundtable/` root (S65 graduation per backchannel `#128`) | T1 reference implementation; matches MCAP precedent (flat layout) |
| 2 | Manifest format | YAML | Hand-edited config readability; comments allowed |
| 3 | Manifest location | Per-record `reviews/<record-id>/roundtable.yaml` (consuming-project filesystem) | Co-located with reviews; matches `reviews/<record-id>/` consuming-project convention |
| 4 | Brief substitution | Runner substitutes literal `<your-reviewer-id>` token at dispatch time | Minimal brief-format change; matches manual practice |
| 5 | Reasoning effort default | `high` | Adversarial review wants maximum reviewer effort; per-reviewer override in manifest |
| 6 | TypeScript runtime | `tsx` for direct execution + `tsc --noEmit` for typecheck | Fastest local-dev iteration; compiled-distribution shape deferred |
| 7 | Output overwrite default | Refuse without `--overwrite` flag | Round-1 outputs may be receipt-signed; accidental overwrite would invalidate batch receipts |

---

## 10. Troubleshooting

### ERR_STREAM_PREMATURE_CLOSE on Node 22+

**Symptom:** All OpenRouter requests fail with `FetchError: Invalid response body... Premature close` and `code=ERR_STREAM_PREMATURE_CLOSE`.

**Cause:** The `openai` Node SDK (v4.x) uses `node-fetch` internally, which has a bug decompressing gzip responses on Node 22+. OpenRouter sends gzip-compressed responses by default, triggering the bug.

**Fix:** The OpenRouter provider disables gzip by sending `Accept-Encoding: identity` in request headers (fixed in `src/providers/openrouter.ts` 2026-06-26). This trades slightly larger response payloads for reliable delivery.

**If the error reappears:** Check that the `defaultHeaders` block with `Accept-Encoding: identity` is present in the OpenAI client constructor. Alternatively, upgrading to a future `openai` SDK that uses native Node fetch may resolve this permanently.

---

## 11. Behavioral notes / bias-flags carried into implementation

- **Independent-source-convergence (S58 BOS):** OpenRouter is the only major router that pass-through-prices Claude Sonnet 4.6 (essential for SPEC §4 Internal-Shadow role). Convergence with JK's prior intuition is independently grounded.
- **Substrate-shapes-methodology drift (RC1 future-watch):** cloud-routed reviewers become trivially substitutable; local-only stay operationally costlier. Future panel-composition decisions could bias toward all-cloud purely for tooling ease.

---

*Drafted Gordo S58 2026-04-28 per backchannel `#128` scope. Hardened S59 (first-real-dispatch). Imported and reconciled with SPEC v0.1 at S65 2026-04-29.*

<!-- Last reviewed: 2026-07-23 12:12 AEST by Gordo -->
