"""Build gate for build-B fish (Fable answer 5, change 1; lane FG1). REPORT mode: it flags, it never blocks.
Reads what a build already left behind and returns {pass, mode, flags:[...]}:
  folder/build.log          last mass check, 'root band' line, PHOTO CHECK NEEDED, second depth pass
  folder/sheet.json         visual_check
  research/fish-specs/<id>.json         fin_opacity_source, fin_opacity, root_band, proxy
  src/data/fishart/<id>.anatomy.json    tlOverSl, thickness, eye, pectoral spread, thickx
Usage: python -I scripts/fish-gate.py <work-folder> <id>      one fish (prints the flags as JSON)
       python -I scripts/fish-gate.py --scan [b5,b6,b7,b8]    every stored build (backtest table; writes nothing)
fish-batch.py imports gate() and writes the result into build.json; `ok` is changed by the gate only when MODE == 'block'."""
import sys, os, re, json, glob
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SHEETS = 'C:/Users/nreed/fish-sheets'
MODE = 'report'    # 'block' only on the coordinator's yes after the backtest (Nathan's call)
# thresholds (tuned in the 2026-11-26 backtest, see HANDOFF.md FG1)
MASS_LO, MASS_HI = 0.8, 1.45          # existing build check: outside this = SOFT flag (22 of 81 builds, 4 of them later touched, a 15 % base rate: it does not predict a correction)
MASS_HARD_LO, MASS_HARD_HI = 0.7, 1.6  # outside this = HARD flag (7 of 81)
TL_SL_MIN = 1.15                      # tail with a fork or a long lobe cannot be this short
EYE_PCT_SL = (2.0, 9.0)               # eye diameter, % of SL
PEC_SPREAD = (0.05, 0.6)
HEAD_MID_MIN = 0.55                   # head width at the eyes / widest body width (method row 65)


def _j(p):
    try: return json.load(open(p, encoding='utf8'))
    except Exception: return None


def last_mass(log):
    m = re.findall(r'mass vs FishShapes: ([\d.]+)-([\d.]+)x', log)
    return (float(m[-1][0]), float(m[-1][1])) if m else None


def gate(folder, fid, legacy=False, root=ROOT):  # root: another checkout or scratch tree whose scripts built the fish
    """legacy=True (backtest of stored builds): the root-band step did not exist for 50 of the 81, so its absence is only soft.
    -> {'mode', 'pass', 'flags': [short strings], 'facts': {...}}. Never raises: a missing input is itself a flag."""
    flags, soft, facts = [], [], {}
    log = ''
    try: log = open(os.path.join(folder, 'build.log'), encoding='utf-8', errors='replace').read()
    except Exception: flags.append('no-build-log')
    spec = _j(os.path.join(root, 'research', 'fish-specs', fid + '.json')) or {}
    anat = _j(os.path.join(root, 'src', 'data', 'fishart', fid + '.anatomy.json'))
    sheet = _j(os.path.join(folder, 'sheet.json')) or {}
    shapes = _j(os.path.join(folder, 'fishshapes.json')) or {}
    if not anat: soft.append('no-anatomy'); anat = {'anatomy': {}}
    a = anat.get('anatomy', {}); r = (a.get('render') or {}).get('photo') or {}
    # 1 mass (the check that only printed)
    ms = last_mass(log)
    if ms:
        facts['mass'] = ms
        if ms[0] < MASS_HARD_LO or ms[1] > MASS_HARD_HI: flags.append('mass %.2f-%.2fx' % ms)
        elif ms[0] < MASS_LO or ms[1] > MASS_HI: soft.append('mass-soft %.2f-%.2fx' % ms)
    elif log: flags.append('no-mass-check')
    # 2 tail length
    t = a.get('tlOverSl'); facts['tlOverSl'] = t
    cd_ = (a.get('fins') or {}).get('caudal') or {}; facts['caudal'] = cd_.get('type') + (' notch %.2f' % cd_['notchFrac'] if 'notchFrac' in cd_ else ' (never measured: older build)') if cd_.get('type') else None
    if t is not None and t < TL_SL_MIN: flags.append('tlOverSl %.2f' % t)
    # 3 head vs mid-body width (row 65): drawn head half-width at ~12 % SL against the widest half-width, before the load-time soft cap
    th = a.get('thickness') or {}; st, hw = th.get('stations'), th.get('halfWidthPctSL')
    if st and hw and len(st) == len(hw):
        i = min(range(len(st)), key=lambda k: abs(st[k] - 12)); ratio = hw[i] / max(hw)
        facts['headMid'] = round(ratio, 2)
        if ratio < HEAD_MID_MIN: flags.append('head/mid width %.2f' % ratio)
    # 4 pale tail-root band
    if spec.get('root_band', 1) and log and 'root band:' not in log: (soft if legacy else flags).append('no-root-band')
    # 5 eye
    if r.get('eyeFull') and r.get('sl'):
        e = r['eyeFull'] / r['sl'] * 100; facts['eyePctSL'] = round(e, 2)
        if not EYE_PCT_SL[0] <= e <= EYE_PCT_SL[1]: flags.append('eye %.1f%% SL' % e)
    elif r: flags.append('eye-missing')
    # 6 pectoral spread
    pec = r.get('pec')
    if pec is not None and pec.get('spread') is not None:
        sp = pec['spread']; facts['pecSpread'] = sp
        if not PEC_SPREAD[0] <= sp <= PEC_SPREAD[1]: flags.append('pec spread %.2f' % sp)
    pd = _j(os.path.join(folder, 'proxy-depth.json'))   # scripts/fish-proxy-depth.py
    if pd and pd.get('flag'): flags.append('proxy depth: photo %.1f vs %.1f (%+.0f%%)' % (pd['photo_depth'], pd['proxy_depth'], pd['off_pct']))
    elif (shapes.get('proxy_for') or (spec.get('fishshapes') or {}).get('proxy_for')) and not pd: soft.append('proxy-depth-unchecked')
    # 7 records present
    if not sheet.get('visual_check'): soft.append('no-visual-check')
    fo = spec.get('fin_opacity')
    src = spec.get('fin_opacity_source') or ''
    if fo is not False and not src: soft.append('fin-class-unconfirmed')
    elif src.startswith('family table'): soft.append('fin-class-from-family-table')   # unit 3 seeds a family table that can confirm it
    if shapes.get('proxy_for') or spec.get('fishshapes', {}).get('proxy_for'): facts['proxy_for'] = shapes.get('proxy_for') or spec['fishshapes']['proxy_for']
    return {'mode': MODE, 'pass': not flags, 'flags': flags, 'soft': soft, 'facts': facts}


def base_of(d):
    return os.path.basename(d).split('-b')[0]


def scan(batches):
    rows = []
    for b in batches:
        for d in sorted(glob.glob(f'{SHEETS}/*-{b}-gen')):
            if not os.path.exists(d + '/build.json'): continue
            fid = base_of(d) + 'b'; rows.append((b, fid, gate(d, fid, legacy=True)))
    return rows


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--scan':
        rows = scan((sys.argv[2] if len(sys.argv) > 2 else 'b5,b6,b7,b8').split(','))
        for b, fid, g in rows: print(b, fid, 'PASS' if g['pass'] else '; '.join(g['flags']), ('  [' + '; '.join(g['soft']) + ']') if g['soft'] else '')
        print(len(rows), 'builds,', sum(not g['pass'] for _, _, g in rows), 'hard-flagged')
    elif len(sys.argv) >= 3: print(json.dumps(gate(sys.argv[1], sys.argv[2]), indent=1))
    else: sys.exit(__doc__)
