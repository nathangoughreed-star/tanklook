# python scripts/js-sheet.py <out> <title> <cols> name1:label1 name2:label2 ... -> shots/<out>.jpg (lane JS review sheets, from spider-lab.html)
import sys
from PIL import Image, ImageDraw
out, title, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]); items = [a.split(':', 1) for a in sys.argv[4:]]
W, H = 640, 480; rows = (len(items) + cols - 1) // cols
S = Image.new('RGB', (W * cols, H * rows + 28), '#101820'); d = ImageDraw.Draw(S); d.text((8, 8), title, fill='white')
for i, (n, lab) in enumerate(items):
    im = Image.open(f'shots/{n}.png').convert('RGB').resize((W, H)); x, y = (i % cols) * W, 28 + (i // cols) * H
    S.paste(im, (x, y)); d.text((x + 8, y + 6), lab, fill='white')
S.save(f'shots/{out}.jpg', quality=88)
