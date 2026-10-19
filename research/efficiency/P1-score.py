"""Score rung pictures against the as-shipped picture (lane P1, 2026-10-19).
usage: python research/efficiency/P1-score.py <shots dir from perf-baseline --ab-shots> <out.json>
Files are <view>__<i>__A.png (as shipped) and __B.png (rung i). B is resized to A's size when the pixel ratio differs
(the browser stretches the smaller canvas the same way). Scores, A against B:
  ssim   mean structural similarity on luma, 7x7 box window (1 = identical); the blur / jaggies / lost-detail proxy
  de     mean CIE76 colour difference (about 2.3 = just noticeable); the colour-shift proxy
  de95   95th percentile of the per-pixel colour difference: whether any part changes a lot
Proxies for 'looks different', not for satisfaction; the rating sheet (P1-sheet.py) is the satisfaction axis."""
import sys, json, glob, os, re
import numpy as np
from PIL import Image

def load(p): return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64) / 255.0

def box(a, k):
    c = np.cumsum(np.cumsum(np.pad(a, ((1, 0), (1, 0))), 0), 1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def ssim(a, b, k=7):
    a = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]; b = 0.299 * b[..., 0] + 0.587 * b[..., 1] + 0.114 * b[..., 2]
    ma, mb = box(a, k), box(b, k); va = box(a * a, k) - ma * ma; vb = box(b * b, k) - mb * mb; cov = box(a * b, k) - ma * mb
    c1, c2 = 0.01 ** 2, 0.03 ** 2
    return float(np.mean(((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))))

def lab(rgb):
    l = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = (l @ m.T) / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def main(d, out):
    res = {}
    for pa in sorted(glob.glob(os.path.join(d, '*__A.png'))):
        pb = pa[:-5] + 'B.png'; name = os.path.basename(pa)[:-7]
        if not os.path.exists(pb): continue
        a = Image.open(pa).convert('RGB'); b = Image.open(pb).convert('RGB')
        if b.size != a.size: b = b.resize(a.size, Image.BILINEAR)
        A = np.asarray(a, dtype=np.float64) / 255.0; B = np.asarray(b, dtype=np.float64) / 255.0
        de = np.sqrt(((lab(A) - lab(B)) ** 2).sum(-1))
        res[name] = {'ssim': round(ssim(A, B), 4), 'de': round(float(de.mean()), 3), 'de95': round(float(np.percentile(de, 95)), 2)}
    json.dump(res, open(out, 'w'), indent=1); print(json.dumps(res, indent=1))

if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
