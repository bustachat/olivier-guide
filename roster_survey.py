"""Wave 1 Session 2 availability survey — big-ten, big-west, caa, d1-other.

Mirrors js/app.js rosterUrl() exactly (v44.33: no overrides map).
Classifies the season from the server-rendered <title>, hyphenated spans FIRST
so 2025-26 never reads as a 2026 season.
"""
import io, json, re, sys
import concurrent.futures as cf
import urllib.request, urllib.error

ROOT = r'C:\Claude Code Space\Scholarship Guide\Github Clone\olivier-guide'
CONFS = ['big-ten', 'big-west', 'caa', 'd1-other']
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')


def roster_url(u):
    base = (u.get('url') or '').rstrip('/')
    if not base:
        return None
    if base.endswith('/index'):
        return base
    return base + '/roster'


def fetch(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    })
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read(400000).decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, ''
    except Exception as e:
        return 'ERR:%s' % type(e).__name__, ''


HYPH = re.compile(r'20(2\d)\s*[-\u2013]\s*(\d{2})')
YEAR = re.compile(r'\b(20[23]\d)\b')


def classify(title):
    """Return (label, season_string). Hyphenated spans matched FIRST."""
    if not title:
        return 'no-title', ''
    m = HYPH.search(title)
    if m:
        s = '20%s-%s' % (m.group(1), m.group(2))
        return ('flipped' if s >= '2026-27' else 'prior'), s
    ys = YEAR.findall(title)
    if ys:
        y = max(ys)
        return ('flipped' if int(y) >= 2026 else 'prior'), y
    return 'no-year', ''


def title_of(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    if not m:
        return ''
    t = re.sub(r'\s+', ' ', m.group(1)).strip()
    return re.sub(r'&[a-z]+;|&#\d+;', ' ', t).strip()


def count_players(html):
    """Distinct /roster/<slug>/<id> links. 0 is UNKNOWN on table layouts."""
    ids = set(re.findall(r'/roster/[a-z0-9\-\._]+/(\d+)', html, re.I))
    return len(ids)


def main():
    rows = []
    for conf in CONFS:
        schools = json.loads(io.open('%s/data/%s.json' % (ROOT, conf), encoding='utf-8').read())
        for s in schools:
            mo = s.get('minutesOutlook') or {}
            rows.append(dict(conf=conf, id=s['id'], name=s['name'],
                             url=roster_url(s),
                             stored_season=mo.get('roster_season', ''),
                             stored_mf=mo.get('mf_total', ''),
                             available=mo.get('available')))

    def work(r):
        if not r['url']:
            r.update(status='NO-URL', title='', label='no-url', season='', players=0)
            return r
        st, html = fetch(r['url'])
        t = title_of(html)
        lab, seas = classify(t)
        r.update(status=st, title=t[:110], label=lab, season=seas,
                 players=count_players(html), bytes=len(html))
        return r

    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        rows = list(ex.map(work, rows))

    order = {'flipped': 0, 'prior': 1, 'no-year': 2, 'no-title': 3, 'no-url': 4}
    rows.sort(key=lambda r: (order.get(r['label'], 9), r['conf'], r['id']))

    print('%-11s %-16s %-8s %-9s %-9s %-4s %-7s  %s'
          % ('conf', 'id', 'label', 'season', 'stored', 'plyr', 'status', 'title'))
    print('-' * 150)
    for r in rows:
        print('%-11s %-16s %-8s %-9s %-9s %-4s %-7s  %s'
              % (r['conf'], r['id'], r['label'], r['season'] or '-',
                 r['stored_season'] or '-', r['players'], r['status'], r['title']))

    io.open(r'%s\survey_s2.json' % sys.path[0], 'w', encoding='utf-8').write(
        json.dumps(rows, indent=2, ensure_ascii=False))

    from collections import Counter
    print('\nTOTALS:', dict(Counter(r['label'] for r in rows)), ' n=%d' % len(rows))


if __name__ == '__main__':
    main()
