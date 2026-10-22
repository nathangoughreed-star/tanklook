// Fighting limits for the scene's own tank (S196, Nathan 2026-10-22): more of a species whose count is limited by fighting
// (fightsOverCount: a `territory` rule, one to a tank, or a pair at most) than its size-scaled `territory` rule, else its flat `max`, gives a warning line. A warning only: the stocking percent never reads it (research/territory-caps.md).
import { CARE } from '../data/care';
import { fightsOverCount, malesWarning, mostFor, mostMalesFor } from '../data/groups';
import { getSpecies } from '../data/species';
import { volume } from './physics';
import { countsAgainstWater, plural } from './stocking';
import type { TankSetup } from './types';

export function crowdWarnings(S: TankSetup): string[] {
  const n = new Map<string, number>(), males = new Map<string, number>();
  for (const f of S.fish) { const sp = getSpecies(f.species); if (sp && countsAgainstWater(sp)) { n.set(sp.id, (n.get(sp.id) ?? 0) + 1); if (f.sex !== 'f') males.set(sp.id, (males.get(sp.id) ?? 0) + 1); } }
  const litres = volume(S.tank).litres, out: string[] = [];
  for (const [id, k] of n) {
    const c = CARE[id], mx = mostFor(c, litres) ?? (c?.solo ? 1 : undefined), name = getSpecies(id)!.name;
    // fighters only: a school's flat max means "plenty", not fighting; room is the stocking percent's job
    if (c?.beyond && mx && k > mx) { out.push(`${plural(k, name)}: ${c.beyond}.`); continue; }
    if (!mx || k <= mx || !fightsOverCount(c)) {
      const mm = mostMalesFor(c, litres), m = males.get(id) ?? 0; // the scene knows each fish's sex (absent = male)
      if (mm !== undefined && m > mm) out.push(malesWarning(name, m, mm, true, c!.males!.each));
      continue;
    }
    out.push(mx === 1 ? `${name} is best kept one to a tank: expect fighting.`
      : `${plural(k, name)}: more than about ${mx} in a tank this size may fight${c?.territory?.note ? ` (${c.territory.note})` : c?.sexed ? ` (keep ${c.sexed.ratio[0]} male to ${c.sexed.ratio[1]} females)` : ''}.`);
  }
  return out;
}
