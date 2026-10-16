# python scripts/bp-sheet.py <out> <title> <cols> name1:label1 name2:label2 ... -> shots/<out>.jpg (lane BP review sheets, from shots/<name>.png)
import sys
from PIL import Image, ImageDraw
out, title, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]); items = [a.split(':', 1) for a in sys.argv[4:]]
W, H = 620, 400; rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + 26) + 40), (24, 28, 33)); d = ImageDraw.Draw(sheet)
d.text((10, 12), title, fill=(235, 235, 235))
for i, (n, label) in enumerate(items):
    im = Image.open(f'shots/{n}.png').convert('RGB'); im.thumbnail((W - 8, H - 4))
    x, y = (i % cols) * W, 40 + (i // cols) * (H + 26)
    sheet.paste(im, (x + 4 + (W - 8 - im.width) // 2, y + 2 + (H - 4 - im.height) // 2)); d.text((x + 8, y + H + 4), label, fill=(210, 210, 210))
sheet.save(f'shots/{out}.jpg', quality=90)
