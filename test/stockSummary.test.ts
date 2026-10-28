// S243 step 1: the five-category stocking view-model (ui/stockSummary.ts).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { stockingMemo } from '../src/scene/stocking';
import { tileState } from '../src/ui/fullnessTile';
import { stockSummary, worstOf } from '../src/ui/stockSummary';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const stock = (id: string, n: number, tank?: Partial<TankSetup['tank']>): TankSetup => { const S = base(); return { ...S, fish: Array.from({ length: n }, () => ({ ...S.fish[0], species: id })), tank: { ...S.tank, ...tank } }; };
const sum = (S: TankSetup) => stockSummary(S, stockingMemo(S), tileState(S, stockingMemo(S), 'in').mins);

describe('stock summary', () => {
  it('has the five categories in order', () => {
    expect(sum(stock('danio', 6)).cats.map(c => c.id)).toEqual(['minimums', 'social', 'environment', 'behaviour', 'fullness']);
  });
  it('worst-of: one caution among greens reads caution', () => {
    expect(worstOf(['ok', 'ok', 'caution', 'ok', 'ok'])).toBe('caution');
    expect(worstOf(['ok', 'unknown', 'ok'])).toBe('unknown');
    expect(worstOf(['caution', 'problem'])).toBe('problem');
  });
  it('does not change the engine numbers it reads', () => {
    const S = stock('danio', 6), before = JSON.stringify(stockingMemo(S));
    sum(S);
    expect(JSON.stringify(stockingMemo(S))).toBe(before);
  });
  it('fullness is room only, never filtration', () => {
    const S = stock('oscar', 1), r = stockingMemo(S), f = sum(S).cats.find(c => c.id === 'fullness')!;
    expect(r.filtrationPercent).toBeGreaterThanOrEqual(0);
    const room = r.spacePercent > 100 ? 'problem' : r.spacePercent >= 75 ? 'caution' : 'ok';
    expect(f.level).toBe(room);
  });
  it('a school of demasoni in one species cautions on behavior from the temper rating', () => {
    const b = sum(stock('demasoni', 8)).cats.find(c => c.id === 'behaviour')!;
    expect(b.level).toBe('caution');
  });
  it('a missing check counts as no data, not a warning', () => {
    const s = sum(stock('danio', 6));
    expect(s.noData).toBeGreaterThanOrEqual(0);
    expect(s.cats.every(c => c.level !== 'unknown' || c.items.every(i => i.level === 'unknown'))).toBe(true);
  });
});

describe('stock summary on the plan sheet', () => {
  it('prints the same categories and worst status in the .txt and the page', async () => {
    const { planOf } = await import('../src/scene/plan');
    const { planHtml, planTextWithNeeds } = await import('../src/ui/planSheet');
    const { summaryOf } = await import('../src/ui/stockSummary');
    const S = stock('demasoni', 8, { L: 914, D: 457, H: 406 }), sm = summaryOf(S, 'in'), p = planOf(S, undefined, undefined, 'in');
    const txt = planTextWithNeeds(p, [], sm), html = planHtml(p, [], sm);
    expect(txt).toContain('Stocking summary: ' + sm.worstWord);
    for (const c of sm.cats) { expect(txt).toContain(c.label + ': ' + c.word); expect(html).toContain(c.label); }
    expect(txt.indexOf('Stocking summary')).toBeLessThan(txt.indexOf('Shopping list'));
    expect(planTextWithNeeds(p, [])).not.toContain('Stocking summary');
  });
});

describe('tank minimums answer', () => {
  it('names the smallest tank for the minimum group and the species that sets it', async () => {
    const { stockingGroupMinimum } = await import('../src/scene/groupMin');
    const S = stock('neon', 6), c = sum(S).cats.find(x => x.id === 'minimums')!, g = stockingGroupMinimum(['neon']).tank;
    if (g) { expect(c.answer).toContain(g.tank); expect(c.answer).toContain(g.by); } else expect(c.answer).toBeUndefined();
  });
});


// lane E1 (2026-10-28): a terrarium's Environment line compares the land animals' air bands (it used to read "unknown" because the water check
// saw no animals). Aquarium numbers are untouched.
describe('air environment (terrarium / paludarium)', () => {
  const land = (ids: string[], water = false): TankSetup => { const S = base(); return { ...S, water: { ...S.water, on: water }, fish: ids.map(id => ({ ...S.fish[0], species: id })) }; };
  const env = (S: TankSetup) => sum(S).cats.find(c => c.id === 'environment')!;
  const airLines = (S: TankSetup) => env(S).items.filter(i => /^(Air|Humidity)/.test(i.text) || /air range/.test(i.text));
  it('one land animal: no "unknown" temperature line any more', () => {
    expect(env(land(['crestedgecko'])).items.some(i => /No recorded temperature range/.test(i.text))).toBe(false);
  });
  it('two land animals sharing a broad band: no air item', () => {
    expect(airLines(land(['crestedgecko', 'indianstick']))).toEqual([]);
  });
  it('a gecko and a spider with no common air band: Problem', () => {
    const l = airLines(land(['curlyhair', 'orchidmantis']));
    expect(l.some(i => i.level === 'problem' && /^Air temperature: no shared range/.test(i.text))).toBe(true);
    expect(env(land(['curlyhair', 'orchidmantis'])).level).toBe('problem');
  });
  it('one shared value is a Problem, a narrow band a Caution', () => {
    expect(airLines(land(['chileanrose', 'orchidmantis'])).find(i => /Air/.test(i.text))?.level).toBe('problem');
    expect(airLines(land(['crestedgecko', 'orchidmantis'])).find(i => /Air/.test(i.text))?.level).toBe('caution');
  });
  it('humidity: no comfortable overlap but a tolerable one is a Caution', () => {
    const h = airLines(land(['leopardgecko', 'crestedgecko'])).find(i => /^Humidity/.test(i.text));
    expect(h?.level).toBe('caution');
  });
  it('an empty terrarium keeps its old reading', () => {
    expect(env({ ...land([]) }).items.map(i => i.text)).toEqual(env({ ...land([]), water: { ...land([]).water, on: false } }).items.map(i => i.text));
  });
  it('a paludarium checks water and land both; the land mismatch still shows', () => {
    const S = land(['curlyhair', 'orchidmantis', 'nerite'], true), e = env(S);
    expect(e.items.some(i => i.level === 'problem' && /^Air temperature/.test(i.text))).toBe(true);
    expect(e.level).toBe('problem');
  });
  it('aquarium numbers are unchanged: a fish-only tank has no air items', () => {
    expect(airLines(stock('danio', 6))).toEqual([]);
  });
});
