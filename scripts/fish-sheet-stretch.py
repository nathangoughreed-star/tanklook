"""Stretch a 5-row build-B sheet vertically so the body depth matches a measured value (the depth twin of `thickx`).
  Rows 1, 2, 4 (both halves) and 5 are scaled vertically by k; row 3 (top view: length x width) is left alone. Each row band is
  cut across the full width, resized, and restacked with the original gaps, so fin cut, spec and build run unchanged on the output.
  The fins and the eye stretch by the same k (a 1.16 stretch makes the eye 16% taller than wide).
  k = measured depth / sheet depth, e.g. FishShapes 29.4 / fish-sheet-audit5.py depth 25.3.
Usage: python fish-sheet-stretch.py <sheet.webp> <k> <out.webp>"""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs


def main(src, k, out):
    a, M = fs.load(src); b = fs.panel_bands(M); img = Image.open(src).convert('RGB'); W, H = img.size
    rows = []                                                           # merge bands that overlap in y (row 4's two halves)
    for y0, y1 in sorted((int(y0), int(y1)) for y0, y1, x0, x1 in b):
        if rows and y0 <= rows[-1][1]: rows[-1] = (rows[-1][0], max(rows[-1][1], y1))
        else: rows.append((y0, y1))
    pad = 6; parts = []; prev = 0
    for i, (y0, y1) in enumerate(rows):
        y0p, y1p = max(0, y0 - pad), min(H, y1 + pad)
        gap = y0p - prev; prev = y1p
        band = img.crop((0, y0p, W, y1p)); kk = 1.0 if i == 2 else k     # i == 2: row 3, the top view
        band = band.resize((W, max(1, round(band.height * kk))), Image.LANCZOS)
        parts.append((gap, band))
    tail = H - prev
    o = Image.new('RGB', (W, sum(g + p.height for g, p in parts) + tail), (0, 0, 0)); y = 0
    for g, p in parts: y += g; o.paste(p, (0, y)); y += p.height
    o.save(out, quality=95); print('wrote %s (%d x %d, rows %d, k %.3f)' % (out, W, o.height, len(rows), k))


if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]), sys.argv[3])
