// Discovery v2, lane AB5: the quick-preferences hand-off. Lane AB6 will export `readQuickPrefs(brief)` from src/scene/quickPrefs.ts; until it lands, this adapter reads the same SHAPE from one brief item
// (`discovery.quickPrefs`, set by hand for the acceptance demo). Swap the body of `quickPrefsOf` for AB6's reader when it merges; nothing else changes.
// Strength decides what a value is: only 'hard' answers (Definitely, Don't want) FILTER candidates; every other answer only RANKS them (a "prefer medium" project can still see a large tank when it fits well).
import { getItem, type Brief } from './brief';
export interface QuickPrefs {
  /** the habitat picked at Start New, when the person made it a requirement (hard) */
  world?: 'freshwater' | 'saltwater' | 'terrarium' | 'vivarium';
  sizeGal?: { lo: number; hi: number; strength?: 'hard' | 'prefer' };
  plants?: 'require' | 'prefer' | 'avoid';
  /** ids the engine can filter or rank: 'co2' (no injected CO2), 'snails', 'shrimp', 'plants' ... */
  avoid?: string[];
  look?: Record<string, number>;
}
/** Interim (until AB6 lands): set the preferences in memory, for the acceptance demo and tests. A brief item with an unknown id is dropped by the brief's own sanitising, so this does not go through the brief. */
const G = globalThis as unknown as { __abPrefs?: QuickPrefs };   // on globalThis: a dev-server module reloaded with a new timestamp must not lose it
export const holdQuickPrefs = (p: QuickPrefs | undefined) => { G.__abPrefs = p; };
export function quickPrefsOf(b: Brief): QuickPrefs | undefined {
  if (G.__abPrefs) return G.__abPrefs;
  const v = (getItem(b, 'discovery.quickPrefs' as never) as { value?: unknown } | undefined)?.value as QuickPrefs | undefined;
  return v && typeof v === 'object' ? v : undefined;
}
