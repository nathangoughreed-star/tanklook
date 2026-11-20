// @ts-nocheck

// Scratch harness (fish-painter experiment 2026-11-19): draw the orchid dottyback in the app's 3D with
//   ?mode=current   the current plan and art
//   ?mode=cutout    the photo cutout (shots/ORCH-cutout-card.png, NOT in the repo) as the card, current plan geometry
//   ?mode=measured  the photo cutout as the card AND the measured body/fin numbers in the plan
// and write a 4-view sheet to shots/ORCH3D-<mode>.png through the dev server's /__shot.
import * as THREE from 'three';
import { speciesOf } from '/src/data/species.ts';
import { PLANS, profile } from '/src/art/fishgen.ts';
import { FISH_ART } from '/src/art/placeholder.ts';
import { speciesModel } from '/src/render/preview3d.ts';
import { OUTLINE } from '/src/render/fish3d.ts';
import { LU, applyLighting } from '/src/render/lighting.ts';
const q = new URLSearchParams(location.search), mode = q.get('mode') ?? 'current', ph = q.get('photo') ?? '', suf = ph;
const ID = q.get('sp') ?? 'orchiddottyback';   // ?sp=flameangel&card=<shots/ file>: any species (a JSON-migrated plan keeps its measured fin outlines unless ?clearfins=1)
const sp = speciesOf({ species: ID });
const P = PLANS[ID];
if (q.get('clearfins')) { delete P.fins; delete P.finGrid; }
document.title = 'aspect ' + sp.aspect;
if (mode !== 'current') {
  const img = new Image(); await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = '/shots/' + (q.get('card') ?? 'ORCH-cutout-card' + suf) + '.png'; }); document.title = 'img ok';
  FISH_ART[ID] = (ctx, _P, W) => ctx.drawImage(img, 0, 0, W, W * sp.aspect);
}
if (mode === 'measured') {
  const j = await (await fetch('/src/data/fishart/' + (q.get('anat') ?? ID + suf) + '.anatomy.json')).json(); const A = j.anatomy, d = A.depthProfile, F = A.fins;
  const pedU = 1 - 1 / A.tlOverSl, SLc = 1 - pedU, U = s => pedU + SLc * (1 - s / 100), Wd = x => x / 100 * SLc;
  const top = d.stations.map((s, i) => [U(s), -Wd(d.top[i])]), bot = d.stations.map((s, i) => [U(s), Wd(d.bottom[i])]);
  Object.assign(P, { pedU, outline: [...top, ...bot.reverse()] });
  if (A.thickness?.fit) { P.thick = A.thickness.fit.thick; P.pedT = A.thickness.fit.pedT; } // top-view widths (sheet photos)
  P.tail = { ...P.tail, h: Wd(Math.max(...F.caudal.outline.map(c => (c[1] + c[2]) / 2))) };
  if (q.get('fins') !== '0') {
  P.dorsal = { ...P.dorsal, at: U(F.dorsal.baseStartPctSL), len: Wd(F.dorsal.baseEndPctSL - F.dorsal.baseStartPctSL), h: Wd(F.dorsal.maxHeightPctSL) };
  P.anal = { ...P.anal, at: U(F.anal.baseStartPctSL), len: Wd(F.anal.baseEndPctSL - F.anal.baseStartPctSL), h: Wd(F.anal.maxHeightPctSL), rake: 0.85 };
  }
}
document.title += ' plan ok'; // photo cards already carry the fish's own eye and paired fins: drop the plan's 3D pectoral/pelvic leaves (?paired=keep keeps them),
// and either hide the 3D eye (default) or seat it on the photo's eye (?eye=place&ex=px&ey=px&er=px, sheet pixels, SL in sheet px = esl, axis y = eaxis)
if (mode === 'measured' && q.get('paired') === 'photo') {
  // 3D pectoral and pelvic rooted where the sheet's side view roots them (sheet px: snout 1275, axis 207, SL 896; pectoral root 1010,233; pelvic root 1005,295, 120 px long)
  const sl = 896, SLc = 1 - P.pedU, pu = 1 - (1275 - 1010) / sl * SLc, [pt, pb] = profile(P)(pu), pv = (26 / sl * SLc - pt) / (pb - pt);
  P.pectoral = true; P.pec = { u: pu, v: pv, s: +(q.get('pecs') ?? 1), tint: '#b848c8', ...(q.get('pecspread') ? { spread: +q.get('pecspread') } : {}) };
  P.pelvic = { u: 1 - (1275 - 1005) / sl * SLc, len: 120 / sl * SLc, tint: '#c050e0' };
} else if (mode === 'measured' && q.get('paired') !== 'keep') { P.pectoral = false; delete P.pelvic; }
if (mode !== 'current' && q.get('thickx')) P.thick *= +q.get('thickx');   // sheet views disagree (front panel thicker than the top view): scale the fitted thickness
if (mode !== 'current') { if (q.get('wide')) P.wide = +q.get('wide'); if (q.get('bulge')) P.eye = { ...P.eye, bulge: +q.get('bulge') }; if (q.get('belly')) P.belly = +q.get('belly'); }
if (mode !== 'current') {
  if (q.get('eye') === 'place') {
    const sl = +q.get('esl'), U1 = 1, SLc = 1 - P.pedU, u = U1 - (+q.get('sx') - +q.get('ex')) / sl * SLc, v = (+q.get('eaxis') - +q.get('ey')) / sl * -1 * SLc;
    const [et, eb] = profile(P)(u);
    P.eye = { ...P.eye, u, dv: (v - et) / (eb - et) - 0.38, r: +q.get('er') / sl * SLc, iris: ['#c8902a', '#0a0206'] };
  } else P.eye = { ...P.eye, r: 0.0001 };
}
document.title += ' fixes ok'; const W = 560, H = 350;
const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
gl.setPixelRatio(1); gl.setSize(W, H, false); gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor(0x2c4a52, 1);
OUTLINE.uPop.value = 0; OUTLINE.uVpH.value = H;
const camera = new THREE.PerspectiveCamera(28, W / H, 0.01, 5000);
document.title += ' gl ok'; const scene = new THREE.Scene(), model = speciesModel(sp); document.title += ' model ok'; scene.add(model); applyLighting(scene); LU.uMode.value = 0; LU.uWater.value.w = 0;
const VIEWS = [['Side', 0, 0], ['3/4', 0.55, 0.18], ['Front', Math.PI / 2, 0.05], ['Top', 0, 1.45]];
function shoot(yaw, pitch) {
  const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), cp = Math.cos(pitch);
  const dir = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
  camera.position.copy(c).addScaledVector(dir, 1); camera.lookAt(c); camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const tv = Math.tan(14 * Math.PI / 180), th = tv * camera.aspect; let d = 0;
  for (let i = 0; i < 8; i++) { const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c); d = Math.max(d, p.dot(dir) + Math.max(Math.abs(p.dot(right)) / th, Math.abs(p.dot(up)) / tv)); }
  d *= 1.08; camera.position.copy(c).addScaledVector(dir, d); camera.near = d / 100; camera.far = d * 10; camera.lookAt(c); camera.updateProjectionMatrix();
  gl.render(scene, camera); const o = document.createElement('canvas'); o.width = W; o.height = H; o.getContext('2d').drawImage(gl.domElement, 0, 0); return o;
}
const sheet = document.createElement('canvas'); sheet.width = W * 2; sheet.height = H * 2 + 0; const x = sheet.getContext('2d'); x.font = '16px sans-serif'; x.fillStyle = '#fff';
VIEWS.forEach(([l, y, p], i) => { x.drawImage(shoot(y, p), (i % 2) * W, Math.floor(i / 2) * H); x.fillText(`${mode} | ${l}`, (i % 2) * W + 8, Math.floor(i / 2) * H + 20); });
await new Promise(r => sheet.toBlob(async b => { await fetch('/__shot?name=' + (ID === 'orchiddottyback' ? 'ORCH3D' : ID + '3D') + suf + '-' + mode + (q.get('fins') === '0' ? '-nofins' : '') + (q.get('eye') === 'place' ? '-eye' : '') + (q.get('paired') ? '-p' + q.get('paired') : '') + (q.get('pecs') ? '-s' + Math.round(+q.get('pecs') * 100) : '') + (q.get('wide') ? '-w' + Math.round(+q.get('wide') * 100) : '') + (q.get('thickx') ? '-t' + Math.round(+q.get('thickx') * 100) : ''), { method: 'POST', body: b }); r(); }, 'image/png'));
document.getElementById('s').textContent = 'done ' + mode; document.title = 'done ' + mode;
