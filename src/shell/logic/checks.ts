// UI2 shell step 1 (lane S1, 2026-11-13): the check bar's four readouts and the read-only drawers' content, as plain data.
// Pure (no DOM, no Preact), so node tests cover it; the components in src/shell/ only draw what these return.
// Engines: habitat = ui/logic/habitat.ts (P6) + stockSummary; cost = demand/engine.ts demandOf, priced as the old cost panel prices
// it (pinned kit, gear deals, plant bundle); water = data/climate.ts; notes = scene/verdict.ts.
import type { TankSetup, Units } from '../../scene/types';
import type { Brief } from '../../scene/brief';
import { emptyBrief, rulesOf } from '../../scene/brief';
import { checksNote } from '../../scene/rules';
import { stockingMemo, plural, type Stocking } from '../../scene/stocking';
import { tileState, topBy, tankSizeLine, type Bar, type TileState, type TopRow } from '../../ui/logic/habitat';
import { stockSummary, type StockSummary, type CatLevel } from '../../ui/stockSummary';
import { demandOf, type Demand, type UserProfile } from '../../demand';
import { pinnedKit } from '../../demand/pinned';
import { gearParts } from '../../demand/gearDeals';
import { plantBundleOpt } from '../../demand/plantBundles';
import { climateOf, climateText, type Climate, type Status } from '../../data/climate';
import { verdictOf, type Issue, type Verdict } from '../../scene/verdict';

/** One look for every status pill in the shell (tokens.css .pill). */
export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';
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
  cats: { label: string; word: string; tone: Tone; items: string[] }[];
  bars: { key: string; label: string; bar: Bar; tone: Tone; top: TopRow[]; topLines: string[] }[];
  warnings: { tone: Tone; text: string }[];
  reason: string;
}
export function habitatView(S: TankSetup, units: Units, r: Stocking = stockingMemo(S)): HabitatView {
  const st: TileState = tileState(S, r, units), sm: StockSummary = stockSummary(S, r, st.mins, units);
  const empty = !S.water.on || !r.contributors.length;
  const tooBig = st.fit?.fits === false;
  const pill = empty ? { tone: 'neutral' as Tone, word: S.water.on ? 'No animals' : 'No water' }
    : { tone: tooBig && sm.worst === 'ok' ? 'bad' as Tone : TONE[sm.worst], word: tooBig ? `${sm.worstWord} · too big` : sm.worstWord };
  const lines = (top: TopRow[]) => top.map(t => `${plural(t.n, t.name)}: ${t.note ?? `${Math.round(t.share * 100)}%`}`);
  const bars = empty ? [] : [
    { key: 'water', label: 'Water column', bar: st.water, top: topBy(r, 'space') },
    { key: 'floor', label: 'Floor', bar: st.floor, top: st.topFloor },
    ...(st.topMin.length ? [{ key: 'min', label: 'Tank minimum', bar: st.min, top: st.topMin }] : []),
  ].map(b => ({ ...b, tone: toneOfBar(b.bar), topLines: lines(b.top) }));
  const warnings = [
    ...(st.compat ? [{ tone: st.compat.level === 'over' ? 'bad' as Tone : 'warn' as Tone, text: st.compat.text }] : []),
    ...st.mins.map(w => ({ tone: w.level === 'over' ? 'bad' as Tone : 'warn' as Tone, text: w.text })),
    ...(st.filter === 'unset' && !empty ? [{ tone: 'warn' as Tone, text: 'No filter chosen: a filter sized for this tank is strongly recommended.' }] : []),
  ];
  return {
    empty, pill, sizeLine: tankSizeLine(S, r, units), reason: st.reason, warnings, bars,
    cats: empty ? [] : sm.cats.map(c => ({ label: c.label, word: c.word, tone: TONE[c.level], items: c.items.map(i => i.text) })),
  };
}

// ---------- Cost and time ----------
/** The tank's expected cost and time, priced the way the old cost panel prices it (ui/demandPanel.ts recompute). */
export function demandFor(S: TankSetup, active: number, P: UserProfile): Demand {
  return demandOf(S, P, { kit: pinnedKit(S, active, P), parts: gearParts(S), plantBundle: plantBundleOpt(S) });
}
export interface CostView {
  setup: string; monthly: string; minutes: string;
  /** 0-10, the old panel's "Relative difficulty" */
  risk: number; riskWord: string;
  /** what costs most to set up, biggest first */
  rows: { label: string; setup: string }[];
}
export const riskWord = (r: number) => r < 3 ? 'Easy' : r < 6 ? 'Moderate' : 'Demanding';
export function costView(D: Demand, k = 8): CostView {
  const t = D.totals;
  return {
    setup: usd(t.setupUsd), monthly: `${usd(t.upkeepUsdMo)}/mo`, minutes: `${Math.round(t.minPerWeek)} min/wk`,
    risk: Math.round(t.risk * 10) / 10, riskWord: riskWord(t.risk),
    rows: D.items.filter(i => (i.setup?.mode ?? 0) >= 0.5).sort((a, b) => b.setup!.mode - a.setup!.mode).slice(0, k)
      .map(i => ({ label: i.n && i.n > 1 ? `${i.label} × ${i.n}` : i.label, setup: usd(i.setup!.mode) })),
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
  rows: { label: string; line: string; note?: string; per: { name: string; word: string; tone: Tone }[] }[];
}
export function waterView(S: TankSetup, units: Units, rows: Climate[] = climateOf(S)): WaterView {
  const main = rows.find(r => r.label === 'Water') ?? rows[0];
  const per = (r: Climate) => (r.fit?.per ?? []).map(p => ({ name: p.name, word: STATUS_WORD[p.status], tone: STATUS_TONE[p.status] }));
  const worst = main?.fit?.per.reduce<Status>((w, p) => RANK[p.status] > RANK[w] ? p.status : w, 'ideal');
  const pill = !main ? { tone: 'neutral' as Tone, word: 'none' } : !main.fit ? { tone: 'neutral' as Tone, word: 'no data' }
    : worst === 'unsafe' ? { tone: 'bad' as Tone, word: 'does not fit' } : worst === 'stretch' ? { tone: 'warn' as Tone, word: 'tight' } : { tone: 'ok' as Tone, word: 'fits' };
  return {
    temp: main ? fmtTemp(main.at, units) : '-', pill,
    rows: rows.map(r => ({ label: r.label, line: climateText(r, units === 'in'), ...(r.note ? { note: r.note } : {}), per: per(r) })),
  };
}

// ---------- Notes ----------
export interface NotesView { count: number; tone: Tone; info: string; groups: { title: string; items: Issue[] }[] }
export function notesView(v: Verdict, brief: Brief = emptyBrief()): NotesView {
  const groups = [
    { title: 'Welfare and physical limits', items: v.gates }, { title: 'Your limits', items: v.hard },
    { title: 'Preferences not met', items: v.targets }, { title: 'Advice', items: v.advisories },
  ].filter(g => g.items.length);
  const count = groups.reduce((s, g) => s + g.items.length, 0);
  return { count, tone: v.gates.length + v.hard.length ? 'warn' : 'neutral', info: count ? checksNote(rulesOf(brief)) : '', groups };
}

/** Everything the check bar and the drawers show, for one tank, in one pass (each engine is memoised or cheap). */
export interface ChecksModel { habitat: HabitatView; cost: CostView | null; water: WaterView; notes: NotesView }
export function checksModel(S: TankSetup, active: number, units: Units, P: UserProfile): ChecksModel {
  const brief = S.brief ?? emptyBrief();
  let D: Demand | null = null;
  try { D = demandFor(S, active, P); } catch { /* an unfinished tank has no price yet */ }
  let notes: NotesView = { count: 0, tone: 'neutral', info: '', groups: [] };
  try { notes = notesView(verdictOf(S, brief, { units, limits: P.limits, ...(D ? { totals: D.totals } : {}) }), brief); } catch { /* nothing to judge */ }
  let water: WaterView = { temp: '-', pill: { tone: 'neutral', word: 'none' }, rows: [] };
  try { water = waterView(S, units); } catch { /* ignore */ }
  return { habitat: habitatView(S, units), cost: D ? costView(D) : null, water, notes };
}
