// Where in the tank a species lives (moved from tankfit.ts by lane HB, 2026-10-21, so the stocking engine can read it without an
// import cycle; tankfit re-exports it).
import { CARE } from '../data/care';
import type { Species } from '../data/species';

export type Zone = 'bottom' | 'middle' | 'top' | 'all';
/** The GroupCare fields the engines read (plan-path1-animal-first.md); all optional. */
interface GroupFields { bands?: { ok: number }; zone?: Zone; maxDepthMm?: number; minLengthMm?: number }
export const careOf = (id: string) => CARE[id] as (typeof CARE)[string] & GroupFields | undefined;

/** Recommended minimum group: bands.ok, else the older CARE.group, else 1. */
export const recommendedMin = (id: string) => careOf(id)?.bands?.ok ?? careOf(id)?.group ?? 1;
/** Where in the tank a species lives: GroupCare zone, else bottom / top by the species' own data, else the middle. */
export const zoneOf = (sp: Species): Zone => careOf(sp.id)?.zone ?? (sp.zone === 'bottom' || sp.kind === 'snail' ? 'bottom' : sp.level === 'top' ? 'top' : 'middle');
