// Builds a three.js scene for one tank from scene data. Rebuilt on every content change (cheap at this scale);
// textures and card materials are cached across rebuilds.
import * as THREE from 'three';
import { SUBSTRATES, blendTile, maskQuantile } from '../art/placeholder';
import { snailAspect } from '../art/snails';
import { fishTL, needsWater, speciesOf, type Species } from '../data/species';
import { glassBand, restsOnGround } from '../scene/water';
import { backdropDepth, D2R, IN, ceilingH, clamp, floorY, glassThickness, RIM_DROP, RIM_H, tankUnderside, waterY } from '../scene/physics';
import { alongRun, backgroundRuns, bowlDims, bowlRadius, chord, circleRing, clipToFootprint, facingRuns, footprint, glassFrame, halfWidth, inside, nearestGlass, offsetRing, offsetWalls, runLength, shapeOf, subRun, type P } from '../scene/shape';
import { TABLE_TOP, cornerWalls, wallGap, tableCentre, tableOn, tableRing, wallPlane } from '../scene/table';
import { groundHeight, pieSegs, terrainDisc, terrainPoints } from '../scene/terrain';
import type { Background, Fish, Tank, TankSetup, Units } from '../scene/types';
import { getImage } from '../scene/images';
import { LU, addBeams, addFixture, applyLighting, waterVolumeMaterial } from './lighting';
import { addAlgae } from './algae';
import { itemMesh } from './items';
import { rootsKey, rootsMesh } from './roots';
import { addBackdrop, backdropGeometry } from './backdrop';
import { drapedCard, fish3d, fishBody, hullMaterial } from './fish3d';
import { herpBody, herpFloatTop, isHerp3D } from './herp3d';
import { sagShell, snailBody } from './snail3d';
import { blendTexture, cardMaterial, pictureTexture, fishBodyTexture, fishTexture, gradientTexture, personTexture, substrateMaskTexture, substrateTexture } from './textures';

/** Back-wall options; color null = no background (back glass only); light = use dark grid lines. */
export const BACKGROUNDS: Record<Background, { label: string; color: number | null; gradient?: boolean; light?: boolean; frost?: boolean }> = {
  black: { label: 'Black', color: 0x0b0c0e },
  blue: { label: 'Deep blue', color: 0x15395a },
  gradient: { label: 'Blue gradient', color: 0xffffff, gradient: true },
  grey: { label: 'Charcoal grey', color: 0x3a3e44 },
  frosted: { label: 'Frosted white', color: 0xe6ecee, light: true, frost: true },
  none: { label: 'None (clear glass)', color: null, light: true },
};

const basic = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
function lines(pts: number[], color: number, opacity: number) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

/**
 * The background sheet. Frosted film is translucent: what is behind it shows through as a blur (three's transmission:
 * the opaque scene behind, rendered to a mipmapped target and sampled at a roughness-dependent mip), and the rest is the
 * white of the film itself, lit by the tank light like the other backgrounds (lighting `frost`) (Nathan 2026-10-12)
 */
function bgMaterial(bg: (typeof BACKGROUNDS)[Background]): THREE.Material {
  if (!bg.frost) return basic(bg.color!, { map: bg.gradient ? gradientTexture() : null, side: THREE.DoubleSide });
  const m = new THREE.MeshPhysicalMaterial({ color: bg.color!, transmission: FROST.transmission, roughness: FROST.roughness, ior: 1.5, thickness: 0, metalness: 0, side: THREE.DoubleSide });
  m.userData.frost = true;
  return m;
}
/** Frosted film: share of light passing through, and how much it blurs (0 clear .. 1 a single average). */
export const FROST = { transmission: 0.85, roughness: 0.3 };

/** Peninsula: the end of the tank against the room wall ('left' / 'right'), else null. */
const penEnd = (S: TankSetup) => (S.wall.show && (S.wall.side === 'left' || S.wall.side === 'right') ? S.wall.side : null);

/** World position of footprint point p at height y (depth runs toward -z). */
const at = (p: P, y: number): [number, number, number] => [p[0], y, -p[1]];

/** Triangles from quads / fans, with material groups, as one BufferGeometry. */
class Tris {
  pos: number[] = []; uv: number[] = []; groups: number[] = [];
  tri(a: number[], b: number[], c: number[], g = 0, uv?: number[][]) {
    this.pos.push(...a, ...b, ...c); this.groups.push(g);
    if (uv) this.uv.push(...uv[0], ...uv[1], ...uv[2]);
  }
  quad(a: number[], b: number[], c: number[], d: number[], g = 0, uv?: number[][]) {
    this.tri(a, b, c, g, uv && [uv[0], uv[1], uv[2]]); this.tri(a, c, d, g, uv && [uv[0], uv[2], uv[3]]);
  }
  geometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    if (this.uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    let start = 0;
    for (let i = 1; i <= this.groups.length; i++) if (i === this.groups.length || this.groups[i] !== this.groups[start]) { geo.addGroup(start * 3, (i - start) * 3, this.groups[start]); start = i; }
    geo.computeVertexNormals();
    return geo;
  }
}

/**
 * A wall of thickness between polylines `inner` and `outer` (same length), from y0 to y1: group 0 = the two big faces,
 * group 1 = the top, bottom and end strips (the glass edge). Closed = a full ring with no ends.
 */
function wallGeometry(inner: P[], outer: P[], y0: number, y1: number, closed = false) {
  const t = new Tris(), n = inner.length;
  for (let i = 0; i < n - 1; i++) {
    const a = inner[i], b = inner[i + 1], c = outer[i], d = outer[i + 1];
    // wound so every face points out of the solid (front faces only are drawn)
    t.quad(at(a, y0), at(a, y1), at(b, y1), at(b, y0), 0); t.quad(at(c, y0), at(d, y0), at(d, y1), at(c, y1), 0);
    t.quad(at(a, y1), at(c, y1), at(d, y1), at(b, y1), 1); t.quad(at(a, y0), at(b, y0), at(d, y0), at(c, y0), 1);
  }
  if (!closed) { t.quad(at(inner[0], y0), at(outer[0], y0), at(outer[0], y1), at(inner[0], y1), 1); t.quad(at(inner[n - 1], y0), at(inner[n - 1], y1), at(outer[n - 1], y1), at(outer[n - 1], y0), 1); }
  return t.geometry();
}

/** A solid prism over a convex ring from y0 to y1: group 0 = top and bottom, group 1 = the sides. */
function prismGeometry(ring: P[], y0: number, y1: number) {
  const t = new Tris(), n = ring.length;
  for (let i = 1; i < n - 1; i++) { t.tri(at(ring[0], y1), at(ring[i], y1), at(ring[i + 1], y1), 0); t.tri(at(ring[0], y0), at(ring[i + 1], y0), at(ring[i], y0), 0); }
  for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; t.quad(at(a, y0), at(b, y0), at(b, y1), at(a, y1), 1); }
  return t.geometry();
}

/** A flat convex polygon at height y (floor backing, water surface). */
function flatGeometry(ring: P[], y: number) {
  const t = new Tris();
  for (let i = 1; i < ring.length - 1; i++) t.tri(at(ring[0], y), at(ring[i], y), at(ring[i + 1], y));
  return t.geometry();
}

/** Closed loop of line segments round a ring at height y. */
const ringLines = (ring: P[], y: number) => ring.flatMap((p, i) => [...at(p, y), ...at(ring[(i + 1) % ring.length], y)]);


/** The thin black line drawn on glass edges (render.edges). */
const glassLine = () => new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });

/**
 * A sphere's silhouette line, in the glass-edge colour: dark where the view grazes the surface (normal from `centre`
 * at right angles to the view). About 2 px wide at any zoom (n.v squared grows about linearly away from the edge, so
 * its screen derivative sets the width), and never thinner than the facets' own slack at the mesh's edge.
 */
function silhouetteMaterial(centre?: THREE.Vector3) {
  // no centre: the geometry's own (smooth) normals, as on a curved pane
  return new THREE.ShaderMaterial({
    uniforms: { centre: { value: centre ?? new THREE.Vector3() } },
    defines: centre ? {} : { USE_NORMALS: '' },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; varying vec3 vN; uniform vec3 centre;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        #ifdef USE_NORMALS
        vN = mat3(modelMatrix) * normal;
        #else
        vN = w.xyz - (modelMatrix * vec4(centre, 1.0)).xyz;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `varying vec3 vW; varying vec3 vN;
      void main() {
        float d = abs(dot(normalize(vN), normalize(cameraPosition - vW))), s = d * d, w = fwidth(s);
        #ifdef USE_NORMALS
        // a curved pane: about 1 px and fainter than the bowl's (Nathan 2026-10-15: "a little more subtle")
        float a = 0.3 * max(1.0 - smoothstep(0.6 * w, 1.2 * w, s), 1.0 - smoothstep(0.02, 0.03, d));
        #else
        float a = 0.55 * max(1.0 - smoothstep(1.2 * w, 2.4 * w, s), 1.0 - smoothstep(0.045, 0.06, d));
        #endif
        if (a < 0.005) discard;
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }`,
  });
}

/** One background sheet: its run of the glass, how far outside the outer face, and its material given width / height. */
interface BgSheet { run: P[]; gap: number; mat: (aspect: number) => THREE.Material }

/** A run turned to go clockwise seen from above (back at the top), so a picture on it reads correctly from inside. */
function clockwise(T: Tank, r: P[]): P[] {
  const cx = T.L / 2, cd = T.D / 2;
  let turn = 0;
  for (let i = 0; i < r.length - 1; i++) turn += (r[i][0] - cx) * (r[i + 1][1] - r[i][1]) - (r[i][1] - cd) * (r[i + 1][0] - r[i][0]);
  return turn > 0 ? [...r].reverse() : r;
}

/** Height bands and segments round of a bowl's shell. */
const BOWL_BANDS = 28, BOWL_SEG = 72;

/**
 * A bowl: the background on the inside of the sphere facing the room wall, then the glass shell (a sphere zone t thick,
 * concentric, from the floor to the opening) on a round bottom pane, and the outline of floor, opening and equator.
 */
function addBowl(sc: THREE.Scene, S: TankSetup, T: Tank, add: (geo: THREE.BufferGeometry, ro: number, outline?: number[]) => void, t: number, sheets: BgSheet[]) {
  const { H } = T, { R, c } = bowlDims(T);
  const ys = Array.from({ length: BOWL_BANDS + 1 }, (_, j) => H * j / BOWL_BANDS);
  if (c > 0 && c < H) { ys.push(c); ys.sort((a, b) => a - b); } // a row on the equator, so the widest point is exact
  const ang = (i: number) => -Math.PI + 2 * Math.PI * i / BOWL_SEG;
  const pt = (a: number, r: number, y: number) => [R + r * Math.sin(a), y, -(R - r * Math.cos(a))];
  const rIn = (y: number) => bowlRadius(T, y), rOut = (y: number) => Math.sqrt(Math.max(0, (R + t) ** 2 - (y - c) ** 2));
  // the chosen sides' arcs (backgroundRuns, as on a round tank) on the sphere, just outside the glass; u along, v up
  for (const { run, mat, gap } of sheets) {
    const as = run.map(p => Math.atan2(p[0] - R, -(p[1] - R))), g = new Tris(), n = as.length - 1;
    for (let i = 0; i < n; i++) {
      const a0 = as[i], a1 = as[i + 1], u0 = i / n, u1 = (i + 1) / n;
      for (let j = 0; j < ys.length - 1; j++) {
        const y0 = ys[j], y1 = ys[j + 1], r0 = rOut(y0) + gap, r1 = rOut(y1) + gap;
        g.quad(pt(a0, r0, y0), pt(a1, r0, y0), pt(a1, r1, y1), pt(a0, r1, y1), 0, [[u0, y0 / H], [u1, y0 / H], [u1, y1 / H], [u0, y1 / H]]);
      }
    }
    sc.add(new THREE.Mesh(g.geometry(), mat(runLength(run) / H)));
  }
  // the shell, split into a back and a front half so the front draws after what is inside (as the panes do)
  for (const front of [false, true]) {
    const g = new Tris();
    for (let i = 0; i < BOWL_SEG; i++) {
      const a0 = ang(i), a1 = ang(i + 1);
      if ((Math.cos((a0 + a1) / 2) > 0) !== front) continue; // cos a > 0: the front half (depth < R)
      for (let j = 0; j < ys.length - 1; j++) {
        const y0 = ys[j], y1 = ys[j + 1];
        // inner face toward the water, outer face toward the room (front faces only are drawn)
        g.quad(pt(a0, rIn(y0), y0), pt(a0, rIn(y1), y1), pt(a1, rIn(y1), y1), pt(a1, rIn(y0), y0), 0);
        g.quad(pt(a0, rOut(y0), y0), pt(a1, rOut(y0), y0), pt(a1, rOut(y1), y1), pt(a0, rOut(y1), y1), 0);
      }
      g.quad(pt(a0, rIn(H), H), pt(a1, rIn(H), H), pt(a1, rOut(H), H), pt(a0, rOut(H), H), 1); // the lip round the opening
    }
    // only the lip's two circles are glass edges; drawn once, with the front half
    add(g.geometry(), front ? 6 : 5, front ? [...ringLines(circleRing(T, rIn(H), BOWL_SEG), H), ...ringLines(circleRing(T, rOut(H), BOWL_SEG), H)] : []);
  }
  // the shell's outline against the room: a sphere has no edge to draw, so its silhouette is drawn where the view grazes
  // it (Nathan 2026-10-12: the far side read as fish floating in space)
  if (S.render.edges) {
    const g = new Tris();
    for (let i = 0; i < BOWL_SEG; i++) for (let j = 0; j < ys.length - 1; j++) {
      const a0 = ang(i), a1 = ang(i + 1), y0 = ys[j], y1 = ys[j + 1];
      g.quad(pt(a0, rOut(y0), y0), pt(a1, rOut(y0), y0), pt(a1, rOut(y1), y1), pt(a0, rOut(y1), y1), 0);
    }
    const m = new THREE.Mesh(g.geometry(), silhouetteMaterial(new THREE.Vector3(R, c, -R))); m.renderOrder = 7; sc.add(m);
  }
  add(prismGeometry(circleRing(T, rOut(0), BOWL_SEG), -t, 0), 5); // bottom pane, out to the shell's foot
  // the floor's edge inside (the opening's is on the lip); the equator is not an edge, so no line there
  if (S.render.edges) sc.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(ringLines(circleRing(T, rIn(0), BOWL_SEG), 0), 3)), glassLine()));
}

function addTank(sc: THREE.Scene, S: TankSetup & { units: Units }, T: Tank) {
  const { H } = T, R = S.render, fp = footprint(T), bowl = shapeOf(T) === 'bowl';
  // backing under the substrate; a bare-bottom tank has none, so the stand top or the room shows through the bottom pane
  if (S.substrate.show || S.layout.id === 'swamp' || S.terrain.on) sc.add(new THREE.Mesh(flatGeometry(fp.ring, 0), basic(0xcdb98f, { side: THREE.DoubleSide })));
  const bg = BACKGROUNDS[R.bg], t = glassThickness(T, R.glass);
  // uploaded pictures take their sides whatever the background is; the plain background keeps its other sides
  const pics = R.bgImages.flatMap(b => { const data = b.sides.length ? getImage(b.img) : undefined; return data ? [{ ...b, data }] : []; });
  const picSides = new Set(pics.flatMap(b => b.sides)), plain = bg.color === null ? [] : R.bgSides.filter(k => !picSides.has(k));
  const runs = backgroundRuns(T, [...new Set([...plain, ...picSides])], R.bgArc, t + 0.5); // the grid follows both
  // the background covers the panes facing the chosen sides; on a round tank an arc of the shell round each. It is on
  // the OUTER face (0.5 mm off it), full pane height: the substrate ends at the inner face, the glass between (Nathan 2026-10-12).
  // A picture runs clockwise seen from above, so it reads the right way round from inside the tank across a corner;
  // it sits nearer the glass than the plain sheet, which it overlaps where a round tank's arcs meet.
  const pad = bg.color === null || bg.gradient || bg.frost ? '#0b0c0e' : '#' + bg.color.toString(16).padStart(6, '0');
  const sheets: BgSheet[] = [
    ...backgroundRuns(T, plain, R.bgArc, t + 0.5).map(run => ({ run, gap: 0.5, mat: () => bgMaterial(bg) })),
    ...pics.flatMap((b, i) => backgroundRuns(T, b.sides, R.bgArc, t + 0.3 - 0.05 * i).map(r => ({
      run: clockwise(T, r), gap: 0.3 - 0.05 * i, // where round arcs overlap, the first picture is in front
      mat: (aspect: number) => basic(0xffffff, { map: pictureTexture(b.img, b.data, b.fit, b.scale, aspect, pad), side: THREE.DoubleSide }),
    }))),
  ];
  if (!bowl) for (const { run: r, mat } of sheets) { // a bowl's background is on its sphere (addBowl)
    const g = new Tris(), len = runLength(r) || 1; let s = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const s1 = s + Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
      g.quad(at(r[i], -t), at(r[i + 1], -t), at(r[i + 1], H), at(r[i], H), 0, [[s / len, 0], [s1 / len, 0], [s1 / len, 1], [s / len, 1]]); s = s1;
    }
    sc.add(new THREE.Mesh(g.geometry(), mat(len / (H + t))));
  }
  // glass sits OUTSIDE the interior outline; large faces nearly clear, thin edge faces tinted so thickness shows
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.06, depthWrite: false });
  const lowIron = R.glassType === 'lowiron';
  const edgeM = lowIron
    ? basic(0xa9d3da, { transparent: true, opacity: 0.75, depthWrite: false })
    : basic(0x3f8f72, { transparent: true, opacity: 0.85, depthWrite: false });
  // pane outlines (Glass edges on): thin glass is often under a pixel thick, so its edge faces vanish; a line is always
  // >= 1 px. Thin black lines on every glass edge, inside and out (Nathan 2026-10-12)
  const edgeLine = glassLine();
  // outline: line segments to draw instead of the geometry's own edges (a bowl's shell halves: the cut between them is not an edge)
  const add = (geo: THREE.BufferGeometry, ro: number, outline?: number[]) => {
    const g = new THREE.Mesh(geo, [faceM, edgeM]); g.renderOrder = ro; sc.add(g);
    if (!R.edges) return;
    const eg = outline ? new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(outline, 3)) : new THREE.EdgesGeometry(geo, 20);
    const o = new THREE.LineSegments(eg, edgeLine); o.renderOrder = ro + 1; sc.add(o); // 20°: no seams between a curved shell's facets
  };
  // a bowl has its own shell (no rim: there are no pane edges to trim)
  if (bowl) addBowl(sc, S, T, add, t, sheets);
  else {
    // bottom pane under everything; one wall per pane (a curved shell is one wall), mitred at the corners
    const outer = offsetWalls(T, t);
    add(prismGeometry(offsetRing(T, t), -t, 0), 5);
    fp.walls.forEach((w, i) => {
      const front = fp.edges.some(e => e.wall === i && e.n[1] < -0.5);
      add(wallGeometry(w.pts, outer[i], 0, H, fp.walls.length === 1), front ? 6 : 5);
      // a curved shell has no edge where it turns away from the view, so its silhouette is drawn there (as on a bowl):
      // the outer face again, with smooth normals across the polyline (Nathan 2026-10-15: the bow's end read as empty space)
      if (R.edges && w.curved) {
        const o = outer[i], n = o.length, pos: number[] = [], nor: number[] = [];
        const nrm = (k: number) => { // horizontal normal at point k, from its neighbours (floor-plan d maps to world -z)
          const a = o[Math.max(0, k - 1)], b = o[Math.min(n - 1, k + 1)], tx = b[0] - a[0], td = b[1] - a[1], l = Math.hypot(tx, td) || 1;
          return [td / l, 0, tx / l];
        };
        for (let k = 0; k < n - 1; k++) {
          const v = [at(o[k], 0), at(o[k + 1], 0), at(o[k + 1], H), at(o[k], 0), at(o[k + 1], H), at(o[k], H)];
          const m = [nrm(k), nrm(k + 1), nrm(k + 1), nrm(k), nrm(k + 1), nrm(k)];
          v.forEach((p, j) => { pos.push(...p); nor.push(...m[j]); });
        }
        const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        const sm = silhouetteMaterial(); sm.side = THREE.DoubleSide;
        const mesh = new THREE.Mesh(g, sm); mesh.renderOrder = 7; sc.add(mesh);
      }
    });
    // interior outline: top and bottom loops, and the vertical corners where panes meet
    const box: number[] = [...ringLines(fp.ring, 0), ...ringLines(fp.ring, H)];
    if (fp.walls.length > 1) for (const w of fp.walls) box.push(...at(w.pts[0], 0), ...at(w.pts[0], H));
    if (R.edges) sc.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(box, 3)), glassLine()));
    if (R.rim) {
      const rm = basic(0x1a1d21), r = t + 8, h = RIM_H, inner = fp.ring, rr = offsetRing(T, r);
      for (const y0 of [H - h + 2, -t - 2]) sc.add(new THREE.Mesh(wallGeometry([...inner, inner[0]], [...rr, rr[0]], y0, y0 + h, true), rm));
    }
  }
  if (R.grid) {
    const sub = (x: number, d: number) => groundHeight(S, T, x, d);
    const step = S.units === 'in' ? 2 * IN : 50, w: number[] = [], f: number[] = [];
    // on the background, 0.5 mm in front of it: vertical lines every step along it, and the heights (not on a bowl's sphere)
    for (const r of bowl ? [] : runs) {
      const len = runLength(r), inset = (p: P): P => { const g = nearestGlass(T, p[0], p[1]); return [p[0] - g.n[0] * 0.5, p[1] - g.n[1] * 0.5]; };
      for (let s = step; s < len; s += step) { const p = inset(alongRun(r, s)); w.push(...at(p, 0), ...at(p, H)); }
      const pts = r.map(inset);
      for (let y = step; y < H; y += step) for (let i = 0; i < pts.length - 1; i++) w.push(...at(pts[i], y), ...at(pts[i + 1], y));
    }
    // on the floor: lines across at every step, ending on the glass, following the ground
    for (let x = step; x < T.L; x += step) { const c = chord(T, 0, x); if (c) f.push(x, sub(x, c[0]) + 0.5, -c[0], x, sub(x, c[1]) + 0.5, -c[1]); }
    for (let z = step; z < T.D; z += step) { const c = chord(T, 1, z); if (c) f.push(c[0], sub(c[0], z) + 0.5, -z, c[1], sub(c[1], z) + 0.5, -z); }
    sc.add(lines(w, bg.light ? 0x000000 : 0xffffff, bg.light ? 0.12 : 0.16)); sc.add(lines(f, 0x000000, 0.14));
  }
}

/**
 * The water surface (seen from above or when orbiting; edge-on straight on) and a faint meniscus line where it meets
 * the glass. The colour of the water itself is a tint in the lighting shader (see aqWaterPath).
 */
function addWater(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.water.on) return;
  const y = waterY(T, S.water.level), look = surfaceLook(S.water);
  const bowl = shapeOf(T) === 'bowl', r = bowlRadius(T, y); // a bowl's surface is the sphere's circle at the water line
  const surf = new THREE.Mesh(flatGeometry(bowl ? circleRing(T, r) : footprint(T).ring, y), basic(look.color, { transparent: true, opacity: look.opacity, depthWrite: false, side: THREE.DoubleSide }));
  (surf.material as THREE.Material).userData.waterSurf = true; // recoloured in place (patchLook)
  surf.renderOrder = 4; surf.userData.nolight = true; sc.add(surf);
  const line = lines(ringLines(bowl ? circleRing(T, r - 0.6) : offsetRing(T, -0.6), y), 0xe8f6fa, 0.45);
  line.renderOrder = 4; sc.add(line);
  // the water's own colour where only the empty page is behind it (audit #18; objects are tinted in their shader);
  // built even at opacity 0 and hidden there, so stepping the opacity off 0 is an in-place patch (patchLook), not a rebuild
  let vol: THREE.BufferGeometry;
  if (bowl) {
    const n = 24, prof = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.max(0.5, bowlRadius(T, y * i / n)), y * i / n));
    vol = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...prof, new THREE.Vector2(0, y)], 48).translate(T.L / 2, 0, -T.D / 2);
  } else vol = prismGeometry(footprint(T).ring, 0, y);
  const m = new THREE.Mesh(vol, waterVolumeMaterial()); m.userData.nolight = true; m.renderOrder = 3; sc.add(m);
  // at opacity 0 it still draws in the tank's first frame (uWater.w = 0, so alpha is exactly 0: no pixel changes), so
  // its program links with the rest of the build, not on the first opacity step; then it hides (patchLook shows it)
  m.userData.waterVol = S.water.opacity > 0 ? 'on' : 'off';
  m.onAfterRender = () => { m.visible = m.userData.waterVol === 'on'; };
}

export const STAND_FINISHES: Record<TankSetup['stand']['finish'], { label: string; color: number }> = {
  black: { label: 'Black', color: 0x23262b },
  white: { label: 'White', color: 0xe4e2dc },
  oak: { label: 'Oak', color: 0xa77b4f },
};

/** Box faces in BoxGeometry order (+x, -x, +y, -y, +z, -z), shaded so it reads as 3D; lit as a room surface. */
function shadedBox(w: number, h: number, d: number, color: number) {
  const c = new THREE.Color(color), k = [0.78, 0.78, 1.08, 0.5, 0.95, 0.7];
  const mats = k.map(f => basic(c.clone().multiplyScalar(f)));
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.userData.room = true;
  return ink(m, color);
}

/**
 * The furniture's drawn style (Nathan 2026-10-13: the table "looks a bit mushy"; always on, not tied to fish stand
 * out): a fine dark line, 1 px, on every crease (edges sharper than 30 degrees) and round the silhouette (so a round
 * top's curved side gets one too), in a dark shade of the piece's colour. The faces are pushed back a little so the
 * crease lines win the depth test.
 */
const inkMats = new Map<number, [THREE.LineBasicMaterial, THREE.ShaderMaterial]>();
function ink(m: THREE.Mesh, color: number) {
  let mats = inkMats.get(color);
  if (!mats) {
    const c = new THREE.Color(color).multiplyScalar(0.35), cs = c.clone().convertLinearToSRGB(); // the hull shader writes cs as is (display values)
    const line = new THREE.LineBasicMaterial({ color: c }); line.userData.cached = true;
    mats = [line, hullMaterial('1.0', cs, false)]; inkMats.set(color, mats);
  }
  for (const mm of ([] as THREE.Material[]).concat(m.material)) { mm.polygonOffset = true; mm.polygonOffsetFactor = 1; mm.polygonOffsetUnits = 1; }
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), mats[0]), h = new THREE.Mesh(m.geometry, mats[1]);
  e.userData.nolight = h.userData.nolight = true;
  m.add(e, h);
  return m;
}

/**
 * A solid over a convex footprint ring, y0..y1, shaded per face like shadedBox (top bright, front lighter than the
 * back, ends between) so it reads as 3D; lit as a room surface.
 */
function shadedPrism(ring: P[], y0: number, y1: number, color: number) {
  return shadedSolid(prismGeometry(ring, y0, y1), color);
}

/** Any solid's geometry shaded per face as shadedPrism does; lit as a room surface. */
function shadedSolid(geo: THREE.BufferGeometry, color: number) {
  const n = geo.attributes.normal, c = new THREE.Color(color), cols: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), nz = n.getZ(i), k = ny > 0.5 ? 1.08 : ny < -0.5 ? 0.5 : 0.78 + nz * (nz > 0 ? 0.17 : 0.08);
    cols.push(c.r * k, c.g * k, c.b * k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.clearGroups();
  const m = new THREE.Mesh(geo, basic(0xffffff, { vertexColors: true })); m.userData.room = true;
  return ink(m, color);
}

/** Stand under the tank, from the floor up to the tank's underside: a cabinet with the outer glass's footprint, an open frame, a table, or a cabinet sized like the table. */
function addStand(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.stand.show) return;
  const t = glassThickness(T, S.render.glass), top = tankUnderside(T, S.render), h = S.stand.height, fin = STAND_FINISHES[S.stand.finish];
  if (S.stand.style === 'frame') { addFrameStand(sc, T, t, top, h, fin.color); return; }
  if (S.stand.style === 'table') { addTableStand(sc, S, T, top, h, fin.color); return; }
  if (S.stand.style === 'custom') { // the table's top and placement, built as a cabinet
    const ring = tableRing(T, S.stand.table);
    sc.add(shadedPrism(ring, top - h, top, fin.color));
    addDoors(sc, edgeRuns(ring, [0, -1]).concat(penEnd(S) ? edgeRuns(ring, [0, 1]) : []), top, h, fin.color);
    return;
  }
  sc.add(shadedPrism(offsetRing(T, t), top - h, top, fin.color));
  // a peninsula is open on both long sides, so its cabinet has doors on the back too (Nathan 2026-10-08)
  addDoors(sc, facingRuns(T, t, [0, -1]).concat(penEnd(S) ? facingRuns(T, t, [0, 1]) : []), top, h, fin.color);
}

/** The runs of a closed convex ring (a stand's top) whose edges face `dir` (outward normal within 60 degrees). */
function edgeRuns(ring: P[], dir: P): P[][] {
  const n = ring.length, ok = ring.map((p, i) => { const q = ring[(i + 1) % n], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return ((q[1] - p[1]) * dir[0] - (q[0] - p[0]) * dir[1]) / l > 0.5; });
  if (ok.every(Boolean)) return [[...ring, ring[0]]];
  const start = ok.findIndex(v => !v), runs: P[][] = [];
  let cur: P[] | null = null;
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (ok[i]) { if (!cur) cur = [ring[i]]; cur.push(ring[(i + 1) % n]); } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * Cabinet doors on the given runs of the carcass face (a curved face gets curved doors): a pair of overlay panels
 * standing proud of the carcass above a kick plate, split in the middle, each with a bar handle beside the split; a seam
 * line round each panel's front keeps the doors readable straight on, where the panel face and the carcass shade alike.
 */
function addDoors(sc: THREE.Scene, runs: P[][], top: number, h: number, color: number) {
  const inset = Math.min(30, h * 0.08), y0 = top - h + Math.min(70, h * 0.12), y1 = top - inset, gap = 1.5;
  const seam = color === STAND_FINISHES.white.color ? 0x9a9890 : 0x111214, pts: number[] = [];
  const hh = Math.min(140, (y1 - y0) * 0.25), hy1 = y1 - Math.min(60, (y1 - y0) * 0.1), hy0 = hy1 - hh;
  for (const r of runs) {
    const len = runLength(r); if (len < 2 * inset + 40) continue;
    for (const [s0, s1, hs] of [[inset, len / 2 - gap, len / 2 - 45], [len / 2 + gap, len - inset, len / 2 + 45]]) {
      const back = subRun(r, s0, s1), face = proud(back, DOOR_T), line = proud(back, DOOR_T + 0.6);
      sc.add(shadedSolid(wallGeometry(back, face, y0, y1), color));
      for (const y of [y0, y1]) for (let i = 0; i < line.length - 1; i++) pts.push(...at(line[i], y), ...at(line[i + 1], y));
      for (const p of [line[0], line[line.length - 1]]) pts.push(...at(p, y1), ...at(p, y0));
      if (hs - 6 < s0 || hs + 6 > s1) continue;
      const hb = proud(subRun(r, hs - 6, hs + 6), DOOR_T);
      sc.add(shadedSolid(wallGeometry(hb, proud(hb, 22), hy0, hy1), HANDLE));
    }
  }
  sc.add(lines(pts, seam, 0.8));
}

const DOOR_T = 18, HANDLE = 0x9a9ea4; // overlay door thickness (mm); brushed-steel bar handles

/** A polyline along the ring pushed `d` outward (each vertex along the mean of its edges' outward normals). */
function proud(r: P[], d: number): P[] {
  const n = (a: P, b: P): P => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l]; };
  return r.map((p, i) => {
    const a = i > 0 ? n(r[i - 1], p) : null, b = i < r.length - 1 ? n(p, r[i + 1]) : null;
    const v: P = a && b ? [a[0] + b[0], a[1] + b[1]] : (a ?? b)!, l = Math.hypot(v[0], v[1]) || 1;
    return [p[0] + (v[0] / l) * d, p[1] + (v[1] / l) * d];
  });
}

/**
 * Table stand: a top (rectangular or round) the tank sits on anywhere, an apron just under it set in from the edge,
 * and four square legs (round: at the diagonals) on that apron's corners.
 */
function addTableStand(sc: THREE.Scene, S: TankSetup, T: Tank, top: number, h: number, color: number) {
  const tb = S.stand.table, topT = Math.min(TABLE_TOP, h / 4), apronH = Math.min(90, h / 6), leg = Math.min(60, h / 8);
  const inset = Math.min(50, tb.L / 8, tb.D / 8), y0 = top - h;
  sc.add(shadedPrism(tableRing(T, tb), top - topT, top, color));
  const [cx, cd] = tableCentre(T, tb), r = tb.L / 2 - inset;
  const apron = tableRing(T, tb).map(([x, d]) => [cx + (x - cx) * (1 - inset / (tb.L / 2)), cd + (d - cd) * (1 - inset / (tb.D / 2))] as P);
  sc.add(shadedPrism(apron, top - topT - apronH, top - topT, color));
  const legs: P[] = tb.shape === 'round'
    ? [1, 3, 5, 7].map(k => [cx + (r - leg * 0.75) * Math.cos(k * Math.PI / 4), cd + (r - leg * 0.75) * Math.sin(k * Math.PI / 4)] as P)
    : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sd]) => [cx + sx * (tb.L / 2 - inset - leg / 2), cd + sd * (tb.D / 2 - inset - leg / 2)] as P);
  const lh = h - topT;
  for (const [x, d] of legs) { const b = shadedBox(leg, lh, leg, color); b.position.set(x, y0 + lh / 2, -d); sc.add(b); }
}

/** Steel tube size for the open frame stand (mm): 1.5" square tube, the common size for welded aquarium stands. */
const TUBE = 38;

/**
 * Open welded steel stand: square-tube legs at the corners (round: spaced round the circle), a top frame the tank sits
 * on, a bottom frame just above the floor, and extra legs (with cross rails) every ~90 cm on long panes. Nothing in
 * between: the room shows through.
 */
function addFrameStand(sc: THREE.Scene, T: Tank, t: number, top: number, h: number, color: number) {
  const s = Math.min(TUBE, h / 6), foot = 12, yLow = top - h + foot + s / 2, yTop = top - s / 2;
  const box = (w: number, hh: number, d: number, x: number, y: number, z: number, ry = 0) => { const b = shadedBox(w, hh, d, color); b.position.set(x, y, z); b.rotation.y = ry; sc.add(b); };
  if (shapeOf(T) === 'bowl') { addBowlFrame(sc, T, t, top, h, s, foot, yLow, yTop, color, box); return; }
  // leg centres: the outline pushed out to the tube's centre line; each pane's start, plus more along long panes
  const legs: P[] = [];
  for (const w of offsetWalls(T, t - s / 2)) {
    const len = runLength(w), curved = w.length > 2, n = curved ? Math.max(2, Math.round(len / 600)) : Math.max(1, Math.round(len / 900));
    for (let k = 0; k < n; k++) legs.push(alongRun(w, len * k / n));
  }
  const rail = (p: P, q: P, y: number) => {
    const dx = q[0] - p[0], dz = -(q[1] - p[1]), len = Math.hypot(dx, dz) - s;
    if (len > 1) box(len, s, s, (p[0] + q[0]) / 2, y, -(p[1] + q[1]) / 2, Math.atan2(-dz, dx));
  };
  for (const p of legs) { box(s, h - foot, s, p[0], top - (h - foot) / 2, -p[1]); box(s * 0.7, foot, s * 0.7, p[0], top - h + foot / 2, -p[1]); } // legs on small levelling feet
  for (const y of [yTop, yLow]) {
    legs.forEach((p, i) => rail(p, legs[(i + 1) % legs.length], y));                                       // round the outline
    // cross rails front to back between the middle legs of a long tank
    const d0 = Math.min(...legs.map(p => p[1])), d1 = Math.max(...legs.map(p => p[1]));
    for (const p of legs) if (Math.abs(p[1] - d0) < 1) { const q = legs.find(b => Math.abs(b[1] - d1) < 1 && Math.abs(b[0] - p[0]) < 1); if (q && legs.indexOf(q) !== (legs.indexOf(p) + 1) % legs.length && legs.indexOf(p) !== (legs.indexOf(q) + 1) % legs.length) rail(p, q, y); }
  }
}

/**
 * A bowl's frame stand: its flat floor is far narrower than the sphere it carries, so legs round the floor alone make a
 * top-heavy tower. Four legs instead, at the floor's edge under the bowl, splayed out to stand on a circle as wide as
 * the bowl's equator (never past the bowl's own silhouette, so it clears whatever the bowl clears); rings of rail at
 * the top and just above the floor (Nathan 2026-10-13: "looks a little unsafe").
 */
function addBowlFrame(sc: THREE.Scene, T: Tank, t: number, top: number, h: number, s: number, foot: number, yLow: number, yTop: number, color: number,
  box: (w: number, hh: number, d: number, x: number, y: number, z: number, ry?: number) => void) {
  const { R, rb } = bowlDims(T), cx = T.L / 2, cz = -T.D / 2, yFoot = top - h + foot;
  const r0 = Math.max(s, rb + t - s / 2), rf = Math.max(r0, R + t - s / 2);
  const rAt = (y: number) => r0 + (rf - r0) * (top - y) / (top - yFoot);
  const at = (r: number, a: number, y: number) => new THREE.Vector3(cx + r * Math.sin(a), y, cz - r * Math.cos(a));
  const angs = [1, 3, 5, 7].map(k => k * Math.PI / 4); // legs at the diagonals: two front, two back
  for (const a of angs) {
    const p = at(r0, a, top), q = at(rf, a, yFoot), dir = p.clone().sub(q), len = dir.length();
    const b = shadedBox(s, len, s, color); b.position.copy(p).add(q).multiplyScalar(0.5);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); sc.add(b);
    box(s * 0.7, foot, s * 0.7, q.x, top - h + foot / 2, q.z);                                       // levelling foot
  }
  for (const y of [yTop, yLow]) {
    const r = rAt(y);
    angs.forEach((a, i) => {
      const p = at(r, a, y), q = at(r, angs[(i + 1) % angs.length], y), len = p.distanceTo(q) - s;
      if (len > 1) box(len, s, s, (p.x + q.x) / 2, y, (p.z + q.z) / 2, Math.atan2(-(q.z - p.z), q.x - p.x));
    });
  }
}

/** Hood height at the back (mm), above the rim top. */
export const HOOD_H = 38;

/**
 * Classic low-profile moulded hood (lights inside): sits just inside the rim, tallest at the back, curving down to a
 * rounded front, with a recessed feeding hatch. Side profile extruded along the tank length; shaded per vertex so the
 * curve reads without lights.
 */
function addHood(sc: THREE.Scene, S: TankSetup, T: Tank) {
  const { L, D } = T, t = glassThickness(T, S.render.glass), rim = S.render.rim;
  const o = rim ? t + 8 : t, inset = 6, base = rim ? T.H + RIM_DROP : T.H, bev = 3;
  const x0 = -o + inset + bev, x1 = L + o - inset - bev;
  // profile in (u, y): u = -z (front of the hood has the smallest u), y up from the rim top
  const uf = -(o - inset - bev), ub = D + o - inset - bev, hf = 22, hb = HOOD_H - bev, um = (uf + ub) / 2;
  const p0 = new THREE.Vector2(uf + hf, hf), c = new THREE.Vector2(um, hb), p1 = new THREE.Vector2(ub, hb);
  const shape = new THREE.Shape();
  shape.moveTo(uf, 0); shape.lineTo(uf, hf * 0.45);
  shape.quadraticCurveTo(uf, hf, p0.x, p0.y);               // rounded front nose
  shape.quadraticCurveTo(c.x, c.y, p1.x, p1.y);             // gently domed top rising to the back
  shape.lineTo(ub, 0); shape.closePath();
  const bow = shapeOf(T) === 'bow';
  const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, steps: bow ? 32 : 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 14 });
  geo.rotateY(Math.PI / 2); geo.translate(x0, base, 0);     // local (u, y, e) -> world (x0 + e, base + y, -u)
  // bowfront: the profile's front follows the bow (stretched toward the back, which stays straight)
  const warp = (x: number, u: number) => { if (!bow) return u; const f = chord(T, 0, clamp(x, 0, L))?.[0] ?? 0; return ub - (ub - u) * (ub - (f + uf)) / (ub - uf); };
  if (bow) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -warp(p.getX(i), -p.getZ(i))); }
  geo.computeVertexNormals();
  const n = geo.attributes.normal, base3 = new THREE.Color(0x1b1d21), light = new THREE.Vector3(-0.35, 1, 0.6).normalize(), cols: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const k = 0.62 + 0.75 * Math.max(0, n.getX(i) * light.x + n.getY(i) * light.y + n.getZ(i) * light.z);
    cols.push(base3.r * k, base3.g * k, base3.b * k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const hood = new THREE.Mesh(geo, basic(0xffffff, { vertexColors: true })); hood.userData.room = true; sc.add(hood);
  // feeding hatch: a rectangle on the top, front-centre, following the dome
  const topY = (u: number) => {                             // height of the top curve at u (sampled Bezier)
    let best = hb, err = Infinity;
    for (let i = 0; i <= 64; i++) {
      const s = i / 64, x = (1 - s) ** 2 * p0.x + 2 * (1 - s) * s * c.x + s * s * p1.x;
      if (Math.abs(x - u) < err) { err = Math.abs(x - u); best = (1 - s) ** 2 * p0.y + 2 * (1 - s) * s * c.y + s * s * p1.y; }
    }
    return base + best + bev + 0.8;
  };
  const ua = uf + (ub - uf) * 0.2, ubh = uf + (ub - uf) * 0.42, hx0 = L / 2 - L * 0.13, hx1 = L / 2 + L * 0.13;
  const ya = topY(ua), yb = topY(ubh);
  const hp: number[] = [], seg = bow ? 12 : 1, W = (x: number, y: number, u: number) => [x, y, -warp(x, u)];
  for (let i = 0; i < seg; i++) { const xa = hx0 + (hx1 - hx0) * i / seg, xb = hx0 + (hx1 - hx0) * (i + 1) / seg; hp.push(...W(xa, ya, ua), ...W(xb, ya, ua), ...W(xa, yb, ubh), ...W(xb, yb, ubh)); }
  hp.push(...W(hx0, ya, ua), ...W(hx0, yb, ubh), ...W(hx1, ya, ua), ...W(hx1, yb, ubh));
  sc.add(lines(hp, 0x45484e, 0.95));
}

/** Lid: classic black moulded hood with a hinged front flap, or two glass canopy panels on a plastic hinge strip. */
function addLid(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (S.lid === 'open') return;
  const { L, H, D } = T, t = glassThickness(T, S.render.glass), rim = S.render.rim;
  if (S.lid === 'hood') { addHood(sc, S, T); return; }
  // glass top: two panels split along the length, resting on the inner rim lip (rimmed) or on the panes (rimless)
  const pt = 4, y = rim ? H - RIM_H + RIM_DROP + 6 + pt / 2 : H + pt / 2, gap = 3, inset = rim ? 2 : -t;
  const lowIron = S.render.glassType === 'lowiron';
  const faceM = basic(0xbfe0ee, { transparent: true, opacity: 0.1, depthWrite: false });
  const edgeM = basic(lowIron ? 0xa9d3da : 0x3f8f72, { transparent: true, opacity: 0.8, depthWrite: false });
  const lineM = glassLine(), edges = S.render.edges;
  if (shapeOf(T) !== 'rect') { addShapedCanopy(sc, T, y, pt, inset, faceM, edgeM, edges ? lineM : null); return; }
  const w = (L - 2 * inset - gap) / 2, dp = D - 2 * inset;
  for (const cx of [inset + w / 2, L - inset - w / 2]) {
    const geo = new THREE.BoxGeometry(w, pt, dp), m = [edgeM, edgeM, faceM, faceM, edgeM, edgeM];
    const g = new THREE.Mesh(geo, m); g.position.set(cx, y, -D / 2); g.renderOrder = 7; sc.add(g);
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineM); e.position.copy(g.position); e.renderOrder = 8; sc.add(e); }
  }
  const hinge = shadedBox(L - 2 * inset, pt + 2, 12, 0x2b2e33); hinge.position.set(L / 2, y, -D * 0.38); sc.add(hinge); // back strip | front flap
}

/** A convex ring clipped to the box x0..x1, d0..d1 (footprint coordinates); [] if nothing is left. */
function clipRing(ring: P[], x0: number, x1: number, d0: number, d1: number): P[] {
  let out = ring;
  for (const [k, v, keepLess] of [[0, x0, false], [0, x1, true], [1, d0, false], [1, d1, true]] as const) {
    const inn = (p: P) => (keepLess ? p[k] <= v : p[k] >= v), next: P[] = [];
    for (let i = 0; i < out.length; i++) {
      const p = out[i], q = out[(i + 1) % out.length];
      if (inn(p)) next.push(p);
      if (inn(p) !== inn(q)) { const s = (v - p[k]) / (q[k] - p[k]); next.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]); }
    }
    out = next; if (out.length < 3) return [];
  }
  return out;
}

/** Longest canopy sold as one piece (mm); longer tanks take two side by side, as real bowfronts over ~4 ft do. */
const CANOPY_MAX = 1000;

/**
 * Glass canopy for a non-rectangular tank, as sold for bowfront, hexagon, pentagon and corner tanks: a fixed back strip
 * and a hinged front flap cut to the front's shape (the bow, the angled panes, the quarter-round's arc), joined by a
 * plastic hinge strip straight across; a trim-to-fit plastic filler along the back edge (cut round filter and cords);
 * a small plastic handle on each flap's front edge. Long tanks take two canopies side by side. A bowl's opening gets
 * one round cover plate with a lift knob.
 */
function addShapedCanopy(sc: THREE.Scene, T: Tank, y: number, pt: number, inset: number, faceM: THREE.Material, edgeM: THREE.Material, lineM: THREE.Material | null) {
  const y0 = y - pt / 2, y1 = y + pt / 2, PLASTIC = 0x2b2e33;
  const plate = (ring: P[]) => {
    if (ring.length < 3) return;
    const geo = prismGeometry(ring, y0, y1), g = new THREE.Mesh(geo, [faceM, edgeM]); g.renderOrder = 7; sc.add(g);
    if (lineM) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), lineM); e.renderOrder = 8; sc.add(e); }
  };
  const knob = (x: number, d: number, ry: number, w: number, depth: number) => {
    const k = shadedBox(w, 7, depth, PLASTIC); k.position.set(x, y1 + 3.5, -d); k.rotation.y = ry; sc.add(k);
  };
  if (shapeOf(T) === 'bowl') { plate(circleRing(T, bowlDims(T).rt - inset)); knob(T.L / 2, T.D / 2, 0, 18, 18); return; }
  const L = T.L, ring = offsetRing(T, -inset), gap = 3, strip = 12;
  const front = Math.min(...ring.map(p => p[1])), back = Math.max(...ring.map(p => p[1]));
  // the hinge a little behind the middle, so the flap (the part lifted to feed) is the bigger piece
  const dh = front + (back - front) * 0.58, fill = Math.min(40, (back - front) * 0.08);
  const n = L > CANOPY_MAX ? 2 : 1, xs = Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
  for (let i = 0; i < n; i++) {
    const xa = xs[i] + (i ? gap / 2 : -Infinity), xb = xs[i + 1] - (i < n - 1 ? gap / 2 : -Infinity);
    plate(clipRing(ring, xa, xb, -Infinity, dh - gap / 2));                 // front flap
    plate(clipRing(ring, xa, xb, dh + gap / 2, back - fill));               // fixed back strip
    const filler = clipRing(ring, xa, xb, back - fill + 1, Infinity);       // trim-to-fit plastic filler
    if (filler.length >= 3) sc.add(shadedPrism(filler, y0, y1 - 0.5, PLASTIC));
    const hinge = clipRing(ring, xa, xb, dh - strip / 2, dh + strip / 2);   // hinge strip over the joint
    if (hinge.length >= 3) sc.add(shadedPrism(hinge, y0 - 1, y1 + 1, PLASTIC));
    // handle: centred on the flap, just behind its front edge, square to the glass there
    const cx = (Math.max(xa, 0) + Math.min(xb, L)) / 2, c = chord(T, 0, cx);
    if (!c) continue;
    const g = nearestGlass(T, cx, c[0]), k = inset + 14;
    knob(cx - g.n[0] * k, c[0] - g.n[1] * k, Math.atan2(g.n[0], -g.n[1]), 44, 10);
  }
}

/** Silhouette card width / height. */
export const PERSON_ASPECT = 0.34;
/** Gap between the tank's outline (as seen from the eye) and the person's near side, mm. */
const PERSON_GAP = 250;
/** Straight-on eye position (horizontal), for placements that do not follow the orbit. */
export const straightOnEye = (S: TankSetup, T: Tank) => ({ x: T.L / 2, z: S.camera.dist });
/**
 * Where the scale person stands: a fixed spot in the room, chosen from the straight-on view: beside the tank on the
 * chosen side, as far from that eye as the tank centre (equal scale when viewed straight on). If that spot is behind
 * the room wall they take the other side; if both are, they stand against the wall. They stay put while orbiting
 * (Nathan, 2026-10-08: following the view made them jump sides).
 */
export const personSpot = (S: TankSetup, T: Tank) => personPlacement(S, T, straightOnEye(S, T));
export function personPlacement(S: TankSetup, T: Tank, eye: { x: number; z: number }) {
  const t = glassThickness(T, S.render.glass), rim = S.render.rim ? t + 8 : t;
  const h = S.person.height, w = h * PERSON_ASPECT, floor = floorY(T, S.render, S.stand);
  const vx = T.L / 2 - eye.x, vz = -T.D / 2 - eye.z, r = Math.hypot(vx, vz) || 1, ux = vx / r, uz = vz / r;
  let half = halfWidth(T, ux, uz, rim); // tank half-width across the view (with a table: the table's, from its edge)
  if (tableOn(S)) for (const [x, d] of tableRing(T, S.stand.table)) half = Math.max(half, Math.abs((x - T.L / 2) * -uz + (-d + T.D / 2) * ux));
  const phi = Math.asin(Math.min(0.9, (half + PERSON_GAP + w / 2) / r));
  // rotate eye->tank about the eye: a positive angle swings toward screen-right
  const spot = (a: number) => ({ x: eye.x + vx * Math.cos(a) - vz * Math.sin(a), z: eye.z + vx * Math.sin(a) + vz * Math.cos(a) });
  const wp = wallPlane(S, T), wb = wp.back, wr = wp.right, wl = wp.left, m = w / 2 + 5, ws = S.wall.side;
  const cw = ws === 'corner' ? cornerWalls(S, T) : null, cws = cw ? [cw.left, cw.right] : [];
  const cornerIn = (p: { x: number; z: number }) => cws.reduce((q, w) => { const v = w.n[0] * q.x + w.n[1] * q.z - w.c - m; return v < 0 ? { x: q.x - w.n[0] * v, z: q.z - w.n[1] * v } : q; }, p);
  const blocked = (p: { x: number; z: number }) => S.wall.show && (cw ? cws.some(w => w.n[0] * p.x + w.n[1] * p.z < w.c + m) : ws === 'back' ? p.z - m < wb : ws === 'right' ? p.x + m > wr : p.x - m < wl);
  let side: -1 | 1 = S.person.side === 'left' ? -1 : 1, p = spot(side * phi);
  if (blocked(p)) {
    const q = spot(-side * phi);
    if (!blocked(q)) { p = q; side = side === 1 ? -1 : 1; } else p = cw ? cornerIn(cornerIn(p)) : ws === 'back' ? { ...p, z: wb + m } : ws === 'right' ? { ...p, x: wr - m } : { ...p, x: wl + m };
  }
  return { x: p.x, z: p.z, w, h, floor, side };
}
function addPerson(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.person.show) return;
  const p = personSpot(S, T), g = new THREE.PlaneGeometry(p.w, p.h); g.translate(0, p.h / 2, 0);
  const m = new THREE.Mesh(g, cardMaterial('person', personTexture(), 'cutout'));
  m.position.set(p.x, p.floor, p.z); m.name = 'person'; m.userData.room = true; sc.add(m);
}

/** Room wall width and floor size, mm: big enough that nothing runs out at the minimum zoom (lane V, 2026-10-14; 0.1 zoom, 2026-10-15). */
const ROOM_SPAN = 120000;
/** Half the room's width along the wall, mm: the end walls stand this far either side of the tank centre. */
const ROOM_HALF = 2500;
/** Plain room floor under the stand/wall, so the room doesn't float in a void. One-sided (invisible from below). */
function addFloor(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.stand.show && !S.wall.show && !S.person.show) return;
  // 120 m across so zoomed all the way out (eye stepped back, lane V) its edge never shows; scaled, not resized,
  // because render/ar.ts finds the floor by its 8000 geometry width
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), basic(0xb3aca1));
  f.scale.setScalar(ROOM_SPAN / 8000); f.rotation.x = -Math.PI / 2; f.position.set(T.L / 2, floorY(T, S.render, S.stand) - 0.5, -T.D / 2);
  f.userData.room = true; sc.add(f);
}

/** Room wall behind the tank, against a short end (peninsula), or two walls in a corner. One-sided, so it vanishes when viewed from behind. */
function addWall(sc: THREE.Scene, S: TankSetup, T: Tank) {
  if (!S.wall.show) return;
  const { L, D } = T, wp = wallPlane(S, T), fy = floorY(T, S.render, S.stand);
  const ROOM_H = ceilingH(S.wall), SPAN = ROOM_SPAN, SKIRT_H = 90, SKIRT_D = Math.max(1, Math.min(14, wallGap(S))); // a skirting board thinner than the gap
  const g = new THREE.Group();
  const panel = (w: THREE.Group, off: number) => { // off: shift along the wall (a corner wall starts at the corner)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, ROOM_H), basic(S.wall.color, { userData: { wallPaint: true } })); // normal +z, toward the tank; recoloured in place (patchLook)
    wall.position.set(off, ROOM_H / 2, 0); wall.userData.room = true; w.add(wall);
    const skirt = shadedBox(SPAN, SKIRT_H, SKIRT_D, 0xf1efe9); skirt.position.set(off, SKIRT_H / 2, SKIRT_D / 2); w.add(skirt);
  };
  // a faint line down an inside corner where two walls meet, so the flat-shaded walls read as a corner (Nathan,
  // 2026-10-15); x along the wall, a step out into the room (toward -sx) so neither wall's face hides it
  const seam = (w: THREE.Group, x: number, sx: number) => {
    const l = lines([x - sx * 2, 0, 2, x - sx * 2, ROOM_H, 2], 0x000000, 0.14); l.userData.room = true; w.add(l);
  };
  // a ceiling at the wall's top, so zoomed far out the room has a lid instead of the space beyond; one-sided (seen
  // only from below), in the (first) wall group so whatever hides the walls (the AR view) hides it too
  const ceiling = (w: THREE.Group) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, SPAN), basic(0xf3f1ec));
    c.rotation.x = Math.PI / 2; c.position.set(L / 2, fy + ROOM_H, -D / 2); c.userData.room = true;
    w.updateMatrixWorld(true); w.attach(c);
  };
  if (S.wall.side === 'corner') { // each wall from the corner out into the room; local +x of a wall turned by a is (cos a, -sin a)
    const cw = cornerWalls(S, T);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const w = new THREE.Group(); panel(w, a > 0 ? -SPAN / 2 : SPAN / 2);
      w.position.set(cw.corner[0], fy, cw.corner[1]); w.rotation.y = a; sc.add(w);
      if (a > 0) { ceiling(w); seam(w, 0, 1); } // this wall runs from the corner along local -x
    }
    return;
  }
  panel(g, 0);
  // end walls square to the wall, ROOM_HALF either side of the tank, so the room has sides instead of a wall running
  // off forever (Nathan, 2026-10-15); in the wall's group, so they hide with it
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * ROOM_HALF, 0, SPAN / 2); e.rotation.y = -s * Math.PI / 2; g.add(e);
    panel(e, 0); seam(g, s * ROOM_HALF, s);
  }
  if (S.wall.side === 'back') g.position.set(L / 2, fy, wp.back);
  else if (S.wall.side === 'right') { g.position.set(wp.right, fy, -D / 2); g.rotation.y = -Math.PI / 2; }
  else { g.position.set(wp.left, fy, -D / 2); g.rotation.y = Math.PI / 2; }
  sc.add(g); ceiling(g);
}

/** World position of floor-plan point (x, d) on ground at height y; in a bowl (floor radius rb > 0) pushed out from the axis to meet the glass at that height. */
function flare(T: Tank, x: number, d: number, y: number, rb: number): [number, number, number] {
  if (!rb) return [x, y, -d];
  const k = Math.max(1, (bowlRadius(T, y) - 0.5) / rb), cx = T.L / 2, cd = T.D / 2;
  return [cx + (x - cx) * k, y, -(cd + (d - cd) * k)];
}

function addSubstrate(sc: THREE.Scene, S: TankSetup, T: Tank) {
  const swamp = S.layout.id === 'swamp' || S.terrain.on;
  if (!S.substrate.show && !swamp) return;
  const sub = S.substrate, { L, D } = T, tile = sub.type === 'custom' ? blendTile(sub.custom) : SUBSTRATES[sub.type].tile * 2, h = (x: number, d: number) => groundHeight(S, T, x, d);
  // top surface as a 16x16 grid (bilinear surfaces curve along diagonals) clipped to the outline, and a skirt round the
  // outline; UVs from physical mm so grain size is constant
  type V3 = [number, number, number];
  const top: number[][] = [], side: number[][] = [], N = swamp ? 72 : 16, wy = waterY(T, S.water.level);
  // a bowl flares above its floor: the ground spreads out from the centre to meet the glass at its own height
  const bowl = shapeOf(T) === 'bowl', rb = bowl ? bowlDims(T).rb : 0;
  // never flush with the bottom glass (a terrain point dragged to 0 z-fought with it into stripes, audit #14)
  const G = (p: P): V3 => flare(T, p[0], p[1], Math.max(0.6, h(p[0], p[1])), rb);
  const P3 = (i: number, j: number): V3 => G([L * i / N, D * j / N]);
  // cheap slope shading: brightness from the ground's tilt toward a light above, front and left, per grid vertex and
  // blended across each cell (one flat shade per cell showed the 16x16 grid as sharp-edged squares on gentle slopes);
  // the lit shader's normal likewise per grid vertex and blended (computeVertexNormals on these unshared triangles gave
  // one normal per triangle, so the fixture light drew every triangle's edge)
  const light = new THREE.Vector3(-0.35, 1, 0.45).normalize(), topCol: number[] = [], topNrm: number[] = [];
  const vcol: number[][] = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(N, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(N, j + 1);
    const a = new THREE.Vector3(...P3(i1, j)).sub(new THREE.Vector3(...P3(i0, j))), b = new THREE.Vector3(...P3(i, j1)).sub(new THREE.Vector3(...P3(i, j0)));
    const n = new THREE.Vector3().crossVectors(a, b).normalize(); if (n.y < 0) n.negate();
    const k = clamp(0.55 + 0.6 * n.dot(light), 0, 1.15) / 1.15, q = P3(i, j);
    // emerged ground reads as damp soil and moss (mottled), not aquarium gravel
    const dry = clamp((q[1] - wy) / 12, 0, 1), mo = 0.5 + 0.5 * Math.sin(q[0] * 0.045 + Math.sin(q[2] * 0.05) * 2.4);
    vcol[i * (N + 1) + j] = [k * (1 - dry * (0.42 + 0.12 * mo)), k * (1 - dry * (0.3 - 0.12 * mo)), k * (1 - dry * (0.62 + 0.05 * mo)), n.x, n.y, n.z];
  }
  const colAt = (p: P) => { // colour and normal, bilinear between the grid vertices round p
    const fx = clamp(p[0] / L * N, 0, N), fz = clamp(p[1] / D * N, 0, N), i = Math.min(N - 1, Math.floor(fx)), j = Math.min(N - 1, Math.floor(fz)), u = fx - i, w = fz - j;
    const c00 = vcol[i * (N + 1) + j], c10 = vcol[(i + 1) * (N + 1) + j], c01 = vcol[i * (N + 1) + j + 1], c11 = vcol[(i + 1) * (N + 1) + j + 1];
    return [0, 1, 2, 3, 4, 5].map(c => (c00[c] * (1 - u) + c10[c] * u) * (1 - w) + (c01[c] * (1 - u) + c11[c] * u) * w);
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cell = clipToFootprint(T, [[L * i / N, D * j / N], [L * (i + 1) / N, D * j / N], [L * (i + 1) / N, D * (j + 1) / N], [L * i / N, D * (j + 1) / N]]);
    if (cell.length < 3) continue;
    const q = [P3(i, j), P3(i + 1, j), P3(i + 1, j + 1), P3(i, j + 1)];
    const a = new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])), b = new THREE.Vector3(...q[3]).sub(new THREE.Vector3(...q[0]));
    const n = new THREE.Vector3().crossVectors(a, b).normalize(); if (n.y < 0) n.negate();
    const v = cell.map(G); // a whole cell is the quad as before; a cut one is a fan
    // grain from above on gentle ground; on a steep bank (swamp pool walls) from the side it faces, so it does not
    // smear into streaks (audit #15)
    const uv = n.y > 0.6 ? (p: V3) => [p[0] / tile, -p[2] / tile] : Math.abs(n.x) > Math.abs(n.z) ? (p: V3) => [-p[2] / tile, p[1] / tile] : (p: V3) => [p[0] / tile, p[1] / tile];
    const cc = cell.map(colAt);
    for (let m = 1; m < v.length - 1; m++) for (const t of [0, m, m + 1]) {
      top.push(v[t], uv(v[t])); topCol.push(...cc[t].slice(0, 3));
      const nn = new THREE.Vector3(...cc[t].slice(3)).normalize(); topNrm.push(nn.x, nn.y, nn.z);
    }
  }
  // the skirt round the outline in short strips, so its top edge follows the ground (swamp banks are not straight);
  // the back shows through clear back glass (peninsula, orbiting round the back)
  const seg = Math.min(L, D) / N;
  for (const e of footprint(T).edges) {
    const m = Math.max(1, Math.ceil(e.len / seg));
    for (let k = 0; k < m; k++) {
      const p: P = [e.a[0] + (e.b[0] - e.a[0]) * k / m, e.a[1] + (e.b[1] - e.a[1]) * k / m], q: P = [e.a[0] + (e.b[0] - e.a[0]) * (k + 1) / m, e.a[1] + (e.b[1] - e.a[1]) * (k + 1) / m];
      const s0 = e.s0 + e.len * k / m, s1 = e.s0 + e.len * (k + 1) / m, gp = G(p), gq = G(q);
      // a bowl: in bands up the curve of the glass (one straight strip would cut inside the sphere, a cone)
      const bands = bowl ? 8 : 1, cx = L / 2, cd = D / 2;
      const on = (c: P, top: number, j: number): V3 => {
        const y = top * j / bands; if (!bowl || j === bands) return j === bands ? (c === p ? gp : gq) : [c[0], 0, -c[1]];
        const f = (bowlRadius(T, y) - 0.5) / rb; return [cx + (c[0] - cx) * f, y, -(cd + (c[1] - cd) * f)];
      };
      for (let j = 0; j < bands; j++) {
        const pts: V3[] = [on(p, gp[1], j), on(q, gq[1], j), on(q, gq[1], j + 1), on(p, gp[1], j + 1)];
        const uv = [[s0, pts[0][1]], [s1, pts[1][1]], [s1, pts[2][1]], [s0, pts[3][1]]];
        for (const i of [0, 1, 2, 0, 2, 3]) side.push(pts[i], [uv[i][0] / tile, uv[i][1] / tile]);
      }
    }
  }
  const mk = (arr: number[][], shade: number, cols?: number[], nrm?: number[]) => {
    const g = new THREE.BufferGeometry(); if (cols) g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    if (nrm) g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); // applyLighting keeps a normal it finds
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 0).flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.filter((_, i) => i % 2 === 1).flat(), 2));
    const m = new THREE.MeshBasicMaterial({ map: sub.type === 'custom' ? blendTexture(sub.custom, 'a') : substrateTexture(sub.type), color: shade, vertexColors: !!cols, side: THREE.DoubleSide });
    m.userData.sub = true; if (sub.type === 'custom') blendGrains(m, sub.custom, tile);
    sc.add(new THREE.Mesh(g, m));
  };
  mk(top, 0xffffff, topCol, topNrm); mk(side, 0xb4b4b4); // the skirt a touch darker so the layer reads through the glass
}

/**
 * Custom substrate with a second grain (Nathan 2026-10-13): a floor-wide noise mask (`substrateMask`) splits the floor
 * into the first grain alone (map), the second alone and the two mixed grain by grain. In mask-share terms the pure
 * patches take (1 - mix) of each grain's share and the mixed ground the rest, so the shares hold at any mix: mix 0 =
 * separate patches with a sharp edge, 1 = mixed everywhere. Patches shrink as the mix rises (big drifts to small clumps).
 */
/** The mask shader's uniforms for a two-grain blend; with `u`, its values are updated in place (patchLook). */
interface BlendUniforms { uMapB: { value: THREE.Texture }; uMapM: { value: THREE.Texture }; uMask: { value: THREE.Texture }; uZone: { value: THREE.Vector4 } }
function blendUniforms(b: TankSetup['substrate']['custom'], tile: number, u?: BlendUniforms): BlendUniforms {
  const p2 = b.share / 100, k = 1 - b.mix, period = 900 - 650 * b.mix; // mm per mask repeat
  const zone = new THREE.Vector4(maskQuantile((1 - p2) * k), maskQuantile(1 - p2 * k), tile / period, 0.012);
  if (u) { u.uMapB.value = blendTexture(b, 'b'); u.uMapM.value = blendTexture(b, 'm'); u.uZone.value.copy(zone); return u; }
  return { uMapB: { value: blendTexture(b, 'b') }, uMapM: { value: blendTexture(b, 'm') }, uMask: { value: substrateMaskTexture() }, uZone: { value: zone } };
}
function blendGrains(m: THREE.MeshBasicMaterial, b: TankSetup['substrate']['custom'], tile: number) {
  if (b.grain2 === 'none') return;
  const uniforms = m.userData.blend = blendUniforms(b, tile); // patchLook updates them in place
  m.userData.post = (sh: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `uniform sampler2D uMapB, uMapM, uMask; uniform vec4 uZone;
vec4 aqBlend(vec2 uv) {
  float n = texture2D(uMask, vMapUv * uZone.z).r;
  float a = 1.0 - smoothstep(uZone.x - uZone.w, uZone.x + uZone.w, n), b = smoothstep(uZone.y - uZone.w, uZone.y + uZone.w, n);
  return texture2D(map, uv) * a + texture2D(uMapB, uv) * b + texture2D(uMapM, uv) * max(1.0 - a - b, 0.0);
}
void main() {`).replace('texture2D(map, vMapUv);', 'aqBlend(vMapUv);').replace('texture2D(map, uv2)', 'aqBlend(uv2)');
  };
}

/** Soft dark ellipse for contact shadows (radial falloff to zero at the edge). */
const shadowTex = (() => {
  let t: THREE.Texture | undefined;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (t = new THREE.CanvasTexture(c));
  };
})();
const shadowGeo = (() => { const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); g.userData.keep = true; return g; })();
/**
 * A soft shadow on the ground under an animal: under the light above, strongest when it rests on the ground and
 * fading as it rises (gone by about two body lengths). Ellipse = body length x a share of its height, turned with it.
 */
function contactShadow(S: TankSetup, T: Tank, x: number, depth: number, bottom: number, w: number, h: number, yaw: number) {
  const g = groundHeight(S, T, x, depth), lift = Math.max(0, bottom - g), k = 0.5 * Math.exp(-lift / (0.8 * w));
  if (k < 0.03) return null;
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity: k, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const s = 1 + lift / w * 0.6; // a higher fish casts a wider, softer shadow
  m.scale.set(w * 0.95 * s, 1, Math.max(h * 0.5, w * 0.2) * s); m.rotation.y = yaw * D2R;
  m.position.set(x, g + 0.5, -depth); m.userData.nolight = true; m.renderOrder = 1;
  return m;
}

export function cardGeometry(w: number, h: number, bend: number) {
  const g = new THREE.PlaneGeometry(w, h, 16, 1);
  if (bend) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2); p.setZ(i, bend * w * 0.14 * (1 - u * u)); }
    g.computeBoundingSphere();
  }
  return g;
}

function outline(w: number, h: number) {
  const r = lines([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0, -w / 2, h / 2, 0, -w / 2, -h / 2, 0], 0x3d8bff, 1);
  (r.material as THREE.Material).depthTest = false; r.renderOrder = 10;
  return r;
}

/** The selection box round an aquascape item: its bounding box, drawn over everything. */
function boxOutline(g: THREE.BufferGeometry) {
  if (!g.boundingBox) g.computeBoundingBox();
  const { min: a, max: b } = g.boundingBox!, c = [[a.x, a.y, a.z], [b.x, a.y, a.z], [b.x, a.y, b.z], [a.x, a.y, b.z], [a.x, b.y, a.z], [b.x, b.y, a.z], [b.x, b.y, b.z], [a.x, b.y, b.z]];
  const e = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7].flatMap(i => c[i]);
  const r = lines(e, 0x3d8bff, 1);
  (r.material as THREE.Material).depthTest = false; r.renderOrder = 10; r.userData.nolight = true;
  return r;
}

/** One fish's or item's objects in the scene and the key they were built from: an unchanged key keeps them (patchTank). */
interface Part { key: string; objs: THREE.Object3D[]; meshes: THREE.Mesh[] }

export interface BuiltTank {
  scene: THREE.Scene;
  fishMeshes: THREE.Mesh[];
  meshById: Map<number, THREE.Mesh>;
  /** Custom terrain grid points (userData.dot = index), present while editing. */
  dotMeshes: THREE.Mesh[];
  /** Aquascape items (userData.item = id; userData.plant on plants). */
  itemMeshes: THREE.Mesh[];
  /** Per fish / item in scene order (audit #52-53: an edit rebuilds only the parts whose key changed). */
  fishParts: Part[];
  itemParts: Part[];
  /** How many of the scene's children come before the items and animals: a patched scene keeps a full build's order. */
  contentAt: number;
}

/**
 * The fields the meshes outside the fish and items depend on: a change to any of them rebuilds the whole tank. Left
 * out: the fish and items (patched part by part), the camera, the values that are only uniforms (colour temperature,
 * brightness, room light, lane K's power / light type / measured PAR / map unit, fish stand out) and the colours `patchLook` sets in place (water colour and opacity;
 * the wall colour; a custom substrate's colours, share and mix).
 */
export function envKey(S: TankSetup) {
  const { kelvin: _k, room: _r, bright: _b, watts: _w, tech: _t, par: _q, mapUnit: _u, mapStep: _ms, mapStepLux: _ml, bulbW: _bw, mapSlice: _sl, mapShells: _sh, mapDark: _dk, ...light } = S.light, { pop: _p, ...render } = S.render;
  const { color: _wc, opacity: _o, ...water } = S.water, { color: _c, ...wall } = S.wall;
  const { color: _c1, color2: _c2, share: _s, mix: _m, ...custom } = S.substrate.custom;
  // the condition (lane AL) is uniforms only
  return JSON.stringify({ ...S, fish: null, items: null, camera: null, grow: null, condition: null, light, render, water, wall, substrate: { ...S.substrate, custom } });
}
/** The values `patchLook` sets. */
export const lookKey = (S: TankSetup) => JSON.stringify([S.water.color, S.water.opacity, S.wall.color, S.substrate.custom]);

/** Water surface tint and opacity (addWater). */
const surfaceLook = (w: TankSetup['water']) => ({ color: new THREE.Color(0xd8eef2).lerp(new THREE.Color(w.color), 0.25 + 0.5 * w.opacity), opacity: 0.1 + 0.25 * w.opacity });

/** Recolour a built tank in place for a change that only `lookKey` sees (same envKey). */
export function patchLook(sc: THREE.Scene, S: TankSetup) {
  const s = surfaceLook(S.water), b = S.substrate.custom;
  sc.traverse(o => {
    const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
    if (!m?.userData) return;
    if (o.userData.waterVol) { o.userData.waterVol = S.water.opacity > 0 ? 'on' : 'off'; o.visible = o.userData.waterVol === 'on'; }
    if (m.userData.waterSurf) { m.color.copy(s.color); m.opacity = s.opacity; }
    else if (m.userData.wallPaint) m.color.set(S.wall.color);
    else if (m.userData.sub && S.substrate.type === 'custom') {
      m.map = blendTexture(b, 'a');
      const u = m.userData.blend as BlendUniforms | undefined;
      if (u) blendUniforms(b, blendTile(b), u); // the same uniform objects the program holds
    }
  });
}

/**
 * Custom terrain editing aids: a dot on every grid point (drawn over everything so plants never hide one) and faint
 * grid lines following the ground between them. `hot` = the point being dragged.
 */
function addTerrainDots(sc: THREE.Scene, S: TankSetup, T: Tank, hot: number | null): THREE.Mesh[] {
  const t = S.terrain, g = (x: number, d: number) => groundHeight(S, T, x, d), dots: THREE.Mesh[] = [], pts: number[] = [];
  const rb = shapeOf(T) === 'bowl' ? bowlDims(T).rb : 0, disc = terrainDisc(T);
  const step = t.arc ? T.D / t.rows : t.radial ? disc.rx / t.rows : Math.min(T.L / (t.cols - 1), T.D / (t.rows - 1));
  const r = clamp(step * 0.17, 7, 20); // big and easy to grab; still well clear of the neighbouring point
  const geo = new THREE.SphereGeometry(r, 12, 8), ring = new THREE.SphereGeometry(r * 1.45, 12, 8);
  // see-through so they hide little of the ground being shaped (Nathan 2026-10-15): the fill truly clear (drawn into no
  // pixel, still what the pointer grabs), only a thin dark outline at the sphere's silhouette; the one being dragged a
  // faint orange
  const mat = (c: number, opacity: number) => basic(c, { depthTest: false, depthWrite: false, transparent: true, opacity, colorWrite: opacity > 0 });
  const fill = mat(0xffffff, 0), hotM = mat(0xffb020, 0.35);
  const edge = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { uCol: { value: new THREE.Color(0x1d2a33) } },
    vertexShader: 'varying vec3 vN, vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    // a hairline at the silhouette: 1 - n.v past ~0.65 is the outer ~5 % of the ring's radius
    fragmentShader: 'uniform vec3 uCol; varying vec3 vN, vV; void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uCol, 0.8 * smoothstep(0.55, 0.7, f)); }' });
  terrainPoints(t, T).forEach((p, k) => {
    const y = g(p.x, p.depth);
    if (!inside(T, p.x, p.depth, -1)) return; // outside a round or angled tank: still shapes the ground, not shown
    const o = new THREE.Mesh(ring, edge); o.position.set(...flare(T, p.x, p.depth, y, rb)); o.renderOrder = 20; o.userData = { nolight: true, dot: k }; sc.add(o); dots.push(o); // the rim grabs too
    const m = new THREE.Mesh(geo, k === hot ? hotM : fill); m.position.copy(o.position); m.renderOrder = 21; m.userData = { nolight: true, dot: k }; sc.add(m); dots.push(m);
  });
  const seg = 10, seg2 = (x0: number, d0: number, x1: number, d1: number) => pts.push(...flare(T, x0, d0, g(x0, d0) + 1, rb), ...flare(T, x1, d1, g(x1, d1) + 1, rb));
  if (t.arc) { // an arc through each ring of a pie slice grid, round its apex (stretched in a non-pie Tank B)
    const hh = t.arc * Math.PI / 360, sx = T.L / 2 / Math.sin(hh);
    const P = (k: number, a: number): [number, number] => [T.L / 2 + (k / t.rows) * Math.sin(a) * sx, T.D - (k / t.rows) * Math.cos(a) * T.D];
    for (let k = 1; k <= t.rows; k++) {
      const n = pieSegs(k, t.arc) * seg;
      for (let i = 0; i < n; i++) seg2(...P(k, -hh + 2 * hh * i / n), ...P(k, -hh + 2 * hh * (i + 1) / n));
    }
  } else if (t.radial) { // a circle through each ring (ellipse in a non-round Tank B; flared out to the glass in a bowl)
    for (let k = 1; k <= t.rows; k++) {
      const n = Math.max(24, Math.round(2 * Math.PI * k) * seg), rx = disc.rx * k / t.rows, rd = disc.rd * k / t.rows;
      for (let i = 0; i < n; i++) {
        const a0 = 2 * Math.PI * i / n, a1 = 2 * Math.PI * (i + 1) / n;
        seg2(disc.x + rx * Math.cos(a0), disc.depth + rd * Math.sin(a0), disc.x + rx * Math.cos(a1), disc.depth + rd * Math.sin(a1));
      }
    }
  } else {
    for (let j = 0; j < t.rows; j++) for (let i = 0; i < (t.cols - 1) * seg; i++) {
      const d = T.D * j / (t.rows - 1); seg2(T.L * i / ((t.cols - 1) * seg), d, T.L * (i + 1) / ((t.cols - 1) * seg), d);
    }
    for (let i = 0; i < t.cols; i++) for (let j = 0; j < (t.rows - 1) * seg; j++) {
      const x = T.L * i / (t.cols - 1); seg2(x, T.D * j / ((t.rows - 1) * seg), x, T.D * (j + 1) / ((t.rows - 1) * seg));
    }
  }
  sc.add(lines(pts, 0xffffff, 0.35));
  return dots;
}

/**
 * The parts a first load (or an opened file / example) shows one after another as their shader programs link (lane PL,
 * viewer.ts reveal), in this order; each top-level child of a built scene carries its index as userData.part (none = 0).
 */
export const PART = { room: 0, glass: 1, ground: 2, hardscape: 3, plants: 4, animals: 5 } as const;
const tagFrom = (sc: THREE.Scene, n0: number, part: (o: THREE.Object3D) => number) => { for (const o of sc.children.slice(n0)) o.userData.part = part(o); };
/** Does o (or anything under it) draw with the hardscape's material (the 3D back wall does)? */
const solidIn = (o: THREE.Object3D) => { let s = false; o.traverse(c => { s ||= !!((c as THREE.Mesh).material as THREE.Material | undefined)?.userData?.solid; }); return s; };

export function buildTank(S: TankSetup & { units: Units }, T: Tank, selId: number | null, edit?: { hot: number | null }, selItem: number | null = null): BuiltTank {
  const sc = new THREE.Scene();
  addTank(sc, S, T); addWater(sc, S, T); if (S.water.on) addAlgae(sc, T, waterY(T, S.water.level), LU); tagFrom(sc, 0, () => PART.glass);
  let n0 = sc.children.length; addSubstrate(sc, S, T); tagFrom(sc, n0, () => PART.ground);
  n0 = sc.children.length; addBackdrop(sc, S.backdrop, T, S.render.rim, S.render.bgSides); tagFrom(sc, n0, o => solidIn(o) ? PART.hardscape : PART.glass);
  n0 = sc.children.length; addStand(sc, S, T);
  for (const o of sc.children.slice(n0)) o.userData.stand = true; // AR's stand toggle hides these
  addWall(sc, S, T); addPerson(sc, S, T); addFloor(sc, S, T);
  const b: BuiltTank = { scene: sc, fishMeshes: [], meshById: new Map(), dotMeshes: [], itemMeshes: [], fishParts: [], itemParts: [], contentAt: sc.children.length };
  addContents(b, S, T, selId, selItem);
  addLid(sc, S, T);
  if (S.lid !== 'hood') addFixture(sc, T, S.light, floorY(T, S.render, S.stand) + ceilingH(S.wall)); // ceiling: the wall's room height // with a hood the fixture is inside it; its light still applies
  if (S.render.beams) addBeams(sc, T, S.light, S.lid);
  b.dotMeshes = edit && S.terrain.on ? addTerrainDots(sc, S, T, edit.hot) : [];
  applyLighting(sc);
  sc.updateMatrixWorld(true);
  return b;
}

/**
 * Bring a built tank's fish and items up to date with S, which must have the envKey it was built from (else rebuild
 * it with buildTank): a fish or item whose key is unchanged keeps its meshes, the rest are rebuilt and the old ones
 * disposed (audit #52-53: moving one fish rebuilt all 40 fish and 56 items, ~65 ms per drag step). Returns how many
 * parts were built.
 */
export function patchTank(b: BuiltTank, S: TankSetup & { units: Units }, T: Tank, selId: number | null, selItem: number | null = null) {
  const n = addContents(b, S, T, selId, selItem, true);
  if (n) { applyLighting(b.scene); b.scene.updateMatrixWorld(true); }
  return n;
}

/** Add the items and animals to b.scene (reusing b's parts whose key is unchanged when `reuse`); fills b's lists. */
function addContents(b: BuiltTank, S: TankSetup, T: Tank, selId: number | null, selItem: number | null, reuse = false) {
  const sc = b.scene, pool = new Map<string, Part[]>();
  if (reuse) for (const p of [...b.itemParts, ...b.fishParts]) pool.set(p.key, [...pool.get(p.key) ?? [], p]);
  let built = 0;
  const part = (key: string, objs: THREE.Object3D[], meshes: THREE.Mesh[]): Part => { built++; for (const o of objs) sc.add(o); return { key, objs, meshes }; };
  const take = (key: string) => pool.get(key)?.pop();
  // light beams on (a working view for placing the lights): the tank holds only its substrate, so the light map on it
  // is not blocked or hidden by plants, hardscape or animals (Nathan 2026-10-13)
  const bare = S.render.beams && S.light.type !== 'flat';
  const hard: string[] = []; // the solid pieces' data: an animal on the hardscape is rebuilt when any of them changes
  b.itemParts = (bare ? [] : S.items).map(it => {
    const data = JSON.stringify(it), key = 'i' + data + (it.id === selItem ? '*' : '');
    const m = take(key) ?? (() => {
      const m = itemMesh(S, T, it); if (!m) return part(key, [], []);
      if (it.id === selItem) m.add(boxOutline(m.geometry));
      return part(key, [m], [m]);
    })();
    if (m.meshes.some(o => !o.userData.plant)) hard.push(data);
    return m;
  });
  // roots showing in the substrate at the glass (not picked: objects only)
  if (!bare) { const key = rootsKey(S); b.itemParts.push(take(key) ?? ((m: THREE.Mesh | null) => part(key, m ? [m] : [], []))(rootsMesh(S, T))); }
  b.itemMeshes = b.itemParts.flatMap(p => p.meshes);
  const solids = b.itemMeshes.filter(m => !m.userData.plant); for (const m of solids) m.updateMatrixWorld(true);
  const hardKey = hard.join('|');
  // glass climbers sit on the 3D wall where it covers the pane
  const wallKey = JSON.stringify([S.backdrop, S.render.rim, S.render.bgSides]);
  // the top of the solid piece (stone, wood, cave) under (x, depth), for animals on the hardscape; else the ground
  const rests = solids.filter(m => !m.userData.coral); // animals rest on rock, wood and caves, never on coral
  const down = new THREE.Raycaster(), from = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
  const top = (x: number, depth: number, hard: boolean) => {
    const g = groundHeight(S, T, x, depth); if (!hard) return g;
    down.set(from.set(x, T.H * 3 + 1000, -depth), DOWN);
    return Math.max(g, down.intersectObjects(rests, false)[0]?.point.y ?? g);
  };
  const base = (f: Fish) => top(f.x, f.depth, f.surface === 'hardscape');
  // an animal (mesh m, length w, its centre k above its belly) resting on a slope: tipped to the ground's slope under its
  // head, tail and both sides (at most MAX_TILT), its centre k off the ground along that tilt, then lifted just clear
  // where the ground still rises into its belly (a bank's curve, a slope past MAX_TILT)
  const restOn = (f: Fish, m: THREE.Mesh, w: number, k: number) => {
    const hard = f.surface === 'hardscape', g = (x: number, dp: number) => top(x, dp, hard), a = f.yaw * D2R;
    const hx = Math.cos(a), hd = Math.sin(a), L = w * 0.4, Wd = w * 0.2; // heading in (x, depth); side = (hd, -hx)
    const sH = (g(f.x + hx * L, f.depth + hd * L) - g(f.x - hx * L, f.depth - hd * L)) / (2 * L);
    const sS = (g(f.x + hd * Wd, f.depth - hx * Wd) - g(f.x - hd * Wd, f.depth + hx * Wd)) / (2 * Wd);
    // gradient in world x, z (z = -depth): heading = (hx, -hd), side = (hd, hx)
    const n = new THREE.Vector3(-(sH * hx + sS * hd), 1, -(-sH * hd + sS * hx)).normalize();
    if (n.y < Math.cos(MAX_TILT)) { const s = Math.hypot(n.x, n.z) || 1; n.set(n.x / s * Math.sin(MAX_TILT), Math.cos(MAX_TILT), n.z / s * Math.sin(MAX_TILT)); }
    m.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(UP, n));
    m.position.set(f.x, base(f), -f.depth).addScaledVector(n, k);
    let lift = 0;
    for (const u of [-0.35, 0, 0.35]) for (const v of [-0.25, 0, 0.25]) {
      const q = new THREE.Vector3(u * w, -k, v * w).applyQuaternion(m.quaternion).add(m.position);
      lift = Math.max(lift, g(q.x, -q.z) - q.y);
    }
    m.position.y += Math.min(lift, w);
  };
  // one animal's meshes (`register`: picked, outlined when selected) and its contact shadow (`add`)
  const animal = (f: Fish, register: (m: THREE.Mesh, w: number, h: number) => void, add: (o: THREE.Object3D | null) => void) => {
    const sp = speciesOf(f); if (!sp) return;
    if (sp.kind === 'snail') {
      for (const [m, w, h] of snailMeshes(S, T, f, sp, base(f))) register(m, w, h);
      if ((f.surface ?? 'floor') === 'floor') { const w = fishTL(f, sp); add(contactShadow(S, T, f.x, f.depth, groundHeight(S, T, f.x, f.depth), w, w * 0.45, f.yaw)); }
      return;
    }
    if (!S.water.on && needsWater(sp)) return; // dry tank: fish stay in the scene data, hidden until the water is back
    const w = fishTL(f, sp), h = w * sp.aspect, p = f;
    const herp = isHerp3D(sp.art);
    const m = new THREE.Mesh(drapedCard(sp.art, w, h, f.bend) || cardGeometry(w, h, f.bend), herp ? HIDDEN : cardMaterial(`fish:${sp.look}:${fish3d.fade}`, fishTexture(sp, S.render.edge, true, fish3d.fade), S.render.edge));
    if (!herp) (m.material as THREE.Material).userData.fishCard = true; // fish stand out (render.pop) lifts the card too
    if (herp) m.add(herpBody(sp.art, w, f.surface)); // the card stays as the invisible picking target
    else m.add(fishBody(sp.art, sp.aspect, w, f.bend, fishBodyTexture(sp), S.render.edge, f.surface === 'glass')); // solid body + paired fins; the card keeps the median fins
    if (f.surface === 'glass') { onGlass(S, T, f, sp, m, w); register(m, w, h); return; }
    // floating at the water surface (dwarf frog): the pose's `top` line just under the water line, wherever it is
    const ft = f.surface === 'top' ? herpFloatTop(sp.art) : undefined;
    if (ft !== undefined) {
      m.position.set(p.x, waterY(T, S.water.level) - 0.5 + ft * w, -p.depth); m.rotation.set(f.roll * D2R, f.yaw * D2R, f.pitch * D2R, 'YXZ');
      register(m, w, h); return;
    }
    // bottom dwellers and animals on land rest on the ground (or the hardscape) wherever they are (their stored height is ignored)
    const rests = restsOnGround(S, T, sp, p.x, p.depth, h);
    const y = rests ? base(f) + sp.rest * w - 1 : Math.min(p.y, Math.max(0, waterY(T, S.water.level) - h / 2));
    m.position.set(p.x, y, -p.depth); m.rotation.set(f.roll * D2R, f.yaw * D2R, f.pitch * D2R, 'YXZ');
    // on a slope: lying along the ground, not level with it (Nathan 2026-10-13: a treefrog on a bank sat half in the substrate)
    if (rests) restOn(f, m, w, sp.rest * w - 1);
    register(m, w, h);
    if (f.surface === 'hardscape') return;
    add(contactShadow(S, T, p.x, p.depth, y - h / 2, w, h, f.yaw));
  };
  const fishPart = (f: Fish, key: string) => {
    const objs: THREE.Object3D[] = [], meshes: THREE.Mesh[] = [];
    animal(f, (m, w, h) => { m.userData.id = f.id; if (f.id === selId) m.add(outline(w, h)); objs.push(m); meshes.push(m); }, o => { if (o) objs.push(o); });
    return part(key, objs, meshes);
  };
  b.fishParts = (bare ? [] : S.fish).map(f => {
    const key = 'f' + JSON.stringify(f) + (f.id === selId ? '*' : '') + (f.surface === 'hardscape' ? hardKey : '') + (f.surface === 'glass' ? wallKey : '');
    return take(key) ?? fishPart(f, key);
  });
  b.fishMeshes = b.fishParts.flatMap(p => p.meshes);
  for (const p of b.itemParts) for (const o of p.objs) o.userData.part = o.userData.plant ? PART.plants : o.userData.coral ? PART.animals : p.meshes.length ? PART.hardscape : PART.ground; // no meshes: the roots
  for (const p of b.fishParts) for (const o of p.objs) o.userData.part = PART.animals;
  b.meshById = new Map();
  for (const m of b.fishMeshes) if (!b.meshById.has(m.userData.id)) b.meshById.set(m.userData.id, m);
  // what was not reused is gone or changed
  for (const l of pool.values()) for (const p of l) for (const o of p.objs) { sc.remove(o); disposeScene(o); }
  // the children in a full build's order (new parts were added at the end): the draw order depends on it (viewer opaqueOrder)
  if (reuse) {
    const parts = [...b.itemParts, ...b.fishParts].flatMap(p => p.objs), mine = new Set(parts), rest = sc.children.filter(o => !mine.has(o));
    sc.children = [...rest.slice(0, b.contentAt), ...parts, ...rest.slice(b.contentAt)];
  }
  return built;
}

/** Material of a picking card whose animal is drawn in 3D. */
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
HIDDEN.userData.cached = true; HIDDEN.userData.keep = true;
/** World up, and the steepest an animal resting on the ground is tilted to follow it (radians). */
const UP = new THREE.Vector3(0, 1, 0), MAX_TILT = 45 * D2R;
/** How far a snail or pleco on the glass sits off the inside of the pane (mm). */
const PANE_GAP = 0.8;

/**
 * An animal clinging to the glass (a pleco, an oto or a tree frog) at the point nearest its (x, depth): belly on the pane, back into the
 * tank, head along yaw in the plane of the pane (0 = level, 90 = straight up).
 */
function onGlass(S: TankSetup, T: Tank, f: Fish, sp: Species, m: THREE.Mesh, w: number) {
  const g0 = nearestGlass(T, f.x, f.depth, f.y);
  const y = clamp(f.y, ...glassBand(S, T, sp, w, groundHeight(S, T, g0.x, g0.depth))), off = sp.rest * w + PANE_GAP;
  // outward normal toward the glass (tilted on a bowl); "up" for the heading = straight up, laid onto the glass
  const g = glassFrame(T, f.x, f.depth, y), n = new THREE.Vector3(g.n[0], g.n[1], -g.n[2]);
  const up = n.clone().negate(), along = new THREE.Vector3(n.z, 0, -n.x).normalize(), a = f.yaw * D2R;
  const climb = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const head = along.multiplyScalar(Math.cos(a)).addScaledVector(climb, Math.sin(a)), side = head.clone().cross(up);
  // on the 3D wall where it covers this pane: belly on the relief, not on the glass behind it (Nathan 2026-10-15)
  const wall = onWall(S, T, new THREE.Vector3(g.x, y, -g.depth), n, head, side, w);
  if (wall) {
    const [p, nw] = wall;
    up.copy(nw); head.addScaledVector(nw, -head.dot(nw)).normalize(); side.copy(head).cross(up);
    m.position.copy(p).addScaledVector(nw, off);
  } else m.position.set(g.x - n.x * off, y - n.y * off, -g.depth - n.z * off);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(head, up, side));
}

const WALL_RAY = new THREE.Raycaster(), wallMesh = new THREE.Mesh();
/**
 * Where an animal at glass point `at` (outward normal `n`) lies on the 3D wall: five rays toward the glass (the middle
 * and half a body length along `head` and `side`), a plane through the hits, raised so no hit pokes through the belly.
 * Returns the point on that plane under the middle and its normal into the tank, or null where no wall covers the pane.
 */
function onWall(S: TankSetup, T: Tank, at: THREE.Vector3, n: THREE.Vector3, head: THREE.Vector3, side: THREE.Vector3, w: number): [THREE.Vector3, THREE.Vector3] | null {
  const geo = S.backdrop && backdropGeometry(T, S.backdrop, S.render.rim, S.render.bgSides);
  if (!geo) return null;
  wallMesh.geometry = geo; wallMesh.updateMatrixWorld();
  const reach = backdropDepth(S.backdrop!, T) + 10; // start just in front of the wall's deepest relief
  const hit = (dh: number, ds: number) => {
    const o = at.clone().addScaledVector(head, dh).addScaledVector(side, ds).addScaledVector(n, -reach);
    WALL_RAY.set(o, n); WALL_RAY.far = reach + 2;
    const h = WALL_RAY.intersectObject(wallMesh, false)[0];
    return h ? h.point : null;
  };
  const r = w * 0.5, c = hit(0, 0);
  if (!c) return null;
  const pts = [c, hit(r, 0), hit(-r, 0), hit(0, r), hit(0, -r)].map(p => p ?? c);
  const nw = pts[1].clone().sub(pts[2]).cross(pts[3].clone().sub(pts[4]));
  if (nw.lengthSq() < 1e-9) nw.copy(n).negate(); else nw.normalize();
  if (nw.dot(n) > 0) nw.negate(); // into the tank
  if (nw.dot(n) > -0.3) nw.add(n.clone().multiplyScalar(-1)).normalize(); // no steeper than ~70° off the glass
  // raise the plane over the highest hit
  const lift = Math.max(...pts.map(p => p.clone().sub(c).dot(nw)), 0);
  return [c.addScaledVector(nw, lift), nw];
}

/**
 * Snail cards. On the substrate or hardscape (`ground` = the height under it): one upright side-view card. On glass: two one-sided cards back to back, the foot
 * facing the glass (what you see through that pane) and the shell facing into the tank; yaw = heading in the pane.
 */
function snailMeshes(S: TankSetup, T: Tank, f: Fish, sp: Species, ground: number): [THREE.Mesh, number, number][] {
  const p = f, surf = f.surface ?? 'floor', w = fishTL(f, sp);
  const sub = (x: number, d: number) => groundHeight(S, T, x, d);
  if (surf !== 'glass') {
    // the card stays as the (invisible) picking target, the solid snail stands on its sole under it
    const h = w * sp.aspect;
    const m = new THREE.Mesh(cardGeometry(w, h, 0), HIDDEN);
    m.position.set(p.x, ground + sp.rest * w - 0.5, -p.depth); m.rotation.set(0, f.yaw * D2R, 0, 'YXZ');
    const b = snailBody(sp.art, w); b.position.y = 0.5 - sp.rest * w; m.add(b);
    return [[m, w, h]];
  }
  // on the glass at the point nearest its (x, depth), just off the inside face, foot (local +z) toward the glass
  // on a bowl the foot lies on the sphere: tilted back above the equator, forward below it (rx)
  const h = w * snailAspect(sp.art, 'foot'), g0 = nearestGlass(T, p.x, p.depth, p.y);
  const top = S.water.on ? waterY(T, S.water.level) : T.H; // dry: the whole pane
  const y0 = clamp(p.y, sub(g0.x, g0.depth) + h / 2, Math.max(sub(g0.x, g0.depth) + h / 2, top - w / 2));
  const g = glassFrame(T, p.x, p.depth, y0), ry = Math.atan2(g.n[0], -g.n[2]), rx = -Math.asin(g.n[1]);
  const x = g.x - g.n[0] * PANE_GAP, d = g.depth - g.n[2] * PANE_GAP, y = y0 - g.n[1] * PANE_GAP;
  // an invisible picking card in the pane, the 3D snail on its sole against the glass (its up = card -z, into the tank)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), HIDDEN);
  m.position.set(x, y, -d); m.rotation.set(rx, ry, f.yaw * D2R, 'YXZ');
  // on the 3D wall where it covers this pane: the sole on the relief (Nathan 2026-10-15)
  const n = new THREE.Vector3(g.n[0], g.n[1], -g.n[2]), climb = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const wall = onWall(S, T, new THREE.Vector3(g.x, y0, -g.depth), n, climb, climb.clone().cross(n).normalize(), Math.max(w, h));
  if (wall) {
    const [pw, nw] = wall, z = nw.clone().negate(); // the foot (local +z) toward the wall
    const up = climb.clone().addScaledVector(z, -climb.dot(z)).normalize(), right = up.clone().cross(z);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, z))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), f.yaw * D2R));
    m.position.copy(pw).addScaledVector(nw, PANE_GAP);
  }
  const b = snailBody(sp.art, w); b.rotation.x = -Math.PI / 2; m.add(b);
  m.updateMatrixWorld(true); // the shell hangs down the pane under its weight
  sagShell(b, new THREE.Vector3(0, -1, 0).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()));
  return [[m, w, h]];
}

export function disposeScene(sc: THREE.Object3D | undefined) {
  sc?.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.geometry?.userData.keep) m.geometry?.dispose();
    if (m.material) for (const mat of ([] as THREE.Material[]).concat(m.material)) if (!mat.userData.cached && !mat.userData.keep) mat.dispose();
  });
}
