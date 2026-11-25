#!/usr/bin/env python3
"""Lane PT (R151): cut the ChatGPT leaf sheets into the plants' shared leaf atlas. Deterministic (no randomness).

  python scripts/plant-leaves.py [--sheets C:/Users/nreed/fish-sheets/plants] [--types crypt,grass,carpet]
                                 [--synth] [--debug DIR]

Per type it reads <sheets>/<type>-d1.png (a leaf on pure white, see research/plant-sheets/prompts/leaf-sheet.md), or,
when that file is missing (or with --synth), draws a striped TEST sheet so the plumbing can be checked: horizontal
colour bands (a leaf turned upside down shows at once), a red dot left of the midrib (a mirrored leaf shows), a bold
midrib. Sheet -> leaves found against white (threshold + soft edge, colour pushed out into the edge so no white fringe
shows) -> each cropped, its midrib straightened to vertical and centred -> stretched into a fixed atlas cell (the leaf
fills the cell's width less a small inset, tip at the top, base / stalk at the bottom) -> shelf-packed into
public/art/plants/leaves.png (or leaves.webp with --webp), and src/data/plantart/leaves.json (cells in uv, v up; mean linear colours).

Needs numpy, scipy (labels, distance transform) and PIL. A leaf is fixed through its sheet and a rebuild, never by
hand-editing the atlas or the json.
"""
import argparse, json, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'art', 'plants')
OUT_JSON = os.path.join(ROOT, 'src', 'data', 'plantart', 'leaves.json')
GUT = 4            # gutter round every atlas item (edge colour repeated: mip levels and filtering never see a neighbour)
INSET = 0.03       # share of a leaf cell's width left empty on each side (the leaf stays inside the 3D grid's width)
AW = 1024          # atlas width

# type -> how its sheet is laid out and what a cell is (px). v0 = where the blade starts in a cell (below it the stalk)
TYPES = {
    'crypt': dict(kind='leaf', cols=3, rows=2, upper=[0, 1, 2], under=[3, 4, 5], cell=(104, 352), v0=0.18),
    'carpet': dict(kind='leaf', cols=3, rows=3, upper=[0, 1, 2, 3, 4, 5], under=[6, 7, 8], cell=(80, 88), v0=0.0),
    'grass': dict(kind='strap', strips=4, order=dict(base=0, mid=1, tip=2, mid2=3), width=40, base=(40, 64), tip=(40, 64), mid=(100, 160), tiles=4),
}


def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# ---------------------------------------------------------------- test sheets
def synth_sheet(name, cfg):
    """A striped stand-in for a real sheet (same layout)."""
    yy = None
    if cfg['kind'] == 'leaf':
        W, H = (1536, 1024) if name == 'crypt' else (1200, 1200)
        img = np.full((H, W, 3), 255, np.uint8)
        cw, ch = W // cfg['cols'], H // cfg['rows']
        palettes_up = [((120, 130, 60), (190, 160, 70)), ((130, 100, 60), (170, 120, 80)), ((90, 70, 45), (130, 120, 60))] if name == 'crypt' else [((60, 130, 50), (110, 180, 80))] * 6
        palettes_un = [((190, 120, 110), (150, 90, 80))] * 3
        for idx in range(cfg['cols'] * cfg['rows']):
            r, c = divmod(idx, cfg['cols'])
            under = idx in cfg['under']
            k = cfg['under'].index(idx) if under else cfg['upper'].index(idx)
            pal = (palettes_un if under else palettes_up)[k % (3 if name == 'crypt' else len(palettes_up))] if name == 'crypt' else ((palettes_un[0] if under else palettes_up[0]))
            lw = int(cw * (0.34 if name == 'crypt' else 0.62)); lh = int(ch * (0.86 if name == 'crypt' else 0.62))
            x0, y0 = c * cw + cw // 2, r * ch + (ch - lh) // 2
            tilt = (0.035 if (idx % 2) else -0.03)
            Y, X = np.mgrid[0:H, 0:W]
            t = 1 - (Y - y0) / lh                         # 1 at the top? no: t = 0 at the tip (top), 1 at the base
            t = (Y - y0) / lh                             # 0 top (tip) .. 1 bottom (base)
            xc = x0 + (Y - (y0 + lh / 2)) * tilt
            s = 1 - t                                     # 0 base .. 1 tip
            stalk = 0.22 if name == 'crypt' else 0.0
            sb = (s - stalk) / (1 - stalk)
            half = np.where(s < stalk, lw * 0.03, lw / 2 * np.sin(np.pi * np.clip(sb, 0, 1) ** 0.6) ** 0.8)
            xm = (X - xc)
            if under: xm = -xm                            # an underside is the outline mirrored
            inside = (t >= 0) & (t <= 1) & (np.abs(X - xc) <= half)
            band = (np.floor(np.clip(s, 0, 1) * 10).astype(int) % 2)
            col = np.where(band[..., None] == 0, np.array(pal[0]), np.array(pal[1])).astype(np.float64)
            rib = (np.abs(X - xc) < max(2, lw * 0.015))[..., None]
            col = np.where(rib, np.array([235, 235, 200]), col)
            dot = ((xm + half * 0.45) ** 2 + (Y - (y0 + lh * 0.45)) ** 2 < (lw * 0.05) ** 2)[..., None] & (xm < 0)[..., None]
            col = np.where(dot, np.array([220, 30, 30]), col)
            img = np.where(inside[..., None], col.astype(np.uint8), img)
        return Image.fromarray(img)
    # strap: four strips side by side, bands along the length, a bold left edge
    W, H = 1000, 1500
    img = np.full((H, W, 3), 255, np.uint8)
    for k in range(cfg['strips']):
        x0 = 100 + k * 220
        for y in range(int(H * 0.05), int(H * 0.95)):
            s = 1 - y / H
            band = int(s * 24) % 2
            colr = np.array([70, 150, 60] if band == 0 else [110, 190, 80]) if k != 3 else np.array([120, 170, 50] if band == 0 else [160, 200, 70])
            half = 45
            if k == 2:                                    # the tip narrows
                f = min(1, (s - 0.05) / 0.9)
                half = 45 * (1 - max(0, (f - 0.6) / 0.4) ** 2)
            img[y, int(x0 - half):int(x0 + half)] = colr
            img[y, int(x0 - half):int(x0 - half) + 6] = [220, 30, 30]
    return Image.fromarray(img)


# ---------------------------------------------------------------- cutting
def soft_alpha(rgb):
    d = (255 - rgb.astype(np.int16)).max(axis=2).astype(np.float64)
    return np.clip((d - 10) / (30 - 10), 0, 1), d > 16


def find_leaves(img, expect):
    """Connected leaves on the sheet, as (bbox, rgb crop, alpha crop), in sheet order (rows top to bottom, left to right)."""
    rgb = np.asarray(img.convert('RGB'))
    a_soft, mask = soft_alpha(rgb)
    mask = ndi.binary_closing(mask, iterations=2)
    lab, n = ndi.label(mask)
    if n == 0:
        raise SystemExit('no leaf found on the sheet')
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    keep = [i + 1 for i in range(n) if sizes[i] > 0.0005 * mask.size]
    if len(keep) != expect:
        raise SystemExit(f'expected {expect} leaves, found {len(keep)} (sizes {sorted(int(s) for s in sizes)[-expect - 2:]}): leaves touching, or not on pure white?')
    out = []
    for i in keep:
        inside = ndi.binary_fill_holes(lab == i)
        ys, xs = np.nonzero(inside)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        m = 6
        y0, x0, y1, x1 = max(0, y0 - m), max(0, x0 - m), min(rgb.shape[0], y1 + m), min(rgb.shape[1], x1 + m)
        ins = inside[y0:y1, x0:x1]
        al = np.maximum(a_soft[y0:y1, x0:x1], ndi.binary_erosion(ins, iterations=2)) * ndi.binary_dilation(ins, iterations=1)
        col = rgb[y0:y1, x0:x1].copy()
        core = ndi.binary_erosion(ins, iterations=2)
        if core.sum() < 20:
            core = ins
        _, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
        col = col[iy, ix]                                  # colour from the leaf's own inside, out to every corner
        out.append(dict(cy=(ys.mean()), cx=(xs.mean()), rgb=col, a=al))
    return out


def order(leaves, cols, rows):
    ls = sorted(leaves, key=lambda l: l['cy'])
    ls = [sorted(ls[r * cols:(r + 1) * cols], key=lambda l: l['cx']) for r in range(rows)]
    return [l for row in ls for l in row]


def straighten(rgb, a):
    """Rotate so the midrib (the leaf's centre line) is vertical, then centre it: returns rgb, a tight about the axis."""
    h, w = a.shape
    pad = max(h, w) // 2 + 4
    P = lambda x, md: np.pad(x, ((pad, pad), (pad, pad)) + ((0, 0),) * (x.ndim - 2), mode=md)
    rgbp, ap = P(rgb, 'edge'), P(a, 'constant')

    def axis(al):
        ys = np.nonzero(al.max(axis=1) > 0.5)[0]
        lo, hi = ys.min() + int(0.1 * (ys.max() - ys.min())), ys.max() - int(0.1 * (ys.max() - ys.min()))
        yy, cc = [], []
        for y in range(lo, hi + 1):
            xs = np.nonzero(al[y] > 0.5)[0]
            if len(xs):
                yy.append(y); cc.append((xs.min() + xs.max()) / 2)
        return np.polyfit(yy, cc, 1)[0] if len(yy) > 3 else 0.0

    b = axis(ap)
    ang = math.degrees(math.atan(b))
    if 0.2 < abs(ang) < 25:
        best = None
        for sgn in (1, -1):
            ra = np.asarray(Image.fromarray((ap * 255).astype(np.uint8)).rotate(sgn * ang, resample=Image.BICUBIC)) / 255.0
            slope = abs(axis(ra))
            if best is None or slope < best[0]:
                best = (slope, sgn)
        sgn = best[1]
        rgbp = np.asarray(Image.fromarray(rgbp).rotate(sgn * ang, resample=Image.BICUBIC))
        ap = np.asarray(Image.fromarray((ap * 255).astype(np.uint8)).rotate(sgn * ang, resample=Image.BICUBIC)) / 255.0
    ys, xs = np.nonzero(ap > 0.05)
    y0, y1 = ys.min(), ys.max() + 1
    xc = np.mean([(np.nonzero(ap[y] > 0.5)[0].min() + np.nonzero(ap[y] > 0.5)[0].max()) / 2 for y in range(y0, y1) if (ap[y] > 0.5).any()])
    hw = int(math.ceil(max(xc - xs.min(), xs.max() + 1 - xc)))
    xa = int(round(xc)) - hw
    return rgbp[y0:y1, xa:xa + 2 * hw], ap[y0:y1, xa:xa + 2 * hw]


def to_cell(rgb, a, cw, ch, inset=INSET):
    """Stretch a straightened leaf into a cw x ch cell: its width less the inset each side, tip at the top, base at the bottom."""
    iw = max(2, int(round(cw * (1 - 2 * inset))))
    r = np.asarray(Image.fromarray(rgb).resize((iw, ch), Image.LANCZOS))
    al = np.clip(np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((iw, ch), Image.LANCZOS)) / 255.0, 0, 1)
    x0 = (cw - iw) // 2
    cell = np.zeros((ch, cw, 4), np.uint8)
    cell[:, x0:x0 + iw, :3] = r
    cell[:, :x0, :3] = r[:, :1]; cell[:, x0 + iw:, :3] = r[:, -1:]      # colour out to the cell's edge, alpha 0
    cell[:, x0:x0 + iw, 3] = (al * 255).round().astype(np.uint8)
    return cell


def mean_lin(cell, v0):
    ch = cell.shape[0]
    top = cell[:int(round(ch * (1 - v0)))]
    m = top[..., 3] > 127
    if not m.any():
        m = cell[..., 3] > 127
        top = cell
    return [round(float(srgb_to_lin(top[..., k][m]).mean()), 4) for k in range(3)]


def cut_leaf_type(name, cfg, img):
    cw, chh = cfg['cell']
    ls = order(find_leaves(img, cfg['cols'] * cfg['rows']), cfg['cols'], cfg['rows'])
    cells = {}
    for idx, l in enumerate(ls):
        rgb, a = straighten(l['rgb'], l['a'])
        cells[idx] = to_cell(rgb, a, cw, chh)
    items = []
    for k, (iu, iun) in enumerate(zip(cfg['upper'], [cfg['under'][i % len(cfg['under'])] for i in range(len(cfg['upper']))])):
        items.append(dict(name=f'{name}.up{k}', img=cells[iu])); items.append(dict(name=f'{name}.un{k}', img=cells[iun]))
    return items


def cut_strap_type(name, cfg, img):
    ls = sorted(find_leaves(img, cfg['strips']), key=lambda l: l['cx'])
    by = {k: ls[i] for k, i in cfg['order'].items()}
    W = cfg['width']
    def strip(l, size):
        rgb, a = straighten(l['rgb'], l['a'])
        return to_cell(rgb, a, W, size, inset=INSET)
    base = strip(by['base'], cfg['base'][1])
    tip = strip(by['tip'], cfg['tip'][1])
    mid = strip(by['mid'], cfg['mid'][1])
    # a seamless tile: the last rows fade into the first (a strap's veins run along it, so little is lost)
    k = max(4, cfg['mid'][1] // 8)
    m = mid.astype(np.float64)
    for i in range(k):
        w = (i + 1) / (k + 1)
        m[-k + i] = m[-k + i] * (1 - w) + mid[i].astype(np.float64) * w
    mid = m.round().astype(np.uint8)
    cols = []
    for n in range(1, cfg['tiles'] + 1):
        col = np.concatenate([tip, *([mid] * n), base], axis=0)           # top to bottom: tip, n middles, base
        cols.append(dict(name=f'{name}.col{n}', img=col, n=n, hb=base.shape[0], ht=tip.shape[0]))
    mean = mean_lin(mid, 0.0)
    return cols, mean


# ---------------------------------------------------------------- packing
def pack(items):
    items = sorted(items, key=lambda it: (-it['img'].shape[0], it['name']))
    x = y = sh = 0
    for it in items:
        h, w = it['img'].shape[:2]
        if x + w + 2 * GUT > AW:
            x, y, sh = 0, y + sh, 0
        it['pos'] = (x + GUT, y + GUT)
        x += w + 2 * GUT
        sh = max(sh, h + 2 * GUT)
    H = int(math.ceil((y + sh) / 4) * 4)
    atlas = np.zeros((H, AW, 4), np.uint8)
    for it in items:
        h, w = it['img'].shape[:2]
        px, py = it['pos']
        atlas[py - GUT:py + h + GUT, px - GUT:px + w + GUT] = np.pad(it['img'], ((GUT, GUT), (GUT, GUT), (0, 0)), mode='edge')
        atlas[py - GUT:py, px - GUT:px + w + GUT, 3] = 0
        atlas[py + h:py + h + GUT, px - GUT:px + w + GUT, 3] = 0
        atlas[py:py + h, px - GUT:px, 3] = 0
        atlas[py:py + h, px + w:px + w + GUT, 3] = 0
    return atlas, H


def rect_uv(it, H):
    h, w = it['img'].shape[:2]
    px, py = it['pos']
    return [round(px / AW, 6), round(1 - (py + h) / H, 6), round((px + w) / AW, 6), round(1 - py / H, 6)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheets', default=r'C:\Users\nreed\fish-sheets\plants')
    ap.add_argument('--types', default=','.join(TYPES))
    ap.add_argument('--synth', action='store_true', help='draw striped test sheets for every type')
    ap.add_argument('--webp', action='store_true', help='write leaves.webp (lossy 88, with alpha) instead of leaves.png: several times smaller')
    ap.add_argument('--debug', default='', help='write the sheets used and the atlas here')
    a = ap.parse_args()
    items, man, test = [], {}, []
    white = np.full((8, 8, 4), 255, np.uint8)
    items.append(dict(name='white', img=white))
    for name in a.types.split(','):
        cfg = TYPES[name]
        path = os.path.join(a.sheets, f'{name}-d1.png')
        if not a.synth and os.path.exists(path):
            img = Image.open(path)
        else:
            img = synth_sheet(name, cfg); test.append(name)
            print(f'{name}: no sheet at {path}: using a striped test sheet', file=sys.stderr)
        if a.debug:
            os.makedirs(a.debug, exist_ok=True); img.convert('RGB').save(os.path.join(a.debug, f'{name}-sheet.png'))
        if cfg['kind'] == 'leaf':
            its = cut_leaf_type(name, cfg, img)
            items += its
            man[name] = dict(kind='leaf', v0=cfg['v0'], _its=its, _cfg=cfg)
        else:
            cols, mean = cut_strap_type(name, cfg, img)
            items += cols
            man[name] = dict(kind='strap', baseMm=cfg['base'][0], tipMm=cfg['tip'][0], midMm=cfg['mid'][0], mean=mean, _cols=cols)
    atlas, H = pack(items)
    fname = 'leaves.webp' if a.webp else 'leaves.png'
    out = {'test': test, 'file': fname, 'atlas': [AW, H], 'white': None, 'types': {}}
    wi = next(it for it in items if it['name'] == 'white')
    out['white'] = [round((wi['pos'][0] + 4) / AW, 6), round(1 - (wi['pos'][1] + 4) / H, 6)]
    for name, m in man.items():
        if m['kind'] == 'leaf':
            cells, its = [], {it['name']: it for it in m['_its']}
            for k in range(len(m['_cfg']['upper'])):
                up, un = its[f'{name}.up{k}'], its[f'{name}.un{k}']
                cells.append(dict(up=rect_uv(up, H), un=rect_uv(un, H), mu=mean_lin(up['img'], m['v0']), mn=mean_lin(un['img'], m['v0'])))
            out['types'][name] = dict(kind='leaf', v0=m['v0'], cells=cells)
        else:
            cs = [dict(n=c['n'], rect=rect_uv(c, H), fb=round(c['hb'] / c['img'].shape[0], 6), ft=round(c['ht'] / c['img'].shape[0], 6)) for c in m['_cols']]
            out['types'][name] = dict(kind='strap', baseMm=m['baseMm'], tipMm=m['tipMm'], midMm=m['midMm'], mean=m['mean'], cols=cs)
    os.makedirs(OUT_DIR, exist_ok=True)
    for stale in ('leaves.png', 'leaves.webp'):
        if os.path.exists(os.path.join(OUT_DIR, stale)):
            os.remove(os.path.join(OUT_DIR, stale))
    path = os.path.join(OUT_DIR, fname)
    im = Image.fromarray(atlas, 'RGBA')
    if a.webp:
        im.save(path, 'WEBP', quality=88, method=6, alpha_quality=100)
    else:
        im.save(path, optimize=True)
    with open(OUT_JSON, 'w', encoding='utf8') as f:
        json.dump(out, f, indent=1)
    if a.debug:
        Image.fromarray(atlas, 'RGBA').save(os.path.join(a.debug, 'atlas.png'))
    print(f'{fname}: {AW}x{H}, {os.path.getsize(path) / 1024:.0f} KB; test sheets: {test or "none"}')


if __name__ == '__main__':
    main()
