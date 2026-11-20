#!/usr/bin/env python3
"""Fit fish3d sections() half-thickness (thick, pedT) to the top-view half-widths in anatomy.json (run after fish-topview.py).
  python -I scripts/fish-thickfit.py anatomy.json"""
import json, sys
import numpy as np
p = sys.argv[1]; J = json.load(open(p)); A = J['anatomy']; d = A['depthProfile']
st = np.array(d['stations'], float); top = np.array(d['top']); bot = np.array(d['bottom']); hw = np.array(A['thickness']['halfWidthPctSL'])
pedU = 1 - 1 / A['tlOverSl']; SLc = 1 - pedU
hv = (top + bot) / 2 / 100 * SLc; maxHv = hv.max(); s = 1 - st / 100; tm = hw / 100 * SLc
best = None
for thick in np.linspace(0.2, 1.6, 141):
    for pedT in np.linspace(0, 1, 101):
        t = thick * (0.35 * hv + 0.65 * maxHv * np.sin(np.minimum(1, hv / maxHv) * np.pi / 2)) * (pedT + (1 - pedT) * np.sqrt(np.clip(s, 0, 1)))
        e = np.sqrt(np.mean((t - tm)[1:-1] ** 2))
        if best is None or e < best[0]: best = (e, thick, pedT)
e, thick, pedT = best
A['thickness']['fit'] = {'thick': round(float(thick), 3), 'pedT': round(float(pedT), 3), 'rmsPctSL': round(float(e / SLc * 100), 2), 'note': 'least-squares fit of fish3d sections() half-thickness to the top-view half-width'}
json.dump(J, open(p, 'w'), indent=1); print(A['thickness']['fit'])
