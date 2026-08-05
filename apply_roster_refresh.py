"""Wave 1 roster refresh — apply researched minutesOutlook + recompute the Change Type 3 cascade.

Cascade (CLAUDE.md 3a Type 3): minutesOutlook{} -> lensScores.minutes -> fitOlivier
-> lensScores.overall -> lensScores.value.
Formulas mirror js/scores.js exactly, including JS Math.round (half away from zero, toward +inf).
Usage: python apply_roster_refresh.py <conf> ; patches live in PATCHES[<conf>].
"""
import io, json, math, sys

ROOT = ''


def js_round(x):
    """JS Math.round: half rounds toward +infinity (Python's round() is banker's)."""
    return math.floor(x + 0.5)


D1_RATE_DIVISOR = 5.0594
NEXT_LEVEL_NEUTRAL = 0.3773
DIV_STRENGTH = {'D1': 1.0, 'IVY': 0.9, 'D2': 0.8, 'NAIA': 0.65, 'D3': 0.5, 'JUCO': 0.6}


def calc_dev_avg(s):
    ds = s.get('devScores')
    if not ds:
        return 0
    vals = list(ds.values())
    return js_round(sum(vals) / len(vals))


def next_level_factor(s):
    pp = s.get('proPlayers')
    nl = pp.get('nextLevel') if pp else None
    if not nl:
        return min(1, ((pp or {}).get('mlsPicks5yr') or 0) / 10)
    per = nl.get('perYear')
    if not isinstance(per, (int, float)) or isinstance(per, bool) or not math.isfinite(per):
        return NEXT_LEVEL_NEUTRAL
    return min(1, per / D1_RATE_DIVISOR)


def soccer_quality(s):
    return (calc_dev_avg(s) / 100 * 0.6) + (next_level_factor(s) * 0.3) + (DIV_STRENGTH.get(s.get('div'), 0.5) * 0.1)


def mo_score(s):
    mo = s.get('minutesOutlook')
    if not mo or not mo.get('available'):
        return 0.5
    t = mo.get('trajectory')
    if not t:
        return 0.5
    y1 = (t[0]['pct'] if len(t) > 0 else 50) / 100
    y2 = (t[1]['pct'] if len(t) > 1 else t[0]['pct']) / 100
    return min(1.0, y1 * 0.6 + y2 * 0.4)


def housing_penalty(s):
    h = (s.get('facilityDetails') or {}).get('housing')
    if not h:
        return 0
    if h.get('available') is False:
        return 6
    if h.get('available') == 'limited':
        return 3
    return 0


def funding_penalty(s):
    return {'none': 8, 'capped': 3}.get(s.get('fundingPathway'), 0)


def fit_score(s, athlete):
    w = athlete['scoreWeights']
    prefs = athlete['lifestylePrefs']
    wants_warm, wants_city = 'warm' in prefs, 'city' in prefs
    total = (soccer_quality(s) * w['soccerQuality']
             + mo_score(s) * w['minutesOutlook']
             + ((1 if s.get('city') else 0.3) if wants_city else 1) * w['city']
             + ((1 if s.get('warm') else 0.2) if wants_warm else 1) * w['climate'])
    return min(100, max(0, js_round(total) - housing_penalty(s) - funding_penalty(s)))


LABELS = [(80, 'Captain candidate'), (65, 'Established starter'), (50, 'Likely starter'),
          (35, 'Squad rotation'), (20, 'Bench / development'), (0, 'Development year')]


def label_for(pct):
    for lo, lab in LABELS:
        if pct >= lo:
            return lab
    return 'Development year'


def trajectory(pcts):
    yrs = [(2027, 'Yr 1 (Fr.)'), (2028, 'Yr 2 (So.)'), (2029, 'Yr 3 (Jr.)'), (2030, 'Yr 4 (Sr.)')]
    return [{'year': y, 'yr_label': lab, 'pct': p, 'label': label_for(p)}
            for (y, lab), p in zip(yrs, pcts)]


def main(conf):
    patches = PATCHES[conf]
    path = 'data/%s.json' % conf
    schools = json.loads(io.open(path, encoding='utf-8').read())
    athlete = json.loads(io.open('athletes/olivier.json', encoding='utf-8').read())
    budget = athlete.get('budgetUSD') or (athlete['budgetAUD'] / athlete['fxRate'])
    by_id = {s['id']: s for s in schools}

    for sid, p in patches.items():
        s = by_id[sid]
        mo = s['minutesOutlook']
        before = (s['fitOlivier'], s['lensScores']['minutes'], s['lensScores']['value'])

        mo['mf_total'] = p['mf_total']
        mo['roster_season'] = p['roster_season']          # same edit as mf_total (v44.32)
        mo['cleared_before_2027'] = len(p['cleared'])
        mo['cleared_names'] = p['cleared']
        mo['rising_senior_2027_count'] = len(p['rising_sr'])
        mo['rising_senior_2027_names'] = p['rising_sr']
        mo['rising_junior_2027_count'] = len(p['rising_jr'])
        mo['rising_junior_2027_names'] = p['rising_jr']
        mo['recruit_risk'] = p['recruit_risk']
        mo['trajectory'] = trajectory(p['pcts'])
        if 'pathway' in p:
            mo['recruit_pathway'] = p['pathway']
        if 'pathway_note' in p:
            mo['recruit_pathway_note'] = p['pathway_note']

        # ── cascade ──
        s['lensScores']['minutes'] = js_round(mo_score(s) * 100)
        s['fitOlivier'] = fit_score(s, athlete)
        s['lensScores']['overall'] = s['fitOlivier']
        afford = 1 - min(1, s['fin']['costNum'] / budget)
        s['lensScores']['value'] = js_round(s['fitOlivier'] * 0.6 + afford * 40)

        after = (s['fitOlivier'], s['lensScores']['minutes'], s['lensScores']['value'])
        print('%-12s fit %s->%s  minutes %s->%s  value %s->%s  (mf=%s, opp-traj=%s)'
              % (sid, before[0], after[0], before[1], after[1], before[2], after[2],
                 p['mf_total'], p['pcts']))

    io.open(path, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(schools, indent=2, ensure_ascii=False) + '\n')
    print('wrote', path)


PATCHES = {
    'aac': {
        'fau': dict(
            mf_total=5, roster_season='2026-27',
            cleared=['Felipe Santos'],
            rising_sr=['Manato Ogawa', 'David Jesus', 'Jonas Sundli-Hardig'],
            rising_jr=[],
            recruit_risk='Medium', pcts=[25, 40, 65, 80],
            pathway_note="Re-read on the live 2026-27 fausports.com roster (5 MFs of 30). FAU's roster table "
                         "publishes only a Hometown / High School column and no previous-school column, so the "
                         "transfer-vs-freshman split cannot be re-derived from the roster alone — the listed "
                         "entries are secondary schools (Hosoda Gaguen, Haugesund toppidrettgymnas), not colleges. "
                         "Classification retained from the earlier research pass; treat as lower-confidence than "
                         "schools whose roster publishes a previous-school field.",
        ),
        'fiu': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Jad Benjelloun', 'Owen Barnett', 'Thomas Sellwood'],
            rising_sr=['Leonardo Consoloni'],
            rising_jr=['Martin Piedeleu'],
            recruit_risk='Medium', pcts=[25, 40, 65, 80],
            pathway='Transfer-preferred',
            pathway_note="5 of 7 current MFs (71%) on the live 2026-27 fiusports.com roster arrived as transfers "
                         "from other 4-year programs (American International College, St. John's, Hofstra, Siena, "
                         "Seton Hall) rather than as true freshmen. The 2 true freshmen (Carrasco, Watt) came "
                         "directly from club academies in Spain and England (Salamanca CF, Wingate FC), not JUCO. "
                         "No JUCO transfers among current MFs.",
        ),
        'memphis': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Henrique Cruz', 'Christian Piccolotto', 'Saad Chaouki', 'Keanan Bader', 'Joshua Owens'],
            rising_sr=['Thomas Mancuso', 'Alessandro Peruz'],
            rising_jr=['Anthony Grudko', 'Ignacio Escamilla', 'Mathias Krohnstad'],
            recruit_risk='High', pcts=[45, 65, 80, 90],
            pathway='Portal/JUCO-heavy',
            pathway_note="8 of 10 current MFs (80%) on the live 2026-27 gotigersgo.com roster list a previous "
                         "college, including 2 sourced from JUCO (Barton County CC, Indian Hills CC) and 6 from "
                         "4-year programs (ETSU, Rider/Portland, UNCG/South Carolina, Holy Cross, Montevallo, "
                         "Malone, Old Dominion). Only 2 MFs (Grudko, Escamilla) have no prior college. Reclassified "
                         "from Transfer-preferred on this read: the intake is portal-dominated with live JUCO "
                         "recruiting, not just 4-year transfer preference.",
        ),
        'temple': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Rocco Haeufgloeckner', 'George Medill'],
            rising_sr=['Jayden Jackson', 'Lukas Egarter', "Aiden O'Sullivan", 'Harrison Dandridge'],
            rising_jr=['Teo Strand', 'Anthony Perez', 'Chase Jackson', 'Cohen Williams'],
            recruit_risk='High', pcts=[20, 35, 60, 80],
            pathway_note="Re-confirmed on the live 2026-27 owlsports.com roster (12 MFs of 28). The roster's "
                         "previous-school column holds clubs and academies, not colleges — Matchfit Academy, "
                         "Wolfsberger AC, FSV Mainz 05, PDA, Sporting KC, VBR Star, Seacoast United. Zero college "
                         "transfers among current MFs, so the midfield is built from direct freshman intake.",
        ),
        'uab': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Gael Zackrisson', 'Justin Vallejo', 'Alan Melendez'],
            rising_sr=[],
            rising_jr=['Matthew Garcia'],
            recruit_risk='Medium', pcts=[20, 35, 60, 80],
            pathway_note="Re-confirmed on the live 2026-27 uabsports.com roster (7 MFs of 29). Only 2 MFs are US "
                         "4-year transfers (Gardner-Webb, USC Upstate); 4 of 7 list no previous college at all and "
                         "3 of the 7 are true freshmen (Quevedo, Pike, Martin), so a freshman can still win a "
                         "midfield place here. Quevedo's listed UNIR is a Spanish online university, not a US "
                         "soccer transfer.",
        ),
        'usf': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Pedro Faife', 'Tyler Richardson'],
            rising_sr=[],
            rising_jr=['Luka Zujovic', 'Diego Sanchez', 'Jakob Auby', 'Abeselom Weldegiorgis'],
            recruit_risk='High', pcts=[15, 30, 55, 75],
            pathway_note="Re-confirmed on the live 2026-27 gousfbulls.com roster (7 MFs of 28). 5 of 7 MFs are "
                         "club/academy-sourced (Florida Premier FC ECNL, Inter Miami CF MLS Next Pro, Sarpsborg FK, "
                         "Jacksonville FC MLS Next, Club Blooming) and only 2 are college transfers (Grand Canyon, "
                         "Western Oregon). Note the depth chart is young — 4 of 7 are sophomores who all return "
                         "through 2029, so freshman-friendly recruiting does not mean early minutes.",
        ),
    },
}

if __name__ == '__main__':
    main(sys.argv[1])
