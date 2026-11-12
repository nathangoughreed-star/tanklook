// DQ7: the candidate API (scene/candidates.ts) and handOff mode 'fill'. A/B must behave exactly as before: the golden keys below were captured from the pre-DQ7 pairGen (origin/main 69064dd3) with the same inputs.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup, bareSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { lockObject, lockRoster, lockViolations } from '../src/scene/locks';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { finishSetup, gapsOf, nextCandidates } from '../src/scene/candidates';
import { handOff } from '../src/scene/reeval';
import { verdictOf } from '../src/scene/verdict';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const GOLDEN: Record<string, string[]> = {
  a: ['0gv1p78x0zpv', '1r2e2ze1tota', '0gv1p78x0zpv|1b5izw11tl1g'],
  b: ['1i0yzvl1tonu', '1r2e2ze1tota', '1i0yzvl1tonu|1b5izw11tl1g'],
  c: ['0w51b2l11bw0', '1cz32b33d6so', '0w51b2l11bw0|1b5izw11tl1g'],
};

const mk = (seed: number, fish: boolean): TankSetup => { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass'; t.layout = { ...t.layout, id: 'nature', seed }; regenerate(t, 'all', 1); if (!fish) t.fish = []; return ensureUids(t); };
const ses = (): DiscoverySession => ({ id: 's1', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'unsure', comparisons: [], status: 'active' });
const B = emptyBrief();
const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 200 + i * 30, y: 100, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
const isPlant = (i: TankSetup['items'][number]) => i.kind === 'plant' || i.kind === 'artificial';
beforeEach(() => clearPairCache());

describe('A/B is unchanged: nextPair gives the same pairs for the same seeds and inputs', () => {
  it('first pair and champion pair match the pre-DQ7 golden keys', () => {
    const out: Record<string, string[]> = {};
    for (const [name, seed, fish] of [['a', 7, true], ['b', 11, false], ['c', 23, true]] as const) {
      clearPairCache(); const hist = new Map<string, CandidateRecord>(), shown: string[] = [], s = ses(), p = { tank: mk(seed, fish), rev: 1 }, keys: string[] = [];
      const r1 = nextPair(p, B, s, id => hist.get(id), { shownKeys: shown, now: 1e12, budgetMs: 30000 });
      if (!r1.ok) { out[name] = ['NOSOL']; continue; }
      for (const r of [r1.a, r1.b]) { hist.set(r.id, r); shown.push(r.key!); keys.push(r.key!); }
      s.championId = r1.a.id;
      const r2 = nextPair(p, B, s, id => hist.get(id), { shownKeys: shown, now: 1e12, budgetMs: 30000 });
      keys.push(r2.ok ? `${r2.a.key}|${r2.b.key}` : 'NOSOL2'); out[name] = keys;
    }
    expect(out).toEqual(GOLDEN);
  }, 120000);
});

describe("handOff mode 'fill'", () => {
  const gen = () => mk(5, true);
  it('adds only the categories the scene lacks and never moves, resizes or removes what is there', () => {
    const cur = mk(9, false); cur.items = cur.items.filter(i => !isPlant(i)); cur.substrate.show = true;   // hardscape only, no plants, no animals
    expect(cur.items.length).toBeGreaterThan(0);
    const before = structuredClone(cur), g = gen();
    const r = handOff(cur, g, { mode: 'fill', accept: g.fish.map(f => f.species) });
    expect(cur).toEqual(before);                                                    // the input is never mutated
    expect(r.fresh).toBe(false); expect(r.scene.tank).toEqual(cur.tank);
    for (const it of cur.items) expect(r.scene.items.find(x => x.id === it.id)).toEqual(it);   // every kept piece, untouched
    expect(r.scene.items.filter(isPlant).length).toBeGreaterThan(0);                // the missing plants came in
    expect(r.scene.items.filter(i => !isPlant(i)).length).toBe(cur.items.length);   // no second helping of hardscape
    expect(r.scene.fish.length).toBeGreaterThan(0);
    expect(new Set(r.scene.items.map(i => i.id)).size).toBe(r.scene.items.length);  // fresh ids, no collisions
    for (const it of r.scene.items.filter(i => i.parent !== undefined)) expect(r.scene.items.some(p => p.id === it.parent)).toBe(true);
  });
  it('a scene with nothing missing comes back as it was', () => {
    const cur = mk(9, true), r = handOff(cur, gen(), { mode: 'fill', accept: ['ember'] });
    expect(r.scene.items).toEqual(cur.items); expect(r.scene.fish).toEqual(cur.fish); expect(r.changed.length).toBe(0);
  });
  it('a region predicate fills only that area, and only when it holds none of the category', () => {
    const cur = mk(9, false); cur.items = []; const L = cur.tank.L;
    const r = handOff(cur, gen(), { mode: 'fill', fill: { only: ['plants'], within: x => x < L / 3 } });
    const ps = r.scene.items.filter(isPlant); expect(ps.length).toBeGreaterThan(0); expect(ps.every(p => p.x < L / 3)).toBe(true);
    expect(r.scene.items.filter(i => !isPlant(i)).length).toBe(0);                  // hardscape was not asked for
  });
  it('a tank of another size: the generated look is adapted to the tank that is there, which never changes', () => {
    const cur = bareSetup(); cur.tank = { ...cur.tank, L: 24 * IN, D: 12 * IN, H: 12 * IN };
    const r = handOff(cur, gen(), { mode: 'fill' });
    expect(r.scene.tank).toEqual(cur.tank); expect(r.scene.items.length).toBeGreaterThan(0);
    for (const i of r.scene.items) { expect(i.x).toBeGreaterThanOrEqual(-1); expect(i.x).toBeLessThanOrEqual(cur.tank.L + 1); expect(i.depth).toBeLessThanOrEqual(cur.tank.D + 1); }
  });
});

describe('nextCandidates', () => {
  it('returns top-N diverse, feasible candidates for a whole scene (explore)', () => {
    const r = nextCandidates({ tank: mk(7, true), rev: 1 }, B, { objective: 'explore', n: 3, breadth: 0.5 }, { now: 1e12 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.candidates.length).toBeGreaterThanOrEqual(2); expect(r.candidates.length).toBeLessThanOrEqual(3);
    expect(new Set(r.candidates.map(c => c.key)).size).toBe(r.candidates.length);
    for (const c of r.candidates) { expect(c.verdict.feasible).toBe(true); expect(verdictOf(c.snapshot, B).feasible).toBe(true); }
  }, 60000);
  it('shownKeys are never returned again', () => {
    const p = { tank: mk(7, true), rev: 1 }, a = nextCandidates(p, B, { n: 2, breadth: 0.3 }, { now: 1e12 });
    if (!a.ok) throw new Error('no candidates');
    const b = nextCandidates(p, B, { n: 2, breadth: 0.3 }, { now: 1e12, shownKeys: a.candidates.map(c => c.key!) });
    if (b.ok) for (const c of b.candidates) expect(a.candidates.map(x => x.key)).not.toContain(c.key);
  }, 60000);
  it('refuses a request with nothing open, with a reason', () => {
    const t = mk(7, true); t.discoverOn = [];
    const r = nextCandidates({ tank: t, rev: 1 }, B, {}); expect(r.ok).toBe(false); if (!r.ok) expect(r.conflicts[0]).toMatch(/Nothing is open/);
  });
});

describe('finishSetup: a partial scene (tank + stocking kept)', () => {
  function partial(): TankSetup {
    const t = mk(7, false); t.items = []; t.substrate.show = false; t.patches = [];
    t.fish = fishOf('ember', 8, 301); ensureUids(t);
    lockObject(t, 'tank'); lockRoster(t, 'ember', 'exact', 8);
    return t;
  }
  it('fills the layout and the rest, and never touches the kept tank or animals', () => {
    const t = partial(), gaps = gapsOf(t, ['tank', 'animals', 'plants', 'hardscape', 'substrate']);
    expect(gaps).toEqual(expect.arrayContaining(['hardscape', 'plants'])); expect(gaps).not.toContain('animals');
    const r = finishSetup({ tank: t, rev: 1 }, B, { n: 2, breadth: 0.4 }, { now: 1e12 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.scope).not.toContain('tank');
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) {
      const S = c.snapshot;
      expect(S.tank).toEqual(t.tank);                                                         // the tank: out of scope, never resized
      expect(S.fish.map(f => ({ ...f }))).toEqual(t.fish.map(f => ({ ...f })));               // kept stocking: same animals, same places
      expect(lockViolations(t, S)).toEqual([]);                                               // no lock broken
      expect(S.items.filter(i => !isPlant(i)).length).toBeGreaterThan(0);                     // the layout was filled
      expect(S.items.filter(isPlant).length).toBeGreaterThan(0);                              // and the plants
      expect(c.verdict.feasible).toBe(true);
    }
  }, 60000);
  it('hand-added items are NOT kept automatically, yet a gap fill never changes them', () => {
    const t = partial(); const hand = mk(3, false).items.filter(i => !isPlant(i)).slice(0, 2); t.items = hand.map(i => ({ ...i })); ensureUids(t);   // only the tank and the stocking are kept
    const r = finishSetup({ tank: t, rev: 1 }, B, { n: 2, breadth: 0.4 }, { now: 1e12 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.gaps).not.toContain('hardscape');
    for (const c of r.candidates) for (const h of t.items) expect(c.snapshot.items.find(x => x.id === h.id)).toEqual(h);   // present items are exactly as they were
  }, 60000);
  it('nothing missing: a clear result, no candidates', () => {
    const full = mk(7, true); full.substrate.show = true; const r = finishSetup({ tank: full, rev: 1 }, B, {}, { now: 1e12 }); expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.gaps).toEqual([]); expect(r.nothingMissing).toBe(true); expect(r.conflicts[0]).toMatch(/Nothing is missing/); }
  });
  it('a gap that cannot be filled without changing something not kept says so and offers Show alternatives', () => {
    const t = mk(7, false); t.items = []; t.fish = fishOf('ember', 60, 401); ensureUids(t); lockObject(t, 'tank');   // far over the tank's stocking, not kept
    const r = finishSetup({ tank: t, rev: 1 }, B, { n: 2, breadth: 0.3 }, { now: 1e12 });
    expect(r.ok).toBe(false); if (r.ok) return;
    expect(r.needsChange).toBe(true); expect(r.relaxations[0]).toMatch(/Show alternatives/);
    expect(t.fish.length).toBe(60);                                                           // and nothing was changed
  }, 60000);
});
