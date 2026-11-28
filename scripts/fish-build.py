#!/usr/bin/env python3
"""One-shot build of a photo fish from a spec file (method doc: the build chain). Replaces steps B-H by hand.
  python -I scripts/fish-build.py research/fish-specs/<id>.json [--work <dir>]
Spec (all coordinates in SHEET px, side panel first): see research/fish-specs/clownknife.json.
Runs: crop + pad the side panel -> fish-outline.py (+ landmarks) -> fish-topview.py -> fish-thickfit.py -> fish-cutout-card.py ->
fish-projcards.py -> WebPs in public/art/fish -> src/data/fishart/<id>.anatomy.json (with the `render.photo` block that
src/art/photofish.ts reads) -> species.json entry. Needs numpy + Pillow."""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
def find_bands(thr, gap):
    rows = np.nonzero((np.asarray(sheet).max(2) > thr).any(1))[0]
    out = []; s = p = rows[0]
    for r in rows[1:]:
        if r - p > gap:
            out.append((s, p)); s = r
        p = r
    out.append((s, p)); return [b for b in out if b[1] - b[0] > 30]


BAND_THR = 40; bands = find_bands(40, 3)
if len(bands) != 3:   # a near-black fish (black molly, b6): its top view's dark back fell under 40 and split the panel in two
    BAND_THR = 12; bands = find_bands(12, 12)
if BAND_THR == 40 and len(bands) == 3:   # near-black fish whose panels still split cleanly (red-tail shark, b6): the top view's dark back
    _mx = np.asarray(sheet).max(2)[bands[0][0]:bands[0][1] + 1]; _fish = _mx[_mx > 8]   # still fell under 30 in fish-topview (hourglass)
    if _fish.size and np.median(_fish) < 60: BAND_THR = 12; print('  near-black fish (side median %.0f): masks at 12' % np.median(_fish))
a = np.asarray(sheet).max(2) > BAND_THR
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
EDGE = None   # flesh-to-tail-fin line from panel 5's fin map (scripts/fish-stalk-edge.py, method row 61): the SL end and the stalk depth
if spec.get('fin_opacity') not in (None, False) and spec.get('stalk_edge', True):
    sw_ = os.path.join(os.path.dirname(spec['sheet']), 'sheet.webp')
    if os.path.exists(sw_):
        EDGE = json.loads(run(S('fish-stalk-edge.py'), sw_, LM['ped'][0], LM['ped'][1]).strip() or 'null')
    if EDGE:
        print('stalk edge from the fin map: ped %s -> %s (%+.0f px)' % (LM['ped'], EDGE['ped'], EDGE['shift']))
        LM['ped'] = EDGE['ped']
    else:
        print('stalk edge: no 5-panel sheet.webp beside the sheet (or no edge found): ped kept at', LM['ped'])
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


pel_ = (spec.get('pelvic') or {}).get('poly') or []
if pel_:   # the pelvic's attached edge (the poly's top run, root included) is the belly line across the fin, as analBase is for the anal fin
    my_ = min(p_[1] for p_ in pel_); pelB = sorted({p_[0]: p_ for p_ in pel_ if p_[1] <= my_ + 5 or p_ == pel_[0]}.values())
else: pelB = []
json.dump({'ped': [LM['ped'][0] / 2, LM['ped'][1] / 2], 'dorsalBase': half(LM.get('dorsalBase', [])), 'analBase': half(LM.get('analBase', [])), 'pelvicBase': half(pelB) if len(pelB) >= 2 else []},
          open(os.path.join(work, 'lm.json'), 'w'))
anat = os.path.join(work, 'a.json')
at = os.path.join(work, 'a.t.json')
extra = (['--dense'] if spec.get('dense') else []) + (['--dorsals', '2'] if spec.get('dorsals') == 2 else []) + (['--fin-gap', str(spec.get('fin_gap', 40))] if spec.get('finlets') else []) + (['--smooth'] if spec.get('smooth') else []) + (['--warm', '--blue', str(spec['warm'])] if spec.get('warm') else [])
run(S('fish-outline.py'), os.path.join(work, 'side.png'), anat, *spec.get('outline', '--level --thr 8 --open 9').split(), '--landmarks', os.path.join(work, 'lm.json'), *extra)
pw = spec.get('pec_window', [22, 44])
run(S('fish-topview.py'), os.path.join(work, 'sheet.png'), anat, at, ty0 - 6, ty1 + 6, '--x0', 0, '--fullbody', *(['--anchor'] if spec.get('anchor_top', True) else []), '--pec0', pw[0], '--pec1', pw[1], *(['--mask-thr', BAND_THR] if BAND_THR < 40 else []))
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
if EDGE:   # the whole depth profile against panel 5's grey body (method row 61): fin roots along the back and belly are not body
    import importlib.util as ilu_se
    sp_se = ilu_se.spec_from_file_location('stalkedge', S('fish-stalk-edge.py')); se_ = ilu_se.module_from_spec(sp_se); sp_se.loader.exec_module(se_)
    A['_rotationDeg'] = J['method']['rotationDeg']
    SW_ = os.path.join(os.path.dirname(spec['sheet']), 'sheet.webp')
    skip_ = [(min(q[0] for q in spec[k_]['poly']) - 8, max(q[0] for q in spec[k_]['poly']) + 8) for k_ in spec.get('clamp_skip', ['pectoral', 'pelvic']) if spec.get(k_, {}).get('poly')]   # spec 'clamp_skip': ['pectoral'] when the pelvic fin lies along the belly and its stations read as body (afrab, method row 67)
    ch_ = se_.clamp_profile(SW_, A, skip_x=skip_, top=spec.get('clamp_top', True))   # paired-fin stations are not clamped to the fin map (the waist at the pectoral, method row 65)
    for fk_, runs_ in se_.fin_bases(SW_, A).items():   # fin bases from the fin map: only ever widened (a short base cut the fin's front off)
        cand_ = [(n_, r_) for n_ in (fk_, fk_ + '2') if A['fins'].get(n_) and A['fins'][n_].get('baseStartPctSL') is not None for r_ in runs_]
        if not cand_: continue
        n_, (b0_, b1_) = max(cand_, key=lambda c: min(c[1][1], A['fins'][c[0]]['baseEndPctSL']) - max(c[1][0], A['fins'][c[0]]['baseStartPctSL']))
        if fk_ == 'dorsal':   # a red piece behind every dorsal that does not overlap one: the adipose (black skirt, neon), so the card keeps its root
            ends_ = [A['fins'][n]['baseEndPctSL'] for n in ('dorsal', 'dorsal2') if A['fins'].get(n) and A['fins'][n].get('baseEndPctSL') is not None]
            rear_ = [r for r in runs_ if ends_ and r[0] > max(ends_) + 2]
            if rear_: A['fins']['adipose'] = {'baseStartPctSL': rear_[-1][0], 'baseEndPctSL': rear_[-1][1]}; print('adipose from the fin map: %.1f-%.1f %% SL' % tuple(rear_[-1]))
        f_ = A['fins'][n_]; o0_, o1_ = f_['baseStartPctSL'], f_['baseEndPctSL']
        if min(b1_, o1_) - max(b0_, o0_) < 0: continue   # no overlap: a different fin, leave it
        f_['baseStartPctSL'], f_['baseEndPctSL'] = round(min(o0_, b0_), 2), round(max(o1_, b1_), 2)
        if (f_['baseStartPctSL'], f_['baseEndPctSL']) != (o0_, o1_): print('%s base from the fin map: %.1f-%.1f -> %.1f-%.1f %% SL' % (n_, o0_, o1_, f_['baseStartPctSL'], f_['baseEndPctSL']))
    del A['_rotationDeg']
    if ch_: print('depth profile clamped to the fin map at %d station sides: %s' % (len(ch_), ', '.join('%g %s %.1f->%.1f' % c for c in ch_[:8])))
STALK = spec.get('stalk')
if STALK is None and EDGE:   # the fin map's stalk height where the fin starts, split about the axis at the SL end
    sl_e = A['slPx'] * 2; ax_e = A['landmarks']['snoutPxOriginal'][1] * 2
    STALK = [round((ax_e - EDGE['top']) / sl_e * 100, 2), round((EDGE['bottom'] - ax_e) / sl_e * 100, 2)]
    print('stalk depth from the fin map: top %.1f / bottom %.1f %% SL' % tuple(STALK))
if STALK:   # 'stalk': [top, bottom] % SL, the painted tail stalk's half-depths at 100 % SL (method row 61). Long fin bases that run over the
    # stalk (betta: dorsal and anal to 98-104 % SL) read as body there, so the solid filled the fin roots and a see-through fin showed it as a
    # darker block (two layers). From 80 % SL the profile eases down to these values; never raised
    st_ = dp_['stations']
    for k_, cap_ in zip(('top', 'bottom'), STALK):
        v80_ = abs(float(np.interp(80, st_, dp_[k_])))
        for i_, s_ in enumerate(st_):
            if s_ <= 80 or v80_ <= cap_: continue
            u_ = (s_ - 80) / 20; want_ = v80_ + (cap_ - v80_) * u_ * u_ * (3 - 2 * u_)
            if abs(dp_[k_][i_]) > want_: dp_[k_][i_] = round(float(np.sign(dp_[k_][i_]) or 1) * want_, 3)
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


def lin_hex(h):   # with sat_lin the iris colours get the card's linear-light pre-desaturation too: the shader boosts the eye like the body (dwarf rasbora's pale gold iris read yellow, b6)
    if not h or not spec.get('sat_lin'): return h
    if isinstance(h, list): return [lin_hex(x) for x in h]
    c = np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]) / 255; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    y = c @ np.array([0.2126, 0.7152, 0.0722]); c = np.clip(y + (c - y) * sat, 0, 1); c = np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
    return '#' + ''.join('%02x' % int(round(v * 255)) for v in c)
shots = os.path.join(ROOT, 'shots')
os.makedirs(shots, exist_ok=True)
card = os.path.join(shots, ID + '-card.png')
er = sum([['--erase', ','.join(map(str, e))] for e in spec.get('erase', [])], [])
common = ['--aspect', asp, '--clip-head', spec.get('clip_head', 25), '--alo', alo, '--aw', aw, '--sat', sat]
if spec.get('sat_lin'): common += ['--sat-lin', 1]   # sat applied in linear light: keeps the hue (cutout-card desat_lin); opt-in, b6 2026-11-24
if spec.get('solid', 5): common += ['--solid', spec.get('solid', 5)]   # opaque inside the fish silhouette (method row 45); 'solid': 0 = brightness alpha only
if spec.get('solid', 5) and spec.get('solid_near'): common += ['--solid-near', spec['solid_near']]   # a black gap enclosed by fins deeper than 15 px from the background (goldfish: anal fin on the lower tail lobe, 18.4 px; method row 72) is background, not a dark mark
side_card = os.path.join(work, 'side_full.png')
if spec.get('root_band', 1):   # pale band at the body / tail-fin join (scripts/fishroot.py, method row 63)
    import fishroot; print('root band: %d px darkened in side_full.png' % fishroot.smooth_root(side_card, LM['ped']))
if spec.get('card_sheet'):   # the body card from a sheet whose panel 1 has the paired fins replaced by the finless flank (the 3D fins draw themselves); the fin card keeps them
    cs_ = Image.open(spec['card_sheet']).convert('RGB')
    # flank holes (convict, 2026-11-24): where the finless flank replaced the pectoral, dark stripe pixels came out pure black, and the cutout
    # reads pure black as background: holes in the body texture. Pixels black on the card sheet but not on the fin sheet are filled from
    # their surroundings (harmonic fill: each pass, every hole pixel takes the mean of its filled neighbours)
    ca_ = np.asarray(cs_).astype(float); sa_ = np.asarray(sheet).astype(float)
    if ca_.shape == sa_.shape:
        from scipy import ndimage as nd_
        pasted_ = nd_.binary_dilation(np.abs(ca_ - sa_).max(2) > 30, iterations=15)   # where the finless flank was pasted in (the pectoral's place)
        body_ = nd_.binary_fill_holes(nd_.binary_closing(sa_.max(2) > 40, iterations=3))   # inside the fish (black not reaching the background)
        hole_ = (ca_.max(2) < 14) & pasted_ & body_; hole_[sy1 + 8:] = False
        ex_, ey_, er_ = spec['eye']; yy_, xx_ = np.ogrid[:hole_.shape[0], :hole_.shape[1]]; hole_ &= (xx_ - ex_) ** 2 + (yy_ - ey_) ** 2 > (2.5 * er_) ** 2   # never the pupil
        hole_ = nd_.binary_dilation(hole_, iterations=3) & body_ & (ca_.max(2) < 60)   # and its dark anti-aliased rim, so the fill does not take its colour
        if hole_.any():
            known_ = (~hole_).astype(float); img_ = ca_ * known_[..., None]; k_ = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], float)
            ys_, xs_ = np.nonzero(hole_); y0h_, y1h_, x0h_, x1h_ = max(0, ys_.min() - 2), ys_.max() + 3, max(0, xs_.min() - 2), xs_.max() + 3
            sub_ = img_[y0h_:y1h_, x0h_:x1h_].copy(); w_ = known_[y0h_:y1h_, x0h_:x1h_].copy(); hs_ = hole_[y0h_:y1h_, x0h_:x1h_]
            for _ in range(400):
                num_ = np.dstack([nd_.convolve(sub_[..., c] * w_, k_, mode='nearest') for c in range(3)]); den_ = nd_.convolve(w_, k_, mode='nearest')
                upd_ = hs_ & (den_ > 0); sub_[upd_] = num_[upd_] / den_[upd_, None]; w_[upd_] = 1.0
            ca_[y0h_:y1h_, x0h_:x1h_] = np.where(hs_[..., None], sub_, ca_[y0h_:y1h_, x0h_:x1h_])
            cs_ = Image.fromarray(np.clip(ca_, 0, 255).astype(np.uint8)); print('card sheet: %d black flank px filled' % hole_.sum())
    sqc = Image.new('RGB', (N, N)); sqc.paste(cs_.crop((0, 0, cs_.width, sy1 + 8)), (0, 0))
    side_card = os.path.join(work, 'side_full_card.png'); sqc.save(side_card)
    if spec.get('root_band', 1): import fishroot; print('root band: %d px darkened in side_full_card.png' % fishroot.smooth_root(side_card, LM['ped']))
if spec.get('body_recolour'):   # body-only recolour (harlequin too orange, Nathan 2026-11-27; scripts/fishrecolour.py, method row 74): fins and the fin card keep the sheet's colour
    import fishrecolour; print('body recolour: %d px in %s' % (fishrecolour.recolour_side(side_card, A, spec['body_recolour'], spec.get('eye')), os.path.basename(side_card)))
FO = spec.get('fin_opacity')   # per-fin opacity profiles (method row 61): the card keeps coverage only, scripts/fish-fin-opacity.py writes the maps below
mem = ['--membrane', ','.join(map(str, spec['membrane']))] if spec.get('membrane') and FO is None else []   # see-through median fins (method row 61): body card only, the fin card feeds the paired fins, which get their own membrane in textures.ts
run(S('fish-cutout-card.py'), side_card, anat, card, *common, *er, *mem)
fincard = os.path.join(shots, ID + '-fincard.png')
fincommon = [v for i, v in enumerate(common) if not (v == '--clip-head' or (i and common[i - 1] == '--clip-head'))]   # the fin card is read only inside the fin polygons: no head clip, which cut the tailspot blenny's throat pelvics (method row 47)
fin_src = os.path.join(work, 'side_full.png')
if (spec.get('body_recolour') or {}).get('pectoral') is not None and (spec.get('pectoral') or {}).get('poly'):   # clear pectorals the sheet painted coloured (harlequin)
    import fishrecolour; fishrecolour.recolour_poly(fin_src, os.path.join(work, 'side_full_fin.png'), spec['pectoral']['poly'], spec['body_recolour']['pectoral'], spec['body_recolour']); fin_src = os.path.join(work, 'side_full_fin.png')
run(S('fish-cutout-card.py'), fin_src, anat, fincard, *fincommon)
proj_src = os.path.join(work, 'sheet.png')
if spec.get('body_recolour'):   # the top and front panels show no fins: the whole fish there gets the body colour
    import fishrecolour; fishrecolour.recolour_panels(proj_src, os.path.join(work, 'sheet_rc.png'), [(ty0 - 6, ty1 + 6), (fy0_ - 4, fy1_ + 4)], spec['body_recolour'], BAND_THR); proj_src = os.path.join(work, 'sheet_rc.png')
run(S('fish-projcards.py'), proj_src, proj_src, at, os.path.join(shots, ID + '-proj'),
    '--top', '%d,%d' % (ty0 - 6, ty1 + 6), '--front', '%d,%d,%d,%d' % (fx0, fy0_ - 4, fx1, fy1_ + 4), '--sat', sat, *(['--mask-thr', BAND_THR] if BAND_THR < 40 else []))
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
    if os.environ.get('FRONT_DEBUG'): from PIL import Image as _I; _I.fromarray(fa.clip(0, 255).astype('uint8')).save(os.environ['FRONT_DEBUG']); print('front crop', hh, ww, 'ax', ax, 'eye', e, 'TL', TL)
    bodym = fa > 40
    xs_b = np.nonzero(bodym.sum(0) > hh * 0.15)[0]
    cxf = (xs_b.min() + xs_b.max()) / 2
    best_ = None
    # strict pass first (small black pupils), then a relaxed one for big dark eyes with a highlight; last, a wide pass for narrow faces whose
    # eyes sit on the oval's edge (three-spot b7, Nathan 2026-11-25: missed, the outline fallback put the mouth on the chin)
    for thr_, amin_, rnd_, cw_, mg_ in ((60, 40, .6, .25, 8), (75, 100, .5, .25, 8), (75, 40, .3, .45, 2)):   # .3: a highlight leaves the eye a ring, not a disc
        if best_: break
        dk = (fa < thr_) & np.pad(np.ones((hh - 20, ww - 20), bool), 10)
        inside = np.zeros_like(dk)
        for r_ in range(hh):
            c_ = np.nonzero(bodym[r_])[0]
            if len(c_) > 20: inside[r_, c_.min() + mg_:c_.max() - mg_ + 1] = True
        dk &= inside & (np.abs(np.arange(ww) - cxf) < ww * cw_)[None, :]   # dark pixels inside the fish, not the black background
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
         'pec': spec.get('pectoral'), 'pelvic': spec.get('pelvic'), 'eyeIris': lin_hex(spec.get('eye_iris')), 'eyePupil': spec.get('eye_pupil'), 'eyeFull': spec.get('eye_full'), 'pupilFrac': spec.get('eye_pupil_frac'), **({'eyeBulge': spec['eye_bulge']} if spec.get('eye_bulge') else {}),
         'proj': {'fk': round(TL, 1), 'y0': spec.get('fy0', FY0), **({'topRamp': spec['top_ramp']} if spec.get('top_ramp') else {}), **({'ramp': spec['front_ramp']} if spec.get('front_ramp') else {})}, 'thickx': THICKX, 'noTail': bool(spec.get('no_tail')), 'measuredWidth': bool(spec.get('measured_width')), 'aspect': asp, 'finImg': bool(er or spec.get('card_sheet')), **({'planExtra': spec['plan_extra']} if spec.get('plan_extra') else {}), **({'finlets': spec['finlets']} if spec.get('finlets') else {}), **({'opacity': True} if FO is not None and FO is not False else {}), **({'stalkEdge': EDGE['curve']} if EDGE else {})}
if spec.get('width_fit'): photo['widthFit'] = spec['width_fit']   # 'uniform': one thickx for every station instead of photofish.ts widthScale()'s soft cap
if spec.get('body_clear') is not None: photo['bodyClear'] = spec['body_clear']   # see-through body zones from the photo check (scripts/fish-body-class.py, method row 62)
A['render'] = {'note': 'built by scripts/fish-build.py from ' + os.path.basename(sys.argv[1]), 'photo': photo, 'fit': fit}
J['art'] = ID
json.dump(J, open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), 'w', encoding='utf8'), indent=1)
if FO is not None and FO is not False:   # {} = the defaults by fin type; false = opaque fins as before
    print(run(S('fish-fin-opacity.py'), ID).strip())
import hashlib   # build stamp: photofish.ts puts it on the image URLs, so a rebuilt fish's images are never served from the browser's cache
h_ = hashlib.sha1()
for f_ in sorted(os.listdir(out)):
    if f_.startswith(ID + '.') or f_.startswith(ID + '-'): h_.update(open(os.path.join(out, f_), 'rb').read())
photo['ver'] = h_.hexdigest()[:8]
json.dump(J, open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), 'w', encoding='utf8'), indent=1)
sp = os.path.join(ROOT, 'src', 'data', 'species.json')
txt = open(sp, encoding='utf8').read()
if '"id": "%s"' % ID not in txt:
    m = spec['species']
    line = '  {"id": "%s", "name": "%s", "sci": "%s", "tl": %s, "art": "%s", "aspect": %s},\n' % (ID, m['name'], m['sci'], m['tl'], ID, asp)
    i = txt.index('  {"id": "oscar",')
    open(sp, 'w', encoding='utf8').write(txt[:i] + line + txt[i:])
else:   # a rebuild keeps the entry but its aspect must follow the new card (guppy 2026-11-24: 0.596 left in place after a 0.393 rebuild)
    import re as re_
    new_ = re_.sub(r'(\{"id": "%s"[^\n]*?"aspect": )[0-9.]+' % re_.escape(ID), lambda m_: m_.group(1) + str(asp), txt, count=1)
    if new_ != txt: open(sp, 'w', encoding='utf8').write(new_)
if EDGE:   # self-check picture + warnings against the fin map (method row 61): shots/<id>-mapcheck.png
    A['_rotationDeg'] = J['method']['rotationDeg']
    for w_ in se_.check_picture(SW_, A, card, os.path.join(shots, ID + '-mapcheck.png')): print('CHECK body vs fin map:', w_)
    del A['_rotationDeg']
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
