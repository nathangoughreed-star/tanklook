# Request audit (C24, 2026-11-15): every message Nathan typed in any Glass Box chat since a date, one line each, to compare against research/requests.md.
# Run: python -I scripts/request_audit.py out.txt   (edit `since` below)
import json, glob, os, re, sys
root = r'C:\Users\nreed\.claude\projects'
since = '2026-11-12'
out = []
for d in glob.glob(os.path.join(root, '*Glass*')):
    for f in glob.glob(os.path.join(d, '*.jsonl')):
        if os.path.getmtime(f) < 1762905600: continue  # 2026-11-12 UTC approx
        sid = os.path.basename(f)[:-6]
        title = ''
        for line in open(f, encoding='utf-8', errors='replace'):
            try: e = json.loads(line)
            except Exception: continue
            if e.get('type') == 'summary' and e.get('summary'): title = e['summary']
            if e.get('type') != 'user' or e.get('isMeta'): continue
            ts = e.get('timestamp', '')
            if ts < since: continue
            m = e.get('message', {}); c = m.get('content')
            if isinstance(c, list):
                if any(p.get('type') == 'tool_result' for p in c if isinstance(p, dict)): continue
                c = '\n'.join(p.get('text', '') for p in c if isinstance(p, dict) and p.get('type') == 'text')
            if not isinstance(c, str): continue
            t = re.sub(r'<system-reminder>.*?</system-reminder>', '', c, flags=re.S)
            t = re.sub(r'<(side-sessions-event|task-notification|cross-session-message|agent-message|pasted_content)[^>]*>.*?</\1>', '', t, flags=re.S).strip()
            if not t or t.startswith('You are ') or t.startswith('This session is being continued') or t.startswith('Another Claude session') or t.startswith('[SYSTEM') or t.startswith('<'): continue
            if 'Caveat:' in t[:20] or t.startswith('[Request interrupted'): continue
            out.append((ts, sid, os.path.basename(d)[-40:], t.replace('\n', ' ')[:600]))
out.sort()
with open(sys.argv[1], 'w', encoding='utf-8') as w:
    for ts, sid, d, t in out: w.write(f'{ts[:16]} | {sid[:8]} | {d} | {t}\n')
print(len(out), 'messages from', len({o[1] for o in out}), 'sessions')
