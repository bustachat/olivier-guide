// ═══════════════════════════════════════════════════════════════════════
// app.js  —  Olivier Scholarship Guide v17
// All application logic. Data loaded from data/ JSON files.
// v16: Conference-split JSON, Dashboard tab, sort system, listed-depth schools.
// v17: ATAR hide-ineligible toggle. Below-min cards greyed out. Top Picks
//      always remain visible (dimmed only, never hidden) regardless of GPA.
// ═══════════════════════════════════════════════════════════════════════

const APP_VERSION = 'v17';

let unis = [];
let conferences = [];
let coachData = [];

// ── AUD/USD Exchange Rate ─────────────────────────────────────────────────────
// Fetched live from open.er-api.com — free, no key needed.
// Falls back to DEFAULT_FX if the fetch fails or times out.
// Current mid-market rate as of May 2026: 1 USD = ~1.38 AUD (xe.com)
// Default set to 1.40 — small buffer above live rate for budget planning.
const DEFAULT_FX = 1.40;  // update this if AUD weakens significantly
let currentFx = DEFAULT_FX;

async function fetchLiveFxRate() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('FX fetch failed');
    const data = await res.json();
    const audPerUsd = data.rates && data.rates.AUD;
    if (audPerUsd && audPerUsd > 1.0 && audPerUsd < 3.0) {
      currentFx = Math.round(audPerUsd * 100) / 100; // round to 2dp
      return currentFx;
    }
    throw new Error('AUD rate out of expected range');
  } catch (_) {
    currentFx = DEFAULT_FX;
    return DEFAULT_FX;
  }
}

function applyFxToUI(fx) {
  // Update the FX slider and display in Financial tab
  const slFx   = document.getElementById('sl-fx');
  const valFx  = document.getElementById('val-fx');
  const notice = document.getElementById('fx-rate-notice');
  if (slFx)   slFx.value = fx.toFixed(2);
  if (valFx)  valFx.textContent = fx.toFixed(2);
  if (notice) {
    const isLive = fx !== DEFAULT_FX;
    notice.innerHTML = isLive
      ? `<span style="color:var(--emerald)">✅ Live rate loaded: 1 USD = ${fx.toFixed(2)} AUD</span> — updates each page load. Use the slider to stress-test other scenarios.`
      : `<span style="color:var(--amber)">⚠ Using default rate: 1 USD = ${fx.toFixed(2)} AUD</span> — live rate unavailable. Adjust slider if your bank rate differs.`;
  }
}

const CONF_FILES = ['acc', 'big-ten', 'big-east', 'aac', 'big-west', 'caa', 'other'];

async function loadData() {
  try {
    const base = window.DATA_BASE_URL || './data/';
    const [confResults, confsRes, coachesRes] = await Promise.all([
      Promise.all(CONF_FILES.map(f => fetch(base + f + '.json').then(r => { if (!r.ok) throw new Error('Failed to load ' + f + '.json'); return r.json(); }))),
      fetch(base + 'conferences.json'),
      fetch(base + 'coaches.json')
    ]);

    if (!confsRes.ok)   throw new Error('Failed to load conferences.json');
    if (!coachesRes.ok) throw new Error('Failed to load coaches.json');

    unis        = confResults.flat();
    conferences = await confsRes.json();
    coachData   = await coachesRes.json();

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
  const totalSchools  = unis.length;
  const totalDivs     = [...new Set(unis.map(u=>u.div).filter(Boolean))].length;
  const totalConfs    = [...new Set(unis.map(u=>u.confKey).filter(Boolean))].length;
  const totalTop      = unis.filter(u=>u.top).length;
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('hstat-schools', totalSchools);
  set('hstat-divs',    totalDivs);
  set('hstat-confs',   totalConfs);
  set('hstat-top',     totalTop);

  renderDashboard();
  renderCards();
  renderComparePage();
  renderConferences();
  renderCoachCards();
  renderFinSchoolSelector();
  renderFinComparisonBars();
  renderMinutesOutlook();
  onAtarSlide();
  applyLens(currentLens);
}

// Division show/hide toggle
function toggleDivSection(btn){
  const section = btn.closest('.conf-section');
  const collapsed = section.classList.toggle('div-collapsed');
  btn.textContent = collapsed ? 'Show' : 'Hide';
}

// ═══ v15: Lens system ══════════════════════════════════════════════════════
const LENSES = [
  {key:'overall',   label:'Best Overall',     desc:"Olivier's existing fit score (climate, lifestyle, exercise science, soccer level, PT pathway combined)."},
  {key:'soccer',    label:'Soccer-First',     desc:'Weights development scores (60%), titles & MLS pipeline (30%), and division strength (10%).'},
  {key:'academic',  label:'Academic-First',   desc:'Weights ACU BESS unit alignment (85%) plus a baseline. UF tops this list but cannot be played at — flagged accordingly.'},
  {key:'minutes',   label:'Minutes Outlook',  desc:'2027-entry roster opportunity. Higher = more midfielder slots opening up before Olivier arrives.'},
  {key:'pt',        label:'PT Pathway',       desc:'Pre-PT degree quality (50%), ACU alignment (30%), clinical/PT-specific dev score (20%).'},
  {key:'lifestyle', label:'Lifestyle-First',  desc:'Climate (warm), city access, and cultural match for Sydney-raised Olivier.'},
  {key:'value',     label:'Value-First',      desc:'Fit score per dollar of cost. Best fit-to-cost ratio.'},
];
let currentLens = 'overall';

function lensRankByDivision(lensKey){
  const divKeys = [...new Set(unis.map(u=>u.div).filter(Boolean))];
  const out = {};
  divKeys.forEach(dk=>{
    const sorted = unis
      .filter(u=>u.div===dk && u.profileDepth==='full')
      .sort((a,b)=>{
        const sa = (a.lensScores?.[lensKey])||0;
        const sb = (b.lensScores?.[lensKey])||0;
        return sb - sa;
      });
    out[dk] = sorted.slice(0,3);
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
  const sortFn = SORT_OPTIONS.find(s=>s.key===key).fn;
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
    '</div>'+
    '<div class="lens-explainer" id="lens-explainer">'+
      currentLensExplainer()+
    '</div>';
}

function currentLensExplainer(){
  const L = LENSES.find(x=>x.key===currentLens);
  if(!L) return '';
  return '<div class="lens-desc">'+L.desc+'</div>';
}

function applyLens(lensKey){
  currentLens = lensKey;
  document.querySelectorAll('.lens-pill').forEach(b=>{
    b.classList.toggle('active', b.dataset.lens===lensKey);
  });
  const exp = document.getElementById('lens-explainer');
  if(exp) exp.innerHTML = currentLensExplainer();

  const byDiv = lensRankByDivision(lensKey);
  const top3IdsByDiv = {};
  Object.keys(byDiv).forEach(div=>{
    top3IdsByDiv[div] = byDiv[div].map(u=>u.id);
  });

  document.querySelectorAll('.cards-grid').forEach(grid=>{
    const cards = [...grid.children];
    cards.sort((a,b)=>{
      const ua = unis.find(x=>x.id===a.id.replace('card-',''));
      const ub = unis.find(x=>x.id===b.id.replace('card-',''));
      const sa = (ua && ua.lensScores && ua.lensScores[lensKey]) || 0;
      const sb = (ub && ub.lensScores && ub.lensScores[lensKey]) || 0;
      if(sb !== sa) return sb - sa;
      return ((ub && ub.fitOlivier) || 0) - ((ua && ua.fitOlivier) || 0);
    });
    cards.forEach(c=>grid.appendChild(c));
  });

  document.querySelectorAll('.ucard').forEach(card=>{
    const id = card.id.replace('card-','');
    card.classList.remove('lens-top1','lens-top2','lens-top3');
    const u = unis.find(x=>x.id===id);
    if(!u) return;
    const divTops = top3IdsByDiv[u.div] || [];
    const pos = divTops.indexOf(id);
    card.dataset.lensdivtop = (pos===0) ? 'true' : 'false';
    if(pos >= 0){
      if(pos===0) card.classList.add('lens-top1');
      else if(pos===1) card.classList.add('lens-top2');
      else if(pos===2) card.classList.add('lens-top3');
      let badge = card.querySelector('.lens-badge');
      if(!badge){
        badge = document.createElement('div');
        badge.className = 'lens-badge';
        card.insertBefore(badge, card.firstChild);
      }
      const lensLabel = LENSES.find(L=>L.key===lensKey).label;
      const warn = u.noVarsity ? ' ⚠' : '';
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
}

// ═══ Application logic ═══════════════════════════════════════════════════════
let selectedIds=new Set();
function sc(s){return s>=90?'#059669':s>=80?'#d97706':'#e11d48';}
function chipLabel(pos){
  if(!pos) return '—';
  const p = pos.toLowerCase();
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

function logoUrl(u, size){
  if(!u.domain) return null;
  return 'https://logo.clearbit.com/' + u.domain;
}
function faviconUrl(u){
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
      'onerror="this.src=\''+faviconUrl(u)+'\';this.onerror=function(){var p=this.parentNode;p.innerHTML=\'<div class=\\\'card-av2\\\' style=\\\'background:\'+this.parentNode.dataset.bg+\';color:\'+this.parentNode.dataset.fg+\'\\\'>\'+this.parentNode.dataset.abbr+\'</div>\';}">'+
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
  const devAvg = Object.values(u.devScores).every(v => v === 0)
    ? null
    : Math.round(Object.values(u.devScores).reduce((a,b)=>a+b,0)/4);
  const ivyWarn=u.div==='IVY'?'<div class="ivy-warning" style="margin:.5rem .9rem;border-radius:7px">⚠ Ivy: No athletic scholarships. Need-based only. GPA 2.8 likely insufficient.</div>':'';

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
          '<span>📍'+locShort+'</span>'+
          warmTag+cityTag+
        '</div>'+
      '</div>'+
    '</div>'+
    ivyWarn+
    '<div class="score-strip">'+
      '<div class="ss-item" data-tip="Fit Score: Overall match for Olivier across climate, lifestyle, soccer level, exercise science degree quality, and PT pathway. 90%+ = excellent fit."><div class="ss-val" style="color:'+sc(u.fitOlivier)+'">'+u.fitOlivier+'%</div><div class="ss-lbl">Fit Score</div></div>'+
      '<div class="ss-item" data-tip="Dev Score: Average of 4 development sub-scores — Tactical, Technical, Fitness, and PT Pathway quality. Reflects how well the program will develop Olivier as a player and pre-PT student."><div class="ss-val" style="color:'+(devAvg===null?'var(--hint)':sc(devAvg))+'">'+(devAvg===null?'—':devAvg+'%')+'</div><div class="ss-lbl">Dev Score</div></div>'+
      '<div class="ss-item" data-tip="ACU Alignment: How many of Olivier\'s 16 ACU BESS units are covered by this US degree. 14-16 = Full align (some units may transfer as direct credit). 10-13 = Strong. Below 10 = Partial."><div class="ss-val" style="color:'+alignColor(u.acuAlign)+';font-size:.95rem">'+u.acuAlign+'/16</div><div class="ss-lbl">ACU Align</div></div>'+
    '</div>'+
    '<div class="degree-band">'+
      '<span class="db-title" title="'+u.degreeTitle+'">'+u.degreeTitle+'</span>'+
      '<span class="db-align" style="background:'+alignBg+';color:'+alignColor(u.acuAlign)+'">'+alignLabel(u.acuAlign)+'</span>'+
    '</div>'+
    '<div class="info-grid2">'+
      '<div class="ig2-item"><div class="ig2-label">Annual Cost</div><div class="ig2-val" style="color:var(--amber)">'+u.cost+'</div></div>'+
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

function renderCards(){
  const container=document.getElementById('cards-container');
  container.innerHTML='';
  renderLensControls();

  const CONF_SECTIONS=[
    {key:'acc',          label:'ACC — Atlantic Coast Conference',              tier:'Power 4 · D1',    intro:'Elite D1 soccer — strongest conference in the guide. 6 fully-profiled schools: Virginia (7 NCAA titles), Wake Forest (2024 ACC Tourn champs), SMU (2025 ACC Tournament Champions — first ever), Clemson (2× recent NCAA champions, nation-leading 4 first-round picks in 2026 draft), Notre Dame (27 MLS picks), UNC (ACC Regular Season champs 2023). Stanford and Duke among 14 listed programs.'},
    {key:'big-ten',      label:'Big Ten Conference',                           tier:'Power 4 · D1',    intro:'Most prolific MLS-producing conference all-time. UCLA on the West Coast, Indiana in the Midwest (8 NCAA titles), Maryland (most MLS picks of any program ever — 49 + 7 homegrown under Cirovski). Penn State, Michigan, USC all elite listed programs.'},
    {key:'big-east',     label:'Big East Conference',                          tier:'Major · D1',      intro:'NYC-dominated conference. St. John\'s and Georgetown both fully profiled. Georgetown are 2019 national champions under Wiese — 42 MLS signings, D.C. United + NYCFC pipeline. Creighton and UConn are perennial top-10 programs. Strong clinical network in major cities.'},
    {key:'aac',          label:'AAC — American Athletic Conference',           tier:'High Major · D1', intro:'FIU and USF both fully profiled in the AAC. Most accessible Power-conference D1 for internationals — warm climate, strong exercise science degrees. FIU reached the 2025 AAC Championship Final. Navy and Army offer full federal scholarships (zero cost).'},
    {key:'big-west',     label:'Big West Conference',                          tier:'High Major · D1', intro:'West Coast D1. UCSB fully profiled — Manu Duah went #1 overall in 2025 MLS Draft from here. Cal Poly, UC Davis, UC Irvine all competitive. Pacific lifestyle matches Sydney.'},
    {key:'caa',          label:'CAA — Colonial Athletic Association',          tier:'Mid-Major · D1',  intro:'Mid-major D1. College of Charleston fully profiled with Charleston Battery (USL) connection. William & Mary, Hofstra, Northeastern round out a competitive conference.'},
    {key:'asun',         label:'ASUN Conference',                              tier:'Mid-Major · D1',  intro:'Mid-major D1 spanning the South and Southeast. UCA (Conway, AR) is fully profiled — best D1 central midfielder opening in the guide with 6 of 9 MFs clearing before Olivier arrives. Strong Kinesiology program with UAMS clinical network. Most affordable D1 in the guide at ~$28k/yr.'},
    {key:'sec',          label:'SEC — Southeastern Conference',                tier:'Power 4 · D1',    intro:'Elite D1 conference. Texas A&M fully profiled — Bobby Shuttleworth (2× national champion assistant at FSU) appointed December 2025. Largest kinesiology department in the guide (~3,000 undergrads). College Station is a college town not a major city — warm climate, elite facilities, SEC prestige.'},
    {key:'mac',          label:'MAC — Mid-American Conference',                tier:'Mid-Major · D1',  intro:'Akron is the hidden gem of this guide — top-20 MLS pipeline, explicit Pre-PT concentration, Cleveland Clinic clinical network, and coach Jared Embick contracted through 2035. Cold Ohio winters are the main lifestyle drawback. Best PT pathway + soccer value in D1.'},
    {key:'wac',          label:'WAC — Western Athletic Conference',            tier:'Mid-Major · D1',  intro:'GCU (Phoenix, AZ) fully profiled — Jamie Davies appointed December 2025. Warm major city campus, Kinesiology with Banner Health clinical network. 2025 WAC champions and NCAA Sweet 16. Best warm D1 city campus outside Florida and California.'},
    {key:'wcc',          label:'WCC — West Coast Conference',                  tier:'Mid-Major · D1',  intro:'Denver (University of Denver) fully profiled — 5 consecutive Summit League titles 2021-2025, College Cup 2024, moving to WCC in 2026. Kinesiology launched 2023. Denver city is excellent — outdoor lifestyle, 300 days sunshine, Colorado Rapids MLS. Cold winters the main drawback.'},
    {key:'america-east', label:'America East Conference',                      tier:'Mid-Major · D1',  intro:'Vermont (Burlington, VT) listed — 2024 NCAA National Champions. New coach Adrian Dubois in 2026. Burlington is cold — not a lifestyle match for Olivier. Listed for pipeline reference.'},
    {key:'other', divFilter:'IVY',     label:'Ivy League',              tier:'D1 · Ivy',      intro:'No athletic scholarships — need-based aid only. Princeton won the 2024 and 2025 Ivy League Tournaments back-to-back under Jim Barlow. Yale won 2023.'},
    {key:'other', divFilter:'D2',      label:'Division II Programs',    tier:'D2',            intro:'South Florida D2 cluster: PBA (ranked #2 nationally 2025), Lynn (2024 D2 National Champions — undefeated), Barry (4 all-time D2 titles), Nova SE (FT Lauderdale, health sciences campus). St Edward\'s in Austin TX. Cal State LA in LA.'},
    {key:'other', divFilter:'NAIA',    label:'NAIA Programs',           tier:'NAIA',          intro:'Oklahoma City University has Australian player connections under Billy Martin. Keiser University in Fort Lauderdale has clinical simulation labs and a warm Florida campus close to MLS action.'},
    {key:'other', divFilter:'D3JUCO',  label:'D3 · JUCO',              tier:'D3 / JUCO',     intro:'Chapman (D3, Orange CA) has a mandatory KIN 405 Pre-PT Prep course — the strongest D3 PT pathway. Santa Monica College is the best JUCO entry point in the guide ($9k/yr) with a proven transfer pipeline to UCLA and UCSB. Miami Dade College transfers link well to Barry and FIU.'},
  ];

  CONF_SECTIONS.forEach(sec=>{
    let secUnis;
    if(sec.key==='other' && sec.divFilter){
      if(sec.divFilter==='IVY')     secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='IVY');
      else if(sec.divFilter==='D2') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='D2');
      else if(sec.divFilter==='NAIA') secUnis=unis.filter(u=>u.confKey==='other'&&u.div==='NAIA');
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
    el.innerHTML=
      `<div class="section-head">` +
        `<h2>${sec.label}${countNote}</h2>` +
        `<span class="dbadge d-${secUnis[0]?.div||'D1'}" style="font-size:9px">${sec.tier}</span>` +
        `<button class="div-toggle-btn" onclick="toggleDivSection(this)" title="Show/hide this conference">Show</button>` +
      `</div>` +
      `<div class="section-intro">${sec.intro}</div>` +
      `<div class="cards-grid" id="grid-${sec.key}"></div>`;
    container.appendChild(el);
    const grid=el.querySelector(`#grid-${sec.key}`);
    secUnis.forEach(u=>grid.appendChild(buildCard(u)));
  });

  const totalCards = document.querySelectorAll('#cards-container .ucard').length;
  const summaryEl = document.getElementById('filter-active-summary');
  if(summaryEl) summaryEl.innerHTML = 'Showing all <strong>'+totalCards+'</strong> schools';
}

function toggleCompare(id,btn){
  if(selectedIds.has(id)){selectedIds.delete(id);btn.textContent='+ Compare';btn.classList.remove('selected');}
  else{if(selectedIds.size>=4){alert('Max 4 schools. Remove one first.');return;}selectedIds.add(id);btn.textContent='✓ In Compare';btn.classList.add('selected');}
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
    ['Annual Cost',u=>`<div class="cval warn">${u.cost}</div>`],
    ['Aid Available',u=>`<div class="cval good">${u.aid}</div>`],
    ['GPA Min Entry',u=>`<div style="font-size:13px;font-weight:700;color:${u.gpa?(u.gpa.status==='eligible'?'var(--emerald)':u.gpa.status==='borderline'?'var(--amber)':'var(--rose)'):'var(--muted)'}">${u.gpa?u.gpa.minEntry:'—'} ${u.gpa?(u.gpa.status==='eligible'?'✅':u.gpa.status==='borderline'?'⚠️':u.gpa.status==='below'?'❌':''):''}</div><div style="font-size:10px;color:var(--muted);margin-top:3px">${u.gpa?'Target: '+u.gpa.minSchol:''}</div>`],
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
    ['Tactical Dev',u=>`<div style="color:${sc(u.devScores.tactical)};font-weight:600">${u.devScores.tactical}/100</div>`],
    ['PT Path Score',u=>`<div style="color:${sc(u.devScores.ptPath)};font-weight:600">${u.devScores.ptPath}/100</div>`],
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
  const overrides = {
    lynn:       'https://lynnfightingknights.com/sports/mens-soccer/roster',
    csula:      'https://calstatela.edu/athletics/mens-soccer/roster',
    keiser:     'https://keiseruniversity.edu/athletics/mens-soccer/roster',
    ocu:        'https://okcu.edu/athletics/soccer/roster',
    miami_dade: 'https://athletics.mdc.edu/sports/mens-soccer/roster',
  };
  if(overrides[u.id]) return overrides[u.id];
  return u.url.replace(/\/$/, '') + '/roster';
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
  smc:          'smcathletics.com',
  miami_dade:   'athletics.mdc.edu',
  uc_charleston:'ucgoldeneagles.com',
  iowa_western: 'goreivers.com',
  uca:          'ucasports.com',
  uf:           'gatorzone.com',
  clemson:      'clemsontigers.com',
  georgetown:   'guhoyas.com',
  notredame:    'fightingirish.com',
  maryland:     'umterps.com',
  unc:          'goheels.com',
  fau:          'fausports.com',
  gcu:          'lopes.com',
  texas_am:     'aggieathletics.com',
  akron:        'gozips.com',
  denver:       'denverpioneers.com',
  vermont:      'uvmathletics.com',
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
  iowa_western: 'https://www.iwcc.edu',
  uca:          'https://www.uca.edu',
  uf:           'https://www.ufl.edu',
  clemson:      'https://www.clemson.edu',
  georgetown:   'https://www.georgetown.edu',
  notredame:    'https://www.nd.edu',
  maryland:     'https://www.umd.edu',
  unc:          'https://www.unc.edu',
  fau:          'https://www.fau.edu',
  gcu:          'https://www.gcu.edu',
  texas_am:     'https://www.tamu.edu',
  akron:        'https://www.uakron.edu',
  denver:       'https://www.du.edu',
  vermont:      'https://www.uvm.edu',
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
  iowa_western: ['https://instagram.com/reivermsoccer',     null,                               'https://facebook.com/ReiverSoccer',    null],
  uca:          ['https://instagram.com/ucamenssoccer',     'https://x.com/ucamenssoccer',      'https://facebook.com/ucamenssoccer',   'https://youtube.com/c/CentralArkansasAthletics'],
  uf:           [null,                                      null,                               null,                                   null],
  clemson:      ['https://instagram.com/clemsonsoccer',     'https://x.com/ClemsonMSoccer',     'https://www.facebook.com/ClemsonMensSoccer', 'https://youtube.com/clemsontigers'],
  georgetown:   ['https://instagram.com/georgetownmsoc',    'https://x.com/GUHoyasMSoc',        null,                                   'https://youtube.com/guhoyas'],
  notredame:    ['https://instagram.com/ndmsoccer',         'https://x.com/NDMenSoccer',        null,                                   'https://youtube.com/fightingirish'],
  maryland:     ['https://instagram.com/umterpsmsoc',       'https://x.com/UMTerpsMSOC',        'https://facebook.com/TerrapinsMSoccer','https://youtube.com/umterps'],
  unc:          ['https://instagram.com/uncmsoccer',        'https://x.com/UNCMensSoccer',      null,                                   'https://youtube.com/tarheels'],
  fau:          ['https://instagram.com/faumsoccer',        'https://x.com/FAUMSoccer',         null,                                   'https://youtube.com/fauowls'],
  gcu:          ['https://instagram.com/gculopesmsoccer',   'https://x.com/GCULopesSOC',        'https://facebook.com/GCULopes',        'https://youtube.com/gcuathletics'],
  texas_am:     ['https://instagram.com/tamumsoccer',       'https://x.com/TAMUSoccer',         'https://facebook.com/TAMUSoccer',      'https://youtube.com/aggievision'],
  akron:        ['https://instagram.com/akronzipsmsoc',     'https://x.com/AkronMSOC',          'https://facebook.com/AkronZipsMSOC',   'https://youtube.com/gozipsathletics'],
  denver:       ['https://instagram.com/dumenssoccer',      'https://x.com/DUMensSoccer',       'https://facebook.com/DUPioneerSoccer', 'https://youtube.com/denverpioneers'],
  vermont:      ['https://instagram.com/uvmmenssoccer',     'https://x.com/UVMMensSoccer',      null,                                   'https://youtube.com/uvmathletics'],
};


function buildModalHeader(u){
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

  const badgesEl = document.getElementById('modal-badges');
  badgesEl.innerHTML = [
    `<span class="mh-badge">${u.div}</span>`,
    `<span class="mh-badge">${u.conf}</span>`,
    `<span class="mh-badge">${u.loc}</span>`,
  ].join('');

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
  if(html === lbl) html = '';
  el.innerHTML = html;
}

function openDetail(id){
  const u=unis.find(x=>x.id===id);if(!u)return;
  document.getElementById('modal-title').textContent=u.full;
  document.getElementById('modal-body').innerHTML=buildDetailBody(u);
  buildModalHeader(u);
  buildSocialStrip(u);
  document.getElementById('modal').classList.remove('hidden');
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

  const cleared = mo.cleared_before_2027 || 0;
  const juniors = mo.rising_junior_2027_count || 0;
  const seniors = mo.rising_senior_2027_count || 0;
  const yr1label = traj[0] ? traj[0].label : '—';
  const summary = `${cleared} midfielder${cleared!==1?'s':''} clear out before Olivier arrives. `+
    `${seniors} senior${seniors!==1?'s':''} and ${juniors} junior${juniors!==1?'s':''} remain as direct competition in 2027. `+
    `Expected year-1 role: <strong>${yr1label}</strong>.`;

  let trajHtml = traj.map(t=>{
    const barColor = t.pct>=80?'#3B6D11':t.pct>=60?'#639922':t.pct>=40?'#d97706':'#e11d48';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-size:11px;color:var(--muted);width:90px;flex-shrink:0">${t.yr_label}</div>
      <div style="flex:1;height:7px;background:var(--surface3);border-radius:4px;overflow:hidden">
        <div style="width:${t.pct}%;height:100%;background:${barColor};border-radius:4px"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${barColor};width:32px;text-align:right">${t.pct}%</div>
      <div style="font-size:11px;color:var(--muted)">${t.label}</div>
    </div>`;
  }).join('');

  const clearedNames = (mo.cleared_names||[]).join(', ');
  const blockerNames = [...(mo.rising_senior_2027_names||[]),...(mo.rising_junior_2027_names||[])].join(', ');

  return `
    <div class="detail-block" style="margin-bottom:1rem">
      <h4>2027 Entry — Central Midfielder Outlook</h4>
      <p style="font-size:13px;color:var(--muted);margin-bottom:1rem">${summary}</p>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--hint);margin-bottom:8px">Projected Playing Time Trajectory</div>
      ${trajHtml}
      <div style="font-size:11px;color:var(--muted);margin-top:.5rem;line-height:1.6">${mo.trajectoryNote||''}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem">
      <div style="background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;color:var(--emerald)">${cleared}</div>
        <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">MFs Cleared</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;color:var(--amber)">${juniors}</div>
        <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">2027 Juniors</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:7px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.1rem;font-weight:800;color:${riskColor}">${riskLabel}</div>
        <div style="font-size:9px;color:var(--hint);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">Entry Competition</div>
      </div>
    </div>
    ${clearedNames?`<div style="background:var(--emerald3);border-radius:7px;padding:7px 10px;font-size:11.5px;margin-bottom:6px"><strong style="color:var(--emerald)">Gone before Olivier arrives:</strong> <span style="color:#065f46">${clearedNames}</span></div>`:''}
    ${blockerNames?`<div style="background:var(--rose3);border-radius:7px;padding:7px 10px;font-size:11.5px"><strong style="color:var(--rose)">Primary 2027-junior blockers:</strong> <span style="color:var(--rose)">${blockerNames}</span></div>`:''}
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
      ${u.div==='IVY'?`<div class="ivy-warning">⚠ Ivy League: No athletic scholarships — need-based financial aid only. Highly selective admission. GPA 2.8 is below typical Ivy requirements.</div>`:''}
      ${u.noVarsity?`<div style="background:var(--rose3);border:1px solid var(--rose2);border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem"><strong style="color:var(--rose)">⚠ No varsity men's soccer:</strong> <span style="color:var(--rose)">${u.noVarsityNote||''}</span></div>`:''}
      <div class="detail-grid">
        <div class="detail-block"><h4>Quick Facts</h4>
          <table style="width:100%;font-size:13px">
          <tr><td style="color:var(--hint);padding:4px 0">Location</td><td>${u.loc}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Division</td><td><span class="dbadge d-${u.div}">${u.div}</span> ${u.conf}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Annual Cost</td><td style="color:var(--amber);font-weight:600">${u.cost}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Aid Type</td><td>${u.aid}</td></tr>
          <tr><td style="color:var(--hint);padding:4px 0">Campus Size</td><td>${u.size} students</td></tr>
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
      <div class="detail-block"><h4>Titles &amp; Honours</h4>
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
        ${Object.entries({tactical:'Tactical Development',technical:'Technical Development',fitness:'Fitness Programming',ptPath:'PT / Chiro Pathway'}).map(([k,l])=>`
        <div class="fit-row">
          <div class="fit-label">${l}</div>
          <div class="fit-track"><div class="fit-fill" style="width:${u.devScores[k]}%;background:${sc(u.devScores[k])}"></div></div>
          <div class="fit-num" style="color:${sc(u.devScores[k])}">${u.devScores[k]}</div>
        </div>`).join('')}
      </div>
      <div class="detail-block" style="margin-top:1rem"><h4>Overall Fit for Olivier</h4>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:.75rem">
          <div style="font-size:2.5rem;font-weight:800;color:${sc(u.fitOlivier)}">${u.fitOlivier}%</div>
          <p style="font-size:13px;color:var(--muted)">Combines climate, city lifestyle, exercise science quality, soccer level, pro pathway, and PT/Chiro pathway.</p>
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
      </div>
      ${u.facilityDetails.extras?`<div class="fac-block" style="margin-bottom:1rem"><h5>🎁 Extras & Unique Perks</h5><p>${u.facilityDetails.extras}</p></div>`:''}
      ${u.facilityDetails.note?`<div class="fac-note"><p><strong>Facilities verdict:</strong> ${u.facilityDetails.note}</p></div>`:''}
      `:'<div class="detail-block"><p style="color:var(--muted)">Facility details coming soon.</p></div>'}
    </div>`;
}

function switchTab(btn,tabId){
  const body=document.getElementById('modal-body');
  body.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active'));
  body.querySelectorAll('.mtab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+tabId).classList.add('active');
}
function closeModal(){document.getElementById('modal').classList.add('hidden');}
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');btn.classList.add('active');
}

// ══════════════════════════════════════════════════
// ATAR → GPA CONVERSION ENGINE
// ══════════════════════════════════════════════════
const atarGpaTable = [
  [99, 4.0], [95, 3.9], [90, 3.7], [85, 3.5], [80, 3.3],
  [75, 3.0], [70, 2.8], [65, 2.6], [60, 2.4], [55, 2.2],
  [50, 2.0], [45, 1.8], [40, 1.5]
];

function atarToGpa(atar) {
  const val = Math.max(40, Math.min(99, atar));
  for (let i = 0; i < atarGpaTable.length - 1; i++) {
    const [a1, g1] = atarGpaTable[i];
    const [a2, g2] = atarGpaTable[i + 1];
    if (val <= a1 && val >= a2) {
      const t = (val - a2) / (a1 - a2);
      return Math.round((g2 + t * (g1 - g2)) * 10) / 10;
    }
  }
  return 1.5;
}

function parseMinEntry(minEntry) {
  if (!minEntry) return 0;
  const s = minEntry.toLowerCase();
  if (s.includes('no minimum') || s.includes('open')) return 0;
  const m = minEntry.match(/(\d+\.\d+|\d+)/);
  return m ? parseFloat(m[1]) : 0;
}

function dynamicGpaStatus(convertedGpa, minEntry) {
  const min = parseMinEntry(minEntry);
  if (min === 0) return 'eligible';
  if (convertedGpa >= min) return 'eligible';
  if (convertedGpa >= min - 0.3) return 'borderline';
  return 'below';
}

let currentAtarGpa = atarToGpa(70);
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
  refreshAllGpaRows();
  updateAtarCounts();
  applyFilters();
  if (typeof syncDashGpa === 'function') syncDashGpa(currentAtarGpa, atar);
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
    card.classList.remove('gpa-borderline', 'gpa-below');
    if (dynStatus === 'borderline') card.classList.add('gpa-borderline');
    if (dynStatus === 'below')      card.classList.add('gpa-below');
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

// ══════════════════════════════════════════════════
// MULTI-SELECT FILTER ENGINE
// ══════════════════════════════════════════════════
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
  document.querySelectorAll('.conf-section').forEach(sec=>{
    const hasVisible=[...sec.querySelectorAll('.ucard')].some(c=>c.style.display!=='none');
    sec.style.display=hasVisible?'':'none';
  });
  updateFilterSummary(visible);
  const hasAny = Object.values(activeFilters).some(s=>s.size>0);
  const clearBtn = document.getElementById('filter-clear-btn');
  if(clearBtn) clearBtn.style.display = hasAny ? '' : 'none';
}

function clearAllFilters(){
  Object.keys(activeFilters).forEach(k=>activeFilters[k].clear());
  document.querySelectorAll('.fchip.active').forEach(b=>b.classList.remove('active'));
  atarHideBelow = false;
  const hideBtn = document.getElementById('atar-hide-btn');
  if (hideBtn) { hideBtn.classList.remove('atar-hide-active'); hideBtn.textContent = '🚫 Hide ineligible'; }
  const container = document.getElementById('cards-container');
  if(container){
    container.querySelectorAll('.ucard').forEach(c=>c.style.display='');
    container.querySelectorAll('.conf-section').forEach(s=>s.style.display='');
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
  const total = container ? container.querySelectorAll('.ucard').length : 24;
  const activeChips = document.querySelectorAll('.fchip.active');
  if(activeChips.length===0){
    el.innerHTML = 'Showing all <strong>'+total+'</strong> schools';
  } else {
    const labels = [...activeChips].map(b=>b.textContent.trim()).join(', ');
    el.innerHTML = '<span class="filter-result-count">'+count+' result'+(count!==1?'s':'')+'</span> matching: <em style="color:var(--indigo)">'+labels+'</em>';
  }
}

function toggleFilterPanel(){
  const body = document.getElementById('filter-panel-body');
  const btn  = document.getElementById('filter-toggle-btn');
  const isHidden = body.style.display==='none';
  body.style.display = isHidden ? '' : 'none';
  btn.textContent = isHidden ? '▲ Hide filters' : '▼ Show filters';
}

// Backward-compat stubs
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
// CONFERENCES DATA & RENDER
// ══════════════════════════════════════════════════
function renderConferences(){
  const container=document.getElementById('conferences-container');
  const tiers=[
    {key:'Power 5 (D1)',      label:'Power 5 Conferences — Elite Division I',                  cls:'tier-p5',   intro:"The 'Big Five' soccer conferences that produce the majority of MLS draft picks. Getting into a Power 5 program requires elite highlights. These programs offer the strongest soccer development but the most competitive roster spots."},
    {key:'High Major (D1)',   label:'High-Major Conferences — Very Strong D1',                 cls:'tier-d1',   intro:'Just below Power 5 in profile but highly competitive. Strong MLS pipelines, full scholarships, accessible for internationals.'},
    {key:'Mid-Major (D1)',    label:'Mid-Major Conferences — Solid D1',                        cls:'tier-d1',   intro:'Competitive D1 with more opportunity for playing time. ASUN, CAA, MAC, WAC, WCC and America East all feature in this guide.'},
    {key:'Division II',       label:'Division II — Florida Sunshine State Conference',         cls:'tier-d2',   intro:'The SSC is the best D2 conference in the country. PBA, Lynn, Barry and Nova SE all in South Florida — warm climate, strong soccer, near-full scholarships.'},
    {key:'NAIA',              label:'NAIA — National Association of Intercollegiate Athletics', cls:'tier-naia', intro:'No scholarship cap — full rides possible. OCU and Keiser both in warm cities with strong PT pathways.'},
    {key:'Division III',      label:'Division III — Academic Focus, No Athletic Scholarships', cls:'tier-juco', intro:'No athletic scholarships. Best for athletes where PT/Chiro grad school GPA is the primary goal.'},
    {key:'Junior College',    label:'Junior College — 2-Year Transfer Pathway',                cls:'tier-juco', intro:'Starting point not a destination. Santa Monica College → UCLA is the proven pipeline.'},
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

// ══════════════════════════════════════════════════
// FINANCIAL MODEL
// ══════════════════════════════════════════════════
let finCurrentSchool = null;

function fmt(n){return '$'+Math.round(n).toLocaleString('en-US');}
function fmtAUD(n,fx){return 'A$'+Math.round(n*fx).toLocaleString('en-US');}

function renderFinSchoolSelector(){
  const container = document.getElementById('fin-school-selector');
  container.innerHTML = '';
  unis.forEach(u=>{
    if(!u.fin || u.profileDepth === 'listed') return;
    const btn = document.createElement('button');
    btn.className = 'fin-school-btn' + (finCurrentSchool&&finCurrentSchool.id===u.id?' active':'');
    btn.innerHTML = `<div class="fsb-name">${u.name}</div><div class="fsb-div">${u.div} · ${u.conf.split(' ')[0]}</div>`;
    btn.onclick = () => finSelectSchool(u, btn, true);
    container.appendChild(btn);
  });
  if(!finCurrentSchool && unis.length){
    const firstFull = unis.find(u=>u.fin&&u.profileDepth!=='listed');
    if(firstFull){
      const firstBtn = container.querySelector('.fin-school-btn');
      finSelectSchool(firstFull, firstBtn, false);
    }
  }
}

function finSelectSchool(u, btn, isFirstSelection){
  finCurrentSchool = u;
  document.querySelectorAll('.fin-school-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  const f = u.fin;
  const athCap = Math.round((f.maxAthletic||0.5)*100);
  const slAth  = document.getElementById('sl-athletic');
  const slAcad = document.getElementById('sl-academic');

  if(f.aidType==='need-only'){
    slAth.value = 0; slAth.disabled = true; slAth.style.opacity = '0.3';
  } else {
    slAth.max = athCap;
    slAth.value = isFirstSelection ? 0 : Math.min(parseInt(slAth.value)||0, athCap);
    slAth.disabled = false;
    slAth.style.opacity = '1';
  }
  slAcad.value = isFirstSelection ? 0 : Math.min(parseInt(slAcad.value)||0, 50);

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
  const scenarios = {
    none:    {ath:0,   acad:0},
    ath25:   {ath:25,  acad:0},
    ath50:   {ath:50,  acad:0},
    acad50:  {ath:0,   acad:50},
    full:    {ath:50,  acad:50},
    partial: {ath:25,  acad:25},
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
  const athPct  = parseInt(document.getElementById('sl-athletic').value)  / 100;
  const acadPct = parseInt(document.getElementById('sl-academic').value)  / 100;
  const combinedPct = athPct + acadPct;
  const fx = parseFloat(document.getElementById('sl-fx').value);

  document.getElementById('val-athletic').textContent  = Math.round(athPct*100)+'%';
  document.getElementById('val-academic').textContent  = Math.round(acadPct*100)+'%';
  document.getElementById('val-fx').textContent        = fx.toFixed(2);

  const totalCOA  = f.costNum;
  const athSchol  = Math.round(totalCOA * athPct);
  const acadSchol = Math.round(totalCOA * acadPct);
  const totalAid  = athSchol + acadSchol;
  const netCOA    = Math.max(0, totalCOA - totalAid);

  const combinedEl  = document.getElementById('combined-aid-pct');
  const combinedUSD = document.getElementById('combined-aid-usd');
  if(combinedEl){
    combinedEl.textContent = Math.round(combinedPct*100)+'%';
    combinedEl.style.color = combinedPct>=0.9?'var(--emerald)':combinedPct>=0.5?'var(--amber)':'var(--rose)';
    combinedUSD.textContent = 'saving '+fmt(totalAid)+'/yr';
  }

  const exFlights  = parseFloat(document.getElementById('ex-flights').value)||0;
  const exPersonal = parseFloat(document.getElementById('ex-personal').value)||0;
  const exBooks    = parseFloat(document.getElementById('ex-books').value)||0;
  const exHealth   = parseFloat(document.getElementById('ex-health').value)||0;
  const exMobile   = parseFloat(document.getElementById('ex-mobile').value)||0;
  const totalExtras = exFlights+exPersonal+exBooks+exHealth+exMobile;

  const totalAnnual = netCOA + totalExtras;
  const total4yr    = totalAnnual * 4;
  const netColor    = netCOA===0?'var(--emerald)':netCOA<15000?'var(--amber)':'var(--rose)';

  let html = `<div style="margin-bottom:1.25rem">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--hint);margin-bottom:4px">Annual Out-of-Pocket (USD)</div>
    <div class="fin-summary-num" style="color:${netColor}">${fmt(totalAnnual)}</div>
    <div style="font-size:13px;color:var(--muted);margin-top:4px">= <strong style="color:${netColor}">${fmtAUD(totalAnnual,fx)}</strong> AUD / year</div>
  </div>`;

  html += `<div class="fin-breakdown">
    <div class="fin-row expense"><span class="fr-label">📋 Tuition</span><span class="fr-val">${fmt(f.tuition)}</span></div>
    <div class="fin-row expense"><span class="fr-label">🏠 Room & Board</span><span class="fr-val">${fmt(f.roomBoard)}</span></div>
    <div class="fin-row expense"><span class="fr-label">📑 Fees</span><span class="fr-val">${fmt(f.fees)}</span></div>
    <div class="fin-row expense" style="border-top:2px solid var(--border2);font-weight:700"><span class="fr-label">Total Cost of Attendance</span><span class="fr-val">${fmt(totalCOA)}</span></div>
    ${athPct>0?`<div class="fin-row income"><span class="fr-label">🏆 Athletic Scholarship (${Math.round(athPct*100)}% of cost)</span><span class="fr-val">−${fmt(athSchol)}</span></div>`:''}
    ${acadPct>0?`<div class="fin-row income"><span class="fr-label">🎓 Academic Scholarship (${Math.round(acadPct*100)}% of cost)</span><span class="fr-val">−${fmt(acadSchol)}</span></div>`:''}
    <div class="fin-row ${netCOA===0?'net-positive':netCOA<20000?'net-partial':'net-gap'}"><span class="fr-label" style="font-weight:700">Net Out-of-Pocket / yr</span><span class="fr-val" style="color:${netColor};font-weight:800">${fmt(netCOA)}</span></div>
    ${totalExtras>0?`<div class="fin-row expense"><span class="fr-label">✈ Living & Extras</span><span class="fr-val">${fmt(totalExtras)}</span></div>`:''}
    <div class="fin-row" style="border-top:2px solid var(--border2);font-weight:700"><span class="fr-label">Total Annual (incl. extras)</span><span class="fr-val">${fmt(totalAnnual)}</span></div>
    <div class="fin-row" style="font-weight:700"><span class="fr-label">4-Year Total Estimate</span><span class="fr-val" style="color:${netColor}">${fmt(total4yr)}</span></div>
    <div class="fin-row" style="font-size:11px;color:var(--hint)"><span class="fr-label">4yr in AUD</span><span class="fr-val">${fmtAUD(total4yr,fx)}</span></div>
  </div>`;

  document.getElementById('fin-results-html').innerHTML = html;

  let tips = '';
  if(u.fin.aidType==='need-only'){
    tips = `<strong>Need-based only (Ivy League):</strong> No athletic scholarship. 100% of aid based on demonstrated financial need. Families earning under $75k typically pay little to nothing. Above that, aid scales back. <em>Admission is the barrier, not money.</em>`;
  } else if(combinedPct===0){
    tips = `<strong>No aid modelled:</strong> Use the sliders above to model different scholarship scenarios. A 50% athletic + 50% academic combination (full ride) is the best-case for an 8/10 international CM.`;
  } else if(f.aidType==='athletic+need'){
    tips = `<strong>Athletic + need-based aid:</strong> Academic aid here represents need-based grants based on family income documentation.`;
  } else if(combinedPct < 1.0){
    const gap = Math.round((1.0 - combinedPct) * 100);
    tips = `<strong>${gap}% gap remaining:</strong> At current settings ${fmt(totalCOA-totalAid)}/yr is unfunded. Try increasing both sliders to close the gap. A full ride = 50% athletic + 50% academic.`;
  } else {
    tips = `<strong>🎉 Full ride modelled!</strong> At these settings the total scholarship covers 100% of the university cost of attendance. Living costs (${fmt(totalExtras)}/yr) are the remaining family responsibility.`;
  }
  document.getElementById('fin-tips').innerHTML = tips;
}

function renderFinComparisonBars(){
  const container = document.getElementById('fin-comparison-bars');
  const fx = currentFx;
  const athPct = 0.5;
  const extras = 7500;

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

  const brackets = [
    { label:'Under $30k', min:0,     max:29999,   color:'var(--emerald)', bg:'var(--emerald3)' },
    { label:'$30–50k',    min:30000, max:49999,   color:'var(--sky)',     bg:'var(--sky3)'     },
    { label:'$50–70k',    min:50000, max:69999,   color:'var(--amber)',   bg:'var(--amber3)'   },
    { label:'$70k+',      min:70000, max:Infinity, color:'var(--rose)',   bg:'var(--rose3)'    },
  ];

  let html = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.25rem">';

  brackets.forEach(b=>{
    const inBracket = data.filter(d=>d.cost>=b.min&&d.cost<=b.max);
    if(!inBracket.length) return;

    html+=`<div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem">
        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;background:${b.bg};color:${b.color};padding:2px 10px;border-radius:4px">${b.label}</span>
        <span style="font-size:11px;color:var(--hint)">${inBracket.length} school${inBracket.length!==1?'s':''}</span>
      </div>`;

    inBracket.forEach(d=>{
      const barW = Math.round((d.net/maxNet)*100);
      const audNet = Math.round(d.net * fx);
      html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="font-size:11px;font-weight:600;width:90px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.u.name}</div>
        <div style="flex:1;height:7px;background:var(--surface3);border-radius:4px;overflow:hidden">
          <div style="width:${barW}%;height:100%;background:${b.color};border-radius:4px"></div>
        </div>
        <div style="font-size:10px;font-weight:700;color:${b.color};width:90px;text-align:right;flex-shrink:0">${fmt(d.net)}/yr · A$${Math.round(audNet/1000)}k</div>
      </div>`;
    });
    html+='</div>';
  });

  html += `<div style="font-size:10px;color:var(--hint);margin-top:.5rem;line-height:1.5">Based on 50% athletic scholarship + $7,500 extras. Adjust sliders in the Financial Model tab for personalised estimates. Exchange rate: 1 USD = ${fx.toFixed(2)} AUD.</div>`;
  html += '</div>';
  container.innerHTML = html;
}

// ══════════════════════════════════════════════════
// MINUTES OUTLOOK PAGE
// ══════════════════════════════════════════════════
function renderMinutesOutlook(){
  const container = document.getElementById('page-minutes');
  if(!container) return;

  const fullUnis = unis.filter(u=>u.profileDepth==='full'&&u.minutesOutlook);
  if(!fullUnis.length){
    container.innerHTML='<div style="padding:2rem;color:var(--muted)">Minutes Outlook data not yet loaded.</div>';
    return;
  }

  let headerHtml = `
    <div class="section-head"><h2>⏱ 2027 Entry — Minutes Outlook for Olivier</h2></div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:1rem;line-height:1.75">
      Roster analysis for each fully-profiled school. Shows how many central midfielders clear out before Olivier's 2027 entry,
      who remains as competition, and a year-by-year trajectory for playing time.
    </p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">Filter:</span>
      <button class="mo-toggle-btn mo-toggle-active" id="mo-btn-all"   onclick="moFilter('all',this)">All schools</button>
      <button class="mo-toggle-btn"                  id="mo-btn-D1"    onclick="moFilter('D1',this)">D1 only</button>
      <button class="mo-toggle-btn"                  id="mo-btn-D2"    onclick="moFilter('D2',this)">D2 / NAIA</button>
      <button class="mo-toggle-btn"                  id="mo-btn-open"  onclick="moFilter('open',this)">Open Competition</button>
      <button class="mo-toggle-btn"                  id="mo-btn-warm"  onclick="moFilter('warm',this)">Warm Climate</button>
    </div>
    <div id="mo-cards-wrap" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem"></div>`;

  container.innerHTML = headerHtml;
  moRenderCards(fullUnis, 'all');
}

function moFilter(mode, btn){
  document.querySelectorAll('.mo-toggle-btn').forEach(b=>b.classList.remove('mo-toggle-active'));
  btn.classList.add('mo-toggle-active');
  const fullUnis = unis.filter(u=>u.profileDepth==='full'&&u.minutesOutlook);
  moRenderCards(fullUnis, mode);
}

function moRenderCards(allUnis, mode){
  let filtered = allUnis;
  if(mode==='D1')   filtered = allUnis.filter(u=>u.div==='D1'||u.div==='IVY');
  if(mode==='D2')   filtered = allUnis.filter(u=>u.div==='D2'||u.div==='NAIA');
  if(mode==='open') filtered = allUnis.filter(u=>(u.minutesOutlook?.recruit_risk||'').includes('Low')||u.minutesOutlook?.cleared_before_2027>=4);
  if(mode==='warm') filtered = allUnis.filter(u=>u.warm);

  const sorted = [...filtered].sort((a,b)=>(b.minutesOutlook?.cleared_before_2027||0)-(a.minutesOutlook?.cleared_before_2027||0));

  let cardsHtml = '';
  sorted.forEach(u=>{
    const mo = u.minutesOutlook;
    if(!mo) return;

    const cleared = mo.cleared_before_2027||0;
    const traj = (mo.trajectory||[])[0];
    const yr1pct = traj?traj.pct:0;
    const yr1label = traj?traj.label:'Unknown';
    const barColor = yr1pct>=80?'var(--emerald)':yr1pct>=50?'var(--amber)':'var(--rose)';
    const riskColor = (mo.recruit_risk||'').includes('High')?'var(--amber)':(mo.recruit_risk||'').includes('Low')?'var(--emerald)':'var(--sky)';

    const divFactor = u.div==='D1'?1.0:u.div==='IVY'?1.1:0.85;

    cardsHtml+=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="background:var(--navy);padding:.85rem 1rem;display:flex;align-items:center;gap:.75rem">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${u.domain?`<img src="https://logo.clearbit.com/${u.domain}" width="28" height="28" style="object-fit:contain" onerror="this.src='https://www.google.com/s2/favicons?domain=${u.domain}&sz=64';this.onerror=null">`:`<span style="font-size:9px;font-weight:800;color:var(--muted)">${u.name.slice(0,3)}</span>`}
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#fff">${u.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.5)">${u.div} · ${u.conf.split(' ')[0]}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:1.4rem;font-weight:800;color:var(--emerald)">${cleared}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.4)">MFs cleared</div>
        </div>
      </div>
      <div style="padding:.85rem 1rem">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:.65rem">
          <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
            <div style="width:${yr1pct}%;height:100%;background:${barColor};border-radius:3px"></div>
          </div>
          <div style="font-size:11px;font-weight:700;color:${barColor};flex-shrink:0">${yr1pct}%</div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:.5rem">Yr 1 outlook: <strong>${yr1label}</strong></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:var(--surface2);color:${riskColor}">Competition: ${mo.recruit_risk||'—'}</span>
          ${u.warm?'<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:var(--amber3);color:var(--amber)">☀ Warm</span>':''}
        </div>
        ${mo.trajectoryNote?`<div style="font-size:11px;color:var(--hint);margin-top:.5rem;line-height:1.5">${mo.trajectoryNote.slice(0,120)}${mo.trajectoryNote.length>120?'…':''}</div>`:''}
        <button class="detail-btn" style="margin-top:.75rem;width:100%;font-size:12px;padding:6px" onclick="openDetail('${u.id}')">Full Details & Minutes Tab →</button>
      </div>
    </div>`;
  });

  cardsHtml += '</div>';

  const cardsWrap = document.getElementById('mo-cards-wrap');
  if(cardsWrap) cardsWrap.innerHTML = cardsHtml;
}

// CSS for toggle buttons — injected once
(function(){
  if(document.getElementById('mo-toggle-style')) return;
  const s = document.createElement('style');
  s.id = 'mo-toggle-style';
  s.textContent = `
    .mo-toggle-btn{background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:700;border-radius:7px;padding:5px 12px;cursor:pointer;font-family:inherit;transition:all .15s}
    .mo-toggle-btn:hover{background:var(--surface3);color:var(--text)}
    .mo-toggle-active{background:var(--indigo)!important;border-color:var(--indigo)!important;color:#fff!important}
    .mo-mode-desc{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.5rem .75rem;font-size:12px;color:var(--text);line-height:1.5;margin-bottom:.5rem}
  `;
  document.head.appendChild(s);
})();

// App initialised via loadData() → initApp()

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', loadData);
