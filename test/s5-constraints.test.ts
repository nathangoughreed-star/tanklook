// Lane S5: the Constraints / Preferences view-models, the experience gate in Discover / Suggest, and that the new shell writes the same homes the old UI reads.
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import * as X from '../src/demand/experience';
import { Store } from '../src/scene/store';
import { defaultSetup } from '../src/scene/defaults';
import { emptyBrief, capsOf, homeOf, roomTempC, projectExtras } from '../src/scene/brief';
import { bindBriefStore, setBrief, getBrief } from '../src/ui/setupBrief';
import { profileOf, useLegacyStorage } from '../src/demand/limitsHome';
import { defaultProfile } from '../src/demand/types';
import { suggestFromBrief } from '../src/demand/suggest';
import { gearKindsOf, gatedIn, gateReason, plantVariantsOf } from '../src/scene/experienceGate';
import { makeItem } from '../src/scene/items';
import * as L from '../src/shell/logic/constraints';
import * as PR from '../src/shell/logic/prefs';
import { runFit } from '../src/shell/logic/fit';
import { answersOf } from '../src/scene/quickPrefs';
import { aspectsOf } from '../src/explore/aspects';
import type { TankSetup } from '../src/scene/types';

const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
beforeEach(() => { X.useStorage(mem()); useLegacyStorage(mem()); });
afterEach(() => { X.useStorage(undefined); useLegacyStorage(undefined); });
const exp = () => X.getExperience();

describe('Constraints model and edits', () => {
  it('money, no-new, space, room, home round trip through the brief homes (P5)', () => {
    let b = L.setCap(undefined, 'startupUsd', 300);
    b = L.setCap(b, 'monthlyUsd', 25);
    b = L.setNoNew(b, true); b = L.setSpaceDims(b, 48, 18, 'in'); b = L.setRoomF(b, 70);
    b = L.setWater(b, 'well'); b = L.setKwh(b, 0.15); b = L.setRisk(b, 'safe');
    expect(capsOf(b).startupUsd).toEqual({ on: true, value: 300 });
    expect(projectExtras(b).noNewEquipment).toBe(true);
    expect(homeOf(b)).toMatchObject({ water: 'well', kwhUsd: 0.15, risk: 'safe' });
    expect(Math.round(roomTempC(b)! * 9 / 5 + 32)).toBe(70);
    const m = L.limitsModel(b, 'in', exp());
    expect(m.money.map(r => r.value)).toEqual([300, 25]);
    expect(m.space).toMatchObject({ on: true, w: 48, d: 18, text: '48 x 18 in' });
    expect(m.home.roomF).toBe(70); expect(m.moneyText).toContain('$300 set-up'); expect(m.moneyText).toContain('no new equipment');
    const P = profileOf(b, X.profileSkill());
    expect(P.limits.setupUsd).toBe(300); expect(P.waterSource).toBe('well'); expect(P.kwhUsd).toBe(0.15);
  });
  it('a limit switched off keeps its number and clears with blank / 0', () => {
    let b = L.setCap(undefined, 'startupUsd', 300); b = L.setCapOn(b, 'startupUsd', false);
    expect(L.limitsModel(b, 'in', exp()).money[0]).toMatchObject({ value: 300, on: false });
    expect(profileOf(b, X.profileSkill()).limits.setupUsd).toBeUndefined();
    expect(capsOf(L.setCap(b, 'startupUsd', undefined)).startupUsd).toBeUndefined();
    expect(capsOf(L.setCap(b, 'startupUsd', 0)).startupUsd).toBeUndefined();
  });
  it('setBrief (the old UI writer) copies the caps and space so the old cost panel reads the same', () => {
    const store = new Store(); bindBriefStore(store);
    setBrief(L.setSpaceDims(L.setCap(getBrief(), 'startupUsd', 250), 36, 15, 'in'));
    expect(store.tank.constraints?.startupUsd).toEqual({ on: true, value: 250 });
    expect(store.tank.layout.space).toEqual({ w: Math.round(36 * 25.4), d: Math.round(15 * 25.4) });
    setBrief(L.clearSpace(getBrief())); expect(store.tank.layout.space).toBeUndefined();
  });
  it('experience: off by default with the average-keeper line; one answer for all; more detail per area', () => {
    const off = L.expView(exp()); expect(off.on).toBe(false); expect(off.text).toMatch(/average keeper/); expect(off.off).toMatch(/average keeper/);
    X.setAllLevels(0); let v = L.expView(exp()); expect(v.on).toBe(true); expect(v.one).toBe(0); expect(v.text).toBe('New to it');
    X.setAreaLevel('planted', 2); v = L.expView(exp()); expect(v.one).toBeUndefined(); expect(v.text).toBe('Set per area'); expect(v.rows.find(r => r.area === 'planted')!.level).toBe(2);
    X.setAllLevels(undefined); expect(L.expView(exp()).on).toBe(false);
  });
  it('the link other sections use is section constraints, group home', () => { expect(L.LIMIT_LINK('home')).toEqual({ section: 'constraints', group: 'home' }); expect(L.roomLine(L.setRoomF(undefined, 70))).toBe('room 70 deg F'); });
});

describe('Preferences model and edits', () => {
  it('style cards include the naturalistic ones and the decorative / themed looks; a card cycles Interested, Avoid, cleared', () => {
    const cards = PR.styleCards(undefined, 'freshwater'); const keys = cards.map(c => c.key);
    expect(keys).toEqual(expect.arrayContaining(['freshwater-nature-river', 'freshwater-iwagumi', 'freshwater-decorative', 'freshwater-themed']));
    for (const key of ['freshwater-iwagumi', 'freshwater-decorative']) {
      let b = PR.cycleCard(undefined, key); expect(PR.styleCards(b, 'freshwater').find(c => c.key === key)!.state).toBe('interested');
      b = PR.cycleCard(b, key); expect(PR.styleCards(b, 'freshwater').find(c => c.key === key)!.state).toBe('avoid');
      b = PR.cycleCard(b, key); expect(PR.styleCards(b, 'freshwater').find(c => c.key === key)!.state).toBeUndefined();
    }
  });
  it('a decorative card steers the ranking aspects and survives a catalogue card press', () => {
    let b = PR.cycleCard(undefined, 'freshwater-decorative'); expect(JSON.stringify(aspectsOf(b))).toContain('castle-coloured-gravel');
    b = PR.cycleCard(b, 'freshwater-iwagumi');
    const cs = PR.styleCards(b, 'freshwater'); expect(cs.find(c => c.key === 'freshwater-decorative')!.state).toBe('interested'); expect(cs.find(c => c.key === 'freshwater-iwagumi')!.state).toBe('interested');
    b = PR.toggleAvoid(b, 'snails'); expect(PR.styleCards(b, 'freshwater').find(c => c.key === 'freshwater-decorative')!.state).toBe('interested');
    b = PR.cycleCard(PR.cycleCard(b, 'freshwater-decorative'), 'freshwater-decorative'); expect(JSON.stringify(aspectsOf(b) ?? {})).not.toContain('castle-coloured-gravel');
  });
  it("the don't-want list toggles QP1's avoids", () => {
    let b = PR.toggleAvoid(undefined, 'co2'); expect(answersOf(b).avoid).toContain('co2');
    expect(PR.avoidRows(b, 'freshwater').find(r => r.id === 'co2')!.on).toBe(true);
    b = PR.toggleAvoid(b, 'co2'); expect(answersOf(b).avoid).not.toContain('co2');
    expect(PR.avoidRows(undefined, 'saltwater').some(r => r.id === 'no-live-plants')).toBe(false);
  });
  it('browse looks lists buildable looks and a like toggles', () => {
    const l = PR.browseLooks(undefined, 'freshwater'); expect(l.length).toBeGreaterThan(5);
    const b = PR.toggleLook(undefined, l[0].id); expect(PR.browseLooks(b, 'freshwater')[0].liked).toBe(true);
    expect(PR.browseLooks(PR.toggleLook(b, l[0].id), 'freshwater')[0].liked).toBe(false);
  });
});

describe('experience gating of plants and gear (Discover / Suggest pools)', () => {
  const withCarpet = (): TankSetup => { const S = structuredClone(defaultSetup()) as TankSetup; S.items = [...S.items, makeItem(S.tank, 'carpet', 900, 1, 0, 0)]; return S; };
  it('off: nothing is gated', () => { const S = withCarpet(); S.tech = { rows: { co2: 'pressurized' } } as never; expect(plantVariantsOf(S)).toContain('carpet'); expect(gatedIn(S)).toEqual([]); expect(gateReason(S)).toBeNull(); });
  it('on at New to it: a carpet plant and pressurised CO2 are left out; Experienced lets them through', () => {
    const S = withCarpet(); S.tech = { rows: { co2: 'pressurized', filter: 'hob' } } as never;
    expect(gearKindsOf(S)).toEqual(expect.arrayContaining(['co2pressurized', 'hob']));
    X.setAllLevels(0);
    expect(gatedIn(S).map(g => g.id)).toEqual(expect.arrayContaining(['carpet', 'co2pressurized'])); expect(gatedIn(S).find(g => g.id === 'hob')).toBeUndefined();
    expect(gateReason(S)).toMatch(/rated harder/);
    expect(gatedIn(S, S)).toEqual([]);   // what is already in the design is not blamed
    X.setAllLevels(2); expect(gatedIn(S)).toEqual([]);
  });
  it('Suggest at $300: respects the budget, and with experience New to it no proposal holds gated gear or plants', () => {
    let b = L.setCap(undefined, 'startupUsd', 300); b = L.setCap(b, 'monthlyUsd', 40);
    const P = profileOf(b, X.profileSkill()), now = Date.parse('2026-11-14');
    const off = suggestFromBrief(b, P, 'in', now); expect(off.proposals.length).toBeGreaterThan(0);
    for (const p of off.proposals) expect(p.totals.startupUsd).toBeLessThanOrEqual(300);
    X.setAllLevels(0);
    const on = suggestFromBrief(b, profileOf(b, X.profileSkill()), 'in', now);
    for (const p of on.proposals) { expect(p.totals.startupUsd).toBeLessThanOrEqual(300); expect(gatedIn(p.scene)).toEqual([]); }
    const run = runFit(b, profileOf(b, X.profileSkill()), 'in', now); expect(run.cards.length === 0 ? run.message.length : run.cards[0].setupUsd).toBeGreaterThan(0);
  });
});

describe('the shell and the old UI share one home', () => {
  it('values written the shell way read the same in the old cost profile', () => {
    const store = new Store(); bindBriefStore(store);
    setBrief(L.setKwh(L.setWater(L.setRoomF(L.setCap(getBrief(), 'monthlyUsd', 30), 68), 'tap'), 0.2));
    const P = profileOf(store.tank.brief, X.profileSkill());
    expect(P.limits.upkeepUsd).toBe(30); expect(P.kwhUsd).toBe(0.2); expect(Math.round(roomTempC(store.tank.brief)! * 9 / 5 + 32)).toBe(68);
    expect(defaultProfile().limits).toBeDefined();
    expect(emptyBrief().items).toEqual({});
  });
});
