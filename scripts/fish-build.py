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
for k_ in ('dorsalBase', 'analBase'):  # the fins overhang the tail stalk: a base line that stops short lets the rear outline read fin lobes as body (E5), so run it to the tail base
    pl_ = LM.get(k_) or []
    if pl_:
        lx_, ly_ = min(pl_, key=lambda p_: p_[0])   # the tail end, whichever order the points were clicked in
        if lx_ > LM['ped'][0] + 25:
            sgn_ = 1 if k_ == 'dorsalBase' else -1   # toward the tail the top edge sinks and the belly edge rises into the stalk
            pl_.append([max(LM['ped'][0] + 66, lx_ - 20), ly_ + sgn_ * 4])
            pl_.append([LM['ped'][0] + 21, ly_ + sgn_ * 11])


def half(pts):
    return [[x / 2, y / 2] for x, y in pts]


json.dump({'ped': [LM['ped'][0] / 2, LM['ped'][1] / 2], 'dorsalBase': half(LM.get('dorsalBase', [])), 'analBase': half(LM.get('analBase', []))},
          open(os.path.join(work, 'lm.json'), 'w'))
anat = os.path.join(work, 'a.json')
at = os.path.join(work, 'a.t.json')
extra = (['--dense'] if spec.get('dense') else []) + (['--dorsals', '2'] if spec.get('dorsals') == 2 else []) + (['--smooth'] if spec.get('smooth') else []) + (['--warm', '--blue', str(spec['warm'])] if spec.get('warm') else [])
run(S('fish-outline.py'), os.path.join(work, 'side.png'), anat, *spec.get('outline', '--level --thr 8 --open 9').split(), '--landmarks', os.path.join(work, 'lm.json'), *extra)
pw = spec.get('pec_window', [22, 44])
run(S('fish-topview.py'), os.path.join(work, 'sheet.png'), anat, at, ty0 - 6, ty1 + 6, '--x0', 0, '--fullbody', *(['--anchor'] if spec.get('anchor_top', True) else []), '--pec0', pw[0], '--pec1', pw[1])
fit = run(S('fish-thickfit.py'), at, '--pedt-max', spec.get('pedt_max', 0.3)).strip()
J = json.load(open(at, encoding='utf8'))
A = J['anatomy']
dp_ = A['depthProfile']   # the rear stations can read fin as body: the tail-fin root, and dorsal / anal tips that overhang the stalk (German blue ram: 97-100 % SL read 27 % SL, the fin tips, so the solid filled the black gaps = dark wedges; method row 43)
for k_ in ('top', 'bottom'):   # from 85 % SL back, the stalk may flare at most 15 % over its smallest depth so far (was: last station only, vs the one before it)
    lo_ = None
    for i_, s_ in enumerate(dp_['stations']):
        if s_ < 85: continue
        v_ = abs(dp_[k_][i_])
        if lo_ is not None and v_ > 1.15 * lo_: dp_[k_][i_] = round(np.sign(dp_[k_][i_]) * 1.15 * lo_, 3); v_ = 1.15 * lo_
        lo_ = v_ if lo_ is None else min(lo_, v_)
if spec.get('measured_width') and spec.get('smooth_tail', True):   # rear half-widths ease from 60 % SL down to the stalk's measured width (a sheet's top view often ends the body in a step: thick stub, then a thin stalk)
    st_, hw_ = A['depthProfile']['stations'], A['thickness']['halfWidthPctSL']
    i0_ = min(range(len(st_)), key=lambda i: abs(st_[i] - 60)); h0_ = hw_[i0_]; he_ = min(hw_[-5:])
    for i in range(i0_, len(st_)):
        u = (st_[i] - st_[i0_]) / max(1e-6, 100 - st_[i0_]); hw_[i] = round(he_ + (h0_ - he_) * 0.5 * (1 + np.cos(np.pi * u)), 3)
TAPER = spec.get('taper', [92, 0.5] if spec.get('measured_width') else None)   # default on for measured widths; 'taper': false turns it off
if TAPER:  # [start % SL, end factor]: the rear half-widths ease down so the body tapers into the flat tail instead of ending in a blunt cut
    t0, tf = TAPER
    st, hw = A['depthProfile']['stations'], A['thickness']['halfWidthPctSL']
    for i, sx_ in enumerate(st):
        if sx_ > t0:
            u = min(1.0, (sx_ - t0) / (100 - t0))
            hw[i] = round(hw[i] * (1 - (1 - tf) * (u * u * (3 - 2 * u))), 3)
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
if spec.get('solid', 5): common += ['--solid', spec.get('solid', 5)]   # opaque inside the fish silhouette (method row 45); 'solid': 0 = brightness alpha only
side_card = os.path.join(work, 'side_full.png')
if spec.get('card_sheet'):   # the body card from a sheet whose panel 1 has the paired fins replaced by the finless flank (the 3D fins draw themselves); the fin card keeps them
    cs_ = Image.open(spec['card_sheet']).convert('RGB'); sqc = Image.new('RGB', (N, N)); sqc.paste(cs_.crop((0, 0, cs_.width, sy1 + 8)), (0, 0))
    side_card = os.path.join(work, 'side_full_card.png'); sqc.save(side_card)
run(S('fish-cutout-card.py'), side_card, anat, card, *common, *er)
fincard = os.path.join(shots, ID + '-fincard.png')
fincommon = [v for i, v in enumerate(common) if not (v == '--clip-head' or (i and common[i - 1] == '--clip-head'))]   # the fin card is read only inside the fin polygons: no head clip, which cut the tailspot blenny's throat pelvics (method row 47)
run(S('fish-cutout-card.py'), os.path.join(work, 'side_full.png'), anat, fincard, *fincommon)
run(S('fish-projcards.py'), os.path.join(work, 'sheet.png'), os.path.join(work, 'sheet.png'), at, os.path.join(shots, ID + '-proj'),
    '--top', '%d,%d' % (ty0 - 6, ty1 + 6), '--front', '%d,%d,%d,%d' % (fx0, fy0_ - 4, fx1, fy1_ + 4), '--sat', sat)
out = os.path.join(ROOT, 'public', 'art', 'fish')
os.makedirs(out, exist_ok=True)
for src, dst in ((card, ID), (os.path.join(shots, ID + '-proj-top.png'), ID + '-top'), (os.path.join(shots, ID + '-proj-front.png'), ID + '-front')):
    Image.open(src).save(os.path.join(out, dst + '.webp'), quality=85)
if er or spec.get('card_sheet'):
    Image.open(fincard).save(os.path.join(out, ID + '-fin.webp'), quality=85)
e = spec['eye']
# front-layer registration (checklist row 29): fy0 = eye height above the axis minus the front eyes' offset above the front crop's centre row, in TL units.
# The front eyes are found as the two darkest round blobs of similar height in the upper-middle of the front panel; fall back to the old default.
FY0 = round((ax - e[1]) / TL, 4)
try:
    fa = np.asarray(sheet).astype(int)[fy0_ - 4:fy1_ + 5, fx0:fx1 + 1].max(2)
    hh, ww = fa.shape
    bodym = fa > 40
    xs_b = np.nonzero(bodym.sum(0) > hh * 0.15)[0]
    cxf = (xs_b.min() + xs_b.max()) / 2
    best_ = None
    for thr_, amin_, rnd_ in ((60, 40, .6), (75, 100, .5)):   # strict pass first (small black pupils), then a relaxed one for big dark eyes with a highlight
        if best_: break
        dk = (fa < thr_) & np.pad(np.ones((hh - 20, ww - 20), bool), 10)
        inside = np.zeros_like(dk)
        for r_ in range(hh):
            c_ = np.nonzero(bodym[r_])[0]
            if len(c_) > 20: inside[r_, c_.min() + 8:c_.max() - 7] = True
        dk &= inside & (np.abs(np.arange(ww) - cxf) < ww * .25)[None, :]   # dark pixels inside the fish, not the black background
        dk[: int(hh * .08)] = False
        dk[int(hh * .65):] = False
        lab_ = np.zeros(dk.shape, int); n_ = 0; blobs_ = []
        for y_, x_ in zip(*np.nonzero(dk)):
            if lab_[y_, x_]: continue
            n_ += 1; st_ = [(y_, x_)]; lab_[y_, x_] = n_; pix = []
            while st_:
                cy_, cx_ = st_.pop(); pix.append((cy_, cx_))
                for dy_, dx_ in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy_, xx_ = cy_ + dy_, cx_ + dx_
                    if 0 <= yy_ < hh and 0 <= xx_ < ww and dk[yy_, xx_] and not lab_[yy_, xx_]:
                        lab_[yy_, xx_] = n_; st_.append((yy_, xx_))
            if len(pix) > amin_:
                py_ = np.array(pix); h_, w_ = np.ptp(py_[:, 0]) + 1, np.ptp(py_[:, 1]) + 1
                if min(h_, w_) / max(h_, w_) > rnd_ and len(pix) / (np.pi / 4 * h_ * w_) > rnd_:
                    blobs_.append((py_[:, 0].mean(), py_[:, 1].mean(), len(pix)))
        for i_ in range(len(blobs_)):
            for j_ in range(i_ + 1, len(blobs_)):
                b1, b2 = blobs_[i_], blobs_[j_]
                if abs(b1[0] - b2[0]) < hh * .05 and (b1[1] - cxf) * (b2[1] - cxf) < 0 and abs((b1[1] + b2[1]) / 2 - cxf) < ww * .06:
                    sc_ = -(b1[0] + b2[0])   # the topmost symmetric pair: eyes sit above the mouth corners and the fin shadows
                    if best_ is None or sc_ > best_[0]: best_ = (sc_, (b1[0] + b2[0]) / 2)
    if best_:
        FY0 = round((ax - e[1]) / TL - (hh / 2 - best_[1]) / TL, 4)
        print('front eyes found: row %.0f of %d -> fy0 %.4f' % (best_[1], hh, FY0))
    else:
        dpt_, dpb_ = A['depthProfile']['top'], A['depthProfile']['bottom']   # no eyes (dark-banded heads): the front crop's centre row sits halfway between the body's highest back and lowest belly
        FY0 = round(((max(dpt_) - max(dpb_)) / 2 / 100 * sl) / TL, 4)
        print('front eyes NOT found: fy0 %.4f from the body outline (centre of the deepest section)' % FY0)
except Exception as ex_:
    print('front eye detection failed (%s): fy0 default %.4f' % (ex_, FY0))
THICKX = spec.get('thickx')
if spec.get('width_pct_sl'):   # handoff step 8 in one pass (method row 44): thickx = measured max width (FishShapes) / drawn max width
    drawn_ = 2 * max(A['thickness']['halfWidthPctSL'])
    want_ = spec['width_pct_sl']
    if spec.get('width_range'):   # proxy numbers (another species' FishShapes): keep the drawn width inside the proxy's measured range, clamp outside it (method row 49)
        want_ = min(max(drawn_, spec['width_range'][0]), spec['width_range'][1])
    THICKX = round(want_ / drawn_, 3)
    print('width: drawn %.1f %% SL, target %.1f%s -> thickx %.3f%s' % (drawn_, want_, ' (proxy range %s)' % spec['width_range'] if spec.get('width_range') else '', THICKX, '' if spec.get('thickx') in (None, THICKX) else ' (spec thickx %s ignored)' % spec['thickx']))
photo = {'art': ID, 'plan': spec.get('plan', 'oscar'), 'sx': round(sx, 1), 'sl': round(sl, 1), 'ax': round(ax, 1), 'eye': e,
         'pec': spec.get('pectoral'), 'pelvic': spec.get('pelvic'), 'eyeIris': spec.get('eye_iris'), 'eyePupil': spec.get('eye_pupil'), 'eyeFull': spec.get('eye_full'), 'pupilFrac': spec.get('eye_pupil_frac'),
         'proj': {'fk': round(TL, 1), 'y0': spec.get('fy0', FY0)}, 'thickx': THICKX, 'noTail': bool(spec.get('no_tail')), 'measuredWidth': bool(spec.get('measured_width')), 'aspect': asp, 'finImg': bool(er or spec.get('card_sheet')), **({'planExtra': spec['plan_extra']} if spec.get('plan_extra') else {})}
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
fsh_ = spec.get('fishshapes') or {}
if fsh_.get('specimens'):   # mass check against the real specimens at their own SL (rows 35, 44); deep-bodied fish ran 1.1-1.4x so far
    import importlib.util as ilu_
    sp_ = ilu_.spec_from_file_location('fishmass', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fish-mass.py')); fm_ = ilu_.module_from_spec(sp_); sp_.loader.exec_module(fm_)
    rs_ = []
    for sl_mm_, w_ in fsh_['specimens']:
        m_ = fm_.mass_g(A, sl_mm_, THICKX); rs_.append(m_ / w_)
        print('  mass at SL %.1f mm (%.2f in): model %.2f g vs FishShapes %.2f g = %.2fx' % (sl_mm_, sl_mm_ / 25.4, m_, w_, m_ / w_))
    print('mass vs FishShapes: %.2f-%.2fx (n %d)%s' % (min(rs_), max(rs_), len(rs_), '  CHECK: outside 0.8-1.45x' if min(rs_) < 0.8 or max(rs_) > 1.45 else ''))
