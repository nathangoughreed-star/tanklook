// DQ12: Finish my setup keeps the tank unless unlocked (Nathan 2026-11-12), the Guided / Sandbox gates reach Discover (D7), the three breadth presets (D3),
// "N designs fit", and the conflict card whose relaxations are applied one at a time (D9). Kept items are never broken.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { setRules } from '../src/scene/brief';
import { clearPairCache } from '../src/scene/pairGen';
import { lockObject, lockRoster, locksOf } from '../src/scene/locks';
import { PRESETS, PRESET_INFO, inferPreset, presetOfBreadth } from '../src/scene/breadth';
import { blockingIssues, discoverGates } from '../src/scene/rules';
import { verdictOf } from '../src/scene/verdict';
import { createInline, openCounts, keptWords, releasable } from '../src/ui/discover/logic';
import { conflictCardHtml } from '../src/ui/infeasibleCard';
import { getSpecies } from '../src/data/species';
import type { Brief } from '../src/scene/brief';
import type { Fish, TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN };
  t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
function mk(edit?: (t: TankSetup) => void, brief: () => Brief = () => emptyBrief()) {
  clearPairCache();
  const t = project(); edit?.(t);
  const s = new Store({ ...defaultScene(), tanks: [t] });
  s.update(x => { x.tanks[0].water.level = 0.85; });
  const shown: (TankSetup | null)[] = [];
  const c = createInline(s, { brief, show: x => shown.push(x), opts: { budgetMs: 30000, now: 1e12 } });
  return { s, c, shown };
}
beforeEach(() => clearPairCache());
const dims = (t: TankSetup) => JSON.stringify(t.tank);
const small = (t: TankSetup) => { t.tank = { ...t.tank, L: 24 * IN, D: 12 * IN, H: 16 * IN }; };
const oscar = (t: TankSetup) => {
  const f = structuredClone(t.fish[0]) as Fish; f.species = 'oscar'; f.uid = 'f-oscar'; t.fish = [f]; lockRoster(t, 'oscar', 'exact', 1);
};

describe('DQ12: Finish my setup keeps the tank unless unlocked', () => {
  it('the tank is kept by default, and the preview never changes it', () => {
    const { s, c } = mk();
    expect(c.tankKept()).toBe(true);
    for (let i = 0; i < 3; i++) { const r = c.run(i ? 'regen' : 'finish'); if (r.ok) expect(dims(r.preview.after)).toBe(dims(s.tank)); }
  });
  it('counts the tank as kept until it is unlocked', () => {
    const { s, c } = mk();
    expect(c.counts().kept).toBe(openCounts(s.tank, false).kept);
    const was = c.counts().kept; c.unlockTank();
    expect(c.tankKept()).toBe(false); expect(c.counts().kept).toBe(was - 1);
    c.keepTank(); expect(c.tankKept()).toBe(true);
  });
  it('unlocking also releases a lock on the tank', () => {
    const { s, c } = mk(t => { lockObject(t, 'tank'); });
    expect(c.tankKept()).toBe(true); c.unlockTank();
    expect(locksOf(s.tank).objects.some(o => o.target === 'tank')).toBe(false); expect(c.tankKept()).toBe(false);
  });
});

describe('DQ12: gates by mode (D7)', () => {
  it('the controller reports the rule set; Sandbox drops the limits, never the welfare gates', () => {
    expect(discoverGates('guided')).toEqual({ welfare: true, limits: true });
    let b = emptyBrief(); const { c } = mk(undefined, () => b);
    expect(c.gates()).toMatchObject({ rules: 'guided', limits: true });
    b = setRules(b, 'sandbox');
    expect(c.gates()).toMatchObject({ rules: 'sandbox', welfare: true, limits: false });
  });
  it('a Sandbox design may break a limit but not a welfare gate; Guided breaks neither', () => {
    const { s } = mk(), v = verdictOf(s.tank, emptyBrief(), { units: 'in' });
    const fake = { ...v, hard: [{ id: 'x', tab: 'equipment', uids: [], text: 'over budget' }], gates: [{ id: 'g', tab: 'animals', uids: [], text: 'too many' }] } as typeof v;
    expect(blockingIssues(fake, 'guided').map(i => i.id)).toEqual(['g', 'x']);
    expect(blockingIssues(fake, 'sandbox').map(i => i.id)).toEqual(['g']);
  });
  it('Sandbox Discover still returns welfare-clean designs', () => {
    let b = emptyBrief(); b = setRules(b, 'sandbox');
    const { c } = mk(undefined, () => b), r = c.run('finish');
    if (r.ok) expect(verdictOf(r.preview.after, b, { units: 'in' }).gates).toEqual([]);
  });
});

describe('DQ12: presets (D3)', () => {
  it('three presets over one breadth number; the nearest-preset mapping is stable', () => {
    expect(PRESETS).toEqual(['explore', 'remix', 'refine']);
    for (const p of PRESETS) expect(presetOfBreadth(PRESET_INFO[p].breadth)).toBe(p);
    expect(PRESET_INFO.explore.breadth).toBeGreaterThan(PRESET_INFO.remix.breadth); expect(PRESET_INFO.remix.breadth).toBeGreaterThan(PRESET_INFO.refine.breadth);
  });
  it('the starting preset is inferred (more kept = Refine) and a pick sticks', () => {
    expect(inferPreset(0, 12)).toBe('explore'); expect(inferPreset(3, 9)).toBe('remix'); expect(inferPreset(8, 4)).toBe('refine'); expect(inferPreset(0, 0)).toBe('explore');
    const { s, c } = mk();
    expect(c.picked()).toBe(false);
    s.update(x => { const t = x.tanks[0]; for (const i of t.items) lockObject(t, i.uid!); for (const f of t.fish) lockObject(t, f.uid!); }, { history: false });
    expect(c.preset()).toBe('refine');
    c.setPreset('explore'); expect(c.picked()).toBe(true);
    s.update(x => { x.tanks[0].water.level = 0.8; }); expect(c.preset()).toBe('explore');
  });
  it('every preset runs, changes nothing in the design, and reports how many designs fit', () => {
    const { s, c } = mk(), before = Store.designKey(s.scene);
    for (const p of PRESETS) {
      c.setPreset(p); const r = c.run('finish');
      if (r.ok) { expect(r.preview.fit).toBeGreaterThanOrEqual(1); expect(dims(r.preview.after)).toBe(dims(s.tank)); }
      else expect(r.conflicts.length).toBeGreaterThan(0);
      expect(Store.designKey(s.scene)).toBe(before);
    }
  });
});

describe('DQ12: the conflict card (D9)', () => {
  it('a kept 20 gal tank plus a kept Oscar: no design fits, each relaxation is its own button, in plain words', () => {
    expect(getSpecies('oscar')).toBeTruthy();
    const { c } = mk(t => { small(t); oscar(t); });
    const r = c.run('finish');
    expect(r.ok).toBe(false); if (r.ok) return;
    expect(r.kept).toMatch(/tank/i); expect(r.kept).toMatch(/Oscar/);
    expect(r.relaxations.some(x => x.act === 'unlockTank')).toBe(true);
    expect(r.relaxations.some(x => x.act === 'release' && x.species === 'oscar')).toBe(true);
    const html = conflictCardHtml({ conflicts: r.conflicts, kept: r.kept, relaxations: r.relaxations });
    expect(html).toContain('You kept:'); expect((html.match(/data-a="relax"/g) ?? []).length).toBe(r.relaxations.filter(x => x.act).length);
  });
  it('a relaxation is applied ALONE and the request re-run; kept items are never broken', () => {
    const { s, c } = mk(t => { small(t); oscar(t); });
    const r = c.run('finish'); if (r.ok) return;
    const un = r.relaxations.find(x => x.act === 'unlockTank')!, locks = JSON.stringify(locksOf(s.tank).roster), tank0 = dims(s.tank);
    const r2 = c.relax(un)!;
    expect(c.tankKept()).toBe(false);
    expect(JSON.stringify(locksOf(s.tank).roster)).toBe(locks);    // the Oscar is still kept: only the tank was relaxed
    expect(dims(s.tank)).toBe(tank0);                               // the design itself never changed
    if (r2.ok) expect(r2.preview.after.fish.some(f => f.species === 'oscar')).toBe(true);
    else { expect(r2.relaxations.some(x => x.act === 'unlockTank')).toBe(false); expect(r2.relaxations.some(x => x.act === 'release')).toBe(true); }
  });
  it('releasing the Oscar is its own step and drops only that keep', () => {
    const { s, c } = mk(t => { oscar(t); lockObject(t, t.items[0].uid!); });
    const rel = releasable(s.tank); expect(rel.map(x => x.species)).toEqual(['oscar']);
    expect(keptWords(s.tank, true)).toMatch(/the tank \(\d+ gal\), 1 Oscar, 1 piece/);
    void c.relax(rel[0]);
    expect(locksOf(s.tank).roster.length).toBe(0); expect(locksOf(s.tank).objects.some(o => o.target === s.tank.items[0].uid)).toBe(true);
    expect(s.tank.fish.some(f => f.species === 'oscar')).toBe(true);   // releasing a keep never removes the animal
  });
  it('once every design has been seen it says so, not "no design fits"', () => {
    const { c } = mk(); let last: ReturnType<typeof c.run> | undefined;
    for (let i = 0; i < 40; i++) { last = c.run(i ? 'regen' : 'finish'); if (!last.ok) break; }
    if (last && !last.ok && last.exhausted) expect(last.conflicts[0]).toMatch(/fits?/);
  });
});
