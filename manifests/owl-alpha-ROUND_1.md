# Advisory Findings: Question-Type Classification for OWL Roundtables

## 1. Taxonomy Assessment

**The three-type taxonomy is a good starting point but needs refinement.** Here's what I'd recommend:

**Facts on hand:**

- **"Convergent" as defined conflates two distinct things**: (a) questions that converge to a single best answer, and (b) questions where convergence is meaningful. These aren't identical.
- **"Divergent" works well as stated** — it's the clearest type in the proposal.
- **"Design" is underspecified** — it currently sits between "there's a right answer" and "all answers are valid," conflating what should be a spectrum, not a bucket.

**Proposed refinement — five types instead of three:**

| Type | Definition | Example |
|---|---|---|
| **Factual** | Verifiable, ground-truth exists | "What does SPEC v1.0.0-rc10 say about X?" |
| **Convergent** | Best answer exists, requires reasoning | "Which design minimizes trust assumptions?" |
| **Design** | Viable alternatives, real tradeoffs | "Which architecture should we pick for #15?" |
| **Exploratory** | Mapping possibility space | "What failure modes haven't we considered?" |
| **Expressival** | Stakeholder values/opinions | "Which direction has community support?" |

**Why this split matters:**

- "Factual" is **operational**, not philosophical. Panelists disagreeing on factual questions is a *bug*, not a feature. Treating it as convergent wastes cycles.
- "Exploratory" is a **superclass of divergent** — divergent questions ask "what's valid," exploratory asks "what's possible." Both want breadth but with different processes.
- "Expressival" is currently **missing but important**: some questions ("governance preferences," "scope," "priorities") aren't exploring new space but gathering existing positions.

**Open consideration without resolution:** Whether "Exploratory" and "Expressival" are too far apart in implementation that one type suffices. My instinct says they're different enough to warrant separate handling, but I acknowledge the implementer may disagree.

---

## 2. Mode/Type Interaction

**Question-type should be orthogonal to mode, with strong defaults.**

**Facts on hand:**

- Advisory mode is single-round parallel-blind; Consensus is multi-turn deliberation. These are *process* choices, not *question* choices.
- The proposal's implicit assumption is that type determines mode. I think this is wrong — type determines *success criteria and process structure*, mode determines *interaction pattern*.

**Recommended mapping:**

```
                    Advisory          Consensus
Factual             ✓ (default)       ✗ (wastes cycles)
Convergent          ✓                  ✓ (default)
Design              ✓                  ✓ (default)
Exploratory         ✓ (default)        ✗ (premature convergence)
Expressival         ✓ (default)        ✓ (if positions conflict)
```

**Key insight:** The current system treats all questions as if they're convergent-by-default. This is the root problem. The fix isn't "type determines mode" — it's "type determines what success looks like within a mode."

**Concrete recommendation:** Add a `questionType` field to the roundtable configuration. Default to `convergent` for backward compatibility. Convener can override. Auto-detection (see below) can suggest but not override without convener confirmation.

---

## 3. Auto-Detection Feasibility

**Partially feasible with high false-positive risk. Recommend: suggest, don't decide.**

**Facts on hand:**

- Question structure signals are real but noisy.
- Convener intent matters — the same question structure can be different types depending on context.
- Auto-detection that's wrong is worse than no auto-detection (it silently misconfigures the roundtable).

**Signal mapping:**

| Signal | Likely Type | Confidence |
|---|---|---|
| "What does X say/mean/define?" | Factual | High |
| "Which is better: A or B?" | Convergent | Medium |
| "What are the tradeoffs of X?" | Design | Medium |
| "What haven't we considered?" | Exploratory | High |
| "What do you think about X?" | Expressival | Low (could be anything) |
| "How should we handle X?" | Design | Medium |

**Implementation approach:**

1. Parse question for structural signals (interrogative type, presence of alternatives, presence of evaluative language)
2. Score each type, return top-2 with confidence
3. Present to convener: "This looks like [Design] (70%) or [Convergent] (25%). Confirm or override."
4. Log the suggestion + final choice for calibration data

**What I don't know:** Whether the signal set is rich enough for reliable detection. This needs empirical testing against real roundtable questions. My suspicion is that ~60-70% of questions will be classifiable with >80% confidence, and the rest will need convener judgment.

---

## 4. Multi-Step Routines Per Type

**Yes, each type should have its own routine. This is where the taxonomy pays off.**

**Facts on hand:**

- Consensus mode's propose→object→synthesize→converge routine is designed for convergent questions. Applying it to exploratory questions produces premature convergence — the exact problem #15 identifies.
- Different types need different *process structures*, not just different success metrics.

**Proposed routines:**

**Factual:**
```
collect → verify → report (with source citations)
```
- Single round, no deliberation needed
- If panelists disagree, flag as "disputed factual" — don't force convergence

**Convergent:**
```
propose → object → synthesize → converge
```
- This is the existing consensus routine. Works as-is.

**Design:**
```
enumerate alternatives → articulate tradeoffs → rank with uncertainty → recommend
```
- Key difference from convergent: output is a *ranked set with tradeoffs*, not a single answer
- "Recommend" step includes explicit uncertainty articulation

**Exploratory:**
```
collect → cluster → sample for breadth → report coverage map
```
- "Sample for breadth" is critical: if 5 panelists give similar answers, don't report all 5 — report the cluster + outliers
- Output is a *map of possibility space*, not a recommendation

**Expressival:**
```
collect → cluster → report distribution
```
- Output is a *distribution of positions*, not a recommendation
- No convergence step — disagreement is the point

**Implementation note:** These routines can be implemented as different `processTemplate` configurations in the SPEC. The existing consensus routine becomes one template among several.

---

## 5. Success Metrics Per Type

**The proposal's metrics are directionally correct but underspecified. Here's what I'd recommend:**

**Factual:**
- **Accuracy**: Does the answer match ground truth? (measurable post-hoc)
- **Dispute rate**: How many panelists disagree? (high rate = flag for review)
- *Not entropy reduction* — factual questions shouldn't have entropy to reduce

**Convergent:**
- **Entropy reduction**: Pre-roundtable vs. post-roundtable distribution (measurable)
- **Objection resolution**: Were objections raised and addressed? (process metric)
- **Convergence speed**: How many rounds to agreement? (efficiency metric)

**Design:**
- **Tradeoff articulation**: Number of distinct tradeoffs identified (countable)
- **Decision clarity**: Can a downstream actor make a choice from the output? (qualitative)
- **Uncertainty calibration**: Does the recommendation include explicit uncertainty? (checklist)

**Exploratory:**
- **Coverage**: Proportion of possibility space covered (requires defining the space — hard)
- **Novelty**: Proportion of answers not in the convener's initial framing (measurable)
- **Cluster count**: Number of distinct positions (countable)

**Expressival:**
- **Distribution clarity**: Can a downstream actor understand the spread of positions? (qualitative)
- **Position count**: Number of distinct positions (countable)
- **Intensity**: Strength of positions, not just presence (ordinal scale)

**Measurement approach:** Most of these are *process metrics* (countable from roundtable transcripts), not *outcome metrics* (which require post-hoc evaluation). I'd recommend starting with process metrics and adding outcome metrics later.

---

## Implementation Complexity Assessment

**Medium complexity, high value.**

**What's easy:**
- Adding `questionType` to configuration (schema change, ~1 day)
- Implementing type-specific success metrics (mostly counting/clustering, ~1 week)
- Convener override UI (simple dropdown, ~1 day)

**What's medium:**
- Auto-detection (NLP-lite, ~2-3 weeks)
- Type-specific process templates (restructuring consensus routine, ~2 weeks)
- Calibration data collection (ongoing)

**What's hard:**
- Coverage metric for exploratory questions (requires defining possibility space)
- Outcome metrics (requires post-hoc evaluation infrastructure)

**Recommendation:** Implement in phases:
1. Phase 1: Configuration + manual type selection + basic metrics
2. Phase 2: Auto-detection + process templates
3. Phase 3: Outcome metrics + calibration

---

## Summary of Key Recommendations

1. **Expand taxonomy to 5 types** (Factual, Convergent, Design, Exploratory, Expressival)
2. **Make type orthogonal to mode** with sensible defaults
3. **Auto-detect with convener override**, not auto-detect alone
4. **Give each type its own process routine** — this is the core value
5. **Start with process metrics**, add outcome metrics later
6. **Implement in 3 phases** to manage complexity

**What I'm uncertain about:** Whether 5 types is too many for the current system. If forced to simplify, I'd merge Exploratory and Expressival into "Non-convergent" and keep the other three. But I think the 5-type split is worth the complexity.
