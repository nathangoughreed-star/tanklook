"""Build-B pipeline driver, sheet to built fish (handoff steps 3-8 in one command; method row 44).
  <work> holds sheet.webp (Nathan's ChatGPT sheet). Runs:
   1. FishShapes numbers: <work>/fishshapes.json, made by fishshapes.py if missing (the sci name must be in FishShapes v1).
   2. Audit (fish-sheet-audit5.py) against them, then depth (row 56): own-species numbers stretch to the median depth, borrowed
      (proxy_for) numbers keep the drawn depth inside the proxy range (row 49). Judged on the BUILT body: build, measure, and stretch
      again once if still off by more than 2 % (fish-sheet-stretch.py into <work>-s<k>/; --no-stretch keeps the drawn depth).
   3. Fin cut (fish-fin-cut.py; --body-from-map passed through: a fin role missing or row 2 well above the real depth, row 36).
   4. Spec (fish-spec-from-fins.py: eye colours, dense, pectoral spread kept to 0.2-0.35), copied to research/fish-specs/<id>.json
      with width_pct_sl and the FishShapes specimens. An existing spec's hand-set keys (sat, alo, aw, taper, ... see KEEP) are kept.
   5. Build (fish-build.py: thickx from the measured width in the same pass, mass check against every specimen).
   6. Colour (row 58): fish-autosat.py renders the side headless, sets sat so the mid-body saturation matches the sheet, rebuilds
      (2 passes typical). Skipped when the spec has a hand-set sat; --no-autosat skips it.
   7. Fin transparency (row 61 (11)): new specs get fin_opacity {"preset": "solid"} (the fin-map rules on, fins as solid as before) and a PHOTO CHECK NEEDED
      line until scripts/fish-fin-class.py records the class from reference photos (fin_opacity_source). fin_opacity: false = opaque fins.
  Pictures stay a separate step: scripts/fish-shots.js in the page (or scripts/fish-autoshot.mjs headless), then fish-contact.py.
Usage: python fish-new.py <work> <id> "<Common name>" "<Genus species>" <tl_mm> [--body-from-map] [--no-stretch] [--no-autosat]"""
import sys, os, json, shutil, subprocess, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KEEP = ('clamp_top', 'sat', 'alo', 'aw', 'taper', 'smooth_tail', 'pedt_max', 'clip_head', 'outline', 'fy0', 'erase', 'pec_window', 'anchor_top',
        'no_tail', 'dorsals', 'smooth', 'warm', 'plan', 'plan_extra', 'fin_gap', 'card_sheet_off', 'sat_auto', 'membrane', 'stalk', 'fin_opacity', 'fin_opacity_source', 'sat_lin', 'front_ramp', 'front_ramp_why', 'solid_near', 'body_recolour')
PROXY_LO, PROXY_HI = 0.75, 1.3   # a proxy fish keeps its drawn depth inside [lo*0.75, hi*1.3] (row 64)
STRETCH_AT = 0.08   # band around the median when there is no measured range (proxy numbers only)
TOL = 0.02          # built depth within 2 % of the target: no (further) stretch


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

    # 2. audit, then depth. Method row 56 (Nathan 2026-11-24): own-species numbers -> stretch to the species' median depth; borrowed
    # numbers (proxy_for, the tailspot) -> row 49: keep the drawn depth inside the proxy's range, else its nearest end. The depth that
    # decides is the BUILT body's (the anatomy's deepest station), not the audit's row 2: the bichir audited 12.0 but built 14.7, the
    # gramma 34.5 vs 37.0. So: stretch on the audit's estimate, build, measure, and if the built depth is still off the target by more
    # than TOL, stretch the original sheet by the corrected factor and build once more.
    sheet0 = os.path.join(W, 'sheet.webp'); W0 = W
    run(S('fish-sheet-audit5.py'), sheet0, '--real', ','.join(str(v) for v in real))
    pdj = os.path.join(W, 'proxy-depth.json')   # from scripts/fish-proxy-depth.py (photos of the species itself); a flag only, the depth rule below is unchanged
    if fsh.get('proxy_for') and os.path.exists(pdj):
        pd = json.load(open(pdj))
        print('%s: photo depth %.1f %% SL vs proxy %.1f (%s): %+.0f %%' % ('PROXY DEPTH FLAG' if pd.get('flag') else 'proxy depth ok', pd['photo_depth'], pd['proxy_depth'], pd['proxy_for'], pd['off_pct']))
    aud = mod('fish-sheet-audit5').audit(sheet0); drawn = aud['depth']
    proxy = bool(fsh.get('proxy_for'))
    lo, hi = (fsh.get('range') or {}).get('depth', [fsh['depth'] * (1 - STRETCH_AT), fsh['depth'] * (1 + STRETCH_AT)])
    if lo == hi: lo, hi = fsh['depth'] * (1 - STRETCH_AT), fsh['depth'] * (1 + STRETCH_AT)
    # Nathan 2026-11-28 (method row 76; 5-fish test beside real photos: coral beauty, Siamese algae eater, hatchet, firefish, glowlight):
    # own-species numbers keep the drawn depth when it lies inside the measured range, else go to the nearest range edge. Stretching
    # every sheet to the median of 3 specimens made the coral beauty 60.9 % SL deep from a sheet drawn at 51.8. One specimen (no range): median.
    own_range = not proxy and len((fsh.get('range') or {}).get('depth') or []) == 2 and fsh['range']['depth'][0] < fsh['range']['depth'][1]
    want = (lambda d: min(max(d, lo), hi)) if (proxy or own_range) else (lambda d: fsh['depth'])
    rule = f'proxy range {lo:.1f}-{hi:.1f} (row 49)' if proxy else (f'own range {lo:.1f}-{hi:.1f} (row 76)' if own_range else f'own median {fsh["depth"]:.1f} (row 56)')
    nostretch = '--no-stretch' in flags
    if proxy and not nostretch and lo * PROXY_LO <= drawn <= hi * PROXY_HI:
        # Nathan 2026-11-25 (clown pleco squashed 22.8 -> 18.4, yoyo loach stretched 22.7 -> 28.7, harlequin 34 -> 29, "the pleco has the body issue again"):
        # a proxy's range is a guess about ANOTHER species; the sheet shows the real fish. Inside a wide band around it, keep the drawn depth.
        nostretch = True; print(f'depth: drawn {drawn:.1f} % SL is inside the wide proxy band {lo * PROXY_LO:.1f}-{hi * PROXY_HI:.1f}: kept, no stretch (row 64)')
    # head depth (Nathan 2026-11-24, b6 "snouts too pointy"): the head gets its own factor from the FishShapes head depth at the eye
    # (borrowed numbers: kept inside the proxy's head range). ChatGPT draws heads shallow; scaled with the body they read as cones.
    hd = aud.get('head'); kh = None
    # OPT-IN (--head-depth): Nathan 2026-11-24 after the b6 rebuild: "more harm than good"; the cone read is mostly the missing lips
    # and mouth, and borrowed / noisy head numbers made bulb heads (ember). Kept for a fish whose drawn head is clearly wrong.
    if hd and fsh.get('head') and '--head-depth' in flags:
        hlo, hhi = (fsh.get('range') or {}).get('head', [fsh['head'], fsh['head']])
        htarget = min(max(hd, hlo), hhi) if proxy and hlo < hhi else fsh['head']
        # caps: own numbers 0.8-1.25; borrowed 0.87-1.15 (ember: H. anisitsi's head 20.9 % SL vs 14.3 drawn gave 1.4, a bulb head)
        kh = min(max(htarget / hd, 0.87 if proxy else 0.8), 1.15 if proxy else 1.25)
        print(f'head: audit {hd:.1f} % SL at the eye, target {htarget:.1f}: head k {kh:.3f}')
        if abs(kh - 1) <= TOL: kh = None

    def stretched(k):
        if (abs(k - 1) <= TOL and kh is None) or nostretch: return W0
        W2 = f'{W0.rstrip("/")}-s{k:.3f}' + (f'h{kh:.3f}' if kh else ''); os.makedirs(W2, exist_ok=True)
        run(S('fish-sheet-stretch.py'), sheet0, f'{k:.4f}', os.path.join(W2, 'sheet.webp'), *(['--head', f'{kh:.4f}'] if kh else [])); shutil.copy(fj, W2); return W2

    k = want(drawn) / drawn
    print(f'depth: audit {drawn:.1f} % SL, target {want(drawn):.1f} ({rule}): first-pass k {k:.3f}')
    built = build_once(stretched(k), ID, NAME, SCI, TL, fsh, flags, S)
    for pass_ in (2, 3):   # the built depth does not scale exactly with the sheet (the fin cut and back line move): up to two corrections
        k2 = want(built) / built
        if abs(k2 - 1) <= TOL or nostretch: break
        k *= k2
        print(f'depth: built {built:.1f} % SL, target {want(built):.1f}: pass {pass_}, total k {k:.3f}')
        built = build_once(stretched(k), ID, NAME, SCI, TL, fsh, flags, S)
    print(f'depth: built {built:.1f} % SL (audit {drawn:.1f}, total k {k:.3f}; {rule})')
    if '--no-autosat' not in flags:   # 6. colour (row 58); a hand-set sat is kept (fish-autosat.py says so)
        run(S('fish-autosat.py'), ID, '--apply', '--passes', '3')
    print(f'done: {ID}. Next: pictures (scripts/fish-shots.js, then fish-contact.py), then the method-doc row for this sheet.')


def built_depth(ID):
    dp = json.load(open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), encoding='utf8'))['anatomy']['depthProfile']
    return max(t + b for t, b in zip(dp['top'], dp['bottom']))


def build_once(W, ID, NAME, SCI, TL, fsh, flags, S):
    """Steps 3-5 on one (possibly stretched) work folder; returns the built body's max depth (% SL)."""
    run(S('fish-fin-cut.py'), W, *(['--body-from-map'] if '--body-from-map' in flags else []))
    run(S('fish-spec-from-fins.py'), W, ID, NAME, SCI, TL)
    spec = json.load(open(os.path.join(W, ID + '.json')))
    spec['width_pct_sl'] = fsh['width']; spec['fishshapes'] = {'n': fsh['n'], 'depth': fsh['depth'], 'width': fsh['width'], 'specimens': fsh['specimens']}
    spec['measured_width'] = True
    if fsh.get('proxy_for') and (fsh.get('range') or {}).get('width'): spec['width_range'] = fsh['range']['width']   # row 49
    else: spec.pop('width_range', None)
    dst = os.path.join(ROOT, 'research', 'fish-specs', ID + '.json')
    if os.path.exists(dst):
        old = json.load(open(dst)); kept = {kk: old[kk] for kk in KEEP if kk in old}
        if old.get('pectoral', {}).get('spread') is not None and 'pectoral' in spec: kept_sp = old['pectoral']['spread']; spec['pectoral']['spread'] = kept_sp; kept['pectoral.spread'] = kept_sp
        for fk in ('pectoral', 'pelvic'):   # a flat disc fin's top-view numbers (scripts/fish-disc.py, method row 69)
            if old.get(fk, {}).get('plan') and fk in spec: spec[fk]['plan'] = old[fk]['plan']; kept[fk + '.plan'] = old[fk]['plan']
        for kk, v in kept.items():
            if '.' not in kk: spec[kk] = v
        if kept: print('kept from the existing spec:', kept)
    if 'fin_opacity' not in spec: spec['fin_opacity'] = {'preset': 'solid'}   # solid until the photo check sets the class: the translucent type defaults washed out coloured fins (oscar, guppy, gramma; sweep 2026-11-24)
    if spec.get('fin_opacity') is not False and not spec.get('fin_opacity_source'):
        try:   # family table (FG1 unit 3): a photo-checked family gives its default; the fish is then marked 'family table' and a human confirms exceptions
            fd = mod('fish-fin-family').family_default(spec.get('species', {}).get('sci', SCI))
        except Exception: fd = None
        if fd:
            spec['fin_opacity'] = fd[0]; spec['fin_opacity_source'] = 'family table: ' + fd[1] + '; not photo-checked for this species'
            print('FIN CLASS from the family table: %s -> %s (confirm with fish-fin-class.py if the photos disagree)' % (fd[1], fd[0]))
    if spec.get('fin_opacity') is not False and not spec.get('fin_opacity_source'):
        print('PHOTO CHECK NEEDED: fin transparency is on defaults. Look at reference photos, then record the class:')
        print('  python -I scripts/fish-fin-class.py %s --urls' % ID)
        print('  python -I scripts/fish-fin-class.py %s <clear|translucent|pigmented|solid> [--fin pectoral=clear] --source "..." --maps' % ID)
    json.dump(spec, open(dst, 'w'), indent=1); print('spec ->', os.path.relpath(dst, ROOT))
    run(S('fish-build.py'), dst)
    return built_depth(ID)


if __name__ == '__main__':
    if len([x for x in sys.argv[1:] if not x.startswith('--')]) < 5: sys.exit(__doc__)
    main(sys.argv[1:])
