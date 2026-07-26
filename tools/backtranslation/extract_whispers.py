#!/usr/bin/env python3
"""Build a panel spec for the 144 remembering whispers from jk-tarot master.json.

Usage: extract_whispers.py MASTER.json [-o SPEC.json]

Whispers are one-sentence utterances, so this spec differs from the strings one:
- alternates_delimiter null: sentences contain punctuation; column two must hold
  exactly one rendering (compare.py then never splits it)
- bless mode "verdicts": full sentences will not blind-match canon word-for-word,
  so blessing rides on unanimous favorable Part 2 verdicts; blind renderings
  still print as divergence context in the reconcile table
"""
import argparse, json

PURPOSE = """The Cărțile Hoiane is a fictional divination tradition from a lost 1840s Transylvanian principality. Each of its 144 card rememberings carries a whisper (Șoapta): one sentence the Forest speaks through the card, printed bilingually RO/EN. We are validating the Romanian half of every whisper by blind back-translation: you translate our English sentence into Romanian first, and only afterwards see our canon Romanian and assess it."""

REGISTER = """The tradition's Romanian is **rural, liturgical-leaning, mid-19th-century Transylvanian**. Where a modern word and an older/folk/liturgical word both exist, the tradition prefers the older one. Orthography is modern standard Romanian with **comma-below diacritics (ș, ț — never ş, ţ)**.

Whispers are **complete one-sentence utterances**, aphoristic and grave: the Forest addressing the seeker. They are not headlines and not proverbs quoted from elsewhere; they are spoken TO someone. Preserve the sentence shape, person, and tense of the English. In print they are set in „Romanian low-high quotes”; do not include the quote marks in your rendering."""

VERDICT_DEFS = {
    "correct": "idiomatic, grammatical, register-appropriate; a Romanian villager of 1845 could say it",
    "archaic-good": "non-obvious or old-fashioned phrasing that suits the register (name the modern phrasing it beats)",
    "questionable": "defensible but you would phrase it differently (say what and why)",
    "wrong": "grammatical error, wrong sense, false friend, or wrong diacritics (explain)",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("master")
    ap.add_argument("--name", default="hoian-whispers-backtranslation")
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args()

    m = json.load(open(args.master, encoding="utf-8"))
    pairs = []
    for a in sorted(m["archetypes"], key=lambda x: int(x["num"])):
        for r in sorted(a["rememberings"], key=lambda x: int(x["version"])):
            en, ro = r.get("whisper", ""), r.get("whisper_ro", "")
            if not en or not ro:
                continue
            pairs.append({
                "key": f"whisper.{a['num']}-{r['version']}",
                "en": en,
                "ro": ro,
                "context": (f"{r.get('title', '?')} — remembering {r['version']} of "
                            f"{a['name_ro']} ({a['name_en']}), card {a['num']}"),
            })

    spec = {
        "name": args.name,
        "title": "Hoian Whisper Corpus Back-Translation",
        "purpose_md": PURPOSE,
        "register_md": REGISTER,
        "part2_checks_md": "Also check: comma-below diacritics throughout; natural spoken word order (not calqued English order); person and tense faithful to the English.",
        "verdicts": ["correct", "archaic-good", "questionable", "wrong"],
        "verdict_definitions": VERDICT_DEFS,
        "favorable_verdicts": ["correct", "archaic-good"],
        "alternates_delimiter": None,
        "normalize": {"unify_diacritics": True, "strip_final_period": True},
        "bless": {"mode": "verdicts", "max_questionable": 0},
        "pairs": pairs,
    }
    out = args.out or f"{args.name}_SPEC.json"
    json.dump(spec, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"spec written: {out} ({len(pairs)} whisper pairs)")


if __name__ == "__main__":
    main()
