// Published "recommended stockings" (research/expert-stockings.json) run through our engine.
// GEN_EXPERT=1 npx vitest run test/expert.test.ts writes research/expert-stockings.md.
import { describe, expect, it } from 'vitest';
import { stockingOf } from '../src/scene/stocking';
import { comboTank } from './aqcompare.test';
import LISTS from '../research/expert-stockings.json';

type List = { name: string; url: string; gal: number; dims_in: number[] | null; salt: boolean; intent: string; stock: [string, number, number][]; standIns: string[] };

// Standard US glass tank sizes, inches L x D x H.
const STD: [number, number[]][] = [[5, [16, 8, 10]], [10, [20, 10, 12]], [15, [24, 12, 12]], [20, [24, 12, 16]], [29, [30, 12, 18]],
  [30, [36, 12, 16]], [40, [36, 18, 16]], [55, [48, 13, 21]], [75, [48, 18, 21]], [90, [48, 18, 24]], [125, [72, 18, 21]]];
const dims = (l: List) => l.dims_in ?? STD.reduce((b, s) => Math.abs(s[0] - l.gal) < Math.abs(b[0] - l.gal) ? s : b)[1];

function run(l: List, pick: 1 | 2) {
  const s = comboTank({ name: l.name, tank: dims(l) as [number, number, number], stock: l.stock.map(r => [r[0], r[pick]] as [string, number]) });
  s.water.salt = l.salt;
  return stockingOf(s);
}

describe('published stockings', () => {
  it('every list maps to known species and gives a percent', () => {
    for (const l of LISTS as unknown as List[]) expect(run(l, 2).percent, l.name).toBeGreaterThan(0);
  });
  if ((globalThis as any).process?.env.GEN_EXPERT) {
    it('writes the report', async () => {
      // @ts-expect-error node only
      const fs = await import('node:fs');
      let md = '# Published stockings through our engine\n\nEach list as published (min and max counts where a range is given), standard tank dimensions unless the source gives them. Verdict percent = the larger of space and filtration (default filter).\n\n| list | gal | intent | min % | max % | space | filtration | binds on | top contributor |\n|---|---|---|---|---|---|---|---|---|\n';
      const maxes: number[] = [];
      for (const l of LISTS as unknown as List[]) {
        const a = run(l, 1), b = run(l, 2); maxes.push(b.percent);
        const top = [...b.contributors].sort((p, q) => q.share - p.share)[0];
        md += `| [${l.name}](${l.url}) | ${l.gal} | ${l.intent} | ${a.percent.toFixed(0)} | ${b.percent.toFixed(0)} | ${b.spacePercent.toFixed(0)} | ${b.filtrationPercent.toFixed(0)} | ${b.spacePercent >= b.filtrationPercent ? 'space' : 'filter'} | ${top ? `${top.n} ${top.name} ${(top.share * 100).toFixed(0)} %` : ''} |\n`;
      }
      const s = [...maxes].sort((p, q) => p - q), med = s[s.length >> 1];
      md += `\n${s.length} lists. Median at the published max ${med.toFixed(0)} %; over 100 %: ${s.filter(x => x > 100).length}; under 50 %: ${s.filter(x => x < 50).length}.\n`;
      const out = new URL('../research/expert-stockings.md', import.meta.url), old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
      fs.writeFileSync(out, md + (old.includes('## Findings') ? old.slice(old.indexOf('## Findings') - 1) : '')); // hand-written findings survive a rerun
    });
  }
});
