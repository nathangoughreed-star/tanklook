// The stocking screen of path 1, "An animal I want" (lane P5, 2026-10-20), and its fork card. The panel sits over the viewer: search for an
// animal, set how many (graded band messages, male / female counts for species kept by sex), say whether other animals go in with them
// (ranked by compatibility), and watch the bare tank in the viewer step up through catalogue sizes. The fork card answers the fullness
// tile's "Make room or swap..." button. Logic lives in stockPlanLogic.ts (pure, tested); this file draws it and writes the scene.
import { rng } from '../art/paint';
import { CARE } from '../data/care';
import { getSpecies, searchSpecies } from '../data/species';
import { tankFromModel } from '../data/tanks';
import { emptyScene } from '../scene/defaults';
import { placeNew, shuffleFish } from '../scene/scatter';
import type { Store } from '../scene/store';
import { stockingMemo } from '../scene/stocking';
import type { Fish } from '../scene/types';
import type { Viewer } from '../render/viewer';
import { onSpaceFork, type SpaceFork } from './fullnessTile';
import { animalsInTank, animalsOf, bump, forkOptions, isSexed, maxOf, notesOf, planFor, conflictOf, rankTankmates, startPick, tankLabel, totalOf, type Pk, type RoomOption } from './stockPlanLogic';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const range = (a: number, b: number, f: (n: number) => string) => a === b ? f(a) : `${f(Math.min(a, b))} to ${f(Math.max(a, b))}`;
const signed = (n: number) => n >= 0 ? `+${usd(n)}` : `-${usd(-n)}`;
const WATER_LEVEL = 0.9;

export function attachStockPlan(store: Store, viewer: Viewer, status: (m: string, bad?: boolean) => void, openBtn: HTMLElement) {
  const view = document.getElementById('view')!;
  const el = document.createElement('aside');
  el.className = 'sp'; el.hidden = true; el.setAttribute('aria-label', 'Stocking: the animal I want');
  view.append(el);
  const fork = document.createElement('dialog');
  fork.className = 'libdlg forkdlg'; fork.setAttribute('aria-label', 'Make room or swap');
  document.body.append(fork);

  // the side panel steps aside while the screen is up (the view gets the width); not saved as the viewer's preference, and given back on close
  const app = document.getElementById('app'); let stepped = false;
  const side = (hide: boolean) => {
    if (hide && app && !app.classList.contains('collapsed')) { app.classList.add('collapsed'); stepped = true; viewer.invalidate(); }
    else if (!hide && stepped && app) { app.classList.remove('collapsed'); stepped = false; viewer.invalidate(); }
  };
  const close = () => { el.hidden = true; side(false); };
  let picks: Pk[] = [], chosen: string | undefined, mates = false, q = '', shown = '';

  // ---------- the scene follows the picks ----------
  const sync = (rebuild = false) => {
    const plan = planFor(picks, chosen);
    store.update(s => {
      const T = s.tanks[s.active];
      if (plan.tank && plan.tank.id !== shown) {
        T.tank = tankFromModel(plan.tank); T.water.on = true; T.water.level = WATER_LEVEL; shown = plan.tank.id; rebuild = true;
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
          const female = isSexed(p.id) && i >= p.n;
          if (sp.female) { if (female) f.sex = 'f'; else delete f.sex; }
          if (isSexed(p.id) && (sp.cat === 'reptile' || sp.cat === 'amphibian')) f.gender = female ? 'f' : 'm';
        });
        keep.push(...have);
      }
      T.fish = keep;
      const r = rng(1 + Math.floor(Math.random() * 1e6));
      if (rebuild) shuffleFish(T, r, undefined, 92); else if (added.size) placeNew(T, r, added);
    }, { coalesce: 'stockplan' });
  };

  // ---------- drawing ----------
  const bandClass = (b: string) => `spb-${b}`;
  const pickRow = (p: Pk) => {
    const sp = getSpecies(p.id)!, nt = notesOf(p), sexed = isSexed(p.id), cap = totalOf(p) >= maxOf(p.id);
    const step = (which: 'n' | 'f', label: string, v: number) =>
      `<span class="spStep"><span class="spLab">${label}</span><button type="button" data-act="dec" data-id="${p.id}" data-w="${which}" aria-label="One fewer ${esc(label || sp.name)}"${v <= 0 ? ' disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="inc" data-id="${p.id}" data-w="${which}" aria-label="One more ${esc(label || sp.name)}"${cap ? ' disabled' : ''}>+</button></span>`;
    return `<li class="spPick"><div class="spName"><b>${esc(sp.name)}</b><i>${esc(sp.sci)}</i><button type="button" class="spX" data-act="del" data-id="${p.id}" aria-label="Take ${esc(sp.name)} out">✕</button></div>
<div class="spSteps">${sexed ? step('n', 'Males', p.n) + step('f', 'Females', p.f ?? 0) : step('n', '', p.n)}</div>
${conflictOf(picks, p.id) ? `<div class="spWarn">${esc(conflictOf(picks, p.id)!)}</div>` : ''}<div class="spMsg ${bandClass(nt.band)}">${esc(nt.line)}</div>${nt.ratio ? `<div class="spNote">${esc(nt.ratio)}</div>` : ''}
${nt.habitat.length ? `<div class="spNote">${nt.habitat.map(esc).join(' · ')}</div>` : ''}</li>`;
  };

  const mateRows = () => {
    const list = rankTankmates(picks);
    if (!list.length) return '<p class="spNote">Nothing else suits this water.</p>';
    return `<ul class="spMates">${list.map(m => `<li class="${m.ok ? '' : 'no'}"><div><b>${esc(m.sp.name)}</b>${m.ok ? '' : `<span class="spWhy">${esc(m.why)}</span>`}</div>${m.ok ? `<button type="button" data-act="mate" data-id="${m.sp.id}">Add ${m.n}</button>` : ''}</li>`).join('')}</ul>`;
  };

  const tankBlock = () => {
    const animals = animalsOf(picks);
    if (!animals.length) return '<p class="spNote">Pk an animal and the tank it needs appears in the view.</p>';
    const plan = planFor(picks, chosen);
    if (!plan.tank) return '<p class="spNote">This animal lives on land: choose a terrarium in the editor.</p>';
    const space = plan.tank.id === plan.need?.tank.id ? plan.need.spacePct : stockingMemo(store.tank).spacePercent;
    const bar = (pct: number) => `<span class="spBar ${pct > 100 ? 'over' : pct >= 85 ? 'near' : ''}" title="Space used: ${Math.round(pct)} %"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></span>`;
    let h = `<div class="spTank"><b>${esc(tankLabel(plan.tank))}</b>${bar(space)}<span class="spPct">${Math.round(space)} % of the space</span></div>`;
    if (plan.problem) h += `<div class="spWarn">${esc(plan.problem)}</div>`;
    else if (plan.need && plan.tank.id !== plan.need.tank.id) h += `<div class="spNote">The smallest that holds them is ${esc(tankLabel(plan.need.tank))}.</div>`;
    if (plan.span) {
      const { setupUsd: s, minPerWeek: m } = plan.span;
      h += `<div class="spLive"><span>Set-up about <b>${range(s.cheapest, s.balanced, usd)}</b></span><span>About <b>${range(m.cheapest, m.balanced, n => `${n}`)} min</b> a week</span></div><div class="spNote">Cheapest build to balanced build: tank, filter, light, heater and water care for these animals.</div>`;
    }
    if (plan.steps.length) {
      h += `<div class="spHd">More room</div><ul class="spSteps2">${plan.steps.map(s => `<li><button type="button" data-act="size" data-tank="${s.tank.id}"><span>${esc(tankLabel(s.tank))}</span><b>${signed(s.costDeltaUsd)}</b>${bar(s.spacePct)}<span class="spPct">${Math.round(s.spacePct)} %</span></button></li>`).join('')}</ul>`;
      if (chosen && plan.need && plan.tank.id !== plan.need.tank.id) h += `<button type="button" class="spLink" data-act="smallest">Back to the smallest</button>`;
    }
    return h;
  };

  const results = () => {
    if (!q.trim()) return '';
    const have = new Set(picks.map(p => p.id)), list = searchSpecies(q).filter(s => !have.has(s.id)).slice(0, 8);
    return list.length ? `<ul class="spRes">${list.map(s => `<li><button type="button" data-act="add" data-id="${s.id}"><b>${esc(s.name)}</b><i>${esc(s.sci)}</i><span>${CARE[s.id]?.group ? `group of ${CARE[s.id].bands?.ok ?? CARE[s.id].group}+` : ''}</span></button></li>`).join('')}</ul>` : '<p class="spNote">No animal by that name.</p>';
  };

  let focusSearch = false;
  const draw = () => {
    const keep = el.querySelector<HTMLInputElement>('.spQ'), hadFocus = document.activeElement === keep, pos = keep?.selectionStart ?? q.length, scroll = el.scrollTop;
    el.innerHTML = `<div class="spHead"><h2>An animal I want</h2><button type="button" data-act="close" aria-label="Close">✕</button></div>
<input class="spQ" type="search" placeholder="Search an animal by name (e.g. betta, neon tetra, clownfish)" aria-label="Search animals" value="${esc(q)}" autocomplete="off">
<div class="spResWrap">${results()}</div>
${picks.length ? `<ul class="spPicks">${picks.map(pickRow).join('')}</ul>
<div class="spHd">Other animals in with them?</div>
${mates ? `${mateRows()}<button type="button" class="spLink" data-act="nomates">No, just these</button>` : `<div class="spYN"><button type="button" data-act="mates">Yes, show what suits them</button></div>`}` : '<p class="spNote">Start with the animal you have in mind. It goes in at the smallest group it is kept in, and the tank it needs shows in the view.</p>'}
<div class="spHd">The tank</div>${tankBlock()}
<div class="spFoot"><button type="button" class="primary" data-act="done"${picks.length ? '' : ' disabled'}>Open in the editor</button><span class="spNote">Everything stays editable there.</span></div>`;
    const q2 = el.querySelector<HTMLInputElement>('.spQ')!;
    if (hadFocus || focusSearch) { q2.focus(); q2.setSelectionRange(pos, pos); focusSearch = false; }
    el.scrollTop = scroll;
  };

  const change = (rebuild = false) => { sync(rebuild); draw(); };

  el.oninput = e => { const t = e.target as HTMLInputElement; if (t.classList.contains('spQ')) { q = t.value; const w = el.querySelector('.spResWrap'); if (w) w.innerHTML = results(); } };
  el.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!b) return;
    const id = b.dataset.id!, i = picks.findIndex(p => p.id === id);
    switch (b.dataset.act) {
      case 'close': close(); break;
      case 'done': close(); store.seal(); status('Opened in the editor. The animals and tank are yours to change; Undo steps back.'); break;
      case 'add': if (i < 0) { picks.push(startPick(id)); q = ''; change(); } break;
      case 'mate': if (i < 0) { picks.push(startPick(id)); change(); } break;
      case 'del': if (i >= 0) { picks.splice(i, 1); if (!picks.length) mates = false; change(); } break;
      case 'inc': case 'dec': if (i >= 0) { picks[i] = bump(picks[i], b.dataset.w as 'n' | 'f', b.dataset.act === 'inc' ? 1 : -1); if (!totalOf(picks[i])) picks.splice(i, 1); change(); } break;
      case 'mates': mates = true; draw(); break;
      case 'nomates': mates = false; draw(); break;
      case 'size': chosen = b.dataset.tank; change(); break;
      case 'smallest': chosen = undefined; change(); break;
    }
  };

  // ---------- opening ----------
  const open = () => {
    const units = store.scene.units, s = emptyScene();
    s.name = 'My animal tank'; s.units = units; s.tanks[0].camera = { ...store.tank.camera };
    store.replace(s);
    picks = []; chosen = undefined; mates = false; q = ''; shown = '';
    el.hidden = false; side(true); focusSearch = true; draw();
  };
  openBtn.onclick = () => { (document.getElementById('startDlg') as HTMLDialogElement | null)?.close(); open(); };
  // a different tank loaded (open, undo past the start): the screen has nothing more to say
  store.subscribe(k => { if (k === 'load' && store.loadedBy === 'replace' && !el.hidden && !picks.length) close(); });

  // ---------- the fork card ----------
  const roomRow = (o: RoomOption, i: number, label: string) =>
    `<li><div><b>${esc(o.label)}</b><span class="spNote">${(o.w / 10).toFixed(0)} x ${(o.d / 10).toFixed(0)} cm${o.costUsd != null ? ` · set-up about ${usd(o.costUsd)}${o.costDeltaUsd ? ` (${signed(o.costDeltaUsd)})` : ''}` : ''}</span></div><button type="button" data-fk="${label}" data-i="${i}">${label === 'room' ? 'Make room' : 'Use this'}</button></li>`;
  const showFork = (f: SpaceFork) => {
    const animals = animalsInTank(f.setup.fish), o = forkOptions(animals, f.limit, f.setup.tank);
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
          shuffleFish(T, rng(1 + Math.floor(Math.random() * 1e6)), undefined, 92);
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
