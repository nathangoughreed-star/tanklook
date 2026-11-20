#!/usr/bin/env python3
"""E5b: does a pretrained fish-anatomy segmenter (imageomics/BGNN-trait-segmentation, FPN + SE-ResNeXt50, 13 classes) find our sheets' fins and eye?
Run with the venv python in C:\\Users\\nreed\\fish-seg (torch + segmentation-models-pytorch):
  C:\\Users\\nreed\\fish-seg\\venv\\Scripts\\python.exe scripts/e5-seg.py
Writes overlays to research/fish-sheets/e5/seg-<fish>.png and a score table (vs Nathan's clicks, research/fish-specs/e5/<fish>-b.json) to stdout / seg-scores.json."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
import torch
import segmentation_models_pytorch as smp

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
W = r'C:\Users\nreed\fish-seg\Trained_model_SM.pth'
CLS = ['bg', 'dorsal', 'adipose', 'caudal', 'anal', 'pelvic', 'pectoral', 'head', 'eye', 'trunk', 'caudal ray', 'alt ray', 'alt spine']
COL = [(0, 0, 0), (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (0, 200, 255), (255, 100, 200), (255, 255, 255), (0, 255, 120), (0, 140, 140), (255, 120, 120), (255, 170, 210), (255, 190, 150)]
obj = torch.load(W, map_location='cpu', weights_only=False)
if isinstance(obj, torch.nn.Module):
    model = obj
else:
    sd = obj.get('state_dict', obj) if isinstance(obj, dict) else obj
    model = smp.FPN('se_resnext50_32x4d', encoder_weights=None, classes=13)
    sd = {k.replace('module.', ''): v for k, v in sd.items()}
    print('load:', model.load_state_dict(sd, strict=False))
model.eval()
MEAN, STD = np.array([0.485, 0.456, 0.406]), np.array([0.229, 0.224, 0.225])


def segment(img, size):
    w, h = img.size
    s = size / max(w, h)
    nw, nh = int(round(w * s / 32)) * 32, int(round(h * s / 32)) * 32
    x = (np.asarray(img.resize((nw, nh), Image.BILINEAR)).astype(np.float32) / 255 - MEAN) / STD
    t = torch.from_numpy(x.transpose(2, 0, 1)[None].astype(np.float32))
    with torch.no_grad():
        lo = model(t)
    lab = lo.argmax(1)[0].numpy().astype(np.uint8)
    return np.asarray(Image.fromarray(lab).resize((w, h), Image.NEAREST))


def band0(im):
    a = np.asarray(im).max(2) > 40
    rows = np.nonzero(a.any(1))[0]
    s = p = rows[0]
    for r in rows[1:]:
        if r - p > 3:
            break
        p = r
    return max(0, s - 6), p + 6


def poly_mask(poly, size):
    m = Image.new('1', size, 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in poly], fill=1)
    return np.asarray(m)


out = {}
for fish in ('oscar', 'clownfish', 'pleco'):
    b = json.load(open(os.path.join(ROOT, 'research', 'fish-specs', 'e5', fish + '-b.json')))
    im = Image.open(b['sheet']).convert('RGB')
    y0, y1 = band0(im)
    side = im.crop((0, y0, im.width, y1))
    best = None
    for size in (512, 768):
        lab = segment(side, size)
        out_ = {}
        ys, xs = np.mgrid[0:lab.shape[0], 0:lab.shape[1]]
        cnt = {CLS[i]: int((lab == i).sum()) for i in range(13) if (lab == i).any()}
        # score: pectoral / pelvic region overlap with Nathan's traced polygons, eye centre distance, dorsal base edge
        sc = {}
        for k, key in (('pectoral', 'pectoral'), ('pelvic', 'pelvic')):
            ref = poly_mask([[p[0], p[1] - y0] for p in b[key]['poly']], side.size)
            pr = lab == CLS.index(k)
            sc[k + '_iou'] = round(float((ref & pr).sum() / max(1, (ref | pr).sum())), 2)
        e = (lab == 8)
        if e.any():
            ex, ey = xs[e].mean(), ys[e].mean() + y0
            sc['eye_px'] = round(float(np.hypot(ex - b['eye'][0], ey - b['eye'][1])), 1)
        else:
            sc['eye_px'] = None
        # dorsal fin base: the lowest row of the predicted dorsal fin per column vs Nathan's base line
        d = lab == 1
        base = b['landmarks']['dorsalBase']
        xs_b = np.array(sorted(base)).T
        errs = []
        for x in range(int(xs_b[0].min()), int(xs_b[0].max()), 6):
            col = np.nonzero(d[:, x])[0]
            if len(col):
                errs.append(abs((col.max() + y0) - np.interp(x, xs_b[0], xs_b[1])))
        sc['dorsal_base_px'] = round(float(np.mean(errs)), 1) if errs else None
        sc['dorsal_cover'] = round(len(errs) / max(1, len(range(int(xs_b[0].min()), int(xs_b[0].max()), 6))), 2)
        ov = np.asarray(side).copy()
        col = np.array(COL, np.uint8)[lab]
        ov = (0.45 * ov + 0.55 * col).astype(np.uint8)
        key_ = (sc['pectoral_iou'] + sc['pelvic_iou'])
        if best is None or key_ > best[0]:
            best = (key_, size, sc, ov, cnt)
    _, size, sc, ov, cnt = best
    Image.fromarray(ov).save(os.path.join(ROOT, 'research', 'fish-sheets', 'e5', 'seg-%s.png' % fish))
    out[fish] = {'size': size, **sc, 'classes_px': cnt}
    print(fish, size, sc, cnt)
json.dump(out, open(os.path.join(ROOT, 'research', 'fish-sheets', 'e5', 'seg-scores.json'), 'w'), indent=1)
