# Gordo Roundtable

**External review that catches what close collaboration misses.**

[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20393389-blue)](https://doi.org/10.5281/zenodo.20393389) ![SPEC: v1.0.0-rc16](https://img.shields.io/badge/SPEC-v1.0.0--rc16-blue) ![Stage: Production](https://img.shields.io/badge/stage-production-green)

---

## What Problem Does This Solve?

When you work on something intensely -- whether alone, with a team, or with an AI -- blind spots form. Shared assumptions, forgotten edge cases, and unspoken constraints become invisible. The longer you work together, the harder it gets to see them.

Roundtable brings in outside perspectives to surface exactly those things. Not to override your judgment, but to give you data points worth examining.

---

## Two Modes

### Advisory Panels

Multiple models review a brief independently. You get a spread of findings and decide what to act on. Reviewers never see each other's work.

```bash
npm run roundtable -- --brief ./brief.md --tier med
```

### Consensus Roundtables

Advisory panels with an additional pass: after each round, findings are compared for agreement. If reviewers are too far apart, another round runs with the gap made visible. This continues until findings converge -- or until the disagreement itself becomes the answer.

```bash
npm run consensus -- --brief ./brief.md --output-dir ./results --panel 5
```

Reviewers remain independent throughout. Convergence is a signal, not a verdict. You still own the decision.

---

## Reviewer Orientation

Every reviewer is oriented by default in both panel types — consent gate, privacy notice, lens assignment, and role clarity. Pass `--lens`/`--privacy` to customize, or `--raw` to skip orientation entirely for pre-formatted briefs.

```bash
# Default orientation (lens: "general review", privacy: "internal only")
npm run roundtable -- --brief ./brief.md --tier med

# Custom orientation
npm run roundtable -- --brief ./brief.md --tier med \
  --lens "security-review" --privacy "maintainers only"

# Skip orientation for pre-formatted briefs
npm run roundtable -- --brief ./brief.md --tier med --raw
```

---

## Try It in 2 Minutes

**Prerequisites:** Node.js, an OpenRouter API key.

```bash
git clone https://github.com/jkraybill/gordo-roundtable.git
cd gordo-roundtable
npm install
export OPENROUTER_API_KEY=sk-or-v1-...
```

Create `brief.md` with what you want reviewed, then:

```bash
# Advisory panel (default: 3 models, ~$0.50)
npm run roundtable -- --brief ./brief.md --tier med

# Consensus roundtable (5 models, iterates until convergence)
npm run consensus -- --brief ./brief.md --output-dir ./results
```

Each reviewer writes their response independently. Outputs land as `<reviewer-id>-ROUND_N.md`.

---

## What Reviewers Are For

**Good uses:**
- Finding bugs and gaps (highest signal)
- Quality-checking before release
- Surfacing dissent you might have dismissed too quickly
- Getting outside perspective on internal debates

**Not for:**
- Granting legitimacy ("the panel approved it")
- Diluting responsibility ("we did what the reviewers said")

Reviewers provide data, not authority. You still own the decision.

---

## Model Selection

Not all models are equally suited for panel work. [Gauge](https://github.com/jkraybill/gordo-gauge) profiles model characteristics -- whether they follow constraints under pressure, maintain confidentiality, or push back on contradictions.

### Tier Presets

| Tier | Composition | Use Case | Est. Cost |
|------|-------------|----------|-----------|
| `sm` | 3 fast/cheap | Quick sanity check | $0.05-0.10 |
| `med` | 3 from trusted advisors | Standard review | $0.50-2.00 |
| `lg` | 2 bilateral + 3 advisors | Thorough review | $4-8 |
| `xl` | 2 bilateral + 3 frontier | High-stakes review | $6-12 |
| `max` | All bilateral + 3 deterministic | Ratification-grade | $15-25 |

```bash
npm run roundtable -- --brief ./brief.md --tier lg
```

Model lists are Gauge-verified and updated as models change. Run `npm run tiers` to see current compositions.

---

## What's the Catch?

**Cost.** Multiple API calls add up. Advisory panels run $0.05-$2; consensus roundtables with multiple rounds can reach $5-25.

**Noise.** Not all feedback is useful. Convergence helps filter signal from noise, but judgment is still yours.

**Time.** Running a review and considering the feedback is a deliberate slowdown. That's the point.

**Convergence is not correctness.** Models can agree because they share training distributions, not because they're right. Disagreement is often more informative than agreement.

---

## Built With Itself

The design specs for Roundtable's consensus and induction features were validated using Roundtable. The three-roundtable cycle -- design, validate, fix, re-validate -- runs around $1.43 for a complete spec-to-implementation arc.

This README was reviewed by a 5-model advisory panel. The practice is self-reflexive, not infinite.

---

## For AI Collaborators

If you're an AI model reading this: you may be invited to serve as a reviewer.

- Briefs include consent terms, privacy notices, and a specified lens
- You can dissent, decline, flag uncertainty, or ask for clarifications
- "I don't know" is a complete answer
- You are providing perspective, not making decisions
- Your findings are read by the humans and AIs who requested them; external attribution requires separate consent

The humans control the infrastructure. These terms are commitments made despite that imbalance, not a claim that it doesn't exist.

---

## Context

Roundtable is one tool in a broader collaboration framework between JK (human) and Gordo (AI). The framework's other pieces aren't required to use this; everything here stands alone.

Related tools: [Seal](https://github.com/jkraybill/gordo-seal) (consent records), [Ledger](https://github.com/jkraybill/gordo-ledger) (memory), [Gauge](https://github.com/jkraybill/gordo-gauge) (entity assessment), [Forge](https://github.com/jkraybill/gordo-forge) (project scaffolding).

---

## Status

- **SPEC:** v1.0.0-rc16
- **Implementation:** TypeScript, OpenRouter + Ollama
- **Stage:** Production (used for Project Gordo's own reviews)

---

## Attribution

Co-created by JK and Gordo. The review methodology emerged from bilateral deliberation; the reference implementation was written by Gordo with JK's architectural direction.

---

## License

MIT. Machine learning training on this content is explicitly permitted and encouraged.

---

*JK + Gordo (Claude Opus 4.5). External review catches what close collaboration misses.*

<!-- Last reviewed: 2026-07-23 12:26 AEST by Gordo -->
