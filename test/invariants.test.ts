// Stocking-engine invariants (lane S244, Nathan 2026-10-26): property-style checks over many seeded species / tanks that say the engine
// behaves logically WITHOUT needing an expert's exact percent. A failing invariant is a FINDING, not a fix: it is marked `it.fails`
// (or the violating species listed in a KNOWN table) with a comment naming the case, and written up in research/audits/invariants.md.
// Engine entry points: scene/stocking.ts stockingOf (space / floor / filtration), ui/stockPlanLogic.ts notesOf + planFor (group-size
// band, pairing, tank options), data/groups.ts bandOf / mostFor, scene/animalfit.ts whysAnimal (compatibility gates) and
// scene/temprange.ts (shared range, operating check). There is NO single "social result" object: the group-size result is
// notesOf(...).band (count only, never the tank) and the pairing line; invariants 3 and 4 test that.
import { describe, expect, it } from 'vitest';
import { CARE } from '../src/data/care';
import { GROUPS, bandMessage, bandOf, type GroupBand } from '../src/data/groups';
import { SPECIES, getSpecies, type Species } from '../src/data/species';
import { minDataOf } from '../src/scene/tankMin';
import { tankFor } from '../src/scene/tankfit';
import { whysAnimal } from '../src/scene/animalfit';
import { defaultSetup } from '../src/scene/defaults';
import { withChoice } from '../src/scene/tech';
import { IN } from '../src/scene/physics';
import { countsAgainstWater, stockingOf } from '../src/scene/stocking';
import { zoneOf } from '../src/scene/zone';
import { operatingCheck, rangeVerdict, sharedRange } from '../src/scene/temprange';
import type { Fish, TankSetup } from '../src/scene/types';
import { notesOf, planFor, type Pk } from '../src/ui/stockPlanLogic';

/** mulberry32: a tiny seeded generator, so every run draws the same tanks and a failure names a reproducible case. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const WATER = SPECIES.filter(s => countsAgainstWater(s) && s.kind !== 'snail' && CARE[s.id]);
const FRESH = WATER.filter(s => !s.salt), SALTY = WATER.filter(s => s.salt);
const BOTTOM = FRESH.filter(s => zoneOf(s) === 'bottom');

type Stock = [string, number][];
/** A tank of L x D x H inches holding these animals (adult lengths), water on. `pin`: the water temperature is set (24 C, 25.5 C salt)
 *  and not inferred from the stocking, so "everything else unchanged" really is (see FINDING F5: the inferred temperature moves with the animals). */
function tank(L: number, D: number, H: number, stock: Stock, salt = false, pin = true): TankSetup {
  const s = defaultSetup();
  s.tank = { ...s.tank, L: L * IN, D: D * IN, H: H * IN };
  s.water.on = true; s.water.level = 0.9; s.water.salt = salt;
  if (pin) s.tech = { ...withChoice(s, 'heater', 'one'), targetC: salt ? 25.5 : 24 };
  let id = 0;
  s.fish = stock.flatMap(([sp, n]) => Array.from({ length: n }, (): Fish => ({ id: ++id, species: sp, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  return s;
}
const addOne = (s: TankSetup, sp: string): TankSetup => ({ ...s, fish: [...s.fish, { ...s.fish[0] ?? { x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }, id: 1000 + s.fish.length, species: sp } as Fish] });
const sizeLine = (s: TankSetup) => `${Math.round(s.tank.L / IN)}x${Math.round(s.tank.D / IN)}x${Math.round(s.tank.H / IN)} in`;
const stockLine = (st: Stock) => st.map(([i, n]) => `${n} ${i}`).join(', ');
function randomTank(r: () => number, pin = true) {
  const salt = r() < 0.25, pool = salt ? SALTY : FRESH;
  const stock: Stock = Array.from({ length: int(r, 1, 4) }, () => [pick(r, pool).id, int(r, 1, 12)]);
  return { s: tank(int(r, 18, 72), int(r, 10, 24), int(r, 10, 30), stock, salt, pin), stock, pool };
}

describe('invariant 1: adding an animal never lowers fullness', () => {
  it('space, water, floor, filtration and the overall percent never fall when one more animal joins (300 seeded tanks)', () => {
    const r = rng(1), bad: string[] = [];
    for (let k = 0; k < 300; k++) {
      const { s, stock, pool } = randomTank(r), add = pick(r, pool).id;
      const a = stockingOf(s), b = stockingOf(addOne(s, add)), eps = 1e-9;
      for (const f of ['spacePercent', 'waterPercent', 'floorPercent', 'filtrationPercent', 'percent'] as const)
        if (b[f] < a[f] - eps) bad.push(`${f} ${a[f].toFixed(2)} -> ${b[f].toFixed(2)}: ${stockLine(stock)} + 1 ${add} in ${sizeLine(s)}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
  // F5 is DOCUMENTED-INTENDED (Nathan accepted it 2026-10-26, lane S245): with no target set the water temperature follows the stocking, so a tankmate can move it. Kept as it.fails so a change shows.
  it.fails('FINDING F5 (documented-intended): with the water temperature NOT set (inferred from the stocking) adding an animal can LOWER filtration (e.g. 11 syno + 1 harlequin, 42x16x25 in: 58.43 -> 58.31)', () => {
    const r = rng(1), bad: string[] = [];
    for (let k = 0; k < 300; k++) {
      const { s, stock, pool } = randomTank(r, false), add = pick(r, pool).id, a = stockingOf(s).filtrationPercent, b = stockingOf(addOne(s, add)).filtrationPercent;
      if (b < a - 1e-9) bad.push(`${a.toFixed(2)} -> ${b.toFixed(2)}: ${stockLine(stock)} + 1 ${add} in ${sizeLine(s)}`);
    }
    expect(bad).toEqual([]);
  });
  it('the same holds one species at a time, 1 to 14 animals, in a fixed tank (every species)', () => {
    const bad: string[] = [];
    for (const sp of WATER) {
      const salt = !!sp.salt; let prev = stockingOf(tank(48, 18, 20, [], salt));
      for (let n = 1; n <= 14; n++) {
        const cur = stockingOf(tank(48, 18, 20, [[sp.id, n]], salt));
        for (const f of ['spacePercent', 'filtrationPercent', 'percent'] as const) if (cur[f] < prev[f] - 1e-9) bad.push(`${sp.id}: ${f} ${prev[f].toFixed(2)} -> ${cur[f].toFixed(2)} at ${n}`);
        prev = cur;
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('invariant 2: tank height does not change the floor capacity of bottom dwellers', () => {
  it('floor percent is identical and space percent about the same from 10 to 40 in of height (every bottom dweller)', () => {
    const bad: string[] = [];
    for (const sp of BOTTOM) {
      const lo = stockingOf(tank(36, 18, 12, [[sp.id, 4]])), hi = stockingOf(tank(36, 18, 36, [[sp.id, 4]]));
      if (Math.abs(lo.floorPercent - hi.floorPercent) > 1e-6) bad.push(`${sp.id}: floor ${lo.floorPercent.toFixed(2)} vs ${hi.floorPercent.toFixed(2)}`);
      if (Math.abs(lo.spacePercent / hi.spacePercent - 1) > 0.05) bad.push(`${sp.id}: space ${lo.spacePercent.toFixed(1)} (12 in) vs ${hi.spacePercent.toFixed(1)} (36 in)`);
    }
    expect(BOTTOM.length).toBeGreaterThan(5);
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('the same for seeded mixes of bottom dwellers in seeded tank footprints', () => {
    const r = rng(2), bad: string[] = [];
    for (let k = 0; k < 80; k++) {
      const stock: Stock = Array.from({ length: int(r, 1, 3) }, () => [pick(r, BOTTOM).id, int(r, 1, 8)]), L = int(r, 20, 60), D = int(r, 10, 24), H1 = int(r, 10, 14), H2 = int(r, 24, 40);
      const a = stockingOf(tank(L, D, H1, stock)), b = stockingOf(tank(L, D, H2, stock));
      if (Math.abs(a.spacePercent / b.spacePercent - 1) > 0.05) bad.push(`${a.spacePercent.toFixed(1)}% (${H1} in) vs ${b.spacePercent.toFixed(1)}% (${H2} in): ${stockLine(stock)} on ${L}x${D}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('invariant 3: 4 -> 6 of a social species', () => {
  const social = Object.keys(GROUPS).filter(id => GROUPS[id].bands && getSpecies(id) && countsAgainstWater(getSpecies(id)!));
  const RANK: Record<GroupBand, number> = { avoid: 0, ok: 1, good: 2, great: 3, unknown: -1 };
  it('the group-size band never gets worse from 4 to 6 (count bands only; the fighting limit is a separate warning)', () => {
    expect(social.length).toBeGreaterThan(10);
    const bad = social.filter(id => RANK[bandOf(GROUPS[id], 6)] < RANK[bandOf(GROUPS[id], 4)]).map(id => `${id}: ${bandOf(GROUPS[id], 4)} -> ${bandOf(GROUPS[id], 6)}`);
    expect(bad).toEqual([]);
  });
  it('band thresholds are ordered (ok <= good <= great) for every species that has them', () => {
    const bad = Object.entries(GROUPS).filter(([, g]) => g.bands && !(g.bands.ok <= g.bands.good && g.bands.good <= g.bands.great)).map(([id]) => id);
    expect(bad).toEqual([]);
  });
  it('through the plan sheet: notesOf band never worse 4 -> 6, while spatial fullness strictly rises, in a fixed tank', () => {
    const bad: string[] = [];
    for (const id of social) {
      const sp = getSpecies(id)!, salt = !!sp.salt, a: Pk = { id, n: 4 }, b: Pk = { id, n: 6 };
      if (RANK[notesOf(b).band] < RANK[notesOf(a).band]) bad.push(`${id}: notesOf band ${notesOf(a).band} -> ${notesOf(b).band}`);
      const s4 = stockingOf(tank(72, 24, 24, [[id, 4]], salt)), s6 = stockingOf(tank(72, 24, 24, [[id, 6]], salt));
      if (!(s6.spacePercent > s4.spacePercent) && s4.spacePercent > 0) bad.push(`${id}: spacePercent ${s4.spacePercent.toFixed(2)} -> ${s6.spacePercent.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('invariant 4: a bonded pair changes the social result, never the physical occupancy', () => {
  const formers = ['gbr', 'bolivianram', 'kribensis', 'angel', 'discus', 'ocellaris', 'banggai', 'firefish', 'watchman'].filter(id => getSpecies(id));
  it('stockingOf has no pairing input: recording a pair leaves every number identical', () => {
    for (const id of formers) {
      const s = tank(48, 18, 20, [[id, 2]], !!getSpecies(id)!.salt), p = { ...s, pairs: { [id]: { status: 'established' as const, ids: [1, 2] as [number, number] } } };
      expect(stockingOf(p), id).toEqual(stockingOf(s));
    }
  });
  it('the plan sheet judges tanks on the animals only: the tank list is the same with or without a recorded pair', () => {
    for (const id of formers) {
      const unk = planFor([{ id, n: 2, pair: 'unknown' }]), est = planFor([{ id, n: 2, pair: 'established' }]);
      expect(est.options.map(o => [o.tank.id, o.spacePct, o.filtrationPct, o.fails]), id).toEqual(unk.options.map(o => [o.tank.id, o.spacePct, o.filtrationPct, o.fails]));
    }
  });
  it('the social side does change, and only for the better: an established pair is never worse than an unconfirmed one', () => {
    const RANK: Record<GroupBand, number> = { avoid: 0, ok: 1, good: 2, great: 3, unknown: -1 }, bad: string[] = [];
    for (const id of formers) {
      const u = notesOf({ id, n: 2, pair: 'unknown' }), e = notesOf({ id, n: 2, pair: 'established' });
      if (RANK[e.band] < RANK[u.band]) bad.push(`${id}: unknown ${u.band} -> established ${e.band}`);
      expect(e.pairing?.status, id).toBe('established'); expect(u.pairing?.status, id).toBe('unknown');
    }
    expect(bad).toEqual([]);
  });
});

describe('invariant 5: missing species requirements cannot silently confirm compatibility', () => {
  const T = (id: string) => CARE[id].temp!;
  it('a species with no recorded temperature is "unknown", not a confirmed temperature match, and the plan sheet does not read it as ok', () => {
    const target = FRESH.find(s => CARE[s.id].temp)!, saved = CARE[target.id].temp;
    try {
      delete CARE[target.id].temp;
      const sr = sharedRange([target]);
      expect(sr.state).toBe('unknown'); expect(sr.unrecorded).toContain(target);
      const ev = { heater: true, chiller: false, room: 21, roomSet: true, target: 24 };
      expect(operatingCheck(sr, ev).state).toBe('unchecked');
      expect(rangeVerdict(sr, [operatingCheck(sr, ev)]).level).not.toBe('ok');
      // in company, the unrecorded one is named and left out, never counted as inside
      const mate = FRESH.find(s => s.id !== target.id && CARE[s.id].temp)!;
      expect(sharedRange([target, mate]).unrecorded).toContain(target);
    } finally { CARE[target.id].temp = saved; }
  });
  it('F1 (fixed S245): a species id with no species or care entry is not quietly "fine": the gate says "not enough information"', () => {
    const w = whysAnimal({ ...FRESH[0], id: 'nosuchfish' } as Species, 1000, 3, []);
    expect(w.length).toBeGreaterThan(0); expect(w[0].text).toMatch(/not enough information/);
  });
  it('F2 (fixed S245): stockingOf on an unknown species id says "not enough information", never "No animals in the water"', () => {
    const r = stockingOf(tank(36, 18, 18, [['nosuchfish', 5]]));
    expect(r.reasons.join(' ')).not.toMatch(/No animals in the water/);
    expect(r.reasons.join(' ')).toMatch(/Not enough information/);
  });
  it('F3 (fixed S245): a species without group bands reads "unknown" (not enough information), never "ok"; every aquatic species has bands today', () => {
    expect(bandOf(undefined, 1)).toBe('unknown'); expect(bandOf({}, 5)).toBe('unknown');
    expect(bandMessage(undefined, 1)).toMatch(/Not enough information/);
    expect(WATER.filter(s => !CARE[s.id].bands && !CARE[s.id].group).map(s => s.id)).toEqual([]);
  });
  it('the temperature gate runs for every aquatic species that has a range (none is silently skipped)', () => {
    for (const s of WATER) expect(CARE[s.id].temp, s.id).toBeTruthy();
    expect(T(FRESH[0].id).length).toBe(2);
  });
});

describe('invariant 6: an unsuitable temperature cannot be rescued by excess space', () => {
  const ev = (target: number) => ({ heater: true, chiller: false, room: 21, roomSet: true, target });
  const tempReasons = (s: Species, litres: number, target: number) => whysAnimal(s, litres, 3, [], { water: ev(target) }).filter(w => w.temp && !w.concern);
  it('the gate on a target outside the species range holds at every volume, up to a 100,000 L tank (every aquatic species)', () => {
    const bad: string[] = [];
    for (const s of WATER) {
      const t = CARE[s.id].temp!;
      for (const target of [t[0] - 4, t[1] + 4])
        for (const litres of [20, 200, 2000, 100000]) if (!tempReasons(s, litres, target).length) bad.push(`${s.id} @${target} C in ${litres} L`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('a target inside the range raises no temperature objection at any volume (the gate is on temperature, not space)', () => {
    for (const s of WATER) { const t = CARE[s.id].temp!, mid = (t[0] + t[1]) / 2; for (const litres of [20, 100000]) expect(tempReasons(s, litres, mid), s.id).toEqual([]); }
  });
  it('two species whose comfortable ranges do not overlap are blocked together however big the tank', () => {
    const r = rng(6), bad: string[] = [];
    let seen = 0;
    for (let k = 0; k < 400 && seen < 60; k++) {
      const a = pick(r, FRESH), b = pick(r, FRESH);
      if (a.id === b.id || sharedRange([a, b]).state !== 'none') continue;
      seen++;
      for (const litres of [100, 100000]) if (!whysAnimal(a, litres, 3, [b]).some(w => w.temp && !w.concern)) bad.push(`${a.id} + ${b.id} in ${litres} L`);
    }
    expect(seen).toBeGreaterThan(5);
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it('excess space does not lower the temperature-driven filtration reading: a heated-to-the-wrong-range tank is not made "fine" by more water', () => {
    // load rises with temperature (tempFactor): a tank held hotter than the species range reads no emptier because it is big
    const s = FRESH.find(x => CARE[x.id].temp![1] < 26)!, hot = (L: number) => { const t = tank(L, 18, 20, [[s.id, 6]]); t.tech = { ...(t.tech ?? {}), targetC: CARE[s.id].temp![1] + 6 } as TankSetup['tech']; return t; };
    expect(stockingOf(hot(48)).percent).toBeLessThanOrEqual(stockingOf(hot(24)).percent); // bigger tank reads emptier by space (expected) ...
    // ... but the gate is independent of that reading
    expect(tempReasons(s, 1000, CARE[s.id].temp![1] + 6).length).toBeGreaterThan(0);
  });
  it('the plan sheet: a stocking with no shared temperature is flagged "bad" by rangeVerdict whatever tank is chosen', () => {
    const a = FRESH.find(x => CARE[x.id].temp![1] <= 20)!, b = FRESH.find(x => CARE[x.id].temp![0] >= 26)!;
    const sr = sharedRange([a, b]); expect(sr.state).toBe('none');
    expect(rangeVerdict(sr, []).level).toBe('bad');
  });
  it('F4 (fixed S245): a stocking with NO shared temperature range has no fitting tank at any size, and a problem line says why', () => {
    const a = FRESH.find(x => CARE[x.id].temp![1] <= 20 && !CARE[x.id].solo)!, b = FRESH.find(x => CARE[x.id].temp![0] >= 26 && !CARE[x.id].solo)!;
    expect(sharedRange([a, b]).state).toBe('none');
    const plan = planFor([{ id: a.id, n: 1 }, { id: b.id, n: 1 }]);
    const biggest = plan.options[plan.options.length - 1];
    expect(biggest.fails.length > 0 || !!plan.problem).toBe(true);
    expect(plan.options.every(o => o.fails.includes('temperature'))).toBe(true); // extra space never rescues it
    expect(plan.need).toBeUndefined();
    expect(plan.problem).toMatch(/temperature/i);
  });
  it('F4: a shared range keeps the old behaviour (no temperature fail), and every seeded no-range pair is refused at every size', () => {
    const ok = planFor([{ id: 'neon', n: 8 }]); expect(ok.options.some(o => o.fails.includes('temperature'))).toBe(false); expect(ok.need).toBeDefined();
    const r = rng(7), bad: string[] = []; let seen = 0;
    for (let k = 0; k < 400 && seen < 40; k++) {
      const a = pick(r, FRESH), b = pick(r, FRESH);
      if (a.id === b.id || sharedRange([a, b]).state !== 'none') continue;
      seen++; const p = planFor([{ id: a.id, n: 1 }, { id: b.id, n: 1 }]);
      if (p.need || !p.problem || !p.options.every(o => o.fails.includes('temperature'))) bad.push(`${a.id} + ${b.id}`);
    }
    expect(seen).toBeGreaterThan(5); expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe('S245: every aquatic species has a tank minimum the size path enforces', () => {
  const MINL = WATER.filter(s => !minDataOf(s.id)?.red && CARE[s.id].minL);
  it('every aquatic species has a red line or a care-table minimum volume', () => {
    expect(WATER.filter(s => !minDataOf(s.id)?.red && !CARE[s.id].minL).map(s => s.id)).toEqual([]);
  });
  it('a species on the care-table minimum fails a tank under it and passes one at it (10 % slack), alone', () => {
    expect(MINL.length).toBeGreaterThan(10);
    const bad: string[] = [];
    for (const s of MINL) {
      const L = CARE[s.id].minL!, small = tankFor([{ species: s.id, n: 1 }])!;
      if (small.litres < L / 1.1 - 1e-6 && !small.fails.length) bad.push(`${s.id}: ${small.litres.toFixed(0)} L passes a ${L} L minimum`);
      if (small.litres >= L / 1.1 && small.fails.includes('minimum')) bad.push(`${s.id}: ${small.litres.toFixed(0)} L fails a ${L} L minimum`);
    }
    expect(bad).toEqual([]);
    expect(tankFor([{ species: 'redclaw', n: 1 }])!.litres).toBeGreaterThan(180);
  });
});
