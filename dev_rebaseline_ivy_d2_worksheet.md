# Dev-Score Re-Baseline Worksheet — Ivy + D2 batch (§6 Step 5)

**Purpose:** stage the non-browsable parts of the §5a dev-score re-baseline for the
14 schools in `ivy.json` + `d2.json`, so a **local Claude Code session with Claude
for Chrome MCP** can run the research + scoring as near-pure transcription.

**Why this file exists:** the remote/web session cannot do this work. Every target
runs on Sidearm/Cloudflare, which returns **HTTP 403 to WebFetch** (empirically
confirmed on Princeton, Yale, PBA, Chapman — 4/4). §15 Rule 0 also forbids storing
any fact from a WebFetch/WebSearch *summary*. Dev scores are Tier-1 facts, so they
must come from a real browser reading each school's own athletics pages.

**This worksheet was generated from stored data only. It contains NO browsed facts
and proposes NO scores** — proposing numbers from here would just anchor the scorer
to unverified values (the exact error §5a exists to remove; see §5b's note that
WebFetch figures "all moved, in BOTH directions").

---

## How to run this batch (local session, Chrome MCP active)

1. `git fetch origin && git checkout claude/section-5c-aid-penalty-w84et6` (this branch
   carries the v42.18 §5c work these scores cascade on top of).
2. **Read §5a in full before scoring anything.** Score against the written rubric and
   its anchors, never from feel, a ranking site, or team results.
3. Per school, open its OWN athletics pages in Chrome MCP (`navigate` → `get_page_text`,
   as separate calls — `navigate` returns before render, §5b tooling note):
   - **Staff directory / coaches page** → `tactical` evidence: # full-time coaches,
     head-coach tenure + playing/coaching pedigree, documented system of play,
     whether position-specific (e.g. a dedicated midfield/attacking coach) exists.
   - **Facilities page** → `technical` evidence: soccer-specific vs shared stadium,
     pitch standard, video-analysis staff, GPS/wearable tech.
   - **Sports performance / S&C / sports-medicine staff pages** → `fitness` evidence:
     an S&C coach dedicated to soccer vs shared across all sports, sports-performance
     staff in the athletics directory, nutrition + rehab access.
4. Score `tactical` / `technical` / `fitness` each 0–100 on the **absolute national
   scale**, against the anchors below. Compute `devAvg`; confirm it is **≤ the division
   ceiling** in the table.
5. Write `devScoresNote` (≥20 chars) citing the evidence observed — its presence is the
   gate that activates the validator's DEV-RUBRIC ceiling check for that school.
6. Cascade (§3a Change Type 13): `fitOlivier` → `lensScores.overall` → `lensScores.value`.
   - `fitOlivier` = weighted total − housingPenalty − **fundingPenalty** (all these
     schools already carry a funding penalty from v42.18 — capped −3 or none −8; a dev
     drop stacks on top). Stored value must equal `scores.js` output exactly.
   - `lensScores.overall` = same integer as `fitOlivier`.
   - `lensScores.value` = `round(fitOlivier×0.6 + (1 − min(1, costNum/52000))×40)`.
7. **One conference file per commit**, `node validate_consistency.js` green each time
   (must hold the 1-issue baseline), full §3a Type 11 regression per batch.
8. `node validate_schools.py` + `node --check` as applicable.

---

## Anchors (§5a — calibrate against these, do NOT re-score them casually)

- **90–95** — Clemson, Indiana, Maryland, Georgetown, UVA. Full-time staff,
  sports-science personnel dedicated to soccer, soccer-specific stadium *and* training ground.
- **~75** — Creighton. Solid D1, shared S&C, no dedicated sports science.
- **~60** — DePaul. D1 membership, modest program investment.

**Conference is NOT a proxy for development environment. Score the program, not the letterhead.**
A national title / good season is a RESULT — it belongs in `titles[]` / `confRecord[]` /
`nextLevelOutput`, never in a dev sub-score. If the evidence you're holding is a *result*,
it does not belong here.

### Division ceilings (a ceiling, not a target — there is no floor)
| Division | Ceiling | Structural reason |
|---|---|---|
| Ivy | **88** | high-major staffing/facilities, but no spring competitive season |
| D2 | **76** | 1–2 full-time coaches, shared S&C, shared facilities |
| NAIA | **72** | 1–2 coaches, minimal support staff |
| D3 | **66** | often part-time coaches, no dedicated S&C |

---

## The 14 schools — current stored state (from data, NOT re-scored)

Sorted by division then by how far **over** the new ceiling each currently sits.
`over` > 0 ⇒ the current score is above the §5a ceiling and **must** come down (this is
the floor of what changes; absolute re-scoring can also move in-band schools). None are
re-baselined yet (`devScoresNote` absent on all 14).

|Div|id|Full name|tac|tec|fit|avg|ceil|over|fit%|costNum|fundingPathway|
|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|---|
|D2|`pba`|Palm Beach Atlantic University|86|84|82|84|76|+8|64|38000|capped|
|D2|`stedwards`|St. Edward's University|86|85|82|84|76|+8|64|42000|capped|
|D2|`lynn`|Lynn University|82|85|80|82|76|+6|55|47000|capped|
|D2|`barry`|Barry University|84|80|82|82|76|+6|66|44000|capped|
|D2|`nova`|Nova Southeastern University|76|78|78|77|76|+1|58|60244|capped|
|D2|`csula`|California State University Los Angeles|75|78|76|76|76|+0|60|28000|capped|
|D2|`uc_charleston`|University of Charleston|68|70|72|70|76|-6|48|36000|capped|
|D2|`georgian_court`|Georgian Court University|62|64|65|64|76|-12|27|55920|capped|
|D3|`chapman`|Chapman University|76|78|74|76|66|+10|48|72000|none|
|IVY|`princeton`|Princeton University|88|85|80|84|88|-4|42|94624|none|
|IVY|`yale`|Yale University|82|80|78|80|88|-8|47|97985|none|
|NAIA|`ocu`|Oklahoma City University|82|80|78|80|72|+8|61|56720|capped|
|NAIA|`keiser`|Keiser University|74|76|80|77|72|+5|48|38000|capped|
|NAIA|`columbia_college`|Columbia College (MO)|55|58|60|58|72|-14|35|27556|capped|

**Reading the `over` column:** 8 schools are currently above ceiling and will drop —
Chapman (D3) +10, PBA +8, St. Edward's +8, OCU (NAIA) +8, Lynn +6, Barry +6, Keiser
(NAIA) +5, Nova +1. Georgian Court (−12), Columbia College (−14), UC Charleston (−6)
already sit well under ceiling — re-score them on evidence anyway, but they are unlikely
to be constrained by the ceiling. The two Ivies are under 88 today; re-score against the
anchors regardless (Ivy = environment only, remember the no-spring-season structural note).

**Modelled impact:** each ~10-pt dev drop ≈ 2.4 Fit pts (dev = 60% of Soccer Quality =
24% of Fit), then the value cascade. Expect Dashboard Top-8 reshuffles and Soccer-lens
re-ordering within the affected divisions.

---

## Per-school starting URLs (stored `url` — the sport home page)

Open these first, then navigate to that site's staff + facilities sub-pages (naming
varies per Sidearm install — discover per school, there is no fixed pattern):

- `princeton` (IVY) — https://goprincetontigers.com/sports/mens-soccer
- `yale` (IVY) — https://yalebulldogs.com/sports/mens-soccer
- `pba` (D2) — https://pbasailfish.com/sports/mens-soccer
- `lynn` (D2) — https://lynnfightingknights.com/sports/mens-soccer
- `barry` (D2) — https://gobarrybucs.com/sports/mens-soccer
- `nova` (D2) — https://nsusharks.com/sports/mens-soccer
- `csula` (D2) — https://calstatela.edu/athletics
- `stedwards` (D2) — https://gohilltoppers.com/sports/mens-soccer
- `ocu` (NAIA) — https://www.ocusports.com/sports/mens-soccer
- `keiser` (NAIA) — https://keiseruniversity.edu/athletics
- `chapman` (D3) — https://chapmanathletics.com/sports/soccer
- `uc_charleston` (D2) — https://ucwvgolden eagles.com/sports/mens-soccer
- `georgian_court` (D2) — https://gcuathletics.com/sports/mens-soccer
- `columbia_college` (NAIA) — https://cougarathletics.ccis.edu/sports/mens-soccer

### URL caveats (fix in the local session as encountered)
- **`uc_charleston`** — the stored `url` is malformed (`ucwvgolden eagles.com` contains a
  space). Find the correct host (University of Charleston WV = Golden Eagles) in Chrome
  before scraping. This is a pre-existing data bug, out of scope for the v42.18 §5c commit;
  fix it in the Step-5 commit or log it as a deferred item.
- **`csula`, `keiser`** — stored `url` points at the athletics landing page, not the
  men's-soccer page; navigate to the sport + staff pages from there.
- Expect Cloudflare "Just a moment…" interstitials (§15): load the site root first to clear
  the challenge, then the sport/staff page.

---

## Glossary rule (§5a — same-commit requirement)

`index.html`'s **"Development Sub-Scores"** section hardcodes anchor schools in prose. It
currently names *"Virginia (Gelnovatch), Indiana (Yeagley) and FIU (Russell)"* and cites
sports-science departments at *"Indiana, UCLA, UF"* — **UF is not one of the 110 schools;
Florida fields no men's soccer program.** If any re-score in this batch moves an anchor,
fix that block in the same commit. (None of these 14 is currently an anchor, so this is a
low-but-nonzero risk for the Ivy/D2 batch — check before committing.)

---

## Validator behaviour to expect
- Adding a substantive `devScoresNote` activates the DEV-RUBRIC ceiling check for that
  school — if `devAvg` still exceeds the ceiling after your re-score, it becomes a hard
  issue. Get `devAvg ≤ ceiling` before committing.
- The FIT check recomputes `fitOlivier` including the funding + housing penalties. A dev
  change that isn't cascaded into `fitOlivier`/`overall` will show as FIT drift.
- Baseline is **1 issue** (Stony Brook coach name). It must not increase.

---

*Generated from stored data in the remote session (v42.18 branch). Scores + evidence to be
filled in a local Chrome-MCP session. Delete this file once the Ivy + D2 batch is committed.*
