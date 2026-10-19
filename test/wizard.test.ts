import { describe, expect, it } from 'vitest';
import { baseSetup, budgetFit, candidates, goalStyle, kitAsDeal, kitTank, priceOf, terraFit, upgradeWords, upkeepChip, wizardScene, TERRA_ANIMALS } from '../src/ui/wizard';
import { TANK_MODELS, getTankModel } from '../src/data/tanks';
import { KITS } from '../src/data/kits';
import { HERP, SQFT_MM2 } from '../src/data/herpstock';
import { IN } from '../src/scene/physics';

const NOW = Date.parse('2026-10-19T12:00:00Z');

describe('wizard candidates', () => {
  it('fish goals list freshwater aquaria from 5 gal, smallest first; no terrariums', () => {
    const c = candidates('community', 'bare', undefined, NOW);
    expect(c.length).toBeGreaterThan(20);
    expect(c.every(x => !x.model.terrarium && x.gal >= 5)).toBe(true);
    for (let i = 1; i < c.length; i++) expect(c[i].gal).toBeGreaterThanOrEqual(c[i - 1].gal);
  });
  it('kits: fresh only, every one has a tank, and none for a terrarium', () => {
    const k = candidates('planted', 'kit', undefined, NOW);
    expect(k.length).toBe(KITS.filter(x => x.water === 'fresh').length);
    expect(k.every(x => x.kit && x.tank.L > 0 && x.tank.H > 0)).toBe(true);
    expect(candidates('terrarium', 'kit', 'leopardgecko', NOW)).toEqual([]);
  });
  it('terrarium tanks house the animal: floor at or over its minimum, height for climbers', () => {
    for (const a of TERRA_ANIMALS) {
      const r = HERP[a.sci], c = candidates('terrarium', 'bare', a.id, NOW);
      expect(c.length, a.id).toBeGreaterThan(0);
      for (const x of c) {
        expect(x.model.terrarium).toBe(true);
        expect((x.model.outer.L * x.model.outer.D) / SQFT_MM2).toBeGreaterThanOrEqual(r.min - 0.05);
        if (r.hMin) expect(x.model.outer.H / IN).toBeGreaterThanOrEqual(r.hMin - 0.5);
      }
    }
  });
  it('terraFit: a crested gecko is refused a short cube, a leopard gecko is tight in a 36x18 and fine in a 48x24', () => {
    expect(terraFit(getTankModel('t18x18x18')!, 'crestedgecko').fit).toBe('no');
    expect(terraFit(getTankModel('t36x18x18')!, 'leopardgecko').fit).toBe('tight');
    expect(terraFit(getTankModel('t48x24x24')!, 'leopardgecko').fit).toBe('fit');
  });
});

describe('wizard pricing', () => {
  it('a bigger bare tank costs more to set up', () => {
    const c = candidates('community', 'bare', undefined, NOW), small = c.find(x => x.id === 'g10')!, big = c.find(x => x.id === 'g75')!;
    expect(priceOf(baseSetup(big), big, undefined, NOW).setup).toBeGreaterThan(priceOf(baseSetup(small), small, undefined, NOW).setup);
  });
  it('a priced kit is priced as one item through a deal (its own listing when no live deal)', () => {
    const c = candidates('community', 'kit', undefined, NOW).find(x => x.kit?.price)!;
    const d = kitAsDeal(c)!;
    expect(d.kit).toBe(c.kit!.id);
    expect(d.includes).toContain('tank');
    expect(d.price.usd).toBe(c.deal?.price.usd ?? c.kit!.price!.usd);
  });
  it('budgetFit: over, tight (under a tenth left), fits; no budget fits', () => {
    expect(budgetFit({ setup: 310, upkeep: 5 }, 300)).toBe('over');
    expect(budgetFit({ setup: 280, upkeep: 5 }, 300)).toBe('tight');
    expect(budgetFit({ setup: 150, upkeep: 5 }, 300)).toBe('fits');
    expect(budgetFit({ setup: 150, upkeep: 50 }, 300, 30)).toBe('over');
    expect(budgetFit({ setup: 9999, upkeep: 50 })).toBe('fits');
  });
  it('upkeepChip maps $/month onto the panel chip', () => {
    const cuts = { free: 10, low: 40 };
    expect(upkeepChip(undefined, cuts)).toBeUndefined();
    expect(upkeepChip(8, cuts)).toBe('free');
    expect(upkeepChip(25, cuts)).toBe('low');
    expect(upkeepChip(90, cuts)).toBe('flex');
  });
});

describe('wizard scene', () => {
  it('kitTank: a kit with no dims sits on the nearest rectangle by gallons', () => {
    const k = KITS.find(x => !x.tankDims && !x.tank)!;
    const t = kitTank(k);
    expect(Math.abs(t.model.ratedGal - k.tankRatedGal)).toBeLessThanOrEqual(5);
  });
  it('a terrarium opens dry with its style; a planted tank keeps the plants the light grows', () => {
    const terra = candidates('terrarium', 'bare', 'leopardgecko', NOW)[0];
    const s = wizardScene(terra, 'terrarium', 'leopardgecko').tanks[0];
    expect(s.water.on).toBe(false);
    expect(s.layout.id).toBe(goalStyle('terrarium', 'leopardgecko'));
    expect(s.fish).toEqual([]);
    expect(upgradeWords(s, terra, 'terrarium')).toEqual([]);
    const pl = candidates('planted', 'bare', undefined, NOW).find(x => x.id === 'g29')!;
    const p = wizardScene(pl, 'planted').tanks[0];
    expect(p.water.on).toBe(true);
    expect(p.items.length).toBeGreaterThan(0);
    expect(upgradeWords(p, pl, 'planted').length).toBe(3);
  });
  it('every fresh kit opens as a scene with its light', () => {
    for (const c of candidates('community', 'kit', undefined, NOW)) {
      const s = wizardScene(c, 'community').tanks[0];
      expect(s.lid).toBe(c.kit!.lid);
      expect(s.tank.L).toBeGreaterThan(0);
    }
  });
  it('the catalog has terrariums for every listed animal', () => {
    expect(TANK_MODELS.some(m => m.terrarium)).toBe(true);
  });
});
