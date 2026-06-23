# Olivier — US College Soccer & Exercise Science Scholarship Guide

**Version 26** | Multi Skilled Contractors × Sydney, AUS

A personalised scholarship research tool covering 97 US universities across 18 conference sections — financial modelling in AUD/USD, ACU degree alignment, ATAR → GPA conversion, facilities ratings, culture guides, 6-lens dynamic ranking, 2027-entry Minutes Outlook analysis, and a live Dashboard with interactive USA school map.

**Live URL:** https://bustachat.github.io/olivier-guide

---

## Viewing the Guide

### Live (recommended)
Open https://bustachat.github.io/olivier-guide in any browser.

### Local development
Browsers block `fetch()` calls from `file://` URLs. Always use a local server:

```bash
# Node.js
npx serve .

# Python
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

> ⚠️ Never double-click `index.html` directly — JSON fetches will be blocked and the guide won't load.

---

## Working on This Repo

This repo uses **Claude Code** with `CLAUDE.md` as standing orders.

Before starting any session in Claude Code, read `CLAUDE.md` in full — it contains the architecture rules, session plan, file map, schema reference, QA suite, and commit protocol.

Key rules at a glance:
- `index.html` is a shell — never hardcode data there
- Schools live in their conference JSON file under `data/` — see `CLAUDE.md` Section 2 for the file map
- `athletes/olivier.json` is the single source of truth for all athlete config
- `coaches.json` is the single source of truth for coach data
- All JSON changes must be validated with `python -m json.tool [file].json` before committing
- Map coordinates use the v20 640×390 SVG coordinate system — see `CLAUDE.md` Section 5

---

## Version History

| Version | Status | Key Changes |
|-|-|-|
| **v26** | ✅ Current (June 2026) | ACU Alignment tab: fixed stale summary cards, removed UF references, excluded JUCOs (soccer development is the metric for 2yr programs). Minutes Outlook: Yr1+Yr2-only ranking formula (apples-to-apples JUCO vs 4yr), JUCO adjusted factor 1.2, JUCO Yr1/Yr2 recalibrated based on Macarthur Bulls A-League academy context vs high school JUCO recruits. CLAUDE.md: minutesOutlook roster research now mandatory for full profile upgrades. |
| **v25** | Superseded (June 2026) | All 55 listed-profile schools upgraded to full profile across ACC, Big East, Big West, AAC, CAA, America East. FSU removed (no men's soccer). 95 coaches in coaches.json. All schools now full-profile. |
| **v24** | Superseded (June 2026) | internationalNote populated for all schools. Indian Hills CC added (2025 NJCAA DI National Champions). coaching licence field added to all coaches. APP_VERSION driven dynamically from olivier.json. |
| **v23** | Superseded (June 2026) | CAA + Big Ten confRecord verification. minutesOutlook for SMC + MDC. 6 coaches added (40 total). Financial model corrected: athletic slider 0–100%, academic aid as fixed dollars, Glossary scholarships section. Misleading internationalNote text fixed for SMU/Wake Forest/UCLA. export_schools.py tool added. |
| **v22** | Superseded (June 2026) | 5 new full-profile schools: Mercyhurst (NEC/D1), Georgian Court (CACC/D2), Columbia College MO (D3), Northeast CC (JUCO), Monroe College (JUCO). PT Pathway removed from scoring — Dev Score now 3 sub-scores (tactical/technical/fitness), 6-lens system. D3/JUCO split into separate conference sections. Sort/Lens/Mode redesigned as independent axes. Glossary updated. 35 coaches re-ranked. |
| **v21** | Superseded (May 28 2026) | olivier.json consolidation. Minutes Outlook expanded. Fit Score rebalancing + dual mode toggle. GPA projection slider. Shortlist status tags. Coach outreach tracker. Coaches animated pill tab navigation. |
| **v20** | Superseded | Search box, Show/Hide All, confgroup filter chips, Pro Pipeline rank badge circles, dashboard SVG circle dots + 640×390 viewBox + hover info panel + cross-highlight. |
| **v19** | Superseded | Complete JSON layer separation. 4 new data files. 16 render functions. acuUnits[] on all schools. 5 new schools. |
| **v18.1** | Superseded | ACU score corrections (Clemson 5, GCU 14). SuperDraft table corrected. 30 coaches. |
| **v18** | Superseded | 5 new schools (GCU, Texas A&M, Akron, Denver, Vermont). Budget slider to $100k. Map restored. |
| **v17** | Superseded | ATAR hide-ineligible toggle. Below-min cards greyed. |
| **v16** | Superseded | Conference-split JSON. Dashboard tab. Sort system. |
| **v15** | Superseded | 7-lens ranking. Minutes Outlook tab. scores.js separated. |
| **v12.1** | Superseded | ATAR → GPA slider. Multi-file refactor. |
| **v6** | Superseded | Original single-file guide. 30 schools. ACU alignment. Conference standings. |

---

## Technical Notes

- Vanilla HTML/CSS/JavaScript — no frameworks, no build step
- Google Fonts (Outfit + Lora) via CDN — requires internet connection
- Scripts load in order: `scores.js` → `dashboard.js` → `app.js`
- Live AUD/USD rate from open.er-api.com on load — falls back to 1.40
- Dashboard map uses native SVG `<circle>` elements — fully responsive, no JS resize calculation

---

## Contact

Multi Skilled Contractors — Agent for Olivier — Sydney, Australia
