// Lane FR1: the finished-tank price range table. GEN_FINISHED=1 npx vitest run test/finishedRange.test.ts rewrites src/data/finishedRange.json
// (do it after any price sweep or engine change that moves setup prices; the "current" test below samples the table against a fresh build).
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, modelGallons } from '../src/data/tanks';
import { PRICES_AS_OF } from '../src/demand/prices';
import { expectedFinished, finishedRange, roundFinished } from '../src/demand/finishedRange';
import { BASIS, FINISHED_KINDS, finishedUsd, kindFits } from '../src/demand/finishedRangeBuild';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const keys = TANK_MODELS.flatMap(m => FINISHED_KINDS.filter(k => kindFits(m, k)).map(k => ({ m, k, key: `${m.id}|${k}` })));
const round = (lo: number, hi: number): [number, number] => { const a = roundFinished(lo); let b = roundFinished(hi); if (b <= a) b = a + (a < 500 ? 10 : 50); return [a, b]; };

describe('finished price range (lane FR1)', () => {
  if ((globalThis as any).process?.env.GEN_FINISHED) { // eslint-disable-line @typescript-eslint/no-explicit-any
    it('rewrites the table', () => {
      const rows: Record<string, [number, number]> = {};
      for (const { m, k, key } of keys) rows[key] = round(finishedUsd(m, k, 'lo'), finishedUsd(m, k, 'hi'));
      fs.writeFileSync(new URL('../src/data/finishedRange.json', import.meta.url), JSON.stringify({ asOf: PRICES_AS_OF, basis: BASIS, rows }) + '\n');
    }, 600000);
    return;
  }

  it('has a row for every tank x kind that fits, and none for the others', () => {
    for (const m of TANK_MODELS) for (const k of FINISHED_KINDS) expect(!!finishedRange(m.id, k), `${m.id} ${k}`).toBe(kindFits(m, k));
    expect(finishedRange('nope', 'freshwater')).toBeNull();
    expect(finishedRange('g10', 'terrarium')).toBeNull();
    expect(finishedRange('t24x12x12', 'saltwater')).toBeNull();
  });

  it('is current: a sample of the table matches a fresh build', () => {
    const sample = keys.filter((_, i) => i % 12 === 0);
    expect(sample.length).toBeGreaterThanOrEqual(30);
    for (const { m, k } of sample) { const r = finishedRange(m.id, k)!; expect([r.lo, r.hi], `${m.id} ${k}`).toEqual(round(finishedUsd(m, k, 'lo'), finishedUsd(m, k, 'hi'))); }
  }, 120000);

  it('lo < hi everywhere, rounded to $10 under $500 and $50 above', () => {
    for (const { m, k } of keys) {
      const r = finishedRange(m.id, k)!;
      expect(r.lo, `${m.id} ${k}`).toBeLessThan(r.hi);
      for (const v of [r.lo, r.hi]) expect(v % (v < 500 ? 10 : 50), `${m.id} ${k} ${v}`).toBe(0);
      expect(r.basis).toMatch(/Low:.*High:/);
    }
  });

  it('rises with size inside a kind (the standard rectangular sizes); a drop is allowed only where the floor is smaller', () => {
    // decor, plants and the stock follow the FLOOR a tank gives them (a 38 gal 30 x 12 in has less floor than a 32 gal 36 x 18 in breeder),
    // so a bigger-water size with a smaller footprint (g37, g65, the tall cubes and terrariums) may price under the one before it
    // within 6 % is noise from which animals the starter picks at that size; the rest need a reason here
    const EXCEPT: Record<string, string> = { 'freshwater|g3c|lo': 'the 2.5 and the 3 gal both get the nano HOB (lane FL2); the cube rounds to $130, the 2.5 gal to $140, a $10 step of the table', 'terrarium|t36x18x18|lo': 'the 36 x 18 x 18 stocks one leopard gecko (arid style); the 18 x 24 x 18 only takes a tree frog group' };
    const bad: string[] = [];
    for (const k of FINISHED_KINDS) {
      const std = TANK_MODELS.filter(m => kindFits(m, k) && !m.id.startsWith('n_') && (m.shape ?? 'rect') === 'rect').sort((a, b) => modelGallons(a) - modelGallons(b));
      let prev: { id: string; g: number; floor: number; lo: number; hi: number } | undefined;
      for (const m of std) {
        const r = finishedRange(m.id, k)!, g = modelGallons(m), floor = m.outer.L * m.outer.D;
        if (prev && g > prev.g * 1.05 && floor >= prev.floor) for (const end of ['lo', 'hi'] as const) if (r[end] < prev[end] * 0.94 && !EXCEPT[`${k}|${m.id}|${end}`]) bad.push(`${k} ${m.id} (${g.toFixed(0)} gal) ${end} ${r[end]} < ${prev.id} ${prev[end]}`);
        prev = { id: m.id, g, floor, lo: r.lo, hi: r.hi };
      }
    }
    expect(bad).toEqual([]);
  });

  it('anchors: a 10 gal freshwater low end is about $100-300; a 75 gal reef high end is well above a 75 gal freshwater high end', () => {
    const f10 = finishedRange('g10', 'freshwater')!;
    expect(f10.lo).toBeGreaterThanOrEqual(100); expect(f10.lo).toBeLessThanOrEqual(300);
    expect(finishedRange('g75', 'saltwater')!.hi).toBeGreaterThan(finishedRange('g75', 'freshwater')!.hi * 1.15);
    expect(finishedRange('g75', 'saltwater')!.lo).toBeGreaterThan(finishedRange('g75', 'freshwater')!.lo);
  });

  it('expectedFinished: spend is a floor, and the two ends close as the build is decided', () => {
    const r = { lo: 400, hi: 1600 };
    expect(expectedFinished(r, 0)).toEqual({ spent: 0, lo: 400, hi: 1600 });
    expect(expectedFinished(r, 700).lo).toBe(700);
    expect(expectedFinished(r, 5000)).toEqual({ spent: 5000, lo: 5000, hi: 5000 });
    const a = expectedFinished(r, 300, 0.5), b = expectedFinished(r, 300, 0.9), c = expectedFinished(r, 300, 1);
    expect(b.hi - b.lo).toBeLessThan(a.hi - a.lo); expect(c.hi).toBe(c.lo);
    expect(a.lo).toBeGreaterThanOrEqual(400); expect(a.hi).toBeLessThanOrEqual(1600);
  });
});
