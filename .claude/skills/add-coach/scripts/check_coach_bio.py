#!/usr/bin/env python3
"""
check_coach_bio.py — catches two specific, previously-real bugs in coaches.json
`bio` text that no validator checks today:

  1. AN EMAIL HIDDEN IN THE BIO PROSE THAT DISAGREES WITH contact.email.
     CLAUDE.md Section 3a Change Type 2 (v44.35): "grep the bio strings too —
     contact{} is not the only place an email lives." St. Edward's `bio` ended
     with a hardcoded "Email: byoung@stedwards.edu" that a contact-only update
     would have left stale, because a contact change alone doesn't move
     overallScore and so doesn't trigger the re-rank step that might have
     caught it another way.

  2. A BIO THAT NAMES A SPECIFIC ATHLETE BY NAME.
     CLAUDE.md Section 5 (v44.28): coaches.json is athlete-agnostic — the same
     file regardless of which athlete's guide is loaded (Section 4 describes a
     multi-athlete architecture under athletes/). 15 bios were found in v44.28
     hardcoding "Olivier" by name, or a date tied to one athlete's
     `targetDeparture`, which is wrong or stale the moment a second athlete
     uses the guide. This script reads every file under athletes/*.json and
     flags a bio containing any athlete's `name` or `targetDeparture` string
     verbatim, so it stays correct if a second athlete is ever onboarded
     rather than hardcoding "Olivier".

USAGE
-----
    python check_coach_bio.py               # audit every coach in coaches.json
    python check_coach_bio.py --id gelnovatch  # just the one coach you touched

Exit code 0 if nothing is flagged, 1 otherwise. This only reports — it never
edits bio text itself, since the right fix (reword vs. remove) is a judgment
call CLAUDE.md leaves to the session.
"""

import argparse
import glob
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# The domain part is written as (\.[\w-]+)+ rather than \.[\w.-]+ so a
# sentence-ending period right after the TLD ("...merush@calstatela.edu.")
# is never absorbed into the match — [\w.-]+ would have grabbed it, since
# "." is a valid character in that class, producing a false "edu." domain
# that never matches the real stored address.
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


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


def load_athlete_markers(root):
    """Every athlete's name + targetDeparture, from every athletes/*.json —
    not just olivier.json — so this stays correct if a second athlete is ever
    onboarded (CLAUDE.md Section 4's stated architecture) rather than
    hardcoding "Olivier" the way the bug being checked for did."""
    markers = []
    for path in glob.glob(os.path.join(root, "athletes", "*.json")):
        try:
            a = json.loads(open(path, encoding="utf-8").read())
        except json.JSONDecodeError:
            continue
        name = a.get("name")
        if name:
            markers.append(("athlete name", name))
        dep = a.get("targetDeparture")
        if dep:
            markers.append(("targetDeparture", dep))
    return markers


def check_one(coach, markers):
    findings = []
    bio = coach.get("bio") or ""
    cid = coach.get("id")

    bio_emails = set(m.lower() for m in EMAIL_RE.findall(bio))
    contact_email = ((coach.get("contact") or {}).get("email") or "").lower()
    for e in bio_emails:
        if e != contact_email:
            findings.append(
                f"  EMAIL    [{cid}] bio contains {e!r}, which does not match "
                f"contact.email ({contact_email or '(none stored)'!r})")

    for label, value in markers:
        if value and re.search(r"\b" + re.escape(value) + r"\b", bio, re.IGNORECASE):
            findings.append(
                f"  ATHLETE  [{cid}] bio names a specific {label} ({value!r}) — "
                f"coaches.json must stay athlete-agnostic (CLAUDE.md Section 5, v44.28)")

    return findings


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", help="check only this coach (default: audit all)")
    args = ap.parse_args()

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    coaches = json.loads(open(os.path.join(root, "data", "coaches.json"), encoding="utf-8").read())
    markers = load_athlete_markers(root)

    if args.id:
        coaches = [c for c in coaches if c.get("id") == args.id]
        if not coaches:
            print(f"No coach with id={args.id!r} found in coaches.json.")
            return 2

    print(f"checking {len(coaches)} coach(es) against {len(markers)} athlete marker(s) "
          f"from athletes/*.json\n")

    all_findings = []
    for c in coaches:
        all_findings.extend(check_one(c, markers))

    if not all_findings:
        print("PASS — no bio-embedded email mismatches or athlete-name leaks found.")
        return 0

    for f in all_findings:
        print(f)
    print(f"\nFAIL — {len(all_findings)} finding(s). These are text issues, not "
          f"schema issues — fix the bio wording directly, there's nothing to "
          f"auto-correct here.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
