"""Build-B pipeline driver, sheet to built fish (handoff steps 3-8 in one command; method row 44).
  <work> holds sheet.webp (Nathan's ChatGPT sheet). Runs:
   1. FishShapes numbers: <work>/fishshapes.json, made by fishshapes.py if missing (the sci name must be in FishShapes v1).
   2. Audit (fish-sheet-audit5.py) against them. Depth off by more than 8 %: stretch the sheet (fish-sheet-stretch.py, row 39)
      into <work>-s<k>/ and carry on there (--no-stretch to keep the drawn depth).
   3. Fin cut (fish-fin-cut.py; --body-from-map passed through: a fin role missing or row 2 well above the real depth, row 36).
   4. Spec (fish-spec-from-fins.py: eye colours, dense, pectoral spread kept to 0.2-0.35), copied to research/fish-specs/<id>.json
      with width_pct_sl and the FishShapes specimens. An existing spec's hand-set keys (sat, alo, aw, taper, ... see KEEP) are kept.
   5. Build (fish-build.py: thickx from the measured width in the same pass, mass check against every specimen).
  Pictures stay a separate step: scripts/fish-shots.js in the page, then fish-contact.py.
Usage: python fish-new.py <work> <id> "<Common name>" "<Genus species>" <tl_mm> [--body-from-map] [--no-stretch]"""
import sys, os, json, shutil, subprocess, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KEEP = ('sat', 'alo', 'aw', 'taper', 'smooth_tail', 'pedt_max', 'clip_head', 'outline', 'fy0', 'erase', 'pec_window', 'anchor_top',
        'no_tail', 'dorsals', 'smooth', 'warm', 'plan', 'card_sheet_off')
STRETCH_AT = 0.08


def run(*a):
    print('$', ' '.join(os.path.basename(str(x)) if i == 1 else str(x) for i, x in enumerate(a)), flush=True)
    r = subprocess.run([sys.executable, '-I', *map(str, a)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (r.stdout + r.stderr).strip()
    if out: print('  ' + out.replace('\n', '\n  '), flush=True)
    if r.returncode: sys.exit(f'failed: {a[0]}')
    return r.stdout


def mod(name):
    s = importlib.util.spec_from_file_location(name.replace('-', '_'), os.path.join(HERE, name + '.py')); m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m); return m


def main(argv):
    flags = [a for a in argv if a.startswith('--')]; a = [x for x in argv if not x.startswith('--')]
    W, ID, NAME, SCI, TL = a[0], a[1], a[2], a[3], int(a[4])
    S = lambda n: os.path.join(HERE, n)
    fj = os.path.join(W, 'fishshapes.json')
    if not os.path.exists(fj): run(S('fishshapes.py'), SCI, '--out', fj)
    fsh = json.load(open(fj))
    real = [fsh[k] for k in ('depth', 'head', 'ped', 'width')]
    if None in real: sys.exit(f'FishShapes has no {["depth", "head", "ped", "width"][real.index(None)]} for {SCI}: fill {fj} by hand')

    # 2. audit and depth
    sheet = os.path.join(W, 'sheet.webp')
    run(S('fish-sheet-audit5.py'), sheet, '--real', ','.join(str(v) for v in real))
    drawn = mod('fish-sheet-audit5').audit(sheet)['depth']; k = fsh['depth'] / drawn
    if abs(k - 1) > STRETCH_AT and '--no-stretch' not in flags:
        W2 = f'{W.rstrip("/")}-s{k:.3f}'; os.makedirs(W2, exist_ok=True)
        print(f'depth: drawn {drawn:.1f} % SL vs FishShapes {fsh["depth"]:.1f}: stretch k {k:.3f} into {W2} (row 39)')
        run(S('fish-sheet-stretch.py'), sheet, f'{k:.4f}', os.path.join(W2, 'sheet.webp')); shutil.copy(fj, W2); W = W2
    else: print(f'depth: drawn {drawn:.1f} % SL vs FishShapes {fsh["depth"]:.1f} (k {k:.3f}): no stretch')

    # 3-4. fins and spec
    run(S('fish-fin-cut.py'), W, *(['--body-from-map'] if '--body-from-map' in flags else []))
    run(S('fish-spec-from-fins.py'), W, ID, NAME, SCI, TL)
    spec = json.load(open(os.path.join(W, ID + '.json')))
    spec['width_pct_sl'] = fsh['width']; spec['fishshapes'] = {'n': fsh['n'], 'depth': fsh['depth'], 'width': fsh['width'], 'specimens': fsh['specimens']}
    spec['measured_width'] = True
    dst = os.path.join(ROOT, 'research', 'fish-specs', ID + '.json')
    if os.path.exists(dst):
        old = json.load(open(dst)); kept = {kk: old[kk] for kk in KEEP if kk in old}
        if old.get('pectoral', {}).get('spread') is not None and 'pectoral' in spec: kept_sp = old['pectoral']['spread']; spec['pectoral']['spread'] = kept_sp; kept['pectoral.spread'] = kept_sp
        for kk, v in kept.items():
            if '.' not in kk: spec[kk] = v
        if kept: print('kept from the existing spec:', kept)
    json.dump(spec, open(dst, 'w'), indent=1); print('spec ->', os.path.relpath(dst, ROOT))

    # 5. build
    run(S('fish-build.py'), dst)
    print(f'done: {ID}. Next: pictures (scripts/fish-shots.js, then fish-contact.py), then the method-doc row for this sheet.')


if __name__ == '__main__':
    if len([x for x in sys.argv[1:] if not x.startswith('--')]) < 5: sys.exit(__doc__)
    main(sys.argv[1:])
