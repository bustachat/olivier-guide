# Olivier — US College Soccer & Exercise Science Scholarship Guide

**Version 12.1** | Platform Sports Management × Sydney, AUS

A personalised scholarship research tool covering 24 US universities across 9 conferences, with financial modelling in AUD/USD, ACU degree alignment, ATAR → GPA conversion, facilities ratings, college culture guides, and multi-select filtering.

---

## Project Structure

```
olivier-guide/
├── index.html          ← App shell (HTML + CSS). Never edit data here.
├── js/
│   └── app.js          ← All application logic (45 functions)
├── data/
│   ├── schools.json    ← 24 school profiles (the main database)
│   ├── conferences.json← 15 conference profiles
│   └── coaches.json    ← 16 head coach profiles
└── README.md           ← This file
```

---

## Viewing the Guide

### Option A — GitHub Pages (recommended, live URL)

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages → Deploy from branch → main → / (root) → Save**
3. Your guide is live at `https://yourusername.github.io/olivier-guide/`

### Option B — Local development server

Browsers block `fetch()` calls from `file://` URLs for security reasons.  
You must use a local server. The easiest way:

```bash
# If you have Node.js installed:
npx serve .

# If you have Python installed:
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

> ⚠️ **Do not just double-click index.html** — it will show a data load error because the browser cannot fetch the JSON files from a local file path.

---

## Adding or Updating a School

All school data lives in `data/schools.json`. Each school is one object in the array.

### To update an existing school (e.g. update a coach's email):

1. Open `data/schools.json` in GitHub (click the file → click the pencil ✏️ icon)
2. Find the school by its `id` field (e.g. `"id": "pba"`)
3. Edit the relevant field
4. Click **Commit changes**
5. The live site updates within 30 seconds

### To add a new school:

1. Open `data/schools.json`
2. Copy an existing school object (from `{` to the closing `},`)
3. Paste it before the final `]`
4. Fill in all fields — see the field reference below
5. Commit changes

### Minimum required fields for a new school:

```json
{
  "id": "uniqueid",
  "name": "Short Name",
  "full": "Full University Name",
  "loc": "City, State",
  "region": "west",
  "div": "D1",
  "conf": "ACC",
  "warm": true,
  "city": true,
  "top": false,
  "color": ["#E0E7FF", "#4F46E5"],
  "degreeTitle": "B.S. in Kinesiology",
  "acuAlign": 11,
  "acuAlignNote": "Description of alignment...",
  "soccerLevel": "ACC — Elite",
  "cost": "~$52k/yr",
  "aid": "Athletic + Merit",
  "size": "22,000",
  "prePT": "Good",
  "gpa": {
    "minEntry": "3.0 NCAA core",
    "minSchol": "3.5+ for merit aid",
    "note": "Explanation for Olivier...",
    "status": "borderline"
  },
  "fin": {
    "costNum": 52000,
    "tuition": 34000,
    "roomBoard": 14000,
    "fees": 4000,
    "maxAthletic": 0.50,
    "maxAcademic": 0.50,
    "aidType": "athletic+merit",
    "internationalNote": "Details for international students..."
  },
  "coach": {
    "name": "Coach Name",
    "title": "Head Coach",
    "email": "coach@university.edu",
    "phone": "555-555-5555",
    "profile": "Coach background..."
  },
  "confRecord": [
    { "yr": 2024, "pos": "1st", "note": "Conference Champions" },
    { "yr": 2023, "pos": "3rd", "note": "Conference" }
  ],
  "titles": ["NCAA 2021", "ACC Tournament 2025"],
  "proPlayers": {
    "mlsPicks5yr": 4,
    "notable": ["Player Name — #X overall, Club (Year)"],
    "draftRank": "Top-X all-time MLS producers"
  },
  "devScores": {
    "tactical": 88,
    "technical": 85,
    "fitness": 82,
    "ptPath": 80
  },
  "fitOlivier": 85,
  "tags": ["warm", "city", "soccer"],
  "facilities": ["Stadium Name", "Weight Room", "Labs"],
  "courses": ["KINE 101 — Introduction", "KINE 201 — Physiology"],
  "rec": "One paragraph fit summary for Olivier...",
  "url": "https://universityathletics.com/soccer"
}
```

### Field reference — key values

| Field | Valid values |
|---|---|
| `region` | `"west"` `"east"` `"south"` `"texas"` |
| `div` | `"D1"` `"D2"` `"D3"` `"NAIA"` `"JUCO"` `"IVY"` |
| `gpa.status` | `"eligible"` `"borderline"` `"below"` |
| `fin.aidType` | `"athletic+merit"` `"athletic+need"` `"athletic+academic"` `"need-only"` |
| `warm` | `true` or `false` |
| `city` | `true` or `false` |
| `top` | `true` (manually curated top pick) or `false` |

---

## Version History

| Version | Key Changes |
|---|---|
| v12.1 | ATAR → GPA dynamic slider. GPA filter replaced. Refactored to multi-file. |
| v12 | Compact header. Multi-select filter panel. Card redesign. Filter bug fix. |
| v11 | Facilities rating on cards. Facilities filter. Multi-select filters introduced. |
| v10 | Facilities tab in Full Details modal (all 8 tabs). Facilities in Compare. |
| v9 | College Culture tab. GPA filter. Financial model 50/50 slider fix. |
| v8 | GPA requirements on cards. Financial Model tab with AUD/USD sliders. |
| v7 | Conferences tab (14 conferences). Coaches & Staff tab (16 coaches). |
| v6 | 30 schools. ACU alignment system. Conference standings. Pro pipeline. |

---

## Technical Notes

- Built with vanilla HTML/CSS/JavaScript — no frameworks, no build step required
- Google Fonts (Outfit + Lora) loaded via CDN — requires internet connection to display correctly
- All data fetched via `fetch()` — requires a server (GitHub Pages or local server)
- Single `<script src="js/app.js">` tag in index.html loads all logic
- Data arrays (`unis`, `conferences`, `coachData`) are declared as globals in app.js and populated asynchronously on load

---

## Contact

Platform Sports Management  
Agent for Olivier  
Sydney, Australia
