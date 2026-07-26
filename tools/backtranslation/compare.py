#!/usr/bin/env python3
"""Back-translation panel comparator: bless canon pairs, table the rest.

Usage: compare.py SPEC.json 'MANIFESTS_GLOB' [-o REPORT]

Promoted from the S136 ad-hoc comparator (workshop#42). Two blessing modes:
  blind-match  — bless when every panelist's blind Part 1 rendering matches canon
                 and no Part 2 verdict is 'wrong' (the S136 rule; right for short
                 display strings that CAN match word-for-word)
  verdicts     — bless when every panelist's Part 2 verdict is favorable and
                 questionable-count <= max_questionable (right for sentence
                 corpora, where word-for-word blind matches are unrealistic;
                 blind renderings still print as divergence context)

Regression: reviews/hoian-strings-backtranslation/*-ROUND_1.md against the spec
built from fixtures-s136-strings.json must yield BLESSED 26 / RECONCILE 15.
"""
import argparse, glob, json, re, sys


def load_spec(path):
    spec = json.load(open(path, encoding="utf-8"))
    spec.setdefault("verdicts", ["correct", "archaic-good", "questionable", "wrong"])
    spec.setdefault("favorable_verdicts", ["correct", "archaic-good"])
    spec.setdefault("normalize", {})
    spec.setdefault("bless", {"mode": "blind-match"})
    spec.setdefault("alternates_delimiter", ";")
    return spec


def make_norm(cfg):
    def norm(s):
        s = s.strip().strip("*_`„”\"'").strip()
        if cfg.get("unify_diacritics", True):
            s = (s.replace("ş", "ș").replace("ţ", "ț")
                   .replace("Ş", "Ș").replace("Ţ", "Ț"))
        s = re.sub(r"\s+", " ", s)
        s = s.casefold()
        if cfg.get("strip_final_period", True):
            s = s.rstrip(".")
        return s
    return norm


def parse_tables(text, canon_keys, verdict_words):
    """Return (part1: key->(primary, full_cell), part2: key->(verdict, reason))."""
    p1, p2 = {}, {}
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        key = cells[0].strip("` ")
        if key not in canon_keys:
            continue
        v = cells[1].strip("* ").casefold()
        if v in verdict_words:
            p2[key] = (v, cells[2] if len(cells) > 2 else "")
        else:
            p1.setdefault(key, (cells[1],
                                cells[1] + (" | " + cells[2] if len(cells) > 2 and cells[2] else "")))
    return p1, p2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("manifests_glob")
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args()

    spec = load_spec(args.spec)
    norm = make_norm(spec["normalize"])
    canon = {p["key"]: p for p in spec["pairs"]}
    verdict_words = [v.casefold() for v in spec["verdicts"]]
    favorable = {v.casefold() for v in spec["favorable_verdicts"]}
    alt_delim = spec["alternates_delimiter"]

    out = open(args.out, "w", encoding="utf-8") if args.out else sys.stdout
    def w(line=""):
        print(line, file=out)

    reviews = {}
    for f in sorted(glob.glob(args.manifests_glob)):
        name = re.sub(r"-ROUND_\d+\.md$", "", f.split("/")[-1])
        text = open(f, encoding="utf-8").read()
        text = re.sub(r"<reasoning>.*?</reasoning>", "", text, flags=re.S)
        reviews[name] = parse_tables(text, canon, verdict_words)
    if not reviews:
        sys.exit(f"no manifests matched {args.manifests_glob!r}")

    names = list(reviews)
    w(f"panelists parsed: {names}")
    for n in names:
        w(f"  {n}: part1={len(reviews[n][0])} keys, part2={len(reviews[n][1])} keys")

    blessed, reconcile = [], []
    for key, pair in canon.items():
        if not any(key in reviews[n][0] or key in reviews[n][1] for n in names):
            continue  # pair added to the source after the panel ran
        en, ro = pair["en"], pair["ro"]
        row = {"key": key, "en": en, "ro": ro, "translations": {}, "verdicts": {}}
        exact = 0
        for n in names:
            p1, p2 = reviews[n]
            if key in p1:
                prim, full = p1[key]
                if alt_delim:
                    prim = prim.split(alt_delim)[0]
                row["translations"][n] = full
                if norm(prim) == norm(ro):
                    exact += 1
                elif alt_delim and any(norm(alt) == norm(ro)
                                       for alt in re.split(r"[;/]| or ", full)):
                    exact += 0.5
            if key in p2:
                row["verdicts"][n] = p2[key]
        row["exact"] = exact
        wrongs = [n for n, (v, _) in row["verdicts"].items() if v == "wrong"]
        questionables = [n for n, (v, _) in row["verdicts"].items() if v not in favorable and v != "wrong"]

        mode = spec["bless"]["mode"]
        if mode == "blind-match":
            ok = exact >= len(names) and not wrongs
        elif mode == "verdicts":
            maxq = spec["bless"].get("max_questionable", 0)
            ok = (not wrongs and len(questionables) <= maxq
                  and len(row["verdicts"]) == len(names))
        else:
            sys.exit(f"unknown bless mode {mode!r}")
        if ok:
            blessed.append(row)
        else:
            row["wrongs"] = wrongs
            row["questionables"] = questionables
            reconcile.append(row)

    label = ("all blind-matched, no wrong verdicts" if spec["bless"]["mode"] == "blind-match"
             else "all verdicts favorable")
    w(f"\nBLESSED ({label}): {len(blessed)}")
    for r in blessed:
        w(f"  ✓ {r['key']}: {r['ro']}")
    w(f"\nRECONCILE: {len(reconcile)}")
    for r in sorted(reconcile, key=lambda x: x["exact"]):
        w(f"\n— {r['key']} [{r['en']!r} → canon {r['ro']!r}] blind-match {r['exact']}/{len(names)}")
        for n in names:
            t = r["translations"].get(n, "(no parse)")
            v = r["verdicts"].get(n, ("(none)", ""))
            w(f"    {n}: {t}   || verdict: {v[0]} {v[1][:80]}")
    if args.out:
        out.close()


if __name__ == "__main__":
    main()
