// "Starting from something I have now" (Nathan 2026-10-29; ported onto Guided by lane R9): the start path for someone with gear in hand. One sheet that stays open until
// every ticked item is answered: tick what you have; ticking Tank opens the tank menu, and Light, Heater and Filter open their
// own pick list (the exact product, or "Not sure, use a generic one"). Each answer is applied to the tank as it is made, so the
// tank behind the sheet is the one being described. Done stays off until each ticked item has an answer.
import { FILTER_PRODUCTS, HEATER_PRODUCTS, genericHeaterW, lightProduct, lightsFor, productName } from '../data/gearCatalog';
import { lightGroups, ratedGroups, type GearGroup } from './gearGroups';
import { applyLightProduct } from '../scene/lightproduct';
import { feedFor, filterUnits, heaterUnits, heatLoss, keepSet, techOf, withUnits } from '../scene/tech';
import { volume } from '../scene/physics';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { clearItem, setItem, valueOf, type Brief, type DimsIn, type Use } from '../scene/brief';
import { DEFAULT_OWNED_USE, equipmentOf, removeEquipment, setEquipment, setOwnedUse, galOfDims } from '../scene/project';
import { PICK_CARE } from '../demand/suggest';
import { getTankModel } from '../data/tanks';
import { IN } from '../scene/physics';
import { customTankModel, ownedTankList, parseDims, tankLabel } from './guided/logic';
import { editBrief, getBrief, ownedKeys, setNeedStand } from './setupBrief';

export type OwnedItem = 'tank' | 'light' | 'heater' | 'filter';
export const OWNED_ITEMS: { id: OwnedItem; label: string; hint: string }[] = [
  { id: 'tank', label: 'Tank', hint: 'The glass box itself' },
  { id: 'light', label: 'Light', hint: 'Over the tank or clipped to it' },
  { id: 'heater', label: 'Heater', hint: 'In the water, or inside the filter' },
  { id: 'filter', label: 'Filter', hint: 'Sponge, internal, hang-on-back, canister or sump' },
];
/** The generic answer every item offers (Nathan: "if they don't know, just choose the generic one"). */
export const GENERIC = 'generic';
export interface OwnedState {
  on: Set<OwnedItem>;
  /** the tank picked, as the picker named it (absent = not picked yet) */
  tank?: string;
  /** a product id, or GENERIC; absent = not answered yet */
  light?: string; heater?: string; filter?: string;
  /** the filter's type (tech.json filter option id), asked before its product */
  filterKind?: string;
  /** Guided Setup Rev 03 (lane GS4): Required ("I want to use this") or Available ("I'm flexible") per ticked item, the stand included; absent = Available.
   *  Owning something never makes it Required. */
  use?: Partial<Record<OwnedItem | 'stand', Use>>;
  /** the tank as a catalogue model, or as the outer inches the person measured (the compact tank row; the picker dialog fills both from the tank it left on screen) */
  model?: string; dims?: DimsIn;
}
export const useOf = (s: OwnedState, id: OwnedItem | 'stand'): Use => s.use?.[id] ?? DEFAULT_OWNED_USE;
const answered = (s: OwnedState, id: OwnedItem): boolean => id === 'filter' ? !!s.filterKind && s.filter !== undefined : id === 'tank' ? !!(s.model || s.dims) || s.tank !== undefined : s[id] !== undefined;
export const emptyOwned = (): OwnedState => ({ on: new Set() });
/** What is still unanswered, in the order the sheet lists it ("" none): drives the Done button and its hint. */
export function ownedMissing(s: OwnedState): OwnedItem[] {
  const out: OwnedItem[] = [];
  for (const { id } of OWNED_ITEMS) {
    if (!s.on.has(id)) continue;
    if (id === 'filter' ? !s.filterKind || s.filter === undefined : s[id] === undefined) out.push(id);
  }
  return out;
}
/** The stand is not a tank unit: it is the brief's `constraints.owned.stand`, with "do you need a stand?" in `equipment.needStand` (lane GV1). */
export const STAND_ITEM = { id: 'stand', label: 'Stand', hint: 'The cabinet or table the tank sits on' } as const;
export const ownedReady = (s: OwnedState) => s.on.size > 0 && !ownedMissing(s).length;

const FILTER_KINDS: [string, string][] = [['sponge', 'Sponge filter + air pump'], ['internal', 'Internal filter'], ['hob', 'Hang-on-back filter'], ['canister', 'Canister filter']];
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const usd = (n?: number) => n ? ` · $${Math.round(n)}` : '';

/** Apply what the sheet holds to the tank behind it (everything but the tank, which its own picker sets). Idempotent. */
export function applyOwned(S: TankSetup, s: OwnedState) {
  // light: a product, or (generic / unticked) back to the generic fixture
  const lp = s.on.has('light') && s.light && s.light !== GENERIC ? lightProduct(s.light) : undefined;
  if (s.on.has('light') || S.light.product) applyLightProduct(S.light, S.tank, lp);
  // everything ticked and answered here is gear in hand: saved owned (lane GM6 flag), so it prices $0 "you have"; no paid price is asked on this sheet
  if (s.on.has('light') && s.light) S.light.owned = true; else { delete S.light.owned; delete S.light.paidUsd; }
  let t = techOf(S);
  // lane GV10 (Coordinator 17, from Nathan's "the tool doesn't assume you need anything until a species needs it"): unticked means "I don't own one",
  // not "I don't want one", so only ticked and answered gear is written; an unticked heater / filter stays inferred and need-driven gear adds it later
  const heater = s.on.has('heater') && s.heater !== undefined, filter = s.on.has('filter') && !!s.filterKind && s.filter !== undefined;
  // heater: generic = sized to the tank's heat loss
  if (heater) t = withUnits(t, 'heater', [s.heater === GENERIC ? { w: genericHeaterW(heatLoss(S, t).needW), owned: true } : { product: s.heater!, owned: true }]);
  if (filter) t = withUnits(t, 'filter', [{ kind: s.filterKind!, ...(s.filter !== GENERIC ? { product: s.filter } : {}), owned: true }]);
  const next = keepSet(S, t);
  if (S.tech?.roomC === undefined) delete next.roomC; // techOf's room from the brief stays the brief's
  // a heater / filter this sheet saved before and now unticked goes back to inferred (one set in the Tech menu, not owned, is left alone)
  if (!heater && heaterUnits(next).some(u => u.owned) && heaterUnits(next).every(u => u.owned)) { delete next.rows.heater; delete next.heaters; delete next.heaterW; delete next.heaterProduct; }
  if (!filter && filterUnits(next).some(u => u.owned) && filterUnits(next).every(u => u.owned)) { delete next.rows.filter; delete next.filters; delete next.filterModel; delete next.filterProduct; }
  S.tech = next;
  if (S.water.on) S.grow.feed = feedFor(S);
}

/** The owned tank in the brief (lane GV9): `constraints.existingTank`, the item an existing tank is recorded with everywhere else (Suggest, the report,
 *  the animal screen), locked: the library model, or {} for a custom size. It replaces a picked tank. No tank = cleared. */
export const recordOwnedTank = (b: Brief, S: Pick<TankSetup, 'product'> | undefined, use: Use = 'required'): Brief =>
  S ? setItem(clearItem(b, 'equipment.tank'), 'constraints.existingTank', S.product ? { model: S.product.model } : {}, use === 'required' ? 'locked' : 'preference') : clearItem(b, 'constraints.existingTank');

/** Write what the sheet holds into the one project state (scene/project.ts): each ticked and answered item is owned equipment with its own Required / Available
 *  flag (default Available); an unticked or unanswered one is not recorded (and one the sheet recorded before is taken out). The stand is the brief's own item and
 *  is written by its checkbox. The scene's gear is `applyOwned`'s; the brief only ever carries the facts and the flag. */
export function syncEquipment(b: Brief, s: OwnedState): Brief {
  let out = b;
  for (const { id } of OWNED_ITEMS) {
    const have = equipmentOf(out).items.some(i => i.key === id);
    if (!s.on.has(id) || !answered(s, id)) { if (have) out = removeEquipment(out, id); continue; }
    const use = useOf(s, id);
    if (id === 'tank') out = setEquipment(out, 'tank', { use, ...(s.model ? { model: s.model } : s.dims ? { dimsIn: s.dims } : {}) });
    else out = setEquipment(out, id, { use, pick: s[id] === GENERIC ? PICK_CARE : s[id] });
  }
  return out;
}
/** The sheet's state as the brief and the tank already hold it, so reopening the step (Back, or a revisit from the editor) shows what was said. */
export function ownedStateOf(b: Brief, S?: TankSetup): OwnedState {
  const st = emptyOwned(), use: NonNullable<OwnedState['use']> = {};
  for (const i of equipmentOf(b).items) {
    if (i.key === 'tank') { st.on.add('tank'); use.tank = i.use; if (i.model) st.model = i.model; else if (i.dimsIn) st.dims = i.dimsIn; const m = i.model ? getTankModel(i.model) : undefined; st.tank = m ? tankLabel(m) : i.dimsIn ? customTankModel(i.dimsIn).name : 'your tank'; }
    else if (i.key === 'light' || i.key === 'heater' || i.key === 'filter') { st.on.add(i.key); use[i.key] = i.use; st[i.key] = i.product ?? GENERIC; }
    else if (i.key === 'stand') use.stand = i.use;
  }
  if (st.on.has('filter')) st.filterKind = (S && filterUnits(techOf(S)).find(u => u.owned)?.kind) || undefined;
  st.use = use;
  return st;
}
export interface OwnedHost { pickTank: (done: (name: string) => void) => void; status: (m: string, bad?: boolean) => void }
/** The tank on screen as the outer-ish inches the project state keeps for a tank with no catalogue model. */
const dimsOfTank = (S: TankSetup): DimsIn => ({ L: Math.round(S.tank.L / IN * 10) / 10, D: Math.round(S.tank.D / IN * 10) / 10, H: Math.round(S.tank.H / IN * 10) / 10 });
export interface OwnedSheetOpts {
  title?: boolean; done?: () => void; state?: OwnedState;
  /** Guided Setup's Equipment step: the tank row is a size list plus typed dimensions (no tank dialog, and the tank on screen is left alone: opening Guided never replaces the scene) */
  compactTank?: boolean;
  /** compact tank row: list terrariums instead of aquariums */ land?: boolean;
  /** called after every change has been written (the shell enables Continue from it) */ onChange?: () => void;
}
/** Draw the owned-gear sheet into `root` (a dialog body: the "What you already have" panel). `done` adds a Done button (the dialog). Each ticked item carries
 *  Required / Available (lane GS4, default Available); the sheet starts from what the brief and the tank already say. */
export function mountOwnedSheet(store: Store, o: OwnedHost, root: HTMLElement, opts: OwnedSheetOpts = {}) {
  const st = opts.state ?? ownedStateOf(getBrief(), store.tank);
  let custom = !!st.dims && !st.model;   // the compact tank row shows the typed dimensions
  let draft: { L: string; D: string; H: string } | undefined;   // what is typed in the three boxes, kept while one is still empty
  const apply = () => { store.edit(S => applyOwned(S, st), { coalesce: 'owned' }); editBrief(b => syncEquipment(b, st)); opts.onChange?.(); };
  const tankPicked = (n: string) => { st.tank = n; const S = store.tank; st.model = S.product?.model; st.dims = S.product?.model ? undefined : dimsOfTank(S); apply(); draw(); };
  /** One product select: the "pick" and "generic" options, then the products in `<optgroup>`s (lane GG1: rated range for heaters and filters, tank length for lights). */
  const sel = <T extends { id: string }>(id: string, cur: string | undefined, first: string, groups: GearGroup<T>[], label: (p: T) => string) =>
    `<select id="${id}" aria-label="${esc(first)}"><option value=""${cur === undefined ? ' selected' : ''} disabled>${esc(first)}</option><option value="${GENERIC}"${cur === GENERIC ? ' selected' : ''}>Not sure: use a generic one</option>${groups.filter(g => g.items.length).map(g => `<optgroup label="${esc(g.label)}">${g.items.map(p => `<option value="${esc(p.id)}"${cur === p.id ? ' selected' : ''}>${esc(label(p))}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const tankRow = (): string => {
    if (!opts.compactTank) return `<button type="button" data-own="tank">${st.tank ? 'Change tank…' : 'Choose your tank…'}</button> <b>${st.tank ? esc(st.tank) : '<i>not chosen yet</i>'}</b>`;
    const list = ownedTankList(!!opts.land), d = draft ?? (st.dims ? { L: String(st.dims.L), D: String(st.dims.D), H: String(st.dims.H) } : undefined), v = (n?: string) => n ?? '';
    return `<select id="ownTankModel" aria-label="Your tank"><option value=""${st.model || custom ? '' : ' selected'} disabled>Pick the size…</option>${list.map(m => `<option value="${esc(m.id)}"${st.model === m.id ? ' selected' : ''}>${esc(tankLabel(m))}</option>`).join('')}<option value="custom"${custom ? ' selected' : ''}>A different size…</option></select>`
      + (custom ? ` <span class="gs-dims">outside <input id="ownTL" type="number" min="4" step="0.5" inputmode="decimal" placeholder="long" value="${v(d?.L)}" aria-label="Length in inches"> x <input id="ownTD" type="number" min="4" step="0.5" inputmode="decimal" placeholder="front to back" value="${v(d?.D)}" aria-label="Front to back in inches"> x <input id="ownTH" type="number" min="4" step="0.5" inputmode="decimal" placeholder="tall" value="${v(d?.H)}" aria-label="Height in inches"> in</span>` : '')
      + (st.dims && !st.model ? ` <b>${galOfDims(st.dims)} gal</b>` : '');
  };
  const picker = (id: OwnedItem): string => {
    const S = store.tank;
    if (id === 'tank') return tankRow();
    if (id === 'light') {
      return sel('ownLight', st.light, 'Pick your light…', lightGroups(lightsFor(S.tank.L)), p => `${productName(p)} · ${p.watts} W${usd(p.priceUsd)}`);
    }
    if (id === 'heater') {
      return sel('ownHeater', st.heater, 'Pick your heater…', ratedGroups(HEATER_PRODUCTS, volume(S.tank).gallons, (a, b) => a.watts - b.watts || productName(a).localeCompare(productName(b))), h => `${productName(h)} · ${h.watts} W${usd(h.priceUsd)}`);
    }
    const gal = volume(S.tank).gallons;
    const kinds = `<select id="ownFilterKind" aria-label="Filter type"><option value=""${st.filterKind ? '' : ' selected'} disabled>What kind of filter?</option>${FILTER_KINDS.map(([v, l]) => `<option value="${v}"${st.filterKind === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return kinds + (st.filterKind ? ' ' + sel('ownFilter', st.filter, 'Pick your filter…', ratedGroups(FILTER_PRODUCTS.filter(f => f.kind === st.filterKind), gal, (a, b) => (a.gph ?? 0) - (b.gph ?? 0) || productName(a).localeCompare(productName(b))), f => `${productName(f)}${f.gph ? ` · ${f.gph} gph` : ''}${usd(f.priceUsd)}`) : '');
  };
  /** Required / Available for one ticked item: Available (default) counts toward savings but alternatives may be suggested; Required is built around. */
  const useBox = (id: OwnedItem | 'stand', label: string): string => {
    const cur = useOf(st, id), btn = (u: Use, text: string, tip: string) => `<button type="button" class="${cur === u ? 'on' : ''}" data-use="${u}" data-for="${id}" aria-pressed="${cur === u}" title="${esc(tip)}">${text}</button>`;
    return `<span class="gs-use" role="group" aria-label="${esc(label)}: how you want to use it">${btn('available', 'Available', 'Counts toward your savings, but we may suggest something else')}${btn('required', 'Required: I want to use this', 'The design is built around it')}</span>`;
  };
  const draw = () => {
    const missing = ownedMissing(st), name = (id: OwnedItem) => OWNED_ITEMS.find(x => x.id === id)!.label.toLowerCase();
    const b = getBrief(), haveStand = ownedKeys(b).includes('stand'), need = valueOf(b, 'equipment.needStand');
    const yn = (v: boolean | undefined, l: string) => `<button type="button" class="${need === v ? 'on' : ''}" data-stand="${v === undefined ? 'unsure' : v}" aria-pressed="${need === v}">${l}</button>`;
    root.innerHTML = `${opts.title ? '<form method="dialog" class="libhead"><h2 id="ownTitle">What do you already have?</h2><button value="close" aria-label="Close">✕</button></form>' : ''}
      <p class="hint">Tick each thing you own. Each one opens its list so you can pick the exact product; if you do not know, pick the generic one. Anything you leave unticked is something you still need to buy. A ticked thing is <b>Available</b> (we count it toward your savings, and may suggest something else) until you tap <b>Required</b>.</p>
      <div class="ownlist">${OWNED_ITEMS.map(x => `<div class="ownrow"><label class="chk"><input type="checkbox" data-item="${x.id}"${st.on.has(x.id) ? ' checked' : ''}> <b>${x.label}</b> <span class="hint">${x.hint}</span></label>${st.on.has(x.id) ? `<div class="ownpick">${picker(x.id)} ${useBox(x.id, x.label)}</div>` : ''}</div>`).join('')}
      <div class="ownrow"><label class="chk"><input type="checkbox" data-stand-have${haveStand ? ' checked' : ''}> <b>${STAND_ITEM.label}</b> <span class="hint">${STAND_ITEM.hint}</span></label>${haveStand ? `<div class="ownpick">${useBox('stand', STAND_ITEM.label)}</div>` : ''}</div></div>
      ${haveStand ? '' : `<div class="ownstand" role="group" aria-label="Do you need a stand?"><b>Do you need a stand?</b> <span class="wgChips">${yn(true, 'Yes')}${yn(false, 'No, it sits on furniture I have')}${yn(undefined, 'Not sure')}</span></div>`}
      ${opts.done ? `<div class="btns"><button type="button" id="ownDone" class="primary"${ownedReady(st) ? '' : ' disabled'}>Done</button>
      <span class="hint">${!st.on.size ? 'Tick at least one thing.' : missing.length ? `Still to choose: ${missing.map(name).join(', ')}.` : ''}</span></div>`
      : missing.length ? `<p class="hint">Still to choose: ${missing.map(name).join(', ')}. You can go on; anything unanswered is priced as still to buy.</p>` : ''}`;
  };
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.hasAttribute('data-stand-have')) { editBrief(b => el.checked ? setEquipment(b, 'stand', { use: useOf(st, 'stand'), pick: PICK_CARE }) : removeEquipment(b, 'stand')); opts.onChange?.(); draw(); return; }
    if (el instanceof HTMLInputElement && el.dataset.item) {
      const id = el.dataset.item as OwnedItem;
      if (el.checked) { st.on.add(id); if (id === 'tank' && !st.tank && !opts.compactTank) { draw(); o.pickTank(tankPicked); return; } }
      else { st.on.delete(id); if (id === 'tank') { delete st.tank; delete st.model; delete st.dims; custom = false; } delete st[id === 'filter' ? 'filter' : id]; if (id === 'filter') delete st.filterKind; }
    } else if (el.id === 'ownLight') st.light = el.value;
    else if (el.id === 'ownHeater') st.heater = el.value;
    else if (el.id === 'ownFilterKind') { st.filterKind = el.value; delete st.filter; }
    else if (el.id === 'ownFilter') st.filter = el.value;
    else if (el.id === 'ownTankModel') {
      if (el.value === 'custom') { custom = true; draft = undefined; delete st.model; st.tank = st.dims ? customTankModel(st.dims).name : undefined; }
      else { custom = false; const m = getTankModel(el.value); st.model = el.value; delete st.dims; st.tank = m ? tankLabel(m) : el.value; }
    } else if (el.id === 'ownTL' || el.id === 'ownTD' || el.id === 'ownTH') {
      const v = (id: string) => root.querySelector<HTMLInputElement>('#' + id)?.value ?? '', d = parseDims(v('ownTL'), v('ownTD'), v('ownTH'));
      draft = { L: v('ownTL'), D: v('ownTD'), H: v('ownTH') };
      if (d) { st.dims = d; st.tank = customTankModel(d).name; } else { delete st.dims; delete st.tank; }
    }
    else return;
    apply(); draw();
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement, sb = t.closest<HTMLElement>('[data-stand]');
    if (sb) { const v = sb.dataset.stand; editBrief(b => setNeedStand(b, v === 'unsure' ? undefined : v === 'true')); draw(); return; }
    const ub = t.closest<HTMLElement>('[data-use]');
    if (ub) { const id = ub.dataset.for as OwnedItem | 'stand', u = ub.dataset.use as Use; st.use = { ...st.use, [id]: u }; if (id === 'stand') editBrief(b => setOwnedUse(b, 'stand', u)); apply(); draw(); return; }
    if (t.closest('[data-own="tank"]')) o.pickTank(tankPicked);
    else if (t.id === 'ownDone') opts.done?.();
  });
  draw();
  return { redraw: draw, state: st };
}

export function attachOwnedGear(store: Store, o: OwnedHost) {
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg owndlg'; dlg.setAttribute('aria-labelledby', 'ownTitle');
  document.body.append(dlg);
  // Esc / ✕ before Done keeps what was answered so far; the sheet can be opened again from the start menu (a fresh sheet each time)
  return {
    open() {
      const box = document.createElement('div'); dlg.replaceChildren(box);
      mountOwnedSheet(store, o, box, { title: true, done: () => { dlg.close(); o.status('Your gear is in. Add the rest from the panel; the demand panel prices what you still need.'); } });
      dlg.showModal();
    },
  };
}
