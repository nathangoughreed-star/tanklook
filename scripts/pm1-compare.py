# PM1 (R98): product photo (left) vs our model (right) for each hood / NICREW light look -> research/screens/PM1/compare/<look>.jpg
# Model stills come from scripts/pm1-shot.ts `still(id, yaw, pitch)` (saved by scripts/pm1-save-server.mjs to scratch/pm1/<id>_<tag>.png).
import os, sys
import numpy as np
from PIL import Image, ImageDraw
# look -> (shared product ids, photo, model still tag)
LOOKS = {
    'hood-aqueon': ('aqueon-led-hood-24', 'aqueon-hood-2.jpg', 's'),
    'hood-marineland': ('marineland-led-hood-30x12', 'marineland-hood-2.jpg', 's'),
    'hood-topfin': ('topfin-led-hood-24', 'topfin-hood-1.jpg', 's'),
    'hood-tetra': ('tetra-led-hood-20', 'tetra-hood-2.jpg', 's'),
    'hood-imagitarium': ('imagitarium-led-hood-24', 'imagitarium-hood-2.jpg', 's'),
    'nicrew-c10': ('nicrew-c10-18-24', 'nicrew-c10-1.jpg', 's'),
    'nicrew-classicled': ('nicrew-classicled-36-48', 'nicrew-classicled-1.jpg', 's'),
    'nicrew-hyperreef': ('nicrew-hyperreef-100-g2', 'nicrew-hyperreef100-1.jpg', 's'),
    'nicrew-navareef': ('nicrew-navareef-65', 'nicrew-navareef65-1.jpg', 's'),
}
os.makedirs('research/screens/PM1/compare', exist_ok=True)
H = 520
def crop_bg(im, thr=40):
    a = np.asarray(im.convert('RGB')).astype(int); m = np.abs(a - 255).sum(2) > thr
    ys, xs = np.nonzero(m); pad = 10
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
only = set(sys.argv[1:])
for name, (pid, photo, tag) in LOOKS.items():
    if only and name not in only: continue
    f = f'scratch/pm1/{pid}_{tag}.png'
    if not os.path.exists(f): print('missing model', f); continue
    m = Image.open(f).convert('RGBA'); a = np.asarray(m)[:, :, 3] > 12; ys, xs = np.nonzero(a)
    m = m.crop((max(0, xs.min() - 12), max(0, ys.min() - 12), min(m.width, xs.max() + 12), min(m.height, ys.max() + 12)))
    bg = Image.new('RGBA', m.size, (232, 232, 232, 255)); bg.alpha_composite(m); m = bg.convert('RGB')
    p = crop_bg(Image.open(f'research/screens/PM1/ref/{photo}').convert('RGB'))
    p = p.resize((int(p.width * H / p.height), H)); m = m.resize((int(m.width * H / m.height), H))
    c = Image.new('RGB', (p.width + m.width + 30, H + 24), 'white'); c.paste(p, (0, 24)); c.paste(m, (p.width + 30, 24))
    ImageDraw.Draw(c).text((4, 6), f'{name} ({pid})   photo (left) vs our model (right)', fill=(0, 0, 0))
    c.save(f'research/screens/PM1/compare/{name}.jpg', quality=88); print(name, c.size)
