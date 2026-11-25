import { describe, expect, it } from 'vitest';
import { LU } from '../src/render/lighting';

// 2026-11-25: three uploads a uniform array of Vector3 / Vector4 element by element (toArray + flatten) at every material switch:
// ~7 ms a frame in Planted community (31 fish, ~650 draws). The big light / clip / shade arrays are flat Float32Arrays instead,
// which three passes straight to uniform3fv / uniform4fv. This pins the shape, so a refactor back to Vector arrays shows up.
describe('lighting uniform arrays are flat', () => {
  it('uClip (vec3[72]), uEm (vec4[48]), uShA (vec4[32]) are Float32Arrays of the shader array size', () => {
    expect(LU.uClip.value).toBeInstanceOf(Float32Array);
    expect(LU.uClip.value.length).toBe(72 * 3);
    expect(LU.uEm.value).toBeInstanceOf(Float32Array);
    expect(LU.uEm.value.length).toBe(48 * 4);
    expect(LU.uShA.value).toBeInstanceOf(Float32Array);
    expect(LU.uShA.value.length).toBe(32 * 4);
  });
});
