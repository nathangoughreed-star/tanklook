import { describe, expect, it } from 'vitest';
import { emptyBrief, getItem, parseBrief, serializeBrief, valueOf } from '../src/scene/brief';
import { INTENT_CARDS, KIND_CARDS, STEP_ORDER, applyKindChoice, clearLimits, kindOf, nextStep, prevStep, railOf, readState, routeOf, setNeedStand, setSetupHours, writeState } from '../src/ui/guided/steps';
import { cardHtml, railHtml } from '../src/ui/guided/flow';
import { setBudget, setOwnedKey, setRoomTempF, setCareTime, setTapWater, setSpace, ownedKeys } from '../src/ui/setupBrief';

describe('guided steps', () => {
  it('runs Kind > Start from > What you have > Limits, and Back undoes each step', () => {
    expect(STEP_ORDER).toEqual(['kind', 'start', 'have', 'limits']);
    expect(nextStep('kind')).toBe('start'); expect(nextStep('have')).toBe('limits'); expect(nextStep('limits')).toBeUndefined();
    expect(prevStep('limits')).toBe('have'); expect(prevStep('kind')).toBeUndefined();
    for (const s of STEP_ORDER.slice(1)) expect(nextStep(prevStep(s)!)).toBe(s);
  });
  it('kind cards: five, paludarium is the vivarium kind, any fixes nothing', () => {
    expect(KIND_CARDS.map(c => c.id)).toEqual(['freshwater', 'saltwater', 'terrarium', 'paludarium', 'any']);
    expect(kindOf('paludarium')).toBe('vivarium'); expect(kindOf('any')).toBeUndefined(); expect(kindOf('saltwater')).toBe('saltwater');
    const b = applyKindChoice(emptyBrief(), 'saltwater');
    expect(valueOf(b, 'animals.kinds')).toEqual(['saltwater']);
    expect(getItem(applyKindChoice(b, 'any'), 'animals.kinds')).toBeUndefined();
  });
  it('routes per intent: animals -> stocking, appearance -> look, equipment and ideas -> suggest', () => {
    expect(INTENT_CARDS.map(c => [c.id, routeOf(c.id)])).toEqual([['animals', 'stocking'], ['look', 'look'], ['equipment', 'suggest'], ['ideas', 'suggest']]);
  });
  it('the rail shows where you are, names the routed screen and keeps a Report slot', () => {
    const r = railOf('have', 'animals');
    expect(r.map(x => [x.label, x.state])).toEqual([['Kind', 'done'], ['Start from', 'done'], ['What you have', 'current'], ['Limits', 'todo'], ['Animals', 'todo'], ['Report', 'todo']]);
    const routed = railOf('stocking', 'animals');
    expect(routed.slice(0, 4).every(x => x.state === 'done')).toBe(true);
    expect(routed[4]).toMatchObject({ label: 'Animals', state: 'current' });
    expect(railOf('kind', undefined)[4].label).toBe('Next');
    expect(railHtml(r, false)).toContain('data-rail="report"');
  });
  it('the position lives in the brief and survives save and reload', () => {
    let b = writeState(emptyBrief(), { step: 'have', kind: 'paludarium', intent: 'look', limits: false });
    expect(readState(b)).toEqual({ step: 'have', kind: 'paludarium', intent: 'look', limits: false });
    b = writeState(b, { step: 'limits', kind: 'paludarium', intent: 'look' });   // replaces, never piles up
    expect(readState(b)).toEqual({ step: 'limits', kind: 'paludarium', intent: 'look' });
    const re = parseBrief(JSON.parse(serializeBrief(b)))!;
    expect(readState(re)).toEqual({ step: 'limits', kind: 'paludarium', intent: 'look' });
    expect(readState(emptyBrief())).toEqual({ step: 'kind' });
  });
  it('stand: owned writes constraints.owned.stand, "need a stand?" writes equipment.needStand', () => {
    let b = setOwnedKey(emptyBrief(), 'stand', true);
    expect(ownedKeys(b)).toContain('stand');
    b = setNeedStand(b, false); expect(valueOf(b, 'equipment.needStand')).toBe(false);
    b = setNeedStand(b, true); expect(valueOf(b, 'equipment.needStand')).toBe(true);
    expect(getItem(setNeedStand(b, undefined), 'equipment.needStand')).toBeUndefined();
    expect(ownedKeys(setOwnedKey(b, 'stand', false))).not.toContain('stand');
  });
  it('limits "No" leaves every limit unset; "Yes" fields write the brief', () => {
    let b = setSetupHours(setTapWater(setRoomTempF(setSpace(setCareTime(setBudget(emptyBrief(), 300), 60), { w: 900, d: 400 }), 70), { source: 'tap' }), 4);
    expect(valueOf(b, 'constraints.budget')).toBe(300); expect(valueOf(b, 'constraints.setupHours')).toBe(4); expect(valueOf(b, 'constraints.careMin')).toBe(60);
    b = writeState(clearLimits(b), { step: 'limits', limits: false });
    for (const id of ['constraints.budget', 'constraints.monthly', 'constraints.careMin', 'constraints.setupHours', 'constraints.maxSpace', 'constraints.roomTempC', 'constraints.tapWater'] as const) expect(getItem(b, id)).toBeUndefined();
    expect(readState(b).limits).toBe(false);
    expect(getItem(setSetupHours(b, undefined), 'constraints.setupHours')).toBeUndefined();
  });
  it('cards: a placeholder (gradient + icon) under an <img> for public/art/guided/<name>.webp, and every slot is in the art brief', async () => {
    // @ts-expect-error node only
    const fs = await import('node:fs'), brief = fs.readFileSync(new URL('../research/design/guided-art-brief.md', import.meta.url), 'utf8');
    for (const c of [...KIND_CARDS, ...INTENT_CARDS]) {
      expect(brief).toContain(`${c.art}.webp`);
      const html = cardHtml(c, c.id === 'any' ? 'kind' : 'from', 0, false, '/');
      expect(html).toContain('class="gv-ph"');
      expect(html).toContain(`src="/art/guided/${c.art}.webp"`);
      expect(html).toContain(c.title);
    }
    expect(cardHtml(KIND_CARDS[0], 'kind', 0, true)).toContain('aria-pressed="true"');
  });
});
