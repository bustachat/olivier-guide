# CHANGELOG — Olivier Scholarship Guide

Version history moved out of CLAUDE.md in v35.2 (July 2026) to reduce per-session context cost — CLAUDE.md is read at the start of every session; this file is read only when history is needed.

**Phase 8 (End of Session Protocol) appends new version entries here — add them at the TOP of the history below.** Entries under the divider are preserved in their original CLAUDE.md order (roughly chronological with some grouping).

---

### v37 — v37.0 through v37.10 (July 2026) — Fit Score redesign + JUCO enrichment pass
Owner-driven redesign of the Fit Score, prompted by a simple observation: GPA and Cost already have dedicated toggles/tabs (ATAR slider, budget slider, Financial Model), and ACU Alignment has its own tab — blending all three into one "Fit" number alongside soccer/lifestyle factors was redundant at best, misleading at worst (e.g. Stanford sitting at 41% purely because of cost, pre-redesign).

- **v37.0 — Soccer Priority added as a third, additive mode.** Alongside the existing With Minutes / Base Fit toggle, a new formula: Soccer Program Quality 40% (dev scores 60% + MLS pipeline 30% + division strength 10% — reused the existing "soccer" lens methodology, computed live rather than read from the separately-stored lensScores.soccer) + Minutes Outlook 35% + Climate 15% + City 10%. Verified against Duke by hand (44%) before rollout.
- **v37.1 — Consolidated to a single Fit Score; retired the mode toggle and the redundant "Soccer-First" Lens.** Once Soccer Priority existed, three overlapping soccer-quality signals were live at once (Dev Score bars, "Soccer-First" Lens, Soccer Priority mode) alongside a 3-way toggle that only existed to switch between GPA/Cost/ACU-inclusive formulas. Collapsed to one definition — `fitOlivier = Soccer Program Quality 40% + Minutes Outlook 35% + Climate 15% + City 10%`, identical for JUCO and non-JUCO. Removed as dead code: the old blended `calculateFitScore()`, `effectiveWeights()`, `soccerScore()`, `costScore()`, `acuScore()`, `gpaEligibilityScore()`, `gpaStatus()`, `parseMinGpa()`, `ptScore()`, and the already-unused `buildScoreBreakdown()`. `scoreWeightsBase`, `soccerLevelMap`, `prePtMap` removed from athletes/olivier.json (fully orphaned). All 92 full-profile schools' stored fitOlivier/lensScores.overall/lensScores.value re-synced to the new formula; validate_consistency.js's own drift-check rewritten to match (it would otherwise have falsely flagged all 93 schools against the retired formula). CLAUDE.md updated throughout — architecture rules, schema, weights table, Phase 1J scoring checklist, QA checklists, Change Type 5 impact table.
- **v37.2 — Fixed stale info-tips the v37.1 doc sweep missed.** The Glossary's main Fit Score card got updated in v37.1, but three other places still described the retired formula: the card score-strip's clickable "ⓘ Fit Score" tooltip, the modal Overview tab's fallback text (shown when a school has no `rec`), and the Glossary's "View By Lenses" section — which still listed a "Soccer-First" lens entry that no longer exists in the UI. Caught by the owner reviewing a screenshot, not by the original sweep.
- **v37.3 — Fixed a live NaN-fit-score bug caused by stale browser cache.** Right after the v37.1/v37.2 push, the owner saw `NaN%` fit scores on every card — reproducible in Chrome (even after fully closing the browser and Ctrl+Shift+R) but not in Edge. Root cause: `fetchWithRetry()` (app.js) and the dashboard.js olivier.json fetch both called plain `fetch(url)`, subject to normal HTTP caching — a hard reload reliably busts cache for `<script>` tags but not for `fetch()`-initiated requests in every browser. Chrome had the new scores.js (expects `scoreWeights.soccerQuality`) paired with a cached pre-v37.1 olivier.json (old schema, no `soccerQuality` key) — three of the four weight keys (minutesOutlook/climate/city) happened to exist under the same names in both schemas, so only `soccerQuality` came back `undefined`, and `undefined * anything = NaN` propagated through the sum. Fixed by adding `{ cache: 'no-store' }` to both fetch calls — the guide is low-traffic enough that losing HTTP caching on ~15 small JSON requests per load costs nothing. Confirmed fixed live after the owner did one more hard reload.

**Lesson for future schema changes:** a hard reload is not a reliable way to verify a live fix when the change touches fetched data files, not just script/HTML — check with `{ cache: 'no-store' }` in place (now permanent, see CLAUDE.md §8) or verify via incognito/private window.

**v37.4-v37.10 — JUCO tiering, region, housing, and Pro Pipeline pass.** Triggered by the owner cross-referencing an external AI-generated "top JUCO regions" claim and asking how to flag the strongest JUCOs better. Investigated properly against Tier-1 sources rather than trusting the claim outright — good thing, since the external source turned out to have real errors (see below).

- **v37.4 — Elite JUCO badge.** Verified against NJCAA.org's official 2025-26 Division I All-America team list (not the external claim) plus each school's own titles[]/confRecord — 6 of 12 JUCOs produced a 2025 All-American, but that alone would have misclassified Monroe College (3x national champion 2021-2023, 2024 runner-up, zero 2025 All-Americans) and undersold Tyler JC (6 all-time titles 2009-2017, current title drought). Settled on a 2-tier classification (`jucoTier`: Elite/Standard) using 2025-season evidence plus recent historical dominance — 9 of 12 Elite. Explored 3 mechanisms to fold this into the Fit Score itself (owner's original ask) with computed before/after impact for each; the only structurally honest option (reweighting `divStrength`, which is 10% of a 40% factor) maxed out at +1 point regardless of magnitude — not what the owner wanted, so landed on badge-only, zero Fit Score impact.
- **v37.5 — NJCAA region tags.** Verified against NJCAA.org's official "Organization of NJCAA Regions" page before adding anything to the app — caught the external source being wrong about Kansas (claimed "Region 11" alongside Iowa Western/Indian Hills; NJCAA's own page confirms Region 11 is Iowa + Northeast Nebraska only, Kansas is a separate Region 6). Also caught and fixed an error of Claude's own: initially added `njcaaRegion` to Santa Monica College before realizing SMC competes in CCCAA (California's own association), not NJCAA at all — removed before commit.
- **v37.6 — Fixed the Elite JUCO badge overlapping the card logo/title**, caught by the owner from a live screenshot. The v37.4 badge used `position:absolute` top-left, which collided with the emblem on cards that also render a full-width rank banner. Converted to an inline chip in the existing metadata tag row instead — same fix pattern later reused for the region and housing tags, making overlap structurally impossible regardless of what else renders on a card.
- **v37.7 — On-campus housing indicator**, prompted by the owner noticing Miami Dade is a commuter college with no dorms — a gap with no structured field anywhere in the schema. Design was iterated live via prototype mockups before writing any code: first attempt (compact stat grid) rejected for compressing on mobile; second attempt (unconditional metadata tag) rejected on the Daytona State card specifically, which already stacks 6-7 tags before an 8th would push it to 3 lines. Landed on silent-unless-flagged — same pattern as Top Pick / Elite JUCO, only show a tag when there's something to catch. Researched all 12 JUCOs via each college's own official housing pages: 2 confirmed no housing (Santa Monica, Miami Dade), 1 limited/waitlisted (Daytona State — 67 units, full for Spring 2026), 9 normal (including Tyler JC, which specifically houses its soccer program athletes). Caught and fixed a double-escaped-unicode bug of Claude's own (`\\u2019` literal text instead of an apostrophe) before commit. The 81 non-JUCO schools were explicitly deferred by the owner to their own session (v37.8 logs this).
- **v37.9 — Made the Dashboard's "Top 8" panel fully dynamic**, after the owner noticed JUCOs never appeared there and asked why it couldn't be dynamic. Turned out it already was designed to be — `updateShortlist()` pinned `shortlist[]` entries first, then auto-filled remaining slots by fitOlivier up to a cap of 8 — but the pinned list had grown to 10 entries, already exceeding the cap, so the auto-fill-by-fit logic had been silently dead the whole time (no JUCO-specific exclusion). Owner chose to remove pinning entirely rather than trim the list. ~95 lines of now-dead contact-status-tracking code removed with it (that workflow already lives properly in the separate Coaches Outreach tracker). Caught a self-inflicted bug immediately after the edit: `normaliseShortlist()` still called the just-deleted `loadSlStatuses()`, silently blanking the entire Dashboard page (`renderDashboard()` awaits it) — caught via an explicit `await` + DOM check in preview, not a console-log skim, since a fire-and-forget async call had masked the failure.
- **v37.10 — Fixed JUCO representation in the Pro Pipeline tab**, after the owner asked directly whether it needed updating. Two real gaps: Monroe College was missing from the MLS SuperDraft table entirely despite having genuine confirmed pro signings (while weaker JUCOs with zero picks already had entries); the NCAA D2/NAIA/D3/JUCO table only listed 3 of 12 JUCOs with generic "transfer pathway" text, undermining Iowa Western specifically (Elite tier, 2 All-Americans, shown with the same boilerplate as schools with no credentials at all). Fixed both, being careful to keep NJCAA (JUCO) titles out of the NCAA-medal-ranked sections of both tables — different governing bodies, a category error to mix them, same principle already correctly applied to the D1 table before this session touched anything.

**Lessons from this pass:**
- Cross-check AI-generated research claims (Grok, in this case) against the project's own Tier-1 sources before building anything on them — two separate errors were caught this way (the Kansas region misclassification, and the implicit assumption that MLS All-Americans alone would correctly rank JUCO prestige, which would have missed Monroe's historical dominance).
- For any UI element added to a card, prototype it on the *already-crowded* case (the Daytona State card, with 6-7 existing tags) before committing to a placement — a design that looks fine on a sparse card can break on the busiest one.
- Fire-and-forget async calls (`renderDashboard()` not awaited from a click handler) can mask a thrown error as "nothing happened" rather than a visible failure — when a change touches an `async function`, verify with an explicit `await` in preview, not just a click-and-look.

---

### v36 — v36.1 through v36.8 (July 2026) — v35.1 code-review backlog cleared
Six-batch fix pass against the 174-issue baseline from the v35.1 full code review (§6 backlog). `validate_consistency.js` went 174 → 1 (only a genuine data gap remains, not a bug — see below). All 8 batches verified in a running local preview before commit; nothing pushed until owner sign-off at end of session.

- **v36.1 — Score integrity:** Re-stored `fitOlivier`/`lensScores.overall` for 49 schools where the value had drifted from the live scores.js formula (worst case: Louisville stored 89 vs live 79). Root cause: `recalculateAllScores()` was only wired to the mode toggle, never to page load or the ATAR slider. Fixed by calling it from `onAtarSlide()` (which `initApp()` already invokes at the end of load) and re-applying the current sort afterward — GPA eligibility (20% of fitOlivier) now actually affects scores when the slider moves.
- **v36.2 — Conferences tab tier strings:** Big East (`Major (D1)`), SEC (`Power 4 (D1)`), and Ivy (`D1 (Ivy)`) tier strings matched no `renderConferences()` bucket, so those three cards silently never rendered. Fixed to `High Major (D1)` (owner call on Big East placement), `Power 5 (D1)`, `Ivy League (D1)`.
- **v36.3 — recruit_risk enum normalization:** 17 schools had free-text `recruit_risk` (`Very High`, `Medium-High`, `Moderate`, `Very Low`, `Low-Medium`, or full sentences) that fell through the renderer's `Low|Medium|High`-only branches to the green "Open" label — the opposite of the researched meaning (Clemson, Notre Dame, Maryland, Georgetown, Elon were the worst offenders). Mapped to the enum; three schools (GCU, Akron, Denver) had descriptive prose baked into the field — moved that into the existing `recruit_pathway_note` field instead of discarding it.
- **v36.4 — Coach two-file sync:** Tier-1 research (official athletics staff pages) on Providence, Butler, and Navy found two of the three were actual coaching changes neither file had caught yet — Butler hired Ian Sarachan (ex-Creighton/Colorado Rapids assistant) in Nov 2025, Navy hired John Hackworth (ex-St. Louis City SC technical director, 2025 MLS NEXT Pro Coach of the Year) — not simple stale-data syncs. Providence was a straightforward sync (conf JSON already had "Craig Stewart"; coaches.json was stale). Full coach re-rank applied after Butler's overallScore changed (62→58, reflecting no Butler head-coaching record yet). Discovered but deliberately NOT fixed: Stony Brook has a 4th coach mismatch (`TBD` vs `Head Coach`) — official site is unreachable, so both are honest unknowns rather than a stale-file conflict; left as a deferred item.
- **v36.5 — gpa.status + live Compare tab:** Re-stored `gpa.status` on 50 schools to the value computed at GPA 2.8. Also fixed the underlying reason it could drift: Compare tab read the stored value directly while cards self-healed via `refreshAllGpaRows()`. Compare's GPA row now calls `dynamicGpaStatus()` live, and `onAtarSlide()` re-renders the Compare tab (previously only re-rendered on toggleCompare/removeCompare) — the row can no longer go stale.
- **v36.6 — JUCO ACU exclusion + fin sums:** Added missing `juco2yr:true` to Santa Monica, Miami Dade, Iowa Western (the only flag `renderACUTable()` checks — `div:'JUCO'` alone isn't enough), which were wrongly appearing in the ACU Alignment tab. Fixed FIU and Indian Hills `fin{}` component sums to match `costNum` exactly (fees absorbs the difference per the v32.1 rule) — no `costNum` change, so no score cascade.
- **v36.7 — kinRank backfill:** Added the required `kinRank` one-line blurb to all 45 v25-batch schools that were missing it (the modal Degree tab renderer prints it unguarded — Duke showed the literal text "undefined" before this fix). Each blurb is grounded in that school's existing `degreeTitle`/`prePT` fields — no invented numeric rankings.
- **v36.8 — Financial Model slider reset bug:** `selectFinSchool()`'s "preserve values on school switch" branch was permanently dead code. The bug was one level deeper than originally diagnosed in the v35.1 review (which described it as an ordering issue): `isFirstSelection` was computed from `wrapper.style.display` using a falsy check (`!display || display==='none'`), and empty string is *also* falsy in JS — so even after reordering the display-reset line, the check still always evaluated true. Fixed to test `display === 'none'` specifically. Verified: sliders now persist across school switches; first-ever selection each session still correctly resets to 0; need-only schools (Princeton) still correctly force-disable the athletic slider.

**Outstanding after v36:** Stony Brook coach name (site down, can't verify at Tier 1). Lower-priority code-quality items from the v35.1 review (`atarToGpa` triple definition, `DATA_BASE_URL` inconsistency, double-fetch of olivier.json, dead `selectSchoolFromBar()` matcher, `filterToConf('other')` mis-scroll, self-XSS in search echo, stale CONF_SECTIONS intro texts, Glossary Minutes Score text mismatch, FX slider label mismatch, `costScore()` falsy-zero guard for service academies) remain deferred — none were in this session's named scope.

---


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
- Corrected misleading internationalNote text for SMU, Wake Forest, UCLA

**Tools added in v23:**
- export_schools.py — exports all 95 schools to CSV for external review (excludes Olivier-specific fields)

### v32 Stable — June 2026
Cost display made dynamic. The `cost` JSON field was a static string that drifted from `fin.costNum` — 5 schools had displays $10–25k wrong.

**Changes in v32:**
- `costDisplay()` helper added to app.js — derives display from `fin.costNum` (e.g. `$69,664/yr`). Falls back to `u.cost` only if no `fin` data. Service academies (costNum=0) show "Fully funded".
- All 3 display locations updated: school card, Compare tab, modal Overview
- `cost` field in school JSON is now redundant for full-profile schools — do not manually maintain it
- **Deferred:** tuition/roomBoard/fees sub-fields for Tulsa, Nova SE, Oklahoma City, UC Irvine, Wisconsin don't add up to their v31-corrected costNum — need a dedicated COA research pass to fix components

### v33 — June 2026
COA pass #1. costNum corrected for 4 schools where stored value was stale vs official 2025-26 COA.

**Changes in v33:**
- UCI: costNum $72,796 → $81,292 (2025-26 federal COA; T+F $56,682 confirmed Tier-1 via UCI Registrar; roomBoard $19,500 estimated from 2026-27 housing rates)
- Georgetown: costNum $100,864 → $97,264 (confirmed from Georgetown Financial Aid 2025-26 undergraduate COA page)
- Tulsa: costNum $69,664 → $77,346 (confirmed from UTulsa federal COA 2025-26 page; now includes university fees + indirect costs)
- OCU: costNum $49,262 → $56,720 (estimated from 2026-27 official COA of $57,120 minus $400 housing reduction for 2025-26)
- Tulsa fitOlivier 77→70 (recalculated from current data; costScore 0.15→0.10 floor). lensScores.value 37→46.
- OCU fitOlivier 69→68 (costScore 0.596→0.426). lensScores.value 68→58.
- UCI and Georgetown fitOlivier/scores unchanged (costScore already at 0.10 floor).
- guideVersion bumped to v33.

**Deferred from v33:**
- COA pass #2: 12 round-number costNum estimates (Penn State, Rutgers, Maryland, Creighton, Butler, DePaul, Marquette, UC Riverside, UCSD, William & Mary, Drexel, Vermont)
- UCI roomBoard ($19,500) and total COA ($81,292) are estimates — UCI financial aid site (financialaid.uci.edu) blocked WebFetch (ECONNREFUSED); verify via Chrome MCP browser
- OCU 2025-26 costNum is estimated (2025-26 official page rolled to 2026-27 data)

### v32.1 — June 2026
COA component audit. All 17 schools where tuition+roomBoard+fees ≠ costNum were researched and fixed using official school/financial aid pages (Tier 1 only).

**Changes in v32.1:**
- Components corrected for 17 schools across 8 conference files: Cal, Duke, SMU, UNC, Notre Dame, Louisville (ACC); Princeton, Yale (Ivy); Wisconsin, Indiana (Big Ten); Georgetown (Big East); Tulsa (AAC); OCU, Nova SE (D2/NAIA); Monroe, Indian Hills (JUCO); UC Irvine (Big West)
- `fees` field now absorbs all indirect costs (books, personal, transport, health insurance, international fees) to make components sum exactly to `costNum`
- Princeton uses 2026-27 data (deliberate — Olivier's actual enrollment year)
- 3 schools had costNum discrepancies vs official 2025-26 COA (Georgetown, Tulsa, OCU) — kept existing costNums, made components sum to them
- UCI costNum ($72,796) is stale vs 2025-26 actual (~$81k) — noted, kept as-is; tuition updated to $56,682 (official 2025-26 nonresident t+f)

### v24 Stable — June 2026
internationalNote populated for all schools, new JUCO school added, coaching licence data introduced.

**Changes in v24:**
- internationalNote added to all 54 remaining schools
- APP_VERSION now driven dynamically from `athleteConfig.guideVersion` in olivier.json
- Indian Hills CC (Ottumwa, IA) added as full-profile JUCO school — 2025 NJCAA DI National Champions
- coaching `licence` field added to all 41 coaches.json entries — 25 confirmed, 16 null
- Licence badge displayed on coach cards and rankings table
- guideVersion bumped to v24 in athletes/olivier.json

### v25 Stable — June 2026
All 55 listed-profile schools upgraded to full-profile. FSU removed (no men's soccer program). 95 coaches in coaches.json.

**Commits:**
- v25.1–v25.2: ACC batch (Duke, NC State, Louisville, Pitt, Stanford, Syracuse, Cal) — 7 schools
- v25.3: Big East batch (Villanova, Marquette + prior 7) — 9 schools complete
- v25.4: Big West batch (Cal Poly, UC Davis, UC Irvine, UC Riverside, UC San Diego, Long Beach, Hawaii, CSUF) — 8 schools
- v25.5: AAC batch (Tulsa, Memphis, Temple, East Carolina, UAB, Navy, Army, Charlotte, Rice) — 10 schools
- v25.6: CAA batch (William & Mary, Hofstra, Northeastern, Drexel, Delaware, Elon, Monmouth, Stony Brook) — 8 schools
- v25.7: Vermont (America East) upgraded
- v25.8: FSU removed; Conference tab desc/olivierNote updated across all conferences

**Total guide schools as of v25: 95 coaches, all schools full-profile.**

### v26 Stable — June 2026
ACU Alignment tab overhaul. Minutes Outlook formula and JUCO calibration fixes. Wichita State and Hawaii removed (no men's soccer programs). Coach name research continued.

**Commits:**
- v26.1–v26.2: Replace placeholder coaches with real names (16 total across multiple conferences)
- v26.3: Remove Wichita State and Hawaii (no men's soccer programs confirmed)
- v26.4: UC Riverside — Tim Cupello coach update
- v26.5–v26.6: Conference tab fix (conf-prestige.json programsInGuide corrections)
- v26.7–v26.9: ACU Alignment tab overhaul — stale cards fixed, JUCOs excluded
- v26.10–v26.12: Minutes Outlook — JUCO adjusted factor 1.2, Yr1+Yr2 ranking, calibration
- v26.13: CLAUDE.md — minutesOutlook roster research now mandatory Step 7 in Change Type 8

**Architecture decisions in v26:**
- JUCOs excluded from ACU Alignment tab — WES alignment not applicable for 2yr programs
- Minutes Outlook ranking uses Yr1+Yr2 only
- JUCO adjusted factor set to 1.2 — Olivier above average in JUCO player pool

**Deferred from v26 (carry to v27):**
- 53 schools with minutesOutlook `available:false` — populate from roster data
- Remaining "Head Coach" placeholder names unresolved
- GCU coach verification (Jamie Davies Dec 2025 flag)
- Remaining coaching licences unconfirmed (null)
- SMU shortlist decision (borderline budget reach)

**Planned for v27:**
- ~~Add Tyler Junior College~~ — ALREADY IN GUIDE (id: tyler_jc, data/juco.json). Needs data quality pass: costNum correction ($14k→$22.2k), confRecord with actual standings, titles[] with 6 national championships, domain fix (tjc.edu→apacheathletics.com), coach email/phone verification
- ~~Add Daytona State College~~ — ALREADY IN GUIDE (id: daytona_state, data/juco.json)
- minutesOutlook — populate from roster data for schools still at available:false

### v33.2 — July 2026
Spot-check fix: Mercyhurst 2025 confRecord (Change Type 6).

**Changes in v33.2:**
- `data/d1-other.json` — Mercyhurst 2025 confRecord corrected. Was showing placeholder `"pos": "—"` for the school's first D1 NEC season; official NEC standings (necsports.com, Tier 1) confirm Mercyhurst finished 8th of 10 (3-5-1, 10 pts, 3-10-4 overall), did not clinch a tournament berth. Note updated accordingly.
- lensScores.soccer left unchanged — the documented formula ((devAvg × 0.6) + (mlsPicks5yr/10 × 0.3) + (divStrength × 0.1)) does not derive from confRecord standings, so no cascade applies.
- guideVersion bumped to v33.2 in athletes/olivier.json.

**Lesson for future sessions:** newly-D1-reclassified schools (Mercyhurst-style) should not default to a placeholder dash for their first season once that season has concluded — check the conference's official standings page even when the note says "first season" or similar, since results are usually published well before the next spot-check.

---

### v35 — July 2026
Four new full-profile JUCO schools added: Barton Community College, Cowley County Community College, Arizona Western College, Eastern Florida State College. `data/juco.json` now has 12 schools (was 8).

**Changes in v35:**
- `data/juco.json` — 4 new full-profile school objects added: `barton_cc` (NJCAA DI/KJCCC, Great Bend KS), `cowley_cc` (NJCAA DI/KJCCC, Arkansas City KS), `arizona_western` (NJCAA DI/ACCAC, Yuma AZ), `efsc` (NJCAA DI/FCSAA Region 8, Melbourne FL). All fields populated per §5 schema: acuUnits[16], lensScores[6], minutesOutlook (roster-researched via Chrome MCP for Barton, WebFetch fallback for the other 3 after a Claude-in-Chrome extension per-origin permission block), fitOlivier.
- `data/coaches.json` — 4 coaches added (Rafael Simmons/Barton, Marcos Vinicius Longo Ribeiro/Cowley, Kenny Dale/AWC, Bart Sasnett/EFSC). All 93 coaches re-ranked by overallScore descending via a one-off `add_juco_coaches.py` script (deleted after use — not part of the permanent toolset).
- `js/app.js` — DOMAINS, SITE_URLS, SOCIAL updated for all 4 schools; existing JUCO CONF_SECTIONS entry's intro text updated (no new section needed — `confKey:'other'`/`divFilter:'JUCO'` already existed).
- `data/conferences.json` — JUCO entry's guideSchools[], desc, and olivierNote updated (8 → 12 schools).
- `data/conf-prestige.json` — JUCO entry's programsInGuide and relevance updated.
- `python validate_schools.py` passes — 93 schools total, only expected warnings (missing coach email/phone, matches existing JUCO pattern since no official contact info is published for any of the 4).

**Research notes:**
- Roster data (minutesOutlook) confirmed 100% turnover before Olivier's August 2027 start at all 4 schools, consistent with existing JUCO pattern. `recruit_pathway` populated as "Freshman-friendly" for all 4 based on roster composition (majority true freshmen, not transfer/portal-sourced) — this is the first batch where `recruit_pathway` (schema added v34) was actually populated.
- Multi-year confRecord (2021-2024) is incomplete for all 4 — only 2025-26 season standings were confirmed at Tier 1 sources (KJCCC/ACCAC/FCSAA official sites) within this session's scope; older years marked "exact standings not researched this session" rather than guessed, following the precedent already set for Daytona State in this same file.
- No coach email/phone published on any of the 4 schools' official athletics sites — all four `coach.email`/`coach.phone` fields are `null` (documented, not guessed).

**Tooling note discovered this session:** the Claude-in-Chrome browser extension enforces its own per-origin permission grant, separate from `.claude/settings.json`/`settings.local.json` (which only gate the `WebFetch` tool and MCP tool-call permission, not browser `navigate`). When `navigate` returns "Navigation to this domain is not allowed" for a domain never visited in-session, `WebFetch` is a reliable fallback for static/server-rendered pages (works well for Sidearm Sports roster tables) even though it won't render heavy client-side JS.

- guideVersion bumped to v35 in athletes/olivier.json.

---

### v35.1 — July 2026
Fit Score formula: ACU Alignment weight zeroed for JUCO schools (architecture decision, owner-directed).

**Why:** A JUCO degree is a 2-year stepping stone to a 4-year transfer, not the actual pathway-relevant credential — scoring it against ACU units conflated "this specific 2yr program aligns" with "this school is a good JUCO fit," which it wasn't really measuring. Owner decision: zero out ACU Alignment for JUCO schools, redistribute the freed weight to Minutes Outlook (+5%) and Climate (+5%), since playing time and lifestyle are what actually differentiate JUCO options. GPA Eligibility weight left unchanged — even though it always scores full marks for JUCOs (all guide JUCOs are open-enrolment), that's an accurate reflection of reality, not a bug, so no redistribution needed there.

**Changes in v35.1:**
- `js/scores.js` — new `effectiveWeights(school, athlete)` helper: for `div==='JUCO'` schools, sets `acuAlignment` weight to 0 and adds the freed amount to `minutesOutlook` (if active — With Minutes mode) split evenly with `climate`; in Base Fit mode (no Minutes factor), the full freed amount goes to `climate` alone. `calculateFitScore()` and `buildScoreBreakdown()` (the modal's Score Breakdown tooltip) both use this helper, so the weights displayed in the tooltip and the score computed always match for JUCO schools. Non-JUCO schools are completely unaffected — `effectiveWeights()` returns `athlete.scoreWeights` unchanged when `acuAlignment` weight is already 0 or `div !== 'JUCO'`.
- **New JUCO weight table (With Minutes mode):** Soccer Level 20% + GPA Eligibility 20% + Cost 20% + ACU Alignment **0%** + Minutes Outlook **25%** (was 20%) + City 5% + Climate **10%** (was 5%) = 100%.
- `data/juco.json` — `fitOlivier`, `lensScores.overall`, and `lensScores.value` recalculated and re-stored for all 12 JUCO schools to match the new formula (Change Type 5 cascade — a scoring-weight change requires all affected fitOlivier/lensScores.overall to be recalculated and re-stored, scoped here to `div==='JUCO'` only since the formula change itself is JUCO-conditional). `lensScores.academic` (a separate, independent lens) and `acuAlign`/`acuUnits[]` (informational, per the existing JUCO ACU exception in Change Type 9) were **not** touched — only fitOlivier-derived fields moved.
- `index.html` — Glossary tab's Fit Score card expanded with an explicit side-by-side weight breakdown for non-JUCO vs JUCO schools, including the GPA-always-eligible caveat for JUCOs, so the displayed methodology matches the actual code.

**Tabs verified:** Explore Schools (JUCO fit scores updated live, non-JUCO fit scores unchanged — spot-checked FIU 82%, Clemson 53%, Virginia 49% all unaffected), Glossary tab (new breakdown renders correctly), Score Breakdown tooltip (JUCO schools now show ACU Alignment 0% row). Zero console errors.



**Origin:** FIU roster research (v34 session) found ~60–70% of midfield roster spots filled via transfer/JUCO portal rather than true incoming freshmen, and that true-freshman internationals who did make the roster generally carried a pro-academy/club pedigree. This is a different axis from the existing GPA-based `internationalNote` (academic admission ease) — a school can be easy to get *admitted* to and still hard to win a freshman *roster spot* at.

**What shipped in v34 (this session):** schema-only. `recruit_pathway` / `recruit_pathway_note` added to the `minutesOutlook{}` field reference (§5), a research step added to Phase 1G (§7), and a companion note added to Change Type 3 (§3a). **No data was populated** — not even FIU. Populating any school's `recruit_pathway` is deferred to the full pass below.

**Next focus area — full recruiting-pathway pass across all 95 schools:**
- Research and populate `recruit_pathway` / `recruit_pathway_note` for every full-profile school, starting with FIU (data already gathered in the v34 research session — see conversation, not yet transcribed to JSON)
- Decide whether to batch this by conference (matching the existing Change Type 8 batching pattern) or run it as a standalone pass
- Informational only for now — no scoring cascade (see open question below)

**Open question — does this belong in the Fit model at all?** Owner flagged (v34) that "fit" and "realistic likelihood of immediate entry" may be two different things the current single `fitOlivier` score conflates, and is not yet sure how to model that distinction. Do not attempt to fold `recruit_pathway` into `fitOlivier`/`lensScores.minutes` until this is explicitly resolved — possible directions to evaluate when this is picked up: (a) a second, separate "entry likelihood" score shown alongside fitOlivier rather than blended into it, (b) a dampening factor applied only to `lensScores.minutes` for Portal/JUCO-heavy schools, (c) leave purely informational (current default). Needs owner input before any scoring change — this is a model-design decision, not a data-entry task.

---

