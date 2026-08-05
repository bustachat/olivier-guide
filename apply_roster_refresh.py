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


# CLAUDE.md 14 Opportunity Score -> trajectory table. The table gives a RANGE per row;
# picking a point in that range by feel makes two schools with the same opportunity score
# land on different trajectories, so position within the row is interpolated linearly from
# where opp sits in the row's own opp range, then rounded to the nearest 5. Deterministic
# and reproducible: same opp always yields the same trajectory.
ROWS = [  # (opp_lo, opp_hi, y1, y2, y3, y4) each pct as (lo, hi)
    (12, 16, (40, 50), (60, 70), (80, 80), (90, 90)),
    (8, 11, (25, 35), (45, 55), (70, 70), (85, 85)),
    (5, 7, (15, 25), (30, 40), (55, 65), (80, 80)),
    (1, 4, (10, 15), (20, 30), (45, 55), (75, 75)),
    (-4, 0, (5, 10), (15, 15), (35, 35), (65, 65)),
]


def opportunity_score(cleared, rising_sr, returning):
    """roster_analysis.py:296 — graduating*2 + rising_senior*1 - max(0, returning-3)*0.5."""
    return cleared * 2.0 + rising_sr * 1.0 - max(0, returning - 3) * 0.5


def round5(x):
    return math.floor(x / 5 + 0.5) * 5


def trajectory_for(opp):
    f = math.floor(opp)
    row = ROWS[0] if f >= 12 else ROWS[1] if f >= 8 else ROWS[2] if f >= 5 else ROWS[3] if f >= 1 else ROWS[4]
    lo, hi = row[0], row[1]
    t = min(1.0, max(0.0, (opp - lo) / float(hi - lo)))
    pcts = [round5(a + t * (b - a)) for (a, b) in row[2:]]
    yrs = [(2027, 'Yr 1 (Fr.)'), (2028, 'Yr 2 (So.)'), (2029, 'Yr 3 (Jr.)'), (2030, 'Yr 4 (Sr.)')]
    return pcts, [{'year': y, 'yr_label': lab, 'pct': p, 'label': label_for(p)}
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

        mo['available'] = True    # Wave 1 S2: stonybrook flips false->true here,
                                  # so mo_score() must see the real trajectory.
        mo['mf_total'] = p['mf_total']
        mo['roster_season'] = p['roster_season']          # same edit as mf_total (v44.32)
        mo['cleared_before_2027'] = len(p['cleared'])
        mo['cleared_names'] = p['cleared']
        mo['rising_senior_2027_count'] = len(p['rising_sr'])
        mo['rising_senior_2027_names'] = p['rising_sr']
        mo['rising_junior_2027_count'] = len(p['rising_jr'])
        mo['rising_junior_2027_names'] = p['rising_jr']
        mo['recruit_risk'] = p['recruit_risk']
        opp = opportunity_score(len(p['cleared']), len(p['rising_sr']), p['returning'])
        pcts, traj = trajectory_for(opp)
        mo['trajectory'] = traj
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
        print('%-12s mf=%-3s opp=%-5s traj=%-18s fit %s->%s  minutes %s->%s  value %s->%s'
              % (sid, p['mf_total'], opp, '/'.join(map(str, pcts)),
                 before[0], after[0], before[1], after[1], before[2], after[2]))

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
            recruit_risk='Medium', returning=1,
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
            recruit_risk='Medium', returning=3,
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
            recruit_risk='High', returning=3,
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
            recruit_risk='High', returning=6,
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
            recruit_risk='Medium', returning=4,
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
            recruit_risk='High', returning=5,
            pathway_note="Re-confirmed on the live 2026-27 gousfbulls.com roster (7 MFs of 28). 5 of 7 MFs are "
                         "club/academy-sourced (Florida Premier FC ECNL, Inter Miami CF MLS Next Pro, Sarpsborg FK, "
                         "Jacksonville FC MLS Next, Club Blooming) and only 2 are college transfers (Grand Canyon, "
                         "Western Oregon). Note the depth chart is young — 4 of 7 are sophomores who all return "
                         "through 2029, so freshman-friendly recruiting does not mean early minutes.",
        ),
    },
    'acc': {
        'virginia': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Brendan Lambe', 'Marco Dos Santos', 'Drew Serafino'],
            rising_sr=['Luke Burns'],
            rising_jr=['Sami Oulouheu', 'Bacary Tandjigora', 'Emmanuel Akinkoye'],
            returning=8, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 virginiasports.com roster (12 MFs of 29). Only 3 of 12 "
                         "list a previous college (Santa Clara, Boston College x2); the other 9 came straight from "
                         "high school or club. Freshmen are a third of the midfield group, so a true freshman can "
                         "still enter here — the constraint is depth, not the recruiting route.",
        ),
        'wakeforest': dict(
            mf_total=13, roster_season='2026-27',
            cleared=['Jose Perez', 'Jeffrey White', 'Tate Lorentz', 'Pierce Bateson'],
            rising_sr=['Marcos Miranda', 'Joel Torbic'],
            rising_jr=['David Nguema', 'Alfred Debah', 'Chandler Young'],
            returning=7, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 godeacs.com roster (13 MFs of 31). Just 1 of 13 MFs lists "
                         "a previous college (Marcos Miranda, John Brown) — the other 12 arrived directly from high "
                         "school or academy sides (Toronto FC, Barca Residency Academy, Asanska FC, Orange County SC). "
                         "One of the purest freshman-intake midfields in the batch.",
        ),
        'smu': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Alex Salvo', 'Jaylinn Mitchell'],
            rising_sr=['Tweneboa Kodua', 'Nick Harshaw', 'Dunes Nielsen', 'Andre Philibbosian'],
            rising_jr=['Franco Ocana', 'Landon Hickam', 'Caleb Bronold'],
            returning=3, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 smumustangs.com roster (9 MFs of 32). 5 of 9 arrived as "
                         "4-year transfers (Oral Roberts, Gardner-Webb, Bellarmine, Utah Tech, Seattle U) and 4 have "
                         "no previous college — a genuine split, hence Mixed. No JUCO intake, and notably no true "
                         "freshman midfielders at all on this roster, so freshman entry is possible but not the "
                         "primary route.",
        ),
        'duke': dict(
            mf_total=13, roster_season='2026-27',
            cleared=['Nikolai Ronaldo Bull Jorgensen', 'Thomas Vold'],
            rising_sr=['Jamie Kabuusu', 'Jonah Wolf', 'Julius Suber'],
            rising_jr=['Maxwell Simpson', 'Ian Hecker', 'Hugo Hill', 'Emmanuel Frimpong', 'Casey Bag'],
            returning=8, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 goduke.com roster (13 MFs of 28). 3 of 13 are 4-year "
                         "transfers (Saint Francis, Northeastern, Pacific); the remaining 10 came from high school or "
                         "club sides (New England Revolution, Colorado Rapids 2, Boston Bolts, Yokogawa Musashino FC). "
                         "Freshman-friendly on route, but the midfield is deep and young — 8 of 13 are underclassmen "
                         "who all return through 2029.",
        ),
        'louisville': dict(
            mf_total=9, roster_season='2026-27',
            cleared=[],
            rising_sr=['Giacomo Zizza', 'Håkon Edstrøm', 'Jack Lewis'],
            rising_jr=['Braydon Sellers', 'Fernando Sanchez'],
            returning=6, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 gocards.com roster (9 MFs of 27). 3 of 9 are 4-year "
                         "transfers (Saint Louis University, Lehigh, Evansville); 4 of 9 are true freshmen who came "
                         "straight in. Note NO midfielder graduates before Olivier's 2027 entry — the entire group "
                         "returns, which is why the opportunity score is the lowest in this batch despite the "
                         "freshman-friendly recruiting route.",
        ),
        'notredame': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Nico Bartlett', 'Nolan Spicer', 'Leo Brummell', 'Vlad Walent'],
            rising_sr=['Will Schroeder', 'Ian Shaul', 'Brady Hilden'],
            rising_jr=['Karson Baquero', 'Diego Green'],
            returning=5, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 fightingirish.com roster (12 MFs of 28). Not one of the 12 "
                         "MFs lists a previous college — the entire midfield was recruited straight out of high "
                         "school (Culver Military Academy, Shattuck St. Mary's, Montclair Kimberley). Notre Dame does "
                         "not use the transfer portal for midfielders.",
        ),
        'stanford': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Dylan Groeneveld'],
            rising_sr=['Trevor Islam', 'Alex Chow', 'TJ Kahoalii'],
            rising_jr=['Brad Bennett', 'Joshua Partal', 'Jude Stone', 'Jack Pymm', 'Tim Logan'],
            returning=7, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 gostanford.com roster (11 MFs of 28). No MF lists a "
                         "previous college — Stanford recruits its midfield directly out of high school. Entry is "
                         "freshman-friendly by route but the group is very young: 7 of 11 are freshmen or sophomores "
                         "who return through 2029, and only 1 senior clears before 2027.",
        ),
        'syracuse': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Jackson Miller'],
            rising_sr=['Nathan Scott', 'Quinn Olcott'],
            rising_jr=['Kelvin Da Costa', 'Sachiel Ming', 'Kristjan Fortier'],
            returning=7, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 cuse.com roster (10 MFs of 28). Syracuse's roster table "
                         "publishes only #, Name, Class, Pos and Hometown — there is no previous-school column, so "
                         "the transfer-vs-freshman split cannot be re-derived from the roster. Classification "
                         "retained from the earlier research pass; 4 of the 10 MFs are freshmen, which is consistent "
                         "with it. Treat as lower-confidence than schools that publish a previous-school field.",
        ),
        'unc': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Evans Dapaah'],
            rising_sr=['David Molina', 'Ryan Zellefrow'],
            rising_jr=['Charlie Antonelius', 'Nico Loebus'],
            returning=7, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 goheels.com roster (10 MFs of 31). The previous-school "
                         "column is mostly CLUBS, not colleges (KCCA FC, IF Brommapojkarna, Houston Dynamo, Stade "
                         "Brestois 29, Charlotte FC, Follo FK); only 3 of 10 are genuine college transfers (Vermont "
                         "x2, Campbell). Half the midfield are freshmen, and UNC recruits internationals directly "
                         "from club academies — the closest profile in this batch to Olivier's own route.",
        ),
        'cal': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Giancarlo Mota', 'Jack Bowers', 'Brendan Bell', 'Nik Laredo', 'Isaiah Thomas',
                     'Wisdom Onuoma', 'Adrian Jacobs'],
            rising_sr=['Junhwan Park', 'Kieran Bracken Serra', 'Malcolm Zalayet'],
            rising_jr=['Noe Morales'],
            returning=2, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 calbears.com roster (12 MFs of 27). Cal's card layout carries a "
                         "previous-school field but publishes it empty for every midfielder, so the transfer-vs-"
                         "freshman split cannot be re-derived; classification retained from the earlier pass. The "
                         "headline finding is turnover, not pathway: 7 of 12 MFs (6 seniors + 1 graduate) clear "
                         "before Olivier's 2027 entry and only 2 underclassmen remain — the largest midfield opening "
                         "in this batch by a wide margin.",
        ),
    },
    'big-east': {
        'georgetown': dict(
            mf_total=18, roster_season='2026-27',
            cleared=['Eric Howard', 'Matthew Van Horn', 'Mateo Ponce Ocampo', 'Matthew Helfrich', 'Jack Heaps'],
            rising_sr=['Aidan Godinho', 'David Urrutia', 'Jack Brown', 'Zayan Ahmed'],
            rising_jr=['Casey Milliken', 'Noah Satriano', 'Loukas Maroutsis', 'Charlie Rosenthal'],
            returning=9, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 guhoyas.com roster — 18 MFs of a 28-man squad, by far the "
                         "largest midfield group in this batch. Georgetown's roster table publishes no previous-"
                         "school column, so the transfer-vs-freshman split cannot be re-derived directly; every one "
                         "of the 18 lists a high school rather than a college (Shattuck Saint Mary's, St. Alban's, "
                         "Royal Russell), which is consistent with the retained classification. 5 of 18 are freshmen.",
        ),
        'stjohns': dict(
            mf_total=13, roster_season='2026-27',
            cleared=['Camron Boumsong'],
            rising_sr=['Alexander Romero', 'Kaief Tomlinson'],
            rising_jr=['Jace Sais', 'Andrew Porucznik', 'Charlie Joyce'],
            returning=10, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 redstormsports.com roster (13 MFs of 31). The table publishes "
                         "only #, Name, Class, Pos and Hometown — no previous-school column — so the split cannot be "
                         "re-derived; classification retained. 7 of the 13 MFs are freshmen (including three "
                         "Norwegians recruited together), which is strongly consistent with it. Only 1 MF clears "
                         "before 2027 against 10 returning underclassmen, so the queue ahead is long.",
        ),
        'creighton': dict(
            mf_total=13, roster_season='2026-27',
            cleared=['Diego Ferruzzi', 'Edward Morales', 'Allan Juarez'],
            rising_sr=['Miguel "Angel" Lopez', 'Toraji Narazaki', 'Brady Bragg'],
            rising_jr=['Lucas Cavalcante', 'Ayden Kokoszka', 'Ange Gbe'],
            returning=7, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 gocreighton.com roster (13 MFs of 29). 9 of 13 came "
                         "straight from high school; 4 list a previous college — 2 of them from the same JUCO (Iowa "
                         "Western), plus Central Arkansas and California. So the freshman route dominates, but "
                         "Creighton does run a repeat JUCO channel worth knowing about.",
        ),
        'uconn': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Max Gummesson'],
            rising_sr=['Matias Paredes', 'Aidan Sheppela', 'Yotaro Furutani', 'Mateo DePinho'],
            rising_jr=['Jacques Mason', 'Preston Alessio', 'Jack Ryan'],
            returning=5, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 uconnhuskies.com roster (10 MFs of 27). UConn's table carries "
                         "no previous-school column, so the split cannot be re-derived; classification retained. "
                         "Shape of the group favours a 2028 entry over 2027: only 1 MF clears before Olivier "
                         "arrives, but 4 more graduate the year after.",
        ),
        'providence': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Fernando Garcia Gil', 'Caleb Williams'],
            rising_sr=['Alvaro Maneiro', 'Brian Garrepy'],
            rising_jr=['Jeremy Munoz', 'Angelo Ventrella', 'Luis Gutierrez', 'Giuseppe Ciampa', 'Michael Vella'],
            returning=6, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 friars.com roster (10 MFs of 25). Only 2 of 10 are US "
                         "college transfers (Iona, Hofstra) and one more came from a Spanish club B side (UCAM "
                         "Murcia B); the other 7 arrived directly from high school. Half the midfield are sophomores "
                         "who return through 2029.",
        ),
        'villanova': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Marcello Mazzola', 'Josh Oladele', 'Mikhail Zaretser'],
            rising_sr=['Karson Vazquez'],
            rising_jr=['Gleb Bogdanov', 'Matthew Klann', 'Josh Rairick'],
            returning=5, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 villanova.com roster (9 MFs of 25). Villanova's card layout "
                         "carries a previous-school field but publishes it empty for every midfielder, so the split "
                         "cannot be re-derived; classification retained. 3 of 9 MFs clear before 2027 against a small "
                         "returning group, which is a reasonable ratio for a squad this size.",
        ),
        'xavier': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Nathan Trickett', 'Alejandro Silvestrini'],
            rising_sr=['Efraims Valutadatils', 'Fred Cotta', 'Immanuel Wayoro'],
            rising_jr=["Ryan D'urso", 'Johnny Gourley'],
            returning=5, recruit_risk='Medium',
            pathway='Mixed',
            pathway_note="Reclassified from Freshman-friendly on the live 2026-27 goxavier.com roster (10 MFs of 30). "
                         "4 of 10 MFs list a previous college and three of those are two-year programs — Iowa Western "
                         "CC, Snow College and Monroe (plus Rockhurst). The other 6 came straight from high school, "
                         "3 of them current freshmen. That is a genuine two-route midfield rather than a "
                         "freshman-intake one, and the JUCO channel is the single busiest in this batch.",
        ),
        'butler': dict(
            mf_total=9, roster_season='2026-27',
            cleared=[],
            rising_sr=['Haato Efune', 'Jaden Hancock'],
            rising_jr=['Luca Raso', 'Nacho de Miguel', 'Charlie Hosier', 'Kai Pope', 'Max Klein', 'Braden Benyr'],
            returning=7, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 butlersports.com roster (9 MFs of 26). 6 of 9 came "
                         "straight from high school, so the freshman route still dominates, but the 3 transfers all "
                         "arrived via two-year programs (Monroe CC, El Camino via Xavier) plus St. Louis University. "
                         "Note NO midfielder graduates before Olivier's 2027 entry — the whole group returns, which "
                         "drives the opportunity score to zero despite the accessible recruiting route.",
        ),
        'depaul': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Noeh Hernandez', 'Chase Stegall', 'Jordan Clagette'],
            rising_sr=['Eli Wachs', 'Max Padua'],
            rising_jr=['Ronan Selbo', 'Tyler Flowers', 'Nathan Laird'],
            returning=6, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 depaulbluedemons.com roster (11 MFs of 29). DePaul's table "
                         "publishes only #, Name, Class, Pos and Hometown — no previous-school column — so the split "
                         "cannot be re-derived; classification retained. 3 of 11 MFs are freshmen and the roster is "
                         "heavily Illinois-sourced, consistent with direct high-school recruiting.",
        ),
        'marquette': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Mateo Stoka', 'Jonathan Monreal-Herrera', 'Clayton Hamler'],
            rising_sr=['David Siemionko'],
            rising_jr=['Hudson Torrez', 'Emilio Maldonado Frei'],
            returning=5, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 gomarquette.com roster (9 MFs of 29). Marquette's table carries "
                         "no previous-school column, so the split cannot be re-derived; classification retained. 3 of "
                         "9 MFs are freshmen, including two internationals (Sweden, Switzerland) recruited straight "
                         "in, which is consistent with it. 3 of 9 clear before 2027.",
        ),
        'setonhall': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Matthew Iriarte', 'Nico Rubio'],
            rising_sr=['Sivert Ryssdalsnes', 'Til Kauschke', 'Hannes Ottosson', 'Akira Bofinger'],
            rising_jr=['Giacomo Mana', 'Sammy Sansone'],
            returning=5, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 shupirates.com roster (11 MFs of 28). Seton Hall's table "
                         "carries no previous-school column, so the split cannot be re-derived; classification "
                         "retained. The midfield is strongly international (Norway, Italy, Germany, Sweden) with 3 "
                         "freshmen, consistent with direct club/academy recruiting — a close profile match to "
                         "Olivier's own route.",
        ),
    },

    # ═══ WAVE 1 SESSION 2 ═══════════════════════════════════════════════════
    # big-ten / big-west / caa / d1-other, researched 2026-08-05 off each
    # school's live 2026-27 roster. Rosters on these hosts are SERVER-RENDERED
    # (position, academic year and previous-school column all in raw HTML), so
    # they were parsed rather than browsed; the extractor was control-tested
    # against 8 committed Session-1 schools and reproduced all 8 exactly.
    # `recruit_risk` is RETAINED from the stored value throughout — it is
    # unscored, and re-deriving 27 judgment values by a newly-invented rule was
    # not in this session's scope.
    'big-ten': {
        'indiana': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Alex Matthews', 'Jacopo Fedrizzi', 'Justin Shreffler', 'EJ Dreher', 'Wes Carnevale'],
            rising_sr=['Grant Paskus', 'Charlie Heuer'],
            rising_jr=[],
            returning=0, recruit_risk='Medium',
            pathway='Transfer-preferred',
            pathway_note="Reclassified from Freshman-friendly on the live 2026-27 iuhoosiers.com roster (7 MFs of "
                         "30). 4 of 7 list a previous 4-year college (Missouri State, Evansville, NIU, Cornell) "
                         "and there is NOT ONE first- or second-year player in the entire midfield — every MF is a "
                         "3rd, 4th or 5th year. Indiana is currently rebuilding its midfield through the portal "
                         "rather than through freshman intake. Note the shape cuts both ways: it produces the "
                         "largest opening in this batch (5 of 7 clear before 2027) but the route in is a transfer "
                         "slot, not a freshman one.",
        ),
        'maryland': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Leon Koehl', 'Albi Ndrenika', 'Zack Harris', 'Kenny Quist-Therson'],
            rising_sr=[],
            rising_jr=['Henry Bernstein'],
            returning=5, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 umterps.com roster (9 MFs of 25). Only 1 of 9 lists a "
                         "previous college (Zack Harris, CSUN); 4 of 9 are freshmen or redshirt freshmen recruited "
                         "straight in (DC United Academy, Ashanti/Exulted FC). Note NO midfielder is a junior, so "
                         "4 clear before Olivier's 2027 entry and the rest are all underclassmen.",
        ),
        'michigan': dict(
            mf_total=13, roster_season='2026-27',
            cleared=["Patrick O'Toole", 'Nico Pendleton', 'Michael Haikal', 'Duilio Herrera',
                     'Stefan Momcilovic', 'Murphy Parker', 'Joao Paulo Ramos', 'Dylan Davis'],
            rising_sr=['Kamau Brame'],
            rising_jr=['Joah Reyna'],
            returning=4, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 mgoblue.com roster (13 MFs of 32). Michigan's table publishes "
                         "no previous-school column, so the transfer-vs-freshman split cannot be re-derived; "
                         "classification retained from the earlier research pass and treated as lower-confidence. "
                         "The headline finding is turnover rather than pathway: 8 of 13 MFs clear before 2027, the "
                         "second-largest midfield opening in this batch.",
        ),
        'michiganstate': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Miles Merritt', 'Colin Arce'],
            rising_sr=['Jared Smid'],
            rising_jr=['Luke Spadafora', 'Peter Soudan', 'Justin Cassell', 'Kayden Hudson',
                       'Thatcher Hogan', 'Leo Conneh'],
            returning=8, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 msuspartans.com roster (11 MFs of 28). Just 1 of 11 lists "
                         "a previous college (Miles Merritt, Incarnate Word) — the other 10 came directly from high "
                         "school or club. Freshman-friendly on route, but the group is very young: 6 of 11 are "
                         "sophomores who all return through 2029, so early minutes are unlikely.",
        ),
        'northwestern': dict(
            mf_total=13, roster_season='2026-27',
            cleared=['Andrew Millar', 'Tyler Glassberg', 'Yuval Nimrodi', 'Marco Silva',
                     'Baraka Tarleton', 'Peter Riesz'],
            rising_sr=['Gabriel Smyth', 'James Spatzek'],
            rising_jr=['Sam Nagano', "Aidan O'Neill", 'Evrit Fisher'],
            returning=5, recruit_risk='High',
            pathway='Mixed',
            pathway_note="Reclassified from Freshman-friendly on the live 2026-27 nusports.com roster (13 MFs of "
                         "31). 5 of 13 MFs arrived as 4-year transfers (Vermont, St. John's, La Salle, Pittsburgh, "
                         "Evansville) and 8 came straight from high school or club — a genuine two-route midfield "
                         "rather than a freshman-intake one. No JUCO intake among current MFs. 6 of 13 clear before "
                         "2027, so both routes are live for a 2027 entry.",
        ),
        'ohiostate': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Andre Roberts', 'Ryan Hannosh', 'Jacob Maisonneuve'],
            rising_sr=['Victor Labite', 'Nick Skubis', 'Cole Evans'],
            rising_jr=['Aaron Hurge'],
            returning=4, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 ohiostatebuckeyes.com roster (10 MFs of 27). The roster table "
                         "publishes no previous-school column, so the split cannot be re-derived; classification "
                         "retained from the earlier pass and flagged lower-confidence. Shape favours a 2028 entry "
                         "over 2027: 3 MFs clear before Olivier arrives but 3 more graduate the year after.",
        ),
        'rutgers': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['William Pierce', 'Amer Lukovic', 'Francesco Di Ponzio'],
            rising_sr=['Lenny Aviles', 'Thomas Angelone', 'Dylan Carlson'],
            rising_jr=['Puis Ssebulime', 'Zach Mastrodimos', 'Jude Essuman', 'Joshua Jerome'],
            returning=4, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 scarletknights.com roster (10 MFs of 32). Rutgers' table "
                         "carries no previous-school column, so the split cannot be re-derived; classification "
                         "retained and treated as lower-confidence. Same 2028-over-2027 shape as Ohio State — 3 "
                         "clear now, 3 more the following year, against 4 returning sophomores.",
        ),
        'washington': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Cameron Cruz', 'Connor Lofy', 'Wyatt Lewis', 'Chad Sovde'],
            rising_sr=['Zach Ramsey', 'Alex Hall'],
            rising_jr=['Clarens Dollin', 'Kevin Hernandez', 'Osato Enabulele'],
            returning=4, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 gohuskies.com roster (10 MFs of 29). Washington publishes no "
                         "previous-school column, so the split cannot be re-derived; classification retained, "
                         "lower-confidence. Washington labels class years by ELIGIBILITY ORDINAL (1st–5th) rather "
                         "than Fr./So./Jr./Sr. — 4 of 10 MFs are 4th or 5th years clearing before 2027.",
        ),
        'wisconsin': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Robert Kaemmerer', 'Gianluca Del Priore'],
            rising_sr=['Julian Kuhr', 'Matthew Zachemski', 'Joon Han'],
            rising_jr=['Aidan Martinez'],
            returning=2, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 uwbadgers.com roster (7 MFs of 27). No previous-school column "
                         "is published, so the Mixed classification is retained rather than re-derived and should "
                         "be treated as lower-confidence. Small, top-heavy midfield: 5 of 7 are seniors or juniors, "
                         "leaving only 2 underclassmen behind them.",
        ),
    },

    'big-west': {
        'calpoly': dict(
            mf_total=5, roster_season='2026-27',
            cleared=['Brandon Newman', 'Benji Jimenez'],
            rising_sr=['Diego Guerra', 'Rylan Firouznam'],
            rising_jr=['Cole Aman'],
            returning=1, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 gopoly.com roster (5 MFs of 26). Cal Poly's column is "
                         "headed 'Previous School/Club' and all 5 MFs have an entry, but 4 of them are CLUBS, not "
                         "colleges (Portland Timbers2, San Jose Earthquakes II, Pateadores SC x2). Only Brandon "
                         "Newman (Columbia) is a genuine college transfer, so the midfield is club/academy-sourced "
                         "and the Freshman-friendly classification holds. Smallest midfield group in the batch.",
        ),
        'ucdavis': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Declan Horio'],
            rising_sr=['Gabriel Haggerty', 'Tristan Wouters', 'Rafael Matiello', 'Ben Elkins'],
            rising_jr=['Derrick Green', 'Ensio Sardans', 'Jackson Richardson', 'Kota Brown'],
            returning=4, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 ucdavisaggies.com roster (9 MFs of 36 — the largest squad "
                         "in the batch outside Mercyhurst). Only 1 of 9 lists a previous college (Ben Elkins, "
                         "Gonzaga); the other 8 came straight from high school or club. Strongly 2028-shaped: just "
                         "1 MF clears before 2027, but 4 more graduate the following year.",
        ),
        'ucirvine': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Hunny Yoo', 'Ferri Duran', 'Isaac Powell', 'Braden Ferreira'],
            rising_sr=['Isaiahs Gutierrez', 'Cade Williams'],
            rising_jr=[],
            returning=4, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 ucirvinesports.com roster (10 MFs of 28). 3 of 10 list a "
                         "previous school but only 2 are US college transfers, and BOTH are JUCO (Herkimer College, "
                         "Irvine Valley College) — Ferri Duran's Universitat Autonoma de Barcelona is a Spanish "
                         "university, not a US soccer transfer. The other 7 came direct, 4 of them current "
                         "freshmen, so Freshman-friendly holds, but note the live JUCO channel.",
        ),
        'ucriverside': dict(
            mf_total=8, roster_season='2026-27',
            cleared=['Jona Martinez', 'Ethan Gonzalez', 'Diego Ramirez'],
            rising_sr=['Tarek Hamideh', 'Diego Esquivel', 'Noa Wada'],
            rising_jr=['Adrian Diaz'],
            returning=2, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 gohighlanders.com roster (8 MFs of 32). 2 of 8 are "
                         "college transfers and they split across both routes — Ethan Gonzalez from UNLV (4-year) "
                         "and Diego Esquivel from Cuyamaca CC (JUCO) — which is exactly the Mixed profile already "
                         "stored. The other 6 arrived from high school or club sides.",
        ),
    },

    'caa': {
        'charleston': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Arnau Olle', 'Ezequiel Emanuele Goetzke', 'Hogan Walker'],
            rising_sr=['Stian Bendvold', 'Ramsey Ray'],
            rising_jr=['Dan Toulson', 'Federico Bellisi', 'Bemanzi Alibaruho', 'Reeves Cates', 'Paul Killeen'],
            returning=6, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 cofcsports.com roster (11 MFs of 28). Charleston's table "
                         "publishes no previous-school column, so the split cannot be re-derived; classification "
                         "retained and flagged lower-confidence. 5 of 11 are sophomores returning through 2029, so "
                         "the queue behind the 3 departing seniors is long.",
        ),
        'drexel': dict(
            mf_total=15, roster_season='2026-27',
            cleared=['Tiago Lima-Bittencourt', 'Will Starker', 'Max Haberl', 'Julian Pittaoulis'],
            rising_sr=['Tomislav Vrdoljak', 'Morgan Worsfold-Gregg', 'Sharif Mohammed', 'Mo Diallo',
                       'Gonzalo Alberola'],
            rising_jr=['Gianluca Grubic', 'Daniel Celso', 'Leon Park'],
            returning=6, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 drexeldragons.com roster (15 MFs of 29 — the largest midfield "
                         "group in this batch). No previous-school column is published, so the classification is "
                         "retained rather than re-derived and treated as lower-confidence. 4 clear before 2027 and "
                         "5 more the year after, but 15 midfielders in a 29-man squad is heavy competition.",
        ),
        'elon': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Martin Kozak', 'Jahmir Flowers', 'Ryan Manna'],
            rising_sr=['Weston Jonke', 'Daire McCarthy', 'Dominik Renz', 'Noah Sonne Kargo',
                       'JP Quigley', 'Ben Madore'],
            rising_jr=['Oscar Tonidandel'],
            returning=3, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 elonphoenix.com roster (12 MFs of 29). Elon publishes no "
                         "previous-school column, so the split cannot be re-derived; classification retained, "
                         "lower-confidence. Unusually top-heavy: 9 of 12 MFs are seniors or juniors, so only 3 "
                         "underclassmen sit behind them — a strong 2028 entry point.",
        ),
        'hofstra': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Sean Keane', 'David Citron'],
            rising_sr=['Henri Poll', 'Marc Perkuhn', 'Charlie Blair', 'Owen Haviland'],
            rising_jr=['Jack Benham', 'Axel Ruben'],
            returning=6, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 gohofstra.com roster (12 MFs of 27 — doubled from the 6 "
                         "recorded on the 2025-26 roster). No previous-school column is published, so the stored "
                         "Portal/JUCO-heavy classification is retained rather than re-derived and should be treated "
                         "as lower-confidence — note it is the one non-freshman-friendly value in the CAA file, so "
                         "it is worth re-testing when Hofstra next publishes the column.",
        ),
        'monmouth': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Sean Cadigan', 'Javier Losa', 'Ian Brunet'],
            rising_sr=['Brendan Tansey'],
            rising_jr=['Jessy Bichler'],
            returning=5, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 monmouthhawks.com roster (9 MFs of 26, up from 5 a year ago). "
                         "Monmouth's table carries no previous-school column, so the split cannot be re-derived; "
                         "classification retained, lower-confidence. 3 of 9 clear before 2027 against only 1 rising "
                         "senior, so the group behind is young.",
        ),
        'northeastern': dict(
            mf_total=14, roster_season='2026-27',
            cleared=['Matty Gardner'],
            rising_sr=['Ethan Kang', 'Richard Conces', 'Ignacio Doglioli'],
            rising_jr=['Julius Rüger', 'Derian Berisha', 'Will Schmidt', 'Asiah Carroll', 'Anthony Rapo'],
            returning=10, recruit_risk='Low',
            pathway_note="Re-confirmed on the live 2026-27 nuhuskies.com roster (14 MFs of 27). 13 of 14 MFs have a "
                         "previous-school entry, but almost every one is a CLUB or academy rather than a college — "
                         "Houston Dynamo (MLS NEXT), Toronto FC, Barca Residency Academy, Minnesota United II, "
                         "Atlanta United Academy, SC Verl II, Blau Weiss Gottschee. Only Ignacio Doglioli lists a "
                         "college (Bellarmine). That is direct academy recruiting, so Freshman-friendly is strongly "
                         "confirmed — but only 1 MF clears before 2027 against 10 returning underclassmen.",
        ),
        'stonybrook': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Kyle Smith', 'Justin Jean-Louis', 'Alex Fleury'],
            rising_sr=['Scemar Webb'],
            rising_jr=['Nokkvi Hjorvarsson', 'Kristoffer Aarflot'],
            returning=5, recruit_risk='Medium',
            # No `pathway`: Stony Brook publishes no previous-school column AND has no
            # prior classification to retain (this record was available:false until now),
            # so there is nothing to re-derive from and nothing to carry forward.
            pathway_note="FIRST population of this record — Stony Brook was minutesOutlook.available:false since "
                         "v21 because the athletics site was unreachable/off-season at every prior attempt (see "
                         "CLAUDE.md 6). Its live 2026-27 stonybrookathletics.com roster now renders normally: 9 MFs "
                         "of a 29-man squad, 3 clearing before Olivier's 2027 entry. The roster publishes no "
                         "previous-school column, so recruit_pathway is deliberately left UNSET rather than "
                         "guessed — there is no prior value to retain either.",
        ),
        'william_mary': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Hamilton Howes', 'Gabe Ruitenberg', 'Alexandros Katsari-Hoefer', 'Kai Feng'],
            rising_sr=['Thor Sigurjonsson'],
            rising_jr=['Beckham Harris', 'JT Quinter'],
            returning=6, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 tribeathletics.com roster (11 MFs of 28). Only 1 of 11 "
                         "lists a previous college (Kai Feng, VCU); the other 10 arrived directly from high school "
                         "or club. 4 clear before 2027 against just 1 rising senior.",
        ),
    },

    'd1-other': {
        'akron': dict(
            mf_total=11, roster_season='2026-27',
            cleared=['Jack Sullivan', 'Francisco Tolaba', 'Matt Dreas'],
            rising_sr=['Tyler Morck', 'Jack Roman'],
            rising_jr=['Thomas O’Rourke', 'Braxton Hayes'],
            returning=6, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 gozips.com roster (11 MFs of 29). NOT ONE of the 11 MFs "
                         "lists a previous college — the previous-school column is published and is empty for every "
                         "midfielder. That is the purest freshman-intake midfield in this batch and the strongest "
                         "possible confirmation of the stored classification. Akron does not use the portal for "
                         "midfielders.",
        ),
        'delaware': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Rich Monath', 'Jayden Jackson'],
            rising_sr=['Freddy Jeffreys', 'Rocco Pastore'],
            rising_jr=['Liam Penny'],
            returning=5, recruit_risk='Medium',
            pathway_note="Re-confirmed on the live 2026-27 bluehens.com roster (9 MFs of 29, up from 4 a year ago). "
                         "Just 1 of 9 lists a previous college (Jayden Jackson, Temple); the other 8 came straight "
                         "from high school, and the roster is heavily Mid-Atlantic-sourced (Philadelphia Union "
                         "Academy, Calvert Hall), consistent with direct high-school recruiting.",
        ),
        'denver': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['David Biggers', 'Luke Schultz', 'Holger Olsson'],
            rising_sr=[],
            rising_jr=['Andrew Mann', 'Hudson Tate', 'Anthony Masino'],
            returning=6, recruit_risk='High',
            pathway_note="Re-read on the live 2026-27 denverpioneers.com roster (9 MFs of 28). Denver publishes no "
                         "previous-school column, so the split cannot be re-derived; classification retained and "
                         "flagged lower-confidence. Note NO midfielder is a junior — 3 clear before 2027 and the "
                         "remaining 6 are all sophomores and freshmen who return through 2029 and beyond.",
        ),
        'gcu': dict(
            mf_total=7, roster_season='2026-27',
            cleared=['Martin Luala', 'Jorge Lopez'],
            rising_sr=['Damon Rouse', 'Cruzeiro Cruz'],
            rising_jr=['Toto Salama'],
            returning=3, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 gculopes.com roster (7 MFs of 26). GCU's table carries no "
                         "previous-school column, so the classification is retained rather than re-derived and "
                         "should be treated as lower-confidence. Small midfield group with an even spread — 2 "
                         "clear, 2 rising seniors, 3 underclassmen.",
        ),
        'mercyhurst': dict(
            mf_total=18, roster_season='2026-27',
            cleared=['Alvar Silva', 'Jo Hanamoto'],
            rising_sr=['Ronny Wakelin', 'Santiago Bustamante', 'Jero Bencomo', 'Rowan Slater',
                       'Paul Shaw', 'Kyle Joyce', 'Harrison Frearson'],
            rising_jr=['Santiago Giraldo', 'Tyler Prex', 'Vincent Armstrong', 'Tyler Hunter'],
            returning=9, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 hurstathletics.com roster — 18 MFs inside a 57-man "
                         "squad, by far the largest roster in the guide (verified twice, via the card layout and "
                         "the roster table independently). Only 2 of 18 list a previous college: Santiago "
                         "Bustamante (Francis Marion, 4-year) and Jo Hanamoto (Lane Community College, JUCO). The "
                         "other 16 came directly from high school or club, so Freshman-friendly holds — but with a "
                         "57-man squad and only 2 midfielders clearing before 2027, minutes are the constraint.",
        ),
        'uca': dict(
            mf_total=9, roster_season='2026-27',
            cleared=[],
            rising_sr=['Rico Duggan', 'Tristan Amezcua'],
            rising_jr=['Garner Wolfe', 'Vaclav Kozeny', 'Samuel Switzer'],
            returning=7, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 ucasports.com roster (9 MFs of 27). UCA combines "
                         "hometown and previous club in one column, and 7 of the 9 entries are CLUBS (New Mexico "
                         "United, SalPa, FK Dukla Prague, Grindavik, Kungsangens IF, GFI Academy, Little Rock "
                         "Rangers). Only 2 are colleges — William Carey (NAIA) and Irvine Valley College (JUCO) — "
                         "so the international-club route dominates and Freshman-friendly holds. Note NO midfielder "
                         "graduates before Olivier's 2027 entry: the whole group returns, which drives the "
                         "opportunity score to zero despite the accessible recruiting route.",
        ),
        'vermont': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Ezra Widman', 'Halim Bangura', 'Noel Bjork', 'Jeremy Tsang'],
            rising_sr=['Gabriel Chavez', 'Luis Vetter', 'Nash Barlow'],
            rising_jr=['Shalom Adja'],
            returning=2, recruit_risk='Medium',
            pathway_note="Re-read on the live 2026-27 uvmathletics.com roster (9 MFs of 30). Vermont publishes no "
                         "previous-school column, so the split cannot be re-derived; classification retained, "
                         "lower-confidence. Strong 2027 shape: 4 of 9 clear before Olivier arrives and 3 more are "
                         "rising seniors, leaving only 2 underclassmen behind them.",
        ),
    },

    # ── Wave 1 Session 3 (2026-08-05) ────────────────────────────────────────
    # d2 only. ivy (princeton, yale) is OUT OF SCOPE by owner ruling — the Ivy
    # League offers no athletic scholarships, so both stay available:false and
    # are not researched, even though their 2026-27 rosters parse cleanly.
    # 2 of the 6 flipped d2 schools were DEFERRED to Wave 2 as published-but-
    # not-populated (see the session notes): keiser (staff, zero players) and
    # barry (21 players vs 34, with ONE goalkeeper and 12 of 21 midfield-capable
    # — not a real squad shape).
    'd2': {
        'columbia_college': dict(
            mf_total=12, roster_season='2026-27',
            cleared=['Daniel Kent', 'Joshua Peterson', 'Alex Gatto', 'Charles McClain', 'Cooper Hayes'],
            rising_sr=['Tyler Kromer', 'Layton Dahl', 'Christian Goforth'],
            rising_jr=['Charlie Lafata', 'Bodie Rollins'],
            returning=4, recruit_risk='Low',
            pathway='Mixed',
            pathway_note="Re-derived from the live 2026-27 columbiacougars.com roster (12 MFs of 33). Columbia "
                         "publishes Hometown, High School and Previous School as three SEPARATE columns, so the "
                         "transfer split is directly readable: only 3 of 12 midfielders (25%) arrived as transfers "
                         "— Webber International (NAIA) plus two JUCOs, St. Louis CC and Jefferson College. The "
                         "other 9 have an empty previous-school cell, i.e. no prior college. Reclassified "
                         "Portal/JUCO-heavy -> Mixed: the JUCO route is real but is a minority of the midfield, "
                         "not its dominant source. Strong 2027 shape — 5 of 12 clear and 3 more are rising seniors.",
        ),
        'ocu': dict(
            mf_total=5, roster_season='2026-27',
            cleared=['Matheus Ambrozio', 'Kenz Toms'],
            rising_sr=['Hannan Ashraf', 'Ethan Zeinalpor'],
            rising_jr=[],
            returning=1, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 ocusports.com roster (5 MFs of 25, down from 10 of 29 "
                         "in 2025). OCU publishes a Prev. School column and it is emphatically JUCO-fed: both "
                         "midfielders with a previous college came from JUCOs (Seward County CC, Neosho County CC), "
                         "and the wider squad repeats the pattern (Hillsborough CC, Rose State College, Middle "
                         "Georgia, Pellissippi State CC, Lewis and Clark CC). Portal/JUCO-heavy confirmed, not "
                         "merely retained. CAVEAT: 3 of the 25 players are published with a BLANK position cell "
                         "(Joao Figueredo, Sebastian Castillo, Asher Trent), so mf_total counts only confirmed "
                         "midfielders; if all 3 were MFs the opportunity score moves 6.0 -> 7.0, which stays "
                         "inside the same trajectory row, so the outlook is unaffected either way.",
        ),
        'pba': dict(
            mf_total=10, roster_season='2026-27',
            cleared=['Niklas Mahler', 'Fabio Reck', 'Clement Scaccia', 'Titus Beuckman',
                     'Quinlan van Arkel', 'Marcel Duffau', 'Ugo Drieu'],
            rising_sr=[],
            rising_jr=['Julian Walby'],
            returning=3, recruit_risk='High',
            pathway_note="Re-confirmed on the live 2026-27 pbasailfish.com roster (10 MFs of 28). PBA publishes a "
                         "dedicated Previous School column and 6 of 10 midfielders arrived from another four-year "
                         "program (Grand View, Spring Hill, Hawaii Pacific, Mercy, Bridgeport, plus a German "
                         "institution) — no JUCOs among them, so Transfer-preferred is confirmed rather than "
                         "Portal/JUCO-heavy. The squad runs on graduate transfers: 12 of 28 players are listed "
                         "Gr., and SEVEN of the 10 midfielders clear before Olivier's 2027 entry, leaving three "
                         "underclassmen behind them. This is the largest midfield turnover in the d2 file.",
        ),
        'stedwards': dict(
            mf_total=9, roster_season='2026-27',
            cleared=['Shunji Watanabe', 'Holden Rabb', 'Matthew Devaney', 'Nico Weigandt'],
            rising_sr=['Jud Anderson'],
            rising_jr=['Filip Adamski', 'Armando Don Juan'],
            returning=4, recruit_risk='Low',
            pathway_note="Re-read on the live 2026-27 gohilltoppers.com roster (9 MFs of 39, up from 6 in 2025). "
                         "St. Edward's publishes no previous-school column at all — only Hometown / High School — "
                         "so the transfer-vs-freshman split cannot be re-derived; the Freshman-friendly "
                         "classification is RETAINED from the earlier pass and should be treated as "
                         "lower-confidence. CAVEAT: 6 of the 39 players are published with a BLANK position cell "
                         "(Rangel, Watterworth, Navarro, Baroldy, Ramirez Siliezar, Guajardo) and their player "
                         "bio pages carry no position field either, so mf_total counts only confirmed midfielders. "
                         "All 6 are Fr./So. and so could only add to the returning group: if every one were a "
                         "midfielder the opportunity score would fall 8.5 -> 5.5, which crosses a trajectory row. "
                         "Re-check once St. Edward's completes its position data.",
        ),
    },
}

if __name__ == '__main__':
    main(sys.argv[1])
