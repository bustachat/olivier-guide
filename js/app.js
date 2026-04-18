// ═══════════════════════════════════════════════════════════════════════
// app.js  —  Olivier Scholarship Guide v12.1
// All application logic. Data loaded from data/ JSON files.
// ═══════════════════════════════════════════════════════════════════════

let unis = [];
let conferences = [];
let coachData = [];
let athlete = null;  // Loaded from athletes/[id].json

// Load all three data files in parallel, then initialise the app
async function loadData() {
  try {
    const base       = window.DATA_BASE_URL  || './data/';
    const athleteId  = new URLSearchParams(window.location.search).get('athlete') || 'olivier';
    const athleteBase = window.ATHLETE_BASE_URL || './athletes/';

    const [schoolsRes, confsRes, coachesRes, athleteRes] = await Promise.all([
      fetch(base + 'schools.json'),
      fetch(base + 'conferences.json'),
      fetch(base + 'coaches.json'),
      fetch(athleteBase + athleteId + '.json')
    ]);

    if (!schoolsRes.ok)  throw new Error('Failed to load schools.json');
    if (!confsRes.ok)    throw new Error('Failed to load conferences.json');
    if (!coachesRes.ok)  throw new Error('Failed to load coaches.json');
    if (!athleteRes.ok)  throw new Error('Failed to load athlete: ' + athleteId + '.json');

    unis        = await schoolsRes.json();
    conferences = await confsRes.json();
    coachData   = await coachesRes.json();
    athlete     = await athleteRes.json();

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
  renderCards();
  renderComparePage();
  renderContacts();
  renderConferences();
  renderCoachCards();
  renderFinSchoolSelector();
  renderFinComparisonBars();
  // Run ATAR slider at default — triggers score calc + GPA refresh
  const defaultAtar = (athlete && athlete.defaultAtar) ? athlete.defaultAtar : 70;
  const sliderEl = document.getElementById('atar-slider');
  if (sliderEl) sliderEl.value = defaultAtar;
  // Calculate initial converted GPA
  if (typeof atarToGpa === 'function') {
    currentAtarGpa = atarToGpa(defaultAtar);
  }
  // Run score calculation explicitly after cards are in DOM
  if (typeof recalculateAllScores === 'function' && athlete) {
    recalculateAllScores(athlete, currentAtarGpa);
  }
  // Then trigger full ATAR UI update
  onAtarSlide();
}

// ═══ Application logic ═══════════════════════════════════════════════════════
let selectedIds=new Set();
function sc(s){return s>=90?'#059669':s>=80?'#d97706':'#e11d48';}
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
  const sections=[
    {div:'D1',label:'NCAA Division I',intro:'Highest competition. Elite soccer, strong kinesiology programs, competitive scholarships. Now includes FIU, SMU, College of Charleston, and the Ivy League programs.'},
    {div:'IVY',label:'Ivy League (D1)',intro:'No athletic scholarships — need-based financial aid only. Princeton won the 2024 AND 2025 Ivy League Tournaments. GPA 2.8 is a significant challenge for admission. Degrees are NOT exercise science aligned.'},
    {div:'D2',label:'NCAA Division II',intro:'Best overall balance. Playing time from year 1, genuine scholarships, strong exercise science programs. PBA is ranked #2 nationally in 2025 with an explicit Pre-PT degree title. Same SSC conference as Lynn, Barry, Nova Southeastern.'},
    {div:'NAIA',label:'NAIA',intro:'Generous scholarships, smaller campuses, personal development. OCU has specific Australian player connections.'},
    {div:'D3',label:'NCAA Division III',intro:'No athletic scholarships. Academic focus. Chapman has a mandatory Pre-PT Prep course — best D3 option.'},
    {div:'JUCO',label:'JUCO / Junior College',intro:'2-year pathway. Santa Monica College → UCLA is the best transfer pipeline in California.'}
  ];
  sections.forEach(sec=>{
    const secUnis=unis.filter(u=>u.div===sec.div);
    const el=document.createElement('div');
    el.className='conf-section';el.dataset.div=sec.div;
    el.innerHTML=`<div class="section-head"><h2>${sec.label}</h2><span class="dbadge d-${sec.div}">${sec.div}</span></div><div class="section-intro">${sec.intro}</div><div class="cards-grid" id="grid-${sec.div}"></div>`;
    container.appendChild(el);
    const grid=el.querySelector(`#grid-${sec.div}`);
    secUnis.forEach(u=>grid.appendChild(buildCard(u)));
  });
}

function buildCard(u){
  const el=document.createElement('div');
  el.className='ucard'+(u.top?' top-pick':'');
  el.dataset.div=u.div; el.dataset.region=u.region; el.dataset.warm=u.warm; el.dataset.top=u.top;
  el.dataset.city=u.city?'true':'false';
  el.dataset.acualign=u.acuAlign>=14?'full':u.acuAlign>=10?'strong':'partial';
  const gpaBucket=!u.gpa?'low':
    (u.gpa.minEntry.toLowerCase().includes('no minimum')||u.gpa.minEntry.toLowerCase().includes('open'))?'none':
    (u.gpa.minEntry.includes('2.0')||u.gpa.minEntry.includes('2.3'))?'low':
    u.gpa.minEntry.includes('2.5')?'mid':
    (u.gpa.minEntry.includes('3.0')||u.gpa.minEntry.includes('3.5')||u.gpa.minEntry.includes('3.9'))?'high':'low';
  el.dataset.gpamin=gpaBucket;
  const facRating=u.facilityDetails?u.facilityDetails.rating.toLowerCase().replace(' ',''):'solid';
  el.dataset.facrating=facRating;
  el.id='card-'+u.id;

  const devAvg=Math.round(Object.values(u.devScores).reduce((a,b)=>a+b,0)/4);
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
  const standingHtml=u.confRecord.slice(0,5).map(function(r){
    return '<span class="sy '+posColor(r.pos)+'" title="'+r.yr+': '+r.note+'" style="font-size:9px">'+r.yr.toString().slice(2)+': '+r.pos.split(' ')[0]+'</span>';
  }).join('');
  const titlesNote=u.titles.length>0?'<span style="margin-left:4px;font-size:9px;color:var(--gold);font-weight:700">🏆 '+u.titles.length+' title'+(u.titles.length>1?'s':'')+'</span>':'';

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
      '<div class="card-av2" style="background:'+u.color[0]+';color:'+u.color[1]+'">'+u.name.slice(0,4)+'</div>'+
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
      '<div class="ss-item"><div class="ss-val" id="fit-'+u.id+'" style="color:'+sc(u.fitOlivier)+'">'+u.fitOlivier+'%</div><div class="ss-lbl">Fit Score</div></div>'+
      '<div class="ss-item"><div class="ss-val" style="color:'+sc(devAvg)+'">'+devAvg+'%</div><div class="ss-lbl">Dev Score</div></div>'+
      '<div class="ss-item"><div class="ss-val" style="color:'+alignColor(u.acuAlign)+';font-size:.95rem">'+u.acuAlign+'/16</div><div class="ss-lbl">ACU Align</div></div>'+
    '</div>'+
    '<div class="degree-band">'+
      '<span class="db-title" title="'+u.degreeTitle+'">'+u.degreeTitle+'</span>'+
      '<span class="db-align" style="background:'+alignBg+';color:'+alignColor(u.acuAlign)+'">'+alignLabel(u.acuAlign)+'</span>'+
    '</div>'+
    '<div class="info-grid2">'+
      '<div class="ig2-item"><div class="ig2-label">Annual Cost</div><div class="ig2-val" style="color:var(--amber)">'+u.cost+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Aid Type</div><div class="ig2-val">'+u.aid+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Pre-PT Path</div><div class="ig2-val" style="color:var(--emerald)">'+u.prePT.split('—')[0].trim()+'</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">MLS Picks (5yr)</div><div class="ig2-val">'+u.proPlayers.mlsPicks5yr+' picks</div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Facilities</div><div class="ig2-val"><span class="fac-card-badge fac-'+facRating+'">'+facEmoji+' '+facLabel+'</span></div></div>'+
      '<div class="ig2-item"><div class="ig2-label">Soccer Level</div><div class="ig2-val" style="font-size:10.5px">'+u.soccerLevel.split('—')[0].trim()+'</div></div>'+
    '</div>'+
    gpaHtml+
    '<div class="conf-strip">'+
      '<span class="conf-lbl">5yr:</span>'+
      standingHtml+
      titlesNote+
    '</div>'+
    '<div class="card-footer2">'+
      '<div class="card-coach">Coach: <strong>'+u.coach.name+'</strong></div>'+
      '<div class="card-btns">'+
        '<button class="compare-btn'+(inSchol?' selected':'')+'" id="cbtn-'+u.id+'" onclick="toggleCompare(\''+u.id+'\',this)">'+(inSchol?'✓':'+')+' Compare</button>'+
        '<button class="detail-btn" onclick="openDetail(\''+u.id+'\')">Details →</button>'+
      '</div>'+
    '</div>';
  return el;
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
    ['Conference (last 5yr)',u=>`<div>${u.confRecord.map(r=>`<div style="font-size:11px;margin-bottom:2px"><span class="sy ${posColor(r.pos)}" style="margin-right:4px">${r.yr}</span>${r.pos}</div>`).join('')}</div>`],
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

function openDetail(id){
  const u=unis.find(x=>x.id===id);if(!u)return;
  document.getElementById('modal-title').textContent=u.full;
  document.getElementById('modal-sub').textContent=`${u.loc} · ${u.div} · ${u.conf}`;
  document.getElementById('modal-body').innerHTML=buildDetailBody(u);
  document.getElementById('modal').classList.remove('hidden');
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
          <tr><td style="color:var(--hint);padding:4px 0">Annual Cost</td><td style="color:var(--amber);font-weight:600">${u.cost}</td></tr>
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
        <p style="font-size:12.5px;color:var(--muted);line-height:1.7">When Olivier transfers mid-degree, World Education Services (WES) will assess completed ACU units. BIOL125 (Human Biology), ANAT100 (Anatomy), EXSC225 (Exercise Physiology), and EXSC322 (Advanced Physiology) are the units most likely to receive direct credit — potentially shortening the US degree by one semester. Platform Sports Management should coordinate a formal WES evaluation before finalising the shortlist.</p>
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
        ${Object.entries({tactical:'Tactical Development',technical:'Technical Development',fitness:'Fitness Programming',ptPath:'PT / Chiro Pathway'}).map(([k,l])=>`
        <div class="fit-row">
          <div class="fit-label">${l}</div>
          <div class="fit-track"><div class="fit-fill" style="width:${u.devScores[k]}%;background:${sc(u.devScores[k])}"></div></div>
          <div class="fit-num" style="color:${sc(u.devScores[k])}">${u.devScores[k]}</div>
        </div>`).join('')}
      </div>
      <div class="detail-block" style="margin-top:1rem"><h4>Overall Fit for Olivier</h4>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:.75rem">
          <div style="font-size:2.5rem;font-weight:800;color:${sc(u.fitOlivier)}" id="modal-fit-score-${u.id}">${u.fitOlivier}%</div>
          <p style="font-size:13px;color:var(--muted)">Dynamically calculated from Olivier's score weights. Move the ATAR slider on Explore to see how eligibility affects this score.</p>
        </div>
        ${(typeof buildScoreBreakdown === 'function' && athlete) ? buildScoreBreakdown(u, athlete, currentAtarGpa) : ''}
      </div>
    </div>
    <div class="mtab-content" id="tab-contact">
      ${u.div==='IVY'?`<div class="ivy-warning">⚠ Ivy League coaches cannot offer athletic scholarships. Contact should still go through Platform Sports Management — coach relationships matter for roster spots.</div>`:''}
      <div class="contact-block"><h4>${u.coach.name}</h4>
        <div class="contact-row"><div class="ci">Title</div><div class="cv">${u.coach.title}</div></div>
        <div class="contact-row"><div class="ci">Email</div><div class="cv"><a href="mailto:${u.coach.email}">${u.coach.email}</a></div></div>
        <div class="contact-row"><div class="ci">Phone</div><div class="cv">${u.coach.phone}</div></div>
        <div class="contact-row"><div class="ci">Website</div><div class="cv"><a href="${u.url}" target="_blank">Program Page →</a></div></div>
      </div>
      <div class="detail-block" style="margin-bottom:1rem"><h4>Coach Profile</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.7">${u.coach.profile}</p></div>
      <div class="tip-box"><p><strong>Platform Sports Management recommends:</strong> All contact should be coordinated through your agent. Coach introductions via a platform carry significantly more weight than cold emails. Include Olivier's highlights link, academic profile, and Australian background.</p></div>
      <div class="tip-box"><p><strong>What coaches want from an 8/10 midfielder:</strong> Pressing intensity, passing range, composure under pressure, work rate off the ball. Show defensive recovery, winning duels, variety — not just assists and goals.</p></div>
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
        <span class="fac-rating-badge fac-${u.facilityDetails.rating.toLowerCase().replace(' ','')}">${u.facilityDetails.rating} Facilities</span>
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

function onAtarSlide() {
  const atar = parseInt(document.getElementById('atar-slider').value);
  currentAtarGpa = atarToGpa(atar);

  // Update readout
  document.getElementById('atar-display').textContent = atar;
  document.getElementById('gpa-display').textContent = currentAtarGpa.toFixed(1);

  // Re-render all GPA rows dynamically
  refreshAllGpaRows();

  // Recalculate all fit scores against new GPA
  if (typeof recalculateAllScores === 'function' && athlete) {
    recalculateAllScores(athlete, currentAtarGpa);
  }

  // Update ATAR summary counts
  updateAtarCounts();
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

    // Also update the data-atargpa attribute for potential future filtering
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
      } else {
        if(![...vals].some(v=>c.dataset[type]===v)){ show=false; break; }
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
  updateFilterSummary(visible);
  const hasAny = Object.values(activeFilters).some(s=>s.size>0);
  const clearBtn = document.getElementById('filter-clear-btn');
  if(clearBtn) clearBtn.style.display = hasAny ? '' : 'none';
}

function clearAllFilters(){
  Object.keys(activeFilters).forEach(k=>activeFilters[k].clear());
  document.querySelectorAll('.fchip.active').forEach(b=>b.classList.remove('active'));
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
    <div class="contact-row"><div class="ci">Program</div><div class="cv"><a href="${u.url}" target="_blank">View →</a></div></div>
    ${u.div==='IVY'?'<div style="font-size:11px;color:var(--gold);font-weight:600;margin-top:4px">⚠ Ivy League — no athletic scholarships, need-based only</div>':''}</div>`;});
  container.innerHTML=html;
}
// ══════════════════════════════════════════════════
// CONFERENCES DATA & RENDER
// ══════════════════════════════════════════════════


function renderConferences(){
  const container=document.getElementById('conferences-container');
  const tiers=[
    {key:'Power 5 (D1)',label:'Power 5 Conferences — Elite Division I',cls:'tier-p5',intro:"The 'Big Five' soccer conferences that produce the majority of MLS draft picks. Getting into a Power 5 program requires elite highlights. These programs offer the strongest soccer development but the most competitive roster spots."},
    {key:'High Major (D1)',label:'High-Major Conferences — Very Strong D1',cls:'tier-d1',intro:'Just below Power 5 in profile but highly competitive. AAC and Big West programs are realistic D1 targets for Olivier with strong highlights — and several are in warm coastal cities.'},
    {key:'Ivy League (D1)',label:'Ivy League — Academic Elite, No Athletic Scholarships',cls:'tier-ivy',intro:'Unique financial model: no athletic scholarships, need-based aid only. Princeton is surging. GPA improvement essential.'},
    {key:'Mid-Major (D1)',label:'Mid-Major D1 — Competitive Regional Programs',cls:'tier-d1',intro:'Genuine D1 competition at more accessible scholarship levels. Charleston is the lifestyle pick.'},
    {key:'Division II',label:'Division II Conferences — Best Overall Value',cls:'tier-d2',intro:'Often the best overall balance for international athletes: real scholarships, playing time from year 1, strong academic programs, warm climates in Florida and Texas.'},
    {key:'NAIA',label:'NAIA — Generous Scholarships, Personal Development',cls:'tier-naia',intro:'No scholarship maximum in NAIA — full packages possible. Brian Finnegan at OCU has direct Australian connections.'},
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
      <div style="display:flex;gap:8px;margin-top:.75rem">
        <a href="mailto:${c.contact.email}" style="font-size:11.5px;font-weight:600;color:var(--indigo);text-decoration:none;background:var(--indigo3);padding:5px 10px;border-radius:6px;flex:1;text-align:center">✉ ${c.contact.email}</a>
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
    if(!u.fin) return;
    const btn = document.createElement('button');
    btn.className = 'fin-school-btn' + (finCurrentSchool&&finCurrentSchool.id===u.id?' selected':'');
    // Preview at 50% athletic only (one slider half way)
    const costNet = Math.round(u.fin.costNum * 0.5);
    btn.innerHTML = `<div class="fsb-name">${u.name}</div><div class="fsb-div"><span class="dbadge d-${u.div}" style="font-size:9px">${u.div}</span> ~${fmt(costNet)}/yr @ 50% ath</div>`;
    btn.onclick = ()=>selectFinSchool(u.id, btn);
    container.appendChild(btn);
  });
}

function selectFinSchool(id, btnEl){
  finCurrentSchool = unis.find(u=>u.id===id);
  document.querySelectorAll('.fin-school-btn').forEach(b=>b.classList.remove('selected'));
  if(btnEl) btnEl.classList.add('selected');
  document.getElementById('fin-model-wrapper').style.display='';
  document.getElementById('fin-school-title').textContent = `${finCurrentSchool.full} — Financial Model`;
  // Enforce school-specific athletic max cap on the slider (some schools can't do 50%)
  // For need-only schools (Ivy, D3) athletic slider is locked to 0
  const u = finCurrentSchool;
  const slAth = document.getElementById('sl-athletic');
  if(u.fin.aidType === 'need-only' || u.fin.maxAthletic === 0){
    slAth.max = 0; slAth.value = 0; slAth.disabled = true;
    slAth.style.opacity = '0.3';
  } else {
    // Max athletic is capped at school's real max, but ceiling is 50
    const athCap = Math.round(Math.min(u.fin.maxAthletic, 0.5) * 100);
    slAth.max = athCap; slAth.value = athCap; slAth.disabled = false;
    slAth.style.opacity = '1';
  }
  // Academic slider — always goes to 50 (represents up to 50% of cost as academic aid)
  const slAcad = document.getElementById('sl-academic');
  slAcad.max = 50; slAcad.value = 0;
  // Apply default full scenario
  applyScenario('full', document.querySelector('.sc-tab.active'));
  document.getElementById('fin-aid-note').innerHTML = `<strong>Aid type at ${finCurrentSchool.name}:</strong> ${u.fin.aidType.toUpperCase()} — ${u.fin.internationalNote}`;
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
  const athPct  = parseInt(document.getElementById('sl-athletic').value)  / 100; // 0–0.50
  const acadPct = parseInt(document.getElementById('sl-academic').value)  / 100; // 0–0.50
  const combinedPct = athPct + acadPct;
  const fx = parseFloat(document.getElementById('sl-fx').value);

  // Update labels
  document.getElementById('val-athletic').textContent  = Math.round(athPct*100)+'%';
  document.getElementById('val-academic').textContent  = Math.round(acadPct*100)+'%';
  document.getElementById('val-fx').textContent        = fx.toFixed(2);

  const totalCOA  = f.costNum;
  const athSchol  = Math.round(totalCOA * athPct);
  const acadSchol = Math.round(totalCOA * acadPct);
  const totalAid  = athSchol + acadSchol;
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
  const total4yr    = totalAnnual * 4;
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
    ${acadPct>0?`<div class="fin-row income"><span class="fr-label">🎓 Academic Scholarship (${Math.round(acadPct*100)}% of cost)</span><span class="fr-val">−${fmt(acadSchol)}</span></div>`:''}
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

  // ── 4-year block ──
  const savedTotal = totalAid * 4;
  document.getElementById('fin-4yr-block').innerHTML = `
    <div class="f4-label">4-Year Total Investment</div>
    <div class="f4-val">${fmt(total4yr)} USD</div>
    <div class="f4-sub">${fmtAUD(total4yr,fx)} AUD total · You save ${fmt(savedTotal)} over 4 years in scholarships</div>`;

  // ── Tips ──
  let tips = '';
  if(u.fin.aidType==='need-only'){
    tips = `<strong>Need-based only:</strong> ${u.name} has no athletic scholarships — the athletic slider is disabled. Academic aid here represents need-based grants based on family income documentation.`;
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
  const fx = 1.55;
  const athPct = 0.5; // 50% scenario
  const extras = 7500; // standard extras bundle

  const data = unis
    .filter(u=>u.fin)
    .map(u=>({
      u,
      net: Math.max(0, u.fin.costNum*(1-athPct)) + extras
    }))
    .sort((a,b)=>a.net-b.net);

  const maxNet = data[data.length-1].net;

  let html = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.25rem;overflow-x:auto">';
  data.forEach(({u,net})=>{
    const pct = Math.round((net/maxNet)*100);
    const barColor = net<15000?'var(--emerald)':net<30000?'var(--sky)':net<50000?'var(--amber)':'var(--rose)';
    html+=`<div class="fcbar-row" onclick="selectSchoolFromBar('${u.id}')" style="cursor:pointer">
      <div class="fcbar-name" title="${u.full}">${u.name}</div>
      <span class="fcbar-div"><span class="dbadge d-${u.div}" style="font-size:9px">${u.div}</span></span>
      <div class="fcbar-track">
        <div class="fcbar-fill" style="width:${pct}%;background:${barColor};min-width:${net>0?'40px':'0'}">${net>12000?fmt(net):''}</div>
        ${net===0?'<span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:700;color:var(--emerald)">FULL RIDE</span>':''}
      </div>
      <div class="fcbar-amt">${fmtAUD(net,fx)}<br><span style="font-size:9px;color:var(--hint)">AUD/yr</span></div>
    </div>`;
  });
  html += '<div style="font-size:11px;color:var(--hint);margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">Assumes 50% athletic scholarship + $7,500 USD living/personal costs. Sorted lowest to highest cost. Click any bar to model in detail above.</div></div>';
  container.innerHTML = html;
}

function selectSchoolFromBar(id){
  const u = unis.find(x=>x.id===id);
  if(!u) return;
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

// App initialised via loadData() → initApp()

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', loadData);
