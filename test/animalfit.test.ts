import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { SPECIES, getSpecies } from '../src/data/species';
import { whyAnimal } from '../src/scene/animalfit';

const sp = (id: string) => getSpecies(id)!;
describe('animal gating', () => {
  it('has care data for every species', () => { for (const s of SPECIES) expect(CARE[s.id], s.id).toBeTruthy(); });
  it('expertise, size, predation, temperament, one per tank, temperature', () => {
    expect(whyAnimal(sp('discus'), 500, 1, [])?.kind).toBe('expertise');
    expect(whyAnimal(sp('oscar'), 100, 3, [])?.kind).toBe('size');
    expect(whyAnimal(sp('neon'), 200, 1, [sp('oscar')])?.text).toMatch(/eat/);
    expect(whyAnimal(sp('betta'), 200, 3, [sp('betta')])?.text).toMatch(/one per tank/);
    expect(whyAnimal(sp('tigerbarb'), 200, 3, [sp('guppy')])?.text).toMatch(/fins/);
    expect(whyAnimal(sp('goldfish'), 500, 3, [sp('discus')])?.text).toMatch(/temperature/);
    expect(whyAnimal(sp('neon'), 200, 1, [sp('harlequin')])).toBeNull();
  });
});
