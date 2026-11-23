"""Receive canvas screenshots from the dev page: POST a data-URL to http://127.0.0.1:5299/<name>, saved as <outdir>/<name>.png.
Used by the fish screenshot recipe in prompts/fish-next-handoff.md. Run in the background: python -I scripts/shot-recv.py <outdir>"""
import http.server, base64, sys, os
OUT = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = self.path.strip('/').replace('..', '') or 'shot'
        d = self.rfile.read(int(self.headers['Content-Length'])).decode()
        open(os.path.join(OUT, n + '.png'), 'wb').write(base64.b64decode(d.split(',', 1)[1]))
        self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 5299), H).serve_forever()
