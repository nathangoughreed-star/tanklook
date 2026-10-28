// Lane LB k_credit sweep (GEN_LB=1 LB_OUT=file npx vitest run test/lengthcredit.scratch.test.ts): markdown, US units.
import { describe, it } from 'vitest';
import { stockingOf, LENGTH_BONUS, lengthBetaOf } from '../src/scene/stocking';
import { comboTank } from './aqcompare.test';
import LISTS from '../research/expert-stockings.json';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { SPECIES, getSpecies } from '../src/data/species';
import { bareSetup } from '../src/scene/defaults';
import { geometryOf } from '../src/scene/tankMin';
import { TURN_K, creditFraction, turnExempt } from '../src/scene/turnclear';
// @ts-expect-error node only
const { writeFileSync } = await import('node:fs');
const IN = 25.4, KS = [2, 2.5, 3, 4];
type List = { name: string; gal: number; dims_in: number[] | null; salt: boolean; stock: [string, number, number][] };
const STD: [number, number[]][] = [[5, [16, 8, 10]], [10, [20, 10, 12]], [15, [24, 12, 12]], [20, [24, 12, 16]], [29, [30, 12, 18]],
  [30, [36, 12, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [75, [48, 18, 21]], [90, [48, 18, 24]], [125, [72, 18, 21]]];
const dims = (l: List) => l.dims_in ?? STD.reduce((b, s) => Math.abs(s[0] - l.gal) < Math.abs(b[0] - l.gal) ? s : b)[1];
const sdlog = (xs: number[]) => { const l = xs.map(Math.log), m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length); };
const fishOf = (id: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, species: id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const slot = (L: number, D: number, H: number, id: string, n: number, shape: 'rect' | 'round' = 'rect') => { const s = bareSetup(); s.tank = { ...s.tank, shape, L: L * IN, D: D * IN, H: H * IN }; s.water.on = true; s.water.level = 0.9; s.water.salt = false; s.fish = fishOf(id, n); return s; };
const dens = (s: ReturnType<typeof slot>, on: boolean, k = LENGTH_BONUS.kCredit) => { LENGTH_BONUS.on = on; LENGTH_BONUS.kCredit = k; const v = stockingOf(s).spacePercent; LENGTH_BONUS.on = false; return v; };

describe('lane LB credit sweep', () => {
  if (!(globalThis as any).process?.env.GEN_LB) return it.skip('off', () => {});
  it('writes', () => {
    let md = '';
    // (a) ordinary tanks: credit fraction per species
    const NAMED = ['20 gal long', '29 gal', '55 gal', '75 gal', '125 gal'];
    const SPS = ['neon', 'cardinal', 'danio', 'tigerbarb', 'betta', 'gourami', 'angelfish', 'oscar', 'comet', 'livingstonii'].filter(id => getSpecies(id));
    const tanks = TANK_MODELS.map(m => { const S = bareSetup(); S.tank = tankFromModel(m); S.water.on = !m.terrarium; S.water.level = 0.9; S.water.salt = false; return { m, g: geometryOf(S) }; });
    md += '### (a) Credit fraction in ordinary aquariums (0 = none, 1 = full; width in inches; k_turn 1.5)\n\n';
    for (const k of KS) {
      md += `**k_credit ${k}**\n\n| species (adult in) | ${NAMED.map(n => { const t = tanks.find(x => x.m.name === n); return `${n} (${t ? (t.g.widthMm / IN).toFixed(1) : '?'} in wide)`; }).join(' | ')} |\n|---|${NAMED.map(() => '---').join('|')}|\n`;
      for (const id of SPS) { const sp = getSpecies(id)!; md += `| ${sp.name} (${(sp.tl / IN).toFixed(1)}) | ${NAMED.map(n => { const t = tanks.find(x => x.m.name === n); return t ? creditFraction(sp, t.g.widthMm, TURN_K, k).toFixed(2) : '-'; }).join(' | ')} |\n`; }
      md += '\n';
    }
    // whole catalogue: swimmers (non-bottom, non-land, non-exempt) x wet tanks
    md += '### Whole catalogue (every wet tank x every swimmer that earns a bonus, beta > 0)\n\n| k_credit | pairs | pairs losing any credit | losing more than half | mean credit kept (losing pairs) | species most affected |\n|---|---|---|---|---|---|\n';
    const swim = SPECIES.filter(sp => lengthBetaOf(sp) > 0 && !turnExempt(sp)), wet = tanks.filter(t => !t.m.terrarium);
    for (const k of KS) {
      let n = 0, lose = 0, half = 0, kept = 0; const by: Record<string, number> = {};
      for (const sp of swim) for (const t of wet) { n++; const f = creditFraction(sp, t.g.widthMm, TURN_K, k); if (f < 0.999) { lose++; kept += f; if (f < 0.5) half++; by[sp.id] = (by[sp.id] ?? 0) + 1; } }
      md += `| ${k} | ${n} | ${lose} (${(100 * lose / n).toFixed(0)} %) | ${half} | ${lose ? (kept / lose).toFixed(2) : '-'} | ${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0] + ' ' + e[1]).join(', ')} |\n`;
    }
    // density in the named long tanks for neon and danio
    md += '\n### Density change from the bonus in ordinary long tanks (12 neon, 12 zebra danio; space %, off to on)\n\n| tank | ' + KS.map(k => `k ${k}: neon / danio`).join(' | ') + ' |\n|---|' + KS.map(() => '---').join('|') + '|\n';
    for (const [nm, L, D, H] of [['20 long 30 x 12 x 12', 30, 12, 12], ['29 gal 30 x 12 x 18', 30, 12, 18], ['30 gal 36 x 12 x 16', 36, 12, 16], ['55 gal 48 x 13 x 21', 48, 13, 21], ['75 gal 48 x 18 x 21', 48, 18, 21], ['125 gal 72 x 18 x 21', 72, 18, 21]] as [string, number, number, number][]) {
      const cell = (id: string, k: number) => { const s = slot(L, D, H, id, 12), a = dens(s, false), b = dens(s, true, k); return `${a.toFixed(0)}>${b.toFixed(0)} (${Math.round((b / a - 1) * 100)} %)`; };
      md += `| ${nm} | ${KS.map(k => `${cell('neon', k)} / ${cell('danio', k)}`).join(' | ')} |\n`;
    }
    // (b) slots
    md += '\n### (b) Slots (12 in water, 6 neon or 6 danio): credit fraction and density off > on\n\n| slot | species | ' + KS.map(k => `k ${k}`).join(' | ') + ' |\n|---|---|' + KS.map(() => '---').join('|') + '|\n';
    for (const [L, D] of [[72, 3], [72, 2], [48, 6], [60, 4]]) for (const id of ['neon', 'danio']) {
      const s = slot(L, D, 12, id, 6), sp = getSpecies(id)!, off = dens(s, false);
      md += `| ${L} x ${D} x 12 | ${sp.name} (${(sp.tl / IN).toFixed(1)} in) | ${KS.map(k => `${creditFraction(sp, D * IN, TURN_K, k).toFixed(2)}; ${off.toFixed(0)}>${dens(s, true, k).toFixed(0)}`).join(' | ')} |\n`;
    }
    // (c) 37 lists
    md += '\n### (c) 37-list regression (published max, sdlog of percent; off ' ;
    const L = LISTS as unknown as List[], run = (l: List) => { const s = comboTank({ name: l.name, tank: dims(l) as [number, number, number], stock: l.stock.map(r => [r[0], r[2]] as [string, number]) }); s.water.salt = l.salt; return stockingOf(s).percent; };
    const base = L.map(run); md += `${sdlog(base).toFixed(4)})\n\n| k_credit | median % | sdlog | lists moved over 2 % | pass to fail | fail to pass |\n|---|---|---|---|---|---|\n`;
    for (const k of KS) {
      LENGTH_BONUS.on = true; LENGTH_BONUS.kCredit = k; const on = L.map(run); LENGTH_BONUS.on = false;
      const med = [...on].sort((a, b) => a - b)[on.length >> 1];
      md += `| ${k} | ${med.toFixed(1)} | ${sdlog(on).toFixed(4)} | ${on.filter((x, i) => Math.abs(x / base[i] - 1) > 0.02).length} | ${on.filter((x, i) => base[i] <= 100 && x > 100).length} | ${on.filter((x, i) => base[i] > 100 && x <= 100).length} |\n`;
    }
    // beta sensitivity: round vs 2:1 gap, danio, equal area 1296 sq in, 16 in tall
    md += '\n### Round vs 2:1 gap for zebra danio by beta (12 danio, 1296 sq in, 16 in tall; space %)\n\n| beta (fast schoolers) | round off | round on | 2:1 on | round vs 2:1 | square vs 2:1 | 8:1 vs 2:1 |\n|---|---|---|---|---|---|---|\n';
    const A = 1296, R = Math.sqrt(A / Math.PI) * 2, two = Math.sqrt(A * 2), sav = LENGTH_BONUS.beta.high;
    for (const b of [0.4, 0.7, 1.0]) {
      LENGTH_BONUS.beta.high = b;
      const r = dens(slot(R, R, 16, 'danio', 12, 'round'), true), t = dens(slot(two, two / 2, 16, 'danio', 12), true), sq = dens(slot(36, 36, 16, 'danio', 12), true), e = dens(slot(Math.sqrt(A * 8), Math.sqrt(A / 8), 16, 'danio', 12), true);
      md += `| ${b} | ${dens(slot(R, R, 16, 'danio', 12, 'round'), false).toFixed(1)} | ${r.toFixed(1)} | ${t.toFixed(1)} | +${((r / t - 1) * 100).toFixed(0)} % | +${((sq / t - 1) * 100).toFixed(0)} % | ${((e / t - 1) * 100).toFixed(0)} % |\n`;
    }
    LENGTH_BONUS.beta.high = sav;
    writeFileSync((globalThis as any).process.env.LB_OUT, md);
  });
});
