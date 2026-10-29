import { describe, expect, it } from 'vitest';
import { emptyBrief, parseBrief, serializeBrief, setItem, setFlex, targetOf, isFlex, hasState } from '../src/scene/brief';
import { addFuture, answeredOf, directionOf, futureOf, recordAnswer, removeFuture, roomTempFOf, setBudget, setDirection, setLimitTarget, setRoomTempF, setSpace, setSpaceTarget, setTapWater, spaceTargetOf, tapWaterOf, labelOf, profileWaterSource } from '../src/ui/setupBrief';

describe('brief v2', () => {
  it('stores max vs target and survives a value edit and a round trip', () => {
    let b = setBudget(emptyBrief(), 250);
    b = setLimitTarget(b, 'constraints.budget', 200); b = setFlex(b, 'constraints.budget', true);
    expect(targetOf(b, 'constraints.budget')).toBe(200);
    b = setBudget(b, 300);
    expect(targetOf(b, 'constraints.budget')).toBe(200); expect(isFlex(b, 'constraints.budget')).toBe(true);
    expect(labelOf(b, 'constraints.budget')).toBe('target $200, up to $300');
    const r = parseBrief(JSON.parse(serializeBrief(b)))!;
    expect(r).toEqual(b); expect(r.v).toBe(2);
  });
  it('a target above the max is refused, and dropped when the max falls below it', () => {
    let b = setBudget(emptyBrief(), 250);
    expect(setLimitTarget(b, 'constraints.budget', 300)).toBe(b);
    b = setLimitTarget(b, 'constraints.budget', 200); b = setBudget(b, 150);
    expect(targetOf(b, 'constraints.budget')).toBeUndefined();
    expect(parseBrief({ v: 2, items: { 'constraints.budget': { value: 100, status: 'hard', target: 500 } } })!.items['constraints.budget']!.target).toBeUndefined();
  });
  it('space target is a footprint under the max', () => {
    let b = setSpace(emptyBrief(), { w: 1000, d: 400 });
    b = setSpaceTarget(b, { w: 900, d: 350 }); expect(spaceTargetOf(b)).toEqual({ w: 900, d: 350 });
    expect(setSpaceTarget(b, { w: 1100, d: 350 })).toBe(b);
  });
  it('environment: deg F in, deg C stored; tap water validated', () => {
    let b = setRoomTempF(emptyBrief(), 68); expect(b.items['constraints.roomTempC']!.value).toBe(20); expect(roomTempFOf(b)).toBe(68);
    b = setTapWater(b, { source: 'well', hardnessDgh: 12, ph: 7.4 }); expect(tapWaterOf(b)).toEqual({ source: 'well', hardnessDgh: 12, ph: 7.4 });
    expect(profileWaterSource(b)).toBe('well');
    expect(parseBrief({ v: 2, items: { 'constraints.tapWater': { value: { source: 'rain' }, status: 'preference' } } })).toBeUndefined();
    expect(parseBrief({ v: 2, items: { 'constraints.tapWater': { value: { source: 'tap', ph: 99, hardnessDgh: 5 }, status: 'preference' } } })!.items['constraints.tapWater']!.value).toEqual({ source: 'tap', hardnessDgh: 5 });
  });
  it('questions, direction and future ambitions persist', () => {
    let b = recordAnswer(setDirection(emptyBrief(), 'look'), 'priority');
    expect(hasState(b)).toBe(true);
    const r = parseBrief(JSON.parse(serializeBrief(b)))!; expect(answeredOf(r)).toEqual(['priority']); expect(directionOf(r)).toBe('look');
    b = addFuture(b, 'a reef tank', 'budget'); expect(futureOf(b)).toEqual([{ text: 'a reef tank', from: 'budget' }]);
    expect(futureOf(removeFuture(b, 0))).toEqual([]);
    b = setItem(b, 'preferences.adapt', 'some');
    expect(parseBrief(JSON.parse(serializeBrief(b)))).toEqual(b);
  });
  it('a v1 save loads unchanged', () => {
    const v1 = { v: 1, items: { 'constraints.budget': { value: 200, status: 'hard' }, 'preferences.tags': { value: ['calm'], status: 'preference' } } };
    const b = parseBrief(v1)!; expect(b.items['constraints.budget']).toEqual({ value: 200, status: 'hard' }); expect(b.dialog).toBeUndefined();
  });
});
