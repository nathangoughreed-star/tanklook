// Lane S254: the picker and Suggest share one husbandry rule (ui/pickerStrict.ts).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { SPECIES, getSpecies } from '../src/data/species';
import { OK_FIT, offeredIn, tankKind } from '../src/scene/pickerKind';
import { summaryOf } from '../src/ui/stockSummary';
import { strictReader, withCandidate } from '../src/ui/pickerStrict';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on && !t.tanks[t.active].water.salt; })!])).scene; return sc.tanks[sc.active]; };
const stock = (rows: [string, number, ('m' | 'f')?][], tank?: Partial<TankSetup['tank']>): TankSetup => {
  const S = base(); let id = 1;
  return { ...S, tank: { ...S.tank, ...tank }, fish: rows.flatMap(([sp, n, sex]) => Array.from({ length: n }, () => ({ ...S.fish[0], id: id++, species: sp, ...(sex === 'f' && getSpecies(sp)?.female ? { sex: 'f' as const } : {}) }))) };
};
const bad = (S: TankSetup) => summaryOf(S, 'in').cats.flatMap(c => c.items.filter(i => i.level !== 'unknown').map(i => `${c.id}|${i.text}`));
const reader = (S: TankSetup) => strictReader(S, 'in', () => OK_FIT);
const offered = (S: TankSetup) => SPECIES.filter(s => offeredIn(s, tankKind(S)) && !S.fish.some(f => f.species === s.id));

/** The agreement: an un-grayed species adds no Caution / Problem line to the stocking summary; a grayed one names a line the summary has. */
function agrees(S: TankSetup) {
  const rd = reader(S), before = new Set(bad(S)); let ok = 0, gray = 0;
  for (const sp of offered(S)) {
    const fit = rd(sp), after = bad(withCandidate(S, sp)), fresh = after.filter(l => !before.has(l)), all = after.map(l => l.split('|').slice(1).join('|'));
    if (fit.level === 'ok') { expect(fresh, `${sp.id} un-grayed`).toEqual([]); ok++; }
    else { expect(fresh.length, `${sp.id} grayed`).toBeGreaterThan(0); expect(all, `${sp.id} words`).toContain(fit.text); gray++; }
  }
  return { ok, gray };
}

describe('picker agrees with Suggest\'s strict rule', () => {
  it('an empty tank: some offered, some grayed, all consistent', () => {
    const r = agrees(stock([])); expect(r.ok).toBeGreaterThan(5); expect(r.gray).toBeGreaterThan(5);
  });
  it('an overfull tank: nothing that adds load is offered, and the stock\'s own cautions do not gray everything', () => {
    const S = stock([['danio', 60]]), r = agrees(S); expect(r.gray).toBeGreaterThan(r.ok);
  });
  it('a mixed-sex pair-keeper (bettas): consistent', () => { agrees(stock([['betta', 1]])); });
  it('an incompatible pair: oscars with a small school', () => {
    const S = stock([['oscar', 1]]), rd = reader(S), neon = rd(getSpecies('neon')!);
    expect(neon.level).not.toBe('ok'); agrees(S);
  });
  it('a species already in the stock keeps its cheap reading (Add refuses a second row)', () => {
    const S = stock([['danio', 6]]), cheap = { level: 'caution' as const, text: 'x', more: [] };
    expect(strictReader(S, 'in', () => cheap)(getSpecies('danio')!)).toBe(cheap);
  });
  it('the care-level gate still counts when the summary is silent', () => {
    const S = stock([]), gate = { level: 'caution' as const, text: 'expertise: demanding animal, you chose beginner', more: [] };
    const sp = offered(S).find(s => !bad(withCandidate(S, s)).length)!;
    expect(strictReader(S, 'in', () => gate)(sp)).toBe(gate);
  });
});
