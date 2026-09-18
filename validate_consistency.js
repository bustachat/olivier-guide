// validate_consistency.js — cross-file consistency audit (added v35.2, from the July 2026 code review)
// Catches what validate_schools.py doesn't: stored-score drift vs the live scores.js formula,
// tier strings vs renderer buckets, coach name sync, enum drift, app.js lookup-table coverage.
// Run from repo root: node validate_consistency.js
// Baseline July 2026: 174 known issues (the v36 backlog in CLAUDE.md §6). Count must never
// increase from a session's changes; after the v36 fixes land it must be zero.
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const CONF_FILES = ['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'd1-other', 'juco', 'ivy', 'd2'];
const schools = [];
for (const f of CONF_FILES) {
  for (const s of load('data/' + f + '.json')) { s._file = f; schools.push(s); }
}
const coaches = load('data/coaches.json');
const conferences = load('data/conferences.json');
const prestige = load('data/conf-prestige.json');
const athlete = load('athletes/olivier.json');

// ── js/scores.js is the SINGLE SOURCE OF TRUTH for the Fit Score (added v44.51) ──
// This file used to REIMPLEMENT calculateFitScore() and five of its helpers
// (soccerQualityScore, minutesOutlookScore, nextLevelFactor, housingPenalty,
// fundingPenalty) plus DIV_STRENGTH and the §5b constants. That made the FIT check
// structurally incapable of its own job: change a formula in js/scores.js and miss
// the copy here, and this validator would compare all 111 stored scores against its
// own stale mirror and cheerfully report Issues: 0 while every ranking in the guide
// was wrong. Exactly the blindness CHIPS (v44.45) and MAXAID (v44.50) needed
// code-shape guards for — except what is guarded here is the score itself.
//
// scores.js is a plain browser script with no module system (§4: vanilla JS, no build
// step — do NOT add module.exports to it just to satisfy this file), so it is
// evaluated in a vm sandbox and the real functions are pulled out. Safe to do:
// every scoring function in it is pure. Its one DOM-touching function,
// recalculateAllScores(), is a function *declaration*, so loading the file never
// executes it and nothing here calls it.
//
// There is deliberately NO fallback copy of the formula. If this loader fails it
// throws, because a validator that silently falls back to a local mirror is the
// precise bug this replaced.
const vm = require('vm');
const SCORES = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'js/scores.js'), 'utf8');
  const wanted = ['calculateFitScore', 'soccerQualityScore', 'minutesOutlookScore',
    'nextLevelFactor', 'housingPenalty', 'fundingPenalty', 'calcDevAvg',
    'climateScore', 'cityScore'];
  let api;
  try {
    api = vm.runInContext(`${src}\n;({${wanted.join(',')}})`,
      vm.createContext({ console }), { filename: 'js/scores.js' });
  } catch (e) {
    throw new Error(`SCORES-SRC: could not evaluate js/scores.js to validate against the REAL Fit Score formula.\n`
      + `  ${e.message}\n`
      + `  If scores.js gained a top-level reference to document/window, move it inside a function —\n`
      + `  the scoring functions must stay pure so they can be verified outside a browser.`);
  }
  const missing = wanted.filter(k => typeof api[k] !== 'function');
  if (missing.length) {
    throw new Error(`SCORES-SRC: js/scores.js no longer provides: ${missing.join(', ')}.\n`
      + `  The FIT check cannot run without them and will NOT fall back to a local copy.\n`
      + `  If they were renamed, update the 'wanted' list here in the SAME commit as the rename.`);
  }
  return api;
})();

const issues = [];
const note = (cat, msg) => issues.push(`[${cat}] ${msg}`);

// ── duplicate ids ──
const idCount = {};
schools.forEach(s => idCount[s.id] = (idCount[s.id] || 0) + 1);
Object.entries(idCount).filter(([, c]) => c > 1).forEach(([id, c]) => note('DUP', `school id ${id} appears ${c}x`));

// ── app.js lookup tables (DOMAINS / SITE_URLS / SOCIAL) ──
const appjs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
function extractKeys(varName) {
  const start = appjs.indexOf(`const ${varName} = {`);
  const end = appjs.indexOf('\n};', start);
  const body = appjs.slice(start, end);
  return [...body.matchAll(/^\s{2}([a-z_][a-z0-9_]*):/gmi)].map(m => m[1]).filter(k => !k.startsWith('_'));
}
const ids = schools.map(s => s.id);
const idSet = new Set(ids);
for (const name of ['DOMAINS', 'SITE_URLS', 'SOCIAL']) {
  const keySet = new Set(extractKeys(name));
  ids.filter(id => !keySet.has(id)).forEach(id => note(name, `missing entry for school ${id}`));
  [...keySet].filter(k => !idSet.has(k)).forEach(k => note(name, `stale entry ${k} (no such school)`));
}

// ── confKey vs CONF_SECTIONS ──
const sectionKeys = new Set(['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'asun', 'pac-12', 'mountain-west', 'wcc', 'america-east', 'nec', 'summit', 'patriot', 'other']);
schools.filter(s => !sectionKeys.has(s.confKey)).forEach(s => note('CONFKEY', `${s.id} confKey='${s.confKey}' has no CONF_SECTIONS match — invisible in Explore`));

// ── acuUnits ──
const CANON = ['ANAT100', 'EXSC222', 'BIOL125', 'EXSC225', 'EXSC322', 'EXSC394', 'EXSC224', 'EXSC321', 'EXSC204', 'EXSC216', 'EXSC199', 'EXSC296', 'EXSC187', 'EXSC230', 'EXSC122', 'EXSC398'];
schools.forEach(s => {
  if (!Array.isArray(s.acuUnits)) { note('ACU', `${s.id} missing acuUnits[]`); return; }
  if (s.acuUnits.length !== 16) note('ACU', `${s.id} acuUnits length ${s.acuUnits.length}`);
  const units = s.acuUnits.map(u => u.unit);
  if (JSON.stringify(units) !== JSON.stringify(CANON)) note('ACU', `${s.id} acuUnits order/codes differ from canonical`);
  const trues = s.acuUnits.filter(u => u.covered).length;
  if (trues !== s.acuAlign) note('ACU', `${s.id} acuAlign=${s.acuAlign} but covered:true count=${trues}`);
});

// ── lensScores / devScores / kinRank ──
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const lk = Object.keys(s.lensScores || {}).sort().join(',');
  const want = ['academic', 'lifestyle', 'minutes', 'overall', 'soccer', 'value'].join(',');
  if (lk !== want) note('LENS', `${s.id} lensScores keys: ${lk || '(none)'}`);
  if (s.devScores) {
    const dk = Object.keys(s.devScores).sort().join(',');
    if (dk !== 'fitness,tactical,technical') note('DEV', `${s.id} devScores keys: ${dk}`);
  }
  if (s.kinRank === undefined) note('KINRANK', `${s.id} missing kinRank (renders 'undefined' in modal Degree tab)`);
  // HOUSING (v41.0): facilityDetails.housing is REQUIRED on every full profile — it feeds the
  // Fit Score housing penalty (−6 none / −3 limited), so an absent field silently skips the
  // penalty. This check is the enforcement gate for future New School sessions (§7 Phase 1H).
  const h = s.facilityDetails && s.facilityDetails.housing;
  if (!h) note('HOUSING', `${s.id} missing facilityDetails.housing — required since v41.0 (feeds the Fit Score housing penalty; research via official residence-life page, §7 Phase 1H)`);
  else if (![true, false, 'limited'].includes(h.available)) note('HOUSING', `${s.id} housing.available='${h.available}' — must be exactly true | false | "limited"`);
});

// ── fin component sums ──
schools.filter(s => s.fin && s.fin.costNum > 0).forEach(s => {
  const f = s.fin;
  if ([f.tuition, f.roomBoard, f.fees].every(x => typeof x === 'number')) {
    const sum = f.tuition + f.roomBoard + f.fees;
    if (sum !== f.costNum) note('FIN', `${s.id} tuition+roomBoard+fees=${sum} != costNum=${f.costNum} (diff ${f.costNum - sum})`);
  } else note('FIN', `${s.id} missing tuition/roomBoard/fees components`);
});

// ── minutesOutlook / recruit_risk enum ──
// MO-KEYS (added v40.2): exact key-name audit. Both the v39.7 bug (trajectory "yr" instead of
// "year", 19 schools) and the v40.1 bug ("mf_total_2026" instead of "mf_total_2025", 7 schools;
// missing rising_senior_2027_count, 2 schools) were schema-adjacent key names that every other
// check accepted — they render as the literal text "undefined" in the Minutes Outlook UI.
// v44.32: `mf_total_2025` → `mf_total` + `roster_season`. The year in the old key name was a
// standing lie waiting to happen — the count is whatever season was last scraped, and Murray
// State was already on 2026-27 while the UI label still read "MFs (2025)". The season now
// travels WITH the count instead of being hardcoded in the renderer, so the 2026-27 roster
// refresh updates both together and no future August needs another rename.
const MO_KEYS_AVAILABLE = new Set(['available', 'mf_total', 'roster_season', 'cleared_before_2027', 'cleared_names',
  'rising_senior_2027_count', 'rising_senior_2027_names', 'rising_junior_2027_count', 'rising_junior_2027_names',
  'recruit_risk', 'trajectory', 'trajectoryNote', 'recruit_pathway', 'recruit_pathway_note',
  'australianNote']); // australianNote: one-off narrative field, present in live data
const MO_KEYS_UNAVAILABLE = new Set(['available', 'note', 'reason']);
const MO_REQUIRED = ['mf_total', 'roster_season', 'cleared_before_2027', 'rising_senior_2027_count', 'rising_junior_2027_count', 'recruit_risk', 'trajectory'];
// Always the academic-year form ("2026-27"), never the calendar-year form some athletics sites
// use ("2026") — the stored value is a label rendered verbatim in the Minutes Outlook stat box,
// so a mixed format shows as "MFs (2026)" next to "MFs (2026-27)" on the same tab.
const ROSTER_SEASON_RE = /^\d{4}-\d{2}$/;
const TRAJ_KEYS = ['year', 'yr_label', 'pct', 'label'];
// recruit_pathway enum (added v34, schema: CLAUDE.md §5). Feeds the Pathways tab's
// recruit-pathway summary (added v44.26, js/app.js renderRecruitPathwaySummary()) —
// an off-enum value would silently drop a school from every bucket with no error,
// so this check exists to catch a typo/new value before it ships silently.
const RECRUIT_PATHWAY_VALUES = ['Freshman-friendly', 'Transfer-preferred', 'Portal/JUCO-heavy', 'Mixed'];
// Both v21-era gaps here were closed by the Wave 1 Session 1 roster refresh (Aug 2026), off each
// school's live 2026-27 roster: notredame v44.37 (3 rising seniors — Schroeder, Shaul, Hilden) and
// georgetown v44.38 (4 — Godinho, Urrutia, Brown, Ahmed). The set is deliberately kept rather than
// deleted: it is the documented escape hatch for an honestly-unresearched minutesOutlook key, and
// the renderers still guard those keys with '—'. Add an 'id:key' entry only for a real research
// gap, never to silence a cascade you skipped.
const MO_MISSING_OK = new Set([]);
// PATHWAY-LOC (v45.60): js/app.js reads recruit_pathway only from minutesOutlook. 21 JUCOs stored it
// on the school object instead and silently never appeared in the Pathways tab summary.
schools.forEach(s => {
  ['recruit_pathway', 'recruit_pathway_note'].forEach(k => {
    if (k in s) note('PATHWAY-LOC', `${s.id} stores ${k} on the school object; the app only reads minutesOutlook.${k}`);
  });
});
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const mo = s.minutesOutlook;
  if (!mo) { note('MO', `${s.id} missing minutesOutlook`); return; }
  if (mo.available) {
    if (!Array.isArray(mo.trajectory) || !mo.trajectory.length) note('MO', `${s.id} available:true but no trajectory`);
    if (mo.recruit_risk && !['Low', 'Medium', 'High'].includes(mo.recruit_risk)) note('MO', `${s.id} recruit_risk='${mo.recruit_risk}' — renderers only understand Low|Medium|High; this displays as green 'Open'`);
    if (mo.recruit_pathway && !RECRUIT_PATHWAY_VALUES.includes(mo.recruit_pathway)) note('MO', `${s.id} recruit_pathway='${mo.recruit_pathway}' — must be exactly one of ${RECRUIT_PATHWAY_VALUES.join(' | ')}; an off-enum value silently vanishes from the Pathways tab summary instead of erroring`);
    if (mo.roster_season !== undefined && !ROSTER_SEASON_RE.test(mo.roster_season)) note('MO', `${s.id} roster_season='${mo.roster_season}' — must be the academic-year form YYYY-YY (e.g. "2026-27"); this string renders verbatim as the Minutes Outlook stat label`);
    Object.keys(mo).filter(k => !MO_KEYS_AVAILABLE.has(k)).forEach(k =>
      note('MO-KEYS', `${s.id} unknown minutesOutlook key '${k}' — misnamed keys render as literal 'undefined' (schema: CLAUDE.md §5)`));
    MO_REQUIRED.filter(k => mo[k] === undefined && !MO_MISSING_OK.has(s.id + ':' + k)).forEach(k =>
      note('MO-KEYS', `${s.id} missing required minutesOutlook key '${k}'`));
    (mo.trajectory || []).forEach((t, i) => {
      Object.keys(t).filter(k => !TRAJ_KEYS.includes(k)).forEach(k =>
        note('MO-KEYS', `${s.id} trajectory[${i}] unknown key '${k}' (schema keys: ${TRAJ_KEYS.join(', ')})`));
      TRAJ_KEYS.filter(k => t[k] === undefined).forEach(k =>
        note('MO-KEYS', `${s.id} trajectory[${i}] missing key '${k}' — renders as 'undefined' in trajectory rows`));
    });
  } else {
    Object.keys(mo).filter(k => !MO_KEYS_UNAVAILABLE.has(k)).forEach(k =>
      note('MO-KEYS', `${s.id} unknown minutesOutlook key '${k}' on an available:false object`));
  }
});

// ── conferences.json tier strings vs renderConferences() buckets ──
const rendererTiers = new Set(['Power 5 (D1)', 'High Major (D1)', 'Ivy League (D1)', 'Mid-Major (D1)', 'Division II', 'NAIA', 'Division III', 'Junior College']);
conferences.forEach(c => { if (!rendererTiers.has(c.tier)) note('TIER', `conferences.json '${c.id || c.name}' tier='${c.tier}' matches no renderer bucket — card hidden on Conferences tab`); });

// ── MAXAID (added v44.50) — the conference card's "Max Aid" stat must come from a
// stored field, never from parsing the `scholarships` prose.
// History: renderConferences() used to derive the tile with
//   c.scholarships.split('Up to')[1]?.trim().split(' ')[0] || c.scholarships.split(' ')[0]
// which rendered a WORD for 10 of 25 conferences — "NCAA" (NEC/Summit/CACC, whose strings
// begin "NCAA D1 — up to …"; the split is case-sensitive so lowercase "up to" never matched),
// "Army" (Patriot), "NAIA" (AMC), "equivalent" (SAC/Sun), "Athletic" (JUCO). It also meant any
// copy edit to `scholarships` could silently change a displayed number — v44.49 appended a
// House-settlement qualifier to 14 of those strings and had to measure the parse before and
// after to prove it hadn't. Two checks below: the data must be present and tile-sized, AND
// the renderer must not go back to parsing (the string check is what makes this durable —
// re-adding the split would otherwise pass every data check here).
conferences.forEach(c => {
  const v = c.maxAid;
  if (typeof v !== 'string' || !v.trim()) {
    note('MAXAID', `conferences.json '${c.abbr || c.name}' has no maxAid — the Conferences card's Max Aid tile renders '—'`);
  } else if (v.length > 12) {
    note('MAXAID', `conferences.json '${c.abbr || c.name}' maxAid='${v}' is ${v.length} chars — that tile is a compact stat, keep it under 12 (put the nuance in 'scholarships')`);
  }
});
if (/scholarships\s*\.\s*split\s*\(/.test(appjs)) {
  note('MAXAID', `js/app.js parses c.scholarships with .split() again — the Max Aid tile must read the stored c.maxAid field, not the prose (see CLAUDE.md §6, v44.50)`);
}

// ── coaches ──
const ranks = coaches.map(c => c.rank).sort((a, b) => a - b);
for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) { note('COACH', `rank sequence broken at ${ranks[i]} (expected ${i + 1}); total ${coaches.length}`); break; }
coaches.forEach(c => {
  if (!idSet.has(c.schoolId)) note('COACH', `${c.name} schoolId '${c.schoolId}' not a school`);
  if (!['rk-elite', 'rk-strong', 'rk-solid'].includes(c.rankClass)) note('COACH', `${c.name} rankClass='${c.rankClass}'`);
  // rankClass ↔ overallScore band coherence (GLOBAL — a badge colour that contradicts the
  // score is always wrong). Bands §5d = the existing cutoffs: elite ≥80 / strong 65-79 / solid ≤64.
  if (typeof c.overallScore === 'number' && ['rk-elite', 'rk-strong', 'rk-solid'].includes(c.rankClass)) {
    const band = c.overallScore >= 80 ? 'rk-elite' : c.overallScore >= 65 ? 'rk-strong' : 'rk-solid';
    if (c.rankClass !== band) note('COACH', `${c.name} overallScore=${c.overallScore} implies ${band} but rankClass='${c.rankClass}' (§5d bands: elite ≥80 / strong 65-79 / solid ≤64)`);
  }
  // coach{} was removed from school objects in v44.27 — coaches.json is now the sole
  // source (looked up by schoolId via getCoach() in js/app.js). A stray coach{} means
  // it's silently drifting again with nothing to catch it (this replaces the old
  // COACH-SYNC check, which compared the two sources — there's only one now).
  const s = schools.find(x => x.id === c.schoolId);
  if (s && s.coach) note('COACH-SYNC', `${c.schoolId} still has a school-object "coach" key — coach data was moved to coaches.json (sole source, v44.27); remove it`);
});
const coachSchoolIds = new Set(coaches.map(c => c.schoolId));
schools.filter(s => s.profileDepth === 'full' && !coachSchoolIds.has(s.id)).forEach(s => note('COACH', `${s.id} full-profile but no coaches.json entry`));

// ── COACH-RUBRIC (added v43.0 / §5d Step 1): the coach overallScore standard ──
// overallScore is a holistic judgment value and is deliberately NOT recomputable here —
// §5d chose a single holistic score, not a sub-score average, so there is no formula to mirror
// (unlike fitOlivier). What IS checkable, and only for coaches that CLAIM to have been scored
// against §5d, is that the score is a clean integer 0–100. The claim is `overallScoreNote`: it
// cites the Tier-1 CV/development evidence the score was drawn from.
//
// Coaches with no overallScoreNote predate the v43 rubric — the re-score backlog (CLAUDE.md §6 /
// §5d Step 2), reported as PROGRESS, not issues, so this check cannot inflate the baseline on day
// one (no coach carries a note yet). Each note activates the check permanently: a one-way door,
// exactly like devScoresNote (§5a). The rankClass↔band coherence check above is separate and GLOBAL.
let coachRescored = 0, coachLegacy = 0;
coaches.forEach(c => {
  const scored = typeof c.overallScoreNote === 'string' && c.overallScoreNote.trim().length >= 20;
  if (!scored) {
    if (c.overallScoreNote !== undefined) note('COACH-RUBRIC', `${c.name} overallScoreNote present but not a substantive citation (needs the Tier-1 CV/development evidence observed, §5d)`);
    coachLegacy++;
    return;                                     // legacy score — backlog, not an issue
  }
  coachRescored++;
  if (!Number.isInteger(c.overallScore) || c.overallScore < 0 || c.overallScore > 100) note('COACH-RUBRIC', `${c.name} overallScore=${c.overallScore} — must be an integer 0–100 (§5d)`);
});

// ── athlete config ──
const sumW = o => Object.values(o).reduce((a, b) => a + b, 0);
if (sumW(athlete.scoreWeights) !== 100) note('WEIGHTS', `scoreWeights sum=${sumW(athlete.scoreWeights)}`);
(athlete.shortlist || []).forEach(e => { const id = typeof e === 'string' ? e : e.id; if (!idSet.has(id)) note('SHORTLIST', `shortlist id '${id}' not a school`); });
(athlete.outreach || []).forEach(e => { if (!idSet.has(e.schoolId)) note('OUTREACH', `outreach schoolId '${e.schoolId}' not a school`); });

// ── map coords ──
schools.forEach(s => {
  if (s.mapX === undefined || s.mapY === undefined) note('MAP', `${s.id} missing mapX/mapY`);
  else if (s.mapX < 0 || s.mapX > 640 || s.mapY < 0 || s.mapY > 390) note('MAP', `${s.id} mapX/mapY out of 640x390: ${s.mapX},${s.mapY}`);
});

// ── juco2yr flags (the ONLY ACU-tab exclusion flag) ──
schools.filter(s => s.div === 'JUCO' && !s.juco2yr).forEach(s => note('JUCO', `${s.id} div=JUCO missing juco2yr:true — will wrongly appear in ACU Alignment tab`));

// ── gpa.status stored vs computed at Olivier's default GPA 2.8 ──
function parseMinGpa(m) { if (!m) return 0; const s = m.toLowerCase(); if (s.includes('no minimum') || s.includes('open')) return 0; const x = m.match(/(\d+\.\d+|\d+)/); return x ? parseFloat(x[1]) : 0; }
function gpaStatus(g, m) { const min = parseMinGpa(m); if (min === 0) return 'eligible'; if (g >= min) return 'eligible'; if (g >= min - 0.3) return 'borderline'; return 'below'; }
schools.filter(s => s.gpa).forEach(s => {
  const comp = gpaStatus(2.8, s.gpa.minEntry);
  if (s.gpa.status && s.gpa.status !== comp) note('GPA', `${s.id} stored gpa.status='${s.gpa.status}' vs computed@2.8='${comp}' (minEntry: ${s.gpa.minEntry}) — Compare tab renders the stored value`);
});

// Dev average — the REAL scores.js implementation, not a copy (see the SCORES loader
// at the top of this file). Used by DEV-RUBRIC's ceiling check below.
const calcDevAvg = SCORES.calcDevAvg;

// ── DEV-RUBRIC (added v42.0): dev score ceilings per CLAUDE.md §5a ──
// The sub-scores themselves are judgment values and are deliberately NOT checkable here.
// What IS mechanically checkable is the division environment ceiling — and only for schools
// that claim to have been scored against the rubric. `devScoresNote` is that claim: it cites
// the Tier-1 evidence (athletics staff directory + facilities pages) the score was drawn from.
//
// Schools with no devScoresNote predate the v42 rubric. They are the re-baseline backlog
// (CLAUDE.md §6 Steps 2 and 5) and are reported as PROGRESS, not as issues — so adding this
// check cannot inflate the issue baseline on day one. As each school is re-scored, adding its
// note activates the ceiling check for it permanently. A note is therefore a one-way door:
// once written, that school can never drift back above its ceiling unnoticed.
const DEV_CEILING = { D1: 95, IVY: 88, D2: 76, NAIA: 72, JUCO: 68, D3: 66 };
let devRebaselined = 0, devLegacyOverCeiling = 0;
schools.filter(s => s.profileDepth === 'full' && s.devScores).forEach(s => {
  const ceiling = DEV_CEILING[s.div];
  if (ceiling === undefined) { note('DEV-RUBRIC', `${s.id} div='${s.div}' has no §5a ceiling`); return; }
  const avg = calcDevAvg(s);
  const scored = typeof s.devScoresNote === 'string' && s.devScoresNote.trim().length >= 20;

  if (!scored) {
    if (s.devScoresNote !== undefined) note('DEV-RUBRIC', `${s.id} devScoresNote present but not a substantive citation (needs the Tier-1 evidence observed, §5a)`);
    if (avg > ceiling) devLegacyOverCeiling++;
    return;                                     // legacy score — backlog, not an issue
  }

  devRebaselined++;
  if (avg > ceiling) note('DEV-RUBRIC', `${s.id} devAvg=${avg} exceeds the ${s.div} ceiling of ${ceiling} (CLAUDE.md §5a) — dev measures the training environment, not results`);
  Object.entries(s.devScores).forEach(([k, v]) => {
    if (!Number.isInteger(v) || v < 0 || v > 100) note('DEV-RUBRIC', `${s.id} devScores.${k}=${v} — must be an integer 0–100`);
  });
});

// ── CONFRECORD backlog counter (added v42.8) ─────────────────────────────────
// The v38 "zero-variation" scan only caught confRecords where EVERY year carried
// the same label. That missed Mercyhurst — 2021-24 all read "PSAC" while 2025 read
// "8th NEC", so the record varied — yet 2024 was in fact their FIRST D1 season and
// they WON the NEC regular-season title. Four years of real history recorded as a
// generic placeholder (fixed v42.8).
//
// The correct signature is a RUN of >=3 identical GENERIC labels. Generic = the
// label names no finishing position and no title. Conference names must be stripped
// before testing for a rank, or "Pac-12" and "B1G" read as ranks because of their
// digits — the same string-matching trap that made an NCAA D2 school (Eastern New
// Mexico) count as a D1 transfer destination during the v42.7 alumni research.
//
// Reported as BACKLOG, not as an issue: this is pre-existing debt, not a regression,
// and the issue baseline must not jump for work nobody has done yet (same gating
// rationale as DEV-RUBRIC above).
const CONF_TOKENS = /pac-?12|b1g|c-?usa|big ?west|big ?east|big ?ten|njcaa d?i{1,3}|sun conf|caa|acc|aac|ssc|lsc|cacc|psac|nec|wac|asun|iccac|mec|region ?\d+/gi;
const NAMES_A_RANK = /\b\d+(st|nd|rd|th)?\b|champ|runner|semifinal|\bfinal\b|tourn/i;
let confRecordBacklog = 0;
schools.forEach(s => {
  const cr = s.confRecord || [];
  if (cr.length < 3) return;
  let best = 1, cur = 1, label = cr[0].pos;
  for (let i = 1; i < cr.length; i++) {
    if (cr[i].pos === cr[i - 1].pos) { cur++; if (cur > best) { best = cur; label = cr[i].pos; } }
    else cur = 1;
  }
  if (best < 3) return;
  if (!NAMES_A_RANK.test(String(label).replace(CONF_TOKENS, ''))) confRecordBacklog++;
});

// ── FIT: stored fitOlivier vs the REAL scores.js calculateFitScore() ──
// Calls the actual production function (see the SCORES loader at the top). Every
// local reimplementation — DIV_STRENGTH, the §5b constants, nextLevelFactor,
// soccerQualityScore, moScore, housingPenalty, fundingPenalty and the inline
// weighted-total formula — was DELETED in v44.51. Do not reintroduce any of them:
// a second copy of the formula is precisely what let this check pass while being
// wrong. If a weight or penalty changes, it changes in ONE place and this check
// picks it up for free.
const fitMismatches = [];
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const fit = SCORES.calculateFitScore(s, athlete);
  // Exact since v45.60: a 1-point tolerance hid a stale division-strength copy in apply_roster_refresh.py.
  if (fit !== s.fitOlivier) fitMismatches.push(`${s.id} (${s._file}): stored ${s.fitOlivier}, live formula ${fit}`);
});

// ── FUNDING (v42.18 §5c): structural scholarship availability feeds the Fit Score
// funding penalty. D1 defaults to full (0) and needs no field; every non-D1 full
// profile must declare fundingPathway explicitly, since div alone can't split
// NJCAA DI (full) / DII (capped) / CCCAA (none) — all three carry div:"JUCO".
const FUNDING_VALUES = new Set(['full', 'capped', 'none']);
schools.filter(s => s.profileDepth === 'full' && s.div !== 'D1').forEach(s => {
  if (s.fundingPathway === undefined) note('FUNDING', `${s.id} (${s.div}) missing fundingPathway — required on non-D1 full profiles (§5c: full|capped|none)`);
  else if (!FUNDING_VALUES.has(s.fundingPathway)) note('FUNDING', `${s.id} fundingPathway='${s.fundingPathway}' — must be full|capped|none`);
});
// A stray fundingPathway on a D1 school would be silently ignored by the penalty
// (D1 is always full=0) — flag it so it can't hide a misclassification.
schools.filter(s => s.div === 'D1' && s.fundingPathway !== undefined && s.fundingPathway !== 'full')
  .forEach(s => note('FUNDING', `${s.id} is D1 but fundingPathway='${s.fundingPathway}' — D1 is structurally full; remove or set 'full'`));

// ── NJCAA-DIV (added 2026-09-17): njcaaDivision feeds the division-strength term ──
// scores.js reads njcaaDivision (I|II|III) to split the JUCO division strength
// (0.6 / 0.55 / 0.42, from Massey ratings). A missing or wrong value silently
// falls back to 0.6, so every NJCAA school (those with njcaaRegion) must carry it,
// and it must agree with fundingPathway, which follows the same division rule (§5c).
// Santa Monica (CCCAA, no njcaaRegion) must not carry it.
const NJCAA_DIV_FUNDING = { I: 'full', II: 'capped', III: 'none' };
schools.filter(s => s.div === 'JUCO').forEach(s => {
  if (!s.njcaaRegion) {
    if (s.njcaaDivision !== undefined) note('NJCAA-DIV', `${s.id} has njcaaDivision but no njcaaRegion — only NJCAA schools carry it`);
    return;
  }
  if (!NJCAA_DIV_FUNDING[s.njcaaDivision]) note('NJCAA-DIV', `${s.id} njcaaDivision='${s.njcaaDivision}' — must be I|II|III`);
  else if (s.fundingPathway !== NJCAA_DIV_FUNDING[s.njcaaDivision]) note('NJCAA-DIV', `${s.id} njcaaDivision ${s.njcaaDivision} but fundingPathway='${s.fundingPathway}' — expected '${NJCAA_DIV_FUNDING[s.njcaaDivision]}'`);
});
schools.filter(s => s.div !== 'JUCO' && s.njcaaDivision !== undefined)
  .forEach(s => note('NJCAA-DIV', `${s.id} is ${s.div} but has njcaaDivision — JUCO only`));
if (fitMismatches.length) {
  note('FIT', `${fitMismatches.length} schools where stored fitOlivier differs from the live scores.js formula:`);
  fitMismatches.forEach(m => note('FIT', '  ' + m));
}

// ── VALUE (added v44.30): the value lens is DERIVED, but nothing recomputes it ──
// value = fitOlivier*0.6 + affordability*40, where affordability = 1 − min(1, costNum/budgetUSD)
// (CLAUDE.md §7 Phase 1J). Unlike fitOlivier — which scores.js recalculates on every page load,
// so drift surfaces immediately — lensScores.value is stored-only: no runtime code recomputes it,
// it is just read by the Value-First lens sort and the Dashboard lens panel. That makes it the one
// derived school score that can drift silently and indefinitely, which is exactly what happened to
// Wake Forest (stored 50 vs formula 29 — a 21-point error that put a $91k school, the single most
// expensive in the guide, mid-table on the lens whose entire job is flagging affordability).
// Both cascade rows that own this field (§3a Change Types 4 and 12) are manual steps, so the only
// thing standing between a missed recalculation and a wrong ranking was someone noticing by eye.
//
// Tolerance >1 matches the FIT check above and absorbs the two defensible readings of budgetUSD:
// the stored athlete field (52000) vs. budgetAUD/fxRate (80000/1.55 = 51612.90). Across all 111
// schools those two differ by at most 1 point (temple: 38 vs 37).
//
// costNum === 0 is EXEMPT — service academies (Army, Navy) only. Per CLAUDE.md §4 their fin{}
// numerics are all zeroed by rule, which saturates affordability at 1.0 and would hand them the
// full +40. Their stored values (navy 47 / army 45, both ≈ fit+3) deliberately decline that credit,
// because the "free" tuition is paid for with a 5-year service commitment — a real cost the dollar
// figure cannot express, and §4 is explicit that these schools are incompatible with Olivier's
// DPT/MLS pathway. Whether the value lens SHOULD credit a $0 sticker price was an owner design
// question; the owner ruled on 2026-09-17 to keep the hand-set values — so this check declines to rule on it rather
// than reporting two intentional values as errors.
const budgetUSD = athlete.budgetUSD || (athlete.budgetAUD / athlete.fxRate);
const valueMismatches = [];
schools.filter(s => s.profileDepth === 'full' && s.fin && s.fin.costNum > 0 && s.lensScores).forEach(s => {
  const affordability = 1 - Math.min(1, s.fin.costNum / budgetUSD);
  const value = Math.round((s.fitOlivier || 0) * 0.6 + affordability * 40);
  if (Math.abs(value - (s.lensScores.value || 0)) > 1) valueMismatches.push(`${s.id} (${s._file}): stored ${s.lensScores.value}, formula ${value} (fit ${s.fitOlivier}, costNum ${s.fin.costNum})`);
});
if (valueMismatches.length) {
  note('VALUE', `${valueMismatches.length} schools where stored lensScores.value differs >1 from fitOlivier*0.6 + affordability*40 (§7 Phase 1J) — re-run the §3a Type 4 cascade:`);
  valueMismatches.forEach(m => note('VALUE', '  ' + m));
}

// ── LENS (added v45.55): the other stored lens scores are derived too ──
// Until v45.55 only overall (via FIT) and value were checked. The rest drifted
// unseen: 108 soccer, 54 academic and 34 lifestyle values no longer matched their
// §7 Phase 1J formulas (Clemson's academic score read 82 against 42 after its
// acuAlign was corrected). Academic and lifestyle drive two Explore lenses, so the
// drift reordered real rankings. Exact match, since each formula is an integer.
const lensMismatches = [];
schools.filter(s => s.profileDepth === 'full' && s.lensScores).forEach(s => {
  const want = {
    soccer: Math.round(SCORES.soccerQualityScore(s) * 100),
    academic: Math.round(((s.acuAlign / 16) * 0.85 + 0.15) * 100),
    minutes: Math.round(SCORES.minutesOutlookScore(s) * 100),
    lifestyle: (s.warm ? 50 : 0) + (s.city ? 50 : 0),
  };
  Object.entries(want).forEach(([k, v]) => {
    if (s.lensScores[k] !== v) lensMismatches.push(`${s.id} (${s._file}): lensScores.${k} stored ${s.lensScores[k]}, formula ${v}`);
  });
});
if (lensMismatches.length) {
  note('LENS', `${lensMismatches.length} stored lens scores differ from their §7 Phase 1J formulas — re-store them:`);
  lensMismatches.forEach(m => note('LENS', '  ' + m));
}

// ── MLS-TABLE (added v45.55): Pro Pipeline MLS table agrees with the school records ──
// The table's picks column and each school's proPlayers.mlsPicks5yr (which feeds the
// Fit Score) are two copies of one fact. Before v45.55 they disagreed (Virginia 6+
// vs 2) and 34 schools with picks were missing from the table. Every single-school
// row with a numeric count must match, and every D1/Ivy school with picks needs a row.
const TABLE_ALIAS = { 'Virginia': 'virginia', "St John's": 'stjohns', 'FIU (was D2)': 'fiu', 'UC Charleston WV': 'uc_charleston',
  "St Edward's": 'stedwards', 'OCU': 'ocu', 'Monroe College': 'monroe_college', 'EFSC': 'efsc' };
const byName = {};
schools.forEach(s => { byName[s.name] = s; });
const draftRows = (load('data/pipeline.json').mlsDraft || []).filter(r => r.school && !r.school.includes(' / '));
const inTable = new Set();
draftRows.forEach(r => {
  const s = TABLE_ALIAS[r.school] ? schools.find(x => x.id === TABLE_ALIAS[r.school]) : byName[r.school];
  if (!s) return;
  inTable.add(s.id);
  const stored = (s.proPlayers || {}).mlsPicks5yr;
  if (typeof r.picks5yr === 'number' && r.picks5yr !== stored) note('MLS-TABLE', `${s.id}: pipeline.json mlsDraft shows ${r.picks5yr} picks, school record stores ${stored}`);
  if (typeof r.picks5yr !== 'number' && stored > 0) note('MLS-TABLE', `${s.id}: pipeline.json mlsDraft shows '${r.picks5yr}', school record stores ${stored} — use the number`);
});
schools.filter(s => (s.div === 'D1' || s.div === 'IVY') && ((s.proPlayers || {}).mlsPicks5yr || 0) > 0 && !inTable.has(s.id))
  .forEach(s => note('MLS-TABLE', `${s.id} has ${s.proPlayers.mlsPicks5yr} MLS picks but no row in pipeline.json mlsDraft`));

// ═══ Guardrails added v45.56 — one check per lesson from the v45.47–v45.55 session ═══
// Each of these classes was found by hand, after it had already shipped. See CLAUDE.md
// §16 for the lesson behind each one.
const tableSchool = name => TABLE_ALIAS[name] ? schools.find(x => x.id === TABLE_ALIAS[name]) : byName[name];
const pipeAll = load('data/pipeline.json');

// REFTABLE: the CLAUDE.md School → File Reference Table must list every school, with
// the right file and division. Five schools were missing for weeks and nothing noticed.
{
  const md = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  const rows = {};
  for (const m of md.matchAll(/^\| ([^|]+) \| `data\/([^`]+)` \| `([^`]+)` \| ([^|]+) \|/gm)) rows[m[3]] = { file: m[2], div: m[4].trim() };
  schools.forEach(s => {
    const r = rows[s.id];
    if (!r) return note('REFTABLE', `${s.id} has no row in the CLAUDE.md School → File Reference Table`);
    if (r.file !== s._file + '.json') note('REFTABLE', `${s.id}: table says data/${r.file}, school lives in data/${s._file}.json`);
    if (r.div !== s.div) note('REFTABLE', `${s.id}: table says div ${r.div}, school record says ${s.div}`);
  });
  Object.keys(rows).filter(id => !idSet.has(id)).forEach(id => note('REFTABLE', `CLAUDE.md table row ${id} matches no school`));
}

// DIV-LABEL: a JUCO's division wording must agree with njcaaDivision, in both the school
// record and its coach record. National Park said "Division I" and four Division III
// coaches still said "NJCAA DI" after the schools were corrected.
{
  const tok = c => /Division III|\bDIII\b/.test(c) ? 'III' : /Division II\b|\bDII\b/.test(c) ? 'II' : /Division I\b|\bDI\b/.test(c) ? 'I' : null;
  schools.filter(s => s.njcaaDivision).forEach(s => {
    const t = tok(s.conf || '');
    if (t && t !== s.njcaaDivision) note('DIV-LABEL', `${s.id}: conf '${s.conf}' says Division ${t}, njcaaDivision is ${s.njcaaDivision}`);
    const c = coaches.find(x => x.schoolId === s.id);
    const ct = c && tok(c.conf || '');
    if (ct && ct !== s.njcaaDivision) note('DIV-LABEL', `${s.id}: coach conf '${c.conf}' says Division ${ct}, njcaaDivision is ${s.njcaaDivision}`);
  });
}

// CONF-COUNT: a conference card claiming "N guide schools" must match guideSchools[].
// "All 14 Big Ten schools" and "13 guide schools in the AAC" survived several changes.
// "Region 15 schools" is a region name, not a count, so it is skipped.
conferences.forEach(c => {
  ['desc', 'olivierNote'].forEach(f => {
    for (const m of (c[f] || '').matchAll(/(Region\s+)?\b(?:all\s+)?(\d{1,3})\s+(?:guide\s+|full-profile\s+|fully profiled\s+)?(schools|programs)\b/gi)) {
      if (m[1]) continue;
      if (+m[2] !== (c.guideSchools || []).length) note('CONF-COUNT', `${c.id}.${f} says "${m[0].trim()}" but guideSchools has ${(c.guideSchools || []).length}`);
    }
  });
});

// ROSTER-PROSE: "N of M midfielders" / "N-player midfield" in a school's current-roster
// text must use the stored mf_total. ~55 texts quoted older rosters after refreshes
// (Harford "entire 10-player midfield clears" against a stored 5). recruit_pathway_note
// is excluded because it legitimately describes earlier seasons.
schools.forEach(s => {
  const mo = s.minutesOutlook;
  if (!mo || !mo.available) return;
  const texts = { rec: s.rec, olivierMatch: s.culture && s.culture.olivierMatch, trajectoryNote: mo.trajectoryNote, facilities: (s.facilities || []).join(' | ') };
  Object.entries(texts).forEach(([f, v]) => {
    for (const m of (v || '').matchAll(/(\d+) of (?:the |its |their )?(\d+) (?:current |returning |listed )?(?:central )?(?:midfielders|MFs|midfield)\b/gi))
      if (+m[2] !== mo.mf_total) note('ROSTER-PROSE', `${s.id}.${f}: "${m[0]}" but mf_total is ${mo.mf_total} (${mo.roster_season})`);
    for (const m of (v || '').matchAll(/(\d+)[- ](?:player|man) midfield/gi))
      if (+m[1] !== mo.mf_total) note('ROSTER-PROSE', `${s.id}.${f}: "${m[0]}" but mf_total is ${mo.mf_total} (${mo.roster_season})`);
  });
});

// COST-PROSE: an approximate yearly cost quoted in a school's own text must be within
// 15% of costNum. Old ballparks ("~$9k", "low ~$38k") outlived the cost campaign.
schools.filter(s => s.fin && s.fin.costNum > 0).forEach(s => {
  const texts = { rec: s.rec, olivierMatch: s.culture && s.culture.olivierMatch, internationalNote: s.fin.internationalNote };
  Object.entries(texts).forEach(([f, v]) => {
    for (const m of (v || '').matchAll(/(?:~|about |approximately |around )\$(\d{1,3}(?:\.\d)?)k(?:\/yr| a year| per year|\/year)/gi)) {
      const k = +m[1] * 1000;
      if (Math.abs(k - s.fin.costNum) / s.fin.costNum > 0.15) note('COST-PROSE', `${s.id}.${f}: "${m[0]}" but costNum is ${s.fin.costNum}`);
    }
  });
});

// ELITE: the Elite JUCO badge is time-bound (CLAUDE.md §5). Its tooltip note must name a
// season inside the window, and the Pro Pipeline "Elite JUCO" badges must match the data.
// Roll ELITE_WINDOW forward each season when the new finals and All-America teams are out.
const ELITE_WINDOW = [2023, 2024, 2025];
schools.filter(s => s.jucoTier === 'Elite').forEach(s => {
  // Ignore the standard closing sentence, which names the window itself and would always pass.
  const facts = (s.jucoTierNote || '').replace(/Elite status counts results from the \d{4}-\d{4} seasons only\./, '');
  if (!ELITE_WINDOW.some(y => facts.includes(String(y)))) note('ELITE', `${s.id} is Elite but its jucoTierNote names no ${ELITE_WINDOW[0]}-${ELITE_WINDOW[ELITE_WINDOW.length - 1]} season`);
});
{
  const pipeElite = new Set();
  (pipeAll.ncaaD2 || []).filter(r => r.badge === 'Elite JUCO').forEach(r => {
    const s = tableSchool(r.school);
    if (!s) return note('ELITE', `pipeline.json Elite JUCO row '${r.school}' matches no school`);
    pipeElite.add(s.id);
    if (s.jucoTier !== 'Elite') note('ELITE', `pipeline.json badges ${s.id} Elite JUCO but its jucoTier is ${s.jucoTier}`);
  });
  schools.filter(s => s.jucoTier === 'Elite' && !pipeElite.has(s.id)).forEach(s => note('ELITE', `${s.id} is Elite but has no Elite JUCO row in pipeline.json ncaaD2`));
}

// PIPE-TITLE: a school whose titles[] records an NCAA D1/D2 national championship must sit
// in the ranked (titled) part of that pipeline table. Cal State LA and UC Charleston WV
// were filed under "No D2 title".
{
  const ranked = sec => { const a = []; for (const r of pipeAll[sec] || []) { if (r.sectionDivider) break; const s = tableSchool(r.school); if (s) a.push(s.id); } return a; };
  const R = { ncaaD1: ranked('ncaaD1'), ncaaD2: ranked('ncaaD2') };
  schools.forEach(s => (s.titles || []).forEach(t => {
    if (/NJCAA|pre-NCAA|Intercollegiate Soccer|ISFA|runner|semifinal|appearance/i.test(t)) return;
    if (!/NCAA (D1|DI|Division I|D2|DII|Division II)\b[^;]*Champions?\b|\b\d{4} NCAA National Champions\b/i.test(t)) return;
    const sec = /\b(D2|DII|Division II)\b/.test(t) ? 'ncaaD2' : 'ncaaD1';
    if (!R[sec].includes(s.id)) note('PIPE-TITLE', `${s.id} title "${t.slice(0, 60)}" but the school is not in the ranked part of pipeline.json ${sec}`);
  }));
}

// DASH-LENS (code-shape guard): the Dashboard lens row must read lens scores through the
// shared accessor. Reading lensScores directly ranked every school 0 on Climate-Neutral.
{
  const dash = fs.readFileSync(path.join(ROOT, 'js/dashboard.js'), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  if (/lensScores\?\.\[L\.key\]\s*\|\|\s*0\)\s*-/.test(dash) || !/function dashLensScore\s*\(/.test(dash)) note('DASH-LENS', 'js/dashboard.js updateLensRow() must use dashLensScore()/lensValue(), not lensScores[L.key] directly');
}

// ── RISK (added v45.55): Entry Competition label follows one written rule ──
// recruit_risk renders as Crowded / Moderate / Open. It counts the midfielders still
// on the roster in the recruit's first season (mf_total − cleared_before_2027):
// 7+ High, 3–6 Medium, 0–2 Low. Before v45.55 half the values were hand-set judgments
// and the glossary described the opposite meaning.
const riskMismatches = [];
schools.forEach(s => {
  const mo = s.minutesOutlook;
  if (!mo || !mo.available || typeof mo.mf_total !== 'number') return;
  const ret = mo.mf_total - (mo.cleared_before_2027 || 0);
  const want = ret >= 7 ? 'High' : ret >= 3 ? 'Medium' : 'Low';
  if (mo.recruit_risk !== want) riskMismatches.push(`${s.id} (${s._file}): recruit_risk '${mo.recruit_risk}', rule gives '${want}' (${ret} returning)`);
});
if (riskMismatches.length) {
  note('RISK', `${riskMismatches.length} schools whose recruit_risk does not follow the returning-midfielder rule:`);
  riskMismatches.forEach(m => note('RISK', '  ' + m));
}

// Shared by COSTSTR and PROSE. A rule about what the CODE does must not be
// tripped by the comment that explains the rule — the clean baseline fired on
// this check's own explanatory comment until it was stripped (negative-tested).
const deComment = src => src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

// ── SHORTFIELDS (added v44.61): two card stats must not go back to parsing prose ──
// The card's "Soccer Level" and "Pre-PT Path" stats used to be produced by
// `u.soccerLevel.split('—')[0]` and `u.prePT.split('—')[0]`. Both fields are free
// prose, so the split returned whatever happened to sit before the first em-dash:
// seven schools rendered a bare DIVISION token the card already showed elsewhere
// ("D1", "D2", "NAIA", "JUCO" ×3), `denver` rendered a 60-character sentence into
// a compact stat, and four prePT values rendered a parenthetical
// ("Excellent (KIN 405 Pre-PT Prep required)"). Same defect class as the Max Aid
// tile (v44.50) and the `Target: Notre` GPA bug (v44.53).
//
// Fixed the way those were: short AUTHORED fields read directly. `prePTShort` is
// enum-locked, because its vocabulary is a real ordinal scale and a free-text
// value there would quietly reintroduce the problem.
//
// Two halves. The data half alone would pass while someone rewired the renderer
// back to the prose field, so the second greps both renderers — the code-shape
// guard MAXAID, CHIPS and COSTSTR all needed.
const PREPT_SCALE = new Set(['Outstanding', 'Excellent', 'Very Strong', 'Strong',
  'Good', 'Foundation', 'Poor', 'Transfer Pathway']);
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const sl = s.soccerLevelShort;
  if (typeof sl !== 'string' || !sl.trim()) note('SHORTFIELDS', `${s.id} missing soccerLevelShort (added v44.61 — the card stat reads it directly; do NOT go back to splitting soccerLevel)`);
  else if (sl.length > 24) note('SHORTFIELDS', `${s.id} soccerLevelShort is ${sl.length} chars ("${sl}") — it renders into a compact stat slot, keep it ≤24`);
  const pp = s.prePTShort;
  if (typeof pp !== 'string' || !pp.trim()) note('SHORTFIELDS', `${s.id} missing prePTShort (added v44.61)`);
  else if (!PREPT_SCALE.has(pp)) note('SHORTFIELDS', `${s.id} prePTShort="${pp}" is not on the scale (${[...PREPT_SCALE].join(' | ')}) — put any qualifier in the long prePT field instead`);
});
for (const [file, src] of [['js/app.js', deComment(appjs)], ['js/dashboard.js', deComment(fs.readFileSync(path.join(ROOT, 'js/dashboard.js'), 'utf8'))]]) {
  if (/\b(soccerLevel|prePT)\s*\.\s*split\s*\(/.test(src)) {
    note('SHORTFIELDS', `${file} splits soccerLevel/prePT prose for a displayed value — read soccerLevelShort / prePTShort instead (v44.61).`);
  }
}

// ── COSTSTR (added v44.60): the deleted cost display strings must not come back ──
// `u.cost` (111 schools) and `fin.cost` (5) were free-text display strings like
// "~$52k/yr". Nothing rendered them: costDisplay() only fell back to u.cost when
// costNum was undefined, which never happened, and fin.cost had no reader at all.
// Because nothing read them they drifted silently — after the v44.56-59 cost
// campaign 50 of 111 were more than $4k out, and `tulsa` carried THREE different
// costs (u.cost "~$45k", fin.cost "~$70k", costNum $77,346). Same silent-drift
// class as coaches.json.url. Both fields were deleted in v44.60; cost is derived
// from costNum alone.
//
// Two halves, and the second is what makes it durable: the data check alone would
// pass while someone reintroduced the renderer fallback, so this also greps app.js
// for `u.cost` — the same code-shape guard MAXAID and CHIPS needed.
const costStrSchools = schools.filter(s => s.cost !== undefined || (s.fin && s.fin.cost !== undefined))
  .map(s => `${s.id} (${s._file})`);
if (costStrSchools.length) {
  note('COSTSTR', `${costStrSchools.length} schools reintroduced a free-text cost string (u.cost / fin.cost) — deleted in v44.60, derive from fin.costNum instead:`);
  costStrSchools.forEach(m => note('COSTSTR', '  ' + m));
}
if (/\bu\.cost\b(?!Num)/.test(deComment(appjs))) {
  note('COSTSTR', 'js/app.js references u.cost — the deleted display string. costDisplay() must derive from fin.costNum alone (v44.60).');
}

// ── PROSE (added v44.44): UI copy that hard-codes a school/roster fact ────────
// Why this exists: the v44.42 roster refresh silently falsified two live panels,
// and NOTHING could see it. Every other check in this file reads JSON; the
// Explore section intros and the Minutes Outlook key are string literals inside
// js/app.js, so a data change can contradict them indefinitely. Two real cases:
//   • CONF_SECTIONS 'asun' said UCA had "6 of 9 MFs clearing before Olivier
//     arrives"; that same session's refresh made it 0 of 9 (opp 0.0, fit 61→43).
//   • The Minutes Outlook key was written in a 2025 roster's class years
//     ("2025 Jr → graduate after 2026 → cleared"), which INVERTS once a school
//     moves to a 2026-27 roster — a 2026-27 junior is a 2027 senior, not cleared.
// Plus two long-lived ones: 'big-ten' named USC and the Glossary names UF, neither
// of which fields a team in this guide, and six intros still used the pre-v25
// "listed programs" framing after every school became full-profile.
//
// Scope discipline: only assertions that can be mechanically checked against the
// data are flagged. Prose is judgment-heavy and a noisy check gets ignored (the
// same reason §15 explicitly refuses a dead-URL CI check), so nothing here fires
// on style — only on a number or a name that the data contradicts.
const indexhtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// Strip whole-line `//` comments before scanning: a comment explaining a past
// copy bug legitimately QUOTES the bad phrasing (the fix note in
// renderMinutesOutlook does exactly that) and must not re-trip check C. Only
// full-line comments are dropped, so `https://` inside a string is untouched.
const PROSE_SOURCES = [['js/app.js', deComment(appjs)], ['index.html', deComment(indexhtml)]];

// A. CONF_SECTIONS intros: a claimed program count must match the real one.
const sectionBlock = appjs.slice(appjs.indexOf('const CONF_SECTIONS=['));
const sectionEnd = sectionBlock.indexOf('\n  ];');
for (const m of sectionBlock.slice(0, sectionEnd).matchAll(/\{key:'([^']+)'(?:,\s*divFilter:'([^']+)')?[^}]*?intro:'((?:[^'\\]|\\.)*)'/g)) {
  const [, key, divFilter, intro] = m;
  const actual = schools.filter(s => s.confKey === key && (!divFilter || s.div === divFilter)).length;
  // (?<![-\w]) keeps "perennial top-10 programs" from reading as a count claim.
  for (const c of intro.matchAll(/(?<![-\w])(\d+)\s+(?:fully[- ]profiled\s+)?(?:programs?|schools?)\b/gi)) {
    if (parseInt(c[1], 10) !== actual) {
      note('PROSE', `CONF_SECTIONS '${key}' intro claims ${c[1]} programs but the section holds ${actual} — "${c[0]}"`);
    }
  }
  if (/\blisted programs?\b/i.test(intro)) {
    note('PROSE', `CONF_SECTIONS '${key}' intro still uses the retired "listed programs" framing — every school has been full-profile since v25`);
  }
}

// B. Any "N of M MFs" roster claim in UI copy must match a real school.
for (const [file, src] of PROSE_SOURCES) {
  for (const m of src.matchAll(/(\d+)\s+of\s+(\d+)\s+MFs?\b/gi)) {
    const [cleared, total] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    const hit = schools.some(s => s.minutesOutlook && s.minutesOutlook.mf_total === total
      && s.minutesOutlook.cleared_before_2027 === cleared);
    if (!hit) note('PROSE', `${file} asserts "${m[0]}" but no school has mf_total=${total} with cleared_before_2027=${cleared} — stale after a roster refresh`);
  }
}

// C. Copy must not be written against a SCRAPE season's class years. The stored
// buckets (cleared_before_2027 / rising_senior_2027 / rising_junior_2027) are
// already normalised to Olivier's entry year whatever season was scraped, so
// prose should describe those. "2027 seniors" is fine — that IS the bucket.
for (const [file, src] of PROSE_SOURCES) {
  for (const m of src.matchAll(/\b20\d{2}\s+(?:Sr|Jr|So|Fr)\b\.?|based on 20\d{2} rosters?/gi)) {
    note('PROSE', `${file} hard-codes a roster season's class years — "${m[0]}". Write copy against the normalised 2027 buckets instead; this phrasing inverts when a school is refreshed onto a newer roster.`);
  }
}

// D. Phantom anchors — schools named in prose that are not in the guide at all.
// Explicit list rather than fuzzy name-matching, so it cannot false-positive on
// clubs, cities, hospitals or conferences (all of which legitimately appear).
// ADD TO THIS LIST whenever a phantom is found; both entries below were real.
// The lookaheads are load-bearing: "USC Upstate" and "USC Aiken" are REAL schools
// that legitimately appear as previous-school names in recruit_pathway_note text.
// "Sumter/Lancaster/Salkehatchie/Union" are the guide's Region 10 JUCO additions
// (Batch 9, v44.80) — all four real USC regional campuses now in the guide.
const PHANTOM_SCHOOLS = [
  [/\bUSC\b(?!\s+(?:Upstate|Aiken|Beaufort|Sumter|Lancaster|Salkehatchie|Union))/,
    'USC — fields no team in this guide (removed from the big-ten intro, v44.43)'],
  [/\bUF\b(?!\s*[—-]\s*academic reference)/,
    'UF — Florida fields no men\'s soccer program (CLAUDE.md §5a flags this in the Glossary)'],
];
// SCOPE: js/app.js and index.html ONLY — do NOT broaden this to data/*.json.
// Three legitimate hits live there and would all become false positives:
// conferences.json correctly states that USC joined the Big Ten in 2024 (a true
// fact about the conference, not a claim the school is in the guide); its
// otherSchools[] carries an explicit, correct "⚠ UF — academic reference only
// (no men's varsity soccer)" chip; and several recruit_pathway_note strings name
// USC Upstate / USC Aiken as real transfer origins.
for (const [file, src] of PROSE_SOURCES) {
  for (const [re, why] of PHANTOM_SCHOOLS) {
    if (re.test(src)) note('PROSE', `${file} names ${why}`);
  }
}

// ── CHIPS (added v44.45): every school must land in a conference filter chip ──
// The Explore conference filter row is built by renderFilterChips() from each
// school's `conf` string via resolveConfGroup(). Two silent failure modes, both
// real and both found by the owner eyeballing the row rather than by any check:
//   • An unmapped conference produced a key no chip rendered, so the school was
//     invisible in the row AND unfilterable. Six schools were in this state
//     (army, navy, delaware, mercyhurst, uc_charleston, columbia_college) and
//     the row summed to 105 of 111 with nothing reporting the gap.
//   • A substring alias collision mis-filed a school into the WRONG chip: UCA's
//     conf is "ASUN Conference", and the old bare .includes() matched the longer
//     alias "sun conference" inside "a|sun conference|", filing a D1 ASUN school
//     under the NAIA Sun Conference. Wrong counts on BOTH chips, and nothing
//     looked broken — the row still added up.
// This check mirrors resolveConfGroup() exactly, so it fails if either recurs.
const aliasBlock = appjs.slice(appjs.indexOf('const CONF_ALIAS_MAP = {'));
const CONF_ALIAS = {};
for (const m of aliasBlock.slice(0, aliasBlock.indexOf('\n};')).matchAll(/'([^']+)':\s*'([^']+)'/g)) CONF_ALIAS[m[1]] = m[2];
const labelBlock = appjs.slice(appjs.indexOf('const CONF_CHIP_LABELS = {'));
const CONF_LABELS = {};
for (const m of labelBlock.slice(0, labelBlock.indexOf('\n};')).matchAll(/'([^']+)':\s*'([^']+)'/g)) CONF_LABELS[m[1]] = m[2];
const orderBlock = appjs.slice(appjs.indexOf('const CONF_CHIP_ORDER = ['));
const CONF_ORDER = [...orderBlock.slice(0, orderBlock.indexOf('];')).matchAll(/'([^']+)'/g)].map(m => m[1]);

const aliasesByLen = Object.entries(CONF_ALIAS).sort((a, b) => b[0].length - a[0].length);
function resolveConfGroupMirror(conf) {
  const norm = (conf || '').toLowerCase().trim();
  if (CONF_ALIAS[norm]) return CONF_ALIAS[norm];
  const hit = aliasesByLen.find(([a]) => new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(norm));
  return hit ? hit[1] : norm.replace(/\s+/g, '-');
}
// resolveConfGroupMirror reimplements the intended matching rather than reading
// app.js's implementation, so it validates the DATA but is blind to the resolver
// itself regressing. Guard that directly: the bare .includes() form is the exact
// shape that caused the UCA/Sun Conference collision.
const resolverBody = appjs.slice(appjs.indexOf('function resolveConfGroup('), appjs.indexOf('function resolveConfGroup(') + 1200);
if (/\.find\(\(\[alias\]\)\s*=>\s*norm\.includes\(alias\)\)/.test(resolverBody)) {
  note('CHIPS', 'resolveConfGroup() matches aliases with bare norm.includes() — substring collision risk. "sun conference" matches inside "asun conference" and mis-files UCA into the NAIA Sun Conference chip (v44.45). Use word-boundary matching.');
}
if (!Object.keys(CONF_ALIAS).length || !CONF_ORDER.length) {
  note('CHIPS', 'could not parse CONF_ALIAS_MAP / CONF_CHIP_ORDER out of js/app.js — this check is not running');
} else {
  const chipCounts = {};
  schools.forEach(s => {
    const key = resolveConfGroupMirror(s.conf);
    chipCounts[key] = (chipCounts[key] || 0) + 1;
    if (!CONF_LABELS[key]) note('CHIPS', `${s.id} (${s._file}) conf='${s.conf}' resolves to '${key}' which has no CONF_CHIP_LABELS entry — no filter chip, school unfilterable by conference`);
    else if (!CONF_ORDER.includes(key)) note('CHIPS', `${s.id} (${s._file}) resolves to '${key}' which is labelled but missing from CONF_CHIP_ORDER`);
  });
  const charted = CONF_ORDER.filter(k => chipCounts[k]).reduce((a, k) => a + chipCounts[k], 0);
  if (charted !== schools.length) note('CHIPS', `conference chips account for ${charted} schools but the guide holds ${schools.length}`);
  // Division sanity: a chip should not mix divisions — that is what the UCA/Sun
  // Conference collision looked like from the outside.
  Object.keys(chipCounts).filter(k => CONF_LABELS[k]).forEach(k => {
    const divs = [...new Set(schools.filter(s => resolveConfGroupMirror(s.conf) === k).map(s => s.div))];
    if (divs.length > 1) note('CHIPS', `chip '${CONF_LABELS[k]}' mixes divisions ${divs.join('/')} — likely an alias collision (see UCA/Sun Conference, v44.45)`);
  });
}

// ── prestige rank sequence ──
const pr = prestige.map(p => p.rank).sort((a, b) => a - b);
for (let i = 0; i < pr.length; i++) if (pr[i] !== i + 1) { note('PRESTIGE', `conf-prestige rank sequence broken at ${pr[i]}`); break; }

// ── report ──
console.log(`Schools: ${schools.length}, Coaches: ${coaches.length}, Conferences: ${conferences.length}, Prestige rows: ${prestige.length}`);
const devTotal = schools.filter(s => s.profileDepth === 'full' && s.devScores).length;
console.log(`Dev rubric (§5a): ${devRebaselined}/${devTotal} re-baselined · ${devLegacyOverCeiling} legacy schools still above their division ceiling (backlog, not counted as issues)`);
console.log(`Coach rubric (§5d): ${coachRescored}/${coaches.length} re-scored · ${coachLegacy} legacy pending (backlog, not counted as issues)`);
console.log(`confRecord: ${confRecordBacklog} schools with a run of >=3 repeated generic labels — unresearched conference history (backlog, not counted as issues)`);
console.log(`Issues: ${issues.length}  (July 2026 baseline: 174 — see CLAUDE.md §6 v36 backlog; must never increase, target zero)`);
issues.forEach(i => console.log(i));
