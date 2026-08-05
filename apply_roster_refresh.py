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
}

if __name__ == '__main__':
    main(sys.argv[1])
