"""E-GEN finless method, step before fish-glb-assemble.py: panel 1's real body line under the fins, and the tail-fin base.
The finless panel turns fin bases into body. A small pixel classifier (random forest on colour + local texture) learns
'fin' from the finned-minus-finless pixels and 'body' from deep inside the finless body, then per column finds where
the body starts under the dorsal and anal fins. Outside the fin spans the finless outline is kept; the body only shrinks.
Writes bodyline2.npy (top, bottom rows per column, panel 1 frame) and peduncle.npy (narrowest column of panel 1).
Needs finlab.npy and align.npy from the fin-cut step. Usage: python -I fish-fin-line.py <folder>
Panel bands come from the sheet (fishsheet.panel_bands)."""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs
from PIL import Image
from scipy import ndimage as nd
from sklearn.ensemble import RandomForestClassifier

F = sys.argv[1]
a = np.asarray(Image.open(os.path.join(F, 'sheet.webp')).convert('RGB')).astype(np.float32); M = a.max(2) > 8
p1, p2 = fs.panel_bands(M)[:2]
dy, dx = (list(np.load(os.path.join(F, 'align.npy')).astype(int)) + [0])[:2]; lab = np.load(os.path.join(F, 'finlab.npy'))
A = a[p1[0]:p1[1]]; M1 = fs.mask(M, p1)[p1[0]:p1[1]]; H, W = M1.shape
M2 = fs.shift(fs.mask(M, p2), dy, dx)[p1[0]:p1[1]]   # panel 2 in panel 1's frame

g = A.mean(2); box = lambda x, r: nd.uniform_filter(x, 2 * r + 1); gx = nd.sobel(g, 1); gy = nd.sobel(g, 0)
feat = [A[..., 0], A[..., 1], A[..., 2]]
for r in (2, 5):
    feat += [box(A[..., c], r) for c in range(3)] + [np.sqrt(np.maximum(box(g * g, r) - box(g, r) ** 2, 0))] + [box(gx * gx, r), box(gy * gy, r), box(gx * gy, r)]
Fe = np.stack(feat, -1)
fin = (lab > 0) & nd.binary_erosion(M1, iterations=3); body = nd.binary_erosion(M2, iterations=25)
rng = np.random.default_rng(0); fi = np.argwhere(fin); bi = np.argwhere(body)
fi = fi[rng.choice(len(fi), min(6000, len(fi)), replace=False)]; bi = bi[rng.choice(len(bi), 6000, replace=False)]
clf = RandomForestClassifier(60, max_depth=12, n_jobs=-1, random_state=0).fit(np.r_[Fe[fi[:, 0], fi[:, 1]], Fe[bi[:, 0], bi[:, 1]]], np.r_[np.ones(len(fi)), np.zeros(len(bi))])
band = M1 & M2 & ~nd.binary_erosion(M2, iterations=60)
P = np.zeros((H, W)); idx = np.argwhere(band); P[idx[:, 0], idx[:, 1]] = clf.predict_proba(Fe[idx[:, 0], idx[:, 1]])[:, 1]; P = nd.gaussian_filter(P, 2)
top = np.full(W, np.nan); bot = np.full(W, np.nan)
t2 = np.full(W, np.nan); b2 = np.full(W, np.nan)
for x in range(W):
    col = np.where(M2[:, x])[0]
    if len(col) < 10: continue
    t0, b0 = col[0], col[-1]; t2[x], b2[x] = t0, b0; mid = (t0 + b0) // 2
    for yy in range(t0, mid):
        if (P[yy:yy + 6, x] < 0.5).all(): top[x] = yy; break
    for yy in range(b0, mid, -1):
        if (P[yy - 6:yy, x] < 0.5).all(): bot[x] = yy; break
up = np.zeros(W, bool); dn = np.zeros(W, bool)
for x in range(W):
    if np.isnan(t2[x]): continue
    c = lab[:, x] > 0; up[x] = c[:int(t2[x])].any(); dn[x] = c[int(b2[x]) + 1:].any()
up = nd.binary_closing(up, iterations=20); dn = nd.binary_closing(dn, iterations=20)
def blend(line, base, span):
    w = nd.gaussian_filter(span.astype(float), 10)
    xs = np.arange(len(line)); good = ~np.isnan(line); v = np.interp(xs, xs[good], line[good])
    v = nd.gaussian_filter(nd.median_filter(v, 21), 6)
    return np.where(np.isnan(base), np.nan, base * (1 - w) + v * w)
T = np.maximum(blend(top, t2, up), t2); B = np.minimum(blend(bot, b2, dn), b2)
d1 = np.array([(np.where(M1[:, x])[0][-1] - np.where(M1[:, x])[0][0]) if M1[:, x].any() else 999 for x in range(W)])
cx_ = np.where(M1.any(0))[0]; r = np.arange(int(cx_[0] + 0.1 * (cx_[-1] - cx_[0])), int(cx_[0] + 0.32 * (cx_[-1] - cx_[0]))); xp = r[np.argmin(d1[r])]   # narrowest column in the rear third: the tail-fin base
np.save(os.path.join(F, 'bodyline2.npy'), np.stack([T, B])); np.save(os.path.join(F, 'peduncle.npy'), np.array([xp]))
print('body line: back lowered up to %.0f px, belly raised up to %.0f px; tail-fin base at x %d' % (np.nanmax(T - t2), np.nanmax(b2 - B), xp))
