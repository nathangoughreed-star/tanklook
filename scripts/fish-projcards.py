#!/usr/bin/env python3
"""Top and front projection cards for the 3D body (src/art/projart.ts; method doc section 3 step F2).
  python -I scripts/fish-projcards.py aligned_sheet.png sheet.png anatomy.json out_prefix --top y0,y1 --front x0,y0,x1,y1
aligned_sheet.png: the sheet with the TOP panel rescaled to the side panel's length and snout-aligned (same x as side_full.png), rows y0..y1 = the top panel.
sheet.png: the original sheet, for the front panel (box x0,y0,x1,y1).
Tail rescue (2026-11-20): the card is cut at the peduncle (snout x minus SL, from anatomy.json; --tail-margin F keeps F x TL more, default 0.01;
       --no-tail-cut turns it off). The 3D body, its thickness and this layer all stop at the peduncle and the side card carries the tail, so a tail
       drawn fanned flat in the top view must not widen the card or paint anything. Cut columns are transparent and ignored for the card height.
Writes out_prefix-top.png: top panel on a 1024-wide card at the SAME x scale as the side card (snout at x = 1022), centre line on the middle row;
       out_prefix-front.png: the front panel crop (alpha = brightness); prints its size and the body-width rows used to choose --fk in the harness."""
import json, sys
import numpy as np
from PIL import Image

def desat(a, f):   # --sat f: the app's lighting boosts fish saturation ~1.35x, so orange reads red; pre-desaturate the photo by f (0.72 for the flame angel)
    a = a.astype(float); l = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    return np.clip(l + (a - l) * f, 0, 255).astype(np.uint8)
pos = [a for i, a in enumerate(sys.argv[1:]) if not a.startswith('--') and not (i > 0 and sys.argv[i].startswith('--'))]
opt = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
aligned, sheet, js, out = pos
J = json.load(open(js)); A = J['anatomy']
k = 2.0  # anatomy was measured on a 600 px copy of the 1200 px side_full image
sx = A['landmarks']['snoutPxOriginal'][0] * k; TL = A['tlPx'] * k; s = 1022 / TL
y0, y1 = map(int, opt['--top'].split(','))
a = np.asarray(Image.open(aligned).convert('RGB'))[y0:y1]
SAT = float(opt['--sat']) if '--sat' in opt else 1.0
MT = float(opt.get("--mask-thr", 30)); m = a.max(2) > MT   # --mask-thr 12: near-black fish (black molly, b6)
if '--anchor' in sys.argv:
    # --anchor (spec top_card_anchor, method row 80; pictus b11): the sheet drew the top view shorter than the side view (snout at x 877 vs 964),
    # so the card painted only the rear ~90 % of the body and the 3D snout showed a dark square cap. Lay the panel on its OWN body tip (an opening
    # drops thin barbels / whiskers past the snout) and scale it uniformly so its length matches SL or TL, whichever it is nearer (fish-topview --anchor).
    from scipy import ndimage as nd
    body = nd.binary_opening(m, iterations=4); bc = np.nonzero(body.any(0))[0]
    tip_t, tail_t = float(bc.max()), float(bc.min()); L_ = tip_t - tail_t; SLk = A['slPx'] * k
    ref_ = TL if abs(L_ - TL) < abs(L_ - SLk) else SLk; h = ref_ / L_
    pan = Image.fromarray(a).resize((max(1, round(a.shape[1] * h)), max(1, round(a.shape[0] * h))), Image.LANCZOS)
    a2 = np.zeros((pan.height, max(a.shape[1], round(sx) + 4), 3), np.uint8); dx = round(sx - tip_t * h)
    pa = np.asarray(pan); xs0 = max(0, dx); xs1 = min(a2.shape[1], dx + pa.shape[1])
    a2[:, xs0:xs1] = pa[:, xs0 - dx:xs1 - dx]; a = a2; m = a.max(2) > MT
    print('top card anchored: panel body tip %.0f -> %.0f, scale %.3f (vs %s)' % (tip_t, sx, h, 'TL' if ref_ == TL else 'SL'))
cols = np.nonzero(m.any(0))[0]
xcut = 0 if '--no-tail-cut' in sys.argv else int(round(sx - A['slPx'] * k - float(opt.get('--tail-margin', 0.01)) * TL))   # first column kept (x grows toward the snout)
# centre line from the uncut panel, then cut: rows (card height) and alpha come from the body only
mid = float(np.median([(np.nonzero(m[:, x])[0].min() + np.nonzero(m[:, x])[0].max()) / 2 for x in range(int(sx - 0.8 * (sx - cols.min())), int(sx - 0.3 * (sx - cols.min()))) if m[:, x].any()]))
a = a.copy(); a[:, :max(0, xcut)] = 0; m = a.max(2) > MT; rows = np.nonzero(m.any(1))[0]
half = max(mid - rows.min(), rows.max() - mid); Ht = 2 * int(np.ceil(half * s)) + 16
al = np.clip((a.max(2).astype(float) - 12) / 40, 0, 1)
if '--fill' in sys.argv:   # --fill (spec top_card_fill, method row 80): black spots inside the body read as background (alpha = brightness); the filled body is opaque
    from scipy import ndimage as nd
    al = np.maximum(al, nd.binary_fill_holes(nd.binary_opening(m, iterations=4)).astype(float))   # opened first: barbels looping back along the flanks would enclose the black gap beside the body
rgba = Image.fromarray(np.dstack([desat(a, SAT), (al * 255).astype(np.uint8)]), 'RGBA')
big = rgba.resize((round(a.shape[1] * s), round(a.shape[0] * s)), Image.LANCZOS)
card = Image.new('RGBA', (1024, Ht), (0, 0, 0, 0))
card.paste(big, (round(1022 - sx * s), round(Ht / 2 - mid * s)), big)
card.save(out + '-top.png'); print('top card', card.size, 'aspect', round(Ht / 1024, 3))
x0, f0, x1, f1 = map(int, opt['--front'].split(','))
fr = np.asarray(Image.open(sheet).convert('RGB'))[f0:f1, x0:x1]
fa = np.clip((fr.max(2).astype(float) - 12) / 40, 0, 1)
Image.fromarray(np.dstack([desat(fr, SAT), (fa * 255).astype(np.uint8)]), 'RGBA').save(out + '-front.png'); print('front card', fr.shape[1], fr.shape[0])
