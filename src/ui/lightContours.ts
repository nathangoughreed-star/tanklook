// Light map contour labels (Nathan 2026-10-14: "like an elevation map shows elevation"): with the Light map on and the
// fixture's power set, the shader draws contour lines (every light.mapStep PAR, 20 by default, or
// mapStepLux lux, 1000); this puts the value on each line, as a contour map does. The light model (scene/lightout.ts bandsAt, the
// function the shader is a port of) is sampled over the ground, each level traced by marching squares, and a label set
// on every traced line long enough to read, about one per 25 cm along it. Traced again only when the setup changes;
// the labels follow the camera on every draw.
import * as THREE from 'three';
import { MAP_DIV, mapStepOf } from '../render/lighting';
import type { Viewer } from '../render/viewer';
import { bandsAt, lightEnvCached, luxOf, parOf, wattsOf } from '../scene/lightout';
import { bowlRadius, insideBy } from '../scene/shape';
import { groundHeight, groundInsideBy } from '../scene/terrain';
import type { Tank, TankSetup } from '../scene/types';

type Label = { p: THREE.Vector3; text: string };

const fmt = (v: number, unit: 'par' | 'lux') => unit === 'par' ? String(v)
  : v >= 1000 ? `${+(v / 1000).toFixed(2)}k` : String(v);

/** Contour labels for one setup: the ground sampled on a grid, each doubling traced, labels spaced along each line. */
export function contourLabels(S: TankSetup, T: Tank): Label[] {
  const L: Label[] = [], env = lightEnvCached({ ...S, tank: T });
  if (!env) return L;
  const unit = S.light.mapUnit ?? 'par', div = MAP_DIV[unit], step = mapStepOf(S.light, unit);
  const nx = 64, nz = Math.max(8, Math.round(nx * T.D / T.L)), dx = T.L / nx, dz = T.D / nz;
  // on the map layer when one is set (a flat surface facing up), else on the ground
  const sl = S.light.mapSlice ?? 0, flat = sl > 0, r = flat ? bowlRadius(T, sl) : Infinity;
  const h = (x: number, d: number) => (flat ? sl : groundHeight(S, T, x, d));
  // t at each grid node (the shader's aqC; lines at whole t): level / step, or log2(level / div) at doublings; NaN off the ground
  const t: number[][] = [];
  for (let i = 0; i <= nx; i++) {
    const row: number[] = []; t.push(row);
    for (let j = 0; j <= nz; j++) {
      const x = i * dx, d = j * dz;
      if ((flat ? Math.min(insideBy(T, x, d), r - Math.hypot(x - T.L / 2, d - T.D / 2)) : groundInsideBy(S, T, x, d)) <= 1) { row.push(NaN); continue; }
      const hx = (h(x + 5, d) - h(x - 5, d)) / 10, hd = (h(x, d + 5) - h(x, d - 5)) / 10, k = Math.hypot(hx, 1, hd);
      const b = bandsAt(env, [x, h(x, d) + 0.5, -d], [-hx / k, 1 / k, hd / k]);
      const lv = Math.max(unit === 'lux' ? luxOf(b) : parOf(b), 1e-6);
      row.push(step ? lv / step : Math.log2(lv / div));
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (const r of t) for (const v of r) if (v === v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const SPACE = 250, MIN = 60; // mm along a line between labels; shorter lines get none
  for (let n = Math.max(step ? 1 : 0, Math.ceil(lo)); n <= hi; n++) {
    // marching squares: segments of the level-n line, chained into polylines by shared edge points
    const segs: [string, string][] = [], pts = new Map<string, [number, number]>();
    const edge = (i0: number, j0: number, i1: number, j1: number) => {
      const a = t[i0][j0], b = t[i1][j1], f = (n - a) / (b - a), key = `${i0},${j0},${i1},${j1}`;
      if (!pts.has(key)) pts.set(key, [(i0 + f * (i1 - i0)) * dx, (j0 + f * (j1 - j0)) * dz]);
      return key;
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const c = [t[i][j], t[i + 1][j], t[i + 1][j + 1], t[i][j + 1]];
      if (c.some(v => v !== v)) continue;
      const e: string[] = [], corners: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      for (let k = 0; k < 4; k++) {
        const [ia, ja] = corners[k], [ib, jb] = corners[(k + 1) % 4], a = c[k], b = c[(k + 1) % 4];
        if ((a < n) !== (b < n)) e.push(ia < ib || (ia === ib && ja < jb) ? edge(ia, ja, ib, jb) : edge(ib, jb, ia, ja));
      }
      if (e.length === 2) segs.push([e[0], e[1]]);
      else if (e.length === 4) segs.push([e[0], e[1]], [e[2], e[3]]);
    }
    const nb = new Map<string, string[]>();
    for (const [a, b] of segs) { (nb.get(a) ?? nb.set(a, []).get(a)!).push(b); (nb.get(b) ?? nb.set(b, []).get(b)!).push(a); }
    const seen = new Set<string>();
    for (const start of [...[...nb.keys()].filter(k => nb.get(k)!.length === 1), ...nb.keys()]) {
      if (seen.has(start)) continue;
      const line: [number, number][] = [];
      for (let cur: string | undefined = start; cur && !seen.has(cur);) {
        seen.add(cur); line.push(pts.get(cur)!);
        cur = nb.get(cur)!.find(k => !seen.has(k));
      }
      let len = 0;
      const cum = line.map((p, k) => (len += k ? Math.hypot(p[0] - line[k - 1][0], p[1] - line[k - 1][1]) : 0));
      if (len < MIN) continue;
      const count = Math.max(1, Math.round(len / SPACE)), text = fmt(step ? n * step : div * 2 ** n, unit);
      for (let q = 0; q < count; q++) {
        const at = len * (q + 0.5) / count, k = Math.max(1, cum.findIndex(c => c >= at)), [x, d] = line[k];
        L.push({ p: new THREE.Vector3(x, h(x, d) + 0.5, -d), text });
      }
    }
  }
  return L;
}

export function attachLightContours(viewer: Viewer) {
  const pool: HTMLDivElement[] = [], cache: { key: string; labels: Label[] }[] = [];
  const v = new THREE.Vector3();
  viewer.onDrawn(() => {
    let used = 0;
    viewer.active.forEach((vp, k) => {
      const S = vp.S, l = S.light;
      if (!S.render.beams || !(wattsOf({ ...S, tank: vp.T }) > 0) || !S.substrate.show) return;
      const key = JSON.stringify([vp.T, l, S.lid, S.water, S.substrate, S.layout.id, S.layout.seed, S.terrain]);
      if (cache[k]?.key !== key) cache[k] = { key, labels: contourLabels(S, vp.T) };
      const placed: [number, number][] = []; // on screen: a label that would overlap one already placed is left out
      // the shells' values, when they are shown (render/lightShells), ahead of the lines so they win a place
      const sh = vp.scene?.getObjectByName('lightShells'), shellLabs: Label[] = sh?.visible
        ? (sh.userData.labels as { p: THREE.Vector3; level: number }[]).map(s => ({ p: s.p, text: fmt(s.level, l.mapUnit ?? 'par') })) : [];
      for (const lab of [...shellLabs, ...cache[k].labels]) {
        v.copy(lab.p).project(vp.cam);
        if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) continue;
        const sx = vp.x + (v.x + 1) / 2 * vp.w, sy = vp.y + (1 - v.y) / 2 * vp.h;
        if (placed.some(([px, py]) => Math.abs(px - sx) < 34 && Math.abs(py - sy) < 16)) continue;
        placed.push([sx, sy]);
        let el = pool[used];
        if (!el) {
          el = pool[used] = document.createElement('div');
          el.className = 'lightContour';
          el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);padding:0 3px;border-radius:3px;pointer-events:none;'
            + 'font:600 11px/1.3 system-ui,"Segoe UI",sans-serif;color:#111;background:rgba(255,255,255,0.72);white-space:nowrap;z-index:1';
          viewer.host.appendChild(el);
        }
        used++;
        el.style.display = ''; el.textContent = lab.text;
        el.style.left = `${sx}px`; el.style.top = `${sy}px`;
      }
    });
    for (let k = used; k < pool.length; k++) pool[k].style.display = 'none';
  });
}
