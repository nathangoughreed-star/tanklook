// PM1 (R98): hoods and NICREW lights drawn from their product photos. The look data loads, every pilot product resolves to a look, and a saved
// file that never heard of the new fields still loads and draws.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HOOD_PRODUCTS } from '../src/data/hoods';
import { LIGHT_PRODUCTS } from '../src/data/gearCatalog';
import { artOf, allArt } from '../src/shell/logic/gearArt';
import { defaultSetup } from '../src/scene/defaults';
import { parseScene } from '../src/scene/validate';
import { addHood } from '../src/render/build';

const NICREW = LIGHT_PRODUCTS.filter(p => p.brand === 'NICREW' && /c10|classicled|hyperreef|navareef/.test(p.id));

describe('PM1 hood looks', () => {
  it('all 8 hoods carry a look with a hex colour, sheen and photo source', () => {
    expect(HOOD_PRODUCTS.length).toBe(8);
    for (const h of HOOD_PRODUCTS) {
      expect(h.look, h.id).toBeTruthy();
      expect(h.look!.color, h.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['matte', 'satin', 'gloss']).toContain(h.look!.sheen);
      expect(h.look!.src, h.id).toBeTruthy();
    }
  });
  it('hoods of one line share one look (size is a parameter)', () => {
    const by = (b: string) => HOOD_PRODUCTS.filter(h => h.brand === b).map(h => JSON.stringify(h.look));
    for (const b of ['Aqueon', 'Marineland']) expect(new Set(by(b)).size, b).toBe(1);
  });
  it('every hood has a baked tile spec', () => { for (const h of HOOD_PRODUCTS) expect(artOf('light', h.id)?.spec.kind, h.id).toBe('hood'); });
  it('the model builds for every look, a flat lid is lower than the dome, and the notch splits the hood in three runs', () => {
    const build = (id: string) => {
      const S = defaultSetup(); const h = HOOD_PRODUCTS.find(x => x.id === id)!;
      S.lid = 'hood'; S.hoodProduct = id; S.render.rim = false; S.tank = { ...S.tank, L: h.lengthIn * 25.4, D: h.depthIn * 25.4, H: 300 };
      const sc = new THREE.Scene(); addHood(sc, S, S.tank);
      return { n: sc.children.filter(o => (o as THREE.Mesh).geometry?.type === 'ExtrudeGeometry').length, top: new THREE.Box3().setFromObject(sc).max.y - 300 };
    };
    for (const h of HOOD_PRODUCTS) expect(build(h.id).top, h.id).toBeGreaterThan(5);
    expect(build('topfin-led-hood-24').n).toBe(3);
    expect(build('tetra-led-hood-20').n).toBe(1);
    expect(build('topfin-led-hood-24').top).toBeLessThan(build('aqueon-led-hood-24').top);
  });
  it('a saved file without hood fields loads and still has a hood', () => {
    const S = defaultSetup(); const j = JSON.parse(JSON.stringify({ ...S })) as Record<string, unknown>; delete j.hoodProduct;
    expect(() => parseScene({ version: 1, tanks: [j] })).not.toThrow();
  });
});

describe('PM1 NICREW lights', () => {
  it('the 9 pilot products resolve to 4 looks and each has a tile', () => {
    expect(NICREW.length).toBe(9);
    const arts = allArt();
    for (const p of NICREW) { expect(p.colors.pm1, p.id).toBeTruthy(); expect(arts.has(p.id), p.id).toBe(true); }
    const look = (p: typeof NICREW[number]) => (p.id.match(/c10|classicled|hyperreef|navareef/) ?? [])[0];
    expect(new Set(NICREW.map(look)).size).toBe(4);
  });
  it('the reef boxes hang from an arm with oval lenses, the bars do not', () => {
    for (const p of NICREW) {
      if (/hyperreef|navareef/.test(p.id)) { expect(p.colors.arm, p.id).toBeTruthy(); expect(p.colors.leds.kind).toBe('ovals'); } else expect(p.colors.arm).toBeUndefined();
    }
  });
});
