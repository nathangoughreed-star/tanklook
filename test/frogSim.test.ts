import { describe, expect, it } from 'vitest';
import { makeCrawlSim, type CrawlSpec } from '../src/scene/crawlSim';
import { CRAWL } from '../src/scene/crawlPace';
import { boxTank, type Obs } from './swimFieldDouble';

const IN = 25.4, GROUND = 30, TOP = 300;
const OBS: Obs[] = [{ kind: 'box', min: [300, 0, -300], max: [420, 140, -200] }, { kind: 'cyl', x: 650, z: -150, r: 40, y0: 0, y1: 250 }];
const field = boxTank(900, 450, TOP, GROUND, OBS);
const adf = (id: number, x: number, z: number): CrawlSpec => { const c = CRAWL.adf; return { id, len: 55, kind: c.kind, speed: c.inPerSec * IN, graze: c.graze, hop: 0, trip: c.tripS, rest: 6, home: { x, y: GROUND + 6, z, yaw: id * 70, pitch: 0, roll: 0 } }; };

describe('African dwarf frog (R93)', () => {
  it('lies still, leg-walks a few inches, and makes breathing trips up and back down (7200 s: about 3 an hour)', () => {
    const specs = [adf(1, 100, -100), adf(2, 500, -400), adf(3, 800, -300)], sim = makeCrawlSim(specs, field, 8), dt = 1 / 30;
    const top = TOP - 55 * 0.3, trips = [0, 0, 0], up = [false, false, false], rest = [0, 0, 0];
    let vUp = 0, vDown = 0, nUp = 0, nDown = 0, maxHind = 0, minHind = 0, legsMoved = false, total = 0;
    const prev = specs.map(s => ({ ...sim.pose(s.id)! }));
    for (let s = 0; s < 7200 / dt; s++) {
      sim.step(dt);
      specs.forEach((sp, i) => {
        const p = sim.pose(sp.id)!, dy = (p.y - prev[i].y) / dt;
        if (p.y >= top - 6 && !up[i]) { up[i] = true; trips[i]++; }
        if (p.y < GROUND + 10) up[i] = false;
        if (p.y - (GROUND + sp.rest) < 1) rest[i]++;
        if (p.y > GROUND + sp.rest + 20 && dy > 0 && p.y < top - 8) { vUp += dy; nUp++; }
        if (dy < 0 && p.y > GROUND + sp.rest + 10) { vDown = Math.max(vDown, -dy); nDown++; }
        maxHind = Math.max(maxHind, p.hind); minHind = Math.min(minHind, p.hind); if (Math.abs(p.fore) > 0.05) legsMoved = true;
        for (const o of OBS) { // the whole path stays clear of rock and plant
          if (o.kind === 'box') expect(p.x > o.min[0] && p.x < o.max[0] && p.z > o.min[2] && p.z < o.max[2] && p.y < o.max[1]).toBe(false);
          else expect(Math.hypot(p.x - o.x, p.z - o.z) > o.r || p.y > o.y1).toBe(true);
        }
        expect(p.y).toBeLessThan(TOP); prev[i] = { ...p }; total++;
      });
    }
    for (let i = 0; i < 3; i++) { expect(trips[i]).toBeGreaterThanOrEqual(2); expect(trips[i]).toBeLessThan(30); expect(rest[i] / (7200 / dt)).toBeGreaterThan(0.8); } // mostly on the substrate
    expect(vUp / nUp / 55).toBeGreaterThan(0.6); expect(vUp / nUp / 55).toBeLessThan(3);       // kicks up at ~0.95 body lengths/s (R115: gentler than the first cut's 1.5)
    expect(vDown / 55).toBeGreaterThan(4); expect(vDown / 55).toBeLessThan(8); expect(nDown).toBeGreaterThan(0); // the dive peaks at ~5 body lengths/s, well above the climb
    expect(minHind).toBeLessThan(-0.5); expect(maxHind).toBeGreaterThan(0.1); expect(legsMoved).toBe(true);
    expect(total).toBeGreaterThan(0);
  });
  it('walks only a few inches at a time, slowly', () => {
    const sp = adf(1, 100, -100), sim = makeCrawlSim([sp], field, 2), dt = 1 / 30; let prev = { ...sim.pose(1)! }, peak = 0, moved = 0;
    for (let s = 0; s < 600 / dt; s++) { sim.step(dt); const p = sim.pose(1)!; if (p.y - (GROUND + 6) < 1) { const v = Math.hypot(p.x - prev.x, p.z - prev.z) / dt / IN; peak = Math.max(peak, v); moved += v * dt; } prev = { ...p }; }
    expect(peak).toBeLessThan(0.7); expect(moved / 600).toBeLessThan(0.3);
  });
});
