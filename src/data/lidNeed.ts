// How much a lid matters (lane LB1, Nathan 2026-11-03): a generated setup comes with a lid unless the user insists on none; then they are told the pros and cons,
// and warned BY NAME about the animals that need one. Pure: no UI, no store.
//   'required'     jumpers and escape artists (the careNeeds "Lid:" lines are the source and are kept as the first entries): an open top is a Problem for these
//   'recommended'  most animals: they jump when startled or chased, and the lid also holds heat and water
//   'optional'     animals that stay in the water and rarely climb out, and a tank with no animals yet
// Reasons are the husbandry consensus of hobby care sheets unless a source is named; only the crayfish / crab lines carry named sources (S238, careNeeds.ts).
import type { LidType, TankSetup } from '../scene/types';
import type { Brief } from '../scene/brief';
import { projectExtras, setProjectExtras } from '../scene/brief';
import { getSpecies, type Species } from './species';
import { NEEDS } from './careNeeds';
import { footprint } from '../scene/shape';

export type LidNeed = 'required' | 'recommended' | 'optional';
export interface SpeciesLid { need: LidNeed; reason: string }

const RANK: Record<LidNeed, number> = { optional: 0, recommended: 1, required: 2 };
const REC: SpeciesLid = { need: 'recommended', reason: 'jumps when startled or chased, and a lid also keeps heat and water in' };
const OPT: SpeciesLid = { need: 'optional', reason: 'stays in the water and rarely climbs out; a lid still cuts evaporation and heat loss' };
const req = (reason: string): SpeciesLid => ({ need: 'required', reason });

/** Species that must have a closed top. The first entries are the careNeeds "Lid:" lines (S238); the rest are the same kind of animal, by group. */
const REQUIRED: Record<string, SpeciesLid> = {
  hatchet: req('hatchetfish leap out of the water; they need a tight lid'),
  cpd: req('celestial pearl danios are jumpers; a gap in the top is a way out'),
  danio: req('danios jump at the smallest startle'),
  betta: req('bettas jump, and they breathe the air above the water, so a lid also keeps that air warm'),
  kuhli: req('kuhli loaches find and squeeze through any gap in the top'),
  hillstream: req('hillstream loaches climb the glass and flow out of the water'),
  sae: req('Siamese algae eaters leap when startled'),
  firefish: req('firefish are famous jumpers; an open top loses them overnight'),
  royalgramma: req('royal grammas jump out of open tanks'),
  sixline: req('six line wrasses jump, often the first night'),
  watchman: req('gobies jump; many are lost from open tanks'),
  nerite: req('nerite snails climb out of the water and dry out on the floor'),
  mystery: req('mystery snails climb out above the water line'),
  adf: req('African dwarf frogs climb and squeeze through gaps; they also surface to breathe'),
  dartfrog: req('frogs escape through any gap; a screen top keeps them in and lets air through'),
  treefrog: req('tree frogs climb to the top and out through any opening'),
  firetoad: req('fire-bellied toads climb and escape through gaps'),
  firenewt: req('newts walk out of an open top'),
};
for (const id of ['cpo', 'cajundwarf', 'rswcrayfish', 'redclaw', 'thaicrab']) {
  const n = (NEEDS[id] ?? []).find(x => x.text.startsWith('Lid'));
  REQUIRED[id] = req(n ? n.text.replace(/^Lid: /, '') : 'climbs out of an open top');
}
const OPTIONAL = new Set(['ramshorn', 'trumpet', 'asellus']);

/** How much a lid matters to this animal. Land animals (reptiles, amphibians on land, land inverts) all escape an open top. */
export function lidNeedOf(id: string): SpeciesLid {
  const sp = getSpecies(id);
  if (REQUIRED[id]) return REQUIRED[id];
  if (OPTIONAL.has(id)) return OPT;
  if (sp && sp.habitat !== 'water' && !(NEEDS[id] ?? []).length) return req(sp.habitat === 'land' ? 'walks, climbs or leaps out of an open top; a mesh top keeps it in and lets air through' : 'leaves the water and climbs out of an open top');
  return REC;
}

export interface LidWho { id: string; name: string; reason: string }
export interface SetupLid {
  /** the strongest need in the roster; 'optional' for a tank with no animals yet */
  need: LidNeed;
  required: LidWho[]; recommended: LidWho[];
}
const speciesIn = (S: Pick<TankSetup, 'fish'>): Species[] => [...new Set(S.fish.map(f => f.species))].flatMap(id => { const s = getSpecies(id); return s ? [s] : []; });
/** What the roster says about a lid: who needs one, who would like one, and the strongest need. A tank with no animals is 'optional' (a lid still comes by default). */
export function lidNeedOfSetup(S: Pick<TankSetup, 'fish'>): SetupLid {
  const required: LidWho[] = [], recommended: LidWho[] = [];
  let need: LidNeed = 'optional';
  for (const sp of speciesIn(S)) {
    const n = lidNeedOf(sp.id), w = { id: sp.id, name: sp.name, reason: n.reason };
    if (n.need === 'required') required.push(w); else if (n.need === 'recommended') recommended.push(w);
    if (RANK[n.need] > RANK[need]) need = n.need;
  }
  return { need, required, recommended };
}

/** The kind of top a generated setup gets: a mesh screen for a dry enclosure or a land side (air through, nothing out), a glass top on a wet tank (heat and water stay in, the gap
 *  for the hose and cord is the only opening). */
export function defaultLid(S: Pick<TankSetup, 'fish' | 'water'>): Exclude<LidType, 'open'> {
  if (!S.water.on) return 'mesh';
  return speciesIn(S).some(sp => sp.habitat !== 'water') ? 'mesh' : 'glass';
}

// ---- the user's choice of no lid: stored in the brief, explicit and reversible ----
/** True when the user chose to go without a lid. Nothing else ever leaves a generated setup open. */
export const lidFreeChosen = (b?: Brief): boolean => !!b && projectExtras(b).lidFree === true;
/** Record (on) or withdraw (off) the choice of no lid. */
export function setLidFree(b: Brief, on: boolean): Brief {
  const { lidFree: _l, ...rest } = projectExtras(b);
  return setProjectExtras(b, on ? { ...rest, lidFree: true } : rest);
}
/** Give a generated scene its lid when it has none and the user did not choose to go without. Mutates and returns `S`; a scene that already has a top, or a kit's own lid, is left alone. */
export function withDefaultLid<T extends Pick<TankSetup, 'fish' | 'water' | 'lid'>>(S: T, brief?: Brief): T {
  if (S.lid === 'open' && !lidFreeChosen(brief)) S.lid = defaultLid(S);
  return S;
}

// ---- going without ----
/** About how far an open water surface drops in a week, in inches (a rule of thumb for a room at 70-75 °F; not measured per tank), and what a top leaves of it. */
export const EVAP_IN_PER_WEEK = 0.75;
export const EVAP_KEPT: Record<Exclude<LidType, 'open'>, number> = { glass: 0.3, hood: 0.3, mesh: 0.6 };
const KWH_USD = 0.17;
export interface LidFree {
  pros: string[]; cons: string[];
  /** gallons a week the surface loses, open and under a glass top */
  evapGalOpen: number; evapGalLidded: number;
  /** the extra heater work an open top costs (watts, and dollars a month), when the tank is heated; 0 for a dry or unheated tank */
  heatW: number; heatUsdMonth: number;
}
const surfaceSqIn = (T: TankSetup['tank']) => footprint(T).area / 645.16;
/** The honest list for the user who insists on no lid: what an open top gives (look, growth, light, access) and what it costs (evaporation, heat, escapes, dust, pets, children), in gallons,
 *  inches, watts and dollars for THIS tank. `heat` is the engine's own heat-loss model (tech.json surface factors), passed in so this file stays pure. */
export function lidFreeProsCons(S: TankSetup, heat?: (lid: LidType) => number): LidFree {
  const sq = surfaceSqIn(S.tank), open = Math.round(sq * EVAP_IN_PER_WEEK / 231 * 10) / 10, lidded = Math.round(sq * EVAP_IN_PER_WEEK * EVAP_KEPT.glass / 231 * 10) / 10;
  const wet = S.water.on, who = lidNeedOfSetup(S);
  const heatW = wet && heat ? Math.max(0, Math.round(heat('open') - heat('glass'))) : 0;
  const heatUsdMonth = Math.round(heatW * 24 * 30 / 1000 * KWH_USD * 100) / 100;
  const pros = [
    'Nothing between you and the water: the open-top look, no glass strip or hood in the picture',
    wet ? 'The whole surface is open to the air: the best gas exchange, no film trapped under the lid, and easy feeding and hand access' : 'Air moves freely through the top',
    'Light reaches the water unblocked by glass or a hood, and plants can grow up out of the tank',
    'No lid to wipe, lift or work around for maintenance',
  ];
  const cons = [
    wet ? `Evaporation: about ${open} gal a week from this surface (${Math.round(sq)} sq in) against about ${lidded} gal under a glass top, so more top-offs and salt or minerals that climb as the water drops` : 'A dry enclosure loses its humidity and heat through an open top',
    ...(heatW > 0 ? [`Heat: the heater works about ${heatW} W harder, roughly $${heatUsdMonth.toFixed(2)} a month, and the water sits a few °F cooler if it cannot keep up`] : []),
    wet ? 'Jumping: any animal that is startled or chased can leave the tank, and a jumper is usually found dead on the floor' : 'Anything in a dry enclosure can walk, climb or leap out',
    'Dust, hair, falling objects, and curious pets or children can get in',
  ];
  if (who.required.length) cons.unshift(`These animals need a lid: ${who.required.map(w => `${w.name} (${w.reason})`).join('; ')}`);
  return { pros, cons, evapGalOpen: open, evapGalLidded: lidded, heatW, heatUsdMonth };
}

/** The Problem for an open top with an animal that needs one, naming each; undefined when the tank has a lid or nobody needs one. */
export function openTopProblem(S: Pick<TankSetup, 'fish' | 'lid'>): { names: string[]; text: string } | undefined {
  if (S.lid !== 'open') return undefined;
  const r = lidNeedOfSetup(S).required;
  if (!r.length) return undefined;
  const names = r.map(w => w.name);
  return { names, text: `${names.join(', ')} ${names.length > 1 ? 'need' : 'needs'} a lid and the top is open: ${r.map(w => `${w.name} ${w.reason}`).join('; ')}` };
}
