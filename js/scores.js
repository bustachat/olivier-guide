// ═══════════════════════════════════════════════════════════════════════
// scores.js  —  Fit Score Calculator
// Soccer Priority is the only Fit Score (v37.1) — GPA, Cost, and ACU
// Alignment are deliberately excluded. They already have dedicated views
// elsewhere (ATAR/budget toggles, Financial Model, ACU Alignment tab) and
// can't be predicted ahead of a real offer, so they don't belong blended
// into "how good a soccer/lifestyle opportunity is this."
// ═══════════════════════════════════════════════════════════════════════

// ── ATAR → GPA Conversion ───────────────────────────────────────────────────
// Still used to drive the GPA-eligibility toggle/filter on Explore — just
// no longer feeds the Fit Score itself.
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

// ── Dev score average ────────────────────────────────────────────────────────
function calcDevAvg(school) {
  if (!school.devScores) return 0;
  const vals = Object.values(school.devScores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ── Soccer program quality — dev scores + MLS pipeline + division strength ──
const DIV_STRENGTH = { D1: 1.0, IVY: 0.9, D2: 0.8, NAIA: 0.65, D3: 0.5, JUCO: 0.6 };

function soccerQualityScore(school) {
  const devAvg = calcDevAvg(school) / 100;
  const mlsFactor = Math.min(1, ((school.proPlayers && school.proPlayers.mlsPicks5yr) || 0) / 10);
  const divStrength = DIV_STRENGTH[school.div] || 0.5;
  return (devAvg * 0.6) + (mlsFactor * 0.3) + (divStrength * 0.1);
}

// ── Housing penalty (added v41.0, owner-approved) ────────────────────────────
// On-campus housing is a feasibility issue for a 17-18yo international —
// no dorms means sourcing off-campus rent, transport, and utilities alone in
// a foreign country. Flat deduction after the weighted total: −6 when the
// school has no on-campus housing, −3 when housing exists but is limited /
// unguaranteed (first-come-first-served, waitlisted). available:true costs
// nothing. A missing housing field also costs nothing here, but the field is
// required on every full profile since v41 (enforced by validate_consistency.js),
// so "absent" can only mean a data error the validator will flag anyway.
function housingPenalty(school) {
  const h = school.facilityDetails && school.facilityDetails.housing;
  if (!h) return 0;
  if (h.available === false) return 6;
  if (h.available === 'limited') return 3;
  return 0;
}

// ── MAIN: Calculate Fit Score ────────────────────────────────────────────────
// Returns 0–100 integer. Soccer Program Quality 40% + Minutes Outlook 35% +
// Climate 15% + City 10% (weights in athletes/olivier.json scoreWeights),
// minus the flat housing penalty (v41.0) — see housingPenalty() above.
// Same formula for JUCO and non-JUCO — ACU was never in it, so there's
// nothing to redistribute.
function calculateFitScore(school, athlete) {
  const w = athlete.scoreWeights || { soccerQuality: 40, minutesOutlook: 35, climate: 15, city: 10 };
  const components = {
    soccerQuality:  soccerQualityScore(school)    * w.soccerQuality,
    minutesOutlook: minutesOutlookScore(school)   * w.minutesOutlook,
    climate:        climateScore(school, athlete) * w.climate,
    city:           cityScore(school, athlete)    * w.city,
  };
  const total = Object.values(components).reduce((a, b) => a + b, 0);
  return Math.min(100, Math.max(0, Math.round(total) - housingPenalty(school)));
}

// ── Recalculate all scores and update cards ──────────────────────────────────
// Called on load (initApp) and whenever ATAR slider moves. convertedGpa no
// longer feeds the Fit Score, but the slider still drives the GPA-eligibility
// toggle/filter separately (see refreshAllGpaRows / dynamicGpaStatus in app.js).
function recalculateAllScores(athlete) {
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
    const newFit = calculateFitScore(school, athlete);

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
