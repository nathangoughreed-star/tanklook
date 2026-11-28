#!/usr/bin/env python3
"""Flesh-to-tail-fin boundary from the sheet's own fin map (method row 61; Nathan 2026-11-24, convict: "the actual flesh to fin boundary is
this red line, not what you have now. we need a way to reliably get this correct").
  python -I scripts/fish-stalk-edge.py <sheet.webp> <ped_x> <ped_y> [--debug out.png]
Prints JSON {ped: [x, y], top: y, bottom: y, curve: [[x, y], ...], shift: px} in sheet px (panel 1), or null.

Where it came from: `ped` (the SL end) is the finless panel 2's body edge (fish-fin-cut.py / fish-spec-from-fins.py), and ChatGPT draws
that finless stalk on past where panel 1's scales stop (convict 13 px, betta 50 px back on the rays). SL ran long, the lofted solid
filled the tail-fin root, and a see-through tail showed it as a dark block. Texture cues were tried first and are not reliable: the step
from rays to scales traced where the betta's fanned rays converge, and orientation coherence is as high on the convict's stripes and the
betta's scale rows as on rays. Panel 5's grey body (the colour fin map), laid on panel 1 by its silhouette box (fish-fin-cut.py
map_body), lands on the scale edge on all four test sheets (convict curve included). The edge = each row's rear-most grey pixel, over the
rows where that is within 5 % SL of the rear-most one (the near-vertical part, not the back and belly contours running into it)."""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)


def map_mask(sheet):
    """(sheet rgb, non-black mask, panel bands, panel 5's grey body laid on panel 1) or None without a 5th panel."""
    import importlib.util as ilu
    import fishsheet as fs
    sp = ilu.spec_from_file_location('fincut', os.path.join(HERE, 'fish-fin-cut.py')); fc = ilu.module_from_spec(sp); sp.loader.exec_module(fc)
    a, M = fs.load(sheet); bands = fs.panel_bands(M)
    if len(bands) < 5: return None
    o, colw = fc.map_body(a, M, bands)
    return a, M, bands, o, colw


def clamp_profile(sheet, A, margin=1.0, skip_x=(), top=True):
    """Clamp a built depth profile (anatomy A, half-res side.png measures) to panel 5's grey body: no station's top / bottom past the map's
    back / belly + margin % SL. The side outline cannot tell a fin root from the body where a fin runs along it (cherry barb anal fin
    80-90 % SL: the solid filled its root, a dark strip under the stalk; Nathan 2026-11-24). Only ever lowers. Returns the stations changed."""
    from PIL import Image
    mm = map_mask(sheet)
    if mm is None: return None
    o = _rot(A, mm[3]); sx, sy = [v * 2 for v in A['landmarks']['snoutPxOriginal']]; SL = A['slPx'] * 2
    d = A['depthProfile']; changed = []
    for i, s in enumerate(d['stations']):
        x = int(round(sx - s / 100 * SL))
        if not (0 <= x < o.shape[1]): continue
        if any(x0 <= x <= x1 for x0, x1 in skip_x): continue   # paired fins sit ON the body: panel 5's grey body has a hole there, and clamping to it gave a waist (Nathan 2026-11-25, method row 65)
        ys = np.nonzero(o[:, x])[0]
        if len(ys) < 3: continue
        mt, mb = (sy - ys.min()) / SL * 100 + margin, (ys.max() - sy) / SL * 100 + margin
        # top=False (spec clamp_top: false, method row 77): the back keeps panel 2's height; deep angels, whose dorsal rises out of scaled skin that panel 5 paints red
        if top and d['top'][i] > mt: changed.append((s, 'top', d['top'][i], round(mt, 2))); d['top'][i] = round(float(mt), 3)
        if d['bottom'][i] > mb: changed.append((s, 'bottom', d['bottom'][i], round(mb, 2))); d['bottom'][i] = round(float(mb), 3)
    return changed


def _rot(A, m):
    from PIL import Image
    sx, sy = [v * 2 for v in A['landmarks']['snoutPxOriginal']]; rot = A.get('_rotationDeg', 0.0)
    return m if abs(rot) <= 0.01 else np.asarray(Image.fromarray(m.astype(np.uint8) * 255).rotate(rot, resample=Image.NEAREST, center=(sx, sy))) > 127


def fin_bases(sheet, A):
    """Median-fin bases from panel 5: the columns where the red (dorsal) / green (anal) region touches the grey body, as [start, end] % SL.
    The fin cut finds bases as panel 1 minus the finless panel 2, whose body hangs over a fin's front (cherry barb anal: 77-89 % SL
    measured, the painted base runs further forward), and the card cuts everything past the outline in front of a measured base: the
    fin's front came out chopped off in a vertical line (Nathan 2026-11-24)."""
    from scipy import ndimage as nd
    mm = map_mask(sheet)
    if mm is None: return {}
    o, colw = _rot(A, mm[3]), mm[4]; sx = A['landmarks']['snoutPxOriginal'][0] * 2; SL = A['slPx'] * 2
    near = nd.binary_dilation(o, iterations=3); out = {}
    for k, name in ((1, 'dorsal'), (2, 'anal')):
        f = _rot(A, colw == k) & near & ~o
        xs = np.nonzero(f.any(0))[0]
        if len(xs) < 4: continue
        runs, r0 = [], xs[0]   # separate pieces (neon: the adipose is red on the map too, 20 % SL behind the dorsal)
        for p0, p1 in zip(xs[:-1], xs[1:]):
            if p1 - p0 > 0.03 * SL: runs.append((r0, p0)); r0 = p1
        runs.append((r0, xs[-1]))
        out[name] = [[round(float((sx - b) / SL * 100), 2), round(float((sx - a) / SL * 100), 2)] for a, b in runs if b - a >= 3]
    return out


def check_picture(sheet, A, card_png, out_png):
    """Build self-check (method row 61): the body card with the built body outline (yellow) over panel 5's grey body (red) and its fin
    bases (green / magenta ticks). Returns warnings: stations where the outline is past the map body by > 2 % SL, roots of paired fins outside."""
    from PIL import Image, ImageDraw
    mm = map_mask(sheet)
    if mm is None: return []
    o = _rot(A, mm[3]); sx, sy = [v * 2 for v in A['landmarks']['snoutPxOriginal']]; SL = A['slPx'] * 2; d = A['depthProfile']
    card = Image.open(card_png).convert('RGBA'); W, H = card.size; k = 1022 / (A['tlOverSl'] * SL)
    bg = Image.new('RGBA', card.size, (40, 90, 110, 255)); bg.alpha_composite(card); dr = ImageDraw.Draw(bg); warn = []
    X = lambda x: 1022 - (sx - x) * k; Y = lambda y: H / 2 + (y - sy) * k
    for x in range(0, o.shape[1], 2):
        ys = np.nonzero(o[:, x])[0]
        if len(ys): dr.point([(X(x), Y(ys.min())), (X(x), Y(ys.max()))], fill=(255, 60, 60, 255))
    pts = [(X(sx - s / 100 * SL), Y(sy - t / 100 * SL)) for s, t in zip(d['stations'], d['top'])] + [(X(sx - s / 100 * SL), Y(sy + b / 100 * SL)) for s, b in zip(d['stations'][::-1], d['bottom'][::-1])]
    dr.line(pts + [pts[0]], fill=(255, 255, 0, 255), width=1)
    for i, s in enumerate(d['stations']):
        x = int(round(sx - s / 100 * SL)); ys = np.nonzero(o[:, x])[0] if 0 <= x < o.shape[1] else []
        if len(ys) < 3: continue
        for side, v, m in (('top', d['top'][i], (sy - ys.min()) / SL * 100), ('bottom', d['bottom'][i], (ys.max() - sy) / SL * 100)):
            if v > m + 2: warn.append('%g %% SL %s: body %.1f past the fin map %.1f %% SL' % (s, side, v, m))
    bg.convert('RGB').save(out_png)
    return warn


def detect(sheet, px, py, debug=None):
    mm = map_mask(sheet)
    if mm is None: return None
    a, M, bands, o, _ = mm
    Y0, Y1, X0, X1 = bands[0]; sx = np.nonzero(M[Y0:Y1].any(0))[0].max(); SL = max(50.0, sx - px)
    x0, x1 = int(max(0, px - 0.2 * SL)), int(min(M.shape[1], px + 0.25 * SL)); r0, r1 = int(max(Y0, py - 0.3 * SL)), int(min(Y1, py + 0.3 * SL))
    rear = np.full(r1 - r0, np.nan)
    for i, y in enumerate(range(r0, r1)):
        xs = np.nonzero(o[y, x0:x1])[0]
        if len(xs) and xs.min() > 0: rear[i] = xs.min() + x0
    if np.isnan(rear).all(): return None
    lo = np.nanmin(rear); ok = rear <= lo + 0.05 * SL
    ys = np.arange(r0, r1)[ok]; xs = rear[ok]
    if len(ys) < 0.05 * SL: return None
    yy = np.linspace(ys.min(), ys.max(), 13); cx = np.interp(yy, ys, np.convolve(np.pad(xs, 2, mode='edge'), np.ones(5) / 5, 'valid'))
    out = {'ped': [round(float(np.median(xs)), 1), round(float((ys.min() + ys.max()) / 2), 1)], 'top': int(ys.min()), 'bottom': int(ys.max()),
           'curve': [[round(float(x), 1), round(float(y), 1)] for x, y in zip(cx, yy)]}
    out['shift'] = round(out['ped'][0] - px, 1)
    if debug:
        from PIL import Image, ImageDraw
        w = (int(px - 0.2 * SL), r0, int(px + 0.25 * SL), r1); im = Image.fromarray(a).crop(w).resize(((w[2] - w[0]) * 2, (w[3] - w[1]) * 2)); d = ImageDraw.Draw(im)
        d.line([((x - w[0]) * 2, (y - w[1]) * 2) for x, y in out['curve']], fill=(255, 40, 40), width=3)
        d.line([((px - w[0]) * 2, 0), ((px - w[0]) * 2, 16)], fill=(255, 255, 0), width=3); im.save(debug)
    return out


if __name__ == '__main__':
    a = sys.argv[1:]; opt = {a[i]: a[i + 1] for i in range(len(a) - 1) if a[i].startswith('--')}
    pos = [x for i, x in enumerate(a) if not x.startswith('--') and not (i and a[i - 1].startswith('--'))]
    print(json.dumps(detect(pos[0], float(pos[1]), float(pos[2]), opt.get('--debug'))))
