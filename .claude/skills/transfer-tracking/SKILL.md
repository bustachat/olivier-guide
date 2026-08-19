---
name: transfer-tracking
description: Run after a roster-refresh wave completes (not per-school) to find where departed midfielders went — a cheap cross-school duplicate-name scan across the whole guide's current roster snapshot, plus a processor for the departure queue the companion roster-refresh skill produces. Feeds CLAUDE.md Section 5b's nextLevelOutput research for JUCOs. Use when the user asks to "track transfers", "find where players went", "process the roster moves queue", "check for JUCO to D1 movement", or wants to follow up on departures after finishing a batch of roster refreshes.
---

# Transfer Tracking — where did they go

This is the companion skill to `roster-refresh`, not a replacement for
anything in it. `roster-refresh` refreshes ONE school's roster and, as a
byproduct, notices when a midfielder who should still be around isn't. This
skill runs **after a refresh wave**, across the whole guide, and tries to
answer "where did they go" — cheaply for the common case, and pointing at
CLAUDE.md Section 5b's existing research process for everything else.

**Run this after a full wave, not after each school.** Schools in this guide
are refreshed in sub-batches spanning weeks (see CLAUDE.md's own roster-
refresh campaign tables). A cross-school name match only works once BOTH
sides of a move have actually been refreshed onto current data — running
this mid-wave isn't wrong, it'll just miss moves whose destination hasn't
been refreshed yet.

## Sequence

### 1. Scan the current snapshot for cross-school duplicates

```bash
python .claude/skills/transfer-tracking/scripts/scan_duplicate_names.py
```

Builds one name index across all 170 schools' current midfielder lists and
reports any name appearing at more than one school. This needs no roster
history at all — it's a single pass over what's already there. **Read every
hit before acting on it — it is a signal, never proof.** `minutesOutlook`
stores names as bare strings (no hometown/high-school field the way a raw
roster scrape has), so there's no further disambiguation available from
this data alone. A real test run against the live guide found 12 same-name
hits across ~1,120 tracked names, and most read as ordinary common-name
coincidence (both instances sitting in `cleared_names` at two different
schools — i.e., both "graduating," which isn't what a transfer looks like)
rather than a real move. Cross-check hometown/high-school on the two
schools' own roster pages before trusting any of these — the same
discipline Section 5b already applies to alumni-page name collisions
(Point University vs. High Point, etc.).

### 2. Process the departure queue

```bash
python .claude/skills/transfer-tracking/scripts/process_moves_queue.py
```

Reads `roster_moves_queue.json` (produced by `roster-refresh`'s
`refresh_school.py` whenever it detects a name that was expected to still
be on a roster but isn't). Cross-references every pending entry against the
same current-snapshot index and sorts into two piles:

- **Found elsewhere in the guide** — cheap: verify the match (again,
  hometown/high-school, not just the name), then:
  ```bash
  python .claude/skills/transfer-tracking/scripts/process_moves_queue.py \
    --mark "Player Name" --status resolved-in-guide --note "verified: ..."
  ```
- **Not found anywhere in the guide** — needs the real research step: CLAUDE.md
  Section 5b's established process (discover via a national transfer
  tracker like TopDrawerSoccer's annual D1 Transfer Tracker articles,
  confirm on the **destination's own roster** — a season-scoped roster URL
  often still shows a since-departed player when the current one doesn't —
  and verify the destination's division against the NCAA member directory,
  since Section 5b documents seven distinct ways a school's own alumni page
  gets its own division wrong). Mark the outcome the same way:
  ```bash
  python .claude/skills/transfer-tracking/scripts/process_moves_queue.py \
    --mark "Player Name" --status resolved-external --note "TopDrawerSoccer 2027, confirmed on <school>'s own roster"
  ```
  Or `--status could-not-confirm` if the research genuinely dead-ends —
  never guess, per the same rule that governs every other Tier-1 lookup in
  this project.

### 3. Filing a confirmed JUCO -> D1 move — a judgment call, not automated

**Neither script writes to `proPlayers.nextLevel` or any other rendered
field, on purpose.** A confirmed transfer doesn't automatically mean the
origin JUCO's `nextLevel.perYear` should move. CLAUDE.md Section 5b already
worked through this exact tension and left real precedent to weigh:

- **One confirmed hit, on its own**, is closer to the "one-off news
  mention" case Section 5b already treats as color, not measurement — fold
  it into `notable[]`/`draftRank` as a named data point, leave `perYear`
  untouched.
- **Multiple confirmed hits for the same school across the tracker's own
  multi-year window** can cross into the Phoenix College precedent — store
  a real `perYear`, but always **exclude it from `D1_RATE_DIVISOR`**, since
  it's a partial cross-check of specific years, not the comprehensive
  alumni-page census the divisor's other schools were built from.

Deciding which of these applies needs the same rigor as the original
`nextLevel` research — not something to automate from inside this skill.
When you've made that call, the actual data edit is a normal Change Type 7
edit (CLAUDE.md Section 3a) — read that section, edit `proPlayers.nextLevel`
directly, and recompute the cascade the same way any other pipeline change
does.

## What this skill deliberately does not do

- It does not do the external Tier-1 research itself — that's a real
  browser, a real search, and real judgment (Section 15's Rule 0), not
  something a script can do.
- It does not decide whether a confirmed move changes a score — see step 3.
- It does not run automatically after every `roster-refresh` call — it's a
  separate, wave-level step you run deliberately.
- It does not touch MLS SuperDraft tracking (`pipeline.json`'s `mlsDraft[]`)
  — that's a different cadence (once a year, tied to the draft calendar,
  matching against every name this guide has ever tracked, not just this
  wave's departures) and, if built, would be its own skill.
