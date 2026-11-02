import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { coverOf, shelterCount, minTank, recipeBase, recipeBg, recipeScene, sceneAt, isHard, PIECE_GROWTH, COVER_STEP, MIX_MIN, STOPS, stopScene, densityOfStop, recipeDensAt, recipeDens, DENSITIES } from '../src/scene/recipes';
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
        // (stones and other pieces, wood and caves, each against its own kind)
        for (const stone of [true, false]) {
          const reach = (S: typeof b) => Math.max(0, ...S.items.filter(it => isHard(it) && (it.kind === 'stone') === stone).map(it => Math.max(...itemDims(it))));
          expect(reach(b), `${where} ${stone ? 'stones' : 'wood'}`).toBeLessThanOrEqual((reach(o) > 0 ? reach(o) * PIECE_GROWTH : b.tank.H * 0.3) + 1);
          expect(reach(f), `${where} ${stone ? 'stones' : 'wood'}`).toBeLessThanOrEqual((Math.max(reach(o), reach(b)) > 0 ? Math.max(reach(o), reach(b)) * PIECE_GROWTH : f.tank.H * 0.3) + 1);
        }
        const hardCover = (S: typeof b) => coverOf({ ...S, items: S.items.filter(isHard) });
        // a spread of rock sizes, not one repeated size (Nathan 2026-11-02): at Balanced and Full the biggest free stone is at least 2.5x the smallest and
        // the stones are not all within 20% of one size; Full has at least as large a share of small stones as Balanced (many more small, a few large)
        const stones = (S: typeof b) => S.items.filter(it => it.kind === 'stone' && it.lift <= 1).map(it => Math.max(...itemDims(it)));
        const small = (S: typeof b) => { const r = stones(S), m = Math.max(...r); return r.filter(x => x < 0.4 * m).length / r.length; };
        for (const [lvl, S] of [['balanced', b], ['full', f]] as const) {
          const r = stones(S); if (r.length < MIX_MIN) continue;
          expect(Math.max(...r) / Math.min(...r), `${where} ${lvl}`).toBeGreaterThanOrEqual(2.5);
          expect(r.some(x => x < 0.8 * Math.max(...r)) && r.some(x => x > 1.2 * Math.min(...r)), `${where} ${lvl}`).toBe(true);
        }
        if (stones(b).length >= MIX_MIN && stones(f).length >= MIX_MIN) expect(small(f), where).toBeGreaterThanOrEqual(small(b) - 0.05);
        expect(hardCover(f) - hardCover(b), where).toBeLessThanOrEqual(COVER_STEP + 0.005);
        expect(hardCover(b) - hardCover(o), where).toBeLessThanOrEqual(COVER_STEP + 0.005);
        if (hardCover(b) >= 0.1) expect(hardCover(f) / hardCover(b), where).toBeLessThanOrEqual(3.5);
      }
    });
  }
  it('backgrounds complement the scene, never match it, never none (Nathan 2026-11-02)', () => {
    const fams = new Set(withLooks.map(a => a.familyId));
    for (const f of fams) {
      const bgs = new Set(withLooks.filter(a => a.familyId === f).map(a => recipeBg(a).bg));
      for (const bg of bgs) { expect(bg, f).not.toBe('none'); expect(bg, f).not.toBe('green'); expect(bg, f).not.toBe('plantscene'); }
    }
  });
  describe('the five slider stops (lane VD6)', () => {
    it('maps stops to the named levels and layer stops', () => {
      expect(STOPS).toBe(5);
      expect([0, 1, 2, 3, 4].map(densityOfStop)).toEqual(['open', 'open', 'balanced', 'full', 'full']);
      const a = withLooks[0];
      expect(recipeDensAt(a, 0)).toEqual(recipeDens(a, 'open')); expect(recipeDensAt(a, 2)).toEqual(recipeDens(a, 'balanced')); expect(recipeDensAt(a, 4)).toEqual(recipeDens(a, 'full'));
      expect(recipeDensAt(a, 1).plant).toBeCloseTo((recipeDens(a, 'open').plant + recipeDens(a, 'balanced').plant) / 2, 6);
    });
    for (const a of withLooks) {
      it(`${a.id}: the steps between sit between their neighbours (cover, piece size), same animals and background`, () => {
        const base = recipeBase(a, minTank(a), undefined, NOW)!, sc = [0, 1, 2, 3, 4].map(i => stopScene(base, i));
        expect(sc[0].items).toEqual(sceneAt(base, 'open').items); expect(sc[2].items).toEqual(sceneAt(base, 'balanced').items); expect(sc[4].items).toEqual(sceneAt(base, 'full').items);
        const cov = sc.map(coverOf);
        for (let i = 1; i < 5; i++) expect(cov[i], `${a.id} stop ${i}`).toBeGreaterThanOrEqual(cov[i - 1] - 1e-9);   // a saturated tank can tie
        expect(cov[0]).toBeLessThan(cov[2]); expect(cov[2]).toBeLessThan(cov[4]);
        for (const S of sc) { expect(roster(S)).toBe(roster(sc[2])); expect(S.render.bg).toBe(sc[2].render.bg); expect(S.tank).toEqual(sc[2].tank); expect(S.layout.seed).toBe(sc[2].layout.seed); }
        for (const stone of [true, false]) {
          const reach = (S: typeof sc[0]) => Math.max(0, ...S.items.filter(it => isHard(it) && (it.kind === 'stone') === stone).map(it => Math.max(...itemDims(it))));
          for (const i of [1, 3]) expect(reach(sc[i]), `${a.id} stop ${i} ${stone ? 'stones' : 'wood'}`).toBeLessThanOrEqual(Math.max(reach(sc[i - 1]), reach(sc[i + 1])) + 1);
        }
        for (const i of [1, 3]) expect(coverOf({ ...sc[i], items: sc[i].items.filter(isHard) }) - coverOf({ ...sc[i - 1], items: sc[i - 1].items.filter(isHard) }), `${a.id} ${i}`).toBeLessThanOrEqual(COVER_STEP + 0.005);
        expect(stopScene(base, 1).items).toEqual(sc[1].items);   // drawn once, then the same
      });
    }
  });
});
