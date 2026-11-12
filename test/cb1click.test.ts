// Lane CB1: a click on the stand opens the stand's own options (not Hardscape); the doors work only from a box around the handles.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildTank } from '../src/render/build';
import { tankView } from '../src/render/tankView';
import { secOf } from '../src/interact/clickMenu';
import { doorBoxes, HANDLE_PAD, rayHitsDoorBox } from '../src/interact/doorBox';
import type { TankSetup } from '../src/scene/types';

const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const setup = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES['planted'])).scene; const S = sc.tanks[sc.active]; S.stand.show = true; S.stand.style = 'cabinet'; return S; };
const build = (S: TankSetup) => buildTank({ ...S, units: 'cm' }, S.tank, null).scene;
const scape = () => 'hardscape' as const;

describe('click target -> menu section', () => {
  it('stand and lid open Tank; light and gear open Equipment; never a section that does not exist', () => {
    expect(secOf({ kind: 'stand' }, scape)).toBe('tank');
    expect(secOf({ kind: 'lid' }, scape)).toBe('tank');
    expect(secOf({ kind: 'light' }, scape)).toBe('equipment');
    expect(secOf({ kind: 'gear', row: 'filter' }, scape)).toBe('equipment');
    expect(secOf({ kind: 'fish', id: 1 }, scape)).toBe('fish');
    expect(secOf({ kind: 'item', id: 1, item: 'stone' }, scape)).toBe('hardscape');
  });
});

describe('door handle box', () => {
  tankView.standOpen = false;
  const sc = build(setup()), boxes = doorBoxes(sc);
  const handles = sc.children.filter(o => o.userData.handle);
  it('a closed cabinet has two handles, each with a box 1.5 in bigger every way', () => {
    expect(handles.length).toBe(2);
    for (const h of handles) {
      const raw = new THREE.Box3().expandByObject(h), padded = boxes.find(b => b.containsBox(raw))!;
      expect(padded.min.x).toBeCloseTo(raw.min.x - HANDLE_PAD, 3);
      expect(padded.max.y).toBeCloseTo(raw.max.y + HANDLE_PAD, 3);
    }
  });
  const front = (x: number, y: number, z: number) => new THREE.Ray(new THREE.Vector3(x, y, z + 3000), new THREE.Vector3(0, 0, -1));
  it('a ray through the handle box hits; one well off it (stand edge, below the handle) does not', () => {
    const h0 = [...handles].sort((a, b) => new THREE.Box3().expandByObject(a).min.x - new THREE.Box3().expandByObject(b).min.x)[0]; // the outer (left) handle
    const c = new THREE.Box3().expandByObject(h0).getCenter(new THREE.Vector3()), raw = new THREE.Box3().expandByObject(h0);
    expect(rayHitsDoorBox(sc, front(c.x, c.y, c.z))).toBe(true);
    expect(rayHitsDoorBox(sc, front(raw.min.x - HANDLE_PAD + 2, c.y, c.z))).toBe(true);
    expect(rayHitsDoorBox(sc, front(raw.min.x - HANDLE_PAD - 5, c.y, c.z))).toBe(false);
    expect(rayHitsDoorBox(sc, front(c.x, raw.min.y - HANDLE_PAD - 5, c.z))).toBe(false);
  });
  it('open doors are click targets (to shut them again) and the handles are gone', () => {
    tankView.standOpen = true;
    const o = build(setup()); tankView.standOpen = false;
    expect(o.children.filter(k => k.userData.handle).length).toBe(0);
    expect(o.children.filter(k => k.userData.openDoor).length).toBe(2);
  });
});
