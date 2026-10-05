#!/usr/bin/env python3
"""
derive_minutes.py — rebuild a school's minutesOutlook numbers from its STORED
roster snapshot (data/rosters/), instead of from a hand-typed patch.

WHY THIS EXISTS (CLAUDE.md 6C, campaign "C0")
---------------------------------------------
Until v45.98 the guide stored the answer (mf_total and three lists of names)
and threw the evidence (the roster) away, so every rule change or doubt meant
going back to the school websites. With the roster on disk, the midfielder
count, the cleared / rising-senior / rising-junior names, recruit_risk, the
trajectory and the score cascade are all a pure function of the snapshot.

It has NO formulas of its own. Position and class-year rules come from
roster_extract.py (is_mf, bucket); the opportunity score, trajectory and
scores come from apply_roster_refresh.py. A second copy of any of them is
exactly the bug class validate_consistency.js's SCORES-SRC check removed.

MODES
-----
  (default)  compare derived values with what is stored; exit 1 on any
             difference in a snapshot that can be trusted (see labelsKept).
  --apply    write the derived facts and the score cascade into the school
             file. trajectoryNote / recruit_pathway_note are prose and are
             NOT rewritten: re-read them by hand afterwards.

WHICH SNAPSHOTS CAN BE TRUSTED
------------------------------
A snapshot is only a valid source when combined position labels were kept
as published ("M/D", "F/MF" in `positionAsListed`), because the owner rule
(2026-10-05) is that a player is a midfielder only when midfield is his
FIRST-listed position. Snapshots carrying `"labelsKept": true` are checked
strictly. Older ones (positions simplified to GK/D/MF/F) are reported with
--all for information but never fail and are never applied.

USAGE
-----
    python derive_minutes.py --id gonzaga
    python derive_minutes.py --all            # every school with a snapshot
    python derive_minutes.py --kept           # only labelsKept snapshots
    python derive_minutes.py --coverage       # who still needs a lossless read
    python derive_minutes.py --id gonzaga --apply
"""
import argparse
import copy
import glob
import io
import json
import os
import re
import sys

if __name__ == "__main__":   # never re-wrap when imported (it closes the caller's stdout)
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
    print("Could not find apply_roster_refresh.py. Run this inside the olivier-guide repo.")
    sys.exit(2)
sys.path.insert(0, ROOT)
import apply_roster_refresh as arr   # noqa: E402
import roster_extract as rx          # noqa: E402

MANIFEST = os.path.join(ROOT, "data", "rosters", "manifest.json")
TARGET_SEASON = "2026-27"            # the season whose roster projects to Aug 2027


def load_schools():
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*.json"))):
        try:
            d = json.loads(open(f, encoding="utf-8").read())
        except ValueError:
            continue
        if isinstance(d, list) and d and isinstance(d[0], dict) and "minutesOutlook" in d[0]:
            for s in d:
                out[s["id"]] = (f, s)
    return out


def load_snapshot(sid, manifest):
    e = manifest.get(sid)
    if not e:
        return None
    return json.loads(open(os.path.join(ROOT, e["latestFile"]), encoding="utf-8").read())


def published_position(p):
    """The label as the page printed it when we have it, else the stored enum."""
    return p.get("positionAsListed") or p.get("position") or ""


def bare(name):
    """'Jon Smith (Sr.)' / 'Jon Smith (So·M)' -> 'jon smith' for comparing."""
    return re.sub(r"\s+", " ", re.sub(r"\s*\(.*?\)\s*$", "", name or "")).strip().lower()


def name_tokens(name):
    """Accent-free word set of a name, ignoring nicknames in brackets, so
    'Erik Pena' = 'Erik Peña' and 'Tweneboa Kodua' fits 'Tweneboa (Bingo) Kodua'."""
    import unicodedata
    s = re.sub(r"\(.*?\)", " ", name or "")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return frozenset(re.findall(r"[a-z]+", s.lower()))


def still_listed(old_name, roster_names):
    """True if a stored name is on the roster, allowing an added middle name."""
    a = name_tokens(old_name)
    return bool(a) and any(a <= name_tokens(n) or name_tokens(n) <= a for n in roster_names if name_tokens(n))


def derive(school, snap):
    """-> dict of everything minutesOutlook stores that a roster determines."""
    juco = bool(school.get("juco2yr"))
    season = snap.get("rosterSeason")
    rx.JUCO_MODE = juco and season == TARGET_SEASON
    rx.JUCO_PRIOR_MODE = juco and season != TARGET_SEASON
    try:
        mfs = [p for p in snap["players"] if rx.is_mf(published_position(p))]
        b = {"cleared": [], "rising_sr": [], "rising_jr": [], "returning": [], "unknown": []}
        for p in mfs:
            b[rx.bucket(p.get("class"))].append(p["name"])
        # A midfielder whose class year the school does not publish anywhere
        # (St. John's prints "Rs." with no year) can carry "classUnverified":
        # "<what was checked>" in the snapshot. He stays in mf_total and in no
        # class group, and is no longer reported as a problem. Without the
        # field an unreadable class year still fails.
        accepted = {p["name"] for p in mfs if p.get("classUnverified")}
        b["unknown"] = [n for n in b["unknown"] if n not in accepted]
        # Listed with midfield as a SECOND position ("D/M", "Forward/Midfielder"):
        # not counted (first-listed rule), but named in the note so a reader can see why.
        second = [(p["name"], published_position(p)) for p in snap["players"]
                  if p not in mfs and any(
                      re.sub(r"[^A-Z]", "", t) in rx.MF_TOKENS
                      for t in re.split(r"[\/\-,&]| or ", published_position(p).upper())[1:])]
    finally:
        rx.JUCO_MODE = rx.JUCO_PRIOR_MODE = False

    mf_total = len(mfs)
    cleared = len(b["cleared"])
    if juco:
        _, traj = arr.juco_trajectory_for(cleared, mf_total)
    else:
        returning = mf_total - cleared - len(b["rising_sr"])
        opp = arr.opportunity_score(cleared, len(b["rising_sr"]), returning)
        _, traj = arr.trajectory_for(opp, juco=False)
    ret = mf_total - cleared
    gk = sum(1 for p in snap["players"] if (p.get("position") or "").upper() == "GK")
    return {
        "juco": juco, "season": season, "squad": len(snap["players"]), "gk": gk,
        "mf_total": mf_total,
        "cleared": b["cleared"], "rising_sr": b["rising_sr"], "rising_jr": b["rising_jr"],
        "unknown_class": b["unknown"], "second_position": second,
        "recruit_risk": "High" if ret >= 7 else "Medium" if ret >= 3 else "Low",
        "trajectory": traj,
    }


def _n(n, one, many):
    return "%d %s" % (n, one if n == 1 else many)


def _will(n, one, many):
    return "none will be %s" % many if n == 0 else "%d will be %s" % (n, one if n == 1 else many)


def standard_note(d):
    """The plain-language trajectoryNote, written from the numbers so it can
    never quote an older roster (the v45.50 prose-drift class). Hand-written
    colour belongs in rec / olivierMatch, not here."""
    m, c = d["mf_total"], len(d["cleared"])
    if d["juco"]:
        s = ("On the %s roster, %s of the %s %s who finish before Olivier arrives in August 2027."
             % (d["season"], "none" if c == 0 else "all" if c == m else c, _n(m, "midfielder", "midfielders"),
                "is a sophomore" if c == 1 else "are sophomores"))
        if 0 < c < m:
            s += " The other %s return for his first season." % _n(m - c, "freshman", "freshmen")
        elif c == 0:
            s = ("On the %s roster, all %s are freshmen who return for Olivier's first season in August 2027."
                 % (d["season"], _n(m, "midfielder", "midfielders")))
    else:
        sr, jr = len(d["rising_sr"]), len(d["rising_jr"])
        so = m - c - sr - jr
        # "N of M midfielders" is the exact wording validate_consistency.js's
        # ROSTER-PROSE check reads, so this sentence stays guarded.
        s = ("On the %s roster, %s %s before Olivier arrives in August 2027. In his first season, "
             "%s, %s and %s."
             % (d["season"],
                ("none of the %d midfielders" % m) if c == 0 else
                ("%d of %d %s" % (c, m, "midfielder" if m == 1 else "midfielders")),
                "finishes" if c == 1 else "finish",
                _will(sr, "a senior", "seniors"), _will(jr, "a junior", "juniors"),
                _will(so, "a sophomore", "sophomores")))
    sec = d.get("second_position") or []
    if sec:
        labels = sorted({lab for _n_, lab in sec})
        s += (" %s listed with midfield as a second position (%s) and %s not counted."
              % ("One more player is" if len(sec) == 1 else "%d more players are" % len(sec),
                 ", ".join(labels), "is" if len(sec) == 1 else "are"))
    return s


def with_derived(school, d, athlete):
    """A deep copy of the school with the derived facts and cascade applied."""
    s = copy.deepcopy(school)
    mo = s.setdefault("minutesOutlook", {})
    mo["available"] = True
    mo["mf_total"] = d["mf_total"]
    mo["roster_season"] = d["season"]
    mo["cleared_before_2027"] = len(d["cleared"])
    mo["cleared_names"] = list(d["cleared"])
    mo["rising_senior_2027_count"] = len(d["rising_sr"])
    mo["rising_senior_2027_names"] = list(d["rising_sr"])
    mo["rising_junior_2027_count"] = len(d["rising_jr"])
    mo["rising_junior_2027_names"] = list(d["rising_jr"])
    mo["recruit_risk"] = d["recruit_risk"]
    mo["trajectory"] = d["trajectory"]
    s["lensScores"]["minutes"] = arr.js_round(arr.mo_score(s) * 100)
    s["fitOlivier"] = arr.fit_score(s, athlete)
    s["lensScores"]["overall"] = s["fitOlivier"]
    budget = athlete.get("budgetUSD") or (athlete["budgetAUD"] / athlete["fxRate"])
    afford = 1 - min(1, s["fin"]["costNum"] / budget)
    s["lensScores"]["value"] = arr.js_round(s["fitOlivier"] * 0.6 + afford * 40)
    return s


def problems(d):
    """Reasons a snapshot must not be trusted as-is (CLAUDE.md 15 sanity tests)."""
    out = []
    if d["unknown_class"]:
        out.append("midfielder(s) with no usable class year: " + ", ".join(d["unknown_class"]))
    if d["gk"] < 2:
        out.append("only %d goalkeeper(s) on the roster (half-published?)" % d["gk"])
    if not d["juco"] and d["season"] != TARGET_SEASON:
        out.append("snapshot season is %s, not %s" % (d["season"], TARGET_SEASON))
    return out


def diffs(school, new):
    """Human-readable differences between the stored school and the derived one."""
    out = []
    a, b = school.get("minutesOutlook") or {}, new["minutesOutlook"]
    if not a.get("available"):
        return ["stored minutesOutlook.available is false; the snapshot gives mf_total=%d"
                % b["mf_total"]]
    for k in ("mf_total", "roster_season", "cleared_before_2027",
              "rising_senior_2027_count", "rising_junior_2027_count", "recruit_risk"):
        if a.get(k) != b.get(k):
            out.append("%s: stored %r, roster gives %r" % (k, a.get(k), b.get(k)))
    for k in ("cleared_names", "rising_senior_2027_names", "rising_junior_2027_names"):
        sa, sb = {bare(n) for n in a.get(k) or []}, {bare(n) for n in b.get(k) or []}
        if sa != sb:
            out.append("%s: stored-only %s, roster-only %s"
                       % (k, sorted(sa - sb) or "-", sorted(sb - sa) or "-"))
    if a.get("trajectory") != b.get("trajectory"):
        out.append("trajectory: stored %s, roster gives %s"
                   % ("/".join(str(t.get("pct")) for t in a.get("trajectory") or []),
                      "/".join(str(t["pct"]) for t in b["trajectory"])))
    for label, x, y in (("fitOlivier", school.get("fitOlivier"), new["fitOlivier"]),
                        ("lensScores.minutes", school["lensScores"].get("minutes"), new["lensScores"]["minutes"]),
                        ("lensScores.overall", school["lensScores"].get("overall"), new["lensScores"]["overall"]),
                        ("lensScores.value", school["lensScores"].get("value"), new["lensScores"]["value"])):
        if x != y:
            out.append("%s: stored %r, roster gives %r" % (label, x, y))
    return out


def write_school(path, sid, new):
    raw = open(path, "rb").read()
    nl = "\r\n" if b"\r\n" in raw else "\n"
    schools = json.loads(raw.decode("utf-8"))
    for i, s in enumerate(schools):
        if s["id"] == sid:
            schools[i] = new
    text = json.dumps(schools, indent=2, ensure_ascii=False) + "\n"
    if nl == "\r\n":
        text = text.replace("\n", "\r\n")
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def coverage(schools, manifest):
    kept, lossy, none, off = [], [], [], []
    for sid, (_f, s) in sorted(schools.items()):
        if not (s.get("minutesOutlook") or {}).get("available"):
            off.append(sid)
        snap = load_snapshot(sid, manifest)
        if snap is None:
            none.append(sid)
        elif snap.get("labelsKept"):
            kept.append(sid)
        else:
            lossy.append(sid)
    print("schools: %d" % len(schools))
    print("  snapshot with labels kept (usable):        %d" % len(kept))
    print("  snapshot with simplified positions (re-read): %d" % len(lossy))
    print("  no snapshot (read):                         %d" % len(none))
    print("  (of all schools, minutesOutlook.available is false for %d)" % len(off))
    todo = sorted(lossy + none)
    four = [x for x in todo if not schools[x][1].get("juco2yr")]
    juco = [x for x in todo if schools[x][1].get("juco2yr")]
    print("\nstill to read, four-year (%d):\n  %s" % (len(four), ", ".join(four)))
    print("\nstill to read, junior college (%d):\n  %s" % (len(juco), ", ".join(juco)))


def source_check(schools, manifest, athlete):
    """The ROSTER-SRC check (CLAUDE.md 6C, C0 step 3), called by validate_consistency.js.

    Every school with minutesOutlook.available:true should be backed by a stored
    roster with labels kept, and its stored numbers must equal what that roster
    gives. No such roster yet = counted as pending (a backlog, not a failure,
    until the reading campaign is finished). A roster that disagrees = failure.
    """
    res = {"backed": 0, "pending": 0, "fail": []}
    for sid, (_p, school) in sorted(schools.items()):
        mo = school.get("minutesOutlook") or {}
        if not mo.get("available"):
            continue
        snap = load_snapshot(sid, manifest)
        if snap is None or not snap.get("labelsKept"):
            res["pending"] += 1
            continue
        if snap.get("rosterSeason") != mo.get("roster_season"):
            res["fail"].append("%s: stored roster_season %s but its roster snapshot is %s"
                               % (sid, mo.get("roster_season"), snap.get("rosterSeason")))
            continue
        d = derive(school, snap)
        why = problems(d) + diffs(school, with_derived(school, d, athlete))
        if why:
            res["fail"].append("%s: %s" % (sid, "; ".join(why)))
        else:
            res["backed"] += 1
    for sid in sorted(set(manifest) - set(schools)):
        res["fail"].append("%s: roster manifest entry for a school not in the guide" % sid)
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", action="append", default=[])
    ap.add_argument("--all", action="store_true", help="every school with a snapshot")
    ap.add_argument("--kept", action="store_true", help="every labelsKept snapshot")
    ap.add_argument("--coverage", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check-json", action="store_true",
                    help="machine-readable ROSTER-SRC result for validate_consistency.js")
    ap.add_argument("--quiet", action="store_true", help="print only schools that differ")
    ap.add_argument("--athlete", default=os.path.join(ROOT, "athletes", "olivier.json"))
    args = ap.parse_args()

    schools = load_schools()
    manifest = json.loads(open(MANIFEST, encoding="utf-8").read())
    if args.coverage:
        coverage(schools, manifest)
        return 0
    athlete = json.loads(open(args.athlete, encoding="utf-8").read())
    if args.check_json:
        print(json.dumps(source_check(schools, manifest, athlete), ensure_ascii=True))
        return 0

    ids = list(args.id)
    if args.all or args.kept:
        ids = sorted(manifest)
    if not ids:
        ap.error("give --id, --all, --kept or --coverage")

    bad = same = skipped = info = 0
    for sid in ids:
        if sid not in schools:
            print("%-28s NOT A GUIDE SCHOOL (stale manifest entry)" % sid)
            bad += 1
            continue
        path, school = schools[sid]
        snap = load_snapshot(sid, manifest)
        if snap is None:
            print("%-28s no snapshot" % sid)
            bad += 1
            continue
        strict = bool(snap.get("labelsKept"))
        if args.kept and not strict:
            continue
        d = derive(school, snap)
        new = with_derived(school, d, athlete)
        issues = problems(d)
        df = diffs(school, new)
        head = "%-28s %s mf=%-2d clr=%-2d rsSr=%-2d rsJr=%-2d %s" % (
            sid, snap["fetchedAt"], d["mf_total"], len(d["cleared"]), len(d["rising_sr"]),
            len(d["rising_jr"]), "/".join(str(t["pct"]) for t in d["trajectory"]))
        if not strict:
            info += 1
            if not args.quiet:
                print(head + "  [positions simplified: information only, %d difference(s)]" % len(df))
            continue
        if issues:
            skipped += 1
            print(head + "  NOT USABLE")
            for i in issues:
                print("      ! " + i)
            continue
        if not df:
            same += 1
            if not args.quiet:
                print(head + "  OK")
            continue
        if args.apply:
            write_school(path, sid, new)
            print(head + "  APPLIED")
        else:
            bad += 1
            print(head + "  DIFFERS")
        for x in df:
            print("      - " + x)

    print("\n%d match, %d differ, %d not usable, %d information-only" % (same, bad, skipped, info))
    if args.apply:
        print("Prose is not rewritten: re-read trajectoryNote / recruit_pathway_note for each APPLIED school.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
