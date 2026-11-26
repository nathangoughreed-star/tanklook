// The old UI (?ui=1), out of the entry chunk since lane FD (2026-11-25): main.ts imports it only when ?ui=1 asks. Delete on or after 11-29.
import { attachPointer } from './interact/pointer';
import { openMenuFor } from './interact/clickMenu';
import { Viewer } from './render/viewer';
import { applySavedFx } from './render/fxPrefs';
import { pickSec } from './render/menuFocus';
import { Store } from './scene/store';
import { freshScene } from './scene/freshScene';
import { attachPanels, scapeSec } from './ui/panels';
import { attachGroupBar } from './ui/group';
import { attachFullnessTile } from './ui/fullnessTile';
import { attachSideOverlays, splitSides } from './ui/sideOverlays';
import { attachBrushBar } from './ui/brush';
import { attachParGuide } from './ui/parGuide';
import { attachLightHover } from './ui/lightHover';
import { attachLightContours } from './ui/lightContours';
import { attachAR } from './render/ar';
import { attachSetupSheet } from './ui/setupsheet';
import { attachReport } from './ui/report';
import { isShareHash } from './scene/share';
import { watchLiveArt } from './art/liveFish';

export function bootOldUi(view: HTMLElement) {
  const { scene: restored, error: saveError } = Store.loadLocalChecked(); // SL2: a corrupt save is told apart from no save
  applySavedFx(); // the viewer's saved Graphics settings (render/fxPrefs.ts), before anything is built
  const store = new Store(restored ?? freshScene());
  const viewer = new Viewer(document.getElementById('c') as HTMLCanvasElement, view, store);
  watchLiveArt(store, viewer);
  // pieces move only while their menu (Hardscape, or Plants for plants and corals) is open, animals only while Animals is,
  // gear only while Tech is (lane TG, 2026-10-20),
  // and the panel showing
  attachPointer(viewer, store, (what, kind) => !!document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${pickSec(what, kind && scapeSec(kind))}"]`)?.open
    && !document.getElementById('app')!.classList.contains('collapsed'),
    t => openMenuFor(t, store, scapeSec)); // a click on a thing opens its menu at its options (clickMenu.ts)
  const ui = attachPanels(store, viewer);
  attachGroupBar(store, viewer, ui.status);
  attachBrushBar(store);
  attachFullnessTile(viewer, store, { gate: () => !splitSides(store, viewer) }); // fullness tile + Set my space (lane P3); in split view each side has its own (lane SV1)
  attachSideOverlays(viewer, store);
  attachParGuide(() => store.tank.water.on && !!store.tank.water.salt);
  attachLightHover(viewer, store); // Light map hover readout (lane K)
  attachLightContours(viewer); // Light map contour labels
  attachSetupSheet(store, document.getElementById('sheetBtn')!); // Setup sheet (lane SH)
  attachReport(store, viewer, document.getElementById('reportBtn')); // the printable report (lane GV3)
  attachAR(viewer, store, document.getElementById('arView') as HTMLButtonElement); // AR view, only where immersive-ar works (lane Q)
  if (import.meta.env.DEV) import('./render/fish3d').then(({ fish3d }) => Object.assign(window, { __gb: { store, viewer, fish3d, ar: import('./render/ar') } })); // debugging handle, dev server only
  // the start menu only when there is no saved tank to come back to (Nathan 2026-10-14)
  // a share link (#tank=…, lane N) opens its tank instead of the start menu; the hash is dropped from the address bar
  // so a reload keeps the visitor's edits (autosave) instead of reopening the link
  const openLink = () => {
    const h = location.hash;
    if (!isShareHash(h)) return false;
    history.replaceState(null, '', location.pathname + location.search);
    void ui.openShared(h); return true;
  };
  addEventListener('hashchange', openLink); // a link pasted into a tab that already has the app open
  // SL2 (Nathan 2026-11-10, replaces SL1's "every visit"): a return visit reopens where the last session stopped (design, camera, open section, Discovery);
  // only a first visit, or a save that cannot be read (with a message), shows the start screen
  if (!openLink()) { if (restored) ui.resume(); else ui.showStart(saveError ? `Your last saved tank could not be opened (${saveError}). Start a new one, or open a saved tank or file.` : undefined); }
}
