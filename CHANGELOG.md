# CHANGELOG — Olivier Scholarship Guide

Version history moved out of CLAUDE.md in v35.2 (July 2026) to reduce per-session context cost — CLAUDE.md is read at the start of every session; this file is read only when history is needed.

**Phase 8 (End of Session Protocol) appends new version entries here — add them at the TOP of the history below.** Entries under the divider are preserved in their original CLAUDE.md order (roughly chronological with some grouping).

---

### v44.27 (July 2026) — Coach data architecture consolidation: coaches.json is now the SOLE source (Change Type 2, structural)

Prompted by the user noticing the Details modal's "Coach & Contact" tab and the Coaches & Staff ranking card showed different profile text for the same coach (Pittsburgh's Jay Vidovich) — confirmed as genuine duplication, not a display bug: the school's own conf JSON `coach{}` sub-object (name/title/email/phone/profile) and `coaches.json` (rank/overallScore/bio/strengths/staff/contact/etc.) had always been two independently hand-maintained copies of overlapping facts, kept in sync only by the "two-file rule" and a `COACH-SYNC` validator check.

**Removed the duplication entirely rather than patching it.** `coach{}` is now removed from all 110 school objects across the 10 conference files — `coaches.json` is the sole source, looked up live by `schoolId` via a new `getCoach(schoolId)` helper (js/app.js).

**Migration, in order:**
1. **Dry-run diff first.** Compared `school.coach.{email,phone}` against `coaches.json`'s `contact.{email,phone}` for all 110 schools before touching anything. Found 21 real mismatches: 11 one-sided (one side blank — safe, no judgment call) and 10 genuine conflicts (both sides had a different real value — wakeforest, ucla, indiana, ucsb, charleston, mercyhurst, princeton, ocu, georgian_court, columbia_college). Per this project's "never guess coach contact info" rule, the 10 conflicts were left as `coaches.json`'s existing value (not verified, just not overwritten) and logged in CLAUDE.md §6 for future Tier-1 re-verification rather than resolved by guessing.
2. **Two owner-verified live corrections applied on top:** Drexel's `coaches.json` contact.email was blank — set to `dc3369@drexel.edu` (David Castellanos, confirmed via the athletics site). Elon's was entirely missing — added title "Head Men's Soccer Coach", email `mreeves3@elon.edu`, phone `336-278-6746` (Marc Reeves, confirmed via the athletics site). Memphis was checked and confirmed to genuinely have no published coach email — left null, not backfilled from the school JSON's generic `soccer@memphis.edu` placeholder (which, on inspection, is exactly the kind of unverified default this consolidation exists to eliminate).
3. **Added `title` to `coaches.json`'s schema** (it never existed there) — migrated verbatim from each school's `coach.title` for all 110 entries before the school-object field was deleted, so no information was lost (59/110 schools had a distinctive title beyond generic "Head Coach", e.g. "Head Coach — 2nd tenure (starts 2026)").
4. **Removed `coach{}` from all 110 school objects** (scripted, not manual) across acc/big-ten/big-east/aac/big-west/caa/d1-other/juco/ivy/d2.json. Diffed clean — only the `coach` blocks disappeared, nothing else reformatted.
5. **Updated every render call site** (found via full-repo grep, not assumed): the Details modal's Coach & Contact tab (js/app.js ~1500-1511, now also shows a "Rank #N" badge next to the coach's name — the feature that started this investigation), the Explore card footer ("Coach: [name]"), the Compare tab's "Head Coach" row, and the Dashboard shortlist panel's Email button (`js/dashboard.js`) — all now call `getCoach(u.id)`. Deleted `renderContacts()` (js/app.js), a dead function with no caller and no matching container in index.html — found during the grep, not migrated since nothing used it.
6. **Validators updated to match:** `validate_schools.py` — removed `coach` from `FULL_REQUIRED_FIELDS`, removed the old school-object contact-null check, added a new error if a school object still has a stray `coach` key (one-way-door enforcement) and a new warning in `validate_coaches()` for missing `title` or null contact. `validate_consistency.js` — replaced the `COACH-SYNC` check (which compared the two now-nonexistent sources) with a check that flags a resurrected school-object `coach` key instead.
7. **Corrected a stale documentation claim caught during the grep:** CLAUDE.md's Change Type 2 impact map claimed the Dashboard shortlist panel "shows updated coach name" — it doesn't; it only uses the coach's *email* for the mailto link. Fixed in the same pass.

Verified live via local preview (Phase 5, full scope — this touches every school): modal Coach & Contact tab renders name + rank badge + bio (confirmed against Pittsburgh/Vidovich, matching the ranking card content now), Explore card coach name, Compare tab row, Coaches & Staff tab (111 rank badges = 110 cards + 1 modal instance still in DOM, expected), Dashboard shortlist email button, Elon/Drexel corrections all confirmed live via `getCoach()`. Zero console errors on fresh reload. `python validate_schools.py` PASS (110 schools, 17 warnings — down from 18, same category of pre-existing null-contact backlog items, just re-homed to coaches.json). `node validate_consistency.js` Issues: 0. No `fitOlivier`/`lensScores` cascade — display/architecture only. `guideVersion` v44.26→v44.27.

---

### v44.26 (July 2026) — Pathways tab: new "Recruiting Pathway by School" section (Change Type 11, UX/JS)

Surfaced the `recruit_pathway` data (completed v44.16–v44.24) for the first time — until now it was populated in JSON but rendered nowhere. Added a new section to the Pathways tab, below the existing Path A–D cards and coach questions, grouping all 103 populated schools into 4 cards by `minutesOutlook.recruit_pathway` value (Freshman-friendly / Mixed / Transfer-preferred / Portal/JUCO-heavy). Each card shows a count badge and a chip per school; clicking a chip opens that school's existing detail modal (`openDetail(id)`). Hovering a chip shows its `recruit_pathway_note` as a tooltip.

**This is architecturally new for this tab** — `renderPathways()` (js/app.js) has always been pure static config from `athletes/olivier.json`'s `pathways` object and never touched the 110-school arrays; this is the first time the Pathways tab reads live school data. Implemented as a separate function (`renderRecruitPathwaySummary()`, computed from the global `unis` array) that appends into `#pathways-container` rather than modifying `renderPathways()` itself — keeps the two data sources cleanly separated.

**Future-proofing (per owner request — this needs to stay correct as schools are added/removed/re-scraped):**
- The summary is fully computed live from `unis` on every page load — no hardcoded school list or count anywhere, so it can never go stale when a school is added, removed, or its `recruit_pathway` value is edited.
- Added a new validator check in `validate_consistency.js` (`RECRUIT_PATHWAY_VALUES` enum + a check alongside the existing `recruit_risk` enum check) that flags any `recruit_pathway` value outside the 4 allowed strings — without this, a typo'd or new value would silently vanish from every bucket instead of erroring, the same failure mode the `recruit_risk` check was built to prevent (§4 field gotchas).
- Schools without `recruit_pathway` (the 7 `available:false` cases) are simply absent from all 4 buckets — no error, no "unknown" bucket needed.

New CSS: `.pathway-chip` (clickable school tag) and `.pathway-count-badge` (per-bucket count), matching the existing `.elite-juco-chip`/`.housing-warn-chip` pattern — reused the app's existing `--emerald/--amber/--sky/--rose` semantic color tokens (safest → hardest entry).

Verified live via local preview (Phase 5, targeted scope): section renders with correct counts (74 Freshman-friendly + 20 Mixed + 3 Transfer-preferred + 6 Portal/JUCO-heavy = 103), chip click opens the correct modal, tooltip shows the real research note, zero console errors, `python validate_schools.py` PASS, `node validate_consistency.js` Issues: 0. No `fitOlivier`/`lensScores` cascade (purely additive, display-only). `guideVersion` v44.25→v44.26.

---

### v44.25 (July 2026) — Somoano (UNC) bio/record factual fix (Change Type 2)

Fixed a deferred data-quality bug: `coaches.json`'s Somoano `record` field and `acc.json`'s `coach.profile` field both said "Dorrance dynasty legacy program" — a leftover conflation of UNC's women's program (Anson Dorrance, a separate team) with the men's program Somoano actually coaches. This was the same error class already fixed in `pipeline.json`'s `titles[]` in v44.14 (which wrongly credited Dorrance with 1978/1979 men's titles), but the two coach-record fields hadn't been touched.

**Fix:** both fields now correctly state UNC's real men's soccer title record — 2× NCAA D1 National Champions (2001 under Elmar Bolowich, 2011 in Somoano's very first year as HC). This is a genuine accomplishment that the old text was actively erasing by attributing all program prestige to the (unrelated) women's dynasty. Also added "2011 NCAA National Champion (1st year as HC)" to Somoano's `strengths[]` — previously missing entirely from his profile.

Two-file rule applied: `data/coaches.json` (record, bio, strengths) + `data/acc.json` (coach.profile). `overallScore` (88) and `rank` (9, rk-elite) were NOT changed — this was a factual-text correction only, already consistent with the §5d anchor ("Somoano, UNC, 88 — 2011 national title, strong pro output"), so no re-rank was required. `python validate_schools.py` PASS. `node validate_consistency.js` Issues: 0 (COACH-SYNC clean). `guideVersion` v44.24→v44.25.

---

### v44.24 (July 2026) — recruit_pathway data pass COMPLETE: JUCO final batch + campaign closeout (Change Type 3 companion field)

Final batch of the recruit_pathway backlog (see v44.16 for design context). Researched the last 4 JUCO schools that still lacked the field (23 of 29 JUCOs were already populated from earlier v35-v39.6 work):

| School | recruit_pathway | Basis |
|---|---|---|
| Santa Monica College | Mixed | Stored 2025-26 roster: 4 So + 5 Fr MFs — a fairly even split |
| Miami Dade | Mixed | Stored 2025-26 roster: 7 So + 5 Fr MFs |
| Northeast CC | Freshman-friendly | Live roster: 8 Fr + 2 So MFs (80% freshman) |
| Monroe University | Freshman-friendly | Live roster: 8 Fr + 5 So MFs (62% freshman), zero transfer-college indicators found on a 30+ player international roster |

**Note on JUCO methodology:** for JUCOs, `recruit_pathway` was scored on freshman-vs-sophomore roster balance (per the convention already established in the 23 previously-populated JUCOs), not on 4-year-transfer share — a JUCO's own incoming recruits are almost always straight from HS, so the meaningful variable is whether the coach's recruiting class skews younger (Freshman-friendly) or the roster carries more returning second-years (Mixed).

**Two Ivy League schools (Princeton, Yale) and 2 JUCOs (Suffolk CC, Westchester CC) remain permanently out of scope**: all four have `minutesOutlook.available: false` (no roster data collected), and `validate_consistency.js`'s `MO-KEYS` check only permits `recruit_pathway`/`recruit_pathway_note` on an `available: true` object — the same constraint discovered and reverted for Stony Brook in the CAA batch (v44.21). These will only become eligible once their full minutesOutlook data is researched in a future session.

**CAMPAIGN COMPLETE.** All 103 of 110 schools with `minutesOutlook.available: true` now have `recruit_pathway`/`recruit_pathway_note` populated (verified via a full-repo scan across all 10 conference/division files). The remaining 7 schools (Stony Brook, Princeton, Yale, Suffolk CC, Westchester CC, plus 2 more `available:false` cases) are structurally blocked, not skipped. Batches: AAC (v44.16) → Big East (v44.17) → ACC (v44.18) → Big Ten (v44.19) → Big West (v44.20) → CAA (v44.21) → d1-other (v44.22) → d2/NAIA/D3 (v44.23) → JUCO final (v44.24). Field remains purely informational throughout — zero `lensScores`/`fitOlivier` cascade in any batch, confirmed by `node validate_consistency.js` Issues:0 at every step.

`python validate_schools.py` PASS (110 schools, 18 pre-existing warnings unchanged). `node validate_consistency.js` Issues: 0 (unchanged). `guideVersion` v44.23→v44.24.

---

### v44.23 (July 2026) — recruit_pathway data pass, d2/NAIA/D3 batch 8/10 (Change Type 3 companion field)

Eighth batch of the recruit_pathway backlog (see v44.16 for design context). All 12 d2.json schools researched live via Chrome MCP (current roster).

| School | recruit_pathway | Basis |
|---|---|---|
| PBA | Transfer-preferred | 6/10 MFs grad/4-year transfers (no JUCO); only 4 true freshmen |
| Lynn | Mixed | ≥4/13 MFs from a prior tertiary institution (Oldenburg, Mainz, Mars Hill, Salvador) |
| Barry | Portal/JUCO-heavy | 7/13 MFs (54%) transfer, incl. 1 JUCO (Northeast CC) |
| Nova SE | Portal/JUCO-heavy | 7/12 MFs (58%) transfer, incl. 2 JUCO (Monroe College, CCBC Essex) |
| Cal State LA | Freshman-friendly | 6/7 MFs true freshmen; 1 transfer (Cal Baptist) |
| St. Edward's | Freshman-friendly | No MF (incl. grad-student internationals) shows a transfer background |
| Oklahoma City | Portal/JUCO-heavy | 6/12 MFs (50%) transfer, 4 direct JUCO |
| Keiser | Mixed | 5/17 MFs (29%) transfer, incl. 2 JUCO |
| Chapman | Freshman-friendly | All 12 MFs true freshmen — D3, no athletic scholarships |
| U of Charleston (WV) | Freshman-friendly *(lower confidence)* | Roster page publishes no HS/Previous-School data at all; classified on structural grounds (broad direct-international recruiting) — flagged for re-verification |
| Georgian Court | Freshman-friendly | ~4/25 MF-type spots transfer; large 64-player squad overwhelmingly true-freshman |
| Columbia College (MO) | Portal/JUCO-heavy | 6/13 MFs (46%) transfer, 5 of 6 direct JUCO |

**Notable finding:** the SSC Florida D2 cluster (PBA, Barry, Nova SE) and the two rebuilding NAIA programs (Oklahoma City, Columbia College) are the heaviest transfer-reliant group found across all 8 batches so far — all five landed Portal/JUCO-heavy or Transfer-preferred. This looks like a division-level pattern rather than a program-specific one: D2/NAIA programs competing for immediate results seem to lean on the transfer/JUCO pipeline more than the D1 conferences researched earlier, plausibly because grad/JUCO transfers offer proven, low-risk immediate contributors at a level where recruiting budgets are tighter. Chapman (D3, no athletic scholarships) and St. Edward's were the cleanest Freshman-friendly cases, consistent with structurally reduced transfer incentives.

Data-only, `recruit_pathway`/`recruit_pathway_note` companion field (§3a Change Type 3) — no scoring cascade (`lensScores`/`fitOlivier` untouched). `python validate_schools.py` PASS (110 schools, 18 pre-existing warnings unchanged). `node validate_consistency.js` Issues: 0 (unchanged). `guideVersion` v44.22→v44.23.

**Remaining backlog:** ivy (2 schools) and JUCO's remaining 6 schools (23 of 29 already populated).

---

### v44.22 (July 2026) — recruit_pathway data pass, d1-other batch 7/10 (Change Type 3 companion field)

Seventh batch of the recruit_pathway backlog (see v44.16 for design context). All 7 d1-other schools researched live via Chrome MCP (current roster). Note: 3 of these (GCU, Akron, Denver) already had a `recruit_pathway_note` field from earlier work, but it described coaching-transition/prestige risk, not the freshman-vs-transfer split this field is meant to capture — those notes were extended (not replaced) with the actual roster research.

| School | recruit_pathway | Basis |
|---|---|---|
| UCA | Freshman-friendly | 8/10 MFs true freshmen; 2 transfers (Robert Morris, Utah Tech) |
| GCU | Freshman-friendly | 5/6 MFs true freshmen; 1 transfer (Washington) |
| Akron | Freshman-friendly | 7/9 MFs true freshmen; 2 transfers (St. John's, Saint Louis) |
| Denver | Freshman-friendly | All 10 MFs show HS/club background only, no transfer indicators |
| Vermont | Freshman-friendly | 10/11 MFs true freshmen; 1 transfer (Providence College) |
| Mercyhurst | Freshman-friendly | ~16/20 MF-type spots true freshmen; ~4 transfers incl. 1 JUCO (Lane Community College) |
| Delaware | Freshman-friendly | 8/9 MFs true freshmen; 1 transfer (Temple) |

**Notable finding:** unlike the CAA and Big West batches (each of which turned up at least one Portal/JUCO-heavy or Mixed program), **all 7 d1-other schools came back uniformly Freshman-friendly** — including mid-major and newly-D1 programs (Mercyhurst, GCU) that might be expected to lean on the portal to compete faster. Several rosters (UCA, Mercyhurst, Vermont) are unusually international but still built on true-freshman recruiting rather than transfers. This is a useful counter-example to the pattern seen in Hofstra/CSU Fullerton — transfer-heavy building is a program-specific choice, not a function of being a smaller or newer D1 program.

Data-only, `recruit_pathway`/`recruit_pathway_note` companion field (§3a Change Type 3) — no scoring cascade (`lensScores`/`fitOlivier` untouched). `python validate_schools.py` PASS (110 schools, 18 pre-existing warnings unchanged). `node validate_consistency.js` Issues: 0 (unchanged). `guideVersion` v44.21→v44.22.

**Remaining backlog:** d2, ivy, and JUCO's remaining 6 schools (23 of 29 already populated).

---

### v44.21 (July 2026) — recruit_pathway data pass, CAA batch 6/10 (Change Type 3 companion field)

Sixth batch of the recruit_pathway backlog (see v44.16 for design context). All 8 CAA schools researched live via Chrome MCP (current roster):

| School | recruit_pathway | Basis |
|---|---|---|
| Charleston | Freshman-friendly | 8/10 MFs true freshmen; 2 transfers (1 JUCO — North Idaho College) |
| William & Mary | Freshman-friendly | 11/12 MFs true freshmen; 1 transfer (VCU) |
| Hofstra | **Portal/JUCO-heavy** | Only 5/12 MFs (42%) true freshmen; 7 transfers incl. 2 direct JUCO (Tyler JC) + 5 from 4-year programs, several grad/MBA transfers |
| Northeastern | Freshman-friendly | All MFs show HS/club-academy background only, no transfer indicators |
| Drexel | Freshman-friendly | All 15 MFs (heavily international) show HS-only background, no transfers |
| Elon | Freshman-friendly | All 17 MF/D-MF/F-MF show HS/club background only, no transfers |
| Monmouth | Freshman-friendly | All 8 MFs show HS-only background, no transfers |
| Stony Brook | *(informational only — see note)* | All 10 MFs show HS-only background, no transfers — but `minutesOutlook.available` is still `false` (site data incomplete pending full off-season scrape), so `recruit_pathway` could not be added without violating the schema (only valid alongside `available:true`); deferred with the rest of Stony Brook's minutesOutlook data |

**Notable finding:** Hofstra is the CAA's dominant program (4 consecutive tournament titles) and also its clearest transfer-heavy case — only 42% of its midfield roster is true freshmen, the rest built via grad-transfer and portal recruiting (including two JUCO transfers from the same feeder school, Tyler Junior College). This is a second confirmation, after CSU Fullerton (v44.20), that a program's competitive dominance can be built substantially on transfer recruiting rather than true-freshman development — worth remembering when evaluating "prestige" programs generally. The other 7 CAA schools were uniformly Freshman-friendly, several with heavily international rosters (Drexel, Elon) built entirely off HS/club recruiting with zero visible transfers.

Data-only, `recruit_pathway`/`recruit_pathway_note` companion field (§3a Change Type 3) — no scoring cascade (`lensScores`/`fitOlivier` untouched). `python validate_schools.py` PASS (110 schools, 18 pre-existing warnings unchanged). `node validate_consistency.js` Issues: 0 (unchanged) — note the validator's `MO-KEYS` check rejects `recruit_pathway` on an `available:false` minutesOutlook object, which is why Stony Brook was left out. `guideVersion` v44.20→v44.21.

**Remaining backlog:** ~4 more conference files — d1-other (partial — 3 of 7 schools already populated v35-v39.6), d2, ivy, and JUCO's remaining 6 schools (23 of 29 already populated).

---

### v44.20 (July 2026) — recruit_pathway data pass, Big West batch 5/10 (Change Type 3 companion field)

Fifth batch of the recruit_pathway backlog (see v44.16 for design context). All 7 Big West schools researched live via Chrome MCP (current roster):

| School | recruit_pathway | Basis |
|---|---|---|
| UCSB | Freshman-friendly | 9/11 MFs (82%) true freshmen; 2 JUCO transfers (Tyler JC, Barton CC) |
| Cal Poly | Freshman-friendly | 5/6 MF/D-MF true freshmen (incl. 2 straight from MLS academy sides); 1 grad transfer (Columbia) |
| UC Davis | Freshman-friendly | 8/9 MF/D-MF true freshmen; 1 transfer (Gonzaga) |
| UC Irvine | Freshman-friendly | 6/7 MFs true freshmen; 1 JUCO transfer (Herkimer College) |
| UC Riverside | Mixed | 5/7 CMs true freshmen, 2 transfers (UNLV, Cerritos College JUCO) — ~29% transfer |
| UC San Diego | Mixed | 7/12 MFs true freshmen, 5 4-year transfers (UNC Wilmington, Duke, Saint Mary's, Santa Clara, Loyola Chicago) — 42% transfer, no JUCO |
| CS Fullerton | **Portal/JUCO-heavy** | Only 3/12 MF/D-MF/M-F spots (25%) are true freshmen; 9 transfers incl. 2 direct JUCO (Long Beach CC ×2) + 1 more (College of the Desert) and 6 4-year transfers (Grand Canyon, Coastal Carolina/UNC Asheville, Robert Morris, CCSU, Oregon St., UC Santa Cruz) |

**Notable finding:** CSU Fullerton is the clearest Portal/JUCO-heavy case found across all 5 conference batches to date — 75% of its midfield roster came via transfer, including two direct JUCO transfers from the same feeder school (Long Beach City College). This lines up with the school's existing profile as the Big West's lowest-cost, most GPA-accessible D1 option — heavy portal/JUCO recruiting appears to substitute for a true-freshman recruiting budget. The other 4 UC campuses (UCSB, UC Davis, UC Irvine) plus Cal Poly stayed solidly Freshman-friendly (all ≥80% true-freshman midfield rosters), while UC Riverside and UCSD sit in the Mixed band on genuinely different bases — UCR mixes in a JUCO transfer, UCSD leans on 4-year grad transfers only, consistent with a program rapidly building depth after its 2020 D1 elevation.

Data-only, `recruit_pathway`/`recruit_pathway_note` companion field (§3a Change Type 3) — no scoring cascade (`lensScores`/`fitOlivier` untouched). `python validate_schools.py` PASS (110 schools, 18 pre-existing warnings unchanged). `node validate_consistency.js` Issues: 0 (unchanged). `guideVersion` v44.19→v44.20.

**Remaining backlog:** ~5 more conference files — CAA, d1-other (partial — 3 of 7 schools already populated from earlier v35-v39.6 work), d2, ivy, and JUCO's remaining 6 schools (23 of 29 already populated v35/v39.1-v39.6).

---

### v44.19 (July 2026) — recruit_pathway data pass, Big Ten batch 4/10 (Change Type 3 companion field)

Fourth batch of the recruit_pathway backlog (see v44.16 for design context). All 11 Big Ten schools researched live via Chrome MCP (2025 roster; Penn State's 2026 default was an incomplete new-coach signee list, corrected to 2025 via the season dropdown):

| School | recruit_pathway | Basis |
|---|---|---|
| UCLA | Freshman-friendly | 8/10 MFs (80%) freshman-recruited, 2 transfers (UNC Greensboro→Louisville, Washington) |
| Indiana | Freshman-friendly | 5/8 MFs (62%) freshman-recruited, 3 transfers (Michigan State, Marquette, Evansville) |
| Penn State | Freshman-friendly | 8/8 MFs (100%) freshman-recruited, zero transfers (2025 season, pre-Rob Dow) |
| Michigan | Freshman-friendly | 15/15 MFs (100%) freshman-recruited, zero transfers |
| Michigan State | Freshman-friendly | 8/9 MFs (89%) freshman-recruited, 1 transfer (Incarnate Word) |
| Ohio State | Freshman-friendly | 8/8 MFs (100%) freshman-recruited, zero transfers |
| Northwestern | Freshman-friendly | 9/13 MFs (69%) freshman-recruited, 4 transfers (Maryland, La Salle, Evansville, Coastal Carolina) |
| Wisconsin | Mixed | 3/7 MFs (43%) freshman-recruited, 4 transfers (Oregon State, Colgate, Louisville, Niagara) — the only Big Ten school with a majority-transfer midfield |
| Rutgers | Freshman-friendly | 10/11 MFs (91%) freshman-recruited, 1 JUCO transfer (Indian Hills CC) |
| Washington | Freshman-friendly | 14/14 MFs (100%) freshman-recruited — zero transfers anywhere on the entire 2025 national-championship roster |
| Maryland | Freshman-friendly | 7/9 MFs (78%) freshman-recruited, 2 transfers (UMBC, Eastern Florida State JUCO) |

**10 of 11 Big Ten schools came back Freshman-friendly, only Wisconsin Mixed** — the strongest lean toward freshman recruiting of any conference batch so far (AAC: mixed; Big East: uniform Freshman-friendly; ACC: mostly Freshman-friendly with 2 Mixed). Consistent with the Big Ten's mix of blue-blood recruiting brands (Indiana, Maryland, UCLA, Washington) that don't need the portal.

Data-only — `data/big-ten.json` is the only file touched, no UI renders this field. `python -m json.tool` PASS, `validate_schools.py` PASS (18 pre-existing unrelated warnings), `node validate_consistency.js` Issues:0 (unchanged). `athletes/olivier.json` v44.18→v44.19.

**Remaining backlog:** ~6 more conference files (Big West, CAA, d1-other's remaining 4 schools, d2, ivy). Continue batched by conference file, one commit per batch.

---

### v44.18 (July 2026) — recruit_pathway data pass, ACC batch 3/10 (Change Type 3 companion field)

Third batch of the recruit_pathway backlog (see v44.16 for design context, v44.17 for the Big East batch). All 13 ACC schools researched live via Chrome MCP (current 2025/2026 roster depending on program):

| School | recruit_pathway | Basis |
|---|---|---|
| Virginia | Freshman-friendly | 6/8 MFs (75%) freshman-recruited, 2 transfers both from Boston College |
| Wake Forest | Freshman-friendly | 13/13 MFs (100%) freshman-recruited, zero MF transfers |
| SMU | Mixed | 6/10 MFs (60%) freshman-recruited, 4 transfers from 4 different programs incl. 1 JUCO (Dallas College Richland) |
| Duke | Freshman-friendly | 10/14 MFs (71%) freshman-recruited, 4 transfers (Georgetown, Harvard, College of Charleston, Northeastern) |
| NC State | Mixed | 7/12 MFs (58%) freshman-recruited, 5 transfers incl. 2 multi-stop JUCO pathways — consistent with new HC Hubbard's rapid portal-driven rebuild |
| Louisville | Freshman-friendly | 8/9 MFs (89%) freshman-recruited, 1 transfer (Limestone) |
| Pittsburgh | Freshman-friendly | 9/10 MFs (90%) freshman-recruited, 1 transfer (Oregon State) |
| Stanford | Freshman-friendly (lower confidence) | Roster template publishes no prior-school data; classified on structural grounds (Stanford's own 3.7+ GPA/13% acceptance undergrad admissions apply equally to transfers) |
| Syracuse | Freshman-friendly | 7/10 MFs (70%) freshman-recruited, 3 transfers incl. 1 JUCO (Daytona State) |
| Cal | Freshman-friendly | 11/15 MFs (73%) freshman-recruited, 4 transfers (UCLA, UC Santa Cruz, USF, Pomona-Pitzer) |
| Clemson | Freshman-friendly (lower confidence) | Roster template (same WMT style as Stanford) publishes no HS/prior-school data; classified on the visible pattern of direct-from-country international hometowns consistent with Noonan's known club-academy recruiting network |
| Notre Dame | Freshman-friendly | 11/12 MFs (92%) freshman-recruited, 1 transfer — cross-referenced by name/hometown/HS to confirm Vlad Walent transferred in from Wake Forest |
| UNC | Freshman-friendly | 7/10 MFs (70%) freshman-recruited, 3 transfers (SIU-Edwardsville, San Diego, USF) |

**Two schools (Stanford, Clemson) got an explicitly lower-confidence classification** — both use a newer WMT-template roster page that doesn't publish HS/prior-school data for any player (unlike the Sidearm-style templates used by the other 11 schools), and bio subpages didn't render further detail via this session's tooling. Rather than skip the field or guess with false precision, each was classified on the best structural/pattern evidence available and flagged in its own note for re-verification if a better source turns up — consistent with the "never guess, document why" research discipline (§15).

Data-only — `data/acc.json` is the only file touched, no UI renders this field. `python -m json.tool` PASS, `validate_schools.py` PASS (18 pre-existing unrelated warnings), `node validate_consistency.js` Issues:0 (unchanged). `athletes/olivier.json` v44.17→v44.18.

**Remaining backlog:** ~7 more conference files (Big Ten, Big West, CAA, d1-other's remaining 4 schools, d2, ivy). Continue batched by conference file, one commit per batch.

---

### v44.17 (July 2026) — recruit_pathway data pass, Big East batch 2/10 (Change Type 3 companion field)

Second batch of the recruit_pathway backlog (see v44.16 for the design context). All 11 Big East schools researched live via Chrome MCP (current 2025 roster; St. John's/DePaul default to 2025 since 2026 wasn't checked, others explicitly 2025 season):

| School | recruit_pathway | Basis |
|---|---|---|
| St. John's | Freshman-friendly | 11/12 MFs (92%) freshman-recruited, 1 JUCO transfer (Cowley CC) |
| Creighton | Freshman-friendly | 11/14 MFs (79%) freshman-recruited, 3 transfers incl. 1 JUCO (Iowa Western CC→UIC) |
| Providence | Freshman-friendly | 7/9 MFs (78%) freshman-recruited, 2 transfers incl. 1 JUCO (Monroe College) |
| Seton Hall | Freshman-friendly | 11/12 MFs (92%) freshman-recruited, 1 transfer (SMU) |
| Butler | Freshman-friendly | 8/9 MFs (89%) freshman-recruited, 1 transfer (UNC-Asheville) |
| Xavier | Freshman-friendly | 7/10 MFs (70%) freshman-recruited, 3 transfers (Syracuse, Bellarmine, Monroe University) |
| UConn | Freshman-friendly | 10/11 MFs (91%) freshman-recruited, 1 transfer (Villanova) |
| DePaul | Freshman-friendly | 10/10 MFs (100%) freshman-recruited, zero transfers |
| Villanova | Freshman-friendly | 8/8 MFs (100%) freshman-recruited, zero transfers |
| Marquette | Freshman-friendly | 9/10 MFs (90%) freshman-recruited, 1 JUCO transfer (Salt Lake CC) |
| Georgetown | Freshman-friendly | 18/18 MFs (100%) freshman-recruited, zero transfers |

**Notable finding: the entire Big East batch classified `Freshman-friendly`** — a real result, not a research shortcut (every school shows real variation in transfer share, 0%–30%, just none crossing the 50% threshold used for `Transfer-preferred`/`Mixed`). Contrasts with the AAC batch (v44.16), which had a genuine mix (FIU/Memphis transfer-preferred, FAU mixed). Consistent with the Big East's older, more prestige-driven recruiting culture vs. the AAC's higher transfer-portal reliance at several programs.

Data-only — `data/big-east.json` is the only file touched, no UI renders this field. `python -m json.tool` PASS, `validate_schools.py` PASS (18 pre-existing unrelated warnings), `node validate_consistency.js` Issues:0 (unchanged). `athletes/olivier.json` v44.16→v44.17.

**Remaining backlog:** ~8 more conference files (ACC, Big Ten, Big West, CAA, d1-other's remaining 4 schools, d2, ivy). Continue batched by conference file, one commit per batch.

---

### v44.16 (July 2026) — recruit_pathway data pass, AAC batch 1/10 (Change Type 3 companion field)

Resumed the `recruit_pathway`/`recruit_pathway_note` backlog (schema added v34, previously mis-logged in CLAUDE.md §6 as "0/220 populated" — a stale audit claim corrected this session; the field was actually already populated for 26 JUCO/d1-other schools). Design question settled first: `recruit_pathway` stays **informational only, permanently** — the NCAA's 5th-year/grad-transfer eligibility extension makes a roster-snapshot classification too unstable to fold into `fitOlivier` (a concrete FIU example showed only a 3-5 point swing even under a hypothetical dampening model, not worth the added instability). Owner confirmed: populate data, no scoring cascade, no new UI element this batch (schema-only field, never rendered — confirmed via grep of app.js/dashboard.js).

Researched all 8 non-service-academy AAC schools live via Chrome MCP (current or most-recent-published roster; Navy/Army excluded — service academies, `minutesOutlook.available: false`, no roster data collected):

| School | recruit_pathway | Basis |
|---|---|---|
| FIU | Transfer-preferred | 6/9 MFs (67%) transfers (AIC, St. John's, Hofstra, Siena, Concord, Seton Hall); 2026 roster |
| USF | Freshman-friendly | 5/7 MFs (71%) freshman-recruited; new HC Kiefer's GCU transfer wave hit D/F, not midfield; 2026 roster |
| Tulsa | Freshman-friendly | 6/8 MFs (75%) freshman-recruited, 3 local; 2025 roster (2026 unpublished, matches existing trajectoryNote) |
| Memphis | Transfer-preferred | 7/10 MFs (70%) transfers incl. 1 JUCO (Iowa Lakes CC); 2025 roster |
| Temple | Freshman-friendly | 11/12 MFs (92%) freshman-recruited, only 1 transfer; 2025 roster |
| UAB | Freshman-friendly | 4/6 MFs (67%) freshman-recruited; 2025 roster |
| Charlotte | Freshman-friendly | 4/6 MFs (67%) freshman-recruited; 2025 roster |
| FAU | Mixed | 4/7 MFs (57%) transfers incl. 1 JUCO (Iowa Western); 2025 roster |

Data-only — `data/aac.json` is the only file touched, no UI renders this field (confirmed before starting, so no Phase 5 browser test applies). `python -m json.tool` PASS, `validate_schools.py` PASS (18 pre-existing unrelated warnings), `node validate_consistency.js` Issues:0 (unchanged). `athletes/olivier.json` v44.15→v44.16.

**Remaining backlog:** recruit_pathway still unpopulated for the other ~9 conference files (ACC, Big Ten, Big East, Big West, CAA, d1-other's remaining 4, d2, ivy — juco.json and 3 of d1-other's 7 are already done from v35-v39.6). Continue batched by conference file, one commit per batch, same pattern as the confRecord campaign.

---

### v44.15 (July 2026) — Coaches tab: relabel coach-card stat "MLS Picks" → "MLS Players Dev" (Change Type 11)

Owner asked why Steve Clements (Tyler JC) shows "10 MLS Picks" on his coach card while the Pro Pipeline tab's `mlsDraft` table shows Tyler JC at 0 picks. Not a bug — two different metrics with a misleading shared label. The coach card was reading `coaches.json`'s `mlsPlayers` field (a coach's career-long count of players personally developed who reached MLS/pro, regardless of which school they were drafted from) but labelling it "MLS Picks" — the same wording used by the Pro Pipeline tab's `picks5yr` (MLS SuperDraft picks credited to whichever school the player was drafted *from*, last 5 years only). JUCO players are almost always drafted after transferring to a D1 program, so the pick credit lands on the D1 school, not the JUCO — this is the exact `nextLevelOutput` problem documented in CLAUDE.md §5b (the Northeast CC/Edouard Nys worked example).

`js/app.js:2554` — coach profile card stat relabelled from "MLS Picks" to "MLS Players Dev", now consistent with the Rankings table header (`index.html:1098`, already correctly worded) and the school-level Pipeline label (`app.js:723`, already correctly worded "MLS Picks (5yr)"). No data or score change — display-only label fix. `athletes/olivier.json` v44.14→v44.15. `node --check js/app.js` OK, `validate_consistency.js` Issues:0. Live-verified: coach card (Gelnovatch, rank #1) renders "MLS Players Dev", zero console errors.

---

### v44.14 (July 2026) — Pro Pipeline tab reconciliation: 9 missing NCAA D1 titles, 2 JUCO titles, 2 MLS pipelines + UNC titles factual fix (Change Type 7)

Queued from the confRecord campaign session (2026-07-19): cross-referencing every school's own `titles[]`/`confRecord` against `data/pipeline.json` found the Pro Pipeline tab badly stale, plus a standalone factual error in UNC's own `titles[]`.

**`ncaaD1` table** — was missing 9 schools' real, undisputed NCAA D1 men's titles already documented in their own `titles[]`: Clemson (2021, 2023), Vermont (2024, reigning champion), Georgetown (2019), Syracuse (2022), Notre Dame (2013), Stanford (2015/16/17), Maryland (2005/08/18), Duke (1986), Navy (1964, program's only title). Table re-sorted by title count (tiebreak: most recent title) — all 15 ranked entries renumbered 1–15; medal ranks 1–3 (Indiana/Virginia/UCLA) unchanged.

**JUCO section** (`ncaaD2`'s unranked "NAIA, D3 & JUCO" group) — added Phoenix College (2025 NJCAA DII National Champion) and Pima CC (2018, 2021 NJCAA champion), both already carrying `chip-green` title claims in their own school JSON that the table never surfaced.

**`mlsDraft` table** — added Akron (rank 5, 5 picks/5yr — Jaaskelainen #7 overall 2024, 18 picks under Coppinger) and NC State (rank 17, 1 pick/5yr — Nikola Markovic #1 overall 2026, Donavan Phillip 2025 Hermann Trophy, both developed by Marc Hubbard in 2 seasons), both previously absent despite documented pipelines called out elsewhere in the guide. Ranks 5–21 renumbered to accommodate both insertions.

**UNC factual error (independent of staleness)** — `data/acc.json`'s `titles[]` read *"Dorrance era 4 D1 NCAA Championships (1978, 1979, 2001 — men's + women's dynasty)."* Anson Dorrance is UNC's **women's** soccer coach (21 women's titles); this is a men's soccer guide, and UNC men's actual HC is Carlos Somoano. Verified via NCAA.com + Wikipedia: UNC men's soccer's only two national titles are **2001** (Elmar Bolowich, program's first) and **2011** (Somoano's first year as HC, beat Charlotte 1-0). Corrected in both `acc.json`'s `titles[]` and `pipeline.json`'s UNC `mlsDraft` row (which repeated the same "Dorrance dynasty legacy" framing).

Display-only, Change Type 7 — verified `js/scores.js` never reads `titles` or `pipeline.json`, so no `fitOlivier`/`lensScores` cascade. `validate_schools.py` PASS (18 pre-existing unrelated warnings only), `node validate_consistency.js` Issues:0. `athletes/olivier.json` v44.13→v44.14.

**Tabs verified (local browser, targeted scope):** Pro Pipeline — all three sub-tabs (NCAA D1, NCAA D2, MLS SuperDraft) render the new/renumbered rows correctly; UNC's `mlsDraft` row shows the corrected "2× national champions (2001, 2011)" text; Akron and NC State both render at their new ranks with correct coach-card cross-references. Zero console errors.

**Deferred (found, not fixed — different Change Type, out of this session's scope):** `data/coaches.json`'s Somoano `record` field also says *"Dorrance dynasty legacy program"* — same wrong claim, but fixing it is Change Type 2 territory (two-file rule + mandatory full coach re-rank), not Change Type 7. Flagged for its own session.

---

### v44.13 (July 2026) — Coaches tab: add D3 and JUCO filter buttons (Change Type 11)

The Coaches → Profiles filter row was missing **D3** and **JUCO**, so those coaches (1 D3, 29 JUCO) couldn't be isolated. Added both buttons — D3 in the NCAA-division group (D1 · D2 · D3 · NAIA), JUCO after Ivy League. The row is now: All Coaches · D1 · D2 · D3 · NAIA · Ivy League · JUCO · 🇦🇺 Aus Connections · 🏆 Pro Pipeline.

No JS change needed — `filterCoaches(type)` already matches `card.dataset.div===type`, and the coach cards carry the exact `div` values (`"D3"`, `"JUCO"`) from `coaches.json`. `index.html` (2 buttons), `athletes/olivier.json` v44.12→v44.13. Live-verified: JUCO → 29 coach cards, D3 → 1, All → 110; zero console errors.

---

### v44.12 (July 2026) — Search: Enter filters instead of auto-opening a school (Change Type 11)

Follow-up to v44.11. The autosuggest was auto-selecting the first result and opening its modal on Enter, which was jarring. The search is now a pure filter/finder — **it never auto-opens the Details modal.**

- **Enter** (after typing, nothing highlighted) → runs the search: the grid stays filtered to *all* matches and the dropdown just closes (e.g. type "a" + Enter → the 76 schools containing "a"). No modal.
- **Selecting a specific school** — clicking a suggestion, or ↑/↓ to highlight one then Enter → narrows the grid to that one school's card (sets the search to its name). No modal.
- To open a school's details, use its **Details** button on the card, as before.

`js/app.js`: `pickSuggest()` no longer calls `openDetail` (it filters + refocuses the field); `onSearchKey` Enter only picks a school when one is deliberately highlighted, otherwise just closes the dropdown. `athletes/olivier.json` v44.11→v44.12. Live-verified: "a"+Enter → 76 cards, no modal; "ak"+↓+Enter → Akron card only, no modal; clicking Tulsa → Tulsa card only, no modal; zero console errors.

---

### v44.11 (July 2026) — Explore search UX: working clear (✕) button + typeahead autosuggest (Change Type 11)

Two enhancements to the Explore Schools search box, both requested by the owner. UX/JS only, no data.

**1. Robust clear button.** The ✕ button existed but was wired through a fragile inline `oninput` expression. Replaced with a dedicated `onSearchInput(inp)` handler that reliably toggles the button (`display:flex` when the field has text, `none` when empty). The button is now a rounded hit-target that fills with the rose accent on hover. `clearSearch()` also closes the dropdown and refocuses the field.

**2. Autosuggest / typeahead.** Typing now shows a dropdown of up to 6 matching schools, ranked: school-name starts-with → full-name starts-with → name contains → full-name/location contains. Each row shows the school name + its conference. Interactions: click (or Enter) selects a school — fills the search, filters the grid to it, and opens its Details modal; ↑/↓ move the highlight; Enter picks the highlighted (or first) result; Esc closes the dropdown (or clears the field if already closed); clicking outside closes it. Fully keyboard-accessible (`role="combobox"`/`listbox"`/`option"`, `aria-expanded`), HTML-escaped, and theme-aware.

Files: `js/app.js` (search input markup + `onSearchInput`/`renderSearchSuggest`/`hlSuggest`/`pickSuggest`/`onSearchKey`/`closeSuggest` + outside-click listener; `clearSearch` extended), `index.html` (`.search-suggest` dropdown styles + clear-button restyle), `athletes/olivier.json` (v44.10→v44.11). Live-verified: typing "a" lists Akron/Angelina/Arizona Western/Army/Barry with the ✕ visible; "ak" narrows to Akron first; ↓ highlights Akron; selecting opens the Akron modal; clear empties the field and restores all 110 cards; zero console errors.

---

### v44.10 (July 2026) — Men's-soccer conference reclassification: Akron → Big East, Army & Navy → Patriot League

Follows the **Delaware → Summit** precedent (v44.0): the guide groups schools by the conference their *men's soccer* plays in, so three schools whose men's-soccer conference differs from their primary-athletics home were regrouped. Display/grouping only — **no Fit-score cascade** (confKey/conf/confRecord don't feed `fitOlivier`). `validate_consistency.js` **Issues: 0**, `validate_schools.py` PASS (110), confRecord counter still 0.

**The trigger — a data error the confRecord counter missed.** Akron's record read "MAC Champions / MAC Tournament Champions" for **2023, 2024, 2025** — but the **MAC discontinued men's soccer after 2022**, and Akron actually played those years in the **Big East (Midwest Division)**, finishing 3rd, 1st, 1st. Its 2021 row also fabricated a "MAC title + College Cup" — Akron was really **6th in the MAC** (2-3-1); the College Cup was 2018, not 2021. The counter never flagged this because "MAC Champs" *names a title*, so it read as researched, not generic — a real blind spot in the generic-placeholder detector.

**Akron confRecord rewritten** from official standings: 2020 (MAC held no season, COVID), 2021 6th MAC (2-3-1), 2022 1st MAC (5-0-3, the MAC's final men's-soccer season), 2023 3rd / 2024 1st / 2025 1st Big East Midwest. `conf` MAC→Big East, `confKey` mac→big-east.

**Army & Navy → Patriot League.** Both service academies play men's soccer in the **Patriot League**, not the AAC (their AAC membership is for other sports). `conf` AAC→Patriot League, `confKey` aac→patriot. Their confRecords already showed Patriot standings (fixed in v44.3).

**New `confMoveNote` field** — a per-school string rendered as a callout in the **Standings & Titles** tab, explaining each move (e.g. "Akron's men's-soccer team joined the Big East (Midwest Division) in 2023, when the MAC discontinued the sport…"). Added to `js/app.js`'s standings render.

**Files:** `data/d1-other.json` (Akron), `data/aac.json` (Army/Navy), `data/coaches.json` (3 coach `conf` strings), `data/conferences.json` (MAC card removed, Patriot card added, Big East +Akron, AAC −Army/Navy), `data/conf-prestige.json` (**Conference Rankings**: MAC row removed, Patriot League added at rank 23, Big East +Akron, AAC −Army/Navy, all ranks resequenced 1–23), `js/app.js` (CONF_SECTIONS: `mac` removed, `patriot` added, Big East intro; + `confMoveNote` render), `validate_consistency.js` (sectionKeys −mac +patriot), `CLAUDE.md`, `athletes/olivier.json` (v44.9→v44.10). Schools stay in their original conf FILE (d1-other.json / aac.json) — grouping is by `confKey`, not file. **Live-verified:** Akron renders in the Big East section with the MAC→Big East standings + note; Army & Navy render in a new Patriot League section with notes; MAC section gone; Conferences tab + Conference Rankings show the Patriot League; zero console errors.

---

### v44.9 (July 2026) — confRecord backlog Batch 8/8 (FINAL): JUCO researched — CAMPAIGN COMPLETE, counter 38 → 0 ✅

Final batch. Rewrote `confRecord` for the last **3 flagged** `data/juco.json` schools. Counter **3 → 0** — the validate_consistency.js confRecord backlog is fully cleared (started at 38). `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings). MCP-browser-first; iccac.org, thefcsaasports.com and njcaa.org all bot-blocked/404'd the browser → curl + the schools' own Sidearm sites.

- **Indian Hills** (ICCAC / NJCAA Region XI): the three "ICCAC play — pre-Newton era" placeholder years filled from iccac.org — 2021 5th/last (1-6-1, 7-11-2), 2022 2nd (4-3-1, 12-9-1), 2023 1st (2-0, 10-3-5). The 2024 national-semifinal and **2025 NJCAA DI National Championship** rows were preserved byte-for-byte (verified by an assert).
- **LSU Eunice** (NJCAA DI): corrected the framing — LSUE is **not** a new program but a longstanding **NJCAA DI independent** (a Region 14 scheduling partner not carried in the conference standings table). The three "Not in Region 14 standings" rows now show its real overall records as an independent (2021 8-6-2, 2022 11-4, 2023 13-4-1, from athletics.lsue.edu); 2024/2025 Region 14 rows preserved.
- **Miami Dade** (FCSAA / NJCAA Region 8): confirmed via official FCSAA standings that its **men's-soccer program began in 2024-25** (absent from the 2022-23 & 2023-24 standings, which listed the other Region 8 schools). Trimmed the fabricated 2020–2023 "Mid NJCAA"/"COVID" rows to the two real seasons: 2024 1st (2-1-1, 13-5-2, first season) and 2025 3rd (1-3, 6-11-2).

**Campaign summary (v44.2–v44.9, 8 batches):** every one of the 110 schools' `confRecord` (2020–2025) now carries a real, sourced conference finish + record instead of "Mid/Lower/conference play" placeholders. Along the way, verification exposed and corrected a large number of *wrong* (not just thin) entries — hidden conference titles (Tulsa 2021 AAC, Penn State 2021 Big Ten, Washington 2022 Pac-12, Stanford 2020 Pac-12, GCU 2020/2021 WAC, CS Fullerton 2023 & UC Riverside 2022 Big West, Keiser's Sun Conference dominance), fabricated results (UConn's 2023 "regular-season title", Seton Hall's mis-dated tournament title), and several structural findings where a school's men's-soccer conference differs from its guide grouping (Army/Navy → Patriot League, Akron → Big East). No score cascade (confRecord is display-only). Splice method throughout: CRLF-preserving, region-only replacement guarded so only the target `confRecord` arrays change.

Files: `data/juco.json`, `athletes/olivier.json` (v44.8→v44.9), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.8 (July 2026) — confRecord backlog Batch 7/? : d2 file researched (Change Type 6)

Batch 7. Rewrote `confRecord` (2020–2025) for the **3 flagged** `data/d2.json` schools — Nova SE (Sunshine State Conf), Keiser (Sun Conference / NAIA), Georgian Court (CACC). Counter **6 → 3**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings). MCP-browser-first: sunshinestateconference.com and thesunconference.com loaded in the in-app browser; **caccathletics.org bot-blocked** (timed out) → curl.

**Major corrections:**
- **Keiser is a Sun Conference power** — 1st (2020 undefeated, 2022, 2024, 2025 undefeated) or 2nd (2021, 2023) every single year, and the **2021 NAIA National Champions** — all buried under "Mid Sun Conf."
- **Georgian Court's full CACC history recovered** — the three "exact standings not re-verified" years (2021 4th, 2022 9th, 2023 7th) now researched, and **its missing 2025 season added** (the row didn't exist before; the school had only 2020–2024).
- **Nova SE's** "Mid SSC" years filled with exact finishes (4th–5th), including a 17-3-3 NCAA D2 Tournament season in 2021.

Splice method identical (CRLF-preserving region-only replacement, guarded). Files: `data/d2.json`, `athletes/olivier.json` (v44.7→v44.8), `CHANGELOG.md`, `CLAUDE.md` §6 marker. **One batch (JUCO, 3 schools) remains before the confRecord counter is fully cleared.**

---

### v44.7 (July 2026) — confRecord backlog Batch 6/? : d1-other + Drexel researched (Change Type 6)

Batch 6 — the first "scattered" batch (schools span 4 different conferences). Rewrote `confRecord` (2020–2025) for **4 flagged schools**: UCA (ASUN), GCU (WAC), Delaware (CAA→Summit) in `data/d1-other.json`, and **Drexel** (CAA, the lone `data/caa.json` flag — folded in since it shares Delaware's CAA source). Counter **10 → 6**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings). This was the first batch run **MCP-browser-first** (owner directive) — asunsports.org, caasports.org, thesummitleague.org all loaded in the in-app browser; only **wacsports.com** bot-blocked (redirects to the football conference for both the browser AND curl), so GCU's WAC standings came from the Wikipedia WAC standings templates.

**Major corrections:**
- **GCU won the WAC regular season in BOTH 2020 (7-0-0, undefeated) and 2021 (9-2-0)** — buried under "WAC play"; and its 2025 was 3rd + won the **final** WAC Tournament (automatic NCAA bid).
- **UCA has been consistently 2nd in the ASUN** (2021, 2022) and 2nd in its division in 2025 — labeled "Mid ASUN"; and its 2022 was 2nd, not the "3rd" the old note claimed. (UCA joined the ASUN for men's soccer in 2021; the 2020-21 season predates that.)
- **Drexel was 2nd in the CAA in 2024** (5-2-1) and a steady tournament qualifier — vague notes replaced with exact finishes.
- **Delaware's** CAA→Summit move now has real data: 9th/last (winless, 2021) and 10th/last (2022) in the CAA, then a strong 3rd (12-2-3) in its first Summit season with a tournament-semifinal run.

Splice method identical (CRLF-preserving region-only replacement, guarded). Files: `data/d1-other.json`, `data/caa.json`, `athletes/olivier.json` (v44.6→v44.7), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.6 (July 2026) — confRecord backlog Batch 5/? : ACC file researched (Change Type 6)

Batch 5. The **4 flagged** `data/acc.json` schools (Cal, Louisville, NC State, Stanford) had `confRecord` (2020–2025) rewritten from official standings. Counter **14 → 10**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings). Sources:
- **theacc.com** (Sidearm) — full ACC standings 2020–2025 (Atlantic/Coastal **divisions** 2020–2023, single table 2024–2025).
- **Wikipedia** Pac-12 standings templates/season pages + Stanford's program page — for Cal & Stanford's Pac-12 years (2020–2023).

Cal & Stanford moved Pac-12 → ACC in 2024 (the same realignment split as Washington/Cal-Stanford in the AAC and Big Ten batches).

**Major corrections:**
- **Stanford won the 2020 Pac-12** (7-2-1, 10-3-1) — labeled "Pac-12 conference play"; and its 2024 was 7th, not the "top ACC seed" the old note claimed.
- **Louisville was 2nd (2021), 3rd (2020, 2022) in the ACC Atlantic Division** and 4th in 2023 — all buried under "Lower ACC finish."
- **NC State's** 2025 (3rd ACC, 16-2-3) now notes its run to the **NCAA Championship final** (national runners-up); its 2021–2024 vague "Mid ACC" replaced with exact ACC Atlantic finishes.
- Removed misplaced claims from Stanford's rows (the "3 NCAA titles 2015-17" and a dubious "2023 NCAA runner-up" note that sat on the wrong years).

Splice method identical to prior batches (CRLF-preserving region-only replacement, guarded). Files: `data/acc.json`, `athletes/olivier.json` (v44.5→v44.6), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.5 (July 2026) — confRecord backlog Batch 4/? : Big Ten file researched (Change Type 6)

Batch 4. The **5 flagged** `data/big-ten.json` schools (Michigan, Northwestern, Penn State, Rutgers, Washington) had `confRecord` (2020–2025) rewritten from official standings. Counter **19 → 14**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings). Sources:
- **bigten.org** (new Next.js site — parsed the embedded `__NEXT_DATA__` JSON; only carries 2022–2025).
- **Wikipedia** season pages for Big Ten 2020 & 2021 (the newer site lacks them) and Washington's Pac-12 years.
- The **Washington program page** for its 2020/2021 Pac-12 finishes.

Washington needed two conferences (Pac-12 2020–2023, Big Ten 2024–2025) — same realignment pattern as the AAC batch.

**Major corrections:**
- **Penn State won the 2021 Big Ten** — regular-season AND tournament champions (6-2-0, 13-7-1) — labeled "Mid B1G conference play." Also 2nd in 2020 (tournament runners-up to Indiana) and 2nd in 2023.
- **Washington won the 2022 Pac-12 regular season** (7-1-2) and went **18-2-2 (2nd Pac-12) in 2021** — all buried under "Pac-12 conference play"; and its 2025 Big Ten finish was 2nd, not "Lower B1G."
- **Northwestern was 3rd in the Big Ten in 2023** (top-half) and **Rutgers 3rd in 2022** — both "Mid B1G."
- Michigan's 2022 was last (9th), not "Mid"; the fabricated/vague notes for Michigan/Rutgers 2021–2024 replaced with exact records.

The Big Ten *did* play the 2020-21 season (spring 2021), unlike the Big West — 2020 rows carry the real spring-2021 standings.

Splice method identical to prior batches (CRLF-preserving region-only replacement, guarded; also asserts no validate_schools placeholder-phrase verbs). Files: `data/big-ten.json`, `athletes/olivier.json` (v44.4→v44.5), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.4 (July 2026) — confRecord backlog Batch 3/? : Big West file researched (Change Type 6)

Batch 3. All **5 flagged** `data/big-west.json` schools (CS Fullerton, UC Davis, UC Irvine, UC Riverside, UC San Diego) plus the 2 already-detailed schools (UCSB, Cal Poly, rewritten in the same pass to fix their fabricated 2020 rows) had `confRecord` (2020–2025) rewritten from official **bigwest.org** standings (season IDs 185/170/154/140/127/117) + the Wikipedia Big West Tournament champions table. Counter **24 → 19**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings — baseline).

bigwest.org **times out in the in-app browser** (bot-block) but serves fine to `curl` (200, ~1s) — fetched the server-rendered standings HTML directly and parsed the tables.

**Major corrections (placeholders were hiding conference titles):**
- **CS Fullerton won the 2023 Big West regular season** (1st, 6-2-1, 19 pts) — every year was "Lower BW conference play."
- **UC Riverside won BOTH the 2022 regular season and the 2022 Big West Tournament** (double champions, beat UCSB 1-0) — also buried under "Lower BW."
- **UC Irvine** won the 2023 (8-7 on penalties over UC Davis) and 2025 tournaments; was 2nd in the regular season both years (labeled "Mid").
- **UCSB** corrected: 2021 was a regular-season + tournament double (labeled "2nd"); 2024 was 2nd not "Big West Champions."
- **The entire 2020-21 season was cancelled by the Big West due to COVID-19** — every school's fabricated 2020 row ("2nd", "Big West conference play", etc.) replaced with the cancellation note.
- UC San Diego's "first Big West season (2024)" note corrected — UCSD joined the Big West in its 2020 D1 move; first *played* season was 2021 (2020 cancelled), full member from 2025.

Tournament champions verified: 2021 UCSB, 2022 UC Riverside, 2023 UC Irvine, 2024 UC Davis, 2025 UC Irvine (no 2020 tournament — season cancelled).

Splice method identical to Batches 1–2 (CRLF-preserving region-only replacement, guarded). Files: `data/big-west.json`, `athletes/olivier.json` (v44.3→v44.4), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.3 (July 2026) — confRecord backlog Batch 2/? : AAC file researched (Change Type 6)

Batch 2 of the confRecord campaign. All **9 flagged schools** in `data/aac.json` (USF, Tulsa, Memphis, Temple, Charlotte, FAU, UAB, Army, Navy) had their `confRecord` (2020–2025) rewritten from official standings. The validate_consistency.js confRecord counter dropped **33 → 24**; `Issues: 0`, `validate_schools.py` PASS (110, 18 warnings — baseline). This file needed **three** sources because men's-soccer conference ≠ the guide's primary-conference grouping:
- **theamerican.org** (AAC) — USF/Tulsa/Memphis/Temple all years; Charlotte/FAU/UAB from 2022.
- **conferenceusa.com** (C-USA) — Charlotte/FAU/UAB for 2020 & 2021.
- **patriotleague.org** (Patriot League) — **Army & Navy, all years**.

**Major corrections surfaced (not just placeholders filled):**
- **Tulsa 2021** was labeled "Mid AAC conference play" — they actually **won the AAC regular season** (8-1-1, 25 pts, No. 1 seed, hosted the championship). The 2021–2024 generic run hid a conference title.
- **Charlotte** labeled "Mid AAC" — actually **2nd in 2023** (6-2) and **1st/co-champions in 2025**; and its 2020–2022 were wrong: Charlotte/FAU/UAB were **already AAC in 2022** (men's soccer moved a year before their full 2023 membership), C-USA only in 2020–2021.
- **Army & Navy do NOT play AAC men's soccer** — both compete in the **Patriot League** (Army even **won the 2022 Patriot League regular season**). Their entire "AAC conference play" history was wrong. confRecord now shows Patriot League standings with a clarifying note; they remain filed in `aac.json` (AAC is their primary-athletics conference).
- Memphis (correct 2024 title kept), Temple's three "exact standings not re-verified" years (2021–2023) now researched, UAB's mislabeled "first AAC season"/"joined 2023" notes corrected.

**Deferred (out of scope, flag for owner):** Army & Navy men's soccer = Patriot League, not AAC — same structural class as the Akron (Big East) and Delaware (Summit) findings; the confRecord is now correct but the guide's conference *grouping* of these schools for men's soccer is a separate Change-Type question.

Splice method identical to Batch 1 (CRLF-preserving, region-only replacement guarded to change only the 9 target confRecords; aac.json has floats + CRLF so no full-file json.dump). Files: `data/aac.json`, `athletes/olivier.json` (v44.2→v44.3), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.2 (July 2026) — confRecord backlog campaign, Batch 1/? : Big East researched (Change Type 6)

**Start of a new campaign** to clear the pre-existing `confRecord` "thin/generic conference history" backlog — the debt tracked by `validate_consistency.js`'s confRecord counter (added v42.8), which stood at **38 schools**. Owner scope decision (2026-07-18): **"true placeholders only"** — fix schools whose conference history is genuinely empty/generic filler, not terse-but-accurate power-conference schools. Batched **by conference** because every placeholder school in a conference shares ONE authoritative standings source, so one research pass fills the whole file.

**Batch 1 — Big East** (`data/big-east.json`, Change Type 6, display-only — no fitOlivier/lensScores cascade): all **11** Big East schools' `confRecord` (2020–2025) rewritten from the official **bigeast.com** archived standings (season IDs 1120/1110/30/1035/14/1036) + the Big East tournament-champions history. The counter dropped **38 → 33** (5 flagged Big East schools cleared: Providence, St. John's, Creighton, Seton Hall, Marquette, UConn had runs of ≥3 generic labels).

Every year now carries the exact conference W-L-T record + overall record + finishing position (division-aware: East/Midwest divisions in 2020-21 and 2023-25, single table in 2021/2022) + tournament/title context. **Real errors corrected during verification, not just placeholders filled:**
- **UConn 2023** claimed "Big East regular season title" — fabricated; UConn was **4th in the East** (Georgetown won it). Removed.
- **Providence 2024** was labeled "Mid BE" — actually **won the East Division** (5-1-2) and were **Big East Tournament runners-up** (lost the final to Georgetown 2-1).
- **Seton Hall's** tournament title was mis-dated to **2021** — it was the **2020** (2020-21 COVID) season; their real fall-2021 season was **last place** (2-7-1, 11th).
- **St. John's 2022** "Upper Big East / NCAA Tourn" — actually **8th** (4-8-5, no NCAA).
- Tournament champions verified: 2020 Seton Hall, 2021 Georgetown, 2022 Creighton, 2023 Xavier (first in program history, beat Georgetown on penalties), 2024 Georgetown (beat Providence), 2025 Georgetown.

**Also surfaced (deferred, out of scope):** Akron plays men's soccer in the Big East (Midwest Division) since 2023 — its guide entry is filed as MAC in `data/d1-other.json` (the same class of issue as the Delaware→Summit fix in v44.0); its confRecord should be reviewed against Big East standings, not the MAC.

Validators: `validate_schools.py` PASS (110), `validate_consistency.js` **Issues: 0** (unchanged), JSON valid. Files: `data/big-east.json` (11 confRecord arrays spliced via a CRLF-preserving, region-only replacement — non-confRecord bytes/floats untouched, guarded by an assert that only the 11 confRecords changed), `athletes/olivier.json` (v44.1→v44.2), `CHANGELOG.md`, `CLAUDE.md` §6 marker.

---

### v44.1 (July 2026) — Coach-card staff rendering: fix "null"/"undefined" rows, add email fallback (Change Type 11)

`buildCoachCard()` (js/app.js) rendered each `coaches.json` staff row as
`${s.name}/${s.role}/${s.bg}` with no guards. Against the real data (196 staff rows
across 110 coaches) that produced garbage:

- **25 rows with `bg: null`** → literal **"null"**; **9 email-only rows (no `bg`)** →
  literal **"undefined"** (36 garbage cells total).
- **2 string-format rows** (Indian Hills: `"Zac Newton — Head Coach"`) → name AND role
  rendered **"undefined"** (the map assumed objects).
- 17 empty-`bg` rows rendered a blank line.

**Fix (single renderer, one function):** handle string entries by splitting on `" — "`
into name/role; guard `name`/`role` with `|| ''`; and fall back the background slot to
`email · phone` when `bg` is absent/null/empty, else render clean-empty (never "null"/
"undefined"). No data or schema change; display-only.

**Verified** on a local server (Coaches tab, 110 cards / 196 staff rows): "null" 25→0,
"undefined" bg 11→0, "undefined" name 2→0; the 143 real-`bg` rows are unchanged; 6 rows
now surface an assistant email instead of garbage; the two Indian Hills rows now read
"Zac Newton / Head Coach" and "Felix Vu / Assistant Coach"; zero console errors.
`node --check` clean; `validate_consistency.js` Issues 0. (School-object `staff[]` arrays
in the conf JSONs are not rendered anywhere — confirmed the coach card is the only staff
renderer — so no other surface was affected.)

---

### v44.0 (July 2026) — Delaware reclassified CAA → Summit League (men's soccer conference correction)

Delaware's July 2025 all-sports move to Conference USA does **not** include men's
soccer (CUSA sponsors no men's soccer), so the team competes in **The Summit League**
from 2025 (reached the 2025 Summit League semifinals; 12-2-3, #24 nationally). The
guide had it filed under the CAA. This creates a new single-school Summit League
conference (the established pattern for MAC/WAC/WCC/ASUN/AEC/NEC) and moves Delaware
into it. **Display/grouping only — no score cascade** (`conf`/`confKey`/file location
don't feed `fitOlivier`; `div` stays D1; `fundingPathway` stays `full`). Delaware's Fit
holds at **38**; coach rank/score unchanged (McMenemy rank 67, overallScore 66).

**Tier-1 verification:** thesummitleague.org 2026 Men's Soccer Standings lists exactly
six men's soccer members — Kansas City, UMass, Omaha, **Delaware**, Oral Roberts,
St. Thomas (Denver having left for the WCC in 2026, matching the guide).

**Files (8):**
- `data/caa.json` — Delaware object removed (CAA 9 → 8 schools).
- `data/d1-other.json` — Delaware object added; `conf` → "Summit League", `confKey` →
  `summit`; `confRecord` 2025 corrected ("Left CAA" → "Summit SF" semifinal run); all
  stale "moved to CUSA / filed under CAA (historic)" notes in `soccerLevel`, `extras`,
  facility `note`, `olivierMatch`, `lifestyleTags`, `staff[].bg` and `rec` rewritten to
  the accurate Summit framing. (Moved at byte level to preserve float formatting/CRLF.)
- `js/app.js` — new `CONF_SECTIONS` entry `{key:'summit', …}` (without it Delaware would
  be invisible in Explore).
- `data/conferences.json` — new Summit League conference card (tier "Mid-Major (D1)");
  Delaware removed from CAA `guideSchools`; CAA `desc`/`olivierNote` counts 9 → 8.
- `data/conf-prestige.json` — Summit League row appended (rank 23, matching how NEC/CACC/
  AMC were appended rather than renumbering); Delaware removed from CAA `programsInGuide`;
  CAA `relevance` count 9 → 8 and the stale "confirm current standing" note replaced.
- `data/coaches.json` — McMenemy `conf` "CAA" → "Summit"; `record` CAA reference updated.
  No re-rank (overallScore unchanged).
- `validate_consistency.js` — added `'summit'` to the hardcoded `sectionKeys` mirror of
  CONF_SECTIONS (else the CONFKEY check false-flags Delaware).
- `CLAUDE.md` — School→File table + §2 file-map (CAA 9→8, d1-other +Delaware/Summit 6→7).

**Validation:** `validate_schools.py` PASS (110 schools); `validate_consistency.js`
Issues: **0** (Conferences 24→25, Prestige rows 22→23). Live-verified on a local server:
`grid-summit` renders 1 card (Delaware), `grid-caa` now 8; Conferences tab shows the
Summit League card; Delaware modal badge reads "D1 · Summit League · Newark, DE" with the
corrected confRecord and no stale CUSA text; Coaches tab shows McMenemy under Summit;
Fit 38% unchanged; zero console errors.

---

### v43.12 (July 2026) — Deferred-backlog closeout: 3 coach swaps (→ §5d 110/110 complete), Tyler JC staffing, dead-host & data fixes

Clears the deferred backlog accumulated across the v43 §5d campaign, in three commits.

**(1) Tyler JC staffing + graceful null contacts.** Added Jake Carney (Strength &
Conditioning Coach) to the Tyler JC staff and named him in the coach profile;
guarded the three coach-contact render paths so a null email/phone shows "—"
instead of the literal "null" (fixes 15 coach cards / 12 school modals).

**(2) Data-quality backfills** (no score change). Corrected 10 dead/wrong athletics
hosts across coaches.json url, conf-JSON url/domain, and app.js DOMAINS/roster maps
(UAB, UC Irvine, UC Riverside, Northeastern, Cal State LA, Keiser, Georgian Court,
Columbia College, Daytona State, Blinn, plus Chapman chapmanathletics→athletics.chapman.edu).
yearsHC corrected to current-program tenure for 11 coaches; licence backfills for 11
(incl. Martorana NSCAA-diploma→USSF D); mlsPlayers backfills (Fisher 15, McBride 18,
McCourt 10). Bio corrections: Washington/Clark now carries the 2025 NCAA title;
Delaware men's soccer competes in The Summit League, not CUSA (verified bluehens.com).

**(3) Three coach swaps (Change Type 2) → §5d campaign 110/110 COMPLETE.** Each
verified live on the school's own staff/bio page and scored vs §5d, then a final
global re-rank of all 110:
  • NC State: Kelly Findley → **Marc Hubbard 83 (rk-elite, rank 20)** — in two seasons
    took NC State to its first-ever national championship game (2025) + a 2024 Sweet
    Sixteen, developed the 2025 MAC Hermann Trophy winner and the No. 1 overall 2026
    MLS pick (6 draftees in 2 years); elite-caliber ceiling + development, placed at
    the elite floor given the short 2-season sample.
  • Chapman: Dustin Johnson (stale/erroneous baseline) → **Eddie Carrillo '90 61
    (rk-solid)** — winningest & longest-tenured HC in program history (31st season,
    268-216-62, 8 NCAA DIII appearances, 2 SCIAC titles); D3/no-pipeline caps solid.
  • Santa Monica: Lee Avery (stale baseline; Pierce has been HC since 2012) → **Tim
    Pierce 63 (rk-solid)** — UCLA All-American/national-champion as a player, 2018 WSC
    title + 2× WSC CoY, premier SMC→UCLA transfer pipeline.
Coach rubric now **110/110 re-scored, 0 legacy** — the §5d yardstick applies to every
coach. Validator Issues 0; ranks a gapless 1–110 permutation, all bands coherent.

### v43.11 (July 2026) — Coach Rubric Step 2, Batch 10/10 (FINAL): JUCO coaches re-scored vs §5d + single global re-rank of all 110

Tenth and final re-score batch of the §5d campaign. **28 of the 29 `juco.json` coaches re-scored** (each verified live via the in-app Browser against the school's own men's-soccer bio page, §15 Rule 0), then **Phase B: the single global re-rank of all 110 coaches** by `overallScore` descending (gapless 1–110, tie-break = prior stored rank; every `rank` + `rankClass` re-set). This resolves the Rhythm-B provisional state — for the first time all 110 coaches sit on the same §5d yardstick and the live ranking is truthful. **One coach-change deferral — Santa Monica:** the current HC on smccorsairs.com is **Tim Pierce** (pierce_timothy@smc.edu), not the stored `avery_smc` (Lee Avery) — left legacy (no note, ov 66 unchanged), flagged as a Change Type 2 swap → batch ships **28/29**. **The campaign's dominant data-gap pattern dominated this batch — stored JUCO bios had systematically omitted national titles and pro pipelines, badly under-scoring genuine developers:** **Fisher (Nassau) 58→76** (biggest correction — 2015 National Champion + TEN National Final Fours + 285-61-9 + **15 future MLS/pro/international players**; stored bio cited only a 2025 10-2 record), **Cosgrove (Pima) 64→76** (2 NJCAA DI titles + NJCAA Hall of Fame + 451 wins + 2× National CoY), **MacRae (Iowa Lakes) 62→73** (2023 DII National Champion + MLS/USL alumni + 2024 National Staff of the Year), **Brown (Iowa Western) 65→75** (2 NJCAA DI titles 2021/24 + a Barton national runner-up + D1 assistant pedigree), **Potter (Northeast) 58→68** (2024 DII National Champion, first in school history), **McBride (Blinn) 66→71** (292 career wins + 13 CoY + 18 pros incl. a full Canadian international), **DiBernardo (Monroe) 72→77** (a 3-DI-title/.760/16-yr dynasty), **Cameron (Phoenix) 68→72** (2025 DII champion + 2× National CoY + 89 D1 transfers), **Dale (AWC) 64→68** (2 national runner-ups + 299 wins + NJCAA Legacy Award), **Sasnett (EFSC) 60→65**, **Melchor (Angelina) 56→60**, **Carrabotta (Westchester) 53→56**. **Elite:** **Clements (Tyler JC) 79→80 (rk-strong→rk-elite)** — the single JUCO coach placed in the elite band (at the floor, rank 22, below all D1 coaches): 7 national titles as HC, 554 wins (2nd all-time NJCAA), NJCAA Hall of Fame, and a real pipeline (100+ pro contracts / 10 MLS / 17 first-division), satisfying the Rootes test (winning + a clear pro pipeline = elite; Rootes 79 was held at top-of-strong precisely for lacking a pipeline). **Halo trimmed:** **Avallone (Daytona State) 74→66** (2025 DI national finalist is real, but only ~3 college HC seasons + a developmental USL/PDL background — the 74 was inflated). The remaining JUCO coaches (first-year/early-career or data-gap-with-no-published-CV) held near baseline in solid (DePalo 63, Ribeiro 61, Cole 61, Ginsberg 61, Simmons/Espinal/Vieira/Hall 60, Lis-Simmons 58, Perry 58, Valencia 57, Plumbar 54, Rodriguez 53). Coach rubric now **107/110 re-scored** (3 legacy = the deferred coach-swaps NC State/Findley, Chapman/Johnson, Santa Monica/Avery); validator Issues **0**; ranks are a gapless 1–110 permutation and all 110 `rankClass` bands are coherent. **§5d re-score campaign COMPLETE.** **Deferred data fixes** (out of scope): dead/wrong host aliases (daytona_state generic→`dscfalcons.com`, blinn coach.url points to the assistant→`buccaneersports.com/.../michael-mcbride/100`); `yearsHC` errors (dibernardo 5→16, brown 5→7, dale null→~20, fisher null→~21, valencia/cosgrove verify); `mlsPlayers`/`licence` backfills (fisher 0→15 + USSF National; mcbride 0→18; clements/depalo confirmed). Next natural focus = the deferred coach swaps (Chapman, NC State, Santa Monica) + the ~10 dead host aliases campaign-wide.

### v43.10 (July 2026) — Coach Rubric Step 2, Batch 9/10: D2/NAIA/D3 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Ninth re-score batch; 11 of the 12 `d2.json` coaches verified live via the in-app Browser against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). **One coach-change deferral — Chapman:** the 2025 staff page (athletics.chapman.edu) lists **Eddie Carrillo '90** (31st season, 268-216-62) as HC, not the stored `johnson_chapman` (Dustin Johnson) — left legacy (no note, ov 52 unchanged), flagged as a Change Type 2 fix → batch ships **11/12**. **The predicted D2/NAIA halo correction landed:** the five baseline 82–86 rk-elite coaches were all halos and came down — **Martorana (PBA) 86→60**, **Young (St. Edward's) 85→73**, **Rootes (Lynn) 84→79**, **Ivanovic (Barry) 83→63**, **Billy Martin (OCU, id `finnegan`) 82→60**. Rootes is the batch's strongest résumé (THREE D2 national titles as HC, 2× D2 National CoY, 512 wins) but held at the TOP of strong not elite — the elite band pairs winning with a clear pro pipeline he lacks. **Under-scored bodies of work corrected UP:** **Erush (Cal State LA) 70→74** (MLS playing career + US-youth-international + LA Galaxy Academy/US-Soccer-scout pedigree + a .735 4-yr HC record, perennial national top-5; the 2021 D2 title was as an assistant), **Smee (UC Charleston) 68→72** (2024 D2 national runner-up as HC + SPL pro playing career + 5× MEC CoY; the program's 2 national titles were his assistant work — scored the coach not the program), **Mason (Columbia College) 55→62** (not a first-year coach — 131-win winningest HC at William Woods 2008-21 + 2017 AMC CoY), **Oldham (Keiser) 68→71** (2021 NAIA national champion as HC + 2× NAIA CoY). **Down:** **McArthur (Nova SE) 74→54** (only ~2 seasons as HC since Jan 2025, no title). **Held:** **Raso (Georgian Court) 64** (13-yr program-founder but sub-.500, 1 CACC title; USSF A + D1 assistant pedigree keep him top-of-solid). 6 rankClass band changes (all downward). Coach rubric now **79/110 re-scored**, validator Issues **0**, global band coherence intact. **Deferred data fixes** (out of Rhythm-B scope): four dead/wrong host aliases (csula `calstatela.edu/athletics`→`lagoldeneagles.com`, keiser `keiseruniversity.edu/athletics`→`kuseahawks.com`, georgian_court `gcuathletics.com`→`gculions.com` [collides with Grand Canyon], columbia_college `cougarathletics.ccis.edu`→`columbiacougars.com`); four `yearsHC` errors (mcarthur_nova 6→2, oldham 3→10, smee 2→6, mason_columbia 1→~15); Chapman coach swap. **NEXT = Batch 10 JUCO (`juco.json`, 29 coaches, v43.11) — the FINAL batch, which also performs the single global re-rank of all 110 by overallScore desc + re-bands every rankClass.**

### v43.9 (July 2026) — Coach Rubric Step 2, Batch 8/10: Ivy 2 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Eighth re-score batch; both `ivy.json` coaches (princeton, yale) verified live via the in-app Browser against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). **No coach-change deferrals** — both baseline names are the current 2026 HCs. **Barlow (Princeton) 87→75 (rk-elite→rk-strong)** — Ivy-prestige/longevity halo stripped: a genuine 29-yr body of work (7 Ivy titles, 237 wins, Bob Bradley coaching-tree successor, ex-US U-15 NT HC, USSF A) but a thin pro pipeline (~5 MLS in 29 yrs, no full internationals) and a first-round NCAA ceiling (no College Cup/Final Four) keep him below the 80 elite floor. **Stannard (Yale) 78→70 (rk-strong, holds)** — halo that had him *above his own former MSU boss* corrected: strong assistant pedigree (6 yrs MSU associate HC, back-to-back Elite Eights 2013/14, developed Chapman/Alashe) + 11-yr HC turnaround with 2 Ivy titles + USSF A, but his marquee development was as an assistant and his own HC pro output is thin (Downs→USL, no MLS as HC); Rensing (HC of those same Elite-Eight runs, 16 MLS draftees, College Cup semi) scores 72, so Stannard lands below him. Ivy note: Princeton/Yale offer no athletic scholarships, but §5d has no division/program ceiling — scored on CV/development, not the recruiting constraint. Coach rubric now **68/110 re-scored**, validator Issues **0**, global band coherence intact. **NEXT = Batch 9 D2/NAIA/D3 (`d2.json`, 12 coaches, v43.10).**

### v43.8 (July 2026) — Coach Rubric Step 2, Batch 7/10: d1-other 6 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Seventh re-score batch; all 6 `d1-other.json` coaches (akron, denver, gcu, uca, vermont, mercyhurst) verified live via the in-app Browser against each school's own men's-soccer staff/bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). **No coach-change deferrals** — all 6 baseline names are the current 2026 HCs. **Vermont watch resolved:** Adrian Dubois is confirmed the current HC; his appearance in the 2025 season bucket is the Sidearm season-trap (Rob Dow coached the 2025 AEC-title team before leaving for Penn State Dec 2025), so Dubois's first D1 season is fall 2026 — scored as a first-year HC, not swapped. Coach rubric now **66/110 re-scored**, validator Issues **0**, global band coherence intact.

- **Embick (Akron) 88 HELD** — named §5d elite anchor confirmed. HC since 2013 (assistant on the 2010 national-champion program), contract to 2035, multiple MAC titles, 2021 College Cup (Final Four), 18 MLS draft picks (Jaaskelainen #7 overall 2024), USSF A. Held at the elite-band floor (Final Four, not an NCAA title, as HC).
- **Franks (Denver) 84 → 86 (mild UP, under-anchored)** — TWO College Cups as HC (2016 & 2024, the only two in program history), NCAA 10 of 11 seasons, 5× Summit CoY + 2016 National Coaching Staff of the Year, six first-round MLS picks incl. Andre Shinyashiki (2019 MLS Rookie of the Year); national champ as a Wake Forest player. Held just below Embick 88 on Akron's longevity/pipeline depth.
- **Davies (GCU) 79 → 73 (DOWN — program/facilities-momentum halo trimmed)** — appointed GCU's 7th HC Dec 2025, so only ~2 years as a D1 HC (UNF 203rd→#46 turnaround, 2 conf doubles + 2 NCAA) atop a strong UCF associate-HC pedigree (3 AAC titles, 2 Sweet 16s, #1 ranking 2023) + USSF A; held to mid-strong by no NCAA advancement AS a HC and a thin personal pro pipeline.
- **Segebart (UCA) 72 → 59 (DOWN — assistant-built results-halo + mis-counted tenure stripped; rk-strong → rk-solid)** — named HC only Dec 3 2024 (first season 2025); the ASUN runner-up finishes were his *assistant* work under Kohlenstein. USSF A-Senior + GK 2 licence and NZ youth-international development, but 0 MLS output and a USL-level playing career → first-year D1 HC just above the Sarachan (58) tier. Deferred data fixes: yearsHC 4→1, licence null→USSF A-Senior.
- **Dubois (Vermont) 66 HELD** — current HC confirmed; first D1 season (yet to coach a game). Low-strong justified by 5 seasons as a DIII head coach (3 conf titles at Saint Joseph's ME) + AD-attributed recruiting/development of the 2024 national-champion roster (2 MLS SuperDraft, top-12 national assistant 2022) + SDSU 2024 WAC-title associate HC + a 4-year D1 starting-midfielder playing career. Held at 66 by zero D1 HC games; not lower (vs Sarachan 58) for the real D3 HC titles.
- **Solomon (Mercyhurst) 62 HELD** — now scored on merit (the v42.34 data-gap hold is resolved). Own HC achievement: NEC regular-season title + NEC Coaching Staff of the Year in Mercyhurst's first D1 season (2024); 11-year single-program apprenticeship + 2012 D2-Final-Four playing captain. Held mid-solid by only 2 D1 seasons (2025 regressed to 8th/10), single-program career, no USSF licence noted, and 0 attributable pro output.

Files: `data/coaches.json` (6 coaches via CRLF-preserving json round-trip — byte-identical no-op verified first + guard asserting only the 3 fields on only the 6 ids changed, no floats), `athletes/olivier.json` (v43.7→v43.8), `CHANGELOG.md`, `CLAUDE.md` §6 marker. Browser-verified localhost:8787: served coaches.json all 6 correct/coherent/notes≥20, count_rescored=66, 0 incoherent, Coaches tab renders all 6 new Overall badges, zero console errors. No fitOlivier cascade. **Deferred data fixes:** Segebart yearsHC 4→1 + licence null→USSF A-Senior; four of the six store `licence:null` where a credential exists (Franks, Dubois — verify; Embick null→USSF A per its own bio). **NEXT = Batch 8 Ivy (2 coaches, v43.9).**

### v43.7 (July 2026) — Coach Rubric Step 2, Batch 6/10: CAA 9 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Sixth re-score batch; all 9 CAA coaches (grouped by `caa.json` schoolId) verified live via Chrome MCP against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). **No coach-change deferrals** — all 9 baseline names matched the live 2026 staff pages. Coach rubric now **60/110 re-scored**, validator Issues **0**, global band coherence intact.

**Corrections (up — under-scored veterans / data-gap, the Kuntz/Gunn pattern):**
- **Robert McCourt (Monmouth) 52→72 (rk-solid→rk-strong)** — THE find: at 52 (rank 107, near-last) off a data-gap + recent-form inverse halo (the stored bio omitted his entire record). monmouthhawks.com: 23rd-year HC, **204-129-73 (.592), 12 conference regular-season titles + 7 conference tournament titles (NEC/MAAC/CAA), 5 NCAA apps, 5× Conference CoY + 4× NSCAA Regional CoY, USSF 'A' license**; standout Pillar B — **~22 pros incl. 10+ MLS draftees** (Meredith 29th overall, Klenofsky 34th, Kinne, RJ Allen, Jeffery, Ryan Clark #1 supplemental). Held below the 74 pair by a 2nd-round NCAA ceiling + smaller-conference titles.
- **Marc Reeves (Elon) 65→71 (stays rk-strong)** — under-scored 16-yr multi-conference body of work. elonphoenix.com: Radford (2010-16) + Elon (2017-), 142-101-46, **6 conference titles (3 Big South reg-season + Big South tourney 2016 + 2 CAA reg-season 2022/24) + CAA Tournament 2025, 4× Conference CoY, 4 NCAA berths as HC, USSF 'A' license**, elite St. John's assistant pedigree (2003 national-title game, 3 Final Fours). Held below 74 by a thin pro pipeline.
- **Chris Norris (William & Mary) 63→68 (rk-solid→rk-strong)** — dated-peak inverse halo. tribeathletics.com: 23rd-year HC, 166-169-60 (.496 — reflects one of the hardest-recruiting academic publics), **2 CAA Championships (2010, 2017), Sweet Sixteen 2010, 4 NCAA berths as HC, CAA + NSCAA Region CoY 2010**. Two conf titles + a Sweet 16 exceed the solid band.
- **David Castellanos (Drexel) 60→66 (rk-solid→rk-strong)** — data-gap (stored bio omitted his playing CV, licence & titles). drexeldragons.com: **2000 UConn College Cup champion as a player** + pro (Colorado Rapids/MLS), **USSF Senior 'A' + 'B' licenses**; 15 seasons D3 HC at Penn State Abington (142-98-21, 3 NEAC titles, 2 NCAA D3, 3× CoY); strong D1 debut (2024: 2nd in CAA, beat #14 Hofstra, developed CAA Co-Midfielder of the Year).
- **Ryan Anatol (Stony Brook) 58→63 (stays rk-solid, top of band)** — v42.34 held 58 pre-campaign; now scored on merit. stonybrookathletics.com: winningest in program history (98-116-39, a tough SUNY rebuild), 2011 AE Championship + NCAA, 2023 CAA CoY, 2025 first-ever CAA Championship game (beat #1 Hofstra away); USF Elite-Eight assistant pedigree (8 MLS players), USSF 'A' license. Losing 15-yr record + boom-bust seasons cap him at the top of solid.
- **Tommy McMenemy (Delaware) 65→66 & Jeremy Bonomo (Northeastern) 66 held** — McMenemy: high-major Michigan associate-HC pedigree (first-ever Big Ten title 2017, developed 2 Big Ten Offensive POYs) + record-breaking 2025 (#1 nationally in scoring), but no HC title/NCAA berth yet. Bonomo: coherent low-strong (2× Horizon CoY + a title + NCAA app at Green Bay); held.

**Corrections (down — halos stripped):**
- **Keith Wiggans (Charleston) 76→61 (rk-strong→rk-solid)** — a program-trajectory/Charleston-city halo. cofcsports.com: 7th-year HC, pro playing career (Charleston Battery/USL), but **33-39-21 (.462), CAA 13-22-10 — a losing record, NO CAA title and NO NCAA berth as HC** (his 2010 SoCon title was as an assistant); thin pro pipeline (Leland Archer). A solid-band coach.
- **Stephen Roche (Hofstra) 72→65 (stays rk-strong)** — strips the program's titles from a first-year HC's personal score. gohofstra.com: became HC Jan 2026 (0 D1 HC games); 10 seasons as tactical + recruiting lead behind 4 CAA titles + 6 MLS draftees, USL2 HC — but 0 D1 HC games, modest playing CV, and a low USSF 'D' licence hold him at the strong-band floor (above Sarachan/Butler 58 for the deeper architect résumé).

**Deferred data fixes (out of Rhythm-B scope — for dedicated Change-Type-2 sessions):** four CAA coaches store `licence: null` but hold a **USSF 'A' license** live (Anatol, Castellanos, Reeves, McCourt); Monmouth's `mlsPlayers` is 0 but McCourt has 10+ MLS draftees; Delaware's stored bio wrongly says "moved to Conference USA" (men's soccer plays in the Summit League); Northeastern's stored host `gonu.com` redirects to `nuhuskies.com` (6th dead-alias-class host — full url sweep still overdue). Stony Brook's `minutesOutlook` is now scrapable (roster renders live).

### v43.6 (July 2026) — Coach Rubric Step 2, Batch 5/10: Big West 7 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Fifth re-score batch; all 7 Big West coaches (grouped by `big-west.json` schoolId) verified live via claude-in-chrome MCP against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). No coach-change deferrals — all 7 baseline names matched the live 2026 staff pages. Coach rubric now **51/110 re-scored**, validator Issues **0**, global band coherence intact.

**Anchor held:** Vom Steeg (UCSB, 90 — national-elite floor: 2006 NCAA National Champion + 2004 College Cup finalist, 2× National Coach of the Year, 15 NCAA apps with real depth — 8 Sweet 16s / 3 Elite Eights / 2 College Cups — and a prolific pipeline of 32 MLS draftees incl. Manu Duah #1 overall 2024; single title + USSF B licence keep him at the band floor, not higher).

**Corrections (up — under-scored veterans / data-gap, the Gunn/Clark/Kuntz pattern):**
- **George Kuntz (CSU Fullerton) 50→68 (rk-solid→rk-strong)** — biggest correction; a recent-form inverse halo (2021-24 Fullerton dip) had him at 50/last. fullertontitans.com: 28-yr D1 veteran, 388 career wins; **built UC Irvine into a Big West power 1995-2013** (4 NCAA, Round of 16 in 2008) then 3 more NCAA berths at Fullerton = **7 Big West Tournament titles, 8 conference championships, 7 NCAA appearances, 4× Big West CoY + 2× NSCAA Far West CoY, USSF 'A' licence, 12 MLS players**.
- **Tim Cupello (UC Riverside) 48→65 (rk-solid→rk-strong)** — a data-gap under-score (stored bio omitted every achievement); had him at 48/last. gohighlanders.com: 14th season, 2022 Big West CoY, 2 Big West Tournament titles (2018/22) → 2 NCAA apps; standout Pillar B — developed **Aaron Long (LAFC, USMNT captain + 2022 FIFA World Cup)** plus a dozen+ pros.
- **Dwayne Shaffer (UC Davis) 62→68 (rk-solid→rk-strong)** — 29-yr veteran, 317 career wins (top-15 active winningest), 5 NCAA apps, 4× Conference CoY, strong 3-yr Clemson associate-HC pedigree, pro pipeline headlined by Max Arfsten (2023 MLS Cup + 2025 USMNT).
- **Yossi Raz (UC Irvine) 64→66 (rk-solid→rk-strong)** — 3 Big West Championships → 3 NCAA apps, 3× Big West CoY, a 2015 NCAA D2 National Runner-Up at Cal Poly Pomona. (Note: Raz *succeeded* Kuntz at UCI in 2017 — he did not build the program.)

**Correction (down — inflation trimmed):**
- **Oige Kennedy (Cal Poly) 73→67 (stays rk-strong)** — 2 Big West *regular-season* titles + 2024 CoY but **no D1 NCAA berth** in 4 D1 seasons; strong D2 record (Fort Lewis .723) + Stanford national-champ-era assistant pedigree (20 MLS picks, shared credit) keep him low-strong, not 73.

**Held:** Jon Pascale (UCSD 58) — strong D2 record (3× CCAA CoY, 2016 NCAA D2 National Semifinal) but a poor D1 era (5 straight losing Big West seasons since the 2021 elevation) + thin pro pipeline; the stored "competitive Big West performances post-elevation" is inaccurate.

**Deferred data fixes (out of Rhythm-B scope):** (1) Kuntz `licence` None→USSF A. (2) Cupello `yearsHC` 8→14. (3) **Two more dead-host aliases** (Pitt/Stony Brook/UAB pattern, now 5 total): UC Irvine `ucirvineantares.com`→`ucirvinesports.com` and UC Riverside `ucrhighlanders.com`→`gohighlanders.com` (both error/blank; fix coaches.json url + big-west.json url + app.js DOMAINS). A full 110-school url sweep is now clearly overdue.

---

### v43.5 (July 2026) — Coach Rubric Step 2, Batch 4/10: AAC 10 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Fourth re-score batch; all 10 AAC coaches (grouped by `aac.json` schoolId) verified live via claude-in-chrome MCP against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). No coach-change deferrals — all 10 baseline names matched the live 2026 staff pages (Army = **Brian** Plotkin, distinct from DePaul's Mark Plotkin; Temple = Bryan Green — both confirmed). Coach rubric now **44/110 re-scored**, validator Issues **0**, global band coherence intact.

**Anchors confirmed & held:** Hackworth (Navy, 74 — the §5d worked anchor: ex-MLS HC Philadelphia Union, 2018 USL Championship, USMNT U-17 World Cup HC, 2025 MLS NEXT Pro CoY, USF 1998 CUSA title; elite CV at a service-academy program). Plotkin (Army, 70 — the named §5d sub-anchor below Hackworth: 2× Indiana national champ as a player, MLS Cup, USSF 'A', Notre Dame/Dartmouth pedigree, capped by the service-academy ceiling).

**Corrections (down — halos stripped):**
- **Kyle Russell (FIU) 91→73 (rk-elite→rk-strong)** — a prestige/results halo (the Jorden/UCLA pattern). fiusports.com: 52-33-18 (.592) over 6 seasons, 2021 CUSA CoY, 3 conf finals, but ceiling = 2022 Sweet 16 with a clear 2024-25 decline (.500/.447); USL-level playing career. Pillar B modest — Afrifa (8th overall MLS 2022) + Appiah (3rd rd); the stored "14 MLS draftees" is FIU's program-cumulative total, NOT under Russell.
- **George Kiefer (USF) 88→83 (stays rk-elite)** — a deep 24-season, multi-program résumé (230-151-82, 14 NCAA apps, **2 Elite Eights** at USF, 5 conf titles; 2025 WAC title + Sweet 16 at GCU; D2 national champ as a player; UConn 2000 national-champ staff), but the Elite-Eight ceiling (no College Cup) + moderate pro output sit him just below the national-title anchors (below Masur 85).
- **Joey Worthen (FAU) 72→62 (rk-strong→rk-solid)** — corrects a factual error: the stored "debut season"/`yearsHC=1` is WRONG (fausports.com: he completed his **ninth** season in 2025, HC since Feb 2017). The 2025 AAC double + first NCAA berth is real, but 8 prior seasons without an NCAA appearance, a mid-table C-USA history, and **no documented pro output** cap him mid-solid.
- **Bryan Green (Temple) 58→56** — his standout credentials (Louisville associate HC through a 2019 Sweet 16 + 2021 ACC title) are ASSISTANT-level; his own D1 HC record is poor (22-69-13 / .267 across Belmont + Temple).

**Corrections (up — under-scored):**
- **Kevin Langan (Charlotte) 65→74** — a mid-major standout under-scored at the strong-band floor. charlotte49ers.com: 154-64-38 (.679) over 14 seasons, **11 NCAA appearances**, multiple conf titles, 2016 CUSA CoY, **16 players in the pros**, 5 All-Americans (stored `mlsPlayers=1` badly undercounts); ceiling is the NCAA 2nd round (no Sweet 16), keeping him upper-strong not elite.
- **Tom McIntosh (Tulsa) 62→68 (rk-solid→rk-strong)** — deeper NCAA runs than Langan/Russell: 31st season, 293-210-63, 12 conf titles, 12 NCAA appearances incl. **2 Elite Eights (2004/09) + 3 Sweet 16s**. Held low-strong by a college-only playing career, a thin pro pipeline, and recent decline (3-9-3 in 2024).
- **Richard Mulrooney (Memphis) 58→64 (top of solid)** — elite playing pedigree (3 MLS Cups, USMNT 2002 Gold Cup winner + World Cup alternate, Creighton 1996 College Cup) + a genuine program rebuild (back-to-back NCAA 2022-23, first-ever NCAA win, 2024 AAC reg-season title); held below strong by ~3 NCAA apps (none pre-2022) and thin pro development.
- **David Lilly (UAB) held 56** — early-career D1 with a positive but low/mid-major record (2023 SoCon title + CoY at ETSU, Milligan NAIA), no D1 NCAA berth as HC.

**Deferred data fixes (out of Rhythm-B scope this batch):** (1) Worthen `yearsHC` 1→9/10 + rewrite the false "debut season" record field (Change Type 2). (2) **UAB dead-host alias** — `blazerssports.com` → `uabsports.com` (in coaches.json `url`, aac.json `url`, and app.js DOMAINS favicon); the third dead-alias of the Pitt/Stony Brook pattern. (3) Russell record field: "14 MLS draftees" is program-cumulative, not under him.

---

### v43.4 (July 2026) — Coach Rubric Step 2, Batch 3/10: Big East 11 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Third re-score batch of the §5d campaign; all 11 Big East coaches (grouped by `big-east.json` schoolId) verified live via claude-in-chrome MCP against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). No coach-change deferrals — all 11 baseline names matched the live 2026 rosters. Coach rubric now **34/110 re-scored**, validator Issues **0**.

**Anchors confirmed & held:** Wiese (Georgetown, 95 — §5d anchor: 2019 NCAA National Champion, 3 College Cups, 42 MLS + EPL/Scottish signees, Hermann winner Polvara, trained 10 yrs under Bobby Clark; documented tree, USSF A). Plotkin (DePaul, 60 — the §5d low-solid calibration anchor; DePaul HC 32-51-26 / .407, one real pro product in GK Brian Schwake/2026 MLS All-Star). Torres (Creighton, 74→75) sits at the §5d Creighton ~75 calibration point (2× National Player of the Year, 2022 College Cup, developed Hermann winner Duncan McGuire).

**Corrections (up):**
- **Craig Stewart (Providence) 63→74 (rk-solid→rk-strong)** — THE find of the batch: the stored bio was a data-gap ("mid-table Big East", no CV). His real record (friars.com): 178-90-39 over 14 yrs, **2014 Big East Champions + NCAA College Cup SEMIFINAL**, NCAA Elite Eight 2016, Sweet 16 2019 & 2021, Big East Finals 2021 & 2024; elite D2 at Franklin Pierce (51-8-6, 2011 NCAA Final Four); Newcastle United youth academy player. A College Cup semifinalist with four deep NCAA runs was mis-filed in the solid band by an empty bio — the same data-gap pattern as ACC's Gunn / Big Ten's Clark.
- **Dr Dave Masur (St. John's) 80→85 (stays rk-elite)** — a national-champion, 468-win career-long CV floored at the elite-band bottom by recent mid-table form. redstormsports.com: 1996 NCAA National Champion, 468 career wins (2nd-winningest active D1), 4 College Cups, 2× national COY; developed Hermann winner Chris Wingert + full international Tani Oluwaseyi (Canada) + 1st-round MLS Tim Parker.
- **John Higgins (Xavier) 63→67 (rk-solid→rk-strong)** — strongest D2 record of the Big East transplants (UIndy 150-56-29, 2 D2 national semifinals), won the **2023 Big East Tournament title over #3 Georgetown** (Xavier's first), best pro output of the tier — two 1st-round MLS picks (Senanou #6 overall 2025, Jensen #18 2023); recent team-form dip excluded per §5d.
- **Andreas Lindberg (Seton Hall) 64→65 (rk-solid→rk-strong)** — elite D2 dynasty at LIU-Post (139-30-15, 4 NCAA region titles, a D2 National Player of the Year), USSF 'A' licence, and a D1 credential in the **2020 Big East Tournament title + NCAA quarterfinal**.
- **Chris Gbandi (UConn) 73→74**, **Mark Fetrow (Villanova) 48→52** — Gbandi for the 2025 Sweet-16 rebuild atop an elite playing CV (#1 overall MLS pick, 2000 Hermann, national champ as player, Liberia international); Fetrow strips the inverse results-halo of Villanova's recent last-place finishes (a team result), a thin-but-legitimate CV (Drexel .719 season, 8-yr apprenticeship, MLS-drafted) keeping him low-solid.

**Held on evidence:** Wiese 95, Torres 75, Plotkin 60, Korn (Marquette, 64 — D2 Maryville 98-38-26, 3× Elite 8, no D1 title/pro pipeline yet; top of solid), Sarachan (Butler, 58 — first-year HC, strong assistant pedigree incl. Colorado Rapids MLS + Creighton College Cup staff, unproven as a HC). rankClass band changes: Stewart, Higgins, Lindberg (all solid→strong). No `fitOlivier` cascade (scores.js never reads coaches.json). **NEXT = Batch 4 AAC (10 coaches, v43.5); anchor Hackworth/Navy 74.**

### v43.3 (July 2026) — Coach Rubric Step 2, Batch 2/10: Big Ten 11 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

Second re-score batch of the §5d campaign; all 11 Big Ten coaches (grouped by `big-ten.json` schoolId) verified live via claude-in-chrome MCP against each school's own men's-soccer bio page (§15 Rule 0). Edits `overallScore` + `overallScoreNote` + `rankClass` only; stored `rank` left stale until the Batch-10 global re-rank (Rhythm B). No coach-change deferrals — all 11 baseline names matched the live 2026 rosters. Coach rubric now **23/110 re-scored**, validator Issues **0**.

**Anchors confirmed & held:** Cirovski (Maryland, 96 — 3× NCAA champ, 464 wins, 59 MLS picks, 6 World Cup players), Yeagley (Indiana, 95 — 2012 champ, 5 College Cups, 11 Big Ten titles, 44 MLS selections). **Held on evidence:** Dow (Penn State, 85 — freshly-set 2024 Vermont national champion, confirmed), Maisonneuve (Ohio State, 82 — full US international + Hermann winner + 2024 College Cup semifinal), Payne (Northwestern, 79 — USMNT GK coach, developed Steffen), Daley (Michigan, 78 — Big Ten COY, 8 MLS picks), Jones (Wisconsin, 71 — 2 MVC titles), McElderry (Rutgers, 70 — solid Big Ten HC).

**Corrections:**
- **Jamie Clark (Washington) 68 → 92 (rk-strong → rk-elite).** The batch's biggest find — his own gohuskies.com bio shows Washington are the **2025 NCAA National Champions** under Clark, plus 2021 NCAA finalist, 4× Pac-12 COY, 5 NCAA quarterfinals, 190 wins/.708 at UW, 30 MLS players developed. A reigning national champion was sitting at solid/strong 68 (a recent-form inverse halo, same class as ACC's Gunn 81→95). National-elite, below the multi-title anchors. **NB the stored coaches.json bio is stale** ("beat UCLA 2025" completely misses the title) — flagged for a Change Type 2 bio refresh.
- **Damon Rensing (Michigan State) 61 → 72 (rk-solid → rk-strong).** Under-scored: msuspartans.com bio shows a 2018 College Cup semifinal (first in 50 years) + 3 Elite Eights, a 2012 Big Ten Tournament title, NSCAA Regional COY, and a strong Pillar B — 16 MLS draftees recruited/coached incl. Fatai Alashe (4th overall) and first-rounders Jones/Sierakowski/Nielsen. Stored 61 was depressed by a recent 5-year slump (recent form ≠ career fingerprint).
- **Ryan Jorden (UCLA) 93 → 84 (stays rk-elite).** UCLA-crest prestige halo stripped per §5d. His uclabruins.com bio shows real credentials (2 high-major conference titles — 2023 Pac-12, 2025 Big Ten — 17 MLS incl. two top-10 picks, 5 straight NCAAs, PhD biomechanics) but NO NCAA title and a best NCAA result of the 3rd round (his 2× "national titles" are NCCAA, a minor division). The 93 implied the NCAA-champion pedigree the rubric reserves for that band; low-elite 84 fits, below national champions Dow (85) and Somoano (88). Jorden was a "hold unless contradicted" baseline — the evidence contradicted, and leaving a no-NCAA-title coach above reigning champion Clark would be incoherent.

rankClass band changes: Clark (strong→elite), Rensing (solid→strong). Two deferred items carried forward: (1) Clark's stale bio (Change Type 2 refresh — add the 2025 national title), (2) the campaign-wide global re-rank still owed at Batch 10.

---

### v43.2 (July 2026) — Coach Rubric Step 2, Batch 1/10: ACC 12 coaches re-scored vs §5d (Rhythm B — no re-rank yet)

First re-score batch of the §5d campaign. Rhythm decided this session: **commit scores per batch, re-rank ONCE at the end (Batch 10)** — the committed §5d "re-rank once" / Solomon rule. §5a's per-batch pattern does not transfer because devScores are absolute per-school while coach `overallScore` feeds a *relative* global ranking that is only truthful once all 110 sit on the same yardstick. So this batch edits `overallScore` + `overallScoreNote` + `rankClass` only; the stored `rank` ordinals are deliberately left stale until the global re-rank (the validator checks rank is a 1..110 permutation, not that order matches score — stays green).

- **12 of 13 ACC coaches re-scored** against §5d, each with a Tier-1 `overallScoreNote` from the school's own men's-soccer bio page (Chrome MCP, §15 Rule 0).
  - **Anchors confirmed & held:** Gelnovatch 98, Noonan 97, Somoano 88.
  - **Held on evidence:** Muuss 86, Griffin 75, Hayden 61.
  - **Halos stripped (down):** Riley 91→84 (ND prestige/poll halo), Hudson 89→85, Kerr 84→82 (Duke-brand halo).
  - **Under-scores corrected (up):** **Gunn 81→95** (3 consecutive NCAA titles 2015-17 — only he and Arena ever; Jordan Morris/USMNT; prior 81 scored recent form, an inverse halo) and **McIntyre 79→83** (2022 national champion + two full internationals developed — Robinson/USMNT, Buchanan/Canada; rk-strong→rk-elite).
  - **Vidovich (Pitt) held at 76** — bio prose would not render (WMT event-widget trap on this host); cross-referenced Tier-1 (2007 Wake Forest title, coaching tree). **Flagged as a likely upward-re-score candidate** for a session that can render the bio; 76 also preserves the §5d Hackworth<mentor-Vidovich marker.
- **13th ACC coach deferred:** NC State's baseline coach **Kelly Findley has departed — Marc Hubbard is now HC** (confirmed on the current 2026 roster). Per owner decision, coach changes discovered mid-campaign are handled as **dedicated Change Type 2 fixes**, not folded into a re-score batch. Findley left as legacy (no §5d note, no score change) pending that fix. So ACC = **12/13 re-scored**.
- Only one `rankClass` change (McIntyre rk-strong→rk-elite); all others stayed in-band. Coach scores have **no fitOlivier cascade** — no school Fit rank moved.
- **Verified:** `node validate_consistency.js` → **Issues: 0**, `Coach rubric (§5d): 12/110 re-scored`. Browser (localhost:8787): 110 coach cards render, `coachData` reflects new scores/notes/rankClass, Findley confirmed legacy (note-length 0), no console errors. guideVersion v43.1 → v43.2.

---

### v43.1 (July 2026) — Coach Rubric Step 1: `overallScoreNote` field + gated `COACH-RUBRIC` validator (baseline held at 0)

Builds the guardrail for the §5d re-score campaign without moving the baseline — the coach analog of §5a's Step 1 (`devScoresNote`, v42.1). No coach score or rank changed.

- **`overallScoreNote` added to the coaches.json schema (§5).** A substantive note (string, ≥20 chars) citing the Tier-1 CV/development evidence marks a coach as re-scored against §5d. Presence is a **one-way door**, exactly like `devScoresNote`: once written it permanently activates the check for that coach.
- **`COACH-RUBRIC` check added to `validate_consistency.js`** — gated on the note. Scored coach ⇒ verify `overallScore` is an integer 0–100. Note present but <20 chars ⇒ flagged non-substantive. No note ⇒ legacy, reported as backlog **progress, not an issue** — so day one holds at `0/110 re-scored · 110 legacy pending`, Issues unchanged. (overallScore is holistic per §5d — there is no formula to recompute, so unlike fitOlivier it is not recalculated, only range/integer-checked.)
- **Global rankClass↔score band-coherence check added** (all 110, not gated): elite ≥80 / strong 65-79 / solid ≤64. A badge colour that contradicts the score is always wrong; current data is fully coherent, so it holds at zero — and it will catch a re-rank slip during Step 2.
- **New progress line** in the validator report: `Coach rubric (§5d): X/110 re-scored · Y legacy pending`.
- **Verified:** `node --check validate_consistency.js` OK; full run **Issues: 0** (unchanged); gate proven on a scratchpad copy across 5 cases (baseline, valid note, placeholder note, band mismatch, non-integer score) — each fired exactly as designed; real `coaches.json` never touched.
- Not observable in the browser (validator-only + schema doc). guideVersion v43.0 → v43.1.

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

