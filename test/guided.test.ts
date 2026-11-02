// Lane VD5: the old Guided stepper (Kind / Start from / What you have / Limits) is retired; the brief items its panels write are tested here.
import { describe, expect, it } from 'vitest';
import { emptyBrief, getItem, valueOf } from '../src/scene/brief';
import { setBudget, setOwnedKey, setRoomTempF, setCareTime, setTapWater, setSpace, setSetupHours, setNeedStand, ownedKeys } from '../src/ui/setupBrief';

describe('Make It Your Own panels: brief data', () => {
  it('stand: owned writes constraints.owned.stand, "need a stand?" writes equipment.needStand', () => {
    let b = setOwnedKey(emptyBrief(), 'stand', true);
    expect(ownedKeys(b)).toContain('stand');
    b = setNeedStand(b, false); expect(valueOf(b, 'equipment.needStand')).toBe(false);
    b = setNeedStand(b, true); expect(valueOf(b, 'equipment.needStand')).toBe(true);
    expect(getItem(setNeedStand(b, undefined), 'equipment.needStand')).toBeUndefined();
    expect(ownedKeys(setOwnedKey(b, 'stand', false))).not.toContain('stand');
  });
  it('limits fields write the brief; set-up hours clear one bound at a time', () => {
    const b = setSetupHours(setTapWater(setRoomTempF(setSpace(setCareTime(setBudget(emptyBrief(), 300), 60), { w: 900, d: 400 }), 70), { source: 'tap' }), 4);
    expect(valueOf(b, 'constraints.budget')).toBe(300); expect(valueOf(b, 'constraints.setupHours')).toBe(4); expect(valueOf(b, 'constraints.careMin')).toBe(60);
    expect(getItem(setSetupHours(b, undefined), 'constraints.setupHours')).toBeUndefined();
  });
});
