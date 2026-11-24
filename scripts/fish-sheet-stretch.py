"""Stretch a 5-row build-B sheet vertically so the body depth matches a measured value (the depth twin of `thickx`).
  Default (method row 60, Nathan 2026-11-24): BODY ONLY. In the side rows (1, 2, 5) every pixel column is remapped in three parts:
  the body (between that column's back and belly) is scaled by k about its own centre, everything above the back moves with the back
  and everything below the belly moves with the belly, unscaled. So the fins keep the size and shape ChatGPT drew: squeezing the bichir
  to its median depth with the old whole-row stretch (k 0.66-0.74) made its finlets and anal fin a quarter lower, small enough that
  the renderer's fixed allowances showed as slabs (rows 57-59). The body outline per column comes from row 5's grey (in row 5, and
  placed onto row 1 by the silhouette boxes, as fish-fin-cut.py --body-from-map does) and from row 2's silhouette. Columns with no body
  (the tail fin, past the snout) use the nearest body column's edges. Row 4 (front views) is scaled whole by k; row 3 (top view) is
  left alone. Bands grow when k > 1 so moved fins never leave the band.
  --whole: the old stretch (rows 1, 2, 4, 5 resized by k: fins and eye stretch too).
  k = measured depth / sheet depth.
  --head KH (Nathan 2026-11-24, b6 "snouts too pointy"): the head gets its own factor, KH = measured head depth / drawn head depth
  (FishShapes head, at the eye). ChatGPT draws heads shallow (gourami 13.6 vs 17.7 % SL) and one body factor then squeezed or under-
  filled them (auratus k 0.92 on a head that needed 1.07): a cone face. Per column, k = KH from the snout to 12 % SL (past the eye), blending
  linearly to k at 26 % SL (ahead of the deepest body; at 22-38 % the auratus loop had to squeeze its trunk to 0.76), k behind. Rows 1, 2, 5 only; row 4 keeps k.
Usage: python fish-sheet-stretch.py <sheet.webp> <k> <out.webp> [--whole] [--head KH]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs


def rows_of(b, H):
    rows = []                                                           # merge bands that overlap in y (row 4's two halves)
    for y0, y1 in sorted((int(y0), int(y1)) for y0, y1, x0, x1 in b):
        if rows and y0 <= rows[-1][1]: rows[-1] = (rows[-1][0], max(rows[-1][1], y1))
        else: rows.append((y0, y1))
    return rows


def grey_body(A, y0, y1):
    """Row 5's grey body (holes filled: eye, pectoral, root dot) inside rows y0..y1, as a bool array of that band."""
    S = A[y0:y1].astype(int)
    g = (abs(S[..., 0] - 128) < 30) & (abs(S[..., 1] - 128) < 30) & (abs(S[..., 2] - 128) < 30)
    g = nd.binary_fill_holes(g); lab, n = nd.label(g)
    return lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1) if n else g


def onto(body5, box5, box1, shape):
    """Place a row-5 body mask onto row 1's frame by the two silhouettes' bounding boxes (x0, x1, y0, y1, band-relative)."""
    x0, x1, y0, y1 = box5; X0, X1, Y0, Y1 = box1
    crop = Image.fromarray((body5[y0:y1, x0:x1] * 255).astype(np.uint8)).resize((X1 - X0, Y1 - Y0), Image.NEAREST)
    o = np.zeros(shape, bool); o[Y0:Y1, X0:X1] = np.asarray(crop) > 127; return o


def edges(body):
    """Per column: body top and bottom (float, band rows), filled across empty columns from the nearest body column, lightly smoothed."""
    W = body.shape[1]; has = body.any(0); xs = np.nonzero(has)[0]
    t = np.full(W, np.nan); b = np.full(W, np.nan)
    t[has] = body.argmax(0)[has]; b[has] = body.shape[0] - 1 - body[::-1].argmax(0)[has]
    idx = np.clip(np.searchsorted(xs, np.arange(W)), 0, len(xs) - 1)
    near = np.where(np.abs(xs[idx] - np.arange(W)) <= np.abs(xs[np.maximum(idx - 1, 0)] - np.arange(W)), xs[idx], xs[np.maximum(idx - 1, 0)])
    t = np.where(has, t, t[near]); b = np.where(has, b, b[near])
    return nd.uniform_filter1d(t, 5), nd.uniform_filter1d(b, 5)


def bridge(t, b, body, pair):
    """Where a paired fin (yellow / cyan in the label map) touches the body's top or bottom edge, that edge is the fin's, not the body's:
    the bichir's pectoral hangs past the belly, so the grey stopped at the fin and the body read half as deep there (114 vs 164 px),
    which put a block on the back (method row 60). Interpolate those columns' edges from their neighbours."""
    if pair is None or not pair.any(): return t, b
    W = len(t); x = np.arange(W); H_ = pair.shape[0]
    near = nd.binary_dilation(pair, iterations=3)
    bad_b = np.array([0 <= int(b[i]) + 1 < H_ and near[min(H_ - 1, int(b[i]) + 1), i] for i in range(W)])
    bad_t = np.array([0 <= int(t[i]) - 1 < H_ and near[max(0, int(t[i]) - 1), i] for i in range(W)])
    bad_b = nd.binary_dilation(bad_b, iterations=4); bad_t = nd.binary_dilation(bad_t, iterations=4)
    b = b.copy(); t = t.copy()
    if (~bad_b).sum() > 1: b[bad_b] = np.interp(x[bad_b], x[~bad_b], b[~bad_b])
    if (~bad_t).sum() > 1: t[bad_t] = np.interp(x[bad_t], x[~bad_t], t[~bad_t])
    return t, b


def remap(band, t, b, k, grow):
    """Body-only vertical remap of one band (H, W, 3): returns (H + 2 * grow, W, 3). t, b: per-column body top / bottom."""
    H, W = band.shape[:2]; Ho = H + 2 * grow
    c = (t + b) / 2; h = (b - t) / 2
    yo = np.arange(Ho)[:, None].astype(float) - grow                    # output row in source-band coordinates (before the shift)
    to, bo = c - k * h, c + k * h                                       # the body's new top and bottom
    ys = np.where(yo < to, yo - (to - t), np.where(yo > bo, yo - (bo - b), c + (yo - c) / k))
    xs = np.broadcast_to(np.arange(W)[None, :], ys.shape).astype(float)
    out = np.stack([nd.map_coordinates(band[..., ch].astype(float), [ys, xs], order=1, mode='constant', cval=0) for ch in range(3)], -1)
    return np.clip(out, 0, 255).astype(np.uint8)


def paste_rigid(o, src, pm, t, b, k, grow, grey=False):
    """Paired fins kept whole: clear what the remap made of them, then paste each fin piece shifted by the remap's displacement at its
    root (the piece's point nearest the body centre line). grey: the label map, where the cleared pixels inside the body become grey."""
    c = (t + b) / 2; h = (b - t) / 2
    kx = np.broadcast_to(np.asarray(k, float), t.shape)
    def shift(x, y):
        x = int(np.clip(x, 0, len(t) - 1)); kk = kx[x]
        if y < t[x]: return (c[x] - kk * h[x]) - t[x]
        if y > b[x]: return (c[x] + kk * h[x]) - b[x]
        return (c[x] + kk * (y - c[x])) - y
    # clear: the remapped fin pixels (remap the mask itself)
    H, W = pm.shape; Ho = o.shape[0]; yo = np.arange(Ho)[:, None].astype(float) - grow
    to, bo = c - k * h, c + k * h
    ys = np.where(yo < to, yo - (to - t), np.where(yo > bo, yo - (bo - b), c + (yo - c) / k))
    mo = nd.map_coordinates(pm.astype(float), [ys, np.broadcast_to(np.arange(W)[None, :], ys.shape).astype(float)], order=0) > 0.5
    if grey:
        inside = (yo >= to) & (yo <= bo); o = o.copy(); o[mo & inside] = 128; o[mo & ~inside] = 0
    lab, n = nd.label(pm)
    for j in range(1, n + 1):
        yy, xx = np.nonzero(lab == j)
        k_ = np.argmin(np.abs(yy - c[xx])); d = int(round(shift(xx[k_], yy[k_]))) + grow
        ny = yy + d; ok = (ny >= 0) & (ny < Ho)
        o[ny[ok], xx[ok]] = src[yy[ok], xx[ok]]
    return o


def kcols(body, k, kh):
    """Per-column factor for one side row: kh at the head (u <= 12 % SL from the snout, past the eye), k behind 26 %, linear between."""
    W = body.shape[1]
    if kh is None: return np.full(W, k)
    xs = np.nonzero(body.any(0))[0]; sx, px = xs.max(), xs.min(); u = (sx - np.arange(W)) / max(1, sx - px)
    return np.interp(u, [0.12, 0.26], [kh, k])


def main(src, k, out, whole=False, kh=None):
    a, M = fs.load(src); b = fs.panel_bands(M); img = Image.open(src).convert('RGB'); W, H = img.size; A = np.asarray(img)
    rows = rows_of(b, H)
    assert len(rows) == 5 or whole, f'expected 5 rows for the body-only stretch, found {len(rows)} (use --whole)'
    pad = 6; spans = [(max(0, y0 - pad), min(H, y1 + pad)) for y0, y1 in rows]
    if not whole:
        # body outlines: row 5 from its own grey, row 1 from row 5 placed by the silhouette boxes, row 2 its own silhouette
        r1, r2, r5 = spans[0], spans[1], spans[4]
        body5 = grey_body(A, *r5)
        m1 = M[r1[0]:r1[1]] > 0.5; m5 = M[r5[0]:r5[1]] > 0.5; m2 = M[r2[0]:r2[1]] > 0.5
        def bb(m): ys, xs = np.nonzero(m); return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        body1 = onto(body5, bb(m5), bb(m1), m1.shape) & m1
        body2 = nd.binary_fill_holes(m2)
        bodies = {0: body1, 1: body2, 4: body5}
        S5 = A[r5[0]:r5[1]].astype(int); R_, G_, B_ = S5[..., 0], S5[..., 1], S5[..., 2]
        pair5 = ((R_ > 170) & (G_ > 170) & (B_ < 90)) | ((G_ > 170) & (B_ > 170) & (R_ < 90))
        pair1m = onto(pair5, bb(m5), bb(m1), m1.shape)
        E = {i: edges(bd) for i, bd in bodies.items()}
        E[4] = bridge(*E[4], body5, pair5); E[0] = bridge(*E[0], body1, pair1m)
        # row 1: its OWN outline wherever that lies within SNAP px of the map's edge (everywhere but under a fin): row 5's outline placed
        # by the boxes ran a few px inside the front finlet and the head, which doubled the finlet and notched the back (method row 60)
        has1 = m1.any(0); top1 = np.where(has1, m1.argmax(0), np.nan); bot1 = np.where(has1, m1.shape[0] - 1 - m1[::-1].argmax(0), np.nan)
        t1, b1_ = E[0]; SNAP = 8
        t1 = np.where(np.abs(top1 - t1) <= SNAP, top1, t1); b1_ = np.where(np.abs(bot1 - b1_) <= SNAP, bot1, b1_)
        E[0] = (nd.uniform_filter1d(np.nan_to_num(t1, nan=float(np.nanmean(t1))), 3), nd.uniform_filter1d(np.nan_to_num(b1_, nan=float(np.nanmean(b1_))), 3))
        # paired fins (row 5 yellow / cyan; on row 1 placed by the boxes): moved whole by the shift at their root, not split at the belly line
        pair1 = nd.binary_dilation(pair1m, iterations=3) & m1
        pairs = {0: pair1, 4: nd.binary_dilation(pair5, iterations=1)}
        depth = max(np.max(e[1] - e[0]) for e in E.values())
        KC = {i: kcols(bd, k, kh) for i, bd in bodies.items()}
        grow = int(np.ceil(max(0.0, (max(k, kh or 0) - 1) * depth / 2))) + 2
    parts = []; prev = 0
    for i, (y0p, y1p) in enumerate(spans):
        gap = y0p - prev; prev = y1p
        band = img.crop((0, y0p, W, y1p))
        if whole or i == 3:   # row 4 (front views): scaled whole; --whole: every row but the top view
            kk = 1.0 if i == 2 else k
            band = band.resize((W, max(1, round(band.height * kk))), Image.LANCZOS)
        elif i == 2:          # row 3: top view, untouched
            pass
        else:
            t, bt = E[i]; src_ = np.asarray(band); o_ = remap(src_, t, bt, KC[i], grow)
            if i in pairs: o_ = paste_rigid(o_, src_, pairs[i], t, bt, KC[i], grow, grey=(i == 4))
            band = Image.fromarray(o_)
        parts.append((gap, band))
    tail = H - prev
    o = Image.new('RGB', (W, sum(g + p.height for g, p in parts) + tail), (0, 0, 0)); y = 0
    for g, p in parts: y += g; o.paste(p, (0, y)); y += p.height
    o.save(out, quality=95); print('wrote %s (%d x %d, rows %d, k %.3f%s, %s)' % (out, W, o.height, len(rows), k, '' if kh is None else ', head %.3f' % kh, 'whole rows' if whole else 'body only'))


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    kh = float(sys.argv[sys.argv.index('--head') + 1]) if '--head' in sys.argv else None
    args = [x for x in args if x != (sys.argv[sys.argv.index('--head') + 1] if kh is not None else None)]
    main(args[0], float(args[1]), args[2], whole='--whole' in sys.argv, kh=kh)
