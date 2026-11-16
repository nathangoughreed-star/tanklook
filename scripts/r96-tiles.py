# R96: baked picker tiles from the model shots: transparent webp per stand -> public/gallery/stands/<id>.webp
import json, os
import numpy as np
from PIL import Image
Q = set('aqueon-cabinet-30 tongmo-10 imagitarium-brooklyn-29 imagitarium-brooklyn-40 imagitarium-brooklyn-55 imagitarium-brooklyn-10 likeem-40 imagitarium-newport-29 vibrant-life-walnut-20 seapora-roman-36 mewsden-40 caitec-titaneze-10 tetra-wood-5-10 snughome-10 aqueon-metal-10'.split())
os.makedirs('public/gallery/stands', exist_ok=True); tot = 0
for s in json.load(open('src/data/gear/stands.json')):
    i = s['id']; f = f'scratch/r96/{i}_q26.jpg' if i in Q else f'scratch/r96/{i}_0.jpg'
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(int); bgs = [a[-4, 4], a[4, 4]]
    d = np.minimum(*[np.abs(a - b).sum(2) for b in bgs]); m = d > 38
    ys, xs = np.nonzero(m); box = (max(0, xs.min() - 6), max(0, ys.min() - 6), min(im.width, xs.max() + 6), min(im.height, ys.max() + 6))
    rgba = np.dstack([a, np.where(m, 255, 0)]).astype('uint8'); out = Image.fromarray(rgba, 'RGBA').crop(box)
    out.thumbnail((220, 160)); out.save(f'public/gallery/stands/{i}.webp', quality=78, method=6); tot += os.path.getsize(f'public/gallery/stands/{i}.webp')
print(len(os.listdir('public/gallery/stands')), 'tiles', tot // 1024, 'KB')
