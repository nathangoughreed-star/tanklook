import { describe, expect, it } from 'vitest';
import { emptyBrief, parseBrief, serializeBrief, setItem, setFlex, setRange, isFlex, hasState } from '../src/scene/brief';
import { addFuture, answeredOf, directionOf, futureOf, recordAnswer, removeFuture, roomTempFOf, setBudget, setDirection, setRoomTempF, setTapWater, tapWaterOf, labelOf, profileWaterSource } from '../src/ui/setupBrief';

describe('brief v2', () => {
  it('stores a range and survives an upper-bound edit and a round trip', () => {
    let b = setBudget(emptyBrief(), 250);
    b = setRange(b, 'constraints.budget', { min: 200, max: 250 }); b = setFlex(b, 'constraints.budget', true);
    b = setBudget(b, 300);
    expect(b.items['constraints.budget']).toMatchObject({ value: 300, min: 200, flex: true });
    expect(isFlex(b, 'constraints.budget')).toBe(true);
    expect(labelOf(b, 'constraints.budget')).toBe('$200-300');
    const r = parseBrief(JSON.parse(serializeBrief(b)))!;
    expect(r).toEqual(b); expect(r.v).toBe(3);
  });
  it('a lower bound the new maximum falls below is dropped; an old target is dropped on load', () => {
    let b = setRange(emptyBrief(), 'constraints.budget', { min: 200, max: 250 });
    b = setItem(b, 'constraints.budget', 150);
    expect((b.items['constraints.budget'] as { min?: number }).min).toBeUndefined();
    const old = parseBrief({ v: 2, items: { 'constraints.budget': { value: 100, status: 'hard', target: 50 } } })!.items['constraints.budget']!;
    expect(old).toEqual({ value: 100, status: 'hard' });
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
