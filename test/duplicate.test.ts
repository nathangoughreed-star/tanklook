// Groups (lane MS, 2026-10-16): move / turn / resize / delete keep a selection's layout; copies are seeded, stay inside the
// tank and keep species and sex; the store's selection holds a group and survives undo.
import { describe, expect, it } from 'vitest';
import { emptyScene } from '../src/scene/defaults';
import { copyGroup, groupBox, members, moveGroup, removeGroup, scaleGroup, turnGroup, COPY_DEFAULTS } from '../src/scene/duplicate';
import { LIBRARY } from '../src/scene/items';
import { Store } from '../src/scene/store';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const piece = (id: number, variant: string, x: number, depth: number, e: Partial<Item> = {}): Item =>
  ({ id, kind: LIBRARY[variant].kind, variant, seed: 3, x, depth, lift: 0, yaw: 0, pitch: 0, tilt: 0, size: LIBRARY[variant].size, ...e });
const fish = (id: number, x: number, y: number, depth: number, e: Partial<Fish> = {}): Fish =>
  ({ id, species: 'neon', x, y, depth, yaw: 0, pitch: 0, roll: 0, bend: 0, ...e });
function tank(items: Item[], fs: Fish[] = []): TankSetup {
  const S = structuredClone(emptyScene().tanks[0]);
  S.tank = { ...S.tank, L: 900, D: 450, H: 450 }; S.items = items; S.fish = fs;
  return S;
}
const stones = () => Object.keys(LIBRARY).filter(v => LIBRARY[v].kind === 'stone');
const plants = () => Object.keys(LIBRARY).filter(v => LIBRARY[v].kind === 'plant');

describe('group edits keep the layout', () => {
  it('move shifts every member by the same amount', () => {
    const S = tank([piece(1, stones()[0], 300, 200), piece(2, stones()[0], 400, 250)], [fish(1, 350, 200, 220)]);
    moveGroup(S, { fish: [1], items: [1, 2] }, 50, 20);
    expect([S.items[0].x, S.items[1].x, S.fish[0].x]).toEqual([350, 450, 400]);
    expect([S.items[0].depth, S.items[1].depth, S.fish[0].depth]).toEqual([220, 270, 240]);
  });
  it('turn rotates positions about the centre and adds to every yaw; four quarter turns come back', () => {
    const S = tank([piece(1, stones()[0], 300, 200), piece(2, stones()[0], 500, 200)]);
    const g = { fish: [], items: [1, 2] };
    turnGroup(S, g, 90);
    expect(S.items[0].x).toBeCloseTo(400, 0); expect(S.items[1].x).toBeCloseTo(400, 0);
    expect(Math.abs(S.items[0].depth - S.items[1].depth)).toBeCloseTo(200, 0);
    expect(S.items.map(i => i.yaw)).toEqual([90, 90]);
    for (let k = 0; k < 3; k++) turnGroup(S, g, 90);
    expect(S.items[0].x).toBeCloseTo(300, 0); expect(S.items[1].x).toBeCloseTo(500, 0);
  });
  it('resize scales the spacing and the pieces about the centre', () => {
    const S = tank([piece(1, stones()[0], 300, 200, { size: 100 }), piece(2, stones()[0], 500, 200, { size: 100 })]);
    scaleGroup(S, { fish: [], items: [1, 2] }, 1.5);
    expect(S.items[1].x - S.items[0].x).toBeCloseTo(300, 0);
    expect((S.items[0].x + S.items[1].x) / 2).toBeCloseTo(400, 0);
    expect(S.items[0].size).toBeGreaterThan(100);
  });
  it('delete removes exactly the members', () => {
    const S = tank([piece(1, stones()[0], 300, 200), piece(2, stones()[0], 500, 200)], [fish(1, 100, 100, 100), fish(2, 200, 100, 100)]);
    removeGroup(S, { fish: [2], items: [1] });
    expect(S.items.map(i => i.id)).toEqual([2]); expect(S.fish.map(f => f.id)).toEqual([1]);
  });
});

describe('copies', () => {
  const opts = { ...COPY_DEFAULTS, n: 5, angle: 30, scale: 20, spacing: 40, reshape: true };
  it('are seeded: the same seed gives the same layout, another seed a different one', () => {
    const mk = (seed: number) => { const S = tank([piece(1, plants()[0], 200, 200)]); copyGroup(S, { fish: [], items: [1] }, { ...opts, seed }, { fish: 1, item: 10 }); return JSON.stringify(S.items); };
    expect(mk(7)).toBe(mk(7)); expect(mk(7)).not.toBe(mk(8));
  });
  it('place n new pieces with fresh ids, inside the tank, varied in angle, size and shape', () => {
    const S = tank([piece(1, plants()[0], 200, 200)]);
    const out = copyGroup(S, { fish: [], items: [1] }, { ...opts, seed: 5 }, { fish: 1, item: 10 });
    expect(out.items).toEqual([10, 11, 12, 13, 14]); expect(S.items).toHaveLength(6);
    const c = S.items.slice(1);
    for (const it of c) { expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(S.tank.L); expect(it.depth).toBeLessThanOrEqual(S.tank.D); }
    expect(new Set(c.map(i => i.yaw)).size).toBeGreaterThan(1);
    expect(new Set(c.map(i => i.size)).size).toBeGreaterThan(1);
    expect(new Set(c.map(i => i.seed)).size).toBeGreaterThan(1);
    expect(S.items[0].x).toBe(200); // the original is untouched
  });
  it('with no jitter and no reshape, copies are exact repeats at an even step', () => {
    const S = tank([piece(1, stones()[0], 200, 200, { size: 120 })]);
    copyGroup(S, { fish: [], items: [1] }, { ...COPY_DEFAULTS, n: 3, seed: 1 }, { fish: 1, item: 10 });
    const xs = S.items.map(i => i.x), step = xs[1] - xs[0];
    expect(step).toBeGreaterThan(0); expect(xs[2] - xs[1]).toBeCloseTo(step, 5); expect(xs[3] - xs[2]).toBeCloseTo(step, 5);
    expect(new Set(S.items.map(i => i.size)).size).toBe(1); expect(new Set(S.items.map(i => i.seed)).size).toBe(1);
  });
  it('a school copies as a cloud of the same species and sex, kept inside the water', () => {
    const S = tank([], [fish(1, 450, 200, 200, { species: 'betta', sex: 'f' }), fish(2, 480, 210, 210, { species: 'betta', sex: 'f' })]);
    S.water.on = true;
    const out = copyGroup(S, { fish: [1, 2], items: [] }, { ...opts, n: 4, seed: 9 }, { fish: 3, item: 1 });
    expect(out.fish).toHaveLength(8); expect(S.fish).toHaveLength(10);
    for (const f of S.fish.slice(2)) { expect(f.species).toBe('betta'); expect(f.sex).toBe('f'); expect(f.y).toBeGreaterThanOrEqual(0); expect(f.y).toBeLessThanOrEqual(S.tank.H); expect(f.x).toBeGreaterThanOrEqual(0); expect(f.x).toBeLessThanOrEqual(S.tank.L); }
    expect(new Set(S.fish.slice(2).map(f => f.id)).size).toBe(8);
  });
  it('a plain duplicate lands beside the group, not on it', () => {
    const S = tank([piece(1, stones()[0], 200, 200), piece(2, stones()[0], 320, 200)]);
    copyGroup(S, { fish: [], items: [1, 2] }, { ...COPY_DEFAULTS, seed: 2 }, { fish: 1, item: 10 });
    const box = groupBox(S, { fish: [], items: [1, 2] })!, copy = groupBox(S, { fish: [], items: [10, 11] })!;
    expect(Math.abs(copy.cx - box.cx)).toBeGreaterThanOrEqual(box.w * 0.95);
    expect(copy.cx - copy.w / 2 - (box.cx + box.w / 2)).toBeGreaterThan(-1); // beside, with at most a touch of overlap
  });
});

describe('the selection holds a group', () => {
  const mk = () => { const sc = emptyScene(); sc.tanks[0].items = [piece(1, stones()[0], 100, 100), piece(2, stones()[0], 200, 100)]; sc.tanks[0].fish = [fish(1, 50, 50, 50), fish(2, 60, 50, 50)]; return new Store(sc); };
  it('toggle adds and removes, mixed kinds, a plain select clears it', () => {
    const st = mk();
    st.select(1); st.toggle('fish', 2); st.toggle('item', 1);
    expect(st.group).toEqual({ fish: [1, 2], items: [1] }); expect(st.groupCount).toBe(3);
    st.toggle('fish', 1); expect(st.group.fish).toEqual([2]);
    st.select(1); expect(st.groupCount).toBe(1);
  });
  it('a deleted member drops out; undo brings it back into the scene (not the group)', () => {
    const st = mk(); st.selectGroup({ fish: [1, 2], items: [] });
    st.edit(t => removeGroup(t, { fish: [2], items: [] }));
    expect(st.group.fish).toEqual([1]);
    st.undo(); expect(members(st.tank, { fish: [1, 2], items: [] }).fish).toHaveLength(2);
  });
  it('lead keeps the group and changes who leads', () => {
    const st = mk(); st.selectGroup({ fish: [1, 2], items: [] }); st.lead('fish', 2);
    expect(st.selId).toBe(2); expect(st.group.fish.sort()).toEqual([1, 2]);
  });
});
