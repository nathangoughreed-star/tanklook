import { describe, expect, it } from 'vitest';
import { SPECIES, getSpecies } from '../src/data/species';
import { whysAnimal } from '../src/scene/animalfit';
import { bareSetup } from '../src/scene/defaults';
import { applyKind, fitFrom, groupPicker, offeredIn, roleOf, rolesFor, tankKind, OK_FIT, type SetupKind } from '../src/scene/pickerKind';

const sp = (id: string) => getSpecies(id)!;
const offered = (k: SetupKind) => SPECIES.filter(s => offeredIn(s, k));
const kindOf = (k: SetupKind) => { const s = bareSetup(); applyKind(s, k); return s; };

describe('tank kind', () => {
  it('is settled by applyKind and read back', () => {
    for (const k of ['freshwater', 'saltwater', 'terrarium', 'vivarium'] as const) expect(tankKind(kindOf(k))).toBe(k);
    const s = kindOf('saltwater'); expect(s.water.on && s.water.salt).toBe(true);
    expect(kindOf('terrarium').water.on).toBe(false);
  });
  it('follows the water when the choice no longer agrees with it, and reads old tanks', () => {
    const s = kindOf('terrarium'); s.water.on = true; expect(tankKind(s)).toBe('freshwater');
    const d = bareSetup(); delete d.layout.kind; d.water.on = false; expect(tankKind(d)).toBe('terrarium');
    d.water.on = true; d.water.salt = true; expect(tankKind(d)).toBe('saltwater');
  });
});
describe('gating by kind', () => {
  it('freshwater: no marine, no tarantula, no gecko', () => {
    const ids = offered('freshwater').map(s => s.id);
    expect(ids).toContain('neon'); expect(ids).toContain('nerite'); expect(ids).toContain('adf');
    for (const bad of ['ocellaris', 'chacogoldenknee', 'leopardgecko', 'firetoad']) expect(ids).not.toContain(bad);
  });
  it('saltwater: marine only', () => { expect(offered('saltwater').length).toBeGreaterThan(0); expect(offered('saltwater').every(s => s.salt)).toBe(true); });
  it('terrarium: land animals only, no fish, no marine', () => {
    const o = offered('terrarium'); expect(o.map(s => s.id)).toContain('leopardgecko');
    expect(o.every(s => s.habitat !== 'water' && !s.salt && s.kind !== 'snail')).toBe(true);
  });
  it('vivarium: the freshwater and the land animals, never marine', () => {
    const ids = offered('vivarium').map(s => s.id); expect(ids).toContain('neon'); expect(ids).toContain('leopardgecko'); expect(ids).not.toContain('ocellaris');
  });
  it('a group a kind has nothing in is not listed', () => {
    expect(rolesFor('terrarium')).toEqual(['herp', 'arthropod']);
    expect(rolesFor('freshwater')).not.toContain('arthropod');
    const roles = new Set(offered('freshwater').map(roleOf)); expect([...roles]).not.toContain('arthropod');
  });
});
describe('role groups', () => {
  it('derives each species a role', () => {
    expect(roleOf(sp('neon'))).toBe('school'); expect(roleOf(sp('oto'))).toBe('algae'); expect(roleOf(sp('bronzecory'))).toBe('bottom');
    expect(roleOf(sp('discus'))).toBe('centre'); expect(roleOf(sp('cherryshrimp'))).toBe('algae'); expect(roleOf(sp('mystery'))).toBe('invert');
    expect(roleOf(sp('leopardgecko'))).toBe('herp'); expect(roleOf(sp('adf'))).toBe('herp'); expect(roleOf(sp('chacogoldenknee'))).toBe('arthropod');
  });
  it('every species lands in a group its kind lists', () => {
    for (const k of ['freshwater', 'saltwater', 'terrarium', 'vivarium'] as const) for (const s of offered(k)) expect(rolesFor(k), `${k} ${s.id}`).toContain(roleOf(s));
  });
});
describe('fit sort', () => {
  it('puts the best fit first inside a group and keeps the problem ones last, still listed', () => {
    const litres = 40, present = [sp('oscar')];
    const fitOf = (s: typeof SPECIES[number]) => fitFrom(whysAnimal(s, litres, 3, present, {}), false);
    const school = groupPicker(offered('freshwater').filter(s => roleOf(s) === 'school'), 'freshwater', fitOf)[0];
    expect(school.rows.length).toBeGreaterThan(3);
    const ranks = school.rows.map(r => r.fit.level); const order = { ok: 0, caution: 1, problem: 2 };
    expect(ranks.map(x => order[x])).toEqual([...ranks.map(x => order[x])].sort((a, b) => a - b));
    expect(school.rows.find(r => r.sp.id === 'neon')!.fit.level).toBe('problem'); // an oscar eats neons
    expect(school.rows.at(-1)!.fit.level).toBe('problem');
  });
  it('only an expertise reason is ignored unless the care gate is on', () => {
    const w = whysAnimal(sp('discus'), 500, 1, []);
    expect(fitFrom(w, false)).toEqual(OK_FIT); expect(fitFrom(w, true).level).toBe('problem');
  });
  it('cost of scoring every species once is small', () => {
    const t = performance.now(); for (const s of SPECIES) whysAnimal(s, 200, 1, [sp('neon'), sp('oscar'), sp('cherryshrimp'), sp('betta')], {});
    expect(performance.now() - t).toBeLessThan(200);
  });
});
