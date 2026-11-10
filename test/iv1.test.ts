// Lane IV1: while Discovery is open, autosave persists the working design as it was found (plus the requirements), never a preview write.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { lockRoster } from '../src/scene/locks';

describe('IV1: autosave never stores a Discovery preview write', () => {
  it('persists the found design with the current locks; plain after close', () => {
    const s = new Store({ ...defaultScene(), tanks: [structuredClone(defaultSetup())] });
    s.persistBase = s.snapshotAll().scene; s.frozen = true;
    const was = s.tank.water.level;
    s.frozen = false; s.update(t => { t.tanks[0].water.level = was === 0.5 ? 0.6 : 0.5; }); s.frozen = true;   // a Keep copying a value in
    s.update(t => { lockRoster(t.tanks[0], 'neon-tetra', 'atLeast', 6); }, { history: false });   // a requirement
    const mem: Record<string, string> = {}, st = { setItem: (k: string, v: string) => { mem[k] = v; } } as unknown as Storage;
    s.saveLocal(st);
    const saved = JSON.parse(Object.values(mem)[0]);
    expect(saved.tanks[0].water.level).toBe(was);
    expect(JSON.stringify(saved.tanks[0].locks)).toBe(JSON.stringify(s.tank.locks));
    expect(JSON.stringify(saved.tanks[0].locks)).toContain('neon-tetra');
    s.persistBase = undefined; s.saveLocal(st);
    expect(JSON.parse(Object.values(mem)[0]).tanks[0].water.level).toBe(s.tank.water.level);
  });
});
