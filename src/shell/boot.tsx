// UI2 shell entry (lane S1, 2026-11-13; screen map §7 step 1). Loaded ONLY with ?ui=2, as its own lazy chunk (src/main.ts).
// It takes the page over from the old shell: the old markup and stylesheet are switched off (nothing of panels.ts runs), and the
// same Store, Viewer and engines are built here. Its own stylesheet (shell.css, the UI2 tokens) is injected inline.
import { render } from 'preact';
import tokens from './tokens.css?inline';
import layout from './shell.css?inline';
import { Store } from '../scene/store';
import { Viewer } from '../render/viewer';
import { applySavedFx } from '../render/fxPrefs';
import { attachPointer } from '../interact/pointer';
import { loadProfile } from '../ui/demandPanel';
import { App } from './App';
import { applyViewPrefs } from './view';

export function bootShell() {
  // the old shell off: its markup removed (no old id stays in the page), its stylesheet disabled (kept in place so dev HMR has a node to update)
  for (const el of [...document.body.children]) if (el.tagName !== 'SCRIPT') el.remove();
  for (const n of document.head.querySelectorAll('link[rel="stylesheet"], style')) n.setAttribute('media', 'not all');
  const st = document.createElement('style'); st.id = 'ui2css'; st.textContent = `${tokens}\n${layout}`; document.head.append(st);
  document.body.className = 'ui2';
  document.title = 'TankLook (new UI preview)';

  const { scene: restored } = Store.loadLocalChecked(); // a first visit opens an empty tank; Start / Open come in shell step 2
  applySavedFx();
  const store = new Store(restored ?? undefined);

  // the existing viewer, unchanged: a host with its canvas, moved into the view area by App
  const viewHost = document.createElement('div'); viewHost.className = 'vhost';
  const canvas = document.createElement('canvas'); canvas.className = 'vcanvas'; canvas.setAttribute('aria-label', 'Tank view');
  viewHost.append(canvas);

  // autosave, as the old shell does (panels.ts): 400 ms after the last change, and on leaving the page
  let timer = 0;
  const save = () => { clearTimeout(timer); timer = 0; store.saveLocal(); dispatchEvent(new Event('ui2:saved')); };
  store.subscribe(kind => { if (kind === 'select') return; clearTimeout(timer); timer = window.setTimeout(save, 400); });
  addEventListener('pagehide', () => { if (timer) save(); });

  const root = document.createElement('div'); root.id = 'ui2'; document.body.append(root);
  let viewer: Viewer | undefined;
  const preview = (S: Parameters<Viewer['setPreview']>[0]) => viewer?.setPreview(S);
  render(<App store={store} viewHost={viewHost} profile={loadProfile} save={save} preview={preview} viewer={() => viewer} />, root);

  viewer = new Viewer(canvas, viewHost, store);
  applyViewPrefs(viewer, viewHost);
  attachPointer(viewer, store, () => false); // camera only: picking and moving things come with their sections
  if (import.meta.env.DEV) Object.assign(window, { __gb: { store, viewer } });
  document.body.dataset.ui2 = 'ready';
}
