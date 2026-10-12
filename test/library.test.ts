import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { LIB_KEY, deleteFromLib, listLib, loadFromLib, saveToLib } from '../src/scene/library';

/** In-memory Storage that throws once its contents pass `quota` characters, like a full browser store. */
function mem(quota = Infinity): Storage {
  const m = new Map<string, string>();
  const used = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    get length() { return m.size; }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null,
    getItem: k => m.get(k) ?? null, removeItem: k => { m.delete(k); },
    setItem(k, v) { const old = m.get(k); m.set(k, v); if (used() > quota) { if (old == null) m.delete(k); else m.set(k, old); throw new DOMException('full', 'QuotaExceededError'); } },
  };
}

describe('saved tanks in the browser', () => {
  it('saves, lists newest first, opens, replaces and deletes', () => {
    const st = mem(), a = defaultScene(); a.name = 'Reef';
    const ea = saveToLib(a, 'data:a', undefined, st);
    const b = defaultScene(); b.name = 'Planted';
    const eb = saveToLib(b, 'data:b', undefined, st);
    expect(listLib(st).map(e => e.name).sort()).toEqual(['Planted', 'Reef']);
    expect(loadFromLib(ea.id, st).scene.name).toBe('Reef');
    a.tanks[0].fish = [];
    saveToLib(a, 'data:a2', ea.id, st);                 // same id: replaced, not duplicated
    expect(listLib(st)).toHaveLength(2);
    expect(loadFromLib(ea.id, st).scene.tanks[0].fish).toHaveLength(0);
    deleteFromLib(eb.id, st);
    expect(listLib(st).map(e => e.id)).toEqual([ea.id]);
    expect(() => loadFromLib(eb.id, st)).toThrow(/no longer/);
  });

  it('a save that does not fit changes nothing and says so', () => {
    const s = defaultScene(), size = JSON.stringify(s).length;
    const st = mem(size * 1.5);
    const e = saveToLib(s, 'x', undefined, st);
    const before = st.getItem(LIB_KEY);
    expect(() => saveToLib(s, 'x', undefined, st)).toThrow(/storage is full/);
    expect(st.getItem(LIB_KEY)).toBe(before);
    expect(st.length).toBe(2);
    expect(listLib(st).map(x => x.id)).toEqual([e.id]);
  });

  it('ignores a damaged index', () => {
    const st = mem(); st.setItem(LIB_KEY, '{oops');
    expect(listLib(st)).toEqual([]);
  });
});
