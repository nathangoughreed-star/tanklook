"""Pale band at the body / tail-fin join (Nathan 2026-11-25: "every one of these fish has a pale vertical band at the confluence of the body and the tail
fin"; the translucency chat measured it in the live danio's sheet art: a crescent row of pale scales across the tail root, 25 px ahead of the 3D body).
smooth_root(path, ped, win=12): for each row of the sheet's side image, inside +-win px of the flesh-to-fin line (LM ped x), a fish pixel that is pale and
barely coloured and brighter than the line between the row's means just outside the window is pulled back to that line. Saturated marks (a neon stripe,
a coloured band) and very bright marks (> 1.6x the line) are left alone. Off with spec "root_band": 0. Method row 63."""
import numpy as np
from PIL import Image


def smooth_root(path, ped, win=12, ref=12, margin=6, max_sat=0.30, max_ratio=1.6):
    """Soft version (2026-11-25, after a hard per-pixel mask left blotches on the angelfish): a darkening FACTOR map is built from the ridge excess, smoothed
    (gaussian) so it never speckles, tapered to 1 at the window edges, and applied to every fish pixel in the window."""
    from scipy import ndimage as nd
    im = np.asarray(Image.open(path).convert('RGB')).astype(float); H, W, _ = im.shape
    px = int(round(ped[0])); a, b = px - win, px + win
    if a - ref < 0 or b + ref >= W: return 0
    mx = im.max(2); mn = im.min(2); L = im @ np.array([.299, .587, .114]); sat = (mx - mn) / np.maximum(mx, 1); fish = mx > 40
    F = np.ones((H, b - a + 1)); xs = np.arange(a, b + 1)
    for y in range(H):
        lz, rz = fish[y, a - ref:a], fish[y, b + 1:b + 1 + ref]
        if lz.sum() < 4 or rz.sum() < 4: continue
        ll = np.median(L[y, a - ref:a][lz]); lr = np.median(L[y, b + 1:b + 1 + ref][rz])
        line = ll + (lr - ll) * (xs - a) / max(b - a, 1); l = L[y, a:b + 1]
        m = fish[y, a:b + 1] & (l > line + margin) & (l < line * max_ratio) & (sat[y, a:b + 1] < max_sat)
        F[y] = np.where(m, line / np.maximum(l, 1), 1.0)
    F = np.minimum(nd.gaussian_filter(F, (3, 2)), 1.0)
    taper = np.sin(np.pi * (xs - a) / max(b - a, 1)) ** 2   # 0 at the window edges
    F = 1 - (1 - F) * taper[None, :]
    F = np.where(fish[:, a:b + 1], F, 1.0)
    changed = int((F < 0.98).sum())
    if changed: im[:, a:b + 1] *= F[..., None]; Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(path)
    return changed
