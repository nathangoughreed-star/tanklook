import { describe, expect, it } from 'vitest';
import { makeCrawlSim, type CrawlSpec } from '../src/scene/crawlSim';
import { CRAWL } from '../src/scene/crawlPace';
import { boxTank, type Obs } from './swimFieldDouble';

const IN = 25.4, GROUND = 30;
const OBS: Obs[] = [
  { kind: 'box', min: [150, 0, -300], max: [260, 140, -200] },
  { kind: 'box', min: [600, 0, -120], max: [820, 90, -30] },
  { kind: 'cyl', x: 330, z: -330, r: 45, y0: 0, y1: 300 },
];
const field = boxTank(900, 450, 450, GROUND, OBS);
const specOf = (id: number, sp: string, len: number, rest: number, x: number, z: number): CrawlSpec => {
  const c = CRAWL[sp];
  return { id, len, kind: c.kind, speed: c.inPerSec * IN, graze: c.graze, hop: c.hopPerMin, rest, home: { x, y: GROUND + rest, z, yaw: id * 50, pitch: 0, roll: 0 } };
};
const cast = () => [specOf(1, 'cherryshrimp', 30, 3, 80, -80), specOf(2, 'cherryshrimp', 30, 3, 500, -400), specOf(3, 'amano', 51, 4, 420, -60), specOf(4, 'nerite', 32, 6, 700, -250),
  specOf(5, 'mystery', 51, 8, 100, -400), specOf(6, 'redclaw', 200, 20, 450, -200), specOf(7, 'thaicrab', 12, 3, 850, -400), specOf(8, 'ramshorn', 25, 6, 300, -150)];

describe('crawlSim', () => {
  it('stays on the ground, never inside rock or plant, in bounds (600 s)', () => {
    const specs = cast(), sim = makeCrawlSim(specs, field, 5), dt = 1 / 30;
    let minClear = 1e9, maxLift = 0, hopped = false;
    for (let s = 0; s < 600 / dt; s++) {
      sim.step(dt);
      for (const sp of specs) {
        const p = sim.pose(sp.id)!;
        expect(Number.isFinite(p.x + p.y + p.z + p.yaw)).toBe(true);
        const lift = p.y - (GROUND + sp.rest); maxLift = Math.max(maxLift, lift);
        if (lift > 0.5) { expect(sp.kind).toBe('shrimp'); hopped = true; } // only shrimp leave the ground, and briefly
        else if (lift > 0.01) expect(Math.abs(lift)).toBeLessThan(0.5);
        const c = field.clearance(p.x, GROUND + Math.max(5, sp.len * 0.25), p.z, undefined, 1e6); // above the ground, beside the obstacles
        minClear = Math.min(minClear, c - Math.max(5, sp.len * 0.25) * 0.8 + 1e-6 > 0 ? 1 : 0);
        expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(900); expect(p.z).toBeLessThan(0); expect(p.z).toBeGreaterThan(-450);
        for (const o of OBS) { // the centre is outside every obstacle footprint
          if (o.kind === 'box') expect(p.x > o.min[0] && p.x < o.max[0] && -p.z > -o.max[2] && -p.z < -o.min[2]).toBe(false);
          else expect(Math.hypot(p.x - o.x, p.z - o.z)).toBeGreaterThan(o.r);
        }
      }
    }
    expect(minClear).toBe(1);
    expect(hopped).toBe(true);
    expect(maxLift).toBeLessThan(40);
  });
  it('walks at real speeds (in/s): nerite ~0.1, cherry shrimp 0.4-1', () => {
    const specs = cast(), sim = makeCrawlSim(specs, field, 9), dt = 1 / 30;
    const dist = specs.map(() => 0), peak = specs.map(() => 0), prev = specs.map(sp => ({ ...sim.pose(sp.id)! }));
    const T = 400;
    for (let s = 0; s < T / dt; s++) { sim.step(dt); specs.forEach((sp, i) => { const p = sim.pose(sp.id)!, d = Math.hypot(p.x - prev[i].x, p.z - prev[i].z); dist[i] += d; peak[i] = Math.max(peak[i], d / dt / IN); prev[i] = { ...p }; }); }
    const mean = dist.map(d => d / T / IN);
    const by = (id: number) => mean[specs.findIndex(s => s.id === id)];
    expect(by(4)).toBeLessThan(0.12); expect(by(4)).toBeGreaterThan(0.02);   // nerite
    expect(by(1)).toBeLessThan(0.7); expect(by(1)).toBeGreaterThan(0.12);    // cherry shrimp: walking + stops averages below the walking speed
    expect(by(5)).toBeLessThan(0.25);                                        // mystery snail
    for (let i = 0; i < specs.length; i++) if (specs[i].kind !== 'shrimp') expect(peak[i]).toBeLessThan(CRAWL[['', '', '', 'nerite', 'mystery', 'redclaw', 'thaicrab', 'ramshorn'][i]]?.inPerSec * 1.6 + 0.05);
  });
  it('is deterministic and reset restores the placed pose', () => {
    const specs = cast(), a = makeCrawlSim(specs, field, 3), b = makeCrawlSim(specs, field, 3);
    for (let s = 0; s < 900; s++) { a.step(1 / 30); b.step(1 / 30); }
    for (const sp of specs) expect(a.pose(sp.id)).toEqual(b.pose(sp.id));
    a.reset();
    for (const sp of specs) expect(a.pose(sp.id)).toEqual(sp.home);
  });
});
