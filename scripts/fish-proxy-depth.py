"""Proxy depth check from real side photos (FG1 unit 3, Fable change 3). 35 of 81 stored fish take their depth from another species (fishshapes.json proxy_for);
Nathan flagged the tailspot, harlequin and clown pleco after that. This measures the depth of the species' OWN side photos (scripts/fish-side-depth.py:
saturated body, fins grey) and writes <work>/proxy-depth.json; fish-new.py prints PROXY DEPTH FLAG and the gate flags it when the photo median and the proxy
differ by more than 15 %. Photos are not stored by the pipeline (they are looked at in the Browser pane, step 2), so save 1-3 true side views into the work
folder first (Commons: https://commons.wikimedia.org/wiki/Special:FilePath/<File name>?width=800) and name them on the command line.
Usage: python -I scripts/fish-proxy-depth.py <work-folder> <photo> [more photos]
Limits: the saturation rule needs a coloured body on a plain-ish background; a result is only a flag, never a stretch target (the depth rule stays row 56/64)."""
import sys, os, json, statistics, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); LIMIT = 0.15


def main(a):
    W, photos = a[0], a[1:]
    fsh = json.load(open(os.path.join(W, 'fishshapes.json')))
    if not fsh.get('proxy_for'): sys.exit('not a proxy fish: fishshapes.json has no proxy_for')
    sp = importlib.util.spec_from_file_location('fsd', os.path.join(HERE, 'fish-side-depth.py')); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    ds = []
    for p in photos:
        try: d, L = m.depth(p); ds.append(round(d, 1)); print('  %s: depth %.1f %% (body %d px)' % (os.path.basename(p), d, L))
        except Exception as e: print('  %s: unreadable (%s)' % (os.path.basename(p), str(e)[:80]))
    if not ds: sys.exit('no photo could be measured')
    med = float(statistics.median(ds)); proxy = float(fsh['depth']); off = (med - proxy) / proxy
    r = {'photo_depth': med, 'photos': ds, 'proxy_depth': proxy, 'proxy_for': fsh['proxy_for'], 'off_pct': round(100 * off, 1), 'flag': bool(abs(off) > LIMIT)}
    json.dump(r, open(os.path.join(W, 'proxy-depth.json'), 'w'), indent=1)
    print('photo median %.1f %% SL vs proxy %.1f (%s): %+.0f %%%s' % (med, proxy, fsh['proxy_for'], 100 * off, '  PROXY DEPTH FLAG (more than 15 %)' if r['flag'] else ''))


if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
