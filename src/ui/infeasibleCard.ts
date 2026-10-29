// The "why not" card (lane U4; moved out of ui/suggest.ts by lane NG4): the limiting factor in plain words with the numbers, what the cheapest honest build is made of, and one button per way out.
// Each button edits the brief (locks kept) and the generator re-runs.
import type { Alternative, Infeasible } from '../demand/infeasible';
import type { Brief } from '../scene/brief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export const infeasibleCard = (inf: Infeasible, _brief?: Brief) => {
  const alt = (a: Alternative, i: number) => `<li class="sgAlt" data-kind="${a.kind}"><div>${esc(a.text)}</div>${a.edit ? `<button type="button" class="primary" data-alt="${i}">${esc(a.label)}</button>` : ''}</li>`;
  const lines = inf.cheapest ? `<ul class="bpGear sgCost" aria-label="The cheapest honest build, itemised">${inf.cheapest.lines.map(l => `<li>${esc(l.label)}: ${usd(l.usd)}</li>`).join('')}<li><b>Total ${usd(inf.cheapest.usd)}</b>${inf.cheapest.over ? ` (${usd(inf.cheapest.over)} over)` : ''}</li></ul>` : '';
  return `<div class="sgNone sgWhy" id="sgNone" data-factor="${inf.limitingFactor}"><p class="spWarn"><b>No setup fits all of that.</b> ${esc(inf.text)}</p>${lines}${inf.alternatives.length ? `<b>What would change that</b><ul class="sgAlts">${inf.alternatives.map(alt).join('')}</ul>` : ''}</div>`;
};
