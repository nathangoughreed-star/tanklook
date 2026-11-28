// Invert lab (invert build method pilot, 2026-11-28; research/invert-model-method.md): renders one invert model in four
// orthographic views (side, 3/4, top, front) on one canvas, for the side-by-side review sheets. Dev server only:
//   /scripts/invert-lab/lab.html?m=<snail art | shrimp art | coral:<variant>>[&seed=N]
// scripts/invert-lab/shot.mjs drives it headless. window.__labDone = true once drawn.
import * as THREE from 'three';
import { snailBody } from '../../src/render/snail3d';
import { shrimpBody } from '../../src/render/shrimp3d';
import { reefShape } from '../../src/render/coral3d';
import { SNAILS } from '../../src/art/snails';
import { SHRIMP3D } from '../../src/art/shrimps';

const q = new URLSearchParams(location.search), m = q.get('m') ?? 'turbo', seed = +(q.get('seed') ?? 3);
/** ?m=tank (pilots) or ?m=tankold (the current models): one lab tank shot, true relative sizes in mm, sand, a back. */
function tank(old: boolean) {
  const W = 1200, H = 640, cv = document.getElementById('out') as HTMLCanvasElement; cv.width = W; cv.height = H;
  const rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); rd.setClearColor('#2c5a74');
  const sc = new THREE.Scene(); sc.fog = new THREE.Fog('#2c5a74', 260, 700);
  sc.add(new THREE.AmbientLight('#ffffff', 1.0)); const l = new THREE.DirectionalLight('#ffffff', 1.5); l.position.set(0.2, 1, 0.4); sc.add(l);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 500).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#d6cab0' })); sc.add(sand);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(900, 400), new THREE.MeshBasicMaterial({ color: '#3a7090' })); back.position.set(0, 200, -200); sc.add(back);
  const rock = new THREE.Mesh(reefShape('liverock', 5, 110).toNonIndexed(), new THREE.MeshLambertMaterial({ vertexColors: true })); rock.geometry.computeVertexNormals(); rock.position.set(60, 0, -120); sc.add(rock);
  const zg = reefShape(old ? 'zoanthid' : 'zoanthid-c', 3, 80); zg.computeVertexNormals();
  const zoa = new THREE.Mesh(zg, new THREE.MeshLambertMaterial({ vertexColors: true })); zoa.position.set(-90, 0, -20); sc.add(zoa);
  const sn = snailBody(old ? 'turbo' : 'trochus', 45); sn.position.set(10, 0, 30); sn.rotation.y = 0.5; sc.add(sn);
  const sh = shrimpBody(old ? 'cleanershrimp' : 'peppermint', 50); sh.position.set(95, 0.16 * 50, 40); sh.rotation.y = -0.4; sc.add(sh);
  const cam = new THREE.PerspectiveCamera(32, W / H, 1, 2000); cam.position.set(0, 120, 330); cam.lookAt(0, 25, 0);
  rd.render(sc, cam);
  (window as unknown as { __labDone: boolean }).__labDone = true;
}
if (m === 'tank' || m === 'tankold') { tank(m === 'tankold'); throw new Error('done'); }
const T = 420, out = document.getElementById('out') as HTMLCanvasElement;
const views: [string, THREE.Vector3][] = [['Side', new THREE.Vector3(0, 0, 1)], ['3/4', new THREE.Vector3(0.75, 0.45, 0.75)], ['Top', new THREE.Vector3(0, 1, 0.0001)], ['Front', new THREE.Vector3(1, 0.12, 0)]];
out.width = T * 4; out.height = T + 24;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(T, T); renderer.setClearColor('#bcd6e4');
const scene = new THREE.Scene();
let obj: THREE.Object3D;
if (m.startsWith('coral:')) {
  const g = reefShape(m.slice(6), seed, 120);
  if (!g.attributes.normal) g.computeVertexNormals();
  obj = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(new THREE.AmbientLight('#ffffff', 1.1), (() => { const l = new THREE.DirectionalLight('#ffffff', 1.6); l.position.set(0.3, 1, 0.5); return l; })());
} else if (m in SNAILS) obj = snailBody(m, 1);
else if (m in SHRIMP3D) obj = shrimpBody(m, 1);
else throw new Error('unknown model ' + m);
scene.add(obj);
const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), R = box.getSize(new THREE.Vector3()).length() / 2 * 1.05;
const cam = new THREE.OrthographicCamera(-R, R, R, -R, 0.001, R * 10);
const x = out.getContext('2d')!; x.fillStyle = '#1c2128'; x.fillRect(0, 0, out.width, out.height);
views.forEach(([name, d], i) => {
  cam.position.copy(c).addScaledVector(d.clone().normalize(), R * 4); cam.up.set(0, 1, 0); if (name === 'Top') cam.up.set(-1, 0, 0);
  cam.lookAt(c); cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  x.drawImage(renderer.domElement, i * T, 24);
  const nn = (window as unknown as { __zoaNN?: number }).__zoaNN; // zoanthid colonies: median polyp spacing / disc radius
  x.fillStyle = '#ddd'; x.font = '14px system-ui'; x.fillText(`${m} · ${name}${nn && i === 0 ? ` · spacing ${nn.toFixed(2)} rd` : ''}`, i * T + 8, 17);
});
(window as unknown as { __labDone: boolean }).__labDone = true;
