"""Compare two fish GLBs: silhouette IoU side / top / front (orthographic, every part), triangle counts per part,
and a picture (old red, new green, overlap yellow). Usage: python glb-compare.py old.glb new.glb out.png"""
import sys, numpy as np, trimesh
from PIL import Image, ImageDraw, ImageFont
old, new, out = sys.argv[1:4]
def sil(path, ax, S=900):
    sc = trimesh.load(path); parts = {n: g for n, g in sc.geometry.items()}
    return sc, parts
def raster(sc, ax, lo, hi, S=900):
    im = Image.new('L', (S, S), 0); d = ImageDraw.Draw(im); sp = (hi - lo).max()
    for n in sc.graph.nodes_geometry:
        T, gn = sc.graph[n]; g = sc.geometry[gn].copy(); g.apply_transform(T)
        P = (g.vertices[:, ax] - (lo[ax] + hi[ax]) / 2) / sp * (S - 40) + S / 2
        P[:, 1] = S - P[:, 1]
        for f in g.faces: d.polygon([tuple(P[i]) for i in f], fill=255)
    return np.asarray(im) > 0
sa, sb = trimesh.load(old), trimesh.load(new)
lo = np.minimum(sa.bounds[0], sb.bounds[0]); hi = np.maximum(sa.bounds[1], sb.bounds[1])
views = {'side (x,y)': [0, 1], 'top (x,z)': [0, 2], 'front (z,y)': [2, 1]}
tiles = []; rows = []
for nm, ax in views.items():
    A = raster(sa, ax, lo, hi); B = raster(sb, ax, lo, hi)
    iou = (A & B).sum() / (A | B).sum(); rows.append((nm, iou))
    rgb = np.zeros(A.shape + (3,), np.uint8); rgb[A, 0] = 255; rgb[B, 1] = 255
    im = Image.fromarray(rgb); ImageDraw.Draw(im).text((10, 10), '%s  IoU %.4f   red=old green=new' % (nm, iou), fill=(255, 255, 255)); tiles.append(im)
W = Image.new('RGB', (900 * 3, 900)); [W.paste(t, (900 * i, 0)) for i, t in enumerate(tiles)]; W.save(out)
for nm, iou in rows: print('IoU %-12s %.4f' % (nm, iou))
tri = lambda s: {n: len(g.faces) for n, g in s.geometry.items()}
print('tris old', tri(sa), sum(tri(sa).values())); print('tris new', tri(sb), sum(tri(sb).values()))
for n in sa.geometry:
    if n in sb.geometry:
        va, vb = sa.geometry[n].vertices, sb.geometry[n].vertices
        print('part %-6s verts %d/%d' % (n, len(va), len(vb)), 'max |dv| %.5f' % np.abs(va - vb).max() if va.shape == vb.shape else '')
