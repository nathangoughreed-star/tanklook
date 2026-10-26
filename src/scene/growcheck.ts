// The editor's growth line for young fish (S228, Nathan 2026-10-26): a young animal that fits today is told how long the tank lasts it,
// and what fails first as it grows (the tank minimum, or a tankmate it can then eat). The herps have their own line in herpcheck.ts
// (floor and height by stage); both step through scene/outgrows.ts.
import { fishTL, getSpecies } from '../data/species';
import { HERP } from '../data/herpstock';
import { ADULT_SHARE, youngLengths } from '../data/growth';
import { MIN_SLACK_PCT, preyRisk } from './animalfit';
import { firstFail, lenAbout, lengthIn, span } from './outgrows';
import { reasonIn, tankMinimum } from './tankMin';
import type { StockIssue } from './herpcheck';
import type { Fish, TankSetup } from './types';

/** What fails for these animals in this tank, the size first, then a tankmate eaten: [the species it is about, the words]; else undefined. */
export function growFail(S: TankSetup, fish: Fish[] = S.fish): [string, string] | undefined {
  const at = { ...S, fish }, tm = tankMinimum(at), row = tm.rows.find(r => r.pct > MIN_SLACK_PCT);
  if (row) return [row.id, `it needs a bigger tank: ${reasonIn(row, { len: mm => lenAbout(mm), area: cm2 => `${+(cm2 / 929.03).toFixed(2)} sq ft` })}`];
  const tl = youngLengths(fish), ids = [...new Set(fish.map(f => f.species))], sps = ids.map(getSpecies).filter(s => !!s);
  for (const a of sps) for (const b of sps) if (a !== b && preyRisk(a, b, tl[a.id], tl[b.id]) === 'eats') return [a.id, `it can eat the ${b.name.toLowerCase()}`];
  return undefined;
}

export function growthCheck(S: TankSetup): StockIssue[] {
  // only a tank with a young fish in it, and only when it holds them today (today's verdict is said by the tile and the risks)
  const young = S.fish.filter(f => { const sp = getSpecies(f.species); return sp && !HERP[sp.sci] && f.tl !== undefined && f.tl < fishTL({ sex: f.sex }, sp) * ADULT_SHARE; });
  if (!young.length || growFail(S)) return [];
  const o = firstFail(S.fish, at => growFail(S, at));
  if (!o) return [];
  const [id, why] = o.why, sp = getSpecies(id)!;
  return [{ level: 'info', who: sp.name, text: `fine for now: this tank should last about ${span(o.months)}, until it is about ${lenAbout(lengthIn(o, id))} long; then ${why}.` }];
}
