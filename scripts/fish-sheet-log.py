"""Run scripts/fish-sheet-audit.py on a sheet and append one row to research/fish-sheets/log.csv.
  python -I scripts/fish-sheet-log.py SHEET --species oscar --date 2026-11-20 --generator ChatGPT --prompt B --photos "2 real photos" \
         [--layout portrait-3stack] [--draw "seed 1"] [--calls N] [--rounds N] [--verdict good|fixable|bad|not built|unknown] [--notes "..."] [--mirror] [--real R]
Audit numbers come only from the audit script (stdout is parsed); every field you do not pass is written as "unknown".
Method doc: research/fish-model-sheet-method.md; scoring: research/fish-sheet-methodology-audit.md section 4."""
import argparse, csv, os, re, subprocess, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
LOG = os.path.join(ROOT, 'research', 'fish-sheets', 'log.csv')
COLS = ['species', 'sheet_file', 'date', 'generator', 'prompt_version', 'ref_photos', 'layout', 'draw', 'size_px', 'side_len_px', 'top_len_px',
        'side_top_len_pct', 'front_top_width_pct', 'tail_edge_on', 'width_depth', 'front_wh', 'eye_mouth_delta', 'pass', 'failed_checks',
        'model_verdict', 'claude_calls', 'nathan_rounds', 'notes']


def audit(sheet, extra):
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fish-sheet-audit.py'), sheet, *extra], capture_output=True, text=True)
    return r.stdout + r.stderr


def parse(out):
    d = {}
    g = lambda pat: (re.search(pat, out) or [None, None])[1]
    d['side_len_px'] = g(r'panel side: x \S+ \((\d+) px long')
    d['top_len_px'] = g(r'panel top: x \S+ \((\d+) px long')
    d['side_top_len_pct'] = g(r'length: top \d+ vs side \d+ px \(([\d.]+)%')
    d['front_top_width_pct'] = g(r'front body width \d+ px vs top panel.s widest \d+ px at \S+ SL \(([+-][\d.]+)%')
    d['tail_edge_on'] = g(r'tail edge-on: .*?= ([\d.]+) \(')
    d['width_depth'] = g(r'RESULT .*width/depth ([\d.]+)')
    d['front_wh'] = g(r'RESULT .*front ([\d.]+)')
    m = re.search(r'RESULT\s+(PASS|FAIL)', out)
    d['pass'] = m.group(1) if m else 'AUDIT-ERROR'
    d['failed_checks'] = ';'.join(re.findall(r'^FAIL\s+([^:]+):', out, re.M)) or ''
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('--species', required=True)
    for k in ('date', 'generator', 'prompt', 'photos', 'layout', 'draw', 'calls', 'rounds', 'verdict', 'notes', 'real', 'stations', 'eye-mouth'):
        ap.add_argument('--' + k)
    ap.add_argument('--mirror', action='store_true'); ap.add_argument('--no-write', action='store_true')
    a = ap.parse_args()
    extra = (['--mirror'] if a.mirror else []) + (['--real', a.real] if a.real else []) + (['--stations', a.stations] if a.stations else [])
    out = audit(a.sheet, extra)
    d = parse(out)
    w, h = Image.open(a.sheet).size
    u = lambda v: v if v not in (None, '') else 'unknown'
    row = {'species': a.species, 'sheet_file': a.sheet.replace(chr(92), '/'), 'date': u(a.date), 'generator': u(a.generator), 'prompt_version': u(a.prompt),
           'ref_photos': u(a.photos), 'layout': u(a.layout) if a.layout else ('portrait' if h > w else 'landscape') + f' {w}x{h}', 'draw': u(a.draw),
           'size_px': f'{w}x{h}', 'eye_mouth_delta': u(getattr(a, 'eye_mouth')) if getattr(a, 'eye_mouth') else 'not measured',
           'model_verdict': u(a.verdict), 'claude_calls': u(a.calls), 'nathan_rounds': u(a.rounds), 'notes': a.notes or ''}
    row.update({k: (v if v is not None else 'n/a') for k, v in d.items()})
    if not a.no_write:
        new = not os.path.exists(LOG)
        with open(LOG, 'a', newline='', encoding='utf8') as f:
            wr = csv.DictWriter(f, COLS, lineterminator='\n')
            if new: wr.writeheader()
            wr.writerow({c: row.get(c, 'unknown') for c in COLS})
    print(out.strip().splitlines()[-1] if out.strip() else 'no output'); print({k: row[k] for k in ('side_top_len_pct', 'front_top_width_pct', 'tail_edge_on', 'width_depth', 'pass', 'failed_checks')})


main()
