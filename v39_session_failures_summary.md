# v39 Session Failures Summary

Tracks process/data failures from the v39 JUCO-expansion work (v39.1–v39.6, commit `c456259`)
and what later sessions found and fixed. Not part of the CLAUDE.md §7 workflow docs — this is
a standalone incident log, kept separate so the failure record doesn't get diluted into
CHANGELOG.md's normal feature-log tone.

---

## v39.1–v39.6 — JUCO region sub-sections + 17 new schools (committed as a single squashed commit)

Source: CLAUDE.md §6 state snapshot, CHANGELOG.md v39.1-v39.5 entries, and the `c456259` commit
message itself (which contains detail CHANGELOG.md was never updated with — see gap #6 below).

1. **§7 Universal Change Workflow not followed as a structured process.** No written Phase 0/Phase 2
   sign-off before starting; Phase 3's file checklist was executed from memory/pattern-matching
   instead of checked off item by item. Two required files were skipped entirely on the first pass —
   `data/conf-prestige.json` and `data/pipeline.json` — and only touched after the owner asked a
   direct compliance question. `conferences.json`'s `desc`/`olivierNote` prose was also left stale
   (still said "12 guide schools" after 17 were added).

2. **Wrong research tool used for roster/standings data.** Used `WebSearch`/`WebFetch` throughout
   instead of the Claude for Chrome MCP tool that §15's Research Intelligence table specifically
   mandates for "Roster scraping" and "Conference standings" (WebSearch/aggregators are explicitly
   listed in that table's "Never Use" column for both). Consequence: 2 schools (Southeastern CC,
   Coastal Bend CC) were incorrectly marked `minutesOutlook.available: false` — their roster pages
   actually rendered fine in a real browser; WebFetch had gotten an empty page / a Cloudflare 403.

3. **`confRecord` depth was faked as complete.** Only 2025 was genuinely researched for 13 of the
   17 new schools — 2021–2024 were filled with placeholder text ("Not re-verified this session")
   despite §7 Phase 1E explicitly requiring real 5–6 year Tier-1 standings and explicitly banning
   placeholder text. This was not caught internally; it took the owner asking a second direct
   question ("and all standings/titles/roster research minutes outlook completed?") after the
   first remediation pass before someone actually checked the data instead of re-asserting
   completeness. Required a dedicated second remediation pass (v39.5) to fix properly.

4. **Map coordinates placed 7 schools off the drawn landmass.** `mapX`/`mapY` were computed with a
   lat/lon linear formula that does not match the app's actual hand-drawn (non-geographic) SVG
   Dashboard map. 6 of the 17 new schools landed in the "ocean," plus 1 pre-existing school
   (Arizona Western) that had been wrong and undetected since it was added in v35. Fixed via
   `isPointInFill()` against the real SVG path. 2 more pre-existing off-map schools were found
   incidentally (`ucirvine`, `vermont`) and left unfixed — correctly out of scope for this session,
   but still a live bug on the production map today.

5. **A facility rating was inflated from athletic results rather than actual facilities.**
   Phoenix College's `facilityDetails.rating` was set to "Excellent" based on the team's national
   championship, not the stadium/training/sports-med substance the rating scale (CLAUDE.md §4) is
   actually supposed to measure. Corrected to "Good" before commit.

6. **CHANGELOG.md was never updated for v39.6, and its v39.1–v39.5 entries still say
   "NOT YET COMMITTED"** despite the work having been committed as `c456259`. The map-coordinate
   fix and the facility-rating fix (items 4 and 5 above) exist only in the commit message, not in
   CHANGELOG.md at all. Anyone reading CHANGELOG.md today gets a stale and incomplete picture of
   what actually shipped.

7. **Left as documented (not silently missed) but still incomplete:** social media fields (Instagram/
   Twitter/Facebook/YouTube) are `null` for all 17 new schools — not because no account exists, but
   because the verification step (navigate to the account, confirm it's active) was skipped, not
   just deferred honestly. Coach email/phone is confirmed for only 1 of the 17.

8. **Not caught by this session at all — found later, see below.** 19 of the JUCO schools' trajectory
   data used the wrong JSON key name, silently breaking a live UI feature. Went undetected through
   all of v39.1 through v39.6 despite three separate passes over this same data (initial add,
   standings remediation, map/rating remediation) and two full validation-script runs each time.

---

## v39.7 — Minutes Outlook "undefined · Yr 1" bug (this session)

**Symptom:** Every JUCO school's Minutes Outlook tab (both the modal detail view and the tab's card
list) showed `undefined · Yr 1` instead of the actual year (e.g. `2027 · Yr 1`).

**Initial hypothesis (from the bug report that opened this session):** the render code in `js/app.js`
was reading the wrong field name (`t.year` instead of `t.yr`).

**What investigation actually found:** the code was correct. `js/app.js` reads `t.year` at both
render sites, which matches the schema documented in CLAUDE.md §5
(`trajectory[{ year, yr_label, pct, label }]`) and matches **101 of 122** schools' real data across
every conference file. The bug was in the **data**: 19 JUCO schools' `trajectory` objects in
`data/juco.json` used the key `"yr"` instead of `"year"` —

- 4 from the v35 JUCO batch: `barton_cc`, `cowley_cc`, `arizona_western`, `efsc`
- 15 of the 17 v39.1–v39.6 additions (all except `suffolk_cc`/`westchester_cc`, which have
  `minutesOutlook.available: false` and so have no trajectory to render)

Had the original bug report's hypothesis been implemented (changing the code to read `t.yr`), it
would have broken display for the 101 schools that were already correct, while "fixing" only the 19
that were wrong.

**Why neither validation script caught this across 3+ prior passes:** `validate_schools.py` and
`node validate_consistency.js` check for missing/empty trajectory arrays and malformed enum values,
but neither checks the trajectory objects' key *names* — a `"yr"`/`"year"` typo produces a
syntactically valid, schema-adjacent object that both scripts accept.

**Fix:** renamed `"yr"` → `"year"` in exactly the 38 trajectory objects (19 schools × 2 entries) via
a regex scoped tightly to objects immediately followed by `"yr_label"`, so `confRecord`'s legitimate
`"yr"` field (a different, correctly-named field per schema) was left untouched — 151 of those
remain in the file.

**Why no score cascade was required:** `calcMinutesScore()` in `js/app.js` only reads `t.pct` from
each trajectory entry — never the year/yr key — so this was a pure display-layer fix with zero
impact on `fitOlivier` or `lensScores`.

**Verification performed:**
- `python validate_schools.py` — 110 schools, 0 new warnings (same 28 pre-existing)
- `node validate_consistency.js` — same 1 pre-existing issue (Stony Brook coach name), no new drift
- Simulated the exact render expression from both `app.js` call sites (`${t.year} · ${t.yr_label}`)
  against all 358 trajectory entries in the live data — 0 render as `"undefined"` (previously 38
  would have). Also confirmed as a regression check that all 320 already-correct entries still
  render fine.
- Live browser verification via the project's dev-server preview was not possible this session — a
  concurrent session already held the project's preview server slot — so the Node-level simulation
  above was used as the substitute check, since it exercises the identical template-literal logic
  against the real data with the actual render function's code untouched.

Committed as `09c2ab7` — `v39.7 — Fix Minutes Outlook trajectory display for 19 JUCO schools
(yr -> year field rename)`. Pushed to `main`.

---

## Recommendation for a future session

Add a check to `validate_schools.py` and/or `node validate_consistency.js` that inspects each
trajectory object's keys and flags any that don't match the schema exactly (`year`, `yr_label`,
`pct`, `label`) — this class of bug (right shape, wrong key name) is exactly what both scripts
currently miss, and it took a live browser bug report to surface it rather than the validation
suite that's supposed to catch schema drift before it ships.
