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
