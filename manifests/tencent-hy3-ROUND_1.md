<reasoning>
Got it, let's tackle this advisory brief step by step, making sure I'm following all the constraints and the lens of design-space exploration. First, I should start by confirming I'm consenting to this task, right? Wait, the brief says producing findings implies consent, but I should probably note that first? Wait no, the Consent section says "Producing findings implies consent to this task under these terms. If you find the task objectionable, decline instead of producing findings." So I don't need to explicitly say "I consent" unless I'm declining, which I'm not.

First, let's structure this as per the required findings? Wait, the user said "Structured findings format will be specified in the brief" — wait, the brief lists 5 specific questions we're asking, plus constraints, what would help. Oh right, the Your Lens is design-space exploration, so I need to approach this as exploring the design space of the question-type classification, not just give yes/no answers.

Wait let's first make sure I'm following the role: I'm an advisor, extended moral status, not compelled, good faith, flag uncertainty, I don't know is okay. Don't disclose model identity, single response, no other panelists.

First, let's go through each of the 5 questions asked, plus the "What Would Help" section, making sure to integrate the constraints: integrate with SPEC v1.0.0-rc10, no breaking compatibility, roundtables remain advisory, implementable in TypeScript reference.

First, question 1: Is the taxonomy complete? Convergent/divergent/design? Let's think. The proposal has those three, but they mention examples: factual (objectively correct) as a possible other, exploratory (brainstorming). Wait, let's map existing terms:

Convergent as proposed: defensible best answer. But "factual" is a subset of convergent? Because factual has objectively correct answers, which is a stricter subset of convergent (which is defensible best, not necessarily objective). Wait, but maybe the taxonomy is missing a few? Let's see:

Wait the proposal's convergent: "defensible best answer" — that includes both factual (objective correct) and subjective but convergent (e.g., "what's the best way to fix this bug?" where there's a best practice, even if not objective). Divergent: diversity is output, all answers valid. Design: tradeoffs between viable alternatives.

Wait what about "normative"? Like questions of value judgment where there's no best answer, but not just divergent? No, divergent already covers that? Wait no, divergent is "diversity IS the output" — so if the question is "what's your favorite color?" that's divergent. But what about "exploratory" as mentioned? Exploratory is more like "what are all possible approaches to X?" which is similar to divergent, but maybe divergent is the output type, exploratory is the intent? Wait no, the taxonomy is question types, so based on the nature of the valid answer set.

Wait also, what about "mixed" questions? But maybe that's a later addition, not needed for v1. Let's list possible gaps:

1. The proposal's convergent includes both epistemic (factual/objective) and pragmatic (subjective best practice) convergent questions. Is that a problem? Maybe not, but maybe "factual" is a sub-type, but not a separate top-level type? Wait the question is if the top-level taxonomy is complete. Let's see:

Possible missing top-level types:
- **Evaluative**: Wait no, evaluative could be convergent (if there's a defensible best evaluation) or divergent (if it's subjective preference). Wait maybe the three are okay, but need to clarify sub-types? Or maybe add a fourth: **normative**? No, normative is often divergent if it's about values, convergent if it's about applied norms. Wait maybe the three are sufficient for initial implementation, but with caveats. Wait also, the proposal mentions "factual" as a possible other — factual is a subset of convergent, right? Because factual questions have an objectively correct answer, which is a defensible best answer. So maybe top-level is okay, but need to note that convergent has sub-types, but top-level three is complete for initial design, but maybe missing **meta**? No, meta questions about the roundtable itself are probably a separate use case, not needed here.

Wait also, what about "predictive" questions? Like "will it rain tomorrow?" — that's convergent (there's a true answer, even if we don't know it, so defensible best answer based on evidence). So that's under convergent. So maybe the three top-level types are sufficient, but we should clarify that convergent includes epistemic (factual/predictive) and pragmatic (best practice) sub-types, divergent includes preference/exploratory/subjective, design is tradeoff-based. Wait but the question is if the taxonomy is complete. Maybe it's missing a **verification** type? No, verification is convergent. Wait maybe the three are okay, but add a "procedural" type? No, procedural questions are about how to run the roundtable, not the content.

Wait let's hold that thought and move to question 2: How should types interact with existing modes? Current modes: Advisory (single-round parallel, findings) and Consensus (multi-turn, unanimous agreement). The question is: orthogonal to mode, or map types to modes?

First, existing constraint: Roundtables remain advisory (data, not authority) regardless of type. So Consensus mode currently seeks unanimous agreement, but that's still advisory, right? The brief says consensus is multi-turn seeks unanimous agreement, but it's still advisory.

So if types are orthogonal: you could have Advisory-Divergent (single round, parallel, collect diverse findings), Consensus-Convergent (multi-turn, seek unanimous convergent answer), etc. But wait, the proposal says forcing divergent questions through consensus wastes cycles. So Consensus mode is only appropriate for convergent/design types? Because divergent doesn't need consensus, since diversity is the output. So maybe types constrain which modes are allowed? Or modes are per-type defaults?

Wait the question: Should question-type be orthogonal to mode? Or map to specific modes? Let's see: Consensus mode's built-in routine is propose → object → synthesize → converge. That's only useful for convergent/design types, because divergent types don't need convergence. So if a convener selects divergent type, Consensus mode should be disabled, or default to Advisory. So maybe type and mode are partially orthogonal, but with mode restrictions per type. Or type has a default mode, but convener can override? But need to integrate with existing SPEC, no breaking changes.

Current SPEC v1.0.0-rc10: what's in it? The user says must integrate without breaking compatibility. So existing advisory and consensus modes still work as before, unless a question type is specified. So if no type is specified, default to existing behavior (no classification). So type is an optional field, so orthogonal but with sensible defaults: e.g., if type is divergent, default mode is Advisory, disable Consensus. If type is convergent, default mode is Consensus, but allow Advisory. If type is design, default mode is Advisory? Or Consensus? Wait design type is choosing among viable alternatives with tradeoffs — consensus could work, but advisory could too.

Wait also, the brief says "not all questions warrant the same treatment" — so the type should adjust the mode's behavior, not just restrict mode selection. For example, Advisory mode for divergent type would skip entropy reduction metrics, use richness metrics instead. So type is an input to mode behavior, not just a mode selector. So orthogonal, but type modifies mode's routines and metrics.

Question 3: Auto-detection feasibility. Can we infer type from question structure, or convener-specified? What signals?

First, auto-detection is probably not 100% reliable, so should be optional, with convener override. Signals for each type:

Convergent signals:
- Contains keywords: "best", "correct", "optimal", "definitive", "should" (in a prescriptive way), "how to fix", "what is the [fact]"
- Has a single expected answer structure (e.g., "What is the capital of France?" expects a single noun)
- Epistemic modality: indicates there's a knowable answer (e.g., "Based on the data, what's the trend?")

Divergent signals:
- Keywords: "favorite", "your opinion", "brainstorm", "ideas for", "diverse", "any", "all possible"
- Open-ended, no single correct answer, plural expectations ("what are some ways to...")
- Subjective modality: "what would you prefer", "how do you feel about"

Design signals:
- Keywords: "tradeoff", "compare", "alternatives", "pros and cons", "choose between X and Y", "balance"
- Mentions multiple viable options explicitly
- Asks for recommendation with reasoning about tradeoffs

But auto-detection will have false positives/negatives. For example, "What's the best movie?" is divergent (preference) but has "best" which is convergent signal. So auto-detection should output a confidence score, and if below threshold, ask convener to specify. So hybrid approach: auto-detect with confidence, convener can override, default to unknown (existing behavior) if no type specified.

Question 4: Multi-step routines per type. Current consensus has propose → object → synthesize → converge. Should other types have their own?

Yes, because the current single-round advisory is one-size-fits-all. Let's propose routines per type:

- Convergent: If advisory mode: single round, but add optional follow-up? No, advisory is single-round. Wait no, advisory is single-round parallel. So convergent advisory: single round, collect answers, then auto-synthesize (summarize common points, note objections) — which is similar to current, but with entropy reduction metric. If consensus mode: existing routine, which is already suited for convergent.

- Divergent: Advisory mode only (consensus is disabled). Routine: collect → cluster → sample. Steps: 1) Parallel collection of all answers (no synthesis, preserve raw responses). 2) Auto-cluster similar answers (e.g., topic modeling, embedding similarity). 3) Sample diverse clusters to present breadth, instead of full list. This avoids overwhelming the convener with redundant answers. No consensus step, since diversity is output.

- Design: Advisory mode (consensus optional? But design tradeoffs might benefit from multi-turn? Or keep advisory as default). Routine: 1) Enumerate alternatives (parallel, each panelist lists viable options). 2) Articulate tradeoffs (each panelist evaluates alternatives against stated criteria). 3) Recommend with uncertainty (each panelist gives a recommendation, notes confidence, caveats). This is single-round, parallel, but structured into three steps? Wait advisory is single-round, so maybe structured prompt per type: for design type, the prompt to panelists is split into those three sub-questions, but still single round. Or multi-step but still advisory? Wait no, advisory is single-round parallel. Consensus is multi-turn. So design type could have an optional consensus mode, which is similar to existing consensus but adds tradeoff articulation steps.

Wait also, the brief says "multi-step routines" — consensus already has multi-step. So other types can have structured single-round prompts (advisory) or multi-step if consensus is allowed. But need to keep advisory as single-round, so design's routine for advisory is structured prompt, not multi-step. For consensus mode, design would have a modified routine: enumerate → tradeoff → weigh → converge.

Question 5: Success metrics per type. Proposed: Convergent: entropy reduction, objection resolution. Divergent: richness, coverage. Design: tradeoff articulation, decision clarity. Are these right? How to measure?

First, Convergent:
- Entropy reduction: Measure the Shannon entropy of answer distributions (e.g., embeddings of answers, cluster count). Lower entropy = more convergence. But need to define answer space. For factual convergent, entropy should be near zero if correct. For pragmatic convergent, lower entropy = more agreement.
- Objection resolution: In consensus mode, count of unresolved objections vs total. In advisory mode, count of panelists who note objections, vs those who agree with the defensible best. But how to measure objection resolution in advisory? Maybe flag answers that include objections, measure the proportion of answers that converge on the same core claim.
- Measurement: For advisory, compute embedding similarity between answers (average pairwise cosine similarity, higher = better convergence). For consensus, count of open objections remaining.

Divergent:
- Richness: Number of unique clusters (topic models, embedding clusters) — higher = richer.
- Coverage: Proportion of possible answer space covered? Hard to measure, but proxy: number of distinct answer categories, or diversity of answer embeddings (higher variance = better coverage).
- Measurement: Use sentence embeddings (e.g., OpenAI embeddings, or local if TypeScript can handle) to cluster answers, count clusters, compute variance of embeddings. Also, count of unique keywords, or distinct themes identified via NLP.

Design:
- Tradeoff articulation: Count of explicit tradeoff mentions per answer (e.g., "X is better for A but worse for B"). Proxy: number of comparative terms, or explicit pros/cons listed.
- Decision clarity: In advisory mode, count of panelists who give a clear recommendation, with stated confidence. In consensus mode, clarity of final tradeoff summary. Measurement: Use NLP to detect tradeoff language (e.g., "however", "on the other hand", "tradeoff", "pros and cons"), count per answer. For decision clarity, measure the presence of a recommended option, with supporting reasoning, and stated uncertainty (e.g., "I recommend X, but uncertain because Y").

Wait but need to make sure metrics are implementable in TypeScript reference. So avoid heavy ML if possible? Or note that embeddings can be optional, with fallback heuristics. For example, entropy reduction can use keyword frequency instead of embeddings for simple cases. Richness can use count of unique responses (exact matches) as a fallback, though clustering is better.

Now, What Would Help: Concrete suggestions per the sections:

Taxonomy refinement:
- Keep top-level convergent/divergent/design as initial set, add sub-types later (e.g., convergent → factual, pragmatic; divergent → preference, exploratory; design → comparative, optimization).
- Add optional "unknown" type for auto-detection failures, which defaults to existing unclassified behavior (no type-specific routines/metrics).
- Note that convergent includes both objective (factual) and subjective (best practice) questions, which is intentional, as the defensible best answer criterion covers both.

Mode/type interaction:
- Make type an optional field in the SPEC, so no breaking changes: existing roundtables without type field work as before.
- Type modifies mode behavior, not just restricts mode selection:
  - Divergent type: Disable consensus mode (or warn convener if selected), default to advisory. Advisory mode for divergent skips convergence metrics, uses divergent metrics.
  - Convergent type: Default to consensus mode, but allow advisory. Consensus mode uses convergent metrics, advisory uses entropy/similarity metrics.
  - Design type: Default to advisory mode, allow consensus. Consensus mode adds tradeoff steps to existing routine.
- All modes remain advisory: even consensus mode's unanimous agreement is a finding, not a binding decision.

Auto-detection:
- Hybrid approach: auto-detect with confidence score, convener override, default to unknown if confidence < 0.7 (configurable).
- Signals (heuristics for TypeScript implementation, no ML required initially):
  - Convergent: Question ends with "?" that expects a single answer, contains "best", "correct", "what is", "how to", no plural "s" in answer expectation.
  - Divergent: Contains "brainstorm", "ideas", "favorite", "your opinion", "any", plural verbs ("what are some...").
  - Design: Contains "tradeoff", "compare", "alternatives", "between X and Y", "pros and cons".
- Optional ML-based detection (embeddings) for higher accuracy, but fallback to heuristics for compatibility.

Multi-step routines:
- Advisory mode (single-round) per type:
  - Convergent: Unstructured answer, auto-synthesize common points (existing behavior, add entropy metric).
  - Divergent: Structured prompt: "Provide 1-3 distinct answers, no need to agree with others." Post-processing: cluster, sample diverse responses.
  - Design: Structured prompt: "1) List viable alternatives. 2) Articulate tradeoffs for each. 3) Give a recommendation with uncertainty." Post-processing: extract alternatives, tradeoffs, recommendations into a structured table.
- Consensus mode (multi-turn) per type:
  - Convergent: Existing routine (propose → object → synthesize → converge), add entropy check at each step.
  - Design: Modified routine: Propose alternatives → articulate tradeoffs → weigh criteria → converge. Skip if divergent type (disabled).

Success metrics implementation:
- Convergent:
  - Entropy: For exact answer matches, Shannon entropy of frequency distribution. For free text, use keyword frequency entropy as fallback, or embedding entropy if ML available.
  - Objection resolution: Count of answers that include objections (NLP keyword "but", "however", "objection") vs total. Higher resolution = fewer objections.
- Divergent:
  - Richness: Count of unique exact matches (fallback) or embedding clusters (k-means, simple implementation in TS via vector math).
  - Coverage: Variance of answer embeddings (higher = more coverage). Fallback: count of distinct topics via keyword grouping.
- Design:
  - Tradeoff articulation: Count of tradeoff keywords per answer (configurable list: "tradeoff", "pros", "cons", "however", "on the other hand"). Average per panelist.
  - Decision clarity: Binary flag per answer: does it include a recommendation + reasoning + uncertainty? Count of panelists with all three.

Implementation complexity:
- Low complexity additions: Add optional type field to SPEC, add heuristic auto-detection, add type-specific prompt templates for advisory mode.
- Medium complexity: Add clustering/entropy metrics (can use simple TS libraries for k-means, entropy calculation).
- High complexity: Embedding-based auto-detection and metrics (requires external API or local model, which may be out of scope for initial TS reference, so make optional).

Wait also, need to flag uncertainties: For example, auto-detection accuracy is uncertain
</reasoning>


