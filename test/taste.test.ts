// Taste (lane NG5): picks and rejections write decaying preference weights into the brief; the scorer reads them; ranking only, never feasibility.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, type Wants } from '../src/demand/suggest';
import { MAX_BONUS, clearTaste, forgetStyle, forgetVariant, parseTaste, recordTaste, tasteBonus, tasteOf, tasteSummary, tasteWhy, weightOf, weightsOf } from '../src/demand/taste';
import { briefToWants, emptyBrief, parseBrief, serializeBrief } from '../src/scene/brief';
import { LOOK_TILES, lookVariant, lookVariants } from '../src/scene/looks';
import type { Constraints } from '../src/scene/constraints';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const C: Constraints = { startupUsd: cap(2000), monthlyUsd: cap(80), minutesPerWeek: cap(120) };
const run = (extra: Partial<Wants> = {}) => suggestSetups({ constraints: C, ...extra }, P, 'cm', NOW);

describe('taste weights', () => {
  it('a pick adds, a rejection subtracts, a refinement is worth half', () => {
    let b = recordTaste(emptyBrief(), { style: 'iwagumi', kind: 'pick' });
    expect(weightOf(tasteOf(b), 'iwagumi')).toBe(1);
    b = clearTaste(b); b = recordTaste(b, { style: 'jungle', kind: 'reject' }); expect(weightOf(tasteOf(b), 'jungle')).toBe(-1);
    b = clearTaste(b); b = recordTaste(b, { style: 'dutch', kind: 'refine' }); expect(weightOf(tasteOf(b), 'dutch')).toBe(0.5);
  });
  it('older signals fade with every later event, so an early pick never locks the project', () => {
    let b = recordTaste(emptyBrief(), { style: 'iwagumi', kind: 'pick' });
    for (let i = 0; i < 8; i++) b = recordTaste(b, { style: 'jungle', kind: 'pick' });
    expect(weightOf(tasteOf(b), 'iwagumi')).toBeLessThan(0.2);
    expect(weightOf(tasteOf(b), 'jungle')).toBeGreaterThan(weightOf(tasteOf(b), 'iwagumi'));
    expect(tasteOf(b)!.events.length).toBe(9);
    for (let i = 0; i < 40; i++) b = recordTaste(b, { style: 'dutch', kind: 'pick' });
    expect(tasteOf(b)!.events.length).toBe(30);
  });
  it('is clearable, whole or per look or per rejected example', () => {
    let b = recordTaste(recordTaste(emptyBrief(), { style: 'iwagumi', kind: 'pick' }), { style: 'jungle', kind: 'reject', variant: 'jungle.full' });
    expect(Object.keys(weightsOf(tasteOf(forgetStyle(b, 'iwagumi'))))).toEqual(['jungle']);
    expect(tasteOf(forgetVariant(b, 'jungle.full', 'reject'))!.events.length).toBe(1);
    expect(tasteOf(clearTaste(b))).toBeUndefined();
    expect(tasteOf(forgetVariant(forgetVariant(b, 'jungle.full', 'reject'), 'x', 'pick'))).toBeDefined();
  });
  it('the bonus is capped and zero with no taste or no look', () => {
    expect(tasteBonus(undefined, 'iwagumi')).toBe(0);
    let b = emptyBrief(); for (let i = 0; i < 12; i++) b = recordTaste(b, { style: 'iwagumi', kind: 'pick' });
    expect(tasteBonus(tasteOf(b), 'iwagumi')).toBe(MAX_BONUS);
    expect(tasteBonus(tasteOf(b), undefined)).toBe(0);
    expect(tasteBonus(tasteOf(b), 'jungle')).toBe(0);
  });
  it('the card says why, in words, only while the signal still counts', () => {
    let b = recordTaste(recordTaste(emptyBrief(), { style: 'iwagumi', kind: 'pick' }), { style: 'iwagumi', kind: 'pick' });
    expect(tasteWhy(tasteOf(b), 'iwagumi')).toBe('Ranked higher because you picked Iwagumi twice.');
    expect(tasteWhy(tasteOf(b), 'jungle')).toBeUndefined();
    b = recordTaste(emptyBrief(), { style: 'jungle', kind: 'reject' });
    expect(tasteWhy(tasteOf(b), 'jungle')).toMatch(/^Ranked lower because you said "not this" to /);
    const s = tasteSummary(tasteOf(recordTaste(b, { style: 'iwagumi', kind: 'pick' })))!;
    expect(s.toward.length).toBe(1); expect(s.away.length).toBe(1);
  });
});

describe('taste in the brief', () => {
  it('round-trips through save / share and reaches Wants', () => {
    const b = recordTaste(recordTaste(emptyBrief(), { style: 'iwagumi', kind: 'pick', variant: 'iwagumi.usual' }), { style: 'jungle', kind: 'reject' });
    const r = parseBrief(JSON.parse(serializeBrief(b)))!;
    expect(r).toEqual(b);
    expect(briefToWants(r).taste).toEqual(tasteOf(b));
    expect(briefToWants(emptyBrief()).taste).toBeUndefined();
  });
  it('bad saved values are dropped, not trusted', () => {
    expect(parseTaste({ events: [{ style: 'x', kind: 'nope' }, { style: 5, kind: 'pick' }, { style: 'none', kind: 'pick' }] })).toBeUndefined();
    expect(parseTaste({ events: [{ style: 'dutch', kind: 'pick', extra: 1 }] })).toEqual({ events: [{ style: 'dutch', kind: 'pick' }] });
    expect(parseTaste('x')).toBeUndefined();
  });
});

describe('taste in the scorer', () => {
  const base = run(), likedStyle = base.proposals.map(p => p.build.finish?.style).find(s => !!s)!;
  const taste = (style: string, kind: 'pick' | 'reject') => tasteOf(recordTaste(recordTaste(emptyBrief(), { style, kind }), { style, kind }))!;
  it('moves ranking only: the same concepts pass, in a different order or with other scores', () => {
    const up = run({ taste: taste(likedStyle, 'pick') }), down = run({ taste: taste(likedStyle, 'reject') });
    const key = (r: typeof base) => r.proposals.map(p => p.archetype.id + p.strategy).sort().join();
    // every proposal still passes every gate it passed before
    for (const r of [up, down]) for (const p of r.proposals) expect(p.status.every(s => s.state !== 'over')).toBe(true);
    const sc = (r: typeof base, s: string) => r.proposals.filter(p => p.build.finish?.style === s).map(p => p.score);
    if (sc(up, likedStyle).length && sc(base, likedStyle).length) expect(Math.max(...sc(up, likedStyle))).toBeGreaterThanOrEqual(Math.max(...sc(base, likedStyle)));
    if (sc(down, likedStyle).length && sc(base, likedStyle).length) expect(Math.max(...sc(down, likedStyle))).toBeLessThanOrEqual(Math.max(...sc(base, likedStyle)));
    expect(key(up).length).toBeGreaterThan(0);
  });
  it('never makes a failing setup pass: a hopeless budget stays infeasible however strong the liking', () => {
    const tight = { constraints: { startupUsd: cap(20) } as Constraints };
    const plain = suggestSetups(tight, P, 'cm', NOW), liked = suggestSetups({ ...tight, taste: taste(likedStyle, 'pick') }, P, 'cm', NOW);
    expect(liked.proposals.length).toBe(plain.proposals.length);
  });
});

describe('example tiles', () => {
  it('every look has three seeded examples with distinct ids and seeds, none naming an animal', () => {
    for (const s of LOOK_TILES) {
      const v = lookVariants(s);
      expect(v.length).toBe(3);
      expect(new Set(v.map(x => x.id)).size).toBe(3); expect(new Set(v.map(x => x.seed)).size).toBe(3);
      expect(v.every(x => !/fish|tetra|shrimp|gecko/i.test(x.caption))).toBe(true);
    }
  });
  it('examples differ in cost and care for a planted look, so the filters have something to filter', () => {
    const o = lookVariants('nature').map(v => lookVariant(v, NOW));
    expect(new Set(o.map(x => x.setupUsd)).size).toBe(3);
    expect(o[0].setupUsd).toBeLessThan(o[2].setupUsd); expect(o[0].minPerWeek).toBeLessThan(o[2].minPerWeek);
  }, 30000);
});
