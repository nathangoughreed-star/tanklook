import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WOOD_LOOK, applyGrainUV, woodTexture } from '../src/render/woodGrain';

describe('wood grain (lane WG1)', () => {
  it('only wood finishes get a texture; laminate stays plain', () => {
    expect(woodTexture('oak')).not.toBeNull();
    expect(woodTexture('black')).toBeNull();
    expect(woodTexture('white')).toBeNull();
    expect(Object.keys(WOOD_LOOK)).toEqual(['oak']);
  });
  it('the texture is shared, varies, and has a usable mean', () => {
    const t = woodTexture('oak')!; expect(woodTexture('oak')).toBe(t);
    const d = t.image.data as Uint8Array, vals = new Set<number>(); for (let i = 0; i < d.length; i += 4 * 997) vals.add(d[i]);
    expect(vals.size).toBeGreaterThan(20);
    expect(t.userData.mean).toBeGreaterThan(0.3); expect(t.userData.mean).toBeLessThan(1);
  });
  it('gives every vertex a UV, and a different offset per piece', () => {
    const mk = () => new THREE.BoxGeometry(100, 100, 100);
    const a = mk(), b = mk(); applyGrainUV(a, { finish: 'oak', seed: 1 }); applyGrainUV(b, { finish: 'oak', seed: 2 });
    expect(a.attributes.uv.count).toBe(a.attributes.position.count);
    expect(a.attributes.uv.getX(0)).not.toBe(b.attributes.uv.getX(0));
  });
});
