"""Automatic colour saturation for a build-B fish (method row 58; rows 22, 48). Nathan 2026-11-24: "lets build it in".
The app's lighting boosts mid-saturation colours and compresses saturated ones, so each species needs its own `sat`. This script
does what row 48 did by hand: render the left side headless (fish-autoshot.mjs), measure the mid-body saturation of the render and of
the sheet's side panel, and set `sat` = old sat / (render / sheet). With --apply it writes the spec, rebuilds (fish-build.py) and
measures again, up to --passes times, until the render is within TOL of the sheet.
  Mid-body patch: 38-62 % of the fish's length, and the middle 40 % of the fish's height in each of those columns (keeps the
  dorsal and anal fins out). Same relative patch on the sheet's row 1 and on the render, so no registration is needed.
  Limit (row 54): one global factor; a fish whose colours move in different directions (tiger oscar: orange too red, olive too grey)
  still needs a hue-selective fix by hand.
Usage: python -I scripts/fish-autosat.py <id> [--apply] [--passes 2] [--url http://localhost:5197/]
Prints one summary line per pass and a final 'autosat:' line."""
import sys, os, json, subprocess, colorsys, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE)
TOL = 0.06               # |render/sheet - 1| at or under this: leave sat alone
LO, HI = 0.5, 1.3        # sat clamp


def patch_sat(rgb, mask):
    """Mean HSV saturation over the mid-body patch of a fish given its RGB array and boolean mask."""
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max(); L = x1 - x0
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(float) / 255.0
    vals = []
    for x in range(int(x0 + 0.38 * L), int(x0 + 0.62 * L) + 1):
        col = np.where(mask[:, x])[0]
        if len(col) < 5: continue
        a, b = col.min(), col.max(); h = b - a
        sel = col[(col >= a + 0.3 * h) & (col <= b - 0.3 * h)]
        s, v = hsv[sel, x, 1], hsv[sel, x, 2]
        vals.extend(s[v > 0.12])
    if not vals: raise SystemExit('autosat: empty mid-body patch')
    return float(np.mean(vals))


def sheet_sat(sheet):
    import fishsheet as fs
    a, M = fs.load(sheet); y0, y1 = fs.panel_bands(M)[0][:2]
    m = np.zeros_like(M, dtype=bool); m[y0:y1 + 1] = M[y0:y1 + 1]
    return patch_sat(np.asarray(Image.open(sheet).convert('RGB')), m)


def render_sat(png):
    rgb = np.asarray(Image.open(png).convert('RGB')).astype(int)
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), 0)   # plain backdrop, top and bottom strips
    m = np.abs(rgb - bg).sum(2) > 40
    return patch_sat(rgb.astype(np.uint8), m)


def shoot(ID, tl, tag, url):
    cmd = ['node', os.path.join('scripts', 'fish-autoshot.mjs'), f'{ID}:{tl}', '--views', 'side', '--tag', tag] + (['--url', url] if url else [])
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=os.name == 'nt')
    line = [l for l in r.stdout.splitlines() if l.startswith('{')]
    res = json.loads(line[-1]) if line else {'ok': [], 'fail': [r.stderr.strip()[-300:]]}
    if res['fail'] or not res['ok']: raise SystemExit(f'autosat: shot failed: {res["fail"]}')
    return os.path.join(ROOT, 'shots', res['ok'][0] + '.png')


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith('--') and not argv[i + 1].startswith('--')}
    ID = argv[0]; apply = '--apply' in argv; passes = int(opt.get('--passes', 2)); url = opt.get('--url')
    sp = os.path.join(ROOT, 'research', 'fish-specs', ID + '.json'); spec = json.load(open(sp))
    sp_rows = json.load(open(os.path.join(ROOT, 'src', 'data', 'species.json'), encoding='utf8'))['species']
    tl = next((s['tl'] for s in sp_rows if s['id'] == ID), None)
    if tl is None: raise SystemExit(f'autosat: {ID} is not in src/data/species.json')
    target = sheet_sat(spec['sheet'])
    sat = float(spec.get('sat', 1.0)); ratio = None; prev = None
    if apply and 'sat' in spec and not spec.get('sat_auto') and '--force' not in argv:
        print(f'autosat: {ID} keeps its hand-set sat {sat:.2f} (pass --force to re-measure it)'); apply = False
    for p in range(passes + 1):
        ratio = render_sat(shoot(ID, tl, f'autosat{p}', url)) / target
        print(f'pass {p}: sat {sat:.2f}, mid-body saturation render/sheet {ratio:.2f}', flush=True)
        if abs(ratio - 1) <= TOL or not apply or p == passes: break
        # sat does not scale the card's saturation one for one (tailspot: sat 0.78 lowered it only 15 %), so after the first pass
        # step along the measured line (secant) instead of dividing again
        if prev and abs(ratio - prev[1]) > 0.01: new = sat + (1 - ratio) * (sat - prev[0]) / (ratio - prev[1])
        else: new = sat / ratio ** 1.5
        prev = (sat, ratio); new = round(min(HI, max(LO, new)), 2)
        if new == sat: break
        sat = new; spec = json.load(open(sp)); spec['sat'] = sat; spec['sat_auto'] = True
        json.dump(spec, open(sp, 'w'), indent=1)
        r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fish-build.py'), sp], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode: raise SystemExit('autosat: fish-build failed\n' + (r.stdout + r.stderr)[-800:])
    verdict = 'ok' if abs(ratio - 1) <= TOL else ('suggest sat %.2f (run with --apply)' % min(HI, max(LO, sat / ratio)) if not apply else 'still off: check by eye (row 54: hue-selective?)')
    print(f'autosat: {ID} sat {sat:.2f}, render/sheet {ratio:.2f}: {verdict}')


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
