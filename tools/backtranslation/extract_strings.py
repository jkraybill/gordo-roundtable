#!/usr/bin/env python3
"""Build a panel spec from a jk-tarot strings.json (flat section.key bilingual source).

Usage: extract_strings.py STRINGS.json [--contexts CONTEXTS.json] [-o SPEC.json]

With --contexts fixtures-s136-contexts.json and the era-faithful
fixtures-s136-strings.json snapshot, the resulting spec + archived manifests
reproduce the S136 result (regression: BLESSED 26 / RECONCILE 15).
"""
import argparse, json, sys

PURPOSE = """The Cărțile Hoiane is a fictional divination tradition from a lost 1840s Transylvanian principality. Its book and guidebook render bilingual RO/EN string pairs from a single source file. We are validating the Romanian half of every pair by blind back-translation: you translate our English into Romanian first, and only afterwards see our canon Romanian and assess it."""

REGISTER = """The tradition's Romanian is **rural, liturgical-leaning, mid-19th-century Transylvanian**. Where a modern word and an older/folk/liturgical word both exist, the tradition prefers the older one. Orthography is modern standard Romanian with **comma-below diacritics (ș, ț — never ş, ţ)**. Titles use Romanian title conventions. These are display strings for a printed book: concise noun phrases, not sentences (except where context says otherwise)."""

VERDICT_DEFS = {
    "correct": "idiomatic, grammatical, register-appropriate",
    "archaic-good": "non-obvious or old-fashioned choice that suits the 1840s register (name the modern alternative it beats)",
    "questionable": "defensible but you would choose differently (say what and why)",
    "wrong": "grammatical error, wrong sense, or wrong diacritics (explain)",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("strings")
    ap.add_argument("--contexts", default=None)
    ap.add_argument("--name", default="hoian-strings-backtranslation")
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args()

    S = json.load(open(args.strings, encoding="utf-8"))
    ctx = json.load(open(args.contexts, encoding="utf-8")) if args.contexts else {}
    pairs, missing = [], []
    for section, entries in S.items():
        if section == "_meta":
            continue
        for key, v in entries.items():
            if isinstance(v, dict) and "en" in v and "ro" in v:
                k = f"{section}.{key}"
                if k not in ctx:
                    missing.append(k)
                pairs.append({"key": k, "en": v["en"], "ro": v["ro"],
                              "context": ctx.get(k, f"Display string ({section})")})
    if missing:
        print(f"note: {len(missing)} key(s) had no context (fallback used): {missing}",
              file=sys.stderr)

    spec = {
        "name": args.name,
        "title": "Hoian String Source Back-Translation",
        "purpose_md": PURPOSE,
        "register_md": REGISTER,
        "part2_checks_md": "Also check: comma-below diacritics throughout; genitive/article forms in titles; capitalization consistency.",
        "verdicts": ["correct", "archaic-good", "questionable", "wrong"],
        "verdict_definitions": VERDICT_DEFS,
        "favorable_verdicts": ["correct", "archaic-good"],
        "alternates_delimiter": ";",
        "normalize": {"unify_diacritics": True, "strip_final_period": True},
        "bless": {"mode": "blind-match"},
        "pairs": pairs,
    }
    out = args.out or f"{args.name}_SPEC.json"
    json.dump(spec, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"spec written: {out} ({len(pairs)} pairs)")


if __name__ == "__main__":
    main()
