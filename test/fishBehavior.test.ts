// FB1 (R105): kuhli digging / hiding and hovering with fanned pectorals, in the swim sim (scene/swimSim.ts) and the data tables (scene/fishBehavior.ts).
import { describe, expect, it } from 'vitest';
import { makeSwimSim } from '../src/scene/swimSim';
import type { SwimPose, SwimmerSpec } from '../src/scene/swimTypes';
import { DIG, HOVER, STYLE, digGrainK } from '../src/scene/fishBehavior';
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
      for (let k = 0; k < 12; k++) out.push({ id: id++, len: 40, zone: 'water', band: [0.4, 0.8], group: { key: 'hatchet', tight: true }, hover: flags ? HOVER.hatchet : undefined, style: flags ? STYLE.danio : undefined, home: home(520 + (k % 4) * 25, 250 + Math.floor(k / 4) * 25, -100 - (k % 3) * 20, 20) });
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
    expect(ta).toBeLessThan(tb * 1.3);   // the new states cost a few percent at most; the absolute ms depends on the machine
  });
});

describe('FB1 part 2: burst and coast', () => {
  const school = (style: SwimmerSpec['style'], n = 10): SwimmerSpec[] => Array.from({ length: n }, (_, k) => ({ id: k + 1, len: 40, zone: 'water' as const, band: [0.3, 0.8] as [number, number], style, group: { key: 'danio', tight: true }, home: home(400 + (k % 4) * 25, 250 + Math.floor(k / 4) * 25, -150 - (k % 3) * 20, 20) }));
  const trace = (specs: SwimmerSpec[], secs: number, seed: number) => {
    const sim = makeSwimSim(specs, bed(30), seed), dt = 1 / 30, v: number[][] = specs.map(() => []), calm: number[][] = specs.map(() => []); let bad = 0, spread = 0, ns = 0;
    const prev = specs.map(sp => ({ ...sim.pose(sp.id)! }));
    for (let s = 0; s < secs / dt; s++) {
      sim.step(dt); let cx = 0, cy = 0, cz = 0;
      specs.forEach((sp, i) => { const p = sim.pose(sp.id)!; if (!finite(p)) bad++; v[i].push(Math.hypot(p.x - prev[i].x, p.y - prev[i].y, p.z - prev[i].z) / dt / sp.len); calm[i].push(p.calm ?? 1); prev[i] = { ...p }; cx += p.x; cy += p.y; cz += p.z; });
      cx /= specs.length; cy /= specs.length; cz /= specs.length;
      if (s > 10 / dt && s % 15 === 0) { spread += specs.reduce((a, _sp, i) => a + Math.hypot(prev[i].x - cx, prev[i].y - cy, prev[i].z - cz), 0) / specs.length; ns++; }
    }
    return { v, calm, bad, spread: spread / ns };
  };
  const cv = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m; };
  it('the table names real small fish with sane numbers', () => {
    const ids = new Set(SPECIES.map(s => s.id));
    for (const [id, st] of Object.entries(STYLE)) { expect(ids.has(id), id).toBe(true); expect(st.rate).toBeGreaterThan(0.5); expect(st.rate).toBeLessThan(4); expect(st.tau).toBeGreaterThan(0.1); expect(st.turn).toBeLessThanOrEqual(30); expect(SPECIES.find(s => s.id === id)!.tl, id).toBeLessThan(120); }
    for (const id of ['danio', 'neon', 'cardinal', 'whitecloud', 'guppy']) expect(STYLE[id], id).toBeTruthy();
    for (const id of ['gourami', 'angel', 'discus', 'oscar', 'betta']) expect(STYLE[id], id).toBeUndefined();
  });
  it('a danio school swims in pulses: speed swings between burst and glide, a gourami stays even', () => {
    const d = trace(school(STYLE.danio), 120, 4), g = trace(school(undefined), 120, 4);
    expect(d.bad).toBe(0);
    const dv = d.v.flat().slice(300), gv = g.v.flat().slice(300);
    expect(cv(dv)).toBeGreaterThan(cv(gv) * 1.5);
    expect(Math.max(...d.v.flat())).toBeLessThan(8);          // body lengths per second, bounded
    const mean = dv.reduce((a, b) => a + b, 0) / dv.length; expect(mean).toBeGreaterThan(0.4); expect(mean).toBeLessThan(4);
  });
  it('after a burst the speed decays (the glide) and the tail is nearly still; in the burst it beats', () => {
    const t = trace(school(STYLE.danio, 1), 120, 6), v = t.v[0], c = t.calm[0]; let glides = 0, decays = 0, quiet = 0, loud = 0;
    for (let i = 5; i < v.length - 6; i++) if (v[i] > v[i - 1] && v[i] >= v[i + 1] && v[i] > 1.5) { // a peak
      glides++; if (v[i + 6] < v[i] * 0.75) decays++; if (c[i + 9] < 0.6) quiet++; if (c[i] > 0.7) loud++;
    }
    expect(glides).toBeGreaterThan(40);
    expect(decays / glides).toBeGreaterThan(0.85);
    expect(quiet / glides).toBeGreaterThan(0.7);
    expect(loud / glides).toBeGreaterThan(0.7);
  });
  it('the school stays together: not looser than a steady school by more than a body length or two', () => {
    const p = trace(school(STYLE.danio), 180, 9), s = trace(school(undefined), 180, 9);
    expect(p.spread).toBeLessThan(s.spread + 80); expect(p.bad).toBe(0);
  });
  it('each pulse nudges the heading by a few degrees, not a swing', () => {
    const sim = makeSwimSim(school(STYLE.danio, 1), bed(30), 2), dt = 1 / 30; let prev = sim.pose(1)!.yaw; const ds: number[] = [];
    for (let s = 0; s < 3600; s++) { sim.step(dt); const y = sim.pose(1)!.yaw; let d = Math.abs(y - prev); if (d > 180) d = 360 - d; ds.push(d); prev = y; }
    ds.sort((a, b) => a - b);
    expect(ds[Math.floor(ds.length * 0.99)]).toBeLessThan(8);   // degrees in one 1/30 s step: a smooth turn (the odd wall bounce aside)
  });
});

describe('FB2: pulse-glide, slow cruise and hover mix over time', () => {
  const cv = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m; };
  const sch = (style: SwimmerSpec['style'], n: number, tight = true, hover?: SwimmerSpec['hover']): SwimmerSpec[] => Array.from({ length: n }, (_, k) => ({ id: k + 1, len: 38, zone: 'water' as const, band: [0.3, 0.8] as [number, number], style, hover, group: n > 1 ? { key: 'neon', tight } : undefined, home: home(400 + (k % 4) * 25, 250 + Math.floor(k / 4) * 25, -150 - (k % 3) * 20, 20) }));
  const shares = (specs: SwimmerSpec[], secs: number, seed: number) => {
    const c = [0, 0, 0]; let tot = 0, bad = 0; run(specs, 30, secs, seed, p => { if (!finite(p)) bad++; if (p.sub !== undefined) { c[p.sub]++; tot++; } });
    return { f: c.map(x => x / tot), bad, tot };
  };
  it('a darty tetra school visits all three styles, close to its weights', () => {
    const w = STYLE.neon.mix, r = shares(sch(STYLE.neon, 1), 4000, 7);   // a loner, long run, so the time shares converge
    expect(r.bad).toBe(0);
    for (let k = 0; k < 3; k++) { expect(r.f[k]).toBeGreaterThan(0.03); expect(Math.abs(r.f[k] - w[k])).toBeLessThan(0.12); }
    expect(r.f[0]).toBeGreaterThan(r.f[1]); expect(r.f[0]).toBeGreaterThan(r.f[2]);   // mostly pulse-glide
  });
  it('a school switches together, and many schools together keep the weights', () => {
    const specs: SwimmerSpec[] = []; let id = 1;
    for (let g = 0; g < 6; g++) for (let k = 0; k < 4; k++) specs.push({ id: id++, len: 38, zone: 'water', band: [0.3, 0.8], style: STYLE.neon, group: { key: 'neon' + g, tight: true }, home: home(150 + g * 110 + k * 12, 250, -120 - (k % 2) * 40, 20) });
    const subs = new Map<number, number[]>(); const w = STYLE.neon.mix; const c = [0, 0, 0]; let tot = 0;
    run(specs, 30, 1500, 3, (p, s) => { c[p.sub!]++; tot++; const a = subs.get(s.id) ?? []; a.push(p.sub!); subs.set(s.id, a); });
    for (let k = 0; k < 3; k++) expect(Math.abs(c[k] / tot - w[k])).toBeLessThan(0.1);
    const a = subs.get(1)!, b = subs.get(2)!; let same = 0; for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
    expect(same / a.length).toBeGreaterThan(0.95);   // same school: same style (a hover starts with a small lag only through the rest rule)
  });
  it('the mix follows the data: a weight of 0 never happens, and a species with no style has no sub-mode', () => {
    const r = shares(sch({ ...STYLE.neon, mix: [0.7, 0, 0.3] }, 1), 1500, 5); expect(r.f[1]).toBe(0);
    const plain = shares(sch(undefined, 1), 200, 5); expect(plain.tot).toBe(0);
  });
  it('deterministic for a seed, and every swap is smooth: no speed or heading pops', () => {
    const go = () => { const sim = makeSwimSim(sch(STYLE.danio, 6), bed(30), 11), dt = 1 / 30, out: SwimPose[] = []; const v: number[] = []; let prev = { ...sim.pose(1)! }, swaps = 0, lastSub = sim.pose(1)!.sub, worstDv = 0, worstYaw = 0, vPrev = 0, since = 99; const yaws: number[] = [];
      for (let s = 0; s < 1800 / dt * 1 / 1; s++) { if (s > 40000) break; sim.step(dt); const p = sim.pose(1)!; const sp = Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z) / dt / 38; if (p.sub !== lastSub) { swaps++; lastSub = p.sub; since = 0; } else since++; if (s > 0 && since <= 3) worstDv = Math.max(worstDv, Math.abs(sp - vPrev)); let d = Math.abs(p.yaw - prev.yaw); if (d > 180) d = 360 - d; if (s > 30) yaws.push(d); vPrev = sp; prev = { ...p }; v.push(sp); if (s % 600 === 0) out.push({ ...p }); }
      yaws.sort((x, y) => x - y); worstYaw = yaws[Math.floor(yaws.length * 0.999)];
      return { out, swaps, worstDv, worstYaw }; };
    const a = go(), b = go();
    expect(a.out).toEqual(b.out);
    expect(a.swaps).toBeGreaterThan(20);
    expect(a.worstDv).toBeLessThan(1.2);     // body lengths per second, per 1/30 s step, at a swap (a burst starts in about 0.1 s)
    expect(a.worstYaw).toBeLessThan(10);     // degrees per step at the 99.9th percentile (the odd bounce off the trunk aside, as for every fish)
  });
  it('hover inside the mix scull the fins and still the tail; the slow cruise is slower than the pulse-glide mean and steady', () => {
    const sim = makeSwimSim(sch(STYLE.neon, 1), bed(30), 9), dt = 1 / 30; const vs: number[][] = [[], [], []]; const fan = [0, 0, 0], n = [0, 0, 0], calm = [0, 0, 0]; let prev = { ...sim.pose(1)! };
    for (let s = 0; s < 4000 / dt; s++) { sim.step(dt); const p = sim.pose(1)!, k = p.sub!; vs[k].push(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z) / dt / 38); fan[k] += p.fan ?? 0; calm[k] += p.calm ?? 1; n[k]++; prev = { ...p }; }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(vs[1])).toBeLessThan(mean(vs[0]));
    expect(cv(vs[1])).toBeLessThan(cv(vs[0]) * 0.7);       // steady vs jerky
    expect(mean(vs[2])).toBeLessThan(0.2);                  // hover: nearly still
    expect(fan[2] / n[2]).toBeGreaterThan(0.25); expect(fan[0] / n[0]).toBeLessThan(0.1);
    expect(calm[2] / n[2]).toBeLessThan(0.6);
  });
});

