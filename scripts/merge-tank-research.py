"""Merge research/tanks/slice-*.json (maker variants + prices) into src/data/tanks.json. Generic sizes are left untouched;
new:<slug> sizes become new catalog entries (generic outer = the first variant). Run from the repo root; safe to re-run."""
import json, glob, io
P = 'src/data/tanks.json'
d = json.load(io.open(P, encoding='utf8'))
by = {m['id']: m for m in d['tanks']}
KEYS = ['brand', 'line', 'L_in', 'D_in', 'H_in', 'glass_mm', 'rimless', 'price_usd', 'price_kind', 'price_note', 'discontinued', 'url', 'checked', 'confidence']
def band(g): return 'nano' if g < 15 else 'small' if g < 40 else 'mid' if g < 75 else 'large' if g < 125 else 'monster'
# curved-front / ambiguous-axis products that the box-shaped catalog would misdraw (volume check fails)
SKIP = {'new:edge-6', 'new:evo-13_5', 'new:zoo-med-naturalistic-40g', 'new:zoo-med-naturalistic-25g'}
added = nv = 0
for f in sorted(glob.glob('research/tanks/slice-*.json')):
    terra_slice = f.endswith('C-monster-terrarium.json')
    for s in json.load(io.open(f, encoding='utf8'))['sizes']:
        vs = []
        for v in s['variants']:
            if not all(v.get(k) for k in ('L_in', 'D_in', 'H_in')): continue
            w = {k: v[k] for k in KEYS if v.get(k) not in (None, '', False) or k == 'price_usd'}
            if w.get('price_usd') is None: w.pop('price_usd', None)
            vs.append(w)
        sid = s['sizeId']
        if sid in SKIP: continue
        if sid.startswith('new:'):
            if not vs: continue
            v0 = vs[0]; gal = s.get('ratedGal') or round(v0['L_in'] * v0['D_in'] * v0['H_in'] / 231 * 0.9)
            m = {'id': 'n_' + sid[4:].replace('-', '_'), 'name': (vs[0]['brand'] + ' ' + (vs[0].get('line') or sid[4:])).strip(), 'ratedGal': gal, 'shape': 'rect',
                 'outer': {'L': round(v0['L_in'] * 25.4, 1), 'H': round(v0['H_in'] * 25.4, 1), 'D': round(v0['D_in'] * 25.4, 1)},
                 'glassMm': 5 if terra_slice and 'terrarium' not in sid or terra_slice else 6, 'band': band(gal), 'source': 'maker listing (research/tanks, checked 2026-10-19)'}
            if terra_slice and sid != 'new:waterbox': m['terrarium'] = True
            if m['id'] in by: continue  # already merged on an earlier run
            d['tanks'].append(m); by[m['id']] = m; added += 1
        m = by.get(sid if not sid.startswith('new:') else 'n_' + sid[4:].replace('-', '_'))
        if m and vs:
            m['variants'] = sorted(vs, key=lambda v: (v['brand'], v.get('line', ''))); nv += len(vs)
d['tanks'] = [m for m in d['tanks'] if m['id'] not in ('n_edge_6', 'n_evo_13_5', 'n_zoo_med_naturalistic_40g')]
for m in d['tanks']:
    if m['id'] == 'n_20gal_long_terrarium': m['ratedGal'] = 18
io.open(P, 'w', encoding='utf8').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
print('new sizes', added, 'variants', nv, 'sizes with variants', sum(1 for m in d['tanks'] if m.get('variants')), 'of', len(d['tanks']))
