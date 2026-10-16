# Lane T1 review sheets: lay shots/<names> out in rows with labels. python scripts/t1-sheet.py out.png title "a|label" ...
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, items = sys.argv[1], sys.argv[2], sys.argv[3:]
rows = [[c.split('=') for c in it.split(',')] for it in items]  # row: "name=label,name=label"
W = 1400; f = ImageFont.truetype('arial.ttf', 22); ft = ImageFont.truetype('arialbd.ttf', 28)
ims = []
for row in rows:
    pics = [Image.open(f'shots/{n}.png').convert('RGB') for n, _ in row]
    h = 420; pics = [p.resize((round(p.width * h / p.height), h)) for p in pics]
    k = min(1, (W - 10 * (len(pics) + 1)) / sum(p.width for p in pics)); pics = [p.resize((round(p.width * k), round(p.height * k))) for p in pics]
    ims.append((pics, [l for _, l in row]))
H = 60 + sum(p[0][0].height + 44 for p in ims)
sheet = Image.new('RGB', (W, H), '#f4f1ea'); d = ImageDraw.Draw(sheet); d.text((12, 14), title, fill='#222', font=ft)
y = 60
for pics, labels in ims:
    x = 10
    for p, l in zip(pics, labels):
        sheet.paste(p, (x, y + 34)); d.text((x, y + 6), l, fill='#333', font=f); x += p.width + 10
    y += pics[0].height + 44
sheet.save(out)
