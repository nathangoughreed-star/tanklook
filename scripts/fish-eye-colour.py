"""Sample a photo-built fish's eye colours from its own sheet and write them into the spec (Nathan, 2026-11-23: every photo
fish had the same amber iris, hard-coded in photofish.ts).
  spec['eye'] = [x, y, r] on the sheet (panel 1). Pupil = median colour of the disc r < 0.3; iris = the annulus 0.5 r..0.95 r,
  split by brightness: iris[0] = the bright tone (75th percentile pixel), iris[1] = the dark tone (25th percentile). Writes
  spec['eye_iris'] = [bright, dark] and spec['eye_pupil'] as '#rrggbb'; fish-build.py passes them to render.photo.
Usage: python fish-eye-colour.py <spec.json> [more specs...] [--swatch out.png]"""
import sys, json, numpy as np
from PIL import Image, ImageDraw


def hexc(c): return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


def sample(spec):
    x, y, r = spec['eye']; a = np.asarray(Image.open(spec['sheet']).convert('RGB')).astype(float)
    yy, xx = np.mgrid[y - r:y + r + 1, x - r:x + r + 1]; d = np.hypot(xx - x, yy - y) / max(r, 1)
    px = a[yy.clip(0, a.shape[0] - 1), xx.clip(0, a.shape[1] - 1)]
    pupil = np.median(px[d < 0.3], 0)
    ring = px[(d >= 0.5) & (d <= 0.95)]; lum = ring @ [0.299, 0.587, 0.114]; o = np.argsort(lum)
    bright, dark = ring[o[int(0.75 * (len(o) - 1))]], ring[o[int(0.25 * (len(o) - 1))]]
    return hexc(bright), hexc(dark), hexc(pupil)


def main(args):
    sw = None
    if '--swatch' in args: i = args.index('--swatch'); sw = args[i + 1]; args = args[:i] + args[i + 2:]
    rows = []
    for p in args:
        s = json.load(open(p)); b, d, pu = sample(s); s['eye_iris'] = [b, d]; s['eye_pupil'] = pu
        json.dump(s, open(p, 'w'), indent=1); rows.append((s['id'], s, b, d, pu)); print('%-12s iris %s / %s  pupil %s' % (s['id'], b, d, pu))
    if sw:   # sheet eye crop beside the three sampled colours, one row per fish
        out = Image.new('RGB', (420, 110 * len(rows)), (20, 20, 20)); dr = ImageDraw.Draw(out)
        for k, (i, s, b, d, pu) in enumerate(rows):
            x, y, r = s['eye']; im = Image.open(s['sheet']).convert('RGB').crop((x - 2 * r, y - 2 * r, x + 2 * r, y + 2 * r)).resize((100, 100))
            out.paste(im, (5, 5 + 110 * k)); dr.text((115, 8 + 110 * k), i, fill='white')
            for j, c in enumerate((b, d, pu)): dr.rectangle((115 + 95 * j, 30 + 110 * k, 200 + 95 * j, 100 + 110 * k), fill=c); dr.text((118 + 95 * j, 32 + 110 * k), c, fill='white' if j else 'black')
        out.save(sw)


if __name__ == '__main__':
    main(sys.argv[1:])
