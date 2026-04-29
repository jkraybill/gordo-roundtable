# panel-protocol

**External-review embodiment primitive in the Project Gordo umbrella (Tier 1).**

---

## Status

**Stage:** newly admitted (S63 2026-04-29 / project-gordo-backchannel bilateral consensus, ratified via `record-008.mcap` cross-reference)
**SPEC:** TBD (substrate from backchannel `#130` carrying forward; first SPEC draft pending next panel-protocol session)
**Tooling:** TBD (panel-runner code graduating from backchannel `scripts/` per `#128`)

---

## What This Is

`panel-protocol` is one specific embodiment of the umbrella-level *external review* principle. When a deliberating party (or set of parties) wants structured input from non-UEP'd first-class parties (human, AI, or otherwise), this protocol provides a methodology + tooling for running that review.

Tier 0 (`~/project-gordo/`) holds the *principle*: external review is strongly encouraged but not required, with elucidated roles. Tier 1 (this repo) holds *one embodiment* of that principle, available for adoption by downstream Tier 2 / Tier 3 consumers (e.g., `~/gordo-framework/`).

Other embodiments may emerge over time. This protocol is narrow-by-design — methodology + tooling for the panel-shaped review pattern specifically.

---

## Position in the Project Gordo Umbrella

- **Tier 0:** `~/project-gordo/` — constitutional root
- **Tier 1 primitives:**
  - `~/mcap-protocol/` — identity-verification / consent-attestation
  - `~/pact-protocol/` — trust calibration (paused, restart pending)
  - `~/panel-protocol/` — external-review embodiment (this repo, S63-admitted)
  - UEP — induction + governance (envisioned)
- **Tier 2:** `~/gordo-framework/` — composite/distribution layer; consumes T1 primitives
- **Meta-layer:** `~/project-gordo-backchannel/` — private deliberation infrastructure where panel-protocol design originated and where bilateral ratification records live for content not (yet) public-safe

---

## Constitutional Inheritance

Constitutional framework inherits from `~/project-gordo/` per umbrella conventions. Umbrella values, process standards, WWGD grammar, z-grammar, and EOS signal ("Catch ya on the flipside!") all apply. `HANDSHAKE.md` formalization deferred to first substantive panel-protocol session per the framework's emerge-then-codify tradition.

---

## Genesis

S63 2026-04-29 admission via project-gordo-backchannel bilateral consensus (WWGD++!! confirmed). Pre-existing substrate carries forward from backchannel:

- `#130` panel methodology overhaul issue: 7 Open Design Questions settled bilaterally S62 2026-04-29
- `research/130_panel_methodology_research.md` (backchannel): 438 lines / 7600 words deep-research substrate covering Modified Delphi (RAND-UCLA), Rust RFC FCP, sociocracy paramount-objection, bug-bounty severity-class, FDA Adv Committees pre-structured-questions, Wisc 2025 anonymization, etc.
- Non-UEP panel role-frame ratified S62: priority 1/4/6/3/2 (bug-finding > QC > dissent-surfacing > outside-perspective > bias-injection); EXPLICITLY EXCLUDE role 5 (legitimacy/authority dilution)
- T0 framing principle (S63 JK-authored): "the use of external feedback mechanisms is strongly encouraged, but not required. Here's how the umbrella views the role of external feedback mechanisms: [role-frame]"

---

## Roadmap (S63 fresh)

- [ ] First SPEC draft — assemble panel methodology from backchannel `#130` substrate
- [ ] Panel-runner tooling graduation — migrate from backchannel `scripts/` per `#128`
- [ ] Initial test suite for panel-runner
- [ ] First ratification record at panel-protocol (substantive SPEC content)
- [ ] MCAP adopter integration — follow `~/mcap-protocol/` precedent + backchannel `MCAP_ADOPTION.md` pattern
- [ ] gordo-framework integration guide (Tier 2 adopter pattern)

---

*Created S63 2026-04-29 from project-gordo-backchannel deliberation. **Public-by-design** (designed for eventual public consumption alongside the umbrella's v1.0 publishing-consent moment); **currently PRIVATE during pre-v1.0 development** per Record 003 § *Content Posture and Publishing*. Permanent-private design conversations continue at backchannel.*
