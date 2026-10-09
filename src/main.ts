import './style.css';
import { attachPointer } from './interact/pointer';
import { Viewer } from './render/viewer';
import { Store } from './scene/store';
import { attachPanels } from './ui/panels';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

const view = document.getElementById('view')!;
if (!webglAvailable()) {
  view.innerHTML = '<p class="nojs">Your browser or device has WebGL turned off, so the tank can\'t be drawn. Try a current Chrome, Edge, Firefox or Safari.</p>';
} else {
  const restored = Store.loadLocal();
  const store = new Store(restored ?? undefined);
  const viewer = new Viewer(document.getElementById('c') as HTMLCanvasElement, view, store);
  attachPointer(viewer, store);
  const ui = attachPanels(store, viewer);
  if (import.meta.env.DEV) import('./render/fish3d').then(({ fish3d }) => Object.assign(window, { __gb: { store, viewer, fish3d } })); // debugging handle, dev server only
  if (restored) ui.status('Welcome back: your last tank was restored from this browser.');
}
