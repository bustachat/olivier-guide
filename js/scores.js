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
// Returns 0.0–1.0 based on annual USD cost vs athlete's AUD budget.
// Uses linear interpolation between anchor points — no score cliffs at boundaries.
// A school costing 1% more than a threshold no longer loses 15 fit points.
function costScore(school, athlete) {
  if (!school.fin || !school.fin.costNum) return 0.5;
  const budgetUSD = athlete.budgetAUD / athlete.fxRate;
  const ratio = school.fin.costNum / budgetUSD;

  // [cost/budget ratio, score] anchor points
  const anchors = [
    [0.00, 1.00],
    [0.40, 1.00],
    [0.60, 0.90],
    [0.80, 0.75],
    [1.00, 0.55],
    [1.20, 0.30],
    [1.40, 0.10],
  ];

  if (ratio <= anchors[0][0]) return anchors[0][1];
  if (ratio >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [r1, s1] = anchors[i];
    const [r2, s2] = anchors[i + 1];
    if (ratio >= r1 && ratio <= r2) {
      const t = (ratio - r1) / (r2 - r1);
      return parseFloat((s1 + t * (s2 - s1)).toFixed(4));
    }
  }
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

// ── Minutes Outlook score ─────────────────────────────────────────────────────
// Returns 0.0–1.0. Neutral (0.5) when data unavailable — not penalised.
// Weights entry year (Yr1) 60%, second year (Yr2) 40%.
function minutesOutlookScore(school) {
  const mo = school.minutesOutlook;
  if (!mo || !mo.available) return 0.5;
  const t = mo.trajectory;
  if (!t || !t.length) return 0.5;
  const yr1 = (t[0] ? t[0].pct : 50) / 100;
  const yr2 = (t[1] ? t[1].pct : t[0].pct) / 100;
  return Math.min(1.0, yr1 * 0.6 + yr2 * 0.4);
}

// ── JUCO weight override ─────────────────────────────────────────────────────
// JUCO degrees are a 2-year stepping stone, not the actual pathway-relevant
// credential — ACU alignment doesn't meaningfully measure JUCO fit. Zero it
// out and redistribute to Minutes Outlook (if active) and Climate.
function effectiveWeights(school, athlete) {
  const w = athlete.scoreWeights;
  if (school.div !== 'JUCO') return w;
  const acuW = w.acuAlignment || 0;
  if (!acuW) return w;
  const hasMinutes = (w.minutesOutlook || 0) > 0;
  const out = Object.assign({}, w, { acuAlignment: 0 });
  if (hasMinutes) {
    out.minutesOutlook = (w.minutesOutlook || 0) + acuW / 2;
    out.climate = (w.climate || 0) + acuW / 2;
  } else {
    out.climate = (w.climate || 0) + acuW;
  }
  return out;
}

// ── MAIN: Calculate fit score ────────────────────────────────────────────────
// Returns 0–100 integer.
// convertedGpa: the current ATAR-derived GPA from the slider (or athlete default)
function calculateFitScore(school, athlete, convertedGpa) {
  const w = effectiveWeights(school, athlete);

  const components = {
    soccerLevel:    soccerScore(school, athlete)              * w.soccerLevel,
    gpaEligibility: gpaEligibilityScore(school, convertedGpa) * w.gpaEligibility,
    cost:           costScore(school, athlete)                * w.cost,
    acuAlignment:   acuScore(school, athlete)                 * w.acuAlignment,
    ptPath:         ptScore(school, athlete)                  * (w.ptPath || 0),
    minutesOutlook: minutesOutlookScore(school)               * (w.minutesOutlook || 0),
    city:           cityScore(school, athlete)                * w.city,
    climate:        climateScore(school, athlete)             * (w.climate || 0),
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

// ── Soccer Priority mode (v37) ───────────────────────────────────────────────
// A third fit mode focused purely on soccer program quality + opportunity +
// lifestyle. GPA, Cost, and ACU Alignment are deliberately excluded — they
// already have dedicated views (ATAR/budget toggles, Financial Model,
// ACU Alignment tab) and can't be predicted ahead of a real offer anyway.
const DIV_STRENGTH = { D1: 1.0, IVY: 0.9, D2: 0.8, NAIA: 0.65, D3: 0.5, JUCO: 0.6 };

// Soccer program quality — dev scores + MLS pipeline + division strength.
// Deliberately richer than fitOlivier's div-only soccerScore().
function soccerQualityScore(school) {
  const devAvg = calcDevAvg(school) / 100;
  const mlsFactor = Math.min(1, ((school.proPlayers && school.proPlayers.mlsPicks5yr) || 0) / 10);
  const divStrength = DIV_STRENGTH[school.div] || 0.5;
  return (devAvg * 0.6) + (mlsFactor * 0.3) + (divStrength * 0.1);
}

function calculateSoccerPriorityFit(school, athlete) {
  const w = athlete.scoreWeightsSoccer || { soccerQuality: 40, minutesOutlook: 35, climate: 15, city: 10 };
  const components = {
    soccerQuality:  soccerQualityScore(school)    * w.soccerQuality,
    minutesOutlook: minutesOutlookScore(school)   * w.minutesOutlook,
    climate:        climateScore(school, athlete) * w.climate,
    city:           cityScore(school, athlete)    * w.city,
  };
  const total = Object.values(components).reduce((a, b) => a + b, 0);
  return Math.min(100, Math.max(0, Math.round(total)));
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
    const newFit = (typeof scoreMode !== 'undefined' && scoreMode === 'soccer')
      ? calculateSoccerPriorityFit(school, athlete)
      : calculateFitScore(school, athlete, convertedGpa);

    // Target by specific id — most reliable
    const valEl = document.getElementById('fit-' + school.id);
    if (valEl) {
      valEl.textContent = newFit + '%';
      valEl.style.color = sc(newFit);
    }

    // Write back to school object so sort reads updated score
    school.fitOlivier = newFit;

    // Also store on card element for compare/modal use
    const card = document.getElementById('card-' + school.id);
    if (card) card.dataset.fitscore = newFit;

    // If this school's modal is currently open, keep its displayed score in sync
    if (typeof currentModalId !== 'undefined' && currentModalId === school.id) {
      const modalFit = document.getElementById('modal-fit-score');
      if (modalFit) {
        modalFit.textContent = newFit + '%';
        modalFit.style.color = sc(newFit);
      }
    }
  });
}

// ── Score breakdown tooltip (for Detail modal) ───────────────────────────────
function buildScoreBreakdown(school, athlete, convertedGpa) {
  const w = effectiveWeights(school, athlete);
  const rows = [
    ['⚽ Soccer Level',    soccerScore(school, athlete),              w.soccerLevel],
    ['🎓 GPA Eligibility', gpaEligibilityScore(school, convertedGpa), w.gpaEligibility],
    ['💰 Annual Cost',     costScore(school, athlete),                w.cost],
    ['📚 ACU Alignment',   acuScore(school, athlete),                 w.acuAlignment],
    ['🏥 PT/Chiro Path',   ptScore(school, athlete),                  w.ptPath],
    ['⏱ Minutes Outlook', minutesOutlookScore(school),               w.minutesOutlook || 0],
    ['🏙 City Campus',     cityScore(school, athlete),                w.city],
    ['☀ Climate',         climateScore(school, athlete),              w.climate || 0],
  ].filter(([, , weight]) => weight > 0);

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
