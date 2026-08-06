#!/usr/bin/env python3
"""
sweep.py — prove a claim is or is not present, everywhere, with every hit attributed.

WHY THIS EXISTS
---------------
Three consecutive sessions closed a copy/data item on a count that turned out to be
a LOWER BOUND, because the search that produced it was truncated, or used one
phrasing, or never covered data/ at all:

    v44.47  Keiser "Fort Lauderdale"      note said 2   ->  actually 8
    v44.48  NAIA "no scholarship cap"     note said 1   ->  actually 8
    v44.49  D1 "9.9 equivalencies"        brief said 2  ->  actually 29

The failure mode is nasty because a truncated search read as exhaustive looks
IDENTICAL to a clean result. There is no error, no warning — just fewer rows.

The walker that finally got v44.47 and v44.49 right was hand-written and thrown
away both times. This is that walker, committed, so "sweep exhaustively" stops
being a virtue you have to remember and becomes a command whose output you paste.

WHAT IT DOES DIFFERENTLY FROM grep
-----------------------------------
1. NEVER truncates. There is no --limit and no head. Closure requires all rows.
2. ATTRIBUTES every hit in data/ + athletes/ to its owning record and JSON path
   (`d2.json  ocu  fin.internationalNote`), so 39 hits become 39 individual
   judgements instead of a skim. That attribution is what separated the 5 genuine
   Keiser errors from ~30 legitimate mentions of Fort Lauderdale.
3. TAKES SEVERAL PATTERNS AT ONCE and counts each, because a factual error is a
   CLAIM and a claim has many phrasings. v44.48 needed three patterns to find all
   eight strings; one untruncated regex would still have left three live.
4. CASE-INSENSITIVE BY DEFAULT (-s to opt out). v44.50's bug was a case-sensitive
   `.split('Up to')` missing `"up to"`, and a case-sensitive sweep has the same
   shape of blind spot.
5. SPLITS VISIBLE from STORED. A string in conferences.json's `scholarships` reaches
   no renderer; one in conf-prestige.json does. Both matter, differently.

WATCH YOUR OWN PATTERN FOR SUBSTRING COLLISIONS
------------------------------------------------
The attribution exists so you judge each row rather than trusting the count, and the
first real run of this script proved why. Sweeping `no cap|uncapped` for leftover
"NAIA has no scholarship cap" claims returned 2 hits — both in murray_state_ok, and
both nonsense: "no cap" matched **"no capacity"** and "uncapped" matched
**"uncapacitied"**, in a stadium description. Zero real hits; the v44.48 fix held.

Same class as v44.45's `"sun conference"` matching inside `"asun conference"` and
filing a D1 school under an NAIA chip. A count alone would have sent someone hunting
two scholarship errors that do not exist — or worse, "fixing" them. Read the rows.

USAGE
-----
    python sweep.py "9\\.9" "equivalenc" "roster cap|28[- ]player"
    python sweep.py -s "Up to"                 # case-sensitive
    python sweep.py --docs "House settlement"  # include CLAUDE.md / CHANGELOG.md / README.md
    python sweep.py --json "Fort Lauderdale"   # machine-readable

Exit code is 0 when at least one pattern matched nothing (worth knowing), 0
otherwise too — this is a reporting tool, not a gate. Read the numbers.
"""

import argparse
import glob
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))

# Structured sources: walked key-by-key so every hit carries its owning record.
STRUCTURED = sorted(glob.glob(os.path.join(ROOT, "data", "*.json"))) + sorted(
    glob.glob(os.path.join(ROOT, "athletes", "*.json"))
)
# Line-based sources: code and markup.
LINEBASED = [
    os.path.join(ROOT, "index.html"),
    *sorted(glob.glob(os.path.join(ROOT, "js", "*.js"))),
]
# Docs are excluded by default: they legitimately quote past bugs, so they inflate
# every count and bury the live strings. --docs includes them.
DOCS = [
    os.path.join(ROOT, "CLAUDE.md"),
    os.path.join(ROOT, "CHANGELOG.md"),
    os.path.join(ROOT, "README.md"),
]

# Keys used to name the record a hit belongs to, in preference order.
OWNER_KEYS = ("id", "abbr", "schoolId", "name", "school")


def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")


def walk_strings(node, path="", owner=None):
    """Yield (json_path, owning_record_name, string) for every string in a JSON tree."""
    if isinstance(node, dict):
        # The nearest ancestor dict that names itself owns everything beneath it.
        for k in OWNER_KEYS:
            v = node.get(k)
            if isinstance(v, str) and v.strip():
                owner = v
                break
        for k, v in node.items():
            yield from walk_strings(v, f"{path}.{k}" if path else k, owner)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_strings(v, f"{path}[{i}]", owner)
    elif isinstance(node, str):
        yield path, owner, node


def collect(patterns, flags, include_docs):
    """Return {pattern: [hit, ...]} plus the set of unique (file, locator) hit keys."""
    compiled = [(p, re.compile(p, flags)) for p in patterns]
    results = {p: [] for p in patterns}
    unique = {p: set() for p in patterns}

    for f in STRUCTURED:
        try:
            data = json.load(open(f, encoding="utf-8"))
        except Exception as e:  # a malformed file must be loud, not skipped
            print(f"  !! could not parse {rel(f)}: {e}")
            continue
        for jpath, owner, s in walk_strings(data):
            for p, rx in compiled:
                if rx.search(s):
                    results[p].append(
                        dict(file=rel(f), owner=owner or "-", locator=jpath,
                             text=s, kind="data")
                    )
                    unique[p].add((rel(f), jpath))

    for f in LINEBASED + (DOCS if include_docs else []):
        if not os.path.exists(f):
            continue
        for n, line in enumerate(open(f, encoding="utf-8", errors="replace"), 1):
            for p, rx in compiled:
                if rx.search(line):
                    results[p].append(
                        dict(file=rel(f), owner="-", locator=f"line {n}",
                             text=line.strip(), kind="code")
                    )
                    unique[p].add((rel(f), f"line {n}"))

    return results, unique


def main():
    ap = argparse.ArgumentParser(
        description="Attribute every occurrence of one or more patterns across the repo. Never truncates.",
        epilog="Give 2-3 phrasings of the same claim. One regex read as exhaustive is how three sessions undercounted.",
    )
    ap.add_argument("patterns", nargs="+", help="one or more regexes (try several phrasings of the same claim)")
    ap.add_argument("-s", "--case-sensitive", action="store_true", help="default is case-insensitive")
    ap.add_argument("--docs", action="store_true", help="also sweep CLAUDE.md / CHANGELOG.md / README.md")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--width", type=int, default=150, help="context truncation width for display only (default 150)")
    args = ap.parse_args()

    flags = 0 if args.case_sensitive else re.IGNORECASE
    results, unique = collect(args.patterns, flags, args.docs)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
        return 0

    scope = f"{len(STRUCTURED)} structured + {len(LINEBASED)} code" + (f" + {len(DOCS)} doc" if args.docs else "")
    print(f"sweep.py — {scope} files · {'case-sensitive' if args.case_sensitive else 'case-insensitive'}"
          + ("" if args.docs else " · docs EXCLUDED (--docs to include)"))

    for p in args.patterns:
        hits = results[p]
        print(f"\n{'='*100}\n  /{p}/  —  {len(hits)} hit(s)\n{'='*100}")
        if not hits:
            print("  (none)")
            continue
        # Data hits first, grouped by file, so a reviewer judges one file at a time.
        for kind in ("data", "code"):
            group = [h for h in hits if h["kind"] == kind]
            if not group:
                continue
            print(f"\n  -- {kind} --")
            last = None
            for h in group:
                if h["file"] != last:
                    print(f"\n  {h['file']}")
                    last = h["file"]
                txt = h["text"][: args.width] + ("…" if len(h["text"]) > args.width else "")
                if kind == "data":
                    print(f"    [{h['owner']}] {h['locator']}\n        {txt}")
                else:
                    print(f"    {h['locator']}\n        {txt}")

    print(f"\n{'='*100}\n  SUMMARY — judge every row above; do not close an item on a subset\n{'='*100}")
    for p in args.patterns:
        files = len({h["file"] for h in results[p]})
        print(f"  {len(results[p]):5}  hits in {files:2} file(s)   /{p}/")
    allkeys = set().union(*unique.values()) if unique else set()
    print(f"  {len(allkeys):5}  UNIQUE locations across all {len(args.patterns)} pattern(s)")
    empty = [p for p in args.patterns if not results[p]]
    if empty:
        print(f"\n  NOTE: {len(empty)} pattern(s) matched nothing — confirm that is real and not a bad regex:")
        for p in empty:
            print(f"         /{p}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
