// UI2 shell entry (lane S1, 2026-11-13; screen map §7 step 1). The default interface since UF1 (2026-11-15; ?ui=1 opens the old one), loaded as its own lazy chunk (src/main.ts).
// It takes the page over from the old shell: the old markup and stylesheet are switched off (nothing of panels.ts runs), and the
// same Store, Viewer and engines are built here. Its own stylesheet (shell.css, the UI2 tokens) is injected inline.
import { render } from 'preact';
import tokens from './tokens.css?inline';
import layout from './shell.css?inline';
import { Store } from '../scene/store';
import { freshScene } from '../scene/freshScene';
import { Viewer } from '../render/viewer';
import { applySavedFx } from '../render/fxPrefs';
import { attachLightHover } from '../ui/lightHover';
import { attachLightContours } from '../ui/lightContours';
import { attachPointer } from '../interact/pointer';
import { gearSel } from '../render/gearSel';
import { loadProfile } from '../ui/demandPanel';
import { App } from './App';
import { createFiles } from './files';
import { startMode } from './logic/files';
import { isShareHash } from '../scene/share';
import { applyViewPrefs } from './view';
import { pickable } from './animals';
import { pickItems } from './scape';
import { scapeSec } from './logic/scape';
import { openClicked } from './clickOpen';
import { shouldWelcome, landing } from './logic/start';
import { watchLiveArt } from '../art/liveFish';
import { bhParams } from '../behavior/params';

export async function bootShell() {
  document.documentElement.classList.remove('gb-new'); // BF1: the index.html pre-paint guard (hid the old markup, set a plain background)
  // the old shell off: its markup removed (no old id stays in the page), its stylesheet disabled (kept in place so dev HMR has a node to update)
  for (const el of [...document.body.children]) if (el.tagName !== 'SCRIPT') el.remove();
  for (const n of document.head.querySelectorAll('link[rel="stylesheet"], style')) n.setAttribute('media', 'not all');
  const st = document.createElement('style'); st.id = 'ui2css'; st.textContent = `${tokens}\n${layout}`; document.head.append(st);
  document.body.className = 'ui2';
  document.title = 'TankLook: Vivarium Visualizer';

  const { scene: restored, error: saveError } = Store.loadLocalChecked(); // a return visit resumes the autosave; a first visit opens an empty tank (shell step 2)
  const start = startMode(restored, saveError);
  applySavedFx();
  const bh = bhParams();   // R208: ?bh&places (affordance overlay), ?scene=bh1 (review tank, never saved)
  const store = new Store(restored ?? freshScene());   // a first visit opens an empty tank behind the Start sheet (FD's example-behind-the-sheet reverted, Nathan 2026-11-27)
  if (bh.scene === 'bh1') store.replace((await import('../behavior/bh1Scene')).bh1Scene());
  store.subscribe(kind => { if (kind === 'scene') landing.untouched = false; });   // the first edit makes the tank the visitor's: no result card, no silent swap

  // the existing viewer, unchanged: a host with its canvas, moved into the view area by App
  const viewHost = document.createElement('div'); viewHost.className = 'vhost';
  const canvas = document.createElement('canvas'); canvas.className = 'vcanvas'; canvas.setAttribute('aria-label', 'Tank view');
  viewHost.append(canvas);

  // autosave, as the old shell does (panels.ts): 400 ms after the last change, and on leaving the page
  let timer = 0;
  const save = () => { if (bh.scene) return; clearTimeout(timer); timer = 0; store.saveLocal(); dispatchEvent(new Event('ui2:saved')); };
  store.subscribe(kind => { if (kind === 'select') return; clearTimeout(timer); timer = window.setTimeout(save, 400); });
  addEventListener('pagehide', () => { if (timer) save(); });

  const root = document.createElement('div'); root.id = 'ui2'; document.body.append(root);
  let viewer: Viewer | undefined;
  const preview = (S: Parameters<Viewer['setPreview']>[0]) => viewer?.setPreview(S);
  // the file menu (step 2): every operation is P7's src/ui/logic/files.ts; the thumbnail comes from the viewer, built just below
  const files = createFiles(store, () => viewer!.thumbnail());
  render(<App store={store} viewHost={viewHost} profile={loadProfile} save={save} preview={preview} files={files} viewer={() => viewer} />, root);

  viewer = new Viewer(canvas, viewHost, store);
  watchLiveArt(store, viewer); // FD: the build-B fish art of this scene loads now, the first build waits for it (src/art/liveFish.ts)
  applyViewPrefs(viewer, viewHost);
  attachPointer(viewer, store, (what, kind, id) => (what === 'gear' && gearSel()?.row === id) || (what === 'fish' && pickable.fish && store.selId === id) || (what === 'items' && pickItems.sec != null && scapeSec(kind ?? 'stone') === pickItems.sec && store.selItem === id), // R116: a press drags only what a click already selected
    t => openClicked(t, store, scapeSec)); // animals only, while Animals is open (step 4); the other pieces come with their sections; a click on a thing opens it (CM2)
  attachLightHover(viewer, store); // light map: the value under the pointer (PG1, ported from the old shell)
  attachLightContours(viewer); // light map: numbers on the contour lines
  // a share link (#tank=...) opens its tank; the hash is dropped so a reload keeps the visitor's edits (as the old shell does)
  const openLink = () => {
    if (!isShareHash(location.hash)) return false;
    const h = location.hash; history.replaceState(null, '', location.pathname + location.search);
    void files.openShared(h); return true;
  };
  addEventListener('hashchange', openLink);
  const linked = openLink();
  if (bh.places) void import('../behavior/overlay').then(m => m.attachPlaces(viewer!, store));
  if (bh.scene) { /* the review tank opens straight, no start sheet */ }
  else if (!linked && start.message) files.say(start.message, true);
  else if (!linked && shouldWelcome(restored, saveError)) files.openStart();   // SS1: a first visit asks how to start
  if (import.meta.env.DEV || import.meta.env.VITE_GB_HANDLE) Object.assign(window, { __gb: { store, viewer } }); // VITE_GB_HANDLE=1: a production build for scripts/perf-*.mjs
  document.body.dataset.ui2 = 'ready';
}
