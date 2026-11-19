#!/usr/bin/env python3
"""Overlay picture + diagnostics for the fish-outline experiment (2026-11-19).

  python -I scripts/fish-overlay.py photo.png anatomy.json card_current.png card_measured.png cur.json out.png [--ped-u 0.2] [--mouth -0.01]

card_*.png are `drawFishCard` renders on a transparent background (width 1024, nose right, u = 0..1 over TL).
cur.json = the current plan's body depth at the same 21 stations, [top, bottom] in % SL (distance from the card centre line).
Panels: photo | photo + current model (magenta) | photo + measured-outline model (cyan); green = photo mask outline,
yellow = measured body-only outline. Cards are aligned to the photo by snout tip and peduncle centre (similarity transform).
"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def outline(mask):
    m = mask.astype(bool)
    e = m.copy()
    e[1:-1, 1:-1] = m[1:-1, 1:-1] & m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:]
    return m & ~e


def thick(edge, r=1):
    out = edge.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(edge, dy, 0), dx, 1)
    return out


def card_to_photo(card, A_card, B_card, A_ph, B_ph, size):
    za, zb = complex(*A_card), complex(*B_card)
    pa, pb = complex(*A_ph), complex(*B_ph)
    a = (pb - pa) / (zb - za)          # card z -> photo z' = a z + b
    b = pa - a * za
    ia = 1 / a                          # photo -> card (PIL wants output -> input)
    ib = -b / a
    return card.transform(size, Image.AFFINE, (ia.real, -ia.imag, ib.real, ia.imag, ia.real, ib.imag), resample=Image.BILINEAR)


def main():
    pos = [x for x in sys.argv[1:] if not x.startswith('--')]
    opt = {x: sys.argv[i + 2] for i, x in enumerate(sys.argv[1:-1]) if x.startswith('--')}
    photo_p, js_p, cur_p, mea_p, curj_p, out_p = pos[:6]
    ped_u, mouth = float(opt.get('--ped-u', 0.2)), float(opt.get('--mouth', -0.01))
    ph = Image.open(photo_p).convert('RGB')
    W, H = ph.size
    J = json.load(open(js_p))
    lm = J['anatomy']['landmarks']
    A_ph, B_ph = lm['snoutPxOriginal'], lm['pedunclePxOriginal']
    full = np.asarray(ph).max(2) > J['method']['threshold']

    def panel(cardpath, col):
        card = Image.open(cardpath).convert('RGBA')
        cw, ch = card.size
        A_card = (cw * 1.0, ch / 2 + mouth * cw)
        B_card = (cw * ped_u, ch / 2)
        t = card_to_photo(card, A_card, B_card, A_ph, B_ph, (W, H))
        al = np.asarray(t)[..., 3] > 100
        img = np.asarray(ph).copy()
        img[thick(outline(full))] = (0, 255, 0)
        img[thick(outline(al))] = col
        return Image.fromarray(img), al

    p0 = np.asarray(ph).copy()
    p0[thick(outline(full))] = (0, 255, 0)
    p1, al1 = panel(cur_p, (255, 0, 255))
    p2, al2 = panel(mea_p, (0, 255, 255))
    iou = lambda a, b: float((a & b).sum() / (a | b).sum())
    full_iou = {'current': iou(full, al1), 'measured': iou(full, al2)}

    # body-only diagnostics in % SL: measured vs current profile, in the snout-to-peduncle axis frame
    d = J['anatomy']['depthProfile']
    st = np.array(d['stations'], float)
    mt, mb = np.array(d['top']), np.array(d['bottom'])
    cur = np.array(json.load(open(curj_p)))
    tilt = -mouth / (1 - ped_u) * 100 * (1 - st / 100)         # axis height above the card centre line, % SL
    ct, cb = cur[:, 0] - tilt, cur[:, 1] + tilt
    fine = np.linspace(0, 100, 401)
    f = lambda y: np.interp(fine, st, y)
    top_m, bot_m, top_c, bot_c = f(mt), f(mb), f(ct), f(cb)
    inter = np.maximum(0, np.minimum(top_m, top_c) + np.minimum(bot_m, bot_c))
    union = np.maximum(top_m, top_c) + np.maximum(bot_m, bot_c)
    body_iou = float(inter.sum() / union.sum())
    # contour error: vertical distance between the two edges at the 21 stations (ends 0 and 100 left out: tips are noisy)
    e = np.abs(np.concatenate([mt[1:-1] - ct[1:-1], mb[1:-1] - cb[1:-1]]))
    res = {'bodyIoU': round(body_iou, 3), 'meanErrPctSL': round(float(e.mean()), 2), 'p95ErrPctSL': round(float(np.percentile(e, 95)), 2),
           'maxErrPctSL': round(float(e.max()), 2),
           'meanDepthPctSL': {'photoTop': round(float(mt.mean()), 1), 'photoBottom': round(float(mb.mean()), 1),
                              'modelTop': round(float(ct.mean()), 1), 'modelBottom': round(float(cb.mean()), 1)},
           'wholeFishSilhouetteIoU_vs_photoMask': {k: round(v, 3) for k, v in full_iou.items()}}
    print(json.dumps(res))

    # unrotate (axis frame, % SL) back into photo pixels
    ang = np.radians(J['method']['rotationDeg'])
    SL = J['anatomy']['slPx']
    snx, sny = lm['snoutPxOriginal']

    def poly(top, bot):
        t_, b_ = [], []
        for s_, a, b in zip(st, top, bot):
            dx = -s_ / 100 * SL
            for arr, dy in ((t_, -a / 100 * SL), (b_, b / 100 * SL)):
                c, sn = np.cos(ang), np.sin(ang)
                arr.append((snx + c * dx - sn * dy, sny + sn * dx + c * dy))
        return t_ + b_[::-1] + [t_[0]]

    Z = 2
    x0, y0, x1, y1 = 15, 180, 585, 390
    crop = ph.crop((x0, y0, x1, y1)).resize(((x1 - x0) * Z, (y1 - y0) * Z), Image.LANCZOS)
    dr = ImageDraw.Draw(crop)
    tr = lambda pts: [((x - x0) * Z, (y - y0) * Z) for x, y in pts]
    dr.line(tr(poly(mt, mb)), fill=(0, 255, 0), width=3)          # measured body (green)
    dr.line(tr(poly(ct, cb)), fill=(255, 0, 255), width=3)        # current plan body (magenta)
    sheet = Image.new('RGB', (crop.width, crop.height + 40), (20, 24, 28))
    sheet.paste(crop, (0, 40))
    d2 = ImageDraw.Draw(sheet)
    d2.text((8, 6), 'orchiddottyback BODY ONLY (fins excluded), aligned snout / peduncle.  green = measured from the photo   magenta = current model (plan)', fill=(230, 235, 240))
    d2.text((8, 22), 'body IoU %.2f | contour error mean %.1f %% SL, p95 %.1f %% SL (21 stations) | photo supplied by Nathan (not in repo)' % (body_iou, e.mean(), np.percentile(e, 95)), fill=(230, 235, 240))
    sheet.save(out_p)

    # side by side: photo | current card | measured-outline card, cards scaled so TL matches the photo's TL
    TL = J['anatomy']['tlPx']
    def card_on(pth):
        c = Image.open(pth).convert('RGBA'); k = TL / c.width
        c = c.resize((round(TL), round(c.height * k)), Image.LANCZOS)
        bg = Image.new('RGB', (W, H), (0, 0, 0)); cx = round(lm['snoutPx'][0] - TL) ; bg.paste(c, (cx, round(sny - c.height / 2 - 0)), c); return bg
    row = Image.new('RGB', (W * 3, 230 + 30), (20, 24, 28))
    for i, (im, t) in enumerate(((ph, 'photo'), (card_on(cur_p), 'current model'), (card_on(mea_p), 'measured body as Plan.outline'))):
        row.paste(im.crop((0, 170, W, 400)), (i * W, 30)); ImageDraw.Draw(row).text((i * W + 8, 8), 'orchiddottyback | ' + t, fill=(230, 235, 240))
    row.save(out_p.replace('.png', '-sidebyside.png'))


if __name__ == '__main__':
    main()
