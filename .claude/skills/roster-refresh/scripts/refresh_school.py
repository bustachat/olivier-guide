#!/usr/bin/env python3
"""
refresh_school.py — apply a CLAUDE.md Change Type 3 roster refresh to ONE
school, from a small JSON patch file, instead of hand-editing the cascade.

WHY THIS EXISTS
---------------
apply_roster_refresh.py (repo root) is not a reusable "refresh school X" tool
despite its name — it's a ~1300-line, one-shot campaign log: a hardcoded
PATCHES dict, one literal Python dict per school, entered by hand across many
past sessions. Adding a new school means editing that 1300-line file, and
there's no way to run it against a single school without touching the file at
all. Its formula functions (fit_score, trajectory_for, juco_trajectory_for,
etc.) ARE clean and correct, though — including the JS Math.round half-up
quirk that's easy to get subtly wrong by hand — so this script IMPORTS them
directly rather than re-deriving them (this repo has an explicit rule against
a second copy of any scoring formula ever existing — see validate_consistency
.js's SCORES-SRC check, which exists specifically to catch that class of bug).

WHAT IT DOES
------------
1. Applies a JSON patch (mf_total, roster_season, and named cleared/rising_sr
   /rising_jr lists) to ONE school in a data/<conf>.json file.
2. Recomputes the full cascade — trajectory, lensScores.minutes, fitOlivier,
   lensScores.overall, lensScores.value — using the SAME formulas js/scores.js
   uses (via apply_roster_refresh.py's imports), unless the patch sets
   "facts_only": true (matching the established convention for a roster that
   changed but whose trajectory shouldn't be re-derived from an unreliable
   table — see CLAUDE.md 14/6E's JUCO calibration history).
3. Before overwriting the OLD rising_senior_2027_names / rising_junior_2027_
   names arrays, diffs them against the NEW roster. Any name that was
   expected to still be around (it wasn't already `cleared`) but isn't in ANY
   of the new buckets gets written to a departure queue file — feeding the
   companion `transfer-tracking` skill, which does the actual "where did they
   go" research. This is the one piece of the cascade apply_roster_refresh.py
   never did at all: it always overwrote names in place with no diff.
4. Preserves the target file's existing line-ending convention (LF or CRLF)
   rather than forcing one — data/*.json is NOT uniform across this repo
   (ivy.json, coaches.json, and big-ten.json are CRLF; most conference files
   are LF), and apply_roster_refresh.py hardcodes LF output, which would
   silently mass-convert a CRLF file's line endings if ever pointed at one.
5. If the patch includes "full_roster" (optional — every player, every
   position, not just midfielders), archives it to
   data/rosters/{id}/{fetchedAt}.json and updates data/rosters/manifest.json.
   fetchedAt is always today's real date, computed here, never taken from the
   patch — this is the raw, timestamped source of truth minutesOutlook (and
   any future position-specific view) gets derived from. Completely optional
   and additive: a patch without "full_roster" behaves exactly as before this
   field existed.

WHAT IT DOES NOT DO
--------------------
- It does not fetch or scrape a roster. The patch's facts (who's on the
  roster, what class year) are Tier-1 research you already did — this script
  is pure transcription + arithmetic, exactly the "Phase 3 is pure
  transcription" rule CLAUDE.md states for this workflow.
- It does not touch coaches.json. See the `add-coach` skill / this skill's
  companion coach-check step.
- It does not write CHANGELOG.md or bump guideVersion.

PATCH FILE SHAPE
-----------------
{
  "mf_total": 13,
  "roster_season": "2026-27",
  "cleared": ["Name A (Sr.)", "Name B (Grad)"],
  "rising_sr": ["Name C (Jr.)"],
  "rising_jr": ["Name D (So.)", "Name E (So.)"],
  "recruit_risk": "Low",
  "juco": false,
  "facts_only": false,
  "returning": 6,                            (optional — overrides the
                                                derived "mf_total minus
                                                every named bucket" count,
                                                for when untracked-by-name
                                                freshmen legitimately exist)
  "pathway": "Freshman-friendly",            (optional)
  "pathway_note": "...",                     (optional, plain language — no
                                                internal jargon; see the
                                                check_no_jargon.py script)
  "trajectory_note": "...",                  (optional, same rule)
  "full_roster": [                           (optional — see below)
    {"name": "...", "position": "MF", "class": "So.",
     "hometown": "...", "previousSchool": null}
  ],
  "source_url": "...",                       (optional, paired with full_roster)
  "fetch_method": "claude-in-chrome"         (optional, defaults to
                                                "claude-in-chrome" — see
                                                CLAUDE.md Section 15 Rule 0)
}

`mf_total`, `cleared`, `rising_sr`, `rising_jr` are the four fields the
cascade needs. Everything else you'd have derived by hand (opportunity score,
trajectory percentages, the fit/lens score cascade) this script computes.

`full_roster`, if present, is EVERY player on the roster page you already
read for the midfielder buckets above — not just midfielders. `position`
must be one of GK/D/MF/F/OTHER (the vocabulary College Rosters/roster_data
.json already established in this repo). This does not feed any score or
cascade — it's archived as-is to data/rosters/, see CLAUDE.md Section 5's
"Roster Snapshot Archive" for the full schema and why it exists.

USAGE
-----
    python refresh_school.py --file data/juco.json --id tyler_jc --patch patch.json

Exit code 0 on success, 1 if the school id isn't found, the patch is missing
a required key, or full_roster is present but malformed (bad/missing
position, missing name).
"""

import argparse
import datetime as dt
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def find_repo_root():
    d = os.getcwd()
    for _ in range(6):
        if os.path.exists(os.path.join(d, "apply_roster_refresh.py")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None


ROOT = find_repo_root()
if ROOT is None:
    print("Could not find apply_roster_refresh.py in this directory or any "
          "parent. Run this from inside the olivier-guide repo.")
    sys.exit(2)
sys.path.insert(0, ROOT)
import apply_roster_refresh as arr  # noqa: E402  (needs ROOT on sys.path first)

QUEUE_FILE_DEFAULT = os.path.join(ROOT, "roster_moves_queue.json")
ROSTERS_DIR = os.path.join(ROOT, "data", "rosters")
MANIFEST_FILE = os.path.join(ROSTERS_DIR, "manifest.json")
VALID_POSITIONS = {"GK", "D", "MF", "F", "OTHER"}


def detect_newline(path):
    """Sniff the file's existing convention rather than assuming one — see
    the module docstring. CRLF if any \\r\\n found, else LF."""
    data = open(path, "rb").read()
    return "\r\n" if b"\r\n" in data else "\n"


def looks_like_a_name(s):
    """Best-effort filter so a collective placeholder string (found live in
    monroe_college's data: "Current Fr MFs -> sophomores by 2027", standing
    in for 2 untracked freshmen) isn't treated as a real departed PLAYER when
    it fails to match anything in the new roster — it never named an
    individual to begin with, so "it's not in the new list" proves nothing.
    Heuristic: at least two capitalized words, no arrow/summary phrasing."""
    if not s or len(s) > 60:
        return False
    if any(w in s.lower() for w in ("additional", "current fr", "multiple", "→", "->")):
        return False
    words = s.replace("(", " ").replace(")", " ").split()
    cap_words = [w for w in words if w[:1].isupper()]
    return len(cap_words) >= 2


def validate_full_roster(full_roster):
    """Returns an error string if invalid, else None. Fail fast: this is
    meant to become the trustworthy raw source of truth minutesOutlook gets
    derived from, so a bad position enum value or missing name should never
    silently land in the archive."""
    if not isinstance(full_roster, list) or not full_roster:
        return "full_roster must be a non-empty array of player objects"
    for i, p in enumerate(full_roster):
        if not isinstance(p, dict) or not p.get("name"):
            return f"full_roster[{i}] is missing a name"
        pos = p.get("position")
        if pos not in VALID_POSITIONS:
            return (f"full_roster[{i}] ({p.get('name')!r}) has position "
                    f"{pos!r} — must be one of {sorted(VALID_POSITIONS)}")
    return None


def write_roster_snapshot(school_id, school_file_rel, roster_season, full_roster,
                           source_url, fetch_method, dry_run):
    """Writes data/rosters/{school_id}/{fetchedAt}.json — the raw, all-
    positions extraction that minutesOutlook (and any future position-
    specific view) gets derived from. fetchedAt is the real wall-clock date
    this script ran, never taken from the patch — that's what keeps it a
    trustworthy freshness signal rather than something an old patch could
    backdate. Updates manifest.json in the same read-modify-write pattern
    the departure queue above already uses. Snapshot files are never
    overwritten across days — only a same-day re-run replaces that day's
    file — so history accumulates automatically."""
    fetched_at = dt.date.today().isoformat()
    snapshot = {
        "schoolId": school_id,
        "schoolFile": school_file_rel,
        "fetchedAt": fetched_at,
        "rosterSeason": roster_season,
        "sourceUrl": source_url,
        "fetchMethod": fetch_method or "claude-in-chrome",
        "squadTotal": len(full_roster),
        "players": full_roster,
    }
    school_dir = os.path.join(ROSTERS_DIR, school_id)
    snapshot_path = os.path.join(school_dir, f"{fetched_at}.json")
    rel_snapshot_path = os.path.relpath(snapshot_path, ROOT).replace("\\", "/")

    suffix = " (dry-run, not written)" if dry_run else ""
    print(f"  full_roster: {len(full_roster)} players -> {rel_snapshot_path}{suffix}")

    if dry_run:
        return

    os.makedirs(school_dir, exist_ok=True)
    with open(snapshot_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")

    manifest = {}
    if os.path.exists(MANIFEST_FILE):
        manifest = json.loads(open(MANIFEST_FILE, encoding="utf-8").read())
    manifest[school_id] = {
        "latestFetchedAt": fetched_at,
        "latestFile": f"data/rosters/{school_id}/{fetched_at}.json",
        "rosterSeason": roster_season,
    }
    with open(MANIFEST_FILE, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n")
    print(f"  updated {os.path.relpath(MANIFEST_FILE, ROOT).replace(chr(92), '/')}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", required=True, help="e.g. data/juco.json")
    ap.add_argument("--id", required=True, help="the school's id")
    ap.add_argument("--patch", required=True, help="path to the JSON patch file")
    ap.add_argument("--athlete", default=os.path.join(ROOT, "athletes", "olivier.json"))
    ap.add_argument("--queue-file", default=QUEUE_FILE_DEFAULT,
                     help="where unexpected departures get appended (default: "
                          "roster_moves_queue.json at repo root)")
    ap.add_argument("--dry-run", action="store_true",
                     help="compute and print everything, write nothing")
    args = ap.parse_args()

    school_path = args.file if os.path.isabs(args.file) else os.path.join(ROOT, args.file)
    if not os.path.exists(school_path):
        print(f"No such file: {args.file}")
        return 1

    nl = detect_newline(school_path)
    schools = json.loads(open(school_path, encoding="utf-8").read())
    by_id = {s["id"]: s for s in schools}
    if args.id not in by_id:
        print(f"No school with id={args.id!r} in {args.file}. Add the school "
              f"object first if this is a new school (see the new-school skill).")
        return 1
    s = by_id[args.id]

    patch = json.loads(open(args.patch, encoding="utf-8").read())
    required = ("mf_total", "cleared", "rising_sr", "rising_jr")
    missing = [k for k in required if k not in patch]
    if missing:
        print(f"Patch is missing required key(s): {missing}")
        return 1

    full_roster = patch.get("full_roster")
    if full_roster is not None:
        err = validate_full_roster(full_roster)
        if err:
            print(f"Patch full_roster is invalid: {err}")
            return 1

    athlete = json.loads(open(args.athlete, encoding="utf-8").read())
    mo = s.setdefault("minutesOutlook", {})

    # ── snapshot BEFORE overwrite — this is what apply_roster_refresh.py
    # never did, and the whole reason departures were only ever caught by
    # accident (a human happening to notice) rather than systematically.
    old_rising_sr = list(mo.get("rising_senior_2027_names") or [])
    old_rising_jr = list(mo.get("rising_junior_2027_names") or [])
    old_roster_season = mo.get("roster_season")
    before = (s.get("fitOlivier"), (s.get("lensScores") or {}).get("minutes"),
              (s.get("lensScores") or {}).get("value"))

    # ── apply the facts ──
    mo["available"] = True
    mo["mf_total"] = patch["mf_total"]
    mo["roster_season"] = patch.get("roster_season", mo.get("roster_season"))
    mo["cleared_before_2027"] = len(patch["cleared"])
    mo["cleared_names"] = patch["cleared"]
    mo["rising_senior_2027_count"] = len(patch["rising_sr"])
    mo["rising_senior_2027_names"] = patch["rising_sr"]
    mo["rising_junior_2027_count"] = len(patch["rising_jr"])
    mo["rising_junior_2027_names"] = patch["rising_jr"]
    if "recruit_risk" in patch:
        mo["recruit_risk"] = patch["recruit_risk"]
    if "pathway" in patch:
        mo["recruit_pathway"] = patch["pathway"]
    if "pathway_note" in patch:
        mo["recruit_pathway_note"] = patch["pathway_note"]
    if "trajectory_note" in patch:
        mo["trajectoryNote"] = patch["trajectory_note"]

    facts_only = bool(patch.get("facts_only"))
    juco = bool(patch.get("juco", s.get("juco2yr", False)))

    if facts_only:
        print(f"{args.id}: FACTS ONLY — trajectory and score cascade left untouched.")
        print("  Reminder: if this school's trajectory is ever recomputed later, "
              "update recruit_pathway_note/trajectoryNote in the SAME edit — a "
              "'facts refreshed but note still describes the old mismatch' state "
              "is a real bug this skill's check_no_jargon.py script was built to "
              "catch (found live in lsu_eunice/neosho_county_cc during this "
              "skill's own testing).")
    else:
        returning = patch.get("returning")
        if juco:
            opp = arr.juco_opportunity_score(len(patch["cleared"]), patch["mf_total"])
            pcts, traj = arr.juco_trajectory_for(len(patch["cleared"]), patch["mf_total"])
        else:
            if returning is None:
                # Derivable: mf_total minus everyone already named in a bucket.
                # This undercounts if some returning players are legitimately
                # untracked-by-name (freshmen) — pass --returning explicitly
                # in the patch when that distinction matters.
                returning = max(0, patch["mf_total"] - len(patch["cleared"]) - len(patch["rising_sr"]))
            opp = arr.opportunity_score(len(patch["cleared"]), len(patch["rising_sr"]), returning)
            pcts, traj = arr.trajectory_for(opp, juco=False)
        mo["trajectory"] = traj

        s["lensScores"]["minutes"] = arr.js_round(arr.mo_score(s) * 100)
        s["fitOlivier"] = arr.fit_score(s, athlete)
        s["lensScores"]["overall"] = s["fitOlivier"]
        budget = athlete.get("budgetUSD") or (athlete["budgetAUD"] / athlete["fxRate"])
        afford = 1 - min(1, s["fin"]["costNum"] / budget)
        s["lensScores"]["value"] = arr.js_round(s["fitOlivier"] * 0.6 + afford * 40)

        after = (s["fitOlivier"], s["lensScores"]["minutes"], s["lensScores"]["value"])
        print(f"{args.id}: mf={patch['mf_total']} opp={opp:.2f} traj={'/'.join(map(str, pcts))}  "
              f"fit {before[0]}->{after[0]}  minutes {before[1]}->{after[1]}  value {before[2]}->{after[2]}")

    # ── departure detection ──
    new_names = set(patch["cleared"]) | set(patch["rising_sr"]) | set(patch["rising_jr"])
    candidates = [n for n in (old_rising_sr + old_rising_jr)
                  if looks_like_a_name(n) and n not in new_names]
    if candidates:
        print(f"  {len(candidates)} unexpected departure(s) — queued for transfer-tracking:")
        queue = []
        if os.path.exists(args.queue_file):
            queue = json.loads(open(args.queue_file, encoding="utf-8").read())
        for name in candidates:
            print(f"    - {name!r}")
            queue.append({
                "name": name,
                "origin_school_id": args.id,
                "origin_file": os.path.relpath(school_path, ROOT).replace("\\", "/"),
                "seen_in_roster_season": old_roster_season,
                "absent_as_of_roster_season": mo["roster_season"],
                "status": "pending",
            })
        if not args.dry_run:
            open(args.queue_file, "w", encoding="utf-8", newline="\n").write(
                json.dumps(queue, indent=2, ensure_ascii=False) + "\n")
            print(f"  wrote {len(candidates)} entrie(s) to {os.path.relpath(args.queue_file, ROOT)}")
    else:
        print("  no unexpected departures detected")

    # ── full-roster archive (optional, additive — see module docstring) ──
    if full_roster is not None:
        write_roster_snapshot(
            school_id=args.id,
            school_file_rel=os.path.relpath(school_path, ROOT).replace("\\", "/"),
            roster_season=mo["roster_season"],
            full_roster=full_roster,
            source_url=patch.get("source_url"),
            fetch_method=patch.get("fetch_method"),
            dry_run=args.dry_run,
        )

    if args.dry_run:
        print("\n--dry-run: nothing written.")
        return 0

    with open(school_path, "w", encoding="utf-8", newline="") as f:
        text = json.dumps(schools, indent=2, ensure_ascii=False) + "\n"
        if nl == "\r\n":
            text = text.replace("\n", "\r\n")
        f.write(text)
    print(f"wrote {os.path.relpath(school_path, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
