#!/usr/bin/env python3
"""Photo cutout -> card image for the 3D test (fish-painter experiment).
  python -I scripts/fish-cutout-card.py full_res_photo.png anatomy.json out_card.png [--aspect 0.369]
The anatomy JSON was measured on a copy of the photo resized to anatomy.source.px; this scales the landmarks to the full-res photo,
levels the fish by the measured rotation, and lays it on a 1024-wide card: snout at the right edge, TL = card width, axis on the middle line.
Alpha = brightness above a low threshold (black background photos only; for busy backgrounds run rembg first and pass its RGBA cutout)."""
import json, sys
import numpy as np
from PIL import Image

def desat(a, f):   # --sat f: the app's lighting boosts fish saturation ~1.35x, so orange reads red; pre-desaturate the photo by f (0.72 for the flame angel)
    a = a.astype(float); l = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    return np.clip(l + (a - l) * f, 0, 255).astype(np.uint8)
pos = [a for i, a in enumerate(sys.argv[1:]) if not a.startswith('--') and not (i > 0 and sys.argv[i].startswith('--'))]
opt = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
src, js, out = pos
asp = float(opt.get('--aspect', 0.369))
J = json.load(open(js)); im = Image.open(src).convert('RGB')
for e in [v for k, v in opt.items() if k == '--erase']:   # x0,y0,x1,y1 in source-photo px: blacked out before the cutout (a fin the 3D model draws itself)
    x0, y0, x1, y1 = map(int, e.split(',')); im.paste((0, 0, 0), (x0, y0, x1, y1))
a = np.asarray(im)
if '--sat' in opt: a = desat(a, float(opt['--sat']))
k = im.width / J['source']['px'][0]
sx, sy = [v * k for v in J['anatomy']['landmarks']['snoutPxOriginal']]
TL = J['anatomy']['tlPx'] * k
ALO, AW = float(opt.get('--alo', 12)), float(opt.get('--aw', 40))   # alpha ramp: dark fins (oscar, max channel ~45) came out half transparent and blue against the tank at 12/40: use --alo 4 --aw 14
al = np.clip((a.max(2).astype(float) - ALO) / AW, 0, 1)
if '--solid' in opt:   # --solid T (method row 45): the background is near-black (< T) pixels connected to the image edge, plus enclosed black
    # pockets within --solid-near px of it (a gap under an overhanging fin tip, closed off by the thin fin edge: 3-6.4 px on the ram and
    # discus sheets) or over --solid-pocket px (an erased fin). Deeper pockets (pupils, dark marks: 30-43 px in) and everything else is
    # fish, fully opaque; the brightness ramp still sets the outer 3 px. Brightness alone made black fin parts, pupils and dark spots
    # part see-through (ram: ragged black spines)
    from scipy import ndimage as nd
    T, POCKET, NEAR = float(opt['--solid']), int(opt.get('--solid-pocket', 2000)), float(opt.get('--solid-near', 15))
    lab, n = nd.label(a.max(2) < T)
    if n:
        cnt = np.bincount(lab.ravel()); edge = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
        bgid = np.zeros(n + 1, bool); bgid[edge] = True; bgid[cnt > POCKET] = True; bgid[0] = False
        d = nd.distance_transform_edt(~bgid[lab])   # distance to the outside background
        near = nd.minimum(d, lab, index=np.arange(n + 1))
        bgid |= np.asarray(near) < NEAR; bgid[0] = False
        fish = ~bgid[lab]
    else: fish = np.ones(a.shape[:2], bool)
    IN = int(opt.get('--solid-in', 3))   # keep the brightness ramp on a 3 px rim: at 1 px the near-black antialiased fin edges turned into black flecks (ram tail close-up)
    al = np.maximum(al, nd.binary_erosion(fish, iterations=IN).astype(float))
rgba = Image.fromarray(np.dstack([a, (al * 255).astype(np.uint8)]), 'RGBA').rotate(J['method']['rotationDeg'], resample=Image.BICUBIC, center=(sx, sy))
s = 1022 / TL; H = round(1024 * asp)
card = Image.new('RGBA', (1024, H), (0, 0, 0, 0))
big = rgba.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
card.paste(big, (round(1022 - sx * s), round(H / 2 - sy * s)), big)
if '--clip-head' in opt:   # --clip-head 30: head stations (0..30 % SL) have no free fins, so card pixels outside the measured body outline there are slivers the lofted body doesn't cover: remove them
    c = float(opt['--clip-head']); d = J['anatomy']['depthProfile']; SLc = 1022 / J['anatomy']['tlOverSl']
    c_a = np.asarray(card).copy()
    for x in range(1024):
        sp = (1022 - x) / SLc * 100
        if 0 <= sp <= c:
            t = np.interp(sp, d['stations'], d['top']) / 100 * SLc; b = np.interp(sp, d['stations'], d['bottom']) / 100 * SLc
            ys = np.arange(H); c_a[(ys < H / 2 - t - 2) | (ys > H / 2 + b + 2), x, 3] = 0
    card = Image.fromarray(c_a, 'RGBA')
card.save(out); print(card.size)
