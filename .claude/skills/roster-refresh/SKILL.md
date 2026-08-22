---
name: roster-refresh
description: Sequence CLAUDE.md's Change Type 3 (Section 3a) workflow for refreshing a school's minutesOutlook — a single-school cascade calculator (fitOlivier/lensScores, both the 4-year and JUCO trajectory formulas), an arithmetic/name-array consistency check, a jargon-leak sweep on trajectoryNote/recruit_pathway_note, a JUCO trajectory-formula consistency check, and a mandatory coach spot-check gate. Also captures unexpected roster departures into a queue file for the companion transfer-tracking skill. Use whenever the user asks to "refresh a roster", "update minutesOutlook for [school]", "re-check [school]'s roster", or wants to research and apply a school's current-season midfielder roster to this guide.
---

# Roster Refresh — olivier-guide Change Type 3

**Read CLAUDE.md Section 3a "CHANGE TYPE 3" first** — the cascade order it
specifies is strict (minutesOutlook -> lensScores.minutes -> lensScores.
overall -> fitOlivier -> lensScores.value -> UI prose), and JUCOs follow a
DIFFERENT rule from 4-year schools (Section 3a's own JUCO warning: class-year
semantics invert on a 2-year roster, and a JUCO's trajectory uses the
logistic-curve formula from Section 14, not the 4-year Opportunity Score
table). This file sequences the workflow and points at CLAUDE.md by section
rather than repeating it.

## Sequence

### 1. Research — Tier-1 only, real browser only

CLAUDE.md Rule 0 (Section 15): Claude for Chrome MCP, never a `WebFetch`
summary — proven to return wrong facts on exactly these pages. Confirm
active current-season roster data (not a stale prior-season page — see
Section 15's "published != populated" trap and the goalkeeper/midfielder-
share sanity check). Bucket midfielders into `cleared` / `rising_sr` /
`rising_jr` per Section 15's class-year rules, watching the documented
regex traps: ordinal years (`1st`-`5th`), `Fy.` (Ivy first-years), and
`Redshirt Sophomore`-style strings that a `^`-anchored match silently
drops.

**Also record every player on the page, not just midfielders — this is now
the standard step, not an extra one.** You're already reading the whole
roster to find the midfielders; capture the rest (name, position, class,
hometown, previous school if published) into the patch's `full_roster`
field alongside the buckets above. Normalize `position` to one of
`GK`/`D`/`MF`/`F`/`OTHER` — see CLAUDE.md Section 5's "Roster Snapshot
Archive" for the exact shape and why it exists (it's the raw archive a
future non-midfielder athlete profile, or a future database migration,
would be built from). No new browser visit, no extra research time — just
don't discard what's already on screen.

### 2. Apply the refresh — the calculator, not hand arithmetic

```bash
python .claude/skills/roster-refresh/scripts/refresh_school.py \
  --file data/juco.json --id <school_id> --patch patch.json
```

Write your research into a small JSON patch file first (see the script's own
docstring for the exact shape — `mf_total`, `roster_season`, `cleared`,
`rising_sr`, `rising_jr`, plus optional `recruit_risk`/`pathway`/
`pathway_note`/`trajectory_note`/`juco`/`facts_only`). The script:

- Recomputes the cascade using the SAME formulas `js/scores.js` uses —
  imported directly from `apply_roster_refresh.py`, never re-derived, so
  there's no chance of a hand-typed `fitOlivier` drifting from the real
  formula (this repo has an explicit rule against a second copy of any
  scoring formula ever existing).
- Picks the right trajectory formula automatically: the 4-year Opportunity
  Score table, or the JUCO logistic curve (Section 14), based on `--juco`
  in the patch.
- Set `"facts_only": true` in the patch for the established "refresh the
  roster counts, leave the trajectory alone" pattern (Section 3a's own JUCO
  note explains when this applies). **If you do this, the note fields must
  say so in plain language** — see step 4 below; this is not optional,
  it's the exact bug this skill's own build surfaced twice (see step 4).
- **Snapshots the OLD `rising_senior_2027_names`/`rising_junior_2027_names`
  before overwriting them**, diffs against the new roster, and queues any
  name that was expected to still be around but isn't anywhere in the new
  buckets to `roster_moves_queue.json` at repo root. This is the interface
  into the companion **transfer-tracking** skill — don't hand-track
  departures yourself, the calculator already does it as a byproduct.
- **Preserves the target file's existing line-ending convention** (LF or
  CRLF — `data/*.json` is not uniform across this repo; forcing one would
  silently mass-convert a file that uses the other).
- **If the patch includes `full_roster`, archives it** to
  `data/rosters/{id}/{fetchedAt}.json` and updates `data/rosters/manifest
  .json` — `fetchedAt` is always today's real date, computed by the script
  itself, never taken from the patch. Fully optional and additive: a patch
  without `full_roster` behaves exactly as before this existed. See CLAUDE
  .md Section 5's "Roster Snapshot Archive" for the schema.

Use `--dry-run` first to see the computed cascade and any detected
departures without writing anything.

### 3. Validate the cascade

```bash
python .claude/skills/roster-refresh/scripts/check_roster_arithmetic.py
python .claude/skills/roster-refresh/scripts/check_juco_trajectory.py   # JUCO only
python .claude/skills/roster-refresh/scripts/check_no_jargon.py
python .claude/skills/roster-refresh/scripts/check_roster_snapshot.py   # only if full_roster was used
```

- **`check_roster_arithmetic.py`** checks `cleared + rising_sr + rising_jr
  <= mf_total` (an inequality, not equality — tested against all 158
  `available:true` schools before this was built: only 51 sum exactly, the
  other 107 legitimately have an untracked freshman group `mf_total`
  accounts for but no bucket names). It also warns — never fails — on a
  `*_count` that doesn't match its own `*_names[]` array length, since a
  real accepted exception already exists in the data (`monroe_college`
  uses one collective placeholder string for 2 untracked freshmen).
- **`check_juco_trajectory.py`** (JUCO schools only) verifies the stored
  `trajectory[].pct` actually matches what the Section 14 formula computes
  from the stored `cleared_before_2027`/`mf_total` — a check that exists
  nowhere else (the FIT check verifies scores are consistent with whatever
  trajectory is stored, never that the trajectory itself is right). This
  is a report, not a gate — a mismatch can be a legitimate, disclosed
  `facts_only` state; read the note before treating it as a bug.
- **`check_no_jargon.py`** sweeps `trajectoryNote`/`recruit_pathway_note`
  for leaked internal jargon (§-references, `CLAUDE.md`, backtick code
  identifiers, ALL_CAPS constant names, the internal "MIXED VINTAGE"
  marker). Both fields render **verbatim** on the live Minutes Outlook tab.
  CLAUDE.md documents this exact bug once already (v44.89) — and while
  building this skill, the check found it had recurred: `neosho_county_cc`
  and `lsu_eunice` were still disclosing a "trajectory deliberately not
  recomputed, pending calibration" caveat that became **false** the moment
  Section 14's real JUCO formula shipped and their numbers were
  recalculated. Both were fixed in the same session this script was built,
  and are now the checker's proof case.
- **`check_roster_snapshot.py`** — only relevant if you used `full_roster`
  this session. Validates `data/rosters/manifest.json` and every snapshot
  file it points at (real file exists, `fetchedAt` is a valid date matching
  its own filename, every `position` is a valid enum value). Also reports
  — never fails on — which guide schools have no snapshot yet; that's
  expected for a long time, since this archive has no backfill and builds
  up one refresh at a time.

### 4. Coach spot-check — mandatory, not optional

CLAUDE.md Section 3a's own rule (added v44.88, after a batch that claimed
this step "done" for 10 schools when only 1 was genuinely checked): a roster
refresh only touches roster data, so **in the same session**, visit the
school's official **coaches/staff page** (not the roster page's "Coaching
Staff" section, which often lists an assistant, not the head coach) via
Claude for Chrome, and cross-check name/title against `coaches.json`.

```bash
python .claude/skills/add-coach/scripts/check_coach_bio.py --id <coach_id>
```

**This does not replace the live-page visit — nothing can.** There is no
structured "verified" field anywhere in `coaches.json` (checked while
building this skill: the word "verified" appears exactly once, as free
prose inside one `overallScoreNote`, never as a real field) — so today,
proof that this step happened lives only in the session's own commit
message and CHANGELOG entry. Say explicitly, in your own output, which
schools' coaches you visited and confirmed.

### 5. Full validation — qa-suite

```bash
python .claude/skills/qa-suite/scripts/run_qa_suite.py
```

### 6. Local browser test, commit, deploy, verify live — Phases 5-7

Per CLAUDE.md Section 3a Change Type 3's own tab list (Minutes Outlook tab,
Explore fitOlivier/sort order, Dashboard lens bars, Coaches Rankings/
Profiles still matching) and Section 7 Phases 5-7.

## The departure queue — what happens to it

`roster_moves_queue.json` (repo root) accumulates entries like:

```json
{
  "name": "Zach Neuls",
  "origin_school_id": "ucla",
  "origin_file": "data/big-ten.json",
  "seen_in_roster_season": "2026-27",
  "absent_as_of_roster_season": "2026-27",
  "status": "pending"
}
```

This file is intentionally **not** part of the rendered app schema — it's a
working queue, not athlete-facing data, matching the same discipline that
keeps internal process notes out of `trajectoryNote` (step 3 above). The
companion `transfer-tracking` skill consumes it: a cheap cross-school
duplicate-name scan for in-guide moves, then Section 5b's existing Tier-1
verification process (TopDrawerSoccer-style discovery, confirmed on the
destination's own roster, division checked against the NCAA directory) for
anyone not found in-guide. Don't hand-research a queued name yourself —
that's the next skill's job, run after a full refresh wave completes, not
per-school.

## What this skill deliberately does not do

- It does not fetch or scrape a live roster — that's Tier-1 browser research,
  entirely your judgment call on source and read method (Section 15).
- It does not search for where a departed player went — that's
  `transfer-tracking`, and it runs after a wave, not per-school.
- It does not touch `coaches.json` beyond the read-only spot-check above —
  see the `add-coach` skill for actually editing a coach entry.
- It does not write CHANGELOG.md, bump `guideVersion`, or update CLAUDE.md's
  Section 6 state snapshot — Phase 8's End of Session Protocol, done by hand.
