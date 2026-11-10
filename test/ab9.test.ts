// Lane AB9 (AC06): Discovery borrows the working design. Keeps that copy something in (lighting, a piece, the substrate...) are undone by Close without Make It Yours:
// the design and its undo / redo history come back exactly. Animal locks (requirements) persist.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { attrValues } from '../src/scene/attrs';
import { holdAttr, keepFromRecord } from '../src/ui/ab/logic';
import { locksOf } from '../src/scene/locks';
import type { TankSetup } from '../src/scene/types';

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false; t.lid = 'glass';
  t.layout = { ...t.layout, id: 'nature' }; regenerate(t, 'all', 1);
  return ensureUids(t);
}
const write = (s: Store, f: () => void) => { const was = s.frozen; s.frozen = false; try { f(); } finally { s.frozen = was; } };

describe('AB9: Discovery never leaves a change in the working design', () => {
  it('lighting / piece / substrate / tank keeps are undone by restoreAll, history included', () => {
    clearPairCache();
    const s = new Store({ ...defaultScene(), tanks: [project()] });
    s.update(t => { t.tanks[0].water.level = 0.85; });   // a real edit: one undo step
    s.update(() => {}, { history: false });
    const snap = s.snapshotAll(), depth = s.mark, key = Store.designKey(s.scene), canRedo = s.canRedo;
    const r = nextPair({ tank: s.tank, rev: 1 }, emptyBrief(), startSession(1, ['plants', 'hardscape', 'animals', 'substrate', 'tank'], 'unsure', 's1'), () => undefined);
    if (!r.ok) throw new Error('no pair');
    s.frozen = true;
    let changed = 0;
    for (const rec of [r.a, r.b]) {
      for (const v of attrValues(rec.snapshot, rec.facts)) if (v.lock) write(s, () => { holdAttr(s as never, rec, v.lock!); });
      for (const it of rec.snapshot.items.slice(0, 3)) write(s, () => { keepFromRecord(s as never, rec, { kind: 'item', uid: it.uid! }); });
      for (const k of ['substrate', 'tank'] as const) write(s, () => { keepFromRecord(s as never, rec, { kind: k }); });
    }
    changed = Store.designKey(s.scene) !== key ? 1 : 0;
    expect(changed).toBe(1);                       // the keeps really wrote into the borrowed design (that is what Close must undo)
    s.frozen = false; s.restoreAll(snap);
    expect(Store.designKey(s.scene)).toBe(key);
    expect(s.mark).toBe(depth);
    expect(s.canRedo).toBe(canRedo);
    expect(s.canUndo).toBe(true);
    expect(locksOf(s.tank).objects.length).toBe(0);
  });
});
