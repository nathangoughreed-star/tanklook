// The one project state of Guided Setup Rev 03 (lane GS2, 2026-11-02; research/design/guided-setup-rev03.md sections 2, 5 and 8). Animals First and Look First
// are two ORDERS of decisions on this one state, never modes: switching the route keeps everything. Pure data and selectors, no UI.
// It extends the setup brief (scene/brief.ts), it is not a parallel model: the state IS a Brief. Everything the items already say is read from them
// (limits = constraints, status hard / preference = hard / flexible, `constraints.existingTank` / `constraints.owned` = equipment, `animals.stock` =
// the animals, `vision` = world / water / family / archetype / density / scene recipe); only what they cannot say lives in `brief.project` (world 'any',
// route, "from scratch", skipped steps, Required / Available per item, hand-measured tank dimensions). Old saves have no `project` and read with the
// meaning they always had.
//   projectOf(b)               the whole state as one read-only view (what the UI renders)
//   provisionalEnclosure(b)    a labelled stand-in enclosure from known dimensions, else space / budget / roster minimums, else an editable example
//   enclosureOf(b)             the enclosure the design stands on: owned-required > chosen > owned-available > provisional
//   assumptionsInUse(b)        which unknowns the design is currently filled in for by assumptions, so the UI can name them
//   unresolved(b)              remaining decisions (by route) and open conflicts, one list
//   applyChange(b, patch)      change anything upstream; every downstream pick is KEPT and the conflicts it causes are listed, never silently dropped
// A skipped constraint is UNKNOWN: absent in the view, never 0 and never Infinity. Experience is advisory only (it informs guidance, it never blocks a pick).
import type { HabitatDirection } from './discoveryTypes';
import { getSpecies } from '../data/species';
import { getTankModel, variantUsd, type TankModel } from '../data/tanks';
import { archetype, family, type Density, type Env, type Water } from './archetypes';
import {
  clearItem, equipUseOf, getItem, projectExtras, rangeOf, setFlex, setItem, setProjectExtras, setRange, setStatus, setVision, valueOf, visionOf,
  type Brief, type DimsIn, type EquipKey, type NumLimitId, type ProjectExtras, type Range, type Route, type OnboardingStep, type SkipStep, type Stocked, type Use, type Vision, type World,
} from './brief';
import { IN } from './physics';
import { spaceFit } from './space';
import { stockingGroupMinimum } from './groupMin';
import { catalogueSizes } from './tankfit';
import type { OwnedKey, OwnedMap } from '../demand/suggest';
import type { SpaceLimit } from './types';

// ---------------------------------------------------------------------------------------------------------------- constraints
export type ConstraintId = 'space' | 'startup' | 'ongoing' | 'setup' | 'care' | 'experience';
export const CONSTRAINT_IDS: readonly ConstraintId[] = ['space', 'startup', 'ongoing', 'setup', 'care', 'experience'];
export type ConstraintKind = 'hard' | 'flexible';
/** Nathan's Q3 (2026-11-02): what a typed limit is when the person does not say, per constraint. Space is Firm (hard); startup budget, ongoing budget, setup time and care time are
 *  Flexible targets unless the person marks them hard; experience is advisory (guidance only, it never blocks a pick). */
export const DEFAULT_LIMIT_KINDS: Record<ConstraintId, ConstraintKind | 'advisory'> = { space: 'hard', startup: 'flexible', ongoing: 'flexible', setup: 'flexible', care: 'flexible', experience: 'advisory' };
/** The kind a limit takes when the person gives a value and does not say (advisory reads as flexible: the UI marks experience as advice). */
export const defaultKindOf = (id: ConstraintId): ConstraintKind => DEFAULT_LIMIT_KINDS[id] === 'hard' ? 'hard' : 'flexible';
/** What an owned item is when the person does not say (pending Nathan's confirmation of the one-tap Required toggle). */
export const DEFAULT_OWNED_USE: Use = 'available';
/** Inches (the brief stores the footprint in mm). */
export interface SpaceIn { w: number; d: number; h?: number }
export type ConstraintValue = number | SpaceIn;
/** Known: a value and a kind. Unknown (skipped, or never given): `unknown: true` and nothing else. Never 0, never Infinity. */
export type Constraint =
  | { id: ConstraintId; unknown: true }
  | { id: ConstraintId; unknown: false; kind: ConstraintKind; value?: ConstraintValue; /** the lower bound of a range limit ("at least"), when there is one */ min?: number;
      /** experience: guidance and risk only, it never prohibits a choice */ advisory?: true };
export const CONSTRAINT_LABEL: Record<ConstraintId, string> = { space: 'Space', startup: 'Startup budget', ongoing: 'Ongoing budget', setup: 'Setup time', care: 'Care time', experience: 'Experience' };
/** Where each constraint lives in the brief. space is a footprint; experience a level; the rest are range limits. */
const ITEM_OF = { space: 'constraints.maxSpace', startup: 'constraints.budget', ongoing: 'constraints.monthly', setup: 'constraints.setupHours', care: 'constraints.careMin', experience: 'preferences.experience' } as const;
const NUM_OF: Partial<Record<ConstraintId, NumLimitId>> = { startup: 'constraints.budget', ongoing: 'constraints.monthly', setup: 'constraints.setupHours', care: 'constraints.careMin' };
const toIn = (mm: number) => Math.round(mm / IN * 10) / 10, toMm = (inch: number) => Math.round(inch * IN);

/** One constraint as the state holds it. */
export function constraintOf(b: Brief, id: ConstraintId): Constraint {
  const item = getItem(b, ITEM_OF[id]);
  if (!item || item.off) return { id, unknown: true };
  if (id === 'experience') return { id, unknown: false, kind: 'flexible', advisory: true, value: item.value as number };
  const kind: ConstraintKind = item.status === 'hard' && !item.flex ? 'hard' : 'flexible';
  if (id === 'space') { const v = (item as { value?: SpaceLimit }).value; return v ? { id, unknown: false, kind, value: { w: toIn(v.w), d: toIn(v.d), ...(v.h ? { h: toIn(v.h) } : {}) } } : { id, unknown: true }; }
  const r = rangeOf(b, NUM_OF[id]!);
  return r.max === undefined && r.min === undefined ? { id, unknown: true } : { id, unknown: false, kind, ...(r.max !== undefined ? { value: r.max } : {}), ...(r.min !== undefined ? { min: r.min } : {}) };
}
export const constraintsOf = (b: Brief): Record<ConstraintId, Constraint> => Object.fromEntries(CONSTRAINT_IDS.map(id => [id, constraintOf(b, id)])) as Record<ConstraintId, Constraint>;
const known = (b: Brief, id: ConstraintId) => !constraintOf(b, id).unknown;

/** Give a constraint a value and a kind. Hard = a valid design must satisfy it; flexible = a target that ranks designs. A number sets the upper bound, a { min, max } both. */
export function setConstraint(b: Brief, id: ConstraintId, value: number | Range | SpaceIn, kind: ConstraintKind = defaultKindOf(id)): Brief {
  const status = kind === 'hard' ? 'hard' : 'preference';
  let out: Brief;
  if (id === 'experience') out = setItem(b, 'preferences.experience', Math.max(0, Math.min(2, Math.round(value as number))) as 0 | 1 | 2, 'preference');
  else if (id === 'space') { const s = value as SpaceIn; out = setItem(b, 'constraints.maxSpace', { w: toMm(s.w), d: toMm(s.d), ...(s.h ? { h: toMm(s.h) } : {}) }, status); out = setFlex(out, 'constraints.maxSpace', false); }
  else { const r = typeof value === 'number' ? { max: value } : value as Range; out = setRange(b, NUM_OF[id]!, r, status); out = setFlex(out, NUM_OF[id]!, false); }
  return out;
}
/** Change only the kind of a known constraint (hard <-> flexible); an unknown one stays unknown. */
export function setConstraintKind(b: Brief, id: ConstraintId, kind: ConstraintKind): Brief {
  if (id === 'experience' || constraintOf(b, id).unknown) return b;
  return setFlex(setStatus(b, ITEM_OF[id], kind === 'hard' ? 'hard' : 'preference'), ITEM_OF[id], false);
}
/** Skip one constraint: it goes back to UNKNOWN (the value is removed, not zeroed). */
export const skipConstraint = (b: Brief, id: ConstraintId): Brief => clearItem(b, ITEM_OF[id]);
export const setLimitKind = setConstraintKind;
/** The person skipped a whole onboarding step: it counts as answered, what it would have set stays unknown, and it can be filled in later. */
export function markSkipped(b: Brief, step: SkipStep): Brief { const x = projectExtras(b); return setProjectExtras(b, { ...x, skipped: [...new Set([...(x.skipped ?? []), step])] }); }
export const skipStep = markSkipped;
const unskip = (x: ProjectExtras, step: SkipStep): ProjectExtras => { const k = (x.skipped ?? []).filter(s => s !== step); const { skipped: _s, ...rest } = x; return k.length ? { ...rest, skipped: k } : rest; };

// ---------------------------------------------------------------------------------------------------------------- equipment
export type EquipGroup = 'tank' | 'filter' | 'heater' | 'light' | 'other';
export type EquipKind = 'tank' | 'gear' | 'supply';
const SUPPLY_KEYS: readonly EquipKey[] = ['testkit', 'siphon', 'net', 'conditioner', 'thermometer', 'bucket'];
export interface EquipItem {
  key: EquipKey; group: EquipGroup; use: Use;
  /** tank / hardware (filter, heater, light, skimmer, ...) / supplies and accessories (test kit, net, siphon, ...) */
  kind: EquipKind;
  /** the catalogue product id when the person named one (not 'care' / 'unknown') */
  product?: string;
  /** owned gear: a catalogue product id, 'care' (I don't care) or 'unknown' (I don't know) */
  pick?: string;
  /** the tank: a catalogue model and / or the dimensions the person measured */
  model?: string; dimsIn?: DimsIn;
}
export type EquipmentStatus = 'unanswered' | 'scratch' | 'skipped' | 'listed';
export interface Equipment {
  /** 'scratch' ("Starting from scratch") is an answer of its own, not "not answered"; 'skipped' is "Skip for now" */
  status: EquipmentStatus; items: EquipItem[];
}
const groupOfKey = (k: EquipKey): EquipGroup => k === 'tank' || k === 'filter' || k === 'heater' || k === 'light' ? k : 'other';
/** The outer size of a catalogue tank in inches. */
export const modelDimsIn = (m: TankModel): DimsIn => ({ L: toIn(m.outer.L), D: toIn(m.outer.D), H: toIn(m.outer.H) });

/** The owned tank's size: the catalogue model's, else what the person measured. */
function ownedTankDims(b: Brief): { dimsIn?: DimsIn; model?: string } {
  const t = getItem(b, 'constraints.existingTank'); if (!t || t.off) return {};
  const m = t.value.model ? getTankModel(t.value.model) : undefined;
  return { ...(m ? { model: m.id } : {}), ...(m ? { dimsIn: modelDimsIn(m) } : projectExtras(b).tankDims ? { dimsIn: projectExtras(b).tankDims } : {}) };
}
export function equipmentOf(b: Brief): Equipment {
  const items: EquipItem[] = [], x = projectExtras(b), t = getItem(b, 'constraints.existingTank');
  if (t && !t.off) items.push({ key: 'tank', group: 'tank', kind: 'tank', use: equipUseOf(b, 'tank'), ...ownedTankDims(b) });
  const owned = valueOf(b, 'constraints.owned') ?? {};
  for (const [k, pick] of Object.entries(owned) as [OwnedKey, string][]) items.push({ key: k, group: groupOfKey(k), kind: SUPPLY_KEYS.includes(k) ? 'supply' : 'gear', use: equipUseOf(b, k), pick, ...(pick !== 'care' && pick !== 'unknown' ? { product: pick } : {}) });
  const status: EquipmentStatus = items.length ? 'listed' : x.scratch ? 'scratch' : x.skipped?.includes('equipment') ? 'skipped' : 'unanswered';
  return { status, items };
}
/** What the design must be built around: only the items marked Required (ownership alone never counts). */
export const requiredEquipment = (b: Brief): EquipItem[] => equipmentOf(b).items.filter(i => i.use === 'required');
/** Owned things that only count toward savings (alternatives may still be recommended). */
export const availableEquipment = (b: Brief): EquipItem[] => equipmentOf(b).items.filter(i => i.use === 'available');

/** Record that the person has something. `use` is explicit and defaults to 'available': owning it never makes it Required. Listing anything ends "from scratch" and a skipped step. */
export function setEquipment(b: Brief, key: EquipKey, d: { use?: Use; pick?: string; model?: string; dimsIn?: DimsIn } = {}): Brief {
  const use = d.use ?? DEFAULT_OWNED_USE;
  let out = b;
  if (key === 'tank') {
    out = setItem(clearItem(out, 'equipment.tank'), 'constraints.existingTank', d.model ? { model: d.model } : {}, use === 'required' ? 'locked' : 'preference');
  } else {
    out = setItem(out, 'constraints.owned', { ...(valueOf(out, 'constraints.owned') ?? {}), [key]: d.pick ?? 'unknown' } as OwnedMap, 'preference');
  }
  let x = projectExtras(out);
  const { scratch: _s, ...rest } = unskip(x, 'equipment');
  x = { ...rest, use: { ...(x.use ?? {}), [key]: use } };
  if (key === 'tank') { const { tankDims: _t, ...r2 } = x; x = !d.model && d.dimsIn ? { ...r2, tankDims: d.dimsIn } : r2; }
  return setProjectExtras(out, x);
}
/** Required <-> Available for one owned thing. Required tank -> `existingTank` locked (as before); Available tank -> a plain preference, NOT locked. */
export function setOwnedUse(b: Brief, key: EquipKey, use: Use): Brief {
  if (!equipmentOf(b).items.some(i => i.key === key)) return b;
  const x = projectExtras(b);
  const out = setProjectExtras(b, { ...x, use: { ...(x.use ?? {}), [key]: use } });
  return key === 'tank' ? setStatus(out, 'constraints.existingTank', use === 'required' ? 'locked' : 'preference') : out;
}
export const setEquipmentUse = setOwnedUse;
/** "No new equipment" on or off (lane DX3). */
/** AB4: record (or clear) the soft habitat direction; it never locks anything. */
export function setDirection(b: Brief, d: HabitatDirection | undefined): Brief { const { direction: _d, ...x } = projectExtras(b); return setProjectExtras(b, d ? { ...x, direction: d } : x); }
export function setNoNewEquipment(b: Brief, on: boolean): Brief { const { noNewEquipment: _n, ...x } = projectExtras(b); return setProjectExtras(b, on ? { ...x, noNewEquipment: true } : x); }
/** Which owned items are Must use (obligation) and which are only available, each still owned (ownership is the owned map / existingTank, never touched here). */
export const mustUseKeys = (b: Brief): EquipKey[] => requiredEquipment(b).map(i => i.key);
export function removeEquipment(b: Brief, key: EquipKey): Brief {
  let out = b; const x = projectExtras(b), { [key]: _u, ...use } = x.use ?? {}, { tankDims: _t, ...rest } = x;
  if (key === 'tank') out = clearItem(out, 'constraints.existingTank');
  else { const { [key]: _o, ...owned } = valueOf(out, 'constraints.owned') ?? {}; out = Object.keys(owned).length ? setItem(out, 'constraints.owned', owned, 'preference') : clearItem(out, 'constraints.owned'); }
  return setProjectExtras(out, { ...(key === 'tank' ? rest : x), ...(Object.keys(use).length ? { use } : { use: undefined }) });
}
/** "Starting from scratch": the person owns nothing. Clears anything listed (a stated answer replaces it). */
export function setScratch(b: Brief): Brief {
  let out = clearItem(clearItem(b, 'constraints.existingTank'), 'constraints.owned');
  const { use: _u, tankDims: _t, ...rest } = unskip(projectExtras(out), 'equipment');
  out = setProjectExtras(out, { ...rest, scratch: true });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- world, water, route
/** The enclosure type: the answer to "what kind of world", else the environment a picked look implies (old saves), else unanswered (undefined). 'any' = Open to anything. */
export const worldOf = (b: Brief): World | undefined => projectExtras(b).world ?? visionOf(b).environment;
/** The concrete environment the design is in, when it is known (world 'any' resolves through the look picked). */
export const envOf = (b: Brief): Env | undefined => { const w = projectExtras(b).world; return w && w !== 'any' ? w : visionOf(b).environment ?? (getFamilyEnv(b)); };
const getFamilyEnv = (b: Brief): Env | undefined => { const v = visionOf(b); return (v.familyId && family(v.familyId)?.env) || (v.archetypeId && archetype(v.archetypeId)?.env) || undefined; };

/** The water type of one animal: salt, fresh, or none (a land animal). */
const waterOfSpecies = (id: string): Water | 'dry' | undefined => { const s = getSpecies(id); return !s ? undefined : s.habitat === 'land' ? 'dry' : s.salt ? 'saltwater' : 'freshwater'; };
/** The water type the animals fix, when they fix one: every swimming animal on the same side of fresh / salt (the older `animals.kinds` counts too). Mixed or none = undefined. */
export function impliedWater(b: Brief): Water | undefined {
  const set = new Set<Water>();
  for (const s of valueOf(b, 'animals.stock') ?? []) { const w = waterOfSpecies(s.species); if (w && w !== 'dry') set.add(w); }
  for (const k of valueOf(b, 'animals.kinds') ?? []) if (k === 'freshwater' || k === 'saltwater') set.add(k);
  return set.size === 1 ? [...set][0] : undefined;
}
export interface WaterState { value?: Water; /** 'asked' = the person chose it; 'animals' = the animals fix it (clownfish = saltwater), so it is not asked */ by?: 'asked' | 'animals' }
export function waterOf(b: Brief): WaterState {
  const asked = projectExtras(b).water ?? visionOf(b).waterType ?? undefined;
  if (asked) return { value: asked, by: 'asked' };
  const w = impliedWater(b); return w ? { value: w, by: 'animals' } : {};
}
/** Whether the Water step still has to be asked: an aquarium whose water neither the person nor the animals have fixed. Terrariums and paludariums never ask. */
export function needsWaterQuestion(b: Brief): boolean { const e = envOf(b); return (e === 'aquarium' || (!e && worldOf(b) === 'aquarium')) && !waterOf(b).value; }
export const routeOf = (b: Brief): Route | undefined => projectExtras(b).route;
/** Which decision comes first. Changing it keeps every other answer. */
export function setRoute(b: Brief, route: Route | undefined): Brief { const { route: _r, ...rest } = projectExtras(b); return setProjectExtras(b, route ? { ...rest, route } : rest); }
/** Answer the world. A specific world is also the environment of the look flow; 'any' leaves the look to decide. */
export function setWorld(b: Brief, world: World | undefined): Brief {
  const { world: _w, ...rest } = projectExtras(b);
  const out = setProjectExtras(b, world ? { ...rest, world } : rest), v = visionOf(out);
  return setVision(out, { ...v, ...(world && world !== 'any' ? { environment: world as Env } : {}) });
}
/** Answer the water type (null clears it, so it falls back to what the animals imply). */
export function setWater(b: Brief, water: Water | null): Brief {
  const { water: _w, ...rest } = projectExtras(b);
  const out = setProjectExtras(b, water ? { ...rest, water } : rest), { waterType: _t, ...v } = visionOf(out);
  return setVision(out, { ...v, ...(water ? { waterType: water } : {}) });
}

// ---------------------------------------------------------------------------------------------------------------- enclosure
export type EnclosureKind = 'chosen' | 'owned-required' | 'owned-available' | 'provisional';
/** Where the enclosure came from, in the UI's words: your Required tank, your Available tank, a tank TankLook suggests for the animals you picked, a provisional one (sized from space / budget, or an example), or one picked in the design. */
export type EnclosureSource = 'owned-required' | 'owned-available' | 'suggested' | 'provisional' | 'picked';
export interface Enclosure {
  kind: EnclosureKind; source: EnclosureSource;
  /** the catalogue model, when it is one */
  model?: string;
  dimsIn: DimsIn;
  /** rated US gallons (a hand-measured tank: estimated from its outer size) */
  gal: number;
  /** provisional only: 'from constraints' = sized from what is known (space, budget, the animals' minimums); 'example' = nothing is known, an editable example */
  reason?: 'from constraints' | 'example';
  /** provisional 'from constraints': what it was sized from, for the UI to name */
  basis?: ('space' | 'budget' | 'animals')[];
  /** a one-line label the UI shows as is */
  label: string;
  /** things the UI should not hide: a provisional tank that could not honour a known limit */
  notes: string[];
}
/** The starter ceiling when only space and / or budget are known: roomy enough to be forgiving, never a surprise (gallons). */
export const STARTER_CAP_GAL = 55;
/** The share of a known startup budget a tank may take when its price is known. */
export const TANK_BUDGET_SHARE = 0.35;
/** The example enclosures (catalogue ids): nothing is known, so a middling, ordinary tank the person edits. */
export const EXAMPLE_TANK = { wet: 'g29', land: 'n_exo_terra_24x18x24' } as const;
/** Outer-size estimate of rated gallons for a hand-measured tank: 0.25 in of glass each side and under the floor. */
export const galOfDims = (d: DimsIn): number => Math.round((d.L - 0.5) * (d.D - 0.5) * (d.H - 0.25) / 231 * 10) / 10;
const dimsText = (d: DimsIn) => `${d.L} x ${d.D} x ${d.H} in`;
const galText = (g: number) => `${+g.toFixed(1)} gal`;
const modelName = (m: TankModel) => m.name.replace(/\s*\(.*$/, '');
const cheapest = (m: TankModel): number | undefined => { const p = (m.variants ?? []).filter(v => !v.discontinued && v.price_kind !== 'kit').map(v => variantUsd(v)).filter((n): n is number => typeof n === 'number'); return p.length ? Math.min(...p) : undefined; };
const spaceMm = (b: Brief): SpaceLimit | undefined => getItem(b, 'constraints.maxSpace')?.off ? undefined : getItem(b, 'constraints.maxSpace')?.value;
const isLand = (b: Brief): boolean => { const ids = (valueOf(b, 'animals.stock') ?? []).map(s => s.species), e = envOf(b); return e === 'terrarium' || (e !== 'aquarium' && e !== 'paludarium' && ids.length > 0 && ids.every(i => getSpecies(i)?.habitat === 'land')); };
/** The smallest tank (gal) every stocked species' minimum group fits in, when the roster has data. */
export function rosterMinGal(b: Brief): number | undefined {
  const ids = (valueOf(b, 'animals.stock') ?? []).map(s => s.species);
  return ids.length ? stockingGroupMinimum(ids).tank?.gal : undefined;
}
const fromModel = (m: TankModel, kind: EnclosureKind, extra: Partial<Enclosure> = {}): Enclosure => ({ kind, source: kind === 'chosen' ? 'picked' : 'provisional', model: m.id, dimsIn: modelDimsIn(m), gal: m.ratedGal, label: '', notes: [], ...extra });

/** The part of the saved tank (TankSetup) the state may read: the catalogue product it was built from. */
export type SceneTank = { product?: { model?: string } };
/** A labelled stand-in enclosure for when no tank is chosen or owned. Known dimensions first are handled by enclosureOf; this uses what the constraints and roster say (space that
 *  fits, a tank under about a third of the startup budget when its price is known, at least the smallest tank the animals' minimum group fits), else an editable example. Never undefined. */
export function provisionalEnclosure(b: Brief): Enclosure {
  const land = isLand(b), cands = catalogueSizes(land), space = spaceMm(b), minGal = rosterMinGal(b);
  const bud = rangeOf(b, 'constraints.budget').max, haveSpace = known(b, 'space') && !!space, haveBudget = bud !== undefined;
  const basis: NonNullable<Enclosure['basis']> = [...(haveSpace ? ['space' as const] : []), ...(haveBudget ? ['budget' as const] : []), ...(minGal !== undefined ? ['animals' as const] : [])];
  const roomy = (c: (typeof cands)[number]) => !space || spaceFit(c.T, space).fits;
  const cheap = (c: (typeof cands)[number]) => { const p = cheapest(c.m); return bud === undefined || p === undefined || p <= bud * TANK_BUDGET_SHARE; };
  const ok = cands.filter(c => roomy(c) && cheap(c)), notes: string[] = [];
  let pick: (typeof cands)[number] | undefined;
  if (minGal !== undefined) {
    const big = (c: (typeof cands)[number]) => c.m.ratedGal >= minGal * 0.9;   // the same 10 % slack as the tank-minimum checks
    pick = ok.find(big);
    if (!pick) { pick = cands.find(big) ?? cands[cands.length - 1]; if (pick) notes.push(`The smallest tank the animals' minimum group fits in (${galText(minGal)}) does not fit every limit you gave (${[haveSpace && !roomy(pick) ? 'space' : '', haveBudget && !cheap(pick) ? 'budget' : ''].filter(Boolean).join(' and ') || 'space or budget'}).`); }
  } else if (basis.length) {
    pick = [...ok].reverse().find(c => c.m.ratedGal <= STARTER_CAP_GAL) ?? ok[0];
    if (!pick) { pick = cands[0]; notes.push('No catalogue tank fits the limits you gave; this is the smallest one.'); }
  }
  if (pick) {
    const why = basis.map(x => x === 'space' ? 'your space' : x === 'budget' ? 'your budget' : 'the animals you picked').join(' and ');
    return fromModel(pick.m, 'provisional', { reason: 'from constraints', basis, source: basis.includes('animals') ? 'suggested' : 'provisional', notes, label: `Provisional: ${modelName(pick.m)} (${dimsText(modelDimsIn(pick.m))}), sized from ${why}. You can change it any time.` });
  }
  const ex = getTankModel(land ? EXAMPLE_TANK.land : EXAMPLE_TANK.wet) ?? cands[0].m;
  return fromModel(ex, 'provisional', { reason: 'example', notes, label: `Example: ${modelName(ex)} (${dimsText(modelDimsIn(ex))}). Nothing is known yet, so this is only a starting point to edit.` });
}

/** The enclosure the design stands on: an owned tank marked Required, else the tank chosen in the design, else an owned tank marked Available, else the provisional one. */
export function enclosureOf(b: Brief, scene?: SceneTank): Enclosure {
  const own = ownedTankDims(b), ownUse = equipmentOf(b).items.find(i => i.key === 'tank')?.use;
  const ownEnc = (kind: 'owned-required' | 'owned-available'): Enclosure | undefined => {
    if (!own.dimsIn) return undefined;
    const m = own.model ? getTankModel(own.model) : undefined, gal = m ? m.ratedGal : galOfDims(own.dimsIn);
    return { kind, source: kind, ...(m ? { model: m.id } : {}), dimsIn: own.dimsIn, gal, notes: [],
      label: `${kind === 'owned-required' ? 'Your tank, required' : 'Your tank, flexible'}: ${m ? modelName(m) + ' ' : ''}${galText(gal)} (${dimsText(own.dimsIn)})` };
  };
  if (ownUse === 'required') { const e = ownEnc('owned-required'); if (e) return e; }
  const chosen = valueOf(b, 'equipment.tank')?.model, cm = chosen ? getTankModel(chosen) : undefined;
  if (cm) return fromModel(cm, 'chosen', { label: `${modelName(cm)} (${dimsText(modelDimsIn(cm))})` });
  // inside the editor the active tank IS the enclosure: a catalogue model on the scene counts as picked, ahead of an Available owned tank or a provisional one
  const sm = scene?.product?.model ? getTankModel(scene.product.model) : undefined;
  if (sm && ownUse !== 'available') return fromModel(sm, 'chosen', { label: `${modelName(sm)} (${dimsText(modelDimsIn(sm))})` });
  if (ownUse === 'available') { const e = ownEnc('owned-available'); if (e) return e; }
  return provisionalEnclosure(b);
}

// ---------------------------------------------------------------------------------------------------------------- conflicts
export type ConflictKind = 'water-vs-animals' | 'world-vs-animals' | 'world-vs-look' | 'water-vs-look' | 'animals-vs-enclosure' | 'enclosure-vs-space' | 'tank-vs-owned';
export interface Fix { label: string; patch: ProjectPatch }
export interface Conflict {
  /** stable: the same conflict has the same id before and after a change */
  id: string; kind: ConflictKind;
  /** hard = a hard limit or the animals' welfare is broken (blocks the editor); advice = the design is kept but should be looked at */
  severity: 'hard' | 'advice';
  /** what it is about, for the UI to point at: the animals, the look, the enclosure, the water */
  subject: 'animals' | 'look' | 'enclosure' | 'water' | 'equipment';
  /** the species the conflict is about, when it is about animals (they stay in the roster; this is how the requested design names what cannot work now) */
  species?: string[];
  text: string;
  /** viable adjustments, each a patch applyChange can apply; the UI offers them, nothing is applied for the person */
  fixes: Fix[];
}
const nameOf = (id: string) => getSpecies(id)?.name ?? id;
const list = (a: string[]) => a.length > 2 ? `${a.slice(0, 2).join(', ')} and ${a.length - 2} more` : a.join(' and ');

/** Every open conflict between the picks, derived from the state (nothing is stored). Animals are never dropped to make one go away. */
export function conflictsOf(b: Brief, scene?: SceneTank): Conflict[] {
  const out: Conflict[] = [], stock = valueOf(b, 'animals.stock') ?? [], v = visionOf(b), env = envOf(b), w = waterOf(b), asked = w.by === 'asked' ? w.value : undefined;
  const ids = stock.map(s => s.species), wet = ids.filter(i => { const x = waterOfSpecies(i); return x === 'freshwater' || x === 'saltwater'; });
  // water against the animals: an asked water type (fresh / salt) against animals of the other
  if (asked === 'freshwater' || asked === 'saltwater') {
    const bad = wet.filter(i => waterOfSpecies(i) !== asked);
    if (bad.length) out.push({ id: 'water-vs-animals', kind: 'water-vs-animals', severity: 'hard', subject: 'water', species: bad,
      text: `${list(bad.map(nameOf))} ${bad.length > 1 ? 'need' : 'needs'} ${asked === 'freshwater' ? 'salt' : 'fresh'} water, not the ${asked === 'freshwater' ? 'fresh' : 'salt'} water chosen.`,
      fixes: [{ label: `Switch the water to ${asked === 'freshwater' ? 'saltwater' : 'freshwater'}`, patch: { water: asked === 'freshwater' ? 'saltwater' : 'freshwater' } },
        { label: `Take ${list(bad.map(nameOf))} out of the stocking`, patch: { animals: stock.filter(s => !bad.includes(s.species)) } }] });
  } else if (!asked && new Set(wet.map(i => waterOfSpecies(i))).size > 1)
    out.push({ id: 'water-vs-animals', kind: 'water-vs-animals', severity: 'hard', subject: 'animals', species: wet, text: 'The animals mix freshwater and saltwater species, which cannot share a tank.',
      fixes: [{ label: 'Keep only the freshwater animals', patch: { animals: stock.filter(s => waterOfSpecies(s.species) !== 'saltwater') } }, { label: 'Keep only the saltwater animals', patch: { animals: stock.filter(s => waterOfSpecies(s.species) !== 'freshwater') } }] });
  // world against the animals
  if (env === 'aquarium' || env === 'terrarium') {
    const bad = ids.filter(i => env === 'aquarium' ? waterOfSpecies(i) === 'dry' : (waterOfSpecies(i) === 'freshwater' || waterOfSpecies(i) === 'saltwater') && getSpecies(i)?.habitat === 'water');
    if (bad.length) out.push({ id: 'world-vs-animals', kind: 'world-vs-animals', severity: 'hard', subject: 'animals', species: bad,
      text: `${list(bad.map(nameOf))} ${env === 'aquarium' ? 'live on land and do not suit an aquarium' : 'live in water and do not suit a terrarium'}.`,
      fixes: [{ label: `Make it a paludarium (water and land)`, patch: { world: 'paludarium' } }, { label: `Take ${list(bad.map(nameOf))} out of the stocking`, patch: { animals: stock.filter(s => !bad.includes(s.species)) } }] });
  }
  // the look against the world and the water
  const lookEnv = [v.familyId && family(v.familyId)?.env, v.archetypeId && archetype(v.archetypeId)?.env].find(Boolean) as Env | undefined;
  const wEnv = projectExtras(b).world;
  if (wEnv && wEnv !== 'any' && lookEnv && lookEnv !== wEnv) out.push({ id: 'world-vs-look', kind: 'world-vs-look', severity: 'advice', subject: 'look',
    text: `The ${archetype(v.archetypeId ?? '')?.name ?? family(v.familyId ?? '')?.name ?? 'look'} you picked is a ${lookEnv}, and the world is now a ${wEnv}.`,
    fixes: [{ label: `Make it a ${lookEnv} again`, patch: { world: lookEnv } }, { label: 'Pick the look again (animals and the rest stay)', patch: { vision: { familyId: null, archetypeId: null } } }] });
  const lookWater = [v.familyId && family(v.familyId)?.water, v.archetypeId && archetype(v.archetypeId)?.water].find(Boolean) as Water | undefined;
  if (lookWater && w.value && lookWater !== w.value) out.push({ id: 'water-vs-look', kind: 'water-vs-look', severity: 'advice', subject: 'look',
    text: `The look you picked is a ${lookWater} look, and the water is ${w.value}${w.by === 'animals' ? ' (the animals need it)' : ''}.`,
    fixes: [{ label: 'Pick the look again (animals and the rest stay)', patch: { vision: { familyId: null, archetypeId: null } } }, ...(w.by === 'asked' ? [{ label: `Make it ${lookWater} again`, patch: { water: lookWater } }] : [])] });
  // the enclosure against the animals, the space and the owned tank. A provisional enclosure is sized from them, so it cannot conflict.
  const enc = enclosureOf(b, scene);
  if (enc.kind !== 'provisional') {
    const min = rosterMinGal(b);
    if (min !== undefined && enc.gal < min * 0.9) out.push({ id: 'animals-vs-enclosure', kind: 'animals-vs-enclosure', severity: 'hard', subject: 'enclosure', species: ids,
      text: `The animals' minimum group needs about ${galText(min)}; ${enc.kind === 'owned-required' ? 'your required tank' : 'this enclosure'} is ${galText(enc.gal)}.`,
      fixes: [...(enc.kind === 'owned-required' ? [{ label: 'Treat your tank as flexible so a bigger one can be recommended', patch: { equipment: [{ key: 'tank' as const, use: 'available' as const }] } }] : [{ label: 'Let TankLook recommend a tank for these animals', patch: { tank: null } }])] });
    const sp = spaceMm(b), c = constraintOf(b, 'space');
    if (sp && !c.unknown) {
      const over = enc.dimsIn.L > toIn(sp.w) + 0.05 || enc.dimsIn.D > toIn(sp.d) + 0.05 || (!!sp.h && enc.dimsIn.H > toIn(sp.h) + 0.05);
      if (over) out.push({ id: 'enclosure-vs-space', kind: 'enclosure-vs-space', severity: c.kind === 'hard' ? 'hard' : 'advice', subject: 'enclosure',
        text: `The enclosure (${dimsText(enc.dimsIn)}) is bigger than the space (${toIn(sp.w)} x ${toIn(sp.d)}${sp.h ? ' x ' + toIn(sp.h) : ''} in), a ${c.kind} limit.`,
        fixes: [{ label: 'Treat the space as flexible', patch: { constraints: [{ id: 'space', kind: 'flexible' }] } }, ...(enc.kind === 'owned-required' ? [{ label: 'Treat your tank as flexible', patch: { equipment: [{ key: 'tank' as const, use: 'available' as const }] } }] : [{ label: 'Let TankLook pick an enclosure that fits', patch: { tank: null } }])] });
    }
  }
  const chosen = valueOf(b, 'equipment.tank')?.model, own = equipmentOf(b).items.find(i => i.key === 'tank');
  if (chosen && own?.use === 'required' && own.model && own.model !== chosen) out.push({ id: 'tank-vs-owned', kind: 'tank-vs-owned', severity: 'advice', subject: 'equipment',
    text: 'A different tank was picked than the one marked Required.', fixes: [{ label: 'Go back to your tank', patch: { tank: null } }, { label: 'Treat your tank as flexible', patch: { equipment: [{ key: 'tank', use: 'available' }] } }] });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- requested vs feasible
/** One thing the person asked for that cannot work in the design as it stands: kept as their request, with the reason and the viable adjustments (nothing is dropped). */
export interface Retained { subject: Conflict['subject']; /** what was asked for, in words */ what: string; /** why it cannot work now */ reason: string; severity: Conflict['severity']; fixes: Fix[]; conflict: string }
export interface Feasibility {
  /** what the person asked for: the roster, the look, the enclosure, the space (always the full request, whatever is feasible now) */
  requested: { animals: Stocked[]; archetype?: string; density?: Density; enclosure: Enclosure; space?: SpaceIn };
  /** what can be built as things stand: the roster minus the animals no choice of the design can house, and the enclosure the design stands on */
  feasible: { animals: Stocked[]; enclosure: Enclosure; ok: boolean };
  retained: Retained[];
}
/** Keep what was REQUESTED apart from what is currently FEASIBLE (Nathan 2026-11-02, invariant 8): an incompatible choice stays in the project as a preference with the reason it cannot work. */
export function feasibilityOf(b: Brief, scene?: SceneTank): Feasibility {
  const v = visionOf(b), animals = (valueOf(b, 'animals.stock') ?? []).map(s => ({ ...s })), cs = conflictsOf(b, scene), enclosure = enclosureOf(b, scene), sp = constraintOf(b, 'space');
  const blocked = new Set(cs.filter(c => c.severity === 'hard' && c.kind !== 'animals-vs-enclosure').flatMap(c => c.species ?? []));
  const what = (c: Conflict) => c.subject === 'animals' || c.subject === 'water' ? `${list((c.species ?? []).map(nameOf)) || 'the animals'}` : c.subject === 'look' ? `the ${archetype(v.archetypeId ?? '')?.name ?? family(v.familyId ?? '')?.name ?? 'look'} look` : c.subject === 'enclosure' ? `the ${enclosure.label.split(':')[0].toLowerCase()}` : 'your tank';
  return {
    requested: { animals, archetype: v.archetypeId, density: v.density, enclosure, ...(!sp.unknown && sp.value && typeof sp.value === 'object' ? { space: sp.value } : {}) },
    feasible: { animals: animals.filter(a => !blocked.has(a.species)), enclosure, ok: !cs.some(c => c.severity === 'hard') },
    retained: cs.map(c => ({ subject: c.subject, what: what(c), reason: c.text, severity: c.severity, fixes: c.fixes, conflict: c.id })),
  };
}

// ---------------------------------------------------------------------------------------------------------------- assumptions and unresolved
export type AssumptionId = ConstraintId | 'equipment' | 'enclosure';
export interface Assumption { id: AssumptionId; /** what the design is assuming, in the words the UI names it with */ text: string }
/** The design has gone past onboarding: a route chosen, animals picked or a look picked. Only then do assumptions matter to the person. */
export const designStarted = (b: Brief): boolean => { const v = visionOf(b); return !!routeOf(b) || !!(valueOf(b, 'animals.stock')?.length) || !!(v.familyId || v.archetypeId || v.density); };
/** Which unknowns the design is currently filled in for by assumptions (never zero, never unlimited), so the UI can name them when it matters. Empty until the design has started. */
export function assumptionsInUse(b: Brief, scene?: SceneTank): Assumption[] {
  if (!designStarted(b)) return [];
  const a: Assumption[] = [], enc = provisionalEnclosure(b), usingProvisional = enclosureOf(b, scene).kind === 'provisional';
  if (usingProvisional) a.push({ id: 'enclosure', text: enc.reason === 'example' ? `No tank is chosen or owned and nothing limits one, so an example ${galText(enc.gal)} enclosure is used.` : `No tank is chosen or owned, so a ${galText(enc.gal)} enclosure is provisional.` });
  if (!known(b, 'space')) a.push({ id: 'space', text: usingProvisional ? `Space is not set: assumed typical (the provisional enclosure stays at or under a ${STARTER_CAP_GAL} gal starter size unless the animals need more).` : 'Space is not set: no space limit is checked.' });
  if (!known(b, 'startup')) a.push({ id: 'startup', text: 'Startup budget is not set: costs are shown, and none is treated as a limit.' });
  if (!known(b, 'ongoing')) a.push({ id: 'ongoing', text: 'Ongoing budget is not set: monthly costs are shown, and none is treated as a limit.' });
  if (!known(b, 'setup')) a.push({ id: 'setup', text: 'Setup time is not set: no limit is applied.' });
  if (!known(b, 'care')) a.push({ id: 'care', text: 'Care time is not set: no weekly limit is applied.' });
  if (!known(b, 'experience')) a.push({ id: 'experience', text: 'Experience is not set: guidance assumes a beginner (advice only, nothing is ruled out).' });
  const eq = equipmentOf(b).status;
  if (eq === 'unanswered' || eq === 'skipped') a.push({ id: 'equipment', text: 'Equipment is not set: assuming you own none, so everything is priced as bought.' });
  return a;
}

export type DecisionId = 'world' | 'equipment' | 'limits' | 'route' | 'water' | 'family' | 'archetype' | 'density' | 'animals' | 'enclosure';
export interface Issue {
  id: string; type: 'decision' | 'conflict';
  /** true = Make It Your Own cannot open before this is settled (on the chosen route) */
  blocking: boolean; text: string;
  decision?: DecisionId; conflict?: Conflict;
}
const dec = (decision: DecisionId, text: string, blocking: boolean): Issue => ({ id: `decision:${decision}`, type: 'decision', decision, text, blocking });
/** Remaining decisions (by route) and open conflicts, in the order to ask. Skipped Equipment / Limits count as answered; a derived list, nothing is stored. */
export function unresolved(b: Brief, scene?: SceneTank): Issue[] {
  const out: Issue[] = [], v = visionOf(b), route = routeOf(b), eq = equipmentOf(b), x = projectExtras(b);
  if (!worldOf(b)) out.push(dec('world', 'Choose the kind of world.', true));
  if (eq.status === 'unanswered') out.push(dec('equipment', 'Say what equipment you are bringing, or skip.', false));
  if (!x.skipped?.includes('limits') && CONSTRAINT_IDS.every(id => !known(b, id))) out.push(dec('limits', 'Add limits (space, budget, time), or skip.', false));
  if (!route) { out.push(dec('route', 'Choose where to start: the animals or the look.', true)); }
  else {
    if (needsWaterQuestion(b)) out.push(dec('water', 'Choose freshwater, saltwater or brackish.', route === 'look'));
    const animals = !!(valueOf(b, 'animals.stock')?.length);
    if (route === 'animals' && !animals) out.push(dec('animals', 'Choose the animals.', true));
    if (!v.familyId) out.push(dec('family', 'Choose a visual family.', false));
    if (!v.archetypeId) out.push(dec('archetype', 'Choose an archetype.', true));
    if (v.archetypeId && !v.density && v.densityStop === undefined) out.push(dec('density', 'Choose how full it looks.', true));
    if (route === 'look' && !animals) out.push(dec('animals', 'Pick the suitable animals (they can wait until the editor).', false));
    if (enclosureOf(b, scene).kind === 'provisional') out.push(dec('enclosure', 'Confirm the enclosure (a provisional one is in use).', route === 'animals'));
  }
  for (const c of conflictsOf(b, scene)) out.push({ id: `conflict:${c.id}`, type: 'conflict', blocking: c.severity === 'hard', text: c.text, conflict: c });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- the whole state
export type StepState = 'pending' | 'done' | 'skipped';
/** The shared onboarding `World -> Equipment -> Limits -> Starting Point`, each step pending / done / skipped. Done wins over skipped (a skipped step later filled in is done). */
export function onboardingOf(b: Brief): Record<OnboardingStep, StepState> {
  const sk = projectExtras(b).skipped ?? [], eq = equipmentOf(b).status, st = (done: boolean, step: OnboardingStep): StepState => done ? 'done' : sk.includes(step) ? 'skipped' : 'pending';
  return { world: st(!!worldOf(b), 'world'), equipment: st(eq === 'listed' || eq === 'scratch', 'equipment'), limits: st(CONSTRAINT_IDS.some(id => known(b, id)), 'limits'), start: st(!!routeOf(b), 'start') };
}
/** A limit as the UI lists it: its state ('unknown' | 'hard' | 'flexible') and its range / figure. */
export interface LimitView { id: ConstraintId; state: 'unknown' | ConstraintKind; /** the upper bound, or the footprint (inches), or the experience level */ value?: ConstraintValue; /** the lower bound of a range */ min?: number; advisory?: true }
export interface ProjectState {
  world?: World; water: WaterState; route?: Route;
  onboarding: Record<OnboardingStep, StepState>;
  equipment: Equipment; constraints: Record<ConstraintId, Constraint>; limits: LimitView[]; enclosure: Enclosure;
  animals: Stocked[]; family?: string; archetype?: string; density?: Density; densityStop?: Vision['densityStop']; recipe?: Vision['renderRecipe']; vision: Vision;
  /** the unknowns the design is filled in for by assumptions, as sentences (`assumptionList` carries ids) */
  assumptions: string[]; assumptionList: Assumption[];
  /** the decisions still open (ids, in the order to ask); `unresolved` carries the full list with the conflicts */
  remaining: DecisionId[]; unresolved: Issue[]; conflicts: Conflict[];
}
/** The whole project state as one view. Reading an old save works: it has the same meaning it always had. `scene` (the active tank) lets a model the editor is on count as the picked enclosure. */
export function projectOf(b: Brief, scene?: SceneTank): ProjectState {
  const v = visionOf(b), cs = constraintsOf(b), un = unresolved(b, scene), as = assumptionsInUse(b, scene);
  return {
    world: worldOf(b), water: waterOf(b), route: routeOf(b), onboarding: onboardingOf(b), equipment: equipmentOf(b), constraints: cs, enclosure: enclosureOf(b, scene),
    limits: CONSTRAINT_IDS.map(id => { const c = cs[id]; return c.unknown ? { id, state: 'unknown' as const } : { id, state: c.kind, ...(c.value !== undefined ? { value: c.value } : {}), ...(c.min !== undefined ? { min: c.min } : {}), ...(c.advisory ? { advisory: true as const } : {}) }; }),
    animals: (valueOf(b, 'animals.stock') ?? []).map(s => ({ ...s })), family: v.familyId, archetype: v.archetypeId, density: v.density, densityStop: v.densityStop, recipe: v.renderRecipe, vision: v,
    assumptions: as.map(a => a.text), assumptionList: as, remaining: un.filter(i => i.type === 'decision').map(i => i.decision!), unresolved: un, conflicts: conflictsOf(b, scene),
  };
}

// ---------------------------------------------------------------------------------------------------------------- what changed (for re-evaluation)
export type ProjectField = 'world' | 'water' | 'route' | 'equipment' | 'limits' | 'animals' | 'enclosure' | 'family' | 'archetype' | 'density' | 'recipe';
export interface ReevalInput {
  /** every project field that changed, in a fixed order */
  fields: ProjectField[];
  /** which limits changed (value, bound or kind), which owned things changed (added, removed, replaced or Required <-> Available) */
  limits: ConstraintId[]; equipment: EquipKey[];
  /** true when feasibility must be re-checked: anything the animals, the enclosure or the look depend on changed (a route switch alone, or a skipped step, does not) */
  recheck: boolean;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** A pure diff of two project states naming which project fields changed. GS6 re-evaluates the scene from it: it keeps the design and names conflicts (`applyChange` / `conflictsOf`). */
export function reevalInput(before: Brief, after: Brief, scene?: { before?: SceneTank; after?: SceneTank }): ReevalInput {
  const p = projectOf(before, scene?.before), q = projectOf(after, scene?.after), fields: ProjectField[] = [];
  const diff = (f: ProjectField, a: unknown, c: unknown) => { if (!same(a, c)) fields.push(f); };
  diff('world', p.world, q.world); diff('water', p.water, q.water); diff('route', p.route, q.route);
  diff('equipment', p.equipment.items, q.equipment.items); diff('limits', p.constraints, q.constraints);
  diff('animals', p.animals, q.animals); diff('enclosure', { ...p.enclosure, label: 0, notes: 0 }, { ...q.enclosure, label: 0, notes: 0 });
  diff('family', p.family, q.family); diff('archetype', p.archetype, q.archetype); diff('density', [p.density, p.densityStop], [q.density, q.densityStop]); diff('recipe', p.recipe, q.recipe);
  const limits = CONSTRAINT_IDS.filter(id => !same(p.constraints[id], q.constraints[id]));
  const keys = new Set<EquipKey>([...p.equipment.items, ...q.equipment.items].map(i => i.key));
  const equipment = [...keys].filter(k => !same(p.equipment.items.find(i => i.key === k), q.equipment.items.find(i => i.key === k)));
  const recheck = fields.some(f => f !== 'route' && f !== 'recipe');
  return { fields, limits, equipment, recheck };
}

// ---------------------------------------------------------------------------------------------------------------- changing upstream
/** Anything the person can change. A missing key is left alone; null clears. Every key applies in this order: world, water, route, equipment, tank, constraints, animals, vision. */
export interface ProjectPatch {
  world?: World | null; water?: Water | null; route?: Route | null;
  equipment?: { key: EquipKey; remove?: true; use?: Use; pick?: string; model?: string; dimsIn?: DimsIn }[];
  /** the tank chosen in the design (null = none, the enclosure is recommended again) */
  tank?: { model?: string } | null;
  constraints?: { id: ConstraintId; skip?: true; value?: ConstraintValue | Range; kind?: ConstraintKind }[];
  /** replace the stocking (an empty list removes it) */
  animals?: Stocked[] | null;
  vision?: { familyId?: string | null; archetypeId?: string | null; density?: Density | null; densityStop?: Vision['densityStop'] | null };
  scratch?: true; skipStep?: SkipStep;
}
export interface Change {
  /** the new state */
  state: Brief;
  /** every conflict open AFTER the change (a kept pick that no longer fits is listed here, never dropped) */
  conflicts: Conflict[];
  /** the ones this change caused (not open before it) */
  introduced: Conflict[];
  /** the ones this change settled */
  resolved: Conflict[];
}
function applyPatch(b: Brief, p: ProjectPatch): Brief {
  let s = b;
  if (p.world !== undefined) s = setWorld(s, p.world ?? undefined);
  if (p.water !== undefined) s = setWater(s, p.water);
  if (p.route !== undefined) s = setRoute(s, p.route ?? undefined);
  if (p.scratch) s = setScratch(s);
  for (const e of p.equipment ?? []) {
    if (e.remove) s = removeEquipment(s, e.key);
    else if (e.use && e.pick === undefined && e.model === undefined && e.dimsIn === undefined && equipmentOf(s).items.some(i => i.key === e.key)) s = setOwnedUse(s, e.key, e.use);
    else s = setEquipment(s, e.key, e);
  }
  if (p.tank !== undefined) s = p.tank ? setItem(s, 'equipment.tank', p.tank, 'preference') : clearItem(s, 'equipment.tank');
  for (const c of p.constraints ?? []) {
    if (c.skip) s = skipConstraint(s, c.id);
    else if (c.value !== undefined) s = setConstraint(s, c.id, c.value as number | Range | SpaceIn, c.kind ?? (constraintOf(s, c.id).unknown ? defaultKindOf(c.id) : (constraintOf(s, c.id) as { kind: ConstraintKind }).kind));
    else if (c.kind) s = setConstraintKind(s, c.id, c.kind);
  }
  if (p.skipStep) s = skipStep(s, p.skipStep);
  if (p.animals !== undefined) s = p.animals?.length ? setItem(s, 'animals.stock', p.animals, getItem(s, 'animals.stock')?.status ?? 'preference') : clearItem(s, 'animals.stock');
  if (p.vision) {
    const v = { ...visionOf(s) } as Record<string, unknown>;
    for (const [k, val] of Object.entries(p.vision)) { if (val === null) delete v[k]; else if (val !== undefined) v[k] = val; }
    s = setVision(s, v as unknown as Vision);
  }
  return s;
}
/** Change something upstream (world, water, tank, limits, animals, ...). Downstream picks are kept exactly as they were: a pick that no longer fits is listed as a conflict with
 *  viable adjustments (`fixes`, each a patch to apply), never silently removed. Applying the fix is the person's call. */
export function applyChange(b: Brief, patch: ProjectPatch): Change {
  const before = conflictsOf(b), state = applyPatch(b, patch), after = conflictsOf(state), ids = new Set(before.map(c => c.id)), now = new Set(after.map(c => c.id));
  return { state, conflicts: after, introduced: after.filter(c => !ids.has(c.id)), resolved: before.filter(c => !now.has(c.id)) };
}
