// Explore Complete Setups, stage X3 (lane OX5): the screen mounted at Guided's `exploreEntry` hook (ui/guided/shell.ts), after World = Open to anything, Equipment and Limits. The loop (spec sections 4-5):
//   a batch of complete setups (6 on a GPU, 3 on software GL) -> Like / Pass / Save / Unrated, an optional "What caught your eye?" panel -> the editable "what we learned" line -> Show more,
//   with a Favourites strip, "Adjust constraints" (back to GS4's Limits) and an honest "fewer than six, here is why" / no-result state.
// RULES KEPT HERE: browsing NEVER writes the scene (a picture is the host's `shot`: the scene put in the viewer for one draw, then the tank put back; this file never touches `store.replace` or the tank);
// the only brief item a reaction writes is `preferences.aspects` (react.ts); limits change only through the buttons "Adjust constraints" (Limits step) and the controlled edits of a no-result state;
// firm limits were applied by the pool's gate BEFORE a card exists; Balanced density only; each picture is drawn lazily, one at a time, with a family-colour placeholder first, cached by candidate id.
// Make This Mine is a hook (`ExploreHooks.makeMine`): the install and the compare table are stage X4.
import type { ExploreEntryCtx } from '../guided/shell';
import { briefToWants } from '../../scene/brief';
import { routeOf, setRoute } from '../../scene/project';
import { applyAlternative } from '../../demand/infeasible';
import { createExploreStore, type ExploreStore } from '../../explore/store';
import { toStored, type StoredCandidate, type StoredLite } from '../../explore/candidate';
import { aspectsOf } from '../../explore/aspects';
import { batchSizeOf, isSoftwareRenderer, type Batch } from '../../explore/rank';
import type { AspectTag } from '../../explore/aspects';
import { editBrief, getBrief } from '../setupBrief';
import { loadProfile } from '../demandPanel';
import { TILE_VIEW } from '../discovery/tiles';
import { cardHtml, type TagPanel } from './card';
import { applyInterpret, interpretHtml, interpretOf, toldKeys } from './interpret';
import { editButtons, fewerHtml, limitsHtml, noResultHtml, progressHtml } from './notes';
import { reactTo, tagReaction, type Action } from './react';
import { Explorer, PROVISIONAL_SHOWN, fewerWhy, limitsLine, type PoolEntry } from './session';
import { favouritesOf, stripHtml } from './strip';

export interface ExploreHooks {
  /** Make This Mine on a candidate (stage X4 installs it in the editor). The default only says it is not built yet. */
  makeMine?(c: StoredCandidate): void;
  /** the saved-candidate store (default: the browser's) */
  db?: ExploreStore;
}

let SHARED: ExploreStore | undefined;
const sharedDb = () => (SHARED ??= createExploreStore());
/** A software rasteriser draws a card in 5-20 s (explore-cost-spike.md), so it gets 3 cards a batch. Unknown (no WebGL, no debug info) counts as software. */
function softwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null; if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? isSoftwareRenderer(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))) : false;
  } catch { return true; }
}
const tick = () => new Promise<void>(r => setTimeout(r, 0));

export function mountExplore(c: ExploreEntryCtx, hooks: ExploreHooks = {}): { destroy(): void } {
  const db = hooks.db ?? sharedDb(), root = c.root, host = c.host;
  root.innerHTML = `<h3 class="vd-ask">Explore complete setups</h3>
<p class="hint ex-lead">Each card is a whole setup: the animals, the plants, the gear and what it costs. Like, pass or save as many as you like, then make one yours. A card you skip counts for nothing.</p>
<div class="ex-limitsline"></div><div class="ex-status"></div><div class="ex-batches"></div><div class="ex-notes"></div><div class="ex-interpslot"></div><details class="ex-prov" hidden></details><div class="ex-review"></div><div class="ex-stripslot"></div>
<p class="vd-nav ex-nav"><button type="button" data-ex="adjust">Adjust constraints</button> <button type="button" class="primary" data-ex="more" disabled>Show more</button> <button type="button" class="linkbtn" data-ex="world">or pick a world</button></p>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const limitsSlot = q('.ex-limitsline'), status = q('.ex-status'), batchesEl = q('.ex-batches'), notes = q('.ex-notes'), interpSlot = q('.ex-interpslot'), prov = q<HTMLDetailsElement>('.ex-prov'),
    review = q('.ex-review'), stripSlot = q('.ex-stripslot'), more = q<HTMLButtonElement>('[data-ex="more"]');

  let dead = false, busy = false, ex: Explorer, size = host.shot ? batchSizeOf(softwareGl()) : batchSizeOf(false), batchNo = 0, shownAny = false;
  let editing = false, broad = false, reviewing: string | undefined, tagging: { id: string; mode: 'like' | 'pass'; chosen: Set<AspectTag> } | undefined;
  const cards = new Map<string, StoredCandidate>(), open = new Set<string>(), shots = new Map<string, string>(), queued = new Set<string>(), nopic = new Set<string>();
  let edits: ReturnType<typeof editButtons> = [], lastWhy: ReturnType<Explorer['why']> | undefined;

  // ---------------------------------------------------------------------------------------------------------------- one card, its picture
  const lite = (id: string): StoredLite | undefined => db.list().find(x => x.id === id) ?? cards.get(id);
  const snapshotOf = (id: string) => cards.get(id)?.snapshot ?? db.get(id)?.snapshot;
  const cardEls = (id: string) => [...root.querySelectorAll<HTMLElement>('.ex-card')].filter(e => e.dataset.exId === id);
  function renderCard(id: string) {
    const rec = lite(id); if (!rec) return;
    const t = tagging?.id === id ? { mode: tagging.mode, chosen: [...tagging.chosen] } satisfies TagPanel : undefined;
    for (const el of cardEls(id)) {
      const inReview = !!el.closest('.ex-review'), pick = picks.get(id);
      el.outerHTML = cardHtml({ c: rec, ...(pick ? { role: pick.role, why: pick.why } : {}), ...(shots.has(id) ? { shot: shots.get(id) } : {}), wait: queued.has(id) && !nopic.has(id), open: open.has(id), ...(t ? { tags: t } : {}), review: inReview });
    }
    for (const el of cardEls(id)) io?.observe(el);
  }
  const picks = new Map<string, { role: 'match' | 'explore' | 'first'; why: string[] }>();

  let pumping = false;
  /** A frame drawn before the renderer is ready is a ~2 kB blank (explore-cost-spike.md): never kept as a picture; it is tried again a little later, then the card keeps its colour. */
  const BLANK_BYTES = 6000, tries = new Map<string, number>();
  function pump() {
    if (pumping || dead) return;
    const id = [...queued].find(x => !shots.has(x) && !nopic.has(x)); if (!id) return;
    pumping = true;
    setTimeout(() => {
      let retry = false;
      try {
        const T = snapshotOf(id), url = T && host.shot ? host.shot({ ...T, camera: { ...T.camera, ...TILE_VIEW } }) : '';
        if (url && url.length > BLANK_BYTES) shots.set(id, url);
        else if (url && (tries.get(id) ?? 0) < 2) { tries.set(id, (tries.get(id) ?? 0) + 1); retry = true; } else nopic.add(id);
      } catch { nopic.add(id); }
      if (retry) { setTimeout(() => { pumping = false; pump(); }, 1500); return; }
      pumping = false; if (dead) return;
      renderCard(id); drawStrip(); pump();
    }, 30);
  }
  const want = (id: string) => { if (!host.shot || shots.has(id) || nopic.has(id) || queued.has(id)) return; queued.add(id); renderCard(id); pump(); };
  const io = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const id = (e.target as HTMLElement).dataset.exId; if (id) want(id); io?.unobserve(e.target); } }, { rootMargin: '200px' });

  // ---------------------------------------------------------------------------------------------------------------- batches
  function appendBatch(b: Batch<PoolEntry>) {
    batchNo++;
    const sec = document.createElement('section'); sec.className = 'ex-batch'; sec.dataset.batch = String(batchNo);
    sec.innerHTML = `<h4 class="ex-bh">${batchNo === 1 ? 'To start, a spread of different kinds' : `Batch ${batchNo}${b.followed && !broad ? ': leaning toward what you liked, with a few surprises' : ''}`}</h4><div class="ex-grid"></div>`;
    const grid = sec.querySelector('.ex-grid')!;
    for (const p of b.picks) {
      const st = toStored(p.entry.candidate, { batch: batchNo, now: Date.now() });
      cards.set(st.id, st); picks.set(st.id, { role: p.role, why: p.why });
      const rec = lite(st.id)!;
      grid.insertAdjacentHTML('beforeend', cardHtml({ c: rec, role: p.role, why: p.why, wait: false }));
    }
    batchesEl.append(sec);
    for (const el of sec.querySelectorAll<HTMLElement>('.ex-card')) { if (io) io.observe(el); else want(el.dataset.exId!); }
    if (batchNo > 1) sec.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  function drawProvisional() {
    const list = ex.provisional.slice(0, PROVISIONAL_SHOWN);
    prov.hidden = !list.length; if (!list.length) return;
    const wasOpen = prov.open;
    prov.innerHTML = `<summary>Provisional concepts (${ex.provisional.length}${ex.done ? '' : ' so far'}): outside your recommendations</summary><p class="hint">These passed the animal rules but not every check could be certified: a figure is a rough estimate, an animal has little data, or the world's costs are not modelled as well as an aquarium's. They are never counted as fitting a limit.</p><div class="ex-grid"></div>`;
    prov.open = wasOpen;
    const grid = prov.querySelector('.ex-grid')!;
    for (const e of list) {
      const st = cards.get(e.id) ?? toStored(e.candidate, { batch: 0, now: Date.now() }); cards.set(st.id, st);
      grid.insertAdjacentHTML('beforeend', cardHtml({ c: lite(st.id)!, wait: false }));
    }
    if (prov.open) for (const el of grid.querySelectorAll<HTMLElement>('.ex-card')) want(el.dataset.exId!);
  }

  function drawInterp() {
    const i = interpretOf(getBrief());
    interpSlot.innerHTML = interpretHtml(i, { editing, broad, told: toldKeys(getBrief()) });
  }
  function drawStrip() {
    const list = db.list();
    stripSlot.innerHTML = stripHtml(list, { shots, persisted: db.persisted, ...(reviewing ? { reviewing } : {}) });
    if (reviewing) {
      const rec = lite(reviewing);
      if (rec && favouritesOf(db.list()).some(x => x.id === reviewing)) { review.innerHTML = cardHtml({ c: rec, open: true, review: true, ...(shots.has(reviewing) ? { shot: shots.get(reviewing) } : {}), wait: queued.has(reviewing) && !nopic.has(reviewing) }); want(reviewing); } else { reviewing = undefined; review.innerHTML = ''; }
    } else review.innerHTML = '';
  }

  // ---------------------------------------------------------------------------------------------------------------- the run: stage A in chunks, then a batch
  async function run() {
    if (busy || dead) return; busy = true; more.disabled = true; notes.innerHTML = '';
    const mine = ex;
    // near-copies are dropped from a batch, so "enough eligible" is not "a full batch": keep gating until the batch is full or every look is checked
    let b: Batch<PoolEntry>;
    for (;;) {
      while (!dead && ex === mine && !ex.ready(size)) { ex.step(); status.innerHTML = progressHtml(ex.progress, ex.eligible.length); await tick(); }
      if (dead || ex !== mine) return;   // begin() restarted the exploration: it owns `busy` now
      b = ex.batch(aspectsOf(getBrief()), { size, broad, known: db.list(), commit: false });
      if (b.picks.length >= size || ex.done) break;
      ex.step(); status.innerHTML = progressHtml(ex.progress, ex.eligible.length); await tick();
    }
    ex.commit(b); status.innerHTML = ''; broad = false;
    drawInterp();
    if (b.picks.length) appendBatch(b);
    drawProvisional();
    if (!b.picks.length && !shownAny) {
      const r = ex.why(true); lastWhy = r; edits = editButtons(r);
      notes.innerHTML = noResultHtml(r, getBrief());
    } else if (b.picks.length < size || !b.picks.length) {
      const r = ex.why(false); lastWhy = r; edits = editButtons(r);
      notes.innerHTML = b.picks.length ? fewerHtml(b.picks.length, size, fewerWhy(ex.byGate, ex.withheld), r.blocker) : `<div class="ex-fewer" role="status"><p><b>That is every complete setup that passes your limits.</b> There are no more to show right now.</p><p><button type="button" data-ex="adjust">Adjust constraints</button> <button type="button" class="linkbtn" data-ex="world">or pick a world</button></p></div>`;
    }
    if (b.picks.length) shownAny = true;
    busy = false; more.disabled = !(ex.left.length || !ex.done);
    drawStrip();
  }
  /** (Re)start from the limits as they are now: the pool is gated again, the saved records are relabelled (never deleted), the profile is not touched. */
  function begin() {
    busy = false;
    if (routeOf(getBrief()) !== 'explore') editBrief(b => setRoute(b, 'explore'));   // the project's route (one project state, not a scene write); Guided reopens here
    const w = briefToWants(getBrief()), now = Date.now();
    const changed = db.recheck(w);
    ex = new Explorer({ w, P: loadProfile(), units: (c.store.scene.units ?? 'in') as 'in' | 'cm', now });
    limitsSlot.innerHTML = limitsHtml(limitsLine(w));
    batchesEl.replaceChildren(); notes.innerHTML = ''; prov.hidden = true; prov.innerHTML = ''; cards.clear(); picks.clear(); queued.clear(); shownAny = false; batchNo = 0; reviewing = undefined; tagging = undefined;
    const gone = changed.filter(x => x.to === 'stale').length, back = changed.filter(x => x.to === 'current').length;
    status.textContent = gone || back ? `${gone ? `${gone} saved setup${gone === 1 ? ' no longer fits' : 's no longer fit'} your limits (kept, marked).` : ''} ${back ? `${back} fit${back === 1 ? 's' : ''} again.` : ''}` : '';
    drawInterp(); drawStrip();
    void run();
  }

  // ---------------------------------------------------------------------------------------------------------------- clicks
  const apply = (b = getBrief()) => { editBrief(() => b); };
  const makeMine = hooks.makeMine ?? (st => host.status(`Make This Mine will open "${st.identity.name}" exactly as drawn in the editor. That step is not built yet; your project is unchanged.`));
  root.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const ed = t.closest<HTMLElement>('[data-ex-edit]');
    if (ed) { const x = edits[+ed.dataset.exEdit!]; if (!x) return; if (x.act === 'adjust') c.back(); else if (x.act === 'world') c.pickWorld(); else if (x.alt) { const alt = x.alt; editBrief(b => applyAlternative(b, alt)); begin(); } return; }
    const alt = t.closest<HTMLElement>('[data-alt]');
    if (alt && lastWhy?.infeasible) { const a = lastWhy.infeasible.alternatives[+alt.dataset.alt!]; if (a?.edit) { const edit = a.edit; editBrief(b => applyAlternative(b, edit)); begin(); } return; }
    const b = t.closest<HTMLElement>('[data-ex]'); if (!b) return;
    const act = b.dataset.ex!, card = b.closest<HTMLElement>('[data-ex-id]'), id = card?.dataset.exId;
    switch (act) {
      case 'adjust': c.back(); return;
      case 'world': c.pickWorld(); return;
      case 'more': void run(); return;
      case 'like': case 'pass': case 'save': case 'unrated': {
        if (!id) return; const st = cards.get(id) ?? db.get(id); if (!st) return;
        const o = reactTo(db, st, getBrief(), act as Action); if (o.brief !== getBrief()) apply(o.brief);
        tagging = o.record && (act === 'like' || act === 'pass') && o.record.reaction.state === (act === 'like' ? 'liked' : 'passed') ? { id, mode: act, chosen: new Set() } : tagging?.id === id ? undefined : tagging;
        renderCard(id); drawInterp(); drawStrip(); return;
      }
      case 'tag': { const tg = b.dataset.tag as AspectTag; if (!id || tagging?.id !== id) return; tagging.chosen.has(tg) ? tagging.chosen.delete(tg) : tagging.chosen.add(tg); renderCard(id); return; }
      case 'tags-done': { if (!id || tagging?.id !== id) return; const rec = lite(id); if (rec) apply(tagReaction(getBrief(), rec, tagging.mode, [...tagging.chosen])); tagging = undefined; renderCard(id); drawInterp(); return; }
      case 'tags-skip': if (id && tagging?.id === id) { tagging = undefined; renderCard(id); } return;
      case 'details': if (id) { open.has(id) ? open.delete(id) : open.add(id); renderCard(id); } return;
      case 'mine': { const st = id && (cards.get(id) ?? db.get(id)); if (st) makeMine(st); return; }
      case 'review': { const fid = b.closest<HTMLElement>('[data-ex-id]')?.dataset.exId; reviewing = reviewing === fid ? undefined : fid; if (reviewing) open.add(reviewing); drawStrip(); review.scrollIntoView?.({ block: 'nearest' }); return; }
      case 'forget': { const fid = b.closest<HTMLElement>('[data-ex-id]')?.dataset.exId; if (fid) { const rec = lite(fid)!, o = reactTo(db, rec, reactTo(db, rec, getBrief(), 'unsave').brief, 'unrated'); if (o.brief !== getBrief()) apply(o.brief); db.react(fid, { state: 'unrated', saved: false }); if (reviewing === fid) reviewing = undefined; renderCard(fid); drawInterp(); drawStrip(); } return; }
      case 'edit': editing = !editing; drawInterp(); return;
      case 'broad': broad = !broad; drawInterp(); return;
      case 'more-like': broad = false; drawInterp(); return;
      case 'tell': apply(applyInterpret(getBrief(), { kind: b.dataset.v as 'more' | 'less' | 'drop', key: b.dataset.key! })); drawInterp(); return;
      case 'reset': apply(applyInterpret(getBrief(), { kind: 'reset' })); drawInterp(); return;
    }
  });
  prov.addEventListener('toggle', () => { if (prov.open) for (const el of prov.querySelectorAll<HTMLElement>('.ex-card')) want(el.dataset.exId!); });

  begin();
  return { destroy() { dead = true; io?.disconnect(); root.replaceChildren(); } };
}
