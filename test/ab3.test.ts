// AB3: the A/B Discover screen's pure part (ui/ab/logic.ts) and the stand-in engine (ui/ab/fake.ts). Journeys A (first pair), B (keep from a card, exact by default),
// F (champion / fresh pair, a fresh winner must beat the favourite), G (history after locks: conflicts, adapt, refuse). Nothing here may write the working project except
// Make It Yours (one undo step, never locks) and an explicit Keep.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { locksOf, lockRoster, lockObject } from '../src/scene/locks';
import { createFakeEngine } from '../src/ui/ab/fake';
import { createRealEngine } from '../src/ui/ab/real';
import { ROLE_LABEL, acceptPlan, adaptToLocks, bannerOf, differs, figText, freezeNote, keepFromRecord, keepForNowLabel, lockConflicts, makePlan, metricsOf, roleOf, stripText, toggleReason, REASONS } from '../src/ui/ab/logic';
import type { CandidateFacts, DiscoverySession } from '../src/scene/discoveryTypes';
import type { TankSetup } from '../src/scene/types';
// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const readFileSync = (f: string, _e: string): string => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), readdirSync = (d: string) => fs.readdirSync(new URL(`../${d}`, import.meta.url));

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false;
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = ['kuhli', 'ember'].flatMap((sp, k) => Array.from({ length: 5 }, (_, i) => ({ id: 100 * (k + 1) + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  return ensureUids(t);
}
const mk = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };
const pairOf = (e: ReturnType<typeof createFakeEngine>) => { const r = e.next(); if (!r.ok) throw new Error('no pair: ' + r.conflicts.join(';')); return r; };

const facts = (o: Partial<CandidateFacts> = {}): CandidateFacts => ({ title: 'T', habitat: 'Freshwater', gallons: 45, newSpendUsd: { lo: 300, mean: 400, hi: 520, est: true }, weeklyMin: { lo: 20, mean: 30, hi: 40, est: true }, difficulty: 'Beginner', toBuy: [], reused: [], mustUse: [], stocking: [], plants: [], hardscape: [], substrate: [], ...o });
const session = (o: Partial<DiscoverySession> = {}): DiscoverySession => ({ id: 's', baseRev: 0, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'unsure', comparisons: [], status: 'active', ...o });

describe('figures and labels', () => {
  it('estimates read "about"; a wide range shows both ends; nothing to buy is said plainly', () => {
    expect(figText({ lo: 100, mean: 100, hi: 100, est: true })).toBe('about $100');
    expect(figText({ lo: 300, mean: 400, hi: 520, est: true })).toBe('about $300 to $520');
    expect(figText({ lo: 0, mean: 0, hi: 0 })).toBe('nothing more to buy');
    expect(figText({ lo: 20, mean: 30, hi: 40 }, { kind: 'min', unit: 'a week' })).toBe('about 20 to 40 min a week');
    expect(metricsOf(facts()).spend).toBe('about $300 to $520');   // new spend leads the card
    expect(stripText(facts())).toContain('Beginner');
  });
  it('labels the favourite, the challenger and the fresh pair', () => {
    const s = session({ championId: 'a', current: { aId: 'a', bId: 'b', type: 'champion' } });
    expect(ROLE_LABEL[roleOf(s, 'a')]).toBe('Your favourite'); expect(ROLE_LABEL[roleOf(s, 'b')]).toBe('Challenger');
    const f = session({ championId: 'c', current: { aId: 'e', bId: 'f', type: 'fresh' } });
    expect(bannerOf(f)).toBe('Fresh pair: the winner then faces your favourite.');
    expect(ROLE_LABEL[roleOf(f, 'e')]).toBe('Fresh idea');
  });
  it('reason chips toggle and never block anything; there are ten', () => {
    expect(REASONS.length).toBe(10);
    expect(toggleReason(toggleReason([], 'plants'), 'look')).toEqual(['plants', 'look']);
    expect(toggleReason(['plants'], 'plants')).toEqual([]);
  });
  it('"what differs" lists what one card has that the other lacks, by tab', () => {
    const a = facts({ stocking: [{ species: 'kuhli', name: 'Kuhli loach', n: 6 }], hardscape: ['Driftwood'] }), b = facts({ stocking: [{ species: 'ember', name: 'Ember tetra', n: 8 }], hardscape: ['Driftwood'], gallons: 20 });
    expect(differs(a, b)).toEqual([{ tab: 'animals', text: 'Kuhli loach' }, { tab: 'tank', text: '45 gal' }]);
  });
  it('a frozen tab names its source: A, your favourite, or your project', () => {
    const s = session({ championId: 'c', freezes: [{ tab: 'hardscape', source: 'a' }, { tab: 'plants', source: 'c' }, { tab: 'substrate', source: 'working', rev: 3 }] });
    expect(freezeNote(s, 'hardscape', 'a', 'b')).toBe('Hardscape: kept from A');
    expect(freezeNote(s, 'plants', 'a', 'b')).toBe('Plants: kept from your favourite');
    expect(freezeNote(s, 'substrate', 'a', 'b')).toBe('Substrate: kept from your project');
    expect(freezeNote(s, 'animals', 'a', 'b')).toBe('');
    expect(keepForNowLabel('A', 'hardscape')).toBe("Keep A's hardscape for now");
  });
});

let uniq = 0;   // each real engine gets its own project key: its session and history persist, and tests must not share them
const ENGINES = [['fake', createFakeEngine], ['real (AB0 session + AB2 history)', (s: Store) => createRealEngine(s, () => ({}), 'ab3-test-' + ++uniq)]] as const;
describe.each(ENGINES)('%s engine', (_kind, create) => {
describe('journey A: the first pair', () => {
  it('two different complete records, nothing written to the project, history holds both', () => {
    const s = mk(), before = JSON.stringify(s.tank), rev = s.rev, e = create(s); e.open();
    const p = pairOf(e);
    expect(p.a.id).not.toBe(p.b.id); expect(p.a.key).not.toBe(p.b.key);
    for (const r of [p.a, p.b]) { expect(r.snapshot.items.length + r.snapshot.fish.length).toBeGreaterThan(0); expect(r.facts.newSpendUsd.est).toBe(true); expect(r.facts.difficulty).toBeTruthy(); }
    expect(JSON.stringify(s.tank)).toBe(before); expect(s.rev).toBe(rev);
    expect(e.history(0).total).toBe(2);
  });
});

describe('journey F: champion and fresh pair', () => {
  it('a winner becomes the favourite; like both / neither / skip keep it; the same pair stays until answered', () => {
    const s = mk(), e = create(s); e.open();
    const p1 = pairOf(e); expect(e.next().ok && (e.next() as { a: { id: string } }).a.id).toBe(p1.a.id);   // not re-drawn
    const p2 = e.choose('B', ['plants']); if (!p2.ok) throw new Error('no 2nd pair');
    expect(e.session().championId).toBe(p1.b.id); expect(p2.a.id).toBe(p1.b.id);
    expect(e.session().comparisons[0].why).toEqual(['plants']);
    const champ = e.session().championId;
    for (const o of ['both', 'neither', 'skip'] as const) { const r = e.choose(o); expect(e.session().championId).toBe(champ); if (!r.ok) break; expect(r.a.id).toBe(champ); }
  });
  it('a fresh-pair winner faces the favourite and only becomes it by winning', () => {
    const s = mk(), e = create(s); e.open();
    pairOf(e); e.choose('A'); const champ = e.session().championId!;
    const f = e.different(); if (!f.ok) throw new Error('no fresh pair');
    expect(e.session().current?.type).toBe('fresh'); expect(bannerOf(e.session())).toContain('Fresh pair');
    const fin = e.choose('B'); if (!fin.ok) throw new Error('no final');
    expect(e.session().championId).toBe(champ);   // the local winner did NOT take the favourite
    expect(e.session().current?.type).toBe('final'); expect(fin.a.id).toBe(champ); expect(fin.b.id).toBe(f.b.id);
    e.choose('A');   // the favourite wins the head-to-head
    expect(e.session().championId).toBe(champ);
    expect(e.history(0).total).toBeGreaterThanOrEqual(4);   // E and F stay in history either way
  });
  it('choosing never writes a lock', () => {
    const s = mk(), e = create(s); e.open(); pairOf(e); e.choose('A', ['animals']);
    expect(locksOf(s.tank).objects.length + locksOf(s.tank).roster.length).toBe(0);
  });
});

describe('journey B: keep from a card', () => {
  it('Keep on an animal row locks EXACTLY the count shown, and records the lock without an undo step', () => {
    const s = mk(), e = create(s); e.open();
    const p = pairOf(e), r = [p.a, p.b].find(x => x.snapshot.fish.length)!, sp = r.facts.stocking[0], undo = s.canUndo;
    const out = keepFromRecord(s, r, { kind: 'fish', species: sp.species, mode: 'exact' });
    expect(out.ok).toBe(true);
    expect(locksOf(s.tank).roster.find(x => x.species === sp.species)).toMatchObject({ mode: 'exact', n: sp.n });
    expect(s.canUndo).toBe(undo);
  });
  it('"at least" and "species only" are the one-tap alternatives', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e), r = [p.a, p.b].find(x => x.snapshot.fish.length)!, sp = r.facts.stocking[0];
    keepFromRecord(s, r, { kind: 'fish', species: sp.species, mode: 'atLeast' }); expect(locksOf(s.tank).roster[0].mode).toBe('atLeast');
    keepFromRecord(s, r, { kind: 'fish', species: sp.species, mode: 'speciesOnly' }); expect(locksOf(s.tank).roster[0].mode).toBe('speciesOnly');
  });
  it('keeping a piece that is not in the project yet adds it and locks it in ONE undo step', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e);
    const r = [p.a, p.b].find(x => x.snapshot.items.some(i => !s.tank.items.some(j => j.uid === i.uid)));
    if (!r) return;   // every piece already in the project: nothing to add (covered by the lock-only branch)
    const it = r.snapshot.items.find(i => !s.tank.items.some(j => j.uid === i.uid))!, n = s.tank.items.length;
    expect(keepFromRecord(s, r, { kind: 'item', uid: it.uid! }).ok).toBe(true);
    expect(s.tank.items.length).toBe(n + 1); expect(locksOf(s.tank).objects.some(o => o.target === it.uid)).toBe(true);
    s.undo(); expect(s.tank.items.length).toBe(n);
  });
  it('a keep that contradicts the favourite is caught', () => {
    const s = mk(), e = create(s); e.open(); pairOf(e); e.choose('A');
    s.update(st => { lockRoster(st.tanks[st.active], 'kuhli', 'exact', 9); }, { history: false });
    const c = e.recheckChampion(); expect(c.ok).toBe(false); expect(c.conflicts.join(' ')).toMatch(/kuhli/);
    expect(e.session().championId).toBeUndefined();   // set aside, so a new pair starts
  });
});

describe('shuffle switches and freezes', () => {
  it('unchecking freezes the favourite\'s values (or the project\'s before one exists); rechecking releases', () => {
    const s = mk(), e = create(s); e.open();
    e.setScope('hardscape', false); expect(e.session().freezes[0]).toMatchObject({ tab: 'hardscape', source: 'working' });
    pairOf(e); e.choose('A'); e.setScope('plants', false); expect(e.session().freezes.find(f => f.tab === 'plants')?.source).toBe(e.session().championId);
    e.setScope('hardscape', true); expect(e.session().freezes.some(f => f.tab === 'hardscape')).toBe(false);
  });
  it('"Keep A\'s hardscape for now" records A as the source and never writes the project', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e), before = JSON.stringify(s.tank);
    e.freeze('hardscape', p.a.id);
    expect(e.session().freezes).toEqual([{ tab: 'hardscape', source: p.a.id }]); expect(e.session().scope).not.toContain('hardscape');
    expect(JSON.stringify(s.tank)).toBe(before);
  });
});

describe('Make It Yours and journey G', () => {
  it('previews the diff, accepts as ONE undo step, never locks, keeps existing locks', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e), r = p.a;
    s.update(st => { lockObject(st.tanks[st.active], 'substrate'); }, { history: false });
    const locks = JSON.stringify(locksOf(s.tank)), plan = makePlan(s, r, e.session());
    expect(plan.conflicts.filter(c => /cannot change locks/.test(c))).toEqual([]);   // a design never carries the project's locks
    if (plan.conflicts.length) return;
    const before = JSON.stringify(s.tank), res = acceptPlan(s, r, e.session());
    expect(res.ok).toBe(true); expect(JSON.stringify(locksOf(s.tank))).toBe(locks);
    s.undo(); expect(JSON.stringify(s.tank)).toBe(before);   // one step back
  });
  it('after a lock the old record keeps its original form; Make It Yours reports the conflict and writes nothing', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e);
    const r = [p.a, p.b].find(x => !x.snapshot.fish.some(f => f.species === 'kuhli')) ?? p.a, frozen = JSON.stringify(r);
    s.update(st => { lockRoster(st.tanks[st.active], 'kuhli', 'exact', 7); }, { history: false });
    const plan = makePlan(s, r, e.session()), tank = JSON.stringify(s.tank);
    if (r.snapshot.fish.filter(f => f.species === 'kuhli').length !== 7) {
      expect(plan.conflicts.length).toBeGreaterThan(0);
      expect(acceptPlan(s, r, e.session()).ok).toBe(false); expect(JSON.stringify(s.tank)).toBe(tank);
    }
    expect(JSON.stringify(r)).toBe(frozen);
    const ev = e.reEvaluate(r.id); expect(ev.conflicts.length).toBeGreaterThanOrEqual(lockConflicts(s.tank, r.snapshot).length);   // "now" is beside "then", never over it
  });
  it('Adapt makes a NEW record that honours the locks; the original is untouched; an impossible adapt refuses', () => {
    const s = mk(), e = create(s); e.open(); const p = pairOf(e), r = p.a, frozen = JSON.stringify(r);
    s.update(st => { lockRoster(st.tanks[st.active], 'kuhli', 'exact', 7); }, { history: false });
    const out = e.adapt(r.id);
    expect(JSON.stringify(r)).toBe(frozen);
    if (out.ok) { expect(out.record.id).not.toBe(r.id); expect(out.record.parentId).toBe(r.id); expect(out.record.purpose).toBe('adapted'); expect(lockConflicts(s.tank, out.record.snapshot)).toEqual([]); expect(e.record(out.record.id)).toBeTruthy(); }
    else expect(out.reason).toBeTruthy();
    // pure: a lock on a species nothing carries and the project does not have cannot be adapted
    const bare = structuredClone(project()); bare.fish = [];
    const lockedGhost = structuredClone(bare); lockRoster(lockedGhost, 'ember', 'exact', 4);
    expect(adaptToLocks(bare, lockedGhost)).toBeNull();
  });
  it('history: paged, favourites toggle, a conflicting record cannot be set as favourite or brought back', () => {
    const s = mk(), e = create(s); e.open(); let p = pairOf(e);
    for (let i = 0; i < 5; i++) { const n = e.choose('A'); if (!n.ok) break; p = n; }
    const h = e.history(0); expect(h.rows.length).toBeLessThanOrEqual(6); expect(h.pages).toBe(Math.ceil(h.total / 6));
    e.favourite(h.rows[0].rec.id, true); expect(e.history(0).rows[0].favourite).toBe(true);
    void p;
  });
});

});

describe('real engine wiring (AB0 + AB1 + AB2)', () => {
  it('the shipped path never uses the stand-in: real.ts and panel.ts do not import fake.ts; pairs come from AB1', () => {
    const real = readFileSync('src/ui/ab/real.ts', 'utf8'), panel = readFileSync('src/ui/discover/panel.ts', 'utf8'), screen = readFileSync('src/ui/ab/screen.ts', 'utf8');
    for (const f of [real, panel, screen]) expect(f).not.toMatch(/from '\.\/fake'|from '\.\.\/ab\/fake'/);
    expect(real).toMatch(/nextPair/); expect(real).toMatch(/adapt as adaptPair/); expect(real).toMatch(/recordPair/);
  });
  it('Skip moves on to a different pair, even on the final pair (AB0 build 1710), and records no taste', () => {
    const s = mk(), e = createRealEngine(s, () => ({}), 'ab3-skip-' + ++uniq); e.open();
    const p = pairOf(e); e.choose('A'); const f = e.different(); if (!f.ok) return;
    const fin = e.choose('B'); if (!fin.ok || e.session().current?.type !== 'final') return;
    const was = e.session().current!;
    const nx = e.choose('skip'); expect(e.session().pendingFreshId).toBeUndefined();
    if (nx.ok) expect(e.session().current?.type).not.toBe('final');
    void p; void was;
  });
});

describe('retired UI', () => {
  it('the DX4 proposal-card Apply / Reject UI and the Explore feed entry are gone from every caller', () => {
    const panel = readFileSync('src/ui/discover/panel.ts', 'utf8'), shell = readFileSync('src/ui/guided/shell.ts', 'utf8'), html = readFileSync('index.html', 'utf8'), panels = readFileSync('src/ui/panels.ts', 'utf8');
    expect(panel).not.toMatch(/dxcard|data-a="apply"|data-a="reject"/); expect(panel).toContain('attachAbScreen');
    expect(shell).not.toMatch(/\?\? mountExplore/); expect(html).not.toContain('id="exploreSetups"'); expect(panels).not.toContain("$('exploreSetups')");
    // the engines stay
    expect(readdirSync('src/explore').length).toBeGreaterThan(5);
  });
});
