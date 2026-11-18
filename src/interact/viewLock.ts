// FS2 (2026-11-17): while the shell's Full screen / Tank only (bare tank) is on, the view is look-only: orbit, pan and zoom, no picking, dragging,
// menus, terrain brush or any edit gesture. fullscreen.tsx sets the flag; pointer.ts reads it.
let locked = false;
export const setViewLocked = (v: boolean) => { locked = v; };
export const viewLocked = () => locked;
