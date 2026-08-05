"""Roster extractor for the 2026-27 refresh campaign.  Usage: python roster_extract.py <schoolId> [...]

Built and proven in Wave 1 Session 2 (big-ten/big-west/caa/d1-other, v44.39-42).

Many athletics hosts serve the roster table SERVER-RENDERED — position, academic
year AND the previous-school column all sit in raw HTML, and only the <title>
season year is injected client-side. Where that holds, extraction is a parse and
no browser is needed (25 of 28 schools in Session 2). Probe before assuming
otherwise. Known exceptions needing Chrome: the WMT card/list templates
(virginia, stanford, northwestern, pennstate) and Sidearm card layouts whose
companion table omits the Name column (mercyhurst).

*** CONTROL-TEST BEFORE TRUSTING IT ON NEW SCHOOLS. *** Run it over a handful of
already-committed schools and confirm it reproduces their stored buckets exactly.
That check is what caught both of this extractor's original bugs (short headers
`CL`/`Yr.`, and ordinal class years where a `4th`-year graduating senior silently
vanished from `cleared`).

Projects a 2026-27 roster forward to Olivier's Aug-2027 entry, using the same
buckets as College Rosters/roster_analysis.py:296 —
  cleared      = graduating (Sr./Grad/5th yr)
  rising_sr    = juniors in 2026-27
  rising_jr    = sophomores in 2026-27      (subset of `returning`)
  returning    = everyone not cleared and not a rising senior
Invariant: mf_total == cleared + rising_sr + returning.

Also pulls the Coaching Staff table (head coach check, Phase 1F) and the prior
season's MF count as the "published != populated" control (trap 4 / shape 3).
"""
import io, json, os, re, sys
import concurrent.futures as cf
import urllib.request, urllib.error
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')

# ── position normalisation (CLAUDE.md 15) ────────────────────────────────────
MF_TOKENS = {'M', 'MF', 'CM', 'DM', 'AM', 'CDM', 'CAM', 'MID', 'MIDFIELD',
             'MIDFIELDER', 'CENTRALMIDFIELDER', 'CENTERMIDFIELD'}
KNOWN_NON_MF = {'GK', 'G', 'GOALKEEPER', 'KEEPER', 'D', 'DF', 'DEF', 'DEFENDER',
                'DEFENSE', 'B', 'BACK', 'F', 'FW', 'FWD', 'FORWARD', 'ST',
                'STRIKER', 'W', 'WINGER', 'ATT', 'ATTACKER'}


def is_mf(pos):
    """True if any slash/dash-separated component is a midfield token."""
    if not pos:
        return False
    parts = re.split(r'[\/\-,&]| or ', pos.upper())
    for p in parts:
        t = re.sub(r'[^A-Z]', '', p)
        if t in MF_TOKENS:
            return True
    return False


def pos_unknown(pos):
    if not pos:
        return True
    for p in re.split(r'[\/\-,&]| or ', pos.upper()):
        t = re.sub(r'[^A-Z]', '', p)
        if t and t not in MF_TOKENS and t not in KNOWN_NON_MF:
            return True
    return False


# ── class-year normalisation, relative to the 2026-27 season ─────────────────
def bucket(cls):
    """-> 'cleared' | 'rising_sr' | 'rising_jr' | 'returning' | 'unknown'"""
    if not cls:
        return 'unknown'
    c = cls.upper().replace('.', ' ')
    c = re.sub(r'\s+', ' ', c).strip()
    # Ordinal eligibility labels (Indiana, Washington use these instead of
    # Fr./So./Jr./Sr.). Checked FIRST — '4th' is a graduating senior and would
    # otherwise fall through to 'unknown' and silently vanish from `cleared`.
    m = re.match(r'^(?:R[\s\-]*)?([1-6])(?:ST|ND|RD|TH)\b', c)
    if m:
        n = int(m.group(1))
        return ('returning' if n == 1 else 'rising_jr' if n == 2
                else 'rising_sr' if n == 3 else 'cleared')
    if re.search(r'\bGRAD|\bGR\b|\bGS\b|FIFTH|5TH|GRADUATE', c):
        return 'cleared'
    if re.search(r'\bSR\b|SENIOR', c):
        return 'cleared'
    if re.search(r'\bJR\b|JUNIOR', c):
        return 'rising_sr'
    if re.search(r'\bSO\b|\bSOPH|SOPHOMORE', c):
        return 'rising_jr'
    if re.search(r'\bFR\b|FRESH|FRESHMAN', c):
        return 'returning'
    return 'unknown'


# ── HTML table parser ────────────────────────────────────────────────────────
class T(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.cur, self.row, self.cell = [], None, None, None
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.depth += 1
            if self.depth == 1:
                self.cur = []
        elif tag == 'tr' and self.cur is not None:
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = []
        elif tag == 'br' and self.cell is not None:
            self.cell.append(' ')

    def handle_endtag(self, tag):
        if tag == 'table':
            if self.depth == 1 and self.cur is not None:
                self.tables.append(self.cur)
                self.cur = None
            self.depth = max(0, self.depth - 1)
        elif tag == 'tr' and self.row is not None:
            if self.cur is not None and self.row:
                self.cur.append(self.row)
            self.row = None
        elif tag in ('td', 'th') and self.cell is not None:
            txt = re.sub(r'\s+', ' ', ''.join(self.cell)).strip()
            if self.row is not None:
                self.row.append(txt)
            self.cell = None

    def handle_data(self, d):
        if self.cell is not None:
            self.cell.append(d)


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA,
                                               'Accept': 'text/html'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''
    except Exception as e:
        return 'ERR:%s' % type(e).__name__, ''


def col(headers, exact=(), sub=()):
    """Index of a header. EXACT (letters-only) match first, then substring.

    Exact-first matters: the class column is 'CL' at Louisville and 'Yr.' at
    Duke, and a substring search for 'cl' would happily match 'Club' (UC
    Riverside publishes one) and silently mis-read every class year.
    """
    norm = [re.sub(r'[^a-z]', '', h.lower()) for h in headers]
    for i, n in enumerate(norm):
        if n in exact:
            return i
    for i, h in enumerate(headers):
        hl = h.lower()
        for s in sub:
            if s in hl:
                return i
    return -1


C_NAME = (('fullname', 'name', 'playername'), ('full name', 'name'))
C_POS = (('pos', 'position'), ('pos',))
C_CLS = (('cl', 'yr', 'year', 'class', 'academicyear', 'clyr', 'eligibility'),
         ('academic year', 'class', 'eligib'))
C_PREV = (('previousschool', 'lastschool', 'prevschool', 'previous'),
          ('previous school', 'last school'))
C_HOME = (('hometown', 'hometownhighschool'), ('hometown',))


def parse_roster(html):
    p = T()
    p.feed(html)
    players, staff, hdrs = [], [], []
    for t in p.tables:
        if not t:
            continue
        flat = ' | '.join(t[0]).lower()
        # Staff tables come in two shapes: with a caption row ("Coaching Staff",
        # Delaware/Maryland) and without one, where the header row itself is
        # Image|Name|Title (Mercyhurst). Detect both, or the head-coach check
        # silently returns blank.
        capt = 'coaching staff' in flat or 'support staff' in flat
        head = t[1] if (capt and len(t) > 1) else t[0]
        ti = col(head, ('title',), ('title',))
        ni = col(head, *C_NAME)
        if ti >= 0 and ni >= 0 and col(head, *C_POS) < 0:
            for r in t[(2 if capt else 1):]:
                if 0 <= ni < len(r):
                    staff.append((r[ni], r[ti] if 0 <= ti < len(r) else ''))
            continue
        # roster table: needs a position column
        pi = col(t[0], *C_POS)
        if pi < 0 or len(t) < 5 or players:
            continue          # `players` guard: take the FIRST roster table only,
        h = t[0]              # but keep scanning so staff tables are still seen
        hdrs = h
        ni = col(h, *C_NAME)
        yi = col(h, *C_CLS)
        vi = col(h, *C_PREV)
        hi = col(h, *C_HOME)
        for r in t[1:]:
            if pi >= len(r):
                continue
            players.append(dict(
                name=r[ni] if 0 <= ni < len(r) else '',
                pos=r[pi],
                cls=r[yi] if 0 <= yi < len(r) else '',
                prev=r[vi] if 0 <= vi < len(r) else ('' if vi < 0 else ''),
                home=r[hi] if 0 <= hi < len(r) else '',
                has_prev_col=vi >= 0))
    return players, staff, hdrs


def analyse(url):
    st, html = get(url)
    if not html:
        return dict(status=st, ok=False)
    players, staff, hdrs = parse_roster(html)
    mfs = [p for p in players if is_mf(p['pos'])]
    unk_pos = sorted({p['pos'] for p in players if pos_unknown(p['pos'])})
    for m in mfs:
        m['bucket'] = bucket(m['cls'])
    b = {}
    for m in mfs:
        b.setdefault(m['bucket'], []).append(m['name'])
    returning = len(b.get('rising_jr', [])) + len(b.get('returning', []))
    return dict(
        status=st, ok=True, squad=len(players), mf_total=len(mfs),
        headers=hdrs,
        has_prev_col=bool(players and players[0]['has_prev_col']),
        prev_filled=sum(1 for m in mfs if m['prev'].strip()),
        cleared=b.get('cleared', []), rising_sr=b.get('rising_sr', []),
        rising_jr=b.get('rising_jr', []), other_returning=b.get('returning', []),
        unknown_cls=b.get('unknown', []), returning=returning,
        unknown_pos=unk_pos,
        head_coach=next((n for n, t in staff if re.search(
            r'head (men.s )?(soccer )?coach|director of men', t, re.I)), ''),
        staff=staff[:6],
        mfs=[dict(name=m['name'], pos=m['pos'], cls=m['cls'],
                  prev=m['prev'], bucket=m['bucket']) for m in mfs])


def main():
    ids = sys.argv[1:]
    schools = {}
    for conf in ['big-ten', 'big-west', 'caa', 'd1-other',
                 'aac', 'acc', 'big-east', 'd2', 'ivy']:
        for s in json.loads(io.open('%s/data/%s.json' % (ROOT, conf),
                                    encoding='utf-8').read()):
            schools[s['id']] = (conf, s)

    def work(sid):
        conf, s = schools[sid]
        base = (s.get('url') or '').rstrip('/')
        cur = base + '/roster'
        cur_r = analyse(cur)
        prev_r = analyse(cur + '/2025')          # control: prior season
        return sid, dict(conf=conf, name=s['name'], url=cur,
                         cur=cur_r, prev=prev_r)

    path = r'%s\rosters_s2.json' % sys.path[0]
    try:                                  # merge, don't clobber earlier runs
        out = json.loads(io.open(path, encoding='utf-8').read())
    except Exception:
        out = {}
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for sid, r in ex.map(work, ids):
            out[sid] = r

    io.open(path, 'w', encoding='utf-8').write(
        json.dumps(out, indent=2, ensure_ascii=False))

    print('%-14s %-5s %-6s %-6s %-5s %-5s %-5s %-5s %-6s %s'
          % ('id', 'squad', 'MF26', 'MF25', 'clr', 'rsSr', 'rsJr', 'ret', 'prevCol', 'head coach'))
    print('-' * 120)
    for sid in ids:
        r = out[sid]
        c, p = r['cur'], r['prev']
        if not c.get('ok'):
            print('%-14s FETCH FAILED %s' % (sid, c.get('status')))
            continue
        inv = 'OK' if c['mf_total'] == len(c['cleared']) + len(c['rising_sr']) + c['returning'] else 'MISMATCH'
        print('%-14s %-5d %-6d %-6s %-5d %-5d %-5d %-5d %-6s %-22s %s%s'
              % (sid, c['squad'], c['mf_total'],
                 p.get('mf_total', '?') if p.get('ok') else 'x',
                 len(c['cleared']), len(c['rising_sr']), len(c['rising_jr']),
                 c['returning'],
                 'Y' if c['has_prev_col'] else 'n',
                 c['head_coach'][:22],
                 '' if inv == 'OK' else ' !INV',
                 (' !POS:' + ','.join(c['unknown_pos'])[:40]) if c['unknown_pos'] else ''))
        if c['unknown_cls']:
            print('      !! unknown class year: %s' % ', '.join(c['unknown_cls']))


if __name__ == '__main__':
    main()
