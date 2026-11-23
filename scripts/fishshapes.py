"""FishShapes v1 lookup for one species (pipeline step 1, method row 44): body ratios over standard length from the Smithsonian
specimens, plus each specimen's SL and weight for the build's mass check.
  Source: https://zenodo.org/records/6642650 (FishShapes_specimensv1.csv, 1.6 MB). Downloaded once to
  C:/Users/nreed/fish-sheets/_cache/ (outside the repo); --csv <path> uses another copy.
  Suggested values are the median over the specimens; the per-specimen table is printed so a person can override (e.g. drop a
  juvenile). FishBase length-weight a/b are Bayesian estimates for most aquarium fish: fallback only (row 35).
Usage: python fishshapes.py "<Genus species>" [--out <work>/fishshapes.json] [--csv <path>]
  --out writes {sci, n, depth, head, ped, width (medians, % SL), range {k: [min, max]}, specimens [[sl_mm, weight_g], ...]}: fish-new.py reads it."""
import sys, os, csv, json, statistics, urllib.request

URL = 'https://zenodo.org/api/records/6642650/files/FishShapes_specimensv1.csv/content'
CACHE = 'C:/Users/nreed/fish-sheets/_cache/FishShapes_specimensv1.csv'
COLS = [('depth', 'Max_body_depth'), ('head', 'Head_depth'), ('ped', 'Min_caudalpeduncle_depth'), ('width', 'Max_fish_width')]


def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None


def load(path=CACHE):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        print('downloading FishShapes v1 ->', path, file=sys.stderr)
        urllib.request.urlretrieve(URL, path)
    return list(csv.DictReader(open(path, encoding='utf-8', errors='replace')))


def lookup(sci, rows):
    key = sci.strip().replace(' ', '_').lower()
    hits = [r for r in rows if r['Tree_name'].lower() == key]
    out = {'sci': sci, 'n': 0, 'specimens': []}
    per = {k: [] for k, _ in COLS}
    table = []
    for r in hits:
        sl = num(r['Standard_length'])
        if not sl: continue
        rec = {k: (100 * num(r[c]) / sl if num(r[c]) else None) for k, c in COLS}
        for k in per:
            if rec[k] is not None: per[k].append(rec[k])
        w = num(r['Total_weight'])
        if w: out['specimens'].append([round(sl, 2), w])
        table.append((sl, w, rec))
    out['n'] = len(table)
    for k in per: out[k] = round(statistics.median(per[k]), 1) if per[k] else None
    out['range'] = {k: [round(min(v), 1), round(max(v), 1)] for k, v in per.items() if v}   # fish-new.py stretches depth only outside this (method row 49)
    return out, table


def main(argv):
    opt = {argv[i]: argv[i + 1] for i in range(len(argv) - 1) if argv[i].startswith('--')}
    sci = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or not argv[i - 1].startswith('--'))][0]
    out, table = lookup(sci, load(opt.get('--csv', CACHE)))
    if not table:
        sys.exit(f'{sci}: not in FishShapes v1 (check the spelling / a synonym; else FishBase or Seriously Fish morphometrics)')
    print(f'{sci}: n {out["n"]}   (% SL)        depth   head    ped  width   SL mm (in)   weight g (oz)')
    for sl, w, rec in sorted(table, key=lambda t: t[0]):
        f = lambda v: '%7.1f' % v if v is not None else '      -'
        print(f'{"":28s}{f(rec["depth"])}{f(rec["head"])}{f(rec["ped"])}{f(rec["width"])}   {sl:6.1f} ({sl / 25.4:.2f})   '
              + (f'{w:.2f} ({w / 28.35:.3f})' if w else '-'))
    f = lambda v: '%7.1f' % v if v is not None else '      -'
    print(f'{"median (suggested)":28s}{f(out["depth"])}{f(out["head"])}{f(out["ped"])}{f(out["width"])}')
    r = lambda v: int(v + 0.5)   # round half up (Python's round() sends 28.5 to 28)
    print(f'prompt: DEPTH_PCT = {r(out["depth"])}' + (f'; EXTRA_RATIOS head {r(out["head"])}, peduncle {r(out["ped"])}' if out['head'] and out['ped'] else ''))
    if '--out' in opt:
        json.dump(out, open(opt['--out'], 'w'), indent=1); print('wrote', opt['--out'])


if __name__ == '__main__':
    main(sys.argv[1:])
