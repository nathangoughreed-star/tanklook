"""Audit a 3-view fish reference sheet before building a model from it.

Method doc: research/fish-model-sheet-method.md, section 2 ("Sheet audit").
Run with:  python -I scripts/fish-sheet-audit.py SHEET.webp [--out debug.png]
Needs numpy + PIL only.

The sheet is side view (nose right), top view under it, front view under that, on black.
What it measures (all deterministic, no tuning per sheet):
  1. Panels: horizontal bands of non-black rows (max(R,G,B) > 40); x/y extent of each, black gaps between them.
  2. Length match: top-panel length / side-panel length (accept within 1%, rescale up to 6%, regenerate beyond).
  3. Thickness: at stations (fraction of length from the snout, default 0.15 / 0.20 = just behind the head on a
     clownfish, clear of the dorsal and pelvic fins), top-panel width / side-panel depth. The top width is rescaled
     by the side/top length ratio first.
  4. Front panel: body width / body height. Fins only ever stick OUT of the body, so each outline (left, right, top,
     bottom) is fitted with its inner envelope: fit, drop points outside, refit. That trims solid pectorals (clownfish),
     fanned translucent pectorals that hole filling welds on (oscar), a dorsal spike and edge-on pelvic/anal fins.
     PASS if front width/height is within 5% of the top/side station ratio. Front width vs the top panel's widest is
     printed as INFO: it tests scale registration between panels, which image models don't keep (both sheets ~8% off).
  5. Edge-on tail in the top view: top-panel width over the last 8% of length / side-panel tail height over the same
     span. An edge-on tail is a thin line (well under 0.25); a fanned tail reads near 1.
  6. Optional --real R: compare the sheet's width/depth with a real value (photo or morphometrics), accept within 10%.

Prints one PASS / FAIL / INFO line per check and writes a debug picture (panel boxes, station lines, front body
outline). By-eye items (cartoon face, exaggerated spines, flat-lying dorsal, pattern continuity) stay by eye.
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageDraw

THRESH = 40          # max(R,G,B) above this = not background
MIN_ROW_PX = 3       # a row needs this many lit pixels to belong to a panel
MIN_PANEL_H = 40     # bands shorter than this are noise (stray glints)


def bands(lit_rows, min_px=MIN_ROW_PX, min_h=MIN_PANEL_H):
    out, start = [], None
    for y, c in enumerate(lit_rows):
        if c >= min_px and start is None:
            start = y
        elif c < min_px and start is not None:
            if y - start >= min_h:
                out.append((start, y))
            start = None
    if start is not None and len(lit_rows) - start >= min_h:
        out.append((start, len(lit_rows)))
    return out


def fill_holes(mask):
    """Fill dark pixels enclosed by the fish (black band edges, pupils, fin rims) so the silhouette is solid.
    Flood-fills the background from the border with PIL; whatever unlit area it can't reach is a hole."""
    h, w = mask.shape
    pad = np.zeros((h + 2, w + 2), np.uint8)
    pad[1:-1, 1:-1] = mask.astype(np.uint8) * 255
    img = Image.fromarray(pad, "L").copy()  # fromarray shares a read-only buffer
    ImageDraw.floodfill(img, (0, 0), 128)
    bg = np.asarray(img)[1:-1, 1:-1] == 128
    return ~bg


def run_containing(line, idx, gap=2):
    """Lit run in a 1-D bool array that contains idx (or the nearest lit pixel), bridging gaps <= gap px."""
    lit = np.flatnonzero(line)
    if lit.size == 0:
        return None
    if not line[idx]:
        idx = lit[np.argmin(np.abs(lit - idx))]
    a = idx
    while a > 0 and (line[a - 1] or line[max(0, a - 1 - gap):a].any()):
        a -= 1
    b = idx
    n = len(line)
    while b < n - 1 and (line[b + 1] or line[b + 1:min(n, b + 2 + gap)].any()):
        b += 1
    return a, b


def longest_run(line, gap=2):
    lit = np.flatnonzero(line)
    if lit.size == 0:
        return None
    best, a = None, lit[0]
    for i in range(1, lit.size + 1):
        if i == lit.size or lit[i] - lit[i - 1] > gap + 1:
            r = (a, lit[i - 1])
            if best is None or r[1] - r[0] > best[1] - best[0]:
                best = r
            if i < lit.size:
                a = lit[i]
    return best


def envelope(edge, outward, use, tol, deg=4, iters=30):
    """Inner envelope of a body outline. edge: 1-D outline coordinate per row (NaN = none); outward: +1 if larger is
    further out, -1 if smaller; use: rows to fit (body rows, not a dorsal spike). Fins only ever stick OUT of the body,
    so fit a polynomial, drop rows lying more than tol outside it, refit, until stable. Works for solid fins that jump
    out (clownfish pectorals) and for fanned, translucent fins that hole filling welds onto the body (oscar).
    Returns (body edge: raw where clean, fit where fin; fin mask)."""
    n = len(edge)
    rows = np.flatnonzero(use & ~np.isnan(edge))
    fin = np.zeros(n, bool)
    if rows.size < deg + 3:
        return edge.copy(), fin
    t = (rows - rows.mean()) / max(1.0, rows.std())
    keep = np.ones(rows.size, bool)
    for _ in range(iters):
        p = np.polyfit(t[keep], edge[rows][keep], deg)
        fit = np.polyval(p, t)
        new = outward * (edge[rows] - fit) <= tol
        if (new == keep).all():
            break
        keep = new
    out = edge.copy()
    fin[rows[~keep]] = True
    out[rows[~keep]] = fit[~keep]
    return out, fin


def measure(path, stations, real, out, mirror):
    im = Image.open(path).convert("RGB")
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im).astype(np.int16)
    lit = a.max(2) > THRESH
    H, W = lit.shape
    res = {"fail": 0}

    def line(tag, ok, msg):
        word = {True: "PASS", False: "FAIL", None: "INFO"}[ok]
        if ok is False:
            res["fail"] += 1
        print(f"{word}  {tag}: {msg}")

    print(f"sheet {path}  {W} x {H} px{'  (mirrored)' if mirror else ''}")
    pb = bands(lit.sum(1))
    if len(pb) != 3:
        line("panels", False, f"found {len(pb)} bands {pb}; expected 3 (side, top, front). Panels touching, or text on the sheet.")
        return res
    panels = {}
    for name, (y0, y1) in zip(("side", "top", "front"), pb):
        cols = np.flatnonzero(lit[y0:y1].sum(0) >= 2)
        panels[name] = (int(cols[0]), y0, int(cols[-1]) + 1, y1)
        x0, _, x1, _ = panels[name]
        lit[y0:y1] = fill_holes(lit[y0:y1])
        print(f"INFO  panel {name}: x {x0}-{x1} ({x1 - x0} px long), y {y0}-{y1} ({y1 - y0} px tall)")
    gaps = [pb[1][0] - pb[0][1], pb[2][0] - pb[1][1]]
    line("gaps", min(gaps) >= 10, f"black gap side/top {gaps[0]} px, top/front {gaps[1]} px (need >= 10)")

    sx0, sy0, sx1, sy1 = panels["side"]
    tx0, ty0, tx1, ty1 = panels["top"]
    fx0, fy0, fx1, fy1 = panels["front"]
    Ls, Lt = sx1 - sx0, tx1 - tx0
    k = Ls / Lt
    dl = abs(Lt - Ls) / Ls
    line("size", Ls >= 900, f"side panel {Ls} px long (want >= ~900)")
    if dl <= 0.01:
        line("length", True, f"top {Lt} vs side {Ls} px ({dl:.1%}); no rescale")
    elif dl <= 0.06:
        line("length", True, f"top {Lt} vs side {Ls} px ({dl:.1%}); rescale top by {k:.3f} before measuring")
    else:
        line("length", False, f"top {Lt} vs side {Ls} px ({dl:.1%} > 6%); regenerate")
    ends = (abs(tx0 - sx0), abs(tx1 - sx1))
    line("ends", max(ends) <= 0.02 * Ls, f"snout x offset {ends[1]} px, tail x offset {ends[0]} px between side and top")

    # stations: fraction of length from the snout (nose right)
    side = lit[sy0:sy1]
    top = lit[ty0:ty1]
    st_rows = []
    marks = []
    for s in stations:
        xs = int(round(sx1 - 1 - s * Ls))
        xt = int(round(tx1 - 1 - s * Lt))
        rs = longest_run(side[:, xs])
        rt = run_containing(top[:, xt], (ty1 - ty0) // 2)
        if rs is None or rt is None:
            line(f"station {s:.2f}", False, "no body found")
            continue
        depth = rs[1] - rs[0] + 1
        width = (rt[1] - rt[0] + 1) * k
        st_rows.append((s, depth, width, width / depth))
        marks.append((xs, sy0 + rs[0], sy0 + rs[1], xt, ty0 + rt[0], ty0 + rt[1]))
        print(f"INFO  station {s:.2f} SL from snout: side depth {depth} px, top width {width:.0f} px, width/depth {width / depth:.3f}")
    ratio = float(np.median([r[3] for r in st_rows])) if st_rows else float("nan")

    # front panel: body width / height with fins de-bumped
    fr = lit[fy0:fy1, fx0:fx1]
    fh, fw = fr.shape
    cx = fw // 2
    # centre row: middle of the centre column's longest run
    cr = longest_run(fr[:, cx])
    cy = (cr[0] + cr[1]) // 2
    L = np.full(fh, np.nan)
    R = np.full(fh, np.nan)
    for y in range(fh):
        r = run_containing(fr[y], cx) if fr[y, cx] or fr[y, max(0, cx - 3):cx + 4].any() else None
        if r:
            L[y], R[y] = r
    raw = R - L + 1
    use = raw >= 0.3 * np.nanmedian(raw)          # body rows; drops a thin dorsal spike or edge-on fin line
    tol = max(3.0, 0.01 * fw)
    Lb, Lf = envelope(L, -1, use, tol)
    Rb, Rf = envelope(R, +1, use, tol)
    widths = Rb - Lb + 1
    fwid = float(np.nanmax(widths))
    ymax = int(np.nanargmax(widths))
    xl, xr = int(round(Lb[ymax])), int(round(Rb[ymax]))
    # Height: the same envelope fit on the top and bottom outlines across the body's columns. A dorsal spike and
    # edge-on pelvic/anal fins stick out up/down and are trimmed like the pectorals (the 40%-width rule this replaced
    # cut off the oscar's pointed top: 356 px against ~410).
    T = np.full(fw, np.nan)
    B = np.full(fw, np.nan)
    for x in range(xl, xr + 1):
        r = run_containing(fr[:, x], ymax) if fr[ymax, x] else None
        if r:
            T[x], B[x] = r
    colsok = np.zeros(fw, bool)
    colsok[xl:xr + 1] = True
    Tb, Tf = envelope(T, -1, colsok, tol)
    Bb, Bf = envelope(B, +1, colsok, tol)
    mid = slice(max(xl, cx - (xr - xl) // 10), min(xr, cx + (xr - xl) // 10) + 1)
    hts = Bb[mid] - Tb[mid] + 1
    fhei = float(np.nanmax(hts))
    xh = mid.start + int(np.nanargmax(hts))
    ftop, fbot = float(Tb[xh]), float(Bb[xh])
    fratio = fwid / fhei
    raw_w = float(np.nanmax(R - L)) + 1
    raw_h = float(np.nanmax(np.where(fr.any(1))[0]) - np.nanmin(np.where(fr.any(1))[0]) + 1)
    print(f"INFO  front: body {fwid:.0f} x {fhei:.0f} px (w x h) after removing fins, width/height {fratio:.3f}; "
          f"raw {raw_w:.0f} x {raw_h:.0f} with fins; fin rows bridged {int(Lf.sum())} left / {int(Rf.sum())} right")
    # Like-for-like: the front panel's widest body = the top panel's widest body (both are the max breadth).
    tw = []
    for f in np.linspace(0.05, 0.60, 56):
        xt = int(round(tx1 - 1 - f * Lt))
        rt = run_containing(top[:, xt], (ty1 - ty0) // 2)
        if rt:
            tw.append(((rt[1] - rt[0] + 1) * k, f))
    tmax, tf = max(tw)
    line("thickness agree", abs(fratio - ratio) / ratio <= 0.05,
         f"front width/height {fratio:.3f} vs top/side width/depth {ratio:.3f} ({(fratio - ratio) / ratio:+.1%}; accept within 5%)")
    print(f"INFO  front body width {fwid:.0f} px vs top panel's widest {tmax:.0f} px at {tf:.2f} SL ({(fwid - tmax) / tmax:+.1%}); "
          f"panel scale registration, not thickness")
    print(f"INFO  front height {fhei:.0f} px should equal the side panel's deepest body (fins excluded); "
          f"check by eye (side depth at stations: {', '.join(str(r[1]) for r in st_rows)} px)")
    if real:
        d = (ratio - real) / real
        line("thickness vs real", abs(d) <= 0.10, f"sheet {ratio:.3f} vs real {real:.3f} ({d:+.1%}; accept within 10%)")

    # edge-on tail in the top view: last 8% of the length
    tail_t = []
    tail_s = []
    for f in np.linspace(0.93, 0.99, 7):
        xs = int(round(sx1 - 1 - f * Ls))
        xt = int(round(tx1 - 1 - f * Lt))
        rs = longest_run(side[:, xs])
        rt = longest_run(top[:, xt])
        if rs and rt:
            tail_s.append(rs[1] - rs[0] + 1)
            tail_t.append((rt[1] - rt[0] + 1) * k)
    if tail_s:
        tr = float(np.median(tail_t) / np.median(tail_s))
        line("tail edge-on", tr < 0.25, f"top-view tail width / side tail height over 93-99% SL = {tr:.2f} "
             f"(edge-on line < 0.25; ~1 = fanned flat)")

    print(f"RESULT  {'PASS' if res['fail'] == 0 else 'FAIL'}  ({res['fail']} failed); width/depth {ratio:.3f}, front {fratio:.3f}")
    res.update(ratio=ratio, front=fratio, side_len=Ls, top_len=Lt)

    if out:
        dbg = im.copy()
        d = ImageDraw.Draw(dbg)
        for name, (x0, y0, x1, y1) in panels.items():
            d.rectangle((x0, y0, x1 - 1, y1 - 1), outline=(255, 255, 0), width=2)
            d.text((x0 + 4, y0 + 2), name, fill=(255, 255, 0))
        for xs, a0, a1, xt, b0, b1 in marks:
            d.line((xs, a0, xs, a1), fill=(255, 0, 0), width=3)
            d.line((xt, b0, xt, b1), fill=(0, 255, 0), width=3)
        for yy in (ftop, fbot):
            d.line((fx0, fy0 + yy, fx1, fy0 + yy), fill=(0, 255, 255), width=1)
        for arr, fin, horiz in ((Lb, Lf, True), (Rb, Rf, True), (Tb, Tf, False), (Bb, Bf, False)):
            for i in range(len(arr)):
                if np.isnan(arr[i]):
                    continue
                col = (255, 0, 255) if fin[i] else (0, 255, 255)
                p = (fx0 + arr[i], fy0 + i) if horiz else (fx0 + i, fy0 + arr[i])
                d.point(p, fill=col)
                d.point((p[0] + 1, p[1]), fill=col)
        dbg.save(out)
        print(f"debug picture: {out}")
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("sheet")
    ap.add_argument("--stations", default="0.15,0.20", help="fractions of length from the snout, clear of fins")
    ap.add_argument("--real", type=float, default=None, help="real width/depth to compare (e.g. from a top photo)")
    ap.add_argument("--mirror", action="store_true", help="sheet faces left: mirror it first")
    ap.add_argument("--out", default=None, help="debug picture path (PNG)")
    a = ap.parse_args()
    st = [float(s) for s in a.stations.split(",") if s.strip()]
    r = measure(a.sheet, st, a.real, a.out, a.mirror)
    sys.exit(1 if r["fail"] else 0)


if __name__ == "__main__":
    main()
