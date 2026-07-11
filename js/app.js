// ═══════════════════════════════════════════════════════════════════════
// app.js  —  Olivier Scholarship Guide v19
// All application logic. Data loaded from data/ JSON files.
// v16: Conference-split JSON, Dashboard tab, sort system, listed-depth schools.
// v17: ATAR hide-ineligible toggle. Below-min cards greyed out. Top Picks
//      always remain visible (dimmed only, never hidden) regardless of GPA.
// V18: New Schools and Conferences
// V19: Major Update. Make HTML completely Dynamic. No Hardcoded data
// V20: Cosmetic Updates. SVG Map and Dot Positioning Update, Financial Model update for JUCO (2yr not 4yr), Live Rate Fix, Card Font Spacing etc
// V21: TBA
// ═══════════════════════════════════════════════════════════════════════

let APP_VERSION = 'v24'; // overwritten from athleteConfig.guideVersion after load

let unis = [];
let conferences = [];
let conferencePrestige = [];
let pipelineData = {};
let coachData = [];
let athleteConfig = {};

// ── AUD/USD Exchange Rate ─────────────────────────────────────────────────────
// Fetched live from open.er-api.com — free, no key needed.
// Falls back to DEFAULT_FX if the fetch fails or times out.
// Current mid-market rate as of May 2026: 1 USD = ~1.38 AUD (xe.com)
// Default set to 1.40 — small buffer above live rate for budget planning.
const DEFAULT_FX = 1.40;
let currentFx = DEFAULT_FX;
let fxIsLive   = false;  // true once a live rate is successfully fetched

async function fetchLiveFxRate() {
  // Try two free CORS-friendly sources in sequence
  const sources = [
    { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', parse: d => d?.usd?.aud },
    { url: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',                        parse: d => d?.usd?.aud },
  ];
  for (const src of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(src.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const rate = src.parse(data);
      if (rate && rate > 1.0 && rate < 3.0) {
        currentFx = Math.round(rate * 100) / 100;
        fxIsLive  = true;
        return currentFx;
      }
    } catch (_) { /* try next source */ }
  }
  currentFx = DEFAULT_FX;
  return DEFAULT_FX;
}

function applyFxToUI(fx) {
  const slFx   = document.getElementById('sl-fx');
  const valFx  = document.getElementById('val-fx');
  if (slFx)  slFx.value = fx.toFixed(2);
  if (valFx) valFx.textContent = fx.toFixed(2);

  // Update banner rate box
  const isLive = fxIsLive;
  const rateBox = document.getElementById('fin-rate-box');
  if (rateBox) {
    rateBox.className = 'fin-rate-box ' + (isLive ? 'live' : 'fallback');
    rateBox.innerHTML = `
      <div class="fin-rate-icon">${isLive ? '✅' : '⚠'}</div>
      <div>
        <div class="fin-rate-label">${isLive ? 'Live AUD/USD' : 'Default rate'}</div>
        <div class="fin-rate-value">1 USD = ${fx.toFixed(2)} AUD</div>
        <div class="fin-rate-sub">${isLive ? 'Updated this page load' : 'Adjust slider if rate differs'}</div>
      </div>`;
  }

  // Dashboard budget slider FX note
  const dashFxNote = document.getElementById('dash-fx-note');
  if (dashFxNote) {
    dashFxNote.textContent = fxIsLive
      ? `Live rate: 1 USD = ${fx.toFixed(2)} AUD`
      : `Default rate: 1 USD = ${fx.toFixed(2)} AUD — may differ from live`;
  }

  // Re-render comparison bars with new rate
  if (typeof renderFinComparisonBars === 'function') renderFinComparisonBars();
  // Re-render model if a school is already selected
  if (typeof updateFinModel === 'function' && typeof finCurrentSchool !== 'undefined' && finCurrentSchool) {
    updateFinModel();
  }
}

const CONF_FILES = ['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'd1-other', 'juco', 'ivy', 'd2'];

// Fetch with exponential-backoff retry. Throws after maxAttempts failures.
// cache: 'no-store' — a hard reload (Ctrl+Shift+R) does not reliably bypass
// HTTP cache for fetch()-initiated requests in every browser (seen live:
// Chrome kept serving a pre-v37.1 cached athletes/olivier.json after a hard
// reload, producing NaN fit scores from mismatched weight keys, while Edge
// picked up the new file fine). Forcing no-store means every data file is
// always fetched fresh from the network — the guide is low-traffic enough
// that losing HTTP caching here costs nothing.
async function fetchWithRetry(url, maxAttempts = 3) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText + ' — ' + url);
      return res.json();
    } catch (e) {
      lastErr = e;
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

async function loadData() {
  // Show spinner immediately — user sees something while JSON fetches
  const cc = document.getElementById('cards-container');
  if (cc) cc.innerHTML = '<div class="app-spinner"><div class="app-spinner-ring"></div><span class="app-spinner-lbl">Loading schools…</span></div>';

  try {
    const base = window.DATA_BASE_URL || './data/';

    // Conference JSON files — allSettled so one bad file doesn't kill the whole app
    const confSettled = await Promise.allSettled(
      CONF_FILES.map(f => fetchWithRetry(base + f + '.json'))
    );
    const failedConfs = CONF_FILES.filter((_, i) => confSettled[i].status === 'rejected');
    if (failedConfs.length) {
      console.warn('loadData: failed to load:', failedConfs.map(f => f + '.json').join(', '));
    }
    unis = confSettled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);

    // Critical support files — retry up to 3x each, throw if all attempts fail
    const [confs_data, coaches_data, prestige_data, pipeline_data, athlete_data] = await Promise.all([
      fetchWithRetry(base + 'conferences.json'),
      fetchWithRetry(base + 'coaches.json'),
      fetchWithRetry(base + 'conf-prestige.json'),
      fetchWithRetry(base + 'pipeline.json'),
      fetchWithRetry('./athletes/olivier.json'),
    ]);

    conferences        = confs_data;
    coachData          = coaches_data;
    conferencePrestige = prestige_data;
    pipelineData       = pipeline_data;
    athleteConfig      = athlete_data;

    if (athleteConfig.guideVersion) APP_VERSION = athleteConfig.guideVersion;

    // Fetch live FX rate — runs alongside initApp, updates UI when ready
    fetchLiveFxRate().then(fx => {
      applyFxToUI(fx);
      // Re-render comparison bars with live rate
      if (typeof renderFinComparisonBars === 'function') renderFinComparisonBars();
    });

    initApp();
  } catch (err) {
    console.error('Data load error:', err);
    document.getElementById('cards-container').innerHTML =
      '<div style="padding:2rem;color:#e11d48;font-family:Arial">' +
      '<strong>Could not load school data.</strong><br>' +
      'If opening locally, use a local server (e.g. <code>npx serve .</code>). ' +
      'See README.md for setup instructions.<br><br>' +
      '<em>' + err.message + '</em></div>';
  }
}

function initApp() {
  document.querySelectorAll('#ch-version').forEach(el => el.textContent = APP_VERSION);
  document.title = 'Olivier — US College Soccer Guide ' + APP_VERSION;

  // Update header stats dynamically from loaded data
  const totalSchools  = unis.filter(u => !u.noVarsity).length;
  const totalDivs     = [...new Set(unis.map(u=>u.div).filter(Boolean))].length;
  const totalConfs    = [...new Set(unis.map(u=>u.confKey).filter(Boolean))].length;
  const totalTop      = unis.filter(u=>u.top).length;
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('hstat-schools', totalSchools);
  set('hstat-divs',    totalDivs);
  set('hstat-confs',   totalConfs);
  set('hstat-top',     totalTop);

  renderDashboard();
  renderFilterChips();
  renderCards();
  renderComparePage();
  renderConferences();
  renderPathways();
  renderPipelineTables();
  renderConferencePrestige();
  renderACUTable();
  renderCoachCards();
  renderCoachTable();
  renderOutreachTracker();
  initCoachTabs();
  renderFinSchoolSelector();
  renderFinComparisonBars();
  renderMinutesOutlook();
  recalculateAllScores(athleteConfig);
  onAtarSlide();
  applyLens(currentLens);
  initModalFocusTrap();
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let modalTriggerEl = null;

function initModalFocusTrap() {
  // Click the dark overlay (not the modal card itself) to close
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (!currentModalId) return;
    const overlay = document.getElementById('modal');
    const inner   = overlay ? overlay.querySelector('.modal') : null;
    if (!inner) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = [...inner.querySelectorAll(FOCUSABLE)];
      if (!focusables.length) { e.preventDefault(); return; }
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  });
}

// Division show/hide toggle
function toggleDivSection(btn){
  const section = btn.closest('.conf-section');
  const collapsed = section.classList.toggle('div-collapsed');
  btn.textContent = collapsed ? 'Show' : 'Hide';
}

// ═══ v15: Lens system ══════════════════════════════════════════════════════
const LENSES = [
  {key:'overall',   label:'Best Overall',     desc:"Olivier's Fit Score — soccer program quality, minutes outlook, climate, and city lifestyle combined, minus a housing penalty where a school has no or unguaranteed on-campus housing. GPA, cost, and ACU alignment are handled separately (ATAR/budget toggles, Financial Model, ACU Alignment tab)."},
  {key:'academic',  label:'Academic-First',   desc:'Weights ACU BESS unit alignment (85%) plus a baseline. UF tops this list but cannot be played at — flagged accordingly.'},
  {key:'minutes',   label:'Minutes Outlook',  desc:'2027-entry roster opportunity. Higher = more midfielder slots opening up before Olivier arrives.'},
  {key:'lifestyle', label:'Lifestyle-First',  desc:'Climate (warm), city access, and cultural match for Sydney-raised Olivier.'},
  {key:'value',     label:'Value-First',      desc:'Fit score per dollar of cost. Best fit-to-cost ratio.'},
];
let currentLens = 'overall';

function lensRank(lensKey){
  // Full-profile schools only — listed schools have unverified lensScores
  return [...unis].filter(u=>u.profileDepth==='full').sort((a,b)=>{
    const sa = (a.lensScores && a.lensScores[lensKey]) || 0;
    const sb = (b.lensScores && b.lensScores[lensKey]) || 0;
    if(sb !== sa) return sb - sa;
    const fa = a.fitOlivier || 0;
    const fb = b.fitOlivier || 0;
    return fb - fa;
  }).map(u=>u.id);
}

// v15: per-division ranking - returns {divKey: [topId1, topId2, topId3], ...}
const DIVISIONS_ORDER = ['D1','IVY','D2','NAIA','D3','JUCO'];
function lensRankByDivision(lensKey){
  const out = {};
  DIVISIONS_ORDER.forEach(div=>{
    // Full-profile schools only — listed schools have unverified lensScores
    const inDiv = unis.filter(u=>u.div===div && u.profileDepth==='full');
    if(inDiv.length===0) return;
    const sorted = inDiv.sort((a,b)=>{
      const sa = (a.lensScores && a.lensScores[lensKey]) || 0;
      const sb = (b.lensScores && b.lensScores[lensKey]) || 0;
      if(sb !== sa) return sb - sa;
      return (b.fitOlivier || 0) - (a.fitOlivier || 0);
    });
    out[div] = sorted.slice(0, Math.min(3, sorted.length));
  });
  return out;
}

function lensRankByConference(lensKey){
  const confKeys = [...new Set(unis.map(u=>u.confKey).filter(Boolean))];
  const out = {};
  confKeys.forEach(ck=>{
    // Full-profile schools only — listed schools have unverified lensScores
    const inConf = unis.filter(u=>u.confKey===ck && u.profileDepth==='full');
    if(!inConf.length) return;
    const sorted = [...inConf].sort((a,b)=>{
      const sa = (a.lensScores?.[lensKey])||0;
      const sb = (b.lensScores?.[lensKey])||0;
      return sb - sa;
    });
    out[ck] = sorted.slice(0,3);
  });
  return out;
}

const SORT_OPTIONS = [
  { key:'fit',  label:'Best Fit',    fn:(a,b)=>(b.fitOlivier||0)-(a.fitOlivier||0) },
  { key:'cost', label:'Lowest Cost', fn:(a,b)=>(a.fin?.costNum||0)-(b.fin?.costNum||0) },
  { key:'acu',  label:'ACU Align',   fn:(a,b)=>(b.acuAlign||0)-(a.acuAlign||0) },
  { key:'mls',  label:'MLS Pipeline',fn:(a,b)=>(b.proPlayers?.mlsPicks5yr||0)-(a.proPlayers?.mlsPicks5yr||0) },
];
let currentSort = 'fit';

function applySort(key){
  currentSort = key;
  document.querySelectorAll('.sort-pill').forEach(p=>
    p.classList.toggle('active', p.dataset.sort===key)
  );
  // Best Fit sort is lens-aware: when a lens is active sort by lens score
  const lensAwareFit = (a, b) => {
    if (currentLens && currentLens !== 'overall') {
      const sa = (a.lensScores?.[currentLens]) || 0;
      const sb = (b.lensScores?.[currentLens]) || 0;
      if (sb !== sa) return sb - sa;
    }
    return (b.fitOlivier || 0) - (a.fitOlivier || 0);
  };
  const sortFn = key === 'fit' ? lensAwareFit : SORT_OPTIONS.find(s=>s.key===key).fn;
  document.querySelectorAll('.cards-grid').forEach(grid=>{
    const cards = [...grid.children];
    cards.sort((a,b)=>{
      const ua = unis.find(x=>x.id===a.id.replace('card-',''));
      const ub = unis.find(x=>x.id===b.id.replace('card-',''));
      return sortFn(ua||{}, ub||{});
    });
    cards.forEach(c=>grid.appendChild(c));
  });
}

function renderLensControls(){
  const container = document.getElementById('lens-controls');
  if(!container) return;
  container.innerHTML =
    '<div class="lens-header-row">'+
      '<span class="lens-label">View by</span>'+
      '<div class="lens-pills">'+
        LENSES.map(L=>
          '<button class="lens-pill'+(L.key===currentLens?' active':'')+'" '+
            'data-lens="'+L.key+'" onclick="applyLens(\''+L.key+'\')" '+
            'title="'+L.desc.replace(/"/g,'&quot;')+'">'+L.label+'</button>'
        ).join('')+
      '</div>'+
      '<div class="search-schools-wrap" style="margin-left:auto">'+
        '<input id="search-schools" type="text" placeholder="Search schools…" '+
          'oninput="filterBySearch(this.value);document.getElementById(\'search-clear-btn\').style.display=this.value?\'\':\'none\'">'+
        '<button id="search-clear-btn" onclick="clearSearch()" title="Clear search">✕</button>'+
      '</div>'+
    '</div>';
}

function currentLensExplainer(){
  const L = LENSES.find(x=>x.key===currentLens);
  if(!L) return '';
  return '<div class="lens-desc">'+L.desc+'</div>';
}

function applyLens(lensKey){
  currentLens = lensKey;
  // Update active lens pill
  document.querySelectorAll('.lens-pill').forEach(b=>{
    b.classList.toggle('active', b.dataset.lens===lensKey);
  });
  // Re-sort cards using the now-updated lens (Best Fit is lens-aware)
  applySort(currentSort);

  // Per-division ranking — get top 3 IDs per division for badge highlights
  const byDiv = lensRankByDivision(lensKey);
  const top3IdsByDiv = {};
  Object.keys(byDiv).forEach(div=>{
    top3IdsByDiv[div] = byDiv[div].map(u=>u.id);
  });

  // Highlight top 3 within each division — deferred to next frame so sort has painted first
  requestAnimationFrame(() => {
    document.querySelectorAll('.ucard').forEach(card=>{
      const id = card.id.replace('card-','');
      card.classList.remove('lens-top1','lens-top2','lens-top3');
      const u = unis.find(x=>x.id===id);
      if(!u) return;
      const divTops = top3IdsByDiv[u.div] || [];
      const pos = divTops.indexOf(id);
      // Mark #1 per division for the filter
      card.dataset.lensdivtop = (pos===0) ? 'true' : 'false';
      if(pos >= 0){
        if(pos===0) card.classList.add('lens-top1');
        else if(pos===1) card.classList.add('lens-top2');
        else if(pos===2) card.classList.add('lens-top3');
        // Add lens badge
        let badge = card.querySelector('.lens-badge');
        if(!badge){
          badge = document.createElement('div');
          badge.className = 'lens-badge';
          card.insertBefore(badge, card.firstChild);
        }
        const lensLabel = LENSES.find(L=>L.key===lensKey).label;
        const warn = u.noVarsity ? ' ⚠' : '';
        // Never badge listed schools — their scores are unverified
        if(u.profileDepth === 'listed'){
          card.classList.remove('lens-top1','lens-top2','lens-top3');
          card.dataset.lensdivtop = 'false';
          const badge = card.querySelector('.lens-badge');
          if(badge) badge.remove();
        } else {
          badge.textContent = '★ #'+(pos+1)+' '+u.div+' · '+lensLabel.toUpperCase()+warn;
        }
      } else {
        const badge = card.querySelector('.lens-badge');
        if(badge) badge.remove();
      }
    });
  });
}

// ═══ Application logic ═══════════════════════════════════════════════════════
let selectedIds=new Set();
let currentModalId = null;

// ── Toast notifications ───────────────────────────────────────────────────────
// showToast(msg, type) — type: 'info' (default) | 'warn' | 'ok'
function showToast(msg, type) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = [
      'position:fixed','bottom:1.5rem','left:50%','transform:translateX(-50%) translateY(20px)',
      'padding:9px 18px','border-radius:10px','font-size:13px','font-weight:600',
      'box-shadow:0 4px 16px rgba(0,0,0,.14)','z-index:9999',
      'opacity:0','transition:opacity .2s,transform .2s','pointer-events:none',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(toast);
  }
  const colors = {
    warn: ['#451a03','#fef3c7'],
    ok:   ['#052e16','#dcfce7'],
    info: ['#0f172a','#e0e7ff'],
  };
  const [fg, bg] = colors[type] || colors.info;
  toast.style.background = bg;
  toast.style.color = fg;
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2800);
}
function sc(s){return s>=90?'#059669':s>=80?'#d97706':'#e11d48';}
function chipLabel(pos){
  if(!pos) return '—';
  const p = pos.toLowerCase();
  // Champions / titles
  if(p.includes('champ') && !p.includes('runner')) return 'Champs';
  if(p.includes('1st')) return '1st';
  if(p.includes('2nd')) return '2nd';
  if(p.includes('3rd')) return '3rd';
  if(p.includes('4th')) return '4th';
  if(p.includes('5th')) return '5th';
  if(p.includes('6th')) return '6th';
  if(p.includes('final') && p.includes('aac')) return 'Final';
  if(p.includes('final') && p.includes('acc')) return 'Final';
  if(p.includes('final') && p.includes('ssc')) return 'Final';
  if(p.includes('final') && p.includes('big')) return 'Final';
  if(p.includes('final')) return 'Final';
  if(p.includes('tourn') && !p.includes('final')) return 'T-QF';
  if(p.includes('mid')) return 'Mid';
  if(p.includes('lower')) return 'Lower';
  if(p.includes('contend')) return 'Cont.';
  // Fallback: first two words max 10 chars
  const words = pos.split(' ');
  const short = words.slice(0,2).join(' ');
  return short.length > 10 ? words[0] : short;
}
function posColor(pos){
  if(!pos)return 'sy-na';
  const p=(pos||'').toLowerCase();
  if(p.includes('1st')||p.includes('champion')||p.includes('tourn'))return 'sy-top';
  if(p.includes('2nd')||p.includes('3rd')||p.includes('top 3')||p.includes('top 4')||p.includes('final'))return 'sy-mid';
  if(p.includes('mid')||p.includes('lower')||p.includes('4th')||p.includes('5th')||p.includes('6th'))return 'sy-low';
  return 'sy-na';
}
function alignColor(n){return n>=14?'var(--emerald)':n>=10?'var(--sky)':'var(--amber)';}
function alignLabel(n){return n>=14?'Full align':n>=10?'Strong align':'Partial align';}

function renderCards(){
  const container=document.getElementById('cards-container');
  container.innerHTML='';
  renderLensControls();

  // Group by conference key — prevents the 71-card D1 wall
  const CONF_SECTIONS=[
    {key:'acc',      label:'ACC — Atlantic Coast Conference',     tier:'Power 4 · D1', intro:'Elite D1 soccer — strongest conference in the guide. 6 fully-profiled schools: Virginia (7 NCAA titles), Wake Forest (2024 ACC Tourn champs), SMU (2025 ACC Tournament Champions — first ever), Clemson (2× recent NCAA champions, nation-leading 4 first-round picks in 2026 draft), Notre Dame (27 MLS picks), UNC (ACC Regular Season champs 2023). Stanford and Duke among 14 listed programs.'},
    {key:'big-ten',  label:'Big Ten Conference',                  tier:'Power 4 · D1', intro:'Most prolific MLS-producing conference all-time. UCLA on the West Coast, Indiana in the Midwest (8 NCAA titles), Maryland (most MLS picks of any program ever — 49 + 7 homegrown under Cirovski). Penn State, Michigan, USC all elite listed programs.'},
    {key:'big-east', label:'Big East Conference',                 tier:'Major · D1',   intro:'NYC-dominated conference. St. John\'s and Georgetown both fully profiled. Georgetown are 2019 national champions under Wiese — 42 MLS signings, D.C. United + NYCFC pipeline. Creighton and UConn are perennial top-10 programs. Strong clinical network in major cities.'},
    {key:'aac',      label:'AAC — American Athletic Conference',  tier:'High Major · D1',intro:'FIU and USF both fully profiled in the AAC. Most accessible Power-conference D1 for internationals — warm climate, strong exercise science degrees. FIU reached the 2025 AAC Championship Final. Navy and Army offer full federal scholarships (zero cost).'},
    {key:'big-west', label:'Big West Conference',                 tier:'High Major · D1',intro:'West Coast D1. UCSB fully profiled — Manu Duah went #1 overall in 2025 MLS Draft from here. Cal Poly, UC Davis, UC Irvine all competitive. Pacific lifestyle matches Sydney.'},
    {key:'caa',      label:'CAA — Colonial Athletic Association', tier:'Mid-Major · D1', intro:'Mid-major D1. College of Charleston fully profiled with Charleston Battery (USL) connection. William & Mary, Hofstra, Northeastern round out a competitive conference.'},
    {key:'asun',     label:'ASUN Conference',                    tier:'Mid-Major · D1', intro:'Mid-major D1 spanning the South and Southeast. UCA (Conway, AR) is fully profiled — best D1 central midfielder opening in the guide with 6 of 9 MFs clearing before Olivier arrives. Strong Kinesiology program with UAMS clinical network. Most affordable D1 in the guide at ~$28k/yr.'},
    {key:'mac',      label:'MAC — Mid-American Conference',       tier:'Mid-Major · D1', intro:'Akron is the hidden gem of this guide — top-20 MLS pipeline, explicit Pre-PT concentration, Cleveland Clinic clinical network, and coach Jared Embick contracted through 2035. Cold Ohio winters are the main lifestyle drawback. Best PT pathway + soccer value in D1.'},
    {key:'wac',      label:'WAC — Western Athletic Conference',   tier:'Mid-Major · D1', intro:'GCU (Phoenix, AZ) fully profiled — Jamie Davies appointed December 2025. Warm major city campus, Kinesiology with Banner Health clinical network. 2025 WAC champions and NCAA Sweet 16. Best warm D1 city campus outside Florida and California.'},
    {key:'wcc',      label:'WCC — West Coast Conference',         tier:'Mid-Major · D1', intro:'Denver (University of Denver) fully profiled — 5 consecutive Summit League titles 2021-2025, College Cup 2024, moving to WCC in 2026. Kinesiology launched 2023. Denver city is excellent — outdoor lifestyle, 300 days sunshine, Colorado Rapids MLS. Cold winters the main drawback.'},
    {key:'america-east', label:'America East Conference',         tier:'Mid-Major · D1', intro:'Vermont (Burlington, VT) listed — 2024 NCAA National Champions. New coach Adrian Dubois in 2026. Burlington is cold — not a lifestyle match for Olivier. Listed for pipeline reference.'},
    {key:'nec',      label:'NEC — Northeast Conference',          tier:'Mid-Major · D1', intro:'Mid-major D1. Mercyhurst University (Erie, PA) joined the NEC in Fall 2024 and won the NEC regular-season title in that first D1 season under HC Austin Solomon, before finishing 8th in 2025. Provisional D1 — no NCAA postseason until 2028-29. B.S. Exercise Science with 500-hour clinical internship. High cost (~$63k) offset by 93% of students receiving aid averaging $31k.'},
    {key:'other', divFilter:'IVY',     label:'Ivy League',              tier:'D1 · Ivy',      intro:'No athletic scholarships — need-based aid only. Princeton won the 2024 and 2025 Ivy League Tournaments back-to-back under Jim Barlow. Yale won 2023. Both require 3.9+ GPA. Kinesiology degrees are not available but Ivy credentials carry enormous DPT school credibility. Only viable if GPA climbs to 3.5+.'},
    {key:'other', divFilter:'D2',      label:'NCAA Division II — SSC',  tier:'D2',            intro:'Best overall PT pathway tier. PBA won the 2025 SSC Regular Season (#1 seed) and is nationally ranked #2. Lynn are the 2024 D2 national champions. Barry has 4 D2 NCAA titles. Nova Southeastern has a DPT program on campus. Cal State LA is the most affordable LA option at ~$28k. St Edwards has an Austin FC pipeline.'},
    {key:'other', divFilter:'NAIA',    label:'NAIA',                    tier:'NAIA',          intro:'Generous scholarships, smaller campuses, personal development. Oklahoma City University has a strong NAIA soccer tradition under HC Billy Martin (since 2020), continuing the legacy of founder coach Brian Harvey. Keiser University in Fort Lauderdale has clinical simulation labs and a warm Florida campus close to MLS action.'},
    {key:'other', divFilter:'D3',      label:'NCAA Division III',        tier:'D3',            intro:'Chapman University (Orange, CA) has a mandatory KIN 405 Pre-PT Prep course — the strongest D3 pre-physical therapy pathway in the guide. D3 schools offer no athletic scholarships but provide strong academics and competitive soccer.'},
    {key:'other', divFilter:'JUCO',    label:'Junior College (JUCO)',    tier:'JUCO',          intro:'Tyler Junior College (Tyler, TX) is the #1 JUCO D1 transfer feeder nationally — all-time record for D1 placements. Daytona State College (Daytona Beach, FL) are the 2025 NJCAA DI National Championship runners-up and a top-5 D1 transfer feeder — warm Florida beach city. Indian Hills CC (Ottumwa, IA) are the 2025 NJCAA DI National Champions under Zac Newton. Monroe University Mustangs (New Rochelle, NY) are 3× NJCAA DI National Champions with Australian alumni on roster. Santa Monica College ($9k/yr) has the best UCLA transfer pipeline in California. Cowley County CC and Barton CC (both KS) are ranked in the current national top-5. Arizona Western College (#2 nationally, 2025) pairs a genuine Exercise/Wellness/Nutrition degree with a warm desert climate. Eastern Florida State plays in a 1,000-seat stadium-grade facility on Florida\'s Space Coast. All 12 JUCO programs are 2-year transfer platforms.'},
  ];

  // Also include Ivy League under acc or as standalone — they are in other.json
  CONF_SECTIONS.forEach(sec=>{
    let secUnis;
    if(sec.key==='other' && sec.divFilter){
      if(sec.divFilter==='IVY')     secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='IVY');
      else if(sec.divFilter==='D2') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='D2');
      else if(sec.divFilter==='NAIA') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='NAIA');
      else if(sec.divFilter==='D3') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='D3');
      else if(sec.divFilter==='JUCO') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='JUCO');
      else if(sec.divFilter==='D3JUCO') secUnis=unis.filter(u=>u.confKey==='other'&&(u.div==='D3'||u.div==='JUCO'));
      else secUnis=unis.filter(u=>u.confKey===sec.key);
    } else {
      secUnis=unis.filter(u=>(u.confKey||'other')===sec.key);
    }
    if(!secUnis.length) return;
    const fullCount=secUnis.filter(u=>u.profileDepth==='full').length;
    const listedCount=secUnis.filter(u=>u.profileDepth==='listed').length;
    const countNote=listedCount>0?` <span style="font-size:10px;color:var(--hint);font-weight:500">${fullCount} full profile · ${listedCount} listed</span>`:'';
    const el=document.createElement('div');
    el.className='conf-section div-collapsed';
    el.dataset.div=secUnis[0]?.div||'D1';
    el.dataset.confkey=sec.key;
    const headHtml=
      `<div class="section-head">` +
        `<h2>${sec.label}${countNote}</h2>` +
        `<span class="dbadge d-${secUnis[0]?.div||'D1'}" style="font-size:9px">${sec.tier}</span>` +
        `<button class="div-toggle-btn" onclick="toggleDivSection(this)" title="Show/hide this conference">Show</button>` +
      `</div>` +
      `<div class="section-intro">${sec.intro}</div>`;

    if(sec.divFilter==='JUCO'){
      // Group by NJCAA region — schools without an njcaaRegion (e.g. CCCAA-affiliated) get their own bucket
      const groups={};
      secUnis.forEach(u=>{
        const rk=u.njcaaRegion||'CCCAA';
        (groups[rk]=groups[rk]||[]).push(u);
      });
      const regionKeys=Object.keys(groups).sort((a,b)=>{
        if(a==='CCCAA') return 1;
        if(b==='CCCAA') return -1;
        return parseInt(a.replace('Region ',''),10)-parseInt(b.replace('Region ',''),10);
      });
      let bodyHtml='';
      regionKeys.forEach((rk,i)=>{
        const list=groups[rk];
        const area=list[0].njcaaRegionArea;
        const label=rk==='CCCAA' ? 'CCCAA — California (non-NJCAA)' : `NJCAA ${rk}${area?' — '+area:''}`;
        bodyHtml+=
          `<div class="region-subhead"><h3>${label}</h3><span class="region-count">${list.length} school${list.length>1?'s':''}</span></div>` +
          `<div class="cards-grid region-grid" id="grid-${sec.key}-${i}"></div>`;
      });
      el.innerHTML=headHtml+bodyHtml;
      container.appendChild(el);
      regionKeys.forEach((rk,i)=>{
        const grid=el.querySelector(`#grid-${sec.key}-${i}`);
        groups[rk].forEach(u=>grid.appendChild(buildCard(u)));
      });
    } else {
      el.innerHTML=headHtml+`<div class="cards-grid" id="grid-${sec.key}"></div>`;
      container.appendChild(el);
      const grid=el.querySelector(`#grid-${sec.key}`);
      secUnis.forEach(u=>grid.appendChild(buildCard(u)));
    }
  });

  // Update the filter summary count now that all cards are rendered
  const totalCards = document.querySelectorAll('#cards-container .ucard').length;
  const summaryEl = document.getElementById('filter-active-summary');
  if(summaryEl) summaryEl.innerHTML = 'Showing all <strong>'+totalCards+'</strong> schools';
}

// ── School emblem logo helper ────────────────────────────────────────────────
// Tries Clearbit (high-res PNG) first, falls back to Google favicon (64px),
// then falls back to the coloured text abbreviation if both fail.
function logoUrl(u, size){
  if(!u.domain) return null;
  return 'https://www.google.com/s2/favicons?domain=' + u.domain + '&sz=64';
}
function buildEmblemHtml(u, sizeClass){
  const abbr = u.name.slice(0,4);
  const bg   = (u.color || ['#e0e7ff','#4f46e5'])[0];
  const fg   = (u.color || ['#e0e7ff','#4f46e5'])[1];
  if(!u.domain){
    return '<div class="card-av2 '+sizeClass+'" style="background:'+bg+';color:'+fg+'">'+abbr+'</div>';
  }
  const id = 'emb-'+u.id;
  return '<div class="card-emblem '+sizeClass+'" id="'+id+'" data-abbr="'+abbr+'" data-bg="'+bg+'" data-fg="'+fg+'" data-domain="'+u.domain+'">'+
    '<img src="'+logoUrl(u)+'" alt="'+u.name+'" '+
      'onerror="var p=this.parentNode;p.innerHTML=\'<div class=\\\'card-av2\\\' style=\\\'background:\'+p.dataset.bg+\';color:\'+p.dataset.fg+\'\\\'>\'+p.dataset.abbr+\'</div>\'">'+
  '</div>';
}


function buildCard(u){
  const el=document.createElement('div');
  el.className='ucard'+(u.top?' top-pick':'');
  el.dataset.div=u.div; el.dataset.region=u.region; el.dataset.warm=u.warm; el.dataset.top=u.top;
  el.dataset.city=u.city?'true':'false';
  el.dataset.acualign=u.acuAlign>=14?'full':u.acuAlign>=10?'strong':'partial';
  el.dataset.lensdivtop='false';
  el.dataset.conf=u.conf;
  el.dataset.confkey=u.confKey||'other';
  el.dataset.confgroup=resolveConfGroup(u.conf||'');
  const gpaBucket=!u.gpa?'low':
    (u.gpa.minEntry.toLowerCase().includes('no minimum')||u.gpa.minEntry.toLowerCase().includes('open'))?'none':
    (u.gpa.minEntry.includes('2.0')||u.gpa.minEntry.includes('2.3'))?'low':
    u.gpa.minEntry.includes('2.5')?'mid':
    (u.gpa.minEntry.includes('3.0')||u.gpa.minEntry.includes('3.5')||u.gpa.minEntry.includes('3.9'))?'high':'low';
  el.dataset.gpamin=gpaBucket;
  const facRating=(u.facilityDetails?.rating||'Solid').toLowerCase().replace(/\s+/g,'');
  el.dataset.facrating=facRating;
  el.id='card-'+u.id;

  const isListed = u.profileDepth === 'listed';
  const cardColor = u.color || ['#e0e7ff', '#4f46e5'];
  const devAvg = !u.devScores
    ? null
    : Object.values(u.devScores).every(v => v === 0)
      ? null
      : Math.round((u.devScores.tactical + u.devScores.technical + u.devScores.fitness) / 3);
  const ivyWarn=u.div==='IVY'?'<div class="ivy-warning" style="margin:.5rem .9rem;border-radius:7px">⚠ Ivy: No athletic scholarships. Need-based only. GPA 2.8 likely insufficient.</div>':'';

  // GPA compact row
  let gpaHtml='';
  if(u.gpa){
    const statusColor=u.gpa.status==='eligible'?'var(--emerald)':u.gpa.status==='borderline'?'var(--amber)':'var(--rose)';
    const statusIcon=u.gpa.status==='eligible'?'✅':u.gpa.status==='borderline'?'⚠️':'❌';
    const isOpen=u.gpa.minEntry.toLowerCase().includes('no minimum')||u.gpa.minEntry.toLowerCase().includes('open');
    const entryText=isOpen?'Open entry ✅':u.gpa.minEntry+' '+statusIcon;
    const targetShort=u.gpa.minSchol.split(' ')[0];
    gpaHtml='<div class="gpa-compact">'
      +'<span class="gpa-c-label">GPA</span>'
      +'<span class="gpa-c-val" style="color:'+statusColor+'">'+entryText+'</span>'
      +'<span class="gpa-c-target">Target: '+targetShort+'</span>'
      +'</div>';
  }

  const facEmoji=facRating==='elite'?'🏆':facRating==='excellent'?'⭐':facRating==='verygood'?'✅':facRating==='good'?'👍':'📋';
  const facLabel=u.facilityDetails?u.facilityDetails.rating:'—';
  const standingHtml=(u.confRecord||[]).slice(0,5).map(function(r){
    return '<span class="sy '+posColor(r.pos)+'" title="'+r.yr+': '+r.note+'" style="font-size:9px">'+r.yr.toString().slice(2)+': '+chipLabel(r.pos)+'</span>';
  }).join('');
  const titlesNote=(u.titles||[]).length>0?'<span style="margin-left:4px;font-size:9px;color:var(--gold);font-weight:700">🏆 '+u.titles.length+' title'+(u.titles.length>1?'s':'')+'</span>':'';

  const alignBg=alignColor(u.acuAlign)==='var(--emerald)'?'var(--emerald3)':alignColor(u.acuAlign)==='var(--sky)'?'var(--sky3)':'var(--amber3)';

  const warmTag=u.warm?'<span style="color:var(--amber);font-size:9px">☀ Warm</span>':'';
  const cityTag=u.city?'<span style="color:var(--sky);font-size:9px">🏙 City</span>':'';
  const confShort=u.conf.split(' ')[0];
  const locShort=u.loc.split(',').slice(-2).join(',').trim();
  const topBadge=u.top?'<div class="tp-badge">★ TOP PICK</div>':'';
  const eliteJucoChip=(u.div==='JUCO'&&u.jucoTier==='Elite')?'<span class="elite-juco-chip" title="'+(u.jucoTierNote||'').replace(/"/g,'&quot;')+'">🏆 Elite JUCO</span>':'';
  // Silent when housing is available (the expected default) — only flag the exception,
  // same pattern as Top Pick / Elite JUCO. Avoids stacking a tag on every single card.
  const housing = u.facilityDetails && u.facilityDetails.housing;
  const housingChip = (housing && housing.available === false)
    ? '<span class="housing-warn-chip" title="'+(housing.note||'').replace(/"/g,'&quot;')+'">🏠 No on-campus housing</span>'
    : (housing && housing.available === 'limited')
      ? '<span class="housing-warn-chip" title="'+(housing.note||'').replace(/"/g,'&quot;')+'">🏠 Limited housing</span>'
      : '';
  const inSchol=selectedIds.has(u.id);

  el.innerHTML=
    topBadge+
    '<div class="card-head2">'+
      buildEmblemHtml(u, 'card-av-size')+
      '<div class="card-id">'+
        '<h3>'+u.full+'</h3>'+
        '<div class="card-sub">'+
          '<span class="dbadge d-'+u.div+'" style="font-size:9px;padding:1px 6px">'+u.div+'</span>'+
          '<span style="color:var(--hint)">'+confShort+'</span>'+
          (u.njcaaRegion?'<span style="color:var(--hint)" title="'+(u.njcaaRegionArea||'')+'">· '+u.njcaaRegion+'</span>':'')+
          '<span>📍'+locShort+'</span>'+
          warmTag+cityTag+eliteJucoChip+housingChip+
        '</div>'+
      '</div>'+
    '</div>'+
    ivyWarn+
    '<div class="score-strip">'+
      '<div class="ss-item" data-tip="Fit Score: Soccer program quality, minutes outlook, climate, and city lifestyle combined — minus a penalty (−6/−3) where on-campus housing is missing or unguaranteed. Deliberately excludes GPA, cost, and ACU alignment — check those separately (ATAR/budget toggles, Financial Model, ACU Alignment tab). 90%+ = excellent soccer/lifestyle opportunity."><div class="ss-val" id="fit-'+u.id+'" style="color:'+sc(u.fitOlivier)+'">'+u.fitOlivier+'%</div><div class="ss-lbl">Fit Score</div></div>'+
      '<div class="ss-item" data-tip="Dev Score: Average of 3 soccer development sub-scores — Tactical, Technical, and Fitness Programming. Reflects how well the program will develop Olivier as a player."><div class="ss-val" style="color:'+(devAvg===null?'var(--hint)':sc(devAvg))+'">'+(devAvg===null?'—':devAvg+'%')+'</div><div class="ss-lbl">Dev Score</div></div>'+
      '<div class="ss-item" data-tip="ACU Alignment: How many of Olivier\'s 16 ACU BESS units are covered by this US degree. 14-16 = Full align (some units may transfer as direct credit). 10-13 = Strong. Below 10 = Partial."><div class="ss-val" style="color:'+alignColor(u.acuAlign)+';font-size:.95rem">'+u.acuAlign+'/16</div><div class="ss-lbl">ACU Align</div></div>'+
    '</div>'+
    '<div class="degree-band">'+
      '<span class="db-title" title="'+u.degreeTitle+'">'+u.degreeTitle+'</span>'+
      '<span class="db-align" style="background:'+alignBg+';color:'+alignColor(u.acuAlign)+'">'+alignLabel(u.acuAlign)+'</span>'+
    '</div>'+
    '<div class="info-grid2">'+
      '<div class="ig2-item"><div class="ig2-label">Annual Cost</div><div class="ig2-val" style="color:var(--amber)">'+costDisplay(u)+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Aid Type</div><div class="ig2-val">'+u.aid+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Pre-PT Path</div><div class="ig2-val" style="color:var(--emerald)">'+u.prePT.split('—')[0].trim()+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">MLS Picks (5yr)</div><div class="ig2-val">'+(u.proPlayers&&u.proPlayers.mlsPicks5yr!==undefined?u.proPlayers.mlsPicks5yr+' picks':'—')+'</div></div>'+
      (isListed
        ? '<div class="ig2-item"><div class="ig2-label">Profile</div><div class="ig2-val" style="color:var(--hint);font-size:10px">Listed — full data pending</div></div>'
        : '<div class="ig2-item"><div class="ig2-label">Facilities</div><div class="ig2-val"><span class="fac-card-badge fac-'+facRating+'">'+facEmoji+' '+facLabel+'</span></div></div>')+
      '<div class="ig2-item"><div class="ig2-label">Soccer Level</div><div class="ig2-val" style="font-size:10.5px">'+u.soccerLevel.split('—')[0].trim()+'</div></div>'+
    '</div>'+
    gpaHtml+
    '<div class="conf-strip">'+
      '<span class="conf-lbl">6yr:</span>'+
      standingHtml+
      titlesNote+
    '</div>'+
    '<div class="card-footer2">'+
      '<div class="card-coach">Coach: <strong>'+u.coach.name+'</strong></div>'+
      '<div class="card-btns">'+
        '<button class="compare-btn'+(inSchol?' selected':'')+'" id="cbtn-'+u.id+'" onclick="toggleCompare(\''+u.id+'\',this)">'+(inSchol?'✓':'+')+' Compare</button>'+
        (isListed?'<button class="detail-btn listed-btn" disabled>Preview</button>':'<button class="detail-btn" onclick="openDetail(\''+u.id+'\')">Details →</button>')+
      '</div>'+
    '</div>';
  return el;
}

function toggleCompare(id,btn){
  if(selectedIds.has(id)){selectedIds.delete(id);btn.textContent='+ Compare';btn.classList.remove('selected');}
  else{if(selectedIds.size>=4){showToast('Max 4 schools — remove one first','warn');return;}selectedIds.add(id);btn.textContent='✓ In Compare';btn.classList.add('selected');}
  document.getElementById('ccount').textContent=selectedIds.size;
  renderComparePage();
}

function renderComparePage(){
  const container=document.getElementById('compare-content');
  if(selectedIds.size===0){container.innerHTML='<div class="compare-empty"><h3>No schools selected yet</h3><p>Go to <strong>Explore Schools</strong> and click "+ Compare".</p></div>';return;}
  const sel=unis.filter(u=>selectedIds.has(u.id));
  const rows=[
    ['University',u=>`<div class="cval head">${u.name}</div>`],
    ['Location',u=>`<div class="cval">${u.loc}</div>`],
    ['Division',u=>`<div class="cval"><span class="dbadge d-${u.div}">${u.div}</span><br><span style="font-size:11px;color:var(--hint)">${u.conf}</span></div>`],
    ['Bachelor\'s Degree',u=>`<div style="font-size:12px;font-weight:600;color:var(--navy)">${u.degreeTitle}</div>`],
    ['ACU Alignment',u=>`<div style="font-size:18px;font-weight:800;color:${alignColor(u.acuAlign)}">${u.acuAlign}/16</div><div style="font-size:11px;color:var(--muted)">${alignLabel(u.acuAlign)}</div>`],
    ['Align Note',u=>`<div style="font-size:11px;color:var(--muted);line-height:1.55">${u.acuAlignNote}</div>`],
    ['Annual Cost',u=>`<div class="cval warn">${costDisplay(u)}</div>`],
    ['Aid Available',u=>`<div class="cval good">${u.aid}</div>`],
    ['GPA Min Entry',u=>{
      const status = u.gpa ? dynamicGpaStatus(currentAtarGpa, u.gpa.minEntry) : null;
      const color = status==='eligible'?'var(--emerald)':status==='borderline'?'var(--amber)':status==='below'?'var(--rose)':'var(--muted)';
      const icon = status==='eligible'?'✅':status==='borderline'?'⚠️':status==='below'?'❌':'';
      return `<div style="font-size:13px;font-weight:700;color:${color}">${u.gpa?u.gpa.minEntry:'—'} ${icon}</div><div style="font-size:10px;color:var(--muted);margin-top:3px">${u.gpa?'Target: '+u.gpa.minSchol:''}</div>`;
    }],
    ['Conference (last 6yr)',u=>`<div>${u.confRecord.map(r=>`<div style="font-size:11px;margin-bottom:2px"><span class="sy ${posColor(r.pos)}" style="margin-right:4px">${r.yr}</span>${r.pos}</div>`).join('')}</div>`],
    ['Titles',u=>`<div>${u.titles.slice(0,3).map(t=>`<span class="title-chip" style="display:block;margin-bottom:2px;font-size:10px">${t}</span>`).join('')}</div>`],
    ['MLS Picks 5yr',u=>`<div style="font-size:18px;font-weight:800;color:var(--indigo)">${u.proPlayers.mlsPicks5yr}</div><div style="font-size:11px;color:var(--muted)">${u.proPlayers.draftRank.slice(0,45)}</div>`],
    ['Notable Pro Players',u=>`<div>${(u.proPlayers.notable||[]).slice(0,2).map(n=>`<div style="font-size:11px;color:var(--muted);margin-bottom:3px">• ${n}</div>`).join('')}</div>`],
    ['Pre-PT Path',u=>`<div class="cval good">${u.prePT}</div>`],
    ['Facilities Rating',u=>`<div><span class="fac-rating-badge fac-${(u.facilityDetails?.rating||'Solid').toLowerCase().replace(' ','')}" style="margin-bottom:4px;display:inline-block">${u.facilityDetails?.rating||'—'}</span></div>`],
    ['Stadium',u=>`<div style="font-size:11px;color:var(--muted);line-height:1.5">${u.facilityDetails?.stadium?.split('—')[0]?.trim()||'—'}</div>`],
    ['Strength & Conditioning',u=>`<div style="font-size:11px;color:var(--muted);line-height:1.5">${u.facilityDetails?.strengthConditioning?.slice(0,120)||'—'}${(u.facilityDetails?.strengthConditioning?.length||0)>120?'…':''}</div>`],
    ['Sports Science Tech',u=>`<div style="font-size:11px;color:var(--muted);line-height:1.5">${u.facilityDetails?.sportsScience?.slice(0,120)||'—'}${(u.facilityDetails?.sportsScience?.length||0)>120?'…':''}</div>`],
    ['Academic Labs',u=>`<div style="font-size:11px;color:var(--muted);line-height:1.5">${u.facilityDetails?.academicLabs?.slice(0,130)||'—'}${(u.facilityDetails?.academicLabs?.length||0)>130?'…':''}</div>`],
    ['Head Coach',u=>`<div class="cval">${u.coach.name}</div>`],
    ['Climate',u=>`<div class="cval">${u.warm?'☀ Warm':'⛅ Mixed'}</div>`],
    ['City Campus',u=>`<div class="cval ${u.city?'good':''}">${u.city?'✅ Yes':'⚠ Smaller'}</div>`],
    ['Overall Fit',u=>{const c=sc(u.fitOlivier);return`<div class="score-bar"><div class="sb-track"><div class="sb-fill" style="width:${u.fitOlivier}%;background:${c}"></div></div><span style="font-size:13px;font-weight:700;color:${c}">${u.fitOlivier}%</span></div>`;}],
    ['Minutes Outlook',u=>{
      const mo=u.minutesOutlook||{};
      if(!mo.available) return '<div style="color:var(--muted);font-size:11px">Not available</div>';
      const score=(u.lensScores||{}).minutes||0;
      const sc2=score>=70?'var(--emerald)':score>=50?'var(--amber)':'var(--rose)';
      const traj=mo.trajectory||[];
      const yr1=traj.find(t=>t.year===1)||traj[0];
      const yr2=traj.find(t=>t.year===2)||traj[1];
      return `<div style="font-size:18px;font-weight:800;color:${sc2}">${score}</div>`+
        `<div style="font-size:11px;color:var(--muted);margin-top:2px">`+
        (yr1?`Yr1: ${yr1.pct}%`:'')+
        (yr2?` · Yr2: ${yr2.pct}%`:'')+
        `</div>`;
    }],
    ['Tactical Dev',u=>u.devScores?`<div style="color:${sc(u.devScores.tactical)};font-weight:600">${u.devScores.tactical}/100</div>`:'<div style="color:var(--muted)">—</div>'],
    ['Technical Dev',u=>u.devScores?`<div style="color:${sc(u.devScores.technical)};font-weight:600">${u.devScores.technical}/100</div>`:'<div style="color:var(--muted)">—</div>'],
    ['Website',u=>`<a href="${u.url}" target="_blank" style="color:var(--indigo);font-size:12px;font-weight:600">Visit →</a>`],
  ];
  let html='<div class="compare-table-wrap"><table class="ctable"><thead><tr><th>Category</th>';
  sel.forEach(u=>{html+=`<th class="compare-header-cell"><div class="chc-name">${u.full}</div><div class="chc-loc">${u.loc}</div><button class="remove-btn" onclick="removeCompare('${u.id}')">✕ Remove</button></th>`;});
  html+='</tr></thead><tbody>';
  rows.forEach(([label,render])=>{html+=`<tr><td>${label}</td>`;sel.forEach(u=>html+=`<td>${render(u)}</td>`);html+='</tr>';});
  html+='</tbody></table></div>';
  container.innerHTML=html;
}

function removeCompare(id){
  selectedIds.delete(id);document.getElementById('ccount').textContent=selectedIds.size;
  const btn=document.getElementById('cbtn-'+id);
  if(btn){btn.textContent='+ Compare';btn.classList.remove('selected');}
  renderComparePage();
}

// ═══ Roster URL helper ═══════════════════════════════════════════════════════
function rosterUrl(u){
  // A few schools need custom roster paths
  const overrides = {
    lynn:       'https://lynnfightingknights.com/sports/mens-soccer/roster',
    csula:      'https://calstatela.edu/athletics/mens-soccer/roster',
    keiser:     'https://keiseruniversity.edu/athletics/mens-soccer/roster',
    ocu:        'https://okcu.edu/athletics/soccer/roster',
  };
  if(overrides[u.id]) return overrides[u.id];
  const base = (u.url || '').replace(/\/$/, '');
  if(!base) return '#';
  // v42.5: 17 JUCOs store their program page as .../sports/msoc/index (Sidearm).
  // Appending '/roster' there 404s, and so does .../sports/msoc/roster — Sidearm
  // requires a season slug (.../sports/msoc/2025-26/roster), which rots every
  // August and would silently 404 again. Fall back to the program page instead:
  // it always resolves and carries its own current-season roster link.
  if(/\/index$/.test(base)) return base;
  return base + '/roster';
}



// ═══ School domains (for favicon + university site link) ═══════════════════
const DOMAINS = {
  ucla:         'uclabruins.com',
  ucsb:         'ucsbgauchos.com',
  usf:          'gousfbulls.com',
  fiu:          'fiusports.com',
  virginia:     'virginiasports.com',
  wakeforest:   'godeacs.com',
  smu:          'smumustangs.com',
  stjohns:      'redstormsports.com',
  indiana:      'iuhoosiers.com',
  charleston:   'cofcsports.com',
  princeton:    'goprincetontigers.com',
  yale:         'yalebulldogs.com',
  pba:          'pbasailfish.com',
  lynn:         'lynnfightingknights.com',
  barry:        'gobarrybucs.com',
  nova:         'nsusharks.com',
  csula:        'calstatela.edu',
  stedwards:    'gohilltoppers.com',
  ocu:          'ocusports.com',
  keiser:       'kuseahawks.com',
  chapman:      'chapmanathletics.com',
  smc:          'smccorsairs.com',
  miami_dade:   'mdcathletics.com',
  uc_charleston:'ucgoldeneagles.com',
  iowa_western:  'goreivers.com',
  indian_hills:  'indianhills.edu',
  uca:          'ucasports.com',
  clemson:      'clemsontigers.com',
  georgetown:   'guhoyas.com',
  notredame:    'fightingirish.com',
  maryland:     'umterps.com',
  unc:          'goheels.com',
  fau:          'fausports.com',
  gcu:          'lopes.com',
  akron:        'gozips.com',
  denver:       'denverpioneers.com',
  vermont:      'uvmathletics.com',
  mercyhurst:   'hurstathletics.com',
  georgian_court: 'gculions.com',
  columbia_college: 'columbiacougars.com',
  northeast_cc: 'northeasthawks.com',
  monroe_college: 'monroeumustangs.com',
  tyler_jc:     'tjc.edu',
  daytona_state: 'daytonastate.edu',
  barton_cc:    'bartonsports.com',
  cowley_cc:    'cowleytigers.com',
  arizona_western: 'awcmatadors.com',
  phoenix_college: 'pcbearsathletics.com',
  pima_cc:      'pimaaztecs.com',
  mohave_cc:    'athletics.mohave.edu',
  glendale_cc_az: 'gauchoathletics.com',
  dodge_city_cc: 'goconqs.com',
  neosho_county_cc: 'goneosho.com',
  southeastern_cc_ia: 'sccblackhawks.com',
  iowa_lakes_cc: 'iowalakesathletics.com',
  blinn_college: 'buccaneersports.com',
  coastal_bend_cc: 'cbcathletics.com',
  angelina_college: 'angelinaathletics.com',
  lsu_eunice: 'athletics.lsue.edu',
  nassau_cc: 'nassaulions.com',
  ulster_cc: 'athletics.sunyulster.edu',
  suffolk_cc: 'sunysuffolkathletics.com',
  westchester_cc: 'gowccvikings.com',
  johnson_county_cc: 'jcccathletics.com',
  efsc:         'efsctitans.com',
  duke:           'goduke.com',
  ncstate:        'gopack.com',
  louisville:     'gocards.com',
  pittsburgh:     'pittpanthers.com',
  stanford:       'gostanford.com',
  syracuse:       'cuse.com',
  cal:            'calbears.com',
  pennstate:      'gopsusports.com',
  michigan:       'mgoblue.com',
  michiganstate:  'msuspartans.com',
  ohiostate:      'ohiostatebuckeyes.com',
  northwestern:   'nusports.com',
  wisconsin:      'uwbadgers.com',
  rutgers:        'scarletknights.com',
  washington:     'gohuskies.com',
  creighton:      'gocreighton.com',
  marquette:      'marquette.edu',
  providence:     'friars.com',
  setonhall:      'shupiratesl.com',
  butler:         'butlersports.com',
  xavier:         'goxavier.com',
  uconn:          'uconnhuskies.com',
  depaul:         'depaulbluedemons.com',
  villanova:      'villanova.com',
  calpoly:        'gopoly.com',
  ucdavis:        'ucdavisaggies.com',
  ucirvine:       'ucirvinesports.com',
  ucriverside:    'gohighlanders.com',
  ucsd:           'ucsdtritons.com',
  csuf:           'fullertontitans.com',
  tulsa:          'tulsahurricane.com',
  memphis:        'gotigersgo.com',
  temple:         'owlsports.com',
  uab:            'blazerssports.com',
  navy:           'navysports.com',
  army:           'goarmywestpoint.com',
  charlotte:      'charlotte49ers.com',
  william_mary:   'tribeathletics.com',
  hofstra:        'hofstraathletics.com',
  northeastern:   'gonu.com',
  drexel:         'drexeldragons.com',
  delaware:       'bluehens.com',
  elon:           'elonphoenix.com',
  monmouth:       'monmouthhawks.com',
  stonybrook:     'stonybrookseawolves.com',
};

const SITE_URLS = {
  ucla:         'https://www.ucla.edu',
  ucsb:         'https://www.ucsb.edu',
  usf:          'https://www.usf.edu',
  fiu:          'https://www.fiu.edu',
  virginia:     'https://www.virginia.edu',
  wakeforest:   'https://www.wfu.edu',
  smu:          'https://www.smu.edu',
  stjohns:      'https://www.stjohns.edu',
  indiana:      'https://www.indiana.edu',
  charleston:   'https://www.cofc.edu',
  princeton:    'https://www.princeton.edu',
  yale:         'https://www.yale.edu',
  pba:          'https://www.pba.edu',
  lynn:         'https://www.lynn.edu',
  barry:        'https://www.barry.edu',
  nova:         'https://www.nova.edu',
  csula:        'https://www.calstatela.edu',
  stedwards:    'https://www.stedwards.edu',
  ocu:          'https://www.okcu.edu',
  keiser:       'https://www.keiseruniversity.edu',
  chapman:      'https://www.chapman.edu',
  smc:          'https://www.smc.edu',
  miami_dade:   'https://www.mdc.edu',
  uc_charleston:'https://www.ucwv.edu',
  iowa_western:  'https://www.iwcc.edu',
  indian_hills:  'https://www.indianhills.edu',
  uca:          'https://www.uca.edu',
  clemson:      'https://www.clemson.edu',
  georgetown:   'https://www.georgetown.edu',
  notredame:    'https://www.nd.edu',
  maryland:     'https://www.umd.edu',
  unc:          'https://www.unc.edu',
  fau:          'https://www.fau.edu',
  gcu:          'https://www.gcu.edu',
  akron:        'https://www.uakron.edu',
  denver:       'https://www.du.edu',
  vermont:      'https://www.uvm.edu',
  mercyhurst:   'https://www.mercyhurst.edu',
  georgian_court: 'https://www.georgian.edu',
  columbia_college: 'https://www.ccis.edu',
  northeast_cc: 'https://www.northeast.edu',
  monroe_college: 'https://www.monroeu.edu',
  tyler_jc:     'https://www.tjc.edu',
  daytona_state: 'https://www.daytonastate.edu',
  barton_cc:    'https://www.bartonccc.edu',
  cowley_cc:    'https://www.cowley.edu',
  arizona_western: 'https://www.azwestern.edu',
  phoenix_college: 'https://www.phoenixcollege.edu',
  pima_cc:      'https://www.pima.edu',
  mohave_cc:    'https://www.mohave.edu',
  glendale_cc_az: 'https://www.gccaz.edu',
  dodge_city_cc: 'https://dc3.edu',
  neosho_county_cc: 'https://neosho.edu',
  southeastern_cc_ia: 'https://www.scciowa.edu',
  iowa_lakes_cc: 'https://iowalakes.edu',
  blinn_college: 'https://www.blinn.edu',
  coastal_bend_cc: 'https://www.coastalbend.edu',
  angelina_college: 'https://www.angelina.edu',
  lsu_eunice: 'https://www.lsue.edu',
  nassau_cc: 'https://www.ncc.edu',
  ulster_cc: 'https://www.sunyulster.edu',
  suffolk_cc: 'https://www.sunysuffolk.edu',
  westchester_cc: 'https://www.sunywcc.edu',
  johnson_county_cc: 'https://www.jccc.edu',
  efsc:         'https://www.easternflorida.edu',
  duke:           'https://www.duke.edu',
  ncstate:        'https://www.ncsu.edu',
  louisville:     'https://www.louisville.edu',
  pittsburgh:     'https://www.pitt.edu',
  stanford:       'https://www.stanford.edu',
  syracuse:       'https://www.syracuse.edu',
  cal:            'https://www.berkeley.edu',
  pennstate:      'https://www.psu.edu',
  michigan:       'https://www.umich.edu',
  michiganstate:  'https://www.msu.edu',
  ohiostate:      'https://www.osu.edu',
  northwestern:   'https://www.northwestern.edu',
  wisconsin:      'https://www.wisc.edu',
  rutgers:        'https://www.rutgers.edu',
  washington:     'https://www.washington.edu',
  creighton:      'https://www.creighton.edu',
  marquette:      'https://www.marquette.edu',
  providence:     'https://www.providence.edu',
  setonhall:      'https://www.shu.edu',
  butler:         'https://www.butler.edu',
  xavier:         'https://www.xavier.edu',
  uconn:          'https://www.uconn.edu',
  depaul:         'https://www.depaul.edu',
  villanova:      'https://www.villanova.edu',
  calpoly:        'https://www.calpoly.edu',
  ucdavis:        'https://www.ucdavis.edu',
  ucirvine:       'https://www.uci.edu',
  ucriverside:    'https://www.ucr.edu',
  ucsd:           'https://www.ucsd.edu',
  csuf:           'https://www.fullerton.edu',
  tulsa:          'https://www.utulsa.edu',
  memphis:        'https://www.memphis.edu',
  temple:         'https://www.temple.edu',
  uab:            'https://www.uab.edu',
  navy:           'https://www.usna.edu',
  army:           'https://www.westpoint.edu',
  charlotte:      'https://www.uncc.edu',
  william_mary:   'https://www.wm.edu',
  hofstra:        'https://www.hofstra.edu',
  northeastern:   'https://www.northeastern.edu',
  drexel:         'https://www.drexel.edu',
  delaware:       'https://www.udel.edu',
  elon:           'https://www.elon.edu',
  monmouth:       'https://www.monmouth.edu',
  stonybrook:     'https://www.stonybrook.edu',
};

// ═══ Social Media Data ═══════════════════════════════════════════════════════
const SOCIAL = {
  // Instagram SVG — brand gradient pink/purple
  _ig: '<svg viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="#e1306c" stroke="none"/></svg>',
  // X/Twitter SVG — black
  _x:  '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16M4 20L20 4"/><path d="M20 4h-5m5 0v5M4 20h5m-5 0v-5"/></svg>',
  // Facebook SVG — brand blue
  _fb: '<svg viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  // YouTube SVG — brand red
  _yt: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ff0000" stroke="none"/></svg>',

  // Per-school data: [instagram, twitter, facebook, youtube]
  // null = not found / not applicable
  ucla:         ['https://instagram.com/uclamsoccer',       'https://x.com/uclamsoccer',        'https://facebook.com/UCLAMSoccer',     'https://youtube.com/uclaathletics'],
  ucsb:         ['https://instagram.com/ucsbmsoccer',       'https://x.com/UCSBMensSoccer',     null,                                   'https://youtube.com/user/UCSBGauchosAthletics'],
  usf:          ['https://instagram.com/usfmsoc',           'https://x.com/usfmsoc',            'https://facebook.com/usfmenssoccer',   'https://youtube.com/channel/UC2hUZIkGfPjlJy8-P0MJjYA'],
  fiu:          ['https://instagram.com/fiumsoccer',        null,                               null,                                   'https://youtube.com/channel/UChMJ4FwFGluPCiF4QwZmp1Q'],
  virginia:     ['https://instagram.com/uvamensoccer',      'https://x.com/UVAMenSoccer',       null,                                   'https://youtube.com/channel/UCRz7SRXbiTbNvN2Us0JvbdA'],
  wakeforest:   ['https://instagram.com/wakemsoccer',       'https://x.com/WakeMSoccer',        'https://facebook.com/wakemsoccer',     'https://youtube.com/user/wakeforestathletics'],
  smu:          ['https://instagram.com/smu_msoc',          null,                               'https://facebook.com/SMUMustangs',     'https://youtube.com/user/SMUMustangsAthletics'],
  stjohns:      ['https://instagram.com/stjohnsmsoccer',    'https://x.com/StJohnsMSoccer',     'https://facebook.com/StJohnsRedStorm', 'https://youtube.com/user/stjohnsredstormtv'],
  indiana:      ['https://instagram.com/indianamsoc',       'https://x.com/IndianaMSOC',        'https://facebook.com/IndianaMSOC',     'https://youtube.com/user/IUAthletics'],
  charleston:   ['https://instagram.com/cofcsoccer',        null,                               'https://facebook.com/cofcsports',      'https://youtube.com/user/cofcsports'],
  princeton:    ['https://instagram.com/princetonmsoc',     'https://x.com/PrincetonMSoc',      null,                                   'https://youtube.com/@GoPrincetonTigers'],
  yale:         ['https://instagram.com/yalemsoccer',       null,                               null,                                   'https://youtube.com/user/YaleAthletics'],
  pba:          ['https://instagram.com/sailfishmsoc',      null,                               null,                                   'https://youtube.com/@PBASailfish'],
  lynn:         ['https://instagram.com/lynnmsoc',          null,                               null,                                   null],
  barry:        ['https://instagram.com/barryumsoccer',     null,                               null,                                   'https://youtube.com/@barryuniversityathletics5651'],
  nova:         ['https://instagram.com/nsu_msoccer',       'https://x.com/nsu_msoccer',        null,                                   'https://youtube.com/c/NSUSharksAthletics'],
  csula:        ['https://instagram.com/calstatelamsoc',    null,                               null,                                   'https://youtube.com/user/CSULAathletics'],
  stedwards:    ['https://instagram.com/seumsoccer',        null,                               'https://facebook.com/SEUMSoccer',      'https://youtube.com/@seusports'],
  ocu:          ['https://instagram.com/ocumsoccer',        null,                               null,                                   'https://youtube.com/ocustars'],
  keiser:       ['https://instagram.com/keiser_msoc',       'https://x.com/KUSeahawkMSOC',      'https://facebook.com/KUseahawksoccer', 'https://youtube.com/@keiserseahawksathletics3079'],
  chapman:      ['https://instagram.com/chapmanmsoc',       null,                               null,                                   'https://youtube.com/user/chapmansports'],
  smc:          ['https://instagram.com/smcmenssoccer',     null,                               null,                                   null],
  miami_dade:   ['https://instagram.com/mdcsharksmsoc',     null,                               null,                                   'https://youtube.com/channel/UCQzMKai0FDVTRzmg9UbJIxA'],
  uc_charleston:['https://instagram.com/ucwv_msoccer',      'https://x.com/ucwv_msoccer',       'https://facebook.com/ucwvmsoccer',     'https://youtube.com/@UCWV1'],
  iowa_western:  ['https://instagram.com/reivermsoccer',     null,                               'https://facebook.com/ReiverSoccer',    null],
  indian_hills:  [null,                                       null,                               null,                                   null],
  uca:          ['https://instagram.com/ucamenssoccer',     'https://x.com/ucamenssoccer',      'https://facebook.com/ucamenssoccer',   'https://youtube.com/c/CentralArkansasAthletics'],
  clemson:      ['https://instagram.com/clemsonsoccer',      'https://x.com/ClemsonMSoccer',     'https://www.facebook.com/ClemsonMensSoccer',  'https://youtube.com/clemsontigers'],
  georgetown:   ['https://instagram.com/georgetownmsoc',     'https://x.com/GUHoyasMSoc',        null,                                   'https://youtube.com/guhoyas'],
  notredame:    ['https://instagram.com/ndmsoccer',          'https://x.com/NDMenSoccer',         null,                                   'https://youtube.com/fightingirish'],
  maryland:     ['https://instagram.com/umterpsmsoc',        'https://x.com/UMTerpsMSOC',         'https://facebook.com/TerrapinsMSoccer','https://youtube.com/umterps'],
  unc:          ['https://instagram.com/uncmsoccer',         'https://x.com/UNCMensSoccer',       null,                                   'https://youtube.com/tarheels'],
  fau:          ['https://instagram.com/faumsoccer',         'https://x.com/FAUMSoccer',          null,                                   'https://youtube.com/fauowls'],
  gcu:          ['https://instagram.com/gcu_msoccer',        'https://x.com/GCU_MSoccer',         'https://facebook.com/GCULopes',        'https://youtube.com/gcuathletics'],
  akron:        ['https://instagram.com/akronzipsmsoc',      'https://x.com/AkronMSOC',           'https://facebook.com/AkronZipsMSOC',   'https://youtube.com/gozipsathletics'],
  denver:       ['https://instagram.com/dumenssoccer',       'https://x.com/DUMensSoccer',        'https://facebook.com/DUPioneerSoccer', 'https://youtube.com/denverpioneers'],
  vermont:      ['https://instagram.com/uvmmenssoccer',      'https://x.com/UVMMensSoccer',       null,                                   'https://youtube.com/uvmathletics'],
  mercyhurst:     ['https://instagram.com/hurstmsoccer',        'https://x.com/hurstmsoccer',        'https://facebook.com/LakersMensSoccer', null],
  georgian_court: ['https://instagram.com/gcu_mens_soccer',   'https://x.com/GCULions',           null,                                    null],
  columbia_college: ['https://instagram.com/columbiacougarsoccer', null,                          null,                                    null],
  northeast_cc:   ['https://instagram.com/NortheastHawks',    'https://x.com/NortheastHawks',      'https://facebook.com/northeastcchawks', null],
  monroe_college: ['https://instagram.com/monroemsoc',        'https://x.com/MonroeMustangs',      'https://facebook.com/monroeathletics',  null],
  tyler_jc:       [null,                                       null,                                null,                                    null],
  daytona_state:  [null,                                       null,                                null,                                    null],
  barton_cc:      ['https://instagram.com/bccmenssoccer',      'https://x.com/barton_msoccer',       null,                                    null],
  cowley_cc:      ['https://instagram.com/cowleymsoccer',      null,                                 null,                                    null],
  arizona_western:['https://instagram.com/awcmenssoccer',      'https://x.com/AWCMatadors',          null,                                    null],
  phoenix_college:['https://instagram.com/phoenix_college_athletics', 'https://x.com/PC_Bears', 'https://facebook.com/PCAthletics', 'https://youtube.com/channel/UCBychnw9rmFLZLZQwOz9avg'],
  pima_cc:        ['https://instagram.com/pima_athletics', 'https://x.com/PimaAthletics', 'https://facebook.com/pccaztecs', 'https://youtube.com/@PimaAztecTough'],
  mohave_cc:      ['https://instagram.com/mohavecc', 'https://x.com/mohavecc', 'https://facebook.com/mohavecc', 'https://youtube.com/mohaveccvideos'],
  glendale_cc_az: [null, 'https://x.com/GCCazAthletics', null, null],
  dodge_city_cc:  ['https://instagram.com/GoConqs', null, 'https://facebook.com/GoConqs', null],
  neosho_county_cc:[null, 'https://x.com/GoNeoshoMSOC', 'https://facebook.com/neoshomsoccer', null],
  southeastern_cc_ia:[null, 'https://x.com/SCCIowa_Soccer', 'https://facebook.com/southeastern.blackhawks', null],
  iowa_lakes_cc:  ['https://instagram.com/iowalakessoccer', 'https://x.com/IA_LakesSports', 'https://facebook.com/Iowa-Lakes-Mens-Soccer-332957890292', 'https://youtube.com/channel/UCokMNQ0CrxG7wbwv9cB5LMA'],
  blinn_college:  [null, null, 'https://facebook.com/BuccaneerSports', null],
  coastal_bend_cc:[null, null, 'https://facebook.com/coastalbendcollege', null],
  angelina_college:['https://instagram.com/angelinamsoc', 'https://x.com/AngelinaMSOC', null, null],
  lsu_eunice:     ['https://instagram.com/lsuebengals', 'https://x.com/LSUEBengalsMSOC', 'https://facebook.com/LSUEMensSoccer', null],
  nassau_cc:      ['https://instagram.com/lionsncc', 'https://x.com/lionsncc', 'https://facebook.com/Nassau-Lions-Athletics-1797768240505209', null],
  ulster_cc:      [null, 'https://x.com/UlsterSenators', 'https://facebook.com/UlsterAthletics', 'https://youtube.com/channel/UCy6n3FT7uww7kdmvqklrDYA'],
  suffolk_cc:     ['https://instagram.com/sunysflkathletics', 'https://x.com/scccathletics', null, null],
  westchester_cc: [null, null, 'https://facebook.com/westchesterccathletics', null],
  johnson_county_cc:[null, 'https://x.com/JCCCAthletics', 'https://facebook.com/JCCC-Athletics-138327252498', 'https://youtube.com/user/JCCCAthletics'],
  efsc:           ['https://instagram.com/efscmenssoccer',     'https://x.com/efscmenssoccer',       null,                                    null],
  duke:           ['https://instagram.com/dukemenssoccer',    'https://x.com/DukeMSOC',            'https://facebook.com/DukeMensSoccer',  'https://youtube.com/dukebluedevils'],
  ncstate:        ['https://instagram.com/ncstatemsoc',       'https://x.com/NCStateMSOC',         'https://facebook.com/NCStateSoccer',   'https://youtube.com/ncstateathletics'],
  louisville:     ['https://instagram.com/uoflmsoc',          'https://x.com/UofLMSOC',            'https://facebook.com/UofLMensSoccer',  'https://youtube.com/uoflathletics'],
  pittsburgh:     ['https://instagram.com/pitt_msoc',         'https://x.com/PittMSOC',            'https://facebook.com/PittMensSoccer',  'https://youtube.com/pittathletics'],
  stanford:       ['https://instagram.com/stanfordmsoccer',   'https://x.com/StanfordMSoccer',     null,                                   'https://youtube.com/stanfordathletics'],
  syracuse:       ['https://instagram.com/cusemsoc',          'https://x.com/CuseMSOC',            'https://facebook.com/SyracuseMSOC',    'https://youtube.com/syracuseathletics'],
  cal:            ['https://instagram.com/cal_msoccer',       'https://x.com/CalMSOC',             null,                                   'https://youtube.com/ucberkeleysports'],
  pennstate:      ['https://instagram.com/pennstatemsoc',     'https://x.com/PennStateMSOC',       'https://facebook.com/PennStateMSOC',   'https://youtube.com/pennstateathletics'],
  michigan:       ['https://instagram.com/michiganmsoccer',   'https://x.com/UMichMSOC',           null,                                   'https://youtube.com/michiganathletics'],
  michiganstate:  ['https://instagram.com/msusoccermen',      'https://x.com/MSUSoccerMen',        'https://facebook.com/MSUMensSoccer',   'https://youtube.com/msuspartans'],
  ohiostate:      ['https://instagram.com/ohiostatebuckeyes', 'https://x.com/OhioStateMSOC',       'https://facebook.com/OhioStateMSOC',   'https://youtube.com/ohiostateathletics'],
  northwestern:   ['https://instagram.com/nuwcatmsoc',        'https://x.com/NUWcatMSOC',          null,                                   'https://youtube.com/northwesternathletics'],
  wisconsin:      ['https://instagram.com/uwbadgersmsoc',     'https://x.com/UWBadgersMSOC',       null,                                   'https://youtube.com/badgerathletics'],
  rutgers:        ['https://instagram.com/rutgersmsoc',       'https://x.com/RutgersMSOC',         'https://facebook.com/RutgersMSOC',     'https://youtube.com/rutgerssports'],
  washington:     ['https://instagram.com/uwmsoccer',         'https://x.com/UWMensSoccer',        null,                                   'https://youtube.com/gohuskies'],
  creighton:      ['https://instagram.com/creightonmsoc',     'https://x.com/CreightonMSOC',       'https://facebook.com/CreightonMSOC',   'https://youtube.com/gocreighton'],
  marquette:      ['https://instagram.com/marquettemsoc',     'https://x.com/MarquetteMSOC',       null,                                   'https://youtube.com/marquetteathletics'],
  providence:     ['https://instagram.com/providencemsoc',    'https://x.com/PCFriarsMSOC',        null,                                   'https://youtube.com/providenceathletics'],
  setonhall:      ['https://instagram.com/shupiratesmsoc',    'https://x.com/SHUPiratesMSOC',      null,                                   'https://youtube.com/setonhallathletics'],
  butler:         ['https://instagram.com/butlermsoc',        'https://x.com/ButlerMSOC',          null,                                   'https://youtube.com/butlerathletics'],
  xavier:         ['https://instagram.com/xaviermsoc',        'https://x.com/XavierMSOC',          null,                                   'https://youtube.com/xavierathletics'],
  uconn:          ['https://instagram.com/uconnmsoc',         'https://x.com/UConnMSOC',           'https://facebook.com/UConnMSOC',       'https://youtube.com/uconnathletics'],
  depaul:         ['https://instagram.com/depaulmsoc',        'https://x.com/DePaulMSOC',          null,                                   'https://youtube.com/depaulathletics'],
  villanova:      ['https://instagram.com/novamsoc',          'https://x.com/NovaMSOC',            null,                                   'https://youtube.com/villanovaathletics'],
  calpoly:        ['https://instagram.com/calpolymsoc',       'https://x.com/CalPolyMSOC',         null,                                   'https://youtube.com/calpolyathletics'],
  ucdavis:        ['https://instagram.com/ucdavismsoc',       'https://x.com/UCDavisMSOC',         null,                                   'https://youtube.com/ucdavisaggies'],
  ucirvine:       ['https://instagram.com/ucimsoc',           'https://x.com/UCIrvineSOC',         null,                                   'https://youtube.com/ucirvineantares'],
  ucriverside:    ['https://instagram.com/ucrhighlanders',    'https://x.com/UCRMensSoccer',       null,                                   'https://youtube.com/ucrhighlanders'],
  ucsd:           ['https://instagram.com/ucsdmsoc',          'https://x.com/UCSDMensSoccer',      null,                                   'https://youtube.com/ucsdtritons'],
  csuf:           ['https://instagram.com/csufmsoc',          'https://x.com/CSUFMensSoccer',      null,                                   'https://youtube.com/fullertontitans'],
  tulsa:          ['https://instagram.com/tulsamsoc',         'https://x.com/TulsaMSOC',           null,                                   'https://youtube.com/tulsahurricane'],
  memphis:        ['https://instagram.com/memphismsoc',       'https://x.com/MemphisMSOC',         null,                                   'https://youtube.com/memphistigers'],
  temple:         ['https://instagram.com/templemsoc',        'https://x.com/TempleMSOC',          null,                                   'https://youtube.com/templeowls'],
  uab:            ['https://instagram.com/uabmsoc',           'https://x.com/UABMensSoccer',       null,                                   'https://youtube.com/uabathletics'],
  navy:           ['https://instagram.com/navymsoc',          'https://x.com/NavyMSOC',            null,                                   'https://youtube.com/navysports'],
  army:           ['https://instagram.com/armymsoc',          'https://x.com/ArmyMSOC',            null,                                   'https://youtube.com/armysports'],
  charlotte:      ['https://instagram.com/charlotte49ers',    'https://x.com/Charlotte49ers',      'https://facebook.com/Charlotte49ers',  'https://youtube.com/charlotte49ers'],
  william_mary:   ['https://instagram.com/wmtribemsoc',       'https://x.com/WMTribeMSOC',         null,                                   'https://youtube.com/tribeathletics'],
  hofstra:        ['https://instagram.com/hofstramsoc',       'https://x.com/HofstraMSOC',         'https://facebook.com/HofstraSoccer',   'https://youtube.com/hofstraathletics'],
  northeastern:   ['https://instagram.com/numsoc',            'https://x.com/NUMensSoccer',        null,                                   'https://youtube.com/northeasternhuskies'],
  drexel:         ['https://instagram.com/drexelmsoc',        'https://x.com/DrexelMSOC',          null,                                   'https://youtube.com/drexeldragons'],
  delaware:       ['https://instagram.com/delawaremsoc',      'https://x.com/DelawareMSOC',        null,                                   'https://youtube.com/delawareathletics'],
  elon:           ['https://instagram.com/elonmsoc',          'https://x.com/ElonMSOC',            null,                                   'https://youtube.com/elonphoenix'],
  monmouth:       ['https://instagram.com/monmouthmsoc',      'https://x.com/MonmouthMSOC',        null,                                   'https://youtube.com/monmouthhawks'],
  stonybrook:     ['https://instagram.com/sbseawolvesmsoc',   'https://x.com/SBSeawolvesMSOC',     null,                                   'https://youtube.com/stonybrookathletics'],
};


function buildModalHeader(u){
  // Logo / favicon
  const logoEl = document.getElementById('modal-logo');
  const abbrEl = document.getElementById('modal-abbr');
  const domain = DOMAINS[u.id];
  if(domain){
    logoEl.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${u.id}"
      onerror="this.style.display='none';document.getElementById('modal-abbr').style.display='block'">
      <span id="modal-abbr" style="display:none;font-size:11px;font-weight:700;color:var(--muted)">${(u.full||u.name).split(' ').map(w=>w[0]).join('').slice(0,3)}</span>`;
  } else {
    abbrEl.textContent = (u.full||u.name).split(' ').map(w=>w[0]).join('').slice(0,3);
  }

  // Badges
  const badgesEl = document.getElementById('modal-badges');
  badgesEl.innerHTML = [
    `<span class="mh-badge">${u.div}</span>`,
    `<span class="mh-badge">${u.conf}</span>`,
    `<span class="mh-badge">${u.loc}</span>`,
    (u.div==='JUCO'&&u.jucoTier==='Elite') ? `<span class="mh-badge" style="background:var(--gold,#d97706);color:#fff" title="${(u.jucoTierNote||'').replace(/"/g,'&quot;')}">🏆 Elite JUCO</span>` : '',
  ].join('');

  // Links row
  const linksEl = document.getElementById('modal-links');
  const siteUrl = SITE_URLS[u.id] || '#';
  const progUrl = u.url || '#';
  const globeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  const soccerSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4m-4-4h7"/></svg>`;
  linksEl.innerHTML = `<span class="mh-lbl">Links</span>`
    + `<a class="mh-link" href="${siteUrl}" target="_blank">${globeSvg}<span>${(SITE_URLS[u.id]||'').replace('https://www.','')}</span></a>`
    + (progUrl !== '#' ? `<a class="mh-link program" href="${progUrl}" target="_blank">${soccerSvg}<span>Men's Soccer →</span></a>` : '');
}

function buildSocialStrip(u){
  const el = document.getElementById('modal-social');
  if(!el) return;
  const data = SOCIAL[u.id];
  if(!data){ el.innerHTML=''; return; }
  const [ig, tw, fb, yt] = data;
  const lbl = '<span class="soc-lbl">Follow</span>';
  const pill = (url, svg, handle) => url
    ? `<a class="soc-pill" href="${url}" target="_blank">${svg}<span>${handle}</span></a>`
    : '';
  let html = lbl;
  if(ig) html += pill(ig, SOCIAL._ig, '@'+ig.split('/').pop());
  if(tw) html += pill(tw, SOCIAL._x,  '@'+tw.split('/').pop());
  if(fb) html += pill(fb, SOCIAL._fb, fb.split('/').pop());
  if(yt) html += pill(yt, SOCIAL._yt, 'YouTube');
  if(html === lbl) html = ''; // nothing to show
  el.innerHTML = html;
}

function openDetail(id){
  const u=unis.find(x=>x.id===id);if(!u)return;
  currentModalId = id;
  modalTriggerEl = document.activeElement;
  document.getElementById('modal-title').textContent=u.full;
  document.getElementById('modal-body').innerHTML=buildDetailBody(u);
  buildModalHeader(u);
  buildSocialStrip(u);
  document.getElementById('modal').classList.remove('hidden');
  const closeBtn = document.querySelector('#modal .close-btn');
  if (closeBtn) closeBtn.focus();
  // Modal is visible — non-overview tab content already in DOM but not painted yet.
  // rAF fires after first paint so the browser commits the overview before doing heavier work.
  requestAnimationFrame(() => {
    // Trigger modal fit-score refresh now that DOM is stable
    const fitEl = document.getElementById('modal-fit-score');
    if (fitEl) fitEl.textContent = (u.fitOlivier || 0) + '%';
  });
}

function buildMinutesModalTab(u){
  const mo = u.minutesOutlook || {};
  const roster = rosterUrl(u);
  if(!mo.available){
    return `<div class="detail-block">
      <p style="color:var(--rose);font-weight:600;font-size:13px">⚠ ${mo.reason||'Minutes Outlook not available for this school.'}</p>
      <p style="color:var(--muted);font-size:12.5px;margin-top:.5rem">This may be a JUCO, Ivy League, or school where roster data was not analysed.</p>
    </div>`;
  }
  const riskColor = mo.recruit_risk==='High'?'var(--amber)':mo.recruit_risk==='Medium'?'var(--sky)':'var(--emerald)';
  const riskLabel = mo.recruit_risk==='High'?'High Demand':mo.recruit_risk==='Medium'?'Moderate':'Open';
  const score = (u.lensScores||{}).minutes || 0;
  const scoreColor = score>=70?'var(--emerald)':score>=50?'var(--amber)':'var(--rose)';
  const traj = mo.trajectory || [];

  // Summary sentence
  const cleared = mo.cleared_before_2027 || 0;
  const juniors = mo.rising_junior_2027_count || 0;
  const seniors = mo.rising_senior_2027_count || 0;
  // rising_senior_2027_count is genuinely unresearched for some schools — say so rather than claiming 0
  const seniorsTxt = mo.rising_senior_2027_count === undefined ? 'An unconfirmed number of seniors' : `${seniors} senior${seniors!==1?'s':''}`;
  const yr1label = traj[0] ? traj[0].label : '—';
  const summary = `${cleared} midfielder${cleared!==1?'s':''} clear out before Olivier arrives. `+
    `${seniorsTxt} and ${juniors} junior${juniors!==1?'s':''} remain as direct competition in 2027. `+
    `Expected year-1 role: <strong>${yr1label}</strong>.`;

  let trajHtml = traj.map(t=>{
    const barColor = t.pct>=80?'#3B6D11':t.pct>=60?'#639922':t.pct>=40?'#BA7517':'#A32D2D';
    return `<div class="mo-traj-row">
      <div class="mo-traj-year">${t.year} · ${t.yr_label}</div>
      <div class="mo-traj-bar"><div class="mo-traj-fill" style="width:${t.pct}%;background:${barColor}"></div></div>
      <div class="mo-traj-label">${t.label}</div>
    </div>`;
  }).join('');

  const clearedNames = (mo.cleared_names||[]).join(', ');
  const blockerNames = (mo.rising_junior_2027_names||[]).join(', ');

  return `
    <div class="detail-block" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:.75rem">
        <h4 style="margin:0">2027 Entry · Playing Time Outlook</h4>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--hint);font-weight:600">Minutes Score</span>
          <span style="font-size:1.4rem;font-weight:800;color:${scoreColor};font-family:'Outfit',sans-serif">${score}</span>
          <a href="${roster}" target="_blank" style="font-size:11px;font-weight:700;color:var(--indigo);text-decoration:none;background:var(--indigo3);padding:3px 10px;border-radius:6px;border:1px solid #c7d2fe">📋 View Roster →</a>
        </div>
      </div>
      <p style="font-size:12.5px;color:var(--muted);line-height:1.65;margin-bottom:1rem">${summary}</p>
      <div class="mo-trajectory" style="margin-bottom:1rem">${trajHtml}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:.75rem">
        <div style="background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:1.3rem;font-weight:800;color:var(--text)">${mo.mf_total_2025 ?? '—'}</div>
          <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">MFs 2025</div>
        </div>
        <div style="background:var(--emerald3);border-radius:8px;padding:7px;text-align:center;border:1px solid #a7f3d0">
          <div style="font-size:1.3rem;font-weight:800;color:var(--emerald)">${cleared}</div>
          <div style="font-size:9px;color:var(--emerald);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">Cleared</div>
        </div>
        <div style="background:var(--surface3);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:1.3rem;font-weight:800;color:var(--rose)">${juniors}</div>
          <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">2027 Juniors</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:1.1rem;font-weight:800;color:${riskColor}">${riskLabel}</div>
          <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">Entry Competition</div>
        </div>
      </div>
      ${clearedNames?`<div style="background:var(--emerald3);border-radius:7px;padding:7px 10px;font-size:11.5px;margin-bottom:6px"><strong style="color:var(--emerald)">Gone before Olivier arrives:</strong> <span style="color:#065f46">${clearedNames}</span></div>`:''}
      ${blockerNames?`<div style="background:var(--rose3);border-radius:7px;padding:7px 10px;font-size:11.5px"><strong style="color:var(--rose)">Primary 2027-junior blockers:</strong> <span style="color:var(--rose)">${blockerNames}</span></div>`:''}
    </div>
    <div class="tip-box">
      <p><strong>Key question for the coach call:</strong> "How many central midfielders are in your 2026 and 2027 recruiting classes, and where do you see an Australian 8/10 CM fitting your projected 2027 depth chart?"</p>
    </div>`;
}

function buildDetailBody(u){
  return`
    <div class="modal-tabs">
      <button class="mtab active" onclick="switchTab(this,'overview')">Overview</button>
      <button class="mtab" onclick="switchTab(this,'degree')">Degree & ACU Align</button>
      <button class="mtab" onclick="switchTab(this,'standings')">Standings & Titles</button>
      <button class="mtab" onclick="switchTab(this,'pro')">Pro Pipeline</button>
      <button class="mtab" onclick="switchTab(this,'development')">Development</button>
      <button class="mtab" onclick="switchTab(this,'contact')">Coach & Contact</button>
      <button class="mtab" onclick="switchTab(this,'minutes')">⏱ Minutes</button>
      <button class="mtab" onclick="switchTab(this,'culture')">🎉 College Culture</button>
      <button class="mtab" onclick="switchTab(this,'facilities')">🏟 Facilities</button>
    </div>
    <div class="mtab-content active" id="tab-overview">
      ${u.div==='IVY'?`<div class="ivy-warning">⚠ Ivy League: No athletic scholarships — need-based financial aid only. Highly selective admission. GPA 2.8 is likely insufficient without significant improvement.</div>`:''}
      <div class="detail-grid">
        <div class="detail-block"><h4>Quick Facts</h4><table style="width:100%;font-size:12px">
          <tr><td style="color:var(--hint);padding:4px 0">Division</td><td><span class="dbadge d-${u.div}">${u.div}</span></td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Conference</td><td>${u.conf}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Location</td><td>${u.loc}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Campus Size</td><td>${u.size}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Annual Cost</td><td style="color:var(--amber);font-weight:600">${costDisplay(u)}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Aid</td><td style="color:var(--emerald);font-weight:600">${u.aid}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Climate</td><td>${u.warm?'☀ Warm':'⛅ Mixed seasons'}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">City Campus</td><td>${u.city?'✅ Urban':'⚠ Smaller town'}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Pre-PT</td><td style="color:var(--emerald);font-weight:600">${u.prePT}</td></tr>
        </table></div>
        <div class="detail-block"><h4>ACU Degree Alignment</h4>
          <div style="font-size:2.5rem;font-weight:800;color:${alignColor(u.acuAlign)};font-family:'Outfit',sans-serif;line-height:1">${u.acuAlign}<span style="font-size:1.2rem;color:var(--hint)">/16</span></div>
          <div style="font-size:13px;font-weight:600;color:${alignColor(u.acuAlign)};margin:4px 0 8px">${alignLabel(u.acuAlign)}</div>
          <p style="font-size:12px;color:var(--muted);line-height:1.65">${u.acuAlignNote}</p>
        </div>
      </div>
      <div class="detail-block" style="margin-bottom:1rem"><h4>Fit Assessment for Olivier</h4><p>${u.rec}</p></div>
    </div>
    <div class="mtab-content" id="tab-degree">
      <div class="detail-block" style="margin-bottom:1rem">
        <h4>Bachelor's Degree — Official Title</h4>
        <div style="font-size:17px;font-weight:700;color:var(--navy);margin-bottom:6px">${u.degreeTitle}</div>
        <div style="font-size:12px;color:var(--indigo);font-weight:600;margin-bottom:12px">${u.kinRank}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:var(--surface3);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);font-weight:700">ACU Units Covered</div>
            <div style="font-size:22px;font-weight:800;color:${alignColor(u.acuAlign)};margin-top:2px">${u.acuAlign}/16</div>
          </div>
          <div style="background:var(--surface3);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);font-weight:700">Alignment Level</div>
            <div style="font-size:14px;font-weight:700;color:${alignColor(u.acuAlign)};margin-top:4px">${alignLabel(u.acuAlign)}</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--muted);line-height:1.7">${u.acuAlignNote}</p>
      </div>
      <div class="detail-block" style="margin-bottom:1rem"><h4>Core Subjects</h4>
        <ul class="subject-list">${u.courses.map(c=>`<li>${c}</li>`).join('')}</ul>
      </div>
      <div class="detail-block" style="margin-bottom:1rem"><h4>WES Credit Recognition</h4>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.7">When Olivier transfers mid-degree, World Education Services (WES) will assess completed ACU units. BIOL125 (Human Biology), ANAT100 (Anatomy), EXSC225 (Exercise Physiology), and EXSC322 (Advanced Physiology) are the units most likely to receive direct credit — potentially shortening the US degree by one semester. Your agent should coordinate a formal WES evaluation before finalising the shortlist.</p>
      </div>
      <div class="detail-block"><h4>DPT Graduate School Requirements</h4>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.7">To become a Doctor of Physical Therapy (DPT) in the USA: bachelor's in Exercise Science or Kinesiology, minimum 3.0–3.3 GPA (competitive programs require 3.5+), 50–100 clinical observation hours, GRE scores, and faculty recommendations. Olivier should plan to raise his GPA above 3.0 during his US degree. Pre-PT rating at ${u.full}: <strong style="color:var(--emerald)">${u.prePT}</strong>.</p>
      </div>
    </div>
    <div class="mtab-content" id="tab-standings">
      <div class="detail-block" style="margin-bottom:1rem"><h4>Conference Standings 2020–2025</h4>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="border-bottom:1px solid var(--border)"><th style="text-align:left;padding:6px 0;font-size:11px;color:var(--hint);font-weight:700;text-transform:uppercase">Year</th><th style="text-align:left;padding:6px 0;font-size:11px;color:var(--hint);font-weight:700;text-transform:uppercase">Position</th><th style="text-align:left;padding:6px 0;font-size:11px;color:var(--hint);font-weight:700;text-transform:uppercase">Notes</th></tr>
          ${u.confRecord.map(r=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:7px 0;font-weight:600">${r.yr}</td><td style="padding:7px 0"><span class="sy ${posColor(r.pos)}">${r.pos}</span></td><td style="padding:7px 0;font-size:12px;color:var(--muted)">${r.note}</td></tr>`).join('')}
        </table>
      </div>
      <div class="detail-block"><h4>Titles & Honours</h4>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${u.titles.map(t=>`<span class="title-chip">${t}</span>`).join('')}</div>
      </div>
    </div>
    <div class="mtab-content" id="tab-pro">
      <div class="detail-block" style="margin-bottom:1rem">
        <h4>Professional Pipeline</h4>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:1rem">
          <div style="text-align:center;background:var(--indigo3);border-radius:10px;padding:12px 16px">
            <div style="font-size:2.5rem;font-weight:800;color:var(--indigo);line-height:1">${u.proPlayers.mlsPicks5yr}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">MLS picks<br>2022–2026</div>
          </div>
          <p style="font-size:13px;color:var(--muted);line-height:1.7">${u.proPlayers.draftRank}</p>
        </div>
        <h4 style="margin-bottom:8px">Notable Players</h4>
        <ul class="subject-list">${(u.proPlayers.notable||[]).map(n=>`<li>${n}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="mtab-content" id="tab-development">
      <div class="fit-section">
        <h4>Development Ratings — 8/10 Midfielder</h4>
        ${u.devScores ? Object.entries({tactical:'Tactical Development',technical:'Technical Development',fitness:'Fitness Programming'}).map(([k,l])=>`
        <div class="fit-row">
          <div class="fit-label">${l}</div>
          <div class="fit-track"><div class="fit-fill" style="width:${u.devScores[k]}%;background:${sc(u.devScores[k])}"></div></div>
          <div class="fit-num" style="color:${sc(u.devScores[k])}">${u.devScores[k]}</div>
        </div>`).join('') : '<p style="color:var(--muted);font-size:13px">Development ratings not available for this school profile.</p>'}
      </div>
      <div class="detail-block" style="margin-top:1rem"><h4>Overall Fit for Olivier</h4>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:.75rem">
          <div id="modal-fit-score" style="font-size:2.5rem;font-weight:800;color:${sc(u.fitOlivier)}">${u.fitOlivier}%</div>
          <p style="font-size:13px;color:var(--muted)">${u.rec||'Fit score based on soccer program quality, minutes outlook, climate, and city lifestyle.'}</p>
        </div>
      </div>
    </div>
    <div class="mtab-content" id="tab-contact">
      ${u.div==='IVY'?`<div class="ivy-warning">⚠ Ivy League coaches cannot offer athletic scholarships. Contact should still go through your agent — coach relationships matter for roster spots.</div>`:''}
      <div class="contact-block"><h4>${u.coach.name}</h4>
        <div class="contact-row"><div class="ci">Title</div><div class="cv">${u.coach.title}</div></div>
        <div class="contact-row"><div class="ci">Email</div><div class="cv"><a href="mailto:${u.coach.email}">${u.coach.email}</a></div></div>
        <div class="contact-row"><div class="ci">Phone</div><div class="cv">${u.coach.phone}</div></div>

      </div>
      <div class="detail-block" style="margin-bottom:1rem"><h4>Coach Profile</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.7">${u.coach.profile}</p></div>
      <div class="tip-box"><p><strong>Agent recommends:</strong> All contact should be coordinated through your agent. Coach introductions via a platform carry significantly more weight than cold emails. Include Olivier's highlights link, academic profile, and Australian background.</p></div>
      <div class="tip-box"><p><strong>What coaches want from an 8/10 midfielder:</strong> Pressing intensity, passing range, composure under pressure, work rate off the ball. Show defensive recovery, winning duels, variety — not just assists and goals.</p></div>
    </div>
    <div class="mtab-content" id="tab-minutes">
      ${buildMinutesModalTab(u)}
    </div>
    <div class="mtab-content" id="tab-culture">
      ${u.culture?`
      <div style="background:var(--navy);border-radius:14px;padding:1.25rem 1.4rem;margin-bottom:1rem;position:relative;overflow:hidden">
        <div style="position:absolute;top:-30px;right:-30px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 70%)"></div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:8px">Olivier's Lifestyle Match</div>
        <div style="font-size:1.4rem;font-weight:800;color:#fff;line-height:1.3;margin-bottom:6px">${u.culture.olivierMatch}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.5)">${u.culture.lifestyleTags}</div>
      </div>
      <div class="detail-grid" style="margin-bottom:1rem">
        <div class="detail-block"><h4>Campus Vibe & Atmosphere</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.75">${u.culture.vibe}</p></div>
        <div class="detail-block"><h4>Social Scene & Community</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.75">${u.culture.socialScene}</p></div>
      </div>
      <div class="detail-block" style="margin-bottom:1rem">
        <h4>What's There To Do? 🗺️</h4>
        <p style="font-size:12.5px;color:var(--muted);line-height:1.85">${u.culture.thingsToDo}</p>
      </div>
      <div class="tip-box">
        <p><strong>For Olivier specifically:</strong> Coming from Sydney, warm weather, beach access, and multicultural city energy are key lifestyle factors. Use this tab to judge cultural fit beyond just soccer and academics.</p>
      </div>`:'<div class="detail-block"><p style="color:var(--muted)">Culture information coming soon.</p></div>'}
    </div>
    <div class="mtab-content" id="tab-facilities">
      ${u.facilityDetails?`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;flex-wrap:wrap">
        <span class="fac-rating-badge fac-${(u.facilityDetails.rating||'Solid').toLowerCase().replace(' ','')}">${u.facilityDetails.rating||'—'} Facilities</span>
        <span style="font-size:12px;color:var(--muted)">${u.full} · ${u.div} · ${u.conf}</span>
      </div>
      <div class="fac-grid">
        <div class="fac-block"><h5>🏟 Stadium & Match Venue</h5><p>${u.facilityDetails.stadium}</p></div>
        <div class="fac-block"><h5>⚽ Training Fields & Pitches</h5><p>${u.facilityDetails.trainingFields}</p></div>
        <div class="fac-block"><h5>💪 Strength & Conditioning</h5><p>${u.facilityDetails.strengthConditioning}</p></div>
        <div class="fac-block"><h5>📡 Sports Science & Technology</h5><p>${u.facilityDetails.sportsScience}</p></div>
        <div class="fac-block"><h5>🏥 Sports Medicine & Recovery</h5><p>${u.facilityDetails.sportsMed}</p></div>
        <div class="fac-block"><h5>🔬 Academic Labs & Clinical Access</h5><p>${u.facilityDetails.academicLabs}</p></div>
        ${u.facilityDetails.housing?`<div class="fac-block"><h5>🏠 On-Campus Housing</h5><p>${u.facilityDetails.housing.available===false?'Not available — ':u.facilityDetails.housing.available==='limited'?'Limited — ':''}${u.facilityDetails.housing.note||''}</p></div>`:''}
      </div>
      <div class="fac-block" style="margin-bottom:1rem"><h5>🎁 Extras & Unique Perks</h5><p>${u.facilityDetails.extras}</p></div>
      <div class="fac-note"><p><strong>Facilities verdict:</strong> ${u.facilityDetails.note}</p></div>
      `:'<div class="detail-block"><p style="color:var(--muted)">Facility details coming soon.</p></div>'}
    </div>`;
}

function switchTab(btn,tabId){
  const body=document.getElementById('modal-body');
  body.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active'));
  body.querySelectorAll('.mtab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  const tabEl=document.getElementById('tab-'+tabId);
  if(tabEl) tabEl.classList.add('active');
}
function closeModal(){
  document.getElementById('modal').classList.add('hidden');
  currentModalId = null;
  // Return focus to the element that opened the modal
  if (modalTriggerEl && typeof modalTriggerEl.focus === 'function') {
    modalTriggerEl.focus();
    modalTriggerEl = null;
  }
}
function showPage(id,btn){
  // Save scroll position of the current active page before switching
  const curPage = document.querySelector('.page.active');
  if (curPage) {
    sessionStorage.setItem('scroll_' + curPage.id, String(window.scrollY));
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');btn.classList.add('active');
  if(id==='coaches') setTimeout(initCoachTabs, 0);
  // Restore scroll position for the new page
  const saved = sessionStorage.getItem('scroll_page-' + id);  // key matches curPage.id = 'page-<id>'
  window.scrollTo(0, saved ? parseInt(saved, 10) : 0);
}
// ══════════════════════════════════════════════════
// ATAR → GPA CONVERSION ENGINE
// ══════════════════════════════════════════════════

// Conversion table: [atar, usgpa]
const atarGpaTable = [
  [99, 4.0], [95, 3.9], [90, 3.7], [85, 3.5], [80, 3.3],
  [75, 3.0], [70, 2.8], [65, 2.6], [60, 2.4], [55, 2.2],
  [50, 2.0], [45, 1.8], [40, 1.5]
];

function atarToGpa(atar) {
  // Clamp
  const val = Math.max(40, Math.min(99, atar));
  // Find surrounding bracket
  for (let i = 0; i < atarGpaTable.length - 1; i++) {
    const [a1, g1] = atarGpaTable[i];
    const [a2, g2] = atarGpaTable[i + 1];
    if (val <= a1 && val >= a2) {
      // Linear interpolation
      const t = (val - a2) / (a1 - a2);
      return Math.round((g2 + t * (g1 - g2)) * 10) / 10;
    }
  }
  return 1.5;
}

// Parse a school's minEntry string into a numeric GPA threshold
function parseMinEntry(minEntry) {
  if (!minEntry) return 0;
  const s = minEntry.toLowerCase();
  if (s.includes('no minimum') || s.includes('open')) return 0;
  // Extract first number found
  const m = minEntry.match(/(\d+\.\d+|\d+)/);
  return m ? parseFloat(m[1]) : 0;
}

// Determine dynamic status given converted GPA and school min entry
function dynamicGpaStatus(convertedGpa, minEntry) {
  const min = parseMinEntry(minEntry);
  if (min === 0) return 'eligible';           // open enrolment
  if (convertedGpa >= min) return 'eligible';
  if (convertedGpa >= min - 0.3) return 'borderline';
  return 'below';
}

// Current ATAR state (starts at 70)
let currentAtarGpa = atarToGpa(70);

// v17: Hide-ineligible toggle state
let atarHideBelow = false;

function toggleAtarHide() {
  atarHideBelow = !atarHideBelow;
  const btn = document.getElementById('atar-hide-btn');
  if (btn) {
    btn.classList.toggle('atar-hide-active', atarHideBelow);
    btn.textContent = atarHideBelow ? '🚫 Hiding ineligible' : '🚫 Hide ineligible';
  }
  refreshAllGpaRows();
  applyFilters();
}

function onAtarSlide() {
  const atar = parseInt(document.getElementById('atar-slider').value);
  currentAtarGpa = atarToGpa(atar);

  document.getElementById('atar-display').textContent = atar;
  document.getElementById('gpa-display').textContent = currentAtarGpa.toFixed(1);

  // v37.1: GPA is a pure eligibility filter/toggle now — it no longer feeds
  // the Fit Score (Soccer Priority dropped GPA/Cost/ACU entirely), so the
  // slider only needs to refresh the eligibility display, not recalculate
  // or re-sort scores.
  refreshAllGpaRows();
  updateAtarCounts();
  applyFilters(); // v17: re-run filter engine so hide/grey state updates live
  if (typeof syncDashGpa === 'function') syncDashGpa(currentAtarGpa, atar);

  // v36.5: Compare tab's GPA row used to only refresh when the selection
  // changed (toggleCompare/removeCompare) — never on ATAR slide — so it
  // could show a stale eligibility icon relative to the current slider.
  if (typeof renderComparePage === 'function' && typeof selectedIds !== 'undefined' && selectedIds.size) {
    renderComparePage();
  }
}

function refreshAllGpaRows() {
  const container = document.getElementById('cards-container');
  if (!container) return;
  container.querySelectorAll('.ucard').forEach(card => {
    const schoolId = card.id.replace('card-', '');
    const u = unis.find(x => x.id === schoolId);
    if (!u || !u.gpa) return;
    const gpaRowEl = card.querySelector('.gpa-compact');
    if (!gpaRowEl) return;

    const dynStatus = dynamicGpaStatus(currentAtarGpa, u.gpa.minEntry);
    const statusColor = dynStatus === 'eligible' ? 'var(--emerald)' : dynStatus === 'borderline' ? 'var(--amber)' : 'var(--rose)';
    const statusIcon  = dynStatus === 'eligible' ? '✅' : dynStatus === 'borderline' ? '⚠️' : '❌';
    const isOpen = u.gpa.minEntry.toLowerCase().includes('no minimum') || u.gpa.minEntry.toLowerCase().includes('open');
    const entryText = isOpen ? 'Open entry ✅' : u.gpa.minEntry + ' ' + statusIcon;

    const valEl = gpaRowEl.querySelector('.gpa-c-val');
    if (valEl) {
      valEl.textContent = entryText;
      valEl.style.color = statusColor;
    }

    // v17: grey-out class — borderline gets a mild tint, below gets full grey
    card.classList.remove('gpa-borderline', 'gpa-below');
    if (dynStatus === 'borderline') card.classList.add('gpa-borderline');
    if (dynStatus === 'below')      card.classList.add('gpa-below');

    // Update data attribute for filter engine
    card.dataset.atargpastatus = dynStatus;
  });
}

function updateAtarCounts() {
  const container = document.getElementById('cards-container');
  if (!container) return;
  let eligible = 0, borderline = 0, below = 0;
  container.querySelectorAll('.ucard').forEach(card => {
    const schoolId = card.id.replace('card-', '');
    const u = unis.find(x => x.id === schoolId);
    if (!u || !u.gpa) return;
    const s = dynamicGpaStatus(currentAtarGpa, u.gpa.minEntry);
    if (s === 'eligible') eligible++;
    else if (s === 'borderline') borderline++;
    else below++;
  });
  const elEl = document.getElementById('atar-count-eligible');
  const blEl = document.getElementById('atar-count-borderline');
  const bwEl = document.getElementById('atar-count-below');
  if (elEl) elEl.textContent = eligible + ' eligible';
  if (blEl) blEl.textContent = borderline + ' borderline';
  if (bwEl) bwEl.textContent = below + ' below min';
}

// ── Conference group resolver — maps any conf string to a known chip key ──────
const CONF_ALIAS_MAP = {
  'sec': 'sec', 'southeastern': 'sec',
  'acc': 'acc', 'atlantic coast': 'acc',
  'big ten': 'big-ten', 'big-ten': 'big-ten',
  'big east': 'big-east', 'big-east': 'big-east',
  'aac': 'aac', 'american athletic': 'aac',
  'big west': 'big-west', 'big-west': 'big-west',
  'caa': 'caa', 'colonial athletic': 'caa',
  'wac': 'wac', 'western athletic': 'wac',
  'mac': 'mac', 'mid-american': 'mac',
  'wcc': 'wcc', 'west coast': 'wcc',
  'asun': 'asun',
  'america east': 'america-east', 'america-east': 'america-east',
  'ivy league': 'ivy-league', 'ivy': 'ivy-league',
  'ssc': 'ssc', 'sunshine state': 'ssc',
  'ccaa': 'ccaa', 'california collegiate': 'ccaa',
  'cacc': 'cacc', 'central atlantic collegiate': 'cacc',
  'lsc': 'lsc', 'lone star': 'lsc',
  'sac': 'sac', 'sooner athletic': 'sac',
  'sun conference': 'sun-conference', 'sun': 'sun-conference',
  'sciac': 'sciac',
  'cccaa': 'cccaa',
  'njcaa': 'njcaa',
};
function resolveConfGroup(conf) {
  const norm = conf.toLowerCase().trim();
  if (CONF_ALIAS_MAP[norm]) return CONF_ALIAS_MAP[norm];
  // Sort by alias length descending so longer/more-specific aliases win (e.g. "ccaa" beats "acc")
  const match = Object.entries(CONF_ALIAS_MAP)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([alias]) => norm.includes(alias));
  return match ? match[1] : norm.replace(/\s+/g, '-');
}



let searchKeyword = '';

function filterBySearch(keyword) {
  searchKeyword = (keyword || '').toLowerCase().trim();
  applyFilters();
}

function clearSearch() {
  searchKeyword = '';
  const inp = document.getElementById('search-schools');
  if (inp) inp.value = '';
  applyFilters();
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';
}

function showAllCards() {
  document.querySelectorAll('.conf-section').forEach(sec => {
    if (sec.classList.contains('div-collapsed')) {
      const btn = sec.querySelector('.div-toggle-btn');
      if (btn) btn.click();
    }
  });
}

function hideAllCards() {
  document.querySelectorAll('.conf-section').forEach(sec => {
    if (!sec.classList.contains('div-collapsed')) {
      const btn = sec.querySelector('.div-toggle-btn');
      if (btn) btn.click();
    }
  });
}


// activeFilters: { filterType: Set of active values }
const activeFilters = {};

function toggleFilter(btn){
  const type = btn.dataset.filter;
  const val  = btn.dataset.val;
  if(!activeFilters[type]) activeFilters[type] = new Set();
  if(activeFilters[type].has(val)){
    activeFilters[type].delete(val);
    btn.classList.remove('active');
  } else {
    activeFilters[type].add(val);
    btn.classList.add('active');
  }
  applyFilters();
}

function applyFilters(){
  const container = document.getElementById('cards-container');
  const cards = container ? container.querySelectorAll('.ucard') : [];
  let visible = 0;
  cards.forEach(c=>{
    let show = true;
    // v20: live search filter
    if (searchKeyword) {
      const cardId = (c.id || '').replace('card-', '');
      const u = unis.find(x => x.id === cardId);
      const haystack = ((u ? u.full : '') + ' ' + (u ? u.name : '')).toLowerCase();
      if (!haystack.includes(searchKeyword)) show = false;
    }
    if (!show) { c.style.display = 'none'; return; }
    for(const [type, vals] of Object.entries(activeFilters)){
      if(!vals.size) continue;
      if(type==='gpamin'){
        const cardVal = c.dataset.gpamin;
        if(vals.has('low')){
          const ok = (cardVal==='none'||cardVal==='low')||vals.has(cardVal);
          if(!ok){ show=false; break; }
        } else {
          if(![...vals].some(v=>cardVal===v)){ show=false; break; }
        }
      } else if(type==='lensdivtop'){
        if(c.dataset.lensdivtop !== 'true'){ show=false; break; }
      } else {
        if(![...vals].some(v=>c.dataset[type]===v)){ show=false; break; }
      }
    }
    // v17: ATAR hide-ineligible toggle
    // Top Picks are never fully hidden — they stay visible but greyed out
    // so aspirational targets remain visible even when below minimum.
    if (show && atarHideBelow) {
      const status = c.dataset.atargpastatus;
      const isTopPick = c.dataset.top === 'true';
      if (status === 'below' && !isTopPick) {
        show = false;
      }
    }
    c.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  // Show/hide section wrappers
  document.querySelectorAll('.conf-section').forEach(sec=>{
    const hasVisible=[...sec.querySelectorAll('.ucard')].some(c=>c.style.display!=='none');
    sec.style.display=hasVisible?'':'none';
  });
  // Show/hide region sub-headers whose group has no visible cards left
  document.querySelectorAll('.region-subhead').forEach(head=>{
    const grid=head.nextElementSibling;
    if(grid && grid.classList.contains('region-grid')){
      const hasVisible=[...grid.querySelectorAll('.ucard')].some(c=>c.style.display!=='none');
      head.style.display=hasVisible?'':'none';
    }
  });
  updateFilterSummary(visible);
  const hasAny = Object.values(activeFilters).some(s=>s.size>0) || !!searchKeyword;
  const clearBtn = document.getElementById('filter-clear-btn');
  if(clearBtn) clearBtn.style.display = (Object.values(activeFilters).some(s=>s.size>0)) ? '' : 'none';

  // Empty state — only show when filters are active and nothing matches
  let emptyEl = document.getElementById('cards-empty-state');
  if (!emptyEl) {
    emptyEl = document.createElement('div');
    emptyEl.id = 'cards-empty-state';
    emptyEl.style.cssText = 'padding:2.5rem 1.5rem;text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin:1rem 0;display:none';
    emptyEl.innerHTML =
      '<div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:.4rem">No schools match your filters</div>' +
      '<p style="font-size:12.5px;color:var(--muted);margin:0 0 1rem;line-height:1.6">' +
        'Try removing a filter, expanding the division, or adjusting the budget range.' +
      '</p>' +
      '<button onclick="clearAllFilters()" style="background:var(--indigo);color:#fff;border:none;border-radius:8px;padding:6px 18px;font-size:12.5px;font-weight:700;cursor:pointer">Clear all filters</button>';
    if (container) container.appendChild(emptyEl);
  }
  emptyEl.style.display = (visible === 0 && hasAny) ? '' : 'none';
}

function clearAllFilters(){
  Object.keys(activeFilters).forEach(k=>activeFilters[k].clear());
  document.querySelectorAll('.fchip.active').forEach(b=>b.classList.remove('active'));
  // v20: also clear search
  clearSearch();
  // v17: also reset hide-below toggle
  atarHideBelow = false;
  const hideBtn = document.getElementById('atar-hide-btn');
  if (hideBtn) { hideBtn.classList.remove('atar-hide-active'); hideBtn.textContent = '🚫 Hide ineligible'; }
  const container = document.getElementById('cards-container');
  if(container){
    container.querySelectorAll('.ucard').forEach(c=>c.style.display='');
    container.querySelectorAll('.conf-section').forEach(s=>s.style.display='');
    container.querySelectorAll('.region-subhead').forEach(h=>h.style.display='');
    const total = container.querySelectorAll('.ucard').length;
    const el = document.getElementById('filter-active-summary');
    if(el) el.innerHTML = 'Showing all <strong>'+total+'</strong> schools';
  }
  const clearBtn = document.getElementById('filter-clear-btn');
  if(clearBtn) clearBtn.style.display = 'none';
}

function updateFilterSummary(count){
  const el = document.getElementById('filter-active-summary');
  if(!el) return;
  const container = document.getElementById('cards-container');
  const total = container ? container.querySelectorAll('.ucard').length : 0;
  const activeChips = document.querySelectorAll('.fchip.active');

  if(activeChips.length === 0 && !searchKeyword){
    el.innerHTML = 'Showing all <strong>'+total+'</strong> schools';
    return;
  }

  // Build removable tag pills for each active filter
  let html = '<span class="filter-result-count">'+count+' result'+(count!==1?'s':'')+'</span> ';
  activeChips.forEach(chip => {
    const label = chip.textContent.trim();
    const type  = chip.dataset.filter;
    const val   = chip.dataset.val;
    html += `<span class="active-filter-tag">${label}<button class="active-filter-rm" aria-label="Remove ${label} filter" onclick="removeFilter('${type}','${val}',this)">×</button></span>`;
  });
  if(searchKeyword){
    html += `<span class="active-filter-tag">Search: ${searchKeyword}<button class="active-filter-rm" aria-label="Clear search" onclick="clearSearch()">×</button></span>`;
  }
  el.innerHTML = html;
}

function removeFilter(type, val, btn){
  if(!activeFilters[type]) return;
  activeFilters[type].delete(val);
  // Deactivate the matching chip
  const chip = document.querySelector(`.fchip[data-filter="${type}"][data-val="${val}"]`);
  if(chip) chip.classList.remove('active');
  applyFilters();
}

function toggleFilterPanel(){
  const body = document.getElementById('filter-panel-body');
  const btn  = document.getElementById('filter-toggle-btn');
  const isHidden = body.style.display==='none';
  body.style.display = isHidden ? '' : 'none';
  btn.textContent = isHidden ? '▲ Hide filters' : '▼ Show filters';
}

// Keep backward-compat stubs for any residual calls (coaches filters etc)
function filterAll(btn){clearAllFilters();}
function filterDiv(div,btn){}
function filterRegion(reg,btn){}
function filterPick(btn){}
function filterWarm(btn){}
function filterGPA(bucket,btn){}

function updateSections(){document.querySelectorAll('.conf-section').forEach(sec=>{const hasVisible=[...sec.querySelectorAll('.ucard')].some(c=>c.style.display!=='none');sec.style.display=hasVisible?'':'none';});}
function renderContacts(){
  const container=document.getElementById('contacts-list');let html='';
  unis.forEach(u=>{html+=`<div class="contact-block" style="margin-bottom:1rem">
    <h4 style="display:flex;align-items:center;gap:8px"><span class="dbadge d-${u.div}">${u.div}</span>${u.full} — ${u.coach.name}</h4>
    <div style="font-size:11px;color:var(--hint);margin-bottom:8px">${u.loc} · ${u.conf}</div>
    <div class="contact-row"><div class="ci">Title</div><div class="cv">${u.coach.title}</div></div>
    <div class="contact-row"><div class="ci">Email</div><div class="cv"><a href="mailto:${u.coach.email}">${u.coach.email}</a></div></div>
    <div class="contact-row"><div class="ci">Phone</div><div class="cv">${u.coach.phone}</div></div>

    ${u.div==='IVY'?'<div style="font-size:11px;color:var(--gold);font-weight:600;margin-top:4px">⚠ Ivy League — no athletic scholarships, need-based only</div>':''}</div>`;});
  container.innerHTML=html;
}

// ══════════════════════════════════════════════════
// FILTER CHIPS — conference row rendered from unis data
// ══════════════════════════════════════════════════

// v20.1: Conference chip labels — covers every conf in the guide
const CONF_CHIP_LABELS = {
  // Power 4 / Major D1
  'sec':              'SEC',
  'acc':              'ACC',
  'big-ten':          'Big Ten',
  'big-east':         'Big East',
  'aac':              'AAC',
  'big-west':         'Big West',
  // Mid-Major D1
  'caa':              'CAA',
  'wac':              'WAC',
  'mac':              'MAC',
  'wcc':              'WCC',
  'asun':             'ASUN',
  'america-east':     'Am. East',
  // Ivy
  'ivy-league':       'Ivy League',
  // D2
  'ssc':              'SSC',
  'ccaa':             'CCAA',
  'cacc':             'CACC',
  'lsc':              'LSC',
  // NAIA
  'sac':              'SAC',
  'sun-conference':   'Sun Conf',
  // D3
  'sciac':            'SCIAC',
  // JUCO
  'cccaa':            'CCCAA',
  'njcaa':            'NJCAA',
};

// Ordered by tier — P4 first, then mid-major D1, Ivy, D2, NAIA, D3, JUCO
const CONF_CHIP_ORDER = [
  'sec','acc','big-ten','big-east','aac','big-west',
  'caa','wac','mac','wcc','asun','america-east',
  'ivy-league',
  'ssc','ccaa','cacc','lsc',
  'sac','sun-conference',
  'sciac',
  'cccaa','njcaa',
];

function renderFilterChips() {
  try {
    const container = document.getElementById('conf-filter-chips');
    if (!container) return;

    // Count schools per conf-group key
    const keyCounts = {};
    unis.forEach(u => {
      const key = resolveConfGroup(u.conf || '');
      if (CONF_CHIP_LABELS[key]) keyCounts[key] = (keyCounts[key] || 0) + 1;
    });

    // Render in prestige order, only keys that have schools
    CONF_CHIP_ORDER.filter(k => keyCounts[k]).forEach(ck => {
      const label = CONF_CHIP_LABELS[ck] || ck.toUpperCase();
      const count = keyCounts[ck];
      const btn = document.createElement('button');
      btn.className = 'fchip';
      btn.dataset.filter = 'confgroup';
      btn.dataset.val = ck;
      btn.onclick = function(){ toggleFilter(this); };
      btn.innerHTML = label + ' <span class="fchip-count">(' + count + ')</span>';
      container.appendChild(btn);
    });
  } catch(e) { console.error('renderFilterChips failed:', e); }
}

// ══════════════════════════════════════════════════
// PATHWAYS — rendered from olivier.json athleteConfig
// ══════════════════════════════════════════════════

function renderPathways() {
  try {
    const container = document.getElementById('pathways-container');
    if (!container) return;
    const p = athleteConfig.pathways;
    if (!p) return;

    const pathCards = (p.paths || []).map(path => `
      <div class="path-card" style="border-color:${path.borderColor};">
        <div style="font-size:11px;font-weight:700;color:${path.labelColor};text-transform:uppercase;letter-spacing:.09em;margin-bottom:6px;">${path.label}</div>
        <h3 style="font-size:1.05rem;font-weight:700;color:var(--navy);margin-bottom:.65rem;">${path.title}</h3>
        <p style="font-size:13px;color:var(--muted);line-height:1.7">${path.body}</p>
        <div style="font-size:12px;color:${path.footerColor};border-top:1px solid var(--border);padding-top:.65rem;margin-top:.5rem">${path.footer}</div>
      </div>`).join('');

    const questions = (p.coachQuestions || []).map(q =>
      `<div class="q-card">"${q}"</div>`
    ).join('');

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;margin-bottom:2rem;">
        ${pathCards}
      </div>
      <div class="section-head"><h2>Questions to Ask Every Coach</h2></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.75rem;margin-bottom:2rem;">
        ${questions}
      </div>`;
  } catch(e) { console.error('renderPathways failed:', e); }
}

// ══════════════════════════════════════════════════
// ACU ALIGNMENT TABLE — rendered from acuUnits on school objects
// ══════════════════════════════════════════════════

const ACU_UNIT_META = [
  { unit: "ANAT100", label: "Anatomical Foundations",            usEquiv: "Human/Applied Anatomy",                       coverage: "Full — universal" },
  { unit: "EXSC222", label: "Functional Anatomy",                usEquiv: "Functional/Applied Anatomy",                   coverage: "Full at D1/top D2" },
  { unit: "BIOL125", label: "Human Biology 1",                   usEquiv: "General/Human Biology",                        coverage: "Full — universal prerequisite" },
  { unit: "EXSC225", label: "Physiological Bases of Exercise",   usEquiv: "Introduction to Exercise Physiology",          coverage: "Full — universal" },
  { unit: "EXSC322", label: "Exercise Physiology: Adaptation",   usEquiv: "Advanced Exercise Physiology",                 coverage: "Full at D1/strong D2" },
  { unit: "EXSC394", label: "Exercise Prescription",             usEquiv: "Exercise Prescription / Clinical Ex Phys",     coverage: "Full at pre-PT programs" },
  { unit: "EXSC224", label: "Mechanical Bases of Exercise",      usEquiv: "Introduction to Biomechanics",                 coverage: "Full — universal" },
  { unit: "EXSC321", label: "Biomechanics",                      usEquiv: "Advanced/Applied Biomechanics",                coverage: "Full at D1/strong D2" },
  { unit: "EXSC204", label: "Exercise Prescription & Delivery",  usEquiv: "Exercise Testing and Prescription",            coverage: "Strong — near identical",        partial: true },
  { unit: "EXSC216", label: "Resistance Training",               usEquiv: "Strength & Conditioning / Resistance Training",coverage: "Strong — near identical",        partial: true },
  { unit: "EXSC199", label: "Psychology of Sport",               usEquiv: "Sport Psychology",                             coverage: "Full — universal" },
  { unit: "EXSC296", label: "Health & Exercise Psychology",      usEquiv: "Exercise & Health Psychology",                 coverage: "Strong at major programs",       partial: true },
  { unit: "EXSC187", label: "Growth, Motor Development & Ageing",usEquiv: "Lifespan Motor Development",                  coverage: "Partial — often split",          amber: true },
  { unit: "EXSC230", label: "Motor Control & Learning",          usEquiv: "Motor Control & Learning / Neuromechanics",   coverage: "Partial — rare standalone",      amber: true },
  { unit: "EXSC122", label: "Research & Ethics",                 usEquiv: "Research Methods in Kinesiology",              coverage: "Strong — required everywhere",   partial: true },
  { unit: "EXSC398", label: "Professional Experience (140hrs)",  usEquiv: "Internship / Clinical Practicum",              coverage: "Full at PBA, Indiana, Akron" },
];

function renderACUTable() {
  try {
    const container = document.getElementById('acu-table-container');
    if (!container) return;
    if (!Array.isArray(unis) || !unis.length) return;

    const fullProfiles = unis.filter(u => u.profileDepth === 'full' && Array.isArray(u.acuUnits) && !u.juco2yr);
    if (!fullProfiles.length) return;

    const rows = ACU_UNIT_META.map(meta => {
      const covering = fullProfiles
        .filter(u => {
          const match = u.acuUnits.find(x => x.unit === meta.unit);
          return match && match.covered;
        })
        .sort((a, b) => (b.acuAlign || 0) - (a.acuAlign || 0));

      const chips = covering.map(u => {
        const color = u.acuAlign >= 14 ? 'var(--emerald)' :
                      u.acuAlign >= 10 ? 'var(--sky)' : 'var(--amber)';
        const bg    = u.acuAlign >= 14 ? 'var(--emerald3)' :
                      u.acuAlign >= 10 ? 'var(--sky3)' : 'var(--amber3)';
        const note  = u.div === 'IVY' ? ' (no schol)' :
                      u.noVarsity ? ' ⚠' : '';
        return `<span style="display:inline-block;font-size:10px;font-weight:600;padding:1px 7px;border-radius:5px;margin:2px 2px 0;background:${bg};color:${color}">${u.name}${note}</span>`;
      }).join('');

      const coverageChip = meta.amber
        ? `<span class="align-pill" style="background:var(--amber3);color:var(--amber)">${meta.coverage}</span>`
        : meta.partial
          ? `<span class="align-pill align-strong">${meta.coverage}</span>`
          : `<span class="align-pill align-full">${meta.coverage}</span>`;

      return `<tr>
        <td>${meta.unit} — ${meta.label}</td>
        <td>${meta.usEquiv}</td>
        <td>${chips || '<span style="color:var(--hint);font-size:11px">—</span>'}</td>
        <td>${coverageChip}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `<div style="overflow-x:auto;">
      <table class="pro-league-table">
        <thead><tr>
          <th>ACU Unit</th>
          <th>US Equivalent Name</th>
          <th>Programs covering this unit</th>
          <th>Coverage</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  } catch(e) { console.error('renderACUTable failed:', e); }
}


// ══════════════════════════════════════════════════
// PIPELINE DATA & RENDER
// ══════════════════════════════════════════════════

function chipStyle(style) {
  const map = {
    'chip-green':  'background:#f0fdf4;color:#166534;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px',
    'chip-purple': 'background:#f5f3ff;color:#5b21b6;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px',
    'chip-gold':   'background:#fef9c3;color:#854d0e;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px',
    'hint':        'color:var(--hint);font-size:11px',
  };
  return map[style] || 'font-size:11px;color:var(--muted)';
}

function buildChampionshipRows(rows, cols) {
  return rows.map(r => {
    if (r.sectionDivider) {
      return `<tr style="background:var(--surface2,#f8f8f6)"><td colspan="${cols}" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--hint);padding:5px 10px">${r.dividerLabel}</td></tr>`;
    }
    const rankCell = r.rankClass
      ? `<span class="${r.rankClass}">${r.rank}</span>${r.school}`
      : `${r.rank !== null ? r.rank + ' · ' : '— '}${r.school}`;
    const titlesCell = r.titlesColor === 'muted'
      ? `<span style="color:var(--muted)">${r.titles}</span>`
      : r.titles;
    const yearsCell = r.yearsStyle
      ? `<span style="${chipStyle(r.yearsStyle)}">${r.years}</span>`
      : r.years;
    return `<tr>
      <td>${rankCell}</td>
      <td><span class="dbadge ${r.badgeClass}">${r.badge}</span></td>
      <td>${titlesCell}</td>
      <td style="font-size:11px">${yearsCell}</td>
      <td style="font-size:11px;color:var(--muted)">${r.notes}</td>
    </tr>`;
  }).join('');
}

function renderPipelineTables() {
  try {
    if (!pipelineData || !pipelineData.ncaaD1) return;

    // v20: inject toggle buttons + section wrappers
    const pipelinePage = document.getElementById('page-pipeline');
    if (!document.getElementById('pipeline-div-toggles') && pipelinePage) {
      const toggleBar = document.createElement('div');
      toggleBar.id = 'pipeline-div-toggles';
      toggleBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.25rem';
      toggleBar.innerHTML = [
        ['pipeline-toggle-d1', 'NCAA D1 Champions'],
        ['pipeline-toggle-d2', 'NCAA D2 Champions'],
        ['pipeline-toggle-mls','MLS SuperDraft'],
      ].map(([id, label]) =>
        `<button id="${id}" class="pipeline-toggle-btn pipeline-toggle-on"
          onclick="togglePipelineSection('${id}')">${label}</button>`
      ).join('');
      // Insert after the intro paragraph (first <p> after section-head)
      const firstP = pipelinePage.querySelector('p');
      if (firstP) pipelinePage.insertBefore(toggleBar, firstP.nextSibling);
    }

    const d1 = document.getElementById('pipeline-d1-container');
    if (d1) {
      d1.innerHTML = `<div style="overflow-x:auto;margin-bottom:.5rem;"><table class="pro-league-table">
        <thead><tr>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">School</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Division</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">D1 Titles</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Years</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Notes</th>
        </tr></thead>
        <tbody style="font-size:11px">${buildChampionshipRows(pipelineData.ncaaD1, 5)}</tbody>
      </table></div>`;
    }

    const d2 = document.getElementById('pipeline-d2-container');
    if (d2) {
      d2.innerHTML = `<div style="overflow-x:auto;margin-bottom:.5rem;"><table class="pro-league-table">
        <thead><tr>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">School</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Division</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">D2 Titles</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Years</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Notes</th>
        </tr></thead>
        <tbody style="font-size:11px">${buildChampionshipRows(pipelineData.ncaaD2, 5)}</tbody>
      </table></div>`;
    }

    const mls = document.getElementById('pipeline-mls-container');
    if (mls) {
      const mlsRows = pipelineData.mlsDraft.map(r => {
        const rankNum = parseInt(r.rank);
        const badgeStyle = rankNum === 1
          ? 'background:#F59E0B;color:#451a03'
          : rankNum === 2
            ? 'background:#A78BFA;color:#2e1065'
            : rankNum === 3
              ? 'background:#FB923C;color:#431407'
              : 'background:#E5E7EB;color:#374151';
        // Always render the circle — use r.rank string directly so "—" or any value shows
        const displayRank = (r.rank !== null && r.rank !== undefined) ? r.rank : '—';
        const rankCell = `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:11px;font-weight:800;${badgeStyle}">${displayRank}</span>`;
        return `<tr>
          <td style="font-size:11px">${rankCell}</td>
          <td style="font-size:11px">${r.school}</td>
          <td style="font-size:11px"><span class="dbadge ${r.badgeClass}">${r.badge}</span></td>
          <td style="font-size:11px">${r.picks5yr}</td>
          <td style="font-size:11px;color:var(--muted)">${r.notable}</td>
          <td style="font-size:11px;color:var(--muted)">${r.allTime}</td>
        </tr>`;
      }).join('');
      mls.innerHTML = `<div style="overflow-x:auto;margin-bottom:2rem;"><table class="pro-league-table">
        <thead><tr>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Rank</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">School</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Div</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Picks 5yr</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">Notable players</th>
          <th style="font-size:16px;font-weight:700;font-family:'Outfit',sans-serif">All-time pipeline</th>
        </tr></thead>
        <tbody>${mlsRows}</tbody>
      </table></div>`;
    }
  } catch(e) { console.error('renderPipelineTables failed:', e); }
}

// v20: Division toggle for Pro Pipeline
function togglePipelineSection(btnId) {
  const map = {
    'pipeline-toggle-d1':  ['pipeline-d1-container', 'pipeline-d1-header'],
    'pipeline-toggle-d2':  ['pipeline-d2-container', 'pipeline-d2-header'],
    'pipeline-toggle-mls': ['pipeline-mls-container', 'pipeline-mls-header'],
  };
  const targets = map[btnId];
  if (!targets) return;
  const btn = document.getElementById(btnId);
  const isOn = btn.classList.contains('pipeline-toggle-on');
  // Toggle container visibility
  targets.forEach(tid => {
    const el = document.getElementById(tid);
    if (el) el.style.display = isOn ? 'none' : '';
  });
  // Also toggle the section-head above each container
  const containerEl = document.getElementById(targets[0]);
  if (containerEl) {
    let prev = containerEl.previousElementSibling;
    while (prev && !prev.classList.contains('section-head') && !prev.tagName.match(/^P$/i)) prev = prev.previousElementSibling;
    if (prev) prev.style.display = isOn ? 'none' : '';
    // Also hide/show the intro <p>
    let prevP = containerEl.previousElementSibling;
    while (prevP && prevP.tagName !== 'P') prevP = prevP.previousElementSibling;
    if (prevP && prevP.tagName === 'P') prevP.style.display = isOn ? 'none' : '';
  }
  btn.classList.toggle('pipeline-toggle-on', !isOn);
  btn.classList.toggle('pipeline-toggle-off', isOn);
}


// ══════════════════════════════════════════════════
// CONFERENCES DATA & RENDER
// ══════════════════════════════════════════════════


function renderConferencePrestige() {
  try {
    const container = document.getElementById('conf-prestige-container');
    if (!container) return;
    if (!Array.isArray(conferencePrestige) || !conferencePrestige.length) return;

    const sorted = [...conferencePrestige].sort((a, b) => a.rank - b.rank);

    const rows = sorted.map(c => {
      const programsCell = c.programsInGuideWarning
        ? `<span style="color:var(--rose);font-weight:700">⚠ ${c.programsInGuide}</span>`
        : c.programsInGuide;

      const pipelineCell = c.mlsPipelineWarning
        ? `<span style="color:var(--rose)">${c.mlsPipeline}</span>`
        : c.mlsPipeline;

      const relevanceCell = c.relevance;

      return `<tr>
        <td><span class="rk-num ${c.rankClass}">${c.rank}</span>${c.name}</td>
        <td>${c.fullName}</td>
        <td><span class="dbadge ${c.divBadge}">${c.div}</span></td>
        <td>${programsCell}</td>
        <td>${pipelineCell}</td>
        <td>${c.scholarships}</td>
        <td>${relevanceCell}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `<div style="overflow-x:auto;margin-bottom:2.5rem;">
      <table class="ranking-table">
        <thead><tr>
          <th>Rank</th><th>Conference</th><th>Division</th>
          <th>Programs in Guide</th><th>MLS Pipeline (5yr)</th>
          <th>Scholarships</th><th>Relevance for Olivier</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  } catch(e) { console.error('renderConferencePrestige failed:', e); }
}

function renderConferences(){
  const container=document.getElementById('conferences-container');
  const tiers=[
    {key:'Power 5 (D1)',label:'Power 5 Conferences — Elite Division I',cls:'tier-p5',intro:"The 'Big Five' soccer conferences that produce the majority of MLS draft picks. Getting into a Power 5 program requires elite highlights. These programs offer the strongest soccer development but the most competitive roster spots."},
    {key:'High Major (D1)',label:'High-Major Conferences — Very Strong D1',cls:'tier-d1',intro:'Just below Power 5 in profile but highly competitive. AAC and Big West programs are realistic D1 targets for Olivier with strong highlights — and several are in warm coastal cities.'},
    {key:'Ivy League (D1)',label:'Ivy League — Academic Elite, No Athletic Scholarships',cls:'tier-ivy',intro:'Unique financial model: no athletic scholarships, need-based aid only. Princeton is surging. GPA improvement essential.'},
    {key:'Mid-Major (D1)',label:'Mid-Major D1 — Competitive Regional Programs',cls:'tier-d1',intro:'Genuine D1 competition at more accessible scholarship levels. Charleston is the lifestyle pick.'},
    {key:'Division II',label:'Division II Conferences — Best Overall Value',cls:'tier-d2',intro:'Often the best overall balance for international athletes: real scholarships, playing time from year 1, strong academic programs, warm climates in Florida and Texas.'},
    {key:'NAIA',label:'NAIA — Generous Scholarships, Personal Development',cls:'tier-naia',intro:'No scholarship maximum in NAIA — full packages possible. Billy Martin at OCU continues a strong NAIA soccer tradition. Keiser in Fort Lauderdale has clinical simulation labs.'},
    {key:'Division III',label:'Division III — Academic Focus, No Athletic Scholarships',cls:'tier-juco',intro:'No athletic scholarships. Best for athletes where PT/Chiro grad school GPA is the primary goal.'},
    {key:'Junior College',label:'Junior College — 2-Year Transfer Pathway',cls:'tier-juco',intro:'Starting point not a destination. Santa Monica College → UCLA is the proven pipeline.'},
  ];
  let html='';
  tiers.forEach(t=>{
    const cfList=conferences.filter(c=>c.tier===t.key);
    if(!cfList.length)return;
    html+=`<div class="conf-tier"><div class="conf-tier-head" style="background:var(--surface2)"><span class="tier-label ${t.cls}">${t.key}</span><div><div style="font-size:13px;font-weight:700;color:var(--navy)">${t.label}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${t.intro}</div></div></div><div class="conf-cards">`;
    cfList.forEach(c=>{
      const guideChips=c.guideSchools.map(s=>`<span class="conf-school-chip in-guide">★ ${s}</span>`).join('');
      const otherChips=(c.otherSchools||[]).slice(0,6).map(s=>`<span class="conf-school-chip">${s}</span>`).join('');
      html+=`<div class="conf-card">
        <div class="conf-card-head">
          <div><div class="conf-name">${c.name}</div><div class="conf-abbr">${c.abbr} · Founded ${c.founded}</div></div>
          <div class="conf-prestige" style="background:var(--surface3);color:var(--muted);font-size:10px;max-width:120px;text-align:right;line-height:1.3">${c.prestige.split('—')[0].trim()}</div>
        </div>
        <div class="conf-body">
          <div class="conf-stat-row">
            <div class="conf-stat"><span class="csv">${c.soccerTeams}</span><span class="csl">Soccer Teams</span></div>
            <div class="conf-stat"><span class="csv">${c.ncaaTitles}</span><span class="csl">NCAA Titles</span></div>
            <div class="conf-stat"><span class="csv">${c.scholarships.split('Up to')[1]?.trim().split(' ')[0]||c.scholarships.split(' ')[0]}</span><span class="csl">Max Aid</span></div>
          </div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-bottom:5px">Schools In This Guide</div>
          <div class="conf-schools">${guideChips}</div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-bottom:5px;margin-top:8px">Other Notable Programs</div>
          <div class="conf-schools">${otherChips}${c.otherSchools&&c.otherSchools.length>6?`<span class="conf-school-chip">+${c.otherSchools.length-6} more</span>`:''}</div>
          <div style="margin-top:.75rem"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-bottom:4px">Pro Pipeline</div><div class="conf-desc">${c.mlsPipeline}</div></div>
          <div style="margin-top:.75rem" class="conf-desc">${c.desc.slice(0,240)}${c.desc.length>240?'…':''}</div>
          <div class="conf-olivier"><strong>Olivier fit:</strong> ${c.olivierNote.slice(0,200)}${c.olivierNote.length>200?'…':''}</div>
        </div>
      </div>`;
    });
    html+='</div></div>';
  });
  container.innerHTML=html;
}

// ══════════════════════════════════════════════════
// COACHES DATA & RENDER
// ══════════════════════════════════════════════════


function buildCoachCard(c){
  const u=unis.find(x=>x.id===c.schoolId)||{};
  const el=document.createElement('div');
  el.className=`coach-card${c.rank<=5?' top-coach':''}`;
  el.dataset.div=c.div;el.dataset.aus=c.ausConnection;el.dataset.pro=c.mlsPlayers>0||c.ausConnection;
  const strHtml=c.strengths.map(s=>{
    const cls=s.toLowerCase().includes('aus')?'cs-aus':s.toLowerCase().includes('pro')||s.toLowerCase().includes('mls')||s.toLowerCase().includes('pipeline')?'cs-pro':s.toLowerCase().includes('tactic')||s.toLowerCase().includes('system')?'cs-tac':s.toLowerCase().includes('dev')?'cs-dev':'cs-rec';
    return`<span class="cs-tag ${cls}">${s}</span>`;
  }).join('');
  const staffHtml=c.staff.map(s=>`<div class="staff-row"><div><div class="staff-name">${s.name}</div><div class="staff-role">${s.role}</div></div><div class="staff-bg">${s.bg}</div></div>`).join('');
  const rankColors={rk_elite:'background:#fef08a;color:#713f12',rk_strong:'background:var(--sky3);color:var(--sky)',rk_solid:'background:var(--emerald3);color:var(--emerald)'};
  const rkcss=c.rankClass==='rk-elite'?rankColors.rk_elite:c.rankClass==='rk-strong'?rankColors.rk_strong:rankColors.rk_solid;
  el.innerHTML=`
    <div class="coach-card-head">
      <div class="coach-av-lg" style="background:${u.color?u.color[0]:'var(--surface3)'};color:${u.color?u.color[1]:'var(--muted)'}">${c.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div>
      <div style="flex:1">
        <div class="coach-school">${c.name}</div>
        <div class="coach-title-sm">${c.school}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
          <span class="dbadge d-${c.div}">${c.div}</span>
          <span style="font-size:11px;color:var(--hint)">${c.conf}</span>
          ${c.ausConnection?'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--amber3);color:var(--amber)">🇦🇺 Aus Link</span>':''}
          ${c.licence?`<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;background:var(--indigo3,#e0e7ff);color:var(--indigo,#4338ca)">${c.licence}</span>`:''}
        </div>
      </div>
      <div class="coach-rank-badge" style="${rkcss}">Rank #${c.rank}</div>
    </div>
    <div class="coach-card-body">
      <div class="coach-stats-row">
        <div class="cstat"><span class="cv">${c.yearsHC}</span><span class="cl">Yrs HC</span></div>
        <div class="cstat"><span class="cv">${c.mlsPlayers}</span><span class="cl">MLS Picks</span></div>
        <div class="cstat"><span class="cv" style="color:${c.overallScore>=90?'var(--emerald)':c.overallScore>=80?'var(--amber)':'var(--rose)'}">${c.overallScore}</span><span class="cl">Overall</span></div>
        <div class="cstat"><span class="cv" style="color:var(--emerald)">${c.ptPathScore}</span><span class="cl">PT Path</span></div>
      </div>
      <div class="coach-bio">${c.bio.slice(0,280)}${c.bio.length>280?'…':''}</div>
      <div class="coach-strengths">${strHtml}</div>
      <div class="staff-section"><h5>Known Staff & Background</h5>${staffHtml}</div>
      <div class="coach-contact-strip">
        <a href="mailto:${c.contact.email}" class="coach-cta coach-cta-email" title="Send email">✉ ${c.contact.email}</a>
        ${c.contact.phone?`<a href="tel:${c.contact.phone}" class="coach-cta coach-cta-phone" title="Call">📞 ${c.contact.phone}</a>`:''}

      </div>
    </div>`;
  return el;
}

function renderCoachCards(){
  const container=document.getElementById('coach-cards-container');
  container.innerHTML='';
  [...coachData].sort((a,b)=>a.rank-b.rank).forEach(c=>{container.appendChild(buildCoachCard(c));});
}

function renderCoachTable(){
  try{
    const tb=document.getElementById('coach-rank-tbody');
    if(!tb || typeof coachData==='undefined') return;
    tb.innerHTML=[...coachData].sort((a,b)=>(a.rank||999)-(b.rank||999)).map(c=>{
      const rc=c.rankClass||'rk-solid';
      const years=(c.yearsHC&&c.yearsHC>0)?c.yearsHC+' yrs':'New 2026';
      const mls=(typeof c.mlsPlayers==='number')?c.mlsPlayers+' MLS':'—';
      const strengths=Array.isArray(c.strengths)?c.strengths.join(' · '):'';
      const divCell=`<span class="dbadge d-${c.div}">${c.div}</span> ${c.conf||''}`;
      return `<tr><td><span class="rk-num ${rc}">${c.rank}</span></td>`+
        `<td><strong>${c.name}</strong></td>`+
        `<td>${c.school}</td>`+
        `<td>${divCell}</td>`+
        `<td>${years}</td>`+
        `<td>${c.record||'—'}</td>`+
        `<td>${mls}</td>`+
        `<td>${c.licence||'—'}</td>`+
        `<td>${strengths||'—'}</td></tr>`;
    }).join('');
  }catch(e){ console.error('renderCoachTable failed:',e); }
}

// ── Coaches animated pill tab ─────────────────────────────────────────────────
function initCoachTabs() {
  const activeBtn = document.querySelector('.coach-tab-btn.active');
  if (!activeBtn || activeBtn.offsetWidth === 0) return;
  const pill = document.getElementById('coach-tab-pill');
  if (!pill) return;
  pill.style.width     = activeBtn.offsetWidth + 'px';
  pill.style.transform = 'translateX(' + (activeBtn.offsetLeft - 4) + 'px)';
}

function switchCoachTab(tabName, btn) {
  const track = document.getElementById('coach-tab-track');
  const pill  = document.getElementById('coach-tab-pill');
  if (!track || !pill) return;

  // Slide pill to button — offsetLeft is relative to track, no border/scroll issues
  pill.style.transform = 'translateX(' + (btn.offsetLeft - 4) + 'px)';
  pill.style.width = btn.offsetWidth + 'px';

  // Toggle active class
  track.querySelectorAll('.coach-tab-btn').forEach(b =>
    b.classList.toggle('active', b === btn)
  );

  // Show/hide tab panels
  ['rankings', 'profiles', 'outreach'].forEach(t => {
    const panel = document.getElementById('coach-tab-' + t);
    if (panel) panel.style.display = t === tabName ? '' : 'none';
  });
}

function filterCoaches(type,btn){
  document.querySelectorAll('.coaches-filters .fbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const cards=document.querySelectorAll('.coach-card');
  cards.forEach(c=>{
    if(type==='all')c.style.display='';
    else if(type==='aus')c.style.display=c.dataset.aus==='true'?'':'none';
    else if(type==='pro')c.style.display=c.dataset.pro==='true'?'':'none';
    else c.style.display=c.dataset.div===type?'':'none';
  });
}

// ── Outreach Tracker ──────────────────────────────────────────────────────────
const OUTREACH_STATUSES = ['Not contacted','Email sent','Call scheduled','Offer pending'];
const OUTREACH_STATUS_COLOR = {
  'Not contacted': { bg:'var(--surface2)', text:'var(--muted)' },
  'Email sent':    { bg:'var(--sky3)',     text:'var(--sky)' },
  'Call scheduled':{ bg:'var(--indigo3)', text:'var(--indigo)' },
  'Offer pending': { bg:'var(--emerald3)','text':'var(--emerald)' },
};
function outreachKey(){ return 'olivier_outreach'; }
function loadOutreachData(){ try{ return JSON.parse(localStorage.getItem(outreachKey())||'{}'); }catch(_){ return {}; } }
function saveOutreachField(schoolId, field, value){
  const data = loadOutreachData();
  if(!data[schoolId]) data[schoolId] = {};
  data[schoolId][field] = value;
  localStorage.setItem(outreachKey(), JSON.stringify(data));
}

function renderOutreachTracker(){
  try {
    const wrap = document.getElementById('outreach-tracker-wrap');
    if(!wrap) return;

    const outreachList = (athleteConfig.outreach || []);
    if(!outreachList.length){ wrap.innerHTML=''; return; }

    const saved = loadOutreachData();
    let activeFilter = 'all';

    function buildRows(filter){
      return outreachList.map(entry => {
        const saved_entry = saved[entry.schoolId] || {};
        const status   = saved_entry.status   || entry.status   || 'Not contacted';
        const lastDate = saved_entry.lastContact || entry.lastContact || '';
        const note     = saved_entry.note     || entry.note     || '';

        if(filter === 'active' && !['Email sent','Call scheduled'].includes(status)) return '';
        if(filter === 'offer'  && status !== 'Offer pending') return '';

        const school = unis.find(u => u.id === entry.schoolId);
        const name   = school ? school.name : entry.schoolId;
        const div    = school ? school.div  : '';
        const conf   = school ? school.conf : '';
        const sc     = OUTREACH_STATUS_COLOR[status] || OUTREACH_STATUS_COLOR['Not contacted'];

        const opts = OUTREACH_STATUSES.map(s =>
          `<option value="${s}"${s===status?' selected':''}>${s}</option>`
        ).join('');

        return `<tr class="or-row" data-id="${entry.schoolId}">
          <td class="or-school"><strong>${name}</strong><br><span style="font-size:9px;color:var(--muted)">${div} · ${conf}</span></td>
          <td><select class="or-status-sel" style="background:${sc.bg};color:${sc.text}"
            onchange="saveOutreachField('${entry.schoolId}','status',this.value);renderOutreachTracker()">${opts}</select></td>
          <td><input type="date" class="or-date-inp" value="${lastDate}"
            onchange="saveOutreachField('${entry.schoolId}','lastContact',this.value)"></td>
          <td><input type="text" class="or-note-inp" value="${note.replace(/"/g,'&quot;')}" placeholder="Add note…"
            onchange="saveOutreachField('${entry.schoolId}','note',this.value)"></td>
        </tr>`;
      }).join('');
    }

    function render(){
      const rows = buildRows(activeFilter);
      wrap.innerHTML = `
        <div class="section-head"><h2>Coach Outreach Tracker</h2></div>
        <div style="display:flex;gap:.5rem;margin-bottom:.85rem;flex-wrap:wrap">
          <button class="or-filter-btn${activeFilter==='all'?' active':''}" onclick="(function(){window._orFilter='all';renderOutreachTracker()})()">All</button>
          <button class="or-filter-btn${activeFilter==='active'?' active':''}" onclick="(function(){window._orFilter='active';renderOutreachTracker()})()">Active</button>
          <button class="or-filter-btn${activeFilter==='offer'?' active':''}" onclick="(function(){window._orFilter='offer';renderOutreachTracker()})()">Offer pending</button>
        </div>
        <div style="overflow-x:auto;margin-bottom:2rem">
          <table class="or-table">
            <thead><tr><th>School</th><th>Status</th><th>Last Contact</th><th>Note</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--hint);padding:1rem">No entries match this filter.</td></tr>'}</tbody>
          </table>
        </div>
        <style>
          .or-table{width:100%;border-collapse:collapse;font-size:12px;}
          .or-table th{text-align:left;padding:5px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);border-bottom:2px solid var(--border);}
          .or-table td{padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:middle;}
          .or-school{min-width:120px;}
          .or-status-sel{border:1px solid var(--border);border-radius:6px;padding:3px 20px 3px 6px;font-size:10px;font-weight:700;font-family:'Outfit',sans-serif;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 5px center;}
          .or-date-inp,.or-note-inp{border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:11px;font-family:'Outfit',sans-serif;background:var(--bg);color:var(--navy);outline:none;width:100%;}
          .or-note-inp{min-width:160px;}
          .or-filter-btn{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:4px 12px;font-size:11px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;color:var(--muted);}
          .or-filter-btn.active{background:var(--indigo);border-color:var(--indigo);color:#fff;}
        </style>`;
      // Restore active filter after re-render
      if(window._orFilter) activeFilter = window._orFilter;
    }

    // Sync active filter from window state if set
    if(window._orFilter) activeFilter = window._orFilter;
    render();
  } catch(e){ console.error('renderOutreachTracker failed:',e); }
}

// ══════════════════════════════════════════════════
// FINANCIAL MODEL
// ══════════════════════════════════════════════════
let finCurrentSchool = null;

function fmt(n){return '$'+Math.round(n).toLocaleString('en-US');}
function fmtAUD(n,fx){return 'A$'+Math.round(n*fx).toLocaleString('en-US');}
function costDisplay(u){
  if(!u.fin||u.fin.costNum===undefined) return u.cost||'—';
  if(u.fin.costNum===0) return 'Fully funded';
  return fmt(u.fin.costNum)+'/yr';
}

function renderFinSchoolSelector(){
  const container = document.getElementById('fin-school-selector');
  container.innerHTML = '';
  [...unis].sort((a,b)=>a.name.localeCompare(b.name)).forEach(u=>{
    if(!u.fin || u.profileDepth === 'listed') return;
    const btn = document.createElement('button');
    btn.className = 'fin-school-btn' + (finCurrentSchool&&finCurrentSchool.id===u.id?' selected':'');
    btn.innerHTML = `<div class="fsb-name">${u.name}</div><div class="fsb-div"><span class="dbadge d-${u.div}" style="font-size:9px">${u.div}</span> ${fmt(u.fin.costNum)}/yr full cost</div>`;
    btn.onclick = ()=>selectFinSchool(u.id, btn);
    container.appendChild(btn);
  });
}

function selectFinSchool(id, btnEl){
  finCurrentSchool = unis.find(u=>u.id===id);
  document.querySelectorAll('.fin-school-btn').forEach(b=>b.classList.remove('selected'));
  if(btnEl) btnEl.classList.add('selected');

  const finWrapper = document.getElementById('fin-model-wrapper');
  // '' (no inline override) means "shown", not "unset" — only 'none' means hidden.
  // The old `!display || ...` check treated '' as falsy too, so isFirstSelection
  // was always true after the very first switch, resetting sliders every time.
  const isFirstSelection = finWrapper.style.display === 'none';
  finWrapper.style.display='';

  document.getElementById('fin-school-title').textContent = `${finCurrentSchool.full} — Financial Model`;
  const u = finCurrentSchool;
  const slAth = document.getElementById('sl-athletic');
  const slAcad = document.getElementById('sl-academic');

  if(u.fin.aidType === 'need-only' || u.fin.maxAthletic === 0){
    slAth.max = 0; slAth.value = 0; slAth.disabled = true;
    slAth.style.opacity = '0.3';
  } else {
    slAth.max = 100;
    slAth.value = isFirstSelection ? 0 : Math.min(parseInt(slAth.value)||0, 100);
    slAth.disabled = false;
    slAth.style.opacity = '1';
  }
  slAcad.value = isFirstSelection ? 0 : Math.min(parseInt(slAcad.value)||0, 30000);

  document.getElementById('fin-aid-note').innerHTML = `<strong>Aid type at ${u.name}:</strong> ${u.fin.aidType.toUpperCase()} — ${u.fin.internationalNote}`;
  updateFinModel();
}

function applyScenario(type, btn){
  document.querySelectorAll('.sc-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const u = finCurrentSchool;
  if(!u) return;
  const slAth = document.getElementById('sl-athletic');
  const slAcad = document.getElementById('sl-academic');
  const athMax = parseInt(slAth.max) || 0;
  // Scenarios: ath and acad are now percentages out of 50 each
  const scenarios = {
    none:    {ath:0,   acad:0},
    ath25:   {ath:25,  acad:0},
    ath50:   {ath:50,  acad:0},
    full:    {ath:100, acad:0},
    partial: {ath:35,  acad:10000},
  };
  const s = scenarios[type] || scenarios.full;
  slAth.value = Math.min(s.ath, athMax);
  slAcad.value = s.acad;
  updateFinModel();
}

function updateFinModel(){
  const u = finCurrentSchool;
  if(!u || !u.fin) return;
  const f = u.fin;
  const athPct   = parseInt(document.getElementById('sl-athletic').value) / 100; // 0–1.0
  const acadSchol = parseInt(document.getElementById('sl-academic').value) || 0;  // fixed dollars
  const fx = parseFloat(document.getElementById('sl-fx').value);

  const totalCOA  = f.costNum;
  const athSchol  = Math.round(totalCOA * athPct);
  const totalAid  = athSchol + acadSchol;
  const combinedPct = totalCOA > 0 ? totalAid / totalCOA : 0;

  // Update labels
  document.getElementById('val-athletic').textContent = Math.round(athPct*100)+'%';
  document.getElementById('val-academic').textContent = '$'+acadSchol.toLocaleString();
  document.getElementById('val-fx').textContent       = fx.toFixed(2);
  const netCOA    = Math.max(0, totalCOA - totalAid);

  // Update combined aid display
  const combinedEl  = document.getElementById('combined-aid-pct');
  const combinedUSD = document.getElementById('combined-aid-usd');
  if(combinedEl){
    combinedEl.textContent = Math.round(combinedPct*100)+'%';
    combinedEl.style.color = combinedPct>=0.9?'var(--emerald)':combinedPct>=0.5?'var(--indigo)':'var(--amber)';
    combinedUSD.textContent = 'saving '+fmt(totalAid)+'/yr';
  }

  const exFlights  = parseFloat(document.getElementById('ex-flights').value)||0;
  const exPersonal = parseFloat(document.getElementById('ex-personal').value)||0;
  const exBooks    = parseFloat(document.getElementById('ex-books').value)||0;
  const exHealth   = parseFloat(document.getElementById('ex-health').value)||0;
  const exMobile   = parseFloat(document.getElementById('ex-mobile').value)||0;
  const totalExtras = exFlights+exPersonal+exBooks+exHealth+exMobile;

  const totalAnnual = netCOA + totalExtras;
  const isJuco      = u.div === 'JUCO';
  const programYrs  = isJuco ? 2 : 4;
  const total4yr    = totalAnnual * programYrs;
  const savedTotal  = totalAid   * programYrs;
  const netColor    = netCOA===0?'var(--emerald)':netCOA<15000?'var(--amber)':'var(--rose)';

  // ── Summary ──
  let html = `<div style="margin-bottom:1.25rem">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--hint);margin-bottom:4px">Annual Out-of-Pocket (USD)</div>
    <div class="fin-summary-num" style="color:${netColor}">${fmt(totalAnnual)}</div>
    <div style="font-size:13px;color:var(--muted);margin-top:4px">= <strong style="color:${netColor}">${fmtAUD(totalAnnual,fx)}</strong> AUD / year</div>
  </div>`;

  // ── Breakdown ──
  html += `<div class="fin-breakdown">
    <div class="fin-row expense"><span class="fr-label">📋 Tuition</span><span class="fr-val">${fmt(f.tuition)}</span></div>
    <div class="fin-row expense"><span class="fr-label">🏠 Room & Board</span><span class="fr-val">${fmt(f.roomBoard)}</span></div>
    <div class="fin-row expense"><span class="fr-label">📑 Fees</span><span class="fr-val">${fmt(f.fees)}</span></div>
    <div class="fin-row expense" style="border-top:2px solid var(--border2);font-weight:700"><span class="fr-label">Total Cost of Attendance</span><span class="fr-val">${fmt(totalCOA)}</span></div>
    ${athPct>0?`<div class="fin-row income"><span class="fr-label">🏆 Athletic Scholarship (${Math.round(athPct*100)}% of cost)</span><span class="fr-val">−${fmt(athSchol)}</span></div>`:''}
    ${acadSchol>0?`<div class="fin-row income"><span class="fr-label">🎓 Institutional / Academic Aid</span><span class="fr-val">−${fmt(acadSchol)}</span></div>`:''}
    <div class="fin-row ${netCOA===0?'net-positive':netCOA<20000?'net-neutral':'net-negative'}">
      <span class="fr-label">Net University Cost (${100-Math.round(combinedPct*100)}% remaining)</span><span class="fr-val">${fmt(netCOA)}</span>
    </div>
    ${totalExtras>0?`
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);padding:8px 0 4px">Living & Personal Costs</div>
    ${exFlights>0?`<div class="fin-row expense"><span class="fr-label">✈️ Flights home (2×/yr)</span><span class="fr-val">${fmt(exFlights)}</span></div>`:''}
    ${exPersonal>0?`<div class="fin-row expense"><span class="fr-label">💳 Personal spending</span><span class="fr-val">${fmt(exPersonal)}</span></div>`:''}
    ${exBooks>0?`<div class="fin-row expense"><span class="fr-label">📚 Books & supplies</span><span class="fr-val">${fmt(exBooks)}</span></div>`:''}
    ${exHealth>0?`<div class="fin-row expense"><span class="fr-label">🏥 Health insurance</span><span class="fr-val">${fmt(exHealth)}</span></div>`:''}
    ${exMobile>0?`<div class="fin-row expense"><span class="fr-label">📱 Phone / mobile</span><span class="fr-val">${fmt(exMobile)}</span></div>`:''}
    <div class="fin-row ${totalAnnual===0?'net-positive':totalAnnual<20000?'net-neutral':'net-negative'}" style="margin-top:4px">
      <span class="fr-label">💸 TOTAL ANNUAL COST</span><span class="fr-val">${fmt(totalAnnual)}</span>
    </div>`:''}
  </div>`;

  document.getElementById('fin-breakdown-content').innerHTML = html;

  // ── Program total block ──
  document.getElementById('fin-4yr-block').innerHTML = `
    <div class="f4-label">${programYrs}-Year Total Investment${isJuco ? ' — JUCO Transfer Program' : ''}</div>
    <div class="f4-val">${fmt(total4yr)} USD</div>
    <div class="f4-sub">${fmtAUD(total4yr,fx)} AUD total · You save ${fmt(savedTotal)} over ${programYrs} years in scholarships</div>`;

  // ── Tips ──
  let tips = '';
  if(u.fin.aidType==='need-only'){
    tips = `<strong>Need-based only:</strong> ${u.name} has no athletic scholarships — the athletic slider is disabled. Academic aid here represents need-based grants based on family income documentation.`;
  } else if(combinedPct < 1.0){
    const gap = Math.round((1.0 - combinedPct) * 100);
    tips = `<strong>${gap}% gap remaining:</strong> At current settings ${fmt(totalCOA-totalAid)}/yr is unfunded. A full athletic ride = 100% athletic slider. Institutional aid (the dollar slider) is a bonus the coach can negotiate on top.`;
  } else {
    tips = `<strong>🎉 Full ride modelled!</strong> At these settings the total scholarship covers 100% of the university cost of attendance. Living costs (${fmt(totalExtras)}/yr) are the remaining family responsibility over ${programYrs} years.`;
  }
  document.getElementById('fin-tips').innerHTML = tips;
}

function renderFinComparisonBars(){
  const container = document.getElementById('fin-comparison-bars');
  const fx = currentFx;
  const athPct = 0.5;
  const extras = 7500;

  // Full-profile schools only — listed schools don't have full fin data
  const data = unis
    .filter(u => u.fin && u.profileDepth !== 'listed' && u.fin.costNum > 0)
    .map(u => ({
      u,
      net: Math.max(0, u.fin.costNum * (1 - athPct)) + extras,
      cost: u.fin.costNum
    }))
    .sort((a,b) => a.net - b.net);

  if(!data.length){ container.innerHTML=''; return; }

  const maxNet = data[data.length-1].net;

  // Conference average lines
  const confAvgs = {};
  ['acc','big-ten','big-east','aac','big-west','caa','other'].forEach(ck=>{
    const inConf = data.filter(d=>d.u.confKey===ck);
    if(inConf.length) confAvgs[ck] = Math.round(inConf.reduce((s,d)=>s+d.net,0)/inConf.length);
  });

  // Cost brackets
  const brackets = [
    { label:'Under $30k', min:0,     max:29999,  color:'var(--emerald)', bg:'var(--emerald3)' },
    { label:'$30–50k',    min:30000, max:49999,  color:'var(--sky)',     bg:'var(--sky3)'     },
    { label:'$50–70k',    min:50000, max:69999,  color:'var(--amber)',   bg:'var(--amber3)'   },
    { label:'$70k+',      min:70000, max:Infinity,color:'var(--rose)',   bg:'var(--rose3)'    },
  ];

  let html = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.25rem">';

  brackets.forEach(b=>{
    const inBracket = data.filter(d=>d.cost>=b.min&&d.cost<=b.max);
    if(!inBracket.length) return;

    // Conference average for this bracket's schools
    const bracketConfKeys=[...new Set(inBracket.map(d=>d.u.confKey))];
    const confAvgLine = bracketConfKeys.length>1
      ? Math.round(inBracket.reduce((s,d)=>s+d.net,0)/inBracket.length)
      : null;

    html+=`<div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem">
        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;background:${b.bg};color:${b.color};padding:2px 10px;border-radius:4px">${b.label}</span>
        <span style="font-size:11px;color:var(--hint)">${inBracket.length} school${inBracket.length!==1?'s':''}</span>
        ${confAvgLine?`<span style="font-size:10px;color:var(--muted);margin-left:auto">Bracket avg: <strong style="color:${b.color}">${fmt(confAvgLine)}</strong>/yr net</span>`:''}
      </div>`;

    inBracket.forEach(({u,net})=>{
      const pct = Math.round((net/maxNet)*100);
      html+=`<div class="fcbar-row" onclick="selectSchoolFromBar('${u.id}')" style="cursor:pointer">
        <div class="fcbar-name" title="${u.full}">${u.name}</div>
        <span class="fcbar-div"><span class="dbadge d-${u.div}" style="font-size:9px">${u.div}</span></span>
        <div class="fcbar-track" style="position:relative">
          <div class="fcbar-fill" style="width:${pct}%;background:${b.color};opacity:.85;min-width:${net>0?'40px':'0'}">${net>0?fmt(net):''}</div>
          ${net===0?'<span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700;color:var(--emerald)">FULL RIDE</span>':''}
          ${confAvgLine?`<div style="position:absolute;top:0;bottom:0;left:${Math.round((confAvgLine/maxNet)*100)}%;width:1.5px;background:var(--navy);opacity:.25;pointer-events:none"></div>`:''}
        </div>
        <div class="fcbar-amt">${fmtAUD(net,fx)}<br><span style="font-size:9px;color:var(--hint)">AUD/yr</span></div>
      </div>`;
    });
    html+='</div>';
  });

  // Conference averages summary
  html+=`<div style="background:var(--surface2);border-radius:9px;padding:.75rem 1rem;margin-top:.5rem">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-bottom:.5rem">Conference Averages (net cost at 50% athletic scholarship)</div>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem">`;
  Object.entries(confAvgs).forEach(([ck,avg])=>{
    const label={acc:'ACC',['big-ten']:'Big Ten',['big-east']:'Big East',aac:'AAC',['big-west']:'Big West',caa:'CAA',other:'D2/NAIA'}[ck]||ck;
    html+=`<span style="font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px"><strong>${label}</strong> ${fmt(avg)}/yr</span>`;
  });
  html+=`</div></div>`;

  html += '<div style="font-size:11px;color:var(--hint);margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">Assumes 50% athletic scholarship + $7,500 USD living costs. Full-profile schools only. Sorted by cost bracket, lowest first. Click any bar to model in detail above.</div></div>';
  container.innerHTML = html;
}

function selectSchoolFromBar(id){
  const u = unis.find(x=>x.id===id);
  if(!u) return;
  if(u.profileDepth==='listed'){
    showToast(u.name+' — full financial data not yet available','info');
    return;
  }
  // Switch to finance tab if not already there
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-finance').classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>{if(b.textContent.includes('Financial'))b.classList.add('active');});
  // Select the school
  const btn = [...document.querySelectorAll('.fin-school-btn')].find(b=>b.onclick.toString().includes(`'${id}'`));
  selectFinSchool(id, btn);
  document.getElementById('fin-model-wrapper').scrollIntoView({behavior:'smooth'});
}

// ═══ v15: Minutes Outlook tab ═══════════════════════════════════════════════
// ── Minutes Outlook scoring ─────────────────────────────────────────────────
// Two modes:
//   'roster'   — pure trajectory weighted average, no division adjustment
//   'adjusted' — trajectory × division quality factor for Olivier specifically
//
// Division factor (adjusted mode):
//   D1:   1.0  — Olivier is a competitive recruit, trajectory as-is
//   D2:   1.15 — Olivier is a strong recruit, likely to play sooner than average
//   NAIA: 1.25 — Olivier would be one of the better players on the roster
//   D3:   1.1  — Overqualified for minutes, not ideal for development
//   IVY:  0.9  — Academic culture limits playing time flexibility
//   JUCO: 1.2  — Olivier is above average at JUCO level; full roster reset means he competes vs 1 recruiting class only

const MO_DIV_FACTOR = {D1:1.0, D2:1.15, NAIA:1.25, IVY:0.9, D3:1.1, JUCO:1.2};

function calcMinutesScore(u, mode){
  const traj = (u.minutesOutlook||{}).trajectory || [];
  if(traj.length === 0) return 0;
  const pcts = traj.map(t=>t.pct);
  // Rank on Yr1+Yr2 only — near-term roster data, apples-to-apples across JUCO and 4yr programs.
  // Yr3/Yr4 trajectory data is still displayed on cards but not used for ranking.
  const raw = pcts.length >= 2 ? pcts[0]*0.60 + pcts[1]*0.40 : pcts[0];
  const factor = mode==='adjusted' ? (MO_DIV_FACTOR[u.div]||1.0) : 1.0;
  return Math.min(95, Math.round(raw * factor));
}

let moMode = 'roster';   // ranking mode: 'roster' | 'adjusted'
let moTier = 'all';      // score tier filter: 'all' | 'high' | 'mid' | 'low'
let moExpanded = {};     // card open/closed state keyed by school id

function moTierOf(score){ return score>=71?'high':score>=31?'mid':'low'; }

function renderMinutesOutlook(){
  const container = document.getElementById('page-minutes');
  if(!container) return;
  buildMinutesHtml();
}

function setMoMode(mode){
  moMode = mode;
  ['roster','adjusted'].forEach(m=>{
    const btn = document.getElementById('mo-toggle-'+m);
    if(btn) btn.className = 'mo-toggle-btn'+(m===mode?' mo-toggle-active':'');
  });
  buildMinutesHtml(true);
}

function setMoTier(tier){
  moTier = tier;
  ['all','high','mid','low'].forEach(t=>{
    const btn = document.getElementById('mo-tier-'+t);
    if(btn) btn.className = 'mo-tier-btn mo-tier-'+t+(t===tier?' mo-tier-active':'');
  });
  buildMinutesHtml(true);
}

function moShowAll(){
  const available = [...unis].filter(u=>(u.minutesOutlook||{}).available && u.profileDepth==='full');
  available.forEach(u=>moExpanded[u.id]=true);
  buildMinutesHtml(true);
}

function moHideAll(){
  const available = [...unis].filter(u=>(u.minutesOutlook||{}).available && u.profileDepth==='full');
  available.forEach(u=>moExpanded[u.id]=false);
  buildMinutesHtml(true);
}

function toggleMoCard(id){
  moExpanded[id] = !moExpanded[id];
  buildMinutesHtml(true);
}

function buildMinutesHtml(cardsOnly){
  const container = document.getElementById('page-minutes');
  if(!container) return;

  const available = [...unis].filter(u => (u.minutesOutlook||{}).available && u.profileDepth==='full');
  const unavailable = [...unis].filter(u => !(u.minutesOutlook||{}).available && u.profileDepth==='full');

  // Default all cards to expanded on first render
  available.forEach(u=>{ if(moExpanded[u.id]===undefined) moExpanded[u.id]=true; });

  // Sort all available by score for global rank
  const ranked = [...available].sort((a,b)=>{
    const sa = calcMinutesScore(a, moMode);
    const sb = calcMinutesScore(b, moMode);
    if(sb!==sa) return sb-sa;
    return (b.fitOlivier||0)-(a.fitOlivier||0);
  });

  // Tier counts
  const cntHigh = ranked.filter(u=>moTierOf(calcMinutesScore(u,moMode))==='high').length;
  const cntMid  = ranked.filter(u=>moTierOf(calcMinutesScore(u,moMode))==='mid').length;
  const cntLow  = ranked.filter(u=>moTierOf(calcMinutesScore(u,moMode))==='low').length;

  // Apply tier filter (preserves global rank order)
  const filtered = moTier==='all' ? ranked : ranked.filter(u=>moTierOf(calcMinutesScore(u,moMode))===moTier);

  if(!cardsOnly){
    const introHtml =
      '<div class="mo-intro">'+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.75rem;margin-bottom:.75rem">'+
          '<h2 style="margin:0">Minutes Outlook · 2027 Entry Analysis</h2>'+
          '<div style="display:flex;gap:.35rem;align-items:center;flex-shrink:0">'+
            '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-right:4px">Ranking mode:</span>'+
            '<button id="mo-toggle-roster"   class="mo-toggle-btn mo-toggle-active" onclick="setMoMode(\'roster\')">📋 Roster-Based</button>'+
            '<button id="mo-toggle-adjusted" class="mo-toggle-btn" onclick="setMoMode(\'adjusted\')">⚽ Olivier-Adjusted</button>'+
          '</div>'+
        '</div>'+
        '<div id="mo-mode-desc" class="mo-mode-desc">'+
          '<strong>Roster-Based:</strong> Ranks purely on squad numbers and trajectory — how open the roster is regardless of who Olivier is. Same methodology for every player.'+
        '</div>'+
        '<p style="color:var(--muted);font-size:13px;line-height:1.6;margin:.6rem 0 .5rem">'+
          'Olivier enters US college soccer in <strong>August 2027</strong>. Trajectories project realistic playing time across all 4 years based on 2025 rosters and how players age out.'+
        '</p>'+
        '<div class="mo-key">'+
          '<div class="mo-key-item"><strong>2025 Sr/Gr</strong> → already gone, irrelevant</div>'+
          '<div class="mo-key-item"><strong>2025 Jr</strong> → graduate after 2026 → ✅ <em>cleared before he arrives</em></div>'+
          '<div class="mo-key-item"><strong>2025 So</strong> → become 2027 Sr → 1-yr overlap with Olivier</div>'+
          '<div class="mo-key-item"><strong>2025 Fr</strong> → become 2027 Jr → ❌ <em>primary 2-year competition</em></div>'+
          '<div class="mo-key-item"><strong>+ Unknown 2026 class</strong> (coach call needed)</div>'+
        '</div>'+
      '</div>'+
      '<div id="mo-toolbar-wrap"></div>'+
      '<div id="mo-cards-wrap"></div>'+
      '<div id="mo-unavail-wrap"></div>'+
      '<div class="mo-footer">'+
        '<p style="color:var(--muted);font-size:12px;line-height:1.6;margin-top:1.5rem">'+
          '<strong>Methodology caveat:</strong> Outlook assumes typical recruiting class sizes (3–5 MFs/yr). '+
          'The 2026 freshman class is being recruited now and is unknown. '+
          'Refine Yr1–2 projections by asking each coach: <em>"How many central midfielders are in your 2026 and 2027 classes, and what is your projected 2027 starting XI?"</em>'+
        '</p>'+
      '</div>';

    container.innerHTML = introHtml;

    // Build unavailable section once
    if(unavailable.length){
      let unavailHtml = '<div class="mo-unavail-section">'+
        '<div class="mo-unavail-heading">⚠ No Roster Data — '+unavailable.length+' schools</div>'+
        '<div class="mo-unavail-grid">';
      unavailable.forEach(u=>{
        const mo = u.minutesOutlook || {};
        unavailHtml += '<div class="mo-unavail-card">'+
          '<span class="dbadge d-'+u.div+'">'+u.div+'</span>'+
          '<span class="mo-school-name" style="font-size:12px">'+u.full+'</span>'+
          '<span style="font-size:11px;color:var(--muted);flex:1;text-align:right">'+(mo.reason||'Not analysed')+'</span>'+
        '</div>';
      });
      unavailHtml += '</div></div>';
      const unavailWrap = document.getElementById('mo-unavail-wrap');
      if(unavailWrap) unavailWrap.innerHTML = unavailHtml;
    }
  }

  // Update mode description
  const modeDesc = document.getElementById('mo-mode-desc');
  if(modeDesc){
    if(moMode==='roster'){
      modeDesc.innerHTML = '<strong>📋 Roster-Based:</strong> Ranks purely on squad numbers and trajectory — how open the roster is, regardless of who Olivier is. Same methodology applied to any player.';
    } else {
      modeDesc.innerHTML = '<strong>⚽ Olivier-Adjusted:</strong> Applies a division quality factor based on Olivier\'s ability level (8/10 box-to-box, ATAR 70). <span style="color:var(--emerald)">D2 ×1.15</span> and <span style="color:var(--emerald)">NAIA ×1.25</span> — at those levels he would likely play sooner than an average recruit. <span style="color:var(--sky)">D1 ×1.0</span> — competitive but not guaranteed. This shows his realistic best-case minutes picture.';
    }
  }

  // Rebuild toolbar (tier filters + show/hide)
  const toolbarWrap = document.getElementById('mo-toolbar-wrap');
  if(toolbarWrap){
    toolbarWrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem">'+
        '<div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap">'+
          '<span style="font-size:11px;font-weight:700;color:var(--hint);margin-right:2px">Score:</span>'+
          '<button id="mo-tier-all"  class="mo-tier-btn mo-tier-all'+(moTier==='all'?' mo-tier-active':'')+'" onclick="setMoTier(\'all\')">All <span class="mo-tier-cnt">'+ranked.length+'</span></button>'+
          '<button id="mo-tier-high" class="mo-tier-btn mo-tier-high'+(moTier==='high'?' mo-tier-active':'')+'" onclick="setMoTier(\'high\')">71–100 <span class="mo-tier-cnt">'+cntHigh+'</span></button>'+
          '<button id="mo-tier-mid"  class="mo-tier-btn mo-tier-mid'+(moTier==='mid'?' mo-tier-active':'')+'" onclick="setMoTier(\'mid\')">31–70 <span class="mo-tier-cnt">'+cntMid+'</span></button>'+
          '<button id="mo-tier-low"  class="mo-tier-btn mo-tier-low'+(moTier==='low'?' mo-tier-active':'')+'" onclick="setMoTier(\'low\')">Under 30 <span class="mo-tier-cnt">'+cntLow+'</span></button>'+
        '</div>'+
        '<div style="display:flex;gap:.35rem">'+
          '<button class="mo-showhide-btn" onclick="moShowAll()">Show all</button>'+
          '<button class="mo-showhide-btn" onclick="moHideAll()">Hide all</button>'+
        '</div>'+
      '</div>';
  }

  // Build cards
  let cardsHtml = '<div class="mo-cards-grid">';

  if(!filtered.length){
    cardsHtml += '<p style="color:var(--muted);font-size:13px;padding:.5rem 0">No schools in this score range.</p>';
  }

  filtered.forEach((u, filteredIdx)=>{
    const globalIdx = ranked.indexOf(u);
    const mo = u.minutesOutlook || {};
    const traj = mo.trajectory || [];
    const score = calcMinutesScore(u, moMode);
    const rosterScore = calcMinutesScore(u, 'roster');
    const adjScore = calcMinutesScore(u, 'adjusted');
    const scoreColor = score>=70?'var(--emerald)':score>=50?'var(--amber)':'var(--rose)';
    const riskColor = mo.recruit_risk==='High'?'var(--amber)':mo.recruit_risk==='Medium-High'?'var(--amber)':mo.recruit_risk==='Medium'?'var(--sky)':'var(--emerald)';
    const riskLabel = (mo.recruit_risk==='High'||mo.recruit_risk==='Medium-High')?'High Demand':mo.recruit_risk==='Medium'?'Moderate':'Open';
    const divFactor = MO_DIV_FACTOR[u.div]||1.0;
    const showAdj = moMode==='adjusted' && divFactor!==1.0;
    const isOpen = moExpanded[u.id] !== false;
    const rankNum = globalIdx+1;

    cardsHtml +=
      '<div class="mo-card'+(globalIdx<3?' mo-top':'')+'">'+
        '<div class="mo-card-head" onclick="toggleMoCard(\''+u.id+'\')">'+
          '<span class="mo-rank mo-rank-'+Math.min(rankNum,4)+'">#'+rankNum+'</span>'+
          '<span class="dbadge d-'+u.div+'">'+u.div+'</span>'+
          '<span class="mo-school-name">'+u.full+'</span>'+
          '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">'+
            (showAdj?'<span style="font-size:9px;font-weight:700;color:var(--emerald);background:var(--emerald3);border-radius:4px;padding:1px 6px">×'+divFactor+' adj</span>':'')+
            '<span class="mo-score" style="color:'+scoreColor+'">'+score+'</span>'+
          '</div>'+
          '<a href="'+rosterUrl(u)+'" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;font-weight:700;color:var(--indigo);text-decoration:none;background:var(--indigo3);padding:2px 8px;border-radius:5px;border:1px solid #c7d2fe;white-space:nowrap;margin-left:8px">📋 Roster →</a>'+
          '<span class="mo-chevron'+(isOpen?' mo-chevron-open':'')+'">▾</span>'+
        '</div>';

    if(isOpen){
      cardsHtml +=
        '<div class="mo-card-body">'+
          '<div class="mo-trajectory">';

      traj.forEach(t=>{
        const barColor = t.pct>=80?'#3B6D11':t.pct>=60?'#639922':t.pct>=40?'#BA7517':'#A32D2D';
        cardsHtml +=
          '<div class="mo-traj-row">'+
            '<div class="mo-traj-year">'+t.year+' · '+t.yr_label+'</div>'+
            '<div class="mo-traj-bar"><div class="mo-traj-fill" style="width:'+t.pct+'%;background:'+barColor+'"></div></div>'+
            '<div class="mo-traj-label">'+t.label+'</div>'+
          '</div>';
      });

      cardsHtml +=
          '</div>'+
          '<div class="mo-stats">'+
            '<div class="mo-stat"><div class="mo-stat-num">'+(mo.mf_total_2025 ?? '—')+'</div><div class="mo-stat-lbl">MFs (2025)</div></div>'+
            '<div class="mo-stat"><div class="mo-stat-num" style="color:var(--emerald)">'+(mo.cleared_before_2027 ?? '—')+'</div><div class="mo-stat-lbl">Cleared by 2027</div></div>'+
            '<div class="mo-stat"><div class="mo-stat-num">'+(mo.rising_senior_2027_count ?? '—')+'</div><div class="mo-stat-lbl">2027 Seniors</div></div>'+
            '<div class="mo-stat"><div class="mo-stat-num" style="color:var(--rose)">'+mo.rising_junior_2027_count+'</div><div class="mo-stat-lbl">2027 Juniors</div></div>'+
            '<div class="mo-stat"><div class="mo-stat-num" style="color:'+riskColor+';font-size:13px;font-weight:800">'+riskLabel+'</div><div class="mo-stat-lbl">Entry Competition</div></div>'+
          '</div>';

      if(mo.cleared_names && mo.cleared_names.length){
        cardsHtml += '<div class="mo-names"><strong>Gone before Olivier arrives:</strong> '+mo.cleared_names.join(', ')+'</div>';
      }
      if(mo.rising_junior_2027_names && mo.rising_junior_2027_names.length){
        cardsHtml += '<div class="mo-names mo-names-warn"><strong>Primary 2027-junior blockers:</strong> '+mo.rising_junior_2027_names.join(', ')+'</div>';
      }
      if(mo.trajectoryNote){
        cardsHtml += '<div style="font-size:11px;color:var(--muted);margin-top:.4rem;line-height:1.5;font-style:italic">'+mo.trajectoryNote+'</div>';
      }
      if(moMode==='adjusted'){
        cardsHtml += '<div style="font-size:10px;color:var(--hint);margin-top:.4rem;padding-top:.4rem;border-top:1px solid var(--border)">'+
          'Roster score: <strong>'+rosterScore+'</strong> → Olivier-adjusted: <strong style="color:'+scoreColor+'">'+adjScore+'</strong>'+
          (divFactor!==1.0?' ('+u.div+' ×'+divFactor+')':'(D1 — no adjustment)')+
        '</div>';
      }

      cardsHtml += '</div>';
    }

    cardsHtml += '</div>';
  });

  cardsHtml += '</div>';

  const cardsWrap = document.getElementById('mo-cards-wrap');
  if(cardsWrap) cardsWrap.innerHTML = cardsHtml;
}

// CSS injected once
(function(){
  if(document.getElementById('mo-toggle-style')) return;
  const s = document.createElement('style');
  s.id = 'mo-toggle-style';
  s.textContent = `
    .mo-toggle-btn{background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:700;border-radius:7px;padding:5px 12px;cursor:pointer;font-family:inherit;transition:all .15s}
    .mo-toggle-btn:hover{background:var(--surface3);color:var(--text)}
    .mo-toggle-active{background:var(--indigo)!important;border-color:var(--indigo)!important;color:#fff!important}
    .mo-mode-desc{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.5rem .75rem;font-size:12px;color:var(--text);line-height:1.5;margin-bottom:.5rem}
    .mo-tier-btn{padding:3px 10px;font-size:11px;font-weight:700;border:1px solid var(--border);border-radius:20px;cursor:pointer;background:var(--surface2);font-family:inherit;color:var(--muted);transition:all .15s}
    .mo-tier-btn:hover{background:var(--surface3);color:var(--text)}
    .mo-tier-cnt{font-size:10px;font-weight:700;margin-left:2px;opacity:.75}
    .mo-tier-all.mo-tier-active{background:var(--surface3);color:var(--text);border-color:var(--border2)}
    .mo-tier-high.mo-tier-active{background:var(--emerald3);color:var(--emerald);border-color:var(--emerald)}
    .mo-tier-mid.mo-tier-active{background:var(--amber3);color:var(--amber);border-color:var(--amber)}
    .mo-tier-low.mo-tier-active{background:var(--rose3);color:var(--rose);border-color:var(--rose)}
    .mo-showhide-btn{padding:3px 12px;font-size:11px;font-weight:700;border:1px solid var(--border);border-radius:7px;cursor:pointer;background:var(--surface2);font-family:inherit;color:var(--muted);transition:all .15s}
    .mo-showhide-btn:hover{background:var(--surface3);color:var(--text)}
    .mo-card-head{cursor:pointer;display:flex;align-items:center;gap:.5rem;padding:.6rem .75rem;border-radius:inherit}
    .mo-card-head:hover{background:var(--surface2)}
    .mo-chevron{font-size:14px;color:var(--muted);margin-left:6px;transition:transform .2s;display:inline-block}
    .mo-chevron-open{transform:rotate(180deg)}
    .mo-rank{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;font-size:11px;font-weight:800;flex-shrink:0}
    .mo-rank-1{background:#fbbf24;color:#78350f}
    .mo-rank-2{background:#d1d5db;color:#374151}
    .mo-rank-3{background:#f97316;color:#7c2d12}
    .mo-rank-4{background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
  `;
  document.head.appendChild(s);
})();

// App initialised via loadData() → initApp()

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', loadData);
