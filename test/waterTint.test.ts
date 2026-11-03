import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LU, setWaterUniforms, setWaterVolumeMode, waterVolumeMaterial } from '../src/render/lighting';
import { TINT_EXP, WATER_FILTER_GLSL, opacityOfK, waterFilter, waterHue, waterVeil, type RGB } from '../src/render/waterTint';
import { waterK } from '../src/scene/physics';
import { defaultSetup } from '../src/scene/defaults';

const lin = (hex: string): RGB => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const BLACKWATER = '#6b3d14', SALT = '#8ec9ec', GREEN = '#4f8f3a';

describe('water colour as a filter through the glass (WT1)', () => {
  it('clear water is exactly no filter', () => {
    for (const c of [BLACKWATER, SALT, '#7fb8a8']) expect(waterFilter(waterHue(lin(c)), 0)).toEqual([1, 1, 1]);
  });

  it('blackwater filters to amber (red passes most, blue least), strength grows with the slider, never brightens', () => {
    const h = waterHue(lin(BLACKWATER)), f = (o: number) => waterFilter(h, o);
    const t = f(0.42);
    expect(t[0]).toBeGreaterThan(t[1]); expect(t[1]).toBeGreaterThan(t[2]);
    expect(lum(t)).toBeLessThan(0.9); expect(lum(t)).toBeGreaterThan(0.4); // visible, not a black-out
    for (const o of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const a = f(o), b = f(o + 0.05);
      a.forEach((v, i) => { expect(v).toBeLessThanOrEqual(1); expect(b[i]).toBeLessThanOrEqual(v + 1e-9); });
    }
  });

  it('green and salt-blue water keep their hue; a custom colour stays a filter of that colour', () => {
    const g = waterFilter(waterHue(lin(GREEN)), 0.4), s = waterFilter(waterHue(lin(SALT)), 0.3);
    expect(g[1]).toBeGreaterThan(g[0]); expect(g[1]).toBeGreaterThan(g[2]);
    expect(s[2]).toBeGreaterThan(s[0]); expect(s[2]).toBeGreaterThanOrEqual(s[1]);
  });

  it('is one colour for the whole depth: the filter has no depth, angle or position input', () => {
    expect(waterFilter.length).toBe(2); // (hue, opacity) only
    // the shader chunk reads only the two uniforms, never a sightline length or a position
    expect(WATER_FILTER_GLSL).toContain('uWater.w'); expect(WATER_FILTER_GLSL).toContain('uWTint');
    expect(WATER_FILTER_GLSL).not.toMatch(/aqWaterPath|vAqP|cameraPosition|vP\b/);
    const h = waterHue(lin(BLACKWATER));
    expect(waterFilter(h, 0.42)).toEqual(waterFilter(h, 0.42)); // same answer at the back of the tank as at the front
  });

  it('the shader opacity round-trips waterK (so AR_WATER scaling and the light model still agree)', () => {
    for (const o of [0.05, 0.2, 0.42, 0.8]) expect(opacityOfK(waterK(o))).toBeCloseTo(o, 6);
    expect(opacityOfK(0)).toBe(0);
    expect(TINT_EXP).toBeGreaterThan(0);
  });

  it('the veil (so a black background still shows the colour) is zero for clear water, small, hue-shaped and depth-free', () => {
    const h = waterHue(lin(BLACKWATER));
    expect(waterVeil(h, 0)).toEqual([0, 0, 0]);
    const v = waterVeil(h, 0.42);
    expect(v[0]).toBeGreaterThan(v[1]); expect(v[1]).toBeGreaterThan(v[2]);
    expect(Math.max(...v)).toBeLessThan(0.08); // faint: it must not wash out contrast
    expect(WATER_FILTER_GLSL).toContain('aqWaterVeil');
  });

  it('pure red / blue water never goes black in the other channels', () => {
    for (const c of ['#ff0000', '#0000ff']) for (const v of waterFilter(waterHue(lin(c)), 0.97)) expect(v).toBeGreaterThan(0.005);
  });

  it('setWaterUniforms: clear water leaves the shader off (uWater.w 0); water off too; tinted water carries the hue', () => {
    const T = defaultSetup().tank;
    setWaterUniforms(T, { on: true, level: 0.9, opacity: 0, color: BLACKWATER } as never);
    expect(LU.uWater.value.w).toBeCloseTo(0, 12); // (-0 from -log(1))
    setWaterUniforms(T, { on: false, level: 0.9, opacity: 0.42, color: BLACKWATER } as never);
    expect(LU.uWater.value.w).toBe(0);
    setWaterUniforms(T, { on: true, level: 0.9, opacity: 0.42, color: BLACKWATER } as never);
    expect(LU.uWater.value.w).toBeCloseTo(waterK(0.42), 9);
    const v = LU.uWTint.value; expect(v.x).toBe(1); expect(v.y).toBeLessThan(v.x); expect(v.z).toBeLessThan(v.y);
  });

  it('the volume multiplies onto the page on screen and blends by alpha in AR', () => {
    const m = waterVolumeMaterial();
    expect(m.blending).toBe(THREE.CustomBlending); expect(m.blendSrc).toBe(THREE.ZeroFactor); expect(m.blendDst).toBe(THREE.SrcColorFactor);
    expect(m.uniforms.uWCol).toBeDefined(); // the USDZ export finds the water volume by this uniform
    setWaterVolumeMode(m, true); expect(m.blending).toBe(THREE.NormalBlending); expect(m.uniforms.uXr.value).toBe(1);
    setWaterVolumeMode(m, false); expect(m.blending).toBe(THREE.CustomBlending); expect(m.uniforms.uXr.value).toBe(0);
  });
});
