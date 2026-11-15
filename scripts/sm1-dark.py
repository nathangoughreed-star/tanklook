# dark-pixel fraction (luminance < 110) of the floor in 'above' shots: python scripts/sm1-dark.py <prefix>...
# a prefix alone = the three mix shots; `<prefix>_v` = the offset variants (averaged)
import sys, glob
from PIL import Image
def dark(f):
    im = Image.open(f).convert('L'); w, h = im.size
    box = im.crop((int(.1 * w), int(.02 * h), int(.92 * w), int(.52 * h))); px = list(box.get_flattened_data() if hasattr(box, 'get_flattened_data') else box.getdata())
    return 100 * sum(v < 110 for v in px) / len(px)
for pre in sys.argv[1:]:
    fs = sorted(glob.glob(f'shots/{pre}*-above.png')) or sorted(glob.glob(f'shots/{pre}*.png'))
    vals = [dark(f) for f in fs]; print(pre, ' '.join('%.1f' % v for v in vals), 'mean %.1f' % (sum(vals) / len(vals)))
