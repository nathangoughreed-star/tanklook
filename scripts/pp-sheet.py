# python scripts/pp-sheet.py <species> [pre] -> shots/<pre>_<species>_sheet.png (rows: front, q; columns: growth 0 / 50 / 100)
import sys
from PIL import Image, ImageDraw
sp = sys.argv[1]; pre = sys.argv[2] if len(sys.argv) > 2 else 'pp'
gs = [0, 50, 100]; vs = ['front', 'q']; W = 420; H = 360
S = Image.new('RGB', (W * 3, H * 2 + 24), 'white'); d = ImageDraw.Draw(S)
d.text((6, 6), f'{sp} ({pre}): growth 0 / 0.5 / 1; front, 3/4', fill='black')
for j, v in enumerate(vs):
    for i, g in enumerate(gs):
        im = Image.open(f'shots/{pre}_{sp}_g{g}_{v}.png').convert('RGB'); im.thumbnail((W, H)); S.paste(im, (i * W, 24 + j * H))
S.save(f'shots/{pre}_{sp}_sheet.png')
