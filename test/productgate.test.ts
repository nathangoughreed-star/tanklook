// The product gate (2026-10-26, Nathan: "If you pick a style of tank, then everything that comes along with that must remain unless you
// dleiberately change it after a warning message ... We should also clearly distinguish if the tank being worked on is a real
// commercially available tank or a custom size"). scene/integrated.ts holds; ui/panels.ts asks through mayChange, as `change` does here.
import { describe, expect, it } from 'vitest';
import { parseScene } from '../src/scene/validate';
import { Store as SceneStore } from '../src/scene/store';
import { breakNote, locksOf, mayChange, productLabel, releaseProduct, type Held } from '../src/scene/integrated';
import { KITS, type KitModel } from '../src/data/kits';
import { TANK_MODELS, modelOfVariant, pickRimless, tankFromModel, type TankModel, type TankVariant } from '../src/data/tanks';
import { applyTankPick } from '../src/ui/tankPick';
import type { TankSetup } from '../src/scene/types';

const products = TANK_MODELS.filter(m => !m.terrarium).flatMap(m => (m.variants ?? []).map(v => ({ m, v })));
const find = (re: RegExp, f: (v: TankVariant) => boolean = () => true) => products.find(({ v }) => re.test(`${v.brand} ${v.line}`) && f(v))!;

/** What the tank picker does (ui/panels.ts apply -> setTank with the pick). */
function pick(store: SceneStore, m: TankModel, v?: TankVariant) {
  const mm = v ? modelOfVariant(m, v) : m;
  store.edit(s => { applyTankPick(s, m, v); s.tank = tankFromModel(mm); });
  return store.tank;
}
/** What a panel control does (ui/panels.ts gate + unhold): ask when it breaks the product, release on yes, then change. */
function change(store: SceneStore, what: Held, answer: boolean, fn: (s: TankSetup) => void) {
  const asked: string[] = [];
  if (!mayChange([store.tank], what, m => { asked.push(m); return answer; })) return asked;
  store.edit(s => { if (breakNote(s, what)) releaseProduct(s); fn(s); });
  return asked;
}

describe('product gate: rimless products', () => {
  const rimless = products.filter(({ m, v }) => pickRimless(m, v));
  it('every rimless product picks rim off with the Rimmed control locked, and stays rimless', () => {
    expect(rimless.length).toBeGreaterThanOrEqual(13);
    for (const { m, v } of rimless) {
      const store = new SceneStore(); store.edit(s => { s.render.rim = true; });
      const T = pick(store, m, v);
      expect(T.render.rim, v.line).toBe(false);
      expect(locksOf(T)?.rim, v.line).toBe(true); // panels.ts disables #rimY on this
      store.edit(s => { s.render.rim = true; }); // a path that did not ask (a preset, an old shortcut) is put back
      expect(store.tank.render.rim, v.line).toBe(false);
    }
  });
  it('adding a rim asks what it breaks; no changes nothing, yes makes it a custom tank with what it had', () => {
    const { m, v } = find(/Imagitarium.*Open-Glass Rimless 10/i);
    const store = new SceneStore(); pick(store, m, v);
    expect(productLabel(store.tank)).toMatch(/^Real product: Imagitarium.*Open-Glass Rimless 10/);
    const before = JSON.stringify(store.tank);
    const asked = change(store, 'rim', false, s => { s.render.rim = true; });
    expect(asked[0]).toMatch(/The Imagitarium.*Open-Glass Rimless 10 gal is only sold rimless\. Adding a rim makes this a custom tank, not that product\. Continue\?/);
    expect(JSON.stringify(store.tank)).toBe(before);
    const size = store.tank.tank;
    expect(change(store, 'rim', true, s => { s.render.rim = true; })).toHaveLength(1);
    expect(store.tank.render.rim).toBe(true);
    expect(store.tank.product).toBeUndefined();
    expect(store.tank.tank).toEqual(size);
    expect(productLabel(store.tank)).toBe('Custom size');
    store.undo(); // undo brings the product back
    expect(productLabel(store.tank)).toMatch(/^Real product: Imagitarium/);
    expect(store.tank.render.rim).toBe(false);
  });
});

describe('product gate: size and shape', () => {
  it('a size edit on a maker\'s product asks; no keeps it, yes leaves a custom size', () => {
    const { m, v } = find(/Aqueon/i, x => !x.rimless && !x.kit);
    const store = new SceneStore(); pick(store, m, v);
    const L = store.tank.tank.L;
    expect(change(store, 'size', false, s => { s.tank = { ...s.tank, L: L + 50 }; })[0]).toMatch(/is sold at .* in\. A new size or shape makes this a custom tank/);
    expect(store.tank.tank.L).toBe(L); expect(store.tank.product).toBeDefined();
    change(store, 'size', true, s => { s.tank = { ...s.tank, L: L + 50 }; });
    expect(store.tank.tank.L).toBe(L + 50); expect(productLabel(store.tank)).toBe('Custom size');
  });
  it('an ordinary shelf tank changes freely: rim, lid and gear never ask', () => {
    const { m, v } = find(/Aqueon/i, x => !x.rimless && !x.kit);
    const store = new SceneStore(); pick(store, m, v);
    expect(locksOf(store.tank)).toBeUndefined();
    for (const w of ['rim', 'lid', 'light', 'filter', 'heater'] as const) expect(change(store, w, false, () => {}), w).toEqual([]);
    change(store, 'rim', false, s => { s.render.rim = false; s.lid = 'open'; });
    expect([store.tank.render.rim, store.tank.lid]).toEqual([false, 'open']);
    expect(productLabel(store.tank)).toMatch(/^Real product: Aqueon/);
  });
  it('a catalogue size with no maker: no question, a resize just makes it a custom size', () => {
    const m = TANK_MODELS.find(x => x.id === 'g29') ?? TANK_MODELS.find(x => !x.terrarium && x.shape === 'rect')!;
    const store = new SceneStore(); pick(store, m);
    expect(productLabel(store.tank)).toBe(`Standard size: ${m.name} (any maker)`);
    expect(change(store, 'size', false, s => { s.tank = { ...s.tank, H: s.tank.H + 40 }; })).toEqual([]);
    expect(productLabel(store.tank)).toBe('Custom size');
  });
});

describe('product gate: all-in-ones and starter kits', () => {
  it('an all-in-one keeps its gear; changing it asks, and yes frees the gear on a custom tank', () => {
    const { m, v } = find(/Flex 9/i, x => !!x.kit);
    const store = new SceneStore(); pick(store, m, v);
    const lid = store.tank.lid, w = store.tank.light.watts;
    store.edit(s => { s.lid = 'open'; s.light.watts = 99; }); // drift from a path that did not ask is put back
    expect([store.tank.lid, store.tank.light.watts]).toEqual([lid, w]);
    expect(change(store, 'filter', false, () => {})[0]).toMatch(/runs on its own filter\. Changing it makes this a custom tank/);
    expect(change(store, 'size', false, () => {})[0]).toMatch(/Its gear stays on it/);
    change(store, 'light', true, s => { s.light.watts = 40; });
    expect(store.tank.light.watts).toBe(40);
    expect(store.tank.integrated).toBeUndefined(); expect(productLabel(store.tank)).toBe('Custom size');
  });
  it('a starter kit applies its gear and holds nothing', () => {
    const k: KitModel = { ...KITS.find(x => x.id === 'fluval-flex-9')!, id: 'test-starter', kind: 'starter', lid: 'hood' };
    KITS.push(k);
    try {
      const m = TANK_MODELS.find(x => x.id === 'g10')!, v: TankVariant = { ...m.variants![0], kit: 'test-starter', rimless: false };
      const store = new SceneStore(); store.edit(s => { s.lid = 'open'; });
      pick(store, m, v);
      expect(store.tank.lid).toBe('hood'); expect(store.tank.integrated).toBeUndefined(); expect(locksOf(store.tank)).toBeUndefined();
      store.edit(s => { s.lid = 'glass'; });
      expect(store.tank.lid).toBe('glass');
    } finally { KITS.pop(); }
  });
});

describe('product gate: save and load', () => {
  it('the product label round-trips through a saved file; a product the library lost loads as a custom size', () => {
    for (const { m, v } of [find(/Imagitarium.*Rimless/i), find(/Flex 9/i, x => !!x.kit), find(/Aqueon/i)]) {
      const store = new SceneStore(); pick(store, m, v);
      const label = productLabel(store.tank);
      const back = parseScene(JSON.parse(JSON.stringify(store.scene))).scene.tanks[0];
      expect(productLabel(back), label).toBe(label);
      expect(back.product).toEqual(store.tank.product);
    }
    const store = new SceneStore(); pick(store, ...Object.values(find(/Aqueon/i)) as [TankModel, TankVariant]);
    const raw = JSON.parse(JSON.stringify(store.scene)); raw.tanks[0].product.key = 'gone|gone';
    expect(productLabel(parseScene(raw).scene.tanks[0])).toBe('Custom size');
  });
});
