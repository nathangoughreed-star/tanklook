import './style.css';
import { attachPointer } from './interact/pointer';
import { Viewer } from './render/viewer';
import { Store } from './scene/store';
import { attachPanels } from './ui/panels';
import { attachParGuide } from './ui/parGuide';
import { attachLightHover } from './ui/lightHover';
import { attachAR } from './render/ar';
import { isShareHash } from './scene/share';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

// the version on screen: build number (rises with every push), with its date and commit on hover
const build = document.getElementById('build');
if (build) { build.textContent = `· build ${__BUILD__.n}`; build.title = `Build ${__BUILD__.n}, ${__BUILD__.date} (${__BUILD__.sha})`; }

const view = document.getElementById('view')!;
if (!webglAvailable()) {
  view.innerHTML = '<p class="nojs">Your browser or device has WebGL turned off, so the tank can\'t be drawn. Try a current Chrome, Edge, Firefox or Safari.</p>';
} else {
  const restored = Store.loadLocal();
  const store = new Store(restored ?? undefined);
  const viewer = new Viewer(document.getElementById('c') as HTMLCanvasElement, view, store);
  // aquascape pieces / animals move only while the Aquascape / Animals menu is open and the panel showing
  const sec = { items: 'aquascape', fish: 'fish' } as const;
  attachPointer(viewer, store, what => !!document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${sec[what]}"]`)?.open
    && !document.getElementById('app')!.classList.contains('collapsed'));
  const ui = attachPanels(store, viewer);
  attachParGuide(() => store.tank.water.on && !!store.tank.water.salt);
  attachLightHover(viewer, store); // Light map hover readout (lane K)
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
