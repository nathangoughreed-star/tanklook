// Guided Visual Discovery, the screens (lane VD3, 2026-11-02). The Guided entry since Nathan's 2026-11-02 answer (plan question 2): New >
// Guided opens Environment directly. One dialog built here (no index.html markup): a step rail, picture tiles, Back on every step, Next
// when a step already holds a pick, nothing disabled. Tiles are flat runtime placeholders in the family's colour; a file at
// public/art/discovery/<id>.webp (density: <archetype>-<density>.webp) replaces one when it exists, and a missing file removes its <img>
// quietly. Picks are saved in the brief (`vision`) as they are made, so a refresh keeps them. Logic: ./logic.ts (pure, tested).
import { archetype, family, type Archetype, type Card, type Family } from '../../scene/archetypes';
import { getSpecies } from '../../data/species';
import { getItem, minOf, rangeOf, setItem, setVision, valueOf, visionOf, type Vision } from '../../scene/brief';
import { handOff, lookUnchanged } from '../../scene/reeval';
import { buildsFor } from '../../scene/builds';
import { recordTaste, recordWish } from '../../demand/taste';
import { budgetOf, editBrief, getBrief, lockedStock, setLook, spaceOf } from '../setupBrief';
import { getTankModel, type TankModel } from '../../data/tanks';
import type { Store } from '../../scene/store';
import type { TankSetup } from '../../scene/types';
import { STOP_OF, recipeDensAt } from '../../scene/recipes';
import { Previews, rosterOf, sceneWithAnimals, tankChoice, tankOptions, type TankChoice } from './tiles';
import { addAnimal, dropAnimal, stockingSuggestion, suitableAnimals } from './animals';
import { fitIn, type AnimalCount } from '../../scene/tankfit';
import type { SpaceLimit } from '../../scene/types';
import {
  ANY_WORLD, CARD_COLOUR, DENSITIES, DENSITY_CARD, STEP_ASK, WORLD_REASK, addLike, alternativeOf, animalsFirstSteps, archetypeChoices, depsLine, envChoices, familyChoices,
  firstIn, knownOf, landing, lookFirstSteps, nextIn, pickAlternative, prevIn, recipeOf, sceneFor, setPick, settle, stepReady, waterChoices, type Known, type Picks, type Route, type VStep,
} from './logic';

export interface DiscoveryHost {
  status(m: string, bad?: boolean): void;
  /** The animal screen (GV4's roster): "I already know my animals". */ stocking(): void;
  /** An empty tank, no questions (false when the person cancelled). */ sandbox?(): boolean | Promise<boolean>;
  /** The deals / starters / saved-tank lists. */ browse?(menu: 'new' | 'open'): void;
  /** Draw a scene from the editor's viewer and return a small picture of it ('' when nothing can be pictured); steps 4 and 5 show these personalized renders (lane VD6). Absent = flat tiles. */
  shot?(T: TankSetup): string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ENV_WORD = { aquarium: 'an aquarium', terrarium: 'a terrarium', paludarium: 'a paludarium' } as const;

/** One placeholder tile. Pure markup. */
export function tileHtml(o: { id: string; name: string; line: string; colour: string; art: string; on: boolean; soon?: boolean; sub?: string; shot?: string; wait?: boolean; ms?: number }, base = '/'): string {
  return `<button type="button" class="vd-tile${o.on ? ' on' : ''}${o.soon ? ' vd-soon-tile' : ''}" data-pick="${esc(o.id)}" aria-pressed="${o.on}" style="--vd-c:${esc(o.colour)}">`
    + `<span class="vd-art${o.wait ? ' vd-wait' : ''}"><span class="vd-ph" aria-hidden="true">${esc(o.wait ? 'Drawing in your tank…' : o.name)}</span>`
    + (o.shot ? `<img class="vd-shot" src="${o.shot}" alt="${esc(o.name)} in your tank"${o.ms ? ` data-ms="${o.ms}"` : ''}>` : o.wait ? '' : `<img class="vd-img" src="${esc(base + 'art/discovery/' + o.art + '.webp')}" alt="" loading="lazy" decoding="async">`)
    + `${o.soon ? '<i class="vd-badge">Coming soon</i>' : ''}</span>`
    + `<b>${esc(o.name)}</b>${o.sub ? `<span class="vd-sub">${esc(o.sub)}</span>` : ''}<span class="vd-line">${esc(o.line)}</span></button>`;
}

/** One breadcrumb for the shell to draw: the step, its label, and where it stands. */
export interface CrumbState { id: VStep; label: string; state: 'done' | 'current' | 'todo' }
/** What the shell (Guided Setup Rev 03, lane GS4) tells the mounted discovery. Every field is optional: with none, discovery reads the store and the brief as
 *  it always did (the old Guided dialog, `attachDiscovery` below). */
export interface DiscoveryOpts {
  /** Look First walks Water -> Family -> Look -> Density -> Animals; Animals First walks Family -> Look -> Density with the animals the shell passes. */
  route: Route;
  /** The world from shared onboarding; 'open' = "Open to anything": Look First then asks the world itself, right before Water. Absent = discovery asks it (old dialog). */
  world?: 'aquarium' | 'terrarium' | 'paludarium' | 'open';
  /** The animals already chosen (Animals First); absent = the locked stock and the animals in the tank. */
  roster?: AnimalCount[];
  /** The tank the person has: its pictures and starting scene use it either way, and only 'required' means nothing else is suggested. Absent = the brief's tank (required). */
  tank?: { model: TankModel; use: 'required' | 'available' };
  /** Known limits (from the shell's Limits step); absent = read from the brief. */
  limits?: { floorGal?: number; maxGal?: number; maxSpace?: SpaceLimit; budgetKnown?: boolean };
  /** The old dialog owns the World step and offers "Open to anything" itself. */
  ownsWorld?: boolean;
  /** A catalogue tank id the person already confirmed (Animals First's enclosure step): the pictures start in it, as if they had chosen it from the tank list here. */
  pickTank?: string;
  /** The person changed the tank here (the tank list): the shell keeps the project's enclosure the same. */
  onTankPick?(id: string): void;
  /** Show Back on the first step too (the shell takes it back to its own previous step through onExit('back')). */
  allowBack?: boolean;
  /** The shell draws the breadcrumb: only this route's steps, Water and World hidden when irrelevant or resolved. */
  onCrumbs?(steps: CrumbState[], current: VStep): void;
  /** The Suitable Animals the person chose before (Look First): the shell keeps them in the project state as unlocked suggestions and hands them back here. */
  suggested?: AnimalCount[];
  /** Every change of those suggestions (the shell writes them to the project state, never as locked animals). */
  onSuggested?(animals: AnimalCount[]): void;
  /** 'editor': the person finished and the scene has replaced the tank's contents (the only place that happens); 'back': Back on the first step. */
  onExit?(kind: 'editor' | 'back'): void;
}
export interface Mounted { destroy(): void; /** start again at the first step still waiting */ restart(): void; /** jump to a step the person has reached; false when it is not reachable yet */ goTo(step: VStep): boolean; /** stop drawing in the background (the shell hid it) */ stop(): void }

/** Discovery rendered into `root`: no dialog and no rail of its own (the shell has both). */
export function mountDiscovery(store: Store, host: DiscoveryHost, root: HTMLElement, opts: DiscoveryOpts): Mounted {
  const base = import.meta.env.BASE_URL, route = opts.route, ownsWorld = !!opts.ownsWorld;
  root.innerHTML = `<h3 class="vd-ask"></h3><p class="hint vd-note" role="status"></p>
<p class="hint vd-tank" hidden></p><div class="vd-panel" hidden></div><div class="vd-tiles"></div>
<p class="vd-nav"><button type="button" data-vd="back">Back</button> <button type="button" class="primary" data-vd="next">Next</button> <button type="button" data-vd="skipanimals" hidden>Skip: I'll choose animals in the editor</button> <span class="hint">Welfare checks always apply; they are not a setting.</span></p>`;
  let live = true;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const tankLine = q('.vd-tank'), ask = q('.vd-ask'), note = q('.vd-note'), panel = q('.vd-panel'), tiles = q('.vd-tiles');
  const back = q<HTMLButtonElement>('[data-vd="back"]'), next = q<HTMLButtonElement>('[data-vd="next"]'), skip = q<HTMLButtonElement>('[data-vd="skipanimals"]');

  // the density slider (step 5): stops 0..4 (0 Open, 2 A Bit of Both, 4 Full); the picture shown follows `stopNow`, the rest draw in behind it
  let stopNow = 2, sliderOn = false, curA: Archetype | undefined, curTc: TankChoice | undefined;
  let at: VStep = 'environment', known: Known = knownOf([]), soonId: string | undefined, tankPick: string | undefined = opts.pickTank, token = 0;
  // GS3: "Open to anything" was picked at World, and the animals added at the Suitable Animals step (both local until GS4 moves them onto GS2's project state)
  // (lane GS4: the shell hands the animals back in `suggested` and hears every change, so a refresh or revisit keeps them; Open to anything is the project's world 'any')
  let worldOpen = false, chosen: AnimalCount[] = opts.suggested ? [...opts.suggested] : [];
  const setChosen = (c: AnimalCount[]) => { if (JSON.stringify(c) === JSON.stringify(chosen)) return; chosen = c; opts.onSuggested?.(c); };
  const previews = new Previews(host.shot);

  // what the person already fixed: the animals the shell passes (else the locked roster in the brief and the animals in the tank) and the tank they have
  const knownNow = (): Known => {
    const b = getBrief(), roster = opts.roster ? opts.roster.map(r => r.species) : [...lockedStock(b).map(a => a.species), ...store.tank.fish.map(f => f.species)];
    const m = opts.tank?.model ?? briefTank();
    return knownOf(roster, m?.ratedGal);   // only a tank the person chose prunes by size (the animal screen's placeholder tank is not a choice)
  };
  const vision = (): Vision => visionOf(getBrief());
  const picksOf = (v: Vision): Picks => { const { secondaryLikes: _s, renderRecipe: _r, ...p } = v; return worldOpen ? { ...p, worldOpen } : p; };
  const save = (p: Picks) => { worldOpen = !!p.worldOpen; const { worldOpen: _w, ...rest } = p; editBrief(b => { const v = visionOf(b); return setVision(b, { ...rest, secondaryLikes: v.secondaryLikes, ...(v.renderRecipe ? { renderRecipe: v.renderRecipe } : {}) }); }); };
  const picks = (): Picks => settle(picksOf(vision()), known).picks;

  /** The breadcrumb: only this route's steps, and only the ones still the person's to take (a step the animals answered, or one that does not apply, such as Water
   *  for a terrarium, is left out rather than greyed: Rev 03 section 8). The shell draws it. */
  function drawCrumbs(p: Picks) {
    const list = (route === 'look' ? lookFirstSteps : animalsFirstSteps)(p, known, ownsWorld), cur = list.findIndex(c => c.id === at);
    opts.onCrumbs?.(list.map((c, i) => ({ ...c, state: c.id === at ? 'current' : i < cur ? 'done' : 'todo' })), at);
  }
  const cardTile = (c: Card, on: boolean) => tileHtml({ id: c.id, name: c.name, line: c.tagline, colour: CARD_COLOUR[c.id] ?? '#5f7f6a', art: c.id, on }, base);
  const famTile = (f: Family, on: boolean) => tileHtml({ id: f.id, name: f.name, line: f.tagline, colour: f.colour, art: f.id, on }, base);
  const archTile = (a: Archetype, on: boolean, tc?: TankChoice) => {
    const soon = a.support === 'coming-soon', sh = tc && !soon ? previews.shotOf(a, 2, tc.model, inHand(tc.model)) : undefined;
    return tileHtml({ id: a.id, name: a.name, line: a.tagline, colour: family(a.familyId)?.colour ?? '#5f7f6a', art: a.id, on, soon, ...(tc && !soon && host.shot ? { shot: sh?.url, wait: !sh, ms: sh?.ms } : {}) }, base);
  };

  // the tank the pictures of steps 4 and 5 are drawn in: the same for every tile of both steps (the family's archetypes decide it), the person's own
  // when the brief names one, else a labelled suggestion they can change; animals already in the tank keep their tank (its own gear and size)
  /** The animals already in (the shell's roster, else the ones in the tank). */
  const handAnimals = (): AnimalCount[] | undefined => { const r = opts.roster ?? (store.tank.fish.length ? rosterOf(store.tank) : undefined); return r?.length ? r : undefined; };
  const handSetups = new Map<string, TankSetup>();
  /** The tank those animals are in, as a scene: the store's own when they live there, else the balanced build the shell's roster needs in `model`. */
  const inHand = (model?: TankModel): TankSetup | undefined => {
    if (!opts.roster) return store.tank.fish.length ? store.tank : undefined;
    if (!opts.roster.length || !model) return undefined;
    const k = model.id + '|' + opts.roster.map(r => r.species + r.n).join(',');
    if (!handSetups.has(k)) handSetups.set(k, buildsFor(opts.roster, model)[2].setup);
    return handSetups.get(k);
  };
  const briefTank = (): TankModel | undefined => { const b = getBrief(), v = (b.items['constraints.existingTank'] ?? b.items['equipment.tank'])?.value as { model?: string } | undefined; return v?.model ? getTankModel(v.model) : undefined; };
  const tankOf = (p: Picks): TankChoice | undefined => {
    const arches = archetypeChoices(p, known).items, hand = handAnimals(), b = getBrief(), space = opts.limits?.maxSpace ?? spaceOf(b);
    // the tank they have (Required or Available: the pictures use it either way), else a provisional one worked out from known space, size limits, animals in
    // hand and budget, else an editable example size
    const own = opts.tank ? { yours: opts.tank.model, use: opts.tank.use } : { yours: briefTank(), use: 'required' as const };
    return tankChoice(arches, {
      ...own, pick: tankPick, floorGal: opts.limits ? opts.limits.floorGal : minOf(b, 'constraints.tankGal'), maxGal: opts.limits ? opts.limits.maxGal : rangeOf(b, 'constraints.tankGal').max,
      ...(space ? { maxSpace: space } : {}), budgetKnown: opts.limits ? !!opts.limits.budgetKnown : budgetOf(b) !== undefined, animals: hand,
    });
  };
  /** The order the slider's stops are drawn in: the one on show, then the two ends, then the steps between. */
  const STOP_ORDER = [2, 0, 4, 1, 3];
  const jobsOf = (p: Picks, tc: TankChoice): { a: Archetype; stop: number; pick: string }[] => {
    const hand = inHand(tc.model);
    if (at === 'archetype') return archetypeChoices(p, known).items.filter(a => a.support !== 'coming-soon').map(a => ({ a, stop: 2, pick: a.id })).filter(j => !previews.shotOf(j.a, j.stop, tc.model, hand));
    const a = p.archetypeId ? archetype(p.archetypeId) : undefined;
    return a ? [stopNow, ...STOP_ORDER.filter(x => x !== stopNow)].map(stop => ({ a, stop, pick: String(stop) })).filter(j => !previews.shotOf(j.a, j.stop, tc.model, hand)) : [];
  };
  const STOP_NAME = ['Open & Airy', 'A little fuller', 'A Bit of Both', 'Fuller still', 'Wild & Full'];
  const sliderHtml = (): string => {
    const art = (id: string, cls = '') => `<span class="vd-art ${cls} vd-wait" data-stop-art="${id}"><span class="vd-ph" aria-hidden="true">Drawing in your tank…</span></span>`;
    return `<div class="vd-dens"><div class="vd-dstage">${art('now', 'vd-big')}<b class="vd-dname"></b><span class="vd-dline"></span></div>
<div class="vd-dends"><button type="button" class="vd-end" data-stop="0">${art('0')}<b>${STOP_NAME[0]}</b></button><button type="button" class="vd-end" data-stop="4">${art('4')}<b>${STOP_NAME[4]}</b></button></div>
<div class="vd-dctl"><input type="range" class="vd-range" min="0" max="4" step="1" value="${stopNow}" aria-label="How full: Open, A Bit of Both, Full" aria-valuetext="${STOP_NAME[stopNow]}">
<div class="vd-ticks" aria-hidden="true"><span>${STOP_NAME[0]}</span><span>${STOP_NAME[2]}</span><span>${STOP_NAME[4]}</span></div></div>
<p class="vd-prog hint" role="status"><progress max="5" value="0"></progress> <span></span></p></div>`;
  };
  /** Fill one picture box with its stop's render when there is one (else leave it waiting), and show how much of the slider is drawn. */
  function paintStops() {
    const a = curA, tc = curTc; if (!a || !tc || !sliderOn) return;
    const hand = inHand(tc.model), put = (el: Element | null, stop: number) => {
      if (!el) return;
      const sh = previews.shotOf(a, stop, tc.model, hand);
      el.classList.toggle('vd-wait', !sh);
      el.querySelector('.vd-ph')!.textContent = sh ? a.name : stop === stopNow ? 'Drawing this one in your tank…' : 'Drawing in your tank…';
      el.querySelector('.vd-shot')?.remove();
      if (sh) { const img = document.createElement('img'); img.className = 'vd-shot'; img.src = sh.url; img.alt = `${a.name}, ${STOP_NAME[stop]}, in your tank`; img.dataset.ms = String(sh.ms); el.append(img); }
    };
    put(tiles.querySelector('[data-stop-art="now"]'), stopNow); put(tiles.querySelector('[data-stop-art="0"]'), 0); put(tiles.querySelector('[data-stop-art="4"]'), 4);
    const ready = STOP_ORDER.filter(x => previews.shotOf(a, x, tc.model, hand)).length;
    const nm = tiles.querySelector('.vd-dname'), ln = tiles.querySelector('.vd-dline'), pr = tiles.querySelector<HTMLProgressElement>('.vd-prog progress'), tx = tiles.querySelector('.vd-prog span');
    if (nm) nm.textContent = STOP_NAME[stopNow];
    if (ln) ln.textContent = stopNow === 0 ? a.density.open.note : stopNow === 2 ? a.density.balanced.note : stopNow === 4 ? a.density.full.note : `Between ${STOP_NAME[stopNow - 1].toLowerCase()} and ${STOP_NAME[stopNow + 1].toLowerCase()}.`;
    if (pr) pr.value = ready;
    if (tx) tx.textContent = ready < 5 ? `Drawing your tank at each density: ${ready} of 5 ready. You can move the slider while it draws.` : 'All 5 densities drawn in your tank. Drag to compare.';
    const rg = tiles.querySelector<HTMLInputElement>('.vd-range'); if (rg) rg.setAttribute('aria-valuetext', STOP_NAME[stopNow]);
  }
  /** Draw the missing pictures one per timer tick (a hidden tab runs no frames), painting each tile as it lands; the UI never waits on them. */
  function drawShots(p: Picks, tc: TankChoice | undefined) {
    const me = ++token; if (!host.shot || !tc || (at !== 'archetype' && at !== 'density')) return;
    const jobs = jobsOf(p, tc), hand = inHand(tc.model);
    const step = () => {
      if (me !== token || !live) return;
      const j = jobs.shift(); if (!j) return;
      const sh = previews.render(j.a, j.stop, tc.model, hand);
      const art = sh && at === 'archetype' && tiles.querySelector(`[data-pick="${j.pick}"] .vd-art`);
      if (sh && at === 'density') paintStops();
      if (art && sh) {
        art.classList.remove('vd-wait'); art.querySelector('.vd-ph')!.textContent = j.a.name; art.querySelector('.vd-shot')?.remove();
        const img = document.createElement('img'); img.className = 'vd-shot'; img.src = sh.url; img.alt = `${j.a.name} in your tank`; img.dataset.ms = String(sh.ms); art.append(img);
      }
      setTimeout(step, 0);
    };
    setTimeout(step, 80);
  }
  function drawTankLine(tc: TankChoice | undefined) {
    tankLine.hidden = !tc || (at === 'animals' ? false : !host.shot || (at !== 'archetype' && at !== 'density'));
    if (tankLine.hidden || !tc) { tankLine.innerHTML = ''; return; }
    if (handAnimals()) { tankLine.textContent = 'Pictures are drawn in your tank, with your animals.'; return; }
    const owned = tc.source === 'owned-required' || tc.source === 'owned-available', sizes = tankOptions(archetypeChoices(picks(), known).items), sel = owned ? '' : `<select data-vd="tank" aria-label="${at === 'animals' ? 'Tank for the animals' : 'Tank for the pictures'}">${sizes.map(m => `<option value="${esc(m.id)}"${m.id === tc.model.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`;
    const what = at === 'animals' ? 'Suggestions are checked against' : 'Pictures use';
    // the enclosure chain (Rev 03 section 4): your tank, else a provisional one worked out from what is known, else an example; the last two can always be changed
    tankLine.innerHTML = owned ? `${at === 'animals' ? 'Suggestions are checked against' : 'Pictures are drawn in'} your tank: <b>${esc(tc.model.name)}</b>${tc.source === 'owned-available' ? ' (you can swap it in the editor)' : ''}.`
      : `${what} a <b>suggested tank</b>, not one you have${tc.basis === 'example' || tc.basis === 'picked' ? '' : ' (provisional)'}: ${esc(tc.model.name)}, ${esc(tc.why)}. Change it: ${sel}`;
  }

  // the Suitable Animals step (Rev 03 section 4): animals that suit the chosen look in the enclosure, one click each, all optional
  const suitMemo = new Map<string, ReturnType<typeof suitableAnimals>>(), setMemo = new Map<string, AnimalCount[]>();
  const keyOf = (a: Archetype, tankId: string, ch: readonly AnimalCount[]) => `${a.id}|${tankId}|${ch.map(c => c.species + c.n).join(',')}`;
  const suitOf = (a: Archetype, tankModel: TankChoice['model']) => { const k = keyOf(a, tankModel.id, chosen); if (!suitMemo.has(k)) suitMemo.set(k, suitableAnimals(a, tankModel, chosen)); return suitMemo.get(k)!; };
  const setOf = (a: Archetype, tankModel: TankChoice['model']) => { const k = keyOf(a, tankModel.id, []); if (!setMemo.has(k)) setMemo.set(k, stockingSuggestion(a, tankModel)); return setMemo.get(k)!; };
  const nameOf = (c: AnimalCount) => `${c.n} ${getSpecies(c.species)?.name ?? c.species}`;   // "6 Cardinal tetra": no plural to get wrong
  const animalsHtml = (p: Picks, tc: TankChoice | undefined): string => {
    const a = p.archetypeId ? archetype(p.archetypeId) : undefined, hand = handAnimals();
    if (!a || !tc) return '<p class="hint">Pick a look first.</p>';
    if (hand) return `<p class="vd-added">The animals you chose come with you: ${esc(hand.map(nameOf).join(', '))}. Change them any time in the editor.</p>`;
    const res = suitOf(a, tc.model), card = (id: string, name: string, line: string, on: boolean) =>
      `<div class="vd-acard${on ? ' on' : ''}"><span class="vd-atxt"><b>${esc(name)}</b><span class="vd-aline">${esc(line)}</span></span><button type="button" ${on ? `data-drop="${esc(id)}">Remove` : `data-add="${esc(id)}">Add`}</button></div>`;
    const added = chosen.map(c => card(c.species, nameOf(c), 'Added', true)).join(''), set = chosen.length ? [] : setOf(a, tc.model);
    return (added ? `<div class="vd-alist">${added}</div>` : '')
      + (set.length ? `<div class="vd-set"><span><b>A ready stocking suggestion:</b> ${esc(set.map(nameOf).join(', '))}</span><button type="button" data-vd="addset">Add this set</button></div>` : '')
      + (res.list.length ? `<div class="vd-alist">${res.list.map(s => card(s.sp.id, s.sp.name, (s.ofLook ? 'Suits this look. ' : '') + s.line, false)).join('')}</div>` : res.note ? `<p class="hint">${esc(res.note)}</p>` : chosen.length ? '<p class="hint">Nothing else suits with these.</p>' : '<p class="hint">Nothing in our list suits this look in this enclosure yet.</p>')
      + (res.tooBig ? `<p class="hint">${res.tooBig} more suit the look but need a bigger enclosure than this one.</p>` : '');
  };

  function draw() {
    const p = picks();
    const lp = landing(route, ownsWorld, at, p, known); if (lp !== 'done') at = lp;   // a step whose earlier steps are unanswered (Density with no look) is never shown
    drawCrumbs(p);
    ask.textContent = at === 'environment' && p.worldOpen ? WORLD_REASK : STEP_ASK[at];
    const lines: string[] = [];
    if (known.roster.length) lines.push(`Showing what suits your animals${known.gallons ? ` in ${known.gallons} gal` : ''}.`);
    let loose = false, html = ''; sliderOn = false;
    const tc = (at === 'archetype' || at === 'density' || at === 'animals') ? tankOf(p) : undefined;
    if (at === 'environment') { const c = envChoices(known, ownsWorld && !p.worldOpen); loose = c.loose; html = c.items.map(x => cardTile(x, x.id !== ANY_WORLD && p.environment === x.id)).join(''); }
    else if (at === 'water') { const c = waterChoices(known); loose = c.loose; html = c.items.map(x => cardTile(x, p.waterType === x.id)).join(''); }
    else if (at === 'family') { const c = familyChoices(p, known); loose = c.loose; html = c.items.map(x => famTile(x, p.familyId === x.id)).join(''); }
    else if (at === 'animals') { html = animalsHtml(p, tc); lines.push('All optional: add none, some or all, and change them in the editor. How full the tank looks never changes how many animals it holds, and welfare checks always apply.'); }
    else if (at === 'archetype') { const c = archetypeChoices(p, known); loose = c.loose; html = c.items.map(x => archTile(x, p.archetypeId === x.id, tc)).join(''); }
    else {
      const a = p.archetypeId ? archetype(p.archetypeId) : undefined;
      if (a && tc && host.shot && a.support !== 'coming-soon') {
        sliderOn = true; curA = a; curTc = tc; stopNow = p.densityStop ?? (p.density ? STOP_OF[p.density] : 2);
        html = sliderHtml();
      } else if (a) {
        html = DENSITIES.map(d => {
          const pers = !!(tc && host.shot && a.support !== 'coming-soon'), sh = pers ? previews.shotOf(a, STOP_OF[d], tc!.model, inHand(tc!.model)) : undefined;
          return tileHtml({ id: d, name: DENSITY_CARD[d].name, sub: a.density[d].label !== DENSITY_CARD[d].name ? a.density[d].label : undefined, line: a.density[d].note, colour: family(a.familyId)?.colour ?? '#5f7f6a', art: `${a.id}-${d}`, on: p.density === d, ...(pers ? { shot: sh?.url, wait: !sh, ms: sh?.ms } : {}) }, base);
        }).join('');
      }
      if (a) {
        lines.push(`${a.name}: the plants, rock and decor change; the animals never do.`);
        if (a.support === 'partial' && a.deps.length) lines.push(`Partly drawn today: ${depsLine(a)}`);
        if (a.resolvesTo && a.resolvesTo !== a.env) lines.push(`Built as ${ENV_WORD[a.resolvesTo]}: it needs real land as well as water.`);
      }
    }
    if (loose) lines.push('None of these hold your animals as they are. Pick one anyway: the editor shows what to change.');
    note.textContent = lines.join(' ');
    tiles.className = `vd-tiles vd-${at}${sliderOn ? ' vd-slidermode' : ''}`; tiles.innerHTML = html;
    drawPanel(); drawTankLine(tc); if (sliderOn) paintStops(); drawShots(p, tc);
    back.hidden = !prevIn(route, ownsWorld, at, p, known) && !opts.allowBack;
    skip.hidden = at !== 'animals';
    const has = stepReady(at, p, known, sliderOn);   // this step's pick is valid for the route, world, water and family now
    next.hidden = !has; next.disabled = !has; next.textContent = at === 'animals' ? 'Continue to Make It Your Own' : 'Next';
  }
  function drawPanel() {
    const a = soonId && at === 'archetype' ? archetype(soonId) : undefined;
    panel.hidden = !a; if (!a) { panel.innerHTML = ''; return; }
    const alt = alternativeOf(a);
    panel.innerHTML = `<b>${esc(a.name)}</b> <i class="vd-badge">Reference / Coming soon</i>
<p>We saved it to your likes. ${esc(depsLine(a) || 'We can\'t draw it faithfully yet.')} No price: we only price a setup we can build.</p>
<p class="vd-acts">${alt ? `<button type="button" class="primary" data-vd="alt">${esc(alt.name)}: closest we can build today</button> ` : ''}<button type="button" data-vd="explore">Keep exploring</button></p>`;
  }

  const go = (s: VStep | 'done') => {
    soonId = undefined; const t = landing(route, ownsWorld, s, picks(), known);   // never past a step still waiting for its pick
    if (t === 'done') finish(); else { at = t; draw(); }
  };
  function choose(id: string) {
    const p = picks();
    if (at === 'archetype' && archetype(id)?.support === 'coming-soon') {
      // spec 08: save the interest, record a wish (not a pick), say what can't be drawn, offer the closest buildable one; never the pick itself
      editBrief(b => { const v = visionOf(b); return recordWish(setVision(b, { ...v, secondaryLikes: addLike(v.secondaryLikes, id) }), id); });
      soonId = id; draw(); panel.scrollIntoView?.({ block: 'nearest' }); return;
    }
    const n = setPick(p, at, id, known); save(n);
    if (n.archetypeId !== p.archetypeId || n.familyId !== p.familyId) setChosen([]);   // the animals were chosen for that look
    if (at === 'environment' && id === ANY_WORLD) { draw(); return; }   // "Open to anything" defers the world: this step asks again, without that card
    go(nextIn(route, ownsWorld, at, n, known));
  }
  function finish() {
    const p = picks(), a = p.archetypeId ? archetype(p.archetypeId) : undefined;
    if (!a || !p.density) { go(firstIn(route, ownsWorld, p, known)); return; }
    const stop = p.densityStop ?? STOP_OF[p.density], r = recipeOf(a, p.density);
    if (!r) { go('archetype'); return; }
    const b0 = getBrief(), tc = tankOf(p);
    // animals added at the Suitable Animals step go into the same scene the density step showed (same tank, look and density, only the animals are new);
    // with a tank in hand its own animals win and nothing is added. Welfare checks run in the editor as on any other path.
    const hand = tc ? inHand(tc.model) : inHand(), fresh = !hand && chosen.length && tc ? sceneWithAnimals(previews, a, tc.model, chosen, stop) : undefined;
    // the scene the person saw in the density step (same build, tank and composition), not a new layout; density = the recipe's stops
    const pv = tc && previews.scenesOf(a, tc.model, hand), T: TankSetup = fresh ?? (pv ? pv.stop(stop) : sceneFor(a, r, hand, (opts.tank?.model ?? briefTank())?.id));
    r.dens = recipeDensAt(a, stop);
    // lane GS6 (Nathan 2026-11-02, one persistent project): the hand-off is an UPDATE of the scene that is there. A pristine scene is taken whole; a design in place keeps its tank, gear and
    // roster and only the look (pieces, ground, background) changes; re-choosing the look already in the editor changes nothing, so hand edits survive. The look's own animals are suggestions:
    // they join the roster only when picked at the Suitable Animals step, and the roster is written to the brief (the desired roster) so the look never discards it.
    let keep = setVision(b0, { ...visionOf(b0), ...p, renderRecipe: r });
    if (r.look !== 'none') keep = recordTaste(setLook(keep, r.look, 'preference'), { style: r.look, kind: 'pick', variant: `vd:${a.id}` });
    const accepted = fresh ? chosen : [];   // with a tank in hand its own animals win and nothing is added
    if (accepted.length) {
      const have = valueOf(keep, 'animals.stock') ?? [];
      keep = setItem(keep, 'animals.stock', [...have.filter(x => !accepted.some(c => c.species === x.species)), ...accepted.map(c => ({ species: c.species, count: c.n }))], getItem(keep, 'animals.stock')?.status ?? 'preference');
    }
    const same = lookUnchanged(store.tank, b0, { archetypeId: a.id, density: p.density, densityStop: stop }, tc?.model.id);
    // Animals First (lane GS5): the roster the shell passed is the person's own stocking, so those animals go into the scene with the look (a roster only in the brief is not in the scene yet)
    const ho = same ? undefined : handOff(store.tank, T, { accept: [...accepted.map(c => c.species), ...(opts.roster ?? []).map(r => r.species)], brief: b0 });
    if (ho) store.update(s => { Object.assign(s.tanks[s.active], structuredClone(ho.scene)); }, { coalesce: 'discovery' });
    editBrief(() => keep); store.seal();
    setChosen([]);
    host.status(`${a.name}, ${STOP_NAME[stop].toLowerCase()}, opened in the editor. ${same ? 'It was already your look: nothing was changed.' : ho && !ho.fresh ? 'Your tank, gear and animals were kept; only the look changed.' : 'Make it your own: change anything;'} Undo steps back.${a.support === 'partial' && a.deps.length ? ' ' + depsLine(a) : ''}`);
    opts.onExit?.('editor');
  }

  root.addEventListener('error', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.remove(); }, true);
  root.addEventListener('load', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.classList.add('ok'); }, true);
  tankLine.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.vd === 'tank') { tankPick = t.value; opts.onTankPick?.(t.value); const m = getTankModel(t.value); if (chosen.length && !(m && !fitIn(chosen, m)?.fails.length)) setChosen([]); draw(); }   // animals that no longer fit the changed tank are dropped
  });
  const moveTo = (n: number, commit: boolean) => {
    stopNow = Math.max(0, Math.min(4, Math.round(n))); const rg = tiles.querySelector<HTMLInputElement>('.vd-range'); if (rg) rg.value = String(stopNow);
    // the stop on show draws first when it is not ready yet
    if (curTc && curA && !previews.shotOf(curA, stopNow, curTc.model, inHand(curTc.model))) drawShots(picks(), curTc);
    paintStops(); if (commit) save(setPick(picks(), 'density', String(stopNow), known));
  };
  tiles.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.classList.contains('vd-range')) moveTo(Number(t.value), false); });
  tiles.addEventListener('change', e => { const t = e.target as HTMLInputElement; if (t.classList.contains('vd-range')) moveTo(Number(t.value), true); });
  root.addEventListener('click', e => {
    const end = (e.target as HTMLElement).closest<HTMLElement>('[data-stop]'); if (end) { moveTo(Number(end.dataset.stop), true); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-pick],[data-vd],[data-add],[data-drop]'); if (!t) return;
    if (t.dataset.pick) { choose(t.dataset.pick); return; }
    if (t.dataset.add || t.dataset.drop) {
      const a = picks().archetypeId ? archetype(picks().archetypeId!) : undefined, tc = tankOf(picks()), s = a && tc && suitOf(a, tc.model).list.find(x => x.sp.id === t.dataset.add);
      if (t.dataset.drop) setChosen(dropAnimal(chosen, t.dataset.drop)); else if (s) setChosen(addAnimal(chosen, s.add));
      draw(); return;
    }
    const p = picks();
    switch (t.dataset.vd) {
      case 'back': { const s = prevIn(route, ownsWorld, at, p, known); if (s) go(s); else opts.onExit?.('back'); break; }
      case 'next': {
        if (!stepReady(at, p, known, sliderOn)) break;   // hidden or not, Next does nothing without a valid pick here
        if (at === 'density' && sliderOn) save(setPick(p, 'density', String(stopNow), known));
        go(nextIn(route, ownsWorld, at, p, known)); break;
      }
      case 'skipanimals': setChosen([]); finish(); break;
      case 'alt': { const a = soonId ? archetype(soonId) : undefined, alt = a && alternativeOf(a); if (alt) { save(pickAlternative(p, alt)); go('density'); } break; }
      case 'explore': soonId = undefined; draw(); break;
      case 'addset': { const a = p.archetypeId ? archetype(p.archetypeId) : undefined, tc = tankOf(p); if (a && tc) setChosen(setOf(a, tc.model).reduce(addAnimal, chosen)); draw(); break; }
    }
  });
  /** Settle what the shell passed (the world, the animals, the tank), then show the first step still waiting (a roster usually starts at Family; a finished path shows Density). */
  function restart() {
    live = true; soonId = undefined; known = knownNow();
    if (opts.world === 'open') worldOpen = true;   // the shell deferred the world: asked here unless it already was
    else if (opts.world) { const p0 = settle(picksOf(vision()), known).picks; if (p0.environment !== opts.world) save(setPick(p0, 'environment', opts.world, known)); }
    const p = picks(), s = firstIn(route, ownsWorld, p, known);
    at = s === 'done' ? 'density' : s;
    draw(); (tiles.querySelector('button') as HTMLElement | null)?.focus();
  }
  /** A step the person has reached (or one before the first still open) can be jumped to; later ones cannot. */
  function goTo(step: VStep): boolean {
    const p = picks(), steps = route === 'look' ? lookFirstSteps(p, known, ownsWorld).map(c => c.id) : animalsFirstSteps(p, known, ownsWorld).map(c => c.id);
    const first = firstIn(route, ownsWorld, p, known), ok = steps.includes(step) && (steps.indexOf(step) <= steps.indexOf(at) || first === 'done' || steps.indexOf(step) <= steps.indexOf(first as VStep));
    if (ok) go(step); return ok;
  }
  return { destroy() { live = false; token++; root.replaceChildren(); }, restart, goTo, stop() { live = false; token++; } };
}

/** The old Guided dialog: its own head, rail and links around the mountable discovery. Kept as a thin wrapper so main keeps working until the new
 *  shell (lane GS4) mounts discovery itself. */
export function attachDiscovery(store: Store, host: DiscoveryHost) {
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg startdlg vd'; dlg.setAttribute('aria-labelledby', 'vdTitle');
  dlg.innerHTML = `<form method="dialog" class="libhead"><h2 id="vdTitle">Guided setup</h2><button value="close" aria-label="Close">✕</button></form>
<ol class="vd-rail" aria-label="Steps"></ol><div class="vd-root"></div>
<p class="hint vd-links"><button type="button" class="linkbtn" data-vd="animals">I already know my animals</button>${host.sandbox ? ' · <button type="button" class="linkbtn" data-vd="sandbox">Switch to Sandbox: an empty tank, no questions</button>' : ''}${host.browse ? ' · <button type="button" class="linkbtn" data-vd="deals">On sale now and bundles</button> · <button type="button" class="linkbtn" data-vd="saved">Starter tanks and saved tanks</button>' : ''}</p>`;
  document.body.append(dlg);
  const dock = document.createElement('nav'); dock.className = 'vd-dock'; dock.hidden = true; dock.setAttribute('aria-label', 'Guided');
  dock.innerHTML = '<button type="button" class="primary" data-vd="resume">Next: pick the look for these animals</button><button type="button" class="linkbtn" data-vd="hide" aria-label="Hide">✕</button>';
  document.body.append(dock);
  const rail = dlg.querySelector<HTMLElement>('.vd-rail')!;
  const m = mountDiscovery(store, host, dlg.querySelector<HTMLElement>('.vd-root')!, {
    route: 'look', ownsWorld: true,
    onCrumbs: steps => { rail.innerHTML = steps.map(c => `<li class="vd-r${c.state === 'current' ? ' current' : c.state === 'done' ? ' done' : ''}"${c.state === 'current' ? ' aria-current="step"' : ''}><button type="button" data-rail="${c.id}">${esc(c.label)}</button></li>`).join('') + '<li class="vd-r"><span>Make it your own</span></li>'; },
    onExit: kind => { if (kind === 'editor') dlg.close(); },
  });
  dlg.addEventListener('close', () => m.stop());
  dlg.addEventListener('click', e => {
    const r = (e.target as HTMLElement).closest<HTMLElement>('[data-rail]'); if (r) { m.goTo(r.dataset.rail as VStep); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('.vd-links [data-vd]'); if (!t) return;
    switch (t.dataset.vd) {
      case 'animals': { dlg.close(); const keep = getBrief(); host.stocking(); if (getBrief() !== keep) editBrief(() => keep); dock.hidden = false; break; }
      case 'sandbox': void Promise.resolve(host.sandbox?.()).then(ok => { if (ok) dlg.close(); }); break;
      case 'deals': case 'saved': dlg.close(); host.browse?.(t.dataset.vd === 'deals' ? 'new' : 'open'); break;
    }
  });
  dock.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-vd]'); if (!t) return;
    dock.hidden = true; if (t.dataset.vd === 'resume') open();
  });
  /** Open at the first step still waiting. */
  function open() { dock.hidden = true; if (!dlg.open) dlg.showModal(); m.restart(); }
  return { open, close: () => dlg.close(), dialog: dlg };
}
