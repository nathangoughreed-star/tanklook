"""Shared sheet helpers for the E-GEN finless pipeline (fish-fin-cut / fish-fin-line / fish-glb-assemble / fish-gen).
A sheet is panels stacked on plain black: 1 side with fins, 2 side with fins trimmed flush, 3 top, 4 front,
optional 5 label map (side view, pectoral filled yellow, a black root dot inside it). Head faces +x (right) in panels 1-2;
fish-gen flips the sheet first when a species faces left."""
import numpy as np
from PIL import Image
from scipy import ndimage as nd


def load(path):
    a = np.asarray(Image.open(path).convert('RGB'))
    return a, a.max(2) > 8


def _runs(v, min_gap, min_len):
    runs = []; s = None
    for i, x in enumerate(v):
        if x and s is None: s = i
        if not x and s is not None: runs.append([s, i]); s = None
    if s is not None: runs.append([s, len(v)])
    merged = []
    for b in runs:                                   # a gap shorter than min_gap is inside one panel
        if merged and b[0] - merged[-1][1] < min_gap: merged[-1][1] = b[1]
        else: merged.append(b)
    return [b for b in merged if b[1] - b[0] >= min_len]


def panel_bands(M, min_gap=6, min_h=40, min_col_gap=12):
    """Panel rectangles (y0, y1, x0, x1) in reading order, found by the black gaps on both axes: first the row bands
    (vertical stack, or the rows of a grid), then each row band split by column gaps (a 2x2 grid has two panels per row)."""
    out = []
    for y0, y1 in _runs(M.sum(1) > 0, min_gap, min_h):
        cols = _runs(M[y0:y1].sum(0) > 0, min_col_gap, 40)
        for x0, x1 in (cols or [[0, M.shape[1]]]):
            r = np.where(M[y0:y1, x0:x1].any(1))[0]
            out.append((y0 + r[0], y0 + r[-1] + 1, x0, x1))
    if len(out) == 6 and out[3][0] < out[4][1] and out[4][0] < out[3][1]:
        # 5-row sheet whose row 4 is front | front fin map (pectoral angle): keep the stacked numbering
        # (0 side, 1 finless side, 2 top, 3 front, 4 side label map) and put the front fin map last (5)
        out = out[:4] + [out[5], out[4]]
    return out


def mask(M, rect):
    """M zeroed outside the panel rectangle (same shape as M)."""
    o = np.zeros_like(M); y0, y1, x0, x1 = rect; o[y0:y1, x0:x1] = M[y0:y1, x0:x1]; return o


def shift(m, dy, dx):
    """m moved down by dy and right by dx, same shape, anything pushed off the edge dropped."""
    o = np.zeros_like(m); H, W = m.shape
    ys, xs = slice(max(0, -dy), min(H, H - dy)), slice(max(0, -dx), min(W, W - dx))
    o[max(0, dy):max(0, dy) + (ys.stop - ys.start), max(0, dx):max(0, dx) + (xs.stop - xs.start)] = m[ys, xs]; return o


def box(M, y0, y1, x0=0, x1=None):
    """(x0, x1, y0, y1) of the non-black pixels inside the given rows (and columns), x1/y1 exclusive. A panel rectangle
    from panel_bands can be passed as box(M, *rect)."""
    S = M[y0:y1, x0:x1]; c = np.where(S.any(0))[0]; r = np.where(S.any(1))[0]
    return x0 + c[0], x0 + c[-1] + 1, y0 + r[0], y0 + r[-1] + 1


def align(M, r1, r2, lo=0.05, hi=0.15):
    """(dy, dx) that put panel 2 into panel 1's frame (panel 1 = panel 2 + (dy, dx)). Both panels show the fish at one
    scale with the head to +x: dx lines up the head tips, dy the top / bottom edges of the head columns (5-15 % of the
    length in from the tip). Both are ints; a stacked sheet gives dx = 0."""
    B1 = box(M, *r1); B2 = box(M, *r2); dx = int(B1[1] - B2[1]); w = B2[1] - B2[0]; d = []
    for x in range(int(B2[1] - hi * w), int(B2[1] - lo * w)):
        c1 = np.where(M[r1[0]:r1[1], x + dx])[0]; c2 = np.where(M[r2[0]:r2[1], x])[0]
        if len(c1) and len(c2):
            d.append(((r1[0] + c1[0] - r2[0] - c2[0]) + (r1[0] + c1[-1] - r2[0] - c2[-1])) / 2)
    return int(round(np.median(d))), dx


def label_map(a, M, bands, b1box):
    """If a 5th panel exists: (pectoral mask, root (x, y)) in absolute sheet px of panel 1's frame, else (None, None).
    The label map is a side view; it is scaled and shifted so its silhouette box matches panel 1's. Yellow = pectoral,
    the black dot inside it (a hole of the yellow region) = the root."""
    if len(bands) < 5: return None, None
    y0, y1 = bands[4][:2]; x0, x1, ty0, ty1 = box(M, *bands[4])
    yel = (a[..., 0] > 180) & (a[..., 1] > 160) & (a[..., 2] < 110); yel[:y0] = False; yel[y1:] = False
    yel = nd.binary_opening(yel, iterations=1)
    lab, n = nd.label(yel)
    if n == 0: return None, None
    k = np.bincount(lab.ravel())[1:].argmax() + 1; reg = lab == k
    filled = nd.binary_fill_holes(reg); dot = filled & ~reg & (a.max(2) < 60)
    root = None
    if dot.any(): yy, xx = np.where(dot); root = (xx.mean(), yy.mean())
    else: yy, xx = np.where(reg); root = (xx.max(), yy.mean())   # no dot: the head-side end
    # map into panel 1's frame by the silhouette box (silhouette = anything non-black in panel 5)
    X0, X1, Y0, Y1 = b1box; sx = (X1 - X0) / (x1 - x0); sy = (Y1 - Y0) / (ty1 - ty0)
    s = (sx + sy) / 2
    T = lambda x, y: (X0 + (x - x0) * s, Y0 + (y - ty0) * s)
    ys, xs = np.where(filled); px, py = T(xs, ys)
    out = np.zeros(M.shape, bool); out[np.clip(py.round().astype(int), 0, M.shape[0] - 1), np.clip(px.round().astype(int), 0, M.shape[1] - 1)] = True
    out = nd.binary_closing(out, iterations=2); out = nd.binary_fill_holes(out)
    return out, T(*root)


def front_fin_angles(a, M, bands, pec_mask=None):
    """If the sheet has a front fin map (6th rect, see panel_bands): (pectoral swing out from the flank, pelvic angle
    from the vertical), degrees, either None when not found. Pectoral: a fin card of width W swung out by angle s shows
    W*cos(s) wide in the side view and W*sin(s) wide from the front, so s = atan(front width / side width) at the same
    scale (pec_mask = the pectoral in panel 1's frame). Pelvic: the cyan blob's long axis against the vertical."""
    if len(bands) < 6: return None, None
    y0, y1, x0, x1 = bands[5]; R = a[y0:y1, x0:x1].astype(int)
    yel = (R[..., 0] > 180) & (R[..., 1] > 160) & (R[..., 2] < 110)
    cya = (R[..., 0] < 110) & (R[..., 1] > 160) & (R[..., 2] > 180)
    fb = box(M, *bands[3]); mh = box(M, *bands[5]); k =   (fb[3] - fb[2]) / max(1, (mh[3] - mh[2]))
    pec = pel = None
    lab, n = nd.label(yel)
    if n and pec_mask is not None and pec_mask.any():
        w = np.mean([np.ptp(np.where(lab == i)[1]) + 1 for i in range(1, n + 1) if (lab == i).sum() > 30]) * k
        xs = np.where(pec_mask.any(0))[0]; ws = xs[-1] - xs[0] + 1
        pec = float(np.degrees(np.arctan2(w, ws)))
    lab, n = nd.label(cya)
    angs = []
    for i in range(1, n + 1):
        yy, xx = np.where(lab == i)
        if len(yy) < 20: continue
        c = np.cov(np.vstack([xx - xx.mean(), yy - yy.mean()])); ev, vec = np.linalg.eigh(c); v = vec[:, -1]
        angs.append(np.degrees(np.arctan2(abs(v[0]), abs(v[1]))))
    if angs: pel = float(np.mean(angs))
    return pec, pel
