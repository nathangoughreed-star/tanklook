# usage: python scripts/ss2-sheet.py <id> [seeds...] -> shots/ss2_sheet_<id>.png (one row per style, the seeds side by side)
import sys
from PIL import Image, ImageDraw
sid, seeds = sys.argv[1], sys.argv[2:] or ['1', '7', '23']
ims = [Image.open(f'shots/ss2_{sid}_{s}.png').convert('RGB') for s in seeds]
h = 560; ims = [im.resize((int(im.width * h / im.height), h)) for im in ims]
sheet = Image.new('RGB', (sum(i.width for i in ims) + 6 * (len(ims) - 1), h + 24), 'white'); x = 0
d = ImageDraw.Draw(sheet)
for im, s in zip(ims, seeds):
    sheet.paste(im, (x, 24)); d.text((x + 4, 6), f'{sid}  seed {s}', fill='black'); x += im.width + 6
sheet.save(f'shots/ss2_sheet_{sid}.png')
