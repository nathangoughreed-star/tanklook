"""Body depth (% of body length) from a single side view whose fins are grey / unsaturated and body coloured (cardinal tetra).
  Body = largest saturated region (HSV-style saturation > 0.25), opened, closed and hole-filled; length = its x extent
  (snout to tail-fin base). Checked 2026-11-23 against the finless row 2 of two cardinal 5-row sheets: 23.9 vs 24.7, 25.6 vs 25.3.
  Takes the largest non-black panel band, so it also reads row 1 of a 5-row sheet.
Usage: python fish-side-depth.py <image> [more images...]"""
import sys, os, numpy as np
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs


def depth(path, thr=0.25):
    a, M = fs.load(path); b = fs.panel_bands(M); A = a.astype(float)
    y0, y1, x0, x1 = b[0]; m = np.zeros(M.shape, bool); m[y0:y1, x0:x1] = M[y0:y1, x0:x1]
    mx, mn = A.max(2), A.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    body = nd.binary_opening(m & (sat > thr), iterations=3); lab, n = nd.label(body)
    body = nd.binary_fill_holes(nd.binary_closing(lab == (np.bincount(lab.ravel())[1:].argmax() + 1), iterations=4))
    xs = np.where(body.any(0))[0]; d = max(body[:, x].sum() for x in xs); L = xs[-1] - xs[0]
    return 100 * d / L, L


if __name__ == '__main__':
    for p in sys.argv[1:]:
        d, L = depth(p); print('%-40s depth %.1f%% of body length (body %d px long)' % (os.path.basename(p), d, L))
