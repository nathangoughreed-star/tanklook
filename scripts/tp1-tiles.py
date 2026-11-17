# TP1: baked picker tiles from the model shots: scratch/tp1/<key>.jpg (scripts/tp1-shot.ts) -> public/gallery/tanks/<key>.webp, 128x96, opaque.
import os, glob
import numpy as np
from PIL import Image
W, H = 128, 96
os.makedirs('public/gallery/tanks', exist_ok=True); tot = 0; n = 0
for f in sorted(glob.glob('scratch/tp1/*.jpg')):
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(int); bg = a[3, 3]
    m = np.abs(a - bg).sum(2) > 30; ys, xs = np.nonzero(m)
    pad = 8; box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad))
    c = im.crop(box); c.thumbnail((W - 8, H - 8), Image.LANCZOS)
    out = Image.new('RGB', (W, H), tuple(int(v) for v in bg)); out.paste(c, ((W - c.width) // 2, (H - c.height) // 2))
    o = 'public/gallery/tanks/' + os.path.basename(f)[:-4] + '.webp'; out.save(o, quality=72, method=6); tot += os.path.getsize(o); n += 1
print(n, 'tiles', tot // 1024, 'KB', 'bg', tuple(int(v) for v in bg))
