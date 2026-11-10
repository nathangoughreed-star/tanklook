// QP1 (2026-11-10): archetype catalogue, 3-state preference, hard "No live plants". Spec scenarios 1-6 and 9 at model level (research/design/quick-prefs-archetypes-handoff-2026-11-10.md section 6).
import { describe, it, expect } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { isBuildable } from '../src/explore/pool';
import { QUICK_ARCHETYPES, archetypesFor, archetypeByKey, UNSURE_SAMPLE, LIVE_ONLY_LAYOUTS } from '../src/scene/quickArchetypes';
import { emptyBrief, getItem, projectExtras, setProjectExtras } from '../src/scene/brief';
import { setDirection } from '../src/scene/project';
import { aspectsOf } from '../src/explore/aspects';
import { applyQuickPrefs, answersOf, readQuickPrefs, passesHard, compromiseNote, emptyAnswers, migrationNote, type QuickAnswers } from '../src/scene/quickPrefs';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { IN } from '../src/scene/physics';
import { ensureUids } from '../src/scene/uid';

const A = (x: Partial<QuickAnswers>): QuickAnswers => ({ ...emptyAnswers(), ...x });
const fresh = (d: 'freshwater' | 'saltwater' | 'terrarium' | 'paludarium' = 'freshwater') => setDirection(emptyBrief(), d);

describe('QP1 catalogue', () => {
  it('every card maps only to buildable Explore layouts of its own habitat; keys, images and counts are consistent', () => {
    const layouts = new Map(ARCHETYPES.map(a => [a.id, a]));
    for (const c of QUICK_ARCHETYPES) {
      expect(c.key).toBe(`${c.habitat}-${c.id}`); expect(c.image).toBe(`public/art/quick/${c.key}.webp`); expect(c.layouts.length).toBeGreaterThan(0);
      for (const l of c.layouts) { const a = layouts.get(l); expect(a, l).toBeTruthy(); expect(isBuildable(a!), l).toBe(true); expect(a!.env === 'aquarium' ? (a!.water === 'saltwater' ? 'saltwater' : 'freshwater') : a!.env).toBe(c.habitat); }
    }
    expect(new Set(QUICK_ARCHETYPES.map(c => c.key)).size).toBe(QUICK_ARCHETYPES.length);
    const n = (h: string) => QUICK_ARCHETYPES.filter(c => c.habitat === h).length;
    expect([n('freshwater'), n('saltwater')].every(k => k >= 4 && k <= 6)).toBe(true); expect(n('terrarium')).toBeGreaterThanOrEqual(3); expect(n('paludarium')).toBeGreaterThanOrEqual(3);
  });
  it('scenario 9: unsure shows a small mixed sample, not the union of the habitats', () => {
    const u = archetypesFor('unsure'); expect(u.length).toBe(UNSURE_SAMPLE.length); expect(u.length).toBeLessThanOrEqual(4); expect(new Set(u.map(c => c.habitat)).size).toBeGreaterThan(1);
  });
  it('live-only layouts are exactly the live-planted looks', () => { expect(LIVE_ONLY_LAYOUTS.has('dutch-garden')).toBe(true); expect(LIVE_ONLY_LAYOUTS.has('iwagumi-stone-garden')).toBe(false); });
});

describe('QP1 preference model (scenarios 1-3, 6)', () => {
  it('1: unselected writes nothing and infers nothing', () => {
    const b = fresh(); expect(applyQuickPrefs(b, emptyAnswers())).toEqual(b); const q = readQuickPrefs(b); expect(q.arch.interested).toEqual([]); expect(q.arch.avoid).toEqual([]); expect(q.prohibit).toEqual([]);
  });
  it('2: two Interested cards both rank, neither is a lock or a hard item', () => {
    const b = applyQuickPrefs(fresh(), A({ arch: { 'freshwater-jungle': 'interested', 'freshwater-blackwater': 'interested' } })), q = readQuickPrefs(b);
    expect(q.arch.layouts['overgrown-jungle']).toBe(1); expect(q.arch.layouts['blackwater-creek']).toBe(1);
    expect(Object.keys(b.items)).toEqual(['preferences.aspects']); expect(getItem(b, 'preferences.aspects')!.status).toBe('preference'); expect(q.prohibit).toEqual([]);
    expect(answersOf(b).arch).toEqual({ 'freshwater-jungle': 'interested', 'freshwater-blackwater': 'interested' });
  });
  it('3: Avoid downranks (-1) but never hard-bans: every candidate still passes', () => {
    const b = applyQuickPrefs(fresh(), A({ arch: { 'freshwater-iwagumi': 'avoid' } })), q = readQuickPrefs(b);
    expect(q.arch.layouts['iwagumi-stone-garden']).toBe(-1); expect(aspectsOf(b)!.told!['layout:iwagumi-stone-garden']).toBe(-1); expect(q.prohibit).toEqual([]);
    expect(passesHard(q, { plants: 'live', livePlants: 20, gallons: 40, species: [] })).toBe(true);
  });
  it('6: an Interested card is a told weight (a ranking), never a hard item or a lock, so later A/B picks can outweigh it', () => {
    const b = applyQuickPrefs(fresh(), A({ arch: { 'freshwater-jungle': 'interested' } }));
    expect(Object.values(b.items).every(i => i.status !== 'hard')).toBe(true); expect(JSON.stringify(projectExtras(b))).not.toMatch(/lock/i);
  });
  it('an explicit card beats an inference: where an Avoid and an Interested card share a told key, Interested wins', () => {
    const b = applyQuickPrefs(fresh(), A({ arch: { 'freshwater-jungle': 'interested', 'freshwater-dutch': 'avoid', 'freshwater-iwagumi': 'avoid' } }));
    expect(aspectsOf(b)!.told!['plants:lush']).toBe(1); expect(aspectsOf(b)!.told!['colors:vivid']).toBe(-1);
  });
});

describe('QP1 No live plants (scenarios 4, 5)', () => {
  it('4: a hard exclusion: prohibit + brief item; any living plant fails, artificial passes, an unknown fact never filters', () => {
    const b = applyQuickPrefs(fresh(), A({ avoid: ['no-live-plants'] })), q = readQuickPrefs(b);
    expect(q.prohibit).toEqual(['no-live-plants']); expect(getItem(b, 'appearance.plantMode')).toMatchObject({ value: 'artificial', status: 'hard' });
    expect(passesHard(q, { livePlants: 1 })).toBe(false); expect(passesHard(q, { livePlants: 0, plants: 'artificial' })).toBe(true); expect(passesHard(q, { plants: 'mixed' })).toBe(false); expect(passesHard(q, {})).toBe(true);
  });
  it('5: planted card Interested + No live plants: the exclusion stays, an honest note is data with a flag and live-free alternatives', () => {
    const q = readQuickPrefs(applyQuickPrefs(fresh(), A({ arch: { 'freshwater-dutch': 'interested' }, avoid: ['no-live-plants'] })));
    expect(q.prohibit).toContain('no-live-plants'); const n = compromiseNote(q);
    expect(n.flag).toBe(true); expect(n.lost).toEqual(['freshwater-dutch']); expect(n.text).toMatch(/artificial plants are not passed off/i); expect(n.alternatives.length).toBeGreaterThan(0);
    for (const k of n.alternatives) expect(archetypeByKey(k)!.needsLive).toBe(false);
    expect(compromiseNote(readQuickPrefs(applyQuickPrefs(fresh(), A({ arch: { 'freshwater-iwagumi': 'interested' }, avoid: ['no-live-plants'] })))).flag).toBe(false);
    expect(compromiseNote(readQuickPrefs(applyQuickPrefs(fresh(), A({ arch: { 'freshwater-dutch': 'interested' } })))).flag).toBe(false);
  });
  it('clearing the exclusion takes its brief item back', () => {
    let b = applyQuickPrefs(fresh(), A({ avoid: ['no-live-plants'] })); b = applyQuickPrefs(b, emptyAnswers()); expect(b).toEqual(fresh());
  });
});

describe('QP1 migration of saved Look / Live plants answers', () => {
  const old = (quick: Record<string, unknown>) => setProjectExtras(fresh(), { ...projectExtras(fresh()), quick: quick as never });
  it('chips become Interested cards that pull the same way; Stylized has no card and is reported, never silently dropped', () => {
    const b = old({ look: ['lush', 'stylized'], plants: 'not' }), a = answersOf(b);
    expect(a.arch['freshwater-jungle']).toBe('interested'); expect(a.avoid).toContain('no-live-plants'); expect(migrationNote(b)).toMatch(/stylized/);
  });
  it('the next write stores the cards and drops the old fields', () => {
    let b = old({ look: ['lush'] }); b = applyQuickPrefs(b, answersOf(b)); const q = projectExtras(b).quick!; expect(q.look).toBeUndefined(); expect(q.arch).toBeTruthy();
  });
});

describe('QP1 generator (scenarios 4, 5 and mid-session changes)', () => {
  const project = () => { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; regenerate(t, 'all', 1); return ensureUids(t); };
  const pair = (br: ReturnType<typeof fresh>) => nextPair({ tank: project(), rev: 1 }, br, startSession(1, ['tank', 'animals', 'plants', 'hardscape', 'substrate'], 'freshwater', 's'), () => undefined, { next: 'first' });
  it('with No live plants every proposed design holds zero living plants, even with Dutch Interested, and none is a live-only layout', () => {
    clearPairCache(); const r = pair(applyQuickPrefs(fresh(), A({ arch: { 'freshwater-dutch': 'interested' }, avoid: ['no-live-plants'] })));
    expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) { expect(c.snapshot.items.filter(i => i.kind === 'plant').length).toBe(0); expect(LIVE_ONLY_LAYOUTS.has(c.snapshot.layout.id)).toBe(false); }
  }, 200000);
  it('a mid-session change applies to the next pair without clearing the cache by hand; the earlier pair is an untouched record', () => {
    clearPairCache(); const r1 = pair(fresh()); expect(r1.ok).toBe(true); if (!r1.ok) return;
    const keep = JSON.stringify(r1.a.snapshot), r2 = pair(applyQuickPrefs(fresh(), A({ avoid: ['no-live-plants'] })));
    expect(r2.ok).toBe(true); if (!r2.ok) return;
    for (const c of [r2.a, r2.b]) expect(c.snapshot.items.filter(i => i.kind === 'plant').length).toBe(0);
    expect(JSON.stringify(r1.a.snapshot)).toBe(keep);
  }, 200000);
});
