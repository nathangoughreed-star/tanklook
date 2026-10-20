// Lane TG menu focus (Nathan 2026-10-20): the open menu's parts of the view stay, the rest fades (render/menuFocus.ts);
// gear moves only while Tech is open (pickSec, used by main.ts's canPick).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { buildTank } from '../src/render/build';
import { FOCUS_SECS, inFocus, pickSec } from '../src/render/menuFocus';
import type { TankSetup } from '../src/scene/types';

// the build paints textures on canvases: a do-nothing 2D context is enough here (as in anchors.test.ts)
const noop: any = new Proxy(function () {}, { get: (_t, k) => k === 'data' ? new Uint8ClampedArray(4 * 512 * 512) : k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => noop, toDataURL: () => '', addEventListener() {} });
(globalThis as any).document ??= { createElement: canvas };
(globalThis as any).OffscreenCanvas ??= function () { return canvas(); };

const ex = (name: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[name])).scene; return sc.tanks[sc.active]; };

describe('menu focus: which parts of the view each menu is about', () => {
  const S = ex('planted'); S.light.type = 'led';
  const kids = buildTank({ ...S, units: 'cm' }, S.tank, null).scene.children;
  const of = (sec: (typeof FOCUS_SECS)[number]) => kids.filter(o => inFocus(o, sec));

  it('Tech: the gear and the light fixture, nothing else', () => {
    const t = of('tech');
    expect(t.some(o => o.userData.gear)).toBe(true);
    expect(t.some(o => o.userData.overhead != null)).toBe(true);
    expect(t.every(o => o.userData.gear || o.userData.overhead != null)).toBe(true);
  });
  it('Animals, Hardscape, Plants each pick their own pieces, never the gear', () => {
    expect(of('fish').length).toBeGreaterThan(0);
    expect(of('hardscape').length).toBeGreaterThan(0);
    expect(of('plants').length).toBeGreaterThan(0);
    expect(of('plants').every(o => o.userData.plant)).toBe(true);
    for (const sec of ['fish', 'hardscape', 'plants'] as const) expect(of(sec).some(o => o.userData.gear)).toBe(false);
  });
  it('no part belongs to two menus; glass, water, ground and room belong to none', () => {
    for (const o of kids) expect(FOCUS_SECS.filter(s => inFocus(o, s)).length).toBeLessThanOrEqual(1);
    const neutral = kids.filter(o => !o.userData.gear && o.userData.overhead == null && (o.userData.part ?? 0) <= 2);
    expect(neutral.length).toBeGreaterThan(0);
    for (const o of neutral) expect(FOCUS_SECS.some(s => inFocus(o, s))).toBe(false);
  });
});

describe('which menu must be open to move something', () => {
  it('gear needs Tech, animals Animals, pieces their scape menu', () => {
    expect(pickSec('gear')).toBe('tech');
    expect(pickSec('fish')).toBe('fish');
    expect(pickSec('items', 'plants')).toBe('plants');
    expect(pickSec('items', 'hardscape')).toBe('hardscape');
  });
});
