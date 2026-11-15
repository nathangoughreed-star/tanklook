// FS1 (2026-11-15, R77): bala shark and red-tail shark. Sources: Seriously Fish (base 240 x 60 cm for a bala group, 5+; red-tail 120 x 45 cm,
// kept singly, territorial) and FishBase (length-weight, water). The tank checks must be honest: a bala school fails most home tanks.
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { crowdWarnings } from '../src/scene/territory';
import { whysAnimal } from '../src/scene/animalfit';
import { tankMinimum } from '../src/scene/tankMin';
import { PLANS, bodyPlan, finRange } from '../src/art/fishgen';
import { comboTank } from './aqcompare.test';

describe('bala shark and red-tail shark', () => {
  it('are in the catalogue with their care data', () => {
    expect(getSpecies('balashark')?.sci).toBe('Balantiocheilos melanopterus');
    expect(getSpecies('redtailshark')?.sci).toBe('Epalzeorhynchos bicolor');
    expect(CARE.balashark.bands).toEqual({ ok: 5, good: 6, great: 8 });
    expect(CARE.redtailshark.solo).toBe(true);
    expect(CARE.redtailshark.max).toBe(1);
    expect(CARE.balashark.prey?.mm).toBeGreaterThan(0);
  });
  it('a bala school in a 20 gal planted tank is far too small; a 10 ft tank holds it', () => {
    const small = tankMinimum(comboTank({ name: '', tank: [24, 12, 16], stock: [['balashark', 6]] }));
    expect(small.percent).toBeGreaterThan(150);
    expect(small.lengthShort).toBe(true);
    const big = tankMinimum(comboTank({ name: '', tank: [96, 24, 24], stock: [['balashark', 6]] }));
    expect(big.lengthShort).toBe(false);
    expect(big.percent).toBeLessThan(100);
  });
  it('two red-tail sharks are flagged; one is not', () => {
    const two = crowdWarnings(comboTank({ name: '', tank: [48, 18, 18], stock: [['redtailshark', 2]] }));
    expect(two.join(' ')).toMatch(/red-tail shark|fight/i);
    expect(crowdWarnings(comboTank({ name: '', tank: [48, 18, 18], stock: [['redtailshark', 1]] }))).toEqual([]);
  });
  it('a rainbow shark and a red-tail shark in one tank are flagged as rivals; each alone is fine; two rainbows are flagged', () => {
    const rb = getSpecies('rainbowshark')!, rt = getSpecies('redtailshark')!;
    expect(whysAnimal(rb, 900, 3, [rt]).some(w => /look-alike/.test(w.text))).toBe(true);
    expect(whysAnimal(rt, 900, 3, [rb]).some(w => /look-alike/.test(w.text))).toBe(true);
    expect(whysAnimal(rb, 900, 3, []).some(w => w.kind === 'compat')).toBe(false);
    expect(crowdWarnings(comboTank({ name: '', tank: [96, 24, 24], stock: [['rainbowshark', 1]] }))).toEqual([]);
    expect(crowdWarnings(comboTank({ name: '', tank: [96, 24, 24], stock: [['rainbowshark', 2]] })).length).toBeGreaterThan(0);
    expect(CARE.rainbowshark.fam).toBe(CARE.redtailshark.fam);
  });
  it('the rainbow shark has an albino form with a source and a recolour', () => {
    const sp = getSpecies('rainbowshark')!;
    expect(sp.albino).toMatch(/^https:\/\//);
    expect(PLANS['rainbowshark~albino']).toBeTruthy();
    expect(PLANS['rainbowshark~albino'].shade[0]).not.toBe(PLANS.rainbowshark.shade[0]);
    expect(PLANS['rainbowshark~albino'].tail.tint).toMatch(/^#e/); // red-orange fins stay
    expect(getSpecies('redtailshark')!.albino).toBeUndefined();
  });
  it('the models exist with the fin ranges the brief asks for', () => {
    expect(bodyPlan('balashark')).toBeTruthy(); expect(bodyPlan('redtailshark')).toBeTruthy();
    expect(finRange('balashark')).toMatchObject({ lo: 0.8, hi: 1 });
    expect(finRange('redtailshark')).toMatchObject({ lo: 0.6, hi: 1 });
  });
});
