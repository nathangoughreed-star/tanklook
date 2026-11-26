#!/usr/bin/env python3
"""Record what a fish cost Nathan to review (lane FG2, R174). Partial rows are fine; nothing here blocks a batch.
  python -I scripts/fish-review-log.py merah --minutes 3 --rounds 1 --first-pass yes [--batch b8] [--date 2026-11-26]
  python -I scripts/fish-review-log.py --seed          # one row per build-B look from git (commits on its anatomy file); never overwrites a real row
  python -I scripts/fish-review-log.py --baseline b8   # N recorded of the batch, median minutes / rounds, first-pass rate
Writes review_minutes, review_rounds, first_pass, verdict_date into <SHEETS>/<id>-<batch>-gen/build.json (when that folder exists)
and appends/updates one row per fish in research/fish-sheets/review-log.csv (log.csv is the per-sheet audit log, so reviews get their own file)."""
import csv, glob, json, os, statistics, subprocess, sys, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.environ.get('FISH_SHEETS', 'C:/Users/nreed/fish-sheets')
CSV = R + '/research/fish-sheets/review-log.csv'
COLS = ['species', 'look', 'batch', 'review_minutes', 'review_rounds', 'first_pass', 'verdict_date', 'tier', 'source']

def load():
    return {r['species']: r for r in csv.DictReader(open(CSV, newline='', encoding='utf-8'))} if os.path.exists(CSV) else {}

def save(rows):
    with open(CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, COLS); w.writeheader()
        for k in sorted(rows): w.writerow({c: rows[k].get(c, '') for c in COLS})

def tier(sp):
    try: return json.load(open(R + '/research/fish-sheets/tiers.json'))['tiers'].get(sp, {}).get('tier', '')
    except Exception: return ''

def folder(sp, batch):
    g = sorted(glob.glob(f'{SHEETS}/{sp}-{batch or "b*"}-gen'))
    return g[-1] if g else None

def record(a):
    sp = a[0]; o = {a[i]: a[i + 1] for i in range(1, len(a) - 1) if a[i].startswith('--')}
    f = folder(sp, o.get('--batch')); batch = os.path.basename(f).split('-')[-2] if f else o.get('--batch', '')
    vals = {'review_minutes': float(o['--minutes']) if '--minutes' in o else None, 'review_rounds': int(o['--rounds']) if '--rounds' in o else None,
            'first_pass': o.get('--first-pass'), 'verdict_date': o.get('--date', datetime.date.today().isoformat())}
    if vals['first_pass'] not in (None, 'yes', 'no'): sys.exit('--first-pass is yes or no')
    if f and os.path.exists(f + '/build.json'):
        b = json.load(open(f + '/build.json')); b.update({k: v for k, v in vals.items() if v is not None}); json.dump(b, open(f + '/build.json', 'w'), indent=1)
    rows = load(); r = rows.get(sp, {}) if rows.get(sp, {}).get('source') != 'git' else {}
    r.update({'species': sp, 'look': sp + 'b', 'batch': batch, 'tier': tier(sp), 'source': 'nathan'}); r.update({k: v for k, v in vals.items() if v is not None}); rows[sp] = r; save(rows)
    print('recorded', sp, {k: v for k, v in vals.items() if v is not None}, '(build.json updated)' if f else '(no work folder; csv only)')

def seed():
    rows = load(); n = 0
    for p in sorted(glob.glob(R + '/src/data/fishart/*b.anatomy.json') + glob.glob(R + '/src/data/fishart/*c.anatomy.json')):
        look = os.path.basename(p).split('.')[0]; sp = look[:-1]
        if sp in rows and rows[sp].get('source') != 'git': continue
        out = subprocess.run(['git', '-C', R, 'log', '--format=%ad', '--date=short', '--', p], capture_output=True, text=True).stdout.split()
        if not out: continue
        rows[sp] = {'species': sp, 'look': look, 'batch': '', 'review_minutes': '', 'review_rounds': max(1, len(out)), 'first_pass': 'yes' if len(out) <= 1 else 'no',
                    'verdict_date': out[-1], 'tier': tier(sp), 'source': 'git'}; n += 1
    save(rows); print(f'seeded {n} rows from git (rounds = commits on the look anatomy file, an upper bound: pipeline-wide rebuilds count)')

def baseline(batch):
    fs = sorted(glob.glob(f'{SHEETS}/*-{batch}-gen')); got = []
    for d in fs:
        if os.path.exists(d + '/build.json'):
            b = json.load(open(d + '/build.json'))
            if any(k in b for k in ('review_minutes', 'review_rounds', 'first_pass')): got.append(b)
    print(f'{batch}: {len(got)} of {len(fs)} fish have review numbers')
    for key, label in (('review_minutes', 'minutes'), ('review_rounds', 'rounds')):
        v = [b[key] for b in got if b.get(key) is not None]
        print(f'  median {label}: {statistics.median(v) if v else "n/a"} (n {len(v)})')
    fp = [b['first_pass'] for b in got if b.get('first_pass')]
    print(f'  first-pass rate: {sum(x == "yes" for x in fp)}/{len(fp)}' if fp else '  first-pass rate: n/a')

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == '--seed': seed()
    elif a[0] == '--baseline': baseline(a[1] if len(a) > 1 else 'b8')
    else: record(a)
