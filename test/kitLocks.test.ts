// R125: parts a bundle includes are locked; a swap is caught by the Store's kit gate, which asks before it unlocks.
import { describe, it, expect } from 'vitest';
import { Store } from '../src/scene/store';
import { freshScene } from '../src/scene/freshScene';
import { lockKitParts } from '../src/scene/locks';

const mk = () => { const s = new Store(freshScene()); lockKitParts(s.tank, ['tank', 'stand', 'lid', 'light']); return s; };
describe('kit gate', () => {
  it('asks before a locked stand changes; Cancel drops the edit', () => {
    const s = mk(), h0 = s.tank.stand.height, asked: string[][] = []; let go: (u: boolean) => void = () => {};
    s.kitGate = (hit, g) => { asked.push(hit.map(x => x.name)); go = g; };
    s.edit(t => { t.stand.height = h0 + 50; });
    expect(asked).toEqual([['stand and lid']]); expect(s.tank.stand.height).toBe(h0);
    go(false); expect(s.tank.stand.height).toBe(h0); expect(s.tank.locks?.objects.some(o => o.target === 'tank')).toBe(true);
  });
  it('Unlock applies the edit and drops that lock only', () => {
    const s = mk(), h0 = s.tank.stand.height; let go: (u: boolean) => void = () => {};
    s.kitGate = (_h, g) => { go = g; };
    s.edit(t => { t.stand.height = h0 + 50; }); go(true);
    expect(s.tank.stand.height).toBe(h0 + 50); expect(s.tank.locks?.objects.some(o => o.target === 'tank')).toBe(false); expect(s.tank.locks?.objects.some(o => o.target === 'light')).toBe(true);
  });
  it('lets an unrelated edit through', () => {
    const s = mk(); s.kitGate = () => { throw new Error('asked'); };
    s.edit(t => { t.water.on = !t.water.on; });
  });
});
