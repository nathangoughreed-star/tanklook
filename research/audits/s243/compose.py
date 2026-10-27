# Side-by-side figures: the current Fullness tile vs the proposed summary, from the headless screenshots in TMP.
import sys, textwrap
from PIL import Image, ImageDraw, ImageFont
TMP, OUT = sys.argv[1], sys.argv[2]
F = lambda n, s: ImageFont.truetype(f'C:/Windows/Fonts/{n}', s)
def pair(cur, new, title, capL, capR, out, box=(352, 38, 712, 900)):
    a = Image.open(f'{TMP}/{cur}').convert('RGB').crop(box); b = Image.open(f'{TMP}/{new}').convert('RGB').crop(box)
    h = max(a.height, b.height); W = a.width + b.width + 60; H = h + 150
    im = Image.new('RGB', (W, H), (245, 246, 248)); d = ImageDraw.Draw(im)
    d.text((20, 12), title, font=F('arialbd.ttf', 22), fill=(20, 24, 32))
    for x, cap, col in ((20, capL, (180, 40, 60)), (a.width + 40, capR, (20, 120, 80))):
        for i, line in enumerate(textwrap.wrap(cap, 44)[:4]): d.text((x, 46 + i * 19), line, font=F('arialbd.ttf', 15), fill=col)
    im.paste(a, (20, 128)); im.paste(b, (a.width + 40, 128)); im.save(f'{OUT}/{out}')
pair('A-tile.png', 'A-mock.png', 'Scenario A: 2 dwarf gourami + 6 tiger barb + 1 pea puffer in 18.7 gal', 'NOW: the Fullness tile (7 boxes, 3 colours, no order)', 'SMALLEST CHANGE: one number, four categories, each expands to its reasons', 'fig4-mock-A.png', box=(352, 38, 712, 700))
pair('H-tile.png', 'H-mock.png', 'Scenario H: 8 demasoni in a 36 x 18 in tank (44.9 gal)', 'NOW: 47 % in the bar, but the minimized pill reads "Too small" instead of the number (the number and the problem fight for one slot)', 'SMALLEST CHANGE: the number stays; tank size is its own row. Note Behaviour reads Compatible only because no rule fired: demasoni dominance fights are prose, not data (gap G1)', 'fig5-mock-H.png', box=(352, 38, 712, 700))
