// Lane GC2: glass check for polygon tanks (flat sides only).
import { describe, expect, it } from 'vitest';
import { IN_MM, solveGlass } from '../src/scene/glassSolver';
import { polyCheck, polySolve } from '../src/scene/polyGlass';
import { polySides } from '../src/scene/shape';
import { defaultSetup } from '../src/scene/defaults';
import { glassPanel, defaultChoice } from '../src/shell/logic/tankGlass';
import { polyUpgradeCard } from '../src/shell/logic/glassUpgrade';
import type { Tank } from '../src/scene/types';

const IN = IN_MM, hex = (L: number, H: number): Tank => ({ ...defaultSetup().tank, shape: 'poly', sides: 6, sideLens: undefined, L, D: L * 0.866, H });
const T = hex(36 * IN, 20 * IN);

describe('polygon glass check', () => {
  it('a side is the box wall plate of its own length', () => {
    const len = polySides(T)[0], t = 0.375 * IN, c = polyCheck(T, false, { wall: t, bottom: t }, 3.8, 'full');
    const box = solveGlass({ L: len, D: len, H: T.H, waterDepth: T.H }, { safetyFactor: 0.01, deflection: { thicknessRatio: 1e6 }, continuous: false, fixed: { long: t, end: t, bottom: t }, topEdge: 'free' });
    expect(c.sides[0].sf).toBeCloseTo(box.panes.front.sf, 6);
    expect(c.sides.length).toBe(1); // a regular hexagon has one distinct side
  });
  it('solve picks a stock thickness that passes, and thinner fails', () => {
    const r = polySolve(T, false, 3.8, 'full', 'in')!;
    expect(r.wall).not.toBeNull(); expect(r.check!.ok).toBe(true);
    const thinner = [3.175, 4.7625, 6.35, 9.525, 12.7, 19.05].filter(t => t < r.wall! - 0.01).pop();
    if (thinner) expect(polyCheck(T, false, { wall: thinner, bottom: thinner }, 3.8, 'full').ok).toBe(false);
  });
  it('the panel is supported and flagged poly; a pie is not', () => {
    const p = glassPanel(T, false, defaultChoice(), 'in');
    expect(p.supported).toBe(true); expect(p.poly).toBe(true); expect(p.use).not.toBeNull();
    expect(glassPanel({ ...T, shape: 'pie' } as Tank, false, defaultChoice(), 'in').supported).toBe(false);
  });
  it('upgrade card: thin glass fails and offers thicker with a cost', () => {
    const q = 0.25 * IN, c = polyUpgradeCard({ T, rim: false, panes: { long: q, end: q, bottom: q }, sf: 3.8, bottom: 'full', kind: 'standard', u: 'in' });
    expect(c.ok).toBe(false); expect(c.options[0].panes.long).toBeGreaterThan(q); expect(c.options[0].costUsd).toBeGreaterThan(0);
  });
});
