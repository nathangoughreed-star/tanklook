/**
 * Build-B fish art on demand (lane FD, 2026-11-25). Boot used to await all 221 images (6.1 MB) before the shell appeared; now the shell
 * and the viewer start at once and only the live species a scene holds are fetched, in parallel, with the viewer's first build held for
 * them (`Viewer.holdBuild`, with a timeout that falls back to the old model). The rest load on idle, and a fish added later loads when
 * it is added. goLive (species.ts) swaps a species' art once its images are in; a species whose images fail keeps its old look.
 */
import fishLive from '../data/fishLive.json';
import { getSpecies, goLive } from '../data/species';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';

const LIVE = fishLive.live as Record<string, { look: string }>;
const swapped = new Set<string>();
const photofish = () => import('./photofish');

/** Loads the build-B art for the live species among `ids` (all of them if `ids` is undefined) and swaps them in. Resolves to the species ids that changed look. */
export async function ensureLive(ids?: Iterable<string>): Promise<string[]> {
  const want = [...new Set(ids ?? Object.keys(LIVE))].filter(id => LIVE[id] && !swapped.has(id));
  if (!want.length) return [];
  const arts = new Map(want.map(id => [id, getSpecies(LIVE[id].look)?.art ?? '']));
  const done = await (await photofish()).loadPhotoFish(new Set(arts.values()));
  const changed: string[] = [];
  for (const id of want) if (done.has(arts.get(id)!) && goLive(id, LIVE[id].look)) { swapped.add(id); changed.push(id); }
  return changed;
}

/** `?photoart`: every build-B fish, approved or not, plus the orchid dottyback cutout. */
async function dogfood() {
  await import('./photoart').catch(e => console.warn(e));
  const done = await (await photofish()).loadPhotoFish();
  for (const [id, e] of Object.entries(LIVE)) if (done.has(getSpecies(e.look)?.art ?? '') && goLive(id, e.look)) swapped.add(id);
}

const speciesIn = (store: Store) => store.scene.tanks.flatMap(S => (S.fish ?? []).map(f => f.species));
const FIRST_MS = 4000;   // how long the first build waits for in-scene art before it draws the old model

/**
 * Wires the loader to a store and its viewer: holds the viewer's build for the species of the scene being opened (the first one, and each
 * opened file / example / share link), then loads the other live fish when the browser is idle, and a fish added later as it is added.
 * Call before the viewer's first frame.
 */
export function watchLiveArt(store: Store, viewer: Viewer) {
  const dog = new URLSearchParams(location.search).has('photoart');
  const hold = (ms: number) => {
    const need = speciesIn(store).filter(id => LIVE[id] && !swapped.has(id));
    if (!need.length) return;
    const p = ensureLive(need).catch(e => console.warn(e));
    viewer.holdBuild(p, ms);
  };
  const redraw = (changed: string[]) => { const now = new Set(speciesIn(store)); if (changed.some(id => now.has(id))) viewer.rebuild(); };   // only when a fish on screen changed
  if (dog) viewer.holdBuild(dogfood().catch(e => console.warn(e)), 20000); else hold(FIRST_MS);
  store.subscribe(kind => {
    if (kind === 'load') hold(FIRST_MS);
    else if (kind === 'scene') {   // a fish added from the picker whose art is not in yet: old model for a moment, then the new one
      const need = speciesIn(store).filter(id => LIVE[id] && !swapped.has(id));
      if (need.length) void ensureLive(need).then(c => { if (c) viewer.rebuild(); }).catch(e => console.warn(e));
    }
  });
  if (!dog) {
    const idle = () => void ensureLive().then(redraw).catch(e => console.warn(e));
    addEventListener('load', () => { if ('requestIdleCallback' in window) requestIdleCallback(idle, { timeout: 15000 }); else setTimeout(idle, 8000); });
    if (document.readyState === 'complete') setTimeout(idle, 8000);
  }
}
