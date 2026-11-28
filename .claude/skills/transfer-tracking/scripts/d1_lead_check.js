// C1 campaign (CLAUDE.md 6C), lead check: for each lead at one Division I program, find the player on that
// program's roster for his arrival season (or the next season), open his bio, and test whether the bio names
// the JUCO. Run on the program's own site. Jobs come from http://localhost:8799/leadjobs.json (loaded into
// window.name.jobs beforehand). Usage: await eval(code)('o797')  -> short summary; results in window.name.out.
(function (key) {
  return (async () => {
    let st = {}; try { st = JSON.parse(window.name || '{}'); } catch (e) {}
    st.out = st.out || {};
    const job = (st.jobs || {})[key];
    if (!job) return [key, 'no job'];
    const clean = s => (s || '').replace(/\s+/g, ' ').trim();
    const norm = s => clean(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    const results = [];
    const pages = {};
    async function roster(season) {
      for (const y of [String(season), season + '-' + String(season + 1).slice(2)]) {
        const u = job.base + y;
        if (pages[u] !== undefined) { if (pages[u]) return pages[u]; continue; }
        try {
          const r = await fetch(u); if (!r.ok) { pages[u] = null; continue; }
          const h = await r.text(); const doc = new DOMParser().parseFromString(h, 'text/html');
          if (!new RegExp(String(season)).test(doc.title)) { pages[u] = null; continue; }
          pages[u] = { url: u, doc }; return pages[u];
        } catch (e) { pages[u] = null; }
      }
      return null;
    }
    for (const it of job.items) {
      const want = norm(it.player).split(' ');
      const last = want[want.length - 1], first = want[0];
      const res = { player: it.player, jucoId: it.jucoId, season: it.season, onRoster: null, rosterUrl: null, bioUrl: null, bioNamesJuco: null, snippet: null };
      for (const s of [it.season, it.season + 1]) {
        const p = await roster(s); if (!p) continue;
        const a = [...p.doc.querySelectorAll('a[href*="/roster/"]')].find(x => {
          const n = norm(x.textContent); return n.includes(last) && n.split(' ')[0].startsWith(first.slice(0, 3));
        });
        if (!a) { if (res.onRoster === null) { res.onRoster = false; res.rosterUrl = p.url; } continue; }
        res.onRoster = s; res.rosterUrl = p.url;
        const href = a.getAttribute('href');
        try {
          const h = await (await fetch(href)).text();
          const t = clean(new DOMParser().parseFromString(h, 'text/html').body.textContent);
          const re = new RegExp(it.pattern, 'i'); const m = re.exec(t);
          res.bioUrl = href; res.bioNamesJuco = !!m;
          if (m) res.snippet = t.slice(Math.max(0, m.index - 120), m.index + 160);
        } catch (e) { res.bioUrl = href; }
        break;
      }
      results.push(res);
    }
    st.out[key] = { base: job.base, results, readAt: new Date().toISOString().slice(0, 10) };
    window.name = JSON.stringify(st);
    return [key, results.map(r => r.player.split(' ').pop() + ':' + (r.onRoster ? (r.bioNamesJuco ? 'yes' : 'bio-no') : 'not-on-roster')).join(' ')];
  })();
})
