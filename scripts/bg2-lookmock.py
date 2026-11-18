"""BG2 look mock: procedural 'photo-like' backgrounds composited on a mock 1280x800 tank (NOT the live renderer).
Usage: python scripts/bg2-lookmock.py <outdir>"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
rs = np.random.RandomState(7)
W, H = 880, 400  # back panel size

def noise(w, h, cells):
    a = rs.rand(cells[1], cells[0]).astype(np.float32)
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255

def fbm(w, h, base=4, octs=6, gain=0.55):
    t = np.zeros((h, w), np.float32); amp = 1; tot = 0
    for o in range(octs):
        c = base * 2 ** o
        t += amp * noise(w, h, (c, max(2, int(c * h / w)))); tot += amp; amp *= gain
    return t / tot

def lerp(c0, c1, t): return np.array(c0, np.float32) * (1 - t[..., None]) + np.array(c1, np.float32) * t[..., None]

def vignette(img, strength=0.55):
    y, x = np.mgrid[0:H, 0:W]; d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H * 0.45) / (H * 0.7)) ** 2)
    return img * (1 - strength * np.clip(d - 0.35, 0, 1) ** 1.5)[..., None]

def grain(img, a=5): return img + rs.randn(H, W, 1).astype(np.float32) * a

def rock():
    h = fbm(W, H, 3, 7, 0.6)
    ridge = 1 - np.abs(fbm(W, H, 5, 5, 0.5) * 2 - 1)
    height = h * 0.7 + ridge ** 3 * 0.5
    # chunky ledges: quantise a coarse field so faces step like stacked stone
    step = np.floor(fbm(W, H, 4, 3, 0.5) * 7) / 7
    height = height + step * 0.9
    gy, gx = np.gradient(height * 14)
    shade = np.clip(0.55 + (-gx * 0.6 - gy * 0.8) * 0.9, 0.05, 1.2)
    tone = fbm(W, H, 6, 4)
    col = lerp((70, 70, 72), (150, 140, 128), tone) * shade[..., None]
    col = col * np.array([0.9, 1.0, 1.08], np.float32)  # faint water cast
    ydrop = np.linspace(1.0, 0.45, H)[:, None, None]
    col = col * ydrop
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    return vignette(np.asarray(img, np.float32), 0.5)

def planted():
    base = lerp((10, 26, 18), (28, 60, 36), np.tile(np.linspace(1, 0, H)[:, None], (1, W)))
    img = Image.fromarray(base.astype(np.uint8))
    for layer, (blur, n, alpha, cols) in enumerate([(14, 70, 150, [(30, 70, 40), (46, 96, 50)]),
                                                     (8, 55, 170, [(40, 92, 44), (62, 120, 56)]),
                                                     (4.5, 40, 190, [(58, 118, 52), (86, 146, 62), (112, 150, 70)])]):
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        for _ in range(n):
            x = rs.rand() * W; ht = H * (0.35 + rs.rand() * 0.6); lean = (rs.rand() - 0.5) * 80
            c = cols[rs.randint(len(cols))]; wd = int(6 + rs.rand() * 14 + layer * 3)
            for k in range(14):  # leafy stem: stacked small leaf ellipses
                t = k / 13; px = x + lean * t; py = H - ht * t
                lw = wd * (1 - 0.5 * t) + 4; lh = lw * 0.5
                d.ellipse([px - lw, py - lh, px + lw, py + lh], fill=c + (alpha,))
        img = Image.alpha_composite(img.convert('RGBA'), lay.filter(ImageFilter.GaussianBlur(blur))).convert('RGB')
    a = np.asarray(img, np.float32)
    # soft light from above and dark floor
    a *= (0.75 + 0.5 * np.linspace(1, 0, H)[:, None, None])
    return vignette(a, 0.6)

def reef():
    t = np.tile(np.linspace(0, 1, H)[:, None], (1, W))
    col = lerp((22, 96, 150), (4, 22, 52), t ** 0.8)
    img = Image.fromarray(col.astype(np.uint8)).convert('RGBA')
    # hazy reef silhouettes in three depths (further = bluer + softer)
    for depth, (blur, tint, n) in enumerate([(7, (30, 80, 130), 22), (4.5, (40, 70, 110), 20), (2.6, (34, 52, 84), 16)]):
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        base = H * (0.72 + depth * 0.1)
        for _ in range(n):
            x = rs.rand() * W; sz = 40 + rs.rand() * 90 + depth * 20
            kind = rs.rand()
            if kind < 0.5:
                d.ellipse([x - sz, base - sz * 0.7, x + sz, base + sz * 0.3], fill=tint + (235,))
            else:
                for b in range(6):  # branching fingers
                    bx = x + (b - 2.5) * sz * 0.22; by = base - sz * (0.5 + rs.rand() * 0.7)
                    d.line([x, base, bx, by], fill=tint + (235,), width=int(8 + sz * 0.12))
        img = Image.alpha_composite(img, lay.filter(ImageFilter.GaussianBlur(blur)))
    a = np.asarray(img.convert('RGB'), np.float32)
    # god rays + sand haze at the bottom
    ray = fbm(W, H, 9, 2); ray = np.clip(np.tile(ray[:1, :], (H, 1)) - 0.5, 0, 1) * np.linspace(1, 0, H)[:, None]
    a += (ray * 90)[..., None] * np.array([0.5, 0.8, 1.0], np.float32)
    a += np.clip((np.linspace(0, 1, H) - 0.9) * 10, 0, 1)[:, None, None] * np.array([40, 34, 22], np.float32)
    return vignette(a, 0.5)

def to_tank(back, name, sub=(176, 160, 128), title=''):
    S = (1280, 800)
    room = np.tile(np.linspace(46, 30, S[1])[:, None, None], (1, S[0], 3)).astype(np.float32)
    im = Image.fromarray(room.astype(np.uint8)); d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 140, 150, 1140, 600
    # back panel (the picture), seen through front glass with small perspective inset
    bx0, by0, bx1, by1 = x0 + 55, y0 + 40, x1 - 55, y1 - 80
    pic = Image.fromarray(np.clip(back, 0, 255).astype(np.uint8)).resize((bx1 - bx0, by1 - by0), Image.LANCZOS)
    im.paste(pic, (bx0, by0))
    # side panes (dark glass edges) and floor
    d.polygon([(x0, y0), (bx0, by0), (bx0, by1), (x0, y1)], fill=(24, 30, 36))
    d.polygon([(x1, y0), (bx1, by0), (bx1, by1), (x1, y1)], fill=(20, 26, 32))
    d.polygon([(x0, y1), (bx0, by1), (bx1, by1), (x1, y1)], fill=sub)
    fl = np.asarray(im, np.float32); fl[by1:y1, :] *= 1.0
    im = Image.fromarray(fl.astype(np.uint8)); d = ImageDraw.Draw(im)
    # a few stones and a plant stem so the picture is judged with things in front of it
    for cx, cy, r in [(560, 560, 46), (620, 570, 36), (880, 565, 52)]:
        d.ellipse([cx - r * 1.4, cy - r * 0.8, cx + r * 1.4, cy + r * 0.8], fill=(88, 84, 78))
        d.ellipse([cx - r * 1.1, cy - r * 0.7, cx + r * 0.6, cy + r * 0.1], fill=(112, 106, 98))
    for px in (400, 420, 440):
        d.line([px, 575, px + (px - 420) * 0.6, 380], fill=(46, 116, 64), width=4)
    # front rim, silicone, black frame
    d.rectangle([x0 - 8, y0 - 8, x1 + 8, y0 + 4], fill=(10, 10, 12)); d.rectangle([x0 - 8, y1 - 4, x1 + 8, y1 + 12], fill=(10, 10, 12))
    d.rectangle([x0 - 8, y0 - 8, x0 + 4, y1 + 12], fill=(10, 10, 12)); d.rectangle([x1 - 4, y0 - 8, x1 + 8, y1 + 12], fill=(10, 10, 12))
    d.rectangle([x0 - 30, y1 + 12, x1 + 30, y1 + 40], fill=(18, 18, 20))
    # glass sheen
    sheen = Image.new('RGBA', S, (0, 0, 0, 0)); sd = ImageDraw.Draw(sheen)
    sd.polygon([(x0 + 40, y0), (x0 + 200, y0), (x0 + 80, y1), (x0 - 20, y1)], fill=(255, 255, 255, 14))
    im = Image.alpha_composite(im.convert('RGBA'), sheen).convert('RGB'); d = ImageDraw.Draw(im)
    f = ImageFont.truetype('arial.ttf', 26)
    d.text((24, 24), title, fill=(230, 230, 230), font=f)
    d.text((24, 760), 'MOCK (procedural texture on a flat tank), not the live render', fill=(150, 150, 150), font=ImageFont.truetype('arial.ttf', 18))
    im.save(os.path.join(out, name)); return im

ims = {}
ims['rock'] = to_tank(rock(), 'bg2-cand-rockwall.png', title='Candidate: stacked rock wall (grey slate / stone)')
ims['plant'] = to_tank(planted(), 'bg2-cand-plantedblur.png', title='Candidate: planted stream, soft focus, dark floor')
ims['reef'] = to_tank(reef(), 'bg2-cand-bluewater.png', title='Candidate: blue water with hazy reef, dark base')

# contact sheet: today's four (Nathan's picture) above, candidates below
today = Image.open(os.path.join(os.path.dirname(out.rstrip('/\\')), 'R126-scene-backgrounds.png')) if os.path.exists(os.path.join(os.path.dirname(out.rstrip('/\\')), 'R126-scene-backgrounds.png')) else None
sheet = Image.new('RGB', (1280, 900), (24, 26, 30)); d = ImageDraw.Draw(sheet)
f = ImageFont.truetype('arial.ttf', 22)
d.text((20, 10), 'TODAY (painted scenes, Nathan: too cartoony)', fill=(255, 190, 190), font=f)
if today is not None:
    t = today.convert('RGB'); t = t.resize((1240, int(t.height * 1240 / t.width))); sheet.paste(t, (20, 40))
y = 40 + (t.height if today is not None else 150) + 20
d.text((20, y), 'PROPOSED (mock): rock wall | planted stream | blue water reef', fill=(190, 255, 190), font=f)
for i, k in enumerate(['rock', 'plant', 'reef']):
    sheet.paste(ims[k].resize((410, 256)), (20 + i * 420, y + 34))
sheet = sheet.crop((0, 0, 1280, y + 34 + 256 + 20)); sheet.save(os.path.join(out, 'bg2-looksheet.png'))
print('ok', sheet.size)
