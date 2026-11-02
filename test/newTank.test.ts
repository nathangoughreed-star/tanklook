import { afterEach, describe, expect, it } from 'vitest';
import { emptyScene, defaultScene } from '../src/scene/defaults';
import { setItem, emptyBrief } from '../src/scene/brief';
import { atStake, confirmNew, hasWork } from '../src/ui/newTank';
import { firstOpen, knownOf, NOTHING_KNOWN } from '../src/ui/discovery/logic';

const stocked = () => { const s = defaultScene(); return s; };
const withFish = () => { const s = emptyScene(); s.tanks[0].fish.push({ id: 1, species: 'yellowlab', x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 } as never); return s; };

describe('New starts clean (lane NW1)', () => {
  it('an empty tank has nothing to lose; animals, a brief or a pinned kit do', () => {
    expect(hasWork(emptyScene())).toBe(false);
    expect(hasWork(withFish())).toBe(true);
    expect(hasWork(stocked())).toBe(true);
    const b = emptyScene(); b.tanks[0].brief = setItem(emptyBrief(), 'constraints.budget', 300, 'hard'); expect(hasWork(b)).toBe(true);
    const k = emptyScene(); k.tanks[0].product = { kit: 'x' } as never; expect(hasWork(k)).toBe(true);
    const r = emptyScene(); r.tanks[0].tank = { ...r.tanks[0].tank, L: r.tanks[0].tank.L * 2 }; expect(hasWork(r)).toBe(true);
  });
  it('warns only when something would be lost and it is not already saved as it stands', () => {
    expect(atStake(emptyScene(), null)).toBe(false);
    expect(atStake(withFish(), null)).toBe(true);
    const s = withFish();
    expect(atStake(s, JSON.stringify(s))).toBe(false);
    expect(atStake(s, JSON.stringify(withFish()) + ' ')).toBe(true);
  });
  it('a new tank has no roster or vision, so Guided opens at World', () => {
    const s = emptyScene().tanks[0];
    expect(s.fish.length).toBe(0);
    expect(s.brief?.vision).toBeUndefined();
    expect(knownOf(s.fish.map(f => f.species))).toEqual(NOTHING_KNOWN);
    expect(firstOpen({}, knownOf([]))).toBe('environment');
    // the old bug: the previous tank's animals answer World and Water
    expect(firstOpen({}, knownOf(['yellowlab']))).not.toBe('environment');
  });
});

describe('the replace warning dialog', () => {
  const els: Record<string, { onclick?: () => void }> = {};
  const dlg = { open: false, oncancel: null as null | (() => void), onclose: null as null | (() => void), showModal() { this.open = true; }, close() { this.open = false; this.onclose?.(); } };
  const setup = () => {
    for (const id of ['newSave', 'newGo', 'newCancel']) els[id] = {};
    (globalThis as { document?: unknown }).document = { getElementById: (id: string) => id === 'newDlg' ? dlg : els[id] };
    dlg.open = false;
  };
  afterEach(() => { delete (globalThis as { document?: unknown }).document; });
  it('Cancel changes nothing (false); Start new goes ahead; Esc cancels', async () => {
    setup(); let p = confirmNew(() => true); expect(dlg.open).toBe(true); els.newCancel.onclick!(); expect(await p).toBe(false);
    setup(); p = confirmNew(() => true); els.newGo.onclick!(); expect(await p).toBe(true);
    setup(); p = confirmNew(() => true); dlg.oncancel!(); expect(await p).toBe(false);
  });
  it('Save goes ahead only when the save worked', async () => {
    setup(); let ok = false; const p = confirmNew(() => ok);
    els.newSave.onclick!(); expect(dlg.open).toBe(true);
    ok = true; els.newSave.onclick!(); expect(await p).toBe(true); expect(dlg.open).toBe(false);
  });
});
