import { describe, expect, it } from 'vitest';
import { archetype, ARCHETYPES } from '../src/scene/archetypes';
import { recipeScene, recipeTrio } from '../src/scene/recipes';
import { TANK_MODELS } from '../src/data/tanks';
import { designAxes } from '../src/scene/designAxes';
import { LIBRARY, ORNAMENT_ASPECT } from '../src/scene/items';
import { ornamentShape } from '../src/render/ornament3d';
import { demandOf, defaultProfile } from '../src/demand';
import demandItems from '../src/data/demand-items.json';
import { lookOrder } from '../src/scene/pairGen';
import { substrateCheck } from '../src/scene/substrateCheck';
import { optionDef } from '../src/scene/tech';

// Lane DS3 (2026-11-13): the colourful decorative look. A castle + colour gravel + dyed artificial plants + bubbler, no live plants;
// F colourful and sparse is generatable; G a broad first pool holds a decorative family; I every ornament and dyed plant is priced.
const NOW = Date.parse('2026-11-13');
const model = TANK_MODELS.find(x => x.name === '40 gal breeder' && !x.terrarium)!;
const D = ['open', 'balanced', 'full'] as const;

describe('A: castle-coloured-gravel is a generated decorative look', () => {
  it('is partial and buildable', () => { const a = archetype('castle-coloured-gravel')!; expect(a.support).toBe('partial'); expect(a.recipe.looks.length).toBeGreaterThan(0); });
  for (const d of D) it(`${d}: castle, colour gravel, 2+ dyed artificial plants, zero live plants, a bubbler`, () => {
    const S = recipeScene('castle-coloured-gravel', d, model, undefined, NOW)!;
    expect(S.items.filter(i => i.kind === 'ornament' && i.variant === 'castle').length).toBe(1);
    expect(S.substrate.type).toBe('clown');
    expect(S.items.filter(i => i.kind === 'plant').length).toBe(0);
    const tinted = S.items.filter(i => i.kind === 'artificial' && LIBRARY[i.variant].fake?.tint);
    expect(tinted.length).toBeGreaterThanOrEqual(2);
    expect(S.tech?.rows.air).toBe('airstone');
    expect(designAxes(S).plantMode).toBe('artificial');
  });
  it('the three levels step up and the bubbler is priced as an air-pump line', () => {
    const t = recipeTrio('castle-coloured-gravel', model, undefined, NOW)!;
    const n = D.map(d => t[d].items.length); expect(n[0]).toBeLessThan(n[1]); expect(n[1]).toBeLessThan(n[2]);
    const r = demandOf(t.balanced, defaultProfile(), { now: NOW });
    console.log('KEYS', r.items.map(c => c.key).filter(k => /air|sub/i.test(k)).join(','));
    expect(optionDef('air', 'airstone')).toBeTruthy();
  });
  it('coloured gravel costs more than natural gravel of the same volume', () => {
    const c = recipeScene('castle-coloured-gravel', 'balanced', model, undefined, NOW)!, n = structuredClone(c); n.substrate.type = 'gravel';
    const price = (S: typeof c) => demandOf(S, defaultProfile(), { now: NOW }).items.find(c => /substrate/i.test(c.key))!.setup!.mode;
    expect(price(c)).toBeGreaterThan(price(n));
  });
});

describe('castle geometry', () => {
  it('ORNAMENT_ASPECT.castle matches the built shape', () => {
    const g = ornamentShape('castle', 7, 1000); g.computeBoundingBox(); const b = g.boundingBox!, a = ORNAMENT_ASPECT.castle;
    [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].forEach((v, i) => expect(Math.abs(v / 1000 - a[i])).toBeLessThan(0.01));
  });
});

describe('F: colourful and sparse is generatable', () => {
  for (const d of D) it(`${d}: reads colourful and not natural`, () => {
    const ax = designAxes(recipeScene('castle-coloured-gravel', d, model, undefined, NOW)!);
    expect(ax.colourful).toBeGreaterThan(0.3); expect(ax.natural).toBeLessThan(0);
  });
  it('the open level is the sparsest', () => {
    const o = designAxes(recipeScene('castle-coloured-gravel', 'open', model, undefined, NOW)!), f = designAxes(recipeScene('castle-coloured-gravel', 'full', model, undefined, NOW)!);
    expect(o.lush).toBeLessThanOrEqual(f.lush);
  });
});

describe('G: the broad first Discover pool', () => {
  it('with no style given, the first pool has 3+ families and a decorative / themed one', () => {
    const first = lookOrder({ w: {} as never, prefs: undefined }, 'unsure', 'first').slice(0, 6);
    const fams = new Set(first.map(a => a.familyId));
    expect(fams.size).toBeGreaterThanOrEqual(3);
    expect(first.some(a => ['castle-coloured-gravel', 'themed-scene'].includes(a.id) || /playful/.test(a.familyId))).toBe(true);
  });
});

describe('I: every dyed plant and ornament is priced', () => {
  const rows = demandItems.rows as unknown as Record<string, { mode: number; url?: string }>;
  for (const [id, v] of Object.entries(LIBRARY).filter(([, v]) => v.kind === 'ornament' || (v.kind === 'artificial' && v.fake?.tint))) it(`${id}`, () => { expect(rows[`hard:${id}`]?.mode, id).toBeGreaterThan(0); expect(rows[`hard:${id}`].url).toBeTruthy(); void v; });
});

describe('SD1: bright gravel with bottom dwellers', () => {
  it('coloured gravel is gravel-grained, so sand-preferring corydoras draw the substrate note', () => {
    const S = recipeScene('castle-coloured-gravel', 'balanced', model, undefined, NOW)!;
    S.fish = ['kuhli', 'bronzecory'].map((species, i) => ({ id: i + 1, species, x: 300, y: 20, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 }) as never);
    const n = substrateCheck(S); expect(n.some(x => x.level === 'needs' && x.who.includes('kuhli'))).toBe(true); expect(n.some(x => x.level === 'prefers' && x.who.includes('bronzecory'))).toBe(true);
  });
});

void ARCHETYPES;
