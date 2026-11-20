// @ts-nocheck
// E5 harness: ?ids=e5oscara,e5oscarb,e5oscarc&name=oscar -> one picture (3/4 view on top, side view below, one column per id) to /__shot.
import * as THREE from 'three';
import { speciesOf } from '/src/data/species.ts';
import { speciesModel } from '/src/render/preview3d.ts';
import { OUTLINE } from '/src/render/fish3d.ts';
import { LU, applyLighting } from '/src/render/lighting.ts';
await import('/src/art/photofish.ts'); if (new URLSearchParams(location.search).get('pa')) await import('/src/art/photoart.ts');
const { PROJ_ART } = await import('/src/art/projart.ts'), { PLANS } = await import('/src/art/fishgen.ts');
const Q0 = new URLSearchParams(location.search);
for (const id of (Q0.get('ids') ?? '').split(',')) { for (const k of (Q0.get('del') ?? '').split(',').filter(Boolean)) if (PLANS[id]) delete PLANS[id][k]; if (Q0.get('noproj')) delete PROJ_ART[id]; if (Q0.get('nodorsal') && PLANS[id]) { delete PLANS[id].dorsal; delete PLANS[id].dorsal2; } if (Q0.get('noanal') && PLANS[id]) delete PLANS[id].anal; if (Q0.get('nofins') && PLANS[id]) { delete PLANS[id].fins; } }
const q = new URLSearchParams(location.search), ids = (q.get('ids') ?? '').split(','), W = 520, H = 340;
const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
gl.setPixelRatio(1); gl.setSize(W, H, false); gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor(0x2c4a52, 1);
OUTLINE.uPop.value = 0; OUTLINE.uVpH.value = H;
const camera = new THREE.PerspectiveCamera(28, W / H, 0.01, 5000);
const sheet = document.createElement('canvas'); sheet.width = W * ids.length; sheet.height = H * 2; const x = sheet.getContext('2d'); x.font = '18px sans-serif'; x.fillStyle = '#fff';
ids.forEach((id, i) => {
  const scene = new THREE.Scene(), model = speciesModel(speciesOf({ species: id })); scene.add(model); window.__m = model; { const ms0 = []; model.traverse(o => { if (o.isMesh) ms0.push(o); }); if (Q0.get('nocard')) ms0[0].material = new THREE.MeshBasicMaterial({ visible: false }); if (Q0.get('plain')) ms0[1].material = new THREE.MeshNormalMaterial(); } { const hide = (Q0.get('hide') ?? '').split(',').filter(Boolean).map(Number); let k = 0; model.traverse(o => { if (o.isMesh) { if (hide.includes(k)) o.visible = false; k++; } }); } applyLighting(scene); LU.uMode.value = 0; LU.uWater.value.w = 0;
  [[0.55, 0.18], Q0.get('front') ? [Math.PI / 2, 0.05] : [0, 0]].forEach(([yaw, pitch], r) => {
    const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), cp = Math.cos(pitch);
    const dir = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    camera.position.copy(c).addScaledVector(dir, 1); camera.lookAt(c); camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const tv = Math.tan(14 * Math.PI / 180), th = tv * camera.aspect; let d = 0;
    for (let k = 0; k < 8; k++) { const p = new THREE.Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).sub(c); d = Math.max(d, p.dot(dir) + Math.max(Math.abs(p.dot(right)) / th, Math.abs(p.dot(up)) / tv)); }
    d *= 1.08; camera.position.copy(c).addScaledVector(dir, d); camera.near = d / 100; camera.far = d * 10; camera.lookAt(c); camera.updateProjectionMatrix();
    gl.render(scene, camera); x.drawImage(gl.domElement, i * W, r * H);
    x.fillText(({ a: '(a) Claude read grid', b: '(b) Nathan clicks', c: '(c) automatic' })[id.slice(-1)] ?? id, i * W + 8, r * H + 22);
  });
});
await new Promise(r => sheet.toBlob(async b => { await fetch('/__shot?name=e5-' + (q.get('name') ?? 'fish'), { method: 'POST', body: b }); r(0); }, 'image/png'));
document.getElementById('s').textContent = 'done'; document.title = 'done';
