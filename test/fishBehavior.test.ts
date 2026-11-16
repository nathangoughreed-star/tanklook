// FB1 (R105): kuhli digging / hiding and hovering with fanned pectorals, in the swim sim (scene/swimSim.ts) and the data tables (scene/fishBehavior.ts).
import { describe, expect, it } from 'vitest';
import { makeSwimSim } from '../src/scene/swimSim';
import type { SwimPose, SwimmerSpec } from '../src/scene/swimTypes';
import { DIG, HOVER, digGrainK } from '../src/scene/fishBehavior';
import { SPECIES } from '../src/data/species';
import { boxTank } from './swimFieldDouble';
import { OBS } from './swimCast';

const home = (x: number, y: number, z: number, yaw = 0) => ({ x, y, z, yaw, pitch: 0, roll: 0 });
const kuhliSpec = (k: number, dark: number, id: number, len = 100): SwimmerSpec => ({ id, len, zone: 'bottom', band: [0, 0.05], group: { key: 'kuhli', tight: false }, home: home(150 + id * 40, 80, -380), dig: { ...DIG.kuhli, k, dark, rest: len * 0.05 } });
const bed = (ground: number) => boxTank(900, 450, 450, ground, OBS);
/** Run `secs` of sim; `visit` sees every fish's pose each step. */
function run(specs: SwimmerSpec[], ground: number, secs: number, seed: number, visit: (p: SwimPose, s: SwimmerSpec, t: number) => void) {
  const sim = makeSwimSim(specs, bed(ground), seed), dt = 1 / 30;
  for (let s = 0; s < secs / dt; s++) { sim.step(dt); for (const sp of specs) visit(sim.pose(sp.id)!, sp, s * dt); }
}
const finite = (p: object) => Object.values(p).every(v => Number.isFinite(v));
const lowest = (p: SwimPose, s: SwimmerSpec) => p.y - 0.45 * s.len * Math.sin(Math.abs(p.pitch) * Math.PI / 180); // the nose end of a nose-down body

describe('FB1 data', () => {
  it('every hover / dig entry names a real species and sane numbers', () => {
    const ids = new Set(SPECIES.map(s => s.id));
    for (const [id, h] of Object.entries(HOVER)) { expect(ids.has(id), id).toBe(true); expect(h.w).toBeGreaterThan(0); expect(h.w).toBeLessThanOrEqual(1); expect(h.pec).toBeGreaterThan(0); expect(h.pec).toBeLessThanOrEqual(1); expect(h.caudal).toBeGreaterThanOrEqual(0); expect(h.caudal).toBeLessThanOrEqual(1); }
    for (const [id, d] of Object.entries(DIG)) {
      expect(ids.has(id), id).toBe(true);
      expect(SPECIES.find(s => s.id === id)!.zone, id).toBe('bottom'); // digging is a bottom dweller's habit
      expect(d.hold[0]).toBeLessThanOrEqual(d.hold[1]); expect(d.hideT[0]).toBeLessThanOrEqual(d.hideT[1]); expect(d.pitch).toBeLessThan(60);
      for (const g of d.grain) { expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(1); }
    }
  });
  it('the named cases are in: gouramis, bettas, angels, hatchets hover; kuhlis burrow in sand not gravel; corys only sift', () => {
    for (const id of ['gourami', 'dwarfgourami', 'betta', 'angel', 'hatchet', 'kribensis']) expect(HOVER[id]?.w, id).toBeGreaterThan(0.3);
    expect(digGrainK(DIG.kuhli, 'sand')).toBe(1); expect(digGrainK(DIG.kuhli, 'gravel')).toBeLessThan(0.15); expect(digGrainK(DIG.kuhli, undefined)).toBe(0);
    expect(DIG.kuhli.depth).toBeGreaterThan(0.8); expect(DIG.bronzecory.depth).toBeLessThan(0.3);
  });
});

describe('FB1 digging', () => {
  it('a kuhli in sand digs in and out, finite, never below the tank floor', () => {
    const specs = [1, 2, 3, 4, 5, 6].map(i => kuhliSpec(1, 1, i)); let maxDig = 0, minLow = 1e9, bad = 0, steps = 0, buried = 0;
    run(specs, 70, 900, 5, (p, s) => {
      if (!finite(p)) bad++;
      if ((p.dig ?? 0) > 1) minLow = Math.min(minLow, lowest(p, s));
      maxDig = Math.max(maxDig, p.dig ?? 0); steps++; if ((p.dig ?? 0) > 5) buried++;
    });
    expect(bad).toBe(0);
    expect(maxDig).toBeGreaterThan(8);              // it did sink (mm)
    expect(buried / steps).toBeGreaterThan(0.01);    // and for a real share of the time
    expect(buried / steps).toBeLessThan(0.7);        // but it is not buried all day
    expect(minLow).toBeGreaterThanOrEqual(-1);       // the nose stays above the glass bottom (y 0)
  });
  it('the dig is cut to the bed: a thin bed gives a shallow dig, still inside it', () => {
    const specs = [1, 2, 3, 4].map(i => kuhliSpec(1, 1, i)); let maxDig = 0, minLow = 1e9;
    run(specs, 20, 900, 9, (p, s) => { maxDig = Math.max(maxDig, p.dig ?? 0); if ((p.dig ?? 0) > 0.5) minLow = Math.min(minLow, lowest(p, s)); });
    expect(maxDig).toBeLessThan(20);
    expect(minLow).toBeGreaterThanOrEqual(-1);
  });
  it('gravel (k 0) never burrows; sand does; a dark tank digs more than a lit one', () => {
    const share = (k: number, dark: number, seed: number) => { let n = 0, tot = 0; run([1, 2, 3, 4, 5, 6, 7, 8].map(i => kuhliSpec(k, dark, i)), 70, 900, seed, p => { tot++; if ((p.dig ?? 0) > 5) n++; }); return n / tot; };
    const sand = share(1, 0, 3), gravel = share(0, 0, 3), dark = share(1, 1, 3);
    expect(gravel).toBe(0);
    expect(sand).toBeGreaterThan(0.01);
    expect(dark).toBeGreaterThan(sand);
  });
  it('a kuhli spends time hidden under cover (a still pause by rock / plants), also on gravel', () => {
    const specs = [1, 2, 3, 4, 5, 6].map(i => kuhliSpec(0, 0, i)), f = bed(70); let hid = 0;
    run(specs, 70, 1200, 4, (p, s) => { if ((p.calm ?? 1) < 0.3 && (p.dig ?? 0) === 0 && f.clearance(p.x, p.y + s.len * 0.7, p.z, undefined, s.len) < s.len * 0.4) hid++; });
    expect(hid).toBeGreaterThan(30);
  });
  it('a fish with no dig spec never sinks, never fans, and every pose stays finite', () => {
    const plain: SwimmerSpec[] = [1, 2, 3].map(i => ({ id: i, len: 60, zone: 'bottom', band: [0, 0.05], home: home(200 + i * 50, 85, -300) }));
    let maxDig = 0, bad = 0, fan = 0; run(plain, 70, 300, 2, p => { maxDig = Math.max(maxDig, p.dig ?? 0); fan = Math.max(fan, p.fan ?? 0); if (!finite(p)) bad++; });
    expect(maxDig).toBe(0); expect(fan).toBe(0); expect(bad).toBe(0);
  });
});

describe('FB1 hovering', () => {
  const gourami = (id: number, hover?: SwimmerSpec['hover']): SwimmerSpec => ({ id, len: 120, zone: 'water', band: [0.5, 0.9], pace: 0.4, hover, home: home(200 + id * 70, 300, -300) });
  const stats = (hover: SwimmerSpec['hover'], seed: number) => {
    const specs = [1, 2, 3, 4, 5, 6].map(i => gourami(i, hover)); let fanning = 0, tot = 0, bad = 0, calmHover = 0, calmFast = 0, nH = 0, nF = 0, fanFast = 0, maxFan = 0;
    const last = new Map<number, { x: number; y: number; z: number }>();
    run(specs, 30, 600, seed, (p, s) => {
      const q = last.get(s.id); last.set(s.id, { x: p.x, y: p.y, z: p.z }); if (!q) return;
      const v = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) * 30 / s.len; tot++;
      if (!finite(p)) bad++;
      maxFan = Math.max(maxFan, p.fan ?? 0);
      if ((p.fan ?? 0) > 0.5) { fanning++; calmHover += p.calm ?? 1; nH++; if (v > 0.35) fanFast++; }
      else if (v > 0.5) { calmFast += p.calm ?? 1; nF++; }
    });
    return { fanning: fanning / tot, bad, calmHover: nH ? calmHover / nH : 1, calmFast: nF ? calmFast / nF : 1, fanFast, maxFan };
  };
  it('a flagged gourami hovers: pectorals fan while it is nearly still, the tail beat drops, nothing goes NaN', () => {
    const s = stats(HOVER.gourami, 6);
    expect(s.bad).toBe(0);
    expect(s.fanning).toBeGreaterThan(0.1);
    expect(s.maxFan).toBeLessThanOrEqual(HOVER.gourami.pec + 1e-9);
    expect(s.calmHover).toBeLessThan(0.6);
    expect(s.calmFast).toBeGreaterThan(s.calmHover);
    expect(s.fanFast).toBeLessThan(40);       // (the fan eases off over about a second when it sets off)
  });
  it('no hover spec: no fanning at all and the tail keeps its full beat', () => {
    const s = stats(undefined, 6);
    expect(s.maxFan).toBe(0); expect(s.calmHover).toBe(1);
  });
  it('a bigger weight hovers more (same seed)', () => {
    const lo = stats({ w: 0.15, pec: 1, caudal: 0.2 }, 8).fanning, hi = stats({ w: 0.7, pec: 1, caudal: 0.2 }, 8).fanning;
    expect(hi).toBeGreaterThan(lo);
  });
  it('a hovering fish keeps its heading between nudges (no spinning in place)', () => {
    const specs = [gourami(1, HOVER.gourami)]; let maxTurn = 0, prev: number | null = null, n = 0;
    run(specs, 30, 400, 12, p => { if (prev !== null && (p.fan ?? 0) > 0.8) { let d = Math.abs(p.yaw - prev); if (d > 180) d = 360 - d; maxTurn = Math.max(maxTurn, d * 30); n++; } prev = p.yaw; });
    expect(n).toBeGreaterThan(100);
    expect(maxTurn).toBeLessThan(80);          // degrees per second while hovering
  });
  it('a hovering hatchet school stops together (a water group with a hover weight)', () => {
    const specs: SwimmerSpec[] = [1, 2, 3, 4, 5, 6].map(i => ({ id: i, len: 40, zone: 'water', band: [0.65, 0.98], group: { key: 'hatchet', tight: true }, hover: HOVER.hatchet, home: home(300 + i * 25, 400, -200) }));
    let fan1 = 0, tot = 0, bad = 0;
    run(specs, 30, 600, 3, (p, s) => { if (!finite(p)) bad++; if (s.id !== 1) return; tot++; if ((p.fan ?? 0) > 0.5) fan1++; });
    expect(bad).toBe(0); expect(fan1 / tot).toBeGreaterThan(0.05);
  });
});

describe('FB1 cost', () => {
  it('step cost with hover / dig specs vs without, alternating frames (a sequential timing lies on a shared machine)', () => {
    const mk = (flags: boolean): SwimmerSpec[] => {
      const out: SwimmerSpec[] = []; let id = 1;
      for (let k = 0; k < 8; k++) out.push({ id: id++, len: 100, zone: 'bottom', band: [0, 0.05], group: { key: 'kuhli', tight: false }, home: home(150 + k * 40, 80, -380), dig: flags ? { ...DIG.kuhli, k: 1, dark: 0.5, rest: 5 } : undefined });
      for (let k = 0; k < 12; k++) out.push({ id: id++, len: 40, zone: 'water', band: [0.4, 0.8], group: { key: 'hatchet', tight: true }, hover: flags ? HOVER.hatchet : undefined, home: home(520 + (k % 4) * 25, 250 + Math.floor(k / 4) * 25, -100 - (k % 3) * 20, 20) });
      for (let k = 0; k < 10; k++) out.push({ id: id++, len: 100 + k * 8, zone: 'water', band: [0.2, 0.8], pace: 0.4, hover: flags ? HOVER.gourami : undefined, home: home(100 + k * 60, 150 + k * 20, -60 - (k % 6) * 60, k * 40) });
      return out;
    };
    const A = makeSwimSim(mk(true), bed(70), 5), B = makeSwimSim(mk(false), bed(70), 5); let ta = 0, tb = 0; const dt = 1 / 30;
    for (let s = 0; s < 3000; s++) {
      const first = s & 1 ? B : A, second = s & 1 ? A : B;
      let t0 = performance.now(); first.step(dt); const d1 = performance.now() - t0; t0 = performance.now(); second.step(dt); const d2 = performance.now() - t0;
      if (s & 1) { tb += d1; ta += d2; } else { ta += d1; tb += d2; }
    }
    console.log(`FB1 sim step, 30 fish, alternating: with behaviours ${(ta / 3000).toFixed(4)} ms, without ${(tb / 3000).toFixed(4)} ms`);
    expect(ta).toBeLessThan(tb * 1.3);   // the new states cost no more than a few percent; the absolute ms depends on the machine
  });
});
