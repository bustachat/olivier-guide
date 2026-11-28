// C1 campaign (CLAUDE.md 6C): read a Division I site's men's soccer rosters for 2021-2025 and keep
// every player whose previous-school text looks like a two-year college. Run in the browser on the
// school's own athletics site (same-origin fetch). Results accumulate in window.name.out[key] so
// they survive navigation; post them from http://localhost:8799/ with roster_receiver.py.
// Usage: eval(code)('creighton')   -> returns a short summary, never the rows.
(function (key) {
  return (async () => {
    let st = {}; try { st = JSON.parse(window.name || '{}'); } catch (e) {}
    st.out = st.out || {};
    const SEAS = ['2021', '2022', '2023', '2024', '2025'];
    const PATHS = ['/sports/mens-soccer/roster/', '/sports/msoc/roster/', '/sports/m-soccer/roster/', '/sports/soccer/roster/', '/sports/mens-soccer/roster/season/'];
    const KEEP = /college|\bcc\b|\bjc\b|c\.c\.|j\.c\.|community|junior/i;
    const clean = s => (s || '').replace(/\s+/g, ' ').trim();
    let base = null; const info = {}; const rows = [];
    for (const p of PATHS) {
      try {
        const r = await fetch(p + '2025');
        if (!r.ok) continue;
        const h = await r.text();
        if (/roster/i.test(h.slice(0, 20000)) && /2025/.test(h.slice(0, 20000)) && /soccer/i.test(h.slice(0, 20000))) { base = p; break; }
      } catch (e) {}
    }
    if (!base) info.err = 'no roster path';
    else for (const y of SEAS) {
      let h;
      try { const r = await fetch(base + y); if (!r.ok) { info[y] = 'http ' + r.status; continue; } h = await r.text(); }
      catch (e) { info[y] = 'fetch fail'; continue; }
      const doc = new DOMParser().parseFromString(h, 'text/html');
      let n = 0, prevCol = false;
      for (const t of doc.querySelectorAll('table')) {
        const hd = [...t.querySelectorAll('thead th')].map(x => clean(x.textContent).toLowerCase());
        if (!hd.length) continue;
        const ni = hd.findIndex(x => /name/.test(x));
        const pi = hd.map((x, i) => (/previous|last school|prior|hometown|high school/.test(x) ? i : -1)).filter(i => i >= 0);
        if (ni < 0 || !pi.length) continue;
        if (hd.some(x => /previous|last school|prior/.test(x))) prevCol = true;
        for (const tr of t.querySelectorAll('tbody tr')) {
          const c = [...tr.children].map(x => clean(x.textContent));
          if (!c[ni]) continue;
          n++;
          const prev = pi.map(i => c[i]).filter(Boolean).join(' / ');
          if (KEEP.test(prev)) rows.push({ season: +y, name: c[ni], prev });
        }
      }
      if (!n) for (const card of doc.querySelectorAll('.sidearm-roster-player')) {
        const name = clean(card.querySelector('.sidearm-roster-player-name')?.textContent);
        if (!name) continue;
        n++;
        const ps = card.querySelector('.sidearm-roster-player-previous-school');
        if (ps) prevCol = true;
        const prev = [...card.querySelectorAll('.sidearm-roster-player-previous-school,.sidearm-roster-player-highschool,.sidearm-roster-player-hometown')]
          .map(x => clean(x.textContent)).filter(Boolean).join(' / ');
        if (KEEP.test(prev)) rows.push({ season: +y, name, prev });
      }
      info[y] = n + (prevCol ? '' : ' (no previous-school field)');
    }
    const seen = new Set();
    const uniq = rows.filter(r => { const k = r.season + '|' + r.name + '|' + r.prev; if (seen.has(k)) return false; seen.add(k); return true; });
    st.out[key] = { base, info, rows: uniq, readAt: new Date().toISOString().slice(0, 10) };
    window.name = JSON.stringify(st);
    return [key, base, info, uniq.length];
  })();
})
