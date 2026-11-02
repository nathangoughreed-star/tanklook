import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { coverOf, shelterCount, minTank, recipeBase, recipeBg, recipeScene, sceneAt, isHard, PIECE_GROWTH, COVER_STEP, DENSITIES } from '../src/scene/recipes';
import { itemDims } from '../src/scene/items';
import { TANK_MODELS } from '../src/data/tanks';
import { summaryOf } from '../src/ui/stockSummary';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.UTC(2026, 10, 2);
const byName = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const LONG20 = byName('20 gal long'), BREEDER40 = byName('40 gal breeder');
const roster = (S: TankSetup) => S.fish.map(f => f.species).sort().join(',');
const welfare = (S: TankSetup) => summaryOf(S).cats.map(c => `${c.id}:${c.level}`).join(' ');
const hidesAndClimbs = shelterCount;
const withLooks = ARCHETYPES.filter(a => a.recipe.looks.length);

describe('density recipes (lane VD4)', () => {
  it('has the tanks and recipes it needs', () => {
    expect(LONG20).toBeTruthy(); expect(BREEDER40).toBeTruthy();
    expect(withLooks.length).toBeGreaterThan(30);
  });
  it('coming-soon archetypes have no recipe', () => {
    const soon = ARCHETYPES.find(a => a.support === 'coming-soon')!;
    expect(recipeScene(soon, 'balanced', LONG20, undefined, NOW)).toBeUndefined();
  });
  for (const a of withLooks) {
    it(`${a.id}: same animals, same welfare, cover open < balanced < full`, () => {
      for (const tank of [LONG20, BREEDER40, minTank(a)]) {
        const base = recipeBase(a, tank, undefined, NOW)!;
        const [o, b, f] = DENSITIES.map(d => sceneAt(base, d));
        const where = `${a.id} in ${tank.name}`;
        expect(roster(o), where).toBe(roster(b)); expect(roster(f), where).toBe(roster(b));
        expect(welfare(o), where).toBe(welfare(b)); expect(welfare(f), where).toBe(welfare(b));
        // fixed: tank, water, light, background, composition
        for (const S of [o, f]) {
          expect(S.tank, where).toEqual(b.tank);
          expect(S.water, where).toEqual(b.water);
          expect(S.layout.id, where).toBe(b.layout.id);
          expect(S.layout.comp, where).toBe(b.layout.comp);
          expect(S.layout.seed, where).toBe(b.layout.seed);
        }
        expect(coverOf(o), where).toBeLessThan(coverOf(b));
        expect(coverOf(b), where).toBeLessThan(coverOf(f));
        if (a.env === 'terrarium') expect(hidesAndClimbs(o), where).toBeGreaterThanOrEqual(hidesAndClimbs(b));
        // one background per archetype, never none, the same at all three levels
        expect(b.render.bg, where).toBe(recipeBg(a).bg); expect(b.render.bg, where).not.toBe('none');
        expect(o.render.bg, where).toBe(b.render.bg); expect(f.render.bg, where).toBe(b.render.bg);
        // gradual hardscape (Nathan 2026-11-02): no level brings a piece more than PIECE_GROWTH times the biggest below it (a first piece no more than
        // 0.3 of the tank height), so rocks do not jump from none / small to a wall; the covered share of the tank rises in steps, not a cliff
        const reach = (S: typeof b) => Math.max(0, ...S.items.filter(isHard).map(it => Math.max(...itemDims(it))));
        const hardCover = (S: typeof b) => coverOf({ ...S, items: S.items.filter(isHard) });
        expect(reach(b), where).toBeLessThanOrEqual((reach(o) > 0 ? reach(o) * PIECE_GROWTH : b.tank.H * 0.3) + 1);
        expect(reach(f), where).toBeLessThanOrEqual((Math.max(reach(o), reach(b)) > 0 ? Math.max(reach(o), reach(b)) * PIECE_GROWTH : f.tank.H * 0.3) + 1);
        expect(hardCover(f) - hardCover(b), where).toBeLessThanOrEqual(COVER_STEP + 0.005);
        expect(hardCover(b) - hardCover(o), where).toBeLessThanOrEqual(COVER_STEP + 0.005);
        if (hardCover(b) >= 0.1) expect(hardCover(f) / hardCover(b), where).toBeLessThanOrEqual(3.5);
      }
    });
  }
});
