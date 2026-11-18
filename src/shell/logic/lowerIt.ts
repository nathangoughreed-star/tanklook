// R138 (lane PK1, 2026-11-18): "Lower it?": what would cut this build's weekly upkeep time. INFORMATION ONLY: nothing here is a limit, a filter or
// a gate, and nothing is applied. Every figure is the demand engine's own: the build is re-priced with ONE change (a different gear choice, or a
// swap of one animal / plant for a lighter one) and the difference in weekly minutes and set-up dollars is the item. Only what applies is listed:
// a gear row already on its time-saving choice offers nothing; an item that saves under 2.5 min a week is left out. Minutes are shown in 5-min steps.
import type { TankSetup } from '../../scene/types';
import { demandOf, drivers, type UserProfile } from '../../demand';
import { swapsFor } from '../../demand/swaps';
import { choiceOf, optionDef, rowsFor, withChoice } from '../../scene/tech';
import { fmtMin } from '../../units';

export interface LowerItem {
  id: string; kind: 'gear' | 'swap';
  title: string; detail: string;
  /** weekly minutes it saves, rounded to 5 */
  saves: number; savesText: string;
  /** extra set-up dollars (negative = cheaper), and the words for it */
  extraUsd: number; costText: string;
  /** where a gear item lives in the app: the Equipment section */
  section?: 'equipment';
}
const MIN_SAVE = 2.5, usd = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
const costWords = (d: number) => Math.abs(d) < 0.5 ? 'no extra cost' : d > 0 ? `about ${usd(d)} to set up` : `saves about ${usd(d)} to set up`;

export function lowerIt(S: TankSetup, P: UserProfile, max = 8): LowerItem[] {
  const base = demandOf(S, P).totals, out: LowerItem[] = [];
  // 1) gear: every other choice on every row this tank has, one at a time (feeder, water-change hose, auto top-off, a filter that is less work, ...)
  for (const row of rowsFor(S)) {
    const cur = choiceOf(S, row.id);
    for (const o of row.options) {
      if (o.id === cur || o.id === 'none') continue;
      let t; try { t = demandOf({ ...S, tech: withChoice(S, row.id, o.id) }, P).totals; } catch { continue; }
      const saves = base.minPerWeek - t.minPerWeek;
      if (saves < MIN_SAVE) continue;
      const d = optionDef(row.id, o.id), usdDelta = t.setupUsd - base.setupUsd;
      out.push({ id: `gear:${row.id}:${o.id}`, kind: 'gear', title: o.label, detail: (d as { note?: string } | undefined)?.note ?? row.label, saves: Math.max(5, Math.round(saves / 5) * 5), savesText: `saves about ${fmtMin(saves)} a week`, extraUsd: usdDelta, costText: costWords(usdDelta), section: 'equipment' });
    }
  }
  // 2) animals and plants that take the most time: the engine's own best swap for each (a lighter species, or leaving it out)
  try {
    const D = demandOf(S, P);
    for (const r of drivers(D, P, 'minutes', 6)) {
      if (!r.key.startsWith('animal:') && !r.key.startsWith('plant:')) continue;
      const s = swapsFor(S, P, r.key, 'minutes', {}, 1)[0], saves = s ? -s.delta.minutes : 0;
      if (!s || saves < MIN_SAVE) continue;
      const what = r.key.startsWith('plant:') ? 'plants' : 'animals';
      out.push({ id: `swap:${r.key}`, kind: 'swap', title: s.kind === 'remove' ? `Leave out the ${r.label.toLowerCase()}` : `${r.label} to ${s.to}`, detail: s.kind === 'remove' ? `Fewer ${what} to look after.` : `A ${what === 'plants' ? 'hardier, slower-growing plant' : 'tidier, easier animal'} that takes less care.`, saves: Math.max(5, Math.round(saves / 5) * 5), savesText: `saves about ${fmtMin(saves)} a week`, extraUsd: s.delta.setup, costText: costWords(s.delta.setup) });
    }
  } catch { /* no swap to offer */ }
  return out.sort((a, b) => b.saves - a.saves || a.extraUsd - b.extraUsd).slice(0, max);
}
