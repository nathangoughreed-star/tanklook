// MY EQUIPMENT (lane EQ1, Nathan 2026-11-05: "a totally separate menu for existing equipment that can be accessed at any time" and "everything has a single
// proper home"): THE one place gear in hand is entered. Every other screen (Tech "I own one", the Setup brief button, Suggest, Guided's Equipment step, the
// toolbar and the left-panel entry) only opens it, at an item. The old text, from Nathan 2026-10-29 / lane R9: the start path for someone with gear in hand. One sheet that stays open until
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
import { OWNED, PICK_CARE, PICK_UNKNOWN } from '../demand/suggest';
import { getTankModel } from '../data/tanks';
import { IN } from '../scene/physics';
import { customTankModel, ownedTankList, parseDims, tankLabel } from './guided/logic';
import { editBrief, getBrief, ownedKeys, setNeedStand } from './setupBrief';
import { LIMITS } from '../scene/validate';
import { demandOf } from '../demand/engine';
import { mean3 } from '../demand/range';
import { defaultProfile, type UserProfile } from '../demand/types';
import { fitTable, TABLE_MAX } from '../scene/table';
import type { EquipKey } from '../scene/brief';
import type { OwnedKey } from '../demand/suggest';

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
  /** what the person paid, per item (shown on the cost line, never priced); a key present with no value = cleared */
  paid?: Partial<Record<'light' | 'heater' | 'filter', number | undefined>>;
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

const paidOf = (s: OwnedState, id: 'heater' | 'filter') => s.paid?.[id] !== undefined ? { paidUsd: s.paid[id]! } : {};
/** Apply what the sheet holds to the tank behind it (everything but the tank, which its own picker sets). Idempotent. */
export function applyOwned(S: TankSetup, s: OwnedState) {
  // light: a product, or (generic / unticked) back to the generic fixture
  const lp = s.on.has('light') && s.light && s.light !== GENERIC ? lightProduct(s.light) : undefined;
  if (s.on.has('light') || S.light.product) applyLightProduct(S.light, S.tank, lp);
  // everything ticked and answered here is gear in hand: saved owned (lane GM6 flag), so it prices $0 "you have"; no paid price is asked on this sheet
  if (s.on.has('light') && s.light) { S.light.owned = true; if (s.paid && 'light' in s.paid) { if (s.paid.light !== undefined) S.light.paidUsd = s.paid.light; else delete S.light.paidUsd; } } else { delete S.light.owned; delete S.light.paidUsd; }
  let t = techOf(S);
  // lane GV10 (Coordinator 17, from Nathan's "the tool doesn't assume you need anything until a species needs it"): unticked means "I don't own one",
  // not "I don't want one", so only ticked and answered gear is written; an unticked heater / filter stays inferred and need-driven gear adds it later
  const heater = s.on.has('heater') && s.heater !== undefined, filter = s.on.has('filter') && !!s.filterKind && s.filter !== undefined;
  // heater: generic = sized to the tank's heat loss
  if (heater) t = withUnits(t, 'heater', [s.heater === GENERIC ? { w: genericHeaterW(heatLoss(S, t).needW), owned: true, ...paidOf(s, 'heater') } : { product: s.heater!, owned: true, ...paidOf(s, 'heater') }]);
  if (filter) t = withUnits(t, 'filter', [{ kind: s.filterKind!, ...(s.filter !== GENERIC ? { product: s.filter } : {}), owned: true, ...paidOf(s, 'filter') }]);
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
  // gear marked owned on the scene by an older save or the old Tech checkbox, which the brief never heard of, still shows ticked here (one home reads both)
  if (S) {
    const hu = S.tech ? heaterUnits(S.tech).find(u => u.owned) : undefined, fu = S.tech ? filterUnits(S.tech).find(u => u.owned) : undefined;
    if (S.light.owned && !st.on.has('light')) { st.on.add('light'); st.light = S.light.product ?? GENERIC; }
    if (hu && !st.on.has('heater')) { st.on.add('heater'); st.heater = hu.product ?? GENERIC; }
    if (fu && !st.on.has('filter')) { st.on.add('filter'); st.filter = fu.product ?? GENERIC; st.filterKind = fu.kind; }
    const paid: NonNullable<OwnedState['paid']> = {};
    if (S.light.owned && S.light.paidUsd !== undefined) paid.light = S.light.paidUsd;
    if (hu?.paidUsd !== undefined) paid.heater = hu.paidUsd;
    if (fu?.paidUsd !== undefined) paid.filter = fu.paidUsd;
    if (Object.keys(paid).length) st.paid = paid;
  }
  if (st.on.has('filter') && !st.filterKind) st.filterKind = (S && filterUnits(techOf(S)).find(u => u.owned)?.kind) || undefined;
  st.use = use;
  return st;
}
/** The things the person has, as one line for the shortcuts (Suggest, the left-panel entry): "Tank, heater, filter, test kit". No copy of the controls, just the facts. */
export function ownedNames(b: Brief, S?: TankSetup): string[] {
  const st = ownedStateOf(b, S), out: string[] = [];
  for (const { id, label } of OWNED_ITEMS) if (st.on.has(id)) out.push(label);
  if (ownedKeys(b).includes('stand')) out.push('Stand or furniture');
  const owned = valueOf(b, 'constraints.owned') ?? {};
  for (const g of MORE_GROUPS) for (const k of g.ids) if (owned[k] !== undefined) out.push(OWNED.find(o => o.id === k)!.label);
  return out;
}
export function equipmentSummary(b: Brief, S?: TankSetup): string {
  const n = ownedNames(b, S);
  return n.length ? `You have: ${n.join(', ')}.` : 'Nothing listed yet: everything is priced as still to buy.';
}
/** The person's own furniture is the existing `table` style (`stand.table` L x D, `stand.height` floor to the tank bottom, all mm): this writes it onto the
 *  tank. Nothing here draws a stand. The table code never lets the tank overhang its top (`fitTable` grows a top that is too small): the result says when the
 *  top asked for was grown, so the menu can tell the person instead of silently using another size. */
export interface FurniturePatch { mode?: 'stand' | 'table'; shape?: 'rect' | 'round'; L?: number; D?: number; H?: number }
export function applyFurniture(S: TankSetup, p: FurniturePatch): { grew: boolean } {
  const sd = S.stand, tb = sd.table;
  if (p.mode === 'table') sd.style = 'table'; else if (p.mode === 'stand' && (sd.style === 'table' || sd.style === 'custom')) sd.style = 'cabinet';
  if (p.shape) { tb.shape = p.shape; if (p.shape === 'round') tb.D = tb.L = Math.max(tb.L, tb.D); if (sd.style !== 'custom') sd.style = 'table'; }
  if (p.L !== undefined) { tb.L = Math.min(p.L, TABLE_MAX); if (tb.shape === 'round') tb.D = tb.L; if (sd.style !== 'custom') sd.style = 'table'; }
  if (p.D !== undefined) { tb.D = Math.min(p.D, TABLE_MAX); if (sd.style !== 'custom') sd.style = 'table'; }
  if (p.H !== undefined) sd.height = Math.max(LIMITS.stand[0], Math.min(LIMITS.stand[1], p.H));
  sd.show = true; sd.need = 'added';
  const askL = p.L !== undefined ? tb.L : undefined, askD = p.D !== undefined && tb.shape === 'rect' ? tb.D : undefined;
  fitTable(S);
  return { grew: (askL !== undefined && tb.L > askL) || (askD !== undefined && tb.D > askD) };
}
/** The tank's own set-up gear and furniture still to BUY (the demand rows with a set-up price: anything owned is already $0 there), for the menu's second area. */
export function toBuy(S: TankSetup, P: UserProfile): { key: string; label: string; usd: number }[] {
  return demandOf(S, P).items.filter(i => i.setup && (i.group === 'gear' || i.group === 'tank') && mean3(i.setup) >= 0.5).map(i => ({ key: i.key, label: i.label, usd: Math.round(mean3(i.setup!)) }));
}
export interface OwnedHost { /** the person's profile for the prices in the buy list (the panel's own); absent = defaults */ profile?: () => UserProfile | undefined; pickTank: (done: (name: string) => void) => void; status: (m: string, bad?: boolean) => void }
/** The tank on screen as the outer-ish inches the project state keeps for a tank with no catalogue model. */
const dimsOfTank = (S: TankSetup): DimsIn => ({ L: Math.round(S.tank.L / IN * 10) / 10, D: Math.round(S.tank.D / IN * 10) / 10, H: Math.round(S.tank.H / IN * 10) / 10 });
export interface OwnedSheetOpts {
  title?: boolean; done?: () => void; state?: OwnedState;
  /** Guided Setup's Equipment step: the tank row is a size list plus typed dimensions (no tank dialog, and the tank on screen is left alone: opening Guided never replaces the scene) */
  compactTank?: boolean;
  /** compact tank row: list terrariums instead of aquariums */ land?: boolean;
  /** called after every change has been written (the shell enables Continue from it) */ onChange?: () => void;
  /** a shortcut's item (`tank`, `stand`, `light`, `heater`, `filter` or an OwnedKey): the row is scrolled into view and lit, and ticked when `tick` */
  focus?: string; tick?: boolean;
}
/** The gear with no scene effect beyond a $0 credit in Suggest and the build plan (`constraints.owned`, demand/suggest.ts OWNED): grouped for the menu. */
export const MORE_GROUPS: { label: string; ids: OwnedKey[] }[] = [
  { label: 'More tank gear', ids: ['skimmer', 'flow', 'lid', 'dryheat'] },
  { label: 'Care basics', ids: ['testkit', 'siphon', 'net', 'conditioner', 'thermometer', 'bucket'] },
];
export const MY_EQUIPMENT_IDS: string[] = ['tank', 'stand', 'light', 'heater', 'filter', ...MORE_GROUPS.flatMap(g => g.ids)];
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
  const useBox = (id: EquipKey, label: string): string => {
    const cur = id === 'stand' || id === 'tank' || id === 'light' || id === 'heater' || id === 'filter' ? useOf(st, id) : moreUse(id as OwnedKey), btn = (u: Use, text: string, tip: string) => `<button type="button" class="${cur === u ? 'on' : ''}" data-use="${u}" data-for="${id}" aria-pressed="${cur === u}" title="${esc(tip)}">${text}</button>`;
    return `<span class="gs-use" role="group" aria-label="${esc(label)}: how you want to use it">${btn('available', 'Available', 'Counts toward your savings, but we may suggest something else')}${btn('required', 'Required: I want to use this', 'The design is built around it')}</span>`;
  };
  /** What it cost them (optional, shown on the cost line, never priced): light, heater and filter. */
  const paidBox = (id: 'light' | 'heater' | 'filter'): string => `<label class="gc-paid">Paid (optional) $<input type="number" min="0" step="1" inputmode="decimal" data-paid="${id}" value="${st.paid?.[id] ?? ''}" placeholder="not recorded" aria-label="What you paid for the ${id}"></label>`;
  // ---- the stand row: the tank sits on a stand or cabinet, or on the person's own furniture (the existing `table` style: top L x D and the height to the tank bottom)
  const uname = () => store.scene.units === 'cm' ? 'cm' : 'in', mmPer = () => store.scene.units === 'cm' ? 10 : IN, inUnit = (mm: number) => String(Math.round(mm / mmPer() * 10) / 10);
  let furnNote = '';
  const furnBlock = (): string => {
    const sd = store.tank.stand, table = sd.show && (sd.style === 'table' || sd.style === 'custom'), tb = sd.table;
    const btn = (on: boolean, attr: string, l: string) => `<button type="button" class="${on ? 'on' : ''}" ${attr} aria-pressed="${on}">${l}</button>`;
    const dim = (id: string, v: number, label: string) => `<input id="${id}" type="number" min="1" step="0.5" inputmode="decimal" value="${inUnit(v)}" aria-label="${label} in ${uname()}">`;
    return `<div class="ownfurn" role="group" aria-label="What the tank sits on"><span class="wgChips">${btn(!table, 'data-furn="stand"', 'A stand or cabinet')}${btn(table, 'data-furn="table"', 'A table or other furniture')}</span>`
      + (table ? ` <span class="wgChips">${btn(tb.shape === 'rect', 'data-furnshape="rect"', 'Rectangle')}${btn(tb.shape === 'round', 'data-furnshape="round"', 'Round')}</span><span class="gs-dims">top ${dim('ownFL', tb.L, tb.shape === 'round' ? 'Diameter' : 'Length')}${tb.shape === 'round' ? '' : ` x ${dim('ownFD', tb.D, 'Front to back')}`} ${uname()}, floor to the tank bottom ${dim('ownFH', sd.height, 'Height')} ${uname()}</span>` : '')
      + (furnNote ? `<div class="hint ownwarn" role="status">${esc(furnNote)}</div>` : '') + '</div>';
  };
  const moreUse = (k: OwnedKey): Use => equipmentOf(getBrief()).items.find(i => i.key === k)?.use ?? DEFAULT_OWNED_USE;
  const moreRow = (k: OwnedKey): string => {
    const def = OWNED.find(o => o.id === k)!, pick = (valueOf(getBrief(), 'constraints.owned') ?? {})[k];
    const sel = def.products ? `<select class="ownMorePick" data-k="${k}" aria-label="Which ${esc(def.label.toLowerCase())}"><option value="${PICK_CARE}"${pick === PICK_CARE ? ' selected' : ''}>I have one, any will do</option><option value="${PICK_UNKNOWN}"${pick === PICK_UNKNOWN ? ' selected' : ''}>Not sure</option><optgroup label="From the catalogue">${def.products().map(p => `<option value="${esc(p.id)}"${pick === p.id ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</optgroup></select> ` : '';
    return `<div class="ownrow" data-row="${k}"><label class="chk"><input type="checkbox" data-more="${k}" checked aria-label="Remove ${esc(def.label)}"> <b>${esc(def.label)}</b></label><div class="ownpick">${sel}${useBox(k, def.label)}</div></div>`;
  };
  /** Add one thing to "what I have": the same writes the old tick boxes made. */
  const addItem = (id: string) => {
    if (id === 'tank' || id === 'light' || id === 'heater' || id === 'filter') { st.on.add(id); if (id === 'tank' && !st.tank && !opts.compactTank) { draw(); o.pickTank(tankPicked); return; } }
    else if (id === 'stand') editBrief(b => ownedKeys(b).includes('stand') ? b : setEquipment(b, 'stand', { use: useOf(st, 'stand'), pick: PICK_CARE }));
    else editBrief(b => (valueOf(b, 'constraints.owned') ?? {})[id as OwnedKey] !== undefined ? b : setEquipment(b, id as OwnedKey, { pick: PICK_CARE }));
    opts.onChange?.(); draw();
  };
  const buyHtml = (): string => {
    let rows: { key: string; label: string; usd: number }[] = [];
    try { rows = toBuy(store.tank, o.profile?.() ?? defaultProfile()); } catch { /* nothing priced yet */ }
    const total = rows.reduce((t, r) => t + r.usd, 0);
    return rows.length ? `<ul class="ownbuy">${rows.map(r => `<li><span>${esc(r.label)}</span><b>$${r.usd}</b></li>`).join('')}</ul><p class="hint">About <b>$${total}</b> for this gear and furniture, before animals, plants and tax. Anything you own and use (the area above) is $0.</p>` : '<p class="hint">Nothing left to buy for the gear and furniture.</p>';
  };
  const focusId = opts.focus;
  const lightFocus = () => {
    if (!focusId) return;
    const row = root.querySelector<HTMLElement>(`[data-row="${focusId}"]`);
    if (row) { row.classList.add('ownfocus'); row.scrollIntoView?.({ block: 'nearest' }); }
  };
  const draw = () => {
    const missing = ownedMissing(st), name = (id: OwnedItem) => OWNED_ITEMS.find(x => x.id === id)!.label.toLowerCase();
    const b = getBrief(), haveStand = ownedKeys(b).includes('stand'), need = valueOf(b, 'equipment.needStand'), owned = valueOf(b, 'constraints.owned') ?? {};
    const yn = (v: boolean | undefined, l: string) => `<button type="button" class="${need === v ? 'on' : ''}" data-stand="${v === undefined ? 'unsure' : v}" aria-pressed="${need === v}">${l}</button>`;
    const paidFor = (id: OwnedItem) => id === 'light' || id === 'heater' || id === 'filter' ? paidBox(id) : '';
    const coreRow = (x: typeof OWNED_ITEMS[number]) => `<div class="ownrow" data-row="${x.id}"><label class="chk"><input type="checkbox" data-item="${x.id}" checked aria-label="Remove ${x.label}"> <b>${x.label}</b> <span class="hint">${x.hint}</span></label><div class="ownpick">${picker(x.id)} ${useBox(x.id, x.label)} ${paidFor(x.id)}</div></div>`;
    const standRow = `<div class="ownrow" data-row="stand"><label class="chk"><input type="checkbox" data-stand-have checked aria-label="Remove stand or furniture"> <b>${STAND_ITEM.label} or furniture</b> <span class="hint">${STAND_ITEM.hint}</span></label><div class="ownpick">${useBox('stand', STAND_ITEM.label)}</div>${furnBlock()}</div>`;
    const moreIds = MORE_GROUPS.flatMap(g => g.ids), labelOf = (id: string) => id === 'stand' ? 'Stand or furniture' : OWNED_ITEMS.find(x => x.id === id)?.label ?? OWNED.find(x => x.id === id)?.label ?? id;
    const have = [...OWNED_ITEMS.filter(x => st.on.has(x.id)).map(coreRow), ...(haveStand ? [standRow] : []), ...moreIds.filter(k => owned[k] !== undefined).map(moreRow)];
    const absent = MY_EQUIPMENT_IDS.filter(id => id === 'stand' ? !haveStand : (OWNED_ITEMS.some(x => x.id === id) ? !st.on.has(id as OwnedItem) : owned[id as OwnedKey] === undefined));
    root.innerHTML = `${opts.title ? '<form method="dialog" class="libhead"><h2 id="ownTitle">My equipment</h2><button value="close" aria-label="Close">✕</button></form>' : ''}
      <section class="ownarea" aria-label="What I have and will use"><h3 class="ownh">What I have and will use</h3>
      <p class="hint">Gear you already own and want in this setup. Pick the exact product, or the generic one if you do not know. It is <b>Available</b> (counted at $0, but we may suggest something else) until you tap <b>Required</b>.</p>
      <div class="ownlist">${have.length ? have.join('') : '<p class="hint">Nothing yet. Add what you own below.</p>'}</div>
      ${absent.length ? `<div class="ownadd" role="group" aria-label="Add something I have"><span class="hint">Add something I have:</span> ${absent.map(id => `<button type="button" class="ownchip" data-add="${id}">+ ${esc(labelOf(id))}</button>`).join('')}</div>` : ''}</section>
      <section class="ownarea ownnew" aria-label="What I will buy new"><h3 class="ownh">What I will buy new</h3>
      ${buyHtml()}
      ${haveStand ? '' : `<div class="ownstand" role="group" aria-label="Do you need a stand?"><b>Do you need a stand?</b> <span class="wgChips">${yn(true, 'Yes')}${yn(false, 'No, it sits on furniture I have')}${yn(undefined, 'Not sure')}</span></div>`}</section>
      ${opts.done ? `<div class="btns"><button type="button" id="ownDone" class="primary"${missing.length ? ' disabled' : ''}>Done</button>
      <span class="hint">${missing.length ? `Still to choose: ${missing.map(name).join(', ')}.` : 'Everything is saved as you go.'}</span></div>`
      : missing.length ? `<p class="hint">Still to choose: ${missing.map(name).join(', ')}. You can go on; anything unanswered is priced as still to buy.</p>` : ''}`;
    lightFocus();
  };
  if (opts.focus && opts.tick) addItem(opts.focus);
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.hasAttribute('data-stand-have')) { editBrief(b => el.checked ? setEquipment(b, 'stand', { use: useOf(st, 'stand'), pick: PICK_CARE }) : removeEquipment(b, 'stand')); opts.onChange?.(); draw(); return; }
    if (el instanceof HTMLInputElement && el.dataset.more) {
      const k = el.dataset.more as OwnedKey; editBrief(b => el.checked ? setEquipment(b, k, { use: moreUse(k), pick: PICK_CARE }) : removeEquipment(b, k)); opts.onChange?.(); draw(); return;
    }
    if (el instanceof HTMLSelectElement && el.classList.contains('ownMorePick')) { const k = el.dataset.k as OwnedKey; editBrief(b => setEquipment(b, k, { use: moreUse(k), pick: el.value })); opts.onChange?.(); draw(); return; }
    if (el instanceof HTMLInputElement && el.dataset.paid) {
      const id = el.dataset.paid as 'light' | 'heater' | 'filter', v = parseFloat(el.value.replace(/[$,]/g, ''));
      st.paid = { ...st.paid, [id]: el.value.trim() !== '' && isFinite(v) && v >= 0 ? Math.min(100000, Math.round(v * 100) / 100) : undefined };
      apply(); draw(); return;
    }
    if (el instanceof HTMLInputElement && (el.id === 'ownFL' || el.id === 'ownFD' || el.id === 'ownFH')) {
      const v = parseFloat(el.value); if (!(v > 0)) { draw(); return; }
      const mm = Math.round(v * mmPer()); let grew = false;
      store.edit(S => { grew = applyFurniture(S, el.id === 'ownFL' ? { L: mm } : el.id === 'ownFD' ? { D: mm } : { H: mm }).grew; });
      const tb = store.tank.stand.table;
      furnNote = grew ? `That top is smaller than the tank's base, so it is set to the smallest top that holds it: ${inUnit(tb.L)} x ${inUnit(tb.D)} ${uname()}. Measure again, or use a larger tank on it.` : '';
      draw(); return;
    }
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
    const addb = t.closest<HTMLElement>('[data-add]');
    if (addb) { addItem(addb.dataset.add!); return; }
    const fb = t.closest<HTMLElement>('[data-furn]'), fs = t.closest<HTMLElement>('[data-furnshape]');
    if (fb || fs) {
      furnNote = '';
      store.edit(S => { applyFurniture(S, fb ? { mode: fb.dataset.furn as 'stand' | 'table' } : { shape: fs!.dataset.furnshape as 'rect' | 'round' }); });
      draw(); return;
    }
    const ub = t.closest<HTMLElement>('[data-use]');
    if (ub) {
      const id = ub.dataset.for as EquipKey, u = ub.dataset.use as Use;
      if (id === 'tank' || id === 'light' || id === 'heater' || id === 'filter') { st.use = { ...st.use, [id]: u }; apply(); }
      else { if (id === 'stand') st.use = { ...st.use, stand: u }; editBrief(b => setOwnedUse(b, id, u)); opts.onChange?.(); }
      draw(); return;
    }
    if (t.closest('[data-own="tank"]')) o.pickTank(tankPicked);
    else if (t.id === 'ownDone') opts.done?.();
  });
  draw();
  return { redraw: draw, state: st };
}

/** The My equipment dialog (lane EQ1). `open(at)` is every shortcut's way in: `at` is the item to scroll to and light (and tick, so its list shows). */
export function attachOwnedGear(store: Store, o: OwnedHost) {
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg owndlg'; dlg.setAttribute('aria-labelledby', 'ownTitle');
  document.body.append(dlg);
  // each change is written as it is made, so Esc / the X / Done all keep it; the sheet is a fresh read of the brief and the tank each time it opens
  return {
    open(at?: string) {
      const box = document.createElement('div'); dlg.replaceChildren(box);
      mountOwnedSheet(store, o, box, { title: true, ...(at ? { focus: at, tick: true } : {}), done: () => { dlg.close(); o.status('Your equipment is saved. The cost panel shows what you have at $0 and prices only what you still need.'); } });
      dlg.showModal();
    },
    isOpen: () => dlg.open,
  };
}
