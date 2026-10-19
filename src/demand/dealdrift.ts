// Has the user changed a part a starting price covers? (2026-10-19) A bundle's price holds only while the tank, stand, lid,
// light, filter and heater it includes are the ones it came with; a preset tank's sale price only while the tank is that size.
import { choiceOf } from '../scene/tech';
import type { TankSetup } from '../scene/types';

export type PricedPart = 'tank' | 'stand' | 'lid' | 'light' | 'filter' | 'heater';
export const PART_NAME: Record<PricedPart, string> = { tank: 'tank size', stand: 'stand', lid: 'lid', light: 'light', filter: 'filter', heater: 'heater' };
export type PartSig = Partial<Record<PricedPart, unknown[]>>;

/** "not chosen by hand": a filter or heater the tank still infers stays the bundle's own */
const ANY = '*';
const mm = (v: unknown) => (typeof v === 'number' ? Math.round(v) : v ?? null);
const SIG: Record<PricedPart, (S: TankSetup, base: boolean) => unknown[]> = {
  tank: S => { const t = S.tank as unknown as Record<string, unknown>; return Object.keys(t).sort().map(k => `${k}:${mm(t[k])}`); },
  stand: S => [S.stand.show, S.stand.style, S.stand.finish],
  lid: S => [S.lid],
  light: S => [S.light.type, S.light.tech ?? null, S.light.count, mm(S.light.watts), mm(S.light.bulbW)],
  filter: (S, base) => [base ? choiceOf(S, 'filter') : S.tech?.rows.filter ?? ANY, S.tech?.filterModel ?? null],
  heater: (S, base) => [base ? choiceOf(S, 'heater') : S.tech?.rows.heater ?? ANY, S.tech?.heaterW ?? null],
};

/** The baseline fingerprint of each part in `parts` (unknown part names, e.g. 'substrate', are skipped). */
export function partSig(S: TankSetup, parts: readonly string[]): PartSig {
  const out: PartSig = {};
  for (const p of parts) if (p in SIG) out[p as PricedPart] = SIG[p as PricedPart](S, true);
  return out;
}

/** The parts of `base` the tank no longer matches, in the order base lists them. */
export const changedParts = (base: PartSig, S: TankSetup): PricedPart[] =>
  (Object.keys(base) as PricedPart[]).filter(p => {
    const now = SIG[p](S, false), was = base[p]!;
    return now.some((v, k) => v !== ANY && JSON.stringify(v) !== JSON.stringify(was[k]));
  });

/** "tank size", "tank size and light", "tank size, light and filter" */
export const partList = (ps: PricedPart[]) => {
  const n = ps.map(p => PART_NAME[p]);
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};
