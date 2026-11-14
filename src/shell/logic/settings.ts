// UI2 shell step 8 (lane S8, 2026-11-13): Settings (screen map §2a: US / Metric, Rules Guided / Sandbox, Graphics, Help, Scene data) as plain data.
// Graphics reuses lane GS1's modules (render/fxPrefs.ts wording + storage, render/perf.ts level) through `graphicsModel`; nothing reads the old DOM.
import type { Scene } from '../../scene/types';
import type { Store } from '../../scene/store';
import { emptyBrief, hasState, rulesOf, setRules, type Rules } from '../../scene/brief';
import { FX_KEYS, FX_LABELS, TONE_NAMES, causticStatus, fxLabel, levelReason } from '../../render/fxPrefs';
import { FX_DEFAULT, type Fx, type FxKey } from '../../render/fx';

export const UNIT_OPTS: [Scene['units'], string][] = [['in', 'US'], ['cm', 'Metric']];
export const UNIT_NOTE: Record<Scene['units'], string> = { in: 'Inches, gallons, °F and pounds everywhere.', cm: 'Centimetres, litres, °C and kilograms everywhere.' };
export const setUnits = (store: Store, u: Scene['units']) => { if (store.scene.units !== u) store.update(s => { s.units = u; }); };

export const RULE_OPTS: [Rules, string][] = [['guided', 'Guided'], ['sandbox', 'Sandbox']];
export const RULE_NOTE: Record<Rules, string> = {
  guided: 'Guided: the pickers gray out animals that would add a Caution or Problem, and Discover keeps to your limits.',
  sandbox: 'Sandbox: add anything by hand; the checks are information only. Discover still keeps animals welfare-safe.',
};
export const rulesNow = (store: Store): Rules => rulesOf(store.tank.brief ?? emptyBrief());
/** Switch the rule set. Changes ONLY that field of the brief (as the old header switch: the design is never touched). */
export function chooseRules(store: Store, r: Rules): boolean {
  if (rulesNow(store) === r) return false;
  store.update(s => {
    const T = s.tanks[s.active], b = setRules(T.brief ?? emptyBrief(), r);
    if (hasState(b)) T.brief = b; else delete T.brief;
  });
  return true;
}

// ---------- Graphics ----------
export interface GfxRow { key: FxKey; label: string; help: string; kind: 'switch' | 'choice'; on: boolean; choice: number; tag: string; locked: boolean }
export interface GfxModel {
  reason: string; showBackToFull: boolean; caustics: { text: string; retry: boolean }; rows: GfxRow[]; tones: string[];
  levelName: string; levels: string[]; level: number; auto: boolean; fps: string;
}
export interface PerfLike { level: number; auto: boolean; fps: number | null; lowered: { from: number; at: number; fps: number | null } | null }
/** Everything the Graphics group shows, from the live state passed in (perf level, fx values, keys the page address locks, the caustic reason). */
export function graphicsModel(perf: PerfLike, levelNames: string[], fx: Fx, locked: readonly string[], causWhy: string): GfxModel {
  const lock = new Set<string>(locked);
  const rows: GfxRow[] = FX_KEYS.map(key => {
    const v = (fx as unknown as Record<string, unknown>)[key], d = (FX_DEFAULT as unknown as Record<string, unknown>)[key];
    const tag = lock.has(key) ? '(set by the page address)' : v === d ? '(default)' : `(default: ${typeof d === 'boolean' ? (d ? 'on' : 'off') : TONE_NAMES[d as number]})`;
    return { key, label: fxLabel(key), help: FX_LABELS[key]?.help ?? '', kind: typeof d === 'number' ? 'choice' : 'switch', on: !!v, choice: typeof v === 'number' ? v : 0, tag, locked: lock.has(key) };
  });
  const c = causticStatus(causWhy);
  return {
    reason: levelReason(perf, levelNames), showBackToFull: !(perf.level === 0 && perf.auto), caustics: { text: c.text, retry: c.retry }, rows, tones: TONE_NAMES,
    levelName: levelNames[perf.level] ?? '', levels: levelNames, level: perf.level, auto: perf.auto, fps: perf.fps == null ? '' : `${Math.round(perf.fps)} fps while moving`,
  };
}

// ---------- Help (the old "How to use", shortened: the gestures) ----------
export const HELP: { title: string; lines: string[] }[] = [
  { title: 'Looking around', lines: ['Drag in the tank to orbit; the wheel or a pinch zooms; a right or middle drag pans.', 'Double-click or Home re-centres the view. View > Straight on puts it back square.'] },
  { title: 'Changing the design', lines: ['Pick things in the sections on the left; the checks along the bottom update as you go.', 'Ctrl+Z undoes, Ctrl+Y redoes, Ctrl+S saves in this browser.'] },
  { title: 'Checks', lines: ['Habitat, Cost, Water and Notes open on the right. They judge the design; they never change it.'] },
];
