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
const sectionKeys = new Set(['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'asun', 'mac', 'wac', 'wcc', 'america-east', 'nec', 'other']);
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
const MO_KEYS_AVAILABLE = new Set(['available', 'mf_total_2025', 'cleared_before_2027', 'cleared_names',
  'rising_senior_2027_count', 'rising_senior_2027_names', 'rising_junior_2027_count', 'rising_junior_2027_names',
  'recruit_risk', 'trajectory', 'trajectoryNote', 'recruit_pathway', 'recruit_pathway_note',
  'australianNote']); // australianNote: one-off narrative field, present in live data
const MO_KEYS_UNAVAILABLE = new Set(['available', 'note', 'reason']);
const MO_REQUIRED = ['mf_total_2025', 'cleared_before_2027', 'rising_senior_2027_count', 'rising_junior_2027_count', 'recruit_risk', 'trajectory'];
const TRAJ_KEYS = ['year', 'yr_label', 'pct', 'label'];
// Honest researched gaps, not bugs — tracked in CLAUDE.md §6 deferred items (v40.1): re-scrape Sept–Nov 2026.
// Renderers guard these with '—' since v40.1. Remove from this whitelist once researched.
const MO_MISSING_OK = new Set(['notredame:rising_senior_2027_count', 'georgetown:rising_senior_2027_count']);
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const mo = s.minutesOutlook;
  if (!mo) { note('MO', `${s.id} missing minutesOutlook`); return; }
  if (mo.available) {
    if (!Array.isArray(mo.trajectory) || !mo.trajectory.length) note('MO', `${s.id} available:true but no trajectory`);
    if (mo.recruit_risk && !['Low', 'Medium', 'High'].includes(mo.recruit_risk)) note('MO', `${s.id} recruit_risk='${mo.recruit_risk}' — renderers only understand Low|Medium|High; this displays as green 'Open'`);
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

// ── coaches ──
const ranks = coaches.map(c => c.rank).sort((a, b) => a - b);
for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) { note('COACH', `rank sequence broken at ${ranks[i]} (expected ${i + 1}); total ${coaches.length}`); break; }
coaches.forEach(c => {
  if (!idSet.has(c.schoolId)) note('COACH', `${c.name} schoolId '${c.schoolId}' not a school`);
  if (!['rk-elite', 'rk-strong', 'rk-solid'].includes(c.rankClass)) note('COACH', `${c.name} rankClass='${c.rankClass}'`);
  const s = schools.find(x => x.id === c.schoolId);
  if (s && s.coach && s.coach.name && s.coach.name !== c.name) note('COACH-SYNC', `${c.schoolId}: conf JSON coach '${s.coach.name}' vs coaches.json '${c.name}' — two-file rule violated`);
});
const coachSchoolIds = new Set(coaches.map(c => c.schoolId));
schools.filter(s => s.profileDepth === 'full' && !coachSchoolIds.has(s.id)).forEach(s => note('COACH', `${s.id} full-profile but no coaches.json entry`));

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

// ── fitOlivier recompute (Soccer Priority — the only Fit Score since v37.1) —
// mirrors scores.js's calculateFitScore()/soccerQualityScore() exactly ──
function calcDevAvg(s) {
  if (!s.devScores) return 0;
  const vals = Object.values(s.devScores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

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

const DIV_STRENGTH = { D1: 1.0, IVY: 0.9, D2: 0.8, NAIA: 0.65, D3: 0.5, JUCO: 0.6 };
function soccerQualityScore(s) {
  const devAvg = calcDevAvg(s) / 100;
  const mlsFactor = Math.min(1, ((s.proPlayers && s.proPlayers.mlsPicks5yr) || 0) / 10);
  const divStrength = DIV_STRENGTH[s.div] || 0.5;
  return (devAvg * 0.6) + (mlsFactor * 0.3) + (divStrength * 0.1);
}
function moScore(s) {
  const mo = s.minutesOutlook; if (!mo || !mo.available) return 0.5; const t = mo.trajectory; if (!t || !t.length) return 0.5;
  const y1 = (t[0] ? t[0].pct : 50) / 100, y2 = (t[1] ? t[1].pct : t[0].pct) / 100; return Math.min(1, y1 * 0.6 + y2 * 0.4);
}
const wantsWarm = athlete.lifestylePrefs.includes('warm'), wantsCity = athlete.lifestylePrefs.includes('city');
// mirrors scores.js housingPenalty() (v41.0): −6 no on-campus housing, −3 limited/unguaranteed
function housingPenalty(s) {
  const h = s.facilityDetails && s.facilityDetails.housing;
  if (!h) return 0;
  if (h.available === false) return 6;
  if (h.available === 'limited') return 3;
  return 0;
}
const fitMismatches = [];
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const w = athlete.scoreWeights;
  const total = soccerQualityScore(s) * w.soccerQuality + moScore(s) * w.minutesOutlook
    + (wantsCity ? (s.city ? 1 : 0.3) : 1) * w.city + (wantsWarm ? (s.warm ? 1 : 0.2) : 1) * w.climate;
  const fit = Math.min(100, Math.max(0, Math.round(total) - housingPenalty(s)));
  if (Math.abs(fit - (s.fitOlivier || 0)) > 1) fitMismatches.push(`${s.id} (${s._file}): stored ${s.fitOlivier}, live formula ${fit}`);
});
if (fitMismatches.length) {
  note('FIT', `${fitMismatches.length} schools where stored fitOlivier differs >1 from the live scores.js formula:`);
  fitMismatches.forEach(m => note('FIT', '  ' + m));
}

// ── prestige rank sequence ──
const pr = prestige.map(p => p.rank).sort((a, b) => a - b);
for (let i = 0; i < pr.length; i++) if (pr[i] !== i + 1) { note('PRESTIGE', `conf-prestige rank sequence broken at ${pr[i]}`); break; }

// ── report ──
console.log(`Schools: ${schools.length}, Coaches: ${coaches.length}, Conferences: ${conferences.length}, Prestige rows: ${prestige.length}`);
const devTotal = schools.filter(s => s.profileDepth === 'full' && s.devScores).length;
console.log(`Dev rubric (§5a): ${devRebaselined}/${devTotal} re-baselined · ${devLegacyOverCeiling} legacy schools still above their division ceiling (backlog, not counted as issues)`);
console.log(`confRecord: ${confRecordBacklog} schools with a run of >=3 repeated generic labels — unresearched conference history (backlog, not counted as issues)`);
console.log(`Issues: ${issues.length}  (July 2026 baseline: 174 — see CLAUDE.md §6 v36 backlog; must never increase, target zero)`);
issues.forEach(i => console.log(i));
