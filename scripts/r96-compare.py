# R96: photo (left) vs our model (right) for every catalogue stand -> research/screens/SP1/compare/<id>.jpg
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
Q = set('aqueon-cabinet-30 tongmo-10 imagitarium-brooklyn-29 imagitarium-brooklyn-40 imagitarium-brooklyn-55 imagitarium-brooklyn-10 likeem-40 imagitarium-newport-29 seapora-roman-36 mewsden-40 caitec-titaneze-10 tetra-wood-5-10 snughome-10 aqueon-metal-10'.split())
PHOTO = json.load(open('scratch/photo_choice.json')) if os.path.exists('scratch/photo_choice.json') else {}
os.makedirs('research/screens/SP1/compare', exist_ok=True)
def crop(im, bg, thr):
    a = np.asarray(im.convert('RGB')).astype(int); m = (np.abs(a - np.array(bg)).sum(2) > thr)
    ys, xs = np.nonzero(m); pad = 12
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
H = 520
for s in json.load(open('src/data/gear/stands.json')):
    i = s['id']; ph = sorted(glob.glob(f'research/screens/SP1/ref/{i}-*.jpg'))
    mf = f'scratch/r96/{i}_q26.jpg' if i in Q else f'scratch/r96/{i}_0.jpg'
    if not os.path.exists(mf): continue
    model = Image.open(mf).convert('RGB'); arr = np.asarray(model).astype(int); bgs = [arr[-4, 4], arr[4, 4]]
    mm = np.minimum(*[np.abs(arr - b).sum(2) for b in bgs]) > 45; ys, xs = np.nonzero(mm)
    model = model.crop((max(0, xs.min() - 12), max(0, ys.min() - 12), min(model.width, xs.max() + 12), min(model.height, ys.max() + 12)))
    if ph:
        p = Image.open(ph[PHOTO.get(i, 0)]).convert('RGB'); p = crop(p, (255, 255, 255), 30)
    else:
        p = Image.new('RGB', (520, H), (245, 245, 245)); ImageDraw.Draw(p).text((150, 250), 'no product photo found', fill=(120, 0, 0))
    p = p.resize((int(p.width * H / p.height), H)); model = model.resize((int(model.width * H / model.height), H))
    c = Image.new('RGB', (p.width + model.width + 30, H + 24), 'white'); c.paste(p, (0, 24)); c.paste(model, (p.width + 30, 24))
    ImageDraw.Draw(c).text((4, 6), f'{i}   photo (left) vs our model (right)', fill=(0, 0, 0))
    c.save(f'research/screens/SP1/compare/{i}.jpg', quality=88)
    print(i, c.size)
