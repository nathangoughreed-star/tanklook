"""Audit 5-row build-B sheets against measured proportions (FishShapes) and their own cross-row consistency.
  Per sheet, all in % of the finless side length (row 2, snout to tail-fin base = SL):
    depth       row 2 max depth            head   row 2 depth at the eye (eye = row 5 white disc, mapped to row 1)
    ped         row 2 min depth, rear 30%  topW   row 3 max width            frontWH  row 4 left width / height
    stray       row 2 pixels outside row 1 (% of row 2)    iou15  row 5 vs row 1 silhouette after a bounding-box fit
    pec         row 5 pectoral area / SL^2 x 1000
    frontH      row 4 left height / row 2 max depth (same scale asked: 1.00)   topSnout  row 3 snout x minus row 2 snout x, % SL
Usage: python fish-sheet-audit5.py <sheet.webp> [more sheets...] [--real depth,head,ped,width]"""
import sys, os, numpy as np
from scipy import ndimage as nd
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs


def bb(m): ys, xs = np.where(m); return xs.min(), xs.max(), ys.min(), ys.max()


def audit(path):
    a, M = fs.load(path); b = fs.panel_bands(M); A = a.astype(int)
    if len(b) < 5: sys.exit(f'{path}: found {len(b)} panels, need 5. Two panels are closer than {fs._GAP or 6} px (or touch); redo the sheet, or put panel_gap.json {{"min_gap": N}} beside it (PIPELINE step 6).')
    def sil(i):
        y0, y1, x0, x1 = b[i]; m = np.zeros(M.shape, bool); m[y0:y1, x0:x1] = M[y0:y1, x0:x1]; return m
    m1, m2, m3, m4, m5 = sil(0), sil(1), sil(2), sil(3), sil(4)
    dy, dx = fs.align(M, b[0], b[1]); m2s = fs.shift(m2, dy, dx)
    X0, X1, Y0, Y1 = bb(m2); SL = X1 - X0
    cols = np.arange(X0, X1 + 1); dep = np.array([m2[:, x].sum() for x in cols])
    # row 5 -> row 1 by bbox
    P0, P1, Q0, Q1 = bb(m1); p0, p1, q0, q1 = bb(m5)
    def warp(m):
        c = Image.fromarray((m[q0:q1 + 1, p0:p1 + 1] * 255).astype(np.uint8)).resize((P1 - P0 + 1, Q1 - Q0 + 1), Image.NEAREST)
        o = np.zeros(M.shape, bool); o[Q0:Q1 + 1, P0:P1 + 1] = np.asarray(c) > 127; return o
    w5 = warp(m5); iou = (w5 & m1).sum() / (w5 | m1).sum()
    white = (A.min(2) > 220) & m5; yel = (A[..., 0] > 200) & (A[..., 1] > 200) & (A[..., 2] < 80) & m5
    ex = bb(warp(white)); eyex = (ex[0] + ex[1]) / 2 - dx            # eye column in row 2's frame
    head = m2[:, int(round(eyex))].sum()
    rear = dep[: int(0.3 * len(dep))]; ped = rear[3:].min()
    t = bb(m3); f = bb(m4)
    s = 1 / (P1 - P0) * (p1 - p0)                                      # row 5 px per row 1 px
    return dict(depth=100 * dep.max() / SL, head=100 * head / SL, ped=100 * ped / SL, topW=100 * (t[3] - t[2]) / SL,
                frontWH=(f[1] - f[0]) / (f[3] - f[2]), stray=100 * (m2s & ~m1).sum() / m2.sum(), iou15=iou,
                pec=1000 * yel.sum() / s ** 2 / SL ** 2, frontH=(f[3] - f[2]) / dep.max(), topSnout=100 * (t[1] - X1) / SL)


def main(args):
    real = None
    if '--real' in args: i = args.index('--real'); real = [float(v) for v in args[i + 1].split(',')]; args = args[:i] + args[i + 2:]
    keys = ['depth', 'head', 'ped', 'topW', 'frontWH', 'stray', 'iou15', 'pec', 'frontH', 'topSnout']
    print('%-28s' % 'sheet' + ''.join('%9s' % k for k in keys))
    if real: print('%-28s' % 'real (FishShapes)' + ''.join('%9.1f' % v for v in real) + '%9.2f' % (real[3] / real[0]))
    for p in args:
        r = audit(p); print('%-28s' % os.path.basename(os.path.dirname(p) + '/' + os.path.basename(p))[-28:] + ''.join(('%9.2f' if k in ('frontWH', 'iou15', 'frontH') else '%9.1f') % r[k] for k in keys))


if __name__ == '__main__':
    main(sys.argv[1:])
