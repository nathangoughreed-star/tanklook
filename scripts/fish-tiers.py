#!/usr/bin/env python3
"""Write research/fish-sheets/tiers.json: review tier per fish species (lane FG2, R174).
Rule (research/fable/5-fish-pipeline-answer.md section 1): tier 1 = about 4 in (102 mm) and up, plus marine showpieces;
tier 2 = everything else the loft can draw (new species enter here); tier 3 = shapes the loft cannot draw.
Species.json also holds build-B 'look' rows (plecob, angelb, ...); those are not species and are skipped.
Usage: python -I scripts/fish-tiers.py   (rewrites tiers.json, prints counts)"""
import json, os, collections
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sp = json.load(open(R + '/src/data/species.json'))['species']
live = json.load(open(R + '/src/data/fishLive.json'))['live']
fish = [x for x in sp if x.get('cat', 'fw-fish') in ('fw-fish', 'sw-fish') and not x.get('kind') and x.get('habitat', 'water') == 'water']
ids = {x['id'] for x in fish}
looks = {x['id'] for x in fish if x['id'][-1] in 'bcd' and (x['id'][:-1] in ids or x['id'] == 'tailspotb')}
TIER3 = {'kuhli': 'eel-shaped loach, loft cannot draw', 'hillstream': 'flat hillstream loach, loft cannot draw',
         'goldfish': 'fancy goldfish (twin tail), loft cannot draw', 'bambooshark': 'shark body, loft cannot draw',
         'clownknife': 'knifefish (ribbon anal fin), loft cannot draw'}
SHOWPIECE = {'mandarin': 'marine showpiece under 4 in', 'banggai': 'marine showpiece under 4 in'}
out = {}
for x in sorted(fish, key=lambda x: x['id']):
    i = x['id']
    if i in looks: continue
    marine = x.get('cat') == 'sw-fish'
    if i in TIER3: t, why = 3, TIER3[i]
    elif x['tl'] >= 102: t, why = 1, f"{x['tl']} mm ({x['tl']/25.4:.1f} in), 4 in and up" + (', marine' if marine else '')
    elif i in SHOWPIECE: t, why = 1, SHOWPIECE[i]
    else: t, why = 2, f"{x['tl']} mm ({x['tl']/25.4:.1f} in), small/nano or congener" + (', marine' if marine else '')
    out[i] = {'tier': t, 'reason': why, 'live': i in live}
json.dump({'_about': 'Review tier per fish species (FG2, R174): 1 close one-by-one review, 2 batch contact sheet, 3 old model kept. Regenerate with scripts/fish-tiers.py. New species enter at tier 2. Does not change any live fish.', 'tiers': out}, open(R + '/research/fish-sheets/tiers.json', 'w'), indent=1)
c = collections.Counter(v['tier'] for v in out.values())
print(len(out), 'species;', dict(sorted(c.items())), '; live per tier', dict(sorted(collections.Counter(v['tier'] for v in out.values() if v['live']).items())), '; skipped look rows', len(looks))
