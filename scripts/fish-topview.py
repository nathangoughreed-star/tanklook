#!/usr/bin/env python3
"""Body width from the TOP panel of a multi-view sheet (fish-painter experiment).
  python -I scripts/fish-topview.py sheet.png anatomy.json out.json y0 y1 [--x0 125] [--thr 0.6] [--debug dbg.png]
The side view (measured earlier into anatomy.json from a copy cropped at x0 and scaled by 0.5) and the top panel (rows y0..y1 of the sheet)
share the same x axis, so the width at each station is read in the same columns. Body = blue-share mask (the body is bluer than the
translucent fins); the width is the extent of the run through the centre line. Adds anatomy.thickness {stations, halfWidthPctSL}."""
import json, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
pos = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
sheet, js, out, y0, y1 = pos[0], pos[1], pos[2], int(pos[3]), int(pos[4])
x0, thr = float(opt.get('--x0', 125)), float(opt.get('--thr', 0.6))
J = json.load(open(js)); A = J['anatomy']
a = np.asarray(Image.open(sheet).convert('RGB')).astype(float)[y0:y1]
full = a.max(2) > 30
q = np.where(full, a[..., 2] / (a[..., 0] + a[..., 2] + 1e-6), 0)
qb = np.asarray(Image.fromarray((q * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(float) / 255
body = full if '--fullbody' in sys.argv else full & (qb > thr)   # --fullbody: bodies that aren't bluer than their fins (orange fish)
H, W = body.shape
SL = A['slPx'] * 2; sxs = A['landmarks']['snoutPxOriginal'][0] * 2 + x0
ANCH = '--anchor' in sys.argv   # --anchor: stations are laid on the top panel's OWN snout tip and tail tip (the panel is often 1-2 % longer than the side view)
if ANCH:
    cx_ = np.nonzero(full.any(0))[0]; tip_, tail_ = float(cx_.max()), float(cx_.min())
    L_ = tip_ - tail_; ref_ = A['tlPx'] * 2 if abs(L_ - A['tlPx'] * 2) < abs(L_ - SL) else SL   # a top panel without its tail fin ends at the stalk: measure it against SL, not TL (else the rear stations fall off the end: E-GEN tang)
    fscale = min(1.1, max(0.9, L_ / ref_))
    if ref_ == SL: sxs = tip_; SLs = L_
    if ref_ != SL: sxs = tip_; SLs = SL * fscale
else:
    SLs = SL
cy = None
ext = {}
for x in range(W):
    ys = np.nonzero(body[:, x])[0]
    if len(ys):
        ext[x] = (ys.min(), ys.max())
mid = np.median([(e[0] + e[1]) / 2 for x, e in ext.items() if sxs - 0.9 * SL < x < sxs - 0.2 * SL])
st = A['depthProfile']['stations']; hw = []
for s in st:
    x = int(round(sxs - s / 100 * SLs)); x = min(max(x, 0), W - 1)
    cols = [ext[k] for k in range(x - 2, x + 3) if k in ext]
    if not cols: hw.append(0.0); continue
    t = np.mean([c[0] for c in cols]); b = np.mean([c[1] for c in cols])
    hw.append(round(float(((b - t) / 2 if (ANCH and s < 12) else min(mid - t, b - mid)) / SL * 100), 2))   # the narrower side: a fin on one side cannot inflate it
# plain mask everywhere (the blue test loses the pink rim of the flank, measured 30 % too thin); the pectoral fins stick out at the
# stations in P0..P1, which are filled in linearly from their neighbours
P0, P1 = float(opt.get('--pec0', 22)), float(opt.get('--pec1', 44))
fx = {}
for x in range(W):
    ys = np.nonzero(full[:, x])[0]
    if len(ys): fx[x] = (ys.min(), ys.max())
for i, s in enumerate(st):
    x = min(max(int(round(sxs - s / 100 * SLs)), 0), W - 1)
    c = [fx[k] for k in range(x - 2, x + 3) if k in fx]
    if c: hw[i] = round(float(((np.mean([e[1] for e in c]) - np.mean([e[0] for e in c])) / 2 if (ANCH and s < 12) else min(mid - np.mean([e[0] for e in c]), np.mean([e[1] for e in c]) - mid)) / SL * 100), 2)
keep = [(s, h) for s, h in zip(st, hw) if not (P0 <= s <= P1)]
hw = [round(float(np.interp(s, [k[0] for k in keep], [k[1] for k in keep])), 2) if P0 <= s <= P1 else h for s, h in zip(st, hw)]
A['thickness'] = {'stations': st, 'halfWidthPctSL': hw, 'source': 'top panel of the generated sheet, blue-share mask (thr %.2f); the narrower side of the centre line' % thr}
json.dump(J, open(out, 'w'), indent=1)
print(hw)
if '--debug' in opt:
    im = Image.fromarray(a.astype(np.uint8)); d = ImageDraw.Draw(im)
    for s, h in zip(st, hw):
        x = sxs - s / 100 * SLs
        d.line([(x, mid - h / 100 * SL), (x, mid + h / 100 * SL)], fill=(0, 255, 0), width=2)
    d.line([(0, mid), (W, mid)], fill=(255, 0, 0)); im.save(opt['--debug'])
