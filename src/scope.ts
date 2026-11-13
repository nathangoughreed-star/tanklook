// AQ1 (2026-11-13, Nathan R19): the ONE scope switch. 'aquarium' (the live default) shows aquariums only: freshwater, saltwater / reef and
// ripariums. Terrarium, paludarium and herp features stay in the code and data but are hidden at the few choke points that import this
// file (world choice, species / plant / style / gear / tank lists, Discover's pool, the Animal checks card, headline wording).
// Flip DEFAULT_SCOPE to 'all' (or open the page with ?scope=all) to restore every option. Vitest runs with 'all' so the engine tests are unchanged;
// test/aq1scope.test.ts switches to 'aquarium' with setScope(). Keep this file free of imports so any layer can use it.
export type Scope = 'aquarium' | 'all';
export const DEFAULT_SCOPE: Scope = 'aquarium';

function initial(): Scope {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test') return 'all';
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('scope') : null;
    if (q === 'all' || q === 'aquarium') return q;
  } catch { /* no URL (node): the default */ }
  return DEFAULT_SCOPE;
}
let cur: Scope = initial();
export const scope = (): Scope => cur;
export const setScope = (s: Scope): void => { cur = s; };
/** True while only aquariums (freshwater, saltwater, riparium) are in scope. */
export const aquariumOnly = (): boolean => cur === 'aquarium';

/** Shown in an old saved tank that is outside the scope (a terrarium or paludarium). */
export const PAUSED_NOTE = 'Terrariums are paused for now; this tank is shown as saved.';

/** Animal categories (data/species.ts) that belong to an aquarium. */
const AQUARIUM_CATS: ReadonlySet<string> = new Set(['fw-fish', 'fw-invert', 'sw-fish', 'sw-invert']);
/** Fully aquatic amphibians (African dwarf frog, axolotl: habitat 'water') are aquarium animals and stay; every other amphibian, reptile and land invertebrate is hidden. */
export const speciesInScope = (sp: { cat: string; habitat?: string }): boolean => !aquariumOnly() || AQUARIUM_CATS.has(sp.cat) || (sp.cat === 'amphibian' && sp.habitat === 'water');
/** Filter a species list to the scope (a no-op in 'all'). */
export const scopeSpecies = <T extends { cat: string; habitat?: string }>(l: readonly T[]): T[] => aquariumOnly() ? l.filter(speciesInScope) : [...l];

/** World ids (brief.ts World) offered in this scope. */
export const worldInScope = (w: string): boolean => !aquariumOnly() || w === 'aquarium';
/** Environments of archetypes / families (scene/archetypes.ts Env). */
export const envInScope = (e: string | undefined): boolean => !aquariumOnly() || !e || e === 'aquarium';
/** Setup kinds (scene/pickerKind.ts SetupKind). */
export const kindInScope = (k: string): boolean => !aquariumOnly() || k === 'freshwater' || k === 'saltwater';
