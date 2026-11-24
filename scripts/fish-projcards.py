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
cols = np.nonzero(m.any(0))[0]
xcut = 0 if '--no-tail-cut' in sys.argv else int(round(sx - A['slPx'] * k - float(opt.get('--tail-margin', 0.01)) * TL))   # first column kept (x grows toward the snout)
# centre line from the uncut panel, then cut: rows (card height) and alpha come from the body only
mid = float(np.median([(np.nonzero(m[:, x])[0].min() + np.nonzero(m[:, x])[0].max()) / 2 for x in range(int(sx - 0.8 * (sx - cols.min())), int(sx - 0.3 * (sx - cols.min()))) if m[:, x].any()]))
a = a.copy(); a[:, :max(0, xcut)] = 0; m = a.max(2) > MT; rows = np.nonzero(m.any(1))[0]
half = max(mid - rows.min(), rows.max() - mid); Ht = 2 * int(np.ceil(half * s)) + 16
al = np.clip((a.max(2).astype(float) - 12) / 40, 0, 1)
rgba = Image.fromarray(np.dstack([desat(a, SAT), (al * 255).astype(np.uint8)]), 'RGBA')
big = rgba.resize((round(a.shape[1] * s), round(a.shape[0] * s)), Image.LANCZOS)
card = Image.new('RGBA', (1024, Ht), (0, 0, 0, 0))
card.paste(big, (round(1022 - sx * s), round(Ht / 2 - mid * s)), big)
card.save(out + '-top.png'); print('top card', card.size, 'aspect', round(Ht / 1024, 3))
x0, f0, x1, f1 = map(int, opt['--front'].split(','))
fr = np.asarray(Image.open(sheet).convert('RGB'))[f0:f1, x0:x1]
fa = np.clip((fr.max(2).astype(float) - 12) / 40, 0, 1)
Image.fromarray(np.dstack([desat(fr, SAT), (fa * 255).astype(np.uint8)]), 'RGBA').save(out + '-front.png'); print('front card', fr.shape[1], fr.shape[0])
