#!/usr/bin/env python3
"""Fin opacity maps for a build-B photo fish (method row 61; review "Method B: fin transparency", 2026-11-24).
  python -I scripts/fish-fin-opacity.py <id> [--profile '<json>'] [--debug <dir>]
Reads shots/<id>-card.png (body card: alpha = coverage only), shots/<id>-fincard.png (paired fins' source), the built
src/data/fishart/<id>.anatomy.json and research/fish-specs/<id>.json; writes public/art/fish/<id>-op.webp (median fins, aligned
with the body card) and <id>-finop.webp (paired fins, aligned with the fin card). Grey = material opacity; the card's own alpha
stays the coverage (the silhouette), so the outline never moves when a fin gets clearer (src/render/textures.ts finMaterial).

Opacity per fin pixel = membrane(g) + (rays(g) - membrane(g)) x ray confidence, g = 0 at the fin root .. 1 at its edge, each of
membrane / rays a [root, tip] pair from the spec's fin_opacity (per fin type: dorsal, anal, caudal, pectoral, pelvic; 'all' for
every fin) over the defaults below. Ray confidence is continuous (0..1), from the sheet's own painted rays: line strength from the
Hessian at two scales, |largest eigenvalue| - |smaller| so bright and dark lines count the same, kept where the line runs along the
fin's root-to-edge direction (rays) and dropped where it runs across it (bands, folds, the edge). Pigment (stage 5) is not modelled.
The body (the measured depth profile) stays 1 and the fins ease in from it over 3 % SL, so the root never shows a seam."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

EASE = 0.03   # share of SL over which a median fin eases in from the body
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
DEFAULTS = {   # [root, tip] opacity; rays are the painted ray lines, membrane the tissue between them
    'dorsal': {'membrane': [0.75, 0.4], 'rays': [0.95, 0.75]},
    'anal': {'membrane': [0.75, 0.4], 'rays': [0.95, 0.75]},
    'caudal': {'membrane': [0.7, 0.35], 'rays': [0.95, 0.7]},
    'pectoral': {'membrane': [0.55, 0.3], 'rays': [0.85, 0.6]},
    'pelvic': {'membrane': [0.75, 0.45], 'rays': [0.95, 0.75]},
}


def profiles(spec_fo):
    fo = spec_fo if isinstance(spec_fo, dict) else {}
    out = {}
    for k, d in DEFAULTS.items():
        p = dict(d); p.update(fo.get('all', {})); p.update(fo.get(k, {})); out[k] = p
    return out


def lerp(p, g): return p[0] + (p[1] - p[0]) * g


def ray_confidence(rgb, region, expect, debug=None, cov=None):
    """rgb: HxWx3 float 0..1; region: bool mask of fin pixels; expect: (ex, ey) unit root-to-edge direction per pixel."""
    L = rgb @ np.array([0.2126, 0.7152, 0.0722])
    if cov is not None:   # fill the background with the nearest fin colour first: the fin-to-black step at the outline read as a ray along the edge
        inside = cov > 0.5
        idx = nd.distance_transform_edt(~inside, return_distances=False, return_indices=True); L = L[idx[0], idx[1]]
    best = np.zeros(L.shape); bdx = np.zeros(L.shape); bdy = np.zeros(L.shape)
    for s in (1.2, 2.2):   # rays are 2-5 px wide on a 1024 px card
        hxx = nd.gaussian_filter(L, s, order=(0, 2)) * s * s; hyy = nd.gaussian_filter(L, s, order=(2, 0)) * s * s; hxy = nd.gaussian_filter(L, s, order=(1, 1)) * s * s
        tmp = np.sqrt((hxx - hyy) ** 2 + 4 * hxy ** 2); l1 = (hxx + hyy + tmp) / 2; l2 = (hxx + hyy - tmp) / 2
        big1 = np.abs(l1) >= np.abs(l2)
        r = np.where(big1, np.abs(l1) - np.abs(l2), np.abs(l2) - np.abs(l1))   # anisotropy: a line, not a spot (speckle, highlights)
        th = 0.5 * np.arctan2(2 * hxy, hxx - hyy)   # direction of l1's eigenvector (the across-line normal when l1 is the big one)
        th = np.where(big1, th, th + np.pi / 2) + np.pi / 2   # along the line
        m = r > best; best = np.where(m, r, best); bdx = np.where(m, np.cos(th), bdx); bdy = np.where(m, np.sin(th), bdy)
    cosang = np.abs(bdx * expect[0] + bdy * expect[1])
    w = np.clip((cosang - 0.3) / 0.45, 0, 1); w = w * w * (3 - 2 * w)   # along the rays (within ~45 deg) full, across them (bands, folds) none
    p90 = np.percentile(best[region], 90) if region.any() else 1.0
    c = np.clip((best / max(p90, 1e-6) - 0.15) / 0.75, 0, 1) * w
    c = nd.gaussian_filter(c, 0.7) * region
    if debug is not None: debug['strength'] = np.clip(best / max(p90, 1e-6), 0, 1); debug['along'] = w
    return np.clip(c, 0, 1)


def ring(op, cov):
    """Outside the coverage the map is read only by the stand-out line (lighting.ts AQ_MAP): there it carries half way between the nearest
    fin pixel's opacity and 1, so a clear fin's line is fainter than a solid one's but never gone."""
    inside = cov > 0.02
    if not inside.any(): return op
    idx = nd.distance_transform_edt(~inside, return_distances=False, return_indices=True)
    near = op[idx[0], idx[1]]
    return np.where(inside, op, 0.5 + 0.5 * near)


def main():
    ID = sys.argv[1]
    opt = {a: sys.argv[i + 2] for i, a in enumerate(sys.argv[1:-1]) if a.startswith('--')}
    spec = json.load(open(os.path.join(ROOT, 'research', 'fish-specs', ID + '.json'), encoding='utf8'))
    P = profiles(json.loads(opt['--profile']) if '--profile' in opt else spec.get('fin_opacity'))
    A = json.load(open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), encoding='utf8'))['anatomy']
    R = A['render']['photo']
    card = np.asarray(Image.open(os.path.join(ROOT, 'shots', ID + '-card.png')).convert('RGBA')).astype(float) / 255
    H, W = card.shape[:2]; cov = card[..., 3]; SLc = 1022 / A['tlOverSl']; ys = np.arange(H)
    dbg = {} if '--debug' in opt else None

    # --- median fins on the body card ---
    d = A['depthProfile']; body = np.zeros((H, W), bool)
    for x in range(W):
        sp = (1022 - x) / SLc * 100
        if 0 <= sp <= 100:
            t = np.interp(sp, d['stations'], d['top']) / 100 * SLc; b = np.interp(sp, d['stations'], d['bottom']) / 100 * SLc
            body[:, x] = (ys >= H / 2 - t - 1) & (ys <= H / 2 + b + 1)
    TL = R['sl'] * A['tlOverSl']; X = lambda x: W - (R['sx'] - x) * W / TL; Y = lambda y: H / 2 + (y - R['ax']) * W / TL
    if R.get('stalkEdge'):   # the flesh-to-tail-fin line from the fin map (fish-stalk-edge.py): body in front of it, fin behind it, row by row
        cx = np.array([X(p[0]) for p in R['stalkEdge']]); cy = np.array([Y(p[1]) for p in R['stalkEdge']]); xr = int(0.12 * SLc)
        for y in range(H):
            if cy[0] <= y <= cy[-1]:
                e_ = int(round(np.interp(y, cy, cx))); body[y, :max(0, e_)] = False; body[y, max(0, e_):e_ + xr] |= cov[y, max(0, e_):e_ + xr] > 0.5
            else: body[y, :int(cx.min())] = False
    body &= cov > 0.5
    body = nd.binary_dilation(body, iterations=3)   # a 3 px solid rim: the fin root never shows a seam
    fin = (cov > 0.02) & ~body
    db = nd.distance_transform_edt(~body); de = nd.distance_transform_edt(cov > 0.5)
    g = np.clip(db / np.maximum(db + de, 1e-6), 0, 1)
    sm = nd.gaussian_filter(db, 6); gy, gx = np.gradient(sm); n = np.hypot(gx, gy) + 1e-9   # root-to-edge: away from the body
    conf = ray_confidence(card[..., :3], fin, (gx / n, gy / n), dbg, cov)
    xped = 1022 - SLc
    kind = np.where(np.arange(W)[None, :] < xped - 0.01 * SLc, 'caudal', np.where(ys[:, None] < H / 2, 'dorsal', 'anal'))
    op = np.ones((H, W))
    for k in ('dorsal', 'anal', 'caudal'):
        m = fin & (kind == k)
        mem, ray = lerp(P[k]['membrane'], g[m]), lerp(P[k]['rays'], g[m])
        op[m] = mem + (ray - mem) * conf[m]
    e = np.clip(db / np.maximum(1.0, EASE * SLc + 0.3 * (db + de)), 0, 1); e = e * e * (3 - 2 * e)   # and over 30 % of the fin's own root-to-edge length, so a long tail eases in gently (Nathan 2026-11-24: "merge transition ... not as jarring")   # ease in from the body (a hard switch drew a seam; 6 % SL kept a convict's short spiny dorsal solid)
    op = 1 - e * (1 - op)
    op = ring(op, cov)
    out = os.path.join(ROOT, 'public', 'art', 'fish')
    Image.fromarray(np.round(op * 255).astype(np.uint8), 'L').save(os.path.join(out, ID + '-op.webp'), lossless=True)

    # --- paired fins on the fin card (their polygons in card px; same mapping as photofish.ts cv()) ---
    fc_path = os.path.join(ROOT, 'shots', ID + '-fincard.png')
    fc = np.asarray(Image.open(fc_path).convert('RGBA')).astype(float) / 255 if os.path.exists(fc_path) else card
    fop = np.full((H, W), 0.75)
    from PIL import ImageDraw
    for k, key in (('pectoral', 'pec'), ('pelvic', 'pelvic')):
        f = R.get(key)
        if not f or not f.get('poly'): continue
        poly = [(X(x), Y(y)) for x, y in f['poly']]; root = (X(f['root'][0]), Y(f['root'][1]))
        mk = Image.new('L', (W, H), 0); ImageDraw.Draw(mk).polygon(poly, fill=255); m = np.asarray(mk) > 0
        if not m.any(): continue
        yy, xx = np.nonzero(m); dr = np.hypot(xx - root[0], yy - root[1]); gk = np.zeros((H, W)); gk[yy, xx] = dr / max(dr.max(), 1)
        ex = np.zeros((H, W)); ey = np.zeros((H, W)); ex[yy, xx] = (xx - root[0]) / np.maximum(dr, 1); ey[yy, xx] = (yy - root[1]) / np.maximum(dr, 1)
        cf = ray_confidence(fc[..., :3], m, (ex, ey), cov=fc[..., 3])
        mem, ray = lerp(P[k]['membrane'], gk[m]), lerp(P[k]['rays'], gk[m])
        fop[m] = mem + (ray - mem) * cf[m]
    Image.fromarray(np.round(fop * 255).astype(np.uint8), 'L').save(os.path.join(out, ID + '-finop.webp'), lossless=True)

    if dbg is not None:
        dd = opt['--debug']; os.makedirs(dd, exist_ok=True)
        Image.fromarray(np.round(conf * 255).astype(np.uint8)).save(os.path.join(dd, ID + '-rays.png'))
        Image.fromarray(np.round(op * 255).astype(np.uint8)).save(os.path.join(dd, ID + '-op.png'))
        Image.fromarray(np.round(fop * 255).astype(np.uint8)).save(os.path.join(dd, ID + '-finop.png'))
        Image.fromarray(np.round(dbg['strength'] * 255).astype(np.uint8)).save(os.path.join(dd, ID + '-strength.png'))
    fm = fin & (e > 0.99)
    print('opacity', ID, 'median fins: mean %.2f, rays %.0f %% of fin px (conf > 0.5)' % (op[fm].mean() if fm.any() else 1, 100 * (conf[fin] > 0.5).mean() if fin.any() else 0))


if __name__ == '__main__':
    main()
