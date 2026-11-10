// Explore, stage X2 (lane OX4): STAGE B of the two-stage pipeline (spec section 7): rank and diversify what stage A (pool.ts + gate.ts) already declared eligible.
// `assembleBatch(eligible, aspects)` is the ONE place the two meet, and it takes them as two separate arguments: `eligible` is the gate's output and decides what may be shown, `aspects` is the
// preference profile and only decides the ORDER. Nothing here reads a limit, a verdict or an estimate; a candidate the gate did not pass is not in `eligible`, so no preference can bring it back.
// A batch is built from three rules:
//   1. dedupe     nothing already shown / liked / passed, and nothing within MIN_DISTANCE of it or of another pick (candidate.ts), the best scorer of a near-copy pair surviving;
//   2. exploit    most of the slots go by aspect score (what the profile has learned), each next pick also rewarded for how different it is from the picks before it;
//   3. explore    about EXPLORE_SHARE of the slots (1-2 of 6, never when the pool cannot support it) go to candidates FAR from what was liked, from a different world where possible,
//                 never ones the person has clearly turned down (a Pass is evidence about a candidate, not a ban on its world: the world's weight has a floor, aspects.ts).
// With no profile yet the batch is pure diversity (world round-robin by distance). The batch size is a constant: 6, or 3 on a machine that renders in software (the X0 spike).
import { aspectScore, interpretationOf, matchesOf, weightsOf, labelOf, type Aspects, type Interpretation, type Weight } from './aspects';
import { dedupe, distance, type Dropped, type Entry } from './candidate';
import { BATCH_SIZE, BATCH_SIZE_SOFTWARE_GL, DIVERSITY_WEIGHT, EXPLORE_MIN_SCORE, EXPLORE_SHARE } from './constants';

/** Cards in a batch for the renderer in use (explore-cost-spike.md: a GPU draws a new card in about a second, software GL in 5-20 s). */
export const batchSizeOf = (softwareGl: boolean): number => softwareGl ? BATCH_SIZE_SOFTWARE_GL : BATCH_SIZE;
/** `UNMASKED_RENDERER` of a software rasteriser (SwiftShader, llvmpipe, "Microsoft Basic Render Driver"). */
export const isSoftwareRenderer = (renderer: string): boolean => /swiftshader|llvmpipe|basic render|software/i.test(renderer);

export type PickRole = 'match' | 'explore' | 'first';
export interface Pick<T> { entry: T; role: PickRole; /** the aspect score (0 with no profile) */ score: number; /** the learned aspects it matches, in words (empty for a "something different" pick) */ why: string[] }
export interface Batch<T> {
  picks: Pick<T>[];
  /** slots given to exploration this batch (0 with no profile, or a pool too small to spare one) */
  exploreSlots: number;
  /** was there a profile to follow */
  followed: boolean;
  interpretation?: Interpretation;
  /** entries left out as repeats of what was seen or as near-copies of a pick, for the "fewer than six, here is why" line */
  dropped: Dropped<T>[];
}
export interface BatchOptions {
  size?: number; exploreShare?: number;
  /** everything shown, liked, passed or saved in this exploration (the batch never repeats it nor lands near it) */
  seen?: readonly Entry[];
  /** an explicit "show me a variation of this" request: that one candidate no longer rules out its neighbours */
  variantOf?: string;
}

/** The world of an entry in the profile's own terms (fresh, marine, brackish, land, landwater): an aquarium of salt water is another world from one of fresh water. */
const worldOf = (e: Entry) => e.features.find(k => k.startsWith('world:')) ?? e.fp.world;
/** How much of the profile's positive weight a candidate carries: "how close to what was liked". */
const liked = (w: Map<string, Weight>, f: readonly string[]) => f.reduce((s, k) => s + Math.max(0, w.get(k)?.w ?? 0), 0);

export function assembleBatch<T extends Entry>(eligible: readonly T[], aspects: Aspects | undefined, opt: BatchOptions = {}): Batch<T> {
  const w = weightsOf(aspects), followed = w.size > 0, score = new Map(eligible.map(e => [e.id, followed ? aspectScore(w, e.features) : 0]));
  const sc = (e: T) => score.get(e.id) ?? 0, seen = opt.seen ?? [];
  // best scorers first, so the survivor of a near-copy pair is the one the profile likes
  const ranked = [...eligible].sort((a, b) => sc(b) - sc(a));
  const { kept, dropped } = dedupe(ranked, seen, { variantOf: opt.variantOf });
  const size = Math.max(0, Math.min(opt.size ?? BATCH_SIZE, kept.length));
  const slots = followed && size >= 2 && kept.length > size ? Math.min(size - 1, Math.max(1, Math.round(size * (opt.exploreShare ?? EXPLORE_SHARE)))) : 0;
  const far = (e: T, chosen: readonly Entry[]) => Math.min(1, ...[...seen, ...chosen].map(c => distance(c.fp, e.fp)));
  const why = (e: T) => matchesOf(w, e.features).map(m => labelOf(m.key));

  const chosen: Pick<T>[] = [], left = [...kept];
  const take = (e: T, role: PickRole) => { chosen.push({ entry: e, role, score: sc(e), why: role === 'explore' ? [] : why(e) }); left.splice(left.indexOf(e), 1); };
  // exploit: the strongest first, then each next one by score plus a reward for being unlike the picks so far
  for (let i = 0; i < size - slots && left.length; i++) {
    const best = left.reduce((m, e) => sc(e) + DIVERSITY_WEIGHT * far(e, chosen.map(c => c.entry)) > sc(m) + DIVERSITY_WEIGHT * far(m, chosen.map(c => c.entry)) ? e : m, left[0]);
    take(best, i === 0 ? 'first' : 'match');
  }
  // explore: far from what was liked, a different world (then family) from the exploit picks where possible, never one the person has clearly turned down
  for (let i = 0; i < slots && left.length; i++) {
    // "turned down" is judged on the candidate's own aspects: a world can be lowered but never rules a candidate out of the surprises (its weight has a floor)
    const exploit = chosen.map(c => c.entry), okay = left.filter(e => aspectScore(w, e.features.filter(k => !k.startsWith('world:'))) >= EXPLORE_MIN_SCORE), from = okay.length ? okay : left;
    const val = (e: T) => -liked(w, e.features) + (exploit.some(x => worldOf(x) === worldOf(e)) ? 0 : 0.5) + (exploit.some(x => x.fp.familyId === e.fp.familyId) ? 0 : 0.25) + DIVERSITY_WEIGHT * far(e, chosen.map(c => c.entry));
    take(from.reduce((m, e) => val(e) > val(m) ? e : m, from[0]), 'explore');
  }
  const interpretation = interpretationOf(aspects);
  return { picks: chosen, exploreSlots: slots, followed, ...(interpretation ? { interpretation } : {}), dropped };
}

/** Lane AB1 (Discovery v2): ORDER candidates the gate already passed by the learned aspects, best first (stable for ties). It never adds, drops or revives a candidate: what it is given is what it returns, so a preference can never make an ineligible one appear. */
export function rankEligible<T extends Entry>(eligible: readonly T[], aspects: Aspects | undefined): T[] {
  const w = weightsOf(aspects), sc = new Map(eligible.map(e => [e.id, w.size ? aspectScore(w, e.features) : 0]));
  return eligible.map((e, i) => ({ e, i })).sort((a, b) => (sc.get(b.e.id) ?? 0) - (sc.get(a.e.id) ?? 0) || a.i - b.i).map(x => x.e);
}
