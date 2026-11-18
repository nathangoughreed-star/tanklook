// P5: one home per limit. The cost profile lives in the brief; room temperature is stored once.
import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { capsOf, emptyBrief, homeOf, parseBrief, roomTempC, setHome, withCaps, withRoomTempC } from '../src/scene/brief';
import { legacyProfile, profileOf, useLegacyStorage } from '../src/demand/limitsHome';
import { keepSet, techOf, heatLoss } from '../src/scene/tech';
import { effectiveLimits } from '../src/scene/constraints';

const skill = { fundamentals: 1, fish: 1, planted: 1, salt: 1, terrarium: 1 } as const;
const mem = (o: Record<string, string> = {}) => ({ getItem: (k: string) => o[k] ?? null });
const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('P5 profile in the brief', () => {
  it('a $300 budget, 68 F room, water and rate reopen from a saved scene', () => {
    const sc = defaultScene(); const T = sc.tanks[sc.active];
    let b = withCaps(emptyBrief(), { startupUsd: { on: true, value: 300 }, minutesPerWeek: { on: true, value: 45 } });
    b = withRoomTempC(b, 20); b = setHome(b, { water: 'own-ro', kwhUsd: 0.21, risk: 'safe' });
    T.brief = b;
    const back = parseScene(roundTrip(sc)).scene, B = back.tanks[back.active].brief!;
    expect(capsOf(B).startupUsd).toEqual({ on: true, value: 300 }); expect(roomTempC(B)).toBe(20); expect(homeOf(B)).toEqual({ water: 'own-ro', kwhUsd: 0.21, risk: 'safe' });
    const P = profileOf(B, skill, {});
    expect(P).toMatchObject({ waterSource: 'own-ro', kwhUsd: 0.21, limits: { setupUsd: 300, risk: 'safe' } }); expect(P.limits.minPerWeek).toBeUndefined();   // R137: care time is never a limit
  });
  it('an invalid home is dropped on load; an empty home leaves no project', () => {
    const b = parseBrief({ v: 5, items: {}, project: { home: { water: 'rain', kwhUsd: -2, risk: 'x' } } });
    expect(b).toBeUndefined();
    expect(setHome(setHome(emptyBrief(), { risk: 'safe' }), { risk: undefined }).project).toBeUndefined();
  });
  it('the old browser profile fills only what the brief has not said (read-only migration)', () => {
    const legacy = legacyProfileOf({ waterSource: 'well', kwhUsd: 0.3, limits: { setupUsd: 500, minPerWeek: 30, risk: 'moderate' } });
    expect(profileOf(undefined, skill, legacy)).toMatchObject({ waterSource: 'well', kwhUsd: 0.3, limits: { setupUsd: 500, risk: 'moderate' } });
    const b = withCaps(setHome(emptyBrief(), { water: 'tap' }), { startupUsd: { on: false, value: 200 } }); // a switched-off budget is "said": no limit, no fallback
    const P = profileOf(b, skill, legacy);
    expect(P.limits.setupUsd).toBeUndefined(); expect(P.waterSource).toBe('tap'); expect(P.kwhUsd).toBe(0.3); expect(P.limits.minPerWeek).toBeUndefined();
    expect(profileOf(withCaps(emptyBrief(), { startupUsd: { on: true, value: 150 } }), skill, legacy).limits.setupUsd).toBe(150);
  });
  it('the engine limits are unchanged: tank guardrails win, else the profile', () => {
    const P = profileOf(withCaps(emptyBrief(), { startupUsd: { on: true, value: 300 } }), skill, {});
    expect(effectiveLimits(undefined, P.limits)).toEqual({ setupUsd: 300 });
  });
  it('legacyProfile reads the stored profile and drops its skill and old budgetMode', () => {
    useLegacyStorage(mem({ 'tanklook.demand': JSON.stringify({ skill: { fish: 2 }, waterSource: 'well', limits: { setupUsd: 99, budgetMode: 'x' } }) }));
    expect(legacyProfile()).toEqual({ waterSource: 'well', limits: { setupUsd: 99 } });
    useLegacyStorage(undefined);
  });
});
const legacyProfileOf = (p: Parameters<typeof profileOf>[2]) => p;

describe('P5 room temperature stored once', () => {
  it('an old save with tech.roomC migrates into the brief and the tech no longer holds it', () => {
    const sc = defaultScene(), T = sc.tanks[sc.active];
    delete T.brief; (T as { tech?: unknown }).tech = { rows: { heater: 'heater' }, roomC: 18 };
    const back = parseScene(roundTrip(sc)).scene.tanks[0] ?? parseScene(roundTrip(sc)).scene.tanks[sc.active];
    expect(roomTempC(back.brief)).toBe(18); expect(back.tech?.roomC).toBeUndefined(); expect(techOf(back).roomC).toBe(18);
  });
  it('the brief wins over a migrating tech.roomC; a tech with only the room disappears', () => {
    const sc = defaultScene(), T = sc.tanks[sc.active];
    T.brief = withRoomTempC(emptyBrief(), 22); (T as { tech?: unknown }).tech = { rows: {}, roomC: 18 };
    const back = parseScene(roundTrip(sc)).scene, t = back.tanks[back.active];
    expect(roomTempC(t.brief)).toBe(22); expect(t.tech).toBeUndefined();
  });
  it('a tech edit never stores a copy of the brief room; heater sizing reads the brief', () => {
    const sc = defaultScene(), T = sc.tanks[sc.active]; T.brief = withRoomTempC(emptyBrief(), 16);
    const kept = keepSet(T, { ...techOf(T) });
    expect(kept.roomC).toBeUndefined(); expect(techOf({ ...T, tech: kept }).roomC).toBe(16);
    const cold = heatLoss(T).lossW, warm = heatLoss({ ...T, brief: withRoomTempC(T.brief, 24) }).lossW;
    expect(cold).toBeGreaterThan(warm);
  });
});
