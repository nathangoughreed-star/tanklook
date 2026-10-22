// Lane IP (2026-10-22): invertebrate predation tells shrimp from snails and holds whatever the temperature bands say.
import { afterEach, describe, expect, it } from 'vitest';
import { CARE, SHRIMP } from '../src/data/care';
import { SPECIES, getSpecies } from '../src/data/species';
import { preyRisk, whyAnimal, whysAnimal } from '../src/scene/animalfit';

const sp = (id: string) => getSpecies(id)!;
const saved = new Map<string, [number, number] | undefined>();
/** force every named species onto one temperature band, so only predation can separate them */
const sameWater = (...ids: string[]) => { for (const id of ids) { if (!saved.has(id)) saved.set(id, CARE[id].temp); CARE[id].temp = [26, 28]; } };
afterEach(() => { for (const [id, t] of saved) CARE[id].temp = t; saved.clear(); });
/** the gate: the main blocking reason */
const why = (add: string, have: string) => whyAnimal(sp(add), 400, 3, [sp(have)])?.text ?? null;
/** every reason (temp-tiers whysAnimal): blocking first, then concerns */
const whys = (add: string, have: string) => whysAnimal(sp(add), 400, 3, [sp(have)]);
const preyWhys = (add: string, have: string) => whys(add, have).filter(w => /eat/.test(w.text));

describe('invertebrate predation', () => {
  it('rams eat a cherry shrimp colony, even in matching water, both ways round', () => {
    sameWater('gbr', 'cherryshrimp');
    expect(preyRisk(sp('gbr'), sp('cherryshrimp'))).toBe('eats');
    expect(why('cherryshrimp', 'gbr')).toMatch(/it would eat this one/);
    expect(why('gbr', 'cherryshrimp')).toMatch(/would eat it/);
    expect(preyWhys('cherryshrimp', 'gbr').map(w => w.concern)).toEqual([undefined]);   // blocking, once
  });
  it('large adult Amanos get a concern, not "would eat"', () => {
    sameWater('gbr', 'amano');
    expect(preyRisk(sp('gbr'), sp('amano'))).toBe('young');
    for (const [add, have] of [['amano', 'gbr'], ['gbr', 'amano']]) {
      const prey = preyWhys(add, have);
      expect(prey.map(w => w.concern), add).toEqual([true]);
      expect(prey[0].text, add).toMatch(/large adults only/);
      expect(why(add, have) ?? '', add).not.toMatch(/eat/);   // a concern is not the gate
    }
  });
  it('the Amano concern never hides a harder reason', () => {
    const all = whys('amano', 'gbr');   // real bands: 18-26 against 26-30
    expect(all[0].text).toMatch(/temperature/);
    expect(all.at(-1)).toMatchObject({ concern: true, text: expect.stringMatching(/large adults only/) });
  });
  it('rams leave snails alone', () => {
    for (const id of ['ramshorn', 'trumpet', 'nerite', 'mystery']) {
      sameWater('gbr', id);
      expect(preyRisk(sp('gbr'), sp(id)), id).toBeNull();
      expect([...preyWhys(id, 'gbr'), ...preyWhys('gbr', id)], id).toEqual([]);   // pH or hardness may still differ: only predation is under test
    }
  });
  it('snails are no general exemption: a snail eater still flags them, even in matching water', () => {
    for (const [pred, snail] of [['peapuffer', 'ramshorn'], ['peapuffer', 'trumpet'], ['clownloach', 'ramshorn'], ['clownloach', 'trumpet']]) {
      sameWater(pred, snail);
      expect(preyRisk(sp(pred), sp(snail)), `${pred} ${snail}`).toBe('eats');
      expect(why(snail, pred), `${pred} ${snail}`).toMatch(/it would eat this one/);
    }
  });
  it('the shrimp list holds every shrimp in the catalogue and no snail', () => {
    const named = SPECIES.filter(s => /shrimp/i.test(s.name)).map(s => s.id).sort();
    expect([...SHRIMP].sort()).toEqual(named);
    for (const id of SHRIMP) expect(sp(id).kind, id).not.toBe('snail');
  });
  it('angelfish eat shrimp and small fish but not snails; snail eaters still eat snails', () => {
    expect(preyRisk(sp('angel'), sp('cherryshrimp'))).toBe('eats');
    expect(preyRisk(sp('angel'), sp('ember'))).toBe('eats');
    expect(preyRisk(sp('angel'), sp('ramshorn'))).toBeNull();
    expect(preyRisk(sp('clownloach'), sp('ramshorn'))).toBe('eats');
    expect(preyRisk(sp('peapuffer'), sp('trumpet'))).toBe('eats');
  });
});
