"""C1 campaign (CLAUDE.md 6C), merge step: combine every lead in data/juco-d1-transfers-2021-2025.json
into one candidate per player and JUCO, with a destination program, an arrival season and a status.

Sources merged:
  rosterSweep.programs  - Division I rosters 2021-2025 (destination's own roster names the JUCO)
  schoolPageLeads       - JUCO alumni pages
  trackerLeads          - TopDrawerSoccer transfer trackers (discovery only)
  storedRosterLeads     - the guide's stored 2026-27 Division I rosters (arrival unknown)

Status rules (owner rule: only confirmed moves count):
  confirmed    - a destination roster names the JUCO as previous school, first seen 2022-2025 (or first
                 seen 2021 with a page or tracker also giving 2021), and no flag raised
  needs_check  - a destination roster names the JUCO but a flag is raised (indirect move, school that
                 joined Division I during the window, first seen 2021 uncorroborated, ...)
  lead         - only a page, tracker or stored roster names the move; nothing confirmed yet

Writes `candidates` and `candidateSummary` into the audit file. Changes nothing else; reads no scores.
"""
import json, os, re, sys, unicodedata, collections, difflib, datetime

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
os.chdir(REPO)
P = "data/juco-d1-transfers-2021-2025.json"
d = json.load(open(P, encoding="utf-8"))
jucos = {j["id"]: j for j in json.load(open("data/juco.json", encoding="utf-8"))}
sweep = d["rosterSweep"]["programs"]
programs = {p["key"]: p for p in d["rosterSweep"]["allPrograms"]}

# ---------- JUCO matching on previous-school text (hand-checked traps, see CLAUDE.md 6C C1) ----------
NOT = re.compile(r"Barton College|Lewis (&|and) Clark College|Monroe Community|Jefferson Community College|"
                 r"Northwest Nazarene|Northwestern (University|Ohio|State)|Union College|Lake Erie|Georgia State|Wright State", re.I)
JPAT = {}
for jid, j in jucos.items():
    base = re.sub(r"\s*\(.*?\)", "", j["name"]).strip()
    stem = re.sub(r"\b(CC|College|Community College|Junior College|JC)\b", "", base).strip()
    pats = [r"\b" + re.escape(stem) + r"\s*(CC|C\.C\.|JC|J\.C\.|College|Community College|Junior College|Comm\.?)\b"]
    if stem in ("Iowa Western", "Tyler", "Cowley", "Pima", "Indian Hills", "Daytona State", "Snow", "Otero", "Yavapai", "Blinn", "Casper"):
        pats.append(r"\b" + re.escape(stem) + r"\b")
    JPAT[jid] = re.compile("|".join(pats), re.I)
JPAT["slcc"] = re.compile(r"Salt Lake (City )?(CC|Community College|C\.C\.)|\bSLCC\b", re.I)
JPAT["efsc"] = re.compile(r"Eastern Florida( State)?( College)?|\bEFSC\b", re.I)  # whole name, so "College" is not read as a second school
JPAT["lsu_eunice"] = re.compile(r"LSU[- ]Eunice", re.I)
JPAT["monroe_college"] = re.compile(r"\bMonroe (College|CC)\b", re.I)

TWO_JUCOS = {}
def juco_of(text):
    if not text or NOT.search(text):
        return None, None
    hits = [(p.search(text), jid) for jid, p in JPAT.items() if p.search(text)]
    if not hits:
        return None, None
    # two JUCOs listed (e.g. "Indian Hills CC / Eastern Florida"): the move counts for the last one
    m, jid = max(hits, key=lambda t: t[0].start())
    TWO_JUCOS[text] = len(hits) > 1
    return jid, m

COLLEGEISH = re.compile(r"\b(University|College|State|Institute|Tech)\b", re.I)
def indirect(text, m):
    """True when another college follows the JUCO in the previous-school text (JUCO -> X -> destination)."""
    tail = text[m.end():]
    # rosters sometimes repeat the hometown and high school after the JUCO; ignore repeated segments
    seen_before = {x.strip().lower() for x in re.split(r"/|;|,", text[:m.start()]) if x.strip()}
    parts = [x.strip() for x in re.split(r"/|;|,|\bthen\b", tail) if x.strip() and x.strip().lower() not in seen_before]
    def is_school(x):
        if JPAT[jid_cache].search(x): return False
        if COLLEGEISH.search(x): return True                       # "Missouri State University"
        if any(p.search(x) for j, p in JPAT.items() if j != jid_cache): return True   # another JUCO
        return norm_school(x) in ALIAS                             # short forms: "UIC", "FGCU"
    return any(is_school(x) for x in parts)

# ---------- names ----------
def norm_name(n):
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode()
    n = re.sub(r"^\s*#?\d+\s*", "", n)
    n = re.sub(r"^(GK|D|M|F|MF|DF|FW|D/M|M/F|F/M)\s+(?=[A-Z])", "", n)  # tracker position prefix ("F Wawa Palga")
    n = re.sub(r"\(.*?\)|\".*?\"", " ", n)
    if "," in n:
        a, b = n.split(",", 1); n = b + " " + a
    n = re.sub(r"[^A-Za-z ]", " ", n).lower()
    n = re.sub(r"\b(jr|sr|ii|iii|iv)\b", " ", n)
    return " ".join(n.split())

def same_person(a, b):
    if a == b: return True
    ta, tb = a.split(), b.split()
    if not ta or not tb: return False
    short_form = ta[0].startswith(tb[0]) or tb[0].startswith(ta[0])  # Tim / Timothy, A / A.J.
    if ta[0] != tb[0] and not short_form and not (ta[0][:1] == tb[0][:1] and len(ta[0]) <= 2):
        if difflib.SequenceMatcher(None, ta[0], tb[0]).ratio() < 0.85: return False
    la, lb = " ".join(ta[1:]), " ".join(tb[1:])
    if not la or not lb: return False
    if la in lb or lb in la: return True
    return difflib.SequenceMatcher(None, la, lb).ratio() >= 0.8

# ---------- destination names -> program keys ----------
def norm_school(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)", " ", s).replace("&", "and").replace("saint ", "st ").replace("st. ", "st ")
    s = re.sub(r"[^a-z ]", " ", s)
    s = re.sub(r"\b(university|of|the|at|college|men s|mens)\b", " ", s)
    return " ".join(s.split())
ALIAS = {  # short or odd forms seen on alumni pages and trackers
 "umkc": "o2707", "missouri kansas city": "o2707", "kansas city": "o2707", "uic": "o302", "illinois chicago": "o302",
 "omaha": "o464", "nebraska omaha": "o464", "unh": "o469", "new hampshire": "o469", "usf": "o651", "south florida": "o651",
 "fau": "o229", "florida atlantic": "o229", "fiu": "o231", "florida international": "o231", "ucf": "o128", "central florida": "o128",
 "utrgv": "o536", "texas rio grande valley": "o536", "lmu": "o370", "loyola marymount": "o370", "ucsb": "o104",
 "uc santa barbara": "o104", "st johns": "o603", "st john s": "o603", "st johns new york": "o603", "slu": "o609", "st louis": "o609",
 "wisconsin milwaukee": "o797", "milwaukee": "o797", "uw milwaukee": "o797", "fgcu": "o28755", "florida gulf coast": "o28755",
 "unf": "o2711", "north florida": "o2711", "csun": "o101", "cal state northridge": "o101", "california state northridge": "o101",
 "uab": "o9", "alabama birmingham": "o9", "ccsu": "o127", "central connecticut": "o127", "central connecticut state": "o127",
 "gcu": "o1104", "grand canyon": "o1104", "umass lowell": "o368", "massachusetts lowell": "o368", "massachsetts lowell": "o368",
 "cal": "o107", "california berkeley": "o107", "berkeley": "o107", "utah valley": "o30024", "oral roberts": "o527", "oru": "o527",
 "akron": "o5", "creighton": "o169", "bradley": "o72", "tulsa": "o719", "xavier": "o812", "marshall": "o388", "memphis": "o404",
 "georgia state": "o254", "eastern illinois": "o201", "southern indiana": "o661", "james madison": "o317", "rhode island": "o572",
 "winthrop": "o792", "houston christian": "o287", "st thomas": "o620", "stetson": "o678", "missouri state": "o669",
 "western illinois": "o771", "wright state": "o810", "niagara": "o482", "louisville": "o367", "elon": "o1068",
 "northern illinois": "o503", "san diego": "o627", "gonzaga": "o260", "cornell": "o167", "manhattan": "o381",
 "nc state": "o490", "north carolina state": "o490", "syracuse": "o688", "liberty": "o355", "coastal carolina": "o149",
 "marist": "o386", "dayton univerity": "o175", "csu bakersfield": "o94", "cal state bakersfield": "o94", "unc wilmington": "o460", "loyola md": "o369", "loyola maryland": "o369", "california": "o107", "uc berkeley": "o107", "campbell": "o115", "presbyterian": "o1320", "dayton": "o175", "utrgv ": "o536", "unlv": "o465", "smu": "o663", "uconn": "o164",
}
NAMEIDX = [(norm_school(p["school"]), k) for k, p in programs.items()]
def program_of(dest):
    if not dest: return None
    if re.search(r"Loyola \((MD|Md\.?)\)|Loyola Maryland", dest): return "o369"   # "(MD)" is stripped by norm_school
    # try the whole name first ("California State University, Northridge"), then the first of several schools
    for cand in (dest, re.split(r"/|\+| and ", dest)[0], re.split(r"/|\+| and |,", dest)[0]):
        k = _program_of(cand)
        if k: return k
    return None
def _program_of(first):
    n = norm_school(first)
    if n in ALIAS: return ALIAS[n]
    for k, v in ALIAS.items():
        if n == k: return v
    exact = [k for nm, k in NAMEIDX if nm == n]
    if len(exact) == 1: return exact[0]
    best = max(NAMEIDX, key=lambda t: difflib.SequenceMatcher(None, t[0], n).ratio())
    return best[1] if difflib.SequenceMatcher(None, best[0], n).ratio() >= 0.86 else None

# Programs that joined Division I during or just before the window (checked 2026-11-28).
# D1_FROM: the season a program's men's team first played Division I, or the earliest window season it is
# shown playing D1, with the evidence. A move that arrives before that season is not a Division I move.
D1_FROM = {
 "o11740": (2026, "West Florida: Gulf South (Division II) 2021-2025, ASUN from 2026 (guide record, data/d1-other.json)"),
 "o408":   (2024, "Mercyhurst: PSAC (Division II) through 2023, NEC from 2024 (guide record)"),
 "o11504": (2022, "Queens: first Division I season 2022 (guide record)"),
 "o30095": (2021, "Utah Tech: WAC (Division I) 2021-2025 (guide record)"),
 "o30135": (2021, "California Baptist: WAC (Division I) 2021-2025 (guide record)"),
 "o661":   (2025, "Southern Indiana: OVC schedule 2025 (usiscreamingeagles.com); earlier seasons not checked"),
 "o30136": (2025, "Lindenwood: OVC schedule 2025 (lindenwoodlions.com); earlier seasons not checked"),
}
# Joined recently, D1 start season NOT yet checked: a move there stays flagged.
RECENT_D1_UNCHECKED = {"o620": "St. Thomas (MN): schedule page showed an unfilled template on 2026-11-28",
                       "o682": "Stonehill", "o349": "Le Moyne", "o470": "New Haven", "o112": "UC San Diego",
                       "o52": "Bellarmine", "o410": "Merrimack"}

# ---------- 1. sweep candidates ----------
cands = []
for pk, v in sweep.items():
    seen = {}
    for r in v["rows"]:
        jid, m = juco_of(r["prev"])
        if not jid: continue
        jid_cache = jid  # used by indirect()
        globals()["jid_cache"] = jid
        nn = norm_name(r["name"])
        if not nn: continue
        k = (nn, jid)
        e = seen.setdefault(k, {"seasons": set(), "prev": r["prev"], "name": re.sub(r"^\s*#?\d+\s*", "", r["name"]).strip(), "indirect": False})
        e["seasons"].add(r["season"])
        e["indirect"] = e["indirect"] or indirect(r["prev"], m)
    for (nn, jid), e in seen.items():
        cands.append({"jucoId": jid, "player": e["name"], "_n": nn, "destinationKey": pk,
                      "destinationSchool": programs.get(pk, {}).get("school"),
                      "firstSeenAtDestination": min(e["seasons"]), "seasonsSeen": sorted(e["seasons"]),
                      "previousSchoolAsListed": e["prev"], "sources": ["destination roster"],
                      "_indirect": e["indirect"], "_other": []})

def find(jid, nn, dest=None):
    for c in cands:
        if c["jucoId"] == jid and same_person(c["_n"], nn) and (dest is None or c["destinationKey"] in (None, dest)):
            return c
    return None

# ---------- 2. pages, trackers, stored rosters ----------
def add_other(kind, r, arrival, dest_str, dest_key):
    nn = norm_name(r["player"])
    c = find(r["jucoId"], nn, dest_key) or find(r["jucoId"], nn)
    info = {"source": kind, "arrivalSeason": arrival, "destinationAsListed": dest_str, "url": r.get("leadUrl") or r.get("rosterFile")}
    if c:
        c["_other"].append(info)
        if kind not in c["sources"]: c["sources"].append(kind)
    elif kind == "guide stored roster":
        return  # 2026-27 rosters: arrival unknown and often outside the window, so they only corroborate
    else:
        cands.append({"jucoId": r["jucoId"], "player": r["player"], "_n": nn, "destinationKey": dest_key,
                      "destinationSchool": programs.get(dest_key, {}).get("school") if dest_key else None,
                      "firstSeenAtDestination": None, "seasonsSeen": [], "previousSchoolAsListed": None,
                      "sources": [kind], "_indirect": False, "_other": [info]})
for r in d["schoolPageLeads"]:
    add_other("JUCO alumni page", r, r["arrivalSeason"], r["destinationAsListed"], program_of(r["destinationAsListed"]))
for r in d["trackerLeads"]:
    add_other("transfer tracker", r, r["arrivalSeason"], r["destinationAsListed"], program_of(r["destinationAsListed"]))
for r in d["storedRosterLeads"]:
    add_other("guide stored roster", r, None, r.get("destinationSchoolId"), None)

# ---------- 3. status ----------
for c in cands:
    flags = []
    others = [o for o in c["_other"] if o["arrivalSeason"]]
    other_years = sorted({o["arrivalSeason"] for o in others})
    if c["firstSeenAtDestination"]:
        arrival = c["firstSeenAtDestination"]
        basis = "first season on the destination roster"
        if arrival == 2021:
            r20 = sweep.get(c["destinationKey"], {}).get("roster2020")
            on2020 = bool(r20 and any(same_person(norm_name(x), c["_n"]) for x in r20["names"]))
            if on2020:
                # on the destination's 2020 roster: his first Division I season was 2020, before the window
                arrival, basis = 2020, "on the destination's 2020 roster (%s)" % r20["title"][:40]
            elif r20 and r20["n"] >= 15:
                basis += " (not on the %d-player 2020 roster)" % r20["n"]
            elif 2021 in other_years:
                basis += " (2021, matches page or tracker)"
            else:
                flags.append("first seen 2021: may have arrived before the window; check the 2020 roster")
    elif other_years:
        arrival, basis = other_years[0], "page or tracker year"
    else:
        arrival, basis = None, "unknown"
    if TWO_JUCOS.get(c["previousSchoolAsListed"] or ""): flags.append("two JUCOs listed; credited to the last one")
    if c["_indirect"]: flags.append("another college follows the JUCO in the previous-school text: possible indirect move")
    not_d1 = False
    if c["destinationKey"] in D1_FROM:
        start, why = D1_FROM[c["destinationKey"]]
        if arrival is not None and 2021 <= arrival < start:   # outside-window arrivals are excluded anyway
            not_d1 = True
            flags.append("destination was not Division I when he arrived: " + why)
        elif arrival is not None and arrival == start and "earlier seasons not checked" in why:
            pass  # shown playing D1 in his arrival season
    elif c["destinationKey"] in RECENT_D1_UNCHECKED:
        flags.append("destination joined Division I recently; start season not checked: " + RECENT_D1_UNCHECKED[c["destinationKey"]])
    if not c["destinationKey"]:
        ds = [o["destinationAsListed"] for o in c["_other"] if o["destinationAsListed"]]
        flags.append("destination not matched to a current Division I program: " + "; ".join(sorted(set(map(str, ds))))[:160])
    if other_years and c["firstSeenAtDestination"] and abs(other_years[0] - c["firstSeenAtDestination"]) > 1:
        flags.append("page/tracker year %s differs from roster year %s" % (other_years[0], c["firstSeenAtDestination"]))
    dests = {o["destinationAsListed"] for o in c["_other"] if o["source"] != "guide stored roster" and o["destinationAsListed"]}
    keys = {program_of(x) for x in dests} - {None}
    if c["destinationKey"] and keys and c["destinationKey"] not in keys:
        flags.append("page/tracker destination differs: " + "; ".join(sorted(dests))[:120])
    if arrival is not None and not (2021 <= arrival <= 2025):
        flags.append("arrival outside 2021-2025")
    if arrival is not None and not (2021 <= arrival <= 2025) and c["firstSeenAtDestination"]:
        status = "outside_window"   # e.g. already on the destination's 2020 roster
    elif not_d1:
        status = "not_d1_at_arrival"
    elif c["firstSeenAtDestination"] and not flags:
        status = "confirmed"
    elif c["firstSeenAtDestination"]:
        status = "needs_check"
    else:
        status = "lead"
    c.update({"arrivalSeason": arrival, "arrivalBasis": basis, "flags": flags, "status": status,
              "otherSources": c.pop("_other")})
    c["_key"] = norm_name(c["player"]); c.pop("_n"); c.pop("_indirect")


# ---------- 3a0. stage 2 lead check: the destination's own player bio ----------
LEADCHECK = {}
for r in d.get("leadCheck", {}).get("results", []):
    LEADCHECK[(r["destinationKey"], norm_name(r["player"]))] = r
for c in cands:
    if c["status"] != "lead" or not c["destinationKey"]: continue
    r = None
    for (dk, nn), rr in LEADCHECK.items():
        if dk == c["destinationKey"] and same_person(nn, norm_name(c["player"])): r = rr; break
    if not r: continue
    c["leadCheck"] = {"onRoster": r["onRoster"], "rosterUrl": r["rosterUrl"], "bioUrl": r["bioUrl"], "bioNamesJuco": r["bioNamesJuco"]}
    if r["bioNamesJuco"]:
        c["status"] = "confirmed"
        c["arrivalBasis"] = "destination's own player bio names the JUCO (roster %s)" % r["onRoster"]
        c["flags"] = []
    elif r["onRoster"]:
        c["flags"].append("on the destination roster (%s) but his bio does not name the JUCO" % r["onRoster"])
    else:
        c["flags"].append("not found on the destination roster for %s or %s" % (c["arrivalSeason"], (c["arrivalSeason"] or 0) + 1))

# ---------- 3a. decisions made by hand from the players' own bios (2026-11-28) ----------
# Roster lines do not list schools in time order (Etienne-Courtois: "Indian Hills / Utah Tech" but he went
# Utah Tech 2022-23, Indian Hills 2024, Wright State 2025), so indirect-looking lines need the bio.
MANUAL = {
 ("indian_hills", "Sacha Etienne-Courtois"): ("confirmed", "bio: Utah Tech 2022-23, Indian Hills 2024, Wright State 2025; direct JUCO to D1 move (wsuraiders.com bio)"),
 ("iowa_western", "Sohei Matsumori"): ("indirect_not_counted", "bio: Iowa Western 2021, Norco College 2022, Xavier 2023; the D1 move came from Norco (goxavier.com bio)"),
 ("coastal_bend_cc", "Donal Rahill"): ("indirect_not_counted", "bio: Rogers State (Division II) 2022 before Coastal Carolina 2023 (goccusports.com bio)"),
 ("efsc", "Abdul Kuku"): ("outside_window", "bio: Eastern Florida 2019-20, Seattle U for the 2020 season (played spring 2021), FGCU 2021; first D1 season 2020 (fgcuathletics.com bio)"),
 ("western_texas", "Tevin Lessey"): ("indirect_not_counted", "Western Texas signing release (wtc.prestosports.com, 2019-05-28): signed with Anderson University (Division II) in 2019; Saint Joseph's 2021 came after Anderson"),
 ("harcum_college", "Lorenzo Ferrari"): ("indirect_not_counted", "Harcum 2022 (Region 19 stats), Felician (Division II) 2023-24 (felicianuathletics.com match reports, hometown Palestro matches), La Salle 2025"),
 ("tyler_jc", "Tristan Singh"): ("confirmed", "Tyler page: St. John's 2021; UTRGV 2022-23 roster names Tyler; one move from Tyler either way"),
 ("iowa_western", "Luka Nedic"): ("confirmed", "owner ruling 2026-11-28 (counts when the arrival roster cannot show it): direct move was Iowa Western to UIC, 2023 (Iowa Western page); UIC prints no previous school; Creighton 2025 roster lists Iowa Western CC/UIC"),
 ("iowa_western", "Oskar Greven"): ("confirmed", "owner ruling 2026-11-28 (counts when the arrival roster cannot show it): direct move was Iowa Western to UIC, 2023 (Iowa Western page); UIC prints no previous school; Wright State 2025 roster lists UIC / Iowa Western CC"),
 ("pima_cc", "Taein Ka"): ("confirmed", "owner ruling 2026-11-28 (counts when the arrival roster cannot show it): direct move was Pima to Central Connecticut, 2022 (Pima page); CCSU roster behind a verification page; Coastal Carolina 2023 roster lists CCSU / Pima"),
}
VIA_D1 = {("iowa_western", "Luka Nedic"): ("o302", 2023), ("iowa_western", "Oskar Greven"): ("o302", 2023), ("pima_cc", "Taein Ka"): ("o127", 2022)}
TWO_JUCO_OK = {"Daichi Saito", "Pedro Amancio", "Florentino Junior", "Angel Saldana"}  # credited to the last JUCO listed; direct
for c in cands:
    k = (c["jucoId"], c["player"])
    if k in MANUAL:
        c["status"], note = MANUAL[k]
        c["flags"] = [f for f in c["flags"] if f.startswith("arrival outside")] + ["resolved by hand: " + note]
        if k in VIA_D1:  # owner ruling: the counted move is the earlier one to the intermediate D1 school
            c["destinationKey"], c["destinationSchool"], c["arrivalSeason"] = VIA_D1[k][0], programs[VIA_D1[k][0]]["school"], VIA_D1[k][1]
            c["arrivalBasis"] = "JUCO alumni page, supported by a later Division I roster (owner ruling 2026-11-28)"
    elif c["player"] in TWO_JUCO_OK and c["status"] == "needs_check" and all(f.startswith("two JUCOs") for f in c["flags"]):
        c["status"] = "confirmed"
        c["flags"] = ["resolved: two JUCOs listed, credited to the last one, which he left directly for D1"]

# ---------- 3b. one count per player: keep his first direct Division I move ----------
rank = {"confirmed": 0, "via_d1_owner": 1, "needs_check": 2, "unresolved": 2, "lead": 3, "indirect_not_counted": 4, "outside_window": 5, "not_d1_at_arrival": 6}
groups = []
for c in cands:
    for g in groups:
        if g[0]["jucoId"] == c["jucoId"] and same_person(g[0]["_key"], c["_key"]):
            g.append(c); break
    else:
        groups.append([c])
for g in groups:
    if len(g) == 1: continue
    direct = [c for c in g if not any("indirect" in f for f in c["flags"])] or g
    keep = min(direct, key=lambda c: (c["arrivalSeason"] or 9999, rank[c["status"]]))
    for c in g:
        if c is not keep:
            c["status"] = "duplicate"
            c["flags"].append("same player as the %s entry (%s); counted there" % (keep["destinationSchool"] or "unmatched", keep["status"]))
for c in cands: c.pop("_key")

# ---------- 4. summary per JUCO ----------
summ = {}
for jid in jucos:
    cs = [c for c in cands if c["jucoId"] == jid and (c["arrivalSeason"] is None or 2021 <= c["arrivalSeason"] <= 2025)]
    k = collections.Counter(c["status"] for c in cs)
    summ[jid] = {"confirmed": k["confirmed"], "needs_check": k["needs_check"], "lead": k["lead"], "duplicate": k["duplicate"], "not_d1_at_arrival": k["not_d1_at_arrival"], "via_d1_owner": k["via_d1_owner"], "unresolved": k["unresolved"], "indirect_not_counted": k["indirect_not_counted"]}
d["candidates"] = sorted(cands, key=lambda c: (c["jucoId"], c["arrivalSeason"] or 0, c["player"]))
d["candidateSummary"] = {"_about": "Counts per JUCO, 2021-2025 arrivals. Only 'confirmed' will count once stage 2 clears the rest. Not used for scoring yet.",
                         "builtAt": datetime.date.today().isoformat(), "byJuco": summ}
d["stage"] = 2
open(P, "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=1, ensure_ascii=False) + "\n")

tot = collections.Counter(c["status"] for c in cands)
print("candidates:", len(cands), dict(tot))
fl = collections.Counter(f.split(":")[0] for c in cands for f in c["flags"])
print("flags:", dict(fl))
rows = sorted(summ.items(), key=lambda t: -(t[1]["confirmed"] + t[1]["needs_check"] + t[1]["lead"]))
print(f"{'juco':34s} conf  check  lead")
for jid, s in rows:
    if s["confirmed"] + s["needs_check"] + s["lead"]:
        print(f"{jid:34s} {s['confirmed']:4d} {s['needs_check']:6d} {s['lead']:5d}")
print("JUCOs with nothing at all:", sum(1 for s in summ.values() if not any(s.values())), "of", len(summ))
