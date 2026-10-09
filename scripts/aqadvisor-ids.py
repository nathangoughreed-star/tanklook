"""Resolve AqAdvisor species IDs for TankLook species (dev-time, run by hand; ~1 request per species, 1 s apart).

AqAdvisor (aqadvisor.com) has no API. Adding a species through its GET form returns the selection as a hidden
field `AlreadySelected` = "<id>:<qty>::,...". This script adds each mapped species once and records its id in
src/data/aqadvisor.json, which the app and the proxy use to build a single stateless Update request.

Usage: python scripts/aqadvisor-ids.py
"""
import json, re, time, urllib.parse, urllib.request, pathlib

# TankLook species id -> AqAdvisor species list entry (exact option text). Herps have no AqAdvisor entry.
NAMES = {
    'neon': 'Neon Tetra (Paracheirodon innesi)',
    'cardinal': 'Cardinal Tetra (Paracheirodon axelrodi)',
    'ember': 'Ember Tetra (Hyphessobrycon amandae)',
    'rummynose': 'Rummynose Tetra (Hemigrammus bleheri)',
    'harlequin': 'Harlequin Rasbora (Trigonostigma heteromorpha)',
    'chili': 'Chili Rasbora (Boraras brigittae)',
    'danio': 'Zebra Danio (Danio rerio)',
    'cherrybarb': 'Cherry Barb (Puntius titteya)',
    'tigerbarb': 'Tiger Barb (Puntius tetrazona)',
    'guppy': 'Guppy (Poecilia reticulata)',
    'platy': 'Platy (Xiphophorus maculatus)',
    'molly': 'Molly (Poecilia sphenops)',
    'swordtail': 'Swordtail (Xiphophorus hellerii)',
    'betta': 'Betta [Male] (Betta splendens)',
    'dwarfgourami': 'Dwarf Gourami (Colisa lalia)',
    'honeygourami': 'Honey Gourami (Trichogaster chuna)',
    'gourami': 'Pearl Gourami (Trichogaster leerii)',
    'gbr': 'German Blue Ram (Mikrogeophagus ramirezi)',
    'bolivianram': 'Bolivian Ram (Mikrogeophagus altispinosus)',
    'kribensis': 'Kribensis (Pelvicachromis pulcher)',
    'angel': 'Angelfish (Pterophyllum scalare)',
    'discus': 'Discus (Symphysodon aequifasciatus)',
    'oscar': 'Oscar (Astronotus ocellatus)',
    'goldfish': 'Fancy Goldfish (Carassius auratus)',
    'bronzecory': 'Bronze Cory (Corydoras aeneus)',
    'pandacory': 'Panda Cory (Corydoras panda)',
    'bristlenose': 'Bristlenose Pleco (Ancistrus sp.)',
    'oto': 'Oto (Otocinclus vittatus)',
    'kuhli': 'Kuhli Loach (Pangio kuhlii)',
    'clownloach': 'Clown Loach (Chromobotia macracanthus)',
    'sae': 'Siamese Algae Eater (Crossocheilus siamensis)',
    'cherryshrimp': 'Red Cherry Shrimp (Neocaridina heteropoda)',
    'amano': 'Amano Shrimp (Cardina multidentata)',
    'nerite': 'Zebra Nerite Snail (Neritina natalensis sp. Zebra)',
    'mystery': 'Mystery Snail (Pomacea cuprina)',
    'ramshorn': 'Ramshorn Snail (Planorbidae)',
    'trumpet': 'Malaysian Trumpet Snail (Melanoides tuberculata)',
}

# Not in AqAdvisor: counted as a similar animal in size and type (Nathan 2026-10-09), flagged standIn in the json.
# Land-only animals (dart frog, White's tree frog) add nothing to the water and stay uncounted.
STAND_INS = {
    'axolotl': 'Dojo Loach (Misgurnus anguillicaudatus)',  # 23 cm, bottom, cold water
    'firenewt': 'Zebra Loach (Botia striata)',  # 9 cm, bottom
    'firetoad': 'White Cloud Mountain Minnow (Tanichthys albonubes)',  # 4.5 cm, semi-aquatic, cool water
}

BASE = 'http://aqadvisor.com/AqAdvisor.php'
UA = 'TankLook species mapper (tanklook.com; one request per species)'

def add(name):
    q = urllib.parse.urlencode({
        'AquListBoxTank': 'User Defined', 'AquTankLength': 24, 'AquTankDepth': 12, 'AquTankHeight': 16,
        'AquListBoxFilter': 'Choose', 'AquListBoxFilter2': 'Choose', 'AquListBoxChooser': name,
        'AquTextBoxQuantity': 1, 'FormSubmit': 'Add >', 'AlreadySelected': '', 'FilterMode': 'Display all species',
        'AqTempUnit': 'C', 'AqVolUnit': 'gUS', 'AqLengthUnit': 'inch', 'AqSortType': 'cname',
        'AqSpeciesWindowSize': 'short', 'AqSearchMode': 'simple'})
    req = urllib.request.Request(f'{BASE}?{q}', headers={'User-Agent': UA})
    html = urllib.request.urlopen(req, timeout=30).read().decode('latin1')
    m = re.search(r'name="AlreadySelected" value="(\d+):1::"', html)
    return m.group(1) if m else None

path = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'data' / 'aqadvisor.json'
known = json.loads(path.read_text(encoding='utf8')) if path.exists() else {}
out = {}
for sid, name in [*NAMES.items(), *STAND_INS.items()]:
    old = known.get(sid)
    aq = old['aq'] if old and old['name'] == name else add(name)  # only ask AqAdvisor for new or changed entries
    print(f'{sid:14} {aq or "NOT FOUND"}  {name}')
    if aq:
        out[sid] = {'aq': aq, 'name': name, **({'standIn': True} if sid in STAND_INS else {})}
    if not (old and old['name'] == name):
        time.sleep(1)

path.write_text(json.dumps(out, indent=1) + '\n', encoding='utf8')
print(f'{len(out)}/{len(NAMES) + len(STAND_INS)} resolved -> {path}')
