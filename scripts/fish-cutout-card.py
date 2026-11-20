#!/usr/bin/env python3
"""Photo cutout -> card image for the 3D test (fish-painter experiment).
  python -I scripts/fish-cutout-card.py full_res_photo.png anatomy.json out_card.png [--aspect 0.369]
The anatomy JSON was measured on a copy of the photo resized to anatomy.source.px; this scales the landmarks to the full-res photo,
levels the fish by the measured rotation, and lays it on a 1024-wide card: snout at the right edge, TL = card width, axis on the middle line.
Alpha = brightness above a low threshold (black background photos only; for busy backgrounds run rembg first and pass its RGBA cutout)."""
import json, sys
import numpy as np
from PIL import Image
pos = [a for i, a in enumerate(sys.argv[1:]) if not a.startswith('--') and not (i > 0 and sys.argv[i].startswith('--'))]
opt = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
src, js, out = pos
asp = float(opt.get('--aspect', 0.369))
J = json.load(open(js)); im = Image.open(src).convert('RGB')
for e in [v for k, v in opt.items() if k == '--erase']:   # x0,y0,x1,y1 in source-photo px: blacked out before the cutout (a fin the 3D model draws itself)
    x0, y0, x1, y1 = map(int, e.split(',')); im.paste((0, 0, 0), (x0, y0, x1, y1))
a = np.asarray(im)
k = im.width / J['source']['px'][0]
sx, sy = [v * k for v in J['anatomy']['landmarks']['snoutPxOriginal']]
TL = J['anatomy']['tlPx'] * k
al = np.clip((a.max(2).astype(float) - 12) / 40, 0, 1)
rgba = Image.fromarray(np.dstack([a, (al * 255).astype(np.uint8)]), 'RGBA').rotate(J['method']['rotationDeg'], resample=Image.BICUBIC, center=(sx, sy))
s = 1022 / TL; H = round(1024 * asp)
card = Image.new('RGBA', (1024, H), (0, 0, 0, 0))
big = rgba.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
card.paste(big, (round(1022 - sx * s), round(H / 2 - sy * s)), big)
card.save(out); print(card.size)
