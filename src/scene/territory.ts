// Fighting limits for the scene's own tank (S196, Nathan 2026-10-22): more of a species whose count is limited by fighting
// (fightsOverCount: a `territory` rule, one to a tank, or a pair at most) than its size-scaled `territory` rule, else its flat `max`, gives a warning line. A warning only: the stocking percent never reads it (research/territory-caps.md).
import { CARE } from '../data/care';
import { fightsOverCount, malesWarning, mostFor, mostMalesFor, pairRule } from '../data/groups';
import { getSpecies } from '../data/species';
import { volume } from './physics';
import { countsAgainstWater, plural } from './stocking';
import { pairingIn } from './pairs';
import { whysAnimal } from './animalfit';
import { floorOf } from './tankMin';
import { PATCH_PLANTS } from './nitrogen';
import type { TankSetup } from './types';

export function crowdWarnings(S: TankSetup): string[] {
  const n = new Map<string, number>(), males = new Map<string, number>();
  for (const f of S.fish) { const sp = getSpecies(f.species); if (sp && countsAgainstWater(sp)) { n.set(sp.id, (n.get(sp.id) ?? 0) + 1); if (f.sex !== 'f') males.set(sp.id, (males.get(sp.id) ?? 0) + 1); } }
  const litres = volume(S.tank).litres, out: string[] = [];
  for (const [id, k] of n) {
    const c = CARE[id], mx = mostFor(c, litres) ?? (c?.solo ? 1 : undefined), name = getSpecies(id)!.name;
    // fighters only: a school's flat max means "plenty", not fighting; room is the stocking percent's job
    // two of a pair species: the species' unpaired line until the owner marks them an established pair (TankSetup.pairs, 2026-10-22)
    const pr = k === 2 && pairRule(id) ? pairingIn(S, id) : undefined;
    if (pr && pr !== 'established' && c?.msg?.unpaired) { out.push(`${plural(k, name)}: ${c.msg.unpaired}${pr === 'unknown' ? ' (pairing not set: select one to mark them a pair)' : ''}.`); continue; }
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

/** The stocking's compatibility risks for the tank (lane CP 2026-10-22, from an outside audit: the bars said "room for 17 % more"
 *  over pea puffers, a dwarf gourami and a breeding krib pair). Kept apart from the percents: load and compatibility are separate.
 *  `high`: any blocking pair (each pair said once, from the side that acts), else `concern`; the breeding-pair floor rule (care
 *  `guard`) is a concern. Null when nothing applies. Temperature, size and expertise are said elsewhere. */
export function compatRisks(S: TankSetup): { level: 'high' | 'concern'; items: string[] } | null {
  const ids = [...new Set(S.fish.map(f => f.species))], sp = ids.flatMap(id => { const s = getSpecies(id); return s && s.habitat !== 'land' ? [s] : []; });
  const block: string[] = [], concern: string[] = [];
  for (const s of sp) for (const o of sp) {
    if (o === s) continue;
    const ws = whysAnimal(s, Infinity, 3, [o]), blocked = ws.some(w => !w.concern && !w.temp);
    for (const w of ws) {
      if (w.concern && blocked) continue; // a blocked pair is said by its blocker alone
      const t = w.text.replace(/^compatibility: /, '');
      // the passive mirror ("it would ...") is the other side's line; chemistry is symmetric, said once
      if (w.kind !== 'compat' || w.temp || /^it /.test(t) || (/^water (chemistry|hardness)/.test(t) && s.id > o.id)) continue;
      (w.concern ? concern : block).push(`${s.name} with ${o.name}: ${t.replace(/ \([^)]*\)$/, '')}`);
    }
  }
  const area = floorOf(S.tank).areaCm2;
  for (const s of sp) {
    const g = CARE[s.id]?.guard, mine = S.fish.filter(f => f.species === s.id);
    if (!g || area >= 2 * g || !sp.some(o => o !== s && o.cat.endsWith('-fish'))) continue;
    const pair = pairingIn(S, s.id) === 'established' || (mine.some(f => f.sex === 'f') && mine.some(f => f.sex !== 'f'));
    if (pair) concern.push(`${s.name} breeding pair defends much of this floor (${Math.round(area / 6.4516)} sq in): tankmates need caves and sight breaks elsewhere`);
  }
  return block.length ? { level: 'high', items: [...block, ...concern] } : concern.length ? { level: 'concern', items: concern } : null;
}
/** The tile's headline line for compatRisks. */
export const compatLine = (r: NonNullable<ReturnType<typeof compatRisks>>) => `${r.level === 'high' ? 'High compatibility risk' : 'Compatibility concern'}: ${r.items.join('; ')}.`;

/** Plants per 100 L that read as densely planted for cover (lane CP2): two thirds of the stocking engine's "fully planted" 15. */
export const DENSE_PLANTS_PER_100L = 10;
/** Cover the stocked animals need and the scene lacks (lane CP2 2026-10-22, care `cover`): dense planting (live or artificial, so
 *  sight lines break) or a cave or arch (water dishes do not count). Advice only, one line per species. */
export function coverAdvice(S: TankSetup): string[] {
  if (!S.water.on) return [];
  const litres = volume(S.tank).litres, out: string[] = [];
  const plants = S.items.filter(i => i.kind === 'plant' || i.kind === 'artificial').length + (S.patches ?? []).filter(p => p.brush.startsWith('plant:')).length * PATCH_PLANTS;
  const caves = S.items.filter(i => i.kind === 'cave' && i.variant !== 'dish' && i.variant !== 'stonedish').length;
  for (const id of new Set(S.fish.map(f => f.species))) {
    const need = CARE[id]?.cover, name = getSpecies(id)?.name;
    if (!need || !name) continue;
    const want = Math.ceil(DENSE_PLANTS_PER_100L * litres / 100);
    if (need === 'plants' && plants < want) out.push(`${name}: plant densely (about ${want} plants for this tank, you have ${plants}) so they can break sight lines and claim spots.`);
    if (need === 'cave' && !caves) out.push(`${name}: add a cave or arch (Hardscape › Caves): they spawn in one and a pair guards it.`);
  }
  return out;
}
