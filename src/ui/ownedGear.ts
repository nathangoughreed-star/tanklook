// "Starting from something I have now" (Nathan 2026-10-29; ported onto Guided by lane R9): the start path for someone with gear in hand. One sheet that stays open until
// every ticked item is answered: tick what you have; ticking Tank opens the tank menu, and Light, Heater and Filter open their
// own pick list (the exact product, or "Not sure, use a generic one"). Each answer is applied to the tank as it is made, so the
// tank behind the sheet is the one being described. Done stays off until each ticked item has an answer.
import { filtersNear, genericHeaterW, heatersNear, lightProduct, lightsFor, productName } from '../data/gearCatalog';
import { applyLightProduct } from '../scene/lightproduct';
import { feedFor, heatLoss, techOf, withUnits, type FilterUnit, type HeaterUnit } from '../scene/tech';
import { volume } from '../scene/physics';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { clearItem, setItem, valueOf, type Brief } from '../scene/brief';
import { editBrief, getBrief, ownedKeys, setOwnedKey } from './setupBrief';
import { setNeedStand } from './guided/steps';

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
}
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
  // heater: unticked = none; generic = sized to the tank's heat loss
  const heaters: HeaterUnit[] = !s.on.has('heater') || s.heater === undefined ? [] : s.heater === GENERIC
    ? [{ w: genericHeaterW(heatLoss(S, t).needW), owned: true }] : [{ product: s.heater, owned: true }];
  t = withUnits(t, 'heater', heaters);
  const filters: FilterUnit[] = !s.on.has('filter') || !s.filterKind || s.filter === undefined ? []
    : [{ kind: s.filterKind, ...(s.filter !== GENERIC ? { product: s.filter } : {}), owned: true }];
  t = withUnits(t, 'filter', filters);
  S.tech = t;
  if (S.water.on) S.grow.feed = feedFor(S);
}

/** The owned tank in the brief (lane GV9): `constraints.existingTank`, the item an existing tank is recorded with everywhere else (Suggest, the report,
 *  the animal screen), locked: the library model, or {} for a custom size. It replaces a picked tank. No tank = cleared. */
export const recordOwnedTank = (b: Brief, S: Pick<TankSetup, 'product'> | undefined): Brief =>
  S ? setItem(clearItem(b, 'equipment.tank'), 'constraints.existingTank', S.product ? { model: S.product.model } : {}, 'locked') : clearItem(b, 'constraints.existingTank');
export interface OwnedHost { pickTank: (done: (name: string) => void) => void; status: (m: string, bad?: boolean) => void }
/** Draw the owned-gear sheet into `root` (a dialog body, or the Guided "What you have" step). `done` adds a Done button (the dialog); a step has its own Next instead. */
export function mountOwnedSheet(store: Store, o: OwnedHost, root: HTMLElement, opts: { title?: boolean; done?: () => void; state?: OwnedState } = {}) {
  const st = opts.state ?? emptyOwned();
  const apply = () => store.edit(S => applyOwned(S, st), { coalesce: 'owned' });
  const ownTank = (on: boolean) => editBrief(b => recordOwnedTank(b, on ? store.tank : undefined));
  const tankPicked = (n: string) => { st.tank = n; apply(); ownTank(true); draw(); };
  const sel = (id: string, cur: string | undefined, first: string, list: [string, string][]) =>
    `<select id="${id}" aria-label="${esc(first)}"><option value=""${cur === undefined ? ' selected' : ''} disabled>${esc(first)}</option><option value="${GENERIC}"${cur === GENERIC ? ' selected' : ''}>Not sure: use a generic one</option>${list.map(([v, l]) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const picker = (id: OwnedItem): string => {
    const S = store.tank;
    if (id === 'tank') return `<button type="button" data-own="tank">${st.tank ? 'Change tank…' : 'Choose your tank…'}</button> <b>${st.tank ? esc(st.tank) : '<i>not chosen yet</i>'}</b>`;
    if (id === 'light') {
      const fits = lightsFor(S.tank.L);
      return sel('ownLight', st.light, 'Pick your light…', fits.map(p => [p.id, `${productName(p)} · ${p.watts} W${usd(p.priceUsd)}`]));
    }
    if (id === 'heater') {
      const w = heatLoss(S, techOf(S)).needW;
      return sel('ownHeater', st.heater, 'Pick your heater…', heatersNear(w, 12).map(h => [h.id, `${productName(h)} · ${h.watts} W${usd(h.priceUsd)}`]));
    }
    const gal = volume(S.tank).gallons;
    const kinds = `<select id="ownFilterKind" aria-label="Filter type"><option value=""${st.filterKind ? '' : ' selected'} disabled>What kind of filter?</option>${FILTER_KINDS.map(([v, l]) => `<option value="${v}"${st.filterKind === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return kinds + (st.filterKind ? ' ' + sel('ownFilter', st.filter, 'Pick your filter…', filtersNear(st.filterKind, gal, 12).map(f => [f.id, `${productName(f)}${f.gph ? ` · ${f.gph} gph` : ''}${usd(f.priceUsd)}`])) : '');
  };
  const draw = () => {
    const missing = ownedMissing(st), name = (id: OwnedItem) => OWNED_ITEMS.find(x => x.id === id)!.label.toLowerCase();
    const b = getBrief(), haveStand = ownedKeys(b).includes('stand'), need = valueOf(b, 'equipment.needStand');
    const yn = (v: boolean | undefined, l: string) => `<button type="button" class="${need === v ? 'on' : ''}" data-stand="${v === undefined ? 'unsure' : v}" aria-pressed="${need === v}">${l}</button>`;
    root.innerHTML = `${opts.title ? '<form method="dialog" class="libhead"><h2 id="ownTitle">What do you already have?</h2><button value="close" aria-label="Close">✕</button></form>' : ''}
      <p class="hint">Tick each thing you own and want to use. Each one opens its list so you can pick the exact product; if you do not know, pick the generic one. Anything you leave unticked is something you still need to buy.</p>
      <div class="ownlist">${OWNED_ITEMS.map(x => `<div class="ownrow"><label class="chk"><input type="checkbox" data-item="${x.id}"${st.on.has(x.id) ? ' checked' : ''}> <b>${x.label}</b> <span class="hint">${x.hint}</span></label>${st.on.has(x.id) ? `<div class="ownpick">${picker(x.id)}</div>` : ''}</div>`).join('')}
      <div class="ownrow"><label class="chk"><input type="checkbox" data-stand-have${haveStand ? ' checked' : ''}> <b>${STAND_ITEM.label}</b> <span class="hint">${STAND_ITEM.hint}</span></label></div></div>
      ${haveStand ? '' : `<div class="ownstand" role="group" aria-label="Do you need a stand?"><b>Do you need a stand?</b> <span class="wgChips">${yn(true, 'Yes')}${yn(false, 'No, it sits on furniture I have')}${yn(undefined, 'Not sure')}</span></div>`}
      ${opts.done ? `<div class="btns"><button type="button" id="ownDone" class="primary"${ownedReady(st) ? '' : ' disabled'}>Done</button>
      <span class="hint">${!st.on.size ? 'Tick at least one thing.' : missing.length ? `Still to choose: ${missing.map(name).join(', ')}.` : ''}</span></div>`
      : missing.length ? `<p class="hint">Still to choose: ${missing.map(name).join(', ')}. You can go on; anything unanswered is priced as still to buy.</p>` : ''}`;
  };
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.hasAttribute('data-stand-have')) { editBrief(b => setOwnedKey(b, 'stand', el.checked)); draw(); return; }
    if (el instanceof HTMLInputElement && el.dataset.item) {
      const id = el.dataset.item as OwnedItem;
      if (el.checked) { st.on.add(id); if (id === 'tank' && !st.tank) { draw(); o.pickTank(tankPicked); return; } }
      else { st.on.delete(id); if (id === 'tank') { delete st.tank; ownTank(false); } delete st[id === 'filter' ? 'filter' : id]; if (id === 'filter') delete st.filterKind; }
    } else if (el.id === 'ownLight') st.light = el.value;
    else if (el.id === 'ownHeater') st.heater = el.value;
    else if (el.id === 'ownFilterKind') { st.filterKind = el.value; delete st.filter; }
    else if (el.id === 'ownFilter') st.filter = el.value;
    else return;
    apply(); draw();
  });
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement, sb = t.closest<HTMLElement>('[data-stand]');
    if (sb) { const v = sb.dataset.stand; editBrief(b => setNeedStand(b, v === 'unsure' ? undefined : v === 'true')); draw(); return; }
    if (t.closest('[data-own="tank"]')) o.pickTank(tankPicked);
    else if (t.id === 'ownDone') opts.done?.();
  });
  draw();
  return { redraw: draw };
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
