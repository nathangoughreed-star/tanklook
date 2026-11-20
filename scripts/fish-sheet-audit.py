#!/usr/bin/env python3
"""Sheet audit (method doc section 2): panels, lengths, width vs depth, top vs front width. Prints numbers and PASS/FAIL.
  python -I scripts/fish-sheet-audit.py sheet.png [--thr 40]
Panels = horizontal bands of non-black rows (max(R,G,B) > thr), in order side, top, front (bands under 30 px are text and ignored).
Checks: side and top length within 1 %; panel gaps; top-view body width (narrower half about the midline, so a spread pectoral
cannot inflate it) vs the front panel's width ABOVE the pectorals (top 30 % of its rows), at the head, must agree within 10 %."""
import sys, numpy as np
from PIL import Image
pos = [a for a in sys.argv[1:] if not a.startswith('--')]
thr = int(sys.argv[sys.argv.index('--thr') + 1]) if '--thr' in sys.argv else 40
a = np.asarray(Image.open(pos[0]).convert('RGB')).max(2) > thr
rows = np.nonzero(a.any(1))[0]; bands = []; s = p = rows[0]
for r in rows[1:]:
    if r - p > 3: bands.append((s, p)); s = r
    p = r
bands.append((s, p)); bands = [b for b in bands if b[1] - b[0] > 30]
P = []
for y0, y1 in bands:
    c = np.nonzero(a[y0:y1 + 1].sum(0) > 2)[0]; P.append((y0, y1, c.min(), c.max()))
ok = len(P) == 3
print('panels', P if ok else 'FAIL: expected 3, found %d: %s' % (len(P), P))
if not ok: sys.exit(1)
(s0, s1, sx0, sx1), (t0, t1, tx0, tx1), (f0, f1, fx0, fx1) = P
L, Lt = sx1 - sx0 + 1, tx1 - tx0 + 1
print('length side %d top %d diff %.1f%% %s' % (L, Lt, (Lt - L) / L * 100, 'PASS' if abs(Lt - L) / L < 0.01 else 'FAIL (rescale the top panel up to ~6 %, regenerate beyond)'))
print('gaps px', t0 - s1, f0 - t1)
mid = (t0 + t1) / 2
def tw(u):
    x = int(tx1 - u * Lt); c = np.nonzero(a[t0:t1 + 1, x])[0]
    if not len(c): return 0
    return 2 * min(mid - (c.min() + t0), (c.max() + t0) - mid) + 1
def sd(u):
    x = int(sx1 - u * L); c = np.nonzero(a[s0:s1 + 1, x])[0]; return c.max() - c.min() + 1 if len(c) else 0
print('top width / L at u=.08,.12,.2,.3:', [round(tw(u) / L, 3) for u in (.08, .12, .2, .3)])
print('side depth / L at u=.08,.12,.2,.3 (fins included):', [round(sd(u) / L, 3) for u in (.08, .12, .2, .3)])
y = int(f0 + 0.3 * (f1 - f0)); c = np.nonzero(a[y])[0]; fw = c.max() - c.min() + 1
head = max(tw(.08), tw(.12))
print('front width above pectorals %d = %.3f L; top head width %d = %.3f L; ratio %.2f -> %s' % (fw, fw / L, head, head / L, fw / max(head, 1), 'PASS' if abs(fw / max(head, 1) - 1) < 0.10 else 'FAIL (>10 %: views disagree)'))
print('front panel full width %.3f L, height %.3f L (fins included)' % ((fx1 - fx0 + 1) / L, (f1 - f0 + 1) / L))
