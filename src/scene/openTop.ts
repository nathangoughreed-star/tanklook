// Open-top archetypes (lane OG1, 2026-11-03; Nathan: "an overflowing garden with plants sprouting and growing out of the tank on purpose.
// This type will not use a lid and therefore should not suggest any jumping fish or escape artists."). The scene has no lid at any density
// and its animal lists leave out every species that needs one. `needsLid` is the ONE place that decides who needs a lid, and it reads lane LB1's src/data/lidNeed.ts.
import type { Archetype } from './archetypes';
import type { Species } from '../data/species';
import { lidNeedOf } from '../data/lidNeed';

import type { Item } from './types';

/** The open-top garden's own pieces (rim planters, the houseplants on them, the emersed stems; lane OG2) carry a seed in this range, so a second dressing of a scene
 *  knows they are there and the editor's density sliders (scene/starter.ts regenerate) leave them in place. */
export const GARDEN_SEED = 1_900_000_000, GARDEN_SEEDS = 100;
export const isGardenPiece = (it: Pick<Item, 'seed'>) => it.seed >= GARDEN_SEED && it.seed < GARDEN_SEED + GARDEN_SEEDS;

/** The archetypes drawn and stocked without a lid. */
export const OPEN_TOP: ReadonlySet<string> = new Set(['overgrown-garden']);
export const isOpenTop = (a: Archetype | string): boolean => OPEN_TOP.has(typeof a === 'string' ? a : a.id);

/** Whether this animal needs a lid (so it is not suggested for a tank with none): lane LB1's data/lidNeed.ts is the one place that decides. */
export const needsLid = (sp: Species): boolean => lidNeedOf(sp.id).need === 'required';
