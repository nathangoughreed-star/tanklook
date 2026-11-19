"""Fish painter experiment A: reference overlay + diagnostics. Python (PIL, numpy, scipy), run by hand, not shipped.
usage: python scripts/overlay.py <photo.jpg> <outdir>     (needs shots/OVL-json.png and shots/OVL-rx2.png from scripts/overlay.js)
Aligns each model card to the photo with a similarity from two landmarks (snout tip, caudal peduncle centre).
Writes <outdir>/OVL-compare.png (photo | JSON model | RX2 model) and <outdir>/OVL-outline.png (annotation green, model magenta), prints diagnostics."""
import json, sys, numpy as np
from PIL import Image, ImageDraw
from PIL import ImageFilter
photo, out = sys.argv[1], sys.argv[2]
J = json.load(open('src/data/fishart/flameangel.json')); A = J['anatomy']; L = A['landmarks']
ph = Image.open(photo).convert('RGB'); PW, PH = ph.size
SNOUT = np.array(L['snout'], float); PED = np.array([585, 515], float)   # photo px: snout tip, peduncle centre (photo)
SL = np.linalg.norm(SNOUT - PED)
def cpx(a): return complex(a[0], a[1])
def fit(card_w, card_h, mouth, pedU):
    """similarity photo px -> card px from (snout, peduncle centre) pairs; returns (a, t): card = a*photo + t (complex)"""
    p0, p1 = cpx(SNOUT), cpx(PED); c0 = complex(card_w, card_h / 2 + mouth * card_w); c1 = complex(pedU * card_w, card_h / 2)
    a = (c0 - c1) / (p0 - p1); return a, c0 - a * p0
def to_photo(card, a, t):
    """resample the RGBA card into photo space (inverse similarity as an affine)"""
    ia = 1 / a; it = -t / a  # photo = ia*card + it ; PIL wants output(photo) -> input(card) = a*photo + t
    m = (a.real, -a.imag, t.real, a.imag, a.real, t.imag)
    return card.transform((PW, PH), Image.AFFINE, m, Image.BICUBIC)
def mask_poly(poly, size=(PW, PH)):
    im = Image.new('L', size, 0); ImageDraw.Draw(im).polygon([tuple(p[:2]) for p in poly], fill=255); return np.array(im) > 0
def erode(m, n=2):
    im = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MinFilter(2 * n + 1)); return np.array(im) > 0
def dilate(m, n=1):
    im = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(2 * n + 1)); return np.array(im) > 0
def edge(m): return m & ~erode(m)
def dist(a, b):
    """distance (px) from each point of edge mask a to the nearest point of edge mask b (every 2nd point of a; brute force)"""
    A = np.argwhere(a)[::2].astype(np.float32); B = np.argwhere(b)[::2].astype(np.float32); out = []
    for i in range(0, len(A), 400): out.append(np.sqrt(((A[i:i + 400, None, :] - B[None]) ** 2).sum(-1)).min(1))
    return np.concatenate(out)
polys = {'body': A['body'], 'dorsal': A['fins']['dorsal']['outline'], 'anal': A['fins']['anal']['outline'], 'caudal': A['fins']['caudal']['outline'],
         'pectoral': A['fins']['pectoral']['outline'], 'pelvic': A['fins']['pelvic']['outline']}
M = {k: mask_poly(v) for k, v in polys.items()}; ann = np.zeros((PH, PW), bool)
for v in M.values(): ann |= v
models = {}
for name, mouth, pedU in [('json', None, None), ('rx2', 0.01, 0.2)]:
    card = Image.open(f'shots/OVL-{name}.png').convert('RGBA'); w, h = card.size
    if name == 'json': mouth, pedU = (SNOUT[1] - 515) / 1590, 0.277
    a, t = fit(w, h, mouth, pedU); models[name] = to_photo(card, a, t)
rows, rep = [], {}
for name, img in models.items():
    al = np.array(img)[:, :, 3] > 128
    iou = (al & ann).sum() / (al | ann).sum()
    e1, e2 = dist(edge(al), edge(ann)) / SL * 100, dist(edge(ann), edge(al)) / SL * 100  # model contour -> annotation, annotation contour -> model, % SL
    e = np.concatenate([e1, e2])
    rec = {k: round(float((al & m).sum() / m.sum()), 3) for k, m in M.items()}
    rep[name] = dict(IoU=round(float(iou), 3), contour_mean_pctSL=round(float(e.mean()), 2), contour_p95_pctSL=round(float(np.percentile(e, 95)), 2), contour_max_pctSL=round(float(e.max()), 2), annotated_area_covered=rec, model_outside_annotation=round(float((al & ~ann).sum() / al.sum()), 3))
print(json.dumps(rep, indent=1))
# picture 1: photo | JSON model | RX2 model (model composited on the photo's own background, dimmed, so the fish reads)
bg = Image.new('RGB', (PW, PH), (44, 74, 82)); S = 0.5; tiles = [ph]
for name in ('json', 'rx2'):
    t = bg.copy(); t.paste(models[name], (0, 0), models[name]); tiles.append(t)
W2, H2 = int(PW * S), int(PH * S); sheet = Image.new('RGB', (W2 * 3, H2 + 26), 'white'); d = ImageDraw.Draw(sheet)
for i, (t, cap) in enumerate(zip(tiles, ['photo p1 (Commons, CC BY 2.0, A. Maerz)', f'JSON model (measured geometry)  IoU {rep["json"]["IoU"]}', f'RX2 model (parameter plan)  IoU {rep["rx2"]["IoU"]}'])):
    sheet.paste(t.resize((W2, H2)), (i * W2, 26)); d.text((i * W2 + 6, 8), cap, fill='black')
sheet.save(f'{out}/OVL-compare.png')
# picture 2: outline over photo: annotation green, model silhouette magenta; landmarks as dots
tiles = []
for name in ('json', 'rx2'):
    t = ph.copy(); px = t.load(); al = np.array(models[name])[:, :, 3] > 128
    for m, col in [(edge(ann), (40, 255, 60)), (edge(al), (255, 0, 220))]:
        for y, x in zip(*np.nonzero(dilate(m))): px[x, y] = col
    dd = ImageDraw.Draw(t)
    for p in [L['snout'], L['eye'], L['pecRoot'], L['pelvicRoot']]: dd.ellipse([p[0] - 7, p[1] - 7, p[0] + 7, p[1] + 7], outline=(40, 255, 60), width=3)
    tiles.append(t)
sheet = Image.new('RGB', (W2 * 2, H2 + 26), 'white'); d = ImageDraw.Draw(sheet)
for i, (t, cap) in enumerate(zip(tiles, ['JSON model (magenta) vs annotation (green)', 'RX2 model (magenta) vs the same annotation (green)'])):
    sheet.paste(t.resize((W2, H2)), (i * W2, 26)); d.text((i * W2 + 6, 8), cap, fill='black')
sheet.save(f'{out}/OVL-outline.png')
