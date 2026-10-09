// 3D fish bodies (roadmap step 1, style test): the body is lofted from the body plan's side profile with a thickness
// per station, and a painted side texture (colours, markings, scales; no eye, gill or mouth, which would smear where
// the surface turns away from the side) is projected onto both flanks. Eyes are real domes set into the head. The flat
// card stays as the fins (thin membranes); its painted body sits inside the solid. Nose and tail tips are unchanged,
// so nose-to-tail stays adult TL.
import * as THREE from 'three';
import { PLANS, eyeSpot, pairedFins, profile, type Plan } from '../art/fishgen';
import type { EdgeMode } from '../scene/types';
import { cardMaterial, pairedFinTexture } from './textures';

/** Species drawn in 3D (test set) and a switch for before/after pictures. */
export const fish3d = { on: true, species: new Set(['cardinal', 'discus', 'bronzecory']) };

export const has3D = (art: string) => fish3d.on && fish3d.species.has(art) && PLANS[art]?.thick != null;

const STATIONS = 40, RING = 28, EXP = 2.4; // superellipse exponent: slightly boxy flanks
/** Pull the solid this far inside the painted outline (widths), so its edge never samples the card's transparent rim. */
const INSET = 0.006;
const sp = (c: number) => Math.sign(c) * Math.abs(c) ** (2 / EXP);
const bendZ = (bend: number, x: number) => bend * 0.14 * (1 - (2 * x) ** 2);

/** Cross-section at u: centre line vc, half-depth hv, half-thickness t (all widths). */
function sections(p: Plan) {
  const prof = profile(p), thick = p.thick!;
  const maxHv = Math.max(...Array.from({ length: 41 }, (_, i) => { const [a, b] = prof(p.pedU + (1 - p.pedU) * i / 40); return (b - a) / 2; }));
  return (u: number) => {
    const [a, b] = prof(u), s = (u - p.pedU) / (1 - p.pedU), vc = (a + b) / 2, hv = Math.max(0, (b - a) / 2 - INSET);
    // thickness follows depth but stays fuller toward the head (fish are widest behind the gills)
    const t = thick * (0.35 * hv + 0.65 * maxHv * Math.sin(Math.min(1, hv / maxHv) * Math.PI / 2)) * (0.55 + 0.45 * Math.sqrt(s));
    return { vc, hv, t };
  };
}

/**
 * Unit body (card width 1, centred like the card plane: x = u - 0.5, y = -v), bent like `cardGeometry`.
 * UVs are the side projection of the card texture: (u, 0.5 - v / aspect).
 */
function bodyGeometry(p: Plan, aspect: number, bend: number) {
  const ring = sections(p), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < STATIONS; i++) {
    const k = i / (STATIONS - 1), u = p.pedU + (1 - p.pedU) * (1 - Math.cos(k * Math.PI / 2) ** 1.5); // denser at the nose
    const { vc, hv, t } = ring(u), x = u - 0.5, z0 = bendZ(bend, x);
    for (let j = 0; j <= RING; j++) {
      const th = j / RING * Math.PI * 2, v = vc - hv * sp(Math.cos(th));
      pos.push(x, -v, z0 + t * sp(Math.sin(th)));
      uv.push(u, 0.5 - v / aspect);
    }
  }
  const R = RING + 1;
  for (let i = 0; i < STATIONS - 1; i++) for (let j = 0; j < RING; j++) {
    const a = i * R + j, b = a + R;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // outward-facing (FrontSide)
  }
  // cap the cut at the peduncle (the tail fin on the card covers the joint)
  const { vc } = ring(p.pedU), c = pos.length / 3, x0 = p.pedU - 0.5;
  pos.push(x0, -vc, bendZ(bend, x0)); uv.push(p.pedU, 0.5 - vc / aspect);
  for (let j = 0; j < RING; j++) idx.push(c, j + 1, j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // soft form shading: the belly and the underside of the flanks turn away from the light above
  const n = g.attributes.normal, col: number[] = [];
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i), k = 1 - 0.28 * Math.max(0, -ny) + 0.04 * Math.max(0, ny); col.push(k, k, k); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.userData.keep = true; // shared across rebuilds
  return g;
}

/**
 * Where each eye sits on the body surface (unit frame) and which way it faces: the plan's eye point on each flank,
 * the dome's axis along the local surface normal, turned slightly forward (fish eyes look ahead a little).
 */
function eyePlacements(p: Plan, bend: number) {
  const e = eyeSpot(p), { vc, hv, t } = sections(p)(e.u), x = e.u - 0.5;
  // invert v = vc - hv * sp(cos th) for the angle on the section, then the point and the ellipse normal there
  const cs = Math.max(-1, Math.min(1, (vc - e.v) / Math.max(hv, 1e-6))), c = Math.sign(cs) * Math.abs(cs) ** (EXP / 2);
  const s = Math.sqrt(Math.max(0, 1 - c * c)), z = t * sp(s);
  return [1, -1].map(side => {
    const n = new THREE.Vector3(0.22, c / Math.max(hv, 1e-6), side * s / Math.max(t, 1e-6)).normalize();
    return { pos: new THREE.Vector3(x, -e.v, bendZ(bend, x) + side * z), n, r: e.r, iris: e.iris };
  });
}

/** Point on the body surface at card (u, v) on one flank (unit frame). */
function surfaceAt(p: Plan, u: number, v: number, side: number, bend: number) {
  const { vc, hv, t } = sections(p)(u), x = u - 0.5;
  const cs = Math.max(-1, Math.min(1, (vc - v) / Math.max(hv, 1e-6))), c = Math.sign(cs) * Math.abs(cs) ** (EXP / 2);
  return new THREE.Vector3(x, -v, bendZ(bend, x) + side * t * sp(Math.sqrt(Math.max(0, 1 - c * c))));
}

/** Paired-fin spread from the body (radians): pelvics hang down and out, pectorals swing out behind the gill cover. */
const SPREAD = { pelvic: 0.6, pectoral: 0.75 };

/**
 * Pectoral and pelvic fins as thin membranes on both flanks, rooted on the body surface and swung out from it
 * (pelvic about the body axis, pectoral about a vertical base), painted like the card's fins.
 */
function finMeshes(art: string, p: Plan, bend: number, edge: EdgeMode) {
  const out: THREE.Mesh[] = [];
  for (const f of pairedFins(p)) {
    const us = f.pts.map(q => q[0]), vs = f.pts.map(q => q[1]), m = 0.01;
    const box = { u0: Math.min(...us) - m, v0: Math.min(...vs) - m, w: Math.max(...us) - Math.min(...us) + 2 * m, h: Math.max(...vs) - Math.min(...vs) + 2 * m };
    const key = `fin:${art}:${f.kind}`;
    let g = geoCache.get(key);
    if (!g) {
      g = new THREE.PlaneGeometry(box.w, box.h);
      // root at the origin; card frame (x = u, y = -v)
      g.translate(box.u0 + box.w / 2 - f.root[0], -(box.v0 + box.h / 2 - f.root[1]), 0); g.userData.keep = true; geoCache.set(key, g);
    }
    const mat = cardMaterial(key, pairedFinTexture(art, f, box, edge), edge);
    for (const side of [1, -1]) {
      const mesh = new THREE.Mesh(g, mat), a = SPREAD[f.kind];
      // root slightly inside the surface so the base never shows a gap
      const s = surfaceAt(p, f.root[0], f.root[1], side, bend), z0 = bendZ(bend, s.x);
      mesh.position.set(s.x, s.y, z0 + (s.z - z0) * 0.85);
      if (f.kind === 'pelvic') mesh.rotation.x = -side * a; else mesh.rotation.set(-side * 0.25, side * a, 0, 'YXZ');
      out.push(mesh);
    }
  }
  return out;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Colours bled outward into the transparent area (the body material is opaque, so where the solid reaches past the
 * painted outline, near the nose and at grazing angles, it would show the black of empty texels).
 */
function bledTexture(map: THREE.Texture) {
  const src = map.image as HTMLCanvasElement, c = document.createElement('canvas'), t = document.createElement('canvas');
  c.width = t.width = src.width; c.height = t.height = src.height;
  const ctx = c.getContext('2d')!, tc = t.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  for (let k = 0; k < 10; k++) {
    tc.clearRect(0, 0, t.width, t.height); tc.drawImage(c, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) ctx.drawImage(t, dx, dy);
    ctx.globalCompositeOperation = 'source-over';
  }
  // the nose tip's columns stretch over the whole front of the head: soften them into a smooth blend there
  const bl = document.createElement('canvas'); bl.width = c.width; bl.height = c.height;
  const bc = bl.getContext('2d')!; bc.filter = `blur(${Math.round(c.width * 0.008)}px)`; bc.drawImage(c, 0, 0); bc.filter = 'none';
  const mk = bc.createLinearGradient(c.width * 0.84, 0, c.width * 0.96, 0); mk.addColorStop(0, 'rgba(0,0,0,0)'); mk.addColorStop(1, '#000');
  bc.globalCompositeOperation = 'destination-in'; bc.fillStyle = mk; bc.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bl, 0, 0);
  const out = new THREE.CanvasTexture(c); out.colorSpace = map.colorSpace; out.anisotropy = map.anisotropy;
  return out;
}

/** Eye dome texture by angle from the pole (SphereGeometry: top pole = uv.y 1): pupil, iris, then dark rim. */
function eyeTexture(iris: [string, string]) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const ctx = c.getContext('2d')!, g = ctx.createLinearGradient(0, 0, 0, 128);
  // a big black pupil and a narrow, dark-edged iris: a pale wide ring reads as a cartoon eye
  g.addColorStop(0, '#050606'); g.addColorStop(0.2, '#0a0b0c'); g.addColorStop(0.23, iris[1]); g.addColorStop(0.27, iris[0]);
  g.addColorStop(0.33, iris[1]); g.addColorStop(0.38, '#20221d'); g.addColorStop(1, '#20221d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const dome = (() => { const g = new THREE.SphereGeometry(1, 24, 16); g.scale(1, 0.38, 1); g.userData.keep = true; return g; })();

const fishMat = (key: string, make: () => THREE.MeshBasicMaterial) => {
  let m = matCache.get(key);
  if (!m) { m = make(); m.userData.cached = true; m.userData.fish = true; matCache.set(key, m); }
  return m;
};

/**
 * The solid body + eyes for a fish card of width w; add it as a child of the card mesh. `map` = the species' body
 * texture (painted without eye, gill and mouth). Geometry is shared per species + bend.
 */
export function fishBody(art: string, aspect: number, w: number, bend: number, map: THREE.Texture, edge: EdgeMode) {
  const p = PLANS[art], b = Math.round(bend * 20) / 20, key = `${art}|${aspect}|${b}`;
  let g = geoCache.get(key); if (!g) { g = bodyGeometry(p, aspect, b); geoCache.set(key, g); }
  const grp = new THREE.Group(); grp.scale.setScalar(w);
  grp.add(new THREE.Mesh(g, fishMat('body:' + map.uuid, () => new THREE.MeshBasicMaterial({ map: bledTexture(map), vertexColors: true }))));
  for (const e of eyePlacements(p, b)) {
    const m = new THREE.Mesh(dome, fishMat('eye:' + art, () => new THREE.MeshBasicMaterial({ map: eyeTexture(e.iris) })));
    m.scale.setScalar(e.r); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.n);
    m.position.copy(e.pos).addScaledVector(e.n, -e.r * 0.3); // set into the head, bulging a little
    grp.add(m);
  }
  for (const f of finMeshes(art, p, b, edge)) grp.add(f);
  return grp;
}
