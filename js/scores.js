// ═══════════════════════════════════════════════════════════════════════
// scores.js  —  Dynamic Fit Score Calculator
// Calculates personalised fit scores for each school against an
// athlete profile. Called on load and whenever ATAR slider moves.
// ═══════════════════════════════════════════════════════════════════════

// ── ATAR → GPA Conversion ───────────────────────────────────────────────────
const ATAR_GPA_TABLE = [
  [99, 4.0], [95, 3.9], [90, 3.7], [85, 3.5], [80, 3.3],
  [75, 3.0], [70, 2.8], [65, 2.6], [60, 2.4], [55, 2.2],
  [50, 2.0], [45, 1.8], [40, 1.5]
];

function atarToGpa(atar) {
  const val = Math.max(40, Math.min(99, atar));
  for (let i = 0; i < ATAR_GPA_TABLE.length - 1; i++) {
    const [a1, g1] = ATAR_GPA_TABLE[i];
    const [a2, g2] = ATAR_GPA_TABLE[i + 1];
    if (val <= a1 && val >= a2) {
      const t = (val - a2) / (a1 - a2);
      return Math.round((g2 + t * (g1 - g2)) * 10) / 10;
    }
  }
  return 1.5;
}

// ── Parse school minimum GPA from string ────────────────────────────────────
function parseMinGpa(minEntry) {
  if (!minEntry) return 0;
  const s = minEntry.toLowerCase();
  if (s.includes('no minimum') || s.includes('open')) return 0;
  const m = minEntry.match(/(\d+\.\d+|\d+)/);
  return m ? parseFloat(m[1]) : 0;
}

// ── GPA eligibility status ───────────────────────────────────────────────────
function gpaStatus(convertedGpa, minEntry) {
  const min = parseMinGpa(minEntry);
  if (min === 0)                      return 'eligible';
  if (convertedGpa >= min)            return 'eligible';
  if (convertedGpa >= min - 0.3)      return 'borderline';
  return 'below';
}

// ── Cost score ───────────────────────────────────────────────────────────────
// Returns 0.0–1.0 based on annual USD cost vs athlete's AUD budget
function costScore(school, athlete) {
  if (!school.fin || !school.fin.costNum) return 0.5;
  const budgetUSD = athlete.budgetAUD / athlete.fxRate;
  // Full marks if cost ≤ 50% of budget (leaves room for scholarships)
  // Zero marks if cost > 130% of budget (unaffordable even with aid)
  const ratio = school.fin.costNum / budgetUSD;
  if (ratio <= 0.40) return 1.00;
  if (ratio <= 0.60) return 0.90;
  if (ratio <= 0.80) return 0.75;
  if (ratio <= 1.00) return 0.55;
  if (ratio <= 1.20) return 0.30;
  return 0.10;
}

// ── ACU alignment score ──────────────────────────────────────────────────────
function acuScore(school, athlete) {
  const total = athlete.auUnitsTotal || 16;
  return (school.acuAlign || 0) / total;
}

// ── Soccer level score ───────────────────────────────────────────────────────
function soccerScore(school, athlete) {
  const map = athlete.soccerLevelMap || {
    D1: 1.0, IVY: 0.9, D2: 0.8, NAIA: 0.65, D3: 0.5, JUCO: 0.6
  };
  return map[school.div] || 0.5;
}

// ── GPA eligibility score ────────────────────────────────────────────────────
// Uses the current ATAR-converted GPA (passed in, not from school data)
function gpaEligibilityScore(school, convertedGpa) {
  const minEntry = school.gpa ? school.gpa.minEntry : null;
  const status = gpaStatus(convertedGpa, minEntry);
  if (status === 'eligible')   return 1.0;
  if (status === 'borderline') return 0.5;
  return 0.0;   // below — hard penalty
}

// ── Pre-PT pathway score ─────────────────────────────────────────────────────
function ptScore(school, athlete) {
  const map = athlete.prePtMap || {
    'Excellent': 1.0, 'Very Strong': 0.9, 'Good': 0.75,
    'Solid': 0.6, 'Transfer Pathway': 0.4
  };
  const key = (school.prePT || '').split('—')[0].trim();
  // Try exact match first, then partial
  if (map[key] !== undefined) return map[key];
  for (const [k, v] of Object.entries(map)) {
    if (key.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return 0.5;
}

// ── Climate score ─────────────────────────────────────────────────────────────
function climateScore(school, athlete) {
  const wantsWarm = athlete.lifestylePrefs.includes('warm');
  if (!wantsWarm) return 1.0;       // climate not a concern — full marks
  return school.warm ? 1.0 : 0.2;  // small non-zero so cold schools aren't zeroed
}

// ── City score ────────────────────────────────────────────────────────────────
function cityScore(school, athlete) {
  const wantsCity = athlete.lifestylePrefs.includes('city');
  if (!wantsCity) return 1.0;
  return school.city ? 1.0 : 0.3;
}

// ── MAIN: Calculate fit score ────────────────────────────────────────────────
// Returns 0–100 integer.
// convertedGpa: the current ATAR-derived GPA from the slider (or athlete default)
function calculateFitScore(school, athlete, convertedGpa) {
  const w = athlete.scoreWeights;

  const components = {
    soccerLevel:    soccerScore(school, athlete)        * w.soccerLevel,
    gpaEligibility: gpaEligibilityScore(school, convertedGpa) * w.gpaEligibility,
    cost:           costScore(school, athlete)           * w.cost,
    acuAlignment:   acuScore(school, athlete)            * w.acuAlignment,
    city:           cityScore(school, athlete)           * w.city,
    ptPath:         ptScore(school, athlete)             * w.ptPath,
    climate:        climateScore(school, athlete)        * w.climate,
  };

  const total = Object.values(components).reduce((a, b) => a + b, 0);
  return Math.min(100, Math.max(0, Math.round(total)));
}

// ── Dev score average ────────────────────────────────────────────────────────
function calcDevAvg(school) {
  if (!school.devScores) return 0;
  const vals = Object.values(school.devScores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ── Recalculate all scores and update cards ──────────────────────────────────
// Called on load and whenever ATAR slider moves
function recalculateAllScores(athlete, convertedGpa) {
  const container = document.getElementById('cards-container');
  if (!container || !unis.length || !athlete) {
    console.warn('recalculateAllScores: missing', {
      hasContainer: !!container,
      unisCount: unis.length,
      hasAthlete: !!athlete
    });
    return;
  }

  unis.forEach(school => {
    const newFit = calculateFitScore(school, athlete, convertedGpa);

    // Target by specific id — most reliable
    const valEl = document.getElementById('fit-' + school.id);
    if (valEl) {
      valEl.textContent = newFit + '%';
      valEl.style.color = sc(newFit);
    }

    // Also store on card element for compare/modal use
    const card = document.getElementById('card-' + school.id);
    if (card) card.dataset.fitscore = newFit;
  });
}

// ── Score breakdown tooltip (for Detail modal) ───────────────────────────────
function buildScoreBreakdown(school, athlete, convertedGpa) {
  const w = athlete.scoreWeights;
  const rows = [
    ['⚽ Soccer Level',    soccerScore(school, athlete),        w.soccerLevel],
    ['🎓 GPA Eligibility', gpaEligibilityScore(school, convertedGpa), w.gpaEligibility],
    ['💰 Annual Cost',     costScore(school, athlete),          w.cost],
    ['📚 ACU Alignment',   acuScore(school, athlete),           w.acuAlignment],
    ['🏙 City Campus',     cityScore(school, athlete),          w.city],
    ['🏥 PT/Chiro Path',   ptScore(school, athlete),            w.ptPath],
    ['☀ Climate',         climateScore(school, athlete),        w.climate],
  ];

  let html = '<div style="background:var(--surface2);border-radius:10px;padding:.85rem 1rem;margin-top:.75rem">';
  html += '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--hint);margin-bottom:.6rem">Score Breakdown</div>';
  html += '<table style="width:100%;font-size:11px;border-collapse:collapse">';
  html += '<tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:3px 0;color:var(--hint);font-weight:700">Factor</th><th style="text-align:right;padding:3px 0;color:var(--hint);font-weight:700">Weight</th><th style="text-align:right;padding:3px 0;color:var(--hint);font-weight:700">Score</th><th style="text-align:right;padding:3px 0;color:var(--hint);font-weight:700">Points</th></tr>';

  let total = 0;
  rows.forEach(([label, factor, weight]) => {
    const points = Math.round(factor * weight * 10) / 10;
    total += points;
    const pct = Math.round(factor * 100);
    const color = pct >= 80 ? 'var(--emerald)' : pct >= 50 ? 'var(--amber)' : 'var(--rose)';
    html += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:4px 0">${label}</td>
      <td style="text-align:right;padding:4px 0;color:var(--muted)">${weight}%</td>
      <td style="text-align:right;padding:4px 0;color:${color}">${pct}%</td>
      <td style="text-align:right;padding:4px 0;font-weight:700">${points.toFixed(1)}</td>
    </tr>`;
  });

  html += `<tr><td colspan="3" style="padding:5px 0;font-weight:700">Total Fit Score</td><td style="text-align:right;padding:5px 0;font-weight:800;color:${sc(Math.round(total))}">${Math.round(total)}/100</td></tr>`;
  html += '</table></div>';
  return html;
}
