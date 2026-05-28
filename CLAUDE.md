# CLAUDE.md — US College Soccer Athlete Recruitment Platform
# Standing orders for Claude Code. Read this file before touching anything else.

---

## 1. What This Is

A multi-file, multi-athlete web application hosted at **bustachat.github.io/olivier-guide**.

- Athlete: Olivier — Australian central midfielder, ACU BESS degree, targeting DPT/Chiropractic
- Owner: Multi Skilled Contractors (Platform Sports Management)
- Current stable version: **v21 Stable (completed May 28 2026)**
- All v21 sessions complete — see Section 6 for what was delivered
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
cat athletes/olivier.json      # Single source of truth for athlete config (post-consolidation)
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
| All D2, NAIA, JUCO, WAC, MAC, WCC, America East, SEC + everything else | `data/other.json` |

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

**athletes/olivier.json is the single source of truth for all athlete config.**
This includes: scoreWeights, shortlist, outreach, budget, pathways, coachQuestions, soccerLevelMap, prePtMap.
After the pre-session consolidation (Section 6), data/olivier.json no longer exists.
app.js and dashboard.js both fetch from athletes/olivier.json only.
Do not re-create data/olivier.json under any circumstances.

**Every school object requires these fields — app crashes silently without them:**
- `acuUnits[]` — array of exactly 16 objects `{ "unit": "UNITCODE", "covered": true/false }`
- `confKey` — must match a key in `CONF_SECTIONS` in app.js
- `conf` — actual conference name (e.g. "SSC", "CCCAA") — drives confgroup filter
- `domain` — athletics domain for favicon
- `minutesOutlook` — set `{ "available": false }` if data not collected
- `facilityDetails.rating` — "Elite" | "Very Good" | "Good" | "Solid" (full-profile only)
- `lensScores` — 7 pre-computed scores (full-profile only)

**Map coordinates use the v20 640×390 SVG coordinate system.**
mapX/mapY must be recalculated if coming from an older system. Verify on Dashboard after adding any school.

**Map dots are SVG `<circle>` elements inside the SVG.**
Do not revert to div overlay approach. ResizeObserver has been removed — do not re-add it.
The dash-map-tip floating tooltip has been removed — do not re-add it. Right panel info replaces it.

**DOMAINS, SITE_URLS, and SOCIAL in app.js must be updated whenever a new school is added.**

**confgroup filter uses the actual conf field, lowercased and hyphenated.**
Do not revert to the old confKey "other" bucket approach.

---

## 5. Data Schema — Required Fields Reference

### School object (full-profile)
```
id, name, full, loc, region, div, conf, confKey, domain,
warm, city, top, color,
degreeTitle, acuAlign (int 1–16), acuUnits[] (16 objects),
acuAlignNote, soccerLevel, cost, aid, fin{},
size, prePT, coach{}, gpa{},
devScores{ tactical, technical, fitness, ptPath },
fitOlivier (0–100),
lensScores{ overall, soccer, academic, minutes, pt, lifestyle, value },
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
rank, rankClass (rk_elite | rk_strong | rk_solid),
yearsHC, record, mlsPlayers, overallScore, ptPathScore,
ausConnection (bool), bio, strengths[], staff[],
contact{ email, phone },
```
rankClass drives badge colour: rk_elite = gold, rk_strong = sky, rk_solid = emerald.
After any coach update, verify the school's `coach{}` object in its conference JSON also reflects the change.

### conferences.json — required fields per entry
```
id, name, abbr, tier, tierClass, prestige,
founded, teams, soccerTeams, ncaaTitles,
mlsPipeline, scholarships,
guideSchools[], otherSchools[],
desc, olivierNote, color[]
```

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

### athletes/olivier.json — complete schema (post-consolidation)
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
shortlist[] — post-Session 3: [{id, status}] objects
             backward compat: plain string IDs treated as "Not contacted"
outreach[]  — added Session 3: [{schoolId, status, lastContact, note}]
scoreWeights{ soccerLevel, gpaEligibility, cost, acuAlignment,
              city, ptPath, climate, minutesOutlook }
soccerLevelMap{ D1, IVY, D2, NAIA, D3, JUCO }
prePtMap{ Excellent, Very Strong, Good, Solid, Transfer Pathway }
guideTitle, guideSubtitle,
pathways{ paths[], coachQuestions[] }
```

### Fit Score weights (v21 — live)
| Factor | Weight |
|---|---|
| Soccer Level | 20% |
| GPA Eligibility | 20% |
| Cost | 20% |
| ACU Alignment | 10% |
| Minutes Outlook | 20% |
| City Campus | 5% |
| Climate | 5% |

**Score mode toggle (implemented v21.2):**
Two weight sets live in `athletes/olivier.json`:
- `scoreWeights` — minutes-adjusted (live default, used in cards and score mode "v21")
- `scoreWeightsBase` — original weights without minutesOutlook or ptPath (used in "base" mode toggle)
The toggle button in the ATAR panel switches between modes. `recalculateAllScores()` in scores.js reads whichever set is active.
`ptPath` weight is 0 in `scoreWeights` — the `(w.ptPath || 0)` guard in scores.js is required to prevent NaN.

---

## 6. v21 — What Was Delivered (All Complete)

All v21 work is committed and live at bustachat.github.io/olivier-guide as of May 28 2026.

### v21.0 — olivier.json Consolidation ✅
**Commit:** `1e8f588`
- Merged `data/olivier.json` and `athletes/olivier.json` into a single source of truth at `athletes/olivier.json`
- Updated `app.js loadData()` to fetch from `athletes/olivier.json`
- Deleted `data/olivier.json` — do not re-create it
- `dashboard.js` already fetched `athletes/olivier.json` — no change needed

### v21.1 — Data Completeness ✅
**Commit:** `71cbc67`
- Minutes Outlook populated for 19 schools from `College Rosters/roster_report.md`
- `devScores: null` enforced on all listed-profile schools (was incorrectly set to zeros)
- Georgetown and Notre Dame upgraded to full profile (all 9 modal tabs)
- Schools still needing minutesOutlook roster scrape: Clemson, UNC, Maryland, GCU, Texas A&M, Akron, Denver, Vermont, FAU, UCA, Iowa Western, UC Charleston

### v21.2 — Intelligence ✅
**Commit:** `1af4752`
- Fit Score rebalanced: Minutes Outlook added at 20%, City dropped to 5%, Climate stays at 5%
- Dual score mode toggle: `scoreWeights` (minutes-adjusted) and `scoreWeightsBase` (original) — toggle button in ATAR panel
- JUCO soccerLevelMap raised from 0.6 → 0.75
- GPA projection slider: +0.0 / +0.2 / +0.4 / +0.6 chips in ATAR panel
- Fixed NaN bug in scores.js: `ptPath: ptScore(...) * (w.ptPath || 0)` guard added
- Fixed missing `id="fit-{id}"` on card score elements so recalculate works on DOM

### v21 Stable — UX ✅
**Commit:** `7340c44`
- Shortlist status tags on Dashboard: Not contacted / Email sent / In conversation / Offer received / Eliminated
- Status persists via `localStorage` key `olivier_sl_status`; defaults from `athletes/olivier.json`
- Coach Outreach Tracker on Coaches page: per-school status, last contact date, notes
- Outreach persists via `localStorage` key `olivier_outreach`

### Coaches Animated Pill Tabs ✅
**Commit:** `f87c408`
- Coaches page restructured into 3 tabs: Rankings / Profiles / Outreach
- Animated sliding pill tab bar using CSS `transform + transition`
- Pill position computed via `btn.offsetLeft - 4` (avoids getBoundingClientRect border offset)
- `initCoachTabs()` called via `setTimeout(..., 0)` in `showPage()` to measure after layout

---

### Deferred — not in v21, carry to v22
- Roster scrape for remaining 14 schools (see v21.1 note above)
- 2025 roster refresh (separate data operation)
- NSU DPT articulation detail (PSM to research)
- Multi-athlete platform expansion (post-Olivier commercial roadmap)
- Australian connection as Fit Score variable (relationship-based, not algorithmic)
- Automated test suite (Playwright/Jest)

---

## 7. New School Checklist

Run every item before committing any new school.

- [ ] Identify correct conference JSON file from the map in Section 2
- [ ] Add school object with all required fields (Section 5 — full or listed schema)
- [ ] `acuUnits[]` has exactly 16 entries — one per unit code in the correct order
- [ ] `devScores` is `null` if `profileDepth: "listed"`
- [ ] `minutesOutlook: { "available": false }` if roster data not yet collected
- [ ] `facilityDetails.rating` populated if `profileDepth: "full"`
- [ ] `culture{}` populated if `profileDepth: "full"`
- [ ] Add school ID to `DOMAINS` in app.js
- [ ] Add school ID to `SITE_URLS` in app.js
- [ ] Add school ID to `SOCIAL` in app.js
- [ ] `confKey` matches an existing key in `CONF_SECTIONS` in app.js
- [ ] `mapX` / `mapY` calculated for the v20 640×390 coordinate system
- [ ] Validate JSON: `python -m json.tool data/[file].json`
- [ ] Verify map dot lands on correct landmass on Dashboard after deploy
- [ ] If school has a coach, add entry to `coaches.json` in addition to school's `coach{}` object

---

## 8. CODE Rules

**DO:**
- Read the actual file before editing it — every time, no exceptions
- Validate JSON after every edit: `python -m json.tool [file].json`
- Check JS syntax before committing: `node --check js/[file].js`
- Wrap new render functions in try/catch so a single failure cannot cascade
- Keep onclick handlers consistent — same function names across cards and dashboard

**DON'T:**
- Reconstruct any file from memory or from this CLAUDE.md
- Guess element IDs — always read from the actual index.html
- Hardcode any school/coach/pathway/pipeline data in index.html
- Copy a school object template without replacing every field including id and name
- Revert map dots to div overlays
- Re-add ResizeObserver / observeMapResize
- Re-add dash-map-tip floating tooltip
- Call a function during init before verifying it exists in the loaded JS files
- Create or reference data/olivier.json — it no longer exists after pre-session consolidation
- Create athletes/template.json — it does not exist and is not needed

---

## 9. Hooks and Automation (.claude/ folder)

The repo uses a `.claude/` folder for Claude Code automation.

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
`git push` and `git commit` always require explicit confirmation before executing.
`git push --force` and `rm -rf` are blocked entirely.

### .claude/hooks/pre-write-validate.sh
Runs before any file write. Validates JSON and JS syntax automatically.
If validation fails, the write is blocked and the error is shown before any file is touched.

### .claude/skills/new-school/SKILL.md
Invocable checklist for adding a new school. Call it instead of reading Section 7 manually.

### .claude/skills/qa-suite/SKILL.md
Invocable full QA checklist. Call it before every commit.

### .claude/skills/add-coach/SKILL.md
Invocable checklist for adding or updating a coach. Ensures both coaches.json and the school's coach{} object stay in sync.

---

## 10. COMMIT Protocol

Before every commit:

1. Run full QA suite for the current session (Section 11)
2. Validate all modified JSON: `python -m json.tool [file].json`
3. Check all modified JS: `node --check js/[file].js`
4. Hard reload the live site (Ctrl+Shift+R) — zero red errors in console
5. Confirm all nav tabs respond without JS errors
6. Commit message format: `v21.x Stable — [one-line description]`

After the final commit of each version:
- Bump `guideVersion` in `athletes/olivier.json`
- Update the version control table in `README.md`
- Update the version control table in the Blueprint document
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
| Sort pills work | Best Fit / Lowest Cost / ACU Align / MLS Pipeline all sort correctly |
| Modal opens with 9 tabs | Full-profile school: all 9 tabs populated — Overview, Degree, Standings, Pro, Development, Contact, Minutes, Culture, Facilities |
| Dashboard map | All dots on landmass. Hover info panel populates. Cross-highlight works. |

### Pre-session consolidation QA
| Check | Pass condition |
|---|---|
| Guide loads | Hard reload — no JS errors |
| Pathways tab renders | All 5 pathway cards visible, content populated from athletes/olivier.json |
| Dashboard ATAR slider works | Slider defaults to 70 ATAR / 2.8 GPA from athletes/olivier.json |
| Dashboard shortlist shows | Pinned schools visible on Dashboard shortlist panel |
| data/olivier.json absent | File does not exist in repo — confirmed via `git status` |
| Console | Zero red errors |

### Session 1 QA — Data Completeness
| Check | Pass condition |
|---|---|
| Minutes Outlook — new schools | All newly added schools show trajectory bars. No "No Roster Data" panel. |
| Minutes Outlook — existing 19 schools | All 19 original schools still render correctly. No regression. |
| Listed schools — devScores | No listed school shows "0%" in dev bars. Shows "—" or hidden. |
| Georgetown full profile | Modal has all 9 tabs populated. No "coming soon" panels. |
| Notre Dame full profile | Modal has all 9 tabs populated. No "coming soon" panels. |
| fitOlivier unchanged | All fit scores identical to v20. Session 1 is data only. |
| JSON validates | `python -m json.tool` passes on every modified file. |
| Console | Zero red errors. |

### Session 2 QA — Intelligence
| Check | Pass condition |
|---|---|
| Fit Score weights sum to 100 | `Object.values(athlete.scoreWeights).reduce((a,b)=>a+b,0) === 100` |
| Minutes Outlook factor applied | High-minutes school scores meaningfully higher than before |
| No penalty for missing data | School with `available:false` has neutral relative fit |
| JUCO scores improved | Santa Monica + Miami Dade fitOlivier increased ~3–5 points from v20 |
| GPA projection slider visible | ATAR panel shows "+0.0 / +0.2 / +0.4 / +0.6" toggles |
| GPA projection updates live | Cards re-colour in real time when bonus applied |
| Readout shows projected GPA | "2.8 → projected 3.2" format when bonus active |
| fitOlivier comparison table | v20 vs v21 table produced and reviewed before commit |

### Session 3 QA — UX
| Check | Pass condition |
|---|---|
| Shortlist status badge visible | Dashboard shortlist cards show coloured status pill |
| Status persists on reload | Change status, reload — status retained |
| Outreach tracker visible | Coach Contacts tab shows status pill + last contact date |
| Filter by status works | "Active" filter shows only Email sent + Call scheduled |
| Backward compatible | Old string-format shortlist entries load without crash |
| Console | Zero red errors |

---

## 12. Key URLs

- Live site: https://bustachat.github.io/olivier-guide
- Repo: https://github.com/bustachat/olivier-guide
- AUD/USD rate: open.er-api.com (no key, fallback DEFAULT_FX = 1.40)

---

## 13. Athlete Context (do not lose this)

Olivier is a central midfielder (box-to-box 8/10), GPA 2.8 progressing, completing an ACU Bachelor of Exercise and Sports Science (BESS). Career goal: Doctor of Physical Therapy or Chiropractic. Lifestyle preference: warm climate, city campus (like Sydney). Agent: Platform Sports Management, Australia. Target departure: August 2027.

ACU BESS has 16 specified units. The four most likely to transfer as direct US credit via WES evaluation: BIOL125, ANAT100, EXSC225, EXSC322. Platform Sports Management should coordinate a formal WES evaluation before finalising the shortlist.

Fit Score is personal to Olivier. Do not generalise it. When a new athlete is onboarded, they get their own JSON config under athletes/ with their own score weights, pathways, and shortlist.

---

## 14. College Rosters Folder

The repo contains `College Rosters/` — do not delete or move these files. They are the source data for minutesOutlook fields across all schools.

### Files
- `College Rosters/roster_report.md` — completed analysis for 19 schools. Use this directly for Session 1 minutesOutlook population. Contains per-school midfielder counts, graduating players, returning competition, and opportunity scores.
- `College Rosters/roster_analysis.py` — Python scraper. Run this to add new schools. Add missing schools to the SCHOOLS list at the top of the script and run: `python "College Rosters/roster_analysis.py"`
- `College Rosters/manual_rosters.json` — hand-entered player data for schools whose roster pages are JavaScript-rendered and cannot be auto-scraped. Add entries here if a school fails auto-fetch.

### Opportunity Score → minutesOutlook translation guide
| Opportunity Score | Yr1 pct | Yr2 pct | Yr3 pct | Yr4 pct | Label progression |
|---|---|---|---|---|---|
| 12+ (e.g. Nova SE 15, Lynn 14) | 40–50% | 60–70% | 80% | 90% | Early starter → captain |
| 8–11 (e.g. FIU 11, Barry 10.5) | 25–35% | 45–55% | 70% | 85% | Rotation → starter |
| 5–7 (e.g. UCLA 7, Indiana 7) | 15–25% | 30–40% | 55–65% | 80% | Development → starter |
| 1–4 (e.g. Virginia 5, UCSB 3) | 10–15% | 20–30% | 45–55% | 75% | Bench → rotation |
| 0 or negative (e.g. Keiser −4) | 5–10% | 15% | 35% | 65% | Deep bench → late starter |

Always set `available: true` when populating and include all 4 trajectory year objects with yr, yr_label, pct, and label fields.

---

*CLAUDE.md — v21 Stable — Updated May 28 2026*
*Multi Skilled Contractors. Do not commit changes to this file without owner approval.*
