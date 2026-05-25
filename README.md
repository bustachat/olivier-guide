# Olivier — US College Soccer & Exercise Science Scholarship Guide

**Version 20 Stable** | Multi Skilled Contractors × Sydney, AUS

A personalised scholarship research tool covering 40+ US universities across 13 conferences, with financial modelling in AUD/USD, ACU degree alignment, ATAR → GPA conversion, facilities ratings, college culture guides, multi-select filtering, a 7-lens dynamic ranking system, 2027-entry Minutes Outlook analysis, and a live Dashboard with interactive USA school map.

**Live URL:** https://bustachat.github.io/olivier-guide

---

## Changelog

**v20 Stable** — Cosmetic & functional refinements across 4 tabs

* **Explore Schools:** Live search box with clear button (real-time partial match on school name). Show All / Hide All buttons to expand/collapse all conference sections. Filter chips reordered to Conference Prestige ranking (SEC → ACC → Big Ten → Big East → AAC → Big West → CAA → WAC → MAC → WCC → ASUN → Am. East → Other). Filter panel now has labelled groups (Division / Location / Facilities / Specials / Conference) for scanability. Conference filter chips now use `data-confgroup` (actual conference names — SSC, CCCAA, NJCAA, SCIAC, SAC etc.) instead of the generic `other` bucket, aligning Explore tab with Conferences tab. Mobile filter panel: horizontal scroll on chips at ≤768px.
* **Pro Pipeline:** Table headings 16px bold Outfit, table rows 11px. MLS SuperDraft rank badges rendered as coloured circles (Gold #1, Silver #2, Bronze #3, Grey #4–20). Three division toggle buttons (NCAA D1 / NCAA D2 / MLS SuperDraft) — all ON by default, individually togglable.
* **Financial Model:** Top banner padding reduced (2rem → 1rem). Currency bug fixed — `applyFxToUI()` now fires `updateFinModel()` when live AUD/USD rate loads, so AUD amounts update immediately. Bar label fix — all bars now show the actual net cost value regardless of amount (previously bars under $12k net were blank).
* **Conferences tab:** Conference stat cells (Soccer Teams / NCAA Titles / Max Aid) now use `flex + gap:4px` with correct padding, fixing the "10Soccer Teams" cramped display.
* **Dashboard — Map (major):** SVG viewBox expanded from `500×300` to `640×390` (+28% width, +30% height) giving dots more geographic breathing room. Map dots converted from absolutely-positioned `div` overlays to native SVG `<circle>` elements — dots now scale correctly on all browser resize events without recalculation. `ResizeObserver` and `wrap.style.height` recalculation removed as no longer needed. Grid ratio changed from `1fr 1fr` to `3fr 2fr` (map gets more width). Floating tooltip removed. Hover info panel added to right column — hovering any map or bracket dot shows full school info (name, div, conf, location, fit %, ACU align, cost/yr, pre-PT rating, climate, city type, culture quote). Cross-highlight added — hovering a map dot highlights the matching cost bracket dot and vice versa. All 93 `mapX`/`mapY` coordinates recalculated for new `640×390` viewBox. Three coordinate corrections: **Vermont** moved inside NE border (was outside land mass), **FAU** corrected to South FL cluster near Lynn/PBA (was misplaced in central FL), **Akron** moved to correct OH position (was clashing with Princeton).
* **Bug fixes:** FAU rank badge circle now renders correctly (was showing "—"). Conference `conf-stat-row` gap and padding fixed.

**v19 Stable** — Complete JSON layer separation. 4 new data files: `olivier.json`, `conf-prestige.json`, `pipeline.json`, `conferences.json`. All hardcoded pathways, questions, pipeline tables, prestige tables moved to JSON. 16 render functions — every tab/component data-driven. `acuUnits[]` array added to all school objects (16 unit objects per school). 5 new schools: GCU (WAC), Texas A&M (SEC), Akron (MAC), Denver (WCC), Vermont (Am. East). Live AUD/USD rate fetched from open.er-api.com.

**v18.1 Stable** — ACU alignment scores corrected from catalog research: Clemson 13→5 (public-health degree, not exercise science), GCU 12→14, UNC 13→12, FAU 15→14. SuperDraft table corrected: Akron #2, Denver #16, Vermont #18. Coaches table de-hardcoded to 30 coaches from coaches.json.

**v18** — Added 5 new schools (GCU, Texas A&M, Akron, Denver, Vermont). Budget slider to $100k. Map restored. Compare fix.

**v17** — ATAR hide-ineligible toggle. Below-min cards greyed. Top Picks always visible.

**v16** — Conference-split JSON. Dashboard tab (map, costs, conferences). Sort system.

**v15** — 7-lens ranking. Minutes Outlook tab. scores.js separated.

**v14** — UF no-varsity warning system.

**v12.1** — ATAR → GPA slider. Multi-file refactor.

**v12** — Compact header. Multi-select filters.

**v6** — 30 schools. ACU alignment. Conference standings. Pro pipeline.

---

## Project Structure

```
olivier-guide/
├── index.html              ← App shell (HTML + CSS). NEVER hardcode data here.
├── js/
│   ├── app.js              ← Entry point. Fetch, init, render, tabs, compare, social, modal.
│   ├── dashboard.js        ← Dashboard tab: USA map (SVG circles), cost brackets, hover info.
│   └── scores.js           ← Fit score engine, ATAR conversion, dev score calc.
├── data/
│   ├── acc.json            ← ACC conference school profiles
│   ├── big-ten.json        ← Big Ten school profiles
│   ├── big-east.json       ← Big East school profiles
│   ├── aac.json            ← AAC school profiles
│   ├── big-west.json       ← Big West school profiles
│   ├── caa.json            ← CAA school profiles
│   ├── other.json          ← All other conferences / NAIA / D2 / JUCO / new D1
│   ├── conferences.json    ← 21 conference metadata entries
│   ├── conf-prestige.json  ← Conference prestige rankings (20 rows)
│   ├── pipeline.json       ← NCAA D1/D2 champions + MLS SuperDraft 2022–2026
│   ├── coaches.json        ← 30 head coach profiles (ranked)
│   └── olivier.json        ← Olivier's athlete config, pathways, coach questions
├── athletes/
│   ├── olivier.json        ← Olivier's personalised athlete config
│   └── template.json       ← Blank template for new athletes
└── README.md               ← This file
```

**Critical:** Schools are split across conference JSON files — there is no single `schools.json`. When adding or editing a school, open the correct conference file.

| School's conference | File to edit |
|-|-|
| ACC (Clemson, Virginia, UNC, Notre Dame, Maryland, Wake Forest, SMU, Georgetown) | `data/acc.json` |
| Big Ten (UCLA, Indiana, Maryland) | `data/big-ten.json` |
| Big East (St John's) | `data/big-east.json` |
| AAC (USF, FIU, FAU) | `data/aac.json` |
| Big West (UCSB, Hawaii) | `data/big-west.json` |
| CAA (Charleston) | `data/caa.json` |
| Everything else (D2, NAIA, JUCO, WAC/GCU, MAC/Akron, WCC/Denver, Am.East/Vermont, SEC/Texas A&M, PBA, Lynn, Barry, NSU, Cal State LA, St Edward's, OCU, Keiser, Chapman, Santa Monica, Miami Dade) | `data/other.json` |

---

## Viewing the Guide

### Live URL (recommended)

https://bustachat.github.io/olivier-guide

### Local development server

Browsers block `fetch()` calls from `file://` URLs. Use a local server:

```bash
# Node.js
npx serve .

# Python
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

> ⚠️ **Never double-click index.html directly** — the browser will block the JSON fetch calls and the guide won't load.

---

## Adding or Updating a School

### To update an existing school (e.g. update a coach's email)

1. Find the correct conference JSON file from the table above
2. Open the file in GitHub → click the pencil ✏️ icon
3. Search for the school's `"id"` field (e.g. `"id": "pba"`)
4. Edit the relevant field
5. Commit changes — live site updates within 30 seconds

### To add a new school

1. Open the correct conference JSON file (see table above)
2. Copy an existing full-profile school object (from `{` to the closing `},`)
3. Paste it before the final `]` bracket
4. Fill in all required fields (see checklist below)
5. **Also update three objects in `js/app.js`** — see the Three Required app.js Updates section below

### Three required app.js updates for every new school

```
DOMAINS[school.id]   → school's athletics domain for favicon (e.g. 'lopes.com')
SITE_URLS[school.id] → full https:// URL to university homepage
SOCIAL[school.id]    → [instagram_url, x_url, facebook_url, youtube_url]
                        use null for any platform not found
```

Open `js/app.js` and search for `const DOMAINS`. Add one line per object for the new school.

**Verify all social links by clicking them before committing.**

---

## Required Fields — New School Checklist

All fields below are required for a `"profileDepth": "full"` school.

### Core fields (all schools including listed-depth)

```json
{
  "id": "uniqueid",
  "profileDepth": "full",
  "name": "Short Name",
  "full": "Full University Name",
  "loc": "City, State",
  "region": "west",
  "div": "D1",
  "conf": "WAC",
  "confKey": "wac",
  "warm": true,
  "city": true,
  "top": false,
  "color": ["#FEF3C7", "#78350F"],
  "domain": "lopes.com",
  "mapX": 154,
  "mapY": 231,
  "degreeTitle": "B.S. Exercise Science: Pre-Physical Therapy",
  "acuAlign": 14,
  "acuAlignNote": "Named courses covering ACU units...",
  "soccerLevel": "WAC — D1 Mid-Major",
  "cost": "~$38k/yr",
  "aid": "Athletic + Merit",
  "size": "25,000",
  "prePT": "Strong",
  "gpa": {
    "minEntry": "2.5+",
    "minSchol": "3.0+",
    "note": "Fit assessment for Olivier...",
    "status": "eligible"
  },
  "fin": {
    "costNum": 38000,
    "tuition": 28000,
    "roomBoard": 8000,
    "fees": 2000,
    "maxAthletic": 0.85,
    "maxAcademic": 8000,
    "aidType": "athletic+merit",
    "internationalNote": "..."
  },
  "coach": {
    "name": "Coach Name",
    "title": "Head Coach",
    "email": "coach@university.edu",
    "phone": "555-555-5555",
    "profile": "Background..."
  },
  "confRecord": [
    { "yr": 2025, "pos": "WAC Champs", "note": "14-4-5. NCAA Sweet 16." }
  ],
  "titles": ["WAC Tournament Champions 2025"],
  "proPlayers": {
    "mlsPicks5yr": 0,
    "notable": [],
    "draftRank": "Rising pipeline"
  },
  "url": "https://gculopes.com/sports/mens-soccer"
}
```

### Additional fields required for full-profile schools

```json
{
  "devScores": { "tactical": 82, "technical": 80, "fitness": 85, "ptPath": 88 },
  "fitOlivier": 85,
  "tags": ["warm", "city", "soccer"],
  "courses": ["EXS-340 — Physiology of Exercise", "EXS-305 — Motor Control and Motor Learning"],
  "rec": "One paragraph fit summary for Olivier...",
  "lensScores": {
    "overall": 85, "soccer": 72, "academic": 88,
    "minutes": 70, "pt": 90, "lifestyle": 95, "value": 82
  },
  "minutesOutlook": { "available": false },
  "facilityDetails": {
    "rating": "Good",
    "stadium": "...", "trainingFields": "...", "strengthConditioning": "...",
    "sportsScience": "...", "academicLabs": "...", "sportsMed": "...",
    "extras": "...", "note": "..."
  },
  "culture": {
    "vibe": "...", "thingsToDo": "...", "socialScene": "...",
    "olivierMatch": "★★★★ ...", "lifestyleTags": "..."
  }
}
```

### Field reference — valid values

| Field | Valid values |
|-|-|
| `profileDepth` | `"full"` `"listed"` `"directory"` |
| `region` | `"west"` `"east"` `"south"` `"texas"` |
| `div` | `"D1"` `"D2"` `"D3"` `"NAIA"` `"JUCO"` `"IVY"` |
| `confKey` | Must match a key in `CONF_SECTIONS` in `app.js` |
| `gpa.status` | `"eligible"` `"borderline"` `"below"` |
| `fin.aidType` | `"athletic+merit"` `"athletic+need"` `"athletic+academic"` `"need-only"` |
| `prePT` | `"Excellent"` `"Very Strong"` `"Good"` `"Solid"` `"Transfer Pathway"` |
| `facilityDetails.rating` | `"Elite"` `"Very Good"` `"Good"` `"Solid"` |
| `minutesOutlook.recruit_risk` | `"Low"` `"Medium"` `"High"` |

---

## Map Coordinate Guide — v20 (640×390 viewBox)

**Important:** All `mapX`/`mapY` coordinates were recalculated in v20 when the SVG viewBox expanded from `500×300` to `640×390`. If adding a new school, use the v20 coordinate system below. Do not use the old v19 ranges from previous README versions.

| Region | Approximate mapX | Approximate mapY |
|-|-|-|
| California (coast) | 70–110 | 140–220 |
| Arizona / Southwest | 130–180 | 180–240 |
| Texas | 300–360 | 250–290 |
| Florida (Tampa/Orlando) | 440–470 | 280–310 |
| Florida (South — Miami) | 470–490 | 295–320 |
| Midwest (Indiana/Ohio) | 400–470 | 150–175 |
| Mid-Atlantic (DC/VA/MD) | 455–520 | 175–195 |
| Northeast (NYC/NJ/CT) | 520–545 | 140–165 |
| New England (Boston/Providence) | 530–550 | 130–145 |
| Vermont / NE corner | ~548 | ~92 |
| Hawaii (HI inset box) | 170 | 355 |
| Alaska (AK inset box) | 100 | 361 |

> ⚠️ Never use `0, 0` for mapX/mapY — renders outside the map. Hawaii and Alaska must use inset box coordinates above.

---

## ACU Alignment Scores

ACU alignment scores (`acuAlign`, 1–16) must be researched from the university's official course catalog — not inferred from the degree name.

**Reference scores (verified from catalogs):**

| Score | Schools |
|-|-|
| 16/16 | UF (no varsity — academic reference only) |
| 15/16 | Indiana |
| 14/16 | PBA, FIU, GCU, FAU |
| 13/16 | Barry, USF, Virginia, Maryland, Texas A&M, Akron |
| 12/16 | Chapman, UNC |
| 11/16 | UCLA, UCSB, Wake Forest, Lynn, Cal State LA, St Edward's, Nova SE, Charleston |
| 10/16 | SMU, St John's, Keiser, OCU, Denver |
| 5/16 | Clemson (public-health degree — not exercise science) |

---

## Updating Coach Data

Coach data lives in two places that must be kept in sync:

1. `data/coaches.json` — drives the coach cards and coaches table (single source of truth since v18)
2. Each school's JSON object under the `"coach"` key — drives the card and modal

When a coaching change is confirmed:

1. Update the school's `"coach"` object in its conference JSON file
2. Update the corresponding entry in `data/coaches.json`
3. Verify social handles in `SOCIAL` in `app.js` if the coach has a personal social presence

---

## Technical Notes

* Vanilla HTML/CSS/JavaScript — no frameworks, no build step
* Google Fonts (Outfit + Lora) via CDN — requires internet to display correctly
* Three script tags load in order: `scores.js` → `dashboard.js` → `app.js`
* All data loaded via `fetch()` — requires a server (GitHub Pages or local, never file://)
* Live AUD/USD rate fetched from open.er-api.com on load; falls back to 1.40 if unavailable
* Dashboard map uses native SVG `<circle>` elements — dots scale correctly on all window resize events without JavaScript recalculation

---

## Version History (summary)

| Version | Key Changes |
|-|-|
| v20 | Search box, Show/Hide All, labelled filter groups, confgroup filter chips (SSC/CCCAA/NJCAA etc.), Pro Pipeline typography + rank badge circles + division toggles, currency bug fix, dashboard SVG circle dots + 640×390 viewBox + hover info panel + cross-highlight, all 93 coordinates recalculated, Vermont/FAU/Akron corrected. |
| v19 | Complete JSON layer separation. 4 new data files. 16 render functions. acuUnits[] on all schools. 5 new schools. |
| v18.1 | ACU score corrections (Clemson 5, GCU 14). SuperDraft table corrected. 30 coaches. |
| v18 | 5 new schools (GCU, Texas A&M, Akron, Denver, Vermont). Map restored. Compare fix. |
| v17 | ATAR hide-ineligible toggle. Below-min cards greyed. |
| v16 | Conference-split JSON. Dashboard tab. Sort system. |
| v15 | 7-lens ranking. Minutes Outlook tab. scores.js separated. |
| v14 | UF no-varsity warning system. |
| v12.1 | ATAR → GPA slider. Multi-file refactor. |
| v12 | Compact header. Multi-select filters. |
| v6 | 30 schools. ACU alignment. Conference standings. Pro pipeline. |

---

## Contact

Multi Skilled Contractors
Agent for Olivier
Sydney, Australia
