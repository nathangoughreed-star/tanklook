// The BUILD PLAN (lane U7, 2026-10-28): the second product level after the design. From one chosen Suggest proposal it works out, from data only
// (no model call), what to buy in what order (what the person already owns first, at $0 "you have"), how to set the tank up and cycle it, when and in
// what order the animals go in, and the maintenance rhythm. The money is the proposal's own cost lines (welfare / complete / display / enhancements + tax),
// so the plan's total is exactly the card's set-up price. Welfare is never traded: the animals are the last purchase, whatever the budget.
import { getSpecies } from '../data/species';
import { modelGallons } from '../data/tanks';
import type { CostLine, Layer } from './costlines';
import { demandOf } from './engine';
import { rhythmOf } from './rhythm';
import type { Proposal } from './suggest';
import type { UserProfile } from './types';

export type Habitat = 'fresh' | 'salt' | 'dry';
export interface BuyRow { label: string; usd: number; owned: boolean; layer: Layer; note?: string }
export interface BuyGroup { id: 'have' | 'first' | 'later'; title: string; blurb: string; rows: BuyRow[]; usd: number }
export interface Stage { week: string; title: string; animals: string; why: string }
export interface Cycling { method: string; weeks: [number, number]; text: string; tests: string[] }
export interface BuildPlan {
  title: string; habitat: Habitat; gallons: number;
  /** all-in set-up price, after what you own and with tax: equals the Suggest card's price */
  totalUsd: number; savedUsd: number;
  buy: BuyGroup[];
  setup: string[];
  cycling?: Cycling;
  stocking: Stage[];
  maintenance: string[];
  /** the demand model's weekly minutes in words (rhythm), information only */
  rhythm: string;
}

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const FIRST_ORDER = ['Tank', 'Starter kit', 'Stand', 'Life-support', 'Supplies', 'Substrate', 'Extras'];
const rank = (l: CostLine) => { const i = FIRST_ORDER.findIndex(k => l.label.startsWith(k)); return i < 0 ? 2 : i; };

/** What is bought and when: owned first ($0, "you have"), then everything the tank needs before animals, tank and stand first; the animals (and the tax on them) last. */
export function buyGroups(lines: readonly CostLine[], taxPct = 0): BuyGroup[] {
  const row = (l: CostLine): BuyRow => ({ label: l.label, usd: l.usd, owned: false, layer: l.layer ?? 'welfare', ...(l.note && l.note !== 'you have' ? { note: l.note } : {}) });
  const have = lines.filter(l => l.usd === 0 && l.note !== 'not needed').map(l => ({ ...row(l), owned: true }));
  const paid = lines.filter(l => l.usd > 0), animals = paid.filter(l => l.label === 'Animals'), tax = paid.find(l => l.layer === 'tax');
  const animalsUsd = animals.reduce((t, l) => t + l.usd, 0), animalTax = tax ? Math.min(tax.usd, Math.round(animalsUsd * taxPct / 100)) : 0;
  const first = paid.filter(l => l.label !== 'Animals' && l.layer !== 'tax').sort((a, b) => rank(a) - rank(b)).map(row);
  if (tax && tax.usd - animalTax > 0) first.push({ label: tax.label, usd: tax.usd - animalTax, owned: false, layer: 'tax', note: 'estimate' });
  const later = animals.map(row);
  if (tax && animalTax > 0) later.push({ label: tax.label + ' on the animals', usd: animalTax, owned: false, layer: 'tax', note: 'estimate' });
  const sum = (r: BuyRow[]) => r.reduce((t, x) => t + x.usd, 0);
  const out: BuyGroup[] = [];
  if (have.length) out.push({ id: 'have', title: 'You have (reuse first, $0)', blurb: 'Counted at $0 in the price. Check each one fits this tank before you rely on it.', rows: have, usd: 0 });
  out.push({ id: 'first', title: 'Buy first (before any animal)', blurb: 'Tank and stand, then life-support gear, supplies, then the habitat. All of it is in and running before the animals come home.', rows: first, usd: sum(first) });
  if (later.length) out.push({ id: 'later', title: 'Buy last (after the tank has cycled)', blurb: 'The animals are the last purchase: never buy them while the tank is still empty or cycling.', rows: later, usd: sum(later) });
  return out;
}

const cats = (p: Proposal) => p.build.animals.flatMap(a => { const sp = getSpecies(a.species); return sp ? [{ a, sp }] : []; });
export const habitatOf = (p: Proposal): Habitat => !p.build.setup.water.on ? 'dry' : p.build.setup.water.salt ? 'salt' : 'fresh';

function cyclingOf(p: Proposal, h: Habitat): Cycling | undefined {
  if (h === 'dry') return undefined;
  const hasInvert = cats(p).some(x => x.sp.cat === 'fw-invert'), reef = h === 'salt';
  const weeks: [number, number] = reef ? [4, 8] : hasInvert ? [6, 8] : [4, 6];
  const tests = reef
    ? ['Ammonia: should read 0 when the cycle is done', 'Nitrite: should read 0', 'Nitrate: rises, then holds low once the tank is settled', 'Salinity: 1.024 to 1.026 (refractometer), and keep it steady', 'Temperature: 76 to 80 °F']
    : ['Ammonia: should read 0 when the cycle is done', 'Nitrite: should read 0', 'Nitrate: appears as the cycle finishes; change water if it passes 40 ppm', 'Temperature: steady, in the animals\' range'];
  const text = reef
    ? 'Fishless cycle with the salt water mixed and the rock in: let the live rock cure, feed a pinch of food or ammonia daily to start it, and test every 3 to 4 days. Done when a dose of ammonia reads 0 ammonia and 0 nitrite within 24 hours. Corals and fish wait until then.'
    : `Fishless cycle: run the filter and heater, add an ammonia source (pure ammonia to about 2 ppm, or a pinch of fish food each day), and test every 2 to 3 days. Done when ammonia and nitrite both read 0 within 24 hours of a dose, and nitrate shows. Seeding the filter with media from a healthy established tank can cut it to 1 to 2 weeks.${hasInvert ? ' Shrimp and snails are more sensitive: wait 2 more weeks after the cycle, so the tank has algae and biofilm for them to graze.' : ''}`;
  return { method: 'Fishless cycle', weeks, text, tests };
}

function setupSteps(p: Proposal, h: Habitat, gal: number): string[] {
  const hasFilter = p.costLines.some(l => l.usd === 0 && /filter/i.test(l.label));
  const out = [`Set the tank on its stand (or a level surface rated for about ${Math.round(gal * 10 + 25)} lb full) and check it is level before it holds any water.`];
  if (h === 'dry') {
    out.push('Build the habitat: substrate, hides and climbing pieces, then plants or leaf litter.');
    out.push('Install the heat, UVB and light and run them for 2 days. Measure the warm side, the cool side and the humidity at the animal\'s level, and adjust until they fall in the care ranges.');
    out.push('Fit the lid or screen top and check there is no gap an animal could use. Only then are the animals ordered.');
    return out;
  }
  out.push('Rinse the substrate and hardscape in plain water (no soap). Place the hardscape first, then the substrate, then fill.');
  if (h === 'salt') out.push('Mix the salt in a bucket of dechlorinated (RO) water to about 1.025, check it with the refractometer, and fill slowly onto a plate or bag so the substrate is not disturbed. Add the live rock.');
  else out.push('Fill with tap water treated with the dechlorinator (it removes chlorine and chloramine), matched to the temperature the heater will hold.');
  out.push(`Install the ${hasFilter ? 'filter you already have' : 'filter'}, heater and light; plug them in, set the heater and confirm the water is at temperature.`);
  out.push('Plant the tank now, while it is empty: plants also take up ammonia during the cycle.');
  out.push('Start the cycle (below). Put the light on a timer of about 6 to 8 hours.');
  return out;
}

function stockingOf(p: Proposal, h: Habitat): Stage[] {
  const xs = cats(p), name = (x: { a: { n: number }; sp: { name: string } }) => `${x.a.n} ${x.sp.name}`;
  if (!xs.length) return [];
  const out: Stage[] = [];
  if (h === 'dry') {
    out.push({ week: 'Before purchase', title: 'Check the habitat', animals: 'none yet', why: 'The temperature gradient and humidity have held in range for 2 days, and the enclosure is secure.' });
    out.push({ week: 'Day 1', title: 'Bring the animals home', animals: xs.map(name).join(', '), why: 'Buy captive-bred from a breeder or shop with a health record. Keep a new animal apart from any you already own for 30 to 60 days; with none, leave it alone for a week to settle before handling.' });
    return out;
  }
  const isInvert = (x: { sp: { cat: string } }) => x.sp.cat === 'fw-invert' || x.sp.cat === 'sw-invert';
  const hardy = xs.filter(x => !isInvert(x)), inverts = xs.filter(isInvert);
  const schools = hardy.filter(x => x.a.n >= 4), singles = hardy.filter(x => x.a.n < 4);
  const half = (x: { a: { n: number } }) => Math.ceil(x.a.n / 2);
  out.push({ week: 'Before the first animal', title: 'Quarantine', animals: 'all new fish', why: 'If you have a spare small tank, hold new fish there for 2 to 4 weeks before they join the display. With no spare tank, buy from a store that has held the fish for a week or more, add a few at a time, and watch each one for white spots, torn fins or fast breathing.' });
  let at = 'Day 1 after the cycle';
  if (inverts.length) {
    out.push({ week: at, title: h === 'salt' ? 'Clean-up crew first' : 'Inverts first, once the tank has algae', animals: inverts.map(name).join(', '), why: h === 'salt' ? 'Snails and hermits keep the glass and rock clean while the tank is young. Drip-acclimate over 1 hour and wait 1 to 2 weeks before the fish.' : 'Shrimp and snails need a mature, stable tank. Drip-acclimate over 1 to 2 hours; no copper-containing medicine or food.' });
    at = 'Week 2';
  }
  if (singles.length) {
    out.push({ week: at, title: 'The main fish', animals: singles.map(name).join(', '), why: 'Add one at a time, the hardiest and calmest first, and test ammonia and nitrite for 3 days after each: any reading above 0 means stop, change 30 % of the water and wait.' });
    at = at === 'Week 2' ? 'Week 4' : 'Week 2';
  }
  if (schools.length) {
    out.push({ week: at, title: 'Schools in two batches', animals: schools.map(x => `${half(x)} ${x.sp.name}`).join(', '), why: 'A school goes in together, never one alone, and in two batches so the filter\'s bacteria grow with the load.' });
    out.push({ week: 'Two weeks after the first batch', title: 'The second batch', animals: schools.map(x => `${x.a.n - half(x)} ${x.sp.name}`).join(', '), why: 'Only when ammonia and nitrite still read 0 after the first batch. Never add more than a third of the final stock at once.' });
  }
  if (h === 'salt') out.push({ week: 'After 2 to 3 months', title: 'Corals, easiest first', animals: 'soft corals, then LPS', why: 'Only when nitrate and salinity have held steady for a month and the light is a reef light. Not in the price above unless listed there.' });
  return out;
}

function maintenanceOf(h: Habitat, gal: number, rh: string): string[] {
  const out: string[] = [];
  if (h === 'dry') {
    out.push('Daily: check heat and humidity, mist or top up water as the care sheet says, remove droppings and uneaten food.');
    out.push('Weekly: spot clean, refresh the water dish, wipe the glass.');
    out.push('Monthly: replace substrate where it is soiled, check the UVB tube age (most need replacing every 6 to 12 months) and the lid fit.');
  } else {
    const pct = h === 'salt' ? 15 : 25, g = Math.max(0.5, Math.round(gal * pct / 10) / 10);
    out.push(`Weekly water change: ${pct} % (about ${g} gal), the gravel vacuumed, the new water conditioned${h === 'salt' ? ' and mixed to 1.025 first' : ''} and matched to temperature.`);
    out.push(h === 'salt' ? 'Weekly: test salinity, nitrate and temperature; top up evaporated water with fresh RO water, never salt water.' : 'Test cadence: ammonia and nitrite weekly for the first 2 months (any above 0 means a water change at once), then nitrate every 2 weeks, and the temperature each week.');
    out.push('Every 2 to 4 weeks: rinse the filter media in a bucket of removed tank water (never tap water); replace it only when it falls apart.');
    out.push('Every month: clean the glass, trim the plants, check the heater and the light timer.');
  }
  out.push(`Time for this tank (estimate): ${rh}.`);
  return out;
}

export function buildPlanOf(p: Proposal, P: UserProfile): BuildPlan {
  const h = habitatOf(p), gal = modelGallons(p.build.tank), rh = rhythmOf(demandOf(p.build.setup, P), p.build.setup);
  return {
    title: `Build plan: ${p.archetype.title}`, habitat: h, gallons: Math.round(gal * 10) / 10, totalUsd: p.totals.startupUsd, savedUsd: p.saved,
    buy: buyGroups(p.costLines, p.taxPct), setup: setupSteps(p, h, gal), cycling: cyclingOf(p, h), stocking: stockingOf(p, h),
    maintenance: maintenanceOf(h, gal, rh.text), rhythm: rh.text,
  };
}

/** The same plan as plain text (print / copy). */
export function buildPlanText(b: BuildPlan): string {
  const L = [b.title, `${b.gallons} gal, ${usd(b.totalUsd)} all in${b.savedUsd ? ` (${usd(b.savedUsd)} less: what you have)` : ''}`, ''];
  for (const g of b.buy) L.push(`${g.title}${g.id === 'have' ? '' : `: ${usd(g.usd)}`}`, ...g.rows.map(r => `  - ${r.label}: ${r.owned ? 'you have' : usd(r.usd)}`), '');
  L.push('Set up', ...b.setup.map((s, i) => `  ${i + 1}. ${s}`), '');
  if (b.cycling) L.push(`Cycling: ${b.cycling.method}, ${b.cycling.weeks[0]} to ${b.cycling.weeks[1]} weeks`, '  ' + b.cycling.text, ...b.cycling.tests.map(t => `  - Test ${t}`), '');
  if (b.stocking.length) L.push('Adding animals', ...b.stocking.map(s => `  ${s.week}: ${s.title} (${s.animals}). ${s.why}`), '');
  L.push('Maintenance', ...b.maintenance.map(m => `  - ${m}`));
  return L.join('\n');
}
