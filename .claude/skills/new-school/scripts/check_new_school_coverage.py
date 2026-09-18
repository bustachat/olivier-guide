#!/usr/bin/env python3
"""
check_new_school_coverage.py — catches the touchpoints in CLAUDE.md Section 3a
Change Type 1's impact map that NEITHER validate_schools.py NOR
validate_consistency.js checks today.

Those two scripts already cover: required school-object fields, duplicate IDs,
acuUnits/acuAlign consistency, DOMAINS/SITE_URLS/SOCIAL coverage in js/app.js,
confKey vs CONF_SECTIONS, and "full-profile school has a coaches.json entry."
Run `qa-suite` (or `python validate_schools.py && node validate_consistency.js`
directly) for all of that — this script deliberately does not repeat it.

What's left, and genuinely unchecked anywhere else in this repo:
  - conferences.json otherSchools[] — is the school still sitting in some
    card's "Other Notable Programs" list after being added to the guide?
    (Since v45.63 the card's own guide-school list and the rankings table's
    "Programs in Guide" are DERIVED live from the school's `conf`, so there is
    no guideSchools[] or programsInGuide to update; validate_consistency.js's
    GROUP check fails if the school's conference has no card.)
  - data/pipeline.json — if the school has titles[] or mlsPicks5yr > 0, does
    it appear in ncaaD1[]/ncaaD2[]/mlsDraft[]?
  - CLAUDE.md's own "School -> File Reference Table" — is there a row for
    this school? (Section 2 calls updating this table mandatory for this
    change type; nothing else in the repo reads or checks it.)

These are all best-effort SUBSTRING matches against the school's `name`/`full`
fields, not exact structural checks — conferences.json and conf-prestige.json
don't key their entries by school id, so an exact match isn't available. Read
the reported context before trusting a "MISSING": a genuinely short or common
school name can under- or over-match. Treat this as a checklist, not a proof.

USAGE
-----
    python check_new_school_coverage.py --id tyler_jc

Exit code 0 if every touchpoint was found, 1 if anything is reported MISSING.
"""

import argparse
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Same list as check_duplicate.py, and for the same reason: a plain glob over
# data/*.json also picks up coaches.json, whose entries have their own `id`
# field and could in principle exact-match a school id by coincidence.
CONF_FILES = [
    "data/acc.json", "data/big-ten.json", "data/big-east.json", "data/aac.json",
    "data/big-west.json", "data/caa.json", "data/d1-other.json", "data/juco.json",
    "data/ivy.json", "data/d2.json",
]
CLAUDE_MD = "CLAUDE.md"


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


def load_json(path):
    return json.loads(open(path, encoding="utf-8").read())


def find_school(root, school_id):
    for rel in CONF_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        try:
            data = load_json(path)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, list):
            continue
        for s in data:
            if isinstance(s, dict) and s.get("id") == school_id:
                return rel, s
    return None, None


STOPWORDS = {
    "college", "university", "state", "the", "of", "at", "junior", "community",
    "and", "for", "school", "institute", "technical", "county",
    # Geographic words shared by many unrelated schools in this guide (several
    # "UC X" / "Cal State X" / "X State" schools) — safe to drop even as a
    # last resort, since on their own they identify a region, not a school.
    "california", "texas", "florida", "oklahoma", "arizona", "carolina",
}


def distinctive_tokens(school):
    """The word(s) most likely to identify this school in someone else's
    free-form prose. Tested against real data, two failure modes both showed
    up and both are handled below:

    1) `name` ("Tyler JC") and `full` ("Tyler Junior College (Apaches)") are
       NOT reliable substrings of each other's phrasing, and conferences.json
       guideSchools[] entries use a THIRD style again ("Tyler Junior College
       (NJCAA DI) - Tyler, TX") containing neither verbatim — so matching the
       whole name/full string produces false NEGATIVES.
    2) Pulling every 4+ letter word from both fields and matching on ANY of
       them produces false POSITIVES: "UC Riverside" / "University of
       California, Riverside" contributes "california" as a token, which
       then matches "California Baptist" — a different school entirely.

    Fix: prefer tokens drawn from `name` alone (the guide's own concise,
    already-deliberately-chosen identifier, e.g. "Riverside") and only fall
    back to pulling tokens from `full` when `name` alone yields nothing
    (e.g. "UVA" is all-caps/too short, but `full`'s "Virginia" is a genuinely
    distinctive word). This keeps "Riverside" instead of "California" as UC
    Riverside's token while still resolving the UVA/Tyler JC cases."""
    def words_from(field):
        out = []
        if not field:
            return out
        for w in re.findall(r"[A-Za-z]{4,}", field):
            wl = w.lower()
            if wl not in STOPWORDS and wl not in out:
                out.append(wl)
        return out

    tokens = words_from(school.get("name"))
    if not tokens:
        tokens = words_from(school.get("full"))
    return tokens


def any_contains(haystacks, tokens):
    """True, plus which haystack/token matched, if any token appears as a
    whole word in any haystack (case-insensitive)."""
    for h in haystacks:
        hl = (h or "").lower()
        for t in tokens:
            if re.search(r"\b" + re.escape(t) + r"\b", hl):
                return True, h
    return False, None


def check_other_schools(root, names):
    conf = load_json(os.path.join(root, "data", "conferences.json"))
    in_other = []
    for c in conf:
        hit, matched = any_contains(c.get("otherSchools", []), names)
        if hit:
            in_other.append((c.get("id") or c.get("name"), matched))
    return in_other


def check_pipeline(root, names):
    pipe_path = os.path.join(root, "data", "pipeline.json")
    if not os.path.exists(pipe_path):
        return []
    pipeline = load_json(pipe_path)
    hits = []
    for section in ("ncaaD1", "ncaaD2", "mlsDraft"):
        for row in pipeline.get(section, []):
            if row.get("sectionDivider"):
                continue
            hit, matched = any_contains([row.get("school", "")], names)
            if hit:
                hits.append((section, matched))
    return hits


def check_claude_md(root, school_id):
    # Match the table's ID column exactly. A name-token match counted unrelated
    # table rows (e.g. the Fit Score weights table) and missed real school rows.
    path = os.path.join(root, CLAUDE_MD)
    if not os.path.exists(path):
        return []
    cell = "| `" + school_id + "` |"
    return [line.strip() for line in open(path, encoding="utf-8").readlines()
            if line.strip().startswith("|") and cell in line]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True, help="the school's id, e.g. tyler_jc")
    args = ap.parse_args()

    root = find_repo_root()
    if root is None:
        print("Could not find validate_schools.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    rel, school = find_school(root, args.id)
    if school is None:
        print(f"No school with id={args.id!r} found in any data/*.json file. "
              f"Add the school object first (CLAUDE.md Section 7 Phase 3A), "
              f"then run this to check the remaining cross-file touchpoints.")
        return 2

    names = distinctive_tokens(school)
    print(f"School: {args.id}  ({school.get('name')!r} / {school.get('full')!r})")
    print(f"  found in {rel}, div={school.get('div')}, confKey={school.get('confKey')}, "
          f"profileDepth={school.get('profileDepth')}")
    print(f"(fields already checked by validate_schools.py / validate_consistency.js — "
          f"run qa-suite for those — are not repeated here)\n")

    ok = True

    print("conferences.json otherSchools[] (card lists are derived; the GROUP check covers the card):")
    in_other = check_other_schools(root, names)
    if in_other:
        for conf_id, matched in in_other:
            print(f"  MISSING  still listed under '{conf_id}' otherSchools[] as {matched!r} "
                  f"— remove it now that the school is in the guide")
        ok = False
    else:
        print("  ok    not listed as an 'other notable program' anywhere")

    titles = school.get("titles") or []
    mls_picks = ((school.get("proPlayers") or {}).get("mlsPicks5yr")) or 0
    # CLAUDE.md Change Type 1: pipeline.json is needed only for national titles or MLS
    # picks. Conference titles also live in titles[], and counting them flagged 85 schools.
    national = [x for x in titles if re.search(r"national champion", str(x), re.IGNORECASE)]
    print(f"\ndata/pipeline.json (national titles={len(national)}, mlsPicks5yr={mls_picks}):")
    if national or mls_picks:
        pipeline_hits = check_pipeline(root, names)
        if pipeline_hits:
            for section, matched in pipeline_hits:
                print(f"  ok    found in {section}[] as {matched!r}")
        else:
            print("  MISSING  school has titles/MLS picks but no pipeline.json entry "
                  "found in ncaaD1[]/ncaaD2[]/mlsDraft[]")
            ok = False
    else:
        print("  (skipped — no national title and mlsPicks5yr is 0, so no pipeline.json entry is expected)")

    print(f"\nCLAUDE.md School -> File Reference Table:")
    md_hits = check_claude_md(root, args.id)
    if md_hits:
        print(f"  ok    {len(md_hits)} matching table row(s), e.g.:")
        print(f"        {md_hits[0]}")
    else:
        print("  MISSING  no row found for this school — CLAUDE.md Section 2 calls "
              "this update mandatory for this change type")
        ok = False

    print()
    if ok:
        print("All cross-file touchpoints found. Still run qa-suite for the "
              "field-level checks, then Phase 5 (browser test) before committing.")
        return 0
    else:
        print("One or more touchpoints are MISSING above — these are substring "
              "matches, so double-check before assuming a MISSING is real, then "
              "fix and re-run.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
