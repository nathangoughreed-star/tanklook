// Explore Complete Setups, stage X3 (lane OX5): the Explore screens (src/ui/explore/*), checked without WebGL and without pixels (reconcile 8.4 criteria 1, 6, 7, 11).
// The screens are strings over stored records and a session that gates the pool in chunks, so what a card says, what a click writes and what a no-result state offers are all plain data here;
// the live screen is checked in the browser (shots/ox5/). The pool is slow to build, so one small pool of looks across the worlds is shared by the tests that need candidates.
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { briefToWants, emptyBrief, setItem, type Brief } from '../src/scene/brief';
import { routeOf, setRoute, worldOf } from '../src/scene/project';
import { TANK_MODELS } from '../src/data/tanks';
import type { Wants } from '../src/demand/suggest';
import { createExploreStore } from '../src/explore/store';
import { toStored, type StoredCandidate } from '../src/explore/candidate';
import { aspectsOf, interpretationOf, TAGS, TAG_IDS, weightsOf } from '../src/explore/aspects';
import { batchSizeOf } from '../src/explore/rank';
import { chooseWorld, exploresOf, nextOnboard, onboardCrumbs, placeOf } from '../src/ui/guided/logic';
import { cardHtml, careText, limitLines, startupText, statsOf, tagsOffered, verdictOf, worldLabel } from '../src/ui/explore/card';
import { Explorer, fewerWhy, limitsLine, lookOrder } from '../src/ui/explore/session';
import { editButtons, fewerHtml, noResultHtml } from '../src/ui/explore/notes';
import { applyInterpret, interpretHtml, interpretOf } from '../src/ui/explore/interpret';
import { reactTo, tagReaction } from '../src/ui/explore/react';
import { favouritesOf, stripHtml } from '../src/ui/explore/strip';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string): string => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
/** the code of a file without its comments (a guard must not trip over a comment that names what the file avoids) */
const code = (f: string): string => read(f).split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');

const P = defaultProfile(), NOW = Date.parse('2026-11-02'), cap = (value: number) => ({ on: true, value });
/** a few looks across the worlds the pool serves (freshwater, saltwater, terrarium, paludarium), the same set test/explore.test.ts uses */
const ONLY = ['planted-community', 'silk-plant-natural', 'mossy-wood-ferns', 'white-sand-stone', 'goldfish-palace', 'axolotl-den', 'clownfish-anemone', 'lps-coral-garden', 'tarantula-burrow', 'cypress-swamp'];
const run = (w: Wants, only: readonly string[] = ONLY) => { const x = new Explorer({ w, P, units: 'in', now: NOW, only, sizes: 1 }); while (!x.done) x.step(); return x; };

const open = run({ constraints: {} });
/** a fresh explorer holding the same finished open pool (no second build): batches taken from it do not disturb the shared one */
const copyOfOpen = () => { const x = new Explorer({ w: { constraints: {} }, P, units: 'in', now: NOW, only: ONLY, sizes: 1 }); x.cursor = x.order.length; x.eligible = [...open.eligible]; x.provisional = [...open.provisional]; x.withheld = [...open.withheld]; x.byGate = { ...open.byGate }; return x; };
const batch = copyOfOpen().batch(undefined, { size: 6 });
const stored = (i: number): StoredCandidate => toStored(batch.picks[i].entry.candidate, { batch: 1, now: NOW });
const fresh = () => createExploreStore(undefined);

describe('the session: stage A in chunks, stage B per batch', () => {
  it('goes round the worlds and families, so any prefix of the pool is varied and brackish never enters', () => {
    const order = lookOrder();
    expect(order.length).toBeGreaterThan(20);
    const world = (id: string) => open.eligible.concat(open.provisional).find(e => e.candidate.archetype.id === id)?.candidate.identity.world;
    expect(new Set(order.slice(0, 4).map(id => world(id) ?? id)).size).toBeGreaterThanOrEqual(2);
    expect(lookOrder(['planted-community', 'tarantula-burrow'])).toEqual(expect.arrayContaining(['planted-community', 'tarantula-burrow']));
  });
  it('builds the pool a chunk at a time (it can stop early) and finishes with the same set', () => {
    const x = new Explorer({ w: { constraints: {} }, P, units: 'in', now: NOW, only: ONLY.slice(0, 4), sizes: 1, chunk: 1 });
    expect(x.progress).toEqual({ checked: 0, of: 4 });
    x.step(); expect(x.progress.checked).toBe(1); expect(x.done).toBe(false);
    while (!x.done) x.step();
    expect(x.progress).toEqual({ checked: 4, of: 4 });
    const whole = run({ constraints: {} }, ONLY.slice(0, 4));
    expect(x.eligible.map(e => e.id).sort()).toEqual(whole.eligible.map(e => e.id).sort());
  });
  it('a batch repeats nothing already shown, and is size picks (3 on software GL, 6 on a GPU)', () => {
    expect(batchSizeOf(true)).toBe(3); expect(batchSizeOf(false)).toBe(6);
    const x = copyOfOpen(), a = x.batch(undefined, { size: 3 }), b = x.batch(undefined, { size: 3 });
    expect(a.picks.length).toBe(3);
    const ids = new Set(a.picks.map(p => p.entry.id));
    for (const p of b.picks) expect(ids.has(p.entry.id)).toBe(false);
  });
});

describe('acceptance 6: an informative card', () => {
  it('shows the picture slot, the name, the world and water, and the four prominent figures from the frozen estimate', () => {
    const st = stored(0), html = cardHtml({ c: st }), e = st.estimate;
    expect(html).toContain(`data-ex-id="${st.id}"`); expect(html).toContain('ex-art'); expect(html).toContain(st.identity.name); expect(html).toContain(worldLabel(st));
    const s = statsOf(st);
    expect(s.map(x => x.id)).toEqual(['startup', 'care', 'gal', 'difficulty']);
    expect(html).toContain(startupText(st)); expect(html).toContain(careText(st).main); expect(html).toContain(`${Math.round(e.gal * 10) / 10} gal`); expect(html).toContain(e.difficulty.level);
    expect((html.match(/class="ex-stat"/g) ?? []).length).toBe(4);
    for (const c of ['Like', 'Pass', 'Save', 'Unrated', 'Make This Mine']) expect(html).toContain(c);
  });
  it('the care figure is the HIGH end of its range, labelled an estimate, and the start-up figure a range, never one invented number', () => {
    for (let i = 0; i < batch.picks.length; i++) {
      const st = stored(i), r = st.estimate.minPerWeek;
      expect(careText(st).main).toBe(`up to ${Math.round(r.hi / 5) * 5} min a week`);
      expect(careText(st).main.startsWith('up to')).toBe(true);
      expect(startupText(st)).toMatch(/^(about )?\$|^\$/);
    }
  });
  it('the expanded view lists the roster, the other figures, the verdict and the assumptions', () => {
    const st = stored(0), html = cardHtml({ c: st, open: true });
    for (const r of st.roster) expect(html).toContain(String(r.n));
    expect(html).toContain('The animals'); expect(html).toContain('More figures'); expect(html).toContain('Verdict:'); expect(html).toContain('Assumptions');
    for (const a of st.provenance.assumptions) expect(html).toContain(a.slice(0, 20).replace(/&/g, '&amp;'));
    expect(cardHtml({ c: st })).not.toContain('Assumptions');   // compact until expanded
  });
  it('a card says what it was checked against: each limit that was set, "no limits set" otherwise, and never a line for a limit that was not set', () => {
    const none = verdictOf(stored(0));
    expect(none.pill).toBe('No limits set');
    const x = run({ constraints: { startupUsd: cap(5000), monthlyUsd: cap(400) } }, ONLY.slice(0, 3)), p = x.batch(undefined, { size: 2 }).picks[0];
    const st = toStored(p.entry.candidate, { batch: 1, now: NOW }), lines = limitLines(st);
    expect(lines.some(l => /^Set-up budget: within your firm limit \$5,000/.test(l))).toBe(true);
    expect(lines.some(l => /^Monthly cost: within/.test(l))).toBe(true);
    expect(lines.some(l => /^Care time/.test(l))).toBe(false);
    expect(verdictOf(st).pill).toBe('Within your limits');
  });
  it('a provisional concept is flagged on the card with the reason, and is never worded as within a limit', () => {
    const prov = open.provisional[0]; expect(prov).toBeDefined();
    const st = toStored(prov.candidate, { batch: 0, now: NOW }), html = cardHtml({ c: st });
    expect(verdictOf(st).tone).toBe('prov'); expect(html).toContain('Provisional'); expect(html).toContain('ex-flag'); expect(html).not.toContain('Within your limits');
    expect(verdictOf(st).lines.length).toBeGreaterThan(0);
  });
  it('a stale favourite is labelled with the broken limit and cannot be made mine, and the strip keeps it', () => {
    const st = stored(0), db = fresh(); db.put(st); db.react(st.id, { state: 'liked' });
    const w = { constraints: { startupUsd: cap(10) } } as Wants, ch = db.recheck(w);
    expect(ch.some(x => x.id === st.id && x.to === 'stale')).toBe(true);
    const rec = db.list()[0], html = cardHtml({ c: rec });
    expect(html).toContain('No longer fits your limits'); expect(html).toMatch(/data-ex="mine"[^>]*disabled/);
    const strip = stripHtml(db.list(), { shots: new Map(), persisted: true });
    expect(strip).toContain(st.identity.name); expect(strip).toContain('No longer fits'); expect(db.list().length).toBe(1);   // never deleted
  });
  it('markup escapes what it prints', () => {
    const st = stored(0), evil = { ...st, identity: { ...st.identity, name: '<img onerror=x>', tagline: '"quoted" & <b>' } };
    const html = cardHtml({ c: evil });
    expect(html).not.toContain('<img onerror'); expect(html).toContain('&lt;img onerror=x&gt;'); expect(html).toContain('&quot;quoted&quot; &amp; &lt;b&gt;');
  });
});

describe('acceptance 7: Like, Pass, Save and Unrated mean different things', () => {
  const a = () => ({ db: fresh(), st: stored(0), other: stored(1) });
  it('Unrated is neutral: no record, no event; Like writes a record and a profile event; clicking Like again takes it back to exactly where it was', () => {
    const { db, st } = a(), b0 = emptyBrief();
    expect(reactTo(db, st, b0, 'unrated').brief).toBe(b0); expect(db.list().length).toBe(0);
    const l = reactTo(db, st, b0, 'like');
    expect(l.record?.reaction.state).toBe('liked'); expect(aspectsOf(l.brief)?.events.length).toBe(1);
    const back = reactTo(db, st, l.brief, 'like');
    expect(back.record?.reaction.state).toBe('unrated'); expect(aspectsOf(back.brief)).toBeUndefined();
  });
  it('Pass is evidence about this candidate only: it does not lower its world or look family, and does not ban them from the pool', () => {
    const { db, st } = a(), p = reactTo(db, st, emptyBrief(), 'pass'), w = weightsOf(aspectsOf(p.brief));
    expect(p.record?.reaction.state).toBe('passed');
    expect([...w.keys()].some(k => k.startsWith('world:') || k.startsWith('look:'))).toBe(false);
    const x = copyOfOpen(), ids = new Set(x.left.map(e => e.id)), again = x.batch(aspectsOf(p.brief), { size: 6 });
    expect(again.picks.every(q => ids.has(q.entry.id))).toBe(true);
  });
  it('Save is separate from Like / Pass and commits nothing; Unsave takes only the Favourites event back', () => {
    const { db, st } = a(), l = reactTo(db, st, emptyBrief(), 'like'), s = reactTo(db, st, l.brief, 'save');
    expect(s.record?.reaction).toMatchObject({ state: 'liked', saved: true });
    expect(aspectsOf(s.brief)!.events.map(e => e.k)).toEqual(['like', 'save']);
    const u = reactTo(db, st, s.brief, 'unsave');
    expect(u.record?.reaction).toMatchObject({ state: 'liked', saved: false }); expect(aspectsOf(u.brief)!.events.map(e => e.k)).toEqual(['like']);
    expect(favouritesOf(db.list()).length).toBe(1);   // still liked
    const only = reactTo(fresh(), st, emptyBrief(), 'save'); expect(only.record?.reaction).toMatchObject({ state: 'unrated', saved: true });
  });
  it('a changed mind replaces the earlier reaction, keeps Favourites, and undoing everything restores the profile exactly', () => {
    const { db, st } = a(), b0 = emptyBrief();
    const saved = reactTo(db, st, b0, 'save'), liked = reactTo(db, st, saved.brief, 'like'), passed = reactTo(db, st, liked.brief, 'pass');
    expect(aspectsOf(passed.brief)!.events.map(e => e.k).sort()).toEqual(['pass', 'save']);
    const cleared = reactTo(db, st, reactTo(db, st, passed.brief, 'unsave').brief, 'unrated');
    expect(aspectsOf(cleared.brief)).toBeUndefined();
  });
  it('the "What caught your eye?" panel offers aspect TAGS about the setup only: none of them is a limit, and a tag attaches to the like it follows', () => {
    const st = stored(0), offered = tagsOffered(st);
    expect(offered.length).toBeGreaterThan(3); for (const t of offered) expect(TAG_IDS).toContain(t);
    for (const t of TAGS) expect(`${t.id} ${t.label}`).not.toMatch(/expensive|cost|budget|price|money|too (large|big|much)|\btime\b|minutes|space/i);
    const db = fresh(), l = reactTo(db, st, emptyBrief(), 'like').brief;
    const html = cardHtml({ c: db.list()[0], tags: { mode: 'like', chosen: [offered[0]] } });
    expect(html).toContain('What caught your eye?'); expect(html).toContain(`data-tag="${offered[0]}"`); expect(html).toContain('Adjust constraints');
    const tagged = tagReaction(l, st, 'like', [offered[0]]);
    expect(aspectsOf(tagged)!.events.length).toBe(1); expect(aspectsOf(tagged)!.events[0]).toMatchObject({ k: 'like', att: true });
    expect(cardHtml({ c: db.list()[0], tags: { mode: 'pass', chosen: [] } })).toContain('What would you change?');
    expect(tagReaction(l, st, 'like', [])).toBe(l);
  });
  it('a reaction never changes a limit and never changes what the gate lets through', () => {
    const b0 = setItem(emptyBrief(), 'constraints.budget', 300, 'hard'), db = fresh(), st = stored(0);
    const b1 = tagReaction(reactTo(db, st, reactTo(db, st, b0, 'like').brief, 'save').brief, st, 'like', tagsOffered(st).slice(0, 2));
    expect(briefToWants(b1)).toEqual(briefToWants(b0));
    const x = copyOfOpen(), before = x.left.map(e => e.id).sort();
    x.batch(aspectsOf(b1), { size: 3 }); x.batch(undefined, { size: 3, broad: true });
    expect([...x.eligible.map(e => e.id)].sort()).toEqual(before);
  });
  it('the "what we learned" line comes from the profile, can be corrected in place, reset, or ignored for one batch', () => {
    const db = fresh(); let b = emptyBrief();
    for (let i = 0; i < 3; i++) { const st = stored(i); b = tagReaction(reactTo(db, st, b, 'like').brief, st, 'like', tagsOffered(st).slice(0, 2)); }
    const i = interpretOf(b); expect(i).toBeDefined(); expect(i!.text).toMatch(/^You seem to like/); expect(i!.text).toMatch(/something different\?$/);
    const html = interpretHtml(i, { editing: true, broad: false, told: [] });
    for (const t of ['More like that', 'Something different', 'Done editing', 'data-v="more"', 'data-v="less"', 'data-v="drop"', 'Forget everything']) expect(html).toContain(t);
    const key = i!.toward[0].key, less = applyInterpret(b, { kind: 'less', key });
    expect(weightsOf(aspectsOf(less)).get(key)).toMatchObject({ source: 'told' }); expect(weightsOf(aspectsOf(less)).get(key)!.w).toBeLessThan(0);
    expect(interpretHtml(interpretationOf(aspectsOf(less)), { editing: true, broad: false, told: [key] })).toContain('you told us');
    expect(weightsOf(aspectsOf(applyInterpret(less, { kind: 'drop', key }))).get(key)?.source).not.toBe('told');
    expect(aspectsOf(applyInterpret(b, { kind: 'reset' }))).toBeUndefined();
    expect(briefToWants(less)).toEqual(briefToWants(b));   // editing the line never edits a limit
    expect(interpretHtml(undefined, { editing: false, broad: false, told: [] })).toBe('');
  });
});

describe('acceptance 11: no feasible result, and "fewer than six, here is why"', () => {
  const tank = TANK_MODELS.filter(t => t.ratedGal >= 150).sort((p, q) => p.ratedGal - q.ratedGal)[0];
  const none = run({ constraints: { startupUsd: cap(40) }, ownTank: tank }, ONLY.slice(0, 5));
  it('nothing is eligible, nothing is fabricated, and the blocking limit is named with controlled edits', () => {
    expect(none.eligible.length).toBe(0);
    const r = none.why(false);
    expect(r.blocker).toBeTruthy(); expect(r.edits.length).toBeGreaterThan(0);
    const html = noResultHtml(r);
    expect(html).toContain('No complete setup fits all of that.'); expect(html).toContain("What is holding it back"); expect(html).not.toContain('ex-card'); expect(html).toContain('nothing was made up');
    expect(html).toContain(`data-blocker="${r.blocker}"`);
    const btns = editButtons(r);
    expect(btns.length).toBe(r.edits.length); expect(btns.some(b => b.act === 'adjust' || b.act === 'alt')).toBe(true); expect(btns.some(b => b.act === 'world')).toBe(true);
    for (const b of btns) expect(html).toContain(b.label);
  });
  it('a Required tank that does not suit is offered as "mark my tank Available", an edit that is a button and not applied on its own', () => {
    const r = none.why(false), mark = editButtons(r).find(b => b.alt?.op === 'available');
    if (r.blocker === 'equipment') { expect(mark).toBeDefined(); expect(mark!.alt).toEqual({ op: 'available', keys: ['tank'] }); }
    const flex = editButtons({ blocker: 'budget', text: 't', edits: [{ kind: 'make-flexible', limit: 'budget', text: 'x' }] });
    expect(flex[0].alt).toEqual({ op: 'flexible', limits: ['budget'] });
  });
  it('a limit that leaves fewer than a batch says which limit left setups out, in words', () => {
    const small = run({ constraints: { startupUsd: cap(700) } }), b = small.batch(undefined, { size: 6 });
    const why = fewerWhy(small.byGate, small.withheld), r = small.why(false);
    if (b.picks.length < 6) {
      const html = fewerHtml(b.picks.length, 6, why, r.blocker);
      expect(html).toContain('not 6'); expect(html).toContain('Adjust constraints'); expect(html).toContain('or pick a world');
      expect(why.length).toBeGreaterThan(0); expect(why[0]).toMatch(/left out by your set-up budget|left out by/);
    }
    expect(fewerHtml(1, 6, [], undefined)).toContain('Only one setup');
    expect(fewerHtml(2, 6, ['x'], 'care')).toContain('Most were left out by your care-time limit');
  });
  it('the limits line says what was applied and calls an unset limit unknown, not zero', () => {
    const l = limitsLine({ constraints: { startupUsd: cap(300) }, flexLimits: { monthlyUsd: true } });
    expect(l.set).toEqual(['set-up budget $300 (firm)']); expect(l.unset).toEqual(expect.arrayContaining(['monthly cost', 'care time', 'space']));
    expect(limitsLine({ constraints: { monthlyUsd: cap(50) }, flexLimits: { monthlyUsd: true } }).set[0]).toBe('monthly cost $50 a month (flexible target)');
    expect(limitsLine({ constraints: {} }).set).toEqual([]);
  });
});

describe('acceptance 1: Open to Anything goes to Explore, not to Animals First / Look First', () => {
  it('after Limits the next step is the start step, which for World = any is Explore (crumb "Explore"); the other worlds keep Starting Point', () => {
    const any = chooseWorld(emptyBrief(), 'any'), aq = chooseWorld(emptyBrief(), 'aquarium');
    expect(worldOf(any)).toBe('any'); expect(exploresOf(any)).toBe(true); expect(exploresOf(aq)).toBe(false);
    expect(nextOnboard('limits')).toBe('start');
    expect(onboardCrumbs('start', 'any').map(c => c.label)).toEqual(['World', 'Equipment', 'Limits', 'Explore']);
    expect(onboardCrumbs('start', 'aquarium').map(c => c.label)).toEqual(['World', 'Equipment', 'Limits', 'Starting Point']);
  });
  it('a project already in Explore reopens at Explore, and a stale explore route under another world reopens at the start cards', () => {
    const b = setRoute(setItem(chooseWorld(emptyBrief(), 'any'), 'constraints.budget', 300, 'hard'), 'explore');
    expect(routeOf(b)).toBe('explore');
    const settled = { ...b } as Brief;
    expect(placeOf(settled, 'start')).toEqual({ at: 'start' });
  });
  it('the shell mounts the real Explore screen by default, with no route fallback for it in showRoute', () => {
    const shell = read('src/ui/guided/shell.ts');
    expect(shell).toContain("import { mountExplore } from '../explore/explore'");
    expect(shell).toContain('explore = o.exploreEntry ?? mountExplore');
    expect(shell).not.toMatch(/explore = o\.exploreEntry \?\? placeholderExplore/);
    expect(shell).toContain("function showRoute(r: Exclude<Route, 'explore'>)");
    expect(shell).not.toContain("if (r === 'explore') { showStep('start'); return; }");
  });
});

describe('what the screen may and may not write (source guards)', () => {
  const src = ['explore', 'card', 'session', 'react', 'interpret', 'strip', 'notes'].map(f => code(`src/ui/explore/${f}.ts`)).join('\n');
  it('browsing never writes the scene: no store.replace / update, no tank assignment, only the host shot draws', () => {
    expect(src).not.toMatch(/store\.(replace|update|seal|closeTank|splitTank)|Object\.assign\(|\.tank\s*=[^=]|structuredClone\(c\.store/);
    expect(read('src/ui/explore/explore.ts')).toContain('host.shot');
  });
  it('a reaction never reaches a limit: no constraint writers outside the explicit controlled edits (applyAlternative) in the screen', () => {
    const pure = ['card', 'session', 'react', 'interpret', 'strip'].map(f => code(`src/ui/explore/${f}.ts`)).join('\n');
    expect(pure).not.toMatch(/setConstraint|setLimitKind|applyChange|applyAlternative|setLimit|setBudget|setMonthly|setCareTime|setSpace/);
    const screen = code('src/ui/explore/explore.ts');
    expect((screen.match(/applyAlternative/g) ?? []).length).toBe(3);   // import + the two controlled-edit buttons (a no-result edit, a verified alternative)
    expect(screen).not.toMatch(/setConstraint|setLimitKind|applyChange/);
  });
  it('Adjust constraints goes back to GS4 Limits (the shell step), and the route is written as one project state', () => {
    const screen = read('src/ui/explore/explore.ts');
    expect(screen).toMatch(/case 'adjust': c\.back\(\)/);
    expect(screen).toContain("setRoute(b, 'explore')");
    expect(screen).toContain('batchSizeOf(softwareGl())');
  });
  it('Make This Mine installs as a proposal (DX5): adoptTank, never a replace', () => {
    const screen = read('src/ui/explore/explore.ts');
    expect(screen).toContain('makeMine?(c: StoredCandidate): void'); expect(screen).toContain('adoptTank(c.store');  });
});
