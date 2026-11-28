"""BH1 design pictures: writes research/behavior/bh1/*.svg (rasterized separately)."""
import math, os, random, sys
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FONT = "font-family='Segoe UI, Arial, sans-serif'"

def svg(w, h, body, title):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}' {FONT}>"
            f"<rect width='{w}' height='{h}' fill='#fbfaf7'/>"
            f"<text x='20' y='34' font-size='22' font-weight='600' fill='#222'>{title}</text>{body}</svg>")

def t(x, y, s, size=14, fill='#333', anchor='start', weight='400'):
    return f"<text x='{x}' y='{y}' font-size='{size}' fill='{fill}' text-anchor='{anchor}' font-weight='{weight}'>{s}</text>"

def box(x, y, w, h, fill, stroke, r=10):
    return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{r}' fill='{fill}' stroke='{stroke}' stroke-width='2'/>"

def arrow(x1, y1, x2, y2, c='#555', w=2.5):
    a = math.atan2(y2 - y1, x2 - x1); L = 11
    p1 = (x2 - L * math.cos(a - .4), y2 - L * math.sin(a - .4)); p2 = (x2 - L * math.cos(a + .4), y2 - L * math.sin(a + .4))
    return (f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{c}' stroke-width='{w}'/>"
            f"<polygon points='{x2},{y2} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}' fill='{c}'/>")

def fish(x, y, L, ang=0, col='#c0703a', fins=False, flip=False, slim=1.0, curve=0.0, op=1):
    """Side-view fish glyph, nose at +x before rotation. fins=True raises a tall dorsal/anal (display)."""
    h = L * 0.17 * slim
    sx = -1 if flip else 1
    # body as a bent spine: sample points, curve bends the tail
    pts_top, pts_bot = [], []
    n = 14
    for i in range(n + 1):
        u = i / n  # 0 nose .. 1 tail base
        xx = L * 0.5 - u * L * 0.8
        yy = curve * L * (u ** 2) * 0.6
        th = h * math.sin(math.pi * min(1, u * 1.05 + 0.04)) ** 0.7 + 0.5
        pts_top.append((xx, yy - th)); pts_bot.append((xx, yy + th))
    body = "M" + " L".join(f"{p[0]:.1f},{p[1]:.1f}" for p in pts_top + pts_bot[::-1]) + "Z"
    tx, ty = pts_top[-1][0], curve * L * 0.6
    tail = f"M{tx+2:.1f},{ty:.1f} L{tx - L*0.2:.1f},{ty - h*1.1:.1f} L{tx - L*0.16:.1f},{ty:.1f} L{tx - L*0.2:.1f},{ty + h*1.1:.1f}Z"
    dh = h * (1.6 if fins else 0.5)
    dors = f"M{L*0.12:.1f},{-h*0.9:.1f} Q{-L*0.05:.1f},{-h-dh:.1f} {-L*0.26:.1f},{-h*0.55 + curve*L*0.05:.1f}Z"
    anal = f"M{-L*0.02:.1f},{h*0.8:.1f} Q{-L*0.14:.1f},{h+dh*0.8:.1f} {-L*0.27:.1f},{h*0.5 + curve*L*0.05:.1f}Z" if fins else ""
    eye = f"<circle cx='{L*0.38:.1f}' cy='{-h*0.2:.1f}' r='{max(1.5, L*0.03):.1f}' fill='#111'/>"
    g = (f"<g transform='translate({x},{y}) rotate({ang}) scale({sx},1)' opacity='{op}'>"
         f"<path d='{dors}' fill='{col}' opacity='.8'/>" + (f"<path d='{anal}' fill='{col}' opacity='.8'/>" if anal else "") +
         f"<path d='{tail}' fill='{col}' opacity='.85'/><path d='{body}' fill='{col}' stroke='#222' stroke-width='1.2'/>{eye}</g>")
    return g

def kuhli(pts, col='#d28a2a', w=7):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    stripes = ""
    for i in range(2, len(pts) - 1, 2):
        x, y = pts[i]; stripes += f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{w*0.45:.1f}' fill='#3a2a1a'/>"
    hx, hy = pts[0]
    return (f"<path d='{d}' fill='none' stroke='#222' stroke-width='{w+2.4}' stroke-linecap='round' stroke-linejoin='round'/>"
            f"<path d='{d}' fill='none' stroke='{col}' stroke-width='{w}' stroke-linecap='round' stroke-linejoin='round'/>{stripes}"
            f"<circle cx='{hx:.1f}' cy='{hy:.1f}' r='1.8' fill='#111'/>")

def wave(x0, y0, x1, y1, amp, k, n=40, ph=0):
    pts = []
    dx, dy = x1 - x0, y1 - y0; Ln = math.hypot(dx, dy); nx, ny = -dy / Ln, dx / Ln
    for i in range(n + 1):
        u = i / n
        a = amp * math.sin(k * u * 2 * math.pi + ph)
        pts.append((x0 + dx * u + nx * a, y0 + dy * u + ny * a))
    return pts

files = {}

# ---------------- 01 architecture ----------------
b = ""
b += t(20, 58, "Three layers. A species is a data file (its ethogram), never code. Five pilots use it; every other fish keeps today's sim.", 15, '#555')
cols = [("1  World: what the scape offers", '#e7f0e3', '#5c8a4a', ["Places (tagged spots): cave-in, cave-mouth,", "overhang, crevice, root-mass, open-sand,", "glass, leaf (slice 2)", "Surfaces at any angle (normal + exact", "local shape for rock, wood, cave shell)", "Insides: hollow caves, permeable roots,", "buryable sand", "Food patches: graze spots, sift spots"]),
        ("2  Mind: one behavior at a time", '#e5ecf6', '#4a6a9a', ["Drives: rest, forage, explore, company,", "security, air (cory), social", "Personality per fish: activity, boldness,", "curiosity, aggression, favourite spot; rank", "Score = drive x personality x place near", "Overrides: startle (spreads), intruder", "near home, air need", "Encounter scripts: dominance, courting"]),
        ("3  Body: how it moves and rests", '#f6ebe0', '#a0662e', ["Movement clock: burst, glide, pause", "(explosive start = burst, no wind-up)", "Body modes: tail swimmer / surface", "crawler / whole-body undulator", "Rest pose fits the surface: perch, belly-", "down, cling upside down, lie curved, drape", "Secondary motion: pectorals, mouth,", "barbels (long-fin trailing in slice 2)"])]
x = 20
for i, (head, fill, st, lines) in enumerate(cols):
    b += box(x, 80, 360, 300, fill, st)
    b += t(x + 16, 110, head, 17, st, weight='700')
    for j, ln in enumerate(lines):
        b += t(x + 16, 142 + j * 28, ln, 14)
    if i < 2: b += arrow(x + 362, 230, x + 398, 230)
    x += 400
b += box(20, 410, 1160, 70, '#fff', '#999')
b += t(36, 438, "Species file (JSON, from the ethogram): body mode, attach mode, clock lengths, rest postures + weights, cohesion + contact, home type,", 14)
b += t(36, 462, "forage styles, escape kind, displays (dominance pose, courting script). Feeds all three layers.", 14)
for xx in (200, 600, 1000): b += arrow(xx, 410, xx, 384, '#999', 2)
b += box(820, 500, 360, 50, '#eee', '#888')
b += t(1000, 531, "fish3d: pose per frame (unchanged renderer)", 14, anchor='middle')
b += f"<path d='M1185,230 C1215,230 1215,525 1182,525' fill='none' stroke='#a0662e' stroke-width='2.5'/>" + arrow(1186, 525, 1181, 525, '#a0662e')
b += t(20, 530, "Out of scope: tank events, day/night, breeding mechanics.", 14, '#a33')
files['01-architecture'] = svg(1220, 570, b, "BH1: behavior system layers")

# ---------------- 02 scape affordances ----------------
W, H = 1400, 760
b = ""
b += t(20, 58, "Review tank side section (30 gal). Dots = places the world map finds; fish = the five pilots in the poses slice 1 must produce.", 15, '#555')
TX, TY, TW, TH = 40, 80, 1320, 600
b += f"<rect x='{TX}' y='{TY}' width='{TW}' height='{TH}' fill='#e6f1f5' stroke='#7a9aa8' stroke-width='3'/>"
b += f"<line x1='{TX}' y1='{TY+30}' x2='{TX+TW}' y2='{TY+30}' stroke='#7ab' stroke-dasharray='6 4'/>" + t(TX + 8, TY + 24, "water surface", 12, '#58a')
sandY = TY + TH - 70
b += f"<path d='M{TX},{sandY} Q400,{sandY-25} 700,{sandY-5} T{TX+TW},{sandY-15} L{TX+TW},{TY+TH} L{TX},{TY+TH}Z' fill='#e8d6a8' stroke='#b89a5a'/>"
b += t(TX + TW - 200, TY + TH - 14, "sand (buryable, 2 in)", 13, '#7a5a20')
# cave (hollow) at left
cx, cy = 150, sandY - 10
b += f"<path d='M{cx-60},{cy} L{cx-60},{cy-110} Q{cx+40},{cy-170} {cx+150},{cy-110} L{cx+150},{cy} L{cx+120},{cy} L{cx+120},{cy-95} Q{cx+40},{cy-140} {cx-30},{cy-95} L{cx-30},{cy}Z' fill='#9a8f84' stroke='#555' stroke-width='2'/>"
b += f"<rect x='{cx-30}' y='{cy-95}' width='150' height='95' fill='#cfd8dc' opacity='.55'/>"
b += t(cx + 45, cy - 175, "cave: hollow shell", 13, '#333', 'middle', '600')
b += t(cx + 45, cy + 22, "(today: a solid box)", 12, '#a33', 'middle')
# wood with overhang, middle
b += f"<path d='M380,{sandY-5} L420,{sandY-90} Q470,{sandY-250} 640,{sandY-300} L760,{sandY-310} L765,{sandY-285} L650,{sandY-270} Q500,{sandY-220} 450,{sandY-80} L430,{sandY-5}Z' fill='#7a5534' stroke='#3e2a18' stroke-width='2'/>"
b += t(700, sandY - 322, "wood: overhang", 13, '#333', 'middle', '600')
# rock pile with crevice, right-middle
b += f"<ellipse cx='900' cy='{sandY-40}' rx='80' ry='55' fill='#8e9499' stroke='#444' stroke-width='2'/>"
b += f"<ellipse cx='1015' cy='{sandY-35}' rx='60' ry='48' fill='#9aa0a5' stroke='#444' stroke-width='2'/>"
b += f"<ellipse cx='955' cy='{sandY-115}' rx='65' ry='45' fill='#868c91' stroke='#444' stroke-width='2'/>"
b += t(960, sandY - 170, "rock pile: crevice", 13, '#333', 'middle', '600')
# root mass, right
rx0 = 1150
for k in range(9):
    sx0 = rx0 + k * 14
    b += f"<path d='M{sx0},{sandY-200} C{sx0-30+k*5},{sandY-140} {sx0+25-k*4},{sandY-80} {sx0-10+k*3},{sandY-5}' fill='none' stroke='#6b4a2a' stroke-width='5'/>"
b += f"<rect x='{rx0-40}' y='{sandY-230}' width='200' height='35' rx='12' fill='#6b4a2a'/>"
b += t(rx0 + 60, sandY - 240, "root mass: permeable", 13, '#333', 'middle', '600')
# sword plant
for k, (dx, h) in enumerate([(-30, 230), (-10, 280), (15, 260), (35, 200)]):
    px0 = 560
    b += f"<path d='M{px0},{sandY-8} Q{px0+dx*0.3},{sandY-h*0.6} {px0+dx*2.2},{sandY-h} Q{px0+dx*1.2},{sandY-h*0.55} {px0+6},{sandY-8}Z' fill='#4f9a45' stroke='#2e6a28'/>"
# places dots
P = {'cave-in': '#d23', 'cave-mouth': '#f80', 'overhang': '#93c', 'crevice': '#06c', 'root-mass': '#6b4a2a', 'open-sand': '#c9a227', 'glass': '#2aa', 'stem-thicket': '#2e8b2e'}
dots = [('cave-in', cx + 10, cy - 30), ('cave-in', cx + 70, cy - 60), ('cave-mouth', cx + 168, cy - 45),
        ('overhang', 600, sandY - 245), ('overhang', 690, sandY - 265), ('crevice', 960, sandY - 60), ('crevice', 905, sandY - 95),
        ('root-mass', 1200, sandY - 120), ('root-mass', 1225, sandY - 60), ('open-sand', 690, sandY - 30), ('open-sand', 470, sandY - 20), ('open-sand', 1080, sandY - 15),
        ('glass', TX + TW - 8, TY + 260), ('glass', TX + 8, TY + 200), ('stem-thicket', 565, sandY - 150)]
for k, x0, y0 in dots:
    b += f"<circle cx='{x0}' cy='{y0}' r='8' fill='{P[k]}' stroke='#fff' stroke-width='2'/>"
# fish
# cory pile on sand
b += fish(690, sandY - 14, 46, 0, '#e8e8e0') + fish(712, sandY - 24, 46, -8, '#e8e8e0') + fish(672, sandY - 26, 44, 6, '#e8e8e0', flip=True)
b += fish(480, sandY - 2, 46, 28, '#e8e8e0')  # sifting snout-in
b += t(700, sandY + 22, "cory pile (contact)", 12, '#333', 'middle') + t(480, sandY + 34, "cory sifting, snout in", 12, '#333', 'middle')
# pleco upside down on cave ceiling
b += fish(cx + 45, cy - 126, 70, 180, '#5a5048')
b += t(cx + 45, cy - 75, "pleco clings upside down", 12, '#fff', 'middle')
# pleco on glass right
b += fish(TX + TW - 18, TY + 330, 64, -90, '#5a5048')
b += t(TX + TW - 30, TY + 420, "pleco on glass", 12, '#333', 'end')
# gudgeon perched at cave mouth
b += fish(cx + 205, cy - 14, 44, 0, '#5b8fd0', flip=True)
b += t(cx + 215, cy - 45, "gudgeon perches at its cave", 12, '#333', 'middle')
# krib pair hovering under wood overhang
b += fish(620, sandY - 220, 62, 0, '#c86a7a') + fish(700, sandY - 205, 54, 4, '#d9a07a', flip=True)
b += t(660, sandY - 175, "krib pair hovers under the wood", 12, '#333', 'middle')
# kuhli in roots and buried
b += kuhli(wave(1170, sandY - 150, 1230, sandY - 90, 6, 2.2))
b += kuhli([(1060, sandY - 8), (1068, sandY - 4)], w=7)
b += f"<path d='M1068,{sandY+2} q40,12 80,2' stroke='#b48a3a' stroke-width='6' fill='none' stroke-dasharray='4 4'/>"
b += t(1100, sandY + 40, "kuhli buried, head out", 12, '#333', 'middle')
b += kuhli([(985, sandY - 155), (995, sandY - 162), (1010, sandY - 160), (1022, sandY - 152), (1030, sandY - 142)], w=7)
b += t(1030, sandY - 190, "kuhli draped", 12, '#333', 'middle')
b += t(1210, sandY - 260, "kuhli threads roots (hidden)", 12, '#333', 'middle')
# legend
lx = 60
for k, c in P.items():
    b += f"<circle cx='{lx}' cy='{TY+TH+40}' r='7' fill='{c}'/>" + t(lx + 12, TY + TH + 45, k, 13)
    lx += 150
files['02-scape-affordances'] = svg(W, H, b, "BH1: what the scape offers, and the pilots using it")

# ---------------- 03 movement cycle ----------------
W, H = 1200, 640
b = t(20, 58, "Speed over 20 s (illustrative tuning, not measured). Every ethogram: stop-go, never steady cruising.", 15, '#555')
PX, PY, PW = 110, 90, 1040
rows = [("Today's sim (all species)", '#999', 'old'), ("Rummynose: short glide, almost no pause", '#c33', 'tetra'),
        ("Kribensis: deliberate move, hover", '#c86a7a', 'krib'), ("Peacock gudgeon: hover, hop, perch", '#5b8fd0', 'gudg'),
        ("Panda cory: explosive scoot, long settle", '#8a8a70', 'cory'), ("Bristlenose: crawl steps, rare swim", '#5a5048', 'pleco')]
RH = 85
random.seed(4)
def series(kind):
    T = 20.0; dt = 0.02; out = []; t0 = 0; v = 0
    if kind == 'old':
        return [(i * dt, 0.55 + 0.05 * math.sin(i * dt * 1.3)) for i in range(int(T / dt))]
    sched = []; tt = 0
    while tt < T:
        if kind == 'tetra': sched += [('b', .25, .9), ('g', .5 + random.random() * .4, 0), ('p', .1, 0)]
        if kind == 'krib': sched += [('b', .4, .6), ('g', 1.0, 0), ('p', 1.5 + random.random() * 2, 0)]
        if kind == 'gudg': sched += [('b', .2, .7), ('g', .4, 0), ('p', 2 + random.random() * 3, 0)]
        if kind == 'cory': sched += [('b', .15, 1.0), ('g', .35, 0), ('p', 3 + random.random() * 6, 0)]
        if kind == 'pleco':
            for _ in range(4): sched += [('s', .35, .18), ('p', .5 + random.random() * .6, 0)]
            sched += [('p', 3 + random.random() * 3, 0)]
            if random.random() < .35: sched += [('b', .3, .95), ('g', .3, 0)]
        tt = sum(s[1] for s in sched)
    i = 0; tcur = 0
    for kind2, dur, peak in sched:
        n = int(dur / dt)
        for k in range(n):
            if kind2 == 'b': v = v + (peak - v) * 0.5
            elif kind2 == 'g': v *= 0.93
            elif kind2 == 's': v = peak * math.sin(math.pi * k / max(1, n))
            else: v *= 0.7
            out.append((tcur, v)); tcur += dt
            if tcur >= T: return out
    return out
for r, (lab, c, kind) in enumerate(rows):
    y0 = PY + r * RH + 70
    b += f"<line x1='{PX}' y1='{y0}' x2='{PX+PW}' y2='{y0}' stroke='#ccc'/>"
    s = series(kind)
    d = "M" + " L".join(f"{PX + tt / 20 * PW:.1f},{y0 - v * 55:.1f}" for tt, v in s)
    b += f"<path d='{d}' fill='none' stroke='{c}' stroke-width='2.4'" + (" stroke-dasharray='7 5'" if kind == 'old' else "") + "/>"
    b += t(PX + 6, y0 - 58, lab, 14, c, weight='600')
b += t(PX, PY + 6 * RH + 95, "0 s", 12, '#777') + t(PX + PW, PY + 6 * RH + 95, "20 s", 12, '#777', 'end')
b += t(PX + PW / 2, PY + 6 * RH + 95, "burst (steep rise)  ->  glide (decay)  ->  pause (flat, pectorals only)", 13, '#555', 'middle')
files['03-movement-cycle'] = svg(W, H + 10, b, "BH1: one movement clock, tuned per species")

# ---------------- 04 surface crawl ----------------
W, H = 1200, 620
b = t(20, 58, "A crawler is glued to the shell 'clearance = body radius' around every solid; its belly follows the surface normal, not gravity.", 15, '#555')
# wood limb cross-section (big rounded shape) + glass on right
b += f"<rect x='1080' y='80' width='26' height='480' fill='#cfe6ee' stroke='#7a9aa8' stroke-width='2'/>" + t(1093, 590, "glass", 13, '#58a', 'middle')
b += f"<path d='M120,520 C140,300 330,200 560,230 C760,255 860,380 820,520 Z' fill='#7a5534' stroke='#3e2a18' stroke-width='3'/>"
b += t(470, 400, "wood (exact local shape,", 15, '#f3e6d6', 'middle') + t(470, 422, "rounded edges)", 15, '#f3e6d6', 'middle')
b += f"<path d='M95,525 C115,280 325,170 560,202 C785,230 890,375 848,525' fill='none' stroke='#2a7' stroke-width='2' stroke-dasharray='6 5'/>"
b += t(170, 255, "crawl shell", 13, '#2a7')
# plecos along shell with normals
import cmath
def bez(p0, p1, p2, p3, u):
    return tuple((1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * bb + 3 * (1 - u) * u * u * c + u ** 3 * d for a, bb, c, d in zip(p0, p1, p2, p3))
seg1 = ((95, 525), (115, 280), (325, 170), (560, 202)); seg2 = ((560, 202), (785, 230), (890, 375), (848, 525))
for u, seg in [(0.25, seg1), (0.6, seg1), (0.45, seg2), (0.85, seg2)]:
    p = bez(*seg, u); q = bez(*seg, min(1, u + 0.02))
    a = math.degrees(math.atan2(q[1] - p[1], q[0] - p[0]))
    nx, ny = math.sin(math.radians(a)), -math.cos(math.radians(a))
    b += arrow(p[0], p[1], p[0] + nx * 45, p[1] + ny * 45, '#2a7', 2)
    b += fish(p[0] - nx * 2, p[1] - ny * 2, 58, a, '#5a5048')
b += t(640, 160, "normal = gradient of the distance field", 13, '#2a7')
# step cycle inset
b += box(40, 80, 360, 120, '#fff', '#999')
b += t(56, 106, "Crawl step (repeats, with pauses):", 14, '#333', weight='600')
for i, s in enumerate(["1 release mouth", "2 slide 0.1-0.2 body length", "3 reattach, rear swings round", "4 pause; mouth works only if grazing"]):
    b += t(56, 130 + i * 18, s, 13)
# hop to glass
b += f"<path d='M860,470 C950,420 1010,380 1068,360' fill='none' stroke='#c33' stroke-width='2.5' stroke-dasharray='8 5'/>" + arrow(1050, 366, 1068, 360, '#c33')
b += t(900, 360, "longer trip: let go, a few", 13, '#c33') + t(900, 378, "strong strokes, reattach", 13, '#c33')
b += fish(1066, 300, 58, -90, '#5a5048')
b += t(600, 560, "Corners and edges: the rounded shape turns the body through them (nerite-style reach across, shift over).", 13, '#555', 'middle')
files['04-surface-crawl'] = svg(W, H, b, "BH1: surface crawler (bristlenose; later oto, Amano, nerite)")

# ---------------- 05 displays ----------------
W, H = 1400, 700
b = t(20, 58, "Two shared encounter scripts. Each species picks its poses; both always END (no breeding, no endless chase).", 15, '#555')
def frame(x, y, cap, inner):
    return box(x, y, 250, 200, '#fff', '#bbb', 8) + inner + t(x + 125, y + 225, cap, 13, '#333', 'middle')
# Dominance row: gudgeon males
y = 110
b += t(20, y - 10, "Dominance (peacock gudgeon males; krib = frontal, pleco = cheek spines)", 16, '#4a6a9a', '700')
cave = lambda x, y: f"<path d='M{x},{y} q30,-55 70,0 h-15 q-20,-30 -40,0z' fill='#9a8f84' stroke='#555'/>"
fr = [
    ("1 rival comes near his cave", cave(30, y + 175) + fish(120, y + 150, 50, 0, '#5b8fd0', flip=False) + fish(215, y + 110, 50, 0, '#6aa0dd', flip=True)),
    ("2 lateral display, fins up", cave(300, y + 175) + fish(400, y + 110, 52, 0, '#3f78c8', fins=True) + fish(440, y + 140, 52, 0, '#6aa0dd', fins=True, flip=True)),
    ("3 rival answers or yields", cave(570, y + 175) + fish(660, y + 120, 52, 0, '#3f78c8', fins=True) + fish(760, y + 95, 46, -15, '#6aa0dd', flip=False, op=.8)),
    ("4 short charge (capped)", cave(840, y + 175) + fish(950, y + 110, 52, 0, '#3f78c8') + fish(1030, y + 95, 46, -10, '#6aa0dd') + arrow(900, y + 140, 980, y + 140, '#c33')),
    ("5 breaks off, returns home", cave(1110, y + 175) + fish(1200, y + 150, 50, 0, '#5b8fd0', flip=True) + arrow(1280, y + 130, 1220, y + 145, '#4a6a9a') + t(1240, y + 60, "rank kept", 12, '#4a6a9a')),
]
for i, (cap, inner) in enumerate(fr): b += frame(20 + i * 270, y, cap, inner)
# Courting row: krib
y = 420
b += t(20, y - 10, "Courting (kribensis; gudgeon leads to his cave, cory males follow in a line)", 16, '#a0662e', '700')
F, M = '#d94c6a', '#c8a07a'
fr = [
    ("1 he notices her", fish(80, y + 120, 48, 0, F) + fish(190, y + 90, 56, 0, M, flip=True)),
    ("2 follows, one body length", fish(380, y + 110, 48, 0, F) + fish(330, y + 115, 56, 0, M) + arrow(300, y + 160, 420, y + 160, '#999', 1.5)),
    ("3 she quivers, arches, red belly", fish(670, y + 110, 50, -10, '#ff3a66', curve=0.15) + fish(610, y + 115, 56, 0, M, fins=True) + t(670, y + 60, "~ ~", 16, '#ff3a66', 'middle')),
    ("4 he spreads fins, leads to cave", cave(990, y + 175) + fish(990, y + 120, 56, 0, '#e0b080', fins=True, flip=True) + fish(920, y + 105, 48, 0, F)),
    ("5 she inspects the mouth, drifts off", cave(1170, y + 175) + fish(1270, y + 90, 48, -20, F) + fish(1160, y + 135, 56, 0, M, flip=True) + t(1235, y + 40, "ends here", 12, '#a33', 'middle')),
]
for i, (cap, inner) in enumerate(fr): b += frame(20 + i * 270, y, cap, inner)
files['05-displays'] = svg(W, H, b, "BH1: dominance and courting displays")

for k, v in files.items():
    open(os.path.join(OUT, k + '.svg'), 'w', encoding='utf-8').write(v)
print("wrote", len(files))
