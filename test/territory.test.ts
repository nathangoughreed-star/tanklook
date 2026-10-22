// Size-scaled fighting limits (S196, Nathan 2026-10-22: warn, scaled with the tank; research/territory-caps.md).
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { mostFor } from '../src/data/groups';
import { crowdWarnings } from '../src/scene/territory';
import { stockingOf } from '../src/scene/stocking';
import { notesOf, overWarn } from '../src/ui/stockPlanLogic';
import { comboTank } from './aqcompare.test';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { starterAnimals } from '../src/scene/starter';
import { styleGround } from '../src/scene/scapeground';
import { STYLES, isLandStyle, isReefy } from '../src/scene/items';

const L = (gal: number) => gal * 3.785;
describe('territory caps', () => {
  it('follow the sourced rules', () => {
    expect(mostFor(CARE.dwarfgourami, L(10))).toBe(3);   // Fishkeeping World: 2-3 in 10 gal
    expect(mostFor(CARE.dwarfgourami, L(20))).toBe(5);   // +5 gal per fish
    expect(mostFor(CARE.dwarfgourami, L(125))).toBe(26);
    expect(mostFor(CARE.kribensis, L(45))).toBe(6);      // a pair at 20 gal, +1 pair per 12.5 gal
    expect(mostFor(CARE.royalgramma, L(55))).toBe(2);    // 50 gal a pair, 100+ a group
    expect(mostFor(CARE.coralbeauty, L(125))).toBe(1);   // a second only over 180 gal
    expect(mostFor(CARE.banggai, L(40))).toBe(2);        // one pair below 50 gal (lane CW)
    expect(mostFor(CARE.banggai, L(75))).toBe(Infinity); // a group above it, no stated limit
    expect(overWarn({ id: 'banggai', n: 5 }, L(29))).toMatch(/about 2 .*may fight: below 50 gal keep one pair/);
    expect(notesOf({ id: 'banggai', n: 5 }).line).toMatch(/pair is best/); // the group line never praises a group the warning says fights
  });
  it('fall back to the flat max without a tank size, or without a rule', () => {
    expect(mostFor(CARE.dwarfgourami)).toBe(1);
    expect(mostFor(CARE.neon, L(125))).toBe(CARE.neon.max);
  });
  it('warn on the stocking screen and in the sidebar, never in the percent', () => {
    expect(overWarn({ id: 'dwarfgourami', n: 43 }, L(125))).toMatch(/about 26 .*may fight: shops sell mostly males/);
    expect(overWarn({ id: 'dwarfgourami', n: 20 }, L(125))).toBeUndefined();
    const big = comboTank({ name: '', tank: [72, 18, 21], stock: [['dwarfgourami', 43]] });
    expect(crowdWarnings(big).join()).toMatch(/43 Dwarf gouramis.*may fight/);
    expect(crowdWarnings(comboTank({ name: '', tank: [72, 18, 21], stock: [['dwarfgourami', 20]] }))).toEqual([]);
    expect(stockingOf(big).reasons.join()).not.toMatch(/fight/);
  });
  it('never fall below the group the bands ask for, and only room rules are left out (Coordinator 8, 2026-10-22)', () => {
    expect(overWarn({ id: 'bolivianram', n: 2 }, L(29))).toBeUndefined();      // a pair, bands ok 2
    expect(overWarn({ id: 'tigerbarb', n: 8 }, L(20))).toBeUndefined();        // bands ok 8; "+3 gal per barb" is a room rule
    expect(overWarn({ id: 'swordtail', n: 1, f: 3 }, L(20))).toBeUndefined();  // 1 male : 3 females
    expect(crowdWarnings(comboTank({ name: '', tank: [72, 18, 22], stock: [['oto', 30]] }))).toEqual([]); // peaceful: max means plenty
  });
  it('no starter tank shows a fighting warning', () => {
    for (const id of Object.keys(STYLES)) { if (isLandStyle(id as any)) continue;
      for (const dim of [[20, 10, 12], [36, 18, 18], [72, 18, 22]]) for (const stop of [2, 4]) {
        const s = defaultSetup(); s.tank = { ...s.tank, L: dim[0] * IN, D: dim[1] * IN, H: dim[2] * IN }; s.water.on = true; s.water.salt = isReefy(id as any);
        s.layout = { id: id as any, seed: 1, dens: { hard: 2, plant: 2, animal: stop } }; s.fish = []; styleGround(s); s.fish = starterAnimals(s, 1);
        expect(crowdWarnings(s), `${id} ${dim[0]} in stop ${stop}`).toEqual([]);
      } }
  });
});
