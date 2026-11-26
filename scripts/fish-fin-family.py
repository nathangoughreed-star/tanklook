"""Fin-class family table (FG1 unit 3, Fable change 5). Seeds research/fish-sheets/fin-class-by-family.json from every spec that has a photo-checked
fin_opacity_source (the 26 photo-checked fish + the 4 calibration fish, method row 61 item 14), grouped by family, and reports how well a family
default predicts a member (leave-one-out) against today's blanket default `solid` (the photo check found only 3 of 26 solid).
  python -I scripts/fish-fin-family.py            rewrite the table and print the leave-one-out score
  from fish-fin-family import family_default     family_default(sci) -> (fin_opacity dict, 'Family (n, share)') or None; used by fish-new.py
A family is used only when its overall class has at least 60 % of the members (and 2 or more): otherwise the fish still gets PHOTO CHECK NEEDED.
A human confirms exceptions; a genus not in GENUS_FAMILY is never guessed. Add a genus here when a new family is photo-checked."""
import os, json, glob, collections
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TABLE = os.path.join(ROOT, 'research', 'fish-sheets', 'fin-class-by-family.json')
MIN_N, MIN_SHARE = 2, 0.6
GENUS_FAMILY = {
    'Pterophyllum': 'Cichlidae', 'Amphilophus': 'Cichlidae', 'Astronotus': 'Cichlidae', 'Archocentrus': 'Cichlidae', 'Amatitlania': 'Cichlidae',
    'Andinoacara': 'Cichlidae', 'Mikrogeophagus': 'Cichlidae', 'Labidochromis': 'Cichlidae', 'Cynotilapia': 'Cichlidae', 'Maylandia': 'Cichlidae',
    'Betta': 'Osphronemidae', 'Trichogaster': 'Osphronemidae', 'Trichopodus': 'Osphronemidae', 'Colisa': 'Osphronemidae',
    'Polypterus': 'Polypteridae', 'Gymnocorymbus': 'Characidae', 'Paracheirodon': 'Characidae', 'Hemigrammus': 'Characidae', 'Hyphessobrycon': 'Characidae',
    'Zebrasoma': 'Acanthuridae', 'Paracanthurus': 'Acanthuridae', 'Corydoras': 'Callichthyidae', 'Barbus': 'Cyprinidae', 'Pethia': 'Cyprinidae',
    'Danio': 'Cyprinidae', 'Devario': 'Cyprinidae', 'Tanichthys': 'Cyprinidae', 'Puntius': 'Cyprinidae', 'Poecilia': 'Poeciliidae', 'Xiphophorus': 'Poeciliidae',
    'Melanotaenia': 'Melanotaeniidae', 'Otocinclus': 'Loricariidae', 'Gramma': 'Grammatidae', 'Ecsenius': 'Blenniidae', 'Glossolepis': 'Melanotaeniidae',
    'Trichopsis': 'Osphronemidae', 'Pseudomugil': 'Pseudomugilidae', 'Rohanella': 'Cyprinidae',
}


def _pec(fo): return ((fo or {}).get('pectoral') or {}).get('preset')


def members():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'research', 'fish-specs', '*.json'))):
        s = json.load(open(f, encoding='utf8')); fo = s.get('fin_opacity')
        if not s.get('fin_opacity_source') or not isinstance(fo, dict): continue
        sci = (s.get('species') or {}).get('sci', ''); fam = GENUS_FAMILY.get(sci.split(' ')[0])
        out.append((s['id'], sci, fam, fo))
    return out


def build():
    by = collections.defaultdict(list)
    for i, sci, fam, fo in members(): by[fam or '?'].append((i, fo))
    fams = {}
    for fam, ms in by.items():
        pre = collections.Counter(fo.get('preset') for _, fo in ms); top, c = pre.most_common(1)[0]
        pec = collections.Counter(_pec(fo) for _, fo in ms if _pec(fo)); share = c / len(ms)
        default = {'preset': top}
        if pec and pec.most_common(1)[0][1] / len(ms) >= MIN_SHARE and pec.most_common(1)[0][0] != top: default['pectoral'] = {'preset': pec.most_common(1)[0][0]}
        fams[fam] = {'n': len(ms), 'share': round(share, 2), 'use': fam != '?' and len(ms) >= MIN_N and share >= MIN_SHARE, 'default': default,
                     'members': {i: fo.get('preset') + (('+pec ' + _pec(fo)) if _pec(fo) else '') for i, fo in ms}}
    return fams


def loo(ms_by_fam):
    """Leave-one-out on the overall preset: how often the other members' modal class names a member's class; and the blanket `solid`."""
    ok = tot = solid = 0
    for fam, ms in ms_by_fam.items():
        for i, (mid, fo) in enumerate(ms):
            tot += 1; solid += fo.get('preset') == 'solid'; rest = [m[1].get('preset') for j, m in enumerate(ms) if j != i]
            if rest and fam != '?' and collections.Counter(rest).most_common(1)[0][0] == fo.get('preset'): ok += 1
    return ok, solid, tot


def family_default(sci):
    fam = GENUS_FAMILY.get((sci or '').split(' ')[0])
    try: t = json.load(open(TABLE, encoding='utf8'))['families'].get(fam)
    except Exception: return None
    if not t or not t.get('use'): return None
    return json.loads(json.dumps(t['default'])), '%s (%d photo-checked, %d%% agree)' % (fam, t['n'], round(t['share'] * 100))


if __name__ == '__main__':
    fams = build(); by = collections.defaultdict(list)
    for i, sci, fam, fo in members(): by[fam or '?'].append((i, fo))
    ok, solid, tot = loo(by)
    json.dump({'note': 'Seeded by scripts/fish-fin-family.py from photo-checked specs. `use` families give fish-new.py its default fin_opacity (source marked as family table, still to confirm); others keep PHOTO CHECK NEEDED.',
               'leave_one_out': {'family_default_right': ok, 'blanket_solid_right': solid, 'of': tot}, 'families': fams}, open(TABLE, 'w', encoding='utf8'), indent=1)
    print(f'{tot} photo-checked fish, {len(fams)} families; leave-one-out family default right {ok}, blanket solid right {solid}')
    for f, t in sorted(fams.items(), key=lambda x: -x[1]['n']): print(f'  {f:16s} n {t["n"]} share {t["share"]:.2f} use {t["use"]} default {t["default"]}')
