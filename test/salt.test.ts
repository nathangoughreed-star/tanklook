import { describe, expect, it } from 'vitest';
import { aqQuery } from '../src/data/aqadvisor';
import { defaultScene } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';

describe('saltwater tank (2026-10-13)', () => {
  it('AqAdvisor is not asked for a saltwater tank', () => {
    const s = defaultScene().tanks[0];
    expect(aqQuery(s)).not.toBeNull();
    s.water.salt = true;
    expect(aqQuery(s)).toBeNull();
  });
  it('marine substrates and the salt flag survive a reload', () => {
    for (const type of ['aragonite', 'coral'] as const) {
      const sc = defaultScene(); sc.tanks[0].substrate.type = type; sc.tanks[0].water.salt = true;
      const t = parseScene(JSON.parse(JSON.stringify(sc))).scene.tanks[0];
      expect(t.substrate.type).toBe(type);
      expect(t.water.salt).toBe(true);
    }
  });
});
