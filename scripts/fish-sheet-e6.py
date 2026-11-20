"""E6: where should the loft's thickness come from?  python -I scripts/fish-sheet-e6.py [--csv out.csv] SHEET:SPECIES ...
Method doc: research/fish-model-sheet-method.md section 3 step E; results: research/fish-sheet-methodology-audit.md section 5.

For each 3-view sheet it measures the side panel (body depth, fins opened away, peduncle) and the top panel (width profile), builds the
loft's cross-sections exactly as src/render/fish3d.ts sections() does (superellipse exponent 2.4, INSET 0.006; no belly/wide/headW options),
and reports body mass (volume x 1.02 g/cm3, fins excluded, as scripts/body-volume.ts) against FishBase a*TL^b for four thickness rules:
  a  thickfit      least-squares fit of the app's thick/pedT to the top-panel widths (scripts/fish-thickfit.py; pedT <= 0.3)
  b  measured      the top-panel width profile as drawn (?mw=1)
  c  rescaled      the top-panel profile scaled so its maximum = the real max width % SL (shape kept); no real width -> depth x class prior
  d  mass-matched  the (b) shape scaled so mass = 1.00 x FishBase (needs no width data)
Units are total lengths (card width 1 = TL). Needs numpy + PIL only."""
import argparse, importlib.util, math, os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('audit', os.path.join(HERE, 'fish-sheet-audit.py'))
A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)

EXP, INSET, DENS = 2.4, 0.006, 1.02
SUPER = 4 * math.gamma(1 + 1 / EXP) ** 2 / math.gamma(1 + 2 / EXP)       # area of |x|^e+|y|^e=1 is SUPER (x1 x semi-axes)
# species: TL mm (species.json), FishBase a,b (scripts/lw-sources.json), real max width %SL (+ range), real max depth %SL, class width/depth prior
SP = {
    'oscar': dict(tl=300, a=0.03162, b=3.02, w=21.5, wr=(20, 23), prior=0.46),
    'clownfish': dict(tl=100, a=0.01445, b=3.0, w=None, wr=None, prior=0.50),
    'pleco': dict(tl=380, a=0.01479, b=2.98, w=30.0, wr=(27.5, 33), prior=1.45),
}


def opened(m, r):
    im = Image.fromarray((m * 255).astype(np.uint8))
    k = 2 * r + 1
    return np.asarray(im.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))) > 127


def panels(lit):
    pb = A.bands(lit.sum(1))
    while len(pb) < 3 and pb:
        i = max(range(len(pb)), key=lambda q: pb[q][1] - pb[q][0]); y0, y1 = pb[i]
        lo, hi = y0 + (y1 - y0) // 5, y1 - (y1 - y0) // 5
        r = lo + int(np.argmin(lit.sum(1)[lo:hi])); lit[r - 2:r + 3] = False; pb = A.bands(lit.sum(1))
    assert len(pb) == 3, pb
    out = []
    for y0, y1 in pb:
        cols = np.flatnonzero(lit[y0:y1].sum(0) >= 2); lit[y0:y1] = A.fill_holes(lit[y0:y1]); out.append((int(cols[0]), y0, int(cols[-1]) + 1, y1))
    return out


def measure(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    lit = a.max(2) > A.THRESH
    (sx0, sy0, sx1, sy1), (tx0, ty0, tx1, ty1), _ = panels(lit)
    Ls, Lt = sx1 - sx0, tx1 - tx0; k = Ls / Lt
    side = lit[sy0:sy1, sx0:sx1]; top = lit[ty0:ty1, tx0:tx1]
    so = opened(side, max(3, int(0.012 * Ls)))
    dep = np.zeros(Ls); cen = np.zeros(Ls)
    for x in range(Ls):
        r = A.longest_run(so[:, x])
        if r: dep[x] = r[1] - r[0] + 1; cen[x] = (r[0] + r[1]) / 2
    # peduncle: narrowest opened column 12-32 % of the length from the tail tip
    lo, hi = int(0.12 * Ls), int(0.32 * Ls); xp = lo + int(np.argmin(dep[lo:hi])); pedU = xp / Ls
    wid = np.zeros(Lt); mid = (ty1 - ty0) // 2
    for x in range(Lt):
        r = A.run_containing(top[:, x], mid) if top[:, x].any() else None
        if r: wid[x] = (r[1] - r[0] + 1) * k
    return Ls, dep, pedU, wid


def loft_mass(u, hv, t, tl):
    """u (0..1 from the tail tip), half-depth hv, half-thickness t (card units) -> grams."""
    hv = np.maximum(0, hv - INSET); area = SUPER * hv * t
    vol = float(np.sum((area[1:] + area[:-1]) / 2 * np.diff(u)))
    return vol * (tl / 10) ** 3 * DENS


def fit_thick(u, hv, tm, pedU, pmax=0.3):
    s = (u - pedU) / (1 - pedU); maxhv = hv.max(); best = None
    base = 0.35 * hv + 0.65 * maxhv * np.sin(np.minimum(1, hv / maxhv) * np.pi / 2)
    for th in np.linspace(0.2, 3.2, 301):
        for pt in np.linspace(0, pmax, 31):
            t = th * base * (pt + (1 - pt) * np.sqrt(np.clip(s, 0, 1)))
            e = np.sqrt(np.mean((t - tm)[1:-1] ** 2))
            if best is None or e < best[0]: best = (e, th, pt)
    th, pt = best[1], best[2]
    return th * base * (pt + (1 - pt) * np.sqrt(np.clip(s, 0, 1))), th


def run(path, species):
    S = SP[species]; Ls, dep, pedU, wid = measure(path)
    ped = int(pedU * Ls); xs = np.arange(ped, Ls)
    u = xs / Ls; hv = dep[xs] / 2 / Ls
    # top panel runs tail..snout in its own columns; resample to the side's columns (lengths already rescaled by k)
    wu = np.interp(xs, np.arange(len(wid)) * Ls / len(wid), wid) / Ls          # full width, card units
    win = max(3, int(0.04 * Ls)); pad = np.pad(wu, win, mode='edge')
    mn = np.array([pad[i:i + 2 * win + 1].min() for i in range(len(wu) + 2 * win)]); mp = np.pad(mn, win, mode='edge')
    wo = np.array([mp[i:i + 2 * win + 1].max() for i in range(len(wu) + 2 * win)])[win:win + len(wu)]
    ts = np.where(np.arange(len(wu)) < 0, 0, 1.0)
    half = wu / 2
    tl = S['tl'] / 10; fb = S['a'] * tl ** S['b']
    SLc = 1 - pedU; K = 1 / SLc                                                  # sheet's own total/standard length
    t_a, _ = fit_thick(u, hv, half, pedU)
    t_b = np.maximum(0, half - INSET * 0.5)
    if S['w']:
        target = S['w'] / 100 / 2 * SLc; how = 'real'
    else:
        target = S['prior'] * 2 * hv.max() / 2; how = 'depth x prior'          # half width = prior x full depth / 2
    t_c = half * (target / (wo.max() / 2))
    m = {n: loft_mass(u, hv, t, S['tl']) for n, t in (('a', t_a), ('b', t_b), ('c', t_c))}
    f = fb / m['b']; t_d = half * f; m['d'] = loft_mass(u, hv, np.maximum(0, t_d - INSET * 0.5), S['tl'])
    return dict(path=path, species=species, K=K, fb=fb, ratio={n: m[n] / fb for n in m}, maxw=wo.max(), wd=wo.max() * f / SLc * 100, wc=wo.max() * (target / (wo.max() / 2)) / SLc * 100, wmassa=0, wsl=wo.max() / SLc * 100, depth_sl=2 * hv.max() / SLc * 100, how=how)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('items', nargs='+'); ap.add_argument('--csv')
    a = ap.parse_args(); rows = []
    for it in a.items:
        p, sp = it.rsplit(':', 1); r = run(p, sp); rows.append(r)
        print(f"{sp:10s} {os.path.basename(os.path.dirname(p))}/{os.path.basename(p):18s} TL/SL {r['K']:.2f} width {r['wsl']:.1f}%SL depth {r['depth_sl']:.1f}%SL "
              f"max w/L {r['maxw']:.3f} FishBase {r['fb']:.0f} g | mass/FishBase  a {r['ratio']['a']:.2f}  b {r['ratio']['b']:.2f}  c {r['ratio']['c']:.2f} ({r['how']})  d {r['ratio']['d']:.2f} (width {r['wd']:.1f}%SL)")
    for sp in dict.fromkeys(r['species'] for r in rows):
        for n in 'abcd':
            v = np.array([r['ratio'][n] for r in rows if r['species'] == sp])
            print(f"summary {sp:10s} rule {n}: mean {v.mean():.2f} range {v.min():.2f}-{v.max():.2f} spread (max/min) {v.max() / v.min():.2f}")
    if a.csv:
        import csv
        with open(a.csv, 'w', newline='') as fh:
            w = csv.writer(fh); w.writerow(['sheet', 'species', 'tl_sl', 'width_pct_sl', 'depth_pct_sl', 'maxw_len', 'fishbase_g', 'a', 'b', 'c', 'd'])
            for r in rows: w.writerow([r['path'], r['species'], f"{r['K']:.3f}", f"{r['wsl']:.1f}", f"{r['depth_sl']:.1f}", f"{r['maxw']:.3f}", f"{r['fb']:.0f}"] + [f"{r['ratio'][n]:.3f}" for n in 'abcd'])
