"""E-GEN: one command per species, from a sheet to public/art/fish/lod/<slug>-gen.glb (finless method).
  python scripts/fish-gen.py <slug> <sheet-path> [--body hy_body.glb] [--tris 8000] [--head left] [--out path.glb]
Steps: panels -> generator (Hunyuan3D-2mv, skipped with --body) -> fish-fin-cut -> fish-fin-line -> fish-glb-assemble.
Work folder: C:\\Users\\nreed\\fish-sheets\\<slug>-gen\\ (sheet.webp, side.png, front.png, hy_body.glb, finlab/align/fins/pec .npy/.json, bodyline2/peduncle .npy).
The sheet: panels stacked on black, head to the right: 1 side + fins, 2 side, fins trimmed flush, 3 top, 4 front (both without fins),
either stacked or as a 2x2 grid (1|2 over 3|4); optional 5th stacked panel: label map (pectoral yellow, black root dot). Species that face left: --head left (the sheet is mirrored first).
A hand-traced pectoral can be given as <work>/pec.json {"poly": [[x, y], ...]} (absolute px of the work folder's sheet.webp) when there is no panel 5.
The generator is limited to about 4 anonymous calls a day; a refused request costs nothing."""
import sys, os, shutil, argparse, subprocess, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import fishsheet as fs
ROOT = os.path.dirname(HERE)


def panels(work):
    """Writes side.png (panel 2, RGBA cut-out, square 1024) and front.png (panel 4 rescaled so its height equals the side's, same canvas)."""
    a, M = fs.load(os.path.join(work, 'sheet.webp')); bands = fs.panel_bands(M)
    assert len(bands) in (4, 5, 6), f'expected 4 to 6 panels, found {len(bands)}: {bands}'
    S = 1024; fit = int(S * 0.875)
    def cut(i):
        x0, x1, y0, y1 = fs.box(M, *bands[i]); rgb = a[y0:y1, x0:x1]; al = (M[y0:y1, x0:x1] * 255).astype(np.uint8)
        return Image.fromarray(np.dstack([rgb, al]), 'RGBA')
    side = cut(1); k = fit / max(side.width, side.height)
    side = side.resize((round(side.width * k), round(side.height * k)), Image.LANCZOS)
    front = cut(3); kf = side.height / front.height          # the front panel is rescaled to the side panel's scale
    front = front.resize((round(front.width * kf), round(front.height * kf)), Image.LANCZOS)
    for im, fn in ((side, 'side.png'), (front, 'front.png')):
        c = Image.new('RGBA', (S, S), (0, 0, 0, 0)); c.paste(im, ((S - im.width) // 2, (S - im.height) // 2)); c.save(os.path.join(work, fn))
    print('panels:', len(bands), 'found; side.png %dx%d, front.png %dx%d on 1024 canvases' % (side.width, side.height, front.width, front.height), flush=True)


def generate(work):
    from gradio_client import Client, handle_file
    r = Client("tencent/Hunyuan3D-2mv").predict(caption=None, image=None,
        mv_image_front=handle_file(os.path.join(work, 'side.png')),    # finless side, RGBA cut-out on transparent, square 1024
        mv_image_back=None,
        mv_image_left=handle_file(os.path.join(work, 'front.png')),    # finless head-on, RESCALED to the side panel's scale
        mv_image_right=None, steps=30, guidance_scale=5.0, seed=1234, octree_resolution=256,
        check_box_rembg=True, num_chunks=8000, randomize_seed=False, api_name="/shape_generation")
    def find(x):
        if isinstance(x, str) and x.lower().endswith('.glb'): return x
        if isinstance(x, dict): return find(x.get('value') or x.get('path') or x.get('name'))
        if isinstance(x, (list, tuple)):
            for y in x:
                f = find(y)
                if f: return f
    g = find(r)
    if not g: raise SystemExit('generator returned no .glb: %r' % (r,))
    shutil.copy(g, os.path.join(work, 'hy_body.glb')); print('generator: wrote hy_body.glb', flush=True)


def run(script, *args):
    print('>>', script, flush=True)
    p = subprocess.run([sys.executable, os.path.join(HERE, script), *map(str, args)])
    if p.returncode: raise SystemExit(f'{script} failed ({p.returncode})')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('slug'); ap.add_argument('sheet')
    ap.add_argument('--body', help='an existing generator output (.glb); skips the generator call')
    ap.add_argument('--tris', type=int, default=8000); ap.add_argument('--head', choices=('right', 'left'), default='right')
    ap.add_argument('--out'); ap.add_argument('--work')
    o = ap.parse_args()
    work = o.work or os.path.join(os.path.expanduser('~'), 'fish-sheets', o.slug + '-gen'); os.makedirs(work, exist_ok=True)
    im = Image.open(o.sheet).convert('RGB')
    if o.head == 'left': im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(os.path.join(work, 'sheet.webp'), lossless=True)
    panels(work)
    if o.body:
        src = o.body if os.path.exists(o.body) else os.path.join(work, o.body)
        dst = os.path.join(work, 'hy_body.glb')
        if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    else: generate(work)
    run('fish-fin-cut.py', work); run('fish-fin-line.py', work)
    out = o.out or os.path.join(ROOT, 'public', 'art', 'fish', 'lod', o.slug + '-gen.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    run('fish-glb-assemble.py', work, out, o.tris)
    print('done:', out)


if __name__ == '__main__':
    main()
