// The group bar (lane MS): the Multi button and the strip over the view that acts on a selection of two or more animals and
// pieces (duplicate, copies with variation, turn, resize, delete), plus the keys for the same. The selection itself lives in
// the Store; the drag-and-box handling in interact/pointer.ts; the maths in scene/duplicate.ts.
import { COPY_DEFAULTS, copyGroup, groupSize, removeGroup, scaleGroup, turnGroup, type Group } from '../scene/duplicate';
import { supportLift } from '../interact/pointer';
import { LIMITS } from '../scene/validate';
import { MAX_ITEMS } from '../scene/items';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';

export function attachGroupBar(store: Store, viewer: Viewer, status: (msg: string, bad?: boolean) => void) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const bar = $('groupBar'), copyBox = $('gbCopyBox'), multi = $('multiBtn');
  let copiesOpen = false;

  const noun = (g: Group) => {
    const a = g.fish.length, b = g.items.length, c = g.patches?.length ?? 0;
    return [a && `${a} animal${a > 1 ? 's' : ''}`, b && `${b} piece${b > 1 ? 's' : ''}`, c && `${c} patch${c > 1 ? 'es' : ''}`].filter(Boolean).join(' + ');
  };
  const show = () => {
    const g = store.group, n = groupSize(g);
    multi.classList.toggle('on', store.multi); multi.setAttribute('aria-pressed', String(store.multi));
    bar.hidden = n < 2 && !(copiesOpen && n === 1) && !g.patches?.length;
    $('gbCount').textContent = noun(g) || 'Nothing selected';
    copyBox.hidden = !copiesOpen || bar.hidden; $('gbCopies').setAttribute('aria-expanded', String(!copyBox.hidden));
  };
  store.subscribe(show); show();

  multi.onclick = () => store.setMulti(!store.multi);
  const slider = (id: string, out: string, fmt: (v: number) => string) => {
    const el = $<HTMLInputElement>(id), o = $(out), upd = () => { o.textContent = fmt(+el.value); };
    el.oninput = upd; upd(); return el;
  };
  const sN = slider('gbN', 'oGbN', v => `×${v}`), sA = slider('gbAngle', 'oGbAngle', v => `${v}°`), sS = slider('gbScale', 'oGbScale', v => `${v}%`), sP = slider('gbSpace', 'oGbSpace', v => `${v}%`);
  const shape = $<HTMLInputElement>('gbShape');

  /** Copy the group n times with the given jitter; the copies become the selection. */
  function copies(o: Partial<typeof COPY_DEFAULTS>) {
    const g = store.group; if (!groupSize(g)) return;
    const T = store.tank;
    if ((g.fish.length && T.fish.length >= LIMITS.maxFish) || (g.items.length && T.items.length >= MAX_ITEMS)) { status(`A tank holds at most ${LIMITS.maxFish} animals and ${MAX_ITEMS} pieces.`, true); return; }
    const seed = 1 + Math.floor(Math.random() * 1e9), ids = { fish: store.nextId(), item: store.nextItemId() }, vp = viewer.vps[store.scene.active];
    let made: Group = { fish: [], items: [], patches: [] };
    store.edit(t => {
      const m = copyGroup(t, g, { ...COPY_DEFAULTS, ...o, seed, support: (x, d, skip) => supportLift(vp, t, x, d, skip) }, ids);
      if (!groupSize(made)) made = m;
    });
    if (groupSize(made)) { store.selectGroup(made); status(`Made ${noun(made)}. Ctrl+Z takes them back.`); }
  }
  const dup = () => copies({ n: 1 });
  $('gbDup').onclick = dup;
  $('gbCopies').onclick = () => { copiesOpen = !copiesOpen; show(); };
  $('gbMake').onclick = () => copies({ n: +sN.value, angle: +sA.value, scale: +sS.value, spacing: +sP.value, reshape: shape.checked });
  const turn = (d: number) => { const g = store.group; store.edit(t => turnGroup(t, g, d), { coalesce: 'grp-turn' }); };
  const size = (k: number) => { const g = store.group; store.edit(t => scaleGroup(t, g, k), { coalesce: 'grp-size' }); };
  const del = () => { const g = store.group; store.edit(t => removeGroup(t, g)); store.select(null); };
  $('gbTurnL').onclick = () => turn(-15); $('gbTurnR').onclick = () => turn(15);
  $('gbSmall').onclick = () => size(1 / 1.1); $('gbBig').onclick = () => size(1.1);
  $('gbDel').onclick = del; $('gbClear').onclick = () => { copiesOpen = false; store.select(null); };

  // keys: with two or more selected they act on all (ahead of the single-selection keys in the panel code)
  addEventListener('keydown', e => {
    const t = e.target as HTMLElement, typing = (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
    if (typing || e.altKey || store.groupCount < 1 || (store.groupCount < 2 && !store.group.patches?.length)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const take = (fn: () => void) => { e.preventDefault(); e.stopImmediatePropagation(); fn(); };
    if (mod) { if (k === 'd') take(dup); return; }
    if (k === 'delete' || k === 'backspace') take(del);
    else if (k === 'r') take(() => turn(e.shiftKey ? -15 : 15));
    else if (k === '+' || k === '=') take(() => size(1.1));
    else if (k === '-' || k === '_') take(() => size(1 / 1.1));
    else if (k === 'escape') take(() => { copiesOpen = false; store.select(null); });
  }, true);
  for (const id of ['iCopies', 'fCopies']) $(id).onclick = () => { copiesOpen = !copiesOpen; show(); }; // from the single piece / animal boxes in the panel
}
