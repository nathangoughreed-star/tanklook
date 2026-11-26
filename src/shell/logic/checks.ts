// UI2 shell step 1 (lane S1, 2026-11-13): the check bar's four readouts and the read-only drawers' content, as plain data.
// Pure (no DOM, no Preact), so node tests cover it; the components in src/shell/ only draw what these return.
// Engines: habitat = ui/logic/habitat.ts (P6) + stockSummary; cost = demand/engine.ts demandOf, priced as the old cost panel prices
// it (pinned kit, gear deals, plant bundle); water = data/climate.ts; notes = scene/verdict.ts.
import { fmtMinDelta, fmtMin } from '../../units';
import type { TankSetup, Units } from '../../scene/types';
import type { Brief } from '../../scene/brief';
import { emptyBrief, rulesOf } from '../../scene/brief';
import { checksNote } from '../../scene/rules';
import { stockingMemo, plural, type Stocking } from '../../scene/stocking';
import { roomWorking, type RoomWorking } from '../../ui/logic/room';
import { tileState, topBy, tankSizeLine, type Bar, type TileState, type TopRow } from '../../ui/logic/habitat';
import { stockSummary, type StockSummary, type CatLevel } from '../../ui/stockSummary';
import { demandOf, drivers, type Demand, type UserProfile } from '../../demand';
import { swapsFor, type Bar as DBar, type Delta, type Swap } from '../../demand/swaps';
import { rhythmOf, rhythmNote } from '../../demand/rhythm';
import { pinnedKit } from '../../demand/pinned';
import { gearParts } from '../../demand/gearDeals';
import { lowerIt, type LowerItem } from './lowerIt';
import { bundleLine,gearSaleCount, type BundleLine, type GearSale } from './deals';
import { plantBundleOpt } from '../../demand/plantBundles';
import { standOf, standCheck } from '../../data/stands';
import { filledLb } from './tank';
import { volume } from '../../scene/physics';
import { climateOf, climateText, climateChart, type Climate, type Status } from '../../data/climate';
import { fixPlans, GO_LID, GO_FILTER, GO_HEATER, type FixPlan, type GoTarget } from './noteFixes';
import { lidIssues, tempIssues } from './lidTemp';
import { tempEvidence } from '../../scene/tech';
import { lifeSupportOf, notChosenLine, type Missing } from '../../scene/lifeSupport';
import { verdictOf, type Issue, type Verdict } from '../../scene/verdict';

/** One look for every status pill in the shell (tokens.css .pill). */
export type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';
export type CheckId = 'habitat' | 'cost' | 'water' | 'notes';
export const CHECKS: { id: CheckId; title: string }[] = [
  { id: 'habitat', title: 'Habitat check' }, { id: 'cost', title: 'Cost and time' }, { id: 'water', title: 'Water' }, { id: 'notes', title: 'Notes' },
];

export const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const TONE: Record<CatLevel, Tone> = { ok: 'ok', caution: 'warn', problem: 'bad', unknown: 'neutral' };
export const toneOfBar = (b: Bar): Tone => b.level === 'over' ? 'bad' : b.level === 'near' ? 'warn' : 'ok';

// ---------- Habitat ----------
export interface HabitatView {
  /** nothing to judge: no water or no animals */
  empty: boolean;
  pill: { tone: Tone; word: string };
  sizeLine: string;
  cats: { label: string; word: string; tone: Tone; items: { text: string; /** R117: the "Fix it" button's destination, when the row has an obvious section */ go?: GoTarget }[] }[];
  bars: { key: string; label: string; bar: Bar; tone: Tone; top: TopRow[]; topLines: string[]; /** HV: the Room bar's working: ticks at 75 and 100, the count-as line, the headroom */ room?: RoomWorking }[];
  warnings: { tone: Tone; text: string }[];
  reason: string;
  /** HV: the heater / filter the animals need and the tank lacks (scene/lifeSupport.ts), the same list the checklist, cost drawer and plan sheet read */
  support: Missing[];
  /** the scene it was worked from (the drawer's AqAdvisor row asks about it) */
  tank: TankSetup;
}
export function habitatView(S: TankSetup, units: Units, r: Stocking = stockingMemo(S)): HabitatView {
  const st: TileState = tileState(S, r, units), sm: StockSummary = stockSummary(S, r, st.mins, units);
  const empty = !S.water.on || !r.contributors.length, support = lifeSupportOf(S, units === 'in');
  const tooBig = st.fit?.fits === false;
  const pill = empty ? { tone: 'neutral' as Tone, word: S.water.on ? 'No animals' : 'No water' }
    : { tone: tooBig && sm.worst === 'ok' ? 'bad' as Tone : TONE[sm.worst], word: `${sm.worstWord}${tooBig ? ' · too big' : ''}${sm.unchecked ? ` · ${sm.unchecked} not checked` : ''}` };
  // HV: a share of the bar's fill, not of the tank: one species fills all of what is used ("all of the room used"), several say their part of it
  const lines = (top: TopRow[], what = 'the load') => top.length === 1 && top[0].share > 0.995 && !top[0].note ? [`All of ${what} is ${plural(top[0].n, top[0].name)}`]
    : top.map(t => `${plural(t.n, t.name)}: ${t.note ?? `${Math.round(t.share * 100)}% of ${what}`}`);
  const bars = empty ? [] : [
    { key: 'water', label: 'Room used', bar: st.water, top: topBy(r, 'space') },
    { key: 'floor', label: 'Floor', bar: st.floor, top: st.topFloor },
    ...(st.topMin.length ? [{ key: 'min', label: 'Tank minimum', bar: st.min, top: st.topMin }] : []),
  ].map(b => ({ ...b, tone: toneOfBar(b.bar), topLines: lines(b.top, b.key === 'water' ? 'the room used' : b.key === 'floor' ? 'the floor used' : 'the load'), ...(b.key === 'water' ? { room: roomWorking(S, r) } : {}) }));
  const warnings = [
    ...(st.compat ? [{ tone: st.compat.level === 'over' ? 'bad' as Tone : 'warn' as Tone, text: st.compat.text }] : []),
    ...st.mins.map(w => ({ tone: w.level === 'over' ? 'bad' as Tone : 'warn' as Tone, text: w.text })),
  ];
  const sc = (() => { try { const sp = standOf(S); return sp ? standCheck(sp, filledLb(S), volume(S.tank).gallons) : undefined; } catch { return undefined; } })();
  if (sc) warnings.push({ tone: sc.level === 'over' ? 'bad' as Tone : 'warn' as Tone, text: sc.text });
  return {
    empty, tank: S, support: empty ? [] : support, pill, sizeLine: tankSizeLine(S, r, units), reason: st.reason, warnings, bars,
    cats: empty ? [] : sm.cats.map(c => ({ label: c.label, word: c.word, tone: TONE[c.level], items: c.items.map(i => ({ text: i.text, ...(i.go ? { go: i.go === 'lid' ? GO_LID : i.go === 'heater' ? GO_HEATER : GO_FILTER } : {}) })) })),
  };
}

// ---------- Cost and time ----------
/** The tank's expected cost and time, priced the way the old cost panel prices it (ui/demandPanel.ts recompute). */
export function demandFor(S: TankSetup, active: number, P: UserProfile): Demand {
  return demandOf(S, P, { kit: pinnedKit(S, active, P), parts: gearParts(S), plantBundle: plantBundleOpt(S) });
}
export interface CostView {
  /** DL1: the one bundle worth a line (same tank, saves money, read within 14 days) and how many gear sales fit */
  /** HV: "Not chosen yet: a heater" when the animals need gear the price leaves out (scene/lifeSupport.ts) */
  notChosen?: string;
  deal?: BundleLine; gearSales?: { n: number; first?: GearSale };
  setup: string; monthly: string; minutes: string;
  /** 0-10, the old panel's "Relative difficulty" */
  risk: number; riskWord: string;
  /** what costs most to set up, biggest first */
  rows: { label: string; setup: string }[];
  /** the breakdown behind one figure, built on demand from the same `drivers` / `swapsFor` / `rhythmOf` the old panel uses */
  detail: (bar: DBar) => Breakdown;
  /** R138: what would lower the weekly time (information only); worked out when asked */
  lower: () => LowerItem[];
}
export interface Breakdown {
  title: string;
  rows: { label: string; value: string; swaps: string[] }[];
  /** Time only: the minutes as a rhythm, and how long the tank can be left */
  rhythm?: { text: string; away?: string; note: string };
  /** Difficulty only: the plan's problems */
  warnings: string[];
  empty: string;
}
const BREAK_TITLE: Record<DBar, string> = { setup: 'Costs most to set up', upkeep: 'Where the upkeep goes', minutes: 'Where the time goes', risk: 'What makes it harder' };
const sgn = (v: number, f: (n: number) => string) => (f(Math.abs(v)).replace(/[^0-9.]/g, '').replace(/^0+(\.0+)?$/, '') === '' ? 'same' : (v < 0 ? '−' : '+') + f(Math.abs(v)));
/** one swap's effect, as the old panel words it (US units) */
export const swapEffect = (d: Delta) => [`set-up ${sgn(d.setup, usd)}`, `upkeep ${sgn(d.upkeep, usd)}/mo`, `time ${sgn(d.minutes, fmtMinDelta)}`, `risk ${sgn(d.risk, v => v.toFixed(1))}`].join(' · ');
export const swapLine = (s: Swap) => `${s.kind === 'remove' ? 'Leave them out' : `Swap for ${s.to}`}: ${swapEffect(s.delta)}`;
/** The breakdown of one bar: the old panel's fillDrill + rhythmLine, same functions, same numbers. */
export function breakdownOf(D: Demand, S: TankSetup, P: UserProfile, bar: DBar): Breakdown {
  const unit = bar === 'setup' || bar === 'upkeep' ? usd : (v: number) => (bar === 'risk' ? v.toFixed(1) : `${fmtMin(v)}/wk`);
  const rows = drivers(D, P, bar, 6).map(r => {
    let swaps: string[] = [];
    if (r.key.startsWith('animal:') || r.key.startsWith('plant:')) { try { swaps = swapsFor(S, P, r.key, bar, {}, 2).map(swapLine); } catch { /* no swap to offer */ } }
    return { label: r.n > 1 ? `${r.label} × ${r.n}` : r.label, value: unit(r.mean), swaps };
  });
  const out: Breakdown = { title: BREAK_TITLE[bar], rows, warnings: bar === 'risk' ? D.warnings.slice(0, 8) : [], empty: 'Nothing in this tank adds to it.' };
  if (bar === 'minutes') { const r = rhythmOf(D, S); out.rhythm = { text: r.text, ...(r.awayText ? { away: r.awayText } : {}), note: rhythmNote(r) }; }
  return out;
}
export const riskWord = (r: number) => r < 3 ? 'Easy' : r < 6 ? 'Moderate' : 'Demanding';
export function costView(D: Demand, k = 8, ctx?: { S: TankSetup; P: UserProfile }): CostView {
  const t = D.totals, deal = ctx ? bundleLine(ctx.S, ctx.P) : undefined, gs = ctx ? gearSaleCount(ctx.S) : undefined;
  return {
    ...(ctx && notChosenLine(lifeSupportOf(ctx.S)) ? { notChosen: notChosenLine(lifeSupportOf(ctx.S)) } : {}),
    ...(deal ? { deal } : {}), ...(gs?.n ? { gearSales: gs } : {}),
    setup: usd(t.setupUsd), monthly: `${usd(t.upkeepUsdMo)}/mo`, minutes: `${fmtMin(t.minPerWeek)}/wk`,
    risk: Math.round(t.risk * 10) / 10, riskWord: ctx && lifeSupportOf(ctx.S).length ? `Incomplete: ${lifeSupportOf(ctx.S).map(m => m.label.replace(/^a /, '')).join(' and ')} not chosen` : riskWord(t.risk), // HV: a tank missing life support is never "Easy"
    rows: D.items.filter(i => (i.setup?.mode ?? 0) >= 0.5).sort((a, b) => b.setup!.mode - a.setup!.mode).slice(0, k)
      .map(i => ({ label: i.n && i.n > 1 ? `${i.label} × ${i.n}` : i.label, setup: usd(i.setup!.mode) })),
    lower: () => (ctx ? lowerIt(ctx.S, ctx.P) : []),
    detail: (bar: DBar) => ctx ? breakdownOf(D, ctx.S, ctx.P, bar) : { title: BREAK_TITLE[bar], rows: [], warnings: [], empty: 'Nothing in this tank adds to it.' },
  };
}

// ---------- Water ----------
const STATUS_WORD: Record<Status, string> = { ideal: 'in range', fine: 'ok', stretch: 'not long term', unsafe: 'too far' };
const STATUS_TONE: Record<Status, Tone> = { ideal: 'ok', fine: 'ok', stretch: 'warn', unsafe: 'bad' };
const RANK: Record<Status, number> = { ideal: 0, fine: 1, stretch: 2, unsafe: 3 };
export const fmtTemp = (c: number, units: Units) => units === 'in' ? `${Math.round(c * 9 / 5 + 32)} °F` : `${Math.round(c * 2) / 2} °C`;
export interface WaterView {
  /** the check bar: "75 °F" and a verdict */
  temp: string; pill: { tone: Tone; word: string };
  rows: { label: string; line: string; note?: string; /** the old per-species stacked range charts (temperature, humidity, pH) as markup; '' when no inhabitant has data */ chart: string; per: { name: string; word: string; tone: Tone }[] }[];
}
export function waterView(S: TankSetup, units: Units, rows: Climate[] = climateOf(S)): WaterView {
  const main = rows.find(r => r.label === 'Water') ?? rows[0];
  const per = (r: Climate) => (r.fit?.per ?? []).map(p => ({ name: p.name, word: STATUS_WORD[p.status], tone: STATUS_TONE[p.status] }));
  const worst = main?.fit?.per.reduce<Status>((w, p) => RANK[p.status] > RANK[w] ? p.status : w, 'ideal');
  const pill = !main ? { tone: 'neutral' as Tone, word: 'none' } : !main.fit ? { tone: 'neutral' as Tone, word: 'no data' }
    : worst === 'unsafe' ? { tone: 'bad' as Tone, word: 'does not fit' } : worst === 'stretch' ? { tone: 'warn' as Tone, word: 'tight' } : { tone: 'ok' as Tone, word: 'fits' };
  // HV: the chip says what the water WOULD be, from the same list as the drawer: with the heater missing it is the room (assumed unless entered), never the setpoint the species want, and never "fits"
  const noHeater = main && lifeSupportOf(S, units === 'in').some(m => m.kind === 'heater'), ev = noHeater ? tempEvidence(S, undefined, units === 'in') : undefined;
  return {
    temp: ev ? `${fmtTemp(ev.room, units)}${ev.roomSet ? '' : ' (assumed)'} room` : main ? fmtTemp(main.at, units) : '-', pill: ev ? { tone: 'warn' as Tone, word: 'no heater' } : pill,
    rows: rows.map(r => ({ label: r.label, line: climateText(r, units === 'in'), chart: climateChart(r, units === 'in'), ...(r.note ? { note: r.note } : {}), per: per(r) })),
  };
}

// ---------- Notes ----------
export interface NotesView { count: number; tone: Tone; info: string; groups: { title: string; items: Issue[] }[]; /** NF1: the "Fix these" buttons, one per kind of fix that applies (empty without a tank to read) */ fixes: FixPlan[] }
export function notesView(v: Verdict, brief: Brief = emptyBrief(), S?: TankSetup, ctx: { units?: Units; price?: (T: TankSetup) => number } = {}): NotesView {
  // LW1: the open-top and hold-the-temperature warnings the old UI had; the engine verdict does not carry them, so they join the Advice here
  let extra: Issue[] = [];
  if (S) try { extra = [...lidIssues(S), ...tempIssues(S, ctx.units ?? 'in')]; } catch { /* nothing to add */ }
  v = { ...v, advisories: [...v.advisories, ...extra] };
  const groups = [
    { title: 'Welfare and physical limits', items: v.gates }, { title: 'Your limits', items: v.hard },
    { title: 'Preferences not met', items: v.targets }, { title: 'Advice', items: v.advisories },
  ].filter(g => g.items.length);
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  let fixes: FixPlan[] = [];
  if (S && count) try { fixes = fixPlans(S, groups.flatMap(g => g.items), { ...(ctx.price ? { price: ctx.price } : {}), units: ctx.units ?? 'in' }); } catch { /* no fix offered */ }
  return { count, tone: v.gates.length + v.hard.length ? 'warn' : 'neutral', info: count ? checksNote(rulesOf(brief)) : '', groups, fixes };
}

/** Everything the check bar and the drawers show, for one tank, in one pass (each engine is memoised or cheap). */
export interface ChecksModel { habitat: HabitatView; cost: CostView | null; water: WaterView; notes: NotesView }
export function checksModel(S: TankSetup, active: number, units: Units, P: UserProfile): ChecksModel {
  const brief = S.brief ?? emptyBrief();
  let D: Demand | null = null;
  try { D = demandFor(S, active, P); } catch { /* an unfinished tank has no price yet */ }
  let notes: NotesView = { count: 0, tone: 'neutral', info: '', groups: [], fixes: [] };
  try { notes = notesView(verdictOf(S, brief, { units, limits: P.limits, ...(D ? { totals: D.totals } : {}) }), brief, S, { units, price: T => demandFor(T, active, P).totals.setupUsd }); } catch { /* nothing to judge */ }
  let water: WaterView = { temp: '-', pill: { tone: 'neutral', word: 'none' }, rows: [] };
  try { water = waterView(S, units); } catch { /* ignore */ }
  return { habitat: habitatView(S, units), cost: D ? costView(D, 8, { S, P }) : null, water, notes };
}
