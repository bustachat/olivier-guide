#!/usr/bin/env python3
"""
check_roster_arithmetic.py — checks minutesOutlook's counted buckets against
mf_total and against their own name arrays. Neither validate_schools.py nor
validate_consistency.js checks this today (confirmed by reading both before
writing this).

TWO CHECKS, BOTH EMPIRICALLY CALIBRATED AGAINST THE REAL DATASET — NOT GUESSED
--------------------------------------------------------------------------
1. cleared_before_2027 + rising_senior_2027_count + rising_junior_2027_count
   <= mf_total.

   This is NOT an equality check. Tested against all 158 `available:true`
   schools before writing this: only 51 satisfy an exact sum match. The other
   107 have mf_total STRICTLY GREATER than the three named buckets summed —
   there is a real, legitimate, untracked 4th group (freshmen not yet
   relevant to the Yr1/Yr2 projection window) that this schema never gives a
   name to. An equality check would have produced 107 false positives on
   launch day. The inequality is what actually held with zero exceptions
   across the real data, so that's what's checked.

2. Each *_count field should roughly match the length of its own *_names[]
   array — but this is a WARNING, never a hard failure, because a real,
   accepted exception already exists in the shipped data: monroe_college's
   rising_junior_2027_count is 2 but rising_junior_2027_names has exactly ONE
   entry, "Current Fr MFs -> sophomores by 2027" — a deliberate COLLECTIVE
   placeholder standing in for two untracked individuals, not a data-entry
   error. Treating every mismatch as fatal would either break on real,
   accepted data or force fabricating names that were never researched. So
   this reports every mismatch, but at WARN severity, and callers should read
   the actual names before assuming it's wrong.

USAGE
-----
    python check_roster_arithmetic.py                 # every available:true school
    python check_roster_arithmetic.py --file data/juco.json --id tyler_jc

Exit code 0 if the INEQUALITY check ([1] above) passes everywhere it ran, 1
otherwise. Warnings from check [2] never affect the exit code — read them,
they don't block anything.
"""

import argparse
import glob
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

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


def check_school(s, rel_file):
    errs, warns = [], []
    mo = s.get("minutesOutlook") or {}
    if not mo.get("available"):
        return errs, warns
    mf = mo.get("mf_total")
    if mf is None:
        return errs, warns

    cl, rs, rj = (mo.get("cleared_before_2027", 0), mo.get("rising_senior_2027_count", 0),
                  mo.get("rising_junior_2027_count", 0))
    summed = cl + rs + rj
    if summed > mf:
        errs.append(f"{rel_file}  {s['id']:<28} cleared({cl}) + rising_sr({rs}) + rising_jr({rj}) "
                     f"= {summed} EXCEEDS mf_total({mf}) — a bucket over-counts")

    for label, count, names_key in (
        ("cleared_before_2027", cl, "cleared_names"),
        ("rising_senior_2027_count", rs, "rising_senior_2027_names"),
        ("rising_junior_2027_count", rj, "rising_junior_2027_names"),
    ):
        names = mo.get(names_key) or []
        if count != len(names):
            warns.append(f"{rel_file}  {s['id']:<28} {label}={count} but {names_key} has "
                          f"{len(names)} entries — could be a real gap, or a deliberate collective "
                          f"placeholder (e.g. monroe_college's rising_junior_2027_names). Read the "
                          f"names before treating this as an error.")
    return errs, warns


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", help="check only this conference file (default: all)")
    ap.add_argument("--id", help="check only this school id (requires --file)")
    args = ap.parse_args()

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    files = [args.file] if args.file else CONF_FILES
    total_checked = 0
    all_errs, all_warns = [], []

    for rel in files:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        schools = json.loads(open(path, encoding="utf-8").read())
        for s in schools:
            if args.id and s.get("id") != args.id:
                continue
            errs, warns = check_school(s, rel)
            total_checked += 1
            all_errs.extend(errs)
            all_warns.extend(warns)

    print(f"checked {total_checked} school(s) with minutesOutlook.available=true\n")

    if all_warns:
        print(f"WARNINGS ({len(all_warns)}) — count/name-array length mismatches, read before acting:")
        for w in all_warns:
            print(f"  {w}")
        print()

    if all_errs:
        print(f"ERRORS ({len(all_errs)}) — a bucket sum exceeds mf_total, a real over-count:")
        for e in all_errs:
            print(f"  {e}")
        print(f"\nFAIL")
        return 1

    print("PASS — no school's counted buckets exceed its mf_total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
