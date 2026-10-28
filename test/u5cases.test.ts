// @ts-nocheck (node:fs / process: the test tsconfig has no node types)
// Lane U5: writes research/audits/u5/*.html (one page per case: the card's four labelled standards, the stated finish note), photographed by headless Chrome. Off unless U5_CASES=1:
//   U5_CASES=1 npx vitest run test/u5cases.test.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { suggestSetups, type Wants } from '../src/demand/suggest';
import { LAYERS, LAYER_BLURB, LAYER_LABEL } from '../src/demand/costlines';

const P = defaultProfile(), NOW = Date.parse('2026-10-27'), cap = (value: number) => ({ on: true, value });
const betta = [{ species: 'betta', n: 1 }];
const CASES: { id: string; title: string; w: Wants; pick: (p: any) => boolean }[] = [
  { id: 'bare150', title: 'Bare / minimal betta, $150 ceiling, filter, heater, lid and light already owned', w: { constraints: { startupUsd: cap(150) }, animals: betta, minimal: true, owned: { filter: 'care', heater: 'care', lid: 'care', light: 'care' } }, pick: () => true },
  { id: 'bare-scratch', title: 'Bare / minimal betta from nothing: the honest floor, no ceiling', w: { constraints: {}, animals: betta, minimal: true }, pick: p => p.strategy === 'economy' },
  { id: 'finished', title: 'Finished betta (the default), no ceiling: display baseline included', w: { constraints: {}, animals: betta }, pick: p => p.build.finish?.tier === 'standard' },
  { id: 'compromise', title: 'A $215 ceiling cannot carry the display baseline: the compromise is stated', w: { constraints: { startupUsd: cap(215) } }, pick: p => p.finishNote?.kind === 'compromise' },
  { id: 'enhanced', title: 'High budget, climb on: the lush finish and its enhancements', w: { constraints: { startupUsd: cap(2500) }, animals: betta, climb: true }, pick: p => p.layers.some(l => l.layer === 'enhance') },
];
describe.skipIf(!process.env.U5_CASES)('u5 cases', () => {
  it('writes the pages', () => {
    mkdirSync('research/audits/u5', { recursive: true });
    const esc = (t: unknown) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!), usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
    for (const c of CASES) {
      const r = suggestSetups(c.w, P, 'in', NOW), p = r.proposals.find(c.pick) ?? r.proposals[0];
      if (!p) { writeFileSync(`research/audits/u5/${c.id}.html`, `<h1>${esc(c.title)}</h1><p>${esc(r.message ?? 'nothing')}</p>`); continue; }
      const blocks = LAYERS.filter(y => y !== 'tax').map(y => {
        const ls = p.costLines.filter(l => (l.layer ?? 'welfare') === y);
        return ls.length ? `<div class="lay ${y}"><div class="lh"><b>${LAYER_LABEL[y]}</b><span>${usd(ls.reduce((t, l) => t + l.usd, 0))}</span></div><div class="lb">${esc(LAYER_BLURB[y])}</div><table>${ls.map(l => `<tr><td>${esc(l.label)}${l.note ? ` <i>(${esc(l.note)})</i>` : ''}</td><td class="n">${usd(l.usd)}</td></tr>`).join('')}</table></div>`
          : (y === 'display' || y === 'enhance') ? `<div class="lay none"><div class="lh"><b>${LAYER_LABEL[y]}</b><span>none included</span></div><div class="lb">${esc(LAYER_BLURB[y])}</div></div>` : '';
      }).join('');
      const tax = p.costLines.filter(l => l.layer === 'tax').map(l => `<tr><td>${esc(l.label)}</td><td class="n">${usd(l.usd)}</td></tr>`).join('');
      writeFileSync(`research/audits/u5/${c.id}.html`, `<!doctype html><meta charset="utf-8"><title>${esc(c.title)}</title><style>
body{font:14px/1.4 system-ui,sans-serif;margin:16px;background:#f4f6f8;color:#1b2430;max-width:560px}h1{font-size:15px;margin:0 0 8px}.card{background:#fff;border:1px solid #d5dbe2;border-radius:10px;padding:12px}
.tag{display:inline-block;background:#1d6fb8;color:#fff;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:600}h2{font-size:16px;margin:8px 0 2px}.sub{color:#566;font-size:12px}.big{font-size:26px;font-weight:700;margin:6px 0}.big span{font-size:12px;font-weight:400;color:#566}
.note{font-size:12px;margin:8px 0;padding:6px 8px;border-radius:6px;background:#eef3f8}.note.compromise{background:#fff3e0;border:1px solid #f0b36a}.lay{border-left:4px solid #888;padding:4px 8px;margin:8px 0;background:#fafbfc}
.lay.welfare{border-color:#c0392b}.lay.complete{border-color:#2d7d46}.lay.display{border-color:#1d6fb8}.lay.enhance{border-color:#8e44ad}.lay.none{opacity:.6}.lh{display:flex;justify-content:space-between}.lb{font-size:11px;color:#566;margin-bottom:2px}
table{width:100%;border-collapse:collapse;font-size:12px}td{padding:1px 0}td.n{text-align:right;white-space:nowrap}ul{font-size:11px;color:#445;padding-left:16px;margin:6px 0 0}</style>
<h1>${esc(c.title)}</h1><div class="card"><span class="tag">${esc(p.strategyLabel)}</span><h2>${esc(p.archetype.title)}</h2><div class="sub">${esc(p.build.tank.name)} · ${esc(p.build.finish?.tier ?? '')} finish</div>
<div class="big">${usd(p.totals.startupUsd)}<span> all-in set-up</span></div>${p.finishNote ? `<div class="note ${p.finishNote.kind}">${esc(p.finishNote.text)}</div>` : ''}${blocks}${tax ? `<table>${tax}</table>` : ''}
<ul>${(p.build.finish?.lines ?? []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`);
    }
  }, 300000);
});
