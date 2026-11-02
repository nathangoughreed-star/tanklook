// Guided Visual Discovery, the screens (lane VD3, 2026-11-02). The Guided entry since Nathan's 2026-11-02 answer (plan question 2): New >
// Guided opens Environment directly. One dialog built here (no index.html markup): a step rail, picture tiles, Back on every step, Next
// when a step already holds a pick, nothing disabled. Tiles are flat runtime placeholders in the family's colour; a file at
// public/art/discovery/<id>.webp (density: <archetype>-<density>.webp) replaces one when it exists, and a missing file removes its <img>
// quietly. Picks are saved in the brief (`vision`) as they are made, so a refresh keeps them. Logic: ./logic.ts (pure, tested).
import { archetype, family, type Archetype, type Card, type Family } from '../../scene/archetypes';
import { minOf, setVision, visionOf, type Vision } from '../../scene/brief';
import { recordTaste, recordWish } from '../../demand/taste';
import { editBrief, getBrief, lockedStock, setLook } from '../setupBrief';
import { getTankModel } from '../../data/tanks';
import type { Store } from '../../scene/store';
import type { TankSetup } from '../../scene/types';
import { STOP_OF, recipeDensAt } from '../../scene/recipes';
import { Previews, rosterOf, tankChoice, tankOptions, type TankChoice } from './tiles';
import {
  CARD_COLOUR, DENSITIES, DENSITY_CARD, STEP_ASK, STEP_LABEL, addLike, alternativeOf, archetypeChoices, depsLine, envChoices, familyChoices, firstOpen, knownOf,
  nextOf, pickAlternative, prevOf, recipeOf, sceneFor, setPick, settle, stepsOf, waterChoices, type Known, type Picks, type VStep,
} from './logic';

export interface DiscoveryHost {
  status(m: string, bad?: boolean): void;
  /** The animal screen (GV4's roster): "I already know my animals". */ stocking(): void;
  /** An empty tank, no questions (false when the person cancelled). */ sandbox?(): boolean;
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

export function attachDiscovery(store: Store, host: DiscoveryHost) {
  const base = import.meta.env.BASE_URL;
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg startdlg vd'; dlg.setAttribute('aria-labelledby', 'vdTitle');
  dlg.innerHTML = `<form method="dialog" class="libhead"><h2 id="vdTitle">Guided setup</h2><button value="close" aria-label="Close">✕</button></form>
<ol class="vd-rail" aria-label="Steps"></ol><h3 class="vd-ask"></h3><p class="hint vd-note" role="status"></p>
<p class="hint vd-tank" hidden></p><div class="vd-panel" hidden></div><div class="vd-tiles"></div>
<p class="vd-nav"><button type="button" data-vd="back">Back</button> <button type="button" class="primary" data-vd="next">Next</button> <span class="hint">Welfare checks always apply; they are not a setting.</span></p>
<p class="hint vd-links"><button type="button" class="linkbtn" data-vd="animals">I already know my animals</button>${host.sandbox ? ' · <button type="button" class="linkbtn" data-vd="sandbox">Switch to Sandbox: an empty tank, no questions</button>' : ''}${host.browse ? ' · <button type="button" class="linkbtn" data-vd="deals">On sale now and bundles</button> · <button type="button" class="linkbtn" data-vd="saved">Starter tanks and saved tanks</button>' : ''}</p>`;
  document.body.append(dlg);
  const dock = document.createElement('nav'); dock.className = 'vd-dock'; dock.hidden = true; dock.setAttribute('aria-label', 'Guided');
  dock.innerHTML = '<button type="button" class="primary" data-vd="resume">Next: pick the look for these animals</button><button type="button" class="linkbtn" data-vd="hide" aria-label="Hide">✕</button>';
  document.body.append(dock);
  const q = <T extends HTMLElement>(s: string) => dlg.querySelector<T>(s)!;
  const tankLine = q('.vd-tank'), rail = q('.vd-rail'), ask = q('.vd-ask'), note = q('.vd-note'), panel = q('.vd-panel'), tiles = q('.vd-tiles');
  const back = q<HTMLButtonElement>('[data-vd="back"]'), next = q<HTMLButtonElement>('[data-vd="next"]');

  // the density slider (step 5): stops 0..4 (0 Open, 2 A Bit of Both, 4 Full); the picture shown follows `stopNow`, the rest draw in behind it
  let stopNow = 2, sliderOn = false, curA: Archetype | undefined, curTc: TankChoice | undefined;
  let at: VStep = 'environment', known: Known = knownOf([]), soonId: string | undefined, tankPick: string | undefined, token = 0;
  const previews = new Previews(host.shot);

  // what the person already fixed: the locked roster in the brief and the animals in the tank; the brief's tank
  const knownNow = (): Known => {
    const b = getBrief(), roster = [...lockedStock(b).map(a => a.species), ...store.tank.fish.map(f => f.species)];
    const model = (b.items['constraints.existingTank'] ?? b.items['equipment.tank'])?.value as { model?: string } | undefined, m = model?.model ? getTankModel(model.model) : undefined;
    return knownOf(roster, m?.ratedGal);   // only a tank the person chose prunes by size (the animal screen's placeholder tank is not a choice)
  };
  const vision = (): Vision => visionOf(getBrief());
  const picksOf = (v: Vision): Picks => { const { secondaryLikes: _s, renderRecipe: _r, ...p } = v; return p; };
  const save = (p: Picks) => editBrief(b => { const v = visionOf(b); return setVision(b, { ...p, secondaryLikes: v.secondaryLikes, ...(v.renderRecipe ? { renderRecipe: v.renderRecipe } : {}) }); });
  const picks = (): Picks => settle(picksOf(vision()), known).picks;

  function drawRail(p: Picks) {
    const { auto } = settle(p, known), steps = stepsOf(p);
    rail.innerHTML = steps.map(s => {
      const cur = s === at, done = !cur && steps.indexOf(s) < steps.indexOf(at);
      return `<li class="vd-r${cur ? ' current' : done ? ' done' : ''}${auto.includes(s) ? ' auto' : ''}"${cur ? ' aria-current="step"' : ''}><button type="button" data-rail="${s}"${auto.includes(s) ? ' title="Answered by your animals"' : ''}>${STEP_LABEL[s]}</button></li>`;
    }).join('') + '<li class="vd-r"><span>Make it your own</span></li>';
  }
  const cardTile = (c: Card, on: boolean) => tileHtml({ id: c.id, name: c.name, line: c.tagline, colour: CARD_COLOUR[c.id] ?? '#5f7f6a', art: c.id, on }, base);
  const famTile = (f: Family, on: boolean) => tileHtml({ id: f.id, name: f.name, line: f.tagline, colour: f.colour, art: f.id, on }, base);
  const archTile = (a: Archetype, on: boolean, tc?: TankChoice) => {
    const soon = a.support === 'coming-soon', sh = tc && !soon ? previews.shotOf(a, 2, tc.model, inHand()) : undefined;
    return tileHtml({ id: a.id, name: a.name, line: a.tagline, colour: family(a.familyId)?.colour ?? '#5f7f6a', art: a.id, on, soon, ...(tc && !soon && host.shot ? { shot: sh?.url, wait: !sh, ms: sh?.ms } : {}) }, base);
  };

  // the tank the pictures of steps 4 and 5 are drawn in: the same for every tile of both steps (the family's archetypes decide it), the person's own
  // when the brief names one, else a labelled suggestion they can change; animals already in the tank keep their tank (its own gear and size)
  const inHand = (): TankSetup | undefined => store.tank.fish.length ? store.tank : undefined;
  const briefTank = () => { const b = getBrief(), v = (b.items['constraints.existingTank'] ?? b.items['equipment.tank'])?.value as { model?: string } | undefined; return v?.model ? getTankModel(v.model) : undefined; };
  const tankOf = (p: Picks): TankChoice | undefined => {
    const arches = archetypeChoices(p, known).items, hand = inHand();
    return tankChoice(arches, { yours: briefTank(), pick: tankPick, floorGal: minOf(getBrief(), 'constraints.tankGal'), animals: hand ? rosterOf(hand) : undefined });
  };
  /** The order the slider's stops are drawn in: the one on show, then the two ends, then the steps between. */
  const STOP_ORDER = [2, 0, 4, 1, 3];
  const jobsOf = (p: Picks, tc: TankChoice): { a: Archetype; stop: number; pick: string }[] => {
    const hand = inHand();
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
    const hand = inHand(), put = (el: Element | null, stop: number) => {
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
    const jobs = jobsOf(p, tc), hand = inHand();
    const step = () => {
      if (me !== token || !dlg.open) return;
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
    tankLine.hidden = !tc || !host.shot || (at !== 'archetype' && at !== 'density');
    if (tankLine.hidden || !tc) { tankLine.innerHTML = ''; return; }
    if (inHand()) { tankLine.textContent = 'Pictures are drawn in your tank, with your animals.'; return; }
    const opts = tankOptions(archetypeChoices(picks(), known).items), sel = tc.source === 'yours' ? '' : `<select data-vd="tank" aria-label="Tank for the pictures">${opts.map(m => `<option value="${esc(m.id)}"${m.id === tc.model.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`;
    tankLine.innerHTML = tc.source === 'yours' ? `Pictures are drawn in your tank: <b>${esc(tc.model.name)}</b>.`
      : `Pictures use a <b>suggested tank</b>, not one you have: ${esc(tc.model.name)}, ${esc(tc.why)}. Change it: ${sel}`;
  }

  function draw() {
    const p = picks();
    drawRail(p);
    ask.textContent = STEP_ASK[at];
    const lines: string[] = [];
    if (known.roster.length) lines.push(`Showing what suits your animals${known.gallons ? ` in ${known.gallons} gal` : ''}.`);
    let loose = false, html = ''; sliderOn = false;
    const tc = (at === 'archetype' || at === 'density') ? tankOf(p) : undefined;
    if (at === 'environment') { const c = envChoices(known); loose = c.loose; html = c.items.map(x => cardTile(x, p.environment === x.id)).join(''); }
    else if (at === 'water') { const c = waterChoices(known); loose = c.loose; html = c.items.map(x => cardTile(x, p.waterType === x.id)).join(''); }
    else if (at === 'family') { const c = familyChoices(p, known); loose = c.loose; html = c.items.map(x => famTile(x, p.familyId === x.id)).join(''); }
    else if (at === 'archetype') { const c = archetypeChoices(p, known); loose = c.loose; html = c.items.map(x => archTile(x, p.archetypeId === x.id, tc)).join(''); }
    else {
      const a = p.archetypeId ? archetype(p.archetypeId) : undefined;
      if (a && tc && host.shot && a.support !== 'coming-soon') {
        sliderOn = true; curA = a; curTc = tc; stopNow = p.densityStop ?? (p.density ? STOP_OF[p.density] : 2);
        html = sliderHtml();
      } else if (a) {
        html = DENSITIES.map(d => {
          const pers = !!(tc && host.shot && a.support !== 'coming-soon'), sh = pers ? previews.shotOf(a, STOP_OF[d], tc!.model, inHand()) : undefined;
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
    back.hidden = !prevOf(at, p, known);
    const has = at === 'environment' ? !!p.environment : at === 'water' ? !!p.waterType : at === 'family' ? !!p.familyId : at === 'archetype' ? !!p.archetypeId : sliderOn || !!p.density;
    next.hidden = !has; next.textContent = at === 'density' ? 'Make it your own' : 'Next';
  }
  function drawPanel() {
    const a = soonId && at === 'archetype' ? archetype(soonId) : undefined;
    panel.hidden = !a; if (!a) { panel.innerHTML = ''; return; }
    const alt = alternativeOf(a);
    panel.innerHTML = `<b>${esc(a.name)}</b> <i class="vd-badge">Reference / Coming soon</i>
<p>We saved it to your likes. ${esc(depsLine(a) || 'We can\'t draw it faithfully yet.')} No price: we only price a setup we can build.</p>
<p class="vd-acts">${alt ? `<button type="button" class="primary" data-vd="alt">${esc(alt.name)}: closest we can build today</button> ` : ''}<button type="button" data-vd="explore">Keep exploring</button></p>`;
  }

  const go = (s: VStep | 'done') => { soonId = undefined; if (s === 'done') finish(); else { at = s; draw(); } };
  function choose(id: string) {
    const p = picks();
    if (at === 'archetype' && archetype(id)?.support === 'coming-soon') {
      // spec 08: save the interest, record a wish (not a pick), say what can't be drawn, offer the closest buildable one; never the pick itself
      editBrief(b => { const v = visionOf(b); return recordWish(setVision(b, { ...v, secondaryLikes: addLike(v.secondaryLikes, id) }), id); });
      soonId = id; draw(); panel.scrollIntoView?.({ block: 'nearest' }); return;
    }
    const n = setPick(p, at, id, known); save(n);
    go(nextOf(at, n, known));
  }
  function finish() {
    const p = picks(), a = p.archetypeId ? archetype(p.archetypeId) : undefined;
    if (!a || !p.density) { go(firstOpen(p, known)); return; }
    const stop = p.densityStop ?? STOP_OF[p.density], r = recipeOf(a, p.density);
    if (!r) { go('archetype'); return; }
    const b0 = getBrief(), tc = tankOf(p), hand = inHand();
    // the scene the person saw in the density step (same build, tank and composition), not a new layout; density = the recipe's stops
    const pv = tc && previews.scenesOf(a, tc.model, hand), T: TankSetup = pv ? pv.stop(stop) : sceneFor(a, r, hand, briefTank()?.id);
    r.dens = recipeDensAt(a, stop);
    // the scene replaces the tank's contents; the brief (which lives in the tank) is carried over with the recipe written into it
    let keep = setVision(b0, { ...visionOf(b0), ...p, renderRecipe: r });
    if (r.look !== 'none') keep = recordTaste(setLook(keep, r.look, 'preference'), { style: r.look, kind: 'pick', variant: `vd:${a.id}` });
    store.update(s => { Object.assign(s.tanks[s.active], structuredClone(T)); }, { coalesce: 'discovery' });
    editBrief(() => keep); store.seal();
    dlg.close();
    host.status(`${a.name}, ${STOP_NAME[stop].toLowerCase()}, opened in the editor. Make it your own: change anything; Undo steps back.${a.support === 'partial' && a.deps.length ? ' ' + depsLine(a) : ''}`);
  }

  dlg.addEventListener('error', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.remove(); }, true);
  dlg.addEventListener('load', e => { const t = e.target; if (t instanceof HTMLImageElement && t.classList.contains('vd-img')) t.classList.add('ok'); }, true);
  dlg.addEventListener('close', () => { token++; });
  tankLine.addEventListener('change', e => { const t = e.target as HTMLSelectElement; if (t.dataset.vd === 'tank') { tankPick = t.value; draw(); } });
  const moveTo = (n: number, commit: boolean) => {
    stopNow = Math.max(0, Math.min(4, Math.round(n))); const rg = tiles.querySelector<HTMLInputElement>('.vd-range'); if (rg) rg.value = String(stopNow);
    // the stop on show draws first when it is not ready yet
    if (curTc && curA && !previews.shotOf(curA, stopNow, curTc.model, inHand())) drawShots(picks(), curTc);
    paintStops(); if (commit) save(setPick(picks(), 'density', String(stopNow), known));
  };
  tiles.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.classList.contains('vd-range')) moveTo(Number(t.value), false); });
  tiles.addEventListener('change', e => { const t = e.target as HTMLInputElement; if (t.classList.contains('vd-range')) moveTo(Number(t.value), true); });
  dlg.addEventListener('click', e => {
    const end = (e.target as HTMLElement).closest<HTMLElement>('[data-stop]'); if (end) { moveTo(Number(end.dataset.stop), true); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-pick],[data-vd],[data-rail]'); if (!t) return;
    if (t.dataset.pick) { choose(t.dataset.pick); return; }
    if (t.dataset.rail) { const s = t.dataset.rail as VStep, p = picks(), steps = stepsOf(p); if (steps.indexOf(s) <= steps.indexOf(at) || firstOpen(p, known) === 'done' || steps.indexOf(s) <= steps.indexOf(firstOpen(p, known) as VStep)) go(s); return; }
    const p = picks();
    switch (t.dataset.vd) {
      case 'back': { const s = prevOf(at, p, known); if (s) go(s); break; }
      case 'next': if (at === 'density' && sliderOn) save(setPick(p, 'density', String(stopNow), known)); go(nextOf(at, p, known)); break;
      case 'alt': { const a = soonId ? archetype(soonId) : undefined, alt = a && alternativeOf(a); if (alt) { save(pickAlternative(p, alt)); go('density'); } break; }
      case 'explore': soonId = undefined; draw(); break;
      case 'animals': { dlg.close(); const keep = getBrief(); host.stocking(); if (getBrief() !== keep) editBrief(() => keep); dock.hidden = false; break; }
      case 'sandbox': if (host.sandbox?.()) dlg.close(); break;
      case 'deals': case 'saved': dlg.close(); host.browse?.(t.dataset.vd === 'deals' ? 'new' : 'open'); break;
    }
  });
  dock.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-vd]'); if (!t) return;
    dock.hidden = true; if (t.dataset.vd === 'resume') open();
  });

  /** Open at the first step still waiting (a roster usually starts it at Family; a finished path shows Density). */
  function open() {
    dock.hidden = true; soonId = undefined; known = knownNow();
    const p = picks(), s = firstOpen(p, known);
    at = s === 'done' ? 'density' : s;
    if (!dlg.open) dlg.showModal();
    draw(); (tiles.querySelector('button') as HTMLElement | null)?.focus();
  }
  return { open, close: () => dlg.close(), dialog: dlg };
}
