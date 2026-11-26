"""Batch build-B builder (method row 61): builds each fish of a sheet batch as its sheet lands, while Nathan keeps making the rest.
For every <SHEETS>/<base>-<batch>-gen folder that has sheet.webp and no build.json yet, in the order the sheets were filed:
  1. fish-new.py <folder> <base>b "<name>" "<sci>" <tl>   (name, sci, TL from the base species' entry in src/data/species.json;
     audit, depth stretch, fin cut, spec, build, mass check, auto-saturation: all of fish-new's steps);
  2. headless side + top shots (fish-autoshot.mjs, tag b5);
  3. <folder>/build.json: ok / failed, the last lines of the log, sat, shot files. Full log in <folder>/build.log.
It keeps checking for new sheets until every folder of the batch is built, or none has landed for --idle minutes (default 45),
then writes shots/<batch>-grid.jpg (the sheet's side row beside the built fish's side, one row per fish) and a summary table.
Usage: python -I scripts/fish-batch.py [--batch b5] [--idle 45] [--only angel,betta] [--rebuild angel] [--group 4]"""
import sys, os, json, glob, time, subprocess
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
SHEETS = 'C:/Users/nreed/fish-sheets'


def log(msg): print(time.strftime('%H:%M ') + msg, flush=True)


def species():
    return {s['id']: s for s in json.load(open(os.path.join(ROOT, 'src', 'data', 'species.json'), encoding='utf8'))['species']}


def build(d, base, batch):
    sp = species().get(base)
    if not sp: return {'ok': False, 'why': f'{base} not in species.json'}
    ID = base + 'b'; t = time.time()
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fish-new.py'), d, ID, sp['name'], sp['sci'], str(sp['tl'])],
                       cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr; open(os.path.join(d, 'build.log'), 'w', encoding='utf-8').write(out)
    res = {'id': ID, 'ok': r.returncode == 0, 'minutes': round((time.time() - t) / 60, 1),
           'tail': [l for l in out.strip().splitlines() if l.strip()][-6:], 'built': time.strftime('%Y-%m-%d %H:%M')}
    if res['ok']:
        try: res['sat'] = json.load(open(os.path.join(ROOT, 'research', 'fish-specs', ID + '.json'))).get('sat')
        except Exception: pass
        s = subprocess.run(['node', os.path.join('scripts', 'fish-autoshot.mjs'), f'{ID}:{sp["tl"]}', '--views', 'side,top', '--tag', batch],
                           cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=os.name == 'nt')
        line = [l for l in s.stdout.splitlines() if l.startswith('{')]
        res['shots'] = json.loads(line[-1]) if line else {'ok': [], 'fail': [s.stderr.strip()[-300:]]}
        try:   # build gate (fish-gate.py): REPORT mode, flags are recorded and printed, never block `ok`
            import importlib.util as ilu; sp_ = ilu.spec_from_file_location('fishgate', os.path.join(HERE, 'fish-gate.py')); g_ = ilu.module_from_spec(sp_); sp_.loader.exec_module(g_)
            res['gate'] = g_.gate(d, ID)
            if g_.MODE == 'block' and not res['gate']['pass']: res['ok'] = False
        except Exception as e: res['gate'] = {'mode': 'report', 'pass': None, 'flags': ['gate-error: ' + str(e)[:120]], 'soft': [], 'facts': {}}
    return res


def crop(im, pad=10):
    import numpy as np
    a = np.asarray(im.convert('RGB')).astype(int); m = np.abs(a - a[2, 2]).sum(2) > 40; ys, xs = np.where(m)
    if not len(xs): return im
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))


def grid(rows, batch):
    """rows: (label, sheet.webp, side shot png or None). Sheet side row left, built fish right."""
    import fishsheet as fs
    W, H = 420, 190; out = Image.new('RGB', (2 * W + 20, len(rows) * (H + 26) + 10), (245, 245, 245)); dr = ImageDraw.Draw(out)
    for i, (label, sheet, shot) in enumerate(rows):
        y = 10 + i * (H + 26); dr.text((10, y), label, fill=(0, 0, 0))
        try:
            _, M = fs.load(sheet); y0, y1 = fs.panel_bands(M)[0][:2]; im = Image.open(sheet).convert('RGB'); im = crop(im.crop((0, y0, im.width, y1 + 1)))
        except Exception: im = None
        for j, p in enumerate((im, Image.open(shot) if shot and os.path.exists(shot) else None)):
            if p is None: dr.text((10 + j * (W + 10), y + 80), 'missing', fill=(200, 0, 0)); continue
            p = crop(p) if j else p; p.thumbnail((W, H)); out.paste(p, (10 + j * (W + 10), y + 16))
    f = os.path.join(ROOT, 'shots', f'{batch}-grid.jpg'); out.save(f, quality=88); return f


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith('--')}
    batch = opt.get('--batch', 'b5'); idle = float(opt.get('--idle', 45)) * 60; group = int(opt.get('--group', 0)); built = 0   # --group N: exit after N builds (one review group of N fish for Nathan)
    only = set(opt['--only'].split(',')) if '--only' in opt else None; redo = set(opt.get('--rebuild', '').split(',')) - {''}
    dirs = sorted(d for d in glob.glob(f'{SHEETS}/*-{batch}-gen') if os.path.exists(d + '/prompt.txt'))
    base = lambda d: os.path.basename(d)[:-len(f'-{batch}-gen')]
    if only: dirs = [d for d in dirs if base(d) in only]
    for d in dirs:
        if base(d) in redo and os.path.exists(d + '/build.json'): os.remove(d + '/build.json')
    log(f'{len(dirs)} fish in batch {batch}; building each as its sheet lands (stops after {idle / 60:.0f} min with no new sheet)')
    last = time.time()
    while True:
        todo = sorted((os.path.getmtime(d + '/sheet.webp'), d) for d in dirs if os.path.exists(d + '/sheet.webp') and not os.path.exists(d + '/build.json'))
        if todo:
            d = todo[0][1]; log(f'building {base(d)}b ...'); res = build(d, base(d), batch)
            json.dump(res, open(d + '/build.json', 'w'), indent=1); last = time.time(); built += 1
            log(f'{base(d)}b: ' + ('ok' if res.get('ok') else 'FAILED') + f' ({res.get("minutes")} min, sat {res.get("sat")})' + ('' if res.get('ok') else ': ' + ' | '.join(res.get('tail', [res.get('why', '')]))))
            if group and built >= group: break
            continue
        if all(os.path.exists(d + '/build.json') for d in dirs) or time.time() - last > idle: break
        time.sleep(20)
    rows, table = [], []
    for d in dirs:
        if not os.path.exists(d + '/build.json'): table.append(f'{base(d)}b: no sheet yet'); continue
        r = json.load(open(d + '/build.json')); shot = next((os.path.join(ROOT, 'shots', f + '.png') for f in r.get('shots', {}).get('ok', []) if '-side' in f), None)
        rows.append((f'{r.get("id")}  {"ok" if r.get("ok") else "FAILED"}  sat {r.get("sat")}', d + '/sheet.webp', shot))
        table.append(f'{r.get("id")}: ' + ('ok' if r.get('ok') else 'FAILED: ' + ' | '.join(r.get('tail', [])[-2:])) + (f', sat {r.get("sat")}' if r.get('sat') else ''))
    if rows: log('grid: ' + grid(rows, batch))
    print('\n'.join(table))


if __name__ == '__main__':
    main(sys.argv[1:])
