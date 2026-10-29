// The gear card (lane GM2, 2026-10-29; research/design/gear-model.md sections 4, 5 and 11): one card per piece of gear in a Tech-menu
// row, with three tabs: Generic (sliders for the type's stat block, within gearSpec limits), Library (real products, specs LOCKED,
// "Tune as generic..." copies them into the generic) and I own one (UI only for now). Pure string rendering, no DOM and no store:
// techMenu.ts builds a GearCardSpec per unit and handles the data-gc-* events. Units follow the scene's (US: gph, in, W; metric: L/h, cm).
// TODO(lane G2): "I own one" is session-only UI state in techMenu.ts; G2 adds owned / paidUsd to GearRef and the $0 "you have" cost lines.
import { GEAR_LIMITS, type GearType } from '../scene/gearSpec';

export type GearTab = 'generic' | 'library' | 'own';
export const GEAR_TABS: readonly { id: GearTab; label: string }[] = [{ id: 'generic', label: 'Generic' }, { id: 'library', label: 'Library' }, { id: 'own', label: 'I own one' }];

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const L_PER_GAL = 3.785;

/** Unit display: stored US-style numbers (gph, mm, W) shown per the scene's units ('in' = US customary). */
export const flowText = (gph: number, us: boolean) => us ? `${Math.round(gph)} gph` : `${Math.round(gph * L_PER_GAL)} L/h`;
export const galText = (gal: number, us: boolean) => us ? `${Math.round(gal)} gal` : `${Math.round(gal * L_PER_GAL)} L`;
export const lenText = (mm: number, us: boolean) => us ? `${Math.round(mm / 25.4 * 10) / 10} in` : `${Math.round(mm / 10 * 10) / 10} cm`;
export const wattText = (w: number) => `${Math.round(w * 10) / 10} W`;

/** One generic tunable. Numbers are in the stat's stored unit; `show` formats the current value for the label. */
export interface GearSlider {
  /** the stat this edits (a data-gc-stat value the handler reads) */
  stat: string; label: string; min: number; max: number; step: number; value: number; show: string; tip?: string;
  /** the live label while dragging: `unit` after the number, or `labels[value]` for a stepped slider */
  unit?: string; labels?: string[];
  /** a number box beside the slider that may go past min / max (the usual range only warns, never blocks) */
  typed?: { min: number; max: number };
}
export interface GearStat { label: string; value: string; est?: boolean }
export interface GearLibOption { id: string; label: string }
export interface GearCardSpec {
  /** unique within the menu: 'heater|0', 'filter|1', 'light|0' */
  key: string;
  type: GearType;
  tab: GearTab;
  /** the piece is a catalogue product (its stats are locked) */
  product: boolean;
  sliders: GearSlider[];
  /** shown under the sliders (what the generic stands for, or a welfare range note) */
  genericNote?: string;
  /** the Library tab: products (the first group is "near the size this tank needs"), the current one, its locked stats and what is not published */
  library: { groups: { label: string; options: GearLibOption[] }[]; current?: string; stats: GearStat[]; notes: string[]; link?: string };
  owned: boolean;
}

/** True when `v` of generic stat `stat` of `type` falls outside the usual range: a warning, never a block (design section 2). */
export function outsideLimits(type: GearType, stat: string, v: number): [number, number] | undefined {
  const lim = (GEAR_LIMITS[type] as Record<string, [number, number]> | undefined)?.[stat];
  return lim && (v < lim[0] || v > lim[1]) ? lim : undefined;
}

const tuneBtn = (key: string) => `<button type="button" class="gc-tune" data-gc-tune="${esc(key)}" title="Copy this product's numbers into a generic you can adjust; the product name is dropped">Tune as generic…</button>`;

function genericPane(c: GearCardSpec): string {
  if (c.product) return `<div class="hint">A library product's numbers are locked. To nudge them and see the effect, tune a generic copy.</div>${tuneBtn(c.key)}`;
  let h = '';
  for (const s of c.sliders) {
    const lim = outsideLimits(c.type, s.stat, s.value);
    h += `<div class="gc-slide" title="${esc(s.tip ?? '')}"><label>${esc(s.label)} <b class="gc-val">${esc(s.show)}</b></label>`
      + `<input type="range" data-gc="${esc(c.key)}" data-gc-stat="${s.stat}" min="${s.min}" max="${s.max}" step="${s.step}" value="${Math.min(s.max, Math.max(s.min, s.value))}"${s.unit ? ` data-gc-unit="${esc(s.unit)}"` : ''}${s.labels ? ` data-gc-labels="${esc(JSON.stringify(s.labels))}"` : ''} aria-label="${esc(s.label)}">`
      + (s.typed ? `<input type="number" class="gc-num" data-gc="${esc(c.key)}" data-gc-stat="${s.stat}" min="${s.typed.min}" max="${s.typed.max}" step="${s.step}" value="${s.value}" aria-label="${esc(s.label)} (type a value)">` : '')
      + '</div>';
    if (lim) h += `<div class="hint warn">Outside the usual ${lim[0]}-${lim[1]} range. Allowed, but the welfare checks still apply.</div>`;
  }
  return h + (c.genericNote ? `<div class="hint">${esc(c.genericNote)}</div>` : '');
}

function libraryPane(c: GearCardSpec): string {
  const l = c.library;
  if (!l.groups.some(g => g.options.length)) return '<div class="hint">No catalogued product for this piece.</div>';
  let h = `<select class="gc-pick" data-gc-pick="${esc(c.key)}" aria-label="Library product"><option value="">${c.product ? '(pick another)' : 'Pick a product…'}</option>`
    + l.groups.filter(g => g.options.length).map(g => `<optgroup label="${esc(g.label)}">${g.options.map(o => `<option value="${esc(o.id)}"${o.id === l.current ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</optgroup>`).join('') + '</select>';
  if (!c.product || !l.stats.length) return h;
  h += `<dl class="gc-stats" title="Locked: a real product's numbers cannot be edited">${l.stats.map(s => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}${s.est ? ' <i title="Not published: estimated by the model">est</i>' : ''}</dd></div>`).join('')}</dl>`;
  for (const n of l.notes) h += `<div class="hint">${esc(n)}</div>`;
  if (l.link) h += `<div class="hint"><a href="${esc(l.link)}" target="_blank" rel="noopener">Listing</a></div>`;
  return h + tuneBtn(c.key);
}

function ownPane(c: GearCardSpec): string {
  return `<label class="gc-own"><input type="checkbox" data-gc-own="${esc(c.key)}"${c.owned ? ' checked' : ''}> I already have this one</label>`
    + `<div class="hint">${c.owned ? 'Marked as owned. The price will show $0 "you have" once pricing learns about owned gear; its power and welfare effects count either way.' : 'Tick it if this is gear you already own: it stays in the plan, and its running cost and welfare effect still count.'}</div>`;
}

/** The card's tab strip and the active tab's pane (the wrapper, name and cost line belong to the caller). */
export function gearCard(c: GearCardSpec): string {
  const tabs = GEAR_TABS.map(t => `<button type="button" role="tab" class="gc-tab${t.id === c.tab ? ' on' : ''}" aria-selected="${t.id === c.tab}" data-gc-tab="${esc(c.key)}|${t.id}">${t.label}${t.id === 'own' && c.owned ? ' ✓' : ''}</button>`).join('');
  return `<div class="gear-card" data-gc-card="${esc(c.key)}"><div class="gc-tabs" role="tablist">${tabs}</div><div class="gc-pane" role="tabpanel">`
    + (c.tab === 'generic' ? genericPane(c) : c.tab === 'library' ? libraryPane(c) : ownPane(c)) + '</div></div>';
}

/** The tab a card opens on: the owner's choice, else Library for a product, Generic otherwise. */
export const defaultTab = (product: boolean, chosen?: GearTab): GearTab => chosen ?? (product ? 'library' : 'generic');
