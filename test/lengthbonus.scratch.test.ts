// Lane LB measurement (GEN_LB=1 LB_OUT=file npx vitest run test/lengthbonus.scratch.test.ts writes the numbers to $LB_OUT).
import { describe, it } from 'vitest';
import { stockingOf, LENGTH_BONUS, lengthBetaOf } from '../src/scene/stocking';
import { comboTank } from './aqcompare.test';
import LISTS from '../research/expert-stockings.json';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { SPECIES, getSpecies } from '../src/data/species';
import { MIN_SLACK_PCT } from '../src/scene/animalfit';
import { bareSetup } from '../src/scene/defaults';
import { geometryOf, speciesMinimum, floorOf } from '../src/scene/tankMin';
import { turnPct, turnExempt } from '../src/scene/turnclear';
import type { TankSetup } from '../src/scene/types';
// @ts-expect-error node only
const { writeFileSync } = await import('node:fs');
const IN = 25.4;
type List = { name: string; gal: number; dims_in: number[] | null; salt: boolean; stock: [string, number, number][] };
const STD: [number, number[]][] = [[5, [16, 8, 10]], [10, [20, 10, 12]], [15, [24, 12, 12]], [20, [24, 12, 16]], [29, [30, 12, 18]],
  [30, [36, 12, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [75, [48, 18, 21]], [90, [48, 18, 24]], [125, [72, 18, 21]]];
const dims = (l: List) => l.dims_in ?? STD.reduce((b, s) => Math.abs(s[0] - l.gal) < Math.abs(b[0] - l.gal) ? s : b)[1];
const run = (l: List, pick: 1 | 2) => { const s = comboTank({ name: l.name, tank: dims(l) as [number, number, number], stock: l.stock.map(r => [r[0], r[pick]] as [string, number]) }); s.water.salt = l.salt; return stockingOf(s); };
const sdlog = (xs: number[]) => { const l = xs.map(Math.log), m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length); };
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const fishOf = (id: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, species: id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));

describe('lane LB', () => {
  if (!(globalThis as any).process?.env.GEN_LB) return it.skip('off', () => {});
  it('measures', () => {
    const out: any = {}, L = LISTS as unknown as List[];
    const wl = L.map(l => { const d = dims(l); return Math.min(d[0], d[1]) / Math.max(d[0], d[1]); });
    out.wl = { med: med(wl), min: Math.min(...wl), max: Math.max(...wl), vals: wl.map(x => +x.toFixed(3)) };
    const ref = out.wl.med;
    const meas = (on: boolean, beta?: any, r = ref) => {
      LENGTH_BONUS.on = on; LENGTH_BONUS.refWL = r; const saved = { ...LENGTH_BONUS.beta }; if (beta) Object.assign(LENGTH_BONUS.beta, beta);
      const mx = L.map(l => run(l, 2).percent), mn = L.map(l => run(l, 1).percent);
      Object.assign(LENGTH_BONUS.beta, saved); LENGTH_BONUS.on = false;
      return { mx, mn };
    };
    const base = meas(false);
    const row = (m: { mx: number[]; mn: number[] }) => ({ medMax: med(m.mx), sdMax: sdlog(m.mx), sdMin: sdlog(m.mn), over100: m.mx.filter(x => x > 100).length,
      passToFail: m.mx.filter((x, i) => base.mx[i] <= 100 && x > 100).length, failToPass: m.mx.filter((x, i) => base.mx[i] > 100 && x <= 100).length,
      moved: m.mx.filter((x, i) => Math.abs(x / base.mx[i] - 1) > 0.02).length, worstUp: Math.max(...m.mx.map((x, i) => x / base.mx[i])), worstDown: Math.min(...m.mx.map((x, i) => x / base.mx[i])) });
    out.base = row(base);
    out.variants = {} as any;
    const V: [string, any, number][] = [['provisional .2/.4/.7', undefined, ref], ['half beta', { low: .1, mid: .2, high: .35 }, ref], ['double beta', { low: .4, mid: .8, high: 1.4 }, ref],
      ['ref = square (1.0)', undefined, 1], ['ref = 0.5', undefined, 0.5]];
    for (const [k, b, r] of V) out.variants[k] = row(meas(true, b, r));
    const bm = meas(true);
    out.perList = L.map((l, i) => ({ name: l.name, d: dims(l).join('x'), wl: +wl[i].toFixed(2), base: +base.mx[i].toFixed(0), bonus: +bm.mx[i].toFixed(0) }));
    // step 2: clearance sweep over catalogue x species pairs that pass the gate today
    const tanks = TANK_MODELS.map(m => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = !m.terrarium; S.water.level = 0.9; S.water.salt = false; return { m, g: geometryOf(S) }; });
    out.clear = {} as any; out.clearAll = {} as any;
    for (const k of [1, 1.5, 2]) {
      let pairs = 0, flips = 0, p0 = 0, f0 = 0; const bySp: Record<string, number> = {}, byTank: Record<string, number> = {};
      for (const sp of SPECIES) for (const t of tanks) {
        if (!!t.m.terrarium !== (sp.habitat === 'land')) continue;
        const gate = speciesMinimum(sp, t.g).pct;
        if (gate <= 100) { p0++; if (turnPct(sp, t.g, k) > 100) f0++; }
        if (gate > MIN_SLACK_PCT) continue;
        pairs++;
        if (turnPct(sp, t.g, k) > MIN_SLACK_PCT) { if (k === 1.5) (out.pairs15 ??= []).push(sp.id + ' in ' + t.m.name + ' (' + (t.g.widthMm / IN).toFixed(1) + ' in wide, ' + turnPct(sp, t.g, k).toFixed(0) + '%)'); flips++; bySp[sp.id] = (bySp[sp.id] ?? 0) + 1; byTank[t.m.name] = (byTank[t.m.name] ?? 0) + 1; }
      }
      out.clear[k] = { pairs, flips, bySp: Object.entries(bySp).sort((a, b) => b[1] - a[1]).slice(0, 14), byTank: Object.entries(byTank).sort((a, b) => b[1] - a[1]).slice(0, 8) };
      out.clearAll[k] = { pairs: p0, flips: f0 };
    }
    out.exempt = SPECIES.filter(turnExempt).map(s => s.id);
    // step 3: shape sensitivity, same footprint area (1296 sq in) and height 21 in
    const A = 36 * 36, H = 21, shapes: [string, TankSetup['tank']][] = [];
    const rect = (w2l: number) => { const Lx = Math.sqrt(A / w2l); return { ...bareSetup().tank, shape: 'rect' as const, L: Lx * IN, D: (A / Lx) * IN, H: H * IN }; };
    for (const [n, r] of [['square 1:1', 1], ['2:1', .5], ['4:1', .25], ['8:1', .125]] as [string, number][]) shapes.push([n, rect(r)]);
    const R = Math.sqrt(A / Math.PI) * 2; shapes.push(['circle', { ...bareSetup().tank, shape: 'round' as const, L: R * IN, D: R * IN, H: H * IN }]);
    const both = (s: TankSetup) => { LENGTH_BONUS.on = false; const a = stockingOf(s).percent; LENGTH_BONUS.on = true; LENGTH_BONUS.refWL = ref; const b = stockingOf(s).percent; LENGTH_BONUS.on = false; return [a, b]; };
    out.shape = {} as any;
    for (const [cls, id, n] of [['none (cory)', 'bronzecory', 8], ['low (betta)', 'betta', 1], ['mid (neon)', 'neon', 24], ['high (danio)', 'danio', 24]] as [string, string, number][]) {
      out.shape[cls] = shapes.map(([sn, t]) => { const s = bareSetup(); s.tank = t; s.water.on = true; s.water.level = 1; s.water.salt = false; s.fish = fishOf(id, n);
        const f = floorOf(t), [a, b] = both(s); return { shape: sn, wl: +(f.widthMm / f.runMm).toFixed(2), area: Math.round(f.areaCm2 / 6.4516), off: +a.toFixed(0), on: +b.toFixed(0) }; });
    }
    const adv = { ...bareSetup().tank, shape: 'rect' as const, L: 72 * IN, D: 2 * IN, H: 12 * IN };
    out.adv = ([['danio', 6], ['neon', 6], ['betta', 1], ['guppy', 4], ['bronzecory', 3]] as [string, number][]).map(([id, n]) => {
      const s = bareSetup(); s.tank = adv; s.water.on = true; s.water.level = 0.9; s.water.salt = false; s.fish = fishOf(id, n);
      const sp = getSpecies(id)!, g = geometryOf(s), [a, b] = both(s);
      return { id, n, gate: Math.round(speciesMinimum(sp, g).pct), off: Math.round(a), on: Math.round(b), turn1: Math.round(turnPct(sp, g, 1)), turn15: Math.round(turnPct(sp, g, 1.5)), turn2: Math.round(turnPct(sp, g, 2)) };
    });
    out.betas = Object.fromEntries(['danio', 'neon', 'betta', 'gourami', 'oscar', 'bronzecory', 'guppy', 'harlequin'].map(id => [id, lengthBetaOf(getSpecies(id)!)]));
    writeFileSync((globalThis as any).process.env.LB_OUT, JSON.stringify(out, null, 1));
  });
});
