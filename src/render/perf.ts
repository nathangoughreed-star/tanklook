// The Performance setting (lane P1, Nathan 2026-10-19): a per-viewer preference (browser storage, not scene data) that trades picture
// for speed in steps, cheapest look lost first. Level 0 is the picture as designed; each level adds to the one before.
// Auto: while orbiting, when the viewer's motion-time resolution (render/viewer.ts) is already at its lowest and frames still miss
// 30 fps, the level steps down by one; it never steps back up by itself. Moving the slider locks it (auto off) until Auto is ticked again.
export interface PerfLevel { name: string; frostPlain: boolean; ratio: number }
export const LEVELS: PerfLevel[] = [
  { name: 'Full quality', frostPlain: false, ratio: 1 },
  { name: 'Lighter: 75% resolution, plain film', frostPlain: true, ratio: 0.75 },
  { name: 'Light: 50% resolution', frostPlain: true, ratio: 0.5 },
  { name: 'Lightest: 35% resolution', frostPlain: true, ratio: 0.35 },
];
export const MAX_LEVEL = LEVELS.length - 1;
const KEY = 'tanklook.perf';

export const perf = { level: 0, auto: true, fps: null as number | null,
  /** Why the level is below Full quality, when Auto did it (GS1): what it was, when, and the frame rate it saw. Cleared by any manual choice. */
  lowered: null as { from: number; at: number; fps: number | null } | null };
const listeners = new Set<() => void>();
const emit = () => { for (const fn of listeners) fn(); };
export const onPerf = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const levelOf = () => LEVELS[perf.level];

const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ level: perf.level, auto: perf.auto, lowered: perf.lowered })); } catch { /* storage blocked: the setting lasts this visit */ } };
try {
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { level?: number; auto?: boolean; lowered?: typeof perf.lowered } | null;
  if (v) { perf.lowered = v.lowered && typeof v.lowered.at === 'number' ? v.lowered : null; perf.level = Math.max(0, Math.min(MAX_LEVEL, Math.round(+(v.level ?? 0)))); perf.auto = v.auto !== false; }
} catch { /* no saved setting */ }

/** The person moved the slider: that level, locked (auto off). */
export function setLevel(n: number) {
  perf.level = Math.max(0, Math.min(MAX_LEVEL, Math.round(n))); perf.auto = false; perf.lowered = null; save(); emit();
}
export function setAuto(on: boolean) { perf.auto = on; save(); emit(); }
/** The viewer could not hold 30 fps at the lowest motion-time resolution: one level down, auto stays on. */
export function autoStep() { if (!perf.auto || perf.level >= MAX_LEVEL) return false; perf.lowered = { from: perf.lowered?.from ?? perf.level, at: Date.now(), fps: perf.fps }; perf.level++; save(); emit(); return true; }
/** "Back to Full quality" (Graphics settings): level 0 with Auto on again. */
export function backToFull() { perf.level = 0; perf.auto = true; perf.lowered = null; save(); emit(); }
/** Frames per second while the camera moves (the viewer calls this a few times a second). */
export function setFps(v: number) { perf.fps = v; emit(); }
