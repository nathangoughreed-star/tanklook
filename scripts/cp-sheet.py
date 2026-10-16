# python scripts/cp-sheet.py <out> <pre> <view: front|q> <plant>... -> one sheet, a row per plant: growth 0 / 0.5 / 1
import sys
from PIL import Image, ImageDraw
out, pre, view, *ps = sys.argv[1:]
W, H = 400, 320
S = Image.new('RGB', (W * 3, (H + 18) * len(ps)), 'white'); d = ImageDraw.Draw(S)
for j, p in enumerate(ps):
    d.text((6, j * (H + 18) + 3), f'{p}: growth 0 / 0.5 / 1 ({view})', fill='black')
    for i, g in enumerate([0, 50, 100]):
        im = Image.open(f'shots/{pre}_{p}_g{g}_{view}.png').convert('RGB'); im.thumbnail((W, H)); S.paste(im, (i * W, j * (H + 18) + 18))
S.save(out)
