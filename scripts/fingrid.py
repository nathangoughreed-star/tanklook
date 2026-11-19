"""Fish painter: colour grid for the median fins. python scripts/fingrid.py <photo.jpg> <art-json> <out-json>
For each fin (dorsal, anal, caudal) lays a grid of cw x ch photo-px cells over the annotated outline and stores the MEAN colour of the photo pixels
(inside the outline, shrunk 4 px so background does not leak in) of every cell that is mostly inside. A coarse colour map (a few hundred numbers per fin),
not an image: the photo itself never enters the repo. Rows run top to bottom; null = cell outside the fin."""
import json, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
photo, src, out = sys.argv[1:4]
J = json.load(open(src)); ph = np.array(Image.open(photo).convert('RGB')).astype(float); H, W = ph.shape[:2]
CW, CH = 30, 12; res = {'cell': [CW, CH]}
for name, key in [('dorsal', 'dorsal'), ('anal', 'anal'), ('caudal', 'caudal')]:
    poly = [tuple(p[:2]) for p in J['anatomy']['fins'][key]['outline']]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    inner = np.array(m.filter(ImageFilter.MinFilter(9))) > 0   # 4 px inside
    outer = np.array(m) > 0
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]; x0, y0 = int(min(xs)) // CW * CW, int(min(ys)) // CH * CH
    rows = []
    for y in range(y0, int(max(ys)) + CH, CH):
        row = []
        for x in range(x0, int(max(xs)) + CW, CW):
            cell_o = outer[y:y + CH, x:x + CW]; cell_i = inner[y:y + CH, x:x + CW]
            if cell_o.size == 0 or cell_o.mean() < 0.5 or cell_i.sum() < 6: row.append(None); continue
            c = ph[y:y + CH, x:x + CW][cell_i].mean(0); row.append('%02x%02x%02x' % tuple(int(v) for v in c))
        rows.append(row)
    res[name] = {'x0': x0, 'y0': y0, 'rows': rows}; print(name, len(rows), 'x', len(rows[0]), 'cells', sum(c is not None for r in rows for c in r))
json.dump(res, open(out, 'w'), separators=(',', ':'))
