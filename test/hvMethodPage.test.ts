// Lane HV unit 2: the static "How we calculate" page (public/how-we-calculate.html) is generated from research/source-baseline.json and the engine's constants.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs generator
import { methodPageHtml, ENGINE, EXAMPLE } from '../scripts/gen-method-page.mjs';
import { SCHOOL_EXP, SCHOOL_REF, IDEAL_MAX, TINY_EXPERT, stockingMemo } from '../src/scene/stocking';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { inferTech } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';

// @ts-expect-error node only (no node types in this project)
const { readFileSync, existsSync } = await import('node:fs');
const baseline = JSON.parse(readFileSync('research/source-baseline.json', 'utf8'));
const page = readFileSync('public/how-we-calculate.html', 'utf8');
const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const cardinals = (n: number): TankSetup => { const S = base(), f0 = S.fish[0]; return { ...S, tech: { rows: { ...inferTech(S).rows, heater: 'one', filter: 'hob' } }, fish: Array.from({ length: n }, () => ({ ...f0, species: 'cardinal' })), tank: { ...S.tank, L: 914, D: 457, H: 406 } } as TankSetup; };

describe('How we calculate page', () => {
  it('is in step with research/source-baseline.json (regenerate with node scripts/gen-method-page.mjs)', () => {
    expect(page.replace(/\r\n/g, '\n')).toBe(methodPageHtml(baseline).replace(/\r\n/g, '\n'));
  });
  it('states the engine constants the engine really has', () => {
    expect([ENGINE.schoolRef, ENGINE.schoolExp, ENGINE.idealMax, ENGINE.tinyExpert]).toEqual([SCHOOL_REF, SCHOOL_EXP, IDEAL_MAX, TINY_EXPERT]);
  });
  it('worked example matches the engine: 10 cardinals and 40 cardinals in the 40 breeder', () => {
    expect(Math.round(stockingMemo(cardinals(10)).spacePercent)).toBe(EXAMPLE.ten);
    expect(Math.round(stockingMemo(cardinals(40)).spacePercent)).toBe(EXAMPLE.forty);
    expect(Math.round(10 * (40 / 10) ** (SCHOOL_EXP))).toBe(EXAMPLE.fortyCountsAs);
  });
  it('uses the agreed wording and makes no "less conservative" or "no AI" claim', () => {
    expect(page).toContain('Calculated by fixed rules; no AI model runs when you use TankLook; sources were gathered with AI assistance.');
    expect(page).not.toMatch(/expert-calibrated|less conservative|80% for/i);
    expect(page).not.toMatch(/no AI\b(?! model)/);
  });
  it('is a standalone page: viewport meta, title, link back, no script', () => {
    expect(page).toMatch(/<meta name="viewport"/); expect(page).toMatch(/<title>How we calculate/); expect(page).toContain('href="./"'); expect(page).not.toMatch(/<script/);
  });
  it('the stronger sentence "judgment-only rules never render red" appears only once ENGINE.noRedAudited is true, and that flag needs the passing audit test', () => {
    const strong = 'A rule that rests only on our judgment is shown as a Caution at most, never as a red Problem';
    expect(page.includes(strong)).toBe(ENGINE.noRedAudited);
    if (ENGINE.noRedAudited) expect(existsSync('test/hvNoRedAudit.test.ts')).toBe(true);
  });
  it('states a measured spread, not a "factor of two"', () => {
    expect(page).not.toMatch(/factor of two/i); expect(page).toContain('more than 10% above theirs on 8');
  });
});
