#!/usr/bin/env python3
"""
check_roster_snapshot.py — validates the data/rosters/ append-only roster
snapshot archive (schoolId -> {fetchedAt}.json + manifest.json).

WHY THIS EXISTS
---------------
data/rosters/ is a new, separate archive from the scored data/<conf>.json
files — refresh_school.py writes it as an optional side effect of a normal
roster refresh (see that script's "full_roster" patch key), but nothing
validates it's internally consistent. This is that check: every manifest
entry actually resolves to a real file, every snapshot file is well-formed
(valid position enum values, a fetchedAt that matches its own filename), and
it separately reports (never fails on) which guide schools don't have a
snapshot yet — expected for a long time, since this archive starts empty and
builds up going forward with no backfill (see CLAUDE.md Section 5's "Roster
Snapshot Archive").

USAGE
-----
    python check_roster_snapshot.py

Exit code 1 if any manifest/snapshot file is genuinely malformed (a real
bug). Exit code 0 otherwise — including when most/all schools simply don't
have a snapshot yet, which is an expected, reported state, not a failure.
"""

import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

VALID_POSITIONS = {"GK", "D", "MF", "F", "OTHER"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

CONF_FILES = [
    "data/acc.json", "data/big-ten.json", "data/big-east.json", "data/aac.json",
    "data/big-west.json", "data/caa.json", "data/d1-other.json", "data/juco.json",
    "data/ivy.json", "data/d2.json",
]


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


def all_guide_school_ids(root):
    ids = []
    for rel in CONF_FILES:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            continue
        for s in json.loads(open(path, encoding="utf-8").read()):
            ids.append(s["id"])
    return ids


def main():
    root = find_repo_root()
    if root is None:
        print("Could not find apply_roster_refresh.py in this directory or any "
              "parent. Run this from inside the olivier-guide repo.")
        return 2

    rosters_dir = os.path.join(root, "data", "rosters")
    manifest_path = os.path.join(rosters_dir, "manifest.json")

    errs = []

    if not os.path.exists(rosters_dir):
        print("data/rosters/ does not exist yet — nothing to check "
              "(expected before the first full_roster patch is ever applied).")
        return 0

    manifest = {}
    if os.path.exists(manifest_path):
        try:
            manifest = json.loads(open(manifest_path, encoding="utf-8").read())
        except json.JSONDecodeError as e:
            print(f"manifest.json is not valid JSON: {e}")
            return 1

    # ── every manifest entry resolves to a real, well-formed snapshot file ──
    for school_id, entry in manifest.items():
        latest_file = entry.get("latestFile")
        if not latest_file:
            errs.append(f"{school_id}: manifest entry has no latestFile")
            continue
        snapshot_path = os.path.join(root, latest_file.replace("/", os.sep))
        if not os.path.exists(snapshot_path):
            errs.append(f"{school_id}: manifest points at {latest_file}, which does not exist")
            continue

        try:
            snap = json.loads(open(snapshot_path, encoding="utf-8").read())
        except json.JSONDecodeError as e:
            errs.append(f"{school_id}: {latest_file} is not valid JSON: {e}")
            continue

        fetched_at = snap.get("fetchedAt")
        if not fetched_at or not DATE_RE.match(fetched_at):
            errs.append(f"{school_id}: {latest_file} has invalid fetchedAt {fetched_at!r} (expected YYYY-MM-DD)")
        elif os.path.basename(snapshot_path) != f"{fetched_at}.json":
            errs.append(f"{school_id}: {latest_file}'s fetchedAt ({fetched_at!r}) doesn't match its own filename")

        if entry.get("latestFetchedAt") != fetched_at:
            errs.append(f"{school_id}: manifest latestFetchedAt ({entry.get('latestFetchedAt')!r}) "
                        f"!= snapshot's own fetchedAt ({fetched_at!r})")

        players = snap.get("players")
        if not isinstance(players, list) or not players:
            errs.append(f"{school_id}: {latest_file} has no players array")
        else:
            for i, p in enumerate(players):
                pos = p.get("position") if isinstance(p, dict) else None
                if pos not in VALID_POSITIONS:
                    name = p.get("name", "?") if isinstance(p, dict) else "?"
                    errs.append(f"{school_id}: {latest_file} players[{i}] "
                                f"({name!r}) has invalid position {pos!r}")
            if snap.get("squadTotal") != len(players):
                errs.append(f"{school_id}: {latest_file} squadTotal ({snap.get('squadTotal')}) "
                            f"!= len(players) ({len(players)})")

    # ── coverage report — informational only, never fails ──
    all_ids = all_guide_school_ids(root)
    have_snapshot = set(manifest.keys())
    missing = sorted(set(all_ids) - have_snapshot)

    print(f"manifest has {len(manifest)} school(s); {len(all_ids)} school(s) in the guide.")
    if missing:
        print(f"{len(missing)} school(s) with no snapshot yet (expected during rollout, "
              f"no backfill — see CLAUDE.md Section 5):")
        preview = ", ".join(missing[:10])
        more = f", +{len(missing) - 10} more" if len(missing) > 10 else ""
        print(f"  {preview}{more}")
    else:
        print("every guide school has a snapshot.")

    print()
    if errs:
        print(f"ERRORS ({len(errs)}):")
        for e in errs:
            print(f"  {e}")
        print("\nFAIL")
        return 1

    print("PASS — manifest and every snapshot file it points at are well-formed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
