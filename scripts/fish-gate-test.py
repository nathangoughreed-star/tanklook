"""Test for fish-gate.py on five stored builds (needs C:/Users/nreed/fish-sheets; skips if absent).
Known-good (unchanged since approval, no hard flag): dwarf gourami, guppy-class fish are not used; chosen: first two stored fish that pass.
Later corrected by Nathan (hard flag expected): cherrybarbb (mass 0.55), neonb (mass 0.65), clownloachb (head/mid width).
Usage: python -I scripts/fish-gate-test.py"""
import sys, os, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('fishgate', os.path.join(HERE, 'fish-gate.py')); g = importlib.util.module_from_spec(sp); sp.loader.exec_module(g)
if not os.path.isdir(g.SHEETS): print('skip: no stored sheets'); sys.exit(0)
rows = {fid: gt for _, fid, gt in g.scan(['b5', 'b6', 'b7', 'b8'])}
bad = []
for fid, key in (('cherrybarbb', 'mass'), ('neonb', 'mass'), ('clownloachb', 'head/mid')):
    if not any(f.startswith(key) for f in rows[fid]['flags']): bad.append(f'{fid}: expected a {key} flag, got {rows[fid]["flags"]}')
good = [f for f, gt in rows.items() if gt['pass']][:2]
if len(good) < 2: bad.append('fewer than 2 fish pass')
n = sum(not gt['pass'] for gt in rows.values())
if n / len(rows) > 0.30: bad.append(f'{n} of {len(rows)} hard-flagged: more than 30 %')
print(f'{len(rows)} builds, {n} hard-flagged; known-good: {good}')
print('FAIL\n' + '\n'.join(bad) if bad else 'ok'); sys.exit(1 if bad else 0)
