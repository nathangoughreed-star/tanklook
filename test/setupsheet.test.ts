import { describe, expect, it } from 'vitest';
import { exampleScenes } from '../src/examples';
import { BAG_L, buildSheet, sheetCsv, sheetText } from '../src/scene/setupsheet';
import { parseScene } from '../src/scene/validate';

const load = async () => Object.fromEntries(Object.entries(await exampleScenes()).map(([id, txt]) => [id, parseScene(txt).scene]));

describe('setup sheet', () => {
  it('builds for every example, deterministically', async () => {
    const scenes = await load();
    expect(Object.keys(scenes).length).toBeGreaterThan(3);
    for (const [id, sc] of Object.entries(scenes)) {
      const a = buildSheet(sc), b = buildSheet(sc);
      expect(JSON.stringify(a), id).toBe(JSON.stringify(b));
      expect(a.sections[0].title).toBe('Tank');
      expect(sheetCsv(a).split('\r\n').length).toBeGreaterThan(5);
      expect(sheetText(a)).toContain(a.title);
    }
  });
  it('bag count follows the bag size', async () => {
    const sc = (await load()).planted;
    const bags = (l: number) => +/(\d+) bag/.exec(buildSheet(sc, 0, { bagL: l }).sections[1].rows[0].qty)![1];
    expect(bags(BAG_L.aquarium / 2)).toBeGreaterThanOrEqual(bags(BAG_L.aquarium));
  });
});
