// Guided Setup Rev 03, step 1: World (lane GS4). "What kind of world are we creating?" Aquarium, Terrarium, Paludarium, Open to anything. Water is NOT asked
// here (Look First asks it, or the animals answer it). "Open to anything" defers the world: the look flow asks it later. The footer links (Sandbox, deals, starter
// tanks) live on this step only (reconcile section 7.1).
import { projectExtras } from '../../scene/brief';
import { tileHtml } from '../discovery/screens';
import type { DiscoveryHost } from '../discovery/screens';
import { editBrief, getBrief } from '../setupBrief';
import { ONBOARD_ASK, worldCards, chooseWorld, worldColour } from './logic';
import { aquariumOnly } from '../../scope';
import type { World } from '../../scene/brief';


export interface WorldStepOpts { host: DiscoveryHost; next(): void; /** the shell closes its dialog before leaving for a list or the sandbox */ leave(): void }
export function mountWorldStep(root: HTMLElement, o: WorldStepOpts) {
  const base = import.meta.env.BASE_URL;
  const draw = () => {
    if (aquariumOnly() && projectExtras(getBrief()).world !== 'aquarium') editBrief(b => chooseWorld(b, 'aquarium'));   // AQ1: aquariums only, so the world is answered
    const cur = projectExtras(getBrief()).world;
    root.innerHTML = `<h3 class="vd-ask">${ONBOARD_ASK.world}</h3>
<div class="vd-tiles vd-environment" role="group" aria-label="World">${worldCards().map(c => tileHtml({ id: c.id, name: c.name, line: c.tagline, colour: worldColour(c.id), art: c.id, on: cur === c.id }, base)).join('')}</div>
<p class="vd-nav">${cur ? '<button type="button" class="primary" data-gs="next">Next</button> ' : ''}<span class="hint">You can change this later without starting over.</span></p>
<p class="hint vd-links">${o.host.sandbox ? '<button type="button" class="linkbtn" data-gs="sandbox">Switch to Sandbox: an empty tank, no questions</button>' : ''}${o.host.browse ? ' · <button type="button" class="linkbtn" data-gs="deals">On sale now and bundles</button> · <button type="button" class="linkbtn" data-gs="saved">Starter tanks and saved tanks</button>' : ''}</p>`;
  };
  root.addEventListener('error', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.remove(); }, true);
  root.addEventListener('load', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.classList.add('ok'); }, true);
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-pick],[data-gs]'); if (!t) return;
    if (t.dataset.pick) { const id = t.dataset.pick as World; editBrief(b => chooseWorld(b, id)); o.next(); return; }
    switch (t.dataset.gs) {
      case 'next': o.next(); break;
      case 'sandbox': void Promise.resolve(o.host.sandbox?.()).then(ok => { if (ok) o.leave(); }); break;
      case 'deals': case 'saved': o.leave(); o.host.browse?.(t.dataset.gs === 'deals' ? 'new' : 'open'); break;
    }
  });
  draw();
  return { destroy() { root.replaceChildren(); }, redraw: draw };
}
