#!/usr/bin/env python3
"""
scan_duplicate_names.py — finds the same midfielder name appearing on TWO
different schools' CURRENT rosters across the whole guide. Cheap, and
doesn't need any roster history: a name occurring twice in the same
post-refresh snapshot is either a real in-guide transfer, one school's page
being stale about someone who already left, or (very possible at ~1,700+
tracked names) two different people who happen to share a name.

WHY A SNAPSHOT SCAN, NOT A DIFF
--------------------------------
The companion `roster-refresh` skill already diffs OLD vs NEW rosters AT ONE
SCHOOL to catch a departure. This script catches the complementary, cheaper
case: a departure AND an arrival both already visible in the CURRENT data,
without needing any history at all. It only works, though, once BOTH sides
of a move have actually been refreshed — schools in this guide are refreshed
in sub-batches spanning weeks (see CLAUDE.md's roster-refresh campaign
tables), so run this AFTER a full refresh wave, not immediately after a
single school. Running it earlier isn't wrong, it just won't have caught the
other side of the move yet.

MATCHING, AND ITS REAL LIMIT
------------------------------
Names are normalised by stripping the trailing "(...)" class/position
annotation JUCO entries carry (e.g. "Sang Pi (Fr-M)" -> "Sang Pi") and
comparing case-insensitively. There is NO further disambiguation available
in this schema — minutesOutlook stores names as bare strings, no hometown or
high school field the way roster_extract.py's raw scrape does. So a same-
name hit here is a SIGNAL, never proof — CLAUDE.md's own Section 5b
documents real name-collision traps at this kind of scale (Point University
vs. High Point, Lewis & Clark Community College vs. Lewis & Clark College).
Before acting on any hit, cross-check hometown/high-school on the two
schools' actual roster pages, the same discipline Section 5b already uses.

USAGE
-----
    python scan_duplicate_names.py

Exit code is always 0 — this is a report to work through, not a gate.
"""

import io
import json
import os
import re
import sys
from collections import defaultdict

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


def looks_like_a_name(s):
    """Same filter as refresh_school.py's — a collective placeholder string
    ("Current Fr MFs -> sophomores by 2027", the real monroe_college case)
    isn't an individual and shouldn't be scanned for duplicates."""
    if not s or len(s) > 60:
        return False
    if any(w in s.lower() for w in ("additional", "current fr", "multiple", "→", "->")):
        return False
    words = s.split()
    cap_words = [w for w in words if w[:1].isupper()]
    return len(cap_words) >= 2


def main():
    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    index = defaultdict(list)  # normalized name -> [(school_id, file, bucket, raw_name), ...]
    total_names = 0

    for rel in CONF_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        schools = json.loads(open(path, encoding="utf-8").read())
        for s in schools:
            mo = s.get("minutesOutlook") or {}
            if not mo.get("available"):
                continue
            for key in NAME_KEYS:
                for raw in (mo.get(key) or []):
                    if not looks_like_a_name(raw):
                        continue
                    total_names += 1
                    index[normalize(raw)].append((s["id"], rel, key, raw))

    dupes = {name: entries for name, entries in index.items()
             if len({e[0] for e in entries}) > 1}

    print(f"scanned {total_names} tracked midfielder name(s) across "
          f"{sum(1 for f in CONF_FILES if os.path.exists(os.path.join(root, f)))} conference files\n")

    if not dupes:
        print("No same-name hits across different schools in the current snapshot.")
        return 0

    print(f"{len(dupes)} name(s) appear at more than one school — SIGNALS, not proof, see the "
          f"module docstring on disambiguation before acting on any of these:\n")
    for name, entries in sorted(dupes.items()):
        schools_involved = sorted({e[0] for e in entries})
        print(f"  {name!r} — at {len(schools_involved)} schools:")
        for sid, rel, key, raw in entries:
            print(f"    {rel:<20} {sid:<28} {key:<28} (stored as {raw!r})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
