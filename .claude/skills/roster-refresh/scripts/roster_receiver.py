#!/usr/bin/env python3
"""
roster_receiver.py — tiny local page that receives rosters collected in the
browser by roster_extractor.js and writes them to disk (C0 campaign, CLAUDE.md 6C).

WHY: a roster read in the browser would otherwise have to be re-typed through
the conversation to reach a file. The desktop browser pane blocks a public
page from calling localhost, so the extractor keeps its results in
window.name; this server gives the browser a localhost page to navigate to,
from which the results are POSTed (same origin) and saved.

  GET  /            a blank page (also serves /extractor.js for convenience)
  POST /save        body = {schoolId: {url, title, layout, hasPrevCol, players[]}}
                    -> merged into <inbox>/rosters_inbox.json, replies with a count

Inbox: the folder in ROSTER_INBOX, else <temp>/olivier_roster_inbox.
Started through .claude/launch.json ("roster-receiver", port 8799).
"""
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
INBOX = os.environ.get("ROSTER_INBOX") or os.path.join(tempfile.gettempdir(), "olivier_roster_inbox")
FILE = os.path.join(INBOX, "rosters_inbox.json")
HERE = os.path.dirname(os.path.abspath(__file__))


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="text/plain; charset=utf-8"):
        b = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path.startswith("/extractor.js"):
            self._send(200, open(os.path.join(HERE, "roster_extractor.js"), encoding="utf-8").read(),
                       "text/javascript; charset=utf-8")
        else:
            self._send(200, "<!doctype html><meta charset=utf-8><title>roster receiver</title>"
                            "<p>roster receiver: POST /save</p>", "text/html; charset=utf-8")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            data = json.loads(self.rfile.read(n).decode("utf-8"))
            assert isinstance(data, dict)
        except Exception as e:  # noqa: BLE001
            self._send(400, "bad JSON: %s" % e)
            return
        os.makedirs(INBOX, exist_ok=True)
        box = {}
        if os.path.exists(FILE):
            box = json.loads(open(FILE, encoding="utf-8").read())
        box.update(data)
        with open(FILE, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(box, indent=1, ensure_ascii=False))
        self._send(200, json.dumps({"saved": sorted(data), "inboxTotal": len(box), "file": FILE}))

    def log_message(self, *a):  # quiet
        pass


if __name__ == "__main__":
    print("roster receiver on http://localhost:%d  inbox: %s" % (PORT, FILE), flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
