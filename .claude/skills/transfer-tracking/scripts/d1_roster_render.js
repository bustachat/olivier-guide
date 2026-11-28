// C1 campaign (CLAUDE.md 6C), second pass: read the RENDERED roster page in front of the browser,
// for sites whose rosters load in the browser so d1_roster_sweep.js's fetch sees no players.
// Open https://<site>/sports/mens-soccer/roster/season/<year> (or the site's own season URL), wait,
// then run eval(code)('<key>', <year>). Rows accumulate in window.name.out[key].
(function (key, season) {
  let st = {}; try { st = JSON.parse(window.name || '{}'); } catch (e) {}
  st.out = st.out || {};
  const KEEP = /college|\bcc\b|\bjc\b|c\.c\.|j\.c\.|community|junior/i;
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const rows = []; let n = 0, prevField = false, layout = '';
  // WMT cards
  for (const c of document.querySelectorAll('.roster-card-item')) {
    const name = clean(c.querySelector('.roster-card-item__title')?.textContent);
    const pos = clean(c.querySelector('.roster-card-item__position')?.textContent);
    if (!name || /coach|director|trainer|manager|staff/i.test(pos)) continue;
    n++; layout = 'wmt-card';
    const parts = [];
    for (const f of c.querySelectorAll('.roster-player-card-profile-field')) {
      const lab = clean(f.querySelector('.roster-player-card-profile-field__label')?.textContent).toLowerCase();
      const val = clean(f.querySelector('.roster-player-card-profile-field__value')?.textContent);
      if (/previous|last school|prior/.test(lab)) prevField = true;
      if (/previous|last school|prior|hometown|high school|club/.test(lab) && val) parts.push(val);
    }
    const prev = parts.join(' / ');
    if (KEEP.test(prev)) rows.push({ season, name, prev });
  }
  // WMT list
  if (!n) for (const c of document.querySelectorAll('.roster-list-item')) {
    const posEl = c.querySelector('.roster-player-list-profile-field--position');
    if (!posEl) continue;
    // name field first: a comma selector returns the first match in DOM order, which is an empty image link
    const name = clean((c.querySelector('.roster-list-item__title') || c.querySelector('.roster-list-item__name') || c.querySelector('a'))?.textContent);
    if (!name) continue;
    n++; layout = 'wmt-list';
    const ps = c.querySelector('.roster-player-list-profile-field--previous-school');
    if (ps) prevField = true;
    const prev = [ps, c.querySelector('.roster-player-list-profile-field--hometown'), c.querySelector('.roster-player-list-profile-field--high-school')]
      .filter(Boolean).map(x => clean(x.textContent)).join(' / ');
    if (KEEP.test(prev)) rows.push({ season, name, prev });
  }
  // unlabelled list variant (e.g. Old Dominion): name in a *title* element, the rest as plain spans
  if (!n) for (const c of document.querySelectorAll('.roster-list-item, .rosters-list-item')) {
    const t = c.querySelector('[class*="title-link"], [class*="__title"]');
    const name = clean(t?.textContent);
    if (!name) continue;
    const leaves = [...c.querySelectorAll('span, strong, div')].filter(e => !e.children.length).map(e => clean(e.textContent)).filter(Boolean);
    if (leaves.some(x => /coach|director/i.test(x))) continue;
    n++; layout = 'list-unlabelled';
    const prev = leaves.filter(x => x !== name && !/^\d|lbs|″|'|full bio/i.test(x)).join(' / ');
    if (KEEP.test(prev)) rows.push({ season, name, prev });
  }
  // generic tables (rendered)
  if (!n) for (const t of document.querySelectorAll('table')) {
    const hd = [...t.querySelectorAll('thead th')].map(x => clean(x.textContent).toLowerCase());
    const ni = hd.findIndex(x => /name|player/.test(x));
    const pi = hd.map((x, i) => (/previous|last school|prior|hometown|high school/.test(x) ? i : -1)).filter(i => i >= 0);
    if (ni < 0 || !pi.length) continue;
    if (hd.some(x => /previous|last school|prior/.test(x))) prevField = true;
    for (const tr of t.querySelectorAll('tbody tr')) {
      const c = [...tr.children].map(x => clean(x.textContent));
      if (!c[ni]) continue;
      n++; layout = 'table';
      const prev = pi.map(i => c[i]).filter(Boolean).join(' / ');
      if (KEEP.test(prev)) rows.push({ season, name: c[ni], prev });
    }
  }
  // sidearm list items (e.g. Bradley)
  if (!n) for (const c of document.querySelectorAll('.sidearm-roster-list-item')) {
    const name = clean((c.querySelector('.sidearm-roster-list-item-name') || c.querySelector('h3, h2, a'))?.textContent);
    if (!name) continue;
    n++; layout = 'sidearm-list';
    if (c.querySelector('.sidearm-roster-list-item-previous-school')) prevField = true;
    const prev = [...c.querySelectorAll('.sidearm-roster-list-item-previous-school,.sidearm-roster-list-item-highschool,.sidearm-roster-list-item-hometown')]
      .map(x => clean(x.textContent)).filter(Boolean).join(' / ');
    if (KEEP.test(prev)) rows.push({ season, name, prev });
  }
  // sidearm cards (rendered)
  if (!n) for (const c of document.querySelectorAll('.sidearm-roster-player')) {
    const name = clean(c.querySelector('.sidearm-roster-player-name')?.textContent);
    if (!name) continue;
    n++; layout = 'sidearm-card';
    if (c.querySelector('.sidearm-roster-player-previous-school')) prevField = true;
    const prev = [...c.querySelectorAll('.sidearm-roster-player-previous-school,.sidearm-roster-player-highschool,.sidearm-roster-player-hometown')]
      .map(x => clean(x.textContent)).filter(Boolean).join(' / ');
    if (KEEP.test(prev)) rows.push({ season, name, prev });
  }
  const yearOnPage = (document.title.match(/20\d\d/) || [''])[0];
  const o = st.out[key] = st.out[key] || { base: 'rendered', info: {}, rows: [], readAt: new Date().toISOString().slice(0, 10) };
  o.info[season] = n + (prevField ? '' : ' (no previous-school field)') + (yearOnPage && yearOnPage !== String(season) ? ' (page title says ' + yearOnPage + ')' : '');
  o.rows = o.rows.filter(r => r.season !== season).concat(rows);
  window.name = JSON.stringify(st);
  return [key, season, layout, o.info[season], rows.length];
})
