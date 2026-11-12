// Visual-fidelity switches (plan VF, research: prompts/plan-VF-visual-fidelity.md). One flag per effect so each can be
// compared and dropped on its own:
//   caustics  moving light pattern on surfaces facing up under water (render/caustics.ts, lighting.ts aqPatch)
//   depth     colour shifts toward the water hue with distance from the front glass (aqPatch)
//   contact   soft contact shadows under hardscape and plants (render/contact.ts, lane VF-C)
//   ground    substrate colour patches, clustered flecks, coarse grains by the hardscape (render/grains.ts, lane VF-C)
//   tonemap   0 = none (the clamp the app always had), 1 = AgX, 2 = ACES (aqPatch, every lit material)
//   variety   per-plant / per-leaf variation (render/plant3d.ts, lane VF-B)
//   embed     hardscape sunk into the bed, a berm and spilled grains round its base, a wet ring (render/contact.ts, lane VF-C2)
//   mix       mixed grain sizes sorted by hollow / foot, per-grain colour variation (render/grains.ts, scatter.ts, lane VF-C2)
//   sand      a fine detail layer in the painted-only sand tiles (render/textures.ts, lane VF-C2)
//   waterline the bright band and meniscus at the water surface, and the front pane's reflection (lighting.ts, items.ts)
// Set from the page address: `?fx=caustics,depth,tonemap` (on), `?fx=tonemap:aces`, `?fx=-caustics` (off), `?fx=none`.
// Shader effects read uniforms (FXU, shared by every lit program): switching them never recompiles. Build-time effects
// (contact, ground, variety) are read when the scene is built; a change calls the listeners (the viewer rebuilds).
// Dev server: `window.__fx` (get / set) for the A/B scripts (scripts/vf-shots.mjs).
export type FxKey = 'caustics' | 'depth' | 'contact' | 'ground' | 'tonemap' | 'variety' | 'waterline' | 'embed' | 'mix' | 'sand';
export interface Fx { caustics: boolean; depth: boolean; contact: boolean; ground: boolean; tonemap: 0 | 1 | 2; variety: boolean; waterline: boolean; embed: boolean; mix: boolean; sand: boolean }

/** What ships (each switches on once Nathan has seen it and said yes; variety on: Nathan 2026-11-11, lane VF-B; tonemap ACES and caustics (animated), depth and waterline: Nathan 2026-11-12, lane VF-A; contact and ground: Nathan 2026-11-12, lane VF-C; embed: Nathan 2026-11-12 blind test, lane VF-C2). */
export const FX_DEFAULT: Readonly<Fx> = { caustics: true, depth: true, contact: true, ground: true, tonemap: 2, variety: true, waterline: true, embed: true, mix: false, sand: false };

const TONE: Record<string, 0 | 1 | 2> = { none: 0, off: 0, agx: 1, aces: 2 };

/** Parses `?fx=` (the comma list above) over the defaults. Unknown names are ignored. */
export function parseFx(q: string | null | undefined, base: Fx = { ...FX_DEFAULT }): Fx {
  const fx = { ...base };
  if (!q) return fx;
  for (const raw of q.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
    if (raw === 'none') { Object.assign(fx, { caustics: false, depth: false, contact: false, ground: false, tonemap: 0, variety: false, waterline: false, embed: true, mix: false, sand: false }); continue; }
    if (raw === 'all') { Object.assign(fx, { caustics: true, depth: true, contact: true, ground: true, tonemap: fx.tonemap || 1, variety: true, waterline: true, embed: true, mix: true, sand: true }); continue; }
    const off = raw.startsWith('-'), [k, v] = raw.replace(/^[-+]/, '').split(/[:=]/);
    if (k === 'tonemap') fx.tonemap = off ? 0 : v != null ? TONE[v] ?? 1 : 1;
    else if (k === 'agx' || k === 'aces') fx.tonemap = off ? 0 : TONE[k];
    else if (k in fx) (fx as unknown as Record<string, boolean>)[k] = !off;
  }
  return fx;
}

const fromPage = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('fx'); } catch { return null; } };

/** The current switches. Read it; change it only through setFx. */
export const FX: Fx = parseFx(fromPage());

/** Uniforms for the shader effects, merged into every lit program (render/lighting.ts aqPatch). */
export const FXU = {
  uFxTone: { value: FX.tonemap as number },
  uFxCaus: { value: FX.caustics ? 1 : 0 },
  uFxDepth: { value: FX.depth ? 1 : 0 },
  uFxLine: { value: FX.waterline ? 1 : 0 },
  /** Caustic clock, seconds (render/viewer.ts advances it while caustics are on; `freezeFx` holds it for the A/B scripts). */
  uFxTime: { value: 0 },
};
/** A fixed caustic time (s) for repeatable pictures and A/B frames, or null to let it run. */
export const fxClock = { frozen: null as number | null };
/** Advance the caustic clock to `ms` (performance.now) unless frozen; true when the value changed. */
export function tickFx(ms: number) {
  const t = fxClock.frozen ?? ms / 1000;
  if (t === FXU.uFxTime.value) return false;
  FXU.uFxTime.value = t; return true;
}
const syncU = () => { FXU.uFxTone.value = FX.tonemap; FXU.uFxCaus.value = FX.caustics ? 1 : 0; FXU.uFxDepth.value = FX.depth ? 1 : 0; FXU.uFxLine.value = FX.waterline ? 1 : 0; };

const listeners = new Set<(fx: Fx, changed: FxKey[]) => void>();
/** Called after a change, with the keys that changed (build-time effects: rebuild; shader ones: just redraw). */
export function onFx(f: (fx: Fx, changed: FxKey[]) => void) { listeners.add(f); return () => listeners.delete(f); }

export function setFx(patch: Partial<Fx>) {
  const changed = (Object.keys(patch) as FxKey[]).filter(k => patch[k] !== undefined && patch[k] !== FX[k]);
  if (!changed.length) return;
  Object.assign(FX, patch); syncU();
  for (const f of listeners) f(FX, changed);
}

if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __fx: unknown }).__fx = { get: () => ({ ...FX }), set: setFx, parse: parseFx, time: (t: number | null) => { fxClock.frozen = t; if (t != null) FXU.uFxTime.value = t; for (const f of listeners) f(FX, []); } };
