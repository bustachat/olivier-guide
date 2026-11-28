"""Stage 0 of the C1 campaign (CLAUDE.md 6C): tracker leads + stored-roster leads -> data/juco-d1-transfers-2021-2025.json.

Input: the five TopDrawerSoccer tracker tables saved by roster_receiver.py under keys tds_2021..tds_2025.
One-off: refuses to overwrite once any row has moved past status "lead"."""
import json, os, re, glob, tempfile, collections, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
os.chdir(REPO)
TARGET = "data/juco-d1-transfers-2021-2025.json"
if os.path.exists(TARGET) and "--force" not in __import__("sys").argv:
    _old = json.load(open(TARGET, encoding="utf-8"))
    if any(r.get("status") != "lead" for r in _old.get("trackerLeads", []) + _old.get("storedRosterLeads", [])):
        raise SystemExit("Refusing to rebuild: rows beyond stage 0 exist (confirmations would be lost). Edit the file instead.")

inbox = json.load(open(os.path.join(tempfile.gettempdir(), "olivier_roster_inbox", "rosters_inbox.json"), encoding="utf-8"))
FILES = ['acc','big-ten','big-east','aac','big-west','caa','d1-other','juco','ivy','d2']
schools = {x['id']: x for f in FILES for x in json.load(open(f'data/{f}.json', encoding='utf-8'))}
jucos = {k: v for k, v in schools.items() if v['div'] == 'JUCO'}

# Hand-reviewed: outgoing names as printed -> guide JUCO id. "?" = plausible but must be confirmed at the source.
ACCEPT = {
 "Angelina College": "angelina_college", "Arizona Western": "arizona_western", "Arizona Western College": "arizona_western",
 "Barton Community College": "barton_cc", "Barton CC": "barton_cc", "Barton": "barton_cc", "Blinn College": "blinn_college",
 "Casper College": "casper_college", "Coastal Bend": "coastal_bend_cc", "Coffeyville Community College": "coffeyville_cc",
 "Coffeyville": "coffeyville_cc", "Cowley College": "cowley_cc", "Cowley College(m)": "cowley_cc", "Daytona State": "daytona_state",
 "Daytona State College": "daytona_state", "Eastern Florida State College": "efsc", "Harcum College": "harcum_college",
 "Iowa Lakes Community College": "iowa_lakes_cc", "Iowa Western Community College": "iowa_western", "Iowa Western": "iowa_western",
 "Iowa Western CC": "iowa_western", "Jacksonville College": "jacksonville_college", "Jefferson College": "jefferson_college_mo",
 "Johnson County Community College": "johnson_county_cc", "Lewis & Clark Community College": "lewis_clark_cc",
 "LSU-Eunice": "lsu_eunice", "LSU Eunice": "lsu_eunice", "Monroe College": "monroe_college", "North Idaho College": "north_idaho_college",
 "Northeast Community College": "northeast_cc", "Otero College": "otero_college", "Paris Junior College": "paris_jc",
 "Phoenix College": "phoenix_college", "Pima Community College": "pima_cc", "Salt Lake Community College": "slcc",
 "Salt Lake City Community College": "slcc", "Snow College": "snow_college", "Tyler(m)": "tyler_jc", "Tyler Junior College": "tyler_jc",
 "Utah State Eastern": "usu_eastern", "Western Nebraska Community College": "western_nebraska_cc",
 "Western Texas College": "western_texas", "Western Texas CC": "western_texas", "Yavapai College": "yavapai_college",
 "Indiana Hills Community College": "indian_hills",          # tracker typo for Indian Hills
}
UNSURE = {   # name could be the guide school or another one; confirm on the destination roster
 "Monroe": ("monroe_college", "bare 'Monroe' could be Monroe College (NY) or Monroe Community College (Rochester)"),
 "Jefferson County Community College": ("jefferson_college_mo", "could be Jefferson Community College (Watertown, NY), not Jefferson College (MO)"),
 "Angelica College": ("angelina_college", "no 'Angelica College' exists; probably a typo for Angelina College"),
 "Emory": ("oxford_college_emory", "most likely Emory University (D3), not Oxford College of Emory"),
}
REJECT = ["Georgia State","Dayton","Jacksonville","Washington & Jefferson College","Lewis & Clark College (Portland, D3)",
 "Monroe Community College (Rochester NY)","Auburn Montgomery","Iona","Northeastern","Northwestern","Northwestern Ohio","Northwest Nazarene",
 "Pacific","Western Illinois","Union College","Wright State","Christian Brothers","Lubbock Christian","Oklahoma Christian",
 "Mid-America Christian","Houston Christian","South Carolina","NC State"]

rows, seen = [], set()
for key, v in sorted(inbox.items()):
    if not key.startswith("tds_"): continue
    season = int(key[4:])
    for r in v["rows"]:
        if len(r) < 3 or r[0].lower() in ("name", "player"): continue
        m = re.match(r"^(GK|D|M|F)\s+(.*)$", r[0]); pos, name = (m.group(1), m.group(2)) if m else ("", r[0])
        out = r[1].strip()
        jid, note = ACCEPT.get(out), None
        if not jid and out in UNSURE: jid, note = UNSURE[out]
        if not jid: continue
        k = (name.lower(), jid)
        if k in seen: continue
        seen.add(k)
        rows.append({"player": name, "position": pos, "jucoId": jid, "jucoAsListed": out,
                     "destinationAsListed": r[2].strip(), "arrivalSeason": season, "status": "lead",
                     "leadSource": "topdrawersoccer " + str(season) + " men's DI transfer tracker",
                     "leadUrl": "https://www.topdrawersoccer.com" + v["url"], "matchNote": note,
                     "confirmUrl": None, "destinationDivisionAtArrival": None})

# Stored D1 rosters: previous-school mentions of a guide JUCO (arrival season unknown)
def pats(j):
    base = re.sub(r"\s*\(.*?\)", "", j["name"]).strip()
    stem = re.sub(r"\b(CC|College|Community College|Junior College|JC)\b", "", base).strip()
    return [re.compile(r"\b" + re.escape(stem) + r"\b\s*(CC|C\.C\.|JC|J\.C\.|College|Community College|Junior College|Comm)", re.I),
            re.compile(r"\b" + re.escape(base) + r"\b", re.I) if base != stem else None]
P = {k: [p for p in pats(v) if p] for k, v in jucos.items()}
P["iowa_western"].append(re.compile(r"\bIowa Western\b", re.I))
P["tyler_jc"].append(re.compile(r"\bTyler\b", re.I))
roster_rows = []
for f in glob.glob("data/rosters/*/*.json"):
    sid = os.path.basename(os.path.dirname(f))
    if sid not in schools or schools[sid]["div"] not in ("D1", "IVY"): continue
    snap = json.load(open(f, encoding="utf-8"))
    for p in snap.get("players", []):
        prev = p.get("previousSchool") or ""
        for jid, ps in P.items():
            if any(x.search(prev) for x in ps) and not re.search(r"Lewis & Clark College|Monroe Community|Georgia State|Wright State|Barton College", prev):
                roster_rows.append({"player": p["name"], "position": p.get("position"), "jucoId": jid, "jucoAsListed": prev,
                                    "destinationSchoolId": sid, "rosterSeason": snap.get("rosterSeason"),
                                    "rosterFile": f.replace("\\", "/"), "status": "lead", "arrivalSeason": None,
                                    "leadSource": "guide stored roster (previous school)", "matchNote": ("arrival season unknown; several schools listed, check the move was direct" if re.search(r"[A-Za-z] ?/ ?[A-Z]", prev.split(" / ",1)[-1] if "," in prev.split("/")[0] else prev) else "arrival season unknown")})
# merge: flag roster leads that duplicate a tracker lead
tk = {(r["player"].lower(), r["jucoId"]) for r in rows}
for r in roster_rows:
    r["alsoTrackerLead"] = (r["player"].lower(), r["jucoId"]) in tk

out = {
 "_about": ("Audit list for the five-year JUCO Division I transfer rate (CLAUDE.md 6C, campaign C1). One row per player. "
            "status: lead (found, not yet confirmed) | confirmed | not_found | wrong_division | indirect | outside_window. "
            "Only 'confirmed' rows will count. Nothing reads this file for scoring until stage 4."),
 "window": "arrival seasons fall 2021 - fall 2025",
 "builtAt": datetime.date.today().isoformat(),
 "stage": 0,
 "trackerSources": {k: "https://www.topdrawersoccer.com" + v["url"] for k, v in sorted(inbox.items()) if k.startswith("tds_")},
 "trackerSizes": {k: sum(1 for r in v["rows"] if r and r[0].lower() not in ("name", "player")) for k, v in sorted(inbox.items()) if k.startswith("tds_")},
 "rejectedTrackerNames": REJECT,
 "trackerLeads": rows,
 "storedRosterLeads": roster_rows,
}
json.dump(out, open("data/juco-d1-transfers-2021-2025.json", "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
c = collections.Counter(r["jucoId"] for r in rows)
cr = collections.Counter(r["jucoId"] for r in roster_rows)
print("tracker leads:", len(rows), "by season", dict(sorted(collections.Counter(r["arrivalSeason"] for r in rows).items())))
print("roster leads:", len(roster_rows), " overlapping tracker:", sum(r["alsoTrackerLead"] for r in roster_rows))
allids = sorted(set(c) | set(cr), key=lambda k: -(c[k] + cr[k]))
for k in allids: print(f"  {k:38s} tracker {c[k]:3d}  roster {cr[k]:3d}")
print("JUCOs with no lead at all:", len([k for k in jucos if k not in c and k not in cr]), "of", len(jucos))
print("roster lead strings:", sorted({(r['jucoId'], r['jucoAsListed']) for r in roster_rows}))
