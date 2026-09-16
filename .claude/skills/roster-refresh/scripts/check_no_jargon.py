#!/usr/bin/env python3
"""
check_no_jargon.py — sweeps every field that renders on the live site for
leaked internal process language. These strings render VERBATIM to a real
scholarship guide read by an actual athlete, parents, and coaches. None of
them should ever contain a CLAUDE.md section number, a backtick-quoted code
identifier, an internal constant name, or wording about how or when the
research was done ("this session").

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

SCOPE WIDENED v45.47
--------------------
Until v45.47 this script read only trajectoryNote / recruit_pathway_note.
Recurrence #3 of the leak (v45.46) sat in fields it never looked at:
proPlayers.draftRank, rec, acuAlignNote, confRecord[].note, kinRank,
courses[], facilityDetails.*, fin.internationalNote, culture.olivierMatch,
titles[], and conferences.json's olivierNote — 41 "this session" hits in all.
It now walks EVERY string in every school object, plus coaches.json,
conferences.json and conf-prestige.json, and exempts only the fields that
are confirmed internal-only (no renderer reads them) and identifier fields
(ids, urls, domains). Exempting by name rather than listing rendered fields
means a new rendered field is covered by default, not forgotten.

validate_consistency.js's own PROSE check does NOT cover this — it only
reads js/app.js and index.html (hardcoded UI copy), never the JSON DATA
fields themselves. This is a genuinely separate gap.

USAGE
-----
    python check_no_jargon.py

Exit code 0 if clean, 1 if any field trips a FAIL pattern. WARN patterns
are reported but do not fail the run (see WARN_PATTERNS below).
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
OTHER_FILES = ["data/coaches.json", "data/conferences.json", "data/conf-prestige.json"]

# Keys never scanned, anywhere in the object tree.
# - devScoresNote, overallScoreNote: confirmed internal-only (grep js/ and
#   index.html: no renderer reads either), so citation shorthand is allowed.
# - identifier/link fields: not prose; URL paths can contain
#   ALL_CAPS_WITH_UNDERSCORES text that would false-positive.
EXEMPT_KEYS = {
    "devScoresNote", "overallScoreNote",
    "id", "schoolId", "url", "domain", "sourceUrl", "confKey", "color",
}
# Exact paths with no renderer (confirmed by grep of js/ v45.47). Kept as
# paths, not key names, because "note" is rendered elsewhere
# (confRecord[].note, facilityDetails.note, housing.note, nextLevel.note).
# "note" at the top level only exists on coaches.json entries.
EXEMPT_PATHS = {"minutesOutlook.note", "note"}

# Each pattern is (regex, human explanation). Deliberately several NARROW
# patterns rather than one broad one — CLAUDE.md's own sweep.py lesson: a
# jargon sweep that returns zero on the first pass is not evidence it's
# clean, it might just be too narrow. These were built by widening against
# REAL leaks found in this dataset, not guessed.
PATTERNS = [
    (re.compile(r"§\s*\d+[A-Za-z]?"), "a CLAUDE.md section reference (e.g. '§14')"),
    (re.compile(r"\bSection\s+\d+[A-Za-z]?\b", re.IGNORECASE), "a spelled-out section reference (e.g. 'Section 14')"),
    (re.compile(r"CLAUDE\.md", re.IGNORECASE), "a literal reference to CLAUDE.md"),
    (re.compile(r"`[^`]+`"), "a backtick-quoted code identifier"),
    # The lookahead skips real course prefixes followed by a number
    # (Northwestern's "BIOL_SCI 215" is a genuine course code, not a constant).
    (re.compile(r"\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b(?!\s*\d)"),"an ALL_CAPS internal constant name (e.g. NEXT_LEVEL_NEUTRAL)"),
    (re.compile(r"MIXED VINTAGE", re.IGNORECASE), "the internal 'MIXED VINTAGE' process marker phrase"),
    (re.compile(r"\bOpportunity Score table\b", re.IGNORECASE), "an internal reference to the §14 Opportunity Score table"),
    (re.compile(r"\bcalibration item\b", re.IGNORECASE), "an internal reference to a CLAUDE.md backlog/calibration item"),
    # Added v45.47 (recurrence #3): wording about the research process itself.
    (re.compile(r"\bthis session\b", re.IGNORECASE), "'this session' — describes the research process, not the school"),
    (re.compile(r"\b(this|that|the earlier|an earlier|the next|a future) (research|accuracy) pass\b", re.IGNORECASE),
     "a 'research pass' / 'accuracy pass' process reference"),
    (re.compile(r"\bfuture session\b", re.IGNORECASE), "'future session' — a process reference"),
    (re.compile(r"\bClaude(?: for| in)? Chrome\b|\bMCP\b", re.IGNORECASE), "a research-tooling name (Claude for Chrome / MCP)"),
    # Promoted from WARN in v45.48 once all rendered hits were rewritten.
    # Comparisons scoped to a research batch mean nothing to a reader.
    # "campaign" alone is NOT matched: "a winless conference campaign" is
    # ordinary soccer usage.
    (re.compile(r"\b(this|the|that|its|of) (entire |whole |final )?(\w+ )?batch(es|'s)?\b|\bBatch \d", re.IGNORECASE),
     "a research-batch reference ('this batch', 'the batch's', 'Batch 2')"),
    (re.compile(r"\b(this|the|that) (entire |whole )?(\w+ )?(gap-fill )?campaign('s)?\b(?! season)", re.IGNORECASE),
     "a research-campaign reference ('this campaign', 'the campaign's')"),
    (re.compile(r"\baudit-discovered\b|\balready-guide\b", re.IGNORECASE), "internal guide-building wording"),
    (re.compile(r"\b(previous stored|stored figure)\b[^.]*\bballpark\b", re.IGNORECASE),
     "internal history of a past data error ('the previous stored $X was an unresearched ballpark')"),
]

# Reported, not failing. Empty since v45.48; keep the mechanism for the next
# leak class that is too large to fix in the same change it is found.
WARN_PATTERNS = []


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


def walk(obj, path):
    """Yield (path, string) for every string under obj, skipping EXEMPT_KEYS."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            child = f"{path}.{k}" if path else k
            if k in EXEMPT_KEYS or child in EXEMPT_PATHS:
                continue
            yield from walk(v, child)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")
    elif isinstance(obj, str):
        yield path, obj


def main():
    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    findings, warnings = [], []
    checked = 0
    for rel in CONF_FILES + OTHER_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        records = json.loads(open(path, encoding="utf-8").read())
        if isinstance(records, dict):
            records = [records]
        for rec in records:
            rid = rec.get("id", "?") if isinstance(rec, dict) else "?"
            for field, val in walk(rec, ""):
                if not val:
                    continue
                checked += 1
                for pattern, why in PATTERNS:
                    m = pattern.search(val)
                    if m:
                        findings.append((rel, rid, field, why, m.group(0)))
                for pattern, why in WARN_PATTERNS:
                    if pattern.search(val):
                        warnings.append((rel, why))

    print(f"checked {checked} rendered string(s) across "
          f"{len(CONF_FILES) + len(OTHER_FILES)} data files\n")

    if warnings:
        counts = {}
        for rel, why in warnings:
            counts[(rel, why)] = counts.get((rel, why), 0) + 1
        print("WARN (not failing) — known open cleanup:")
        for (rel, why), n in sorted(counts.items()):
            print(f"  {rel}  {why}: {n}")
        print()

    if not findings:
        print("PASS — no internal jargon found in rendered fields.")
        return 0

    print(f"FAIL — {len(findings)} finding(s):")
    for rel, sid, field, why, matched in findings:
        print(f"  {rel}  {sid:<28} {field}: {why} — matched {matched!r}")
    print("\nThese fields render verbatim to real visitors. Reword in plain "
          "language — describe what was found and any real caveat, never "
          "cite a doc section, a code identifier, or the research process.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
