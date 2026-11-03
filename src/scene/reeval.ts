// Re-evaluation without destruction (lane GS6, 2026-11-02; Nathan: "TankLook currently treats some decisions as destructive transitions rather than updates to one
// persistent project"). Pure functions only: before / after project + scene in, an adapted scene and a plain account out. Nothing here touches a store or the DOM.
//   adaptToTank(S, next, opts)   the tank's dimensions changed: the SAME pieces are scaled, repositioned and (plants only, only when the new floor crowds them) thinned.
//                                Mutates `S` like rescaleTank, which it calls first. Animals are never added, removed or resized.
//   adaptScene(S, next, opts)    the same on a copy: { scene, report }
//   stockingChange(before, after) the stocking re-assessed in the new tank, with a named warning when it is over
//   hasDesign(S, b)              does the scene hold something a guided step must not delete (pieces, animals, a chosen tank, a look)?
//   handOff(current, generated)  the Guided hand-off to the editor as an UPDATE: a new look replaces the pieces and the background, never the tank, the gear or the animals
//   lookUnchanged(b, ...)        re-choosing the look already in the editor changes nothing (hand edits survive)
//   suggestedAnimals(b, tank)    the look's own focal animals as SUGGESTIONS (never silently the roster)
//   reevaluate(input)            one call for the UI: the adapted scene, what was kept, what changed, the conflicts and warnings
import { getSpecies } from '../data/species';
import { withDefaultLid } from '../data/lidNeed';
import { defaultSetup } from './defaults';
import { getItem, type Brief, type Stocked, valueOf, visionOf } from './brief';
import { itemDims } from './items';
import { rescaleTank, volume } from './physics';
import { archetype } from './archetypes';
import { focalAnimals } from './recipes';
import { getTankModel } from '../data/tanks';
import { footprint, normTank } from './shape';
import { isOver, plural, stockingOf } from './stocking';
import { conflictsOf, reevalInput, type Conflict, type ReevalInput } from './project';
import type { AnimalCount } from './tankfit';
import { placeNew } from './scatter';
import { rng } from '../art/paint';
import { pickOfStock, sexFish, totalOf, writePairs, type Pk } from '../ui/stockPlanLogic';
import type { Fish, Item, Tank, TankSetup } from './types';

const sameTank = (a: Tank, b: Tank) => a.L === b.L && a.D === b.D && a.H === b.H && (a.shape ?? 'rect') === (b.shape ?? 'rect');
const isPlant = (it: Item) => it.kind === 'plant' || it.kind === 'artificial';
const r1 = (n: number) => Math.round(n * 10) / 10;
const galOf = (T: Tank) => r1(volume(T).gallons);
const nameOf = (id: string) => getSpecies(id)?.name ?? id;

// ---------------------------------------------------------------------------------------------------------------- adapting the scene
export interface AdaptReport {
  /** the tank before and after, gallons */
  fromGal: number; toGal: number;
  /** footprint area ratio (after / before) and the size factor applied to hardscape (never above 1: a bigger tank keeps its pieces as they are) */
  footprintRatio: number; factor: number;
  /** pieces repositioned onto the new footprint, hardscape pieces scaled, plants thinned (named) */
  moved: number; scaled: number; thinned: { id: number; variant: string }[];
  /** one plain sentence per consequence, for the UI */
  lines: string[];
}
export interface AdaptOptions { /** plants may be thinned when the smaller floor crowds them (default true; a slider drag passes false) */ thin?: boolean }
const NOOP = (T: Tank): AdaptReport => ({ fromGal: galOf(T), toGal: galOf(T), footprintRatio: 1, factor: 1, moved: 0, scaled: 0, thinned: [], lines: [] });

/** The tank's dimensions changed from `S.tank` to `next`: keep every piece and adapt it, the smallest change that still fits.
 *  Positions follow the footprint (rescaleTank); hardscape keeps its share of the floor (scaled by sqrt of the area ratio when the floor shrinks, untouched when it grows);
 *  what rests on a piece rides with it; plants keep their height unless taller than the new tank; plants are thinned to keep each kind's share of the floor (n x the area ratio, never the last of a kind), the most crowded first. Painted patches scale with the floor. Animals are repositioned proportionally and never changed. */
export function adaptToTank(S: TankSetup, next: Tank, opts: AdaptOptions = {}): AdaptReport {
  const old = { ...S.tank }, nt = normTank(next);
  if (sameTank(old, nt)) { rescaleTank(S, nt); return NOOP(old); }   // same size: only the shape's own settings (sides, bow depth, ...) can differ
  const ra = (footprint(nt).area || 1) / (footprint(old).area || 1), f = ra < 1 ? Math.sqrt(ra) : 1;
  const rl = nt.L / old.L, rd = nt.D / old.D;
  rescaleTank(S, nt);
  const rep: AdaptReport = { fromGal: galOf(old), toGal: galOf(S.tank), footprintRatio: ra, factor: f, moved: S.items.length, scaled: 0, thinned: [], lines: [] };
  for (const it of S.items) {
    if (!isPlant(it) && f < 1) { it.size = Math.round(it.size * f); rep.scaled++; }
    if (f < 1 && it.lift > 1) it.lift = Math.round(it.lift * f);
    if (isPlant(it) && it.spread && f < 1) it.spread = Math.round(it.spread * f);
    const h = itemDims(it)[1] + Math.max(0, it.lift), cap = S.tank.H * (isPlant(it) ? 1 : 0.95);
    if (h > cap) it.size = Math.max(1, Math.round(it.size * cap / h));   // taller than the new tank: shrunk to fit, not cut off
  }
  for (const p of S.patches ?? []) {
    for (let i = 0; i + 1 < p.path.length; i += 2) { p.path[i] = Math.round(p.path[i] * rl); p.path[i + 1] = Math.round(p.path[i + 1] * rd); }
    if (p.cuts) for (let i = 0; i + 2 < p.cuts.length; i += 3) { p.cuts[i] = Math.round(p.cuts[i] * rl); p.cuts[i + 1] = Math.round(p.cuts[i + 1] * rd); p.cuts[i + 2] = Math.round(p.cuts[i + 2] * f); }
    if (f < 1) p.size = Math.round(p.size * f);
  }
  if ((opts.thin ?? true) && ra < 1) rep.thinned = thinPlants(S, ra);
  const pieces = S.items.filter(it => !isPlant(it)).length, plants = S.items.filter(isPlant).length;
  rep.lines.push(`Tank ${rep.fromGal} gal to ${rep.toGal} gal.`);
  if (pieces || plants) rep.lines.push(`The same ${pieces ? `${plural(pieces, 'hardscape piece')}${plants ? ' and ' : ''}` : ''}${plants ? plural(plants + rep.thinned.length, 'plant') : ''} were repositioned onto the new floor${f < 1 ? `, hardscape scaled to ${Math.round(f * 100)} %` : ''}.`);
  if (rep.thinned.length) rep.lines.push(`The new floor is ${Math.round((1 - ra) * 100)} % smaller, so ${plural(rep.thinned.length, 'plant')} ${rep.thinned.length > 1 ? 'were' : 'was'} thinned out (${plural([...new Set(rep.thinned.map(t => t.variant))].length, 'kind')} kept).`);
  return rep;
}
function thinPlants(S: TankSetup, ratio: number): { id: number; variant: string }[] {
  // each kind keeps its share of the floor: n x area ratio plants (at least one), the most crowded ones go first (nearest neighbour, then the smaller, then the later one)
  const out: { id: number; variant: string }[] = [], kinds = new Map<string, Item[]>();
  for (const it of S.items) if (isPlant(it)) kinds.set(it.variant, [...(kinds.get(it.variant) ?? []), it]);
  for (const [variant, all] of kinds) {
    let have = [...all]; const keep = Math.max(1, Math.round(all.length * ratio));
    while (have.length > keep) {
      const near = (p: Item) => Math.min(...have.filter(q => q !== p).map(q => Math.hypot(q.x - p.x, q.depth - p.depth)));
      const drop = [...have].sort((a, b) => near(a) - near(b) || a.size - b.size || b.id - a.id)[0];
      have = have.filter(p => p !== drop); out.push({ id: drop.id, variant });
    }
  }
  const gone = new Set(out.map(o => o.id)); S.items = S.items.filter(it => !gone.has(it.id));
  return out;
}
/** `adaptToTank` on a copy. */
export function adaptScene(S: TankSetup, next: Tank, opts: AdaptOptions = {}): { scene: TankSetup; report: AdaptReport } {
  const scene = structuredClone(S); return { scene, report: adaptToTank(scene, next, opts) };
}

// ---------------------------------------------------------------------------------------------------------------- stocking in the new tank
export interface StockChange {
  animals: { species: string; name: string; n: number }[];
  /** fullness before and after, percent (the larger of space and filtration, as Stocking.loadPercent) */
  was: number; now: number; over: boolean;
  /** a NAMED warning when the animals are over for the new tank, else nothing: the roster is never changed to make it go away */
  warning?: string;
}
const pct = (p: number) => p === Infinity ? 999 : Math.round(p);
export function stockingChange(before: TankSetup, after: TankSetup): StockChange {
  const by = new Map<string, number>(); for (const f of after.fish) by.set(f.species, (by.get(f.species) ?? 0) + 1);
  const animals = [...by].map(([species, n]) => ({ species, name: nameOf(species), n }));
  if (!after.fish.length) return { animals, was: 0, now: 0, over: false };
  const b = stockingOf(before), a = stockingOf(after), over = isOver(a.loadPercent);
  const warning = over ? `${animals.map(x => plural(x.n, x.name)).join(', ')}: stocking is ${pct(a.loadPercent)} % in the ${galOf(after.tank)} gal tank (it was ${pct(b.loadPercent)} % in ${galOf(before.tank)} gal). ${a.reasons[0] ?? ''} Your animals are unchanged; a bigger tank, or fewer animals, settles it.`.replace(/\s+/g, ' ').trim() : undefined;
  return { animals, was: pct(b.loadPercent), now: pct(a.loadPercent), over, ...(warning ? { warning } : {}) };
}

// ---------------------------------------------------------------------------------------------------------------- the roster, reconciled (lane GS7)
/** Make the scene's animals match the roster, per species: the first `total` animals already there stay (same ids, positions, names), missing ones are added (unplaced, ids returned),
 *  extra ones leave, a species no longer on the roster leaves, and the sexes and pairings are written from the picks (males, then females, then unsexed). Mutates `T.fish` / `T.pairs`. */
export function reconcileFish(T: Pick<TankSetup, 'fish' | 'pairs'>, picks: readonly Pk[]): { added: Set<number>; removed: Set<string> } {
  let next = Math.max(0, ...T.fish.map(f => f.id)) + 1;
  const keep: Fish[] = [], added = new Set<number>(), on = new Set(picks.filter(p => getSpecies(p.id) && totalOf(p) > 0).map(p => p.id));
  for (const p of picks) {
    if (!getSpecies(p.id)) continue;
    const have = T.fish.filter(f => f.species === p.id).slice(0, totalOf(p));
    while (have.length < totalOf(p)) { const f: Fish = { id: next++, species: p.id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }; have.push(f); added.add(f.id); }
    sexFish(have, p);
    keep.push(...have);
  }
  const removed = new Set(T.fish.filter(f => !on.has(f.species)).map(f => f.species));
  T.fish = keep;
  writePairs(T, picks as Pk[]);
  return { added, removed };
}
/** The animals of a young pick at the size picked (S228), females at the same share. Call after the animals are placed. */
export function stageFish(T: Pick<TankSetup, 'fish'>, picks: readonly Pk[]): void {
  for (const p of picks) { const sp = getSpecies(p.id); if (sp && p.tl) for (const f of T.fish) if (f.species === p.id) f.tl = Math.round((f.sex === 'f' && sp.female ? sp.female.tl : sp.tl) * p.tl / sp.tl); }
}
/** The roster of the brief reconciled into a scene in place: counts and sexes match exactly, the new animals are placed among their mates, nobody who stays moves. */
export function reconcileRoster(T: TankSetup, stock: readonly Stocked[]): { added: number; removed: number; species: string[] } {
  const picks = stock.map(pickOfStock), was = T.fish.length, { added } = reconcileFish(T, picks);
  if (added.size) placeNew(T, rng(7919 + added.size), added);
  stageFish(T, picks);
  return { added: added.size, removed: Math.max(0, was + added.size - T.fish.length), species: [...new Set(T.fish.map(f => f.species))] };
}

// ---------------------------------------------------------------------------------------------------------------- is there anything to keep?
/** Whether the scene holds something a guided step must not delete: pieces, painted patches, animals, a catalogue tank, or a look the brief names. A pristine scene has nothing to lose. */
export function hasDesign(S: TankSetup, b?: Brief): boolean {
  const v = b ? visionOf(b) : undefined;
  return S.items.length > 0 || (S.patches?.length ?? 0) > 0 || S.fish.length > 0 || !!S.product || !!v?.renderRecipe || !!(b && valueOf(b, 'animals.stock')?.length);
}
/** The look in the editor already is the one asked for (same archetype, density stop and tank model): re-choosing it changes nothing, so hand edits survive. */
export function lookUnchanged(S: TankSetup, b: Brief, pick: { archetypeId?: string; density?: string; densityStop?: number }, tankModel?: string): boolean {
  const v = visionOf(b);
  if (!S.items.length || !v.renderRecipe || !v.archetypeId || v.archetypeId !== pick.archetypeId) return false;
  if ((v.densityStop ?? v.density) !== (pick.densityStop ?? pick.density)) return false;
  return !tankModel || !S.product?.model || S.product.model === tankModel;
}

// ---------------------------------------------------------------------------------------------------------------- the Guided hand-off as an update
/** The fields a look owns: its pieces, painted patches, ground, background and composition. Everything else (tank, gear, lid, stand, animals, the brief, the camera) belongs to the project. */
const LOOK_FIELDS = ['items', 'patches', 'substrate', 'terrain', 'layout', 'backdrop', 'wall', 'grow', 'condition'] as const satisfies readonly (keyof TankSetup)[];
/** Whether the scene's back-glass background is the look's to replace: a bare tank's (none), the factory default with no look picked yet, or exactly what the previous look drew. A background
 *  the person picked in the editor (another colour, a picture) never is, and uploaded pictures are never touched. */
export function lookOwnsBackground(S: TankSetup, b?: Brief): boolean {
  if (S.render.bgImages.length) return false;
  const prev = b ? visionOf(b).renderRecipe : undefined, r = S.render;
  if (prev?.bg) return r.bg === prev.bg && (r.bg !== 'custom' || r.bgColor === prev.bgColor);
  return r.bg === 'none' || (r.bg === defaultSetup().render.bg && r.bgSides.length === 1 && r.bgSides[0] === 'back');
}
export interface HandOff {
  scene: TankSetup;
  /** true when nothing existed to keep and the generated scene was taken whole (minus the look's own animals) */
  fresh: boolean;
  kept: string[]; changed: string[];
  /** a welfare / stocking warning the change raised (lane GS7): shown, never a reason to block the hand-off */
  warnings: string[];
}
/** The hand-off from a guided look to the editor, as an UPDATE of the scene that is there. With nothing to keep the generated scene is taken whole; with a design in place only
 *  the look's fields come from the generated scene (the tank, its gear and the roster stay), and a different tank adapts the roster instead of regenerating it. The generated
 *  scene's own animals are SUGGESTIONS: they join the roster only when `accept` names their species (the person picked them), never silently.
 *  `current` is not mutated. */
export function handOff(current: TankSetup, generated: TankSetup, opts: {
  /** 'look' (the only mode today): keep tank, gear and roster, swap the look. Reserved: a future 'install' mode (a whole candidate from Explore Complete Setups, "Make This Mine") would take the
   *  snapshot verbatim, confirm before replacing a design, and be one undo step; add it as another `mode` here, the callers need not change. */
  mode?: 'look';
  accept?: readonly string[]; brief?: Brief;
  /** the look is an open-top one (lane OG1, scene/openTop.ts): it is drawn and stocked without a lid on purpose, so none is added (lane LB1) */
  openTop?: boolean;
  /** the roster the scene's animals must match exactly (counts, sexes, pairings; lane GS7). Default: the brief's LOCKED roster, when `accept` names every one of its species (the Animals
   *  First hand-off passes the roster's species; a Look First hand-off does not, so its editor roster is only added to). */
  roster?: readonly Stocked[];
} = {}): HandOff {
  const accept = new Set(opts.accept ?? []), suggested = generated.fish.filter(f => !accept.has(f.species));
  const gen = structuredClone(generated); gen.fish = gen.fish.filter(f => accept.has(f.species));
  if (!hasDesign(current, opts.brief)) return { scene: opts.openTop ? gen : withDefaultLid(gen, opts.brief), fresh: true, kept: [], warnings: [], changed: [suggested.length ? `The look's own animals (${[...new Set(suggested.map(f => nameOf(f.species)))].join(', ')}) are suggestions, not part of your stocking.` : ''].filter(Boolean) };
  const out = structuredClone(current), kept: string[] = [], changed: string[] = [], stock = opts.roster ?? lockedRosterFor(opts.brief, accept), warnings: string[] = [];
  const animalsKept = () => `Animals: ${[...new Set(out.fish.map(f => f.species))].map(s => plural(out.fish.filter(f => f.species === s).length, nameOf(s))).join(', ')}`;
  if (out.fish.length && !stock?.length) kept.push(animalsKept());
  if (!sameTank(out.tank, gen.tank)) { const rep = adaptToTank(out, gen.tank, { thin: false }); changed.push(...rep.lines); out.product = gen.product ?? out.product; }
  else kept.push(`Tank: ${galOf(out.tank)} gal`);
  for (const k of LOOK_FIELDS) (out as unknown as Record<string, unknown>)[k] = structuredClone(gen[k]);
  changed.push('The look (hardscape, plants, ground, background) was replaced by the one you picked.');
  // the background on the back glass is part of the look (lane LB1): the picture the person chose from shows it, so the editor must open with it. A background they picked themselves is theirs.
  if (lookOwnsBackground(out, opts.brief)) { out.render = { ...out.render, bg: gen.render.bg, bgSides: [...gen.render.bgSides] }; if (gen.render.bgColor) out.render.bgColor = gen.render.bgColor; else delete out.render.bgColor; }
  // a generated setup comes with a lid unless the person chose none (lane LB1)
  if (!opts.openTop) withDefaultLid(out, opts.brief);
  if (kept.length < 2) kept.push('Gear, lid, stand and limits');
  let next = Math.max(0, ...out.fish.map(f => f.id)) + 1;
  const had = new Set(out.fish.map(f => f.species));
  for (const f of gen.fish) if (!had.has(f.species)) out.fish.push({ ...f, id: next++ });   // animals picked in the guided step join the roster
  // the roster the person set (Animals First, GS7): the scene's animals match it exactly, whoever stays keeps their place
  if (stock?.length) {
    const was = countsOf(current.fish), r = reconcileRoster(out, stock), now = countsOf(out.fish);
    const diff = [...new Set([...was.keys(), ...now.keys()])].map(sp => ({ sp, d: (now.get(sp) ?? 0) - (was.get(sp) ?? 0) })).filter(x => x.d);
    if (out.fish.length) kept.push(animalsKept());
    if (diff.length) changed.push(`Animals matched to your roster: ${diff.map(x => `${x.d > 0 ? '+' : '-'}${Math.abs(x.d)} ${nameOf(x.sp)}`).join(', ')}.`);
    if (r.added || r.removed) { const w = stockingChange(current, out).warning; if (w) { warnings.push(w); changed.push(w); } }
  }
  return { scene: out, fresh: false, kept, changed, warnings };
}

const countsOf = (fish: readonly Fish[]) => { const m = new Map<string, number>(); for (const f of fish) m.set(f.species, (m.get(f.species) ?? 0) + 1); return m; };
/** The brief's locked roster, when `accept` names every species on it (the person's own roster travels with the hand-off); else none. */
function lockedRosterFor(b: Brief | undefined, accept: ReadonlySet<string>): Stocked[] | undefined {
  const it = b && getItem(b, 'animals.stock');
  if (!it || it.off || it.status !== 'locked' || !it.value.length || !it.value.every(x => accept.has(x.species))) return undefined;
  return it.value;
}

/** The look's own focal animals, for the Suitable Animals step to OFFER: derived (nothing is stored), minus what is already in the roster. */
export function suggestedAnimals(b: Brief, tankModel?: string): AnimalCount[] {
  const a = archetype(visionOf(b).archetypeId ?? ''), m = tankModel ? getTankModel(tankModel) : undefined;
  if (!a || !m) return [];
  const have = new Set((valueOf(b, 'animals.stock') ?? []).map(s => s.species));
  return focalAnimals(a, m).filter(x => !have.has(x.species));
}

// ---------------------------------------------------------------------------------------------------------------- one call for the UI
export interface ReevalRequest {
  before: Brief; after: Brief;
  /** the scene as it is now (not mutated) */
  scene: TankSetup;
  /** the new tank, when the change is a different enclosure or new dimensions */
  tank?: Tank;
  thin?: boolean;
}
export interface Warning { id: string; severity: 'hard' | 'advice'; text: string }
export interface ReevalResult {
  /** the scene after the change: the same pieces, adapted; with no tank change, the scene itself */
  scene: TankSetup;
  /** what carried over untouched, in plain sentences */
  kept: string[];
  /** what the change did to the design, in plain sentences (empty when nothing moved) */
  changed: string[];
  /** every conflict open after the change (a kept choice that no longer fits is listed with fixes, never dropped), and the warnings to show */
  conflicts: Conflict[]; warnings: Warning[];
  adapt?: AdaptReport; stock?: StockChange; input: ReevalInput;
}
/** The project changed upstream (a tank, a limit, the animals, the look): keep the design, adapt what the change touches by the smallest amount, re-assess the stocking, and name every
 *  conflict and warning. The roster in the scene and the brief is never edited here. */
export function reevaluate(q: ReevalRequest): ReevalResult {
  const input = reevalInput(q.before, q.after), scene = structuredClone(q.scene);
  let adapt: AdaptReport | undefined, stock: StockChange | undefined;
  const changed: string[] = [], kept: string[] = [], warnings: Warning[] = [];
  if (q.tank && !sameTank(scene.tank, q.tank)) { adapt = adaptToTank(scene, q.tank, { thin: q.thin }); changed.push(...adapt.lines); }
  if (scene.fish.length && (adapt || input.fields.includes('animals'))) {
    stock = stockingChange(q.scene, scene);
    if (stock.warning) warnings.push({ id: 'stocking-over', severity: 'hard', text: stock.warning });
  }
  const by = new Map<string, number>(); for (const f of scene.fish) by.set(f.species, (by.get(f.species) ?? 0) + 1);
  if (by.size) kept.push(`Animals: ${[...by].map(([s, n]) => plural(n, nameOf(s))).join(', ')} (unchanged)`);
  const v = visionOf(q.after), a = archetype(v.archetypeId ?? '');
  if (a) kept.push(`Look: ${a.name}${v.density ? `, ${v.density}` : ''}`);
  if (scene.items.length && !adapt) kept.push(`${scene.items.length} pieces and plants`);
  const conflicts = conflictsOf(q.after, scene.product ? { product: scene.product } : undefined);
  for (const c of conflicts) warnings.push({ id: c.id, severity: c.severity, text: c.text });
  return { scene, kept, changed, conflicts, warnings, ...(adapt ? { adapt } : {}), ...(stock ? { stock } : {}), input };
}
