// Dev check for audit #52-53: does the incremental build (patchTank / patchLook) draw exactly what a full rebuild draws?
// Not imported by the app. In the dev server's console:
//   const c = await import('/src/render/incrementalCheck.ts'); await c.runAll(__gb.store, __gb.viewer)
import type { Store } from '../scene/store';
import type { Viewer } from './viewer';
import { parseScene } from '../scene/validate';

type Edit = [name: string, fn: (s: Store) => void];

/** Edits that should take the incremental path: one fish or item moved / turned / resized, selection, the patched colours, undo. */
export function edits(): Edit[] {
  const t = (s: Store) => s.scene.tanks[0];
  const E = (fn: (s: Store) => void): ((s: Store) => void) => fn;
  const fish = (s: Store, k = 0) => t(s).fish[Math.min(k, t(s).fish.length - 1)];
  const stone = (s: Store) => t(s).items.find(i => i.kind !== 'plant'), plant = (s: Store) => t(s).items.find(i => i.kind === 'plant');
  const ed = (s: Store, fn: () => void) => s.editTank(0, fn);
  return [
    ['fish move', E(s => ed(s, () => { const f = fish(s); if (f) f.x += 7; }))],
    ['fish rotate', E(s => ed(s, () => { const f = fish(s, 3); if (f) f.yaw += 25; }))],
    ['fish resize', E(s => ed(s, () => { const f = fish(s, 5); if (f) f.tl = 35; }))],
    ['fish raise', E(s => ed(s, () => { const f = fish(s, 7); if (f) f.y += 15; }))],
    ['select fish', E(s => { const f = fish(s, 2); if (f) s.select(f.id); })],
    ['stone move', E(s => ed(s, () => { const i = stone(s); if (i) i.x += 9; }))],
    ['stone turn', E(s => ed(s, () => { const i = stone(s); if (i) i.yaw += 30; }))],
    ['stone resize', E(s => ed(s, () => { const i = stone(s); if (i) i.size *= 1.1; }))],
    ['plant move', E(s => ed(s, () => { const i = plant(s); if (i) i.x -= 9; }))],
    ['select item', E(s => { const i = stone(s); if (i) s.selectItem(i.id); })],
    ['delete fish', E(s => ed(s, () => { t(s).fish.splice(1, 1); }))],
    ['duplicate fish', E(s => ed(s, () => { const f = fish(s); if (f) t(s).fish.push({ ...f, id: s.nextId(), x: f.x + 20 }); }))],
    ['undo', E(s => s.undo())],
    ['water colour', E(s => ed(s, () => { t(s).water.color = '#7a9a6a'; t(s).water.opacity = Math.max(0.05, t(s).water.opacity * 1.5); }))],
    ['wall colour', E(s => ed(s, () => { t(s).wall.color = '#c8b8a8'; }))],
    ['substrate colours', E(s => ed(s, () => { const c = t(s).substrate.custom; c.color = '#a08060'; c.color2 = '#404850'; c.share = 40; c.mix = 0.7; }))],
    ['light power', E(s => ed(s, () => { const l = t(s).light; l.watts = (l.watts ?? 0) + 30; l.mapUnit = 'lux'; }))],
    ['fish stand out', E(s => ed(s, () => { t(s).render.pop = 0.6; }))],
    ['redo', E(s => s.redo())],
  ];
}

/** Pixels of the canvas as last drawn (call right after draw). */
function grab(v: Viewer) {
  const gl = v.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return px;
}

/**
 * Apply each edit, draw incrementally, then rebuild from scratch and draw twice: count the pixels of the incremental
 * frame that match neither full-rebuild frame. Two frames, because a full rebuild's own first and second draw can
 * differ by a few pixels (seen on 2 of 126 edits, 2026-10-14, not from the incremental path); `jitter` = how many
 * pixels those two differ by.
 */
export function check(store: Store, v: Viewer, list = edits()) {
  const out: { edit: string; build: string; diff: number; maxDelta: number; jitter: number; box: number[] }[] = [];
  v.incremental = true; v.rebuild(); v.draw();
  for (const [edit, fn] of list) {
    fn(store); v.draw(); const a = grab(v), build = v.lastBuild.join(' / ');
    v.rebuild(); v.draw(); const b = grab(v); v.draw(); const c = grab(v);
    let diff = 0, maxDelta = 0, jitter = 0; const box = [Infinity, Infinity, -1, -1]; // differing pixels: x0, y0, x1, y1 (buffer px from the top left)
    const w = v.renderer.getContext().drawingBufferWidth, h = v.renderer.getContext().drawingBufferHeight;
    const delta = (x: Uint8Array, i: number) => Math.max(Math.abs(a[i] - x[i]), Math.abs(a[i + 1] - x[i + 1]), Math.abs(a[i + 2] - x[i + 2]));
    for (let i = 0; i < a.length; i += 4) {
      if (b[i] !== c[i] || b[i + 1] !== c[i + 1] || b[i + 2] !== c[i + 2]) jitter++;
      const d = Math.min(delta(b, i), delta(c, i));
      if (d) {
        diff++; maxDelta = Math.max(maxDelta, d);
        const x = (i / 4) % w, y = h - 1 - Math.floor(i / 4 / w);
        box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
      }
    }
    out.push({ edit, build, diff, maxDelta, jitter, box });
  }
  return out;
}

/** The check on every example tank, plus a split view of the planted one. One line per edit that differs. */
export async function runAll(store: Store, v: Viewer, names = ['planted', 'iwagumi', 'paludarium', 'reef', 'terrarium', 'betta-bowl']) {
  const lines: string[] = [];
  let edits = 0, bad = 0, patched = 0, jitter = 0;
  const run = (label: string) => {
    for (const r of check(store, v)) {
      edits++; if (r.jitter) jitter++;
      if (r.build.includes('patch') || r.build.includes('look') || r.build.includes('same')) patched++;
      if (r.diff) { bad++; lines.push(`${label} / ${r.edit} [${r.build}]: ${r.diff} px differ (max ${r.maxDelta}) in ${r.box.join(',')}`); }
    }
  };
  const load = async (n: string) => store.replace(parseScene(await fetch(`/src/examples/${n}.json`).then(r => r.text())).scene);
  for (const n of names) { await load(n); run(n); }
  await load('planted'); store.splitTank(); run('planted split');
  return [`${edits} edits, ${patched} took the incremental path, ${bad} differ from a full rebuild; ${jitter} full rebuilds differed from their own redraw`, ...lines].join('\n');
}
