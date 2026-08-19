#!/usr/bin/env python3
"""
check_coach_ranking.py — verifies coaches.json's `rank` field is both a
contiguous 1..N sequence AND actually sorted by `overallScore` descending.

CLAUDE.md's rule (Section 3a Change Type 2, and Section 4): "After any coach
addition or removal, re-rank ALL coaches by overallScore descending. Rank
must be sequential with no gaps." validate_schools.py already catches
DUPLICATE rank values — this script catches the two things it doesn't:

  1. Gaps in the sequence (ranks 1,2,4,5 with no 3 — one coach removed and
     the rest not renumbered).
  2. Rank order that doesn't actually match score order (a coach's
     overallScore was edited but the rank field wasn't updated to match, so
     rank 12 now has a higher overallScore than rank 11).

Ties in overallScore are allowed to appear in either order — CLAUDE.md's rule
is about the score ORDERING, not a strict total order, so this only flags a
genuine INVERSION (a later rank strictly outscoring an earlier one).

USAGE
-----
    python check_coach_ranking.py

Exit code 0 if the rank sequence is contiguous and consistent with score
order, 1 otherwise.
"""

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


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


def main():
    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    path = os.path.join(root, "data", "coaches.json")
    coaches = json.loads(open(path, encoding="utf-8").read())
    n = len(coaches)
    ok = True

    print(f"{n} coaches in coaches.json")

    ranks = [c.get("rank") for c in coaches]
    expected = set(range(1, n + 1))
    actual = set(r for r in ranks if isinstance(r, int))
    missing = sorted(expected - actual)
    unexpected = sorted(r for r in actual - expected)
    if missing:
        print(f"  GAP      rank(s) missing from the sequence: {missing}")
        ok = False
    if unexpected:
        print(f"  BAD      rank value(s) outside the valid 1..{n} range: {unexpected}")
        ok = False
    non_int = [c.get("id") for c in coaches if not isinstance(c.get("rank"), int)]
    if non_int:
        print(f"  BAD      coach(es) with a non-integer or missing rank: {non_int}")
        ok = False

    by_rank = sorted((c for c in coaches if isinstance(c.get("rank"), int)),
                      key=lambda c: c["rank"])
    inversions = 0
    for a, b in zip(by_rank, by_rank[1:]):
        sa, sb = a.get("overallScore"), b.get("overallScore")
        if sa is None or sb is None:
            continue
        if sb > sa:
            print(f"  INVERT   rank {a['rank']} {a.get('id')!r} (score {sa}) is ranked "
                  f"above rank {b['rank']} {b.get('id')!r} (score {sb}) — re-rank needed")
            inversions += 1
            ok = False
    if inversions == 0 and not missing and not unexpected and not non_int:
        print("  ok       rank sequence is contiguous and matches overallScore order")

    print()
    if ok:
        print("PASS — coach ranking is consistent.")
        return 0
    print("FAIL — re-rank ALL coaches by overallScore descending (CLAUDE.md "
          "Section 3a Change Type 2), then re-run this check.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
