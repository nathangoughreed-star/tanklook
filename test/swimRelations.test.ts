// BR unit 1: relations. Tall fish stay under the water line, a pair of two stays together, schools of two species stay apart, and the unfriendly
// behavior (rush / flee) appears only where the stocking has a flagged pair. Uses the glass-box test tank (swimFieldDouble), real species data.
import { describe, expect, it } from 'vitest';
import { getSpecies, type Species } from '../src/data/species';
import { CARE } from '../src/data/care';
import { pairRule } from '../src/data/groups';
import { ACTS, foesOf } from '../src/scene/foes';
import { whysAnimal } from '../src/scene/animalfit';
import { BANDS } from '../src/scene/scatter';
import { BENTHIC, HABIT, HOVER, STYLE } from '../src/scene/fishBehavior';
import { swimPace } from '../src/scene/swimPace';
import { makeSwimSim } from '../src/scene/swimSim';
import type { SwimmerSpec } from '../src/scene/swimTypes';
import { boxTank } from './swimFieldDouble';
import { rng } from '../src/art/paint';

const IN = 25.4;
/** The tank the sim sees: x along, y up to the water line, z = -depth. 20 gal long = 24 x 12 x 16 in; the planted example's 45 gal = 36 x 18 x 16 in. */
const tank = (L: number, D: number, H: number) => boxTank(L * IN, D * IN, H * IN * 0.92, 20, []);

/** Specs the way build.ts makes them (same tables), `counts` = species id -> how many. */
function cast(counts: Record<string, number>, field: ReturnType<typeof tank>, seed = 5): SwimmerSpec[] {
  const R = rng(seed), out: SwimmerSpec[] = [];
  const present = Object.keys(counts).flatMap(id => getSpecies(id) ?? []);
  const foes = foesOf(present as Species[]);
  let id = 1;
  for (const [sid, k] of Object.entries(counts)) {
    const sp = getSpecies(sid)!;
    for (let i = 0; i < k; i++) {
      const w = sp.tl, h = w * sp.aspect, bottom = sp.zone === 'bottom';
      const x = 100 + R() * (field.max[0] - 200), z = field.min[2] + 80 + R() * (-field.min[2] - 160), y = bottom ? 30 : 60 + R() * (field.waterTop - 160);
      out.push({
        id: id++, len: w, zone: bottom ? 'bottom' : 'water', pace: swimPace(sid), hover: HOVER[sid], habit: HABIT[sid] ? { ...HABIT[sid], hold: [...HABIT[sid].hold] as [number, number] } : undefined,
        rest: bottom ? BENTHIC[sid] : undefined, style: STYLE[sid], band: [...BANDS[sp.level ?? 'mid']] as [number, number], tall: h / 2, kind: sid, foes: foes.get(sid),
        guard: (CARE[sid]?.temper ?? 0) >= 1 || !!CARE[sid]?.guard || undefined, pair: pairRule(sid) && k === 2 ? sid : undefined,
        group: sp.group ? { key: sid, tight: sp.group === 'school' } : undefined,
        home: { x, y, z, yaw: R() * 360, pitch: 0, roll: 0 },
      });
    }
  }
  return out;
}
const run = (specs: SwimmerSpec[], field: ReturnType<typeof tank>, secs: number, seed: number, each?: (t: number, sim: ReturnType<typeof makeSwimSim>) => void) => {
  const sim = makeSwimSim(specs, field, seed);
  for (let f = 0, N = Math.round(secs * 30); f < N; f++) { sim.step(1 / 30); each?.(f / 30, sim); }
  return sim;
};

describe('BR phase 0', () => {
  it('no fin rises above the water line: angelfish in a 16 in tall tank, 60 s', () => {
    const field = tank(36, 18, 16), specs = cast({ angel: 3, neon: 10 }, field), tall = new Map(specs.map(s => [s.id, s.tall ?? 0]));
    let worst = -1e9;
    run(specs, field, 60, 3, (_t, sim) => { for (const s of specs) { const p = sim.pose(s.id)!; worst = Math.max(worst, p.y + tall.get(s.id)! - field.waterTop); } });
    expect(tall.get(1)!).toBeGreaterThan(80); // a real angel: about 4 in half height
    expect(worst).toBeLessThanOrEqual(0.5);
  });
  it('a tall fish in a shallow 10 gal still gets goals and stays under the line', () => {
    const field = tank(20, 10, 12), specs = cast({ angel: 1 }, field);
    let worst = -1e9, moved = 0, last = 0;
    run(specs, field, 60, 4, (_t, sim) => { const p = sim.pose(1)!; worst = Math.max(worst, p.y + specs[0].tall! - field.waterTop); moved += Math.abs(p.x - last); last = p.x; });
    expect(worst).toBeLessThanOrEqual(0.5); expect(moved).toBeGreaterThan(500);
  });
  it('two ocellaris stay within 3 body lengths in every frame, near one home', () => {
    const field = tank(48, 22, 18), specs = cast({ ocellaris: 2 }, field);
    expect(specs[0].pair).toBe('ocellaris');
    const L = specs[0].len, near = specs.map((s, i) => ({ ...s, home: { ...specs[0].home, x: specs[0].home.x + i * L } }));
    let worst = 0;
    for (const seed of [1, 2, 3]) run(near, field, 120, seed, (_t, sim) => { const a = sim.pose(1)!, b = sim.pose(2)!; worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)); });
    expect(worst).toBeLessThan(3 * L);
  });
  it('two ocellaris placed far apart close up within 25 s and then stay within 3 lengths', () => {
    const field = tank(48, 22, 18), specs = cast({ ocellaris: 2 }, field), far = specs.map((s, i) => ({ ...s, home: { ...s.home, x: 150 + i * 800, z: -200 } })), L = specs[0].len;
    let worst = 0;
    run(far, field, 120, 5, (t, sim) => { if (t < 25) return; const a = sim.pose(1)!, b = sim.pose(2)!; worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)); });
    expect(worst).toBeLessThan(3 * L);
  });
  it('three ocellaris do not pair', () => { expect(cast({ ocellaris: 3 }, tank(48, 22, 18)).every(s => !s.pair)).toBe(true); });
  it('neons and harlequins read as two groups: few fish have the other species as nearest neighbor', () => {
    const field = tank(36, 18, 16), specs = cast({ neon: 14, harlequin: 9 }, field), kind = new Map(specs.map(s => [s.id, s.kind]));
    let mixed = 0, total = 0;
    run(specs, field, 120, 7, (t, sim) => {
      if (t < 20 || Math.round(t * 30) % 15) return;
      for (const a of specs) { let bd = 1e18, bk = ''; for (const b of specs) { if (a === b) continue; const p = sim.pose(a.id)!, q = sim.pose(b.id)!, d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2; if (d < bd) { bd = d; bk = kind.get(b.id)!; } } total++; if (bk !== kind.get(a.id)) mixed++; }
    });
    expect(mixed / total).toBeLessThan(0.2);
  });
});

describe('BR phase 1: foes are the verdict\'s flagged pairs', () => {
  const ids = ['betta', 'guppy', 'angel', 'neon', 'harlequin', 'ocellaris', 'bronzecory', 'honeygourami', 'amano', 'kribensis', 'tigerbarb'];
  const sp = ids.map(i => getSpecies(i)!);
  const foes = foesOf(sp);
  it('every ordered pair the rule flags (it acts: eats, harasses, nips, too aggressive) is a foe entry, and no other pair is', () => {
    for (const s of sp) for (const o of sp) {
      if (s === o) continue;
      const flagged = whysAnimal(s, Infinity, 3, [o], {}).some(w => w.kind === 'compat' && !w.temp && (t => !/^it /.test(t) && ACTS.test(t))(w.text.replace(/^compatibility: /, '')));
      expect(foes.get(s.id)?.includes(o.id) ?? false, `${s.id} -> ${o.id}`).toBe(flagged);
    }
  });
  it('the cases the tanks below rely on', () => {
    expect(foes.get('betta')).toContain('guppy');
    expect(foes.get('neon')).toBeUndefined(); // a neon rushes nobody
    expect(foes.get('bronzecory')).toBeUndefined();
  });
  it('a 20 gal with a betta and guppies shows a rush within 2 minutes, for every seed', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const field = tank(24, 12, 16), specs = cast({ betta: 1, guppy: 6 }, field, seed), sim = run(specs, field, 120, seed);
      expect(sim.events.chases, `seed ${seed}`).toBeGreaterThanOrEqual(1);
    }
  });
  it('a planted community with no flagged pair has zero rushes in 10 minutes', () => {
    const field = tank(36, 18, 16), c = { neon: 14, harlequin: 9, honeygourami: 2, bronzecory: 6, amano: 4 }, s = cast(c, field);
    expect(s.every(x => !x.foes || x.foes.length === 0)).toBe(true);
    const sim = run(s, field, 600, 9);
    expect(sim.events.chases).toBe(0);
    expect(sim.events.startles).toBeGreaterThanOrEqual(1); // random alarms still happen (1-3 minutes apart)
    expect(sim.events.startles).toBeLessThan(20);
  });
  it('rushes are short and rare: a rush every 30-120 s per aggressor, none with events off', () => {
    const field = tank(24, 12, 16), specs = cast({ betta: 1, guppy: 6 }, field, 2), sim = run(specs, field, 600, 2);
    expect(sim.events.chases).toBeLessThan(25);
    const off = makeSwimSim(specs, field, 2); off.setEvents(false); for (let f = 0; f < 3000; f++) off.step(1 / 30);
    expect(off.events.chases).toBe(0); expect(off.events.startles).toBe(0);
  });
  it('a rushed fish bolts: it is faster in the second after a rush starts than the minute before', () => {
    const field = tank(24, 12, 16), specs = cast({ betta: 1, guppy: 6 }, field, 3), sim = makeSwimSim(specs, field, 3), prev = specs.map(() => ({ x: 0, y: 0, z: 0 }));
    let base = 0, nb = 0, burst = 0, nu = 0, lastC = 0, until = -1;
    for (let f = 0; f < 30 * 120; f++) {
      sim.step(1 / 30); const t = f / 30;
      if (sim.events.chases > lastC) { lastC = sim.events.chases; until = t + 1; }
      for (let i = 1; i < specs.length; i++) { const p = sim.pose(specs[i].id)!, v = Math.hypot(p.x - prev[i].x, p.y - prev[i].y, p.z - prev[i].z) * 30; prev[i] = { x: p.x, y: p.y, z: p.z }; if (t < 1) continue; if (t <= until) { burst += v; nu++; } else if (until < 0 || t > until + 3) { base += v; nb++; } }
    }
    expect(nu).toBeGreaterThan(0); expect(burst / nu).toBeGreaterThan(1.3 * (base / nb));
  });
  it('a click alarm: fish near it bolt away and bottom fish freeze', () => {
    const field = tank(36, 18, 16), specs = cast({ neon: 8, bronzecory: 4 }, field, 4), sim = makeSwimSim(specs, field, 4);
    for (let f = 0; f < 60; f++) sim.step(1 / 30);
    const p0 = specs.map(s => ({ ...sim.pose(s.id)! })), mid = specs.filter(s => s.zone === 'water')[0], q = p0[specs.indexOf(mid)];
    sim.startle(q.x + 40, q.y, q.z, 300);
    const trace: number[] = [];
    for (let f = 0; f < 90; f++) { sim.step(1 / 30); if (f % 15 === 14) { const a = sim.pose(mid.id)!; trace.push(Math.round(Math.hypot(a.x - (q.x + 40), a.y - q.y, a.z - q.z))); } }
    const q1 = sim.pose(mid.id)!;
    expect(Math.hypot(q1.x - (q.x + 40), q1.y - q.y, q1.z - q.z)).toBeGreaterThan(Math.hypot(40, 0, 0) + 100);
    expect(sim.events.startles).toBe(1);
  });
});
