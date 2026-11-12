import { describe, it, expect } from 'vitest';
import { emptyBrief, getItem, setItem, rangeOf, projectExtras, parseProject, type Brief } from '../src/scene/brief';
import { setDirection } from '../src/scene/project';
import { aspectsOf, weightsOf, recordAspect, tellAspect } from '../src/explore/aspects';
import { SIZE_GAL, SIZE_DRY, sizeRange, sizeOf, sizeText, SIZE_CHOICES } from '../src/scene/sizePrefs';
import { applyQuickPrefs, readQuickPrefs, answersOf, emptyAnswers, passesHard, AVOIDS, type QuickAnswers } from '../src/scene/quickPrefs';
import { prefsHtml, press, setLimit } from '../src/ui/quickPrefs';
import { INTRO_LINES, INTRO_TITLE, showsIntro, type StartDoor } from '../src/ui/introPopup';
import { getTankModel } from '../src/data/tanks';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8') as string;
const fresh = (d: 'freshwater' | 'terrarium' | 'paludarium' | 'saltwater' = 'freshwater'): Brief => setDirection(emptyBrief(), d);
const A = (x: Partial<QuickAnswers>): QuickAnswers => ({ ...emptyAnswers(), ...x });

describe('AB6 one strength model: hard = filters, prefer = ranks, unsure = nothing', () => {
  it('skipping / unsure writes nothing', () => {
    const b = fresh(); expect(applyQuickPrefs(b, emptyAnswers())).toEqual(b);
    const none = { look: {}, prohibit: [], arch: { interested: [], avoid: [], layouts: {}, families: {} } };
    expect(readQuickPrefs(b)).toEqual(none);
    expect(readQuickPrefs(applyQuickPrefs(applyQuickPrefs(b, A({ arch: { 'freshwater-jungle': 'interested' } })), A({})))).toEqual(none);
  });
  it('plants: a hard live-plants item is hard; No live plants is a hard exclusion (prohibit + the brief item); no plants answer exists any more', () => {
    const live = setItem(fresh(), 'appearance.plantMode', 'live', 'hard');
    expect(readQuickPrefs(live).plants).toEqual({ value: 'live', strength: 'hard' });
    const b = applyQuickPrefs(fresh(), A({ avoid: ['no-live-plants'] }));
    expect(readQuickPrefs(b).prohibit).toEqual(['no-live-plants']); expect(getItem(b, 'appearance.plantMode')).toMatchObject({ value: 'artificial', status: 'hard' });
    expect(answersOf(b).avoid).toEqual(['no-live-plants']);
  });
  it('size on an aquarium is a PREFERENCE range in gallons', () => {
    const b = applyQuickPrefs(fresh(), A({ size: 'medium' }));
    expect(getItem(b, 'constraints.tankGal')!.status).toBe('preference'); expect(rangeOf(b, 'constraints.tankGal')).toEqual({ min: 20, max: 54 });
    expect(readQuickPrefs(b).sizeGal).toEqual({ value: { lo: 20, hi: 54 }, strength: 'prefer' }); expect(answersOf(b).size).toBe('medium');
  });
  it('size on a dry habitat is floor area and height (prefer), never gallons, no brief limit', () => {
    for (const d of ['terrarium', 'paludarium'] as const) {
      const b = applyQuickPrefs(fresh(d), A({ size: 'medium' })), q = readQuickPrefs(b);
      expect(q.sizeGal).toBeUndefined(); expect(getItem(b, 'constraints.tankGal')).toBeUndefined();
      expect(q.floorSqIn).toEqual({ value: SIZE_DRY[d].medium.floorSqIn, strength: 'prefer' }); expect(q.heightIn).toEqual({ value: SIZE_DRY[d].medium.heightIn, strength: 'prefer' });
      expect(answersOf(b).size).toBe('medium');
    }
  });
  it('practical limits: a target is a preference, a firm maximum is hard; same brief fields as the limits panel', () => {
    let b = applyQuickPrefs(fresh(), A({ budget: { max: 300, firm: false }, care: { max: 60, firm: true } }));
    expect(getItem(b, 'constraints.budget')).toMatchObject({ value: 300, status: 'preference' }); expect(getItem(b, 'constraints.careMin')).toMatchObject({ value: 60, status: 'hard' });
    expect(readQuickPrefs(b)).toMatchObject({ budgetUsd: { value: 300, strength: 'prefer' }, careMinPerWeek: { value: 60, strength: 'hard' } });
    b = applyQuickPrefs(b, A({ budget: { max: 300, firm: true } })); expect(readQuickPrefs(b).budgetUsd?.strength).toBe('hard'); expect(readQuickPrefs(b).careMinPerWeek).toBeUndefined();
    expect(applyQuickPrefs(b, emptyAnswers())).toEqual(fresh());
    expect(setLimit(A({}), 'budget', 250).budget).toEqual({ max: 250, firm: false }); expect(setLimit(A({ budget: { max: 5, firm: true } }), 'budget', 0).budget).toBeUndefined();
    expect(press(A({ budget: { max: 5, firm: false } }), { firm: 'budget:1' }).budget).toEqual({ max: 5, firm: true });
  });
  it('archetype cards are always preferences: told weights, no items', () => {
    const b = applyQuickPrefs(fresh(), A({ arch: { 'freshwater-jungle': 'interested', 'freshwater-iwagumi': 'avoid' } }));
    expect(aspectsOf(b)?.told).toEqual({ 'layout:iwagumi-stone-garden': -1, 'layout:overgrown-jungle': 1, 'plants:lush': 1 }); expect(Object.keys(b.items).sort()).toEqual(['preferences.aspects']);
    expect(readQuickPrefs(b).look).toEqual({ lush: 1, ordered: -1 });
  });
  it('Don\'t want offers only objective hard prohibitions (no subjective dislikes) and lists them in prohibit', () => {
    expect(AVOIDS.map(a => a.id).sort()).toEqual(['co2', 'large-animals', 'no-live-plants', 'shrimp', 'snails']);
    for (const a of AVOIDS) { const b = applyQuickPrefs(fresh(), A({ avoid: [a.id] })); expect(readQuickPrefs(b).prohibit).toEqual([a.id]); expect(aspectsOf(b)).toBeUndefined(); }
    expect(getItem(applyQuickPrefs(fresh(), A({ avoid: ['co2'] })), 'preferences.lowtech')).toMatchObject({ value: true, status: 'hard' });
    expect(prefsHtml('freshwater', emptyAnswers()).split('data-x="avoid"')[1]).not.toMatch(/bright|colou?r/i);
  });
  it('a re-write retracts the earlier answers', () => {
    let b = applyQuickPrefs(fresh(), A({ size: 'large', arch: { 'freshwater-jungle': 'interested' }, avoid: ['co2', 'no-live-plants'], budget: { max: 900, firm: true } }));
    b = applyQuickPrefs(b, A({ arch: { 'freshwater-nature-river': 'interested' } }));
    for (const id of ['appearance.plantMode', 'preferences.lowtech', 'constraints.tankGal', 'constraints.budget'] as const) expect(getItem(b, id)).toBeUndefined();
    expect(aspectsOf(b)?.told).toEqual({ 'layout:driftwood-nature': 1, 'layout:rocky-river-stream': 1 });
    expect(applyQuickPrefs(b, emptyAnswers())).toEqual(fresh());
  });
  it('pressing a card cycles Unselected -> Interested -> Avoid -> Unselected', () => {
    const k = 'freshwater-jungle'; let a = press(A({}), { arch: k }); expect(a.arch[k]).toBe('interested'); a = press(a, { arch: k }); expect(a.arch[k]).toBe('avoid'); a = press(a, { arch: k }); expect(a.arch[k]).toBeUndefined();
  });
  it('answers survive save validation', () => {
    const b = applyQuickPrefs(fresh(), A({ size: 'small', arch: { 'freshwater-jungle': 'avoid' }, avoid: ['co2', 'no-live-plants'] }));
    expect(parseProject(projectExtras(b))?.quick).toEqual(projectExtras(b).quick); expect(parseProject({ quick: { size: 'huge', plants: 'x', look: ['A b'] } })).toBeUndefined();
  });
});

describe('AB6 do not overfit: only HARD answers filter', () => {
  const big = { gallons: 90, plants: 'artificial' as const, species: [] as string[], setupUsd: 5000, weeklyMin: 400 };
  it('a "prefer medium" project can still be offered a large tank (and every prefer answer passes anything)', () => {
    const b = applyQuickPrefs(fresh(), A({ size: 'medium', arch: { 'freshwater-jungle': 'interested' }, budget: { max: 300, firm: false }, care: { max: 30, firm: false } })), q = readQuickPrefs(b);
    expect(q.sizeGal?.strength).toBe('prefer'); expect(passesHard(q, big)).toBe(true);
    const d = readQuickPrefs(applyQuickPrefs(fresh('terrarium'), A({ size: 'small' }))); expect(passesHard(d, { floorSqIn: 1000, heightIn: 40 })).toBe(true);
  });
  it('hard answers do filter: firm maximum, required plants, prohibitions', () => {
    const q = readQuickPrefs(applyQuickPrefs(setItem(fresh(), 'appearance.plantMode', 'live', 'hard'), A({ budget: { max: 300, firm: true }, avoid: ['co2'] })));
    expect(passesHard(q, { setupUsd: 250, plants: 'live', co2: false })).toBe(true);
    expect(passesHard(q, { setupUsd: 350, plants: 'live' })).toBe(false); expect(passesHard(q, { plants: 'artificial' })).toBe(false); expect(passesHard(q, { co2: true, plants: 'live' })).toBe(false);
    expect(passesHard(readQuickPrefs(applyQuickPrefs(fresh(), A({ avoid: ['no-live-plants'] }))), { plants: 'mixed' })).toBe(false);
    const pro = (id: 'snails' | 'shrimp' | 'large-animals', sp: string) => passesHard(readQuickPrefs(applyQuickPrefs(fresh(), A({ avoid: [id] }))), { species: [sp, 'neon'] });
    expect([pro('snails', 'nerite'), pro('shrimp', 'cherryshrimp'), pro('large-animals', 'livingstonii')]).toEqual([false, false, false]);
    expect([pro('snails', 'cherryshrimp'), pro('shrimp', 'nerite'), pro('large-animals', 'neon')]).toEqual([true, true, true]);
  });
});

describe('AB6 told beats learned', () => {
  it('a told weight replaces the learned one, however much was learned', () => {
    let b = emptyBrief();
    for (let i = 0; i < 5; i++) b = recordAspect(b, { kind: 'like', c: 'c' + i, features: ['colors:vivid'] });
    expect(weightsOf(aspectsOf(b)).get('colors:vivid')).toMatchObject({ source: 'learned' }); expect(weightsOf(aspectsOf(b)).get('colors:vivid')!.w).toBeGreaterThan(0);
    b = applyQuickPrefs(b, A({ arch: { 'freshwater-minimal': 'interested' } })); b = tellAspect(b, 'colors:vivid', -1);
    expect(weightsOf(aspectsOf(b)).get('colors:vivid')).toMatchObject({ source: 'told', w: -1 });
    expect(aspectsOf(tellAspect(b, 'colors:vivid', 0))?.told?.['colors:vivid']).toBeUndefined();
  });
});

describe('AB6 size differs per habitat', () => {
  it('aquariums: gallons from the catalogue spread; ranges do not overlap; a medium terrarium is not a medium aquarium', () => {
    expect(sizeRange('unsure', 'small')).toEqual(sizeRange('freshwater', 'small')); expect(sizeRange('saltwater', 'medium')).not.toEqual(sizeRange('freshwater', 'medium'));
    for (const col of Object.values(SIZE_GAL)) { const r = SIZE_CHOICES.map(s => col[s]); for (let i = 0; i < 3; i++) { expect(r[i].lo).toBeLessThan(r[i].hi); if (i) expect(r[i].lo).toBe(r[i - 1].hi + 1); } }
    expect(sizeOf('saltwater', { lo: 30, hi: 74 })).toBe('medium'); expect(sizeOf('terrarium', { lo: 30, hi: 74 })).toBeUndefined();
  });
  it('dry habitats: floor area (sq in) and height (in), shown as words under each size', () => {
    expect(sizeText('terrarium', 'medium')).toBe('about 18 x 18 in floor, 24 in tall'); expect(sizeText('freshwater', 'small')).toBe('5-19 gal');
    for (const t of Object.values(SIZE_DRY)) { const r = SIZE_CHOICES.map(s => t[s].floorSqIn); for (let i = 1; i < 3; i++) expect(r[i].lo).toBe(r[i - 1].hi + 1); }
    expect(18 * 18).toBeGreaterThanOrEqual(SIZE_DRY.terrarium.medium.floorSqIn.lo); expect(18 * 18).toBeLessThanOrEqual(SIZE_DRY.terrarium.medium.floorSqIn.hi);
    expect(getTankModel('t18x18x18')).toBeTruthy();
  });
  it('the screen adapts: size words with units, no Look or Live plants rows, No live plants under Dont want (not saltwater), practical limits and Don\'t want collapsed', () => {
    const f = prefsHtml('freshwater', emptyAnswers()); expect(f).toContain('>≤5<'); expect(f).toContain('>150+<'); expect(f).not.toContain('Prefer not'); expect(f).not.toContain('aria-label="Live plants"'); expect(f).not.toContain('aria-label="Look"'); expect(f).toContain('data-avoid="no-live-plants"');
    expect(f).toMatch(/<details class="qp-more" data-x="limits">/); expect(f).toMatch(/<details class="qp-more" data-x="avoid">/);
    const t = prefsHtml('terrarium', emptyAnswers()); expect(t).toContain('in floor'); expect(t).not.toContain('gal'); expect(t).not.toContain('CO2');
    expect(prefsHtml('saltwater', emptyAnswers())).not.toContain('no-live-plants');
    expect(prefsHtml('freshwater', A({ avoid: ['snails'] }))).toContain('aria-pressed="true"'); expect(prefsHtml('freshwater', A({ avoid: ['snails'] }))).toMatch(/data-x="avoid" open/);
  });
});

describe('AB6 wiring', () => {
  it('offer, not a form: the title says optional; Skip and Start building both exist, neither disabled, no asterisks', () => {
    expect(INTRO_TITLE).toBe('A few quick preferences (all optional)'); expect(INTRO_LINES).toHaveLength(1);
    const q = read('src/ui/quickPrefs.ts'); expect(q).toContain('id="qpSkip"'); const html = prefsHtml('freshwater', emptyAnswers()); expect(html + q.split('dlg.innerHTML')[1]).not.toMatch(/disabled|required|\*/);
  });
  it('the screen shows on New Setup and toolbar New, not on Open, a starter, a deal, a file or Continue', () => {
    const doors: Record<StartDoor, boolean> = { 'new-setup': true, 'toolbar-new': true, 'open-existing': false, starter: false, deal: false, continue: false, 'open-file': false };
    for (const [d, want] of Object.entries(doors)) expect(showsIntro(d as StartDoor)).toBe(want);
    expect(read('src/ui/startMode.ts').match(/showQuickPrefs\(/g)?.length).toBe(1); expect(read('src/ui/panels.ts')).not.toContain('showQuickPrefs');
  });
  it('the Constraints menu has the Your preferences block on the same writer; Skip writes nothing', () => {
    expect(read('index.html')).toContain('id="prefsHost"'); expect(read('src/ui/panels.ts')).toContain('attachPrefsBlock');
    const q = read('src/ui/quickPrefs.ts'); expect(q).toContain('applyQuickPrefs'); expect(q).toContain('finish(false)');
  });
});

describe('size slider', () => {
  it('the thumb position reads back as exactly one band, gallons interpolate inside it, and the stored answer stays the band', async () => {
    const { slideSize, sizeSliderHtml } = await import('../src/ui/quickPrefs');
    const { galAt, sizeAtBand } = await import('../src/scene/sizePrefs');
    expect([0, 332, 334, 666, 667, 1000].map(v => sizeAtBand(v / 1000))).toEqual(['small', 'small', 'medium', 'medium', 'large', 'large']);
    expect(galAt('freshwater', 0)).toBe(5); expect(galAt('freshwater', 1)).toBe(150); expect(galAt('saltwater', 0.5)).toBe(52);
    const a = slideSize(emptyAnswers(), 500), b = applyQuickPrefs(fresh(), a);
    expect(a.size).toBe('medium'); expect(answersOf(b).size).toBe('medium'); expect(answersOf(b).sizeAt).toBe(0.5);
    const h = sizeSliderHtml('terrarium', a); expect(h).toContain('type="range"'); expect(h).toContain('data-sizeat'); expect(h).not.toContain('gal');
  });
});

describe('GR-RANGE gallon range (aquariums)', () => {
  it('the line is log-scaled from the smallest Small to the largest Large, graduated, with the three bands under it', async () => {
    const { galSpan, galToPos, posToGal, galTicks, bandSpans, galRangeText } = await import('../src/scene/sizePrefs');
    const { sizeSliderHtml } = await import('../src/ui/quickPrefs');
    expect(galSpan('freshwater')).toEqual({ lo: 5, hi: 150 }); expect(galSpan('saltwater')).toEqual({ lo: 10, hi: 200 });
    expect(posToGal('freshwater', 0)).toBe(5); expect(posToGal('freshwater', 1)).toBe(150); expect(posToGal('freshwater', galToPos('freshwater', 40))).toBe(40);
    expect(galTicks('freshwater')).toEqual([5, 10, 15, 20, 30, 40, 55, 75, 100, 150]);
    const s = bandSpans('freshwater'); for (const k of SIZE_CHOICES) expect(s[k].to - s[k].from).toBeGreaterThan(0.25);   // log scale: no band crushed
    expect(galRangeText('freshwater', { lo: 20, hi: 54 })).toBe('20-54 gal'); expect(galRangeText('freshwater', { lo: 5, hi: 40 })).toBe('Up to 40 gal');
    expect(galRangeText('freshwater', { lo: 55, hi: 150 })).toBe('55+ gal'); expect(galRangeText('freshwater', { lo: 5, hi: 150 })).toBe('Any size'); expect(galRangeText('freshwater', { lo: 5, hi: 5 })).toBe('5 gal or under');
    const h = sizeSliderHtml('freshwater', emptyAnswers());
    expect(h.match(/data-gal="(lo|hi)"/g)).toHaveLength(2); expect(h).toContain('Not set'); expect(h).toContain('>≤5<'); expect(h).toContain('>150+<'); expect(h).toContain('>100<');
    expect(h).not.toContain('qp-band'); expect(h).not.toContain('data-sizefirm'); expect(h).not.toContain('data-size="unsure"');   // Nathan 2026-11-12: no bands, no buttons
  });
  it('two thumbs write a FIRM min-max range, read back, open at the stops, and Unsure clears it', async () => {
    const { slideGal } = await import('../src/ui/quickPrefs');
    const { galToPos } = await import('../src/scene/sizePrefs');
    const at = (g: number) => Math.round(galToPos('freshwater', g) * 400);
    const a = slideGal('freshwater', emptyAnswers(), at(40), at(15)), b = applyQuickPrefs(fresh(), a);   // crossed thumbs: the smaller is the minimum
    expect(a.gal).toEqual({ lo: 15, hi: 40 }); expect(a.size).toBeUndefined();
    expect(rangeOf(b, 'constraints.tankGal')).toEqual({ min: 15, max: 40 }); expect(getItem(b, 'constraints.tankGal')!.status).toBe('hard');
    expect(answersOf(b).gal).toEqual({ lo: 15, hi: 40 }); expect(readQuickPrefs(b).sizeGal).toEqual({ value: { lo: 15, hi: 40 }, strength: 'hard' });
    const up = applyQuickPrefs(fresh(), slideGal('freshwater', emptyAnswers(), 0, at(40))), down = applyQuickPrefs(fresh(), slideGal('freshwater', emptyAnswers(), at(55), 400));
    expect(rangeOf(up, 'constraints.tankGal')).toEqual({ max: 40 }); expect(answersOf(up).gal).toEqual({ lo: 5, hi: 40 });   // bottom stop = 5 gal and under: no minimum
    expect(rangeOf(down, 'constraints.tankGal')).toEqual({ min: 55 }); expect(answersOf(down).gal).toEqual({ lo: 55, hi: 150 });   // top stop = 150 gal+: no maximum
    expect(getItem(applyQuickPrefs(fresh(), slideGal('freshwater', emptyAnswers(), 0, 400)), 'constraints.tankGal')).toBeUndefined();   // both stops: any size
    expect(answersOf(applyQuickPrefs(b, A({ size: 'large' }))).gal).toEqual({ lo: 55, hi: 150 });
    expect(getItem(applyQuickPrefs(b, press(answersOf(b), { size: 'unsure' })), 'constraints.tankGal')).toBeUndefined();
    const { setStatus } = await import('../src/scene/brief');
    const firm = setStatus(b, 'constraints.tankGal', 'hard'), moved = applyQuickPrefs(firm, slideGal('freshwater', answersOf(firm), at(20), at(30)));
    expect(getItem(moved, 'constraints.tankGal')!.status).toBe('hard'); expect(rangeOf(moved, 'constraints.tankGal')).toEqual({ min: 20, max: 30 });
  });
});
