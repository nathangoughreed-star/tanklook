#!/usr/bin/env python3
"""Measure a fish's side outline from a photo on a black background (fish-painter experiment, 2026-11-19).

  python -I scripts/fish-outline.py <photo.png> <out.anatomy.json> [--debug debug.png] [--open 9]

Needs numpy + Pillow only. The photo stays OUT of the repo (copyright); the JSON holds numbers only.

What it does
  1. mask   = pixels brighter than a threshold (max of R,G,B); the largest blob is the fish.
  2. axis   = snout tip (right-most mask pixel, nose points right) to the caudal-peduncle centre
              (narrowest column of the mask between the body and the tail fin). The image is rotated so the axis is level.
  3. body   = the mask opened with a disk (default radius 9 px), which strips thin fin rays / membranes / spines.
              Top and bottom body edge are sampled at 21 stations, 0..100 % of standard length (SL) from the snout,
              as distance from the axis in % SL (the `depthProfile` block of research/fish-painter-design.md section 3).
  4. fins   = (full mask) minus (body mask): extents of dorsal / anal / pelvic fins, the caudal outline, tail tip.

Honest limits (also written into the JSON under `reliability`)
  * Dark or translucent fin parts (here: black/white dorsal spines and the black-and-white tail-fin tuft) fall under the
    threshold or inside the opening, so fin HEIGHTS are lower bounds; the membrane edge is under-measured.
  * Where a fin's membrane is thicker than twice the opening radius (anal fin base, pelvic root) it is counted as body;
    the belly edge there reads slightly deep.
  * Needs a clean black background and a level-ish side view. Busy reef backgrounds need a segmentation step first.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter


def disk(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def shift_reduce(m, r, op):
    """Binary erosion (op=np.logical_and) or dilation (np.logical_or) by a disk, via shifted copies."""
    pad = np.pad(m, r, constant_values=(op is np.logical_or) is False and False or False)
    out = None
    H, W = m.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r:
                continue
            s = pad[r + dy:r + dy + H, r + dx:r + dx + W]
            out = s.copy() if out is None else op(out, s)
    return out


def blue_body(a, full, thr, r_close, r_open, bright=0, warm=False):
    """Body = mask pixels whose blue share B/(R+B) is high (the body is blue-purple, the fins pink-red), blurred a little,
    closed over scale gaps, then opened to drop thin leftovers. Photo-specific: only valid when body and fin hues differ."""
    r, b = a[..., 0].astype(float), a[..., 2].astype(float)
    q = np.where(full, b / (r + b + 1e-6), 0.0)
    if warm:  # --warm: body is warmer (R-B) than grey fins (oscar: fins R-B ~10, body >= 22); --blue is then the R-B threshold / 255
        q = np.where(full, np.clip(r - b, 0, 255) / 255.0, 0.0)
    qb = np.asarray(Image.fromarray((q * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))).astype(float) / 255.0
    m = full & (qb > thr)
    if bright:  # fins are darker than the flank in some photos (translucent): also keep bright pixels
        mx = np.asarray(Image.fromarray(a.max(2).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))).astype(float)
        m = m | (full & (mx > bright))
    m = shift_reduce(shift_reduce(m, r_close, np.logical_or), r_close, np.logical_and)  # closing
    m = opening(m, r_open)
    return largest_blob(m)


def opening(m, r):
    return shift_reduce(shift_reduce(m, r, np.logical_and), r, np.logical_or)


def largest_blob(m):
    """Largest 4-connected component, simple flood fill with a stack (600x600 is small)."""
    H, W = m.shape
    lab = np.zeros((H, W), np.int32)
    best, best_n, k = 0, 0, 0
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        k += 1
        st = [(y0, x0)]
        lab[y0, x0] = k
        n = 0
        while st:
            y, x = st.pop()
            n += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = k
                    st.append((yy, xx))
        if n > best_n:
            best, best_n = k, n
    return lab == best


def col_edges(m):
    """Per column: (top, bottom) row of the mask (NaN if empty)."""
    H, W = m.shape
    top = np.full(W, np.nan)
    bot = np.full(W, np.nan)
    for x in range(W):
        ys = np.nonzero(m[:, x])[0]
        if len(ys):
            top[x], bot[x] = ys[0], ys[-1]
    return top, bot


def smooth(a, k=5):
    """Moving median ignoring NaN."""
    out = np.full_like(a, np.nan)
    for i in range(len(a)):
        w = a[max(0, i - k):i + k + 1]
        w = w[~np.isnan(w)]
        if len(w):
            out[i] = np.median(w)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
    src, outp = args[0], args[1]
    R = int(opts.get('--open', 9))
    thr = int(opts.get('--thr', 30))
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(int)
    full = largest_blob(a.max(2) > thr)
    H, W = full.shape
    ys, xs = np.nonzero(full)

    # --- first pass: rough axis from the unrotated mask
    xs_max, xs_min = xs.max(), xs.min()
    snout = np.array([xs_max, ys[xs == xs_max].mean()])
    top0, bot0 = col_edges(full)
    thick = bot0 - top0
    # peduncle: narrowest column of the OPENED mask in the rear third of the body (stable against fin tufts)
    BT = float(opts.get('--blue', 0.0))
    body0 = opening(full, R)
    WARM = '--warm' in sys.argv
    bodyB0 = blue_body(a, full, BT, 5, 6, 0, WARM) if BT else None
    BR = int(opts.get('--bright', 0))
    bodyBr0 = blue_body(a, full, BT, 5, 6, BR, WARM) if (BT and BR) else None  # bottom edge only: fins are darker than the flank
    tb0, bb0 = col_edges(body0)
    th_b = bb0 - tb0
    lo, hi = int(xs_min + 0.12 * (xs_max - xs_min)), int(xs_min + 0.40 * (xs_max - xs_min))
    # peduncle = the narrowest OPENED-mask column that still has body on both sides of it
    cand = np.where(np.isnan(th_b[lo:hi]), 1e9, th_b[lo:hi])
    ped_x = lo + int(np.argmin(cand))
    LMK = json.load(open(opts['--landmarks'])) if '--landmarks' in opts else {}
    if 'ped' in LMK:  # hand-placed peduncle centre [x, y] (when blue fins or a tail tuft fool the narrowest-column search)
        ped_x = int(LMK['ped'][0]); ped = np.array([ped_x, float(LMK['ped'][1])])
    else:
        ped = np.array([ped_x, (tb0[ped_x] + bb0[ped_x]) / 2])

    ang = np.degrees(np.arctan2(snout[1] - ped[1], snout[0] - ped[0]))  # image y points down
    if '--level' in sys.argv:  # sheet already level (deep-bodied fish whose mouth sits low: snout-to-peduncle would pitch the fish): axis = horizontal line through the peduncle centre
        ang = 0.0; snout[1] = ped[1]
    # rotate about the snout so the axis is level (PIL rotates counter-clockwise for positive angles)
    def rot_mask(m):
        img = Image.fromarray((m * 255).astype(np.uint8)).rotate(ang, resample=Image.BILINEAR, center=tuple(snout), fillcolor=0)
        return np.asarray(img) > 127
    fullr = rot_mask(full)
    # peduncle in the rotated frame is on the line y = snout_y
    ys_, xs_ = np.nonzero(fullr)
    sx, sy = xs_.max(), snout[1]
    tail_x = xs_.min()
    body = rot_mask(body0)
    bodyB = rot_mask(bodyB0) if bodyB0 is not None else None
    bodyBr = rot_mask(bodyBr0) if bodyBr0 is not None else None
    tb, bb = col_edges(body)
    tbB, bbB = col_edges(bodyB) if bodyB is not None else (tb, bb)
    if bodyBr is not None:
        # first dark row below the axis (a fin hangs below the belly, often with a dark gap or a darker membrane)
        r0 = int(round(sy)); bbB = np.full(W, np.nan)
        for x_ in range(W):
            col = bodyBr[r0:, x_]
            if col.size and col[0]:
                k_ = np.argmin(col) if (~col).any() else col.size
                bbB[x_] = r0 + k_ - 1
    tf, bf = col_edges(fullr)
    # peduncle x again in the rotated frame (narrowest opened column in the same window)
    th = bb - tb
    lo2, hi2 = int(tail_x + 0.12 * (sx - tail_x)), int(tail_x + 0.40 * (sx - tail_x))
    pedx = lo2 + int(np.argmin(np.where(np.isnan(th[lo2:hi2]), 1e9, th[lo2:hi2])))
    if 'ped' in LMK: pedx = int(LMK['ped'][0])
    SL = float(sx - pedx)
    if bodyB is not None:  # back (the dorsal-fin zone, u >= 35 % SL): top edge from the colour mask; head and belly from the shape mask
        xx = np.arange(W)
        tb = np.where((xx < sx - 0.35 * SL) & (xx > sx - float(opts.get("--topend", 0.85)) * SL), tbB, tb)
        # belly: the shape mask swallows the anal / pelvic fin roots, the colour mask loses the red belly stripe. Measure the
        # stripe (shape minus colour edge) where no fin hangs (45-65 % SL) and add it to the colour edge across the fin zone.
        ref = (xx < sx - 0.45 * SL) & (xx > sx - 0.65 * SL)
        delta = float(np.nanmedian((bb - bbB)[ref]))
        zone = (xx < sx - 0.42 * SL) & (xx > sx - 0.97 * SL)
        bb = np.where(zone & ~np.isnan(bbB), np.minimum(bb, bbB + delta), bb)
    if '--landmarks' in opts:  # hand-placed fin bases (side_full px, sheet already level): {"dorsalBase": [[x,y],...], "analBase": [[x,y],...]}
        # the body edge across each median fin's base is the polyline through the points, not whatever the colour or shape mask found
        LM = json.load(open(opts['--landmarks']))
        for key, arr in (('dorsalBase', tb), ('analBase', bb)):
            pts = sorted(LM.get(key, []))
            if len(pts) >= 2:
                px_, py_ = [p_[0] for p_ in pts], [p_[1] for p_ in pts]
                xs_ = np.arange(int(px_[0]), int(px_[-1]) + 1)
                if len(pts) >= 3 and '--nosmooth' not in sys.argv:  # cubic Hermite through the points (finite-difference slopes): no corners at the hand-placed points
                    px, py = np.array(px_, float), np.array(py_, float)
                    m = np.gradient(py, px)
                    i = np.clip(np.searchsorted(px, xs_, side='right') - 1, 0, len(px) - 2)
                    h = px[i + 1] - px[i]; t = (xs_ - px[i]) / h
                    h00, h10, h01, h11 = 2*t**3 - 3*t**2 + 1, t**3 - 2*t**2 + t, -2*t**3 + 3*t**2, t**3 - t**2
                    arr[xs_] = h00 * py[i] + h10 * h * m[i] + h01 * py[i + 1] + h11 * h * m[i + 1]
                    ex_ = tf[xs_] if arr is tb else bf[xs_]   # the spline may not leave the fish mask (overshoot between sparse points)
                    arr[xs_] = np.where(np.isnan(ex_), arr[xs_], np.maximum(arr[xs_], ex_) if arr is tb else np.minimum(arr[xs_], ex_))
                else:
                    arr[xs_] = np.interp(xs_, px_, py_)
    TL = float(sx - tail_x)

    def pct(v):
        return v / SL * 100.0

    stations = list(range(0, 101, 5))
    ts, bs = smooth(tb, 3), smooth(bb, 3)
    top_prof, bot_prof = [], []
    for s in stations:
        x = sx - s / 100.0 * SL
        xi = int(round(min(max(x, 0), W - 1)))
        t = np.interp(x, np.arange(W)[~np.isnan(ts)], ts[~np.isnan(ts)])
        b = np.interp(x, np.arange(W)[~np.isnan(bs)], bs[~np.isnan(bs)])
        top_prof.append(round(float(pct(sy - t)), 2))
        bot_prof.append(round(float(pct(b - sy)), 2))

    # a fin root (pelvic) merged into the belly shows as a one-station spike: replace it by its neighbours' mean
    for i in range(1, len(bot_prof) - 1):
        m_ = (bot_prof[i - 1] + bot_prof[i + 1]) / 2
        if bot_prof[i] - m_ > 3.0 or bot_prof[i] > max(bot_prof[i - 1], bot_prof[i + 1]) + 1.5:
            bot_prof[i] = round(m_, 2)
    # a 2-3 station lump (pelvic fin root) survives the neighbour test: cap each belly value at the 5-station median + 1
    med5 = [sorted(bot_prof[j - 2:j + 3])[2] for j in range(2, len(bot_prof) - 2)]
    for j in range(2, len(bot_prof) - 2):
        bot_prof[j] = round(min(bot_prof[j], med5[j - 2] + 1.0), 2)
    # the anal fin's base hangs below the rear belly and survives as a bulge at 80-95 %: the belly there runs straight from the 75 % value to the peduncle
    i75, i100 = stations.index(75), stations.index(100)
    for j in range(i75 + 1, i100):
        line = bot_prof[i75] + (bot_prof[i100] - bot_prof[i75]) * (stations[j] - 75) / 25.0
        bot_prof[j] = round(min(bot_prof[j], line), 2)
    # --- fins: where the full mask sticks out of the body mask
    def sticks(sign):
        """x ranges where the full mask extends >=3 px beyond the body edge (sign -1 top, +1 bottom)."""
        d = (tb - tf) if sign < 0 else (bf - bb)
        return np.where(np.nan_to_num(d) >= 3)[0], d

    def run(idx, x_lo, x_hi):
        idx = idx[(idx >= x_lo) & (idx <= x_hi)]
        if not len(idx):
            return None
        # largest contiguous run (gaps up to 6 px allowed)
        runs, s0, p = [], idx[0], idx[0]
        for i in idx[1:]:
            if i - p > 6:
                runs.append((s0, p)); s0 = i
            p = i
        runs.append((s0, p))
        return max(runs, key=lambda r: r[1] - r[0])

    di, dd = sticks(-1)
    ai, ad = sticks(+1)
    dr = run(di, pedx - 10, sx)
    ar = run(ai, pedx - 10, sx)

    def u_of(x):  # % SL from the snout
        return round(float((sx - x) / SL * 100), 2)

    fins = {}
    if dr:
        xs_d = np.arange(dr[0], dr[1] + 1)
        h = np.nan_to_num(dd[xs_d])
        fins['dorsal'] = {'baseStartPctSL': u_of(dr[1]), 'baseEndPctSL': u_of(dr[0]),
                          'maxHeightPctSL': round(float(pct(h.max())), 2),
                          'heightProfile': [[u_of(x), round(float(pct(v)), 2)] for x, v in zip(xs_d[::4], h[::4])],
                          'note': 'fin spines are dark/translucent: heights are lower bounds'}
    if ar:
        xs_a = np.arange(ar[0], ar[1] + 1)
        h = np.nan_to_num(ad[xs_a])
        fins['anal'] = {'baseStartPctSL': u_of(ar[1]), 'baseEndPctSL': u_of(ar[0]),
                        'maxHeightPctSL': round(float(pct(h.max())), 2),
                        'heightProfile': [[u_of(x), round(float(pct(v)), 2)] for x, v in zip(xs_a[::4], h[::4])]}
    # caudal: every column left of the peduncle (full mask), top/bottom in % SL from the axis; spans negative u (behind the SL end)
    cx = np.arange(int(tail_x), pedx + 1)
    cau = [[round(float((pedx - x) / SL * 100), 2), round(float(pct(sy - tf[x])), 2), round(float(pct(bf[x] - sy)), 2)]
           for x in cx[::6] if not np.isnan(tf[x])]
    cau.reverse()
    cau_top = [(c[1], c[0]) for c in cau]
    # pelvic: pixels below the body edge in the head half, as one run (belly region)
    pel = None
    if ai is not None:
        pr = run(ai, int(sx - 0.45 * SL) - 0, int(sx - 0.05 * SL))
        if pr:
            xs_p = np.arange(pr[0], pr[1] + 1)
            pel = {'rootPctSL': u_of(pr[1]), 'tipPctSL': u_of(pr[0]),
                   'maxDropPctSL': round(float(pct(np.nan_to_num(ad[xs_p]).max())), 2),
                   'note': 'any fin material under the belly in the head half; pelvic and pectoral are not separable in a side photo'}

    # snout shape sanity: eye (blue pixels)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    eye = np.nonzero((b > 180) & (r < 90) & (g < 90))
    eye_c = None
    if len(eye[0]) > 5:
        ex, ey = eye[1].mean(), eye[0].mean()
        # rotate the point
        t = np.radians(-ang)
        dx, dy = ex - snout[0], ey - snout[1]
        # PIL rotate(ang) is counter-clockwise on screen; y down => screen angle -ang. Use matching transform.
        c, s_ = np.cos(np.radians(ang)), np.sin(np.radians(ang))
        rx, ry = snout[0] + dx * c + dy * s_, snout[1] - dx * s_ + dy * c
        eye_c = {'uPctSL': round(float((sx - rx) / SL * 100), 2), 'tPctSL': round(float((ry - sy) / SL * 100), 2),
                 'rPctSL': round(float(np.sqrt(len(eye[0]) / np.pi) / SL * 100), 2), 'note': 'blue iris pixels only (the dark pupil is excluded)'}

    out = {
        'art': 'orchiddottyback',
        'source': {'file': 'dottyback-ref.png (supplied by Nathan; not in repo)', 'px': [W, H], 'view': 'side, nose right, black background', 'sex': 'unknown'},
        'method': {'threshold': thr, 'openRadiusPx': R, 'script': 'scripts/fish-outline.py', 'rotationDeg': round(float(ang), 2)},
        'anatomy': {
            'slPx': round(SL, 1), 'tlPx': round(TL, 1), 'tlOverSl': round(TL / SL, 3),
            'caudalTipBeyondSlPctSL': round(float((TL - SL) / SL * 100), 2),
            'depthProfile': {'stations': stations, 'top': top_prof, 'bottom': bot_prof,
                             'axis': 'snout tip to peduncle centre, level; values are distance from the axis in % SL; BODY ONLY (opened mask)'},
            'landmarks': {'snoutPx': [round(float(sx), 1), round(float(sy), 1)], 'pedunclePx': [pedx, round(float(sy), 1)],
                          'snoutPxOriginal': [round(float(snout[0]), 1), round(float(snout[1]), 1)],
                          'pedunclePxOriginal': [round(float(snout[0] + (pedx - sx) * np.cos(np.radians(ang))), 1), round(float(snout[1] + (pedx - sx) * np.sin(np.radians(ang))), 1)],
                          'eye': eye_c},
            'fins': {**fins, 'pelvicOrPectoral': pel,
                     'caudal': {'type': 'round', 'tipUPctSL': round(float((tail_x - pedx) / SL * 100), 2),
                                'outline': cau, 'outlineCols': '[u % SL from the peduncle (negative = behind), top, bottom] distance from the axis in % SL; full mask',
                                }},
        },
        'reliability': {
            'body': 'good: the fish is bright magenta on pure black; body edge is the opened mask, +-1-2 px (~0.4 % SL)',
            'dorsalFin': 'poor: spines are dark/white and read as holes or thin streaks; heights are lower bounds, the base start/end are +-3 % SL',
            'caudal': 'fair: bright magenta fan is solid, but the black-white tuft above it (an upper-lobe marking) is partly lost',
            'analPelvic': 'fair: membrane is solid red-magenta but the base is merged with the body by the opening',
            'eyeSnout': 'good',
        },
    }
    json.dump(out, open(outp, 'w'), indent=1)

    # optional debug picture: rotated full mask (white), body (green edges), SL axis (red line), stations
    if '--debug' in opts:
        dbg = np.zeros((H, W, 3), np.uint8)
        dbg[fullr] = (70, 70, 70)
        dbg[body] = (130, 130, 160)
        for x in range(W):
            for t in (tb[x], bb[x]):
                if not np.isnan(t):
                    dbg[int(t), x] = (0, 255, 0)
        dbg[int(round(sy)), :, :] = (255, 0, 0)
        for s in stations:
            x = int(round(sx - s / 100 * SL)); dbg[int(sy) - 3:int(sy) + 4, min(max(x, 0), W - 1)] = (255, 255, 0)
        Image.fromarray(dbg).save(opts['--debug'])
    # machine-readable edge dump for the overlay step
    print(json.dumps({'SLpx': SL, 'TLpx': TL, 'TL/SL': round(TL / SL, 3), 'rot': round(float(ang), 2), 'pedx': int(pedx), 'sx': int(sx), 'sy': float(sy),
                      'top': top_prof, 'bot': bot_prof, 'dorsal': {k: fins['dorsal'][k] for k in ('baseStartPctSL', 'baseEndPctSL', 'maxHeightPctSL')} if dr else None,
                      'anal': {k: fins['anal'][k] for k in ('baseStartPctSL', 'baseEndPctSL', 'maxHeightPctSL')} if ar else None}))


if __name__ == '__main__':
    main()
