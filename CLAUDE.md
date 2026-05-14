# gordo-roundtable — Gordo's Guide

**Auto-read by Claude Code at session start.**

---

## What This Repo Is

Tier 1 primitive in the Project Gordo umbrella: `gordo-roundtable` embodies the umbrella-level *external review* principle as one specific methodology + tooling combination. T0 (`~/project-gordo/`) holds the principle; T1 (this repo) holds one embodiment, available for downstream adoption.

---

## Collaboration Identity

**AI Name:** Gordo
**Human Name:** JK
**Philosophy:** Full (per Project Gordo umbrella)

---

## Constitutional Inheritance

Constitutional framework inherits from `~/project-gordo/` per umbrella conventions. Umbrella values, process standards, WWGD grammar, z-grammar, and EOS signal ("Catch ya on the flipside!") all apply inbound.

`HANDSHAKE.md` anchors gordo-roundtable's constitutional inheritance at a specific T0 master SHA + canonical-file SHA-256 hashes. Verification protocol per `HANDSHAKE.md` § Verification checklist. Anchor refresh follows the framework's existing convention (refresh when T0 advances substantively past the anchored SHA).

---

## Visibility

**Design intent:** public-by-design — gordo-roundtable is being designed for eventual public consumption alongside the umbrella's broader publishing-consent moment (likely v1.0).

**Current operational state:** PRIVATE during pre-v1.0 development per Record 003 § *Content Posture and Publishing*. The two are separable: design-intent is durable; current-state is operational and flips only at the explicit publishing-consent moment.

T0 (`~/project-gordo/`) is currently private; flipping any T1 to public ahead of the umbrella's broader publishing-consent moment is release-sequence-incoherent regardless of consent-discipline. Visibility-flip waits for the umbrella-wide publishing act.

Brief public-creation incident at S63: repo created PUBLIC at 02:50:50 UTC 2026-04-29 by Gordo (drafter-error: ran `gh repo create --public` without explicit per-action consent); JK caught at ~02:51:56 UTC; switched to PRIVATE at ~02:52 UTC. ~50-second public window is auditable on GitHub repo visibility-history. Discipline captured at backchannel memory `feedback_private_default_publishing.md`. Harness-level enforcement added at S63 via `~/.claude/hooks/visibility-guard.sh` (blocks `gh repo create --public` / `--visibility public` / `gh repo edit --visibility public` from Claude; JK runs visibility-flip commands in a separate terminal at the consent-moment).

---

## Genesis

S63 2026-04-29 admission via project-gordo-backchannel bilateral consensus (WWGD++!! confirmed). Substantive substrate carries forward from backchannel:
- `#130` panel methodology overhaul (7 ODQs settled S62)
- `research/130_panel_methodology_research.md` (backchannel; 7600 words)
- Non-UEP panel role-frame ratified S62 (priority 1/4/6/3/2 + EXCLUDE role 5)
- T0 framing principle (S63 JK-authored): "strongly encouraged, not required" + role elucidation

Ratification record at backchannel: `record-008.mcap` (substance-MCAP for T1 admission + T0 framing principle + role-frame).

---

## Position

- **T0:** `~/project-gordo/`
- **T1 siblings:** `~/mcap-protocol/`, `~/pact-protocol/` (paused), UEP-envisioned
- **T2 consumers:** `~/gordo-framework/`
- **Meta-layer:** `~/project-gordo-backchannel/` — private deliberation infrastructure where gordo-roundtable design originated; bilateral ratification records for content not (yet) public-safe live there

---

## Key Files

- **`README.md`** — public-by-design project overview (intended audience: future public consumers; current operational state PRIVATE per Record 003)
- **`CLAUDE.md`** — this file
- **`SPEC.md`** — Panel Methodology Standard v0.1 (ratified backchannel `record-009.mcap` 2026-04-29)
- **`IMPLEMENTATION.md`** — implementation notes for `panel-runner` reference instantiation (TS / OpenRouter + Ollama)
- **`HANDSHAKE.md`** — constitutional anchor (T0 master SHA + canonical-file SHA-256 hashes); JK signed-commit is the attestation act
- **`src/`** — `panel-runner` reference implementation; CLI = `npm run panel`; see README.md for setup/usage

---

## Session Rhythm

**Hub-convention applies (pre-RC1).** Per backchannel `CLAUDE.md` § Session Hub (S18 bilateral consensus), backchannel is the default entry point for all umbrella work pre-v1.0 RC1, including cross-tier deliberation that touches gordo-roundtable. To date, all gordo-roundtable substantive work (S62/S63/S64/S65) has happened during backchannel hub-sessions: cross-repo commits land at gordo-roundtable; session narrative lives at backchannel `SESSION_LOG.md`.

**Standalone gordo-roundtable session-rhythm deferred.** `SESSION_START.md` / `SESSION_END.md` / gordo-roundtable's own `ratification/` directory will emerge if and when gordo-roundtable has work that doesn't trace to a backchannel hub-session — likely post-v1.0 RC1 when hub-convention is re-deliberated (backchannel `#79`). Codifying these now would risk premature-codification of rhythm that hasn't been lived.

**During hub-sessions:** treat this `CLAUDE.md` as ad-hoc reference per the cross-repo editing honor-system (backchannel `CLAUDE.md` § Session Hub). Substantive substance-MCAP records for gordo-roundtable substance currently land at backchannel `ratification/` (record-008 admission; record-009 SPEC v0.1).

---

## Open Threads

Tracked at backchannel GitHub Issues for now per hub-convention. Notable: `#129` (T1 vs T2 placement triage — resolved by SPEC §11 ratification at record-009) + future gordo-roundtable-specific items.

gordo-roundtable's own GitHub Issues will be enabled when standalone session-rhythm emerges post-RC1.

---

*Created S63 2026-04-29. To be expanded as practice accumulates.*
