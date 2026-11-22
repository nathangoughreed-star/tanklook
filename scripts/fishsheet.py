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


def panel_bands(M, min_gap=6, min_h=40):
    """Row ranges (y0, y1) of the panels, found by the empty black rows between them. Merges gaps under min_gap rows, drops runs under min_h."""
    r = (M.sum(1) > 0); runs = []; s = None
    for i, v in enumerate(r):
        if v and s is None: s = i
        if not v and s is not None: runs.append([s, i]); s = None
    if s is not None: runs.append([s, len(r)])
    merged = []
    for b in runs:                                   # a gap shorter than min_gap is inside one panel
        if merged and b[0] - merged[-1][1] < min_gap: merged[-1][1] = b[1]
        else: merged.append(b)
    return [tuple(b) for b in merged if b[1] - b[0] >= min_h]


def box(M, y0, y1):
    """(x0, x1, y0, y1) of the non-black pixels inside rows y0..y1, x1/y1 exclusive."""
    c = np.where(M[y0:y1].any(0))[0]; r = np.where(M[y0:y1].any(1))[0]
    return c[0], c[-1] + 1, y0 + r[0], y0 + r[-1] + 1


def align_dy(M, band1, band2, box2, lo=0.05, hi=0.15):
    """Vertical shift (rows) that puts panel 2 into panel 1's frame: the head columns (5-15 % of panel 2's length in from
    the head end, +x) have the same top and bottom edge in both panels. Returns panel1_row - panel2_row, an int."""
    d = []
    xe = box2[1]; w = box2[1] - box2[0]
    for x in range(int(xe - hi * w), int(xe - lo * w)):
        c1 = np.where(M[band1[0]:band1[1], x])[0]; c2 = np.where(M[band2[0]:band2[1], x])[0]
        if len(c1) and len(c2):
            d.append(((band1[0] + c1[0] - band2[0] - c2[0]) + (band1[0] + c1[-1] - band2[0] - c2[-1])) / 2)
    return int(round(np.median(d)))


def label_map(a, M, bands, b1box):
    """If a 5th panel exists: (pectoral mask, root (x, y)) in absolute sheet px of panel 1's frame, else (None, None).
    The label map is a side view; it is scaled and shifted so its silhouette box matches panel 1's. Yellow = pectoral,
    the black dot inside it (a hole of the yellow region) = the root."""
    if len(bands) < 5: return None, None
    y0, y1 = bands[4]; x0, x1, ty0, ty1 = box(M, y0, y1)
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
