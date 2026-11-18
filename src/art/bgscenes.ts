// Picture tank backgrounds (the posters sold for the back glass). BG2 / R126 (Nathan 2026-11-18): the painted scenes read as cartoons,
// so these are real CC0 / public-domain photographs, blurred for depth of field, desaturated, with a dark base and edges, baked by
// scripts/bg2-bake.py into public/art/bg/<file>.jpg. Sources and licences: research/design/backgrounds.md.
export type BgScene = 'reefscene' | 'riverscene' | 'plantscene' | 'rockscene';

/** File (under public/art/bg) and a fill colour used until the photo has loaded (close to its average, so there is no flash). */
export const SCENE_PHOTO: Record<BgScene, { file: string; fill: string }> = {
  reefscene: { file: 'reef.jpg', fill: '#1a2a3a' },
  riverscene: { file: 'river.jpg', fill: '#2c4444' },
  plantscene: { file: 'plant.jpg', fill: '#1a2c1c' },
  rockscene: { file: 'rock.jpg', fill: '#2a2c2e' },
};

const photos = new Map<BgScene, HTMLImageElement>();
/** The photo for a scene, loading it on first use; `onLoad` fires once it is ready (immediately-ready photos return complete). */
export function scenePhoto(kind: BgScene, onLoad: () => void): HTMLImageElement {
  let img = photos.get(kind);
  if (!img) {
    img = new Image(); img.decoding = 'async';
    img.src = `${import.meta.env?.BASE_URL ?? './'}art/bg/${SCENE_PHOTO[kind].file}`;
    photos.set(kind, img);
  }
  if (!(img.complete && img.naturalWidth)) img.addEventListener('load', onLoad, { once: true });
  return img;
}

/** Cover-fit the photo on the sheet (crops the middle; a wide tank crops top and bottom). */
export function drawScene(ctx: CanvasRenderingContext2D, kind: BgScene, w: number, h: number, img: HTMLImageElement | null) {
  ctx.fillStyle = SCENE_PHOTO[kind].fill; ctx.fillRect(0, 0, w, h);
  if (!img || !img.naturalWidth) return;
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}
