// Lane LB geometry calibration (GEN_LB=1 LB_OUT=file npx vitest run test/lengthcalib.scratch.test.ts): markdown tables, US units.
import { describe, it } from 'vitest';
import { stockingOf, LENGTH_BONUS } from '../src/scene/stocking';
import { getSpecies } from '../src/data/species';
import { bareSetup } from '../src/scene/defaults';
import { geometryOf, speciesMinimum } from '../src/scene/tankMin';
import { TURN_K, turnPct } from '../src/scene/turnclear';
import type { TankSetup } from '../src/scene/types';
// @ts-expect-error node only
const { writeFileSync } = await import('node:fs');
const IN = 25.4;
const fishOf = (id: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, species: id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const mk = (L: number, D: number, H: number, id: string, n: number, shape: 'rect' | 'round' = 'rect'): TankSetup => {
  const s = bareSetup(); s.tank = { ...s.tank, shape, L: L * IN, D: D * IN, H: H * IN }; s.water.on = true; s.water.level = 0.9; s.water.salt = false; s.fish = fishOf(id, n); return s;
};
const pc = (x: number) => Number.isFinite(x) ? Math.round(x) + '' : '>999';
function row(label: string, L: number, D: number, H: number, id: string, n: number, shape: 'rect' | 'round' = 'rect') {
  const S = mk(L, D, H, id, n, shape), sp = getSpecies(id)!, g = geometryOf(S);
  LENGTH_BONUS.on = false; const off = stockingOf(S).spacePercent; LENGTH_BONUS.on = true; const on = stockingOf(S).spacePercent; LENGTH_BONUS.on = false;
  const gate = speciesMinimum(sp, g).pct, turn = turnPct(sp, g, TURN_K), gal = g.tankLitres ? g.tankLitres / 3.785 : 0;
  const flags = [turn > 100 ? (turn > 111 ? 'AMBER: too narrow to turn' : 'amber (within slack)') : '', gate > 111 && on <= 100 ? 'CONTRADICTION: bonus reads fine, sourced minimum fails' : '', gate > 111 ? 'gate red' : ''].filter(Boolean).join('; ');
  const wl = Math.min(g.widthMm, g.lengthMm) / Math.max(g.widthMm, g.lengthMm);
  return `| ${label} | ${(g.lengthMm / IN).toFixed(0)} x ${(g.widthMm / IN).toFixed(1)} x ${H} | ${wl.toFixed(2)} | ${n} ${sp.name} | ${pc(off)} | ${pc(on)} | ${on === off ? 0 : Math.round((on / off - 1) * 100)} % | ${pc(gate)} | ${pc(turn)} | ${flags} |`;
}
const HEAD = '| tank | L x W x H in | W/L | stock | density off % | density on % | change | sourced gate % | turn % (k 1.5) | flags |\n|---|---|---|---|---|---|---|---|---|---|';
const STOCK: [string, string, number][] = [['bottom dweller', 'bronzecory', 8], ['betta', 'betta', 1], ['tetra', 'neon', 12], ['zebra danio', 'danio', 12]];

describe('lane LB geometry calibration', () => {
  if (!(globalThis as any).process?.env.GEN_LB) return it.skip('off', () => {});
  it('writes', () => {
    let md = '';
    for (const [area, H] of [[1296, 16], [576, 12]] as [number, number][]) {
      md += `\n#### Equal floor area ${area} sq in, ${H} in tall, 90 % full\n`;
      for (const [cls, id, n] of STOCK) {
        md += `\n${cls}\n\n${HEAD}\n`;
        for (const [nm, r] of [['1:1', 1], ['2:1', .5], ['4:1', .25], ['8:1', .125]] as [string, number][]) { const Lx = Math.sqrt(area / r); md += row(nm, Lx, area / Lx, H, id, n) + '\n'; }
        if (area === 1296) { const R = Math.sqrt(area / Math.PI) * 2; md += row('round', R, R, H, id, n, 'round') + '\n'; }
      }
    }
    md += '\n#### Edge cases (tank sizes as sold; 90 % full)\n\n' + HEAD + '\n';
    const edge: [string, number, number, number, string, number][] = [
      ['72 x 2 slot', 72, 2, 12, 'bronzecory', 3], ['72 x 2 slot', 72, 2, 12, 'betta', 1], ['72 x 2 slot', 72, 2, 12, 'neon', 6], ['72 x 2 slot', 72, 2, 12, 'danio', 6],
      ['72 x 3 slot', 72, 3, 12, 'bronzecory', 3], ['72 x 3 slot', 72, 3, 12, 'betta', 1], ['72 x 3 slot', 72, 3, 12, 'neon', 6], ['72 x 3 slot', 72, 3, 12, 'danio', 6],
      ['18 in cube', 18, 18, 18, 'bronzecory', 4], ['18 in cube', 18, 18, 18, 'betta', 1], ['18 in cube', 18, 18, 18, 'neon', 8], ['18 in cube', 18, 18, 18, 'danio', 8],
      ['20 long', 30, 12, 12, 'axolotl', 1], ['20 long', 30, 12, 12, 'axolotl', 2], ['30 x 12 x 18 (29 gal)', 30, 12, 18, 'axolotl', 1], ['30 x 12 x 18 (29 gal)', 30, 12, 18, 'axolotl', 2],
      ['40 breeder', 36, 18, 16, 'axolotl', 2], ['55 gal', 48, 13, 21, 'axolotl', 2],
      ['55 gal', 48, 13, 21, 'oscar', 1], ['75 gal', 48, 18, 21, 'oscar', 1], ['75 gal', 48, 18, 21, 'oscar', 2], ['90 gal', 48, 18, 24, 'oscar', 2], ['125 gal', 72, 18, 21, 'oscar', 2],
      ['55 gal', 48, 13, 21, 'livingstonii', 1], ['75 gal', 48, 18, 21, 'livingstonii', 3], ['125 gal', 72, 18, 21, 'livingstonii', 5], ['75 gal', 48, 18, 21, 'peacock', 8], ['75 gal', 48, 18, 21, 'comet', 2],
    ];
    for (const [t, L, D, H, id, n] of edge) md += row(t, L, D, H, id, n) + '\n';
    writeFileSync((globalThis as any).process.env.LB_OUT, md);
  });
});
