// Uploaded background pictures (Nathan 2026-10-14). Scenes hold only a picture's id (render.bgImages[].img), so undo
// snapshots, autosave and share links stay small; the pictures live here, by content hash, and in this browser's
// storage (`tanklook.img.<id>`). A downloaded file carries the pictures it uses in a top-level `images` map, which
// parseScene hands back here (`adoptImages`). Share links do not carry pictures (they would not fit in a link).
import type { BgSide, Scene } from './types';

const KEY = (id: string) => `tanklook.img.${id}`;
const mem = new Map<string, string>();
const ls = (): Storage | undefined => { try { return globalThis.localStorage; } catch { return undefined; } };

/** A picture id: FNV-1a of the data URL, so the same picture uploaded twice is stored once. */
export function imageId(data: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + data.length.toString(36);
}

export const isImageData = (d: unknown): d is string => typeof d === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(d) && d.length < 8e6;

/** Keep a picture (a data URL); returns its id and whether it also reached this browser's storage. */
export function putImage(data: string): { id: string; stored: boolean } {
  const id = imageId(data);
  mem.set(id, data);
  let stored = false;
  try { const st = ls(); if (st) { if (st.getItem(KEY(id)) !== data) st.setItem(KEY(id), data); stored = true; } } catch { /* full or blocked: this visit only */ }
  return { id, stored };
}

/** A picture's data URL, or undefined when this browser does not have it. */
export function getImage(id: string): string | undefined {
  let d = mem.get(id);
  if (d === undefined) { try { d = ls()?.getItem(KEY(id)) ?? undefined; } catch { /* blocked */ } if (d !== undefined) mem.set(id, d); }
  return d;
}

/** Ids of the pictures a scene uses. */
export const sceneImageIds = (scene: Scene) => [...new Set(scene.tanks.flatMap(t => t.render.bgImages.map(b => b.img)))];

/** The scene as a file: with the pictures it uses, so it opens with them on another computer. */
export function withImages(scene: Scene): Scene & { images?: Record<string, string> } {
  const images: Record<string, string> = {};
  for (const id of sceneImageIds(scene)) { const d = getImage(id); if (d) images[id] = d; }
  return Object.keys(images).length ? { ...scene, images } : scene;
}

/** Take in the pictures a file carries (untrusted: data URLs of images only, keyed by their own hash). */
export function adoptImages(images: unknown) {
  if (!images || typeof images !== 'object') return;
  for (const d of Object.values(images as Record<string, unknown>)) if (isImageData(d)) putImage(d);
}

/** Sides round the tank in order; a picture's sides must be next to each other in it (wrapping round). */
const RING: BgSide[] = ['front', 'right', 'back', 'left'];
/** Whether these sides touch one another (one unbroken run round the tank). */
export function sidesTouch(sides: readonly BgSide[]) {
  const on = RING.map(k => sides.includes(k));
  return on.filter((v, i) => v && !on[(i + 3) % 4]).length <= 1;
}

/**
 * A picture read from a file, scaled so its long edge is at most `max` px, as a data URL (JPEG unless it has
 * transparency worth keeping, then PNG).
 */
export async function readPicture(file: File, max = 2048): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; ctx.drawImage(bmp, 0, 0, w, h); bmp.close();
  const png = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
  if (png) { // keep PNG only when some pixel is see-through
    const a = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < a.length; i += 4) if (a[i] < 250) return c.toDataURL('image/png');
  }
  return c.toDataURL('image/jpeg', 0.86);
}
