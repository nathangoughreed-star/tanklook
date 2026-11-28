"""Radial colour profile of one polyp (or any round thing) in a reference photo (invert build method, 2026-11-28).

  python -I scripts/invert-lab/radial.py <photo> <cx> <cy> <r> [steps]

Prints the median colour (hex) in rings from the centre (0) to the rim (1) and a little past it (to 1.3), so the
model's disc rings (mouth, disc, pale ring, tentacle skirt) take measured colours instead of eyeballed ones.
Photo pixels: read the centre and radius off the photo (an image viewer, or the lab's contact sheet).
"""
import sys
import numpy as np
from PIL import Image

f, cx, cy, r = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
steps = int(sys.argv[5]) if len(sys.argv) > 5 else 13
im = np.asarray(Image.open(f).convert('RGB')).astype(float)
h, w, _ = im.shape
yy, xx = np.mgrid[0:h, 0:w]
d = np.hypot(xx - cx, yy - cy) / r
for i in range(steps):
    a, b = i * 1.3 / steps, (i + 1) * 1.3 / steps
    sel = im[(d >= a) & (d < b)]
    if not len(sel):
        continue
    m = np.median(sel, 0).astype(int)
    print('%.2f-%.2f #%02x%02x%02x' % (a, b, *m))
