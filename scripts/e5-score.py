#!/usr/bin/env python3
"""E5 scoring: arms (a) and (c) against Nathan's clicks (b). Errors in % of SL (SL = snout x - peduncle x, from arm b's build)."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'research', 'fish-specs', 'e5')
rows = []
def poly_iou(p, q, size):
    A = Image.new('1', size, 0); B = Image.new('1', size, 0)
    ImageDraw.Draw(A).polygon([tuple(x) for x in p], fill=1); ImageDraw.Draw(B).polygon([tuple(x) for x in q], fill=1)
    a, b = np.asarray(A), np.asarray(B)
    return (a & b).sum() / max(1, (a | b).sum())
def line_err(p, q):
    """mean |dy| over the x-range both polylines cover, plus how far their x-ends differ (px)"""
    if len(p) < 2 or len(q) < 2: return None
    p = sorted(p); q = sorted(q); lo = max(p[0][0], q[0][0]); hi = min(p[-1][0], q[-1][0])
    if hi <= lo: return None
    xs = np.linspace(lo, hi, 40)
    yp = np.interp(xs, [a[0] for a in p], [a[1] for a in p]); yq = np.interp(xs, [a[0] for a in q], [a[1] for a in q])
    return float(np.abs(yp - yq).mean()), abs(p[0][0] - q[0][0]), abs(p[-1][0] - q[-1][0])
out = []
for fish in ('oscar', 'clownfish', 'pleco'):
    b = json.load(open(os.path.join(R, fish + '-b.json')))
    snout = json.load(open(os.path.join(R, '..', '..', '..', 'src', 'data', 'fishart', 'e5%sb.anatomy.json' % fish)))['anatomy']['render']['photo']['sx']
    SL = snout - b['landmarks']['ped'][0]
    sheet = Image.open(b['sheet']); size = sheet.size
    for arm in ('a', 'c'):
        s = json.load(open(os.path.join(R, '%s-%s.json' % (fish, arm))))
        d = lambda p, q: float(np.hypot(p[0] - q[0], p[1] - q[1])) / SL * 100
        e = {'ped': d(s['landmarks']['ped'], b['landmarks']['ped'])}
        e['eye'] = d(s['eye'][:2], b['eye'][:2]) if arm == 'a' or 'eye' not in s.get('auto_failed', []) else None
        for k, kk in (('dorsal', 'dorsalBase'), ('anal', 'analBase')):
            r = line_err(s['landmarks'][kk], b['landmarks'][kk])
            e[k] = None if r is None else r[0] / SL * 100
            e[k + '_ends'] = None if r is None else max(r[1], r[2]) / SL * 100
        for k, kk in (('pecroot', 'pectoral'), ('pelroot', 'pelvic')):
            e[k] = d(s[kk]['root'], b[kk]['root']) if kk in s else None
            e[k.replace('root', 'iou')] = poly_iou(s[kk]['poly'], b[kk]['poly'], size) if kk in s else None
        out.append((fish, arm, e))
        vals = [v for kk, v in e.items() if v is not None and not kk.endswith('iou') and not kk.endswith('ends')]
        print('%-9s %s SL=%d  ' % (fish, arm, SL) + '  '.join('%s=%s' % (k, 'miss' if v is None else '%.1f' % v if not k.endswith('iou') else '%.2f' % v) for k, v in e.items()) + '  worst=%.1f' % max(vals))
json.dump([(f, a, e) for f, a, e in out], open(os.path.join(R, 'e5-scores.json'), 'w'), indent=1)
