// AB11: Discovery's A / B pair is drawn at ONE physical scale (identical pixels per inch), bottoms on one baseline.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyFraming, fovFor, frameBox, pairCentre, pairEnvelope, placeCamera } from '../src/render/camera';
import { defaultSetup } from '../src/scene/defaults';
import { lensZoom } from '../src/scene/orbit';
import type { TankSetup } from '../src/scene/types';

const IN = 25.4, W = 800, H = 500;
const mk = (L: number, D: number, Ht: number, patch: Partial<TankSetup> = {}): TankSetup => { const s = structuredClone(defaultSetup()); s.tank = { ...s.tank, L: L * IN, D: D * IN, H: Ht * IN }; return Object.assign(s, patch); };
const head = () => 0;
/** Pixel box of a tank's front glass the way the viewer frames the pair. */
function frontPx(S: TankSetup, pair: TankSetup[], cam = { dist: 3000, az: 0, el: 0, zoom: 1 }) {
  const env = pairEnvelope(pair, cam, W / H, head), fov = fovFor(env.t, lensZoom(cam));
  const c = new THREE.PerspectiveCamera(); placeCamera(c, S.tank, cam);
  const win = frameBox(c, S.tank, W / H, 0), ctr = pairCentre(win, env.ext);
  applyFraming(c, fov, W, H, ctr.cx, ctr.cy);
  const px = (x: number, y: number) => { const v = new THREE.Vector3(x, y, 0).project(c); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; };
  const a = px(0, 0), b = px(S.tank.L, S.tank.H);
  return { w: b.x - a.x, h: a.y - b.y, bottom: a.y };
}

describe('AB11 shared physical scale', () => {
  const g20 = mk(30, 12, 12), g75 = mk(48, 18, 21), pair = [g20, g75];
  it('pixels per inch are identical: 20 gal long vs 75 gal, pixel ratio = inch ratio', () => {
    const a = frontPx(g20, pair), b = frontPx(g75, pair);
    expect(a.w / b.w).toBeCloseTo(30 / 48, 3);
    expect(a.h / b.h).toBeCloseTo(12 / 21, 3);
    expect(a.w / 30).toBeCloseTo(b.w / 48, 3);
  });
  it('bottoms share one baseline and the larger tank fits the view', () => {
    const a = frontPx(g20, pair), b = frontPx(g75, pair);
    expect(Math.abs(a.bottom - b.bottom)).toBeLessThan(0.5);
    expect(b.w).toBeLessThanOrEqual(W); expect(b.h).toBeLessThanOrEqual(H);
  });
  it('order does not matter, and equal tanks come out equal', () => {
    expect(frontPx(g75, [g75, g20]).w).toBeCloseTo(frontPx(g75, pair).w, 6);
    const e = frontPx(g75, [g75, g75]); expect(frontPx(g75, [g75, g75]).w).toBeCloseTo(e.w, 6);
  });
  it('mixed habitats (a tall terrarium beside a low paludarium) keep one scale', () => {
    const terr = mk(18, 18, 24, { water: { ...g20.water, on: false } }), pal = mk(36, 18, 18);
    const a = frontPx(terr, [terr, pal]), b = frontPx(pal, [terr, pal]);
    expect(a.w / 18).toBeCloseTo(b.w / 36, 3); expect(a.h / 24).toBeCloseTo(b.h / 18, 3); expect(Math.abs(a.bottom - b.bottom)).toBeLessThan(0.5);
  });
  it('zoom is one value for both: the scale follows it together', () => {
    const z = { dist: 3000, az: 0, el: 0, zoom: 2 };
    const a = frontPx(g20, pair, z), b = frontPx(g75, pair, z), a1 = frontPx(g20, pair);
    expect(a.w / b.w).toBeCloseTo(30 / 48, 3); expect(a.w / a1.w).toBeCloseTo(2, 1);
  });
});
