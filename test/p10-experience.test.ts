// Lane P10: ONE optional experience constraint (demand/experience.ts). Off = no gate, an average keeper in the numbers.
import { beforeEach, describe, expect, it } from 'vitest';
import * as X from '../src/demand/experience';
import { PLANT_CARE } from '../src/data/plantCare';
import { GEAR_CARE } from '../src/data/gearCare';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { defaultSetup } from '../src/scene/defaults';
import { starterAnimals } from '../src/scene/starter';
import * as AP from '../src/ui/logic/animalPicker';
import * as PG from '../src/ui/logic/plantGate';
import { defaultProfile } from '../src/demand/types';
import { demandOf } from '../src/demand/engine';
import type { TankSetup } from '../src/scene/types';

const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
let st: ReturnType<typeof mem>;
beforeEach(() => { st = mem(); X.useStorage(st); });

describe('off by default', () => {
  it('is off: no gate in any area, an average keeper in the profile', () => {
    expect(X.experienceOn()).toBe(false);
    for (const a of X.AREAS) { expect(X.experienceOf(a)).toBeNull(); expect(X.careGate(a)).toBeNull(); }
    expect(X.profileSkill()).toEqual({ fundamentals: 1, fish: 1, planted: 1, salt: 1, terrarium: 1 });
  });
  it('the demand numbers with the switch off equal skill 1 everywhere', () => {
    const S = defaultSetup(), P1 = { ...defaultProfile(), skill: { fundamentals: 1, fish: 1, planted: 1, salt: 1, terrarium: 1 } as never };
    const Poff = { ...defaultProfile(), skill: X.profileSkill() };
    expect(JSON.stringify(demandOf(S, Poff, { now: 1.78e12 }).totals)).toBe(JSON.stringify(demandOf(S, P1, { now: 1.78e12 }).totals));
  });
});

describe('on, per area', () => {
  it('one answer sets every area; an area is set on its own', () => {
    X.setAllLevels(2); expect(X.experienceOn()).toBe(true);
    for (const a of X.AREAS) expect(X.experienceOf(a)).toBe(2);
    X.setAreaLevel('salt', 0);
    expect(X.experienceOf('salt')).toBe(0); expect(X.careGate('salt')).toBe(1); expect(X.experienceOf('fish')).toBe(2);
    expect(X.profileSkill().salt).toBe(0);
  });
  it('turning it off keeps the levels for later and removes every gate', () => {
    X.setAllLevels(2); X.setExperienceOn(false);
    expect(X.experienceOf('fish')).toBeNull(); expect(X.getExperience().levels.fish).toBe(2);
    X.setExperienceOn(true); expect(X.experienceOf('fish')).toBe(2);
  });
  it('is stored once per browser and read back', () => {
    X.setAllLevels(1); X.setAreaLevel('planted', 2);
    X.useStorage(st); // a new page load
    expect(X.experienceOf('planted')).toBe(2); expect(X.experienceOf('fish')).toBe(1);
  });
  it('notifies listeners', () => { let n = 0; const off = X.onExperience(() => n++); X.setAllLevels(1); off(); X.setAllLevels(0); expect(n).toBe(1); });
});

describe('migration', () => {
  it('a saved profile with any non-zero skill keeps it and turns the switch on', () => {
    st.setItem('tanklook.demand', JSON.stringify({ skill: { fundamentals: 0, fish: 2, planted: 0, salt: 1, terrarium: 0 }, limits: {} }));
    X.useStorage(st);
    expect(X.experienceOn()).toBe(true); expect(X.experienceOf('fish')).toBe(2); expect(X.experienceOf('salt')).toBe(1); expect(X.experienceOf('planted')).toBe(0);
  });
  it('an all-zero profile stays off', () => {
    st.setItem('tanklook.demand', JSON.stringify({ skill: { fundamentals: 0, fish: 0, planted: 0, salt: 0, terrarium: 0 } }));
    X.useStorage(st); expect(X.experienceOn()).toBe(false);
  });
  it('a scene preferences.experience > 0 sets every area and turns it on; a profile with skill wins', () => {
    expect(X.adoptLegacy({ briefExperience: 2 })).toBe(true);
    for (const a of X.AREAS) expect(X.experienceOf(a)).toBe(2);
    st = mem(); st.setItem('tanklook.demand', JSON.stringify({ skill: { fish: 1 } })); X.useStorage(st);
    expect(X.adoptLegacy({ briefExperience: 2 })).toBe(false); expect(X.experienceOf('fish')).toBe(1); expect(X.experienceOf('salt')).toBe(0);
  });
  it('briefExperience 0 stays off; layout.expertise is the older fallback', () => {
    expect(X.adoptLegacy({ briefExperience: 0 })).toBe(false); expect(X.experienceOn()).toBe(false);
    expect(X.adoptLegacy({ layoutExpertise: 3 })).toBe(true); expect(X.experienceOf('fish')).toBe(2);
  });
  it('the share-link fallback never overrides a decision already made in this browser', () => {
    X.setAllLevels(undefined); // the person chose: off
    expect(X.adoptLegacy({ briefExperience: 2 })).toBe(false); expect(X.experienceOn()).toBe(false);
  });
});

describe('animals', () => {
  const lvl3 = (): string => Object.keys(CARE).find(id => CARE[id].care === 3 && getSpecies(id))!;
  const fresh = (): TankSetup => { const s = defaultSetup(); s.layout.gateStock = true; s.layout.gateAnimals = true; return s; };
  it('off: the gate box is off and nothing is grayed', () => {
    const s = fresh(); expect(AP.experienceIn(s)).toBeNull(); expect(AP.gateView(s).on).toBe(false); expect(AP.animalGate(s, 'in')).toBeNull();
  });
  it('on: a beginner level grays an expert animal, an experienced level does not', () => {
    const s = fresh(), sp = getSpecies(lvl3())!;
    X.setAllLevels(0); const g0 = AP.animalGate(s, 'in'); expect(g0).not.toBeNull(); expect(g0!(sp)?.kind).toBe('expertise');
    X.setAllLevels(2); const g2 = AP.animalGate(s, 'in'); expect(g2!(sp)?.kind).not.toBe('expertise');
  });
  it('starter stocking leaves gated animals out only while on', () => {
    const s = fresh(); s.tank = { ...s.tank, L: 1200, H: 600, D: 540 }; s.layout = { ...s.layout, id: 'malawi', seed: 4, dens: { hard: 2, plant: 2, animal: 3 } }; s.fish = [];
    const idsOff = starterAnimals(s, 1).map(f => f.species);
    X.setAllLevels(0); const idsOn = starterAnimals(s, 1).map(f => f.species);
    expect(idsOn.every(id => (CARE[id]?.care ?? 1) <= 1)).toBe(true);
    expect(idsOff.length).toBeGreaterThan(0); expect(idsOff.some(id => (CARE[id]?.care ?? 1) > 1)).toBe(true);
  });
  it('leaveOutGated drops what is above the area level, keeps all when off', () => {
    const list = ['a', 'b', 'c'], lv: Record<string, 1 | 2 | 3> = { a: 1, b: 2, c: 3 };
    expect(X.leaveOutGated(list, x => lv[x], 'fish')).toEqual(list);
    X.setAllLevels(1); expect(X.leaveOutGated(list, x => lv[x], 'fish')).toEqual(['a', 'b']);
  });
});

describe('plants and gear', () => {
  const hard = Object.keys(PLANT_CARE).find(k => PLANT_CARE[k].level === 3)!, easy = Object.keys(PLANT_CARE).find(k => PLANT_CARE[k].level === 1)!;
  it('plants are gated only when on, by the planted level, with a one-line why', () => {
    expect(X.plantGated(hard)).toBeNull();
    X.setAreaLevel('planted', 0); expect(X.plantGated(hard)).toMatch(/expert/); expect(X.plantGated(easy)).toBeNull();
    X.setAreaLevel('planted', 2); expect(X.plantGated(hard)).toBeNull();
    expect(X.plantGated('no-such-plant')).toBeNull();
  });
  it('the plant gate (P3) adds the experience reason on top of light, only when on', () => {
    const s = defaultSetup(); s.layout.gatePlants = true; s.layout.careSet = true; s.layout.fit = 'medium' as never;
    const v = PG.gateView(s);
    const chips = [{ variant: hard, salt: false }, { variant: easy, salt: false }];
    const off = PG.gatedChips(v, s, chips).find(c => c.variant === hard);
    X.setAreaLevel('planted', 0);
    const on = PG.gatedChips(v, s, chips).find(c => c.variant === hard);
    expect(on?.why).toMatch(/expert/); expect(off?.why ?? '').not.toMatch(/you said/);
  });
  it('gear is gated by the fundamentals level when on', () => {
    const hard2 = Object.keys(GEAR_CARE).find(k => GEAR_CARE[k].level === 2)!, easy1 = Object.keys(GEAR_CARE).find(k => GEAR_CARE[k].level === 1)!;
    expect(X.gearGated(hard2)).toBeNull();
    X.setAllLevels(0); expect(X.gearGated(hard2)).toMatch(/intermediate/); expect(X.gearGated(easy1)).toBeNull();
    X.setAllLevels(1); expect(X.gearGated(hard2)).toBeNull();
  });
});
