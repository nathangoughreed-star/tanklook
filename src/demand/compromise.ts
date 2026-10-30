// Compromise and compare (lane GV7, Nathan 2026-10-30): "the user may realize they really want a certain style but it isn't in the budget. The tool should offer them a way to
// compromise, like 'keep this style in your budget by removing the school of neon tetras and downsizing from 75g to a 40g breeder'", and the comparison beside it: the same roster in a
// cheaper (or whatever metric was limited) style. When a chosen look breaks a limit (set-up, a month, care time, set-up hours, space, tank size; GV8's ranges), this searches small
// COMPOUND edits that keep the look: drop or shrink one species group, a smaller tank, a plainer finish tier, low-tech plants (no CO2, no stronger light). Every candidate is built and
// checked by the generator's own concept builder (the strict welfare rule, every limit on both sides), so nothing is promised that the engine does not deliver. Pure: the UI draws it.
import { getSpecies } from '../data/species';
import { TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { TIER_LABEL } from '../scene/finish';
import { LAYOUTS, STYLE_KIND } from '../scene/items';
import { rankStyles } from '../scene/scapes';
import { spaceFit } from '../scene/space';
import { recommendedMin, type AnimalCount } from '../scene/tankfit';
import type { LayoutId, Units } from '../scene/types';
import { conceptMaker, deltaText, fitsFor, lockedArchetype, setupHoursOf, type Archetype, type Proposal, type Wants } from './suggest';
import type { Money } from './makefit';
import type { UserProfile } from './types';

export type StyleId = Exclude<LayoutId, 'none'>;
/** The limits a look can break: set-up $, $ a month, care minutes a week, set-up hours, floor space, tank gallons. */
export type LimitKey = 'startup' | 'monthly' | 'care' | 'hours' | 'space' | 'gal';
export interface Broken { key: LimitKey; side: 'above' | 'below'; /** "$1,296 to set up, $896 over your $400" */ text: string; /** how far out, as a share of the bound (ranks which limit leads) */ by: number }
/** The look as it was chosen: a style, its animals (may be none), its tank, the finish level it was seen at (default the lushest). */
export interface Anchor { style: StyleId; animals: AnimalCount[]; tank: TankModel; level?: 0 | 1 | 2 | 3 }
export type StepKind = 'drop' | 'shrink' | 'tank' | 'tier';
export interface Step { kind: StepKind; text: string }
export interface Compromise {
  proposal: Proposal; steps: Step[];
  /** "Keep this Iwagumi within $400: drop the 10 neon tetras and go 75 gal → 40 gal breeder (-$310 set-up)" */
  text: string; label: string;
  /** this compromise minus the anchor */
  delta: Money; animals: AnimalCount[];
}
export interface OtherStyle { proposal: Proposal; style: StyleId; text: string; label: string; delta: Money }
export interface CompromiseResult {
  style: StyleId; anchor: Proposal; broken: Broken[];
  /** the 1-2 smallest compound edits that keep the look and meet every limit (empty: none verifies) */
  compromises: Compromise[];
  /** the other style with the whole roster kept that does best on the leading limit */
  other?: OtherStyle;
  /** in words, when there is no compromise */
  none?: string;
}

/** The sizes a compromise steps down through (the common catalogue sizes, Nathan's "75g to a 40g breeder"), besides the chosen tank itself: few enough to search quickly. */
const LADDER = new Set(['5.5 gal', '10 gal', '20 gal long', '29 gal', '40 gal breeder', '55 gal', '75 gal', '90 gal', '120 gal', '150 gal']);
const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const inch = (mm: number) => Math.round(mm / 25.4);
export const styleLabel = (s: StyleId) => LAYOUTS[s]?.label ?? s;
/** "neon tetras", "bronze cories", "cherry shrimp": the species' common name, plural for a group */
export function animalName(id: string, n: number): string {
  const nm = (getSpecies(id)?.name ?? id).replace(/\s*\(.*\)$/, '').toLowerCase();
  if (n < 2 || /(s|sh|ch|x|fish|shrimp|deer|sheep)$/.test(nm)) return nm;
  return /[^aeiou]y$/.test(nm) ? nm.slice(0, -1) + 'ies' : nm + 's';
}
const animalsText = (a: AnimalCount[]) => a.filter(x => x.n > 0).map(x => `${x.n} ${animalName(x.species, x.n)}`).join(', ');
const list = (a: string[]) => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;

/** The generator's input with every limit off: what the look really costs. */
function limitsOff(w: Wants): Wants {
  const C = w.constraints, off = <T extends { on: boolean }>(x: T | undefined) => x ? { ...x, on: false } : undefined;
  return { ...w, phased: false, mins: undefined, tankGal: undefined, setupHours: undefined, space: undefined, maxLengthMm: undefined,
    constraints: { ...C, startupUsd: off(C.startupUsd), monthlyUsd: off(C.monthlyUsd), minutesPerWeek: off(C.minutesPerWeek), space: off(C.space) } };
}

/** Which of the person's limits this proposal is outside of, above or below, with the numbers. */
export function brokenLimits(p: Proposal, w: Wants, P: UserProfile): Broken[] {
  const C = w.constraints, t = p.totals, lo = w.mins ?? {}, out: Broken[] = [];
  const chk = (key: LimitKey, v: number, max: number | undefined, min: number | undefined, f: (n: number) => string, what: string) => {
    if (max !== undefined && v > max) out.push({ key, side: 'above', by: max > 0 ? (v - max) / max : 1, text: `${f(v)} ${what}, ${f(v - max)} over your ${f(max)}` });
    else if (min !== undefined && v < min) out.push({ key, side: 'below', by: min > 0 ? (min - v) / min : 1, text: `${f(v)} ${what}, ${f(min - v)} under your ${f(min)}` });
  };
  chk('startup', t.startupUsd, C.startupUsd?.on ? C.startupUsd.value : undefined, lo.startupUsd, usd, 'to set up');
  chk('monthly', t.monthlyUsd, C.monthlyUsd?.on ? C.monthlyUsd.value : undefined, lo.monthlyUsd, usd, 'a month');
  chk('care', t.minPerWeek, C.minutesPerWeek?.on ? C.minutesPerWeek.value : undefined, lo.minPerWeek, n => `${Math.round(n)} min`, 'a week');
  if (w.setupHours !== undefined || lo.setupHours !== undefined) chk('hours', setupHoursOf(p.build, P), w.setupHours, lo.setupHours, n => `${Math.round(n)} h`, 'of set-up');
  const tk = p.build.tank, sp = C.space?.on === false ? undefined : w.space;
  if (sp && !spaceFit(tankFromModel(tk), sp).fits) out.push({ key: 'space', side: 'above', by: Math.max(tk.outer.L / sp.w, tk.outer.D / sp.d) - 1, text: `${inch(tk.outer.L)} x ${inch(tk.outer.D)} in of floor, your space is ${inch(sp.w)} x ${inch(sp.d)} in` });
  if (w.maxLengthMm && tk.outer.L > w.maxLengthMm) out.push({ key: 'space', side: 'above', by: tk.outer.L / w.maxLengthMm - 1, text: `${inch(tk.outer.L)} in long, your limit is ${inch(w.maxLengthMm)} in` });
  chk('gal', tk.ratedGal, w.tankGal?.max, w.tankGal?.min, n => `${Math.round(n)} gal`, 'tank');
  return out.sort((a, b) => b.by - a.by);
}

/** "within $400", "within $25 a month", "within your 36 x 18 in space": the limits the compromise meets, in words. */
function withinText(broken: Broken[], w: Wants): string {
  const C = w.constraints, parts: string[] = [];
  for (const b of broken) {
    if (b.side === 'below') continue;
    if (b.key === 'startup' && C.startupUsd) parts.push(usd(C.startupUsd.value));
    if (b.key === 'monthly' && C.monthlyUsd) parts.push(`${usd(C.monthlyUsd.value)} a month`);
    if (b.key === 'care' && C.minutesPerWeek) parts.push(`${C.minutesPerWeek.value} min a week`);
    if (b.key === 'hours' && w.setupHours !== undefined) parts.push(`${w.setupHours} h of set-up`);
    if (b.key === 'space' && w.space && !parts.some(x => x.includes('space'))) parts.push(`your ${inch(w.space.w)} x ${inch(w.space.d)} in space`);
    if (b.key === 'gal' && w.tankGal?.max !== undefined) parts.push(`${w.tankGal.max} gal`);
  }
  return parts.length ? `within ${list(parts)}` : 'within your limits';
}

/** The figure the leading limit is about (the other style is the best one on it). */
const metricOf = (k: LimitKey | undefined) => (p: Proposal) => k === 'monthly' ? p.totals.monthlyUsd : k === 'care' ? p.totals.minPerWeek : k === 'hours' ? p.totals.startupUsd : p.totals.startupUsd;
const minus = (a: Money, b: Money): Money => ({ startupUsd: a.startupUsd - b.startupUsd, monthlyUsd: a.monthlyUsd - b.monthlyUsd, minPerWeek: a.minPerWeek - b.minPerWeek });

interface StockEdit { animals: AnimalCount[]; score: number; steps: Step[] }
/** The roster edits, smallest first: keep it, shrink one group to half or to its recommended minimum, drop one group (something is always left when there was something). */
function stockEdits(animals: AnimalCount[]): StockEdit[] {
  const a0 = animals.filter(x => x.n > 0), total = a0.reduce((s, x) => s + x.n, 0) || 1, out: StockEdit[] = [{ animals: a0, score: 0, steps: [] }];
  a0.forEach((x, i) => {
    const min = Math.max(1, recommendedMin(x.species) ?? 1), half = Math.ceil(x.n / 2);
    for (const k of half > min ? [half, min] : [min]) if (x.n > k) out.push({ animals: a0.map((y, j) => j === i ? { ...y, n: k } : y), score: 1 + 2 * (x.n - k) / total, steps: [{ kind: 'shrink', text: `keep ${k} of the ${x.n} ${animalName(x.species, x.n)}` }] });
    if (a0.length > 1) out.push({ animals: a0.filter((_, j) => j !== i), score: 2 + 3 * x.n / total, steps: [{ kind: 'drop', text: `drop the ${x.n} ${animalName(x.species, x.n)}` }] });
  });
  return out.sort((x, y) => x.score - y.score);
}

/** A stand-in archetype for a roster the catalogue has no concept for (the look-first path); the generator reads its id, kind, family and tags only. */
function archetypeFor(animals: AnimalCount[], style: StyleId): Archetype {
  const found = animals.length ? lockedArchetype(animals) : undefined;
  if (found) return found;
  const salt = STYLE_KIND[style] === 'salt', land = STYLE_KIND[style] === 'land';
  return { id: `look-${style}-${animals.map(x => x.species + x.n).join(',')}`, kind: salt ? 'saltwater' : land ? 'terrarium' : 'freshwater', title: styleLabel(style), family: salt ? 'salt' : land ? 'terrarium' : 'fish', tags: [], animals, why: '' };
}

/**
 * The compromise for a chosen look that breaks a limit: up to two compound edits that keep the look (style) and meet every limit, smallest first, and the other style that does best on
 * the leading limit with the whole roster kept. Undefined when the look fits every limit already or cannot be built at all (no welfare-appropriate build of it).
 */
export function compromiseFor(an: Anchor, w: Wants, P: UserProfile, units: Units = 'cm', now = Date.now()): CompromiseResult | undefined {
  const style = an.style, animals = an.animals.filter(x => x.n > 0), level = an.level ?? 3, arch = archetypeFor(animals, style);
  const off = conceptMaker(limitsOff(w), P, units, now), a0 = off.attempt(arch, animals, an.tank, 'cheapest', level, style);
  if (!a0.p) return undefined;
  const anchor = off.finalize(a0.p, 'look', animals.length > 0, false), broken = brokenLimits(anchor, w, P);
  if (!broken.some(b => b.side === 'above')) return broken.length ? { style, anchor, broken, compromises: [], none: 'Only a lower bound is missed: a smaller version of this look cannot help with that.' } : undefined;
  const L0 = anchor.build.finish?.level ?? level, G0 = an.tank.ratedGal, minLevel = Math.min(L0, 1);
  const real = conceptMaker(w, P, units, now), plantsy = STYLE_KIND[style] !== 'salt' && STYLE_KIND[style] !== 'land';
  const low = plantsy && !w.lowtech && L0 >= 2 ? conceptMaker({ ...w, hightech: false, lowtech: true }, P, units, now) : undefined;
  const space = w.constraints.space?.on === false ? undefined : w.space;
  /** the tanks a roster may use, largest first, none bigger than the chosen one (an existing tank is the only one) */
  const tanksFor = (a: AnimalCount[]): TankModel[] => w.ownTank ? [w.ownTank] : (a.length ? fitsFor(a, space, w.maxLengthMm, w.tankGal).map(f => f.tank) : TANK_MODELS.filter(t => !space || spaceFit(tankFromModel(t), space).fits))
    .filter(t => t.id === an.tank.id || LADDER.has(t.name) && t.ratedGal < G0).sort((x, y) => y.ratedGal - x.ratedGal);
  const ok = (p: NonNullable<ReturnType<typeof real.attempt>['p']> | undefined, keepTier: boolean) => !!p && p.build.finish?.style === style && (keepTier ? p.levelOf >= L0 : p.levelOf >= minLevel);

  type Cand = { p: Proposal; score: number; steps: Step[]; animals: AnimalCount[] };
  const cands: Cand[] = [];
  const consider = (se: StockEdit, maker: typeof real, keepTier: boolean, lowtech: boolean) => {
    const tanks = tanksFor(se.animals); if (!tanks.length) return;
    const at = (i: number) => { const r = maker.attempt(arch, se.animals, tanks[i], 'cheapest', L0 as 0 | 1 | 2 | 3, style); return ok(r.p, keepTier) ? r.p : undefined; };
    // the largest tank that passes, by bisection (a smaller tank of the same look costs less to buy, run and keep); the first one is tried alone first
    let hit = at(0), hi = 0;
    if (!hit && tanks.length > 1) {
      let lo = 1, top = tanks.length - 1; if (!at(top)) return;
      hi = top; while (lo < top) { const mid = (lo + top) >> 1; if (at(mid)) top = mid; else lo = mid + 1; } hi = top; hit = at(hi);
    }
    if (!hit) return;
    const p = maker.finalize(hit, 'look', animals.length > 0, false), t = p.build.tank, steps = [...se.steps];
    let score = se.score;
    if (t.id !== an.tank.id) { steps.push({ kind: 'tank', text: `go ${an.tank.name} → ${t.name}` }); score += 1 + 2 * (1 - t.ratedGal / G0); }
    const lv = p.build.finish?.level ?? 0, was = anchor.build.finish;
    if (lowtech || lv < L0) {
      const tier = p.build.finish?.tier;
      steps.push({ kind: 'tier', text: tier === 'lowtech' ? 'low-tech plants (no CO2, no stronger light)' : `a ${tier ? TIER_LABEL[tier].toLowerCase() : 'plainer finish'}${was ? ` instead of the ${TIER_LABEL[was.tier].toLowerCase()}` : ''}` });
      score += Math.max(0, L0 - lv) + (lowtech ? 1 : 0);
    }
    if (steps.length) cands.push({ p, score, steps, animals: se.animals });
  };
  const lead = broken.find(b => b.side === 'above')?.key;
  let bound = Infinity;
  for (const se of stockEdits(animals)) {
    if (se.score >= bound) break; // a bigger roster edit cannot beat what was found already
    const n = cands.length;
    consider(se, real, true, false); consider(se, real, false, false);
    // low-tech plants (no CO2 refills, no stronger light) when the plainer tiers did not do it, or when the limit is the month or the care time it saves
    if (low && (cands.length === n || lead === 'monthly' || lead === 'care')) consider(se, low, false, true);
    const sorted = [...cands].sort((a, b) => a.score - b.score);
    if (sorted.length >= 2) bound = sorted[1].score;
  }
  // the two smallest in different tanks (say a smaller tank at the full finish, and a bigger one with a plainer finish or fewer animals): the same tank again with one more cut adds nothing
  const sorted = cands.sort((a, b) => a.score - b.score || b.p.totals.startupUsd - a.p.totals.startupUsd), pick: Cand[] = [];
  for (const c of sorted) if (pick.length < 2 && !pick.some(q => q.p.build.tank.id === c.p.build.tank.id)) pick.push(c);
  const within = withinText(broken, w), lab = styleLabel(style);
  const compromises: Compromise[] = pick.map(c => {
    const delta = minus(c.p.totals, anchor.totals);
    return { proposal: c.p, steps: c.steps, animals: c.animals, delta,
      label: `${lab}: ${c.p.build.tank.name}, ${usd(c.p.totals.startupUsd)}`,
      text: `Keep this ${lab.toLowerCase()} ${within}: ${list(c.steps.map(s => s.text))} (${deltaText(delta)}; ${usd(c.p.totals.startupUsd)} to set up, ${usd(c.p.totals.monthlyUsd)} a month, about ${Math.round(c.p.totals.minPerWeek)} min a week).` };
  });

  // ---- beside it: the same roster in another style, the best one on the leading limit (the chosen tank first, then smaller) ----
  const metric = metricOf(lead);
  const styles = (animals.length ? rankStyles(animals).map(r => r.style as StyleId) : (Object.keys(LAYOUTS) as LayoutId[]).filter((s): s is StyleId => s !== 'none' && STYLE_KIND[s] === STYLE_KIND[style]))
    .filter(s => s !== style && STYLE_KIND[s] === STYLE_KIND[style]).slice(0, 3);
  let other: OtherStyle | undefined;
  // the chosen tank, then the size the roster-keeping compromise found (the fairest side-by-side), then the smallest
  const tanks = tanksFor(animals), kept = compromises.find(c => animalsText(c.animals) === animalsText(animals))?.proposal.build.tank;
  for (const tk of [tanks[0], kept && tanks.find(t => t.id === kept.id), tanks[tanks.length - 1]].filter((t, i, a): t is TankModel => !!t && a.indexOf(t) === i)) {
    const found = styles.map(s => ({ s, r: real.attempt(arch, animals, tk, 'cheapest', L0 as 0 | 1 | 2 | 3, s).p })).filter(x => x.r && x.r.build.finish?.style === x.s && x.r.levelOf >= minLevel);
    if (!found.length) continue;
    const best = found.map(x => ({ s: x.s, p: real.finalize(x.r!, 'look', animals.length > 0, false) })).sort((a, b) => metric(a.p) - metric(b.p))[0];
    const d = minus(best.p.totals, anchor.totals);
    other = { proposal: best.p, style: best.s, delta: d, label: `${styleLabel(best.s)}: ${best.p.build.tank.name}, ${usd(best.p.totals.startupUsd)}`,
      text: `Or ${animals.length ? `keep all ${animalsText(animals)} and ` : ''}change the look: ${styleLabel(best.s)} in the ${best.p.build.tank.name} for ${usd(best.p.totals.startupUsd)} to set up, ${usd(best.p.totals.monthlyUsd)} a month, about ${Math.round(best.p.totals.minPerWeek)} min a week (${deltaText(d)}), ${within}.` };
    break;
  }
  return { style, anchor, broken, compromises, ...(other ? { other } : {}),
    ...(compromises.length ? {} : { none: `No smaller version of this ${lab.toLowerCase()} meets your limits with its animals kept well: the cost comes from what they need, not from the look.` }) };
}
