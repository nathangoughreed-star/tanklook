// Lane P3: item edits (scene/itemEdit.ts) and the plant gate (ui/logic/plantGate.ts) moved out of ui/panels.ts.
// Frozen copies of the old inline code check the module against it.
import { describe, expect, it } from 'vitest';
import { rng } from '../src/art/paint';
import { isPatch } from '../src/art/plants';
import { defaultSetup } from '../src/scene/defaults';
import * as E from '../src/scene/itemEdit';
import { EPIPHYTES, LIBRARY, clampItem, itemDims, makeItem, perch } from '../src/scene/items';
import { groundHeight } from '../src/scene/terrain';
import { FIT_PAR, whyNot } from '../src/scene/plantfit';
import { lightOutCached, wattsOf } from '../src/scene/lightout';
import * as G from '../src/ui/logic/plantGate';
import type { Item, TankSetup } from '../src/scene/types';

const fresh = (): TankSetup => { const s = defaultSetup(); s.items = []; return s; };
const variants = (kind: string) => Object.entries(LIBRARY).filter(([, v]) => v.kind === kind).map(([id]) => id);
const plants = variants('plant'), stones = variants('stone'), woods = variants('wood');
const snap = (s: TankSetup) => JSON.stringify(s.items);

/** the old addItem body, frozen */
function oldAdd(s: TankSetup, variant: string, id: number, seed: number) {
  const r = rng(seed), T = s.tank;
  const it = makeItem(T, variant, id, seed, T.L / 2, T.D / 2, { yaw: LIBRARY[variant].kind === 'plant' ? 0 : Math.round((r() - 0.5) * 60) }, s);
  let best = -1;
  for (let k = 0; k < 16; k++) {
    const x = T.L * (0.15 + r() * 0.7), d = T.D * (0.2 + r() * 0.6);
    const gap = Math.min(...s.items.filter(q => q.kind !== 'plant' || !isPatch(q.variant)).map(q => Math.hypot(q.x - x, q.depth - d)), 1e6) - Math.abs(x - T.L / 2) * 0.15;
    if (gap > best) { best = gap; it.x = x; it.depth = d; }
  }
  const at = EPIPHYTES.has(variant) ? perch(s, it.x, it.depth, r) : null;
  if (at) Object.assign(it, at);
  clampItem(it, T, s); s.items.push(it);
}

describe('P3 addItem', () => {
  it('matches the old body over every variant kind, building up a scape', () => {
    const a = fresh(), b = fresh();
    let id = 1;
    for (const v of [...stones.slice(0, 2), ...woods.slice(0, 2), ...plants.slice(0, 12), ...Object.keys(LIBRARY).filter(v => EPIPHYTES.has(v))]) {
      oldAdd(a, v, id, id * 977); E.addItem(b, v, id, id * 977); id++;
    }
    expect(b.items.length).toBe(id - 1);
    expect(snap(b)).toBe(snap(a));
  });
  it('returns the piece it pushed and keeps it inside the tank', () => {
    const s = fresh(), it = E.addItem(s, stones[0], 5, 42);
    expect(s.items).toEqual([it]);
    expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(s.tank.L);
  });
  it('plants start unturned, other pieces turn within 30 degrees', () => {
    expect(E.dragYaw(plants[0], () => 0.99)).toBe(0);
    expect(E.dragYaw(stones[0], () => 0)).toBe(-30);
    expect(E.dragYaw(stones[0], () => 1)).toBe(30);
  });
});

describe('P3 drag placement', () => {
  it('placeAt then moveTo follow the pointer; moveTo of a missing id does nothing', () => {
    const s = fresh();
    E.placeAt(s, stones[0], 9, 3, { vi: 0, x: 300, depth: 120, lift: 15 } as never, 10);
    expect(s.items.length).toBe(1);
    expect(s.items[0]).toMatchObject({ id: 9, yaw: 10 });
    expect(s.items[0].lift).toBe(15);
    E.moveTo(s, 9, { vi: 0, x: 400, depth: 150, lift: 0 } as never);
    expect(s.items[0].x).toBeCloseTo(400, 0);
    const before = snap(s);
    E.moveTo(s, 77, { vi: 0, x: 1, depth: 1, lift: 0 } as never);
    expect(snap(s)).toBe(before);
  });
});

describe('P3 editItem / ITEM_FIELDS / nudge', () => {
  const base = () => { const s = fresh(); E.addItem(s, plants[0], 1, 11); E.addItem(s, stones[0], 2, 22); return s; };
  it('edits only the named id and clamps', () => {
    const s = base(), other = JSON.stringify(s.items[1]);
    E.editItem(s, 1, it => { it.x = 1e9; });
    expect(s.items[0].x).toBeLessThan(1e9);
    expect(JSON.stringify(s.items[1])).toBe(other);
    expect(() => E.editItem(s, 99, it => { it.x = 0; })).not.toThrow();
  });
  it('every slider id sets its field', () => {
    const s = base();
    const get = (k: keyof Item) => s.items[1][k];
    E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iYaw(it, 33, t)); expect(get('yaw')).toBe(33);
    E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iPitch(it, 12, t)); expect(get('pitch')).toBe(12);
    E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iTilt(it, 7, t)); expect(get('tilt')).toBe(7);
    E.ITEM_FIELDS.iStems(s.items[0], 4, s); expect(s.items[0].stems).toBe(4);
    E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iLift(it, 20, t)); expect(get('lift')).toBe(20);
    E.ITEM_FIELDS.iSize(s.items[1], 250, s); expect(get('size')).toBe(250);
    E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iX(it, 200, t)); E.editItem(s, 2, (it, t) => E.ITEM_FIELDS.iDepth(it, 100, t));
    expect(s.items[1].x).toBeCloseTo(200, -1); expect(s.items[1].depth).toBeGreaterThan(0);
    E.ITEM_FIELDS.iDens(s.items[0], 60, s); expect(s.items[0].dens).toBeCloseTo(0.6);
    E.ITEM_FIELDS.iSpread(s.items[0], 300, s); expect(s.items[0].spread).toBe(300);
    E.editItem(s, 1, (it, t) => E.ITEM_FIELDS.iGrowth(it, 50, t)); expect(s.items[0].growth).toBeCloseTo(0.5, 1);
  });
  it('reshape and drop', () => {
    const it = base().items[1]; it.lift = 40;
    E.reshape(it, 1234); expect(it.seed).toBe(1234);
    E.dropToGround(it); expect(it.lift).toBe(0);
  });
  it('nudge: y lifts, x / depth keep the height above the world', () => {
    const s = base(), it = s.items[1];
    const l0 = it.lift; E.nudge(it, s, 'y', 1, 5); expect(it.lift).toBe(l0 + 5);
    const y0 = groundHeight(s, s.tank, it.x, it.depth) + it.lift, x0 = it.x;
    E.nudge(it, s, 'x', -1, 5);
    expect(it.x).toBeCloseTo(x0 - 5, 5);
    expect(groundHeight(s, s.tank, it.x, it.depth) + it.lift).toBeCloseTo(y0, 5);
    const d0 = it.depth; E.nudge(it, s, 'z', 1, 1); expect(it.depth).toBeCloseTo(d0 + 1, 5);
  });
});

describe('P3 remove / duplicate / clear', () => {
  it('removeItem, duplicateItem (beside, turned 25), clearSection by menu', () => {
    const s = fresh();
    E.addItem(s, stones[0], 1, 1); E.addItem(s, plants[0], 2, 2); E.addItem(s, plants[1], 3, 3);
    const src = s.items[0], dup = E.duplicateItem(s, 1, 4)!;
    expect(dup.id).toBe(4); expect(dup.yaw).toBe(src.yaw + 25);
    expect(dup.x).toBeCloseTo(Math.min(src.x + Math.max(20, itemDims(src)[0] * 0.8), dup.x), 0);
    expect(E.duplicateItem(s, 99, 5)).toBeNull();
    E.clearSection(s, 'plants');
    expect(s.items.map(i => i.id)).toEqual([1, 4]);
    E.clearSection(s, 'hardscape'); expect(s.items).toEqual([]);
    E.addItem(s, plants[0], 7, 7); E.removeItem(s, 7); expect(s.items).toEqual([]);
  });
  it('scapeSec puts plants, corals and artificial under Plants', () => {
    expect(E.scapeSec('plant')).toBe('plants'); expect(E.scapeSec('coral')).toBe('plants'); expect(E.scapeSec('artificial')).toBe('plants');
    expect(E.scapeSec('stone')).toBe('hardscape'); expect(E.scapeSec('ornament')).toBe('hardscape');
  });
});

describe('P3 plant gate', () => {
  const chips = Object.entries(LIBRARY).filter(([, v]) => v.kind === 'plant' || v.kind === 'coral').map(([id, v]) => ({ variant: id, salt: !!v.salt }));
  it('off: no hint, nothing grayed', () => {
    const s = fresh(), v = G.gateView(s);
    expect(v).toMatchObject({ on: false, active: false, hint: '' });
    expect(G.gatedChips(v, s, chips)).toEqual([]);
  });
  it('on without a light level or care level: says what to choose first', () => {
    const s = fresh(); G.setGate(s, true); delete s.layout.fit; delete s.layout.careSet;
    const v = G.gateView(s);
    expect(v.on).toBe(true);
    if (!(lightOutCached(s) && wattsOf(s) > 0)) expect(v.missing.join()).toContain('light level');
    expect(v.missing.join()).toContain('care level');
    expect(v.hint.startsWith('Choose ')).toBe(true);
    expect(v.active).toBe(false);
  });
  it('the experience input is one parameter', () => {
    const s = fresh(); G.setGate(s, true); s.layout.fit = 'medium';
    expect(G.gateView(s, true).missing).toEqual([]);
    expect(G.gateView(s, false).missing.length).toBe(1);
    s.layout.careSet = true; expect(G.gateView(s).missing).toEqual([]);
  });
  it('active: grays exactly what whyNot rejects, with its text, and never hidden salt chips in fresh water', () => {
    const s = fresh(); G.setGate(s, true); s.layout.fit = 'low'; s.layout.careSet = true; s.grow.feed = 'low';
    const v = G.gateView(s);
    expect(v.active).toBe(true); expect(v.par).toBe(FIT_PAR.fresh.low);
    expect(v.hint).toBe('Grayed: does not suit 25 PAR at low-tech care. They can still be added.');
    const bad = G.gatedChips(v, s, chips);
    const want = chips.filter(c => whyNot(c.variant, 25, 'low') && !(c.salt && !v.salt));
    expect(bad.map(b => b.variant)).toEqual(want.map(c => c.variant));
    expect(bad.length).toBeGreaterThan(0);
    for (const b of bad) expect(b.why).toBe(whyNot(b.variant, 25, 'low')!.text);
    expect(bad.some(b => LIBRARY[b.variant].salt)).toBe(false);
  });
  it('setGate sets and clears the flag', () => {
    const s = fresh(); G.setGate(s, true); expect(s.layout.gatePlants).toBe(true);
    G.setGate(s, false); expect('gatePlants' in s.layout).toBe(false);
  });
});
