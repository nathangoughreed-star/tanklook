// The stocking screen of path 1, "An animal I want" (lane P5, 2026-10-20), and its fork card. The panel sits over the viewer: search for an
// animal, set how many (graded band messages, male / female counts for species kept by sex), say whether other animals go in with them
// (ranked by compatibility), and watch the bare tank in the viewer step up through catalogue sizes. The fork card answers the fullness
// tile's "Make room or swap..." button. Logic lives in stockPlanLogic.ts (pure, tested); this file draws it and writes the scene.
import { rng } from '../art/paint';
import { CARE } from '../data/care';
import { getSpecies, searchSpecies } from '../data/species';
import { tankFromModel, type TankModel } from '../data/tanks';
import { emptyScene } from '../scene/defaults';
import { placeNew, shuffleFish } from '../scene/scatter';
import type { Store } from '../scene/store';
import type { Fish } from '../scene/types';
import { IDEAL_MAX } from '../scene/stocking';
import type { Viewer } from '../render/viewer';
import { gearView } from '../render/gear3d';
import { tankView } from '../render/tankView';
import { attachBuildPick } from './buildPick';
import { attachStockGallery } from './stockGallery';
import { onSpaceFork, type SpaceFork } from './fullnessTile';
import { grazerShort } from '../data/grazers';
import { animalsInTank, animalsOf, bump, writePairs, FAIL_WORD, groupLineIn, type Pairing, forkOptions, isSexed, notesOf, overWarn, shownLengthMm, planFor, shownLitres, conflictsOf, rankTankmates, tempLinesOf, startPick, tankLabel, totalOf, type Pk, type Plan, type RoomOption } from './stockPlanLogic';
import { sizeTxt } from '../scene/tankfit';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const range = (a: number, b: number, f: (n: number) => string) => a === b ? f(a) : `${f(Math.min(a, b))} to ${f(Math.max(a, b))}`;
const signed = (n: number) => n >= 0 ? `+${usd(n)}` : `-${usd(-n)}`;
const WATER_LEVEL = 1; // tanks start full (Nathan 2026-10-22)
const PAIR_OPTS: [Pairing, string][] = [['established', 'Established'], ['unconfirmed', 'Not confirmed'], ['unknown', "Don't know"]];

export function attachStockPlan(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void, openBtn: HTMLElement) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp'; el.hidden = true; el.setAttribute('aria-label', 'Stocking: the animal I want');
  view.append(el);
  const builds = attachBuildPick(store, viewer, status); // lane P6a: the three-builds screen that "Continue" opens
  void import('./scapePick').then(m => m.attachScapePick(store, viewer, status)); // lane P6b: the scape choice and plan sheet after a build is picked
  const fork = document.createElement('dialog');
  fork.className = 'libdlg forkdlg'; fork.setAttribute('aria-label', 'Make room or swap');
  document.body.append(fork);

  // the side panel steps aside while the screen is up (the view gets the width); not saved as the viewer's preference, and given back on close
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };
  let picks: Pk[] = [], chosen: string | undefined, mates = false, q = '', shown = '';
  // the tank is shown bare here: no filter, heater or stand until the build is chosen (the scene keeps its gear; only the view leaves it out)
  const bare = (on: boolean) => { if (gearView.on === on) { gearView.on = !on; viewer.rebuild(); } };
  // before the first pick there is no tank on show, only the animals to choose from
  const gallery = attachStockGallery(view, id => { if (!picks.some(p => p.id === id)) { picks.push(startPick(id)); q = ''; change(); } }, () => store.scene.units);
  // no tank chosen yet: the animals sit in an invisible box a little smaller than the smallest tank that holds them (Nathan 2026-10-21:
  // the tool does not pick the tank; the user does, and can come back for a bigger one as the stocking grows)
  const ghost = (on: boolean) => { if (tankView.ghost !== on) { tankView.ghost = on; viewer.rebuild(); } };
  const GHOST_SCALE = 0.7;
  let lastBox: TankModel | undefined; // the size the box stands for, while it is on show
  // leaving the screen without a choice: the smallest tank that holds them becomes the real tank, so the editor never gets the box
  const settle = () => {
    if (!tankView.ghost) return;
    // every pick removed: no plan, so the last box's tank at its full size (S207 review: the 0.7 x box used to reach the editor)
    const plan = planFor(picks, chosen), m = plan.need?.tank ?? plan.options.at(-1)?.tank ?? lastBox;
    shown = ''; ghost(false); lastBox = undefined;
    if (m) store.update(s => { const T = s.tanks[s.active]; T.tank = tankFromModel(m); shuffleFish(T, rng(1 + Math.floor(Math.random() * 1e6)), undefined, 100); });
  };
  const close = () => { settle(); el.hidden = true; gallery.show(false); side(false); bare(false); };

  // ---------- the scene follows the picks ----------
  const sync = (rebuild = false) => {
    // the chosen tank, else the invisible box around the smallest size that holds them (it follows the picks: it is not a choice)
    const plan = planFor(picks, chosen), box = plan.tank ? undefined : plan.need?.tank ?? plan.options.at(-1)?.tank, show = plan.tank ?? box;
    const key = show ? `${box ? 'box:' : ''}${show.id}` : '';
    ghost(!plan.tank); // nothing chosen (or nothing picked yet): no tank drawn; set before the update so the fullness tile reads it
    store.update(s => {
      const T = s.tanks[s.active];
      if (show && key !== shown) {
        T.tank = tankFromModel(show); T.water.on = true; T.water.level = WATER_LEVEL; shown = key; rebuild = true;
        if (box) T.tank = { ...T.tank, L: Math.round(T.tank.L * GHOST_SCALE), D: Math.round(T.tank.D * GHOST_SCALE) };
        lastBox = box;
        T.camera = { ...T.camera, zoom: 0.55, el: 20 }; // looking down a little so the bottom dwellers show on the bare floor // the whole tank in view, beside the panel
      }
      T.water.salt = picks.some(p => getSpecies(p.id)?.salt);
      let next = Math.max(0, ...T.fish.map(f => f.id)) + 1;
      const keep: Fish[] = [], added = new Set<number>();
      for (const p of picks) {
        const sp = getSpecies(p.id); if (!sp) continue;
        const have = T.fish.filter(f => f.species === p.id).slice(0, totalOf(p));
        while (have.length < totalOf(p)) { const f: Fish = { id: next++, species: p.id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }; have.push(f); added.add(f.id); }
        have.forEach((f, i) => {
          // sexed species: males, then females, then unsexed (drawn in the default form; a herp's gender left unset = not sexed yet)
          const sexed = isSexed(p.id), female = sexed && i >= p.n && i < p.n + (p.f ?? 0), unsexed = sexed && i >= p.n + (p.f ?? 0);
          if (sp.female) { if (female) f.sex = 'f'; else delete f.sex; }
          if (sexed && (sp.cat === 'reptile' || sp.cat === 'amphibian')) { if (unsexed) delete f.gender; else f.gender = female ? 'f' : 'm'; }
        });
        keep.push(...have);
      }
      T.fish = keep;
      writePairs(T, picks); // saved with the tank for these two animals: survives Save, share links and the build pick
      const r = rng(1 + Math.floor(Math.random() * 1e6));
      if (rebuild) shuffleFish(T, r, undefined, 100); else if (added.size) placeNew(T, r, added);
    }, { coalesce: 'stockplan' });
  };

  // ---------- drawing ----------
  const bandClass = (b: string) => `spb-${b}`;
  const pickRow = (p: Pk, plan: Plan) => {
    const litres = shownLitres(plan);
    const hungry = litres ? grazerShort(p.id, totalOf(p), litres) : null;
    const sp = getSpecies(p.id)!, nt = notesOf(p, store.scene.units), sexed = isSexed(p.id);
    const step = (which: 'n' | 'f' | 'u', label: string, v: number) =>
      `<span class="spStep"><span class="spLab">${label}</span><button type="button" data-act="dec" data-id="${p.id}" data-w="${which}" aria-label="One fewer ${esc(label || sp.name)}"${v <= 0 ? ' disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="inc" data-id="${p.id}" data-w="${which}" aria-label="One more ${esc(label || sp.name)}">+</button></span>`;
    return `<li class="spPick"><div class="spName"><b>${esc(sp.name)}</b><i>${esc(sp.sci)}</i><button type="button" class="spX" data-act="del" data-id="${p.id}" aria-label="Take ${esc(sp.name)} out">✕</button></div>
<div class="spSteps">${sexed ? step('n', 'Males', p.n) + step('f', 'Females', p.f ?? 0) + step('u', 'Unsexed', p.u ?? 0) : step('n', '', p.n)}</div>
${nt.pairing ? `<div class="spPair"><span class="spLab">Pair</span>${PAIR_OPTS.map(([v, t]) => `<button type="button" data-act="pair" data-id="${p.id}" data-v="${v}"${nt.pairing!.status === v ? ' class="on"' : ''} aria-pressed="${nt.pairing!.status === v}">${t}</button>`).join('')}</div><div class="${nt.pairing.status === 'established' ? 'spNote' : 'spWarn'}">${esc(nt.pairing.line)}</div>` : ''}
${overWarn(p, litres || undefined, shownLengthMm(plan)) ? `<div class="spWarn">${esc(overWarn(p, litres || undefined, shownLengthMm(plan))!)}</div>` : ''}${hungry ? `<div class="spWarn">${esc(hungry.replace(/^algae: /, 'Algae: '))}</div>` : ''}${conflictsOf(picks, p.id).map((w, i) => `<div class="${w.block && i === 0 ? 'spWarn' : 'spNote'}">${i ? 'Also: ' : ''}${esc(w.text)}</div>`).join('')}${nt.needs.map(x => `<div class="${x.severity === 'S3' ? 'spWarn' : 'spNote'} spNeed">${esc(x.text)}</div>`).join('')}${(() => { const g = groupLineIn(nt, plan); return `<div class="spMsg ${g.held ? 'spb-held' : bandClass(nt.band)}">${esc(g.text)}</div>`; })()}${nt.ratio ? `<div class="spNote">${esc(nt.ratio)}</div>` : ''}
${nt.habitat.length ? `<div class="spNote">${nt.habitat.map(esc).join(' · ')}</div>` : ''}</li>`;
  };

  const bar = (pct: number, what: string) => `<span class="spBar ${pct > 100 ? 'over' : pct >= IDEAL_MAX ? 'near' : ''}" title="${what}: ${Math.round(pct)} %"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></span>`;
  const WHY = FAIL_WORD;
  let sizesTop = 0;
  const tankBlock = () => {
    const animals = animalsOf(picks);
    if (!animals.length) return '';
    const plan = planFor(picks, chosen);
    if (!plan.options.length) return '<p class="spNote">This animal lives on land: choose a terrarium in the editor.</p>';
    let h = '';
    if (plan.tank) {
      h += `<div class="spTank"><b>${esc(tankLabel(plan.tank, store.scene.units))}</b><span class="spPct">Your tank. It stays this size as you add animals.</span></div>`;
      if (plan.problem) h += `<div class="spWarn">${esc(plan.problem)}. You can still continue.</div>`;
      if (plan.span) {
        const { setupUsd: s, minPerWeek: m } = plan.span;
        h += `<div class="spLive"><span>Set-up about <b>${range(s.cheapest, s.balanced, usd)}</b></span><span>About <b>${range(m.cheapest, m.balanced, n => `${n}`)} min</b> a week</span></div><div class="spNote">Cheapest build to balanced build: tank, filter, light, heater and water care for these animals.</div>`;
      }
    } else h += plan.need ? '<div class="spNote">No tank yet: pick one. You can add more animals after, and come back for a bigger tank. Greyed sizes are too small for the animals you have so far.</div>' : `<div class="spWarn">${esc(plan.problem ?? '')}</div>`;
    h += `<div class="spHd">Tank sizes</div><div class="spBands spNote">Space: <span class="spB ok">ideal up to ${IDEAL_MAX} %</span> <span class="spB near">caution, tread carefully, to 100 %</span> <span class="spB over">over 100 %: likely to cause problems long term</span></div><div class="spSizeKey spNote"><span>Space</span><span>Tank size</span></div><ul class="spSizes">${plan.options.map(o => {
      const bad = o.fails.length > 0, on = plan.tank?.id === o.tank.id, full = o.spacePct, filt = o.filtrationPct > 70 ? `<em class="${o.filtrationPct > 100 ? 'cr' : ''}">filter load ${Math.round(o.filtrationPct)} % on a basic filter; plants and a stronger one lower it</em>` : '';
      return `<li><button type="button" data-act="size" data-tank="${o.tank.id}" class="${bad ? 'small' : ''}${on ? ' on' : ''}"${bad ? ' title="Too small for these animals; you can still pick it"' : ''}><span class="spLbl">${esc(tankLabel(o.tank, store.scene.units))}${bad ? `<em>${WHY[o.fails[0]]}</em>` : full >= IDEAL_MAX ? '<em class="cr">past ideal: tread carefully</em>' : o.cramped ? '<em class="cr">workable, a bit cramped</em>' : ''}${filt}</span>${bar(full, 'Space: how full the tank is by room, whatever the filter')}<span class="spPct">${Math.round(full)} %</span>${bar(o.minPct, 'Tank size against what the animals need')}<span class="spPct">${Math.round(o.minPct)} %</span></button></li>`;
    }).join('')}</ul>`;
    return h;
  };

  const results = () => {
    if (!q.trim() || !picks.length) return ''; // with nothing picked the gallery behind the panel is the list
    const have = new Set(picks.map(p => p.id)), list = searchSpecies(q).filter(s => !have.has(s.id)).slice(0, 8);
    return list.length ? `<ul class="spRes">${list.map(s => `<li><button type="button" data-act="add" data-id="${s.id}"><b>${esc(s.name)}</b><i>${esc(s.sci)}</i><span>${CARE[s.id]?.group ? `group of ${CARE[s.id].bands?.ok ?? CARE[s.id].group}+` : ''}</span></button></li>`).join('')}</ul>` : '<p class="spNote">No animal by that name.</p>';
  };

  let focusSearch = false;
  const draw = () => {
    const sz = el.querySelector<HTMLElement>('.spSizes'); if (sz) sizesTop = sz.scrollTop;
    const keep = el.querySelector<HTMLInputElement>('.spQ'), hadFocus = document.activeElement === keep, pos = keep?.selectionStart ?? q.length, scroll = el.scrollTop;
    el.classList.toggle('spEmpty', !picks.length);
    el.innerHTML = `<div class="spHead"><h2>An animal I want</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<input class="spQ" type="search" placeholder="Search an animal by name (e.g. betta, neon tetra, clownfish)" aria-label="Search animals" value="${esc(q)}" autocomplete="off">
<div class="spResWrap">${results()}</div>
${picks.length ? `${(() => { const pl = planFor(picks, chosen); const tl = tempLinesOf(picks); return (pl.tank && pl.problem ? `<div class="spWarn spVerdict">Tank verdict: ${esc(pl.problem)}</div>` : '') + (tl ? `<div class="${tl.rangeState === 'none' ? 'spWarn' : 'spNote'}">${esc(tl.range)}</div><div class="spNote">${esc(tl.setpoint)}</div>` : ''); })()}<ul class="spPicks">${picks.map(p => pickRow(p, planFor(picks, chosen))).join('')}</ul>
<div class="spHd">Other animals in with them?</div>
${mates ? `<p class="spNote">Pick from the pictures on the left; each goes in at the smallest group it is kept in.</p><button type="button" class="primary" data-act="nomates">Done adding</button>` : `<div class="spYN"><button type="button" data-act="mates">Yes, show me what suits them</button></div>`}` : '<p class="spNote">Search for the animal you have in mind, or pick one from the pictures. It goes in at the smallest group it is kept in and shows in the view; then pick a tank for them.</p>'}
${picks.length ? `<div class="spHd">The tank</div>${tankBlock()}` : ''}
<div class="spFoot"><button type="button" class="primary" data-act="builds"${picks.length && planFor(picks, chosen).tank ? '' : ' disabled'}>Continue: ways to build it</button><button type="button" class="spLink" data-act="done"${picks.length ? '' : ' disabled'}>Open in the editor as it is</button><span class="spNote">Everything stays editable in the editor.</span></div>`;
    const q2 = el.querySelector<HTMLInputElement>('.spQ')!;
    { const t = planFor(picks, chosen).tank; gallery.mates(mates && picks.length ? rankTankmates(picks, t).map(m => ({ ...m, bigger: m.bigger ? tankLabel(m.bigger, store.scene.units) : undefined })) : null, !!t); }
    gallery.search(q); gallery.show(!el.hidden && (!picks.length || mates));
    if (hadFocus || focusSearch) { q2.focus(); q2.setSelectionRange(pos, pos); focusSearch = false; }
    el.scrollTop = scroll;
    const list = el.querySelector<HTMLElement>('.spSizes');
    if (list) { // nothing chosen: show the smallest size that holds the picks; chosen: leave the list where it was
      const first = list.querySelector<HTMLElement>('button:not(.small)');
      list.scrollTop = !chosen && first ? Math.max(0, first.offsetTop - list.offsetTop - 28) : sizesTop;
    }
  };

  const change = (rebuild = false) => { sync(rebuild); draw(); };

  el.oninput = e => { const t = e.target as HTMLInputElement; if (t.classList.contains('spQ')) { q = t.value; gallery.search(q); const w = el.querySelector('.spResWrap'); if (w) w.innerHTML = results(); } };
  el.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b) return;
    const id = b.dataset.id!, i = picks.findIndex(p => p.id === id);
    switch (b.dataset.act) {
      case 'close': close(); break;
      case 'done': close(); store.seal(); status('Opened in the editor. The animals and tank are yours to change; Undo steps back.'); break;
      case 'builds': { const plan = planFor(picks, chosen); if (plan.tank) { /* warn, never block: the problem line stays on the screen (Nathan 2026-10-22) */ el.hidden = true; bare(false); settle(); builds.open(animalsOf(picks), plan.tank, () => { el.hidden = false; side(true); bare(true); shown = ''; change(true); }); } break; }
      case 'add': if (i < 0) { picks.push(startPick(id)); q = ''; change(); } break;
      case 'mate': if (i < 0) { picks.push(startPick(id)); change(); } break;
      case 'del': if (i >= 0) { picks.splice(i, 1); if (!picks.length) mates = false; change(); } break;
      case 'inc': case 'dec': if (i >= 0) { picks[i] = bump(picks[i], b.dataset.w as 'n' | 'f' | 'u', b.dataset.act === 'inc' ? 1 : -1); if (!totalOf(picks[i])) picks.splice(i, 1); change(); } break;
      case 'pair': if (i >= 0) { picks[i] = { ...picks[i], pair: b.dataset.v as Pairing }; change(); } break;
      case 'mates': mates = true; draw(); break;
      case 'nomates': mates = false; draw(); break;
      case 'size': chosen = b.dataset.tank; change(); break;
    }
  };

  // ---------- opening ----------
  const open = () => {
    const units = store.scene.units, s = emptyScene();
    s.name = 'My animal tank'; s.units = units; s.tanks[0].camera = { ...store.tank.camera };
    s.tanks[0].stand.show = false; s.tanks[0].stand.need = 'ask'; // no stand yet: the budget still counts a typical one
    s.tanks[0].stockFirst = true; // no filter drawn until the owner adds one (Nathan 2026-10-21; the tile says "This tank needs a filter")
    store.replace(s);
    picks = []; chosen = undefined; mates = false; q = ''; shown = '';
    el.hidden = false; side(true); bare(true); ghost(true); focusSearch = true; draw();
  };
  openBtn.onclick = () => { (document.getElementById('startDlg') as HTMLDialogElement | null)?.close(); open(); };
  // a different tank loaded (open, undo past the start): the screen has nothing more to say
  store.subscribe(k => { if (k === 'load' && store.loadedBy === 'replace' && !el.hidden && !picks.length) close(); });

  // ---------- the fork card ----------
  const roomRow = (o: RoomOption, i: number, label: string) =>
    `<li><div><b>${esc(o.label)}</b><span class="spNote">${sizeTxt(o.w, o.d, store.scene.units)}${o.costUsd != null ? ` · set-up about ${usd(o.costUsd)}${o.costDeltaUsd ? ` (${signed(o.costDeltaUsd)})` : ''}` : ''}</span></div><button type="button" data-fk="${label}" data-i="${i}">${label === 'room' ? 'Make room' : 'Use this'}</button></li>`;
  const showFork = (f: SpaceFork) => {
    const animals = animalsInTank(f.setup.fish), o = forkOptions(animals, f.limit, f.setup.tank, store.scene.units);
    const units = store.scene.units, dim = (mm: number) => units === 'in' ? `${Math.round(mm / 25.4)} in` : `${Math.round(mm / 10)} cm`;
    const swaps = o.swaps.map((s, i) => `<li><div><b>${esc(s.to.name)}</b> instead of ${esc(s.from)}<span class="spNote">${s.n} of them · both are ${esc(s.shared.join(', '))}</span></div><button type="button" data-fk="swap" data-i="${i}">Swap</button></li>`).join('');
    fork.innerHTML = `<form method="dialog" class="libhead"><h2>This does not fit your space</h2><button value="close" aria-label="Close">✕</button></form>
<p class="hint">Your space is ${dim(f.limit.w)} x ${dim(f.limit.d)}${f.limit.h ? `, ${dim(f.limit.h)} high` : ''}.</p>
<div class="spHd">Make room for it</div>${o.room.length ? `<ul class="spFork">${o.room.map((r, i) => roomRow(r, i, 'room')).join('')}</ul><p class="spNote">Making room widens your space to the tank's footprint.</p>` : '<p class="spNote">Nothing in the water needs a tank size here.</p>'}
<div class="spHd">Keep my space</div>${o.inSpace
      ? (o.fitsAsIs ? `<ul class="spFork">${roomRow(o.inSpace, 0, 'keep')}</ul><p class="spNote">These animals fit that tank as they are.</p>`
        : `<p class="spNote">The biggest tank in your space is ${esc(o.inSpace.label)}. Animals that fit it and are liked for the same reasons:</p>${swaps ? `<ul class="spFork">${swaps}</ul>` : '<p class="spNote">No close swap fits; take fewer animals, or make room.</p>'}`)
      : '<p class="spNote">No catalogue tank fits that space.</p>'}`;
    fork.onclick = e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fk]'); if (!b) return;
      const i = +b.dataset.i!, i0 = store.scene.active;
      if (b.dataset.fk === 'room') {
        const r = o.room[i], ext = r && { w: r.w, d: r.d };
        store.update(s => { const T = s.tanks[i0]; T.tank = tankFromModel(r.tank); T.water.level = Math.min(T.water.level, WATER_LEVEL); T.layout.space = { w: Math.max(f.limit.w, ext.w), d: Math.max(f.limit.d, ext.d), ...(f.limit.h ? { h: Math.max(f.limit.h, tankFromModel(r.tank).H) } : {}) }; });
        status(`Made room: ${r.label}. Your space grew to fit it.`);
      } else if (b.dataset.fk === 'keep' && o.inSpace) {
        store.update(s => { s.tanks[i0].tank = tankFromModel(o.inSpace!.tank); });
        status(`Kept your space: ${o.inSpace.label}.`);
      } else if (b.dataset.fk === 'swap' && o.inSpace) {
        const sw = o.swaps[i], from = animals.find(a => getSpecies(a.species)?.name === sw.from)?.species;
        store.update(s => {
          const T = s.tanks[i0]; T.tank = tankFromModel(sw.tank);
          T.fish = T.fish.filter(x => x.species !== from);
          let next = Math.max(0, ...T.fish.map(x => x.id)) + 1; const added = new Set<number>();
          for (let k = 0; k < sw.n; k++) { T.fish.push({ id: next, species: sw.to.id, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }); added.add(next++); }
          shuffleFish(T, rng(1 + Math.floor(Math.random() * 1e6)), undefined, 100);
        });
        status(`Swapped for ${sw.to.name}; the tank is now ${o.inSpace.label}.`);
      }
      fork.close(); close(); // the plan is in the editor's hands now
    };
    if (!fork.open) fork.showModal();
  };
  onSpaceFork(showFork);
  return { open };
}
