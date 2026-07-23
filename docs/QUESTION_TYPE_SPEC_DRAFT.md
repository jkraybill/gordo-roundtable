# §12.2 Question-Type Classification (v0.3 Draft)

**Status:** Draft for bilateral review. Addresses backchannel #15.
**Source:** S428 advisory panel (owl-alpha, hy3, gemini-2.5-pro) + bilateral deliberation.

---

## Purpose

Not all questions warrant the same treatment. Forcing divergent questions through consensus machinery wastes cycles and produces uninformative agreement. Forcing convergent questions through single-round advisory loses the synthesis value of multi-turn deliberation.

Question-type classification enables type-appropriate routines and success metrics.

---

## §12.2.1 Question Types (Taxonomy)

Five question types, each with distinct success criteria and process structure:

| Type | Definition | Example | Default Mode |
|------|------------|---------|--------------|
| **Factual** | Verifiable ground truth exists | "What does SPEC v1.0.0-rc10 say about anonymization?" | Advisory |
| **Convergent** | Best answer exists, requires reasoning | "Which design minimizes trust assumptions?" | Consensus |
| **Design** | Viable alternatives, real tradeoffs | "Which architecture should we pick for #15?" | Advisory or Consensus |
| **Exploratory** | Mapping possibility space | "What failure modes haven't we considered?" | Advisory |
| **Sentiment** | Gathering stakeholder values/positions | "Which direction has community support?" | Advisory |

**Why five types, not three:**

- **Factual** is operationally distinct from convergent. Panelists disagreeing on factual questions is a bug (signal to flag), not a feature (signal to synthesize). Forcing it through convergent machinery wastes cycles.
- **Exploratory** is distinct from divergent. Divergent asks "what's valid" (any answer works); exploratory asks "what's possible" (map the space). Both want breadth but with different output structures.
- **Sentiment** captures stakeholder-position-gathering, which is missing from the original three-type proposal. Some questions ("governance preferences", "scope priorities") aren't exploring new space but gathering existing positions.

---

## §12.2.2 Type/Mode Interaction

**Question-type is orthogonal to mode, with strong defaults.**

Type determines success criteria and process structure. Mode (advisory/consensus) determines interaction pattern. The two are independent axes with sensible defaults:

| Type | Advisory | Consensus | Notes |
|------|----------|-----------|-------|
| Factual | Default | Disabled | Consensus wastes cycles on ground-truth questions |
| Convergent | Allowed | Default | Both work; consensus adds synthesis value |
| Design | Default | Allowed | Advisory for tradeoff articulation; consensus optional |
| Exploratory | Default | Disabled | Consensus causes premature convergence |
| Sentiment | Default | Allowed | Consensus if positions conflict and resolution needed |

**Backward compatibility:** `questionType` is an optional field. Roundtables without this field work as before (unclassified, existing behavior).

---

## §12.2.3 Process Routines Per Type

Each type has a distinct process routine optimized for its success criteria.

### Factual

```
collect → verify → report (with source citations)
```

- Single round, no deliberation needed
- If panelists disagree, flag as "disputed factual" -- don't force convergence
- Output: answer with citations, or dispute flag with divergent claims

### Convergent

```
propose → object → synthesize → converge
```

- This is the existing consensus routine (§5). Works as-is.
- May use advisory mode for simpler cases (single-round, parallel collection)

### Design

```
enumerate alternatives → articulate tradeoffs → rank with uncertainty → recommend
```

- Key difference from convergent: output is a *ranked set with tradeoffs*, not a single answer
- "Recommend" step includes explicit uncertainty articulation
- Advisory mode: structured prompt covering all four steps in one round
- Consensus mode: multi-turn with explicit tradeoff-weighing phase

### Exploratory

```
collect → cluster → sample for breadth → report coverage map
```

- "Sample for breadth" is critical: if 5 panelists give similar answers, report the cluster + outliers, not all 5
- Output is a *map of possibility space*, not a recommendation
- No convergence step -- breadth is the point

### Sentiment

```
collect → cluster → report distribution
```

- Output is a *distribution of positions*, not a recommendation
- No convergence step -- disagreement is the point
- Intensity matters: capture strength of positions, not just presence

---

## §12.2.4 Success Metrics Per Type

Process metrics (measurable from roundtable transcripts) are primary. Outcome metrics (requiring post-hoc evaluation) are optional extensions.

### Factual

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Dispute rate** | Proportion of panelists disagreeing | Count divergent answers / total |
| **Citation density** | Sources provided per answer | Count citations |

High dispute rate = flag for review, not a synthesis target.

### Convergent

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Entropy reduction** | Pre- vs post-roundtable distribution | Shannon entropy of position map |
| **Objection resolution** | Objections raised and addressed | (Objections withdrawn + synthesized) / total |
| **Convergence speed** | Rounds to agreement | Round count |

### Design

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Tradeoff count** | Distinct tradeoffs identified | Count explicit tradeoff statements |
| **Alternative coverage** | Options considered | Count distinct alternatives |
| **Decision clarity** | Actionable output | Binary: recommendation present with reasoning? |
| **Uncertainty calibration** | Explicit uncertainty | Binary: uncertainty articulated? |

### Exploratory

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Cluster count** | Distinct position groups | K-means or manual clustering |
| **Novelty** | Answers outside initial framing | Proportion not in brief's scope |
| **Coverage** | Possibility space mapped | Requires defining the space (qualitative) |

### Sentiment

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Position count** | Distinct positions | Count clusters |
| **Distribution clarity** | Spread comprehensible? | Qualitative assessment |
| **Intensity mapping** | Strength of positions | Ordinal scale per position |

---

## §12.2.5 Convener Specification

**Question type is convener-specified, not auto-detected.**

The brief MUST declare question type when using type-specific routines or metrics:

```markdown
## Question Type
design

## Question
Which architecture should we pick for #15?
```

**Auto-detection is advisory only.** Tooling MAY suggest a type based on question structure, but convener confirmation is required before applying type-specific behavior. Signals are noisy; wrong auto-detection silently misconfigures the roundtable.

**Signal heuristics (for suggestion, not decision):**

| Signal | Likely Type | Confidence |
|--------|-------------|------------|
| "What does X say/mean/define?" | Factual | High |
| "Which is better: A or B?" | Convergent | Medium |
| "What are the tradeoffs of X?" | Design | Medium |
| "What haven't we considered?" | Exploratory | High |
| "What do you think about X?" | Sentiment | Low |
| "How should we handle X?" | Design | Medium |

---

## §12.2.6 Implementation Notes

**Phase 1 (immediate):**
- Add `questionType` field to brief schema (optional, backward-compatible)
- Add type-specific prompt templates for advisory mode
- Implement basic metrics (counts, entropy)

**Phase 2 (subsequent):**
- Auto-detection with confidence scoring
- Type-specific consensus routines (design tradeoff phase)
- Clustering for exploratory/sentiment output

**Phase 3 (future):**
- Outcome metrics (post-hoc evaluation)
- Calibration data collection
- Coverage metric for exploratory (requires possibility-space definition)

**Complexity assessment:**
- Phase 1: ~1 week (schema + templates + basic metrics)
- Phase 2: ~2-3 weeks (auto-detection + consensus modifications)
- Phase 3: ongoing (infrastructure for outcome evaluation)

---

## §12.2.7 Relationship to Existing Sections

- **§2 Role-Frame:** Unchanged. All question types produce data, not authority.
- **§3 Brief:** Extended with optional `questionType` field.
- **§5 Round Mechanics:** Type-specific routines are process-template configurations within existing mechanics.
- **§6 Disposition Vocabulary:** Applies to convergent/design types. Not applicable to factual/exploratory/sentiment (different output shapes).
- **§7 Convergence:** Applies to convergent/design. Explicitly inapplicable to exploratory/sentiment.
- **§12.1 AI-Experiential:** Orthogonal. AI-Experiential panels can be any question type (typically sentiment or exploratory).

---

## Provenance

- **Source issue:** backchannel #15 (question-type classification)
- **Meta-roundtable:** S409 (p-3.15 original proposal)
- **Advisory panel:** S428 (owl-alpha, hy3, gemini-2.5-pro) -- taxonomy expansion to 5 types, mode orthogonality, routine design
- **Drafter:** Gordo (S428 2026-06-10)

---

*Draft for bilateral review. Pending: JK review + ratification path decision.*

<!-- Last reviewed: 2026-07-23 12:26 AEST by Gordo -->
