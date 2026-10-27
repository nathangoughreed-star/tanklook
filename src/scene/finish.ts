// Finished tanks for Suggest a setup (lane C9, 2026-10-27, Nathan: "suggestions are finished tanks, not bare shells"). A build from builds.ts is
// animals and gear; this turns it into a complete tank in three tiers (lean, standard, lush): substrate, hardscape, plants and a coherent
// scape drawn from the existing starter styles (scapes.ts rankStyles / scapeSetup: no second system). Everything is priced by the demand
// model on the scaped scene (substrate litres, rock and wood pieces, plants, and the minutes a week plants add), so the card's totals are honest.
//   - Cheaper tiers scale DOWN, never to bare: fewer, hardier pieces (artificial or mixed plants, sparse layers) but always a substrate, a
//     hardscape piece or hide and plants to look at; the lush tier is the style at full density with live plants.
//   - Plants suit the light: the starter set is drawn with `layout.fit` at the light this build gives (plantfit.fitItems), and any live plant
//     that would still struggle is made artificial (or dropped where there is no artificial form), so no "plants would struggle" note is ever shown.
//   - `finishTiers` yields the best tier first, lazily: Suggest takes the first one that passes every guardrail and the husbandry rule.
import { LAYOUTS, LIBRARY, makeItem } from './items';
import { itemLights } from './lightcheck';
import { lightOutCached, wattsOf } from './lightout';
import { FIT_PAR, type FitLight } from './plantfit';
import { fakeFor, finSensitive, rankStyles, scapeSetup, priceScape, type PlantMode } from './scapes';
import { groundVolume } from './setupsheet';
import { SUBSTRATES } from '../art/placeholder';
import type { Build } from './builds';
import type { Item, LayoutId, TankSetup } from './types';

export type FinishTier = 'lean' | 'standard' | 'lush';
export interface Finish {
  tier: FinishTier;
  /** 1 lean .. 3 lush: how finished the tank is (Suggest ranks the best tier that passes every guardrail first) */
  level: 1 | 2 | 3;
  style: Exclude<LayoutId, 'none'>;
  /** one line each: the look, substrate, hardscape, plants */
  lines: string[];
}
export const TIER_LABEL: Record<FinishTier, string> = { lean: 'Starter finish', standard: 'Full finish', lush: 'Lush finish' };
interface TierSpec { id: FinishTier; level: 1 | 2 | 3; dens: { hard: number; plant: number }; mode: PlantMode }
/** Layer densities are the starter sliders (0 none .. 4 dense; the default is 2). Lean keeps one anchor piece and a few hardy plants (artificial where the plant is demanding). */
const TIERS: readonly TierSpec[] = [
  { id: 'lush', level: 3, dens: { hard: 3, plant: 3 }, mode: 'live' },
  { id: 'standard', level: 2, dens: { hard: 2, plant: 2 }, mode: 'mixed' },
  { id: 'lean', level: 1, dens: { hard: 1, plant: 1 }, mode: 'mixed' },
];

const LB_PER_L = 1.6 * 2.2046; // loose substrate: the set-up sheet's 1.6 kg a litre

/** The light level plants are chosen for: the strongest of low / medium / high whose PAR this build's light reaches at the substrate (reef or fresh). */
export function fitFor(S: TankSetup): FitLight {
  const par = wattsOf(S) > 0 ? lightOutCached(S)?.mean ?? 0 : 0, table = FIT_PAR[S.water.on && S.water.salt ? 'reef' : 'fresh'];
  return par >= table.high ? 'high' : par >= table.medium ? 'medium' : 'low';
}

/** Live plants that would still struggle under this build's light (or CO2 and feeding), made artificial where they have an artificial form, else removed. */
function settle(S: TankSetup, silk: boolean): TankSetup {
  const lights = itemLights(S);
  if (!lights) return S;
  const items = S.items.flatMap((it): Item[] => {
    if (lights.get(it.id)?.outcome.state !== 'struggle') return [it];
    if (it.kind === 'coral') return []; // a coral this light cannot keep is left out: the reef keeps its rock and the corals that suit
    const v = it.kind === 'plant' ? fakeFor(it.variant, silk) : undefined;
    return v ? [makeItem(S.tank, v, it.id, it.seed, it.x, it.depth, { yaw: it.yaw, size: Math.min(LIBRARY[v].max, Math.max(LIBRARY[v].min, it.size)), lift: it.lift }, S)] : [];
  });
  return { ...S, items };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const names = (its: Item[]) => [...new Set(its.map(i => LIBRARY[i.variant]?.label ?? i.variant))];
/** What the finish adds, in plain words (the card's gear list). */
export function finishLines(S: TankSetup, style: Exclude<LayoutId, 'none'>): string[] {
  const lines: string[] = [], g = S.substrate.show ? groundVolume(S, 24).litres * 1.1 : 0;
  lines.push(`Look: ${LAYOUTS[style].label}`);
  if (g > 0.05) lines.push(`Substrate: ${S.substrate.type === 'custom' ? 'blended' : SUBSTRATES[S.substrate.type]?.label ?? S.substrate.type}, about ${Math.max(1, Math.round(g * LB_PER_L))} lb`);
  const hard = S.items.filter(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'cave');
  if (hard.length) lines.push(`Hardscape: ${plural(hard.length, 'piece')} (${names(hard).join(', ').toLowerCase()})`);
  const live = S.items.filter(i => i.kind === 'plant'), fake = S.items.filter(i => i.kind === 'artificial'), corals = S.items.filter(i => i.kind === 'coral');
  if (live.length) lines.push(`Plants: ${plural(live.length, 'live plant')} (${names(live).join(', ').toLowerCase()})${fake.length ? ` and ${plural(fake.length, 'artificial one')}` : ''}`);
  else if (fake.length) lines.push(`Plants: ${plural(fake.length, 'artificial plant')}, no light or feeding needed`);
  if (corals.length) lines.push(`Corals: ${plural(corals.length, 'piece')} (${names(corals).join(', ').toLowerCase()})`);
  return lines;
}

const hasHardscape = (S: TankSetup) => S.items.some(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'cave');

/** The scaped pieces of a tank (ground, items, layout, animals' places), kept by what draws them: builds of one tank differ in gear only, so the
 *  three builds (and a re-ask with other guardrails) share one scape. Bounded. */
type Scape = Pick<TankSetup, 'items' | 'substrate' | 'terrain' | 'layout' | 'water' | 'fish' | 'patches'>;
const SCAPES = new Map<string, Scape>();
function scaped(b: Build, mode: PlantMode, style: Exclude<LayoutId, 'none'>, dens: { hard: number; plant: number }, fit: FitLight): TankSetup {
  const S0 = b.setup, key = JSON.stringify([S0.tank, S0.water, S0.grow, S0.layout, S0.fish.map(f => f.species), mode, style, dens, fit]);
  let c = SCAPES.get(key);
  if (!c) {
    const T = scapeSetup(b, style, mode, S0, { dens, fit });
    c = structuredClone({ items: T.items, substrate: T.substrate, terrain: T.terrain, layout: T.layout, water: T.water, fish: T.fish, patches: T.patches }) as Scape;
    if (SCAPES.size >= 96) SCAPES.delete(SCAPES.keys().next().value!);
    SCAPES.set(key, c);
  }
  return { ...structuredClone(S0), ...structuredClone(c) };
}

/** The finished build at one tier: the style scaped into the build's tank, priced and timed by the demand model with the build's own deals.
 *  A tier with no hardscape (a planted style at a light density) draws more of it until there is a piece to anchor the plants, up to the densest. */
export function finishBuild(b: Build, spec: TierSpec, style: Exclude<LayoutId, 'none'>, now = Date.now()): Build {
  const land = !b.setup.water.on, fit = fitFor(b.setup), mode = land ? 'live' : spec.mode;
  let T = scaped(b, mode, style, spec.dens, fit);
  for (let h = spec.dens.hard + 1; h <= 3 && !hasHardscape(T); h++) T = scaped(b, mode, style, { ...spec.dens, hard: h }, fit);
  T = settle(T, finSensitive(b.animals));
  const D = priceScape(T, b, now);
  const setupUsd = Math.round(D.totals.setupUsd), add = setupUsd - b.setupUsd;
  return {
    ...b, setup: T, setupUsd, listUsd: b.listUsd + Math.max(0, add), upkeepUsdMo: Math.round(D.totals.upkeepUsdMo), minPerWeek: Math.round(D.totals.minPerWeek),
    gear: [...b.gear, ...finishLines(T, style)],
    finish: { tier: spec.id, level: spec.level, style, lines: finishLines(T, style) },
  };
}

/** The build finished at each tier, best finish first, one at a time (a caller that stops at the first that passes builds as few as it must). `leanOnly`: just the starter finish, for a build already over a money or time cap, which no finish can bring back under.
 *  The style is the best-suited one that draws hardscape (a rock, wood or a hide to anchor the plants): styles scoring within 0.25 of the best are tried in order. */
export function* finishTiers(b: Build, now = Date.now(), leanOnly = false): Generator<Build> {
  const specs = leanOnly ? TIERS.slice(-1) : TIERS;
  const ranked = rankStyles(b.animals), top = ranked[0]?.score ?? 0, tried = ranked.filter(r => r.score >= top - 0.25).slice(0, 4).map(r => r.style);
  let style = tried[0] ?? 'planted', first: Build | undefined;
  for (const st of tried.length ? tried : [style]) {
    const f = finishBuild(b, specs[0], st, now);
    if (!first) { first = f; style = st; }
    if (hasHardscape(f.setup)) { first = f; style = st; break; }
  }
  yield first!;
  for (const spec of specs.slice(1)) yield finishBuild(b, spec, style, now);
}
