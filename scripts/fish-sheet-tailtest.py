"""Make a synthetic fanned-tail sheet from a good one (tail rescue test, method doc section 4 row 30; no image generation needed).
  python -I scripts/fish-sheet-tailtest.py SHEET.webp OUT.png
Pastes the side panel's tail (everything behind the peduncle, as fish-sheet-audit.py finds it) into the top panel, centred on the top view's
centre line, so the top view shows the tail fanned flat. Run the audit on OUT: tail edge-on must read well above 0.15 (WARN naming the rescue),
and fish-projcards.py must still cut the top card at the peduncle. Needs numpy + PIL."""
import importlib.util, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('e6', os.path.join(HERE, 'fish-sheet-e6.py')); E = importlib.util.module_from_spec(spec); spec.loader.exec_module(E)
A = E.A
im = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(im).copy()
lit = a.astype(np.int16).max(2) > A.THRESH
(sx0, sy0, sx1, sy1), (tx0, ty0, tx1, ty1), _ = E.panels(lit.copy())
Ls, dep, pedU, wid = E.measure(sys.argv[1])
ped = int(pedU * Ls)                                   # px from the tail tip
src = a[sy0:sy1, sx0:sx0 + ped]
mid = (ty0 + ty1) // 2; h = sy1 - sy0
y0 = mid - h // 2
dst = a[y0:y0 + h, sx0:sx0 + ped]
m = src.max(2) > A.THRESH
dst[m] = src[m]
Image.fromarray(a).save(sys.argv[2]); print('wrote', sys.argv[2], 'fan pasted over', ped, 'px of tail')
