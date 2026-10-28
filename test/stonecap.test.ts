import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { stoneCap } from '../src/render/stonecap';

/** A unit-ish ball with the attributes the cap reads (colour baked by `aBake`, grain). */
function ball(r: number, indexed: boolean) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 4);
  if (indexed) { g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = BufferMerge(g); }
  const n = g.attributes.position.count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.5), 3));
  g.setAttribute('aBake', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  g.setAttribute('aGrit', new THREE.BufferAttribute(new Float32Array(n * 4).fill(2), 4));
  return g;
}
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const BufferMerge = (g: THREE.BufferGeometry) => mergeVertices(g);

const area = (g: THREE.BufferGeometry) => {
  const p = g.attributes.position; let a = 0; const [x, y, z] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < p.count; i += 3) { x.fromBufferAttribute(p, i); y.fromBufferAttribute(p, i + 1); z.fromBufferAttribute(p, i + 2); a += y.sub(x).cross(z.sub(x)).length() / 2; }
  return a;
};

describe('stoneCap', () => {
  for (const indexed of [false, true]) {
    it(`caps a ball cut by a plane (${indexed ? 'indexed' : 'unindexed'})`, () => {
      const g = ball(50, indexed);
      // keep x >= -20: the cut is a disc of radius sqrt(50^2 - 20^2)
      const cap = stoneCap(g, [new THREE.Plane(new THREE.Vector3(1, 0, 0), 20)], new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0))!;
      expect(cap).toBeTruthy();
      expect(area(cap)).toBeGreaterThan(Math.PI * (2500 - 400) * 0.97);
      expect(area(cap)).toBeLessThan(Math.PI * (2500 - 400) * 1.02);
      const nrm = cap.attributes.normal; expect(nrm.getX(0)).toBeCloseTo(-1); // faces out through the glass
      const p = cap.attributes.position; // the face lies just inside the plane and looks along -x
      const tn = new THREE.Vector3().fromBufferAttribute(p, 1).sub(new THREE.Vector3().fromBufferAttribute(p, 0)).cross(new THREE.Vector3().fromBufferAttribute(p, 2).sub(new THREE.Vector3().fromBufferAttribute(p, 0)));
      expect(tn.x).toBeLessThan(0);
    });
  }
  it('returns null when no plane crosses the piece', () => {
    expect(stoneCap(ball(10, false), [new THREE.Plane(new THREE.Vector3(1, 0, 0), 100)], new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0))).toBeNull();
  });
});
