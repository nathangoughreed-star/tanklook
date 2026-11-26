"""Unit 2 test (FG1, Fable change 2): rebuild stored sheets two ways in SCRATCH trees, today's body source vs --body-from-map, and compare gate + mass.
Nothing is written to the repo, src/data/fishart or public/art/fish: each variant runs from its own copy of scripts/ + src/data + research/fish-specs
(fish-new.py derives ROOT from its own location), and each fish's sheet folder is copied first, so C:/Users/nreed/fish-sheets is only read.
Usage: python -I scripts/fish-bodymap-test.py <scratch-dir> [--only a,b] [--jobs 4] | <scratch-dir> --report   -> <scratch>/result.json and a printed table"""
import sys, os, json, glob, shutil, subprocess, time, importlib.util
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sp = importlib.util.spec_from_file_location('fishgate', os.path.join(HERE, 'fish-gate.py')); G = importlib.util.module_from_spec(sp); sp.loader.exec_module(G)


def tree(dst):
    if os.path.exists(os.path.join(dst, 'scripts')): return
    for sub in ('scripts', 'src/data', 'research/fish-specs'):
        shutil.copytree(os.path.join(ROOT, sub), os.path.join(dst, sub), ignore=shutil.ignore_patterns('__pycache__'))
    for sub in ('public/art/fish', 'shots'): os.makedirs(os.path.join(dst, sub), exist_ok=True)


def one(scratch, variant, d, fid, sp_):
    root = os.path.join(scratch, variant); work = os.path.join(scratch, 'work', variant, os.path.basename(d))
    if not os.path.exists(work):
        os.makedirs(work); [shutil.copy(os.path.join(d, f), work) for f in ('sheet.webp', 'fishshapes.json', 'sheet.json') if os.path.exists(os.path.join(d, f))]
    t = time.time()
    r = subprocess.run([sys.executable, '-I', os.path.join(root, 'scripts', 'fish-new.py'), work, fid, sp_['name'], sp_['sci'], str(sp_['tl']), '--no-autosat'] + (['--body-from-map'] if variant == 'map' else []),
                       cwd=root, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr; open(os.path.join(work, 'build.log'), 'w', encoding='utf-8').write(out)
    g = G.gate(work, fid, legacy=True, root=root) if r.returncode == 0 else {'flags': ['build-failed'], 'soft': [], 'facts': {}}
    return {'ok': r.returncode == 0, 'sec': round(time.time() - t), 'flags': g['flags'], 'soft': g['soft'], 'facts': g['facts'], 'tail': out.strip().splitlines()[-1:] if r.returncode else []}


if __name__ == '__main__':
    a = sys.argv[1:]; scratch = a[0]; opt = {a[i]: a[i + 1] for i in range(1, len(a) - 1) if a[i].startswith('--')}
    only = set(opt['--only'].split(',')) if '--only' in opt else None; jobs = int(opt.get('--jobs', 4))
    if os.path.abspath(scratch).startswith(os.path.abspath(ROOT)): sys.exit('scratch dir must be outside the repo')
    if '--report' in a:
        res = json.load(open(os.path.join(scratch, 'result.json'))); better, worse, same, rows = [], [], [], []
        dev = lambda r: (max(0.8 - r['facts']['mass'][0], r['facts']['mass'][1] - 1.45, 0) if r['facts'].get('mass') else 9)
        for fid, v in sorted(res.items()):
            b, m = v['base'], v['map']
            if not b['ok'] or not m['ok']: rows.append(f'{fid}: build failed (base {b["ok"]}, map {m["ok"]})'); continue
            sb, sm = len(b['flags']) + dev(b), len(m['flags']) + dev(m); d = round(sb - sm, 2)
            (better if d > 0.03 else worse if d < -0.03 else same).append(fid)
            rows.append(f'{fid:18s} base {b["flags"] or "pass"} mass {b["facts"].get("mass")}  | map {m["flags"] or "pass"} mass {m["facts"].get("mass")}  headMid {b["facts"].get("headMid")}->{m["facts"].get("headMid")}')
        print('\n'.join(rows)); print(f'\n{len(res)} fish: map better {len(better)}, worse {len(worse)}, same {len(same)}')
        print('hard-flagged: base', sum(bool(v["base"]["flags"]) for v in res.values()), 'map', sum(bool(v["map"]["flags"]) for v in res.values()))
        print('better:', ' '.join(better)); print('worse:', ' '.join(worse)); sys.exit(0)
    for v in ('base', 'map'): tree(os.path.join(scratch, v))
    spc = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'src', 'data', 'species.json'), encoding='utf8'))['species']}
    jobs_l = []
    for b in ('b5', 'b6', 'b7', 'b8'):
        for d in sorted(glob.glob(f'{G.SHEETS}/*-{b}-gen')):
            base = os.path.basename(d)[:-len(f'-{b}-gen')]
            if base in spc and os.path.exists(d + '/sheet.webp') and (not only or base in only): jobs_l.append((d, base + 'b', spc[base]))
    res = {}; rp = os.path.join(scratch, 'result.json')
    if os.path.exists(rp): res = json.load(open(rp))

    def go(j):
        d, fid, s = j
        if fid in res: return
        # the two variants of one fish run one after the other; different fish run in parallel (each variant has its own tree)
        res[fid] = {v: one(scratch, v, d, fid, s) for v in ('base', 'map')}; json.dump(res, open(rp, 'w'), indent=1); print(fid, flush=True)
    with ThreadPoolExecutor(jobs) as ex: list(ex.map(go, jobs_l))
    print('done', len(res))
