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


def detect(sheet, px, py, debug=None):
    import importlib.util as ilu
    import fishsheet as fs
    sp = ilu.spec_from_file_location('fincut', os.path.join(HERE, 'fish-fin-cut.py')); fc = ilu.module_from_spec(sp); sp.loader.exec_module(fc)
    a, M = fs.load(sheet); bands = fs.panel_bands(M)
    if len(bands) < 5: return None
    o, _ = fc.map_body(a, M, bands)
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
