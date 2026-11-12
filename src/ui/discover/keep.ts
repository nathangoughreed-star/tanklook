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
    b.onclick = () => open(); (bar.querySelector('.tb-main') ?? bar).append(b);
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
  render(); attachFeedbackBars(store);
}

// ---------------------------------------------------------------------------------------------------------------- DQ11: Keep this / Like / Dislike buttons (D10)
// Three icons on an item (selection panel, plant and animal rows), on each category header (Animals, Plants, Hardscape) and on the Discover preview card (the whole design).
//   Keep this  = the existing locks, no new store. Default (D4) = identity + count: a piece keeps its kind, size, pose and look but may MOVE (props KEEP_PROPS); a species keeps its name and count (an exact roster lock).
//                "Pin position" adds `position` to the piece's lock props. A kept piece / species wears a padlock badge; hovering says what is held.
//   Like / Dislike = DQ8 feedback entries (`brief.project.feedback`) at level item / category / design; pressing the same one again takes it back; Keep and Like / Dislike are independent.
//                A short line says what was learned; "what do you like?" (material / count / placement / look) sets the entry's `attr`, only when asked.
import { emptyBrief, projectExtras, setProjectExtras, type Feedback } from '../../scene/brief';
import { feedbackKey, setFeedback } from '../../scene/attrs';
import { isLocked, lockObject, lockRoster, unlockObject, unlockRoster } from '../../scene/locks';

export const KEEP_PROPS: readonly string[] = ['look', 'size', 'pose', 'other'];
export type FbCat = 'stocking' | 'hardscape' | 'plants';
/** What a button group stands for. `item` without `uid` = every piece of that variant (a group row); animals are always by species. */
export type FbScope =
  | { level: 'design'; elements: string[] }
  | { level: 'category'; cat: FbCat }
  | { level: 'item'; cat: FbCat; target: string; uid?: string };
const NOUN: Record<FbCat, string> = { stocking: 'animals', hardscape: 'hardscape pieces', plants: 'plants' };

const pieceCat = (it: Item): FbCat => layerOf(it) === 'plant' ? 'plants' : 'hardscape';
/** The uid'd pieces a scope covers (empty for animals). */
export function piecesOf(T: TankSetup, sc: FbScope): Item[] {
  const its = T.items.filter(i => i.uid);
  if (sc.level === 'design') return its;
  if (sc.cat === 'stocking') return [];
  return its.filter(i => pieceCat(i) === sc.cat && (sc.level === 'category' || (sc.uid ? i.uid === sc.uid : i.variant === sc.target)));
}
/** The species a scope covers. */
export function speciesOfScope(T: TankSetup, sc: FbScope): string[] {
  const all = [...new Set(T.fish.map(f => f.species))];
  if (sc.level === 'design') return all;
  if (sc.cat !== 'stocking') return [];
  return sc.level === 'category' ? all : all.filter(s => s === sc.target);
}
export interface KeepState { state: 'none' | 'some' | 'all'; pinned: boolean; total: number; kept: number; text: string }
const pinnedLock = (T: TankSetup, uid: string) => { const o = locksOf(T).objects.find(x => x.target === uid); return !!o && (!o.props?.length || o.props.includes('position')); };
/** How much of the scope is kept, whether the kept pieces also hold their position, and the hover text saying what is held. */
export function keepState(T: TankSetup, sc: FbScope): KeepState {
  const ps = piecesOf(T, sc), sp = speciesOfScope(T, sc), L = locksOf(T);
  const kp = ps.filter(i => isLocked(T, i.uid!)), ks = sp.filter(s => L.roster.some(r => r.species === s));
  const design = sc.level === 'design', extra = design ? ['tank', 'substrate'].filter(t => isLocked(T, t)).length : 0;
  const total = ps.length + sp.length + (design ? 2 : 0), kept = kp.length + ks.length + extra;
  const pinned = kp.length > 0 && kp.every(i => pinnedLock(T, i.uid!));
  const held = [kp.length ? `${kp.length} piece${kp.length > 1 ? 's' : ''}: kind, size and look stay${pinned ? ' and the position is pinned' : ' (may move)'}` : '', ks.length ? `${ks.length} species: name and count stay` : '', extra ? `${extra} of tank / substrate` : ''].filter(Boolean).join('; ');
  return { state: !kept ? 'none' : kept >= total ? 'all' : 'some', pinned, total, kept, text: kept ? `Kept: ${held}. Press to release.` : design ? 'Keep everything in your design now (pieces, animals, tank, substrate): Discover only adds around it.' : 'Keep this: Discover will not change it.' };
}
/** Keep or release everything the scope covers (one store update, no undo step: a lock is a requirement, not a design edit). Existing locks (and their held values) are left alone. */
export function setKeepFor(store: Store, sc: FbScope, on: boolean) {
  store.update(s => {
    const T = s.tanks[s.active];
    for (const i of piecesOf(T, sc)) { if (on) { if (!isLocked(T, i.uid!)) lockObject(T, i.uid!, [...KEEP_PROPS]); } else unlockObject(T, i.uid!); }
    for (const sp of speciesOfScope(T, sc)) { if (on) { if (!locksOf(T).roster.some(r => r.species === sp)) lockRoster(T, sp, 'exact', T.fish.filter(f => f.species === sp).length || 1); } else unlockRoster(T, sp); }
    if (sc.level === 'design') for (const t of ['tank', 'substrate']) { if (on) { if (!isLocked(T, t)) lockObject(T, t, t === 'tank' ? ['dimensions'] : undefined); } else unlockObject(T, t); }
  }, { history: false });
}
/** Pin position on / off for the kept pieces of the scope: adds / removes `position` in the lock's props (a lock with no props already holds everything). */
export function setPinFor(store: Store, sc: FbScope, on: boolean) {
  store.update(s => {
    const T = s.tanks[s.active];
    for (const i of piecesOf(T, sc)) {
      const o = locksOf(T).objects.find(x => x.target === i.uid); if (!o) continue;
      const base = o.props?.length ? o.props : [...KEEP_PROPS, 'position'];
      const next = on ? [...new Set([...base, 'position'])] : base.filter(p => p !== 'position');
      o.props = next.length ? next : [...KEEP_PROPS];
    }
  }, { history: false });
}

// ---- feedback
const fbOf = (T: TankSetup) => projectExtras(T.brief ?? emptyBrief()).feedback;
/** The parts a scope speaks for: an item = its variant / species; a category = what the design has in it now; the design = the preview's own parts. */
export function fbElements(T: TankSetup, sc: FbScope): string[] {
  if (sc.level === 'design') return sc.elements;
  if (sc.level === 'item') return [sc.target];
  return sc.cat === 'stocking' ? [...new Set(T.fish.map(f => f.species))] : [...new Set(piecesOf(T, sc).map(i => i.variant))];
}
const recOf = (T: TankSetup, sc: FbScope): Omit<Feedback, 'at' | 'v'> =>
  sc.level === 'design' ? { level: 'design', elements: sc.elements } : sc.level === 'category' ? { level: 'category', cat: sc.cat, elements: fbElements(T, sc) } : { level: 'item', cat: sc.cat, target: sc.target, elements: [sc.target] };
/** The entry that stands for the scope: a category by its name alone (its parts move with the design), the others by the full key. */
export function feedbackEntry(list: readonly Feedback[] | undefined, T: TankSetup, sc: FbScope): Feedback | undefined {
  if (sc.level === 'category') return (list ?? []).filter(f => f.level === 'category' && f.cat === sc.cat).sort((a, b) => b.at - a.at)[0];
  const k = feedbackKey(recOf(T, sc)); return (list ?? []).find(f => feedbackKey(f) === k);
}
/** Pure: the list after pressing Like (v 1) or Dislike (-1) on the scope; pressing the value it already has takes it back. */
export function pressFeedback(list: readonly Feedback[] | undefined, T: TankSetup, sc: FbScope, v: 1 | -1): Feedback[] {
  const cur = feedbackEntry(list, T, sc), r = recOf(T, sc);
  const base = sc.level === 'category' ? (list ?? []).filter(f => !(f.level === 'category' && f.cat === sc.cat)) : list;
  return setFeedback(base, { ...r, v: cur?.v === v ? 0 : v });
}
/** The short line after a press: what the generator learned. */
export function learnedText(sc: FbScope, v: 1 | -1 | 0): string {
  if (!v) return 'Feedback taken back.';
  const more = v > 0 ? 'more' : 'fewer';
  if (sc.level === 'design') return `Noted: ${more} designs like this one.`;
  if (sc.level === 'category') return `Noted: ${more} ${NOUN[sc.cat]} like these.`;
  const name = sc.cat === 'stocking' ? (getSpecies(sc.target)?.name ?? sc.target) : (LIBRARY[sc.target]?.label ?? sc.target);
  return `Noted: ${more} ${sc.cat === 'stocking' ? 'animals' : sc.cat === 'plants' ? 'plants' : 'pieces'} like this ${name.toLowerCase()}.`;
}
function writeFeedback(store: Store, fn: (l: Feedback[] | undefined) => Feedback[]) {
  store.update(s => {
    const T = s.tanks[s.active], b = T.brief ?? emptyBrief(), x = projectExtras(b), next = fn(x.feedback), { feedback: _f, ...rest } = x;
    T.brief = setProjectExtras(b, next.length ? { ...rest, feedback: next } : rest);
  }, { kind: 'view', history: false });   // like the coach's progress: not a design edit (no rev bump, so a preview does not go stale; no undo step, no rebuild)
}
/** Press Like / Dislike: writes the entry (or takes it back) and returns the confirmation line. */
export function pressFor(store: Store, sc: FbScope, v: 1 | -1): string {
  const before = feedbackEntry(fbOf(store.tank), store.tank, sc)?.v;
  writeFeedback(store, l => pressFeedback(l, store.tank, sc, v));
  return learnedText(sc, before === v ? 0 : v);
}
export const FB_ATTRS: { attr: NonNullable<Feedback['attr']>; label: string }[] = [{ attr: 'material', label: 'Material' }, { attr: 'count', label: 'Count' }, { attr: 'placement', label: 'Placement' }, { attr: 'style', label: 'Look' }];
/** "What do you like?": sets (or, pressed again, clears) the `attr` of the scope's existing Like. */
export function setLikeAttr(store: Store, sc: FbScope, attr: Feedback['attr']) {
  const cur = feedbackEntry(fbOf(store.tank), store.tank, sc); if (!cur || cur.v !== 1) return;
  writeFeedback(store, l => (l ?? []).map(f => f === cur || (f.at === cur.at && feedbackKey(f) === feedbackKey(cur)) ? (() => { const { attr: _a, ...rest } = f; return f.attr === attr ? rest : { ...rest, attr }; })() : f));
}
/** The whole design's parts for a preview card: its pieces' variants and species. */
export const designElements = (T: TankSetup): string[] => [...new Set([...T.items.map(i => i.variant), ...T.fish.map(f => f.species)])].slice(0, 30);

// ---- DOM: one bar component, mounted on rows, category headers, the selection panels and (by a render hook) the preview card
const HAND = 'M2 7h3v7H2zM6 7l3-5c1.3 0 2 1 1.7 2.3L10.3 6H14a1 1 0 0 1 1 1.2l-1 5.6a1.5 1.5 0 0 1-1.5 1.2H6z';
const PADLOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const UP = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${HAND}" fill="currentColor"/></svg>`;
const DOWN = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="transform:rotate(180deg)"><path d="${HAND}" fill="currentColor"/></svg>`;
/** The bar's markup for a scope (pure over the tank). `asked`: show the "what do you like?" chips (only after the person asked). */
export function barHtml(T: TankSetup, sc: FbScope, asked = false): string {
  const k = keepState(T, sc), cur = feedbackEntry(fbOf(T), T, sc), empty = sc.level === 'category' && !fbElements(T, sc).length;
  const noun = sc.level === 'design' ? 'this design' : sc.level === 'category' ? `the ${NOUN[sc.cat]}` : 'this';
  const btn = (a: string, on: boolean, icon: string, label: string, title: string, dis = false) => `<button type="button" class="dq11-b${on ? ' on' : ''}" data-d="${a}" aria-pressed="${on}" title="${esc(title)}" aria-label="${esc(label)}"${dis ? ' disabled' : ''}>${icon}<span class="dq11-l">${label}</span></button>`;
  let h = `<span class="dq11-bar${k.state !== 'none' ? ' kept' : ''}" role="group" aria-label="Keep, like or dislike ${esc(noun)}" data-sc="${esc(JSON.stringify(sc))}">`
    + btn('keep', k.state !== 'none', PADLOCK, k.state === 'some' ? 'Kept some' : k.state === 'all' ? 'Kept' : 'Keep this', k.total ? k.text : 'Nothing here to keep yet.', !k.total)
    + btn('like', cur?.v === 1, UP, 'Like', cur?.v === 1 ? 'Liked: press again to take it back' : `Like ${noun}: more like it in later designs`, empty)
    + btn('dislike', cur?.v === -1, DOWN, 'Dislike', cur?.v === -1 ? 'Disliked: press again to take it back' : `Dislike ${noun}: fewer like it in later designs`, empty);
  if (sc.level !== 'design' && piecesOf(T, sc).some(i => isLocked(T, i.uid!))) h += `<button type="button" class="dq11-pin${k.pinned ? ' on' : ''}" data-d="pin" aria-pressed="${k.pinned}" title="${k.pinned ? 'Position is held too: press to let it move again' : 'Also hold the exact position (by default a kept piece may move)'}">Pin position</button>`;
  if (cur?.v === 1 && asked) h += `<span class="dq11-what" role="group" aria-label="What do you like?">${FB_ATTRS.map(a => `<button type="button" class="dq11-chip${cur.attr === a.attr ? ' on' : ''}" data-d="attr" data-attr="${a.attr}" aria-pressed="${cur.attr === a.attr}">${a.label}</button>`).join('')}</span>`;
  else if (cur?.v === 1) h += '<button type="button" class="dq11-ask" data-d="ask" title="Say what you like about it">What do you like?</button>';
  return h + '</span>';
}

let toastEl: HTMLElement | undefined, toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'dq11-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl?.classList.remove('show'), 3500);
}

type ScopeSrc = FbScope | (() => FbScope | undefined);
type Host = HTMLElement & { _dq11?: ScopeSrc };
/** Draw a bar into `host` (also for DQ10's preview card: `mountBar(host, store, {level:'design', elements: designElements(preview.after)})`). It refreshes itself on every store change while the bars are attached (`attachFeedbackBars`). */
export function mountBar(host: HTMLElement, store: Store, sc: ScopeSrc) {
  host.classList.add('dq11-host'); (host as Host)._dq11 = sc;
  refreshBar(host, store);
}
const asking = new Set<string>();   // scopes whose "what do you like?" chips are open (session only)
function refreshBar(host: HTMLElement, store: Store) {
  const f = (host as Host)._dq11, sc = typeof f === 'function' ? f() : f;
  host.innerHTML = sc ? barHtml(store.tank, sc, asking.has(JSON.stringify(sc))) : '';
}
let wired: Store | undefined;
/** Mounts the bars on the page (category headers, plant and animal rows, the selection panels) and wires every `.dq11-host` once. */
export function attachFeedbackBars(store: Store) {
  if (wired === store) return; wired = store;
  const all = () => document.querySelectorAll<HTMLElement>('.dq11-host');
  document.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.dq11-bar [data-d]'); if (!b || (b as HTMLButtonElement).disabled) return;
    const host = b.closest<HTMLElement>('.dq11-host')!, bar = b.closest<HTMLElement>('.dq11-bar')!, sc = JSON.parse(bar.dataset.sc!) as FbScope;
    e.stopPropagation();
    switch (b.dataset.d) {
      case 'keep': setKeepFor(store, sc, keepState(store.tank, sc).state === 'none'); break;
      case 'pin': setPinFor(store, sc, !keepState(store.tank, sc).pinned); break;
      case 'like': toast(pressFor(store, sc, 1)); break;
      case 'dislike': toast(pressFor(store, sc, -1)); break;
      case 'ask': asking.add(JSON.stringify(sc)); refreshBar(host, store); break;
      case 'attr': setLikeAttr(store, sc, b.dataset.attr as Feedback['attr']); toast('Noted what you like about it.'); break;
    }
    all().forEach(h => refreshBar(h, store));
  }, true);
  const sync = () => {
    for (const [tab, cat] of [['animals', 'stocking'], ['plants', 'plants'], ['hardscape', 'hardscape']] as const) {   // category headers: next to each section's Discover button
      const box = document.querySelector<HTMLElement>(`details.sec[data-sec="${SEC[tab]}"] .dxkeepbox`);
      if (box && !box.querySelector(':scope > .dq11-cat')) { const h = document.createElement('span'); h.className = 'dq11-cat'; box.querySelector('.dxbtn')?.after(h); mountBar(h, store, { level: 'category', cat }); }
    }
    document.querySelectorAll<HTMLElement>('#plantList .pr, #plantList .pg').forEach(r => {   // plant rows and group rows
      if (r.querySelector(':scope > .dq11-row')) return;
      let sc: FbScope | undefined;
      if (r.classList.contains('pr')) { const it = store.tank.items.find(q => q.id === +r.dataset.id!); if (it) sc = { level: 'item', cat: 'plants', target: it.variant, uid: it.uid }; }
      else { const nm = (r.querySelector('.nm')?.textContent ?? '').replace(/ cluster$/, ''), g = store.tank.items.find(q => pieceCat(q) === 'plants' && (LIBRARY[q.variant]?.label ?? q.variant) === nm); if (g) sc = { level: 'item', cat: 'plants', target: g.variant }; }
      if (!sc) return;
      const h = document.createElement('span'); h.className = 'dq11-row'; mountBar(h, store, sc); r.append(h);
    });
    document.querySelectorAll<HTMLElement>('#list .sr[data-sp]').forEach(r => {   // animal rows
      if (r.querySelector(':scope > .dq11-row')) return;
      const h = document.createElement('span'); h.className = 'dq11-row'; mountBar(h, store, { level: 'item', cat: 'stocking', target: r.dataset.sp!.split('~')[0] }); r.append(h);
    });
    const pick: Record<string, () => FbScope | undefined> = {   // the selection panels: a piece (itemBox), an animal (selBox)
      itemBox: () => { const it = store.selectedItem; return it ? { level: 'item', cat: pieceCat(it), target: it.variant, uid: it.uid } : undefined; },
      selBox: () => { const f = store.selected; return f ? { level: 'item', cat: 'stocking', target: f.species } : undefined; },
    };
    for (const id of Object.keys(pick)) {
      const box = document.getElementById(id);
      if (box && !box.querySelector(':scope > .dq11-sel')) { const h = document.createElement('div'); h.className = 'dq11-sel'; box.prepend(h); mountBar(h, store, pick[id]); }
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSig = '', wantFull = false;
  const later = (full: boolean) => { wantFull ||= full; if (!timer) timer = setTimeout(() => {
    timer = undefined; sync(); const full = wantFull; wantFull = false;
    const sig = JSON.stringify([store.tank.locks, store.tank.brief?.project?.feedback, store.selected?.id, store.selectedItem?.id, store.tank.items.length, store.tank.fish.length]);   // camera orbits emit too: redraw only when something a bar shows changed
    if (full && sig !== lastSig) { lastSig = sig; all().forEach(h => refreshBar(h, store)); }
  }, 60); };
  store.subscribe(() => later(true));
  new MutationObserver(() => later(false)).observe(document.body, { childList: true, subtree: true });
  sync();
}
