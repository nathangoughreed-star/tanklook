// Open-top archetypes (lane OG1, 2026-11-03; Nathan: "an overflowing garden with plants sprouting and growing out of the tank on purpose.
// This type will not use a lid and therefore should not suggest any jumping fish or escape artists."). The scene has no lid at any density
// and its animal lists leave out every species that needs one. `needsLid` is the ONE place that decides who needs a lid: once lane LB1's
// src/data/lidNeed.ts lands, replace its body with `lidNeed(sp.id) === 'required'` (one line) and drop `ESCAPERS`.
import type { Archetype } from './archetypes';
import type { Species } from '../data/species';
import { NEEDS } from '../data/careNeeds';

/** The archetypes drawn and stocked without a lid. */
export const OPEN_TOP: ReadonlySet<string> = new Set(['overgrown-garden']);
export const isOpenTop = (a: Archetype | string): boolean => OPEN_TOP.has(typeof a === 'string' ? a : a.id);

/** Species that jump or climb out of an open top, beyond the ones careNeeds already names ('Lid: ...'): hatchetfish and the other surface
 *  jumpers (danios, pencilfish, rainbowfish, barbs, bettas and gouramis, livebearers, silver-dollar-style big jumpers such as oscars), the
 *  loaches that squeeze out through any gap, every crayfish and crab, and animals that leave the water on their own (frogs, newts, salamanders,
 *  and the snails and shrimp that crawl out over the rim). */
const ESCAPERS: ReadonlySet<string> = new Set([
  'hatchet', 'danio', 'whitecloud', 'cpd', 'dwarfpencil', 'cherrybarb', 'tigerbarb', 'boesemani', 'betta', 'dwarfgourami', 'honeygourami', 'gourami',
  'guppy', 'platy', 'molly', 'swordtail', 'sae', 'oscar', 'kuhli', 'clownloach', 'hillstream', 'goldfish', 'comet',
  'cpo', 'cajundwarf', 'rswcrayfish', 'redclaw', 'thaicrab',
  'firetoad', 'firenewt', 'adf', 'axolotl',
  'nerite', 'mystery', 'trumpet', 'amano',
]);
const careLid = (id: string) => (NEEDS[id] ?? []).some(n => n.text.startsWith('Lid'));

/** Whether this animal needs a lid (so it is not suggested for a tank with none). */
export const needsLid = (sp: Species): boolean => ESCAPERS.has(sp.id) || careLid(sp.id) || sp.habitat === 'land';
