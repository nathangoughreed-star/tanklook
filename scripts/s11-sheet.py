# Contact sheet per device: python scripts/s11-sheet.py <phase>  -> research/screens/S11/<phase>/sheet-<device>.jpg
import sys, glob, os
from PIL import Image, ImageDraw
ph = sys.argv[1] if len(sys.argv) > 1 else 'after'
for d in sorted(glob.glob(f'research/screens/S11/{ph}/*/')):
    fs = sorted(glob.glob(d + '[0-9]*.jpg'))
    if not fs: continue
    ims = [Image.open(f) for f in fs]; tw = 300 if ims[0].width < 800 else 520; sc = tw / ims[0].width; th = int(ims[0].height * sc)
    cols = 7 if tw == 300 else 4; rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (tw + 6) + 6, rows * (th + 24) + 6), (20, 22, 28)); dr = ImageDraw.Draw(S)
    for i, (f, im) in enumerate(zip(fs, ims)):
        x, y = 6 + (i % cols) * (tw + 6), 6 + (i // cols) * (th + 24)
        S.paste(im.resize((tw, th)), (x, y + 16)); dr.text((x, y), os.path.basename(f)[:-4], fill=(220, 220, 220))
    out = f'research/screens/S11/{ph}/sheet-' + os.path.basename(os.path.dirname(d)) + '.jpg'
    S.save(out, quality=80); print(out)
