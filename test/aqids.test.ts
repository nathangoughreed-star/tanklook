// Lane AQ (2026-10-19): AqAdvisor ids are well-formed and unique; Malawi starters place only species that exist and fit.
import { describe, expect, it } from 'vitest';
import ids from '../src/data/aqadvisor.json';
import { CARE } from '../src/data/care';
import { getSpecies } from '../src/data/species';
import { defaultSetup } from '../src/scene/defaults';
import { STYLES } from '../src/scene/items';
import { styleGround } from '../src/scene/scapeground';
import { starterAnimals } from '../src/scene/starter';

type Entry = { aq: string; name: string; standIn?: boolean; salt?: boolean };
const map = ids as Record<string, Entry>;

describe('AqAdvisor ids (lane AQ)', () => {
  it('every id is AqAdvisor’s 12-digit form with its option text', () => {
    for (const [k, v] of Object.entries(map)) {
      expect(v.aq, k).toMatch(/^\d{12}$/);
      expect(v.name, k).toMatch(/^.+ \(.+\)$/);
    }
  });
  it('a real (non stand-in) id belongs to one species per calculator; a stand-in borrows a real one or another listed fish', () => {
    const seen = new Map<string, string>();
    for (const [k, v] of Object.entries(map)) if (!v.standIn) {
      const key = `${v.salt ? 'salt' : 'fresh'}:${v.aq}`;
      expect(seen.get(key), `${k} shares ${v.aq}`).toBeUndefined();
      seen.set(key, k);
    }
    for (const v of Object.values(map)) if (v.standIn) for (const w of Object.values(map)) if (!w.standIn && w.aq === v.aq && !!w.salt === !!v.salt) expect(w.name).toBe(v.name);
  });
});

describe('Malawi starters (lane AQ)', () => {
  const pool = STYLES.malawi.animals;
  const setup = (L: number, seed: number, animal: number, gate = false) => {
    const s = defaultSetup(); s.tank = { ...s.tank, L, H: Math.round(L * 0.5), D: Math.round(L * 0.45) };
    s.layout = { id: 'malawi', seed, dens: { hard: 2, plant: 2, animal }, ...(gate ? { gateStock: true, expertise: 3 as const } : {}) }; s.fish = [];
    styleGround(s); return s;
  };
  it('the pool holds the batch-3 cichlids, fresh water species only', () => {
    for (const a of ['labeo', 'auratus', 'afra']) expect(pool).toContain(a);
    for (const a of pool) { const sp = getSpecies(a); expect(sp, a).toBeTruthy(); expect(!!sp!.salt, a).toBe(false); expect(sp!.habitat, a).not.toBe('land'); }
  });
  it('places only pool species that exist, have room to swim, and never a predator with its prey', () => {
    const used = new Set<string>();
    for (const L of [600, 900, 1200, 1500, 1800]) for (const seed of [1, 4, 9, 17, 33]) for (const stop of [1, 2, 3, 4])
      for (const gate of [false, true]) {
        const fish = starterAnimals(setup(L, seed, stop, gate), 1);
        for (const f of fish) {
          const sp = getSpecies(f.species)!;
          expect(sp, f.species).toBeTruthy();
          expect(pool).toContain(f.species);
          expect(L, `${f.species} in ${L} mm`).toBeGreaterThanOrEqual(sp.tl * 5);
          used.add(f.species);
        }
        const kinds = [...new Set(fish.map(f => f.species))];
        for (const a of kinds) for (const b of kinds) {
          const prey = CARE[a]?.prey;
          if (a !== b && prey && !prey.cats) expect(getSpecies(b)!.tl, `${a} eats ${b}`).toBeGreaterThan(prey.mm);
        }
      }
    for (const a of ['labeo', 'auratus', 'afra']) expect(used, a).toContain(a);
  });
});
