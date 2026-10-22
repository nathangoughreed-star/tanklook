// The plan sheet of path 1 (lane P6b, 2026-10-20): a paper-white page over the app (it reuses the setup sheet's page, bar and print rules), worked
// out from the tank as it stands in the editor: the verdict (space and filtration bars, hard truths), the shopping list with the need each item
// serves, the totals, the sales that fit, and the one-line cycle note. Print uses the browser's print dialog; .txt downloads the same text.
import type { Build } from '../scene/builds';
import { planOf, planText, type Level, type Plan } from '../scene/plan';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { getSpecies } from '../data/species';
import { needLine, needsOf } from '../data/careNeeds';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank';
const MARK: Record<Level, string> = { ok: '✓', warn: '!', bad: '✕' };

/** The animals' essential care conditions (data/careNeeds.ts), one line each, evaluated apart from the group count and the space verdict. */
export function planNeeds(S: TankSetup): { severity: string; text: string }[] {
  const ids = [...new Set(S.fish.map(f => f.species))];
  return ids.flatMap(id => needsOf(id).map(n => ({ severity: n.severity, text: `${getSpecies(id)?.name ?? id}: ${needLine(n)}` })));
}
/** The plan as text with the care needs after the verdict lines. */
export const planTextWithNeeds = (p: Plan, needs: { text: string }[]) => needs.length ? planText(p).replace(/\n\nShopping list/, `\n${needs.map(n => `  ? ${n.text}`).join('\n')}\n\nShopping list`) : planText(p);

const bar = (label: string, pct: number) => `<div class="planBar"><span>${label}</span><div><i class="${pct > 100 ? 'bad' : pct > 85 ? 'warn' : 'ok'}" style="width:${Math.min(100, pct)}%"></i></div><b>${pct}%</b></div>`;

export function planHtml(p: Plan, needs: { severity: string; text: string }[] = []): string {
  const needRows = p.rows.map(r => `<tr class="${r.kind}"><th scope="row">${esc(r.item)}${r.kind === 'extra' ? ' <em>(not needed)</em>' : ''}</th><td class="q">${usd(r.usd)}</td><td>${esc(r.serves)}</td></tr>`).join('');
  return `<h1>${esc(p.title)}</h1><p class="sheetSub">${esc(p.tank)}: ${esc(p.animals.join(', '))}</p>
<h2>Does it fit?</h2>
<p class="planVerdict ${p.fits ? needs.length ? 'warn' : 'ok' : 'bad'}"><b>${p.fits ? needs.length ? 'It fits the tank, with care needs to confirm.' : 'Yes, it fits.' : 'Not yet.'}</b></p>
${bar('Water column', p.waterPct)}${bar('Floor', p.floorPct)}${bar('Filtration', p.filtrationPct)}
<ul class="planTruths">${p.verdict.slice(2).map(v => `<li class="${v.level}"><b>${MARK[v.level]}</b> ${esc(v.text)}${v.more?.length ? `<ul class="planMore">${v.more.map(m => `<li>also: ${esc(m)}</li>`).join('')}</ul>` : ''}</li>`).join('')}${p.missing.map(m => `<li class="bad"><b>${MARK.bad}</b> ${esc(m)}</li>`).join('')}</ul>
${needs.length ? `<h3>Care needs the tool cannot check</h3><ul class="planTruths">${needs.map(n => `<li class="${n.severity === 'S3' ? 'bad' : 'warn'}"><b>?</b> ${esc(n.text)}</li>`).join('')}</ul>` : ''}
<h2>What to buy, and why</h2>
<table>${needRows}</table>
<h2>What it costs</h2>
<table><tr><th scope="row">Set-up</th><td class="q">${usd(p.setupUsd)}</td><td>once, with the sales below that fit</td></tr>
<tr><th scope="row">Each month</th><td class="q">${usd(p.upkeepUsdMo)}</td><td>food, salt or supplies, power, replacing what dies</td></tr>
<tr><th scope="row">Your time</th><td class="q">${p.minPerWeek} min</td><td>a week, once it is running</td></tr></table>
${p.deals.length ? `<h2>Sales that fit</h2><ul class="planDeals">${p.deals.map(d => `<li>${esc(d.text)}</li>`).join('')}</ul>` : ''}
<p class="planCycle"><b>${esc(p.cycleNote)}</b></p>
<p class="sheetNote">Prices are expected costs from the listings the tool tracks; the limits come from its stocking model (good to about a factor of two, not a promise).</p>`;
}

export function attachPlanSheet(store: Store) {
  let host: HTMLElement | null = null, build: Build | undefined;
  const close = () => { host?.remove(); host = null; document.body.classList.remove('sheet-open'); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const setup = () => store.scene.tanks[store.scene.active] ?? store.scene.tanks[0];
  const current = () => planOf(setup(), build, undefined, store.scene.units);
  const save = (text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' })), a = document.createElement('a');
    a.href = url; a.download = `${slug(store.scene.name)}-plan.txt`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const render = () => { if (host) host.querySelector<HTMLElement>('.sheetPage')!.innerHTML = planHtml(current(), planNeeds(setup())); };
  const open = (b?: Build) => {
    if (host) close();
    build = b;
    host = document.createElement('div'); host.id = 'sheetView'; host.className = 'planView';
    host.innerHTML = `<div class="sheetBar"><b>Your plan</b><span class="grow"></span><button id="planPrint">Print</button><button id="planTxt">.txt</button><button id="planClose">Close</button></div><div class="sheetPage" role="document"></div>`;
    document.body.append(host); document.body.classList.add('sheet-open'); document.addEventListener('keydown', onKey);
    const $ = (id: string) => host!.querySelector<HTMLElement>(id)!;
    $('#planClose').onclick = close; $('#planPrint').onclick = () => window.print(); $('#planTxt').onclick = () => save(planTextWithNeeds(current(), planNeeds(setup())));
    render();
  };
  return { open, close };
}
