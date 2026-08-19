---
name: add-coach
description: Sequence CLAUDE.md's Change Type 2 (Section 3a) workflow for adding or editing a coach in this recruitment guide's coaches.json — the single source of truth for all coach data since v44.27, with a mandatory full re-rank after any addition, removal, or score change. Bundles two checks nothing else in this repo runs: whether the rank field still matches overallScore order, and whether bio text hides a stale email or names a specific athlete (both real, previously-shipped bugs per CLAUDE.md v44.35 and v44.28). Use whenever the user asks to "add a coach", "update [coach name]'s info", "a coach change[d]" at some school, or wants to research/verify a head coach's details for this guide.
---

# Add / Update Coach — olivier-guide Change Type 2

`data/coaches.json` is the **sole** source of coach data (CLAUDE.md Section
4, since v44.27) — school objects in the 10 conference files never carry
their own `coach{}` sub-object. Every renderer looks a coach up live by
`schoolId`. That makes this simpler than Change Type 1 (one file, not seven)
but the re-rank step is easy to skip silently, and CLAUDE.md documents two
specific bio-text bugs (stale email, hardcoded athlete name) that no
existing validator catches. This skill's scripts exist for exactly those
two gaps.

**Read CLAUDE.md Section 3a "CHANGE TYPE 2" before starting** — this points
at it by section rather than repeating it.

## Sequence

### 1. Research (if new info, not just a rename)

Tier-1 only, per Section 15: the coach's own school staff page for name,
title, email, phone, bio, and record. Never guess an email or phone number
— if it isn't published, the field is `null`, not a guessed pattern (Section
15's own example: don't assume `firstname.lastname@school.edu` just because
colleagues follow that pattern).

If you're re-scoring `overallScore`, do it against the rubric in Section 5d
— read that section first. **Watch for the "Solomon trap"** it names
explicitly: if a coach's score change makes you doubt the *yardstick*
(not just that one coach's facts), that's a signal to re-score the whole
set in a dedicated session, not to nudge one value and re-rank around it.

### 2. Edit `data/coaches.json`

Add or update the entry. If `overallScore` changed, write
`overallScoreNote` (Section 5d, ~20+ chars, cites the CV/development
evidence) — its presence is what gates `validate_consistency.js`'s
COACH-RUBRIC check.

**Never re-add a `coach{}` sub-object to a school object** — that's a
one-way door closed in v44.27; both `validate_schools.py` and
`validate_consistency.js`'s COACH-SYNC check flag it if it reappears.

### 3. Re-rank ALL coaches — always, no exceptions

CLAUDE.md is explicit: "After any coach addition or removal, re-rank ALL
coaches by overallScore descending — no gaps in sequential numbering." Any
`overallScore` change also triggers this, not just an add/remove. Then
verify it actually landed correctly:

```bash
python .claude/skills/add-coach/scripts/check_coach_ranking.py
```

`validate_schools.py` only catches *duplicate* rank values. This catches
the two things it doesn't: gaps in the 1..N sequence, and a rank that no
longer matches score order (a score was edited but the rank field wasn't
updated to match — a genuine inversion, not just a tie).

### 4. Bio hygiene check

```bash
python .claude/skills/add-coach/scripts/check_coach_bio.py --id <coach_id>
```

Checks the one coach you touched for two specific bugs CLAUDE.md documents
by name and that no validator catches:

- **A stale email hidden in the bio prose.** (v44.35: St. Edward's `bio`
  ended with a hardcoded `"Email: byoung@stedwards.edu"` that a
  `contact.email`-only update would have left stale forever, since a
  contact-only change doesn't move `overallScore` and so never triggers the
  re-rank step that might have surfaced it another way.)
- **A bio that names a specific athlete.** (v44.28: `coaches.json` is
  athlete-agnostic — the same file regardless of which athlete's guide is
  loaded, per the multi-athlete architecture in Section 4. 15 bios were
  found hardcoding "Olivier" by name or a date tied to one athlete's
  `targetDeparture`.)

**Read every `EMAIL` finding before treating it as a bug — it isn't
automatically one.** A bio legitimately mentioning an assistant coach's
email alongside the head coach's own is not an error; the script can't
tell "a different, correctly-stated person's email" apart from "the head
coach's own old email disagreeing with the current contact.email" — that
takes reading the sentence. An `ATHLETE` finding is much closer to
certain: real athlete names essentially never belong in this file.

**Auditing the whole file** (no `--id`) is also worth doing occasionally —
Section 6 of CLAUDE.md says outright that "no systematic search for
further instances has been done" for this bug class beyond the two
originally-found cases.

### 5. Full validation — qa-suite

```bash
python .claude/skills/qa-suite/scripts/run_qa_suite.py
```

Runs `validate_schools.py` + `validate_consistency.js`, including the
COACH, COACH-SYNC, and (if `overallScoreNote` is present) COACH-RUBRIC
checks.

### 6. Verify every tab that reads a coach — CLAUDE.md Section 3a's own list

Every renderer looks the coach up live by `schoolId`, so all of these need
a look, not just Coaches & Staff:

- Coaches & Staff -> Rankings (name, rank, badge colour)
- Coaches & Staff -> Profiles (bio, staff array, contact)
- Coaches & Staff -> Outreach (contact details) — **only renders the
  shortlisted schools**, so a contact error elsewhere won't show up here
  even if it's real
- Explore Schools -> school modal -> Coach & Contact tab (name, title,
  contact, bio, rank badge)
- Explore Schools -> card footer ("Coach: [name]" line)
- Compare tab -> Head Coach row
- Dashboard -> shortlist panel's Email button (`mailto:` uses
  `getCoach(id)?.contact?.email`)

### 7. Commit

Per CLAUDE.md Section 3a Change Type 2 / Section 7 Phase 6.

## What this skill deliberately does not do

- It does not research or write bio text, or assign `overallScore` — that's
  Section 5d's rubric and Tier-1 research, both judgment work.
- It does not auto-fix an `EMAIL` or `ATHLETE` finding. Rewording is a
  judgment call (reword vs. remove vs. verify against a live source), and
  `EMAIL` findings specifically need a human read before acting — see
  Step 4.
- It does not replace `qa-suite` — run both.
