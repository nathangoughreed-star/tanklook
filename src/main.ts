import './style.css';
import { attachPointer } from './interact/pointer';
import { Viewer } from './render/viewer';
import { Store } from './scene/store';
import { attachPanels, scapeSec } from './ui/panels';
import { attachGroupBar } from './ui/group';
import { attachParGuide } from './ui/parGuide';
import { attachLightHover } from './ui/lightHover';
import { attachLightContours } from './ui/lightContours';
import { attachAR } from './render/ar';
import { attachSetupSheet } from './ui/setupsheet';
import { isShareHash } from './scene/share';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

// the version on screen: build number (rises with every push), with its date and commit on hover
const build = document.getElementById('build');
if (build) { build.textContent = `· build ${__BUILD__.n}`; build.title = `Build ${__BUILD__.n}, ${__BUILD__.date} (${__BUILD__.sha})`; }

// installable app + offline after one visit (lane W, public/sw.js); not on the dev server, where it would cache HMR files
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => {}); });

const view = document.getElementById('view')!;
if (!webglAvailable()) {
  view.innerHTML = '<p class="nojs">Your browser or device has WebGL turned off, so the tank can\'t be drawn. Try a current Chrome, Edge, Firefox or Safari.</p>';
} else {
  const restored = Store.loadLocal();
  const store = new Store(restored ?? undefined);
  const viewer = new Viewer(document.getElementById('c') as HTMLCanvasElement, view, store);
  // pieces move only while their menu (Hardscape, or Plants for plants and corals) is open, animals only while Animals is,
  // and the panel showing
  attachPointer(viewer, store, (what, kind) => !!document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${what === 'fish' ? 'fish' : scapeSec(kind!)}"]`)?.open
    && !document.getElementById('app')!.classList.contains('collapsed'));
  const ui = attachPanels(store, viewer);
  attachGroupBar(store, viewer, ui.status);
  attachParGuide(() => store.tank.water.on && !!store.tank.water.salt);
  attachLightHover(viewer, store); // Light map hover readout (lane K)
  attachLightContours(viewer); // Light map contour labels
  attachSetupSheet(store, document.getElementById('sheetBtn')!); // Setup sheet (lane SH)
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
  if (!openLink()) { if (restored) ui.status('Welcome back: your last tank was restored from this browser.'); else ui.showStart(); }
}
