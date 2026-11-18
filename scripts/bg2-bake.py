"""BG2: bake the four picture backgrounds from CC0 / public-domain photos (sources in research/design/backgrounds.md).
Usage: python scripts/bg2-bake.py <srcdir with reef1.jpg plant1.jpg rock_wall_08.jpg ganges_river_pebbles.jpg> <outdir>"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
W, H = 1600, 640
rs = np.random.RandomState(3)

def cover(im, box=None):
    im = im.convert('RGB')
    if box: iw, ih = im.size; im = im.crop((int(box[0]*iw), int(box[1]*ih), int(box[2]*iw), int(box[3]*ih)))
    k = max(W / im.width, H / im.height); im = im.resize((round(im.width*k), round(im.height*k)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))

def finish(im, name, blur, sat, bright, tint, vig=0.55, floor=0.5, top=0.0):
    im = im.filter(ImageFilter.GaussianBlur(blur)); im = ImageEnhance.Color(im).enhance(sat)
    a = np.asarray(im, np.float32) * bright * np.array(tint, np.float32)
    y, x = np.mgrid[0:H, 0:W]
    d = np.sqrt(((x - W/2) / (W/2)) ** 2 + ((y - H*0.45) / (H*0.75)) ** 2)
    a *= (1 - vig * np.clip(d - 0.4, 0, 1) ** 1.4)[..., None]
    a *= (1 - floor * np.clip((y / H - 0.72) / 0.28, 0, 1))[..., None]           # dark base (substrate shadow)
    a *= (1 - top * np.clip((0.25 - y / H) / 0.25, 0, 1))[..., None]
    a += rs.randn(H, W, 1) * 3.0                                                  # grain
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(out, name), quality=74, optimize=True)

# reef: US FWS public-domain reef photo, lower part (corals), pulled toward blue, softened (depth of field)
finish(cover(Image.open(f'{src}/reef1.jpg'), (0, 0.38, 1, 1)), 'reef.jpg', 3.2, 0.62, 0.8, (0.78, 0.95, 1.12), 0.5, 0.55)
# planted: CC0 aquascape photo, the underwater planted belt, heavy blur, green-black
pl = Image.open(f'{src}/plant1.jpg').convert('RGB')
bx, by = 1997, 1661  # a small fish in the photo: paint it out with plants from the right
pl.paste(pl.crop((bx - 170 + 420, by - 130, bx + 170 + 420, by + 130)), (bx - 170, by - 130))
finish(cover(pl, (0.03, 0.665, 0.93, 0.95)), 'plant.jpg', 5.5, 0.9, 0.85, (0.9, 1.0, 0.92), 0.55, 0.55, 0.15)
# rock: Poly Haven CC0 stone wall, slightly cooled, soft
im = Image.open(f'{src}/rock_wall_08.jpg').convert('RGB'); im = im.crop((0, 0, 2048, 819))
finish(im.resize((W, H), Image.LANCZOS), 'rock.jpg', 1.6, 0.8, 0.9, (0.9, 0.98, 1.08), 0.55, 0.45)
# river: Poly Haven CC0 river pebbles, teal underwater cast, top fades into murky water
im = Image.open(f'{src}/ganges_river_pebbles.jpg').convert('RGB').crop((0, 400, 2048, 400 + 819)).resize((W, H), Image.LANCZOS)
finish(im, 'river.jpg', 2.4, 0.7, 0.85, (0.62, 0.95, 0.95), 0.5, 0.45, 0.2)
for f in sorted(os.listdir(out)): print(f, os.path.getsize(os.path.join(out, f)) // 1024, 'kB')
