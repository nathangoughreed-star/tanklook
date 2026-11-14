// UI2 shell step 7 (lane S7, 2026-11-14): the Plants section's view-models and edits (screen map §2a row "Section Plants"): the
// library greyed by light with P3's one-line reasons, placed plants, and growth over time. No DOM. The gate is P3's
// ui/logic/plantGate.ts; Experience is ONE input to it (`careChosen`, which lane P10 replaces): the shell passes it through.
import { gateView, gatedChips, setGate, careChosen, type GateView } from '../../ui/logic/plantGate';
import { CARE_NAME } from '../../scene/plantfit';
import { FEED_NAMES, beginGrow, endGrow, setGrowTime, timeChanges } from '../../scene/growtime';
import { syncBroods } from '../../scene/propagate';
import { clampItem } from '../../scene/items';
import { libraryView, type LibraryView } from './scape';
import type { GrowFeed, GrowMode, Item, TankSetup } from '../../scene/types';
import type { Store } from '../../scene/store';

export { careChosen };

export interface PlantsGate {
  on: boolean;
  /** the toggle is on and nothing is missing: the list is being filtered */
  active: boolean;
  hint: string;
  missing: string[];
  par: number | null;
  /** "Care level: Low-tech" -> the experience input the gate reads, shown as a line */
  careLine: string;
}
export function plantsGate(s: TankSetup, chosen: boolean = careChosen(s)): PlantsGate {
  const v: GateView = gateView(s, chosen);
  return { on: v.on, active: v.active, hint: v.hint, missing: v.missing, par: v.par, careLine: chosen ? `Care: ${CARE_NAME[s.grow.feed]}` : 'Care level not chosen yet' };
}
export const setPlantsGate = (store: Store, on: boolean) => store.edit(s => setGate(s, on));

/** The Plants library: every chip, greyed by the gate with its reason (a coral chip in a reef too). `chosen` = the experience input (P10). */
export function plantLibrary(s: TankSetup, q: string, chosen: boolean = careChosen(s)): LibraryView & { gate: PlantsGate; greyed: number } {
  const gate = plantsGate(s, chosen), v = gateView(s, chosen);
  const all = libraryView(s, 'plants', q);
  const chips = all.rows.flatMap(r => r.chips.map(c => ({ variant: c.id, salt: c.salt })));
  const why = new Map(gatedChips(v, s, chips).map(x => [x.variant, x.why]));
  const lib = libraryView(s, 'plants', q, why);
  return { ...lib, gate, greyed: lib.rows.reduce((n, r) => n + r.chips.filter(c => c.why).length, 0) };
}

// ---------------------------------------------------------------------------------------------------------------- growth over time
export interface GrowthView {
  plants: number; over: number;
  /** Time slider, 0-100 % */
  time: number; timeText: string;
  feed: GrowFeed; feeds: { id: GrowFeed; label: string }[];
  mode: GrowMode;
  hint: string;
  /** a preview is open and at rest: keep it or undo it */
  ask: boolean; running: boolean;
  disabled: string;
}
export interface GrowState { goal: { t: number; feed: GrowFeed } | null; sess: { mark: number } | null; left: number; held: boolean }
export const newGrowState = (): GrowState => ({ goal: null, sess: null, left: 0, held: false });
export function growthView(s: TankSetup, g: GrowState): GrowthView {
  const t = g.goal?.t ?? (g.sess || s.grow.mode === 'abs' ? s.grow.time : 0), plants = s.items.filter(it => it.kind === 'plant'), over = plants.filter(it => (it.growth ?? 0) >= 1).length;
  const hint = !plants.length ? 'Plant something first: growth moves every plant.' : g.left ? `Growing: ${g.left} plant${g.left > 1 ? 's' : ''} to go`
    : t === 0 ? (s.grow.mode === 'rel' ? 'Time 0: the tank as it is now' : g.sess ? 'Time 0: every plant just planted' : 'Move Time: every plant starts again just planted')
    : `${over} of ${plants.length} plants overgrown`;
  return {
    plants: plants.length, over, time: Math.round(t * 100), timeText: `${Math.round(t * 100)} %`, feed: g.goal?.feed ?? s.grow.feed,
    feeds: (Object.entries(FEED_NAMES) as [GrowFeed, string][]).map(([id, label]) => ({ id, label })), mode: s.grow.mode, hint,
    ask: !!g.sess && !g.held && !g.goal, running: !!g.goal, disabled: plants.length ? '' : 'No plants to grow',
  };
}

/** Hooks of the renderer's plant builder (render/items.ts), injected so this module stays DOM-free: a plant's first growth builds its full
 *  growth once (in a worker); a plant not built yet waits for it while the rest move. Without hooks every plant moves at once. */
export interface GrowHooks { warm?: (s: TankSetup, it: Item) => boolean; worker?: () => boolean; prebuild?: (s: TankSetup, first: { S: TankSetup; items: Item[] }) => void; raf?: (f: () => void) => number; cancel?: (h: number) => void }

/** The Time preview as the old Plants panel runs it (panels.ts growStep / growTo / growKeep / growUndo), one controller per shell. */
export function createGrowth(store: Store, onChange: () => void, hooks: GrowHooks = {}) {
  const st = newGrowState();
  const raf = hooks.raf ?? ((f: () => void) => requestAnimationFrame(f)), cancel = hooks.cancel ?? ((h: number) => cancelAnimationFrame(h));
  let handle = 0, own = false;
  const waits = new Map<number, number>();
  const edit = (fn: (s: TankSetup) => void, opts: { coalesce?: string; history?: boolean } = { coalesce: 'growTime' }) => { own = true; try { store.edit(fn, opts); } finally { own = false; } };
  const step = () => {
    handle = 0; if (!st.goal) return;
    const { t, feed } = st.goal, worker = hooks.worker?.() ?? false;
    let left = 0;
    edit(s => {
      syncBroods(s, t, feed); // (daughters born by this Time are plants too, from here on)
      if (!hooks.warm) { left = setGrowTime(s, t, feed).length; st.left = left; return; }
      const byId = new Map(s.items.map(it => [it.id, it])), next: Item[] = [];
      let here = worker ? 0 : 1;
      for (const c of timeChanges(s, t, feed)) {
        const it = { ...byId.get(c.id)!, growth: c.growth, planted: c.planted };
        clampItem(it, s.tank, s);
        if (hooks.warm(s, it)) { waits.delete(c.id); continue; }
        const n = waits.get(c.id) ?? 0;
        if ((n >= 20 || !worker) && here-- > 0) { waits.delete(c.id); continue; }
        waits.set(c.id, n + 1); next.push(it);
      }
      const wait = new Set(next.map(it => it.id));
      left += setGrowTime(s, t, feed, c => !wait.has(c.id)).length;
      if (next.length && hooks.prebuild) hooks.prebuild(s, { S: s, items: next });
      st.left = left;
    });
    if (left) handle = raf(step); else { st.goal = null; st.left = 0; onChange(); }
    onChange();
  };
  const to = (t: number, feed: GrowFeed) => {
    if (!st.sess) { store.seal(); st.sess = { mark: store.mark }; edit(s => beginGrow(s)); }
    st.goal = { t, feed }; if (!handle) step();
  };
  const stop = () => { if (handle) cancel(handle); handle = 0; st.goal = null; st.left = 0; waits.clear(); st.sess = null; };
  const unsub = store.subscribe(kind => { if (st.sess && !own && (kind === 'scene' || kind === 'load')) { if (kind === 'load') { stop(); onChange(); } else keep(); } });
  function keep() { const sess = st.sess; if (!sess) return; stop(); edit(s => endGrow(s), { history: false }); store.squash(sess.mark); onChange(); }
  return {
    state: st,
    /** drag the Time slider (value 0-100) */
    move(v: number) { st.held = true; to(v / 100, st.goal?.feed ?? store.tank.grow.feed); onChange(); },
    /** let go of the slider */
    release() { st.held = false; onChange(); },
    keep,
    undo() { const sess = st.sess; if (!sess) return; stop(); store.rollback(sess.mark); onChange(); },
    setFeed(feed: GrowFeed) {
      if (st.sess) to(st.goal?.t ?? store.tank.grow.time, feed); // the preview regrows at the new speed
      else { store.seal(); edit(s => { s.grow.feed = feed; }, {}); }
      onChange();
    },
    setMode(mode: GrowMode) {
      const t = st.goal?.t ?? (st.sess ? store.tank.grow.time : 0), feed = st.goal?.feed ?? store.tank.grow.feed;
      if (st.sess) { const { mark } = st.sess; stop(); store.rollback(mark); } // a preview starts over from the new Time 0
      store.seal(); edit(s => { s.grow.mode = mode; s.grow.time = 0; }, {});
      if (t > 0) to(t, feed); else store.seal();
      onChange();
    },
    dispose() { stop(); unsub(); },
  };
}
export type Growth = ReturnType<typeof createGrowth>;
