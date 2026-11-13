import { describe, expect, it } from 'vitest';
import looksMain from './fixtures/ds2-looks-main.json';
import { demandOf, defaultProfile } from '../src/demand';
import demandItems from '../src/data/demand-items.json';
import { ARCHETYPES, archetype } from '../src/scene/archetypes';
import { recipeScene } from '../src/scene/recipes';
import { TANK_MODELS } from '../src/data/tanks';
import { designAxes } from '../src/scene/designAxes';
import { LIBRARY, itemDims, makeItem } from '../src/scene/items';
import { plantUptake } from '../src/scene/nitrogen';
import { defaultScene } from '../src/scene/defaults';
import { buildSheet } from '../src/scene/setupsheet';
import { attrValues } from '../src/scene/attrs';
import type { CandidateFacts } from '../src/scene/discoveryTypes';

// Lane DS2 (2026-11-13): the pirate slice. B pirate scene contents, H artificial plants give no nitrate credit, I every ornament priced,
// plus a snapshot that every other look draws exactly as it did before (test/fixtures/ds2-looks-main.json, generated from origin/main).
const NOW = Date.parse('2026-11-13');
const model = TANK_MODELS.find(x => x.name === '40 gal breeder' && !x.terrarium)!;
const ORN = Object.entries(LIBRARY).filter(([, v]) => v.kind === 'ornament').map(([id]) => id);

describe('B: the themed pirate scene', () => {
  it('is buildable and partial', () => { const a = archetype('themed-scene')!; expect(a.support).toBe('partial'); expect(a.recipe.looks.length).toBeGreaterThan(0); });
  for (const d of ['open', 'balanced', 'full'] as const) it(`${d}: a ship, natural gravel, at least 4 live plants`, () => {
    const S = recipeScene('themed-scene', d, model, undefined, NOW)!;
    expect(S.items.filter(i => i.kind === 'ornament' && i.variant === 'shipwreck').length).toBe(1);
    expect(S.substrate.type).toBe('gravel');
    expect(S.items.filter(i => i.kind === 'plant').length).toBeGreaterThanOrEqual(4);
    expect(designAxes(S).plantMode).toBe('live');
  });
  it('balanced adds the treasure chest', () => {
    expect(recipeScene('themed-scene', 'balanced', model, undefined, NOW)!.items.some(i => i.variant === 'treasurechest')).toBe(true);
  });
  it('has a Decor attribute: ship in the pirate scene, none elsewhere', () => {
    const facts = { gallons: 40, stocking: [], substrate: ['Gravel'] } as unknown as CandidateFacts;
    const S = recipeScene('themed-scene', 'balanced', model, undefined, NOW)!;
    S.items.forEach((i, k) => { i.uid = 'u' + k; });
    expect(attrValues(S, facts).some(v => v.key === 'decor' && v.elements.includes('shipwreck'))).toBe(true);
    const P = recipeScene('planted-community', 'balanced', model, undefined, NOW)!;
    P.items.forEach((i, k) => { i.uid = 'u' + k; });
    expect(attrValues(P, facts).find(v => v.key === 'decor')!.elements).toEqual(['none']);
  });
});

describe('every ornament is seen from the front', () => {
  for (const tank of ['40 gal breeder', '20 gal long', '75 gal']) for (const d of ['open', 'balanced', 'full'] as const) it(`${tank}, ${d}: no plant, rock or wood taller than an ornament stands between it and the front glass`, () => {
    const m = TANK_MODELS.find(x => x.name === tank && !x.terrarium);
    if (!m) return;
    for (const day of [0, 7, 19, 41]) {
    const S = recipeScene('themed-scene', d, m, undefined, NOW + day * 864e5)!;
    const orn = S.items.filter(i => i.kind === 'ornament');
    expect(orn.length).toBeGreaterThan(0);
    for (const o of orn) {
      const [w, h] = itemDims(o);
      const hide = S.items.filter(i => (i.kind === 'plant' || i.kind === 'stone' || i.kind === 'wood') && i.depth < o.depth && Math.abs(i.x - o.x) < w / 2 + itemDims(i)[0] / 2 && itemDims(i)[1] > h);
      expect(hide.map(i => i.variant), `${o.variant} in ${tank} ${d}`).toEqual([]);
    }
    }
  });
});

describe('H: artificial plants give no nitrate credit', () => {
  it('plantUptake of a scene of only artificial plants is zero', () => {
    const S = defaultScene().tanks[0], T = S.tank;
    S.items = ['silkstem', 'plasticstem'].map((v, i) => makeItem(T, LIBRARY[v] ? v : Object.keys(LIBRARY).find(k => LIBRARY[k].kind === 'artificial')!, i + 1, 3, T.L * (0.3 + 0.2 * i), T.D * 0.5));
    expect(S.items.every(i => i.kind === 'artificial')).toBe(true);
    const u = plantUptake(S);
    expect(u.gN).toBe(0); expect(u.count).toBe(0);
  });
});

describe('I: every ornament is priced', () => {
  it('has a hard:<variant> row with a url and a price', () => {
    expect(ORN.length).toBeGreaterThanOrEqual(2);
    for (const v of ORN) { const r = (demandItems.rows as Record<string, { mode: number; url?: string }>)[`hard:${v}`]; expect(r, v).toBeTruthy(); expect(r.url, v).toMatch(/^https:\/\//); expect(r.mode, v).toBeGreaterThan(0); }
  });
  it('the demand lines and the shopping sheet list each one with a non-zero price', () => {
    const S = recipeScene('themed-scene', 'balanced', model, undefined, NOW)!;
    const D = demandOf(S, defaultProfile(), { now: NOW });
    for (const v of ['shipwreck', 'treasurechest']) { const l = D.items.find(c => c.key === `hard:${v}`); expect(l, v).toBeTruthy(); expect(l!.setup!.mode ?? l!.setup).toBeTruthy(); }
    const sc = defaultScene(); sc.tanks[0] = S;
    const sh = buildSheet(sc, 0);
    expect(JSON.stringify(sh)).toContain('Sunken sailing ship');
    expect(JSON.stringify(sh)).toContain('Decor');
  });
});

describe('the six existing looks are unchanged', () => {
  const snap = () => {
    const out: Record<string, unknown> = {};
    for (const a of ARCHETYPES.filter(x => x.recipe.looks.length && x.id !== 'themed-scene')) for (const d of ['open', 'balanced', 'full'] as const) {
      const S = recipeScene(a, d, model, undefined, NOW); if (!S) continue;
      const ax = designAxes(S), key = JSON.stringify(S.items.map(i => [i.kind, i.variant, i.size, Math.round(i.x), Math.round(i.depth), Math.round(i.yaw)]));
      let h = 2166136261; for (let k = 0; k < key.length; k++) h = Math.imul(h ^ key.charCodeAt(k), 16777619);
      out[`${a.id}/${d}`] = { n: S.items.length, h: h >>> 0, sub: S.substrate.type, ax: [ax.natural, ax.lush, ax.colourful, ax.ordered, ax.rockWood].map(x => Math.round(x * 1000) / 1000), mode: ax.plantMode };
    }
    return out;
  };
  it('draws every other archetype exactly as origin/main did', () => { expect(snap()).toEqual(looksMain); });
});
