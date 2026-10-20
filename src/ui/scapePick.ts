// The scape choice of path 1, "An animal I want" (lane P6b, 2026-10-20): after the user picks a build (ui/buildPick.ts onBuildPicked), the panel
// asks "Live plants?" (live / artificial / a mix), then shows the styles that suit THESE animals, each pictured in THEIR tank with THEIR
// animals and gear (taken with the main viewer, like the builds screen), with set-up $, minutes a week, light and CO2 need. Picking one loads it
// in the editor ("make it yours": the editor and its gates); "scape it from scratch" leaves the build's plain tank. A "Your plan" chip then opens
// the plan sheet (ui/planSheet.ts). Logic is scene/scapes.ts (pure, tested); this file draws it.
import { getSpecies } from '../data/species';
import { needsOf, tankLabel } from '../scene/tankfit';
import { PLANT_MODES, scapeOptions, type PlantMode, type ScapeOption } from '../scene/scapes';
import { isLandStyle } from '../scene/items';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import type { TankSetup } from '../scene/types';
import { onBuildPicked, placedSetup, type BuildPicked } from './buildPick';
import { attachPlanSheet } from './planSheet';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const VIEW = { az: 28, el: 16, zoom: 0.8 };

export function attachScapePick(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp bp scp'; el.hidden = true; el.setAttribute('aria-label', 'Choose a scape for your animals');
  view.append(el);
  const chip = document.createElement('button');
  chip.type = 'button'; chip.className = 'planChip'; chip.hidden = true; chip.textContent = 'Your plan'; chip.title = 'Does it fit, what to buy and why, what it costs';
  view.append(chip);
  const plan = attachPlanSheet(store);
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };

  let picked: BuildPicked | undefined, bare: TankSetup | undefined, mode: PlantMode = 'live', opts: ScapeOption[] = [], pics: string[] = [];
  const asks = () => { const n = needsOf(picked!.animals), land = picked!.animals.every(a => getSpecies(a.species)?.habitat === 'land'); return !n.salt && !land; };
  const close = () => { el.hidden = true; side(false); };
  const put = (T: TankSetup) => store.update(s => { Object.assign(s.tanks[s.active], structuredClone(T)); }, { coalesce: 'scapepick' });
  const framed = (T: TankSetup): TankSetup => ({ ...T, camera: { ...T.camera, ...VIEW } });

  /** One picture per option, taken with the main viewer while the panel is hidden; the editor shows the first when done. */
  const shoot = () => {
    const was = el.hidden; el.hidden = true;
    pics = opts.map(o => { put(framed(o.setup)); return viewer.thumbnail(720); });
    el.hidden = was;
  };

  const ask = () => {
    el.innerHTML = `<div class="spHead"><h2>Live plants?</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<p class="spNote">Plants change the numbers: light, CO2 and feeding for live ones; more water changes without them, since artificial plants take up no waste. You can change this later in the editor.</p>
<ul class="scpModes">${PLANT_MODES.map(m => `<li><button type="button" class="primary" data-act="mode" data-mode="${m.id}">${esc(m.label)}</button><span class="spNote">${esc(m.blurb)}</span></li>`).join('')}</ul>
<div class="spFoot"><button type="button" class="spLink" data-act="scratch">Scape it from scratch</button><span class="spNote">The plain editor, with the tank and gear you picked.</span></div>`;
    el.classList.add('ask'); el.hidden = false; side(true);
  };

  const card = (o: ScapeOption, i: number) => `<li class="bpCard" data-i="${i}">
<div class="bpPic">${pics[i] ? `<img src="${pics[i]}" alt="${esc(o.label)} in your tank with your animals">` : ''}</div>
<div class="bpHead"><b>${esc(o.label)}</b></div>
<div class="spNote">${esc(o.why[0])}</div>
<div class="bpNums"><span><b>${usd(o.setupUsd)}</b>set-up</span><span><b>${usd(o.upkeepUsdMo)}</b>a month</span><span><b>${o.minPerWeek}</b>min a week</span></div>
<ul class="bpGear"><li>Light: ${esc(o.light)}</li><li>${esc(o.co2)}</li>${o.fakeCount ? `<li>${o.fakeCount} ${o.silk ? 'silk' : 'artificial'} plant${o.fakeCount === 1 ? '' : 's'}${o.silk ? ' (soft on long fins)' : ''}</li>` : ''}</ul>
${o.why.slice(1).map(w => `<div class="spNote">${esc(w)}</div>`).join('')}
${o.lightNote ? `<div class="spWarn">${esc(o.lightNote)}</div>` : ''}
<button type="button" class="primary" data-act="pick" data-i="${i}">Use this scape</button></li>`;

  let token = 0;
  const draw = () => {
    const b = picked!.build, m = PLANT_MODES.find(x => x.id === mode)!;
    el.innerHTML = `<div class="spHead"><h2>Choose a scape</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<p class="spNote">${esc(tankLabel(b.tank))}, ${esc(b.label.toLowerCase())} build. Each style is drawn in your tank with your animals and gear.${asks() ? ` Plants: <b>${esc(m.label.toLowerCase())}</b> <button type="button" class="spLink" data-act="plants">change</button>` : ''}</p>
<ul class="bpCards">${opts.map(card).join('')}</ul>
<div class="spFoot"><button type="button" class="spLink" data-act="scratch">Scape it from scratch</button><span class="spNote">Pick one and it opens in the editor with everything still yours to change.</span></div>`;
  };
  const choose = () => {
    const me = ++token;
    el.classList.remove('ask'); opts = scapeOptions(picked!.build, mode); pics = [];
    draw(); el.hidden = false; side(true);
    // the pictures wait for the side panel's collapse to give the view its width, else the first set comes out blank (a timer, not a frame: a hidden tab runs no frames)
    setTimeout(() => {
      if (me !== token || el.hidden) return;
      shoot(); if (bare) put(bare); draw();
    }, 150);
  };

  const done = (msg: string) => { close(); store.seal(); chip.hidden = false; status(msg); };
  el.onclick = e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t || !picked) return;
    switch (t.dataset.act) {
      case 'close': token++; if (bare) put(bare); close(); chip.hidden = false; break;
      case 'mode': mode = t.dataset.mode as PlantMode; choose(); break;
      case 'plants': token++; ask(); break;
      case 'scratch': token++; if (bare) put(bare); done('The plain editor: the tank and gear you picked, no scape yet. Your plan is under "Your plan".'); break;
      case 'pick': {
        token++;
        const o = opts[+(t.dataset.i ?? 0)];
        put(framed(o.setup));
        done(`${o.label} opened in the editor${isLandStyle(o.style) ? '' : ' with your animals'}. It is yours to change; Undo steps back. "Your plan" shows what to buy.`);
        break;
      }
    }
  };
  chip.onclick = () => plan.open(picked?.build);

  onBuildPicked(e => {
    picked = e; mode = 'live';
    bare = placedSetup(e.build);
    chip.hidden = true;
    if (asks()) ask(); else choose();
  });
}
