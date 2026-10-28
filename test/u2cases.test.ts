// @ts-nocheck (node:fs / process: the test tsconfig has no node types)
// Lane U2: regenerates research/audits/u2/cases.json (the concepts behind the screenshots, read by research/audits/u2/report.html). Off unless U2_CASES=1:
//   U2_CASES=1 npx vitest run test/u2cases.test.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, type Wants } from '../src/demand/suggest';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const cap = (value: number) => ({ on: true, value });
const CASES: { id: string; title: string; w: Wants }[] = [
  { id: 'low', title: 'Low budget: $350 ceiling, no preferences', w: { constraints: { startupUsd: cap(350) } } },
  { id: 'mid', title: 'Mid budget: $800 ceiling, no preferences', w: { constraints: { startupUsd: cap(800) } } },
  { id: 'high', title: 'High budget: $2,500 ceiling, no preferences', w: { constraints: { startupUsd: cap(2500) } } },
  { id: 'betta', title: 'Locked betta, $600 ceiling, 8.5 % tax (all-in)', w: { constraints: { startupUsd: cap(600) }, animals: [{ species: 'betta', n: 1 }], taxPct: 8.5 } },
  { id: 'cap200', title: '"I have $200 and want something cool": only the ceiling set, nothing else', w: { constraints: { startupUsd: cap(200) } } },
  { id: 'cap200own', title: '$200 ceiling, no preferences, I already have a stand, filter and heater', w: { constraints: { startupUsd: cap(200) }, owned: { stand: 'care', filter: 'care', heater: 'care' } } },
];
describe.skipIf(!process.env.U2_CASES)('u2 cases', () => {
  it('writes cases.json', () => {
    const out = CASES.map(c => {
      const t0 = Date.now(), r = suggestSetups(c.w, P, 'in', NOW), ms = Date.now() - t0;
      return { id: c.id, title: c.title, ms, stats: r.stats, message: r.message, note: r.note, misses: r.misses.map(m => `${m.archetype.title}: ${m.text}`),
        proposals: r.proposals.map(p => ({ strategy: p.strategyLabel, blurb: p.strategyBlurb, tradeoff: p.tradeoff, archetype: p.archetype.title, tank: p.build.tank.name, tier: p.build.finish?.tier, finish: p.build.finish?.lines ?? [], gear: p.build.gear.filter(g => !(p.build.finish?.lines ?? []).includes(g)),
          animals: p.build.animals.map(a => `${a.n} ${a.species}`).join(', '), total: Math.round(p.totals.startupUsd), preTax: p.preTaxUsd, tax: p.taxUsd, under: p.underCeilingUsd, monthly: Math.round(p.totals.monthlyUsd), min: Math.round(p.totals.minPerWeek), lines: p.costLines })) };
    });
    mkdirSync('research/audits/u2', { recursive: true });
    writeFileSync('research/audits/u2/cases.json', JSON.stringify(out, null, 1));
    // one self-contained page per case, photographed by headless Chrome (research/audits/u2/*.png)
    const esc = (t: unknown) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    const usd = (n: number) => '$' + n.toLocaleString('en-US');
    for (const c of out) {
      const cards = c.proposals.map(p => `<div class="card"><div class="tag">${esc(p.strategy)}</div><h2>${esc(p.archetype)}</h2><div class="sub">${esc(p.tank)} · ${esc(p.tier)} finish${p.under !== undefined ? ` · ${usd(p.under)} under the ceiling` : ''}</div>
<div class="big">${usd(p.total)}<span> all-in set-up</span></div><div class="sub">${usd(p.monthly)} a month · ${p.min} min a week</div><p class="blurb">${esc(p.blurb)}</p><p class="blurb"><b>Trade-off:</b> ${esc(p.tradeoff)}</p>
<table>${p.lines.map(l => `<tr><td>${esc(l.label)}</td><td class="n">${l.usd === 0 ? '$0 ' + esc(l.note ?? '') : usd(l.usd)}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="n">${usd(p.total)}</td></tr></table>
<ul>${p.finish.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('');
      writeFileSync(`research/audits/u2/${c.id}.html`, `<!doctype html><meta charset="utf-8"><title>${esc(c.title)}</title><style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#f4f6f8;color:#1b2430}h1{font-size:18px;margin:0 0 4px}.meta{color:#566;margin-bottom:12px}
.row{display:flex;gap:12px;align-items:flex-start}.card{flex:1;background:#fff;border:1px solid #d5dbe2;border-radius:10px;padding:12px;min-width:0}
.tag{display:inline-block;background:#1d6fb8;color:#fff;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:600}h2{font-size:16px;margin:8px 0 2px}.sub{color:#566;font-size:12px}
.big{font-size:26px;font-weight:700;margin:6px 0 0}.big span{font-size:12px;font-weight:400;color:#566}.blurb{font-size:12px;margin:8px 0}table{width:100%;border-collapse:collapse;font-size:12px}
td{padding:2px 0;border-bottom:1px solid #eef}td.n{text-align:right;white-space:nowrap}tr.tot td{font-weight:700;border-top:1px solid #99a}ul{font-size:11px;color:#445;padding-left:16px;margin:8px 0 0}</style>
<h1>${esc(c.title)}</h1><div class="meta">${c.proposals.length} concept(s) chosen from a pool of ${c.stats.pool} valid ones · ${c.stats.rejectedWelfare} candidates turned away by welfare · ${c.ms} ms${c.message ? ' · ' + esc(c.message) : ''}${c.misses.length ? '<br>Closest misses: ' + esc(c.misses.join('; ')) : ''}</div>
<div class="row">${cards}</div>`);
    }
  }, 300000);
});
