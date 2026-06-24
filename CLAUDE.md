# CLAUDE.md — US College Soccer Athlete Recruitment Platform
# Standing orders for Claude Code. Read this file before touching anything else.

---

## 1. What This Is

A multi-file, multi-athlete web application hosted at **bustachat.github.io/olivier-guide**.

- Athlete: Olivier — Australian central midfielder, ACU BESS degree, targeting DPT/Chiropractic
- Owner: Multi Skilled Contractors (Platform Sports Management)
- Current stable version: **v25 Stable (completed June 2026)**
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

| Conference | File | Schools (all full-profile as of v25) |
|---|---|---|
| ACC | `data/acc.json` | Virginia, Wake Forest, SMU, Clemson, Notre Dame, UNC, Duke, NC State, Louisville, Pitt, Stanford, Syracuse, Cal (13) |
| Big Ten | `data/big-ten.json` | UCLA, Indiana, Maryland, Penn State, Michigan, Michigan State, Ohio State, Northwestern, Wisconsin, Rutgers, Oregon, USC, Washington, Illinois (14) |
| Big East | `data/big-east.json` | St John's, Georgetown, Creighton, UConn, Providence, Villanova, Marquette, Butler, Seton Hall, DePaul, Xavier (11) |
| AAC | `data/aac.json` | FIU, USF, FAU, Tulsa, Memphis, Wichita State, Temple, East Carolina, UAB, Navy, Army, Charlotte, Rice (13) |
| Big West | `data/big-west.json` | UCSB, Cal Poly, UC Davis, UC Irvine, UC Riverside, UC San Diego, Long Beach State, Hawaii, CSU Fullerton (9) |
| CAA | `data/caa.json` | Charleston, William & Mary, Hofstra, Northeastern, Drexel, Delaware, Elon, Monmouth, Stony Brook (9) |
| All D2, NAIA, JUCO, D3, NEC, CACC, AMC + everything else | `data/other.json` | Vermont (AEC), Mercyhurst (NEC), Georgian Court (CACC), Columbia College MO (AMC), + all non-D1 schools |

### Step 3 — Confirm the session goal
State in one sentence what this session will deliver and which session number it is.
Do not proceed until you have stated this explicitly.

---

## 3. PLAN PHASE — Before Writing Code

**THIS IS NON-NEGOTIABLE. Every change, no exceptions:**

1. Identify the change type from Section 3a (Impact Map).
2. Read every row in that change type's impact map out loud — files AND tabs.
3. Write out the complete list of files and tabs this change touches.
4. Only then begin coding.

A change is NOT complete until every item in the impact map for that change type has been checked and actioned. This applies to data fixes, coach updates, new schools, cost changes — everything. Not checking the full impact map is the single largest source of errors in this project.

**Other plan rules:**
- For JSON changes: validate schema against Section 5 before touching the file.
- For JS changes: identify the specific function(s) involved. Read them first.
- For new schools: run the full new-school checklist (Section 7) IN ADDITION to the impact map.
- One change at a time. Complete and verify each change before starting the next.
- State any assumptions. If something is ambiguous, ask — do not guess.

---

## 3a. Change Impact Map — Mandatory Before Every Change

**For every change, find the matching type below. Every row is a required check — not a suggestion.**
If a row says "always required" it means check it even if you think it won't be affected.
The tabs column is what gets missed most often. Check every tab listed.

---

### CHANGE TYPE 1 — New School Added

| What to update | Why |
|---|---|
| `data/[conf].json` — full school object | All required fields, confKey, acuUnits[16], lensScores[6], minutesOutlook, fitOlivier |
| `data/coaches.json` — add coach entry | Full-profile school must have a coaches.json entry. Re-rank ALL coaches after adding. |
| `data/conferences.json` — guideSchools[] | School chip will not appear in Conferences tab without this |
| `data/conferences.json` — desc and olivierNote | Update the text to reflect the new school count and program highlights — easy to miss |
| `data/conferences.json` — otherSchools[] | Remove school from otherSchools[] if it was previously listed there |
| `data/conf-prestige.json` — conference entry | Conference prestige table will miss the school's conference if not updated |
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
- ACU Alignment — row present in table
- Conferences — school chip visible in guideSchools[], prestige table updated
- Coaches & Staff — coach card in Rankings, profile in Profiles tab, entry in Outreach tab
- Financial Model — school in selector, appears in comparison bars

---

### CHANGE TYPE 2 — Coach Name or Details Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — coach{} object | name, title, email, phone, profile — all fields |
| `data/coaches.json` — matching entry | Must stay in sync with conf JSON — this is the source for the Coaches tab |
| Re-rank ALL coaches if overallScore changed | Rank gaps break the Rankings display |

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

---

### CHANGE TYPE 4 — Cost / fin{} Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — fin.costNum, tuition, roomBoard, fees | Raw cost data |
| `data/[conf].json` — cost display string | Human-readable cost shown on card |
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
| `budgetAUD` or `fxRate` | costScore() recalculates for ALL schools → ALL fitOlivier change → all lensScores.overall must be manually recalculated and re-stored |
| `scoreWeights` | ALL fitOlivier recalculate → all lensScores.overall must be manually recalculated |
| `shortlist[]` | Dashboard shortlist panel, Coaches Outreach tracker, ★ Top Pick filter in Explore |
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

confRecord is display-only — no automatic score cascade. But a major trajectory change (e.g. program declined from 1st to last) warrants manually reviewing lensScores.soccer.

---

### CHANGE TYPE 7 — Pipeline / Titles Changed

| What to update | Why |
|---|---|
| `data/pipeline.json` — ncaaD1[], ncaaD2[], or mlsDraft[] | Powers the Pro Pipeline tab tables |
| `data/[conf].json` — proPlayers.mlsPicks5yr, titles[], proPlayers.draftRank | Powers school modal pipeline tab |
| `data/conf-prestige.json` — conference mlsPipeline field | Conference prestige table MLS column |
| `data/[conf].json` — lensScores.soccer | MLS picks factor into soccer lens — consider recalculating |

**Tabs to verify after changing:**
- Pro Pipeline — championship tables and MLS SuperDraft table updated
- Explore Schools → school modal → Pro Pipeline tab
- Conferences — conference prestige table MLS column

---

### CHANGE TYPE 8 — Listed Profile → Full Profile Upgrade

This is the most common batch operation (used throughout v25). It has the largest file footprint of any change type.

**Step order matters — do not skip steps or reorder:**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — add all full-profile fields | `profileDepth: "full"`, `color`, `devScores`, `facilityDetails{}`, `culture{}`, `staff[]`, `courses[]`, `acuUnits[16]`. Expand `fin{}` with tuition/roomBoard/fees/maxAthletic/maxAcademic/aidType. |
| 2 | `data/[conf].json` — validate JSON | `python -m json.tool data/[conf].json` — do not proceed if invalid |
| 3 | `data/coaches.json` — add coach entry | Use add\_[conf]\_coaches.py script. **Re-rank ALL coaches after every batch.** |
| 4 | `js/app.js` — DOMAINS, SITE_URLS, SOCIAL | Add entry for each upgraded school. Run `node --check js/app.js` after. |
| 5 | `data/conferences.json` — guideSchools[] | Move school from `otherSchools[]` into `guideSchools[]`. Clear `otherSchools[]` if all schools are now profiled. |
| 6 | `data/conferences.json` — desc and olivierNote | **Always update these.** Change the school count ("X guide schools"), add new highlights, remove stale statements. This is the most frequently missed step. |
| 7 | `minutesOutlook` — research and populate roster data | Minutes Outlook is 20% of fitOlivier. Use `College Rosters/roster_analysis.py` or manual research. Only set `{ "available": false }` if the roster page cannot be scraped — document why and request data to be provided. Do not leave the field absent. |
| 8 | Validate all modified files | `python -m json.tool` on every JSON, `node --check` on JS |
| 9 | Commit with version bump | `vNN.N — [Conference] batch: X listed schools upgraded to full profile` |

**acuUnits false patterns by acuAlign** — use these to set covered:false on the correct units:

| acuAlign (trues) | Units to set covered:false |
|---|---|
| 13 | EXSC394, EXSC187, EXSC398 |
| 12 | EXSC394, EXSC296, EXSC187, EXSC398 |
| 11 | EXSC394, EXSC204, EXSC296, EXSC187, EXSC398 |
| 10 | EXSC394, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 9 | EXSC394, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 8 | EXSC394, EXSC322, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |

All 16 units in order: `ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394, EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296, EXSC187, EXSC230, EXSC122, EXSC398`

**Service academy rule** (Army/Navy/USNA): costNum=0, all fin fields 0, maxAthletic=1.0, maxAcademic=0. Include explicit service commitment warning in every text field. Not compatible with DPT/Chiro or MLS goals.

**minutesOutlook for upgrades**: Research and populate at upgrade time — see Step 7 above. Only set `{ "available": false }` as a last resort if roster data cannot be obtained — document why and request data to be provided. Do not leave the field absent.

**Also update after EVERY conference batch — these are ALWAYS missed:**
- `data/conf-prestige.json` — `programsInGuide` string and `relevance` text for the conference row. This is a SEPARATE file from conferences.json and powers the Rankings table in the Conference tab. It is NOT updated automatically. Update it in the same commit as the batch.

**Tabs to verify after upgrading a batch:**
- Explore Schools — modal opens with all 9 tabs populated (Details button = confKey is correct)
- Coaches & Staff → Rankings — new coaches present with correct badge colour
- Conferences — conference card shows updated guideSchools count and desc/olivierNote
- Conferences → Rankings table — programsInGuide column shows new school count (reads from conf-prestige.json)
- Financial Model — upgraded schools now appear (filter is `profileDepth !== 'listed'`)
- ACU Alignment — rows present for all upgraded schools

---

### CHANGE TYPE 9 — Degree Program (degreeTitle) Updated

This change type exists because degreeTitle updates and ACU alignment reviews are not automatically linked — but they must be. Knowing the real degree program often reveals different course coverage than a generic template assumed. Skipping the ACU review after a degreeTitle update is the gap that created stale acuAlignNote text and wrong acuUnits counts.

**Rule: Any time degreeTitle is researched or changed, steps 2–4 below are mandatory — not optional.**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — degreeTitle | The degree name shown on the school card and modal |
| 2 | `data/[conf].json` — acuAlignNote | **Must be reviewed.** The note must reference the actual degree program by name, not a generic template. If the real degree has named courses matching ACU units, call them out explicitly. |
| 3 | `data/[conf].json` — acuUnits[] | **Verify coverage.** Does the real degree program cover the same units assumed? Research specific course offerings. If the school offers Anatomy, Physiology, or Exercise Physiology by confirmed course name, mark those units covered:true. |
| 4 | `data/[conf].json` — acuAlign | Count of covered:true must equal this integer. Recalculate if acuUnits changed. |

**If acuUnits or acuAlign changed, also cascade:**
- `lensScores.academic` — re-evaluate (acuAlign is a factor)
- `lensScores.overall` — recalculate if academic lens changed significantly
- `fitOlivier` — recalculate (acuAlignment = 10% of fit score) — **JUCO EXCEPTION: do NOT cascade acuAlign into fitOlivier for JUCO schools. ACU alignment is informational only for JUCOs — playing time and transfer pathway drive fitOlivier, not degree program alignment.**

**Tabs to verify after changing:**
- ACU Alignment tab — school row shows updated unit count and correct bars
- Explore Schools → school modal → Overview tab — acuAlignNote text is accurate and degree-specific
- Explore Schools — fitOlivier updated if acuAlign changed (non-JUCO only)

**Common failure mode:** Generic acuAlignNote text like "2-year degree. Transfer curriculum covers biology, anatomy basics." left in place after degreeTitle is updated to a specific program. The note must name the actual degree and reference specific courses available.

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
- `lensScores` — 6 pre-computed scores (full-profile only; pt lens removed in v22)

**CONF_SECTIONS in app.js controls which cards-grid section a school appears in.**
Each section has a `key` (matches school's `confKey`) and a `divFilter` (matches school's `div`).
D3 and JUCO schools both use `confKey: 'other'` but are split by `divFilter: 'D3'` vs `divFilter: 'JUCO'`.
A school with a wrong or missing `confKey` is invisible in Explore and has no Details button.

**conferences.json tier strings must match the renderer bucket keys exactly.**
Valid tier strings: `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"D3"`, `"JUCO"`.
A wrong tier string (e.g. `"D2"` instead of `"Division II"`) silently hides the conference card.

**Map coordinates use the v20 640×390 SVG coordinate system.**
mapX/mapY must be recalculated if coming from an older system. Verify on Dashboard after adding any school.

**DOMAINS, SITE_URLS, and SOCIAL in app.js must be updated whenever a new school is added.**

**Sort, Lens, and Score Mode are three independent, non-conflicting controls.**
- Score mode toggle (With Minutes / Base Fit) → recalculates fit scores, then re-applies current sort
- Sort pills → reorder cards; Best Fit sort is lens-aware (sorts by lensScores when a lens is active)
- Lens pills → apply visual badges/highlights only; do NOT reset sort; do NOT conflict with mode toggle
- These three systems must never override each other's state silently

---

## 5. Data Schema — Required Fields Reference

### School object (full-profile)
```
id, name, full, loc, region, div, conf, confKey, domain,
warm, city, top, color,
degreeTitle, acuAlign (int 1–16), acuUnits[] (16 objects),
acuAlignNote, soccerLevel, cost, aid, fin{},
size, prePT, coach{}, gpa{},
devScores{ tactical, technical, fitness },   ← 3 keys only — ptPath removed in v22
fitOlivier (0–100),
lensScores{ overall, soccer, academic, minutes, lifestyle, value },  ← 6 keys — pt removed v22
tags[], facilities[], courses[], rec, url,
mapX, mapY,
profileDepth: "full",
minutesOutlook{ available: true/false, … },
facilityDetails{ rating, stadium, trainingFields, strengthConditioning,
                 sportsScience, sportsMed, academicLabs, extras, note },
culture{ vibe, thingsToDo, socialScene, olivierMatch, lifestyleTags[] },
confRecord[{ yr, pos, note }],
titles[], proPlayers{}
```

For JUCO schools, also add: `"juco2yr": true`

### School object (listed-profile)
Same fields but `profileDepth: "listed"`.
`devScores` must be `null` — not zeros. Zeros render as "0%", null renders as "—" or hidden.
`minutesOutlook` must be `{ "available": false }`.

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

Verify: `count(covered:true) == acuAlign`. If they don't match, the ACU Alignment tab renders incorrect bars.

### coaches.json — required fields per coach entry
```
id, schoolId, name, school, div, conf,
rank, rankClass (rk-elite | rk-strong | rk-solid),   ← HYPHENS not underscores
yearsHC, record, mlsPlayers, overallScore, ptPathScore,
ausConnection (bool), bio, strengths[], staff[],
contact{ email, phone },
```
rankClass drives badge colour: `rk-elite` = gold, `rk-strong` = sky, `rk-solid` = emerald.
**After any coach addition, re-rank ALL coaches by overallScore descending. Rank must be sequential with no gaps.**
After any coach update, verify the school's `coach{}` object in its conference JSON also reflects the change.

### conferences.json — required fields per entry
```
id, name, abbr, tier, tierClass, prestige,
founded, teams, soccerTeams, ncaaTitles,
mlsPipeline, scholarships,
guideSchools[], otherSchools[],
desc, olivierNote, color[]
```
**tier field must exactly match renderer bucket keys:** `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"D3"`, `"JUCO"`

### conf-prestige.json — required fields per entry
```
rank, rankClass, name, fullName, div, divBadge,
programsInGuide, programsInGuideWarning (bool),
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
yearsStyle values: "chip-gold" | "chip-purple" | "hint"
rankClass values: "rank-medal medal-1" | "rank-medal medal-2" | "rank-medal medal-3" | null

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
shortlist[] — [{id, status}] objects (backward compat: plain strings = "Not contacted")
outreach[]  — [{schoolId, status, lastContact, note}]
scoreWeights{ soccerLevel, gpaEligibility, cost, acuAlignment,
              city, climate, minutesOutlook }   ← ptPath removed v22
scoreWeightsBase{ ... }                         ← same but minutesOutlook: 0
soccerLevelMap{ D1, IVY, D2, NAIA, D3, JUCO }
prePtMap{ Excellent, Very Strong, Good, Solid, Transfer Pathway }
guideTitle, guideSubtitle,
pathways{ paths[], coachQuestions[] }
```

### Fit Score weights (v22 — live)
| Factor | With Minutes | Base Fit |
|---|---|---|
| Soccer Level | 20% | 25% |
| GPA Eligibility | 20% | 25% |
| Cost | 20% | 25% |
| ACU Alignment | 10% | 15% |
| Minutes Outlook | 20% | 0% |
| City Campus | 5% | 5% |
| Climate | 5% | 5% |
| PT Path | 0% | 0% |

**ptPath weight is 0 in both modes.** The `(w.ptPath || 0)` guard in scores.js is required to prevent NaN.
Dev Score is now the average of 3 sub-scores only: tactical + technical + fitness (ptPath removed v22).

**Score mode toggle:**
- `scoreWeights` — minutes-adjusted (default, "With Minutes" button)
- `scoreWeightsBase` — base weights without minutesOutlook ("Base Fit" button)
Mode toggle calls `recalculateAllScores()` then `applySort(currentSort)`.
`recalculateAllScores()` writes back to `school.fitOlivier` AND `card.dataset.fitscore` — both required for sort to work after toggle.

**Lens/Sort/Mode independence:**
- `applySort('fit')` is lens-aware: when `currentLens !== 'overall'`, sorts by `lensScores[currentLens]`
- `applyLens()` updates badges/highlights then calls `applySort(currentSort)` — does NOT reset sort
- `setScoreMode()` calls `applySort(currentSort)` — does NOT call `applyLens()`
- All three controls are fully combinable: Soccer-First lens + Lowest Cost sort + Base Fit mode all work simultaneously

---

## 6. Version History

### v21 Stable — May 28 2026
All v21 work complete and live. See the V21_Upgrade_Plan.docx for full specification.
- v21.0: olivier.json consolidation (data/olivier.json deleted)
- v21.1: Minutes Outlook populated for 19 schools; Georgetown + Notre Dame upgraded to full profile
- v21.2: Fit Score rebalanced with Minutes Outlook 20%; dual score mode toggle; JUCO 0.75; GPA projection slider
- v21 UX: Shortlist status tags; Coach Outreach Tracker; Animated pill tabs on Coaches page

### v22 Stable — June 2026
Five new full-profile schools added: Mercyhurst (NEC/D1), Georgian Court (CACC/D2), Columbia College MO (D3), Northeast CC (JUCO), Monroe College (JUCO).

**Architecture changes in v22:**
- PT Pathway removed from scoring entirely: devScores now 3 keys (tactical/technical/fitness), lensScores now 6 keys (pt removed), LENSES array has 6 entries (PT Pathway removed), Fit Score ptPath weight = 0 in both modes
- CONF_SECTIONS split: `divFilter:'D3JUCO'` replaced with separate D3 and JUCO sections (both use `confKey:'other'`)
- Sort/Lens/Mode redesigned as independent axes: Best Fit sort is lens-aware; lens applies highlights only; mode toggle re-applies current sort
- Overall Fit description now uses `u.rec` (school-specific) instead of generic static text
- Glossary updated: all PT Pathway references removed

**Bugs fixed in v22 that inform the new-school checklist:**
- Missing `confKey` = school invisible in Explore + no Details button
- Wrong `divFilter` = school appears under wrong division section
- Wrong `tier` string in conferences.json = conference card invisible
- Invalid `rankClass` (underscores instead of hyphens) = coach badge broken
- `school.fitOlivier` not written back in recalculate = sort broken after mode toggle
- Sort + Lens fighting = applySort was overriding lens order silently

### v23 Stable — June 2026
Data verification pass, financial model correction, and coach data completion.

**Data fixes in v23:**
- CAA confRecord verified standings for 5 schools: William & Mary, Northeastern, Elon, Monmouth, Stony Brook (2020–2025)
- Big Ten confRecord corrected: MSU 2025 10th, MSU 2021 8th, Wisconsin 2021 6th, Illinois 2021 Independent
- Orphaned data/schools.json deleted (v15-era monolith, nothing loaded it)
- guideVersion bumped to v23 in athletes/olivier.json

**Minutes Outlook in v23:**
- minutesOutlook populated for Santa Monica College (JUCO) and Miami Dade College (JUCO)
- lensScores.minutes and lensScores.overall updated for both schools
- fitOlivier updated for SMC (79→80) and MDC (78→80)

**Coach data completion in v23:**
- 6 coaches added to coaches.json: Giuseppe DePalo (MDC), Lee Avery (SMC), Matt McArthur (Nova SE), Kylie Stannard (Yale), Dustin Johnson (Chapman), Michael Erush (Cal State LA)
- All 40 coaches re-ranked by overallScore descending
- Cal State LA full coaching staff documented (Michael Erush + 4 assistants)

**Financial model overhaul in v23:**
- Athletic scholarship slider corrected to 0–100% (full athletic ride = 100% of COA, not capped at 50%)
- Academic/institutional aid restructured as fixed dollar amount ($0–$30k), not a percentage
- Scenario buttons updated: Full Ride = 100% athletic, Typical Intl = 35% + $10k institutional
- Glossary: new "How Scholarships Work" section with equivalency explanation and D2 Florida stacking example
- Corrected misleading internationalNote text for SMU, Wake Forest, UCLA (removed "net cost ~$14k" based on inflated 85% athletic assumption)

**Tools added in v23:**
- export_schools.py — exports all 95 schools to CSV for external review (excludes Olivier-specific fields)

### v24 Stable — June 2026
internationalNote populated for all schools, new JUCO school added, coaching licence data introduced.

**Changes in v24:**
- internationalNote added to all 54 remaining schools across aac, acc, big-east, big-ten, big-west, caa (wakeforest/smu/ucla excluded — already corrected in v23.17)
- APP_VERSION now driven dynamically from `athleteConfig.guideVersion` in olivier.json — no longer hardcoded in app.js
- Indian Hills CC (Ottumwa, IA) added as full-profile JUCO school — 2025 NJCAA DI National Champions
  - fitOlivier: 70, lensScores populated, minutesOutlook: 13 MFs clearing before 2027
  - Two Australians on current roster: Daniel Monteiro (Brisbane) + Santo Aguek (Melbourne)
  - Coach: Zac Newton (appointed July 2024) — ranked 26th, USSF C licence
- coaching `licence` field added to all 41 coaches.json entries — 25 confirmed, 16 null
- Licence badge displayed on coach cards (indigo pill) and rankings table (new column)
- guideVersion bumped to v24 in athletes/olivier.json

**Deferred from v24 (carry to v25):**
- minutesOutlook still missing for: Clemson, UNC, Maryland, GCU, Akron, Denver, FAU, UCA, Iowa Western, UC Charleston, Mercyhurst, Georgian Court
- GCU coach verification (Davies Dec 2025 flag from Grok)
- Remaining 16 coaching licences unconfirmed (null)
- SMU shortlist decision (borderline budget reach — keep for now)
- NSU DPT articulation detail

### v25 Stable — June 2026
All 55 listed-profile schools upgraded to full-profile. FSU removed (no men's soccer program). 95 coaches in coaches.json.

**Commits:**
- v25.1–v25.2: ACC batch (Duke, NC State, Louisville, Pitt, Stanford, Syracuse, Cal) — 7 schools
- v25.3: Big East batch (Villanova, Marquette + prior 7) — 9 schools complete
- v25.4: Big West batch (Cal Poly, UC Davis, UC Irvine, UC Riverside, UC San Diego, Long Beach, Hawaii, CSUF) — 8 schools
- v25.5: AAC batch (Tulsa, Memphis, Wichita State, Temple, East Carolina, UAB, Navy, Army, Charlotte, Rice) — 10 schools
- v25.6: CAA batch (William & Mary, Hofstra, Northeastern, Drexel, Delaware, Elon, Monmouth, Stony Brook) — 8 schools
- v25.7: Vermont (America East) upgraded
- v25.8: FSU removed; Conference tab desc/olivierNote updated across all conferences

**Total guide schools as of v25: 95 coaches, all schools full-profile.**

**Deferred from v25 (carry to v26):**
- minutesOutlook still `available:false` for most v25 batch schools — roster scrape needed
- Placeholder coach names ("Head Coach") remain for 22 schools — real names to be researched
- GCU coach verification (Jamie Davies Dec 2025 flag)
- Remaining coaching licences unconfirmed (null)
- SMU shortlist decision (borderline budget reach)

---

### v26 Stable — June 2026
ACU Alignment tab overhaul. Minutes Outlook formula and JUCO calibration fixes. Wichita State and Hawaii removed (no men's soccer programs). Coach name research continued.

**Commits:**
- v26.1–v26.2: Replace placeholder coaches with real names (16 total across multiple conferences)
- v26.3: Remove Wichita State and Hawaii (no men's soccer programs confirmed)
- v26.4: UC Riverside — Tim Cupello coach update
- v26.5–v26.6: Conference tab fix (conf-prestige.json programsInGuide corrections)
- v26.7: ACU Alignment tab — fix stale summary cards (Texas A&M removed, Clemson corrected 5/16, GCU corrected 14/16, v25 batch schools added)
- v26.8: ACU Alignment tab — remove all UF references (no school object, not recruitable)
- v26.9: ACU Alignment tab — exclude JUCO schools from table (soccer development is the metric for 2yr programs)
- v26.10: Minutes Outlook — JUCO adjusted factor 1.0 → 1.2 (full roster reset, Olivier above average at JUCO level)
- v26.11: Minutes Outlook — rank on Yr1+Yr2 only, apples-to-apples JUCO vs 4yr (Yr3/Yr4 display unchanged)
- v26.12: JUCO minutesOutlook Yr1/Yr2 recalibrated — based on Macarthur Bulls A-League U18 (starter, 45–60 min/game) vs high school JUCO recruits. Cascade: lensScores.minutes, overall, fitOlivier updated for all 6 JUCO schools
- v26.13: CLAUDE.md — minutesOutlook roster research now mandatory Step 7 in Change Type 8

**Architecture decisions in v26:**
- JUCOs excluded from ACU Alignment tab — WES alignment not applicable for 2yr programs; soccer development is the primary metric
- Minutes Outlook ranking uses Yr1+Yr2 only — later year projections inflated D1 scores unfairly vs JUCOs with only 2 years of data
- JUCO adjusted factor set to 1.2 — Olivier (A-League U18 academy) is above average in the JUCO player pool vs high school recruits
- D1 transfer pipeline quality identified as the key JUCO metric: Indian Hills #2, Iowa Western #4, Monroe #3 nationally (Grok, June 2026)

**Deferred from v26 (carry to v27):**
- 53 schools with minutesOutlook `available:false` — populate or apply division baseline estimates
- Remaining "Head Coach" placeholder names unresolved
- GCU coach verification (Jamie Davies Dec 2025 flag)
- Remaining coaching licences unconfirmed (null)
- SMU shortlist decision (borderline budget reach)

**Planned for v27:**
- Add Tyler Junior College (Tyler, TX) — #1 JUCO D1 transfer feeder nationally
- Add Daytona State College (Daytona Beach, FL) — top-5 JUCO D1 feeder, warm/Florida lifestyle
- 53 schools minutesOutlook — populate from roster data or apply division baseline estimates with "estimated" flag
- minutesOutlook now mandatory at full profile upgrade time (see Change Type 8 Step 7)

---

## 7. New School Checklist

**Run every item in order before committing any new school. This checklist covers every file.**
Items marked (full only) are required for `profileDepth: "full"` schools.
Items marked (JUCO) are required for junior college schools.

### A — Research & Plan
- [ ] Determine `profileDepth`: "full" (9 modal tabs) or "listed" (card only)
- [ ] Determine correct `div`: D1, IVY, D2, NAIA, D3, JUCO
- [ ] Determine correct `conf` (actual conference name, e.g. "NEC", "CACC", "AMC")
- [ ] Determine correct `confKey` — must match an existing key in `CONF_SECTIONS` in app.js
  - D1 conferences have their own confKey (acc, big-ten, big-east, aac, etc.)
  - D2 and NAIA conferences: check if CONF_SECTIONS has a key for them, or use 'other'
  - D3 schools: `confKey: 'other'`, `div: 'D3'`
  - JUCO schools: `confKey: 'other'`, `div: 'JUCO'`
- [ ] Verify the CONF_SECTIONS entry for the target confKey has a matching `divFilter` for the school's div
- [ ] Calculate `mapX` / `mapY` for the v20 640×390 SVG coordinate system

### B — Conference JSON (data/acc.json, data/other.json, etc.)
- [ ] Add school object to the correct conference file
- [ ] All required fields present (Section 5 — full or listed schema)
- [ ] `id` is unique across ALL conference JSON files
- [ ] `confKey` matches CONF_SECTIONS key exactly
- [ ] `div` matches the CONF_SECTIONS `divFilter` for that key
- [ ] `acuUnits[]` has exactly 16 entries in the correct order
- [ ] `acuAlign` is an integer 1–16 matching the count of `covered: true` in acuUnits[]
- [ ] `devScores` has exactly 3 keys: `tactical`, `technical`, `fitness` (full only); `null` if listed
- [ ] `lensScores` has exactly 6 keys: `overall`, `soccer`, `academic`, `minutes`, `lifestyle`, `value` (full only)
- [ ] `minutesOutlook: { "available": false }` if roster data not yet collected
- [ ] `fitOlivier` pre-calculated and set (full only)
- [ ] `rec` field populated with school-specific Overall Fit description (full only)
- [ ] `facilityDetails.rating` is one of: "Elite" | "Excellent" | "Very Good" | "Good" | "Solid" (full only)
- [ ] `culture{}` fully populated (full only)
- [ ] `juco2yr: true` if JUCO 2-year school
- [ ] Validate JSON: `python -m json.tool data/[file].json`

### C — app.js (DOMAINS, SITE_URLS, SOCIAL, CONF_SECTIONS)
- [ ] Add school ID to `DOMAINS` object
- [ ] Add school ID to `SITE_URLS` object
- [ ] Add school ID to `SOCIAL` object (4-element array: instagram, twitter, facebook, youtube — null if unknown)
- [ ] Confirm `CONF_SECTIONS` has an entry covering this school's `confKey` + `div` combination
  - If adding a new conference, add a new CONF_SECTIONS entry with the correct key, divFilter, label, tier, intro
  - D3 and JUCO both use `confKey:'other'` but must have SEPARATE CONF_SECTIONS entries with `divFilter:'D3'` and `divFilter:'JUCO'`

### D — coaches.json
- [ ] Add coach entry with all required fields (Section 5)
- [ ] `rankClass` uses HYPHENS: `rk-elite`, `rk-strong`, `rk-solid` (NOT underscores)
- [ ] `schoolId` matches the school's `id` exactly
- [ ] Re-rank ALL coaches by `overallScore` descending — update every `rank` field sequentially
- [ ] NJCAA DII schools use appropriate strengths (not NCAA D1 language)
- [ ] School's `coach{}` object in conference JSON matches coaches.json (name, title, contact)

### E — conferences.json
- [ ] Conference card exists for the school's conference
- [ ] School added to `guideSchools[]` array
- [ ] School removed from `otherSchools[]` if it was previously listed there
- [ ] **`desc` text updated** — update school count and add new program highlights
- [ ] **`olivierNote` text updated** — update count ("X guide schools") and key school callouts
- [ ] `tier` field exactly matches renderer bucket keys (see Section 5)
- [ ] If adding a NEW conference card: add entry to `conf-prestige.json` also

### F — conf-prestige.json
- [ ] Entry exists for the school's conference
- [ ] `div` and `divBadge` correct

### G — Verification
- [ ] `python -m json.tool` passes on every modified JSON file
- [ ] `node --check js/app.js` passes
- [ ] Hard reload live site — no JS errors in console
- [ ] School card appears in the correct conference section in Explore
- [ ] Details button opens modal (means confKey is correct)
- [ ] All 9 modal tabs populate without errors (full profile only)
- [ ] Map dot appears on correct landmass on Dashboard
- [ ] Conference tab shows the conference card
- [ ] Coach Rankings tab shows the new coach with correct badge colour
- [ ] Fit score updates when ATAR slider moves
- [ ] Fit score updates when score mode toggle (With Minutes / Base Fit) is clicked
- [ ] Cards re-sort correctly when sort pills are clicked

---

## 8. CODE Rules

**DO:**
- Read the actual file before editing it — every time, no exceptions
- Validate JSON after every edit: `python -m json.tool [file].json`
- Check JS syntax before committing: `node --check js/[file].js`
- Wrap new render functions in try/catch so a single failure cannot cascade
- Keep onclick handlers consistent — same function names across cards and dashboard
- After adding a coach: re-rank ALL coaches in coaches.json

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
- Use `rankClass` with underscores — always hyphens: `rk-elite`, `rk-strong`, `rk-solid`
- Add `ptPath` to devScores — it was removed in v22
- Add `pt` to lensScores — it was removed in v22
- Make sort pills and lens pills reset each other — they are independent controls
- Call `applyLens()` from `setScoreMode()` — mode toggle calls `applySort()` only

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

Before every commit — ALL of these, in order:

1. **Impact map sign-off** — State out loud which change type(s) from Section 3a applied, and confirm every row in that map was checked and actioned. If any row was skipped, do not commit — go back and complete it.
2. Validate all modified JSON: `python -m json.tool [file].json`
3. Check all modified JS: `node --check js/[file].js`
4. Hard reload the live site (Ctrl+Shift+R) — zero red errors in console
5. Confirm all nav tabs listed in the impact map for this change type respond without errors
6. Commit message format: `v23.x — [one-line description]`

After the final commit of each version:
- Bump `guideVersion` in `athletes/olivier.json`
- Update the version control table in `README.md`
- Update CLAUDE.md Section 6 with the version summary and deferred items for next version
- Produce a handover note: what completed, what is outstanding, what files changed

---

## 11. QA Suite

### Global checks — run after every commit
| Check | Pass condition |
|---|---|
| Hard reload (Ctrl+Shift+R) | Page loads. No blank screen. No JS error banner. |
| Console (F12) | Zero red errors. Clearbit tracking-prevention warnings acceptable. |
| All nav tabs respond | Each tab switches content without JS error |
| School cards render | Cards grid populates. Fit scores show. Degree badges show. |
| Filter chips work | Clicking a conference chip filters correctly |
| Score mode toggle | With Minutes / Base Fit both update scores; cards re-sort |
| Sort pills | Best Fit / Lowest Cost / ACU Align / MLS Pipeline all sort within sections |
| Lens pills | All 6 lenses apply badges; Best Fit sort respects active lens |
| Lens + Sort combo | Lens badges visible while non-Fit sort is active |
| Mode + Lens combo | Mode toggle preserves lens badges, re-sorts by current sort |
| Modal opens with 9 tabs | Full-profile school: all 9 tabs populated |
| Dashboard map | All dots on landmass. Hover info panel populates. |
| Glossary tab | No PT Pathway entries visible |

### New school QA — run after adding any school
| Check | Pass condition |
|---|---|
| Card visible in Explore | School appears under correct conference section |
| confKey correct | Details button present on card (missing = wrong confKey) |
| Division correct | School not appearing under wrong division section |
| Conference tab | Conference card visible with school in guideSchools |
| Coach Rankings | New coach visible with correct badge (rk-solid = emerald) |
| Coach re-ranked | All coaches renumbered sequentially by overallScore |
| Map dot | Dot on correct US state on Dashboard |
| Fit score | Score is non-zero and updates with ATAR slider |
| Dev Score (full) | Three bars render: Tactical, Technical, Fitness — no PT Pathway bar |
| lensScores (full) | 6 lens values present — no 'pt' key |
| Modal tabs (full) | All 9 tabs populate — no "coming soon" panels |

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

**PT/Chiro as career goal:** This remains in Olivier's profile and coach questions but has been REMOVED from the scoring system in v22. Dev Score now measures soccer development only (tactical/technical/fitness). ACU alignment handles the degree-pathway angle. PT Pathway is not a scoring factor.

---

## 14. College Rosters Folder

The repo contains `College Rosters/` — do not delete or move these files.

### Files
- `College Rosters/roster_report.md` — completed analysis for 19 schools
- `College Rosters/roster_analysis.py` — Python scraper for new schools
- `College Rosters/manual_rosters.json` — hand-entered data for JS-rendered roster pages

### Opportunity Score → minutesOutlook translation guide
| Opportunity Score | Yr1 pct | Yr2 pct | Yr3 pct | Yr4 pct |
|---|---|---|---|---|
| 12+ | 40–50% | 60–70% | 80% | 90% |
| 8–11 | 25–35% | 45–55% | 70% | 85% |
| 5–7 | 15–25% | 30–40% | 55–65% | 80% |
| 1–4 | 10–15% | 20–30% | 45–55% | 75% |
| 0 or negative | 5–10% | 15% | 35% | 65% |

Always set `available: true` when populating and include all 4 trajectory year objects.

---

*CLAUDE.md — v23 Stable — Updated June 2026*
*Multi Skilled Contractors. Do not commit changes to this file without owner approval.*
