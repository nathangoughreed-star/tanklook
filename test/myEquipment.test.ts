// Lane EQ1 (Nathan 2026-11-05): "My equipment" is the one home for gear in hand. One write path (an item owned from the menu gives the $0 "you have" line
// in the cost panel), each shortcut opens the right item, and old saves load and re-apply unchanged. The menu's DOM is not under test (node environment);
// its state, its writes and the shortcut keys are.
import { describe, expect, it } from 'vitest';
import { GENERIC, MORE_GROUPS, MY_EQUIPMENT_IDS, OWNED_ITEMS, applyFurniture, applyOwned, toBuy, emptyOwned, equipmentSummary, ownedNames, ownedStateOf, syncEquipment } from '../src/ui/ownedGear';
import { gearCard, ownItemOf, type GearCardSpec } from '../src/ui/gearCard';
import { emptyBrief } from '../src/ui/setupBrief';
import { PICK_CARE, OWNED } from '../src/demand/suggest';
import { demandOf } from '../src/demand/engine';
import { defaultProfile } from '../src/demand/types';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { ownedGearLines } from '../src/scene/ownedGear';
import { applyPreset, filterUnits, heaterUnits, techOf, withUnits } from '../src/scene/tech';
import { equipmentOf, removeEquipment, setEquipment, setOwnedUse } from '../src/scene/project';
import { briefToWants, valueOf } from '../src/scene/brief';
import { HEATER_PRODUCTS } from '../src/data/gearCatalog';
import { tableOn } from '../src/scene/table';
import { ownedFit } from '../src/scene/ownedFit';
import { equipUseOf } from '../src/scene/brief';
import { IN } from '../src/scene/physics';
import type { TankSetup } from '../src/scene/types';

const P = defaultProfile();
const planted = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES.planted)).scene; return structuredClone(sc.tanks[sc.active]); };

describe('My equipment: one write path', () => {
  it('an item owned from the menu is a $0 "you have" line in the cost panel, with what was paid on it', () => {
    const S = planted(), h = HEATER_PRODUCTS[0];
    const st = emptyOwned(); st.on.add('heater'); st.on.add('light'); st.heater = h.id; st.light = GENERIC; st.paid = { heater: 14 };
    applyOwned(S, st);
    const lines = ownedGearLines(S);
    expect(lines.map(l => l.label.split(':')[0]).sort()).toEqual(['Heater', 'Light']);
    expect(lines.find(l => l.label.startsWith('Heater'))!.note).toBe('paid $14');
    expect(lines.find(l => l.label.startsWith('Light'))!.note).toBe('you have');
    // the cost panel prices them at $0: the set-up total drops, and the light has no set-up price at all
    const base = planted();
    expect(demandOf(S, P).totals.setupUsd).toBeLessThan(demandOf(base, P).totals.setupUsd);
    expect(demandOf(S, P).items.find(i => i.key === 'light')!.setup).toBeUndefined();
  });
  it('a paid price can be cleared again, and unticking removes the owned line', () => {
    const S = planted(), st = emptyOwned(); st.on.add('light'); st.light = GENERIC; st.paid = { light: 30 };
    applyOwned(S, st); expect(S.light.paidUsd).toBe(30);
    st.paid = { light: undefined }; applyOwned(S, st); expect(S.light.paidUsd).toBeUndefined(); expect(S.light.owned).toBe(true);
    st.on.delete('light'); applyOwned(S, st); expect(ownedGearLines(S)).toEqual([]);
  });
  it('the rest of the gear (skimmer, flow, lid, test kit, dry heat, care basics) is saved in the brief with Required / Available, and Suggest reads it', () => {
    const ids = MORE_GROUPS.flatMap(g => g.ids);
    expect(ids).toEqual(expect.arrayContaining(['skimmer', 'flow', 'lid', 'testkit', 'dryheat', 'siphon', 'net', 'conditioner', 'thermometer', 'bucket']));
    expect(ids.every(k => OWNED.some(o => o.id === k))).toBe(true);   // every row is a gear item Suggest knows how to credit
    let b = setEquipment(emptyBrief(), 'testkit', { pick: PICK_CARE });
    b = setEquipment(b, 'flow', { pick: 'unknown' });
    expect(valueOf(b, 'constraints.owned')).toEqual({ testkit: PICK_CARE, flow: 'unknown' });
    expect(equipmentOf(b).items.map(i => [i.key, i.use])).toEqual([['testkit', 'available'], ['flow', 'available']]);   // owning never makes it Required
    expect(ownedNames(b)).toEqual(['Powerhead / wavemaker', 'Water test kit']);
    expect(equipmentSummary(b)).toBe('You have: Powerhead / wavemaker, Water test kit.');
    b = removeEquipment(removeEquipment(b, 'testkit'), 'flow');
    expect(valueOf(b, 'constraints.owned')).toBeUndefined();
    expect(equipmentSummary(b)).toMatch(/^Nothing listed yet/);
  });
  it('the menu lists every item the plan named, and each shortcut item is one of them', () => {
    expect(MY_EQUIPMENT_IDS).toEqual(expect.arrayContaining(['tank', 'stand', 'light', 'heater', 'filter', 'skimmer', 'flow', 'lid', 'testkit', 'dryheat']));
    expect(OWNED_ITEMS.map(i => i.id)).toEqual(['tank', 'light', 'heater', 'filter']);
  });
});

describe('My equipment: what I have is kept apart from what I will buy', () => {
  it('the buy list drops an item once it is owned, and the total falls with it', () => {
    const S = planted(), before = toBuy(S, P), sum = (r: { usd: number }[]) => r.reduce((t, x) => t + x.usd, 0);
    expect(before.some(r => r.key === 'heater') || before.some(r => r.key === 'light')).toBe(true);
    const st = emptyOwned(); st.on.add('light'); st.light = GENERIC; applyOwned(S, st);
    const after = toBuy(S, P);
    expect(after.some(r => r.key === 'light')).toBe(false);
    expect(sum(after)).toBeLessThan(sum(before));
    expect(after.every(r => r.usd > 0)).toBe(true);
  });
});

describe('My equipment: shortcuts open the right item', () => {
  const spec = (key: string): GearCardSpec => ({ key, type: key.startsWith('light') ? 'light' : (key.split('|')[0] as 'heater' | 'filter'), tab: 'own', product: false, owned: false } as GearCardSpec);
  it('the Tech "I own one" tab is a button carrying its item, not a checkbox', () => {
    for (const [key, item] of [['heater|0', 'heater'], ['heater|1', 'heater'], ['filter|0', 'filter'], ['light|0', 'light']] as const) {
      const h = gearCard(spec(key));
      expect(h).toContain(`data-gc-own-open="${key}"`);
      expect(ownItemOf(key)).toBe(item);
      expect(MY_EQUIPMENT_IDS).toContain(ownItemOf(key));
      expect(h).not.toContain('type="checkbox"');
    }
  });
});

describe('My equipment: old saves are unchanged', () => {
  it('a save with nothing owned shows nothing ticked and re-applying the menu changes nothing', () => {
    const S = planted(), before = JSON.stringify(S);
    const st = ownedStateOf(emptyBrief(), S);
    expect(st.on.size).toBe(0);
    applyOwned(S, st);
    const diff = Object.keys(S).filter(k => k !== 'tech' && JSON.stringify((S as never)[k]) !== JSON.stringify((JSON.parse(before) as never)[k]));
    expect(diff).toEqual([]);   // only the Tech block may be written out (as today); the tank, light, stand and water are untouched
    expect(ownedGearLines(S)).toEqual([]);
    expect(equipmentSummary(emptyBrief(), S)).toMatch(/^Nothing listed yet/);
  });
  it('gear an old save (or the old Tech checkbox) marked owned on the scene shows ticked, with its paid price, and re-applies identically', () => {
    const S0 = planted(), h = HEATER_PRODUCTS[0];
    const S = { ...S0, light: { ...S0.light, owned: true, paidUsd: 30 }, tech: withUnits(applyPreset(S0, 'midplanted'), 'heater', [{ product: h.id, owned: true, paidUsd: 14 }]) };
    const sc = parseScene(JSON.parse(SCENES.planted)).scene, back = parseScene(JSON.parse(JSON.stringify({ ...sc, tanks: [S], active: 0 }))).scene.tanks[0];
    const st = ownedStateOf(emptyBrief(), back);
    expect([...st.on].sort()).toEqual(['heater', 'light']);
    expect(st.heater).toBe(h.id); expect(st.paid).toEqual({ heater: 14, light: 30 });
    const again = structuredClone(back);
    applyOwned(again, st);
    expect(heaterUnits(techOf(again))).toEqual(heaterUnits(techOf(back)));
    expect(again.light.owned).toBe(true); expect(again.light.paidUsd).toBe(30);
    expect(ownedGearLines(again)).toEqual(ownedGearLines(back));
    // and the menu writes it into the brief on the first change, so every other screen reads one place
    const b = syncEquipment(emptyBrief(), st);
    expect(equipmentOf(b).items.map(i => i.key).sort()).toEqual(['heater', 'light']);
    expect(filterUnits(techOf(again)).some(u => u.owned)).toBe(false);
  });
});

describe('My equipment: own furniture is the existing table style', () => {
  it('"a table or other furniture" writes stand.style table, the top L x D and the height', () => {
    const S = planted();
    applyFurniture(S, { mode: 'table' });
    expect(S.stand.style).toBe('table'); expect(S.stand.show).toBe(true); expect(tableOn(S)).toBe(true);
    const r = applyFurniture(S, { L: 60 * IN, D: 24 * IN, H: 30 * IN });
    expect(r.grew).toBe(false);
    expect([S.stand.table.L, S.stand.table.D, S.stand.height]).toEqual([60 * IN, 24 * IN, 30 * IN]);
    applyFurniture(S, { mode: 'stand' });
    expect(S.stand.style).toBe('cabinet'); expect(tableOn(S)).toBe(false);
  });
  it('a top smaller than the tank base is grown (never an overhang) and says so', () => {
    const S = planted();
    const r = applyFurniture(S, { mode: 'table', L: 8 * IN, D: 8 * IN });
    expect(r.grew).toBe(true);
    expect(S.stand.table.L).toBeGreaterThanOrEqual(S.tank.L); expect(S.stand.table.D).toBeGreaterThanOrEqual(S.tank.D);
  });
  it('a round top keeps D equal to L', () => {
    const S = planted();
    applyFurniture(S, { shape: 'round', L: 60 * IN });
    expect(S.stand.table.shape).toBe('round'); expect(S.stand.table.D).toBe(S.stand.table.L);
  });
});

describe('My equipment: one state, available (Nathan 2026-11-07)', () => {
  it('nothing writes Required: the menu has no flag, a new item is available, and an edit in the menu rewrites a flag an old save stored', () => {
    let b = setEquipment(emptyBrief(), 'tank', { model: 'g40b' });
    b = setEquipment(b, 'heater', { pick: PICK_CARE });
    expect(equipmentOf(b).items.map(i => i.use)).toEqual(['available', 'available']);
    expect(ownedStateOf(b)).not.toHaveProperty('use');
    expect(briefToWants(b).ownTank).toBeUndefined(); expect(briefToWants(b).availTank?.id).toBe('g40b');
    const old = setOwnedUse(b, 'tank', 'required');   // what an older save carried: still read as it was ...
    expect(equipUseOf(old, 'tank')).toBe('required');
    const st = ownedStateOf(old);
    expect(equipUseOf(syncEquipment(old, st), 'tank')).toBe('available');   // ... until the owner next edits My equipment
  });
});

describe('My equipment: warns when owned gear no longer suits', () => {
  const ownHeater = (S: TankSetup, w: number): TankSetup => ({ ...S, tech: withUnits(applyPreset(S, 'midplanted'), 'heater', [{ w, owned: true }]) });
  it('says nothing with nothing owned, or when the owned gear still suits', () => {
    expect(ownedFit(planted(), emptyBrief())).toEqual([]);
    const S = ownHeater(planted(), 300);
    expect(ownedFit(S, setEquipment(emptyBrief(), 'heater', { pick: PICK_CARE })).filter(n => n.item === 'heater')).toEqual([]);
  });
  it('a heater that is too small, or that the design dropped, is a note', () => {
    const b = setEquipment(emptyBrief(), 'heater', { pick: PICK_CARE });
    expect(ownedFit(ownHeater(planted(), 5), b).map(n => n.id)).toContain('heater:small');
    expect(ownedFit(planted(), b).map(n => n.id)).toContain('heater:unused');   // the scene holds no owned heater
  });
  it('a light the design dropped, and a filter too small for the stock, are notes', () => {
    const S = planted();
    expect(ownedFit(S, setEquipment(emptyBrief(), 'light', { pick: PICK_CARE })).map(n => n.id)).toContain('light:unused');
    expect(ownedFit({ ...S, light: { ...S.light, owned: true } }, setEquipment(emptyBrief(), 'light', { pick: PICK_CARE })).map(n => n.id)).not.toContain('light:unused');
    expect(ownedFit(S, setEquipment(emptyBrief(), 'filter', { pick: PICK_CARE })).map(n => n.id)).toContain('filter:unused');
  });
  it('an owned tank the design no longer uses is a note; the same tank is not', () => {
    const S = planted(), inch = (mm: number) => Math.round(mm / IN * 10) / 10;
    const same = setEquipment(emptyBrief(), 'tank', { dimsIn: { L: inch(S.tank.L), D: inch(S.tank.D), H: inch(S.tank.H) } });
    expect(ownedFit(S, same).map(n => n.id)).not.toContain('tank:unused');
    const other = setEquipment(emptyBrief(), 'tank', { dimsIn: { L: 12, D: 12, H: 12 } });
    expect(ownedFit(S, other).map(n => n.id)).toContain('tank:unused');
  });
  it('note ids carry no numbers, so an edit does not make the same warning new', () => {
    const b = setEquipment(emptyBrief(), 'heater', { pick: PICK_CARE });
    const a = ownedFit(ownHeater(planted(), 5), b), c = ownedFit(ownHeater(planted(), 8), b);
    expect(a.map(n => n.id)).toEqual(c.map(n => n.id));
  });
});
