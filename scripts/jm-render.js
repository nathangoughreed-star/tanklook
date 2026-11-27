// R182 lane JM: review renders and the 3D-viewer GLB of a plant, run in the dev server page (dev-alt, port 5183).
//   const J = await import('/scripts/jm-render.js');
//   await J.views('jm-alone', { type: 'moss', h: 40, seed: 3 });   // shots/jm-alone.png: side, 3/4 and top on sand
//   await J.glb('jm-alone-glb', { type: 'moss', h: 40, seed: 3 }); // shots/jm-alone-glb.png (it is the GLB)
import * as THREE from '/node_modules/.vite/deps/three.js';
import { GLTFExporter } from '/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { plantGeometry, revealPlant } from '/src/render/plant3d.ts';
import { PLANT3D, growthOf } from '/src/art/plants.ts';
import { ownAtlas, plantAtlas } from '/src/render/plantAtlas.ts';

const texOf = async type => {
  const own = PLANT3D[type]?.ownTex, t = own ? ownAtlas(own) : plantAtlas();
  for (let i = 0; i < 40 && !(t.image && t.image.width > 1); i++) await new Promise(r => setTimeout(r, 100));
  return t;
};

export async function mesh({ type = 'moss', h = 40, seed = 3, g } = {}) {
  const src = revealPlant(plantGeometry(type, seed, h), g ?? growthOf(type, h));
  const geo = new THREE.BufferGeometry();
  for (const k of ['position', 'color', 'uv']) geo.setAttribute(k, src.attributes[k]);
  geo.setIndex(src.index);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, map: await texOf(type), alphaTest: 0.5, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

async function post(name, blob) { await fetch('/__shot?name=' + name, { method: 'POST', body: blob }); }

/** Side, three-quarter and top views on sand under tank-water blue, one PNG. */
export async function views(name, o = {}, list = [[0, 0.2], [0.8, 0.75], [0.4, 1.45]]) {
  const m = await mesh(o), W = 520, H = 400, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.width = W * list.length; cv.height = H;
  const ren = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  ren.setSize(W, H); ren.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1c3346');
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b9a888' }));
  sand.position.y = -0.5; scene.add(sand, m);
  m.geometry.computeBoundingBox();
  const bb = m.geometry.boundingBox, c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, W / H, 1, 8000);
  list.forEach(([az, el], i) => {
    const d = Math.max(sz.x, sz.z) * 2.2;
    cam.position.set(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d); cam.lookAt(c);
    ren.render(scene, cam); ctx.drawImage(ren.domElement, i * W, 0);
  });
  ren.dispose();
  await post(name, await new Promise(r => cv.toBlob(r, 'image/png')));
  return { size_mm: [sz.x, sz.y, sz.z].map(v => Math.round(v)), tris: m.geometry.index.count / 3 };
}

/** The plant as a GLB (texture embedded), for the spin viewer artifact. */
export async function glb(name, o = {}) {
  const m = await mesh(o);
  const img = m.material.map.image, cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.flipY = m.material.map.flipY;
  m.material = new THREE.MeshStandardMaterial({ vertexColors: true, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
  const buf = await new GLTFExporter().parseAsync(m, { binary: true });
  await post(name, new Blob([buf]));
  return { bytes: buf.byteLength };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
/** A small tank with one stone or wood piece and java moss tied onto it (step 4), as the app draws it:
 *  await J.tank('jm-rock', { host: ['seiryu', 5, 160], moss: [[3, 40, 0, 0]], cam: { az: 20, el: 25, zoom: 1.6 } })
 *  host = [variant, seed, size]; moss = [[seed, size, dx, dd], ...] (dx/dd: where on the piece, from its middle). */
export async function tank(name, { L = 400, H = 260, D = 260, host, moss, cam = { az: 15, el: 22, zoom: 1.5 }, growth } = {}) {
  const Sc = await import('/src/scene/defaults.ts'), It = await import('/src/scene/items.ts'), { store, viewer } = window.__gb;
  viewer.sway = false;
  const S = Sc.bareSetup();
  S.tank = { L, H, D };
  S.render.bg = 'blue'; S.render.grid = false; S.render.rim = false; S.substrate.show = true; S.water.level = 1; S.equipment = [];
  const h0 = It.makeItem(S.tank, host[0], 1, host[1], L / 2, D / 2, { size: host[2], yaw: host[3] ?? 0 });
  S.items = [h0];
  let seedR = 7; const rnd = () => ((seedR = (seedR * 16807) % 2147483647) / 2147483647);
  moss.forEach(([seed, size, dx, dd], i) => {
    const p = It.perch(S, h0.x + dx, h0.depth + dd, rnd) ?? { x: h0.x + dx, depth: h0.depth + dd, lift: 0 };
    S.items.push(It.makeItem(S.tank, 'moss', i + 2, seed, p.x, p.depth, { size, lift: p.lift, ...(growth != null ? { growth } : {}) }));
  });
  store.edit(t => { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, structuredClone(S)); });
  store.cam(c => { c.az = cam.az; c.el = cam.el; c.zoom = cam.zoom; });
  store.select(null);
  await wait(1500); viewer.rebuild?.(); await wait(2500); await viewer.buildNow?.(); await wait(2000);
  await post(name, await viewer.exportPNG(1));
  return S.items.slice(1).map(it => ({ x: Math.round(it.x), d: Math.round(it.depth), lift: it.lift }));
}
