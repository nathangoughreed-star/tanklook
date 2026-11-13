// AQ1 (2026-11-13): the static page wording and controls that mention terrariums, paludariums or herps, adjusted once at start-up while
// only aquariums are in scope (src/scope.ts). In scope 'all' nothing here runs, so the page is exactly as authored in index.html.
import { aquariumOnly } from '../scope';

export function applyScopeToDom(doc: Document = document): void {
  if (!aquariumOnly()) return;
  doc.documentElement.dataset.scope = 'aquarium';
  doc.title = 'TankLook: Aquarium Visualizer';
  doc.querySelector('meta[name="description"]')?.setAttribute('content', 'Plan a freshwater or saltwater aquarium with true-to-scale animals, seen in real perspective through the glass.');
  const sub = doc.querySelector('.sub'); const first = sub?.firstChild; if (first && first.nodeType === 3) first.textContent = 'Aquarium visualizer · beta ';
  for (const el of [doc.getElementById('tankTerra')?.closest('label'), doc.getElementById('doorRow')]) if (el instanceof HTMLElement) el.style.display = 'none';   // their own display rules beat [hidden]
  doc.getElementById('lidMesh')?.setAttribute('title', 'A screen top: fine metal mesh in a frame');
  doc.getElementById('bdRow')?.querySelector('label')?.setAttribute('title', 'A 3D background inside the tank against the back glass, like the rock, cork and moss panels sold for tanks. It takes up depth: animals and plants stay in front of it.');
  doc.getElementById('wKindOpen')?.setAttribute('title', 'Freshwater or saltwater is chosen in the Tank section');
  for (const p of doc.querySelectorAll('p.modeNote')) if (/Discover can show other kinds/.test(p.textContent ?? '')) p.textContent = 'What are you building? A first direction only: you can change your mind later.';
  doc.getElementById('stocking')?.setAttribute('aria-label', 'Animal checks');
}
