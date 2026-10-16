// The "Setup sheet" page (lane SH): a clean printable list of what the current tank needs, over the app. Print uses the
// browser's print dialog (style.css hides everything else); Download writes .txt or .csv. All inline, so it works in the
// single-file build and offline.
import { BAG_L, buildSheet, defaultBagL, sheetCsv, sheetText } from '../scene/setupsheet';
import type { Store } from '../scene/store';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank';

export function attachSetupSheet(store: Store, button: HTMLElement) {
  let host: HTMLElement | null = null, bagL: number | undefined, last = '';
  const close = () => { host?.remove(); host = null; document.body.classList.remove('sheet-open'); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const save = (text: string, type: string, ext: string) => {
    const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
    a.href = url; a.download = `${slug(store.scene.name)}-setup.${ext}`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const render = () => {
    if (!host) return;
    const sc = store.scene, S = sc.tanks[sc.active] ?? sc.tanks[0], metric = sc.units === 'cm';
    const sheet = buildSheet(sc, sc.active, { bagL }), def = defaultBagL(S);
    const shown = (bagL ?? def) / (metric ? 1 : 0.946353);
    host.querySelector<HTMLElement>('.sheetPage')!.innerHTML =
      `<h1>${esc(sheet.title)}</h1><p class="sheetSub">Setup sheet${sc.tanks.length > 1 ? ` · tank ${'AB'[sc.active]}` : ''}</p>` +
      sheet.sections.map(x => `<h2>${esc(x.title)}</h2><table>${x.rows.map(r =>
        `<tr><th scope="row">${esc(r.item)}</th><td class="q">${esc(r.qty)}</td><td>${esc(r.detail)}</td></tr>`).join('')}</table>`).join('') +
      `<p class="sheetNote">${esc(sheet.note)}</p>`;
    const inp = host.querySelector<HTMLInputElement>('#sheetBag')!;
    if (document.activeElement !== inp) inp.value = String(+shown.toFixed(1));
    host.querySelector<HTMLElement>('#sheetBagU')!.textContent = metric ? 'L' : 'qt';
    last = JSON.stringify(sheet);
  };
  button.addEventListener('click', () => {
    if (host) return;
    host = document.createElement('div'); host.id = 'sheetView';
    host.innerHTML = `<div class="sheetBar"><b>Setup sheet</b>
      <label title="Loose substrate in one bag. The bag counts below are worked out from this (about ${BAG_L.aquarium.toFixed(1)} L / ${BAG_L.terra.toFixed(1)} L are assumed).">Bag size <input id="sheetBag" type="number" min="0.5" step="0.5" inputmode="decimal"> <span id="sheetBagU"></span></label>
      <span class="sp"></span><button id="sheetPrint">Print</button><button id="sheetTxt">.txt</button><button id="sheetCsv">.csv</button><button id="sheetClose">Close</button></div>
      <div class="sheetPage" role="document"></div>`;
    document.body.append(host); document.body.classList.add('sheet-open'); document.addEventListener('keydown', onKey);
    const $ = (id: string) => host!.querySelector<HTMLElement>(id)!;
    $('#sheetClose').onclick = close;
    $('#sheetPrint').onclick = () => window.print();
    $('#sheetTxt').onclick = () => save(sheetText(buildSheet(store.scene, store.scene.active, { bagL })), 'text/plain', 'txt');
    $('#sheetCsv').onclick = () => save(sheetCsv(buildSheet(store.scene, store.scene.active, { bagL })), 'text/csv', 'csv');
    ($('#sheetBag') as HTMLInputElement).oninput = e => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      bagL = v > 0 ? v * (store.scene.units === 'cm' ? 1 : 0.946353) : undefined; render();
    };
    render();
  });
  store.subscribe(() => { if (host) render(); });
  void last;
}
