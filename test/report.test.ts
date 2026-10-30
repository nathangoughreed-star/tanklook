import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { defaultProfile } from '../src/demand/types';
import { reportHtml, reportOf } from '../src/ui/report';
import { setItem, setRange } from '../src/scene/brief';
import { emptyBrief } from '../src/ui/setupBrief';

// The printable report (lane GV3). Fixed `now` keeps the prices stable.
const NOW = Date.parse('2026-10-30');
const scene = (id: string) => parseScene(SCENES[id]).scene;
const SECTIONS = ['rundown', 'picture', 'have', 'shopping', 'costs', 'living', 'warnings'];

describe('report', () => {
  it('has every section for the paludarium example, in US units', () => {
    const sc = scene('paludarium'), r = reportOf(sc, 0, defaultProfile(), NOW), html = reportHtml(r, 'data:image/jpeg;base64,AAAA');
    for (const s of SECTIONS) expect(html, s).toContain(`data-rp="${s}"`);
    expect(r.kind).toBe('Vivarium');
    expect(r.dims).toMatch(/^[\d.]+ x [\d.]+ x [\d.]+ in$/);
    expect(r.gallons).toBeGreaterThan(0);
    expect(r.animals.length).toBeGreaterThan(0);
    expect(r.difficulty?.word).toBeTruthy();
    expect(r.buyFirst.length).toBeGreaterThan(0);
    expect(r.buyLater.map(l => l.label)).toEqual(['Animals']);
    expect(r.living.find(l => l.title === 'Plants')!.rows.length).toBeGreaterThan(0);
    expect(r.tiers.minimum.setupUsd).toBeLessThanOrEqual(r.tiers.ideal.setupUsd);
    expect(html).toContain('<img src="data:image/jpeg');
    expect(html).not.toMatch(/\bcm\b|litre|°C/);
  });

  it('prices owned gear at $0 and takes it out of the totals', () => {
    const sc = scene('paludarium'), S = sc.tanks[0], P = defaultProfile();
    const before = reportOf(sc, 0, P, NOW), tank = before.buyFirst.find(l => /^tank/i.test(l.label))!;
    expect(tank, before.buyFirst.map(l => l.label).join('|')).toBeTruthy();
    S.light.owned = true; S.brief = setItem(setItem(S.brief ?? emptyBrief(), 'constraints.existingTank', { model: 'x' }, 'locked'), 'constraints.owned', { stand: 'care' }, 'hard');
    const after = reportOf(sc, 0, P, NOW), html = reportHtml(after);
    expect(after.buyFirst.some(l => /^tank/i.test(l.label))).toBe(false);
    expect(after.have.map(h => h.usd)).toEqual(after.have.map(() => 0));
    expect(after.have.some(h => /^light/i.test(h.label))).toBe(true);
    expect(after.have.some(h => /^tank/i.test(h.label))).toBe(true);
    const stand = before.buyFirst.find(l => l.label === 'Stand')!;
    expect(after.have.some(h => h.label === 'Stand')).toBe(true);
    expect(after.tiers.ideal.setupUsd).toBeLessThan(before.tiers.ideal.setupUsd - tank.usd - stand.usd + 1);
    expect(html).toContain('$0 you have');
  });

  it('an empty section shows a "none" line, and no picture falls back cleanly', () => {
    const sc = scene('paludarium'), S = sc.tanks[0];
    S.fish = []; S.items = S.items.filter(i => i.kind !== 'plant' && i.kind !== 'coral' && i.kind !== 'artificial');
    const r = reportOf(sc, 0, defaultProfile(), NOW), html = reportHtml(r, '');
    expect(r.buyLater).toEqual([]);
    expect(r.have).toEqual([]);
    expect(html).toContain('No picture');
    expect(html).not.toContain('<img');
    expect(html.match(/class="rp-none"/g)!.length).toBeGreaterThanOrEqual(3); // have, buy last, plants
    for (const s of SECTIONS) expect(html, s).toContain(`data-rp="${s}"`);
  });

  it('welfare problems are red and never a tradeoff', () => {
    const sc = scene('betta'), S = sc.tanks[0];
    for (let i = 0; i < 6; i++) S.fish.push({ ...S.fish[0], id: 9000 + i });
    const r = reportOf(sc, 0, defaultProfile(), NOW), html = reportHtml(r);
    expect(r.warnings.some(w => w.level === 'problem'), JSON.stringify(r.warnings)).toBe(true);
    expect(html).toContain('class="rp-problem"');
    expect(html).toContain('not a valid tradeoff');
  });

  it('prints the brief limits as ranges beside the costs and marks a figure outside its range (lane GV9)', () => {
    const sc = scene('paludarium'), S = sc.tanks[0], P = defaultProfile();
    const plain = reportOf(sc, 0, P, NOW);
    expect(plain.limits).toEqual({});
    expect(reportHtml(plain)).not.toContain('Your limit');
    const ideal = plain.tiers.ideal.setupUsd, gal = plain.gallons;
    let b = setRange(S.brief ?? emptyBrief(), 'constraints.budget', { min: 300, max: Math.round(ideal) - 50 });
    b = setRange(b, 'constraints.monthly', { max: 40 });
    b = setRange(b, 'constraints.tankGal', { min: gal + 10 });
    b = setRange(b, 'constraints.setupHours', { max: 10 });
    S.brief = b;
    const r = reportOf(sc, 0, P, NOW), html = reportHtml(r);
    expect(r.limits.budget?.text).toBe(`$300-${(Math.round(ideal) - 50).toLocaleString('en-US')}`);
    expect(r.limits.budget?.ideal).toBe('over');
    expect(r.limits.monthly?.text).toBe('up to $40 a month');
    expect(r.limits.tank).toEqual({ text: `at least ${gal + 10} gal`, ideal: 'under' });
    expect(r.limits.hours?.text).toBe('up to 10 h of set-up');
    expect(r.limits.care).toBeUndefined();
    expect(html).toContain('<th scope="col">Your limit</th>');
    expect(html).toContain('(over your limit)');
    expect(html).toContain('(under your limit)');
    expect(html).toContain('Your set-up time limit: up to 10 h of set-up.');
  });
});
