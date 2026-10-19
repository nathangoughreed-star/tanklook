# Lane TG step 3: drawn-vs-photo sheets for the filter families and the kit heaters. Drawn = shots/tg_fc_<id>_{a,b}.png
# (scripts/tg-shots.js filterSheet) / shots/tg_hc_<id>.png (heaterSheet); photo = a capture of the product photo the
# colours were read from (argument: a JSON map id -> image file). Writes shots/tg_fsheet_<n>.png.
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
photos = json.load(open(sys.argv[1])); cat = json.load(open('src/data/gear-catalog.json', encoding='utf-8'))
names = {x['id']: f"{x['brand']} {x['model']}" for x in cat['filters'] + cat['heaters']}
font = ImageFont.truetype('arial.ttf', 17); small = ImageFont.truetype('arial.ttf', 13); H = 300
def fit(im, h=H): return im.resize((max(1, round(im.width * h / im.height)), h))
rows = []
for id, ph in photos.items():
    drawn = [f'shots/tg_fc_{id}_{v}.png' for v in 'ab'] + [f'shots/tg_hc_{id}.png']
    ims = [fit(Image.open(p).convert('RGB')) for p in drawn if os.path.exists(p)]
    if not ims: continue
    pim = Image.open(ph).convert('RGB'); g = pim.convert('L'); cols = [x for x in range(g.width) if sum(g.getpixel((x, y)) for y in range(0, g.height, 4)) / (g.height / 4) > 30]
    if cols: pim = pim.crop((cols[0], 0, cols[-1] + 1, pim.height))  # the screenshot's black letterbox off
    pim = fit(pim)
    w = sum(i.width for i in ims) + pim.width + 10 * len(ims) + 24
    row = Image.new('RGB', (w, H + 30), 'white'); d = ImageDraw.Draw(row); x = 0
    for i in ims: row.paste(i, (x, 30)); x += i.width + 10
    d.line([(x + 6, 30), (x + 6, H + 30)], fill='#c33', width=3); x += 14
    row.paste(pim, (x, 30))
    d.text((6, 5), names.get(id, id), fill='black', font=font); d.text((x + 4, 34), 'photo', fill='#c33', font=small)
    rows.append(row)
out = []
for k in range(0, len(rows), 6):
    b = rows[k:k + 6]; W = max(r.width for r in b)
    sh = Image.new('RGB', (W, sum(r.height + 12 for r in b)), 'white'); y = 0
    for r in b: sh.paste(r, (0, y)); y += r.height + 12
    p = f'shots/tg_fsheet_{k // 6 + 1}.png'; sh.save(p); out.append(p)
print(' '.join(out))
