// Lane HV unit 1 (Fable answer 6 item 2): the working behind the "Room used" number, in words. Pure. `countAs`: the school curve (stocking.ts SCHOOL_REF / SCHOOL_EXP: each animal
// past 10 adds less) said per species; `headroom`: how many more of the biggest contributor fit before the 75 % and 100 % marks, found by running the engine itself on the scene
// with that many added (never a second formula), so it cannot disagree with the number.
import { SCHOOL_EXP, SCHOOL_REF, IDEAL_MAX, stockingOf, plural, type Stocking } from '../../scene/stocking';
import type { TankSetup } from '../../scene/types';

export interface RoomWorking { /** "40 Cardinal tetras count as 27 for room", one per species, only when the curve changes the count */ countAs: string[]; /** "Room for about 22 more Cardinal tetras before 100 %" */ headroom?: string }

const CAP = 500;
/** The most extra animals like `proto` that keep the room number at or under `limit` percent (0 when it is already past it; CAP when even CAP fit). */
function fitsMore(S: TankSetup, proto: TankSetup['fish'][number], limit: number): number {
  const at = (k: number) => stockingOf({ ...S, fish: [...S.fish, ...Array.from({ length: k }, (_, i) => ({ ...proto, id: -1 - i }))] }).spacePercent <= limit;
  if (!at(0)) return 0;
  if (at(CAP)) return CAP;
  let lo = 0, hi = CAP; // at(lo) holds, at(hi) does not
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at(mid)) lo = mid; else hi = mid; }
  return lo;
}

export function roomWorking(S: TankSetup, r: Stocking): RoomWorking {
  const out: RoomWorking = { countAs: [] };
  if (!r.contributors.length) return out;
  const N = r.contributors.reduce((t, c) => t + c.n, 0);
  if (N > SCHOOL_REF) {
    const f = (N / SCHOOL_REF) ** (SCHOOL_EXP - 1);
    for (const c of r.contributors) if (c.n > 1) out.countAs.push(`${plural(c.n, c.name)} count as ${Math.max(1, Math.round(c.n * f))} for room: schooling fish share space, so each animal past ${SCHOOL_REF} adds less`);
  }
  const p = r.spacePercent, top = r.spaceBy === 'floor' ? undefined : [...r.contributors].sort((a, b) => b.space - a.space)[0], proto = top && S.fish.find(f => f.species === top.id);
  if (proto && top && Number.isFinite(p) && Math.round(p) <= 100) {
    const bits: string[] = [], to75 = Math.round(p) < IDEAL_MAX ? fitsMore(S, proto, IDEAL_MAX) : -1, to100 = fitsMore(S, proto, 100);
    const say = (k: number) => k >= CAP ? `${CAP}+` : k === 1 ? '1' : `about ${k}`;
    if (to75 > 0) bits.push(`${say(to75)} more ${to75 === 1 ? top.name : top.name + 's'} before 75 % (Full)`);
    if (to100 > 0) bits.push(`${say(to100)} more before 100 % (Over)`);
    if (bits.length) out.headroom = `Room for ${bits.join(', ')}.`;
    else if (to100 === 0) out.headroom = 'No room for more of these.';
  }
  return out;
}
