# CLAUDE.md — US College Soccer Athlete Recruitment Platform
# Standing orders for Claude Code. Read this file before touching anything else.

---

## 1. What This Is

A multi-file, multi-athlete web application hosted at **bustachat.github.io/olivier-guide**.

- Athlete: Olivier — Australian central midfielder, ACU BESS degree, targeting DPT/Chiropractic
- Owner: Multi Skilled Contractors (Platform Sports Management)
- Current version: **v45.05 (2026-08-22)** — always verify with `git log --oneline -1` and `athletes/olivier.json` guideVersion; treat any hardcoded version in prose as a hint, not truth (this line itself sat stale at v42.18 for 13 versions until v44.31, which is part of why §6 was cut back in v44.54 — a section nobody finishes reading is a section nobody updates)
- Strategic intent: platform will be onsold to other agencies. Architecture must stay clean.

Stack: Vanilla HTML/CSS/JS. No framework. No build step. GitHub Pages hosting.
Fetch-based data loading — **never open index.html via file://**. Use `npx serve .` or `python3 -m http.server 8000`.

---

## 2. EXPLORE PHASE — Mandatory Before Every Session

**Do not write, edit, or suggest any code until all of these steps are complete.**
**This is not optional. The most expensive errors in this project came from skipping this phase.**

### Step 1 — Read the repo state
```bash
git fetch origin                # Is local behind origin? "git log -10" alone can't tell you this.
git log --oneline -10           # What version is live? What changed last?
git status                      # Any uncommitted changes? (post-fetch, this also shows ahead/behind)
git diff                        # If changes exist — what are they exactly?
```
**`git fetch origin` first, always — not optional.** On 2026-08-07 a session skipped this, worked from a local `main` that was 16 days / 65 commits behind `origin/main`, and after a `git pull` correctly merged the real history back in, reset past that merge and force-pushed the stale-based commit — silently dropping the entire COA cost campaign and roster refresh from `origin/main` for about a day (recovered 2026-08-08, see §6). `git log --oneline -10` on a stale local branch looks completely normal; it will not tell you 65 commits are missing. A fetch will.

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

| Conference | File | Schools (all full-profile as of v26) |
|---|---|---|
| ACC | `data/acc.json` | Virginia, Wake Forest, SMU, Clemson, Notre Dame, UNC, Duke, NC State, Louisville, Pitt, Stanford, Syracuse, Cal (13) |
| Big Ten | `data/big-ten.json` | UCLA, Indiana, Maryland, Penn State, Michigan, Michigan State, Ohio State, Northwestern, Wisconsin, Rutgers, Washington (11) |
| Big East | `data/big-east.json` | St John's, Georgetown, Creighton, UConn, Providence, Villanova, Marquette, Butler, Seton Hall, DePaul, Xavier (11) |
| AAC | `data/aac.json` | FIU, USF, FAU, Tulsa, Memphis, Temple, UAB, Navy, Army, Charlotte (10) |
| Big West | `data/big-west.json` | UCSB, Cal Poly, UC Davis, UC Irvine, UC Riverside, UC San Diego, CSU Fullerton (7) |
| CAA | `data/caa.json` | Charleston, William & Mary, Hofstra, Northeastern, Drexel, Elon, Monmouth, Stony Brook (8) |
| Non-major D1 (MAC, WAC, WCC, ASUN, AEC, NEC, Summit) | `data/d1-other.json` | Akron (MAC), GCU (WAC), Denver (WCC), Vermont (AEC), Mercyhurst (NEC), UCA (ASUN), Delaware (Summit) (7) |
| JUCO | `data/juco.json` | Tyler JC, Indian Hills, Daytona State, Iowa Western, Santa Monica, Miami Dade, Monroe, Northeast CC, Barton CC, Cowley CC, Arizona Western, Eastern Florida State (12) |
| Ivy League | `data/ivy.json` | Princeton, Yale (2) |
| D2, NAIA, D3 | `data/d2.json` | Nova SE, Barry, Lynn, PBA, Cal State LA, St. Edward's, Georgian Court, U of Charleston, Columbia College, Oklahoma City, Keiser, Chapman (12) |

### School → File Reference Table (170 schools)

**Maintenance rule: update this table whenever a school is added, removed, or changes conference file.**
This applies to Change Types 1, 8, and 10 — it is a required step in Phase 6 (commit checklist).

| School | File | ID | Div | Conference |
|---|---|---|---|---|
| Akron | `data/d1-other.json` | `akron` | D1 | Big East (men's soccer, from 2023; MAC for other sports — filed in d1-other.json but grouped Big East via confKey) |
| Angelina College | `data/juco.json` | `angelina_college` | JUCO | NJCAA DI / Region 14 |
| Arizona Western | `data/juco.json` | `arizona_western` | JUCO | NJCAA DI / ACCAC |
| Army | `data/aac.json` | `army` | D1 | Patriot League (men's soccer; AAC for other sports — filed in aac.json but grouped Patriot via confKey) |
| Barry | `data/d2.json` | `barry` | D2 | Sunshine State (SSC) |
| Barton CC | `data/juco.json` | `barton_cc` | JUCO | NJCAA DI / KJCCC |
| Blinn College | `data/juco.json` | `blinn_college` | JUCO | NJCAA DI / Region 14 |
| Butler | `data/big-east.json` | `butler` | D1 | Big East |
| Cal | `data/acc.json` | `cal` | D1 | ACC |
| Cal Poly | `data/big-west.json` | `calpoly` | D1 | Big West |
| Central Georgia Tech | `data/juco.json` | `central_georgia_tech` | JUCO | NJCAA DI / Region 17 |
| Cal State LA | `data/d2.json` | `csula` | D2 | CCAA |
| Casper College | `data/juco.json` | `casper_college` | JUCO | NJCAA DI / Region 9 |
| Central Wyoming College | `data/juco.json` | `central_wyoming` | JUCO | NJCAA DI / Region 9 |
| Chapman | `data/d2.json` | `chapman` | D3 | SCIAC |
| Charleston | `data/caa.json` | `charleston` | D1 | CAA |
| Charlotte | `data/aac.json` | `charlotte` | D1 | AAC |
| Clemson | `data/acc.json` | `clemson` | D1 | ACC |
| Coastal Bend College | `data/juco.json` | `coastal_bend_cc` | JUCO | NJCAA DI / Region 14 |
| Coffeyville CC | `data/juco.json` | `coffeyville_cc` | JUCO | NJCAA DI / KJCCC |
| College of Southern Idaho | `data/juco.json` | `college_of_southern_idaho` | JUCO | NJCAA DI / Region 18 |
| College of Southern Nevada | `data/juco.json` | `csn_college` | JUCO | NJCAA DI / ACCAC |
| Colorado Northwestern CC | `data/juco.json` | `colorado_northwestern_cc` | JUCO | NJCAA DI / Region 18 |
| Columbia College | `data/d2.json` | `columbia_college` | NAIA | AMC |
| Community Christian College | `data/juco.json` | `community_christian_college` | JUCO | NJCAA DI / ACCAC |
| Connors State College | `data/juco.json` | `connors_state` | JUCO | NJCAA DI / Region 2 |
| Cowley CC | `data/juco.json` | `cowley_cc` | JUCO | NJCAA DI / KJCCC |
| Creighton | `data/big-east.json` | `creighton` | D1 | Big East |
| Crowder College | `data/juco.json` | `crowder_college` | JUCO | NJCAA DI / Region 16 |
| CS Fullerton | `data/big-west.json` | `csuf` | D1 | Big West |
| Daley College | `data/juco.json` | `daley_college` | JUCO | NJCAA DI / Region 4 |
| Daytona State | `data/juco.json` | `daytona_state` | JUCO | NJCAA DI / FCSAA |
| Delaware | `data/d1-other.json` | `delaware` | D1 | Summit League |
| Denver | `data/d1-other.json` | `denver` | D1 | WCC (from 2026) |
| DePaul | `data/big-east.json` | `depaul` | D1 | Big East |
| Dodge City CC | `data/juco.json` | `dodge_city_cc` | JUCO | NJCAA DI / KJCCC |
| Drexel | `data/caa.json` | `drexel` | D1 | CAA |
| Duke | `data/acc.json` | `duke` | D1 | ACC |
| Eastern Arizona College | `data/juco.json` | `eastern_arizona` | JUCO | NJCAA DI / ACCAC |
| Eastern Florida State | `data/juco.json` | `efsc` | JUCO | NJCAA DI / FCSAA Region 8 |
| Eastern Oklahoma State College | `data/juco.json` | `eastern_oklahoma_state` | JUCO | NJCAA DI / Region 2 |
| Elon | `data/caa.json` | `elon` | D1 | CAA |
| FAU | `data/aac.json` | `fau` | D1 | AAC |
| FIU | `data/aac.json` | `fiu` | D1 | AAC |
| Garden City CC | `data/juco.json` | `garden_city_cc` | JUCO | NJCAA DI / KJCCC |
| GCU | `data/d1-other.json` | `gcu` | D1 | WAC |
| Georgetown | `data/big-east.json` | `georgetown` | D1 | Big East |
| Georgian Court | `data/d2.json` | `georgian_court` | D2 | CACC |
| Gillette College | `data/juco.json` | `gillette_college` | JUCO | NJCAA DI / Region 9 |
| Glendale CC | `data/juco.json` | `glendale_cc_az` | JUCO | NJCAA DII / ACCAC |
| Hagerstown CC | `data/juco.json` | `hagerstown_cc` | JUCO | NJCAA DI / Region 20 |
| Harcum College | `data/juco.json` | `harcum_college` | JUCO | NJCAA DI / Region 19 |
| Harford CC | `data/juco.json` | `harford_cc` | JUCO | NJCAA DI / Region 20 |
| Hill College | `data/juco.json` | `hill_college` | JUCO | NJCAA DI / Region 5 |
| Hofstra | `data/caa.json` | `hofstra` | D1 | CAA |
| Illinois Central | `data/juco.json` | `illinois_central` | JUCO | NJCAA DI / Region 24 |
| Indian Hills | `data/juco.json` | `indian_hills` | JUCO | NJCAA DI |
| Indiana | `data/big-ten.json` | `indiana` | D1 | Big Ten |
| Iowa Lakes CC | `data/juco.json` | `iowa_lakes_cc` | JUCO | NJCAA DII / ICCAC |
| Iowa Western | `data/juco.json` | `iowa_western` | JUCO | NJCAA DI |
| Jacksonville College | `data/juco.json` | `jacksonville_college` | JUCO | NJCAA DI / Region 14 |
| Jefferson College (MO) | `data/juco.json` | `jefferson_college_mo` | JUCO | NJCAA DI / Region 16 |
| Johnson County CC | `data/juco.json` | `johnson_county_cc` | JUCO | NJCAA DII / KJCCC |
| Keiser | `data/d2.json` | `keiser` | NAIA | Sun Conference |
| Kennedy-King College | `data/juco.json` | `kennedy_king_college` | JUCO | NJCAA DI / Region 4 |
| Laramie County CC | `data/juco.json` | `laramie_county_cc` | JUCO | NJCAA DI / Region 9 |
| Lewis & Clark CC | `data/juco.json` | `lewis_clark_cc` | JUCO | NJCAA DI / Region 24 |
| Lincoln Trail | `data/juco.json` | `lincoln_trail` | JUCO | NJCAA DI / Region 24 |
| Louisville | `data/acc.json` | `louisville` | D1 | ACC |
| LSU Eunice | `data/juco.json` | `lsu_eunice` | JUCO | NJCAA DI / Region 14 |
| Murray State (OK) | `data/juco.json` | `murray_state_ok` | JUCO | NJCAA DI / Region II |
| Lynn | `data/d2.json` | `lynn` | D2 | SSC |
| Malcolm X College | `data/juco.json` | `malcolm_x_college` | JUCO | NJCAA DI / Region 4 |
| Marquette | `data/big-east.json` | `marquette` | D1 | Big East |
| Maryland | `data/big-ten.json` | `maryland` | D1 | Big Ten |
| Memphis | `data/aac.json` | `memphis` | D1 | AAC |
| Mercyhurst | `data/d1-other.json` | `mercyhurst` | D1 | NEC |
| Miami Dade | `data/juco.json` | `miami_dade` | JUCO | NJCAA |
| Michigan | `data/big-ten.json` | `michigan` | D1 | Big Ten |
| Michigan State | `data/big-ten.json` | `michiganstate` | D1 | Big Ten |
| Mohave CC | `data/juco.json` | `mohave_cc` | JUCO | NJCAA DI / ACCAC |
| Monmouth | `data/caa.json` | `monmouth` | D1 | CAA |
| Monroe | `data/juco.json` | `monroe_college` | JUCO | NJCAA DI |
| Montgomery College | `data/juco.json` | `montgomery_college` | JUCO | NJCAA DI / Region 20 |
| Nassau CC | `data/juco.json` | `nassau_cc` | JUCO | NJCAA DIII / Region 15 |
| National Park College | `data/juco.json` | `national_park` | JUCO | NJCAA DI / Region 2 |
| Navy | `data/aac.json` | `navy` | D1 | Patriot League (men's soccer; AAC for other sports — filed in aac.json but grouped Patriot via confKey) |
| NC State | `data/acc.json` | `ncstate` | D1 | ACC |
| Neosho County CC | `data/juco.json` | `neosho_county_cc` | JUCO | NJCAA DII / KJCCC |
| North Idaho College | `data/juco.json` | `north_idaho_college` | JUCO | NJCAA DI / Region 18 |
| Northeast CC | `data/juco.json` | `northeast_cc` | JUCO | NJCAA DII |
| Northeast Texas CC | `data/juco.json` | `northeast_texas_cc` | JUCO | NJCAA DI / Region 14 |
| Northeastern | `data/caa.json` | `northeastern` | D1 | CAA |
| Northeastern Oklahoma A&M | `data/juco.json` | `neo_am` | JUCO | NJCAA DI / Region 2 |
| Northwest College | `data/juco.json` | `northwest_college` | JUCO | NJCAA DI / Region 9 |
| Northwestern | `data/big-ten.json` | `northwestern` | D1 | Big Ten |
| NOC Enid | `data/juco.json` | `noc_enid` | JUCO | NJCAA DI / Region 2 |
| Notre Dame | `data/acc.json` | `notredame` | D1 | ACC |
| Nova SE | `data/d2.json` | `nova` | D2 | SSC |
| Ohio State | `data/big-ten.json` | `ohiostate` | D1 | Big Ten |
| Oklahoma City | `data/d2.json` | `ocu` | NAIA | SAC |
| Otero College | `data/juco.json` | `otero_college` | JUCO | NJCAA DI / Region 9 |
| Pacific Northwest Christian College | `data/juco.json` | `pacific_northwest_christian_college` | JUCO | NJCAA DI / Region 18 |
| Paris JC | `data/juco.json` | `paris_jc` | JUCO | NJCAA DI / Region 14 |
| PBA | `data/d2.json` | `pba` | D2 | SSC |
| Penn State | `data/big-ten.json` | `pennstate` | D1 | Big Ten |
| Phoenix College | `data/juco.json` | `phoenix_college` | JUCO | NJCAA DII / ACCAC |
| Pima CC | `data/juco.json` | `pima_cc` | JUCO | NJCAA DII / ACCAC |
| Pittsburgh | `data/acc.json` | `pittsburgh` | D1 | ACC |
| Princeton | `data/ivy.json` | `princeton` | IVY | Ivy League |
| Providence | `data/big-east.json` | `providence` | D1 | Big East |
| Ranger College | `data/juco.json` | `ranger_college` | JUCO | NJCAA DI / Region 5 |
| Rose State College | `data/juco.json` | `rose_state` | JUCO | NJCAA DI / Region 2 |
| Rutgers | `data/big-ten.json` | `rutgers` | D1 | Big Ten |
| Salt Lake CC | `data/juco.json` | `slcc` | JUCO | NJCAA DI / Region 18 |
| Santa Monica | `data/juco.json` | `smc` | JUCO | CCCAA / SCFA |
| Seton Hall | `data/big-east.json` | `setonhall` | D1 | Big East |
| Seward County CC | `data/juco.json` | `seward_county_cc` | JUCO | NJCAA DI / KJCCC |
| SMU | `data/acc.json` | `smu` | D1 | ACC |
| Snow College | `data/juco.json` | `snow_college` | JUCO | NJCAA DI / Region 18 |
| Southeastern CC | `data/juco.json` | `southeastern_cc_ia` | JUCO | NJCAA DII / ICCAC |
| Southwestern Illinois | `data/juco.json` | `southwestern_illinois` | JUCO | NJCAA DI / Region 24 |
| St. Edward's | `data/d2.json` | `stedwards` | D2 | Lone Star (LSC) |
| St. John's | `data/big-east.json` | `stjohns` | D1 | Big East |
| Stanford | `data/acc.json` | `stanford` | D1 | ACC |
| Stony Brook | `data/caa.json` | `stonybrook` | D1 | CAA |
| Suffolk CC | `data/juco.json` | `suffolk_cc` | JUCO | NJCAA DIII / Region 15 |
| Syracuse | `data/acc.json` | `syracuse` | D1 | ACC |
| Temple | `data/aac.json` | `temple` | D1 | AAC |
| Texas Southmost | `data/juco.json` | `texas_southmost` | JUCO | NJCAA DI / Region 14 |
| Truckee Meadows CC | `data/juco.json` | `truckee_meadows_cc` | JUCO | NJCAA DI / Region 18 |
| Truman College | `data/juco.json` | `truman_college` | JUCO | NJCAA DI / Region 4 |
| Tulsa | `data/aac.json` | `tulsa` | D1 | AAC |
| Tyler JC | `data/juco.json` | `tyler_jc` | JUCO | NJCAA DI / Region XIV |
| U of Charleston | `data/d2.json` | `uc_charleston` | D2 | Mountain East (MEC) |
| UA Rich Mountain | `data/juco.json` | `rich_mountain` | JUCO | NJCAA DI / Region 2 |
| UAB | `data/aac.json` | `uab` | D1 | AAC |
| UC Davis | `data/big-west.json` | `ucdavis` | D1 | Big West |
| UC Irvine | `data/big-west.json` | `ucirvine` | D1 | Big West |
| UC Riverside | `data/big-west.json` | `ucriverside` | D1 | Big West |
| UC San Diego | `data/big-west.json` | `ucsd` | D1 | Big West |
| UCA | `data/d1-other.json` | `uca` | D1 | ASUN |
| UCLA | `data/big-ten.json` | `ucla` | D1 | Big Ten |
| UConn | `data/big-east.json` | `uconn` | D1 | Big East |
| UCSB | `data/big-west.json` | `ucsb` | D1 | Big West |
| Ulster County CC | `data/juco.json` | `ulster_cc` | JUCO | NJCAA DIII / Region 15 |
| UNC | `data/acc.json` | `unc` | D1 | ACC |
| USC Lancaster | `data/juco.json` | `usc_lancaster` | JUCO | NJCAA DI / Region 10 |
| USC Salkehatchie | `data/juco.json` | `usc_salkehatchie` | JUCO | NJCAA DI / Region 10 |
| USC Sumter | `data/juco.json` | `usc_sumter` | JUCO | NJCAA DI / Region 10 |
| USC Union | `data/juco.json` | `usc_union` | JUCO | NJCAA DI / Region 10 |
| USF | `data/aac.json` | `usf` | D1 | AAC |
| Utah State Eastern | `data/juco.json` | `usu_eastern` | JUCO | NJCAA DI / Region 18 |
| UVA | `data/acc.json` | `virginia` | D1 | ACC |
| Vermont | `data/d1-other.json` | `vermont` | D1 | America East |
| Villanova | `data/big-east.json` | `villanova` | D1 | Big East |
| Wake Forest | `data/acc.json` | `wakeforest` | D1 | ACC |
| Washington | `data/big-ten.json` | `washington` | D1 | Big Ten |
| Westchester CC | `data/juco.json` | `westchester_cc` | JUCO | NJCAA DIII / Region 15 |
| Western Texas College | `data/juco.json` | `western_texas` | JUCO | NJCAA DI / Region 5 |
| Wilbur Wright College | `data/juco.json` | `wilbur_wright_college` | JUCO | NJCAA DI / Region 4 |
| William & Mary | `data/caa.json` | `william_mary` | D1 | CAA |
| Wisconsin | `data/big-ten.json` | `wisconsin` | D1 | Big Ten |
| Xavier | `data/big-east.json` | `xavier` | D1 | Big East |
| Yale | `data/ivy.json` | `yale` | IVY | Ivy League |

### Step 3 — Confirm the session goal
State in one sentence what this session will deliver and which session number it is.
Do not proceed until you have stated this explicitly.

**Session flow — always in this order:**
§2 EXPLORE (read repo state) → §3 PLAN (identify change type + impact map) → §7 Phase 0 (change assessment) → §7 Phase 1 (research) → §7 Phase 2 (sign-off) → §7 Phase 3 (make changes) → §7 Phase 4 (validate) → §7 Phase 5 (local test) → §7 Phase 6 (commit) → §7 Phase 7 (verify live) → §7 Phase 8 (end of session)

Do not skip any phase. Do not begin Phase 3 before Phase 2 sign-off is written out explicitly.

---

## 3. PLAN PHASE — Before Writing Code

**THIS IS NON-NEGOTIABLE. Every change, no exceptions:**

1. Identify the change type from Section 3a (Impact Map).
2. Read every row in that change type's impact map — files AND tabs.
3. Write out the complete list of files and tabs this change touches.
4. Only then begin the Universal Change Workflow in Section 7 — starting at Phase 0. Phase 0 and Phase 2 of §7 complete this planning step. Do not treat §3 as a substitute for them.

A change is NOT complete until every item in the impact map for that change type has been checked and actioned. This applies to data fixes, coach updates, new schools, cost changes, UX changes — everything.

**Other plan rules:**
- For JSON changes: validate schema against Section 5 before touching the file.
- For JS changes: identify the specific function(s) involved. Read them first.
- One change at a time. Complete and verify each change before starting the next.
- State any assumptions. If something is ambiguous, ask — do not guess.

---

## 3a. Change Impact Map — Mandatory Before Every Change

**For every change, find the matching type below. Every row is a required check — not a suggestion.**

---

### CHANGE TYPE 1 — New School Added

| What to update | Why |
|---|---|
| `data/[conf].json` — full school object | All required fields, confKey, acuUnits[16], lensScores[6], minutesOutlook, fitOlivier |
| `CLAUDE.md` — School → File Reference Table | Add a row for the new school — mandatory, keeps the lookup table accurate |
| `data/coaches.json` — add coach entry | Full-profile school must have a coaches.json entry. Re-rank ALL coaches after adding. |
| `data/conferences.json` — guideSchools[] | School chip will not appear in Conferences tab without this |
| `data/conferences.json` — desc and olivierNote | Update the text to reflect the new school count and program highlights — easy to miss |
| `data/conferences.json` — otherSchools[] | Remove school from otherSchools[] if it was previously listed there |
| `data/conf-prestige.json` — programsInGuide | Update comma-separated string and relevance text |
| `data/pipeline.json` | Only if school has NCAA titles or MLS picks — add to relevant table |
| `js/app.js — DOMAINS` | Favicon in modal header breaks without this |
| `js/app.js — SITE_URLS` | Visit Site link in modal breaks without this |
| `js/app.js — SOCIAL` | Social pills in modal are blank without this (4-element array, nulls ok) |
| `js/app.js — CONF_SECTIONS` | School is invisible in Explore if confKey has no matching section |
| `js/app.js — CONF_ALIAS_MAP + CONF_CHIP_LABELS + CONF_CHIP_ORDER` (added v44.45) | **A new conference needs an entry in all three**, or the school gets no filter chip and is unfilterable by conference — six schools were in that state (Army, Navy, Delaware, Mercyhurst, U of Charleston, Columbia College) and the chip row silently summed to 105 of 111. Also **check the new alias for substring collisions**: aliases are matched longest-first, and `"sun conference"` matched inside `"asun conference"`, filing D1 UCA under the NAIA Sun Conference chip. `validate_consistency.js`'s CHIPS check enforces all of this. |
| `js/app.js — CONF_SECTIONS` **intro text** (added v44.44) | The section intro states a **program count**, and adding a school makes it wrong. Count by `confKey`, not by conference FILE — Akron sits in `d1-other.json` but groups into the Big East section (12, not 11), and Army/Navy sit in `aac.json` but group into Patriot (so the AAC section is 8, not 10). `validate_consistency.js`'s PROSE check enforces this. |

**Tabs to verify after adding:**
- Dashboard — map dot present, budget bracket bar present, shortlist panel (if on shortlist)
- Explore Schools — card in correct section, all filters/lenses/sorts, Details modal all 9 tabs
- Compare — school selectable
- Minutes Outlook — card present (even if available: false)
- Pro Pipeline — only if titles/MLS picks added to pipeline.json
- ACU Alignment — row present (non-JUCO full-profile only)
- Conferences — school chip visible in guideSchools[], prestige table updated
- Coaches & Staff — coach card in Rankings, profile in Profiles tab, entry in Outreach tab
- Financial Model — school in selector, appears in comparison bars

---

### CHANGE TYPE 2 — Coach Name or Details Changed

**Single-file rule since v44.27 — `data/coaches.json` is the ONLY place coach data lives.** School objects in the 10 conference files do NOT have a `coach{}` sub-object (removed v44.27) — every renderer looks the coach up live by `schoolId` via the `getCoach(schoolId)` helper in `js/app.js`. There is no second file to keep in sync and no "two-file rule" anymore.

| What to update | Why |
|---|---|
| `data/coaches.json` — matching entry (name, title, contact.email, contact.phone, bio, record, etc.) | The single source — every tab and the school modal read from here |
| Re-rank ALL coaches — always, no exceptions | Any coach change (name, score, or details) triggers a re-rank. Rank gaps break Rankings display. |

**Tabs/renderers to verify after changing (all read `coaches.json` live via `getCoach(schoolId)`):**
- Coaches & Staff → Rankings — name, rank, score badge correct
- Coaches & Staff → Profiles — bio, staff array, contact details correct
- Coaches & Staff → Outreach — contact details correct
- Explore Schools → school modal → Coach & Contact tab — name, title, contact, bio, and the rank badge (added v44.27) all correct
- Explore Schools → card footer — "Coach: [name]" line
- Compare tab → Head Coach row
- Dashboard → shortlist panel — the Email button's mailto link uses `getCoach(id)?.contact?.email` (NOT coach name — that claim in older history entries was stale/incorrect, corrected v44.27)

**Do not re-add a `coach{}` sub-object to any school object.** `validate_schools.py` and `validate_consistency.js` (`COACH-SYNC` check) both error/flag if one reappears — this is a one-way door.

**On any contact change, grep the `bio` strings too — `contact{}` is not the only place an email lives (learned v44.35).** St. Edward's `bio` ended with a hardcoded `"Email: byoung@stedwards.edu"`, so updating `contact.email` alone would have left the old address rendering in the Profiles tab. A contact-only change does **not** move `overallScore`, so it does not fire the re-rank trigger above — but it does need this sweep.

---

### CHANGE TYPE 3 — minutesOutlook Populated or Changed

**Cascade order is strict — do in this exact sequence:**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — minutesOutlook{} | The raw data. **`roster_season` must be updated in the SAME edit as `mf_total`** (v44.32) — the count and the season it came from are one fact, and a refreshed count under a stale season is the exact bug the rename removed. |
| 2 | `data/[conf].json` — lensScores.minutes | Minutes lens score derived from minutesOutlook |
| 3 | `data/[conf].json` — lensScores.overall | Overall lens includes minutes score |
| 4 | `data/[conf].json` — fitOlivier | Minutes = 20% of fitOlivier — must recalculate |
| 5 | **UI PROSE that quotes a roster fact (added v44.44)** | `js/app.js` `CONF_SECTIONS` intros and the Minutes Outlook key are string literals — **no other check in this file reads them, so a refresh can falsify them silently and indefinitely.** This is not hypothetical: v44.42 refreshed UCA to 0-of-9 midfielders clearing while the ASUN intro still read *"6 of 9 MFs clearing before Olivier arrives"*, and the Minutes Outlook key was written in a 2025 roster's class years, which **inverts** once a school moves to 2026-27. `node validate_consistency.js`'s **PROSE** check now catches both classes automatically — but if you write new copy, phrase it against the **normalised 2027 buckets** (`cleared_before_2027` / `rising_senior_2027` / `rising_junior_2027`), never against a scrape-season class year. |

**⚠️ JUCOs are a different change type in two ways (found Session 4, v44.55) — read before touching one:**
1. **Class-year semantics INVERT at a 2-year college, and the direction depends on the roster season.** On a **2026-27** JUCO roster a **sophomore graduates spring 2027 and is `cleared`** (gone before Olivier arrives Aug 2027), while a **freshman `returns`** as a 2027-28 sophomore. On a **2025-26** roster **everyone clears**, which is why 26 of the 30 stored JUCOs have `mf_total == cleared_before_2027`. Applying the 4-year mapping (`So.` ⇒ returning) to a JUCO silently inverts the entire opportunity picture. `roster_extract.py` has `--juco` and `--juco-prior` as **two separate flags** so the two can never cross; pick by the season you are actually reading.
2. **Do NOT recompute a JUCO trajectory from §14** — that table cannot reproduce any stored JUCO anchor (see the open item in §6). Use `apply_roster_refresh.py`'s **`facts_only`** branch, which refreshes the counts and skips the trajectory and the whole cascade. Because `scores.js` reads only `trajectory[].pct`, that provably moves no score — **verify it by diffing the conference file for changed scoring fields**, don't just trust the script's message.

**Coach spot-check — required alongside every roster refresh (added v44.88, after the v44.87 Batch 1 gap).** A minutesOutlook/roster refresh only touches roster data — it does not verify who the head coach is, and the two are easy to conflate since both live on the athletics site. v44.87 refreshed 10 JUCOs' rosters and the session's own task list marked a coach spot-check "done" for all of them, but only 1 of 10 was genuinely checked against a live source — the other 9 went unconfirmed for a week until the owner asked directly (see the CHANGE TYPE 2 impact map, and the §6C backlog item this created). **Whenever a school's `minutesOutlook` is refreshed, in the same session also visit that school's official coaches/staff page — not just the roster page, whose "Coaching Staff" section, if it renders at all, often lists an assistant rather than the head coach — via Claude-in-Chrome (RULE 0) and cross-check name/title against `coaches.json` before marking the school done.** Only edit `coaches.json` on a genuine mismatch (§3a Change Type 2 — a title/contact correction does not require a re-rank unless `overallScore` also moves). This is a verification step, not a new field — it adds no scoring cascade of its own.

**Tabs to verify after changing:**
- Minutes Outlook tab — card now renders with trajectory chart, Yr1/Yr2 percentages
- Explore Schools — fitOlivier score updated, sort order correct, minutes lens score correct
- Dashboard — lens comparison bars reflect new scores
- Coaches & Staff → Rankings/Profiles — stored coach name/title still matches the school's own coaches page (the spot-check above, not a new lookup)

**Companion field — `recruit_pathway` / `recruit_pathway_note` (informational only, added v34):**
Captures whether a school's midfield spots are typically filled by true incoming freshmen vs. transfer/JUCO portal players, discovered during the same roster pull used for `minutesOutlook`. See §5 for field definition and §7 Phase 1G for the research step. **No scoring cascade** — do not touch lensScores or fitOlivier for this field alone. Origin: FIU research (v34) found ~60–70% of its midfield roster is transfer/JUCO-sourced rather than true freshmen, which the existing GPA-based `internationalNote` framing didn't capture — that note describes academic admission ease, not athletic roster-spot competition, and the two can diverge sharply.

**Has a UI consumer since v44.26.** The Pathways tab's "Recruiting Pathway by School" section (`renderRecruitPathwaySummary()` in js/app.js) groups all schools with this field populated into 4 cards by value. It reads live from the global `unis` array — never hardcode a school list or count for this section, it must stay self-updating as schools are added/removed/re-scraped. `validate_consistency.js` enforces the enum (`RECRUIT_PATHWAY_VALUES`) — any new/typo'd value is flagged as an Issue rather than silently vanishing from the tab. **Tabs to verify after any recruit_pathway change:** Pathways tab section count/bucket for the affected school, tooltip text.

---

### CHANGE TYPE 4 — Cost / fin{} Changed

| What to update | Why |
|---|---|
| `data/[conf].json` — fin.costNum, tuition, roomBoard, fees | Raw cost data |
| `data/[conf].json` — cost display string | **REDUNDANT since v32** — cost display is now computed dynamically from `costNum` via `costDisplay()` in app.js. The `cost` field in JSON is kept as a fallback only. Do NOT update it manually — fix `costNum` instead. |
| `data/[conf].json` — fin.internationalNote | Text must match realistic aid framing (25–50% athletic for D1) |
| `data/[conf].json` — lensScores.value | **The only score that moves.** `value = fitOlivier×0.6 + affordability×40`, where `affordability = 1 − min(1, costNum/budget)`. Stored-only — nothing recomputes it at runtime, so a missed update drifts silently (the v44.30 Wake Forest bug). The `VALUE` check catches it. |
| ~~`lensScores.overall`~~ / ~~`fitOlivier`~~ | **DO NOT recalculate — corrected v44.56.** This table used to say *"Cost = 20% of fitOlivier"*. That has been false since **v37.1**, which removed cost, GPA and ACU from the Fit Score entirely (`fitOlivier` = Soccer Quality 40 + Minutes 35 + Climate 15 + City 10). `js/scores.js` contains no reference to `costNum` or `affordability`. A cost change moves **`lensScores.value` and nothing else.** |

**Convention for `costNum` — locked v44.56, do not "correct" it to a school's headline number.** `costNum = tuition + roomBoard + fees`, i.e. **direct billed cost**. This invariant holds for all 111 records. It deliberately **excludes** books, transport, personal expenses and loan fees, so a school's own published "TOTAL cost of attendance" will usually be higher — Clemson publishes $66,180 where this guide stores $58,732. Record the school's headline figure in `internationalNote` so the difference is visible and nobody re-opens it. Use the **non-resident / international** rate, and the newest published academic year.

**Tabs to verify after changing:**
- Financial Model — school selector shows new cost, comparison bars shift, scenario breakdowns correct
- Explore Schools — fitOlivier updated, Value lens ranking updated
- Dashboard — budget bracket position may shift

---

### CHANGE TYPE 5 — athletes/olivier.json Changed

| What changed | What's affected |
|---|---|
| `guideVersion` | Explore tab header version badge only |
| `budgetAUD` or `fxRate` | **No longer affects fitOlivier** (v37.1 removed Cost from the Fit Score) — only affects the `value` lens (`affordabilityScore`) and the Financial Model tab. Re-store `lensScores.value` for all schools if changed. |
| `scoreWeights` | ALL fitOlivier recalculate → all lensScores.overall must be manually recalculated |
| `shortlist[]` | **Since v37.9: Dashboard map "in shortlist" dot highlight ONLY.** The Dashboard's "Top 8" panel no longer pins these schools — it's a strict fitOlivier ranking (see §6 state snapshot). Does NOT drive the Coaches Outreach tracker (that's `outreach[]`) or Explore's ★ Top Pick filter (that's the static `u.top` field on each school) — this row previously claimed both incorrectly. |
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

---

### CHANGE TYPE 7 — Pipeline / Titles Changed

| What to update | Why |
|---|---|
| `data/pipeline.json` — ncaaD1[], ncaaD2[], or mlsDraft[] | Powers the Pro Pipeline tab tables |
| `data/[conf].json` — proPlayers.mlsPicks5yr, titles[], proPlayers.draftRank | Powers school modal pipeline tab |
| `data/conf-prestige.json` — conference mlsPipeline field | Conference prestige table MLS column |
| `data/[conf].json` — lensScores.soccer | MLS picks factor into soccer lens — consider recalculating |

**JUCO / NJCAA rule (confirmed v37.10):** JUCO national titles and rankings are **NJCAA** achievements, a completely separate governing body from **NCAA**. Never place a JUCO school in the ranked medal section of `ncaaD1[]` or `ncaaD2[]` (those are literally "NCAA championships" — mixing in NJCAA titles is a category error) — JUCO credentials belong only in the unranked/grouped section at the bottom of `ncaaD2[]` (labelled "NAIA, D3 & JUCO"), using `years`/`yearsStyle` chips (`chip-green` for actual NJCAA champions, `chip-purple` for rankings/All-Americans/tournament results) rather than the `titles`/medal-rank fields used for real NCAA champions. `mlsDraft[]` has no such restriction — MLS SuperDraft picks are picks regardless of the feeder program's governing body.

**Tabs to verify after changing:**
- Pro Pipeline — championship tables and MLS SuperDraft table updated
- Explore Schools → school modal → Pro Pipeline tab
- Conferences — conference prestige table MLS column

---

### CHANGE TYPE 8 — Listed Profile → Full Profile Upgrade

**Step order matters — do not skip steps or reorder:**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — add all full-profile fields | `profileDepth: "full"`, `color`, `devScores`, `facilityDetails{}`, `culture{}`, `staff[]`, `courses[]`, `acuUnits[16]`. Expand `fin{}` with tuition/roomBoard/fees/maxAthletic/maxAcademic/aidType. |
| 2 | `data/[conf].json` — validate JSON | `python -m json.tool data/[conf].json` — do not proceed if invalid |
| 3 | `data/coaches.json` — add coach entry | Re-rank ALL coaches after every batch. |
| 4 | `js/app.js` — DOMAINS, SITE_URLS, SOCIAL | Add entry for each upgraded school. Run `node --check js/app.js` after. |
| 5 | `data/conferences.json` — guideSchools[] | Move school from `otherSchools[]` into `guideSchools[]`. |
| 6 | `data/conferences.json` — desc and olivierNote | **Always update these.** Change the school count and add new highlights. Most frequently missed step. |
| 7 | `minutesOutlook` — research and populate roster data | Minutes Outlook is 20% of fitOlivier. Use Claude for Chrome MCP on the official roster page (see §15). Only set `{ "available": false }` if roster cannot be obtained — document why. |
| 8 | Validate all modified files | `python validate_schools.py` then `python -m json.tool` on each JSON, `node --check` on JS |
| 9 | Commit with version bump | `vNN.N — [Conference] batch: X listed schools upgraded to full profile` |

**acuUnits false patterns by acuAlign:**

| acuAlign (trues) | Units to set covered:false |
|---|---|
| 13 | EXSC394, EXSC187, EXSC398 |
| 12 | EXSC394, EXSC296, EXSC187, EXSC398 |
| 11 | EXSC394, EXSC204, EXSC296, EXSC187, EXSC398 |
| 10 | EXSC394, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 9 | EXSC394, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |
| 8 | EXSC394, EXSC322, EXSC224, EXSC204, EXSC216, EXSC296, EXSC187, EXSC398 |

All 16 units in order: `ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394, EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296, EXSC187, EXSC230, EXSC122, EXSC398`

**Also update after EVERY conference batch:**
- `data/conf-prestige.json` — `programsInGuide` string and `relevance` text. This is a SEPARATE file and is NOT updated automatically.

**Tabs to verify after upgrading a batch:**
- Explore Schools — modal opens with all 9 tabs populated
- Coaches & Staff → Rankings — new coaches present with correct badge colour
- Conferences — conference card shows updated guideSchools count and desc/olivierNote
- Conferences → Rankings table — programsInGuide column shows new school count
- Financial Model — upgraded schools now appear
- ACU Alignment — rows present for all upgraded schools (non-JUCO only)

---

### CHANGE TYPE 9 — Degree Program (degreeTitle) Updated

**Rule: Any time degreeTitle is researched or changed, steps 2–4 below are mandatory.**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — degreeTitle | The degree name shown on the school card and modal |
| 2 | `data/[conf].json` — acuAlignNote | Must reference the actual degree by name with specific course examples — not generic template text |
| 3 | `data/[conf].json` — acuUnits[] | Verify coverage against real degree course offerings |
| 4 | `data/[conf].json` — acuAlign | Count of covered:true must equal this integer |

**If acuUnits or acuAlign changed, also cascade:**
- `lensScores.academic` — re-evaluate
- `lensScores.overall` — recalculate if academic lens changed significantly
- `fitOlivier` — recalculate (acuAlignment = 10% of fit score)

**JUCO EXCEPTION:** Do NOT cascade acuAlign into fitOlivier for JUCO schools. ACU alignment is informational only for JUCOs.

**Tabs to verify:** ACU Alignment tab, Explore modal Overview tab (acuAlignNote text), Explore fitOlivier (non-JUCO only).

---

### CHANGE TYPE 10 — School Removed

| What to update | Why |
|---|---|
| `data/[conf].json` — remove school object entirely | Primary record — all other files reference this |
| `CLAUDE.md` — School → File Reference Table | Remove the school's row — mandatory |
| `data/coaches.json` — remove coach entry | Orphaned entry renders a broken card in Rankings/Profiles |
| `data/coaches.json` — re-rank ALL remaining coaches | Rank gaps break Rankings display |
| `js/app.js — DOMAINS` | Remove entry — stale entry is harmless but creates noise |
| `js/app.js — SITE_URLS` | Remove entry |
| `js/app.js — SOCIAL` | Remove entry |
| `data/conferences.json` — guideSchools[] | Remove school display name from array |
| `data/conferences.json` — desc and olivierNote | Update school count — most frequently missed step |
| `data/conf-prestige.json` — programsInGuide | Remove school from comma-separated string |
| `data/pipeline.json` | Only if school had entries — remove from relevant table |
| `athletes/olivier.json` — shortlist[] | Remove if present — orphaned shortlist entry causes display error |
| `athletes/olivier.json` — outreach[] | Remove if present |
| `js/app.js — CONF_SECTIONS` **intro text** (added v44.44) | The section intro states a program count and may name the removed school by name. Recount by `confKey`. PROSE check catches the count; it cannot catch a dangling name, so re-read the intro. |

**Tabs to verify after removing:**
- Explore Schools — school card gone, no ghost card, total count is N-1
- Dashboard — map dot gone
- Conferences — school chip gone from guideSchools, count updated in desc/olivierNote
- Coaches & Staff → Rankings — coach gone, all remaining coaches renumbered correctly
- ACU Alignment — row gone
- Minutes Outlook — card gone
- Financial Model — school gone from selector
- F12 console — zero errors (orphaned references throw JS errors)

---

### CHANGE TYPE 11 — UX / JS Change

| What to do | Why |
|---|---|
| Identify the specific function(s) involved | Never edit JS without knowing exactly which function owns the behaviour |
| Read those functions in full before touching them | The most common JS error source is editing without reading first |
| Map which tabs render using those functions | Determines test scope — targeted vs full regression |
| Run `node --check js/[file].js` immediately after every edit | Don't wait for Phase 7 — catch syntax errors at the source |

**Test scope by change type:**
- Score calculation change (scores.js) → full regression all tabs
- Single tab renderer change → targeted (affected tab) + smoke test all others
- Sort / lens / mode logic → Explore Schools full test + mode/sort/lens combos
- Dashboard renderer → Dashboard tab full test + smoke others
- Cosmetic / text change → smoke test only

---

### CHANGE TYPE 12 — facilityDetails.housing Changed (added v41.0)

**Housing feeds the Fit Score since v41.0 — a housing change is a score change, not a display tweak.**

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — facilityDetails.housing{} | `available` exactly `true` \| `false` \| `"limited"` + note. Tier-1: official residence-life page. |
| 2 | `data/[conf].json` — fitOlivier | Re-apply the penalty: −6 false / −3 limited / 0 true. Stored value must match scores.js output. |
| 3 | `data/[conf].json` — lensScores.overall | Same integer as fitOlivier. |
| 4 | `data/[conf].json` — lensScores.value | value = fitOlivier×0.6 + affordability×40 — recompute since fitOlivier moved. |

**Tabs to verify:** Explore (card score + Best Fit sort position), Dashboard Top 8 (may reshuffle), school modal fit score, housing warning chip on card/modal. `node validate_consistency.js` catches a missed cascade (fit drift) AND a missing/invalid housing field (HOUSING check).

---

### CHANGE TYPE 13 — devScores Changed (added v42.0)

**A dev score is 60% of Soccer Program Quality, which is 40% of Fit — so `devScores` drives 24% of `fitOlivier`. A 10-point dev move is a 2.4-point Fit move. This is never a display-only edit.**

**Before touching any sub-score, read §5a.** Score against the written rubric and its anchors — never from feel, never off a ranking site, never from a team's results.

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — `devScores{tactical, technical, fitness}` | Each 0–100, absolute national scale, Tier-1 evidence from the school's own athletics staff directory + facilities pages |
| 2 | `data/[conf].json` — `devScoresNote` | Cite the evidence observed. A score with no note is unverifiable and will be re-litigated next session |
| 3 | Confirm `devAvg` ≤ the division ceiling (§5a) | D1 95 · Ivy 88 · D2 76 · NAIA 72 · JUCO 68 · D3 66 |
| 4 | `data/[conf].json` — `fitOlivier` | Recompute; must match `scores.js` output exactly |
| 5 | `data/[conf].json` — `lensScores.overall` | Same integer as `fitOlivier` |
| 6 | `data/[conf].json` — `lensScores.value` | `fitOlivier×0.6 + affordability×40` — recompute, `fitOlivier` moved |

**Tabs to verify:** Explore (card Dev Score stat, card Fit score, Best Fit sort position, Soccer lens ranking), Dashboard Top 8 (may reshuffle), school modal Overview + the three dev sub-score bars, Compare tab's Tactical Dev row.

**Glossary rule applies.** `index.html`'s "Development Sub-Scores" section hardcodes anchor schools in prose. It currently names *"Virginia (Gelnovatch), Indiana (Yeagley) and FIU (Russell)"* and cites sports-science departments at *"Indiana, UCLA, UF"* — **UF is not one of the 110 schools; Florida fields no men's soccer program.** Any dev-score change that moves an anchor must fix that block in the same commit.

`node validate_consistency.js` catches a missed cascade (fit drift). It does **not** and should not check the sub-scores themselves — they are judgment values, not derivable.

---

### CHANGE TYPE 14 — fundingPathway Changed / New Non-D1 School (added v42.18)

**`fundingPathway` feeds the Fit Score funding penalty (§5c) — changing it is a score change. It only changes when a school changes division (rare), or when a new non-D1 school is added.** The value is determined by division rule, never researched: D1 / NJCAA DI → `full`; D2 / NAIA / NJCAA DII → `capped`; Ivy / NCAA D3 / CCCAA → `none`.

| Step | What to update | Why |
|---|---|---|
| 1 | `data/[conf].json` — `fundingPathway` | `"full"` \| `"capped"` \| `"none"` per the division rule above. REQUIRED on every non-D1 full profile (div alone can't split NJCAA DI/DII/CCCAA — all are `div:"JUCO"`). D1 omits it (absent ⇒ full ⇒ 0). |
| 2 | `data/[conf].json` — `aid` display string | For NJCAA DII, don't leave a bare `"Athletic"` — it can't cover room & board; use the capped framing. Do NOT touch `maxAthletic`/`aidType` (DII/D2/NAIA *do* offer athletic aid, so the Financial Model slider stays unlocked). `none` schools set `maxAthletic:0`/`aidType:"need-only"` to lock the slider. |
| 3 | `data/[conf].json` — `fitOlivier` | Re-apply the penalty: −8 `none` / −3 `capped` / 0 `full`. Stacks with the housing penalty. Stored value must match scores.js output. |
| 4 | `data/[conf].json` — `lensScores.overall` | Same integer as `fitOlivier`. |
| 5 | `data/[conf].json` — `lensScores.value` | `fitOlivier×0.6 + affordability×40` — recompute since `fitOlivier` moved. |

**Tabs to verify:** Explore (card Fit score + Best Fit sort position), Dashboard Top 8 (may reshuffle), school modal fit score + Aid string. `node validate_consistency.js` catches a missed cascade (FIT drift) AND a missing/invalid `fundingPathway` on a non-D1 full profile (FUNDING check).

---

## 4. Immovable Architecture Rules

These rules cannot be overridden by the user in session. If a proposed change would violate one, stop and flag it.

**index.html is a shell.**
It must never contain hardcoded school data, coach data, conference tables, pathways, or pipeline tables.

**Schools live in their conference JSON file.**
There is no single schools.json. Use the file map in Section 2.

**coaches.json is the SOLE source of truth for coach data (since v44.27).**
School objects in the 10 conference files do not and must never carry their own `coach{}` sub-object — that duplication was removed in v44.27 after an audit found 21 schools where the two copies had already drifted (different emails/phones for the same coach). Every renderer looks the coach up live by `schoolId` via `getCoach(schoolId)` (js/app.js). There is nothing to keep "in sync" anymore — don't reintroduce a school-level `coach{}` field, even for convenience; `validate_schools.py` and validate_consistency.js's `COACH-SYNC` check both flag one if it reappears.
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
  - **Rating criteria** (surface type — grass or turf — does not affect tier):
  - Elite: Fully dedicated soccer-only stadium, 5,000+ cap with real atmosphere; full S&C + recovery + video/analysis + GPS + dedicated sports med; on-campus; strong fan culture
  - Excellent: Dedicated stadium (minor sharing OK), 2,500–5,000 cap; full S&C + sports med + video/analysis; on-campus; decent fan support
  - Very Good: Dedicated or lightly shared, 1,500–3,500 cap, lights + permanent seating; solid S&C + basic sports med; on-campus or very close
  - Good: May share with other sports, 500–2,000 cap; standard weight room + athletic trainers; on-campus; typical support
  - Solid: No dedicated stadium or off-campus; limited/no seating; basic or shared facilities only
  - **JUCO rule:** stadium capacity is weighted lower — strong S&C, sports med, GPS/video analysis can lift a JUCO from Solid to Good or Very Good regardless of capacity
- `lensScores` — 6 pre-computed scores (full-profile only; pt lens removed in v22)

**CONF_SECTIONS in app.js controls which cards-grid section a school appears in.**
Each section has a `key` (matches school's `confKey`) and a `divFilter` (matches school's `div`).
D3 and JUCO schools both use `confKey: 'other'` but are split by `divFilter: 'D3'` vs `divFilter: 'JUCO'`.
A school with a wrong or missing `confKey` is invisible in Explore and has no Details button.

**conferences.json tier strings must match the renderConferences() bucket keys exactly.**
Valid tier strings (verified against app.js renderConferences(), July 2026): `"Power 5 (D1)"`, `"High Major (D1)"`, `"Ivy League (D1)"`, `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"Division III"`, `"Junior College"`.
A wrong tier string silently hides the conference card — this is exactly how the Big East (`"Major (D1)"`), SEC (`"Power 4 (D1)"`), and Ivy (`"D1 (Ivy)"`) cards vanished from the Conferences tab (v36 backlog, §6). If a new bucket is genuinely needed, add it to the `tiers` array in renderConferences() AND this list in the same commit.

**Map coordinates use the v20 640×390 SVG coordinate system.**
mapX/mapY must be recalculated if coming from an older system. Verify on Dashboard after adding any school.

**DOMAINS, SITE_URLS, and SOCIAL in app.js must be updated whenever a new school is added or removed.**

**`ICON_OVERRIDES` (js/app.js, added v45.10) is an exception list, not a second data source — most schools should never appear in it.** Icons are normally fetched live: `ICON_OVERRIDES[id]` → the school's own `/favicon.ico` → Google's favicon proxy → the coloured-initials fallback, in that order, on all three render surfaces (Explore card, Details modal, Dashboard shortlist). Only add an entry when live-fetching is confirmed (Tier-1, a real browser, RULE 0) to produce a genuinely bad result for that specific school — a wrong/blocked domain, a non-square banner, a third party's degraded proxy rendition — never speculatively. An override value can be either a URL (fetched live, e.g. a confirmed real icon path that isn't `/favicon.ico`) or a local path under `assets/logos/` (a static asset committed to the repo — used only when even a *correct* live URL can't produce a good result, e.g. `tyler_jc`: the school's own athletics site has no square icon at all, so the owner supplied one directly). A local asset is the heavier of the two options — it can drift from the school's real current branding and nothing will ever flag that — so prefer a live URL override when one exists that actually works.

**`rosterUrl()` derives every roster link from the school object's own `url` — never hardcode a per-school roster URL or a season slug.** Two closed bugs are both permanently re-openable here (v42.5, v44.33). (1) Appending `/roster` to a program URL already ending in `/index` yields `.../sports/msoc/index/roster`, which 404s — so does `.../sports/msoc/roster`. Only the season-scoped `.../sports/msoc/2025-26/roster` resolves, **and that slug rots every August**, so the function deliberately falls back to the program page for `/index` URLs: it always resolves, carries its own current-season roster link, and needs zero annual maintenance. **Do not "improve" this by hardcoding season slugs.** (2) A per-school `overrides` map once sat in front of this rule; when audited, three of its four entries were byte-identical no-ops and the fourth pointed at a 404 while the school object held the correct URL all along. **A hardcoded override silently masks the school object's `url` and is invisible to both validators AND to §15's URL sweep.** The map was deleted — do not re-add one.

**Service academy rule (Army / Navy / USNA):**
`costNum=0`, all `fin{}` numeric fields = 0, `maxAthletic=1.0`, `maxAcademic=0`. Include an explicit service commitment warning in every text field — `rec`, `acuAlignNote`, `fin.internationalNote`, `culture.olivierMatch`. These schools are not compatible with Olivier's DPT/Chiropractic goal or MLS pathway — this is a **narrative warning only**, since fitOlivier (v37.1+) doesn't score cost or career-goal fit at all. Do not try to force fitOlivier low for these schools; if their soccer/minutes/climate/city numbers are genuinely good, the score will reflect that — the incompatibility is communicated via the text fields, not suppressed in the score.

**Sort and Lens are two independent, non-conflicting controls** (the Score Mode toggle was retired in v37.1 — Soccer Priority is now the only Fit Score, so there's nothing to toggle between).
- Sort pills → reorder cards; Best Fit sort is lens-aware (sorts by lensScores when a lens is active)
- Lens pills → apply visual badges/highlights only; do NOT reset sort
- These two systems must never override each other's state silently

---

## 5. Data Schema — Required Fields Reference

### School object (full-profile)
```
id, name, full, loc, region, div, conf, confKey, domain,
warm, city, top, color[],
degreeTitle, acuAlign (int 1–16), acuUnits[] (16 objects),
acuAlignNote, soccerLevel, cost, aid, fin{},
fundingPathway ("full" | "capped" | "none"),  ← added v42.18 (§5c). REQUIRED on every
                                                 non-D1 full profile (div alone can't split
                                                 NJCAA DI/DII/CCCAA — all are div:"JUCO");
                                                 feeds the Fit Score funding penalty (−8/−3/0).
                                                 D1 omits it (absent ⇒ full ⇒ 0). validate_
                                                 consistency.js FUNDING check enforces it.
size, prePT, kinRank, gpa{},   ← NO coach{} — removed v44.27, coaches.json is the sole
                                  source now (look up by schoolId via getCoach())
facilities[] (brief array — 3 bullet strings for card display; full-profile schools also require facilityDetails{}),
devScores{ tactical, technical, fitness },   ← 3 keys only — ptPath removed in v22
devScoresNote,                               ← added v42.0 — cites the Tier-1 evidence the
                                                dev scores were drawn from. Its PRESENCE means
                                                "scored against the §5a rubric" and activates
                                                validate_consistency.js's DEV-RUBRIC ceiling
                                                check for this school. Absent = legacy score
                                                (none remain — the re-baseline is complete).
                                                Min 20 chars.
fitOlivier (0–100),
lensScores{ overall, soccer, academic, minutes, lifestyle, value },  ← 6 keys — pt removed v22
tags[], facilities[], courses[], rec, url,
mapX, mapY,
profileDepth: "full",
minutesOutlook{ available: true/false, … },
facilityDetails{ rating, stadium, trainingFields, strengthConditioning,
                 sportsScience, sportsMed, academicLabs, extras, note,
                 housing: { available: true/false/"limited", note } },  ← added v37.7; REQUIRED
                                                since v41.0 (feeds the Fit Score housing penalty;
                                                validate_consistency.js HOUSING check enforces it)
culture{ vibe, thingsToDo, socialScene, olivierMatch, lifestyleTags },
confRecord[{ yr, pos, note }],
titles[], proPlayers{}
```

For JUCO schools, also add: `"juco2yr": true`, `"jucoTier": "Elite" | "Standard"`, and `"jucoTierNote"` (added v37.4 — informational badge only, NO Fit Score cascade; classification basis: 2025-season national title/runner-up, top-5 national ranking, 2+ 2025 NJCAA All-Americans, or recent historical dominance, verified via official NJCAA.org All-America team list). Every JUCO school has `jucoTier` set explicitly — currently 9 of 12 are "Elite", 3 are "Standard". The Elite badge only renders on cards/modal when `jucoTier==='Elite'`; "Standard" schools show no badge at all.

For **NJCAA-affiliated** JUCO schools, also add `"njcaaRegion": "Region N"` + `"njcaaRegionArea"` (added v37.5 — informational display only, no scoring cascade), verified against NJCAA.org's official "Organization of NJCAA Regions" page (24 regions, state-to-region mapping). **Do not add this to non-NJCAA schools** — Santa Monica College competes in CCCAA (California's separate community college association), not NJCAA, so it has no `njcaaRegion` field at all. This was caught live: an external AI-generated regional-strength claim incorrectly grouped Kansas schools (Barton CC, Cowley County CC) into "Region 11" — NJCAA's own page confirms Region 11 is Iowa + Northeast Nebraska only, and Kansas is Region 6. Never trust a third-party regional grouping without checking njcaa.org/member_colleges/Organization_of_NJCAA_Regions directly.

**Field gotchas (verified against the renderers, July 2026):**
- `kinRank` — one-line program-ranking blurb shown in the modal Degree tab. REQUIRED on every full profile: the renderer prints it unguarded, so a missing field displays the literal text "undefined". (Was missing on 45 v25-batch schools; backfilled v36.7.)
- `gpa.status` — must be exactly `eligible` | `borderline` | `below`. This is now purely informational/filter display (v37.1 removed GPA from the Fit Score) — cards recompute live via `refreshAllGpaRows()` and the Compare tab now calls `dynamicGpaStatus()` live too (v36.5), so this stored field can't drift the way it used to.
- `minutesOutlook.recruit_risk` — must be exactly `Low` | `Medium` | `High`. The renderers have no branch for anything else: `Very High`, `Medium-High`, `Moderate`, or sentence-style values all fall through to the green "Open" label — the opposite of the researched meaning.
- Stored `fitOlivier` / `lensScores.overall` must always equal the live scores.js formula output (`calculateFitScore()` — Soccer Priority formula since v37.1). `recalculateAllScores()` runs on every page load (`initApp()`), so any drift shows up immediately, not just when some toggle is touched. `node validate_consistency.js` checks this (Phase 4).
- `juco2yr: true` is the ONLY flag renderACUTable() uses to exclude JUCOs from the ACU Alignment tab — `div: "JUCO"` alone does NOT exclude.
- `facilityDetails.housing` — **REQUIRED on every full profile since v41.0, and it feeds the Fit Score.** `available` must be exactly `true | false | "limited"` — the housing penalty (−6/−3, see the weights table above) and a validate_consistency.js HOUSING check both read it. Display remains silent-unless-flagged (tag only when `false`/`"limited"`, same pattern as `top`/Elite JUCO — don't add a positive-case tag). All 110 schools researched Tier-1 as of v40 (12 JUCOs v37.7, 81 non-JUCO v38.2-v38.12, 17 v39 JUCOs in v39). A school added without this field now fails validation AND silently skips the penalty — never omit it.

### School object (listed-profile)
Same fields but `profileDepth: "listed"`.
`devScores` must be `null` — not zeros. Zeros render as "0%", null renders as "—" or hidden.
`minutesOutlook` must be `{ "available": false }`.

### minutesOutlook{} — full field reference
```
available (bool),
mf_total (int), roster_season (string),   ← renamed/added v44.32 — see note below
cleared_before_2027 (int), cleared_names[],
rising_senior_2027_count (int), rising_senior_2027_names[],
rising_junior_2027_count (int), rising_junior_2027_names[],
recruit_risk ("Low" | "Medium" | "High"),
trajectory[{ year, yr_label, pct, label }],
recruit_pathway ("Freshman-friendly" | "Transfer-preferred" | "Portal/JUCO-heavy" | "Mixed"),   ← added v34, optional, informational only
recruit_pathway_note (string)   ← added v34, optional, informational only — describe the actual roster pattern found (e.g. share of midfield spots filled by transfer/JUCO vs true freshmen, and whether true-freshman internationals who succeeded shared a pro-academy background)
```
**`mf_total` + `roster_season` (v44.32).** `mf_total` is the midfielder count on **whichever roster season was actually scraped**, and `roster_season` records which season that was — it is rendered verbatim as the Minutes Outlook stat label ("MFs (2026-27)"). The old key `mf_total_2025` baked a season into the key name, which went stale the moment a school was refreshed off a newer roster (Murray State, v44.29, displayed a 2026-27 count under a "MFs (2025)" label). **Both fields are required on every `available:true` school** and validated by `MO-KEYS`.

**`roster_season` must be the academic-year form `YYYY-YY` — always normalise.** Athletics sites are inconsistent: fall 2026 is labelled `"2026"` at calendar-year schools and `"2026-27"` at academic-year schools. Store `"2026-27"` in both cases. `validate_consistency.js` enforces the format, because a raw `"2026"` would render as "MFs (2026)" beside "MFs (2026-27)" on the same tab. **Update `roster_season` in the same edit as `mf_total`, every time** — a refreshed count under a stale season is the exact bug v44.32 existed to remove.

`recruit_pathway` and `recruit_pathway_note` carry **no scoring weight** — they do not feed lensScores.minutes or fitOlivier. They exist to separate "this school is a good fit on paper" from "this school realistically offers an entry point as an incoming freshman." Populate only when a school's roster is actually researched (Phase 1G) — do not backfill retroactively as a standalone project (that full pass is tracked separately, see backlog below).

### Roster Snapshot Archive (`data/rosters/`) — added v45.05

**A separate, append-only archive from everything else in this section — not athlete-facing, not scored, not validated the way `minutesOutlook` is.** Every field above this one exists because a roster refresh reads the *entire* roster page in a real browser but only ever transcribed the midfielders — everyone else on the page, and the exact date the page was read, was thrown away. `roster_season` (above) records which *season* a roster describes; it has never recorded when the page was actually *fetched*, which is why CLAUDE.md §6C has to maintain a freshness ledger by hand instead of just checking a timestamp. This archive fixes both gaps at once, and — since it captures every position, not just midfielder — is also the groundwork for a future non-midfielder athlete profile, or a future migration off flat JSON entirely (Supabase was evaluated and deliberately deferred; this captures what that migration would need without adding a new service today).

**Layout:**
```
data/rosters/
  manifest.json                       ← schoolId -> latest snapshot pointer
  {schoolId}/
    {fetchedAt}.json                  ← one file per scrape, never overwritten across days
```

**Snapshot file shape:**
```json
{
  "schoolId": "cowley_cc",
  "schoolFile": "data/juco.json",
  "fetchedAt": "2026-08-22",
  "rosterSeason": "2026-27",
  "sourceUrl": "https://cowleytigers.com/sports/msoc/2026-27/roster",
  "fetchMethod": "claude-in-chrome",
  "squadTotal": 27,
  "players": [
    { "name": "Nino Inchico", "position": "MF", "class": "So.", "hometown": "...", "previousSchool": null }
  ]
}
```
`fetchedAt` is always the real wall-clock date the refresh script actually ran (`datetime.date.today()` inside `refresh_school.py` — never something a patch file can supply), which is what makes it a trustworthy freshness signal rather than something an old patch could backdate. `position` is restricted to `GK | D | MF | F | OTHER` — the exact vocabulary `College Rosters/roster_data.json` already established in this repo, reused rather than inventing a second one. `previousSchool` is nullable — many rosters don't publish it (§15 already documents this).

**manifest.json:**
```json
{ "cowley_cc": { "latestFetchedAt": "2026-08-22", "latestFile": "data/rosters/cowley_cc/2026-08-22.json", "rosterSeason": "2026-27" } }
```
One flat object, rewritten in full on every snapshot write — the same read-modify-write pattern `refresh_school.py` already used for `roster_moves_queue.json`. Gives an instant single-file freshness check across all schools instead of scanning 170 directories.

**How it's populated — optional patch key, additive only.** `refresh_school.py`'s patch file accepts an optional `full_roster` array (plus optional `source_url`/`fetch_method`) alongside the existing `mf_total`/`cleared`/`rising_sr`/`rising_jr` keys — see the script's own docstring for the exact shape. **A patch without `full_roster` behaves exactly as it always has** — this did not change the existing cascade, the departure queue, or the newline-preservation logic in any way. As of v45.05, capturing the full roster is the **standard step** in the `roster-refresh` skill's research phase (§9) — no new browser visit, just recording what's already on screen instead of discarding everything but one position.

**No backfill.** The ~52 schools with partial roster data scattered across `College Rosters/*.json` (stale, June 2026) predate real fetch timestamps — inventing one for them would violate this project's own "never guess" rule. Coverage builds up naturally as schools get refreshed going forward; `check_roster_snapshot.py` (the `roster-refresh` skill) reports which schools have no snapshot yet as an expected, non-failing state, not a gap to rush-fill.

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
| 7 or below | Start from the 8-false set above and additionally mark covered:false working backwards from the end of the unit list (EXSC398, EXSC122, EXSC230, EXSC187...) until covered:true count matches acuAlign. Always verify the final count manually. |

### coaches.json — required fields per coach entry
```
id, schoolId, name, school, div, conf,
rank, rankClass (rk-elite | rk-strong | rk-solid),   ← HYPHENS not underscores
title (added v44.27 — e.g. "Head Coach", "Head Men's Soccer Coach"; this is now the ONLY
       place a coach's title lives, migrated from the removed school-object coach.title),
yearsHC, record, mlsPlayers, overallScore,
ptPathScore (deprecated — no longer rendered as of v43.0 §5d; retained as inert legacy data, not scored/displayed),
tacticalScore, devScore (legacy sub-scores — retired from the §5d standard v43.0; stored but not scored/displayed. Do not reason about them),
overallScoreNote (added v43.1 §5d Step 1 — cites the §5d Tier-1 CV/development evidence; its presence [string ≥20 chars] marks a coach as re-scored and activates the validate_consistency.js COACH-RUBRIC integer check; min 20 chars),
ausConnection (bool), licence (string or null),
bio, strengths[], staff[],
contact{ email, phone }
```
rankClass drives badge colour: `rk-elite` = gold, `rk-strong` = sky, `rk-solid` = emerald.
**After any coach addition or removal, re-rank ALL coaches by overallScore descending. Rank must be sequential with no gaps.**

**`bio` must never name a specific athlete (added v44.28).** `coaches.json` is athlete-agnostic — it's the same file regardless of which athlete's guide is loaded, and the project supports onboarding additional athletes under `athletes/` (§4). A bio hardcoding "Olivier" by name, or a date tied to one athlete's `targetDeparture`, is stale or wrong the moment a second athlete uses the guide. 15 bios were found doing this and fixed in v44.28 (e.g. "for Olivier" → "for a player targeting a DPT/OT/PA pathway"; "before Olivier arrives in August 2027" → "before a new recruit's first season"). Write bios about the coach and program only — athlete-specific fit reasoning belongs in the school's own `rec`/`culture.olivierMatch` fields (which are already explicitly athlete-specific by design) or in conversation, not in coaches.json.

### conferences.json — required fields per entry
```
id, name, abbr, tier, tierClass, prestige,
founded, teams, soccerTeams, ncaaTitles,
mlsPipeline, scholarships,
maxAid,   ← added v44.50. The conference card's "Max Aid" stat tile, REQUIRED on all 25.
             Short authored display string, ≤12 chars ("9.9" | "9.0" | "12" | "None" |
             "Varies"). It exists because the tile used to be PARSED out of the
             `scholarships` prose and rendered a word ("NCAA", "Army", "NAIA",
             "equivalent", "Athletic") for 10 of 25 conferences. validate_consistency.js's
             MAXAID check enforces presence + length AND greps js/app.js to fail if the
             old `scholarships.split()` ever returns.
guideSchools[] — display names (e.g. "Virginia (UVA)") NOT school JSON ids,
otherSchools[],
desc, olivierNote, color[]
```
**`scholarships` is free prose and `maxAid` is the display token — never re-derive one from the other.** `scholarships` is the long, nuanced sentence (it carries e.g. v44.49's House-settlement qualifier); `maxAid` is the compact number on the card. Editing the prose must never be able to change a rendered figure, which is exactly the coupling v44.50 removed. Note `conferences.json.scholarships` currently has **no renderer consumer at all** — only `conf-prestige.json.scholarships` is displayed (the prestige table's Scholarships column). It is stored reference data; if you want it on the card, add a labelled block like the existing "Pro Pipeline" one rather than squeezing it into the stat tile.
**tier field must exactly match renderConferences() bucket keys:** `"Power 5 (D1)"`, `"High Major (D1)"`, `"Ivy League (D1)"`, `"Mid-Major (D1)"`, `"Division II"`, `"NAIA"`, `"Division III"`, `"Junior College"`

### conf-prestige.json — required fields per entry
```
rank, rankClass, name, fullName, div, divBadge,
programsInGuide (comma-separated display names),
programsInGuideWarning (bool),
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
shortlist[] — [{id, status}] objects
outreach[]  — [{schoolId, status, lastContact, note}]
scoreWeights{ soccerQuality, minutesOutlook, climate, city }
guideTitle, guideSubtitle,
pathways{ paths[], coachQuestions[] }
```

**Retired in v37.1** (removed from schema — no longer read by any code): `scoreWeightsBase`, `soccerLevelMap`, `prePtMap`. These backed the old blended Fit Score (GPA/Cost/ACU included) and the score-mode toggle, both removed. If you find these fields referenced in an old branch or archived doc, they're describing pre-v37.1 behavior.

### Fit Score weights (v37.1 — live; matches scoreWeights in athletes/olivier.json)
| Factor | Weight | Formula |
|---|---|---|
| Soccer Program Quality | 40% | `devAvg×0.6 + (mlsPicks5yr/10, capped at 1)×0.3 + divStrength×0.1` — richer than a simple division lookup |
| Minutes Outlook | 35% | `(Yr1%×0.6) + (Yr2%×0.4)`, neutral 0.5 if unavailable |
| Climate | 15% | 1.0 if warm, else 0.2 (Olivier wants warm) |
| City Campus | 10% | 1.0 if city, else 0.3 (Olivier wants city) |
| **Housing penalty (v41.0)** | flat deduction | after the weighted total: **−6** if `facilityDetails.housing.available === false`, **−3** if `"limited"`, 0 if `true`. Owner-approved v41.0 — a young international with no dorms faces off-campus rent + transport alone; no other toggle captures this. `housingPenalty()` in scores.js; mirrored in validate_consistency.js. |
| **Funding penalty (v42.18)** | flat deduction | after the weighted total, **stacks** with housing: **−8** if `fundingPathway === "none"` (Ivy, NCAA D3, CCCAA — structurally forbidden to offer athletic aid), **−3** if `"capped"` (D2, NAIA, NJCAA DII), 0 if `"full"`/absent (D1, NJCAA DI). Owner-approved v42.0 (§5c) — scholarship *availability* is a structural program property, distinct from cost. `fundingPenalty()` in scores.js; mirrored in validate_consistency.js (FUNDING check requires the field on every non-D1 full profile). |

Same formula for JUCO and non-JUCO — GPA, Cost, and ACU Alignment are deliberately **not** in the Fit Score at all (v37.1 decision): they already have dedicated views (ATAR/budget toggles, Financial Model tab, ACU Alignment tab) and can't be predicted ahead of a real offer, so blending them in was actively misleading (e.g. Stanford sitting at 41% purely because of cost, pre-v37.1). When a real offer appears, check GPA/Cost/ACU manually via those dedicated views — don't expect the Fit Score to reflect them.

`divStrength` map (`DIV_STRENGTH` in scores.js): D1=1.0, IVY=0.9, D2=0.8, NAIA=0.65, D3=0.5, JUCO=0.6 — note this is a *different* map from the retired `soccerLevelMap` (which had JUCO=0.75); don't confuse the two if referencing old data.

---

## 5a. Dev Score Rubric (v42 — the written standard; score against this, never from feel)

**Status: standard adopted v42.0 (doc-only). The 110 stored `devScores` have NOT yet been re-scored against it.** Until the re-baseline lands, stored dev scores predate this rubric and should be treated as unverified.

### What Dev Score is

The quality of the **daily training environment** a player trains in, expressed on an absolute national scale anchored at the top of D1. It answers: *"how much will Olivier develop here, measured against the best environment available in US college soccer?"* — never *"how good is this program for its division?"*

### What Dev Score is NOT

| Not this | It lives here instead |
|---|---|
| Team results, rankings, titles | `titles[]` / `confRecord[]` |
| Transfer or professional output | `nextLevelOutput` (§5b) |
| Scholarship availability | `fundingPathway` (§5c) |
| Level of competition faced | `DIV_STRENGTH` in scores.js |
| Playing time | `minutesOutlook` |

**Every historical dev-score drift came from smuggling one of the above into a sub-score.** The v39 JUCO batch scored dev off 2025 results and rankings; the result was Indian Hills (JUCO) tying Syracuse (2022 NCAA champions) at 78, and Phoenix College (NJCAA DII) out-rating Tyler JC (NJCAA DI, 6 national titles). **If the evidence you are holding is a *result*, it does not belong in a dev score.**

### Sub-scores — each 0–100, absolute, averaged to `devAvg`

| Sub-score | Measures | Tier-1 evidence required |
|---|---|---|
| `tactical` | Coaching system quality for a central midfielder | Number of full-time coaches; head-coach tenure and playing/coaching pedigree; documented system of play; whether position-specific coaching exists |
| `technical` | Training environment | Soccer-specific vs shared facility; pitch standard; video-analysis staff; GPS/wearable technology |
| `fitness` | Sports science integration | S&C coach dedicated to soccer vs shared across sports; sports-performance staff listed in the athletics directory; nutrition and rehab access |

**Source discipline:** the school's own athletics staff directory and facilities pages. **Never a ranking site** — a ranking site measures results, which is the exact category error this rubric exists to prevent. Record what was observed in `devScoresNote`.

### Anchors — calibrate against these; do not re-score them casually

- **90–95** — Clemson, Indiana, Maryland, Georgetown, UVA. Full-time staff, sports-science personnel dedicated to soccer, soccer-specific stadium *and* training ground.
- **~75** — Creighton. Solid D1, shared S&C, no dedicated sports science.
- **~60** — DePaul. D1 membership, modest program investment.

**Conference is NOT a proxy for development environment.** Big East membership does not give DePaul's soccer program Indiana's sports-science department; basketball money does not reach the pitch. Score the program, not the letterhead. (This was tested: banding D1 by conference put 37 schools below their own floor — DePaul 60, Villanova 61, Xavier 63, Seton Hall 64 — because the band was wrong, not the scores.)

### Division ceilings — a ceiling, not a target

Justified on **staffing and facility limits**, both verifiable per-school from an athletics staff directory. Not on scholarship rules — scholarships are a funding fact and live in §5c.

| Division | Ceiling | Structural reason |
|---|---|---|
| D1 | **95** | anchor tier |
| Ivy | **88** | high-major staffing and facilities, but no spring competitive season |
| D2 | **76** | 1–2 full-time coaches, shared S&C, shared facilities |
| NAIA | **72** | 1–2 coaches, minimal support staff |
| JUCO | **68** | 1–2 coaches, rarely any S&C or sports science, often shared/municipal fields |
| D3 | **66** | often part-time coaches, no dedicated S&C |

**D1 has no floor.** A weakly-invested D1 program scoring 55 is a valid outcome, not a data error.

**No JUCO DI/DII dev split.** A DII JUCO may legitimately out-score a DI JUCO on *environment* if its facilities and staff are genuinely better. Where NJCAA DI pulls ahead is `nextLevelOutput` and `DIV_STRENGTH` — not here. Corollary, and it is counter-intuitive: **Northeast CC (2024 NJCAA DII National Champion) holding the lowest dev score of all 29 JUCOs is not necessarily wrong.** A national title is a result. It belongs in `titles[]` and `nextLevelOutput`, and it says nothing about whether the program employs a strength coach.

### Process per school

1. Gather Tier-1 evidence for all three sub-scores from the school's own site.
2. Score each sub-score 0–100 against the anchors above.
3. Compute `devAvg`; confirm it sits at or below the division ceiling.
4. Write `devScoresNote` citing the evidence observed.
5. Cascade: `fitOlivier` → `lensScores.overall` → `lensScores.value` (see §3a Change Type 13).

---

## 5b. nextLevelOutput (v42 — ✅ IMPLEMENTED v42.14)

**Status: shipped v42.14.** `nextLevelFactor()` lives in `js/scores.js` (mirrored in `validate_consistency.js`), gated on `proPlayers.nextLevel` presence — the one-way door: absent ⇒ legacy `min(1, mlsPicks5yr/10)`, present-with-`perYear` ⇒ `min(1, perYear/5.0594)`, present-without ⇒ neutral `0.3773`. All 29 JUCOs populated from the verified table below (7 measured + Phoenix n=1 + 21 neutral) and their `fitOlivier`/`lensScores.overall`/`lensScores.value` cascaded. Glossary Fit-Score prose (index.html ×2) updated "MLS pipeline" → "next-level output". `nextLevel` is stored but **not yet displayed** in any modal/card — the `nextLevelOutput` display block is still a future step. D2/NAIA/D3 keep `mlsPicks5yr` (measured zeros — no `nextLevel` field).

Replaces the `mlsPicks5yr` term inside `soccerQualityScore()`. Measures **does this program move a player up a level** — the thing dev scores were being abused to express.

### The bug it fixes is larger than the JUCOs (measured v42.1)

`mlsPicks5yr` is a **D1-shaped metric applied to a guide where 40 of 110 schools are not D1.**

| Division | Schools | `mlsPicks5yr > 0` | Pipeline term stuck at 0 |
|---|---|---|---|
| D1 | 67 | 58 | 9 |
| Ivy | 2 | 2 | 0 |
| **D2** | 8 | **0** | **8 — all** |
| **NAIA** | 3 | **0** | **3 — all** |
| **D3** | 1 | **0** | **1 — all** |
| **JUCO** | 29 | 1 (Monroe) | **28** |

**40 schools can never access 12 Fit points** (0.3 × 40 weight), no matter how many players they send up. Barry — 4× D2 national champions, the most decorated D2 program in the country — carries the same zeroed pipeline term as a bottom-table JUCO. Tyler JC's own record already conceded the problem: `"draftRank": "JUCO level — D1 transfer pipeline is the primary metric"`, while the formula had nowhere to put it. This is *why* past sessions inflated `tactical` — it was the only lever left.

### Metric: a RATE, never a raw count (owner-approved v42.1)

| Division | Metric | Normalised by | Missing data |
|---|---|---|---|
| D1 / Ivy / **D2 / NAIA / D3** | MLS SuperDraft picks, 5yr | `min(1, picks/10)` — unchanged | n/a — see below |
| **JUCO (29 schools)** | **D1 transfer commitments per year** | `min(1, perYear/5.0594)` — divisor = p90, set v42.12 | neutral **0.3773** |

**D2/NAIA/D3 keep `mlsPicks5yr`, and their 0 is a MEASURED zero (owner-approved v42.7).** MLS SuperDraft results are public record, so `mlsPicks5yr: 0` for Barry means Barry genuinely has no draft picks — it is not a data gap, and the neutral must **not** be applied. Establishing this closed a real hazard: **Barry, 4× D2 national champions, publishes no alumni or pro-signings tracking at all**, and neither will the other 11. Blanket-applying the neutral would have handed those 12 schools **~+4.5 Fit points each on no evidence** (0.3773 × 0.3 × 40), purely because their websites are quiet — the identical "website quality as proxy" error that forced the rate-based design in the first place. What is genuinely unmeasurable for them is *non-draft* pro signings (USL, MLS NEXT Pro), which no central source publishes; that is an accepted, documented limitation, not something to paper over with a default.

**Consequence: §5b's scope is the 29 JUCOs only.** The v42.2 "all 40 non-D1 schools" scope is superseded.

**Raw counts are forbidden, and this nearly trapped the v42.1 session.** Schools publish wildly different windows of history:

| School | Page name | D1 alumni | Window | **Per year** |
|---|---|---|---|---|
| Tyler JC | "Next Level" | 74 | 2012–2023 (12 yr) | **6.2** |
| Iowa Western | "Former Reivers" | 87 | 2004–2026 (22 yr) | **4.0** |

Iowa Western has *more* D1 alumni over a window nearly twice as long. **A raw 5-year count rewards whoever publishes the most history, not whoever develops the most players** — it is a website-quality proxy, exactly the class of error §5a exists to prevent. Store `d1Count`, `yearsCovered`, `years`, `perYear`, and `sourceUrl`; score off `perYear`.

### Schema (proposed)
```
proPlayers.nextLevel {
  metric: "d1TransferRate" | "proSigningRate" | "mlsPicks5yr",
  d1Count, totalCount,          ← raw, for display + audit
  yearsCovered: "2012-2023",
  years, perYear,               ← perYear = d1Count / years
  sourceUrl, note
}
```
Absence of `nextLevel` ⇒ fall back to `min(1, mlsPicks5yr/10)`. **The field's presence gates the new behaviour**, so `scores.js` can ship before any data exists and move zero scores — the same one-way-door pattern as `devScoresNote` (§5a).

### Sourcing (Tier-1, per school)

Each program's own alumni page. **Naming is inconsistent at every school** — four variants found in a sample of eight: *"Next Level"* (Tyler JC), *"Former Reivers"* (Iowa Western), *"Matadors Moving On"* (Arizona Western), *"Athletes Moving On"* (Phoenix College). Discovery per school; there is no URL pattern. **Indian Hills returns HTTP 403 to WebFetch and Monroe renders empty** (Cloudflare/Sidearm). Per §15, use the Claude for Chrome MCP for these scrapes; the v39 session lost two rosters to exactly this WebFetch failure mode and recovered both on the first real-browser attempt.

**Do not calibrate the divisor before gathering a real sample.** A guessed constant shipped into `scores.js` is indistinguishable from the inflation this whole effort exists to remove.

### Missing data ⇒ neutral, never 0 (owner-approved v42.2; neutral VALUE revised v42.12)

**Two-thirds of JUCOs publish no usable alumni data — 21 of 29, confirmed by reading all of them.** Barton CC and LSU Eunice offer only a *submission form*; Nassau and Westchester only a *survey*; Glendale's "Alumni" page lists All-Conference honours; Santa Monica's transfer page is an empty stub; Daytona State — the **2025 NJCAA DI National Champions** — publishes nothing. Scoring them 0 would reproduce the precise "absence of data = absence of quality" error this whole step exists to remove.

So `nextLevelFactor()` returns the **neutral constant when data is unavailable**, in the spirit of `minutesOutlookScore()`'s *"neutral — not penalised."* **Unknown ≠ zero.** The `nextLevel.note` must record that the value is **neutral, not measured**.

**The neutral is `NEXT_LEVEL_NEUTRAL = 0.3773` (median measured factor), NOT 0.5.** See "Divisor and neutral" above. v42.2 set it at 0.5 by analogy with `minutesOutlookScore()`; once all 29 schools were read, 0.5 proved to sit well above the median real program (0.377) and thus *rewarded* silence — 4 of the 7 researched schools scored below it. Owner revised it to the measured median in v42.12.

**Known consequence, still accepted:** a researched-but-weak program can score *below* an unresearched one. Indian Hills (0.174), Arizona Western (0.141) and Southeastern CC (0.028) all land under the 0.377 neutral. This is inherent to any neutral default (`minutesOutlook` has the identical property) and is the honest trade: we do not punish a program for its webmaster, and we do not reward one for hiding. The neutral is now anchored to the *observed median* rather than an arbitrary midpoint, which is the most defensible form of that trade. Do **not** push it toward 0 — that re-creates the zeroing bug.

### MANDATORY: classify every destination's division yourself — the source page is not authoritative on this

**A school's own alumni page will confidently state the wrong division.** Indian Hills' "Next Level Warriors" page has a proper `Level` column and prints **24 NCAA DI** destinations. Read in a real browser and checked school-by-school, only **15** are actually D1:

- **Eastern New Mexico University is labelled "NCAA DI" in 10 separate rows.** ENMU plays in the Lone Star Conference — it is **NCAA Division II**.
- One row (Alcides Duarte → "Eastern New Mexico + Liberty | NCAA DI + NCAA DII") has the pairing **inverted**: Liberty is the D1 school, ENMU the D2 one.

Indian Hills' true rate is **0.88 D1/yr**, not the 1.41 its page implies. **This metric is a rate of D1 placements — a mislabelled destination corrupts it directly.** For every destination, verify the receiving school's division independently (ncaa.com or that school's own athletics site). Never accept the alumni page's own `Level` column, and never accept a summarizer's inference. Record the count you verified, and note any page-vs-truth discrepancies, in `nextLevel.note`.

**The seven ways an alumni page lies (all observed, v42.7–v42.12):**
1. **No division headers at all.** Tyler JC's 2012–2021 are undivided name lists mixing D1/D2/D3/NAIA.
   A summarizer counts *names*. That is where the phantom "74 D1" came from.
2. **A division column that is wrong about third parties.** Indian Hills labels Eastern New Mexico
   "NCAA DI" in ten rows (it is D2, Lone Star), and inverts a Liberty/ENMU pairing in an eleventh.
3. **Institution division ≠ sport sponsorship.** *Arizona Western prints "NCAA DI" 25 times; only 15 are
   real.* Arizona, Arizona State, Northern Arizona, Southern Utah and New Mexico State are D1
   **institutions that sponsor no varsity men's soccer**. Tier-1 proof: nauathletics.com's own sport nav
   lists soccer under **Women's** Sports only. Always ask "does this school field a men's soccer team?",
   not "is this school D1?"
4. **Division at time of transfer ≠ division today.** UC San Diego, California Baptist, UMass Lowell,
   Nebraska-Omaha, Grand Canyon, UT Tyler, St. Thomas (MN), Southern Indiana and Dixie State/Utah Tech
   all changed division inside these windows. Saint Francis (PA) went D1→D3. St. Francis Brooklyn and
   Notre Dame College ceased athletics outright.
5. **Cross-sport contamination.** Phoenix's and Angelina's sources are all-sports; count men's soccer only.
6. **Right nav label, wrong content.** Glendale's `/sports/msoc/alumni` lists All-Conference honours, not
   destinations. Santa Monica's transfer page is an empty stub.
7. **Substring collisions when matching school names.** "Point University" (NAIA, GA) is not "High Point
   University" (D1). "Xavier University of Louisiana" (NAIA) is not "Xavier University" (D1). "Monroe
   University" is NJCAA, not the NCAA D2 that Angelina's release calls it. Match the full official name.

**Use the NCAA member directory as the independent authority** (JSON, one call per division):
`web3.ncaa.org/directory/api/directory/memberList?type=12&division={I,II,III}&sportCode=MSO`

**Use the Claude for Chrome MCP for these pages (§15).** `WebFetch` does not return the page — it returns a small model's *summary* of the page, which infers and compresses. Two facts in the v42.7 pass came back wrong from WebFetch and were only caught by reading the rendered text in a real browser: it reported that this page "has no division headers" (it does), and it reported the D1 count as 17 (it prints 24; 15 are real). **Never store a fact obtained from a WebFetch summary.**

### Calibration sample — ✅ COMPLETE, all 29 JUCOs (v42.12)

**Division authority used for every destination:** the NCAA's own member directory, filtered to men's soccer —
`web3.ncaa.org/directory/api/directory/memberList?type=12&division={I,II,III}&sportCode=MSO`
(D1 = 213, D2 = 202, D3 = 406 programs). **Absence from all three ⇒ NAIA / NJCAA / no varsity program.**
Caveat: the directory reflects the CURRENT year. Judge division **at time of transfer** — Cincinnati, New Mexico
and Bowling Green have since dropped men's soccer; Notre Dame College and St. Francis Brooklyn ceased athletics.

#### Measured, multi-year (7) — the ONLY rows eligible for the divisor
| School | d1Count | Window | yr | **D1/yr** | Was (WebFetch) |
|---|---|---|---|---|---|
| Tyler JC | 79 | 2012–2023 | 12 | **6.58** | 6.2 ↑ |
| Iowa Western | 93 | 2004–2026 | 23 | **4.04** | 4.0 ≈ |
| Cowley CC | 25 | 2017-18–2023-24 | 7 | **3.57** | 3.43 ↑ |
| Pima CC | 21 | 2015–2025 | 11 | **1.91** | *(was assumed to publish nothing)* |
| Indian Hills | 15 | 2008–2024 | 17 | **0.88** | 0.88 = |
| Arizona Western | 15 | 2003–2023 | 21 | **0.71** | 0.86 ↓ |
| Southeastern CC (IA) | 1 | 2018–2024 | 7 | **0.14** | *(newly found)* |

**Every provisional figure moved, in BOTH directions.** WebFetch summaries are not conservatively biased —
three went up, one down. Do not treat an unverified summary as a lower bound.

#### Single-year sources (2) — owner-approved v42.12
| School | d1Count | Window | D1/yr | Treatment |
|---|---|---|---|---|
| Phoenix College | 3 | 2024-25 | 3.00 | **Store `perYear: 3.0` (factor 0.593) with an `n=1` note; EXCLUDE from the divisor.** Its PDF is an annual series. |
| Angelina College | 2 | 2025-26 | 2.00 | **→ neutral 0.3773.** A one-off news release, not a maintained page; its own text says "the list (so far)". Record the finding in `note`, not in `perYear`. |

A 1-year window is not comparable to Tyler's 12 or Iowa Western's 23; at ~3.0 it would sit near the top and
distort any percentile.

#### The metric discriminates, emphatically — and now on verified numbers
Indian Hills carries the **highest dev-avg of any JUCO (78, tied with Syracuse)** and places **0.88** players/yr
in D1. Tyler places **6.58** — a **7.5×** spread over Arizona Western (0.71), and both are `jucoTier: "Elite"`
with identical dev-avg 74. That spread is precisely the signal `devScores` was being distorted to carry.

### Divisor and neutral — SET (owner-approved v42.12)

```
D1_RATE_DIVISOR = 5.0594     // 90th percentile of the 7 multi-year schools
NEXT_LEVEL_NEUTRAL = 0.3773  // median measured factor — NOT 0.5
nextLevelFactor = min(1, perYear / D1_RATE_DIVISOR)   // when nextLevel is present
                = NEXT_LEVEL_NEUTRAL                   // when it is absent
```

Distribution of the 7: `0.1429, 0.7143, 0.8824, 1.9091, 3.5714, 4.0435, 6.5833` → p90 = **5.0594**.
Robust: if Tyler were 6.42 (excluding the two 2013 Grand Canyon reclass rows) p90 = 4.99.

| School | perYear | factor |
|---|---|---|
| Tyler JC | 6.5833 | **1.000** (capped) |
| Iowa Western | 4.0435 | 0.799 |
| Cowley CC | 3.5714 | 0.706 |
| Phoenix College | 3.0000 | 0.593 *(n=1 — stored, but excluded from the divisor)* |
| Pima CC | 1.9091 | 0.377 |
| Indian Hills | 0.8824 | 0.174 |
| Arizona Western | 0.7143 | 0.141 |
| Southeastern CC (IA) | 0.1429 | 0.028 |
| *21 schools with no data* | — | **0.377 (neutral)** |

#### Why the neutral is 0.3773, not 0.5 — REVERSES part of the v42.2 ruling
At divisor 5.06, **four of the seven researched schools fell below a 0.5 neutral**. §5b had anticipated
this for Arizona Western alone and called it "the honest trade"; once all 29 were read it became the
*majority* case. The measured distribution is right-skewed (median perYear 1.91), so **0.5 is not
"middle" — it is well above typical**, and it handed ~+1.4 Fit points to a school for having a quiet
website. That is precisely the "absence of data = absence of quality" error inverted, and exactly the
class of error this whole effort exists to remove.

**Owner ruling (v42.12): the neutral is the MEDIAN MEASURED FACTOR — "unknown = typical", not
"unknown = half the cap."** This *lowers* the default from 0.5 → 0.3773 and therefore supersedes the
v42.2 sentence *"Do not 'fix' this by lowering the default — that just re-creates the zeroing bug."*
That warning was about lowering the default **toward zero**; 0.3773 is the observed median of real
measured programs, not zero. **Unknown ≠ zero still holds.** The neutral coincidentally equals Pima's
factor exactly, because Pima *is* the median school.

**Lowering the DIVISOR to flatter the data remains forbidden** — that is reverse-engineering the
constant, the same error as the original dev-score inflation.

**Recompute both constants if any school's `perYear` changes.** They are derived, not chosen.

### Alumni-page URLs — ✅ ALL 29 RESOLVED (v42.12). Do not re-discover.

All 9 pages below were read in Claude for Chrome and **every destination's division hand-checked**
against the NCAA directory. Do not re-read them; do not trust a summary of them.

| School | Alumni page URL | Result |
|---|---|---|
| Tyler JC | `apacheathletics.com/sports/msoc/Sites/Mens_Soccer_Next_Level` | ✅ 79 D1 / 12 yr = **6.58** |
| Iowa Western | `goreivers.com/sports/msoc/former` | ✅ 93 D1 / 23 yr = **4.04** |
| Cowley CC | `cowleytigers.com/sports/msoc/alumni` | ✅ 25 D1 / 7 yr = **3.57** |
| Pima CC | `pimaaztecs.com/sports/msoc/movingon` | ✅ 21 D1 / 11 yr = **1.91** |
| Indian Hills | `indianhillsathletics.com/sports/msoc/alums/index` | ✅ 15 D1 / 17 yr = **0.88** (page prints 24) |
| Arizona Western | `awcmatadors.com/sports/msoc/MSOC_Moving_On` | ✅ 15 D1 / 21 yr = **0.71** (page prints 25) |
| Southeastern CC (IA) | `sccblackhawks.com/sports/msoc/Men-s_Soccer_Alumni` | ✅ 1 D1 / 7 yr = **0.14** |
| Phoenix College | PDF: `d2o2figo6ddd0g.cloudfront.net/p/q/rwrkzf3a0lwf0k/moving_on.pdf` | ⚠️ n=1 — 3 D1 (2024-25). Real PDF is the CloudFront URL; `/information/moving_on.pdf` is only a viewer. Chrome's PDF plugin exposes NO text — download + `pdfplumber`. |
| Angelina College | `angelinaathletics.com/sports/bsb/2025-26/releases/20260528fiungj` | ⚠️ n=1 — 2 D1. A news release, not a maintained page; says "list (so far)". |

**None of these 9 have a dedicated alumni page. 20 more were confirmed to publish nothing usable either** (Barton CC, Daytona State, Eastern Florida State, Northeast CC, Monroe, Glendale CC (AZ), Johnson County CC, Mohave CC, Dodge City CC, Neosho County CC, Iowa Lakes CC, Blinn College, Coastal Bend College, LSU Eunice, Nassau CC, Ulster CC, Suffolk CC, Westchester CC, Santa Monica, Miami Dade) — **that finding stands; it is a claim about alumni PAGES, not about transfer-tracker cross-checks (see next section), which is a separate, later-added check.**

7 measured (this table) + 1 stored-but-excluded (Phoenix, n=1) + 2 more stored-but-excluded via tracker cross-check (EFSC, Monroe — see below) + 21 pure-neutral (the 20 above + Angelina) = **31** ✓

### Neutral is a correct NUMBER, not an excuse for empty prose (added v44.67, prompted by a v44.66 owner catch)

**"No dedicated alumni page" only settles whether `perYear` gets a value. It does NOT excuse the surrounding `notable[]`/`nextLevel.note` text from being generic boilerplate.** Found live v44.66: Lewis & Clark CC's Pro Pipeline tile correctly showed the neutral factor, but the prose next to it was pure template language ("no alumni page found... neutral, not measured") — the owner looked at the live app and asked directly why the analysis "wasn't done." The number was right; the tile still read as empty. The owner then asked for the full fix: a permanent process rule, plus an immediate audit of the other 21 pre-existing neutral JUCOs.

**Permanent required step for every JUCO that lands on the neutral, whether newly added or already in the guide:** before finalizing `notable[]`/`nextLevel.note`, cross-check the school's exact name against a national third-party D1 transfer tracker (TopDrawerSoccer's annual "Men's Division I Transfer Tracker" articles — one per year, search-engine discoverable) — **discovery only, per RULE 0**, never store a fact from the tracker itself. Watch for name-collision traps (Lewis & Clark **Community College** vs Lewis & Clark **College**, Portland OR — same trap class as §5b's "seven ways an alumni page lies"). If a hit survives the name check, **Tier-1-verify it on the *destination* school's own official roster** (it will usually list the JUCO as "previous school" or "last school") before using it anywhere. A season-scoped roster URL (`/roster/2025`, `/roster/2024`) often finds a transferred player the *current* roster no longer shows — but if even that fails, the lead is unconfirmed and gets dropped, not guessed.

**One confirmed hit ≠ a measured rate; MULTIPLE confirmed hits across the tracker's own years CAN become one, on the Phoenix College precedent.** A single tracker-year hit is crowd-sourced, self-declared incomplete evidence — fold it into `notable[]`/`draftRank` as color, leave `perYear` null, no score movement. But when cross-checking the *same two tracker years* independently turns up **multiple** confirmed transfers for one school, that clears the same bar Phoenix College's single annual PDF cleared (v42.12): store a real `perYear`, but **always EXCLUDE it from `D1_RATE_DIVISOR`** — it is a partial cross-check of two specific years, not the comprehensive multi-year alumni-page census the divisor's 7 schools were built from, so it must never be allowed to pull that constant around.

**Audit of all 22 pre-existing neutral JUCOs (the 20 "publish nothing" + Angelina + Lewis & Clark): CLOSED v44.67, both tracker years (2024, 2025) checked by exact name.**

| Outcome | Schools | Detail |
|---|---|---|
| **Promoted to measured, excluded from divisor** (Phoenix precedent) | **Eastern Florida State** (3 confirmed 2025 transfers: Achermann-Stanfield→Tulsa, Emmanuel→SMU, McCoy→USF; `perYear` 3.0), **Monroe** (4 confirmed 2024-25: Jinkinson→Missouri State, Weir→Wisconsin-Milwaukee, Lee & Silvestrini→Xavier; `perYear` 2.0) | Fit Score moved: EFSC 62→65, Monroe unchanged at 59 (its stale `lensScores.soccer` — 72, pre-existing drift unrelated to this change — corrected to 52 in the same cascade) |
| **One confirmed name, stays neutral** | Johnson County CC (Zuñiga→Wisconsin-Milwaukee, 2025), LSU Eunice (Jeanfreau→Presbyterian, 2024), Angelina College (Traore→Memphis, 2025), Daytona State (Zambrano→Syracuse, 2024) | `notable[]`/`draftRank`/`nextLevel.note` enriched with the real name; `perYear` stays null, **no score change** |
| **Genuinely nothing found, stays neutral** | Santa Monica, Miami Dade, Northeast CC, Barton CC, Mohave CC, Glendale CC (AZ), Dodge City CC, Neosho County CC, Iowa Lakes CC, Blinn College, Coastal Bend College, Nassau CC, Ulster CC, Suffolk CC, Westchester CC, Murray State (OK) | No changes — this is a legitimate research outcome (16 of 22), not a gap. Leads that didn't survive verification and were correctly dropped: Lezzar→CSUN (LSU Eunice, roster had no explicit previous-school field), Thallinger→Tulsa (Monroe, not on current roster), Hennah/Verdirosi→Missouri State (Northeast CC / EFSC, not on current roster), Smith→Oral Roberts (Angelina, page content didn't load the name), Zuniga→Wisconsin-Milwaukee (Daytona State, not on current roster) |

See `feedback_neutral_fields_still_need_real_content` memory for the incident this originated from.

### Alumni-page discovery: SEVEN naming variants, no URL pattern
`Next Level` (Tyler) · `Former Reivers` (Iowa Western) · `Matadors Moving On` (Arizona Western) ·
`Moving On` (Pima) · `Athletes Moving On` (Phoenix — school-wide PDF) · `Alumni` (Cowley, Glendale) ·
`Next Level Warriors` (Indian Hills) · `Soccer Alumni` (Southeastern CC) ·
`Where did SMC athletes transfer to?` (Santa Monica).

**Two of those nav links are decoys.** Glendale's `/sports/msoc/alumni` lists **All-Conference honours,
not destinations**. Santa Monica's transfer page is an **empty stub** (nav + a Twitter widget, zero content).
A nav label matching "alumni" is not evidence that next-level data exists — open it and read it.

### Tooling (hard-won; re-read before scraping)
- `indianhills.edu` 403s but `indianhillsathletics.com` serves fine — always try the athletics host.
- **`navigate` returns BEFORE the page renders.** A `javascript_tool`/`find` call batched immediately after it
  runs against an empty DOM. **Control test that proved this:** `goreivers.com/sports/msoc/index` — a page
  known to have a "Former Reivers" link — reported `totalLinks: 0`. **Pima and Angelina were both first
  recorded as "no alumni page"; both have one.** Navigate and read must be SEPARATE tool calls; before
  trusting a negative, assert `document.readyState === 'complete'` and a sane link count (>20).
- Cloudflare "Just a moment…" (Coastal Bend, `cbc.prestosports.com`): load the site root
  (`/landing/index`) first to clear the challenge, then the sport page.
- PDFs need `pdfplumber`/`pypdf` (both installed); naive stream extraction returns CID glyph IDs, not text.
- **NXDOMAIN is the only proof a host is dead.** A 403 means "exists but blocked"; a *resolving* host can
  still serve a parked lander (Monroe). Check content, not just DNS.

### The canonical example — why `mlsPicks5yr` is the wrong metric for a JUCO

Northeast CC publishes a Dec-2025 release: **Edouard Nys, 2nd round, 40th overall, FC Dallas, 2025 MLS SuperDraft.** He played two seasons at Northeast (2023–24), transferred to **UIC**, led the NCAA in goals per game, and was drafted **out of UIC**.

So Northeast's stored `mlsPicks5yr: 0` is **factually correct** — and that is exactly the indictment. Northeast's real next-level output was *a D1 transfer that became an MLS second-round pick*, and the current formula scores it **zero**. UIC banks the credit, and UIC is not even in this guide. Do not "fix" this by crediting the draft pick to Northeast; fix it by measuring the D1 transfer, which is what `d1TransferRate` does.

This is also the cleanest validation of the §5a split: Northeast is the 2024 NJCAA DII National Champion *and* holds the lowest dev-avg of all 29 JUCOs (57). Both can be true. The title and the pro alumnus are **results** — they belong in `titles[]` and `nextLevelOutput`, not in `tactical`.

---

## 5c. fundingPathway (v42 — ✅ IMPLEMENTED v42.18)

**Status: shipped v42.18.** `fundingPenalty()` lives in `js/scores.js` (mirrored in `validate_consistency.js`): −8 `none` / −3 `capped` / 0 `full`|absent, applied after the weighted total and **stacking** with `housingPenalty()`. `fundingPathway` is stored on all **43 non-D1 full profiles** (20 NJCAA DI JUCOs = `full`, no score change; 19 `capped`; 4 `none`) — D1 defaults to `full` via the absent-⇒-0 gate and carries no field. The 23 `capped`/`none` schools had `fitOlivier` + `lensScores.overall` + `lensScores.value` recomputed and re-stored. The 8 NJCAA DII bare-`aid:"Athletic"` strings were corrected to a capped framing (`"Athletic (NJCAA DII: tuition, fees & books; no room/board)"`) — this extended §5c's named 4 (Phoenix/Pima/Glendale/Johnson County) to all 8 DII schools, the same error class. `validate_consistency.js` gained a `FUNDING` check enforcing a valid value on every non-D1 full profile. Glossary Fit-Score card updated. The §5a devScore re-baseline this was sequenced alongside is also complete — the validator reports every school re-baselined with 0 above its division ceiling.

A flat penalty applied after the weighted total, exactly like `housingPenalty()` (v41.0). Owner-approved v42.0.

**The distinction that justifies it:** *cost* is a price tag (COA in dollars, varies yearly, has the Financial Model and budget slider — correctly removed from `fitOlivier` in v37.1). ***Scholarship availability* is a structural property of the program** — a CCCAA or D3 school cannot offer athletic money to anyone, ever, at any price. v37.1 removed the price tag; it never ruled on structural availability. Two schools with identical Fit should not rank equal when one can fund an athlete for playing and the other is forbidden to.

| Value | Meaning | Divisions | Penalty | Count |
|---|---|---|---|---|
| `full` | Full athletic ride structurally possible | D1, NJCAA DI | **0** | 87 |
| `capped` | Permitted but limited by rule | D2 (9 equiv.), NAIA (12 equiv.), NJCAA DII (no room & board) | **−3** | 19 |
| `none` | No athletic scholarships permitted | Ivy, NCAA D3, CCCAA | **−8** | 4 |

**Stacks with `housingPenalty()` — owner-approved v42.0.** Santa Monica: −6 housing, −8 funding = −14. Deliberate: no on-campus housing *and* no athletic money means the family pays rent unaided.

**The penalty ranks; the note discloses.** `aid` display strings stay fully descriptive. Princeton's *"Need-based ONLY — no athletic scholarships (can cover 100% for qualifying families)"* must remain visible in the modal — the −8 reflects that the aid is means-tested and carries no coach leverage, not that Princeton is unaffordable. Owner considered and rejected a `need-only` exemption tier (v42.0): the platform's premise is flagging *scholarship* opportunities.

**Scope note:** because `full` carries a zero penalty, *House*-settlement opt-in status does **not** need researching for the 60 D1 schools — it cannot change a score. Default D1 → `full`. Only the 23 `capped`/`none` schools need Tier-1 aid research.

**Known data errors this fixed** (found v42.0): Santa Monica stored `aid: "Athletic Grants + Need"` though CCCAA prohibits athletic scholarships outright (corrected v42.16); Phoenix, Pima, Glendale and Johnson County stored a bare `aid: "Athletic"` though NJCAA DII covers tuition/fees/books only (corrected v42.18, along with the other 4 DII schools Northeast/Neosho/Southeastern/Iowa Lakes). These strings render on the card, the Compare row, and the modal.

Division rules (Tier-1, verified v42.0): NCAA D1 post-*House* (July 1 2025) replaced sport-specific scholarship limits with a 28-player roster cap, all fundable, at opt-in schools — [ncaa.org](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx). NJCAA DI: tuition, fees, books, room & board. DII: tuition, fees, books only. DIII: none — [njcaa.org](https://www.njcaa.org/member_colleges/Divisional_Structure). Ivy League: need-based aid only, no athletic scholarships in any sport. CCCAA: athletic scholarships prohibited.

---

## 5d. Coach overallScore Rubric (v43 — the written standard; score against this, never from feel)

**Status: ✅ COMPLETE. Standard adopted v43.0; the re-score campaign finished in v43.12 — `validate_consistency.js` confirms every coach re-scored against §5d with 0 legacy values.** Score new and changed coaches against this rubric, never from feel. This section is to coach scores what §5a is to school dev scores: it exists because `overallScore` had the identical failure mode — a judgment value scored on different questions, by different sessions, against no anchor.

**Design owner-approved v43.0 (three decisions):** (1) `overallScore` is a **single holistic 0–100 score**, defined directly — *not* a computed average of sub-scores. (2) It measures **two things only: coaching pedigree/system + player development/next-level output.** (3) The legacy sub-scores `tacticalScore`, `devScore`, `ptPathScore` are **retired from the standard** — do not score, display, or reason about them (see the deprecation note at the end).

### What overallScore is

An absolute, national-scale rating of **coaching quality** — how good the coach is at developing and leading a central midfielder like Olivier, measured against the best head coaches in US college soccer. It answers *"how good is this coach, as a coach?"* — never *"how good is this coach for their division / program / conference?"* and never *"how good was last season?"*

### What overallScore is NOT

| Not this | It lives here instead |
|---|---|
| Tenure / job security / "safe bet" | `yearsHC`, `record` (display fields only — a strong CV is not floored for a low `yearsHC`; a long `yearsHC` is not a score by itself) |
| Fit for Olivier specifically (Aus link, licence) | `ausConnection` (bool), `licence` (string) — display fields, not scored |
| Team results / titles / a good season | `record`, and the school's `titles[]` / `confRecord[]` |
| The school's training environment (facilities, S&C, sports science) | the **school's** `devScores` (§5a) — orthogonal: that scores the *building and support staff*, this scores the *person*. A great coach can sit in a modest environment (see Hackworth anchor) and vice-versa. **Never let one leak into the other.** |
| The school's recent program pipeline | the school's `nextLevelOutput` (§5b) — a *program* metric any coach at that school inherits. Pillar B below scores the coach's *own career-long* development record, not the program's current feed. |

**Every historical `overallScore` drift came from smuggling one of the above into the number** — most often prestige-halo (a big-conference name scored high on the letterhead) or a single good/bad season. If the evidence you are holding is a *team result*, a *facility*, or a *program's* pipeline, it does not belong in the coach's score.

### The two pillars — one holistic judgment, roughly balanced

`overallScore` is a single integer, but it is formed by weighing two pillars of Tier-1 evidence (aim for a rough 50/50 balance; they are not separately stored):

**Pillar A — Coaching pedigree & system.**
- Playing career level (pro / full international / college).
- Coaching CV: head-coach stops and their level; assistant pedigree; who they trained under; whether they have a documented coaching tree.
- Licence held (USSF/UEFA Pro > A > B) — a genuine credential, not a display trophy.
- Documented style of play and **position-specific coaching for a central midfielder** (does a dedicated midfield/technical coach exist on staff?).
- Full-time staff depth.
- National coaching recognition (Coach-of-the-Year honours) — allowed as *coach-level* recognition, but weigh it as pedigree, not as a proxy for the team's win-loss.

**Pillar B — Player development & next-level output.**
- The coach's **own career-long** fingerprint for moving players up a level: MLS/pro signings, full internationals, and (for JUCO/lower divisions) D1-transfer production *attributable to this coach across all their stops* — not the current program's inherited pipeline.
- Documented individual-player improvement / notable players they personally developed.

**Source discipline (Tier-1):** the school's own men's-soccer staff/bio page for the coach's CV, licence, playing career, and named developed players; reputable coaching records for career stops. **Never a ranking site, never last season's table.** Record what was observed in `overallScoreNote` (companion field — see Process).

### Absolute scale & named anchors — calibrate against these; do not re-score them casually

Bands align with the existing `rankClass` cutoffs (elite ≥ 80, strong 65–79, solid ≤ 64), so a re-score does not require re-defining badge thresholds.

- **90–98 — national-elite.** Gelnovatch (UVA, 98), Noonan (Clemson, 97), Cirovski (Maryland, 96), Wiese (Georgetown, 95), Yeagley (Indiana, 95). NCAA-champion pedigree, deep coaching trees, prolific pro/international producers, top licences, dedicated position coaching.
- **80–89 — elite.** Somoano (UNC, 88 — 2011 national title, strong pro output), Embick (Akron, 88), Hudson (SMU, 89). Proven high-major winners and developers, clear pro pipeline attributable to them.
- **65–79 — strong.** Solid D1 head coaches with a good CV and some pro output; mid-major standouts; and the **ceiling-free cases**: an elite-CV coach at a structurally constrained program — **Hackworth (Navy, 74)** is the worked anchor (ex-MLS head coach, USMNT U-17, USL title; anchored *below* national-champ college coaches and mentor Vidovich (Pitt 76), *above* Plotkin (Army 70) — a service-academy ceiling on the *program* does not cap the *coach's* CV). A genuinely strong JUCO/lower-division developer with real D1-transfer/pro production belongs here too.
- **48–64 — solid.** Early-career D1 coaches, lower-resource programs, thin or undocumented pedigree, limited attributable next-level output. Most JUCO/D2/D3 coaches sit here **on evidence, not by rule.**

**No hard division ceiling — this is the deliberate difference from §5a.** §5a caps dev scores by division because *environment* is bounded by a program's staffing/facilities budget. **Coaching quality is a property of the person, not the program**, so a coach is scored on their own CV and development record regardless of where they currently work — Hackworth is precisely why. In practice the top bands are D1-dominated because the deepest CVs and the most verifiable pro output concentrate there, but that is an *evidence* outcome, not a cap. A JUCO coach reaching `rk-strong` (65+) is legitimate if the personal record supports it.

**Prestige is not a proxy for coaching quality.** A big conference does not make its coach elite (the same error §5a flags for conference-banding dev scores). Score the CV, not the crest — the results-halo strip already applied to *school* scores (ND, Duke, Syracuse) is the same discipline applied to *coaches*.

### Process per coach

1. Gather Tier-1 evidence for both pillars from the school's own men's-soccer staff/bio page (+ reputable records for prior stops).
2. Weigh Pillar A and Pillar B against the named anchors above.
3. Assign one integer 0–100.
4. Write **`overallScoreNote`** (companion field, to be added in Step 1 of the re-baseline — the analog of `devScoresNote`) citing the CV and development evidence observed. Its **presence** marks the coach as scored against §5d and gates any future validator check; absent = legacy value, pending re-score. Min ~20 chars.
5. **Do not partially re-score — the Solomon trap.** Correcting one coach's facts and re-scoring only them moves the ranking without making it more correct: every other coach is still sitting on a score from a different era and a different question, so the "fix" just shuffles one name through an unreliable ordering. That is why the v43 campaign re-scored **all** of them before re-ranking once. The rule still binds today: if a coach change makes you doubt the yardstick rather than the one value, re-score the set, don't nudge the one.

### v43 sequence — ✅ ALL STEPS COMPLETE (kept as the pattern for any future re-baseline)

- **Step 0 — DONE (v43.0, doc-only):** rubric written to §5d. No score or rank moved. Also deprecated the `ptPathScore` "PT Path" badge from the coach card (owner-approved — the label collided with the schools' *Pre-PT Path* physical-therapy meaning, which ACU Alignment already covers; the field stays in the data as inert legacy, no longer rendered).
- **Step 1 — DONE (v43.1):** `overallScoreNote` added to the coaches.json schema (§5) + a gated `COACH-RUBRIC` validator check. Gate = a substantive note (string, ≥20 chars) marks a coach as re-scored and activates an integer-0–100 check on `overallScore`; absent = legacy, counted as backlog progress, **not** an issue — so day one held at Issues:0 (`0/110 re-scored · 110 legacy pending`). A **global** rankClass↔score band-coherence check (elite ≥80 / strong 65-79 / solid ≤64) was also added (all 110 are coherent today). One-way door, exactly like `devScoresNote` (§5a Step 1). No score or rank moved.
- **Step 2 — DONE (v43.2–v43.12):** all coaches re-scored against §5d, batched one conference file per commit with the validator green each time, then a **single** global re-rank at the end. Coach scores have **no `fitOlivier` cascade** (scores.js reads only school-level `devScores`, never coaches.json), so unlike the §5a re-baseline this campaign could not move any school's Fit rank — the only outputs were the coach rank order and the "Overall" badge. Per-batch detail is in CHANGELOG.md v43.2–v43.12 and the `coach_rescore_campaign` memory.

---

## 6. Current State & Open Items

**Current version: v45.05 (2026-08-22).** Always confirm against `git log --oneline -1` and `guideVersion` in `athletes/olivier.json` — do not trust this line alone. It has sat stale for as many as 13 versions at a time, which is the clearest evidence available that a bloated section stops being read.

> **v44.62–v44.63 incident, recorded here rather than as a version narrative because it's a standing risk, not a one-off fact:** on 2026-08-07 a session working from a stale local checkout (16 days behind `origin/main`) committed a small fix on top of the old base, correctly `git pull`-merged the real history back in, then **reset past that merge and force-pushed the stale-based commit**, silently dropping 65 real commits (the full COA cost-of-attendance campaign, the 2026-27 roster refresh, several validator/UI fixes) from `origin/main` for about a day. Recovered by rebuilding from the still-intact merge commit and re-applying v44.63's Financial Model UX work on top. **Before any commit, confirm the local branch isn't behind `origin/main`** (`git fetch && git status`) — this is exactly how it happened, and nothing in the workflow currently checks for it.

**Version history is NOT kept in this file.** Every version from v35 onward has a full entry in **CHANGELOG.md**, newest first and in more detail than any summary here ever carried. Phase 8 appends there, never here. This section holds two things only: the current state snapshot, and the open-items list.

> **Restructured in v44.54.** This section had grown to a single ~6,000-word paragraph chaining 22 `PRIOR:` version summaries — all of them duplicating CHANGELOG.md — plus roughly 30 items marked ✅ RESOLVED that were being re-read every session. Both are gone. The durable *rules* that had been buried inside those resolved entries were promoted into the sections that own them before deletion: `rosterUrl()` season slugs and the deleted overrides map → **§4**; grep `bio` strings on a contact change → **§3a Type 2**; never name the current #1 in lens copy → **§14 (PROSE)**; never store a per-coach bio deep link, and sweep `coaches.json.url` → **§15**. **If you are about to append a version narrative here, it belongs in CHANGELOG.md.**

### State snapshot (update only when it changes)

- **170 schools**, all full-profile, across 10 conference JSON files. **170 coaches** in `coaches.json`, ranked 1–170.
- **v44.85 (2026-08-13) — NJCAA DI Gap-Fill campaign Batch 14 (FINAL BATCH — campaign complete): Central Georgia Technical College, Ranger College, Northern Oklahoma College-Enid added (167→170 schools); Cisco College excluded after Tier-1 verification found it fields women's soccer only.** This closes the NJCAA DI Gap-Fill campaign — see the `njcaa_di_gap_fill_campaign` memory. Central Georgia Technical College (`central_georgia_tech`, Region 17 GA — the guide's Georgia debut) is a program launched 2023, improving year over year (2-9-1 to 5-10-1) under HC Elvar Gudjonsson (a prior 6+ season NAIA head coach at Middle Georgia State University, corroborated via multiple independent sources since his own CGTC bio page is unpublished), on a real dedicated Atrium Health Field, paired with a CAPTE-accredited Physical Therapist Assistant degree chaired by a licensed DPT. Ranger College (`ranger_college`, Region 5 TX) has posted three straight above-.500 seasons (2023-24 through 2025-26) under HC Ross Anderson, a 4-year NAIA All-Conference alumnus of Ottawa University (KS), and carries a real historical high point — a 2013 NJCAA DI Region 5 Championship under then-HC Jaime Beltran, now the founding coach at already-guide Seward County CC. Northern Oklahoma College-Enid (`noc_enid`, Region 2 OK) is home to the $12 million Advance Soccer Complex (a 1,500-seat championship turf stadium plus six full-size natural turf fields) — one of the best-documented JUCO facilities in this entire campaign — under HC Aron Bassoff, whose 19-season, 18-time-head-coach CV is among the deepest in the guide, though the program is mid-rebuild after a difficult 2025-26 debut (1-13-1). **Cisco College (TX, Region 5) was dropped after Tier-1 verification**: its own official athletics site (wranglersports.net) publishes zero men's soccer content (no roster, coach, or schedule links; only a women's soccer section), and its own official Instagram account (@ciscowranglersoccer, 1,577 followers) explicitly states "Official account for the Cisco College Women's Soccer team" — the same finding class as Batch 6's Pratt CC and Batch 9's Denmark Technical College. **A real scoring lesson applied from Batch 13's caught bug: all three schools' `proPlayers.nextLevel` objects were modeled consistently as present-with-`perYear:null` from the start** (correctly triggering `NEXT_LEVEL_NEUTRAL` 0.3773), and devScores were finalized before computing — `validate_consistency.js` reported **Issues: 0 on the first full run** after one PROSE false-positive was caught and fixed (a JUCO intro sentence reading "Region 2 school" was flagged by the PROSE checker's program-count pattern matcher as a false "2 school" count claim — the same substring-collision class as the v44.45 "asun"/"sun conference" bug — reworded to "the region's eighth guide school"). Map coordinates for all three were initially estimated by eye and landed off (Ranger and NOC-Enid both ~30-60px from their correct positions relative to already-verified nearby anchors); recomputed properly via the raw lat/lon formula and cross-checked directionally against Murray State College (OK)/Tyler JC (TX)/Western Texas College (TX) before confirming on-land via `isPointInFill()`. `validate_schools.py`: 0 errors, 25 warnings (no new ones). `data/juco.json`, `data/coaches.json` (170 total, re-ranked), `data/conferences.json`, `data/conf-prestige.json`, `js/app.js` (DOMAINS/SITE_URLS/SOCIAL + JUCO intro), `CLAUDE.md`, `athletes/olivier.json` (guideVersion bump). Local browser-verified via `olivier-guide-live` (port 8790): all 170 `unis[]` loaded matching guideVersion v44.85; all 3 cards render correct `fitOlivier` matching stored values exactly; Ranger College's Details modal checked across all 9 tabs (no undefined/NaN); all 3 coaches resolve in Coaches & Staff; all 3 map dots land correctly; Conferences and Financial Model tabs show all 3 schools.
- **v44.84 (2026-08-13) — NJCAA DI Gap-Fill campaign Batch 13: Region 24 IL remainder — Illinois Central College, Southwestern Illinois College, Lincoln Trail College added (164→167 schools).** Region 24 (Illinois) grows to four guide schools alongside already-shipped Lewis & Clark CC. Illinois Central is the region's most consistently competitive program — a 2022 Region 24 Championship and a No. 12 national ranking in 2024 (8-4-3) under head coach Gabe Carreno (4th season, USSF 'B' License, semi-pro/pro playing background), on a real dedicated soccer field (CougarPlex, since 2011); its own campus housing was sold and reopened in August 2026 under private management (Woodside on Campus). Southwestern Illinois College is carried by one of the most remarkable individual coaching stories found anywhere in this campaign: head coach Lindsay Eversmeyer — the first and only woman ever to play men's professional soccer (Major Indoor Soccer League, St. Louis Steamers, 2005), an NCAA D1 player at Kansas, a USSF 'B' License holder, inducted into four separate regional Sports Halls of Fame (2023-2025), and a former on-field Match Day Analyst for MLS club St. Louis City SC — at one of the lowest tuition rates in the entire guide, though the program's own on-field results and facilities remain modest (no on-campus housing at all, a genuine multi-campus commuter college). Lincoln Trail College is a program genuinely mid-rebuild — a strong 2023-24 season (10-3-4) gave way to two losing seasons after a July 2024 head-coaching change — under new head coach Luis Dantas, whose own CV spans JUCO conference/regional titles (Cowley CC), an NCAA Division I transfer (Western Illinois University), 3 seasons of professional indoor soccer (Wichita Wings, 3 conference titles), and NAIA assistant-coaching experience (Newman University); the college itself has no dedicated Exercise Science/Kinesiology/PE program and no institutional dormitories, relying on a long-established private housing operator (Statesmen Rentals) directly adjacent to campus. **A real scoring bug caught by `validate_consistency.js`'s FIT check before commit:** the initial data-writing pass silently diverged from the pre-computed Python-mirror scores for Southwestern Illinois and Lincoln Trail — devScores were revised after the scoring pass without recomputing, and `proPlayers.nextLevel` was modeled inconsistently (present-with-null for Illinois Central but absent, i.e. legacy-zero, for the other two) versus what was actually written to the JSON (present-with-null for all three, correctly triggering the NEXT_LEVEL_NEUTRAL 0.3773 factor) — both drifted `fitOlivier` 4 points low (SWIC 44→48, Lincoln Trail 49→53) until the validator flagged the mismatch against the real `scores.js` formula; fixed by recomputing directly from the actually-stored fields before commit. `validate_schools.py`: 0 errors, 25 warnings (1 new, expected — Luis Dantas's contact is genuinely unpublished on the official site, matching the established no-published-contact pattern). `validate_consistency.js`: **Issues: 0** after the fix. Map coordinates for all 3 landed on the first try, anchored off Lewis & Clark CC's already-verified Godfrey, IL position with real lat/lon deltas, confirmed on-land via `isPointInFill()`. Local browser-verified via `olivier-guide-live` (port 8790): all 167 `unis[]` loaded matching guideVersion v44.84; all 3 new cards render correct badges and `fitOlivier` matching the stored/computed values exactly; Illinois Central's Details modal checked across all 9 tabs (no undefined/NaN); all 3 coaches resolve in Coaches & Staff; all 3 map dots land on Illinois; Conferences/Minutes Outlook/Financial Model tabs all show the 3 new schools. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.83 (2026-08-12) — NJCAA DI Gap-Fill campaign Batch 12: Region 18 UT/ID/CO/NV/WA (Scenic West Athletic Conference) — Salt Lake CC, Snow College, North Idaho College, College of Southern Idaho, Colorado Northwestern CC, Utah State Eastern, Truckee Meadows CC, Pacific Northwest Christian College added (156→164 schools).** The guide's Region 18 debut — all eight schools share one conference bracket, pulled from a single research pass of scenicwestsports.com's own 5-season standings archive. Salt Lake CC is now the strongest on-field program found anywhere in this entire campaign: an undefeated 17-0 2021 NJCAA DI National Championship, four consecutive conference titles (2022-2024), and a 2025 Region 18 Tournament title, under head coach Mark Davis (78/rk-strong, the highest JUCO coach score in the campaign), in the guide's only genuine major-city Utah campus (`city:true`). Snow College won the program's first-ever conference title in 2025 (NJCAA All-American Isaac Stanley), now under brand-new first-time head coach Lewis Wilson (an 8-year Aberdeen FC Academy product) — a genuine, real-competition Minutes Outlook (6 of 9 current midfielders return as sophomores in Olivier's first season). Utah State Eastern's head coach Bruce Palmbaum holds a USSF 'A' Coaching License and NCAA Division I head-coaching experience (Tulsa) plus international academy coaching in Argentina — one of the deepest individual coaching CVs in this entire campaign (74/rk-strong) — and USU Eastern offers a genuine on-site Health Science BS with real required Human Anatomy/Physiology and Kinesiology elective coursework (`acuAlign:7`), though its roster publishes zero position data (`minutesOutlook.available:false`, matching Colorado Northwestern CC's same genuine gap). North Idaho College (15-of-15 midfielders clear, a real dedicated Eisenwinter Field, cadaver-based A&P II) and Truckee Meadows CC (a real dedicated soccer field, Reno NV's genuine mid-size city) are the batch's steadiest programs. College of Southern Idaho (young, founding head coach Alex Ferreira, improving fast) and Colorado Northwestern CC (extended multi-season rebuild, new head coach Dave Brown arriving from an NJCAA regional-championship staff) are both still-developing. Pacific Northwest Christian College (Kennewick, WA — corrected from the source plan's Oregon tag after direct confirmation via the college's own admissions page) is the youngest, least-established program in this entire campaign (1-39 across its first three seasons) under a brand-new first-time head coach, at one of the lowest costs of attendance in the guide. **Map coordinates: 5 of 8 landed on the first try using the raw lat/lon formula; North Idaho College, Truckee Meadows CC, and Pacific Northwest Christian College all required a grid search** (the Idaho Panhandle/Nevada/Washington corner of the hand-drawn map is directionally distorted from the raw formula) — all three corrected points confirmed directionally consistent with each other and with existing anchors before landing on-fill. `validate_schools.py` caught 2 real errors before commit (Colorado Northwestern CC and Pacific Northwest Christian College's `facilityDetails.rating` used an invalid `"Foundation"` value, not one of the schema's 5 allowed tiers — corrected to `"Solid"`). `validate_consistency.js`: **Issues: 0 on the first run**, no scoring-formula mismatch found this batch. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.82 (2026-08-12) — NJCAA DI Gap-Fill campaign Batch 11: Regions 16/19/20 remainder — Crowder College, Jefferson College (MO), Harcum College, Hagerstown CC, Harford CC added (151→156 schools).** Crowder College and Jefferson College (MO) are the guide's Region 16 debut — the two schools met in the 2025 Region 16 Tournament final (Crowder won 1-0), Crowder's first title under first-year head coach Hunter Gilliam (forward Silas Laytham named Region 16 Player of the Year + NJCAA D1 3rd Team All-American), while Jefferson's alumnus head coach Luke Schlichting carries a real 4-year UCM Kinesiology, BS articulation agreement. Harcum College is the guide's Region 19 debut and this entire campaign's most decorated on-field program: a 2020-21 undefeated 13-1 season culminating in an NJCAA DI National Championship Tournament Final Four appearance (a confirmed National Tournament win over already-guide Western Texas College), plus 2020 and 2024 NJCAA D1 East District titles, all under head coach David Hughes (UEFA B License, former Carlisle United FC player, 42-10-2 career record) — paired with a genuine clinical Physical Therapist Assistant A.S. degree, though Harcum (a private college) carries the highest cost of attendance in the entire guide ($48,900/yr). Hagerstown Community College and Harford Community College join Montgomery College in Region 20: Hagerstown's real story is a measured 3-season coaching turnaround under Joe Mills (0-15-1 → 10-9 → 12-6-1), backed by a dedicated Exercise Science and Health A.S.; Harford Community College delivered the program's first Region 20 title in 50 years in 2024 plus a first-ever 2021 NJCAA DI National Tournament berth under head coach Bill Wardle, whose personally-built international recruiting network (players from roughly 13 countries) is documented in Harford's own official feature article, backed by one of the guide's strongest Exercise Science degrees (a required internship, a named Towson University B.S. articulation). Neither Hagerstown nor Harford offers on-campus housing. **One real scoring bug caught before commit:** the initial Python-mirror scoring pass used the intended-clean 100%/100% trajectory percentages for Fit Score calculation, but the actual stored `minutesOutlook.trajectory` values (85%/90%, the campaign's standard "Captain candidate" figures for a fully-cleared JUCO midfield) were what the live `scores.js` formula reads — a mismatch caught immediately by `validate_consistency.js`'s FIT check (4 of 5 schools drifted 4-5 points) and fixed by recomputing from the actually-stored trajectory numbers before commit. Crowder College's Physical Education AA has `acuAlign:0` — the 206-page course catalog PDF returned no usable searchable text via the available in-browser PDF viewer this session, a genuine tooling limitation disclosed in the note rather than guessed. Harford's Exercise Science A.S. (`acuAlign:8`) and Harcum's PTA A.S. (`acuAlign:7`) are among the strongest academic matches found anywhere in this campaign. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.81 (2026-08-12) — NJCAA DI Gap-Fill campaign Batch 10: Region 14 TX — Paris Junior College, Jacksonville College, Northeast Texas Community College, Texas Southmost College added (147→151 schools).** All four share one Region 14 conference bracket in East/South Texas — the guide's Region 14 debut, alongside already-shipped Tyler JC/Blinn/Coastal Bend/Angelina/LSU Eunice. None carries a Region 14 title or postseason result in this campaign's 2021-2025 research window (all four jucoTier Standard), a genuinely modest on-field batch, but each has a real distinguishing story. Paris JC's transfer pipeline is growing fast under head coach Fernando Arellano (NCAA D1 playing background, 2014 NJCAA All-American, pro experience in Liga MX): a program-record 10 players signed to continue their careers in June 2026 (up from 7 the year before), including back-to-back NCAA Division I transfers (Houston Christian 2025, Missouri State 2026) — a real 2-year measured D1 transfer rate (1.0/yr), the first school of this campaign's re-baselined `nextLevel` era to carry one. Northeast Texas CC's head coach Jon Evan carries one of the deepest individually-documented CVs found anywhere in this campaign — assistant roles at two different NCAA Division I programs (Jacksonville University, where he recruited and developed a future MLS SuperDraft top-50 pick; Boston University), a genuine NCAA D2 head-coaching Lone Star Conference title, and two separate NCAA D3 head-coaching program-best tenures — even though NTCC's own record under him (hired April 2023) is currently Region 14's weakest; its 2026-27 and 2025-26 rosters both publish zero position data, a confirmed persistent site gap (`minutesOutlook.available:false`). Jacksonville College is the smallest school in this entire campaign (~550 students, a private Christian junior college) under a thinly-documented head coach (Thomas Wait, hired Sept 2024, no further CV found), with a genuinely large, wide-open 16-player midfield pool heading into 2026-27. Texas Southmost College is the campaign's newest confirmed program — absent from Region 14 competition through 2022-23, launched in 2023-24 under founding head coach and TSC/UTB alumnus Mario Zamora, who holds a genuine binational Mexican FA (FMF) + US Soccer coaching license — and is the only school in this batch on a real city campus (Brownsville, on the US-Mexico border), though it has no on-campus housing anywhere in the TSC system, unlike Paris JC, Jacksonville, and NTCC, which all offer real on-campus dorms. **Two real fixes caught by `validate_consistency.js` before commit, both worth remembering:** (1) a `proPlayers.nextLevel` object with `perYear:null` present for 3 of the 4 schools was mistakenly treated as "field absent → legacy `mlsPicks5yr` path" in the Python scoring mirror, instead of the correct "field present but unmeasured → `NEXT_LEVEL_NEUTRAL` (0.3773)" branch — silently underscoring `fitOlivier` by 4-5 points for `jacksonville_college`/`northeast_texas_cc`/`texas_southmost` until the FIT check flagged the drift against the real `scores.js`; (2) all three schools' `minutesOutlook.trajectory` objects were drafted with a `yr` key instead of the schema's `year` key, which would have silently rendered "undefined" in the live trajectory rows. A separate, non-validator-caught bug found by hand: all four schools' `titles[]` arrays initially held a one-entry "no titles found" placeholder STRING — since the card renderer just reads `titles.length` for the 🏆 badge, this silently showed "🏆 1 title" on every card; fixed to genuinely empty arrays (`[]`), matching the established convention used by every other title-less JUCO in the guide. Map coordinates for 3 of 4 schools (Paris, Jacksonville, Mount Pleasant) landed on the first try anchored off Tyler JC's already-verified position; Brownsville required a grid search since the hand-drawn map's Texas landmass tapers to a point well north of the real Rio Grande Valley — settled on the southernmost drawn point of the Texas shape (307,307) as the best available approximation. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.80 (2026-08-12) — NJCAA DI Gap-Fill campaign Batch 9: Region 10 SC — USC Lancaster, USC Salkehatchie, USC Sumter, USC Union added (143→147 schools).** All four are University of South Carolina regional campuses that play each other in one shared Region 10 conference bracket — the guide's South Carolina and Region 10 debut. A fifth Region 10 DI school on the campaign's spreadsheet, Denmark Technical College, was DROPPED after Tier-1 verification: it is absent from region10sports.com's own current-season DI standings, appears in that same site's schedule labeled "(club team)," and a July 2025 USCAA press release confirms it was granted full USCAA (a separate national governing body) membership effective 2025-26 — the same class of finding as Batch 6's Pratt CC. USC Lancaster (jucoTier Elite) is the batch's most in-form program: 2025 Region 10 DI Tournament Champion as the No. 3 seed (upsetting both No. 2 USC Sumter and No. 1 USC Union in the same run) and NJCAA Southeast District Runner-up, under six-year dual men's/women's head coach Kenny Halas. USC Sumter (jucoTier Elite) won the 2024-25 Region 10 regular-season title (10-1-2, the best record of any Region 10 school in this campaign's five-season window) and hired Adam Howarth for 2025-26, whose CV — NCAA D3 head coach, D2 assistant, D1 volunteer assistant, a Rhode Island state HS title, and a professional playing career in Finland — is one of the deepest found anywhere in this campaign. USC Union (jucoTier Elite) posted the program's best-ever 2025-26 season (Region 10 regular-season champion, 10-2-4) under 2x Coach of the Year Marc Curlee and has produced the Region 10 DI Player of the Year four years running (2022-2025) — its home field is an off-campus municipal facility, not on campus. USC Salkehatchie (jucoTier Standard) is in real on-field decline (last of five in 2025-26) but carries the campaign's longest-tenured coach found in this batch, William Glass (16th season, 218-186-24 career record), and a genuinely wide-open midfield (all 4 current midfielders clear before Olivier's August 2027 arrival). All four USC campuses share one structural profile: no dedicated Exercise Science/Kinesiology credential (general-transfer AA/AS only, `acuAlign:0` for all four) and no on-campus housing anywhere in the system. `validate_consistency.js`'s PHANTOM_SCHOOLS check needed a one-line extension (added "Union" to the USC exemption lookahead, alongside the pre-existing Sumter/Lancaster/Salkehatchie) since these are now real guide schools, not the phantom USC Trojans reference the check exists to catch. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.79 (2026-08-12) — NJCAA DI Gap-Fill campaign Batch 8: Region 9 CO/NE — Western Nebraska CC, Lamar CC, Trinidad State, Northeastern Junior College added (139→143 schools).** All four join Otero College and the five Wyoming schools in Region 9, growing it to ten guide schools and giving it its first Nebraska footprint. Western Nebraska CC (jucoTier Elite) is this batch's standout — 2024 Region IX regular-season and tournament champion, first-ever NJCAA DI National Tournament appearance, and the program's first-ever NJCAA All-American (Eduardo Oliveira, Third Team) — all under 20-plus-year head coach Todd Rasnic, who then handed the program to his own longtime assistant and WNCC alumnus Eseah Ingram for a 2025-26 rebuild season; also the cheapest cost of attendance added anywhere in this campaign ($14,125/yr). Trinidad State (jucoTier Standard) is mid-rebuild under returning program alumnus head coach Tyler Wilt (four years as HC at York University, Nebraska, before returning May 2025), with the campaign's only named, direct AA-to-BS Exercise Science transfer agreement (CSU Pueblo). Northeastern Junior College (jucoTier Standard) is led by Interim Head Coach Hubert Blanco — a substantive 7-year high-school/club coaching CV (multiple district titles, a regional championship, a state final-four run) despite the interim title — and carries this batch's strongest-branded Athletic Training pathway with real Practicum I clinical hours. Lamar CC (jucoTier Standard) pairs a genuine Athletic Training Practicum I & II clinical sequence with new head coach Alieu Kamara (owner of a professional academy in Guinea, his first head-coaching role), inheriting the region's weakest recent on-field record (3-31-1 combined Region 9 conference play, 2022-2025). A real scoring-formula bug was caught and fixed before commit: a Python mirror of `scores.js` used an unrounded `devAvg` float, missing `calcDevAvg()`'s intermediate `Math.round()` step — this silently drifted Lamar CC's `fitOlivier` by 1 point (40 vs the correct 41) until caught by comparing the stored value against the live browser's own `calculateFitScore()` output during Phase 5 verification, not by the Python mirror itself. Map coordinates for all 4 schools were derived by anchoring to Otero College's already-verified pixel position with real lat/lon deltas at the locally-derived px/degree scale (matched the raw global formula almost exactly, confirming the WY/CO region of the hand-drawn map is locally near-linear), then confirmed on land via `isPointInFill()` on the first try for all 4. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **v44.78 (2026-08-12) — UX fix: every Explore conference-section intro paragraph (`CONF_SECTIONS[...].intro`) is now collapsed behind a small ⓘ toggle, defaulting to hidden, independent of the existing cards-grid Show/Hide.** Owner-reported via screenshot that the JUCO intro specifically had grown into a multi-paragraph wall of batch-history text; applied to all sections since they share one render path and will all keep growing the same way. `js/app.js` — `toggleSectionIntro()` + `.intro-hidden` class added to the section-head template; `index.html` — `.info-icon-btn`/`.section-intro.intro-hidden` CSS. Pure UI change, no data/score/validator-checked field touched.
- **v44.77 (2026-08-11) — NJCAA DI Gap-Fill campaign Batch 7: Region 9 Wyoming — Casper College, Northwest College, Central Wyoming College, Laramie County Community College, and Gillette College added (134→139 schools).** All five join Otero College in Region 9, which now spans two states (Colorado + Wyoming). Laramie County CC's own team account credits the program with 11 NJCAA DI Region IX titles and 3 National Tournament appearances — independently Tier-1 confirmed for a 2018 title and National Tournament run beating Region 10 Champion Seminole State — and it also carries the campaign's strongest ACU-aligned JUCO degree (Kinesiology & Health Promotion, A.S. with a required internship) plus a brand-new $31M athletics complex (dedicated soccer field, hospital-partnered fitness center). Casper College (jucoTier Elite: 2 confirmed 2025 NJCAA All-Americans) has a genuinely deep, dated, Tier-1-documented NCAA transfer pipeline (19 movers/2 off-seasons, 5 D1) under program-founder head coach Ben McArthur, but no dedicated on-campus stadium as of 2025-26. Northwest College is led by UEFA 'B'-licensed head coach Rob Hill, the deepest coaching licence found anywhere in this campaign, who returned the program to a 2025 Region 9 final on his first season back (beating Casper 1-0 in the semi). Gillette College pairs a genuine Exercise Science A.S. with real recent facility investment (2020 soccer field, $18.5M Pronghorn Center) under a first-time head coach. Central Wyoming College is the batch's most modest profile — a program in an early rebuild under a first-season head coach, with no dedicated Kinesiology/ExSci degree and a genuine current-season roster gap (2025-26 positions unpublished, confirmed by cross-checking the fully-populated 2024-25 roster) that left `minutesOutlook.available:false`. See the `njcaa_di_gap_fill_campaign` memory for full research detail.
- **🚨 v44.76 (2026-08-11) — MAJOR DATA CORRECTION: `suffolk_cc`, `nassau_cc`, `ulster_cc`, `westchester_cc` were misclassified as NJCAA Division I since the session that added them; corrected to Division III.** Discovered while auditing whether the DI Gap-Fill spreadsheet was missing real DI schools (a Batch 6 side-investigation) — checking Region 15's own official site (region15athletics.com) showed an explicit three-tier divisional standings table: Region 15 has exactly ONE Division I program (Monroe University – New Rochelle, already correctly stored as DI); every other Region 15 school, including all four of these, competes at Division III. NJCAA DIII programs are FORBIDDEN from offering any athletic financial aid (academic/merit/need-based only) — a hard national rule, not school-specific — so this cascades into real scoring changes, not just a label swap: `fundingPathway` full→none (−8 penalty, stacking with the pre-existing −6 housing penalty all four already carried), `fin.maxAthletic` 0.5→0, `aid`/`fin.aidType` corrected to merit-only. `fitOlivier` fell for all four: suffolk_cc 37→29, westchester_cc 43→35, nassau_cc 52→44, ulster_cc 43→35. **Schools were NOT removed** — their on-field records/titles (2025 Region 15 Championship etc.) remain real and are kept, just correctly labeled as Division III achievements; `rec`/`culture.olivierMatch`/`facilityDetails.note`/`fin.internationalNote` were rewritten to disclose the no-athletic-aid reality plainly. Cascade: `conferences.json` guideSchools[]+desc/olivierNote, `conf-prestige.json` relevance, this table's 4 rows. **This was found by checking a REGION'S OWN conference site directly rather than trusting njcaa.org's `/div1/teams` or `/div3/teams` "Teams Stats" pages, which proved unreliable in both directions during this investigation** (Richard J. Daley College, genuine confirmed DI, appears on the DIII stats page from cross-division non-conference games; Kingsborough CC, genuine DIII, appears on the DI stats page the same way) — **never trust those aggregated stats-teams pages for a division-of-record question; go to the region's own conference site instead.** No other already-shipped JUCO has been re-audited against this same risk yet — worth a systematic sweep in a future session (see open items).
- **JUCO section: 83 schools**, spanning 16 NJCAA regions (1 AZ/NV/CA, 2 OK/AR, 4 IL, 5 TX, 6 KS, 8 FL — capped at 3, only 3 of 28 FCSAA colleges field men's soccer, 9 CO/WY/NE, 10 SC, 11 IA/NE, 14 TX/LA, 15 NY, 16 MO, 18 UT/ID/CO/NV/WA, 19 PA/DE/NJ, 20 MD, 24 IL) plus Santa Monica, which competes in **CCCAA, not NJCAA, and therefore deliberately has no `njcaaRegion`**. All 83 flagged `juco2yr:true`. **v44.82 (2026-08-12) added the NJCAA DI Gap-Fill campaign's Batch 11 — Crowder College, Jefferson College (MO) (both NJCAA DI / Region 16, Missouri — the guide's Region 16 debut), Harcum College (NJCAA DI / Region 19, Pennsylvania — the guide's Region 19 debut), Hagerstown CC and Harford CC (both NJCAA DI / Region 20, Maryland, joining Montgomery College).** Crowder and Jefferson met in the 2025 Region 16 Tournament final (Crowder won 1-0) — Crowder's title came in first-year head coach Hunter Gilliam's debut season (Silas Laytham, Region 16 POY + NJCAA D1 3rd Team All-American), while Jefferson's alumnus head coach Luke Schlichting carries a real UCM Kinesiology, BS articulation agreement. Harcum College is this entire campaign's most decorated on-field program: a 2020-21 undefeated 13-1 season and NJCAA DI National Championship Tournament Final Four appearance (a confirmed National Tournament win over already-guide Western Texas College), plus 2020 and 2024 NJCAA D1 East District titles, under head coach David Hughes (UEFA B License, former Carlisle United FC player, 42-10-2 career record) — paired with a genuine clinical Physical Therapist Assistant A.S. degree, though it carries the highest cost of attendance in the entire guide ($48,900/yr, a private college). Hagerstown CC's real story is a measured 3-season coaching turnaround under Joe Mills (0-15-1 → 10-9 → 12-6-1); Harford CC delivered the program's first Region 20 title in 50 years (2024) plus a first-ever 2021 NJCAA DI National Tournament berth, under head coach Bill Wardle's personally-built international recruiting network — neither offers on-campus housing. A real scoring bug (Python-mirror used the target-clean 100%/100% trajectory instead of the actually-stored 85%/90% "Captain candidate" figures) was caught by the FIT check and fixed before commit. See the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.81 (2026-08-12) added the NJCAA DI Gap-Fill campaign's Batch 10 — Paris Junior College, Jacksonville College, Northeast Texas Community College, Texas Southmost College (all NJCAA DI / Region 14, Texas) — the guide's Region 14 debut, joining already-shipped Tyler JC/Blinn/Coastal Bend/Angelina/LSU Eunice in the same region.** All four jucoTier Standard (no Region 14 titles 2021-2025). Paris JC's transfer pipeline is growing fast under head coach Fernando Arellano (NCAA D1 playing background, 2014 NJCAA All-American) — a program-record 10-player signing class in June 2026 and a real measured 2-year D1 transfer rate (1.0/yr). Northeast Texas CC's head coach Jon Evan carries one of the deepest CVs in this campaign (two different NCAA D1 assistant roles including developing a future MLS SuperDraft pick, an NCAA D2 head-coaching title, two NCAA D3 head-coaching program-bests) despite NTCC's own record being Region 14's weakest; its roster publishes no position data at all (`minutesOutlook.available:false`). Jacksonville College is the smallest school in the entire campaign (~550 students) with a wide-open 16-player midfield pool. Texas Southmost College is the campaign's newest confirmed program (launched 2023-24) under founding alumnus head coach Mario Zamora (binational FMF + US Soccer licenses) and is the only school in this batch on a real city campus (Brownsville), though with no on-campus housing. See the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.80 (2026-08-12) added the NJCAA DI Gap-Fill campaign's Batch 9 — USC Lancaster, USC Salkehatchie, USC Sumter, USC Union (all NJCAA DI / Region 10, South Carolina) — the guide's Region 10 debut, four University of South Carolina regional campuses that play each other in one shared bracket.** Denmark Technical College, the fifth Region 10 DI school on the campaign's source spreadsheet, was DROPPED after being found to have moved its soccer program to the USCAA (a separate governing body) for 2025-26 — absent from the region's own current-season DI standings, and confirmed via a July 2025 USCAA membership press release. USC Lancaster (jucoTier Elite) won the 2025 Region 10 DI Tournament as the No. 3 seed and reached the NJCAA Southeast District Final. USC Sumter (jucoTier Elite) was the 2024-25 Region 10 regular-season champion under new head coach Adam Howarth, whose NCAA D1/D2/D3 and professional playing CV is one of the deepest in this campaign. USC Union (jucoTier Elite) posted the program's best-ever 2025-26 season and has produced 4 straight Region 10 DI Players of the Year. USC Salkehatchie (jucoTier Standard) offsets on-field decline with the batch's longest-tenured coach (William Glass, 16 seasons) and a fully-cleared midfield. All four share one profile: no dedicated Exercise Science/Kinesiology credential and no on-campus housing anywhere in the USC regional-campus system. See the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.79 (2026-08-12) added the NJCAA DI Gap-Fill campaign's Batch 8 — Western Nebraska CC, Lamar CC, Trinidad State, Northeastern Junior College (all NJCAA DI / Region 9, Colorado/Nebraska), growing Region 9 to ten guide schools and giving it its first Nebraska footprint.** Western Nebraska CC (jucoTier Elite) is the batch's standout: 2024 Region IX champion and first-ever NJCAA DI National Tournament appearance, plus the program's first-ever NJCAA All-American — at the cheapest cost of attendance ($14,125/yr) added anywhere in this campaign. Trinidad State's returning alumnus HC Tyler Wilt (4 years as HC at York University, NE) brings the campaign's only named AA-to-BS Exercise Science transfer agreement (CSU Pueblo). Northeastern Junior College's Interim HC Hubert Blanco carries a substantive 7-year high-school/club coaching CV and the batch's strongest Athletic Training pathway. Lamar CC pairs a genuine Athletic Training Practicum clinical sequence with new HC Alieu Kamara (owner of a Guinea-based professional academy), inheriting the region's weakest recent on-field record. A Python-mirror scoring bug (missing `calcDevAvg()`'s intermediate rounding step) drifted Lamar CC's `fitOlivier` by 1 point until caught against the live browser's own `calculateFitScore()` during Phase 5 — see the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.77 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 7 — Casper College, Northwest College, Central Wyoming College, Laramie County Community College, and Gillette College (all NJCAA DI / Region 9, Wyoming), growing Region 9 to six guide schools alongside Otero College and giving the region its first two-state footprint (CO + WY).** Laramie County CC's own team account claims 11 NJCAA DI Region IX titles and 3 National Tournament appearances — independently Tier-1 confirmed for a 2018 title and National Tournament run beating Region 10 Champion Seminole State — and carries the campaign's strongest ACU-aligned JUCO degree (Kinesiology & Health Promotion A.S. with a required internship) plus a brand-new $31M athletics complex. Casper College (jucoTier Elite, 2 confirmed 2025 NJCAA All-Americans) has a dated, Tier-1-documented NCAA transfer pipeline (19 movers/2 off-seasons, 5 D1) under program-founder head coach Ben McArthur. Northwest College's Rob Hill holds a UEFA 'B' License — the deepest coaching licence found anywhere in this campaign — and returned the program to a 2025 Region 9 final in his first season back. Gillette College pairs a genuine Exercise Science A.S. with a purpose-built 2020 soccer field and a new $18.5M academic complex. Central Wyoming College is the batch's most modest profile (first-season head coach, no dedicated Kinesiology/ExSci degree) and the only one of the five with `minutesOutlook.available:false` — its 2025-26 roster genuinely publishes no position data, confirmed by cross-checking the fully-populated 2024-25 roster on the same host. See the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.75 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 6 — Coffeyville CC, Garden City CC, and Seward County CC (all NJCAA DI / KJCCC, Region 6 Kansas), growing the Kansas cluster to five guide schools alongside Cowley and Barton.** The batch's planned 4th school, Pratt CC, was DROPPED after Tier-1 verification on njcaa.org's own Division II team-stats table showed Pratt is NJCAA Division II nationally (not DI as the source spreadsheet claimed) — KJCCC's internal "Division I"/"Division II" conference brackets turned out to map faithfully onto true NJCAA national divisions for all four schools checked, so this was a genuine spreadsheet error, not a research gap. Coffeyville was named NJCAA Academic Team of the Year for men's soccer in 2025-26 (3.85 team GPA, #1 nationally) under 15-year five-program head coach Steven Harrison, and carries a genuine dedicated Athletic Training AS degree. Garden City's 2025 season was officially billed by the college as "one of the most successful in program history" under alumnus head coach Oscar Zelaya, who played on the school's own 2008 NJCAA DI National Tournament 4th-place team before a 7-year Dodge City CC head-coaching stint. Seward County is the guide's youngest Kansas program (launched fall 2023) under founding coach Jaime Beltran, whose CV includes leading Ranger College to its first-ever NJCAA DI Region 5 Championship and National Tournament berth (2013) — see the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.74 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 5 — all five City Colleges of Chicago programs (Harry S. Truman, Richard J. Daley, Malcolm X, Kennedy-King, Wilbur Wright — all NJCAA DI / Region 4, Illinois — the guide's Region 4 debut).** citycollegesofchicagoathletics.com, the district's primary athletics domain, was found entirely dead (a parked GoDaddy lander on every path) — research relied instead on region4sports.com (the official NJCAA Region 4 results site, used for all rosters/standings/schedules) and colleges.ccc.edu (the district's own press office, which confirmed Truman's real headline story: NJCAA Region 4 DI champion three consecutive seasons, 2023-2025, under three-time Region 4 Coach of the Year Maciej Orlowski). Malcolm X College is the only one of the five with genuine on-campus exercise-science coursework (a Personal Fitness Trainer certificate, confirmed via the official district-wide catalog.ccc.edu — CCC's real ESSS department is centered exclusively there); the other four score at the conservative floor. All five share one CCC-wide cost/housing reality: a single district tuition schedule and zero on-campus housing anywhere in the seven-college system — see the `njcaa_di_gap_fill_campaign` memory for full detail. **v44.73 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 4 — National Park College and University of Arkansas Rich Mountain (both NJCAA DI / Region 2, Arkansas), Hill College and Western Texas College (both NJCAA DI / Region 5, Texas — the guide's Region 5 debut)** — see the `njcaa_di_gap_fill_campaign` memory for full detail, including a mid-research discovery that this guide's real 16-unit ACU rubric (`js/app.js` `ACU_UNIT_META`) doesn't match the labels several earlier JUCO sessions assumed (e.g. EXSC224 is Mechanical Bases of Exercise/Biomechanics, not a general "intro" course; EXSC199 is Sport Psychology, not Health & Wellness) — corrected for all 4 Batch 4 schools before commit, but several already-shipped JUCOs (including Rose State) likely carry the same mismatch and need a future re-check (see CLAUDE.md §6). **v44.72 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 3 — Eastern Oklahoma State College, Connors State College, Northeastern Oklahoma A&M College, Rose State College (all NJCAA DI / Region 2), joining Murray State College as Region 2's five guide schools** — see the `njcaa_di_gap_fill_campaign` memory for full detail, including a genuine head-coaching vacancy at Connors State (founding coach departed April 2026, national search ongoing at time of research) and an interim coach at Northeastern Oklahoma A&M named one day before this research. **v44.71 (2026-08-11) added the NJCAA DI Gap-Fill campaign's Batch 2 — Yavapai College, Eastern Arizona College, College of Southern Nevada, Community Christian College (all NJCAA DI / ACCAC, Region 1)** — see the `njcaa_di_gap_fill_campaign` memory for full detail, including a genuine server-side TLS handshake failure on Yavapai's primary domain (`goroughriders.com`, worked around via the Wayback Machine for its 2025-26 roster/staff data) and the discovery that Community Christian College fields multiple geographically separate teams under one institutional brand. The Fit Score formula is identical for JUCO and non-JUCO — no weight redistribution, since ACU was removed from the formula entirely. **v44.65 added Lewis & Clark CC (Godfrey, IL, Region 24)** — first Illinois JUCO in the guide. Its `minutesOutlook.trajectory` (Yr1 70% / Yr2 83%) was set by direct analogy to peer JUCOs' stored numbers, not from §14's Opportunity Score table — that table still cannot reproduce any of the 30 pre-existing JUCOs' stored anchors (open item, group E below), and applying it literally here would have given Yr1≈20%, a stark outlier against every peer for no real reason. Owner-approved 2026-08-09.
- **Fit Score (v37.1) = Soccer Program Quality 40% + Minutes Outlook 35% + Climate 15% + City 10%.** GPA, cost and ACU alignment are **not** inputs — each has its own dedicated view (ATAR/budget toggles, Financial Model, ACU Alignment tab). The With Minutes / Base Fit score-mode toggle and the Soccer-First lens were both retired as redundant. `recalculateAllScores()` runs once on page load from `initApp()`.
- **Validator baseline: `Issues: 0`.** It has read 0 since v42.34, when the last line (a Stony Brook coach-name gap) cleared. **The count must never increase from a session's changes.** The v36 code-review backlog that opened at 174 issues was cleared across v36.1–v36.8; see CHANGELOG.md's v36 entry.
- **`roster_season` doubles as the roster-refresh ledger** — the Minutes Outlook tab shows at a glance which schools are on 2026-27 data and which are still on an older season (now with an explicit ✓/⏳ badge and filter as of v45.03, see below). **Fresh guide-wide recount as of v45.02 (Batch 5 close-out): 119 on 2026-27 / 39 on an older season / 12 `available:false`** (170 total). This supersedes every prior count in this ledger's history (64/51/7 at v44.55; 83/71/16 mid-gap-fill-campaign) — Batch 5's 10 sub-batches re-verified all 56 gap-fill JUCOs and moved a large share of them onto fresh 2026-27 data in the process. Of the 39 still on an older season, most are genuinely current for their school (the newest season that school has published) rather than a research gap — recheck via the transfer-portal schedule below, not by re-deriving this count from memory.
- **Minutes Outlook roster-freshness UX (v45.03).** Every card now shows a small season badge in its header (green "✓ 2026-27" / amber "⏳ [older season]"), visible without expanding the card, plus a "Roster:" toolbar filter (All / Current / Older season) alongside the existing Score-tier filter — the two compose. The "current" season is derived live each render as the max `roster_season` string across all available schools, never hardcoded, so the feature stays correct as the guide rolls forward to 2027-28 and beyond without needing a code change.
- `recruit_pathway` / `recruit_pathway_note`: **104 of 111 populated** (re-counted v44.54 — §6 had said 103 since v44.24, from before Stony Brook was populated). **105 schools have `minutesOutlook.available:true`**; the other 6 are structurally excluded, since `MO-KEYS` forbids the field on an `available:false` object. That leaves exactly **one** deliberate gap: **`stonybrook`, left unset because it publishes no previous-school column and had no prior classification to retain** — there is nothing to derive from and nothing to carry forward. Populate it only if the school starts publishing the column. Informational only — the field carries no scoring weight and was never folded into `fitOlivier`.
- `facilityDetails.housing` is populated for every full-profile school. `jucoTier`, `njcaaRegion` and `njcaaRegionArea` are populated on the JUCOs. All three JUCO UI elements (Elite chip, region tag, housing chip) live in the **flexible metadata row on cards, not the compact stat grid** — that grid compresses badly at mobile width, learned live through prototype iteration with the owner. Elite and housing badges are **silent unless flagged**, the same pattern as `top`/Top Pick.
- **`jucoTier: "Elite"` is a point-in-time NJCAA-ranking snapshot** — re-verify each season rather than assuming it still holds.
- All full-profile schools have `kinRank`. The Compare tab's GPA row is computed live via `dynamicGpaStatus()` rather than stored.
- **The Dashboard "Top 8" panel is strictly `fitOlivier`-ranked, with no manual pinning** (v37.9). `shortlist[]` in `olivier.json` still drives the Dashboard map's "in shortlist" highlight dot, but no longer pins cards. Contact-status tracking lives in the separate Coaches → Outreach tracker (`outreach[]`).
- **All data fetches use `{ cache: 'no-store' }`** — see §8. A hard reload reliably busts cache for `<script>` tags but *not* for `fetch()`-initiated requests in every browser; this produced live NaN fit scores after the v37.1 schema change, in Chrome but not Edge.

---

### Open items

Grouped by kind. `🚩` = needs a decision or a fix; `⏳` = deliberately waiting on an external event; `📌` = reference, recorded so it is not re-derived.

#### A. Renderers that parse prose (cosmetic, no scoring impact)

Both entries below are the same defect class as the Max Aid tile (fixed v44.50) and the `Target: Notre` GPA bug (fixed v44.53): **a displayed value derived by string-splitting a free-prose field.** Fix them the same way — a short stored field read directly — and never by reshaping copy to satisfy the parser, which inverts the dependency and re-breaks on the next copy edit.

- **✅ RESOLVED v44.61 — "Soccer Level" and "Pre-PT Path" no longer parse prose.** Both now read short AUTHORED fields, `soccerLevelShort` (≤24 chars) and `prePTShort` (enum-locked to Outstanding · Excellent · Very Strong · Strong · Good · Foundation · Poor · Transfer Pathway). **Both counts logged here were LOW — the real figures were 7 and 4, not 6 and 2** (`yale`/`princeton` "Strong via science pathway" had been missed). The new `SHORTFIELDS` check has four halves including a comment-stripped grep of `js/app.js` AND `js/dashboard.js`. **📌 The long `soccerLevel` string now has NO renderer consumer** — stored reference data, like `conferences.json.scholarships` after v44.50. That also makes the long-deferred UX-D1 *formatting* item moot for display: the inconsistent JUCO shapes no longer reach the UI. **The owner's deferral stands — nothing was reformatted, and `miami_dade` was deliberately left as `NJCAA`** (a real league name, not a division token; its NJCAA division is unpublished on its own site).
- **📌 The GPA *filter* extraction is sound — verified v44.53, do NOT re-audit.** `js/dashboard.js:59/378/428` derive a filter number via `parseFloat(u.gpa.minEntry.match(/[\d.]+/))`. Checked against all 111 schools: every result is a plausible GPA (1.0–4.0) or 0 for an open-admission school, which is the intended reading. Prose-parsed *and* correct.
- **🚩 Found v44.73 — several already-shipped JUCO `acuAlignNote`/`acuUnits` entries likely mismatch this guide's real ACU rubric (`js/app.js` `ACU_UNIT_META`, ~line 2324) and need re-verification.** Batch 4 of the NJCAA gap-fill campaign discovered mid-session that the 16 unit codes have specific, narrow real meanings that don't match the plausible-sounding labels earlier sessions (including this campaign's own Batch 3) assumed from the bare code names — e.g. `EXSC224` is "Mechanical Bases of Exercise" (Introduction to Biomechanics), not a general "Intro to Health/Sports Science" course; `EXSC199` is "Psychology of Sport" (Sport Psychology), not "Health & Wellness." **Rose State's stored entry (`rose_state`, v44.72) explicitly cites both of these wrong mappings** (`EXSC224` ← HPER 1213 "Introduction to Health & Sports Sciences", `EXSC199` ← HPER 1202 "Health & Wellness") and is now known-inconsistent with `ACU_UNIT_META`, though `validate_consistency.js` has no check that could catch this (it isn't a formula the validator loads, just prose-vs-rubric drift). Likely affects other pre-v44.73 JUCOs too — no systematic audit has been done. Batch 4's own four schools (`national_park`, `rich_mountain`, `hill_college`, `western_texas`) were corrected against the real rubric before commit. Re-verify each JUCO's `acuUnits` against `ACU_UNIT_META`'s actual `label`/`usEquiv` text (not the bare code) next time its academic data is touched — this only moves `lensScores.academic`, never `fitOlivier` (Change Type 9).
- **🚩 Found v44.72, not fixed (out of scope for a data-only session): `index.html:1027` hardcodes `placeholder="Search 110 schools…"` on the Financial Model search box.** Not a prose-parsing bug (nothing reads it back) but the same stale-hardcoded-count family — the guide has carried 111+ schools since well before this session and the box still says 110. The Financial Model page's own body text correctly says "122 SCHOOLS" a few lines above it — only the placeholder is stale. Fix by reading `unis.length` at render time (same pattern as the MAXAID fix), in the next session that touches `index.html` or the Financial Model tab.

#### B. Coach data

- **🚩 `setonhall` / Lindberg's stored email `alindberg@shu.edu` is suspicious but UNPROVABLE; deliberately not changed (v44.35).** The live coaches page publishes his phone but **no email**, and the stored address appears nowhere on the site. It is the only `shu.edu` address in the file and does **not** match the `firstname.lastname@shu.edu` pattern every colleague uses (`jeffrey.matteo@`, `nicolai.andersen@`). Under that pattern it would be `andreas.lindberg@shu.edu` — but deriving it would be exactly the guess §7 forbids. Resolve by asking the program directly, or leave it; do not pattern-match it into the file.
- **✅ RESOLVED v44.62 — 13 coach cards rendering literal `"null"` for Yrs HC.** Fixed the renderer with the nullish-coalescing operator (`??`) to display an em-dash (`—`) instead. Affected: Marcos Vinicius Longo Ribeiro (Cowley CC), Ben MacRae (Iowa Lakes), Juan Espinal (Dodge City), Jeff Cole (Johnson County), Sam Hall (Neosho County), Bart Sasnett (Eastern Florida State), Henrique Vieira (Southeastern CC), Keith Ginsberg (Suffolk CC), Jeff Perry (Glendale CC), Martin Melchor (Angelina College), Justin Rodriguez (Coastal Bend), Jamal Lis-Simmons (Ulster CC), Alfio Carrabotta (Westchester CC).
- **🚩 10 schools have an unresolved coach-contact conflict needing Tier-1 re-verification (v44.27).** The consolidation dry-run found 21 schools where the old school-object `coach{}` disagreed with `coaches.json`; 11 were one-sided and resolved cleanly, but these 10 had two *different* non-blank values with no way to tell which is current: **wakeforest** (email+phone), **ucla** (email), **indiana** (phone), **ucsb** (phone), **charleston** (email+phone), **mercyhurst** (phone), **princeton** (phone), **ocu** (email+phone), **georgian_court** (phone), **columbia_college** (email+phone). Per the never-guess rule, `coaches.json`'s value was kept as-is — *not verified, just not overwritten*. Verify each against the school's own staff page next time it is touched.
- **✅ RESOLVED v44.62 — Butler HC email populated.** Ian Sarachan's email `isarachan@butler.edu` re-verified Tier-1 (butlersports.com/sports/msoc/coaches) and added to `coaches.json` contact info. No re-rank (`overallScore` unchanged). **`memphis` and `temple` carry the same validator warning but genuinely publish no email**, so those two remain honest gaps, not fixable ones.
- **🚩 `stjohns` head coach is "Dr. David Masur" on the live staff page; `coaches.json` stores "Dr Dave Masur" (v44.38).** Same person, cosmetic only. Left alone deliberately: any coach **name** change fires the §3a Type 2 "re-rank ALL coaches" trigger, which is disproportionate churn for punctuation. Fold it into the next genuine `coaches.json` pass rather than doing it standalone.
- **✏️ Big East coach `licence` fields — re-scoped 2026-07-20.** Previously logged as "6 fields null"; the live count is **all 11** Big East coaches, and **73 of 111 guide-wide**. The field is effectively unpopulated across the board, not a small residual. Verify when contacting programs; just don't scope it as "6".
- **🚩 Coach-bio men's/women's conflation — general audit still open.** The originating instance (Austin Solomon's bio crediting the Mercyhurst *women's* coach's departure) is fixed and "Rich Wall" returns no hits; the same error class recurred independently at UNC (Somoano/Dorrance, fixed v44.25). **No systematic search for further instances has been done.** Not urgent, but the class has now bitten twice.
- **📌 The Outreach tracker renders ONLY the 10 shortlisted schools** (confirmed live v44.35: FIU, PBA, Lynn, UCSB, USF, Barry, Clemson, UNC, FAU, SMU). A coach-contact error at any other school shows up in Coaches → Profiles and the school modal but **never** in the Outreach list — so that tab cannot be used to spot-check contact data.

#### C. Roster refresh campaign — live deferrals

**The batch plan, written at campaign kickoff (2026-08-16) and never previously committed here — this is the fix for that gap.** A prior session's summary claimed this plan already lived in this section; it didn't, and the owner had to re-paste it from the original kickoff message. Do not let this happen again — this IS the source of truth now, keep it current.

**Tooling correction, confirmed at kickoff:** the CloudFront block that hit Suffolk CC also hits `goreivers.com` — the sandboxed browser pane gets a 403, but the Claude-in-Chrome connector (real browser, residential IP) gets through clean. Use Claude-in-Chrome for every school in this campaign, never the sandboxed pane.

| Batch | Scope | Status |
|---|---|---|
| **1** | Quick wins (11 schools, 2026-27 pages already confirmed populated in the Aug 6 survey, just never extracted): `miami_dade`, `northeast_cc`, `daytona_state`, `efsc`, `iowa_lakes_cc`, `angelina_college`, `johnson_county_cc`, `glendale_cc_az`, `arizona_western`, `cowley_cc`, `coastal_bend_cc` | **✅ DONE v44.87** — 10 of 11 refreshed; `efsc` deferred (populated but zero position data, genuinely unextractable) |
| **2** | Recheck the stale-empty list (12 schools) — JUCOs `pima_cc`, `barton_cc`, `phoenix_college`, `smc`, `indian_hills`, `mohave_cc`, `southeastern_cc`; non-JUCO `tulsa`, `pittsburgh`, `pennstate`, `keiser`, `barry` | **✅ DONE v44.91, run ahead of the original "late August" deferral at owner request.** 10 of 12 are now genuinely populated: JUCOs `pima_cc`, `barton_cc`, `indian_hills`, `mohave_cc`, `southeastern_cc_ia` (facts-only per §6E); non-JUCO `tulsa`, `pittsburgh`, `pennstate`, `keiser`, `barry` (full cascade). `phoenix_college` and `smc` are still genuinely empty (byte-identical to the original survey) — stay on 2025-26 data. See CHANGELOG v44.91 for full detail, including a resolved Southeastern CC coach-title drift (Interim → permanent). |
| **3** | Non-JUCO schools never yet attempted (13 schools) — `ncstate`, `clemson`, `ucla`, `charlotte`, `ucsb`, `ucsd`, `csuf`, `lynn`, `nova`, `csula`, `chapman`, `uc_charleston`, `georgian_court`. Not in Wave 1 (2026-08-05) or the Wave-2-deferred list — genuinely never probed. **These are non-JUCO, so unlike JUCO facts-only refreshes, a real refresh here needs the FULL trajectory/score cascade** (§14 Opportunity Score table → `fitOlivier` → `lensScores`) — the JUCO calibration-gap carve-out (§6E) does not apply. | **✅ DONE v44.90 — 9 of 13 refreshed** (ncstate, ucla, charlotte, ucsb, ucsd, csuf, lynn, uc_charleston, georgian_court). **4 not yet published a 2026-27 roster** (clemson, nova, csula, chapman) — confirmed via each site's own season dropdown, left untouched. See CHANGELOG v44.90 for full detail, including a real card-extraction misalignment bug caught and fixed mid-session on ucsb/csuf. |
| **4** | `tyler_jc` — access confirmed working 2026-08-20 (direct, then VPN + cache-bust if 403; see the dated note below the table). **Use the `msoc` URL slug, not `mens-soccer`, and wait a few seconds before reading — both a wrong slug and an early read produce a false "0 players" result on this site.** Content re-verified correctly: 2025-26 has 37 real players matching the guide's stored data exactly (not stale); 2026-27 is genuinely empty (new season not set up yet). | Nothing to do — stored data is current. Re-check once 2026-27 is expected to be populated. |
| **5** | The NJCAA gap-fill campaign JUCOs (56 schools added v44.71–v44.85, region by region — the "39" figure the `project-roster-refresh-campaign` memory carried at kickoff was stale/wrong, 56 was the real count against `data/juco.json`). They carried accurate data from add time; the purpose was re-verification, not a fix. | **✅ DONE v45.02 — all 56 schools re-verified across 10 sub-batches (v44.93–v45.02), one NJCAA region at a time.** Net result: **33 of 56 (59%) were genuinely unchanged**, confirming the original gap-fill research holds up under scrutiny; **19 had real roster churn** as fresh 2026-27 rosters replaced partial/prior-season data; **4 flipped `available:false`→`true`** (`western_nebraska_cc`, `usc_lancaster`, `colorado_northwestern_cc`, `usu_eastern` — first-ever real position data captured for each); **2 coach changes** (Connors State's vacancy filled by Steve Moore, NEO A&M's Tyler Douthitt dropped his "Interim" tag). See CHANGELOG v44.93–v45.02 for full per-school, per-sub-batch detail. Two durable process findings are now standing rules (see above and §15): the `trajectoryNote` tooling gap (manual fix required on every refresh — `apply_roster_refresh.py` never touches it) and the redshirt-class-year regex gap (`^(Fr\|So\|Jr\|Sr)` misses "Redshirt Sophomore" — match the class word anywhere in the string). |

**Not in scope:** `army`, `navy`, `princeton`, `yale` (permanently excluded — see the `ivy.json` ruling below and §4's service-academy note); ~12 JUCOs with confirmed genuine blank-position data (`suffolk_cc`, `westchester_cc`, `lamar_cc`, etc.) — recheck only if one of those schools starts publishing the missing column.

**🚩 Tooling gap found v44.93 — `apply_roster_refresh.py`'s patch flow never touches `minutesOutlook.trajectoryNote`.** That field is separate from `recruit_pathway_note` (which the `pathway_note` patch key does update) and is hand-authored prose describing the roster vintage/trajectory reasoning — it renders verbatim on the live Minutes Outlook card (§8 rule). Refreshing a school's facts via the script left `yavapai_college`'s card telling visitors the 2026-27 roster was "only 60% populated... too incomplete to use" a week after that same roster had been fully re-verified — caught only by the Phase 5 browser check, not by any validator (no check reads this field against `roster_season`). **Whenever a JUCO or non-JUCO school's roster is refreshed, manually rewrite `trajectoryNote` in the same edit** — it is not automated and treating the script's output as complete will leave stale prose live.

- **⏳ JUCO Session 4 SURVEY (2026-08-06) — the session ran too early: 7 of 19 probed JUCOs publish a 2026-27 page with ZERO players.** Probe method: real Chrome, season-scoped URL (`/sports/msoc/2026-27/roster` — `/sports/msoc/roster` **404s** on these `/index` hosts, per v42.5), recording title + `tbody tr` count + `body.innerText.length`.
  - **PUBLISHED BUT EMPTY — defer, do not retry before late August (instances 6–12):** `pima_cc` (0 rows / 646 B — **control-tested: its 2025-26 page returns 35 rows / 3367 B through the identical read**), `barton_cc` (0 / 1495), `phoenix_college` (0 / 261), `smc` (0 / 400), `indian_hills` (0 / 1451 — the original trap-4 school, doing it again), `mohave_cc` (0 / 555), `southeastern_cc_ia` (0 / 801). All keep their 2025-26 data and label.
  - **✅ RESOLVED v44.87 — the 10 "POPULATED, extraction PENDING" schools were extracted and refreshed to 2026-27** (`miami_dade`, `northeast_cc`, `daytona_state`, `iowa_lakes_cc`, `angelina_college`, `johnson_county_cc`, `glendale_cc_az`, `arizona_western`, `cowley_cc`) — see the v44.87 CHANGELOG entry for full detail. **`efsc` was the exception — extraction attempted, not completed**: its 2026-27 page is populated (33 players) but publishes no position data for any outfield player at all (confirmed via DOM cell inspection, not a false negative), so it stays on stored 2025-26 data with a disclosure note. The two pre-flagged season-sanity-checks both resolved cleanly: `angelina_college`'s *"Roadrunner Soccer Roster 2027"* title is the real 2026-27 season (confirmed via the season selector), and `cowley_cc`'s roster page genuinely mislabels its own `<title>` as "Standings" despite serving real roster table data.
  - **✅ RESOLVED v44.87 — `coastal_bend_cc` (PrestoSports host) is genuinely populated on 2026-27.** Its earlier 403 (survey_juco.json, this session's own scripted re-probe) was the same CloudFront datacenter-IP block seen on Suffolk/Iowa Western — a network verdict, not a data verdict (Rule 0). The Claude-in-Chrome connector reached it cleanly on the first real-browser attempt. Refreshed to 2026-27 in the same batch.
  - **Not yet probed (1):** `tyler_jc` — see below, believed structurally broken, not just unread.
  - **✅ RESOLVED v44.88 — coach-verification follow-up for v44.87's Batch 1.** All 9 schools left unconfirmed by Batch 1 (`northeast_cc`, `daytona_state`, `cowley_cc`, `angelina_college`, `iowa_lakes_cc`, `johnson_county_cc`, `glendale_cc_az`, `arizona_western`, `coastal_bend_cc`) were visited on their official `/coaches` (or equivalent) page via Claude-in-Chrome and cross-checked against `coaches.json`. Every stored **name** was correct — the Batch 1 red flags (an assistant on `northeast_cc`'s roster page, a team manager on `cowley_cc`'s roster table, an empty Coaching Staff section on `angelina_college`) were all artifacts of reading the *roster* page instead of the school's actual *coaches* page, which in every case cleanly listed the stored head coach. **4 of 9 had a stale `title` field**, corrected (bio text updated to match in the same edit, per the Type 2 bio-sweep rule): `daytona_state` "Head Coach" → **"Head Men's Soccer Coach"**; `johnson_county_cc` "Head Men's Soccer Coach" → **"Head Coach"**; `coastal_bend_cc` "Head Men's Soccer Coach" → **"Head Coach"**; `glendale_cc_az` "Head Men's Soccer Coach" → **"Head Coach Men's and Women's Soccer"** (he coaches both programs — the entry's own `overallScoreNote` already said this, the `title` field just hadn't been updated to match). No `overallScore` changed on any of the 9, so no re-rank was needed (title/bio-only edits don't move rank order). `efsc` remains untouched/deferred per its own separate note above. `validate_schools.py`: 0 errors, 25 warnings (unchanged). `validate_consistency.js`: **Issues: 0**. **This also surfaced a standing process gap: nothing in §3a Change Type 3 required a coach spot-check as part of a roster refresh — the Batch 1 miss was a one-off backlog item, not a rule.** Fixed by adding a permanent "Coach spot-check" requirement to Change Type 3's cascade (see that section) so a future roster-refresh batch can't repeat this gap silently.
  - **Apply the goalkeeper/midfielder-share test (§15) to every new extraction before trusting it** — a 2026-27 JUCO page in early August is exactly where a half-published roster appears, and Barry showed a plausible-looking count can still be fabricated. All 11 schools in the v44.87 batch passed this check (2+ goalkeepers, no outlier MF share) except `efsc`, which failed differently (zero positions at all, not a skewed count).
- **✅ RESOLVED v44.86, corrected v44.87 — `iowa_western`'s stored `url` was wrong (`iwcc.edu/athletics`, not a `/sports/msoc` path) and its 2026-27 roster is now live and populated.** Owner supplied the correct athletics URL directly (`https://www.goreivers.com/sports/msoc/index`; roster at `.../2026-27/roster`) — `url` corrected in `data/juco.json`. **Same CloudFront block as Suffolk hit the sandboxed browser pane (403); only the Claude-in-Chrome connector on a real residential IP reached it**, so this pattern generalises beyond Suffolk and is worth assuming by default for any `goreivers.com`-family host. Facts-only refresh applied per the JUCO rule below: `mf_total` 12→13, `roster_season` 2025-26→2026-27, `cleared_before_2027` 12→5 (real churn confirmed — 4 of the prior season's 8 freshmen are no longer on the roster at all), `recruit_risk` Low→High. `trajectory[].pct` and the score cascade (`fitOlivier`, `lensScores`) were deliberately **left untouched** per the JUCO calibration gap (§6E) — note carries the ⚠ MIXED VINTAGE disclosure. Validated (`validate_schools.py` PASS, `validate_consistency.js` Issues: 0) and confirmed live in a local browser (`unis[]` shows the correct facts, `fitOlivier`/`lensScores.minutes` unchanged). **This was in fact committed as part of v44.86** — the "not yet committed" line that previously sat here was stale the moment that commit landed; correcting it here rather than leaving a self-contradicting note (git log and the working tree agree the change is live).
- **✅ ACCESS METHOD CONFIRMED 2026-08-20, CORRECTED SAME DAY — `tyler_jc`'s athletics host (`apacheathletics.com`) 403s direct/residential connections with a CloudFront block page, but a VPN reliably reaches it.** Distinct from the datacenter-IP CloudFront block seen elsewhere in this project (Suffolk, `goreivers.com`) — those block *hosting-provider* IPs specifically and a normal residential connection sails through; this one 403s the owner's own normal residential connection too, and only clears with a VPN, which points to a geo/traffic-pattern WAF rule rather than a datacenter-IP rule. **A second gotcha on top of the VPN requirement: CloudFront caches the 403 error page itself** — the very next request after connecting the VPN returned the byte-identical cached error (same `Request ID`), and only cleared once a cache-busting query string (`?_=1`) forced a fresh request. **Standing procedure: try the direct connection first (residential and Claude-in-Chrome both); if that 403s, ask the owner to enable a VPN; if the VPN'd request still shows the error page, append a throwaway query string and retry once before concluding the block is still active.**

  **⚠️ Two wrong URLs and a race condition produced a false "no content anywhere" finding earlier the same day — corrected once the owner supplied the right URL. Read this before trusting any negative result on this school again.** The correct roster URL shape is `apacheathletics.com/sports/msoc/{season}/roster` (`msoc`, not `mens-soccer` — the wrong sport slug routes to a generic "TEAM SEASON NOT FOUND" page that looks exactly like a genuinely empty season and is not distinguishable from one without knowing the right slug). Separately, even on the correct URL, `get_page_text` read immediately after `navigate` returned "0 PLAYERS / NO PLAYERS FOUND" for a season that in fact has 37 real players — the roster table loads asynchronously and the empty-state message renders BEFORE the fetch completes, then gets silently overwritten once it does. This is the exact "navigate returns before the page renders" trap §5b already documents for a different site family — it applies here too. **Always wait a few seconds after navigating to an `apacheathletics.com` `msoc` page before reading it, and never trust a "0 players" result without that wait.**

  **The real, now-correctly-verified state (checked with the right URL and a proper wait, all three seasons):** `2026-27` — genuinely 0 players (confirmed after a 3s wait, the new season isn't set up yet). `2025-26` — genuinely **37 players**, matching the guide's own stored 13-name midfielder subset exactly (same names, same classes — e.g. Unathi Radebe/sophomore, Diego Ruiz/sophomore, both confirmed). `2024-25` — not yet re-verified with the corrected URL + wait; treat the old "empty" reading as unconfirmed, not disproven. **Net effect: the guide's stored 2025-26 `tyler_jc` roster is accurate and current — it is not stale, and there is nothing to re-extract right now** (2026-27 genuinely has nothing to pull yet). `coaches.json.url` is also one of only 3 schools guide-wide with no stored URL at all (§6D) — the correct `msoc` URL pattern above should resolve this next time it's touched.
- **⏳ Five schools deferred to Wave 2 as "published but not populated" — do NOT retry before late August.** None is a scraping failure. `tulsa` (2026 page: coaches and support staff, **zero players**; its 2025 page returns 29 through the identical extractor) · `pittsburgh` (**13 players against 26** in 2025) · `pennstate` (**8 players and zero midfielders** beside a full coaching *and* support staff) · `keiser` (full staff, **zero players**; 2025 returns 34 — raw HTML agrees, 62 `sidearm-roster-player` hits and **0** position classes, vs 1615/136 in 2025) · `barry` (**21 against 34**, and the shape is what settles it — **one goalkeeper**, 5 defenders, 12 of 21 midfield-capable). All five keep their 2025-26 `minutesOutlook` and `roster_season`, which honestly describe where the stored count came from. **When you do retry, re-run both checks** — the prior-season count comparison *and* the goalkeeper/midfielder-share test (§15) — rather than assuming August fixed anything. Barry is the case that produced the GK diagnostic: refreshed as-is it would have stored 12 MFs with **zero** clearing before 2027, a plausible number and a fabricated score.
- **⏳ `ocu` and `stedwards` carry a disclosed BLANK-POSITION caveat.** `ocu` publishes 3 of 25 players and `stedwards` 6 of 39 with an **empty position cell**. Genuine, not a parser artifact: the rendered card view shows no position, and all six St. Edward's **player bio pages carry no position field either**. `mf_total` counts only confirmed midfielders and both notes say so. **Materiality was measured, not assumed: OCU is immaterial** (worst case moves opportunity 6.0 → 7.0, same §14 trajectory row) — it needs nothing. **St. Edward's is not** (8.5 → 5.5 crosses a row), so its outlook must be **re-derived** when the school completes its data, not merely re-confirmed. **This is a field-level gap and must not be confused with the roster-level gap above** — the squad shape is healthy in both cases (OCU 3 GK, St. Edward's 5 GK).
- **✅ RESOLVED Session 4 (2026-08-06) — `suffolk_cc` and `westchester_cc` re-tested in a real browser; the missing positions are GENUINE. Both stay `available:false`, and their notes now say what was tried, in which browser, on what date.** The owner asked because the two records disagreed about how hard this had been tested: Suffolk's stored note said *"not populated at time of automated fetch… revisit with direct browser access"* while the old §6 line claimed both were *"re-checked via Chrome MCP."* Those could not both be true, and the `?jsRendering=true` in the owner's link suggested a client-side render. **Re-tested properly; the claim holds, but for reasons neither record stated.**
  - **`suffolk_cc`** — its roster is a **TABLE** (`NO. | NAME | POS. | CL. | HIGH SCHOOL`, 24 rows). The `POS.` column **exists and is empty for all 24 players**, as is `HIGH SCHOOL`, while `CL.` is fully published (FR/SO). There is nowhere else to look: Suffolk publishes **no player bio pages at all** (zero `/roster/<slug>/<id>` links) and the words Goalkeeper/Midfielder/Defender/Forward appear **nowhere** on the page. Season selector confirms **2025-26 is the newest** — no 2026-27 roster.
  - **`westchester_cc`** — Sidearm **CARD** layout: 24 cards render, each with a `.sidearm-roster-player-position` element, and **all 24 are empty**, while class year and hometown/high school publish normally. A player bio page (`miguel-diaz/1357`) carries **no position field either** — the same dead-end as the `stedwards` precedent. Season selector confirms **2025 is the newest** — no 2026 roster.
  - **⚠ The `?jsRendering=true` hint was a red herring, and the reason matters: Suffolk CloudFront-403s datacenter IPs.** A scripted fetch and the in-app browser both fail there — that is a **network block, not evidence about the data**. Only the real Chrome (residential IP) reached it. Do not read a 403/202 from these hosts as "the column is missing"; the two failure modes look identical from a script.
  - **Neither Fit score moved, and that is correct** — the §6 prediction that both would fall assumed positions would be recoverable. They stay `available:false`, so both keep the neutral 0.5 (`lensScores.minutes: 50`) and their `fitOlivier` **37** / **43**. `recruit_pathway` stays unset on both (`MO-KEYS` forbids it on an `available:false` object).
  - **Re-check only if either school starts publishing positions.** Both coaches were verified live at the same time and are unchanged (Keith Ginsberg / Alfio Carrabotta).
- **🚩 `ivy.json` is out of the roster campaign by owner ruling; both schools stay `available:false`.** *"I dont care about Yale and Princeton. They are unattainable as they dont offer scholarships."* This is a **research-effort** decision, **not a Change Type 10** — `ivy.json` is unchanged, both schools remain in the guide, and their `fundingPathway:"none"` −8 penalty already expresses the constraint. **Do not delete them without an explicit instruction, and skip `ivy.json` in every campaign.** Both 2026-27 rosters were fetched and parse cleanly (princeton 15 MFs of 31, yale 10 of 27) if this is ever reversed. **Accepted consequence:** the neutral 0.5 makes Princeton's stored fit 41 and Yale's 47 mildly flattering.
- **🚩 11 schools publish NO previous-school column, so `recruit_pathway` cannot be re-derived from the roster (v44.38).** `fau`, `syracuse`, `georgetown`, `stjohns`, `uconn`, `depaul`, `marquette`, `setonhall` omit it entirely; `cal` and `villanova` render the field but leave it empty for every midfielder. Their existing classification was **retained, not re-derived**, and each note says so and flags itself lower-confidence. **Do not "fix" these by inferring a pathway from the hometown/high-school text** — that column holds secondary schools and clubs, not colleges, and reading it as a transfer signal is exactly how a wrong classification enters. Resolve only if a school starts publishing the column, or from per-player bio pages if ever worth ~10 page loads per school.
- **🚩 `recruit_risk` was RETAINED, not re-derived, for all 27 Session-2 schools that had one (v44.42).** It is unscored (only `trajectory[].pct` feeds `scores.js`), and re-deriving 27 judgment values against a newly-invented rule was out of scope. Most worth revisiting where the midfield group size moved sharply: `hofstra` 6→12, `delaware` 4→9, `monmouth` 5→9, `william_mary` 7→11.

**⏳ NCAA transfer-portal windows — mandatory roster re-check schedule (added 2026-08-17, owner-directed).** Every roster refresh in this guide has a shelf life shorter than it looks, because NCAA Division I men's soccer restricts *when* a player can enter the transfer portal to two fixed windows a year — real roster movement concentrates almost entirely inside these dates, not evenly across the calendar. **This applies to the NCAA-governed schools in the guide (D1 primarily; D2/D3 have no fixed window at all). It does NOT apply to `data/juco.json` schools** — NJCAA is a separate governing body with its own transfer rules, not the NCAA portal described here; do not mechanically re-trigger a JUCO recheck off these dates. (JUCO players who transfer *into* an NCAA D1 program still land inside that D1 school's own portal-driven roster churn — that's already covered by checking the D1 side.)

The two official windows (confirm exact dates each cycle against the NCAA's own published calendar — they shift slightly with the championship schedule):
- **Fall/winter window**: ~30 days, opens shortly after NCAA championship selections — typically late November to late December (e.g. Nov 24 – Dec 23/24 in recent cycles).
- **Spring window**: 15 days, usually May 1–15 (shared with women's soccer).
- **Exception**: a separate 30-day window opens any time a head coach is fired or departs, regardless of the regular calendar — an unexpected coaching change (§3a Change Type 2) is therefore also a trigger to re-check that school's *roster*, not just refresh its coach record.
- Outside these windows, portal entry generally requires a special waiver (not guaranteed) — most real movement really is confined to the windows above.
- **Watch item, do not assume it hasn't happened**: a rules change adopted for the 2027–28 academic year would collapse this to a **single 15-day spring window** (opening the day after the championship). If adopted, it changes the schedule below — confirm current NCAA rules before relying on the two-window assumption for any 2027-28-and-later recheck.

**Scheduled re-check dates, anchored to Olivier's August 2027 target departure:**

| Window | Approx. dates | What to do |
|---|---|---|
| Fall/winter 2026 | ~Nov 24 – Dec 24, 2026 | Re-run a roster-refresh pass on the NCAA (non-JUCO) schools once the window has closed and portal commitments have settled — early January 2027 |
| Spring 2027 | ~May 1–15, 2027 | Re-run again in late May 2027 |
| Final pre-arrival check | — | One last full pass in July/August 2027, immediately before Olivier's departure, to catch late waiver-based movement and confirm the picture is current on arrival |

**Why this matters for `minutesOutlook`:** the field exists to project Olivier's actual competition for a midfield spot in his first season. A roster refreshed once and never revisited will silently miss every portal departure/arrival in the Nov–Dec window, then again in May, and `fitOlivier` built on it will be quietly wrong for months at a time — the error doesn't announce itself, since nothing about a stale-but-plausible roster count looks broken. This doesn't replace the general roster-refresh campaign (§6C above); it exists to anchor that campaign's cadence to the actual portal calendar instead of an arbitrary "feels overdue" trigger.

#### D. Stored links & domains

- **✅ RESOLVED v45.07 — `DOMAINS.gcu` corrected `'lopes.com'` → `'gculopes.com'`.** Confirmed via real browser (Claude-in-Chrome, RULE 0): `gculopes.com` is GCU's live athletics site — same host its own school-object `url` field already used — with a real favicon served at `/favicon.ico`. `lopes.com` never loaded (browser-confirmed unreachable, not just a script timeout). Found during a guide-wide favicon audit (v45.06-v45.07) that also added a direct-`/favicon.ico`-first fallback chain (see CHANGELOG v45.06) and backfilled `domain` on 5 schools that had none (`mercyhurst`, `georgian_court`, `columbia_college`, `northeast_cc`, `monroe_college`).
- **✅ RESOLVED v45.11 — `tyler_jc`'s icon is a local asset (`assets/logos/tyler_jc.png`), not any live-fetched source.** Three live-fetch attempts in one session (v45.08 contrast-only fix, v45.09's DOMAINS/domain swap onto `tjc.edu` — which turned out to be WordPress's own default icon, not TJC's, caught immediately by the owner via screenshot — and v45.10's `ICON_OVERRIDES` pointed at `apacheathletics.com`'s real-but-non-square 512×121 wordmark banner) each fell short in a different way. Owner then supplied the school's own official square Apaches logo (TJC wordmark + warrior-head mark, 256×256, no transparency) directly and asked for it to be used as-is, no more searching. **This is the first local image asset in this project — a new, minimal `assets/logos/` convention**, used only where live-fetching genuinely can't produce a good result (documented per-school in `ICON_OVERRIDES`, see §4). `ICON_OVERRIDES.tyler_jc` now points at the local path; `domain`/`DOMAINS.tyler_jc` stay `'apacheathletics.com'` (unchanged since v45.10) as an inert last-resort fallback only. **Do not touch the other 169 schools' DOMAINS/domain split** — that convention is still correct and by design; this is a Tyler-specific override, not a change to it. **Do not go looking for a "better" live source for Tyler JC again** — the owner-supplied asset is the intended, final answer for this school.
- **✅ RESOLVED v45.12 — the 5 City Colleges of Chicago schools (`truman_college`, `daley_college`, `kennedy_king_college`, `wilbur_wright_college`, `malcolm_x_college`) now each show their own mascot logo via `ICON_OVERRIDES`, not an identical shared icon.** Root cause, structurally different from `tyler_jc`'s: all 5 legitimately share `domain: 'ccc.edu'` and `DOMAINS[]: 'region4sports.com'` — CCC is one district with one central website (no per-college subdomains), and the real per-college athletics domain (`citycollegesofchicagoathletics.com`) has been dead since before this project's history began (§C notes this). A favicon is fetched at the domain level, so five colleges sharing two domains can never look different via live-fetch, no matter what the code does — this is not fixable by improving the fetch logic, only by a per-school override. Sourced each logo via Google Images (not a live favicon fetch) per owner suggestion, each Tier-1 cross-checked against ≥2 independent sources before trusting it. **That verification caught two pre-existing wrong mascot names**, now corrected everywhere (`full` in `data/juco.json`, `school` + bio text in `data/coaches.json`): Daley College was stored as "(Comets)" — actually the **Bulldogs**; Kennedy-King was stored as "(Hawks)" — actually the **Statesmen** ("Hawks" genuinely belongs to Malcolm X, the other school in this batch; both cards claiming the same mascot simultaneously was itself the tell). See `ICON_OVERRIDES` in §4 for the mechanism.
- **📌 3 `coaches.json` entries have no `url` at all** — `tyler_jc`, `indian_hills`, `murray_state_ok`. A gap, not breakage; that field sweeps 108/108 live otherwise.

#### D2. COA campaign — ✅ COMPLETE (restarted v44.56, finished v44.59, closed out v44.60)

**✅ DONE — all 53 ballparks replaced, and as of v44.60 every cost in the guide is Tier-1 sourced with NO estimates left.** Zero round-number `costNum` values remain: 109 exact + 2 zeroed service academies = 111. **v44.60 also DELETED the two dead display fields `u.cost` and `fin.cost`** — 116 lines, nothing rendered them, and 50 of 111 had drifted more than $4k out; cost is derived from `costNum` alone and the new `COSTSTR` check stops them coming back. Every school now carries a researched, Tier-1-sourced direct billed cost with the source, the year and any assumption named in its `internationalNote`. **Do not reopen this as a campaign** — treat any future cost work as a routine Change Type 4 on the one school concerned.

**The invariant that now protects it:** `validate_consistency.js`'s `FIN` check requires `tuition + roomBoard + fees == costNum`, and the `VALUE` check requires `lensScores.value` to match `fitOlivier×0.6 + affordability×40`. Between them, a future edit that changes a component without the total, or a cost without the value lens, cannot pass. **The FIN check earned its keep on the last batch** — it caught University of Charleston's own published total omitting its own fee line. `COSTSTR` (v44.60) closes the third gap: no school may carry a free-text cost string again, and `js/app.js` may not reference `u.cost`. **Negative-testing COSTSTR exposed a reusable trap — the check fired on its own explanatory comment**, so the `deComment()` helper is now hoisted above both it and `PROSE`. A rule about what the CODE does must never be tripped by the comment describing the rule.

**Outcome: 47 of 53 ballparks were OPTIMISTIC.** Only six were overstated — `gcu` (−$8,718), `indian_hills` (−$6,660), `memphis` (−$5,575), `virginia` (−$3,864), `usf` (−$3,746), `ncstate` (−$1,617). Largest errors: `calpoly` **+$26,854**, `stedwards` +$25,176, `delaware` +$23,634, `denver` +$22,119, `stjohns` +$21,758. Extremes moved: `gcu` $29,282 is the cheapest four-year school in the guide, `northwestern` $96,003 the most expensive. Dashboard **"within budget" 59 → 48 of 111**.

**Schools whose figures carry a caveat — re-check these first if any cost is ever questioned:** `keiser` (newest published data is **Fall 2023**, stored as a disclosed floor) · `michiganstate` and `indian_hills` and `daytona_state` (2025-26, the newest each publishes) · `csula` (**the only DERIVED figure** — Cal State LA publishes no non-resident total, so the $471/unit surcharge is annualised at Fullerton's published 26-unit basis, with the 24- and 30-unit bounds given in the note) · `michigan` (a slight floor — mandatory fees cannot be split out of U-M's LSA tuition-and-fees line) · `smc` and `miami_dade` (**no campus housing at all**, so `roomBoard` is the college's own living allowance, not a bill) · `daytona_state` (its single 67-unit residence hall was full with a waiting list; off-campus would add ~$5,154).

#### ⚠ The lessons that cost the most — keep these; they generalise beyond cost research

1. **UNIVERSITIES PRICE TUITION BY SCHOOL/COLLEGE — check where the stored `degreeTitle` actually lives before taking a headline number.** Five hits in one session: **Pittsburgh** (Exercise Science is School of Education $43,328, *not* Health & Rehabilitation Sciences $55,070 — a $11,742 swing), **Temple** (Kinesiology is College of Public Health, $5,520 above the Liberal Arts figure Temple uses in its own summary example), **Michigan** (Movement Science is School of Kinesiology; U-M's published budget is LSA-based and its footnote says so), **UVA** (School of Education and Human Development), **Cal Poly** (College of Science and Mathematics).
2. **THE ACCESSIBILITY TREE SILENTLY TRUNCATES LEADING DIGITS ON MONEY.** UNC Charlotte returned `$2,018` for a $22,018 tuition and `$662` for $5,662 of meals. **Always reconcile the components against the school's own published total, and read figures off a SCREENSHOT, not `read_page`/`find`.** The same guard caught a wrong Wake Forest housing figure and is why Wake Forest was deferred instead of guessed.
3. **AN UNEXPANDED ACCORDION IS NOT EVIDENCE OF ABSENCE (v44.58).** FAU and USF were both recorded as publishing only a per-credit-hour rate needing an owner ruling on credit load; both publish a full non-resident budget on the same page, one click away. Same family as §15's "a 403 is a NETWORK verdict, never a DATA verdict". Barry's consent gate was real; `Reject All` cleared it and no consent was accepted.
4. **A TIER-1 PAGE CAN BE WRONG ABOUT ITSELF — three cases in one session.** Memphis's COA page repeats its out-of-state totals in the international TOTAL column; Miami Dade's COA chart says to double its per-term figures but its own Total row doubles only the *other* expenses; University of Charleston's "Total fixed charges" omits its own $500 fee line. **Always add the components up and compare with the published total.** §15 already said Tier-1 means authoritative about *itself*, not about third parties — that is now too generous.

**Other traps, each recorded in the relevant school's note:** a school's own "direct costs" row may include what this guide excludes (**UAB** counts books and required health insurance; **Xavier**, **Villanova** and **Indian Hills** count books). An advertised tuition figure may be an *optional* product (**Hofstra**'s $66,466 is the voluntary four-year locked-in rate). A fee can hide in a second table (**Cal Poly**'s $8,804 non-resident Opportunity Fee — most of that school's $26,854 error). A published budget may be the *resident* one (**Indian Hills**' COA PDF says so in its own footnote).

**📌 Conventions — settled; apply them, do not re-derive them.** `costNum = tuition + roomBoard + fees` = **direct billed cost**, excluding books, transport, personal expenses, loan fees and waivable health insurance; record the school's own headline COA in `internationalNote` so the difference is visible. **Look for the school's own direct-billed row** — twelve schools publish one verbatim (UConn `Subtotal Direct Costs`, Monmouth `Direct Cost (Billed by MU)`, FAU `Estimated Direct Costs`, USF `Total Billable Expenses`, Stony Brook `Total Direct Costs`, Delaware `BILLABLE ACADEMIC YEAR TOTAL`, Denver `Billable Costs`, Elon's `Total`, Northwestern's `Direct Costs charged by Northwestern`, UVA's `Subtotal`, UC Charleston's `Total fixed charges`, PBA's stated total). Where tuition and fees are published **combined**, store the combined figure under `tuition`, set `fees: 0`, and say so. Skip bursar per-credit tables and go to the financial-aid office's COA page. Use the **non-resident/international** rate and the newest published year. Where a credit load is unavoidable, use the **school's own** published basis and name it (CSUF 13 units/sem · Cal Poly "30u @ $471/unit" · UCA 30 hours · USF 28 hours · SMC 24 units · MDC 12/term · IWCC 15/sem).

**✅ The two dead cost fields (`u.cost`, `fin.cost`) were DELETED in v44.60** — see the CHANGELOG entry. `costDisplay()` derives from `costNum` alone and the `COSTSTR` check enforces it.

#### E. Scoring & design questions for the owner

- **🚩 Army & Navy `lensScores.value`: does the Value lens credit a $0 sticker price? OWNER DESIGN QUESTION, not drift (v44.30).** Both store a value well below what the formula yields — **navy** 47 vs 66, **army** 45 vs 65. The cause is structural: §4 requires `costNum=0` and all `fin{}` numerics zeroed for service academies, which saturates `affordability` at 1.0 and hands them the full +40 credit. The stored values (both ≈ `fit+3`) deliberately decline it, and the reasoning is sound — the "free" tuition is paid for with a 5-year service commitment, a real cost no dollar figure expresses, and §4 is explicit that these schools are incompatible with the DPT/MLS pathway. Applying the formula verbatim would promote them to roughly 6th and 8th of 111 on the Value lens. **The `VALUE` check therefore exempts `costNum === 0` rather than reporting two intentional values as errors** — it declines to rule on the design question. Resolve one of three ways: (a) keep the exemption and accept that service-academy value is hand-set (status quo), (b) define an explicit service-academy affordability constant so it is derived rather than hand-set, or (c) decide the +40 is correct and re-store both. Whichever is chosen, **remove or narrow the exemption so the two schools stop being un-checked.**
- **✅ RESOLVED v44.92 — JUCO trajectory calibration gap closed.** §14 now has a real, documented JUCO-specific opportunity→trajectory formula (logistic curve, floor 32%/ceiling 78%, anchored on `tyler_jc`) — see §14 for the formula and the full calibration history (why a clean reverse-engineered formula didn't exist, why `murray_state_ok`'s specific anchor value was allowed to drift). All 77 available-JUCO schools were re-derived against it in one pass, cascaded, and re-ranked. `apply_roster_refresh.py`'s `facts_only` branch (used throughout the roster-refresh campaign to update counts without touching trajectory) is no longer needed for JUCOs going forward — a roster refresh can now recompute trajectory in the same edit via the documented formula. See CHANGELOG v44.92 for the campaign detail.
- **🚩 `DIV_STRENGTH` NJCAA DI (0.6) vs DII has no split** (e.g. 0.55 — effect under 1 Fit point, cosmetic). Note §5a deliberately puts the DI/DII distinction *here* and in `nextLevelOutput`, not in the dev-score bands.
- **🚩 Elite JUCO tiering bar — owner aware, undecided.** 21 of 30 JUCOs are currently "Elite"; the strict v37.4 criteria would demote roughly 7 (Glendale, Mohave, Johnson County, Coastal Bend, Dodge City, Blinn, Iowa Lakes).
- **🚩 Consider a soft dev-score sanity REPORT script** — a sorted cross-division table for eyeballing, **not** a hard validator check, since dev scores are judgment values.

#### F. Data gaps & watch items

- **⏳ Monroe is leaving JUCO — but not yet; `div: "JUCO"` is CURRENTLY CORRECT (verified v42.12).** Tier-1, Monroe's own release: *"the transition from **NJCAA Division I** competition toward NCAA Division II membership."* Applies by **Oct 1 2026**; Provisional Yr 1 **2027-28**; Yr 2 **2028-29**; **full NCAA D2 in 2029-30**. Men's soccer already plays a 2026 "CACC scheduling alliance" schedule and Monroe is absent from the NCAA men's soccer directory. **Do not change `div` now.** Revisit ~2027; it will cascade into `jucoTier`, `njcaaRegion`, `fundingPathway` (§5c), `DIV_STRENGTH` and §5b's JUCO scope. (Angelina College's release already calls Monroe "NCAA Division II" — it is wrong, another Tier-1 page erring about a third party.)
- **⏳ Coastal Bend CC coaching transition** — the program's #14 national ranking (2025) was earned under interim coach Manuel Iwabuchi; Justin Rodriguez was hired as permanent Head Coach in March 2026. Direction under the new coach is unverified.
- **⏳ Indian Hills' `nextLevel.perYear` (0.88/yr) is stale relative to the program's current form — re-check once the alumni page extends past 2024 (found 2026-08-20, discussion only, not a data session).** The stored rate is Tier-1 correct (15 verified D1 transfers ÷ 17 seasons, 2008–2024), but the window is almost entirely pre-Zac Newton — his tenure only began 2024 (his 2nd season, 2025, was the NJCAA DI National Championship), so the championship-era roster hasn't had time to transfer out and register on the school's own alumni page yet. **Do not "fix" this by estimating future transfers — that's a guess, not evidence.** The roster-refresh + transfer-tracking skill pair (§9) will surface individual Newton-era departures as they happen (`roster_moves_queue.json` → cross-school/tracker matching), but per `transfer-tracking/SKILL.md`'s own step 3, neither script writes to `proPlayers.nextLevel` — a confirmed departure does not auto-update `perYear`. There's also no established rule yet for merging piecemeal tracker-confirmed hits into an *already-measured*, census-sourced rate (the v44.67 fold-in rules were written for schools with no alumni page at all, not for revising one of the 7 real anchors). The clean fix is the same as the original research: re-read Indian Hills' own alumni page once it's been updated to include 2025+ seasons and recompute from the full census — not blend in ad hoc tracker hits.
- **✅ RESOLVED v44.91 — Southeastern CC's Henrique Vieira is now confirmed permanent, not interim.** Found live during the roster-refresh Batch 2 recheck: the school's own coaches page no longer carries the "Interim" qualifier (now "Head Men's Soccer Coach/Soccer Coordinator"). `coaches.json`'s `overallScoreNote` had already noted "now permanent, previously interim" from an earlier pass, but `title`, `bio`, and `record` still said "Interim" — all three corrected in the same edit. No `overallScore` change, so no re-rank was needed.
- **🚩 Tyler JC's "#1 D1 Transfer Feeder Nationally — all-time record" claim is UNVERIFIED and may be program marketing (found v42.1).** Stored in Tyler's `soccerLevel` string and repeated in `proPlayers.notable[]`. Tyler's own "Next Level" page lists **74** D1 alumni (2012–2023); Iowa Western's lists **87** (2004–2026). Tyler leads on *rate* (6.2/yr vs 4.0/yr) but trails on raw count, so the unqualified "#1 all-time" claim is not supported by the two schools' own pages. Either qualify it or remove it. **Do not repeat a program's self-description as fact.**
- **🚩 Older-year (2021–2023) `confRecord` entries for Temple, Georgian Court, Columbia College (MO) and Charleston (WV) are marked "not re-verified v38".** 2024/2025 (and 2021 for Charleston) were Tier-1 confirmed in the v38.10 pass; the middle years were left as retained-from-prior-session rather than guessed. Low priority, informational only.
- **📌 Residuals from the v40.7–v40.11 JUCO verification pass, all deliberate.** (1) A remaining `null` SOCIAL slot means "no such account found on the official site," **not** "unresearched." (2) Coach email/phone genuinely unpublished at **Mohave CC, Southeastern CC, Angelina, Suffolk CC** — names-only coaches pages; re-check periodically. All four head-coach names were re-confirmed current in v40. (3) **Ulster's Instagram (`ulsterathletics`) is linked from its official site but the account is dead** ("Profile isn't available") — left `null`.
- **📌 Suffolk CC / Westchester CC were once logged as "confirmed genuinely absent — re-checked via Chrome MCP."** That claim contradicts Suffolk's own stored note and **should not be relied on** — see the Session 4 sub-task in group C. (Southeastern CC and Coastal Bend CC were on the same list initially; WebFetch had failed on both, and Chrome MCP got full rosters with positions on the first real-browser attempt, confirming those two were a tooling mistake rather than a data gap.)

#### G. Docs & code quality

- **🚩 `README.md` has no per-version rows for v41–v44.** The header version and school count were corrected in v44.30 and again in v44.48, and a single combined **v41–v44** row points at CHANGELOG.md. The per-version era rows for v41, v42 and v43 are still missing — **deliberately not back-filled**, since writing era summaries for four versions of work a later session didn't do is how inaccurate history gets manufactured. Low priority; back-fill from CHANGELOG.md when convenient.
- **🚩 §7 Phase 5's "score breakdown tooltip" checklist item describes a feature that does not exist in the current build.** Checked on both a new and a pre-existing school: the fit score display (`#modal-fit-score`, `#fit-[id]`) has no `onclick`/tooltip behaviour on either the card or the modal. Either the feature was removed without updating the checklist, or it was never built. Needs a doc correction once confirmed which.
- **🚩 Low-priority code-quality items, carried since the v36 review and never in its named scope.** `atarToGpa` is defined in **both** `scores.js` and `app.js` (app.js wins by script load order — **do not reorder the script tags**); `DATA_BASE_URL` means `./data/` in app.js but site root in dashboard.js; `olivier.json` is fetched twice per page load; `selectSchoolFromBar()`'s button-highlight matcher can never match (arrow-fn `toString`); dashboard `filterToConf('other')` scrolls to the Ivy section (5 Explore sections share `data-confkey="other"`, plus 5 duplicate `id="grid-other"` elements); the search keyword is echoed unescaped into the filter-summary HTML (self-XSS); the Glossary's Minutes Score text says Yr1 45/Yr2 30/Yr3 15/Yr4 10 but the code is Yr1 60/Yr2 40; the FX slider sublabels say 1.30–1.80 but the range is 1.20–1.70.

---

## 7. Universal Change Workflow

**This workflow applies to every change type without exception — new school, remove school, UX fix, data update, coach change, everything.**

The phases are universal. The checklist inside each phase is change-type specific — use the impact map (§3a) to identify which steps apply to your change.

---

### PHASE 0 — Change Assessment

Before any research or file editing, answer these questions:

- [ ] What type of change is this? (match to §3a — types 1–11)
- [ ] Which files will be touched? (list them)
- [ ] Which tabs need verification? (list them from the impact map)
- [ ] Does this involve a new conference? (scope expands — CONF_SECTIONS + conferences.json + conf-prestige.json all need entries)
- [ ] Does this affect fitOlivier or lensScores? (cascade required)
- [ ] What is the rollback plan? (`git revert HEAD` or restore from `Code\Archive\[version] Stable`)

---

### PHASE 1 — Research & Data Gathering

**Output: a scratch doc with every data point confirmed. Phase 3 is pure transcription — no research during data entry.**

Use §15 (Research Intelligence) to select the correct tool and source tier for every lookup.

#### For ADD SCHOOL — complete all sections 1A through 1J:

**1A — Strategic Gate (do first — before investing research time)**
- [ ] Confirm active men's soccer program exists — Claude for Chrome → official athletics site (Tier 1)
- [ ] Confirm school not already in guide — use this exact command (grep misses compound IDs like "tyler_jc"):
  ```bash
  python -c "import json; [print(s.get('id'), s.get('name')) for f in ['data/acc.json','data/big-ten.json','data/big-east.json','data/aac.json','data/big-west.json','data/caa.json','data/d1-other.json','data/juco.json','data/ivy.json','data/d2.json'] for s in json.load(open(f))]" | grep -i "SCHOOL_NAME"
  ```
  Replace SCHOOL_NAME with the short name (e.g. "tyler", "daytona"). If a match is found, this is a DATA UPDATE session, not an Add School session — stop here and re-identify the change type.
- [ ] Rough fit: division, approx cost, climate, city — if clearly out of range on 3+ factors, decide listed vs. full vs. defer

**1B — Identity & Structure**
- [ ] Full official name (for `full`)
- [ ] Short display name (for `name` — shown on card)
- [ ] City, State (for `loc`)
- [ ] Region: east / west / south / midwest
- [ ] Division: D1 / IVY / D2 / NAIA / D3 / JUCO
- [ ] Actual conference name
- [ ] `confKey` — open app.js, check CONF_SECTIONS. Does an entry exist for this div + conference? If not, flag as additional scope.
- [ ] Athletics URL (men's soccer page) — for `url`
- [ ] University homepage URL — for `SITE_URLS`
- [ ] Athletics domain (for favicon) — use the domain of the ATHLETICS SITE, not the main university domain. JUCOs often have a separate athletics site (e.g. apacheathletics.com for TJC, not tjc.edu). Verify by loading the favicon: `https://[domain]/favicon.ico`
- [ ] `mapX` / `mapY` — **do not use the lat/lon linear formula below to finalize these; verify against the actual map instead.** The formula is a rough starting guess only: `js/dashboard.js`'s `drawMapBase()` renders the Dashboard map as a hand-drawn, heavily simplified SVG polygon (not a real geographic projection), so a mathematically-correct lat/lon conversion routinely lands schools in the "ocean" — confirmed live in the v39.5 session for 6 of 17 new schools (all Gulf Coast TX/LA and outer Long Island NY) plus one pre-existing school (Arizona Western) that had never been caught. **Correct method:** load the Dashboard tab in a browser preview, get `document.getElementById('dash-map-svg').querySelectorAll('path')`, and test candidate coordinates with `path.isPointInFill(new DOMPoint(x,y))` — iterate until true, keeping the point directionally sensible relative to known-good nearby schools (same state/region). Never just check `0 ≤ x ≤ 640 && 0 ≤ y ≤ 390` — that only confirms the point is within the SVG viewBox, not on the drawn landmass. Rough formula for an initial guess only: mapX = (lon+124.5)/(124.5-67)×640, mapY = (49.5-lat)/(49.5-25)×390.
- [ ] Undergraduate enrollment (for `size`)

**1C — Academic**
- [ ] Exact degree program name — Claude for Chrome → academic catalog (not marketing page)
- [ ] Course list for that degree
- [ ] Go through all 16 ACU units one by one — covered / not covered:
  `ANAT100, EXSC222, BIOL125, EXSC225, EXSC322, EXSC394, EXSC224, EXSC321, EXSC204, EXSC216, EXSC199, EXSC296, EXSC187, EXSC230, EXSC122, EXSC398`
- [ ] Count `covered:true` → this is `acuAlign`
- [ ] Pre-PT quality: Excellent / Very Strong / Good / Solid / Transfer Pathway
- [ ] GPA admission minimum — Claude for Chrome → official admissions page (Tier 1)
- [ ] GPA scholarship minimum
- [ ] `gpa.status`: eligible (≥2.8) / borderline (2.5–2.79) / below (<2.5) vs Olivier's 2.8

**1D — Cost**
- [ ] Annual tuition — Claude for Chrome → official cost-of-attendance page (Tier 1 only)
- [ ] Annual room & board
- [ ] Annual fees
- [ ] Total COA = tuition + room/board + fees → this is `costNum`
- [ ] Max athletic scholarship to internationals (as % of COA)
- [ ] Max academic/merit scholarship to internationals (dollar amount)
- [ ] Aid type: athletic / merit / both
- [ ] International aid narrative — realistic framing (25–50% athletic for D1), not marketing copy

**1E — Soccer Program**
- [ ] Soccer level description (free text for `soccerLevel`)
- [ ] confRecord: last 5–6 years standings — Claude for Chrome → official conference website (Tier 1). For NJCAA: navigate to njcaaregion[N].com/sports/msoc/[YEAR]/standings. Never use placeholder text like "NJCAA DI play" — actual position and record are required.
- [ ] Conference titles and notable finishes (for `titles[]`)
- [ ] MLS picks last 5 years — Claude for Chrome → official MLS SuperDraft records (Tier 1). Check the actual archive — do not infer `mlsPicks5yr` from general search absence.
- [ ] Notable alumni and draft history
- [ ] **JUCO only, before writing generic "neutral, not measured" text (§5b, added v44.67):** cross-check the school's exact name against a national D1 transfer tracker (discovery only, Rule 0), Tier-1-verify any hit on the destination school's own roster, fold a confirmed name into `notable[]`/`draftRank` — even when `nextLevel.perYear` correctly stays neutral.
- [ ] Pro pipeline narrative

**1F — Coach (all from official athletics staff page — Tier 1 only, never guess)**
- [ ] Head coach name (confirmed on official staff page)
- [ ] Title
- [ ] Email (confirmed on official site) — if no email listed, set `null` and use assistant contact. Never guess (e.g. "coach@domain.com" format)
- [ ] Phone (confirmed on official site) — verify the number belongs to THIS coach, not an assistant. Staff directory tables often list assistant contact next to head coach name.
- [ ] Years as head coach at this school
- [ ] Career record
- [ ] Coaching licence — check official bio first, then LinkedIn (Tier 2 for licence only)
- [ ] Australian connection: Y / N
- [ ] MLS players developed
- [ ] Bio narrative (for `profile` in school JSON and `bio` in coaches.json)
- [ ] Strengths (3–4 bullet points for coaches.json)
- [ ] Assistant coaches / staff

**1G — Roster (for minutesOutlook)**
- [ ] Use Claude for Chrome MCP → official roster page (see §15 for layout patterns)
- [ ] Total midfielder count
- [ ] Graduating midfielders (seniors / grad students clearing before Olivier's `targetDeparture` in athletes/olivier.json — currently August 2027)
- [ ] Transfer portal departures (if known)
- [ ] Entry competition level: Low / Moderate / High
- [ ] Sufficient data to set `available:true`? If not, document why → `available:false`
- [ ] If `available:true`: draft Yr1–Yr4 trajectory using Opportunity Score table in §14
- [ ] **Recruiting pathway (informational, added v34 — no scoring cascade):** from the same roster pull, classify how current midfield spots were actually filled — count true freshmen (no prior college) vs. transfers (4-year or JUCO). Note whether any true-freshman internationals who made the roster shared a pro-academy/club pedigree. Set `recruit_pathway` enum + `recruit_pathway_note` (see §5). This is separate from academic `gpa`/`internationalNote` fields — a school can be academically accessible and still have very limited true-freshman playing-time entry.

**1H — Facilities & Culture**
- [ ] Stadium name and capacity — Claude for Chrome → official athletics site (Tier 1)
- [ ] Training fields (dedicated? shared? turf or grass?)
- [ ] Strength & conditioning facility
- [ ] Sports science / sports medicine resources
- [ ] Academic labs relevant to BESS / pre-PT
- [ ] Facility rating: Elite / Excellent / Very Good / Good / Solid
- [ ] **On-campus housing: available / limited / none — Claude for Chrome → official housing/residence-life page (Tier 1). REQUIRED — feeds the Fit Score housing penalty (v41.0: −6 none / −3 limited) and validate_consistency.js fails a full profile without it. "limited" = housing exists but unguaranteed (first-come-first-served / waitlisted).**
- [ ] Campus setting: urban / suburban / rural
- [ ] Warm climate? Y/N (Florida, California, Southwest, Texas, Southeast)
- [ ] City campus? Y/N (major city, walkable urban)
- [ ] Things to do, social scene, Olivier lifestyle match (★ to ★★★★★)

**1I — Social Media (verify on the actual account — never guess handles)**
- [ ] Claude for Chrome → navigate directly to the account, confirm it's active
- [ ] Instagram URL (or null)
- [ ] Twitter/X URL (or null)
- [ ] Facebook URL (or null)
- [ ] YouTube URL (or null)

**1J — Pre-Calculate All Scores (before opening any file)**
Using scores.js logic — read scores.js if unsure of the formula. **v37.1: fitOlivier no longer includes GPA, Cost, or ACU Alignment** — those are still required fields (gpa.status, acuAlign, fin.costNum) because their own tabs/toggles need them, they just don't feed the Fit Score calculation below.
- [ ] `devScores`: tactical, technical, fitness (each 0–100) — manually researched, not formula-derived
- [ ] `soccerQualityScore`: `(devAvg/100 × 0.6) + (min(1, mlsPicks5yr/10) × 0.3) + (divStrength × 0.1)` — devAvg is the mean of the 3 devScores; divStrength from `DIV_STRENGTH` in scores.js: D1=1.0, IVY=0.9, D2=0.8, NAIA=0.65, D3=0.5, JUCO=0.6 (note: different from the retired `soccerLevelMap`, which had JUCO=0.75 — don't mix them up)
- [ ] `minutesScore`: 0.5 if available:false; else `(Yr1%×0.6) + (Yr2%×0.4)`
- [ ] `cityScore`: city=true → 1.0, false → 0.3
- [ ] `climateScore`: warm=true → 1.0, false → 0.2
- [ ] **`fitOlivier`** = `soccerQualityScore×40 + minutesScore×35 + climateScore×15 + cityScore×10`, rounded to integer, **then minus the housing penalty (v41.0): −6 if housing.available===false, −3 if "limited"**. Same formula for JUCO and non-JUCO.
- [ ] `lensScores` — calculate each using these formulas:
  - `soccer`:    same as `soccerQualityScore` above × 100 (kept as data even though the standalone "Soccer-First" Lens UI was retired in v37.1)
  - `academic`:  (acuAlign/16 × 0.85) + 0.15 → ×100
  - `minutes`:   minutesScore × 100 (same minutesScore used in fitOlivier)
  - `lifestyle`: (warm × 50) + (city × 50)
  - `value`:     (fitOlivier × 0.6) + (affordabilityScore × 0.4) → ×100 (affordabilityScore = 1 − costRatio, costRatio = costNum÷budgetUSD, capped at 1.0 — cost still factors into the Value lens, just not into fitOlivier itself)
  - `overall`:   same integer as fitOlivier

Still required (for their own tabs, not for fitOlivier): `gpa.status` (eligible/borderline/below, via `dynamicGpaStatus()` in app.js — GPA toggle/Compare tab), `acuAlign` + `acuUnits[]` (ACU Alignment tab), `fin.costNum` etc. (Financial Model tab, and the `value` lens above).

#### For REMOVE SCHOOL:
- [ ] Confirm the school's `id` exactly as it appears in the conf JSON
- [ ] Check `athletes/olivier.json` shortlist[] and outreach[] for this id
- [ ] Check `data/pipeline.json` for any entries referencing this school
- [ ] Note current coach rank so you know how many coaches need re-ranking after removal

#### For UX / JS CHANGE:
- [ ] Name the exact function(s) to be modified
- [ ] Read those functions in full — note all callers and all tabs they affect
- [ ] Determine test scope: full / targeted / smoke (see §3a Change Type 11)

#### For DATA UPDATE (coach, cost, minutes, etc.):
- [ ] Identify change type from §3a (types 2–9)
- [ ] List the cascade steps for that change type
- [ ] Gather the new data values at Tier 1 sources (see §15)

#### Scope discipline during research:
If you discover incorrect data about a school NOT being worked on this session, add it to the deferred items list in §6. Do not fix it in this session. Fixing unplanned data expands scope, creates untested changes, and risks breaking the session's commit integrity.

---

### PHASE 2 — Impact Map Sign-off

Before touching any file:

- [ ] State out loud which change type(s) from §3a apply
- [ ] List every file that will be modified
- [ ] List every tab that will be verified
- [ ] Confirm rollback plan

Do not proceed until this is written out explicitly.

---

### PHASE 3 — Make the Changes

**Read each file in full before editing it. No exceptions.**

#### For ADD SCHOOL:

**3A — Conference JSON**

File map: acc / big-ten / big-east / aac / big-west / caa / other

*Identity:*
- [ ] `id` — unique across ALL conf files; underscore not hyphen for multi-word
- [ ] `name`, `full`, `loc`, `region`, `div`, `conf`, `confKey`
- [ ] `warm`, `city`, `top` booleans verified against actual location
- [ ] `color[]` — [light bg, dark accent] matching school colours
- [ ] `tags[]` — warm / city / soccer / acad as applicable
- [ ] `url` — men's soccer athletics page
- [ ] `domain` — athletics subdomain for favicon
- [ ] `mapX`, `mapY` — from Phase 1 calculation
- [ ] `profileDepth` — "full" or "listed"
- [ ] `juco2yr: true` if JUCO — and if JUCO, also research `jucoTier` ("Elite"/"Standard") + `jucoTierNote`, `njcaaRegion` + `njcaaRegionArea` (skip if not NJCAA-affiliated, e.g. CCCAA schools), and `facilityDetails.housing` (see §5 field gotchas for all three — added v37.4/v37.5/v37.7)

*Academic & Cost:*
- [ ] `degreeTitle`, `soccerLevel`, `size`, `prePT`
- [ ] `acuAlign` integer — verified count of covered:true
- [ ] `acuAlignNote` — names the actual degree, references specific courses; not generic
- [ ] `acuUnits[]` — exactly 16 entries in order; covered:true count equals acuAlign
- [ ] `gpa{}` — minEntry, minSchol, note, status
- [ ] `cost` display string, `aid` display string
- [ ] `fin{}` — costNum, tuition, roomBoard, fees, maxAthletic, maxAcademic, aidType, internationalNote

*Soccer Program:*
- [ ] `confRecord[]` — 5–6 years, pos short enough for a chip
- [ ] `titles[]`
- [ ] `proPlayers{}` — mlsPicks5yr, notable[], draftRank
- [ ] If mlsPicks5yr > 0 or titles exist → pipeline.json needs updating (3F below)

*Coach (in school object):*
- [ ] `coach{}` — name, title, email, phone, profile all populated (not placeholder)

*Scores — transcribe from Phase 1 worksheet:*
- [ ] `devScores{}` — exactly 3 keys: tactical, technical, fitness; `null` if listed
- [ ] `fitOlivier` — from Phase 1 calculation
- [ ] `lensScores{}` — exactly 6 keys: overall, soccer, academic, minutes, lifestyle, value (full only)
- [ ] `minutesOutlook{}` — available:true with trajectory, or available:false; never omit
- [ ] If available:true → confirm lensScores.minutes and fitOlivier reflect the trajectory data

*All profiles:*
- [ ] `facilities[]` — 3-item brief array for card display (e.g. "Stadium name — 3,000 capacity", "Dedicated training pitch", "Pre-PT lab access"). Required for both listed and full-profile.

*Full-Profile Only:*
- [ ] `rec` — school-specific Overall Fit paragraph; not generic boilerplate
- [ ] `facilityDetails{}` — rating + all 8 sub-fields (stadium, trainingFields, strengthConditioning, sportsScience, sportsMed, academicLabs, extras, note)
- [ ] `culture{}` — vibe, thingsToDo, socialScene, olivierMatch (★ rating + sentence), lifestyleTags
- [ ] `courses[]` — populate if available

- [ ] `python -m json.tool data/[conf].json` — must pass before continuing

**3B — pipeline.json (if applicable)**
- [ ] If school has NCAA titles → add to ncaaD1[] or ncaaD2[]
- [ ] If school has MLS picks → add to mlsDraft[]
- [ ] `python -m json.tool data/pipeline.json`

**3C — app.js**

Read app.js in full. Run `node --check js/app.js` immediately after editing — do not wait for Phase 4.

- [ ] `DOMAINS` — `schoolId: 'athletics-domain.com'` — athletics subdomain, not main university domain
- [ ] `SITE_URLS` — `schoolId: 'https://www.university.edu'` — university homepage
- [ ] `SOCIAL` — `schoolId: [instagram, twitter, facebook, youtube]` — 4 elements, null if unverified; never guess
- [ ] `CONF_SECTIONS` — confirm entry exists for this school's confKey + div
  - New conference → add entry with key, divFilter, label, tier, intro
  - D3 and JUCO: separate entries with divFilter:'D3' and divFilter:'JUCO'
- [ ] `node --check js/app.js` — run now

**3D — coaches.json**

Read coaches.json in full before editing.

- [ ] Add coach entry — all required fields (§5 schema)
- [ ] `schoolId` matches the school's `id` exactly
- [ ] `rankClass` — HYPHENS: rk-elite / rk-strong / rk-solid
- [ ] `licence` — confirmed level or null
- [ ] `ausConnection` bool set correctly
- [ ] `contact.email` and `contact.phone` match `coach{}` in conf JSON exactly
- [ ] `staff[]` present (can be empty array)
- [ ] NJCAA schools — use NJCAA-appropriate language in strengths
- [ ] Re-rank ALL coaches by overallScore descending — no gaps in sequential numbering
- [ ] `python -m json.tool data/coaches.json`

**3E — conferences.json**

Read conferences.json in full before editing.

- [ ] Conference card exists for this conference
- [ ] School added to `guideSchools[]` — use display name (e.g. "Mercyhurst"), NOT school JSON id
- [ ] School removed from `otherSchools[]` if previously listed
- [ ] `desc` updated — new school count and highlights; verify text is actually new
- [ ] `olivierNote` updated — update the literal school count number and add school callout
- [ ] `tier` exactly matches renderer bucket keys
- [ ] **A NEW conference entry needs `maxAid`** (added v44.50) — short display token, ≤12 chars, for the card's Max Aid tile. Do NOT expect it to be derived from `scholarships`; the MAXAID check fails a conference without it.
- [ ] `python -m json.tool data/conferences.json`

**3F — conf-prestige.json**

Read conf-prestige.json in full before editing.

- [ ] Entry exists for this conference
- [ ] `div` and `divBadge` correct
- [ ] `programsInGuide` — comma-separated string updated to include new school name
- [ ] `relevance` — updated if new school is notable enough to call out
- [ ] `python -m json.tool data/conf-prestige.json`

---

#### For REMOVE SCHOOL:

- [ ] Read conf JSON → remove school object entirely
- [ ] `python -m json.tool data/[conf].json`
- [ ] Read coaches.json → remove coach entry → re-rank ALL remaining coaches
- [ ] `python -m json.tool data/coaches.json`
- [ ] Read app.js → remove from DOMAINS, SITE_URLS, SOCIAL → `node --check js/app.js`
- [ ] Read conferences.json → remove from guideSchools[] → update desc and olivierNote counts
- [ ] `python -m json.tool data/conferences.json`
- [ ] Read conf-prestige.json → remove from programsInGuide string → update relevance if needed
- [ ] `python -m json.tool data/conf-prestige.json`
- [ ] Read pipeline.json → remove any entries for this school (if applicable) → `python -m json.tool data/pipeline.json`
- [ ] Read athletes/olivier.json → remove from shortlist[] and outreach[] if present → `python -m json.tool athletes/olivier.json`

---

#### For UX / JS CHANGE:

- [ ] Read the target function(s) in full
- [ ] Make the change
- [ ] `node --check js/[file].js` immediately after every edit
- [ ] If touching scores.js: re-verify scoreWeights cascade and recalculateAllScores() writeback

---

### PHASE 4 — Validate All Files

Run in this exact order — all must pass before proceeding to Phase 5:

```bash
python validate_schools.py
```
Catches: duplicate school IDs, acuAlign vs covered:true mismatch, wrong lens/dev keys, ptPath remnants, rankClass underscores, duplicate coach ranks, schoolId mismatches, missing required fields, bad facilityDetails rating, empty trajectory when available:true.

```bash
node validate_consistency.js
```
Catches what validate_schools.py doesn't: stored fitOlivier vs live scores.js formula drift, conferences.json tier strings vs renderer buckets, coach name sync (conf JSON vs coaches.json), recruit_risk / gpa.status enum drift, missing kinRank / juco2yr, DOMAINS / SITE_URLS / SOCIAL coverage, fin component sums, confKey vs CONF_SECTIONS, shortlist/outreach orphans, map coords, and (since v40.2) exact minutesOutlook/trajectory key names (MO-KEYS — the "right shape, wrong key name" class behind the v39.7 `yr`/`year` and v40.1 `mf_total_2026` bugs, which render as literal 'undefined' and which no other check sees).

**PROSE (added v44.44) — the only check here that reads UI COPY rather than JSON.** Every other check reads data; the Explore section intros and the Minutes Outlook key are string literals in `js/app.js`, so a data change could contradict them forever with nothing to catch it. Four sub-checks, all negative-tested (each was made to fire before being trusted):
1. **Section program counts** — a `CONF_SECTIONS` intro claiming "N programs" is compared against the real count for that `confKey`. Count by confKey, not by file: Akron makes the Big East section 12, and Army/Navy leaving for Patriot makes the AAC section 8.
2. **Roster claims** — any `"N of M MFs"` in copy must match a real school's `mf_total`/`cleared_before_2027`. This is the exact UCA failure: the ASUN intro claimed 6 of 9 clearing after a refresh made it 0 of 9.
3. **Scrape-season class years** — flags `"2025 Jr"`-style phrasing and `"based on 20XX rosters"`. Such copy **inverts** when a school moves to a newer roster (a 2026-27 junior is a 2027 senior, not cleared). Write against the normalised 2027 buckets instead. `"2027 seniors"` is fine — that IS the bucket.
4. **Phantom school anchors** — a small explicit list of names that appear in copy but field no team in this guide (`USC`, `UF`). Deliberately a denylist rather than fuzzy name-matching, because clubs, cities, hospitals and conferences all legitimately appear in these strings. **Add to `PHANTOM_SCHOOLS` whenever a new one is found.**

Whole-line `//` comments are stripped before scanning, so a comment that quotes a past copy bug (there is one in `renderMinutesOutlook`) does not re-trip sub-check 3.

**A copy rule PROSE cannot enforce, so hold it by hand: lens and ranking copy must describe what the lens *rewards*, never name the school that currently wins it.** The Glossary claimed *"Barry D2 consistently ranks #1 under this lens"* — Barry's minutes score is 59 and `iowa_western` leads at 79, so it was never true (fixed v44.47). Any named #1 is one refresh away from being wrong, and the schools atop the Minutes lens are exactly the ones a roster campaign re-scrapes. The same rewrite deliberately dropped an accurate *"7 of 13 midfielders"* figure for the same reason. **PROSE covers counts, roster claims, scrape-season phrasing and phantom schools — it cannot see a wrong city, a wrong superlative, or a claim that is merely stale.**

**SCORES-SRC / FIT (rebuilt v44.51) — the validator now calls the REAL `scores.js`, and there is no local copy of the formula.** Until v44.51 this file *reimplemented* `calculateFitScore()` and five helpers (`soccerQualityScore`, `minutesOutlookScore`, `nextLevelFactor`, `housingPenalty`, `fundingPenalty`) plus `DIV_STRENGTH` and the §5b constants. **That made the FIT check structurally incapable of its own job**: change a formula in `js/scores.js`, miss the copy, and the validator compared all 111 stored scores against its own stale mirror and reported `Issues: 0` while every ranking was wrong. **Proven, not theorised** — with `housingPenalty` changed 6→10 in `scores.js`, the old validator reported `Issues: 0` and the new one reported 10 drifted schools. `js/scores.js` is loaded in a `vm` sandbox (it is a plain browser script — **do NOT add `module.exports` to it just to satisfy the validator**, §4 forbids the build-step creep); this is safe because every scoring function in it is pure and its one DOM-touching function, `recalculateAllScores()`, is a declaration that is never called. **The loader THROWS rather than falling back** — a silent fallback to a local mirror is the exact bug removed. If a scoring function is renamed, update the `wanted` list in the same commit. **Never reintroduce a second copy of a scoring formula anywhere.**

**MAXAID (added v44.50) — a displayed figure must never be parsed out of prose.** The Conferences card's "Max Aid" tile used to be derived from `conferences.json`'s `scholarships` sentence via `.split('Up to')[1]?.trim().split(' ')[0]`, which rendered a *word* for 10 of 25 conferences and — worse — meant **any copy edit to `scholarships` could silently change a displayed number** (v44.49 appended a House-settlement qualifier to 14 of those strings and had to measure the parse before and after to prove it hadn't). The tile now reads a stored `maxAid` token. Two halves, and the second is the durable one: the data check (present, string, ≤12 chars) plus a **grep of `js/app.js` that fails if `scholarships.split(` reappears** — without it the check would pass happily while the renderer regressed, the same blindness the CHIPS check needed its code-shape guard for. All five branches negative-tested.

**CHIPS (added v44.45) — every school must land in a conference filter chip.** The Explore conference row is built from each school's `conf` string via `resolveConfGroup()`, and it had two silent failure modes, both found by the owner eyeballing the row rather than by any check: an **unmapped conference** produced a key no chip rendered (six schools unfilterable, row summing to 105 of 111), and a **substring alias collision** mis-filed a school into the *wrong* chip (`"sun conference"` matches inside `"asun conference"`, putting D1 UCA in the NAIA Sun Conference chip — both counts wrong, and the row still added up so nothing looked broken). The check asserts every school resolves to a labelled key, that the key is in `CONF_CHIP_ORDER`, that the chips sum to the school count, and that **no chip mixes divisions** (the outward symptom of a collision). It also greps `resolveConfGroup()`'s body and fails if the bare `.includes()` form returns — necessary because the check reimplements the intended matching and is otherwise blind to the resolver itself regressing. **v36 backlog cleared July 2026: 174 → 1 issue** (see §6 and CHANGELOG.md's v36 entry). The 1 remaining line (Stony Brook coach name) is a genuine data gap, not a bug — the count must never increase from a session's changes.

```bash
python -m json.tool data/[conf].json
python -m json.tool data/coaches.json
python -m json.tool data/conferences.json
python -m json.tool data/conf-prestige.json
python -m json.tool data/pipeline.json     # only if edited
node --check js/app.js                     # only if edited
node --check js/scores.js                  # only if edited
node --check js/dashboard.js               # only if edited
```

**Do not proceed to Phase 5 if any validation fails.**

---

### PHASE 5 — Local Browser Test

**Mandatory before every commit. No exceptions. This is the test environment — not the live site.**

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` (or the serve port).

**Determine test scope from Phase 0:**

| Scope | When |
|---|---|
| **Full** — all tabs | Add School, Remove School, scores.js change, scoreWeights change |
| **Targeted** — affected tabs + smoke test others | Single tab UX change, data update to one school |
| **Smoke** — page loads, no console errors, spot check | Cosmetic text change, coach name only |

#### Full Test Checklist:

*New / changed school:*
- [ ] Card visible in correct conference section in Explore
- [ ] Details button opens modal — missing = wrong `confKey`
- [ ] All 9 modal tabs populate without errors (full only)
- [ ] Dev Score: 3 bars — Tactical, Technical, Fitness — no PT Pathway bar
- [ ] Fit score is non-zero and matches Phase 1 calculation
- [ ] Fit score does NOT change when the ATAR slider moves (v37.1: GPA isn't in the formula — this is intentional, not a bug)
- [ ] Fit score re-sorts correctly on the "Best Fit" sort pill
- [ ] Map dot on correct US state — Dashboard tab
- [ ] Coach in Rankings with correct badge colour (rk-solid = emerald)
- [ ] All coaches numbered sequentially — no duplicate ranks
- [ ] Conference card visible, school chip present, count matches updated desc/olivierNote
- [ ] Minutes Outlook tab — card present (even if available:false)
- [ ] ACU Alignment tab — row present (non-JUCO full-profile only)
- [ ] Financial Model — school in selector, appears in comparison bars
- [ ] Compare tab — school selectable
- [ ] Coaches → Profiles tab — bio, staff, contact render correctly
- [ ] Coaches → Outreach tab — contact details correct
- [ ] All 6 lens pills apply badges correctly to the new school
- [ ] Score breakdown tooltip — open modal, click score, verify factor weights and contributions are correct
- [ ] Sort position — school appears in reasonable rank position in Best Fit sort

*Regression — existing schools not touched:*
- [ ] Pick one existing school from the same conf file — open its modal, verify it still loads
- [ ] Total card count in Explore = expected number (previous ± 1)
- [ ] F12 console — zero red errors across all tabs

**Only after all applicable items pass: proceed to Phase 6.**

---

### PHASE 6 — Commit & Deploy

```bash
git diff                              # Final review — confirm only intended files changed
git add data/[conf].json              # Stage specific files by name — never git add .
git add data/coaches.json
git add data/conferences.json
git add data/conf-prestige.json
git add data/pipeline.json            # only if edited
git add js/app.js                     # only if edited
git add athletes/olivier.json         # only if shortlist/outreach/guideVersion changed
git commit -m "vXX.X — [description]"
git push
```

Commit message format: `vXX.X — [what changed] ([scope])`
Examples:
- `v27.1 — Add Tyler Junior College (JUCO, NJCAA DI)`
- `v27.2 — Remove Wichita State (no men's soccer program confirmed)`
- `v27.3 — Populate minutesOutlook for 8 Big Ten schools`

Wait ~30 seconds for GitHub Pages deploy before proceeding to Phase 7.

---

### PHASE 7 — Post-Deploy Verification

Hard reload the live site (Ctrl+Shift+R): `https://bustachat.github.io/olivier-guide`

Repeat the Phase 5 checklist on the live site. Additionally verify:

- [ ] Favicon loads in modal header (depends on domain being live)
- [ ] Social links open correct verified accounts
- [ ] "Visit Site" link opens correct university homepage
- [ ] No console errors that weren't present locally

**If any item fails:**
1. Check incognito tab first — may be cache
2. If confirmed bug: assess data error (fix → re-deploy) vs display issue
3. Rollback if needed:
```bash
git revert HEAD          # creates a new commit undoing the last
git push
```
Or restore from `Code\Archive\[version] Stable` if revert doesn't resolve.

---

### PHASE 8 — End of Session Protocol

**Mandatory at the end of every session regardless of change type. This is how the workflow stays accurate.**

- [ ] `git log --oneline -5` — confirm what was committed matches what was intended
- [ ] Update **CHANGELOG.md** — what completed, what is deferred, what was discovered (version history lives there, NOT in this file — moved out in v35.2 to cut per-session context cost)
- [ ] Update the §6 state snapshot / known-issues list in this file ONLY if the state actually changed (school count, backlog items fixed)
- [ ] Update deferred items list — remove resolved items, add newly discovered items
- [ ] Update §3a if a new failure mode or change pattern was discovered this session
- [ ] Update §7 if a workflow gap was found and fixed this session
- [ ] Update §15 (Research Intelligence) if a new site layout or source rule was discovered
- [ ] Update memory files — session learnings, new failure modes, feedback
- [ ] Bump `guideVersion` in `athletes/olivier.json` if a new version shipped this session
- [ ] Produce a one-paragraph handover note: what changed, which files, what's outstanding
- [ ] Commit all CLAUDE.md updates made this session:
```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "vXX — docs: end of session update ([summary of what changed])"
git push
```

**The workflow is a living document. Every session that discovers a gap and does not update and commit the document guarantees that gap will be repeated.**

---

## 8. CODE Rules

**DO:**
- Read the actual file before editing it — every time, no exceptions
- Validate JSON after every edit: `python -m json.tool [file].json`
- Run `python validate_schools.py` before every commit
- Check JS syntax before committing: `node --check js/[file].js`
- Run `node --check` immediately after every JS edit — not at the end
- Wrap new render functions in try/catch so a single failure cannot cascade
- Keep onclick handlers consistent — same function names across cards and dashboard
- After adding any coach: re-rank ALL coaches in coaches.json
- After removing any coach: re-rank ALL remaining coaches in coaches.json
- Keep `{ cache: 'no-store' }` on every `fetch()` call in `fetchWithRetry()` (app.js) and the dashboard.js olivier.json fetch — v37.3 fix for a live bug where Chrome served stale JSON after a schema change even through a hard reload (see §6)

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
- Update the `cost` display string in school JSON — cost display is dynamic from `costNum` since v32. Update `costNum` (and `tuition`/`roomBoard`/`fees`) instead.
- Use `rankClass` with underscores — always hyphens: `rk-elite`, `rk-strong`, `rk-solid`
- Add `ptPath` to devScores — removed in v22
- Add `pt` to lensScores — removed in v22
- Make sort pills and lens pills reset each other — they are independent controls
- Fold GPA, Cost, or ACU Alignment back into fitOlivier — v37.1 deliberately removed them (they have dedicated views); if this is ever revisited, it needs explicit owner sign-off, not a quiet reintroduction
- Use aggregator sites (Niche, CollegeData, 247Sports, RosterResource) as data sources — see §15
- **Write internal process/methodology language into any field the app actually renders.** Found live v44.89 by the owner, in the Minutes Outlook tab: `trajectoryNote` and `recruit_pathway_note` (`js/app.js:3692-3693`, `2443-2444`) render verbatim to every visitor, and 15 entries across `data/juco.json`/`data/caa.json`/`data/big-west.json`/`data/d2.json` contained things like "⚠ MIXED VINTAGE... §14's Opportunity Score table cannot reproduce any stored JUCO trajectory... pending the JUCO calibration item in CLAUDE.md §6E" and "`NEXT_LEVEL_NEUTRAL`"/"`D1_RATE_DIVISOR`" (internal code constants) — this is a scholarship guide read by a real athlete, parents, and coaches; none of them should see a CLAUDE.md section number, a backtick-quoted field name, or a code constant. **Before saving any `*Note`/`*_note` field, know whether the renderer touches it — grep the exact field name in `js/app.js`/`js/dashboard.js` first, don't assume.** Two fields in this schema are genuinely internal-only and safe for citation-style language (`§5a`/`§5b`/Tier-1 sourcing shorthand): `devScoresNote` and `coaches.json`'s `overallScoreNote` — neither has a render call anywhere (confirmed by grep, not by the schema doc, which doesn't say so explicitly). Every other note-shaped field ships to the page: `trajectoryNote`, `recruit_pathway_note`, `fin.internationalNote`, `proPlayers.nextLevel.note`, `facilityDetails.note`/`housing.note`, `confRecord[].note`, `acuAlignNote`, `jucoTierNote`, `rec`, coach `bio`, `conferences.json`'s `desc`/`olivierNote`. Write those in plain language a parent or coach would read on a recruiting site — real findings and caveats are fine and expected ("this projection is based on last year's roster and hasn't been updated yet"), internal accounting is not ("§14's table cannot reproduce this, so re-deriving would be a fabricated number").

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

All six built and tested against real repo data v45.04 (2026-08-19) — see that CHANGELOG entry for the real bugs each one's testing surfaced. Each `SKILL.md` sequences the matching Change Type from §3a and points at CLAUDE.md by section rather than repeating it, so these don't go stale the way this section itself did (it named these three as if they already existed for who knows how many versions before anyone checked).

- `.claude/skills/qa-suite/SKILL.md` — bundles Phase 4's validation sequence (validate_schools.py, validate_consistency.js, json.tool/node --check on changed files, conditional negtest.py) into one command
- `.claude/skills/new-school/SKILL.md` — Change Type 1 workflow + a cross-file coverage check (guideSchools/otherSchools, conf-prestige.json, pipeline.json, this file's own School → File Reference Table) that neither validator above covers
- `.claude/skills/add-coach/SKILL.md` — Change Type 2 workflow + a rank-order/score consistency check and a bio-hygiene sweep (stale embedded emails, hardcoded athlete names — the v44.35/v44.28 bug classes)
- `.claude/skills/roster-refresh/SKILL.md` — Change Type 3 workflow. `apply_roster_refresh.py` turned out to be a ~1300-line hardcoded campaign log, not a reusable single-school tool — this skill's calculator imports its formula functions directly rather than re-deriving them, and adds arithmetic, JUCO-trajectory-formula, and internal-jargon checks that don't exist anywhere else. Also captures unexpected roster departures to `roster_moves_queue.json` for the next skill, and (since v45.05) archives the full roster — every position, timestamped — to `data/rosters/` via the patch's optional `full_roster` key; see §5's "Roster Snapshot Archive."
- `.claude/skills/transfer-tracking/SKILL.md` — run after a refresh wave (not per-school): a cross-school duplicate-name scan plus a processor for the departure queue above, feeding §5b's `nextLevelOutput` research
- `.claude/skills/mls-pipeline/SKILL.md` — annual SuperDraft cross-reference against the current roster snapshot and the departure-queue history (kept append-only for exactly this reason)

**A real, unresolved gap all three roster/coach-adjacent skills surfaced:** `coaches.json` has no structured "verified" field anywhere — the word "verified" appears exactly once repo-wide, as free prose inside one `overallScoreNote`. The v44.88 coach spot-check rule (§3a Change Type 3) is real and required, but nothing in the schema can currently prove it happened; today that proof lives only in a session's own commit message. Worth a schema decision (a `verifiedDate` field?) next time this area is touched — not resolved as part of building these skills, deliberately left as a judgment call for the owner (see the `roster-refresh`/`add-coach` skill conversation this was raised in).

---

## 10. COMMIT Protocol

The commit protocol is defined in §7 Phases 4–6 and Phase 8. Follow those phases in order — they supersede this section.

**Quick reference — pre-commit gates (all required):**
1. Phase 0 sign-off written out — change type, files, tabs, rollback plan
2. `python validate_schools.py` — pass
3. `python -m json.tool` on every modified JSON
4. `node --check` on every modified JS
5. Phase 5 local browser test — pass at appropriate scope
6. `git diff` — only intended files staged

**After the final commit of each version, also:**
- Bump `guideVersion` in `athletes/olivier.json`
- Update the version table in `README.md`
- Run Phase 8 (End of Session Protocol) in full — including committing CLAUDE.md

---

## 11. QA Suite

### Global checks — run after every commit
| Check | Pass condition |
|---|---|
| Hard reload (Ctrl+Shift+R) | Page loads. No blank screen. No JS error banner. |
| Console (F12) | Zero red errors. |
| All nav tabs respond | Each tab switches content without JS error |
| School cards render | Cards grid populates. Fit scores show. Degree badges show. |
| Filter chips work | Clicking a conference chip filters correctly |
| ATAR slider | GPA-eligibility toggle/filter updates live; Fit Score does NOT change (v37.1) |
| Sort pills | Best Fit / Lowest Cost / ACU Align / MLS Pipeline all sort within sections |
| Lens pills | All 5 lenses apply badges (Best Overall, Academic-First, Minutes Outlook, Lifestyle-First, Value-First); Best Fit sort respects active lens |
| Lens + Sort combo | Lens badges visible while non-Fit sort is active |
| Modal opens with 9 tabs | Full-profile school: all 9 tabs populated |
| Dashboard map | All dots on landmass. Hover info panel populates. |
| Glossary tab | No PT Pathway entries visible |

### New school QA — run after adding any school
| Check | Pass condition |
|---|---|
| Card visible in Explore | School appears under correct conference section |
| confKey correct | Details button present on card |
| Division correct | Not appearing under wrong division section |
| Conference tab | Conference card visible with school in guideSchools |
| Coach Rankings | New coach visible with correct badge |
| Coach re-ranked | All coaches renumbered sequentially |
| Map dot | Dot on correct US state on Dashboard |
| Fit score | Score is non-zero and matches the Soccer Priority formula (does NOT change with ATAR slider — v37.1) |
| Dev Score (full) | Three bars render: Tactical, Technical, Fitness |
| lensScores (full) | 6 lens values — no 'pt' key |
| Modal tabs (full) | All 9 tabs populate |
| Minutes Outlook tab | Card present |
| ACU Alignment tab | Row present (non-JUCO only) |
| Financial Model | School in selector |

### Remove school QA — run after removing any school
| Check | Pass condition |
|---|---|
| Card gone from Explore | No ghost card, total count is N-1 |
| Map dot gone | Dashboard — dot removed |
| Conference tab | School chip removed, count updated |
| Coach Rankings | Coach removed, all remaining coaches renumbered |
| ACU Alignment | Row gone |
| Minutes Outlook | Card gone |
| Financial Model | School gone from selector |
| Console | Zero errors — no orphaned reference errors |

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

**PT/Chiro as career goal:** Remains in Olivier's profile and coach questions but has been REMOVED from the scoring system in v22. Dev Score now measures soccer development only (tactical/technical/fitness). ACU alignment handles the degree-pathway angle. PT Pathway is not a scoring factor.

---

## 14. College Rosters Folder

The repo contains `College Rosters/` — do not delete or move these files.

### Files
- `College Rosters/roster_report.md` — completed analysis for 19 schools
- `College Rosters/roster_analysis.py` — Python scraper for new schools
- `College Rosters/manual_rosters.json` — hand-entered data for JS-rendered roster pages

For all new roster research, use the Claude for Chrome MCP method documented in §15. Use `roster_analysis.py` for bulk scraping only.

### Opportunity Score → minutesOutlook translation guide
| Opportunity Score | Yr1 pct | Yr2 pct | Yr3 pct | Yr4 pct |
|---|---|---|---|---|
| 12+ | 40–50% | 60–70% | 80% | 90% |
| 8–11 | 25–35% | 45–55% | 70% | 85% |
| 5–7 | 15–25% | 30–40% | 55–65% | 80% |
| 1–4 | 10–15% | 20–30% | 45–55% | 75% |
| 0 or negative | 5–10% | 15% | 35% | 65% |

Labels by Yr pct range: 80%+ = "Captain candidate" | 65–79% = "Established starter" | 50–64% = "Likely starter" | 35–49% = "Squad rotation" | 20–34% = "Bench / development" | <20% = "Development year"

Always set `available: true` when populating and include all 4 trajectory year objects.

**JUCO adjustment (v26) — SUPERSEDED v44.92, kept only as history.** The old rule ("×1.2 multiplier on the 4-year Opportunity Score, then use the same table above") never actually reconciled with any stored JUCO trajectory — every stored JUCO Yr1 (56–72% at the time) sat well above what the 4-year table produces even after the multiplier. This was found and confirmed in Session 4 (2026-08-06): applying it live would have crashed JUCO fit scores across the board (e.g. `lsu_eunice` 64→43, `neosho_county_cc` 44→33), contradicting the guide's own JUCO thesis, so it was reverted and the campaign was deferred pending a real JUCO-specific table. See CLAUDE.md §6E history for the full incident. **Use the table below instead for all JUCO schools.**

### JUCO Opportunity Score → minutesOutlook table (v44.92)

JUCOs get their own formula, not the 4-year table above, for two structural reasons: (1) a JUCO career is 2 years, not 4, so there's no Yr3/Yr4 to project; (2) JUCO access is inherently higher and shaped differently — a "returning" JUCO sophomore is far less entrenched than a 4-year junior/senior (they'll be gone in a year too), so heavy churn isn't required to unlock real opportunity the way it is at a 4-year school.

**Calibration history (2026-08-16):** an attempt to reverse-engineer a formula from the ~77 stored JUCO trajectories found there wasn't one to recover — the data is a mix of at least three undocumented eras (original hand-set v26-era values with no consistent logic, a lazy `[85, 90]` template the NJCAA gap-fill campaign copy-pasted onto ~12 schools regardless of actual roster shape, and a scattering of stale trajectories left behind by facts-only roster refreshes that update the counts but not the projection). Two schools were treated as genuine, uncontaminated anchors: `tyler_jc` (13 of 13 MFs clear, trajectory 68/80) and `murray_state_ok` (4 of 14 clear, 10 returning, trajectory 62/78). Fitting both exactly forced the whole formula into an unusably narrow 57–70% range for all 77 schools, because the two anchors are close together in output despite very different shapes. **Owner ruling: trust `tyler_jc` as the primary anchor (cleaner signal — zero returners, no ambiguity) and let `murray_state_ok`'s specific number drift** — it was very likely a generous one-off, not a rule. The formula below hits Tyler exactly (68%) and produces a genuinely differentiated 41–73% range across all 77 schools when run against their real stored `cleared`/`mf_total` facts.

```
returning     = mf_total − cleared_before_2027
opp_juco      = cleared_before_2027 − 0.6 × max(0, returning − 2)
Yr1 pct       = 32 + 46 / (1 + e^(−(opp_juco − 3) / 7.8))      # logistic curve, floor 32%, ceiling 78%
Yr2 pct       = min(90, Yr1 + 13)
```

Implemented in `apply_roster_refresh.py` as `juco_opportunity_score()` / `juco_yr1()` / `juco_trajectory_for()`. Labels use the same bands as the 4-year table (80%+ Captain candidate, 65–79% Established starter, 50–64% Likely starter, 35–49% Squad rotation, 20–34% Bench/development, <20% Development year). **Only 2 trajectory objects (Yr1, Yr2) — never write a Yr3/Yr4 row for a JUCO**, matching the existing 2-row convention (`trajectory_for(..., juco=True)` already truncates this way).

**All 77 available-JUCO schools were re-derived against this table in one pass (v44.92)** — see CHANGELOG for the full campaign. If a JUCO's `cleared_before_2027`/`mf_total` changes in a future roster refresh, recompute its trajectory from this formula in the same edit — do not hand-pick a new value by feel, that is exactly the failure mode this campaign existed to remove.

---

## 15. Research Intelligence

**Every research task has a required tool and source tier. Using the wrong source produces stale or inaccurate data that ships to the live guide.**

---

### RULE 0 — Claude for Chrome MCP is the tool for ALL research. No exceptions. (owner-directed, v42.9)

**`WebFetch` does not return a web page. It returns a small model's summary of a web page.** That summary infers, compresses, and silently fills gaps — and you cannot see what it dropped. **Never store a fact that came from a WebFetch or WebSearch summary.**

This rule has now been broken twice, with measurable cost:
- **v39:** two JUCO rosters were marked "unavailable" after WebFetch failed on Cloudflare/Sidearm pages. Chrome MCP rendered both on the first attempt.
- **v42.7:** the Indian Hills alumni page was read via WebFetch. It reported "no division headers" (the page has a `Level` column) and a D1 count of 17 (the page prints 24; only **15** are truly D1). The resulting rate was wrong three times over — 1.00, then a "corrected" 0.59, before Chrome MCP gave the real **0.88**.

`WebSearch` remains acceptable for **discovery only** — finding *which URL* to open. The moment a fact is to be recorded, open the page in Chrome MCP (`tabs_context_mcp` → `navigate` → `get_page_text`) and read it. If Chrome MCP `navigate` is blocked for a domain, see the fallback note in the scraping-process memory — but a WebFetch fallback result must be labelled provisional and re-verified before it is committed.

**Corollary — a Tier-1 page can still be wrong.** Indian Hills' own site labels Eastern New Mexico University (NCAA Division II, Lone Star Conference) as "NCAA DI" in ten rows, and inverts the Liberty/ENMU pairing in an eleventh. Tier-1 means *authoritative about itself*, not *correct about third parties*. Verify any claim a page makes about **another** institution.

#### Which tool, when the rules appear to conflict (scoped after Session 4, 2026-08-06)

Three rules in this file and the scraping memory look like they disagree. They do not — they are **scoped to different page types**, and Session 4 broke Rule 0 by applying the wrong one's scope:

| Page type | Tool | Source of the rule |
|---|---|---|
| **Rosters, alumni pages, staff/coach pages** | **Claude for Chrome MCP. Full stop.** | RULE 0 + the Research Intelligence table below |
| **Conference standings archives** | in-app Browser MCP first, `curl` raw HTML only on bot-block | owner refinement, confRecord campaign (2026-07-19) |
| **Discovery — *which* URL to open** | `WebSearch` | RULE 0 |

**The confRecord "curl is acceptable" refinement is about STANDINGS SITES, not rosters. Do not generalise it.** In Session 4 it was generalised to JUCO rosters and then stretched further to a bespoke Python fetcher — which no rule sanctions — costing a detour before the work landed in Chrome anyway.

**"Probe whether the roster is server-rendered before reaching for a browser" (Session 2) is scoped to hosts with NO prior determination.** Where a campaign has already classified a host set (the JUCOs were classified browser-only in v44.29), that classification wins; re-deriving it is re-litigating a settled decision. If you believe the classification is wrong, say so and get it changed — do not quietly test around it.

**⚠️ A 403/202 is a NETWORK verdict, never a DATA verdict.** These hosts CloudFront-block datacenter IPs, so a script and the in-app browser can both fail on a page that renders perfectly in the user's real Chrome — Suffolk did exactly that in Session 4. **A blocked fetch and a genuinely missing field are indistinguishable from a script**, which is precisely how v39 wrote off two JUCO rosters that Chrome then returned on the first attempt. **Never record "field absent" / "roster unavailable" from a non-200.** Prove it in a rendered page, and say in the note which browser proved it and on what date.

---

### Tool Hierarchy

| Task | Primary Tool | Why | Never Use |
|---|---|---|---|
| Roster scraping | Claude for Chrome MCP (`navigate` → `javascript_tool`) | Renders JS-heavy Sidearm sites; reads live data directly | Web search, RosterResource, any aggregator |
| Coach name / email / phone | Claude for Chrome → official athletics staff page | Source of truth; aggregators lag 1–2 seasons | ESPN, 247Sports, team aggregator sites |
| Coaching licence | Claude for Chrome → official bio, then LinkedIn if not found | Official pages vary; LinkedIn often more current | Any other source |
| Tuition / cost data | Claude for Chrome → official school cost-of-attendance page | Only official COA is authoritative | CollegeData, Niche, Peterson's — always 1 year stale |
| Degree / course list | Claude for Chrome → official academic catalog | Marketing pages show highlights; catalog shows full list | School marketing homepage alone |
| GPA requirements | Claude for Chrome → official admissions page | Requirements change year to year | Aggregators |
| Conference standings | Claude for Chrome → official conference website | Source of truth for exact finish positions | Wikipedia, ESPN |
| MLS picks | Claude for Chrome → official MLS SuperDraft results | Authoritative | Any aggregator — often incomplete for recent years |
| Social media handles | Claude for Chrome → navigate to the account directly; confirm it's active | Verify account is real and active | Guessing from school name pattern |
| **Alumni / next-level pages (§5b)** | Claude for Chrome → the program's own alumni page; then verify EACH destination's division independently | Naming varies per school; the page's own division column is unreliable (see Rule 0) | WebFetch summaries, transfer-tracker aggregators |
| **Coach appointment year / record** | Claude for Chrome → the school's own words in a dated article or release | Staff-directory bios blur program history with the coach's tenure; summaries invent an appointment year | WebFetch summary of a staff directory |
| Map coordinates (lat/long) | WebSearch acceptable | Coordinates don't change | — |

---

### Source Quality Tiers

**Tier 1 — Always use. These are the only authoritative sources.**
- Official school athletics page
- Official academic catalog
- Official conference website
- Official MLS/NCAA records
- Official school admissions page
- Official school cost-of-attendance page

**Tier 2 — Use only to find a Tier 1 URL, then verify at the source.**
- Google search results
- Wikipedia
- ESPN
- LinkedIn (for coaching licences only)

**Tier 3 — Never use as a data source. Always 6–18 months stale.**
- Niche, CollegeData, Peterson's
- RosterResource, 247Sports, Rivals
- Any roster aggregator or recruiting site
- Any site that is not the official school or official governing body

If a Tier 1 source is unavailable (DNS error, page not found), document why and mark the field as `null` or deferred — do not substitute a Tier 3 source.

---

### Roster Scraping — Claude for Chrome Method

**Standard workflow:**
```
navigate to official roster page
→ detect layout type (see patterns below)
→ extract with javascript_tool using layout-matched script
→ write extracted data to a Python update script
→ run the script
→ validate JSON
```

Never edit JSON directly from scraped data. Always write a script first, then run it.

If a page fails (DNS error, connection reset): try 2 alternate domains before marking as deferred.

**Known layout patterns (as of June 2026):**

| Layout | Sites | Extraction pattern |
|---|---|---|
| Sidearm Sports table | Most D1 schools | `table tbody tr` → cells[name_link, pos, yr]. Position values vary: "Midfielder", "MF", "M", "CM", "Midfield" |
| Sidearm card (UC Davis style) | UC Davis, similar | Position appears after `Hide/Show Additional Information For NAME` line; year 3 lines before position |
| Sidearm card (CSUF style) | CSUF, similar | Position BEFORE name — "M 6'0\" 165 lbs" then jersey, name, year+hometown |
| Hofstra hybrid | Hofstra | jersey, firstName, lastName, pos, "H'H\" Wlbs Yr. Major", hometown — all separate lines |
| Northeastern style | Northeastern | jersey, name, "Year Highschool Club", "Full Bio", "Hide/Show", "Position H Hometown" — position word = "Midfield", "Defense/Midfield" |
| UC Riverside variant | UC Riverside | Uses "CM" and "F/M" as position codes — expand pos regex to include CM, F/M, D/M |
| **WMT `roster-card-item`** (added v44.37) | virginia, stanford (and the WMT "Official Athletics Website" family generally) | Not Sidearm — no `<table>` and no `.sidearm-roster-player`. Players are `.roster-card-item`; name `.roster-card-item__title`, position `.roster-card-item__position`. Profile fields split into **labelled** (`.roster-player-card-profile-field` with `__label`/`__value` — Hometown, High School, Previous School) and **unlabelled** `.roster-player-card-profile-field__value--basic` (height, weight, **academic year**, club). **The academic year is in the UNLABELLED set** — a labelled-field-only extractor returns every player with a blank class year and silently yields zero graduating MFs. Match the year by regex (`Freshman|Sophomore|Junior|Senior|Graduate|Redshirt …`) across the `--basic` values. Coaches share the same `.roster-card-item` class as players, so filter them out by position text — and note the head coach's position may be a donor-named title (Stanford: "The Knowles Family Director of Men's Soccer"), which `/coach/i` alone will miss. |

| **WMT `roster-list-item`** — "list view" (added v44.40) | northwestern, and the WMT family's list layout generally | Distinct from the `roster-card-item` row above and **much friendlier**: every field has its own semantic class — `.roster-player-list-profile-field--class-level`, `--position`, `--previous-school`, `--hometown` — so no regex-matching of unlabelled values is needed. Players are `.roster-list-item` **and so are coaches**; separate them by testing for a non-empty `--position` field (coaches have none, and carry `.roster-list-item__profile-field--position` instead). Penn State uses a `.player-list-item` variant of the same idea. Titles on this family end in "Official Athletics Website" and **inject the season year client-side**, so a curl'd `<title>` has no year while the rendered one does. |
| **NJCAA region-conference stats site "Lineup" tab** (added v44.95, Batch 5 Sub-batch C) | `region4sports.com` (NJCAA Region 4 — Chicago City Colleges) and likely the other `regionNsports.com` sites | Not a roster page at all by default — the team page (`/sports/msoc/[season]/teams/[team]`) opens on season STATS (record, recent results), with no visible "Roster" link. The actual roster-with-position table lives behind a **"Lineup" tab** in the page's own tab strip; the URL param `?view=lineup` does NOT reliably force it open on first load (a race condition — query the DOM again a moment later, or click the tab). Once loaded, find the table whose `<thead>` contains both `POS` and `YR` headers (the page renders several other stats tables with generic headers first) and extract via `[...row.children]`, not a fixed index — position-code vocabulary is **inconsistent even within Region 4**: Truman/Malcolm X/Kennedy-King/Wilbur Wright use `C`/`MID`/`MF` variously, Daley uses plain `M`. Player-download "SRO" export links on the page (`/players?teamId=...&view=ext`) return an empty body — not a usable data source, don't chase them. |

**Season labels can be ORDINAL, not Fr./So./Jr./Sr. (added v44.39).** Indiana and Washington publish eligibility years as `1st`/`2nd`/`3rd`/`4th`/`5th`. Map `4th`/`5th` → graduating, `3rd` → rising senior, `2nd` → rising junior, `1st` → freshman. **This is a silent-failure class:** a classifier written only for `Fr./So./Jr./Sr.` may match `5th` by accident while dropping every `4th`-year *graduating senior* into "unknown", which understates `cleared` and therefore the whole opportunity score.

**`Fy.` is the Ivy label for a first-year (added v44.46).** Yale publishes `Fy.` / `So.` / `Jr.` / `Sr.` — there is no `Fr.` anywhere on the page. A classifier written for `Fr.` alone drops every first-year into "unknown", which **breaks the `mf_total = cleared + rising_sr + returning` invariant and understates `returning`**, inflating the opportunity score. Third member of this silent-failure family, after ordinal `1st`–`5th` and short headers. Match `\bFY\b|FIRST[\s-]?YEAR` alongside `\bFR\b|FRESH`.

**A class-year regex anchored to the START of the string (`^(Fr|So|Jr|Sr)`) silently misses "Redshirt Sophomore" / "Redshirt Freshman" (found v45.02, Batch 5 close-out).** Fourth member of the same silent-failure family. A redshirt player's class-year cell reads "Redshirt Sophomore," not "So."/"Sophomore," so a `^`-anchored match returns no match at all rather than a wrong one — the player silently drops out of both `cleared` and `returning` counts, understating `mf_total` by however many redshirts are on the roster. Match the class word anywhere in the string (`/So(phomore)?/i` etc.), not just at position 0.

**Check the POSITIONAL BREAKDOWN, not just the squad count, before trusting a fresh roster (added v44.46).** The prior-season count comparison is necessary but not always decisive: Barry's 2026 page served **21 players against 34** — 62%, against Pittsburgh's *deferred* 50% — which on ratio alone is arguable. Its position split is not: **1 goalkeeper**, 5 defenders, and **12 of 21 midfield-capable**. No real squad carries one keeper, and a 57% midfielder share is not a team. **A GK count of 0–1, or a midfielder share far above ~30%, means the roster is partially published** — the missing players are simply the ones not yet added, and they are not randomly distributed. Use this *with* the prior-season comparison, not instead of it.

**A blank POSITION cell is a field-level gap, not a roster-level one (added v44.46).** Distinct from the four "published ≠ populated" shapes. OCU publishes 3 of 25 players and St. Edward's 6 of 39 with an **empty position cell** while the squad shape is otherwise healthy (3 and 5 goalkeepers respectively) — and St. Edward's **player bio pages carry no position field either**, so there is nowhere else to look. Count only confirmed midfielders, and then **measure whether the uncertainty matters** instead of assuming: push every unknown into the most pessimistic bucket and re-run the opportunity score. If it stays inside the same §14 trajectory row the outlook is unaffected (OCU: 6.0 → 7.0); if it crosses a row, disclose it in the note and flag a re-check (St. Edward's: 8.5 → 5.5).

**Match short column headers EXACTLY, not by substring (added v44.39).** The class column is `CL` at Louisville and `Yr.` at Duke, so a substring rule finds nothing; but a loose substring rule for `cl` happily matches **`Club`**, which UC Riverside publishes, and then mis-reads every class year. Normalise the header to letters-only, try an exact match first, and only then fall back to substring.

**The previous-school column may contain CLUBS rather than colleges (added v44.40).** Three schools this session would have been misclassified by *counting* populated cells instead of *reading* them: Cal Poly's column is literally headed "Previous School/Club" (4 of 5 entries are Portland Timbers2 / San Jose Earthquakes II / Pateadores SC); Northeastern has 13 of 14 midfielders populated with academies (Houston Dynamo MLS NEXT, Toronto FC, Barca Residency) and exactly one college; UCA merges hometown and club into one field. Always check whether each value is an actual college before treating it as a transfer. Conversely, **an empty-but-present column is strong positive evidence** — Akron publishes the column and it is blank for all 11 MFs, which is the firmest Freshman-friendly confirmation available.

**Position code normalisation:**
All of these map to midfielder: `M`, `MF`, `CM`, `F/M`, `D/M`, `Midfielder`, `Midfield`, `Central Midfielder`, `Defense/Midfield`

**New layout encountered?**
Document it in this table before finishing the session (Phase 8 End of Session Protocol).

---

### Research Accuracy Rules

- **Never guess** coach emails, phone numbers, or social media handles. If not found at Tier 1, set to `null` or `""` and mark as deferred.
- **Never use** a published cost figure without tracing it to the official COA page. Third-party figures are routinely 10–20% off.
- **Whenever touching a school for any reason** (coach update, confRecord, new data), verify `costNum` against the official COA page at the same time — zero extra session cost, catches stale estimates before they affect Olivier's ranking.
- **Always verify** coach name against the official staff page for the current season. Coaching changes happen in December–February; aggregators lag by months.
- **Always check** that a men's soccer program is active before researching any other data point. (Wichita State and Hawaii were fully researched and added before being removed in v26.)
- **For MLS picks**: the official MLS SuperDraft record is the only authoritative source. Many programs claim players who went undrafted or signed as free agents.

### Proving a new validator check actually works: `negtest.py` (added v44.53)

```bash
python negtest.py --suite negtests/checks.json
```

**A validator's silence is only evidence if you have proven the mutation landed.** v44.50 negative-tested MAXAID's five branches and **the first test passed while proving nothing** — the patch used a 6-space indent where the file uses 4, so `replace()` was a silent no-op, the validator ran against clean data and printed `Issues: 0`, which is exactly what a working check prints. It was caught only by noticing the other four fired and that one didn't.

`negtest.py` makes that indistinguishable case impossible: it **asserts the file changed and refuses to run the validator otherwise**, reporting `VOID / MUTATION-NOOP` instead of a pass. It also separates `CHECK-SILENT` (mutation applied, check didn't fire — the real failure) from `PASS`, refuses to start on a file with uncommitted changes unless `--force`, and **always restores in a `finally` block**, confirming the baseline `Issues:` count afterwards.

`negtests/checks.json` is the committed suite — **8 cases across MAXAID (5), TIER, FIT and SCORES-SRC, all proven.** Add a case whenever you add a check. Note the **FIT case is a permanent regression test for v44.51**: it perturbs `housingPenalty` in `js/scores.js` and requires FIT to fire, so if anyone ever reintroduces a local mirror of the formula, that case goes silent and the suite fails.

### Closing a copy or data item: use `sweep.py`, not a grep (added v44.51)

```bash
python sweep.py "9\.9" "equivalenc" "roster cap|28[- ]player"
```

**Never close an item that names a count without re-deriving the count, and never from a head-limited grep.** Three consecutive sessions closed on a figure that was a lower bound: v44.47 said 2 (was **8**), v44.48 said 1 (was **8**), v44.49's brief said 2 (was **29**). The failure is nasty because **a truncated search read as exhaustive looks identical to a clean result** — no error, just fewer rows.

`sweep.py` (repo root) walks every string in `data/` + `athletes/` and attributes each hit to its **owning record and JSON path** (`d2.json  ocu  fin.internationalNote`), plus line-based `index.html` + `js/*.js`. It never truncates, is case-insensitive by default, takes **several patterns at once** and counts each — because a factual error is a *claim* and a claim has many phrasings (v44.48 needed three patterns; one regex would have left three live). Docs are excluded by default (they quote past bugs and inflate every count); `--docs` includes them.

**Read the rows, not just the total — your own pattern can collide.** The script's first real run swept `no cap|uncapped` and returned 2 hits, both false: `"no cap"` matched **"no capacity"** and `uncapped` matched **"uncapacitied"** in a stadium description. Same class as v44.45's `"sun conference"` matching inside `"asun conference"`.

**When the thing you're sweeping for is "does this field render to the user" rather than a factual claim, a field-name grep is not enough — variable aliasing hides it (v44.89).** Fixing the internal-jargon leak into `trajectoryNote`/`recruit_pathway_note` (owner-reported, see CHANGELOG v44.89) required auditing every `*Note`/`*_note` field against the actual renderers, and the first attempt got it wrong in both directions: (1) `proPlayers.nextLevel.note` was initially judged "never rendered" because `grep -n "nextLevel.note" js/app.js` returned nothing — but the renderer aliases it to a short local variable first (`const nl = pp.nextLevel`) and reads `nl.note`, which a literal-field-name grep can't see. That one mistake would have left 34 leaking entries unfixed. (2) The jargon-pattern sweep itself needed three widening passes before it was actually exhaustive: pass 1 only matched `§14`/`§6E`/`CLAUDE.md` and missed `(§15 ...)` citations in two other fields; pass 2 added a general `§` check and still missed Stony Brook's leak, which read "CLAUDE.md 6" with no `§` symbol at all; pass 3 widened to `CLAUDE\.md|§|...` and finally caught it — three passes to reach zero, the same "truncated search reads as clean" trap as the count-closing failures above. **The generalizable rule: (a) before declaring any field un-rendered, grep for how the renderer actually accesses it — including short aliased variable names, not just the full dotted field-name string — and (b) after a jargon/pattern sweep returns zero, widen the pattern once more and re-run before trusting the zero; a clean first pass is not evidence the pattern was complete.**

### Checking whether a stored URL is dead (added v44.31 — the sweep method)

**Only NXDOMAIN proves a host is dead.** Every other failure a scripted client reports is a false positive on these domains. Measured across all 333 stored links (111 school `url` + 111 `SITE_URLS` + 111 `DOMAINS`):

| Symptom | Means | Examples seen |
|---|---|---|
| **NXDOMAIN** (`getaddrinfo failed`) | genuinely dead | `www.apacheathletics.com`, `shupiratesl.com` |
| **HTTP 202, empty body** | Cloudflare challenge — alive | `jcccathletics.com`, `efsctitans.com`, `goreivers.com` |
| **HTTP 403** | bot block — alive | `iwcc.edu`, `indianhills.edu`, `umd.edu`, `unc.edu`, `umich.edu`, `uakron.edu` |
| **`SSLError` / `ConnectTimeout`** | client-side quirk — alive, renders fine in a browser | `rutgers.edu`, `uncc.edu`, `chapman.edu` |
| **Resolves, but parked / hangs** | needs a CONTENT check, not a DNS check | `monroemustangs.com` (v42.13), `lopes.com` (still open, §6) |

Run the sweep with a **browser User-Agent** — without one the Cloudflare hosts multiply. A 404 on a *path* (Notre Dame's `/sports/mens-soccer`) is a real dead link even though the host is alive, so check the full stored URL, not just the host.

**Store a program page, never a per-coach bio deep link — those ids rot (v44.34).** NC State's stored `/roster/coaches/<slug>/5258` now serves the same coach at `5017`. 81 of 108 `coaches.json` URLs already follow the program-page convention; keep it. Two related findings from that sweep: **`coaches.json.url` was the one stored-link field no sweep had ever covered** (v44.31's 333-link pass read `url`/`SITE_URLS`/`DOMAINS` only) and it therefore drifted alone — every corrected URL already existed, correct, in the school object. And it has **no renderer consumer**, so its correctness can never be caught by looking at the app; only a sweep finds it. Include it when sweeping.

**`DOMAINS` failures are invisible and no validator can see them.** The modal logo goes through Google's favicon service, which returns a **generic globe rather than an error** for an unresolvable domain — Seton Hall's had been silently broken. To test one, compare payload size: a dead host returns ~726 B/404, a live one ~1360 B/200 at `https://www.google.com/s2/favicons?domain=HOST&sz=64`.

**Do not add a CI check for this.** ~15 hosts bot-block permanently, so it would be a standing false-positive generator. Re-run the sweep manually every so often instead.

### Conflicting Tier 1 Sources

When two Tier 1 sources disagree, use this priority order by data type:

| Data type | Authoritative Tier 1 source when sources conflict |
|---|---|
| Coach name / contact | Official athletics staff page (more current than conference directory) |
| Roster / player positions | Official school roster page (more current than conference roster) |
| Conference standings | Official conference website (more current than school athletics page) |
| Cost / tuition | Official school financial aid / bursar page (more current than admissions page) |
| MLS draft picks | MLS official SuperDraft results page |

When conflict cannot be resolved with confidence, note the discrepancy, use the more conservative value, and mark as needing verification.

### Off-Season Roster Data Gaps

Rosters are often unpublished or showing prior-year data between May and August — after the season ends and before new recruits commit for the following year.

- **If the roster page shows a prior season's data**: note the data vintage explicitly. Set `minutesOutlook` to `{ "available": false }` and document: "Roster page showed [year] data as of [date scraped]. Defer until current-season roster is published."
- **Do not use prior-year roster data to populate minutesOutlook** — graduating seniors may already have left and new recruits not yet visible, making opportunity scores unreliable.
- **Best scraping window**: September–November, once teams have played several games and rosters are finalised.

---

*CLAUDE.md — Updated July 2026 (v35.1 full code-review pass). Version history: CHANGELOG.md.*
*Multi Skilled Contractors. Do not commit changes to this file without owner approval.*
