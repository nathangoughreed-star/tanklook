#!/usr/bin/env python3
"""One-shot build of a photo fish from a spec file (method doc: the build chain). Replaces steps B-H by hand.
  python -I scripts/fish-build.py research/fish-specs/<id>.json [--work <dir>]
Spec (all coordinates in SHEET px, side panel first): see research/fish-specs/clownknife.json.
Runs: crop + pad the side panel -> fish-outline.py (+ landmarks) -> fish-topview.py -> fish-thickfit.py -> fish-cutout-card.py ->
fish-projcards.py -> WebPs in public/art/fish -> src/data/fishart/<id>.anatomy.json (with the `render.photo` block that
src/art/photofish.ts reads) -> species.json entry. Needs numpy + Pillow."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
spec = json.load(open(sys.argv[1], encoding='utf8')); ID = spec['id']
work = sys.argv[sys.argv.index('--work') + 1] if '--work' in sys.argv else os.path.join(os.path.expanduser('~'), 'fish-sheets', ID + '-build')
os.makedirs(work, exist_ok=True)


def run(*a):
    r = subprocess.run([sys.executable, '-I', *map(str, a)], capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        sys.exit('FAILED: %s\n%s' % (a, r.stderr[-800:]))
    return r.stdout


def S(n):
    return os.path.join(HERE, n)


sheet = Image.open(spec['sheet']).convert('RGB')
sheet.save(os.path.join(work, 'sheet.png'))
a = np.asarray(sheet).max(2) > 40
rows = np.nonzero(a.any(1))[0]
bands = []
s = p = rows[0]
for r in rows[1:]:
    if r - p > 3:
        bands.append((s, p))
        s = r
    p = r
bands.append((s, p))
bands = [b for b in bands if b[1] - b[0] > 30]
if len(bands) != 3:
    sys.exit('expected 3 panels, found %s (run scripts/fish-sheet-audit.py)' % bands)
sy0, sy1 = bands[0]
ty0, ty1 = bands[1]
fy0_, fy1_ = bands[2]
cols = np.nonzero(a[fy0_:fy1_ + 1].any(0))[0]
fx0, fx1 = max(0, int(cols.min()) - 10), min(sheet.width, int(cols.max()) + 10)
N = max(sheet.width, sy1 + 10)
N += N % 2
sq = Image.new('RGB', (N, N))
sq.paste(sheet.crop((0, 0, sheet.width, sy1 + 8)), (0, 0))
sq.save(os.path.join(work, 'side_full.png'))
sq.resize((N // 2, N // 2), Image.LANCZOS).save(os.path.join(work, 'side.png'))
LM = spec['landmarks']


def half(pts):
    return [[x / 2, y / 2] for x, y in pts]


json.dump({'ped': [LM['ped'][0] / 2, LM['ped'][1] / 2], 'dorsalBase': half(LM.get('dorsalBase', [])), 'analBase': half(LM.get('analBase', []))},
          open(os.path.join(work, 'lm.json'), 'w'))
anat = os.path.join(work, 'a.json')
at = os.path.join(work, 'a.t.json')
extra = (['--dense'] if spec.get('dense') else []) + (['--dorsals', '2'] if spec.get('dorsals') == 2 else []) + (['--smooth'] if spec.get('smooth') else []) + (['--warm', '--blue', str(spec['warm'])] if spec.get('warm') else [])
run(S('fish-outline.py'), os.path.join(work, 'side.png'), anat, *spec.get('outline', '--level --thr 8 --open 9').split(), '--landmarks', os.path.join(work, 'lm.json'), *extra)
pw = spec.get('pec_window', [22, 44])
run(S('fish-topview.py'), os.path.join(work, 'sheet.png'), anat, at, ty0 - 6, ty1 + 6, '--x0', 0, '--fullbody', '--pec0', pw[0], '--pec1', pw[1])
fit = run(S('fish-thickfit.py'), at, '--pedt-max', spec.get('pedt_max', 0.3)).strip()
J = json.load(open(at, encoding='utf8'))
A = J['anatomy']
sx, sl = A['landmarks']['snoutPxOriginal'][0] * 2, A['slPx'] * 2
ax = A['landmarks']['snoutPxOriginal'][1] * 2
TL = A['tlPx'] * 2
asp = round((max(ax - sy0, sy1 - ax) * 2 / TL) + 0.02, 3)
sat, alo, aw = spec.get('sat', 1.0), spec.get('alo', 4), spec.get('aw', 14)
shots = os.path.join(ROOT, 'shots')
os.makedirs(shots, exist_ok=True)
card = os.path.join(shots, ID + '-card.png')
er = sum([['--erase', ','.join(map(str, e))] for e in spec.get('erase', [])], [])
common = ['--aspect', asp, '--clip-head', spec.get('clip_head', 25), '--alo', alo, '--aw', aw, '--sat', sat]
run(S('fish-cutout-card.py'), os.path.join(work, 'side_full.png'), anat, card, *common, *er)
fincard = os.path.join(shots, ID + '-fincard.png')
run(S('fish-cutout-card.py'), os.path.join(work, 'side_full.png'), anat, fincard, *common)
run(S('fish-projcards.py'), os.path.join(work, 'sheet.png'), os.path.join(work, 'sheet.png'), at, os.path.join(shots, ID + '-proj'),
    '--top', '%d,%d' % (ty0 - 6, ty1 + 6), '--front', '%d,%d,%d,%d' % (fx0, fy0_ - 4, fx1, fy1_ + 4), '--sat', sat)
out = os.path.join(ROOT, 'public', 'art', 'fish')
os.makedirs(out, exist_ok=True)
for src, dst in ((card, ID), (os.path.join(shots, ID + '-proj-top.png'), ID + '-top'), (os.path.join(shots, ID + '-proj-front.png'), ID + '-front')):
    Image.open(src).save(os.path.join(out, dst + '.webp'), quality=85)
if er:
    Image.open(fincard).save(os.path.join(out, ID + '-fin.webp'), quality=85)
e = spec['eye']
photo = {'art': ID, 'plan': spec.get('plan', 'oscar'), 'sx': round(sx, 1), 'sl': round(sl, 1), 'ax': round(ax, 1), 'eye': e,
         'pec': spec.get('pectoral'), 'pelvic': spec.get('pelvic'),
         'proj': {'fk': round(TL, 1), 'y0': spec.get('fy0', round((ax - e[1]) / TL, 4))}, 'thickx': spec.get('thickx'), 'noTail': bool(spec.get('no_tail')), 'measuredWidth': bool(spec.get('measured_width')), 'aspect': asp, 'finImg': bool(er)}
A['render'] = {'note': 'built by scripts/fish-build.py from ' + os.path.basename(sys.argv[1]), 'photo': photo, 'fit': fit}
J['art'] = ID
json.dump(J, open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), 'w', encoding='utf8'), indent=1)
sp = os.path.join(ROOT, 'src', 'data', 'species.json')
txt = open(sp, encoding='utf8').read()
if '"id": "%s"' % ID not in txt:
    m = spec['species']
    line = '  {"id": "%s", "name": "%s", "sci": "%s", "tl": %s, "art": "%s", "aspect": %s},\n' % (ID, m['name'], m['sci'], m['tl'], ID, asp)
    i = txt.index('  {"id": "oscar",')
    open(sp, 'w', encoding='utf8').write(txt[:i] + line + txt[i:])
print('OK', ID, 'aspect', asp, 'SL px', round(sl), 'TL px', round(TL), fit)
