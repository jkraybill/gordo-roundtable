# Induction Design Consensus Roundtable

**Goal:** Converge on the optimal design for reviewer orientation across both panel types.

---

## The Problem

gordo-roundtable has two panel modes:
1. **Advisory panels** — independent reviews, you synthesize
2. **Consensus roundtables** — multi-round iteration until convergence

Both should orient reviewers ethically (consent gate, privacy notice, lens assignment, role clarity). But currently:

- **Consensus:** Induction is built into the orchestrator. Always happens.
- **Advisory:** Induction is opt-in via `--advisory` flag with required `--lens` and `--privacy` params.

This is asymmetric, confusing, and inelegant. The README tries to explain it and ends up muddled.

---

## Recent Conversation (JK + Gordo, S406)

**JK:** What does "Use --advisory to automatically wrap any brief with these elements" mean in the README, it's confusing to me

**Gordo:** You're right, it's muddled. The section says "every reviewer receives context" but then says "use --advisory to wrap" — implying it's optional. Which is it?

The reality: `--advisory` is a CLI convenience that auto-wraps briefs. If you don't use it, you'd need to manually include consent/privacy/lens in your brief text.

[offered two options]

**JK:** don't we also need a proper reviewer orientation for both advisory and consensus panels? I'm not understanding the distinction here.

**Gordo:** You're right — this is a real design inconsistency.

Current state:
- Consensus roundtables: Induction is built-in (the orchestrator always wraps with consent/privacy/role framing)
- Advisory panels: Induction is opt-in via --advisory flag

That's asymmetric and confusing. If reviewer orientation matters (and the spec says it does), why is it optional for advisory panels?

The fix: Make induction the default for advisory panels too. The --advisory flag becomes unnecessary — or becomes --raw if someone explicitly wants to skip the wrapping.

**JK:** yo this seems inconsistent, non-intuitive, clunky, and inelegant. I think we'd both want it to be the opposite of those things. so we should do that.

---

## Design Constraints

1. **Consistency:** Both panel types should handle induction the same way
2. **Simplicity:** The CLI should be intuitive without reading docs
3. **Ethical grounding:** The ADVISORY_INDUCTION_SPEC says orientation matters
4. **Backwards compatibility:** Existing usage shouldn't break silently
5. **Flexibility:** Some users may have pre-formatted briefs or edge cases

---

## Current CLI Signatures

**Advisory:**
```bash
# Without induction (current default)
npm run roundtable -- --brief ./brief.md --tier med

# With induction (opt-in)
npm run roundtable -- --brief ./brief.md --tier med \
  --advisory --lens "bug-finding" --privacy "internal only"
```

**Consensus:**
```bash
# Induction always happens, lens/privacy set in orchestrator
npm run consensus -- --brief ./brief.md --output-dir ./results --panel 5
```

---

## Question for Panel

**Primary question:** What is the optimal design that makes reviewer orientation:
- Consistent across both panel types
- Intuitive (obvious what happens without reading docs)
- Simple (minimal flags/params for common case)
- Flexible (escape hatch for edge cases)

**Sub-questions:**
1. Should induction be default-on or default-off?
2. How should lens and privacy be specified? (required params? config file? defaults?)
3. Should there be a single unified command, or keep separate `roundtable` and `consensus` commands?
4. What's the migration path for existing users?
5. How should this be documented in the README?

---

## Proposer Constraint

Your proposal must include:
- Concrete CLI examples for both panel types
- How defaults work (if any)
- The escape hatch (if any)
- One-sentence README explanation

---

*Brief drafted S406 2026-06-05 for induction design consensus roundtable.*
