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
import { feedFor, optionDef, setFeed, techOf, withChoice } from './tech';
import { fixtureOf } from './lightout';
import { volume } from './physics';
import type { GrowFeed, Item, LayoutId, TankSetup } from './types';

export type FinishTier = 'lowtech' | 'starter' | 'lean' | 'standard' | 'lush';
export interface Finish {
  tier: FinishTier;
  /** 0 starter .. 3 lush: how finished the tank is (Suggest ranks the best tier that passes every guardrail first) */
  level: 0 | 1 | 2 | 3;
  style: Exclude<LayoutId, 'none'>;
  /** one line each: the look, substrate, hardscape, plants */
  lines: string[];
}
export const TIER_LABEL: Record<FinishTier, string> = { lowtech: 'Low-tech lush finish', starter: 'Starter finish', lean: 'Basic finish', standard: 'Full finish', lush: 'Lush finish' };
/** What a tier is: layer densities (the starter sliders, 0 none .. 4 dense; default 2) AND the equipment people add as they spend (research/design/finish-ladders.md):
 *  plant feed (ferts, then CO2 by the cheapest gas that suits the tank, then pressurised; on a reef dosing, flow, skimmer and an auto top-off), a stronger light
 *  (x the build's own watts), and a plant count that grows with the floor (cm2 of floor to one plant piece), never a clump of dozens. */
interface TierSpec { id: FinishTier; level: 0 | 1 | 2 | 3; dens: { hard: number; plant: number }; mode: PlantMode; /** share of the hardscape kept (the leanest tier is a few well-placed pieces) */ keep: number;
  feed: GrowFeed; lightK: number; ato: boolean; plantArea: number }
/** Dense live plants chosen for the light this build has (fit settles any that would struggle into artificial ones), liquid ferts, no CO2, no stronger light: lush to look at, cheap to run. Level 2 so it counts as a full finish. */
const LOW_TECH: TierSpec = { id: 'lowtech', level: 2, dens: { hard: 3, plant: 3 }, mode: 'live', keep: 1, feed: 'ferts', lightK: 1, ato: false, plantArea: 110 };
const TIERS: readonly TierSpec[] = [
  { id: 'lush', level: 3, dens: { hard: 3, plant: 3 }, mode: 'live', keep: 1, feed: 'co2', lightK: 1.8, ato: true, plantArea: 110 },
  { id: 'standard', level: 2, dens: { hard: 2, plant: 2 }, mode: 'mixed', keep: 1, feed: 'co2', lightK: 1.3, ato: false, plantArea: 150 },
  { id: 'lean', level: 1, dens: { hard: 1, plant: 1 }, mode: 'mixed', keep: 1, feed: 'ferts', lightK: 1, ato: false, plantArea: 200 },
  { id: 'starter', level: 0, dens: { hard: 1, plant: 1 }, mode: 'mixed', keep: 0.4, feed: 'low', lightK: 1, ato: false, plantArea: 300 },
];

/** The share of the light's price a tier's stronger light adds (lane U5: that part is an enhancement, the rest is the light every tank needs). */
export const lightShare = (tier: FinishTier) => { const k = TIERS.find(t => t.id === tier)?.lightK ?? 1; return k > 1 ? 1 - 1 / k : 0; };

/** The build with this tier's equipment: plant feed (the cheapest CO2 that suits the tank: yeast to about 20 gal, a disposable-cartridge kit to about 45, a regulator and
 *  cylinder above or at the lush tier), a stronger light, an auto top-off on a reef. A dry tank has no such rows and is left as it is. */
export function upgraded(b: Build, spec: TierSpec): TankSetup {
  const S = structuredClone(b.setup);
  if (!S.water.on) return S;
  const salt = !!S.water.salt, gal = volume(S.tank).gallons;
  let t = setFeed(techOf(S), spec.feed, salt);
  if (!salt && spec.feed === 'co2') t = { ...t, rows: { ...t.rows, co2: spec.id === 'lush' || gal > 45 ? 'pressurized' : gal > 20 ? 'cartridge' : 'diy' } };
  S.tech = t;
  if (salt && spec.ato && t.rows.ato !== undefined) S.tech = withChoice(S, 'ato', 'ato');
  const fx = fixtureOf(S.light);
  if (spec.lightK > 1 && fx !== 'tube' && fx !== 'pendant' && fx !== 'flat') S.light = { ...S.light, watts: Math.round(wattsOf(S) * spec.lightK) };
  S.grow = { ...S.grow, feed: feedFor(S) };
  return S;
}

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
  if (S.water.on) {
    const r = techOf(S).rows, label = (row: string) => optionDef(row, r[row] ?? 'none')?.label, on = (row: string) => r[row] && r[row] !== 'none';
    const care = S.water.salt ? [on('dosing') && `dosing: ${label('dosing')}`, on('flow') && `flow: ${label('flow')}`, on('ato') && 'auto top-off'] : [on('co2') && `CO2: ${label('co2')}`, on('ferts') && `ferts: ${label('ferts')}`];
    if (care.some(Boolean) || wattsOf(S) > 0) lines.push(`${S.water.salt ? 'Reef care' : 'Plant care'}: ${care.filter(Boolean).join(', ') || 'no extras'}; ${Math.round(wattsOf(S))} W light`);
  }
  return lines;
}

const hasHardscape = (S: TankSetup) => S.items.some(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'cave');

/** The scaped pieces of a tank (ground, items, layout, animals' places), kept by what draws them: builds of one tank differ in gear only, so the
 *  three builds (and a re-ask with other guardrails) share one scape. Bounded. */
type Scape = Pick<TankSetup, 'items' | 'substrate' | 'terrain' | 'layout' | 'water' | 'fish' | 'patches'>;
const SCAPES = new Map<string, Scape>();
function scaped(b: Build, S0: TankSetup, mode: PlantMode, style: Exclude<LayoutId, 'none'>, dens: { hard: number; plant: number }, fit: FitLight): TankSetup {
  const key = JSON.stringify([S0.tank, S0.water, S0.grow, S0.layout, S0.fish.map(f => f.species), mode, style, dens, fit]);
  let c = SCAPES.get(key);
  if (!c) {
    const T = scapeSetup({ ...b, setup: S0 }, style, mode, S0, { dens, fit });
    c = structuredClone({ items: T.items, substrate: T.substrate, terrain: T.terrain, layout: T.layout, water: T.water, fish: T.fish, patches: T.patches }) as Scape;
    if (SCAPES.size >= 96) SCAPES.delete(SCAPES.keys().next().value!);
    SCAPES.set(key, c);
  }
  return { ...structuredClone(S0), ...structuredClone(c) };
}

/** Hardscape at a size people really lay out (Nathan 2026-10-27: "comically large"): no piece longer than about a fifth of the tank (a third on a reef, which stacks
 *  rock into a wall) or a third of its height, and no more pieces than the glass has room for, thinned evenly. Caves and hides keep their own size. */
function trimHardscape(S: TankSetup, keep: number, plantArea: number): TankSetup {
  const T = S.tank, reef = !!(S.water.on && S.water.salt), maxLen = Math.min(T.L * (reef ? 0.3 : 0.2), T.H * 0.35), most = Math.max(keep < 1 ? 2 : 3, Math.round(T.L / (reef ? 60 : 110) * keep));
  const hard = S.items.filter(i => i.kind === 'stone' || i.kind === 'wood'), drop = new Set<number>();
  if (hard.length > most) hard.forEach((it, i) => { if (Math.floor(i * most / hard.length) === Math.floor((i - 1) * most / hard.length) && i > 0) drop.add(it.id); });
  const green = S.items.filter(i => i.kind === 'plant' || i.kind === 'artificial'), want = Math.max(3, Math.round(T.L * T.D / 100 / plantArea)); // pieces of plant by floor area (cm2)
  if (green.length > want) green.forEach((it, i) => { if (Math.floor(i * want / green.length) === Math.floor((i - 1) * want / green.length) && i > 0) drop.add(it.id); });
  return { ...S, items: S.items.filter(i => !drop.has(i.id)).map(i => (i.kind === 'stone' || i.kind === 'wood') && i.size > maxLen ? { ...i, size: Math.max(LIBRARY[i.variant]?.min ?? 15, Math.round(maxLen)) } : i) };
}

/** The starter finish's planting (lane U5, Nathan 2026-10-28): two hardy low-light plants, a Java fern and an anubias, the pair beginners buy for a betta tank
 *  (about $16 at our prices, against four bunches of hornwort), set by the first stones. Any other green (moss, crypts) is dropped; floating plants and corals are left alone. */
function starterPlants(S: TankSetup): TankSetup {
  if (!S.water.on || S.water.salt) return S;
  const live = S.items.filter(i => i.kind === 'plant' && !['frogbit', 'salvinia', 'lettuce', 'redroot'].includes(i.variant));
  if (!live.length) return S;
  const stones = S.items.filter(i => i.kind === 'stone' || i.kind === 'wood'), VARS = ['anubias', 'fern'];
  const keep = new Map(live.slice(0, 2).map((it, k) => {
    const v = VARS[k], to = LIBRARY[v], at = stones[k % Math.max(1, stones.length)];
    const { spread: _s, stems: _t, dens: _d, ...rest } = it;
    return [it.id, { ...rest, variant: v, size: Math.min(to.max, Math.max(to.min, to.size)), ...(at ? { x: at.x, depth: Math.min(at.depth + 30, S.tank.D / 2) } : {}) }] as const;
  }));
  return { ...S, items: S.items.flatMap(i => (keep.has(i.id) ? [keep.get(i.id)!] : live.includes(i) ? [] : [i])) };
}

/** The finished build at one tier: the style scaped into the build's tank, priced and timed by the demand model with the build's own deals.
 *  A tier with no hardscape (a planted style at a light density) draws more of it until there is a piece to anchor the plants, up to the densest. */
export function finishBuild(b: Build, spec: TierSpec, style: Exclude<LayoutId, 'none'>, now = Date.now()): Build {
  const S1 = upgraded(b, spec), land = !S1.water.on, fit = fitFor(S1), mode = land ? 'live' : spec.mode;
  let T = scaped(b, S1, mode, style, spec.dens, fit);
  for (let h = spec.dens.hard + 1; h <= 3 && !hasHardscape(T); h++) T = scaped(b, S1, mode, style, { ...spec.dens, hard: h }, fit);
  T = trimHardscape(T, spec.keep, spec.plantArea);
  if (spec.id === 'starter') T = starterPlants(T);
  T = settle(T, finSensitive(b.animals));
  T = { ...T, render: { ...T.render, bg: T.water.on && T.water.salt ? 'blue' : T.water.on ? 'black' : 'gradient' } }; // a background behind every finished tank (Nathan 2026-10-27)
  const D = priceScape(T, b, now);
  const setupUsd = Math.round(D.totals.setupUsd), add = setupUsd - b.setupUsd;
  return {
    ...b, setup: T, setupUsd, listUsd: b.listUsd + Math.max(0, add), upkeepUsdMo: Math.round(D.totals.upkeepUsdMo), minPerWeek: Math.round(D.totals.minPerWeek),
    gear: [...b.gear, ...finishLines(T, style)],
    finish: { tier: spec.id, level: spec.level, style, lines: finishLines(T, style) },
  };
}

/** The build finished at each tier, best finish first, one at a time (a caller that stops at the first that passes builds as few as it must). `leanOnly`: just the starter finish, for a build already over a money or time cap, which no finish can bring back under. `maxLevel`: the richest tier offered (the finish ladder's top for this concept).
 *  The style is the best-suited one that draws hardscape (a rock, wood or a hide to anchor the plants): styles scoring within 0.25 of the best are tried in order. */
export function* finishTiers(b: Build, now = Date.now(), leanOnly = false, maxLevel: 0 | 1 | 2 | 3 = 3, forceStyle?: Exclude<LayoutId, 'none'>, lowTech = false): Generator<Build> {
  // `maxLevel` (lane U2): a concept that is not climbing starts at its own tier and never builds the richer ones above it
  // `lowTech` (lane U5): the planted look without CO2: the low-tech lush tier replaces the CO2 tiers above the basic finish
  const specs = leanOnly ? TIERS.slice(-1) : lowTech ? [LOW_TECH, ...TIERS.filter(t => t.level <= Math.min(1, maxLevel))] : TIERS.filter(t => t.level <= maxLevel); // the last is the leanest
  const ranked = rankStyles(b.animals), top = ranked[0]?.score ?? 0, tried = forceStyle ? [forceStyle] : ranked.filter(r => r.score >= top - 0.25).slice(0, 4).map(r => r.style); // `forceStyle` (lane U2): a concept that is about a different look
  let style = tried[0] ?? 'planted', first: Build | undefined;
  for (const st of tried.length ? tried : [style]) {
    const f = finishBuild(b, specs[0], st, now);
    if (!first) { first = f; style = st; }
    if (hasHardscape(f.setup)) { first = f; style = st; break; }
  }
  yield first!;
  // The ladder never rises downhill: a light that keeps fewer corals (or plants) than the starter set draws can leave the tier above it cheaper than the starter
  // (clown-nano 20 high after the 2026-10-27 LED audit: lean 830 against starter 953), so the starter is then the tier above it, relabelled, not a dearer tank.
  let above = first!;
  for (const spec of specs.slice(1)) {
    let f = finishBuild(b, spec, style, now);
    if (spec.id === 'starter' && f.setupUsd > above.setupUsd && above.finish) f = { ...above, finish: { ...above.finish, tier: spec.id, level: spec.level } };
    above = f;
    yield f;
  }
}
