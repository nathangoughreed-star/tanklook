// SV1 (Nathan 2026-11-12): a view of the Store pinned to ONE tank. The overlays (Habitat check, cost, Checks, Water) were written against
// "the tank the panel shows" (store.tank, scene.active, edit); in split view each side gets its own copy, and each copy reads and edits ITS tank
// through this proxy, so the overlay code itself stays the same. Everything else (subscribe, undo, units, seal...) is the real store's.
import type { Store } from '../scene/store';
import type { Scene } from '../scene/types';

export function sideStore(base: Store, i: number): Store {
  let lastScene: Scene | undefined, lastProxy: Scene | undefined;
  const scene = (): Scene => {
    const s = base.scene;
    if (s !== lastScene) { lastScene = s; lastProxy = new Proxy(s, { get: (t, p) => (p === 'active' ? Math.min(i, t.tanks.length - 1) : Reflect.get(t, p)) }); }
    return lastProxy!;
  };
  const tank = () => base.scene.tanks[i] ?? base.scene.tanks[0];
  return new Proxy(base, {
    get(t, p) {
      switch (p) {
        case 'scene': return scene();
        case 'tank': case 'effTank': return tank();
        case 'targets': return [i];
        case 'edit': return (fn: Parameters<Store['editTank']>[1], o?: Parameters<Store['editTank']>[2]) => t.editTank(i, fn, o);
        case 'sideIndex': return i;
      }
      const v = Reflect.get(t, p, t);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  }) as Store;
}
/** The tank index a store view is pinned to (undefined for the real store). */
export const sideIndexOf = (s: Store): number | undefined => (s as unknown as { sideIndex?: number }).sideIndex;
