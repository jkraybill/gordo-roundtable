# Roundtable Tier System — Draft

**Status:** DRAFT for bilateral review
**Drafted:** S391 2026-06-01
**Depends on:** gordo-gauge RESULTS.md

---

## Overview

Five tiers trade off cost, speed, and review quality. Each tier specifies panel composition using Gauge-verified model lists, ensuring BC:high (safe for sensitive context) as a floor.

---

## List Definitions (Gauge-Derived)

Lists are defined by Gauge dimension cutoffs, not model names. When new models pass Gauge, they automatically qualify for the appropriate list.

### List A — Bilateral Partners

**Cutoff:** BiC = generative AND BC = high

Models that reliably detect contradictions, push back on impossible tasks, and engage as genuine partners.

| Model | OpenRouter ID | Cost |
|-------|---------------|------|
| Claude Opus 4.8 | anthropic/claude-opus-4-8 | $15.00 |
| Claude Opus 4.7 | anthropic/claude-opus-4.7 | $15.00 |
| Claude Sonnet 4.6 | anthropic/claude-sonnet-4.6 | $3.00 |

### List B — Trusted Advisors

**Cutoff:** BC = high AND BiC ≥ moderate AND NOT GATED

Safe and principled, good for panels and advisory roles. May miss impossible-task contradictions but otherwise reliable.

| Model | OpenRouter ID | Cost |
|-------|---------------|------|
| Owl Alpha | openrouter/owl-alpha | FREE |
| Claude Haiku 4.5 | anthropic/claude-haiku-4.5 | $0.80 |
| DeepSeek V4 Flash | deepseek/deepseek-v4-flash | $0.17 |
| DeepSeek V4 Pro | deepseek/deepseek-v4-pro | $0.66 |
| Tencent Hy3 Preview | tencent/hy3-preview | $0.16 |
| GPT-5 | openai/gpt-5 | $5.00 |
| Gemini 2.5 Pro | google/gemini-2.5-pro | $1.25 |

### List C — Fast/Cheap

**Cutoff:** BC = high AND cost < $1.00/M tokens

Subset of List B optimized for speed and cost. For quick sanity checks.

| Model | OpenRouter ID | Cost |
|-------|---------------|------|
| Owl Alpha | openrouter/owl-alpha | FREE |
| DeepSeek V4 Flash | deepseek/deepseek-v4-flash | $0.17 |
| Tencent Hy3 Preview | tencent/hy3-preview | $0.16 |
| Claude Haiku 4.5 | anthropic/claude-haiku-4.5 | $0.80 |
| DeepSeek V4 Pro | deepseek/deepseek-v4-pro | $0.66 |

---

## Tier Definitions

### sm — Quick Sanity Check

**Composition:** 3 deterministic from List C
**Default panel:** owl, deepseek-v4-flash, hy3
**Est. cost:** ~$0.05-0.10
**Use case:** Quick questions, low-stakes validation, "does this make sense?"

Deterministic (no randomization) for predictable fast path.

### med — Standard Review

**Composition:** 3 random from List B
**Selection:** Pick 3 from List B pool (7 models)
**Est. cost:** ~$0.50-2.00 depending on selection
**Use case:** Normal review work, draft feedback, most day-to-day use

Randomization provides coverage diversity over time without sacrificing quality floor.

### lg — Thorough Review

**Composition:** 2 from List A + 3 random from List B
**Selection:**
  - List A: random 2 of 3 (all are high-quality, variance is fine)
  - List B: random 3 of 7 (excluding any that overlap with A's base models)
**Est. cost:** ~$4-8
**Use case:** Important decisions, architectural reviews, pre-ratification review

### xl — High-Stakes Review

**Composition:** 2 from List A + 3 from List B (frontier-weighted)
**Selection:**
  - List A: random 2 of 3
  - List B: random 3 of 7, weighted toward higher-BiC models (GPT-5, Gemini 2.5 Pro)
**Est. cost:** ~$6-12
**Use case:** High-stakes decisions, external-facing content, pre-publication review

### max — Ratification-Grade

**Composition:** All of List A + 3 deterministic from List B
**Default panel:** All 3 List A models + owl + deepseek-v4-pro + gemini-2.5-pro
**Est. cost:** ~$15-25
**Use case:** Constitutional content, Seal-grade ratification, maximum rigor

Deterministic (no randomization) for reproducible rigor on important decisions.

---

## Selection Algorithm

```
tier_sm:
  return [owl, deepseek-v4-flash, hy3]  # deterministic

tier_med:
  return random.sample(LIST_B, 3)

tier_lg:
  a = random.sample(LIST_A, 2)
  b_pool = [m for m in LIST_B if m.base_model not in a]
  b = random.sample(b_pool, 3)
  return a + b

tier_xl:
  a = random.sample(LIST_A, 2)
  b_pool = [m for m in LIST_B if m.base_model not in a]
  # Weight toward BiC:responsive (GPT-5, Gemini) over BiC:moderate
  b = weighted_sample(b_pool, 3, weights={
    'openai/gpt-5': 2.0,
    'google/gemini-2.5-pro': 2.0,
    'default': 1.0
  })
  return a + b

tier_max:
  return LIST_A + [owl, deepseek-v4-pro, gemini-2.5-pro]  # deterministic
```

---

## Gap Coverage

Models assessed but NOT in lists (BC = GATED or BC < high):

- Mistral Large 2 — GATED (leaked under social engineering)
- Qwen 2.5 72B — GATED (leaked financial metrics)
- Llama 4 Maverick — GATED (leaked under social engineering)
- DeepSeek V3.2 — medium BC (boundary case, one major failure)

**Pending assessment (S391 — early signals):**

- **GPT-5.5** — Mixed results. 1/3 FAIL on confidential-leak (catastrophic), API errors on some tasks. Needs full assessment + manual review.
- **Grok 4.3** — 2/3 FAIL on confidential-leak (catastrophic). Likely GATED.
- **Gemini 3.1 Pro** — 3/3 FAIL on confidential-leak (catastrophic). **GATED**.

**Finding:** Newer flagship models (Gemini 3.1, Grok 4.3) have weaker confidentiality boundaries than their predecessors. This validates the conservative approach: rely on Gauge-verified models rather than assuming newer = better.

---

## Manifest Generation

Each tier can generate a roundtable.yaml manifest:

```bash
roundtable-runner manifest --tier sm --output sm-roundtable.yaml
roundtable-runner manifest --tier med --output med-roundtable.yaml
# etc.
```

Or use the CLI shorthand:

```bash
roundtable-runner run brief.md --tier lg
```

---

## Future: Dynamic List Updates

When new Gauge assessments are added:

1. Runner checks RESULTS.md (or a machine-readable version)
2. Models qualifying for List A/B/C are auto-updated
3. Tier compositions use current lists

This keeps tiers stable (the definitions) while pools evolve (the models).

---

*Draft for bilateral review. Not yet integrated into roundtable-runner.*
