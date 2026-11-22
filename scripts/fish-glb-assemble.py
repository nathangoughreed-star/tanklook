"""E-GEN finless method: a generated finless body + flat fin cut-outs from the finned side panel, as one GLB.
Inputs (rainbow-gen folder): sheet.webp (panel 1 side with fins, 2 side without, 3 top without, 4 front without),
hy_body.glb (Hunyuan3D-2mv from panels 2 + 4), finlab.npy / align.npy (fin_cut step).
Output parts, all length 1 = panel 1's full length (snout to tail tip), +x = head, centred on panel 1's box:
  body      the generated body, decimated, its texture baked from panels 2-4 (no fin pixels on it)
  card      a flat plane at z = 0 with panel 1's whole fish (median fins show where they stick out of the body)
  pec_l/r   pectoral cut-outs, hinged at the root and turned out from the flank
  pel_l/r   pelvic cut-outs, hinged at the belly and turned out
Usage: python fish-glb-assemble.py <folder> <out.glb> [tris]"""
import sys, os, numpy as np, trimesh, fast_simplification, xatlas
from PIL import Image, ImageDraw

F, OUT = sys.argv[1], sys.argv[2]; TRIS = int(sys.argv[3]) if len(sys.argv) > 3 else 8000
a = np.asarray(Image.open(os.path.join(F, 'sheet.webp')).convert('RGB')); M = a.max(2) > 8
bands = [(32, 416), (479, 777), (860, 1044), (1106, 1511)]
dy = int(np.load(os.path.join(F, 'align.npy'))[0])
def box(y0, y1):
    c = np.where(M[y0:y1].any(0))[0]; r = np.where(M[y0:y1].any(1))[0]; return c[0], c[-1] + 1, y0 + r[0], y0 + r[-1] + 1
B1, B2, B3, B4 = [box(*b) for b in bands]
L = B1[1] - B1[0]; XC = (B1[0] + B1[1]) / 2; YC = (B1[2] + B1[3]) / 2
U = lambda px: (px - XC) / L; V = lambda py: -(py - YC) / L              # sheet px (absolute) -> model units
# panel 2 in panel 1's frame: same x, y shifted by dy
b2 = (B2[0], B2[1], B2[2] + dy, B2[3] + dy)

# ---------- body ----------
raw = trimesh.load(os.path.join(F, 'hy_body.glb'), force='mesh', process=False)
src = trimesh.Trimesh(raw.vertices, raw.faces, process=True)
src.update_faces(src.nondegenerate_faces()); src.update_faces(src.unique_faces()); src.remove_unreferenced_vertices()
v, f = fast_simplification.simplify(src.vertices.astype(np.float32), src.faces.astype(np.int64), target_reduction=max(0, 1 - TRIS / len(src.faces)))
m = trimesh.Trimesh(v, f, process=True)
lo, hi = m.bounds
# place: x span -> panel 2's x span, y centre -> panel 2's centre, uniform scale by length
s = (U(b2[1]) - U(b2[0])) / (hi[0] - lo[0])
m.apply_translation(-(lo + hi) / 2); m.apply_scale(s)
m.apply_translation([(U(b2[0]) + U(b2[1])) / 2, (V(b2[2]) + V(b2[3])) / 2, 0])
print('body', len(m.faces), 'tris; depth model %.3f vs panel 2 %.3f' % (m.extents[1], (b2[3] - b2[2]) / L), flush=True)
orig = m.vertices.copy()   # the texture is baked from these (the surface as generated), whatever the reshape below does

# ---------- reshape to panel 1's real body line (fin_line step) ----------
# The finless panel turns the fin bases into body: under the dorsal and anal fins it is too deep, and its tail stalk runs
# into the tail fin. bodyline2.npy holds panel 1's body top / bottom per column (fin-vs-body pixel classifier, rows in
# panel 1's frame); peduncle.npy the narrowest column of panel 1 (the tail-fin base).
bl = os.path.join(F, 'bodyline2.npy')
if os.path.exists(bl):
    T_, B_ = np.load(bl); xp = int(np.load(os.path.join(F, 'peduncle.npy'))[0]) - 8; p1y = bands[0][0]
    Mf = np.zeros_like(M); ys_ = np.arange(bands[1][0], bands[1][1]); Mf[ys_ + dy] = M[ys_]  # finless body in panel 1's frame
    cols = np.arange(M.shape[1]); has = Mf.any(0)
    t2 = np.interp(cols, cols[has], np.argmax(Mf, 0)[has]).astype(float); b2_ = np.interp(cols, cols[has], (M.shape[0] - 1 - np.argmax(Mf[::-1], 0))[has]).astype(float)  # edge columns: nearest outline
    x_end, x_a = b2[0], xp + 200.0                              # finless stalk end -> the tail-fin base, eased over 200 px
    V_ = m.vertices; px0 = V_[:, 0] * L + XC
    px1 = np.where(px0 < x_a, x_a - (x_a - px0) * (x_a - xp) / (x_a - x_end), px0)
    i0 = np.clip(px0.round().astype(int), 0, M.shape[1] - 1); i1 = np.clip(px1.round().astype(int), 0, M.shape[1] - 1)
    tt, bb = t2[i0], b2_[i0]
    TT = np.where(np.isnan(T_[i1]), tt, T_[i1] + p1y); BB = np.where(np.isnan(B_[i1]), bb, B_[i1] + p1y)
    c = (tt + bb) / 2; py = -V_[:, 1] * L + YC
    k = np.where(py < c, (c - TT) / np.maximum(c - tt, 1), (BB - c) / np.maximum(bb - c, 1))
    k = np.where(np.isnan(k), 1, np.clip(k, 0.3, 1.0))
    V_[:, 0] = (px1 - XC) / L; V_[:, 1] = -((c + (py - c) * k) - YC) / L
    m.vertices = V_
    print('reshaped: depth now %.3f; stalk end moved %d -> %d px' % (m.extents[1], x_end, xp), flush=True)

def samp(px, py):
    px = np.clip(px.astype(int), 0, a.shape[1] - 1); py = np.clip(py.astype(int), 0, a.shape[0] - 1); return a[py, px].astype(np.float32), M[py, px]
def colour(P, N):
    # side: panel 2 (same x as panel 1, y shifted back by dy)
    cs, ms = samp(P[:, 0] * L + XC, -P[:, 1] * L + YC - dy)
    # top: panel 3, its own length rescaled to panel 2's, snouts aligned, centred on its own midline
    k3 = (B3[1] - B3[0]) / (B2[1] - B2[0]); x3 = B3[1] - (B2[1] - (P[:, 0] * L + XC)) * k3
    ct, mt = samp(x3, (B3[2] + B3[3]) / 2 - P[:, 2] * L * k3)
    # front: panel 4, scaled so its height = panel 2's height
    k4 = (B4[3] - B4[2]) / (B2[3] - B2[2]); yb = -P[:, 1] * L + YC - dy   # y in panel 2 px
    cf, mf = samp((B4[0] + B4[1]) / 2 - P[:, 2] * L * k4, B4[2] + (yb - B2[2]) * k4)
    nx = (P[:, 0] - U(b2[0])) / (U(b2[1]) - U(b2[0]))
    ws = (np.abs(N[:, 2]) + 0.15) * ms + 1e-3
    wt = np.clip(N[:, 1], 0, None) ** 2 * 1.5 * mt
    wf = np.clip(N[:, 0], 0, None) ** 2 * 1.5 * mf * (nx > 0.8)
    return (cs * ws[:, None] + ct * wt[:, None] + cf * wf[:, None]) / (ws + wt + wf)[:, None]

def bake(mesh, tex, src_pos):
    vmap, idx, uv = xatlas.parametrize(mesh.vertices, mesh.faces)
    Vv = src_pos[vmap]; Nv = trimesh.Trimesh(src_pos, mesh.faces, process=False).vertex_normals[vmap]  # colours from the generated surface
    img = np.zeros((tex, tex, 3), np.float32); fill = np.zeros((tex, tex), bool)
    Uu = uv * (tex - 1); Uu[:, 1] = (tex - 1) - Uu[:, 1]; pts, nrm, at = [], [], []
    for t in range(len(idx)):
        A_, B_, C_ = Uu[idx[t]]
        x0, y0 = np.floor(np.minimum(np.minimum(A_, B_), C_)).astype(int); x1, y1 = np.ceil(np.maximum(np.maximum(A_, B_), C_)).astype(int)
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); xs = xs.ravel(); ys = ys.ravel()
        d = (B_[1] - C_[1]) * (A_[0] - C_[0]) + (C_[0] - B_[0]) * (A_[1] - C_[1])
        if abs(d) < 1e-12: continue
        w0 = ((B_[1] - C_[1]) * (xs - C_[0]) + (C_[0] - B_[0]) * (ys - C_[1])) / d; w1 = ((C_[1] - A_[1]) * (xs - C_[0]) + (A_[0] - C_[0]) * (ys - C_[1])) / d; w2 = 1 - w0 - w1
        e = -0.6 / max(1, abs(d) ** 0.5); k = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not k.any(): continue
        W = np.c_[w0[k], w1[k], w2[k]].clip(0); W /= W.sum(1, keepdims=True)
        pts.append(W @ Vv[idx[t]]); nrm.append(W @ Nv[idx[t]]); at.append(np.c_[ys[k], xs[k]])
    P = np.concatenate(pts); Nn = np.concatenate(nrm); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9; At = np.concatenate(at).clip(0, tex - 1)
    img[At[:, 0], At[:, 1]] = colour(P, Nn); fill[At[:, 0], At[:, 1]] = True
    for _ in range(4):
        sh = [np.roll(img, q, ax) for ax in (0, 1) for q in (1, -1)]; shf = [np.roll(fill, q, ax) for ax in (0, 1) for q in (1, -1)]
        acc = sum(si * fi[..., None] for si, fi in zip(sh, shf)); cnt = sum(fi.astype(np.float32) for fi in shf)
        new = ~fill & (cnt > 0); img[new] = acc[new] / cnt[new][:, None]; fill |= new
    out = trimesh.Trimesh(mesh.vertices[vmap], idx, process=False)
    out.visual = trimesh.visual.TextureVisuals(uv=uv, material=trimesh.visual.material.PBRMaterial(baseColorTexture=Image.fromarray(img.clip(0, 255).astype(np.uint8)), metallicFactor=0, roughnessFactor=1))
    return out
body = bake(m, 1024, orig)

# ---------- fin cut-outs ----------
def quad(px0, px1, py0, py1, rgba):
    """A plane in z = 0 covering sheet box (absolute px), textured with rgba (H x W x 4, same box)."""
    x0, x1, y0, y1 = U(px0), U(px1), V(py0), V(py1)
    q = trimesh.Trimesh([[x0, y1, 0], [x1, y1, 0], [x1, y0, 0], [x0, y0, 0]], [[0, 1, 2], [0, 2, 3]], process=False)
    q.visual = trimesh.visual.TextureVisuals(uv=np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float), material=trimesh.visual.material.PBRMaterial(baseColorTexture=Image.fromarray(rgba, 'RGBA'), metallicFactor=0, roughnessFactor=1, alphaMode='MASK', alphaCutoff=0.5))
    return q
def rgba_of(mask, x0, x1, y0, y1):
    al = (mask[y0:y1, x0:x1] * 255).astype(np.uint8)
    return np.dstack([a[y0:y1, x0:x1], al])

lab = np.load(os.path.join(F, 'finlab.npy'))                       # panel 1 frame (rows from bands[0][0])
p1y = bands[0][0]
# pectoral: traced by hand on the zoomed sheet (it lies over the flank, so the difference can't find it)
pec_poly = [(630, 202), (700, 199), (750, 206), (790, 216), (805, 225), (805, 258), (787, 265), (733, 264), (683, 249), (633, 222)]
pm = Image.new('L', (a.shape[1], a.shape[0]), 0); ImageDraw.Draw(pm).polygon(pec_poly, fill=1); pec = np.asarray(pm) > 0
# pelvic: the difference component hanging below the belly near x 612-696
pel = np.zeros_like(M); sub = lab > 0; yy, xx = np.where(sub)
comp = lab[(yy >= 327) & (yy <= 383) & (xx >= 612) & (xx <= 696)] if False else None
k = lab[355, 650] if lab[355, 650] else np.bincount(lab[327:383, 612:696].ravel())[1:].argmax() + 1
pel[p1y:p1y + lab.shape[0]] = lab == k
# card: panel 1's whole fish minus the paired fins
card_mask = M.copy(); card_mask[:bands[0][0]] = False; card_mask[bands[0][1]:] = False; card_mask &= ~pec & ~pel
card = quad(B1[0], B1[1], B1[2], B1[3], rgba_of(card_mask, B1[0], B1[1], B1[2], B1[3]))

def halfwidth(x, y):
    near = np.abs(m.vertices[:, 0] - x) < 0.01
    near &= np.abs(m.vertices[:, 1] - y) < 0.02
    return np.abs(m.vertices[near, 2]).max() if near.any() else 0.05

parts = {'body': body, 'card': card}
for name, mask, hinge, ang in (('pec', pec, 'y', 28), ('pel', pel, 'x', 22)):
    ys_, xs_ = np.where(mask); x0, x1, y0, y1 = xs_.min(), xs_.max() + 1, ys_.min(), ys_.max() + 1
    rg = rgba_of(mask, x0, x1, y0, y1)
    if hinge == 'y': rx, ry = U(x1), V((y0 + y1) / 2)         # pectoral: root at its front (head) end
    else: rx, ry = U((x0 + x1) / 2), V(y0)                     # pelvic: root along its top edge
    hw = halfwidth(rx, ry) * 0.9
    for side, sg in (('l', 1), ('r', -1)):
        q = quad(x0, x1, y0, y1, rg)
        T = trimesh.transformations
        R = T.rotation_matrix(np.radians(-ang * sg if hinge == 'y' else ang * sg), [0, 1, 0] if hinge == 'y' else [1, 0, 0], [rx, ry, 0])
        q.apply_transform(R); q.apply_translation([0, 0, sg * hw])
        parts[f'{name}_{side}'] = q
sc = trimesh.Scene()
for n, g in parts.items(): sc.add_geometry(g, node_name=n, geom_name=n)
sc.export(OUT); print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB', flush=True)
