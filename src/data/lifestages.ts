// Life stages of the reptiles and arachnids (lane BP2, 2026-10-16): a hatchling / juvenile / sub-adult / adult length for the
// add-animal size picker. A snake has real lengths (art/snakes.ts SNAKE_STAGES); geckos, spiders and tarantulas a share of
// their adult length (a hatchling gecko is about a third of an adult, a sling about a sixth).
import { SNAKE_STAGES } from '../art/snakes';
import type { Species } from './species';

const SHARE: Record<string, number[]> = { reptile: [0.3, 0.55, 0.8, 1], 'land-invert': [0.15, 0.4, 0.7, 1] };
const NAMES = ['hatchling', 'juvenile', 'sub-adult', 'adult'];

/** [name, length mm] per stage, or null where the species has no stage picker. */
export function lifeStages(sp: Pick<Species, 'cat' | 'tl' | 'body'>): [string, number][] | null {
  if (sp.body === 'snake') return SNAKE_STAGES.map(([n, mm]) => [n, Math.min(mm, sp.tl)] as [string, number]);
  const sh = SHARE[sp.cat]; if (!sh) return null;
  return sh.map((k, i) => [NAMES[i], Math.round(sp.tl * k)] as [string, number]);
}
