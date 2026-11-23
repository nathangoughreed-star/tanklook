"""E-GEN finless method, step 1 after the generator: cut the fins out of the sheet.
  panel 2 (finless side) is shifted into panel 1's frame by the head columns' top / bottom edges (fishsheet.align_dy);
  fins = panel 1 mask AND NOT (panel 2 mask dilated 2 px); connected components over 300 px are kept.
Writes into the work folder:
  align.npy   [dy, dx] rows / columns to add to a panel 2 pixel to land in panel 1's frame (dx = 0 on a stacked sheet)
  finlab.npy  int32  panel 1 frame (rows from panel 1's top), 0 = not a fin, 1..n = components, largest first
  fins.json   role per component, by position against the finless body: above the back = dorsal (can be several),
              behind the tail-fin base = caudal, below the rear half = anal, below the front half = pelvic
              (the largest such component is the pelvic pair); plus the pectoral: from panel 5 (yellow region, black root dot)
              when the sheet has one, else from pec.json ({"poly": [[x, y], ...]} absolute sheet px, hand trace), else none
  pec.npy     bool, whole sheet, the pectoral region (only when there is one)
Usage: python fish-fin-cut.py <work-folder> [sheet.webp] [--body-from-map]   (body from panel 5 grey, for same-hue scaled fins)"""
import sys, os, json, numpy as np
from scipy import ndimage as nd
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs

MIN_PX, DILATE = 300, 2


def map_body(a, M, bands):
    """Panel 5's grey body (holes filled: eye, pectoral), scaled and shifted by bounding box onto panel 1. Whole-sheet bool.
    Panel 5 is a uniformly scaled copy of panel 1 on the discus sheet (IoU 0.975 after the bbox fit)."""
    def sil(i):
        y0, y1, x0, x1 = bands[i]; m = np.zeros(M.shape, bool); m[y0:y1, x0:x1] = M[y0:y1, x0:x1]; return m
    def bb(m): ys, xs = np.where(m); return xs.min(), xs.max(), ys.min(), ys.max()
    A = a.astype(int); m5 = sil(4)
    grey = nd.binary_fill_holes((abs(A[..., 0] - 128) < 30) & (abs(A[..., 1] - 128) < 30) & (abs(A[..., 2] - 128) < 30) & m5)
    lab, n = nd.label(grey); grey = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    X0, X1, Y0, Y1 = bb(sil(0)); x0, x1, y0, y1 = bb(m5)
    crop = Image.fromarray((grey[y0:y1 + 1, x0:x1 + 1] * 255).astype(np.uint8)).resize((X1 - X0 + 1, Y1 - Y0 + 1), Image.NEAREST)
    o = np.zeros(M.shape, bool); o[Y0:Y1 + 1, X0:X1 + 1] = np.asarray(crop) > 127
    # fin colours (dorsal red, anal green, caudal blue, pelvic cyan) warped the same way: 0 = none, 1..4
    R, G, B = A[..., 0], A[..., 1], A[..., 2]; hi, lo = 170, 90
    col = np.zeros(M.shape, np.uint8)
    for k, c in enumerate([(R > hi) & (G < lo) & (B < lo), (G > hi) & (R < lo) & (B < lo), (B > hi) & (R < lo) & (G < lo), (G > hi) & (B > hi) & (R < lo)], 1):
        col[c & m5] = k
    cc = Image.fromarray(col[y0:y1 + 1, x0:x1 + 1]).resize((X1 - X0 + 1, Y1 - Y0 + 1), Image.NEAREST)
    colw = np.zeros(M.shape, np.uint8); colw[Y0:Y1 + 1, X0:X1 + 1] = np.asarray(cc)
    return o, colw


def main(F, sheet=None):
    a, M = fs.load(sheet or os.path.join(F, 'sheet.webp'))
    bands = fs.panel_bands(M)
    assert len(bands) in (4, 5, 6), f'expected 4 to 6 panels on the sheet, found {len(bands)}: {bands}'
    B1 = fs.box(M, *bands[0]); B2 = fs.box(M, *bands[1])
    dy, dx = fs.align(M, bands[0], bands[1])
    p1y = bands[0][0]
    M1 = fs.mask(M, bands[0])[p1y:bands[0][1]]; M2 = fs.shift(fs.mask(M, bands[1]), dy, dx)[p1y:bands[0][1]]   # panel 2 in panel 1's frame
    if '--body-from-map' in sys.argv:   # same-hue scaled fins (discus): row 2 kept the fins; take the body from panel 5's grey instead
        M2, colw = map_body(a, M, bands); M2 = M2[p1y:bands[0][1]]; colw = colw[p1y:bands[0][1]]
    fin = M1 & ~nd.binary_dilation(M2, iterations=DILATE)
    lab0, n0 = nd.label(fin); cnt = np.bincount(lab0.ravel()); cnt[0] = 0
    if '--body-from-map' in sys.argv:   # the fins touch round the disc: name each fin pixel by the nearest panel-5 fin colour
        idx = nd.distance_transform_edt(colw == 0, return_distances=False, return_indices=True)
        lab0 = np.where(fin, colw[idx[0], idx[1]], 0).astype(np.int32); cnt = np.bincount(lab0.ravel(), minlength=5); cnt[0] = 0
    order = [i for i in np.argsort(-cnt) if cnt[i] > MIN_PX]
    lab = np.zeros(lab0.shape, np.int32)
    for new, old in enumerate(order, 1): lab[lab0 == old] = new
    np.save(os.path.join(F, 'finlab.npy'), lab); np.save(os.path.join(F, 'align.npy'), np.array([dy, dx]))

    # ---- name the components against the finless body ----
    c2 = np.where(M2.any(0))[0]; bx0, bx1 = c2[0], c2[-1] + 1; bl = bx1 - bx0
    t2 = np.full(M1.shape[1], np.nan); b2 = t2.copy()
    for x in c2: r = np.where(M2[:, x])[0]; t2[x], b2[x] = r[0], r[-1]
    roles = {}
    for k in range(1, len(order) + 1):
        yy, xx = np.where(lab == k); cx, cy = xx.mean(), yy.mean()
        xi = int(np.clip(round(cx), bx0, bx1 - 1))
        mid = (t2[xi] + b2[xi]) / 2 if not np.isnan(t2[xi]) else (M2.any(1).nonzero()[0].mean())
        if '--body-from-map' in sys.argv: role = ['', 'dorsal', 'anal', 'caudal', 'pelvic'][order[k - 1]]
        elif cx < bx0 + 0.12 * bl: role = 'caudal'
        elif cy < mid: role = 'dorsal'
        elif cx < bx0 + 0.5 * bl: role = 'anal'
        else: role = 'pelvic'
        roles[k] = dict(role=role, px=int(len(yy)), cx=round(float(cx), 1), cy=round(float(cy + p1y), 1))
    # one pelvic pair: the largest pelvic-position component; any further ones stay on the card
    pel = [k for k, v in roles.items() if v['role'] == 'pelvic']
    for k in pel[1:]: roles[k]['role'] = 'pelvic-extra'     # components are largest first
    out = dict(panels=len(bands), bands=[list(map(int, b)) for b in bands], dy=int(dy), dx=int(dx), components=roles, pectoral=None)

    # ---- pectoral ----
    pec, root = fs.label_map(a, M, bands, B1)
    src = 'label map (panel 5)'
    if pec is None:
        pj = os.path.join(F, 'pec.json'); src = 'hand trace (pec.json)'
        if os.path.exists(pj):
            pm = Image.new('L', (a.shape[1], a.shape[0]), 0)
            ImageDraw.Draw(pm).polygon([tuple(p) for p in json.load(open(pj))['poly']], fill=1); pec = np.asarray(pm) > 0
    if pec is not None and pec.any():
        yy, xx = np.where(pec); np.save(os.path.join(F, 'pec.npy'), pec)
        out['pectoral'] = dict(source=src, px=int(pec.sum()), root=None if root is None else [round(float(root[0]), 1), round(float(root[1]), 1)])
    else: src = 'none'
    json.dump(out, open(os.path.join(F, 'fins.json'), 'w'), indent=1)
    names = {}
    for v in roles.values(): names[v['role']] = names.get(v['role'], 0) + 1
    print('panels %d, dy %d dx %d, fin components %d (%s); pectoral: %s' % (len(bands), dy, dx, len(order), ', '.join(f'{n} {c}' for n, c in names.items()), src), flush=True)


if __name__ == '__main__':
    A = [x for x in sys.argv[1:] if not x.startswith("--")]
    main(A[0], A[1] if len(A) > 1 else None)
