// The cut face of a stone the glass slices (Nathan 2026-10-28): a flat polygon with the rock's own colour and grain, added to
// the piece's mesh along each glass plane it crosses, so the rock reads solid from any angle (the stencil capping it
// replaces, render/items.ts capPasses, showed the inside from some orbit angles). Everything is in the piece's local space:
// the planes are brought in through the inverse of its matrix. A closed mesh gives closed cut loops; an open shell (its loops
// do not close) simply gets no cap there.
import * as THREE from 'three';

const Q = 1000; // quantise cut points to 1/1000 unit so the two triangles sharing an edge agree on where it is cut
const key = (p: THREE.Vector3) => `${Math.round(p.x * Q)},${Math.round(p.y * Q)},${Math.round(p.z * Q)}`;

interface Pt { p: THREE.Vector3; col: THREE.Vector3; grit: number[]; }

/**
 * The cap faces for `g` (position, color baked with `aBake`, aGrit) cut by `planes` (local space, kept where
 * normal . x + constant >= 0). `L` and `U` are the light and the up direction in the piece's local space (as bakedShape),
 * to light the flat face for its own normal. Returns null if no plane crosses it.
 */
export function stoneCap(g: THREE.BufferGeometry, planes: THREE.Plane[], L: THREE.Vector3, U: THREE.Vector3): THREE.BufferGeometry | null {
  const pos = g.attributes.position, col = g.attributes.color, bake = g.attributes.aBake, grit = g.attributes.aGrit, idx = g.index;
  if (!col || !bake || !grit) return null;
  const nTri = (idx ? idx.count : pos.count) / 3, vi = (t: number, k: number) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
  const P: number[] = [], C: number[] = [], N: number[] = [], G: number[] = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const plane of planes) {
    const d = new Float32Array(pos.count);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < pos.count; i++) { d[i] = plane.distanceToPoint(v[0].fromBufferAttribute(pos, i)); lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]); }
    if (lo >= 0 || hi < 0) continue; // not crossed (a piece wholly outside is not drawn at all)
    // each crossing triangle gives a segment from where its edge enters the kept side to where another leaves it
    const pts = new Map<string, Pt>(), next = new Map<string, string>();
    const cross = (a: number, b: number): string => {
      // the same point whichever triangle (and whichever vertex copy) asks: order the ends by position
      const pa = v[0].fromBufferAttribute(pos, a).clone(), pb = v[1].fromBufferAttribute(pos, b).clone();
      const swap = pa.x !== pb.x ? pa.x > pb.x : pa.y !== pb.y ? pa.y > pb.y : pa.z > pb.z;
      const [i, j, qa, qb] = swap ? [b, a, pb, pa] : [a, b, pa, pb];
      const di = d[i], dj = d[j], t = di / (di - dj), p = qa.clone().lerp(qb, t), k = key(p);
      if (!pts.has(k)) {
        const bk = (n: number) => bake.getX(n);
        const c = new THREE.Vector3(), c2 = new THREE.Vector3();
        c.set(col.getX(i), col.getY(i), col.getZ(i)).multiplyScalar(1 / Math.max(bk(i), 0.05));
        c2.set(col.getX(j), col.getY(j), col.getZ(j)).multiplyScalar(1 / Math.max(bk(j), 0.05));
        const gr = [0, 1, 2, 3].map(q => grit.getComponent(i, q) * (1 - t) + grit.getComponent(j, q) * t);
        pts.set(k, { p, col: c.lerp(c2, t), grit: gr });
      }
      return k;
    };
    for (let t = 0; t < nTri; t++) {
      const a = vi(t, 0), b = vi(t, 1), c = vi(t, 2), tri = [a, b, c];
      let enter = '', leave = '';
      for (let e = 0; e < 3; e++) {
        const i = tri[e], j = tri[(e + 1) % 3], ini = d[i] >= 0, inj = d[j] >= 0;
        if (ini === inj) continue;
        if (!ini) enter = cross(i, j); else leave = cross(i, j);
      }
      if (enter && leave && enter !== leave) next.set(enter, leave);
    }
    if (!next.size) continue;
    // loops
    const nOut = plane.normal.clone().negate(), ax = Math.abs(nOut.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(nOut, ax).normalize(), w = new THREE.Vector3().crossVectors(nOut, u);
    const seen = new Set<string>(), loops: { k: string[]; poly: THREE.Vector2[]; area: number }[] = [];
    for (const s of next.keys()) {
      if (seen.has(s)) continue;
      const ks: string[] = []; let cur = s, ok = false;
      for (let n = 0; n <= next.size; n++) {
        if (seen.has(cur) && cur !== s) break;
        if (n > 0 && cur === s) { ok = true; break; }
        seen.add(cur); ks.push(cur);
        const nx = next.get(cur); if (!nx) break; cur = nx;
      }
      if (!ok || ks.length < 3) continue;
      const poly = ks.map(k => new THREE.Vector2(pts.get(k)!.p.dot(u), pts.get(k)!.p.dot(w)));
      loops.push({ k: ks, poly, area: THREE.ShapeUtils.area(poly) });
    }
    if (!loops.length) continue;
    const net = loops.reduce((s, l) => s + l.area, 0), outer = loops.filter(l => l.area * net > 0), holes = loops.filter(l => l.area * net <= 0);
    const inside = (pt: THREE.Vector2, poly: THREE.Vector2[]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if ((poly[i].y > pt.y) !== (poly[j].y > pt.y) && pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) c = !c; return c; };
    const kc = 0.42 + 0.72 * Math.max(0, nOut.dot(L)) + 0.08 * nOut.dot(U), inset = plane.normal.clone().multiplyScalar(0.05);
    for (const o of outer) {
      const hs = holes.filter(h => inside(h.poly[0], o.poly) && !outer.some(o2 => o2 !== o && Math.abs(o2.area) < Math.abs(o.area) && inside(h.poly[0], o2.poly)));
      const all = [o, ...hs], flat = all.flatMap(l => l.k), faces = THREE.ShapeUtils.triangulateShape(o.poly, hs.map(h => h.poly));
      void all;
      for (const f of faces) {
        const q = f.map(i => pts.get(flat[i])!), tn = new THREE.Vector3().crossVectors(q[1].p.clone().sub(q[0].p), q[2].p.clone().sub(q[0].p));
        if (tn.dot(nOut) < 0) q.reverse(); // the face looks out through the glass
        for (const r of q) {
          const pp = r.p.clone().add(inset);
          P.push(pp.x, pp.y, pp.z); N.push(nOut.x, nOut.y, nOut.z);
          C.push(r.col.x * kc, r.col.y * kc, r.col.z * kc); G.push(...r.grit);
        }
      }
    }
  }
  if (!P.length) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  out.setAttribute('aGrit', new THREE.Float32BufferAttribute(G, 4));
  out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}
