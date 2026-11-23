"""Sample a photo-built fish's eye colours from its own sheet and write them into the spec (Nathan, 2026-11-23: every photo
fish had the same amber iris, hard-coded in photofish.ts).
  spec['eye'] = [x, y, r] on the sheet (panel 1). Eye radius R = 1.35 r (EYE_K); pupil edge rp = where the per-radius median
  luminance rises 40% of the way to the brightest ring; pupil colour = median inside 0.7 rp; iris = the inner ring 1.15 rp..1.7 rp (lower part),
  split by brightness: iris[0] = the bright tone (70th percentile pixel), iris[1] = the dark tone (30th percentile). Writes
  spec['eye_iris'] = [bright, dark] and spec['eye_pupil'] as '#rrggbb', spec['eye_full'] (visible eye radius, px) and
  spec['eye_pupil_frac'] (pupil / eye radius); fish-build.py passes them to render.photo, fish3d.ts fits the eye dome to them.
Usage: python fish-eye-colour.py <spec.json> [more specs...] [--swatch out.png]"""
import sys, json, numpy as np
from PIL import Image, ImageDraw


def hexc(c): return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


EYE_K = 1.35   # spec['eye'] r (the row-5 white disc) reads ~0.74 of the drawn eye: by eye 1.25-1.45x on 5 sheets (2026-11-23); an
               # automatic outer-edge finder was tried and overshot or undershot on 4 of 5, so the measured pupil + this factor it is


def sample(spec):
    x, y, r = spec['eye']; a = np.asarray(Image.open(spec['sheet']).convert('RGB')).astype(float); R = EYE_K * r
    ang = np.linspace(0, 2 * np.pi, 72, endpoint=False); rs = np.arange(0, int(1.6 * r) + 1)   # pupil edge: per-radius median luminance
    X = (x + np.outer(rs, np.cos(ang))).round().astype(int).clip(0, a.shape[1] - 1); Y = (y + np.outer(rs, np.sin(ang))).round().astype(int).clip(0, a.shape[0] - 1)
    lum = np.median(a[Y, X], axis=1) @ [0.299, 0.587, 0.114]; p0 = lum[:max(2, int(.3 * r))].mean()
    rp = max(2, int(np.argmax(lum > p0 + 0.4 * (lum.max() - p0))))
    yy, xx = np.mgrid[int(y - R):int(y + R) + 1, int(x - R):int(x + R) + 1]; d = np.hypot(xx - x, yy - y)
    px = a[yy.clip(0, a.shape[0] - 1), xx.clip(0, a.shape[1] - 1)]
    pupil = np.median(px[d < 0.7 * rp], 0)
    # iris = the inner ring 1.15 rp..1.7 rp, lower ~2/3 only: a stripe across the top of the eye (cardinal) is not iris, and a wider ring
    # reaches the skin (the 1.35 r eye edge is approximate: 85th / 45th percentiles over 0.9 R read the discus brown, cardinal 1 salmon)
    ring = px[(d >= 1.15 * rp) & (d <= 1.7 * rp) & (yy >= y - 0.3 * R)]
    lum = ring @ [0.299, 0.587, 0.114]; o = np.argsort(lum)
    bright, dark = ring[o[int(0.7 * (len(o) - 1))]], ring[o[int(0.3 * (len(o) - 1))]]
    return hexc(bright), hexc(dark), hexc(pupil), round(R), round(rp / R, 3)


def main(args):
    sw = None
    if '--swatch' in args: i = args.index('--swatch'); sw = args[i + 1]; args = args[:i] + args[i + 2:]
    rows = []
    for p in args:
        s = json.load(open(p)); b, d, pu, R, pf = sample(s); s['eye_iris'] = [b, d]; s['eye_pupil'] = pu; s['eye_full'] = R; s['eye_pupil_frac'] = pf
        json.dump(s, open(p, 'w'), indent=1); rows.append((s['id'], s, b, d, pu)); print('%-12s iris %s / %s  pupil %s  eye r %d px, pupil %.2f of it' % (s['id'], b, d, pu, R, pf))
    if sw:   # sheet eye crop beside the three sampled colours, one row per fish
        out = Image.new('RGB', (420, 110 * len(rows)), (20, 20, 20)); dr = ImageDraw.Draw(out)
        for k, (i, s, b, d, pu) in enumerate(rows):
            x, y, r = s['eye']; im = Image.open(s['sheet']).convert('RGB').crop((x - 2 * r, y - 2 * r, x + 2 * r, y + 2 * r)).resize((100, 100))
            out.paste(im, (5, 5 + 110 * k)); dr.text((115, 8 + 110 * k), i, fill='white')
            for j, c in enumerate((b, d, pu)): dr.rectangle((115 + 95 * j, 30 + 110 * k, 200 + 95 * j, 100 + 110 * k), fill=c); dr.text((118 + 95 * j, 32 + 110 * k), c, fill='white' if j else 'black')
        out.save(sw)


if __name__ == '__main__':
    main(sys.argv[1:])
