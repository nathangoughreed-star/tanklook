// The coach runner (lane GW1): the walk through a step list, with a fake host standing in for the page. What it opens, when it advances, what a missing target does and how it
// resumes are plain data here; the card and the spotlight are checked in the browser (shots/gw1/).
import { describe, expect, it } from 'vitest';
import { createCoach, type CoachCard, type CoachHost, type CoachOpened, type CoachProgress } from '../src/ui/coach/runner';
import { DEMO_STEPS, type CoachCtx, type CoachStep, type CoachTarget } from '../src/ui/coach/steps';
import { emptyBrief, parseProject, projectExtras, setProjectExtras } from '../src/scene/brief';

interface World { size: number; kind: string; limits: number; style: string; here: Set<string> }
const flush = () => new Promise<void>(r => setTimeout(r, 0));

/** A fake page: `here` lists the targets that exist; `world` is what predicates read; `poke` is a change in the scene. */
function rig(steps: readonly CoachStep[], here: string[] | 'all' = 'all', saved?: CoachProgress) {
  const world: World = { size: 20, kind: 'freshwater', limits: 0, style: 'none', here: new Set(here === 'all' ? steps.map(s => key(s.target)) : here) };
  const log = { opened: [] as string[], warns: [] as string[], saves: [] as (CoachProgress | undefined)[], cards: [] as CoachCard[], hidden: 0 };
  const subs = new Set<() => void>();
  let progress = saved;
  const host: CoachHost = {
    async open(t: CoachTarget): Promise<CoachOpened | null> { log.opened.push(key(t)); return world.here.has(key(t)) ? { el: null } : null; },
    show(c) { log.cards.push(c); }, update(c) { log.cards.push(c); }, hide() { log.hidden++; },
    read: () => world as unknown as CoachCtx,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    load: () => progress, save(p) { progress = p; log.saves.push(p); },
    warn: m => log.warns.push(m),
  };
  const coach = createCoach(steps, host, { settleMs: 0 });
  const poke = async (fn: (w: World) => void) => { fn(world); for (const s of [...subs]) s(); await flush(); };
  return { world, log, coach, poke, host, progress: () => progress };
}
const key = (t: CoachTarget) => [t.section, t.control, t.dialog].filter(Boolean).join('|');
const last = (l: CoachCard[]) => l[l.length - 1];

const steps: CoachStep[] = [
  { id: 'a', target: { section: 'tank', control: '#a' }, title: 'A', why: 'a', done: { changes: c => (c as unknown as World).size }, skippable: true },
  { id: 'b', target: { dialog: 'limits' }, title: 'B', why: 'b', done: { test: c => (c as unknown as World).limits > 0 }, skippable: true },
  { id: 'c', target: { section: 'quick' }, title: 'C', why: 'c', skippable: false },
  { id: 'd', target: { section: 'plants' }, title: 'D', why: 'd', done: { changes: c => (c as unknown as World).style }, skippable: false },
];

describe('opening targets and the card', () => {
  it('opens the first step\'s target and shows step 1 of 4 with Back off and Next waiting for the change', async () => {
    const r = rig(steps); await r.coach.start();
    expect(r.log.opened).toEqual(['tank|#a']);
    const c = last(r.log.cards);
    expect([c.step.id, c.n, c.m, c.canBack, c.canSkip, c.canNext, c.done]).toEqual(['a', 1, 4, false, true, false, false]);
    expect(r.coach.state.running).toBe(true);
  });
  it('opens a dialog target the same way', async () => {
    const r = rig(steps); await r.coach.start(); await r.coach.skip();
    expect(r.log.opened).toEqual(['tank|#a', 'limits']);
    expect(last(r.log.cards).step.id).toBe('b');
  });
});

describe('advancing', () => {
  it('moves on by itself when a "changes" field changes, and not before', async () => {
    const r = rig(steps); await r.coach.start();
    await r.poke(w => { w.limits = 5; });                         // unrelated to step a
    expect(r.coach.state.step!.id).toBe('a');
    await r.poke(w => { w.size = 40; });
    expect(r.coach.state.step!.id).toBe('b');
  });
  it('moves on when a "test" predicate turns true while the step shows', async () => {
    const r = rig(steps); await r.coach.start(); await r.poke(w => { w.size = 40; });
    expect(r.coach.state.step!.id).toBe('b');
    await r.poke(w => { w.limits = 1; });
    expect(r.coach.state.step!.id).toBe('c');
  });
  it('a test that is already true when its step opens shows as done but does not skip the step; Next moves on', async () => {
    const r = rig(steps); r.world.limits = 3; await r.coach.start(); await r.poke(w => { w.size = 40; });
    expect(r.coach.state.step!.id).toBe('b');
    const c = last(r.log.cards); expect([c.done, c.canNext, c.canSkip]).toEqual([true, true, false]);
    await r.poke(() => {});                                         // nothing changed: still there
    expect(r.coach.state.step!.id).toBe('b');
    await r.coach.next(); expect(r.coach.state.step!.id).toBe('c');
  });
  it('an information step (no done) has Next at once; a step that is not skippable offers no Skip and Next only once done', async () => {
    const r = rig(steps); await r.coach.start(); await r.coach.skip(); await r.coach.skip();
    const c = last(r.log.cards); expect([c.step.id, c.canNext, c.canSkip]).toEqual(['c', true, false]);
    await r.coach.next();
    const d = last(r.log.cards); expect([d.step.id, d.canNext, d.canSkip, d.last]).toEqual(['d', false, false, true]);
    await r.coach.next();                                           // refused: not done
    expect(r.coach.state.step!.id).toBe('d');
    await r.poke(w => { w.style = 'reef'; });                       // done: the last step finishes the walk
    expect(r.coach.state.running).toBe(false);
  });
  it('Next before the step is done does nothing; Skip moves on and remembers the skip; Back returns', async () => {
    const r = rig(steps); await r.coach.start();
    await r.coach.next(); expect(r.coach.state.step!.id).toBe('a');
    await r.coach.skip(); expect(r.coach.state.step!.id).toBe('b'); expect(r.coach.state.skipped).toEqual(['a']);
    await r.coach.back(); expect(r.coach.state.step!.id).toBe('a');
    await r.coach.back(); expect(r.coach.state.step!.id).toBe('a');   // Back on the first step stays
  });
});

describe('a target that is not on the page', () => {
  it('is skipped with a console warning, going forward and going back', async () => {
    const r = rig(steps, ['tank|#a', 'quick', 'plants']);          // the limits dialog is missing
    await r.coach.start(); await r.coach.skip();
    expect(r.coach.state.step!.id).toBe('c');
    expect(r.log.warns).toEqual(['coach: step "b" skipped, its target is not on the page']);
    await r.coach.back(); expect(r.coach.state.step!.id).toBe('a');   // back past the missing one
    expect(r.log.warns.length).toBe(2);
  });
  it('starting with the first target missing begins at the next one; with every target missing the walk ends', async () => {
    const r = rig(steps, ['quick', 'plants']); await r.coach.start();
    expect(r.coach.state.step!.id).toBe('c');
    const none = rig(steps, []); await none.coach.start();
    expect(none.coach.state.running).toBe(false); expect(none.log.warns.length).toBe(4); expect(none.log.hidden).toBeGreaterThan(0);
  });
});

describe('progress and resume', () => {
  it('saves the step it is on (and the skips), and a new walk resumes there', async () => {
    const r = rig(steps); await r.coach.start(); await r.coach.skip(); await r.coach.skip();
    expect(r.progress()).toEqual({ at: 'c', skipped: ['a', 'b'] });
    r.coach.stop();                                                  // Esc: the card goes, the place stays
    expect(r.coach.state.running).toBe(false); expect(r.progress()).toEqual({ at: 'c', skipped: ['a', 'b'] }); expect(r.coach.resumable()).toBe(true);
    const again = rig(steps, 'all', r.progress()); await again.coach.start();
    expect(again.coach.state.step!.id).toBe('c'); expect(again.coach.state.skipped).toEqual(['a', 'b']);
  });
  it('start(true) begins again at the first step; finishing clears the saved place', async () => {
    const r = rig(steps, 'all', { at: 'd' }); await r.coach.start(true);
    expect(r.coach.state.step!.id).toBe('a');
    await r.coach.skip(); await r.coach.skip(); await r.coach.next(); await r.poke(w => { w.style = 'x'; });
    expect(r.progress()).toBeUndefined(); expect(r.coach.resumable()).toBe(false);
  });
  it('a saved step the list no longer has starts at the first', async () => {
    const r = rig(steps, 'all', { at: 'gone', skipped: ['gone'] }); expect(r.coach.resumable()).toBe(false); await r.coach.start();
    expect(r.coach.state.step!.id).toBe('a'); expect(r.coach.state.skipped).toEqual([]);
  });
  it('the saved place survives the brief\'s own save / load (project.coach)', () => {
    const b = setProjectExtras(emptyBrief(), { coach: { at: 'limits', skipped: ['kind'] } });
    expect(projectExtras(JSON.parse(JSON.stringify(b))).coach).toEqual({ at: 'limits', skipped: ['kind'] });
    expect(parseProject({ coach: { at: 'x y' } })).toBeUndefined();                       // not an id: dropped
    expect(parseProject({ coach: { at: 'ok', skipped: ['a', 'B!', 'c'] } })).toEqual({ coach: { at: 'ok', skipped: ['a', 'c'] } });
    expect(setProjectExtras(b, {}).project).toBeUndefined();
  });
});

describe('Esc / close and the demo path', () => {
  it('stop hides the card and ignores a later change', async () => {
    const r = rig(steps); await r.coach.start(); r.coach.stop(); const n = r.log.cards.length;
    await r.poke(w => { w.size = 99; });
    expect(r.log.cards.length).toBe(n); expect(r.coach.state.running).toBe(false); expect(r.log.hidden).toBe(1);
  });
  it('the demo path is Kind -> Tank size -> Your limits -> Look, with unique ids and a why of at most two sentences', () => {
    expect(DEMO_STEPS.map(s => s.id)).toEqual(['kind', 'size', 'limits', 'look']);
    expect(new Set(DEMO_STEPS.map(s => s.id)).size).toBe(DEMO_STEPS.length);
    for (const s of DEMO_STEPS) expect(s.why.split(/(?<=[.!?])\s/).length).toBeLessThanOrEqual(2);
    expect(DEMO_STEPS[1].target).toEqual({ section: 'tank', control: '#presetA' });
    expect(DEMO_STEPS[2].target).toEqual({ dialog: 'limits' });
  });
  it('the demo predicates fire on the fields they name', async () => {
    const T = { tank: { L: 1 }, product: undefined, water: 'fresh', layout: { id: 'none', kind: undefined } };
    const ctx = (brief: object): CoachCtx => ({ scene: {} as never, tank: T as never, brief: { v: 1, items: brief } as never });
    const snap = (id: string, c: CoachCtx) => { const d = DEMO_STEPS.find(s => s.id === id)!.done as { changes: (c: CoachCtx) => unknown }; return JSON.stringify(d.changes(c)); };
    const before = ctx({}), after = ctx({ 'constraints.budget': { value: 500 } });
    expect(snap('limits', before)).not.toBe(snap('limits', after));
    expect(snap('look', before)).toBe(snap('look', after));
  });
});
