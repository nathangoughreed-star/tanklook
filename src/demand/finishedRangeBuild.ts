// Lane FR1 (2026-11-05, Nathan: "When they are selecting the tank, give them a rough range of finished tank price based on the size ... the min
// should represent a relatively low stocked empty tank with cheap decor ... upper end would be a semi-professional setup"). Pure, slow (a full
// scene per tank x kind x end): the table is built by test/finishedRange.test.ts (GEN_FINISHED=1) into research/finished-range.json and
// finishedRange.ts only reads it. Nothing here invents a price: every dollar is the demand engine's own (tank = the list-price rows by gallons,
// gear and animals and decor = the priced rows, Budget / Luxury = BL1's tierPair swaps).
import { applyKind } from '../scene/pickerKind';
import { bareSetup } from '../scene/defaults';
import { starterAnimals } from '../scene/starter';
import { starterItems } from '../scene/items';
import { tankFromModel, type TankModel } from '../data/tanks';
import { gearedSetup, type AnimalCount, type BuildKind } from '../scene/tankfit';
import { drySetup } from '../scene/drygear';
import { tierOf } from '../scene/materialTiers';
import { tankRowPrice } from './prices';
import type { LayoutId, LayerDens, TankSetup } from '../scene/types';
import type { FinishedKind } from './finishedRange';

/** One end of the range: the style drawn, how full each layer is (the starter's stops: 0 none .. 4 packed), the Tech preset, the filter build, the BL1 tier. */
interface End { style: Exclude<LayoutId, 'none'>; /** terrarium: styles tried in turn until one stocks an animal in this enclosure */ tryStyles?: Exclude<LayoutId, 'none'>[]; /** drop the corals (a fish-only reef) */ noCorals?: boolean; dens: LayerDens; preset?: string; build: BuildKind; tier: 'budget' | 'luxury'; ground: boolean }
interface Spec { lo: End; hi: End; loText: string; hiText: string }

const SPEC: Record<FinishedKind, Spec> = {
  freshwater: {
    lo: { style: 'stones', dens: { hard: 0, plant: 0, animal: 1 }, build: 'cheapest', tier: 'budget', ground: true },
    hi: { style: 'planted', dens: { hard: 2, plant: 3, animal: 3 }, preset: 'hightech', build: 'balanced', tier: 'luxury', ground: true },
    loText: 'tank, sponge or cheapest filter, heater only if the fish need one, basic LED, lid, gravel, a few stones and plants, a light school of cheap fish',
    hiText: 'tank, balanced filter, heater, planted-tank LED, CO2 and fertiliser, designed planted hardscape in luxury materials, a fuller community',
  },
  saltwater: {
    lo: { style: 'reef', dens: { hard: 0, plant: 0, animal: 1 }, noCorals: true, build: 'cheapest', tier: 'budget', ground: true },
    hi: { style: 'reef', dens: { hard: 2, plant: 3, animal: 3 }, preset: 'lps', build: 'balanced', tier: 'luxury', ground: true },
    loText: 'tank, hang-on filter and skimmer, one heater, one powerhead, RO unit, sand and a little live rock, a pair of hardy fish (fish-only, no corals)',
    hiText: 'tank, sump with skimmer, two heaters, wave flow, auto top-off, dosing, reef LED, rock work and a coral garden, a fuller fish list',
  },
  terrarium: {
    lo: { style: 'arid', tryStyles: ['arid', 'rainforest', 'frogs', 'jumper'], dens: { hard: 0, plant: 0, animal: 1 }, build: 'cheapest', tier: 'budget', ground: true },
    hi: { style: 'rainforest', tryStyles: ['rainforest', 'frogs', 'arid', 'jumper'], dens: { hard: 2, plant: 3, animal: 3 }, build: 'balanced', tier: 'luxury', ground: true },
    loText: 'enclosure, heat on an on/off thermostat, UVB where the animal needs it, gauge, substrate, a hide or two, one hardy animal',
    hiText: 'enclosure, dimming thermostat, UVB, misting, a planted background and branches, a fuller animal list',
  },
  vivarium: {
    lo: { style: 'paludarium', dens: { hard: 0, plant: 0, animal: 1 }, build: 'cheapest', tier: 'budget', ground: true },
    hi: { style: 'paludarium', dens: { hard: 2, plant: 3, animal: 3 }, build: 'balanced', tier: 'luxury', ground: true },
    loText: 'tank, filter for the pool, heat and UVB for the land side, substrate, a little hardscape and plants, a few hardy animals',
    hiText: 'tank, balanced filter and dimming heat, UVB, misting, designed land and water scape in luxury materials, a fuller animal list',
  },
};
export const BASIS: Record<FinishedKind, { lo: string; hi: string }> = Object.fromEntries(Object.entries(SPEC).map(([k, s]) => [k, { lo: s.loText, hi: s.hiText }])) as never;

/** Which tanks a kind is offered for: a water kind for any glass tank (a vivarium wants some height), a terrarium for the dry presets. */
export function kindFits(m: TankModel, kind: FinishedKind): boolean {
  if (kind === 'terrarium') return !!m.terrarium;
  if (m.terrarium) return false;
  if (kind === 'vivarium') return m.outer.H >= 12 * 25.4 && (m.shape ?? 'rect') === 'rect';
  return true;
}

const countOf = (S: TankSetup): AnimalCount[] => {
  const by = new Map<string, AnimalCount>();
  for (const f of S.fish) { const a = by.get(f.species) ?? { species: f.species, n: 0, f: 0 }; a.n++; if (f.sex === 'f') a.f = (a.f ?? 0) + 1; by.set(f.species, a); }
  return [...by.values()].map(a => (a.f ? a : { species: a.species, n: a.n }));
};

/** The finished scene of one end of the range for this tank (exported for the tests). */
export function finishedScene(m: TankModel, kind: FinishedKind, end: 'lo' | 'hi'): TankSetup {
  const e = SPEC[kind][end];
  // 1. the style and the animals it stocks at this density, in this tank (the starter's own rules)
  const draft = bareSetup();
  draft.tank = tankFromModel(m);
  if (kind !== 'terrarium') { applyKind(draft, kind); draft.water.level = 1; draft.water.on = true; }
  else { draft.water.on = false; }
  if (kind === 'vivarium') draft.water.salt = undefined;
  draft.layout = { ...draft.layout, id: e.style, dens: e.dens, seed: 1 };
  draft.substrate.show = true;
  let style = e.style, fish = starterAnimals(draft, 1);
  for (const alt of e.tryStyles ?? []) { // a small terrarium holds no rainforest animal but may hold a desert one: the first style that stocks anything
    if (fish.length) break;
    draft.layout = { ...draft.layout, id: alt }; fish = starterAnimals(draft, 1); style = alt;
  }
  if (!fish.length) { style = e.style; draft.layout = { ...draft.layout, id: style }; }
  const animals = countOf({ ...draft, fish });
  // 2. the build's gear (sized to the tank and these animals), then the decor and the animals themselves on top
  const S = kind === 'terrarium' ? drySetup(m, animals, e.build === 'cheapest' ? 'cheapest' : 'balanced')
    : gearedSetup(m, animals, e.build, e.preset);
  S.layout = { ...S.layout, ...draft.layout };
  S.substrate = { ...S.substrate, show: e.ground };
  S.stand = { ...S.stand, show: false }; // the stand or furniture is the next question in the picker, not part of this range
  S.items = starterItems(S);
  if (e.noCorals) S.items = S.items.filter(it => it.kind !== 'coral');
  S.fish = starterAnimals(S, 1);
  return S;
}

/** The setup dollars of one end: the scene priced as its tier (BL1's swaps, each kept only where it moves the right way), the tank at the engine's own list-price rule (tankRowPrice: no sale, no one premium maker setting a size's price; a dry enclosure keeps terrariumPrice). */
export function finishedUsd(m: TankModel, kind: FinishedKind, end: 'lo' | 'hi'): number {
  const S = finishedScene(m, kind, end), e = SPEC[kind][end];
  const tier = tierOf(S, e.tier, { demand: { tankPrice: (_S, gal) => tankRowPrice(gal) }, ...(e.tier === 'luxury' ? { skip: ['gear' as const] } : {}) });
  return tier.setupUsd;
}

export const FINISHED_KINDS: FinishedKind[] = ['freshwater', 'saltwater', 'terrarium', 'vivarium'];
