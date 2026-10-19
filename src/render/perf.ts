// The Performance setting (lane P1, Nathan 2026-10-19): a per-viewer preference (browser storage, not scene data) that trades picture
// for speed in steps, cheapest look lost first. Level 0 is the picture as designed; each level adds to the one before.
// Auto: while orbiting, when the viewer's motion-time resolution (render/viewer.ts) is already at its lowest and frames still miss
// 30 fps, the level steps down by one; it never steps back up by itself. Moving the slider locks it (auto off) until Auto is ticked again.
export interface PerfLevel { name: string; frostPlain: boolean; ratio: number }
export const LEVELS: PerfLevel[] = [
  { name: 'Full quality', frostPlain: false, ratio: 1 },
  { name: 'Plain background film', frostPlain: true, ratio: 1 },
  { name: 'Resolution 75%', frostPlain: true, ratio: 0.75 },
  { name: 'Resolution 50%', frostPlain: true, ratio: 0.5 },
  { name: 'Resolution 35%', frostPlain: true, ratio: 0.35 },
];
export const MAX_LEVEL = LEVELS.length - 1;
const KEY = 'tanklook.perf';

export const perf = { level: 0, auto: true, fps: null as number | null };
const listeners = new Set<() => void>();
const emit = () => { for (const fn of listeners) fn(); };
export const onPerf = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const levelOf = () => LEVELS[perf.level];

const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ level: perf.level, auto: perf.auto })); } catch { /* storage blocked: the setting lasts this visit */ } };
try {
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { level?: number; auto?: boolean } | null;
  if (v) { perf.level = Math.max(0, Math.min(MAX_LEVEL, Math.round(+(v.level ?? 0)))); perf.auto = v.auto !== false; }
} catch { /* no saved setting */ }

/** The person moved the slider: that level, locked (auto off). */
export function setLevel(n: number) {
  perf.level = Math.max(0, Math.min(MAX_LEVEL, Math.round(n))); perf.auto = false; save(); emit();
}
export function setAuto(on: boolean) { perf.auto = on; save(); emit(); }
/** The viewer could not hold 30 fps at the lowest motion-time resolution: one level down, auto stays on. */
export function autoStep(hasFilm = true) {
  if (!perf.auto || perf.level >= MAX_LEVEL) return false;
  perf.level++;
  if (perf.level === 1 && !hasFilm) perf.level++; // no frosted film in this tank: that step would change nothing
  save(); emit(); return true;
}
/** Frames per second while the camera moves (the viewer calls this a few times a second). */
export function setFps(v: number) { perf.fps = v; emit(); }
