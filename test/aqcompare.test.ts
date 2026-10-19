// Our stocking engine vs AqAdvisor (lane SE, Nathan 2026-10-19: "probe aqadvisor with some combinations, see if our own calc
// gets close, whether it over or under estimates"). AqAdvisor was down most of that day, so this is a harness:
//   1. GEN_AQ=1 npx vitest run test/aqcompare.test.ts   writes scripts/aq-queries.json (one query per combination below) and
//                                                      research/aq-compare.md (ours vs theirs, bias) from research/aq-compare.json
//   2. node scripts/aq-compare.mjs                      asks aqadvisor.com (30 s apart, resumes, stops when the site is down)
//   3. repeat 1 for the report.
// AqAdvisor's stocking level (its filter box left on 'Choose') is compared with our SPACE percent.
import { describe, expect, it } from 'vitest';
import { aqKey, aqQuery } from '../src/data/aqadvisor';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { stockingOf } from '../src/scene/stocking';
import type { TankSetup } from '../src/scene/types';
import AQ from '../research/aq-compare.json';

type Combo = { name: string; tank: [number, number, number]; stock: [string, number][] };
const COMBOS: Combo[] = [
  { name: '10 gal, 6 neon', tank: [20, 10, 12], stock: [['neon', 6]] },
  { name: '10 gal, 10 neon', tank: [20, 10, 12], stock: [['neon', 10]] },
  { name: '10 gal, 1 betta', tank: [20, 10, 12], stock: [['betta', 1]] },
  { name: '10 gal, 12 guppy', tank: [20, 10, 12], stock: [['guppy', 12]] },
  { name: '10 gal, 2 goldfish', tank: [20, 10, 12], stock: [['goldfish', 2]] },
  { name: '10 gal, 4 peacock cichlid', tank: [20, 10, 12], stock: [['peacock', 4]] },
  { name: '20 gal, 8 neon 4 cory 1 pleco', tank: [24, 12, 16], stock: [['neon', 8], ['bronzecory', 4], ['bristlenose', 1]] },
  { name: '20 gal, 20 chili rasbora 10 amano', tank: [30, 12, 12], stock: [['chili', 20], ['amano', 10]] },
  { name: '20 gal, 6 harlequin 6 pandacory 1 kribensis', tank: [30, 12, 12], stock: [['harlequin', 6], ['pandacory', 6], ['kribensis', 1]] },
  { name: '20 gal, 2 goldfish', tank: [30, 12, 12], stock: [['goldfish', 2]] },
  { name: '29 gal, 10 cardinal 1 ram 6 kuhli', tank: [30, 12, 18], stock: [['cardinal', 10], ['gbr', 1], ['kuhli', 6]] },
  { name: '29 gal, 1 oscar', tank: [30, 12, 18], stock: [['oscar', 1]] },
  { name: '40 gal, 6 tiger barb 6 danio 6 platy', tank: [36, 18, 16], stock: [['tigerbarb', 6], ['danio', 6], ['platy', 6]] },
  { name: '40 gal, 30 neon', tank: [36, 18, 16], stock: [['neon', 30]] },
  { name: '40 gal, 5 malawi cichlids', tank: [36, 18, 16], stock: [['labeo', 1], ['peacock', 1], ['afra', 1], ['livingstonii', 1], ['yellowlab', 1]] },
  { name: '55 gal, 6 angelfish', tank: [48, 13, 20], stock: [['angel', 6]] },
  { name: '55 gal, 2 oscar', tank: [48, 13, 20], stock: [['oscar', 2]] },
  { name: '55 gal, 12 rummynose 6 cory 1 gourami', tank: [48, 13, 20], stock: [['rummynose', 12], ['bronzecory', 6], ['dwarfgourami', 1]] },
  { name: '55 gal, 3 goldfish', tank: [48, 13, 20], stock: [['goldfish', 3]] },
  { name: '55 gal, 2 clown loach 1 sae', tank: [48, 13, 20], stock: [['clownloach', 2], ['sae', 1]] },
  { name: '75 gal, 6 discus', tank: [48, 18, 21], stock: [['discus', 6]] },
  { name: '75 gal, 1 syno 1 pleco 12 danio 6 cory', tank: [48, 18, 21], stock: [['syno', 1], ['bristlenose', 1], ['danio', 12], ['bronzecory', 6]] },
  { name: '125 gal, 4 oscar', tank: [72, 18, 22], stock: [['oscar', 4]] },
  { name: '125 gal, 20 rummynose 20 harlequin 6 angelfish', tank: [72, 18, 22], stock: [['rummynose', 20], ['harlequin', 20], ['angel', 6]] },
];

function comboTank(c: Combo): TankSetup {
  const s = defaultSetup();
  s.tank = { ...s.tank, L: c.tank[0] * IN, D: c.tank[1] * IN, H: c.tank[2] * IN };
  s.water.on = true; s.water.level = 1; s.water.salt = false;
  s.fish = c.stock.flatMap(([id, n]) => Array.from({ length: n }, () => id)).map((species, i) => ({ id: i + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
  return s;
}

describe('stocking vs AqAdvisor', () => {
  if ((globalThis as any).process?.env.GEN_AQ) {
    it('writes the queries and the report', async () => {
      // @ts-expect-error node only (no node types in this project)
      const fs = await import('node:fs');
      const queries = COMBOS.map(c => { const q = aqQuery(comboTank(c))!; return { name: c.name, key: aqKey(q), sel: q.sel, l: q.l, d: q.d, h: q.h, skipped: q.skipped.map(k => k.name), standIns: q.standIns.map(k => k.name + ' as ' + k.as) }; });
      fs.writeFileSync(new URL('../scripts/aq-queries.json', import.meta.url), JSON.stringify(queries, null, 1) + '\n');
      const got = AQ as Record<string, { pct?: number }>;
      const rows = COMBOS.map((c, i) => ({ c, r: stockingOf(comboTank(c)), a: got[queries[i].key]?.pct, q: queries[i] })).filter(x => x.a !== undefined);
      let md = '# Our stocking engine vs AqAdvisor\n\nAqAdvisor stocking level (filter left on Choose) against our space percent and filtration percent. ratio = our space / AqAdvisor.\n\n| tank and animals | AqAdvisor | our space | our filtration | ratio | notes |\n|---|---|---|---|---|---|\n';
      const ratios: number[] = [];
      for (const { c, r, a, q } of rows) {
        const ratio = r.spacePercent / a!; ratios.push(ratio);
        md += `| ${c.name} | ${a}% | ${Math.round(r.spacePercent)}% | ${Math.round(r.filtrationPercent)}% | ${ratio.toFixed(2)} | ${[...q.standIns, ...q.skipped.map(k => 'not counted: ' + k)].join('; ')} |\n`;
      }
      if (ratios.length) {
        const sorted = [...ratios].sort((x, y) => x - y), med = sorted[sorted.length >> 1];
        md += `\n${ratios.length} combinations. Median ratio ${med.toFixed(2)} (ours / AqAdvisor); ours higher by over 10% in ${ratios.filter(x => x > 1.1).length}, lower by over 10% in ${ratios.filter(x => x < 0.9).length}. Scale LU_PER_L x SPACE_ROOM by ${med.toFixed(2)} to match the median.\n`;
      } else md += '\nNo AqAdvisor answers yet: run `node scripts/aq-compare.mjs` when aqadvisor.com is up.\n';
      fs.writeFileSync(new URL('../research/aq-compare.md', import.meta.url), md);
    });
    return;
  }
  it('every combination makes a valid AqAdvisor query and a sane percent of ours', () => {
    for (const c of COMBOS) { const s = comboTank(c), q = aqQuery(s); expect(q, c.name).not.toBeNull(); expect(stockingOf(s).percent, c.name).toBeGreaterThan(0); }
  });
});
