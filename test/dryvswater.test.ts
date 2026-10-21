import { describe, it, expect } from 'vitest';
import { SPECIES } from '../src/data/species';
import { whyAnimal } from '../src/scene/animalfit';

const sp = (id: string) => SPECIES.find(s => s.id === id)!;
describe('dry-enclosure animals and water-only animals are not tankmates', () => {
  it('a ball python and a goldfish clash both ways', () => {
    expect(whyAnimal(sp('goldfish'), 2000, 3, [sp('ballpython')])?.text).toMatch(/dry enclosure/);
    expect(whyAnimal(sp('ballpython'), 2000, 3, [sp('goldfish')])?.text).toMatch(/dry enclosure/);
  });
  it('a dart frog still shares a paludarium with a fish', () => {
    expect(whyAnimal(sp('dartfrog'), 200, 3, [sp('neon')])).toBeNull();
  });
});
