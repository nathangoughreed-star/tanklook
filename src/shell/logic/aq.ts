// UI2 shell (lane SC): the AqAdvisor row of the Animals section, moved from the old panel. Asked ONLY when someone presses Check (AqAdvisor
// went down twice within an hour of automatic checks, 2026-10-09). Answers kept per tank + stocking here; the proxy caches them 7 days.
import { AQ_PROXY, aqAdvisorUrl, aqKey, aqQuery, aqWaitS, fetchAqHealth, fetchStocking, type AqHealth } from '../../data/aqadvisor';
import { isSalt } from '../../scene/stockEdit';
import type { TankSetup } from '../../scene/types';

const done = new Map<string, number>(), busy = new Set<string>(), err = new Map<string, string>(), queued = new Set<string>();
let up: AqHealth = null, listeners = new Set<() => void>(), timer = 0, poll = 0;
const emit = () => listeners.forEach(f => f());
export const onAq = (f: () => void) => { listeners.add(f); startPoll(); return () => { listeners.delete(f); }; };

async function pollHealth() { const h = await fetchAqHealth(); if (h !== up) { up = h; emit(); } }
function startPoll() {
  if (!AQ_PROXY || poll) return;
  void pollHealth();
  poll = window.setInterval(() => { if (!document.hidden) void pollHealth(); }, 120000);
  addEventListener('focus', () => void pollHealth());
}

export interface AqView { show: boolean; note: string; text: string; bad: boolean; url: string; canCheck: boolean; busy: boolean }
/** What the row shows for this tank (pure of the DOM; reads the module's answers). */
export function aqView(S: TankSetup, state = { done, busy, err, queued, up, proxy: AQ_PROXY, wait: aqWaitS() }): AqView {
  const q = aqQuery(S);
  if (!q) return { show: false, note: isSalt(S) && S.fish.length ? 'AqAdvisor has no saltwater comparison.' : '', text: '', bad: false, url: '', canCheck: false, busy: false };
  const key = aqKey(q), got = state.done.get(key), isBusy = state.busy.has(key);
  const wait = state.queued.has(key) ? (state.wait ? `queued, ~${state.wait} s` : 'queued') : 'checking…';
  const text = got !== undefined ? `${got}% (per AqAdvisor)${got > 100 ? ', overstocked' : ''}`
    : isBusy ? wait : state.proxy && state.up === 'down' ? 'can’t check from here right now; AqAdvisor ↗ still opens it' : state.err.get(key) ?? '';
  const note = [
    q.standIns.length ? `AqAdvisor has no ${q.standIns.map(k => k.name).join(', ')}, so ${q.standIns.length > 1 ? 'they are' : 'it is'} counted as a similar fish: ${q.standIns.map(k => `${k.count} ${k.name} as ${k.as}`).join(', ')}.` : '',
    q.skipped.length ? `Not counted (land animals): ${q.skipped.map(k => `${k.count} ${k.name}`).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  return { show: true, note, text, bad: got !== undefined && got > 100, url: aqAdvisorUrl(q), canCheck: !!state.proxy && got === undefined && state.up === 'up', busy: isBusy };
}

export async function aqCheck(S: TankSetup): Promise<void> {
  const q = aqQuery(S);
  if (!q || !AQ_PROXY) return;
  const key = aqKey(q);
  if (done.has(key) || busy.has(key) || up !== 'up') return;
  busy.add(key); queued.add(key); err.delete(key); emit();
  if (!timer) timer = window.setInterval(() => { emit(); if (!queued.size) { clearInterval(timer); timer = 0; } }, 1000);
  try { done.set(key, await fetchStocking(q, () => { queued.delete(key); emit(); })); }
  catch (e) {
    const m = e instanceof Error ? e.message : '';
    err.set(key, m === 'proxy 429' ? 'busy, try again in a minute' : m === 'proxy 503' ? 'AqAdvisor is resting, try in 10 minutes' : "AqAdvisor didn't answer, try later");
    if (m !== 'proxy 429') void pollHealth();
  }
  queued.delete(key); busy.delete(key); emit();
}
