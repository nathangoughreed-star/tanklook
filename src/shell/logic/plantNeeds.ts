// PL2 (Nathan 2026-11-17): the Plants workspace's "In this tank" card as a per-species list: the picture, name x count, and what each plant asks
// of the tank (light, CO2, fertiliser) against what the tank has, with a met / not met mark, one overall line, and buttons for what is missing:
// add a CO2 system, add fertiliser, a stronger light, remove these plants, replace the demanding ones with look-alikes that suit the CURRENT tank.
// No second source of truth: the needs are scene/lightneeds NEEDS, the verdicts scene/plantfit (whyNot / outcomeOf: the picker's gate and the
// item panel read the same ones), the tank's light is scene/lightcheck itemLights + lightOut, its care is grow.feed (derived from the Tech rows),
// gear and prices are the Tech row options and gear catalogue the Equipment screen uses. Pure: no DOM.
import { LIBRARY, variantInScope } from '../../scene/items';
import { NEEDS, isCoralNeed, isLand, type CoralNeed, type PlantNeed } from '../../scene/lightneeds';
import { PLANT3D, isFloat } from '../../art/plants';
import { SWAP, fits, outcomeOf } from '../../scene/plantfit';
import { itemLights } from '../../scene/lightcheck';
import { lightOutCached, parBand, wattsOf } from '../../scene/lightout';
import { applyLightProduct } from '../../scene/lightproduct';
import { commitTech, setRowProduct } from '../../scene/techEdit';
import { feedFor, optionCost, optionDef, techOf, withChoice } from '../../scene/tech';
import { co2Option } from '../../scene/setupNeeds';
import { isSalt } from '../../scene/stockEdit';
import { removeItem } from '../../scene/itemEdit';
import { reefOptionProducts, listedPrice, productName, lightProduct, type Co2Product } from '../../data/gearCatalog';
import { lightFor } from '../../demand/needs';
import { grownMm, groupOf } from './plantcards';
import type { GrowFeed, TankSetup } from '../../scene/types';
import type { PriceOf } from './lidTemp';

export type PlantIssue = 'dim' | 'bright' | 'co2' | 'ferts' | 'dosing';
export interface NeedCell { /** what the plant asks: "Medium light", "CO2 needed" */ need: string; /** what this tank has: "tank gives 22 PAR (low)", "none in the tank" */ have: string; met: boolean }
export interface PlantRow {
  variant: string; label: string; n: number; img: string;
  kind: 'plant' | 'coral' | 'artificial' | 'land';
  light: NeedCell | null; co2: NeedCell | null; ferts: NeedCell | null;
  /** a line when the plant needs nothing (artificial, above the water) */
  plain: string;
  met: boolean; issues: PlantIssue[];
  /** the ids of the items of this kind that miss something */
  unmetIds: number[];
}
export interface PlantFix {
  kind: 'light' | 'co2' | 'ferts';
  /** the button text, with the price: "Add CO2 system (+$47)" */
  label: string;
  /** the hover text: exactly what changes */
  describe: string;
  setupUsd: number; monthlyUsd: number;
  apply: (t: TankSetup) => void;
}
export interface Swap { from: string; fromLabel: string; to: string | null; toLabel: string; n: number; why: string }
export interface ReplacePlan {
  label: string; describe: string;
  swaps: Swap[];
  /** how many plants really change */
  count: number;
  apply: (t: TankSetup) => void;
}
export interface PlantNeedsView {
  rows: PlantRow[];
  total: number;
  /** "All 19 plants have what they need." / "2 of 4 kinds are missing something: ..." */
  summary: string; ok: boolean;
  tank: { light: string; co2: string; ferts: string };
  fixes: PlantFix[];
  /** the "Remove these plants" button; null when the tank has none */
  remove: { n: number; label: string; describe: string; apply: (t: TankSetup) => void } | null;
  replace: ReplacePlan | null;
  /** the fertiliser row (Nathan 2026-11-17: fertiliser lives in Plants, not Equipment); null on a salt or dry tank or with none chosen */
  fert: FertView | null;
  /** the CO2 system the tank has (gear: edited in Equipment, never here); null when none injects */
  co2Sys: { label: string } | null;
}
export interface FertOption { id: string; label: string; dose: string; setupUsd: number; monthlyUsd: number; on: boolean }
export interface FertView { current: FertOption | null; options: FertOption[]; pick: (t: TankSetup, id: string) => void }

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const BAND = { low: 'Low light', medium: 'Medium light', high: 'High light' } as const;
export const plantImg = (id: string) => `gallery/plants/${id}.webp`;
const PLANT_KINDS = new Set(['plant', 'coral', 'artificial']);

/** What the tank has, in words (freshwater: the Tech rows; the care level otherwise). */
export function tankHas(S: TankSetup): { light: string; co2: string; ferts: string } {
  const lo = wattsOf(S) > 0 ? lightOutCached(S) : null;
  const light = lo ? `${Math.round(lo.mean)} PAR, ${parBand(lo.mean)}` : 'not set yet';
  if (!S.water.on || isSalt(S)) return { light, co2: 'not used', ferts: S.grow.feed === 'low' ? 'light dosing' : S.grow.feed === 'ferts' ? 'regular dosing' : 'daily dosing' };
  const t = techOf(S), c = optionDef('co2', t.rows.co2 ?? 'none'), f = optionDef('ferts', t.rows.ferts ?? 'none');
  const co2 = (c?.co2 ?? 0) >= 1 ? c!.label.replace(/ \(.*/, '') : (c?.co2 ?? 0) > 0 ? `${c!.label} only (no injection)` : 'none';
  const ferts = (f?.fert ?? 0) >= 1 ? f!.label.replace(/ \(.*/, '') : (f?.fert ?? 0) > 0 ? `${f!.label} only` : 'none';
  return { light, co2, ferts };
}

const issuesOf = (variant: string, pars: number[], feed: GrowFeed): PlantIssue[] => {
  const n = NEEDS[variant], out = new Set<PlantIssue>();
  if (!n || isLand(n)) return [];
  for (const par of pars) { const o = outcomeOf(variant, par, feed); if (o.why === 'dim') out.add('dim'); else if (o.why === 'bright') out.add('bright'); }
  if (isCoralNeed(n)) { if (outcomeOf(variant, pars[0] ?? 75, feed).why === 'care') out.add('dosing'); return [...out]; }
  const p = n as PlantNeed;
  if (p.co2 === 'required' && feed !== 'co2') out.add('co2');
  if (p.ferts === 'required' && feed === 'low') out.add('ferts');
  return [...out];
};

/** The rows of the card: one per species in the tank, with each need against the tank. */
export function plantRows(S: TankSetup): PlantRow[] {
  const feed = S.grow.feed, lights = itemLights(S), lo = wattsOf(S) > 0 ? lightOutCached(S) : null, has = tankHas(S), fresh = S.water.on && !isSalt(S);
  const by = new Map<string, typeof S.items>();
  for (const it of S.items) if (PLANT_KINDS.has(it.kind)) by.set(it.variant, [...(by.get(it.variant) ?? []), it]);
  const rows: PlantRow[] = [];
  for (const [variant, items] of by) {
    const v = LIBRARY[variant], n = NEEDS[variant], base = { variant, label: v?.label ?? variant, n: items.length, img: plantImg(variant), unmetIds: [] as number[] };
    if (v?.kind === 'artificial') { rows.push({ ...base, kind: 'artificial', light: null, co2: null, ferts: null, plain: 'Artificial: needs no light, CO2 or fertiliser', met: true, issues: [] }); continue; }
    if (!n || isLand(n)) { rows.push({ ...base, kind: 'land', light: null, co2: null, ferts: null, plain: 'Above the water: room light, no CO2 or fertiliser', met: true, issues: [] }); continue; }
    const coral = isCoralNeed(n), pars = items.map(it => lights?.get(it.id)?.par).filter((x): x is number => x != null);
    const issues = issuesOf(variant, pars, feed), unmet = new Set(items.filter(it => {
      const p = lights?.get(it.id)?.par; return issuesOf(variant, p == null ? [] : [p], feed).length > 0;
    }).map(it => it.id));
    const dim = issues.includes('dim'), bright = issues.includes('bright');
    const band = (n as PlantNeed | CoralNeed).band;
    const lightNeed = coral ? ({ soft: 'Soft-coral light', lps: 'LPS light', sps: 'SPS light' } as const)[band as 'soft' | 'lps' | 'sps'] : BAND[band as 'low' | 'medium' | 'high'];
    const light: NeedCell = isFloat(variant)
      ? { need: lightNeed, have: 'floats at the surface: always lit', met: true }
      : { need: lightNeed, have: lo ? `tank gives ${Math.round(pars.length ? Math.min(...pars) : lo.mean)} PAR${dim ? ': too dim' : bright ? ': too bright' : ''}` : 'light not set yet', met: !dim && !bright };
    let co2: NeedCell | null = null, ferts: NeedCell | null = null;
    if (coral) {
      const d = (n as CoralNeed).dosing;
      ferts = { need: d === 'none' ? 'No dosing' : `${d[0].toUpperCase()}${d.slice(1)} dosing`, have: has.ferts, met: !issues.includes('dosing') };
    } else {
      const p = n as PlantNeed;
      const dm = { none: 'No CO2', recommended: 'CO2 helps', required: 'CO2 needed' }, fm = { none: 'No ferts', recommended: 'Ferts help', required: 'Ferts needed' };
      co2 = { need: dm[p.co2], have: fresh ? has.co2 : 'not used', met: !issues.includes('co2') };
      ferts = { need: fm[p.ferts], have: fresh ? has.ferts : 'not used', met: !issues.includes('ferts') };
    }
    rows.push({ ...base, kind: coral ? 'coral' : 'plant', light, co2, ferts, plain: '', met: issues.length === 0, issues, unmetIds: [...unmet] });
  }
  return rows.sort((a, b) => (a.met === b.met ? b.n - a.n : a.met ? 1 : -1) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------------------------------------------- fixes
/** What a dry run costs: the price list's change when it is given, else the Tech rows' own estimate. */
function costOf(S: TankSetup, after: TankSetup, price: PriceOf | undefined, est: number): number {
  if (price) { try { const d = price(after) - price(S); if (Number.isFinite(d)) return d; } catch { /* use the estimate */ } }
  return est;
}
const cheapest = <T extends { priceUsd?: number; est?: string[] }>(list: T[]): T | undefined => list.filter(p => listedPrice(p) !== undefined).sort((a, b) => listedPrice(a)! - listedPrice(b)!)[0];

/** The CO2 system (with fertiliser when the tank has none: injected CO2 without ferts still counts as low-tech care) and the fertiliser: the cheapest real products. */
function careFixes(S: TankSetup, rows: PlantRow[], price?: PriceOf): PlantFix[] {
  if (!S.water.on || isSalt(S)) return [];
  const needCo2 = rows.some(r => r.issues.includes('co2')), needFerts = rows.some(r => r.issues.includes('ferts'));
  const out: PlantFix[] = [];
  const hasFerts = (optionDef('ferts', techOf(S).rows.ferts ?? 'none')?.fert ?? 0) >= 1;
  if (needCo2) {
    const opt = co2Option(S), prod = cheapest(reefOptionProducts('co2', opt) as Co2Product[]);
    const addFerts = !hasFerts;
    const apply = (t: TankSetup) => {
      commitTech(t, s => withChoice(s, 'co2', opt));
      if (prod) commitTech(t, s => setRowProduct(s, 'co2', prod.id));
      if (addFerts) commitTech(t, s => withChoice(s, 'ferts', 'aio'));
    };
    const copy = structuredClone(S); apply(copy);
    if (copy.grow.feed === 'co2') {
      const c = optionCost(S, 'co2', opt), f = addFerts ? optionCost(S, 'ferts', 'aio') : null;
      const setup = costOf(S, copy, price, c.setup.mode + (f?.setup.mode ?? 0)), monthly = c.monthly.mode + (f?.monthly.mode ?? 0);
      const optName = (optionDef('co2', opt)?.label ?? 'CO2').replace(/ \(.*/, '');
      out.push({
        kind: 'co2', label: `Add CO2 system${addFerts ? ' + fertiliser' : ''} (+${usd(setup)})`, setupUsd: setup, monthlyUsd: monthly,
        describe: `Adds ${optName}${prod ? `: the cheapest we list, ${productName(prod)}, ${usd(listedPrice(prod)!)}` : ''}${addFerts ? ', and an all-in-one liquid fertiliser, because CO2 needs fertiliser to work' : ''}. About +${usd(setup)} to set up and +${usd(monthly)} a month for refills${addFerts ? ' and ferts' : ''}. `
          + `The tank's care becomes CO2 + ferts, so ${rows.filter(r => r.issues.includes('co2')).map(r => r.label).join(', ')} get${rows.filter(r => r.issues.includes('co2')).length === 1 ? 's' : ''} what ${rows.filter(r => r.issues.includes('co2')).length === 1 ? 'it needs' : 'they need'}. Ctrl+Z undoes it.`,
        apply,
      });
    }
  } else if (needFerts) {
    const apply = (t: TankSetup) => { commitTech(t, s => withChoice(s, 'ferts', 'aio')); };
    const copy = structuredClone(S); apply(copy);
    if (feedFor(copy) !== 'low') {
      const f = optionCost(S, 'ferts', 'aio'), setup = costOf(S, copy, price, f.setup.mode), monthly = f.monthly.mode;
      const who = rows.filter(r => r.issues.includes('ferts')).map(r => r.label);
      out.push({
        kind: 'ferts', label: `Add fertiliser (+${usd(setup)}${monthly >= 0.5 ? `, +${usd(monthly)}/mo` : ''})`, setupUsd: setup, monthlyUsd: monthly,
        describe: `Adds an all-in-one liquid fertiliser: about +${usd(setup)} to set up and +${usd(monthly)} a month. The tank's care goes from low-tech to ferts, so ${who.join(', ')} get${who.length === 1 ? 's' : ''} the nutrients ${who.length === 1 ? 'it needs' : 'they need'}. Ctrl+Z undoes it.`,
        apply,
      });
    }
  }
  return out;
}

/** A stronger light: only when a plant is too dim, the light is not one the owner brought, and a catalogue light that fits reaches higher. */
function lightFix(S: TankSetup, rows: PlantRow[], price?: PriceOf): PlantFix | null {
  if (!rows.some(r => r.issues.includes('dim')) || !S.water.on || isSalt(S) || S.light.owned) return null;
  const pick = lightFor(S), now = lightOutCached(S)?.mean ?? 0;
  if (!pick || pick.product.id === S.light.product || pick.par <= now + 1) return null;
  const copy = structuredClone(S); applyLightProduct(copy.light, copy.tank, pick.product);
  const after = lightOutCached(copy)?.mean ?? pick.par, who = rows.filter(r => r.issues.includes('dim')).map(r => r.label);
  const raw = costOf(S, copy, price, pick.priceUsd - (listedPrice(lightProduct(S.light.product)) ?? 0)), setup = Math.max(0, raw);
  if (after <= now + 1) return null;
  const cost = setup < 1 ? 'no extra cost' : `+${usd(setup)}`;
  return {
    kind: 'light', label: `Stronger light (${cost})`, setupUsd: setup, monthlyUsd: 0,
    describe: `Swaps the light for the ${productName(pick.product)} (${usd(pick.priceUsd)}, the cheapest catalogue light that fits this tank and reaches what these plants want): about ${Math.round(now)} PAR to about ${Math.round(after)} PAR at the plants, ${setup < 1 ? 'for about the same price as the light you have' : `about +${usd(setup)} on the set-up cost`}. Helps ${who.join(', ')}. Ctrl+Z undoes it.`,
    apply: t => { applyLightProduct(t.light, t.tank, pick.product); },
  };
}

// ---------------------------------------------------------------------------------------------------------------- replace
const hexRgb = (h: string): [number, number, number] => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [90, 120, 60]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const colourOf = (id: string) => hexRgb(PLANT3D[id as keyof typeof PLANT3D]?.leaf?.cols?.[0]?.[0] ?? '');
/** How different two plants look: height (as a ratio) and leaf colour. Smaller = more alike. */
const lookGap = (a: string, b: string) => {
  const ca = colourOf(a), cb = colourOf(b), dc = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]) / 441;
  return Math.abs(Math.log(Math.max(grownMm(a), 1) / Math.max(grownMm(b), 1))) + dc * 2;
};
const POOL = Object.keys(LIBRARY).filter(id => LIBRARY[id].kind === 'plant' && !LIBRARY[id].salt && NEEDS[id] && !isLand(NEEDS[id]) && !isCoralNeed(NEEDS[id]) && !LIBRARY[id].hint.startsWith('Terrarium'));

/** The look-alike for `from` that suits this tank (the tank's mean PAR, each item's own PAR, and its care), or null. Same shape group first (the form: foreground, midground, background, floater...), the
 *  maker's own swap list (plantfit SWAP) before the closest height and colour. */
export function comparablePlant(S: TankSetup, from: string, pars: number[]): string | null {
  const feed = S.grow.feed, mean = lightOutCached(S)?.mean, g = groupOf(from);
  const ok = (c: string) => c !== from && variantInScope(c) && groupOf(c) === g && (mean == null || fits(c, mean, feed)) && pars.every(p => outcomeOf(c, p, feed).state !== 'struggle');
  const listed = (SWAP[from] ?? []).find(c => LIBRARY[c] && POOL.includes(c) && ok(c));
  if (listed) return listed;
  const rest = POOL.filter(ok).sort((a, b) => lookGap(from, a) - lookGap(from, b) || a.localeCompare(b));
  return rest[0] ?? null;
}

function replacePlan(S: TankSetup, rows: PlantRow[]): ReplacePlan | null {
  const hard = rows.filter(r => r.kind === 'plant' && !r.met);
  if (!hard.length) return null;
  const lights = itemLights(S), swaps: Swap[] = [], map = new Map<string, string>();
  for (const r of hard) {
    const items = S.items.filter(it => it.variant === r.variant && r.unmetIds.includes(it.id));
    const pars = items.map(it => lights?.get(it.id)?.par).filter((x): x is number => x != null);
    const to = comparablePlant(S, r.variant, pars);
    if (to) map.set(r.variant, to);
    const w = r.issues.map(i => i === 'dim' ? 'more light' : i === 'co2' ? 'CO2' : 'ferts'), why = r.issues.includes('bright') ? 'too much light' : `needs ${w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w[0]}`;
    swaps.push({ from: r.variant, fromLabel: r.label, to: to, toLabel: to ? LIBRARY[to].label : '', n: r.unmetIds.length || r.n, why });
  }
  const count = swaps.filter(s => s.to).reduce((n, s) => n + s.n, 0);
  const lines = swaps.map(s => s.to ? `${s.fromLabel} ×${s.n} (${s.why}) → ${s.toLabel}` : `${s.fromLabel} ×${s.n}: no comparable plant suits this tank's light and care, so it stays`).join('; ');
  const onlyBright = hard.every(r => r.issues.every(i => i === 'bright'));
  const apply = (t: TankSetup) => {
    const ids = new Set(hard.flatMap(r => r.unmetIds));
    for (const it of t.items) {
      const to = map.get(it.variant); if (!to || !ids.has(it.id) || it.kind !== 'plant') continue;
      const from = LIBRARY[it.variant], dest = LIBRARY[to], k = it.size / from.size;
      delete it.spread; delete it.stems; delete it.dens;
      it.variant = to; it.size = Math.round(Math.min(dest.max, Math.max(dest.min, dest.size * k)));
    }
  };
  return {
    label: onlyBright ? 'Replace with plants that suit' : 'Replace with easier plants', swaps,
    describe: `${lines}. Same count and same spots; each swap looks alike (same kind of plant, close in height and leaf colour) and works with this tank's light and care as it is now. ${count ? `${count} plant${count === 1 ? '' : 's'} change. Ctrl+Z undoes it.` : 'Nothing changes.'}`,
    count, apply,
  };
}

// ---------------------------------------------------------------------------------------------------------------- the card
/** Everything the card shows: rows, the overall line, and the buttons (each only when it would do something). */
export function plantNeedsView(S: TankSetup, price?: PriceOf): PlantNeedsView {
  const rows = plantRows(S), total = rows.reduce((n, r) => n + r.n, 0), bad = rows.filter(r => !r.met), has = tankHas(S);
  const names = (l: string[]) => l.length <= 3 ? l.join(', ') : `${l.slice(0, 3).join(', ')} and ${l.length - 3} more`;
  const summary = !rows.length ? '' : !bad.length ? `${total === 1 ? 'The plant has' : `All ${total} plants have`} what ${total === 1 ? 'it needs' : 'they need'}: light, CO2 and fertiliser.`
    : `${bad.length} of ${rows.length} kinds ${bad.length === 1 ? 'is' : 'are'} missing something: ${names(bad.map(b => b.label))}.`;
  const fixes: PlantFix[] = [];
  const lf = lightFix(S, rows, price); if (lf) fixes.push(lf);
  fixes.push(...careFixes(S, rows, price));
  const removable = S.items.filter(it => PLANT_KINDS.has(it.kind));
  const remove = removable.length ? {
    n: removable.length, label: `Remove these plants (${removable.length})`,
    describe: `Takes every plant out of the tank: ${rows.map(r => `${r.label} ×${r.n}`).join(', ')}. The rest of the design is not touched. Ctrl+Z brings them back.`,
    apply: (t: TankSetup) => { for (const it of removable) removeItem(t, it.id); },
  } : null;
  return { rows, total, summary, ok: !!rows.length && !bad.length, tank: has, fixes, remove, replace: replacePlan(S, rows), fert: fertView(S), co2Sys: co2System(S) };
}

// ---------------------------------------------------------------------------------------------------------------- fertiliser row and the CO2 pointer
const DOSE = (f: number) => (f >= 2 ? 'Heavy dose' : f >= 1 ? 'Regular dose' : 'Light dose');
/** The fertiliser choices (the Tech menu's own ferts row) with dose and cost; shown once a fertiliser is in the tank. Picking is one undo step. */
export function fertView(S: TankSetup): FertView | null {
  if (!S.water.on || isSalt(S)) return null;
  const cur = techOf(S).rows.ferts ?? 'none';
  if (cur === 'none') return null;
  const opt = (id: string): FertOption => { const d = optionDef('ferts', id), c = optionCost(S, 'ferts', id); return { id, label: d?.label ?? id, dose: DOSE(d?.fert ?? 0), setupUsd: c.setup.mode, monthlyUsd: c.monthly.mode, on: id === cur }; };
  const options = ['roottabs', 'aio', 'ei', 'doser'].filter(id => optionDef('ferts', id)).map(opt);
  return { current: options.find(o => o.on) ?? null, options, pick: (t, id) => { commitTech(t, s => withChoice(s, 'ferts', id)); } };
}
/** The tank's CO2 system, when one injects gas. */
export function co2System(S: TankSetup): { label: string } | null {
  if (!S.water.on || isSalt(S)) return null;
  const t = techOf(S), d = optionDef('co2', t.rows.co2 ?? 'none');
  if ((d?.co2 ?? 0) < 1) return null;
  const p = reefOptionProducts('co2', t.rows.co2 ?? '').find(x => x.id === t.products?.co2);
  return { label: p ? productName(p) : d!.label.replace(/ \(.*/, '') };
}
