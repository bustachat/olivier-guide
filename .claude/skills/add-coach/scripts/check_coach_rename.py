#!/usr/bin/env python3
"""
check_coach_rename.py — after a head-coach change, find every text that still names
the previous coach.

Why (added v45.56): coaches.json is the only place coach data lives, but school
texts (rec, olivierMatch, confRecord notes, facilities, conference cards, section
intros) mention coaches by name in prose. In v45.50 four schools still named a
departed or interim coach after coaches.json had been corrected — Connors State
("vacant"), NEO A&M ("interim"), NOC-Enid (Bassoff) and Illinois Central (Carreno).
Nothing flagged them, because no check reads prose for coach names.

USAGE
    python check_coach_rename.py                # compare working copy to HEAD
    python check_coach_rename.py --since v45.40 # compare to any git ref

For every schoolId whose coach name differs from the ref, the old coach's surname
is searched across data/*.json, athletes/olivier.json, js/app.js and index.html.
Each hit is printed with its school and field. Some hits are legitimate history
("succeeded X in 2024"); read them, then reword the rest.

Exit code 0 if there are no renamed coaches or no hits, 1 if hits need reading.
"""
import argparse, glob, io, json, os, re, subprocess, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


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


def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")
    elif isinstance(obj, str):
        yield path, obj


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--since", default="HEAD", help="git ref to compare coaches.json against (default HEAD)")
    args = ap.parse_args()
    root = find_repo_root()
    if root is None:
        print("Run this from inside the olivier-guide repo.")
        return 2
    try:
        old_raw = subprocess.run(["git", "show", f"{args.since}:data/coaches.json"], cwd=root,
                                 capture_output=True, check=True).stdout.decode("utf-8")
    except subprocess.CalledProcessError:
        print(f"Could not read data/coaches.json at {args.since}.")
        return 2
    old = {c["schoolId"]: c.get("name", "") for c in json.loads(old_raw)}
    new = {c["schoolId"]: c.get("name", "") for c in json.load(open(os.path.join(root, "data", "coaches.json"), encoding="utf-8"))}
    renamed = {sid: (old[sid], new[sid]) for sid in new if sid in old and old[sid] != new[sid]}
    if not renamed:
        print(f"No head-coach name changes since {args.since}.")
        return 0

    sources = []
    for f in sorted(glob.glob(os.path.join(root, "data", "*.json"))) + [os.path.join(root, "athletes", "olivier.json")]:
        if os.path.basename(f) == "coaches.json":
            continue
        data = json.load(open(f, encoding="utf-8"))
        for rec in (data if isinstance(data, list) else [data]):
            rid = rec.get("id", "?") if isinstance(rec, dict) else "?"
            for p, v in walk(rec):
                sources.append((os.path.relpath(f, root), rid, p, v))
    for f in ("js/app.js", "index.html"):
        for i, line in enumerate(open(os.path.join(root, f), encoding="utf-8"), 1):
            sources.append((f, "-", f"line {i}", line))

    hits = 0
    for sid, (was, now) in renamed.items():
        surname = [w for w in re.findall(r"[A-Za-z'\-]+", was) if len(w) > 2 and w.lower() not in {"dr", "jr", "sr", "vacant", "interim"}]
        print(f"\n{sid}: '{was}' -> '{now}'")
        if not surname:
            print("  (old name has no searchable surname — skipped)")
            continue
        token = surname[-1]
        rx = re.compile(r"\b" + re.escape(token) + r"\b")
        for f, rid, p, v in sources:
            if rx.search(v):
                hits += 1
                m = rx.search(v)
                print(f"  {f}  {rid}  {p}: ...{v[max(0, m.start() - 70):m.end() + 50].strip()}...")
    if hits:
        print(f"\n{hits} mention(s) of previous coaches. Read each one: keep real history, reword anything that still presents them as the current coach.")
        return 1
    print("\nNo mentions of previous coaches found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
