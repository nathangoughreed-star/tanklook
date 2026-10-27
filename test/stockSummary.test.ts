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
