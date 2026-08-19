#!/usr/bin/env python3
"""
run_qa_suite.py — CLAUDE.md Section 7 Phase 4 validation, bundled into one command.

Runs, in order, and STOPS at the first failing step:
  1. python validate_schools.py
  2. node validate_consistency.js   (this validator has no exit code — it always
     exits 0 — so pass/fail is parsed from its own "Issues: N" line instead)
  3. python -m json.tool on every git-changed file under data/*.json or
     athletes/olivier.json
  4. node --check on every git-changed file under js/*.js
  5. (conditional) python negtest.py --suite negtests/checks.json — only when
     js/scores.js, js/app.js, or validate_consistency.js itself is among the
     changed files, since that suite exists to prove the VALIDATOR's own checks
     still fire when the code they check has moved, not to re-check ordinary
     data edits. negtest.py refuses to mutate a file that has uncommitted
     changes unless given --force; if one of its three target files is the
     thing you're mid-edit on, it will say so plainly and exit non-zero. That
     is negtest.py protecting your in-progress work, not a bug in this script.

This script only REPORTS. It never edits data, JS, or CLAUDE.md — matching
CLAUDE.md's "Do not proceed to Phase 5 if any validation fails": the person
running it decides what to fix, this just tells them exactly where to look.

Exit code 0 only if every step that ran passed.
"""

import io
import os
import re
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

NEGTEST_TRIGGER_FILES = {"js/scores.js", "js/app.js", "validate_consistency.js"}


def find_repo_root():
    """Walk up from cwd until a directory has both validate_schools.py and
    validate_consistency.js — avoids hardcoding a fixed folder depth from this
    script's own location, so the skill still works if it's ever copied or the
    tree gets reorganized."""
    d = os.getcwd()
    for _ in range(6):
        if os.path.exists(os.path.join(d, "validate_schools.py")) and \
           os.path.exists(os.path.join(d, "validate_consistency.js")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None


ROOT = find_repo_root()
if ROOT is None:
    print("Could not find validate_schools.py + validate_consistency.js in this "
          "directory or any parent. Run this from inside the olivier-guide repo.")
    sys.exit(2)


def run(cmd, timeout=300):
    # On Windows, a child Python process's stdout defaults to the console
    # codepage (often cp1252), not UTF-8 — so validate_schools.py's own "—"
    # and "§" characters come out as cp1252 bytes. node's stdout is UTF-8
    # already. Forcing PYTHONIOENCODING/PYTHONUTF8 on the child makes both
    # sources agree on UTF-8, so decoding here with encoding="utf-8" is
    # correct instead of mangling one side or the other (§5a -> Â§5a etc.).
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout, env=env)


def banner(n, title):
    print(f"\n{'=' * 70}\nSTEP {n} — {title}\n{'=' * 70}")


def git_changed_files():
    """Non-deleted paths that are staged, modified, or untracked. Returns None
    if this isn't a git repo (git status errors) rather than an empty list, so
    callers can tell 'nothing changed' apart from 'couldn't check'."""
    p = run(["git", "status", "--porcelain"])
    if p.returncode != 0:
        return None
    files = []
    for line in p.stdout.splitlines():
        if not line.strip():
            continue
        status, path = line[:2], line[3:]
        if "->" in path:  # rename: "old -> new"
            path = path.split("->")[-1].strip()
        if status.strip().startswith("D"):
            continue
        files.append(path.strip().strip('"'))
    return files


def step1_validate_schools():
    banner(1, "python validate_schools.py")
    p = run([sys.executable, "validate_schools.py"])
    out = (p.stdout or "") + (p.stderr or "")
    print(out.rstrip())
    return p.returncode == 0


def step2_validate_consistency():
    banner(2, "node validate_consistency.js")
    p = run(["node", "validate_consistency.js"])
    out = (p.stdout or "") + (p.stderr or "")
    print(out.rstrip())
    issues = None
    for line in out.splitlines():
        if line.strip().startswith("Issues:"):
            m = re.search(r"Issues:\s*(\d+)", line)
            if m:
                issues = int(m.group(1))
    if issues is None:
        print("\n!! Could not find an 'Issues: N' line in the output — treating "
              "as a failure since pass/fail can't be confirmed (this validator "
              "always exits 0 regardless of outcome, so the printed line is the "
              "only signal).")
        return False
    if issues != 0:
        print(f"\n!! Issues: {issues} — must be 0 before committing (CLAUDE.md "
              f"baseline: this count must never increase from a session's changes).")
        return False
    return True


def step3_json_tool(changed):
    banner(3, "python -m json.tool on changed data files")
    targets = sorted(f for f in changed
                      if (f.startswith("data/") and f.endswith(".json"))
                      or f == "athletes/olivier.json")
    if not targets:
        print("(no changed files under data/*.json or athletes/olivier.json)")
        return True
    ok = True
    for f in targets:
        full = os.path.join(ROOT, f)
        if not os.path.exists(full):
            print(f"  SKIP  {f}  (deleted or moved since git status)")
            continue
        p = run([sys.executable, "-m", "json.tool", f])
        if p.returncode == 0:
            print(f"  ok    {f}")
        else:
            print(f"  FAIL  {f}")
            print("        " + (p.stderr or p.stdout or "").strip().replace("\n", "\n        "))
            ok = False
    return ok


def step4_node_check(changed):
    banner(4, "node --check on changed JS files")
    targets = sorted(f for f in changed if f.startswith("js/") and f.endswith(".js"))
    if not targets:
        print("(no changed files under js/*.js)")
        return True
    ok = True
    for f in targets:
        full = os.path.join(ROOT, f)
        if not os.path.exists(full):
            print(f"  SKIP  {f}  (deleted or moved since git status)")
            continue
        p = run(["node", "--check", f])
        if p.returncode == 0:
            print(f"  ok    {f}")
        else:
            print(f"  FAIL  {f}")
            print("        " + (p.stderr or p.stdout or "").strip().replace("\n", "\n        "))
            ok = False
    return ok


def step5_negtest(changed):
    banner(5, "negtest.py regression suite (conditional)")
    suite = os.path.join(ROOT, "negtests", "checks.json")
    if not os.path.exists(suite):
        print("(negtests/checks.json not found — skipping)")
        return True
    hit = NEGTEST_TRIGGER_FILES & set(changed)
    if not hit:
        print("skipped — only runs when js/scores.js, js/app.js, or "
              "validate_consistency.js itself has changed (this suite proves the "
              "validator's checks still fire against the real formula/renderer; "
              "it doesn't apply to ordinary data edits)")
        return True
    print(f"{', '.join(sorted(hit))} changed — running negtest.py to confirm the "
          f"validator's checks still fire (negtests/checks.json)")
    p = run([sys.executable, "negtest.py", "--suite", "negtests/checks.json"], timeout=600)
    out = (p.stdout or "") + (p.stderr or "")
    print(out.rstrip())
    return p.returncode == 0


def main():
    print(f"QA suite — repo root: {ROOT}")

    if not step1_validate_schools():
        print("\n>>> STOPPED at Step 1. Fix the errors above, then re-run the full suite.")
        return 1

    if not step2_validate_consistency():
        print("\n>>> STOPPED at Step 2. Fix the issues above, then re-run the full suite.")
        return 1

    changed = git_changed_files()
    if changed is None:
        print("\n(not a git repo, or `git status` failed — skipping steps 3-5, which "
              "scope themselves to git-changed files. Run json.tool / node --check "
              "manually on whatever you touched.)")
        print("\nSTEPS 1-2 PASSED. Steps 3-5 skipped (no git).")
        return 0

    if not step3_json_tool(changed):
        print("\n>>> STOPPED at Step 3. Fix the JSON above, then re-run the full suite.")
        return 1

    if not step4_node_check(changed):
        print("\n>>> STOPPED at Step 4. Fix the JS syntax above, then re-run the full suite.")
        return 1

    if not step5_negtest(changed):
        print("\n>>> STOPPED at Step 5. negtest.py reported at least one non-'ok' result "
              "above — but its four outcomes mean different things, so read which one "
              "occurred before deciding what to fix:\n"
              "      FAIL (CHECK-SILENT) — a real validator regression: the mutation applied "
              "but the expected check didn't fire. Fix the check in validate_consistency.js.\n"
              "      VOID (MUTATION-NOOP) — the test's own find-string no longer matches the "
              "file (a stale fixture in negtests/checks.json), not evidence of a real "
              "regression. Fix the fixture.\n"
              "      ERROR — usually means one of the suite's three target files "
              "(js/scores.js, js/app.js, data/conferences.json) currently has uncommitted "
              "changes; negtest.py refuses to mutate it. Commit/stash first, or accept this "
              "step can't run cleanly right now.")
        return 1

    print(f"\n{'=' * 70}\nALL STEPS PASSED — clear to proceed to Phase 5 (local browser test).\n{'=' * 70}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
