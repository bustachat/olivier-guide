// ═══════════════════════════════════════════════════════════════════════
// dashboard.js  —  Olivier Scholarship Guide v16
// Self-contained Dashboard tab module.
// Reads: unis[] / conferences[] / currentAtarGpa  (set by app.js)
// Own state: dashGpa, dashBudget, dashAthlete
// ═══════════════════════════════════════════════════════════════════════

let dashGpa    = 2.8;
let dashBudget = 55000;
let dashAthlete = {};

// Division dot colours — consistent with card colour system
const DASH_DIV_COLOR = {
  'D1':   '#4f46e5',
  'IVY':  '#7c3aed',
  'D2':   '#059669',
  'NAIA': '#d97706',
  'D3':   '#6b7280',
  'JUCO': '#9ca3af',
};

const CONF_LABELS = {
  'acc':      { label:'ACC',      tier:'Power 4' },
  'big-ten':  { label:'Big Ten',  tier:'Power 4' },
  'big-east': { label:'Big East', tier:'Major'   },
  'aac':      { label:'AAC',      tier:'Major'   },
  'big-west': { label:'Big West', tier:'Major'   },
  'caa':      { label:'CAA',      tier:'Mid'     },
  'other':    { label:'Other',    tier:'D2/NAIA' },
};

// ─── Reachability helper ──────────────────────────────────────────────────────
function dashReachable(school) {
  const gpaMin = parseFloat(school.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
  const costNum = school.fin?.costNum ?? 0;
  return dashGpa >= gpaMin && costNum <= dashBudget;
}

// ─── Entry point — called once from initApp() ─────────────────────────────────
async function renderDashboard() {
  const base = window.DATA_BASE_URL || './data/';
  try {
    const res = await fetch(base.replace('data/', '') + 'athletes/olivier.json');
    dashAthlete = await res.json();
  } catch (_) {
    dashAthlete = { budgetUSD: 55000, shortlist: [], defaultAtar: 70 };
  }

  dashBudget = dashAthlete.budgetUSD || 55000;
  dashGpa    = (typeof currentAtarGpa !== 'undefined') ? currentAtarGpa : (dashAthlete.currentGpa || 2.8);

  const el = document.getElementById('page-dashboard');
  if (!el) return;

  el.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:1.5rem 1rem">

      <!-- Sliders row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem 1.25rem">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.5rem">
            <span style="font-size:13px;font-weight:600;color:#1f2937">ATAR → GPA</span>
            <span style="font-size:12px;color:#6b7280">ATAR <strong id="dash-atar-display">70</strong> → GPA <strong id="dash-gpa-display">2.8</strong></span>
          </div>
          <p style="font-size:11.5px;color:#9ca3af;margin:0 0 .5rem">Uses same slider as main tab — move there to update</p>
          <div style="height:4px;background:#e5e7eb;border-radius:2px;position:relative">
            <div id="dash-atar-bar" style="height:4px;background:#4f46e5;border-radius:2px;width:50%"></div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem 1.25rem">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.5rem">
            <span style="font-size:13px;font-weight:600;color:#1f2937">Annual Budget</span>
            <span style="font-size:12px;color:#6b7280"><strong id="bud-display">$55k</strong> / yr</span>
          </div>
          <input id="bud-slider" type="range" min="20" max="90" step="5"
            value="${Math.round(dashBudget/1000)}"
            style="width:100%;accent-color:#4f46e5;margin:0">
          <div style="display:flex;justify-content:space-between;margin-top:2px">
            <span style="font-size:10px;color:#9ca3af">$20k</span>
            <span style="font-size:10px;color:#9ca3af">$90k</span>
          </div>
        </div>
      </div>

      <!-- Stat strip -->
      <div id="dash-stat-strip" style="display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.5rem"></div>

      <!-- Shortlist -->
      <div style="margin-bottom:1.5rem">
        <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">Shortlist</h3>
        <div id="dash-shortlist" style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem"></div>
      </div>

      <!-- Lens chips -->
      <div style="margin-bottom:1.5rem">
        <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">Best per Lens</h3>
        <div id="dash-lens-chips" style="display:flex;flex-wrap:wrap;gap:.5rem"></div>
      </div>

      <!-- Conference strip -->
      <div style="margin-bottom:1.5rem">
        <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">Conferences</h3>
        <div id="dash-conf-strip" style="display:grid;grid-template-columns:repeat(7,1fr);gap:.75rem"></div>
      </div>

      <!-- Map + Brackets row -->
      <div style="display:grid;grid-template-columns:3fr 2fr;gap:1.5rem">
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem">
          <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">School Map</h3>
          <svg id="dash-map-svg" viewBox="0 0 500 300" style="width:100%;border-radius:8px;background:#f0f4f8"></svg>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem">
          <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .75rem">Cost Brackets</h3>
          <div id="dash-brackets" style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;height:220px"></div>
        </div>
      </div>

    </div>`;

  // Budget slider handler
  document.getElementById('bud-slider').addEventListener('input', function () {
    dashBudget = parseInt(this.value) * 1000;
    document.getElementById('bud-display').textContent = '$' + this.value + 'k';
    updateDashboard();
  });

  drawMapBase();
  updateDashboard();
}

// ─── Called when ATAR slider moves (hooked in app.js onAtarSlide) ─────────────
function syncDashGpa(gpa) {
  dashGpa = gpa;
  if (document.getElementById('dash-gpa-display')) updateDashboard();
}

// ─── Master update — calls all sub-renderers ──────────────────────────────────
function updateDashboard() {
  updateAtarReadout();
  updateStatStrip();
  updateShortlist();
  updateLensChips();
  updateConfStrip();
  updateMapDots();
  updateBrackets();
}

function updateAtarReadout() {
  const atar = parseInt(document.getElementById('atar-slider')?.value || 70);
  const gpaEl  = document.getElementById('dash-gpa-display');
  const atarEl = document.getElementById('dash-atar-display');
  const bar    = document.getElementById('dash-atar-bar');
  if (gpaEl)  gpaEl.textContent  = dashGpa.toFixed(1);
  if (atarEl) atarEl.textContent = atar;
  if (bar)    bar.style.width    = Math.round((atar - 40) / 59 * 100) + '%';
}

// ─── Stat strip ───────────────────────────────────────────────────────────────
function updateStatStrip() {
  const el = document.getElementById('dash-stat-strip');
  if (!el) return;

  const gpaEligible = unis.filter(u => {
    const gpaMin = parseFloat(u.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    return dashGpa >= gpaMin;
  }).length;

  const budgetFit = unis.filter(u => (u.fin?.costNum ?? 0) <= dashBudget).length;
  const reachable = unis.filter(dashReachable).length;

  const reachableWithCost = unis.filter(u => dashReachable(u) && (u.fin?.costNum ?? 0) > 0);
  const avgCost = reachableWithCost.length
    ? Math.round(reachableWithCost.reduce((s, u) => s + (u.fin?.costNum || 0), 0) / reachableWithCost.length / 1000)
    : 0;

  const bestFit = [...unis].filter(dashReachable).sort((a, b) => (b.fitOlivier || 0) - (a.fitOlivier || 0))[0];

  const cells = [
    { num: gpaEligible, label: 'GPA eligible',    color: '#4f46e5' },
    { num: budgetFit,   label: 'In budget',        color: '#059669' },
    { num: reachable,   label: 'Real options',     color: '#0284c7' },
    { num: '$' + avgCost + 'k', label: 'Avg cost (reach)', color: '#d97706', raw: true },
    { num: bestFit?.name || '—', label: 'Best fit', color: '#e11d48', raw: true },
  ];

  el.innerHTML = cells.map(c => `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:.75rem 1rem;text-align:center">
      <div style="font-size:${c.raw ? '16px' : '22px'};font-weight:700;color:${c.color};line-height:1.1">${c.num}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:.25rem">${c.label}</div>
    </div>`).join('');
}

// ─── Shortlist cards ──────────────────────────────────────────────────────────
function updateShortlist() {
  const el = document.getElementById('dash-shortlist');
  if (!el) return;
  const ids = (dashAthlete.shortlist || []).slice(0, 4);
  if (!ids.length) { el.innerHTML = '<p style="color:#9ca3af;font-size:13px">No shortlist set.</p>'; return; }

  el.innerHTML = ids.map(id => {
    const u = unis.find(x => x.id === id);
    if (!u) return '';
    const ok = dashReachable(u);
    const gpaMin = parseFloat(u.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    const overBudget = (u.fin?.costNum ?? 0) > dashBudget;
    const gpaBlocked = dashGpa < gpaMin;
    const warn = !ok ? (gpaBlocked && overBudget ? 'GPA + budget' : gpaBlocked ? 'GPA too low' : 'Over budget') : '';
    const cost = u.fin?.costNum ? '$' + Math.round(u.fin.costNum / 1000) + 'k' : '—';

    return `
      <div style="background:#fff;border:1.5px solid ${ok ? '#e5e7eb' : '#fca5a5'};border-radius:10px;
        padding:.75rem;opacity:${ok ? 1 : 0.6};position:relative">
        ${!ok ? `<div style="position:absolute;top:.5rem;right:.5rem;font-size:10px;background:#fef2f2;
          color:#e11d48;padding:2px 6px;border-radius:4px;font-weight:600">${warn}</div>` : ''}
        <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:.25rem">${u.name}</div>
        <div style="font-size:11.5px;color:#6b7280;margin-bottom:.4rem">${u.loc}</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          <span style="font-size:11px;background:#e0e7ff;color:#4f46e5;padding:2px 7px;border-radius:4px">${u.div}</span>
          <span style="font-size:11px;background:#f3f4f6;color:#374151;padding:2px 7px;border-radius:4px">${cost}</span>
          <span style="font-size:11px;background:#f0fdf4;color:#059669;padding:2px 7px;border-radius:4px">${u.fitOlivier || '—'}%</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Lens chips ───────────────────────────────────────────────────────────────
function updateLensChips() {
  const el = document.getElementById('dash-lens-chips');
  if (!el || typeof LENSES === 'undefined') return;

  el.innerHTML = LENSES.map(L => {
    const sorted = [...unis].sort((a, b) =>
      ((b.lensScores?.[L.key] || 0) - (a.lensScores?.[L.key] || 0))
    );
    const top = sorted[0];
    if (!top) return '';
    const ok = dashReachable(top);
    const gpaMin = parseFloat(top.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    const warn = !ok
      ? (dashGpa < gpaMin ? 'GPA too low' : 'Over budget')
      : '';

    return `
      <div style="background:#fff;border:1.5px solid ${ok ? '#e5e7eb' : '#fde68a'};border-radius:10px;
        padding:.6rem .9rem;min-width:130px;opacity:${ok ? 1 : 0.7}">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${L.label}</div>
        <div style="font-weight:700;font-size:14px;color:#111827;margin:.15rem 0">${top.name}</div>
        <div style="font-size:11px;color:${ok ? '#059669' : '#d97706'}">${ok ? '✓ reachable' : warn}</div>
      </div>`;
  }).join('');
}

// ─── Conference strip ─────────────────────────────────────────────────────────
function updateConfStrip() {
  const el = document.getElementById('dash-conf-strip');
  if (!el) return;

  el.innerHTML = Object.entries(CONF_LABELS).map(([ck, meta]) => {
    const inConf = unis.filter(u => u.confKey === ck);
    const reachable = inConf.filter(dashReachable).length;
    const bestFit = Math.max(...inConf.map(u => u.fitOlivier || 0), 0);

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:.75rem .6rem;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#111827">${meta.label}</div>
        <div style="font-size:9.5px;color:#9ca3af;margin:.1rem 0 .4rem">${meta.tier}</div>
        <div style="font-size:18px;font-weight:700;color:#4f46e5;line-height:1">${bestFit}<span style="font-size:10px">%</span></div>
        <div style="font-size:10px;color:#6b7280;margin-top:.3rem">best fit</div>
        <div style="font-size:11px;font-weight:600;color:#059669;margin-top:.25rem">${reachable} reach</div>
      </div>`;
  }).join('');
}

// ─── Map — draw base once ─────────────────────────────────────────────────────
function drawMapBase() {
  const svg = document.getElementById('dash-map-svg');
  if (!svg) return;

  // Simplified continental US outline
  const usPath = 'M 68,65 L 160,58 L 220,55 L 290,60 L 345,65 L 380,72 L 425,78 ' +
    'L 445,95 L 438,112 L 430,118 L 435,125 L 420,128 L 415,140 L 418,152 ' +
    'L 408,165 L 400,178 L 388,195 L 378,210 L 375,218 L 390,228 L 398,242 ' +
    'L 400,260 L 385,268 L 370,255 L 362,242 L 348,228 L 318,232 L 298,240 ' +
    'L 268,258 L 228,268 L 190,272 L 148,272 L 118,268 L 88,255 L 68,235 ' +
    'L 50,195 L 42,155 L 40,118 L 45,90 L 52,75 L 68,65 Z';

  svg.innerHTML = `
    <path d="${usPath}" fill="#dde8f0" stroke="#b0c4d8" stroke-width="1.5"/>
    <text x="28" y="228" font-size="8" fill="#94a3b8">HI</text>
    <rect x="22" y="215" width="14" height="10" fill="none" stroke="#b0c4d8" stroke-width="0.8" rx="1"/>
    <g id="dash-map-dots"></g>`;
}

// ─── Map — update dots ────────────────────────────────────────────────────────
function updateMapDots() {
  const g = document.getElementById('dash-map-dots');
  if (!g) return;

  const shortlistIds = new Set(dashAthlete.shortlist || []);

  g.innerHTML = unis
    .filter(u => u.mapX !== undefined && u.mapY !== undefined)
    .map(u => {
      const reachable = dashReachable(u);
      const isShortlisted = shortlistIds.has(u.id);
      const r = Math.max(4, Math.min(8, 4 + Math.round((u.fitOlivier || 0) / 25)));
      const color = DASH_DIV_COLOR[u.div] || '#6b7280';
      const opacity = reachable ? 1 : 0.15;

      const dot = isShortlisted
        ? `<circle cx="${u.mapX}" cy="${u.mapY}" r="${r + 3}" fill="none" stroke="#4f46e5" stroke-width="1.5" opacity="${opacity}"/>`
        : '';

      const tooltip = `${u.name} · $${Math.round((u.fin?.costNum || 0) / 1000)}k · ${u.fitOlivier || '—'}%`;
      return `<g class="map-dot" style="cursor:pointer">
        ${dot}
        <circle cx="${u.mapX}" cy="${u.mapY}" r="${r}" fill="${color}" opacity="${opacity}"/>
        <title>${tooltip}</title>
      </g>`;
    }).join('');
}

// ─── Cost brackets ────────────────────────────────────────────────────────────
function updateBrackets() {
  const el = document.getElementById('dash-brackets');
  if (!el) return;

  const brackets = [
    { label: 'Under $30k', min: 0,     max: 29999  },
    { label: '$30–50k',    min: 30000, max: 49999  },
    { label: '$50–70k',    min: 50000, max: 69999  },
    { label: '$70k+',      min: 70000, max: Infinity },
  ];

  el.innerHTML = brackets.map(b => {
    const inBracket = unis.filter(u => {
      const c = u.fin?.costNum ?? 0;
      return c >= b.min && c <= b.max;
    });
    const reachableCount = inBracket.filter(dashReachable).length;

    const dots = inBracket.slice(0, 30).map(u => {
      const ok = dashReachable(u);
      const color = DASH_DIV_COLOR[u.div] || '#6b7280';
      return `<span title="${u.name} · ${u.fitOlivier || '—'}%"
        style="display:inline-block;width:9px;height:9px;border-radius:50%;
        background:${color};opacity:${ok ? 1 : 0.18};margin:2px;cursor:default"></span>`;
    }).join('');

    return `
      <div style="display:flex;flex-direction:column;gap:.4rem">
        <div style="font-size:10.5px;font-weight:700;color:#374151">${b.label}</div>
        <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
          padding:.4rem .5rem;overflow:hidden">${dots || '<span style="font-size:10px;color:#9ca3af">none</span>'}</div>
        <div style="font-size:10.5px;color:#059669;font-weight:600">${reachableCount} of ${inBracket.length}</div>
      </div>`;
  }).join('');
}
