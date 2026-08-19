---
name: new-school
description: Sequence CLAUDE.md's Change Type 1 (Section 3a) workflow for adding a new school to this recruitment guide — research (Section 7 Phase 1, subsections 1A-1J), the file-by-file edit checklist (Phase 3, subsections 3A-3F, across 7 files plus CLAUDE.md's own reference table), and two bundled scripts that catch the specific cross-file gaps this repo's own change history keeps citing (a missed duplicate check, a school left in guideSchools/otherSchools limbo, a missing conf-prestige/pipeline/CLAUDE.md-table mention). Use this whenever the user asks to "add a school", "add [school name] to the guide", or wants to research and add a new college/JUCO to olivier-guide — even before they've picked a division or conference, since Phase 1A (confirm it isn't already in the guide) has to happen first.
---

# New School — olivier-guide Change Type 1

This is the single largest change type in CLAUDE.md, and its own Section 6
open-items log is full of instances where one file in a 7-file, 2-script edit
was quietly missed (DOMAINS/SITE_URLS/SOCIAL gaps, a school stuck in both
`guideSchools[]` and `otherSchools[]`, a `programsInGuide` string never
updated). This skill doesn't replace CLAUDE.md's own instructions — the
research and the writing are genuine judgment calls that stay entirely in
your hands — it sequences them in the right order and adds two scripts that
catch exactly the class of gap this repo has actually shipped before.

**Read CLAUDE.md Section 3a "CHANGE TYPE 1" and Section 7 before starting.**
This file points at that content by section number rather than repeating
it, so it doesn't go stale the next time CLAUDE.md's rubric changes.

## Sequence

### 1. Strategic gate — before any research time is spent

Confirm the school isn't already in the guide (CLAUDE.md Section 7 Phase
1A). Don't use a hand-typed `grep`/one-liner — CLAUDE.md's own text warns
that grepping raw JSON "misses compound IDs like tyler_jc." Use the bundled
script instead, which parses the JSON properly:

```bash
python .claude/skills/new-school/scripts/check_duplicate.py "school name"
```

Exit 0 + "safe to proceed" means go ahead. Exit 1 means a match was found —
per CLAUDE.md, that makes this a **data update** session on an existing
school, not an add-school session. Stop and re-scope before continuing.

### 2. Research — CLAUDE.md Section 7 Phase 1, subsections 1A-1J

Work through 1B (identity/structure) through 1J (pre-calculate every score)
in order. This is the genuinely judgment-heavy part — Tier-1 web research via
the Claude-in-Chrome MCP per Section 15's rules, writing the culture/rec
prose, scoring the dev/coach rubrics against Sections 5a/5d. Nothing here is
scriptable; follow CLAUDE.md directly. Output should be a scratch doc with
every field confirmed before you open any real file, per Phase 1's own rule
("Phase 3 is pure transcription — no research during data entry").

### 3. Sign-off — Phase 2

State the change type, every file you're about to touch, every tab you'll
verify, and the rollback plan, per Phase 2. Don't skip this even though it
feels like ceremony for a single school — it's what catches "wait, this also
needs a new conference entry" before you're three files in.

### 4. File edits — Phase 3, subsections 3A-3F

Work through 3A (conference JSON) through 3F (conf-prestige.json) in order.
**Also update CLAUDE.md's own "School -> File Reference Table" in Section
2** — Section 3a calls this mandatory for this change type and it is the
single easiest step to forget, since nothing in the app itself depends on
it. If `titles[]` or `proPlayers.mlsPicks5yr > 0`, also add the pipeline.json
entry (3B).

### 5. Cross-file coverage check (this is the part validate_schools.py and validate_consistency.js don't cover)

```bash
python .claude/skills/new-school/scripts/check_new_school_coverage.py --id <school_id>
```

This checks four things neither existing validator checks at all:
`conferences.json`'s `guideSchools[]` (and that the school isn't *also*
still sitting in some conference's `otherSchools[]` — the exact "most
frequently missed step" CLAUDE.md names), `conf-prestige.json`'s
`programsInGuide` string, `data/pipeline.json` (only checked when the school
actually has titles/MLS picks), and CLAUDE.md's own reference table.

**This script does best-effort substring/word matching, not exact
structural checks** — `conferences.json` and `conf-prestige.json` don't key
their entries by school id, only by free-form display text, so an exact
check isn't available. It's tuned against real data (it deliberately prefers
words from the school's `name` field over `full`, because `full` sometimes
contributes an overly generic word — the first version of this script
false-matched "UC Riverside" against "California Baptist" via the word
"California" pulled from "University of California, Riverside"). Read a
reported `MISSING` before trusting it; it usually means exactly what it
says, but a very short or unusual school name can occasionally confuse it.

### 6. Full validation — qa-suite

```bash
python .claude/skills/qa-suite/scripts/run_qa_suite.py
```

Runs `validate_schools.py`, `validate_consistency.js`, and syntax checks on
whatever you changed. Fix everything it reports before moving on — see the
`qa-suite` skill for what each step means.

### 7. Local browser test — Phase 5

Use CLAUDE.md's "Full Test Checklist" under "New / changed school" (Section
7 Phase 5) — card visible in the right section, modal opens with all 9 tabs,
fit score correct, coach ranked, map dot on the right state, and so on. This
needs a running server and an actual look at the app; nothing here
automates it.

### 8. Commit, deploy, verify live, end of session — Phases 6-8

Follow CLAUDE.md Section 7 Phases 6 through 8 directly: commit message
format `vXX.X — Add [School] ([Division], [Conference])`, push, wait for
GitHub Pages, repeat the Phase 5 checklist on the live site, then the End of
Session Protocol (CHANGELOG.md, the Section 6 state snapshot, `guideVersion`
bump).

## What this skill deliberately does not do

- It does not research the school, write any prose, or assign any score —
  that's Phase 1, and it's judgment work, not something to template.
- It does not edit any data file for you. It only checks what's already
  there and tells you what's missing.
- It does not replace `qa-suite` — run both; they check different things.
- It does not open a browser or run the Phase 5 checklist itself.
