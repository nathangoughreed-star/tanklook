# HG1: crop the tank interior out of each type's front shot and stack them into one sheet (labelled), for review.
# python research/screens/HG1/montage.py <shots dir> <out.png> [type,type,...] [width]
import sys, os
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
types = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] else None
W = int(sys.argv[4]) if len(sys.argv) > 4 else 900
rows = []
for f in sorted(os.listdir(src)):
  if not f.endswith('.png') or '-front' not in f: continue
  t = f.split('-front')[0]
  if types and t not in types: continue
  im = Image.open(os.path.join(src, f)).convert('RGB'); w, h = im.size
  c = im.crop((int(w * 0.05), int(h * 0.27), int(w * 0.95), int(h * 0.75)))
  c = c.resize((W, int(c.size[1] * W / c.size[0])))
  d = ImageDraw.Draw(c); d.rectangle((0, 0, 110, 18), fill=(0, 0, 0)); d.text((4, 3), t, fill=(255, 255, 255))
  rows.append((types.index(t) if types else 0, t, c))
rows.sort(key=lambda r: (r[0], r[1]))
H = sum(r[2].size[1] for r in rows)
sheet = Image.new('RGB', (W, H), (20, 20, 20)); y = 0
for _, _, c in rows: sheet.paste(c, (0, y)); y += c.size[1]
sheet.save(out); print(out, sheet.size)
