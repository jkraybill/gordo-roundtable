# Back-Translation Panel Tools

Reusable harness for bilingual string validation by blind back-translation
(workshop#42; promoted from the S136 ad-hoc scripts that ran the
hoian-strings panel: 26/41 blessed, $0.50, one evening → now ~an hour).

## Flow

```
extractor (corpus-specific)          brief_gen.py               panel run            compare.py
STRINGS/MASTER.json ──► SPEC.json ──► REVIEW_BRIEF.md ──► reviews/<name>/*-ROUND_1.md ──► report
```

1. **Extract** a panel spec from a corpus:
   - `extract_strings.py STRINGS.json --contexts CTX.json -o SPEC.json` — jk-tarot
     strings.json (flat section.key display strings; blind-match blessing)
   - `extract_whispers.py MASTER.json -o SPEC.json` — the 144 remembering whispers
     (sentence corpus; verdict blessing, no inline alternates)
2. **Generate the brief**: `brief_gen.py SPEC.json -o briefs/<name>_REVIEW_BRIEF.md`
3. **Run the panel** with the normal roundtable machinery (roundtable.yaml naming
   the reviewers; manifests land in `reviews/<name>/`).
4. **Compare**: `compare.py SPEC.json 'reviews/<name>/*-ROUND_1.md' [-o report]`
   → BLESSED list + RECONCILE table (divergences with per-panelist verdicts,
   sorted by blind-match score) for a JK decision queue.

## Spec knobs

- `bless.mode`: `blind-match` (every panelist's blind rendering equals canon, no
  wrong verdicts — right for short display strings) or `verdicts` (every Part 2
  verdict favorable, `max_questionable` allowed — right for sentences, which
  never blind-match word-for-word).
- `alternates_delimiter`: `";"` lets Part 1 pack a primary + alternate in one
  cell (0.5 credit for alternate matches); `null` forbids it — REQUIRED for
  sentence corpora, whose text contains semicolons.
- `normalize`: `unify_diacritics` (ş/ţ → ș/ț), `strip_final_period`.
- Table shapes are load-bearing: compare.py tells Part 1 rows from Part 2 rows
  by whether column 2 is a verdict word. Do not restyle the brief's columns.

## Regression (run after any edit to compare.py or extract_strings.py)

```
python3 extract_strings.py fixtures-s136-strings.json \
    --contexts fixtures-s136-contexts.json -o /tmp/s136_spec.json
python3 compare.py /tmp/s136_spec.json \
    '~/gordo-roundtable/reviews/hoian-strings-backtranslation/*-ROUND_1.md'
```

Must print exactly **BLESSED: 26 / RECONCILE: 15** (all four panelists 41/41).
The fixtures are era-faithful: `fixtures-s136-strings.json` is strings.json at
jk-tarot `3be691c` (S136 EOS) — current canon scores 24/17 against the same
manifests (S137 rulings moved words), which doubles as the instrument's red
test: if a canon change does NOT move the counts, the comparator is broken.

*Provenance: S136 panel archive at
`~/jk-tarot/archive/roundtable-panels/hoian-strings-backtranslation/`.*
