// C1 campaign (CLAUDE.md 6C), 2020 check: collect EVERY player name on a program's 2020 roster, so a
// candidate first seen in 2021 can be tested for an earlier arrival. Two modes:
//   eval(code)('o536', '/sports/mens-soccer/roster/')   fetch mode: tries base+'2020', then base+'2020-21'
//   eval(code)('o742', null)                          page mode: reads the rendered page in front of you
// Results go to window.name.out['y2020_' + key] = {url, title, n, names[]}; returns a short summary.
(function (key, base) {
  return (async () => {
    let st = {}; try { st = JSON.parse(window.name || '{}'); } catch (e) {}
    st.out = st.out || {};
    const clean = s => (s || '').replace(/\s+/g, ' ').trim();
    const SEL = ['.sidearm-roster-player-name', '.sidearm-roster-list-item-name', '.roster-card-item__title',
                 '.roster-list-item__title', '.roster-card__title-link', '[class*="rosters-list-item__title"]'];
    function names(doc) {
      let out = [];
      for (const t of doc.querySelectorAll('table')) {
        const hd = [...t.querySelectorAll('thead th')].map(x => clean(x.textContent).toLowerCase());
        const ni = hd.findIndex(x => /^(full )?name$|^player$|^name/.test(x));
        if (ni < 0) continue;
        for (const tr of t.querySelectorAll('tbody tr')) {
          const c = [...tr.children].map(x => clean(x.textContent));
          if (c[ni]) out.push(c[ni]);
        }
        if (out.length) return out;
      }
      for (const s of SEL) {
        out = [...doc.querySelectorAll(s)].map(x => clean(x.textContent)).filter(Boolean);
        if (out.length) return out;
      }
      return out;
    }
    let res = { url: null, title: null, n: 0, names: [] };
    if (base) {
      for (const y of ['2020', '2020-21']) {
        try {
          const r = await fetch(base + y);
          if (!r.ok) continue;
          const h = await r.text();
          const doc = new DOMParser().parseFromString(h, 'text/html');
          const ns = names(doc);
          const title = clean(doc.title);
          if (ns.length && /2020/.test(title)) { res = { url: base + y, title, n: ns.length, names: ns }; break; }
          if (ns.length && !res.n) res = { url: base + y, title, n: ns.length, names: ns, warn: 'title has no 2020' };
        } catch (e) {}
      }
    } else {
      const ns = names(document);
      res = { url: location.pathname, title: clean(document.title), n: ns.length, names: ns };
      if (!/2020/.test(res.title)) res.warn = 'title has no 2020';
    }
    st.out['y2020_' + key] = res;
    window.name = JSON.stringify(st);
    return [key, res.n, (res.title || '').slice(0, 40), res.warn || ''];
  })();
})
