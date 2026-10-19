# Lane TG: lay the gear close-ups (shots/tg_m_*_{front,34}.png) out as one sheet per batch, front | 3/4 per model, labelled.
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
names = sorted({os.path.basename(p)[5:].rsplit('_', 1)[0] for p in glob.glob('shots/tg_m_*_front.png')})
if len(sys.argv) > 1: names = [n for n in names if n in sys.argv[1:]]
W = 420; TH = 525; rows = []
for n in names:
    ims = [Image.open(f'shots/tg_m_{n}_{v}.png').convert('RGB') for v in ('front', '34')]
    ims = [im.resize((W, TH)) for im in ims]
    h = max(i.height for i in ims); row = Image.new('RGB', (2 * W + 10, h + 28), 'white')
    for k, im in enumerate(ims): row.paste(im, (k * (W + 10), 28))
    ImageDraw.Draw(row).text((6, 6), n, fill='black', font=ImageFont.truetype('arial.ttf', 18))
    rows.append(row)
cols = 3; out = []
for i in range(0, len(rows), 6):
    batch = rows[i:i + 6]; rw = batch[0].width; rh = [max(r.height for r in batch[j:j + cols]) for j in range(0, len(batch), cols)]
    sheet = Image.new('RGB', (cols * rw + (cols - 1) * 12, sum(rh) + 12 * len(rh)), 'white'); y = 0
    for j in range(0, len(batch), cols):
        for k, r in enumerate(batch[j:j + cols]): sheet.paste(r, (k * (rw + 12), y))
        y += rh[j // cols] + 12
    p = f'shots/tg_sheet_{i // 6 + 1}.png'; sheet.save(p); out.append(p)
print(' '.join(out))
