# CLAUDE.md — US College Soccer Athlete Recruitment Platform
# Standing orders for Claude Code. Read this file before touching anything else.

---

## 1. What This Is

A multi-file, multi-athlete web application hosted at **bustachat.github.io/olivier-guide**.

- Athlete: Olivier — Australian central midfielder, ACU BESS degree, targeting DPT/Chiropractic
- Owner: Multi Skilled Contractors (Platform Sports Management)
- Current version: **v41.0 (July 2026)** — always verify with `git log --oneline -1` and `athletes/olivier.json` guideVersion; treat any hardcoded version in prose as a hint, not truth
- Strategic intent: platform will be onsold to other agencies. Architecture must stay clean.

Stack: Vanilla HTML/CSS/JS. No framework. No build step. GitHub Pages hosting.
Fetch-based data loading — **never open index.html via file://**. Use `npx serve .` or `python3 -m http.server 8000`.

---

## 2. EXPLORE PHASE — Mandatory Before Every Session

**Do not write, edit, or suggest any code until all of these steps are complete.**
**This is not optional. The most expensive errors in this project came from skipping this phase.**

### Step 1 — Read the repo state
```bash
git log --oneline -10          # What version is live? What changed last?
git status                     # Any uncommitted changes?
git diff                       # If changes exist — what are they exactly?
```

### Step 2 — Read every file you will touch
For every file you plan to modify, read it in full before proposing any change.
Never reconstruct a file from memory or from this CLAUDE.md. Always read the actual file.

```bash
cat js/app.js                  # CONF_SECTIONS, DOMAINS, SITE_URLS, SOCIAL, loadData()
cat js/scores.js               # calculateFitScore(), scoreWeights
cat js/dashboard.js            # renderDashboard(), fetches athletes/olivier.json
cat index.html                 # Shell only — read before touching any UI
cat athletes/olivier.json      # Single source of truth for athlete config
```

For data work, read the specific conference file:

| Conference | File | Schools (all full-profile as of v26) |
|---|---|---|
| ACC | `data/acc.json` | Virginia, Wake Forest, SMU, Clemson, Notre Dame, UNC, Duke, NC State, Louisville, Pitt, Stanford, Syracuse, Cal (13) |
| Big Ten | `data/big-ten.json` | UCLA, Indiana, Maryland, Penn State, Michigan, Michigan State, Ohio State, Northwestern, Wisconsin, Rutgers, Washington (11) |
| Big East | `data/big-east.json` | St John's, Georgetown, Creighton, UConn, Providence, Villanova, Marquette, Butler, Seton Hall, DePaul, Xavier (11) |
| AAC | `data/aac.json` | FIU, USF, FAU, Tulsa, Memphis, Temple, UAB, Navy, Army, Charlotte (10) |
| Big West | `data/big-west.json` | UCSB, Cal Poly, UC Davis, UC Irvine, UC Riverside, UC San Diego, CSU Fullerton (7) |
| CAA | `data/caa.json` | Charleston, William & Mary, Hofstra, Northeastern, Drexel, Delaware, Elon, Monmouth, Stony Brook (9) |
| Non-major D1 (MAC, WAC, WCC, ASUN, AEC, NEC) | `data/d1-other.json` | Akron (MAC), GCU (WAC), Denver (WCC), Vermont (AEC), Mercyhurst (NEC), UCA (ASUN) (6) |
| JUCO | `data/juco.json` | Tyler JC, Indian Hills, Daytona State, Iowa Western, Santa Monica, Miami Dade, Monroe, Northeast CC, Barton CC, Cowley CC, Arizona Western, Eastern Florida State (12) |
| Ivy League | `data/ivy.json` | Princeton, Yale (2) |
| D2, NAIA, D3 | `data/d2.json` | Nova SE, Barry, Lynn, PBA, Cal State LA, St. Edward's, Georgian Court, U of Charleston, Columbia College, Oklahoma City, Keiser, Chapman (12) |

### School → File Reference Table (110 schools)

**Maintenance rule: update this table whenever a school is added, removed, or changes conference file.**
This applies to Change Types 1, 8, and 10 — it is a required step in Phase 6 (commit checklist).

| School | File | ID | Div | Conference |
|---|---|---|---|---|
| Akron | `data/d1-other.json` | `akron` | D1 | MAC |
| Angelina College | `data/juco.json` | `angelina_college` | JUCO | NJCAA DI / Region 14 |
| Arizona Western | `data/juco.json` | `arizona_western` | JUCO | NJCAA DI / ACCAC |
| Army | `data/aac.json` | `army` | D1 | AAC |
| Barry | `data/d2.json` | `barry` | D2 | Sunshine State (SSC) |
| Barton CC | `data/juco.json` | `barton_cc` | JUCO | NJCAA DI / KJCCC |
| Blinn College | `data/juco.json` | `blinn_college` | JUCO | NJCAA DI / Region 14 |
| Butler | `data/big-east.json` | `butler` | D1 | Big East |
| Cal | `data/acc.json` | `cal` | D1 | ACC |
| Cal Poly | `data/big-west.json` | `calpoly` | D1 | Big West |
| Cal State LA | `data/d2.json` | `csula` | D2 | CCAA |
| Chapman | `data/d2.json` | `chapman` | D3 | SCIAC |
| Charleston | `data/caa.json` | `charleston` | D1 | CAA |
| Charlotte | `data/aac.json` | `charlotte` | D1 | AAC |
| Clemson | `data/acc.json` | `clemson` | D1 | ACC |
| Coastal Bend College | `data/juco.json` | `coastal_bend_cc` | JUCO | NJCAA DI / Region 14 |
| Columbia College | `data/d2.json` | `columbia_college` | NAIA | AMC |
| Cowley CC | `data/juco.json` | `cowley_cc` | JUCO | NJCAA DI / KJCCC |
| Creighton | `data/big-east.json` | `creighton` | D1 | Big East |
| CS Fullerton | `data/big-west.json` | `csuf` | D1 | Big West |
| Daytona State | `data/juco.json` | `daytona_state` | JUCO | NJCAA DI / FCSAA |
| Delaware | `data/caa.json` | `delaware` | D1 | CAA |
| Denver | `data/d1-other.json` | `denver` | D1 | WCC (from 2026) |
| DePaul | `data/big-east.json` | `depaul` | D1 | Big East |
| Dodge City CC | `data/juco.json` | `dodge_city_cc` | JUCO | NJCAA DI / KJCCC |
| Drexel | `data/caa.json` | `drexel` | D1 | CAA |
| Duke | `data/acc.json` | `duke` | D1 | ACC |
| Eastern Florida State | `data/juco.json` | `efsc` | JUCO | NJCAA DI / FCSAA Region 8 |
| Elon | `data/caa.json` | `elon` | D1 | CAA |
| FAU | `data/aac.json` | `fau` | D1 | AAC |
| FIU | `data/aac.json` | `fiu` | D1 | AAC |
| GCU | `data/d1-other.json` | `gcu` | D1 | WAC |
| Georgetown | `data/big-east.json` | `georgetown` | D1 | Big East |
| Georgian Court | `data/d2.json` | `georgian_court` | D2 | CACC |
| Glendale CC | `data/juco.json` | `glendale_cc_az` | JUCO | NJCAA DII / ACCAC |
| Hofstra | `data/caa.json` | `hofstra` | D1 | CAA |
| Indian Hills | `data/juco.json` | `indian_hills` | JUCO | NJCAA DI |
| Indiana | `data/big-ten.json` | `indiana` | D1 | Big Ten |
| Iowa Lakes CC | `data/juco.json` | `iowa_lakes_cc` | JUCO | NJCAA DII / ICCAC |
| Iowa Western | `data/juco.json` | `iowa_western` | JUCO | NJCAA DI |
| Johnson County CC | `data/juco.json` | `johnson_county_cc` | JUCO | NJCAA DII / KJCCC |
| Keiser | `data/d2.json` | `keiser` | NAIA | Sun Conference |
| Louisville | `data/acc.json` | `louisville` | D1 | ACC |
| LSU Eunice | `data/juco.json` | `lsu_eunice` | JUCO | NJCAA DI / Region 14 |
| Lynn | `data/d2.json` | `lynn` | D2 | SSC |
| Marquette | `data/big-east.json` | `marquette` | D1 | Big East |
| Maryland | `data/big-ten.json` | `maryland` | D1 | Big Ten |
| Memphis | `data/aac.json` | `memphis` | D1 | AAC |
| Mercyhurst | `data/d1-other.json` | `mercyhurst` | D1 | NEC |
| Miami Dade | `data/juco.json` | `miami_dade` | JUCO | NJCAA |
| Michigan | `data/big-ten.json` | `michigan` | D1 | Big Ten |
| Michigan State | `data/big-ten.json` | `michiganstate` | D1 | Big Ten |
| Mohave CC | `data/juco.json` | `mohave_cc` | JUCO | NJCAA DI / ACCAC |
| Monmouth | `data/caa.json` | `monmouth` | D1 | CAA |
| Monroe | `data/juco.json` | `monroe_college` | JUCO | NJCAA DI |
| Nassau CC | `data/juco.json` | `nassau_cc` | JUCO | NJCAA DI / Region 15 |
| Navy | `data/aac.json` | `navy` | D1 | AAC |
| NC State | `data/acc.json` | `ncstate` | D1 | ACC |
| Neosho County CC | `data/juco.json` | `neosho_county_cc` | JUCO | NJCAA DII / KJCCC |
| Northeast CC | `data/juco.json` | `northeast_cc` | JUCO | NJCAA DII |
| Northeastern | `data/caa.json` | `northeastern` | D1 | CAA |
| Northwestern | `data/big-ten.json` | `northwestern` | D1 | Big Ten |
| Notre Dame | `data/acc.json` | `notredame` | D1 | ACC |
| Nova SE | `data/d2.json` | `nova` | D2 | SSC |
| Ohio State | `data/big-ten.json` | `ohiostate` | D1 | Big Ten |
| Oklahoma City | `data/d2.json` | `ocu` | NAIA | SAC |
| PBA | `data/d2.json` | `pba` | D2 | SSC |
| Penn State | `data/big-ten.json` | `pennstate` | D1 | Big Ten |
| Phoenix College | `data/juco.json` | `phoenix_college` | JUCO | NJCAA DII / ACCAC |
| Pima CC | `data/juco.json` | `pima_cc` | JUCO | NJCAA DII / ACCAC |
| Pittsburgh | `data/acc.json` | `pittsburgh` | D1 | ACC |
| Princeton | `data/ivy.json` | `princeton` | IVY | Ivy League |
| Providence | `data/big-east.json` | `providence` | D1 | Big East |
| Rutgers | `data/big-ten.json` | `rutgers` | D1 | Big Ten |
| Santa Monica | `data/juco.json` | `smc` | JUCO | CCCAA / SCFA |
| Seton Hall | `data/big-east.json` | `setonhall` | D1 | Big East |
| SMU | `data/acc.json` | `smu` | D1 | ACC |
| Southeastern CC | `data/juco.json` | `southeastern_cc_ia` | JUCO | NJCAA DII / ICCAC |
| St. Edward's | `data/d2.json` | `stedwards` | D2 | Lone Star (LSC) |
| St. John's | `data/big-east.json` | `stjohns` | D1 | Big East |
| Stanford | `data/acc.json` | `stanford` | D1 | ACC |
| Stony Brook | `data/caa.json` | `stonybrook` | D1 | CAA |
| Suffolk CC | `data/juco.json` | `suffolk_cc` | JUCO | NJCAA DI / Region 15 |
| Syracuse | `data/acc.json` | `syracuse` | D1 | ACC |
| Temple | `data/aac.json` | `temple` | D1 | AAC |
| Tulsa | `data/aac.json` | `tulsa` | D1 | AAC |
| Tyler JC | `data/juco.json` | `tyler_jc` | JUCO | NJCAA DI / Region XIV |
| U of Charleston | `data/d2.json` | `uc_charleston` | D2 | Mountain East (MEC) |
| UAB | `data/aac.json` | `uab` | D1 | AAC |
| UC Davis | `data/big-west.json` | `ucdavis` | D1 | Big West |
| UC Irvine | `data/big-west.json` | `ucirvine` | D1 | Big West |
| UC Riverside | `data/big-west.json` | `ucriverside` | D1 | Big West |
| UC San Diego | `data/big-west.json` | `ucsd` | D1 | Big West |
| UCA | `data/d1-other.json` | `uca` | D1 | ASUN |
| UCLA | `data/big-ten.json` | `ucla` | D1 | Big Ten |
| UConn | `data/big-east.json` | `uconn` | D1 | Big East |
| UCSB | `data/big-west.json` | `ucsb` | D1 | Big West |
| Ulster County CC | `data/juco.json` | `ulster_cc` | JUCO | NJCAA DI / Region 15 |
| UNC | `data/acc.json` | `unc` | D1 | ACC |
| USF | `data/aac.json` | `usf` | D1 | AAC |
| UVA | `data/acc.json` | `virginia` | D1 | ACC |
| Vermont | `data/d1-other.json` | `vermont` | D1 | America East |
| Villanova | `data/big-east.json` | `villanova` | D1 | Big East |
| Wake Forest | `data/acc.json` | `wakeforest` | D1 | ACC |
| Washington | `data/big-ten.json` | `washington` | D1 | Big Ten |
| Westchester CC | `data/juco.json` | `westchester_cc` | JUCO | NJCAA DI / Region 15 |
| William & Mary | `data/caa.json` | `william_mary` | D1 | CAA |
| Wisconsin | `data/big-ten.json` | `wisconsin` | D1 | Big Ten |
| Xavier | `data/big-east.json` | `xavier` | D1 | Big East |
| Yale | `data/ivy.json` | `yale` | IVY | Ivy League |

### Step 3 — Confirm the session goal
State in one sentence what this session will deliver and which session number it is.
Do not proceed until you have stated this explicitly.

**Session flow — always in this order:**
§2 EXPLORE (read repo state) → §3 PLAN (identify change type + impact map) → §7 Phase 0 (change assessment) → §7 Phase 1 (research) → §7 Phase 2 (sign-off) → §7 Phase 3 (make changes) → §7 Phase 4 (validate) → §7 Phase 5 (local test) → §7 Phase 6 (commit) → §7 Phase 7 (verify live) → §7 Phase 8 (end of session)

Do not skip any phase. Do not begin Phase 3 before Phase 2 sign-off is written out explicitly.

---

## 3. PLAN PHASE — Before Writing Code

**THIS IS NON-NEGOTIABLE. Every change, no exceptions:**

1. Identify the change type from Section 3a (Impact Map).
2. Read every row in that change type's impact map — files AND tabs.
3. Write out the complete list of files and tabs this change touches.
4. Only then begin the Universal Change Workflow in Section 7 — starting at Phase 0. Phase 0 and Phase 2 of §7 complete this planning step. Do not treat §3 as a substitute for them.

A change is NOT complete until every item in the impact map for that change type has been checked and actioned. This applies to data fixes, coach updates, new schools, cost changes, UX changes — everything.

**Other plan rules:**
- For JSON changes: validate schema against Section 5 before touching the file.
- For JS changes: identify the specific function(s) involved. Read them first.
- One change at a time. Complete and verify each change before starting the next.
- State any assumptions. If something is ambiguous, ask — do not guess.

---

## 3a. Change Impact Map — Mandatory Before Every Change

**For every change, find the matching type below. Every row is a required check — not a suggestion.**

---

### CHANGE TYPE 1 — New School Added

| What to update | Why |
|---|---|
| `data/[conf].json` — full school object | All required fields, confKey, acuUnits[16], lensScores[6], minutesOutlook, fitOlivier |
| `CLAUDE.md` — School → File Reference Table | Add a row for the new school — mandatory, keeps the lookup table accurate |
| `data/coaches.json` — add coach entry | Full-profile school must have a coaches.json entry. Re-rank ALL coaches after adding. |
| `data/conferences.json` — guideSchools[] | School chip will not appear in Conferences tab without this |
| `data/conferences.json` — desc and olivierNote | Update the text to reflect the new school count and program highlights — easy to miss |
| `data/conferences.json` — otherSchools[] | Remove school from otherSchools[] if it was previously listed there |
| `data/conf-prestige.json` — programsInGuide | Update comma-separated string and relevance text |
| `data/pipeline.json` | Only if school has NCAA titles or MLS picks — add to relevant table |
| `js/app.js — DOMAINS` | Favicon in modal header breaks without this |
| `js/app.js — SITE_URLS` | Visit Site link in modal breaks without this |
| `js/app.js — SOCIAL` | Social pills in modal are blank without this (4-element array, nulls ok) |
| `js/app.js — CONF_SECTIONS` | School is invisible in Explore if confKey has no matching section |

**Tabs to verify after adding:**
- Dashboard — map dot present, budget bracket bar present, shortlist panel (if on shortlist)
- Explore Schools — card in correct section, all filters/lenses/sorts, Details modal all 9 tabs
- Compare — school selectable
- Minutes Outlook — card present (even if available: false)
- Pro Pipeline — only if titles/MLS picks added to pipeline.json
- ACU Alignment — row present (non-JUCO full-profile only)
- Conferences — school chip visible in guideSchools[], prestige table updated
- Coaches & Staff — coach card in Rankings, profile in Profiles tab, entry in Outreach tab
- Financial Model — school in selector, appears in comparison bars

---

### CHANGE TYPE 2 — Coach Name or Details Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — coach{} object | name, title, email, phone, profile — all fields |
| `data/coaches.json` — matching entry | Must stay in sync with conf JSON — this is the source for the Coaches tab |
| Re-rank ALL coaches — always, no exceptions | Any coach change (name, score, or details) triggers a re-rank. Rank gaps break Rankings display. |

**Tabs to verify after changing:**
- Coaches & Staff → Rankings — name, rank, score badge correct
- Coaches & Staff → Profiles — bio, staff array, contact details correct
- Coaches & Staff → Outreach — contact details correct
- Explore Schools → school modal → Coaching tab — coach details correct
- Dashboard → shortlist panel — shows updated coach name

**Two-file rule: coach change = conf JSON + coaches.json. Both. Always. No exceptions.**

---

### CHANGE TYPE 3 — minutesOutlook Populated or Changed

**Cascade order is strict — do in this exact sequence:**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — minutesOutlook{} | The raw data |
| 2 | `data/[conf].json` — lensScores.minutes | Minutes lens score derived from minutesOutlook |
| 3 | `data/[conf].json` — lensScores.overall | Overall lens includes minutes score |
| 4 | `data/[conf].json` — fitOlivier | Minutes = 20% of fitOlivier — must recalculate |

**Tabs to verify after changing:**
- Minutes Outlook tab — card now renders with trajectory chart, Yr1/Yr2 percentages
- Explore Schools — fitOlivier score updated, sort order correct, minutes lens score correct
- Dashboard — lens comparison bars reflect new scores

**Companion field — `recruit_pathway` / `recruit_pathway_note` (informational only, added v34):**
Captures whether a school's midfield spots are typically filled by true incoming freshmen vs. transfer/JUCO portal players, discovered during the same roster pull used for `minutesOutlook`. See §5 for field definition and §7 Phase 1G for the research step. **No scoring cascade** — do not touch lensScores or fitOlivier for this field alone. Origin: FIU research (v34) found ~60–70% of its midfield roster is transfer/JUCO-sourced rather than true freshmen, which the existing GPA-based `internationalNote` framing didn't capture — that note describes academic admission ease, not athletic roster-spot competition, and the two can diverge sharply.

---

### CHANGE TYPE 4 — Cost / fin{} Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — fin.costNum, tuition, roomBoard, fees | Raw cost data |
| `data/[conf].json` — cost display string | **REDUNDANT since v32** — cost display is now computed dynamically from `costNum` via `costDisplay()` in app.js. The `cost` field in JSON is kept as a fallback only. Do NOT update it manually — fix `costNum` instead. |
| `data/[conf].json` — fin.internationalNote | Text must match realistic aid framing (25–50% athletic for D1) |
| `data/[conf].json` — lensScores.value | Value lens = 60% fit + 40% affordability — recalculate |
| `data/[conf].json` — lensScores.overall | Cost = 20% of fitOlivier — recalculate |
| `data/[conf].json` — fitOlivier | Recalculate from scratch |

**Tabs to verify after changing:**
- Financial Model — school selector shows new cost, comparison bars shift, scenario breakdowns correct
- Explore Schools — fitOlivier updated, Value lens ranking updated
- Dashboard — budget bracket position may shift

---

### CHANGE TYPE 5 — athletes/olivier.json Changed

| What changed | What's affected |
|---|---|
| `guideVersion` | Explore tab header version badge only |
| `budgetAUD` or `fxRate` | **No longer affects fitOlivier** (v37.1 removed Cost from the Fit Score) — only affects the `value` lens (`affordabilityScore`) and the Financial Model tab. Re-store `lensScores.value` for all schools if changed. |
| `scoreWeights` | ALL fitOlivier recalculate → all lensScores.overall must be manually recalculated |
| `shortlist[]` | **Since v37.9: Dashboard map "in shortlist" dot highlight ONLY.** The Dashboard's "Top 8" panel no longer pins these schools — it's a strict fitOlivier ranking (see §6 state snapshot). Does NOT drive the Coaches Outreach tracker (that's `outreach[]`) or Explore's ★ Top Pick filter (that's the static `u.top` field on each school) — this row previously claimed both incorrectly. |
| `outreach[]` | Coaches Outreach tracker only |
| `pathways[]` | Pathways tab only |
| `coachQuestions[]` | Pathways tab — questions section only |

---

### CHANGE TYPE 6 — confRecord Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — confRecord[] entries | The raw standings data |
| `data/[conf].json` — lensScores.soccer | Consider recalculating if trajectory changed significantly |

**Tabs to verify after changing:**
- Explore Schools → school modal → Conference History tab
- Compare tab — Conference (last 6yr) row

---

### CHANGE TYPE 7 — Pipeline / Titles Changed

| What to update | Why |
|---|---|
| `data/pipeline.json` — ncaaD1[], ncaaD2[], or mlsDraft[] | Powers the Pro Pipeline tab tables |
| `data/[conf].json` — proPlayers.mlsPicks5yr, titles[], proPlayers.draftRank | Powers school modal pipeline tab |
| `data/conf-prestige.json` — conference mlsPipeline field | Conference prestige table MLS column |
| `data/[conf].json` — lensScores.soccer | MLS picks factor into soccer lens — consider recalculating |

**JUCO / NJCAA rule (confirmed v37.10):** JUCO national titles and rankings are **NJCAA** achievements, a completely separate governing body from **NCAA**. Never place a JUCO school in the ranked medal section of `ncaaD1[]` or `ncaaD2[]` (those are literally "NCAA championships" — mixing in NJCAA titles is a category error) — JUCO credentials belong only in the unranked/grouped section at the bottom of `ncaaD2[]` (labelled "NAIA, D3 & JUCO"), using `years`/`yearsStyle` chips (`chip-green` for actual NJCAA champions, `chip-purple` for rankings/All-Americans/tournament results) rather than the `titles`/medal-rank fields used for real NCAA champions. `mlsDraft[]` has no such restriction — MLS SuperDraft picks are picks regardless of the feeder program's governing body.

**Tabs to verify after changing:**
- Pro Pipeline — championship tables and MLS SuperDraft table updated
- Explore Schools → school modal → Pro Pipeline tab
- Conferences — conference prestige table MLS column

---

### CHANGE TYPE 8 — Listed Profile → Full Profile Upgrade

**Step order matters — do not skip steps or reorder:**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — add all full-profile fields | `profileDepth: "full"`, `color`, `devScores`, `facilityDetails{}`, `culture{}`, `staff[]`, `courses[]`, `acuUnits[16]`. Expand `fin{}` with tuition/roomBoard/fees/maxAthletic/maxAcademic/aidType. |
| 2 | `data/[conf].json` — validate JSON | `python -m json.tool data/[conf].json` — do not proceed if invalid |
| 3 | `data/coaches.json` — add coach entry | Re-rank ALL coaches after every batch. |
| 4 | `js/app.js` — DOMAINS, SITE_URLS, SOCIAL | Add entry for each upgraded school. Run `node --check js/app.js` after. |
| 5 | `data/conferences.json` — guideSchools[] | Move school from `otherSchools[]` into `guideSchools[]`. |
| 6 | `data/conferences.json` — desc and olivierNote | **Always update these.** Change the school count and add new highlights. Most frequently missed step. |
| 7 | `minutesOutlook` — research and populate roster data | Minutes Outlook is 20% of fitOlivier. Use Claude for Chrome MCP on the official roster page (see §15). Only set `{ "available": false }` if roster cannot be obtained — document why. |
| 8 | Validate all modified files | `python validate_schools.py` then `python -m json.tool` on each JSON, `node --check` on JS |
| 9 | Commit with version bump | `vNN.N — [Conference] batch: X listed schools upgraded to full profile` |

**acuUnits false patterns by acuAlign:**

| acuAlign (trues) | Units to set covered:false |
|---|---|
| 13 | EXSC394, EXSC187, EXSC398 |
| 12 | EXSC394, EXSC296, EXSC187, EXSC398 |
| 11 | EXSC394, EXSC204, EXSC296, EXSC187, EXSC398 |
| 10 | EXSC394, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 9 | EXSC394, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 8 | EXSC394, EXSC322, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |

All 16 units in order: `ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394, EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296, EXSC187, EXSC230, EXSC122, EXSC398`

**Also update after EVERY conference batch:**
- `data/conf-prestige.json` — `programsInGuide` string and `relevance` text. This is a SEPARATE file and is NOT updated automatically.

**Tabs to verify after upgrading a batch:**
- Explore Schools — modal opens with all 9 tabs populated
- Coaches & Staff → Rankings — new coaches present with correct badge colour
- Conferences — conference card shows updated guideSchools count and desc/olivierNote
- Conferences → Rankings table — programsInGuide column shows new school count
- Financial Model — upgraded schools now appear
- ACU Alignment — rows present for all upgraded schools (non-JUCO only)

---

### CHANGE TYPE 9 — Degree Program (degreeTitle) Updated

**Rule: Any time degreeTitle is researched or changed, steps 2–4 below are mandatory.**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — degreeTitle | The degree name shown on the school card and modal |
| 2 | `data/[conf].json` — acuAlignNote | Must reference the actual degree by name with specific course examples — not generic template text |
| 3 | `data/[conf].json` — acuUnits[] | Verify coverage against real degree course offerings |
| 4 | `data/[conf].json` — acuAlign | Count of covered:true must equal this integer |

**If acuUnits or acuAlign changed, also cascade:**
- `lensScores.academic` — re-evaluate
- `lensScores.overall` — recalculate if academic lens changed significantly
- `fitOlivier` — recalculate (acuAlignment = 10% of fit score)

**JUCO EXCEPTION:** Do NOT cascade acuAlign into fitOlivier for JUCO schools. ACU alignment is informational only for JUCOs.

**Tabs to verify:** ACU Alignment tab, Explore modal Overview tab (acuAlignNote text), Explore fitOlivier (non-JUCO only).

---

### CHANGE TYPE 10 — School Removed

| What to update | Why |
|---|---|
| `data/[conf].json` — remove school object entirely | Primary record — all other files reference this |
| `CLAUDE.md` — School → File Reference Table | Remove the school's row — mandatory |
| `data/coaches.json` — remove coach entry | Orphaned entry renders a broken card in Rankings/Profiles |
| `data/coaches.json` — re-rank ALL remaining coaches | Rank gaps break Rankings display |
| `js/app.js — DOMAINS` | Remove entry — stale entry is harmless but creates noise |
| `js/app.js — SITE_URLS` | Remove entry |
| `js/app.js — SOCIAL` | Remove entry |
| `data/conferences.json` — guideSchools[] | Remove school display name from array |
| `data/conferences.json` — desc and olivierNote | Update school count — most frequently missed step |
| `data/conf-prestige.json` — programsInGuide | Remove school from comma-separated string |
| `data/pipeline.json` | Only if school had entries — remove from relevant table |
| `athletes/olivier.json` — shortlist[] | Remove if present — orphaned shortlist entry causes display error |
| `athletes/olivier.json` — outreach[] | Remove if present |

**Tabs to verify after removing:**
- Explore Schools — school card gone, no ghost card, total count is N-1
- Dashboard — map dot gone
- Conferences — school chip gone from guideSchools, count updated in desc/olivierNote
- Coaches & Staff → Rankings — coach gone, all remaining coaches renumbered correctly
- ACU Alignment — row gone
- Minutes Outlook — card gone
- Financial Model — school gone from selector
- F12 console — zero errors (orphaned references throw JS errors)

---

### CHANGE TYPE 11 — UX / JS Change

| What to do | Why |
|---|---|
| Identify the specific function(s) involved | Never edit JS without knowing exactly which function owns the behaviour |
| Read those functions in full before touching them | The most common JS error source is editing without reading first |
| Map which tabs render using those functions | Determines test scope — targeted vs full regression |
| Run `node --check js/[file].js` immediately after every edit | Don't wait for Phase 7 — catch syntax errors at the source |

**Test scope by change type:**
- Score calculation change (scores.js) → full regression all tabs
- Single tab renderer change → targeted (affected tab) + smoke test all others
- Sort / lens / mode logic → Explore Schools full test + mode/sort/lens combos
- Dashboard renderer → Dashboard tab full test + smoke others
- Cosmetic / text change → smoke test only

---

### CHANGE TYPE 12 — facilityDetails.housing Changed (added v41.0)

**Housing feeds the Fit Score since v41.0 — a housing change is a score change, not a display tweak.**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — facilityDetails.housing{} | `available` exactly `true` \| `false` \| `"limited"` + note. Tier-1: official residence-life page. |
| 2 | `data/[conf].json` — fitOlivier | Re-apply the penalty: −6 false / −3 limited / 0 true. Stored value must match scores.js output. |
| 3 | `data/[conf].json` — lensScores.overall | Same integer as fitOlivier. |
| 4 | `data/[conf].json` — lensScores.value | value = fitOlivier×0.6 + affordability×40 — recompute since fitOlivier moved. |

**Tabs to verify:** Explore (card score + Best Fit sort position), Dashboard Top 8 (may reshuffle), school modal fit score, housing warning chip on card/modal. `node validate_consistency.js` catches a missed cascade (fit drift) AND a missing/invalid housing field (HOUSING check).

---

### CHANGE TYPE 13 — devScores Changed (added v42.0)

**A dev score is 60% of Soccer Program Quality, which is 40% of Fit — so `devScores` drives 24% of `fitOlivier`. A 10-point dev move is a 2.4-point Fit move. This is never a display-only edit.**

**Before touching any sub-score, read §5a.** Score against the written rubric and its anchors — never from feel, never off a ranking site, never from a team's results.

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — `devScores{tactical, technical, fitness}` | Each 0–100, absolute national scale, Tier-1 evidence from the school's own athletics staff directory + facilities pages |
| 2 | `data/[conf].json` — `devScoresNote` | Cite the evidence observed. A score with no note is unverifiable and will be re-litigated next session |
| 3 | Confirm `devAvg` ≤ the division ceiling (§5a) | D1 95 · Ivy 88 · D2 76 · NAIA 72 · JUCO 68 · D3 66 |
| 4 | `data/[conf].json` — `fitOlivier` | Recompute; must match `scores.js` output exactly |
| 5 | `data/[conf].json` — `lensScores.overall` | Same integer as `fitOlivier` |
| 6 | `data/[conf].json` — `lensScores.value` | `fitOlivier×0.6 + affordability×40` — recompute, `fitOlivier` moved |

**Tabs to verify:** Explore (card Dev Score stat, card Fit score, Best Fit sort position, Soccer lens ranking), Dashboard Top 8 (may reshuffle), school modal Overview + the three dev sub-score bars, Compare tab's Tactical Dev row.

**Glossary rule applies.** `index.html`'s "Development Sub-Scores" section hardcodes anchor schools in prose. It currently names *"Virginia (Gelnovatch), Indiana (Yeagley) and FIU (Russell)"* and cites sports-science departments at *"Indiana, UCLA, UF"* — **UF is not one of the 110 schools; Florida fields no men's soccer program.** Any dev-score change that moves an anchor must fix that block in the same commit.

`node validate_consistency.js` catches a missed cascade (fit drift). It does **not** and should not check the sub-scores themselves — they are judgment values, not derivable.

---

## 4. Immovable Architecture Rules

These rules cannot be overridden by the user in session. If a proposed change would violate one, stop and flag it.

**index.html is a shell.**
It must never contain hardcoded school data, coach data, conference tables, pathways, or pipeline tables.

**Schools live in their conference JSON file.**
There is no single schools.json. Use the file map in Section 2.

**coaches.json is the single source of truth for coach data.**
When a coach changes, update both the school's JSON object AND coaches.json. Both must stay in sync.
After adding any new coach, re-rank ALL coaches by overallScore descending and update every rank field.

**athletes/olivier.json is the single source of truth for all athlete config.**
This includes: scoreWeights, shortlist, outreach, budget, pathways, coachQuestions, soccerLevelMap, prePtMap.
`data/olivier.json` no longer exists — do not re-create it.
app.js and dashboard.js both fetch from `athletes/olivier.json` only.

**Every school object requires these fields — app crashes silently without them:**
- `acuUnits[]` — array of exactly 16 objects `{ "unit": "UNITCODE", "covered": true/false }`
- `confKey` — must match a key in `CONF_SECTIONS` in app.js EXACTLY (case-sensitive)
- `conf` — actual conference name (e.g. "NEC", "CACC") — drives confgroup filter
- `domain` — athletics domain for favicon
- `minutesOutlook` — set `{ "available": false }` if data not collected
- `facilityDetails.rating` — "Elite" | "Excellent" | "Very Good" | "Good" | "Solid" (full-profile only)
  - **Rating criteria** (surface type — grass or turf — does not affect tier):
  - Elite: Fully dedicated soccer-only stadium, 5,000+ cap with real atmosphere; full S&C + recovery + video/analysis + GPS + dedicated sports med; on-campus; strong fan culture
  - Excellent: Dedicated stadium (minor sharing OK), 2,500–5,000 cap; full S&C + sports med + video/analysis; on-campus; decent fan support
  - Very Good: Dedicated or lightly shared, 1,500–3,500 cap, lights + permanent seating; solid S&C + basic sports med; on-campus or very close
  - Good: May share with other sports, 500–2,000 cap; standard weight room + athletic trainers; on-campus; typical support
  - Solid: No dedicated stadium or off-campus; limited/no seating; basic or shared facilities only
  - **JUCO rule:** stadium capacity is weighted lower — strong S&C, sports med, GPS/video analysis can lift a JUCO from Solid to Good or Very Good regardless of capacity
- `lensScores` — 6 pre-computed scores (full-profile only; pt lens removed in v22)

**CONF_SECTIONS in app.js controls which cards-grid section a school appears in.**
Each section has a `key` (matches school's `confKey`) and a `divFilter` (matches school's `div`).
D3 and JUCO schools both use `confKey: 'other'` but are split by `divFilter: 'D3'` vs `divFilter: 'JUCO'`.
A school with a wrong or missing `confKey` is invisible in Explore and has no Details button.

**conferences.json tier strings must match the renderConferences() bucket keys exactly.**
Valid tier strings (verified against app.js renderConferences(), July 2026): `"Power 5 (D1)"`, `"High Major (D1)"`, `"Ivy League (D1)"`, `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"Division III"`, `"Junior College"`.
A wrong tier string silently hides the conference card — this is exactly how the Big East (`"Major (D1)"`), SEC (`"Power 4 (D1)"`), and Ivy (`"D1 (Ivy)"`) cards vanished from the Conferences tab (v36 backlog, §6). If a new bucket is genuinely needed, add it to the `tiers` array in renderConferences() AND this list in the same commit.

**Map coordinates use the v20 640×390 SVG coordinate system.**
mapX/mapY must be recalculated if coming from an older system. Verify on Dashboard after adding any school.

**DOMAINS, SITE_URLS, and SOCIAL in app.js must be updated whenever a new school is added or removed.**

**Service academy rule (Army / Navy / USNA):**
`costNum=0`, all `fin{}` numeric fields = 0, `maxAthletic=1.0`, `maxAcademic=0`. Include an explicit service commitment warning in every text field — `rec`, `acuAlignNote`, `fin.internationalNote`, `culture.olivierMatch`. These schools are not compatible with Olivier's DPT/Chiropractic goal or MLS pathway — this is a **narrative warning only**, since fitOlivier (v37.1+) doesn't score cost or career-goal fit at all. Do not try to force fitOlivier low for these schools; if their soccer/minutes/climate/city numbers are genuinely good, the score will reflect that — the incompatibility is communicated via the text fields, not suppressed in the score.

**Sort and Lens are two independent, non-conflicting controls** (the Score Mode toggle was retired in v37.1 — Soccer Priority is now the only Fit Score, so there's nothing to toggle between).
- Sort pills → reorder cards; Best Fit sort is lens-aware (sorts by lensScores when a lens is active)
- Lens pills → apply visual badges/highlights only; do NOT reset sort
- These two systems must never override each other's state silently

---

## 5. Data Schema — Required Fields Reference

### School object (full-profile)
```
id, name, full, loc, region, div, conf, confKey, domain,
warm, city, top, color[],
degreeTitle, acuAlign (int 1–16), acuUnits[] (16 objects),
acuAlignNote, soccerLevel, cost, aid, fin{},
size, prePT, kinRank, coach{}, gpa{},
facilities[] (brief array — 3 bullet strings for card display; full-profile schools also require facilityDetails{}),
devScores{ tactical, technical, fitness },   ← 3 keys only — ptPath removed in v22
devScoresNote,                               ← added v42.0 — cites the Tier-1 evidence the
                                                dev scores were drawn from. Its PRESENCE means
                                                "scored against the §5a rubric" and activates
                                                validate_consistency.js's DEV-RUBRIC ceiling
                                                check for this school. Absent = legacy score,
                                                pending re-baseline (§6). Min 20 chars.
fitOlivier (0–100),
lensScores{ overall, soccer, academic, minutes, lifestyle, value },  ← 6 keys — pt removed v22
tags[], facilities[], courses[], rec, url,
mapX, mapY,
profileDepth: "full",
minutesOutlook{ available: true/false, … },
facilityDetails{ rating, stadium, trainingFields, strengthConditioning,
                 sportsScience, sportsMed, academicLabs, extras, note,
                 housing: { available: true/false/"limited", note } },  ← added v37.7; REQUIRED
                                                since v41.0 (feeds the Fit Score housing penalty;
                                                validate_consistency.js HOUSING check enforces it)
culture{ vibe, thingsToDo, socialScene, olivierMatch, lifestyleTags },
confRecord[{ yr, pos, note }],
titles[], proPlayers{}
```

For JUCO schools, also add: `"juco2yr": true`, `"jucoTier": "Elite" | "Standard"`, and `"jucoTierNote"` (added v37.4 — informational badge only, NO Fit Score cascade; classification basis: 2025-season national title/runner-up, top-5 national ranking, 2+ 2025 NJCAA All-Americans, or recent historical dominance, verified via official NJCAA.org All-America team list). Every JUCO school has `jucoTier` set explicitly — currently 9 of 12 are "Elite", 3 are "Standard". The Elite badge only renders on cards/modal when `jucoTier==='Elite'`; "Standard" schools show no badge at all.

For **NJCAA-affiliated** JUCO schools, also add `"njcaaRegion": "Region N"` + `"njcaaRegionArea"` (added v37.5 — informational display only, no scoring cascade), verified against NJCAA.org's official "Organization of NJCAA Regions" page (24 regions, state-to-region mapping). **Do not add this to non-NJCAA schools** — Santa Monica College competes in CCCAA (California's separate community college association), not NJCAA, so it has no `njcaaRegion` field at all. This was caught live: an external AI-generated regional-strength claim incorrectly grouped Kansas schools (Barton CC, Cowley County CC) into "Region 11" — NJCAA's own page confirms Region 11 is Iowa + Northeast Nebraska only, and Kansas is Region 6. Never trust a third-party regional grouping without checking njcaa.org/member_colleges/Organization_of_NJCAA_Regions directly.

**Field gotchas (verified against the renderers, July 2026):**
- `kinRank` — one-line program-ranking blurb shown in the modal Degree tab. REQUIRED on every full profile: the renderer prints it unguarded, so a missing field displays the literal text "undefined". (Was missing on 45 v25-batch schools; backfilled v36.7.)
- `gpa.status` — must be exactly `eligible` | `borderline` | `below`. This is now purely informational/filter display (v37.1 removed GPA from the Fit Score) — cards recompute live via `refreshAllGpaRows()` and the Compare tab now calls `dynamicGpaStatus()` live too (v36.5), so this stored field can't drift the way it used to.
- `minutesOutlook.recruit_risk` — must be exactly `Low` | `Medium` | `High`. The renderers have no branch for anything else: `Very High`, `Medium-High`, `Moderate`, or sentence-style values all fall through to the green "Open" label — the opposite of the researched meaning.
- Stored `fitOlivier` / `lensScores.overall` must always equal the live scores.js formula output (`calculateFitScore()` — Soccer Priority formula since v37.1). `recalculateAllScores()` runs on every page load (`initApp()`), so any drift shows up immediately, not just when some toggle is touched. `node validate_consistency.js` checks this (Phase 4).
- `juco2yr: true` is the ONLY flag renderACUTable() uses to exclude JUCOs from the ACU Alignment tab — `div: "JUCO"` alone does NOT exclude.
- `facilityDetails.housing` — **REQUIRED on every full profile since v41.0, and it feeds the Fit Score.** `available` must be exactly `true | false | "limited"` — the housing penalty (−6/−3, see the weights table above) and a validate_consistency.js HOUSING check both read it. Display remains silent-unless-flagged (tag only when `false`/`"limited"`, same pattern as `top`/Elite JUCO — don't add a positive-case tag). All 110 schools researched Tier-1 as of v40 (12 JUCOs v37.7, 81 non-JUCO v38.2-v38.12, 17 v39 JUCOs in v39). A school added without this field now fails validation AND silently skips the penalty — never omit it.

### School object (listed-profile)
Same fields but `profileDepth: "listed"`.
`devScores` must be `null` — not zeros. Zeros render as "0%", null renders as "—" or hidden.
`minutesOutlook` must be `{ "available": false }`.

### minutesOutlook{} — full field reference
```
available (bool),
mf_total_2025 (int), cleared_before_2027 (int), cleared_names[],
rising_senior_2027_count (int), rising_senior_2027_names[],
rising_junior_2027_count (int), rising_junior_2027_names[],
recruit_risk ("Low" | "Medium" | "High"),
trajectory[{ year, yr_label, pct, label }],
recruit_pathway ("Freshman-friendly" | "Transfer-preferred" | "Portal/JUCO-heavy" | "Mixed"),   ← added v34, optional, informational only
recruit_pathway_note (string)   ← added v34, optional, informational only — describe the actual roster pattern found (e.g. share of midfield spots filled by transfer/JUCO vs true freshmen, and whether true-freshman internationals who succeeded shared a pro-academy background)
```
`recruit_pathway` and `recruit_pathway_note` carry **no scoring weight** — they do not feed lensScores.minutes or fitOlivier. They exist to separate "this school is a good fit on paper" from "this school realistically offers an entry point as an incoming freshman." Populate only when a school's roster is actually researched (Phase 1G) — do not backfill retroactively as a standalone project (that full pass is tracked separately, see backlog below).

### acuUnits[] — all 16 unit codes in order
```
ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394,
EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296,
EXSC187, EXSC230, EXSC122, EXSC398
```

**Standard false patterns by acuAlign** — count of `covered:true` must equal `acuAlign` integer:

| acuAlign | covered:false units |
|---|---|
| 13 | EXSC394, EXSC187, EXSC398 |
| 12 | EXSC394, EXSC296, EXSC187, EXSC398 |
| 11 | EXSC394, EXSC204, EXSC296, EXSC187, EXSC398 |
| 10 | EXSC394, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 9 | EXSC394, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 8 | EXSC394, EXSC322, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 7 or below | Start from the 8-false set above and additionally mark covered:false working backwards from the end of the unit list (EXSC398, EXSC122, EXSC230, EXSC187...) until covered:true count matches acuAlign. Always verify the final count manually. |

### coaches.json — required fields per coach entry
```
id, schoolId, name, school, div, conf,
rank, rankClass (rk-elite | rk-strong | rk-solid),   ← HYPHENS not underscores
yearsHC, record, mlsPlayers, overallScore,
ptPathScore (deprecated — set to 0 for new coaches; retained for legacy data),
ausConnection (bool), licence (string or null),
bio, strengths[], staff[],
contact{ email, phone }
```
rankClass drives badge colour: `rk-elite` = gold, `rk-strong` = sky, `rk-solid` = emerald.
**After any coach addition or removal, re-rank ALL coaches by overallScore descending. Rank must be sequential with no gaps.**

### conferences.json — required fields per entry
```
id, name, abbr, tier, tierClass, prestige,
founded, teams, soccerTeams, ncaaTitles,
mlsPipeline, scholarships,
guideSchools[] — display names (e.g. "Virginia (UVA)") NOT school JSON ids,
otherSchools[],
desc, olivierNote, color[]
```
**tier field must exactly match renderConferences() bucket keys:** `"Power 5 (D1)"`, `"High Major (D1)"`, `"Ivy League (D1)"`, `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"Division III"`, `"Junior College"`

### conf-prestige.json — required fields per entry
```
rank, rankClass, name, fullName, div, divBadge,
programsInGuide (comma-separated display names),
programsInGuideWarning (bool),
mlsPipeline, mlsPipelineWarning (bool),
scholarships, relevance
```

### pipeline.json — structure
```
{
  ncaaD1[]:  { rank, rankClass, school, badge, badgeClass, titles,
               titlesColor, years, yearsStyle, notes }
             sectionDivider entries: { sectionDivider: true, dividerLabel }
  ncaaD2[]:  same shape
  mlsDraft[]: { rank, rankClass, school, badge, badgeClass,
                picks5yr, notable, allTime }
}
```

### athletes/olivier.json — complete schema
```
id, name, agentName, guideVersion,
position, positionCode, positionRating, positionStyle,
currentGpa, gpaStatus, yearLevel,
expectedAtarMin, expectedAtarMax, defaultAtar,
targetDeparture,
auDegree, auUnitsTotal, auUnitsCompleted[], auUnitsPlanned[],
wesTransferableUnits[],
careerGoal, lifestylePrefs[], targetDivisions[],
budgetAUD, budgetUSD, fxRate,
shortlist[] — [{id, status}] objects
outreach[]  — [{schoolId, status, lastContact, note}]
scoreWeights{ soccerQuality, minutesOutlook, climate, city }
guideTitle, guideSubtitle,
pathways{ paths[], coachQuestions[] }
```

**Retired in v37.1** (removed from schema — no longer read by any code): `scoreWeightsBase`, `soccerLevelMap`, `prePtMap`. These backed the old blended Fit Score (GPA/Cost/ACU included) and the score-mode toggle, both removed. If you find these fields referenced in an old branch or archived doc, they're describing pre-v37.1 behavior.

### Fit Score weights (v37.1 — live; matches scoreWeights in athletes/olivier.json)
| Factor | Weight | Formula |
|---|---|---|
| Soccer Program Quality | 40% | `devAvg×0.6 + (mlsPicks5yr/10, capped at 1)×0.3 + divStrength×0.1` — richer than a simple division lookup |
| Minutes Outlook | 35% | `(Yr1%×0.6) + (Yr2%×0.4)`, neutral 0.5 if unavailable |
| Climate | 15% | 1.0 if warm, else 0.2 (Olivier wants warm) |
| City Campus | 10% | 1.0 if city, else 0.3 (Olivier wants city) |
| **Housing penalty (v41.0)** | flat deduction | after the weighted total: **−6** if `facilityDetails.housing.available === false`, **−3** if `"limited"`, 0 if `true`. Owner-approved v41.0 — a young international with no dorms faces off-campus rent + transport alone; no other toggle captures this. `housingPenalty()` in scores.js; mirrored in validate_consistency.js. |

Same formula for JUCO and non-JUCO — GPA, Cost, and ACU Alignment are deliberately **not** in the Fit Score at all (v37.1 decision): they already have dedicated views (ATAR/budget toggles, Financial Model tab, ACU Alignment tab) and can't be predicted ahead of a real offer, so blending them in was actively misleading (e.g. Stanford sitting at 41% purely because of cost, pre-v37.1). When a real offer appears, check GPA/Cost/ACU manually via those dedicated views — don't expect the Fit Score to reflect them.

`divStrength` map (`DIV_STRENGTH` in scores.js): D1=1.0, IVY=0.9, D2=0.8, NAIA=0.65, D3=0.5, JUCO=0.6 — note this is a *different* map from the retired `soccerLevelMap` (which had JUCO=0.75); don't confuse the two if referencing old data.

---

## 5a. Dev Score Rubric (v42 — the written standard; score against this, never from feel)

**Status: standard adopted v42.0 (doc-only). The 110 stored `devScores` have NOT yet been re-scored against it.** Until the re-baseline lands, stored dev scores predate this rubric and should be treated as unverified.

### What Dev Score is

The quality of the **daily training environment** a player trains in, expressed on an absolute national scale anchored at the top of D1. It answers: *"how much will Olivier develop here, measured against the best environment available in US college soccer?"* — never *"how good is this program for its division?"*

### What Dev Score is NOT

| Not this | It lives here instead |
|---|---|
| Team results, rankings, titles | `titles[]` / `confRecord[]` |
| Transfer or professional output | `nextLevelOutput` (§5b) |
| Scholarship availability | `fundingPathway` (§5c) |
| Level of competition faced | `DIV_STRENGTH` in scores.js |
| Playing time | `minutesOutlook` |

**Every historical dev-score drift came from smuggling one of the above into a sub-score.** The v39 JUCO batch scored dev off 2025 results and rankings; the result was Indian Hills (JUCO) tying Syracuse (2022 NCAA champions) at 78, and Phoenix College (NJCAA DII) out-rating Tyler JC (NJCAA DI, 6 national titles). **If the evidence you are holding is a *result*, it does not belong in a dev score.**

### Sub-scores — each 0–100, absolute, averaged to `devAvg`

| Sub-score | Measures | Tier-1 evidence required |
|---|---|---|
| `tactical` | Coaching system quality for a central midfielder | Number of full-time coaches; head-coach tenure and playing/coaching pedigree; documented system of play; whether position-specific coaching exists |
| `technical` | Training environment | Soccer-specific vs shared facility; pitch standard; video-analysis staff; GPS/wearable technology |
| `fitness` | Sports science integration | S&C coach dedicated to soccer vs shared across sports; sports-performance staff listed in the athletics directory; nutrition and rehab access |

**Source discipline:** the school's own athletics staff directory and facilities pages. **Never a ranking site** — a ranking site measures results, which is the exact category error this rubric exists to prevent. Record what was observed in `devScoresNote`.

### Anchors — calibrate against these; do not re-score them casually

- **90–95** — Clemson, Indiana, Maryland, Georgetown, UVA. Full-time staff, sports-science personnel dedicated to soccer, soccer-specific stadium *and* training ground.
- **~75** — Creighton. Solid D1, shared S&C, no dedicated sports science.
- **~60** — DePaul. D1 membership, modest program investment.

**Conference is NOT a proxy for development environment.** Big East membership does not give DePaul's soccer program Indiana's sports-science department; basketball money does not reach the pitch. Score the program, not the letterhead. (This was tested: banding D1 by conference put 37 schools below their own floor — DePaul 60, Villanova 61, Xavier 63, Seton Hall 64 — because the band was wrong, not the scores.)

### Division ceilings — a ceiling, not a target

Justified on **staffing and facility limits**, both verifiable per-school from an athletics staff directory. Not on scholarship rules — scholarships are a funding fact and live in §5c.

| Division | Ceiling | Structural reason |
|---|---|---|
| D1 | **95** | anchor tier |
| Ivy | **88** | high-major staffing and facilities, but no spring competitive season |
| D2 | **76** | 1–2 full-time coaches, shared S&C, shared facilities |
| NAIA | **72** | 1–2 coaches, minimal support staff |
| JUCO | **68** | 1–2 coaches, rarely any S&C or sports science, often shared/municipal fields |
| D3 | **66** | often part-time coaches, no dedicated S&C |

**D1 has no floor.** A weakly-invested D1 program scoring 55 is a valid outcome, not a data error.

**No JUCO DI/DII dev split.** A DII JUCO may legitimately out-score a DI JUCO on *environment* if its facilities and staff are genuinely better. Where NJCAA DI pulls ahead is `nextLevelOutput` and `DIV_STRENGTH` — not here. Corollary, and it is counter-intuitive: **Northeast CC (2024 NJCAA DII National Champion) holding the lowest dev score of all 29 JUCOs is not necessarily wrong.** A national title is a result. It belongs in `titles[]` and `nextLevelOutput`, and it says nothing about whether the program employs a strength coach.

### Process per school

1. Gather Tier-1 evidence for all three sub-scores from the school's own site.
2. Score each sub-score 0–100 against the anchors above.
3. Compute `devAvg`; confirm it sits at or below the division ceiling.
4. Write `devScoresNote` citing the evidence observed.
5. Cascade: `fitOlivier` → `lensScores.overall` → `lensScores.value` (see §3a Change Type 13).

---

## 5b. nextLevelOutput (v42 — designed + scoped, NOT yet implemented)

Replaces the `mlsPicks5yr` term inside `soccerQualityScore()`. Measures **does this program move a player up a level** — the thing dev scores were being abused to express.

### The bug it fixes is larger than the JUCOs (measured v42.1)

`mlsPicks5yr` is a **D1-shaped metric applied to a guide where 40 of 110 schools are not D1.**

| Division | Schools | `mlsPicks5yr > 0` | Pipeline term stuck at 0 |
|---|---|---|---|
| D1 | 67 | 58 | 9 |
| Ivy | 2 | 2 | 0 |
| **D2** | 8 | **0** | **8 — all** |
| **NAIA** | 3 | **0** | **3 — all** |
| **D3** | 1 | **0** | **1 — all** |
| **JUCO** | 29 | 1 (Monroe) | **28** |

**40 schools can never access 12 Fit points** (0.3 × 40 weight), no matter how many players they send up. Barry — 4× D2 national champions, the most decorated D2 program in the country — carries the same zeroed pipeline term as a bottom-table JUCO. Tyler JC's own record already conceded the problem: `"draftRank": "JUCO level — D1 transfer pipeline is the primary metric"`, while the formula had nowhere to put it. This is *why* past sessions inflated `tactical` — it was the only lever left.

### Metric: a RATE, never a raw count (owner-approved v42.1)

| Division | Metric | Normalised by |
|---|---|---|
| D1 / Ivy | MLS SuperDraft picks + pro signings, 5yr | `min(1, picks/10)` — unchanged |
| D2 / NAIA / D3 | Pro signings (MLS / MLS NEXT Pro / USL) per year | divisor calibrated from evidence |
| JUCO | **D1 transfer commitments per year** | divisor calibrated from evidence |

**Raw counts are forbidden, and this nearly trapped the v42.1 session.** Schools publish wildly different windows of history:

| School | Page name | D1 alumni | Window | **Per year** |
|---|---|---|---|---|
| Tyler JC | "Next Level" | 74 | 2012–2023 (12 yr) | **6.2** |
| Iowa Western | "Former Reivers" | 87 | 2004–2026 (22 yr) | **4.0** |

Iowa Western has *more* D1 alumni over a window nearly twice as long. **A raw 5-year count rewards whoever publishes the most history, not whoever develops the most players** — it is a website-quality proxy, exactly the class of error §5a exists to prevent. Store `d1Count`, `yearsCovered`, `years`, `perYear`, and `sourceUrl`; score off `perYear`.

### Schema (proposed)
```
proPlayers.nextLevel {
  metric: "d1TransferRate" | "proSigningRate" | "mlsPicks5yr",
  d1Count, totalCount,          ← raw, for display + audit
  yearsCovered: "2012-2023",
  years, perYear,               ← perYear = d1Count / years
  sourceUrl, note
}
```
Absence of `nextLevel` ⇒ fall back to `min(1, mlsPicks5yr/10)`. **The field's presence gates the new behaviour**, so `scores.js` can ship before any data exists and move zero scores — the same one-way-door pattern as `devScoresNote` (§5a).

### Sourcing (Tier-1, per school)
Each program's own alumni page. **Naming is inconsistent** — Tyler JC calls it *"Next Level"*, Iowa Western *"Former Reivers"* — so each school needs discovery, not a URL pattern. **Indian Hills returns HTTP 403 to WebFetch** (Cloudflare/Sidearm). Per §15, use the Claude for Chrome MCP for these scrapes; the v39 session lost two rosters to exactly this WebFetch failure mode and recovered both on the first real-browser attempt.

**Do not calibrate the divisor before gathering a real sample.** A guessed constant shipped into `scores.js` is indistinguishable from the inflation this whole effort exists to remove.

---

## 5c. fundingPathway (v42 — designed, NOT yet implemented)

A flat penalty applied after the weighted total, exactly like `housingPenalty()` (v41.0). Owner-approved v42.0.

**The distinction that justifies it:** *cost* is a price tag (COA in dollars, varies yearly, has the Financial Model and budget slider — correctly removed from `fitOlivier` in v37.1). ***Scholarship availability* is a structural property of the program** — a CCCAA or D3 school cannot offer athletic money to anyone, ever, at any price. v37.1 removed the price tag; it never ruled on structural availability. Two schools with identical Fit should not rank equal when one can fund an athlete for playing and the other is forbidden to.

| Value | Meaning | Divisions | Penalty | Count |
|---|---|---|---|---|
| `full` | Full athletic ride structurally possible | D1, NJCAA DI | **0** | 87 |
| `capped` | Permitted but limited by rule | D2 (9 equiv.), NAIA (12 equiv.), NJCAA DII (no room & board) | **−3** | 19 |
| `none` | No athletic scholarships permitted | Ivy, NCAA D3, CCCAA | **−8** | 4 |

**Stacks with `housingPenalty()` — owner-approved v42.0.** Santa Monica: −6 housing, −8 funding = −14. Deliberate: no on-campus housing *and* no athletic money means the family pays rent unaided.

**The penalty ranks; the note discloses.** `aid` display strings stay fully descriptive. Princeton's *"Need-based ONLY — no athletic scholarships (can cover 100% for qualifying families)"* must remain visible in the modal — the −8 reflects that the aid is means-tested and carries no coach leverage, not that Princeton is unaffordable. Owner considered and rejected a `need-only` exemption tier (v42.0): the platform's premise is flagging *scholarship* opportunities.

**Scope note:** because `full` carries a zero penalty, *House*-settlement opt-in status does **not** need researching for the 60 D1 schools — it cannot change a score. Default D1 → `full`. Only the 23 `capped`/`none` schools need Tier-1 aid research.

**Known data errors this will fix** (found v42.0, not yet corrected): Santa Monica stores `aid: "Athletic Grants + Need"` though CCCAA prohibits athletic scholarships outright; Phoenix, Pima, Glendale and Johnson County store a bare `aid: "Athletic"` though NJCAA DII covers tuition/fees/books only. These strings render on the card, the Compare row, and the modal.

Division rules (Tier-1, verified v42.0): NCAA D1 post-*House* (July 1 2025) replaced sport-specific scholarship limits with a 28-player roster cap, all fundable, at opt-in schools — [ncaa.org](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx). NJCAA DI: tuition, fees, books, room & board. DII: tuition, fees, books only. DIII: none — [njcaa.org](https://www.njcaa.org/member_colleges/Divisional_Structure). Ivy League: need-based aid only, no athletic scholarships in any sport. CCCAA: athletic scholarships prohibited.

---

## 6. Version History & Current State

**Current version: v41.0 (July 2026).** Always confirm with `git log --oneline -1` and `guideVersion` in `athletes/olivier.json`. All v39 work is committed and pushed (`c456259` = v39.1–v39.6 squashed, `09c2ab7` = v39.7, `69cfc55` = failures summary); v40.1/v40.2 followed. See `v39_session_failures_summary.md` for the v39 incident log.

Full per-version history lives in **CHANGELOG.md** — moved out of this file in v35.2 to cut per-session context cost (this file is read at the start of every session; the changelog is read only when history is needed). Phase 8 appends new version notes to CHANGELOG.md, not here.

### State snapshot (update only when it changes)
- 110 schools, all full-profile, across 10 conference JSON files. 110 coaches in coaches.json, ranked 1–110.
- JUCO section: 29 schools, spanning all 6 NJCAA regions represented in the guide (Region 1 AZ, Region 6 KS, Region 8 FL — capped at 3, only 3 of 28 FCSAA colleges field men's soccer, Region 11 IA/NE, Region 14 TX/LA, Region 15 NY) plus Santa Monica (CCCAA, non-NJCAA). All 29 correctly flagged `juco2yr:true`. Fit Score formula (v37.1) is identical for JUCO and non-JUCO — no weight redistribution, since ACU was removed from the formula entirely.
- **v39.1-v39.4 — JUCO region sub-sections (Explore tab) + 17 new JUCO schools added toward a top-5-per-region target:** Explore tab's JUCO section now groups cards by NJCAA region with collapsible sub-headers that correctly hide/show under search and filters (`js/app.js` `renderCards()`). 17 new schools added: Phoenix College (2025 NJCAA DII National Champions — most decorated current JUCO in the guide), Pima CC, Mohave CC, Glendale CC (Region 1); Dodge City CC, Neosho County CC, Johnson County CC (Region 6); Southeastern CC, Iowa Lakes CC (Region 11); Blinn College, Coastal Bend College, Angelina College, LSU Eunice (Region 14); Nassau CC, Ulster County CC, Suffolk CC, Westchester CC (Region 15). All Tier-1 sourced (njcaa.org rankings, official athletics/admissions sites). `data/conf-prestige.json` and `data/pipeline.json`'s combined "Elite JUCO" / regional-competitiveness rows were both updated to include the new schools — these two files are easy to miss (§7 Phase 3B/3F) since neither is touched by most other change types.
  - Known gaps in this batch: social media (Instagram/Twitter/Facebook/YouTube) not verified for any of the 17 — all four fields set `null` rather than guessed, but the verification step itself (navigate to the account, confirm active) was skipped this session. Coach email/phone confirmed for only 1 of 17 (Johnson County CC's Jeff Cole) — the rest are `null` per the "never guess" rule.
  - jucoTier "Elite" classification for the new schools is based on being nationally ranked in the Oct 20, 2025 NJCAA DI/DII top-20 — a point-in-time snapshot; re-verify each season rather than assuming it's still current.
  - **Remediation pass (same session, after owner asked "did Claude follow the SDLC" then "is standings/roster research complete"):** two real gaps were found and closed. (1) `confRecord` had only been researched for 2025 on 13 of 17 schools — 2021-2024 were honestly-labeled `"Not re-verified this session"` placeholders rather than the 5-6 years of actual Tier-1 standings §7 Phase 1E requires. Re-researched all 4 missing years for every school via the conference standings archives (accac.org, kjccc.org, iccac.org, njcaaregion14.com, region15athletics.com) — all 17 now have real data for every year the program was a recognized conference member (some years are honestly "not a conference member yet," e.g. Mohave CC pre-2024, LSU Eunice pre-2024-25, never guessed). (2) The initial roster research had used `WebSearch`/`WebFetch` instead of the Claude for Chrome MCP tool §15's Research Intelligence table specifically mandates for "Roster scraping" and "Conference standings" — re-attempting the 4 "unavailable" rosters with the correct tool immediately fixed 2 of them (Southeastern CC: 17 MFs, Coastal Bend CC: 8 CMs — both had failed via WebFetch on a Sidearm/Cloudflare-protected page that a real browser renders fine) and confirmed the other 2 (Suffolk CC, Westchester CC) are genuinely missing position data even in a real browser, not a tooling artifact.
- **v37.1 — Fit Score simplified to Soccer Priority only:** GPA, Cost, and ACU Alignment removed from fitOlivier entirely (they have dedicated views: ATAR/budget toggles, Financial Model, ACU Alignment tab). fitOlivier = Soccer Program Quality 40% + Minutes Outlook 35% + Climate 15% + City 10% (see §5 weights table). The With Minutes / Base Fit score-mode toggle and the "Soccer-First" Lens were both retired as redundant. `recalculateAllScores()` runs once on page load (`initApp()`) — no ATAR-slider dependency anymore since GPA isn't in the formula.
- `recruit_pathway` / `recruit_pathway_note` schema added v34; populated only for the 4 v35 JUCO adds. Full 93-school pass deferred; this field carries no scoring weight and was never folded into fitOlivier (see CHANGELOG.md v34 notes) — now doubly moot since GPA-adjacent factors are out of the Fit Score entirely.
- All 93 full-profile schools have `kinRank` populated (v36.7 backfilled the 45 that were missing it).
- Compare tab's GPA row is live via `dynamicGpaStatus()` (v36.5) instead of a stored value — still relevant since GPA remains a first-class filter/toggle, just not a Fit Score input.
- **v37.3 — all data fetches use `{ cache: 'no-store' }`** (`fetchWithRetry()` in app.js, the olivier.json fetch in dashboard.js). Discovered live: after the v37.1 schema change, Chrome kept serving a cached pre-v37.1 `athletes/olivier.json` even after closing the browser and Ctrl+Shift+R, producing NaN fit scores (new JS + old JSON, missing the new `soccerQuality` weight key) — Edge was unaffected. A hard reload reliably busts cache for `<script>` tags but not for `fetch()`-initiated requests in every browser. **Any new data-fetching code must keep `cache: 'no-store'`** — don't remove it for a caching "optimization" without solving this class of bug another way first.
- **v37.9 — Dashboard "Top 8" panel is now strictly fitOlivier-ranked, no manual pinning.** The old `updateShortlist()` merged pinned `shortlist[]` entries first (★ TOP badge) then auto-filled remaining slots up to a cap of 8 by fitOlivier — but the pinned list had grown to 10 entries, already exceeding the cap, so the auto-fill-by-fit half never actually ran (JUCOs, or any non-pinned school regardless of score, could never appear). Owner chose to go fully dynamic rather than trim the pinned list. Removed with it: the per-card contact-status pill/dropdown (`saveSlStatus`/`getSlStatus`/`SL_STATUSES` — now dead code, deleted) — contact-status tracking lives in the separate Coaches Outreach tracker (`outreach[]`), unaffected. `shortlist[]` in olivier.json still exists and still drives the Dashboard map's "in shortlist" dot highlight — it just no longer pins cards in the Top 8 panel.
- **v37.4-v37.10 — JUCO tiering, region, housing, and pipeline pass (all informational, zero Fit Score impact):**
  - `jucoTier`: "Elite" | "Standard" + `jucoTierNote` on all 12 JUCO schools (v37.4, count corrected v38.9), verified via NJCAA.org's official 2025-26 All-America team list + each school's own titles[]/confRecord — badge shows only for "Elite" (**10 of 12** as of v38.9 — Northeast CC upgraded from Standard after its 2024 NJCAA DII National Championship was found missing from the data), silent otherwise (same pattern as `top`/Top Pick).
  - `njcaaRegion` + `njcaaRegionArea` on the 11 NJCAA-affiliated JUCOs (v37.5) — verified against NJCAA.org's official region list. **Santa Monica deliberately has no `njcaaRegion`** — it competes in CCCAA (California's own association), not NJCAA. A third-party regional-strength source consulted mid-session was wrong about Kansas (claimed "Region 11"; NJCAA's own page confirms Kansas is Region 6, Region 11 is Iowa+NE Nebraska only) — never trust a third-party regional grouping without checking njcaa.org directly.
  - `facilityDetails.housing = { available, note }` on all 12 JUCOs (v37.7) — silent-unless-flagged display (only warns when `false`/`"limited"`, same pattern as Elite JUCO). 2 confirmed no housing (Santa Monica, Miami Dade — both commuter colleges, verified via each college's own FAQ), 1 limited (Daytona State — 67 units, waitlisted).
  - Pro Pipeline tab (v37.10): all 12 JUCOs now represented in both the MLS SuperDraft table and the NCAA D2/NAIA/D3/JUCO table, replacing generic "transfer pathway" framing with real title/ranking credentials for the 8 Elite ones. See Change Type 7's JUCO/NJCAA rule above.
  - All three UI elements (Elite JUCO chip, region tag, housing chip) live in the same flexible metadata row on cards, not the compact stat grid — that grid compresses badly at mobile width, learned live via prototype iteration with the owner before landing on the final placement.
- **v38.1-v38.12 — Standings/Titles accuracy pass + housing research for all 81 non-JUCO schools (all informational, zero Fit Score impact):**
  - `facilityDetails.housing` now populated for **all 93 schools** (81 non-JUCO added v38.2-v38.12, closing the item deferred since v37.7) — Tier-1 verified via each school's official housing/residence-life page. Two genuine `"limited"` flags: **CSU Fullerton** and **Cal State LA** — both have real housing but no live-on requirement and no guarantee (first-come-first-served on explicitly commuter-heavy campuses), unlike every UC/most 4-year schools in this guide which guarantee at least first-year housing.
  - `confRecord[]`/`titles[]` corrected for 12 schools where a scan for the original v38.1 gap pattern (a generic label repeated identically across every year, indicating unresearched placeholder data rather than a real record) had been missed: 5 JUCOs (v38.1), Iowa Western + Northeast CC (v38.9), and Temple/Cal State LA/Charleston WV/Georgian Court/Columbia College MO (v38.10). Two of these were major finds requiring correction beyond the confRecord window: **Cal State LA** is the actual 2021 NCAA Division II National Champions (was "Mid CCAA" for all 5 years) and **Charleston (WV)** is the 2024 D2 national runner-up plus one of the most decorated D2 programs nationally — 6 title-game appearances since 2014 (was "Mid MEC" for all 5 years).
  - Keiser University's location fields all said "Fort Lauderdale," but the school's actual athletics campus (Seahawks, Vecellio Field) is in West Palm Beach — found while researching housing, flagged inline in the housing note rather than fixed inline; **corrected in v40.6** (12 text occurrences + mapX/mapY).

### v36 fix backlog — CLOSED (July 2026)

The full 174-issue baseline from the v35.1 code review (previously listed here) was cleared across v36.1–v36.8 — see CHANGELOG.md's v36 entry for the batch-by-batch detail. `node validate_consistency.js` now reports **1 issue**:

- **Stony Brook coach name** — conf JSON `TBD` vs coaches.json `Head Coach` placeholder. This is a genuine data gap, not a stale-file conflict (official site at stonybrookseawolves.com is unreachable, consistent with the existing "site down" deferred item below) — do not guess a name; re-attempt via Tier-1 research once the site is back.

Lower-priority (code quality, still deferred — none were in v36's named scope): `atarToGpa` defined in both scores.js and app.js (app.js wins by script load order — do not reorder the script tags); `DATA_BASE_URL` means `./data/` in app.js but site root in dashboard.js; olivier.json fetched twice per page load; `selectSchoolFromBar()` button-highlight matcher can never match (arrow-fn toString); dashboard `filterToConf('other')` scrolls to the Ivy section (5 Explore sections share `data-confkey="other"`, plus 5 duplicate `id="grid-other"` elements); search keyword echoed unescaped into the filter-summary HTML (self-XSS); stale Explore section intro texts in CONF_SECTIONS ("Stanford and Duke among 14 listed programs" etc. — everything is full-profile since v25); Glossary Minutes Score text says Yr1 45/Yr2 30/Yr3 15/Yr4 10 but code is Yr1 60/Yr2 40; FX slider sublabels say 1.30–1.80 but the range is 1.20–1.70. (The old `costScore()` falsy-zero-for-service-academies issue is now moot — cost was removed from fitOlivier entirely in v37.1.)

### Deferred items (carried forward)
- **devScores re-baseline — ALL 110 schools, phased. Step 0 COMPLETE (v42.0): the rubric is written, see §5a.** Remaining work below.

  **Diagnosis (settled v42.0, supersedes the earlier "cap the JUCOs" framing).** The stored devScores are incoherent because `devAvg` was being asked two incompatible questions at once: *(a)* how good is the daily training environment, and *(b)* does this program move a player up a level. Some schools were scored on (a), some on (b). That is why Indian Hills (JUCO) tied Syracuse at 78, why Phoenix College (NJCAA DII) out-rated Tyler JC (NJCAA DI, 6 titles), and why PBA/St. Edward's (D2) tied Princeton at 84. **The fix is not a cap — it is a split**, plus filling the hole that forced the conflation in the first place: `mlsPicks5yr` is 0 for every JUCO but Monroe, structurally zeroing 30% of their Soccer Program Quality, so past sessions expressed "Tyler JC develops players" the only way the schema allowed — by inflating `tactical`.

  **Three-part design, owner-approved v42.0:** (1) `devScores` = environment only, absolute, D1-anchored — §5a. (2) `nextLevelOutput` replaces `mlsPicks5yr` — §5b. (3) `fundingPathway` flat penalty — §5c.

  **Sequence — REORDERED v42.1 (owner-approved). `nextLevelOutput` now lands BEFORE the JUCO re-score**, so no school ever displays a score that is down only because the offsetting upside hasn't been built yet. A JUCO losing ~2 Fit points of dev inflation while its ~10 Fit points of real transfer output remain unbuilt would be a temporarily false ranking shown to a live user.
  - **Step 0 — DONE (v42.0, `a9d5a61`):** rubric committed to §5a/§5b/§5c. Doc-only; no score or code moved.
  - **Step 1 — DONE (v42.1, `d668a20`):** `devScoresNote` field + `DEV-RUBRIC` validator check, gated on note presence so the issue baseline held at 1. Also: dev sub-scores must be integers 0–100; placeholder notes (<20 chars) rejected.
  - **Step 2 — `nextLevelOutput` (§5b), ALL 40 non-D1 schools** (owner-approved v42.1 — scope corrected from 29 JUCOs after measuring that every D2/NAIA/D3 is zeroed too). Order within: (a) research a calibration sample via Chrome MCP, (b) derive the divisors from that sample, (c) `scores.js` + validator mirror, gated on field presence so it ships moving zero scores, (d) populate + cascade in batches. Expect ~40 alumni-page scrapes; likely 2 sessions.
  - **Step 3 — re-score the 29 JUCOs against §5a.** Now safe: dev drops and pipeline gains land together. (24 of 110 sit above their new ceiling; all 24 are non-D1.) Cascade `fitOlivier` → `lensScores.overall` → `lensScores.value` per §3a Type 13.
  - **Step 4 — implement `fundingPathway` (§5c)** — `scores.js` penalty + data field + Glossary + validator mirror. Includes correcting the known-wrong `aid` strings on Santa Monica, Phoenix, Pima, Glendale, Johnson County. 23 schools need Tier-1 aid research; the 87 `full` schools do not.
  - **Step 5+:** re-score the remaining 81 schools against §5a, **conference file by conference file** (the proven v38-housing batching pattern — one file per commit, validator green each time, full §3a Type 11 regression per batch).

  **Modelled impact of §5a's ceilings alone** (before any re-scoring): 24 schools above ceiling, 86 in-band, none below floor. Mean dev drop across the affected 24 is ≈4.9 points ⇒ ≈1.2 Fit points (dev = 60% of Soccer Quality = 24% of Fit). Worst: Chapman −10, Indian Hills −10, PBA/St. Edward's/Oklahoma City/Daytona State −8.

  **Still open:** `DIV_STRENGTH` NJCAA DI (0.6) vs DII split (e.g. 0.55 — effect <1 Fit point, cosmetic) — note §5a deliberately puts the DI/DII distinction *here* and in `nextLevelOutput`, not in the dev bands. Consider a soft dev-score sanity REPORT script (sorted cross-division table for eyeballing) — not a hard validator check, since dev scores are judgment values. Related, owner aware but undecided: Elite JUCO bar tightening (21 of 29 currently Elite; strict v37.4 criteria would demote ~7 — Glendale, Mohave, Johnson County, Coastal Bend, Dodge City, Blinn, Iowa Lakes).
- **Tyler JC's "#1 D1 Transfer Feeder Nationally — all-time record" claim is UNVERIFIED and may be program marketing (found v42.1).** It is stored in Tyler's `soccerLevel` string and repeated in `proPlayers.notable[]`. Tyler's own "Next Level" page lists **74** D1 alumni (2012–2023); Iowa Western's "Former Reivers" page lists **87** (2004–2026). Tyler leads on *rate* (6.2/yr vs 4.0/yr) but trails on raw count — so the unqualified "#1 all-time" claim is not supported by the two schools' own pages. Either qualify it ("highest D1 placement rate among JUCOs in this guide", if the Step-2 research bears that out) or remove it. Do not repeat a program's self-description as fact.

- **Notre Dame + Georgetown `rising_senior_2027_count` unresearched (found v40.1)** — both schools' v21-era minutesOutlook never captured rising-senior counts (and `cleared_names` is empty for both). Renderers guard with '—' and the modal summary says "An unconfirmed number of seniors" since v40.1, and the gap is whitelisted in `validate_consistency.js`'s `MO_MISSING_OK`. Re-scrape both rosters Sept–Nov 2026 (§15 off-season rule), then remove the whitelist entries.
- Stony Brook coach name AND minutesOutlook — site down / off-season; coach still placeholder, minutesOutlook still `available: false`
- Navy + Army — service academies, intentionally `available: false`
- UCI roomBoard ($19,500) and total COA, and OCU costNum, are estimates pending Tier-1 confirmation
- 6 Big East coach licence fields `null` — verify when contacting programs
- recruit_pathway full pass across all 93 schools (see CHANGELOG.md v34)
- Older-year (2021-2023) `confRecord` entries for Temple, Georgian Court, Columbia College (MO), and Charleston (WV) are marked "not re-verified v38" — 2024/2025 (and 2021 for Charleston) were Tier-1 confirmed during the v38.10 pass, but the middle years were left as retained-from-prior-session rather than guessed. Low priority — informational only.
- **NEOSHO COUNTY CC COACH CHANGE (found v40.8, HIGH PRIORITY)** — the guide stores Elliot Chadderton as head coach (v39 research), but goneosho.com's official staff directory now lists **Sam Hall, Head Men's Soccer Coach (shall@neosho.edu)**. This is a Change Type 2 requiring full treatment: research Sam Hall's background/record (§7 Phase 1F), replace the coaches.json entry + conf JSON coach{}, re-rank ALL coaches if overallScore changes. Deliberately NOT half-fixed during the v40.8 contact pass (writing a new name without a researched bio/score would corrupt the rankings). No contact was written for the departed Chadderton.
- **Social media + coach contact verification for the 17 v39.1-v39.4 JUCO adds — CLOSED (v40.7–v40.11, all 5 region batches).** All 17 schools' SOCIAL entries and coach contacts are now either Tier-1 verified or confirmed genuinely non-existent/unpublished. Coach contacts confirmed: Johnson County (v39), Phoenix, Pima, Glendale (v40.7), Dodge City (v40.8), Iowa Lakes (v40.9), Blinn, Coastal Bend, LSU Eunice (v40.10), Nassau, Ulster, Westchester (v40.11). Residuals: (1) remaining `null` SOCIAL slots mean "no such account found on the official site," not "unresearched." (2) Coach email/phone genuinely unpublished (names-only coaches pages, re-check periodically): Mohave CC, Southeastern CC, Angelina, Suffolk CC — all four head-coach names re-confirmed current in v40. (3) **Ulster's Instagram (`ulsterathletics`) is linked from its official site but the account is dead ("Profile isn't available") — left `null`; official-site links still need the Phase 1I navigation check.** (4) Neosho: see the coach-change item above — no contact written for the departed coach.
- **minutesOutlook unavailable for 2 of the 17 v39.1-v39.4 JUCO adds** — Suffolk CC and Westchester CC. Confirmed genuinely absent (not a tooling artifact): re-checked via Claude for Chrome MCP (real browser render, not WebFetch) and both sites publish class year but no position column for any player. (Southeastern CC and Coastal Bend CC were also on this list initially — WebFetch had failed on both, but Claude for Chrome MCP got full rosters with positions on the first real-browser attempt, confirming those two were a tooling mistake, not a genuine data gap. See [[feedback-sdlc-compliance]].)
- **Coastal Bend CC coaching transition** — the program's #14 national ranking (2025) was earned under interim coach Manuel Iwabuchi; Justin Rodriguez was hired as permanent Head Coach in March 2026. Program direction under the new coach is unverified.
- **Southeastern CC has an interim head coach (Henrique Vieira)** — same leadership-uncertainty caveat as Coastal Bend, flagged inline in the school's `coach.profile` but worth tracking for a future update once a permanent hire (if any) is announced.
- **CLAUDE.md §7 Phase 5's "score breakdown tooltip" checklist item describes a feature that does not exist anywhere in the current build** — checked both new (Phoenix College) and pre-existing (Barton CC) schools; the fit score display (`#modal-fit-score`, `#fit-[id]`) has no `onclick`/tooltip behavior on either the card or the modal. Either the feature was removed without updating the checklist, or it was never built. Needs a doc correction once confirmed which.
- **[ENHANCEMENT, not a bug — owner explicitly deferred, do not fix without being asked]** `soccerLevel` display-text format is inconsistent across 3 pre-existing JUCO schools (found while answering an owner question, not caused by this session) — Northeast CC, Monroe, and Indian Hills use `"JUCO — NJCAA Division X (detail)"`; the other 9 pre-existing JUCOs and all 17 added this session use `"NJCAA Division X — Conference/Region"`. Purely cosmetic (the field isn't read by scores.js). Tracked in the `ux_improvement_backlog.md` memory as item D1.

---

## 7. Universal Change Workflow

**This workflow applies to every change type without exception — new school, remove school, UX fix, data update, coach change, everything.**

The phases are universal. The checklist inside each phase is change-type specific — use the impact map (§3a) to identify which steps apply to your change.

---

### PHASE 0 — Change Assessment

Before any research or file editing, answer these questions:

- [ ] What type of change is this? (match to §3a — types 1–11)
- [ ] Which files will be touched? (list them)
- [ ] Which tabs need verification? (list them from the impact map)
- [ ] Does this involve a new conference? (scope expands — CONF_SECTIONS + conferences.json + conf-prestige.json all need entries)
- [ ] Does this affect fitOlivier or lensScores? (cascade required)
- [ ] What is the rollback plan? (`git revert HEAD` or restore from `Code\Archive\[version] Stable`)

---

### PHASE 1 — Research & Data Gathering

**Output: a scratch doc with every data point confirmed. Phase 3 is pure transcription — no research during data entry.**

Use §15 (Research Intelligence) to select the correct tool and source tier for every lookup.

#### For ADD SCHOOL — complete all sections 1A through 1J:

**1A — Strategic Gate (do first — before investing research time)**
- [ ] Confirm active men's soccer program exists — Claude for Chrome → official athletics site (Tier 1)
- [ ] Confirm school not already in guide — use this exact command (grep misses compound IDs like "tyler_jc"):
  ```bash
  python -c "import json; [print(s.get('id'), s.get('name')) for f in ['data/acc.json','data/big-ten.json','data/big-east.json','data/aac.json','data/big-west.json','data/caa.json','data/d1-other.json','data/juco.json','data/ivy.json','data/d2.json'] for s in json.load(open(f))]" | grep -i "SCHOOL_NAME"
  ```
  Replace SCHOOL_NAME with the short name (e.g. "tyler", "daytona"). If a match is found, this is a DATA UPDATE session, not an Add School session — stop here and re-identify the change type.
- [ ] Rough fit: division, approx cost, climate, city — if clearly out of range on 3+ factors, decide listed vs. full vs. defer

**1B — Identity & Structure**
- [ ] Full official name (for `full`)
- [ ] Short display name (for `name` — shown on card)
- [ ] City, State (for `loc`)
- [ ] Region: east / west / south / midwest
- [ ] Division: D1 / IVY / D2 / NAIA / D3 / JUCO
- [ ] Actual conference name
- [ ] `confKey` — open app.js, check CONF_SECTIONS. Does an entry exist for this div + conference? If not, flag as additional scope.
- [ ] Athletics URL (men's soccer page) — for `url`
- [ ] University homepage URL — for `SITE_URLS`
- [ ] Athletics domain (for favicon) — use the domain of the ATHLETICS SITE, not the main university domain. JUCOs often have a separate athletics site (e.g. apacheathletics.com for TJC, not tjc.edu). Verify by loading the favicon: `https://[domain]/favicon.ico`
- [ ] `mapX` / `mapY` — **do not use the lat/lon linear formula below to finalize these; verify against the actual map instead.** The formula is a rough starting guess only: `js/dashboard.js`'s `drawMapBase()` renders the Dashboard map as a hand-drawn, heavily simplified SVG polygon (not a real geographic projection), so a mathematically-correct lat/lon conversion routinely lands schools in the "ocean" — confirmed live in the v39.5 session for 6 of 17 new schools (all Gulf Coast TX/LA and outer Long Island NY) plus one pre-existing school (Arizona Western) that had never been caught. **Correct method:** load the Dashboard tab in a browser preview, get `document.getElementById('dash-map-svg').querySelectorAll('path')`, and test candidate coordinates with `path.isPointInFill(new DOMPoint(x,y))` — iterate until true, keeping the point directionally sensible relative to known-good nearby schools (same state/region). Never just check `0 ≤ x ≤ 640 && 0 ≤ y ≤ 390` — that only confirms the point is within the SVG viewBox, not on the drawn landmass. Rough formula for an initial guess only: mapX = (lon+124.5)/(124.5-67)×640, mapY = (49.5-lat)/(49.5-25)×390.
- [ ] Undergraduate enrollment (for `size`)

**1C — Academic**
- [ ] Exact degree program name — Claude for Chrome → academic catalog (not marketing page)
- [ ] Course list for that degree
- [ ] Go through all 16 ACU units one by one — covered / not covered:
  `ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394, EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296, EXSC187, EXSC230, EXSC122, EXSC398`
- [ ] Count `covered:true` → this is `acuAlign`
- [ ] Pre-PT quality: Excellent / Very Strong / Good / Solid / Transfer Pathway
- [ ] GPA admission minimum — Claude for Chrome → official admissions page (Tier 1)
- [ ] GPA scholarship minimum
- [ ] `gpa.status`: eligible (≥2.8) / borderline (2.5–2.79) / below (<2.5) vs Olivier's 2.8

**1D — Cost**
- [ ] Annual tuition — Claude for Chrome → official cost-of-attendance page (Tier 1 only)
- [ ] Annual room & board
- [ ] Annual fees
- [ ] Total COA = tuition + room/board + fees → this is `costNum`
- [ ] Max athletic scholarship to internationals (as % of COA)
- [ ] Max academic/merit scholarship to internationals (dollar amount)
- [ ] Aid type: athletic / merit / both
- [ ] International aid narrative — realistic framing (25–50% athletic for D1), not marketing copy

**1E — Soccer Program**
- [ ] Soccer level description (free text for `soccerLevel`)
- [ ] confRecord: last 5–6 years standings — Claude for Chrome → official conference website (Tier 1). For NJCAA: navigate to njcaaregion[N].com/sports/msoc/[YEAR]/standings. Never use placeholder text like "NJCAA DI play" — actual position and record are required.
- [ ] Conference titles and notable finishes (for `titles[]`)
- [ ] MLS picks last 5 years — Claude for Chrome → official MLS SuperDraft records (Tier 1)
- [ ] Notable alumni and draft history
- [ ] Pro pipeline narrative

**1F — Coach (all from official athletics staff page — Tier 1 only, never guess)**
- [ ] Head coach name (confirmed on official staff page)
- [ ] Title
- [ ] Email (confirmed on official site) — if no email listed, set `null` and use assistant contact. Never guess (e.g. "coach@domain.com" format)
- [ ] Phone (confirmed on official site) — verify the number belongs to THIS coach, not an assistant. Staff directory tables often list assistant contact next to head coach name.
- [ ] Years as head coach at this school
- [ ] Career record
- [ ] Coaching licence — check official bio first, then LinkedIn (Tier 2 for licence only)
- [ ] Australian connection: Y / N
- [ ] MLS players developed
- [ ] Bio narrative (for `profile` in school JSON and `bio` in coaches.json)
- [ ] Strengths (3–4 bullet points for coaches.json)
- [ ] Assistant coaches / staff

**1G — Roster (for minutesOutlook)**
- [ ] Use Claude for Chrome MCP → official roster page (see §15 for layout patterns)
- [ ] Total midfielder count
- [ ] Graduating midfielders (seniors / grad students clearing before Olivier's `targetDeparture` in athletes/olivier.json — currently August 2027)
- [ ] Transfer portal departures (if known)
- [ ] Entry competition level: Low / Moderate / High
- [ ] Sufficient data to set `available:true`? If not, document why → `available:false`
- [ ] If `available:true`: draft Yr1–Yr4 trajectory using Opportunity Score table in §14
- [ ] **Recruiting pathway (informational, added v34 — no scoring cascade):** from the same roster pull, classify how current midfield spots were actually filled — count true freshmen (no prior college) vs. transfers (4-year or JUCO). Note whether any true-freshman internationals who made the roster shared a pro-academy/club pedigree. Set `recruit_pathway` enum + `recruit_pathway_note` (see §5). This is separate from academic `gpa`/`internationalNote` fields — a school can be academically accessible and still have very limited true-freshman playing-time entry.

**1H — Facilities & Culture**
- [ ] Stadium name and capacity — Claude for Chrome → official athletics site (Tier 1)
- [ ] Training fields (dedicated? shared? turf or grass?)
- [ ] Strength & conditioning facility
- [ ] Sports science / sports medicine resources
- [ ] Academic labs relevant to BESS / pre-PT
- [ ] Facility rating: Elite / Excellent / Very Good / Good / Solid
- [ ] **On-campus housing: available / limited / none — Claude for Chrome → official housing/residence-life page (Tier 1). REQUIRED — feeds the Fit Score housing penalty (v41.0: −6 none / −3 limited) and validate_consistency.js fails a full profile without it. "limited" = housing exists but unguaranteed (first-come-first-served / waitlisted).**
- [ ] Campus setting: urban / suburban / rural
- [ ] Warm climate? Y/N (Florida, California, Southwest, Texas, Southeast)
- [ ] City campus? Y/N (major city, walkable urban)
- [ ] Things to do, social scene, Olivier lifestyle match (★ to ★★★★★)

**1I — Social Media (verify on the actual account — never guess handles)**
- [ ] Claude for Chrome → navigate directly to the account, confirm it's active
- [ ] Instagram URL (or null)
- [ ] Twitter/X URL (or null)
- [ ] Facebook URL (or null)
- [ ] YouTube URL (or null)

**1J — Pre-Calculate All Scores (before opening any file)**
Using scores.js logic — read scores.js if unsure of the formula. **v37.1: fitOlivier no longer includes GPA, Cost, or ACU Alignment** — those are still required fields (gpa.status, acuAlign, fin.costNum) because their own tabs/toggles need them, they just don't feed the Fit Score calculation below.
- [ ] `devScores`: tactical, technical, fitness (each 0–100) — manually researched, not formula-derived
- [ ] `soccerQualityScore`: `(devAvg/100 × 0.6) + (min(1, mlsPicks5yr/10) × 0.3) + (divStrength × 0.1)` — devAvg is the mean of the 3 devScores; divStrength from `DIV_STRENGTH` in scores.js: D1=1.0, IVY=0.9, D2=0.8, NAIA=0.65, D3=0.5, JUCO=0.6 (note: different from the retired `soccerLevelMap`, which had JUCO=0.75 — don't mix them up)
- [ ] `minutesScore`: 0.5 if available:false; else `(Yr1%×0.6) + (Yr2%×0.4)`
- [ ] `cityScore`: city=true → 1.0, false → 0.3
- [ ] `climateScore`: warm=true → 1.0, false → 0.2
- [ ] **`fitOlivier`** = `soccerQualityScore×40 + minutesScore×35 + climateScore×15 + cityScore×10`, rounded to integer, **then minus the housing penalty (v41.0): −6 if housing.available===false, −3 if "limited"**. Same formula for JUCO and non-JUCO.
- [ ] `lensScores` — calculate each using these formulas:
  - `soccer`:    same as `soccerQualityScore` above × 100 (kept as data even though the standalone "Soccer-First" Lens UI was retired in v37.1)
  - `academic`:  (acuAlign/16 × 0.85) + 0.15 → ×100
  - `minutes`:   minutesScore × 100 (same minutesScore used in fitOlivier)
  - `lifestyle`: (warm × 50) + (city × 50)
  - `value`:     (fitOlivier × 0.6) + (affordabilityScore × 0.4) → ×100 (affordabilityScore = 1 − costRatio, costRatio = costNum÷budgetUSD, capped at 1.0 — cost still factors into the Value lens, just not into fitOlivier itself)
  - `overall`:   same integer as fitOlivier

Still required (for their own tabs, not for fitOlivier): `gpa.status` (eligible/borderline/below, via `dynamicGpaStatus()` in app.js — GPA toggle/Compare tab), `acuAlign` + `acuUnits[]` (ACU Alignment tab), `fin.costNum` etc. (Financial Model tab, and the `value` lens above).

#### For REMOVE SCHOOL:
- [ ] Confirm the school's `id` exactly as it appears in the conf JSON
- [ ] Check `athletes/olivier.json` shortlist[] and outreach[] for this id
- [ ] Check `data/pipeline.json` for any entries referencing this school
- [ ] Note current coach rank so you know how many coaches need re-ranking after removal

#### For UX / JS CHANGE:
- [ ] Name the exact function(s) to be modified
- [ ] Read those functions in full — note all callers and all tabs they affect
- [ ] Determine test scope: full / targeted / smoke (see §3a Change Type 11)

#### For DATA UPDATE (coach, cost, minutes, etc.):
- [ ] Identify change type from §3a (types 2–9)
- [ ] List the cascade steps for that change type
- [ ] Gather the new data values at Tier 1 sources (see §15)

#### Scope discipline during research:
If you discover incorrect data about a school NOT being worked on this session, add it to the deferred items list in §6. Do not fix it in this session. Fixing unplanned data expands scope, creates untested changes, and risks breaking the session's commit integrity.

---

### PHASE 2 — Impact Map Sign-off

Before touching any file:

- [ ] State out loud which change type(s) from §3a apply
- [ ] List every file that will be modified
- [ ] List every tab that will be verified
- [ ] Confirm rollback plan

Do not proceed until this is written out explicitly.

---

### PHASE 3 — Make the Changes

**Read each file in full before editing it. No exceptions.**

#### For ADD SCHOOL:

**3A — Conference JSON**

File map: acc / big-ten / big-east / aac / big-west / caa / other

*Identity:*
- [ ] `id` — unique across ALL conf files; underscore not hyphen for multi-word
- [ ] `name`, `full`, `loc`, `region`, `div`, `conf`, `confKey`
- [ ] `warm`, `city`, `top` booleans verified against actual location
- [ ] `color[]` — [light bg, dark accent] matching school colours
- [ ] `tags[]` — warm / city / soccer / acad as applicable
- [ ] `url` — men's soccer athletics page
- [ ] `domain` — athletics subdomain for favicon
- [ ] `mapX`, `mapY` — from Phase 1 calculation
- [ ] `profileDepth` — "full" or "listed"
- [ ] `juco2yr: true` if JUCO — and if JUCO, also research `jucoTier` ("Elite"/"Standard") + `jucoTierNote`, `njcaaRegion` + `njcaaRegionArea` (skip if not NJCAA-affiliated, e.g. CCCAA schools), and `facilityDetails.housing` (see §5 field gotchas for all three — added v37.4/v37.5/v37.7)

*Academic & Cost:*
- [ ] `degreeTitle`, `soccerLevel`, `size`, `prePT`
- [ ] `acuAlign` integer — verified count of covered:true
- [ ] `acuAlignNote` — names the actual degree, references specific courses; not generic
- [ ] `acuUnits[]` — exactly 16 entries in order; covered:true count equals acuAlign
- [ ] `gpa{}` — minEntry, minSchol, note, status
- [ ] `cost` display string, `aid` display string
- [ ] `fin{}` — costNum, tuition, roomBoard, fees, maxAthletic, maxAcademic, aidType, internationalNote

*Soccer Program:*
- [ ] `confRecord[]` — 5–6 years, pos short enough for a chip
- [ ] `titles[]`
- [ ] `proPlayers{}` — mlsPicks5yr, notable[], draftRank
- [ ] If mlsPicks5yr > 0 or titles exist → pipeline.json needs updating (3F below)

*Coach (in school object):*
- [ ] `coach{}` — name, title, email, phone, profile all populated (not placeholder)

*Scores — transcribe from Phase 1 worksheet:*
- [ ] `devScores{}` — exactly 3 keys: tactical, technical, fitness; `null` if listed
- [ ] `fitOlivier` — from Phase 1 calculation
- [ ] `lensScores{}` — exactly 6 keys: overall, soccer, academic, minutes, lifestyle, value (full only)
- [ ] `minutesOutlook{}` — available:true with trajectory, or available:false; never omit
- [ ] If available:true → confirm lensScores.minutes and fitOlivier reflect the trajectory data

*All profiles:*
- [ ] `facilities[]` — 3-item brief array for card display (e.g. "Stadium name — 3,000 capacity", "Dedicated training pitch", "Pre-PT lab access"). Required for both listed and full-profile.

*Full-Profile Only:*
- [ ] `rec` — school-specific Overall Fit paragraph; not generic boilerplate
- [ ] `facilityDetails{}` — rating + all 8 sub-fields (stadium, trainingFields, strengthConditioning, sportsScience, sportsMed, academicLabs, extras, note)
- [ ] `culture{}` — vibe, thingsToDo, socialScene, olivierMatch (★ rating + sentence), lifestyleTags
- [ ] `courses[]` — populate if available

- [ ] `python -m json.tool data/[conf].json` — must pass before continuing

**3B — pipeline.json (if applicable)**
- [ ] If school has NCAA titles → add to ncaaD1[] or ncaaD2[]
- [ ] If school has MLS picks → add to mlsDraft[]
- [ ] `python -m json.tool data/pipeline.json`

**3C — app.js**

Read app.js in full. Run `node --check js/app.js` immediately after editing — do not wait for Phase 4.

- [ ] `DOMAINS` — `schoolId: 'athletics-domain.com'` — athletics subdomain, not main university domain
- [ ] `SITE_URLS` — `schoolId: 'https://www.university.edu'` — university homepage
- [ ] `SOCIAL` — `schoolId: [instagram, twitter, facebook, youtube]` — 4 elements, null if unverified; never guess
- [ ] `CONF_SECTIONS` — confirm entry exists for this school's confKey + div
  - New conference → add entry with key, divFilter, label, tier, intro
  - D3 and JUCO: separate entries with divFilter:'D3' and divFilter:'JUCO'
- [ ] `node --check js/app.js` — run now

**3D — coaches.json**

Read coaches.json in full before editing.

- [ ] Add coach entry — all required fields (§5 schema)
- [ ] `schoolId` matches the school's `id` exactly
- [ ] `rankClass` — HYPHENS: rk-elite / rk-strong / rk-solid
- [ ] `licence` — confirmed level or null
- [ ] `ausConnection` bool set correctly
- [ ] `contact.email` and `contact.phone` match `coach{}` in conf JSON exactly
- [ ] `staff[]` present (can be empty array)
- [ ] NJCAA schools — use NJCAA-appropriate language in strengths
- [ ] Re-rank ALL coaches by overallScore descending — no gaps in sequential numbering
- [ ] `python -m json.tool data/coaches.json`

**3E — conferences.json**

Read conferences.json in full before editing.

- [ ] Conference card exists for this conference
- [ ] School added to `guideSchools[]` — use display name (e.g. "Mercyhurst"), NOT school JSON id
- [ ] School removed from `otherSchools[]` if previously listed
- [ ] `desc` updated — new school count and highlights; verify text is actually new
- [ ] `olivierNote` updated — update the literal school count number and add school callout
- [ ] `tier` exactly matches renderer bucket keys
- [ ] `python -m json.tool data/conferences.json`

**3F — conf-prestige.json**

Read conf-prestige.json in full before editing.

- [ ] Entry exists for this conference
- [ ] `div` and `divBadge` correct
- [ ] `programsInGuide` — comma-separated string updated to include new school name
- [ ] `relevance` — updated if new school is notable enough to call out
- [ ] `python -m json.tool data/conf-prestige.json`

---

#### For REMOVE SCHOOL:

- [ ] Read conf JSON → remove school object entirely
- [ ] `python -m json.tool data/[conf].json`
- [ ] Read coaches.json → remove coach entry → re-rank ALL remaining coaches
- [ ] `python -m json.tool data/coaches.json`
- [ ] Read app.js → remove from DOMAINS, SITE_URLS, SOCIAL → `node --check js/app.js`
- [ ] Read conferences.json → remove from guideSchools[] → update desc and olivierNote counts
- [ ] `python -m json.tool data/conferences.json`
- [ ] Read conf-prestige.json → remove from programsInGuide string → update relevance if needed
- [ ] `python -m json.tool data/conf-prestige.json`
- [ ] Read pipeline.json → remove any entries for this school (if applicable) → `python -m json.tool data/pipeline.json`
- [ ] Read athletes/olivier.json → remove from shortlist[] and outreach[] if present → `python -m json.tool athletes/olivier.json`

---

#### For UX / JS CHANGE:

- [ ] Read the target function(s) in full
- [ ] Make the change
- [ ] `node --check js/[file].js` immediately after every edit
- [ ] If touching scores.js: re-verify scoreWeights cascade and recalculateAllScores() writeback

---

### PHASE 4 — Validate All Files

Run in this exact order — all must pass before proceeding to Phase 5:

```bash
python validate_schools.py
```
Catches: duplicate school IDs, acuAlign vs covered:true mismatch, wrong lens/dev keys, ptPath remnants, rankClass underscores, duplicate coach ranks, schoolId mismatches, missing required fields, bad facilityDetails rating, empty trajectory when available:true.

```bash
node validate_consistency.js
```
Catches what validate_schools.py doesn't: stored fitOlivier vs live scores.js formula drift, conferences.json tier strings vs renderer buckets, coach name sync (conf JSON vs coaches.json), recruit_risk / gpa.status enum drift, missing kinRank / juco2yr, DOMAINS / SITE_URLS / SOCIAL coverage, fin component sums, confKey vs CONF_SECTIONS, shortlist/outreach orphans, map coords, and (since v40.2) exact minutesOutlook/trajectory key names (MO-KEYS — the "right shape, wrong key name" class behind the v39.7 `yr`/`year` and v40.1 `mf_total_2026` bugs, which render as literal 'undefined' and which no other check sees). **v36 backlog cleared July 2026: 174 → 1 issue** (see §6 and CHANGELOG.md's v36 entry). The 1 remaining line (Stony Brook coach name) is a genuine data gap, not a bug — the count must never increase from a session's changes.

```bash
python -m json.tool data/[conf].json
python -m json.tool data/coaches.json
python -m json.tool data/conferences.json
python -m json.tool data/conf-prestige.json
python -m json.tool data/pipeline.json     # only if edited
node --check js/app.js                     # only if edited
node --check js/scores.js                  # only if edited
node --check js/dashboard.js               # only if edited
```

**Do not proceed to Phase 5 if any validation fails.**

---

### PHASE 5 — Local Browser Test

**Mandatory before every commit. No exceptions. This is the test environment — not the live site.**

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` (or the serve port).

**Determine test scope from Phase 0:**

| Scope | When |
|---|---|
| **Full** — all tabs | Add School, Remove School, scores.js change, scoreWeights change |
| **Targeted** — affected tabs + smoke test others | Single tab UX change, data update to one school |
| **Smoke** — page loads, no console errors, spot check | Cosmetic text change, coach name only |

#### Full Test Checklist:

*New / changed school:*
- [ ] Card visible in correct conference section in Explore
- [ ] Details button opens modal — missing = wrong `confKey`
- [ ] All 9 modal tabs populate without errors (full only)
- [ ] Dev Score: 3 bars — Tactical, Technical, Fitness — no PT Pathway bar
- [ ] Fit score is non-zero and matches Phase 1 calculation
- [ ] Fit score does NOT change when the ATAR slider moves (v37.1: GPA isn't in the formula — this is intentional, not a bug)
- [ ] Fit score re-sorts correctly on the "Best Fit" sort pill
- [ ] Map dot on correct US state — Dashboard tab
- [ ] Coach in Rankings with correct badge colour (rk-solid = emerald)
- [ ] All coaches numbered sequentially — no duplicate ranks
- [ ] Conference card visible, school chip present, count matches updated desc/olivierNote
- [ ] Minutes Outlook tab — card present (even if available:false)
- [ ] ACU Alignment tab — row present (non-JUCO full-profile only)
- [ ] Financial Model — school in selector, appears in comparison bars
- [ ] Compare tab — school selectable
- [ ] Coaches → Profiles tab — bio, staff, contact render correctly
- [ ] Coaches → Outreach tab — contact details correct
- [ ] All 6 lens pills apply badges correctly to the new school
- [ ] Score breakdown tooltip — open modal, click score, verify factor weights and contributions are correct
- [ ] Sort position — school appears in reasonable rank position in Best Fit sort

*Regression — existing schools not touched:*
- [ ] Pick one existing school from the same conf file — open its modal, verify it still loads
- [ ] Total card count in Explore = expected number (previous ± 1)
- [ ] F12 console — zero red errors across all tabs

**Only after all applicable items pass: proceed to Phase 6.**

---

### PHASE 6 — Commit & Deploy

```bash
git diff                              # Final review — confirm only intended files changed
git add data/[conf].json              # Stage specific files by name — never git add .
git add data/coaches.json
git add data/conferences.json
git add data/conf-prestige.json
git add data/pipeline.json            # only if edited
git add js/app.js                     # only if edited
git add athletes/olivier.json         # only if shortlist/outreach/guideVersion changed
git commit -m "vXX.X — [description]"
git push
```

Commit message format: `vXX.X — [what changed] ([scope])`
Examples:
- `v27.1 — Add Tyler Junior College (JUCO, NJCAA DI)`
- `v27.2 — Remove Wichita State (no men's soccer program confirmed)`
- `v27.3 — Populate minutesOutlook for 8 Big Ten schools`

Wait ~30 seconds for GitHub Pages deploy before proceeding to Phase 7.

---

### PHASE 7 — Post-Deploy Verification

Hard reload the live site (Ctrl+Shift+R): `https://bustachat.github.io/olivier-guide`

Repeat the Phase 5 checklist on the live site. Additionally verify:

- [ ] Favicon loads in modal header (depends on domain being live)
- [ ] Social links open correct verified accounts
- [ ] "Visit Site" link opens correct university homepage
- [ ] No console errors that weren't present locally

**If any item fails:**
1. Check incognito tab first — may be cache
2. If confirmed bug: assess data error (fix → re-deploy) vs display issue
3. Rollback if needed:
```bash
git revert HEAD          # creates a new commit undoing the last
git push
```
Or restore from `Code\Archive\[version] Stable` if revert doesn't resolve.

---

### PHASE 8 — End of Session Protocol

**Mandatory at the end of every session regardless of change type. This is how the workflow stays accurate.**

- [ ] `git log --oneline -5` — confirm what was committed matches what was intended
- [ ] Update **CHANGELOG.md** — what completed, what is deferred, what was discovered (version history lives there, NOT in this file — moved out in v35.2 to cut per-session context cost)
- [ ] Update the §6 state snapshot / known-issues list in this file ONLY if the state actually changed (school count, backlog items fixed)
- [ ] Update deferred items list — remove resolved items, add newly discovered items
- [ ] Update §3a if a new failure mode or change pattern was discovered this session
- [ ] Update §7 if a workflow gap was found and fixed this session
- [ ] Update §15 (Research Intelligence) if a new site layout or source rule was discovered
- [ ] Update memory files — session learnings, new failure modes, feedback
- [ ] Bump `guideVersion` in `athletes/olivier.json` if a new version shipped this session
- [ ] Produce a one-paragraph handover note: what changed, which files, what's outstanding
- [ ] Commit all CLAUDE.md updates made this session:
```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "vXX — docs: end of session update ([summary of what changed])"
git push
```

**The workflow is a living document. Every session that discovers a gap and does not update and commit the document guarantees that gap will be repeated.**

---

## 8. CODE Rules

**DO:**
- Read the actual file before editing it — every time, no exceptions
- Validate JSON after every edit: `python -m json.tool [file].json`
- Run `python validate_schools.py` before every commit
- Check JS syntax before committing: `node --check js/[file].js`
- Run `node --check` immediately after every JS edit — not at the end
- Wrap new render functions in try/catch so a single failure cannot cascade
- Keep onclick handlers consistent — same function names across cards and dashboard
- After adding any coach: re-rank ALL coaches in coaches.json
- After removing any coach: re-rank ALL remaining coaches in coaches.json
- Keep `{ cache: 'no-store' }` on every `fetch()` call in `fetchWithRetry()` (app.js) and the dashboard.js olivier.json fetch — v37.3 fix for a live bug where Chrome served stale JSON after a schema change even through a hard reload (see §6)

**DON'T:**
- Reconstruct any file from memory or from this CLAUDE.md
- Guess element IDs — always read from the actual index.html
- Hardcode any school/coach/pathway/pipeline data in index.html
- Copy a school object template without replacing every field including id and name
- Revert map dots to div overlays
- Re-add ResizeObserver / observeMapResize
- Re-add dash-map-tip floating tooltip
- Call a function during init before verifying it exists in the loaded JS files
- Create or reference data/olivier.json — it no longer exists
- Update the `cost` display string in school JSON — cost display is dynamic from `costNum` since v32. Update `costNum` (and `tuition`/`roomBoard`/`fees`) instead.
- Use `rankClass` with underscores — always hyphens: `rk-elite`, `rk-strong`, `rk-solid`
- Add `ptPath` to devScores — removed in v22
- Add `pt` to lensScores — removed in v22
- Make sort pills and lens pills reset each other — they are independent controls
- Fold GPA, Cost, or ACU Alignment back into fitOlivier — v37.1 deliberately removed them (they have dedicated views); if this is ever revisited, it needs explicit owner sign-off, not a quiet reintroduction
- Use aggregator sites (Niche, CollegeData, 247Sports, RosterResource) as data sources — see §15

---

## 9. Hooks and Automation (.claude/ folder)

### .claude/settings.json — permission gates
```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(rm -rf*)"
    ],
    "ask": [
      "Bash(git push*)",
      "Bash(git commit*)"
    ]
  }
}
```

### Skills available
- `.claude/skills/new-school/SKILL.md` — new school addition checklist
- `.claude/skills/qa-suite/SKILL.md` — full QA before commit
- `.claude/skills/add-coach/SKILL.md` — coach add/update (keeps JSON in sync)

---

## 10. COMMIT Protocol

The commit protocol is defined in §7 Phases 4–6 and Phase 8. Follow those phases in order — they supersede this section.

**Quick reference — pre-commit gates (all required):**
1. Phase 0 sign-off written out — change type, files, tabs, rollback plan
2. `python validate_schools.py` — pass
3. `python -m json.tool` on every modified JSON
4. `node --check` on every modified JS
5. Phase 5 local browser test — pass at appropriate scope
6. `git diff` — only intended files staged

**After the final commit of each version, also:**
- Bump `guideVersion` in `athletes/olivier.json`
- Update the version table in `README.md`
- Run Phase 8 (End of Session Protocol) in full — including committing CLAUDE.md

---

## 11. QA Suite

### Global checks — run after every commit
| Check | Pass condition |
|---|---|
| Hard reload (Ctrl+Shift+R) | Page loads. No blank screen. No JS error banner. |
| Console (F12) | Zero red errors. |
| All nav tabs respond | Each tab switches content without JS error |
| School cards render | Cards grid populates. Fit scores show. Degree badges show. |
| Filter chips work | Clicking a conference chip filters correctly |
| ATAR slider | GPA-eligibility toggle/filter updates live; Fit Score does NOT change (v37.1) |
| Sort pills | Best Fit / Lowest Cost / ACU Align / MLS Pipeline all sort within sections |
| Lens pills | All 5 lenses apply badges (Best Overall, Academic-First, Minutes Outlook, Lifestyle-First, Value-First); Best Fit sort respects active lens |
| Lens + Sort combo | Lens badges visible while non-Fit sort is active |
| Modal opens with 9 tabs | Full-profile school: all 9 tabs populated |
| Dashboard map | All dots on landmass. Hover info panel populates. |
| Glossary tab | No PT Pathway entries visible |

### New school QA — run after adding any school
| Check | Pass condition |
|---|---|
| Card visible in Explore | School appears under correct conference section |
| confKey correct | Details button present on card |
| Division correct | Not appearing under wrong division section |
| Conference tab | Conference card visible with school in guideSchools |
| Coach Rankings | New coach visible with correct badge |
| Coach re-ranked | All coaches renumbered sequentially |
| Map dot | Dot on correct US state on Dashboard |
| Fit score | Score is non-zero and matches the Soccer Priority formula (does NOT change with ATAR slider — v37.1) |
| Dev Score (full) | Three bars render: Tactical, Technical, Fitness |
| lensScores (full) | 6 lens values — no 'pt' key |
| Modal tabs (full) | All 9 tabs populate |
| Minutes Outlook tab | Card present |
| ACU Alignment tab | Row present (non-JUCO only) |
| Financial Model | School in selector |

### Remove school QA — run after removing any school
| Check | Pass condition |
|---|---|
| Card gone from Explore | No ghost card, total count is N-1 |
| Map dot gone | Dashboard — dot removed |
| Conference tab | School chip removed, count updated |
| Coach Rankings | Coach removed, all remaining coaches renumbered |
| ACU Alignment | Row gone |
| Minutes Outlook | Card gone |
| Financial Model | School gone from selector |
| Console | Zero errors — no orphaned reference errors |

---

## 12. Key URLs

- Live site: https://bustachat.github.io/olivier-guide
- Repo: https://github.com/bustachat/olivier-guide
- AUD/USD rate: open.er-api.com (no key, fallback DEFAULT_FX = 1.40)

---

## 13. Athlete Context (do not lose this)

Olivier is a central midfielder (box-to-box 8/10), GPA 2.8 progressing, completing an ACU Bachelor of Exercise and Sports Science (BESS). Career goal: Doctor of Physical Therapy or Chiropractic. Lifestyle preference: warm climate, city campus (like Sydney). Agent: Platform Sports Management, Australia. Target departure: August 2027.

ACU BESS has 16 specified units. The four most likely to transfer as direct US credit via WES evaluation: BIOL125, ANAT100, EXSC225, EXSC322.

Fit Score is personal to Olivier. Do not generalise it. When a new athlete is onboarded, they get their own JSON config under athletes/ with their own score weights, pathways, and shortlist.

**PT/Chiro as career goal:** Remains in Olivier's profile and coach questions but has been REMOVED from the scoring system in v22. Dev Score now measures soccer development only (tactical/technical/fitness). ACU alignment handles the degree-pathway angle. PT Pathway is not a scoring factor.

---

## 14. College Rosters Folder

The repo contains `College Rosters/` — do not delete or move these files.

### Files
- `College Rosters/roster_report.md` — completed analysis for 19 schools
- `College Rosters/roster_analysis.py` — Python scraper for new schools
- `College Rosters/manual_rosters.json` — hand-entered data for JS-rendered roster pages

For all new roster research, use the Claude for Chrome MCP method documented in §15. Use `roster_analysis.py` for bulk scraping only.

### Opportunity Score → minutesOutlook translation guide
| Opportunity Score | Yr1 pct | Yr2 pct | Yr3 pct | Yr4 pct |
|---|---|---|---|---|
| 12+ | 40–50% | 60–70% | 80% | 90% |
| 8–11 | 25–35% | 45–55% | 70% | 85% |
| 5–7 | 15–25% | 30–40% | 55–65% | 80% |
| 1–4 | 10–15% | 20–30% | 45–55% | 75% |
| 0 or negative | 5–10% | 15% | 35% | 65% |

Labels by Yr pct range: 80%+ = "Captain candidate" | 65–79% = "Established starter" | 50–64% = "Likely starter" | 35–49% = "Squad rotation" | 20–34% = "Bench / development" | <20% = "Development year"

Always set `available: true` when populating and include all 4 trajectory year objects.

**JUCO adjustment (v26):** Apply a 1.2 multiplier to the raw Opportunity Score before looking up the table. Olivier is above average in the JUCO player pool (A-League U18 academy vs high school recruits). Example: raw score of 8 → adjusted score 9.6 → use the 8–11 row. Cap at 12+ if adjusted score exceeds 12. Minutes Outlook ranking for JUCOs uses Yr1+Yr2 only — Yr3/Yr4 are shown for display but not used in scoring.

---

## 15. Research Intelligence

**Every research task has a required tool and source tier. Using the wrong source produces stale or inaccurate data that ships to the live guide.**

---

### Tool Hierarchy

| Task | Primary Tool | Why | Never Use |
|---|---|---|---|
| Roster scraping | Claude for Chrome MCP (`navigate` → `javascript_tool`) | Renders JS-heavy Sidearm sites; reads live data directly | Web search, RosterResource, any aggregator |
| Coach name / email / phone | Claude for Chrome → official athletics staff page | Source of truth; aggregators lag 1–2 seasons | ESPN, 247Sports, team aggregator sites |
| Coaching licence | Claude for Chrome → official bio, then LinkedIn if not found | Official pages vary; LinkedIn often more current | Any other source |
| Tuition / cost data | Claude for Chrome → official school cost-of-attendance page | Only official COA is authoritative | CollegeData, Niche, Peterson's — always 1 year stale |
| Degree / course list | Claude for Chrome → official academic catalog | Marketing pages show highlights; catalog shows full list | School marketing homepage alone |
| GPA requirements | Claude for Chrome → official admissions page | Requirements change year to year | Aggregators |
| Conference standings | Claude for Chrome → official conference website | Source of truth for exact finish positions | Wikipedia, ESPN |
| MLS picks | Claude for Chrome → official MLS SuperDraft results | Authoritative | Any aggregator — often incomplete for recent years |
| Social media handles | Claude for Chrome → navigate to the account directly; confirm it's active | Verify account is real and active | Guessing from school name pattern |
| Map coordinates (lat/long) | WebSearch acceptable | Coordinates don't change | — |

---

### Source Quality Tiers

**Tier 1 — Always use. These are the only authoritative sources.**
- Official school athletics page
- Official academic catalog
- Official conference website
- Official MLS/NCAA records
- Official school admissions page
- Official school cost-of-attendance page

**Tier 2 — Use only to find a Tier 1 URL, then verify at the source.**
- Google search results
- Wikipedia
- ESPN
- LinkedIn (for coaching licences only)

**Tier 3 — Never use as a data source. Always 6–18 months stale.**
- Niche, CollegeData, Peterson's
- RosterResource, 247Sports, Rivals
- Any roster aggregator or recruiting site
- Any site that is not the official school or official governing body

If a Tier 1 source is unavailable (DNS error, page not found), document why and mark the field as `null` or deferred — do not substitute a Tier 3 source.

---

### Roster Scraping — Claude for Chrome Method

**Standard workflow:**
```
navigate to official roster page
→ detect layout type (see patterns below)
→ extract with javascript_tool using layout-matched script
→ write extracted data to a Python update script
→ run the script
→ validate JSON
```

Never edit JSON directly from scraped data. Always write a script first, then run it.

If a page fails (DNS error, connection reset): try 2 alternate domains before marking as deferred.

**Known layout patterns (as of June 2026):**

| Layout | Sites | Extraction pattern |
|---|---|---|
| Sidearm Sports table | Most D1 schools | `table tbody tr` → cells[name_link, pos, yr]. Position values vary: "Midfielder", "MF", "M", "CM", "Midfield" |
| Sidearm card (UC Davis style) | UC Davis, similar | Position appears after `Hide/Show Additional Information For NAME` line; year 3 lines before position |
| Sidearm card (CSUF style) | CSUF, similar | Position BEFORE name — "M 6'0\" 165 lbs" then jersey, name, year+hometown |
| Hofstra hybrid | Hofstra | jersey, firstName, lastName, pos, "H'H\" Wlbs Yr. Major", hometown — all separate lines |
| Northeastern style | Northeastern | jersey, name, "Year Highschool Club", "Full Bio", "Hide/Show", "Position H Hometown" — position word = "Midfield", "Defense/Midfield" |
| UC Riverside variant | UC Riverside | Uses "CM" and "F/M" as position codes — expand pos regex to include CM, F/M, D/M |

**Position code normalisation:**
All of these map to midfielder: `M`, `MF`, `CM`, `F/M`, `D/M`, `Midfielder`, `Midfield`, `Central Midfielder`, `Defense/Midfield`

**New layout encountered?**
Document it in this table before finishing the session (Phase 8 End of Session Protocol).

---

### Research Accuracy Rules

- **Never guess** coach emails, phone numbers, or social media handles. If not found at Tier 1, set to `null` or `""` and mark as deferred.
- **Never use** a published cost figure without tracing it to the official COA page. Third-party figures are routinely 10–20% off.
- **Whenever touching a school for any reason** (coach update, confRecord, new data), verify `costNum` against the official COA page at the same time — zero extra session cost, catches stale estimates before they affect Olivier's ranking.
- **Always verify** coach name against the official staff page for the current season. Coaching changes happen in December–February; aggregators lag by months.
- **Always check** that a men's soccer program is active before researching any other data point. (Wichita State and Hawaii were fully researched and added before being removed in v26.)
- **For MLS picks**: the official MLS SuperDraft record is the only authoritative source. Many programs claim players who went undrafted or signed as free agents.

### Conflicting Tier 1 Sources

When two Tier 1 sources disagree, use this priority order by data type:

| Data type | Authoritative Tier 1 source when sources conflict |
|---|---|
| Coach name / contact | Official athletics staff page (more current than conference directory) |
| Roster / player positions | Official school roster page (more current than conference roster) |
| Conference standings | Official conference website (more current than school athletics page) |
| Cost / tuition | Official school financial aid / bursar page (more current than admissions page) |
| MLS draft picks | MLS official SuperDraft results page |

When conflict cannot be resolved with confidence, note the discrepancy, use the more conservative value, and mark as needing verification.

### Off-Season Roster Data Gaps

Rosters are often unpublished or showing prior-year data between May and August — after the season ends and before new recruits commit for the following year.

- **If the roster page shows a prior season's data**: note the data vintage explicitly. Set `minutesOutlook` to `{ "available": false }` and document: "Roster page showed [year] data as of [date scraped]. Defer until current-season roster is published."
- **Do not use prior-year roster data to populate minutesOutlook** — graduating seniors may already have left and new recruits not yet visible, making opportunity scores unreliable.
- **Best scraping window**: September–November, once teams have played several games and rosters are finalised.

---

*CLAUDE.md — Updated July 2026 (v35.1 full code-review pass). Version history: CHANGELOG.md.*
*Multi Skilled Contractors. Do not commit changes to this file without owner approval.*
