"""Pale band at the body / tail-fin join (Nathan 2026-11-25: "every one of these fish has a pale vertical band at the confluence of the body and the tail
fin"; the translucency chat measured it in the live danio's sheet art: a crescent row of pale scales across the tail root, 25 px ahead of the 3D body).
smooth_root(path, ped, win=12): for each row of the sheet's side image, inside +-win px of the flesh-to-fin line (LM ped x), a fish pixel that is pale and
barely coloured and brighter than the line between the row's means just outside the window is pulled back to that line. Saturated marks (a neon stripe,
a coloured band) and very bright marks (> 1.6x the line) are left alone. Off with spec "root_band": 0. Method row 63."""
import numpy as np
from PIL import Image


def smooth_root(path, ped, win=12, ref=12, margin=6, max_sat=0.30, max_ratio=1.6):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float); H, W, _ = im.shape
    px = int(round(ped[0])); a, b = px - win, px + win
    if a - ref < 0 or b + ref >= W: return 0
    mx = im.max(2); mn = im.min(2); L = im @ np.array([.299, .587, .114]); sat = (mx - mn) / np.maximum(mx, 1); fish = mx > 40
    changed = 0
    for y in range(H):
        lz, rz = fish[y, a - ref:a], fish[y, b + 1:b + 1 + ref]
        if lz.sum() < 4 or rz.sum() < 4: continue
        ll = np.median(L[y, a - ref:a][lz]); lr = np.median(L[y, b + 1:b + 1 + ref][rz])
        xs = np.arange(a, b + 1); line = ll + (lr - ll) * (xs - a) / max(b - a, 1)
        seg = slice(a, b + 1); l = L[y, seg]
        m = fish[y, seg] & (l > line + margin) & (l < line * max_ratio) & (sat[y, seg] < max_sat)
        if m.any():
            f = np.where(m, line / np.maximum(l, 1), 1.0); im[y, seg] *= f[:, None]; changed += int(m.sum())
    if changed: Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(path)
    return changed
