// roster_extractor.js — in-page roster reader for the C0 campaign (CLAUDE.md 6C).
//
// HOW IT IS USED (see roster_receiver.py for the other half)
//   1. Once per browser tab:  window.name = JSON.stringify({code: <this file's text>, out: {}})
//   2. On each roster page:   eval(JSON.parse(window.name).code)('schoolId')
//      -> stores every player in window.name (it survives navigation between
//         sites) and returns only a short summary, so the roster itself never
//         has to be re-typed through the conversation.
//   3. On the receiver page (http://localhost:8799): POST JSON.parse(window.name).out
//
// Positions and class years are captured EXACTLY as the page prints them. No
// normalising happens here: build_patches.py and derive_minutes.py own the rules.
//
// Layouts handled (in this order; the first that yields >= 12 players wins):
//   table      a <table> whose headers include a position and a class column
//   sidearm    classic Sidearm cards   .sidearm-roster-player
//   listcard   Sidearm list cards      .sidearm-list-card-item
//   wmtlist    WMT list view           .roster-list-item
//   wmtcard    WMT card view           .roster-card-item
//   plist      WMT player list (Penn State) .player-list-item
//   nextgen    newer Sidearm cards     .s-person-card
(function (schoolId) {
  const T = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const first = (root, sels) => { for (const s of sels) { const e = root.querySelector(s); if (e && T(e)) return T(e); } return ''; };
  const norm = h => h.toLowerCase().replace(/[^a-z]/g, '');
  const CLASS_RE = /^(r-|rs-|rs |redshirt[ -])?(fr|so|jr|sr|gr|fy|freshman|sophomore|junior|senior|graduate|grad|fifth|first|second|third|fourth|[1-6](st|nd|rd|th))\b/i;
  const POS_RE = /^(gk|g|goalkeeper|d|df|def|defender|defense|back|m|mf|mid|midfield|midfielder|cm|dm|am|f|fw|fwd|forward|striker|st|w|winger|att)(\s*[\/,&-]\s*[a-z]+)*$/i;
  let layout = '', players = [];

  // ── table ──
  const tables = [];
  document.querySelectorAll('table').forEach(tb => {
    const heads = [...tb.querySelectorAll('thead th, thead td')].map(T);
    const hs = heads.length ? heads : [...(tb.querySelector('tr') ? tb.querySelector('tr').children : [])].map(T);
    const H = hs.map(norm);
    const col = (exact, sub) => { let i = H.findIndex(h => exact.includes(h)); if (i < 0) i = H.findIndex(h => sub.some(s => h.includes(s))); return i; };
    const iPos = col(['pos', 'position'], ['pos']);
    const iCls = col(['cl', 'yr', 'year', 'class', 'academicyear', 'clyr', 'eligibility', 'acadyr', 'athletic'], ['class', 'year', 'elig']);
    const iName = col(['fullname', 'name', 'playername', 'player'], ['name']);
    if (iPos < 0 || iCls < 0 || iName < 0) return;
    const iHome = col(['hometown', 'hometownhighschool', 'hometownlastschool'], ['hometown']);
    const iPrev = col(['previousschool', 'lastschool', 'prevschool', 'previous', 'previousschoolclub', 'lastschoolclub'], ['previous', 'lastschool', 'prev']);
    const rows = [];
    tb.querySelectorAll('tbody tr').forEach(tr => {
      // Presto tables repeat the column label inside each cell ("Pos.: Goalkeeper", "Class: FR")
      const c = [...tr.children].map(T).map(v => v.replace(/^(no|name|pos|position|cl|class|yr|year|ht|wt|height|weight|hometown[^:]*|club[^:]*|previous[^:]*|last[^:]*|high school)\.?:\s*/i, ''));
      // Eastern Oklahoma State: each row carries one more cell than the header row (a duplicate number cell)
      if (hs.length && c.length > hs.length) c.splice(0, c.length - hs.length);
      if (c.length <= Math.max(iPos, iCls, iName) || !c[iName] || /^(name|full name)$/i.test(c[iName])) return;
      rows.push({ name: c[iName], pos: c[iPos], cls: c[iCls], hometown: iHome >= 0 ? c[iHome] : '', prev: iPrev >= 0 ? c[iPrev] : '' });
    });
    // Rose State: the table view leaves every position blank while the card view prints them; let the cards win
    if (rows.length && rows.filter(r => !r.pos).length > rows.length / 2 && document.querySelector('.sidearm-roster-player-position, .player-card')) return;
    tables.push({ rows, hasPrev: iPrev >= 0 });
  });
  tables.sort((a, b) => b.rows.length - a.rows.length);
  let hasPrevCol = false;
  if (tables.length && tables[0].rows.length >= 12) { layout = 'table'; players = tables[0].rows; hasPrevCol = tables[0].hasPrev; }

  const tryCards = (name, sel, fn) => {
    if (players.length >= 12) return;
    const out = [];
    document.querySelectorAll(sel).forEach(c => { const p = fn(c); if (p && p.name) out.push(p); });
    if (out.length >= 12) { layout = name; players = out; }
  };

  // ── Presto "player-card" view (NEO A&M): "Position: GK" / "Class: So" lines in the card's bio ──
  tryCards('prestocard', '.player-card', c => {
    const txt = c.innerText || '';
    const g = re => { const m = txt.match(re); return m ? m[1].trim() : ''; };
    const names = [...c.querySelectorAll('.player-short-bio a, .player-card-footer a, h3, h4, .name')].map(T).filter(Boolean);
    let name = names.find(n => / /.test(n) && !/full bio|view more|close/i.test(n)) || '';
    if (!name) { const m = txt.match(/#\d+\s*\n\s*(.+)\n\s*(.+)\n/); if (m) name = m[1].trim() + ' ' + m[2].trim(); }
    return { name, pos: g(/Position:\s*([^\n]*)/i), cls: g(/Class:\s*([^\n]*)/i), hometown: g(/Hometown[^:\n]*:\s*([^\n]*)/i), prev: g(/(?:Previous|Last)[^:\n]*:\s*([^\n]*)/i), hs: g(/High School:\s*([^\n]*)/i) };
  });

  // ── classic Sidearm cards ──
  tryCards('sidearm', '.sidearm-roster-players-container .sidearm-roster-player, li.sidearm-roster-player', c => {
    let pos = '';
    const pe = c.querySelector('.sidearm-roster-player-position');
    if (pe) {
      const long = pe.querySelector('.sidearm-roster-player-position-long-short.hide-on-small-down') || pe.querySelector('.text-bold') || pe.querySelector('span');
      pos = T(long) || T(pe).split(/\s{2,}|\d/)[0].trim();
    }
    const prevEl = c.querySelector('.sidearm-roster-player-previous-school');
    if (prevEl) hasPrevCol = true;
    return {
      name: first(c, ['.sidearm-roster-player-name h3 a', '.sidearm-roster-player-name a', '.sidearm-roster-player-name h3', '.sidearm-roster-player-name p']),
      pos, cls: first(c, ['.sidearm-roster-player-academic-year']),
      hometown: first(c, ['.sidearm-roster-player-hometown']),
      prev: T(prevEl), hs: first(c, ['.sidearm-roster-player-highschool'])
    };
  });

  // ── Sidearm list cards ──
  tryCards('listcard', '.sidearm-list-card-item', c => {
    const prevEl = c.querySelector('.sidearm-roster-list-item-previous-school, .sidearm-roster-player-previous-school');
    if (prevEl) hasPrevCol = true;
    return {
      name: first(c, ['.sidearm-roster-player-name', '.sidearm-list-card-details-link', 'h3 a', 'h3']),
      pos: first(c, ['.sidearm-roster-player-position-short', '.sidearm-roster-player-position-long-short', '.sidearm-roster-player-position']),
      cls: first(c, ['.sidearm-roster-player-academic-year', '.sidearm-roster-player-class']),
      hometown: first(c, ['.sidearm-roster-player-hometown']), prev: T(prevEl),
      hs: first(c, ['.sidearm-roster-player-highschool'])
    };
  });

  // ── WMT list view (coaches share the class; players have a position field) ──
  tryCards('wmtlist', '.roster-list-item', c => {
    const pos = first(c, ['.roster-player-list-profile-field--position']);
    if (!pos) return null;
    const prevEl = c.querySelector('.roster-player-list-profile-field--previous-school');
    if (prevEl) hasPrevCol = true;
    return {
      name: first(c, ['.roster-list-item__title', '.roster-list-item__name', 'h3', 'a']),
      pos, cls: first(c, ['.roster-player-list-profile-field--class-level']),
      hometown: first(c, ['.roster-player-list-profile-field--hometown']), prev: T(prevEl),
      hs: first(c, ['.roster-player-list-profile-field--high-school'])
    };
  });

  // ── WMT card view ──
  tryCards('wmtcard', '.roster-card-item', c => {
    const pos = first(c, ['.roster-player-card-profile-field__value--position', '.roster-card-item__position']);
    if (!pos || /coach|director|trainer|manager|analyst|operations|performance/i.test(pos)) return null;
    let cls = first(c, ['.roster-player-card-profile-field__value--class', '.roster-player-card-profile-field__value--class-level']);
    const basics = [...c.querySelectorAll('.roster-player-card-profile-field__value--basic, .roster-player-card-profile-field__value')].map(T);
    if (!cls) cls = basics.find(v => CLASS_RE.test(v)) || '';
    const lab = {};
    c.querySelectorAll('.roster-player-card-profile-field').forEach(f => {
      const l = T(f.querySelector('.roster-player-card-profile-field__label')), v = T(f.querySelector('.roster-player-card-profile-field__value'));
      if (l) lab[norm(l)] = v;
    });
    if ('previousschool' in lab || 'lastschool' in lab) hasPrevCol = true;
    return {
      name: first(c, ['.roster-card-item__title', 'h3', 'a']), pos, cls,
      hometown: lab.hometown || '', prev: lab.previousschool || lab.lastschool || '', hs: lab.highschool || ''
    };
  });

  // ── WMT ".roster-card" view (Clemson): class year is an unlabelled info item ──
  tryCards('rcard', '.roster-card', c => {
    if (c.closest('.roster-staff-members-cards, .roster-staff-members__block')) return null;
    const pos = first(c, ['.roster-card__position']);
    if (!pos || /coach|director|trainer|manager|analyst|operations|performance/i.test(pos)) return null;
    const info = [...c.querySelectorAll('.roster-players-cards-item__info-item')].map(T).filter(Boolean);
    const cls = info.find(v => CLASS_RE.test(v) && v.length < 22) || '';
    const rest = info.filter(v => v !== cls && !/^\d+[′'’]|lbs\b/i.test(v));
    return { name: first(c, ['.roster-card__title-link', '.roster-card__title']), pos, cls, hometown: rest[0] || '', prev: '', hs: rest[1] || '' };
  });

  // ── WMT ".player-list-item" view (Penn State): every field is a labelled title/value pair ──
  tryCards('plist', '.player-list-item', c => {
    const pos = first(c, ['.player-list-item__position']);
    if (!pos) return null;
    const lab = {};
    c.querySelectorAll('.profile-field-content').forEach(f => {
      const l = norm(T(f.querySelector('.profile-field-content__title'))), v = T(f.querySelector('.profile-field-content__value'));
      if (l && !(l in lab)) lab[l] = v;
    });
    const prevKey = Object.keys(lab).find(k => /previous|lastschool|priorschool|college/.test(k));
    if (prevKey) hasPrevCol = true;
    return {
      name: first(c, ['.player-list-item__title-link', '.player-list-item__title']), pos,
      cls: lab.class || lab.academicyear || lab.year || '',
      hometown: lab.hometown || '', prev: prevKey ? lab[prevKey] : '', hs: lab.highschool || ''
    };
  });

  // ── newer Sidearm ("nextgen") cards: fields are sr-only label + value pairs ──
  tryCards('nextgen', '.s-person-card', c => {
    const f = {};
    c.querySelectorAll('[data-test-id], .s-person-details__bio-stats-item, .s-person-card__content__person__location-item, .s-person-details__personal-single-line').forEach(e => {
      const sr = e.querySelector('.sr-only, .s-text-paragraph-small-bold');
      const l = norm(T(sr)); if (!l) return;
      const v = T(e).replace(T(sr), '').trim();
      if (v && !(l in f)) f[l] = v;
    });
    const name = first(c, ['.s-person-details__personal-single-line h3', 'h3', '.s-person-details__personal a']);
    const pos = f.position || '';
    if (!pos) return null;
    if ('previousschool' in f || 'lastschool' in f) hasPrevCol = true;
    return { name, pos, cls: f.academicyear || f.class || f.year || '', hometown: f.hometown || '', prev: f.previousschool || f.lastschool || '', hs: f.lastschool ? '' : (f.highschool || '') };
  });

  // tidy: drop leading jersey numbers, de-duplicate (some pages render list + grid)
  const seen = new Set();
  players = players.map(p => ({
    // National Park prints each name twice in one cell ("Joseph Jones Joseph Jones")
    name: (p.name || '').replace(/^#?\d+\s+/, '').replace(/\s+/g, ' ').trim().replace(/^(.+) \1$/, '$1'),
    pos: (p.pos || '').trim(), cls: (p.cls || '').trim(),
    hometown: (p.hometown || '').trim(), prev: (p.prev || '').trim(), hs: (p.hs || '').trim()
  })).filter(p => { const k = p.name.toLowerCase(); if (!p.name || seen.has(k)) return false; seen.add(k); return true; });

  const title = document.title;
  const seasonText = (document.querySelector('h1, h2') ? T(document.querySelector('h1, h2')) : '') + ' | ' + title;
  const count = re => players.filter(p => re.test(p.pos)).length;
  const summary = {
    id: schoolId, layout, n: players.length,
    gk: count(/^(gk|g|goalkeeper|goalie|keeper)\b/i), mfFirst: count(/^(m|mf|mid|midfield|midfielder|cm|dm|am)\b/i),
    blankPos: players.filter(p => !p.pos).length, blankCls: players.filter(p => !p.cls).length,
    oddPos: [...new Set(players.map(p => p.pos).filter(v => v && !POS_RE.test(v)))].slice(0, 6),
    oddCls: [...new Set(players.map(p => p.cls).filter(v => v && !CLASS_RE.test(v)))].slice(0, 6),
    combined: [...new Set(players.map(p => p.pos).filter(v => /[\/,&-]/.test(v)))],
    hasPrevCol, season: (seasonText.match(/20\d\d(-\d\d)?/g) || []).slice(0, 3), ready: document.readyState
  };
  try {
    const box = JSON.parse(window.name);
    box.out[schoolId] = { url: location.href, title, layout, hasPrevCol, players };
    window.name = JSON.stringify(box);
    summary.stored = Object.keys(box.out).length;
  } catch (e) { summary.stored = 'window.name not initialised'; }
  return summary;
})
