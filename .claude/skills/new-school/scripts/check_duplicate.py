#!/usr/bin/env python3
"""
check_duplicate.py — CLAUDE.md Section 7 Phase 1A's "confirm school not already
in guide" step, as a reusable script instead of a hand-typed one-liner.

CLAUDE.md's own text warns that a plain `grep` on the conference files "misses
compound IDs like tyler_jc" — grep works on raw JSON text, so it can match a
substring inside an unrelated key or miss a match split across lines. This
script parses each conference file as JSON and searches the actual `id`,
`name`, and `full` fields of every school object, which is what the Phase 1A
step is actually trying to check.

USAGE
-----
    python check_duplicate.py "tyler"
    python check_duplicate.py "daytona state"

Exit code 0 and prints "no match" if the term doesn't appear anywhere — safe to
proceed as an ADD SCHOOL session. Exit code 1 and prints every match if it
does — CLAUDE.md's rule is that this makes it a DATA UPDATE session instead,
not an Add School session; stop and re-identify the change type before
proceeding, per Phase 1A.
"""

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Deliberately NOT a glob over data/*.json: that directory also holds
# coaches.json, conferences.json, conf-prestige.json, and pipeline.json, none
# of which hold school objects in this schema — but coaches.json entries do
# have their own `id`/`name` fields, so a naive glob false-positives a search
# like "tyler" against a coach named "Tyler Wilt". This list is exactly
# CLAUDE.md's own Phase 1A one-liner; if a new conference file is ever added,
# add it here in the same commit (CLAUDE.md Section 3a Change Type 1 already
# requires updating the School -> File Reference Table for that, so this list
# is never the only place that needs to change).
CONF_FILES = [
    "data/acc.json", "data/big-ten.json", "data/big-east.json", "data/aac.json",
    "data/big-west.json", "data/caa.json", "data/d1-other.json", "data/juco.json",
    "data/ivy.json", "data/d2.json",
]


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
    if len(sys.argv) != 2:
        print("usage: python check_duplicate.py \"search term\"")
        return 2
    term = sys.argv[1].strip().lower()
    if not term:
        print("search term is empty")
        return 2

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    matches = []
    for rel in CONF_FILES:
        full_path = os.path.join(root, rel)
        if not os.path.exists(full_path):
            continue
        try:
            schools = json.loads(open(full_path, encoding="utf-8").read())
        except json.JSONDecodeError as e:
            print(f"  ! could not parse {rel}: {e}")
            continue
        if not isinstance(schools, list):
            continue
        for s in schools:
            haystack = " ".join(str(s.get(k, "")) for k in ("id", "name", "full")).lower()
            if term in haystack:
                matches.append((rel, s.get("id"), s.get("name"), s.get("full")))

    if not matches:
        print(f"No match for \"{term}\" across {len(CONF_FILES)} conference files. "
              f"Safe to proceed as an ADD SCHOOL session.")
        return 0

    print(f"Found {len(matches)} match(es) for \"{term}\" — this is a DATA "
          f"UPDATE session, not an Add School session (CLAUDE.md Phase 1A). "
          f"Stop and re-identify the change type.\n")
    for rel, sid, name, full in matches:
        print(f"  {rel:<24} id={sid!r}  name={name!r}  full={full!r}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
