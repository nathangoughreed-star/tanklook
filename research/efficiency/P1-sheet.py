"""Rating sheet (lane P1): per view, each ladder rung's picture beside the as-shipped one, same crop at native pixels.
usage: python research/efficiency/P1-sheet.py   -> research/efficiency/P1-sheet-<view>.png"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = 'research/efficiency/P1-shots'; S = json.load(open('research/efficiency/P1-scores.json'))
NAMES = ['pixel ratio 2 -> 1.5', 'pixel ratio 2 -> 1.25', 'pixel ratio 2 -> 1', 'pixel ratio 2 -> 0.75', 'frosted film -> plain sheet', 'plants hidden', 'fin cards hidden', 'hardscape hidden']
RUNGS = {'iwagumi': [0, 2, 3, 4, 6], 'planted': [0, 2, 3, 6], 'reef': [0, 2, 3, 6]}
W, H = 600, 400
try: F = ImageFont.truetype('arial.ttf', 22); Fs = ImageFont.truetype('arial.ttf', 17)
except Exception: F = Fs = ImageFont.load_default()
for view, idx in RUNGS.items():
    sheet = Image.new('RGB', (2 * W + 30, 70 + len(idx) * (H + 56)), 'white'); d = ImageDraw.Draw(sheet)
    d.text((10, 8), f'{view}: left = as shipped, right = the rung. Rate each: unnoticeable / noticeable / bad', fill='black', font=F)
    for r, i in enumerate(idx):
        a = Image.open(f'{D}/{view}__{i}__A.png').convert('RGB'); b = Image.open(f'{D}/{view}__{i}__B.png').convert('RGB')
        if b.size != a.size: b = b.resize(a.size, Image.BILINEAR)
        # the W x H window where the two pictures differ most (so a fin or the film shows, not empty sand)
        df = np.abs(np.asarray(a, dtype=np.float32) - np.asarray(b, dtype=np.float32)).sum(-1)
        c = np.cumsum(np.cumsum(np.pad(df, ((1, 0), (1, 0))), 0), 1); st = 20; best = (-1, 0, 0)
        for yy in range(0, a.height - H + 1, st):
            for xx in range(0, a.width - W + 1, st):
                v = c[yy + H, xx + W] - c[yy, xx + W] - c[yy + H, xx] + c[yy, xx]
                if v > best[0]: best = (v, xx, yy)
        x0, y0 = best[1], best[2]; box = (x0, y0, x0 + W, y0 + H)
        y = 50 + r * (H + 56); s = S[f'{view}__{i}']
        d.text((10, y), f'{r + 1}. {NAMES[i]}   (SSIM {s["ssim"]}, colour diff {s["de"]})', fill='black', font=Fs)
        sheet.paste(a.crop(box), (10, y + 26)); sheet.paste(b.crop(box), (W + 20, y + 26))
    sheet.save(f'research/efficiency/P1-sheet-{view}.png')
