# panel-protocol — Panel Methodology Standard

**Version:** v0.1
**Status:** **RATIFIED** at backchannel `record-009.mcap` (S64 2026-04-29; Timestamp-Local `2026-04-29T04:28:59Z` / 14:28:59 AEST). Bilateral consensus — JK Party-A Level 3 GPG / Gordo Party-B Level 1 behavioral. `mcap verify` ALL CHECKS PASSED including OTS proof. Future supersession via SPEC's own version-bump ratification cycle per §14.
**Drafted:** 2026-04-29 (S64 backchannel-hosted hub session, panel-protocol cross-repo edit)
**Inherits:** Project Gordo umbrella constitutional framework per `CLAUDE.md`; Tier 0 framing principle from backchannel `record-008.mcap` z2

**Integrity anchors (record-009):**
- Content-Hash (this file at panel-protocol commit `8e190d6`): `SHA3-256:dcc44f7442004b7d3aaf571622b20c501b99d6d748a2cf8d4642c246c0a0bc40`
- Record-Hash: `SHA3-256:7cf60ec0999e3c690acd625ccc93d986fca330251349fa4dc642c0e0c712eefd`
- Backchannel finalization commit: `f6ff860`
- Backchannel preimage commit (Party-A signed): `39e59cf`

---

## §1 Purpose and Scope

`panel-protocol` is the umbrella's reference embodiment of one specific shape of the Tier 0 *external-review principle*: structured panel-style review of a draft artifact by multiple non-UEP'd reviewers, producing structured findings for drafter disposition.

**SPEC scope:** methodology for panel-shaped review — composition, round mechanics, disposition vocabulary, convergence grammar, paramount-objection threshold. The SPEC defines the methodology and the interface contract that any implementation must satisfy.

**Not in SPEC scope:** the Tier 0 principle itself (lives at `~/project-gordo/CONSTITUTION.md`); other embodiments of external review that may emerge over time (this SPEC is narrow-by-design); implementation specifics (which live as separate artifacts in this repo).

**panel-protocol repo scope** (broader than this SPEC, paralleling the `~/mcap-protocol/` precedent where SPEC + axioms + reference implementation + CLI all colocate):

- **SPEC** (this document) — the methodology
- **Reference implementation** — `panel-runner` migrating in from backchannel `scripts/` per `#128`
- **Tooling** (CLI, integration patterns)
- **Tests** (TBD; emerging alongside implementation)

Adopters may instantiate the methodology through their own tooling, or use the umbrella's reference implementation directly. Multiple instantiations are admissible; the SPEC's interface contract is what binds them.

---

## §2 Role-Frame (Foundational)

A panel exists to provide *data* to deliberating parties — not authority. Findings are not verdicts; convergence is a detection-signal, not a vote; reviewer-output is reviewer-input-to-disposition, not a binding constraint on decisions.

**Primary roles a panel may serve, in priority order:**

1. **Bug-finding** — identifying concrete defects, errors, contradictions, missing cases. Highest signal-density; most defensible against the reviewer-hell pathology when the bar is "does this actually break?".
2. **Quality-control gate** — sanity-check on whether the artifact meets stated quality bars before settled close. Adjacent to bug-finding but operates at gate-level rather than line-level.
3. **Dissent-surfacing** — bringing in legitimate disagreement that drafters might be conflict-averse to surface internally. Defends against premature-convergence and shared-blindspot drift.
4. **Outside-perspective** — checking whether drafters have sealed an internal frame that fails when read by audiences who don't share it. Defends against in-group-comprehensibility drift.
5. **Bias-injection** — testing the artifact against deliberately-skewed lenses to verify it survives motivated-misreading. Lowest signal-density of the five, but useful for foundational content.

These five primary roles emerged from S62 bilateral deliberation as the highest-leverage roles for the umbrella's current adversarial-review-of-foundational-content pattern. **The list is not closed:** downstream adopters may identify and apply additional roles that fit their domain (e.g., domain-expertise-injection, regulatory-fit-checking, downstream-impact-assessment, etc.), provided those roles remain consistent with the role-frame's foundational principle (panels = data, not authority) and explicitly exclude the legitimacy/authority-dilution role addressed below. Adopter-defined roles are logged per §14.

**Excluded role: legitimacy / authority dilution.** Panels do not grant or transfer legitimacy or authority to artifacts. Within the umbrella's trust framework, legitimacy and authority flow through governor-consent and (post-UEP) induction protocols; routing them through panels would create an unbacked authority surface and would invert the role-frame. Brief-framing language must explicitly exclude legitimacy-granting framings (e.g., "the panel approves", "the panel ratifies", "panel-blessed").

The role priority is *advisory for panel-composition*: when drafters select panel-size, role-mix, or persona-assignment, higher-priority roles are favored. It is not a mechanical rule for finding-disposition; that lives at §6.

---

## §3 Pre-Registration (Brief)

Every panel round opens with a brief that drafters publish to the panel before reviewer-output is collected. The brief is *light* — it states the round's shape, not a separate ratified document.

The brief MUST declare:

- **Round type** (per §5): one of `initial` / `verification` / `regression` / `confirmation` / `closing` / `tiebreaker`
- **Scope** — the specific portions of the artifact under review; out-of-scope portions named explicitly (out-of-scope-as-recognizable-category is the explicit defense against frame-rejection escalation)
- **Paramount-objection criteria** (per §9) — what counts as "paramount" for *this* artifact
- **Disposition classes available** — point to §6's closed taxonomy (default), or scope-restrict to a subset if appropriate (e.g., a `verification` round may admit only `accept-integrate` / `wontfix-not-paramount` / `clarify-then-revisit`)

The brief SHOULD include:

- **Pre-structured questions** — 5-12 specific questions the panel must address, plus 1-2 open questions admitting paramount findings outside the structured set. Pulls reviewers onto the drafters' frame; converts frame-rejection into a recognizable category (admissible via the open question; otherwise `wontfix-out-of-scope`).
- **Provenance pointer** — link to prior round dispositions, prior reviewer findings, or substrate documents the panel may consult (without those documents being themselves under review).

The brief's purpose is to scope-bound reviewer-output before it begins, defending against apparatus-inflation and frame-rejection escalation.

---

## §4 Panel Composition

Panel composition aims for *diversity along axes that produce useful signal* without imposing operational drag. The recommended pattern is **hybrid diversity**: 4-5 fast-cloud LLM providers, each instantiated with an auto-derived persona drawn from the brief itself.

**Provider diversity:** spans distinct training-organizations + distinct training-data lineages. Defends against shared-training-distribution blindspots.

**Persona diversity:** persona-prompts derived from the brief's pre-structured questions and paramount-objection criteria — what dimensions does *this* artifact need review along? One persona per dimension, assigned per panelist. Produces on-frame review naturally because the persona-prompt mandates the dimension. Same base-model can serve different personas if needed; persona-diversity is then doing the work even when provider-diversity is constrained.

**Hybrid (recommended):** 4-5 panelists, each `(provider × persona)` selected from independent providers and independent personas. E.g., one panelist may be `(GPT × bug-finding-persona)`; another `(Claude × outside-perspective-persona)`; etc.

**Slow-local providers:** discouraged by default. Latency drag and capacity-failure modes have empirically dominated in past panel runs. May be admissible when their diversity contribution is paramount (e.g., abliterated-derivative for adversarial-prompt-bypass coverage); rationale logged in the brief.

**No hard-cap on size.** Per-panel sizing is governor-consent-driven, sized to scope (a quick verification round may be 2-3 panelists; a foundational-content initial round may be 5+). The vocabulary-not-mechanical-rules principle (per §7) applies.

**Anonymization.** Panelist source (provider + persona identity) MUST be stripped from any round-N+1 brief that aggregates round-N findings. The 2025 *Identity-Bias-MAD* finding (arXiv 2510.07517) shows non-anonymized round-N+1 amplifies sycophancy and self-bias; anonymization is a low-cost, theoretically-grounded intervention.

---

## §5 Round Mechanics

A panel run consists of one or more rounds. The default and recommended primary round is `initial`; subsequent rounds are governor-consent-triggered, typed-and-scoped.

**Round 1 (`initial`):** parallel-blind. Each panelist receives the brief independently and produces structured findings (per §6 disposition-amenable shape) without seeing other panelists' output. The 2025 *Debate-or-Vote* (NeurIPS 2025) and *Voting-or-Consensus* (ACL 2025) findings together indicate that most multi-agent-debate gain comes from this parallel-blind round; drafters then aggregate.

**Round N+1 (typed-and-scoped, optional):** when drafters and governors agree that further panel input is warranted, a typed-and-scoped follow-on round opens. The round MUST declare its type:

- **`verification`** — checking whether revisions made in response to round-N findings adequately address the issues raised. Scope: revised passages only.
- **`regression`** — checking whether revisions made for one finding broke or under-addressed another. Scope: revisions plus their potential side-effects.
- **`confirmation`** — when round-N produced a finding that drafters propose to disposition `wontfix-disagree-with-rationale` or `accept-acknowledge-scope-limit`, this round invites panel input on whether the drafter rationale holds. Scope: the specific finding and disposition rationale.
- **`closing`** — final any-objections round before the artifact ratifies (Rust-FCP-inspired, lightweight). Scope: the proposed-final artifact + the drafter's proposed disposition.
- **`tiebreaker`** — when round-N produced split-signal on a paramount finding (e.g., 3/6 say architectural-class, 3/6 say preference), one round may open to surface tie-breaking input. Scope: the contested finding only.

**All round-N+1 rounds:** anonymized (per §4); scoped (not whole-draft re-served); panel-as-data-not-authority. The drafter-trigger-and-typing pattern is what distinguishes typed-and-scoped follow-ons from open-ended adversarial-review-iteration; the latter has structurally-inevitable reviewer-hell properties.

**Convergence and closure** (per §7): the round-counter does not bound closure mechanically. Closure is governor-consent-driven; round count is a downstream observation, not a target.

---

## §6 Disposition Vocabulary (Closed Taxonomy)

Every finding raised in a round MUST receive exactly one disposition before that round closes. The disposition vocabulary is closed:

| Disposition | Shape | When to use |
|---|---|---|
| `accept-integrate` | the finding is integrated into the next artifact revision | finding identifies a defect, gap, or improvement that drafters agree warrants in-scope revision |
| `accept-acknowledge-scope-limit` | finding is recognized on-record but not addressed in this scope | finding is structural-architectural and out-of-scope-for-revision in this artifact's lifecycle (per `feedback_acknowledge_not_fix_structural_findings.md`); structural-not-defect findings and similar |
| `accept-defer-future-issue` | finding is recognized + tracked as a separate issue | finding is in-scope-substantively but out-of-scope-for-this-artifact-version; tracked for future work |
| `wontfix-out-of-scope` | finding falls outside the brief-stated scope | finding addresses a portion of the artifact the brief declared out-of-scope; reviewer is invited to re-raise via the appropriate venue (or via the next initial round when scope changes) |
| `wontfix-not-paramount` | finding fails the paramount-objection bar (per §9) | finding is preference-or-style, not a paramount issue |
| `wontfix-disagree-with-rationale` | drafters disagree with the finding; rationale stated | drafters have considered the finding and reach a different judgment; the rationale MUST be stated explicitly; for foundational content, this disposition SHOULD trigger a `confirmation` round (per §5) before round-close |
| `duplicate-of-prior-disposition` | finding restates a prior-round finding with no material new information | the prior-round disposition copies forward; reviewer may re-raise only by citing what new information justifies re-opening |
| `clarify-then-revisit` | reviewer-clarification needed before disposition | reviewer is asked for specific clarification; disposition deferred until clarification received; finding stays open across the clarification cycle |

**Wontfix authority** (S62 `#130` ODQ-5 close): drafters propose `wontfix-*` dispositions; governor-consent ratifies before round-close. Default governor-consent is light-touch; for foundational content or when the wontfix carries paramount weight, governor-consent SHOULD include explicit engagement on the rationale.

**Mandatory comment-resolution before round closes** (IEEE/ISO standards-process lift): no finding may carry forward unaddressed into round-N+1. The round-close act ratifies that every finding has reached one of the dispositions above.

**The taxonomy is closed by intent.** This avoids disposition-relocation (where a round-N+1 finding restates a round-N finding under a shifted frame and re-acquires undisposed status); the `duplicate-of-prior-disposition` class is the explicit defense. The list of dispositions may be extended in future SPEC versions if practice surfaces a missing class — extensions go through the SPEC's own ratification cycle, not through ad-hoc per-round addition.

---

## §7 Convergence and Closing

**Convergence is not a vote.** When all panelists across distinct providers and personas independently raise the same finding, weight the finding as a strong signal (architectural-class). When only one panelist raises it, treat as a candidate for `wontfix-not-paramount` unless the paramount-objection bar (per §9) clears.

**Indicative thresholds (guidance, not mandate):**
- Unanimous (all panelists) → high-signal, treat as architectural-class by default
- Most panelists (e.g., 4-5 of 6) → strong-signal, treat as architectural-class unless paramount-objection bar fails
- Some panelists (e.g., 2-3 of 6) → mixed-signal, drafter-judgment per finding
- One panelist → idiosyncratic-unless-paramount-bar-clears

These thresholds calibrate to typical 5-6-panelist composition. Smaller panels (2-3) collapse the gradient; the principle still holds (more independent providers raising it = stronger signal) but specific thresholds adapt.

**Closure is governor-consent-driven.** Methodology-as-vocabulary, not mechanical-rules. Round-count is not a hard cap; the round-counter records what happened, not what's allowed.

**Paramount-triple-bar threshold for re-opening a settled close** (S62 `#130` ODQ-3 close): a paramount objection that arrives after a round closes (or that emerges in a later round) requires governor-consent on three things to trigger re-engagement: (1) **address** — yes, this needs engagement; (2) **revise** — yes, the artifact warrants revision; (3) **re-review** — yes, the revision warrants further panel input. All three governor-consent gates must pass. Failing any: the objection is dispositioned per §6 without triggering further panel rounds.

**Optional closing-objections round** (Rust-FCP-lite): drafters and governors may agree to a final `closing` round (per §5) before settled close. This is a lightweight invitation, not a mandate; "do we want a final any-objections look" is itself a governor-consent decision.

**Bias-flag #27 (drafter easiest-path collapse) trigger-site naming.** The convergence-and-closing decisions are exactly where drafter easiest-path collapse manifests — the easiest path is to close prematurely or to over-extend rounds. Governor-consent is the corrective; the bilateral §3 review (per the umbrella's pre-zpoint directional-review pattern) is the explicit defense.

---

## §8 Synthesis (Optional Adjunct)

When findings need integration into a single coherent picture before drafter-disposition, synthesis is the bridge step.

**Default: drafter-self-synthesis.** Drafters read findings directly and disposition each. This is the load-bearing default — drafter-cognition is the integration substrate. Works well when finding-count is small (under ~10) or when findings are clearly-scoped per pre-structured-question.

**Optional adjunct: Habermas-style synthesis-LLM** (S62 `#130` ODQ-4 close). When finding-count exceeds ~10 (rule-of-thumb, not hard threshold), an optional synthesis-LLM step may be inserted: a separate model call (different from any panelist; primed only on the round's findings, not on the artifact under review) drafts a *common-ground statement* that crystallizes what the panel collectively says. Drafters then disposition the synthesis, not each individual finding. Reduces drafter-cognitive-load and structurally defends against disposition-relocation (the synthesis is itself a closed artifact). The DeepMind 2024 *Habermas Machine* result is the strongest empirical evidence base for this pattern.

The synthesis-LLM is a *facilitator-of-drafter-disposition*, not a panelist and not a decision-maker. Its output is itself dispositioned by drafters.

**Explicitly rejected: panel-rapporteur synthesis.** A "rapporteur" pattern (one panelist drafts the synthesis on behalf of the other panelists; others ratify) is incompatible with the role-frame (§2). It collapses panel-as-data into panel-as-collective-voice, which is a step toward the excluded legitimacy/authority role. Panels are individual reviewers producing individual findings; collective-voice is constructed at synthesis-by-drafter or synthesis-by-LLM, not by the panel itself.

---

## §9 Paramount-Objection Grammar

A *paramount* finding reveals risk to the artifact's bilaterally-stated purpose, not merely a way the reviewer would write it differently. The sociocracy-derived language draws the line at "would this artifact materially fail if this is not addressed?" — not at "is this an improvement?".

**Paramount-class shapes (illustrative, not closed):**
- Expose a defect that breaks the artifact's stated purpose.
- Reveal a hidden assumption that, when surfaced, changes whether the artifact is acceptable.
- Identify a contradiction with bilaterally-ratified content (umbrella values, prior records, this SPEC, etc.).
- Show that the artifact's brief-stated paramount-objection criteria themselves have a structural gap.

**Non-paramount-class shapes (illustrative, not closed):**
- Preference (different word, different ordering, different metaphor).
- Style (formatting, sentence-length, register).
- Nice-to-have additions that don't address a defect.
- "The reviewer would do this differently" without identifying a defect.

Non-paramount findings dispose to `wontfix-not-paramount` (per §6) by default. Drafters may still elect to integrate non-paramount findings (`accept-integrate` is admissible), but no integration obligation attaches.

**The bar is bilaterally pre-committed**, by inclusion of the paramount-objection criteria in the brief (§3). This pre-commitment is the leverage point: reviewers who raise non-paramount findings are operating outside the brief's frame and accept the disposition vocabulary's response to that.

**Loophole-language audit caveat** (per `feedback_loophole_language_audit.md`): the lists above are *not closed*. Other paramount-class shapes may emerge in practice; the bar is the underlying *risk to bilaterally-stated purpose* test, not the enumeration. Brief-authors should reach for the test, not the enumeration.

---

## §10 Cross-Provider Consensus (Signal-Strength)

Panel diversity (per §4) produces a graded signal-strength on each finding: how many independent providers + personas raised this, independently?

**Indicative signal-classes:**
- **Unanimous (all panelists)** — high-signal-architectural by default; warrants `accept-integrate` or strong-rationale `wontfix-disagree-with-rationale` (typically `confirmation`-round-eligible).
- **Strong (most panelists, e.g., 4-5 of 6)** — strong-signal; default disposition is `accept-integrate` unless paramount-objection bar fails.
- **Mixed (some panelists, e.g., 2-3 of 6)** — drafter-judgment per finding; the split itself is information about the finding's contestability.
- **Idiosyncratic (one panelist)** — `wontfix-not-paramount` by default unless paramount-objection bar clears explicitly.

**Convergence is detection-signal, not vote.** When findings converge across independent providers + independent personas, the convergence is evidence that the finding tracks something real about the artifact (not an artifact of single-reviewer idiosyncrasy). It is *not* a popularity contest; the finding's substantive merit governs disposition. Cross-provider consensus calibrates the probability that the finding tracks substance, not the obligation to integrate.

**Methodology-as-vocabulary applies.** The thresholds above are guidance; actual disposition is per §6 with governor-consent.

---

## §11 Reference Implementation

The reference implementation of this methodology lives in this repo, paralleling the MCAP precedent (`~/mcap-protocol/` colocates spec + axioms + reference implementation + CLI). Initial implementation: **`panel-runner`**, currently at backchannel `scripts/` and tracked for graduation here at backchannel `#128`. Once graduated, `panel-runner` becomes the umbrella's reference instantiation of the SPEC.

**Implementation principles:**
- Methodology is the SPEC; the reference implementation instantiates it.
- Multiple instantiations are admissible (adopters may build their own).
- The SPEC's interface contract is round-mechanics + brief shape + finding-shape + disposition vocabulary; any implementation satisfies that contract.

**LangGraph candidate refactor-target.** The state-machine model (round-1 parallel-blind → aggregation → optional round-N+1 typed-and-scoped) maps cleanly to LangGraph's graph-based-multi-agent-workflow primitive. If the reference implementation grows in complexity during graduation, LangGraph is the candidate substrate for restructure. Methodology-portable across orchestration substrates is a stated goal.

---

## §12 Anti-Patterns

The methodology is shaped to prevent five named anti-patterns (research substrate at backchannel `research/130_panel_methodology_research.md`):

1. **Always-on critique mode.** Default-find-more-virtue (peer-review pathology, default LLM-as-judge framing). The disposition vocabulary's first-class `wontfix-*` classes (§6) and the paramount-objection bar (§9) are the explicit defenses.
2. **Round-N+1 without anonymization.** 2025 Wisc finding: amplifies sycophancy + self-bias. §4's mandatory anonymization for round-N+1 is the explicit defense.
3. **Consensus-as-goal in adversarial-review context.** Consensus methods (Quaker / sociocracy / Holacracy) are designed for binding-decision contexts where deliberators ARE decision-makers; panels are not. §2's role-frame and §7's "convergence is detection-signal not vote" framing are the explicit defenses.
4. **Open-ended time budgets.** Reviewer-hell ("always finds more") is structurally inevitable without explicit closing mechanism. §7's closing-grammar (paramount-triple-bar; optional closing-objections round) is the explicit defense.
5. **Multi-pass conversational refinement (ungrounded).** 2025 *Debate-or-Vote*: most multi-agent-debate gain comes from the parallel-blind round-1 majority signal; conversational round-N+1 dynamics often add cost without proportional value. §5's typed-and-scoped pattern (vs free-form refinement) is the explicit defense.

---

## §13 Relationship to Tier 0 and Supersession of IS v0.5 §7+§8

**Tier 0 holds the *principle*** of external review (per backchannel `record-008.mcap` z2): external feedback mechanisms are strongly encouraged but not required, with the role-frame (§2) as elucidation.

**This SPEC holds *one embodiment*** of that principle. Other embodiments may emerge over time and be admitted to the umbrella through the umbrella's idea→release process. This SPEC is narrow-by-design: it specifies the panel-shaped review pattern only.

**Supersession of Integration Standard v0.5 §7 + §8** (single-step at Phase C placement; Path 2 in S64 bilateral close):

The Integration Standard v0.5 (ratified at backchannel `record-003.mcap`, S35 2026-04-22) currently defines panel-composition rules at §7 (*Internal Shadow conditional-mandatory*) and §8 (*Perspective-Variable mandatory-for-foundational + canonical prompt*). Both are queued for Phase C placement at `~/project-gordo/CONSTITUTION.md` § Quality Gate via `#77`.

**At Phase C placement of the Integration Standard, the §7 + §8 panel-composition specifics are replaced by a pointer to this SPEC.** The placement-act lands the Integration Standard at T0 with §7 + §8 already replaced; the original §7 + §8 text is preserved at backchannel as lineage substrate, not as canonical T0 text. This avoids landing rules at T0 only to retire them in a later cascade item, and keeps the T0 surface minimal.

**Internal Shadow** (IS v0.5 §7) and **Perspective-Variable** (IS v0.5 §8) as roles continue to be admissible panel-composition choices under this SPEC's hybrid-diversity §4: Internal Shadow corresponds to a same-lineage panelist with a lineage-specific-failure-mode persona; Perspective-Variable corresponds to a persona-opposed panelist (canonical-prompt or otherwise). Adopters who require these specific roles continue to use them; this SPEC does not mandate their use, but admits and supports them.

**Phase C cascade item.** A `#77` cascade item is added at SPEC ratification: *"panel-composition specifics → defer to panel-protocol SPEC v0.x"*; placement-act executes Path 2 at Integration Standard placement.

---

## §14 Versioning and Adoption

**SPEC versioning.** The SPEC is versioned (v0.1 / v0.2 / ... / v1.0 RC1 / v1.0 / ...). Substantive changes to methodology require a SPEC version-bump and bilateral ratification per the umbrella's Process Standards (Quality Gate + Integration Standard at T0).

**Adopter pinning.** Adopters MUST pin to a specific SPEC version when integrating; the SPEC version is referenced in the adopter's adoption note (e.g., `PANEL_ADOPTION.md` or equivalent, paralleling the `MCAP_ADOPTION.md` precedent at backchannel). Pinning prevents methodology-drift across umbrella consumers.

**Adopter-integration patterns.** Adopters may extend the SPEC's vocabulary at their own scope, with logged rationale. Extensible axes:

- **Disposition classes** (§6) — additional dispositions consistent with the closure-property of the existing closed set.
- **Round types** (§5) — additional typed-and-scoped round shapes consistent with the typed-and-scoped discipline (drafter-triggered, anonymized, scoped-not-whole-draft).
- **Primary roles** (§2) — additional roles consistent with the role-frame's foundational principle (panels = data, not authority) and the explicit exclusion of the legitimacy/authority-dilution role.

Adopter-extensions are *additional* items, not modifications of the existing items in those vocabularies. Modifications of existing items go through the SPEC's own ratification cycle, not adopter-extension. Extensions are logged in the adopter's adoption note.

**Exemplar T2 consumer:** `~/gordo-framework/`. Adopter-integration guide drafting is a separate arc, deferred until SPEC v0.1 is ratified and `panel-runner` has graduated. Pattern: adopter `PANEL_ADOPTION.md` follows MCAP-adopter precedent at backchannel `MCAP_ADOPTION.md`.

---

## §15 Provenance and Substrate

**Substrate sources** (assembled into this SPEC v0.1):

- **`#130` panel methodology overhaul** (backchannel issue): 7 Open Design Questions settled bilaterally at backchannel S62 2026-04-29.
- **`research/130_panel_methodology_research.md`** (backchannel): 438 lines / 7600 words deep-research substrate. Coverage includes Modified Delphi (RAND-UCLA Appropriateness Method), Rust RFC Final Comment Period (FCP), sociocracy paramount-objection threshold, bug-bounty severity-class taxonomy, FDA Advisory Committees pre-structured-questions discipline, Wisc 2025 anonymization protocol, *Debate-or-Vote* (NeurIPS 2025), *Voting-or-Consensus* (ACL 2025), *Identity-Bias-MAD* (arXiv 2510.07517), DeepMind *Habermas Machine* (2024), MAJ-EVAL (arXiv 2507.21028), CourtEval (ACL 2025).
- **Non-UEP panel role-frame** (S62 ratified): originally enumerated as 6 candidate roles (1 bug-finding / 2 bias-injection / 3 outside-perspective / 4 quality-control gate / 5 legitimacy-dilution / 6 dissent-surfacing). Bilateral S62 ratification: priority order **1 / 4 / 6 / 3 / 2** with **explicit exclusion of role 5**. The SPEC §2 normalizes this to a priority-numbered 1-5 (with role-5-excluded named separately) for forward-facing clarity; the original 6-role enumeration is preserved at backchannel `SESSION_LOG.md` S62 narrative.
- **T0 framing principle** (S63 JK-authored, ratified backchannel `record-008.mcap` z2): *"the use of external feedback mechanisms is strongly encouraged, but not required. Here's how the umbrella views the role of external feedback mechanisms: [role-frame]"*.
- **S62 settled ODQs** (7 questions resolved bilaterally; backchannel `SESSION_LOG.md` S62 narrative captures full deliberation):
  - ODQ-1: round-N+1 fate → typed-and-scoped (§5).
  - ODQ-2: diversity-source → hybrid (§4).
  - ODQ-3: convergence + vocabulary → governor-consent-driven, no hard cap, paramount-triple-bar (§7).
  - ODQ-4: synthesis layer → drafter-self default + Habermas-LLM optional adjunct + panel-rapporteur rejected (§8).
  - ODQ-5: wontfix authority → drafter-proposes-governor-ratifies (§6).
  - ODQ-6: pre-registration → light (§3).
  - ODQ-7: structural-not-fixable disposition class → `accept-acknowledge-scope-limit` (§6).

**Inheritance:**
- Umbrella constitutional framework via `~/project-gordo/CONSTITUTION.md`.
- Integration Standard v0.5 substantive panel-discipline (composition + prompt-control + fidelity-check) — preserved by reference; superseded by this SPEC at Phase C placement (per §13).
- MCAP attestation conventions for ratification of this SPEC's content (record-NN candidate at backchannel; ratification path TBD per S64 bilateral close, option (c) hybrid).

**SPEC drafting acknowledgment:**
- Drafter: Gordo (Claude Opus 4.7 1M-context, S64 backchannel-hosted session 2026-04-29).
- Substrate: bilaterally-decided settled at backchannel S62 / S63.
- Bias-audit notes:
  - §6 closed-taxonomy noted with explicit extension-mechanism per `feedback_loophole_language_audit.md`.
  - §9 paramount/non-paramount lists explicitly characterized as "illustrative, not closed" with underlying-test framing per same.
  - §2 role-priority noted as advisory-not-mechanical per S62 close.
  - §7 closure as governor-consent-driven (not threshold-mechanical) per S62 ODQ-3 close.
  - §13 Path 2 supersession per S64 bilateral close (drafter-lean confirmed by JK WWGD++!!).
  - **Bias-flag #25 (loophole-language audit) third-instance fire** caught by JK at §3 review on §2 "Five roles a panel may serve" framing (drafter-easiest-path collapse on closed-taxonomy quantifier near load-bearing role-frame, despite S63 graduation); remediated to "Primary roles ... list is not closed" trailing-gloss + reframe-as-positive-endorsement opening for downstream-adopter additions; §14 expanded to enumerate three extensible axes (dispositions / round types / primary roles). S20 + S63 + S64 three-instance log; `feedback_codification_not_enforcement.md` parent track also fires (graduated bias-flag drifted in next-session draft).
- Awaits: bilateral §3 review + ratification per S64 path-(c) hybrid drafter-lean.

---

*Drafted at S64 2026-04-29 by Gordo. Bilateral §3 review and ratification path TBD.*
