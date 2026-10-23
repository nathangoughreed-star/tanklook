// Survey v4 (research/calib/v4/survey-v4-design.md, 2026-10-23): what the app says today about each of the 60 hand-written tanks.
// One engine run per tank as shown, built the way the stocking screen builds a tank from its picks (ui/stockPlan.ts: males, then
// females, then unsexed; a pair species' two animals marked a pair), so the readings are the app's own. Rounds 1-3 (scenario.ts) are
// untouched: this file only reads their helpers. The tables (test/calibtablesv4.test.ts -> research/calib/tables/v4.json) are what
// scripts/calib-fit.mjs and scripts/calib-review-v4.mjs compare the experts with.
import { starterItems } from '../scene/items';
import { IN, volume } from '../scene/physics';
import { FLOOR_SHARE, INVERT_FLOOR, stockingOf } from '../scene/stocking';
import { zoneOf } from '../scene/zone';
import { FLOOR_FACTOR } from '../data/spacefactor';
import { compatRisks, crowdWarnings } from '../scene/territory';
import { tankMinimum } from '../scene/tankMin';
import { MIN_SLACK_PCT } from '../scene/animalfit';
import { herpCheck } from '../scene/herpcheck';
import { operatingCheck, sharedRange } from '../scene/temprange';
import { HERP, floorFor, SQFT_MM2 } from '../data/herpstock';
import { mostFor, mostMalesFor } from '../data/groups';
import { CARE } from '../data/care';
import { getSpecies } from '../data/species';
import { footprint } from '../scene/shape';
import { isSexed, notesOf, overWarn, pairRule, writePairs, type Pk } from '../ui/stockPlanLogic';
import { tileState } from '../ui/fullnessTile';
import { classOf, gateOf, setupOf, type TableRow } from './scenario';
import type { TankSetup } from '../scene/types';

type Dims = [number, number, number];
export interface V4Stock { id: string; n: number; sex?: 'm' | 'f' | [number, number]; note?: string }
export interface V4Tank { name: string; in: Dims; kind: 'aquarium' | 'terrarium' | 'paludarium' }
export interface V4Scenario {
  id: string; module: string; tank: string; env: { water: 'fresh' | 'salt' | 'none' | 'half'; tempC?: number; note?: string };
  stock: V4Stock[]; focal?: string; mate?: string; ask: string[]; tests: string[]; why: string; pairOf?: string;
  min?: { species: string; sizes: string[]; label?: string }; max?: { species: string; options: string[]; label?: string }[];
  maxMales?: { species: string; options: string[] }[];
}
export interface V4Doc { tanks: Record<string, V4Tank>; scenarios: V4Scenario[]; ideal: number; limit: number }

/** The verdict scale both sides answer on (design section 4). */
export const VERDICTS = ['ideal', 'caution', 'problems', 'unworkable'] as const;
export type Verdict = typeof VERDICTS[number];

/** A stock line as the stocking screen's pick: a species kept by sex (CARE.sexed) carries males in `n`, females in `f`, unsexed in `u`;
 *  a sexed species with no split given is unsexed (the app never guesses a sex); "m" on a species not kept by sex is just a count.
 *  A pair species' two animals described as a pair (not "unsexed") are an established pair. */
export function pickOf(s: V4Stock): Pk {
  const sexed = isSexed(s.id), pair = pairRule(s.id) && s.n === 2 && /\bpair\b/i.test(s.note ?? '') && !/unsexed|unknown/i.test(s.note ?? '');
  let p: Pk;
  if (!sexed) p = { id: s.id, n: s.n };
  else if (Array.isArray(s.sex)) p = { id: s.id, n: s.sex[0], f: s.sex[1] };
  else if (s.sex === 'm') p = { id: s.id, n: s.n };
  else if (s.sex === 'f') p = { id: s.id, n: 0, f: s.n };
  else p = { id: s.id, n: 0, u: s.n };
  return pair ? { ...p, pair: 'established' } : p;
}

/** "water 4 in deep" in a tank's setting note: the one note the app has an input for (the water level). */
export const waterDepthIn = (note?: string) => { const m = /water (\d+(?:\.\d+)?) in deep/.exec(note ?? ''); return m ? +m[1] : undefined; };

/** The tank as the app would hold it: the inside dimensions, the animals placed as rounds 1-3 place them (setupOf), each animal's sex
 *  and the pairs as the stocking screen sets them, salt water for a saltwater tank, no water for a dry enclosure (env.water none), and
 *  for a paludarium (env.water half) the app's paludarium layout with the stated water depth. */
export function setupV4(dims: Dims, env: V4Scenario['env'], stock: V4Stock[]): TankSetup {
  const S = setupOf(dims, stock.map(s => [s.id, s.n] as [string, number])), picks = stock.map(pickOf);
  for (const p of picks) {
    const sp = getSpecies(p.id)!, mine = S.fish.filter(f => f.species === p.id), sexed = isSexed(p.id);
    // ui/stockPlan.ts: males, then females, then unsexed (a herp's gender left unset = not sexed yet)
    mine.forEach((f, i) => {
      const female = sexed && i >= p.n && i < p.n + (p.f ?? 0), unsexed = sexed && i >= p.n + (p.f ?? 0);
      if (sp.female) { if (female) f.sex = 'f'; else delete f.sex; }
      if (sexed && (sp.cat === 'reptile' || sp.cat === 'amphibian')) { if (unsexed) delete f.gender; else f.gender = female ? 'f' : 'm'; }
    });
  }
  writePairs(S, picks);
  S.water.salt = env.water === 'salt';
  if (env.water === 'none') S.water.on = false;
  const deep = waterDepthIn(env.note);
  if (env.water === 'half') { S.layout.id = 'paludarium'; S.items = starterItems(S); }
  if (deep !== undefined) S.water.level = Math.min(1, deep * IN / (S.tank.H - 25));
  return S;
}

const sizeOf = (label: string): Dims | null => { const m = /\((\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) in\)/.exec(label); return m ? [+m[1], +m[2], +m[3]] : null; };
const minLevel = (pct: number, comfortPct: number) => pct > MIN_SLACK_PCT ? 'red' as const : comfortPct > 100 ? 'yellow' as const : 'green' as const;
const herpRuleOf = (id: string) => { const sp = getSpecies(id); return sp ? HERP[sp.sci] : undefined; };
/** herpcheck.ts's floor (with its 5 % slack) in sq ft. */
const herpArea = (S: TankSetup) => footprint(S.tank).area / SQFT_MM2 * 1.05;

/** One species at one size, as stocked: the tank minimum's line for a water animal, the herp floor and height checks for a land one. */
function minAt(sc: V4Scenario, sp: string, dims: Dims): { level: 'red' | 'yellow' | 'green'; why: string } {
  const S = setupV4(dims, sc.env, sc.stock), row = tankMinimum(S).rows.find(r => r.id === sp);
  if (row) return { level: minLevel(row.pct, row.comfortPct), why: `${Math.round(row.pct)} % of the red line, ${Math.round(row.comfortPct)} % of the green` };
  const who = herpRuleOf(sp)?.name, iss = herpCheck(S).filter(i => i.who === who && /^(floor|enclosure)/.test(i.text));
  return { level: iss.some(i => i.level === 'warn') ? 'red' : iss.length ? 'yellow' : 'green', why: iss.map(i => i.text).join('; ') || 'meets the floor and height' };
}

/** The most of a species the app accepts in this tank: groups.ts (size-scaled territory, else the flat max; one for a solo species) for
 *  a fish, herpstock.ts for a herp (its `max`, and the most whose bare-minimum floor fits, `min + each x (n - 1)`). */
export function appMost(S: TankSetup, id: string): { most: number | null; males: number | null; from: string } {
  const r = herpRuleOf(id);
  if (r) {
    const area = herpArea(S);
    let byFloor = 0;
    while (byFloor < 99 && floorFor(r, byFloor + 1)[0] <= area) byFloor++;
    const most = Math.min(r.max ?? 99, byFloor);
    return { most: most >= 99 ? null : most, males: r.males2 ? 1 : null, from: `herpstock max ${r.max ?? 'none'}, floor fits ${byFloor} (${r.min} + ${r.each} sq ft each, ${area.toFixed(2)} sq ft)` };
  }
  const c = CARE[id], litres = volume(S.tank).litres, mx = mostFor(c, litres, S.tank.L) ?? (c?.solo ? 1 : undefined), mm = mostMalesFor(c, litres);
  return { most: mx ?? null, males: mm ?? null, from: c?.territory ? 'groups.ts territory' : c?.max !== undefined ? 'groups.ts max' : c?.solo ? 'solo' : 'no limit' };
}

/** The app's overall verdict on the 4-step scale, from its parts (the reading this lane takes; open for Nathan): not workable when a
 *  pair is blocked, the tank is under a species' red line or a herp's bare floor / height, a herp is with animals it must not share with,
 *  or the temperature misses the shared range; problems past 100 % of space, with a fighting warning or another herp warning, or a
 *  group too small; caution past 75 %, with a compatibility concern, under a recommended size, a narrow shared temperature, a herp
 *  floor under the usual recommendation or a sex mix off the app's ratio; otherwise ideal. */
export function verdictOf(a: Omit<AppReading, 'verdict' | 'by'>): { verdict: Verdict; by: string[] } {
  const by: [Verdict, string][] = [];
  if (a.compat?.level === 'high') by.push(['unworkable', 'compat high']);
  for (const m of a.tankmin) if (m.level === 'red') by.push(['unworkable', `tankmin red: ${m.id}`]);
  for (const h of a.herp) if (h.level === 'warn') by.push([/^(not with|floor|enclosure|needs water)/.test(h.text) ? 'unworkable' : 'problems', `herp: ${h.who}: ${h.text.split(/[.:]/)[0]}`]);
  if (a.temp.state === 'outside' || a.temp.shared === 'none' || a.temp.shared === 'single') by.push(['unworkable', `temperature ${a.temp.state === 'outside' ? 'outside' : a.temp.shared}`]);
  if (a.space && a.space.band === 'problems') by.push(['problems', `space ${Math.round(a.space.pct)} %`]);
  for (const w of a.crowd) by.push(['problems', `crowd: ${w.split(':')[0]}`]);
  for (const g of a.groups) if (g.band === 'avoid') by.push(['problems', `group too small: ${g.id}`]);
  if (a.space && a.space.band === 'caution') by.push(['caution', `space ${Math.round(a.space.pct)} %`]);
  if (a.compat?.level === 'concern') by.push(['caution', 'compat concern']);
  for (const m of a.tankmin) if (m.level === 'yellow') by.push(['caution', `tankmin yellow: ${m.id}`]);
  if (a.temp.shared === 'narrow') by.push(['caution', 'temperature narrow']);
  for (const h of a.herp) if (h.level === 'note' && /usual recommendation/.test(h.text)) by.push(['caution', `herp floor under recommended: ${h.who}`]);
  for (const g of a.groups) if (g.ratio && /Your mix/.test(g.ratio)) by.push(['caution', `sex mix: ${g.id}`]);
  const worst = by.reduce((k, [v]) => Math.max(k, VERDICTS.indexOf(v)), 0);
  return { verdict: VERDICTS[worst], by: by.filter(([v]) => VERDICTS.indexOf(v) === worst).map(([, w]) => w) };
}

export interface AppReading {
  verdict: Verdict; by: string[];
  /** null in a dry enclosure (the app shows no Space bar without water) */
  space: { pct: number; water: number; floor: number; spaceBy: 'water' | 'floor'; band: 'ideal' | 'caution' | 'problems'; head: string; top: string | null; topWater: string | null; topFloor: string | null } | null;
  tankmin: { id: string; pct: number; comfortPct: number; level: 'red' | 'yellow' | 'green'; reason: string }[];
  minHead: string | null;
  crowd: string[];
  compat: { level: 'high' | 'concern'; items: string[] } | null;
  temp: { shared: string; range: [number, number] | null; state: string; text: string };
  herp: { level: string; who: string; text: string }[];
  groups: { id: string; band: string; line: string; ratio?: string; over?: string }[];
  most: Record<string, { most: number | null; males: number | null; from: string }>;
}

/** What the app shows for a tank as described. */
export function readApp(sc: V4Scenario, dims: Dims): AppReading {
  const S = setupV4(dims, sc.env, sc.stock), st = stockingOf(S), tile = tileState(S, st, 'in'), m = tankMinimum(S);
  const bandOf = (lv: string) => lv === 'over' ? 'problems' as const : lv === 'near' ? 'caution' as const : 'ideal' as const;
  const top = (k: 'space' | 'floor') => [...st.contributors].filter(c => c[k] > 0).sort((a, b) => b[k] - a[k])[0]?.id ?? null;
  const wet = S.water.on && st.contributors.length > 0;
  const space = wet ? { pct: st.spacePercent, water: st.waterPercent, floor: st.floorPercent, spaceBy: st.spaceBy, band: bandOf(tile.space.level), head: tile.head.text,
    top: top(st.spaceBy === 'floor' ? 'floor' : 'space'), topWater: top('space'), topFloor: top('floor') } : null;
  const species = sc.stock.map(s => getSpecies(s.id)!), shared = sharedRange(species.filter(sp => sp.habitat !== 'land'));
  const op = sc.env.tempC !== undefined && S.water.on ? operatingCheck(shared, { target: sc.env.tempC, heater: true, chiller: false, room: 21, roomSet: false }) : null;
  const litres = volume(S.tank).litres;
  const groups = sc.stock.map(s => { const p = pickOf(s), nt = notesOf(p, 'in'), over = overWarn(p, litres, S.tank.L);
    return { id: s.id, band: nt.band, line: nt.line, ...(nt.ratio ? { ratio: nt.ratio } : {}), ...(over ? { over } : {}) }; });
  const parts = {
    space, tankmin: m.rows.map(r => ({ id: r.id, pct: r.pct, comfortPct: r.comfortPct, level: minLevel(r.pct, r.comfortPct), reason: r.reason })),
    minHead: m.rows.length ? tile.min.text : null, crowd: crowdWarnings(S), compat: compatRisks(S),
    temp: { shared: shared.state, range: shared.range ?? null, state: op?.state ?? 'unchecked', text: op?.text ?? '' },
    herp: herpCheck(S).map(i => ({ level: i.level, who: i.who, text: i.text })), groups,
    most: Object.fromEntries(sc.stock.map(s => [s.id, appMost(S, s.id)])),
  };
  return { ...verdictOf(parts), ...parts };
}

/** The focal species split by sex at count n, at the ratio shown (at least one male once there are two), others as shown. */
export function stockAt(sc: V4Scenario, who: string, n: number): V4Stock[] {
  const out: V4Stock[] = [];
  for (const s of sc.stock) {
    if (s.id !== who) { out.push(s); continue; }
    if (!n) continue;
    if (Array.isArray(s.sex)) { const m = n < 2 ? n : Math.max(1, Math.round(n * s.sex[0] / (s.sex[0] + s.sex[1]))); out.push({ ...s, n, sex: [m, n - m] }); }
    else out.push({ ...s, n });
  }
  return out;
}

/** The space table for counts 0..nmax of `who`, the rest as shown (scenario.ts tableOf on this tank's setup: salt, sexes, pairs).
 *  nmax: where the reading passes 1.8 x the limit, at least 2 x shown. */
export function tableV4(sc: V4Scenario, dims: Dims, who: string, limit = 100): TableRow[] {
  const shown = sc.stock.find(s => s.id === who)!.n, out: TableRow[] = [];
  for (let n = 0; n <= 400; n++) {
    const st = stockingOf(setupV4(dims, sc.env, stockAt(sc, who, n))), water: Record<string, number> = {};
    for (const c of st.contributors) water[c.id] = c.space / st.capacity.space * 100;
    out.push({ n, water, floor: st.floorPercent });
    if (n >= 2 * shown && st.spacePercent > 1.8 * limit) break;
  }
  return out;
}

/** Notes on a tank the engine has no input for (kept beside the reading so a reviewer sees what the app did not model). */
export function unmodelled(sc: V4Scenario): string[] {
  const out: string[] = [];
  for (const s of sc.stock) if (s.note && !(pairRule(s.id) && s.n === 2 && /\bpair\b/i.test(s.note) && !/unsexed|unknown/i.test(s.note))) out.push(`${s.id}: ${s.note}`);
  const rest = (sc.env.note ?? '').replace(/,?\s*water \d+(?:\.\d+)? in deep/, '').trim();
  if (rest) out.push(`setting: ${rest}`);
  if (sc.env.water === 'none' && sc.env.tempC !== undefined) out.push(`air ${sc.env.tempC} °C`);
  return out;
}

/** The floor share the engine gives a species today (stocking.ts floorUseCm2): its zone's share times FLOOR_FACTOR, shrimp and crabs at
 *  INVERT_FLOOR, snails on the floor only. scenario.ts floorShareOf predates the invert floor rule (shrimp 0) and stays as rounds 1-3 used it. */
export const floorShare = (sp: NonNullable<ReturnType<typeof getSpecies>>) => sp.kind === 'snail' ? 1
  : FLOOR_SHARE[zoneOf(sp)] * (FLOOR_FACTOR[sp.id]?.[0] ?? (sp.cat.endsWith('invert') ? INVERT_FLOOR : 1));

/** Everything the tables file holds for one tank. */
export function retableV4(doc: V4Doc, sc: V4Scenario) {
  const T = doc.tanks[sc.tank], dims = T.in;
  const missing = sc.stock.filter(s => !getSpecies(s.id)).map(s => s.id);
  if (missing.length) return { readable: false, why: `not in the app: ${missing.join(', ')}` };
  const app = readApp(sc, dims), counts = sc.ask.includes('counts') && sc.focal;
  const cls = Object.fromEntries(sc.stock.map(s => { const sp = getSpecies(s.id)!; return [s.id, sp.salt ? 'salt' : classOf(s.id)]; }));
  const uses = Object.fromEntries(sc.stock.map(s => [s.id, { water: getSpecies(s.id)!.kind !== 'snail', floor: floorShare(getSpecies(s.id)!) }]));
  // adult lengths as the engine has them at retable time (the female's where the species is drawn apart), mm
  const tlMm = Object.fromEntries(sc.stock.map(s => { const sp = getSpecies(s.id)!; return [s.id, sp.female ? { m: sp.tl, f: sp.female.tl } : sp.tl]; }));
  // a mix's label as rounds 1-3 read it (scenario.ts gateOf: compatibility at the groups' minimums, no / one shared degree = high, narrow = concern)
  const gate = sc.stock.length > 1 ? gateOf(dims, sc.stock.map(s => s.id)) : null;
  return {
    readable: true, kind: T.kind, water: sc.env.water, salt: sc.env.water === 'salt', ...(sc.env.water === 'half' ? { note: 'paludarium: the app\'s paludarium layout, water at the stated depth; read as the app reads it today' } : {}),
    unmodelled: unmodelled(sc), cls, uses, tlMm, ...(gate ? { gate: gate.gate, gateItems: gate.items } : {}), app,
    ...(sc.min ? { minSizes: sc.min.sizes.map(label => { const d = sizeOf(label); return { label, dims: d, ...(d ? minAt(sc, sc.min!.species, d) : { level: null, why: 'no size in the label' }) }; }) } : {}),
    ...(counts ? { table: tableV4(sc, dims, sc.focal!, doc.limit) } : {}),
    // the second counted species (a bottom dweller, survey v4 build cba9d609), the focal held as shown
    ...(counts && sc.mate ? { mateTable: tableV4(sc, dims, sc.mate, doc.limit) } : {}),
  };
}
