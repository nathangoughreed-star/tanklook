// Saved tanks from before 2026-11-28 hold the bubble-tip anemone as a coral ITEM (kind 'coral', variant 'anemone'). It is now a stocked
// animal (species 'bta', kind 'sessile'; research/design/sessile-livestock.md), so a file or snapshot is upgraded as it loads: each such
// item becomes a Fish at the same spot and size, keeping its uid. No scene version bump (Nathan 2026-11-28): the step is idempotent
// and runs on every parse, so a tank saved by the older app still opens and an already-migrated one is left alone.
import { getSpecies } from '../data/species';
import { groundHeight } from './terrain';
import type { Fish, TankSetup } from './types';

/** Items that stood for the anemone, by item variant -> species id. */
const ITEM_SPECIES: Record<string, string> = { anemone: 'bta' };

/** Turn the anemone items of `s` into sessile animals, in place; returns how many moved. */
export function migrateAnemoneItems(s: Pick<TankSetup, 'items' | 'fish' | 'tank'> & Parameters<typeof groundHeight>[0]): number {
  const keep = [], moved: Fish[] = [];
  let id = s.fish.reduce((m, f) => Math.max(m, f.id), 0) + 1;
  for (const it of s.items) {
    const sp = it.kind === 'coral' ? getSpecies(ITEM_SPECIES[it.variant] ?? '') : undefined;
    if (!sp) { keep.push(it); continue; }
    const g = groundHeight(s, s.tank, it.x, it.depth), onRock = it.lift > 5;
    moved.push({ id: id++, ...(it.uid ? { uid: it.uid } : {}), species: sp.id, x: it.x, y: g + Math.max(0, it.lift), depth: it.depth, yaw: it.yaw, pitch: 0, roll: 0, bend: 0,
      surface: onRock ? 'hardscape' : 'floor', ...(Math.round(it.size) !== sp.tl ? { tl: Math.round(it.size) } : {}) });
  }
  if (!moved.length) return 0;
  s.items = keep; s.fish = [...s.fish, ...moved];
  return moved.length;
}
