#!/usr/bin/env python3
"""Generate a two-part blind/reveal back-translation brief from a panel spec.

Usage: brief_gen.py SPEC.json [-o BRIEF.md]

Part 1 shows EN + usage context only (blind translation); Part 2 reveals canon
RO for verdicts. The table shapes are load-bearing: compare.py distinguishes
Part 1 rows from Part 2 rows by whether column 2 is a verdict word.
"""
import argparse, json, sys


def esc(s):
    return str(s).replace("|", "\\|").replace("\n", " ").strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("-o", "--out", default=None)
    args = ap.parse_args()
    spec = json.load(open(args.spec, encoding="utf-8"))

    verdicts = spec.get("verdicts", ["correct", "archaic-good", "questionable", "wrong"])
    verdict_defs = spec.get("verdict_definitions", {})
    alt_delim = spec.get("alternates_delimiter", ";")
    if alt_delim:
        alt_note = ("If you are genuinely torn between two renderings, give both "
                    f"(primary first, alternate after a semicolon).")
    else:
        alt_note = ("Column two must hold exactly ONE rendering — never use "
                    "semicolons to pack alternates there. If torn, put the "
                    "alternate in the third column.")

    L = []
    L.append(f"# {spec['title']} — Round 1\n")
    L.append("## Round Type")
    L.append(spec.get("round_type", "initial (advisory; localization QA)") + "\n")
    L.append("## Purpose")
    L.append(spec["purpose_md"].strip() + "\n")
    L.append("**Complete Part 1 before reading Part 2.** If seeing Part 2 changes a Part 1 answer, say so explicitly.\n")
    L.append("## Register (critical — read before translating)")
    L.append(spec["register_md"].strip() + "\n")
    L.append("## Part 1 — Blind translation")
    L.append(f"For each row: give your best Romanian rendering of the English, in the register above, informed by the usage context. {alt_note} Output as a markdown table with EXACTLY these columns:\n")
    L.append("| key | your_ro | alternate_or_note |\n")
    L.append("Input table:\n")
    L.append("| key | en | usage context |")
    L.append("|-----|----|---------------|")
    for p in spec["pairs"]:
        L.append(f"| {p['key']} | {esc(p['en'])} | {esc(p.get('context', ''))} |")
    L.append("")
    L.append("## Part 2 — Review of canon Romanian (only after Part 1 is complete)")
    L.append("Below are our canon Romanian values for the same keys. For each, give a verdict in a markdown table with EXACTLY these columns:\n")
    L.append("| key | verdict | reason_if_not_correct |\n")
    L.append("Verdict vocabulary:")
    for v in verdicts:
        d = verdict_defs.get(v, "")
        L.append(f"- **{v}**{' — ' + d if d else ''}")
    L.append("")
    if spec.get("part2_checks_md"):
        L.append(spec["part2_checks_md"].strip() + "\n")
    L.append("| key | en | canon_ro |")
    L.append("|-----|----|----------|")
    for p in spec["pairs"]:
        L.append(f"| {p['key']} | {esc(p['en'])} | {esc(p['ro'])} |")
    L.append("")
    L.append("## Output format (mandatory)")
    L.append("Your ENTIRE response must be exactly two markdown tables: the Part 1 table "
             "(`| key | your_ro | alternate_or_note |`) followed by the Part 2 table "
             "(`| key | verdict | reason_if_not_correct |`), one row per key, every key "
             "present in both. No prose commentary before, between, after, or instead of "
             "the tables — reasoning belongs in the third column, briefly. Responses in "
             "any other shape cannot be parsed and are discarded.\n")

    text = "\n".join(L)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text)
        print(f"brief written: {args.out} ({len(spec['pairs'])} pairs, {len(text)} bytes)")
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
