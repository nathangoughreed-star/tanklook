# Nathan's photo of a real planted 48 in tank (2026-11-27, chat "what keeps us from this tank"): research/visual/photo1/photo.webp.
# Rebuilt by eye from the photo as a reference scene: python research/visual/vf0/scenes/make-photo-55g.py .
# Guesses: tank size (48 x 13 x 21 in, 55 gal: front proportion matches, depth not visible), plant sizes, exact rocks.
import json, random, copy, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
base = json.load(open(root + '/src/examples/planted.json'))
r = random.Random(2711)
t = copy.deepcopy(base['tanks'][0]); L, H, D = 1219.2, 533.4, 330.2
t['tank'] = {"L": L, "H": H, "D": D}
t['camera'] = {"dist": 3000, "az": 0, "el": 3, "zoom": 1}            # straight on, eye level, as photographed
t['render']['bg'] = 'blue'; t['render']['bgSides'] = ['back']
t['lid'] = 'hood'
t['light'] = {"type": "led", "count": 1, "rows": 1, "pattern": "grid", "spacing": 0, "cone": 52, "bright": 1, "kelvin": 6500, "room": 0.1, "height": 50}
t['substrate'] = {"show": True, "type": "custom", "custom": {"grain": "gravel", "color": "#8a7650", "grain2": "gravel", "color2": "#3a332a", "share": 40, "mix": 0.5},
                  "fl": 38.1, "fr": 38.1, "bl": 63.5, "br": 63.5}
t['stand'] = {"show": True, "height": 762, "finish": "oak", "style": "cabinet", "table": {"shape": "rect", "L": L + 30, "D": D + 30, "x": 0, "z": 0}}
t['wall'] = {"show": True, "side": "back", "color": "#d9ccb2"}
t['person'] = {"show": False, "height": 1750, "side": "left"}
t['layout'] = {"id": "photo-55g", "seed": 2711}
items = []; n = 0
def add(kind, variant, x, d, size, **kw):
    global n; n += 1
    it = {"id": n, "kind": kind, "variant": variant, "seed": r.randrange(1, 10**9), "x": x, "depth": d, "lift": 0,
          "yaw": r.randint(-40, 40), "pitch": 0, "tilt": 0, "size": size}; it.update(kw); items.append(it)
# hardscape: branchy spiderwood left of centre, a low branch in front of it; lace / holey rock centre and right, slate slab behind
add('wood', 'spider', 340, 170, 520, yaw=20)
add('wood', 'branch', 190, 110, 380, yaw=-15)
add('stone', 'slate', 770, 245, 260)
add('stone', 'shale', 690, 235, 170)
add('stone', 'lace', 720, 150, 170)
add('stone', 'lace', 880, 190, 140)
add('stone', 'holey', 1120, 80, 150)
# Java fern tied on the wood
for x, d, s, lift in ((170, 125, 180, 80), (300, 160, 150, 130), (430, 185, 140, 70)):
    add('plant', 'fern', x, d, s, lift=lift)
# Amazon swords: three big ones at the back reaching the surface, two smaller bright ones in front
add('plant', 'sword', 70, 230, 400)
add('plant', 'sword', 360, 265, 440)
add('plant', 'sword', 1060, 245, 460)
add('plant', 'sword', 570, 120, 270)
add('plant', 'sword', 800, 150, 230)
# crypts low in front, vallis in the back-left corner
for x, d, s in ((470, 90, 120), (650, 80, 95), (880, 100, 130), (990, 80, 105), (260, 70, 90)):
    add('plant', 'crypt', x, d, s)
add('plant', 'grass', 35, 280, 420)
# a floating clump at the surface, back right
# add('plant', 'salvinia', 1090, 200, 90)  # left out: page reloaded under vf-shots with it (2026-11-27)
t['items'] = items
fish = []
# corys left out: with them the page reloaded under vf-shots (2026-11-27, not chased)
for i, (sp, x, y, d) in enumerate((('angel', 760, 400, 160), ('angel', 300, 430, 200))):
    fish.append({"id": i + 1, "species": sp, "x": x, "y": y, "depth": d, "yaw": r.randint(-25, 25), "pitch": 0, "roll": 0, "bend": 0})
t['fish'] = fish
s = copy.deepcopy(base); s['name'] = 'Photo: planted 55 gal, swords + spiderwood'; s['tanks'] = [t]; s['active'] = 0
json.dump(s, open(root + '/research/visual/vf0/scenes/photo-55g.json', 'w'), indent=1)
print('ok', len(items), 'items')
