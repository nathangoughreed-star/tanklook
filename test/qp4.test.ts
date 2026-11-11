import { describe, expect, it } from 'vitest';
import { QUICK_ARCHETYPES } from '../src/scene/quickArchetypes';
import { archetype } from '../src/scene/archetypes';
import { recipeBg } from '../src/scene/recipes';

const sig = (id: string) => { const b = recipeBg(archetype(id)!); return b.bg + (b.color ?? ''); };
describe('QP4: per-style backgrounds', () => {
  it('all layouts of a card share one background (thumbnail = candidates)', () => {
    for (const q of QUICK_ARCHETYPES) expect(new Set(q.layouts.map(sig)).size, q.key).toBe(1);
  });
  it('siblings in a habitat differ, except where two cards share a background deliberately (none today)', () => {
    for (const hab of ['freshwater', 'saltwater', 'terrarium', 'paludarium']) {
      const s = QUICK_ARCHETYPES.filter(q => q.habitat === hab).map(q => sig(q.layouts[0]));
      const dup = s.length - new Set(s).size;
      expect(dup, hab).toBeLessThanOrEqual(hab === 'terrarium' ? 1 : 0); // frog jungle and canopy are one rainforest look
    }
  });
});
