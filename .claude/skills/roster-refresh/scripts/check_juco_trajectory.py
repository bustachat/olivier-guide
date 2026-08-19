#!/usr/bin/env python3
"""
check_juco_trajectory.py — verifies a JUCO's STORED trajectory[].pct values
actually match what the documented v44.92 formula (juco_trajectory_for() in
apply_roster_refresh.py, CLAUDE.md Section 14) would compute from its own
stored cleared_before_2027/mf_total.

WHY THIS EXISTS
---------------
validate_consistency.js's FIT check verifies fitOlivier/lensScores against
the live scores.js formula — but scores.js reads trajectory[].pct as an
INPUT (via mo_score()), it never independently re-derives what the
trajectory SHOULD be from the roster facts. So if cleared_before_2027 or
mf_total is edited by hand without recomputing trajectory (the deliberate
"facts_only" pattern used throughout the roster-refresh campaign, or an
accidental edit anywhere else), the FIT check stays green — fitOlivier is
perfectly consistent with a trajectory that no longer matches what the
facts imply. Confirmed by grep: nothing in validate_consistency.js
references juco_trajectory_for, D1_RATE_DIVISOR, or NEXT_LEVEL_NEUTRAL at
all. This script is the missing half.

A mismatch here is NOT automatically a bug worth fixing on sight — it may be
a deliberate, disclosed facts_only refresh (a real, accepted state in this
dataset; see CLAUDE.md's JUCO roster-refresh campaign notes). Read the
school's recruit_pathway_note before assuming it needs correcting. What this
script guarantees is that the state is never SILENT — every mismatch prints.

USAGE
-----
    python check_juco_trajectory.py

Exit code is always 0 — this is a REPORT, not a gate, because a mismatch can
be a legitimate, disclosed facts_only state. Read the output.
"""

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
import apply_roster_refresh as arr  # noqa: E402


def main():
    path = os.path.join(ROOT, "data", "juco.json")
    schools = json.loads(open(path, encoding="utf-8").read())

    checked, matches, mismatches, skipped = 0, 0, [], []
    for s in schools:
        mo = s.get("minutesOutlook") or {}
        if not mo.get("available"):
            continue
        cl = mo.get("cleared_before_2027")
        mf = mo.get("mf_total")
        traj = mo.get("trajectory") or []
        if not isinstance(cl, int) or not isinstance(mf, int) or mf <= 0 or not traj:
            skipped.append(s["id"])
            continue
        checked += 1
        expect_pcts, _ = arr.juco_trajectory_for(cl, mf)
        actual_pcts = [t.get("pct") for t in traj]
        if actual_pcts == expect_pcts:
            matches += 1
        else:
            has_note = bool(mo.get("recruit_pathway_note") or mo.get("trajectoryNote"))
            mismatches.append((s["id"], cl, mf, actual_pcts, expect_pcts, has_note))

    print(f"checked {checked} available JUCO(s) with a stored trajectory "
          f"({len(skipped)} skipped — missing/invalid facts)\n")

    if mismatches:
        print(f"{len(mismatches)} school(s) where stored trajectory != what the "
              f"formula computes from cleared_before_2027/mf_total:\n")
        for sid, cl, mf, actual, expect, has_note in mismatches:
            flag = "" if has_note else "  <- NO explanatory note found; check this one first"
            print(f"  {sid:<28} cleared={cl} mf_total={mf}  stored={actual}  formula={expect}{flag}")
        print("\nA mismatch WITH a note is likely a deliberate, disclosed facts_only "
              "state (read the note to confirm). A mismatch with NO note is worth "
              "investigating directly — either the facts changed without the "
              "trajectory being recomputed, or vice versa.")
    else:
        print("PASS — every available JUCO's stored trajectory matches the formula.")

    return 0  # report only, see docstring


if __name__ == "__main__":
    sys.exit(main())
