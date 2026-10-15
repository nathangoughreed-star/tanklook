import { describe, expect, it } from 'vitest';
import { getSpecies } from '../src/data/species';
import { EXAMPLES } from '../src/examples';
import { SCENES } from '../src/examples/scenes';
import { insideBy, shapeOf } from '../src/scene/shape';
import { parseScene } from '../src/scene/validate';

describe('example tanks (lane F, 2026-10-13)', () => {
  it('ships six examples, each with a picture', () => {
    expect(EXAMPLES.length).toBe(6);
    expect(new Set(EXAMPLES.map(x => x.id)).size).toBe(EXAMPLES.length);
    for (const x of EXAMPLES) expect(x.thumb).toMatch(/\.jpg$/); // an image file, not base64 in the main bundle (lane EF3)
    expect(Object.keys(SCENES).sort()).toEqual(EXAMPLES.map(x => x.id).sort());
  });
  for (const x of EXAMPLES) it(`"${x.name}" opens cleanly`, () => {
    const { scene, warnings } = parseScene(SCENES[x.id]);
    expect(warnings).toEqual([]);
    expect(scene.name).toBe(x.name);
    for (const t of scene.tanks) for (const f of t.fish) expect(getSpecies(f.species), f.species).toBeTruthy();
  });
  it('the reef is a saltwater tank and the terrarium is dry', () => {
    const tank = (id: string) => parseScene(SCENES[id]).scene.tanks[0];
    expect(tank('reef').water.salt).toBe(true);
    expect(tank('terrarium').water.on).toBe(false);
  });
  it('the reef holds live rock, corals and only marine animals (lane E, 2026-10-14)', () => {
    const t = parseScene(SCENES['reef']).scene.tanks[0];
    expect(t.items.some(i => i.variant === 'liverock')).toBe(true);
    expect(new Set(t.items.filter(i => i.kind === 'coral').map(i => i.variant)).size).toBe(4);
    expect(t.fish.length).toBeGreaterThan(5);
    for (const f of t.fish) expect(getSpecies(f.species)!.salt, f.species).toBe(true);
  });
  it('each sits on a stand, in its own shape, with every piece and animal inside the glass (lane I, 2026-10-14)', () => {
    const shapes: Record<string, string> = { planted: 'rect', iwagumi: 'rect', betta: 'bowl', paludarium: 'round', terrarium: 'pie', reef: 'bow' };
    for (const x of EXAMPLES) {
      const t = parseScene(SCENES[x.id]).scene.tanks[0];
      expect(shapeOf(t.tank), x.id).toBe(shapes[x.id]);
      expect(t.stand.show, x.id).toBe(true);
      for (const p of [...t.items, ...t.fish.filter(f => f.surface !== 'glass')]) expect(insideBy(t.tank, p.x, p.depth), `${x.id} ${'variant' in p ? p.variant : p.species}`).toBeGreaterThan(-1);
    }
  });
});
