// DQ2: discovery SEARCH QUALITY through the LIVE `nextPair` (spec 5.1, I3; scenarios 6 pre-constraint, 7, 8, 10, 12 and the 24 measurements).
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { clearPairCache, nextPair, diversify, excludedSpecies, sizeClassOf, strategySchedule, lookOrder, type PoolMetrics, type ScoredRow } from '../src/scene/pairGen';
import { emptyBrief } from '../src/ui/setupBrief';
import { setRange, setStatus } from '../src/scene/brief';
import { applyQuickPrefs, emptyAnswers, readQuickPrefs } from '../src/scene/quickPrefs';
import { lockRoster } from '../src/scene/locks';
import { visuallyDistinct } from '../src/scene/breadth';
import { ARCHETYPES } from '../src/scene/archetypes';
import { stockTier } from '../src/scene/sizeTiers';
import { TANK_MODELS } from '../src/data/tanks';
import { getSpecies } from '../src/data/species';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';
import type { Fish, TankSetup } from '../src/scene/types';

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const session = (o: Partial<DiscoverySession> = {}): DiscoverySession => ({ id: 's1', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'freshwater', comparisons: [], status: 'active', ...o });
const hist = new Map<string, CandidateRecord>();
beforeEach(() => { clearPairCache(); hist.clear(); });
function run(brief = emptyBrief(), o: Parameters<typeof nextPair>[4] = {}, tank = project(), s = session()) {
  let rows: ScoredRow[] = [], m: PoolMetrics | undefined; const notes: string[] = [];
  const r = nextPair({ tank, rev: 1 }, brief, s, id => hist.get(id), { scores: x => { rows = x; }, metrics: x => { m = x; }, budgetMs: 6000, notes, ...o });
  if (r.ok) for (const c of [r.a, r.b]) hist.set(c.id, c);
  return { r, rows, m: m!, notes };
}
const titles = (rows: ScoredRow[]) => rows.map(x => x.title);
const firm = (min: number, max: number) => setStatus(setRange(emptyBrief(), 'constraints.tankGal', { min, max }, 'hard'), 'constraints.tankGal', 'hard');

describe('scenario 7: an unconstrained first pair samples distinct feasible families, not the project\'s own variations', () => {
  it('the pool covers at least 4 looks and 2 size classes, holds at most 2 current-project variations, and the pair looks different at a glance', () => {
    const { r, m, rows } = run(); expect(r.ok).toBe(true); if (!r.ok) return;
    console.log('DQ2 s7', JSON.stringify(m), titles(rows).join(' | '));
    expect(m.families).toBeGreaterThanOrEqual(4); expect(m.sizeClasses.length).toBeGreaterThanOrEqual(2);
    expect(rows.filter(x => /^Freshwater tank:/.test(x.title)).length).toBeLessThanOrEqual(2);      // before DQ2: 10 of 11 were variants of the project
    expect(m.pairDistinct).toBe(true); expect(m.pairDistance!).toBeGreaterThan(0.12);
    expect(visuallyDistinct(r.a.snapshot, r.b.snapshot)).toBe(true);
    expect(m.stop).toBe('coverage'); expect(m.looksTried).toBeGreaterThanOrEqual(3);
  }, 120000);
  it('an avoided look keeps a place among the first looks the pool is built from (ranked lower later, never starved)', () => {
    const fam = ARCHETYPES.find(a => a.water === 'freshwater' && a.env === 'aquarium')!.familyId;
    const prefs = { arch: { layouts: {}, families: { [fam]: -1 } }, prohibit: [], look: {} } as never;
    const idx = lookOrder({ w: {}, prefs } as never, 'freshwater', 'first').findIndex(a => a.familyId === fam);
    expect(idx).toBeGreaterThanOrEqual(0); expect(idx).toBeLessThan(4);                              // inside the first four looks the first pool is built from (DQ2 now generates them all before choosing)
  });
  it('diversify prunes near-duplicates and caps the current-project source; the best of a cluster survives', () => {
    const mk = (id: string, src: 'propose' | 'explore', fam: string, gal: number, sc: number) => ({ rec: { id, snapshot: { layout: { id: fam }, fish: [] }, facts: { gallons: gal }, key: id }, entry: { fp: { familyId: fam } }, tokens: [id], source: src, world: 'w', s: sc });
    const items = [mk('a', 'propose', 'custom', 40, 3), mk('b', 'propose', 'custom', 40, 2), mk('c', 'propose', 'custom', 40, 1), mk('d', 'explore', 'x', 20, 0), mk('e', 'explore', 'y', 20, 0)];
    const d = diversify(items as never[], p => (p as unknown as { s: number }).s, () => false);
    expect(d.kept.length).toBeLessThan(items.length); expect(d.kept.filter(p => (p as { source: string }).source === 'propose').length).toBeLessThanOrEqual(2);
    expect(((d.kept[0] as unknown as { rec: { id: string } }).rec).id).toBe('a');
  });
});

describe('scenario 8: catalogue order does not decide who is represented', () => {
  it('reversing the look catalogue still covers at least 4 families, and the look order is a family round-robin either way', () => {
    const fa = lookOrder({ w: {}, prefs: undefined } as never, 'freshwater', 'first').slice(0, 6).map(x => x.familyId), a = run().m;
    clearPairCache(); ARCHETYPES.reverse();
    try {
      const fb = lookOrder({ w: {}, prefs: undefined } as never, 'freshwater', 'first').slice(0, 6).map(x => x.familyId), b = run().m;
      console.log('DQ2 s8', JSON.stringify({ fa, fb, af: a.families, bf: b.families }));
      expect(new Set(fa).size).toBeGreaterThanOrEqual(4); expect(new Set(fb).size).toBeGreaterThanOrEqual(4);
      expect(a.families).toBeGreaterThanOrEqual(4); expect(b.families).toBeGreaterThanOrEqual(4);
    } finally { ARCHETYPES.reverse(); }
  }, 240000);
  it('an unsure habitat spreads the first looks over worlds; a chosen habitat stays in its world', () => {
    const worlds = (d: 'unsure' | 'freshwater') => new Set(lookOrder({ w: {}, prefs: undefined } as never, d, 'first').slice(0, 6).map(a => `${a.water}/${a.env}`));
    expect(worlds('unsure').size).toBeGreaterThan(1); expect(worlds('freshwater').size).toBe(1);
  });
});

describe('scenario 6 (pre-constraint): hard exclusions are applied BEFORE rosters are built, and the final check is unchanged', () => {
  const b = applyQuickPrefs(emptyBrief(), { ...emptyAnswers(), avoid: ['snails', 'shrimp', 'large-animals'] });
  it('excludedSpecies names the snails, shrimp and large animals, and only a hard prohibition does', () => {
    const ex = excludedSpecies(readQuickPrefs(b)); expect(ex.size).toBeGreaterThan(5);
    for (const id of ex) { const sp = getSpecies(id)!; expect(sp.kind === 'snail' || /shrimp/i.test(sp.name) || sp.tl >= 150).toBe(true); }
    expect(excludedSpecies(readQuickPrefs(emptyBrief())).size).toBe(0);
  });
  it('a roster built with the exclusion never holds an excluded species, while the plain roster may', () => {
    const ex = excludedSpecies(readQuickPrefs(b)), tank = TANK_MODELS.filter(m => m.ratedGal >= 55 && m.ratedGal <= 90)[0];
    let checked = 0, plainHad = 0;
    for (const a of ARCHETYPES.filter(x => x.water === 'freshwater' && x.env === 'aquarium')) {
      for (const t of [0, 1, 2]) { for (const r of stockTier(a, tank, t, ex).roster) { expect(ex.has(r.species)).toBe(false); checked++; } plainHad += stockTier(a, tank, t).roster.filter(r => ex.has(r.species)).length; }
    }
    console.log('DQ2 s6 rosters checked', checked, 'excluded animals the plain roster would have held', plainHad);
    expect(checked).toBeGreaterThan(0); expect(plainHad).toBeGreaterThan(0);                  // the exclusion removes real animals before the roster is assembled
  }, 240000);
  it('through nextPair: nothing excluded is offered, the excluded count is reported, and no candidate was rejected FOR a prohibited animal', () => {
    const { r, rows, m } = run(b); expect(r.ok).toBe(true); if (!r.ok) return;
    const ex = excludedSpecies(readQuickPrefs(b)); console.log('DQ2 s6', JSON.stringify(m));
    expect(m.excludedSpecies).toBe(ex.size); expect(m.rejections.requirement ?? 0).toBe(0); expect(m.preExcluded).toBeGreaterThanOrEqual(0);
    for (const c of [r.a, r.b]) for (const f of c.snapshot.fish) expect(ex.has(f.species)).toBe(false);
    expect(rows.length).toBeGreaterThan(1);
  }, 120000);
});

describe('scenario 10: Explore Something Different broadens soft preference sampling, never locks, scope or hard limits', () => {
  it('a fresh pair keeps a kept species, a held tab and a firm size, and is new', () => {
    const t = project(); lockRoster(t, 'ember', 'atLeast', 5); const b = firm(20, 60);
    const first = run(b, {}, t); expect(first.r.ok).toBe(true); if (!first.r.ok) return;
    const s = session({ championId: first.r.a.id, scope: ['tank', 'animals', 'plants', 'substrate'], freezes: [{ tab: 'hardscape', source: 'working', rev: 1 }] });
    const f = run(b, { next: 'fresh', shownKeys: [first.r.a.key!, first.r.b.key!] }, t, s); console.log('DQ2 s10', JSON.stringify(f.m));
    expect(f.r.ok).toBe(true); if (!f.r.ok) return;
    const hardOf = (S: TankSetup) => JSON.stringify(S.items.filter(i => i.kind !== 'plant' && i.kind !== 'artificial').map(i => i.id).sort());
    for (const c of [f.r.a, f.r.b]) {
      expect(c.snapshot.fish.filter(x => x.species === 'ember').length).toBeGreaterThanOrEqual(5);   // the kept animals
      expect(c.facts.gallons!).toBeGreaterThanOrEqual(20); expect(c.facts.gallons!).toBeLessThanOrEqual(60);   // the firm size
      expect(hardOf(c.snapshot)).toBe(hardOf(t));                                                       // the held hardscape
      expect([first.r.a.key, first.r.b.key]).not.toContain(c.key);
    }
  }, 240000);
});

describe('scenario 12: zero / one / many feasible designs are handled without inventing a pair', () => {
  it('zero: an impossible firm size gives an honest no-solution and no pair', () => {
    const { r } = run(firm(900, 950), { budgetMs: 800 }); expect(r.ok).toBe(false); if (!r.ok) expect(r.conflicts.length).toBeGreaterThan(0);
  }, 120000);
  it('many: more than two candidates and a real pair', () => {
    const { r, m } = run(); expect(r.ok).toBe(true); expect(m.pooled).toBeGreaterThanOrEqual(3);
  }, 120000);
  it('a deadline never produces a silent near-identical pair: a tiny budget gives a distinct pair or the limited-alternatives note', () => {
    const { r, m, notes } = run(emptyBrief(), { budgetMs: 1 });
    console.log('DQ2 tiny budget', JSON.stringify(m), notes.join('|'));
    if (r.ok) expect(m.pairDistinct === true || notes.some(n => /similar designs/.test(n))).toBe(true);
  }, 240000);
});

describe('champion challengers: improve / alternate / occasional out-of-family', () => {
  it('the schedule is deterministic, always offers all three, and out-of-family is occasional in refinement', () => {
    for (const refine of [true, false]) for (let i = 0; i < 4; i++) expect(new Set(strategySchedule(refine, i)).size).toBe(3);
    const lead = (refine: boolean) => [0, 1, 2, 3].map(i => strategySchedule(refine, i)[0]);
    expect(lead(true).filter(x => x === 'out-of-family').length).toBe(1); expect(lead(false).filter(x => x === 'out-of-family').length).toBe(2);
  });
  it('over several champion pairs: each challenger is new, the favourite stays, and the strategies used are reported', () => {
    const t = project(), first0 = run(); if (!first0.r.ok) throw new Error('no first pair'); const first = { r: first0.r };
    const keys = new Set<string>([first.r.a.key!, first.r.b.key!]), used: string[] = [];
    for (let i = 0; i < 4; i++) {
      const s = session({ championId: first.r.a.id, comparisons: Array.from({ length: i }, (_, k) => ({ id: `c${k}`, type: 'champion', aId: first.r.a.id, bId: 'x', outcome: 'A' } as never)) });
      const c = run(emptyBrief(), { next: 'champion', shownKeys: keys as Set<string> }, t, s); if (!c.r.ok) break;
      expect(c.r.a.id).toBe(first.r.a.id); expect(keys.has(c.r.b.key!)).toBe(false); keys.add(c.r.b.key!); used.push(c.m.strategy ?? '-');
      console.log('DQ2 champion', i, c.m.strategy, `${c.m.ms}ms`, c.r.b.facts.title, c.r.b.facts.gallons);
    }
    expect(used.length).toBeGreaterThan(0); expect(used.every(u => ['improve', 'alternate', 'out-of-family'].includes(u))).toBe(true);
  }, 300000);
});

describe('misc', () => { it('size classes', () => { expect([5, 20, 55, 100, 300].map(sizeClassOf)).toEqual(['XS', 'S', 'M', 'L', 'XL']); }); });
