// Graphics settings storage and wording (lane GS1, Nathan 2026-11-12: "not a black box"). The visual-effect switches in
// render/fx.ts are per viewer: this file keeps the person's choices in browser storage (like render/perf.ts), applies them
// at start, and words what the caustic motion is doing. A `?fx=` page address still wins for the keys it names.
import { FX, FX_DEFAULT, parseFx, setFx, type Fx, type FxKey } from './fx';

const KEY = 'tanklook.fx';
export const FX_KEYS = Object.keys(FX_DEFAULT) as FxKey[];

/** Plain-words label and help for each switch. A key missing here still shows (under its own name), so new effects need no edit here. */
export const FX_LABELS: Record<string, { label: string; help: string }> = {
  tonemap: { label: 'Tone mapping', help: 'How bright light is squeezed into the screen: keeps lit glass, water and the light from burning out to white.' },
  variety: { label: 'Plant variety', help: 'Every plant and leaf is a little different in size, tilt and colour.' },
  ground: { label: 'Substrate patterning', help: 'Patches of colour, scattered flecks and coarse grains by the rocks and wood.' },
  contact: { label: 'Contact shadows', help: 'Soft shadows where rock, wood and plants touch the substrate.' },
  caustics: { label: 'Caustics', help: 'The moving ripple of light on surfaces that face up, under the water.' },
  depth: { label: 'Water depth tint', help: 'Things further from the front glass take on the water colour.' },
  waterline: { label: 'Water-surface band', help: 'The bright band and curved edge at the water surface, and the front pane\'s reflection.' },
  embed: { label: 'Rocks and wood sunk into the substrate', help: 'Hardscape sits down in the bed with a small berm and spilled grains round its base, instead of resting on top.' },
  mix: { label: 'Mixed grain sizes', help: 'Coarse and fine grains sort into the hollows and by the feet of rocks, each grain a slightly different colour.' },
  sand: { label: 'Sand detail texture', help: 'A fine speckled layer on painted sand, so it reads as sand up close.' },
};
export const TONE_NAMES = ['None', 'AgX', 'ACES'];
export const fxLabel = (k: string) => FX_LABELS[k]?.label ?? k;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const store = (): Store | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** The keys a `?fx=` string names (its value wins over the saved choice): the ones that come out the same from two opposite starting points. */
export function urlKeys(q: string | null | undefined): FxKey[] {
  if (!q) return [];
  const a = parseFx(q, Object.fromEntries(FX_KEYS.map(k => [k, typeof FX_DEFAULT[k] === 'number' ? 0 : false])) as unknown as Fx);
  const b = parseFx(q, Object.fromEntries(FX_KEYS.map(k => [k, typeof FX_DEFAULT[k] === 'number' ? 1 : true])) as unknown as Fx);
  return FX_KEYS.filter(k => a[k] === b[k]);
}

/** Saved choices: only keys the person changed, only valid values. */
export function readPrefs(st: Store | null = store()): Partial<Fx> {
  const out: Record<string, unknown> = {};
  try {
    const v = JSON.parse(st?.getItem(KEY) ?? 'null') as Record<string, unknown> | null;
    if (v && typeof v === 'object') for (const k of FX_KEYS) {
      const d = FX_DEFAULT[k], x = v[k];
      if (typeof d === 'boolean' && typeof x === 'boolean') out[k] = x;
      else if (typeof d === 'number' && typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 2) out[k] = x;
    }
  } catch { /* nothing saved */ }
  return out as Partial<Fx>;
}
/** Keeps only the values that differ from the shipped default (so a later default change still reaches people who never touched the switch). */
export function writePrefs(p: Partial<Fx>, st: Store | null = store()) {
  const o: Record<string, unknown> = {};
  for (const k of FX_KEYS) if (p[k] !== undefined && p[k] !== FX_DEFAULT[k]) o[k] = p[k];
  try { if (Object.keys(o).length) st?.setItem(KEY, JSON.stringify(o)); else st?.removeItem(KEY); } catch { /* storage blocked: lasts this visit */ }
}

let saved: Partial<Fx> = {};
const fromPage = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('fx'); } catch { return null; } };
export const lockedByUrl = (): FxKey[] => urlKeys(fromPage());

/** Apply saved choices over the defaults (the page address wins for the keys it names). Call once at start. */
export function applySavedFx() {
  saved = readPrefs();
  const lock = new Set(lockedByUrl());
  const patch: Partial<Fx> = {};
  for (const k of FX_KEYS) if (saved[k] !== undefined && !lock.has(k)) (patch as Record<string, unknown>)[k] = saved[k];
  setFx(patch);
}
/** The person changed a switch: apply live and keep it. */
export function chooseFx(patch: Partial<Fx>) { saved = { ...saved, ...patch }; writePrefs(saved); setFx(patch); }
/** Restore defaults: forget every saved choice. Keys named by the page address keep that value. */
export function restoreFxDefaults() {
  saved = {}; writePrefs({});
  const lock = new Set(lockedByUrl()), patch: Partial<Fx> = {};
  for (const k of FX_KEYS) if (!lock.has(k)) (patch as Record<string, unknown>)[k] = FX_DEFAULT[k];
  setFx(patch);
}
export const isDefault = (k: FxKey) => FX[k] === FX_DEFAULT[k];

/** What the caustic motion is doing, in words (`why` is Viewer.causState().why). `retry` = a "Try again" is offered. */
export function causticStatus(why: string, idleSeconds = 60): { text: string; retry: boolean; full: boolean } {
  switch (why) {
    case 'moving': return { text: 'Caustics: moving.', retry: false, full: false };
    case 'still: idle': return { text: `Caustics: paused, no input for ${idleSeconds} s. They move again when you move the mouse.`, retry: false, full: false };
    case 'still: performance level': return { text: 'Caustics: still, because the quality level is not Full quality.', retry: false, full: true };
    case 'still: slow machine': return { text: 'Caustics: still, because this machine is slow (it could not keep up).', retry: true, full: false };
    case 'off': return { text: 'Caustics: off.', retry: false, full: false };
    default: return { text: `Caustics: ${why}.`, retry: false, full: false };
  }
}

/** Why the quality level is where it is, in words. */
export function levelReason(p: { level: number; auto: boolean; lowered: { from: number; at: number; fps: number | null } | null }, names: string[], now = new Date()): string {
  if (p.lowered && p.level > 0) {
    const when = new Date(p.lowered.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const fps = p.lowered.fps != null ? `frames missed 30 fps (${Math.round(p.lowered.fps)} fps)` : 'frames missed 30 fps';
    return `Auto lowered this from ${names[p.lowered.from] ?? 'Full quality'} on ${when} because ${fps}. It never goes back up by itself.`;
  }
  void now;
  if (p.level === 0) return p.auto ? 'Full quality. Auto will lower it if frames miss 30 fps while you orbit.' : 'Full quality (locked: Auto is off).';
  return 'You chose this level; Auto is off.';
}
