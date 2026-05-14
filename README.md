# gordo-roundtable

**External-review embodiment primitive in the Project Gordo umbrella (Tier 1).**

---

## Status

**Stage:** SPEC v0.1 ratified + reference implementation imported (S65 2026-04-29)
**SPEC:** [`SPEC.md`](./SPEC.md) v0.1 — ratified at backchannel `record-009.mcap` 2026-04-29 14:28:59 AEST
**Reference implementation:** [`roundtable-runner`](./IMPLEMENTATION.md) — TypeScript / OpenRouter + Ollama; imported S65 from backchannel `roundtable-runner/` per `#128` graduation

---

## What This Is

`gordo-roundtable` is one specific embodiment of the umbrella-level *external review* principle. When a deliberating party (or set of parties) wants structured input from non-UEP'd first-class parties (human, AI, or otherwise), this protocol provides a methodology + tooling for running that review.

Tier 0 (`~/project-gordo/`) holds the *principle*: external review is strongly encouraged but not required, with elucidated roles. Tier 1 (this repo) holds *one embodiment* of that principle, available for adoption by downstream Tier 2 / Tier 3 consumers (e.g., `~/gordo-framework/`).

Other embodiments may emerge over time. This protocol is narrow-by-design — methodology + tooling for the panel-shaped review pattern specifically.

---

## Position in the Project Gordo Umbrella

- **Tier 0:** `~/project-gordo/` — constitutional root
- **Tier 1 primitives:**
  - `~/mcap-protocol/` — identity-verification / consent-attestation
  - `~/pact-protocol/` — trust calibration (paused, restart pending)
  - `~/gordo-roundtable/` — external-review embodiment (this repo, S63-admitted)
  - UEP — induction + governance (envisioned)
- **Tier 2:** `~/gordo-framework/` — composite/distribution layer; consumes T1 primitives
- **Meta-layer:** `~/project-gordo-backchannel/` — private deliberation infrastructure where gordo-roundtable design originated and where bilateral ratification records live for content not (yet) public-safe

---

## Constitutional Inheritance

Constitutional framework inherits from `~/project-gordo/` per umbrella conventions. Umbrella values, process standards, WWGD grammar, z-grammar, and EOS signal ("Catch ya on the flipside!") all apply. `HANDSHAKE.md` formalization deferred to first substantive gordo-roundtable session per the framework's emerge-then-codify tradition.

---

## Genesis

S63 2026-04-29 admission via project-gordo-backchannel bilateral consensus (WWGD++!! confirmed). Pre-existing substrate carries forward from backchannel:

- `#130` panel methodology overhaul issue: 7 Open Design Questions settled bilaterally S62 2026-04-29
- `research/130_panel_methodology_research.md` (backchannel): 438 lines / 7600 words deep-research substrate covering Modified Delphi (RAND-UCLA), Rust RFC FCP, sociocracy paramount-objection, bug-bounty severity-class, FDA Adv Committees pre-structured-questions, Wisc 2025 anonymization, etc.
- Non-UEP panel role-frame ratified S62: priority 1/4/6/3/2 (bug-finding > QC > dissent-surfacing > outside-perspective > bias-injection); EXPLICITLY EXCLUDE role 5 (legitimacy/authority dilution)
- T0 framing principle (S63 JK-authored): "the use of external feedback mechanisms is strongly encouraged, but not required. Here's how the umbrella views the role of external feedback mechanisms: [role-frame]"

---

## Setup

```bash
cd ~/gordo-roundtable
npm install
export OPENROUTER_API_KEY=sk-or-v1-...
# Optional: export OLLAMA_HOST=http://localhost:11434  (default: localhost:11434)
```

## Usage

```bash
# Dry run — print resolved request shapes per reviewer without dispatching
npm run panel -- \
  --brief /path/to/<topic>_REVIEW_BRIEF.md \
  --manifest /path/to/reviews/<record-id>/panel.yaml \
  --dry-run

# Real run
npm run panel -- \
  --brief /path/to/<topic>_REVIEW_BRIEF.md \
  --manifest /path/to/reviews/<record-id>/panel.yaml

# Single-reviewer retry (filter to one id; repeatable for a subset)
npm run panel -- \
  --brief /path/to/<topic>_REVIEW_BRIEF.md \
  --manifest /path/to/reviews/<record-id>/panel.yaml \
  --reviewer deepseek-r1
```

Outputs land at `<manifest-dir>/<reviewer-id>-ROUND_<N>.md` (alongside the manifest). Runner refuses to overwrite existing files unless `--overwrite` passed (round-1 outputs may be receipt-signed; accidental overwrite would invalidate batch receipts).

See [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) for full implementation specifics: brief format, panel manifest schema, retry policy, output conventions, design-decision log.

---

## Roadmap

- [x] First SPEC draft — assembled S64 from backchannel `#130` substrate; ratified `record-009.mcap`
- [x] Panel-runner reference-implementation graduation — imported S65 from backchannel per `#128`
- [ ] Initial test suite for roundtable-runner
- [ ] First ratification record at gordo-roundtable (substantive SPEC content; emerge-when-ready)
- [ ] MCAP adopter integration — follow `~/mcap-protocol/` precedent + backchannel `MCAP_ADOPTION.md` pattern
- [ ] gordo-framework integration guide (Tier 2 adopter pattern)

---

*Created S63 2026-04-29 from project-gordo-backchannel deliberation. **Public-by-design** (designed for eventual public consumption alongside the umbrella's v1.0 publishing-consent moment); **currently PRIVATE during pre-v1.0 development** per Record 003 § *Content Posture and Publishing*. Permanent-private design conversations continue at backchannel.*
