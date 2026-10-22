// Stock-level compatibility (lane CP 2026-10-22), from an outside audit of a 28 x 15 in, 21.8 gal tank with 1 male + 3 female pea
// puffers, a male dwarf gourami and a mated kribensis pair: the tile said "Room for about 17% more load" and flagged nothing.
import { describe, expect, it } from 'vitest';
import { comboTank } from './aqcompare.test';
import { compatLine, compatRisks, coverAdvice, DENSE_PLANTS_PER_100L } from '../src/scene/territory';
import type { Item } from '../src/scene/types';
import { stockingOf } from '../src/scene/stocking';
import { tileState } from '../src/ui/fullnessTile';
import { whysAnimal } from '../src/scene/animalfit';
import { getSpecies } from '../src/data/species';
import type { TankSetup } from '../src/scene/types';

const sp = (id: string) => getSpecies(id)!;
/** The audit tank, with each listed species' females marked (absent = male). */
function audit(stock: [string, number, number][]): TankSetup {
  const S = comboTank({ name: '', tank: [28, 15, 12], stock: stock.map(([id, n]) => [id, n]) });
  for (const [id, , females] of stock) S.fish.filter(f => f.species === id).slice(0, females).forEach(f => { f.sex = 'f'; });
  return S;
}
const AUDIT: [string, number, number][] = [['peapuffer', 4, 3], ['dwarfgourami', 1, 0], ['kribensis', 2, 1]];

describe('compatibility risks', () => {
  it('flag the audit mix: puffer nips the gourami, puffers want a species tank, the krib pair guards the floor', () => {
    const r = compatRisks(audit(AUDIT))!;
    expect(r.level).toBe('high');
    const t = r.items.join('\n');
    expect(t).toMatch(/Pea puffer with Dwarf gourami: would nip its feelers/);
    expect(t).toMatch(/Pea puffer with Kribensis: best kept in a species-only tank/);
    expect(t).toMatch(/Kribensis breeding pair defends much of this floor \(420 sq in\)/);
    expect(t).not.toMatch(/Dwarf gourami with Pea puffer/); // each pair said once, from the side that acts
    expect(t).not.toMatch(/Pea puffer with Dwarf gourami: best kept/); // a blocked pair is said by its blocker alone
    expect(compatLine(r)).toMatch(/^High compatibility risk: /);
  });
  it('lead the tile, and leave the bars and percents alone', () => {
    const S = audit(AUDIT), r = stockingOf(S), st = tileState(S, r, 'in');
    expect(st.compat).toEqual({ level: 'over', text: expect.stringMatching(/^High compatibility risk: Pea puffer with Dwarf gourami/) });
    const none = audit([['peapuffer', 4, 3]]), rn = stockingOf(none);
    expect(tileState(none, rn, 'in').compat).toBeUndefined(); // a puffer species tank: nothing
    expect(rn.percent).toBeLessThan(r.percent);
    // the load model is untouched by compatibility: same percents whatever the flags say
    expect(stockingOf(audit(AUDIT)).percent).toBe(r.percent);
  });
  it('a krib pair alone with a dwarf gourami: no feelers flag (kribs do not nip), only the breeding-floor concern', () => {
    const r = compatRisks(audit([['kribensis', 2, 1], ['dwarfgourami', 1, 0]]))!;
    expect(r.level).toBe('concern');
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatch(/Kribensis breeding pair/);
    expect(compatLine(r)).toMatch(/^Compatibility concern: /);
  });
  it('the krib floor rule needs a pair, tankmates and a small floor', () => {
    expect(compatRisks(audit([['kribensis', 2, 0], ['dwarfgourami', 1, 0]]))).toBeNull(); // two males: the unpaired warning's job
    expect(compatRisks(audit([['kribensis', 2, 1]]))).toBeNull();                          // no tankmates
    const big = comboTank({ name: '', tank: [48, 18, 16], stock: [['kribensis', 2], ['dwarfgourami', 1]] });
    big.fish[0].sex = 'f';
    expect(compatRisks(big)).toBeNull();                                                    // 864 sq in: room to stay out of its way
  });
  it('mild nippers are a concern with feelers, aggressive ones block', () => {
    const danio = whysAnimal(sp('danio'), Infinity, 3, [sp('dwarfgourami')]).find(w => /feelers/.test(w.text))!;
    expect(danio.concern).toBe(true);
    const barb = whysAnimal(sp('tigerbarb'), Infinity, 3, [sp('dwarfgourami')]).find(w => /feelers/.test(w.text))!;
    expect(barb.concern).toBeUndefined();
  });
  it('the puffer species-tank note skips invertebrates (the prey rule has them)', () => {
    expect(whysAnimal(sp('peapuffer'), Infinity, 3, [sp('amano')]).some(w => /species-only/.test(w.text))).toBe(false);
  });
});

const item = (kind: Item['kind'], variant: string, id: number) => ({ id, kind, variant, seed: 1, x: 0, depth: 0, lift: 0, yaw: 0, pitch: 0, tilt: 0 }) as Item;
describe('cover advice (lane CP2)', () => {
  it('a bare audit tank asks for dense planting for the puffers and a cave for the kribs', () => {
    const S = audit(AUDIT); S.items = [];
    const t = coverAdvice(S).join('\n');
    expect(t).toMatch(/Pea puffer: plant densely \(about \d+ plants for this tank, you have 0\)/);
    expect(t).toMatch(/Kribensis: add a cave or arch/);
    expect(t).not.toMatch(/Dwarf gourami/);
  });
  it('enough plants (live or artificial) and a real cave clear it; a water dish is not a cave', () => {
    const S = audit(AUDIT), want = Math.ceil(DENSE_PLANTS_PER_100L * 82.5 / 100);
    S.items = [item('cave', 'dish', 1)];
    expect(coverAdvice(S).join()).toMatch(/Kribensis: add a cave/);
    S.items = [item('cave', 'tube', 1), ...Array.from({ length: want + 2 }, (_, i) => item(i % 2 ? 'plant' : 'artificial', 'anubias', i + 2))];
    expect(coverAdvice(S)).toEqual([]);
  });
});
describe('breeding-floor rule beyond kribs (lane CP2)', () => {
  const pairWith = (id: string, tank: [number, number, number]) => {
    const S = comboTank({ name: '', tank, stock: [[id, 2], ['neon', 8]] }); S.fish[0].sex = 'f'; return compatRisks(S);
  };
  it('rams and cockatoos in a 10 gal, angels in a 55, not in bigger floors', () => {
    expect(pairWith('gbr', [20, 10, 12])?.items.join()).toMatch(/German blue ram breeding pair|ram breeding pair/i);
    expect(pairWith('gbr', [30, 12, 12])?.items.join() ?? '').not.toMatch(/breeding pair/);
    expect(pairWith('cockatoo', [20, 10, 12])?.items.join()).toMatch(/breeding pair/);
    expect(pairWith('angel', [48, 13, 21])?.items.join()).toMatch(/breeding pair/);
    expect(pairWith('angel', [48, 18, 20])?.items.join() ?? '').not.toMatch(/breeding pair/);
  });
});
