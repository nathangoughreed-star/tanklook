// Substrate depth and bottom-dweller checks (lane SD1, 2026-11-12). Pure. Reads the substrate type / grain, the corner depths and the terrain,
// the plants and the animals; returns notes for the verdict (scene/verdict.ts). Sources: research/substrate-depth-2026-11-12.md.
//   needs mismatch (a burrower on coarse gravel, too shallow to bury) -> level 'needs': a welfare Caution; Guided Discover drops candidates that add one (scene/rules.ts)
//   sharp / rough bed with a barbel-sensitive animal                    -> level 'needs': a Caution
//   prefers mismatch (corys on gravel)                                  -> level 'prefers': a soft advisory
//   plant deeper-rooted than the bed where it stands                    -> level 'plant'
//   a bed deeper than its grain's anaerobic threshold                   -> level 'deep'
import { DEEP_MM, DWELLER, MM_IN, PLANT_DEPTH, SUBSTRATE_TRAITS, grainRank } from '../data/substrateTraits';
import { getSpecies } from '../data/species';
import { groundHeight } from './terrain';
import type { Grain, TankSetup } from './types';

export interface SubstrateNote { id: string; level: 'needs' | 'prefers' | 'plant' | 'deep'; /** species ids or item uids the note is about */ who: string[]; text: string }

const inch = (mm: number) => `${+(mm / MM_IN).toFixed(1)} in`;
const GRAIN_WORD: Record<Grain, string> = { mud: 'fine soil', sand: 'sand', gravel: 'gravel', pebble: 'pebbles' };

/** The bed's grain and sharpness; custom blends take the coarser grain once it is a quarter of the floor. Undefined for terrestrial grounds. */
export function bedOf(S: TankSetup): { grain: Grain; sharp: boolean; name: string } | undefined {
  const sub = S.substrate;
  if (!sub.show) return undefined;
  if (sub.type === 'custom') {
    const c = sub.custom, two = c.grain2 !== 'none' && c.share >= 25 && grainRank(c.grain2 as Grain) > grainRank(c.grain);
    const grain = two ? c.grain2 as Grain : c.grain;
    return { grain, sharp: false, name: GRAIN_WORD[grain] };
  }
  return SUBSTRATE_TRAITS[sub.type];
}

/** Bed depth over the floor: the mean and the deepest of a 5 x 5 sample of the ground (mm). */
export function bedDepths(S: TankSetup): { mean: number; max: number } {
  const T = S.tank, g = { substrate: S.substrate, layout: S.layout, terrain: S.terrain };
  let sum = 0, max = 0, n = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const h = groundHeight(g, T, T.L * (i + 0.5) / 5, T.D * (j + 0.5) / 5); sum += h; max = Math.max(max, h); n++; }
  return { mean: sum / n, max };
}

export function substrateCheck(S: TankSetup): SubstrateNote[] {
  const bed = bedOf(S);
  if (!bed) return [];
  const out: SubstrateNote[] = [], g = { substrate: S.substrate, layout: S.layout, terrain: S.terrain }, { mean, max } = bedDepths(S);
  // plants that root: the bed where each stands
  const shallow = new Map<string, { need: number; have: number }>();
  for (const it of S.items) {
    const d = it.kind === 'plant' ? PLANT_DEPTH[it.variant] : undefined;
    if (!d) continue;
    const have = groundHeight(g, S.tank, it.x, it.depth);
    if (have + 1 >= d.min) continue;
    const prev = shallow.get(it.variant);
    if (!prev || have < prev.have) shallow.set(it.variant, { need: d.min, have });
  }
  for (const [v, s] of shallow) out.push({ id: `substrate:plant:${v}`, level: 'plant', who: [v],
    text: `The ${v} needs about ${inch(s.need)} of substrate to root where it stands (it has ${inch(s.have)}). Deepen the bed there, or move it to the deeper back.` });
  // too deep for its grain
  const limit = DEEP_MM[bed.grain];
  if (max > limit + 1) out.push({ id: 'substrate:deep', level: 'deep', who: [],
    text: `The ${GRAIN_WORD[bed.grain]} bed is up to ${inch(max)} deep; over about ${inch(limit)} it can go oxygen-poor in pockets (rotten-egg smell, black patches). Keep it shallower, add rooted plants or Malaysian trumpet snails, or use a coarser grain.` });
  // bottom dwellers
  const ids = [...new Set(S.fish.map(f => f.species))];
  for (const id of ids) {
    const r = DWELLER[id], sp = getSpecies(id);
    if (!r || !sp) continue;
    const name = sp.name;
    if (r.sharp && bed.sharp) out.push({ id: `substrate:needs:sharp:${id}`, level: 'needs', who: [id], text: `${name}: ${bed.name} has sharp edges and it ${r.why}. Use sand or smooth fine gravel.` });
    else if (r.needs && grainRank(bed.grain) > grainRank(r.needs)) out.push({ id: `substrate:needs:grain:${id}`, level: 'needs', who: [id],
      text: `${name} needs ${r.needs === 'sand' ? 'soft sand' : 'sand or fine gravel'}; it ${r.why}, and ${GRAIN_WORD[bed.grain]} will not do.` });
    else if (r.needs && r.minDepth && mean < r.minDepth - 1) out.push({ id: `substrate:needs:depth:${id}`, level: 'needs', who: [id],
      text: `${name} needs at least ${inch(r.minDepth)} of ${r.needs === 'sand' ? 'sand' : 'substrate'} to dig in; the bed averages ${inch(mean)}.` });
    else if (r.prefers && grainRank(bed.grain) > grainRank(r.prefers)) out.push({ id: `substrate:prefers:${id}`, level: 'prefers', who: [id],
      text: `${name} does better on sand or smooth fine gravel: it ${r.why}.` });
  }
  return out;
}
