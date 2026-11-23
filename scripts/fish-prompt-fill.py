"""Fill the build-B 5-row sheet prompt template with one species block.
  template: research/fish-sheets/prompts/B-5row-template.md (part 1 = first ```text block)
  species:  a text file in the part 2 format: `KEY = value` lines; a key with an empty value takes the following lines
            up to the next `KEY =` line (trailing blank lines dropped). `(empty)` means an empty value. A `(...)` note after
            a one-line value is dropped.
Usage: python fish-prompt-fill.py <species.txt> [out.txt] [--strict]   (prints the prompt when no out file is given; warns on size words, --strict stops)
       python fish-prompt-fill.py --example                    (fills the template's own blue tang example)"""
import sys, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL = os.path.join(ROOT, 'research', 'fish-sheets', 'prompts', 'B-5row-template.md')
KEY = re.compile(r'^([A-Z0-9_]+)\s*=\s?(.*)$')


def blocks(md):
    return re.findall(r'```text\n(.*?)\n```', md, re.S)


def parse(txt):
    vals, cur = {}, None
    for line in txt.splitlines():
        m = KEY.match(line)
        if m:
            cur = m.group(1); v = m.group(2).strip()
            if v == '(empty)': v = ''
            elif v.startswith('('): v = ''            # an unfilled hint
            else: v = re.sub(r'\s+\(.*\)$', '', v)
            vals[cur] = [v] if v else []
        elif cur is not None:
            vals[cur].append(line)
    out = {}
    for k, ls in vals.items():
        while ls and not ls[-1].strip(): ls.pop()
        out[k] = '\n'.join(ls).replace('\\n', '\n')
    return out


def fill(tpl, vals):
    need = sorted(set(re.findall(r'\{\{([A-Z0-9_]+)\}\}', tpl)))
    missing = [k for k in need if k not in vals or (vals[k] == '' and k not in ('ROW5_EXTRA', 'EXTRA_RATIOS'))]
    if missing: sys.exit('missing or empty: ' + ', '.join(missing))
    return re.sub(r'\{\{([A-Z0-9_]+)\}\}', lambda m: vals[m.group(1)], tpl)


# Template rule "No size adjectives" (cardinal tetra, 2026-11-23; method row 44): the image model reads them as instructions to
# exaggerate. Give a measured number (EXTRA_RATIOS) or name the shape. Warnings only (a fin can be "long-based"); --strict stops.
SIZE = re.compile(r'\b(large|larger|small|smaller|big|tiny|huge|short|deep|tall|high|slightly|very|extremely|only|wide|broad|narrow|thick|thin|slender|stout|massive|minute)\b', re.I)
SIZE_KEYS = ('BODY_BULLETS', 'FIN_BULLETS', 'CROSS_SECTION_WORDS', 'TOP_VIEW_SHAPE', 'FRONT_VIEW_SHAPE')


def size_words(vals):
    out = []
    for k in SIZE_KEYS:
        for line in vals.get(k, '').splitlines():
            for m in SIZE.finditer(line): out.append(f'  {k}: "{m.group(0)}" in: {line.strip()[:110]}')
    return out


def main(a):
    b = blocks(open(TPL, encoding='utf-8').read())
    tpl = b[0]
    a = [x for x in a if x != '--strict'] if '--strict' in a else a; strict = len(a) != len(sys.argv[1:] or ['--example'])
    spec = b[2] if a[0] == '--example' else open(a[0], encoding='utf-8').read()
    vals = parse(spec); w = size_words(vals)
    if w:
        print(f'size words ({len(w)}): replace with a measured number or a shape (template rule "No size adjectives")', file=sys.stderr)
        for x in w: print(x, file=sys.stderr)
        if strict: sys.exit('--strict: size words found')
    txt = fill(tpl, vals)
    if len(a) > 1: open(a[1], 'w', encoding='utf-8', newline='\n').write(txt + '\n'); print('wrote', a[1], len(txt), 'chars')
    else: sys.stdout.reconfigure(encoding='utf-8'); print(txt)


if __name__ == '__main__':
    main(sys.argv[1:] or ['--example'])
