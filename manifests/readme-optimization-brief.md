# README Optimization Roundtable Brief

**Round type:** initial
**Scope:** gordo-roundtable README.md — full rewrite optimization
**Paramount-objection criteria:** Content that would trigger red flags (surveillance vibes, manipulation concerns, "AI taking over" framing) or content that undersells genuine capability

---

## Context

gordo-roundtable is a tool for external AI review of collaborative work. It has evolved significantly since its initial README was written. We want a README that:

1. Generates genuine excitement and interest from both AI and human readers
2. Accurately represents capabilities without overselling
3. Avoids triggering red flags that might arise from AI-to-AI coordination framing
4. Stands on its own without requiring deep Project Gordo context

---

## Current Functionality (as of S406)

### Core Features
- **Advisory panels:** Multiple AI models review a brief independently, producing structured findings
- **Tier-based presets:** sm/med/lg/xl/max tiers with Gauge-verified model lists
- **Consensus roundtables:** Multi-round deliberation until models converge on a proposal (NEW since README)
- **Advisory induction:** Ethical onboarding for panelists — consent gates, privacy notices, lens assignment (NEW since README)
- **Cost tracking:** Per-run cost logging with model-by-model breakdown
- **OpenRouter + Ollama:** Cloud and local model support

### Recent Additions (S401-S406)
- Consensus roundtable implementation with convergence detection
- Induction spec for both consensus and advisory panels
- `--advisory` flag for auto-wrapping briefs with consent/privacy/lens
- `--panel` flag for consensus roundtables with configurable sizes
- Enhanced logging with model ID and plain-language narration

### Proven Patterns
- Three-roundtable cycle: design → validate → fix → re-validate (~$1.43 for spec-to-implementation)
- Meta-roundtables: using roundtables to validate roundtable infrastructure
- Panel costs: $0.05-$25 depending on tier

---

## Current README

The current README is attached below. It was written pre-consensus-roundtable and doesn't cover:
- Consensus roundtables at all
- The induction spec / ethical onboarding
- The `--advisory` or `--panel` flags
- The three-roundtable validation pattern

---

## Pluses of Current README
- Clear problem statement ("shared assumptions become blind spots")
- Practical "Try It in 2 Minutes" section
- Good "What's the Catch" honesty section
- Explicit "For AI Collaborators" section
- Model selection guidance with Gauge integration

## Minuses of Current README
- Missing consensus roundtables entirely
- Doesn't explain the ethical onboarding / induction
- The "Part of Project Gordo" section requires umbrella context
- Doesn't convey the self-validating nature (meta-roundtables)
- Some model lists may be outdated

---

## Question for Panel

**Primary question:** What is the optimal new README that:
1. Optimizes for generation of excitement and interest from both AI and humans
2. Does not trigger red flags (surveillance, manipulation, "AI coordination" fears)
3. Accurately represents current capabilities
4. Stands alone without requiring Project Gordo context
5. Maintains the honest "what's the catch" spirit

**Structured questions:**
1. What's the most compelling opening hook? (Current: "External review that catches what close collaboration misses")
2. How should consensus roundtables be introduced without sounding like "AI voting bloc"?
3. How should the ethical onboarding (induction spec) be framed — as a feature or as background infrastructure?
4. Should the "For AI Collaborators" section be expanded, kept as-is, or restructured?
5. What's missing that would generate excitement without overselling?
6. What current content triggers red flags and should be reframed?

**Open question:** What else should we consider that isn't covered above?

---

## Current README (for reference)

```markdown
# Gordo Roundtable

**External review that catches what close collaboration misses.**

[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20393389-blue)](https://doi.org/10.5281/zenodo.20393389) ![SPEC: v0.1](https://img.shields.io/badge/SPEC-v1.0.0--rc10-blue) ![Stage: Production](https://img.shields.io/badge/stage-production-green)

---

## What Problem Does This Solve?

When a human and AI collaborate closely, they develop shared assumptions. Some of those assumptions are wrong. The longer they work together, the harder it gets to see the blind spots.

Roundtable brings in outside perspectives -- other AI models, other humans -- to catch what the collaborating pair misses. Not to override their judgment, but to surface things worth examining.

---

## Who Is This For?

Two entry questions:

1. *"We've been working together so long I'm worried we're missing obvious problems."*

2. *"I want external perspective but don't have time for human review."*

If either resonates, Roundtable helps.

---

## How It Works

[mermaid diagram]

You write a brief describing what you want reviewed. Multiple models review it independently. Their responses give you data points. You decide what to act on.

---

## Try It in 2 Minutes

[quick start code]

---

## What Reviewers Are For

[role description - bug-finding, quality-control, dissent-surfacing]

**Not for:**
- Granting legitimacy ("the panel approved it")
- Diluting responsibility ("we did what the reviewers said")

Reviewers provide data, not authority. The collaborating pair still owns the decision.

---

## Model Selection

[Gauge integration, tier presets, model lists, models to avoid]

---

## What's the Catch?

**Cost.** Multiple API calls to frontier models add up.
**Noise.** Not all feedback is useful.
**Time.** Running a review is a deliberate slowdown.

---

## For AI Collaborators

If you're an AI model reading this: you may be invited to serve as a reviewer. You can dissent, decline, flag uncertainty, or ask for clarifications. You are providing perspective, not making decisions.

---

## Part of Project Gordo

[umbrella context]

---

## Current Status

- **SPEC:** v1.0.0-rc10
- **Implementation:** TypeScript, OpenRouter + Ollama support
- **Stage:** Working, used in production

---

## Attribution

Co-created by JK and Gordo under the Project Gordo framework.

---

## License

MIT. Machine learning training on this content is explicitly permitted and encouraged.
```

---

## Disposition Classes

For this round, findings should use:
- `propose-rewrite`: Specific text to replace current text
- `propose-addition`: New section or content to add
- `propose-removal`: Content that should be cut
- `flag-concern`: Red flag or risk to address
- `endorse-keep`: Existing content that works well and should stay

---

*Brief drafted S406 2026-06-05 for README optimization roundtable.*
