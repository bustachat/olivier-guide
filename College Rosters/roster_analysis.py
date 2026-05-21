#!/usr/bin/env python3
"""
Olivier Soccer Scholarship Guide - Roster Analysis Script v2
==============================================================

CHANGES FROM v1:
- Fixed Windows UTF-8 encoding crash on emoji output (root cause of v1 final crash)
- Corrected URLs for UCSB, Virginia, Cal State LA, St Edward's, Keiser
- Improved parser for SIDEARM card-layout sites (FIU, SMU, PBA, Lynn, Barry, OCU)
- Replaced unicode warning emoji with [WARN] tag for cross-platform compatibility
- Added manual_rosters.json support for sites that use JS-rendered rosters

USAGE (Windows):
    1. cd "C:\\Users\\pierr\\Downloads\\Scholarship Guide\\Code\\Olivier-Guide-v14\\College Rosters"
    2. python roster_analysis.py
    3. Open roster_report.md to read results
    4. For any school showing 'FAILED FETCH' or 0 players, see MANUAL FALLBACK
       section at the bottom of this file.
"""

import json
import re
import sys
import time
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: missing dependencies. Install with:")
    print("    pip install requests beautifulsoup4")
    sys.exit(1)


# Disable urllib3 SSL warnings when we fall back to verify=False
try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except Exception:
    pass


# ---------------------------------------------------------------------------
# 1. SCHOOL ROSTER URL CONFIG (corrected from v1)
# ---------------------------------------------------------------------------

SCHOOLS = [
    ('ucla',       'UCLA',                          'D1',   'https://uclabruins.com/sports/mens-soccer/roster/2025'),
    ('ucsb',       'UC Santa Barbara',              'D1',   'https://ucsbgauchos.com/sports/msoc/roster/2025'),
    ('usf',        'University of South Florida',   'D1',   'https://gousfbulls.com/sports/mens-soccer/roster/2025'),
    ('fiu',        'Florida International',         'D1',   'https://fiusports.com/sports/mens-soccer/roster/2025'),
    ('virginia',   'University of Virginia',        'D1',   'https://virginiasports.com/sports/msoc/roster'),
    ('wakeforest', 'Wake Forest University',        'D1',   'https://godeacs.com/sports/mens-soccer/roster/2025'),
    ('smu',        'Southern Methodist University', 'D1',   'https://smumustangs.com/sports/mens-soccer/roster/2025'),
    ('stjohns',    'St. Johns University',          'D1',   'https://redstormsports.com/sports/mens-soccer/roster/2025'),
    ('indiana',    'Indiana University',            'D1',   'https://iuhoosiers.com/sports/mens-soccer/roster/2025'),
    ('charleston', 'College of Charleston',         'D1',   'https://cofcsports.com/sports/mens-soccer/roster/2025'),
    ('pba',        'Palm Beach Atlantic',           'D2',   'https://pbasailfish.com/sports/mens-soccer/roster/2025'),
    ('lynn',       'Lynn University',               'D2',   'https://lynnfightingknights.com/sports/mens-soccer/roster/2025'),
    ('barry',      'Barry University',              'D2',   'https://gobarrybucs.com/sports/mens-soccer/roster/2025'),
    ('nova',       'Nova Southeastern',             'D2',   'https://nsusharks.com/sports/mens-soccer/roster/2025'),
    ('csula',      'Cal State LA',                  'D2',   'https://calstatelaathletics.com/sports/mens-soccer/roster'),
    ('stedwards',  'St. Edwards University',        'D2',   'https://sehilltoppers.com/sports/mens-soccer/roster'),
    ('ocu',        'Oklahoma City University',      'NAIA', 'https://ocustars.com/sports/mens-soccer/roster/2025'),
    ('keiser',     'Keiser University',             'NAIA', 'https://keiseruathletics.com/sports/mens-soccer/roster'),
    ('chapman',    'Chapman University',            'D3',   'https://chapmanathletics.com/sports/mens-soccer/roster/2025'),
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36'
}


# ---------------------------------------------------------------------------
# 2. FETCH WITH FALLBACKS
# ---------------------------------------------------------------------------

def fetch(url, timeout=20):
    """Fetch URL. On SSL error, retry without verification (some athletics sites have cert issues)."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        if r.status_code == 200:
            return r.text
        return None
    except requests.exceptions.SSLError:
        try:
            r = requests.get(url, headers=HEADERS, timeout=timeout, verify=False)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"    [WARN] fetch error: {type(e).__name__}: {str(e)[:120]}")
        return None


def fetch_with_fallbacks(url):
    """Try original URL, then strip /2025, then try /roster.aspx, then /roster."""
    html = fetch(url)
    if html:
        return html, url
    # Strip year suffix
    if url.endswith('/2025'):
        alt = url[:-5]
        html = fetch(alt)
        if html:
            return html, alt
    # Add /roster.aspx
    base = re.sub(r'/roster.*$', '/roster.aspx', url) if '/roster' in url else url
    if base != url:
        html = fetch(base)
        if html:
            return html, base
    return None, url


# ---------------------------------------------------------------------------
# 3. ROSTER PARSER (more flexible than v1)
# ---------------------------------------------------------------------------

def parse_sidearm_roster(html):
    """Extract player rows from athletics pages. Handles 2 layouts."""
    if not html:
        return []
    soup = BeautifulSoup(html, 'html.parser')
    players = []

    # ---- Strategy A: A real HTML table with proper headers
    for table in soup.find_all('table'):
        headers = [th.get_text(' ', strip=True) for th in table.find_all('th')]
        if not headers:
            continue
        joined = ' '.join(h.lower() for h in headers)
        has_name = 'name' in joined or 'player' in joined
        has_pos = 'pos' in joined
        has_class = 'yr' in joined or 'class' in joined or 'academic' in joined
        if has_name and has_pos and has_class:
            for row in table.find_all('tr')[1:]:
                cells = [c.get_text(' ', strip=True) for c in row.find_all(['td', 'th'])]
                if len(cells) < 3:
                    continue
                p = parse_row_cells(cells, headers)
                if p:
                    players.append(p)
            if players:
                return players

    # ---- Strategy B: SIDEARM card layout
    # Look for blocks containing 'Position X Academic Year Y'
    pattern = re.compile(
        r'Position\s+([A-Z/-]{1,8})\s+Academic Year\s+([A-Za-z\.\-]+)',
        re.IGNORECASE
    )
    seen_names = set()
    for elem in soup.find_all(['div', 'li', 'article']):
        elem_text = elem.get_text(' ', strip=True)
        if 'Position' not in elem_text or 'Academic Year' not in elem_text:
            continue
        if len(elem_text) > 800:
            continue  # too big = whole page, not single player
        name_tag = elem.find(['h3', 'h4'])
        if not name_tag:
            continue
        name = name_tag.get_text(' ', strip=True)
        if not name or len(name) > 60 or name in seen_names:
            continue
        m = pattern.search(elem_text)
        if not m:
            continue
        pos = m.group(1).strip()
        cls = m.group(2).strip()
        home_match = re.search(
            r'Hometown\s+(.+?)(?:Custom Field|Last School|Full Bio|Highlights|$)',
            elem_text
        )
        home = home_match.group(1).strip()[:80] if home_match else ''
        seen_names.add(name)
        players.append({
            'name': name,
            'pos': pos,
            'class': cls,
            'hometown': home,
            'height': '',
            'last_school': '',
        })
    return players


def parse_row_cells(cells, headers):
    hdr_lower = [h.lower() for h in headers]
    player = {'name': '', 'pos': '', 'class': '', 'hometown': '', 'height': '', 'last_school': ''}
    for i, cell in enumerate(cells):
        if i >= len(hdr_lower):
            break
        h = hdr_lower[i]
        if 'name' in h or h == 'player':
            player['name'] = cell.strip()
        elif 'pos' in h:
            player['pos'] = cell.strip()
        elif 'yr' in h or 'class' in h or 'academic' in h:
            player['class'] = cell.strip()
        elif 'hometown' in h:
            player['hometown'] = cell.strip()
        elif h in ('ht', 'height'):
            player['height'] = cell.strip()
        elif 'previous' in h or 'last' in h or 'high school' in h or 'club' in h:
            player['last_school'] = cell.strip()
    if player['name'] and player['pos'] and player['class']:
        return player
    return None


# ---------------------------------------------------------------------------
# 4. NORMALISATION
# ---------------------------------------------------------------------------

def normalise_position(pos):
    p = pos.upper().strip().replace('.', '')
    if p in ('GK', 'G', 'GOALKEEPER', 'KEEPER'): return 'GK'
    if p in ('D', 'DEF', 'DEFENDER', 'CB', 'LB', 'RB', 'FB', 'WB', 'B'): return 'D'
    if p in ('M', 'MF', 'MID', 'MIDFIELDER', 'CM', 'AM', 'DM', 'CDM', 'CAM', 'LM', 'RM'): return 'MF'
    if p in ('F', 'FW', 'FORWARD', 'ST', 'CF', 'LW', 'RW', 'W', 'WING'): return 'F'
    if '/' in p or '-' in p:
        if 'M' in p: return 'MF'
        if 'F' in p: return 'F'
        if 'D' in p: return 'D'
    return 'OTHER'


def normalise_class(cls):
    c = cls.replace('.', '').replace(' ', '').upper()
    is_red = c.startswith('R-') or (c.startswith('R') and len(c) > 1 and c[1] in 'JSF')
    if is_red:
        c_clean = c.replace('R-', '').lstrip('R')
    else:
        c_clean = c
    mapping = {
        'FR': (1, 'Freshman'), 'FRESHMAN': (1, 'Freshman'),
        'SO': (2, 'Sophomore'), 'SOPHOMORE': (2, 'Sophomore'),
        'JR': (3, 'Junior'), 'JUNIOR': (3, 'Junior'),
        'SR': (4, 'Senior'), 'SENIOR': (4, 'Senior'),
        'GR': (5, 'Graduate'), 'GRADUATE': (5, 'Graduate'),
    }
    if c_clean in mapping:
        return (*mapping[c_clean], is_red)
    return (0, cls, is_red)


# ---------------------------------------------------------------------------
# 5. ANALYSIS
# ---------------------------------------------------------------------------

def analyse_school(school_id, school_name, division, players):
    if not players:
        return {
            'school_id': school_id,
            'school_name': school_name,
            'division': division,
            'roster_total': 0,
            'fetch_failed': True,
            'players': [],
        }

    for p in players:
        p['pos_norm'] = normalise_position(p['pos'])
        year_num, year_label, is_red = normalise_class(p['class'])
        p['class_year_2025'] = year_num
        p['class_label'] = year_label
        p['is_redshirt'] = is_red
        if year_num == 0:
            p['status_2026'] = 'unknown'
        elif year_num >= 4:
            p['status_2026'] = 'graduated' if not is_red else 'returning_5th_year'
        elif year_num == 3:
            p['status_2026'] = 'rising_senior'
        elif year_num == 2:
            p['status_2026'] = 'rising_junior'
        elif year_num == 1:
            p['status_2026'] = 'rising_sophomore'

    by_pos = {'GK': 0, 'D': 0, 'MF': 0, 'F': 0, 'OTHER': 0}
    by_class = {'Freshman': 0, 'Sophomore': 0, 'Junior': 0, 'Senior': 0, 'Graduate': 0, 'Unknown': 0}
    for p in players:
        by_pos[p['pos_norm']] = by_pos.get(p['pos_norm'], 0) + 1
        by_class[p.get('class_label', 'Unknown')] = by_class.get(p.get('class_label', 'Unknown'), 0) + 1

    mfs = [p for p in players if p['pos_norm'] == 'MF']
    mf_graduating = [p for p in mfs if p['status_2026'] == 'graduated']
    mf_rising_senior = [p for p in mfs if p['status_2026'] == 'rising_senior']
    mf_returning = [p for p in mfs if p['status_2026'] in ('rising_junior', 'rising_sophomore', 'returning_5th_year')]

    opp_score = (
        len(mf_graduating) * 2.0
        + len(mf_rising_senior) * 1.0
        - max(0, len(mf_returning) - 3) * 0.5
    )

    return {
        'school_id': school_id,
        'school_name': school_name,
        'division': division,
        'roster_total': len(players),
        'composition_by_position': by_pos,
        'composition_by_class_2025': by_class,
        'midfielders_total': len(mfs),
        'midfielders_graduating_after_2025': [
            {'name': p['name'], 'class': p['class_label']} for p in mf_graduating
        ],
        'midfielders_rising_senior_2026': [
            {'name': p['name'], 'hometown': p.get('hometown', '')} for p in mf_rising_senior
        ],
        'midfielders_returning_competition': [
            {
                'name': p['name'],
                'class_2026': 'Jr.' if p['status_2026'] == 'rising_junior'
                              else 'So.' if p['status_2026'] == 'rising_sophomore'
                              else '5th yr',
                'hometown': p.get('hometown', '')
            }
            for p in mf_returning
        ],
        'opportunity_score': round(opp_score, 1),
        'fetch_failed': False,
        'players': players,
    }


# ---------------------------------------------------------------------------
# 6. MARKDOWN REPORT (UTF-8 safe, no emoji)
# ---------------------------------------------------------------------------

def build_report(results):
    md = []
    md.append("# Olivier Soccer Scholarship - 2026 Roster Opportunity Analysis\n")
    md.append("*Based on 2025 published rosters. Olivier is a central midfielder (8/10).*\n")
    md.append("---\n")

    md.append("## At-a-Glance Summary\n")
    md.append("| School | Div | Roster | MFs | MF Graduating | MF Rising Senior (2026) | Opportunity Score |")
    md.append("|---|---|---|---|---|---|---|")

    succeeded = [r for r in results if not r.get('fetch_failed')]
    failed = [r for r in results if r.get('fetch_failed')]
    sorted_results = sorted(succeeded, key=lambda r: -r['opportunity_score'])

    for r in sorted_results:
        md.append(
            f"| **{r['school_name']}** | {r['division']} | {r['roster_total']} | "
            f"{r['midfielders_total']} | "
            f"{len(r['midfielders_graduating_after_2025'])} | "
            f"{len(r['midfielders_rising_senior_2026'])} | "
            f"**{r['opportunity_score']}** |"
        )
    md.append("")

    if failed:
        md.append("### [FAILED FETCH] Manual entry required:")
        for r in failed:
            md.append(f"- {r['school_name']} ({r['division']}) - see MANUAL FALLBACK at end of script")
        md.append("")

    md.append("\n*Higher opportunity score = more midfielder slots opening up for Olivier's 2026 entry. "
              "2.0+ suggests realistic playing-time pathway. Below 0.5 suggests deep returning roster.*\n")
    md.append("---\n")

    md.append("## School-by-School Deep Dive\n")
    for r in sorted_results:
        md.append(f"### {r['school_name']} ({r['division']}) - Opportunity Score: {r['opportunity_score']}")
        md.append("")
        md.append(f"**Roster:** {r['roster_total']} players total")
        md.append("")
        pos = r['composition_by_position']
        pos_line = f"**Position breakdown:** GK {pos['GK']} | D {pos['D']} | MF **{pos['MF']}** | F {pos['F']}"
        if pos['OTHER']:
            pos_line += f" | Other {pos['OTHER']}"
        md.append(pos_line)
        md.append("")
        cls = r['composition_by_class_2025']
        md.append(
            f"**Class breakdown (2025 season):** Fr {cls['Freshman']} | "
            f"So {cls['Sophomore']} | Jr {cls['Junior']} | Sr {cls['Senior']} | Gr {cls['Graduate']}"
        )
        md.append("")

        if r['midfielders_graduating_after_2025']:
            md.append(f"**Midfielders gone for 2026** ({len(r['midfielders_graduating_after_2025'])}):")
            for p in r['midfielders_graduating_after_2025']:
                md.append(f"  - {p['name']} ({p['class']})")
            md.append("")

        if r['midfielders_rising_senior_2026']:
            md.append(
                f"**Midfielders in their final year for 2026** "
                f"({len(r['midfielders_rising_senior_2026'])}) - "
                f"likely starters Olivier ultimately replaces by 2027:"
            )
            for p in r['midfielders_rising_senior_2026']:
                line = f"  - {p['name']}"
                if p.get('hometown'):
                    line += f" ({p['hometown']})"
                md.append(line)
            md.append("")

        if r['midfielders_returning_competition']:
            md.append(
                f"**Returning midfielders Olivier competes with for 2026 minutes** "
                f"({len(r['midfielders_returning_competition'])}):"
            )
            for p in r['midfielders_returning_competition']:
                line = f"  - {p['name']} ({p['class_2026']})"
                if p.get('hometown'):
                    line += f" - {p['hometown']}"
                md.append(line)
            md.append("")

        md.append("---\n")

    md.append("## Methodology & Caveats\n")
    md.append("**Data source:** Each school's official athletics website, 2025 men's soccer roster page.\n")
    md.append("**Important timing caveat:** This is the 2025 fall roster. "
              "Players listed as Sr. or Gr. have already graduated. The 2026 fall roster will have:")
    md.append("- All 2025 freshmen now sophomores")
    md.append("- All 2025 sophomores now juniors")
    md.append("- All 2025 juniors now seniors *(rising seniors)*")
    md.append("- New 2026 freshman class (often 5-10 players plus transfer portal grads)")
    md.append("")
    md.append("**Opportunity score** is a heuristic, not a guarantee. Coaches actively recruit "
              "transfer-portal players to fill graduating slots. Platform Sports Management should "
              "confirm with each coach:")
    md.append("1. *How many central midfielders are in your 2026 recruiting class?*")
    md.append("2. *Of your 2025 sophomores and juniors at MF, how many do you project as 2026 starters?*")
    md.append("3. *What's the depth chart you're building toward 2026?*")
    md.append("")
    return "\n".join(md)


# ---------------------------------------------------------------------------
# 7. MAIN
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("Olivier Soccer Roster Analysis v2 - 19 schools")
    print("=" * 70)
    results = []

    for i, (school_id, school_name, division, url) in enumerate(SCHOOLS, 1):
        print(f"\n[{i}/{len(SCHOOLS)}] {school_name} ({division})")
        print(f"    URL: {url}")
        html, used_url = fetch_with_fallbacks(url)
        if html:
            players = parse_sidearm_roster(html)
            print(f"    [OK] parsed {len(players)} players from {used_url}")
            results.append(analyse_school(school_id, school_name, division, players))
        else:
            print(f"    [FAIL] could not fetch any URL variant")
            results.append(analyse_school(school_id, school_name, division, []))
        time.sleep(1.0)

    # Merge in any manual_rosters.json data (for sites that don't auto-parse)
    manual_path = Path(__file__).parent / 'manual_rosters.json'
    if manual_path.exists():
        try:
            manual = json.loads(manual_path.read_text(encoding='utf-8'))
            for school_id, players in manual.items():
                for i, r in enumerate(results):
                    if r['school_id'] == school_id and (r.get('fetch_failed') or r['roster_total'] == 0):
                        full = next((s for s in SCHOOLS if s[0] == school_id), None)
                        if full:
                            results[i] = analyse_school(school_id, full[1], full[2], players)
                            print(f"\n    [MANUAL] loaded {len(players)} players for {full[1]}")
        except Exception as e:
            print(f"    [WARN] manual_rosters.json error: {e}")

    out_dir = Path(__file__).parent
    json_path = out_dir / 'roster_data.json'
    md_path = out_dir / 'roster_report.md'

    # CRITICAL: explicit UTF-8 to avoid Windows cp1252 crash
    json_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )
    md_path.write_text(build_report(results), encoding='utf-8')

    print("\n" + "=" * 70)
    print(f"[OK] Wrote {json_path}")
    print(f"[OK] Wrote {md_path}")
    print("=" * 70)
    print("\nNEXT STEPS:")
    print("  1. Open roster_report.md to read the analysis")
    print("  2. For schools showing 'FAILED FETCH', see MANUAL FALLBACK below")
    print("  3. Paste roster_data.json contents back to Claude for v15 integration")
    print()


# ===========================================================================
# MANUAL FALLBACK INSTRUCTIONS
# ===========================================================================
#
# Some athletics sites use JavaScript to render rosters dynamically.
# Python's `requests` library only sees the initial HTML, not what
# JavaScript loads after page load. For these, do this manual workaround:
#
# STEP 1: Open the school's roster page in your browser. Wait for it to
#         fully load.
#
# STEP 2: For each player, visually note: name, position, class.
#
# STEP 3: Create a file called manual_rosters.json IN THE SAME FOLDER AS
#         THIS SCRIPT, with this format:
#
# {
#     "virginia": [
#         {"name": "John Smith", "pos": "MF", "class": "Sr."},
#         {"name": "Jane Doe", "pos": "GK", "class": "Jr."}
#     ],
#     "stedwards": [
#         {"name": "Player One", "pos": "MF", "class": "So."}
#     ]
# }
#
# STEP 4: Re-run python roster_analysis.py - it will pick up the manual
#         data automatically and produce the full report.
#
# Position codes accepted: GK, D, MF, F (or M, Fwd, Def, Goalkeeper, etc.)
# Class codes accepted: Fr., So., Jr., Sr., Gr. (or Freshman, Sophomore, etc.)
#
# ===========================================================================


if __name__ == '__main__':
    main()
