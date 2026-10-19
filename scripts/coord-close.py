# Coordinator helper: close a lane. Usage: python scripts/coord-close.py "## Lane XX" "| XX " <launch-config-name>
# Moves the lane section from HANDOFF.md to HANDOFF-archive.md (adds it to the archive index), drops its Current-lanes row and its .claude/launch.json entry. Run from anywhere; it chdirs to the main checkout.
import json, os, re, sys
os.chdir(r"C:\Users\nreed\Glass Box")
key = sys.argv[1]          # heading prefix, e.g. "## Lane G1"
rowkey = sys.argv[2]       # row prefix, e.g. "| G1 "
launch = sys.argv[3]       # launch config name
h = open("HANDOFF.md", encoding="utf-8", newline="").read()
s = h.index(key)
m = re.search(r"\n## ", h[s + 3:])
e = s + 3 + m.start() + 1
sec = h[s:e]
h = h[:s] + h[e:]
# drop table row
lines = h.split("\n")
lines = [l for l in lines if not l.startswith(rowkey)]
h = "\n".join(lines)
head = sec.splitlines()[0][3:]
k = h.index("## Archive index")
nl = h.index("\n", k) + 1
h = h[:nl] + "- " + head + "\n" + h[nl:]
open("HANDOFF.md", "w", encoding="utf-8", newline="").write(h)
a = open("HANDOFF-archive.md", encoding="utf-8", newline="").read()
i = a.index("\n## ") + 1
a = a[:i] + sec + ("" if sec.endswith("\n\n") else "\n") + a[i:]
open("HANDOFF-archive.md", "w", encoding="utf-8", newline="").write(a)
L = json.load(open(".claude/launch.json", encoding="utf-8"))
L["configurations"] = [c for c in L["configurations"] if c["name"] != launch]
open(".claude/launch.json", "w", encoding="utf-8", newline="\r\n").write(json.dumps(L, indent=2) + "\n")
print(head[:80], len(sec))
