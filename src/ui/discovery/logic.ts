// Guided Visual Discovery, the pure part (lane VD3, 2026-11-02; spec research/design/visual-discovery-spec.md Revision 02, sections
// 01-03, 05, 06, 08; plan research/design/visual-discovery-plan.md question 2). Environment -> Water (aquarium only) -> Family ->
// Archetype -> Density, then Make It Your Own (the editor) with the archetype's recipe. Reads the registry (scene/archetypes.ts, VD1's)
// and never changes an engine number: the hand-off scene comes from the same scapeSetup the look picker uses, and the density only
// moves the hardscape / plant layers (animals are never touched, spec 05).
// A known roster or tank prunes (spec 05 "User already selected an animal"): environment / water the roster answers are skipped, an
// archetype whose tags cannot hold the animals is hidden, and a step left with one choice is answered for the person. Nothing hard-gates:
// when pruning would leave a step empty, every choice comes back with a warning instead (`loose`).
import { ARCHETYPES, ENVIRONMENTS, WATERS, archetype, archetypesOf, family, familiesOf, type Archetype, type Card, type Density, type Env, type Family, type Water } from '../../scene/archetypes';
import type { Vision, VisionRecipe } from '../../scene/brief';
import { getSpecies } from '../../data/species';
import { CHEM } from '../../data/waterchem';
import { CARE } from '../../data/care';
import { getTankModel, type TankModel } from '../../data/tanks';
import { emptyBuild, type Build } from '../../scene/builds';
import { scapeSetup } from '../../scene/scapes';
import { STOP_OF, densityOfStop, recipeBg, withBg, type Stop } from '../../scene/recipes';
import { asksPlants, defaultSize, lookSizes } from '../../scene/looks';
import type { TankSetup } from '../../scene/types';

export type VStep = 'environment' | 'water' | 'family' | 'archetype' | 'density' | 'animals';
export const VSTEPS: readonly VStep[] = ['environment', 'water', 'family', 'archetype', 'density', 'animals'];
export const STEP_LABEL: Record<VStep, string> = { environment: 'World', water: 'Water', family: 'Family', archetype: 'Look', density: 'Density', animals: 'Animals' };
export const STEP_ASK: Record<VStep, string> = {
  environment: 'What kind of world?', water: 'Which water?', family: 'Pick the broad look', archetype: 'Pick the look', density: 'How full?', animals: 'Which animals would suit it?',
};
/** Guided Setup Rev 03 (lane GS3): the fourth World card. Not a world: picking it keeps the whole tree open (every family, grouped), and the
 *  family the person picks then says which world and water they were in. Never offered when the animals already fix the world. */
export const ANY_WORLD = 'any';
export const ANY_CARD: Card = { id: ANY_WORLD, name: 'Open to anything', tagline: 'Not sure yet? Browse every kind of look, from reef to rainforest, and settle on one as you go.' };
export const DENSITIES: readonly Density[] = ['open', 'balanced', 'full'];
/** The spec's density cards (section 03); each archetype adds its own label and note under them. */
export const DENSITY_CARD: Record<Density, { name: string; line: string }> = {
  open: { name: 'Open & Airy', line: 'A little breathing room goes a long way.' },
  balanced: { name: 'A Bit of Both', line: 'Plenty to explore, without getting too crowded.' },
  full: { name: 'Wild & Full', line: 'More places to explore, more of what you love.' },
};
/** Until VD4's recipes land, density is the existing layer sliders (scene/items.ts DENS_NAMES: 0 Sparse, 2 Medium, 3 Full). Animals stay put. */
export const DENS_OF: Record<Density, { hard: number; plant: number }> = { open: { hard: 0, plant: 0 }, balanced: { hard: 2, plant: 2 }, full: { hard: 3, plant: 3 } };
/** Flat placeholder colours for the environment and water cards (families carry their own). */
export const CARD_COLOUR: Record<string, string> = {
  any: '#7a6fb0', aquarium: '#2f6fb0', terrarium: '#8a6a3b', paludarium: '#3f8f6e', freshwater: '#3f8f4e', saltwater: '#1f5fa8', brackish: '#6e7a3a',
};

// ---- what a known roster / tank says ----
type Chem = 'soft' | 'hard' | 'marine';
/** What the animals and the tank already fix: `env` / `water` when the roster answers them, the chemistry and temperature every animal
 *  needs, the tank's gallons. Empty when nothing is known. */
export interface Known { env?: Env; water?: Water; needs: Chem[]; temp?: 'tropical' | 'cold'; gallons?: number; roster: string[] }
export const NOTHING_KNOWN: Known = { needs: [], roster: [] };

/** The roster's answers. Water animals only = an aquarium (marine = saltwater, else freshwater; brackish is never inferred: no species
 *  carries a brackish flag yet); land animals only = a terrarium; both = a paludarium. Snails and other 'both' animals answer nothing. */
export function knownOf(roster: readonly string[], gallons?: number): Known {
  const sp = [...new Set(roster)].map(getSpecies).filter(s => !!s);
  const water = sp.filter(s => s.habitat === 'water'), land = sp.filter(s => s.habitat === 'land');
  const k: Known = { needs: [], roster: sp.map(s => s.id), ...(gallons ? { gallons } : {}) };
  if (land.length && water.length) k.env = 'paludarium';
  else if (land.length) k.env = 'terrarium';
  else if (water.length) { k.env = 'aquarium'; k.water = water.some(s => s.salt) ? 'saltwater' : 'freshwater'; }
  if (sp.some(s => s.salt)) k.needs.push('marine');
  // hardness: the acceptable band (waterchem.ts phOk / ghOk, else the preferred one); a band that never reaches soft (pH 7.0 or under / GH 8
  // or under) needs hard water, one that never reaches hard (pH 7.5 / GH 9 and up) needs soft
  let hard = false, soft = false;
  for (const s of sp) {
    const c = CHEM[s.id]; if (!c) continue;
    const ph = c.phOk ?? c.ph, gh = c.ghOk ?? c.gh;
    if (ph[0] >= 7.5 || (gh && gh[0] >= 9)) hard = true;
    if (ph[1] <= 7.0 || (gh && gh[1] <= 8)) soft = true;
  }
  if (hard) k.needs.push('hard');
  if (soft) k.needs.push('soft');
  // temperature (deg C, care.ts): a comfortable band wholly under 23 C (73 F) is a cold-water animal, wholly over it a tropical one
  const t = sp.map(s => CARE[s.id]?.temp).filter((x): x is [number, number] => !!x);
  if (t.some(r => r[1] < 23)) k.temp = 'cold'; else if (t.some(r => r[0] >= 23)) k.temp = 'tropical';
  return k;
}

/** Whether an archetype can hold the known animals in the known tank (tags only; the engine's welfare checks still run in the editor). */
export function fits(a: Archetype, k: Known): boolean {
  if (!k.roster.length && !k.gallons) return true;
  if (k.env && a.env !== k.env && a.resolvesTo !== k.env) return false;
  if (k.water && a.env === 'aquarium' && a.water !== k.water) return false;
  const chem = a.tags.chem;
  if (chem) for (const n of k.needs) if (!chem.includes(n)) return false;
  if (k.temp && a.tags.temp && a.tags.temp !== 'any' && a.tags.temp !== k.temp) return false;
  if (k.gallons && a.tags.minGallons && a.tags.minGallons > k.gallons) return false;
  return true;
}

// ---- the choices at each step ----
/** The picks so far (vision without its saved extras). */
export type Picks = Pick<Vision, 'environment' | 'waterType' | 'familyId' | 'archetypeId' | 'density' | 'densityStop'> & {
  /** "Open to anything" was picked at World (local to discovery: the brief's vision has no field for it, so GS4 moves it onto GS2's project state) */
  anyWorld?: boolean;
};
export interface Choices<T> { items: T[]; /** pruning would have left nothing, so every choice is shown with a warning */ loose: boolean }
const prune = <T>(all: T[], ok: (x: T) => boolean): Choices<T> => { const items = all.filter(ok); return items.length ? { items, loose: false } : { items: all, loose: all.length > 0 }; };
const familiesFor = (env: Env, water: Water | null | undefined) => familiesOf(env, env === 'aquarium' ? water ?? null : null);
const familyFits = (f: Family, k: Known) => archetypesOf(f.id).some(a => fits(a, k));

export function envChoices(k: Known): Choices<Card> {
  const c = prune(ENVIRONMENTS, c => (!k.env || c.id === k.env) && ARCHETYPES.some(a => a.env === c.id && fits(a, k)));
  return k.env ? c : { ...c, items: [...c.items, ANY_CARD] };   // the animals already answer the world: nothing left to be open about
}
export function waterChoices(k: Known): Choices<Card> {
  return prune(WATERS, c => (!k.water || c.id === k.water) && ARCHETYPES.some(a => a.env === 'aquarium' && a.water === c.id && fits(a, k)));
}
/** Every family of every world, grouped for "Open to anything": each aquarium water, then terrarium and paludarium. */
export interface FamilyGroup { label: string; items: Family[] }
const WORLDS: { label: string; env: Env; water: Water | null }[] = [
  { label: 'Freshwater aquariums', env: 'aquarium', water: 'freshwater' }, { label: 'Saltwater aquariums', env: 'aquarium', water: 'saltwater' },
  { label: 'Brackish aquariums', env: 'aquarium', water: 'brackish' }, { label: 'Terrariums', env: 'terrarium', water: null }, { label: 'Paludariums', env: 'paludarium', water: null },
];
export function openFamilyGroups(k: Known): FamilyGroup[] {
  const groups = WORLDS.map(w => ({ label: w.label, items: familiesOf(w.env, w.water).filter(f => familyFits(f, k)) })).filter(g => g.items.length);
  return groups.length ? groups : WORLDS.map(w => ({ label: w.label, items: familiesOf(w.env, w.water) })).filter(g => g.items.length);
}
export function familyChoices(p: Picks, k: Known): Choices<Family> {
  if (p.anyWorld) { const items = openFamilyGroups(k).flatMap(g => g.items); return { items, loose: items.length > 0 && !items.some(f => familyFits(f, k)) }; }
  return p.environment ? prune(familiesFor(p.environment, p.waterType), f => familyFits(f, k)) : { items: [], loose: false };
}
export function archetypeChoices(p: Picks, k: Known): Choices<Archetype> {
  return p.familyId ? prune(archetypesOf(p.familyId), a => fits(a, k)) : { items: [], loose: false };
}
/** The ids offered at a step (density always offers all three). */
export function choiceIds(step: VStep, p: Picks, k: Known): string[] {
  switch (step) {
    case 'environment': return envChoices(k).items.map(c => c.id);
    case 'water': return waterChoices(k).items.map(c => c.id);
    case 'family': return familyChoices(p, k).items.map(c => c.id);
    case 'archetype': return archetypeChoices(p, k).items.map(c => c.id);
    case 'density': return [...DENSITIES];
    case 'animals': return [];   // optional and open-ended: never answered for the person, never a blocker
  }
}

/** The steps this path walks. Water only once an aquarium is picked (a terrarium, a paludarium and "Open to anything" never ask it: the
 *  family carries it); Animals last, and optional. */
export const stepsOf = (p: Picks): VStep[] => VSTEPS.filter(s => s !== 'water' || (p.environment === 'aquarium' && !p.anyWorld));
const valueAt = (p: Picks, s: VStep): string | null | undefined =>
  s === 'environment' ? (p.anyWorld ? ANY_WORLD : p.environment) : s === 'water' ? p.waterType : s === 'family' ? p.familyId : s === 'archetype' ? p.archetypeId : p.density;

/** Set one pick and keep every later pick that still fits (spec 06): a family of another environment / water, or an archetype no longer
 *  offered, is dropped; the density always stays. */
export function setPick(p: Picks, step: VStep, id: string, k: Known = NOTHING_KNOWN): Picks {
  const n: Picks = { ...p };
  if (step === 'environment' && id === ANY_WORLD) { n.anyWorld = true; delete n.environment; delete n.waterType; }
  else if (step === 'environment') { delete n.anyWorld; n.environment = id as Env; n.waterType = id === 'aquarium' ? p.waterType ?? undefined : null; }
  else if (step === 'water') n.waterType = id as Water;
  else if (step === 'family') n.familyId = id;
  else if (step === 'animals') return n;
  else if (step === 'archetype') n.archetypeId = id;
  else { const stop = id in STOP_OF ? STOP_OF[id as Density] : Number(id) as Stop; n.density = densityOfStop(stop); n.densityStop = stop; }
  return keepCompatible(n, k);
}
/** Drop the picks that no longer belong after an earlier one changed. */
export function keepCompatible(p: Picks, k: Known): Picks {
  const n: Picks = { ...p };
  if (n.anyWorld && k.env) delete n.anyWorld;   // the animals have since fixed the world
  const f = n.familyId ? family(n.familyId) : undefined;
  if (n.anyWorld) {
    // the family of an open world says which world and water it lives in
    if (f) { n.environment = f.env; n.waterType = f.env === 'aquarium' ? f.water : null; } else { delete n.familyId; delete n.archetypeId; delete n.environment; delete n.waterType; }
    if (n.archetypeId && (!n.familyId || !archetypeChoices(n, k).items.some(a => a.id === n.archetypeId))) delete n.archetypeId;
    return n;
  }
  if (n.environment && n.environment !== 'aquarium') n.waterType = null;
  if (n.waterType === null && n.environment === 'aquarium') delete n.waterType;
  if (n.familyId && (!f || !n.environment || f.env !== n.environment || (n.environment === 'aquarium' && f.water !== n.waterType))) { delete n.familyId; delete n.archetypeId; }
  if (n.archetypeId && (!n.familyId || !archetypeChoices(n, k).items.some(a => a.id === n.archetypeId))) delete n.archetypeId;
  return n;
}

/** Answer every step the roster answers, and every step left with one choice, in order, until a step needs the person. Returns the picks
 *  and the steps answered this way (Back skips them). A coming-soon archetype is never answered for the person. */
export function settle(p: Picks, k: Known): { picks: Picks; auto: VStep[] } {
  let n = keepCompatible(p, k); const auto: VStep[] = [];
  for (const s of VSTEPS) {
    if (s === 'density') break;
    if (!stepsOf(n).includes(s)) continue;   // read per step: an environment answered here can bring the water step back
    const ids = choiceIds(s, n, k);
    if (valueAt(n, s) != null && ids.includes(String(valueAt(n, s)))) { if (ids.length === 1) auto.push(s); continue; }
    if (ids.length !== 1 || (s === 'archetype' && archetype(ids[0])?.support === 'coming-soon')) break;
    n = setPick(n, s, ids[0], k); auto.push(s);
  }
  return { picks: n, auto };
}

/** The first step still waiting for the person ('done' when everything is picked). */
export function firstOpen(p: Picks, k: Known): VStep | 'done' {
  const { picks, auto } = settle(p, k);
  for (const s of stepsOf(picks)) if (s !== 'animals' && !auto.includes(s) && (valueAt(picks, s) == null || !choiceIds(s, picks, k).includes(String(valueAt(picks, s))))) return s;
  return 'done';
}
/** The step after this one, skipping the ones answered for the person. */
export function nextOf(step: VStep, p: Picks, k: Known): VStep | 'done' {
  const { picks, auto } = settle(p, k), steps = stepsOf(picks);
  for (let i = steps.indexOf(step) + 1; i < steps.length; i++) if (!auto.includes(steps[i])) return steps[i];
  return 'done';
}
/** The step Back goes to (undefined on the first step the person sees). */
export function prevOf(step: VStep, p: Picks, k: Known): VStep | undefined {
  const { picks, auto } = settle(p, k), steps = stepsOf(picks);
  for (let i = steps.indexOf(step) - 1; i >= 0; i--) if (!auto.includes(steps[i])) return steps[i];
  return undefined;
}

// ---- coming soon (spec 08) ----
/** Save a coming-soon archetype as an aspirational like (never as the pick). */
export const addLike = (likes: readonly string[], id: string): string[] => likes.includes(id) ? [...likes] : [...likes, id];
/** The closest archetype we can build today, if it is buildable. */
export function alternativeOf(a: Archetype): Archetype | undefined { const alt = a.alternative ? archetype(a.alternative) : undefined; return alt && alt.support !== 'coming-soon' ? alt : undefined; }
/** Take the alternative: its own environment, water and family, the density kept. */
export function pickAlternative(p: Picks, alt: Archetype): Picks {
  return { environment: alt.env, waterType: alt.env === 'aquarium' ? alt.water : null, familyId: alt.familyId, archetypeId: alt.id, ...(p.density ? { density: p.density } : {}) };
}
/** The one line for what cannot be drawn yet. */
export const depsLine = (a: Archetype): string => a.deps.length ? `We can't draw ${listOf(a.deps)} yet.` : '';
const listOf = (xs: readonly string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;

// ---- the hand-off: Make It Your Own ----
/** The scene parameters an archetype at a density opens with: its first mapped look, plant mode, the density as layer stops, and the
 *  enclosure it is built in (`resolvesTo` switches it, spec 01). Undefined for an archetype with no look (coming soon). */
export function recipeOf(a: Archetype, d: Density): VisionRecipe | undefined {
  const look = a.recipe.looks[0]; if (!look) return undefined;
  const plantMode = look !== 'none' && asksPlants(look) ? a.recipe.plantMode ?? 'live' : 'live';
  return { look, plantMode, dens: { ...DENS_OF[d] }, env: a.resolvesTo ?? a.env, bg: recipeBg(a).bg, ...(recipeBg(a).color ? { bgColor: recipeBg(a).color } : {}) };
}

const galOf = (m: TankModel) => m.ratedGal;
/** The tank a fresh scene opens in: the brief's tank when the look comes in it, else the look's default size, grown to the archetype's
 *  minimum gallons. */
export function tankFor(a: Archetype, r: VisionRecipe, briefTank?: string): TankModel {
  const style = r.look === 'none' ? 'stones' : r.look, sizes = lookSizes(style), own = briefTank ? getTankModel(briefTank) : undefined;
  if (own && sizes.includes(own)) return own;
  const dflt = defaultSize(style), min = a.tags.minGallons ?? 0;
  return galOf(dflt) >= min ? dflt : sizes.find(m => galOf(m) >= min) ?? sizes[sizes.length - 1];
}

/** The scene Make It Your Own opens: the tank in hand when it holds animals (roster, size and gear kept, only the scape changes), else a
 *  fresh tank in the archetype's size. The density moves the hardscape and plant layers only; the animal list is never touched. */
export function sceneFor(a: Archetype, r: VisionRecipe, inHand: TankSetup | undefined, briefTank?: string, now = Date.now()): TankSetup {
  if (inHand && inHand.fish.length) {
    if (r.look === 'none') return withBg(a, structuredClone(inHand));
    const animals: Build['animals'] = [];
    for (const f of inHand.fish) { const x = animals.find(y => y.species === f.species); if (x) x.n++; else animals.push({ species: f.species, n: 1 }); }
    return withBg(a, scapeSetup({ animals, setup: inHand } as Build, r.look, r.plantMode, inHand, { dens: r.dens }));
  }
  const build = emptyBuild(tankFor(a, r, briefTank), now);
  return withBg(a, r.look === 'none' ? build.setup : scapeSetup(build, r.look, r.plantMode, build.setup, { dens: r.dens }));
}
