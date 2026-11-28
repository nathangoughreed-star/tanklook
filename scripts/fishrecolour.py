"""Body-only recolour (harlequin rasbora, Nathan 2026-11-27: "the harlequen rasboras are too orange instead of silver").
A ChatGPT sheet can paint the whole fish one colour (the harlequin came out orange from snout to tail) while the real fish has a silver body and orange-red
fins. The spec's "sat" scales every pixel, fins included, so it cannot fix that. Spec "body_recolour" changes the BODY ONLY:
  {"sat": [front, rear],   chroma kept, snout -> peduncle (linear along SL); 0 = grey, 1 = unchanged
   "hue": deg,             hue turn of what chroma is left (positive = orange toward red / pink, negative = toward yellow / green)
   "lift": f,              brightness x f on the mid and bright tones only (silver reads lighter); dark marks (the black wedge) are left alone
   "feather": px,          soft edge of the body mask, full-resolution px (default 4)
   "ridge": [sat, frac]}   optional: the top frac of the body's depth (the back) keeps chroma sat instead (harlequin: copper along the back in photos);
                           the top view, which shows the back, takes this sat too
   "pectoral": sat}        optional: the pectoral fin (spec pectoral.poly, read from the fin card) gets this chroma too (harlequin: clear pectorals,
                           the sheet painted them orange and they showed as an orange blob on the silver flank)
Side panel: the mask is the body outline from the anatomy's depth profile (BODY ONLY, fins excluded), minus the eye. The 3D fins and the median fins
on the card keep the sheet's colour. Top and front panels: the whole fish in those rows (they show no fins but a tail stub).
Used by scripts/fish-build.py (side card before the cutout, top/front copy before fish-projcards). Method row 74."""
import numpy as np
from PIL import Image, ImageDraw


def _op(rgb, s, hue, lift):
    """rgb float 0..255 (..., 3); s scalar or (...) array; YIQ: scale + turn the chroma plane, lift the bright luma."""
    M = np.array([[0.299, 0.587, 0.114], [0.596, -0.274, -0.322], [0.211, -0.523, 0.312]])
    yiq = rgb @ M.T
    y, i, q = yiq[..., 0], yiq[..., 1], yiq[..., 2]
    t = np.radians(hue); c, sn = np.cos(t), np.sin(t)
    i2, q2 = (i * c - q * sn) * s, (i * sn + q * c) * s
    w = np.clip((y - 50) / 70, 0, 1); w = w * w * (3 - 2 * w)   # no lift below luma 50 (black wedge, eye), full lift above 120
    y2 = y * (1 + (lift - 1) * w)
    out = np.stack([y2, i2, q2], -1) @ np.linalg.inv(M).T
    return np.clip(out, 0, 255)


def body_mask(shape, A, eye, feather=4, scale=2.0):
    """Body outline from anatomy depthProfile (values are % SL from the level axis) in the full-resolution side image; eye cut out."""
    from scipy import ndimage as nd
    dp = A['depthProfile']; sx, ax = A['landmarks']['snoutPxOriginal']; sx, ax = sx * scale, ax * scale; sl = A['slPx'] * scale
    top = [(sx - st / 100 * sl, ax - t / 100 * sl) for st, t in zip(dp['stations'], dp['top'])]
    bot = [(sx - st / 100 * sl, ax + b / 100 * sl) for st, b in zip(dp['stations'], dp['bottom'])]
    im = Image.new('L', (shape[1], shape[0]), 0); ImageDraw.Draw(im).polygon(top + bot[::-1], fill=255)
    m = np.asarray(im).astype(float) / 255
    if eye:
        ex, ey, er = eye; yy, xx = np.ogrid[:shape[0], :shape[1]]
        m[(xx - ex) ** 2 + (yy - ey) ** 2 < (1.25 * er) ** 2] = 0
    return np.clip(nd.gaussian_filter(m, feather), 0, 1) if feather else m


def recolour_side(path, A, cfg, eye):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    m = body_mask(im.shape, A, eye, cfg.get('feather', 4))
    f, r = cfg.get('sat', [0.4, 0.4]) if isinstance(cfg.get('sat'), list) else [cfg.get('sat', 0.4)] * 2
    sx = A['landmarks']['snoutPxOriginal'][0] * 2; sl = A['slPx'] * 2
    u = np.clip((sx - np.arange(im.shape[1])) / sl, 0, 1)[None, :]   # 0 at the snout, 1 at the peduncle
    s = f + (r - f) * u
    if cfg.get('ridge'):   # copper back: blend to the ridge sat in the top frac of the local body depth
        rs, fr = cfg['ridge']; dp = A['depthProfile']; ax = A['landmarks']['snoutPxOriginal'][1] * 2
        st = (sx - np.arange(im.shape[1])) / sl * 100
        yt = ax - np.interp(st, dp['stations'], dp['top']) / 100 * sl; yb = ax + np.interp(st, dp['stations'], dp['bottom']) / 100 * sl
        v = np.clip((np.arange(im.shape[0])[:, None] - yt[None, :]) / np.maximum(yb - yt, 1)[None, :] / fr, 0, 1)
        w = 1 - v * v * (3 - 2 * v)
        s = s * (1 - w) + rs * w
    new = _op(im, s, cfg.get('hue', 0), cfg.get('lift', 1.0))
    out = im + (new - im) * m[..., None]
    Image.fromarray(out.astype(np.uint8)).save(path)
    return int((m > 0.5).sum())


def recolour_panels(src, dst, rows, cfg, thr=40):
    """Top / front panels: every fish pixel in the given row bands (the 3D eyes are drawn separately from the spec's iris colours)."""
    im = np.asarray(Image.open(src).convert('RGB')).astype(float)
    f, r = cfg.get('sat', [0.4, 0.4]) if isinstance(cfg.get('sat'), list) else [cfg.get('sat', 0.4)] * 2
    out = im.copy()
    for k, (y0, y1) in enumerate(rows):
        s = cfg['ridge'][0] if k == 0 and cfg.get('ridge') else (f + r) / 2   # rows[0] = the top view: the back
        band = im[y0:y1 + 1]
        new = _op(band, s, cfg.get('hue', 0), cfg.get('lift', 1.0))
        fish = (band.max(2) > thr)[..., None]
        out[y0:y1 + 1] = np.where(fish, new, band)
    Image.fromarray(out.astype(np.uint8)).save(dst)


def recolour_poly(src, dst, poly, sat, cfg, feather=3):
    """One fin on a copy of the side image (the fin card's source): chroma x sat, same hue turn and lift, inside the polygon (full-resolution px)."""
    from scipy import ndimage as nd
    im = np.asarray(Image.open(src).convert('RGB')).astype(float)
    mk = Image.new('L', (im.shape[1], im.shape[0]), 0); ImageDraw.Draw(mk).polygon([tuple(p) for p in poly], fill=255)
    m = nd.gaussian_filter(np.asarray(mk).astype(float) / 255, feather)
    new = _op(im, sat, cfg.get('hue', 0), cfg.get('lift', 1.0))
    Image.fromarray((im + (new - im) * m[..., None]).astype(np.uint8)).save(dst)
