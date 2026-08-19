#!/usr/bin/env python3
"""
process_moves_queue.py — works through roster_moves_queue.json (produced by
the companion `roster-refresh` skill's refresh_school.py) and sorts each
pending departure into one of two piles: found elsewhere in the guide right
now (cheap to confirm), or not found (needs the Section 5b external research
process).

WHAT COUNTS AS "FOUND"
------------------------
Same normalisation and the same caveat as scan_duplicate_names.py: a name
match is a SIGNAL, not proof. This script does not write any confirmation on
its own — it surfaces candidates for you to verify (hometown/high-school
cross-check on the two schools' own roster pages, the same discipline
Section 5b already applies to alumni-page destinations) before marking
anything resolved.

WHAT THIS SCRIPT DELIBERATELY DOES NOT DO
--------------------------------------------
It never writes to proPlayers.nextLevel, or to any rendered field. Deciding
whether a confirmed JUCO->D1 move should move the origin school's `perYear`
figure is a judgment call with real precedent to weigh — CLAUDE.md Section
5b's own "one confirmed hit != a measured rate" rule (fold a single hit into
notable[]/draftRank as color, leave perYear alone) versus the Phoenix College
precedent (multiple confirmed hits across two tracker years CAN become a
real measured rate, but always excluded from the divisor). That decision
needs the same rigor as the original nextLevel research, not an automated
guess. This script's job ends at "here's a confirmed departure and where the
player went" — filing it into the school's data is a `roster-refresh`-style
manual edit afterward.

USAGE
-----
    python process_moves_queue.py                        # report only
    python process_moves_queue.py --mark "Zach Neuls" --status resolved-in-guide --note "confirmed at usc, cleared_names"
    python process_moves_queue.py --mark "Zach Neuls" --status resolved-external --note "TopDrawerSoccer 2027, confirmed on destination roster"

Exit code is always 0 in report mode — this is a worklist, not a gate.
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
    return ANNOTATION_RE.sub("", name).strip()


def build_index(root):
    index = {}  # normalized name -> [(school_id, file, bucket), ...]
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
                    index.setdefault(normalize(raw), []).append((s["id"], rel, key))
    return index


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--queue-file", default=None)
    ap.add_argument("--mark", help="exact name to update the status of")
    ap.add_argument("--status", help="new status value, used with --mark")
    ap.add_argument("--note", default="", help="optional note, used with --mark")
    args = ap.parse_args()

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    queue_path = args.queue_file or os.path.join(root, "roster_moves_queue.json")
    if not os.path.exists(queue_path):
        print(f"No queue file at {queue_path} — nothing to process. "
              f"(This file is only created once refresh_school.py detects a "
              f"real unexpected departure.)")
        return 0
    queue = json.loads(open(queue_path, encoding="utf-8").read())

    if args.mark:
        if not args.status:
            print("--mark requires --status")
            return 2
        hit = False
        for e in queue:
            if e["name"] == args.mark and e.get("status") == "pending":
                e["status"] = args.status
                if args.note:
                    e["note"] = args.note
                hit = True
        if not hit:
            print(f"No pending queue entry named {args.mark!r} found.")
            return 1
        open(queue_path, "w", encoding="utf-8", newline="\n").write(
            json.dumps(queue, indent=2, ensure_ascii=False) + "\n")
        print(f"Updated {args.mark!r} -> status={args.status!r}.")
        return 0

    pending = [e for e in queue if e.get("status") == "pending"]
    print(f"{len(queue)} total queue entries, {len(pending)} pending\n")
    if not pending:
        print("Nothing pending.")
        return 0

    index = build_index(root)
    found, not_found = [], []
    for e in pending:
        norm = normalize(e["name"])
        matches = [m for m in index.get(norm, []) if m[0] != e["origin_school_id"]]
        (found if matches else not_found).append((e, matches))

    if found:
        print(f"FOUND ELSEWHERE IN THE GUIDE ({len(found)}) — verify before marking resolved:\n")
        for e, matches in found:
            print(f"  {e['name']!r}  (left {e['origin_school_id']} as of "
                  f"{e['absent_as_of_roster_season']})")
            for sid, rel, key in matches:
                print(f"    -> candidate: {rel} {sid} ({key})")
            print(f"    once verified: python process_moves_queue.py --mark {e['name']!r} "
                  f"--status resolved-in-guide --note \"...\"")
        print()

    if not_found:
        print(f"NOT FOUND IN-GUIDE ({len(not_found)}) — needs Section 5b's external research "
              f"(TopDrawerSoccer-style discovery, confirm on the destination's own roster, "
              f"check division against the NCAA directory):\n")
        for e, _ in not_found:
            print(f"  {e['name']!r}  (left {e['origin_school_id']} as of "
                  f"{e['absent_as_of_roster_season']})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
