// Lane LN2 (Nathan 2026-11-03): "why was this light chosen? It's obviously too small for the tank." A reef setup's light spans the tank (or is as many boxes as its coverage needs) and says so.
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { recipeScene } from '../src/scene/recipes';
import { applySetupNeeds } from '../src/scene/setupNeeds';
import { bareSetup } from '../src/scene/defaults';
import { DEFAULT_COVERAGE_MM, hangingUnits } from '../src/scene/lightproduct';
import { lightProduct, LIGHT_PRODUCTS } from '../src/data/gearCatalog';

const reef = (id: string) => { const S = recipeScene('mixed-reef', 'balanced', getTankModel(id)!)!; S.water.salt = true; return S; };

describe('hanging reef boxes span the tank', () => {
  it('a box without a published coverage still counts 24 in, so a 71 in tank takes three', () => {
    expect(DEFAULT_COVERAGE_MM).toBe(610);
    expect(hangingUnits({ L: 71 * 25.4 }, {})).toBe(3);
    expect(hangingUnits({ L: 18 * 25.4 }, {})).toBe(1);
    expect(hangingUnits({ L: 71 * 25.4 }, { coverageMm: 457 })).toBe(4);
  });
  for (const id of ['n_waterbox_cube_20', 'g40b', 'g55', 'g125', 'c6']) {
    it(`${id}: the generated light covers the tank's length and says what it chose`, () => {
      const S = reef(id), r = applySetupNeeds(S, { generated: true }), p = lightProduct(r.scene.light.product)!, L = r.scene.tank.L;
      expect(p).toBeTruthy();
      if (p.mount === 'hanging') expect(r.scene.light.count * (p.coverageMm ?? DEFAULT_COVERAGE_MM)).toBeGreaterThanOrEqual(L);
      else { expect(L).toBeGreaterThanOrEqual(p.fitMinMm); expect(L).toBeLessThanOrEqual(p.fitMaxMm); expect(p.lengthMm).toBeGreaterThanOrEqual(0.7 * L); }
      const why = r.lines.find(l => l.kind === 'light')!.text;
      expect(why).toMatch(/in tank/); expect(why).toMatch(/PAR/);
      if (p.mount === 'hanging' && r.scene.light.count > 1) expect(why).toMatch(/boxes to span/);
    });
  }
  it('every catalogue reef bar is offered only where its fit range holds the tank', () => {
    for (const p of LIGHT_PRODUCTS.filter(p => p.water === 'salt' && p.mount === 'bar')) expect(p.lengthMm).toBeGreaterThanOrEqual(0.7 * p.fitMaxMm);
  });
  it('an owned light is still left alone', () => {
    const S = reef('g125'); S.light = { ...bareSetup().light, type: 'led', tech: 'led-reef', count: 1, watts: 30, owned: true };
    expect(applySetupNeeds(S, { generated: true }).scene.light.watts).toBe(30);
  });
});
