"""Build B (loft) from a finless-method sheet, no clicks: writes <work>/<id>.json for fish-build.py (E5 worktree) and
<work>/sheet3.png, the sheet cut down to the 3 panels the loft reads (side with fins, top, front).
  python scripts/fish-spec-from-fins.py <work> <id> "<name>" "<sci>" <tl_mm>
Needs fish-gen.py's outputs in <work> (sheet.webp, fins.json, finlab.npy, pec.npy).
Landmarks: dorsal / anal base = fin pixels touching the body, binned along the body; ped = the tail-fin base;
pectoral = panel 5 label map (or pec.json) outline with its root first; pelvic = its outline, root = the front of its base;
eye = the label map's white disc, else the darkest disc in the head of panel 1; pectoral swing from the front fin map."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs

W, ID, NAME, SCI, TL = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
a, M = fs.load(os.path.join(W, 'sheet.webp')); bands = fs.panel_bands(M)
fins = json.load(open(os.path.join(W, 'fins.json')))
b1 = bands[0]; B1 = fs.box(M, *b1); B2 = fs.box(M, *bands[1])

# 3-panel sheet: black out the finless side, the maps, and any tail fin left on the top view
arr = np.array(Image.open(os.path.join(W, 'sheet.webp')).convert('RGB'))
for r in bands[1:2] + bands[4:]:
    y0, y1, x0, x1 = r; arr[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1 + 4] = 0
B3 = fs.box(M, *bands[2])
if (B3[1] - B3[0]) > 1.05 * (B2[1] - B2[0]):
    arr[bands[2][0] - 4:bands[2][1] + 4, :B3[1] - (B2[1] - B2[0])] = 0
Image.fromarray(arr).save(os.path.join(W, 'sheet3.png'))

lab = np.load(os.path.join(W, 'finlab.npy')); y0 = b1[0]
full = np.zeros(M.shape, np.int32); full[y0:y0 + lab.shape[0], :lab.shape[1]] = lab
pec = np.load(os.path.join(W, 'pec.npy')) if fins.get('pectoral') else None
body = fs.mask(M, b1) > 0.5; body &= full == 0
bodyd = nd.binary_dilation(body, iterations=2)
roles = {}
for k, v in sorted(fins['components'].items(), key=lambda kv: int(kv[0])): roles.setdefault(v['role'], int(k))   # largest per role (an adipose is a second, smaller 'dorsal')


def base(role):
    ys, xs = np.nonzero((full == roles[role]) & bodyd); return xs, ys


def binned(xs, ys, step=30):
    return [[int(xs[s].mean()), int(ys[s].mean())] for x in range(xs.min(), xs.max() + 1, step) for s in [(xs >= x) & (xs < x + step)] if s.any()]


def outline(m, n=24):
    """Ordered outline of a blob: the farthest blob pixel in each of n directions from its centroid."""
    ys, xs = np.nonzero(m); cx, cy = xs.mean(), ys.mean(); ang = np.arctan2(ys - cy, xs - cx); d = np.hypot(xs - cx, ys - cy); out = []
    for k in range(n):
        s = np.abs(((ang - (-np.pi + 2 * np.pi * k / n)) + np.pi) % (2 * np.pi) - np.pi) < np.pi / n
        if s.any(): i = np.argmax(np.where(s, d, -1)); out.append([int(xs[i]), int(ys[i])])
    return out


spec = {"id": ID, "sheet": os.path.join(W, 'sheet3.png').replace('\\', '/'), "species": {"name": NAME, "sci": SCI, "tl": TL},
        "measured_width": True, "plan": "oscar"}
cx, cy = base('caudal'); dx_, dy_ = base('dorsal'); ax_, ay_ = base('anal')
spec["landmarks"] = {"ped": [int(np.median(cx)), int(cy.mean())], "dorsalBase": binned(dx_, dy_), "analBase": binned(ax_, ay_)}
# eye: white disc of the label map, moved into panel 1 by the silhouette boxes; else the darkest disc in panel 1's head
eye = None
if len(bands) >= 5:
    y0_, y1_, x0_, x1_ = bands[4]; R = a[y0_:y1_, x0_:x1_].astype(int); wh = (R.min(2) > 215)
    if wh.sum() > 30:
        L5 = fs.box(M, *bands[4]); s = (B1[1] - B1[0]) / (L5[1] - L5[0]); yy, xx = np.nonzero(wh)
        eye = [int(B1[0] + (xx.mean() + x0_ - L5[0]) * s), int(B1[2] + (yy.mean() + y0_ - L5[2]) * s), int(np.sqrt(wh.sum() / np.pi) * s)]
if eye is None:
    hx0 = B1[1] - (B1[1] - B1[0]) // 4; S = a[B1[2]:B1[3], hx0:B1[1]].max(2) < 40; S &= M[B1[2]:B1[3], hx0:B1[1]] > 0.5
    yy, xx = np.nonzero(S); eye = [int(hx0 + xx.mean()), int(B1[2] + yy.mean()), int(np.sqrt(S.sum() / np.pi))] if len(xx) else [B1[1] - 60, (B1[2] + B1[3]) // 2, 20]
spec["eye"] = eye
pec_deg, pel_deg = fs.front_fin_angles(a, M, bands, pec)
if pec is not None:
    root = fins['pectoral']['root'] or [int(np.nonzero(pec.any(0))[0].max()), int(np.nonzero(pec)[0].mean())]
    ol = outline(pec); k = int(np.argmin([np.hypot(x - root[0], y - root[1]) for x, y in ol]))
    ol = ol[k + 1:] + ol[:k]   # the root takes the place of its nearest outline point, so the polygon runs round the edge (root first then the first point at -pi cut a wedge through the fin: the "split")
    spec["pectoral"] = {"root": [int(root[0]), int(root[1])], "poly": [[int(root[0]), int(root[1])]] + ol,
                        "spread": round(np.radians(pec_deg), 2) if pec_deg else 0.45}
if 'pelvic' in roles:
    pm = full == roles['pelvic']; px_, py_ = base('pelvic'); i = np.argmax(px_)
    proot = [int(px_[i]), int(py_[i])]; ys, xs = np.nonzero(pm)
    ol = outline(pm); k = int(np.argmin([np.hypot(x - proot[0], y - proot[1]) for x, y in ol])); ol = ol[k + 1:] + ol[:k]
    spec["pelvic"] = {"root": proot, "len": int(np.max(np.hypot(xs - proot[0], ys - proot[1]))), "poly": [proot] + ol}
# body card without the painted paired fins: panel 1's pectoral and pelvic pixels replaced by the finless flank of panel 2 (panel 1 = panel 2 + (dy, dx))
dy0, dx0 = int(fins['dy']), int(fins['dx']); paint = np.zeros(M.shape, bool)
if pec is not None: paint |= pec
if 'pelvic' in roles: paint |= full == roles['pelvic']
paint = nd.binary_dilation(paint, iterations=3) & (fs.mask(M, b1) > 0.5)
src = np.array(Image.open(os.path.join(W, 'sheet.webp')).convert('RGB')); card = arr.copy()
yy, xx = np.nonzero(paint); sy_, sx_ = yy - dy0, xx - dx0; ok = (sy_ >= 0) & (sy_ < M.shape[0]) & (sx_ >= 0) & (sx_ < M.shape[1])
lit = src[sy_[ok], sx_[ok]].max(1) > 40   # only where panel 2 has body (the pelvic hangs below the belly: there the card stays black = cut out)
card[yy[ok][lit], xx[ok][lit]] = src[sy_[ok][lit], sx_[ok][lit]]; card[yy[ok][~lit], xx[ok][~lit]] = 0
near = nd.binary_dilation(paint, iterations=12)   # leftovers of an erased fin (a pelvic tip the fin mask missed) float free below the belly
lab_, n_ = nd.label(nd.binary_closing(card.max(2) > 15, iterations=2)); sizes = np.bincount(lab_.ravel()); sizes[0] = 0; big = sizes.argmax(); gone = 0
for k_ in range(1, n_ + 1):
    if k_ == big: continue
    cm_ = lab_ == k_
    if (cm_ & near).sum() >= 0.5 * cm_.sum() and cm_.sum() < 0.01 * sizes[big]: card[cm_] = 0; gone += 1
if gone: print('card: %d loose fin fragment(s) removed' % gone)
Image.fromarray(card).save(os.path.join(W, 'sheet3card.png')); spec["card_sheet"] = os.path.join(W, 'sheet3card.png').replace(chr(92), '/')
json.dump(spec, open(os.path.join(W, ID + '.json'), 'w'), indent=1)
import subprocess; subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fish-eye-colour.py'), os.path.join(W, ID + '.json')], check=True)   # iris / pupil colours from the sheet's eye
print('%s: ped %s, dorsal %d / anal %d base pts, eye %s, pectoral %s (swing %s deg), pelvic %s; front-map pelvic angle %s deg' % (
    ID, spec['landmarks']['ped'], len(spec['landmarks']['dorsalBase']), len(spec['landmarks']['analBase']), eye,
    'yes' if pec is not None else 'no', None if pec_deg is None else round(pec_deg), 'yes' if 'pelvic' in spec else 'no', None if pel_deg is None else round(pel_deg)))
