// Model review sheet (review.html, Nathan 2026-10-14): every species look from four fixed angles, in the preview tile's
// flat light and in the tank's default lamps + water, with its model version. A version is a fingerprint of what the
// model is made of (geometry + texture thumbnails + colours); when it no longer matches model-versions.json the row says
// "changed", and on the dev server "Record" bumps those models' versions and writes the file (commit it with the change).
import * as THREE from 'three';
import { CATEGORIES, SPECIES, type Species } from '../data/species';
import { speciesModel } from '../render/preview3d';
import { OUTLINE } from '../render/fish3d';
import { LU, applyLighting, setLightUniforms, setWaterUniforms } from '../render/lighting';
import { defaultSetup } from '../scene/defaults';
import manifest from '../data/model-versions.json';

interface Rec { v: number; hash: string; build: number; date: string }
const RECORDED = (manifest as { models: Record<string, Rec> }).models;
const $ = (id: string) => document.getElementById(id)!;
const FOV = 28, W = 400, H = 250;
const VIEWS: [label: string, yaw: number, pitch: number][] = [['Side', 0, 0], ['3/4', 0.55, 0.18], ['Front', Math.PI / 2, 0.05], ['Top', 0, 1.45]];
const LIGHTS = [['flat', 'Preview light'], ['tank', 'Tank light']] as const;

// every look: the species, and the female of a dimorphic one
const LOOKS: Species[] = SPECIES.flatMap(s => s.female ? [s, s.female] : [s]);
const title = (sp: Species) => sp.name + (sp.sex === 'f' ? ' ♀' : sp.female ? ' ♂' : '');

// ---- fingerprint ----
function fnv(h: number, n: number) { h ^= n; return Math.imul(h, 16777619) >>> 0; }
const thumb = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
function fingerprint(sp: Species, model: THREE.Object3D) {
  let h = 2166136261;
  for (const ch of `${sp.art}|${sp.tl}|${sp.aspect.toFixed(4)}`) h = fnv(h, ch.charCodeAt(0));
  model.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // positions on a 1/500-of-length grid: real edits show, float noise between machines does not
    const pos = m.geometry.attributes.position.array;
    h = fnv(h, pos.length);
    for (let i = 0; i < pos.length; i++) h = fnv(h, Math.round(pos[i] * 500));
    const idx = m.geometry.index?.array;
    if (idx) for (let i = 0; i < idx.length; i += 7) h = fnv(h, idx[i]);
    for (const mat of ([] as THREE.Material[]).concat(m.material)) {
      const c = (mat as THREE.MeshBasicMaterial).color; if (c) h = fnv(h, c.getHex());
      const img = (mat as THREE.MeshBasicMaterial).map?.image as CanvasImageSource & { width: number; height: number } | undefined;
      if (img?.width) {
        // a 24 px wide thumbnail at 3 bits a channel: a repaint shows, resampling differences do not
        const tw = 24, th = Math.max(1, Math.round(24 * img.height / img.width));
        thumb.canvas.width = tw; thumb.canvas.height = th; thumb.clearRect(0, 0, tw, th); thumb.drawImage(img, 0, 0, tw, th);
        const d = thumb.getImageData(0, 0, tw, th).data;
        for (let i = 0; i < d.length; i++) h = fnv(h, d[i] >> 5);
      }
    }
  });
  return h.toString(16).padStart(8, '0');
}

// ---- rendering ----
// no WebGL (some cloud browsers): the page says so and points at the pre-rendered sheets (model-sheets/)
let gl: THREE.WebGLRenderer | null = null;
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { gl = null; }
const renderer = gl!;
if (gl) { gl.setPixelRatio(1); gl.setSize(W, H, false); gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor(0x000000, 0); }
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 5000);
const setup = defaultSetup(), T = setup.tank;
const tankLight = { ...setup.light, type: 'led' as const };
OUTLINE.uPop.value = 0; OUTLINE.uVpH.value = H;

function shoot(scene: THREE.Scene, model: THREE.Object3D, yaw: number, pitch: number) {
  // fit this view's own outline: the distance at which every corner of the bounding box is inside the frame
  const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), cp = Math.cos(pitch);
  const dir = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
  camera.position.copy(c).addScaledVector(dir, 1); camera.lookAt(c); camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const tv = Math.tan((FOV / 2) * THREE.MathUtils.DEG2RAD), th = tv * camera.aspect;
  let d = 0;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
    d = Math.max(d, p.dot(dir) + Math.max(Math.abs(p.dot(right)) / th, Math.abs(p.dot(up)) / tv));
  }
  d *= 1.08;
  camera.position.copy(c).addScaledVector(dir, d);
  camera.near = d / 100; camera.far = d * 10;
  camera.lookAt(c); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  out.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
  return out;
}

/** The look's views in both lights, and its fingerprint. */
function renderLook(sp: Species) {
  const scene = new THREE.Scene(), model = speciesModel(sp);
  const hash = fingerprint(sp, model);
  scene.add(model); applyLighting(scene);
  const out: Record<string, HTMLCanvasElement[]> = {};
  LU.uMode.value = 0; LU.uWater.value.w = 0;
  out.flat = VIEWS.map(([, y, p]) => shoot(scene, model, y, p));
  // the tank: true size in the middle of the default tank, under its lamps (LED bar) and water
  model.scale.setScalar(sp.tl); model.position.set(T.L / 2, T.H / 2, -T.D / 2);
  setLightUniforms(T, tankLight); setWaterUniforms(T, setup.water);
  out.tank = VIEWS.map(([, y, p]) => shoot(scene, model, y, p));
  model.traverse(o => { const g = (o as THREE.Mesh).geometry; if (g && !g.userData.keep) g.dispose(); });
  return { hash, out };
}

// ---- flags (this browser only) ----
const FLAG_KEY = 'tanklook-review-flags';
let flags: Record<string, string> = {};
try { flags = JSON.parse(localStorage.getItem(FLAG_KEY) ?? '{}') ?? {}; } catch { flags = {}; }
const saveFlags = () => { try { localStorage.setItem(FLAG_KEY, JSON.stringify(flags)); } catch { /* private window */ } };

// ---- page ----
const build = Number(__BUILD__.n) || 0;
const hashes = new Map<string, string>();
const rows = new Map<string, HTMLElement>();
$('meta').textContent = `Build ${__BUILD__.n} · ${__BUILD__.date} · ${LOOKS.length} models (${SPECIES.length} species)`;

function verText(sp: Species) {
  const r = RECORDED[sp.look], h = hashes.get(sp.look);
  if (!h) return { t: r ? `v${r.v}` : '', changed: false };
  if (!r) return { t: 'new · not recorded', changed: true };
  if (r.hash !== h) return { t: `v${r.v} (build ${r.build}) · changed since`, changed: true };
  return { t: `v${r.v} · since build ${r.build}, ${r.date}`, changed: false };
}

function row(sp: Species) {
  const el = document.createElement('section'); el.className = 'sp'; el.dataset.look = sp.look;
  el.dataset.text = `${sp.name} ${sp.sci} ${sp.id} ${sp.art}`.toLowerCase();
  const top = document.createElement('div'); top.className = 'top';
  const name = document.createElement('span'); name.className = 'name'; name.textContent = title(sp);
  const sci = document.createElement('span'); sci.className = 'hint'; sci.textContent = `${sp.sci} · ${sp.look} · ${sp.tl} mm`;
  const ver = document.createElement('span'); ver.className = 'ver';
  const lab = document.createElement('label'), box = document.createElement('input'); box.type = 'checkbox';
  lab.append(box, ' Needs work');
  top.append(name, sci, ver, lab);
  const note = document.createElement('input'); note.className = 'note'; note.placeholder = 'What needs fixing?';
  const views = document.createElement('div'); views.className = 'views';
  views.append(Object.assign(document.createElement('span'), { className: 'head' }), ...VIEWS.map(([l]) => Object.assign(document.createElement('span'), { className: 'head', textContent: l })));
  el.append(top, views);
  const sync = () => { const f = sp.look in flags; box.checked = f; el.classList.toggle('flag', f); note.hidden = !f; note.value = flags[sp.look] ?? ''; };
  box.onchange = () => { if (box.checked) flags[sp.look] = note.value; else delete flags[sp.look]; saveFlags(); sync(); applyFilter(); };
  note.oninput = () => { flags[sp.look] = note.value; saveFlags(); };
  el.append(note); sync();
  rows.set(sp.look, el);
  return el;
}

function fill(sp: Species, out: Record<string, HTMLCanvasElement[]>) {
  const views = rows.get(sp.look)!.querySelector('.views')!;
  for (const [k, l] of LIGHTS) {
    const lab = document.createElement('span'); lab.className = `lab ${k}`; lab.textContent = l;
    const cells = out[k].map((c, i) => { const w = document.createElement('div'); w.className = k; c.title = `${title(sp)}: ${VIEWS[i][0]}, ${l}`; w.append(c); return w; });
    views.append(lab, ...cells);
  }
  const v = verText(sp), ver = rows.get(sp.look)!.querySelector('.ver')!;
  ver.textContent = v.t; ver.classList.toggle('changed', v.changed);
}

const list = $('list');
for (const [cat, label] of CATEGORIES) {
  const looks = LOOKS.filter(s => s.cat === cat);
  if (!looks.length) continue;
  const h = document.createElement('h2'); h.textContent = label; h.dataset.cat = cat;
  list.append(h, ...looks.map(row));
}

const changed = () => LOOKS.filter(s => { const h = hashes.get(s.look); return h && RECORDED[s.look]?.hash !== h; });
function applyFilter() {
  const q = ($('filter') as HTMLInputElement).value.trim().toLowerCase();
  const onlyFlag = ($('onlyFlag') as HTMLInputElement).checked, onlyChanged = ($('onlyChanged') as HTMLInputElement).checked;
  const ch = new Set(changed().map(s => s.look));
  for (const [look, el] of rows) el.hidden = (!!q && !el.dataset.text!.includes(q)) || (onlyFlag && !(look in flags)) || (onlyChanged && !ch.has(look));
  for (const h of list.querySelectorAll('h2')) {
    const any = LOOKS.some(s => s.cat === (h as HTMLElement).dataset.cat && !rows.get(s.look)!.hidden);
    (h as HTMLElement).hidden = !any;
  }
}
$('filter').oninput = applyFilter; $('onlyFlag').onchange = applyFilter; $('onlyChanged').onchange = applyFilter;
document.body.dataset.light = 'both';
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-light]')) b.onclick = () => {
  document.body.dataset.light = b.dataset.light!;
  for (const o of document.querySelectorAll('[data-light]')) o.classList.toggle('on', o === b);
};

$('copy').onclick = async () => {
  const lines = LOOKS.filter(s => s.look in flags).map(s => `- ${title(s)} (${s.look}, ${RECORDED[s.look] ? 'v' + RECORDED[s.look].v : 'unrecorded'}): ${flags[s.look] || '(no note)'}`);
  const text = lines.length ? `Models to touch up (review sheet, build ${__BUILD__.n}):\n${lines.join('\n')}` : '';
  try { await navigator.clipboard.writeText(text); $('status').textContent = lines.length ? `Copied ${lines.length} flagged models.` : 'Nothing flagged yet.'; }
  catch { $('status').textContent = 'Copy was blocked by the browser.'; }
};

// ---- pre-rendered sheets (public/model-sheets/): one labelled JPEG per look + a static gallery, for reviewers whose
// browser has no WebGL. Written on the dev server with the versions, so they stay in step with them.
const outs = new Map<string, Record<string, HTMLCanvasElement[]>>();
const sheetName = (sp: Species) => sp.look.replace('~', '-');
const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const LAB = 110, HEAD = 34, COL = 22;
function sheet(sp: Species, r: Rec) {
  const out = outs.get(sp.look)!, c = document.createElement('canvas');
  c.width = LAB + VIEWS.length * W; c.height = HEAD + COL + LIGHTS.length * H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#1d2129'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#e6e9ef'; x.font = 'bold 17px system-ui, sans-serif'; x.textBaseline = 'middle';
  x.fillText(`${title(sp)}  ·  ${sp.sci}  ·  ${sp.look}  ·  ${sp.tl} mm  ·  model v${r.v}, build ${r.build}`, 10, HEAD / 2);
  x.font = '13px system-ui, sans-serif'; x.fillStyle = '#9aa3b2'; x.textAlign = 'center';
  VIEWS.forEach(([l], i) => x.fillText(l, LAB + i * W + W / 2, HEAD + COL / 2));
  LIGHTS.forEach(([k, l], j) => {
    const y = HEAD + COL + j * H;
    x.textAlign = 'left'; x.fillStyle = '#9aa3b2'; x.fillText(l, 10, y + H / 2);
    out[k].forEach((v, i) => {
      // solid backgrounds (a gradient triples the PNG size)
      x.fillStyle = k === 'flat' ? '#bcd6e4' : '#17282f'; x.fillRect(LAB + i * W + 2, y + 2, W - 4, H - 4);
      x.drawImage(v, LAB + i * W, y);
    });
  });
  return c;
}
function gallery(models: Record<string, Rec>) {
  const sw = LAB + VIEWS.length * W, sh = HEAD + COL + LIGHTS.length * H, views = VIEWS.map(v => v[0]).join(', ');
  const parts = CATEGORIES.map(([cat, label]) => {
    const looks = LOOKS.filter(s => s.cat === cat);
    if (!looks.length) return '';
    return `<h2>${esc(label)}</h2>\n` + looks.map(s => {
      const r = models[s.look] ?? { v: 0, build: 0, date: 'unrecorded' }, f = sheetName(s);
      return `<figure id="${f}"><figcaption><b>${esc(title(s))}</b> · <i>${esc(s.sci)}</i> · ${esc(s.look)} · ${s.tl} mm · model v${r.v} (build ${r.build}, ${r.date})</figcaption>` +
        `<a href="${f}.jpg"><img src="${f}.jpg" width="${sw}" height="${sh}" loading="lazy" alt="${esc(title(s))} (${esc(s.sci)}), model v${r.v}: ${views} views, preview light (top row) and tank light (bottom row)"></a></figure>`;
    }).join('\n');
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Model sheets · TankLook</title>
<style>
:root { --bg: #eef0f3; --panel: #fff; --ink: #1d2330; --muted: #5d6676; color-scheme: light }
@media (prefers-color-scheme: dark) { :root { --bg: #15181e; --panel: #1d2129; --ink: #e6e9ef; --muted: #9aa3b2; color-scheme: dark } }
body { margin: 0; padding: 12px 16px 40px; background: var(--bg); color: var(--ink); font: 14px/1.4 system-ui, sans-serif }
h1 { font-size: 18px; margin: 0 0 4px } h2 { font-size: 15px; color: var(--muted); margin: 20px 0 6px }
figure { margin: 8px 0 14px; padding: 8px; background: var(--panel); border-radius: 6px } figcaption { margin-bottom: 6px }
img { display: block; max-width: 100%; height: auto }
</style></head><body>
<h1>Model sheets</h1>
<p>Pre-rendered review images of every TankLook animal model (no WebGL needed): ${LOOKS.length} models, ${SPECIES.length} species, written at build ${build + 1}.
Each sheet shows the ${views} views; top row in the plain preview light, bottom row at true size in the default tank's LED light and water.
Click a sheet for the full-size image (${sw} × ${sh} px). Interactive version: <a href="../review.html">review.html</a>.</p>
${parts}
</body></html>
`;
}
async function post(file: string, body: Blob | string) { return (await fetch(`/__model-sheets?file=${file}`, { method: 'POST', body })).ok; }
// JPEG at 0.9: 4.7 MB for the set against 18 MB as PNG, no visible loss at review size
const jpg = (c: HTMLCanvasElement) => new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/jpeg', 0.9));

// dev server only: bump the changed models' versions, write their sheets and the gallery, then the versions file
// (written last: it reloads the page)
const record = $('record') as HTMLButtonElement, exportAll = $('exportAll') as HTMLButtonElement;
async function save(looks: Species[], bump: boolean) {
  const today = new Date().toISOString().slice(0, 10), models: Record<string, Rec> = { ...RECORDED };
  if (bump) for (const s of looks) models[s.look] = { v: (RECORDED[s.look]?.v ?? 0) + 1, hash: hashes.get(s.look)!, build: build + 1, date: today };
  let ok = true;
  const none: Rec = { v: 0, hash: '', build, date: '' };
  for (const s of looks) { $('status').textContent = `Writing sheet ${s.look}…`; ok = await post(sheetName(s) + '.jpg', await jpg(sheet(s, models[s.look] ?? none))) && ok; }
  ok = await post('index.html', gallery(models)) && ok;
  if (bump) ok = (await fetch('/__model-versions', { method: 'POST', body: JSON.stringify(models) })).ok && ok;
  $('status').textContent = ok ? 'Saved. Commit src/data/model-versions.json and public/model-sheets/ with the model change.' : 'Saving failed.';
}
record.onclick = () => save(changed(), true);
// every sheet again (first export, or after a change to the sheet layout); shown when every look is recorded
exportAll.onclick = () => save(LOOKS, false);

function summary() {
  const n = changed().length, done = hashes.size === LOOKS.length;
  record.hidden = !(import.meta.env.DEV && done && n);
  exportAll.hidden = !(import.meta.env.DEV && done && !n);
  record.textContent = `Record ${n} changed model${n === 1 ? '' : 's'} (as build ${build + 1})`;
  $('status').textContent = !done ? `Rendering ${hashes.size} / ${LOOKS.length}…`
    : n ? `${n} model${n === 1 ? '' : 's'} changed since last recorded${import.meta.env.DEV ? '' : ' (recorded from the dev server)'}.` : 'All models match their recorded versions.';
}

// render a few looks per tick so the page stays responsive (a timer, not rAF: rAF pauses in a hidden tab)
let next = 0;
function step() {
  const t0 = performance.now();
  while (next < LOOKS.length && performance.now() - t0 < 30) {
    const sp = LOOKS[next++], { hash, out } = renderLook(sp);
    hashes.set(sp.look, hash); outs.set(sp.look, out); fill(sp, out);
  }
  summary();
  if (next < LOOKS.length) setTimeout(step, 0);
  else {
    applyFilter();
    // `npm run sheets` (scripts/export-sheets.mjs) opens ?export in a headless browser: write every sheet, no versions
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('export')) save(LOOKS, false);
  }
}
if (gl) setTimeout(step, 0);
else {
  $('status').innerHTML = 'This browser cannot draw 3D (WebGL is off), so the models cannot be drawn here. <a href="model-sheets/">Open the pre-rendered model sheets</a>: images of every model, same views and lights.';
  list.hidden = true;
}
