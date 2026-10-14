import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/species';
import { EXAMPLES } from '../src/examples';
import { parseScene } from '../src/scene/validate';

describe('example tanks (lane F, 2026-10-13)', () => {
  it('ships six examples, each with a picture', () => {
    expect(EXAMPLES.length).toBe(6);
    expect(new Set(EXAMPLES.map(x => x.id)).size).toBe(EXAMPLES.length);
    for (const x of EXAMPLES) expect(x.thumb.length).toBeGreaterThan(100);
  });
  for (const x of EXAMPLES) it(`"${x.name}" opens cleanly`, () => {
    const { scene, warnings } = parseScene(x.scene);
    expect(warnings).toEqual([]);
    expect(scene.name).toBe(x.name);
    for (const t of scene.tanks) for (const f of t.fish) expect(getSpecies(f.species), f.species).toBeTruthy();
  });
  it('the reef is a saltwater tank and the terrarium is dry', () => {
    const tank = (id: string) => parseScene(EXAMPLES.find(x => x.id === id)!.scene).scene.tanks[0];
    expect(tank('reef').water.salt).toBe(true);
    expect(tank('terrarium').water.on).toBe(false);
  });
});
