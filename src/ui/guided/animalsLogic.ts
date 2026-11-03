// Guided Setup Rev 03, Animals First (lane GS5, 2026-11-02; research/design/guided-setup-rev03.md section 3): the pure part. Roster -> compatibility -> enclosure; the DOM is
// animalsFirst.ts, the hand to discovery is the shell's. Everything is a read of the one project state (scene/project.ts) or a write to it through its setters; nothing here
// touches the scene, drops an animal on its own, or says an incompatible group is fine (GS6 invariant 5: requested vs feasible).
import { getSpecies, type Species } from '../../data/species';
import { getTankModel, type TankModel } from '../../data/tanks';
import { suggestFromBrief } from '../../demand/suggest';
import type { Env } from '../../scene/archetypes';
import { valueOf, type Brief } from '../../scene/brief';
import { applyChange, conflictsOf, enclosureOf, impliedWater, provisionalEnclosure, waterOf, type Conflict, type ProjectPatch } from '../../scene/project';
import { spaceFit } from '../../scene/space';
import { fitIn, tankFor, tankLabel, type AnimalCount, type TankFit } from '../../scene/tankfit';
import { tankFromModel } from '../../data/tanks';
import { loadProfile } from '../demandPanel';
import { lockedRoster, lockedStock, lockRoster, spaceOf } from '../setupBrief';
import { ownedTankOf } from './logic';
import { FAIL_WORD, animalsOf, pickOfStock, planFor, startPick, stockedOf, type Pk } from '../stockPlanLogic';

// ---------------------------------------------------------------------------------------------------------------- 1. the roster
/** Whether an animal belongs in the world the person chose (an aquarium lists swimmers and snails, a terrarium land and amphibious animals, a paludarium and "Open" everything).
 *  Not a ban: the picker can show the rest, and a pick that does not suit is named as a conflict, never hidden. */
export function inWorld(sp: Species, env: Env | undefined): boolean {
  if (!env || env === 'paludarium') return true;
  return env === 'aquarium' ? sp.habitat === 'water' || sp.habitat === 'both' && sp.kind === 'snail' : sp.habitat === 'land' || sp.habitat === 'both';
}
/** The roster the shell holds (counts) as picks, one per species, at the counts given (never below 1). */
export const picksOf = (roster: readonly AnimalCount[]): Pk[] => roster.filter(r => getSpecies(r.species) && r.n > 0).map(r => ({ ...startPick(r.species), n: r.n }));
/** The roster written to the brief, locked: the animals are what the person came for (the same write the old panel does). */
export const withRoster = (b: Brief, picks: readonly Pk[]): Brief => lockRoster(b, picks.map(stockedOf));   // with the sex / pair / stage split (GS7), so a revisit shows what was chosen
/** The picks the brief holds, split and all (GS7): what the roster picker opens with when the roster was set before. Empty when the brief has none locked. */
export const picksOfBrief = (b: Brief): Pk[] => lockedRoster(b).filter(s => getSpecies(s.species)).map(pickOfStock);
/** The roster in the brief, as counts. */
export const rosterOfBrief = (b: Brief): AnimalCount[] => lockedStock(b).map(a => ({ species: a.species, n: a.n }));
/** "Saltwater, because the clownfish need it: not asked again." Empty when the animals do not fix the water (a land roster, a mixed one) or the person already answered it. */
export function waterLine(b: Brief): string {
  const w = waterOf(b), im = impliedWater(b);
  if (!im) return '';
  return w.by === 'animals' ? `${im === 'saltwater' ? 'Saltwater' : 'Freshwater'}: the animals need it, so it is not asked again.` : '';
}

// ---------------------------------------------------------------------------------------------------------------- 2. conflicts with viable adjustments
export interface Issue { text: string; welfare: boolean; id: string; fixes: { label: string; patch: ProjectPatch }[] }
/** The project's open conflicts about the animals, the water, the enclosure and the equipment (the look is not decided yet on this route), each with its viable adjustments as
 *  patches. Nothing is applied for the person and no animal is dropped: a fix that takes animals out is one button among others, never a default. */
export function issuesOf(b: Brief): Issue[] {
  return conflictsOf(b).filter(c => c.subject !== 'look').map((c: Conflict) => ({ id: c.id, text: c.text, welfare: c.severity === 'hard', fixes: c.fixes }));
}
/** Apply one adjustment (a patch from `issuesOf`). */
export const applyFix = (b: Brief, patch: ProjectPatch): Brief => applyChange(b, patch).state;

// ---------------------------------------------------------------------------------------------------------------- 3. the enclosure
const gal = (n: number) => `${+n.toFixed(1)} gal`;
const failsWords = (fit: TankFit | undefined) => fit?.fails.length ? fit.fails.map(f => FAIL_WORD[f] ?? f).join(', ') : '';
export interface OwnedCheck {
  model: TankModel; use: 'required' | 'available'; gal: number; label: string;
  fits: boolean;
  /** why it does not hold them, in a line (the verdict's failing checks and the smallest tank that does) */
  why?: string;
  /** the smallest catalogue tank that holds these animals, for the line above */
  needs?: TankModel;
}
/** The tank the person owns (Required or Available) judged for these animals. Undefined when they own none. */
export function ownedCheck(b: Brief, animals: AnimalCount[]): OwnedCheck | undefined {
  const own = ownedTankOf(b); if (!own || !animals.length) return own ? { model: own.model, use: own.use, gal: own.model.ratedGal, label: `${gal(own.model.ratedGal)} (${own.use})`, fits: true } : undefined;
  const fit = fitIn(animals, own.model), need = tankFor(animals)?.tank, g = own.model.ratedGal, label = `your ${gal(g)} tank`;
  if (!fit || !fit.fails.length) return { model: own.model, use: own.use, gal: g, label, fits: true, ...(need ? { needs: need } : {}) };
  return { model: own.model, use: own.use, gal: g, label, fits: false, ...(need ? { needs: need } : {}),
    why: `${label[0].toUpperCase()}${label.slice(1)} is too small for these animals (${failsWords(fit)})${need ? `; they need about ${gal(need.ratedGal)}` : ''}.` };
}

/** What TankLook recommends as the enclosure for these animals: the generator's cheapest setup that passes every check (so Available gear, the space, the budget and the
 *  animals' welfare minimums all count, GA1), with its own tank note and warnings; else the provisional enclosure the project would use (sized from space, budget and the
 *  animals), with the reason there is no full setup. */
export interface EnclosureRec {
  model: TankModel;
  /** 'owned-available' = the generator uses the tank you have; 'new' = a tank to buy; 'provisional' = no full setup passed, this is the smallest tank that holds them */
  source: 'owned-available' | 'new' | 'provisional';
  /** GA1's "Uses your 20 gal: $56 off" / "A 40 gal breeder instead: your 20 gal is too small for this." */
  tankNote?: string;
  /** GA1's flexible-limit lines ("Over your $300 target by $40.") */
  warnings: string[];
  startupUsd?: number;
  /** set-up dollars the owned tank took off */
  savedUsd?: number;
  /** why no full setup passed (limits and welfare); the tank is still the smallest that holds the animals */
  because?: string;
}
export function recommendEnclosure(b: Brief, units: 'in' | 'cm' = 'in', now = Date.now()): EnclosureRec | undefined {
  const animals = animalsOf(rosterPicks(b));
  if (!animals.length) return undefined;
  const r = suggestFromBrief(b, loadProfile(), units, now), p = r.cheapest ?? r.proposals[0];
  if (p) return { model: p.build.tank, source: p.tankSource === 'owned-available' ? 'owned-available' : 'new', ...(p.tankNote ? { tankNote: p.tankNote } : {}), warnings: p.warnings ?? [],
    startupUsd: Math.round(p.totals.startupUsd), ...(p.saved ? { savedUsd: Math.round(p.saved) } : {}) };
  const enc = provisionalEnclosure(b), m = enc.model ? getTankModel(enc.model) : tankFor(animals)?.tank;
  return m ? { model: m, source: 'provisional', warnings: enc.notes, because: `${r.message ? r.message.replace(/\.?$/, '. ') : 'No complete setup passes every limit and welfare check yet. '}Shown anyway: the smallest tank that holds the animals. Anything still wrong stays flagged in the editor.` } : undefined;
}
const rosterPicks = (b: Brief): Pk[] => picksOf(rosterOfBrief(b));

/** The catalogue sizes for these animals, smallest first, each with what is wrong with it (empty = holds them) and whether it fits the known space. */
export interface SizeOption { model: TankModel; label: string; why: string; fits: boolean; inSpace: boolean }
export function sizeOptions(b: Brief, units: 'in' | 'cm' = 'in'): SizeOption[] {
  const picks = rosterPicks(b), space = spaceOf(b);
  return planFor(picks).options.map(o => ({ model: o.tank, label: tankLabel(o.tank, units).replace(/^About /, ''), why: failsWords(o), fits: !o.fails.length, inSpace: !space || spaceFit(tankFromModel(o.tank), space).fits }));
}

/** Write the chosen enclosure into the project: a tank picked in the design (`equipment.tank`, what `enclosureOf` reads), or cleared when the tank the person owns is the one used. */
export const setEnclosure = (b: Brief, modelId: string | undefined): Brief => applyChange(b, { tank: modelId ? { model: modelId } : null }).state;
/** The tank `mountDiscovery` draws the animals in: the one picked in the design when there is one and no tank is Required, else (undefined) the tank the person owns / discovery's own provisional chain. */
export function pickedTank(b: Brief): string | undefined {
  const own = ownedTankOf(b), id = valueOf(b, 'equipment.tank')?.model;
  return id && !(own && own.use === 'required') && getTankModel(id) ? id : undefined;
}
/** The enclosure the project stands on, in words (for the verdict line). */
export const enclosureLine = (b: Brief): string => enclosureOf(b).label;
