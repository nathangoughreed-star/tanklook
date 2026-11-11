// SZ1: smooth soft size preference (flat plateau, log-Gaussian falloff) plus a Firm toggle on the Size row. Live nextPair path.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { clearPairCache, nextPair, type ScoredRow } from '../src/scene/pairGen';
import { emptyBrief, getItem, setRange, setStatus } from '../src/scene/brief';
import { setDirection } from '../src/scene/project';
import { applyQuickPrefs, answersOf, emptyAnswers, readQuickPrefs } from '../src/scene/quickPrefs';
import { rangeFit, STATED } from '../src/scene/scorePolicy';
import { prefsHtml, press } from '../src/ui/quickPrefs';
import type { Fish, TankSetup } from '../src/scene/types';
import type { CandidateRecord, DiscoverySession } from '../src/scene/discoveryTypes';

describe('rangeFit: flat inside, log-Gaussian outside', () => {
  const r = { lo: 20, hi: 40 };
  it('plateau: 1 anywhere inside, no peak in the middle', () => { for (const g of [20, 25, 30, 35, 40]) expect(rangeFit(g, r)).toBe(1); });
  it('20-40 gal: 55 gal ~0.66, 80 gal ~0.14, 10 gal ~0.14; edges are +-1 SD', () => {
    expect(rangeFit(55, r)).toBeCloseTo(0.66, 2); expect(rangeFit(80, r)).toBeCloseTo(0.135, 2); expect(rangeFit(10, r)).toBeCloseTo(0.135, 2);
    expect(rangeFit(40 * 2 ** 0.5, r)).toBeCloseTo(Math.exp(-0.5), 2);
  });
  it('monotone falling away from the range; narrow range is not a cliff; open ends never penalise', () => {
    expect(rangeFit(60, r)).toBeGreaterThan(rangeFit(90, r));
    expect(rangeFit(45, { lo: 40, hi: 41 })).toBeGreaterThan(0.2);
    expect(rangeFit(500, { lo: 0, hi: Infinity })).toBe(1); expect(rangeFit(1, { lo: 0, hi: Infinity })).toBe(1);
  });
});

const fishOf = (sp: string, n: number, from = 100): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species: sp, x: 100 + (i % 8) * 60, y: 100, depth: 60 + (i % 5) * 60, yaw: 0, pitch: 0, roll: 0, bend: 0 } as Fish));
function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1); t.fish = fishOf('ember', 6, 201);
  return ensureUids(t);
}
const session = (): DiscoverySession => ({ id: 's1', baseRev: 1, scope: ['tank', 'animals', 'plants', 'hardscape', 'substrate'], freezes: [], direction: 'freshwater', comparisons: [], status: 'active' });
beforeEach(() => clearPairCache());
const live = (brief = emptyBrief()) => { let rows: ScoredRow[] = []; const hist = new Map<string, CandidateRecord>(); const r = nextPair({ tank: project(), rev: 1 }, brief, session(), id => hist.get(id), { scores: x => { rows = x; }, budgetMs: 6000 }); return { r, rows }; };
const gal = (x: ScoredRow) => parseFloat(x.breakdown.terms.find(t => t.name === 'size')?.why ?? '');
const sizeV = (x: ScoredRow) => x.breakdown.terms.find(t => t.name === 'size')?.v ?? 0;

describe('live nextPair', () => {
  it('soft 20-40: larger tanks stay eligible and rank by closeness (nearer above farther); size term is shown with its fit', () => {
    const { r, rows } = live(setRange(emptyBrief(), 'constraints.tankGal', { min: 20, max: 40 }, 'preference'));
    expect(r.ok).toBe(true);
    const out = rows.filter(x => gal(x) > 40);
    expect(out.length).toBeGreaterThan(0);
    const sorted = [...out].sort((a, b) => gal(a) - gal(b));
    for (let i = 1; i < sorted.length; i++) expect(sizeV(sorted[i - 1])).toBeGreaterThanOrEqual(sizeV(sorted[i]) - 1e-9);
    for (const x of out) { expect(sizeV(x)).toBeLessThan(STATED.sizeIn); expect(sizeV(x)).toBeGreaterThanOrEqual(STATED.sizeOut - 1e-9); expect(x.breakdown.terms.find(t => t.name === 'size')!.why).toContain('fit'); }
    const near = out.find(x => gal(x) <= 60), far = out.find(x => gal(x) >= 80);
    if (near && far) expect(sizeV(near)).toBeGreaterThan(sizeV(far));
  }, 120000);
  it('Firm 20-40: nothing outside is generated', () => {
    const a = { ...emptyAnswers(), size: 'medium' as const, sizeFirm: true }, b = applyQuickPrefs(setDirection(emptyBrief(), 'freshwater'), a);
    expect(getItem(b, 'constraints.tankGal')!.status).toBe('hard');
    const { r, rows } = live(setStatus(setRange(emptyBrief(), 'constraints.tankGal', { min: 20, max: 54 }, 'hard'), 'constraints.tankGal', 'hard'));
    expect(r.ok).toBe(true); for (const x of rows) expect(gal(x)).toBeLessThanOrEqual(54);
  }, 120000);
});

describe('Firm toggle on the Size row', () => {
  const fresh = () => setDirection(emptyBrief(), 'freshwater');
  it('the row has Preference / Firm buttons, Firm on only after it is pressed, and pressing does nothing without a size', () => {
    const a = { ...emptyAnswers(), size: 'medium' as const };
    expect(prefsHtml('freshwater', a)).toMatch(/data-sizefirm="0"[^>]*aria-pressed="true"/);
    const f = press(a, { sizefirm: '1' }); expect(f.sizeFirm).toBe(true);
    expect(prefsHtml('freshwater', f)).toMatch(/data-sizefirm="1"[^>]*aria-pressed="true"/);
    expect(press(emptyAnswers(), { sizefirm: '1' }).sizeFirm).toBeUndefined();
    expect(press(f, { size: 'unsure' }).sizeFirm).toBeUndefined();
  });
  it('sync: the screen and the left block share one writer; Firm survives a round trip and turns the range hard; clearing it retracts', () => {
    const b = applyQuickPrefs(fresh(), press({ ...emptyAnswers(), size: 'medium' }, { sizefirm: '1' }));
    expect(answersOf(b).sizeFirm).toBe(true); expect(readQuickPrefs(b).sizeGal!.strength).toBe('hard'); expect(getItem(b, 'constraints.tankGal')!.status).toBe('hard');
    const soft = applyQuickPrefs(b, press(answersOf(b), { sizefirm: '0' }));
    expect(answersOf(soft).sizeFirm).toBeUndefined(); expect(readQuickPrefs(soft).sizeGal!.strength).toBe('prefer');
    expect(getItem(applyQuickPrefs(b, emptyAnswers()), 'constraints.tankGal')).toBeUndefined();
  });
  it('dry habitats: Firm makes floor and height hard', () => {
    const q = readQuickPrefs(applyQuickPrefs(setDirection(emptyBrief(), 'terrarium'), { ...emptyAnswers(), size: 'medium', sizeFirm: true }));
    expect(q.floorSqIn!.strength).toBe('hard'); expect(q.heightIn!.strength).toBe('hard');
  });
});
