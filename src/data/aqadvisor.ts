// AqAdvisor (aqadvisor.com) stocking level. AqAdvisor has no API; its calculator is a GET form whose whole state fits in
// one URL: tank size plus `AlreadySelected` = "<species id>:<count>::,...". The ids come from
// scripts/aqadvisor-ids.py (src/data/aqadvisor.json). The site is http-only and sends no CORS headers, so the page
// asks a small proxy (worker/aqadvisor-proxy.js, a Cloudflare Worker) for the percentage, and always offers the
// same calculation on aqadvisor.com as a link.
import ids from './aqadvisor.json';
import { getSpecies } from './species';
import { footprint } from '../scene/shape';
import type { TankSetup } from '../scene/types';

/** The proxy (Cloudflare Worker), from VITE_AQ_PROXY in .env.production, e.g. 'https://tanklook-aq.<account>.workers.dev';
 *  worker/dev.mjs serves it locally. Unset = link to aqadvisor.com only. */
export const AQ_PROXY: string = (import.meta.env?.VITE_AQ_PROXY ?? '').replace(/\/$/, '');

/** standIn: not in AqAdvisor, counted as a similar animal in size and type (Nathan 2026-10-09). */
const AQ_IDS = ids as Record<string, { aq: string; name: string; standIn?: boolean }>;
const IN = 25.4;

export interface AqQuery {
  /** AlreadySelected value, species in a stable order. */
  sel: string;
  /** Tank as AqAdvisor's box, inches: true length and height, depth = floor area / length, so the box has the tank's
   *  real bottom area (what AqAdvisor's stocking depends on) and, with the true height, its volume. */
  l: number; d: number; h: number;
  /** Animals with no AqAdvisor entry and no stand-in (land-only frogs), with counts. */
  skipped: { name: string; count: number }[];
  /** Animals counted as a similar AqAdvisor species: name, the stand-in's common name, count. */
  standIns: { name: string; as: string; count: number }[];
  /** Fish counted. */
  counted: number;
}

/** The stocking request for one tank, or null when there is nothing to ask (dry tank or no aquatic animals). */
export function aqQuery(s: TankSetup): AqQuery | null {
  if (!s.water.on) return null;
  const counts = new Map<string, number>();
  for (const f of s.fish) counts.set(f.species, (counts.get(f.species) ?? 0) + 1);
  const parts: string[] = [], skipped: AqQuery['skipped'] = [], standIns: AqQuery['standIns'] = [];
  let counted = 0;
  for (const [sp, n] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    const m = AQ_IDS[sp];
    if (m) {
      parts.push(`${m.aq}:${n}::`); counted += n;
      if (m.standIn) standIns.push({ name: getSpecies(sp)?.name ?? sp, as: m.name.replace(/ \(.*$/, ''), count: n });
    }
    else skipped.push({ name: getSpecies(sp)?.name ?? sp, count: n });
  }
  if (!parts.length) return null;
  const T = s.tank, r = (mm: number) => Math.round(mm / IN * 10) / 10;
  return { sel: parts.join(','), l: r(T.L), d: r(footprint(T).area / T.L), h: r(T.H), skipped, standIns, counted };
}

/** Same request, as a key: equal keys = same answer. */
export const aqKey = (q: AqQuery) => `${q.sel}|${q.l}|${q.d}|${q.h}`;

/** The calculator on aqadvisor.com, filled in with this tank (opens their full results page). */
export function aqAdvisorUrl(q: AqQuery) {
  return 'http://aqadvisor.com/AqAdvisor.php?' + new URLSearchParams({
    AquListBoxTank: 'User Defined', AquTankLength: String(q.l), AquTankDepth: String(q.d), AquTankHeight: String(q.h),
    AquListBoxFilter: 'Choose', AquListBoxFilter2: 'Choose', FormSubmit: 'Update', AlreadySelected: q.sel,
    FilterMode: 'Display all species', AqTempUnit: 'C', AqVolUnit: 'gUS', AqLengthUnit: 'inch', AqSortType: 'cname',
    AqSpeciesWindowSize: 'short', AqSearchMode: 'simple',
  });
}

/** Gap after an answer that reached aqadvisor.com before the page asks for the next one: matches the proxy's
 *  2 new requests a minute, so a queue of tanks waits instead of getting "busy". */
export const AQ_GAP_MS = 30000;
let aqChain: Promise<unknown> = Promise.resolve(), aqNextAt = 0;
/** Seconds until the queue's 30 s gap is over (0 = none, or still behind a request in flight). */
export const aqWaitS = () => Math.max(0, Math.ceil((aqNextAt - Date.now()) / 1000));

/** Stocking level in percent from the proxy. Requests go one at a time (never two at once, 2026-10-09), and after a
 *  fresh (uncached) answer the next waits AQ_GAP_MS. Throws when there is no proxy or it fails; 'proxy 503' = the
 *  proxy's breaker is resting after a failure. onStart: called when this request leaves the queue. */
export function fetchStocking(q: AqQuery, onStart?: () => void, timeoutMs = 12000): Promise<number> {
  const run = async () => {
    if (!AQ_PROXY) throw new Error('no proxy');
    const wait = aqNextAt - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    onStart?.();
    const p = new URLSearchParams({ sel: q.sel, l: String(q.l), d: String(q.d), h: String(q.h) });
    const res = await fetch(`${AQ_PROXY}/stocking?${p}`, { signal: AbortSignal.timeout(timeoutMs) });
    const j = await res.json().catch(() => ({})) as { stocking?: number; cached?: boolean };
    if (!j.cached) aqNextAt = Date.now() + AQ_GAP_MS; // a miss (or failure) touched aqadvisor.com
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    if (typeof j.stocking !== 'number') throw new Error('no result');
    return j.stocking;
  };
  const p = aqChain.then(run, run);
  aqChain = p.catch(() => {});
  return p;
}
