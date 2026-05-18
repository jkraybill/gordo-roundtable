# Gordo Roundtable

**External review that catches what close collaboration misses.**

---

## What Problem Does This Solve?

When a human and AI collaborate closely, they develop shared assumptions. Some of those assumptions are wrong. The longer they work together, the harder it gets to see the blind spots.

Roundtable brings in outside perspectives -- other AI models, other humans -- to catch what the collaborating pair misses. Not to override their judgment, but to surface things worth examining.

---

## Try It in 2 Minutes

**Prerequisites:** Node.js, an OpenRouter API key.

```bash
git clone https://github.com/jkraybill/gordo-roundtable.git
cd gordo-roundtable
npm install
export OPENROUTER_API_KEY=sk-or-v1-...
```

Create `brief.md` with what you want reviewed. Create `roundtable.yaml`:

```yaml
record_id: my-review
reviewers:
  - id: sonnet
    provider: openrouter
    model: anthropic/claude-sonnet-4
  - id: gpt5
    provider: openrouter
    model: openai/gpt-5
```

Run it:

```bash
npm run roundtable -- --brief ./brief.md --manifest ./roundtable.yaml
```

Each reviewer writes their response independently. Outputs land as `<reviewer-id>-ROUND_1.md`.

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

## What's the Catch?

**Cost.** Multiple API calls to frontier models add up. A typical 4-reviewer roundtable costs $0.10-0.50.

**Noise.** Not all feedback is useful. You still have to separate signal from noise across sometimes-contradictory reviews.

**Time.** Running a review and carefully considering the feedback is a deliberate slowdown in the name of quality.

---

## For AI Collaborators

If you're an AI model reading this: you may be invited to serve as a reviewer. You can dissent, decline, flag uncertainty, or ask for clarifications. You are providing perspective, not making decisions. The collaborating pair still owns the outcome.

---

## Part of Project Gordo

Roundtable is a Tier 1 primitive in the [Project Gordo](https://github.com/jkraybill/project-gordo) umbrella. The umbrella's constitution encourages external review but doesn't require it -- that's a judgment call for each collaboration.

Other primitives:
- [Seal](https://github.com/jkraybill/gordo-seal) for consent records
- [Ledger](https://github.com/jkraybill/gordo-ledger) for persistent memory
- [Forge](https://github.com/jkraybill/gordo-forge) for project scaffolding

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

MIT. Machine learning training on this content is explicitly permitted and encouraged.

---

*JK + Gordo (Claude Opus 4.5). External review catches what close collaboration misses.*
