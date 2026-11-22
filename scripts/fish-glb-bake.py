"""Decimate the Hunyuan3D oscar to several triangle budgets, unwrap UVs (xatlas) and bake the sheet's colours into a texture.
Colour per surface point: side panel on the flanks, top panel on upward faces, front panel on the head and on anything
outside the body as seen from above (the spread pectorals, which the side and top panels show folded)."""
import sys, os, numpy as np, trimesh, fast_simplification, xatlas
from PIL import Image

D = r"C:\Users\nreed\fish-sheets\oscar-gen"
SHEET = r"C:\Users\nreed\fish-sheets\oscar-sheet1-variantB.webp"
OUT = sys.argv[1]
LODS = [(20000, 1024), (8000, 1024), (3000, 512), (1200, 256)]

a = np.asarray(Image.open(SHEET).convert('RGB')).astype(np.float32); M = a.max(2) > 8
pan = {'side': (10, 619), 'top': (643, 874), 'front': (895, 1437)}
box = {}
for k, (y0, y1) in pan.items():
    c = np.where(M[y0:y1].any(0))[0]; r = np.where(M[y0:y1].any(1))[0]
    box[k] = (c[0], c[-1], y0 + r[0], y0 + r[-1])

raw = trimesh.load(os.path.join(D, 'hy2mv_0.glb'), force='mesh', process=False)
src = trimesh.Trimesh(raw.vertices, raw.faces, process=True)  # the generator's output carries ~100k zero-area triangles: drop them
src.update_faces(src.nondegenerate_faces()); src.update_faces(src.unique_faces()); src.remove_unreferenced_vertices()
print('clean source', len(src.vertices), len(src.faces), flush=True)
lo, hi = src.bounds; zc = (lo[2] + hi[2]) / 2

def samp(px, py):
    px = np.clip(px.astype(int), 0, a.shape[1] - 1); py = np.clip(py.astype(int), 0, a.shape[0] - 1)
    return a[py, px], M[py, px]

def colour(P, N):
    nx = (P[:, 0] - lo[0]) / (hi[0] - lo[0]); ny = (P[:, 1] - lo[1]) / (hi[1] - lo[1])
    x0, x1, y0, y1 = box['side']; cs, ms = samp(x0 + nx * (x1 - x0), y0 + (1 - ny) * (y1 - y0))
    x0, x1, y0, y1 = box['top']; s = (x1 - x0) / (hi[0] - lo[0]); ct, mt = samp(x0 + nx * (x1 - x0), (y0 + y1) / 2 - (P[:, 2] - zc) * s)
    x0, x1, y0, y1 = box['front']; s = (y1 - y0) / (hi[1] - lo[1]); cf, mf = samp((x0 + x1) / 2 - (P[:, 2] - zc) * s, y0 + (1 - ny) * (y1 - y0))
    # a spread paired fin: outside the body seen from above AND lying flat (normal mostly up/down). Flank points just outside the
    # sheet's (slimmer) top outline face sideways, so the normal test keeps them on the side panel (run 1 painted the head-on eye there)
    out_body = ~mt & (np.abs(N[:, 1]) > 0.6)
    ws = (np.abs(N[:, 2]) + 0.15) * ms * ~(out_body & mf) + 1e-3
    wt = np.clip(N[:, 1], 0, None) ** 2 * 1.5 * mt
    wf = np.clip(N[:, 0], 0, None) ** 2 * 1.5 * mf * (nx > 0.75) + 4.0 * (out_body & mf)
    col = (cs * ws[:, None] + ct * wt[:, None] + cf * wf[:, None]) / (ws + wt + wf)[:, None]
    col[~(ms | mt | mf)] = (60, 62, 45)
    return col

os.makedirs(OUT, exist_ok=True)
for tris, tex in LODS:
    v, f = fast_simplification.simplify(src.vertices.astype(np.float32), src.faces.astype(np.int64), target_reduction=1 - tris / len(src.faces))
    m = trimesh.Trimesh(v, f, process=True)
    vmap, idx, uv = xatlas.parametrize(m.vertices, m.faces)
    V = m.vertices[vmap]; F = idx; Nv = m.vertex_normals[vmap]
    # rasterise every triangle in UV space; per texel: barycentric -> 3D point and normal -> colour
    img = np.zeros((tex, tex, 3), np.float32); fill = np.zeros((tex, tex), bool)
    U = uv * (tex - 1); U[:, 1] = (tex - 1) - U[:, 1]
    pts, nrm, at = [], [], []
    for t in range(len(F)):
        A, B, C = U[F[t]]
        xmin, ymin = np.floor(np.minimum(np.minimum(A, B), C)).astype(int); xmax, ymax = np.ceil(np.maximum(np.maximum(A, B), C)).astype(int)
        xs, ys = np.meshgrid(np.arange(xmin, xmax + 1), np.arange(ymin, ymax + 1)); xs = xs.ravel(); ys = ys.ravel()
        d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
        if abs(d) < 1e-12: continue
        w0 = ((B[1] - C[1]) * (xs - C[0]) + (C[0] - B[0]) * (ys - C[1])) / d
        w1 = ((C[1] - A[1]) * (xs - C[0]) + (A[0] - C[0]) * (ys - C[1])) / d
        w2 = 1 - w0 - w1; e = -0.6 / max(1, np.abs(d) ** 0.5)  # small dilation so seams don't show background
        k = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not k.any(): continue
        W = np.c_[w0[k], w1[k], w2[k]].clip(0); W /= W.sum(1, keepdims=True)
        pts.append(W @ V[F[t]]); nrm.append(W @ Nv[F[t]]); at.append(np.c_[ys[k], xs[k]])
    P = np.concatenate(pts); Nn = np.concatenate(nrm); Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9; At = np.concatenate(at)
    At = At.clip(0, tex - 1); img[At[:, 0], At[:, 1]] = colour(P, Nn); fill[At[:, 0], At[:, 1]] = True
    # pad the islands outward a few texels so mip levels don't bleed black in
    for _ in range(4):
        sh = [np.roll(img, s, ax) for ax in (0, 1) for s in (1, -1)]; shf = [np.roll(fill, s, ax) for ax in (0, 1) for s in (1, -1)]
        acc = sum(si * fi[..., None] for si, fi in zip(sh, shf)); cnt = sum(fi.astype(np.float32) for fi in shf)
        new = ~fill & (cnt > 0); img[new] = acc[new] / cnt[new][:, None]; fill |= new
    im = Image.fromarray(img.clip(0, 255).astype(np.uint8))
    mesh = trimesh.Trimesh(V, F, process=False)
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=trimesh.visual.material.PBRMaterial(baseColorTexture=im, metallicFactor=0, roughnessFactor=1))
    mesh.apply_translation(-(lo + hi) / 2); mesh.apply_scale(1 / (hi[0] - lo[0]))
    fn = os.path.join(OUT, f'oscar-hy2mv-{tris}.glb'); mesh.export(fn)
    print(tris, 'faces', len(F), 'verts', len(V), 'tex', tex, 'KB', os.path.getsize(fn) // 1024, flush=True)
