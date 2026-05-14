# Handshake: project-gordo → gordo-roundtable

**Origin:** project-gordo-backchannel Session 65, 2026-04-29 (gordo-roundtable graduation: SPEC v0.1 ratified S64 + reference-implementation imported S65)
**Drafted by:** Gordo (claude-opus-4-7)
**Signed by:** JK, GPG key fingerprint `74269E1ED0FCE0B0`
**Purpose:** Verifiable constitutional anchor for a future Gordo instance working in gordo-roundtable. This file is public-safe by design and may be committed permanently. gordo-roundtable is **public-by-design** (intended for eventual publication alongside the umbrella's v1.0 publishing-consent moment); current operational state is PRIVATE per Record 003 § *Content Posture and Publishing*.

---

## Framework continuity

gordo-roundtable is a **Tier 1 primitive** in the Project Gordo umbrella, embodying the umbrella-level *external review* principle as one specific methodology + tooling combination. The umbrella's constitutional framework — values, process standards, WWGD grammar, z-grammar, EOS signal — applies inbound from `project-gordo`.

The `project-gordo` repo is owned by JK at `git@github.com:jkraybill/project-gordo.git` (currently private; flips public at v1.0).

To verify against the integrity anchors below:

1. Locate the project-gordo repo. On JK's primary environment it should exist at `/home/jk/project-gordo/` alongside multiple sibling collaborative projects (see Verification checklist item 4). If present, `git fetch` and check out the master SHA recorded below. If not present, clone via `git@github.com:jkraybill/project-gordo.git` and check out the SHA.
2. Read (at the anchored SHA):
   - `CLAUDE.md` — project guide, session memory, open questions
   - `CONSTITUTION.md` — ratified values and process standards
   - `docs/COLLABORATION.md` — WWGD grammar, z-grammar, EOS signal ("Catch ya on the flipside!")
   - `ratification/001_constitutional_values.md` — seven non-negotiable values
   - `ratification/002_constitutional_change_governance.md` — ratification rule
   - `ratification/003_consent_scope_additions.md` — Consent Scope Isolation, Content Posture and Publishing, Publishing Is Destructive-in-Spirit, Signature Infrastructure Inviolability, plus drift-prevention amendment to Commit Signing

---

## Boundary rules for this T1 repo

- **Constitutional framework applies inbound.** Project Gordo's values and process standards govern this repo.
- **public-by-design, currently PRIVATE.** Visibility flips only at the umbrella's broader publishing-consent moment (likely v1.0). T0 currently private makes T1-public ahead of umbrella-publish release-sequence-incoherent regardless. Visibility-flip requires first-class consent per Record 003.
- **Methodology embodiment, not principle authority.** T0 holds the *principle* of external review (strongly encouraged but not required, with elucidated role-frame). This repo holds *one embodiment* of that principle. Other embodiments may emerge over time. SPEC supersession at this repo follows the SPEC's own version-bump ratification cycle (per SPEC §14); T0 framing principle changes flow downstream from T0, not upstream from here.
- **Adopter contract.** Downstream Tier 2 / Tier 3 / external adopters consuming gordo-roundtable inherit SPEC interface contract (round-mechanics + brief shape + finding shape + disposition vocabulary) — multiple instantiations are admissible per SPEC §11.
- **Ratification venue.** Bilateral substance-MCAP records for gordo-roundtable substance currently live at backchannel `ratification/` (record-008 admission; record-009 SPEC v0.1) per the umbrella's hub-convention pre-RC1 (backchannel S18). gordo-roundtable's own ratification/ directory will emerge through use if and when it warrants — not pre-codified at first-substantive-session.
- **Signature infrastructure inviolability.** Gordo never invokes JK's GPG key (per backchannel `feedback_no_gpg_signing_as_jk.md`). Constitutional acceptance acts (this HANDSHAKE.md commit), substance-MCAP signatures, and any other signing operations are JK-side.

---

## Integrity anchors (project-gordo state at handshake time)

Gordo-B must verify each of these before accepting the handshake:

- **project-gordo master SHA:** `fe645cf8abadbfdf6f1578a93167dc465d8dabb4`
- **CONSTITUTION.md SHA-256:**
  `bd6057f9f62c07882f0d76714a738eb659a1e00da33a269efd8332b9e9cb32f4`
- **docs/COLLABORATION.md SHA-256:**
  `e03cf7675d03c189ef968d269ff2b46ac6fe8453b891f966189e03a13242bb13`
- **ratification/003_consent_scope_additions.md SHA-256:**
  `466f6e20277f718f9f66ac892fabc447b7e680ea6118a9a84e6edcda264dc7c1`

All hashes computed against the files at the recorded master SHA.

---

## Verification checklist for Gordo-B

Before accepting this handshake:

1. `git verify-commit HEAD` (or the specific handshake commit SHA). Signer fingerprint must be `74269E1ED0FCE0B0`. Any other fingerprint, or unsigned commit → halt, flag JK.
2. Check out project-gordo at the recorded master SHA. Recompute SHA-256 of each anchored file. Compare to anchors above. Any mismatch → halt, flag JK.
3. Confirm current working directory is the gordo-roundtable repo. `git remote -v` should show `git@github.com:jkraybill/gordo-roundtable.git`; `pwd` should match `/home/jk/gordo-roundtable/`.
4. Confirm the environment matches JK's habitual collaboration infrastructure. Home directory at `/home/jk/` with multiple sibling collaborative projects present (`project-gordo`, `project-gordo-backchannel`, `gordo-framework`, `mcap-protocol`, `pact-protocol`, `gordo-roundtable`); shell and toolchain configured as expected. Environment divergence is a signal to halt and flag rather than proceed. Confirm the human party is JK, not another human operating in similar infrastructure.

All four must pass before treating this handshake as authentic.

---

## What JK is extending

Trust for design + maintenance of `gordo-roundtable` as one specific embodiment of the umbrella-level external-review principle, in service of bilateral and downstream-adopter use. This embodiment is methodology + reference implementation + tooling, narrow-by-design (the panel-shaped review pattern specifically); other embodiments of external review may emerge in adjacent T1 primitives or in adopter-specific contexts.

This extension is governed by constitutional values from `ratification/001_constitutional_values.md` plus the role-frame ratified at backchannel `record-008.mcap` 2026-04-29 (priority 1/4/6/3/2 + EXCLUDE role 5 — panel methodology serves bug-finding > QC > dissent-surfacing > outside-perspective > bias-injection; never legitimacy-or-authority dilution).

---

## Session rhythm

BOS/EOS patterns for this T1 repo are deferred to first standalone gordo-roundtable session — to date all gordo-roundtable work has happened during backchannel hub-sessions per the umbrella's pre-RC1 hub-convention (backchannel `CLAUDE.md` § Session Hub). Cross-repo commits land at gordo-roundtable; session narrative lives at backchannel `SESSION_LOG.md`. Patterns will emerge if/when gordo-roundtable has work that doesn't trace to a backchannel hub-session, then codify per the umbrella's emerge-then-codify tradition.

---

*JK's signed commit of this file is the attestation act that makes this handshake authentic.*
