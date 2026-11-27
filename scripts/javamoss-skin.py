"""R182 lane JM step 2: the java moss's own texture from its ChatGPT sheet. Deterministic.

  python scripts/javamoss-skin.py [--sheet C:/Users/nreed/fish-sheets/plants/javamoss-d1.webp] [--preview out.png]

The sheet (prompt: research/plant-sheets/prompts/leaf-sheet.md, "Java moss sheet") is square: top left a seamless mat
tile, top right a cushion's edge on white with strands sticking out, bottom eight single strands on white. Writes
public/art/plants/javamoss.webp (1024 x 1024, alpha) and src/data/plantart/javamoss.json (rects in uv, v up):
  - mats: the tile (made seamless) at four densities, 256 x 256 each, 2 x 2 in the top left 512 x 512: level 0 opaque
    (the core), levels 1-3 keep only the brightest strands (coverage MAT_COVER): alpha from the tile's own light and dark.
    The clump stacks them in shells, densest inside, so its density falls off evenly toward the tips (Nathan 2026-11-26:
    'linearly increasing density, no step'). `mat` = level 0 (as before).
  - edges: 8 cards from the cushion's edge, 128 x 256, top right (two rows of 4). The outline is straightened to a fixed
    row; `edgeBase` = the share of the card's height below it (solid moss). They stand round the outline so it is ragged.
  - strands: the 8 single strands, cut by connected parts on white, packed along the bottom half at ONE scale (their
    relative lengths are kept). Each has `rect`, `root` (uv of the end the stem grows from: the bottom for the six upright
    ones, the top for the two longest, drooping streamers) and `len` (its length as a share of the longest).
Alpha comes from the white background (blue channel: white 255, the moss greens under ~80); colour is un-blended from
the white. Transparent pixels get the card's darkened mean colour so mipmaps neither glow nor go black at the edges.
"""
import argparse, json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AW = 1024
MAT = 512
LV = 256
MAT_COVER = [1.0, 0.7, 0.45, 0.25]  # share of the tile kept at each level
EDGE_W, EDGE_H, N_EDGE = 128, 256, 8
EDGE_SRC_W, ABOVE, BELOW = 150, 240, 60  # source px: card width, reach above the outline, depth below it
STRIP_Y, STRIP_H = 512, 512               # the strands' strip in the atlas
WHITE = 236


def seamless(t):
    """Cross-fade the tile with itself shifted by half, weighted toward the shifted copy at the edges: seamless."""
    n = t.shape[0]
    s = np.roll(np.roll(t, n // 2, 0), n // 2, 1)
    r = np.abs(np.linspace(-1, 1, n))
    w = np.clip(1 - np.maximum(r[:, None], r[None, :]), 0, 1) ** 0.6
    w = np.clip(w * 1.6, 0, 1)[..., None]
    return t * w + s * (1 - w)


def bbox(mask):
    ys, xs = np.where(mask)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def panels(im):
    """Split at the white gaps: the first mostly-white row in the middle third, the first mostly-white column above it."""
    h, w, _ = im.shape
    white = im.min(2) > WHITE
    rows = white.mean(1)
    gy = next(y for y in range(h // 3, 2 * h // 3) if rows[y] > 0.9)
    cols = white[:gy].mean(0)
    gx = next(x for x in range(w // 3, 2 * w // 3) if cols[x] > 0.9)
    gx2 = next(x for x in range(gx, w) if cols[x] < 0.9)
    gy2 = next(y for y in range(gy, h) if rows[y] < 0.995)  # (the strands' panel starts in white: any content row)
    return gy, gx, gx2, gy2


def unblend(rgb):
    a = np.clip((WHITE - rgb[..., 2]) / 150, 0, 1)
    col = np.where(a[..., None] > 0.02, (rgb - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 0.02), 0)
    return np.clip(col, 0, 255), a


def rgba(col, a):
    """Fill the transparent pixels with the darkened mean of the opaque ones (mip-safe edges)."""
    m = a > 0.5
    fill = (col[m].mean(0) if m.any() else np.array([40, 70, 20])) * 0.75
    col = np.where(a[..., None] > 0.02, col, fill)
    return np.dstack([col, a * 255]).astype(np.uint8)


def cut_edges(right):
    """Cards along the cushion's outline (the top of the solid moss, smoothed: strands sticking up are not the surface)."""
    h, w, _ = right.shape
    solid = right[:, :, 2] < 120
    out = np.array([next((y for y in np.where(solid[:, x])[0] if solid[y:y + 24, x].mean() > 0.85), h // 2) for x in range(w)], float)
    k = 81
    smooth = np.convolve(np.pad(out, k // 2, mode='edge'), np.ones(k) / k, mode='valid')
    step = (w - EDGE_SRC_W) / (N_EDGE - 1)
    cards = []
    for i in range(N_EDGE):
        x0 = int(round(i * step))
        cw = np.full((ABOVE + BELOW, EDGE_SRC_W, 3), 255.0)
        for j in range(EDGE_SRC_W):
            top = int(round(smooth[x0 + j])) + 16 - ABOVE  # a little below the outline: no white gaps in the base
            lo, hi = max(0, top), min(h, top + ABOVE + BELOW)
            cw[lo - top:hi - top, j] = right[lo:hi, x0 + j]
        col, a = unblend(cw)
        a[ABOVE:] = np.maximum(a[ABOVE:], np.linspace(0.7, 1, BELOW)[:, None])  # below the outline: solid moss
        img = Image.fromarray(rgba(col, a), 'RGBA').resize((EDGE_W, EDGE_H), Image.LANCZOS)
        cards.append(np.asarray(img))
    return cards, BELOW / (ABOVE + BELOW), EDGE_SRC_W / (ABOVE + BELOW)


def label(mask):
    """Connected parts (8-neighbour), no scipy: a flood fill per part on a dilated mask, so a strand's leaves join it."""
    m = mask.copy()
    for _ in range(3):  # dilate 3 px
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    lab = np.zeros(m.shape, int)
    n = 0
    h, w = m.shape
    for sy, sx in zip(*np.where(m)):
        if lab[sy, sx]:
            continue
        n += 1
        stack = [(sy, sx)]
        lab[sy, sx] = n
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
    return lab, n


def cut_strands(bot):
    col, a = unblend(bot)
    lab, n = label(a > 0.25)
    parts = []
    for k in range(1, n + 1):
        mk = lab == k
        if mk.sum() < 400:
            continue  # specks
        y0, y1, x0, x1 = bbox(mk)
        parts.append((x0, y0, x1, y1, k))
    parts.sort(key=lambda p: p[0])
    if len(parts) != 8:
        print(f'warning: {len(parts)} strands found (expected 8)')
    pad = 4
    ws = [p[2] - p[0] + 2 * pad for p in parts]
    hs = [p[3] - p[1] + 2 * pad for p in parts]
    s = min((AW - 2 * len(parts)) / sum(ws), (STRIP_H - 4) / max(hs))
    out = np.zeros((STRIP_H, AW, 4), np.uint8)
    meta, x = [], 1
    longest = max(hs)
    for (x0, y0, x1, y1, k), w_, h_ in zip(parts, ws, hs):
        sl = (slice(y0 - pad, y1 + pad), slice(x0 - pad, x1 + pad))
        aa = a[sl] * (lab[sl] == k)  # this strand only
        img = Image.fromarray(rgba(col[sl], aa), 'RGBA')
        dw, dh = max(1, int(round(w_ * s))), max(1, int(round(h_ * s)))
        img = np.asarray(img.resize((dw, dh), Image.LANCZOS))
        y = STRIP_H - 2 - dh  # bottom-aligned
        out[y:y + dh, x:x + dw] = img
        # the root: where the stem leaves the bottom of the box (upright) or the top (drooping). Found as the mean x of the strand's pixels in its last / first 8 rows.
        sub = aa > 0.4
        droop = h_ >= sorted(hs)[-2]  # the prompt's two longest strands droop: streamers, rooted at the top
        rows = np.where(sub.any(1))[0]
        ry = rows[0] if droop else rows[-1]
        band = sub[ry:ry + 8] if droop else sub[max(0, ry - 8):ry + 1]
        rx = np.where(band.any(0))[0].mean()
        u = (x + rx * s) / AW
        v = 1 - (STRIP_Y + y + ry * s) / AW
        meta.append({'rect': [(x + 0.5) / AW, 1 - (STRIP_Y + y + dh - 0.5) / AW, (x + dw - 0.5) / AW, 1 - (STRIP_Y + y + 0.5) / AW],
                     'root': [round(u, 5), round(v, 5)], 'hang': bool(droop), 'len': round(h_ / longest, 3)})
        x += dw + 2
    return out, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', default=r'C:\Users\nreed\fish-sheets\plants\javamoss-d1.webp')
    ap.add_argument('--preview', default=None, help='also write the atlas over a dark checker here')
    o = ap.parse_args()
    im = np.asarray(Image.open(o.sheet).convert('RGB')).astype(float)
    gy, gx, gx2, gy2 = panels(im)
    tl = im[:gy, :gx]
    y0, y1, x0, x1 = bbox(tl.min(2) < WHITE)
    n = min(y1 - y0, x1 - x0) - 16  # 8 px in: the panel's anti-aliased border is light (shows as a cross once rolled)
    tile = seamless(tl[y0 + 8:y0 + 8 + n, x0 + 8:x0 + 8 + n])  # (the sheet's tile is not seamless: seam diff = random columns)
    mat = np.asarray(Image.fromarray(np.clip(tile, 0, 255).astype(np.uint8)).resize((LV, LV), Image.LANCZOS))
    edges, edge_base, edge_aspect = cut_edges(im[:gy, gx2:])
    strip, strands = cut_strands(im[gy2:])
    atlas = np.zeros((AW, AW, 4), np.uint8)
    lum = mat.astype(float) @ np.array([0.3, 0.59, 0.11])
    fill = (mat.reshape(-1, 3).mean(0) * 0.6).astype(np.uint8)
    for k, cov in enumerate(MAT_COVER):
        r, q = divmod(k, 2)
        t = np.percentile(lum, 100 * (1 - cov)) if cov < 1 else -1
        a = np.clip((lum - t) / 6, 0, 1) if cov < 1 else np.ones_like(lum)  # (a short ramp: crisp under alphaTest 0.5)
        blk = np.where(a[..., None] > 0.02, mat, fill)
        atlas[r * LV:(r + 1) * LV, q * LV:(q + 1) * LV] = np.dstack([blk, a * 255]).astype(np.uint8)
    for i, c in enumerate(edges):
        r, q = divmod(i, 4)
        atlas[r * EDGE_H:(r + 1) * EDGE_H, MAT + q * EDGE_W:MAT + (q + 1) * EDGE_W] = c
    atlas[STRIP_Y:STRIP_Y + STRIP_H] = strip
    # the strip's empty pixels: same darkened moss fill as the cards (mip-safe)
    empty = atlas[STRIP_Y:, :, 3] == 0
    atlas[STRIP_Y:][empty, :3] = (np.array(mat.reshape(-1, 3).mean(0)) * 0.75).astype(np.uint8)
    out = os.path.join(ROOT, 'public', 'art', 'plants', 'javamoss.webp')
    Image.fromarray(atlas, 'RGBA').save(out, quality=90, method=6)
    hp = 0.5 / AW
    man = {
        'file': 'javamoss.webp',
        'mat': [hp, 0.75 + hp, 0.25 - hp, 1 - hp],
        'mats': [[q * 0.25 + hp, 1 - (r + 1) * 0.25 + hp, (q + 1) * 0.25 - hp, 1 - r * 0.25 - hp] for r, q in (divmod(k, 2) for k in range(len(MAT_COVER)))],
        'matCover': MAT_COVER,
        'edges': [[(MAT + q * EDGE_W + 1) / AW, 1 - ((r + 1) * EDGE_H - 1) / AW, (MAT + (q + 1) * EDGE_W - 1) / AW, 1 - (r * EDGE_H + 1) / AW]
                  for r, q in (divmod(i, 4) for i in range(N_EDGE))],
        'edgeBase': round(edge_base, 4),
        'edgeAspect': round(edge_aspect, 4),
        'strands': strands,
        'mean': [round(float(x) / 255, 4) for x in tile.reshape(-1, 3).mean(0)],
    }
    with open(os.path.join(ROOT, 'src', 'data', 'plantart', 'javamoss.json'), 'w') as f:
        json.dump(man, f, indent=1)
    if o.preview:
        ck = ((np.indices((AW, AW)).sum(0) // 32) % 2)[..., None] * 30 + 20
        a = atlas[..., 3:] / 255
        prev = (atlas[..., :3] * a + ck * (1 - a)).astype(np.uint8)
        for st in strands:  # root markers
            u, v = st['root']
            px, py = int(u * AW), int((1 - v) * AW)
            prev[max(0, py - 3):py + 4, max(0, px - 3):px + 4] = (255, 0, 0) if st['hang'] else (255, 255, 0)
        Image.fromarray(prev).save(o.preview)
    print(f'javamoss.webp {os.path.getsize(out) / 1024:.0f} KB; panels split y={gy} x={gx}..{gx2}; {len(strands)} strands '
          f'({sum(s["hang"] for s in strands)} hanging); edge base {edge_base:.2f}; mat mean {man["mean"]}')


if __name__ == '__main__':
    main()
