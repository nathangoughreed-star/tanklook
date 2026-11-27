// HG1 (R187): procedural rock and driftwood. Seeds draw the same piece every time, the look settings change it, the
// settings save and load (clamped), and a file from before HG1 (no settings) loads unchanged.
import { describe, expect, it } from 'vitest';
import { genWood, cleanHs, hsFields, ROCK_GEN, WOOD_GEN, colours, hsKey } from '../src/scene/hardgen';
import { genRock } from '../src/render/rockgen';
import { itemDims, woodLimbs, LIBRARY } from '../src/scene/items';
import { parseScene } from '../src/scene/validate';
import { ITEM_FIELDS, setColour, setType } from '../src/scene/itemEdit';
import photo from '../research/visual/vf0/scenes/photo-55g.json';
import type { Item, TankSetup } from '../src/scene/types';

const box = (ls: ReturnType<typeof genWood>) => {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const l of ls) for (const p of l.pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  return hi.map((h, i) => h - lo[i]);
};

describe('HG1 wood', () => {
  for (const v of WOOD_GEN) it(`${v}: in the library, deterministic, sized, settings change it`, () => {
    expect(LIBRARY[v]?.kind).toBe('wood');
    const a = genWood(v, 4242, 400), b = genWood(v, 4242, 400), c = genWood(v, 4243, 400);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(c));
    const [L, H] = box(a);
    expect(v === 'manzanita' ? H : L).toBeCloseTo(400, -1);
    for (const l of a) for (const p of l.pts) { expect(p[1]).toBeGreaterThanOrEqual(0); expect(Number.isFinite(p[0] + p[2])).toBe(true); }
    if (v !== 'cholla') expect(genWood(v, 4242, 400, { branch: 1 }).length).toBeGreaterThan(a.length);
    expect(colours(v).length).toBeGreaterThan(1);
  });
  it('spider wood is a sprawl of many limbs, not two sticks (PH1 gap 3)', () => {
    const ls = genWood('spider', 277436716, 520);
    expect(ls.length).toBeGreaterThanOrEqual(12);
    const [L, H, W] = box(ls);
    expect(H).toBeGreaterThan(0.25 * L); expect(W).toBeGreaterThan(0.3 * L);
  });
  it('woodLimbs memoises and passes the settings through; itemDims follows them', () => {
    expect(woodLimbs('redmoor', 7, 300)).toBe(woodLimbs('redmoor', 7, 300));
    const it0 = { kind: 'wood' as const, variant: 'spider', seed: 9, size: 400 };
    expect(itemDims({ ...it0, hs: { spread: 1 } })[1]).toBeLessThan(itemDims({ ...it0, hs: { spread: 0 } })[1]);
  });
});

describe('HG1 rock', () => {
  for (const v of ROCK_GEN) it(`${v}: builds, sits on y = 0, colours, settings change it`, () => {
    const g = genRock(v, 77, 200), p = g.attributes.position;
    expect(p.count).toBeGreaterThan(100);
    expect(g.attributes.color.count).toBe(p.count);
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); expect(Number.isFinite(p.getX(i) + p.getZ(i))).toBe(true); }
    expect(lo).toBeGreaterThan(-0.5); expect(hi).toBeGreaterThan(5);
    const f = hsFields(v), k = f.find(x => x !== 'tex' && x !== 'tone')!;
    const g2 = genRock(v, 77, 200, { [k]: 1 });
    const a = Array.from(p.array as Float32Array).slice(0, 300).join(), b = Array.from(g2.attributes.position.array as Float32Array).slice(0, 300).join();
    expect(a).not.toEqual(b);
  });
});

describe('HG1 save and load', () => {
  it('settings are clamped and kept; junk dropped', () => {
    expect(cleanHs({ tex: 2, tone: -1, holes: 0.333, junk: 5, col: 2 })).toEqual({ tex: 1, tone: 0, holes: 0.33, col: 2 });
    expect(cleanHs({})).toBeUndefined();
    expect(cleanHs('x')).toBeUndefined();
    expect(hsKey(undefined)).toBe('');
  });
  it('a file from before HG1 loads with no settings; a saved piece keeps them', () => {
    const old = parseScene(photo).scene;
    expect(old.tanks[0].items.every(it => it.hs === undefined)).toBe(true);
    const f = structuredClone(photo) as typeof photo & { tanks: { items: Record<string, unknown>[] }[] };
    f.tanks[0].items[0].hs = { branch: 0.8, col: 1 };
    f.tanks[0].items[2].hs = { layers: 0.9, tex: 'x' };
    const it = parseScene(f).scene.tanks[0].items;
    expect(it[0].hs).toEqual({ branch: 0.8, col: 1 });
    expect(it[2].hs).toEqual({ layers: 0.9 });
  });
  it('the editor fields, colour and type edits', () => {
    const S = parseScene(photo).scene.tanks[0] as TankSetup, it = S.items.find(q => q.variant === 'slate') as Item;
    ITEM_FIELDS.h_layers(it, 80, S); expect(it.hs).toEqual({ layers: 0.8 });
    setColour(it, 2); expect(it.hs?.col).toBe(2);
    setColour(it, null); expect(it.hs?.col).toBeUndefined();
    setType(it, 'shale', S); expect(it.variant).toBe('shale');
    setType(it, 'spider', S); expect(it.variant).toBe('shale'); // a stone stays a stone
  });
});
