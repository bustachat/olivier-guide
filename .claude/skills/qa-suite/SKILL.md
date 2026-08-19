---
name: qa-suite
description: Run this repo's full CLAUDE.md Section 7 Phase 4 pre-commit validation sequence (validate_schools.py, validate_consistency.js, json.tool on changed data files, node --check on changed JS, and a conditional negtest.py regression run) as one command instead of chaining them by hand. Use this whenever the user asks to "run qa", "run the qa suite", "validate before commit", "run phase 4", "check everything before I commit", or after finishing ANY change to files under data/, athletes/, or js/ in this repo — even if they didn't ask for validation by name, since CLAUDE.md treats skipping Phase 4 as a hard rule violation, not an optional step. Also trigger when the user asks "is it safe to commit" or "did I break anything" about this repo.
---

# QA Suite — olivier-guide Phase 4 validation

CLAUDE.md Section 7 says: **"Do not proceed to Phase 5 if any validation fails."**
This skill exists so that rule is one command instead of five commands a session
has to remember and sequence correctly by hand.

## Run it

```bash
python .claude/skills/qa-suite/scripts/run_qa_suite.py
```

Run from anywhere inside the repo — the script finds the repo root itself by
walking up until it finds `validate_schools.py` and `validate_consistency.js`
side by side, so it doesn't matter what the current working directory is.

## What it does, and why each step exists

1. **`python validate_schools.py`** — schema-level checks: duplicate IDs,
   `acuAlign` vs. `covered:true` mismatches, bad `rankClass`, missing required
   fields, and the other structural rules in CLAUDE.md Section 5.
2. **`node validate_consistency.js`** — the checks `validate_schools.py` can't
   do: stored `fitOlivier`/`lensScores` vs. what the live `scores.js` formula
   actually computes, prose-vs-data drift (PROSE check), conference chip
   coverage (CHIPS), and the rest of Section 7 Phase 4's list. **This script
   has no exit code of its own — it always exits 0** — so the skill parses its
   printed `Issues: N` line to decide pass/fail. If that line is missing, the
   skill treats it as a failure rather than guessing.
3. **`python -m json.tool`** on every file under `data/*.json` or
   `athletes/olivier.json` that `git status` shows as changed. Scoped to what
   you actually touched, not every JSON file in the repo, so this stays fast
   and the output stays readable.
4. **`node --check`** on every changed file under `js/*.js`, same scoping.
5. **`negtest.py --suite negtests/checks.json`**, but *only* when
   `js/scores.js`, `js/app.js`, or `validate_consistency.js` itself is among
   the changed files. That suite proves the validator's own checks still fire
   against the real formula/renderer — see CLAUDE.md's negtest.py section for
   why ("a validator's silence is only evidence if you've proven the mutation
   landed"). It doesn't apply to ordinary data edits, so it's skipped
   otherwise. It also has its own safety guard: it refuses to mutate a file
   that currently has uncommitted changes (that's normal if you're mid-edit
   on `js/scores.js` right now — it will say so and exit non-zero, which is
   the guard working, not a bug).

The script **stops at the first failing step** and tells you exactly what
failed and where — it does not run later steps on top of a known failure,
and it never tries to fix anything itself. Fixing is a judgment call CLAUDE.md
reserves for the session (which change type, which cascade, which file) —
this skill's job ends at giving an accurate, complete report.

## Reading the output

- `ALL STEPS PASSED — clear to proceed to Phase 5` means: safe to move on to
  the local browser test in CLAUDE.md Section 7 Phase 5, then commit per
  Phase 6. It does **not** mean Phase 5 (the actual browser check) can be
  skipped — this suite is static analysis, not a substitute for opening the
  app.
- Any `>>> STOPPED at Step N` means fix what's printed above it, then re-run
  the whole suite from the top — don't try to resume from the failed step,
  since an earlier fix can change what later steps see.
- `Issues: N` from Step 2 must be exactly 0 per CLAUDE.md's validator
  baseline — that count is treated as a ratchet that must never increase.

## What this skill deliberately does not do

- It does not run the Phase 5 browser checklist (Explore/Dashboard/Coaches/etc.)
  — that needs a running server and a human or browser-automation pass, not a
  static check.
- It does not stage or commit anything.
- It does not edit CLAUDE.md, data files, or JS to fix what it finds.
- It does not run `negtest.py` unconditionally — only when the files that
  suite is actually testing were touched, per the note above.
