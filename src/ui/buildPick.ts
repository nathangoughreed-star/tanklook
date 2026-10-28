// The three-builds screen of path 1, "An animal I want" (lane P6a, 2026-10-20): after "Continue" on the stocking screen, three finished
// tanks for those animals (cheapest, least work, balanced), each pictured in 3D in ITS tank with ITS animals and gear. The user picks one;
// it opens in the editor ("make it yours": the look is free, the gates hold). Logic is scene/builds.ts (pure, tested); this file draws it,
// takes the pictures with the main viewer, and loads the choice. Lane P6b (scape choice, plan sheet) listens through onBuildPicked().
import { rng } from '../art/paint';
import { dealShip } from '../data/deals';
import { gearShip } from '../data/gearDeals';
import { getSpecies } from '../data/species';
import { pinDeal } from '../demand/pinned';
import { emptyScene } from '../scene/defaults';
import { shuffleFish } from '../scene/scatter';
import { carryPairs } from '../scene/pairs';
import type { Store } from '../scene/store';
import { buildsFor, distinctBuilds, meetsNeeds, type Build } from '../scene/builds';
import { tankLabel, type AnimalCount } from '../scene/tankfit';
import type { Viewer } from '../render/viewer';
import type { TankSetup, Units } from '../scene/types';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** What P6b (and anything else after the pick) hears: the chosen build, already loaded in the editor. */
export interface BuildPicked { build: Build; animals: AnimalCount[] }
const listeners = new Set<(e: BuildPicked) => void>();
/** Call `fn` after the user picks a build and it is loaded in the editor. Returns the way to stop listening. */
export const onBuildPicked = (fn: (e: BuildPicked) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** The build's tank with its animals scattered (a fixed seed per build: the picture does not change from one open to the next). */
/** Put tank `T` in the active tank's place, key for key: a plain Object.assign leaves the old tank's extra settings behind (a terrarium's front doors
 *  stayed on the aquarium that came after it in the pictures; Nathan 2026-10-27). */
export function putTank(A: TankSetup, T: TankSetup): void { const brief = A.brief; for (const k of Object.keys(A)) delete (A as unknown as Record<string, unknown>)[k]; Object.assign(A, T); if (brief && !A.brief) A.brief = brief; } // the setup brief belongs to the person's project, not to one build

export function placedSetup(b: Build): TankSetup {
  const T = structuredClone(b.setup);
  shuffleFish(T, rng(7 + b.id.length * 31 + T.fish.length), undefined, 100);
  T.camera = { ...T.camera, az: 28, el: 16, zoom: 0.8 };
  return T;
}

/** The scene the editor opens for a build: the build's tank in the user's units, its bundle (if any) pinned to the demand panel. */
export function sceneForBuild(b: Build, units: Units | undefined) {
  const s = emptyScene();
  if (units) s.units = units;
  s.name = 'My animal tank';
  s.tanks[0] = placedSetup(b);
  return s;
}

export function attachBuildPick(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp bp'; el.hidden = true; el.setAttribute('aria-label', 'Three builds for your animals');
  view.append(el);
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };
  let builds: Build[] = [], animals: AnimalCount[] = [], pics: string[] = [], back: (() => void) | undefined;
  const close = () => { el.hidden = true; side(false); };

  /** Show build `i` live in the viewer. */
  const show = (i: number) => {
    const T = placedSetup(builds[i]);
    store.update(s => { putTank(s.tanks[s.active], T); }, { coalesce: 'buildpick' });
  };
  /** One picture per build, taken with the main viewer while the panel is hidden. */
  const shoot = () => {
    const was = el.hidden; el.hidden = true;
    pics = builds.map((_, i) => { show(i); return viewer.thumbnail(720); });
    el.hidden = was;
  };

  const same = (a: Build, b: Build) => a.setupUsd === b.setupUsd && a.minPerWeek === b.minPerWeek && a.gear.join() === b.gear.join();
  const card = (b: Build, i: number) => {
    const twin = builds.slice(0, i).find(o => same(o, b));
    const deals = [
      b.bundle ? `<li class="bpDeal">Bundle: ${esc(b.bundle.retailer)} ${esc(b.bundle.name)} · ${usd(b.bundle.price.usd)}${b.bundle.price.regularUsd ? ` (was ${usd(b.bundle.price.regularUsd)})` : ''}, ${esc(dealShip(b.bundle).text)}</li>` : '',
      b.tankDeal ? `<li class="bpDeal">Tank on sale at ${esc(b.tankDeal.retailer)}: ${usd(b.tankDeal.usd)} (was ${usd(b.tankDeal.regularUsd)})</li>` : '',
      ...b.gearDeals.map(d => `<li class="bpDeal">${esc(d.title)} on sale at ${esc(d.store)}: ${usd(d.price.usd)} (was ${usd(d.price.regularUsd)}), ${esc(gearShip(d).text)}</li>`),
    ].join('');
    return `<li class="bpCard" data-i="${i}">
<div class="bpPic">${pics[i] ? `<img src="${pics[i]}" alt="The ${esc(b.label)} build: ${esc(tankLabel(b.tank, store.scene.units))} with the animals">` : ''}</div>
<div class="bpHead"><b>${esc(b.label)}</b>${twin ? `<span class="spNote">same gear as ${esc(twin.label)}</span>` : ''}</div>
<div class="spNote">${esc(b.blurb)}</div>
<div class="bpNums"><span><b>${usd(b.setupUsd)}</b>set-up${b.savingUsd ? `<i>${usd(b.listUsd)} before deals</i>` : ''}</span><span><b>${usd(b.upkeepUsdMo)}</b>a month</span><span><b>${b.minPerWeek}</b>min a week</span></div>
<ul class="bpGear">${b.gear.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
${deals ? `<ul class="bpDeals">${deals}</ul>` : ''}
${meetsNeeds(b) ? '' : '<div class="spWarn">No filter on the list carries these animals in this tank.</div>'}
<button type="button" class="primary" data-act="pick" data-i="${i}">Pick this one</button></li>`;
  };

  const draw = () => {
    const scroll = el.scrollTop, a = animals.map(x => `${x.n} ${esc(getSpecies(x.species)?.name ?? x.species)}`).join(', ');
    el.innerHTML = `<div class="spHead"><h2>${['One way', 'Two ways', 'Three ways'][builds.length - 1] ?? 'Ways'} to build it</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<p class="spNote">${esc(tankLabel(builds[0].tank, store.scene.units))} for ${a}. Each is a whole ${builds[0].setup.water.on ? 'tank: tank, filter, heater and light' : 'terrarium: enclosure, heat, UVB, thermostat and misting'}. Prices are expected costs with the live deals that fit.</p>
<ul class="bpCards">${builds.map(card).join('')}</ul>
<div class="spFoot">${back ? '<button type="button" class="spLink" data-act="back">Back to the animals</button>' : ''}<span class="spNote">Pick one and it opens in the editor with everything still yours to change.</span></div>`;
    el.scrollTop = scroll;
  };

  const pick = (i: number) => {
    const b = builds[i];
    if (b.bundle) pinDeal(b.bundle); // before the load that follows promotes it: the demand panel prices the bundle in place of its parts
    const next = sceneForBuild(b, store.scene.units);
    carryPairs(store.tank, next.tanks[next.active]); // the pairings set on the stocking screen, onto the build's new fish (2026-10-22)
    store.replace(next);
    close(); store.seal();
    status(`${b.label} build opened in the editor: ${tankLabel(b.tank, store.scene.units)}, ${usd(b.setupUsd)} set-up. The look is yours to change; Undo steps back.`);
    for (const fn of [...listeners]) fn({ build: b, animals });
  };

  el.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b) return;
    const i = +(b.dataset.i ?? -1);
    switch (b.dataset.act) {
      case 'close': close(); break;
      case 'back': close(); back?.(); break;
      case 'pick': pick(i); break;
    }
  };

  /** Open the screen for these animals in this tank (tankfit's answer or the step the user chose); `onBack` returns to the stocking screen. */
  const open = (a: AnimalCount[], tank: Parameters<typeof buildsFor>[1], onBack?: () => void) => {
    animals = a; back = onBack; builds = distinctBuilds(buildsFor(a, tank)); // lane RF: the same gear is one choice, whatever the price
    side(true); pics = []; shoot(); show(1);
    el.hidden = false; draw();
  };
  return { open, close };
}
