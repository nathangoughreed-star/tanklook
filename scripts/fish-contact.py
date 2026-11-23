"""Contact sheet for a build-B fish (method row 44): the sheet's row 1 beside the six views and the tail-base close-up made by
scripts/fish-shots.js, each cropped to the fish. With --compare A B: the given views (default tail) with tag A left, tag B right.
Usage: python fish-contact.py <id> --sheet <sheet.webp> [--shots shots] [--tag T] [--out file.jpg]
       python fish-contact.py <id> --compare before after [--views tail,side] [--out file.jpg]"""
import sys, os, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = [('side', 'left side'), ('other', 'right side'), ('q34', 'front 3/4'), ('rear34', 'rear 3/4'), ('front', 'head-on'), ('top', 'top'), ('tail', 'tail base')]


def crop(im, pad=14):
    a = np.asarray(im).astype(int); m = np.abs(a - a[2, 2]).sum(2) > 40; ys, xs = np.where(m)
    if not len(xs): return im
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))


def row1(sheet):
    import fishsheet as fs
    a, M = fs.load(sheet); b = fs.panel_bands(M)[0]; x0, x1, y0, y1 = fs.box(M, *b)
    return Image.open(sheet).convert('RGB').crop((max(0, x0 - 10), max(0, y0 - 10), x1 + 10, y1 + 10))


def lay(rows, title, H, out):
    W = max(sum(im.width + 12 for _, im in r) for r in rows) + 10
    cs = Image.new('RGB', (W, len(rows) * (H + 30) + 34), (30, 30, 30)); d = ImageDraw.Draw(cs); d.text((10, 8), title, fill=(255, 255, 255))
    y = 30
    for r in rows:
        x = 10
        for t, im in r: d.text((x, y + 2), t, fill=(255, 255, 0)); cs.paste(im, (x, y + 18)); x += im.width + 12
        y += H + 30
    cs.save(out, quality=85); print('wrote', out, cs.size)


def fit(im, H): return im.resize((max(1, int(im.width * H / im.height)), H))


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith('--')}
    ID = argv[0]; D = opt.get('--shots', os.path.join(ROOT, 'shots')); H = 260
    if '--compare' in argv:
        i = argv.index('--compare'); A, B = argv[i + 1], argv[i + 2]
        rows = []
        for v in opt.get('--views', 'tail').split(','):
            ims = [Image.open(os.path.join(D, f'{ID}-{v}-{t}.png')).convert('RGB') for t in (A, B)]
            if v != 'tail': ims = [crop(im) for im in ims]
            rows.append([(f'{v}: {A}', fit(ims[0], H)), (f'{v}: {B}', fit(ims[1], H))])
        return lay(rows, f'{ID}: {A} (left) vs {B} (right)', H, opt.get('--out', os.path.join(D, f'{ID}-{A}-vs-{B}.jpg')))
    tag = ('-' + opt['--tag']) if '--tag' in opt else ''
    tiles = [('ChatGPT sheet row 1', row1(opt['--sheet']))] if '--sheet' in opt else []
    for v, t in ORDER:
        p = os.path.join(D, f'{ID}-{v}{tag}.png')
        if os.path.exists(p): tiles.append((t, Image.open(p).convert('RGB') if v == 'tail' else crop(Image.open(p).convert('RGB'))))
    tiles = [(t, fit(im, H)) for t, im in tiles]
    lay([tiles[:4], tiles[4:]], f'{ID} build B{(" [" + opt["--tag"] + "]") if tag else ""}', H, opt.get('--out', os.path.join(D, f'{ID}-views{tag}.jpg')))


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
