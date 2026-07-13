# CHANGELOG — Olivier Scholarship Guide

Version history moved out of CLAUDE.md in v35.2 (July 2026) to reduce per-session context cost — CLAUDE.md is read at the start of every session; this file is read only when history is needed.

**Phase 8 (End of Session Protocol) appends new version entries here — add them at the TOP of the history below.** Entries under the divider are preserved in their original CLAUDE.md order (roughly chronological with some grouping).

---

### v43.0 (July 2026) — Coach overallScore Rubric written (§5d, Step 0, doc-only) + "PT Path" badge deprecated

Opens the v43 coach-scoring series. Coach `overallScore` was a hand-assigned judgment value with no written standard (110 values scored across many sessions/eras against no anchor) — the identical failure mode §5a fixed for school dev scores. This commit writes the standard; it moves **no** score and **no** rank. Owner-approved design (three decisions taken this session).

- **§5d Coach overallScore Rubric added to CLAUDE.md.** A single holistic 0–100 coaching-quality score, defined directly (not a sub-score average), formed from two evidence pillars — **coaching pedigree/system** + **player development/next-level output** — weighed against named anchors (Gelnovatch 98 / Noonan 97 … down through the strong/solid bands). Key design points: **no hard division ceiling** (deliberate difference from §5a — coaching is a *person* attribute, not a program-bounded environment; **Hackworth/Navy 74** is the worked anchor for an elite CV at a constrained program); explicit "what it is NOT" table (tenure, Aus-fit, team results, the school's environment/`devScores`, and the program's `nextLevelOutput` all live elsewhere); and the Solomon rule — **re-score all 110 in one campaign, re-rank once**, never partially.
- **No `fitOlivier` cascade.** Confirmed `scores.js` reads only school-level `devScores`, never `coaches.json`; the eventual re-score touches only the coach rank order + the card "Overall" badge. Much lower risk than the §5a re-baseline.
- **`ptPathScore` "PT Path" card badge deprecated (owner-approved).** Removed the stat from the coach card in `js/app.js` (`buildCoachCard` — card now shows Yrs HC / MLS Picks / Overall). The label collided with the schools' *Pre-PT Path* physical-therapy meaning, which ACU Alignment already covers, and it rendered a bare "0" for 22 new coaches. The field stays in the data as inert legacy (no longer scored or displayed). §5 schema note updated for `ptPathScore`/`tacticalScore`/`devScore` (retired) and the incoming `overallScoreNote`.
- **Sequence recorded (§5d + §6):** Step 1 = add `overallScoreNote` field + gated validator check; Step 2 = re-score all 110 batched by conference file, then one global re-rank.
- **Validated:** `node --check js/app.js` OK; `validate_consistency.js` **Issues: 0** (unchanged — no drift); browser-verified live (110 cards render, stats `[Yrs HC, MLS Picks, Overall]`, no "PT Path" badge on any card, no console errors).
- guideVersion v42.34 → v43.0.

---

### v42.34 (July 2026) — Stony Brook coach resolved (Ryan Anatol) — validator baseline reaches 0/174 🎯

Closes the longest-standing deferral: Stony Brook's head coach was a `TBD`/`Head Coach` placeholder (the sole remaining `validate_consistency.js` issue, a COACH-SYNC gap open since the v36 review). Owner supplied the working link; verified Tier-1 via **stonybrookathletics.com** (the stored `stonybrookseawolves.com` is a dead alias — same failure class as Pittsburgh's `pittPanthers.com`, and why prior sessions couldn't reach it).

- **Coach filled in (Change Type 2):** **Ryan Anatol** — HC since 2011 (15 seasons), winningest in program history, USSF "A" license; 2011 America East champion, 2018 AEC Coaching Staff of the Year, **2023 CAA Coach of the Year**, 2025 first-ever CAA Championship-game appearance (9-5-5, beat #1 Hofstra away); career 98-116-39. Updated `data/caa.json` coach{} + `data/coaches.json` (name, email `soccer@`→`ryan.anatol@stonybrook.edu`, phone `631-632-7203`, bio, record, `yearsHC` 4→15, staff). Renamed the placeholder coaches.json id `hc_stonybrook` → `anatol_stonybrook` (confirmed unreferenced elsewhere).
- **overallScore held at 58 — deliberately NOT re-scored** (Solomon/Mercyhurst precedent: correcting a data-gap coach's facts shouldn't move the ranking against 109 unaudited peers). His credentials may warrant a bump — deferred to the v43 coach rubric. No overallScore change ⇒ no re-rank.
- **Dead-host fix (all instances):** `stonybrookseawolves.com` → `stonybrookathletics.com` in caa.json url, coaches.json url, and **app.js DOMAINS** (favicon).
- **Bug fixed in passing:** caa.json brief `facilities[]` had a truncated `"Kenneth P"` → `"Kenneth P. LaValle Stadium (shared with football)"`. Live staff (HC + 2 assistants + goalie consultant + dedicated MSOC AT, no soccer-dedicated sports science) confirms the environment → **devScores 58/58/62 unchanged**; devScoresNote updated.
- **Validated:** `node --check js/app.js` OK; `validate_schools.py` PASS (110); **`validate_consistency.js` Issues: 0** (down from the July-2026 baseline of 174 — the count is clean for the first time). Browser-verified.
- guideVersion v42.33 → v42.34.

---

### v42.33 (July 2026) — Pittsburgh live-verify (resolves deferral) + index.html glossary UF/FIU fixes

Two deferred items closed.

**Pittsburgh dev-score live-verify (Change Type 13 verify — no score change).** Resolves the v42.26 deferral where Pittsburgh was scored from stored Tier-1 because the site blanked. Root cause found: the stored host `pittPanthers.com` is a dead alias; the working official host is **pittsburghpanthers.com**. Verified live there: MSOC staff = HC Jay Vidovich + 3 assistants (Bryce Cregan, Will Marshall, Robby Dambrot) — a deep 4-coach staff, but **no soccer-dedicated S&C or sports-science staffer listed**. Under §5a (soccer-dedicated staff, not department-wide UPMC/GPS/lab resources) the conservative **devScores 75/73/74 hold — unchanged, no cascade**. devScoresNote rewritten to record the live check.
- **Dead-host fix (all instances):** `pittPanthers.com` → `pittsburghpanthers.com` in `data/acc.json` url, `data/coaches.json` url, and **`js/app.js` DOMAINS** (the favicon source — was broken).
- **Tier-1 corrections found in passing:** coach email `jvidovich@pitt.edu` (a guess) → `msoccer@athletics.pitt.edu` (the site-listed contact) in acc.json coach{} + coaches.json (two-file rule; no overallScore change → no re-rank). Populated coaches.json `staff[]` (was empty) with the 3 verified assistants. Fixed the brief `facilities[]` capacity 3,500 → **735** to match `facilityDetails` (internal inconsistency).

**index.html glossary drift (Change Type 11, smoke-tested).**
- Academic-First lens said *"UF tops this lens despite having no men's varsity soccer"* — UF (Florida) fields no men's soccer and isn't one of the 110 schools. Replaced with the real ACU-alignment leaders: **"Indiana and FAU top this lens"** (both acuAlign 15). *(The other UF the backlog flagged — the sports-science line — was already corrected to "Maryland" in an earlier session.)*
- Tactical Dev block still named **FIU (Russell)** as a top-tactical example, stale since FIU's dev dropped 88→75 in v42.24 (§5a mandates fixing moved anchors in this block). Replaced with **Clemson** (tactical 95).

- **Validated:** `node --check js/app.js` OK; `validate_schools.py` PASS (110); `validate_consistency.js` held at the **1-issue baseline** (Stony Brook), COACH-SYNC clean, no fit drift. Browser-verified: Pitt modal shows the new staff/email/capacity and favicon loads; glossary shows the corrected lens text.
- guideVersion v42.32 → v42.33.

---

### v42.32 (July 2026) — Navy / John Hackworth coach re-score (Change Type 2) — resolves the v42.29 under-score deferral + stale-staff fix

Resolves the v42.29 deferral that Navy's John Hackworth was floored on service-academy program context rather than coach quality. Verified his full career Tier-1 from navysports.com's own bio (named Navy HC Dec 2025, first season 2026): D1 HC at USF (1998 Conference USA title + Coach of the Year), MLS HC (Philadelphia Union), USL Championship winner (Louisville City, 2018), USMNT U-17 World Cup head coach, 2025 MLS NEXT Pro Coach of the Year.

- **`overallScore` 42 → 74** (`data/coaches.json`, `hackworth_navy`), rank **110 → 40**, rankClass rk-solid → rk-strong. Owner-approved. Anchored against real neighbors: set **below** his Wake Forest mentor Jay Vidovich (Pittsburgh, 76 — a national champion) and the active national-champion college coaches (McIntyre/Syracuse 79), but well **above** Army's Plotkin (70) given a far stronger head-coaching/international pedigree. The service-academy recruiting ceiling and a 25-year gap since his last college HC job (2001) keep him strong-tier, not elite. `tacticalScore` 50→76, `devScore` 45→72; `record`/`bio`/`strengths` rewritten to his real CV (bio keeps the mandatory ⚠ service-academy warning). Placeholder staff replaced with the real Navy staff (Risbridger, Chiles, Wilson).
- **All 110 coaches re-ranked** by overallScore desc (stable tiebreak = prior rank): only Hackworth's rankClass changed (0 pre-existing band mismatches under elite≥80 / strong 65-79 / solid≤64), 71 rank numbers shifted by the single insertion, ranks gapless 1–110. coaches.json rewritten via the verified byte-identical json.dump round-trip (indent=2, ensure_ascii=False; no float fields to corrupt).
- **Stale-staff bug fixed** (`data/aac.json`): Navy's school-level `staff[]` still listed **Chris Kampe** (the previous head coach) as HC — never updated when the `coach{}` block moved to Hackworth. Replaced with the current staff (Hackworth + Risbridger + Chiles + Wilson) and enriched the `coach.profile` with Hackworth's pedigree (service-academy + congressional-nomination warnings retained). Two-file rule honoured; COACH-SYNC clean.
- **Validated:** `validate_schools.py` PASS (110); `validate_consistency.js` held at the **1-issue baseline** (Stony Brook). Browser smoke test: Coaches Rankings shows Hackworth at rank 40 / 74 / rk-strong with gapless numbering; Navy modal shows the corrected staff (no Kampe); zero console errors. No fitOlivier impact (coach score is independent of the Fit Score).
- guideVersion v42.31 → v42.32.

---

### v42.31 (July 2026) — CORRECTION of v42.30: Dow coached Vermont through 2025; Dubois is a 2026 appointee

**v42.30 mis-attributed the 2025 Vermont season and must be corrected.** While doing the Penn State follow-up, gopsusports.com's official Dec 11 2025 hiring release proved the timeline v42.30 got wrong: *"[Dow] comes to Happy Valley after serving as the head coach at Vermont for the last nine years... In 2025, Vermont finished the regular season without a loss (12-0-5)... claim the conference title... a program-record 13 all-conference honors under his watch."* **Rob Dow coached Vermont through the 2025 season (won the 2025 America East title), then left for Penn State in December 2025.** Adrian Dubois is his successor, appointed for the **2026** season — he has not yet coached a Vermont game.

- **Root cause of the v42.30 error:** the uvmathletics.com coaches page, filtered to "2025," showed Dubois — but after a coaching change a Sidearm coaches page shows the *current* staff under the latest available season bucket (there is no "2026" bucket yet), NOT who actually coached that fall. The reliable signal was the destination school's hiring release, not the outgoing school's season-labelled staff page. (Lesson banked in memory.)
- **What v42.30 got right and is kept:** email `soccer@uvm.edu` → `mens.soccer@uvm.edu` (confirmed on both the 2024 and current UVM staff pages); the 2025 stat facts (14-1-5, beat Bryant 2-0 in the AEC final, NCAA 1st-round loss to Hofstra) — but **re-attributed to Dow**, not Dubois.
- **Corrected** (`data/d1-other.json` + `data/coaches.json`): coach title back to "Head Coach (2026, 1st season)"; profile/bio rewritten — Dubois appointed for 2026, succeeding Dow (→ Penn State, Dec 2025), has yet to coach a game; confRecord 2025 note re-attributed to "Rob Dow's final season before leaving for Penn State"; staff bg text no longer credits Dubois's current staff with Dow's 2025 title (Twomey noted as retained from the 2024 championship staff); `gpa.note`, `fin.internationalNote`, `rec` re-worded to "2026 appointee." coaches.json `record`/`bio`/`strengths` restored to program-inheritance framing; `overallScore` 66 unchanged.
- **Penn State (`dow_pennstate`) confirmed CORRECT as stored in v42.29 — no change made.** All its claims verified against the PSU release: Dec 2025 hire, nine seasons, 129-41-21, five straight NCAA Tournaments, 2024 national title, 9th-best active win %, back-to-back AEC Staff of the Year (2024, 2025). The v42.30 note that flagged it as a "timeline bug" was itself mistaken.
- **Validated:** `validate_schools.py` PASS (110); `validate_consistency.js` held at the **1-issue baseline** (Stony Brook); no fit drift (no score change). Browser smoke test clean.
- guideVersion v42.30 → v42.31.

---

### v42.30 (July 2026) — Vermont head-coach reconciliation (Change Type 2) — resolves the v42.29 Vermont deferral

Resolves the Vermont deferral logged in v42.29. Live-verified against uvmathletics.com's own season-filtered coaching-staff pages that **Adrian Dubois is the real Vermont HC** (his name was already correct in the guide) — but the surrounding details wrongly assumed Rob Dow left a year later than he did. Tier-1 timeline: **2024** = Dow (NCAA championship, his final season); **2025** = Dubois's debut (14-1-5, won the America East title, NCAA 1st round exit vs Hofstra).

- **`coach{}` corrections** (`data/d1-other.json` + `data/coaches.json`, two-file rule): email `soccer@uvm.edu` → `mens.soccer@uvm.edu` (the old address was a guess, not published); title/profile/bio/record "appointed 2026 / 1st season 2026" → **2025**, rewritten to reflect his completed championship debut rather than "inheriting under pressure."
- **`staff[]`** — replaced the lone `"Assistant Coach"` placeholder with the real 2025 staff: Travis Brent (Associate HC), Rory Twomey (Asst, retained through the transition), Edgar Vargas (Asst), Eric Bissell (Dir of Ops).
- **`confRecord` 2025 note** "Dow's final season" → corrected: America East champions (beat Bryant 2-0), 14-1-5, NCAA 1st round, **Dubois's 1st season**. Championship facts (AEC 2024+2025, 2024 national title) were verified correct and unchanged.
- Stale "new coach" framing refreshed in `rec`, `gpa.note`, `fin.internationalNote`.
- **No score change** — dev/fit/lens untouched, so no re-rank reorder; `overallScore` 66 held. Both files kept in sync (COACH-SYNC clean).
- **Validated:** `validate_schools.py` PASS (110); `validate_consistency.js` held at the **1-issue baseline** (Stony Brook only) — no new issues, no fit drift. Local browser smoke test: Vermont modal renders all corrected data, old strings gone, zero console errors.
- **New deferral logged:** the Penn State `dow_pennstate` record (v42.29) states Dow was "hired Dec 2025 ... AEC Coaching Staff of the Year (2024, 2025)" — contradicted here (Dow's Vermont tenure ended after 2024; the 2025 AEC credit is Dubois's). Left untouched this session (scope discipline); flagged for a Penn State pass.
- guideVersion v42.29 → v42.30.

---

### v42.29 (July 2026) — 8 stale head-coach corrections (Change Type 2) + 2 staff-only edits + global coach re-rank

Reconciles the head-coach names surfaced (but deliberately left untouched) during the v42.26–v42.28 devScore re-baseline, plus older deferred coach changes — all confirmed live via Chrome MCP against each school's official staff directory/bio page. No Fit cascade (coach score is independent of `fitOlivier`); only the Coaches Rankings reshuffled.

- **4 primary HC changes** (all were *long-standing stored errors*, not fresh hires — the incumbents had been gone for years): Cal `Colin Carmichael → Leonard Griffin` (HC since 2022; 2023 Pac-12 COY) · Penn State `Bob Warming → Rob Dow` (hired Dec 2025 from Vermont; 2024 NCAA National Champion, 129-41-21) · Northwestern `Tim Lenahan → Russell Payne` (HC since 2021; ex-USMNT GK coach) · Wisconsin `John Trask → Neil Jones` (HC since 2022; ex-Loyola Chicago).
- **4 older deferred HC changes:** Temple — conf JSON still carried Rowland's email/profile though the name was already Green (fixed email→"", profile, staff) · Army `"Head Coach" placeholder → Brian Plotkin` (2022 Patriot League COY, USSF 'A') · Cal Poly `Steve Sampson → Oige Kennedy` (2024 Big West COY; stored profile wrongly credited Sampson with Kennedy's titles) · Neosho CC `Elliot Chadderton → Sam Hall` (confirmed Head Men's Coach via official staff directory; individual bio page unpublished, so scored/described conservatively).
- **2 staff-only edits** (`staff[]` + coaches.json bio, no re-rank score change): Wake Forest — Steve Armas departed, replaced by Zack Schilawski; Dane Brenner elevated. UCLA — Erik Holt → Kary Whitney.
- **`overallScore` (fresh assessments — a new person, not drift):** Dow 76→85 (elite; national champion) · Payne 65→79 · Griffin 69→75 · Kennedy 68→73 · Jones 63→71 · Plotkin 40→70 (the 40 was a "no-data" placeholder floor) · Hall 65→60 (new HC, thin published record) · Green unchanged 58. **All 110 coaches re-ranked by `overallScore` desc** (gapless 1–110; rankClass re-banded elite ≥80 / strong 65–79 / solid ≤64).
- **Two-file rule honoured** for all 8: conf JSON `coach{}`+`staff[]` and `data/coaches.json` kept in sync (validate_consistency.js COACH-SYNC clean).
- **Validated:** `validate_schools.py` PASS (110 schools; only new warnings are Penn State + Temple "coach contact unverified" — both because a now-invalid published email was honestly emptied, real HC emails aren't published). `validate_consistency.js` held at the **1-issue baseline** (Stony Brook placeholder — the known genuine gap; unchanged).
- **Browser-verified (local, Chrome MCP):** Coaches → Rankings shows all 110 gapless with every changed coach correct (Dow #18, Payne #30, Griffin #36, Kennedy #41, Jones #46, Plotkin #49, Hall #82, Green #92); Profiles renders the new bios + staff (Brad Cole, Oscar Umar, Zack Schilawski, Kary Whitney, JR DeRose, Nate Boyden) with no stale Armas/Holt; Explore modal Coach & Contact (Cal) shows Griffin + Pac-12 COY profile + `calsoccer@berkeley.edu`; Dashboard Top 8 fit scores unchanged (no fit drift); zero app console errors.
- **Newly discovered deferrals (logged, not fixed):** (1) **Vermont** (`data/d1-other.json`) HC is now stale — Rob Dow left it for Penn State; needs its own Change Type 2 pass. (2) **Navy / John Hackworth** sits at coach score 42 despite a stronger CV than several coaches now above him (ex-Philadelphia Union MLS HC, USMNT U-17) — surfaced by scoring Plotkin on merit; a service-academy re-score to consider. (3) CHANGELOG had no entries for v42.19–v42.28 (dev re-baseline sessions committed to git without appending here) — a pre-existing docs-drift gap.
- guideVersion v42.28 → v42.29.

---

### v42.28 (July 2026) — devScore re-baseline §5a: Big East — COMPLETES the 110/110 re-baseline

Change Type 13 — training-environment-only re-score of all 11 Big East schools against §5a, from live men's-soccer staff directories + Tier-1 facilities. Three anchors held and live-confirmed: Georgetown 92/94/88 (GPS Catapult + video), Creighton 75/73/76 (the ~75 reference), DePaul 60/58/63 (modest-investment reference). St. John's 80→75 (technical score exceeded the Creighton anchor despite a much smaller stadium); Butler 66→68 (4 coaches incl GK + 5,000 venue). UConn/Marquette/Providence/Seton Hall/Xavier/Villanova held within ±2 (the Big East was already anchored by DePaul). No Glossary edit. **This batch completes the §6 devScore re-baseline: validate_consistency.js reports 110/110 re-baselined, 0 over division ceiling, Issues:1 (Stony Brook).** guideVersion v42.27 → v42.28.

---

### v42.27 (July 2026) — devScore re-baseline §5a: Big Ten

Change Type 13 — all 11 Big Ten schools re-scored against §5a. Anchors held: Indiana 93/88/92, Maryland 93/91/90; UCLA held 87 (Glossary sports-science exemplar; tactical trimmed to the 4-coach elite tier). Michigan 82→79 (no dedicated sport scientist); Penn State 77→79, Ohio State 76→78 (dedicated performance staff). Conference/results banding corrected **up** for the mid-tier: Northwestern 65→72, Wisconsin 66→71, Michigan State 68→72, Rutgers 68→73, Washington 71→74 — each has a dedicated soccer stadium + 4 full-time coaches + Big Ten S&C. Cascaded fit→overall→value; Issues:1, 99/110 re-baselined. Live staff surfaced coach changes (Warming→Dow PSU, Lenahan→Payne NW, Trask→Jones Wisc) — logged as separate Change Type 2, resolved in v42.29. guideVersion v42.26 → v42.27.

---

### v42.26 (July 2026) — devScore re-baseline §5a: ACC

Change Type 13 — all 13 ACC schools. Anchors held and confirmed live, unmoved: Virginia 95/90/88, Clemson 95/93/92. Results-halo stripped from the environment score: SMU 88→87, Stanford 88→86, Notre Dame 90→86, UNC 87→85, Wake Forest 87→84, Duke 85→82, Syracuse 78→74, Pittsburgh 77→74; Louisville 70→74 (dedicated Lynn Stadium under-credited); Cal 76→77, NC State 72→73 held near current. Cascaded; Issues:1, 88/110 re-baselined. **Pittsburgh live staff not re-verified** (pittpanthers.com rendered blank in both browsers) — scored from stored Tier-1. guideVersion v42.25 → v42.26.

---

### v42.25 (July 2026) — devScore re-baseline §5a: non-major D1 (d1-other)

Change Type 13 — all 6 non-major D1 schools (Akron, GCU, Denver, Vermont, Mercyhurst, UCA), environment-only. devAvg → fitOlivier: UCA 74→71 / fit 61 (unch); GCU 82→78 / 70→69; Akron 85→80 / 60→59; Denver 84→79 / 56→55; Vermont 73→72 / 54 (unch); Mercyhurst 70→63 / 35→33 (results-halo removed). Cascaded fit→overall→value; Issues:1, ~65/110 re-baselined. *(This commit landed in git with no message; entry reconstructed from the diff during the v42.32 backfill.)* guideVersion v42.24 → v42.25.

---

### v42.24 (July 2026) — devScore re-baseline §5a: AAC

Change Type 13 — all 10 AAC programs re-scored from each program's live men's-soccer staff directory. Notable: FIU 88→75 and USF 87→78 (results-inflation removed), Charlotte 65→74 (deepest AAC staff, previously under-scored). devScoresNote added citing live staffing + Tier-1 facilities; cascaded fit→overall→value. Issues:1, 59→69/110 re-baselined. guideVersion v42.23 → v42.24.

---

### v42.23 (July 2026) — devScore re-baseline §5a: Big West

Change Type 13 — all 7 Big West schools, environment-only. dev moves: UCSB 82→78, Cal Poly 66→62, UC Davis 62→61, UC Irvine 65→64, UC Riverside 52→53, UC San Diego 62→63, CSU Fullerton 50→57. The one real correction is **CSU Fullerton +7** — its prior 50 was depressed by weak pipeline/results (which §5a excludes); on environment alone (4 coaches incl a GK specialist + team AT) it out-staffs several UCs. CSUF's housing "limited" −3 preserved through the cascade (dev +7 → fit only +2). Issues:1, 52→59/110. Found in passing (deferred, resolved v42.29): Cal Poly stored HC 'Steve Sampson' stale vs live 'Oige Kennedy'. guideVersion v42.22 → v42.23.

---

### v42.22 (July 2026) — correct 3 stale CAA head coaches (Change Type 2) + dead Hofstra URL

Replaced 3 stored head-coach names, verified live against each school's own staff directory: William & Mary Tsakiris → **Chris Norris** (23rd yr, 2 CAA titles; ov 63); Hofstra Coufal → **Stephen Roche** (promoted Jan 2026, tactical lead for 4 straight CAA titles; ov 74→72, first-year); Northeastern Ainscough → **Jeremy Bonomo** (2× Horizon COY; ov 65→66). Two-file rule applied (caa.json coach{}/staff[] + coaches.json); all 110 re-ranked (7 shifts, sequence intact). Fixed dead host hofstraathletics.com (NXDOMAIN) → gohofstra.com in caa.json url, coaches.json url, and app.js DOMAINS. Issues:1. guideVersion v42.21 → v42.22.

---

### v42.21 (July 2026) — devScore re-baseline §5a: CAA

Change Type 13 — all 9 CAA schools, environment-only. dev moves: Charleston 76→74, William & Mary 62→65, Hofstra 68→69, Northeastern 60→59, Drexel 58 (unch), Delaware 65→67, Elon 65→61 (title-inflated fitness trimmed), Monmouth 55 (unch), Stony Brook 60→59. Fit moves ±1 (these D1 programs were never results-inflated like the JUCOs). Cascaded; Issues:1, 43→52/110. Found in passing (fixed next in v42.22): stale HCs at William & Mary / Hofstra / Northeastern. Stony Brook coach still TBD (official site unreachable). guideVersion v42.20 → v42.21.

---

### v42.20 (July 2026) — devScore re-baseline §5a: D2 / NAIA / D3

Change Type 13 — all 12 D2/NAIA/D3 schools; every devAvg now sits at or below its division ceiling (D2 76 · NAIA 72 · D3 66), dropping the validator's "legacy above ceiling" count 8→0. devAvg → fit: PBA 84→75 / 64→61, St. Edward's 84→73 / 64→61, Barry 84→73 / 66→63 (national titles are results — removed), Lynn 82→73 / 55→53, Nova 77→75 / 58→57, Cal State LA 76→72 / 60→59, Oklahoma City (NAIA) 80→69 / 61→59, Keiser 77→71 / 48→47, Chapman (D3) 76→66 / 48→45 (held at the hard D3 ceiling), Charleston WV 70→72 / 48→49, Georgian Court 64 (unch, re-scored on evidence), Columbia College 58→57. Also fixed uc_charleston's malformed URL. Cascaded; Issues:1. guideVersion v42.19 → v42.20.

---

### v42.19 (July 2026) — devScore re-baseline §5a: Ivy (Princeton, Yale)

Change Type 13 — Step 5 Ivy batch, scored on the absolute national scale from browsed athletics staff directories + v38 Tier-1 facility data (environment only). Ivy ceiling 88. Princeton 88/85/80 → 85/82/77 (devAvg 84→81; fitOlivier 42→41); Yale 82/80/79 (devAvg 80, unchanged — evidence confirms the existing score). devScoresNote added to both (activates the validator DEV-RUBRIC ceiling check). Issues:1. guideVersion v42.18 → v42.19.

---

### v42.18 (July 2026) — fundingPathway penalty implemented (§5c, owner-approved) — Step 4 of the devScores re-baseline sequence

Implements CLAUDE.md §5c: scholarship availability is a **structural** property of a program (a D3/Ivy/CCCAA school is forbidden to offer athletic money to anyone at any price; a D2/NAIA/NJCAA-DII school may but is capped by rule), which is distinct from *cost* (a price tag, correctly removed from the Fit Score in v37.1). Two schools with identical Fit shouldn't rank equal when one can fund an athlete for playing and the other structurally cannot.

- **Mechanism:** new `fundingPenalty()` in `js/scores.js`, applied as a flat deduction after the weighted total, **stacking** with `housingPenalty()` (owner-approved): **−8** `none` (Ivy, NCAA D3, CCCAA) · **−3** `capped` (D2, NAIA, NJCAA DII) · **0** `full` (D1, NJCAA DI). Gated on the `fundingPathway` field: absent ⇒ 0, so the 67 D1 schools default to `full` and need no field.
- **Data — `fundingPathway` stored on all 43 non-D1 full profiles** (div alone can't split NJCAA DI/DII/CCCAA — all carry `div:"JUCO"`): 20 NJCAA DI JUCOs = `full` (field added, **no score change**); 19 `capped` (8 NJCAA DII + 8 D2 + 3 NAIA, −3 each); 4 `none` (2 Ivy + Chapman D3 + Santa Monica CCCAA, −8 each). Counts match §5c exactly.
- **23 schools re-scored** (`fitOlivier` + `lensScores.overall` + `lensScores.value` recomputed): `none` −8 → Princeton 50→42, Yale 55→47, Chapman 56→48, Santa Monica 64→56 (now −6 housing −8 funding = −14, as §5c intends). `capped` −3 → Barry 69→66, PBA/St. Edward's/Phoenix 67→64, OCU 64→61, CS-LA 63→60, Nova 61→58, Pima 62→59, Lynn 58→55, Keiser/UC-Charleston 51→48, Northeast/Neosho 47→44, Iowa Lakes 49→46, Johnson County 46→43, Southeastern 40→37, Columbia College 38→35, Georgian Court 30→27. The 20 `full` JUCO-DI schools' scores are byte-for-byte unchanged (only the field was added; pre-existing ±1 `value` rounding noise deliberately left untouched — out of scope, and `value` isn't validated).
- **Aid-string disclosure fix — all 8 NJCAA DII schools** (extends §5c's named 4: Phoenix/Pima/Glendale/Johnson County → also Northeast/Neosho/Southeastern/Iowa Lakes, the same error class, all being touched this session anyway): bare `aid: "Athletic"` → `"Athletic (NJCAA DII: tuition, fees & books; no room/board)"`. NJCAA DI JUCOs keep bare `"Athletic"` (they *can* offer a full ride, so it's accurate). No `maxAthletic`/`aidType` change — DII schools *do* offer athletic aid, so the Financial Model slider correctly stays unlocked (§5c). Santa Monica's structural fix was already done in v42.16.
- **Enforcement (validator mirror):** `validate_consistency.js` mirrors `fundingPenalty()` in its fit-drift check, adds a `FUNDING` check requiring a valid `fundingPathway` on every non-D1 full profile, and flags any D1 school carrying a non-`full` value (a silent misclassification). Held at the **1-issue baseline** (Stony Brook coach name — the known genuine gap).
- **Glossary:** index.html Fit Score card gained a "Funding penalty (v42)" paragraph beside the housing one.
- **Browser-verified (full regression, headless Chromium):** all 110 cards render; live fit scores exactly match the recomputed stored values (smc 56, princeton 42, yale 47, chapman 48, phoenix 64, barry 66, stedwards 64; D1/full unchanged — tyler 71, clemson 67, indiana 55); phoenix modal shows the new capped aid string; **zero JS page errors** (only sandbox-blocked external favicons/socials). `validate_schools.py` PASS (110 schools, pre-existing warnings only); `node --check` clean on scores.js + validator.
- guideVersion v42.17 → v42.18.
- **Sequence note:** this is Step 4 of the §6 devScores re-baseline sequence. Step 5 (re-score the 81 non-JUCO schools against §5a, conference-file by conference-file) remains open.

---

### v41.0 (July 2026) — Housing penalty added to the Fit Score (owner-approved)

Owner-initiated: on-campus housing is a feasibility issue for a 17-18yo international (off-campus rent + transport alone in a foreign country), and unlike GPA/Cost/ACU it had no dedicated toggle — just a small warning chip, while a no-dorms commuter college (Phoenix College) sat #3 on the Dashboard.

- **Mechanism:** flat deduction after the weighted total in `calculateFitScore()` — **−6** if `facilityDetails.housing.available === false`, **−3** if `"limited"` (unguaranteed/waitlisted), 0 if `true`. The four weights are untouched; 95 of 110 schools' scores are unchanged.
- **15 schools re-scored** (13 JUCOs + CSUF + Cal State LA): Phoenix College 71→65, Santa Monica 70→64, Miami Dade 69→63, Daytona State 72→69, Pima 67→61, Glendale 64→58, Mohave 61→58, Angelina 57→54, Nassau 57→51, Johnson County 51→45, Ulster 49→43, Westchester 48→42, Suffolk 42→36, CSUF 54→51, Cal State LA 66→63. lensScores.overall + lensScores.value re-stored for all 15 (value formula verified to reproduce every stored value before rewriting).
- **Enforcement for future sessions (3 layers):** (1) validate_consistency.js now REQUIRES `facilityDetails.housing` on every full profile (new HOUSING check, enum-validated) and mirrors the penalty in its fit-drift check — a school stored without the penalty won't reconcile; (2) §7 Phase 1H gained a required housing research checkbox and 1J the penalty step; new §3a Change Type 12 (housing changed = score cascade); §5 weights table + field gotchas updated (the old "zero Fit Score impact" note is obsolete); (3) session memory updated.
- **Prose sweep (v37.2 lesson):** Glossary Fit Score card, card score-strip data-tip, and the Best Overall lens description all now mention the penalty.
- **Browser-verified (full regression):** all 15 new scores render on cards + modals; Dashboard Top 8 reshuffled — Phoenix College and Santa Monica dropped out, GCU/FIU/Barry in, Daytona (−3) holds #7; ATAR slider still does not move the Fit Score; controls unchanged (Tyler 64, USF 72, Barton 49); Glossary renders the new text; zero console errors. validate_consistency.js held at the 1-issue baseline.
- guideVersion v40.11 → v41.0.

---

### v40.1 – v40.11 (July 2026) — v39 aftermath cleanup: Minutes Outlook undefined fixes, MO-KEYS validator check, docs reconciliation, map dots, Northeast CC pipeline, Keiser location, and the full 17-school social/contact verification pass

Found during the v40 session's browser verification pass over the v39 work (the pass v39.7 had skipped — a concurrent session held the preview slot then). The v39 work itself verified clean; the new find was **pre-existing**:

- **v40.1 (commit `80dc75a`) — 9 schools showed the literal text "undefined" in their Minutes Outlook stat boxes, live since v28.1/V16.** 7 schools (Cal Poly, UC Davis, William & Mary, Hofstra, Drexel, Delaware, Elon) used the key `mf_total_2026` where the renderer and §5 schema read `mf_total_2025` — introduced by the v28.1 scrape; key renamed in place, values untouched. Notre Dame and Georgetown are missing `rising_senior_2027_count` entirely (v21-era research, honest gap — never guessed): renderers now guard with '—' instead of printing "undefined", and the modal summary says "An unconfirmed number of seniors" instead of falsely claiming "0 seniors". Actual counts deferred to a Sept–Nov roster re-scrape (§15 off-season rule; see §6 deferred items). No score cascade — scores.js never reads these fields. Browser-verified: Minutes tab stat boxes, both modals, zero "undefined" page-wide, fit scores unchanged.
- **v40.2 (commit `c83ba68`) — MO-KEYS check added to `validate_consistency.js`.** Both the v39.7 bug (trajectory `yr` vs `year`, 19 schools) and v40.1 were schema-adjacent key names that every existing check accepted. The validator now audits every minutesOutlook object's keys exactly: unknown keys, missing required keys, and exact trajectory keys (`year`/`yr_label`/`pct`/`label`), with the ND/Georgetown gap explicitly whitelisted (`MO_MISSING_OK` — remove once researched). Tested by injecting a `yr` key: flagged twice; clean data holds the 1-issue baseline.

- **v40.3 (commit `a1f51cd`) — docs reconciled with git reality** (closes gap #6 in v39_session_failures_summary.md): retroactive v39.6/v39.7 CHANGELOG entries, stale "NOT YET COMMITTED" labels corrected, CLAUDE.md §1/§6 version claims fixed, new deferred item for the ND/Georgetown gap.
- **v40.4 — the last 2 off-map Dashboard dots fixed**: `ucirvine` (100,208 → 103,213) and `vermont` (548,92 → 544,112), the two pre-existing bugs found-but-deferred during v39.6. Both re-placed via `isPointInFill()` against the live SVG, geographically sensible vs neighbors (Irvine between Fullerton and La Jolla; Burlington north of Yale). Browser-verified: **all 110 dots on the drawn landmass, zero off-land — first time the map has been fully clean.** Deferred item removed from §6.

- **v40.5 — Northeast CC moved to its rightful Elite JUCO position in `data/pipeline.json`** (deferred since v38.9, when its 2024 NJCAA DII National Championship — first in program history — was found missing and `jucoTier` was upgraded Standard→Elite, but pipeline.json was never touched). Three fixes: its individual `ncaaD2[]` row upgraded from generic "Transfer pathway" to Elite JUCO badge + "2024 NJCAA DII champion" chip-green (and moved up beside the other champion programs); added to the Elite JUCO combined `mlsDraft` row; removed from the non-Elite "Santa Monica / Miami Dade / ..." row. Browser-verified on the Pro Pipeline tab, zero console errors. Deferred item removed from §6.

- **v40.6 — Keiser University location corrected Fort Lauderdale → West Palm Beach** (deferred since v38.11, when housing research found the athletics campus — Seahawks, Vecellio Field, residential Flagship Campus — is in West Palm Beach, not Fort Lauderdale as 12 field occurrences claimed). All 12 corrected across `loc`, `culture` (vibe/thingsToDo/socialScene/olivierMatch/lifestyleTags), `facilityDetails` (stadium/trainingFields/extras), `coach.profile`, `rec`, and the housing note's discrepancy flag (now resolved). Lifestyle references and distances (Fort Lauderdale 45 min, Miami 90 min, Palm Beach Island beaches) kept consistent with PBA's already-verified West Palm Beach profile. `mapX`/`mapY` (475,299) → (478,303) via `isPointInFill()`, just inland of PBA (481,304) matching the Flagship Campus's Military Trail position — all 110 dots still on-land. `warm`/`city` booleans unchanged (West Palm Beach is equally warm and a real city, same as PBA) → **zero score cascade**, fitOlivier stays 51. Two intentional "Fort Lauderdale" mentions remain as nearby-destination distances, mirroring PBA's framing.

- **v40.7 — Region 1 (AZ) social media + coach contact verification, batch 1 of the v39 research-debt pass** (Chrome MCP per §15, the tool v39 skipped). Social accounts harvested from each official athletics site and the IG/X accounts navigated + confirmed active per §7 Phase 1I: Phoenix College (IG/X/FB/YT — dept accounts), Pima CC (IG/X/FB/YT — dept accounts), Mohave CC (college-wide accounts, linked from the athletics site's own footer — no athletics-specific accounts exist), Glendale CC (X only — no IG/FB/YT found anywhere on the site). Coach contacts Tier-1 confirmed from official coaches pages and synced across both files (two-file rule): Phoenix David Cameron (david.cameron@phoenixcollege.edu / 602-285-7665), Pima David Cosgrove (dcosgrove@pima.edu / 520-370-3717), Glendale Jeff Perry (jeff.perry@gccaz.edu / 623-845-3782). Mohave's coaches page publishes names only — email/phone honestly stay `null`. One self-inflicted bug caught and fixed before commit: the first scripted edit wrote the head-coach email into a staff[] member's null email field (staff nulls precede contact{} in coaches.json) — repaired, verified staff arrays clean + both files in exact sync. 13 schools (Regions 6/11/14/15) remain for future batches.

- **v40.8 — Region 6 (KS) social media + coach contact verification, batch 2.** Dodge City CC: dept IG/FB (`GoConqs` — no soccer-specific accounts, footer lists per-sport handles for other sports only) + coach Juan Espinal Tier-1 confirmed (jespinal@dc3.edu / 620-227-9299, official staff directory). Neosho County CC: **program-specific** X `@GoNeoshoMSOC` + FB `neoshomsoccer`, both navigated and confirmed active. Johnson County CC: dept X/FB/YT (`JCCCAthletics` — no Instagram exists anywhere on the site); coach contact already confirmed in v39. **Major find: Neosho's official staff directory lists Sam Hall as Head Men's Soccer Coach, not the stored Elliot Chadderton (v39 research)** — a real coaching change requiring full Change Type 2 treatment (new bio/score research + full re-rank), deliberately not half-fixed in a contact pass; flagged as a high-priority deferred item in §6.

- **v40.9 — Region 11 (IA) social media + coach contact verification, batch 3.** Southeastern CC: program-specific X `@SCCIowa_Soccer` (confirmed active) + dept FB `southeastern.blackhawks`; coaches page publishes names only (Henrique Vieira confirmed still head coach) — contact stays `null`. Iowa Lakes CC: **program-specific IG `@iowalakessoccer` ("Iowa Lakes Men's Soccer", confirmed active)** + men's-soccer FB page + dept X/YT; coach Ben MacRae Tier-1 confirmed (bmacrae@iowalakes.edu / 712-580-8609, official coaches page), synced across both files.

- **v40.10 — Region 14 (TX/LA) social media + coach contact verification, batch 4.** Blinn: dept FB `BuccaneerSports` only; coach Michael McBride confirmed (michael.mcBride@blinn.edu / 979-830-4922, official staff directory). Coastal Bend: college FB only (site sat behind a Cloudflare challenge that eventually cleared in the real browser — same behavior v39.5 documented); coach Justin Rodriguez confirmed (jrrodriguez7@coastalbend.edu / 361-354-2744). Angelina: **program-specific IG `@angelinamsoc` + X `@AngelinaMSOC`**, both confirmed active; coaches page publishes names only (Martin Melchor confirmed still head coach) — contact stays `null`. LSU Eunice: **program-specific X `@LSUEBengalsMSOC` + FB `LSUEMensSoccer`** + dept IG `lsuebengals`; coach John Plumbar confirmed (jplumbar@lsue.edu / 337-457-6138 — the official directory itself lists LSUEBengalsMSOC as the program's X, double-confirming the handle). All coach contacts synced across both files, staff arrays clean.

- **v40.11 — Region 15 (NY) social media + coach contact verification, batch 5 of 5 — pass COMPLETE for all 17 v39 schools.** Nassau: dept IG/X `lionsncc` (IG confirmed active) + FB; coach Dan Fisher confirmed (Daniel.Fisher@ncc.edu / 516-572-7522). Ulster: **official site links a dead Instagram ("Profile isn't available") — left `null`, proof the Phase 1I navigation check matters**; X `@UlsterSenators` confirmed active + FB/YT; coach Jamal Lis-Simmons confirmed (lissimmj@sunyulster.edu / 845-687-5013). Suffolk: dept IG `sunysflkathletics` (confirmed active) + X; coaches page names-only (Keith Ginsberg confirmed still head coach) — contact stays `null`. Westchester: dept FB only; coach Alfio Carrabotta confirmed (alfio.carrabotta@gmail.com — as published on the official directory / 914-606-7895). All contacts synced across both files, staff arrays clean.

Full v40 session kickoff detail: the v39 verification pass confirmed all 358 trajectory chips render real years, 110 map dots with only the 2 known deferred off-land (ucirvine, vermont — fixed in v40.4 above), coach ranks 1–110 sequential, all 24 conference cards, Phoenix College modal all 9 tabs, zero console errors.

- guideVersion bumped v39.6 → v40.11 across the session.

---

### v39.6 – v39.7 (July 2026) — RETROACTIVE ENTRIES (shipped but never logged here — gap #6 in v39_session_failures_summary.md)

These two entries are written after the fact by the v40 session. The v39.1–v39.5 entries below were drafted before commit and never revised, so their "NOT YET COMMITTED" labels went stale — corrected inline below.

- **v39.6 (part of commit `c456259`, which squashed v39.1–v39.6):** two fixes that existed only in the commit message until now. (1) **Map coordinates for 7 schools placed off the drawn landmass** — the lat/lon linear formula doesn't match the hand-drawn SVG Dashboard map; 6 of the 17 new JUCO schools plus pre-existing Arizona Western (wrong since v35) were re-placed using `isPointInFill()` against the real SVG paths. 2 more pre-existing off-map schools (ucirvine, vermont) were found and correctly deferred (still open — §6 deferred items). (2) **Phoenix College's `facilityDetails.rating` was inflated to "Excellent"** based on the team's national championship rather than facility substance; corrected to "Good" per the §4 rating scale.
- **v39.7 (commits `09c2ab7` + `69cfc55`):** fixed every JUCO school's Minutes Outlook showing `undefined · Yr 1` — 19 schools' trajectory objects in `data/juco.json` used the key `"yr"` instead of `"year"` (4 from the v35 batch, 15 of the 17 v39 adds). The original bug report blamed the render code; investigation showed the code was correct and matched 101 other schools — changing the code would have broken those 101. Renamed the 38 bad keys via a regex scoped to objects followed by `"yr_label"`, leaving `confRecord`'s 151 legitimate `"yr"` fields untouched. Pure display fix, no score cascade (`calcMinutesScore()` only reads `t.pct`). Live browser verification was not possible that session (preview slot held by a concurrent session) — a Node simulation was substituted; the v40 session later live-verified all 358 trajectory chips render real years. `69cfc55` added `v39_session_failures_summary.md`, the incident log for the whole v39 arc.

---

### v39.5 (July 2026) — Standings/roster remediation for the 17 v39.1-v39.4 JUCO adds (committed in `c456259` — label corrected by v40, see v39.6 entry above)

Direct follow-up to v39.1-v39.4's own remediation entry. Owner asked a second direct question after reviewing the first fix: "and all standings/titles/roster research minutes outlook completed?" Answer was no — checked the actual data rather than re-asserting completeness:

- **confRecord depth:** only 2025 had been genuinely researched for 13 of 17 schools; 2021-2024 were honest `"Not re-verified this session"` placeholders, not the 5-6 years of real Tier-1 standings §7 Phase 1E requires. This is not a documentation gap — Phase 1E is explicit ("Never use placeholder text... actual position and record are required") — it's an execution gap.
- **Root cause, once traced:** roster/standings research this session had used `WebSearch`/`WebFetch` throughout instead of the Claude for Chrome MCP tool §15's Research Intelligence table names specifically for "Roster scraping" and "Conference standings" (with WebSearch/aggregators explicitly listed in the "Avoid" column for both). Loaded the tool and redid the research properly.

**Standings fixed:** navigated to each region's own conference standings archive (accac.org, kjccc.org, iccac.org, njcaaregion14.com, region15athletics.com) for 2021-22 through 2024-25 and pulled real conference + overall records for all 17 schools, one page per region per year (5 conferences × 4 years = 20 page visits, each covering every school in that conference for that season in one shot). All 17 now have real data for every year their program was a recognized conference member — some years are honestly "not a conference member yet" (Mohave CC's ACCAC record starts 2024; LSU Eunice's Region 14 record starts 2024-25; Iowa Lakes' and Ulster's ICCAC/Region 15 records don't go back to 2021-22) rather than guessed. One data quirk flagged rather than silently resolved: Iowa Lakes' 2023-24 and 2024-25 ICCAC standings pages show byte-for-byte identical records (6-1-1, 16-3-3) — noted inline as a possible conference-site templating artifact rather than presented as two independently-confirmed seasons.

**Rosters fixed:** re-attempted the 4 schools whose minutesOutlook was `available: false`. Southeastern CC's roster page had rendered empty via WebFetch — Claude for Chrome MCP got the full 17-midfielder roster on the first try (real browser render vs. WebFetch's static-HTML fetch). Coastal Bend CC's roster was behind a Cloudflare bot-check that WebFetch received as a 403 — Chrome MCP passed the challenge automatically and got the full 8-central-midfielder roster. Both now have real `minutesOutlook` data, and their `fitOlivier`/`lensScores.minutes` recalculated accordingly (Southeastern 43→44, Coastal Bend 53→60 — the minutesOutlook default-0.5 penalty for `available:false` was costing Coastal Bend more than expected). Suffolk CC and Westchester CC were also re-checked via Chrome MCP and confirmed genuinely missing position data even in a real browser — not a tooling artifact, correctly left `available: false`.

`node validate_consistency.js` held at the 1 known baseline issue throughout. Live-verified in browser: both fit scores match hand-calculated values exactly, Minutes tab renders real roster data for the 2 newly-fixed schools, Standings tab shows real years with no placeholder text remaining.

- guideVersion bumped v39.4 → v39.5.
- ~~Still not committed~~ **Committed as part of `c456259`** (v39.1–v39.6 squashed) — this label was stale from before the commit; corrected by the v40 session.

---

### v39.1 – v39.4 (July 2026) — JUCO region sub-sections + 17 new JUCO schools (committed in `c456259` — label corrected by v40)

Two-part request: (1) group the Explore tab's JUCO section by NJCAA region instead of one flat grid, (2) build out "top 5 JUCOs per region" for the 6 NJCAA regions already represented in the guide, which required identifying and adding 17 new schools (93 → 110 total schools).

**Part 1 (v39.1, UI only):** `js/app.js` `renderCards()` now groups the JUCO section by `njcaaRegion`, with a `CCCAA` bucket for Santa Monica (not NJCAA-affiliated). Sub-headers hide/show correctly under search and filters (`applyFilters()`/`clearAllFilters()` updated to toggle `.region-subhead` alongside `.conf-section`). New CSS in `index.html` for `.region-subhead`/`.region-grid`.

**Part 2 (v39.1-v39.4, data):** Shortlist built from live NJCAA.org rankings + each region's own conference site (Tier-1 throughout). Region 8 (Florida) confirmed capped at its existing 3 schools — verified via thefcsaasports.com that only 3 of 28 FCSAA member colleges field a men's soccer team at all, no DII bracket exists. 17 schools added across the other 5 regions:
- **Region 1 (AZ):** Phoenix College (2025 NJCAA DII National Champions, #1 nationally 7 straight weeks — most decorated current JUCO in the guide), Pima CC, Mohave CC, Glendale CC
- **Region 6 (KS):** Dodge City CC, Neosho County CC, Johnson County CC (2025 Region 6/9 tournament champions)
- **Region 11 (IA):** Southeastern CC, Iowa Lakes CC (first-ever ICCAC regular season title, 2025)
- **Region 14 (TX/LA):** Blinn College, Coastal Bend College, Angelina College, LSU Eunice
- **Region 15 (NY):** Nassau CC, Ulster County CC, Suffolk CC (2025 Region 15 Champions), Westchester CC

Full profiles built per §7 Phase 1's field list (coach, roster-derived minutesOutlook, tuition, degree/ACU alignment, facilities, housing, culture, financial model). Where Tier-1 data genuinely wasn't obtainable, fields were left `null`/`available:false` with a documented reason rather than guessed — see §6 deferred items for the specific gaps (4 schools with no roster data, 16 of 17 coaches with no confirmed email/phone, all 17 with unverified social media) — the roster/standings sub-gaps here were themselves further remediated in v39.5 immediately above.

**Process gap, caught mid-session and partially remediated:** the §7 Universal Change Workflow was not followed as a structured process during the batch-building work — no explicit Phase 0/Phase 2 written sign-off before starting, and Phase 3's file checklist was executed from memory/pattern-matching rather than checked off item-by-item. Two real files were skipped entirely on the first pass: `data/conf-prestige.json` and `data/pipeline.json` (Phase 3B/3F) — both required updates for a New School Added change type and neither was touched until the owner asked a direct compliance question. `conferences.json`'s `desc`/`olivierNote` prose was also left stale (still said "12 guide schools" after 17 were added). All three were corrected retroactively before commit, along with a fuller Phase 5 browser-test pass (map dots, Coach Rankings badges, Financial Model selector, Compare tab, all 5 lens pills, ATAR-slider-shouldn't-change-fit-score regression check) that had only been partially run the first time. `validate_schools.py` could not run (no Python interpreter in this environment, same constraint as v38); manual node-script equivalents were substituted for the acuAlign/covered-count and fin-component-sum checks specifically, but this is not a full substitute for what that script validates (e.g. `facilityDetails.rating` enum, empty-trajectory-when-available:true). `node validate_consistency.js` held at the 1 known baseline issue (Stony Brook coach name) throughout — zero regressions from any of the new schools.

Also discovered in passing (pre-existing, not caused by this session, not fixed — see §6 deferred items): `data/pipeline.json`'s combined JUCO row still lists Northeast CC under the non-Elite group even though `jucoTier` was upgraded Standard→Elite back in v38.9; and §7 Phase 5's "score breakdown tooltip" checklist item describes a feature that doesn't exist anywhere in the current build (checked both a new school and pre-existing Barton CC).

- guideVersion bumped v38.12 → v39.4 in athletes/olivier.json across the session.
- ~~Not committed or pushed as of this entry~~ **Committed as part of `c456259`** (v39.1–v39.6 squashed, pushed to main) — this label was stale from before the commit; corrected by the v40 session.

---

### v38.2 – v38.12 (July 2026) — Housing research for all 81 non-JUCO schools + 2 more Standings/Titles gap sweeps
Direct continuation of the v38.1 accuracy work. Two threads:

**Housing (the originally-deferred v37.7 item, now closed):** `facilityDetails.housing` researched and populated for all 81 non-JUCO schools, batched by conference file and committed/pushed after each (AAC, ACC, Big Ten, Big East, Big West, CAA, d1-other, d2/NAIA/D3, Ivy — 9 commits, v38.2 through v38.8 plus v38.11/v38.12). All Tier-1 verified via each school's official housing/residence-life page. Outcome matches the expected low-yield: nearly every school has real on-campus housing, most with a mandatory first-year or multi-year live-on policy. Two genuine `"limited"` flags found (real housing exists but nothing is guaranteed for a late-committing international recruit): **CSU Fullerton** (no live-on requirement, no guarantee, first-come-first-served) and **Cal State LA** (same pattern, explicitly commuter-heavy campus). One data-integrity discovery made in passing: **Keiser University's** actual athletics campus (Seahawks, Vecellio Field) is in West Palm Beach, not Fort Lauderdale as this profile's `loc`, `culture`, `facilityDetails`, `coach.profile`, and `rec` fields all say — 12 occurrences of the wrong city. Housing itself was verified at the correct (Flagship/West Palm Beach) campus and flagged inline; the full location correction (loc/region/mapX/mapY/text fields) was deliberately left as a separate follow-up rather than folded into a housing-field commit — added to §6 deferred items below.

**Standings/Titles, round 2 (v38.9, v38.10):** the owner asked why Iowa Western and Northeast CC still looked unresearched after v38.1 — turned out the original scan only caught schools explicitly self-flagged "not researched this session," missing schools where `confRecord` just repeated an identical generic label every year with no real detail. A follow-up scan for that exact signature (zero position variation across 3+ years) found 7 candidates across all 93 schools; 2 were false positives (Hofstra "CAA Champs" ×6 and Denver "Summit Champs" ×5 are both genuine, well-documented dynasties). The other 5 were real, and two turned out to be major finds:
- **Northeast CC**: 2024 NJCAA DII National Champions (first title in program history) — completely absent from the data, which also had `jucoTier` wrongly set to "Standard" with a note claiming no national result existed.
- **Iowa Western**: two undefeated-or-near-it ICCAC DI regular season titles (23-0-2 in 2024, 20-1-1 in 2021) — plus a wrong conference label ("Mon-Dak," an unrelated Montana/North Dakota conference) corrected to ICCAC/Region 11.
- **Cal State LA**: actual 2021 NCAA Division II National Champions (beat Charleston WV 1-0) — was labeled "Mid CCAA" for all 5 years.
- **University of Charleston (WV)**: 2024 NCAA D2 national runner-up (lost to Lynn 3-2) plus MEC double champions that year, and one of the most decorated D2 programs nationally overall (6 title-game appearances since 2014, 1 win) — was labeled "Mid MEC" for all 5 years.
- Temple, Georgian Court, and Columbia College (MO) got smaller real fixes (an AAC tournament berth and worst-ever season, a CACC runner-up finish, and an entire missing 2025 conference championship, respectively).

Where exact older-year records (2021–2023) couldn't be re-verified at Tier-1 within session budget, entries were marked "not re-verified v38 — retained from prior session" rather than guessed.

**Total for this session (v38.1–v38.12):** 12 commits, all pushed and verified locally in the browser before each push (modal Standings & Titles tabs and housing display checked, zero console errors throughout). `node validate_consistency.js` held at the 1 known baseline issue (Stony Brook coach name) across every single commit — no regressions introduced. `validate_schools.py` could not run all session (no Python interpreter in either shell on this machine) — none of the session's edits touch fields that script checks.

- guideVersion bumped to v38.12 in athletes/olivier.json.

---

### v38.1 (July 2026) — Standings & Titles accuracy pass, batch 1 of N
Owner asked for a full review of every school's Standings/Titles data (informational, no Fit Score cascade) since some schools were flagged as under-researched — starting with the 6 AAC schools that had empty `titles[]` and the 5 JUCO schools whose `confRecord[]` had self-flagged "not researched this session" placeholders from earlier sessions. Housing research for the 81 non-JUCO schools is the next batch (separate item, tracked in §6 deferred list).

- **AAC titles[] populated for 6 schools** (Tulsa, Memphis, Temple, UAB, Navy, Army) — all were empty, unclear whether that meant "genuinely no titles" or "never researched." Verified via NCAA.com (Tier 1, official governing body) and the AAC's own official site (theamerican.org, Tier 1) where obtainable; Wikipedia used only where the official athletics site was JS-rendered and not fetchable this session (Tulsa, UAB), cross-checked against NCAA.com and, for Temple, an official Temple Athletics Media Guide citation — flagged inline as "pending direct Tier-1 confirmation" where a live official page could not be reached.
- **Real data-accuracy bug found and fixed:** Memphis's 2024 `confRecord` entry was miscoded as `"Lower AAC" / "AAC conference play"` — official AAC site (theamerican.org) confirms Memphis actually won the outright 2024 AAC regular season championship as the No. 1 overall seed. Corrected the entry rather than just adding it to titles[].
- **Mojibake fix:** Monroe College's titles[] had a double-encoded emoji (`ðŸ‡¦ðŸ‡º` instead of 🇦🇺) — same class of bug as the v28.2 encoding sweep, missed because it was added after that sweep ran. Fixed; swept the rest of `data/*.json` for the same pattern, found no other instances.
- **JUCO confRecord gaps filled for 5 schools** (Barton CC, Cowley County CC, Arizona Western, EFSC, Daytona State) — all had years explicitly marked "exact standings not researched this session" from the v35 add-school session. Verified year-by-year against official conference sites (kjccc.org for KJCCC, accac.org for ACCAC, thefcsaasports.com for NJCAA Region 8/FCSAA) — all four are server-rendered and fetchable directly, unlike some of the AAC schools' JS-heavy Sidearm sites.
- **Genuine unresolved discrepancy flagged, not silently resolved:** Eastern Florida State's existing data claims a 2021 Region 8 Championship win 2-0 over Daytona State, but the official 2021 regular-season Region 8 standings (thefcsaasports.com) show Daytona State finishing 1st (2-0 conference) and EFSC last (0-2) that year — i.e., EFSC lost both regular-season meetings. Per the project's own conflict-resolution rule (§15), noted the discrepancy in both schools' `confRecord[2021].note` rather than guessing which is right; needs direct verification (likely from an EFSC/Daytona State postseason box score) before the next pass touches either school.
- **Cowley CC's "5× KJCCC Champions" title updated** from "per official program Instagram bio" sourcing to explicitly note that 2 of the 5 (2021, 2024) are now confirmed via official kjccc.org standings, with the remaining 3 still pending direct confirmation.
- **Arizona Western's title count corrected**: was listed as "3× NJCAA Region I Champions" but the 2024 season (verified this session) was their 4th consecutive Region I title, meaning 2021–2024 were all Region I champions — updated to "4× consecutive."

**Scope discipline:** did not re-verify the ~65 schools whose titles/confRecord were already populated (owner's call — full re-verification of all 93 is a separate, larger future pass if wanted). `node validate_consistency.js` still reports exactly 1 issue (Stony Brook coach name, unchanged baseline) — confirms no regressions from this batch. `validate_schools.py` could not be run this session (no Python interpreter available in either shell) — none of this batch's changes touch fields that script checks (ids, acuAlign, lens/dev keys, rankClass, coach ranks, facilityDetails, trajectory), only `titles[]`/`confRecord[]` string content, so this is a documented gap, not a skipped gate.

- guideVersion bumped to v38.1 in athletes/olivier.json.

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

