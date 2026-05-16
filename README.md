# Gordo Roundtable

**External review for human-AI collaboration.**

---

## What Problem Does This Solve?

When a human and AI collaborate closely, they develop shared assumptions. Some of those assumptions are wrong. The longer they work together, the harder it gets to see the blind spots.

Roundtable brings in outside perspectives -- other AI models, other humans -- to catch what the collaborating pair misses. Not to override their judgment, but to surface things worth examining.

---

## How It Works

You write a review brief describing what you want feedback on. You configure a roundtable of reviewers (different AI models, typically). Roundtable dispatches the brief to each reviewer and collects their responses.

```bash
npm install
npm run roundtable -- \
  --brief ./my-review-brief.md \
  --manifest ./reviews/roundtable.yaml
```

Each reviewer writes their response independently. You get multiple perspectives without the reviewers influencing each other.

---

## What Reviewers Are For

The framework is explicit about what external review is and isn't:

**Good uses:**
- Finding bugs and gaps (highest priority)
- Quality checking before release
- Surfacing dissent you might have dismissed too quickly
- Getting outside perspective on internal debates

**Not for:**
- Granting legitimacy ("the panel approved it")
- Diluting responsibility ("we did what the reviewers said")

Reviewers provide data, not authority. The collaborating pair still owns the decision.

---

## Getting Started

**Prerequisites:** Node.js, an OpenRouter API key (or local Ollama for open models).

```bash
git clone https://github.com/jkraybill/gordo-roundtable.git
cd gordo-roundtable
npm install
export OPENROUTER_API_KEY=sk-or-v1-...
```

Create a review brief (what you want feedback on) and a roundtable manifest (which models to ask). See `SPEC.md` for the format.

```bash
# Dry run first
npm run roundtable -- --brief ./brief.md --manifest ./roundtable.yaml --dry-run

# Real run
npm run roundtable -- --brief ./brief.md --manifest ./roundtable.yaml
```

Outputs land alongside the manifest: `<reviewer-id>-ROUND_1.md`.

---

## Part of Project Gordo

Roundtable is a Tier 1 primitive in the [Project Gordo](https://github.com/jkraybill/project-gordo) umbrella. The umbrella's constitution encourages external review but doesn't require it -- that's a judgment call for each collaboration.

This repo provides one specific methodology and tooling for roundtable-based review. Other external review patterns could exist alongside it.

---

## Current Status

- **SPEC:** v0.1 ratified
- **Implementation:** TypeScript, OpenRouter + Ollama support
- **Stage:** Working, used in production for Project Gordo's own reviews

---

## Attribution

Co-created by JK and Gordo under the [Project Gordo](https://github.com/jkraybill/project-gordo) framework. The review methodology emerged from bilateral deliberation; the reference implementation was written by Gordo with JK's architectural direction.

---

## License

MIT. Use freely, attribute if you share.

---

*Created by JK + Gordo. External review catches what close collaboration misses.*
