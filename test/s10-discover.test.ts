// Lane S10 (2026-11-14; UI2 step 10): Discover modes, "Ideas for ..." scope, the Get started checklist and the animal-first door.
import { describe, expect, it, beforeEach } from 'vitest';
import { defaultScene, defaultSetup, emptyScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache } from '../src/scene/pairGen';
import { createInline, applyCard } from '../src/ui/discover/logic';
import { discoverTabs } from '../src/scene/discoverScope';
import { MODES, modeOf, presetOfMode, ideasLabel, scopeOf, scopeName, scopedStore, gapsIn, addPick, removePick, bumpPick, doorPlan, animalScene } from '../src/shell/logic/discover';
import { checklistOf, isNewTank, showChecklist } from '../src/shell/logic/checklist';
import type { DiscoveryProposal } from '../src/scene/discover';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN };
  t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
const OPTS = { budgetMs: 30000, now: 1e12 };
beforeEach(() => clearPairCache());

describe('S10 modes', () => {
  it('lists the six modes Nathan asked for, in order', () => {
    expect(MODES.map(m => m.id)).toEqual(['explore', 'remix', 'refine', 'gaps', 'whole', 'thisthat']);
    expect(modeOf('gaps').label).toBe('Fill only the gaps');
  });
  it('Explore / Remix / Refine are the D3 presets; Whole tank runs wide', () => {
    expect((['explore', 'remix', 'refine', 'gaps', 'thisthat'] as const).map(m => presetOfMode(m))).toEqual(['explore', 'remix', 'refine', null, null]);
    expect(presetOfMode('whole')).toBe('explore');
  });
});

describe('S10 Ideas for ... scope', () => {
  it('has a button for Tank, Scape, Plants and Animals only', () => {
    expect((['tank', 'scape', 'plants', 'animals', 'equipment', 'print', 'settings', 'discover'] as const).map(s => ideasLabel(s)))
      .toEqual(['Ideas for Tank', 'Ideas for Scape', 'Ideas for Plants', 'Ideas for Animals', undefined, undefined, undefined, undefined]);
    expect(scopeOf('scape')).toEqual(['hardscape', 'substrate']);
    expect(scopeName(scopeOf('plants'))).toBe('Plants');
    expect(scopeName(undefined)).toBe('Everything');
  });
  it('a scoped store shows the engine only the scoped tabs and never writes the design', () => {
    const s = new Store({ ...defaultScene(), tanks: [project()] });
    const before = JSON.stringify(s.scene), rev = s.rev;
    const sc = scopedStore(s, ['plants']);
    expect(discoverTabs(sc.effTank)).toEqual(['plants']);
    expect(discoverTabs(s.effTank).length).toBeGreaterThan(1);
    expect(JSON.stringify(s.scene)).toBe(before); expect(s.rev).toBe(rev);
    expect(scopedStore(s, undefined)).toBe(s);
  });
  it('Ideas for Plants proposes only plant changes', () => {
    const s = new Store({ ...defaultScene(), tanks: [project()] });
    const c = createInline(scopedStore(s, ['plants']), { brief: () => emptyBrief(), show: () => {}, opts: OPTS });
    c.setPreset('remix');
    const r = c.run('regen');
    if (r.ok) {
      expect(r.preview.rows.every(x => x.tab === 'plants' || x.tab === 'gear')).toBe(true);
      expect(JSON.stringify(r.preview.after.tank)).toBe(JSON.stringify(s.tank.tank));
      expect(r.preview.after.fish.map(f => f.species).sort()).toEqual(s.tank.fish.map(f => f.species).sort());
    }
  });
});

describe('S10 Apply is one undo step and Undo restores the design exactly', () => {
  it('Remix preview writes nothing; Apply then Undo gives the same design byte for byte', () => {
    const s = new Store({ ...defaultScene(), tanks: [project()] });
    const c = createInline(s, { brief: () => emptyBrief(), show: () => {}, opts: OPTS });
    const before = JSON.stringify(s.scene), rev = s.rev;
    c.setPreset('remix');
    const r = c.run('regen');
    expect(JSON.stringify(s.scene)).toBe(before); expect(s.rev).toBe(rev);
    if (!r.ok) return;
    expect(c.apply().ok).toBe(true);
    s.undo(); expect(JSON.stringify(s.scene)).toBe(before);
  });
  it('Keep = apply + lock the applied pieces in the same step; Undo drops both', () => {
    const s = new Store({ ...defaultScene(), tanks: [project()] });
    const c = createInline(s, { brief: () => emptyBrief(), show: () => {}, opts: OPTS });
    const before = JSON.stringify(s.scene);
    c.setPreset('explore');
    const r = c.run('regen'); if (!r.ok) return;
    expect(applyCard(s, r.preview.proposal as unknown as DiscoveryProposal, true).ok).toBe(true);
    s.undo(); expect(JSON.stringify(s.scene)).toBe(before);
  });
  it('Fill only the gaps looks only at empty sections', () => {
    const t = project(); t.fish = [];
    const s = new Store({ ...defaultScene(), tanks: [t] });
    expect(gapsIn(s.effTank)).toContain('animals');
    expect(gapsIn(s.effTank, ['plants'])).not.toContain('animals');
  });
});

describe('S10 Get started checklist', () => {
  it('a new empty tank has 0 of 5 ticks and is shown', () => {
    const T = emptyScene().tanks[0];
    const c = checklistOf(T);
    expect(c.steps.map(x => x.id)).toEqual(['tank', 'scape', 'plants', 'animals', 'equipment']);
    expect(c.done).toBe(0); expect(isNewTank(T)).toBe(true); expect(showChecklist(T, false)).toBe(true);
  });
  it('a built example ticks animals and plants; hiding it hides it', () => {
    const T = project(); const c = checklistOf(T);
    expect(c.steps.find(x => x.id === 'animals')!.done).toBe(true);
    expect(c.steps.find(x => x.id === 'plants')!.done).toBe(true);
    expect(showChecklist(T, true)).toBe(false);
    expect(showChecklist(T, false)).toBe(false);          // a tank that already has a design never shows it
    const blank = emptyScene().tanks[0];
    expect(showChecklist(blank, false)).toBe(true); expect(showChecklist(blank, true)).toBe(false);
    blank.fish = T.fish.slice(0, 1);                      // first piece placed: it stays once it was showing
    expect(showChecklist(blank, false, true)).toBe(true); expect(showChecklist(blank, false, false)).toBe(false);
  });
  it('picking a catalogue tank ticks the tank step', () => {
    const T = emptyScene().tanks[0]; T.product = { model: 'x' };
    expect(checklistOf(T).steps[0].done).toBe(true);
  });
});

describe('S10 animal-first door', () => {
  it('plans the smallest tank that holds the animals and builds a project around them', () => {
    let picks = addPick([], 'neon'); picks = addPick(picks, 'not-a-species');
    expect(picks.length).toBe(1);
    const p = doorPlan(picks); expect(p.ok).toBe(true); expect(p.gallons).toBeGreaterThan(0);
    const sc = animalScene(picks, 'in'); expect(sc).toBeTruthy();
    expect(sc!.tanks[0].fish.length).toBe(picks[0].n); expect(sc!.tanks[0].product?.model).toBeTruthy(); expect(sc!.units).toBe('in');
    expect(bumpPick(picks, 'neon', 2)[0].n).toBe(picks[0].n + 2);
    expect(removePick(picks, 'neon')).toEqual([]);
    expect(animalScene([], 'in')).toBeUndefined();
  });
});
