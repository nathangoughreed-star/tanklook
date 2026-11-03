// Explore, stage X2 (lane OX4): the preference profile and Stage B ranking (reconcile 8.4 criteria 7, 8, 9; spec sections 5, 7). Pure: no WebGL, no pictures.
// The batches are assembled from a controlled pool of entries (one planted freshwater look per family, reefs, terrariums, paludariums), so the policy is tested on counts, never on pixels.
import { describe, expect, it } from 'vitest';
import { aspectScore, aspectsOf, clearAspects, eventOf, featuresOf, interpretationOf, labelOf, parseAspects, react, recordAspect, tagOf, tell, tellAspect, TAGS, TAG_IDS, undoAspect, undoAspectsOf, undoLast,
  weightsOf, type AspectSubject, type Aspects, type AspectTag, type Reaction } from '../src/explore/aspects';
import { assembleBatch, batchSizeOf, isSoftwareRenderer } from '../src/explore/rank';
import { distance, type Entry, type Fingerprint } from '../src/explore/candidate';
import { gateCandidate } from '../src/explore/gate';
import { ASPECT_CAP, ASPECT_EVENTS, BATCH_SIZE, BATCH_SIZE_SOFTWARE_GL, EXPLORE_SHARE, TOLD_WEIGHT, WORLD_FLOOR } from '../src/explore/constants';
import { BRIEF_VERSION, ITEM_IDS, ROUTES, briefToWants, emptyBrief, parseBrief, serializeBrief, setItem, setRange, type Brief } from '../src/scene/brief';
import { applyChange, routeOf, setConstraint, setRoute } from '../src/scene/project';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const readFileSync = (f: string, enc: 'utf8') => fs.readFileSync(new URL(`../${f}`, import.meta.url), enc);

// ---------------------------------------------------------------------------------------------------------------- a controlled pool
let n = 0;
interface Look { fam: string; arch: string; world: AspectSubject['world']; water: AspectSubject['water']; species: string[]; plants: number; vivid: boolean; plantMode?: AspectSubject['plantMode']; min?: number; look?: string }
const subjectOf = (l: Look): AspectSubject => ({ world: l.world, water: l.water, familyId: l.fam, archetypeId: l.arch, roster: l.species.map(species => ({ species, n: 6 })), plantMode: l.plantMode ?? 'live', plants: l.plants, vivid: l.vivid, minPerWeek: l.min ?? 40, gal: 30, difficulty: 'Beginner' });
function entry(l: Look): Entry {
  const s = subjectOf(l), id = `e${n++}`;
  const fp: Fingerprint = { world: l.world, water: l.water, familyId: l.fam, archetypeId: l.arch, tankId: `t-${l.arch}`, species: [...l.species].sort(), look: l.look ?? l.arch, startupUsd: 200 };
  return { id, key: `k-${id}`, fp, features: featuresOf(s) };
}
const FW = ['neon', 'cardinal', 'ember', 'rummynose', 'harlequin', 'chili', 'danio', 'whitecloud', 'merah', 'greenneon'];
const plantedFW = Array.from({ length: 12 }, (_, i) => entry({ fam: `fw-${i % 6}`, arch: `planted-${i}`, world: 'aquarium', water: 'freshwater', species: [FW[i % 10], FW[(i + 1) % 10]], plants: 8, vivid: true }));
const hardscapeFW = [entry({ fam: 'fw-wild', arch: 'rock-1', world: 'aquarium', water: 'freshwater', species: ['cpd', 'dwarfpencil'], plants: 0, vivid: false }),
  entry({ fam: 'fw-wild2', arch: 'rock-2', world: 'aquarium', water: 'freshwater', species: ['exclamation', 'dwarfrasbora'], plants: 0, vivid: false })];
const reefs = ['ocellaris', 'royalgramma', 'yellowtang', 'firefish'].map((sp, i) => entry({ fam: `sw-${i}`, arch: `reef-${i}`, world: 'aquarium', water: 'saltwater', species: [sp, 'sixline'], plants: 0, vivid: true, min: 80 }));
const terraria = ['leopardgecko', 'crestedgecko', 'greenanole'].map((sp, i) => entry({ fam: `te-${i}`, arch: `terra-${i}`, world: 'terrarium', water: 'none', species: [sp], plants: 3, vivid: false, plantMode: 'mixed' }));
const paludariums = ['dartfrog', 'treefrog', 'firenewt'].map((sp, i) => entry({ fam: `pa-${i}`, arch: `palu-${i}`, world: 'paludarium', water: 'freshwater', species: [sp], plants: 4, vivid: false }));
const POOL: Entry[] = [...plantedFW, ...hardscapeFW, ...reefs, ...terraria, ...paludariums];
const isPlantedFW = (e: Entry) => e.features.includes('world:fresh') && e.features.includes('plants:lush') && e.fp.world === 'aquarium';
const likeOf = (e: Entry, on?: AspectTag[], off?: AspectTag[]): Reaction => ({ kind: 'like', c: e.id, features: e.features, ...(on ? { on } : {}), ...(off ? { off } : {}) });
const passOf = (e: Entry, on?: AspectTag[], off?: AspectTag[]): Reaction => ({ ...likeOf(e, on, off), kind: 'pass' });
const reactAll = (rs: Reaction[], p?: Aspects) => rs.reduce<Aspects | undefined>((a, r) => react(a, r), p);

describe('the closed vocabulary: no tag can change a limit (criterion 7)', () => {
  it('has the four groups of reconcile 5.2 and every tag a label', () => {
    expect(new Set(TAGS.map(t => t.group))).toEqual(new Set(['visual', 'animals', 'world', 'ownership']));
    expect(new Set(TAG_IDS).size).toBe(TAG_IDS.length); for (const t of TAGS) expect(t.label.length).toBeGreaterThan(2);
  });
  it('no tag id is a constraint item, and no tag or feature label speaks of money, room, a firm size or time', () => {
    const constraintNames = ITEM_IDS.filter(i => i.startsWith('constraints.')).map(i => i.split('.')[1].toLowerCase());
    const forbidden = /expens|cheap|budget|cost|price|money|dollar|\$|too large|too big|too much|too small|room|space|afford|minutes|hours|limit/i;
    for (const t of TAGS) { expect(constraintNames).not.toContain(t.id.toLowerCase()); expect(t.label).not.toMatch(forbidden); expect(t.id).not.toMatch(forbidden); }
    for (const k of POOL.flatMap(e => e.features)) { expect(tagOf(k), k).toBeTruthy(); expect(labelOf(k)).not.toMatch(forbidden); }
  });
  it('every feature of a candidate belongs to a tag, and an unknown tag cannot be told or recorded', () => {
    expect(tell(undefined, 'budget:low', 1)).toBeUndefined(); expect(tell(undefined, 'cost:cheap', 1)).toBeUndefined();
    expect(eventOf({ kind: 'like', c: 'x', features: ['cost:cheap', 'colors:vivid'], on: ['colors'] })?.pos).toEqual(['colors:vivid']);
    for (const e of POOL) for (const k of e.features) expect(TAG_IDS).toContain(tagOf(k));
  });
  it('the preference code reads no constraint: aspects.ts and rank.ts import neither the gate, the estimate, the constraint items nor the demand model', () => {
    for (const f of ['aspects', 'rank']) {
      const src = readFileSync(`src/explore/${f}.ts`, 'utf8'), imports = [...src.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const i of imports) expect(i, `${f}.ts imports ${i}`).not.toMatch(/gate|estimate|constraints|demand|pool|suggest|project/);
    }
    const gateImports = [...readFileSync('src/explore/gate.ts', 'utf8').matchAll(/from '([^']+)'/g)].map(m => m[1]);
    for (const i of gateImports) expect(i, `gate.ts imports ${i}`).not.toMatch(/aspects|taste|rank/);   // the gate never sees a preference
  });
});

describe('feedback semantics: Like, Pass, Unrated, Save, tag and Make This Mine each do something different (criterion 7)', () => {
  const e = plantedFW[0], reef = reefs[0], w = (p: Aspects | undefined) => Object.fromEntries([...weightsOf(p)].map(([k, v]) => [k, +v.w.toFixed(4)]));
  it('Unrated is no event at all', () => {
    expect(react(undefined, { kind: 'unrated', c: e.id, features: e.features })).toBeUndefined();
    const p = react(undefined, likeOf(e)); expect(react(p, { kind: 'unrated', c: reef.id, features: reef.features })).toBe(p);
    const b = emptyBrief(); expect(recordAspect(b, { kind: 'unrated', c: e.id, features: e.features })).toBe(b);
  });
  it('Like, Pass, Save, Make This Mine and a tag produce five distinct profiles', () => {
    const profiles = [react(undefined, likeOf(e)), react(undefined, passOf(e)), react(undefined, { kind: 'save', c: e.id, features: e.features }), react(undefined, { kind: 'mine', c: e.id, features: e.features }),
      react(undefined, { kind: 'tag', c: e.id, features: e.features, on: ['colors'] })].map(p => JSON.stringify(w(p)));
    expect(new Set(profiles).size).toBe(5);
  });
  it('a Like helps, a Pass hurts, a Save is weaker than a Like, Make This Mine is the strongest', () => {
    const sum = (k: Reaction['kind']) => aspectScore(weightsOf(react(undefined, { kind: k as never, c: e.id, features: e.features })), e.features);
    expect(sum('like')).toBeGreaterThan(0); expect(sum('pass')).toBeLessThan(0); expect(sum('save')).toBeGreaterThan(0); expect(sum('save')).toBeLessThan(sum('like')); expect(sum('mine')).toBeGreaterThan(sum('like'));
  });
  it('a Like with tags teaches ONLY the tagged aspects; with none it is weak evidence over everything, flagged unattributed', () => {
    const tagged = weightsOf(react(undefined, likeOf(e, ['colors', 'plants']))), plain = weightsOf(react(undefined, likeOf(e)));
    expect([...tagged.keys()].sort()).toEqual(['colors:vivid', 'plants:lush']);
    expect(plain.size).toBe(e.features.length); expect(plain.get('colors:vivid')!.w).toBeLessThan(tagged.get('colors:vivid')!.w);
  });
  it('a Pass on a reef candidate leaves saltwater above its floor, and the reef stays in the pool and in the batch (criterion 7)', () => {
    const p = react(undefined, passOf(reef)), ww = weightsOf(p);
    expect(ww.get('world:marine')).toBeUndefined();   // an unattributed Pass says nothing about the world ...
    expect(ww.get(`look:${reef.fp.familyId}`)).toBeUndefined();   // ... or the look family
    expect(ww.get('species:ocellaris')!.w).toBeLessThan(0);        // but it is evidence against THIS candidate's own aspects
    const batch = assembleBatch(POOL, p, { size: POOL.length, exploreShare: 0 });
    expect(batch.picks.map(x => x.entry.id)).toContain(reef.id);   // still in the pool (nothing is removed by a preference)
  });
  it('an explicit marine tag lowers saltwater but never to zero: the weight stops at its floor, and marine candidates stay eligible to be shown', () => {
    let p: Aspects | undefined; for (let i = 0; i < 12; i++) p = react(p, passOf(reefs[i % reefs.length], undefined, ['marine']));
    const m = weightsOf(p).get('world:marine')!; expect(m.w).toBe(WORLD_FLOOR); expect(m.w).toBeLessThan(0);
    const batch = assembleBatch(POOL, p, { size: 8 }); expect(batch.picks.length).toBe(8);
    expect(batch.picks.some(x => x.entry.fp.water === 'saltwater' || reefs.includes(x.entry))).toBe(true);
  });
  it('a world weight is bounded below by the floor even when the person told us a hard no', () => {
    expect(weightsOf(tell(undefined, 'world:marine', -1)).get('world:marine')!.w).toBe(WORLD_FLOOR);
  });
  it('"Love the colors, don\'t want a reef": positive on color, negative on marine, and not on the rest', () => {
    const w2 = weightsOf(react(undefined, likeOf(reef, ['colors'], ['marine'])));
    expect(w2.get('colors:vivid')!.w).toBeGreaterThan(0); expect(w2.get('world:marine')!.w).toBeLessThan(0); expect(w2.size).toBe(2);
  });
  it('a tag added after the click REPLACES the unattributed weight of that Like (one signal, counted once)', () => {
    const p1 = react(undefined, likeOf(e)), p2 = react(p1, { kind: 'tag', c: e.id, features: e.features, on: ['colors'] });
    expect(p2!.events).toHaveLength(1); expect(p2!.events[0]).toMatchObject({ k: 'like', att: true, pos: ['colors:vivid'] });
    const p3 = react(react(undefined, likeOf(e)), likeOf(e, ['colors'])); expect(p3!.events).toHaveLength(1);
    expect(react(undefined, { kind: 'tag', c: e.id, features: e.features, on: ['colors'] })!.events[0].k).toBe('tag');   // a tag with no reaction stands alone
  });
  it('older signals fade, a signal is scaled by how many events spoke for it, and the list is capped', () => {
    const one = weightsOf(react(undefined, likeOf(e, ['plants']))).get('plants:lush')!, three = weightsOf(reactAll([likeOf(e, ['plants']), likeOf(plantedFW[1], ['plants']), likeOf(plantedFW[2], ['plants'])])).get('plants:lush')!;
    expect(three.w).toBeGreaterThan(one.w); expect(three.n).toBe(3);
    let p: Aspects | undefined = react(undefined, likeOf(e, ['plants']));
    for (let i = 0; i < 10; i++) p = react(p, passOf(reefs[0], ['species']) as Reaction);
    expect(weightsOf(p).get('plants:lush')!.w).toBeLessThan(one.w);   // faded by the events after it
    for (let i = 0; i < ASPECT_EVENTS + 20; i++) p = react(p, likeOf(plantedFW[i % 12], ['colors']));
    expect(p!.events.length).toBe(ASPECT_EVENTS);
  });
});

describe('undo, clear and "You told us"', () => {
  const e = plantedFW[0];
  it('undo restores the profile exactly, step by step, down to no profile at all (a brief equal to the one before)', () => {
    let b = emptyBrief(); const trail: Brief[] = [b];
    for (const r of [likeOf(e, ['colors']), passOf(reefs[0]), { kind: 'save', c: plantedFW[1].id, features: plantedFW[1].features } as Reaction, likeOf(terraria[0])]) { b = recordAspect(b, r); trail.push(b); }
    for (let i = trail.length - 2; i >= 0; i--) { b = undoAspect(b); expect(b).toEqual(trail[i]); }
    expect(b).toEqual(emptyBrief()); expect(aspectsOf(b)).toBeUndefined();
  });
  it("undoAspectsOf takes back one candidate's events and nothing else; clear forgets everything", () => {
    let b = [likeOf(e, ['colors']), passOf(reefs[0]), likeOf(e)].reduce((acc, r) => recordAspect(acc, r), emptyBrief());
    b = undoAspectsOf(b, e.id); expect(aspectsOf(b)!.events.every(x => x.c === reefs[0].id)).toBe(true);
    expect(aspectsOf(clearAspects(b))).toBeUndefined(); expect(clearAspects(b)).toEqual(emptyBrief());
    expect(undoLast(undefined)).toBeUndefined();
  });
  it('You told us overrides the learned weight with the person\'s own, no early-signal fade, and handing it back restores what was learned', () => {
    const learned = react(undefined, passOf(e, undefined, ['plants'])), before = weightsOf(learned).get('plants:lush')!;
    expect(before.w).toBeLessThan(0); expect(before.source).toBe('learned');
    const told = weightsOf(tell(learned, 'plants:lush', 1)).get('plants:lush')!; expect(told).toMatchObject({ w: TOLD_WEIGHT, source: 'told' });
    expect(weightsOf(tell(tell(learned, 'plants:lush', 1), 'plants:lush', 0)).get('plants:lush')).toEqual(before);
    expect(tell(tell(undefined, 'plants:lush', 1), 'plants:lush', 0)).toBeUndefined();
    const b = tellAspect(emptyBrief(), 'colors:vivid', -1); expect(aspectsOf(b)!.told).toEqual({ 'colors:vivid': -1 });
  });
  it('the interpretation line names the top two aspects, the strongest away, an easy-care lean, and stays quiet on an early signal', () => {
    expect(interpretationOf(react(undefined, likeOf(e)))).toBeUndefined();   // one unattributed like is not a finding
    const p = reactAll([likeOf(e, ['colors', 'plants']), likeOf(plantedFW[1], ['colors', 'plants']), likeOf(plantedFW[2], ['colors', 'plants']), passOf(reefs[0], undefined, ['marine']), passOf(reefs[1], undefined, ['marine']), passOf(reefs[2], undefined, ['marine'])]);
    const it1 = interpretationOf(p)!; expect(it1.toward.length).toBeLessThanOrEqual(2); expect(it1.toward.map(x => x.key).sort()).toEqual(['colors:vivid', 'plants:lush']);
    expect(it1.away.map(x => x.key)).toEqual(['world:marine']); expect(it1.text).toMatch(/You seem to like .*vivid color.*but .*marine/); expect(it1.text).toMatch(/something different\?$/);
    const easy = interpretationOf(tell(tell(undefined, 'daily-care:low', 1), 'complexity:beginner', 1))!; expect(easy.easyCare).toBe(true);
  });
});

describe('Stage B: adaptive batches that keep exploring (criterion 8)', () => {
  const batch1 = assembleBatch(POOL, undefined, { size: BATCH_SIZE });
  const count = (b: { picks: { entry: Entry }[] }, f: (e: Entry) => boolean) => b.picks.filter(x => f(x.entry)).length;
  it('batch one (no profile) is pure diversity: six picks, several worlds, no exploration slot, nothing near-identical', () => {
    expect(batch1.picks).toHaveLength(BATCH_SIZE); expect(batch1.followed).toBe(false); expect(batch1.exploreSlots).toBe(0);
    expect(new Set(batch1.picks.map(x => x.entry.fp.world)).size).toBeGreaterThanOrEqual(3);
    for (const a of batch1.picks) for (const b of batch1.picks) if (a !== b) expect(distance(a.entry.fp, b.entry.fp)).toBeGreaterThanOrEqual(0.3);
  });
  it('after 3 liked planted-freshwater candidates (tagged colors + plants) the next batch leans planted-freshwater AND still holds a candidate from another world / family', () => {
    const liked = plantedFW.slice(0, 3), p = reactAll(liked.map(l => likeOf(l, ['colors', 'plants'])));
    const seen = [...batch1.picks.map(x => x.entry), ...liked], batch2 = assembleBatch(POOL, p, { size: BATCH_SIZE, seen });
    expect(count(batch2, isPlantedFW)).toBeGreaterThan(count(batch1, isPlantedFW));
    expect(count(batch2, isPlantedFW)).toBeGreaterThanOrEqual(BATCH_SIZE - 2 - 1);
    expect(batch2.exploreSlots).toBeGreaterThanOrEqual(1); expect(batch2.exploreSlots).toBeLessThanOrEqual(2);
    const explored = batch2.picks.filter(x => x.role === 'explore'); expect(explored.length).toBe(batch2.exploreSlots);
    expect(explored.every(x => !isPlantedFW(x.entry))).toBe(true);
    expect(batch2.picks.some(x => x.entry.fp.world !== 'aquarium' || x.entry.fp.water !== 'freshwater')).toBe(true);
    for (const x of batch2.picks) { expect(seen.map(s => s.id)).not.toContain(x.entry.id); for (const s of seen) expect(distance(s.fp, x.entry.fp)).toBeGreaterThanOrEqual(0.3); }
    expect(batch2.picks.filter(x => x.role !== 'explore').every(x => x.why.length > 0)).toBe(true);   // each matched pick can say why
    expect(batch2.interpretation?.text).toMatch(/vivid color|lush planting/);
  });
  it('exploration slots are about EXPLORE_SHARE: 1-2 of 6, 1 of 3, and none without a profile or when the pool has nothing to spare', () => {
    const p = reactAll([likeOf(plantedFW[0], ['plants'])]);
    expect([1, 2]).toContain(assembleBatch(POOL, p, { size: 6 }).exploreSlots); expect(assembleBatch(POOL, p, { size: batchSizeOf(true) }).exploreSlots).toBe(1);
    expect(assembleBatch(POOL, p, { size: POOL.length }).exploreSlots).toBe(0);       // the whole pool is shown: nothing to explore beyond it
    expect(assembleBatch(POOL, undefined, { size: 6 }).exploreSlots).toBe(0);
    expect(Math.abs(Math.round(6 * EXPLORE_SHARE) - 2)).toBeLessThanOrEqual(1);
  });
  it('a single like does not take over a batch: it stays under the cap and the batch keeps several worlds', () => {
    const p = react(undefined, likeOf(plantedFW[0], ['colors', 'plants', 'species']));
    for (const x of weightsOf(p).values()) { expect(Math.abs(x.w)).toBeLessThanOrEqual(ASPECT_CAP); expect(Math.abs(x.w)).toBeLessThan(0.4); }
    const b = assembleBatch(POOL, p, { size: 6, seen: [plantedFW[0]] });
    expect(new Set(b.picks.map(x => x.entry.fp.world)).size).toBeGreaterThanOrEqual(2); expect(count(b, isPlantedFW)).toBeLessThan(6);
    const heavy = reactAll(Array.from({ length: 40 }, (_, i) => likeOf(plantedFW[i % 12], ['plants']))); expect(Math.max(...[...weightsOf(heavy).values()].map(x => Math.abs(x.w)))).toBeLessThanOrEqual(ASPECT_CAP);
  });
  it('a clearly passed-on look is not offered as a "surprise" while anything else can be', () => {
    const p = reactAll([passOf(reefs[0], ['colors'], ['species', 'layout', 'size']), passOf(reefs[0], undefined, ['species', 'layout', 'size']), likeOf(plantedFW[0], ['plants'])]);
    const b = assembleBatch(POOL, p, { size: 6, seen: [reefs[0], plantedFW[0]] });
    for (const x of b.picks.filter(y => y.role === 'explore')) expect(x.score).toBeGreaterThanOrEqual(-0.15);
  });
  it('the batch is a subset of `eligible`: it never invents a candidate and never reads the profile to admit one', () => {
    const ids = new Set(POOL.map(x => x.id));
    const p = reactAll(plantedFW.map(x => likeOf(x, ['colors', 'plants', 'species'])));
    for (const b of [assembleBatch(POOL, p), assembleBatch(POOL.slice(0, 3), p), assembleBatch([], p)]) for (const x of b.picks) expect(ids.has(x.entry.id)).toBe(true);
    expect(assembleBatch([], p).picks).toEqual([]);
    const only = reefs; for (const x of assembleBatch(only, p, { size: 6 }).picks) expect(only).toContain(x.entry);   // the profile cannot pull a planted tank into a reef-only pool
  });
  it('the same inputs always give the same batch', () => {
    const p = reactAll([likeOf(plantedFW[0], ['plants'])]); expect(assembleBatch(POOL, p).picks.map(x => x.entry.id)).toEqual(assembleBatch(POOL, p).picks.map(x => x.entry.id));
  });
  it('a variation is offered only when asked for', () => {
    const a = plantedFW[0], twin: Entry = { ...a, id: 'twin', key: 'k-twin', fp: { ...a.fp, tankId: 'bigger' } };
    expect(assembleBatch([twin], undefined, { seen: [a] }).picks).toHaveLength(0); expect(assembleBatch([twin], undefined, { seen: [a], variantOf: a.id }).picks).toHaveLength(1);
  });
  it('batch size: 6 on a GPU, 3 on software GL, by the renderer string', () => {
    expect(batchSizeOf(false)).toBe(BATCH_SIZE); expect(batchSizeOf(true)).toBe(BATCH_SIZE_SOFTWARE_GL); expect([BATCH_SIZE, BATCH_SIZE_SOFTWARE_GL]).toEqual([6, 3]);
    for (const r of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver']) expect(isSoftwareRenderer(r)).toBe(true);
    for (const r of ['ANGLE (Intel, Intel(R) Arc(TM) Pro Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'NVIDIA GeForce RTX 4070']) expect(isSoftwareRenderer(r)).toBe(false);
  });
});

describe('preferences decide priority, constraints decide eligibility (criterion 9)', () => {
  const withAspects = () => {
    let b = setItem(setItem(emptyBrief(), 'constraints.budget', 300, 'hard'), 'constraints.monthly', 40, 'hard'); b = recordAspect(b, likeOf(plantedFW[0], ['colors', 'plants'])); return recordAspect(b, passOf(reefs[0], undefined, ['marine']));
  };
  it('the constraints a brief yields do not depend on the profile: Wants is identical with the profile deleted', () => {
    const b = withAspects(), bare = clearAspects(b);
    expect(aspectsOf(b)).toBeTruthy(); expect(JSON.stringify(briefToWants(b))).toBe(JSON.stringify(briefToWants(bare)));
  });
  it('the gate takes no preference: one argument, the candidate and the brief it is judged against', () => {
    expect(gateCandidate.length).toBe(1);
  });
  it('a constraint change leaves preferences.aspects byte-identical', () => {
    const b = withAspects(), before = JSON.stringify(b.items['preferences.aspects']);
    for (const next of [setConstraint(b, 'startup', 150), setRange(b, 'constraints.budget', { max: 120 }), setItem(b, 'constraints.careMin', 30, 'hard'), applyChange(b, { constraints: [{ id: 'startup', value: 80 }, { id: 'ongoing', skip: true }] }).state, setConstraint(setConstraint(b, 'startup', 90), 'startup', 500)]) {
      expect(JSON.stringify(next.items['preferences.aspects'])).toBe(before);
    }
  });
  it('a preference change leaves every constraint item byte-identical', () => {
    const b = withAspects(), strip = (x: Brief) => JSON.stringify(Object.fromEntries(Object.entries(x.items).filter(([k]) => k.startsWith('constraints.'))));
    expect(strip(recordAspect(b, likeOf(terraria[0], ['land' as AspectTag])))).toBe(strip(b)); expect(strip(tellAspect(b, 'plants:lush', -1))).toBe(strip(b)); expect(strip(clearAspects(b))).toBe(strip(b));
  });
});

describe('brief v5: the profile and the route are additive', () => {
  it('round-trips through the saved form, and a v4 brief loads unchanged', () => {
    expect(BRIEF_VERSION).toBe(5);
    let b = recordAspect(recordAspect(emptyBrief(), likeOf(plantedFW[0], ['colors'])), { kind: 'save', c: reefs[0].id, features: reefs[0].features }); b = tellAspect(b, 'world:marine', -1);
    expect(parseBrief(JSON.parse(serializeBrief(b)))).toEqual(b); expect(aspectsOf(parseBrief(JSON.parse(serializeBrief(b)))!)).toEqual(aspectsOf(b));
    const v4 = { v: 4, items: { 'constraints.budget': { value: 250, status: 'hard' }, 'preferences.taste': { value: { events: [{ style: 'plants', kind: 'pick' }] }, status: 'preference' }, 'animals.kinds': { value: ['freshwater'], status: 'preference' } },
      vision: { environment: 'aquarium', secondaryLikes: [] }, project: { world: 'aquarium', route: 'look', use: { tank: 'required' } } };
    const parsed = parseBrief(JSON.parse(JSON.stringify(v4)))!;
    expect({ ...parsed, v: 4 }).toEqual(v4); expect(parsed.v).toBe(5); expect(aspectsOf(parsed)).toBeUndefined(); expect(routeOf(parsed)).toBe('look');
  });
  it("the route 'explore' is one more way of starting, not a mode: it saves and switching keeps everything", () => {
    expect(ROUTES).toContain('explore');
    const b = setRoute(recordAspect(setItem(emptyBrief(), 'constraints.budget', 300, 'hard'), likeOf(plantedFW[0], ['colors'])), 'explore');
    expect(routeOf(parseBrief(JSON.parse(serializeBrief(b)))!)).toBe('explore');
    const back = setRoute(b, 'look'); expect(back.items).toEqual(b.items);
  });
  it('an old save with no aspects, or a damaged / hostile profile, parses to none without throwing', () => {
    expect(parseAspects(undefined)).toBeUndefined(); expect(parseAspects('x')).toBeUndefined(); expect(parseAspects({ events: 'no' })).toBeUndefined(); expect(parseAspects({ events: [] })).toBeUndefined();
    const hostile = parseAspects({ events: [{ c: 'a', k: 'ban', pos: ['colors:vivid'] }, { c: 'a'.repeat(99), k: 'like', pos: ['colors:vivid'] }, { c: 'b', k: 'like', pos: ['budget:cheap', '<script>', 'colors:vivid'] }, { c: 'c', k: 'pass', neg: [] }, null, 5],
      told: { 'colors:vivid': 1, 'budget:low': 1, 'plants:lush': 7 } });
    expect(hostile).toEqual({ events: [{ c: 'b', k: 'like', pos: ['colors:vivid'] }], told: { 'colors:vivid': 1 } });
    const many = parseAspects({ events: Array.from({ length: ASPECT_EVENTS + 30 }, (_, i) => ({ c: `c${i}`, k: 'like', pos: ['colors:vivid'] })) })!; expect(many.events).toHaveLength(ASPECT_EVENTS);
  });
});
