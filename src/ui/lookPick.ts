// Create a look (lane C7, spec research/design/start-flow.md section (e)), the Welcome tile "A look I want": style first, animals second.
//  1 Pick a look  (tiles pictured in a 20 gal long; "Use my own picture" pins a reference photo beside the viewer, local, no matching in v1)
//  2 Your tank    (the style in the main viewer; size chips, live / artificial / mixed; set-up $, $ a month, minutes a week)
//  3 Animals that suit it (optional; counts start at the recommended group; the balanced build is re-planned for them)
// Then the editor. Cancelling before the end puts back the tank that was there. Logic is scene/looks.ts (pure, tested).
// Deferred from the spec's screen 2: the "today / month 6" growth slider (no growth model to read yet).
import { PLANT_MODES, type PlantMode } from '../scene/scapes';
import { LOOK_TILES, animalsFor, asksPlants, defaultSize, lookHint, lookLabel, lookOption, lookSizes, lookWithAnimals, type LookAnimal, type LookStyle } from '../scene/looks';
import { tankLabel } from '../scene/tankfit';
import type { TankModel } from '../data/tanks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import type { TankSetup } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const VIEW = { az: 28, el: 16, zoom: 0.8 };

export function attachLookPick(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp bp lkp'; el.hidden = true; el.setAttribute('aria-label', 'Create a look');
  view.append(el);
  const ref = document.createElement('figure');
  ref.className = 'lkRef'; ref.hidden = true; view.append(ref);
  let refUrl: string | undefined;
  const dropRef = () => { if (refUrl) URL.revokeObjectURL(refUrl); refUrl = undefined; ref.hidden = true; ref.innerHTML = ''; };
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };

  let orig: TankSetup | undefined, style: LookStyle = 'nature', tank: TankModel = defaultSize('nature'), mode: PlantMode = 'live';
  let picks: { a: LookAnimal; n: number }[] = [], pics: string[] = [], token = 0;
  const put = (T: TankSetup) => store.update(s => { Object.assign(s.tanks[s.active], structuredClone(T)); }, { coalesce: 'lookpick' });
  const framed = (T: TankSetup): TankSetup => ({ ...T, camera: { ...T.camera, ...VIEW } });
  const restore = () => { if (orig) put(orig); };
  const close = () => { token++; el.hidden = true; side(false); };

  const tiles = () => {
    el.classList.remove('lkSide');
    el.innerHTML = `<div class="spHead"><h2>Pick a look</h2><button type="button" data-act="cancel" aria-label="Close">✕</button></div>
<p class="spNote">Start from how you want the tank to look. Animals that suit it come next, and are optional.</p>
<ul class="lkTiles">${LOOK_TILES.map((s, i) => `<li><button type="button" class="lkTile" data-act="style" data-style="${s}"><span class="lkPicBox">${pics[i] ? `<img src="${pics[i]}" alt="">` : ''}</span><b>${esc(lookLabel(s))}</b><span class="spNote">${esc(lookHint(s))}</span></button></li>`).join('')}</ul>
<div class="spFoot"><label class="spLink lkPic">Use my own picture<input type="file" accept="image/*" hidden data-act="pic"></label><span class="spNote">It stays on this computer, beside the tank, so you can pick the closest look with it in view.</span></div>`;
  };
  const showTiles = () => {
    const me = ++token; tiles(); el.hidden = false; side(true);
    // thumbnails wait for the side panel's collapse to give the view its width (a timer, not a frame: a hidden tab runs no frames)
    if (pics.length) return;
    setTimeout(() => {
      if (me !== token || el.hidden) return;
      el.hidden = true;
      pics = LOOK_TILES.map(s => { put(framed(lookOption(s, defaultSize(s), 'live').setup)); return viewer.thumbnail(480); });
      el.hidden = false; restore(); tiles();
    }, 150);
  };

  const tank2 = () => {
    const o = lookOption(style, tank, mode);
    put(framed(o.setup)); el.classList.add('lkSide');
    el.innerHTML = `<div class="spHead"><h2>${esc(lookLabel(style))}</h2><button type="button" data-act="cancel" aria-label="Close">✕</button></div>
<p class="spNote">${esc(lookHint(style))}</p>
<div class="spNote">Size</div><div class="lkChips">${lookSizes(style).map(m => `<button type="button" class="lkChip${m === tank ? ' on' : ''}" data-act="size" data-id="${esc(m.id)}">${esc(tankLabel(m, store.scene.units))}</button>`).join('')}</div>
${asksPlants(style) ? `<div class="spNote">Plants</div><div class="lkChips">${PLANT_MODES.map(m => `<button type="button" class="lkChip${m.id === mode ? ' on' : ''}" data-act="mode" data-mode="${m.id}" title="${esc(m.blurb)}">${esc(m.label)}</button>`).join('')}</div>` : ''}
<div class="bpNums"><span><b>${usd(o.setupUsd)}</b>set-up</span><span><b>${usd(o.upkeepUsdMo)}</b>a month</span><span><b>${o.minPerWeek}</b>min a week</span></div>
<ul class="bpGear"><li>Light: ${esc(o.light)}</li><li>${esc(o.co2)}</li></ul>${o.lightNote ? `<div class="spWarn">${esc(o.lightNote)}</div>` : ''}
<div class="spFoot"><button type="button" class="primary" data-act="animals">Animals that suit it</button><button type="button" class="spLink" data-act="skip">Skip, no animals yet: open the editor</button><button type="button" class="spLink" data-act="tiles">‹ Pick another look</button></div>`;
    el.hidden = false; side(true);
  };

  const tank3 = () => {
    if (!picks.length) picks = animalsFor(style, tank).map(a => ({ a, n: 0 }));
    el.innerHTML = `<div class="spHead"><h2>Animals that suit it</h2><button type="button" data-act="cancel" aria-label="Close">✕</button></div>
<p class="spNote">For a ${esc(lookLabel(style).toLowerCase())} in ${esc(tankLabel(tank, store.scene.units))}. These fit at their recommended group; the look's own animals come first. Add any you like, or none.</p>
<ul class="lkAnimals">${picks.map(({ a, n }, i) => `<li><span>${esc(a.name)}${a.inPool ? ' <i class="spNote">usual for this look</i>' : ''}</span><span class="lkStep"><button type="button" data-act="dec" data-i="${i}" aria-label="Fewer ${esc(a.name)}">−</button><b>${n}</b><button type="button" data-act="inc" data-i="${i}" aria-label="More ${esc(a.name)}">+</button></span></li>`).join('') || '<li class="spNote">Nothing in the catalogue fits this look in this size: pick a larger tank.</li>'}</ul>
<div class="spFoot"><button type="button" class="primary" data-act="use">${picks.some(p => p.n) ? 'Use these animals' : 'Open the editor'}</button><button type="button" class="spLink" data-act="back">‹ Back to the tank</button></div>`;
  };

  const finish = (animals: { species: string; n: number }[]) => {
    token++;
    put(framed((animals.length ? lookWithAnimals(style, tank, mode, animals).setup : lookOption(style, tank, mode).setup)));
    dropRef(); close(); store.seal(); orig = undefined;
    status(`${lookLabel(style)} opened in the editor${animals.length ? ' with your animals' : ''}. It is yours to change; Undo steps back.`);
  };

  el.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t || t.tagName === 'INPUT') return;
    switch (t.dataset.act) {
      case 'cancel': restore(); dropRef(); close(); orig = undefined; break;
      case 'tiles': picks = []; restore(); showTiles(); break;
      case 'style': style = t.dataset.style as LookStyle; tank = defaultSize(style); picks = []; token++; tank2(); break;
      case 'size': tank = lookSizes(style).find(m => m.id === t.dataset.id) ?? tank; picks = []; tank2(); break;
      case 'mode': mode = t.dataset.mode as PlantMode; tank2(); break;
      case 'animals': tank3(); break;
      case 'back': tank2(); break;
      case 'inc': case 'dec': { const p = picks[+(t.dataset.i ?? 0)]; p.n = t.dataset.act === 'inc' ? (p.n ? p.n + 1 : p.a.n) : Math.max(0, p.n - 1); tank3(); break; }
      case 'skip': finish([]); break;
      case 'use': finish(picks.filter(p => p.n > 0).map(p => ({ species: p.a.id, n: p.n }))); break;
    }
  };
  el.onchange = e => {
    const f = e.target as HTMLInputElement; if (f.dataset.act !== 'pic' || !f.files?.[0]) return;
    dropRef(); refUrl = URL.createObjectURL(f.files[0]);
    ref.innerHTML = `<img src="${refUrl}" alt="Your reference picture"><button type="button" aria-label="Remove the picture">✕</button>`;
    ref.hidden = false; (ref.querySelector('button') as HTMLButtonElement).onclick = dropRef; f.value = '';
  };

  return { open() { orig = structuredClone(store.scene.tanks[store.scene.active]); mode = 'live'; picks = []; showTiles(); } };
}
