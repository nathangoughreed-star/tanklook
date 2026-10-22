// Sex survives the guided-to-editor handoff (2026-10-22): a mixed-sex stocking keeps its males, females and unsexed animals, and so its
// sex-ratio verdict, through the build pick, an editor edit, save and reopen; missing sex loads as unsexed and is never inferred.
import { describe, expect, it } from 'vitest';
import { emptyScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { buildsFor } from '../src/scene/builds';
import { carryAnimals } from '../src/scene/carry';
import { setPairing } from '../src/scene/pairs';
import { TANK_MODELS } from '../src/data/tanks';
import { sceneForBuild } from '../src/ui/buildPick';
import { animalsOf, notesOf, overWarn, picksFromTank, sexFish, totalOf, writePairs, type Pk } from '../src/ui/stockPlanLogic';
import type { Fish, Scene, TankSetup } from '../src/scene/types';

// cockatoo: dimorphic, 1:3; bristlenose: kept by sex, no female drawing; kribensis: a sexed pair species; platy: short on females
const PICKS: Pk[] = [
  { id: 'cockatoo', n: 1, f: 2, u: 1 },
  { id: 'bristlenose', n: 1, f: 1, u: 1 },
  { id: 'kribensis', n: 1, f: 1, pair: 'established' },
  { id: 'platy', n: 2, f: 2 },
];
const MODEL = TANK_MODELS.find(m => /^75 gal/.test(m.name)) ?? TANK_MODELS.filter(m => !m.terrarium).at(-1)!;
const fish = (id: number, species: string): Fish => ({ id, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 });
/** The stocking screen's tank: the picks synced in as stockPlan.ts does (sexFish, writePairs). */
function screenTank(): Scene {
  const s = emptyScene(), T = s.tanks[0]; let id = 1;
  for (const p of PICKS) { const have = Array.from({ length: totalOf(p) }, () => fish(id++, p.id)); sexFish(have, p); T.fish.push(...have); }
  writePairs(T, PICKS);
  return s;
}
const reopen = (s: Scene) => parseScene(JSON.parse(JSON.stringify(s))).scene;
const sorted = (ps: Pk[]) => [...ps].sort((a, b) => a.id.localeCompare(b.id));
/** Everything the owner is told per species, from the picks the tank holds. */
const verdict = (T: TankSetup) => sorted(picksFromTank(T)).map(p => {
  const nt = notesOf(p);
  return { id: p.id, counts: [p.n, p.f ?? 0, p.u ?? 0], band: nt.band, line: nt.line, ratio: nt.ratio ?? null, pairing: nt.pairing?.status ?? null, over: overWarn(p, 284) ?? null };
});
const strip = (p: Pk): Pk => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== 0)) as Pk;

describe('a mixed-sex stocking survives build pick -> editor -> save -> reopen', () => {
  it('the screen tank reads back as the picks', () => {
    expect(sorted(picksFromTank(screenTank().tanks[0])).map(strip)).toEqual(sorted(PICKS).map(strip));
  });
  it('same counts, same sex-ratio verdict, same pairing at every step', () => {
    const screen = screenTank(), before = verdict(screen.tanks[0]);
    expect(before.find(v => v.id === 'platy')!.ratio).toMatch(/short on females/);
    expect(before.find(v => v.id === 'cockatoo')!.ratio).toMatch(/1 unsexed/);
    // the real build path: buildsFor makes new fish from species counts, sceneForBuild places them
    const b = buildsFor(animalsOf(PICKS), MODEL)[0], next = sceneForBuild(b, 'in');
    expect(next.tanks[0].fish.some(f => f.gender || f.sex)).toBe(false); // fresh animals: no sex until carried (ids may coincide)
    carryAnimals(screen.tanks[0], next.tanks[0]);
    expect(verdict(next.tanks[0])).toEqual(before);
    const store = new Store(); store.replace(next);
    store.edit(t => { t.fish[0].x += 5; });
    expect(verdict(store.tank)).toEqual(before);
    expect(verdict(reopen(store.scene).tanks[0])).toEqual(before);
  });
  it('without the carry the build would assess a different stocking (the defect this fixes)', () => {
    const screen = screenTank(), next = sceneForBuild(buildsFor(animalsOf(PICKS), MODEL)[0], 'in');
    expect(verdict(next.tanks[0])).not.toEqual(verdict(screen.tanks[0]));
  });
  it('dimorphic females are still drawn as females after the build', () => {
    const screen = screenTank(), next = sceneForBuild(buildsFor(animalsOf(PICKS), MODEL)[0], 'in');
    carryAnimals(screen.tanks[0], next.tanks[0]);
    expect(next.tanks[0].fish.filter(f => f.species === 'cockatoo' && f.sex === 'f')).toHaveLength(2);
    expect(next.tanks[0].fish.filter(f => f.species === 'bristlenose' && f.sex)).toHaveLength(0); // no female drawing: recorded only
  });
});

describe('missing sex loads as unsexed, never inferred', () => {
  it('an older save (drawn female, no tracked sex) reads unsexed', () => {
    const s = emptyScene(); s.tanks[0].fish = [fish(1, 'cockatoo'), { ...fish(2, 'cockatoo'), sex: 'f' }];
    expect(picksFromTank(reopen(s).tanks[0])).toEqual([{ id: 'cockatoo', n: 0, u: 2 }]);
  });
  it('an established pair with no recorded sexes stays unsexed', () => {
    const s = emptyScene(); s.tanks[0].fish = [fish(1, 'kribensis'), fish(2, 'kribensis')];
    setPairing(s.tanks[0], 'kribensis', 'established');
    const [p] = picksFromTank(reopen(s).tanks[0]);
    expect(p).toEqual({ id: 'kribensis', n: 0, u: 2, pair: 'established' });
    expect(notesOf(p).ratio).toMatch(/2 unsexed/);
  });
  it('species not kept by sex just count', () => {
    const s = emptyScene(); s.tanks[0].fish = [fish(1, 'neon'), { ...fish(2, 'neon'), gender: 'f' }];
    expect(picksFromTank(reopen(s).tanks[0])).toEqual([{ id: 'neon', n: 2 }]);
  });
});
