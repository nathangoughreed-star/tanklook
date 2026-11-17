# VT1: baked Tank-workspace tiles from the viewer shots: scratch/vt1/<key>.jpg (scripts/vt1-shot.ts) -> public/gallery/tank-ui/<key>.webp, 192x144.
# Usage: python scripts/vt1-tiles.py [--sheet path.jpg]   (--sheet also writes a contact sheet of the results)
import os, glob, sys
from PIL import Image
W, H = 192, 144
os.makedirs('public/gallery/tank-ui', exist_ok=True); tot = 0; ims = []
for f in sorted(glob.glob('scratch/vt1/*.jpg')):
    im = Image.open(f).convert('RGB'); k = os.path.basename(f)[:-4]
    s = max(W / im.width, H / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2; im = im.crop((l, t, l + W, t + H))
    o = f'public/gallery/tank-ui/{k}.webp'; im.save(o, quality=74, method=6); tot += os.path.getsize(o); ims.append(im)
print(len(ims), 'tiles', tot // 1024, 'KB')
if '--sheet' in sys.argv:
    out = sys.argv[sys.argv.index('--sheet') + 1]; cols = 5; rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGB', (cols * W, rows * H), (40, 40, 40))
    for i, im in enumerate(ims): sh.paste(im, ((i % cols) * W, (i // cols) * H))
    sh.save(out, quality=80)
