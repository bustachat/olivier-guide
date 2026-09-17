---
name: mls-pipeline
description: Annual check (tied to the MLS SuperDraft calendar, not a roster-refresh wave) that cross-references this year's draft picks against every name this guide can still see — the current roster snapshot plus the roster-moves departure queue — to catch a JUCO-to-D1 transfer whose eventual draft credit would otherwise land invisibly on a school this guide doesn't track. Use when the user asks to "check the MLS draft", "update the pipeline for this year's draft", "see if any tracked player got drafted", or wants to reconcile pipeline.json's mlsDraft table against new SuperDraft results.
---

# MLS Pipeline — annual draft cross-reference

Kept as its own skill rather than folded into `transfer-tracking`, on
purpose: the trigger is different (the SuperDraft happens once a year, on
its own calendar, not tied to a refresh wave), the data source is different
(`pipeline.json`'s `mlsDraft[]`, not `proPlayers.nextLevel`), and the time
lag is different — CLAUDE.md Section 5b's own canonical example (Edouard
Nys: two seasons at Northeast CC, transferred to UIC, drafted 2nd round out
of UIC) shows draft credit can land 1-3 years after the transfer that
actually mattered for this guide.

## The real limitation — read before trusting a "no match"

**This repo keeps no persistent all-time roster archive.** Confirmed while
building the companion skills: `minutesOutlook`'s name arrays get
overwritten every refresh cycle, so a player's name is only findable if it's
still sitting in the *current* snapshot, or if `roster-refresh`'s departure
detection already caught them leaving and queued it. A player who passed
through a tracked school years before this tooling existed, or who left
without ever tripping the departure-detection logic, is invisible to this
skill. Run it every year anyway — coverage only grows over time as more
refreshes and more queue history accumulate — but treat "no match" as "not
found in what we can currently see," never as proof no tracked player was
drafted.

**This is also why the departure queue must be kept append-only.** Never
delete a `roster_moves_queue.json` entry, even a `resolved-*` one — this
skill searches the whole queue, not just pending entries, and a resolved
entry from two years ago is exactly the kind of hit this exists to find.

## Sequence

### 0. Annual recount — the part that feeds the Fit Score (added v45.56)

`proPlayers.mlsPicks5yr` on each school counts picks in the **five most recent
SuperDrafts** (2022–2026 as of v45.55). It feeds the soccer-quality part of every
four-year school's Fit Score. This skill used to update only the `pipeline.json`
table, so the school counts went years without a recount: in v45.55, 48 of 170
were wrong (Washington stored 2, real 15) and 47 Fit Scores moved when corrected.

Every year, after the December draft:
1. Read all five drafts on mlssoccer.com. Newer years have an "MLS SuperDraft
   YYYY: Every team's selections" article; older years have
   `mlssoccer.com/superdraft/YYYY/draft-tracker`, which needs each Round button
   clicked.
2. **Check each year's parsed total against the official number of selections
   before trusting it.** The v45.55 tracker parse first returned 71 of 79 for
   2022: some picks have no position line, and PASS rows sit in the list.
3. Attribute a pick to the college MLS lists at draft time; an MLS NEXT club in
   brackets is not a college. MLS names a draft by the following year (the
   "2026 SuperDraft" was held in December 2025).
4. Update `mlsPicks5yr` for every school, re-store `fitOlivier`,
   `lensScores.overall`, `soccer` and `value`, and rebuild the ranked
   `mlsDraft` rows.
5. **Verify every named pick quoted in `notable[]`/`notable` text** against the
   same trackers. The v45.55 check found seven claims that match no draft, plus
   wrong years and rounds.

`validate_consistency.js` **MLS-TABLE** fails if a table row disagrees with the
school record, or if a D1/Ivy school with picks has no row. **FIT** catches a
count changed without re-storing scores.

### 1. Get this year's SuperDraft results — Tier-1, per CLAUDE.md Section 15

The official MLS SuperDraft results page is the only authoritative source
(Section 15's own table: "the official MLS SuperDraft record is the only
authoritative source. Many programs claim players who went undrafted or
signed as free agents.") Write what you find into a small JSON file:

```json
[
  {"name": "Player Name", "pick": "R2 #40", "team": "FC Dallas", "drafted_from": "UIC"}
]
```

### 2. Cross-reference

```bash
python .claude/skills/mls-pipeline/scripts/match_draft_picks.py --picks picks.json
```

Reports every pick found in either the current roster snapshot or the
departure queue, and exactly which guide school it traces back to. This is
a report, not a gate or a writer — every match needs a human confirmation
pass before anything gets filed (same name, right person — a common name at
this scale can coincide by chance, same caveat as `transfer-tracking`'s
duplicate scanner).

### 3. File a confirmed match — Change Type 7, by hand

CLAUDE.md Section 3a Change Type 7 governs this edit directly, and states
one rule worth repeating because it's a real, documented past error class:
**JUCO/NJCAA titles and rankings are never mixed into the ranked
`ncaaD1[]`/`ncaaD2[]` medal tables** — those are literally "NCAA
championships" sections. An NJCAA credential (including a JUCO's own D1
transfer feeding an eventual MLS pick) belongs only in the unranked JUCO
group at the bottom of `ncaaD2[]`, using `years`/`yearsStyle` chips, not the
`titles`/medal-rank fields. For a confirmed match found by this skill:

- Bump the origin school's `mlsDraft[]` row `picks5yr` if it's a D1/D2/NAIA
  school with its own row.
- For a JUCO origin, the credit is the transfer itself — this is exactly
  the `proPlayers.nextLevel` territory `transfer-tracking`'s SKILL.md
  already covers (the "one confirmed hit vs. multiple hits across tracker
  years" distinction), not a `pipeline.json` edit at all.
- Append the player to the relevant `notable` free-text string either way —
  it's prose, not a structured list, so this is a normal text edit.

**This IS a score change when the origin school is a four-year school.**
Update that school's `proPlayers.mlsPicks5yr` too (it feeds the Fit Score),
then re-store `fitOlivier`, `lensScores.overall`, `soccer` and `value`. The
earlier wording here ("recompute nothing else") is how the school counts and the
table drifted apart. MLS-TABLE and FIT now fail if either is missed.

## What this skill deliberately does not do

- It does not fetch draft results itself — Tier-1 research, your judgment
  on the source.
- It does not write to `pipeline.json`, `proPlayers.nextLevel`, or any
  other file — report only, matching every other skill built this session.
- It does not run on any fixed internal schedule — trigger it yourself once
  a year, around the SuperDraft.
