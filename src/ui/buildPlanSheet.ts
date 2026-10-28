// The build plan sheet (lane U7): a paper-white page over the app (the setup sheet's page and print rules), opened from a Suggest card.
// Everything on it comes from demand/buildplan.ts; no model call.
import { buildPlanOf, buildPlanText, type BuildPlan } from '../demand/buildplan';
import type { Proposal } from '../demand/suggest';
import type { UserProfile } from '../demand/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function buildPlanHtml(b: BuildPlan): string {
  const group = (g: BuildPlan['buy'][number]) => `<h3>${esc(g.title)}${g.id === 'have' ? '' : `: ${usd(g.usd)}`}</h3><p class="sheetNote">${esc(g.blurb)}</p><table class="bpBuy" data-group="${g.id}">${g.rows.map((r, i) =>
    `<tr class="${r.owned ? 'own' : ''}"><th scope="row">${g.id === 'have' ? '' : `${i + 1}. `}${esc(r.label)}${r.note ? ` <em>(${esc(r.note)})</em>` : ''}</th><td class="q">${r.owned ? 'you have' : usd(r.usd)}</td></tr>`).join('')}</table>`;
  const c = b.cycling;
  return `<h1>${esc(b.title)}</h1><p class="sheetSub">${b.gallons} gal · ${usd(b.totalUsd)} all in${b.savedUsd ? ` (${usd(b.savedUsd)} less: what you have)` : ''} · ${b.habitat === 'dry' ? 'dry enclosure' : b.habitat === 'salt' ? 'saltwater' : 'freshwater'}</p>
<h2>1. What to buy, in order</h2>${b.buy.map(group).join('')}
<h2>2. Set it up</h2><ol class="bpSteps">${b.setup.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
${c ? `<h2>3. Cycle the tank: ${esc(c.method.toLowerCase())}, ${c.weeks[0]} to ${c.weeks[1]} weeks</h2><p>${esc(c.text)}</p><b>What to test</b><ul>${c.tests.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<h2>3. No cycling needed</h2><p>A dry enclosure has no water to cycle. Run it for 2 days first (see the steps above).</p>'}
${b.stocking.length ? `<h2>4. When to add the animals</h2><table class="bpStock">${b.stocking.map(s => `<tr><th scope="row">${esc(s.week)}</th><td><b>${esc(s.title)}</b>: ${esc(s.animals)}<br>${esc(s.why)}</td></tr>`).join('')}</table>` : ''}
<h2>5. Keep it going</h2><ul class="bpKeep">${b.maintenance.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
<p class="sheetNote">A plan from the data, not advice from a vet or a shop: follow the care needs shown for each animal, and slow down if the tests say so.</p>`;
}

export function openBuildPlan(p: Proposal, P: UserProfile) {
  document.getElementById('sheetView')?.remove();
  const b = buildPlanOf(p, P), host = document.createElement('div');
  host.id = 'sheetView'; host.dataset.kind = 'buildplan';
  host.innerHTML = `<div class="sheetBar"><b>Build plan</b><span class="sp"></span><button id="bpPrint">Print</button><button id="bpTxt">.txt</button><button id="bpClose">Close</button></div><div class="sheetPage" role="document">${buildPlanHtml(b)}</div>`;
  document.body.append(host); document.body.classList.add('sheet-open');
  const close = () => { host.remove(); document.body.classList.remove('sheet-open'); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  host.querySelector<HTMLElement>('#bpClose')!.onclick = close;
  host.querySelector<HTMLElement>('#bpPrint')!.onclick = () => window.print();
  host.querySelector<HTMLElement>('#bpTxt')!.onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buildPlanText(b)], { type: 'text/plain' }));
    a.download = 'build-plan.txt'; a.click(); URL.revokeObjectURL(a.href);
  };
}
