// Explore, stage X2 (lane OX4): candidate identity, dedupe, the saved store and the staleness re-check (reconcile 8.4 criterion 9; spec sections 6 and 8). Pure: no WebGL, no pictures.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { explorePool, type Candidate } from '../src/explore/pool';
import { configKey, dedupe, distance, entryOf, entryOfStored, idOf, loadSnapshot, toStored, type Entry, type StoredCandidate } from '../src/explore/candidate';
import { createExploreStore, EXPLORE_KEY, isProtected, recheckCandidate } from '../src/explore/store';
import { STORE_CAP } from '../src/explore/constants';
import { TANK_MODELS } from '../src/data/tanks';
import { briefToWants, emptyBrief, setItem } from '../src/scene/brief';
import type { Wants } from '../src/demand/suggest';
import { SCENE_VERSION } from '../src/scene/types';

const P = defaultProfile(), NOW = Date.parse('2026-11-02');
const LOOKS = ['planted-community', 'goldfish-palace', 'clownfish-anemone', 'tarantula-burrow'];
const pool = (w: Wants, only: readonly string[]) => explorePool(w, P, 'in', NOW, { only, sizes: 1, explain: false });
const open = pool({ constraints: {} }, LOOKS);
const some = open.eligible[0] ?? open.candidates[0];
const stored = (c: Candidate = some, o: Partial<Parameters<typeof toStored>[1]> = {}) => toStored(c, { batch: 1, now: NOW, ...o });

/** an in-memory Storage, with switches for the two ways a browser fails */
function fakeStorage(o: { full?: boolean; blocked?: boolean } = {}): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get length() { return data.size; }, clear: () => data.clear(), key: i => [...data.keys()][i] ?? null,
    getItem: k => { if (o.blocked) throw new Error('blocked'); return data.get(k) ?? null; }, removeItem: k => { data.delete(k); },
    setItem: (k, v) => { if (o.blocked || o.full) throw new Error('quota'); data.set(k, String(v)); } };
}
/** a hand-made record with the fields the store reads; `id` and the reaction are what a test moves */
function rec(id: string, state: StoredCandidate['reaction']['state'] = 'unrated', at = 1, extra: Partial<StoredCandidate> = {}): StoredCandidate {
  return { ...structuredClone(stored()), id, key: `k-${id}`, created: at, reaction: { state, saved: false, at }, ...extra };
}

describe('identity: the same configuration is the same candidate', () => {
  it('the pool produced candidates to work with', () => { expect(open.candidates.length).toBeGreaterThan(1); });
  it('configKey is canonical and id is a stable short hash', () => {
    const k = configKey({ key: 'a|b|x2' });
    expect(k).toBe(configKey({ key: 'a|b|x2' })); expect(k).toBe('a|b|x2|d2|s|g');
    expect(configKey({ key: 'a|b|x2', gear: ['heater', 'filter'] })).toBe(configKey({ key: 'a|b|x2', gear: ['filter', 'heater'] }));
    expect(configKey({ key: 'a|b|x2', seed: 3 })).not.toBe(k); expect(configKey({ key: 'a|b|x2', densityStop: 3 })).not.toBe(k);
    expect(idOf(k)).toBe(idOf(k)); expect(idOf(k)).toMatch(/^[0-9a-z]{12}$/); expect(idOf(k)).not.toBe(idOf(configKey({ key: 'a|b|x3' })));
  });
  it('every candidate of a pool gets its own id, and the id is the same in a second run', () => {
    const ids = open.candidates.map(c => entryOf(c).id), again = pool({ constraints: {} }, LOOKS).candidates.map(c => entryOf(c).id);
    expect(new Set(ids).size).toBe(ids.length); expect(again).toEqual(ids);
  });
  it('the stored snapshot is the pool scene, read back through parseScene with nothing that matters changed', () => {
    const s = stored(), back = loadSnapshot(JSON.parse(JSON.stringify(s.snapshot)), s.sceneVersion);
    expect(s.sceneVersion).toBe(SCENE_VERSION); expect(back.tank).toEqual(some.scene.tank);
    expect(back.fish.map(f => f.species).sort()).toEqual(some.scene.fish.map(f => f.species).sort()); expect(back.items.length).toBe(some.scene.items.length);
    expect(s.snapshot).not.toBe(some.scene);   // a copy: mutating the stored one never touches the pool's
  });
  it('a record carries the estimate frozen at generation, the roster, the identity, the provenance and the assumptions', () => {
    const s = stored();
    expect(s.estimate).toEqual(some.estimate); expect(s.roster.length).toBeGreaterThan(0); expect(s.identity.world).toBe(some.identity.world);
    expect(s.provenance.priceAsOf).toMatch(/\d{4}/); expect(s.provenance.assumptions.length).toBeGreaterThan(0);
    expect(s.status).toBe('current'); expect(s.reaction).toEqual({ state: 'unrated', saved: false, at: NOW });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);   // plain JSON
  });
  it('the firm caps a verdict was reached against go into the provenance; an unset limit is absent (it was unknown)', () => {
    const w = briefToWants(setItem(emptyBrief(), 'constraints.budget', 5000, 'hard')), c = pool(w, ['planted-community']).candidates[0], s = stored(c);
    expect(s.provenance.limits.budget).toEqual({ kind: 'firm', cap: 5000 }); expect(s.provenance.limits.monthly).toBeUndefined();
  });
});

describe('dedupe: nothing repeated, nothing near-identical unless a variation was asked for', () => {
  const es = open.candidates.map(c => entryOf(c));
  const twinOf = (a: Entry): Entry => ({ ...a, id: 'twin-' + a.id, key: a.key + '|x', fp: { ...a.fp, tankId: 'bigger' } });
  it('an exact configuration is dropped as the same', () => {
    const r = dedupe([es[0]], [es[0]]); expect(r.kept).toEqual([]); expect(r.dropped[0]).toMatchObject({ why: 'same', of: es[0].id });
  });
  it('distance is 0 to itself, within 0..1, and a different world costs at least its weight', () => {
    expect(distance(es[0].fp, es[0].fp)).toBe(0);
    for (const a of es) for (const b of es) { const d = distance(a.fp, b.fp); expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(1); }
    const far = es.find(e => e.fp.world !== es[0].fp.world); expect(far).toBeTruthy(); expect(distance(es[0].fp, far!.fp)).toBeGreaterThanOrEqual(0.2);
  });
  it('the same look in another tank size is a near-copy: dropped as near', () => {
    const a = es[0], twin = twinOf(a);
    expect(distance(a.fp, twin.fp)).toBeLessThan(0.3);
    expect(dedupe([twin], [a]).dropped[0]).toMatchObject({ why: 'near', of: a.id });
  });
  it('a variation is allowed only when asked for, and only against the parent it names', () => {
    const a = es[0], b = es.find(e => e.id !== a.id)!;
    expect(dedupe([twinOf(a)], [a], { variantOf: a.id }).kept).toHaveLength(1);
    expect(dedupe([twinOf(b)], [a, b], { variantOf: a.id }).kept).toEqual([]);   // naming A does not free B's neighbours
    expect(dedupe([a], [a], { variantOf: a.id }).kept).toEqual([]);              // an identical configuration is never a variation
  });
  it('two near-copies inside one batch keep the first', () => {
    const a = es[0]; expect(dedupe([a, twinOf(a)], []).kept).toEqual([a]);
  });
  it('the stored form is an entry too, so a saved favourite rules out its own repeat', () => {
    expect(dedupe([entryOf(some)], [entryOfStored(stored())]).kept).toEqual([]);
  });
});

describe('the store: capped, nothing kept is evicted, works with storage absent', () => {
  it('puts, lists newest first, and reads a snapshot back through parseScene', () => {
    const st = fakeStorage(), s = createExploreStore(st);
    expect(s.put(rec('a', 'unrated', 1)).stored).toBe(true); expect(s.put(rec('b', 'unrated', 2)).stored).toBe(true);
    expect(s.list().map(e => e.id)).toEqual(['b', 'a']); expect(s.persisted).toBe(true);
    const got = s.get('a')!; expect(got.snapshot.tank).toEqual(some.scene.tank); expect(got.snapshot.fish.length).toBe(some.scene.fish.length);
    expect(st.data.has(EXPLORE_KEY)).toBe(true); expect(st.data.has('tanklook.explore.a')).toBe(true);
    expect(JSON.parse(st.data.get(EXPLORE_KEY)!)[0]).not.toHaveProperty('snapshot');   // the index never carries the heavy part
  });
  it('a second store over the same storage finds the records again (a favourite is found in a later session)', () => {
    const st = fakeStorage(); createExploreStore(st).put(rec('a', 'liked', 1));
    const again = createExploreStore(st); expect(again.list().map(e => e.id)).toEqual(['a']); expect(again.get('a')?.reaction.state).toBe('liked');
  });
  it('cap: passed records are evicted first, then the oldest unrated; liked / saved / chosen never are', () => {
    const s = createExploreStore(fakeStorage());
    s.put(rec('liked', 'liked', 1)); s.put(rec('saved', 'unrated', 2, { reaction: { state: 'unrated', saved: true, at: 2 } })); s.put(rec('chosen', 'unrated', 3, { chosenAt: 3 }));
    s.put(rec('passed', 'passed', 4)); for (let i = 0; i < STORE_CAP - 4; i++) s.put(rec(`u${i}`, 'unrated', 10 + i));
    expect(s.list().length).toBe(STORE_CAP);
    const r = s.put(rec('new', 'unrated', 999)); expect(r.stored).toBe(true); expect(r.evicted).toEqual(['passed']);
    const r2 = s.put(rec('new2', 'unrated', 1000)); expect(r2.evicted).toEqual(['u0']);
    for (const id of ['liked', 'saved', 'chosen']) expect(s.has(id)).toBe(true);
    expect(s.list().length).toBe(STORE_CAP);
  });
  it('a store full of kept candidates refuses a new unrated one rather than evicting a kept one', () => {
    const s = createExploreStore(fakeStorage()); for (let i = 0; i < STORE_CAP; i++) s.put(rec(`l${i}`, 'liked', i));
    const r = s.put(rec('extra', 'unrated', 999)); expect(r.stored).toBe(false); expect(s.list().length).toBe(STORE_CAP); expect(s.list().every(isProtected)).toBe(true);
  });
  it('react: like / pass / unrated and Favourites are independent; choose keeps the record, liked and marked', () => {
    const s = createExploreStore(fakeStorage()); s.put(rec('a'));
    expect(s.react('a', { state: 'liked' }, 5)?.reaction).toEqual({ state: 'liked', saved: false, at: 5 });
    expect(s.react('a', { saved: true }, 6)?.reaction).toEqual({ state: 'liked', saved: true, at: 6 });
    expect(s.react('a', { state: 'unrated' }, 7)?.reaction).toEqual({ state: 'unrated', saved: true, at: 7 });   // still a favourite
    expect(s.react('nope', { state: 'liked' })).toBeUndefined();
    const c = s.choose('a', 9)!; expect(c.chosenAt).toBe(9); expect(c.reaction.state).toBe('liked'); expect(s.has('a')).toBe(true);
  });
  it('remove and clear forget a record and its snapshot', () => {
    const st = fakeStorage(), s = createExploreStore(st); s.put(rec('a')); s.put(rec('b', 'unrated', 2, { project: 'p2' }));
    s.remove('a'); expect(s.has('a')).toBe(false); expect(st.data.has('tanklook.explore.a')).toBe(false);
    s.clear('p2'); expect(s.list()).toEqual([]);
  });
  it("lists one exploration's records only when a project is named", () => {
    const s = createExploreStore(fakeStorage()); s.put(rec('a', 'unrated', 1, { project: 'p1' })); s.put(rec('b', 'unrated', 2, { project: 'p2' }));
    expect(s.list('p1').map(e => e.id)).toEqual(['a']); expect(s.list().length).toBe(2);
  });
  it('with storage absent it works in memory and says it is not persisted', () => {
    const s = createExploreStore(undefined); expect(s.persisted).toBe(false);
    s.put(rec('a', 'liked')); expect(s.list().map(e => e.id)).toEqual(['a']); expect(s.get('a')?.snapshot.fish.length).toBe(some.scene.fish.length);
    s.react('a', { saved: true }); expect(s.list()[0].reaction.saved).toBe(true);
  });
  it('storage that throws on every call (a blocked browser) never throws out of the store', () => {
    const s = createExploreStore(fakeStorage({ blocked: true }));
    expect(() => { s.put(rec('a')); s.react('a', { state: 'liked' }); s.get('a'); s.list(); s.recheck({ constraints: {} }); s.remove('a'); s.clear(); }).not.toThrow();
    expect(s.persisted).toBe(false);
  });
  it('a full quota keeps the record in memory for the session and flips persisted', () => {
    const s = createExploreStore(fakeStorage({ full: true })); expect(s.put(rec('a')).stored).toBe(true);
    expect(s.persisted).toBe(false); expect(s.get('a')?.snapshot.fish.length).toBe(some.scene.fish.length);
  });
  it('a damaged index or snapshot is skipped, not fatal', () => {
    const st = fakeStorage(); st.setItem(EXPLORE_KEY, '{not json'); expect(createExploreStore(st).list()).toEqual([]);
    st.setItem(EXPLORE_KEY, JSON.stringify([{ id: 1 }, null])); expect(createExploreStore(st).list()).toEqual([]);
    createExploreStore(st).put(rec('a')); st.setItem('tanklook.explore.a', 'garbage'); expect(createExploreStore(st).get('a')).toBeUndefined();
  });
});

describe('staleness: a firm limit that changes relabels a saved candidate, never deletes it (criterion 9)', () => {
  const c = some, hi = c.estimate.startupUsd.hi, mean = c.estimate.startupUsd.mean;
  const wBudget = (v: number): Wants => briefToWants(setItem(emptyBrief(), 'constraints.budget', v, 'hard'));
  it('lowering the budget under the candidate makes it stale, naming the budget; raising it again makes it current', () => {
    const s = createExploreStore(fakeStorage()); s.put({ ...stored(c), reaction: { state: 'liked', saved: true, at: 1 } });
    expect(s.recheck(wBudget(Math.ceil(hi) + 200))).toEqual([]);   // roomy: nothing changes
    const down = s.recheck(wBudget(Math.floor(mean) - 20));
    expect(down).toHaveLength(1); expect(down[0]).toMatchObject({ from: 'current', to: 'stale', limit: 'budget' }); expect(down[0].because).toMatch(/budget/i);
    const r1 = s.list()[0]; expect(r1.status).toBe('stale'); expect(r1.staleLimit).toBe('budget'); expect(r1.staleBecause).toMatch(/\$/); expect(s.has(r1.id)).toBe(true);
    expect(s.get(r1.id)?.snapshot.fish.length).toBe(c.scene.fish.length);   // the snapshot is untouched
    const up = s.recheck(wBudget(Math.ceil(hi) + 200));
    expect(up).toHaveLength(1); expect(up[0]).toMatchObject({ from: 'stale', to: 'current' });
    const back = s.list()[0]; expect(back.status).toBe('current'); expect(back.staleLimit).toBeUndefined(); expect(back.staleBecause).toBeUndefined();
  });
  it('a limit nobody set never makes a candidate stale, and a flexible one never does either', () => {
    expect(recheckCandidate(stored(c), { constraints: {} }).status).toBe('current');
    const flex = briefToWants(setItem(emptyBrief(), 'constraints.budget', Math.floor(mean) - 20, 'preference'));
    expect(recheckCandidate(stored(c), flex).status).toBe('current');
  });
  it("a Required tank that is not the candidate's makes it stale on the equipment", () => {
    const other = TANK_MODELS.find(t => t.id !== c.tank.id)!;
    expect(recheckCandidate(stored(c), { constraints: {}, ownTank: other })).toMatchObject({ status: 'stale', limit: 'equipment' });
  });
  it('a re-check never touches the aspects a record carries', () => {
    const s = createExploreStore(fakeStorage()); s.put(stored(c)); const before = JSON.stringify(s.list()[0].features);
    s.recheck(wBudget(1)); expect(JSON.stringify(s.list()[0].features)).toBe(before);
  });
});
