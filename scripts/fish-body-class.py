#!/usr/bin/env python3
"""Body see-through photo check, the same step as the fin check (scripts/fish-fin-class.py) and from the same photos (method row 62;
Nathan 2026-11-25: "i thought it was going to be done the same as fin translucence where it looks at ref pics?").
  python -I scripts/fish-body-class.py <id> --urls
      prints reference-photo searches for the spec's species (the fin check's list)
  python -I scripts/fish-body-class.py <id> --zone <zone>=<class> [--zone ...] [--inner spine,sac,bladder] --source "<what the photos showed, which photos>"
  python -I scripts/fish-body-class.py <id> --solid --source "..."      (checked: no see-through body)
      writes the spec's body_clear {zones, inner} and body_clear_source, and the built fish's anatomy (render.photo.bodyClear) so the
      renderer picks it up without a rebuild; scripts/fish-build.py copies it on every build after this.
Zones (anatomy, so they fit any fish: share of SL from the snout, share of the body's depth from the top; src/art/fishgen.ts BODY_ZONES):
  head (gill cover forward), back (over the spine), trunk (all of it between head and stalk), belly (lower trunk), lowerrear (lower
  half from mid-body to the stalk), stalk (caudal peduncle). Classes: clear, translucent, faint, solid. Zones overlap and multiply.
Inner (what shows through, drawn as solids inside): spine, sac (gut, viscera), bladder (swim bladder); colours can follow, spine:#56604f.

How to judge (Claude, in the Browser pane): the fin check's 2-4 aquarium photos of the SAME variety, with plants or gravel behind the
fish. Per zone: does the background show through the body (clearly = clear, plainly but tinted = translucent, a hint = faint, not at
all = solid)? Can you see the spine, the gut sac, the silvery swim bladder? Go by most photos: side light makes a body look clearer. A
red or silver patch is pigment or reflective skin, not see-through, unless the background shows through it."""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
ZONES = ('head', 'back', 'trunk', 'belly', 'lowerrear', 'stalk')
CLASSES = ('clear', 'translucent', 'faint', 'solid')
INNER = ('spine', 'sac', 'bladder')


def main(a):
    ID = a[0]; p = os.path.join(ROOT, 'research', 'fish-specs', ID + '.json'); spec = json.load(open(p, encoding='utf8'))
    if '--urls' in a:
        r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fish-fin-class.py'), ID, '--urls'], cwd=ROOT, capture_output=True, text=True)
        print(r.stdout.strip()); return
    src = a[a.index('--source') + 1] if '--source' in a else None
    if not src: sys.exit('--source "<what the photos showed, which photos>" is required: every class is traceable to its photos')
    zones, inner = {}, {}
    for i, x in enumerate(a):
        if x == '--zone':
            z, c = a[i + 1].split('=')
            if z not in ZONES or c not in CLASSES: sys.exit('--zone wants <%s>=<%s>' % ('|'.join(ZONES), '|'.join(CLASSES)))
            if c != 'solid': zones[z] = c
        if x == '--inner':
            for it in a[i + 1].split(','):
                k, _, col = it.partition(':')
                if k not in INNER or (col and not re.fullmatch(r'#[0-9a-fA-F]{6}', col)): sys.exit('--inner wants %s, each with an optional :#rrggbb' % '|'.join(INNER))
                inner[k] = col or None
    if not zones and '--solid' not in a: sys.exit('no see-through zone given: pass --zone ... or --solid')
    bc = {'zones': zones, 'inner': inner} if zones else {'zones': {}}
    spec['body_clear'] = bc
    spec['body_clear_source'] = '%s (photo check): %s' % (', '.join('%s %s' % kv for kv in zones.items()) or 'solid', src)
    json.dump(spec, open(p, 'w', encoding='utf8'), indent=1)
    print('body_clear ->', json.dumps(bc))
    at = os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json')
    if os.path.exists(at):
        J = json.load(open(at, encoding='utf8')); ph = J.get('anatomy', {}).get('render', {}).get('photo')
        if ph is not None:
            ph['bodyClear'] = bc; json.dump(J, open(at, 'w', encoding='utf8'), indent=1); print('anatomy render.photo.bodyClear written:', os.path.relpath(at, ROOT))
        else: print('NOTE: %s has no render.photo block: build the fish (fish-build.py), which copies body_clear' % os.path.relpath(at, ROOT))


if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
