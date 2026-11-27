# HG1: one test tank per hardscape type (three seeds across a bare 48 in tank, plus a row with its settings pushed), for
# `node scripts/vf-shots.mjs --scenes research/screens/HG1/scenes/<type>.json --views front`.
import json, copy, os
here = os.path.dirname(os.path.abspath(__file__))
base = json.load(open(os.path.join(here, '../../visual/vf0/scenes/photo-60t.json')))
T = base['tanks'][0]
TYPES = {  # kind, size (mm), extra settings for the third piece
  'spider': ('wood', 420, {'branch': 0.8, 'spread': 0.7}), 'redmoor': ('wood', 420, {'gnarl': 0.8}), 'manzanita': ('wood', 380, {'branch': 0.8}),
  'malaysian': ('wood', 360, {'gnarl': 0.8, 'col': 1}), 'mopani': ('wood', 300, {'branch': 0.9}), 'branch': ('wood', 420, {'spread': 0.8}),
  'cholla': ('wood', 260, {'holes': 0.9}),
  'seiryu': ('stone', 220, {'tall': 0.8}), 'dragon': ('stone', 230, {'holes': 0.9}), 'lava': ('stone', 180, {'holes': 0.9}),
  'slate': ('stone', 280, {'layers': 0.9}), 'shale': ('stone', 230, {'layers': 0.9}), 'lace': ('stone', 230, {'holes': 0.9, 'tall': 0.8}),
  'holey': ('stone', 200, {'holes': 0.9}), 'river': ('stone', 170, {'col': 1}),
}
SEEDS = [1103, 52771, 900913]
for v, (kind, size, extra) in TYPES.items():
  s = copy.deepcopy(T)
  s['fish'] = []
  items = []
  for i, sd in enumerate(SEEDS):
    it = {'id': i + 1, 'kind': kind, 'variant': v, 'seed': sd, 'x': T['tank']['L'] * (0.2 + 0.3 * i), 'depth': 160, 'lift': 0, 'yaw': 0, 'pitch': 0, 'tilt': 0, 'size': size}
    if i == 2: it['hs'] = extra
    items.append(it)
  s['items'] = items
  d = copy.deepcopy(base); d['tanks'] = [s]; d['name'] = f'HG1 {v}'
  json.dump(d, open(os.path.join(here, 'scenes', v + '.json'), 'w'), indent=1)
print('ok', len(TYPES))
