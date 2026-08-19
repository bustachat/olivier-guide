#!/usr/bin/env python3
"""
check_no_jargon.py — sweeps trajectoryNote / recruit_pathway_note for leaked
internal process language. Both fields render VERBATIM on the live Minutes
Outlook tab (js/app.js:3732, 2443) — a real scholarship guide read by an
actual athlete, parents, and coaches. Neither should ever contain a CLAUDE.md
section number, a backtick-quoted code identifier, or an internal constant
name.

WHY THIS EXISTS
---------------
CLAUDE.md documents this exact bug once already (v44.89, 15 entries found and
fixed after the owner spotted one on the live site). This script proved the
bug is NOT actually closed: while researching this skill, two more live
entries were found with the identical pattern — neosho_county_cc and
lsu_eunice both had a sentence reading "...deliberately NOT recomputed —
Section 14's Opportunity Score table cannot reproduce any stored JUCO
trajectory... pending the JUCO calibration item in CLAUDE.md Section 6."
That caveat became FALSE the moment v44.92 shipped a real JUCO trajectory
formula and recalculated both schools' numbers — but nothing ever swept the
PROSE to catch that the disclosure was now describing a problem that no
longer existed. (Both were fixed in the same session this script was built.)

validate_consistency.js's own PROSE check does NOT cover this — it only
reads js/app.js and index.html (hardcoded UI copy), never the JSON DATA
fields themselves. This is a genuinely separate, previously-unfilled gap.

USAGE
-----
    python check_no_jargon.py

Exit code 0 if clean, 1 if any field trips a pattern.
"""

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

# Each pattern is (regex, human explanation). Deliberately several NARROW
# patterns rather than one broad one — CLAUDE.md's own sweep.py lesson
# (found during a different skill's build this session): a jargon sweep that
# returns zero on the first pass is not evidence it's clean, it might just be
# too narrow. These were built by widening against the two REAL leaks found
# in this dataset, not guessed.
PATTERNS = [
    (re.compile(r"§\s*\d+[A-Za-z]?"), "a CLAUDE.md section reference (e.g. '§14')"),
    (re.compile(r"\bSection\s+\d+[A-Za-z]?\b", re.IGNORECASE), "a spelled-out section reference (e.g. 'Section 14')"),
    (re.compile(r"CLAUDE\.md", re.IGNORECASE), "a literal reference to CLAUDE.md"),
    (re.compile(r"`[^`]+`"), "a backtick-quoted code identifier"),
    (re.compile(r"\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b"), "an ALL_CAPS internal constant name (e.g. NEXT_LEVEL_NEUTRAL)"),
    (re.compile(r"MIXED VINTAGE", re.IGNORECASE), "the internal 'MIXED VINTAGE' process marker phrase"),
    (re.compile(r"\bOpportunity Score table\b", re.IGNORECASE), "an internal reference to the §14 Opportunity Score table"),
    (re.compile(r"\bcalibration item\b", re.IGNORECASE), "an internal reference to a CLAUDE.md backlog/calibration item"),
]

FIELDS = ("trajectoryNote", "recruit_pathway_note")


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

    findings = []
    checked = 0
    for rel in CONF_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        schools = json.loads(open(path, encoding="utf-8").read())
        for s in schools:
            mo = s.get("minutesOutlook") or {}
            for field in FIELDS:
                val = mo.get(field)
                if not val:
                    continue
                checked += 1
                for pattern, why in PATTERNS:
                    m = pattern.search(val)
                    if m:
                        findings.append((rel, s["id"], field, why, m.group(0)))

    print(f"checked {checked} populated field(s) across {len(CONF_FILES)} conference files\n")

    if not findings:
        print("PASS — no internal jargon found in trajectoryNote/recruit_pathway_note.")
        return 0

    print(f"FAIL — {len(findings)} finding(s):")
    for rel, sid, field, why, matched in findings:
        print(f"  {rel}  {sid:<28} {field}: {why} — matched {matched!r}")
    print("\nThese fields render verbatim to real visitors. Reword in plain "
          "language — describe what was found and any real caveat, never "
          "cite a doc section or a code identifier.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
