"""
v28.1 minutesOutlook update — CAA (7 schools) + Big West (6 schools)
Roster data verified via browser scraping June 2026.
Stony Brook (CAA) skipped — athletics site unreachable.
"""

import json
import math
import os

REPO = os.path.dirname(os.path.abspath(__file__))

CONF_FILES = {
    'caa':      os.path.join(REPO, 'data', 'caa.json'),
    'big-west': os.path.join(REPO, 'data', 'big-west.json'),
}

def calc_minutes(yr1, yr2, yr3):
    raw = yr1 * 0.4 + yr2 * 0.35 + yr3 * 0.25
    return round(raw) - 5

def pct_label(pct):
    if pct <= 12:  return "Fringe squad"
    if pct <= 22:  return "Squad rotation"
    if pct <= 38:  return "Regular contributor"
    if pct <= 55:  return "Key contributor"
    if pct <= 72:  return "Likely starter"
    return "Captain candidate"

# ─── School data ───────────────────────────────────────────────────────────────
# Format: id -> dict of minutesOutlook fields + yr percentages
SCHOOLS = {

    # ── CAA ──
    'william_mary': {
        'conf': 'caa',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 7,
        'cleared': 3,
        'cleared_names': ['Diego Garciarena', 'Landon Cartwright', 'Gabe Ruitenberg'],
        'rs_count': 2,
        'rs_names': ['Alex Garrison', 'Max Cooper'],
        'rj_count': 2,
        'rj_names': ['Clem Cartwright', 'Aiden Sena'],
        'recruit_risk': 'High',
        'yr1': 18, 'yr2': 32, 'yr3': 58, 'yr4': 80,
        'trajectory_note': '3 of 7 MFs clear before Olivier arrives (Sr×2, Gr×1). 4 remain including 2 rising juniors — competitive but manageable for a quality recruit.',
    },

    'hofstra': {
        'conf': 'caa',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 6,
        'cleared': 2,
        'cleared_names': ['Henri Poll', 'Charlie Blair'],
        'rs_count': 1,
        'rs_names': ['Owen Haviland'],
        'rj_count': 3,
        'rj_names': ['James York', 'Hayes Laibe', 'Konstantinos Karageorgis'],
        'recruit_risk': 'High',
        'yr1': 12, 'yr2': 22, 'yr3': 48, 'yr4': 75,
        'trajectory_note': 'Only 2 of 6 MFs clear. Heavy rebuild load with 3 rising juniors (Jr by 2027) — Olivier would enter a crowded midfield. Note: James York (#14) is Australian from Melbourne.',
    },

    'northeastern': {
        'conf': 'caa',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 12,
        'cleared': 10,
        'cleared_names': [
            'Jaden Prado', 'Alec Kenison', 'Kade Tepe', 'Fraser Brown', 'Christoph Schurz',
            'Tomas Sciarra', 'Bryce Flowers', 'Richard Conces', 'Gus Mendieta', 'Brady Elmblad'
        ],
        'rs_count': 2,
        'rs_names': ['Derian Berisha', 'Shai Saarony'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Low',
        'yr1': 45, 'yr2': 65, 'yr3': 80, 'yr4': 90,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). Massive 10/12 MF turnover — only 2 Freshmen remain by Fall 2027. Elite opportunity window. Northeastern\'s co-op model means fewer players per year.',
    },

    'drexel': {
        'conf': 'caa',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 12,
        'cleared': 5,
        'cleared_names': [
            'Tiago Lima-Bittencourt', 'Will Starker', 'Zain Akhtar', 'Max Haberl', 'Julian Pittaoulis'
        ],
        'rs_count': 4,
        'rs_names': ['Levi Christie', 'Morgan Worsfold-Gregg', 'Mo Diallo', 'Gonzalo Alberola'],
        'rj_count': 3,
        'rj_names': ['Gianluca Grubic', 'Jack Shannon', 'Leon Park'],
        'recruit_risk': 'High',
        'yr1': 12, 'yr2': 25, 'yr3': 50, 'yr4': 75,
        'trajectory_note': '5 of 12 MFs clear — but 7 remain across Year 1 and 2. Deep MF corps makes early minutes competitive. Opportunity improves Year 3+ as classes turn over.',
    },

    'delaware': {
        'conf': 'caa',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 4,
        'cleared': 2,
        'cleared_names': ['Rich Monath', 'Rocco Pastore'],
        'rs_count': 2,
        'rs_names': ['Liam Penny', 'Freddy Jeffreys'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Medium',
        'yr1': 20, 'yr2': 35, 'yr3': 60, 'yr4': 80,
        'trajectory_note': 'Small 4-player MF pool — 2 clear, 2 remain (both So). Only 2 competitors in Year 1, suggesting real starting potential for a quality CMF like Olivier.',
    },

    'elon': {
        'conf': 'caa',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 17,
        'cleared': 7,
        'cleared_names': [
            'Jordin Wilson', 'Daire McCarthy', 'Dominik Renz', 'JP Quigley',
            'Ben Madore', 'Carlos Levy', 'Noah Sonne Kargo'
        ],
        'rs_count': 5,
        'rs_names': ['Alex Wharton', 'Tønnes Daland', 'Oscar Tonidandel', 'Will Dunn', 'Graham Jones'],
        'rj_count': 5,
        'rj_names': ['Diego Thompson', 'Mohamed Kallon', 'Tristan D\'Adamo', 'Henry Mertsch', 'Robbie Reeves'],
        'recruit_risk': 'Very High',
        'yr1': 8, 'yr2': 15, 'yr3': 35, 'yr4': 65,
        'trajectory_note': 'Large 17-player MF pool with 10 remaining by Fall 2027. Highly competitive environment — Olivier would need exceptional performance to break through. Opportunity grows Year 3+ as pool thins.',
    },

    'monmouth': {
        'conf': 'caa',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 5,
        'cleared': 4,
        'cleared_names': ['Elias Stingl', 'Victor Andersson', 'Otto Moosbrugger', 'Kevin DeCapua'],
        'rs_count': 1,
        'rs_names': ['Tommy Damiano'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Very Low',
        'yr1': 45, 'yr2': 65, 'yr3': 80, 'yr4': 90,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). Elite window — 4 of 5 MFs clear before Olivier arrives. Only 1 rising senior remains in Year 1. Monmouth actively rebuilding CAA program.',
    },

    # ── Big West ──
    'calpoly': {
        'conf': 'big-west',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 6,
        'cleared': 4,
        'cleared_names': ['Diego Guerra', 'Rylan Firouznam', 'Brandon Newman', 'Benji Jimenez'],
        'rs_count': 1,
        'rs_names': ['Cole Aman'],
        'rj_count': 1,
        'rj_names': ['Liam Lambert'],
        'recruit_risk': 'Medium',
        'yr1': 30, 'yr2': 50, 'yr3': 70, 'yr4': 85,
        'trajectory_note': '4 of 6 MFs clear (R-Jr×2, Gr, Sr). Only 1 rising senior and 1 rising junior remain — good entry opportunity. Cal Poly\'s compact squad means Olivier could feature regularly from Year 1.',
    },

    'ucdavis': {
        'conf': 'big-west',
        'mf_year': 2026, 'plus_one': False,
        'mf_total': 8,
        'cleared': 3,
        'cleared_names': ['Gabriel Haggerty', 'Declan Horio', 'Cole Powell'],
        'rs_count': 2,
        'rs_names': ['Jackson Richardson', 'Cole McLemore'],
        'rj_count': 3,
        'rj_names': ['Diego Orosco', 'Ronaldo Melgoza', 'Chris Aguilar'],
        'recruit_risk': 'High',
        'yr1': 12, 'yr2': 25, 'yr3': 50, 'yr4': 75,
        'trajectory_note': 'Only 3 of 8 MFs clear — 5 remain across Year 1-2 including 3 rising juniors. Competitive midfield at a strong academic school. Opportunity opens more in Year 3+.',
    },

    'ucirvine': {
        'conf': 'big-west',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 7,
        'cleared': 5,
        'cleared_names': [
            'Hunny Yoo', 'Isaiahs Gutierrez', 'Justin Conyers', 'Isaac Powell', 'Braden Ferreira'
        ],
        'rs_count': 2,
        'rs_names': ['Luis Gomez', 'Matt Hagan'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Low',
        'yr1': 30, 'yr2': 50, 'yr3': 70, 'yr4': 85,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). 5 of 7 MFs clear — only 2 Freshmen (now So) remain. Strong opportunity window. UCI is Anteaters — warm Irvine campus, OC lifestyle.',
    },

    'ucriverside': {
        'conf': 'big-west',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 7,
        'cleared': 5,
        'cleared_names': [
            'Tarek Hamideh', 'Ethan Gonzalez', 'Jona Martinez', 'Diego Ramirez', 'Kevin Meza'
        ],
        'rs_count': 2,
        'rs_names': ['Silvio Termini', 'Adrian Diaz'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Low',
        'yr1': 30, 'yr2': 50, 'yr3': 70, 'yr4': 85,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). 5 of 7 CMs/MFs clear — strong turnover. Only 2 Freshmen (now So) compete in Year 1. Riverside campus inland SoCal, warm.',
    },

    'ucsd': {
        'conf': 'big-west',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 9,
        'cleared': 7,
        'cleared_names': [
            'Nolan Sanchez', 'Adam Hillis', 'Bryce Barnum', 'Ryan Namdar',
            'James Redington', 'Keenai Braun', 'Mhone Bogonko'
        ],
        'rs_count': 2,
        'rs_names': ['Tyler Cash', 'Sagar Patel'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Very Low',
        'yr1': 40, 'yr2': 60, 'yr3': 80, 'yr4': 90,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). Exceptional 7 of 9 MF turnover — only 2 Freshmen (now So) remain. Near-elite opportunity. UCSD La Jolla is premium coastal lifestyle.',
    },

    'csuf': {
        'conf': 'big-west',
        'mf_year': 2025, 'plus_one': True,
        'mf_total': 10,
        'cleared': 7,
        'cleared_names': [
            'Matthew Sacristan', 'Pablo Obrador-Ibanez', 'Jose de la Torre',
            'Fernando Valenzuela', 'Benjamin Bjorkman', 'Cesar Aubour', 'Nikolas Wheeler-Quintanilla'
        ],
        'rs_count': 3,
        'rs_names': ['Alex Lugo', 'Aiden Bengard', 'Griffin Blair'],
        'rj_count': 0,
        'rj_names': [],
        'recruit_risk': 'Low',
        'yr1': 30, 'yr2': 50, 'yr3': 70, 'yr4': 85,
        'trajectory_note': '⚠️ 2025 roster (+1 applied). 7 of 10 MFs clear — only 3 Freshmen (now So) remain. Strong opportunity. Fullerton warm campus near LA/Anaheim. CSUF is already a top scorer for Olivier.',
    },
}

# ─── Process ───────────────────────────────────────────────────────────────────
for conf_key, filepath in CONF_FILES.items():
    with open(filepath, encoding='utf-8') as f:
        schools = json.load(f)

    changed = 0
    for s in schools:
        sid = s['id']
        if sid not in SCHOOLS:
            continue
        d = SCHOOLS[sid]

        yr1, yr2, yr3, yr4 = d['yr1'], d['yr2'], d['yr3'], d['yr4']
        new_lensMin = calc_minutes(yr1, yr2, yr3)
        old_lensMin = s['lensScores']['minutes']
        delta = round((new_lensMin - old_lensMin) * 0.20)

        # Build trajectory
        trajectory = [
            {'year': 2027, 'yr_label': 'Yr 1 (Fr.)', 'pct': yr1, 'label': pct_label(yr1)},
            {'year': 2028, 'yr_label': 'Yr 2 (So.)', 'pct': yr2, 'label': pct_label(yr2)},
            {'year': 2029, 'yr_label': 'Yr 3 (Jr.)', 'pct': yr3, 'label': pct_label(yr3)},
            {'year': 2030, 'yr_label': 'Yr 4 (Sr.)', 'pct': yr4, 'label': pct_label(yr4)},
        ]

        s['minutesOutlook'] = {
            'available': True,
            f'mf_total_{d["mf_year"]}': d['mf_total'],
            'cleared_before_2027': d['cleared'],
            'cleared_names': d['cleared_names'],
            'rising_senior_2027_count': d['rs_count'],
            'rising_senior_2027_names': d['rs_names'],
            'rising_junior_2027_count': d['rj_count'],
            'rising_junior_2027_names': d['rj_names'],
            'recruit_risk': d['recruit_risk'],
            'trajectory': trajectory,
            'trajectoryNote': d['trajectory_note'],
        }

        s['lensScores']['minutes'] = new_lensMin
        s['lensScores']['overall'] = s['lensScores']['overall'] + delta
        s['fitOlivier'] = s['lensScores']['overall']

        print(f"  {sid}: lensMin {old_lensMin}->{new_lensMin} (d{new_lensMin-old_lensMin}), fitOlivier {s['fitOlivier']-delta}->{s['fitOlivier']}")
        changed += 1

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(schools, f, indent=2, ensure_ascii=False)

    print(f"\n{conf_key}: {changed} schools updated, file written.\n")

print("Done. Validate with: python -m json.tool data/caa.json && python -m json.tool data/big-west.json")
