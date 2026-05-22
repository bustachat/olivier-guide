// ═══════════════════════════════════════════════════════════════════════
// dashboard.js  —  Olivier Scholarship Guide v18
// Reads: unis[] / LENSES[] (set by app.js / scores.js)
// Own state: dashGpa, dashBudget, dashAthlete
// v18: updateShortlist() now dynamic — ranks all full-profile schools by
//      fitOlivier, shows top 8. olivier.json shortlist = pinned/starred.
// ═══════════════════════════════════════════════════════════════════════

let dashGpa     = 2.8;
let dashBudget  = 55000;
let dashAthlete = {};

const DASH_DIV_COLOR = {
  'D1':   '#e11d48',
  'IVY':  '#b45309',
  'D2':   '#0284c7',
  'NAIA': '#d97706',
  'D3':   '#7c3aed',
  'JUCO': '#6b7280',
};

const CONF_META = {
  'acc':          { label:'ACC',          tier:'P4',     tierCls:'bp5' },
  'big-ten':      { label:'Big Ten',      tier:'P4',     tierCls:'bp5' },
  'big-east':     { label:'Big East',     tier:'P4',     tierCls:'bp5' },
  'sec':          { label:'SEC',          tier:'P4',     tierCls:'bp5' },
  'aac':          { label:'AAC',          tier:'Hi-Maj', tierCls:'bhi' },
  'big-west':     { label:'Big West',     tier:'Hi-Maj', tierCls:'bhi' },
  'caa':          { label:'CAA',          tier:'Mid-Maj',tierCls:'bhi' },
  'asun':         { label:'ASUN',         tier:'Mid-Maj',tierCls:'bhi' },
  'mac':          { label:'MAC',          tier:'Mid-Maj',tierCls:'bhi' },
  'wac':          { label:'WAC',          tier:'Mid-Maj',tierCls:'bhi' },
  'wcc':          { label:'WCC',          tier:'Mid-Maj',tierCls:'bhi' },
  'america-east': { label:'Am. East',     tier:'Mid-Maj',tierCls:'bhi' },
  'other':        { label:'D2/NAIA',      tier:'D2',     tierCls:'bd2' },
};

const ATAR_GPA = [
  [99,4.0],[95,3.9],[90,3.7],[85,3.5],[80,3.3],
  [75,3.0],[70,2.8],[65,2.6],[60,2.4],[55,2.2],[50,2.0]
];
function atarToGpa(a) {
  for (let i = 0; i < ATAR_GPA.length - 1; i++) {
    const [a1,g1] = ATAR_GPA[i], [a2,g2] = ATAR_GPA[i+1];
    if (a <= a1 && a >= a2) {
      const t = (a - a2) / (a1 - a2);
      return Math.round((g2 + t*(g1-g2)) * 10) / 10;
    }
  }
  return a >= 99 ? 4.0 : 2.0;
}

function dashReachable(u) {
  if (u.noVarsity || u.excludeFromCostModel) return false;
  const gpaMin = parseFloat(u.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
  const costNum = u.fin?.costNum ?? 0;
  return dashGpa >= gpaMin && costNum <= dashBudget;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function renderDashboard() {
  const base = window.DATA_BASE_URL || './';
  try {
    const res = await fetch(base + 'athletes/olivier.json');
    dashAthlete = await res.json();
  } catch (_) {
    dashAthlete = { budgetUSD:55000, shortlist:['fiu','pba','lynn','ucsb'], defaultAtar:70, currentGpa:2.8 };
  }

  dashBudget = dashAthlete.budgetUSD || 55000;
  dashGpa    = (typeof currentAtarGpa !== 'undefined') ? currentAtarGpa : (dashAthlete.currentGpa || 2.8);

  const el = document.getElementById('page-dashboard');
  if (!el) return;

  el.innerHTML = buildDashboardShell();
  attachSliderHandlers();
  drawMapBase();
  updateDashboard();
}

// ─── Shell HTML ───────────────────────────────────────────────────────────────
function buildDashboardShell() {
  const initAtar = dashAthlete.defaultAtar || 70;
  const initBud  = Math.round(dashBudget / 1000);

  return `
<div class="dash-wrap">

  <div class="dash-slider-panel">
    <div class="dash-sp-block">
      <div class="dash-sp-header">
        <span class="dash-sp-label">ATAR → GPA eligibility</span>
        <div class="dash-sp-readout">
          <span class="dash-sp-big" id="dash-atar-val">${initAtar}</span>
          <span class="dash-sp-sep">=</span>
          <span class="dash-sp-sub" id="dash-gpa-val">${dashGpa.toFixed(1)}</span>
          <span class="dash-sp-unit">GPA</span>
        </div>
      </div>
      <input type="range" class="dash-range" min="50" max="99" step="1"
        value="${initAtar}" id="dash-atar-slider">
      <div class="dash-ticks">
        <span>50</span><span>65</span><span>80</span><span>99</span>
      </div>
      <div class="dash-sp-result" id="dash-gpa-result">— schools GPA-eligible</div>
    </div>
    <div class="dash-sp-block">
      <div class="dash-sp-header">
        <span class="dash-sp-label">Annual budget</span>
        <div class="dash-sp-readout">
          <span class="dash-sp-big" id="dash-bud-val">$${initBud}k</span>
        </div>
      </div>
<input type="range" class="dash-range" min="20" max="100" step="5"
        value="${initBud}" id="dash-bud-slider">
      <div class="dash-ticks">
        <span>$20k</span><span>$50k</span><span>$75k</span><span>$100k</span>
      </div>
      <div class="dash-sp-result" id="dash-bud-result">— schools within budget</div>
    </div>
  </div>

  <div class="dash-sec-lbl">Snapshot</div>
  <div class="dash-stat-strip" id="dash-stat-strip">
    <div class="dash-sc"><span class="dash-sc-num indigo" id="ds-eligible">—</span><div class="dash-sc-right"><div class="dash-sc-lbl">GPA eligible</div></div></div>
    <div class="dash-sc"><span class="dash-sc-num emerald" id="ds-budget">—</span><div class="dash-sc-right"><div class="dash-sc-lbl">Within budget</div></div></div>
    <div class="dash-sc"><span class="dash-sc-num emerald" id="ds-both">—</span><div class="dash-sc-right"><div class="dash-sc-lbl">Real options</div><div class="dash-sc-sub">eligible + affordable</div></div></div>
    <div class="dash-sc"><span class="dash-sc-num amber" id="ds-cost">—</span><div class="dash-sc-right"><div class="dash-sc-lbl">Avg cost eligible</div></div></div>
    <div class="dash-sc"><span class="dash-sc-num emerald dash-sc-name" id="ds-best">—</span><div class="dash-sc-right"><div class="dash-sc-lbl">Best fit reachable</div></div></div>
  </div>

  <div class="dash-sec-lbl">Shortlist — ★ pinned · ranked by fit score · auto-updates as data grows</div>
  <div class="dash-shortlist-row" id="dash-shortlist"></div>

  <div class="dash-sec-lbl">Best per lens — dims when GPA or budget rules out current #1</div>
  <div class="dash-lens-row" id="dash-lens-row"></div>

  <div class="dash-sec-lbl">Conferences</div>
  <div class="dash-conf-strip" id="dash-conf-strip"></div>

  <div class="dash-main-grid">
    <div class="dash-panel">
      <div class="dash-panel-title">School map — dot size = fit · hover for details</div>
      <div class="dash-map-wrap" id="dash-map-wrap">
        <svg id="dash-map-svg" viewBox="0 0 500 300" style="display:block;width:100%"></svg>
        <div class="dash-map-tip" id="dash-map-tip"></div>
      </div>
      <div class="dash-map-legend">
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#e11d48"></div>D1</div>
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#0284c7"></div>D2</div>
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#d97706"></div>NAIA</div>
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#7c3aed"></div>D3</div>
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#6b7280"></div>JUCO</div>
        <div class="dash-ml"><div class="dash-ml-dot" style="background:#b45309"></div>IVY</div>
      </div>
    </div>
    <div class="dash-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.55rem">
        <div class="dash-panel-title" style="margin:0">Cost by bracket</div>
        <div style="font-size:8px;color:var(--hint)">faded = ineligible or over budget</div>
      </div>
      <div class="dash-bracket-grid" id="dash-brackets"></div>
    </div>
  </div>

</div>

<style>
.dash-wrap{padding:.85rem;font-family:'Outfit',system-ui,sans-serif;}
.dash-slider-panel{background:var(--navy);border-radius:10px;padding:.65rem 1rem;margin-bottom:.7rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.dash-sp-block{display:flex;flex-direction:column;gap:.28rem;}
.dash-sp-header{display:flex;align-items:center;justify-content:space-between;}
.dash-sp-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);}
.dash-sp-readout{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:.18rem .6rem;display:flex;align-items:baseline;gap:4px;}
.dash-sp-big{font-size:1.05rem;font-weight:800;color:#fff;line-height:1;font-family:inherit;}
.dash-sp-sub{font-size:.9rem;font-weight:800;color:#a5b4fc;line-height:1;}
.dash-sp-sep{font-size:.75rem;color:rgba(255,255,255,.3);}
.dash-sp-unit{font-size:8px;color:rgba(255,255,255,.3);margin-left:2px;}
.dash-sp-result{font-size:10px;font-weight:700;color:#a5b4fc;}
.dash-range{width:100%;-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:rgba(255,255,255,.15);outline:none;cursor:pointer;}
.dash-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#6366f1;cursor:pointer;border:2px solid #fff;}
.dash-range::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#6366f1;border:2px solid #fff;cursor:pointer;}
.dash-ticks{display:flex;justify-content:space-between;}
.dash-ticks span{font-size:8px;color:rgba(255,255,255,.22);}
.dash-sec-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--hint);margin-bottom:.35rem;}
.dash-stat-strip{display:flex;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:.7rem;}
.dash-sc{flex:1;padding:.48rem .6rem;border-right:1px solid var(--border);display:flex;align-items:center;gap:.45rem;}
.dash-sc:last-child{border-right:none;}
.dash-sc-num{font-size:1.1rem;font-weight:800;line-height:1;font-family:inherit;flex-shrink:0;}
.dash-sc-num.indigo{color:var(--indigo);}
.dash-sc-num.emerald{color:var(--emerald);}
.dash-sc-num.amber{color:var(--amber);}
.dash-sc-num.rose{color:var(--rose);}
.dash-sc-name{font-size:.9rem;}
.dash-sc-right{display:flex;flex-direction:column;gap:2px;}
.dash-sc-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);line-height:1;}
.dash-sc-sub{font-size:7.5px;color:#065f46;background:var(--emerald3);border-radius:3px;padding:0 4px;display:inline-block;font-weight:700;line-height:1.5;}
.dash-shortlist-row{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:.7rem;}
.dash-sl-card{background:var(--surface);border:2px solid var(--indigo);border-radius:11px;padding:.6rem .75rem;position:relative;transition:opacity .25s,border-color .25s;}
.dash-sl-card.over-budget{border-color:var(--border);border-width:1px;opacity:.5;}
.dash-sl-card.ineligible{border-color:#fbbf24;border-width:1.5px;opacity:.6;}
.dash-sl-star{position:absolute;top:5px;right:7px;font-size:9px;color:var(--indigo);font-weight:800;background:var(--indigo3);border-radius:4px;padding:1px 6px;}
.dash-sl-div{font-size:8px;font-weight:700;background:var(--rose3);color:var(--rose);border-radius:3px;padding:1px 5px;display:inline-block;text-transform:uppercase;letter-spacing:.05em;}
.dash-sl-div.d2{background:var(--sky3);color:var(--sky);}
.dash-sl-div.naia{background:var(--amber3);color:var(--amber);}
.dash-sl-div.ivy{background:var(--amber3);color:#92400e;}
.dash-sl-name{font-size:13px;font-weight:800;color:var(--navy);margin:.18rem 0 .08rem;}
.dash-sl-deg{font-size:8.5px;color:var(--muted);line-height:1.3;margin-bottom:.3rem;}
.dash-sl-scores{display:flex;gap:6px;}
.dash-sl-sc{font-size:10px;font-weight:700;}
.dash-sl-sc span{color:var(--hint);font-weight:400;}
.dash-sl-warn{font-size:8px;font-weight:700;border-radius:4px;padding:1px 5px;margin-top:.28rem;display:inline-block;}
.dash-sl-warn.gpa{color:#92400e;background:var(--amber3);}
.dash-sl-warn.budget{color:#9f1239;background:var(--rose3);}
.dash-sl-btns{display:flex;gap:3px;margin-top:.4rem;}
.dash-sl-btn{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:8px;font-weight:600;border-radius:5px;padding:3px 0;cursor:pointer;text-align:center;font-family:inherit;}
.dash-sl-btn.primary{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.dash-lens-row{display:grid;grid-template-columns:repeat(7,1fr);gap:.3rem;margin-bottom:.7rem;}
.dash-lc{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.42rem .32rem;text-align:center;transition:opacity .25s;}
.dash-lc.blocked{opacity:.3;}
.dash-lkey{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--hint);margin-bottom:.18rem;}
.dash-lname{font-size:10px;font-weight:700;color:var(--navy);line-height:1.2;margin-bottom:.2rem;}
.dash-lscore{font-size:1rem;font-weight:800;line-height:1;font-family:inherit;}
.dash-lconf{font-size:7px;color:var(--muted);margin-top:.12rem;}
.dash-lalt{font-size:7px;color:var(--amber);font-weight:700;margin-top:.18rem;}
.dash-conf-strip{display:flex;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:.7rem;}
.dash-cc{flex:1;padding:.36rem .42rem;border-right:1px solid var(--border);cursor:pointer;transition:background .12s;}
.dash-cc:last-child{border-right:none;}
.dash-cc:hover{background:var(--surface2);}
.dash-cc-top{display:flex;align-items:center;justify-content:space-between;gap:3px;margin-bottom:.22rem;}
.dash-cc-name{font-size:10px;font-weight:700;color:var(--navy);white-space:nowrap;line-height:1.2;}
.dash-cc-badge{font-size:6px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-radius:3px;padding:1px 3px;white-space:nowrap;flex-shrink:0;}
.bp5{background:var(--indigo3);color:#3730a3;}
.bhi{background:var(--sky3);color:#0369a1;}
.bd2{background:var(--sky3);color:#0284c7;}
.dash-cc-data{display:flex;align-items:baseline;justify-content:space-between;}
.dash-cc-fit{font-size:10px;font-weight:800;}
.dash-cc-count{font-size:8px;color:var(--hint);font-weight:600;}
.dash-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;}
.dash-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:.7rem .85rem;}
.dash-panel-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--hint);margin-bottom:.55rem;}
.dash-map-wrap{position:relative;background:#eef2f7;border-radius:10px;overflow:hidden;border:1px solid var(--border);}
.dash-map-dot{position:absolute;border-radius:50%;cursor:pointer;transform:translate(-50%,-50%);transition:opacity .2s;}
.dash-map-dot.shortlist{outline-offset:1px;}
.dash-map-tip{position:absolute;background:var(--navy);color:#fff;font-size:9px;font-weight:600;padding:3px 8px;border-radius:5px;pointer-events:none;white-space:nowrap;z-index:10;display:none;transform:translateX(-50%);}
.dash-map-legend{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.38rem;}
.dash-ml{display:flex;align-items:center;gap:3px;font-size:8px;color:var(--muted);}
.dash-ml-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.dash-bracket-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.45rem;}
.dash-bracket-col{display:flex;flex-direction:column;gap:.18rem;}
.dash-bracket-hdr{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.22rem .4rem;border-radius:5px;text-align:center;}
.bh-g{background:var(--emerald3);color:#065f46;}
.bh-b{background:var(--sky3);color:#075985;}
.bh-a{background:var(--amber3);color:#78350f;}
.bh-r{background:var(--rose3);color:#9f1239;}
.dash-dots-wrap{display:flex;flex-wrap:wrap;gap:3px;min-height:28px;}
.dash-sdot{width:8px;height:8px;border-radius:50%;cursor:pointer;border:1px solid rgba(255,255,255,.6);transition:opacity .2s;flex-shrink:0;}
.dash-sdot.dim{opacity:.18;}
.dash-bracket-count{font-size:8px;color:var(--hint);font-weight:600;margin-top:2px;}
</style>`;
}

// ─── Slider handlers ──────────────────────────────────────────────────────────
function attachSliderHandlers() {
  const atarSl = document.getElementById('dash-atar-slider');
  const budSl  = document.getElementById('dash-bud-slider');

  if (atarSl) {
    atarSl.addEventListener('input', function() {
      const a = parseInt(this.value);
      dashGpa = atarToGpa(a);
      document.getElementById('dash-atar-val').textContent = a;
      document.getElementById('dash-gpa-val').textContent  = dashGpa.toFixed(1);
      const mainSl = document.getElementById('atar-slider');
      if (mainSl && mainSl.value !== String(a)) {
        mainSl.value = a;
        const mainAtarEl = document.getElementById('atar-display');
        const mainGpaEl  = document.getElementById('gpa-display');
        if (mainAtarEl) mainAtarEl.textContent = a;
        if (mainGpaEl)  mainGpaEl.textContent  = dashGpa.toFixed(1);
        if (typeof currentAtarGpa !== 'undefined') window.currentAtarGpa = dashGpa;
        if (typeof refreshAllGpaRows === 'function') refreshAllGpaRows();
        if (typeof updateAtarCounts === 'function')  updateAtarCounts();
      }
      updateDashboard();
    });
  }

  if (budSl) {
    budSl.addEventListener('input', function() {
      dashBudget = parseInt(this.value) * 1000;
      document.getElementById('dash-bud-val').textContent = '$' + this.value + 'k';
      updateDashboard();
    });
  }
}

function syncDashGpa(gpa, atar) {
  dashGpa = gpa;
  const sl     = document.getElementById('dash-atar-slider');
  const gpaEl  = document.getElementById('dash-gpa-val');
  const atarEl = document.getElementById('dash-atar-val');
  const atarVal = (atar !== undefined) ? atar : (() => {
    let bestAtar = 70, bestDiff = 99;
    for (let a = 50; a <= 99; a++) {
      const diff = Math.abs(atarToGpa(a) - gpa);
      if (diff < bestDiff) { bestDiff = diff; bestAtar = a; }
    }
    return bestAtar;
  })();
  if (sl && sl.value !== String(atarVal)) sl.value = atarVal;
  if (atarEl) atarEl.textContent = atarVal;
  if (gpaEl)  gpaEl.textContent  = gpa.toFixed(1);
  if (document.getElementById('dash-stat-strip')) updateDashboard();
}

// ─── Master update ────────────────────────────────────────────────────────────
function updateDashboard() {
  updateStatStrip();
  updateShortlist();
  updateLensRow();
  updateConfStrip();
  updateMapDots();
  updateBrackets();
}

// ─── 1. Stat strip ────────────────────────────────────────────────────────────
function updateStatStrip() {
  const eligible = unis.filter(u => {
    const g = parseFloat(u.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    return dashGpa >= g;
  }).length;
  const inBudget  = unis.filter(u => (u.fin?.costNum ?? 0) <= dashBudget).length;
  const reachable = unis.filter(dashReachable).length;
  const withCost  = unis.filter(u => dashReachable(u) && (u.fin?.costNum ?? 0) > 0);
  const avgCost   = withCost.length
    ? '$' + Math.round(withCost.reduce((s,u) => s + (u.fin.costNum||0), 0) / withCost.length / 1000) + 'k'
    : '—';
  const best = [...unis].filter(dashReachable).sort((a,b) => (b.fitOlivier||0)-(a.fitOlivier||0))[0];

  const set = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  set('ds-eligible', eligible);
  set('ds-budget',   inBudget);
  set('ds-both',     reachable);
  set('ds-cost',     avgCost);
  set('ds-best',     best?.name || '—');

  const bestEl = document.getElementById('ds-best');
  if (bestEl) bestEl.className = 'dash-sc-num dash-sc-name ' + (best ? 'emerald' : 'rose');

  const gpaRes = document.getElementById('dash-gpa-result');
  const budRes = document.getElementById('dash-bud-result');
  if (gpaRes) gpaRes.textContent = eligible + ' of ' + unis.length + ' schools GPA-eligible';
  if (budRes) budRes.textContent = inBudget + ' of ' + unis.length + ' within budget';
}

// ─── 2. Shortlist cards — DYNAMIC ────────────────────────────────────────────
// Shows top 8 full-profile schools ranked by fitOlivier.
// Schools in olivier.json shortlist[] are pinned first with ★ TOP badge.
// Auto-updates whenever unis[] changes — new schools appear automatically.
function updateShortlist() {
  const el = document.getElementById('dash-shortlist');
  if (!el) return;

  const pinnedIds   = (dashAthlete.shortlist || []);
  const pinnedSet   = new Set(pinnedIds);
  const fullSchools = unis.filter(u => u.profileDepth === 'full' && !u.noVarsity);

  // Pinned schools in order
  const pinned = pinnedIds.map(id => fullSchools.find(u => u.id === id)).filter(Boolean);

  // Remaining top schools by fitOlivier
  const autoTop = [...fullSchools]
    .filter(u => !pinnedSet.has(u.id))
    .sort((a, b) => (b.fitOlivier || 0) - (a.fitOlivier || 0));

  // Merge to 8 total
  const display = [...pinned];
  for (const u of autoTop) {
    if (display.length >= 8) break;
    display.push(u);
  }

  if (!display.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--hint)">No schools loaded yet.</p>';
    return;
  }

  el.innerHTML = display.map((u, idx) => {
    const isPinned   = pinnedSet.has(u.id);
    const gpaMin     = parseFloat(u.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    const costNum    = u.fin?.costNum ?? 0;
    const overBudget = costNum > dashBudget;
    const ineligible = dashGpa < gpaMin;

    const divClass  = u.div === 'D2' ? ' d2' : u.div === 'NAIA' ? ' naia' : u.div === 'IVY' ? ' ivy' : '';
    const fitColor  = (u.fitOlivier||0) >= 90 ? 'var(--emerald)' : (u.fitOlivier||0) >= 80 ? 'var(--amber)' : 'var(--rose)';
    const acuColor  = (u.acuAlign||0) >= 14 ? 'var(--emerald)' : (u.acuAlign||0) >= 10 ? 'var(--sky)' : 'var(--amber)';

    const badge = isPinned
      ? `<div class="dash-sl-star">★ TOP</div>`
      : `<div class="dash-sl-star" style="background:var(--surface3);color:var(--muted);border:1px solid var(--border)">#${idx + 1}</div>`;

    let warn = '';
    if (ineligible) warn = '<div class="dash-sl-warn gpa">GPA below entry minimum</div>';
    else if (overBudget) warn = '<div class="dash-sl-warn budget">Above current budget</div>';

    return `<div class="dash-sl-card${overBudget?' over-budget':''}${ineligible?' ineligible':''}">
      ${badge}
      <div class="dash-sl-head" style="display:flex;align-items:center;gap:.45rem;margin-bottom:.3rem">
        <div style="width:34px;height:34px;border-radius:7px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${u.domain
            ? `<img src="https://logo.clearbit.com/${u.domain}" alt="${u.name}" width="28" height="28" style="object-fit:contain"
                onerror="this.src='https://www.google.com/s2/favicons?domain=${u.domain}&sz=64';this.onerror=function(){this.parentNode.innerHTML='<span style=\\'font-size:9px;font-weight:800;color:var(--muted)\\'>${u.name.slice(0,4)}</span>'}">`
            : `<span style="font-size:9px;font-weight:800;color:var(--muted)">${u.name.slice(0,4)}</span>`
          }
        </div>
        <div>
          <div class="dash-sl-name" style="margin:0 0 1px">${u.name}</div>
          <div class="dash-sl-div${divClass}" style="margin:0">${u.div} · ${u.conf}</div>
        </div>
      </div>
      <div class="dash-sl-deg">${(u.degreeTitle||'').substring(0,42)}</div>
      <div class="dash-sl-scores">
        <div class="dash-sl-sc" style="color:${fitColor}">${u.fitOlivier||'—'}% <span>fit</span></div>
        <div class="dash-sl-sc" style="color:${acuColor}">${u.acuAlign||'—'}/16 <span>ACU</span></div>
        <div class="dash-sl-sc" style="color:var(--muted)">~$${Math.round(costNum/1000)}k</div>
      </div>
      ${warn}
      <div class="dash-sl-btns">
        <button class="dash-sl-btn primary" onclick="openDetail('${u.id}')">Details</button>
        <button class="dash-sl-btn" onclick="addToCompare('${u.id}')">Compare</button>
        <button class="dash-sl-btn" onclick="window.location.href='mailto:${u.coach?.email||''}'">Email</button>
      </div>
    </div>`;
  }).join('');
}

// ─── 3. Lens row ──────────────────────────────────────────────────────────────
function updateLensRow() {
  const el = document.getElementById('dash-lens-row');
  if (!el || typeof LENSES === 'undefined') return;

  el.innerHTML = LENSES.map(L => {
    const sorted = [...unis]
      .filter(u => u.profileDepth === 'full')
      .sort((a,b) => ((b.lensScores?.[L.key]||0) - (a.lensScores?.[L.key]||0)));
    const top = sorted[0];
    if (!top) return '';

    const gpaMin     = parseFloat(top.gpa?.minEntry?.match(/[\d.]+/)?.[0] || 0);
    const overBudget = (top.fin?.costNum ?? 0) > dashBudget;
    const ineligible = dashGpa < gpaMin;
    const blocked    = overBudget || ineligible;
    const score      = top.lensScores?.[L.key] || top.fitOlivier || 0;
    const scoreColor = score >= 90 ? 'var(--emerald)' : score >= 80 ? 'var(--amber)' : 'var(--rose)';
    const altText    = ineligible ? 'GPA too low' : overBudget ? 'Over budget' : '';

    return `<div class="dash-lc${blocked?' blocked':''}">
      <div class="dash-lkey">${L.label}</div>
      <div class="dash-lname">${top.name}</div>
      <div class="dash-lscore" style="color:${blocked?'var(--border2)':scoreColor}">${blocked?'—':score}</div>
      <div class="dash-lconf">${top.conf}</div>
      ${altText ? `<div class="dash-lalt">${altText}</div>` : ''}
    </div>`;
  }).join('');
}

// ─── 4. Conference strip ──────────────────────────────────────────────────────
function updateConfStrip() {
  const el = document.getElementById('dash-conf-strip');
  if (!el) return;

  el.innerHTML = Object.entries(CONF_META).map(([ck, meta]) => {
    const inConf    = unis.filter(u => u.confKey === ck);
    const total     = inConf.length;
    const reachable = inConf.filter(dashReachable).length;
    const bestFit   = Math.max(0, ...inConf.map(u => u.fitOlivier || 0));
    const fitColor  = bestFit >= 90 ? 'var(--emerald)' : bestFit >= 80 ? 'var(--indigo)' : 'var(--amber)';

    return `<div class="dash-cc" onclick="filterToConf('${ck}')">
      <div class="dash-cc-top">
        <div class="dash-cc-name">${meta.label}</div>
        <div class="dash-cc-badge ${meta.tierCls}">${meta.tier}</div>
      </div>
      <div class="dash-cc-data">
        <div class="dash-cc-fit" style="color:${fitColor}">${bestFit}%</div>
        <div class="dash-cc-count">${reachable}/${total}</div>
      </div>
    </div>`;
  }).join('');
}

// ─── 5. Map dots ──────────────────────────────────────────────────────────────
function drawMapBase() {
  const svg = document.getElementById('dash-map-svg');
  if (!svg) return;
  svg.innerHTML = '';

  const states = [
    'M 72,78 L 72,148 L 100,148 L 100,110 L 120,110 L 120,78 Z',
    'M 120,78 L 120,148 L 160,148 L 160,78 Z',
    'M 160,78 L 160,148 L 200,148 L 200,78 Z',
    'M 200,78 L 200,148 L 240,148 L 240,78 Z',
    'M 240,78 L 240,148 L 280,148 L 280,78 Z',
    'M 280,78 L 280,148 L 320,148 L 320,78 Z',
    'M 320,78 L 320,148 L 360,148 L 360,78 Z',
    'M 360,78 L 360,148 L 400,148 L 400,78 Z',
    'M 400,78 L 400,148 L 440,148 L 440,78 Z',
    'M 72,148 L 72,220 L 440,220 L 440,148 Z',
    'M 72,220 L 72,280 L 440,280 L 440,220 Z',
  ];

  states.forEach(d => {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#dde6ef');
    path.setAttribute('stroke', '#c5d4e2');
    path.setAttribute('stroke-width', '0.5');
    svg.appendChild(path);
  });

  // Simple state abbreviations
  [['CA',75,100],['NV',108,105],['ID',140,90],['MT',170,85],['WY',200,95],
   ['CO',230,105],['NM',235,155],['TX',255,185],['OK',290,160],['KS',310,130],
   ['NE',325,110],['SD',340,95],['ND',350,82],['MN',380,88],['WI',400,100],
   ['MI',415,95],['IL',400,118],['IN',415,115],['OH',430,108],['PA',445,105],
   ['NY',455,95],['FL',420,240],['GA',420,200],['SC',435,185],['NC',440,175],
   ['VA',445,162],['MD',450,155]
  ].forEach(([text, x, y]) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor','middle');
    t.setAttribute('font-size','6'); t.setAttribute('fill','#9ca3af');
    t.textContent = text;
    svg.appendChild(t);
  });

  const hil = document.createElementNS('http://www.w3.org/2000/svg','text');
  hil.setAttribute('x',80); hil.setAttribute('y',260);
  hil.setAttribute('text-anchor','middle');
  hil.setAttribute('font-size','7'); hil.setAttribute('fill','#9ca3af');
  hil.textContent = 'HI';
  svg.appendChild(hil);
}

function updateMapDots() {
  const wrap = document.getElementById('dash-map-wrap');
  const svg  = document.getElementById('dash-map-svg');
  if (!wrap || !svg) return;

  const svgW = 500, svgH = 300;
  wrap.style.height = (wrap.offsetWidth * (svgH/svgW)) + 'px';

  const tip = document.getElementById('dash-map-tip');
  const shortlistIds = new Set(dashAthlete.shortlist || []);

  wrap.querySelectorAll('.dash-map-dot').forEach(e => e.remove());

  unis.filter(u => u.mapX !== undefined && u.mapY !== undefined && !u.excludeFromMap && !u.noVarsity).forEach(u => {
    const blocked = !dashReachable(u);
    const isSL    = shortlistIds.has(u.id);
    const color   = DASH_DIV_COLOR[u.div] || '#9ca3af';
    const size    = Math.max(7, Math.min(13, Math.round((u.fitOlivier||50) / 9)));
    const lp      = (u.mapX / svgW) * 100;
    const tp      = (u.mapY / svgH) * 100;

    const dot = document.createElement('div');
    dot.className = 'dash-map-dot' + (isSL && !blocked ? ' shortlist' : '');
    dot.style.cssText = [
      'position:absolute', `left:${lp}%`, `top:${tp}%`,
      `width:${size}px`, `height:${size}px`,
      `background:${blocked ? '#b0bcc8' : color}`,
      `opacity:${blocked ? 0.15 : 1}`,
      isSL && !blocked ? `outline:2px solid var(--indigo);outline-offset:1px` : '',
    ].filter(Boolean).join(';');

    dot.addEventListener('mouseenter', function() {
      tip.style.display = 'block';
      tip.textContent   = u.name + ' · $' + Math.round((u.fin?.costNum||0)/1000) + 'k · ' + (u.fitOlivier||'—') + '% fit';
      tip.style.left = lp + '%';
      tip.style.top  = (tp + 3) + '%';
    });
    dot.addEventListener('mouseleave', () => tip.style.display = 'none');
    wrap.appendChild(dot);
  });
}

// ─── 6. Cost brackets ─────────────────────────────────────────────────────────
function updateBrackets() {
  const el = document.getElementById('dash-brackets');
  if (!el) return;

  const brackets = [
    { label:'Under $30k', cls:'bh-g', min:0,     max:29999    },
    { label:'$30–50k',    cls:'bh-b', min:30000, max:49999    },
    { label:'$50–70k',    cls:'bh-a', min:50000, max:69999    },
    { label:'$70k+',      cls:'bh-r', min:70000, max:Infinity },
  ];

  el.innerHTML = brackets.map(b => {
    const inBracket = unis.filter(u => {
      if (u.noVarsity || u.excludeFromCostModel) return false;
      const c = u.fin?.costNum ?? 0;
      return c >= b.min && c <= b.max;
    });
    const reachable = inBracket.filter(dashReachable).length;
    const dots = inBracket.map(u => {
      const ok    = dashReachable(u);
      const color = DASH_DIV_COLOR[u.div] || '#9ca3af';
      return `<div class="dash-sdot${ok?'':' dim'}" style="background:${ok?color:'#c8d4e0'}" title="${u.name} · $${Math.round((u.fin?.costNum||0)/1000)}k"></div>`;
    }).join('');

    return `<div class="dash-bracket-col">
      <div class="dash-bracket-hdr ${b.cls}">${b.label}</div>
      <div class="dash-dots-wrap">${dots || '<span style="font-size:9px;color:var(--hint)">none</span>'}</div>
      <div class="dash-bracket-count">${reachable} of ${inBracket.length} reachable</div>
    </div>`;
  }).join('');
}

// ─── Conference filter helper ─────────────────────────────────────────────────
function filterToConf(confKey) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const explorePage = document.getElementById('page-explore');
  const exploreTab  = [...document.querySelectorAll('.nav-tab')].find(b => b.textContent.includes('Explore'));
  if (explorePage) explorePage.classList.add('active');
  if (exploreTab)  exploreTab.classList.add('active');

  setTimeout(() => {
    const section = document.querySelector(`.conf-section[data-confkey="${confKey}"]`);
    if (section) {
      if (section.classList.contains('div-collapsed')) {
        const btn = section.querySelector('.div-toggle-btn');
        if (btn) btn.click();
      }
      section.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  }, 100);
}
