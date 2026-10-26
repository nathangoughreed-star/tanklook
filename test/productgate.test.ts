// The product gate (2026-10-26, Nathan: "If you pick a style of tank, then everything that comes along with that must remain unless you
// dleiberately change it after a warning message ... We should also clearly distinguish if the tank being worked on is a real
// commercially available tank or a custom size"). scene/integrated.ts holds; ui/panels.ts asks through mayChange, as `change` does here.
import { describe, expect, it } from 'vitest';
import { parseScene } from '../src/scene/validate';
import { Store as SceneStore } from '../src/scene/store';
import { breakNote, CUSTOM_LABEL, includesNote, locksOf, mayChange, productLabel, releaseProduct, type Held } from '../src/scene/integrated';
import { KITS, type KitModel } from '../src/data/kits';
import { TANK_MODELS, modelOfVariant, pickRimless, soleProduct, tankFromModel, type TankModel, type TankVariant } from '../src/data/tanks';
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
    expect(productLabel(store.tank)).toMatch(/^Ready-made: Imagitarium.*Open-Glass Rimless 10/);
    const before = JSON.stringify(store.tank);
    const asked = change(store, 'rim', false, s => { s.render.rim = true; });
    expect(asked[0]).toMatch(/The Imagitarium.*Open-Glass Rimless 10 gal is only sold rimless\. Adding a rim makes this a custom tank, not that product\. Continue\?/);
    expect(JSON.stringify(store.tank)).toBe(before);
    const size = store.tank.tank;
    expect(change(store, 'rim', true, s => { s.render.rim = true; })).toHaveLength(1);
    expect(store.tank.render.rim).toBe(true);
    expect(store.tank.product).toBeUndefined();
    expect(store.tank.tank).toEqual(size);
    expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
    store.undo(); // undo brings the product back
    expect(productLabel(store.tank)).toMatch(/^Ready-made: Imagitarium/);
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
    expect(store.tank.tank.L).toBe(L + 50); expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
  });
  it('an ordinary maker tank is ready-made: its rim holds (Nathan: "If I get a standard 55g, I cant just take the rim off"), add-ons stay free', () => {
    const { m, v } = find(/Aqueon/i, x => !x.rimless && !x.kit);
    const store = new SceneStore(); pick(store, m, v);
    expect(locksOf(store.tank)).toMatchObject({ rim: true, lid: false, light: false, filter: false, heater: false });
    expect(change(store, 'rim', false, s => { s.render.rim = false; })[0]).toMatch(/is sold with its rim\. Taking it off makes this a custom tank, not that product\. Continue\?/);
    expect(store.tank.render.rim).toBe(true);
    store.edit(s => { s.render.rim = false; }); // a path that did not ask is put back
    expect(store.tank.render.rim).toBe(true);
    for (const w of ['lid', 'light', 'filter', 'heater'] as const) expect(change(store, w, false, () => {}), w).toEqual([]);
    change(store, 'lid', false, s => { s.lid = 'open'; });
    expect(store.tank.lid).toBe('open');
    expect(productLabel(store.tank)).toMatch(/^Ready-made: Aqueon/);
  });
  it('a custom tank changes freely: nothing asks', () => {
    const { m, v } = find(/Aqueon/i, x => !x.rimless && !x.kit);
    const store = new SceneStore(); pick(store, m, v);
    change(store, 'size', true, s => { s.tank = { ...s.tank, L: s.tank.L + 30 }; });
    expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
    for (const w of ['rim', 'lid', 'light', 'filter', 'heater', 'size'] as const) expect(change(store, w, false, () => {}), w).toEqual([]);
    change(store, 'rim', false, s => { s.render.rim = false; });
    expect(store.tank.render.rim).toBe(false);
  });
  it('a standard catalogue size is ready-made too: a resize and the rim ask', () => {
    const m = TANK_MODELS.find(x => x.id === 'g55') ?? TANK_MODELS.find(x => !x.terrarium && x.shape === 'rect' && !x.rimless)!;
    const store = new SceneStore(); pick(store, m);
    expect(productLabel(store.tank)).toBe(`Ready-made: standard ${m.name} tank (any maker)`);
    expect(change(store, 'size', false, s => { s.tank = { ...s.tank, H: s.tank.H + 40 }; })[0]).toMatch(new RegExp(`The standard ${m.name} is sold at .* in`));
    expect(change(store, 'rim', false, () => {})).toHaveLength(1);
    change(store, 'size', true, s => { s.tank = { ...s.tank, H: s.tank.H + 40 }; });
    expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
  });
  it('a size named after one product is that product, not a custom size', () => {
    const m = TANK_MODELS.find(x => x.id === 'n_flex_9gal')!;
    expect(soleProduct(m)?.kit).toBe('fluval-flex-9');
    const multi = TANK_MODELS.find(x => x.id === 'n_imagitarium_shallow_6_8');
    if (multi) { const store = new SceneStore(); pick(store, multi); expect(productLabel(store.tank)).toBe(`Ready-made: ${multi.name}`); expect(locksOf(store.tank)?.rim).toBe(true); }
  });
});

describe('product gate: all-in-ones and starter kits', () => {
  it('an all-in-one keeps its gear; changing it asks, and yes frees the gear on a custom tank', () => {
    const { m, v } = find(/Flex 9/i, x => !!x.kit);
    const store = new SceneStore(); pick(store, m, v);
    const lid = store.tank.lid, w = store.tank.light.watts;
    store.edit(s => { s.lid = 'open'; s.light.watts = 99; }); // drift from a path that did not ask is put back
    expect([store.tank.lid, store.tank.light.watts]).toEqual([lid, w]);
    expect(change(store, 'filter', false, () => {})[0]).toMatch(/comes with its own filter\. Changing it makes this a custom tank/);
    expect(change(store, 'size', false, () => {})[0]).toMatch(/Its gear stays on it/);
    change(store, 'light', true, s => { s.light.watts = 40; });
    expect(store.tank.light.watts).toBe(40);
    expect(store.tank.integrated).toBeUndefined(); expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
  });
  it('a starter kit holds what it ships with, like an all-in-one (Nathan: what it comes with is held)', () => {
    const k: KitModel = { ...KITS.find(x => x.id === 'fluval-flex-9')!, id: 'test-starter', kind: 'starter', lid: 'hood' };
    KITS.push(k);
    try {
      const m = TANK_MODELS.find(x => x.id === 'g10')!, v: TankVariant = { ...m.variants![0], kit: 'test-starter', rimless: false };
      const store = new SceneStore(); store.edit(s => { s.lid = 'open'; });
      pick(store, m, v);
      expect(store.tank.lid).toBe('hood'); expect(store.tank.integrated?.kit).toBe('test-starter');
      expect(locksOf(store.tank)).toMatchObject({ rim: true, lid: true, filter: true });
      store.edit(s => { s.lid = 'glass'; }); // drift is put back
      expect(store.tank.lid).toBe('hood');
    } finally { KITS.pop(); }
  });
});

describe('product gate: what a product comes with (includes)', () => {
  /** A product at g10 with this `includes`, registered in the library for the test (the lookup is by key). */
  function withProduct(includes: TankVariant['includes'], run: (m: TankModel, v: TankVariant) => void) {
    const m = TANK_MODELS.find(x => x.id === 'g10')!, v: TankVariant = { ...m.variants![0], line: 'Test line', rimless: false, includes };
    if (!includes) delete v.includes;
    m.variants!.push(v);
    try { run(m, v); } finally { m.variants!.pop(); }
  }
  it('a lid it ships with is held, and changing it asks', () => withProduct({ lid: 'glass', light: false, filter: false, heater: false, stand: false }, (m, v) => {
    const store = new SceneStore(); store.edit(s => { s.lid = 'hood'; });
    pick(store, m, v);
    expect(store.tank.lid).toBe('glass');
    expect(locksOf(store.tank)).toMatchObject({ lid: true, light: false, filter: false, heater: false });
    expect(includesNote(store.tank)).toBe('Comes with a glass top. Sold without: light, filter, heater, stand (free to add).');
    store.edit(s => { s.lid = 'open'; });
    expect(store.tank.lid).toBe('glass');
    expect(change(store, 'lid', false, s => { s.lid = 'open'; })[0]).toMatch(/comes with a glass top\. Changing the lid makes this a custom tank/);
    for (const w of ['light', 'filter', 'heater'] as const) expect(change(store, w, false, () => {}), w).toEqual([]);
    change(store, 'lid', true, s => { s.lid = 'open'; });
    expect(store.tank.lid).toBe('open'); expect(productLabel(store.tank)).toBe(CUSTOM_LABEL);
  }));
  it('a truly bare tank keeps everything but its rim and size free', () => withProduct({ lid: 'none', light: false, filter: false, heater: false, stand: false }, (m, v) => {
    const store = new SceneStore(); pick(store, m, v);
    expect(store.tank.lid).toBe('open');
    expect(locksOf(store.tank)).toMatchObject({ rim: true, lid: false, light: false, filter: false, heater: false });
    change(store, 'lid', false, s => { s.lid = 'hood'; });
    expect(store.tank.lid).toBe('hood');
  }));
  it('nothing recorded: free and flagged, never guessed', () => withProduct(undefined, (m, v) => {
    const store = new SceneStore(); store.edit(s => { s.lid = 'mesh'; });
    pick(store, m, v);
    expect(store.tank.lid).toBe('mesh');
    expect(locksOf(store.tank)?.lid).toBe(false);
    expect(includesNote(store.tank)).toMatch(/^What this tank comes with isn't recorded yet/);
  }));
  it('gear it ships with but no kit models is flagged, not locked', () => withProduct({ lid: 'hood', light: true }, (m, v) => {
    const store = new SceneStore(); pick(store, m, v);
    expect(locksOf(store.tank)).toMatchObject({ lid: true, light: false });
    expect(includesNote(store.tank)).toBe('Comes with a hood, its own light. Not recorded yet: filter, heater, stand (free to set). Its light is not modelled yet, so it can be changed.');
  }));
  it('an all-in-one reads what it ships with from its kit record', () => {
    const { m, v } = find(/Flex 9/i, x => !!x.kit);
    const store = new SceneStore(); pick(store, m, v);
    expect(includesNote(store.tank)).toMatch(/^Comes with .*its own light, its own filter/);
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
    expect(productLabel(parseScene(raw).scene.tanks[0])).toBe(CUSTOM_LABEL);
  });
});
