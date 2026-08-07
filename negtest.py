#!/usr/bin/env python3
"""
negtest.py — prove a validator check actually FIRES, and prove your test really ran.

WHY THIS EXISTS
---------------
v44.50 added the MAXAID check and negative-tested all five of its branches. The
FIRST of those tests PASSED and proved nothing.

The patch string used a 6-space indent where data/conferences.json uses 4, so
`str.replace()` was a silent no-op: the file never changed, the validator ran
against clean data, and it printed `Issues: 0`. Which is EXACTLY what a working
check on clean data prints. It was caught only by noticing that the other four
mutations fired and that one didn't.

So the rule this script enforces mechanically:

    A validator's silence is only evidence if you have proven the mutation landed.

An unapplied patch and a broken check are indistinguishable from the outside.
This script makes the difference impossible to miss: if the file did not change,
it reports MUTATION-NOOP and never even runs the validator, so the result can
never be mistaken for a pass.

WHAT IT GUARANTEES
------------------
1. Refuses to start if the target file has uncommitted changes — so a crash can
   never lose your work. (--force to override, e.g. mid-session on a dirty tree.)
2. Asserts the replacement actually changed the file. No change => MUTATION-NOOP.
3. Runs `node validate_consistency.js` and looks for the expected check code.
4. ALWAYS restores the file, in a finally block, even on exception or Ctrl-C.
5. Distinguishes three outcomes that are easy to conflate:
     PASS            mutation applied AND the expected check fired
     CHECK-SILENT    mutation applied but the check did NOT fire  <- the real failure
     MUTATION-NOOP   the patch did not apply; the test proved nothing

USAGE
-----
Single case:

    python negtest.py --file data/conferences.json \\
                      --find '"maxAid": "9.9",' --replace '' \\
                      --expect MAXAID

A suite, so every branch of a new check is proven in one run (JSON list of cases):

    python negtest.py --suite negtests/maxaid.json

    [ {"name":"missing field",  "file":"data/conferences.json",
       "find":"    \\"maxAid\\": \\"9.9\\",\\n", "replace":"", "expect":"MAXAID"},
      {"name":"empty string",   "file":"data/conferences.json",
       "find":"\\"maxAid\\": \\"9.9\\",", "replace":"\\"maxAid\\": \\"\\",", "expect":"MAXAID"} ]

Exit code 0 only if every case is PASS. Non-zero means at least one case did not
prove what it claimed — including a no-op patch.
"""

import argparse
import io
import json
import os
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
VALIDATOR = ["node", "validate_consistency.js"]


def git_is_clean(relpath):
    try:
        out = subprocess.run(["git", "status", "--porcelain", "--", relpath],
                             cwd=ROOT, capture_output=True, text=True, timeout=60)
        return out.stdout.strip() == ""
    except Exception:
        return True  # not a git repo / git unavailable — don't block the test


def run_validator():
    """Return (stdout+stderr, issues_count_or_None)."""
    p = subprocess.run(VALIDATOR, cwd=ROOT, capture_output=True, text=True, timeout=300)
    text = (p.stdout or "") + (p.stderr or "")
    issues = None
    for line in text.splitlines():
        if line.startswith("Issues:"):
            try:
                issues = int(line.split(":")[1].strip().split()[0])
            except Exception:
                pass
    return text, issues


def one_case(case, occurrences, force):
    name = case.get("name") or f"{case['file']} :: {case['find'][:40]}"
    rel = case["file"]
    target = os.path.join(ROOT, rel)

    if not os.path.exists(target):
        return "ERROR", f"no such file: {rel}", None

    if not force and not git_is_clean(rel):
        return ("ERROR",
                f"{rel} has uncommitted changes — commit or stash first, or pass --force "
                f"(this guard exists so a crash cannot lose your work)", None)

    original = open(target, encoding="utf-8", newline="").read()
    try:
        mutated = original.replace(case["find"], case.get("replace", ""), occurrences)

        # THE WHOLE POINT. A no-op patch must never reach the validator, because its
        # "Issues: 0" would be indistinguishable from a check that works.
        if mutated == original:
            return ("MUTATION-NOOP",
                    "the find string is not present verbatim, so the file was unchanged and "
                    "this test proved NOTHING. Check whitespace/indentation — v44.50's first "
                    "negative test failed exactly here (6-space patch, 4-space file).", None)

        open(target, "w", encoding="utf-8", newline="").write(mutated)
        text, issues = run_validator()
        expect = case["expect"]
        fired = f"[{expect}]" in text or expect in text

        if fired:
            return "PASS", f"[{expect}] fired (Issues: {issues})", issues
        return ("CHECK-SILENT",
                f"mutation APPLIED but [{expect}] did not fire (Issues: {issues}) — "
                f"the check does not cover this case", issues)
    finally:
        # Always restore, even on exception or KeyboardInterrupt.
        open(target, "w", encoding="utf-8", newline="").write(original)


def main():
    ap = argparse.ArgumentParser(
        description="Prove a validator check fires — and prove the mutation actually applied.",
        epilog="A validator's silence is only evidence if you proved the mutation landed.",
    )
    ap.add_argument("--suite", help="JSON file containing a list of cases")
    ap.add_argument("--file", help="single case: path relative to repo root")
    ap.add_argument("--find", help="single case: exact string to replace (verbatim, whitespace matters)")
    ap.add_argument("--replace", default="", help="single case: replacement (default: delete)")
    ap.add_argument("--expect", help="single case: check code expected to fire, e.g. MAXAID")
    ap.add_argument("--occurrences", type=int, default=1, help="how many occurrences to replace (default 1)")
    ap.add_argument("--force", action="store_true", help="allow running against a file with uncommitted changes")
    args = ap.parse_args()

    if args.suite:
        cases = json.load(open(os.path.join(ROOT, args.suite), encoding="utf-8"))
    elif args.file and args.find is not None and args.expect:
        cases = [dict(file=args.file, find=args.find, replace=args.replace,
                      expect=args.expect, name="single case")]
    else:
        ap.error("give --suite, or all of --file/--find/--expect")

    # Baseline: the validator must be green before we start, or every result is noise.
    base_text, base_issues = run_validator()
    print(f"baseline: Issues: {base_issues}")
    if base_issues != 0:
        print("  !! baseline is not 0 — fix that first; otherwise a 'fired' result may be pre-existing noise.")

    print(f"\nrunning {len(cases)} negative test(s)\n" + "=" * 92)
    results = []
    for c in cases:
        status, detail, _ = one_case(c, args.occurrences, args.force)
        results.append((c.get("name", "?"), status, detail))
        mark = {"PASS": "  ok  ", "CHECK-SILENT": " FAIL ", "MUTATION-NOOP": " VOID ", "ERROR": "ERROR "}[status]
        print(f"[{mark}] {c.get('name','?')}\n          {detail}")

    print("=" * 92)
    after_text, after_issues = run_validator()
    print(f"restored: Issues: {after_issues}" + ("" if after_issues == base_issues
          else f"   !! DOES NOT MATCH BASELINE {base_issues} — a file may not have been restored"))

    bad = [r for r in results if r[1] != "PASS"]
    print(f"\n{len(results)-len(bad)}/{len(results)} proven"
          + (f" · {len(bad)} did not prove what they claimed" if bad else " · all branches proven"))
    return 1 if bad or after_issues != base_issues else 0


if __name__ == "__main__":
    sys.exit(main())
