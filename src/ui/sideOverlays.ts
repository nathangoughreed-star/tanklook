// Split view overlays (lane SV1, Nathan 2026-11-12): "each side should get its own habitat check window, budget/cost window, and 'water set to'
// windows". With one tank the single, global overlays stay as they were. When a tank is split, a container is laid over each half of the view
// and holds its OWN copy of: the Habitat check tile (ui/fullnessTile.ts), the cost pill (ui/demandPanel.ts), the Checks pill (ui/checksStrip.ts)
// and the Water / Air chip. Each copy is built on a sideStore (ui/sideStore.ts), so it reads, and when clicked edits, only ITS tank. A side's open /
// minimized state lives in its copy: this session only (the Habitat check still starts minimized).
// Layout per side: Habitat check top-left (A: under the view's buttons), cost top-right under the tank tab, Checks + Water chip in a column at the
// bottom right of the side (clear of each side's Map card at the bottom-left; side B's column rides above the Discover pill / card).
import type { Viewer } from '../render/viewer';
import type { Store } from '../scene/store';
import { sideStore } from './sideStore';
import { attachFullnessTile } from './fullnessTile';
import { attachDemandPanel } from './demandPanel';
import { attachChecksStrip } from './checksStrip';
import { climateHtml } from '../data/climate';

/** True while the view shows two independent tanks (not Discovery's A / B pair, which has its own cards). */
export const splitSides = (store: Store, viewer: Viewer) => store.split && !viewer.pairShown && !store.frozen && viewer.active.length > 1;

interface Side {
  i: number; root: HTMLElement; bot: HTMLElement; dm: HTMLElement; chip: HTMLElement; chipOpen: boolean; chipSig: string;
  tile: ReturnType<typeof attachFullnessTile>; demand: ReturnType<typeof attachDemandPanel>; checks: ReturnType<typeof attachChecksStrip>;
}

export function attachSideOverlays(viewer: Viewer, store: Store) {
  const host = document.getElementById('view')!;
  let sides: Side[] | null = null, wasOn = false, sig = '';
  const on = () => splitSides(store, viewer);

  const build = (i: number): Side => {
    const ss = sideStore(store, i), gate = () => on();
    const root = document.createElement('div'); root.className = 'sideov'; root.dataset.side = i ? 'B' : 'A'; root.hidden = true;
    const dm = document.createElement('div'); dm.className = 'dmfloat sv'; root.append(dm);
    const bot = document.createElement('div'); bot.className = 'svBot'; root.append(bot);
    host.append(root);
    const tile = attachFullnessTile(viewer, ss, { host: root, gate });
    const demand = attachDemandPanel(ss, dm, { side: true, gate });
    const checks = attachChecksStrip(ss, () => { const d = demand.state(); return { ...(d ? { totals: d.demand.totals } : {}), limits: demand.profile().limits }; }, { host: bot, gate, always: true });
    const chip = document.createElement('div'); chip.className = 'climate sv'; chip.hidden = true; bot.append(chip);
    const s: Side = { i, root, bot, dm, chip, chipOpen: false, chipSig: '', tile, demand, checks };
    chip.onclick = () => { s.chipOpen = !s.chipOpen; drawChip(s); };
    // narrow side: the Habitat check and the cost card would cover each other when both are open, so opening one folds the other
    root.addEventListener('click', ev => {
      if (root.clientWidth >= 640) return;
      const ft = root.querySelector<HTMLElement>('.ft.sv'), hit = ev.target as HTMLElement;
      if (!ft || ft.classList.contains('min') || dm.classList.contains('closed')) return;
      (hit.closest('.ft') ? dm.querySelector<HTMLElement>('.dmtog') : ft.querySelector<HTMLElement>('.ftHead'))?.click();
    });
    return s;
  };

  const drawChip = (s: Side) => {
    const S = store.scene.tanks[s.i]; if (!S) return;
    let html = ''; try { html = climateHtml(S, s.chipOpen, store.scene.units === 'in'); } catch { /* an unfinished tank has nothing to say */ }
    const key = (s.chipOpen ? 'o' : 'c') + html;
    if (key === s.chipSig) return; s.chipSig = key;
    s.chip.innerHTML = html; s.chip.hidden = !html; s.chip.classList.toggle('open', s.chipOpen);
  };

  const layout = () => {
    const now = on();
    host.classList.toggle('sv-split', now);
    if (!now) { if (sides) for (const s of sides) s.root.hidden = true; wasOn = false; return; }
    if (!sides) sides = [build(0), build(1)];
    const vt = host.querySelector<HTMLElement>('.viewtools'), dq = host.querySelector<HTMLElement>('.dq10');
    const hr = host.getBoundingClientRect(), lift = dq && !dq.hidden ? Math.max(0, Math.round(hr.bottom - dq.getBoundingClientRect().top) + 8 - 10) : 0, tabs = ['labA', 'labB'].map(id => document.getElementById(id)), hb = host.getBoundingClientRect().top;
    const act = viewer.active, nxt = JSON.stringify([act.map(v => [v.x, v.w]), vt ? [vt.offsetLeft + vt.offsetWidth, vt.offsetTop + vt.offsetHeight] : 0, lift, tabs.map(t => (t && t.style.display !== 'none' ? Math.round(t.getBoundingClientRect().bottom - hb) : 0))]);
    sides.forEach((s, k) => {
      const vp = act[k]; if (!vp) { s.root.hidden = true; return; }
      s.root.hidden = false;
      if (nxt === sig) return;
      // under the view's buttons wherever they reach into this side (a phone: they pass the middle)
      const tb = tabs[k] && tabs[k]!.style.display !== 'none' ? Math.round(tabs[k]!.getBoundingClientRect().bottom - hb) + 8 : 10;
      const under = Math.max(tb, vt ? vt.offsetTop + vt.offsetHeight + 8 : 10);   // HM3: the shared cluster sits top middle, over the divider: both sides start below it
      Object.assign(s.root.style, { left: vp.x + 'px', width: vp.w + 'px', top: '0', bottom: '0' });
      s.root.style.setProperty('--sv-top', under + 'px'); s.root.style.setProperty('--sv-dm', under + 'px'); // both top cards start under the tank tab and the view's buttons
      s.root.style.setProperty('--sv-lift', (k === 1 ? lift : 0) + 'px');
    });
    sig = nxt;
    if (!wasOn) { wasOn = true; sig = ''; for (const s of sides) { s.demand.recompute(); s.checks.refresh(); } }
    for (const s of sides) drawChip(s);
  };
  viewer.onDrawn(layout);
  store.subscribe(kind => { if (kind !== 'view' && sides && on()) for (const s of sides) drawChip(s); });
  return { sides: () => sides };
}
