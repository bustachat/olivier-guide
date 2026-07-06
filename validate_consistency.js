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
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const mo = s.minutesOutlook;
  if (!mo) { note('MO', `${s.id} missing minutesOutlook`); return; }
  if (mo.available) {
    if (!Array.isArray(mo.trajectory) || !mo.trajectory.length) note('MO', `${s.id} available:true but no trajectory`);
    if (mo.recruit_risk && !['Low', 'Medium', 'High'].includes(mo.recruit_risk)) note('MO', `${s.id} recruit_risk='${mo.recruit_risk}' — renderers only understand Low|Medium|High; this displays as green 'Open'`);
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
if (sumW(athlete.scoreWeightsBase) !== 100) note('WEIGHTS', `scoreWeightsBase sum=${sumW(athlete.scoreWeightsBase)}`);
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

// ── fitOlivier recompute (With Minutes mode, GPA 2.8) — mirrors scores.js exactly ──
function costScore(s) {
  if (!s.fin || !s.fin.costNum) return 0.5;
  const budgetUSD = athlete.budgetAUD / athlete.fxRate; const r = s.fin.costNum / budgetUSD;
  const A = [[0, 1], [0.4, 1], [0.6, 0.9], [0.8, 0.75], [1, 0.55], [1.2, 0.3], [1.4, 0.1]];
  if (r <= A[0][0]) return A[0][1]; if (r >= A[A.length - 1][0]) return A[A.length - 1][1];
  for (let i = 0; i < A.length - 1; i++) { const [r1, s1] = A[i], [r2, s2] = A[i + 1]; if (r >= r1 && r <= r2) { const t = (r - r1) / (r2 - r1); return parseFloat((s1 + t * (s2 - s1)).toFixed(4)); } }
  return 0.1;
}
function moScore(s) {
  const mo = s.minutesOutlook; if (!mo || !mo.available) return 0.5; const t = mo.trajectory; if (!t || !t.length) return 0.5;
  const y1 = (t[0] ? t[0].pct : 50) / 100, y2 = (t[1] ? t[1].pct : t[0].pct) / 100; return Math.min(1, y1 * 0.6 + y2 * 0.4);
}
function effW(s) {
  const w = athlete.scoreWeights; if (s.div !== 'JUCO') return w; const acuW = w.acuAlignment || 0; if (!acuW) return w;
  const out = Object.assign({}, w, { acuAlignment: 0 });
  if ((w.minutesOutlook || 0) > 0) { out.minutesOutlook = (w.minutesOutlook || 0) + acuW / 2; out.climate = (w.climate || 0) + acuW / 2; } else out.climate = (w.climate || 0) + acuW;
  return out;
}
const wantsWarm = athlete.lifestylePrefs.includes('warm'), wantsCity = athlete.lifestylePrefs.includes('city');
const fitMismatches = [];
schools.filter(s => s.profileDepth === 'full').forEach(s => {
  const w = effW(s);
  const soccer = (athlete.soccerLevelMap || {})[s.div] ?? 0.5;
  const g = gpaStatus(2.8, s.gpa ? s.gpa.minEntry : null); const gsc = g === 'eligible' ? 1 : g === 'borderline' ? 0.5 : 0;
  const total = soccer * w.soccerLevel + gsc * w.gpaEligibility + costScore(s) * w.cost + ((s.acuAlign || 0) / (athlete.auUnitsTotal || 16)) * w.acuAlignment
    + moScore(s) * (w.minutesOutlook || 0) + (wantsCity ? (s.city ? 1 : 0.3) : 1) * w.city + (wantsWarm ? (s.warm ? 1 : 0.2) : 1) * (w.climate || 0);
  const fit = Math.min(100, Math.max(0, Math.round(total)));
  if (Math.abs(fit - (s.fitOlivier || 0)) > 1) fitMismatches.push(`${s.id} (${s._file}): stored ${s.fitOlivier}, live formula ${fit}`);
});
if (fitMismatches.length) {
  note('FIT', `${fitMismatches.length} schools where stored fitOlivier differs >1 from the live scores.js formula (scores jump when the mode toggle is touched):`);
  fitMismatches.forEach(m => note('FIT', '  ' + m));
}

// ── prestige rank sequence ──
const pr = prestige.map(p => p.rank).sort((a, b) => a - b);
for (let i = 0; i < pr.length; i++) if (pr[i] !== i + 1) { note('PRESTIGE', `conf-prestige rank sequence broken at ${pr[i]}`); break; }

// ── report ──
console.log(`Schools: ${schools.length}, Coaches: ${coaches.length}, Conferences: ${conferences.length}, Prestige rows: ${prestige.length}`);
console.log(`Issues: ${issues.length}  (July 2026 baseline: 174 — see CLAUDE.md §6 v36 backlog; must never increase, target zero)`);
issues.forEach(i => console.log(i));
