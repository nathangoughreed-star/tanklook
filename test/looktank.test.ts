// Lane GV5 (2026-10-30): a look for THIS tank: the roster, tank and gear are kept; each card prices its plants, the light upgrade, CO2 and ferts.
import { describe, expect, it } from 'vitest';
import { looksForTank, tankLook } from '../src/scene/looks';
import { bareSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import type { TankSetup } from '../src/scene/types';

const stocked = (): TankSetup => {
  const S = bareSetup();
  S.tank = { L: 30 * IN, H: 12 * IN, D: 12 * IN }; S.stockFirst = true;
  S.fish = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, species: 'neon', x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  return S;
};

describe('looks for a stocked tank', () => {
  const S = stocked(), cards = looksForTank(S, 4, 0);
  it('every card keeps the roster and the tank', () => {
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const c of cards) { expect(c.setup.fish.length).toBe(6); expect(c.setup.tank).toEqual(S.tank); expect(c.setup.layout.id).toBe(c.style); }
  });
  it('a low-tech card is always there and needs no CO2 and no light upgrade', () => {
    const low = cards.filter(c => c.lowTech);
    expect(low.length).toBeGreaterThan(0);
    for (const c of low) { expect(c.co2).toBeUndefined(); expect(c.light).toBeUndefined(); }
  });
  it('a high-light look is priced with the light upgrade and CO2', () => {
    const big = stocked(); big.tank = { L: 48 * IN, H: 21 * IN, D: 18 * IN }; // 75 gal: the plants want more than the basic light gives at the floor
    const hi = tankLook(big, 'planted', 'live', [], 0), dutch = tankLook(S, 'dutch', 'live', [], 0), art = tankLook(S, 'dutch', 'artificial', [], 0);
    expect(hi.light!.deltaUsd).toBeGreaterThan(0); expect(hi.co2!.deltaUsd).toBeGreaterThan(0); expect(hi.lowTech).toBe(false);
    expect(dutch.co2!.deltaUsd).toBeGreaterThan(0); expect(dutch.plantUsd).toBeGreaterThan(0);
    expect(dutch.setupUsd).toBeGreaterThan(art.setupUsd + dutch.co2!.deltaUsd - 1); // the CO2 kit is in the card's total
    expect(art.light).toBeUndefined(); expect(art.co2).toBeUndefined(); expect(art.lowTech).toBe(true);
  });
});
