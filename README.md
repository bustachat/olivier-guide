# Olivier — US College Soccer \& Exercise Science Scholarship Guide

**Version 18.1 Stable** | Multi Skilled Contractors × Sydney, AUS

A personalised scholarship research tool covering 30+ US universities across 12 conferences, with financial modelling in AUD/USD, ACU degree alignment, ATAR → GPA conversion, facilities ratings, college culture guides, multi-select filtering, a 7-lens dynamic ranking system, 2027-entry Minutes Outlook analysis, and a live Dashboard with USA school map.

**Live URL:** https://bustachat.github.io/olivier-guide

\---

## Changelog

**v18.1 Stable** — ACU data corrections + SuperDraft table

* ACU alignment scores corrected from catalog research: Clemson 13→5 (public-health degree, not exercise science), GCU 12→14 (dedicated EXS-305 Motor Control confirmed required), UNC 13→12, FAU 15→14
* ACU per-unit table updated with new schools across 10 unit rows (GCU, Akron, Texas A\&M, Maryland, UNC, FAU, Denver)
* SuperDraft Pipeline table corrected: Akron at #2 (6 picks 2022–2026), Denver at #16 (2 picks), Vermont at #18 (1 pick)
* Coaches table renumbered correctly to 30 coaches matching coaches.json (was 25, missing 5)
* Clemson fake course codes replaced with real BIOL/HLTH catalog codes

**v18** — New schools + dashboard fixes + coaches de-hardcoded

* Added 5 new schools: GCU (WAC), Texas A\&M (SEC), Akron (MAC), Denver (WCC), Vermont (Am. East)
* Added filter chips for SEC, MAC, WAC, WCC, Am. East
* Conference prestige table updated to 20 rows with MAC/WCC/WAC ranked
* Coaches table de-hardcoded — now renders dynamically from coaches.json (single source of truth)
* Compare button fixed (addToCompare → toggleCompare ReferenceError)
* Dashboard budget slider cap raised $90k → $100k
* USA map shape restored (was regressed to box-grid); Hawaii dot corrected into HI inset box
* Map late-render timing bug fixed (ResizeObserver guard added)

**v17** — Stable baseline before new school additions

* ATAR hide-ineligible toggle. Below-min cards greyed. Top Picks always visible regardless of GPA.

**v16** — Conference-split JSON + Dashboard tab

* Schools split from schools.json into per-conference JSON files (acc.json, big-ten.json etc.)
* Dashboard tab: USA school map, cost-by-bracket, conference strip, budget slider
* Sort system. Listed-depth school profiles.

**v15** — 7-lens ranking + Minutes Outlook tab

* 7 lenses: Best Overall, Soccer-First, Academic-First, Minutes Outlook, PT Pathway, Lifestyle-First, Value-First
* Minutes Outlook tab: 4-year playing-time trajectory (2027–2030) based on 19-school, 535-player roster analysis
* scores.js separated as standalone module

**v14** — UF "No Varsity" warning system

\---

## Project Structure

```
olivier-guide/
├── index.html              ← App shell (HTML + CSS). NEVER hardcode data here.
├── js/
│   ├── app.js              ← Entry point. Fetch, init, render, tabs, compare, social, modal.
│   ├── dashboard.js        ← Dashboard tab: USA map, cost brackets, conference strip.
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
│   └── coaches.json        ← 30 head coach profiles (ranked)
├── athletes/
│   ├── olivier.json        ← Olivier's personalised athlete config
│   └── template.json       ← Blank template for new athletes
└── README.md               ← This file
```

**Critical:** Schools are split across conference JSON files — there is no single `schools.json`. When adding or editing a school, open the correct conference file.

|School's conference|File to edit|
|-|-|
|ACC (Clemson, Virginia, UNC, Notre Dame, Maryland, Wake Forest, SMU, Georgetown)|`data/acc.json`|
|Big Ten (UCLA, Indiana, Maryland)|`data/big-ten.json`|
|Big East (St John's)|`data/big-east.json`|
|AAC (USF, FIU, FAU)|`data/aac.json`|
|Big West (UCSB, Hawaii)|`data/big-west.json`|
|CAA (Charleston)|`data/caa.json`|
|Everything else (D2, NAIA, JUCO, WAC/GCU, MAC/Akron, WCC/Denver, Am.East/Vermont, SEC/Texas A\&M, PBA, Lynn, Barry, NSU, Cal State LA, St Edward's, OCU, Keiser, Chapman, Santa Monica, Miami Dade)|`data/other.json`|

\---

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

> ⚠️ \*\*Never double-click index.html directly\*\* — the browser will block the JSON fetch calls and the guide won't load.

\---

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

These are the most commonly missed steps. Every new school MUST have entries in all three:

```
DOMAINS\[school.id]   → school's athletics domain for favicon (e.g. 'lopes.com')
SITE\_URLS\[school.id] → full https:// URL to university homepage
SOCIAL\[school.id]    → \[instagram\_url, x\_url, facebook\_url, youtube\_url]
                        use null for any platform not found
```

Open `js/app.js` and search for `const DOMAINS`. Add one line per object for the new school.

**Verify all social links by clicking them before committing.** Unverified handles produce broken links on the live site.

\---

## Required Fields — New School Checklist

All fields below are required for a `"profileDepth": "full"` school. Missing fields cause crashes or silent wrong data.

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
  "color": \["#FEF3C7", "#78350F"],
  "domain": "lopes.com",
  "mapX": 133,
  "mapY": 273,
  "degreeTitle": "B.S. Exercise Science: Pre-Physical Therapy",
  "acuAlign": 14,
  "acuAlignNote": "Named courses covering ACU units, e.g. EXS-305 Motor Control (required)...",
  "soccerLevel": "WAC — D1 Mid-Major",
  "cost": "\~$38k/yr",
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
  "confRecord": \[
    { "yr": 2025, "pos": "WAC Champs", "note": "14-4-5. NCAA Sweet 16." },
    { "yr": 2024, "pos": "WAC Champs", "note": "Conference champions." }
  ],
  "titles": \["WAC Tournament Champions 2025"],
  "proPlayers": {
    "mlsPicks5yr": 0,
    "notable": \[],
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
  "tags": \["warm", "city", "soccer"],
  "courses": \["EXS-340 — Physiology of Exercise", "EXS-305 — Motor Control and Motor Learning"],
  "rec": "One paragraph fit summary for Olivier...",
  "lensScores": {
    "overall": 85, "soccer": 72, "academic": 88,
    "minutes": 70, "pt": 90, "lifestyle": 95, "value": 82
  },
  "minutesOutlook": {
    "available": false
  },
  "facilityDetails": {
    "rating": "Good",
    "stadium": "GCU Soccer Stadium — 1,500 capacity, FieldTurf.",
    "trainingFields": "...",
    "strengthConditioning": "...",
    "sportsScience": "...",
    "academicLabs": "...",
    "sportsMed": "...",
    "extras": "...",
    "note": "..."
  },
  "culture": {
    "vibe": "...",
    "thingsToDo": "...",
    "socialScene": "...",
    "olivierMatch": "★★★★ ...",
    "lifestyleTags": "..."
  }
}
```

### Field reference — valid values

|Field|Valid values|
|-|-|
|`profileDepth`|`"full"` `"listed"` `"directory"`|
|`region`|`"west"` `"east"` `"south"` `"texas"`|
|`div`|`"D1"` `"D2"` `"D3"` `"NAIA"` `"JUCO"` `"IVY"`|
|`confKey`|Must match a key in `CONF\_SECTIONS` in `app.js` (e.g. `"wac"`, `"mac"`, `"america-east"`)|
|`gpa.status`|`"eligible"` `"borderline"` `"below"`|
|`fin.aidType`|`"athletic+merit"` `"athletic+need"` `"athletic+academic"` `"need-only"`|
|`prePT`|`"Excellent"` `"Very Strong"` `"Good"` `"Solid"` `"Transfer Pathway"`|
|`facilityDetails.rating`|`"Elite"` `"Very Good"` `"Good"` `"Solid"`|
|`minutesOutlook.recruit\_risk`|`"Low"` `"Medium"` `"High"`|

### Map coordinate guide

The USA map spans x≈52–440 (W→E) and y≈42–282 (N→S).

|Region|Approximate x|Approximate y|
|-|-|-|
|California|68–120|110–165|
|Texas|235–280|190–220|
|Florida|335–395|195–240|
|Midwest (Ohio/Indiana)|400–430|105–140|
|Northeast|425–460|85–125|
|Hawaii (HI inset box)|133|273|
|Alaska (AK inset box)|78|274|

> ⚠️ Never use `0, 0` for mapX/mapY — it renders outside the map. Hawaii and Alaska must use the inset box coordinates above, not true geographic coordinates.

\---

## ACU Alignment Scores

ACU alignment scores (`acuAlign`, 1–16) must be researched from the university's official course catalog — not inferred from the degree name. The score represents how many of Olivier's 16 ACU BESS specified units are covered by **required** courses in that degree.

**The standard:**

1. Fetch the degree's required course list from the university catalog (not the marketing page)
2. Map each ACU unit to a specific named course code in the required curriculum
3. Elective-only coverage = partial or omit, not full
4. Record the specific course codes in `acuAlignNote` (e.g. "KINE 433 Exercise Physiology — required")

**Reference scores (verified from catalogs):**

|Score|Schools|
|-|-|
|16/16|UF (no varsity — academic reference only)|
|15/16|Indiana|
|14/16|PBA, FIU, GCU, FAU|
|13/16|Barry, USF, Virginia, Maryland, Texas A\&M, Akron|
|12/16|Chapman, UNC|
|11/16|UCLA, UCSB, Wake Forest, Lynn, Cal State LA, St Edward's, Nova SE, Charleston|
|10/16|SMU, St John's, Keiser, OCU, Denver|
|5/16|Clemson (public-health degree — not exercise science)|

\---

## Updating Coach Data

Coach data lives in two places that must be kept in sync:

1. `data/coaches.json` — drives the coach cards and the coaches table (single source of truth since v18)
2. Each school's JSON object under the `"coach"` key — drives the card coach info and modal

When a coaching change is confirmed:

1. Update the school's `"coach"` object in its conference JSON file
2. Update the corresponding entry in `data/coaches.json`
3. Verify the coach's social handles in `SOCIAL` in `app.js` if the coach has a personal social presence

The coach ranking in `coaches.json` is reflected in the "Rank #N" badge on every coach card and the coaches table. Both update automatically from `coaches.json` — do not hardcode coach rankings in `index.html`.

\---

## Updating Conference and Pipeline Tables

The Pro Pipeline tab and the Conference Prestige table in index.html are hardcoded HTML. When adding a new school:

1. **SuperDraft Pipeline table** — if the new school has MLS picks in the 2022–2026 window, insert it at the correct rank position (by 5-year pick count) and renumber all affected rows
2. **Conference Prestige table** — if the new school introduces a conference not yet listed, add a row at the appropriate rank position and renumber
3. **Filter chips** — add a chip in index.html and confirm the `data-val` matches the school's `confKey`

\---

## Adding a New Athlete

Each athlete needs one small JSON file (\~70 lines). The guide personalises automatically.

1. Copy `athletes/template.json` to `athletes/\[athletename].json`
2. Fill in position, GPA, ATAR range, career goal, lifestyle preferences, and budget
3. Set `scoreWeights` (must sum to 100)
4. Upload to the repo
5. Share: `https://bustachat.github.io/olivier-guide/?athlete=\[athletename]`

\---

## Technical Notes

* Vanilla HTML/CSS/JavaScript — no frameworks, no build step
* Google Fonts (Outfit + Lora) via CDN — requires internet to display correctly
* Three script tags load in order: `scores.js` → `dashboard.js` → `app.js`
* All data loaded via `fetch()` — requires a server (GitHub Pages or local server, never file://)
* `fetch()` loads all conference JSON files in parallel on init
* Live AUD/USD rate fetched from open.er-api.com on load; falls back to 1.40 if unavailable

\---

## Version History (summary)

|Version|Key Changes|
|-|-|
|v18.1|ACU score corrections (Clemson 13→5, GCU 12→14, UNC 13→12). SuperDraft table corrected (Akron #2, Denver #16, Vermont #18). Coaches table de-hardcoded to 30 coaches.|
|v18|5 new schools (GCU, Texas A\&M, Akron, Denver, Vermont). Budget slider to $100k. Map restored. Compare fix.|
|v17|ATAR hide-ineligible toggle. Below-min cards greyed.|
|v16|Conference-split JSON. Dashboard tab (map, costs, conferences). Sort system.|
|v15|7-lens ranking. Minutes Outlook tab. scores.js separated.|
|v14|UF no-varsity warning system.|
|v12.1|ATAR → GPA slider. Multi-file refactor.|
|v12|Compact header. Multi-select filters.|
|v6|30 schools. ACU alignment. Conference standings. Pro pipeline.|

\---

## Contact

Multi Skilled Contractors  
Agent for Olivier  
Sydney, Australia

