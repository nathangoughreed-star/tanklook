// DX5: one project, no silent wipes. Every former wipe path either goes through applyProposal or asks first (spy on store.replace); locks survive regenerate;
// journey D (locked expert build, unlock one detail, the rest intact) and journey E (three Discovery sessions on one project); the coach skips what the project knows.
import { describe, expect, it, vi } from 'vitest';
import { defaultScene, defaultSetup, emptyScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { layerOf } from '../src/scene/items';
import { lockObject, lockRoster, unlockObject } from '../src/scene/locks';
import { applyProposal, previewProposal } from '../src/scene/proposal';
import { propose } from '../src/scene/discover';
import { emptyBrief } from '../src/ui/setupBrief';
import { adoptTank, confirmStart, hasLocks, needsAsk, regenerateKeepingLocks, setProjectAsker, startProject } from '../src/ui/projectStart';
import { makeItMine } from '../src/ui/suggest';
import { createCoach, type CoachHost, type CoachCard } from '../src/ui/coach/runner';
import { GUIDE_STEPS, answered, type CoachCtx, type CoachStep } from '../src/ui/coach/steps';
import { suggestSetups } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';
import type { Fish, TankSetup } from '../src/scene/types';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const readFileSync = (f: string, enc: 'utf8') => fs.readFileSync(new URL(`../${f}`, import.meta.url), enc) as string;
const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, stage: 1 } as unknown as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false;
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = [...fishOf('kuhli', 7, 101), ...fishOf('ember', 5, 201)];
  return ensureUids(t);
}
const storeOf = (t: TankSetup) => new Store({ ...defaultScene(), tanks: [t] });
const B = emptyBrief();
const asker = (answer: boolean) => { const fn = vi.fn(() => answer); setProjectAsker(fn); return fn; };

describe('the wipe points ask first (or are proposals)', () => {
  it('a pristine, unsaved, lock-free project is replaced without a question', async () => {
    const st = new Store(emptyScene()), ask = asker(false), spy = vi.spyOn(st, 'replace');
    expect(await startProject(st, emptyScene())).toBe(true);
    expect(ask).not.toHaveBeenCalled(); expect(spy).toHaveBeenCalledTimes(1);
  });
  it('unsaved work: Cancel leaves the project alone, Replace goes ahead', async () => {
    const st = storeOf(project()), spy = vi.spyOn(st, 'replace'), snap = JSON.stringify(st.scene);
    let ask = asker(false);
    expect(await startProject(st, emptyScene())).toBe(false);
    expect(ask).toHaveBeenCalledTimes(1); expect(spy).not.toHaveBeenCalled(); expect(JSON.stringify(st.scene)).toBe(snap);
    ask = asker(true);
    expect(await startProject(st, emptyScene())).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('locks alone make the project worth asking about; a copy saved exactly as it stands does not', async () => {
    const t = structuredClone(defaultSetup()); t.locks = lockObject(t, 'tank');
    const sc = { ...defaultScene(), tanks: [t] };
    expect(hasLocks(sc)).toBe(true); expect(needsAsk(sc)).toBe(true);
    expect(needsAsk(sc, JSON.stringify(sc))).toBe(false);
    const ask = asker(false);
    expect(await confirmStart(sc)).toBe(false); expect(ask).toHaveBeenCalled();
  });
  it('no ask hook wired = no replace (the safe default)', async () => {
    setProjectAsker(undefined);
    const st = storeOf(project()), spy = vi.spyOn(st, 'replace');
    expect(await startProject(st, emptyScene())).toBe(false); expect(spy).not.toHaveBeenCalled();
  });
  it('source scan: every store.replace in the UI sits behind a guard', () => {
    const read = (f: string) => readFileSync(f, 'utf8').split('\n');
    const panels = read('src/ui/panels.ts');
    panels.forEach((ln: string, i: number) => {
      if (!/store\.replace\(/.test(ln) || /^\s*\/\//.test(ln)) return;
      const near = panels.slice(Math.max(0, i - 30), i + 1).join('\n');
      expect(/confirmStart\(|startProject\(|welcomeFirst/.test(near), `panels.ts:${i + 1}`).toBe(true);
    });
    const sp = read('src/ui/stockPlan.ts'); const at = sp.findIndex((l: string) => /store\.replace\(/.test(l) && !/^\s*\/\//.test(l));
    expect(sp.slice(Math.max(0, at - 40), at).join('\n')).toMatch(/hasLocks\(/);
    for (const f of ['buildPick', 'suggest', 'scapePick', 'tierBox', 'infeasibleCard', 'discovery/screens', 'explore/explore'])
      expect(read(`src/ui/${f}.ts`)  .filter((l: string) => /store\.replace\(/.test(l) && !/^\s*\/\//.test(l)), f).toEqual([]);
    // no preview writes the live store any more
    for (const f of ['buildPick', 'suggest', 'scapePick']) expect(readFileSync(`src/ui/${f}.ts`, 'utf8')).not.toMatch(/putTank\(s\.tanks|rollback\(/);
    expect(readFileSync('src/ui/panels.ts', 'utf8')).not.toMatch(/put\(T\); return viewer\.thumbnail/);
  });
});

describe('make it mine / build picks are proposals', () => {
  const r = suggestSetups({ constraints: {}, animals: [{ species: 'kuhli', n: 5 }] }, defaultProfile(), 'in', Date.parse('2026-10-30'));
  const p = r.proposals[0];
  it('applies as ONE undo step without replacing the scene and without adding a lock', () => {
    expect(p).toBeTruthy();
    const st = new Store(defaultScene()), spy = vi.spyOn(st, 'replace'), was = JSON.stringify(st.tank.locks ?? null), depth = st.mark;
    const out = makeItMine(st, p);
    expect('refused' in out).toBe(false);
    expect(spy).not.toHaveBeenCalled(); expect(st.mark).toBe(depth + 1); expect(JSON.stringify(st.tank.locks ?? null)).toBe(was);
    st.undo(); expect(st.mark).toBe(depth);
  });
  it('a locked roster that the option would change refuses it; nothing moves', () => {
    const t = project(); t.locks = lockRoster(t, 'ember', 'exact', 5);
    const st = storeOf(t), snap = JSON.stringify(st.scene), rev = st.rev;
    const out = makeItMine(st, p);
    expect('refused' in out).toBe(true);
    expect(JSON.stringify(st.scene)).toBe(snap); expect(st.rev).toBe(rev);
  });
  it('adoptTank refuses a change to a locked tank size', () => {
    const t = project(); t.locks = lockObject(t, 'tank', ['dimensions']);
    const st = storeOf(t), next = structuredClone(st.tank); next.tank = { ...next.tank, L: next.tank.L + 10 * IN };
    const res = adoptTank(st, next, 'bigger');
    expect(res.ok).toBe(false);
    expect(st.tank.tank.L).toBe(36 * IN);
    expect(adoptTank(st, structuredClone(st.tank), 'same').ok).toBe(true);
  });
});

describe('regenerate respects locks', () => {
  it("'all' keeps a locked piece, a locked species group and the locked tank; the rest is redrawn", () => {
    const t = project(); t.layout.seed = 12345;
    const piece = t.items.find(i => layerOf(i) === 'hard')!, pos = { x: piece.x, depth: piece.depth };
    t.locks = lockObject(t, piece.uid!); t.locks = lockRoster(t, 'kuhli', 'exact', 7); t.locks = lockObject(t, 'tank');
    const s = structuredClone(t);
    s.layout = { ...s.layout, seed: 999, plantSeed: 998 };
    regenerateKeepingLocks(s, 'all', 1000);
    const kept = s.items.find(i => i.uid === piece.uid)!;
    expect(kept && { x: kept.x, depth: kept.depth }).toEqual(pos);
    expect(s.fish.filter(f => f.species === 'kuhli')).toHaveLength(7);
    expect(s.tank).toEqual(t.tank); expect(s.locks).toEqual(t.locks);
  });
  it('without locks it is plain regenerate', () => {
    const a = project(), b = structuredClone(a);
    regenerate(a, 'plant', 1000); regenerateKeepingLocks(b, 'plant', 1000);
    expect(JSON.stringify(b.items)).toBe(JSON.stringify(a.items));
  });
});

describe('journey D: a locked expert build, one detail unlocked', () => {
  it('only the unlocked piece may change; everything else stays', () => {
    const t = project();
    for (const i of t.items) t.locks = lockObject(t, i.uid!);
    for (const f of t.fish) t.locks = lockObject(t, f.uid!);
    t.locks = lockObject(t, 'tank'); t.locks = lockObject(t, 'substrate');
    const free = t.items.find(i => layerOf(i) === 'hard')!;
    t.locks = unlockObject(t, free.uid!);
    const st = storeOf(t), snap = JSON.parse(JSON.stringify(st.tank)) as TankSetup;
    const d = propose(st, B, { scope: ['hardscape', 'plants', 'tank', 'substrate'], objective: 'explore' }, 3);
    for (const pr of d.proposals) {
      const a = previewProposal(st.tank, pr);
      for (const i of snap.items) if (i.uid !== free.uid) expect(a.items.find(x => x.uid === i.uid), 'locked piece intact').toEqual(i);
      expect(a.fish).toEqual(snap.fish); expect(a.tank).toEqual(snap.tank); expect(a.substrate).toEqual(snap.substrate);
    }
  });
});

describe('journey E: three sessions on one project', () => {
  it('Animals stay untouched when unchecked; the locked kuhli group survives; the scene is never replaced', () => {
    const t = project(); t.locks = lockObject(t, 'substrate'); t.locks = lockRoster(t, 'kuhli', 'exact', 7);
    const st = storeOf(t), spy = vi.spyOn(st, 'replace'), sub = JSON.stringify(st.tank.substrate), patches = JSON.stringify(st.tank.patches ?? null);
    const run = (scope: Parameters<typeof propose>[2]['scope']) => {
      const d = propose(st, B, { scope, objective: 'explore' }, 2), pr = d.proposals[0];
      if (pr) expect(applyProposal(st, pr).ok).toBe(true);
      return pr;
    };
    run(['animals', 'plants', 'hardscape']);                                // session 1
    const fish2 = JSON.stringify(st.tank.fish);
    run(['plants', 'hardscape']);                                           // session 2: Animals unchecked
    expect(JSON.stringify(st.tank.fish)).toBe(fish2);
    run(['animals']);                                                       // session 3
    expect(st.tank.fish.filter(f => f.species === 'kuhli')).toHaveLength(7);
    expect(JSON.stringify(st.tank.substrate)).toBe(sub); expect(JSON.stringify(st.tank.patches ?? null)).toBe(patches);
    expect(st.tank.locks?.roster).toEqual([{ species: 'kuhli', mode: 'exact', n: 7 }]);   // accepting never locked anything
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("the coach is Discovery's optional questioner", () => {
  it('skips the questions the project already answers and hands over to Discovery when it ends', async () => {
    const tank = project(); tank.locks = lockRoster(tank, 'kuhli', 'exact', 7); tank.locks = lockObject(tank, 'tank');
    const c: CoachCtx = { scene: defaultScene(), tank, brief: emptyBrief() };
    expect(answered.animals(c)).toBe(true); expect(answered.tank(c)).toBe(true); expect(answered.kind(c)).toBe(true);
    const shown: string[] = []; let done = 0;
    const host: CoachHost = {
      async open() { return { el: null }; }, show(card: CoachCard) { shown.push(card.step.id); }, update() { /* */ }, hide() { /* */ },
      read: () => c, subscribe: () => () => { /* */ }, load: () => undefined, save() { /* */ }, warn() { /* */ }, done: () => { done++; },
    };
    const coach = createCoach(GUIDE_STEPS as readonly CoachStep[], host, { settleMs: 0 });
    await coach.start(true);
    expect(shown).not.toContain('kind'); expect(shown).not.toContain('size'); expect(shown).not.toContain('animals');
    expect(shown).toContain('place');
    for (let i = 0; i < 12 && !done; i++) await coach.skip().then(() => coach.next());
    expect(done).toBe(1);
  });
});

describe('the New tank menu', () => {
  it('AB4: the DX5 shortcuts are retired; one habitat question stands in', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const id of ['modeExploring', 'modeIdeas', 'modeExisting', 'modeKindList']) expect(html).not.toContain(`id="${id}"`);
    expect(html).toContain('id="habitatList"');
    expect(html).not.toMatch(/id="modeGuided"|id="modeSandbox"/);
  });
});
