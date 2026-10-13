# Male / female review sheets: shots/90_<species>_{m,f}_{side,r50}.png (scripts/shot-helpers.js, `sex: 'f'`) laid out
# per species as one row: male side | female side | male 50° | female 50°. The side pair shares one framing, so the
# size difference between the sexes is to scale. Usage: python scripts/sex-sheet.py -> shots/90_sexes_{A,B}.png
from PIL import Image, ImageDraw, ImageFont
import os

SPECIES = [('betta', 'Betta'), ('guppy', 'Guppy'), ('swordtail', 'Swordtail'), ('dwarfgourami', 'Dwarf gourami'), ('honeygourami', 'Honey gourami'),
           ('cherrybarb', 'Cherry barb'), ('kribensis', 'Kribensis'), ('gbr', 'German blue ram'), ('gourami', 'Pearl gourami')]
T, PAD, HEAD = 300, 8, 34
try:
    font = ImageFont.truetype('arial.ttf', 18); small = ImageFont.truetype('arial.ttf', 14)
except OSError:
    font = small = ImageFont.load_default()

def sheet(rows, name):
    W = PAD + 4 * (T + PAD) + 150
    H = HEAD + len(rows) * (T + PAD) + PAD
    im = Image.new('RGB', (W, H), (245, 244, 240)); d = ImageDraw.Draw(im)
    for i, t in enumerate(['♂ male, side', '♀ female, side (same scale)', '♂ male, 50°', '♀ female, 50°']):
        d.text((150 + PAD + i * (T + PAD), 8), t, fill=(40, 40, 40), font=small)
    for r, (key, label) in enumerate(rows):
        y = HEAD + r * (T + PAD)
        d.text((PAD, y + T // 2 - 10), label, fill=(20, 20, 20), font=font)
        for i, v in enumerate(['m_side', 'f_side', 'm_r50', 'f_r50']):
            p = f'shots/90_{key}_{v}.png'
            if os.path.exists(p): im.paste(Image.open(p).convert('RGB').resize((T, T)), (150 + PAD + i * (T + PAD), y))
    im.save(f'shots/{name}.png')

sheet(SPECIES[:5], '90_sexes_A'); sheet(SPECIES[5:], '90_sexes_B')
print('ok')
