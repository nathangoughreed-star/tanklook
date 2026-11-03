// Lane LB1 (Nathan 2026-11-03): a generated setup comes with a lid unless the user insists on none; the pros and cons are told, the animals that need a lid are named.
import { describe, expect, it } from 'vitest';
import { defaultLid, lidFreeChosen, lidFreeProsCons, lidNeedOf, lidNeedOfSetup, openTopProblem, setLidFree, withDefaultLid } from '../src/data/lidNeed';
import { getTankModel, tankFromModel } from '../src/data/tanks';
import { emptyBrief, parseBrief } from '../src/scene/brief';
import { bareSetup } from '../src/scene/defaults';
import { buildsFor, emptyBuild } from '../src/scene/builds';
import { handOff } from '../src/scene/reeval';
import { recipeScene } from '../src/scene/recipes';
import { summaryOf } from '../src/ui/stockSummary';
import { heatLoss } from '../src/scene/tech';
import { SPECIES } from '../src/data/species';
import type { Fish, TankSetup } from '../src/scene/types';

const M60 = getTankModel('g60b')!;
const fish = (...ids: string[]): Fish[] => ids.map((species, id) => ({ id: id + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const tank = (ids: string[], lid: TankSetup['lid'] = 'open') => { const S = bareSetup(); S.tank = tankFromModel(M60); S.water.on = true; S.fish = fish(...ids); S.lid = lid; return S; };

describe('how much a lid matters, per animal', () => {
  it.each(['hatchet', 'cpd', 'betta', 'kuhli', 'firefish', 'cpo', 'rswcrayfish', 'thaicrab', 'dartfrog', 'adf', 'nerite', 'leopardgecko', 'ballpython', 'regaljumper'])('%s: required, with a reason', id => {
    const n = lidNeedOf(id); expect(n.need).toBe('required'); expect(n.reason.length).toBeGreaterThan(10);
  });
  it('the careNeeds "Lid:" lines stay the source for crayfish and crabs', () => { expect(lidNeedOf('cpo').reason).toMatch(/climb out/); expect(lidNeedOf('thaicrab').reason).toMatch(/gaps/); });
  it('most fish are recommended, a few stay-in-the-water animals optional', () => {
    for (const id of ['yellowlab', 'neon', 'oscar', 'guppy', 'ocellaris']) expect(lidNeedOf(id).need).toBe('recommended');
    expect(lidNeedOf('ramshorn').need).toBe('optional');
  });
  it('every species has an answer', () => { for (const sp of SPECIES) expect(['required', 'recommended', 'optional']).toContain(lidNeedOf(sp.id).need); });
});

describe('the roster', () => {
  it('names who needs a lid and takes the strongest need', () => {
    const r = lidNeedOfSetup(tank(['neon', 'hatchet', 'cpo']));
    expect(r.need).toBe('required'); expect(r.required.map(w => w.id).sort()).toEqual(['cpo', 'hatchet']); expect(r.recommended.map(w => w.id)).toEqual(['neon']);
  });
  it('a tank with no animals is optional, a mbuna tank recommended', () => { expect(lidNeedOfSetup(tank([])).need).toBe('optional'); expect(lidNeedOfSetup(tank(['yellowlab', 'demasoni'])).need).toBe('recommended'); });
});

describe('every generated setup comes with a lid', () => {
  it('a wet tank gets glass, a dry one mesh, a land side mesh', () => {
    expect(defaultLid(tank(['neon']))).toBe('glass');
    const dry = tank(['leopardgecko']); dry.water.on = false; expect(defaultLid(dry)).toBe('mesh');
    expect(defaultLid(tank(['dartfrog']))).toBe('mesh');
  });
  it('the build engine: all three builds of a roster, and the look-first empty tank, carry a lid', () => {
    for (const b of buildsFor([{ species: 'yellowlab', n: 5 }], M60)) expect(b.setup.lid).not.toBe('open');
    expect(emptyBuild(M60).setup.lid).not.toBe('open');
    for (const b of buildsFor([{ species: 'leopardgecko', n: 1 }], getTankModel('g20l')!)) expect(b.setup.lid).not.toBe('open');
  });
  it('and the lid is in the price', () => {
    const [, , bal] = buildsFor([{ species: 'yellowlab', n: 5 }], M60);
    expect(bal.setup.lid).toBe('glass'); expect(bal.setupUsd).toBeGreaterThan(0);
  });
  it('the Guided hand-off adds one to a scene that has none, on both paths, unless the person chose none', () => {
    const gen = recipeScene('african-cichlid-rockscape', 'balanced', M60, [{ species: 'yellowlab', n: 3 }])!; gen.lid = 'open';
    expect(handOff(bareSetup(), gen).scene.lid).toBe('glass');                               // pristine: taken whole
    const cur = bareSetup(); cur.product = { model: 'g60b' } as never;
    expect(handOff(cur, gen).scene.lid).toBe('glass');                                        // a design in place
    const none = setLidFree(emptyBrief(), true);
    expect(handOff(bareSetup(), gen, { brief: none }).scene.lid).toBe('open');
    expect(handOff(cur, gen, { brief: none }).scene.lid).toBe('open');
  });
  it('a lid already there is never replaced', () => { const S = tank(['neon'], 'hood'); expect(withDefaultLid(S).lid).toBe('hood'); });
});

describe('the choice of no lid is explicit and reversible', () => {
  it('is stored in the brief, survives save and load, and can be withdrawn', () => {
    const b = setLidFree(emptyBrief(), true);
    expect(lidFreeChosen(b)).toBe(true);
    expect(lidFreeChosen(parseBrief(JSON.parse(JSON.stringify(b))))).toBe(true);
    expect(lidFreeChosen(setLidFree(b, false))).toBe(false);
    expect(setLidFree(b, false).project).toBeUndefined();
  });
  it('nothing else records it: a fresh brief has a lid coming', () => { expect(lidFreeChosen(emptyBrief())).toBe(false); expect(lidFreeChosen(undefined)).toBe(false); });
});

describe('going without: pros, cons and the warning', () => {
  it('pros and cons are given in gallons and dollars for this tank', () => {
    const S = tank(['yellowlab']), pc = lidFreeProsCons(S, l => heatLoss({ ...S, lid: l }).lossW);
    expect(pc.pros.length).toBeGreaterThanOrEqual(3);
    expect(pc.evapGalOpen).toBeGreaterThan(pc.evapGalLidded); expect(pc.evapGalOpen).toBeGreaterThan(1); expect(pc.evapGalOpen).toBeLessThan(6);   // a 48 x 18 in surface
    expect(pc.cons.join(' ')).toMatch(/gal a week/); expect(pc.heatW).toBeGreaterThan(0); expect(pc.cons.join(' ')).toMatch(/\$\d/);
    expect(pc.cons.join(' ')).toMatch(/Jumping/);
  });
  it('a required animal is named in the cons', () => { const pc = lidFreeProsCons(tank(['hatchet'])); expect(pc.cons[0]).toMatch(/hatchetfish/i); });
  it('an open top with a required animal is a Problem naming it; with a lid, or only recommended animals, there is none', () => {
    const p = openTopProblem(tank(['neon', 'hatchet']))!; expect(p.names).toEqual(['Marbled hatchetfish']); expect(p.text).toMatch(/Marbled hatchetfish needs a lid/);
    expect(openTopProblem(tank(['hatchet'], 'glass'))).toBeUndefined(); expect(openTopProblem(tank(['yellowlab']))).toBeUndefined();
  });
  it('the stocking summary words it as a Problem in Environment, and the "cannot check" line for the lid is gone', () => {
    const S = tank(['hatchet']), env = summaryOf(S).cats.find(c => c.id === 'environment')!;
    expect(env.items.some(i => i.level === 'problem' && /Marbled hatchetfish needs a lid/.test(i.text))).toBe(true);
    expect(env.items.some(i => /Lid:.*cannot check/.test(i.text))).toBe(false);
    S.lid = 'glass';
    const env2 = summaryOf(S).cats.find(c => c.id === 'environment')!;
    expect(env2.items.some(i => /needs a lid/.test(i.text))).toBe(false);
  });
});
