// Body mass data (lane SE). The mass of every species is FishBase length-weight (a * (L/10)^b grams, L in mm), with the
// loft's volume as a cross-check (scripts/body-mass.mjs flags outliers). `GEN_BODYVOLUME=1 npx vitest run test/bodymass.test.ts`
// rewrites src/data/bodyvolume.json after a body plan changes; otherwise the stored volumes are checked against the models.
import { describe, expect, it } from 'vitest';
import { PLANS } from '../src/art/fishgen';
import { SPECIES } from '../src/data/species';
import STORED from '../src/data/bodyvolume.json';
import { unitVolume } from '../scripts/body-volume';

const now = Object.fromEntries(SPECIES.filter(s => PLANS[s.art]).map(s => [s.id, +(unitVolume(PLANS[s.art]) * s.tl ** 3 / 1000).toFixed(3)]));

describe('body mass data', () => {
  if ((globalThis as any).process?.env.GEN_BODYVOLUME) {
    it('recorded', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      fs.writeFileSync(new URL('../src/data/bodyvolume.json', import.meta.url), JSON.stringify(now, null, 1) + '\n');
    });
    return;
  }
  it('stored model volumes (cm3 at the species length) match the body plans', () => {
    const stored = STORED as Record<string, number>;
    expect(Object.keys(stored).sort()).toEqual(Object.keys(now).sort());
    for (const id in now) expect(Math.abs(stored[id] / now[id] - 1), id).toBeLessThan(0.01);
  });
});
