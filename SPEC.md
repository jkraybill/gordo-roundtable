# panel-protocol — SPEC

**Status:** placeholder pending first SPEC draft (target: next panel-protocol session)

---

## Substrate Sources

Panel methodology design substrate accumulated in `~/project-gordo-backchannel/` during pre-admission deliberation:

- **`#130` panel methodology overhaul** (issue): 7 Open Design Questions settled bilaterally S62 2026-04-29
- **`research/130_panel_methodology_research.md`** (backchannel): 438 lines / 7600 words deep-research substrate. Coverage:
  - Modified Delphi (RAND-UCLA Appropriateness Method)
  - Rust RFC Final Comment Period (FCP) procedural pattern
  - Sociocracy paramount-objection threshold
  - Bug-bounty severity-class taxonomy
  - First-class wontfix-with-rationale authority pattern
  - FDA Advisory Committees pre-structured-questions discipline
  - Wisc 2025 anonymization protocol
  - (Detailed applicability ratings + integration sketches per source)
- **Non-UEP panel role-frame** (S62 ratified): priority **1/4/6/3/2** with EXPLICITLY EXCLUDE role 5
  - 1: bug-finding (top priority — highest signal-density)
  - 4: QC
  - 6: dissent-surfacing
  - 3: outside-perspective
  - 2: bias-injection
  - 5: ~~legitimacy/authority dilution~~ — **excluded** (panels = data, not authority)
- **T0 framing principle** (S63 JK-authored): "the use of external feedback mechanisms is strongly encouraged, but not required. Here's how the umbrella views the role of external feedback mechanisms: [role-frame]"

---

## Pending Settled Decisions (from backchannel `#130` S62)

- **Role priorities + exclusion** (above)
- **Panels = data, not authority** — derived outputs inform deliberating parties; they do not bind decisions
- **Paramount-objection as triple-bar threshold** — sociocracy-inspired escalation gate
- **Wontfix-with-rationale (a-ii) authority pattern** — narrow authority to dispose-without-revision when grounded
- **"Governor consent" vocabulary** (vs over-broad "bilateral") — scoped consent terminology
- **No hard-cap on panel size** — per-panel sizing instead, sized to scope

---

## SPEC Drafting Sequence (proposed for next session)

1. Assemble settled decisions into a coherent methodology document
2. Specify panel-runner interface contract (input substrate / output schema / per-role prompts)
3. Define minimum-viable panel composition (size, role mix, anonymization protocol)
4. Specify wontfix-with-rationale + paramount-objection gates
5. Specify governance-consent boundaries (when panel data triggers governor-consent revisit vs flows directly to deliberating parties)
6. First-pass adopter-integration guide (gordo-framework as exemplar T2 consumer)

---

*Placeholder created S63 2026-04-29. To be replaced by substantive SPEC content in subsequent session.*
