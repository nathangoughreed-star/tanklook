// Pure logic for the stocking screen and the fork card (lane P5, 2026-10-20): picks and counts, tankmate ranking, the tank the picks need,
// fork options. No DOM; src/ui/stockPlan.ts draws it. Reads CARE (with the P1 group data merged in) and the P2 engine (scene/tankfit.ts).
import { IDEAL_MAX } from '../scene/stocking';
import { CARE } from '../data/care';
import { bandMessage, bandOf, fightsOverCount, malesWarning, mostFor, mostMalesFor, PAIR_FORMERS, pairRule, type GroupBand } from '../data/groups';
import { needLine, needsOf, type NeedSeverity } from '../data/careNeeds';
import { getSpecies, SPECIES, type Species } from '../data/species';
import { TANK_MODELS, tankFromModel, type TankModel } from '../data/tanks';
import { whyAnimal, whysAnimal } from '../scene/animalfit';
import { operatingCheck, rangeLine, sharedRange } from '../scene/temprange';
import { volume } from '../scene/physics';
import { spaceFit, tankExtent } from '../scene/space';
import { buildSpan, fitIn, lenTxt, stepUps, tankFor, tankLabel, tankOptions, zoneOf, type AnimalCount, type BuildSpan, type TankFit } from '../scene/tankfit';
import { countsAgainstWater } from '../scene/stocking';
import { minDataOf } from '../scene/tankMin';
import { setPairing } from '../scene/pairs';
import type { Fish, Pairing, SpaceLimit, Tank, TankSetup, Units } from '../scene/types';

export type { Pairing };
/** One species on the list. Sex and pairing are separate inputs (lane RF): species usually kept by sex (CARE.sexed) carry males in `n`,
 *  females in `f` and unsexed animals in `u`; the rest just `n`. `pair` = the pairing status (only asked where pairRule holds). */
export interface Pk { id: string; n: number; f?: number; u?: number; pair?: Pairing }
export const isSexed = (id: string) => !!CARE[id]?.sexed;
/** The Space band a percent shows in, on the ROUNDED percent the screen prints (S214 2026-10-26: the bar coloured on the rounded
 *  value while the "past ideal" label read the raw one, so 74.6-74.99 % showed an amber "75 %" bar with no label). */
export const spaceBand = (pct: number): 'ok' | 'near' | 'over' => Math.round(pct) > 100 ? 'over' : Math.round(pct) >= IDEAL_MAX ? 'near' : 'ok';
export const totalOf = (p: Pk) => p.n + (p.f ?? 0) + (p.u ?? 0);
export { PAIR_FORMERS, pairRule }; // the list lives in data/groups.ts (the editor's warnings read it too)
/** Write the picks' pairings into the tank they were synced to (after its fish are set): each pair species with two animals keeps the
 *  status the owner chose, for those two animals (scene/pairs.ts). */
export function writePairs(T: Pick<TankSetup, 'fish' | 'pairs'>, picks: Pk[]): void {
  for (const p of picks) if (pairRule(p.id)) setPairing(T, p.id, asksPairing(p) ? p.pair ?? 'unknown' : 'unknown');
}
/** The pairing question is asked: a pair species with exactly two animals on the list. */
export const asksPairing = (p: Pk) => pairRule(p.id) && totalOf(p) === 2;
/** The most one tank is advised to take (a warning past it, never a block); with the tank's litres, the size-scaled rule (S196). */
export const maxOf = (id: string, litres?: number, lengthMm?: number) => mostFor(CARE[id], litres, lengthMm) ?? 99;
export const minOf = (id: string) => CARE[id]?.bands?.ok ?? CARE[id]?.group ?? 1;

/** The picks as the tank-fit engine wants them (males and females together). */
/** The picks as counts for the tank engine; females counted apart so they are sized at the female length (unsexed at the species length). */
export const animalsOf = (picks: Pk[]): AnimalCount[] => picks.filter(p => totalOf(p) > 0).map(p => ({ species: p.id, n: totalOf(p), ...(p.f ? { f: p.f } : {}) }));

/** A species added at its recommended minimum; a sexed one at the smallest whole multiple of its ratio that reaches that minimum. */
export function startPick(id: string): Pk {
  const min = minOf(id), r = CARE[id]?.sexed?.ratio;
  if (!r) return { id, n: Math.min(min, maxOf(id)) };
  const per = r[0] + r[1] || 1, k = Math.max(1, Math.ceil(min / per));
  return { id, n: r[0] * k, f: r[1] * k };
}

/** Add `d` (+1 / -1) to one count of a pick, never below 0; males (or the count) 'n', females 'f', unsexed 'u'. Past the species' advised
 *  most it only warns (overWarn). */
export function bump(p: Pk, which: 'n' | 'f' | 'u', d: number): Pk {
  const was = which === 'n' ? p.n : p[which] ?? 0, v = Math.max(0, was + d);
  if (v === was) return p;
  const { pair: _gone, ...rest } = p; // a different count is a different group: its pairing is unknown again (2026-10-22)
  return { ...rest, [which]: v };
}

/** The warning for keeping more of a species than advised (more than the advised most, or more than one of a keep-one animal), else
 *  undefined. With the tank's litres, the most scales with the tank where the sources give a rule (S196, data/groups.ts territory). */
export function overWarn(p: Pk, litres?: number, lengthMm?: number): string | undefined {
  const c = CARE[p.id], n = totalOf(p), mx = mostFor(c, litres, lengthMm) ?? (c?.solo ? 1 : undefined);
  const name = getSpecies(p.id)?.name ?? p.id;
  if (c?.beyond && mx && n > mx) return `${name}: ${c.beyond}`;
  if (!mx || n <= mx || !fightsOverCount(c)) {
    // males past their own limit (lane CW): a sexed species counts its males; an unsexed one may be all males (shops sell mostly males)
    const mm = mostMalesFor(c, litres), males = c?.sexed ? p.n : n - (p.f ?? 0);
    return mm !== undefined && males > mm ? malesWarning(name, males, mm, !!c?.sexed || (p.f ?? 0) > 0, c!.males!.each) : undefined;
  }
  return mx === 1 ? `${name} is best kept one to a tank: expect fighting. The tank shown is sized for all of them` : c?.territory && litres ? `More than about ${mx} ${name} in a tank this size may fight${c.territory.note ? `: ${c.territory.note}` : c.sexed ? `; keep ${c.sexed.ratio[0]} male to ${c.sexed.ratio[1]} females` : ''}` : `More than ${mx} ${name} in one tank may fight`;
}

/** The band message for the total count, plus the sex-ratio line for sexed species. `needs`: the species' essential care conditions
 *  (data/careNeeds.ts), evaluated apart from the count, so they show whatever band the group lands in. `pairing`: for two of a pair
 *  species, the status and its line (two animals, even 1 male + 1 female, are never assumed to be a pair). */
export interface PickNotes { band: GroupBand; line: string; ratio?: string; habitat: string[]; needs: { severity: NeedSeverity; text: string }[]; pairing?: { status: Pairing; line: string } }
export function notesOf(p: Pk, u: Units = 'cm'): PickNotes {
  const c = CARE[p.id], n = totalOf(p);
  // labelled as the GROUP-SIZE assessment (rules-spec section 6): it judges the count only, never the tank (groupLineIn adds that)
  const pairing = asksPairing(p) ? pairingOf(p.pair ?? 'unknown') : undefined;
  // two of a pair species not known to be a pair: the species' own `unpaired` line, and never better than 'ok' (gbr review 2026-10-22)
  const unpaired = pairing && pairing.status !== 'established' ? c?.msg?.unpaired : undefined;
  const beyond = c?.beyond && c.max && n > c.max ? c.beyond : undefined; // past what the guided advice covers: no band claim either way
  const band = (unpaired || beyond) && bandOf(c, n) !== 'avoid' ? 'ok' : bandOf(c, n);
  const msg = beyond ?? unpaired ?? (c?.max && c.max > 1 && n === c.max && !c.beyond ? `${bandMessage(c, n)} (the most before they fight: ${c.max})` : bandMessage(c, n));
  const line = n === 0 || !msg ? '' : `Group size: ${msg}${pairing && pairing.status !== 'established' && !unpaired ? ' (only if they are a pair)' : ''}`;
  let ratio: string | undefined;
  const r = c?.sexed;
  if (r) {
    const [rm, rf] = r.ratio, f = p.f ?? 0, u = p.u ?? 0;
    const want = rm === 0 ? 'females only' : rf === 0 ? 'males only' : `${rm} male${rm === 1 ? '' : 's'} to ${rf} female${rf === 1 ? '' : 's'}`;
    // the mix is judged on the sexed animals only; unsexed ones are named, never guessed
    // what is off, said as it is (S207 review: an all-female group used to read "short on females")
    const off = rm === 0 ? (p.n > 0 ? 'Your mix has males' : '') : rf === 0 ? (f > 0 ? 'Your mix has females' : '')
      : p.n > 0 && f / p.n < rf / rm * 0.75 ? 'Your mix is short on females' : f > 1 && p.n === 0 ? 'Your mix has no males' : '';
    const unk = u > 0 ? `. ${u} unsexed: the mix can only be checked once they are sexed${u === n ? '' : ' (judged on the sexed ones meanwhile)'}` : '';
    ratio = `Kept ${want}${r.note ? `: ${r.note}` : ''}${off && n - u > 0 ? `. ${off}` : ''}${unk}`;
  }
  const habitat: string[] = [];
  const md = minDataOf(p.id), adv = md?.depth?.maxWaterDepthMm; // the limit (GroupCare maxDepthMm) first, a sourced advisory maximum beside it (ADF, Nathan 2026-10-22)
  if (c?.maxDepthMm) habitat.push(`Shallow water, ${lenTxt(c.maxDepthMm, u)} deep at most${adv && adv !== c.maxDepthMm ? ` (${md!.depth!.note})` : ''}`);
  else if (adv) habitat.push(`Water no deeper than ${lenTxt(adv, u)} (advice, ${md!.depth!.note})`);
  if (c?.flow) habitat.push(`${c.flow === 'low' ? 'Gentle' : c.flow === 'high' ? 'Strong' : 'Moderate'} flow`);
  const sp = getSpecies(p.id);
  if (sp) { const z = zoneOf(sp); if (z !== 'all') habitat.push(`Lives in the ${z === 'bottom' ? 'bottom' : z === 'top' ? 'top' : 'middle'} of the tank`); }
  if (md?.red) habitat.push(`Tank at least ${lenTxt(md.red.L, u)} long${md.red.mark === 'derived (est)' ? ' (estimated from a gallon figure)' : ''}`);
  if (md?.green) habitat.push(`Recommended: ${lenTxt(md.green.L, u)} long (${md.green.site})`);
  const needs = needsOf(p.id).map(x => ({ severity: x.severity, text: needLine(x) }));
  return { band, line, ...(ratio ? { ratio } : {}), habitat, needs, ...(pairing ? { pairing } : {}) };
}

const PAIR_LINE: Record<Pairing, string> = {
  established: 'An established pair',
  unconfirmed: 'Pairing not confirmed: the group-size result holds only if they pair',
  unknown: 'Are these two an established pair? Two animals, even 1 male + 1 female, are not assumed to be one: the group-size result holds only if they pair',
};
const pairingOf = (status: Pairing) => ({ status, line: PAIR_LINE[status] });

/** The group-size line as it reads beside a chosen tank: when the tank fails (space, minimum, length, depth, floor, filtration) the overall
 *  verdict takes precedence, so the line says it judges the group only and is not shown in a "good" colour (`held`). */
export function groupLineIn(nt: PickNotes, plan: Plan): { text: string; held: boolean } {
  const fails = plan.fit?.fails ?? [];
  if (!fails.length || !nt.line) return { text: nt.line, held: false };
  return { text: `${nt.line}. That is the group only: this tank fails (${fails.map(f => FAIL_WORD[f] ?? f).join(', ')}), see the tank verdict`, held: true };
}

/** Why this pick does not suit the others on the list: the main blocking reason, or undefined. Advice only: nothing is blocked. */
export function conflictOf(picks: Pk[], id: string): string | undefined {
  const w = conflictsOf(picks, id)[0];
  return w?.block ? w.text : undefined;
}
/** Every reason this pick does not suit the others: the main blocking reason first, then the other material concerns (`block` false:
 *  a concern that does not block, e.g. a narrow shared temperature range). Empty when nothing is said. */
export function conflictsOf(picks: Pk[], id: string): { text: string; block: boolean }[] {
  const sp = getSpecies(id), others = picks.filter(p => p.id !== id && totalOf(p) > 0).map(p => getSpecies(p.id)).filter((x): x is Species => !!x);
  if (!sp || !others.length) return [];
  const clash = others.find(o => !!o.salt !== !!sp.salt);
  const out = clash ? [{ text: `${sp.salt ? 'Salt' : 'Fresh'} water: it cannot share a tank with ${clash.name}`, block: true }] : [];
  for (const w of whysAnimal(sp, Infinity, 3, others)) out.push({ text: w.text.replace(/^compatibility: /, ''), block: !w.concern });
  return out;
}
/** The whole list's water temperature, two separate lines (temprange.ts): the shared range of every aquatic pick, then the setpoint,
 *  which the planner cannot know before a tank is set up (unchecked). Null with no aquatic pick. */
export function tempLinesOf(picks: Pk[]): { range: string; rangeState: string; setpoint: string } | null {
  const r = sharedRange(picks.filter(p => totalOf(p) > 0).map(p => getSpecies(p.id)).filter((x): x is Species => !!x));
  if (r.state === 'unknown' && !r.unrecorded.length) return null;
  return { range: rangeLine(r), rangeState: r.state, setpoint: operatingCheck(r).text };
}

// ---------- tankmates ----------
export interface Mate {
  sp: Species; ok: boolean; why: string; score: number; n: number;
  /** compatible AND, added at its smallest group, the current tank still holds every animal (judged in that tank itself: a tank with more
   *  litres can fail where a smaller one holds them, so this is not a litre comparison; S207 2026-10-22) */
  fits: boolean;
  /** compatible but the current tank is too small for it: the smallest tank that holds picks + it */
  bigger?: TankModel;
}
const overlap = (a?: [number, number], b?: [number, number]) => a && b ? Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) : 0;

/** Every animal that is not already picked, in three runs: the ones that suit ALL the picks and fit `tank` (none chosen yet: any tank) at their
 *  smallest group, best first; the ones that suit them but need a bigger tank (`bigger`), best first; then the ones that do not
 *  suit (each with the first reason, naming the occupant it clashes with), by name. Salt against fresh counts as a clash. */
export function rankTankmates(picks: Pk[], tank?: TankModel): Mate[] {
  const have = picks.filter(p => totalOf(p) > 0).map(p => getSpecies(p.id)).filter((s): s is Species => !!s);
  if (!have.length) return [];
  const animals = animalsOf(picks);
  const taken = new Set(have.map(s => s.id)), zones = new Set(have.map(zoneOf));
  const out: Mate[] = [];
  for (const sp of SPECIES) {
    if (taken.has(sp.id) || !countsAgainstWater(sp)) continue;
    const c = CARE[sp.id]; if (!c) continue;
    const salty = have.find(o => !!o.salt !== !!sp.salt);
    const why = salty ? `${sp.salt ? 'Salt' : 'Fresh'} water: it cannot share a tank with ${salty.name}` : whyAnimal(sp, Infinity, 3, have)?.text.replace(/^compatibility: /, '') ?? '';
    let score = why ? 0 : 100;
    if (!why) {
      // fills a part of the tank the others leave empty, shares their water, easy to keep, and likes the same things
      score += zones.has(zoneOf(sp)) ? 0 : 15;
      for (const o of have) { const oc = CARE[o.id]; score += Math.min(6, overlap(c.temp, oc?.temp)) * 2 + Math.min(1, overlap(c.ph, oc?.ph)) * 3 + (c.appeal?.filter(a => oc?.appeal?.includes(a)).length ?? 0) * 2; }
      score -= (c.care - 1) * 4 + c.temper * 6;
    }
    const n = minOf(sp.id);
    let fits = false, bigger: TankModel | undefined;
    if (!why) {
      const all = [...animals, { species: sp.id, n }];
      const here = tank ? fitIn(all, tank) : tankFor(all); // the chosen tank with the mate in it; no tank chosen yet: the smallest that holds them
      fits = !!here && !here.fails.length;
      if (!fits) bigger = (tank ? tankFor(all) : here)?.tank;
    }
    out.push({ sp, ok: !why, why, score, n, fits, ...(bigger ? { bigger } : {}) });
  }
  const byScore = (a: Mate, b: Mate) => b.score - a.score || a.sp.name.localeCompare(b.sp.name);
  const fit = out.filter(m => m.fits).sort(byScore);
  const big = out.filter(m => m.ok && !m.fits).sort(byScore);
  const no = out.filter(m => !m.ok).sort((a, b) => a.sp.name.localeCompare(b.sp.name));
  return [...fit, ...big, ...no];
}

// ---------- the tank ----------
export interface Plan {
  /** the smallest catalogue tank that holds the picks (undefined with no animals in the water) */
  need?: TankFit;
  /** every catalogue size, smallest first, each judged for the picks (`fails` empty = it holds them) */
  options: TankFit[];
  /** the tank the user chose: it never changes as animals come and go (undefined until one is chosen) */
  tank?: TankModel;
  /** the chosen tank judged for the current picks */
  fit?: TankFit;
  litres: number;
  span?: BuildSpan;
  /** one plain line when the chosen tank is too small for the picks, or when no tank is enough */
  problem?: string;
}
const litresOf = (m: TankModel) => volume(tankFromModel(m)).litres;
/** The litres of the tank the plan shows: the chosen one, else the smallest that fits (0 when none). */
export const shownLitres = (plan: Plan) => plan.tank ? plan.litres : plan.need ? litresOf(plan.need.tank) : 0;
/** The shown tank's inside length, mm (length-based fighting rules, kribensis), else undefined. */
export const shownLengthMm = (plan: Plan) => { const m = plan.tank ?? plan.need?.tank; return m ? tankFromModel(m).L : undefined; };

/** each tank failure in a few words */
export const FAIL_WORD: Record<string, string> = { space: 'too full', filtration: 'no filter carries it', minimum: 'too small for them', length: 'too short', depth: 'too deep', floor: 'not enough floor', height: 'not tall enough' };
const FAIL_TEXT: Record<string, string> = {
  filtration: 'No filter can carry this many animals; take fewer',
  space: 'Too many animals for this tank; take fewer or pick a bigger tank',
  minimum: 'Too small for these animals; pick a bigger tank',
  length: 'Too short for these animals; pick a longer tank',
  depth: 'Too deep for these animals; pick a shallower tank',
  floor: 'Not enough floor for the bottom dwellers and swimmers together; pick a bigger tank',
  height: 'Not tall enough for these climbers; pick a taller terrarium',
};

/** The plan for these picks: the sizes with their verdicts, and the user's chosen tank (never swapped for them) with its cost span. */
export function planFor(picks: Pk[], chosen?: string): Plan {
  // one redraw asks up to once per pick row with the same picks (S207 review): the last answer is kept for the same animals and tank
  const animals = animalsOf(picks), key = JSON.stringify([animals, chosen ?? '']);
  if (lastPlan?.key === key) return lastPlan.plan;
  const plan = planOf(animals, chosen);
  lastPlan = { key, plan };
  return plan;
}
let lastPlan: { key: string; plan: Plan } | undefined;
function planOf(animals: AnimalCount[], chosen?: string): Plan {
  const options = tankOptions(animals);
  if (!options.length) return { litres: 0, options: [] };
  const need = options.find(o => !o.fails.length);
  const fit = chosen ? options.find(o => o.tank.id === chosen) : undefined, tank = fit?.tank;
  const bad = fit?.fails.length ? FAIL_TEXT[fit.fails.includes('filtration') ? 'filtration' : fit.fails[0]] : !need && !chosen ? 'No tank on the list holds these; take fewer animals' : undefined;
  return { ...(need ? { need } : {}), options, ...(tank ? { tank, fit, litres: litresOf(tank), span: buildSpan(animals, tank) } : { litres: 0 }), ...(bad ? { problem: bad } : {}) };
}

export { tankLabel };

// ---------- the fork card ----------
export interface RoomOption { tank: TankModel; label: string; w: number; d: number; costUsd?: number; costDeltaUsd?: number }
export interface SwapOption { from: string; to: Species; n: number; shared: string[]; tank: TankModel }
export interface Fork {
  animals: AnimalCount[];
  /** the sizes the animals need, from the smallest that holds them */
  room: RoomOption[];
  /** the largest catalogue tank inside the space */
  inSpace?: RoomOption;
  /** the animals fit the space's tank as they are */
  fitsAsIs: boolean;
  /** swaps for each animal that does not fit, ranked by shared appeal */
  swaps: SwapOption[];
}

/** The animals in a tank, one entry per species. */
export function animalsInTank(fish: Pick<Fish, 'species'>[]): AnimalCount[] {
  const by = new Map<string, number>();
  for (const f of fish) by.set(f.species, (by.get(f.species) ?? 0) + 1);
  return [...by].map(([species, n]) => ({ species, n }));
}

const RECT = TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name)).sort((a, b) => litresOf(a) - litresOf(b));
const optionOf = (m: TankModel, animals: AnimalCount[], base?: number, u: Units = 'cm'): RoomOption => {
  const e = tankExtent(tankFromModel(m)), span = animals.length ? buildSpan(animals, m) : undefined;
  return { tank: m, label: tankLabel(m, u), w: e.w, d: e.d, ...(span ? { costUsd: span.setupUsd.balanced, ...(base != null ? { costDeltaUsd: span.setupUsd.balanced - base } : {}) } : {}) };
};

/** What the fork card offers when the animals' tank is past the owner's space: make room (the sizes they need, with cost) or keep the space (the biggest tank in it, and animals that fit there). */
export function forkOptions(animals: AnimalCount[], limit: SpaceLimit, current?: Tank, u: Units = 'cm'): Fork {
  const need = tankFor(animals), wet = animals.filter(a => { const s = getSpecies(a.species); return s && countsAgainstWater(s); });
  const room: RoomOption[] = [];
  // the tank that is past the space (matched back to the catalogue by its inside size), else the smallest the animals need
  const cur = current && RECT.find(m => { const t = tankFromModel(m); return Math.abs(t.L - current.L) < 1 && Math.abs(t.H - current.H) < 1 && Math.abs(t.D - current.D) < 1; });
  const base = cur ?? need?.tank;
  if (base) {
    const first = optionOf(base, animals, undefined, u);
    room.push(first, ...stepUps(animals, base, 2).map(s => optionOf(s.tank, animals, first.costUsd, u)));
  }
  const inTank = [...RECT].reverse().find(m => spaceFit(tankFromModel(m), limit).fits);
  const inSpace = inTank ? optionOf(inTank, animals, undefined, u) : undefined;
  const inFit = inTank && fitIn(animals, inTank); // judged in that tank itself (S207), not by litres against the smallest tank that holds them
  const fitsAsIs = !need || (!!inFit && inFit.fails.length === 0);
  const swaps: SwapOption[] = [];
  if (!fitsAsIs && inTank) {
    const litres = litresOf(inTank), salt = wet.some(a => getSpecies(a.species)?.salt);
    for (const a of wet) {
      const from = getSpecies(a.species)!, mine = CARE[a.species]?.appeal ?? [], rest = animals.filter(x => x.species !== a.species);
      const present = rest.map(x => getSpecies(x.species)!).filter(Boolean);
      const cands: SwapOption[] = [];
      for (const sp of SPECIES) {
        if (sp.id === a.species || !!sp.salt !== salt || !countsAgainstWater(sp) || animals.some(x => x.species === sp.id)) continue;
        const shared = (CARE[sp.id]?.appeal ?? []).filter(t => mine.includes(t));
        if (!shared.length || (present.length && whyAnimal(sp, litres, 3, present))) continue;
        const n = minOf(sp.id), t = fitIn([...rest, { species: sp.id, n }], inTank);
        if (t && !t.fails.length) cands.push({ from: from.name, to: sp, n, shared, tank: inTank });
      }
      cands.sort((x, y) => y.shared.length - x.shared.length || Math.abs(x.to.tl - from.tl) - Math.abs(y.to.tl - from.tl));
      swaps.push(...cands.slice(0, 4));
    }
  }
  return { animals, room, ...(inSpace ? { inSpace } : {}), fitsAsIs, swaps };
}
