import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { SHARE_PREFIX, readShare, shareHash } from '../src/scene/share';
import { ROUGH_DEFAULT, roughOf } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';

describe('substrate roughness default (SR1)', () => {
  it('absent means 50, for a new tank and an old save without the field', () => {
    expect(ROUGH_DEFAULT).toBe(50);
    const s = defaultScene();
    expect(s.tanks[0].substrate.rough).toBeUndefined();
    expect(roughOf(s.tanks[0].substrate)).toBe(50);
    const old = parseScene(JSON.parse(JSON.stringify(s))).scene;
    expect('rough' in old.tanks[0].substrate).toBe(false);
    expect(roughOf(old.tanks[0].substrate)).toBe(50);
  });
  it('an explicit 0 stays 0 through save / load and share links; other values keep their value', async () => {
    for (const v of [0, 20, 100]) {
      const s = defaultScene(); s.tanks[0].substrate.rough = v;
      const loaded = parseScene(JSON.parse(JSON.stringify(s))).scene;
      expect(loaded.tanks[0].substrate.rough).toBe(v);
      const back = (await readShare(await shareHash(loaded))).scene;
      expect(back.tanks[0].substrate.rough).toBe(v);
      expect(roughOf(back.tanks[0].substrate)).toBe(v);
    }
    expect(SHARE_PREFIX).toBeTruthy();
  });
});
