// Lane CT1 part 2 (R38, 2026-11-14): pie slice 30-360 deg (360 = round), polygons of any side count with their own side lengths, dimension boxes.
import { describe, expect, it } from 'vitest';
import { cyclicPolygon, footprint, inside, normTank, pieRadius, polySides, ringArea, shapeOf, triangulate, volumeBetween } from '../src/scene/shape';
import { parseTank } from '../src/scene/validate';
import { applyDim, dimAnchors, makeRegular, parseLen, placeDims, roundAsPie, setPieAngle, setPolyCount, setPolySide } from '../src/shell/logic/tank';
import type { Tank } from '../src/scene/types';

const IN = 25.4, H = 12 * IN;
const edgeLens = (T: Tank) => footprint(T).edges.map(e => e.len);

describe('polygon: any sides, own side lengths', () => {
  it('lengths in = lengths out, corners on one circle, closed and convex', () => {
    const lens = [10, 12, 9, 14, 11, 13].map(v => v * IN), g = cyclicPolygon(lens);
    expect(typeof g).not.toBe('string');
    const pts = (g as Exclude<typeof g, string>).pts;
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; expect(Math.hypot(q[0] - p[0], q[1] - p[1])).toBeCloseTo(lens[i], 3); });
    const T = normTank({ L: 1, H, D: 1, shape: 'poly', sides: 6, sideLens: lens });
    expect(footprint(T).convex).toBe(true);
    expect(edgeLens(T).map(v => +v.toFixed(2))).toEqual(lens.map(v => +v.toFixed(2)));
    expect(T.L).toBeCloseTo(Math.max(...footprint(T).ring.map(p => p[0])), 0); expect(T.D).toBeCloseTo(Math.max(...footprint(T).ring.map(p => p[1])), 0);
    expect(normTank(T)).toEqual(T); // idempotent
  });
  it('a long side with the centre outside still closes (8 against 3+3+3)', () => {
    const lens = [3, 3, 3, 8].map(v => v * IN), g = cyclicPolygon(lens) as Exclude<ReturnType<typeof cyclicPolygon>, string>;
    g.pts.forEach((p, i) => { const q = g.pts[(i + 1) % 4]; expect(Math.hypot(q[0] - p[0], q[1] - p[1])).toBeCloseTo(lens[i], 3); });
    expect(ringArea(g.pts)).toBeGreaterThan(0);
  });
  it('impossible shapes are refused with a reason', () => {
    expect(cyclicPolygon([30, 5, 5].map(v => v * IN))).toMatch(/shorter than the other sides together/);
    expect(cyclicPolygon([6, 3, 3].map(v => v * IN))).toMatch(/shorter than the other sides together/); // equal to the rest: flat
    expect(cyclicPolygon([0.5, 10, 10, 10].map(v => v * IN))).toMatch(/at least/);
    expect(cyclicPolygon([10, 10].map(v => v * IN))).toMatch(/3 to 24/);
  });
  it('3 to 24 sides; a regular 24-gon is nearly a circle; regular edits keep it regular', () => {
    const T = normTank({ L: 24 * IN, H, D: 1, shape: 'poly', sides: 24 });
    expect(T.sides).toBe(24);
    const r = T.L / 2;
    expect(footprint(T).area / (Math.PI * r * r)).toBeGreaterThan(0.97);
    expect(normTank({ L: 24 * IN, H, D: 1, shape: 'poly', sides: 40 }).sides).toBe(24);
    expect(normTank({ L: 24 * IN, H, D: 1, shape: 'poly', sides: 2 }).sides).toBe(3);
    const eight = normTank({ L: 30 * IN, H, D: 1, shape: 'poly', sides: 8 });
    expect(new Set(edgeLens(eight).map(v => v.toFixed(1))).size).toBe(1);
  });
  it('editing one side: accepted, solved for closure; an impossible edit is refused and changes nothing', () => {
    const T = normTank({ L: 30 * IN, H, D: 1, shape: 'poly', sides: 8 }), s0 = polySides(T);
    const ok = setPolySide(T, 2, s0[2] * 1.5);
    expect('edit' in ok).toBe(true);
    if ('edit' in ok) { const T2 = normTank(ok.edit(T)); expect(T2.sideLens).toBeDefined(); expect(polySides(T2)[2]).toBeCloseTo(s0[2] * 1.5, 1); expect(polySides(T2)[0]).toBeCloseTo(s0[0], 1); expect(footprint(T2).convex).toBe(true); }
    const bad = setPolySide(T, 2, sumOthers(s0, 2) + 10);
    expect('error' in bad && bad.error).toMatch(/shorter than the other sides together/);
    const tiny = setPolySide(T, 0, 3);
    expect('error' in tiny).toBe(true);
    // setting every side equal again makes it regular
    const back = makeRegular(normTank({ ...T, sideLens: s0.map((v, i) => (i === 2 ? v * 1.5 : v)) }));
    expect(back.sideLens).toBeUndefined();
    expect(setPolyCount(T, 12).sides).toBe(12);
  });
  it('saved files keep their side lengths (parseTank); bad ones fall back to a regular polygon', () => {
    const lens = [10, 12, 9, 14, 11, 13].map(v => v * IN);
    const T = parseTank({ L: 1, H, D: 1, shape: 'poly', sides: 6, sideLens: lens }, { L: 600, H: 400, D: 300 });
    expect(T.sideLens).toHaveLength(6);
    const R = parseTank({ L: 500, H, D: 1, shape: 'poly', sides: 6, sideLens: [1, 2, 3] }, { L: 600, H: 400, D: 300 });
    expect(R.sideLens).toBeUndefined();
  });
});
const sumOthers = (a: number[], i: number) => a.reduce((s, v, k) => s + (k === i ? 0 : v), 0);

describe('pie slice 30-360', () => {
  const pie = (deg: number, r = 12 * IN): Tank => normTank({ L: 1, H, D: r * (1 - Math.cos(Math.max(Math.PI / 2, deg * Math.PI / 360))), shape: 'pie', pieDeg: deg });
  it('radius is kept across angles; width is derived', () => {
    for (const deg of [30, 90, 180, 270, 360]) expect(pieRadius(pie(deg))).toBeCloseTo(12 * IN, 3);
    let T = pie(90); T = normTank(setPieAngle(T, 270)); expect(pieRadius(T)).toBeCloseTo(12 * IN, 3); expect(T.pieDeg).toBe(270);
    expect(setPieAngle(pie(90), 500).pieDeg).toBe(360); expect(setPieAngle(pie(90), 5).pieDeg).toBe(30);
  });
  it('360 is a round tank: same outline, area and volume', () => {
    const P = pie(360), R = normTank({ L: 24 * IN, H, D: 1, shape: 'round' });
    expect(P.L).toBeCloseTo(R.L, 1); expect(P.D).toBeCloseTo(R.D, 1);
    expect(footprint(P).area).toBeCloseTo(footprint(R).area, 3);
    expect(volumeBetween(P, 0, H)).toBeCloseTo(volumeBetween(R, 0, H), 0);
    expect(footprint(P).walls).toHaveLength(1);
  });
  it('past 180 the outline folds in (concave), inside tests follow it; 90 and 180 stay convex', () => {
    expect(footprint(pie(90)).convex).toBe(true); expect(footprint(pie(180)).convex).toBe(true);
    const T = pie(270), r = pieRadius(T);
    expect(footprint(T).convex).toBe(false);
    expect(footprint(T).area / (0.75 * Math.PI * r * r)).toBeGreaterThan(0.97); expect(footprint(T).area / (0.75 * Math.PI * r * r)).toBeLessThan(1.03);
    expect(inside(T, T.L / 2, r * 0.4)).toBe(true);              // toward the front
    expect(inside(T, T.L / 2, r * 1.6)).toBe(false);             // in the notch behind the apex
    expect(inside(T, T.L / 2 - r * 0.6, r * 1.2)).toBe(true);    // beside the notch, still in the slice
  });
  it('the ear-clipped triangles cover the concave outline exactly', () => {
    const f = footprint(pie(270)), tris = triangulate(f.ring);
    const area = tris.reduce((s, [a, b, c]) => s + ringArea([f.ring[a], f.ring[b], f.ring[c]]), 0);
    expect(area).toBeCloseTo(f.area, 0);
  });
  it('an old round file still loads as round; the maker shows it as a 360 pie of the same size', () => {
    const T = parseTank({ L: 600, H: 400, D: 600, shape: 'round' }, { L: 600, H: 400, D: 300 });
    expect(shapeOf(T)).toBe('round');
    const P = normTank(roundAsPie(T));
    expect(shapeOf(P)).toBe('pie'); expect(P.pieDeg).toBe(360); expect(footprint(P).area).toBeCloseTo(footprint(T).area, 3);
    expect(parseTank({ L: 600, H: 400, D: 300, shape: 'pie', pieDeg: 300 }, { L: 600, H: 400, D: 300 }).pieDeg).toBe(300);
  });
});

describe('dimension boxes', () => {
  it('typed lengths: decimals, fractions, units', () => {
    expect(parseLen('36', 'in')).toBeCloseTo(36 * IN); expect(parseLen('3 1/2', 'in')).toBeCloseTo(3.5 * IN); expect(parseLen('1/2"', 'in')).toBeCloseTo(0.5 * IN);
    expect(parseLen('12.25 in', 'in')).toBeCloseTo(12.25 * IN); expect(parseLen('30', 'cm')).toBeCloseTo(300);
    expect(parseLen('abc', 'in')).toBeNull(); expect(parseLen('', 'in')).toBeNull(); expect(parseLen('-4', 'in')).toBeNull();
  });
  it('which boxes each shape shows', () => {
    const ids = (T: Tank) => dimAnchors(T, 'in').map(a => a.id);
    expect(ids({ L: 600, D: 300, H: 400 })).toEqual(['L', 'D', 'H']);
    expect(ids(normTank({ L: 600, H: 400, D: 600, shape: 'pie', pieDeg: 90 }))).toEqual(['R', 'A', 'H']);
    expect(ids(normTank({ L: 600, H: 400, D: 1, shape: 'poly', sides: 7 }))).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 's6', 'H']);
  });
  it('a box edit goes through the same ranges as the panel; the pie angle and a polygon side have their own rules', () => {
    const T: Tank = { L: 600, D: 300, H: 400 };
    const L = applyDim(T, 'L', 2000 * IN) as { edit: (t: Tank) => Tank; note?: string };
    expect(L.edit(T).L).toBeCloseTo(120 * IN); expect(L.note).toMatch(/Held to/);
    const A = applyDim(T, 'A', 1, 400) as { edit: (t: Tank) => Tank };
    expect(A.edit(normTank({ L: 600, H: 400, D: 600, shape: 'pie', pieDeg: 90 })).pieDeg).toBe(360);
    expect('error' in applyDim(T, 'A', 1, NaN)).toBe(true);
    const poly = normTank({ L: 30 * IN, H: 400, D: 1, shape: 'poly', sides: 5 });
    expect('error' in applyDim(poly, 's1', 500 * IN)).toBe(true);
  });
  it('boxes are placed on screen, pushed outward, and dropped when behind the eye', () => {
    const T = normTank({ L: 30 * IN, H: 400, D: 1, shape: 'poly', sides: 5 });
    const placed = placeDims(dimAnchors(T, 'in'), (x, _y, z) => [x * 0.1, -z * 0.1]);
    expect(placed).toHaveLength(6);
    expect(placeDims(dimAnchors(T, 'in'), () => null)).toEqual([]);
  });
});
