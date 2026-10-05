#!/usr/bin/env python3
"""
build_patches.py — turn rosters collected in the browser (roster_extractor.js
-> roster_receiver.py -> rosters_inbox.json) into refresh_school.py patches,
with the sanity tests CLAUDE.md Section 15 asks for before a roster is trusted.

    python build_patches.py                    # preview every school in the inbox
    python build_patches.py --id duke --id unc # preview some
    python build_patches.py --id duke --apply  # write the patch and run refresh_school.py

Preview shows, per school: squad size, goalkeepers, the midfielder numbers the
roster gives against what is stored, and the Fit Score before and after.
A school with a failed sanity test is never applied unless --force names why
you looked and accepted it (the reason is printed, not stored).

Nothing here decides who is a midfielder: derive_minutes.py does (first-listed
position, CLAUDE.md Section 15). This script only shapes the data and refuses
rosters that look half-published.
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys
import tempfile

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import derive_minutes as dm  # noqa: E402

rx = dm.rx
INBOX = os.path.join(os.environ.get("ROSTER_INBOX")
                     or os.path.join(tempfile.gettempdir(), "olivier_roster_inbox"),
                     "rosters_inbox.json")
GK = {"GK", "G", "GOALKEEPER", "KEEPER", "GOALIE"}
DEF = {"D", "DF", "DEF", "DEFENDER", "DEFENSE", "B", "BACK", "CB", "LB", "RB", "CENTERBACK",
       "CENTREBACK", "FULLBACK", "OUTSIDEBACK", "LEFTBACK", "RIGHTBACK", "WINGBACK"}
FWD = {"F", "FW", "FWD", "FORWARD", "ST", "STRIKER", "W", "WINGER", "WING", "ATT", "ATTACKER"}


def first_token(pos):
    parts = [re.sub(r"[^A-Z]", "", p) for p in re.split(r"[\/\-,&]| or ", (pos or "").upper())]
    parts = [p for p in parts if p]
    return parts[0] if parts else ""


def enum_position(pos):
    t = first_token(pos)
    if t in GK:
        return "GK"
    if t in rx.MF_TOKENS:
        return "MF"
    if t in DEF:
        return "D"
    if t in FWD:
        return "F"
    return "OTHER"


def to_full_roster(rec):
    out = []
    for p in rec["players"]:
        home, prev = (p.get("hometown") or "").strip(), (p.get("prev") or "").strip()
        # One column holding "Hometown / Last School" (SMU): split it.
        if "/" in prev and (not home or home == prev or prev.startswith(home.split("/")[0].strip())):
            a, _, b = prev.partition("/")
            home, prev = a.strip(), b.strip()
        out.append({
            "name": p["name"],
            "position": enum_position(p["pos"]),
            "positionAsListed": p["pos"],
            "class": p["cls"],
            "hometown": home,
            "previousSchool": (prev or None),
        })
        if p.get("hs"):
            out[-1]["highSchool"] = p["hs"]
    return out


def sanity(school, rec, roster, d):
    bad = []
    n = len(roster)
    if not 22 <= n <= 40:
        bad.append("squad size %d is outside 22-40" % n)
    if not 2 <= d["gk"] <= 6:
        bad.append("%d goalkeeper(s)" % d["gk"])
    other = sorted({p["positionAsListed"] for p in roster if p["position"] == "OTHER"})
    if other:
        bad.append("unrecognised position label(s): %s" % other)
    if d["unknown_class"]:
        bad.append("midfielder(s) with no usable class year: %s" % d["unknown_class"])
    blank = [p["name"] for p in roster if not p["class"]]
    if blank:
        bad.append("%d player(s) with a blank class year" % len(blank))
    seasons = re.findall(r"20\d\d", rec.get("title") or "")
    if "2026" not in seasons:
        bad.append("page title does not show the 2026 season (%r): confirm the season by hand"
                   % (rec.get("title") or "")[:60])
    if n and d["mf_total"] / n > 0.45:
        bad.append("midfielders are %d%% of the squad" % round(100 * d["mf_total"] / n))
    return bad


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", action="append", default=[])
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--force", default="", help="reason a failed sanity test was accepted")
    ap.add_argument("--names", action="store_true", help="also list the derived names")
    args = ap.parse_args()

    box = json.loads(open(INBOX, encoding="utf-8").read())
    schools = dm.load_schools()
    athlete = json.loads(open(os.path.join(dm.ROOT, "athletes", "olivier.json"), encoding="utf-8").read())
    ids = args.id or sorted(box)
    rc = 0
    for sid in ids:
        if sid not in box or sid not in schools:
            print("%-16s not in the inbox / not a guide school" % sid)
            rc = 1
            continue
        path, school = schools[sid]
        rec = box[sid]
        roster = to_full_roster(rec)
        if not roster:
            print("%-16s EMPTY roster from %s" % (sid, rec.get("url")))
            rc = 1
            continue
        d = dm.derive(school, {"rosterSeason": "2026-27", "players": roster})
        new = dm.with_derived(school, d, athlete)
        mo = school.get("minutesOutlook") or {}
        bad = sanity(school, rec, roster, d)
        old_names = {dm.bare(n) for k in ("cleared_names", "rising_senior_2027_names",
                                          "rising_junior_2027_names") for n in mo.get(k) or []}
        gone = sorted(n for n in old_names if not dm.still_listed(n, [p["name"] for p in roster]))
        combined = sorted({p["positionAsListed"] for p in roster if re.search(r"[\/,&]", p["positionAsListed"])})
        print("%-16s %-8s squad=%-2d gk=%d  MF %s->%d  clr %s->%d  rsSr %s->%d  rsJr %s->%d  traj %s->%s  fit %s->%s%s"
              % (sid, rec.get("layout"), len(roster), d["gk"],
                 mo.get("mf_total"), d["mf_total"],
                 mo.get("cleared_before_2027"), len(d["cleared"]),
                 mo.get("rising_senior_2027_count"), len(d["rising_sr"]),
                 mo.get("rising_junior_2027_count"), len(d["rising_jr"]),
                 "/".join(str(t.get("pct")) for t in mo.get("trajectory") or []) or "-",
                 "/".join(str(t["pct"]) for t in d["trajectory"]),
                 school.get("fitOlivier"), new["fitOlivier"],
                 "  prevCol" if rec.get("hasPrevCol") else ""))
        if combined:
            print("      combined labels: %s" % ", ".join(combined))
        if gone:
            print("      stored midfielders not on this roster: %s" % ", ".join(gone))
        if args.names:
            for k in ("cleared", "rising_sr", "rising_jr"):
                print("      %-9s %s" % (k, ", ".join(d[k]) or "-"))
        for b in bad:
            print("      ! " + b)
        if not args.apply:
            continue
        if bad and not args.force:
            print("      NOT APPLIED (sanity test failed; re-run with --force \"reason\" after checking)")
            rc = 1
            continue
        if bad:
            print("      forced: %s" % args.force)
        patch = {"roster_season": "2026-27", "full_roster": roster,
                 "source_url": rec.get("url"), "fetch_method": "claude-desktop-browser-pane"}
        pfile = os.path.join(tempfile.gettempdir(), "olivier_roster_inbox", "patch_%s.json" % sid)
        with open(pfile, "w", encoding="utf-8") as f:
            json.dump(patch, f, ensure_ascii=False)
        r = subprocess.run([sys.executable, os.path.join(HERE, "refresh_school.py"),
                            "--file", os.path.relpath(path, dm.ROOT), "--id", sid, "--patch", pfile],
                           cwd=dm.ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("      " + (r.stdout + r.stderr).strip().replace("\n", "\n      "))
        rc = rc or r.returncode
    return rc


if __name__ == "__main__":
    sys.exit(main())
