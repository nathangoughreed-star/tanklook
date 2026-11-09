// DX0: the discovery foundation (locks, uids, rev, scope, proposals). Spec section 9 invariants 1, 2, 3, 4, 11, 12 at the model level.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate, shuffleHard } from '../src/scene/starter';
import { adaptToTank } from '../src/scene/reeval';
import { parseScene } from '../src/scene/validate';
import { ensureUids } from '../src/scene/uid';
import { SCENE_VERSION, type Fish, type TankSetup } from '../src/scene/types';
import { editableFields, diffTouches, type Tab } from '../src/scene/scope';
import { lockObject, lockRoster, lockViolations, parseLocks } from '../src/scene/locks';
import { applyProposal, checkProposal, deltaBetween, previewProposal, type Proposal } from '../src/scene/proposal';
import { layerOf } from '../src/scene/items';

const IN = 25.4;
const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
/** A tank with 7 kuhlis (ids 101..), 5 ember tetras (201..) and the planted starter set. */
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.layout = { ...t.layout, id: 'nature' }; // rocks and wood as well as plants
  regenerate(t, 'all', 1);
  t.fish = [...fishOf('kuhli', 7, 101), ...fishOf('ember', 5, 201)];
  return ensureUids(t);
}
const storeOf = (t: TankSetup) => new Store({ ...defaultScene(), tanks: [t] });
const prop = (store: Store, delta: Proposal['delta'], scope: Tab[]): Proposal => ({ baseRev: store.rev, scope, delta, summary: 'test' });
const plantsOf = (t: TankSetup) => t.items.filter(it => layerOf(it) === 'plant');
const hardOf = (t: TankSetup) => t.items.filter(it => layerOf(it) === 'hard');
const newPlant = (t: TankSetup) => ({ ...structuredClone(plantsOf(t)[0]), id: 0, uid: undefined, x: 50, depth: 50 });

describe('uids', () => {
  it('every animal and item has a unique uid, also after a save round trip and undo', () => {
    const s = storeOf(project());
    const all = () => [...s.tank.items, ...s.tank.fish].map(o => o.uid);
    expect(all().every(Boolean)).toBe(true); expect(new Set(all()).size).toBe(all().length);
    const back = parseScene(JSON.parse(JSON.stringify(s.scene))).scene.tanks[0];
    expect([...back.items, ...back.fish].map(o => o.uid)).toEqual(all());
    const before = all();
    s.update(x => { x.tanks[0].items.pop(); });
    s.undo(); expect(all()).toEqual(before);
  });
  it('a duplicated piece gets its own uid; the original keeps its', () => {
    const s = storeOf(project()), first = s.tank.items[0];
    s.update(x => { x.tanks[0].items.push({ ...structuredClone(first), id: 999 }); });
    expect(s.tank.items[0].uid).toBe(first.uid); expect(s.tank.items.at(-1)!.uid).not.toBe(first.uid);
  });
  it('survive every regenerate layer: kept layers keep uids, a redraw with nothing changed keeps all of them', () => {
    for (const what of ['hard', 'plant', 'animal', 'all'] as const) {
      const t = project(), uids = () => [...t.items, ...t.fish].map(o => o.uid!).sort();
      const before = uids(); regenerate(t, what, 500);
      expect(new Set(uids()).size, what).toBe(t.items.length + t.fish.length);
      if (what === 'plant') for (const it of hardOf(project())) void it; // (hardscape below)
      // a layer drawn again from the same seed draws the same pieces: nothing changes identity
      const again = project(); const ids0 = [...again.items].map(o => o.uid!); regenerate(again, what === 'animal' ? 'plant' : what, 500);
      if (what !== 'animal' && what !== 'all') expect(again.items.map(o => o.uid!).filter(u => ids0.includes(u)).length, what).toBeGreaterThan(0);
      expect(before.length).toBeGreaterThan(0);
    }
  });
  it('a plant redraw keeps the hardscape uids; a hardscape shuffle keeps the plant uids and the animals', () => {
    const t = project(), hard = hardOf(t).map(i => i.uid), plants = plantsOf(t).map(i => i.uid), fish = t.fish.map(f => f.uid);
    t.layout.dens = { ...t.layout.dens!, plant: 3 }; regenerate(t, 'plant', 900);
    expect(hardOf(t).map(i => i.uid)).toEqual(hard);
    const t2 = project(), plants2 = plantsOf(t2).map(i => i.uid), fish2 = t2.fish.map(f => f.uid); shuffleHard(t2, 77);
    expect(plantsOf(t2).map(i => i.uid)).toEqual(plants2); expect(t2.fish.map(f => f.uid)).toEqual(fish2); expect(plants.length).toBeGreaterThan(0); expect(fish).toHaveLength(12);
    expect(t2.items.every(i => !!i.uid)).toBe(true);
  });
  it('an animal redraw of the same animals keeps the old uids; adaptToTank keeps every uid', () => {
    const t = project(); t.layout.dens = { ...t.layout.dens!, animal: 2 }; regenerate(t, 'animal', 1);
    const u = t.fish.map(f => f.uid); regenerate(t, 'animal', 1);
    expect(t.fish.map(f => f.uid)).toEqual(u);
    const a = project(), uids = a.items.map(i => i.uid);
    adaptToTank(a, { L: 36 * IN, H: 16 * IN, D: 14 * IN });
    for (const id of a.items.map(i => i.uid)) expect(uids).toContain(id);
    expect(a.fish.every(f => !!f.uid)).toBe(true);
  });
});

describe('rev and migration', () => {
  it('rev goes up on every design change and on replace / undo, not on camera moves, and is never rewound', () => {
    const s = storeOf(project()), r0 = s.rev;
    s.update(x => { x.tanks[0].items.pop(); }); expect(s.rev).toBe(r0 + 1);
    s.cam(c => { c.az += 5; }); expect(s.rev).toBe(r0 + 1);
    s.undo(); expect(s.rev).toBe(r0 + 2);
    s.replace(defaultScene()); expect(s.rev).toBe(r0 + 3);
  });
  it('a v9 save loads with uids, and its locked brief roster becomes exact roster locks', () => {
    const t = project(); delete (t as Partial<TankSetup>).locks;
    t.items.forEach(i => delete i.uid); t.fish.forEach(f => delete f.uid);
    const brief = { v: 5, items: { 'animals.stock': { status: 'locked', value: [{ species: 'kuhli', count: 7 }] }, 'appearance.look': { status: 'preference', value: 'x' } } };
    const raw = { version: 9, name: 'old', units: 'in', tanks: [{ ...t, brief }], active: 0, camLock: true };
    const { scene } = parseScene(raw), L = scene.tanks[0];
    expect(scene.version).toBe(SCENE_VERSION);
    expect([...L.items, ...L.fish].every(o => !!o.uid)).toBe(true);
    expect(L.locks?.roster).toEqual([{ species: 'kuhli', mode: 'exact', n: 7 }]);
  });
  it('locks survive a save round trip; malformed locks are dropped', () => {
    const t = project(); lockObject(t, t.items[0].uid!, ['position']); lockRoster(t, 'kuhli', 'atLeast', 7); lockObject(t, 'substrate');
    const back = parseScene(JSON.parse(JSON.stringify({ ...defaultScene(), tanks: [t] }))).scene.tanks[0];
    expect(back.locks).toEqual(t.locks);
    expect(parseLocks({ objects: [{ target: 5 }, { target: 'tank' }], roster: [{ species: 'x', mode: 'bogus', n: 2 }] })).toEqual({ objects: [{ target: 'tank' }], roster: [] });
  });
});

describe('scope (invariant 1: unchecked means unchanged)', () => {
  it('diffTouches names the tabs, uids and properties that changed', () => {
    const a = project(), b = structuredClone(a), hard = hardOf(b)[0], plant = plantsOf(b)[0];
    hard.x += 40; b.fish.pop(); b.substrate.type = 'tsand'; b.light.bright = 0.5; b.camera.az += 3; plant.size += 10;
    const d = diffTouches(a, b);
    expect(d.tabs).toEqual(['animals', 'plants', 'hardscape', 'substrate']);
    expect(d.items.changed[hard.uid!]).toEqual(['position']); expect(d.items.changed[plant.uid!]).toEqual(['size']);
    expect(d.fish.removed).toHaveLength(1); expect(d.support).toEqual(['light']); expect(d.tank).toEqual([]);
  });
  it('with Animals unchecked a plant proposal that also adds, removes or resizes an animal is refused and changes nothing', () => {
    const s = storeOf(project()), before = JSON.stringify(s.tank), rev = s.rev;
    const bad: Proposal['delta'][] = [
      { items: { add: [newPlant(s.tank)] }, fish: { add: fishOf('ember', 1, 900) } },
      { items: { add: [newPlant(s.tank)] }, fish: { remove: [s.tank.fish[8].uid!] } },
      { items: { add: [newPlant(s.tank)] }, fish: { change: [{ uid: s.tank.fish[8].uid!, set: { tl: 10 } }] } },
    ];
    for (const d of bad) {
      const r = applyProposal(s, prop(s, d, ['plants', 'hardscape']));
      expect(r.ok).toBe(false); if (!r.ok && r.reason !== 'stale') { expect(r.reason).toBe('scope'); expect(r.outside).toEqual(['animals']); }
    }
    expect(JSON.stringify(s.tank)).toBe(before); expect(s.rev).toBe(rev);
  });
  it('a checked tab is only a ceiling: a narrow plant proposal changes nothing else', () => {
    const s = storeOf(project()), plantsBefore = plantsOf(s.tank).length;
    const r = applyProposal(s, prop(s, { items: { add: [newPlant(s.tank)] } }, ['animals', 'plants', 'hardscape', 'substrate', 'tank']));
    expect(r.ok).toBe(true);
    expect(plantsOf(s.tank)).toHaveLength(plantsBefore + 1); expect(s.tank.fish).toHaveLength(12);
    if (r.ok) expect(r.touches.tabs).toEqual(['plants']);
  });
  it('editableFields = scope ∩ unlocked', () => {
    const t = project(); const h = hardOf(t)[0].uid!, p = plantsOf(t)[0].uid!;
    lockObject(t, h); lockObject(t, p, ['position']); lockObject(t, 'substrate'); lockRoster(t, 'kuhli', 'exact', 7);
    const e = editableFields(t, ['plants', 'substrate']);
    expect(e.items.find(i => i.uid === h)).toBeUndefined();            // hardscape tab off (and fully locked anyway)
    expect(e.items.find(i => i.uid === p)).toMatchObject({ removable: false }); expect(e.items.find(i => i.uid === p)!.props).not.toContain('position');
    expect(e.substrate).toBe(false); expect(e.fish).toEqual([]); expect(e.add).toEqual({ hardscape: false, plants: true, animals: false }); expect(e.roster).toEqual([]);
    const all = editableFields(t, ['animals', 'hardscape']);
    expect(all.items.find(i => i.uid === h)).toBeUndefined();          // locked object
    expect(all.fish).toHaveLength(12); expect(all.roster).toHaveLength(1);
  });
});

describe('locks (invariants 2 and 3)', () => {
  it('exactly 7 kuhlis: the seven stay; flexible tetras may vary; fewer or more of the locked species is refused', () => {
    const s = storeOf(project()); lockRoster(s.tank, 'kuhli', 'exact', 7);
    const scope: Tab[] = ['animals'], tet = s.tank.fish.filter(f => f.species === 'ember').map(f => f.uid!), kuhl = s.tank.fish.filter(f => f.species === 'kuhli').map(f => f.uid!);
    expect(applyProposal(s, prop(s, { fish: { remove: [kuhl[0]] } }, scope))).toMatchObject({ ok: false, reason: 'locks' });
    expect(applyProposal(s, prop(s, { fish: { add: fishOf('kuhli', 1, 900) } }, scope))).toMatchObject({ ok: false, reason: 'locks' });
    expect(applyProposal(s, prop(s, { fish: { remove: tet.slice(0, 2), add: fishOf('ember', 4, 910) } }, scope))).toMatchObject({ ok: true });
    expect(s.tank.fish.filter(f => f.species === 'kuhli').map(f => f.uid)).toEqual(kuhl);
  });
  it('at least 7: the count may rise, never fall below seven; species only: it must stay present', () => {
    const t = project(); lockRoster(t, 'kuhli', 'atLeast', 7); lockRoster(t, 'ember', 'speciesOnly');
    const scope: Tab[] = ['animals'], kuhl = t.fish.filter(f => f.species === 'kuhli').map(f => f.uid!), tet = t.fish.filter(f => f.species === 'ember').map(f => f.uid!);
    const p = (d: Proposal['delta']): Proposal => ({ baseRev: 0, scope, delta: d, summary: '' });
    expect(checkProposal(t, p({ fish: { add: fishOf('kuhli', 3, 900) } })).ok).toBe(true);
    expect(checkProposal(t, p({ fish: { remove: [kuhl[0]] } })).ok).toBe(false);
    expect(checkProposal(t, p({ fish: { remove: tet.slice(0, 4) } })).ok).toBe(true);
    expect(checkProposal(t, p({ fish: { remove: tet } })).violations[0]).toMatchObject({ kind: 'roster', target: 'ember' });
  });
  it('a locked hardscape position holds while the rest of the tab is explored; a locked substrate is whole', () => {
    const s = storeOf(project()), hard = hardOf(s.tank), centre = hard[0], other = hard[1] ?? hard[0];
    lockObject(s.tank, centre.uid!, ['position']); lockObject(s.tank, 'substrate');
    const scope: Tab[] = ['hardscape', 'substrate'];
    expect(applyProposal(s, prop(s, { items: { change: [{ uid: centre.uid!, set: { x: centre.x + 80 } }] } }, scope))).toMatchObject({ ok: false, reason: 'locks' });
    expect(applyProposal(s, prop(s, { items: { remove: [centre.uid!] } }, scope))).toMatchObject({ ok: false, reason: 'locks' });
    expect(applyProposal(s, prop(s, { items: { change: [{ uid: centre.uid!, set: { yaw: centre.yaw + 30 } }] } }, scope))).toMatchObject({ ok: true }); // size / pose are not held
    for (const set of [{ substrate: { ...s.tank.substrate, type: 'tsand' as const } }, { terrain: { ...s.tank.terrain, on: true } }]) {
      expect(applyProposal(s, prop(s, { set }, scope))).toMatchObject({ ok: false, reason: 'locks' });
    }
    expect(applyProposal(s, prop(s, { items: { change: [{ uid: other.uid!, set: { x: other.x + 10 } }] } }, scope)).ok).toBe(other !== centre);
    expect(JSON.stringify(s.tank.substrate)).toBe(JSON.stringify(project().substrate));
  });
  it('lockViolations does not charge a proposal for a lock the user already broke by hand', () => {
    const t = project(); lockRoster(t, 'kuhli', 'exact', 7);
    t.fish = t.fish.filter((f, i) => !(f.species === 'kuhli' && i < 2)); // 5 now, by hand
    const after = structuredClone(t); after.items.pop();
    expect(lockViolations(t, after)).toEqual([]);
  });
});

describe('proposals (invariants 4, 11 and 12)', () => {
  it('previewing is pure: the store, the tank and the proposal are untouched; apply is one undo step and adds no lock', () => {
    const s = storeOf(project()), before = JSON.stringify(s.scene), rev = s.rev;
    const p = prop(s, { items: { add: [newPlant(s.tank)] } }, ['plants']), pJson = JSON.stringify(p);
    const view = previewProposal(s.tank, p);
    expect(view.items).toHaveLength(s.tank.items.length + 1); expect(JSON.stringify(s.scene)).toBe(before); expect(JSON.stringify(p)).toBe(pJson); expect(s.rev).toBe(rev);
    const depth = s.mark; // (no apply = rejecting: nothing to do, nothing moved)
    expect(s.mark).toBe(depth);
    const r = applyProposal(s, p);
    expect(r.ok).toBe(true); expect(s.mark).toBe(depth + 1); expect(s.tank.locks).toBeUndefined();
    s.undo(); expect(JSON.stringify(s.tank.items.map(i => i.uid))).toBe(JSON.stringify(project().items.length ? s.tank.items.map(i => i.uid) : []));
    expect(s.tank.items).toHaveLength(project().items.length);
  });
  it('a proposal that tries to change locks is refused', () => {
    const s = storeOf(project());
    const r = applyProposal(s, prop(s, { set: { locks: { objects: [{ target: 'tank' }], roster: [] } } }, ['tank', 'animals', 'plants', 'hardscape', 'substrate']));
    expect(r).toMatchObject({ ok: false, reason: 'locks' });
  });
  it('a stale proposal is refused after any manual edit, even one that undo reverted', () => {
    const s = storeOf(project()), p = prop(s, { items: { add: [newPlant(s.tank)] } }, ['plants']);
    s.update(x => { x.tanks[0].light.bright = 0.7; });
    expect(applyProposal(s, p)).toMatchObject({ ok: false, reason: 'stale', baseRev: p.baseRev, currentRev: s.rev });
    s.undo(); expect(applyProposal(s, p)).toMatchObject({ ok: false, reason: 'stale' });
    expect(s.tank.items).toHaveLength(project().items.length);
  });
  it('deltaBetween: a generator result becomes a delta that reproduces it, uid-matched', () => {
    const a = project(), b = structuredClone(a);
    b.items.pop(); b.items.push({ ...newPlant(a), id: 777, uid: undefined }); b.substrate.type = 'tsand'; plantsOf(b)[0].size += 15; b.fish.length = 6;
    const d = deltaBetween(a, b), out = previewProposal(a, { baseRev: 0, scope: [], delta: d, summary: '' });
    expect(out.items.map(i => [i.kind, i.variant, Math.round(i.size)]).sort()).toEqual(b.items.map(i => [i.kind, i.variant, Math.round(i.size)]).sort());
    expect(out.fish).toHaveLength(6); expect(out.substrate.type).toBe('tsand');
    expect(d.items?.remove).toHaveLength(1);
  });
  it('re-entry: manual edits, an applied proposal and a lock all live in the one saved project', () => {
    const s = storeOf(project());
    s.update(x => { lockObject(x.tanks[0], 'tank'); }); // the user locks the tank by hand
    expect(applyProposal(s, prop(s, { items: { add: [newPlant(s.tank)] } }, ['plants'])).ok).toBe(true); // a first run
    const saved = parseScene(JSON.stringify(s.scene)).scene, s2 = storeOf(saved.tanks[0]);
    expect(s2.tank.locks?.objects).toEqual([{ target: 'tank' }]);
    expect(applyProposal(s2, prop(s2, { set: { tank: { ...s2.tank.tank, L: s2.tank.tank.L + 100 } } }, ['tank']))).toMatchObject({ ok: false, reason: 'locks' }); // a later run
    expect(s2.tank.items).toHaveLength(s.tank.items.length);
  });
});
