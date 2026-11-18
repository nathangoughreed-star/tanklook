// R136: "Apply" on the bundle card (Cost drawer). The plan lists one line per swapped part; applying puts the bundle's parts in as kit
// parts (held like a kit start, priced as the bundle); making the plan changes nothing (Cancel = never applying).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { defaultProfile } from '../src/demand';
import { pinnedDeal } from '../src/demand/pinned';
import { lockObject } from '../src/scene/locks';
import { applyBundle, applyPlan } from '../src/shell/logic/deals';

const NOW = Date.parse('2026-11-18'), P = defaultProfile();
const mk = () => { const s = new Store(parseScene(JSON.parse(SCENES.clownnano)).scene); s.update(() => {}, { history: false }); return s; };
const plan = (s: Store, id = 'petsmart-top-fin-essentials-20') => applyPlan(s.tank, P, id, NOW)!;

describe('apply the bundle (R136)', () => {
  it('the plan has one line per swapped part, with numbers, and changes nothing', () => {
    const s = mk(), before = JSON.stringify(s.scene), p = plan(s);
    expect(p).toBeTruthy();
    expect(JSON.stringify(s.scene)).toBe(before);
    expect(p.lines.some(l => /^Light: .*PAR/.test(l))).toBe(true);
    expect(p.lines.some(l => /^Filter: .*gph, against/.test(l))).toBe(true);
    expect(p.lines.some(l => /^Heater: /.test(l))).toBe(true);
    expect(p.loses).toEqual([]);
  });
  it('applying swaps the parts in, locks them like a kit start, and prices the bundle; undo puts the build back', () => {
    const s = mk(), p = plan(s), before = JSON.stringify(s.tank.tech) + JSON.stringify(s.tank.light);
    applyBundle(s, p);
    const t = s.tank;
    expect(pinnedDeal(t)?.id).toBe(p.deal.id);
    const kit = t.locks!.objects.filter(o => o.kit).map(o => o.target);
    expect(kit).toEqual(expect.arrayContaining(['light', 'filter', 'heater']));
    expect(t.tech?.filters?.[0]?.kit).toBe(true);
    expect(JSON.stringify(t.tech) + JSON.stringify(t.light)).not.toBe(before);
    s.undo();
    expect(JSON.stringify(s.tank.tech) + JSON.stringify(s.tank.light)).toBe(before);
    expect(s.tank.locks?.objects.some(o => o.kit) ?? false).toBe(false);
  });
  it('a part the user had locked is named as lost, and is replaced by the kit lock', () => {
    const s = mk(); s.update(sc => { lockObject(sc.tanks[sc.active], 'light'); });
    const p = plan(s);
    expect(p.loses.join(' ')).toMatch(/locked light is replaced \(you locked it\)/);
    applyBundle(s, p);
    expect(s.tank.locks!.objects.find(o => o.target === 'light')?.kit).toBe(true);
  });
});
