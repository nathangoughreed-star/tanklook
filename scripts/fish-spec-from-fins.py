"""Make a build-B (loft) spec for the blue tang from the finless-method outputs: 3-panel sheet (panel 2 blacked out) + landmarks from finlab."""
import sys, json, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
from scipy.spatial import ConvexHull
sys.path.insert(0, r'C:/Users/nreed/Glass Box/.claude/worktrees/glbfish-e5/scripts')
import fishsheet as fs
W = r'C:/Users/nreed/fish-sheets/bluetang-gen'
a, M = fs.load(os.path.join(W, 'sheet.webp'))
fins = json.load(open(os.path.join(W, 'fins.json')))
b1, b2 = fins['bands'][0], fins['bands'][1]
img = Image.open(os.path.join(W, 'sheet.webp')).convert('RGB'); arr = np.array(img)
arr[b2[0] - 4:b2[1] + 5] = 0
Image.fromarray(arr).save(os.path.join(W, 'sheet3.png'))
lab = np.load(os.path.join(W, 'finlab.npy')); y0 = b1[0]
full = np.zeros(M.shape, np.int32); full[y0:y0 + lab.shape[0], :lab.shape[1]] = lab
pec = np.array(json.load(open(os.path.join(W, 'pec.json')))['poly'])
body = (M > 0.5) & (full == 0); body[:y0] = False; body[y0 + lab.shape[0]:] = False
bodyd = nd.binary_dilation(body, iterations=2)
roles = {v['role']: int(k) for k, v in fins['components'].items()}


def base(role):
    ys, xs = np.nonzero((full == roles[role]) & bodyd)
    return xs, ys


def binned(xs, ys, step=30):
    out = []
    for x in range(xs.min(), xs.max() + 1, step):
        s = (xs >= x) & (xs < x + step)
        if s.any(): out.append([int(xs[s].mean()), int(ys[s].mean())])
    return out


cx, cy = base('caudal'); ped = [int(np.median(cx)), int(cy.mean())]
dx_, dy_ = base('dorsal'); ax_, ay_ = base('anal'); px_, py_ = base('pelvic')
pys, pxs = np.nonzero(full == roles['pelvic'])
hull = ConvexHull(np.c_[pxs, pys]); ppoly = np.c_[pxs, pys][hull.vertices]
proot = [int(px_.mean()), int(py_.mean())]
plen = int(np.max(np.hypot(pxs - proot[0], pys - proot[1])))
spec = {"id": "bluetangb", "sheet": os.path.join(W, 'sheet3.png').replace('\\', '/'),
        "species": {"name": "Blue tang", "sci": "Paracanthurus hepatus", "tl": 310},
        "landmarks": {"ped": ped, "dorsalBase": binned(dx_, dy_), "analBase": binned(ax_, ay_)},
        "eye": [858, 162, 22],
        "pectoral": {"root": [775, 285], "poly": [[775, 285]] + pec.tolist(), "spread": 1},
        "pelvic": {"root": proot, "len": plen, "poly": [proot] + ppoly.tolist()},
        "measured_width": True, "plan": "oscar"}
json.dump(spec, open(os.path.join(W, 'bluetangb.json'), 'w'), indent=1)
print('ped', ped, 'dorsal pts', len(spec['landmarks']['dorsalBase']), 'anal pts', len(spec['landmarks']['analBase']), 'pelvic root', proot, 'len', plen)
