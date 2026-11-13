import { describe, expect, it } from 'vitest';
import { addCustomTank, deleteCustomTank, duplicateCustomTank, editCustomTank, libraryLost, loadLibrary, newerVersion, parseSpec, refOf, renameCustomTank, saveLibrary, specOfSetup, useCustomTank, CUSTOM_KEY, type CustomTankSpec } from '../src/scene/customTanks';
import { autoName } from '../src/scene/customTankName';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { demandOf, defaultProfile } from '../src/demand';
import { TANK_MODELS } from '../src/data/tanks';
import { tankSig } from '../src/scene/integrated';

const fake = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
const IN = 25.4;
const spec = (name = 'Garage 40', over: Partial<CustomTankSpec> = {}): CustomTankSpec => ({ name, tank: { L: 36 * IN, D: 18 * IN, H: 16 * IN }, glass: 'auto', glassType: 'standard', rim: true, ...over });
const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('P9 library', () => {
  it('add, rename, duplicate, delete; ids unique; names kept distinct', () => {
    let { lib, entry } = addCustomTank([], spec('A'), 1);
    expect(entry.version).toBe(1);
    const b = addCustomTank(lib, spec('a'), 2); lib = b.lib;
    expect(b.entry.name).toBe('a 2');
    expect(new Set(lib.map(e => e.id)).size).toBe(2);
    const r = renameCustomTank(lib, entry.id, 'Den tank', 3); lib = r.lib;
    expect(r.entry!.name).toBe('Den tank'); expect(r.entry!.version).toBe(1); // a rename is not a new version
    const d = duplicateCustomTank(lib, entry.id, 4); lib = d.lib;
    expect(d.entry!.name).toBe('Den tank copy'); expect(d.entry!.id).not.toBe(entry.id); expect(d.entry!.version).toBe(1);
    expect(deleteCustomTank(lib, entry.id).map(e => e.id)).not.toContain(entry.id);
    expect(lib).toHaveLength(3); // inputs are not mutated
  });
  it('editing size, glass, rim or price bumps the version; owned and name do not', () => {
    const { lib, entry } = addCustomTank([], spec(), 1);
    const e1 = editCustomTank(lib, entry.id, { tank: { L: 40 * IN, D: 18 * IN, H: 16 * IN } }, 2);
    expect(e1.entry!.version).toBe(2);
    expect(editCustomTank(e1.lib, entry.id, { glass: 9.5 }).entry!.version).toBe(3);
    expect(editCustomTank(e1.lib, entry.id, { rim: false }).entry!.version).toBe(3);
    const p = editCustomTank(e1.lib, entry.id, { priceUsd: 120 }); expect(p.entry!.version).toBe(3); expect(p.entry!.priceUsd).toBe(120);
    expect(editCustomTank(p.lib, entry.id, { priceUsd: undefined }).entry!.priceUsd).toBeUndefined();
    expect(editCustomTank(e1.lib, entry.id, { owned: true }).entry!.version).toBe(2);
    expect(editCustomTank(e1.lib, 'nope', { rim: false }).entry).toBeUndefined();
  });
  it('saves per browser and reads back; junk and blocked storage read as empty', () => {
    const s = fake(), { lib } = addCustomTank([], spec('Keep', { priceUsd: 250, owned: true }), 5);
    expect(saveLibrary(lib, s)).toBe(true);
    expect(loadLibrary(s)).toEqual(lib);
    s.m.set(CUSTOM_KEY, 'not json'); expect(loadLibrary(s)).toEqual([]);
    s.m.set(CUSTOM_KEY, JSON.stringify([{ id: 'x' }, 7, { id: 'y', name: 'Y', tank: { L: 9e9, D: 300, H: 300 } }]));
    const l = loadLibrary(s); expect(l).toHaveLength(1); expect(l[0].tank.L).toBe(5000); // clamped like the scene's tank
    expect(loadLibrary(undefined)).toEqual([]); expect(saveLibrary(lib, undefined)).toBe(false);
  });
  it('validates every shape like the scene tank', () => {
    const bow = parseSpec({ name: 'B', tank: { L: 900, D: 400, H: 400, shape: 'bow', bowMin: 9999 } })!;
    expect(bow.tank.shape).toBe('bow'); expect(bow.tank.bowMin).toBeLessThanOrEqual(bow.tank.D);
    expect(parseSpec({ tank: { L: 900, D: 400, H: 400, shape: 'cube?' } })!.tank.shape).toBeUndefined();
    expect(parseSpec({ name: 'x' })).toBeUndefined();
    expect(parseSpec({ tank: { L: 900, D: 400, H: 400 }, priceUsd: -5 })!.priceUsd).toBeUndefined();
  });
});

describe('P9 setup copy and versions', () => {
  it('a setup keeps its own copy; newer version is offered; delete keeps the copy', () => {
    const S = defaultScene().tanks[0];
    let { lib, entry } = addCustomTank([], spec('Den'), 1);
    useCustomTank(S, entry);
    expect(S.tank).toEqual(entry.tank); expect(S.customTank).toEqual(refOf(entry)); expect(newerVersion(S, lib)).toBeUndefined();
    const ed = editCustomTank(lib, entry.id, { tank: { L: 48 * IN, D: 18 * IN, H: 20 * IN } }); lib = ed.lib;
    expect(S.tank.L).toBeCloseTo(36 * IN); // the setup did not move
    expect(newerVersion(S, lib)!.version).toBe(2);
    useCustomTank(S, newerVersion(S, lib)!); expect(S.tank.L).toBeCloseTo(48 * IN); expect(newerVersion(S, lib)).toBeUndefined();
    const gone = deleteCustomTank(lib, entry.id);
    expect(libraryLost(S, gone)).toBe(true); expect(newerVersion(S, gone)).toBeUndefined(); expect(S.tank.L).toBeCloseTo(48 * IN);
    expect(specOfSetup(S).tank).toEqual(S.tank);
  });
  it('using a custom tank releases a commercial product', () => {
    const S = defaultScene().tanks[0]; S.product = { model: TANK_MODELS[0].id };
    useCustomTank(S, addCustomTank([], spec(), 1).entry); expect(S.product).toBeUndefined();
  });
});

describe('P9 scene round trip', () => {
  it('a file / share link carries the copy, library id, version and own price', () => {
    const sc = defaultScene(), S = sc.tanks[0];
    useCustomTank(S, { ...addCustomTank([], spec('Den', { priceUsd: 199.999, owned: true, glass: 9.5, rim: false }), 1).entry });
    const back = parseScene(roundTrip(sc)).scene.tanks[0];
    expect(back.customTank).toEqual({ ...refOf(addCustomTank([], spec('Den', { priceUsd: 200, owned: true }), 1).entry), id: S.customTank!.id });
    expect(back.tank).toEqual(S.tank); expect(back.render.glass).toBe(9.5); expect(back.render.rim).toBe(false);
  });
  it('garbage customTank is dropped (and the tank is migrated to a named copy)', () => {
    const j = roundTrip(defaultScene()); (j.tanks[0] as any).customTank = { name: 5, priceUsd: 'free' };
    expect(parseScene(j).scene.tanks[0].customTank).toEqual({ name: autoName(j.tanks[0].tank) });
  });
});

describe('P9 migration of old saves', () => {
  it('names "Custom 36 x 18 x 16 in" and changes nothing drawn', () => {
    const j = roundTrip(defaultScene()); delete j.tanks[0].customTank; j.tanks[0].tank = { L: 36 * IN, D: 18 * IN, H: 16 * IN }; delete j.tanks[0].product;
    const t = parseScene(j).scene.tanks[0];
    expect(t.customTank).toEqual({ name: 'Custom 36 x 18 x 16 in' });
    expect(t.tank).toEqual(j.tanks[0].tank); expect(t.render.glass).toBe(j.tanks[0].render.glass); expect(t.render.rim).toBe(j.tanks[0].render.rim);
    expect(autoName({ L: 600, D: 300, H: 300, shape: 'bow', bowMin: 200 })).toBe('Custom bowfront 23.6 x 11.8 x 11.8 in');
  });
  it('a hand-edited catalogue product becomes a custom copy; an untouched one stays commercial', () => {
    const m = TANK_MODELS.find(x => !x.terrarium && (!x.shape || x.shape === 'rect'))!;
    const base = roundTrip(defaultScene());
    const mk = (tank: { L: number; D: number; H: number }, sig?: string) => { const j = roundTrip(base); delete j.tanks[0].customTank; j.tanks[0].tank = tank; j.tanks[0].product = { model: m.id, ...(sig ? { sig } : {}) }; return j; };
    const T0 = { L: 800, D: 400, H: 400 };
    const edited = parseScene(mk({ L: 900, D: 400, H: 400 }, tankSig(T0))).scene.tanks[0];
    expect(edited.product).toBeUndefined(); expect(edited.customTank!.name).toBe('Custom 35.4 x 15.7 x 15.7 in'); expect(edited.tank.L).toBe(900);
    const same = parseScene(mk(T0, tankSig(T0))).scene.tanks[0];
    expect(same.product?.model).toBe(m.id); expect(same.customTank).toBeUndefined();
    expect(parseScene(mk(T0)).scene.tanks[0].product?.model).toBe(m.id); // no sig: cannot tell, stays a product
  });
  it('an integrated kit stays a kit', () => {
    const j = roundTrip(defaultScene()); delete j.tanks[0].customTank; j.tanks[0].integrated = { kit: 'top-fin-essentials-10' };
    expect(parseScene(j).scene.tanks[0].customTank).toBeUndefined();
  });
});

describe('P9 price override', () => {
  const price = (own?: number) => {
    const S = defaultScene().tanks[0];
    if (own !== undefined) S.customTank = { name: 'Mine', priceUsd: own };
    const D = demandOf(S, defaultProfile());
    return { D, row: D.items.find(r => r.key === 'tank')! };
  };
  it('uses the own price exactly and says so; else the estimate', () => {
    const est = price().row, mine = price(137).row;
    expect(mine.setup).toEqual({ lo: 137, mode: 137, hi: 137 });
    expect(mine.label).toContain('your figure'); expect(est.label).not.toContain('your figure');
    expect(est.setup!.mode).not.toBe(137);
  });
  it('the own price moves the total by the difference', () => {
    const a = price(), b = price(a.row.setup!.mode + 100);
    expect(b.D.totals.setupUsd - a.D.totals.setupUsd).toBeGreaterThan(90);
  });
  it('an own price of $0 (already owned / free) is respected', () => { expect(price(0).row.setup).toEqual({ lo: 0, mode: 0, hi: 0 }); });
});
