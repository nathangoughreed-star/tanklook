// Sidebar wiring. Inputs write through store.update(); one sync() pulls every control back from the scene,
// so undo/redo, file open and pointer drags all refresh the panels the same way.
import { SUBSTRATES } from '../art/placeholder';
import { fishTL, getSpecies, restsOnFloor, searchSpecies, type Species } from '../data/species';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { LAYOUTS } from '../render/layouts';
import type { Viewer } from '../render/viewer';
import { defaultScene, TANK_PRESETS } from '../scene/defaults';
import {
  IN, clamp, clampFish, fmtDims, fmtLen, fromUnit, glassThickness, rescaleTankA, spawnSnail, toUnit, volume, waterY,
} from '../scene/physics';
import type { Store } from '../scene/store';
import { SWAMP_LEVEL, groundHeight } from '../scene/terrain';
import { setWaterLevel } from '../scene/water';
import type { Fish, LayoutId, Scene, Tank } from '../scene/types';
import { GLASS_CHOICES, LIMITS, SceneError, nextFishId, parseScene } from '../scene/validate';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function attachPanels(store: Store, viewer: Viewer) {
  const S = () => store.scene;
  const fmt = (mm: number) => fmtLen(mm, S().units);
  const sel = () => store.selected;
  /** Mutate the selected fish (undoable, coalesced per control). */
  const editSel = (fn: (f: Fish, s: Scene) => void, coalesce?: string) => {
    if (!store.selected) return;
    store.update(s => { const f = s.fish.find(f => f.id === store.selId); if (f) fn(f, s); }, { coalesce });
  };

  // ---------- Status line ----------
  let statusTimer = 0;
  function status(msg: string, bad = false) {
    const el = $<HTMLDivElement>('status');
    el.textContent = msg; el.hidden = false; el.classList.toggle('bad', bad);
    clearTimeout(statusTimer); statusTimer = window.setTimeout(() => { el.hidden = true; }, bad ? 9000 : 4000);
  }

  // ---------- File: new / open / save / name / undo ----------
  $('undo').onclick = () => store.undo();
  $('redo').onclick = () => store.redo();
  $('newScene').onclick = () => {
    const s = defaultScene(); s.fish = []; s.name = 'New tank';
    s.camera = { ...S().camera }; s.units = S().units;
    store.replace(s); status('New tank. Undo brings the previous one back.');
  };
  $('openScene').onclick = () => $('fileIn').click();
  $('fileIn').onchange = async () => {
    const input = $('fileIn'), file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (file.size > 5e6) { status('That file is too large to be a scene (over 5 MB).', true); return; }
    try {
      const { scene, warnings } = parseScene(await file.text());
      store.replace(scene);
      status(`Opened "${scene.name}".` + (warnings.length ? ' ' + warnings.join(' ') : ''), warnings.length > 0);
    } catch (e) {
      status(e instanceof SceneError ? e.message : 'Could not open that file.', true);
    }
  };
  $('saveScene').onclick = () => {
    const blob = new Blob([JSON.stringify(S(), null, 1)], { type: 'application/json' });
    download(blob, `${slug(S().name)}.tanklook.json`);
  };
  $('sceneName').onchange = () => {
    const v = $('sceneName').value.trim().slice(0, 80) || 'My tank';
    store.update(s => { s.name = v; });
  };

  // ---------- Tank ----------
  const presetOptions = '<option value="">Presets…</option>' + TANK_PRESETS.map((p, i) => `<option value="${i}">${esc(p[0])}</option>`).join('');
  for (const [id, key] of [['presetA', 'tankA'], ['presetB', 'tankB']] as const) {
    const s = $<HTMLSelectElement>(id); s.innerHTML = presetOptions;
    s.onchange = () => {
      if (s.value === '') return;
      const p = TANK_PRESETS[+s.value]; s.value = '';
      setTank(key, { L: p[1] * IN, H: p[2] * IN, D: p[3] * IN });
    };
  }
  function setTank(key: 'tankA' | 'tankB', T: Tank) {
    store.update(s => {
      if (key === 'tankA') {
        rescaleTankA(s, T); // keep fish at the same relative spot
        const max = T.H * 0.5;
        for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = Math.min(s.substrate[k], max);
      } else s.tankB = { ...T };
    });
  }
  for (const k of ['L', 'H', 'D'] as const) for (const [p, key] of [['a', 'tankA'], ['b', 'tankB']] as const) {
    const el = $(p + k);
    el.onchange = () => {
      const v = +el.value; if (!Number.isFinite(v) || v <= 0) { sync(); return; }
      const T = { ...S()[key] }; T[k] = clamp(fromUnit(v, S().units), LIMITS.tankMin, LIMITS.tankMax);
      setTank(key, T);
    };
  }
  const setUnits = (u: Scene['units']) => store.update(s => { s.units = u; });
  $('uIn').onclick = () => setUnits('in'); $('uCm').onclick = () => setUnits('cm');
  $('rimY').onclick = () => store.update(s => { s.render.rim = true; });
  $('rimN').onclick = () => store.update(s => { s.render.rim = false; });
  const LIDS = [['lidOpen', 'open'], ['lidGlass', 'glass'], ['lidHood', 'hood']] as const;
  for (const [id, lid] of LIDS) $(id).onclick = () => store.update(s => { s.lid = lid; });
  $<HTMLSelectElement>('bgSel').innerHTML = Object.entries(BACKGROUNDS).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join('');
  $<HTMLSelectElement>('bgSel').onchange = e => store.update(s => { s.render.bg = (e.target as HTMLSelectElement).value as Scene['render']['bg']; });
  $<HTMLSelectElement>('glassSel').innerHTML = '<option value="auto">Auto (by height)</option>' + GLASS_CHOICES.map(g => `<option value="${g}">${g} mm</option>`).join('');
  $<HTMLSelectElement>('glassSel').onchange = e => store.update(s => { const v = (e.target as HTMLSelectElement).value; s.render.glass = v === 'auto' ? 'auto' : +v; });
  $<HTMLSelectElement>('glassType').onchange = e => store.update(s => { s.render.glassType = (e.target as HTMLSelectElement).value as Scene['render']['glassType']; });

  // ---------- Room: stand + wall ----------
  $<HTMLSelectElement>('standFinish').innerHTML = Object.entries(STAND_FINISHES).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('');
  $('standOn').onchange = e => store.update(s => { s.stand.show = (e.target as HTMLInputElement).checked; });
  $<HTMLSelectElement>('standFinish').onchange = e => store.update(s => { s.stand.finish = (e.target as HTMLSelectElement).value as Scene['stand']['finish']; s.stand.show = true; });
  $<HTMLSelectElement>('standStyle').onchange = e => store.update(s => { s.stand.style = (e.target as HTMLSelectElement).value as Scene['stand']['style']; s.stand.show = true; });
  $('standH').min = String(LIMITS.stand[0]); $('standH').max = String(LIMITS.stand[1]);
  $('standH').oninput = e => store.update(s => { s.stand.height = +(e.target as HTMLInputElement).value; s.stand.show = true; }, { coalesce: 'standH' });
  $('wallOn').onchange = e => store.update(s => { s.wall.show = (e.target as HTMLInputElement).checked; });
  for (const [id, side] of [['wallBack', 'back'], ['wallPen', 'peninsula']] as const)
    $(id).onclick = () => store.update(s => { s.wall.side = side; s.wall.show = true; });
  $('wallColor').oninput = e => store.update(s => { s.wall.color = (e.target as HTMLInputElement).value; s.wall.show = true; }, { coalesce: 'wallColor' });

  $('personOn').onchange = e => store.update(s => { s.person.show = (e.target as HTMLInputElement).checked; });
  $('personH').min = String(LIMITS.person[0]); $('personH').max = String(LIMITS.person[1]);
  $('personH').oninput = e => store.update(s => { s.person.height = +(e.target as HTMLInputElement).value; s.person.show = true; }, { coalesce: 'personH' });
  const PSIDES = [['personLeft', 'left'], ['personRight', 'right']] as const;
  for (const [id, side] of PSIDES) $(id).onclick = () => store.update(s => { s.person.side = side; s.person.show = true; });

  // ---------- Species search & adding fish ----------
  let pickId = 'neon';
  const search = $('spSearch'), results = $<HTMLDivElement>('spResults');
  function renderResults() {
    const list = searchSpecies(search.value);
    if (list.length && !list.some(s => s.id === pickId)) pickId = list[0].id;
    results.innerHTML = list.length ? '' : '<div class="none">No species match.</div>';
    for (const sp of list) {
      const b = document.createElement('button');
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(sp.id === pickId));
      b.className = sp.id === pickId ? 'on' : '';
      const tag = sp.kind === 'snail' ? '<b class="tag">snail</b>' : sp.zone === 'bottom' ? '<b class="tag">bottom</b>' : '';
      b.innerHTML = `<span>${esc(sp.name)} ${tag}<i>${esc(sp.sci)}</i></span><span>${fmt(sp.tl)}</span>`;
      if (sp.note) b.title = sp.note;
      b.onclick = () => { pickId = sp.id; renderResults(); };
      b.ondblclick = () => addOne(sp);
      results.append(b);
    }
    $<HTMLButtonElement>('addFish').disabled = $<HTMLButtonElement>('addSchool').disabled = !list.length;
    setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
  }
  search.oninput = renderResults;
  search.onkeydown = e => { if (e.key === 'Enter') { const sp = searchSpecies(search.value)[0]; if (sp) { pickId = sp.id; addOne(sp); renderResults(); } } };

  /** Size for newly added fish: % of adult length (100 = adult, stored as no override). */
  const addPct = () => clamp(Math.round(+$('addSize').value || 100), 15, 130);
  const newTL = (sp: Species) => (addPct() === 100 ? {} : { tl: Math.round(sp.tl * addPct() / 100) });
  const sizeLabel = (pct: number, sp?: Species) => (pct === 100 ? 'Adult' : `${pct}%${sp ? ' · ' + fmt(sp.tl * pct / 100) : ''}`);
  $('addSize').oninput = () => setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
  /** A snail at a random spot on the substrate or the inside of a pane (area-weighted). */
  const snailAt = (s: Scene, sp: Species, id: number): Fish => {
    const sz = newTL(sp);
    return { id, species: sp.id, ...spawnSnail((x, d) => groundHeight(s, s.tankA, x, d), s.tankA, sz.tl ?? sp.tl, Math.random, waterY(s.tankA, s.water.level)), pitch: 0, roll: 0, bend: 0, ...sz };
  };
  function addOne(sp: Species) {
    let id = 0;
    store.update(s => {
      const A = s.tankA, same = s.fish.filter(f => f.species === sp.id).length;
      if (sp.kind === 'snail') { s.fish.push(snailAt(s, sp, id = nextFishId(s))); return; }
      const sz = newTL(sp), tl = sz.tl ?? sp.tl;
      const f: Fish = { id: id = nextFishId(s), species: sp.id, x: A.L / 2 + ((same % 5) - 2) * tl * 0.6, y: waterY(A, s.water.level) / 2, depth: sp.zone === 'bottom' ? A.D * 0.3 : A.D / 2, yaw: 0, pitch: 0, roll: 0, bend: 0, ...sz };
      clampFish(f, A); s.fish.push(f);
    });
    store.select(id);
  }
  $('addFish').onclick = () => { const sp = getSpecies(pickId); if (sp) addOne(sp); };
  $('addSchool').onclick = () => {
    const sp = getSpecies(pickId); if (!sp) return;
    const n = clamp(Math.round(+$('schoolN').value || 12), 2, 60);
    let last = 0;
    store.update(s => {
      const A = s.tankA, sz = newTL(sp), tl = sz.tl ?? sp.tl, r = Math.random, cx = A.L * (0.3 + r() * 0.4), cy = waterY(A, s.water.level) * (0.4 + r() * 0.3), dir = r() < 0.5 ? 0 : 180;
      for (let i = 0; i < n && s.fish.length < LIMITS.maxFish; i++) {
        if (sp.kind === 'snail') { s.fish.push(snailAt(s, sp, last = nextFishId(s))); continue; }
        const f: Fish = {
          id: last = nextFishId(s), species: sp.id,
          x: cx + (r() - 0.5) * tl * 9, y: cy + (r() - 0.5) * tl * 4, depth: A.D * (0.15 + r() * 0.7),
          yaw: Math.round(dir + (r() - 0.5) * 80), pitch: Math.round((r() - 0.5) * 16), roll: Math.round((r() - 0.5) * 10), bend: +((r() - 0.5) * 0.8).toFixed(2), ...sz,
        };
        if (sp.zone === 'bottom') Object.assign(f, { yaw: Math.round(r() * 360 - 180), pitch: 0, roll: 0, x: A.L * (0.1 + r() * 0.8) });
        if (f.yaw > 180) f.yaw -= 360;
        clampFish(f, A); s.fish.push(f);
      }
    });
    store.select(last);
  };
  let delArm = 0;
  $('delAll').onclick = () => {
    const b = $<HTMLButtonElement>('delAll'); if (!S().fish.length) return;
    if (!delArm) {
      b.textContent = `Confirm: delete ${S().fish.length}`; b.classList.add('on');
      delArm = window.setTimeout(() => { delArm = 0; b.textContent = 'Delete all'; b.classList.remove('on'); }, 3000);
      return;
    }
    clearTimeout(delArm); delArm = 0; b.textContent = 'Delete all'; b.classList.remove('on');
    store.update(s => { s.fish = []; });
    status('All fish deleted. Ctrl+Z brings them back.');
  };

  // ---------- Selected fish ----------
  const fishKeys = { fX: 'x', fY: 'y', fZ: 'depth', fYaw: 'yaw', fPitch: 'pitch', fRoll: 'roll', fBend: 'bend' } as const;
  for (const [id, k] of Object.entries(fishKeys)) $(id).oninput = e => editSel(f => { f[k] = +(e.target as HTMLInputElement).value; }, id);
  document.querySelectorAll<HTMLButtonElement>('[data-d]').forEach(b => b.onclick = () => editSel((f, s) => { f.depth = +b.dataset.d! * s.tankA.D; }));
  const setSize = (f: Fish, pct: number) => {
    const sp = getSpecies(f.species)!, tl = Math.round(sp.tl * clamp(pct, 15, 130) / 100);
    if (tl === sp.tl) delete f.tl; else f.tl = tl;
  };
  $('fSize').oninput = e => editSel(f => setSize(f, +(e.target as HTMLInputElement).value), 'fSize');
  $('sizeAdult').onclick = () => editSel(f => { delete f.tl; });
  document.querySelectorAll<HTMLButtonElement>('[data-sz]').forEach(b => b.onclick = () => editSel(f => setSize(f, +b.dataset.sz! * 100)));
  const flip = () => editSel(f => { f.yaw = f.yaw > 0 ? f.yaw - 180 : f.yaw + 180; });
  const del = () => {
    const i = S().fish.findIndex(f => f.id === store.selId); if (i < 0) return;
    store.update(s => { s.fish.splice(i, 1); });
    store.select(S().fish[Math.max(0, i - 1)]?.id ?? null);
  };
  const dup = () => {
    const f = sel(); if (!f) return;
    let id = 0;
    store.update(s => {
      const n: Fish = { ...f, id: id = nextFishId(s), x: f.x + fishTL(f, getSpecies(f.species)!) * 0.9 };
      clampFish(n, s.tankA); s.fish.push(n);
    });
    store.select(id);
  };
  $('flip').onclick = flip; $('del').onclick = del; $('dup').onclick = dup;

  addEventListener('keydown', e => {
    const t = e.target as HTMLElement, typing = (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); return; }
    if (mod && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); dup(); return; }
    if (typing || mod || e.altKey) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'f' || e.key === 'F') flip();
    else if (e.key === 'Escape') store.select(null);
  });

  // ---------- Substrate ----------
  $<HTMLSelectElement>('subType').innerHTML = Object.entries(SUBSTRATES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('');
  $('subOn').onchange = e => store.update(s => { s.substrate.show = (e.target as HTMLInputElement).checked; });
  $<HTMLSelectElement>('subType').onchange = e => store.update(s => { s.substrate.type = (e.target as HTMLSelectElement).value as Scene['substrate']['type']; });
  const SUBK = { subFL: 'fl', subFR: 'fr', subBL: 'bl', subBR: 'br' } as const;
  for (const [id, k] of Object.entries(SUBK)) $(id).oninput = e => store.update(s => { s.substrate[k] = +(e.target as HTMLInputElement).value; }, { coalesce: id });
  const subSet = (fl: number, fr: number, bl: number, br: number) => store.update(s => {
    const max = s.tankA.H * 0.5, c = (v: number) => Math.min(v * IN, max);
    Object.assign(s.substrate, { show: true, fl: c(fl), fr: c(fr), bl: c(bl), br: c(br) });
  });
  $('subLevel').onclick = () => subSet(2, 2, 2, 2);
  $('subFB').onclick = () => subSet(1, 1, 3, 3);
  $('subLR').onclick = () => subSet(1, 3, 1, 3);
  $('subCorner').onclick = () => subSet(1, 1, 4, 1);

  // ---------- Water ----------
  $('wLevel').oninput = e => store.update(s => setWaterLevel(s, +(e.target as HTMLInputElement).value), { coalesce: 'wLevel' });
  $('wOpac').oninput = e => store.update(s => { s.water.opacity = +(e.target as HTMLInputElement).value; }, { coalesce: 'wOpac' });
  $('wColor').oninput = e => store.update(s => {
    s.water.color = (e.target as HTMLInputElement).value;
    if (s.water.opacity < 0.05) s.water.opacity = 0.3; // picking a colour on clear water should show it
  }, { coalesce: 'wColor' });
  const waterPreset = (color: string, opacity: number) => store.update(s => { Object.assign(s.water, { color, opacity }); });
  $('wClear').onclick = () => waterPreset('#7fb8a8', 0);
  $('wTannin').onclick = () => waterPreset('#6b3d14', 0.6);
  $('wGreen').onclick = () => waterPreset('#5d8a2e', 0.5);

  // ---------- Lighting ----------
  const lKeys = { lCount: 'count', lBright: 'bright', lK: 'kelvin', lRoom: 'room' } as const;
  for (const [id, k] of Object.entries(lKeys)) $(id).oninput = e => store.update(s => { s.light[k] = +(e.target as HTMLInputElement).value; }, { coalesce: id });
  $<HTMLSelectElement>('lType').onchange = e => store.update(s => { s.light.type = (e.target as HTMLSelectElement).value as Scene['light']['type']; });

  // ---------- Viewer (camera): saved with the scene, but not undoable ----------
  const camKeys = { cDist: 'dist', cAz: 'az', cEl: 'el', cZoom: 'zoom' } as const;
  for (const [id, k] of Object.entries(camKeys)) $(id).oninput = e => store.update(s => { s.camera[k] = +(e.target as HTMLInputElement).value; }, { kind: 'view' });
  $('camReset').onclick = () => store.update(s => Object.assign(s.camera, { az: 0, el: 0, zoom: 1 }), { kind: 'view' });

  // ---------- Compare, display, export ----------
  $('cmp').onchange = e => store.update(s => { s.compare = (e.target as HTMLInputElement).checked; });
  $<HTMLSelectElement>('edge').onchange = e => store.update(s => { s.render.edge = (e.target as HTMLSelectElement).value as Scene['render']['edge']; });
  $('gridOn').onchange = e => store.update(s => { s.render.grid = (e.target as HTMLInputElement).checked; });
  // viewpoint map: a per-viewer display preference (browser storage), not scene data
  const mapCb = $('mapOn'), applyMap = () => { $('viewmap').classList.toggle('off', !mapCb.checked); viewer.invalidate(); };
  try { mapCb.checked = localStorage.getItem('tanklook.viewmap') !== 'off'; } catch { /* storage blocked: keep default */ }
  applyMap();
  mapCb.onchange = () => { try { localStorage.setItem('tanklook.viewmap', mapCb.checked ? 'on' : 'off'); } catch { /* ignore */ } applyMap(); };
  $<HTMLSelectElement>('layout').innerHTML = Object.entries(LAYOUTS).map(([k, l]) => `<option value="${k}">${esc(l.label)}</option>`).join('');
  $<HTMLSelectElement>('layout').onchange = e => store.update(s => {
    s.layout.id = (e.target as HTMLSelectElement).value as LayoutId;
    if (s.layout.id === 'swamp' && s.water.level > SWAMP_LEVEL) setWaterLevel(s, SWAMP_LEVEL); // land needs to stand out of the water
  });
  $('layoutShuffle').onclick = () => store.update(s => { s.layout.seed = 1 + Math.floor(Math.random() * 1e6); });
  document.querySelectorAll<HTMLButtonElement>('[data-png]').forEach(b => b.onclick = async () => {
    const mult = +b.dataset.png!;
    try { download(await viewer.exportPNG(mult), `${slug(S().name)}-${mult}x.png`); }
    catch (e) { status((e as Error).message, true); }
  });
  for (const el of document.querySelectorAll<HTMLInputElement>('input[type=range]')) el.addEventListener('change', () => store.seal());

  // ---------- sync: scene -> controls ----------
  const setVal = (id: string, v: number | string) => { const el = $(id); if (document.activeElement !== el || el.type === 'range') el.value = String(v); };
  const setOut = (id: string, txt: string, cls = '') => { const el = $<HTMLOutputElement>(id); el.textContent = txt; el.className = cls; };
  let listSig = '', jsonOpen = false;
  const jsonDetails = $('json').parentElement as HTMLDetailsElement;
  jsonDetails.addEventListener('toggle', () => { jsonOpen = jsonDetails.open; syncJson(); });
  const syncJson = () => { if (jsonOpen) $('json').textContent = JSON.stringify(S(), null, 1); };

  function sync() {
    const s = S(), A = s.tankA, u = s.units;
    $<HTMLButtonElement>('undo').disabled = !store.canUndo; $<HTMLButtonElement>('redo').disabled = !store.canRedo;
    setVal('sceneName', s.name);
    $('uIn').classList.toggle('on', u === 'in'); $('uCm').classList.toggle('on', u === 'cm');
    for (const k of ['L', 'H', 'D'] as const) { setVal('a' + k, toUnit(A[k], u)); setVal('b' + k, toUnit(s.tankB[k], u)); }
    for (const id of ['aL', 'aH', 'aD', 'bL', 'bH', 'bD']) $(id).step = u === 'in' ? '0.5' : '1';
    const vol = volume(A);
    $('volA').textContent = `${vol.gallons.toFixed(1)} US gal · ${vol.litres.toFixed(0)} L interior`;
    $('rimY').classList.toggle('on', s.render.rim); $('rimN').classList.toggle('on', !s.render.rim);
    for (const [id, lid] of LIDS) $(id).classList.toggle('on', s.lid === lid);
    setVal('bgSel', s.render.bg); setVal('glassSel', String(s.render.glass)); setVal('glassType', s.render.glassType);
    const t = glassThickness(A, s.render.glass);
    $('glassHint').textContent = (s.render.glass === 'auto' ? 'Auto: ' : 'Glass: ') + t + ' mm (' + fmtLen(t, u, 2) + ')';

    $('standOn').checked = s.stand.show; setVal('standFinish', s.stand.finish); setVal('standStyle', s.stand.style); setVal('standH', s.stand.height);
    setOut('oStandH', fmt(s.stand.height));
    $('wallOn').checked = s.wall.show; setVal('wallColor', s.wall.color);
    for (const [id, side] of [['wallBack', 'back'], ['wallPen', 'peninsula']] as const)
      $(id).classList.toggle('on', s.wall.show && s.wall.side === side);

    $('personOn').checked = s.person.show; setVal('personH', s.person.height); setOut('oPersonH', fmtHeight(s.person.height, u));
    for (const [id, side] of PSIDES) $(id).classList.toggle('on', s.person.show && s.person.side === side);

    // fish list (rebuilt only when membership or selection changes)
    const sig = s.fish.map(f => f.id + f.species).join() + '|' + store.selId + u;
    if (sig !== listSig) {
      listSig = sig; const list = $<HTMLDivElement>('list'), counts: Record<string, number> = {};
      list.innerHTML = '';
      for (const f of s.fish) {
        counts[f.species] = (counts[f.species] || 0) + 1;
        const b = document.createElement('button');
        b.textContent = `${getSpecies(f.species)?.name ?? f.species} ${counts[f.species]}`;
        if (f.id === store.selId) b.className = 'on';
        b.onclick = () => store.select(f.id);
        list.append(b);
      }
      if (!s.fish.length) list.innerHTML = '<span class="hint">No fish yet. Pick a species above and press Add.</span>';
      renderResults();
    }
    const f = sel();
    $('selBox').classList.toggle('off', !f);
    for (const id of ['fX', 'fY', 'fZ']) $(id).min = '0';
    $('fX').max = String(A.L); $('fY').max = String(waterY(A, s.water.level)); $('fZ').max = String(A.D);
    const fsp = f && getSpecies(f.species);
    $('fY').disabled = !!fsp && restsOnFloor(fsp, f!.surface);
    if (f) {
      for (const [id, k] of Object.entries(fishKeys)) setVal(id, f[k]);
      setOut('oX', fmt(f.x)); setOut('oY', fmt(f.y)); setOut('oZ', fmt(f.depth));
      const pct = Math.round(fishTL(f, fsp!) / fsp!.tl * 100);
      setVal('fSize', pct); setOut('oSize', f.tl ? `${fmt(f.tl)} · ${pct}%` : `Adult · ${fmt(fsp!.tl)}`);
      setOut('oYaw', f.yaw + '°'); setOut('oPitch', f.pitch + '°'); setOut('oRoll', f.roll + '°'); setOut('oBend', f.bend.toFixed(2));
    }

    const sub = s.substrate, smax = Math.round(A.H * 0.5);
    $('subOn').checked = sub.show; setVal('subType', sub.type);
    for (const [id, k] of Object.entries(SUBK)) { $(id).max = String(smax); setVal(id, sub[k]); setOut('o' + id[0].toUpperCase() + id.slice(1), fmt(sub[k])); }

    const wa = s.water;
    setVal('wLevel', wa.level); setOut('oLevel', wa.level >= 1 ? 'Full' : `${fmt(waterY(A, wa.level))} high`);
    setVal('wOpac', wa.opacity); setOut('oOpac', wa.opacity < 0.01 ? 'Clear' : Math.round(wa.opacity * 100) + '%'); setVal('wColor', wa.color);

    const l = s.light; setVal('lType', l.type);
    for (const [id, k] of Object.entries(lKeys)) setVal(id, l[k]);
    setOut('oCount', String(l.count)); setOut('oBright', '×' + l.bright.toFixed(2)); setOut('oK', l.kelvin + ' K'); setOut('oRoom', l.room.toFixed(2));
    $('lCountRow').style.display = l.type === 'spot' || l.type === 'tube' ? '' : 'none';
    $('lCountLab').textContent = l.type === 'tube' ? 'Tubes' : 'Bulbs';

    const c = s.camera;
    for (const [id, k] of Object.entries(camKeys)) setVal(id, c[k]);
    setOut('oDist', fmt(c.dist)); setOut('oAz', c.az + '°', Math.abs(c.az) > 30 ? 'warn' : '');
    setOut('oEl', c.el + '°', c.el > 25 || c.el < 0 ? 'warn' : ''); setOut('oZoom', '×' + c.zoom.toFixed(2));
    const beyond = Math.abs(c.az) > 30 || c.el > 25 || c.el < 0;
    $('camHint').innerHTML = beyond
      ? '<span class="warn">Steep angle: flat fish cards start to look like paper here.</span>'
      : 'Distance is from your eye to the front glass, the same for every tank. Zoom only crops; it never changes perspective.';

    $('cmp').checked = s.compare; $('bBox').hidden = !s.compare;
    setVal('edge', s.render.edge); $('gridOn').checked = s.render.grid; 
    setVal('layout', s.layout.id); $('layoutHint').textContent = LAYOUTS[s.layout.id].hint;
    ($('layoutShuffle') as HTMLButtonElement).disabled = s.layout.id === 'none';
    syncJson();
  }

  // ---------- after each draw: viewport labels + readout (same frame as the render) ----------
  viewer.onDrawn(() => {
    const s = S(), active = viewer.active;
    for (const [i, id] of [[0, 'labA'], [1, 'labB']] as const) {
      const el = $<HTMLDivElement>(id), vp = active[i];
      el.style.display = vp ? '' : 'none';
      if (vp) { el.style.left = (vp.x + 8) + 'px'; el.textContent = (active.length > 1 ? `Tank ${vp.key}: ` : '') + fmtDims(vp.T, s.units); }
    }
    readout();
  });
  function readout() {
    const f = sel(), ro = $<HTMLDivElement>('ro');
    const m = f && viewer.measure(f), sp = f && getSpecies(f.species);
    if (!f || !m || !sp) { ro.innerHTML = '<span class="hint">Select a fish to see its size on screen.</span>'; return; }
    const a = m.sideAngle, cls = a < 40 ? 'ok' : a < 55 ? 'warn' : 'bad';
    const txt = a < 40 ? 'reads fine' : a < 55 ? 'marginal' : 'too thin: card looks flat';
    let html = `<div><span><b>${esc(sp.name)}</b> <i>${esc(sp.sci)}</i></span><span>${f.tl ? `${fmt(f.tl)} (adult ${fmt(sp.tl)})` : `adult ${fmt(sp.tl)}`}</span></div>
      <div><span>Depth behind glass</span><span>${fmt(f.depth)}</span></div>
      <div><span>On screen</span><span>${m.len.toFixed(0)} px</span></div>
      <div><span>Same pose at the front glass</span><span>${m.ref.toFixed(0)} px</span></div>
      <div><span>Measured ratio</span><span>×${(m.len / m.ref).toFixed(3)}</span></div>
      <div><span>Straight-on formula d ÷ (d + z)</span><span>×${m.formula.toFixed(3)}</span></div>
      <div><span>Angle off side-on</span><span class="${cls}">${a.toFixed(0)}°: ${txt}</span></div>`;
    if (m.lenB != null) html += `<div><span>Same fish in Tank B</span><span>${m.lenB.toFixed(0)} px (depth ${fmt(m.depthB!)})</span></div>`;
    ro.innerHTML = html;
  }

  // ---------- autosave ----------
  let saveTimer = 0;
  store.subscribe(kind => {
    sync();
    if (kind === 'select') return;
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      store.saveLocal();
      $('saveState').textContent = 'Saved in this browser';
    }, 400);
  });

  // flush a pending autosave when the tab closes or reloads
  addEventListener('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); store.saveLocal(); } });

  renderResults();
  sync();
  return { status };
}

function slug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tank'; }
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Person height: feet and inches (in) or metres (cm). */
function fmtHeight(mm: number, u: Scene['units']) {
  if (u === 'cm') return (mm / 1000).toFixed(2) + ' m';
  const inches = Math.round(mm / 25.4);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}
