// Discovery loop metrics (lane AB5, milestone 3). LOCAL ONLY: a small capped event log in localStorage, nothing is sent anywhere. It answers "does the loop work?":
// comparisons by type and outcome, the reasons given, combines, keeps and locks from a card, freezes, history reopen / bring back / set favourite, Make It Yours (and how many rounds it took),
// closing Discover without adopting (and at which round), and the time each comparison took. `?debug` shows the summary (see statsHtml). Pure apart from the storage it is handed.
import type { Outcome, ReasonKey } from '../../scene/discoveryTypes';

export const METRICS_KEY = 'tanklook.abmetrics';
export const METRICS_CAP = 500;
export type MetricEvent =
  | { k: 'open'; t: number; resumed: boolean }
  | { k: 'compare'; t: number; type: string; outcome: Outcome; ms: number; why?: ReasonKey[]; n: number }
  | { k: 'combine'; t: number; tab: string; ok: boolean; n: number }
  | { k: 'keep'; t: number; target: string; locked: boolean; n: number }
  | { k: 'freeze'; t: number; tab: string; n: number }
  | { k: 'thumb'; t: number; attr: string; v: 1 | -1 | 0; n: number }
  | { k: 'rel'; t: number; n: number; attrs: string[] }
  | { k: 'history'; t: number; op: 'open' | 'bringBack' | 'setFavourite' | 'import' }
  | { k: 'miy'; t: number; rounds: number }
  | { k: 'close'; t: number; adopted: boolean; rounds: number };
export type MetricKind = MetricEvent['k'];
interface St { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
const ls = (): St | undefined => { try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; } };

export interface Metrics {
  /** append one event (the log is capped; the oldest go first) */
  log(e: MetricEvent): void;
  all(): MetricEvent[];
  clear(): void;
  /** call when a pair is put on screen: the next comparison's time is measured from here */
  shown(now?: number): void;
  /** milliseconds since the pair was shown (0 when unknown) */
  elapsed(now?: number): number;
}
export function createMetrics(storage: St | undefined = ls(), key: string = METRICS_KEY): Metrics {
  let mem: MetricEvent[] | undefined, at = 0;
  const load = (): MetricEvent[] => {
    if (mem) return mem;
    try { const v = storage?.getItem(key); const j = v ? JSON.parse(v) : []; mem = Array.isArray(j) ? j.filter(e => e && typeof e.k === 'string') : []; } catch { mem = []; }
    return mem!;
  };
  const save = () => { try { storage?.setItem(key, JSON.stringify(mem ?? [])); } catch { /* private mode or full: the log stays in memory */ } };
  return {
    log(e) { const a = load(); a.push(e); if (a.length > METRICS_CAP) a.splice(0, a.length - METRICS_CAP); save(); },
    all: () => [...load()],
    clear() { mem = []; try { storage?.removeItem(key); } catch { /* nothing */ } },
    shown(now = Date.now()) { at = now; },
    elapsed(now = Date.now()) { return at ? Math.max(0, now - at) : 0; },
  };
}

export interface Summary {
  comparisons: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  /** type|outcome pairs, e.g. "champion|A": 7 */
  byTypeOutcome: Record<string, number>;
  reasons: Record<string, number>;
  combines: { total: number; ok: number; refused: number; byTab: Record<string, number> };
  keeps: number; locks: number; freezes: number;
  history: { open: number; bringBack: number; setFavourite: number; import: number };
  makeItYours: number;
  /** comparisons made before each Make It Yours */
  roundsToMakeItYours: number[];
  /** closing Discover without adopting: how many, and the round each happened at */
  abandons: { count: number; atRound: number[] };
  medianMs: number;
  combineRate: number; lockRate: number; abandonRate: number;
}
const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); };

/** The counters the `?debug` view shows. */
export function summarize(events: readonly MetricEvent[]): Summary {
  const o: Summary = { comparisons: 0, byType: {}, byOutcome: {}, byTypeOutcome: {}, reasons: {}, combines: { total: 0, ok: 0, refused: 0, byTab: {} }, keeps: 0, locks: 0, freezes: 0, history: { open: 0, bringBack: 0, setFavourite: 0, import: 0 }, makeItYours: 0, roundsToMakeItYours: [], abandons: { count: 0, atRound: [] }, medianMs: 0, combineRate: 0, lockRate: 0, abandonRate: 0 };
  const ms: number[] = [];
  for (const e of events) {
    switch (e.k) {
      case 'compare': o.comparisons++; bump(o.byType, e.type); bump(o.byOutcome, e.outcome); bump(o.byTypeOutcome, `${e.type}|${e.outcome}`); for (const r of e.why ?? []) bump(o.reasons, r); if (e.ms > 0) ms.push(e.ms); break;
      case 'combine': o.combines.total++; e.ok ? o.combines.ok++ : o.combines.refused++; bump(o.combines.byTab, e.tab); break;
      case 'keep': e.locked ? o.locks++ : o.keeps++; break;
      case 'freeze': o.freezes++; break;
      case 'history': o.history[e.op]++; break;
      case 'miy': o.makeItYours++; o.roundsToMakeItYours.push(e.rounds); break;
      case 'close': if (!e.adopted) { o.abandons.count++; o.abandons.atRound.push(e.rounds); } break;
      default: break;
    }
  }
  o.medianMs = median(ms);
  const n = Math.max(1, o.comparisons), sessions = Math.max(1, o.makeItYours + o.abandons.count);
  o.combineRate = o.combines.ok / n; o.lockRate = (o.keeps + o.locks) / n; o.abandonRate = o.abandons.count / sessions;
  return o;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const list = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)}: ${v}`).join(', ') || 'none yet';
/** "Discovery stats" for `?debug`: plain text in a small panel. Nothing leaves the browser. */
export function statsHtml(s: Summary): string {
  const avg = s.roundsToMakeItYours.length ? (s.roundsToMakeItYours.reduce((a, b) => a + b, 0) / s.roundsToMakeItYours.length).toFixed(1) : 'n/a';
  return `<section class="abstats" aria-label="Discovery stats"><h3>Discovery stats <small>(local, this browser only)</small></h3>
    <p><b>Comparisons</b> ${s.comparisons}; by type: ${list(s.byType)}; by outcome: ${list(s.byOutcome)}. Median time per comparison: ${s.medianMs ? `${(s.medianMs / 1000).toFixed(1)} s` : 'n/a'}.</p>
    <p><b>Reasons given</b> ${list(s.reasons)}</p>
    <p><b>Combines</b> ${s.combines.total} (${s.combines.ok} made, ${s.combines.refused} refused; by tab: ${list(s.combines.byTab)}); combine rate ${pct(s.combineRate)} of comparisons.</p>
    <p><b>Keeps</b> ${s.keeps}, <b>locks</b> ${s.locks} (rate ${pct(s.lockRate)}); <b>freezes</b> ${s.freezes}. <b>History</b> opened ${s.history.open}, brought back ${s.history.bringBack}, set as favourite ${s.history.setFavourite}, parts imported ${s.history.import}.</p>
    <p><b>Make It Yours</b> ${s.makeItYours}; rounds to Make It Yours: ${s.roundsToMakeItYours.join(', ') || 'none yet'} (average ${avg}).</p>
    <p><b>Closed without adopting</b> ${s.abandons.count} (${pct(s.abandonRate)} of finished visits); at round: ${s.abandons.atRound.join(', ') || 'n/a'}.</p>
    <div class="btns"><button type="button" data-act="stats-clear">Clear the log</button></div></section>`;
}
