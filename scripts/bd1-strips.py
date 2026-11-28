"""Lane BD1 (R199): before / after strips of the 3D backdrop, one row per style (close-up), plus the front views.
python scripts/bd1-strips.py  ->  research/screens/BD1/strips-close.png, strips-front.png"""
import os
from PIL import Image, ImageDraw, ImageFont

D = 'research/screens/BD1'
KINDS = ['rock', 'rockblock', 'cork', 'corkplate', 'river', 'reef', 'moss', 'jungle']
BASE = {'rockblock': 'rock', 'corkplate': 'cork'}  # new options: shown beside the style they grew from
NAMES = {'rock': 'Rock wall', 'cork': 'Cork bark', 'river': 'River stones', 'reef': 'Live rock wall', 'moss': 'Moss mat', 'jungle': 'Jungle leaves', 'rockblock': 'Rock blocks (new)', 'corkplate': 'Cork plates (new)'}
try:
    F = ImageFont.truetype('arial.ttf', 26)
except OSError:
    F = ImageFont.load_default()


def sheet(view, out, w=620):
    rows = []
    for k in KINDS:
        pics = [os.path.join(D, 'before', f"{BASE.get(k, k)}-{view}-none.png"), os.path.join(D, 'after', f'{k}-{view}-none.png')]
        if not all(os.path.exists(p) for p in pics):
            continue
        ims = [Image.open(p).convert('RGB') for p in pics]
        ims = [im.resize((w, round(im.height * w / im.width))) for im in ims]
        h = ims[0].height
        row = Image.new('RGB', (2 * w + 30, h + 40), (24, 26, 30))
        dr = ImageDraw.Draw(row)
        for i, (im, lab) in enumerate(zip(ims, (f'{NAMES[BASE.get(k, k)]} before', 'after (BD1)'))):
            row.paste(im, (10 + i * (w + 10), 36))
            dr.text((14 + i * (w + 10), 4), lab if i == 0 else f'{NAMES[k]}: {lab}', fill=(235, 235, 235), font=F)
        rows.append(row)
    if not rows:
        return
    out_im = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)), (24, 26, 30))
    y = 0
    for r in rows:
        out_im.paste(r, (0, y)); y += r.height
    out_im.save(os.path.join(D, out))
    print('saved', out, out_im.size)


sheet('at-300-230-400-3-0-3', 'strips-close.png')
sheet('front', 'strips-front.png', w=520)
