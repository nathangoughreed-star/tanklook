// Reasonableness sweep (Nathan 2026-10-21): for every water species, the smallest catalogue tank that clears its minimum, against what its
// stated litres and adult size make plausible. Catches rules that only look sane in isolation (a snail "too big" for a 10 gal; a 70 gal
// species asked for more floor than any 75 gal has). GEN_REASON=1 writes research/reasonableness.md (worst first) for review.
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { SPECIES } from '../src/data/species';
import { CARE } from '../src/data/care';
import { bareSetup } from '../src/scene/defaults';
import { geometryOf, speciesMinimum } from '../src/scene/tankMin';

// @ts-expect-error node only (no node types in this project)
const { writeFileSync } = await import('node:fs');

const tanks = TANK_MODELS.map(m => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = true; S.water.level = 0.9; return { id: m.id, g: geometryOf(S) }; }).sort((a, b) => a.g.litres - b.g.litres);
const water = SPECIES.filter(sp => sp.habitat !== 'land');
const stated = (id: string) => { const c = CARE[id] as { minLengthMm?: number; minWidthMm?: number; minAreaCm2?: number } | undefined; return !!(c?.minLengthMm || c?.minWidthMm || c?.minAreaCm2); };

const rows = water.map(sp => {
  const pass = tanks.find(t => speciesMinimum(sp, t.g).pct <= 100), w = speciesMinimum(sp, tanks[0].g), invert = sp.cat === 'fw-invert' || sp.kind === 'snail';
  return { id: sp.id, name: sp.name, tl: sp.tl / 10, invert, tank: pass?.id, litres: pass?.g.litres ?? Infinity, limiting: speciesMinimum(sp, pass?.g ?? tanks[0].g).limiting, wantL: w.floorL, explicit: stated(sp.id) };
});
const ratio = (r: (typeof rows)[number]) => r.litres / Math.max(1, r.wantL);

describe('every water species finds a sensible catalogue tank', () => {
  if ((globalThis as any).process?.env.GEN_REASON) writeFileSync('research/reasonableness.md', ['# Smallest passing tank per species (worst first)', '', 'id | adult cm | smallest tank | litres | wants L | passing / wanted | limited by | stated length/area', '--|--|--|--|--|--|--|--', ...[...rows].sort((a, b) => ratio(b) - ratio(a)).map(r => `${r.id} | ${r.tl} | ${r.tank ?? 'none'} | ${Math.round(r.litres)} | ${r.wantL} | ${ratio(r).toFixed(2)} | ${r.limiting} | ${r.explicit ? 'yes' : ''}`)].join('\n') + '\n');
  it('fits some catalogue tank', () => { expect(rows.filter(r => !r.tank).map(r => r.id)).toEqual([]); });
  it('a species whose minimum is only its litres is never held to a tank much bigger than those litres', () => {
    expect(rows.filter(r => !r.explicit && ratio(r) > 1.7).map(r => `${r.id} wants ${r.wantL} L but needs ${Math.round(r.litres)} L (${r.limiting})`)).toEqual([]);
  });
  it('no snail, shrimp or crab needs more than a 10 gal-class tank to be kept alone', () => {
    expect(rows.filter(r => r.invert && r.litres > 55).map(r => `${r.id} needs ${Math.round(r.litres)} L (${r.limiting})`)).toEqual([]);
  });
});
