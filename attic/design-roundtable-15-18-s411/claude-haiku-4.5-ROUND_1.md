I consent to this task under the stated terms.

---

# Findings: Question-Type Classification + Dissent Capture

## 1. Question-Type Classification (#15)

**Recommendation: Implement — hybrid with convener default, auto-detect as safety net.**

**Rationale:**

- **Convergent/divergent/design distinction is materially useful.** It prevents the tool from treating opinion-aggregation as consensus-finding. A "favorite movie" question *should* show divergence; a calibration question should show convergence pressure. Conflating these obscures what the tool actually accomplished.

- **Convener-specified is the right primary lever** because question intent varies by context. "What's a good password policy?" is convergent-by-intention even if answers vary. Same question in a brainstorm context might be design-framed.

- **Auto-detection as fallback** (not primary) is worth the cost. It catches cases where a convener didn't think to tag, and it provides a signal if auto-detection disagreed with the tag (worth noting in the brief). Minimal implementation: regex + heuristic (interrogative + "should"/"best" → likely convergent; "or"/"either" → design; etc.). Don't oversell it.

- **Label placement:** Tag in the preamble, not auto-injected into the transcript. Let participants see it; it frames expectations.

**Complexity cost:** Low. Implementation is a dropdown + optional post-hoc check.

---

## 2. Dissent Register vs. concerns_remaining

**Recommendation: Implement dissent_register — distinct from concerns_remaining, lighter weight.**

**The difference:**

- **concerns_remaining:** Uncertainty that survived deliberation. "We're confident on direction X, but Y is still unknown." Forward-looking; existential doubt.

- **dissent_register:** "We considered X, weighed it against Y, chose Y." Backward-looking; choice-accounting. Captures roads not taken.

**Why it matters:**

- A participant might raise a concern, have it robustly addressed, and leave with no concerns_remaining — yet that concern should be *recorded* as weighed-and-rejected. Otherwise future readers don't know a tradeoff was *made*.
- This is especially important for divergent/design questions where "we chose A over B" is the *output*, not a failure.
- concerns_remaining already does existential doubt well. dissent_register does choice-accounting.

**Minimal viable implementation:**

- Participant flag: "This was considered and not chosen" (not auto-extracted; explicit).
- Dissent register fields: `[position, rationale_for_raising, rationale_for_rejection, speaker]`
- Included in decision_brief as "Alternatives weighed:" section.
- *Not* in the main transcript; in a collapsible reference block (reasoning_trace already captures reasoning; this is just indexing).

**Interaction with pass_reflection:** Good synergy — participants sometimes surface dissent during reflection moment. Flag it for the register.

---

## 3. Shadow Proposal

**Recommendation: Do not implement (yet).**

**Reasoning:**

- **Complexity spike without proportional signal gain.** Shadow proposals require participants to:
  1. Articulate something they considered non-viable
  2. Estimate why it wouldn't land
  3. Judge whether it's worth the overhead to log
  
  This is 3x the friction of dissent_register for speculative value.

- **Over-engineering for v1.** You have concerns_remaining, dissent_register (if added), and reasoning_trace. That's already solid. Shadow proposals are v2 territory — revisit after you see whether the dissent_register generates actionable insight.

- **When it becomes worth it:** If you later observe that "positions we should have considered but didn't" is a recurring gap (flagged in retros), *then* design shadow_proposal narrowly — maybe as an optional end-of-roundtable prompt, not continuous.

---

## 4. Feature Interactions

**Strong interaction: Question-type + dissent_register**

- For **design** questions, dissent_register is *core output*, not auxiliary. "We chose A, rejected B for X reason" *is* the decision. Frame it accordingly in the brief.
- For **convergent** questions, dissent_register is auditing. "We converged on A; B was raised and addressed because [reason]."
- For **divergent** questions, dissent_register might be empty or minimal — that's fine. It signals success (we let disagreement be).

**Potential friction: dissent_register + pass_reflection timing**

- pass_reflection is prompted doubt-surfacing. If it surfaces a dissent, does it auto-populate the register, or does the participant have to flag it twice?
- **Suggestion:** Let pass_reflection output flow *into* the dissent_register prompt. "During reflection, you noted [X]. Was that a position weighed and rejected?" Yes/no choice, saves friction.

**Non-interaction: concerns_remaining is independent.** Keep it. It serves different epistemic function.

---

## 5. Minimal Viable Implementation Priority

If resource-constrained, order:
1. **Question-type classification** (convener tag + fallback detect) — *foundational*. Shapes how all downstream features interpret the roundtable.
2. **dissent_register** (explicit flag + lightweight fields) — *high ROI*. Directly addresses "what was considered."
3. **shadow_proposal** — *defer*.

---

## Uncertainty & Caveats

- I haven't seen user feedback on whether concerns_remaining actually gets used or adds noise. If it's already verbose/unused, dissent_register might compete for cognitive space in the brief. Recommend testing both together.
- "Auto-detection" of question type is a heuristic. It will fail on novel phrasings. Don't trust it as a primary signal; use it as a sanity check on convener tags.
- I'm assuming dissent_register is *optional* to populate (participants opt-in to flag positions). If you make it mandatory-to-answer, friction rises sharply.

---

## Overall Assessment

This is thoughtful incrementalism. You're adding *indexing and framing* (question type, dissent register) without adding heavyweight new deliberation steps. That's good design. Shadow proposals break that pattern — defer them.
