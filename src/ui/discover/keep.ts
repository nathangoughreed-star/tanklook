// Discovery entry points and "Keep this" locks, injected into the left panel's creative sections (lane DX4).
//   a "Discover" button at the top of Tank, Animals, Plants, Hardscape and Substrate (preselecting that tab), and one on the toolbar (all unlocked tabs)
//   a collapsible "Keep this" list per section: pieces (Keep), animal species (Keep exact / at least / species), the substrate (whole), the tank
// Locks bind discovery only; the person's own edits stay free. Everything here is self-contained so panels.ts needs a single call.
import { layerOf, LIBRARY } from '../../scene/items';
import { getSpecies } from '../../data/species';
import { locksOf } from '../../scene/locks';
import { FISH_KEEP_LABEL, fishKeepOf, keptItem, setFishKeep, setKeep, type FishKeep } from './logic';
import type { Store } from '../../scene/store';
import type { Tab } from '../../scene/scope';
import type { Item, TankSetup } from '../../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const SEC: Record<Tab, string> = { tank: 'tank', animals: 'fish', plants: 'plants', hardscape: 'hardscape', substrate: 'substrate' };
const name = (it: Item) => LIBRARY[it.variant]?.label ?? it.variant;

/** The Keep list's markup for one tab (pure). */
export function keepHtml(tab: Tab, T: TankSetup): string {
  const L = locksOf(T), kept = (target: string) => L.objects.some(o => o.target === target);
  if (tab === 'tank') return `<label class="dxk"><input type="checkbox" data-keep="tank"${kept('tank') ? ' checked' : ''}> Keep the tank (size, room, water)</label>`;
  if (tab === 'substrate') return `<label class="dxk"><input type="checkbox" data-keep="substrate"${kept('substrate') ? ' checked' : ''}> Keep the whole substrate (type, ground shape, patches)</label>`;
  if (tab === 'animals') {
    const sp = [...new Set(T.fish.map(f => f.species))];
    if (!sp.length) return '<p class="hint">Add animals to keep some.</p>';
    return sp.map(s => `<div class="dxk${fishKeepOf(T, s) !== 'none' ? ' kept' : ''}"><span>${esc(getSpecies(s)?.name ?? s)} ×${T.fish.filter(f => f.species === s).length}</span><select data-fish="${esc(s)}" aria-label="Keep ${esc(getSpecies(s)?.name ?? s)}">${(Object.keys(FISH_KEEP_LABEL) as FishKeep[]).map(m => `<option value="${m}"${fishKeepOf(T, s) === m ? ' selected' : ''}>${FISH_KEEP_LABEL[m]}</option>`).join('')}</select></div>`).join('');
  }
  const its = T.items.filter(i => (layerOf(i) === 'plant') === (tab === 'plants'));
  if (!its.length) return '<p class="hint">Nothing here to keep yet.</p>';
  return its.map((i, k) => `<label class="dxk${keptItem(T, i) ? ' kept' : ''}"><input type="checkbox" data-uid="${esc(i.uid ?? '')}"${keptItem(T, i) ? ' checked' : ''}> ${esc(name(i))} ${k + 1}</label>`).join('');
}
const signature = (tab: Tab, T: TankSetup) => JSON.stringify([tab, locksOf(T), tab === 'animals' ? T.fish.map(f => f.species) : tab === 'plants' || tab === 'hardscape' ? T.items.map(i => `${i.uid}${i.variant}${layerOf(i)}`) : 0]);

export function attachKeep(store: Store, open: (tab?: Tab) => void) {
  const bar = document.querySelector('.toolbar');
  if (bar && !bar.querySelector('#discoverBtn')) {
    const b = document.createElement('button'); b.id = 'discoverBtn'; b.textContent = 'Discover'; b.title = 'Ask for proposals for the tabs you choose, without touching what you have locked';
    b.onclick = () => open(); bar.querySelector('#guideBtn')?.before(b) ?? bar.append(b);
  }
  const hosts = new Map<Tab, HTMLElement>(), sigs = new Map<Tab, string>();
  for (const tab of Object.keys(SEC) as Tab[]) {
    const sec = document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${SEC[tab]}"]`);
    if (!sec) continue;
    const box = document.createElement('div'); box.className = 'dxkeepbox';
    box.innerHTML = `<button type="button" class="dxbtn" title="Proposals for ${tab} only">Discover</button><details class="dxkeeps"><summary></summary><div class="dxklist"></div></details>`;
    box.querySelector<HTMLButtonElement>('.dxbtn')!.onclick = () => open(tab);
    sec.querySelector('summary')!.after(box); hosts.set(tab, box);
  }
  const render = () => {
    const T = store.tank;
    for (const [tab, box] of hosts) {
      const sig = signature(tab, T); if (sigs.get(tab) === sig) continue; sigs.set(tab, sig);
      const L = locksOf(T), n = tab === 'animals' ? L.roster.length : tab === 'tank' || tab === 'substrate' ? L.objects.filter(o => o.target === tab).length : T.items.filter(i => (layerOf(i) === 'plant') === (tab === 'plants') && keptItem(T, i)).length;
      box.querySelector('summary')!.textContent = n ? `Keep this (${n} kept)` : 'Keep this';
      box.classList.toggle('kept', n > 0);
      const list = box.querySelector<HTMLElement>('.dxklist')!; list.innerHTML = keepHtml(tab, T);
      list.querySelectorAll<HTMLInputElement>('input[data-keep]').forEach(c => c.onchange = () => setKeep(store, c.dataset.keep!, c.checked));
      list.querySelectorAll<HTMLInputElement>('input[data-uid]').forEach(c => c.onchange = () => c.dataset.uid && setKeep(store, c.dataset.uid, c.checked));
      list.querySelectorAll<HTMLSelectElement>('select[data-fish]').forEach(s => s.onchange = () => setFishKeep(store, s.dataset.fish!, s.value as FishKeep));
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  store.subscribe(k => { if (k !== 'view' && k !== 'select' && !timer) timer = setTimeout(() => { timer = undefined; render(); }, 250); });
  render();
}
