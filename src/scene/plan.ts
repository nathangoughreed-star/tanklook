// The plan of path 1, "An animal I want" (lane P6b, 2026-10-20): for the tank as it stands in the editor, does it fit (space and filtration
// from the stocking engine, hard truths from the care gates), what to buy with each item tied to the need it serves (an item no need asks for
// is flagged, a need with nothing on the list is flagged), the totals (the demand model's one number each) and the sales that fit.
// Pure; src/ui/planSheet.ts draws it and writes the text. It READS stocking, tankfit, tech, the care gates and the demand model.
import { getSpecies } from '../data/species';
import type { Contribution, Demand } from '../demand/types';
import { mean3 } from '../demand/range';
import { GEAR_SLOT_NAME, gearOffers } from '../demand/gearDeals';
import { whyAnimal } from './animalfit';
import { LIBRARY } from './items';
import type { Build } from './builds';
import { finSensitiveNames, plantNeeds, priceScape } from './scapes';
import { countsAgainstWater, stockingOf } from './stocking';
import { ROOM_C, tempFit } from './tech';
import { needsOf, tankLabel, type AnimalCount } from './tankfit';
import { volume } from './physics';
import { minFit } from './tankMin';
import { tankWeight } from './weight';
import type { TankSetup } from './types';

export type Level = 'ok' | 'warn' | 'bad';
export interface PlanRow {
  item: string;
  usd: number;
  /** the need this item serves, in words (for an overspend: why nothing asks for it) */
  serves: string;
  /** 'need' = an animal or the water asks for it; 'look' = the look of the tank (the user's taste); 'extra' = nothing here asks for it */
  kind: 'need' | 'look' | 'extra';
}
export interface PlanDeal { text: string }
export interface Plan {
  title: string;
  tank: string;
  animals: string[];
  spacePct: number;
  filtrationPct: number;
  fits: boolean;
  verdict: { text: string; level: Level }[];
  rows: PlanRow[];
  /** needs that have no item on the list */
  missing: string[];
  setupUsd: number;
  upkeepUsdMo: number;
  minPerWeek: number;
  deals: PlanDeal[];
  cycleNote: string;
}

export const CYCLE_NOTE = 'Cycle the tank before adding animals; read about the nitrogen cycle.';
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The animals in the scene, one entry per species. */
export function animalsOfSetup(S: TankSetup): AnimalCount[] {
  const m = new Map<string, number>();
  for (const f of S.fish) m.set(f.species, (m.get(f.species) ?? 0) + 1);
  return [...m].map(([species, n]) => ({ species, n }));
}

/** Hard truths: what is wrong with this stocking in this tank, whatever the user's taste (from the care gates, the tank-fit limits, temperature and plants). */
export function hardTruths(S: TankSetup, animals: AnimalCount[], heater: boolean): { text: string; level: Level }[] {
  const out: { text: string; level: Level }[] = [];
  const sp = animals.flatMap(a => { const s = getSpecies(a.species); return s && a.n > 0 ? [s] : []; });
  const litres = volume(S.tank).litres, n = needsOf(animals), salt = S.water.on && !!S.water.salt;
  for (const s of sp) {
    const why = whyAnimal(s, litres, 3, sp.filter(o => o !== s), { corals: S.items.some(it => it.kind === 'coral' && it.variant !== 'macroalgae' && it.variant !== 'anemone'), fit: minFit(S) });
    if (why) out.push({ text: `${s.name}: ${why.text}`, level: 'bad' }); // size is judged by tankMin (floor area, length, water), with its 10 % slack
  }
  if (Number.isFinite(n.maxDepthMm) && S.tank.H * S.water.level > n.maxDepthMm) out.push({ text: `Some of your animals need shallow water (${Math.round(n.maxDepthMm / 10)} cm at most); this tank's water is ${Math.round(S.tank.H * S.water.level / 10)} cm deep`, level: 'bad' });
  if (!heater && !salt) for (const s of sp.filter(x => countsAgainstWater(x))) if (tempFit(s.id, ROOM_C) === 'out') out.push({ text: `${s.name} is too cold at room temperature (${ROOM_C} C) and the tank has no heater`, level: 'bad' });
  const longFinned = finSensitiveNames(animals);
  if (longFinned.length && S.items.some(it => it.variant.startsWith('plastic'))) out.push({ text: `Hard plastic leaves can tear the long fins of ${longFinned.join(', ')}: use silk plants`, level: 'warn' });
  return out;
}

/** The parts an all-in-one kit can contain (demand engine: `kit.includes`). */
const KIT_PARTS = ['tank', 'stand', 'lid', 'light', 'filter', 'heater'];
/** A kit row serves what its parts serve: needed when any part is, listing the needs ("Includes ..."). */
function kitServes(parts: ({ serves: string; kind: PlanRow['kind'] } | undefined)[]): { serves: string; kind: PlanRow['kind'] } {
  const need = parts.filter((p): p is { serves: string; kind: PlanRow['kind'] } => p?.kind === 'need');
  return need.length ? { serves: `Includes what these need: ${need.map(p => p.serves).join('; ')}`, kind: 'need' } : { serves: 'Part of the set-up', kind: 'look' };
}

/** What each priced row serves; undefined = skip the row (no set-up price). */
function serve(r: Contribution, S: TankSetup, animals: AnimalCount[], needs: ReturnType<typeof plantNeeds>, st: ReturnType<typeof stockingOf>, wantsHeat: boolean): { serves: string; kind: PlanRow['kind'] } | undefined {
  const k = r.key, wet = animals.map(a => getSpecies(a.species)?.name).filter(Boolean);
  if (k === 'tank') return { serves: `Space: your animals take ${Math.round(st.spacePercent)}% of what its water holds`, kind: 'need' };
  if (k === 'filter' || k === 'filter+') return { serves: `Waste: your animals produce ${Math.round(st.filtrationPercent)}% of what this filter (and the plants) can clear`, kind: 'need' };
  if (k === 'heater' || k === 'heater+') return wantsHeat
    ? { serves: `Temperature: ${[...new Set(wet)].slice(0, 3).join(', ')} ${new Set(wet).size === 1 && animals[0].n === 1 ? 'wants' : 'want'} warmer water than a room`, kind: 'need' }
    : { serves: 'Nothing here needs it: your animals are comfortable at room temperature', kind: 'extra' };
  if (k === 'light') return needs.live ? { serves: `Plants: ${needs.light.replace(/^./, c => c.toLowerCase())}`, kind: 'need' } : { serves: 'So you can see the tank; no plant or animal here needs it', kind: 'look' };
  if (k === 'co2') return needs.live && needs.co2 !== 'No CO2 needed' ? { serves: 'Plants: some of your live plants want CO2', kind: 'need' } : { serves: 'Nothing here needs it: your plants grow without CO2', kind: 'extra' };
  if (k === 'ferts') return needs.live ? { serves: 'Plants: feeding the live plants', kind: 'need' } : { serves: 'Nothing here needs it: there are no live plants', kind: 'extra' };
  if (k === 'skimmer') return { serves: 'Salt water: takes waste out before it breaks down', kind: 'need' };
  if (k === 'stand') return { serves: `Carries the tank (${Math.round(tankWeight(S).total)} kg full)`, kind: 'need' };
  if (k === 'lid') return { serves: 'Keeps animals in and the water from evaporating', kind: 'need' };
  if (k === 'substrate') return { serves: 'The ground: plants root in it and bottom dwellers rest on it', kind: 'look' };
  if (k === 'testkit') return { serves: 'Checking ammonia and nitrite while the tank cycles', kind: 'need' };
  if (k.startsWith('hard:') && LIBRARY[k.slice(5)]?.kind === 'artificial') return { serves: 'Cover and the green look, with no light, CO2 or feeding needed (they take up no waste)', kind: 'look' };
  if (k.startsWith('hard:')) return { serves: 'Cover and territories for the animals, and the look', kind: 'look' };
  if (k.startsWith('plant:')) return { serves: 'They take up some waste and give cover', kind: 'look' };
  if (k.startsWith('animal:')) return { serves: 'The animals you chose', kind: 'need' };
  if (k === 'ato' || k === 'rounit') return { serves: 'Less work: topping up and water by itself', kind: 'look' };
  return { serves: 'Part of the set-up', kind: 'look' };
}

/**
 * The plan for the tank in `S` (the editor's current tank). `build`: the build the user picked, for its bundle and gear sales (it prices
 * the set-up the way the builds screen did). Without one, list prices.
 */
export function planOf(S: TankSetup, build?: Build, now = Date.now()): Plan {
  const animals = animalsOfSetup(S), st = stockingOf(S);
  const D: Demand = priceScape(S, build ?? ({ animals, gearDeals: [] } as unknown as Build), now);
  const needs = plantNeeds(S);
  const wantsHeat = (S.water.on && !!S.water.salt) || animals.some(a => { const sp = getSpecies(a.species); return sp && countsAgainstWater(sp) && tempFit(sp.id, ROOM_C) !== 'ok'; });
  const rows: PlanRow[] = [];
  const grouped = new Map<string, PlanRow>();
  // a kit's one price stands in for the parts it contains (their rows lose their price): the kit row serves their needs
  const kit = D.items.some(r => r.key === 'kit' && r.setup), inKit = (r: Contribution) => kit && !r.setup && KIT_PARTS.includes(r.key);
  for (const r of D.items) {
    if (!r.setup || mean3(r.setup) <= 0) continue;
    const s = r.key === 'kit' ? kitServes(D.items.filter(inKit).map(p => serve(p, S, animals, needs, st, wantsHeat))) : serve(r, S, animals, needs, st, wantsHeat); if (!s) continue;
    const row: PlanRow = { item: r.label, usd: Math.round(mean3(r.setup)), ...s };
    // one line for the hardscape, one for the plants, one for the animals: the shopping list is a list, not the parts catalogue
    const g = r.key.startsWith('hard:') ? (LIBRARY[r.key.slice(5)]?.kind === 'artificial' ? 'fake' : 'hard') : r.key.startsWith('plant:') ? 'plant' : r.key.startsWith('animal:') ? 'animal' : '';
    if (!g) { rows.push(row); continue; }
    const old = grouped.get(g);
    if (old) { old.usd += row.usd; continue; }
    grouped.set(g, { ...row, item: g === 'hard' ? 'Hardscape (rock, wood, caves, dishes)' : g === 'plant' ? 'Live plants' : g === 'fake' ? 'Artificial plants' : 'Animals' });
  }
  for (const g of ['animal', 'hard', 'plant', 'fake'] as const) { const r = grouped.get(g); if (r) rows.push(r); }
  const missing: string[] = [];
  if (wantsHeat && !D.items.some(r => r.key === 'heater' && (r.setup || inKit(r)))) missing.push('Heater: your animals want warmer water than a room and the list has none');
  if (st.filtrationPercent > 100) missing.push('Filter: none on the list clears what these animals produce (choose a stronger one or a bigger tank)');
  const heater = D.items.some(r => r.key === 'heater');
  const truths = hardTruths(S, animals, heater);
  const verdict: Plan['verdict'] = [
    { text: `Space: ${Math.round(st.spacePercent)}% of what this tank's water holds${st.spacePercent > 100 ? ' (too many animals for it)' : ''}`, level: st.spacePercent > 100 ? 'bad' : st.spacePercent > 85 ? 'warn' : 'ok' },
    { text: `Filtration: ${Math.round(st.filtrationPercent)}% of what the filter and plants clear${st.filtrationPercent > 100 ? ' (the filter cannot keep up)' : ''}`, level: st.filtrationPercent > 100 ? 'bad' : st.filtrationPercent > 85 ? 'warn' : 'ok' },
    ...truths,
  ];
  const names = animals.map(a => `${a.n} ${getSpecies(a.species)?.name ?? a.species}`);
  const fits = verdict.every(v => v.level !== 'bad') && missing.length === 0;
  const deals: PlanDeal[] = [];
  const dealLine = (s: string) => { if (!deals.some(d => d.text === s)) deals.push({ text: s }); };
  if (build?.bundle) dealLine(`Bundle: ${build.bundle.retailer} ${build.bundle.name}, ${usd(build.bundle.price.usd)}${build.bundle.price.regularUsd ? ` (was ${usd(build.bundle.price.regularUsd)})` : ''}`);
  if (build?.tankDeal) dealLine(`Tank on sale at ${build.tankDeal.retailer}: ${usd(build.tankDeal.usd)} (was ${usd(build.tankDeal.regularUsd)})`);
  for (const d of build?.gearDeals ?? []) dealLine(`${d.title} on sale at ${d.store}: ${usd(d.price.usd)} (was ${usd(d.price.regularUsd)})`);
  if (!build?.bundle) for (const d of gearOffers(S, D, now)) dealLine(`${GEAR_SLOT_NAME[d.slot][0].toUpperCase()}${GEAR_SLOT_NAME[d.slot].slice(1)}: ${d.title} on sale at ${d.store}, ${usd(d.price.usd)} (was ${usd(d.price.regularUsd)})`);
  return {
    title: 'Your animal tank: the plan', tank: build ? tankLabel(build.tank) : `${Math.round(volume(S.tank).gallons)} gal (${Math.round(S.tank.L / 10)} x ${Math.round(S.tank.D / 10)} cm)`, animals: names,
    spacePct: Math.round(st.spacePercent), filtrationPct: Math.round(st.filtrationPercent), fits, verdict, rows, missing,
    setupUsd: Math.round(D.totals.setupUsd), upkeepUsdMo: Math.round(D.totals.upkeepUsdMo), minPerWeek: Math.round(D.totals.minPerWeek),
    deals, cycleNote: CYCLE_NOTE,
  };
}

/** The plan as plain text (the .txt download and the clipboard copy). */
export function planText(p: Plan): string {
  const L: string[] = [p.title, `${p.tank}: ${p.animals.join(', ')}`, ''];
  L.push(p.fits ? 'It fits.' : 'It does not fit yet:');
  for (const v of p.verdict) L.push(`  ${v.level === 'ok' ? '+' : v.level === 'warn' ? '~' : '!'} ${v.text}`);
  for (const m of p.missing) L.push(`  ! ${m}`);
  L.push('', 'Shopping list (each item and the need it serves)');
  for (const r of p.rows) L.push(`  ${usd(r.usd).padStart(7)}  ${r.item}${r.kind === 'extra' ? ' [not needed]' : ''}: ${r.serves}`);
  L.push('', `Set-up ${usd(p.setupUsd)}; ${usd(p.upkeepUsdMo)} a month; about ${p.minPerWeek} minutes a week.`);
  if (p.deals.length) { L.push('', 'Sales that fit'); for (const d of p.deals) L.push(`  ${d.text}`); }
  L.push('', p.cycleNote);
  return L.join('\n');
}

