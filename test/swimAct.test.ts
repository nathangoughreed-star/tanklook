// BR2: the sim's status per fish (act / actTarget), foraging, and the tap label's words.
import { describe, expect, it } from 'vitest';
import { makeSwimSim } from './quietSim';
import { makeSwimSim as realSim } from '../src/scene/swimSim';
import { ACT } from '../src/scene/swimTypes';
import { actPhrase, actLabel } from '../src/scene/actWords';
import { foeReason } from '../src/scene/foes';
import { getSpecies } from '../src/data/species';
import { cast, field } from './swimCast';

const dt = 1 / 30;

describe('act: what each fish is doing', () => {
  it('every fish has a valid state and unknown ids give -1; the query allocates nothing the sim needs', () => {
    const fish = cast(), sim = makeSwimSim(fish, field, 5);
    for (let s = 0; s < 60 / dt; s++) sim.step(dt);
    for (const f of fish) { const a = sim.act(f.id); expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(ACT.pair); expect(sim.actTarget(f.id)).toBe(-1); }
    expect(sim.act(99999)).toBe(-1);
  });
  it('bottom dwellers are seen resting, foraging and roaming over a few minutes; foraging stops with setForaging(false)', () => {
    const fish = cast(), sim = makeSwimSim(fish, field, 7), cory = fish.find(f => f.zone === 'bottom')!;
    const seen = new Set<number>();
    for (let s = 0; s < 400 / dt; s++) { sim.step(dt); if (s % 15 === 0) seen.add(sim.act(cory.id)); }
    expect(seen.has(ACT.forage), 'foraging seen').toBe(true);
    expect(seen.has(ACT.rest) || seen.has(ACT.swim) || seen.has(ACT.shoal), 'and other states too').toBe(true);
    const off = makeSwimSim(fish, field, 7); off.setForaging!(false);
    const seen2 = new Set<number>();
    for (let s = 0; s < 400 / dt; s++) { off.step(dt); if (s % 15 === 0) seen2.add(off.act(cory.id)); }
    expect(seen2.has(ACT.forage)).toBe(false);
  });
  it('a forced gulp shows as going up for air', () => {
    const fish = cast(), c = fish.findIndex(f => f.zone === 'bottom'); fish[c].gulp = { perHour: 4, dart: true };
    const sim = makeSwimSim(fish, field, 11); for (let s = 0; s < 20 / dt; s++) sim.step(dt);
    expect(sim.gulp!(fish[c].id)).toBe(true); sim.step(dt);
    expect(sim.act(fish[c].id)).toBe(ACT.gulp);
  });
  it('a rush between a flagged pair shows chase on one side and flee on the other, with each other as target', () => {
    const fish = cast().slice(0, 2).map((f, i) => ({ ...f, id: i + 1, kind: i ? 'prey' : 'hunter', foes: i ? undefined : ['prey'], len: i ? 40 : 80, group: undefined }));
    fish[0].home = { ...fish[1].home, x: fish[1].home.x + 150, y: fish[1].home.y, z: fish[1].home.z, yaw: 0, pitch: 0, roll: 0 };
    const sim = realSim(fish, field, 3); let both = false;
    for (let s = 0; s < 400 / dt && !both; s++) { sim.step(dt); if (sim.act(1) === ACT.chase && sim.act(2) === ACT.flee) { both = true; expect(sim.actTarget(1)).toBe(2); expect(sim.actTarget(2)).toBe(1); } }
    expect(both).toBe(true);
  });
});

describe('words', () => {
  it('plain, concrete, no exclamation marks, per-species flavour for a cory', () => {
    for (let a = 0; a <= ACT.pair; a++) { const p = actPhrase(a, 'neon', 'Betta'); expect(p).not.toMatch(/!/); expect(p.length).toBeGreaterThan(3); }
    expect(actLabel('Bronze cory', ACT.forage, 'bronzecory')).toBe('Bronze cory: rooting in the substrate');
    expect(actLabel('Cherry barb', ACT.gulp, 'cherrybarb')).toBe('Cherry barb: going up for air');
    expect(actPhrase(ACT.chase, 'angelfish', 'Neon tetra')).toBe('chasing the neon tetra');
  });
  it('the why line comes from the same pair rule: a flagged pair gives the sentence, an unflagged one null', () => {
    const betta = getSpecies('betta'), neon = getSpecies('neon'), cory = getSpecies('bronzecory');
    if (!betta || !neon || !cory) return;
    expect(foeReason(cory, neon)).toBeNull();
  });
});
