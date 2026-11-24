#!/usr/bin/env python3
"""Fin transparency photo check, the step after a fish's sheet and before (or after) its build (method row 61 (11); Nathan 2026-11-24:
"could a quick reference image search done by you help identify the transparency level?" ... "Yes, add the step").
  python -I scripts/fish-fin-class.py <id> --urls
      prints reference-photo searches for the spec's species (Wikimedia Commons first: large real photos, clear file names)
  python -I scripts/fish-fin-class.py <id> <class> [--fin pectoral=clear ...] --source "<what the photos showed, which photos>" [--maps]
      writes the spec's fin_opacity {preset, per-fin presets} and fin_opacity_source; --maps rebuilds the opacity maps right away
      (scripts/fish-fin-opacity.py; the fish must have been built). Classes: clear, translucent, pigmented, solid (see PRESETS there).

How to judge (Claude, in the Browser pane): 2-4 aquarium photos of the SAME variety as the sheet, with plants or gravel behind the fins.
Per fin: does the background show through the membrane (clearly = clear, faintly = translucent, barely = pigmented, not at all = solid),
solid near the body and clearer at the edge?, rays standing out?, pigment bands (note them for stage 5). Go by most photos, not the
clearest: a backlit fin looks clearer than it is. Small pectorals are often clear on a fish whose other fins are solid (betta)."""
import json, os, subprocess, sys
from urllib.parse import quote_plus

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CLASSES = ('clear', 'translucent', 'pigmented', 'solid')
FINS = ('dorsal', 'anal', 'caudal', 'pelvic', 'pectoral')


def main(a):
    ID = a[0]; p = os.path.join(ROOT, 'research', 'fish-specs', ID + '.json'); spec = json.load(open(p, encoding='utf8'))
    sp = spec.get('species', {}); sci, name = sp.get('sci', ''), sp.get('name', ID)
    if '--urls' in a:
        print('Reference photos for %s (%s):' % (name, sci))
        print('  https://commons.wikimedia.org/w/index.php?search=%s&title=Special:MediaSearch&type=image' % quote_plus(sci.split('(')[0].strip()))
        print('  https://commons.wikimedia.org/w/index.php?search=%s&title=Special:MediaSearch&type=image' % quote_plus(name))
        print('  https://www.bing.com/images/search?q=%s' % quote_plus(name + ' aquarium fins'))
        print('  full-size Commons file: https://commons.wikimedia.org/wiki/Special:FilePath/<File name>?width=800')
        return
    cls = a[1]
    if cls not in CLASSES: sys.exit('class must be one of %s' % (CLASSES,))
    src = a[a.index('--source') + 1] if '--source' in a else None
    if not src: sys.exit('--source "<what the photos showed, which photos>" is required: every class is traceable to its photos')
    fo = {'preset': cls}
    for i, x in enumerate(a):
        if x == '--fin':
            fin, c = a[i + 1].split('=')
            if fin not in FINS or c not in CLASSES: sys.exit('--fin wants <%s>=<%s>' % ('|'.join(FINS), '|'.join(CLASSES)))
            fo[fin] = {'preset': c}
    spec['fin_opacity'] = fo; spec['fin_opacity_source'] = '%s%s (photo check): %s' % (cls, ''.join(', %s %s' % (f, v['preset']) for f, v in fo.items() if f != 'preset'), src)
    json.dump(spec, open(p, 'w', encoding='utf8'), indent=1)
    print('fin_opacity ->', json.dumps(fo))
    if '--maps' in a:
        r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'fish-fin-opacity.py'), ID], cwd=ROOT, capture_output=True, text=True)
        print((r.stdout + r.stderr).strip())
        if r.returncode: sys.exit(1)
        J = json.load(open(os.path.join(ROOT, 'src', 'data', 'fishart', ID + '.anatomy.json'), encoding='utf8'))
        if not J['anatomy']['render']['photo'].get('opacity'): print('NOTE: this build has no opacity maps switched on: rebuild with fish-build.py so render.photo.opacity is set')


if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
