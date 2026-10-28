// The species picker's gate and groups (lane S252, 2026-10-27). Pure: which animals a tank offers (by its kind of setup), the role
// group each belongs to, and the order inside a group (best fit for THIS tank first). The fit itself is animalfit.ts's whysAnimal,
// the engine the stocking screen uses; nothing here scores a species on its own.
import { CARE } from '../data/care';
import { GRAZE } from '../data/grazers';
import type { Species } from '../data/species';
import { type AnimalWhy } from './animalfit';
import { isSwampy } from './items';
import type { TankSetup } from './types';

/** The Suggest vocabulary: what kind of setup this is. */
export type SetupKind = 'freshwater' | 'saltwater' | 'terrarium' | 'vivarium';
export const SETUP_KINDS: [SetupKind, string, string][] = [
  ['freshwater', 'Freshwater', 'A freshwater aquarium: fish, shrimp and snails, and aquatic frogs'],
  ['saltwater', 'Saltwater', 'A marine tank or reef'],
  ['terrarium', 'Terrarium', 'A dry enclosure for reptiles, frogs and land invertebrates'],
  ['vivarium', 'Vivarium', 'Water and land together (a paludarium): the freshwater and land animals both'],
];

/** The kind of setup: the owner's choice while it agrees with the water, else read from it (no water = terrarium, a swamp or
 *  paludarium style = vivarium, salt on = saltwater). The water type is therefore always settled, never found out in the list. */
export function tankKind(s: Pick<TankSetup, 'water' | 'layout'>): SetupKind {
  const w = s.water, k = s.layout.kind;
  if (k === 'terrarium' ? !w.on : k === 'saltwater' ? w.on && !!w.salt : k === 'vivarium' ? w.on && !w.salt : k === 'freshwater' ? w.on && !w.salt : false) return k!;
  return !w.on ? 'terrarium' : w.salt ? 'saltwater' : isSwampy(s.layout.id) ? 'vivarium' : 'freshwater';
}
/** Edit a setup to be this kind: the water on or off and its type. A terrarium keeps its water settings for when it comes back. */
export function applyKind(s: TankSetup, k: SetupKind): void {
  s.layout = { ...s.layout, kind: k };
  s.water.on = k !== 'terrarium';
  if (k === 'saltwater') s.water.salt = true; else delete s.water.salt;
}

/** Does this kind of setup offer this species? Fresh: not marine, lives in the water (snails too). Salt: marine. Terrarium: land and
 *  amphibious animals. Vivarium: everything not marine. */
export function offeredIn(sp: Species, k: SetupKind): boolean {
  if (k === 'saltwater') return !!sp.salt;
  if (sp.salt) return false;
  if (k === 'vivarium') return true;
  if (k === 'terrarium') return sp.habitat !== 'water' && sp.kind !== 'snail';
  return sp.habitat === 'water' || sp.kind === 'snail';
}

export type Role = 'school' | 'centre' | 'community' | 'algae' | 'bottom' | 'invert' | 'herp' | 'arthropod';
export const ROLES: [Role, string, string][] = [
  ['school', 'Schooling fish', 'Fish kept in a group of five or more'],
  ['centre', 'Centerpiece fish', 'The showpiece, large or solitary fish a tank is built around'],
  ['community', 'Community fish', 'Small and peaceful fish that do not need a big group'],
  ['algae', 'Algae eaters', 'Animals that graze algae'],
  ['bottom', 'Bottom & cleanup crew', 'Fish that live on the floor and sweep up what falls'],
  ['invert', 'Inverts', 'Shrimp, snails and other water invertebrates'],
  ['herp', 'Reptiles & amphibians', 'Geckos, snakes, frogs, newts and salamanders'],
  ['arthropod', 'Arthropods', 'Spiders and tarantulas'],
];
/** Grazers by diet: the species the grazer table (data/grazers.ts) knows plus the fish and shrimp keepers buy for algae. Not derivable from the data otherwise. */
const ALGAE_EATERS = new Set([...Object.keys(GRAZE), 'oto', 'bristlenose', 'sae', 'cherryshrimp', 'amano', 'nerite', 'turbo']);
/** Which role group a species is listed under, derived from its category, swim zone, group size and appeal tags. */
export function roleOf(sp: Species): Role {
  if (sp.cat === 'amphibian' || sp.cat === 'reptile') return 'herp';
  if (sp.cat === 'land-invert') return 'arthropod';
  if (ALGAE_EATERS.has(sp.id)) return 'algae';
  if (sp.cat.endsWith('-invert')) return 'invert';
  const c = CARE[sp.id], tags = c?.appeal ?? [], zone = c?.zone;
  const school = !sp.pair && !c?.alone && !c?.solo && (tags.includes('shoal') || ((!!sp.group || (c?.bands?.ok ?? c?.group ?? 1) >= 5) && !tags.includes('showpiece') && sp.tl < 150)); // pairs, loners and big ones (goldfish) are not a school // a showpiece kept in a group (discus) is still the centerpiece
  if (zone === 'bottom' && (tags.includes('cleanup') || school || !tags.includes('showpiece'))) return 'bottom';
  if (school) return 'school';
  return tags.includes('showpiece') || c?.solo || sp.tl >= 120 ? 'centre' : 'community';
}
/** The role groups a kind of setup lists, in menu order. */
export const rolesFor = (k: SetupKind): Role[] => ROLES.map(r => r[0]).filter(r => k === 'terrarium' ? r === 'herp' || r === 'arthropod' : k === 'vivarium' || r !== 'arthropod');

/** How a species sits in this tank: the strict reading (a caution grays it as a problem does; only the Suggest rule's own wording differs). */
export interface Fit { level: 'ok' | 'caution' | 'problem'; text: string; more: string[] }
export const OK_FIT: Fit = { level: 'ok', text: '', more: [] };
/** From whysAnimal's reasons (blocking first). The keeper's expertise is the owner's own gate (Quick Setup), so it only counts when `expertise` is true. */
export function fitFrom(whys: AnimalWhy[], expertise: boolean): Fit {
  const w = whys.filter(x => expertise || x.kind !== 'expertise');
  if (!w.length) return OK_FIT;
  return { level: w.some(x => !x.concern) ? 'problem' : 'caution', text: w[0].text.replace(/^(tank size|compatibility|water temperature|temperature|water chemistry|water hardness): /, ''), more: w.slice(1).map(x => x.text) };
}
/** Best fit first: ok, then caution, then problem; fewer reasons before more; then by name. Stable, so equal fits keep the list's order. */
export const fitRank = (f: Fit) => (f.level === 'ok' ? 0 : f.level === 'caution' ? 1 : 2) * 100 + f.more.length;
/** The groups to list, each with its species best-fit first; empty groups dropped. `fitOf` is the tank's reading of one species. */
export function groupPicker(list: Species[], kind: SetupKind, fitOf: (sp: Species) => Fit): { role: Role; label: string; rows: { sp: Species; fit: Fit }[] }[] {
  const by = new Map<Role, { sp: Species; fit: Fit }[]>();
  for (const sp of list) { const r = roleOf(sp); (by.get(r) ?? by.set(r, []).get(r)!).push({ sp, fit: fitOf(sp) }); }
  return rolesFor(kind).filter(r => by.has(r)).map(r => ({ role: r, label: ROLES.find(x => x[0] === r)![1], rows: by.get(r)!.sort((a, b) => fitRank(a.fit) - fitRank(b.fit) || a.sp.name.localeCompare(b.sp.name)) }));
}
