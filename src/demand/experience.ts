// Lane P10 (UI2 §7 P10, Nathan 2026-11-13): experience is ONE optional constraint, off by default, with a level per area.
//   Off: nothing is gated by experience; difficulty and losses are worked out for an average keeper ("Some").
//   On:  each area (fundamentals, fish, planted, salt, terrarium) is New to it (0) / Some (1) / Experienced (2). It gates animals, plants and gear.
// Stored once per browser (it describes the person, not the tank). No DOM; storage is injectable so node tests can run it.
import { PLANT_CARE, type Difficulty } from '../data/plantCare';
import { GEAR_CARE } from '../data/gearCare';

export type Area = 'fundamentals' | 'fish' | 'planted' | 'salt' | 'terrarium';
export type Level = 0 | 1 | 2;
export const AREAS: readonly Area[] = ['fundamentals', 'fish', 'planted', 'salt', 'terrarium'];
export const LEVEL_NAME: Record<Level, string> = { 0: 'New to it', 1: 'Some', 2: 'Experienced' };
/** The average keeper the numbers use while the constraint is off. */
export const AVERAGE: Level = 1;

export interface ExperienceState { on: boolean; levels: Record<Area, Level> }
const blank = (l: Level = 0): Record<Area, Level> => ({ fundamentals: l, fish: l, planted: l, salt: l, terrarium: l });
export const defaultExperience = (): ExperienceState => ({ on: false, levels: blank() });

// ---- storage -------------------------------------------------------------------------------------------------------------------------------
export const KEY = 'tanklook.experience';
const PROFILE_KEY = 'tanklook.demand'; // the old profile; its `skill` migrates
type Backend = Pick<Storage, 'getItem' | 'setItem'>;
let backend: Backend | undefined, cache: ExperienceState | undefined, decided = false;
const be = (): Backend | undefined => { if (backend) return backend; try { return typeof localStorage !== 'undefined' ? localStorage : undefined; } catch { return undefined; } };
/** Tests: use this storage (undefined = the browser's) and forget what was read. */
export function useStorage(b?: Backend): void { backend = b; cache = undefined; decided = false; }

const lvl = (v: unknown): Level => v === 1 || v === 2 ? v : 0;
const clean = (j: unknown): ExperienceState | undefined => {
  if (!j || typeof j !== 'object') return undefined;
  const o = j as { on?: unknown; levels?: Record<string, unknown> };
  const levels = blank(); for (const a of AREAS) levels[a] = lvl(o.levels?.[a]);
  return { on: o.on === true, levels };
};

/** Migration from what older versions stored. A saved profile with any non-zero `skill` keeps it and turns the switch on; else a scene's
 *  `preferences.experience` > 0 (or, older still, `layout.expertise` > 1) sets every area and turns it on; else it stays off. */
export function migrate(o: { skill?: Partial<Record<Area, number>>; briefExperience?: number; layoutExpertise?: number }): ExperienceState | undefined {
  if (o.skill && AREAS.some(a => lvl(o.skill![a]) > 0)) { const levels = blank(); for (const a of AREAS) levels[a] = lvl(o.skill[a]); return { on: true, levels }; }
  const e = o.briefExperience !== undefined ? o.briefExperience : o.layoutExpertise !== undefined ? o.layoutExpertise - 1 : 0;
  if (e > 0) return { on: true, levels: blank(lvl(e)) };
  return undefined;
}

function read(): ExperienceState {
  if (cache) return cache;
  const b = be();
  try { const raw = b?.getItem(KEY); const j = raw ? clean(JSON.parse(raw)) : undefined; if (j) { decided = true; return cache = j; } } catch { /* fall through */ }
  let m: ExperienceState | undefined;
  try { const p = JSON.parse(b?.getItem(PROFILE_KEY) ?? 'null') as { skill?: Partial<Record<Area, number>> } | null; m = migrate({ skill: p?.skill }); } catch { /* ignore */ }
  if (m) { cache = m; decided = true; try { b?.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } return m; }
  return cache = defaultExperience();
}
function write(s: ExperienceState): void { cache = s; decided = true; try { be()?.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } listeners.forEach(f => f()); }

const listeners = new Set<() => void>();
/** Call `f` after every change; returns the unsubscribe. */
export function onExperience(f: () => void): () => void { listeners.add(f); return () => listeners.delete(f); }

// ---- reading -------------------------------------------------------------------------------------------------------------------------------
export const getExperience = (): ExperienceState => { const s = read(); return { on: s.on, levels: { ...s.levels } }; };
export const experienceOn = (): boolean => read().on;
/** The level for an area, or null when the constraint is off ("no gate"). */
export function experienceOf(area: Area): Level | null { const s = read(); return s.on ? s.levels[area] : null; }
/** The care level the animal gate compares to (1 beginner .. 3 expert), or null when off. */
export function careGate(area: Area): 1 | 2 | 3 | null { const x = experienceOf(area); return x === null ? null : (x + 1) as 1 | 2 | 3; }
/** The skill the demand engine's UserProfile carries: the real levels when on, an average keeper ("Some") everywhere when off. */
export function profileSkill(): Record<Area, Level> { const s = read(); return s.on ? { ...s.levels } : blank(AVERAGE); }
/** The area a tank's animals fall under. */
export const animalArea = (kind: 'freshwater' | 'saltwater' | 'vivarium' | 'terrarium' | string): Area => kind === 'saltwater' ? 'salt' : kind === 'terrarium' ? 'terrarium' : 'fish';

// ---- writing -------------------------------------------------------------------------------------------------------------------------------
export function setExperienceOn(on: boolean): void { const s = getExperience(); s.on = on; write(s); }
export function setAreaLevel(area: Area, level: Level): void { const s = getExperience(); s.on = true; s.levels[area] = lvl(level); write(s); }
/** "One answer sets every area." `undefined` turns the constraint off (levels kept for when it comes back). */
export function setAllLevels(level: Level | undefined): void {
  const s = getExperience();
  if (level === undefined) s.on = false; else { s.on = true; s.levels = blank(lvl(level)); }
  write(s);
}
/** A scene or an old share link carrying `preferences.experience` / `layout.expertise`: used ONLY while this browser has not decided (one release). */
export function adoptLegacy(o: { briefExperience?: number; layoutExpertise?: number }): boolean {
  read(); if (decided) return false;
  const m = migrate(o); if (!m) return false;
  write(m); return true;
}

// ---- gating: animals, plants, gear ---------------------------------------------------------------------------------------------------------
/** Why this species is out of reach at this care gate, or null (no gate, or it suits). Animals only carry their level in data/care.ts via animalfit; this is the plain compare for lists that have the species' care level. */
export const careWhy = (level: Difficulty, gate: 1 | 2 | 3 | null, what: string): string | null =>
  gate === null || level <= gate ? null : `${what} is rated ${LEVEL_WORD[level]}; you said ${LEVEL_WORD[gate]}`;
const LEVEL_WORD: Record<number, string> = { 1: 'beginner', 2: 'intermediate', 3: 'expert' };

/** Plant (item variant id) keeper difficulty gate: the one-line why, or null. Only when the switch is on; uses the planted area (fundamentals when lower is not mixed in). */
export function plantGated(variant: string, g: 1 | 2 | 3 | null = careGate('planted')): string | null {
  const c = PLANT_CARE[variant]; return c ? careWhy(c.level, g, 'This plant') : null;
}
/** Gear kind (data/gearCare.ts key) gate: the one-line why, or null. Fundamentals decide it; salt-only gear also needs the salt level. */
export function gearGated(kind: string, g: 1 | 2 | 3 | null = careGate('fundamentals')): string | null {
  const c = GEAR_CARE[kind]; return c ? careWhy(c.level, g, 'This gear') : null;
}
/** Keep what an unset-or-off gate lets through: filter a list of species. `levelOf` gives the care level of one. */
export function leaveOutGated<T>(items: readonly T[], levelOf: (x: T) => Difficulty | undefined, area: Area): T[] {
  const g = careGate(area); if (g === null) return [...items];
  return items.filter(x => { const l = levelOf(x); return l === undefined || l <= g; });
}
