#!/usr/bin/env python3
"""E5 arm (c): automatic landmarks for a 3-view sheet -> a fish-build.py spec (sheet px).
  python -I scripts/fish-autolandmarks.py SHEET.png out-spec.json [--id ID --name N --sci S --tl MM] [--debug dbg.png]
Method (numpy + Pillow only; fish faces right, side panel = first band):
  mask      max channel > 40, largest blob, holes filled
  ped       column of least mask thickness in 15-40 % of the length from the tail end
  eye       darkest compact roundish blob inside the mask, front 30 % of the length, above the axis
  fin rays  structure-tensor COHERENCE (rays are one-direction texture, scales are not) inside the mask
  dorsal / anal base   per column, scan from the top (bottom) edge inward while coherence stays high; the stop row is the base;
            the longest run of columns with a fin taller than 3 % SL gives the polyline
  pectoral  coherent blob in the mid-body zone 18-42 % SL behind the snout; root = its front edge, tips = back and top/bottom extremes
  pelvic    coherent blob whose lower part is outside the (anal-line) belly, 25-50 % SL behind the snout
Every step can fail on a given sheet; failed landmarks are left out and listed in 'auto_failed'."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw


def box(a, k):
    k = int(k) | 1
    p = k // 2
    c = np.cumsum(np.pad(a, ((p + 1, p), (0, 0)), mode='edge'), 0)
    a = (c[k:] - c[:-k]) / k
    c = np.cumsum(np.pad(a, ((0, 0), (p + 1, p)), mode='edge'), 1)
    return (c[:, k:] - c[:, :-k]) / k


def blobs(m):
    """4-connected components, no scipy: iterative label via flood fill on a small grid"""
    lab = np.zeros(m.shape, np.int32)
    n = 0
    H, W = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        n += 1
        st = [(y0, x0)]
        lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    st.append((yy, xx))
    return lab, n


def main():
    a = sys.argv
    out = a[2]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    im = Image.open(a[1]).convert('RGB')
    rgb = np.asarray(im).astype(np.float32)
    mx = rgb.max(2)
    on = mx > 40
    rows = np.nonzero(on.any(1))[0]
    bands = []
    s = p = rows[0]
    for r in rows[1:]:
        if r - p > 3:
            bands.append((s, p))
            s = r
        p = r
    bands.append((s, p))
    bands = [b for b in bands if b[1] - b[0] > 30]
    y0, y1 = bands[0]
    y0 = max(0, y0 - 6)
    y1 += 6
    sub = rgb[y0:y1]
    M = on[y0:y1]
    H, W = M.shape
    # largest blob only (downscaled labelling for speed)
    ds = 4
    lab, n = blobs(M[::ds, ::ds])
    big = np.argmax(np.bincount(lab.ravel())[1:]) + 1
    keep = np.kron(lab == big, np.ones((ds, ds), bool))[:H, :W] & M
    M = keep
    cols = np.nonzero(M.any(0))[0]
    xs_, xt_ = cols.max(), cols.min()
    L = float(xs_ - xt_)
    thick = M.sum(0).astype(np.float32)
    top = np.array([np.argmax(M[:, x]) if M[:, x].any() else 0 for x in range(W)], np.float32)
    bot = np.array([H - 1 - np.argmax(M[::-1, x]) if M[:, x].any() else 0 for x in range(W)], np.float32)
    fail = []
    # ---- peduncle
    th = np.convolve(thick, np.ones(9) / 9, 'same')
    lo, hi = int(xt_ + .15 * L), int(xt_ + .40 * L)
    px = lo + int(np.argmin(th[lo:hi]))
    py = (top[px] + bot[px]) / 2
    # ---- coherence map
    g = np.asarray(Image.fromarray(sub.mean(2).astype(np.uint8)).resize((W, H)), np.float32)
    g = box(g, 3)
    gy, gx = np.gradient(g)
    kk = max(9, int(L / 70))
    Jxx, Jyy, Jxy = box(gx * gx, kk), box(gy * gy, kk), box(gx * gy, kk)
    en = Jxx + Jyy
    coh = np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (en + 1e-3)
    from numpy import arctan2
    th_ = 0.5 * arctan2(2 * Jxy, Jxx - Jyy)  # gradient orientation; 0 = gradient horizontal = vertical rays
    inner = M.copy()
    for _ in range(4):
        inner = inner & np.roll(inner, 1, 0) & np.roll(inner, -1, 0) & np.roll(inner, 1, 1) & np.roll(inner, -1, 1)
    coh = np.where(inner & (en > 4), coh, 0.0)
    ax = py
    # ---- eye
    dark = (box((sub.max(2) < 70).astype(np.float32), 5) > .5) & inner
    dark &= box(dark.astype(np.float32), 25) < .6
    dark[:, :int(xs_ - .30 * L)] = False
    dark[int(ax):, :] = False
    lab, n = blobs(dark[::2, ::2])
    best = None
    for i in range(1, n + 1):
        yy, xx = np.nonzero(lab == i)
        if len(yy) < 12:
            continue
        w_, h_ = xx.max() - xx.min() + 1, yy.max() - yy.min() + 1
        fill = len(yy) / (np.pi / 4 * w_ * h_)
        rnd = min(w_, h_) / max(w_, h_)
        sc = fill * rnd * min(len(yy), 400)
        if rnd > .8 and fill > .8 and len(yy) >= 30 and (best is None or sc > best[0]):
            best = (sc, xx.mean() * 2, yy.mean() * 2, np.sqrt(len(yy) * 4 / np.pi))
    eye = None
    if best:
        eye = [round(best[1]), round(best[2] + y0), round(best[3] * 1.8)]
    else:
        fail.append('eye')
        eye = [round(xs_ - .09 * L), round(ax + y0 - .07 * L), round(.03 * L)]  # prior so the build can run; listed in auto_failed

    # ---- dorsal / anal bases
    def base(sign):
        edge = top if sign < 0 else bot
        x_a, x_b = int(xt_ + .12 * L), int(xs_ - .12 * L)
        zone = range(x_a, x_b)
        fr = []
        for x in zone:
            e = int(edge[x])
            col = coh[:, x] * (np.abs(th_[:, x]) < 1.0)  # rays within ~57 deg of vertical
            col = np.convolve(col, np.ones(7) / 7, 'same')
            fr.append((x, e, col))
        strip = np.median([c[e + (12 if sign < 0 else -12)] for x, e, c in fr if 14 < e < H - 14])
        core = np.median(coh[int(ax - .05 * L):int(ax + .05 * L), int(xs_ - .55 * L):int(xs_ - .45 * L)][en[int(ax - .05 * L):int(ax + .05 * L), int(xs_ - .55 * L):int(xs_ - .45 * L)] > 4]) if True else 0
        t = .5 * (strip + core)
        ys = {}
        for x, e, c in fr:
            y = e + (12 if sign < 0 else -12)
            step = 1 if sign < 0 else -1
            low = 0
            while 0 < y < H - 1 and low < 10:
                low = low + 1 if c[y] < t else 0
                y += step
            ys[x] = y - step * 10
        xs = np.array(list(ys))
        yv = np.array([ys[x] for x in xs], np.float32)
        yv = np.array([np.median(yv[max(0, i - 6):i + 7]) for i in range(len(yv))])
        ed = edge[xs[0]:xs[-1] + 1]
        h = np.abs(yv - ed)
        tall = h > .03 * L
        # longest run of tall columns
        best_ = (0, 0, 0)
        i = 0
        while i < len(tall):
            if tall[i]:
                j = i
                while j < len(tall) and tall[j]:
                    j += 1
                if j - i > best_[0]:
                    best_ = (j - i, i, j)
                i = j
            else:
                i += 1
        if best_[0] < .08 * L:
            return None
        i0, i1 = best_[1], best_[2] - 1
        sel = np.linspace(i1, i0, 5).astype(int)  # front (high x) to back
        return [[int(xs[i]), int(yv[i] + y0)] for i in sel]
    dorsal = base(-1)
    anal = base(+1)
    if dorsal is None:
        fail.append('dorsal')
    if anal is None:
        fail.append('anal')

    # ---- paired fins: coherent blobs in the mid-body zone
    def blob(xa, xb, ya, yb, thr_pct=70):
        sub_c = coh[int(ya):int(yb), int(xa):int(xb)]
        v = sub_c[sub_c > 0]
        if v.size < 50:
            return None
        t = np.percentile(v, thr_pct)
        m = sub_c > t
        lab, n = blobs(m[::2, ::2])
        if n == 0:
            return None
        k = np.argmax(np.bincount(lab.ravel())[1:]) + 1
        yy, xx = np.nonzero(lab == k)
        yy, xx = yy * 2 + int(ya), xx * 2 + int(xa)
        if len(yy) < 80:
            return None
        return xx, yy
    pec = pel = None
    b = blob(xs_ - .42 * L, xs_ - .16 * L, ax - .02 * L, bot[int(xs_ - .3 * L)] - .02 * L)
    if b:
        xx, yy = b
        r = np.argsort(-xx)[:max(5, len(xx) // 15)]
        root = [xx[r].mean(), yy[r].mean()]
        f = np.argsort(xx)[:max(5, len(xx) // 30)]
        far = [xx[f].mean(), yy[f].mean()]
        ex = np.argsort(yy)[:max(5, len(xx) // 30)] if abs(root[1] - yy.min()) > abs(root[1] - yy.max()) else np.argsort(-yy)[:max(5, len(xx) // 30)]
        oth = [xx[ex].mean(), yy[ex].mean()]
        poly = [[round(root[0]), round(root[1] + y0)], [round(far[0]), round(far[1] + y0)], [round(oth[0]), round(oth[1] + y0)]]
        pec = {'root': poly[0], 'poly': poly, 'spread': 1.0}
    else:
        fail.append('pectoral')
    xa, xb = int(xs_ - .50 * L), int(xs_ - .22 * L)
    belly = np.median(bot[int(xt_ + .45 * L):int(xs_ - .55 * L)]) if anal else bot[int(xs_ - .4 * L)]
    belly = float(np.median(bot[xa:xb]))
    ybe = int(belly - .015 * L)
    b = blob(xa, xb, ybe - 0.1 * L, H - 2, 55)
    if b:
        xx, yy = b
        r = np.argsort(-xx)[:max(5, len(xx) // 15)]
        root = [xx[r].mean(), yy[r].mean()]
        f = np.argmax(np.hypot(xx - root[0], yy - root[1]))
        far = [xx[f], yy[f]]
        o = np.argmax(np.abs((xx - root[0]) * (far[1] - root[1]) - (yy - root[1]) * (far[0] - root[0])))
        oth = [xx[o], yy[o]]
        poly = [[round(root[0]), round(root[1] + y0)], [round(far[0]), round(far[1] + y0)], [round(oth[0]), round(oth[1] + y0)]]
        ln = round(max(np.hypot(p[0] - poly[0][0], p[1] - poly[0][1]) for p in poly))
        pel = {'root': poly[0], 'len': ln, 'poly': poly}
    else:
        fail.append('pelvic')

    spec = {'id': opt('--id', 'fish'), 'sheet': a[1], 'species': {'name': opt('--name', 'Fish'), 'sci': opt('--sci', ''), 'tl': float(opt('--tl', 100))},
            'landmarks': {'ped': [int(px), int(py + y0)], 'dorsalBase': dorsal or [], 'analBase': anal or []}, 'measured_width': True, 'plan': 'oscar'}
    if eye:
        spec['eye'] = eye
    if pec:
        spec['pectoral'] = pec
    if pel:
        spec['pelvic'] = pel
        xsx = [p[0] for p in pel['poly']]
        ysy = [p[1] for p in pel['poly']]
        spec['erase'] = [[min(xsx) - 15, min(ysy) - 15, max(xsx) + 15, max(ysy) + 15]]
    spec['auto_failed'] = fail
    json.dump(spec, open(out, 'w'), indent=1)
    if '--debug' in a:
        d = im.copy()
        dr = ImageDraw.Draw(d)
        for key, c in (('dorsalBase', (255, 255, 0)), ('analBase', (0, 255, 0))):
            if len(spec['landmarks'][key]) > 1:
                dr.line([tuple(q) for q in spec['landmarks'][key]], fill=c, width=3)
        dr.ellipse([px - 6, py + y0 - 6, px + 6, py + y0 + 6], outline=(255, 0, 255), width=3)
        if eye:
            dr.ellipse([eye[0] - eye[2], eye[1] - eye[2], eye[0] + eye[2], eye[1] + eye[2]], outline=(0, 255, 255), width=2)
        if pec:
            dr.polygon([tuple(q) for q in pec['poly']], outline=(255, 0, 0))
        if pel:
            dr.polygon([tuple(q) for q in pel['poly']], outline=(0, 128, 255))
        d.crop((0, 0, d.width, y1)).save(opt('--debug'))
    print(out, 'failed:', fail)


main()
