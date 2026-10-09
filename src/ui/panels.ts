// Sidebar wiring. Inputs write through store.update(); one sync() pulls every control back from the scene,
// so undo/redo, file open and pointer drags all refresh the panels the same way.
import { rng } from '../art/paint';
import { SUBSTRATES, drawFishCard } from '../art/placeholder';
import { drawSnailCard } from '../art/snails';
import { fishTL, getSpecies, needsWater, restsOnFloor, searchSpecies, speciesTag, type Species } from '../data/species';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import type { Viewer } from '../render/viewer';
import { defaultScene, TANK_PRESETS } from '../scene/defaults';
import { KINDS, LAYOUTS, LIBRARY, clampItem, itemDims, makeItem, starterItems } from '../scene/items';
import { tankDiff } from './diff';
import {
  IN, clamp, clampFish, fmtDims, fmtLen, fmtSize, fromUnit, glassThickness, rescaleTank, spawnSnail, toUnit, volume, waterY,
} from '../scene/physics';
import type { Store } from '../scene/store';
import { SWAMP_LEVEL, groundHeight, nearestLand, sampleTerrain } from '../scene/terrain';
import { placeOnLand, randomPose, shuffleFish } from '../scene/scatter';
import { restsOnGround, setWaterLevel } from '../scene/water';
import { tankWeight } from '../scene/weight';
import { AQ_PROXY, aqAdvisorUrl, aqKey, aqQuery, aqWaitS, fetchStocking } from '../data/aqadvisor';
import { POLY_SIDES, SHAPES, bowMinLimit, offsetRing, ringArea, shapeOf } from '../scene/shape';
import { TABLE_MAX, tableRange } from '../scene/table';
import type { Fish, Item, ItemKind, LayoutId, Scene, TableSettings, Tank, TankSetup, TankShape } from '../scene/types';
import { GLASS_CHOICES, LIMITS, SceneError, parseScene } from '../scene/validate';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
/** ?debug in the URL shows calibration readouts (apparent-size maths) in the fish readout. */
const DEBUG = new URLSearchParams(location.search).has('debug');
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export function attachPanels(store: Store, viewer: Viewer) {
  const G = () => store.scene;   // the whole scene: name, units, the tanks
  const S = () => store.tank;    // the tank the panel shows; edits go to every view with "Edit" ticked (store.edit)
  const fmt = (mm: number) => fmtLen(mm, G().units);
  const sel = () => store.selected;
  /** Mutate the selected fish (undoable, coalesced per control). */
  const editSel = (fn: (f: Fish, s: TankSetup) => void, coalesce?: string) => {
    if (!store.selected) return;
    store.edit(s => { const f = s.fish.find(f => f.id === store.selId); if (f) fn(f, s); }, { coalesce });
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
    if (G().tanks.some(t => t.fish.length) && !confirm('Start a new, empty tank? (Undo brings this one back.)')) return;
    const s = defaultScene(); s.tanks[0].fish = []; s.name = 'New tank';
    s.tanks[0].camera = { ...S().camera }; s.units = G().units;
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
  const saveFile = (scene: Scene) => download(new Blob([JSON.stringify(scene, null, 1)], { type: 'application/json' }), `${slug(scene.name)}.tanklook.json`);
  // the whole scene: with split tanks, one file holding both (opens split again)
  $('saveScene').onclick = () => saveFile(G());
  /** One tank of a split on its own, as an ordinary single-tank file (Nathan 2026-10-08). */
  const saveTank = (i: number) => {
    const g = G(), t = g.tanks[i]; if (!t) return;
    const name = `${g.name} - Tank ${'AB'[i]}`.slice(0, 80);
    saveFile({ ...g, name, tanks: [structuredClone(t)], active: 0, camLock: true });
    status(`Saved Tank ${'AB'[i]} on its own as "${name}".`);
  };
  $('sceneName').onchange = () => {
    const v = $('sceneName').value.trim().slice(0, 80) || 'My tank';
    store.update(s => { s.name = v; });
  };

  // ---------- Tank ----------
  const presetOptions = '<option value="">Presets…</option>' + TANK_PRESETS.map((p, i) => `<option value="${i}">${esc(p[0])}</option>`).join('');
  {
    const s = $<HTMLSelectElement>('presetA'); s.innerHTML = presetOptions;
    s.onchange = () => {
      if (s.value === '') return;
      const p = TANK_PRESETS[+s.value]; s.value = '';
      setTank(T => ({ ...T, L: p[1] * IN, H: p[2] * IN, D: p[3] * IN })); // keeps the shape (round: D follows L)
    };
  }
  /** Resize / reshape each edited tank from its own current size (so ticking both changes only what was set). */
  function setTank(next: (T: Tank) => Tank, coalesce?: string) {
    store.edit(s => {
      const T = next(s.tank);
      rescaleTank(s, T); // keep fish at the same relative spot (and apply the shape's rules, e.g. round D = L)
      const max = T.H * 0.5;
      for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = Math.min(s.substrate[k], max);
      // hood and peninsula ends exist for rectangles and bowfronts only (Nathan 2026-10-08)
      if (!flatEnds(s.tank)) { if (s.lid === 'hood') s.lid = 'glass'; if (s.wall.side !== 'back') s.wall.side = 'back'; }
    }, { coalesce });
  }
  const flatEnds = (T: Tank) => ['rect', 'bow'].includes(shapeOf(T));
  $<HTMLSelectElement>('shapeSel').innerHTML = Object.entries(SHAPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $<HTMLSelectElement>('shapeSel').onchange = e => {
    const shape = (e.target as HTMLSelectElement).value as TankShape;
    setTank(T => ({ ...T, shape, sides: T.sides ?? 6, bowMin: T.bowMin ?? T.D * 0.7 }));
  };
  for (const n of POLY_SIDES) $('sides' + n).onclick = () => setTank(T => ({ ...T, shape: 'poly', sides: n }));
  $('bowMin').oninput = e => setTank(T => ({ ...T, bowMin: +(e.target as HTMLInputElement).value }), 'bowMin');
  for (const k of ['L', 'H', 'D'] as const) {
    const el = $('a' + k);
    el.onchange = () => {
      const v = +el.value; if (!Number.isFinite(v) || v <= 0) { sync(); return; }
      setTank(T => ({ ...T, [k]: clamp(fromUnit(v, G().units), LIMITS.tankMin, LIMITS.tankMax) }));
    };
  }
  const setUnits = (u: Scene['units']) => store.update(s => { s.units = u; });
  $('uIn').onclick = () => setUnits('in'); $('uCm').onclick = () => setUnits('cm');
  $('rimY').onclick = () => store.edit(s => { s.render.rim = true; });
  $('rimN').onclick = () => store.edit(s => { s.render.rim = false; });
  const LIDS = [['lidOpen', 'open'], ['lidGlass', 'glass'], ['lidHood', 'hood']] as const;
  for (const [id, lid] of LIDS) $(id).onclick = () => store.edit(s => { s.lid = lid; });
  $<HTMLSelectElement>('bgSel').innerHTML = Object.entries(BACKGROUNDS).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join('');
  $<HTMLSelectElement>('bgSel').onchange = e => store.edit(s => { s.render.bg = (e.target as HTMLSelectElement).value as TankSetup['render']['bg']; });
  $<HTMLSelectElement>('glassSel').innerHTML = '<option value="auto">Auto (by height)</option>' + GLASS_CHOICES.map(g => `<option value="${g}">${g} mm</option>`).join('');
  $<HTMLSelectElement>('glassSel').onchange = e => store.edit(s => { const v = (e.target as HTMLSelectElement).value; s.render.glass = v === 'auto' ? 'auto' : +v; });
  $<HTMLSelectElement>('glassType').onchange = e => store.edit(s => { s.render.glassType = (e.target as HTMLSelectElement).value as TankSetup['render']['glassType']; });

  // ---------- Room: stand + wall ----------
  $<HTMLSelectElement>('standFinish').innerHTML = Object.entries(STAND_FINISHES).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('');
  $('standOn').onchange = e => store.edit(s => { s.stand.show = (e.target as HTMLInputElement).checked; });
  $<HTMLSelectElement>('standFinish').onchange = e => store.edit(s => { s.stand.finish = (e.target as HTMLSelectElement).value as TankSetup['stand']['finish']; s.stand.show = true; });
  $<HTMLSelectElement>('standStyle').onchange = e => store.edit(s => { s.stand.style = (e.target as HTMLSelectElement).value as TankSetup['stand']['style']; s.stand.show = true; });
  $('standH').min = String(LIMITS.stand[0]); $('standH').max = String(LIMITS.stand[1]);
  $('standH').oninput = e => store.edit(s => { s.stand.height = +(e.target as HTMLInputElement).value; s.stand.show = true; }, { coalesce: 'standH' });
  // table stand: top shape and size, and where the tank sits on it (store.update -> fitTable keeps it on the top)
  const editTable = (fn: (tb: TableSettings, s: TankSetup) => void, coalesce?: string) => store.edit(s => { fn(s.stand.table, s); s.stand.style = 'table'; s.stand.show = true; }, coalesce ? { coalesce } : {});
  $('tableRect').onclick = () => editTable(tb => { tb.shape = 'rect'; });
  $('tableRound').onclick = () => editTable(tb => { tb.shape = 'round'; tb.L = tb.D = Math.max(tb.L, tb.D); });
  for (const id of ['tableL', 'tableD', 'tableX', 'tableZ']) { $(id).min = String(-TABLE_MAX); $(id).max = String(TABLE_MAX); }
  $('tableL').oninput = e => editTable(tb => { tb.L = +(e.target as HTMLInputElement).value; if (tb.shape === 'round') tb.D = tb.L; }, 'tableL');
  $('tableD').oninput = e => editTable(tb => { tb.D = +(e.target as HTMLInputElement).value; }, 'tableD');
  $('tableX').oninput = e => editTable(tb => { tb.x = +(e.target as HTMLInputElement).value; }, 'tableX');
  $('tableZ').oninput = e => editTable(tb => { tb.z = +(e.target as HTMLInputElement).value; }, 'tableZ');
  $('tableCentre').onclick = () => editTable(tb => { tb.x = 0; tb.z = 0; });
  $('tableBack').onclick = () => editTable(tb => { tb.x = 0; tb.z = TABLE_MAX; });   // fitTable stops it at the edge
  $('tableFront').onclick = () => editTable(tb => { tb.x = 0; tb.z = -TABLE_MAX; });
  $('wallOn').onchange = e => store.edit(s => { s.wall.show = (e.target as HTMLInputElement).checked; });
  for (const [id, side] of [['wallBack', 'back'], ['wallLeft', 'left'], ['wallRight', 'right']] as const)
    $(id).onclick = () => store.edit(s => { s.wall.side = side; s.wall.show = true; });
  $('wallColor').oninput = e => store.edit(s => { s.wall.color = (e.target as HTMLInputElement).value; s.wall.show = true; }, { coalesce: 'wallColor' });

  $('personOn').onchange = e => store.edit(s => { s.person.show = (e.target as HTMLInputElement).checked; });
  $('personH').min = String(LIMITS.person[0]); $('personH').max = String(LIMITS.person[1]);
  $('personH').oninput = e => store.edit(s => { s.person.height = +(e.target as HTMLInputElement).value; s.person.show = true; }, { coalesce: 'personH' });
  const PSIDES = [['personLeft', 'left'], ['personRight', 'right']] as const;
  for (const [id, side] of PSIDES) $(id).onclick = () => store.edit(s => { s.person.side = side; s.person.show = true; });

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
      const tag = speciesTag(sp) ? `<b class="tag">${speciesTag(sp)}</b>` : '';
      b.innerHTML = `<span class="nm">${esc(sp.name)} ${tag}</span><span>${fmt(sp.tl)}</span><i class="sci" title="${esc(sp.sci)}">${esc(sp.sci)}</i>`;
      if (sp.note) b.title = sp.note;
      b.onclick = () => { pickId = sp.id; preview.hidden = false; renderResults(); };
      b.ondblclick = () => addOne(sp);
      results.append(b);
    }
    const pick = getSpecies(pickId), why = pick ? blocked(pick) : '';
    showPreview(list.length ? pick : undefined);
    $<HTMLButtonElement>('addFish').disabled = $<HTMLButtonElement>('addSchool').disabled = !list.length || !!why;
    $('addFish').title = why;
    setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
  }
  search.oninput = renderResults;

  // preview tile: opens on clicking a species, then follows the pick until closed
  const preview = $<HTMLDivElement>('spPreview'), previewArt = new Map<string, HTMLCanvasElement>();
  let previewId = '';
  $('spPreviewHide').onclick = () => { preview.hidden = true; };
  function showPreview(sp?: Species) {
    if (!sp) { preview.hidden = true; return; }
    if (sp.id === previewId) return;
    previewId = sp.id;
    let c = previewArt.get(sp.id);
    if (!c) previewArt.set(sp.id, c = sp.kind === 'snail' ? drawSnailCard(sp.art, 'side', 640) : drawFishCard(sp.art, sp.aspect, 640));
    $('spPreviewArt').replaceChildren(c);
    $('spPreviewName').innerHTML = `${esc(sp.name)} <i>${esc(sp.sci)}</i>`;
    $('spPreviewInfo').textContent = [`Adult ${fmt(sp.tl)}`, speciesTag(sp), sp.note].filter(Boolean).join(' · ');
  }
  search.onkeydown = e => { if (e.key === 'Enter') { const sp = searchSpecies(search.value)[0]; if (sp) { pickId = sp.id; addOne(sp); renderResults(); } } };

  /** Size for newly added fish: % of adult length (100 = adult, stored as no override). */
  const addPct = () => clamp(Math.round(+$('addSize').value || 100), 15, 130);
  const newTL = (sp: Species) => (addPct() === 100 ? {} : { tl: Math.round(sp.tl * addPct() / 100) });
  const sizeLabel = (pct: number, sp?: Species) => (pct === 100 ? 'Adult' : `${pct}%${sp ? ' · ' + fmt(sp.tl * pct / 100) : ''}`);
  $('addSize').oninput = () => setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
  /** A snail at a random spot on the substrate or the inside of a pane (area-weighted). */
  const snailAt = (s: TankSetup, sp: Species, id: number, r: () => number): Fish => {
    const sz = newTL(sp);
    return { id, species: sp.id, ...spawnSnail((x, d) => groundHeight(s, s.tank, x, d), s.tank, sz.tl ?? sp.tl, r, s.water.on ? waterY(s.tank, s.water.level) : s.tank.H - 10), pitch: 0, roll: 0, bend: 0, ...sz };
  };
  /** Water surface for placement: the water line, or -1 in a dry tank (all ground counts as land). */
  const surfaceY = (s: TankSetup) => (s.water.on ? waterY(s.tank, s.water.level) : -1);
  /** Why this species cannot be added right now ('' = it can). */
  function blocked(sp: Species): string {
    const s = S();
    if (!s.water.on && needsWater(sp)) return 'Fish need water: turn Water on (Water section).';
    if (sp.habitat === 'land' && !nearestLand(s, s.tank, surfaceY(s), 0, 0))
      return 'Land animals need ground above the water: lower the water, or use the Swamp layout or Custom terrain.';
    return '';
  }
  function addOne(sp: Species) {
    const why = blocked(sp); if (why) { status(why, true); renderResults(); return; }
    const id = store.nextId(), seed = Math.random() * 1e9;
    store.edit(s => {
      const A = s.tank, r = rng(seed); // the same draws in every edited tank
      if (sp.kind === 'snail') { s.fish.push(snailAt(s, sp, id, r)); return; }
      const sz = newTL(sp);
      const f: Fish = { id, species: sp.id, x: A.L * (0.1 + r() * 0.8), y: waterY(A, s.water.level) * (0.2 + r() * 0.6), depth: A.D * (0.15 + r() * 0.7), ...randomPose(sp, r, r() < 0.5 ? 0 : 180), ...sz };
      if (sp.habitat !== 'water') placeOnLand(s, sp, f, r);
      clampFish(f, A); s.fish.push(f);
    });
    store.select(id);
  }
  $('addFish').onclick = () => { const sp = getSpecies(pickId); if (sp) addOne(sp); };
  $('addSchool').onclick = () => {
    const sp = getSpecies(pickId); if (!sp) return;
    const why = blocked(sp); if (why) { status(why, true); renderResults(); return; }
    const n = clamp(Math.round(+$('schoolN').value || 12), 2, 60);
    const first = store.nextId(), seed = Math.random() * 1e9;
    let last = 0;
    store.edit(s => {
      let id = first;
      const A = s.tank, sz = newTL(sp), tl = sz.tl ?? sp.tl, r = rng(seed), cx = A.L * (0.3 + r() * 0.4), cy = waterY(A, s.water.level) * (0.4 + r() * 0.3), dir = r() < 0.5 ? 0 : 180;
      for (let i = 0; i < n && s.fish.length < LIMITS.maxFish; i++) {
        if (sp.kind === 'snail') { s.fish.push(snailAt(s, sp, last = id++, r)); continue; }
        const f: Fish = {
          id: last = id++, species: sp.id,
          x: cx + (r() - 0.5) * tl * 9, y: cy + (r() - 0.5) * tl * 4, depth: A.D * (0.15 + r() * 0.7),
          ...randomPose(sp, r, dir), ...sz,
        };
        if (sp.zone === 'bottom') f.x = A.L * (0.1 + r() * 0.8);
        if (sp.habitat !== 'water') placeOnLand(s, sp, f, r);
        clampFish(f, A); s.fish.push(f);
      }
    });
    store.select(last);
  };
  $('shuffle').onclick = () => {
    if (!S().fish.length) return;
    const seed = Math.random() * 1e9;
    store.edit(s => shuffleFish(s, rng(seed)));
    status('Shuffled: a new moment in the tank. Ctrl+Z brings the last one back.');
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
    store.edit(s => { s.fish = []; });
    status('All fish deleted. Ctrl+Z brings them back.');
  };

  // ---------- Selected fish ----------
  const fishKeys = { fX: 'x', fY: 'y', fZ: 'depth', fYaw: 'yaw', fPitch: 'pitch', fRoll: 'roll', fBend: 'bend' } as const;
  for (const [id, k] of Object.entries(fishKeys)) $(id).oninput = e => editSel(f => { f[k] = +(e.target as HTMLInputElement).value; }, id);
  document.querySelectorAll<HTMLButtonElement>('[data-d]').forEach(b => b.onclick = () => editSel((f, s) => { f.depth = +b.dataset.d! * s.tank.D; }));
  const setSize = (f: Fish, pct: number) => {
    const sp = getSpecies(f.species)!, tl = Math.round(sp.tl * clamp(pct, 15, 130) / 100);
    if (tl === sp.tl) delete f.tl; else f.tl = tl;
  };
  $('fSize').oninput = e => editSel(f => setSize(f, +(e.target as HTMLInputElement).value), 'fSize');
  $('sizeAdult').onclick = () => editSel(f => { delete f.tl; });
  document.querySelectorAll<HTMLButtonElement>('[data-sz]').forEach(b => b.onclick = () => editSel(f => setSize(f, +b.dataset.sz! * 100)));
  const flip = () => editSel(f => { f.yaw = f.yaw > 0 ? f.yaw - 180 : f.yaw + 180; });
  const del = () => {
    const id = store.selId, i = S().fish.findIndex(f => f.id === id); if (i < 0) return;
    store.edit(s => { s.fish = s.fish.filter(f => f.id !== id); });
    store.select(S().fish[Math.max(0, i - 1)]?.id ?? null);
  };
  const dup = () => {
    if (!sel()) return;
    const id = store.nextId(), src = store.selId;
    store.edit(s => {
      const f = s.fish.find(q => q.id === src); if (!f) return;
      const n: Fish = { ...f, id, x: f.x + fishTL(f, getSpecies(f.species)!) * 0.9 };
      clampFish(n, s.tank); s.fish.push(n);
    });
    store.select(id);
  };
  $('flip').onclick = flip; $('del').onclick = del; $('dup').onclick = dup;

  addEventListener('keydown', e => {
    const t = e.target as HTMLElement, typing = (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); return; }
    if (mod && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); if (store.selectedItem) itemDup(); else dup(); return; }
    if (typing || mod || e.altKey) return;
    if (store.selectedItem) {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); itemDel(); }
      else if (e.key === 'r' || e.key === 'R') editItem(it => { it.yaw += e.shiftKey ? -15 : 15; });
      else if (e.key === 'Escape') store.selectItem(null);
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
    else if (e.key === 'f' || e.key === 'F') flip();
    else if (e.key === 'Escape') store.select(null);
  });

  // ---------- Substrate ----------
  // 'bare' = bare-bottom glass (substrate.show off; the last type is kept for when it comes back)
  $<HTMLSelectElement>('subType').innerHTML = '<option value="bare">Bare bottom (no substrate)</option>' +
    Object.entries(SUBSTRATES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('');
  $<HTMLSelectElement>('subType').onchange = e => store.edit(s => {
    const v = (e.target as HTMLSelectElement).value;
    s.substrate.show = v !== 'bare'; if (v !== 'bare') s.substrate.type = v as TankSetup['substrate']['type'];
  });
  const SUBK = { subFL: 'fl', subFR: 'fr', subBL: 'bl', subBR: 'br' } as const;
  for (const [id, k] of Object.entries(SUBK)) $(id).oninput = e => store.edit(s => { s.substrate[k] = +(e.target as HTMLInputElement).value; }, { coalesce: id });
  const subSet = (fl: number, fr: number, bl: number, br: number) => store.edit(s => {
    const max = s.tank.H * 0.5, c = (v: number) => Math.min(v * IN, max);
    Object.assign(s.substrate, { show: true, fl: c(fl), fr: c(fr), bl: c(bl), br: c(br) });
  });
  $('subLevel').onclick = () => subSet(2, 2, 2, 2);
  $('subFB').onclick = () => subSet(1, 1, 3, 3);
  $('subLR').onclick = () => subSet(1, 3, 1, 3);
  $('subCorner').onclick = () => subSet(1, 1, 4, 1);

  // ---------- Custom terrain ----------
  $('terOn').onchange = e => {
    const on = (e.target as HTMLInputElement).checked;
    store.edit(s => {
      // turning on starts from the floor you see (slopes or swamp land); a grid kept from before is reused
      if (on && !s.terrain.h.length) s.terrain = sampleTerrain(s, s.tank, s.terrain.cols);
      s.terrain.on = on;
    });
    viewer.terrainEdit.on = on; viewer.rebuild();
  };
  $('terCols').oninput = e => store.edit(s => {
    const cols = +(e.target as HTMLInputElement).value; if (cols === s.terrain.cols && s.terrain.h.length) return;
    s.terrain = sampleTerrain(s, s.tank, cols); // resample the current surface, so shaping survives a grid change
  }, { coalesce: 'terCols' });
  $('terEdit').onclick = () => { viewer.terrainEdit.on = !viewer.terrainEdit.on; viewer.rebuild(); sync(); };
  $('terFlat').onclick = () => store.edit(s => {
    const t = s.terrain, avg = t.h.reduce((a, v) => a + v, 0) / Math.max(1, t.h.length);
    t.h = t.h.map(() => +avg.toFixed(1));
  });

  // ---------- Water ----------
  $('wOn').onchange = e => {
    const on = (e.target as HTMLInputElement).checked;
    store.edit(s => { s.water.on = on; });
    const n = S().fish.filter(f => { const sp = getSpecies(f.species); return sp && needsWater(sp); }).length;
    if (!on && n) status(`${n} fish hidden while the tank is dry. Turn Water back on to see them.`);
    renderResults();
  };
  $('wLevel').oninput = e => store.edit(s => setWaterLevel(s, +(e.target as HTMLInputElement).value), { coalesce: 'wLevel' });
  $('wOpac').oninput = e => store.edit(s => { s.water.opacity = +(e.target as HTMLInputElement).value; }, { coalesce: 'wOpac' });
  $('wColor').oninput = e => store.edit(s => {
    s.water.color = (e.target as HTMLInputElement).value;
    if (s.water.opacity < 0.05) s.water.opacity = 0.3; // picking a colour on clear water should show it
  }, { coalesce: 'wColor' });
  const waterPreset = (color: string, opacity: number) => store.edit(s => { Object.assign(s.water, { color, opacity }); });
  $('wClear').onclick = () => waterPreset('#7fb8a8', 0);
  $('wTannin').onclick = () => waterPreset('#6b3d14', 0.6);
  $('wGreen').onclick = () => waterPreset('#5d8a2e', 0.5);

  // ---------- Lighting ----------
  const lKeys = { lCount: 'count', lRows: 'rows', lSp: 'spacing', lCone: 'cone', lH: 'height', lBright: 'bright', lK: 'kelvin', lRoom: 'room' } as const;
  // spacing below a bulb's width snaps to 0 = auto (fill the tank)
  for (const [id, k] of Object.entries(lKeys)) $(id).oninput = e => store.edit(s => { const v = +(e.target as HTMLInputElement).value; s.light[k] = k === 'spacing' && v < 80 ? 0 : v; }, { coalesce: id });
  $<HTMLSelectElement>('lPat').onchange = e => store.edit(s => { s.light.pattern = (e.target as HTMLSelectElement).value as TankSetup['light']['pattern']; });
  $<HTMLSelectElement>('lType').onchange = e => store.edit(s => { s.light.type = (e.target as HTMLSelectElement).value as TankSetup['light']['type']; });

  // ---------- Viewer (camera): saved with the scene, but not undoable ----------
  const camKeys = { cDist: 'dist', cAz: 'az', cEl: 'el', cZoom: 'zoom' } as const;
  for (const [id, k] of Object.entries(camKeys)) $(id).oninput = e => store.cam(c => { c[k] = +(e.target as HTMLInputElement).value; });
  $('camReset').onclick = () => store.cam(c => Object.assign(c, { az: 0, el: 0, zoom: 1 }));

  // ---------- Split, display, export ----------
  $('split').onclick = () => { store.splitTank(); status('Split: Tank B is a copy you can change freely. Click a view to edit that tank.'); };
  $('camLock').onclick = () => store.setCamLock(!G().camLock);
  // an app preference: the same edge mode in every tank
  $<HTMLSelectElement>('edge').onchange = e => store.update(s => { for (const t of s.tanks) t.render.edge = (e.target as HTMLSelectElement).value as TankSetup['render']['edge']; });
  $('gridOn').onchange = e => store.edit(s => { s.render.grid = (e.target as HTMLInputElement).checked; });
  // viewpoint map: a per-viewer display preference (browser storage), not scene data
  // the map's own × and "⌖ Map" button do the same as the checkbox; the viewer places and shows one map per view
  const mapCb = $('mapOn'), applyMap = () => { $('mapShow').classList.toggle('off', mapCb.checked); viewer.invalidate(); };
  try { mapCb.checked = localStorage.getItem('tanklook.viewmap') !== 'off'; } catch { /* storage blocked: keep default */ }
  applyMap();
  const setMap = (on: boolean) => { mapCb.checked = on; try { localStorage.setItem('tanklook.viewmap', on ? 'on' : 'off'); } catch { /* ignore */ } applyMap(); };
  mapCb.onchange = () => setMap(mapCb.checked);
  for (const b of document.querySelectorAll<HTMLButtonElement>('.vmapHide')) b.onclick = () => setMap(false);
  $('mapShow').onclick = () => setMap(true);
  // first visit: open "How to use" so the orbit / zoom / drag gestures are discoverable (Muse feedback 2026-10-09)
  try { if (!localStorage.getItem('tanklook.seen')) { ($('help') as unknown as HTMLDetailsElement).open = true; localStorage.setItem('tanklook.seen', '1'); } } catch { /* ignore */ }
  // panel sections start collapsed on every load (Nathan 2026-10-09); whether the panel is hidden is a per-viewer preference
  const secs = [...document.querySelectorAll<HTMLDetailsElement>('details.sec')];
  const saveUI = () => { try { localStorage.setItem('tanklook.ui', JSON.stringify({ hidden: $('app').classList.contains('collapsed') })); } catch { /* ignore */ } };
  try {
    const ui = JSON.parse(localStorage.getItem('tanklook.ui') ?? '{}') as { hidden?: boolean };
    $('app').classList.toggle('collapsed', !!ui.hidden);
  } catch { /* storage blocked: panel shown */ }
  const showSide = (on: boolean) => { $('app').classList.toggle('collapsed', !on); saveUI(); viewer.invalidate(); };
  // split: the panel is open exactly while some view's "Edit" box is ticked (Nathan 2026-10-09). Closing it unticks
  // them; opening it ticks the tank it last showed; the boxes open / close it (on the tabs, below).
  const sideHidden = () => $('app').classList.contains('collapsed');
  $('sideClose').onclick = () => { showSide(false); if (store.split) store.clearEditing(); };
  $('sideOpen').onclick = () => { showSide(true); if (store.split && !store.targets.length) store.setEditing(G().active, true); };
  const keepRule = () => { // after split / undo / load
    if (!store.split) return;
    if (sideHidden() && store.targets.length) store.clearEditing();
    else if (!sideHidden() && !store.targets.length) store.setEditing(G().active, true);
  };
  store.subscribe(keepRule); keepRule();
  /** Open a section (e.g. Fish when an animal gets selected), so what the user just acted on is editable. */
  const openSec = (key: string) => { const d = secs.find(x => x.dataset.sec === key); if (d && !d.open) d.open = true; };
  $<HTMLSelectElement>('layout').innerHTML = Object.entries(LAYOUTS).map(([k, l]) => `<option value="${k}">${esc(l.label)}</option>`).join('');
  // a starter set replaces every piece (undoable); the pieces are then ordinary items
  const replaced = (s: TankSetup) => { s.items = starterItems(s); };
  $<HTMLSelectElement>('layout').onchange = e => {
    store.selectItem(null);
    store.edit(s => {
      s.layout.id = (e.target as HTMLSelectElement).value as LayoutId;
      if (s.layout.id === 'swamp' && s.water.level > SWAMP_LEVEL) setWaterLevel(s, SWAMP_LEVEL); // land needs to stand out of the water
      replaced(s);
    });
    status('New starter set placed. Ctrl+Z brings the previous pieces back.');
  };
  $('layoutShuffle').onclick = () => {
    const seed = 1 + Math.floor(Math.random() * 1e6);
    store.selectItem(null);
    store.edit(s => { s.layout.seed = seed; replaced(s); });
    status('Rearranged. Ctrl+Z brings the previous pieces back.');
  };

  // ---------- Aquascape items: library, selection ----------
  $('lib').innerHTML = (Object.keys(KINDS) as ItemKind[]).map(k => `<div class="libRow"><span class="flabel">${KINDS[k]}</span><div class="chips">${
    Object.entries(LIBRARY).filter(([, v]) => v.kind === k).map(([id, v]) => `<button data-lib="${id}" title="Add: ${esc(v.hint)}">${esc(v.label)}</button>`).join('')}</div></div>`).join('');
  /** Add a piece at an open spot (the candidate farthest from every other piece, front-middle preferred). Same id and
   *  seed in every tank being edited. */
  const addItem = (variant: string) => {
    const id = store.nextItemId(), seed = 1 + Math.floor(Math.random() * 1e9), r = rng(seed);
    store.edit(s => {
      const T = s.tank, it = makeItem(T, variant, id, seed, T.L / 2, T.D / 2, { yaw: LIBRARY[variant].kind === 'plant' ? 0 : Math.round((r() - 0.5) * 60) });
      let best = -1;
      for (let k = 0; k < 16; k++) {
        const x = T.L * (0.15 + r() * 0.7), d = T.D * (0.2 + r() * 0.6);
        const gap = Math.min(...s.items.filter(q => q.kind !== 'plant' || q.variant !== 'carpet').map(q => Math.hypot(q.x - x, q.depth - d)), 1e6) - Math.abs(x - T.L / 2) * 0.15;
        if (gap > best) { best = gap; it.x = x; it.depth = d; }
      }
      clampItem(it, T); s.items.push(it);
    });
    store.selectItem(id); openSec('aquascape');
  };
  document.querySelectorAll<HTMLButtonElement>('[data-lib]').forEach(b => b.onclick = () => addItem(b.dataset.lib!));
  const editItem = (fn: (it: Item, s: TankSetup) => void, coalesce?: string) => {
    const id = store.selItem; if (id == null) return;
    store.edit(s => { const it = s.items.find(q => q.id === id); if (it) { fn(it, s); clampItem(it, s.tank); } }, { coalesce });
  };
  $('iSize').oninput = e => editItem(it => { it.size = +(e.target as HTMLInputElement).value; }, 'iSize');
  $('iYaw').oninput = e => editItem(it => { it.yaw = +(e.target as HTMLInputElement).value; }, 'iYaw');
  $('iTilt').oninput = e => editItem(it => { it.tilt = +(e.target as HTMLInputElement).value; }, 'iTilt');
  $('iLift').oninput = e => editItem(it => { it.lift = +(e.target as HTMLInputElement).value; }, 'iLift');
  $('iReshape').onclick = () => { const seed = 1 + Math.floor(Math.random() * 1e9); editItem(it => { it.seed = seed; }); };
  $('iDrop').onclick = () => editItem(it => { it.lift = 0; });
  const itemDel = () => {
    const id = store.selItem; if (id == null) return;
    store.edit(s => { s.items = s.items.filter(q => q.id !== id); });
    store.selectItem(null);
  };
  const itemDup = () => {
    const src = store.selItem; if (src == null) return;
    const id = store.nextItemId();
    store.edit(s => {
      const it = s.items.find(q => q.id === src); if (!it) return;
      const n: Item = { ...it, id, x: it.x + Math.max(20, itemDims(it)[0] * 0.8), yaw: it.yaw + 25 };
      clampItem(n, s.tank); s.items.push(n);
    });
    store.selectItem(id);
  };
  $('iDup').onclick = itemDup; $('iDel').onclick = itemDel;
  let clearArm = 0;
  $('itemsClear').onclick = () => {
    const b = $<HTMLButtonElement>('itemsClear');
    if (!clearArm) { b.textContent = 'Sure? Click again'; b.classList.add('on'); clearArm = window.setTimeout(() => { clearArm = 0; b.textContent = 'Remove all'; b.classList.remove('on'); }, 3000); return; }
    clearTimeout(clearArm); clearArm = 0; b.textContent = 'Remove all'; b.classList.remove('on');
    store.edit(s => { s.items = []; }); store.selectItem(null);
    status('Every rock, piece of wood and plant removed. Ctrl+Z brings them back.');
  };
  document.querySelectorAll<HTMLButtonElement>('[data-png]').forEach(b => b.onclick = async () => {
    const mult = +b.dataset.png!;
    try { download(await viewer.exportPNG(mult), `${slug(G().name)}-${mult}x.png`); }
    catch (e) { status((e as Error).message, true); }
  });
  for (const el of document.querySelectorAll<HTMLInputElement>('input[type=range]')) el.addEventListener('change', () => store.seal());

  // ---------- sync: scene -> controls ----------
  const setVal = (id: string, v: number | string) => { const el = $(id); if (document.activeElement !== el || el.type === 'range') el.value = String(v); };
  const setOut = (id: string, txt: string, cls = '') => { const el = $<HTMLOutputElement>(id); el.textContent = txt; el.className = cls; };
  let listSig = '', jsonOpen = false, lastSelId: number | null = store.selId; // a selection restored on load does not open Fish
  let lastItem: number | null = null;
  const jsonDetails = $('json').parentElement as HTMLDetailsElement;
  jsonDetails.addEventListener('toggle', () => { jsonOpen = jsonDetails.open; syncJson(); });
  const syncJson = () => { if (jsonOpen) $('json').textContent = JSON.stringify(G(), null, 1); };

  // ---------- Stocking level from AqAdvisor: asked only when someone presses Check (AqAdvisor is a small site that went
  // down twice within an hour of automatic checks, 2026-10-09). Answers kept per tank + stocking here, and cached 7 days by
  // the proxy; shown in the sidebar and in the size label above the tank.
  const aqDone = new Map<string, number>(), aqBusy = new Set<string>(), aqErr = new Map<string, string>();
  /** Requests waiting their turn (one at a time, 30 s after a fresh answer): shown as "queued, ~N s", ticking. */
  const aqQueued = new Set<string>();
  let aqTick = 0;
  const aqWaitText = (key: string) => aqQueued.has(key) ? (aqWaitS() ? `queued, ~${aqWaitS()} s` : 'queued') : 'checking…';
  function syncAq() {
    const q = aqQuery(S());
    $('aqRow').style.display = q ? '' : 'none';
    if (!q) { $('aqNote').textContent = ''; return; }
    const key = aqKey(q), got = aqDone.get(key), busy = aqBusy.has(key);
    $<HTMLAnchorElement>('aqLink').href = aqAdvisorUrl(q);
    $('aqCheck').style.display = AQ_PROXY && got === undefined ? '' : 'none';
    $<HTMLButtonElement>('aqCheck').disabled = busy;
    $('aqOut').textContent = got !== undefined ? `${got}% (per AqAdvisor)${got > 100 ? ', overstocked' : ''}`
      : busy ? aqWaitText(key) : aqErr.get(key) ?? '';
    $('aqOut').className = got !== undefined && got > 100 ? 'bad' : '';
    $('aqNote').textContent = [
      q.standIns.length ? `Counted as a similar fish (not in AqAdvisor): ${q.standIns.map(k => `${k.count} ${k.name} as ${k.as}`).join(', ')}.` : '',
      q.skipped.length ? `Not counted (land animals): ${q.skipped.map(k => `${k.count} ${k.name}`).join(', ')}.` : ''].filter(Boolean).join(' ');
  }
  /** The last answer each view (by its key, A/B) showed, so a change to the fish or the tank keeps the old number,
   *  in yellow, until ↻ is pressed (Nathan 2026-10-09). */
  const aqLast = new Map<string, number>();
  /** Check: one request for one tank. A failure is shown and can be retried; it is not remembered. An answer already
   *  known is not asked again. */
  const aqCheck = async (s: TankSetup) => {
    const q = aqQuery(s);
    if (!q || !AQ_PROXY) return;
    const key = aqKey(q);
    const keep = () => { for (const v of viewer.active) { const vq = aqQuery(v.S); if (vq && aqKey(vq) === key) aqLast.set(v.key, aqDone.get(key)!); } };
    if (aqDone.has(key)) { keep(); viewer.invalidate(); return; }
    if (aqBusy.has(key)) return;
    aqBusy.add(key); aqQueued.add(key); aqErr.delete(key); syncAq(); viewer.invalidate();
    if (!aqTick) aqTick = window.setInterval(() => {
      syncAq(); viewer.invalidate();
      if (!aqQueued.size) { clearInterval(aqTick); aqTick = 0; }
    }, 1000);
    const started = () => { aqQueued.delete(key); syncAq(); viewer.invalidate(); };
    try { aqDone.set(key, await fetchStocking(q, started)); keep(); }
    catch (e) {
      const m = e instanceof Error ? e.message : '';
      aqErr.set(key, m === 'proxy 429' ? 'busy, try again in a minute' : m === 'proxy 503' ? 'AqAdvisor is resting, try in 10 minutes' : "AqAdvisor didn't answer, try later");
    }
    aqQueued.delete(key); aqBusy.delete(key); syncAq(); viewer.invalidate();
  };
  $('aqCheck').onclick = () => aqCheck(S());

  function sync() {
    const s = S(), A = s.tank, u = G().units;
    $<HTMLButtonElement>('undo').disabled = !store.canUndo; $<HTMLButtonElement>('redo').disabled = !store.canRedo;
    setVal('sceneName', G().name);
    $('uIn').classList.toggle('on', u === 'in'); $('uCm').classList.toggle('on', u === 'cm');
    for (const k of ['L', 'H', 'D'] as const) setVal('a' + k, toUnit(A[k], u));
    for (const id of ['aL', 'aH', 'aD']) $(id).step = u === 'in' ? '0.5' : '1';
    const sh = shapeOf(A);
    setVal('shapeSel', sh); $('sidesRow').style.display = sh === 'poly' ? '' : 'none'; $('bowRow').style.display = sh === 'bow' ? '' : 'none';
    for (const n of POLY_SIDES) $('sides' + n).classList.toggle('on', sh === 'poly' && A.sides === n);
    $('aLLab').textContent = sh === 'round' ? 'Diameter' : sh === 'poly' ? 'Width' : 'Length';
    $('aDLab').textContent = sh === 'bow' ? 'Centre depth' : 'Depth';
    $('aD').parentElement!.style.display = sh === 'round' || sh === 'poly' ? 'none' : ''; // depth follows from the diameter / width
    if (sh === 'bow') { const b = $('bowMin'); b.min = String(Math.ceil(Math.max(20, bowMinLimit(A)))); b.max = String(Math.floor(A.D)); setVal('bowMin', A.bowMin ?? A.D); setOut('oBow', fmt(A.bowMin ?? A.D)); }
    $('shapeHint').textContent = sh === 'rect' ? '' : sh === 'bow' ? 'Bowfront: the front glass is a curve from the end depth out to the full depth at the centre.'
      : (sh === 'round' ? 'Round: one curved glass wall.' : `${A.sides} flat panes, one facing you.`) + ' No hood or peninsula ends for this shape.';
    $('shapeHint').style.display = sh === 'rect' ? 'none' : '';
    ($('lidHood') as HTMLButtonElement).disabled = !flatEnds(A);
    for (const id of ['wallLeft', 'wallRight']) ($(id) as HTMLButtonElement).disabled = !flatEnds(A);
    // which tank the panel edits (split view)
    const tg = store.targets;
    $('editing').hidden = !store.split;
    $('editing').textContent = tg.length > 1 ? 'Editing both tanks: changes here apply to Tank A and Tank B.'
      : `Editing Tank ${'AB'[tg[0]]} only: tick “Edit” on the other view to change both.`;
    const vol = volume(A);
    // footprint: the outer glass outline, i.e. what stands on the stand
    // labelled "outside the glass" with its outer size, so it does not read as a wrong product of the interior size
    const outer = offsetRing(A, glassThickness(A, s.render.glass)), fpMm2 = ringArea(outer);
    const ext = (k: 0 | 1) => Math.max(...outer.map(p => p[k])) - Math.min(...outer.map(p => p[k]));
    const fpTxt = `${fmt(ext(0))} × ${fmt(ext(1))} outside the glass (${u === 'in' ? `${Math.round(fpMm2 / (IN * IN)).toLocaleString()} sq in` : `${Math.round(fpMm2 / 100).toLocaleString()} cm²`})`;
    $('volA').textContent = `${vol.gallons.toFixed(1)} US gal · ${vol.litres.toFixed(0)} L interior · footprint ${fpTxt}`;
    const wt = tankWeight(s), kgs = (kg: number) => (u === 'in' ? `${Math.round(kg * 2.20462)} lb` : `${Math.round(kg)} kg`);
    $('wtA').textContent = `≈ ${kgs(wt.total)} filled: water ${kgs(wt.water)} (${(u === 'in' ? wt.waterLitres / 3.785 : wt.waterLitres).toFixed(0)} ${u === 'in' ? 'gal' : 'L'}), substrate ${kgs(wt.substrate)}, glass ${kgs(wt.glass)}`;
    syncAq();
    $('rimY').classList.toggle('on', s.render.rim); $('rimN').classList.toggle('on', !s.render.rim);
    for (const [id, lid] of LIDS) $(id).classList.toggle('on', s.lid === lid);
    setVal('bgSel', s.render.bg); setVal('glassSel', String(s.render.glass)); setVal('glassType', s.render.glassType);
    const t = glassThickness(A, s.render.glass);
    $('glassHint').textContent = (s.render.glass === 'auto' ? 'Auto: ' : 'Glass: ') + t + ' mm (' + fmtLen(t, u, 2) + ')';

    $('standOn').checked = s.stand.show; setVal('standFinish', s.stand.finish); setVal('standStyle', s.stand.style); setVal('standH', s.stand.height);
    setOut('oStandH', fmt(s.stand.height));
    const tb = s.stand.table, tr = tableRange(s);
    $('tableRows').style.display = s.stand.show && s.stand.style === 'table' ? '' : 'none';
    $('tableRect').classList.toggle('on', tb.shape === 'rect'); $('tableRound').classList.toggle('on', tb.shape === 'round');
    $('tableLLab').textContent = tb.shape === 'round' ? 'Table diameter' : 'Table length'; $('tableDRow').style.display = tb.shape === 'round' ? 'none' : '';
    $('tableL').min = String(Math.ceil(tr.minL)); $('tableD').min = String(Math.ceil(tr.minD)); $('tableL').max = $('tableD').max = String(TABLE_MAX);
    $('tableX').min = String(Math.floor(tr.x0)); $('tableX').max = String(Math.ceil(tr.x1)); $('tableZ').min = String(Math.floor(tr.z0)); $('tableZ').max = String(Math.ceil(tr.z1));
    setVal('tableL', tb.L); setVal('tableD', tb.D); setVal('tableX', tb.x); setVal('tableZ', tb.z);
    setOut('oTableL', fmt(tb.L)); setOut('oTableD', fmt(tb.D));
    const off = (v: number, neg: string, pos: string) => (Math.abs(v) < 1 ? 'Centred' : `${fmt(Math.abs(v))} ${v < 0 ? neg : pos}`);
    setOut('oTableX', off(tb.x, 'left', 'right')); setOut('oTableZ', off(tb.z, 'forward', 'back'));
    $('wallOn').checked = s.wall.show; setVal('wallColor', s.wall.color);
    for (const [id, side] of [['wallBack', 'back'], ['wallLeft', 'left'], ['wallRight', 'right']] as const)
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
    if (f && f.id !== lastSelId) openSec('fish');
    lastSelId = f?.id ?? null;
    $('selBox').classList.toggle('off', !f);
    for (const id of ['fX', 'fY', 'fZ']) $(id).min = '0';
    $('fX').max = String(A.L); $('fY').max = String(waterY(A, s.water.level)); $('fZ').max = String(A.D);
    const fsp = f && getSpecies(f.species);
    $('fY').disabled = !!fsp && (restsOnFloor(fsp, f!.surface) || (fsp.kind !== 'snail' && restsOnGround(s, A, fsp, f!.x, f!.depth, fishTL(f!, fsp) * fsp.aspect)));
    if (f) {
      for (const [id, k] of Object.entries(fishKeys)) setVal(id, f[k]);
      setOut('oX', fmt(f.x)); setOut('oY', fmt(f.y)); setOut('oZ', fmt(f.depth));
      const pct = Math.round(fishTL(f, fsp!) / fsp!.tl * 100);
      setVal('fSize', pct); setOut('oSize', f.tl ? `${fmt(f.tl)} · ${pct}%` : `Adult · ${fmt(fsp!.tl)}`);
      setOut('oYaw', f.yaw + '°'); setOut('oPitch', f.pitch + '°'); setOut('oRoll', f.roll + '°'); setOut('oBend', f.bend.toFixed(2));
    }

    const sub = s.substrate, smax = Math.round(A.H * 0.5);
    setVal('subType', sub.show ? sub.type : 'bare');
    for (const [id, k] of Object.entries(SUBK)) { $(id).max = String(smax); setVal(id, sub[k]); setOut('o' + id[0].toUpperCase() + id.slice(1), fmt(sub[k])); }

    const te = s.terrain, editing = viewer.terrainEdit.on && te.on;
    $('terOn').checked = te.on; setVal('terCols', te.cols);
    setOut('oTerCols', te.h.length ? `${te.cols} × ${te.rows} points` : `${te.cols} across`);
    for (const id of ['terEdit', 'terFlat', 'terCols']) ($(id) as HTMLInputElement).disabled = !te.on;
    $('terEdit').classList.toggle('on', editing); $('terEdit').textContent = editing ? 'Done editing' : 'Edit points';
    $('terHint').textContent = !te.on ? 'Custom terrain turns the floor into a grid of points you can push down or pull up, with a smooth surface through them. It starts from the current floor.'
      : editing ? 'Drag a dot up or down. Drag empty space to orbit; look from above to reach the back points.' : 'Corner sliders are off while custom terrain is on.';
    for (const id of ['subBL', 'subBR', 'subFL', 'subFR', 'subLevel', 'subFB', 'subLR', 'subCorner']) ($(id) as HTMLInputElement).disabled = te.on || !sub.show;

    const wa = s.water;
    $('wOn').checked = wa.on;
    for (const id of ['wLevel', 'wOpac', 'wColor', 'wClear', 'wTannin', 'wGreen']) ($(id) as HTMLInputElement).disabled = !wa.on;
    setVal('wLevel', wa.level); setOut('oLevel', wa.level >= 1 ? 'Full' : `${fmt(waterY(A, wa.level))} high`);
    setVal('wOpac', wa.opacity); setOut('oOpac', wa.opacity < 0.01 ? 'Clear' : Math.round(wa.opacity * 100) + '%'); setVal('wColor', wa.color);

    const l = s.light; setVal('lType', l.type);
    for (const [id, k] of Object.entries(lKeys)) setVal(id, l[k]);
    setOut('oCount', String(l.count)); setOut('oRows', String(l.rows)); setOut('oBright', '×' + l.bright.toFixed(2)); setOut('oK', l.kelvin + ' K'); setOut('oRoom', l.room.toFixed(2));
    $('lCountRow').style.display = l.type === 'spot' || l.type === 'tube' ? '' : 'none';
    $('lCountLab').textContent = l.type === 'tube' ? 'Tubes' : 'Bulbs';
    for (const id of ['lRowsRow', 'lPatRow', 'lSpRow', 'lConeRow']) $(id).style.display = l.type === 'spot' ? '' : 'none';
    setVal('lPat', l.pattern); setOut('oLSp', l.spacing ? fmt(l.spacing) : 'Auto'); setOut('oLCone', l.cone + '°');
    setOut('oLH', s.lid === 'hood' ? 'In hood' : fmt(l.height) + ' above');
    $('lHRow').style.display = l.type === 'flat' ? 'none' : ''; ($('lH') as HTMLInputElement).disabled = s.lid === 'hood';

    const c = s.camera;
    for (const [id, k] of Object.entries(camKeys)) setVal(id, c[k]);
    setOut('oDist', fmt(c.dist)); setOut('oAz', c.az + '°', Math.abs(c.az) > 30 ? 'warn' : '');
    setOut('oEl', c.el + '°', c.el > 25 || c.el < 0 ? 'warn' : ''); setOut('oZoom', '×' + c.zoom.toFixed(2));
    const beyond = Math.abs(c.az) > 30 || c.el > 25 || c.el < 0;
    $('camHint').innerHTML = beyond
      ? '<span class="warn">Steep angle: flat fish cards start to look like paper here.</span>'
      : 'Distance is from your eye to the front glass, the same for every tank. Zoom only crops; it never changes perspective.';

    ($('split') as HTMLButtonElement).disabled = store.split;
    $('splitHint').textContent = store.split ? 'Each view’s tab (top of the view) opens on hover: what differs, Save that tank on its own, or Delete it. Save… at the top saves both in one file.' : 'Copy this tank into a second, independent one beside it, then change anything in either.';
    setVal('edge', s.render.edge); $('gridOn').checked = s.render.grid; 
    setVal('layout', s.layout.id); $('layoutHint').textContent = LAYOUTS[s.layout.id].hint + ' Then move, add or remove any piece.';
    ($('layoutShuffle') as HTMLButtonElement).disabled = s.layout.id === 'none';
    const nk = (k: ItemKind) => s.items.filter(q => q.kind === k).length;
    $('itemCount').textContent = s.items.length ? (Object.keys(KINDS) as ItemKind[]).filter(k => nk(k)).map(k => `${nk(k)} ${KINDS[k].toLowerCase()}`).join(', ') : 'Nothing placed yet. Pick a piece above to add it.';
    ($('itemsClear') as HTMLButtonElement).disabled = !s.items.length;
    const it = store.selectedItem;
    if (it && it.id !== lastItem) openSec('aquascape');
    lastItem = it?.id ?? null;
    $('itemBox').hidden = !it;
    if (it) {
      const v = LIBRARY[it.variant], [l, h, w] = itemDims(it);
      $('itemName').innerHTML = `${esc(v.label)} <i>${fmt(l)} × ${fmt(h)} high × ${fmt(w)}</i>`;
      $('iSizeLab').textContent = it.kind === 'plant' ? (it.variant === 'carpet' ? 'Width' : 'Height') : it.variant === 'manzanita' ? 'Height' : 'Length';
      const probe = { ...it, size: 1e6 }; clampItem(probe, A);
      $('iSize').min = String(Math.min(v.min, probe.size)); $('iSize').max = String(probe.size);
      setVal('iSize', it.size); setOut('oISize', fmt(it.size));
      setVal('iYaw', it.yaw); setOut('oIYaw', it.yaw + '°'); setVal('iTilt', it.tilt); setOut('oITilt', it.tilt + '°');
      $('iLift').max = String(Math.round(A.H)); setVal('iLift', Math.round(it.lift)); setOut('oILift', it.lift < 1 ? 'On the ground' : fmt(it.lift));
    }
    syncJson();
  }

  // ---------- after each draw: viewport labels + readout (same frame as the render) ----------
  let tabSig = '';
  /** The stocking level in a view's label, always there (Nathan 2026-10-09): a hint with no fish; the AqAdvisor answer
   *  with ↻ to ask again; the last answer in yellow once the fish or the tank have changed since it was asked. */
  const aqChip = (s: TankSetup, slot: string, i: number) => {
    const q = aqQuery(s);
    if (!q) return `<span class="aq none">${!s.fish.length ? 'Add fish to show stocking level' : !s.water.on ? 'Add water to show stocking level' : 'No fish AqAdvisor can count'}</span>`;
    const url = esc(aqAdvisorUrl(q));
    if (!AQ_PROXY) return `<a class="aq" href="${url}" target="_blank" rel="noopener" title="This tank's stocking on aqadvisor.com">Stocking on AqAdvisor ↗</a>`;
    const key = aqKey(q), got = aqDone.get(key), last = aqLast.get(slot), busy = aqBusy.has(key);
    const stale = got === undefined && last !== undefined;
    // ↻ only when there is something to fetch (Nathan 2026-10-09): never checked, out of date, or the last try failed;
    // hidden once this tank's current answer is shown
    const re = got !== undefined ? '' : `<button class="aqre${stale ? ' stale' : ''}" data-aq="${i}"${busy ? ' disabled' : ''} title="${stale ? 'The fish or the tank changed since this was checked: click to refresh the stocking level' : 'Ask AqAdvisor for this tank’s stocking level'}" aria-label="Refresh stocking level">↻</button>`;
    const pct = got ?? last;
    const text = busy ? `Stocking: ${aqWaitText(key)}` : pct !== undefined ? `Stocking ${pct}% (AqAdvisor)` : aqErr.get(key) ?? 'Stocking: not checked';
    const cls = `aq${stale ? ' stale' : pct !== undefined && pct > 100 ? ' over' : ''}`;
    const tip = stale ? 'Out of date: the fish or the tank changed since this was checked. Press ↻ to refresh.' : 'AqAdvisor’s stocking level for this tank (aqadvisor.com); click for the full report';
    return `<span class="aqwrap"><a class="${cls}" href="${url}" target="_blank" rel="noopener" title="${tip}">${esc(text)}</a>${re}</span>`;
  };
  viewer.onDrawn(() => {
    const g = G(), active = viewer.active, split = active.length > 1;
    const diff = split ? tankDiff(g.tanks[0], g.tanks[1], g.units) : [];
    const hidden = $('app').classList.contains('collapsed');
    const sig = JSON.stringify([diff, hidden, g.units, g.active, store.targets, g.camLock, active.map(v => [v.x, v.w]), split || fmtDims(g.tanks[0].tank, g.units), active.map((v, i) => aqChip(v.S, v.key, i))]);
    if (sig !== tabSig) {
      tabSig = sig;
      for (const [i, id] of [[0, 'labA'], [1, 'labB']] as const) {
        const el = $<HTMLDivElement>(id), vp = active[i];
        el.style.display = vp ? '' : 'none';
        if (!vp) { el.innerHTML = ''; continue; }
        // top-right corner of each view (Nathan 2026-10-08); the panel's "› Edit" button has the top-left
        el.style.right = (viewer.host.clientWidth - vp.x - vp.w + 8) + 'px'; el.style.maxWidth = Math.max(80, vp.w - 16 - (vp.x === 0 && hidden ? 80 : 0)) + 'px'; // clear of "› Edit"
        const ed = store.isEditing(i);
        el.classList.toggle('tab', split); el.classList.toggle('on', split && ed);
        if (!split) { // one tank: its size, and the way into a side-by-side comparison
          el.innerHTML = `<span>${esc(fmtSize(vp.T, g.units))}</span>` + aqChip(vp.S, vp.key, i) + `<button class="close" data-split title="Copy this tank into a second, independent one beside it">⧉ Split to compare</button>`;
          continue;
        }
        // the "Edit" box: the panel's changes apply to every view ticked here
        const only = ed && store.targets.length === 1;
        const box = `<label class="edbox" title="${only ? `Untick to close the panel` : ed ? `The panel's changes apply to Tank ${vp.key}` : `Apply the panel's changes to Tank ${vp.key} (opens the panel)`}">` +
          `<input type="checkbox" data-edit="${i}"${ed ? ' checked' : ''}> Edit</label>`;
        // packed in two rows (Nathan 2026-10-09): stocking + Edit on top; then what differs (nothing = the same tank,
        // no labels) and Save, Delete flowing together, wrapping only when the view is too narrow.
        // The second row stays folded until the tab is hovered (Nathan 2026-10-09); the ▾ hint carries the count.
        const hint = `<span class="more" aria-hidden="true">${diff.length ? `${diff.length} diff${diff.length === 1 ? '' : 's'} ` : ''}▾</span>`;
        el.innerHTML = `<div class="hd">${aqChip(vp.S, vp.key, i)}${hint}${box}</div>` + `<div class="diffs">${diff.map((d, k) => `<span>${esc(d[i])}<button class="match" data-match="${i},${k}" title="Make Tank ${vp.key} match Tank ${active[1 - i].key} here" aria-label="Match the other tank: ${esc(d[i])}">×</button></span>`).join('')}` +
          `<div class="acts"><button class="close" data-save="${i}" title="Save Tank ${vp.key} on its own as a single-tank file">Save</button>` +
          `<button class="close" data-delete="${i}" title="Delete Tank ${vp.key} and end the split view (Ctrl+Z brings it back)">Delete</button></div></div>`;
      }
      const lock = $<HTMLButtonElement>('camLock');
      lock.hidden = !split;
      if (split) {
        lock.style.left = (active[1].x - 4) + 'px';
        lock.classList.toggle('on', g.camLock);
        lock.innerHTML = padlock(g.camLock); lock.setAttribute('aria-pressed', String(g.camLock));
        lock.setAttribute('aria-label', g.camLock ? 'Cameras locked together' : 'Cameras unlocked');
        lock.title = g.camLock ? 'Views move together (one field of view). Click to move each view on its own.' : 'Views move separately. Click to lock them together again (Tank B snaps to Tank A’s view).';
      }
    }
    readout();
  });
  for (const id of ['labA', 'labB']) $(id).addEventListener('change', e => {
    const cb = (e.target as HTMLElement).closest<HTMLInputElement>('[data-edit]');
    if (!cb) return;
    // ticking one opens the panel; unticking the last one closes it
    if (cb.checked) { showSide(true); store.setEditing(+cb.dataset.edit!, true); return; }
    if (store.targets.length === 1) showSide(false);
    store.setEditing(+cb.dataset.edit!, false);
  });
  for (const id of ['labA', 'labB']) $(id).addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('[data-split]')) { $('split').click(); return; }
    const re = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-aq]');
    if (re) { const vp = viewer.active[+re.dataset.aq!]; if (vp) void aqCheck(vp.S); return; }
    const sv = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-save]');
    if (sv) { saveTank(+sv.dataset.save!); return; }
    const mt = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-match]');
    if (mt) { // this tank takes the other tank's setting, so the difference (both boxes) goes away
      const [i, k] = mt.dataset.match!.split(',').map(Number), g = G(), d = tankDiff(g.tanks[0], g.tanks[1], g.units)[k];
      if (d) { store.update(s => d[2](s.tanks[i], s.tanks[1 - i])); status(`Tank ${'AB'[i]} now matches Tank ${'AB'[1 - i]}: ${d[1 - i]}. Ctrl+Z undoes it.`); }
      return;
    }
    const at = (k: string) => (e.target as HTMLElement).closest<HTMLButtonElement>(`[data-${k}]`)?.dataset[k];
    const del = at('delete');
    if (del === undefined) return;
    const i = +del;
    store.closeTank(i); status(`Tank ${'AB'[i]} deleted. Ctrl+Z brings it back.`);
  });
  function readout() {
    const f = sel(), ro = $<HTMLDivElement>('ro');
    const m = f && viewer.measure(f), sp = f && getSpecies(f.species);
    if (!f || !m || !sp) { ro.innerHTML = '<span class="hint">Select a fish to see its size on screen.</span>'; return; }
    const a = m.sideAngle, cls = a < 40 ? 'ok' : a < 55 ? 'warn' : 'bad';
    const txt = a < 40 ? 'reads fine' : a < 55 ? 'marginal' : 'too thin: card looks flat';
    let html = `<div><span><b>${esc(sp.name)}</b> <i>${esc(sp.sci)}</i></span><span>${f.tl ? `${fmt(f.tl)} (adult ${fmt(sp.tl)})` : `adult ${fmt(sp.tl)}`}</span></div>
      <div><span>Depth behind glass</span><span>${fmt(f.depth)}</span></div>
      <div><span>Looks, vs. at the front glass</span><span>${Math.round(100 * m.len / m.ref)} % as big</span></div>`;
    // calibration readouts only with ?debug in the URL (Muse feedback 2026-10-09: cryptic for normal users)
    if (DEBUG) html += `<div><span>On screen</span><span>${m.len.toFixed(0)} px</span></div>
      <div><span>Same pose at the front glass</span><span>${m.ref.toFixed(0)} px</span></div>
      <div><span>Measured ratio</span><span>×${(m.len / m.ref).toFixed(3)}</span></div>
      <div><span>Straight-on formula d ÷ (d + z)</span><span>×${m.formula.toFixed(3)}</span></div>
      <div><span>Angle off side-on</span><span class="${cls}">${a.toFixed(0)}°: ${txt}</span></div>`;
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

/** Padlock icon: closed shackle (views move together) or swung open (each view on its own). */
function padlock(locked: boolean) {
  const shackle = locked ? 'M8 11V8a4 4 0 0 1 8 0v3' : 'M8 11V8a4 4 0 0 1 7.6-1.8';
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">` +
    `<path d="${shackle}"/><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none"/></svg>`;
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
