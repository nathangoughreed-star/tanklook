import json, random, copy, sys
root = sys.argv[1]
base = json.load(open(root + '/src/examples/planted.json'))
reef = json.load(open(root + '/src/examples/reef.json'))
CAM = {"dist": 3000, "az": -8, "el": 8, "zoom": 1}
def scene(name, t):
    s = copy.deepcopy(base); s['name'] = name; s['tanks'] = [t]; s['active'] = 0; return s
def item(r, iid, kind, variant, x, d, size, **kw):
    it = {"id": iid, "kind": kind, "variant": variant, "seed": r.randrange(1, 10**9), "x": x, "depth": d, "lift": 0,
          "yaw": r.randint(-40, 40), "pitch": 0, "tilt": 0, "size": size}; it.update(kw); return it
def fish(r, iid, sp, L, H, D, ymin=0.25, ymax=0.75):
    return {"id": iid, "species": sp, "x": r.uniform(0.15, 0.85) * L, "y": r.uniform(ymin, ymax) * H, "depth": r.uniform(0.25, 0.75) * D,
            "yaw": r.randint(-25, 25), "pitch": 0, "roll": 0, "bend": round(r.uniform(-0.15, 0.15), 2)}

# 1. planted 4 ft: grass clumps, driftwood, sand with black flecks (Nathan's screenshot 1)
r = random.Random(101)
t = copy.deepcopy(base['tanks'][0]); L, H, D = 1219.2, 533.4, 457.2
t['tank'] = {"L": L, "H": H, "D": D}; t['camera'] = dict(CAM)
t['substrate'] = {"show": True, "type": "custom", "custom": {"grain": "sand", "color": "#e3d4b2", "grain2": "gravel", "color2": "#262626", "share": 35, "mix": 0.5}, "fl": 38.1, "fr": 38.1, "bl": 88.9, "br": 88.9}
t['light'] = {"type": "led", "count": 1, "rows": 1, "pattern": "grid", "spacing": 0, "cone": 52, "bright": 1, "kelvin": 6500, "room": 0.15, "height": 50}
t['stand']['table']['L'] = L + 30; t['stand']['table']['D'] = D + 30
t['layout'] = {"id": "vf0-planted", "seed": 101}
items = []; n = 0
def add(*a, **kw):
    global n; n += 1; items.append(item(r, n, *a, **kw))
add('wood', 'spider', 420, 260, 420); add('wood', 'branch', 760, 300, 480, yaw=-20); add('wood', 'mopani', 300, 180, 180)
for i in range(14):   # grass clumps across the front and middle
    add('plant', 'grass', r.uniform(40, L - 40), r.uniform(90, 260), r.uniform(150, 260))
for i in range(10):   # taller grass / swords at the back
    add('plant', 'grass', r.uniform(60, L - 60), r.uniform(320, 420), r.uniform(300, 450))
for x in (150, 1050): add('plant', 'sword', x, r.uniform(300, 380), r.uniform(200, 260))
for i in range(6): add('plant', 'crypt', r.uniform(200, 1000), r.uniform(150, 260), r.uniform(70, 100))
for i in range(4): add('plant', 'fern', r.uniform(380, 800), r.uniform(240, 300), r.uniform(100, 140), lift=r.uniform(60, 140))
t['items'] = items
f = []; k = 0
for sp, c in (('honeygourami', 4), ('neon', 14), ('bronzecory', 6), ('amano', 4)):
    for i in range(c):
        k += 1; f.append(fish(r, k, sp, L, H, D, *((0.03, 0.06) if sp in ('bronzecory', 'amano') else (0.3, 0.75))))
t['fish'] = f
json.dump(scene('VF0 planted 4 ft', t), open(root + '/research/visual/vf0/scenes/planted4.json', 'w'), indent=1)

# 2. small rimless neon tank on gravel, driftwood, red stems (screenshot 2)
r = random.Random(202)
t = copy.deepcopy(base['tanks'][0]); L, H, D = 450, 300, 300
t['tank'] = {"L": L, "H": H, "D": D}; t['camera'] = dict(CAM)
t['render']['rim'] = False; t['render']['glassType'] = 'lowiron'
t['substrate'] = {"show": True, "type": "gravel", "custom": base['tanks'][0]['substrate']['custom'], "fl": 25.4, "fr": 25.4, "bl": 63.5, "br": 63.5}
t['light'] = {"type": "led", "count": 1, "rows": 1, "pattern": "grid", "spacing": 0, "cone": 52, "bright": 1, "kelvin": 7000, "room": 0.15, "height": 50}
t['stand'] = {"show": True, "height": 762, "finish": "black", "style": "cabinet", "table": {"shape": "rect", "L": 600, "D": 400, "x": 0, "z": 0}}
t['layout'] = {"id": "vf0-nano", "seed": 202}
items = []; n = 0
add('wood', 'spider', 170, 170, 260, yaw=25)
for i in range(7): add('plant', 'stemred', r.uniform(260, 420), r.uniform(190, 270), r.uniform(200, 270))
for i in range(4): add('plant', 'stem', r.uniform(30, 140), r.uniform(200, 270), r.uniform(200, 260))
for i in range(5): add('plant', 'carpet', r.uniform(60, 400), r.uniform(40, 120), r.uniform(50, 70))
add('plant', 'anubias', 180, 160, 50, lift=70)
t['items'] = items
t['fish'] = [fish(r, i + 1, 'neon', L, H, D, 0.3, 0.7) for i in range(12)]
json.dump(scene('VF0 rimless nano', t), open(root + '/research/visual/vf0/scenes/nano.json', 'w'), indent=1)

# 3. reef bow-front with live rock and corals (screenshot 3): the reef example, camera locked
s = copy.deepcopy(reef); s['name'] = 'VF0 reef bow-front'; s['tanks'][0]['camera'] = dict(CAM)
json.dump(s, open(root + '/research/visual/vf0/scenes/reef.json', 'w'), indent=1)
print('ok')
