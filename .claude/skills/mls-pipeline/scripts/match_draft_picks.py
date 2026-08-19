#!/usr/bin/env python3
"""
match_draft_picks.py — cross-references this year's MLS SuperDraft picks
against every name this guide can still see, to catch the exact problem
CLAUDE.md Section 5b names as its canonical example: Edouard Nys played two
seasons at Northeast CC, transferred to UIC, led the NCAA in goals/game, and
was drafted 2nd round out of UIC — so Northeast CC's stored `mlsPicks5yr`
stays a correct-but-misleading 0, and the real credit silently vanishes,
because the player was gone from Northeast CC's roster long before anyone
checked where he ended up.

WHAT "EVERY NAME THIS GUIDE CAN STILL SEE" ACTUALLY MEANS — A REAL LIMIT,
NOT A DESIGN CHOICE
----------------------------------------------------------------------------
This repo does NOT keep a persistent all-time roster archive. Confirmed
while building `roster-refresh`: minutesOutlook's name arrays get
OVERWRITTEN every refresh cycle — the old names are gone from the live JSON
the moment a new season's roster is applied (recoverable only via git
history, and only if you know which commit to look at). So this script can
only search two real sources:

  1. The CURRENT snapshot — all 170 schools' current cleared/rising_sr/
     rising_jr name lists (same index as transfer-tracking's duplicate
     scanner).
  2. roster_moves_queue.json — the departure queue `roster-refresh` writes
     and `transfer-tracking` works through. Kept here as an APPEND-ONLY
     log (never delete entries, even resolved ones) is what makes this
     script useful at all beyond the current season — it's the closest
     thing this repo has to roster history.

A drafted player who passed through a tracked school years before this
tooling existed, or who left without ever being caught by a departure
detection pass, is genuinely invisible to this script. That's an honest
gap, not a bug — flagging it here so it isn't assumed away.

USAGE
-----
Write this year's draft results to a small JSON file (Tier-1 sourced from
the official MLS SuperDraft results page, per CLAUDE.md Section 15 — this
script does not fetch anything itself):

    [
      {"name": "Edouard Nys", "pick": "R2 #40", "team": "FC Dallas", "drafted_from": "UIC"},
      ...
    ]

    python match_draft_picks.py --picks picks.json

Exit code is always 0 — report only, nothing is written to pipeline.json or
any school's data. Filing a confirmed match is Change Type 7 (CLAUDE.md
Section 3a) — a normal, judgment-driven data edit, including the JUCO/NCAA
category rule that section states explicitly: an NJCAA title or ranking
never belongs in the ranked ncaaD1[]/ncaaD2[] medal tables, only in the
unranked JUCO section at the bottom.
"""

import argparse
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CONF_FILES = [
    "data/acc.json", "data/big-ten.json", "data/big-east.json", "data/aac.json",
    "data/big-west.json", "data/caa.json", "data/d1-other.json", "data/juco.json",
    "data/ivy.json", "data/d2.json",
]
NAME_KEYS = ("cleared_names", "rising_senior_2027_names", "rising_junior_2027_names")
ANNOTATION_RE = re.compile(r"\s*\(.*$")


def find_repo_root():
    d = os.getcwd()
    for _ in range(6):
        if os.path.exists(os.path.join(d, "validate_schools.py")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None


def normalize(name):
    return ANNOTATION_RE.sub("", name).strip().lower()


def build_snapshot_index(root):
    index = {}
    for rel in CONF_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        for s in json.loads(open(path, encoding="utf-8").read()):
            mo = s.get("minutesOutlook") or {}
            if not mo.get("available"):
                continue
            for key in NAME_KEYS:
                for raw in (mo.get(key) or []):
                    index.setdefault(normalize(raw), []).append(
                        ("current roster", s["id"], rel, key))
    return index


def build_queue_index(root):
    path = os.path.join(root, "roster_moves_queue.json")
    if not os.path.exists(path):
        return {}
    queue = json.loads(open(path, encoding="utf-8").read())
    index = {}
    for e in queue:
        index.setdefault(normalize(e["name"]), []).append(
            ("departure queue", e["origin_school_id"], e.get("origin_file", ""),
             e.get("status", "pending")))
    return index


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--picks", required=True, help="path to this year's draft-picks JSON")
    args = ap.parse_args()

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    picks = json.loads(open(args.picks, encoding="utf-8").read())
    snapshot_idx = build_snapshot_index(root)
    queue_idx = build_queue_index(root)

    print(f"checking {len(picks)} draft pick(s) against the current roster snapshot "
          f"and the departure queue\n")

    any_hit = False
    for p in picks:
        name = p.get("name", "")
        norm = normalize(name)
        hits = snapshot_idx.get(norm, []) + queue_idx.get(norm, [])
        drafted_from = p.get("drafted_from", "?")
        pick = p.get("pick", "?")
        if hits:
            any_hit = True
            print(f"  MATCH  {name}  ({pick}, drafted from {drafted_from})")
            for source, sid, ref, extra in hits:
                print(f"           {source}: {sid}  ({ref}"
                      f"{', status=' + extra if source == 'departure queue' else ''})")
            print(f"           -> verify this is the same person (Tier-1: check the "
                  f"guide school's own roster archive / the player's bio) before filing "
                  f"anything in pipeline.json")
        else:
            print(f"  --     {name}  ({pick}, drafted from {drafted_from}) — no match in "
                  f"current snapshot or departure queue")

    print()
    if not any_hit:
        print("No matches found. Given the real coverage limit described in this "
              "script's own docstring, that's evidence of absence only within what "
              "this repo can currently see — not proof no guide-tracked player was "
              "drafted this year.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
