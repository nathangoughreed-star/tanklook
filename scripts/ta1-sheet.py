# TA1: contact sheet of tiles. usage: python scripts/ta1-sheet.py <out.jpg> <cols> <dir> [dir...]  (labels = file stems; grey-checker free: tiles on a mid-grey card)
import sys, os, glob
from PIL import Image, ImageDraw
out, cols, dirs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
files = sorted(f for d in dirs for f in glob.glob(os.path.join(d, '*.webp')))
ims = [(os.path.splitext(os.path.basename(f))[0], Image.open(f).convert('RGBA')) for f in files]
cw, ch = 300, 250; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw, rows * ch), (226, 228, 230)); d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(ims):
    x, y = (i % cols) * cw, (i // cols) * ch
    t = im.copy(); t.thumbnail((cw - 20, ch - 40)); sheet.paste(t, (x + (cw - t.width) // 2, y + 8), t)
    d.text((x + 8, y + ch - 22), name, fill=(40, 40, 40))
sheet.save(out, quality=88); print(len(ims), 'tiles ->', out)
