// FS2 (2026-11-17): while the shell's Full screen / Tank only (bare tank) is on, the view is look-only: orbit, pan and zoom, no picking, dragging,
// menus, terrain brush or any edit gesture. fullscreen.tsx sets the flag; pointer.ts reads it.
let locked = false;
export const setViewLocked = (v: boolean) => { locked = v; };
export const viewLocked = () => locked;

// BR2: Watch mode (R158) = the bare tank plus a screen wake lock. The shell (watch.ts) sets this; pointer.ts reads it so a tap on open water leaves Watch instead of startling the fish.
let watching = false;
export const setWatching = (v: boolean) => { watching = v; };
export const isWatching = () => watching;
/** A tap (under 4 px of travel) on an animal in the tank asks the shell to show its label; on open water in Watch mode it asks to leave. */
export const FISH_TAP = 'tl-fish-tap', WATCH_EXIT = 'tl-watch-exit';
