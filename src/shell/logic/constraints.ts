// UI2 shell step 5 (lane S5, 2026-11-14): the Constraints section as pure view-models + edits (screen map §2a "Section Constraints", §3 "One home per setting").
// No DOM. The homes are P5's / P10's: caps via `capsOf` / `withCaps`, home via `homeOf` / `setHome`, room via `roomTempC` / `withRoomTempC`,
// "No new equipment" = `project.noNewEquipment`, space = `constraints.maxSpace` (setupBrief `setSpace`), experience = demand/experience.ts (per browser).
// Every edit takes a Brief and returns a Brief; the component writes it with `setBrief` (the old UI's own syncCaps / space copy, so the old cost panel reads the same).
import { capsOf, emptyBrief, getItem, homeOf, roomTempC, setHome, setItem, setProjectExtras, projectExtras, withCaps, withRoomTempC, valueOf, HOME_WATERS, type Brief, type HomeWater, type RiskLimit } from '../../scene/brief';
import type { Constraints } from '../../scene/constraints';
import { AREAS, LEVEL_NAME, type Area, type ExperienceState, type Level } from '../../demand/experience';
import { setSpace, spaceOf } from '../../ui/setupBrief';
import type { Units } from '../../scene/types';

export type CapKey = 'startupUsd' | 'monthlyUsd' | 'minutesPerWeek';
export interface CapRow { key: CapKey; label: string; unit: string; value: number | undefined; on: boolean; step: number; placeholder: string }
const CAPS: { key: CapKey; label: string; unit: string; step: number }[] = [
  { key: 'startupUsd', label: 'Set-up budget', unit: '$', step: 10 },
  { key: 'monthlyUsd', label: 'Monthly limit', unit: '$ a month', step: 1 },
  { key: 'minutesPerWeek', label: 'Time per week', unit: 'min', step: 5 },
];
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export interface SpaceView { on: boolean; w: number | undefined; d: number | undefined; unit: 'in' | 'cm'; text: string }
export interface HomeView { roomF: number | undefined; water: HomeWater | undefined; kwh: number | undefined; risk: RiskLimit | undefined; text: string }
export interface ExpRow { area: Area; label: string; level: Level }
export interface ExpView { on: boolean; /** the one answer when every area agrees, else undefined ("mixed") */ one: Level | undefined; rows: ExpRow[]; text: string; off: string }
export interface LimitsModel { money: CapRow[]; noNew: boolean; moneyText: string; space: SpaceView; exp: ExpView; home: HomeView }

export const AREA_LABEL: Record<Area, string> = { fundamentals: 'Tank basics', fish: 'Fish', planted: 'Planted tanks', salt: 'Saltwater', terrarium: 'Terrariums' };
export const WATER_LABEL: Record<HomeWater, string> = { tap: 'Tap water', well: 'Well water', 'bought-ro': 'Bought RO water', 'own-ro': 'My own RO unit' };
export const RISK_OPTS: [RiskLimit, string][] = [['safe', 'Safe only'], ['moderate', 'Some risk is fine'], ['any', 'Any']];
export const OFF_TEXT = 'Off: the difficulty bar uses an average keeper, and nothing is left out for being hard.';
const F = (c: number) => Math.round(c * 9 / 5 + 32), C = (f: number) => Math.round((f - 32) * 5 / 9 * 10) / 10;

export function expView(e: ExperienceState): ExpView {
  const rows = AREAS.map(area => ({ area, label: AREA_LABEL[area], level: e.levels[area] }));
  const same = rows.every(r => r.level === rows[0].level);
  return { on: e.on, one: same ? rows[0].level : undefined, rows, off: OFF_TEXT, text: !e.on ? 'Not counted (average keeper)' : same ? LEVEL_NAME[rows[0].level] : 'Set per area' };
}

export function limitsModel(b: Brief | undefined, units: Units, e: ExperienceState): LimitsModel {
  const c: Constraints = capsOf(b), brief = b ?? emptyBrief();
  const money = CAPS.map(k => { const cap = c[k.key]; return { ...k, value: cap?.value, on: !!cap && cap.on, placeholder: 'no limit' }; });
  const noNew = projectExtras(brief).noNewEquipment === true;
  const sp = spaceOf(brief), gate = valueOf(brief, 'constraints.spaceGate'), k = units === 'in' ? 25.4 : 10, r = (mm: number) => Math.round(mm / k * 10) / 10;
  const space: SpaceView = { on: sp !== undefined && gate !== false, w: sp ? r(sp.w) : undefined, d: sp ? r(sp.d) : undefined, unit: units === 'in' ? 'in' : 'cm',
    text: sp && gate !== false ? `${r(sp.w)} x ${r(sp.d)} ${units === 'in' ? 'in' : 'cm'}` : 'Not set' };
  const h = homeOf(brief), rc = roomTempC(brief);
  const home: HomeView = { roomF: rc === undefined ? undefined : F(rc), water: h.water, kwh: h.kwhUsd, risk: h.risk,
    text: [rc === undefined ? '' : `room ${F(rc)} deg F`, h.water ? WATER_LABEL[h.water].toLowerCase() : '', h.kwhUsd !== undefined ? `$${h.kwhUsd.toFixed(2)}/kWh` : ''].filter(Boolean).join(', ') || 'Not set' };
  const set = money.filter(m => m.value !== undefined && m.on).map(m => m.key === 'startupUsd' ? `${usd(m.value!)} set-up` : m.key === 'monthlyUsd' ? `${usd(m.value!)}/mo` : `${m.value} min/wk`);
  if (noNew) set.push('no new equipment');
  return { money, noNew, moneyText: set.join(', ') || 'No limits set', space, exp: expView(e), home };
}

// ---------- edits: each returns the next Brief ----------
const mutate = (b: Brief | undefined, fn: (c: Constraints) => void): Brief => { const c = structuredClone(capsOf(b)); fn(c); return withCaps(b, c); };
/** Type a limit: a number sets it (kept on), blank / 0 removes it. */
export function setCap(b: Brief | undefined, key: CapKey, value: number | undefined): Brief {
  return mutate(b, c => { if (value === undefined || !Number.isFinite(value) || value <= 0) delete c[key]; else c[key] = { on: c[key]?.on ?? true, value }; });
}
/** The per-limit on / off switch (the old Guardrails): a switched-off limit keeps its number and is not checked. */
export const setCapOn = (b: Brief | undefined, key: CapKey, on: boolean): Brief => mutate(b, c => { const cur = c[key]; if (cur) c[key] = { on, value: cur.value }; });
export const setNoNew = (b: Brief | undefined, on: boolean): Brief => { const base = b ?? emptyBrief(), { noNewEquipment: _o, ...rest } = projectExtras(base); return setProjectExtras(base, on ? { ...rest, noNewEquipment: true } : rest); };
/** Space: width x depth in the display units (blank either = cleared). */
export function setSpaceDims(b: Brief | undefined, w: number | undefined, d: number | undefined, units: Units): Brief {
  const k = units === 'in' ? 25.4 : 10;
  return setSpace(b ?? emptyBrief(), w && d && w > 0 && d > 0 ? { w: Math.round(w * k), d: Math.round(d * k) } : undefined);
}
export const setSpaceOn = (b: Brief | undefined, on: boolean): Brief => setItem(b ?? emptyBrief(), 'constraints.spaceGate', on, 'hard');
export const clearSpace = (b: Brief | undefined): Brief => setSpace(b ?? emptyBrief(), undefined);
export const setRoomF = (b: Brief | undefined, f: number | undefined): Brief => withRoomTempC(b, f === undefined || !Number.isFinite(f) ? undefined : C(f));
export const setWater = (b: Brief | undefined, w: HomeWater | undefined): Brief => setHome(b, { water: w });
export const setKwh = (b: Brief | undefined, v: number | undefined): Brief => setHome(b, { kwhUsd: v !== undefined && Number.isFinite(v) && v > 0 && v < 10 ? Math.round(v * 1000) / 1000 : undefined });
export const setRisk = (b: Brief | undefined, r: RiskLimit | undefined): Brief => setHome(b, { risk: r });
export const WATERS = HOME_WATERS;
export const hasSpaceItem = (b: Brief | undefined): boolean => !!b && !!getItem(b, 'constraints.maxSpace');

// ---------- the one-line links other sections show ("room 70 deg F, edit") ----------
/** Where a limit line elsewhere in the shell links to (lane S6's heater row uses `{ section: 'constraints', group: 'home' }`). */
export type LimitGroup = 'money' | 'space' | 'experience' | 'home' | 'fit';
export const LIMIT_LINK = (group: LimitGroup) => ({ section: 'constraints' as const, group });
export const roomLine = (b: Brief | undefined): string => { const c = roomTempC(b); return c === undefined ? 'room temperature not set' : `room ${F(c)} deg F`; };
