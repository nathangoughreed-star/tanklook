// UI2 shell step 8 (lane S8, 2026-11-13): the View popover's view-model (screen map §2a "Viewer cluster", decision 9): camera presets and
// sliders, the Show switches, the viewpoint-map switch (off by default), Export PNG and "Another moment". Pure: storage and the store are passed in.
import type { CameraSettings, Scene } from '../../scene/types';
import type { Store } from '../../scene/store';
import { LIMITS } from '../../scene/validate';
import { shuffleFish } from '../../scene/scatter';
import { rng } from '../../art/paint';

export interface CamPreset { id: string; label: string; cam: Partial<CameraSettings> }
/** Camera presets (the old View menu's "Straight on" and "Look from above", plus the two sides). */
export const CAM_PRESETS: CamPreset[] = [
  { id: 'front', label: 'Straight on', cam: { az: 0, el: 0, zoom: 1 } },
  { id: 'above', label: 'From above', cam: { az: 0, el: LIMITS.el[1] } },
  { id: 'left', label: 'From the left', cam: { az: -70, el: 8 } },
  { id: 'right', label: 'From the right', cam: { az: 70, el: 8 } },
];
export const presetOf = (id: string) => CAM_PRESETS.find(p => p.id === id);
/** The preset the camera is on now (null when it is somewhere else). */
export const presetNow = (c: CameraSettings): string | null => CAM_PRESETS.find(p => Object.entries(p.cam).every(([k, v]) => Math.round((c as unknown as Record<string, number>)[k]) === Math.round(v as number)))?.id ?? null;

export interface CamSlider { key: keyof CameraSettings; label: string; min: number; max: number; step: number; unit: string }
export const CAM_SLIDERS: CamSlider[] = [
  { key: 'az', label: 'Left / right', min: LIMITS.az[0], max: LIMITS.az[1], step: 1, unit: '°' },
  { key: 'el', label: 'From above', min: LIMITS.el[0], max: LIMITS.el[1], step: 1, unit: '°' },
  { key: 'dist', label: 'Distance', min: LIMITS.dist[0], max: LIMITS.dist[1], step: 10, unit: '' },
  { key: 'zoom', label: 'Zoom', min: 0.1, max: LIMITS.zoom[1], step: 0.05, unit: '×' },
];
/** A slider's readout: distance in the scene's units, the rest as the old readouts (degrees, ×). */
export function camReadout(k: keyof CameraSettings, v: number, units: Scene['units']): string {
  if (k === 'dist') return units === 'in' ? `${Math.round(v / 25.4 / 12 * 10) / 10} ft` : `${Math.round(v / 10) / 100} m`;
  if (k === 'zoom') return `${Math.round(v * 100) / 100}×`;
  return `${Math.round(v)}°`;
}

// ---------- Show switches ----------
export type ShowId = 'fish' | 'plants' | 'hardscape' | 'gear';
export const SHOWS: { id: ShowId; label: string; title: string }[] = [
  { id: 'fish', label: 'Animals', title: 'Fish, shrimp, snails and the rest' },
  { id: 'plants', label: 'Plants', title: 'Plants and corals' },
  { id: 'hardscape', label: 'Hardscape', title: 'Rock, wood and caves' },
  { id: 'gear', label: 'Equipment', title: 'The filter, heater, CO2 and other gear drawn in the tank (PNG exports follow it)' },
];
/** Keys the old shell stored, shared on purpose so a person's choices carry over. */
export const KEYS = { hide: 'tanklook.hide', map: 'tanklook.ui2.viewmap', hideLight: 'tanklook.hidelight' } as const;
type Mem = Pick<Storage, 'getItem' | 'setItem'>;
const mem = (): Mem | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const HIDABLE = ['fish', 'plants', 'hardscape'] as const;
export const parseHidden = (raw: string | null | undefined): Set<(typeof HIDABLE)[number]> => {
  try { const v = JSON.parse(raw ?? '[]'); return new Set(Array.isArray(v) ? v.filter((x): x is (typeof HIDABLE)[number] => (HIDABLE as readonly string[]).includes(x)) : []); } catch { return new Set(); }
};
export const loadHidden = (st: Mem | null = mem()) => { try { return parseHidden(st?.getItem(KEYS.hide)); } catch { return parseHidden(null); } };
export const saveHidden = (h: Iterable<string>, st: Mem | null = mem()) => { try { st?.setItem(KEYS.hide, JSON.stringify([...h])); } catch { /* storage blocked: lasts this visit */ } };

// ---------- the viewpoint map: a switch, off by default (decision 9) ----------
export const loadMap = (st: Mem | null = mem()): boolean => { try { return st?.getItem(KEYS.map) === 'on'; } catch { return false; } };
export const saveMap = (on: boolean, st: Mem | null = mem()) => { try { st?.setItem(KEYS.map, on ? 'on' : 'off'); } catch { /* lasts this visit */ } };

// ---------- Export PNG ----------
export const PNG_SIZES = [1, 2, 4] as const;
export const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank';
export const pngName = (sceneName: string, mult: number) => `${slug(sceneName)}-${mult}x.png`;
/** The button's tooltip: the picture's pixel size at this view size and pixel ratio. */
export const pngTitle = (w: number, h: number, ratio: number, mult: number) => `${Math.round(w * ratio * mult)} × ${Math.round(h * ratio * mult)} px`;

// ---------- Another moment ----------
/** Every animal in a new spot (plants and scape stay). False when there are no animals. One undo step, as the old button. */
export function anotherMoment(store: Store, seed = Math.random() * 1e9, addPct = 100): boolean {
  if (!store.tank.fish.length) return false;
  store.edit(s => shuffleFish(s, rng(seed), undefined, addPct));
  return true;
}
