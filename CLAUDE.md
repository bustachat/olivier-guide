# CLAUDE.md — US College Soccer Athlete Recruitment Platform
# Standing orders for Claude Code. Read this file before touching anything else.

---

## 1. What This Is

A multi-file, multi-athlete web application hosted at **bustachat.github.io/olivier-guide**.

- Athlete: Olivier — Australian central midfielder, ACU BESS degree, targeting DPT/Chiropractic
- Owner: Multi Skilled Contractors (Platform Sports Management)
- Current stable version: **v23 Stable (completed June 2026)**
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

| Conference | File |
|---|---|
| ACC (Clemson, Virginia, UNC, Notre Dame, Maryland, Wake Forest, SMU, Georgetown) | `data/acc.json` |
| Big Ten (UCLA, Indiana, Maryland) | `data/big-ten.json` |
| Big East (St John's) | `data/big-east.json` |
| AAC (USF, FIU, FAU, Temple, East Carolina) | `data/aac.json` |
| Big West (UCSB, Hawaii) | `data/big-west.json` |
| CAA (Charleston) | `data/caa.json` |
| All D2, NAIA, JUCO, D3, NEC, CACC, AMC + everything else | `data/other.json` |

### Step 3 — Confirm the session goal
State in one sentence what this session will deliver and which session number it is.
Do not proceed until you have stated this explicitly.

---

## 3. PLAN PHASE — Before Writing Code

- Write out the exact files you will change and why.
- For JSON changes: validate schema against Section 5 before touching the file.
- For JS changes: identify the specific function(s) involved. Read them first.
- For new schools: run the full new-school checklist (Section 7).
- One change at a time. Complete and verify each change before starting the next.
- State any assumptions. If something is ambiguous, ask — do not guess.

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

### Deferred to v24
- 2025 roster scrape for remaining full-profile schools (Clemson, UNC, Maryland, GCU, Akron, Denver, Vermont, FAU, UCA, Iowa Western, UC Charleston)
- GCU coach verification — Grok flagged "Davies Dec 2025", may be stale data
- SMU shortlist review — fitOlivier 66, budget borderline at realistic package, may warrant removal
- Cal State LA lensScores.minutes verification (was populated in v21, may be correct)
- NSU DPT articulation detail (PSM to research)
- Multi-athlete platform expansion
- Australian connection as Fit Score variable
- Automated test suite (Playwright/Jest)

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

Before every commit:

1. Validate all modified JSON: `python -m json.tool [file].json`
2. Check all modified JS: `node --check js/[file].js`
3. Hard reload the live site (Ctrl+Shift+R) — zero red errors in console
4. Confirm all nav tabs respond without JS errors
5. Commit message format: `v22.x — [one-line description]`

After the final commit of each version:
- Bump `guideVersion` in `athletes/olivier.json`
- Update the version control table in `README.md`
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
