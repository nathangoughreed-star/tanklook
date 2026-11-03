// Lane RK1: generated rockwork weighs about what a real one would (Nathan 2026-11-03: 11 dragon stones in a 60 gal breeder, ~450 lb, $1,797).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { recipeBase, sceneAt, minTank, DENSITIES, isHard, lbBudget, LB_CAP } from '../src/scene/recipes';
import { pieceKg } from '../src/scene/setupsheet';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { TANK_MODELS } from '../src/data/tanks';
import type { TankSetup } from '../src/scene/types';

const NOW = Date.UTC(2026, 10, 3);
const byName = (n: string) => TANK_MODELS.find(m => m.name === n && !m.terrarium)!;
const lb = (S: TankSetup) => S.items.filter(i => isHard(i) && (i.kind === 'stone' || i.kind === 'cave')).reduce((t, i) => t + pieceKg(i), 0) * 2.2046;
const looks = ARCHETYPES.filter(a => a.recipe.looks.length && a.support !== 'coming-soon');

describe('rock weight budget (lane RK1)', () => {
  const tanks = [byName('20 gal long'), byName('40 gal breeder'), byName('60 gal breeder')];
  for (const a of looks) {
    it(`${a.id}: rock lb per gallon within the family budget and the cap`, () => {
      for (const t of [...tanks, minTank(a)]) {
        const base = recipeBase(a, t, undefined, NOW); if (!base) continue;
        for (const d of DENSITIES) {
          const per = lb(sceneAt(base, d)) / t.ratedGal;
          expect(per, `${a.id} ${t.name} ${d}`).toBeLessThanOrEqual(Math.min(LB_CAP, lbBudget(a, d)) * 1.05);
        }
      }
    });
  }
  it("Nathan's case: Malawi rockscape, 60 gal breeder, Balanced: a realistic rock line", () => {
    const a = ARCHETYPES.find(x => x.id === 'african-cichlid-rockscape')!, t = byName('60 gal breeder');
    const S = sceneAt(recipeBase(a, t, undefined, NOW)!, 'balanced'), D = demandOf(S, defaultProfile(), { now: NOW });
    const rockLb = lb(S), rockUsd = D.items.filter(c => c.group === 'hardscape').reduce((s, c) => s + (c.setup?.mode ?? 0), 0);
    console.log(`RK1 Nathan's case: ${rockLb.toFixed(0)} lb, $${rockUsd.toFixed(0)} rock line`);
    expect(rockLb / t.ratedGal).toBeLessThanOrEqual(2.2);
    expect(rockUsd).toBeLessThan(500);
  });
});
