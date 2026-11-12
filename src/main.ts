import './style.css';
import { attachPointer } from './interact/pointer';
import { openMenuFor } from './interact/clickMenu';
import { Viewer } from './render/viewer';
import { applySavedFx } from './render/fxPrefs';
import { pickSec } from './render/menuFocus';
import { Store } from './scene/store';
import { attachPanels, scapeSec } from './ui/panels';
import { attachGroupBar } from './ui/group';
import { attachFullnessTile } from './ui/fullnessTile';
import { attachBrushBar } from './ui/brush';
import { attachParGuide } from './ui/parGuide';
import { attachLightHover } from './ui/lightHover';
import { attachLightContours } from './ui/lightContours';
import { attachAR } from './render/ar';
import { attachSetupSheet } from './ui/setupsheet';
import { attachReport } from './ui/report';
import { isShareHash } from './scene/share';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

// the version on screen: build number (rises with every push), with its date and commit on hover
const build = document.getElementById('build');
if (build) { build.textContent = `build ${__BUILD__.n}`; build.title = `Build ${__BUILD__.n}, ${__BUILD__.date} (${__BUILD__.sha})`; }

// installable app + offline after one visit (lane W, public/sw.js); not on the dev server, where it would cache HMR files
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => {}); });

const view = document.getElementById('view')!;
if (!webglAvailable()) {
  view.innerHTML = '<p class="nojs">Your browser or device has WebGL turned off, so the tank can\'t be drawn. Try a current Chrome, Edge, Firefox or Safari.</p>';
} else {
  const { scene: restored, error: saveError } = Store.loadLocalChecked(); // SL2: a corrupt save is told apart from no save
  applySavedFx(); // the viewer's saved Graphics settings (render/fxPrefs.ts), before anything is built
  const store = new Store(restored ?? undefined);
  const viewer = new Viewer(document.getElementById('c') as HTMLCanvasElement, view, store);
  // pieces move only while their menu (Hardscape, or Plants for plants and corals) is open, animals only while Animals is,
  // gear only while Tech is (lane TG, 2026-10-20),
  // and the panel showing
  attachPointer(viewer, store, (what, kind) => !!document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${pickSec(what, kind && scapeSec(kind))}"]`)?.open
    && !document.getElementById('app')!.classList.contains('collapsed'),
    t => openMenuFor(t, store, scapeSec)); // a click on a thing opens its menu at its options (clickMenu.ts)
  const ui = attachPanels(store, viewer);
  attachGroupBar(store, viewer, ui.status);
  attachBrushBar(store);
  attachFullnessTile(viewer, store); // fullness tile + Set my space (lane P3)
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
