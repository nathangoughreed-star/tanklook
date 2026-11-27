"""R182: the marimo's own texture from its ChatGPT sheet. Deterministic.

  python scripts/marimo-skin.py [--sheet C:/Users/nreed/fish-sheets/plants/marimo-d1.webp]

The sheet (prompt: research/plant-sheets/prompts/leaf-sheet.md, "Marimo skin sheet") is 2:1: left a velvet tile, right
the ball's upper edge on white with loose filaments. Writes public/art/plants/marimo.webp (1024 x 1024, alpha) and
src/data/plantart/marimo.json (rects in uv, v up):
  - skin: the top half. An equirectangular map baked from the tile by triplanar projection, laid out the way three's
    SphereGeometry lays out its uv, so the ball has no seam and no pinch at its poles.
  - cards: fringe cards cut from the right half along the ball's outline (the outline straightened to a fixed row),
    alpha from the white background; `base` = the share of the card's height below the outline (opaque velvet).
"""
import argparse, json, math, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AW = 1024
SKIN_H = 512
REPEAT = 0.65   # tiles per unit of the ball's radius: ~10 tufts across its diameter (the photos)
N_CARDS, CARD_SRC_W, ABOVE, BELOW = 4, 160, 210, 50  # source px: card width, reach above the outline, depth below it
CARD_W, CARD_H = 256, 400


def seamless(t):
    """Cross-fade the tile with itself shifted by half, weighted toward the shifted copy at the edges: seamless."""
    n = t.shape[0]
    s = np.roll(np.roll(t, n // 2, 0), n // 2, 1)
    r = np.abs(np.linspace(-1, 1, n))
    w = np.clip(1 - np.maximum(r[:, None], r[None, :]), 0, 1) ** 0.6  # 1 in the middle, 0 at the edges
    w = np.clip(w * 1.6, 0, 1)[..., None]
    return t * w + s * (1 - w)


def sample(t, u, v):
    """Bilinear, wrapping."""
    n = t.shape[0]
    x, y = (u % 1) * n, (v % 1) * n
    x0, y0 = np.floor(x).astype(int) % n, np.floor(y).astype(int) % n
    x1, y1 = (x0 + 1) % n, (y0 + 1) % n
    fx, fy = (x - np.floor(x))[..., None], (y - np.floor(y))[..., None]
    return (t[y0, x0] * (1 - fx) * (1 - fy) + t[y0, x1] * fx * (1 - fy) + t[y1, x0] * (1 - fx) * fy + t[y1, x1] * fx * fy)


def bake_skin(tile):
    H, W = SKIN_H, AW
    u = (np.arange(W) + 0.5) / W
    v = 1 - (np.arange(H) + 0.5) / H          # image row 0 = v 1 (the texture is flipped on upload)
    phi, th = u[None, :] * 2 * math.pi, (1 - v[:, None]) * math.pi
    dx, dy, dz = -np.cos(phi) * np.sin(th), np.cos(th) * np.ones_like(phi), np.sin(phi) * np.sin(th)
    wx, wy, wz = np.abs(dx) ** 4, np.abs(dy) ** 4, np.abs(dz) ** 4
    s = wx + wy + wz
    k = REPEAT
    c = (sample(tile, dz * k, dy * k) * (wx / s)[..., None] + sample(tile, dx * k + 0.37, dz * k + 0.11) * (wy / s)[..., None]
         + sample(tile, dx * k + 0.71, dy * k + 0.53) * (wz / s)[..., None])
    return c


def cut_cards(right):
    b = right[:, :, 2]
    h, w = b.shape
    out = np.zeros(w, int)
    for x in range(w):
        col = b[:, x] < 110
        ys = np.where(col)[0]
        out[x] = next((y for y in ys if col[y:y + 20].mean() > 0.9), h // 2)
    # a smooth outline (filaments poking up are not the surface)
    k = 61
    pad = np.pad(out.astype(float), k // 2, mode='edge')
    smooth = np.convolve(pad, np.ones(k) / k, mode='valid')
    cards = []
    span = N_CARDS * CARD_SRC_W
    x0 = (w - span) // 2
    for i in range(N_CARDS):
        cw = np.zeros((ABOVE + BELOW, CARD_SRC_W, 3))
        for j in range(CARD_SRC_W):
            x = x0 + i * CARD_SRC_W + j
            top = int(round(smooth[x])) + 14 - ABOVE  # (a little below the smoothed outline: no white gaps in the base)
            cw[:, j] = right[max(0, top):top + ABOVE + BELOW, x] if top >= 0 else np.vstack([np.full((-top, 3), 255.0), right[0:top + ABOVE + BELOW, x]])
        # alpha from the white: the blue channel (white 255, the filaments' greens ~0-60)
        a = np.clip((235 - cw[:, :, 2]) / 140, 0, 1)
        a[ABOVE:] = np.maximum(a[ABOVE:], np.linspace(0.6, 1, BELOW)[:, None])  # below the outline: the velvet, solid
        # colour without the white it was blended with
        col = np.where(a[..., None] > 0.02, (cw - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 0.02), 0)
        col = np.clip(col, 0, 255)
        img = np.dstack([col, a * 255]).astype(np.uint8)
        cards.append(np.asarray(Image.fromarray(img, 'RGBA').resize((CARD_W, CARD_H), Image.LANCZOS)))
    return cards, BELOW / (ABOVE + BELOW)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', default=r'C:\Users\nreed\fish-sheets\plants\marimo-d1.webp')
    a = ap.parse_args()
    im = np.asarray(Image.open(a.sheet).convert('RGB')).astype(float)
    h, w, _ = im.shape
    half = w // 2
    n = min(h, half) - 2
    tile = seamless(im[1:1 + n, 1:1 + n])
    skin = bake_skin(tile)
    cards, base = cut_cards(im[:, half + 2:])
    atlas = np.zeros((AW, AW, 4), np.uint8)
    atlas[:SKIN_H, :, :3] = np.clip(skin, 0, 255).astype(np.uint8)
    atlas[:SKIN_H, :, 3] = 255
    for i, c in enumerate(cards):
        atlas[SKIN_H:SKIN_H + CARD_H, i * CARD_W:(i + 1) * CARD_W] = c
    out = os.path.join(ROOT, 'public', 'art', 'plants', 'marimo.webp')
    Image.fromarray(atlas, 'RGBA').save(out, quality=88, method=6)
    half_px = 0.5 / AW
    man = {
        'file': 'marimo.webp',
        'skin': [half_px, 0.5 + half_px, 1 - half_px, 1 - half_px],
        'cards': [[(i * CARD_W + 1) / AW, 1 - (SKIN_H + CARD_H - 1) / AW, ((i + 1) * CARD_W - 1) / AW, 1 - (SKIN_H + 1) / AW] for i in range(N_CARDS)],
        'base': round(base, 4),
        'aspect': round(CARD_W / CARD_H * (CARD_SRC_W / CARD_W) / ((ABOVE + BELOW) / CARD_H), 4),
        'mean': [round(float(x) / 255, 4) for x in tile.reshape(-1, 3).mean(0)],
    }
    with open(os.path.join(ROOT, 'src', 'data', 'plantart', 'marimo.json'), 'w') as f:
        json.dump(man, f, indent=1)
    print(f'marimo.webp {os.path.getsize(out) / 1024:.0f} KB; card base {base:.2f}; aspect {man["aspect"]}')


if __name__ == '__main__':
    main()
