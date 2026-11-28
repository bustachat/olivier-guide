"""C1 campaign stage 4 (CLAUDE.md 6C): apply the five-year JUCO Division I transfer rates to data/juco.json.

Owner rulings it applies (2026-11-28): one window, arrivals fall 2021 - fall 2025; only confirmed moves count;
a JUCO with none gets a real 0; the benchmark stays D1_RATE_DIVISOR = 5.0594 (option C); programs that started
in the window divide by their own seasons. Programs with no season in the window keep their record untouched.

Steps: rebuild proPlayers.nextLevel for each JUCO from candidateSummary, then recompute fitOlivier,
lensScores.overall, lensScores.soccer and lensScores.value with the REAL js/scores.js (via node), and save
juco.json with its exact formatting (2-space indent, CRLF). Prints a before/after table. --dry-run writes nothing.
"""
import json, os, sys, subprocess, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
os.chdir(REPO)
DRY = "--dry-run" in sys.argv
AUDIT = json.load(open("data/juco-d1-transfers-2021-2025.json", encoding="utf-8"))
SUMMARY = AUDIT["candidateSummary"]["byJuco"]
PAGES = AUDIT.get("stage1Pages", {})
SEASONS = {"mohave_cc": (4, 2022), "eastern_arizona": (3, 2023), "connors_state": (3, 2023), "seward_county_cc": (3, 2023),
           "texas_southmost": (3, 2023), "college_of_southern_idaho": (3, 2023), "central_georgia_tech": (3, 2023),
           "pacific_northwest_christian_college": (3, 2023), "national_park": (2, 2024)}
NO_SEASON = {"nwacc", "southern_crescent_tech"}   # no season in the window: record left as it is

raw = open("data/juco.json", "rb").read().decode("utf-8")
crlf = "\r\n" in raw
jucos = json.loads(raw.replace("\r\n", "\n"))

def note_for(n, seasons, start):
    span = "fall 2021 to fall 2025" if seasons == 5 else "fall %d to fall 2025, since the program started in %d" % (start, start)
    if n:
        return ("%d player%s from this college moved straight onto a Division I roster in %s, each checked on the Division I "
                "school's own roster or player bio. Moves through another four-year college are not counted. Some Division I "
                "rosters do not list previous schools, so a few moves may be missing." % (n, "" if n == 1 else "s", span))
    return ("No player from this college was found moving straight onto a Division I roster in %s, after checking every "
            "Division I men's roster for those seasons. Some Division I rosters do not list previous schools, so a move "
            "could still be missing." % span)

changed = {}
for s in jucos:
    jid = s["id"]
    if jid in NO_SEASON:
        continue
    seasons, start = SEASONS.get(jid, (5, 2021))
    n = SUMMARY[jid]["confirmed"]
    old = (s.get("proPlayers") or {}).get("nextLevel") or {}
    page = PAGES.get(jid, {})
    src = page.get("url") if page.get("read") else None
    nl = {"metric": "d1TransferRate", "d1Count": n, "yearsCovered": "%d-2025" % start, "years": seasons,
          "perYear": round(n / seasons, 4), "window": "arrival seasons %d-2025" % start, "note": note_for(n, seasons, start)}
    if src: nl["sourceUrl"] = src
    s.setdefault("proPlayers", {})["nextLevel"] = nl
    changed[jid] = {"oldPerYear": old.get("perYear"), "newPerYear": nl["perYear"], "confirmed": n, "seasons": seasons}

# recompute scores with the real scores.js
athlete = json.load(open("athletes/olivier.json", encoding="utf-8"))
tmp = os.path.join(tempfile.gettempdir(), "juco_apply_input.json")
json.dump({"schools": jucos, "athlete": athlete}, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
node = r"""
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('js/scores.js','utf8'); const ctx=vm.createContext({console});
vm.runInContext(src+'\n;this.__f={calculateFitScore,soccerQualityScore};',ctx);
const {schools,athlete}=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const budget=athlete.budgetUSD||(athlete.budgetAUD/athlete.fxRate);
const out={};
for(const s of schools){
  const fit=ctx.__f.calculateFitScore(s,athlete);
  const soccer=Math.round(ctx.__f.soccerQualityScore(s)*100);
  const aff=1-Math.min(1,s.fin.costNum/budget);
  out[s.id]={fit,soccer,value:Math.round(fit*0.6+aff*40)};
}
process.stdout.write(JSON.stringify(out));
"""
res = json.loads(subprocess.run(["node", "-e", node, tmp], capture_output=True, text=True, check=True, encoding="utf-8").stdout)

rows = []
for s in jucos:
    r = res[s["id"]]
    before = (s["fitOlivier"], s["lensScores"]["soccer"], s["lensScores"]["value"])
    s["fitOlivier"] = r["fit"]
    s["lensScores"]["overall"] = r["fit"]
    s["lensScores"]["soccer"] = r["soccer"]
    s["lensScores"]["value"] = r["value"]
    if s["id"] in changed or before != (r["fit"], r["soccer"], r["value"]):
        rows.append((s["id"], before[0], r["fit"], changed.get(s["id"], {}).get("oldPerYear"), changed.get(s["id"], {}).get("newPerYear")))

up = sum(1 for r in rows if r[2] > r[1]); down = sum(1 for r in rows if r[2] < r[1])
print("JUCOs updated:", len(changed), "| Fit up", up, "down", down, "same", len(rows) - up - down)
for r in sorted(rows, key=lambda r: r[2] - r[1])[:5] + sorted(rows, key=lambda r: r[2] - r[1])[-5:]:
    print("  %-34s fit %3d -> %3d   rate %s -> %s" % r)
if not DRY:
    out = json.dumps(jucos, indent=2, ensure_ascii=False) + "\n"
    if crlf: out = out.replace("\n", "\r\n")
    open("data/juco.json", "w", encoding="utf-8", newline="").write(out)
    print("written data/juco.json")
