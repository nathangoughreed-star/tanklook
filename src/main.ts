import './style.css';
import { chooseUi } from './uiChoice';
import { applyScopeToDom } from './ui/scopeDom';
// Build-B fish art is no longer awaited here (lane FD, 2026-11-25): the shell starts at once and src/art/liveFish.ts loads the live fish
// a scene holds while the viewer's first build waits for them. No top-level await in this file (scripts/size-budget.mjs checks).
applyScopeToDom();   // AQ1: aquarium-only wording (src/scope.ts)

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
} else if (chooseUi(location.search) === 'shell') {
  void import('./shell/boot').then(m => m.bootShell()); // UI2 (lane S1; made the default by UF1, 2026-11-15): the new shell, its own lazy chunk. ?ui=1 keeps the old UI below until it is deleted
} else {
  void import('./oldUi').then(m => m.bootOldUi(view)); // ?ui=1: the old UI, its own lazy chunk until it is deleted
}
