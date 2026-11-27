"""Flat ventral fin disc (hillstream loach and other flat clingers, method row 69): measures each paired fin's top-view
outline numbers from the 5-row sheet's colour maps and writes them into the spec as `pectoral.plan` / `pelvic.plan`
(read by photofish.ts -> fish3d planFin). The side view sees a flat fin edge-on, so its polygon cannot give the disc; instead
  - run along the body (s0..s1, % SL from the snout): the fin's colour in the side label map (row 5), first and last column;
    a flat fin seen from the side still shows its whole length;
  - half-span (span, % SL from the midline): half the fin colour's width in the front fin map (row 4, right panel).
  python -I scripts/fish-disc.py <sheet.webp|png> <spec.json> [--peak-pec 0.58 --peak-pel 0.5 --dy-pel 0.6] [--dry]
Peaks (where along its run the rim is widest), lead / rake (how far the rim's front end sweeps ahead of the root and its rear end
behind it, % SL; Nathan 2026-11-27: the pectoral's front edge was blunt, the pelvic rays straight) and the pelvic drop are not on the sheet: defaults are read off the Commons
underside photo (Sewellia lineolata - Pracht-Flossensauger.jpg, 2026-11-27). Prints what it measured and writes the spec."""
import sys, os, json, argparse, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fishsheet as fs

ap = argparse.ArgumentParser()
ap.add_argument('sheet'); ap.add_argument('spec')
ap.add_argument('--peak-pec', type=float, default=0.58); ap.add_argument('--peak-pel', type=float, default=0.5)
ap.add_argument('--lead-pec', type=float, default=5.0); ap.add_argument('--rake-pec', type=float, default=4.0)
ap.add_argument('--lead-pel', type=float, default=1.5); ap.add_argument('--rake-pel', type=float, default=6.0)
ap.add_argument('--dy-pel', type=float, default=0.6, help='%% SL the pelvic plane lies below the pectoral (it tucks under its rear)')
ap.add_argument('--dry', action='store_true')
o = ap.parse_args()

a, M = fs.load(o.sheet); bands = fs.panel_bands(M)
if len(bands) < 6: sys.exit('fish-disc: expected 6 panels (side, finless, top, front, side map, front map), found %d' % len(bands))
A = a.astype(int); R, G, B = A[..., 0], A[..., 1], A[..., 2]
COL = {'pectoral': (R > 200) & (G > 200) & (B < 80), 'pelvic': (R < 80) & (G > 200) & (B > 200)}   # fin-map yellow, cyan
spec = json.load(open(o.spec))

def sub(m, b): y0, y1, x0, x1 = b; return m[y0:y1, x0:x1]
side, front = bands[4], bands[5]
body = sub(M, side); xs = np.where(body.any(0))[0]; snout = side[2] + xs.max()
ped = spec['landmarks']['ped'][0]; SL = snout - ped
print('side map: snout x %d, peduncle x %d (spec landmark) -> SL %d px' % (snout, ped, SL))
out = {}
for k, m in COL.items():
    cs = np.where(sub(m, side).any(0))[0]; fx = np.where(sub(m, front).any(0))[0]
    if not len(cs) or not len(fx): print('%s: not in the maps, skipped' % k); continue
    s0 = (snout - (side[2] + cs.max())) / SL * 100; s1 = (snout - (side[2] + cs.min())) / SL * 100
    span = (fx.max() - fx.min() + 1) / 2 / SL * 100
    out[k] = {'s0': round(s0, 1), 's1': round(s1, 1), 'span': round(span, 1), 'peak': o.peak_pec if k == 'pectoral' else o.peak_pel,
              'lead': o.lead_pec if k == 'pectoral' else o.lead_pel, 'rake': o.rake_pec if k == 'pectoral' else o.rake_pel,
              **({'dy': o.dy_pel} if k == 'pelvic' else {}), 'source': 'fish-disc.py: run from the side map, span from the front map (% SL)'}
    print('%s: %.1f-%.1f %% SL along the body, half-span %.1f %% SL' % (k, s0, s1, span))
# the side map often paints the pelvic over the pectoral's rear run (hillstream: one yellow piece 11-73 % SL, cyan under all of it);
# a pelvic starting at the pectoral's front is that, so it starts where the pectoral's widest part is behind it (photo: the lobes meet)
if 'pectoral' in out and 'pelvic' in out and out['pelvic']['s0'] < out['pectoral']['s0'] + 10:
    pe = out['pectoral']; pe_s1 = pe['s1']; mid = round(pe['s0'] + 0.62 * (pe_s1 - pe['s0']), 1)
    print('pelvic run starts with the pectoral (%.1f): the map overlaps them; pectoral %.1f-%.1f -> pectoral %.1f-%.1f, pelvic %.1f-%.1f'
          % (out['pelvic']['s0'], pe['s0'], pe_s1, pe['s0'], mid + 6, mid, out['pelvic']['s1']))
    pe['s1'] = round(mid + 6, 1); out['pelvic']['s0'] = mid
if not o.dry:
    for k, v in out.items(): spec.setdefault(k, {})['plan'] = v
    json.dump(spec, open(o.spec, 'w'), indent=1); print('wrote', o.spec)
