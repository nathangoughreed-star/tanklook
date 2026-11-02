// Re-evaluation without destruction (lane GS6, 2026-11-02): src/scene/reeval.ts, pure. The same pieces adapt to a new tank; nothing is regenerated.
import { describe, expect, it } from 'vitest';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { recipeScene } from '../src/scene/recipes';
import { adaptScene, adaptToTank, handOff, hasDesign, stockingChange, suggestedAnimals } from '../src/scene/reeval';
import { emptyBrief, setItem, setVision } from '../src/scene/brief';
import { emptyScene } from '../src/scene/defaults';
import { isOver, stockingOf } from '../src/scene/stocking';
import { itemDims } from '../src/scene/items';
import type { Fish, TankSetup } from '../src/scene/types';

const M40 = getTankModel('g40b')!, M29 = getTankModel('g29')!, M20 = getTankModel('g20h') ?? getTankModel('g20')!;
const forest = (animals = [{ species: 'neon', n: 15 }]) => recipeScene('underwater-forest', 'full', M40, animals)!;
const hard = (S: TankSetup) => S.items.filter(i => i.kind !== 'plant' && i.kind !== 'artificial');
const bare = () => emptyScene().tanks[0];

describe('adaptToTank: the same pieces, scaled, repositioned and thinned', () => {
  it('a smaller tank keeps every hardscape piece (same ids, seeds and variants), scaled to keep its share of the floor', () => {
    const S = forest(), before = hard(S), { scene, report } = adaptScene(S, tankFromModel(M29));
    const after = hard(scene);
    expect(after.map(i => [i.id, i.kind, i.variant, i.seed])).toEqual(before.map(i => [i.id, i.kind, i.variant, i.seed]));
    expect(report.footprintRatio).toBeLessThan(1);
    expect(report.factor).toBeCloseTo(Math.sqrt(report.footprintRatio), 5);
    for (let k = 0; k < before.length; k++) expect(after[k].size).toBeLessThan(before[k].size);
    expect(report.scaled).toBe(before.length);
    expect(report.lines.join(' ')).toMatch(/gal to .* gal/);
  });
  it('everything ends inside the new footprint and no taller than the new tank', () => {
    const { scene } = adaptScene(forest(), tankFromModel(M29));
    const { L, D, H } = scene.tank;
    for (const it of scene.items) { expect(it.x).toBeGreaterThanOrEqual(0); expect(it.x).toBeLessThanOrEqual(L); expect(it.depth).toBeGreaterThanOrEqual(0); expect(it.depth).toBeLessThanOrEqual(D); expect(itemDims(it)[1] + Math.max(0, it.lift)).toBeLessThanOrEqual(H * 1.001); }
    for (const f of scene.fish) { expect(f.x).toBeLessThanOrEqual(L + 1e-6); expect(f.depth).toBeLessThanOrEqual(D + 1e-6); expect(f.y).toBeLessThanOrEqual(H + 1e-6); }
  });
  it('plants are thinned in proportion to the floor, every kind is kept, and only the named ones go', () => {
    const S = forest(), { scene, report } = adaptScene(S, tankFromModel(M29));
    const kinds = (X: TankSetup) => new Set(X.items.filter(i => i.kind === 'plant').map(i => i.variant));
    expect(kinds(scene)).toEqual(kinds(S));
    const plants = (X: TankSetup) => X.items.filter(i => i.kind === 'plant').length;
    expect(plants(S) - plants(scene)).toBe(report.thinned.length);
    expect(report.thinned.length).toBeGreaterThan(0);
    expect(plants(scene) / plants(S)).toBeGreaterThan(report.footprintRatio * 0.85);   // about n x area ratio, rounded per kind, never the last of a kind
    const gone = new Set(report.thinned.map(t => t.id));
    expect(S.items.filter(i => !gone.has(i.id)).map(i => i.id)).toEqual(scene.items.map(i => i.id));
  });
  it('the roster is never touched: the same animals, the same count, the same lengths', () => {
    const S = forest([{ species: 'neon', n: 15 }]), { scene } = adaptScene(S, tankFromModel(M29));
    expect(scene.fish.map(f => [f.id, f.species, f.tl])).toEqual(S.fish.map(f => [f.id, f.species, f.tl]));
  });
  it('slider drags (thin: false) only move and scale: dragging down and back up loses nothing', () => {
    const S = forest(), n = S.items.length, small = adaptScene(S, tankFromModel(M29), { thin: false }).scene;
    expect(small.items.length).toBe(n);
    adaptToTank(small, tankFromModel(M40), { thin: false });
    expect(small.items.length).toBe(n);
  });
  it('a bigger tank keeps its pieces as they are (never blown up), repositioned onto the larger floor', () => {
    const S = recipeScene('underwater-forest', 'balanced', M20, [{ species: 'neon', n: 10 }])!, size0 = hard(S).map(i => i.size), { scene, report } = adaptScene(S, tankFromModel(M40));
    expect(report.factor).toBe(1); expect(report.thinned).toEqual([]);
    expect(hard(scene).map(i => i.size)).toEqual(size0);
    expect(scene.items.length).toBe(S.items.length);
  });
  it('the same tank again is a no-op; the input scene is never mutated by adaptScene', () => {
    const S = forest(), json = JSON.stringify(S);
    expect(adaptScene(S, { ...S.tank }).report.lines).toEqual([]);
    adaptScene(S, tankFromModel(M20)); expect(JSON.stringify(S)).toBe(json);
  });
  it('painted patches follow the floor', () => {
    const S = bare(); S.tank = tankFromModel(M40); S.patches = [{ id: 1, brush: 'moss', seed: 3, size: 60, density: 50, path: [100, 100, 500, 300], cuts: [300, 200, 20] }];
    adaptToTank(S, tankFromModel(M29));
    const rl = S.tank.L / tankFromModel(M40).L, rd = S.tank.D / tankFromModel(M40).D;
    expect(S.patches![0].path).toEqual([Math.round(100 * rl), Math.round(100 * rd), Math.round(500 * rl), Math.round(300 * rd)]);
    expect(S.patches![0].size).toBeLessThan(60);
  });
});

describe('stocking is re-assessed in the new tank, with a named warning when over', () => {
  const withN = (S: TankSetup, n: number): TankSetup => { const X = structuredClone(S), f0 = X.fish[0]; X.fish = Array.from({ length: n }, (_, i) => ({ ...f0, id: i + 1 }) as Fish); return X; };
  it('15 neon tetras: 40 gal to 29 gal is a higher percent and not over; the roster is unchanged', () => {
    const S = forest(), { scene } = adaptScene(S, tankFromModel(M29)), c = stockingChange(S, scene);
    expect(c.now).toBeGreaterThan(c.was); expect(c.over).toBe(false); expect(c.warning).toBeUndefined();
    expect(c.animals).toEqual([{ species: 'neon', name: 'Neon tetra', n: 15 }]);
  });
  it('a roster that fits the 40 but not the 29 gets a warning that names the animals, the numbers and both tanks, and keeps every animal', () => {
    const S = forest(), fits = (n: number) => !isOver(stockingOf(withN(S, n)).loadPercent) && isOver(stockingOf(adaptScene(withN(S, n), tankFromModel(M29)).scene).loadPercent);
    let n = 15; while (n < 400 && !fits(n)) n++;
    expect(n).toBeLessThan(400);
    const big = withN(S, n), { scene } = adaptScene(big, tankFromModel(M29)), c = stockingChange(big, scene);
    expect(c.over).toBe(true); expect(c.warning).toMatch(new RegExp(`${n} Neon tetras`));
    expect(c.warning).toMatch(/gal/); expect(c.warning).toMatch(/Your animals are unchanged/);
    expect(scene.fish.length).toBe(n);
  });
  it('no animals: nothing to warn about', () => { const S = bare(); expect(stockingChange(S, S)).toMatchObject({ over: false, was: 0, now: 0 }); });
});

describe('the Guided hand-off is an update of what is there', () => {
  it('a pristine scene is taken whole (nothing to lose); the look\'s own animals are suggestions, not the roster', () => {
    const cur = bare(), gen = forest();
    expect(hasDesign(cur)).toBe(false);
    const ho = handOff(cur, gen);
    expect(ho.fresh).toBe(true); expect(ho.scene.fish).toEqual([]); expect(ho.scene.items.length).toBe(gen.items.length);
  });
  it('a design in place keeps its tank, gear and roster; only the look is replaced', () => {
    const cur = forest(), other = recipeScene('underwater-forest', 'open', M40, [{ species: 'neon', n: 15 }])!;
    cur.light = { ...cur.light, owned: true };
    const ho = handOff(cur, other);
    expect(ho.fresh).toBe(false);
    expect(ho.scene.fish).toEqual(cur.fish); expect(ho.scene.tank).toEqual(cur.tank); expect(ho.scene.light).toEqual(cur.light); expect(ho.scene.stand).toEqual(cur.stand);
    expect(ho.scene.items).toEqual(other.items);
    expect(ho.kept.join(' ')).toMatch(/Neon tetras/);
  });
  it('a different tank in the new look adapts the roster into it; picked animals join, suggested ones never do', () => {
    const cur = forest([{ species: 'neon', n: 15 }]), gen = recipeScene('underwater-forest', 'balanced', M29, [{ species: 'neon', n: 15 }, { species: 'corypanda', n: 6 }])!;
    const extra = gen.fish.find(f => f.species !== 'neon')?.species;
    expect(extra).toBeTruthy();
    const none = handOff(cur, gen);
    expect(none.scene.fish.map(f => f.species)).toEqual(cur.fish.map(f => f.species));
    expect(none.scene.tank.L).toBeCloseTo(gen.tank.L, 3);
    const picked = handOff(cur, gen, { accept: [extra!] });
    expect(picked.scene.fish.filter(f => f.species === extra).length).toBe(gen.fish.filter(f => f.species === extra).length);
    expect(new Set(picked.scene.fish.map(f => f.id)).size).toBe(picked.scene.fish.length);
  });
  it('never mutates the scene it was given', () => {
    const cur = forest(), gen = recipeScene('underwater-forest', 'open', M29, [{ species: 'neon', n: 15 }])!, json = JSON.stringify(cur);
    handOff(cur, gen); expect(JSON.stringify(cur)).toBe(json);
  });
  it('the look\'s focal animals are offered as suggestions, minus what the roster already has', () => {
    let b = setVision(emptyBrief(), { secondaryLikes: [], archetypeId: 'underwater-forest', density: 'full' });
    const all = suggestedAnimals(b, 'g40b').map(x => x.species);
    expect(all.length).toBeGreaterThan(0);
    b = setItem(b, 'animals.stock', [{ species: all[0], count: 4 }], 'preference');
    expect(suggestedAnimals(b, 'g40b').map(x => x.species)).not.toContain(all[0]);
  });
});
