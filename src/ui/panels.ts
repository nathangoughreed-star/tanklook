// Sidebar wiring. Inputs write through store.update(); one sync() pulls every control back from the scene,
// so undo/redo, file open and pointer drags all refresh the panels the same way.
import { rng } from '../art/paint';
import { GRAIN_LOOK, SUBSTRATES, drawFishCard } from '../art/placeholder';
import { drawSnailCard } from '../art/snails';
import { CATEGORIES, SPECIES, fishTL, getSpecies, needsWater, searchSpecies, speciesOf, speciesTag, type Category, type Sex, type Species } from '../data/species';
import { BACKGROUNDS, STAND_FINISHES } from '../render/build';
import { BACKDROPS } from '../render/backdrop';
import { MAP_DIV, MAP_STEP, emitters, mapStepOf } from '../render/lighting';
import { darkOf, darkStats } from '../render/lightShells';
import { EXP_MAX, EXP_MIN, FIXTURES, FIX_SPEC, MH_BULBS, TECHS, fitFixture, fixtureOf, mountOf, powerRange, lightOutCached, readout as lightReadout, techOf, techsFor, tubeLayout, tubeOf, TUBE_SP_MAX, bestPos, ledBarDepth, posMax, wattsOf, type Fixture } from '../scene/lightout';
import { SpeciesPreview } from '../render/preview3d';
import type { Viewer } from '../render/viewer';
import { emptyScene, TANK_PRESETS } from '../scene/defaults';
import { COMPS, DEFAULT_DENS, EPIPHYTES, KINDS, perch, densName, LAYOUTS, LIBRARY, LIFT_SINK, clampItem, hasSpread, itemDims, makeItem, spreadMax, type Layer } from '../scene/items';
import { handEdits, regenerate } from '../scene/starter';
import { styleGround } from '../scene/scapeground';
import { growthOf, isClump, isFloat, isPatch, type PlantType } from '../art/plants';
import { clumpAuto } from '../render/plant3d';
import { canPrebuild, plantWarm, prebuildHooks, prebuildPlants } from '../render/items';
import { placeAt, type PlaceAt } from '../interact/pointer';
import { tankDiff } from './diff';
import { attachTypeIns, parseLen, plainNum, tidy, type TypeIn } from './typein';
import {
  CEILING_MAX, CEILING_MIN, IN, backdropDepth, ceilingH, clamp, clampFish, fmtLen, fromUnit, glassThickness, rescaleTank, toUnit, volume, WALL_GAP_MAX, waterY,
} from '../scene/physics';
import type { Store } from '../scene/store';
import { SWAMP_LEVEL, groundHeight, nearestLand, sameGrid, sampleTerrain } from '../scene/terrain';

/** Arrow keys move the selected piece: [axis, direction] (depth grows toward the back). */
const ARROWS: Record<string, [string, number]> = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['d', 1], ArrowDown: ['d', -1], PageUp: ['y', 1], PageDown: ['y', -1] };
import { placeNew, randomPose, randomSize, shuffleFish } from '../scene/scatter';
import { fitFish, keepInWater, setWaterLevel } from '../scene/water';
import { tankWeight } from '../scene/weight';
import { AQ_PROXY, aqAdvisorUrl, aqKey, aqQuery, aqWaitS, fetchAqHealth, fetchStocking, type AqHealth } from '../data/aqadvisor';
import { BOWL_DEFAULT, BOWL_MAX, BOWL_MIN, PIE_DEFAULT, POLY_SIDES, SHAPES, bowMinLimit, offsetRing, ringArea, shapeOf } from '../scene/shape';
import { TABLE_MAX, tableOn, tableRange, wallGap } from '../scene/table';
import type { BgFit, BgSide, CompId, Fish, GrowFeed, Item, ItemKind, LayoutId, LightTech, Scene, TableSettings, Tank, TankSetup, TankShape } from '../scene/types';
import { FEED_NAMES, setGrowTime, setPlantGrowth, timeChanges } from '../scene/growtime';
import { GLASS_CHOICES, LIMITS, SceneError, parseScene } from '../scene/validate';
import { deleteFromLib, listLib, loadFromLib, saveToLib } from '../scene/library';
import { EXAMPLES, exampleScenes } from '../examples';
import { LONG_LINK, readShare, shareUrl } from '../scene/share';
import { getImage, putImage, readPicture, sceneImageIds, sidesTouch, withImages } from '../scene/images';

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
/** ?debug in the URL shows calibration readouts (apparent-size maths) in the fish readout. */
const DEBUG = new URLSearchParams(location.search).has('debug');
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** The menu a kind of piece lives in: stones, wood and caves under Hardscape, plants and corals under Plants. */
export type ScapeSec = 'hardscape' | 'plants';
export const scapeSec = (k: ItemKind): ScapeSec => k === 'plant' || k === 'coral' ? 'plants' : 'hardscape';

/** A plant's growth in words (the Growth slider's readout). */
export const growthWord = (g: number) => `${Math.round(g * 100)} % ${g < 0.1 ? 'just planted' : g < 0.35 ? 'growing in' : g < 0.65 ? 'established' : g < 0.9 ? 'grown' : 'overgrown'}`;

export function attachPanels(store: Store, viewer: Viewer) {
  const G = () => store.scene;   // the whole scene: name, units, the tanks
  const S = () => store.tank;    // the tank the panel shows; edits go to every view with "Edit" ticked (store.edit)
  const fmt = (mm: number) => fmtLen(mm, G().units);
  const sel = () => store.selected;
  /** Drag something out of the panel into the tank (Nathan 2026-10-15: a library chip, a species row); a plain click
   *  still does what it did. Past a few px the press becomes a drag: a label rides with the pointer, `move` hears where
   *  it would land (null = not over a tank's floor) and `drop` where it was let go; the click that follows is swallowed.
   *  Mouse and pen only: a finger on the panel scrolls it. */
  const dragOut = (e: PointerEvent, label: string, h: { move?: (at: PlaceAt | null) => void; drop: (at: PlaceAt | null) => void; skip?: () => Set<number> }) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    e.preventDefault(); // (no text selection while dragging)
    const x0 = e.clientX, y0 = e.clientY;
    let ghost: HTMLElement | null = null;
    const at = (ev: PointerEvent) => placeAt(viewer, store, ev.clientX, ev.clientY, h.skip?.());
    const mv = (ev: PointerEvent) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        ghost = document.createElement('div'); ghost.className = 'dragGhost'; ghost.textContent = label;
        document.body.append(ghost); document.body.classList.add('placing');
      }
      ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 10}px)`;
      const p = at(ev); ghost.classList.toggle('ok', !!p); h.move?.(p);
    };
    const end = (ev: PointerEvent) => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      if (!ghost) return;
      ghost.remove(); document.body.classList.remove('placing');
      const eat = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
      addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, { capture: true }), 0);
      h.drop(ev.type === 'pointerup' ? at(ev) : null);
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  };
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
  const recenter = $('recenter'); recenter.onclick = () => viewer.resetPan();
  viewer.onPan(() => { recenter.hidden = !viewer.panned; });
  $('redo').onclick = () => store.redo();
  $('newScene').onclick = () => {
    if (G().tanks.some(t => t.fish.length) && !confirm('Start a new, empty tank? (Undo brings this one back.)')) return;
    const s = emptyScene(); s.name = 'New tank';
    s.tanks[0].camera = { ...S().camera }; s.units = G().units;
    store.replace(s); setLibId(null); status('New tank. Undo brings the previous one back.');
  };
  // Open… shows the tanks saved in this browser (with pictures) and the way to open a downloaded file
  const dlg = $<HTMLDialogElement>('libDlg');
  $('openScene').onclick = () => { renderExamples(); renderLib(); dlg.showModal(); };
  $('openFile').onclick = () => { dlg.close(); $('fileIn').click(); };
  // Opening rebuilds the tank in one blocking frame (several seconds for a full tank): show the spinner, let it paint,
  // then open; it clears on the first draw after, which is the one that built the tank.
  const busy = $('busy');
  let busyArmed = false;
  viewer.onDrawn(() => { if (busyArmed) { busyArmed = false; busy.hidden = true; } });
  /** `open` returns false when it could not open (it reports why itself). */
  const whileOpening = (name: string, open: () => boolean) => {
    $('busyText').textContent = `Opening “${name}”…`; busy.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (open()) { busyArmed = true; viewer.invalidate(); } else busy.hidden = true;
    }));
  };
  $('fileIn').onchange = async () => {
    const input = $('fileIn'), file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (file.size > 5e6) { status('That file is too large to be a scene (over 5 MB).', true); return; }
    let parsed: ReturnType<typeof parseScene>;
    try { parsed = parseScene(await file.text()); } catch (e) {
      status(e instanceof SceneError ? e.message : 'Could not open that file.', true); return;
    }
    const { scene, warnings } = parsed;
    whileOpening(scene.name, () => {
      try { store.replace(scene); } catch { status('Could not open that file.', true); return false; }
      // an opened file goes straight into the saved list (Nathan 2026-10-14); the same file opened again reuses its entry
      let saved = '';
      try {
        const txt = JSON.stringify(G()), twin = listLib().find(x => x.name === scene.name && localStorage.getItem(`tanklook.lib.${x.id}`) === txt);
        let thumb = ''; try { thumb = viewer.thumbnail(); } catch { /* no picture: still save the tank */ }
        setLibId(saveToLib(G(), thumb, twin?.id).id);
        saved = ' Added to your saved tanks.';
      } catch (err) { setLibId(null); saved = ' ' + (err as Error).message; }
      status(`Opened "${scene.name}".${saved}` + (warnings.length ? ' ' + warnings.join(' ') : ''), warnings.length > 0);
      return true;
    });
  };
  /** The browser-saved tank this scene came from (or was last saved as): Save updates it without asking. */
  const LIB_CUR = 'tanklook.libCurrent';
  const libId = () => { try { return localStorage.getItem(LIB_CUR); } catch { return null; } };
  const setLibId = (id: string | null) => { try { if (id) localStorage.setItem(LIB_CUR, id); else localStorage.removeItem(LIB_CUR); } catch { /* ignore */ } };
  const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  function renderLib() {
    const list = listLib(), box = $<HTMLDivElement>('libList');
    box.innerHTML = list.length ? list.map(e =>
      `<div class="libcard"><button class="libopen" data-lib="${esc(e.id)}" title="Open “${esc(e.name)}”">` +
      (e.thumb ? `<img src="${esc(e.thumb)}" alt="" loading="lazy">` : '<span class="nothumb">No picture</span>') + `<b>${esc(e.name)}</b>` +
      `<span class="hint">${esc(when(e.saved))}${e.tanks > 1 ? ' · 2 tanks' : ''}</span></button>` +
      `<button class="libdel" data-libdel="${esc(e.id)}" title="Delete “${esc(e.name)}” from this browser" aria-label="Delete ${esc(e.name)}">×</button></div>`).join('')
      : '<p class="hint">No tanks saved in this browser yet. <i>Save</i> puts the current tank here.</p>';
  }
  // Examples (lane F): bundled scenes, opened like a file (a new, unsaved tank; Undo brings the previous one back)
  // The scene files are a lazy chunk (lane EF3): fetched once the list's pictures are in (on a slow line they would
  // otherwise share it with them), so it has arrived before a click; a click before that waits for it
  function renderExamples(id = 'exList') {
    const box = $<HTMLDivElement>(id);
    if (!box.childElementCount) box.innerHTML = EXAMPLES.map(x =>
      `<div class="libcard"><button class="libopen" data-ex="${esc(x.id)}" title="${esc(x.hint)}">` +
      `<img src="${esc(x.thumb)}" alt=""><b>${esc(x.name)}</b><span class="hint">${esc(x.hint)}</span></button></div>`).join('');
    Promise.allSettled([...box.querySelectorAll('img')].map(i => i.decode()))
      .then(exampleScenes).catch(() => { /* offline: a click tries again and says so */ });
  }
  $('exList').onclick = e => openExample(e, dlg);
  async function openExample(e: MouseEvent, from: HTMLDialogElement) {
    const op = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ex]'), x = op && EXAMPLES.find(q => q.id === op.dataset.ex);
    if (!x) return;
    from.close();
    let text: string;
    try { text = (await exampleScenes())[x.id]; } catch {
      status('Could not load the examples (no connection?). Try again in a moment.', true); return;
    }
    whileOpening(x.name, () => {
      try {
        const { scene } = parseScene(text);
        store.replace(scene); setLibId(null);
        status(`Opened the example "${scene.name}". Undo brings the previous tank back; Save keeps your own copy.`);
        return true;
      } catch {
        status('Could not open that example.', true); return false;
      }
    });
  }
  // Start menu (Nathan 2026-10-14: "upon start, a menu in the middle of the screen: start fresh or from an example"):
  // shown only when no tank was restored from this browser (Nathan 2026-10-14); Esc keeps the empty tank
  const startDlg = $<HTMLDialogElement>('startDlg');
  $('startEx').onclick = e => openExample(e, startDlg);
  $('startFresh').onclick = () => startDlg.close(); // the tank on screen is already a fresh one
  function showStart() {
    renderExamples('startEx');
    startDlg.showModal();
    $('startFresh').focus();
  }
  $('libList').onclick = e => {
    const t = e.target as HTMLElement, del = t.closest<HTMLButtonElement>('[data-libdel]'), op = t.closest<HTMLButtonElement>('[data-lib]');
    if (del) {
      const id = del.dataset.libdel!, ent = listLib().find(x => x.id === id);
      if (!ent || !confirm(`Delete “${ent.name}” from this browser? This can’t be undone.`)) return;
      deleteFromLib(id); if (libId() === id) setLibId(null); renderLib();
      return;
    }
    if (!op) return;
    const id = op.dataset.lib!;
    dlg.close();
    whileOpening(listLib().find(x => x.id === id)?.name ?? 'tank', () => {
      try {
        const { scene, warnings } = loadFromLib(id);
        store.replace(scene); setLibId(id);
        status(`Opened "${scene.name}". Undo brings the previous one back.` + (warnings.length ? ' ' + warnings.join(' ') : ''), warnings.length > 0);
        return true;
      } catch (err) {
        status(err instanceof SceneError ? err.message : 'Could not open that tank.', true); return false;
      }
    });
  };
  // Save: into this browser under the scene's name. Same name as the tank it came from: updated in place; same name
  // as a different saved tank: ask before replacing it; a new name: a new entry (the old one is kept).
  $('saveScene').onclick = () => {
    const g = G(), list = listLib(), cur = libId(), same = list.find(x => x.name === g.name);
    if (same && same.id !== cur && !confirm(`A different tank called “${g.name}” is already saved in this browser (${when(same.saved)}). Replace it?

Cancel, then change the name, to keep both.`)) return;
    try {
      let thumb = ''; try { thumb = viewer.thumbnail(); } catch { /* no picture: still save the tank */ }
      const e = saveToLib(g, thumb, same?.id);
      setLibId(e.id);
      status(`Saved “${e.name}” in this browser (${list.length + (same ? 0 : 1)} saved). Download keeps a file you can back up or share.`);
    } catch (err) {
      status((err as Error).message, true);
    }
  };
  const saveFile = (scene: Scene) => download(new Blob([JSON.stringify(withImages(scene), null, 1)], { type: 'application/json' }), `${slug(scene.name)}.json`);
  // the whole scene: with split tanks, one file holding both (opens split again)
  $('downloadScene').onclick = () => saveFile(G());
  // Share link (lane N, R12): the scene deflated into the URL hash, no server. The single-file build (file://) links to
  // the live site, since a file path means nothing on another computer.
  $('shareScene').onclick = async () => {
    const made = shareUrl(G(), location.protocol === 'file:' ? 'https://tanklook.com/' : location.href);
    const copied = copyText(made); // started inside the click: Safari allows the clipboard only there
    let url: string;
    try { url = await made; } catch { status('This browser cannot make share links (it is too old). Download sends a file instead.', true); return; }
    if (!await copied) { prompt('Copy this link:', url); return; }
    const n = url.length.toLocaleString();
    status((url.length > LONG_LINK
      ? `Copied a share link (${n} characters). It is long: some apps (Discord, texts) cut links past about 2,000 characters, so paste it into a shortener like tinyurl.com, or use Download.`
      : `Copied a share link (${n} characters). Whoever opens it gets this tank as a new, unsaved copy.`)
      + (sceneImageIds(G()).length ? ' Background pictures are too big for a link, so it goes without them; Download keeps them in the file.' : ''));
  };
  async function copyText(text: Promise<string>) {
    try { // the clipboard item takes the text as a promise, so the gesture is not used up while the link is compressed
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then(t => new Blob([t], { type: 'text/plain' })) })]);
      return true;
    } catch { /* no ClipboardItem or blocked: try the older ways */ }
    const t = await text.catch(() => '');
    if (!t) return false;
    try { await navigator.clipboard.writeText(t); return true; } catch { /* blocked */ }
    const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta); ta.select();
    try { return document.execCommand('copy'); } catch { return false; } finally { ta.remove(); }
  }
  /** Open a share link's hash like a file: validated, one undo step back, a new unsaved tank. */
  async function openShared(hash: string) {
    let parsed: Awaited<ReturnType<typeof readShare>>;
    try { parsed = await readShare(hash); } catch (e) {
      status(e instanceof SceneError ? e.message : 'Could not open that share link.', true); return;
    }
    const { scene, warnings } = parsed;
    whileOpening(scene.name, () => {
      try { store.replace(scene); } catch { status('Could not open that share link.', true); return false; }
      setLibId(null);
      status(`Opened the shared tank "${scene.name}". Undo brings your previous tank back; Save keeps your own copy.` +
        (warnings.length ? ' ' + warnings.join(' ') : ''), warnings.length > 0);
      return true;
    });
  }
  /** One tank of a split on its own, as an ordinary single-tank file (Nathan 2026-10-08). */
  const saveTank = (i: number) => {
    const g = G(), t = g.tanks[i]; if (!t) return;
    const name = `${g.name} - Tank ${'AB'[i]}`.slice(0, 80);
    saveFile({ ...g, name, tanks: [structuredClone(t)], active: 0, camLock: true });
    status(`Downloaded Tank ${'AB'[i]} on its own as "${name}".`);
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
      // round tanks and bowls shape their terrain on rings, a pie slice on arcs, any other on a rectangular grid: resample into the new kind
      const te = s.terrain;
      if (te.h.length && !sameGrid(te, s.tank)) s.terrain = { ...sampleTerrain(s, s.tank, te.cols), on: te.on };
      const max = T.H * 0.5;
      for (const k of ['fl', 'fr', 'bl', 'br'] as const) s.substrate[k] = Math.min(s.substrate[k], max);
      // hood and peninsula ends exist for rectangles and bowfronts only (Nathan 2026-10-08)
      if (!flatEnds(s.tank)) { if (s.lid === 'hood') s.lid = 'glass'; if (s.wall.side === 'left' || s.wall.side === 'right') s.wall.side = 'back'; }
    }, { coalesce });
  }
  const flatEnds = (T: Tank) => ['rect', 'bow'].includes(shapeOf(T));
  $<HTMLSelectElement>('shapeSel').innerHTML = Object.entries(SHAPES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  // each shape keeps its own length / depth for this visit: a round or pie tank derives one from the other, so going
  // back to a rectangle brings its own size back (audit #5); a bowl derives its height too
  const shapeDims = new Map<TankShape, Pick<Tank, 'L' | 'H' | 'D'>>();
  $<HTMLSelectElement>('shapeSel').onchange = e => {
    const shape = (e.target as HTMLSelectElement).value as TankShape, T0 = S().tank, from = T0.shape ?? 'rect', back = shapeDims.get(shape);
    shapeDims.set(from, { L: T0.L, H: T0.H, D: T0.D });
    setTank(T => ({ ...T, ...(back ? { L: back.L, D: back.D, ...(from === 'bowl' ? { H: back.H } : {}) } : {}), shape, sides: T.sides ?? 6, bowMin: T.bowMin ?? T.D * 0.7, bowlFloor: T.bowlFloor ?? T.L * BOWL_DEFAULT, bowlTop: T.bowlTop ?? T.L * BOWL_DEFAULT, pieDeg: T.pieDeg ?? PIE_DEFAULT }));
  };
  for (const n of POLY_SIDES) $('sides' + n).onclick = () => setTank(T => ({ ...T, shape: 'poly', sides: n }));
  $('bowMin').oninput = e => setTank(T => ({ ...T, bowMin: +(e.target as HTMLInputElement).value }), 'bowMin');
  $('pieDeg').oninput = e => setTank(T => ({ ...T, pieDeg: +(e.target as HTMLInputElement).value }), 'pieDeg');
  for (const k of ['bowlFloor', 'bowlTop'] as const) $(k).oninput = e => setTank(T => ({ ...T, [k]: +(e.target as HTMLInputElement).value }), k);
  for (const k of ['L', 'H', 'D'] as const) {
    const el = $('a' + k);
    el.onchange = () => {
      const v = +el.value; if (!Number.isFinite(v) || v <= 0) { status(`Type a size above 0.`, true); sync(); return; }
      const mm = fromUnit(v, G().units), ok = clamp(mm, LIMITS.tankMin, LIMITS.tankMax);
      setTank(T => ({ ...T, [k]: ok }));
      // a value out of range is not taken silently (audit #28)
      if (ok !== mm) status(`Each side is ${fmt(LIMITS.tankMin)} to ${fmt(LIMITS.tankMax)}: set to ${fmt(ok)}.`, true);
    };
  }
  const setUnits = (u: Scene['units']) => store.update(s => { s.units = u; });
  $('uIn').onclick = () => setUnits('in'); $('uCm').onclick = () => setUnits('cm');
  $('rimY').onclick = () => store.edit(s => { s.render.rim = true; });
  $('rimN').onclick = () => store.edit(s => { s.render.rim = false; });
  $('edgesY').onclick = () => store.edit(s => { s.render.edges = true; });
  $('edgesN').onclick = () => store.edit(s => { s.render.edges = false; });
  const LIDS = [['lidOpen', 'open'], ['lidGlass', 'glass'], ['lidHood', 'hood']] as const;
  const BG_BTNS = [['bgBack', 'back'], ['bgLeft', 'left'], ['bgRight', 'right'], ['bgFront', 'front']] as const;
  // a hood has no room for a metal halide pendant (too hot): it becomes LED pucks
  for (const [id, lid] of LIDS) $(id).onclick = () => store.edit(s => { s.lid = lid; if (lid === 'hood' && fixtureOf(s.light) === 'pendant') { s.light.tech = 'led-white'; fitK(s.light); fitFixture(s.light, s.tank, true); } });
  $<HTMLSelectElement>('bgSel').innerHTML = Object.entries(BACKGROUNDS).map(([k, b]) => `<option value="${k}">${esc(b.label)}</option>`).join('');
  $<HTMLSelectElement>('bgSel').onchange = e => store.edit(s => { s.render.bg = (e.target as HTMLSelectElement).value as TankSetup['render']['bg']; });
  for (const [id, side] of BG_BTNS)
    $(id).onclick = () => store.edit(s => { const b = s.render.bgSides; s.render.bgSides = b.includes(side) ? b.filter(k => k !== side) : [...b, side]; wallFit(s); }); // the 3D wall follows the sides
  $('bgArc').oninput = e => store.edit(s => { s.render.bgArc = +(e.target as HTMLInputElement).value; }, { coalesce: 'bgArc' });
  // 3D wall (Nathan 2026-10-15), on the background's sides: animals and plants are pushed in front of it when it appears or grows
  const wallFit = (s: TankSetup) => { keepInWater(s); for (const it of s.items) clampItem(it, s.tank, s); };
  $<HTMLSelectElement>('bdSel').innerHTML = Object.entries(BACKDROPS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
  $<HTMLSelectElement>('bdSel').onchange = e => store.edit(s => { s.backdrop.kind = (e.target as HTMLSelectElement).value as TankSetup['backdrop']['kind']; wallFit(s); });
  $('bdShuffle').onclick = () => store.edit(s => { s.backdrop.seed = 1 + Math.floor(Math.random() * 1e6); });
  $('bdDepth').oninput = e => store.edit(s => { s.backdrop.depth = +(e.target as HTMLInputElement).value; wallFit(s); }, { coalesce: 'bdDepth' });
  // Background pictures (Nathan 2026-10-14): each on one side or across touching sides; a side belongs to one picture.
  // Rows are keyed by picture id, so the same edit reaches both tanks of a linked split.
  const PIC_SIDES: [BgSide, string][] = [['left', 'Left'], ['back', 'Back'], ['right', 'Right'], ['front', 'Front']];
  const PIC_FITS: [BgFit, string, string][] = [
    ['fill', 'Fill', 'Covers the glass; the picture is cropped to fit'], ['fit', 'Fit', 'The whole picture, on the background colour'],
    ['stretch', 'Stretch', 'Stretched to the glass'], ['tile', 'Tile', 'Repeated, at the size you set'],
  ];
  const sideName = (k: BgSide) => k[0].toUpperCase() + k.slice(1);
  $('bgPicAdd').onclick = () => $<HTMLInputElement>('bgPicFile').click();
  $<HTMLInputElement>('bgPicFile').onchange = async e => {
    const inp = e.target as HTMLInputElement, file = inp.files?.[0]; inp.value = '';
    if (!file) return;
    if (store.tank.render.bgImages.length >= 4) { status('At most 4 background pictures per tank.', true); return; }
    let data: string;
    try { data = await readPicture(file); } catch { status('That file is not a picture this browser can read.', true); return; }
    const { id, stored } = putImage(data);
    if (store.tank.render.bgImages.some(b => b.img === id)) { status('That picture is already on this tank.', true); return; }
    const used = new Set(store.tank.render.bgImages.flatMap(b => b.sides));
    const side = (['back', 'left', 'right', 'front'] as BgSide[]).find(k => !used.has(k));
    store.edit(s => { s.render.bgImages.push({ img: id, fit: 'fill', sides: side ? [side] : [], scale: 50 }); });
    status((side ? `Picture added on the ${side}. Click sides to move it, or to run it round a corner.` : 'Picture added; every side has a picture already, so pick its sides.')
      + (stored ? '' : ' This browser’s storage is full, so the picture is kept for this visit only; Download keeps it in the file.'), !stored);
  };
  const editPic = (id: string, fn: (b: TankSetup['render']['bgImages'][number], s: TankSetup) => void, coalesce?: string) =>
    store.edit(s => { const b = s.render.bgImages.find(x => x.img === id); if (b) fn(b, s); }, coalesce ? { coalesce } : {});
  $('bgPics').onclick = e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button'), row = btn?.closest<HTMLElement>('.bgPic');
    if (!btn || !row) return;
    const id = row.dataset.img!, side = btn.dataset.side as BgSide | undefined;
    if (btn.dataset.k === 'del') { store.edit(s => { s.render.bgImages = s.render.bgImages.filter(b => b.img !== id); }); return; }
    if (!side) return;
    const cur = store.tank.render.bgImages.find(b => b.img === id); if (!cur) return;
    if (cur.sides.includes(side)) { editPic(id, b => { b.sides = b.sides.filter(k => k !== side); }); return; }
    if (!sidesTouch([...cur.sides, side])) { status(`One picture can only span sides that touch: ${cur.sides.map(sideName).join(' + ')} and ${sideName(side)} do not meet. Use a second picture for the ${side}.`, true); return; }
    editPic(id, (b, s) => {
      for (const o of s.render.bgImages) o.sides = o.sides.filter(k => k !== side); // a side shows one picture
      b.sides = [...b.sides, side];
    });
  };
  $('bgPics').onchange = e => {
    const sel = e.target as HTMLSelectElement, id = sel.closest<HTMLElement>('.bgPic')?.dataset.img;
    if (id && sel.dataset.k === 'fit') editPic(id, b => { b.fit = sel.value as BgFit; });
  };
  $('bgPics').oninput = e => {
    const r = e.target as HTMLInputElement, id = r.closest<HTMLElement>('.bgPic')?.dataset.img;
    if (id && r.dataset.k === 'scale') editPic(id, b => { b.scale = +r.value; }, 'bgScale:' + id);
  };
  let picKey = '';
  const syncPics = (s: TankSetup) => {
    const L = s.render.bgImages, key = L.map(b => b.img + b.fit).join('|');
    if (key !== picKey) {
      picKey = key;
      $('bgPics').innerHTML = L.map(b => {
        const data = getImage(b.img);
        return `<div class="bgPic" data-img="${esc(b.img)}">`
          + (data ? `<img class="thumb" alt="" src="${data}">` : '<span class="thumb missing" title="This picture is not in this browser (share links do not carry pictures; a downloaded file does)">missing</span>')
          + '<div class="ctl"><span class="seg">' + PIC_SIDES.map(([k, t]) => `<button data-side="${k}">${t}</button>`).join('') + '</span>'
          + `<select data-k="fit" aria-label="Picture fit">${PIC_FITS.map(([k, t, tip]) => `<option value="${k}" title="${esc(tip)}"${k === b.fit ? ' selected' : ''}>${t}</option>`).join('')}</select>`
          + '<button data-k="del" title="Remove this picture" aria-label="Remove picture">✕</button>'
          + (b.fit === 'tile' ? `<div class="row"><label>Size</label><input data-k="scale" type="range" min="${LIMITS.bgScale[0]}" max="${LIMITS.bgScale[1]}" step="5" title="Tile height, % of the tank height" aria-label="Tile size"><output></output></div>` : '')
          + '</div></div>';
      }).join('');
    }
    $('bgPics').querySelectorAll<HTMLElement>('.bgPic').forEach((row, i) => {
      const b = L[i];
      row.querySelectorAll<HTMLButtonElement>('button[data-side]').forEach(btn => {
        const on = b.sides.includes(btn.dataset.side as BgSide); btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on));
      });
      const r = row.querySelector<HTMLInputElement>('input[data-k="scale"]');
      if (r) { r.value = String(b.scale); r.nextElementSibling!.textContent = `${b.scale}%`; }
    });
  };
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
  const editTable = (fn: (tb: TableSettings, s: TankSetup) => void, coalesce?: string) => store.edit(s => { fn(s.stand.table, s); if (s.stand.style !== 'custom') s.stand.style = 'table'; s.stand.show = true; }, coalesce ? { coalesce } : {});
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
  for (const [id, side] of [['wallBack', 'back'], ['wallLeft', 'left'], ['wallRight', 'right'], ['wallCorner', 'corner']] as const)
    $(id).onclick = () => store.edit(s => {
      const was = s.wall.show ? s.wall.side : 'back', b = s.render.bgSides;
      const bgOf = (w: typeof side) => (w === 'corner' ? 'back' : w); // a corner's background covers the panes facing back
      if (b.length === 1 && b[0] === bgOf(was)) s.render.bgSides = [bgOf(side)]; // a background on the old wall side moves with the wall
      s.wall.side = side; s.wall.show = true;
    });
  $('wallGap').max = String(WALL_GAP_MAX);
  $('ceilH').min = String(CEILING_MIN); $('ceilH').max = String(CEILING_MAX);
  $('ceilH').oninput = e => store.edit(s => { s.wall.height = +(e.target as HTMLInputElement).value; s.wall.show = true; }, { coalesce: 'ceilH' });
  $('wallGap').oninput = e => store.edit(s => { s.wall.gap = +(e.target as HTMLInputElement).value; s.wall.show = true; }, { coalesce: 'wallGap' });
  $('wallColor').oninput = e => store.edit(s => { s.wall.color = (e.target as HTMLInputElement).value; s.wall.show = true; }, { coalesce: 'wallColor' });

  $('personOn').onchange = e => store.edit(s => { s.person.show = (e.target as HTMLInputElement).checked; });
  $('personH').min = String(LIMITS.person[0]); $('personH').max = String(LIMITS.person[1]);
  $('personH').oninput = e => store.edit(s => { s.person.height = +(e.target as HTMLInputElement).value; s.person.show = true; }, { coalesce: 'personH' });
  const PSIDES = [['personLeft', 'left'], ['personRight', 'right']] as const;
  for (const [id, side] of PSIDES) $(id).onclick = () => store.edit(s => { s.person.side = side; s.person.show = true; });

  // ---------- Species search & adding animals ----------
  /** Clear water for each type (2026-10-13): marine clear is bluer than the fresh default. */
  const FRESH_CLEAR: [string, number] = ['#7fb8a8', 0], SALT_CLEAR: [string, number] = ['#8ec9ec', 0];
  /** A saltwater tank: salt set and water on (a dry tank lists the freshwater and land animals). */
  const isSalt = (s: TankSetup) => s.water.on && !!s.water.salt;
  /** Does this species belong in this tank? Species without `salt` are freshwater (or land). */
  const fitsWater = (sp: Species, s: TankSetup) => !!sp.salt === isSalt(s);
  /** Animals in this tank that do not fit its water (offered for removal in the Water section). */
  const misfits = (s: TankSetup) => s.fish.filter(f => { const sp = getSpecies(f.species); return !!sp && !fitsWater(sp, s); });
  let pickId = 'neon';
  const search = $('spSearch'), results = $<HTMLDivElement>('spResults');
  // sub menus: All, then one chip per group; the search looks only inside the chosen group
  let cat: Category | undefined;
  const cats = $('spCats');
  for (const [k, label] of [[undefined, 'All'], ...CATEGORIES] as const) {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab'); b.dataset.cat = k ?? ''; b.innerHTML = `${esc(label)} <span class="n"></span>`;
    b.onclick = () => { cat = k; renderResults(); };
    cats.append(b);
  }
  const catName = () => CATEGORIES.find(c => c[0] === cat)?.[1] ?? '';
  /** The species list shows only animals for this tank's water (2026-10-13): salt species in a saltwater tank, the rest
   *  (no `salt` flag) in a freshwater or dry one. */
  const findSpecies = (q: string, c?: Category) => searchSpecies(q, c).filter(sp => fitsWater(sp, S()));
  function renderResults() {
    const salt = isSalt(S());
    for (const b of cats.children as HTMLCollectionOf<HTMLButtonElement>) {
      const on = b.dataset.cat === (cat ?? ''), k = b.dataset.cat as Category | '';
      const n = SPECIES.filter(sp => (!k || sp.cat === k) && fitsWater(sp, S())).length;
      b.querySelector('.n')!.textContent = String(n); b.classList.toggle('empty', !n);
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    }
    // the group names already say fresh or salt, so only the All search adds "marine" (audit #10)
    search.setAttribute('placeholder', cat ? `Search ${catName().toLowerCase()}` : `Search ${salt ? 'marine ' : ''}species (common or scientific name)`);
    const list = findSpecies(search.value, cat);
    if (list.length && !list.some(s => s.id === pickId)) pickId = list[0].id;
    const elsewhere = !list.length && cat && search.value.trim() ? findSpecies(search.value).length : 0;
    const other = !list.length && search.value.trim() ? searchSpecies(search.value, cat).length : 0; // matches for the other water
    const inCat = cat && !search.value.trim() ? searchSpecies('', cat).length : 0; // the whole group, any water
    // a group that is empty only because of this tank's water says how to get it (audit #11)
    const toSalt = cat ? cat.startsWith('sw-') : !salt, swap = `<button type="button" class="linkbtn" id="spSwap">Switch the tank to ${toSalt ? 'Saltwater' : 'Freshwater'}</button>`;
    results.innerHTML = list.length ? '' : `<div class="none">${!search.value.trim() && salt && !findSpecies('').length ? 'No saltwater species yet.'
      : !cat || search.value.trim() ? `No ${salt ? 'saltwater ' : ''}species match${other ? ` (${other} ${salt ? 'freshwater' : 'saltwater'}). ${swap}` : '.'}`
      : inCat ? `${esc(catName())} need a ${toSalt ? 'saltwater' : 'freshwater'} tank. ${swap} to see ${inCat}.`
      : `No ${esc(catName().toLowerCase())} yet.`}${elsewhere ? ` <a href="#" id="spAll">${elsewhere} in other groups</a>` : ''}</div>`;
    const all = results.querySelector<HTMLAnchorElement>('#spAll');
    if (all) all.onclick = e => { e.preventDefault(); cat = undefined; renderResults(); };
    const sw = results.querySelector<HTMLButtonElement>('#spSwap');
    if (sw) sw.onclick = () => { if (!S().water.on) store.edit(s => { s.water.on = true; }); setSalt(toSalt); };
    for (const sp of list) {
      const b = document.createElement('button');
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(sp.id === pickId));
      b.className = sp.id === pickId ? 'on' : '';
      const tag = speciesTag(sp) ? `<b class="tag">${speciesTag(sp)}</b>` : '';
      b.innerHTML = `<span class="nm">${esc(sp.name)} ${tag}</span><span>${fmt(sp.tl)}</span><i class="sci" title="${esc(sp.sci)}">${esc(sp.sci)}</i>`;
      if (sp.note) b.title = sp.note;
      b.onclick = () => { pickId = sp.id; preview.hidden = false; renderResults(); };
      b.ondblclick = () => addOne(sp);
      b.onpointerdown = e => dragOut(e, sp.name, { drop: at => at && dropSpecies(sp, sp.id === pickId && sp.female ? previewSex : undefined, at) });
      results.append(b);
    }
    const pick = getSpecies(pickId), why = pick ? blocked(pick) : '';
    showPreview(list.length ? pick : undefined);
    $<HTMLButtonElement>('addFish').disabled = !list.length || !!why;
    $('addFish').title = why;
    $('addWhy').textContent = why; $('addWhy').hidden = !why || !list.length; // said under Add, not only in a tooltip (audit #9)
    setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
  }
  search.oninput = renderResults;

  // preview tile: opens on clicking a species, then follows the pick until closed
  const preview = $<HTMLDivElement>('spPreview'), previewArt = new Map<string, HTMLCanvasElement>();
  let previewId = '', preview3d: SpeciesPreview | null | undefined; // undefined = not tried yet, null = no WebGL
  let previewSex: Sex | undefined; // which sex the tile shows for a dimorphic species
  $('spPreviewHide').onclick = () => { preview.hidden = true; };
  for (const [id, sx] of [['spSexM', undefined], ['spSexF', 'f']] as const)
    $(id).onclick = () => { previewSex = sx; showPreview(getSpecies(pickId)); };
  function showPreview(base?: Species) {
    if (!base) { preview.hidden = true; return; }
    $('spSex').hidden = !base.female;
    $('spSexM').classList.toggle('on', previewSex !== 'f'); $('spSexF').classList.toggle('on', previewSex === 'f');
    const n0 = startCount(base); // says how many it adds (audit #35)
    $('addFish').textContent = `Add${n0 > 1 ? ` ${n0}` : ''}${base.female ? (previewSex ? ' females' : ' males') : ''}`;
    const sp = previewSex === 'f' && base.female ? base.female : base;
    if (sp.look === previewId) return;
    previewId = sp.look;
    if (preview3d === undefined) { try { preview3d = new SpeciesPreview(); } catch { preview3d = null; } }
    if (preview3d) {
      $('spPreviewArt').replaceChildren(preview3d.canvas);
      preview3d.show(sp);
    } else { // no WebGL: the painted card
      let c = previewArt.get(sp.look);
      if (!c) previewArt.set(sp.look, c = sp.kind === 'snail' ? drawSnailCard(sp.art, 'side', 640) : drawFishCard(sp.art, sp.aspect, 640));
      $('spPreviewArt').replaceChildren(c);
    }
    $('spPreviewName').innerHTML = `${esc(sp.name)} <i>${esc(sp.sci)}</i>`;
    const adult = base.female ? `Adult ♂ ${fmt(base.tl)}, ♀ ${fmt(base.female.tl)}` : `Adult ${fmt(sp.tl)}`;
    $('spPreviewInfo').textContent = [adult, speciesTag(sp), sp.note].filter(Boolean).join(' · ');
  }
  search.onkeydown = e => { if (e.key === 'Enter') { const sp = findSpecies(search.value, cat)[0]; if (sp) { pickId = sp.id; addOne(sp); renderResults(); } } };

  /** Size for newly added fish: % of adult length (100 = adult, stored as no override). */
  const addPct = () => clamp(Math.round(+$('addSize').value || 100), 15, 130);
  // each new animal varies around this size like real ones, so a few come out bigger than the adult length (audit #39)
  const sizeLabel = (pct: number, sp?: Species) => (pct === 100 ? 'Adult ±10 %' : `${pct}%${sp ? ' · ' + fmt(sp.tl * pct / 100) : ''} ±10 %`);
  $('addSize').oninput = () => setOut('oAddSize', sizeLabel(addPct(), getSpecies(pickId)));
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
  /** Default count when a species joins the list: a group for schooling / shoaling fish, else one. */
  const startCount = (sp: Species) => (sp.pair ? 2 : sp.kind !== 'snail' && sp.group ? 6 : 1); // pairs: clownfish, cardinals
  /** Is this fish in the species' list row? A dimorphic species has a row per sex. */
  const inRow = (f: Fish, sp: Species, sex?: Sex) => f.species === sp.id && (!sp.female || (f.sex === 'f') === (sex === 'f'));
  /** Set how many of a species each edited tank holds (`to` gets the tank's current count). New animals take the
   *  species' sizes from "New fish size"; only they are placed (joining their species' school if it is already in the
   *  tank, else by the shuffle rules), everyone else stays put (Nathan 2026-10-13). 0 takes the species off the list.
   *  One undo step per burst of clicks. */
  function setCount(sp: Species, to: (n: number) => number, sex?: Sex, at?: PlaceAt) {
    const want = Math.round(to(S().fish.filter(f => inRow(f, sp, sex)).length));
    if (want > 0) { const why = blocked(sp); if (why) { status(why, true); renderResults(); return; } }
    const have = S().fish.filter(f => inRow(f, sp, sex)).length;
    if (want > have && S().fish.length >= LIMITS.maxFish) { status(`A tank holds at most ${LIMITS.maxFish} animals.`, true); sync(); return; } // audit #36
    const first = store.nextId(), seed = Math.random() * 1e9;
    store.edit(s => {
      const r = rng(seed), mine = s.fish.filter(f => inRow(f, sp, sex)), added = new Set<number>();
      const n = clamp(Math.round(to(mine.length)), 0, mine.length + LIMITS.maxFish - s.fish.length);
      if (n === mine.length) return;
      if (n < mine.length) { const drop = new Set(mine.slice(n).map(f => f.id)); s.fish = s.fish.filter(f => !drop.has(f.id)); return; }
      for (let id = first; mine.length < n; id++) {
        const f: Fish = { id, species: sp.id, x: s.tank.L / 2, y: 0, depth: s.tank.D / 2, ...randomPose(sp, r, 0), ...(sex && sp.female ? { sex } : {}) };
        randomSize(f, sp, addPct(), r);
        mine.push(f); s.fish.push(f); added.add(id);
      }
      placeNew(s, r, added);
      // dropped into the tank: the newcomers, placed as above, move over together so they gather round the drop point,
      // each at its height above the ground there, and off the front and back glass (seen from the front, the ground
      // under the pointer is right behind the glass); the glass and land animals keep the spots their rules gave them
      if (at && sp.habitat === 'water') {
        const fs = s.fish.filter(f => added.has(f.id) && f.surface !== 'glass'), T = s.tank, g = (x: number, d: number) => groundHeight(s, T, x, d);
        const top = s.water.on ? waterY(T, s.water.level) : T.H, wb = backdropDepth(s.backdrop, T);
        const dx = at.x - fs.reduce((a, f) => a + f.x, 0) / (fs.length || 1), dd = clamp(at.depth, T.D * 0.25, T.D * 0.75) - fs.reduce((a, f) => a + f.depth, 0) / (fs.length || 1);
        for (const f of fs) {
          const up = f.y - g(f.x, f.depth);
          f.x += dx; f.depth += dd; clampFish(f, T, wb, s.render.bgSides);
          f.y = clamp(g(f.x, f.depth) + up, 0, top);
          clampFish(f, T, wb, s.render.bgSides);
        }
      }
    }, { coalesce: `count:${sp.id}:${sex ?? ''}` });
    if (store.selId != null && !S().fish.some(f => f.id === store.selId)) store.select(null);
  }
  /** Add a species at its start count, of the sex the preview tile has highlighted (dimorphic species). */
  function addOne(sp: Species) {
    const sex = sp.female ? previewSex : undefined;
    if (S().fish.some(f => inRow(f, sp, sex))) { status(`${rowName(sp, sex)} is already in the stocking list: use + or type a number.`); return; }
    setCount(sp, () => startCount(sp), sex);
  }
  /** A species dragged into the tank: its start count gathered round the drop point, or one more there if it is already
   *  in the list. In a split view, the tank it was dropped in becomes the one the panel shows. */
  function dropSpecies(sp: Species, sex: Sex | undefined, at: PlaceAt) {
    if (at.vi !== store.scene.active) store.setActive(at.vi);
    setCount(sp, k => k + (k ? 1 : startCount(sp)), sex, at);
    store.seal();
  }
  /** Stocking name: "Betta (male)" / "Betta (female)" for a dimorphic species, else the name. */
  const rowName = (sp: Species, sex?: Sex) => sp.name + (sp.female ? (sex ? ' (female)' : ' (male)') : '');
  $('addFish').onclick = () => { const sp = getSpecies(pickId); if (sp) addOne(sp); };
  $('addFish').onpointerdown = e => { const sp = getSpecies(pickId); if (sp && !$<HTMLButtonElement>('addFish').disabled) dragOut(e, sp.name, { drop: at => at && dropSpecies(sp, sp.female ? previewSex : undefined, at) }); };
  $('shuffle').onclick = () => {
    if (!S().fish.length) return;
    const seed = Math.random() * 1e9;
    store.edit(s => shuffleFish(s, rng(seed), undefined, addPct()));
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
  // no per-fish position / pose / size sliders (Nathan 2026-10-12): Shuffle and new fish roll them at random
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
      const n: Fish = { ...f, id, x: f.x + fishTL(f, speciesOf(f)!) * 0.9 };
      clampFish(n, s.tank, backdropDepth(s.backdrop, s.tank), s.render.bgSides); s.fish.push(n);
    });
    store.select(id);
  };
  $('flip').onclick = flip; $('del').onclick = del; $('dup').onclick = dup;
  /** Switch the selected fish's sex; a custom size keeps its share of the adult length. */
  const setSex = (sex?: Sex) => editSel((f, s) => {
    const sp = getSpecies(f.species); if (!sp?.female || (f.sex === 'f') === (sex === 'f')) return;
    const was = fishTL({ sex: f.sex }, sp), now = fishTL({ sex }, sp);
    if (f.tl) { f.tl = Math.round(f.tl * now / was); if (f.tl === now) delete f.tl; }
    if (sex) f.sex = sex; else delete f.sex;
    fitFish(f, s);
  });
  $('sexM').onclick = () => setSex(); $('sexF').onclick = () => setSex('f');

  addEventListener('keydown', e => {
    const t = e.target as HTMLElement, typing = (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); return; }
    if (mod && e.key.toLowerCase() === 'd' && !typing) { e.preventDefault(); if (store.selectedItem) itemDup(); else dup(); return; }
    if (typing || mod || e.altKey) return;
    if (e.key === 'Home') { e.preventDefault(); viewer.resetPan(); return; }
    if (store.selectedItem) {
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); itemDel(); }
      else if (e.key === 'r' || e.key === 'R') editItem(it => { it.yaw += e.shiftKey ? -15 : 15; });
      else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') editItem(it => { it.size = Math.round(it.size * (e.key === '-' || e.key === '_' ? 1 / 1.1 : 1.1)); }, 'key-size');
      else if (ARROWS[e.key]) { e.preventDefault(); nudge(...ARROWS[e.key], e.shiftKey ? 1 : 5); }
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
    Object.entries(SUBSTRATES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('') +
    '<option value="custom">Custom grain and colour</option>';
  // custom substrate (Nathan 2026-10-13): grain + colour, optionally a second grain, its share and how mixed the two are
  const grainOpts = Object.entries(GRAIN_LOOK).map(([k, g]) => `<option value="${k}">${esc(g.label)}</option>`).join('');
  $<HTMLSelectElement>('subG1').innerHTML = grainOpts;
  $<HTMLSelectElement>('subG2').innerHTML = '<option value="none">Nothing (one grain)</option>' + grainOpts;
  const cust = (f: (c: TankSetup['substrate']['custom'], v: string) => void, coalesce?: string) => (e: Event) =>
    store.edit(s => f(s.substrate.custom, (e.target as HTMLInputElement).value), coalesce ? { coalesce } : undefined);
  $('subG1').onchange = cust((c, v) => { c.grain = v as typeof c.grain; });
  $('subG2').onchange = cust((c, v) => { c.grain2 = v as typeof c.grain2; });
  $('subC1').oninput = cust((c, v) => { c.color = v; }, 'subC1');
  $('subC2').oninput = cust((c, v) => { c.color2 = v; }, 'subC2');
  $('subShare').oninput = cust((c, v) => { c.share = +v; }, 'subShare');
  $('subMix').oninput = cust((c, v) => { c.mix = +v / 100; }, 'subMix');
  $<HTMLSelectElement>('subType').onchange = e => {
    const v = (e.target as HTMLSelectElement).value, bare = v === 'bare';
    store.edit(s => {
      s.substrate.show = !bare; if (!bare) s.substrate.type = v as TankSetup['substrate']['type'];
      // custom terrain is ground too, so a bare bottom turns it off (its grid is kept for when it comes back)
      if (bare) s.terrain.on = false;
    });
    if (bare && viewer.terrainEdit.on) { viewer.terrainEdit.on = false; viewer.rebuild(); }
  };
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
    viewer.terrainEdit.on = on; // before the edit, so its sync already says "Done editing" and moves the map (final check item 4)
    store.edit(s => {
      // turning on starts from the floor you see (slopes or swamp land); a grid kept from before is reused
      if (on && !s.terrain.h.length) s.terrain = sampleTerrain(s, s.tank, s.terrain.cols);
      s.terrain.on = on;
      if (on) s.substrate.show = true; // shaped ground on a bare bottom: bring back the last substrate type
    });
    viewer.rebuild(); sync();
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
    viewer.terrainEdit.on = on; // before the edit, so its sync already says "Done editing" and moves the map (final check item 4)
    store.edit(s => { s.water.on = on; });
    const n = S().fish.filter(f => { const sp = getSpecies(f.species); return sp && needsWater(sp); }).length;
    if (!on && n) status(`${n} fish hidden while the tank is dry. Turn Water back on to see them.`);
    renderResults();
  };
  $('wLevel').oninput = e => store.edit(s => setWaterLevel(s, +(e.target as HTMLInputElement).value), { coalesce: 'wLevel' });
  $('wOpac').oninput = e => store.edit(s => { s.water.opacity = +(e.target as HTMLInputElement).value; }, { coalesce: 'wOpac' });
  // condition (lane AL): uniforms only, so it is live while dragging
  $('cond').oninput = e => store.edit(s => { s.condition = { level: +(e.target as HTMLInputElement).value / 100 }; }, { coalesce: 'cond' });
  $('wColor').oninput = e => store.edit(s => {
    s.water.color = (e.target as HTMLInputElement).value;
    if (s.water.opacity < 0.05) s.water.opacity = 0.3; // picking a colour on clear water should show it
  }, { coalesce: 'wColor' });
  const waterPreset = (color: string, opacity: number) => store.edit(s => { Object.assign(s.water, { color, opacity }); });
  $('wClear').onclick = () => waterPreset(...(S().water.salt ? SALT_CLEAR : FRESH_CLEAR));
  $('wTannin').onclick = () => waterPreset('#6b3d14', 0.6);
  $('wGreen').onclick = () => waterPreset('#5d8a2e', 0.5);
  // marine (2026-10-13): reef water is clearer and bluer than fresh; "Clear" follows the water type
  $('wReef').onclick = () => waterPreset('#2f86d0', 0.22);
  $('wOcean').onclick = () => waterPreset('#1f5fb0', 0.4);

  // ---------- Freshwater / saltwater (2026-10-13) ----------
  // Switching is one undo step; animals that do not fit the new water stay until "Remove" is pressed (also undoable).
  const setSalt = (salt: boolean) => {
    if (!!S().water.salt === salt) return;
    store.edit(s => {
      if (salt) s.water.salt = true; else delete s.water.salt;
      // the reef starter is salt only: back in fresh water its pieces stay, but Start from no longer claims it (final check item 6)
      if (!salt && s.layout.id === 'reef') s.layout = { ...s.layout, id: 'none' };
      // the other type's clear water becomes this type's clear water; any other colour is the user's and stays
      const [c, o] = salt ? FRESH_CLEAR : SALT_CLEAR;
      if (s.water.color === c && s.water.opacity === o) [s.water.color, s.water.opacity] = salt ? SALT_CLEAR : FRESH_CLEAR;
    });
    const n = misfits(S()).length;
    status(`${salt ? 'Saltwater' : 'Freshwater'} tank: the Animals list shows ${salt ? 'marine' : 'freshwater'} species.${n ? ` ${n} animal${n > 1 ? 's' : ''} here ${n > 1 ? 'do' : 'does'} not fit: they are marked in the stocking list (Animals).` : ''}`);
  };
  $('wFresh').onclick = () => setSalt(false);
  $('wSalt').onclick = () => setSalt(true);
  $('wMisfitDel').onclick = () => removeMisfits();
  $('lMapSub').onclick = () => { openSec('substrate'); $('subType').focus(); };
  function removeMisfits() {
    const out = new Set(misfits(S()).map(f => f.id)); if (!out.size) return;
    store.edit(s => { s.fish = s.fish.filter(f => !out.has(f.id)); });
    if (store.selId != null && out.has(store.selId)) store.select(null);
    status(`${out.size} animal${out.size > 1 ? 's' : ''} removed. Ctrl+Z brings them back.`);
  }

  // ---------- Lighting ----------
  const lKeys = { lCount: 'count', lRows: 'rows', lSp: 'spacing', lCone: 'cone', lH: 'height', lBright: 'bright', lK: 'kelvin', lRoom: 'room', lW: 'watts', lPar: 'par', lPos: 'pos' } as const;
  // spacing below a bulb's width (tubes: 20 mm) snaps to 0 = auto (fill the tank)
  // while the power is set the Brightness slider is Exposure, in stops (bright = 2^v)
  const expo = () => wattsOf(S()) > 0;
  for (const [id, k] of Object.entries(lKeys)) $(id).oninput = e => store.edit(s => { const v = +(e.target as HTMLInputElement).value; s.light[k] = k === 'spacing' && v < (s.light.type === 'tube' ? 20 : 80) ? 0 : k === 'bright' && wattsOf(s) > 0 ? +(2 ** v).toFixed(3) : v; }, { coalesce: id });
  // up to 12 bulbs when placed to fit the tank (no rows to multiply them), 6 otherwise
  /** A colour outside the lamp's usual range moves to its usual one (on a lamp or fixture change only; the slider goes past). */
  const fitK = (l: TankSetup['light']) => { const [a, b, d] = TECHS[techOf(l)].k; if (l.kelvin < a || l.kelvin > b) l.kelvin = d; };
  const countMax = (l: TankSetup['light']) => FIX_SPEC[fixtureOf(l)]?.maxCount ?? (l.type === 'spot' && l.pattern === 'fit' ? 12 : 6);
  const capCount = (l: TankSetup['light']) => { l.count = Math.min(l.count, countMax(l)); };
  $('lPosOpt').onclick = () => store.edit(s => { const b = bestPos(s.tank, s.light); if (b != null) s.light.pos = b; });
  $<HTMLSelectElement>('lMount').onchange = e => store.edit(s => { s.light.mount = (e.target as HTMLSelectElement).value as 'legs' | 'hang'; });
  $<HTMLSelectElement>('lPat').onchange = e => store.edit(s => { s.light.pattern = (e.target as HTMLSelectElement).value as TankSetup['light']['pattern']; capCount(s.light); });
  // Fixture (Nathan 2026-10-15): the style sets the geometry and which lamps fit; a lamp it does not come in becomes its
  // first, and a colour outside the new lamp's usual range its usual one
  $<HTMLSelectElement>('lType').onchange = e => store.edit(s => {
    const f = (e.target as HTMLSelectElement).value as Fixture, l = s.light;
    l.type = FIXTURES[f].type;
    if (f !== 'flat' && !(l.tech && TECHS[l.tech].on.includes(f))) l.tech = techsFor(f)[0];
    if (f !== 'flat') fitK(l);
    capCount(l); fitFixture(l, s.tank, true); // the style's usual height, beam and power
  });
  $<HTMLSelectElement>('lBulb').replaceChildren(...MH_BULBS.map(w => new Option(`${w} W`, String(w))));
  $<HTMLSelectElement>('lBulb').onchange = e => store.edit(s => { s.light.bulbW = +(e.target as HTMLSelectElement).value; });
  $('lBeams').onchange = e => store.edit(s => { s.render.beams = (e.target as HTMLInputElement).checked; });
  $('lSlice').oninput = e => store.edit(s => { const v = +(e.target as HTMLInputElement).value; if (v > 0) s.light.mapSlice = v; else delete s.light.mapSlice; }, { coalesce: 'lSlice' });
  $('lShells').onchange = e => store.edit(s => { if ((e.target as HTMLInputElement).checked) s.light.mapShells = true; else delete s.light.mapShells; });
  $('lDark').oninput = e => store.edit(s => { const v = +(e.target as HTMLInputElement).value; s.light.mapDark = (s.light.mapUnit ?? 'par') === 'lux' ? v / 50 : v; }, { coalesce: 'lDark' });
  $('lStep').oninput = e => store.edit(s => { const v = +(e.target as HTMLInputElement).value; if ((s.light.mapUnit ?? 'par') === 'lux') s.light.mapStepLux = v; else s.light.mapStep = v; }, { coalesce: 'lStep' });
  $<HTMLSelectElement>('lUnit').onchange = e => store.edit(s => { s.light.mapUnit = (e.target as HTMLSelectElement).value as 'par' | 'lux'; });
  /** The Light map legend: labels at doublings along the ramp (7 steps up from MAP_DIV), and the PAR bands. */
  let mapKeyFor = '';
  const mapKey = (unit: 'rel' | 'par' | 'lux') => {
    if (mapKeyFor === unit) return; mapKeyFor = unit;
    const at = (v: number) => Math.log2(v / MAP_DIV[unit]) / 7 * 100, span = (x: number, t: string, st = '') => {
      const e = document.createElement('span'); e.textContent = t;
      e.style.cssText = `position:absolute;left:${x}%;transform:translateX(${x <= 0 ? 0 : x >= 100 ? -100 : -50}%);${st}`; return e;
    };
    const ticks: [number, string][] = unit === 'rel' ? [[1 / 16, '1/16'], [1 / 4, '1/4'], [1, '1'], [4, '4'], [8, '8']]
      : unit === 'par' ? [[5, '5'], [10, '10'], [20, '20'], [40, '40'], [80, '80'], [160, '160'], [320, '320']]
      : [[250, '250'], [1000, '1k'], [4000, '4k'], [16000, '16k']];
    $('lMapTicks').replaceChildren(...ticks.map(([v, t]) => span(at(v), t)));
    // planted-tank light classes at the substrate, under the PAR ramp
    $('lMapBands').hidden = unit !== 'par';
    if (unit === 'par') $('lMapBands').replaceChildren(...([[30, 50, 'med'], [50, 80, 'high'], [80, 640, 'very high'], [0, 30, 'low']] as [number, number, string][]).map(([a, b, t]) => {
      const x0 = a ? Math.max(at(a), 0) : 0, x1 = Math.min(at(b), 100), e = document.createElement('span'); e.textContent = t;
      e.style.cssText = `position:absolute;left:${x0}%;width:${x1 - x0}%;text-align:center;border-left:1px solid currentColor;font-size:0.9em;white-space:nowrap;overflow:hidden`;
      return e;
    }));
    $('lMapText').textContent = unit === 'rel'
      ? 'Light on the substrate, from distance, beam angle and how squarely it lands, summed over the lights; a colour step per doubling. 1 = one standard 52° bulb 300 mm straight above. Set Power for PAR or lux.'
      : unit === 'par' ? 'PAR at the substrate, µmol/m²/s, from the power and light type: a colour step per doubling. Below: the planted-tank light classes.'
      : 'Lux at the substrate, from the power and light type: a colour step per doubling. Water takes red first, so lux and PAR fall off at different rates.';
  };
  // a screw-in lamp change also takes that lamp's usual power (a 50 W halogen is a 10 W LED bulb)
  $<HTMLSelectElement>('lTech').onchange = e => store.edit(s => {
    const l = s.light; l.tech = (e.target as HTMLSelectElement).value as LightTech; fitK(l);
    if (fixtureOf(l) === 'bulb') delete l.watts;
  });
  let techFor = ''; // the fixture the Lamp list was built for

  // ---------- Viewer (camera): saved with the scene, but not undoable ----------
  const camKeys = { cDist: 'dist', cAz: 'az', cEl: 'el', cZoom: 'zoom' } as const;
  for (const [id, k] of Object.entries(camKeys)) $(id).oninput = e => store.cam(c => { c[k] = +(e.target as HTMLInputElement).value; });
  $('camReset').onclick = () => store.cam(c => Object.assign(c, { az: 0, el: 0, zoom: 1 }));
  // Lighting keeps its own way to look down, since opening Viewer would close it (audit #46)
  $('lTop').onclick = () => store.cam(c => Object.assign(c, { az: 0, el: LIMITS.el[1] }));
  $('lFront').onclick = () => store.cam(c => Object.assign(c, { az: 0, el: 0 }));

  // ---------- Split, display, export ----------
  $('split').onclick = () => { store.splitTank(); status('Split: Tank B is a copy you can change freely. Tick Edit on a view to change that tank.'); };
  $('camLock').onclick = () => store.setCamLock(!G().camLock);
  // an app preference: the same edge mode in every tank
  $<HTMLSelectElement>('edge').onchange = e => store.update(s => { for (const t of s.tanks) t.render.edge = (e.target as HTMLSelectElement).value as TankSetup['render']['edge']; });
  $('pop').oninput = e => store.update(s => { for (const t of s.tanks) t.render.pop = +(e.target as HTMLInputElement).value / 100; });
  $('gridOn').onchange = e => store.edit(s => { s.render.grid = (e.target as HTMLInputElement).checked; });
  // viewpoint map: a per-viewer display preference (browser storage), not scene data
  // the map's own × and "⌖ Map" button do the same as the checkbox; the viewer places and shows one map per view
  const mapCb = $('mapOn'), applyMap = () => { $('mapShow').classList.toggle('off', mapCb.checked); viewer.invalidate(); };
  // no choice made yet: shown, except on a phone, where it would cover a third of the view (audit #32). Read once at
  // load, upright or sideways (lane W): turning the phone does not flip the viewer's map on or off.
  const narrow = matchMedia('(max-width: 760px), (orientation: landscape) and (max-height: 500px)').matches;
  try { const v = localStorage.getItem('tanklook.viewmap'); mapCb.checked = v ? v !== 'off' : !narrow; } catch { mapCb.checked = !narrow; }
  applyMap();
  const setMap = (on: boolean) => { mapCb.checked = on; try { localStorage.setItem('tanklook.viewmap', on ? 'on' : 'off'); } catch { /* ignore */ } applyMap(); };
  mapCb.onchange = () => setMap(mapCb.checked);
  for (const b of document.querySelectorAll<HTMLButtonElement>('.vmapHide')) b.onclick = () => setMap(false);
  $('mapShow').onclick = () => setMap(true);
  // hide the fixture from above it: a per-viewer display preference too; off unless chosen, so the light always shows (Nathan 2026-10-14)
  const hideCb = $('hideLightAbove'), setHide = (on: boolean) => { hideCb.checked = viewer.hideOverhead = on; viewer.invalidate(); };
  try { setHide(localStorage.getItem('tanklook.hidelight') === 'on'); } catch { setHide(false); }
  hideCb.onchange = () => { try { localStorage.setItem('tanklook.hidelight', hideCb.checked ? 'on' : 'off'); } catch { /* ignore */ } setHide(hideCb.checked); };
  // "How to use" stays closed: the start menu names the main gestures and points to it (audit #4 / #8, 2026-10-14)
  // panel sections start collapsed on every load (Nathan 2026-10-09); whether the panel is hidden is a per-viewer preference
  const secs = [...document.querySelectorAll<HTMLDetailsElement>('details.sec')];
  const saveUI = () => { try { localStorage.setItem('tanklook.ui', JSON.stringify({ hidden: $('app').classList.contains('collapsed') })); } catch { /* ignore */ } };
  try {
    const ui = JSON.parse(localStorage.getItem('tanklook.ui') ?? '{}') as { hidden?: boolean };
    $('app').classList.toggle('collapsed', !!ui.hidden);
  } catch { /* storage blocked: panel shown */ }
  const showSide = (on: boolean) => {
    $('app').classList.toggle('collapsed', !on); saveUI(); viewer.invalidate();
    const tab = $('sideTab'), t = on ? 'Hide the panel' : 'Show the panel';
    tab.title = t; tab.setAttribute('aria-label', t); tab.setAttribute('aria-expanded', String(on));
  };
  // split: the panel is open exactly while some view's "Edit" box is ticked (Nathan 2026-10-09). Closing it unticks
  // them; opening it ticks the tank it last showed; the boxes open / close it (on the tabs, below).
  const sideHidden = () => $('app').classList.contains('collapsed');
  $('sideClose').onclick = () => { showSide(false); if (store.split) store.clearEditing(); };
  $('sideOpen').onclick = () => { showSide(true); if (store.split && !store.targets.length) store.setEditing(G().active, true); };
  $('sideTab').onclick = () => $(sideHidden() ? 'sideOpen' : 'sideClose').click(); // the phone's arrow tab (style.css)
  const keepRule = () => { // after split / undo / load
    if (!store.split) return;
    if (sideHidden() && store.targets.length) store.clearEditing();
    else if (!sideHidden() && !store.targets.length) store.setEditing(G().active, true);
  };
  store.subscribe(keepRule); keepRule();
  /** Open a section (e.g. Fish when an animal gets selected), so what the user just acted on is editable. */
  const openSec = (key: string) => { const d = secs.find(x => x.dataset.sec === key); if (d && !d.open) d.open = true; };
  // one section open at a time: opening one collapses the rest (Nathan 2026-10-13). Pieces / animals can be picked and
  // moved only while their menu (Hardscape, Plants, Animals) is open (pointer.ts), so closing it drops that selection too.
  // The piece editor (#itemEdit) moves into whichever of Hardscape / Plants is open.
  for (const d of secs) d.addEventListener('toggle', () => {
    const scape = d.dataset.sec === 'hardscape' || d.dataset.sec === 'plants';
    if (d.open) { for (const o of secs) if (o !== d && o.open) o.open = false; if (scape) d.append($('itemEdit')); }
    else if (scape && store.selectedItem && scapeSec(store.selectedItem.kind) === d.dataset.sec) store.selectItem(null);
    else if (d.dataset.sec === 'fish' && store.selId != null) store.select(null);
  });
  $<HTMLSelectElement>('layout').innerHTML = Object.entries(LAYOUTS).map(([k, l]) => `<option value="${k}">${esc(l.label)}</option>`).join('');
  $<HTMLSelectElement>('layoutComp').innerHTML = Object.entries(COMPS).map(([k, c]) => `<option value="${k}" title="${esc(c.hint)}">${esc(c.label)}</option>`).join('');
  // a starter set replaces every piece (undoable), and the animals when its animal stop is above None; the pieces are
  // then ordinary items
  let fishId0 = 1;
  const replaced = (s: TankSetup) => regenerate(s, 'all', fishId0);
  const dropGoneFish = () => { if (store.selId != null && !S().fish.some(f => f.id === store.selId)) store.select(null); };
  /** A redraw is complete (Nathan 2026-10-15): when it would throw away pieces or animals placed, moved or removed by
   *  hand, a warning asks first. Resolves true to go ahead; on "Keep my scape" `revert` puts the control back. */
  const warnDlg = $<HTMLDialogElement>('scapeWarn');
  const okToReplace = (what: Layer | 'all', revert: () => void, ground = false) => new Promise<boolean>(done => {
    const lost = handEdits(S(), what, ground);
    if (!lost.length) { done(true); return; }
    const list = lost.length === 1 ? lost[0] : `${lost.slice(0, -1).join(', ')} and ${lost[lost.length - 1]}`;
    $('scapeWarnText').textContent = `${what === 'all' ? 'A new starter set' : 'Redrawing this layer'} starts the ${list} again from scratch. Everything you placed, moved or removed there by hand will be gone.`;
    // answered by the buttons (Esc = keep) rather than the dialog's close event, which a background tab may hold back
    const answer = (ok: boolean) => { warnDlg.oncancel = $('scapeKeep').onclick = $('scapeReplace').onclick = null; warnDlg.close(); if (!ok) revert(); done(ok); };
    $('scapeKeep').onclick = () => answer(false); $('scapeReplace').onclick = () => answer(true);
    warnDlg.oncancel = e => { e.preventDefault(); answer(false); };
    warnDlg.showModal();
  });
  const showDens = () => { const d = S().layout.dens ?? DEFAULT_DENS; for (const [k, inp, out] of DENS_IN) { setVal(inp, d[k]); $(out).textContent = stopName(k, d[k]); } };
  // leaving swamp brings back the level it lowered, unless the level was moved since (audit #13)
  let preSwamp = emptyScene().tanks[0].water.level;
  $<HTMLSelectElement>('layout').onchange = async e => {
    const to = (e.target as HTMLSelectElement).value as LayoutId;
    if (!await okToReplace('all', () => setVal('layout', S().layout.id), to !== 'none')) return;
    store.selectItem(null); fishId0 = store.nextId();
    store.edit(s => {
      const was = s.layout.id;
      s.layout.id = to;
      if (s.layout.id === 'swamp' && s.water.level > SWAMP_LEVEL) { preSwamp = s.water.level; setWaterLevel(s, SWAMP_LEVEL); } // land needs to stand out of the water
      else if (was === 'swamp' && s.layout.id !== 'swamp' && s.water.level === SWAMP_LEVEL) setWaterLevel(s, preSwamp);
      styleGround(s); // the style's own substrate and terrain (Quick aquascape setup); a bare tank keeps its ground
      replaced(s);
    });
    dropGoneFish();
    status('New starter set placed. Ctrl+Z brings the previous pieces back.');
  };
  // Composition (lane SS, 2026-10-15): where the weight of any style sits; redraws the hardscape and the plants round it
  // (animals stay). Shuffle and the density sliders keep it.
  $<HTMLSelectElement>('layoutComp').onchange = async e => {
    const to = (e.target as HTMLSelectElement).value as CompId;
    if (!await okToReplace('hard', () => setVal('layoutComp', S().layout.comp ?? 'any'), true)) return;
    store.selectItem(null);
    store.edit(s => { if (to === 'any') delete s.layout.comp; else s.layout.comp = to; styleGround(s); regenerate(s, 'hard', 0); });
    status(`Composition: ${COMPS[to].label}. Ctrl+Z brings the previous pieces back.`);
  };
  // Quick aquascape setup (Nathan 2026-10-15): one Shuffle for the whole set, the substrate and terrain, rock and wood,
  // and plants, at the same style, composition and densities; the animals stay (Animals has its own Shuffle). The
  // Hardscape and Plants menus are for tweaking the pieces by hand afterwards.
  $('layoutShuffle').onclick = async () => {
    if (!await okToReplace('hard', () => {}, true)) return;
    const seed = 1 + Math.floor(Math.random() * 1e6);
    store.selectItem(null);
    store.edit(s => { s.layout.animalSeed ??= s.layout.seed; s.layout.seed = seed; delete s.layout.plantSeed; styleGround(s); regenerate(s, 'hard', 0); });
    status('New substrate, hardscape and plants in the same style; the animals stayed. Ctrl+Z brings the previous ones back.');
  };
  // Density sliders (lane SD): one in each of Hardscape, Plants and Animals, continuous from one piece (one animal) to
  // far too much (Nathan 2026-10-15). Dragging only names the level; the layer is redrawn once, on release (a slider
  // that redraws the tank as it moves is too heavy), as one undo step. Shuffle keeps the levels: only the seed changes.
  const DENS_IN: [Layer, string, string][] = [['hard', 'densHard', 'oDensHard'], ['plant', 'densPlant', 'oDensPlant'], ['animal', 'densAnimal', 'oDensAnimal']];
  const stopName = densName;
  for (const [k, inp, out] of DENS_IN) {
    const el = $<HTMLInputElement>(inp);
    el.oninput = () => { $(out).textContent = stopName(k, +el.value); };
    el.onchange = async () => {
      const v = +el.value;
      if (!await okToReplace(k, showDens)) return;
      if (k !== 'animal') store.selectItem(null);
      fishId0 = store.nextId();
      store.edit(s => { s.layout.dens = { ...(s.layout.dens ?? DEFAULT_DENS), [k]: v }; regenerate(s, k, fishId0); });
      dropGoneFish();
      status(k === 'plant' ? `Plants redrawn (density ${stopName(k, v)}); the hardscape stayed put. Ctrl+Z brings the previous ones back.`
        : k === 'hard' ? `Hardscape redrawn (density ${stopName(k, v)}), with plants round it. Ctrl+Z brings the previous pieces back.`
          : v > 4 ? `Animals restocked (${stopName(k, v)} of 10): more than a safe bioload. Ctrl+Z brings the previous ones back.`
          : v ? `Animals restocked (${stopName(k, v)} of 10), within a safe bioload. Ctrl+Z brings the previous ones back.` : 'Starter animals removed. Ctrl+Z brings them back.');
    };
  }

  // ---------- Aquascape items: library, selection ----------
  // stones, wood and caves under Hardscape; plants and corals under Plants (Nathan 2026-10-14)
  // live rock and corals (data-salt) show in a saltwater tank only: render() toggles them
  const libHtml = (sec: ScapeSec) => (Object.keys(KINDS) as ItemKind[]).filter(k => scapeSec(k) === sec).map(k => `<div class="libRow"${k === 'coral' ? ' data-salt' : ''}><span class="flabel">${KINDS[k]}</span><div class="chips">${
    Object.entries(LIBRARY).filter(([, v]) => v.kind === k).map(([id, v]) => `<button data-lib="${id}"${v.salt ? ' data-salt' : ''} title="Add: ${esc(v.hint)}">${esc(v.label)}</button>`).join('')}</div></div>`).join('');
  $('libHard').innerHTML = libHtml('hardscape'); $('libPlant').innerHTML = libHtml('plants');
  /** Add a piece at an open spot (the candidate farthest from every other piece, front-middle preferred). Same id and
   *  seed in every tank being edited. */
  const addItem = (variant: string) => {
    const id = store.nextItemId(), seed = 1 + Math.floor(Math.random() * 1e9), r = rng(seed);
    store.edit(s => {
      const T = s.tank, it = makeItem(T, variant, id, seed, T.L / 2, T.D / 2, { yaw: LIBRARY[variant].kind === 'plant' ? 0 : Math.round((r() - 0.5) * 60) }, s);
      let best = -1;
      for (let k = 0; k < 16; k++) {
        const x = T.L * (0.15 + r() * 0.7), d = T.D * (0.2 + r() * 0.6);
        const gap = Math.min(...s.items.filter(q => q.kind !== 'plant' || !isPatch(q.variant)).map(q => Math.hypot(q.x - x, q.depth - d)), 1e6) - Math.abs(x - T.L / 2) * 0.15;
        if (gap > best) { best = gap; it.x = x; it.depth = d; }
      }
      // a fern, anubias, buce or moss goes on the stone or wood nearest that open spot (on the floor if there is none)
      const at = EPIPHYTES.has(variant) ? perch(s, it.x, it.depth, r) : null;
      if (at) Object.assign(it, at);
      clampItem(it, T, s); s.items.push(it);
    });
    store.selectItem(id); openSec(scapeSec(LIBRARY[variant].kind));
  };
  /** A chip dragged into the tank: the piece appears under the pointer as soon as it is over a tank's floor and follows
   *  it there, resting on the ground or the piece under it; let go over the tank to place it, anywhere else to take it
   *  back out. One undo step. */
  const dragItem = (e: PointerEvent, variant: string) => {
    let id: number | null = null, vi = -1;
    const key = `place:${Math.random()}`, yaw = LIBRARY[variant].kind === 'plant' ? 0 : Math.round((Math.random() - 0.5) * 60);
    const put = (at: PlaceAt) => {
      if (id == null) {
        if (at.vi !== store.scene.active) store.setActive(at.vi);
        id = store.nextItemId(); vi = at.vi;
        const nid = id, seed = 1 + Math.floor(Math.random() * 1e9);
        store.edit(s => { const it = makeItem(s.tank, variant, nid, seed, at.x, at.depth, { yaw }, s); it.lift = at.lift; clampItem(it, s.tank, s); s.items.push(it); }, { coalesce: key });
        store.selectItem(nid); return;
      }
      if (at.vi !== vi) return;
      const nid = id;
      store.edit(s => { const it = s.items.find(q => q.id === nid); if (!it) return; it.x = at.x; it.depth = at.depth; it.lift = at.lift; clampItem(it, s.tank, s); }, { coalesce: key });
    };
    dragOut(e, LIBRARY[variant].label, {
      skip: () => new Set(id == null ? [] : [id]),
      move: at => { if (at) put(at); },
      drop: at => {
        if (at) put(at);
        else if (id != null) { const nid = id; store.edit(s => { s.items = s.items.filter(q => q.id !== nid); }, { coalesce: key }); store.selectItem(null); }
        store.seal();
      },
    });
  };
  document.querySelectorAll<HTMLButtonElement>('[data-lib]').forEach(b => { b.onclick = () => addItem(b.dataset.lib!); b.onpointerdown = e => dragItem(e, b.dataset.lib!); });
  const editItem = (fn: (it: Item, s: TankSetup) => void, coalesce?: string) => {
    const id = store.selItem; if (id == null) return;
    store.edit(s => { const it = s.items.find(q => q.id === id); if (it) { fn(it, s); clampItem(it, s.tank, s); } }, { coalesce });
  };
  $('iSize').oninput = e => editItem(it => { it.size = +(e.target as HTMLInputElement).value; }, 'iSize');
  $('iGrowth').oninput = e => editItem((it, s) => setPlantGrowth(it, +(e.target as HTMLInputElement).value / 100, s), 'iGrowth');
  // the tank's growth Time and feeding (lane GR3): every plant grows from its planted growth. A growth step costs no
  // geometry (the plant material's shader reveals it, lane GR4); a plant's first growth needs its full growth built (and
  // lain over at the water, or a carpet set on the ground, at its place), which the worker does ahead of time
  // (prebuildPlants), so a plant not built yet waits for it while the rest move (without a worker: one such plant built
  // per frame). The whole move is one undo step.
  let growGoal: { t: number; feed: GrowFeed } | null = null, growRaf = 0, growHeld = false, growLeft = 0;
  const growWaits = new Map<number, number>();
  const growStep = () => {
    growRaf = 0; if (!growGoal) return;
    const { t, feed } = growGoal, worker = canPrebuild();
    let left = 0;
    store.edit(s => {
      // where each plant will be at its new growth (a grown clump near the glass is pushed in, onto other ground): not
      // built there yet = it waits for the worker, built first. At most one plant a frame is built here: without a
      // worker, or one that has waited 20 frames (the worker never holds a plant back for good)
      const byId = new Map(s.items.map(it => [it.id, it])), next: Item[] = [];
      let here = worker ? 0 : 1;
      for (const c of timeChanges(s, t, feed)) {
        const it = { ...byId.get(c.id)!, growth: c.growth, planted: c.planted };
        clampItem(it, s.tank, s);
        if (plantWarm(s, it)) { growWaits.delete(c.id); continue; }
        const n = growWaits.get(c.id) ?? 0;
        if ((n >= 20 || !worker) && here-- > 0) { growWaits.delete(c.id); continue; }
        growWaits.set(c.id, n + 1); next.push(it);
      }
      const wait = new Set(next.map(it => it.id));
      left += setGrowTime(s, t, feed, c => !wait.has(c.id)).length;
      if (next.length) prebuildPlants(s, { S: s, items: next });
      growLeft = left; // (the hint reads it as the edit lands)
    }, { coalesce: 'growTime' });
    if (left) growRaf = requestAnimationFrame(growStep);
    else { growGoal = null; growLeft = 0; if (!growHeld) store.seal(); }
  };
  // build every plant's full growth ahead (in a worker): after a tank loads, and while the Plants panel is open
  const plantsSec = secs.find(d => d.dataset.sec === 'plants');
  prebuildHooks.renderer = viewer.renderer; // (built plants go to the GPU between frames too)
  let warmT = 0;
  const warmSoon = () => { clearTimeout(warmT); warmT = window.setTimeout(() => { prebuildPlants(store.scene.tanks); }, 300); };
  store.subscribe(kind => { if (kind === 'load' || (kind !== 'select' && plantsSec?.open)) warmSoon(); });
  plantsSec?.addEventListener('toggle', () => { if (plantsSec.open) warmSoon(); });
  warmSoon();
  const growTo = (t: number, feed: GrowFeed) => { growGoal = { t, feed }; if (!growRaf) growStep(); };
  $<HTMLSelectElement>('growFeed').innerHTML = Object.entries(FEED_NAMES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
  $<HTMLSelectElement>('growFeed').onchange = e => { store.seal(); growTo(store.tank.grow.time, (e.target as HTMLSelectElement).value as GrowFeed); };
  $('growTime').oninput = e => { growHeld = true; growTo(+(e.target as HTMLInputElement).value / 100, growGoal?.feed ?? store.tank.grow.feed); };
  $('growTime').onchange = () => { growHeld = false; if (!growGoal) store.seal(); };
  // a floater's spread is the patch fully grown: one not grown yet is shown fully grown once it has one, so the patch
  // covers what the slider says
  const fullFloat = (it: Item, s: TankSetup) => { if (isFloat(it.variant) && it.growth == null) setPlantGrowth(it, 1, s); };
  $('iSpread').oninput = e => editItem((it, s) => { it.spread = +(e.target as HTMLInputElement).value; fullFloat(it, s); }, 'iSpread');
  $('iDens').oninput = e => editItem((it, s) => { it.dens = +(e.target as HTMLInputElement).value / 100; fullFloat(it, s); }, 'iDens');
  $('iStems').oninput = e => editItem(it => { it.stems = +(e.target as HTMLInputElement).value; }, 'iStems');
  $('iYaw').oninput = e => editItem(it => { it.yaw = +(e.target as HTMLInputElement).value; }, 'iYaw');
  $('iPitch').oninput = e => editItem(it => { it.pitch = +(e.target as HTMLInputElement).value; }, 'iPitch');
  $('iTilt').oninput = e => editItem(it => { it.tilt = +(e.target as HTMLInputElement).value; }, 'iTilt');
  $('iLift').oninput = e => editItem(it => { it.lift = +(e.target as HTMLInputElement).value; }, 'iLift');
  $('iReshape').onclick = () => { const seed = 1 + Math.floor(Math.random() * 1e9); editItem(it => { it.seed = seed; }); };
  $('iDrop').onclick = () => editItem(it => { it.lift = 0; });
  // free placement (Nathan 2026-10-12): step the piece along x, height or depth; pieces may pass through each other, and a
  // sideways step keeps its height in the tank (not above the ground, which may slope under it)
  const nudge = (axis: string, dir: number, step: number) => editItem((it, s) => {
    if (axis === 'y') { it.lift += dir * step; return; }
    const y = groundHeight(s, s.tank, it.x, it.depth) + it.lift;
    if (axis === 'x') it.x += dir * step; else it.depth += dir * step;
    clampItem(it, s.tank, s);
    it.lift = y - groundHeight(s, s.tank, it.x, it.depth);
  }, 'nudge');
  document.querySelectorAll<HTMLButtonElement>('[data-nudge]').forEach(b => {
    const axis = b.dataset.nudge![0], dir = +b.dataset.nudge!.slice(1);
    let timer = 0;
    const stop = () => { clearTimeout(timer); timer = 0; };
    b.onpointerdown = e => {
      const step = e.shiftKey ? 1 : 5;
      nudge(axis, dir, step);
      const again = (wait: number) => { timer = window.setTimeout(() => { nudge(axis, dir, step); again(60); }, wait); };
      again(350);
    };
    b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
  });
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
      clampItem(n, s.tank, s); s.items.push(n);
    });
    store.selectItem(id);
  };
  $('iDup').onclick = itemDup; $('iDel').onclick = itemDel;
  // Remove all: that menu's pieces only (asks once more first)
  const clearBtn = (btn: string, sec: ScapeSec, done: string) => {
    let arm = 0;
    $(btn).onclick = () => {
      const b = $<HTMLButtonElement>(btn);
      if (!arm) { b.textContent = 'Sure? Click again'; b.classList.add('on'); arm = window.setTimeout(() => { arm = 0; b.textContent = 'Remove all'; b.classList.remove('on'); }, 3000); return; }
      clearTimeout(arm); arm = 0; b.textContent = 'Remove all'; b.classList.remove('on');
      store.selectItem(null); store.edit(s => { s.items = s.items.filter(q => scapeSec(q.kind) !== sec); });
      status(`${done} Ctrl+Z brings them back.`);
    };
  };
  clearBtn('itemsClearHard', 'hardscape', 'Every rock, piece of wood and cave removed.');
  clearBtn('itemsClearPlant', 'plants', 'Every plant and coral removed.');
  // each button says the picture's size in pixels (audit #49)
  $('pngRow').addEventListener('pointerenter', () => {
    const r = devicePixelRatio || 1, w = viewer.host.clientWidth * r, h = viewer.host.clientHeight * r;
    document.querySelectorAll<HTMLButtonElement>('[data-png]').forEach(b => { const m = +b.dataset.png!; b.title = `${Math.round(w * m)} × ${Math.round(h * m)} px`; });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-png]').forEach(b => b.onclick = async () => {
    const mult = +b.dataset.png!;
    try { download(await viewer.exportPNG(mult), `${slug(G().name)}-${mult}x.png`); }
    catch (e) { status((e as Error).message, true); }
  });
  for (const el of document.querySelectorAll<HTMLInputElement>('input[type=range]:not(#growTime)')) el.addEventListener('change', () => store.seal()); // Time seals once its last plant has grown

  // ---------- type-in values: click a slider's readout to type an exact number (in the scene's units for lengths) ----------
  const toU = (mm: number) => tidy(toUnit(mm, G().units), 1);
  const len: TypeIn = { show: toU, parse: t => parseLen(t, G().units) };
  const num = (d = 2): TypeIn => ({ show: v => tidy(v, d), parse: plainNum });
  /** An offset either side of centre: shown signed; "3 left" / "3 forward" read as negative. */
  const side = (neg: RegExp): TypeIn => ({ show: toU, parse: t => {
    const v = parseLen(t.replace(/\b(left|right|forward|front|back)\b/gi, '').trim(), G().units);
    return v == null ? null : neg.test(t) ? -Math.abs(v) : v;
  } });
  const lens = ['bowMin', 'bowlFloor', 'bowlTop', 'standH', 'tableL', 'tableD', 'subBL', 'subBR', 'subFL', 'subFR', 'lH', 'cDist', 'iSize', 'iSpread', 'iLift', 'personH', 'wallGap', 'ceilH'];
  const nums = { pieDeg: 0, bgArc: 0, iYaw: 0, iPitch: 0, iTilt: 0, iStems: 0, iDens: 0, iGrowth: 0, lCount: 0, lRows: 0, lCone: 0, lK: 0, lRoom: 2, lPar: 0, cAz: 0, cEl: 0, cZoom: 2, terCols: 0, addSize: 0 };
  attachTypeIns({
    ...Object.fromEntries(lens.map(id => [id, len])),
    ...Object.fromEntries(Object.entries(nums).map(([id, d]) => [id, num(d)])),
    lBright: { show: v => tidy(expo() ? 2 ** v : v, 2), parse: t => { const v = plainNum(t); return v == null ? null : expo() ? Math.log2(Math.max(v, 1e-3)) : v; } },
    lW: { show: v => tidy(v, 0), parse: t => (/^\s*(typical|auto|0)\s*$/i.test(t) ? 0 : plainNum(t)) }, // 0 = the typical power
    lSp: { show: v => (v ? toU(v) : 'auto'), parse: t => (/^\s*(auto|0)\s*$/i.test(t) ? 0 : parseLen(t, G().units)) },
    tableX: side(/left/i), tableZ: side(/forward|front/i), lPos: side(/forward|front/i),
    wOpac: { show: v => tidy(v * 100, 0), parse: t => { const v = plainNum(t); return v == null ? null : v / 100; } },
    // the water level slider is a fraction of the tank; the box takes the water's height, found by bisection
    wLevel: { show: v => toU(waterY(S().tank, v)), parse: t => {
      if (/^\s*full\s*$/i.test(t)) return 1;
      const mm = parseLen(t, G().units); if (mm == null) return null;
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (waterY(S().tank, m) < mm) lo = m; else hi = m; }
      return (lo + hi) / 2;
    } },
  });

  // ---------- sync: scene -> controls ----------
  const setVal = (id: string, v: number | string) => { const el = $(id); if (document.activeElement !== el || el.type === 'range') el.value = String(v); };
  const setOut = (id: string, txt: string, cls = '') => { const el = $<HTMLOutputElement>(id); el.textContent = txt; el.className = (el.classList.contains('typein') ? 'typein ' : '') + cls; };
  let mapHeld = false;
  let listSig = '', jsonOpen = false, lastSelId: number | null = store.selId; // a selection restored on load does not open Fish
  let lastItem: number | null = null;
  // the running list of plants (and corals) under Plants, like the animals' stocking list (Nathan 2026-10-15): one row per
  // piece, "Vallisneria cluster 1", under a row per species ("Vallisneria cluster ×4") that opens and closes (a starter
  // set plants over a hundred); a species with one piece shows that piece's row alone. A piece's row opens to its
  // settings (the item box moves under it), a click on an open row closes it; selecting a piece in the tank opens its
  // row. Rebuilt only when pieces come or go, the selection changes or a group opens (the item box's sliders must stay
  // in the page while dragged); each row's growth is refreshed in place.
  let plistSig = '';
  const openGroups = new Set<string>();
  const plantName = (s: TankSetup, it: Item) => {
    const n = s.items.filter(q => q.variant === it.variant && q.id <= it.id).length;
    return `${groupName(it)} ${n}`;
  };
  const groupName = (it: Item) => `${LIBRARY[it.variant]?.label ?? it.variant}${it.kind === 'plant' && isClump(it.variant) ? ' cluster' : ''}`;
  const plantGrowth = (it: Item) => (it.kind === 'plant' ? growthWord(it.growth ?? growthOf(it.variant as PlantType, it.size)) : '');
  function plantList(s: TankSetup) {
    const list = $<HTMLDivElement>('plantList'), box = $('itemBox'), edit = $('itemEdit');
    const ps = s.items.filter(it => scapeSec(it.kind) === 'plants'), sel0 = store.selectedItem, selId = ps.some(it => it.id === sel0?.id) ? sel0!.id : null;
    const groups = new Map<string, Item[]>();
    for (const it of ps) { const g = groups.get(it.variant); if (g) g.push(it); else groups.set(it.variant, [it]); }
    if (selId != null) openGroups.add(sel0!.variant);
    const sig = ps.map(it => `${it.id}:${it.variant}`).join() + '|' + selId + '|' + [...openGroups].join();
    if (sig !== plistSig) {
      plistSig = sig;
      edit.prepend(box); // (back home before the rows go)
      list.innerHTML = '';
      const pieceRow = (it: Item, into: HTMLElement) => {
        const open = it.id === selId, row = document.createElement('div'), name = esc(plantName(s, it));
        row.className = open ? 'pr open' : 'pr'; row.dataset.id = String(it.id);
        row.innerHTML = `<button class="pn" aria-expanded="${open}" title="${open ? 'Close its settings' : 'Select it and open its settings: growth, spread, stems, turn, raise'}"><span class="car">${open ? '▾' : '▸'}</span><span class="nm">${name}</span><span class="gw"></span></button><button class="px" title="Remove it" aria-label="Remove ${name}">×</button>`;
        const id = it.id;
        row.querySelector<HTMLButtonElement>('.pn')!.onclick = () => store.selectItem(store.selectedItem?.id === id ? null : id);
        row.querySelector<HTMLButtonElement>('.px')!.onclick = () => { store.edit(t => { t.items = t.items.filter(q => q.id !== id); }); if (store.selectedItem?.id === id) store.selectItem(null); };
        into.append(row);
        if (open) row.append(box);
      };
      for (const [v, its] of groups) {
        if (its.length === 1) { pieceRow(its[0], list); continue; }
        const open = openGroups.has(v), grp = document.createElement('div');
        grp.className = open ? 'pg open' : 'pg';
        grp.innerHTML = `<button class="pn" aria-expanded="${open}"><span class="car">${open ? '▾' : '▸'}</span><span class="nm">${esc(groupName(its[0]))}</span><span class="gw">×${its.length}</span></button>`;
        grp.querySelector<HTMLButtonElement>('.pn')!.onclick = () => {
          if (openGroups.delete(v)) { if (store.selectedItem?.variant === v) store.selectItem(null); } else openGroups.add(v);
          plantList(S());
        };
        list.append(grp);
        if (open) { const rows = document.createElement('div'); rows.className = 'prs'; grp.append(rows); for (const it of its) pieceRow(it, rows); }
      }
      for (const v of openGroups) if (!groups.has(v)) openGroups.delete(v);
      list.hidden = !ps.length;
    }
    for (const row of list.querySelectorAll<HTMLElement>('.pr')) {
      const it = ps.find(q => q.id === +row.dataset.id!), gw = row.querySelector(':scope > .pn .gw');
      if (it && gw) gw.textContent = plantGrowth(it);
    }
  }
  const jsonDetails = $('json').parentElement as HTMLDetailsElement;
  jsonDetails.addEventListener('toggle', () => { jsonOpen = jsonDetails.open; syncJson(); });
  // floats rounded to 0.01 so 609.5999999999999 reads 609.6 (audit #48)
  const jsonText = () => JSON.stringify(G(), (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(2) : v), 1);
  const syncJson = () => { if (jsonOpen) $('json').textContent = jsonText(); };
  $('jsonCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(jsonText()); status('Scene data copied.'); } catch { status('Could not copy: select the text and copy it instead.', true); }
  };

  // ---------- Stocking level from AqAdvisor: asked only when someone presses Check (AqAdvisor is a small site that went
  // down twice within an hour of automatic checks, 2026-10-09). Answers kept per tank + stocking here, and cached 7 days by
  // the proxy; shown in the sidebar and in the size label above the tank.
  const aqDone = new Map<string, number>(), aqBusy = new Set<string>(), aqErr = new Map<string, string>();
  /** Requests waiting their turn (one at a time, 30 s after a fresh answer): shown as "queued, ~N s", ticking. */
  const aqQueued = new Set<string>();
  let aqTick = 0;
  /** Is aqadvisor.com up (the proxy's 5-minute check)? Check and ↻ are offered only on 'up'; otherwise the stocking line
   *  points at the AqAdvisor ↗ link (Nathan 2026-10-15). 'down' is the checker's view, not the site's: aqadvisor.com
   *  shuts the Cloudflare checker out ~30 min at a time while still opening in a browser (health log 2026-10-13..15). Asked on load, every 2 minutes, and when the window regains focus. */
  let aqUp: AqHealth = null;
  const pollAqHealth = async () => {
    const h = await fetchAqHealth();
    if (h !== aqUp) { aqUp = h; syncAq(); viewer.invalidate(); }
  };
  if (AQ_PROXY) {
    void pollAqHealth();
    window.setInterval(() => { if (!document.hidden) void pollAqHealth(); }, 120000);
    window.addEventListener('focus', () => void pollAqHealth());
  }
  const aqWaitText = (key: string) => aqQueued.has(key) ? (aqWaitS() ? `queued, ~${aqWaitS()} s` : 'queued') : 'checking…';
  function syncAq() {
    const q = aqQuery(S());
    $('aqRow').style.display = q ? '' : 'none';
    if (!q) { $('aqNote').textContent = isSalt(S()) && S().fish.length ? 'No stocking check for saltwater tanks yet.' : ''; return; }
    const key = aqKey(q), got = aqDone.get(key), busy = aqBusy.has(key);
    $<HTMLAnchorElement>('aqLink').href = aqAdvisorUrl(q);
    $('aqCheck').style.display = AQ_PROXY && got === undefined && aqUp === 'up' ? '' : 'none';
    $<HTMLButtonElement>('aqCheck').disabled = busy;
    $('aqOut').textContent = got !== undefined ? `${got}% (per AqAdvisor)${got > 100 ? ', overstocked' : ''}`
      : busy ? aqWaitText(key) : AQ_PROXY && aqUp === 'down' ? 'can’t check from here right now; AqAdvisor ↗ still opens it' : aqErr.get(key) ?? '';
    $('aqOut').className = got !== undefined && got > 100 ? 'bad' : '';
    // stand-ins named, so the list on aqadvisor.com makes sense: an axolotl shows there as a Dojo Loach (Nathan 2026-10-15)
    $('aqNote').textContent = [
      q.standIns.length ? `AqAdvisor has no ${q.standIns.map(k => k.name).join(', ')}, so ${q.standIns.length > 1 ? 'they are' : 'it is'} counted as a similar fish: ${q.standIns.map(k => `${k.count} ${k.name} as ${k.as}`).join(', ')}.` : '',
      q.skipped.length ? `Not counted (land animals): ${q.skipped.map(k => `${k.count} ${k.name}`).join(', ')}.` : '',
    ].filter(Boolean).join(' ');
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
    if (aqBusy.has(key) || aqUp !== 'up') return;
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
      if (m !== 'proxy 429') void pollAqHealth(); // a failure may mean it just went down: hide Check until the next up
    }
    aqQueued.delete(key); aqBusy.delete(key); syncAq(); viewer.invalidate();
  };
  $('aqCheck').onclick = () => aqCheck(S());

  let waterKind = '', syncKeys: string[] = [];
  /** Pull every control back from the scene. `full` = false (the store listener): only the groups whose inputs changed,
   *  so a drag step, which moves one fish or item or turns the camera, leaves the rest alone (lane J2: 6-7 ms per step on
   *  a big tank). The panel's own handlers call it full, e.g. to put back a typed value that was refused. */
  function sync(full = true) {
    const s = S(), A = s.tank, u = G().units;
    $<HTMLButtonElement>('undo').disabled = !store.canUndo; $<HTMLButtonElement>('redo').disabled = !store.canRedo;
    const it0 = store.selectedItem, keys = [
      JSON.stringify([{ ...s, fish: null, items: null, camera: null }, G().name, u, store.split, store.targets, viewer.terrainEdit.on]),
      s.fish.map(f => `${f.species}~${f.sex}`).join(), s.items.map(i => i.kind).join(), JSON.stringify(s.camera),
      JSON.stringify(it0 && { ...it0, x: 0, depth: 0 }), // the item box shows no position
    ];
    const [env, fishSet, itemSet, cam, item] = keys.map((k, i) => full || k !== syncKeys[i]); syncKeys = keys;
    if (env) {
    setVal('sceneName', G().name);
    $('uIn').classList.toggle('on', u === 'in'); $('uCm').classList.toggle('on', u === 'cm');
    for (const k of ['L', 'H', 'D'] as const) setVal('a' + k, u === 'cm' ? +(A[k] / 10).toFixed(1) : toUnit(A[k], u)); // cm to 0.1 (audit #30)
    for (const k of ['L', 'H', 'D']) { const el = $('a' + k); el.min = String(toUnit(LIMITS.tankMin, u)); el.max = String(toUnit(LIMITS.tankMax, u)); }
    document.title = `${G().name} · TankLook`; // the browser tab follows the tank (audit #31)
    for (const id of ['aL', 'aH', 'aD']) $(id).step = u === 'in' ? '0.5' : '1';
    const sh = shapeOf(A);
    setVal('shapeSel', sh); $('sidesRow').style.display = sh === 'poly' ? '' : 'none'; $('bowRow').style.display = sh === 'bow' ? '' : 'none';
    $('pieRow').style.display = sh === 'pie' ? '' : 'none';
    if (sh === 'pie') { setVal('pieDeg', A.pieDeg ?? PIE_DEFAULT); setOut('oPie', `${A.pieDeg ?? PIE_DEFAULT}°`); }
    for (const [k, o] of [['bowlFloor', 'oBowlFloor'], ['bowlTop', 'oBowlTop']] as const) {
      $(k + 'Row').style.display = sh === 'bowl' ? '' : 'none';
      if (sh !== 'bowl') continue;
      const b = $(k); b.min = String(Math.ceil(A.L * BOWL_MIN)); b.max = String(Math.floor(A.L * BOWL_MAX)); setVal(k, A[k] ?? A.L * BOWL_DEFAULT); setOut(o, fmt(A[k] ?? A.L * BOWL_DEFAULT));
    }
    ($('aH') as HTMLInputElement).disabled = sh === 'bowl'; // a bowl's height follows from its three diameters
    for (const n of POLY_SIDES) $('sides' + n).classList.toggle('on', sh === 'poly' && A.sides === n);
    $('aLLab').textContent = sh === 'round' || sh === 'bowl' ? 'Diameter' : sh === 'poly' ? 'Width' : 'Length';
    $('aDLab').textContent = sh === 'bow' ? 'Centre depth' : sh === 'pie' ? 'Radius' : 'Depth';
    $('aL').parentElement!.style.display = sh === 'pie' ? 'none' : ''; // a pie slice's width follows from radius and angle
    $('aD').parentElement!.style.display = sh === 'round' || sh === 'poly' || sh === 'bowl' ? 'none' : ''; // depth follows from the diameter / width
    if (sh === 'bow') { const b = $('bowMin'); b.min = String(Math.ceil(Math.max(20, bowMinLimit(A)))); b.max = String(Math.floor(A.D)); setVal('bowMin', A.bowMin ?? A.D); setOut('oBow', fmt(A.bowMin ?? A.D)); }
    $('shapeHint').textContent = sh === 'rect' ? '' : sh === 'bow' ? 'Bowfront: the front glass is a curve from the end depth out to the full depth at the centre.'
      : (sh === 'round' ? 'Round: one curved glass wall.' : sh === 'pie' ? `Pie slice: a curved front and two flat panes meeting at the back${(A.pieDeg ?? PIE_DEFAULT) === 90 ? ' (a corner tank)' : (A.pieDeg ?? PIE_DEFAULT) === 180 ? ' (a half round)' : ''}; ${fmt(A.L)} wide.`
        : sh === 'bowl' ? 'Bowl: a glass sphere cut flat at the floor and the opening; its height follows from the three diameters.'
        : `${A.sides} flat panes, one facing you.`) + ' No hood or peninsula ends for this shape.';
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
    $('volA').textContent = `Capacity ${vol.gallons.toFixed(1)} US gal · ${vol.litres.toFixed(0)} L (inside the glass, to the top) · footprint ${fpTxt}`;
    const wt = tankWeight(s), kgs = (kg: number) => (u === 'in' ? `${Math.round(kg * 2.20462)} lb` : `${Math.round(kg)} kg`);
    $('wtA').textContent = `≈ ${kgs(wt.total)} filled: water ${kgs(wt.water)} (${(u === 'in' ? wt.waterLitres / 3.785 : wt.waterLitres).toFixed(0)} ${u === 'in' ? 'gal' : 'L'} to the water line, over the substrate), substrate ${kgs(wt.substrate)}, glass ${kgs(wt.glass)}`;
    $('rimY').classList.toggle('on', s.render.rim); $('rimN').classList.toggle('on', !s.render.rim);
    $('edgesY').classList.toggle('on', s.render.edges); $('edgesN').classList.toggle('on', !s.render.edges);
    for (const [id, lid] of LIDS) $(id).classList.toggle('on', s.lid === lid);
    setVal('bgSel', s.render.bg);
    for (const [id, side] of BG_BTNS) { const on = s.render.bgSides.includes(side); $(id).classList.toggle('on', on); $(id).setAttribute('aria-pressed', String(on)); }
    $('bgSidesRow').style.display = s.render.bg === 'none' && s.backdrop.kind === 'none' ? 'none' : ''; // sides of the colour and the 3D wall
    $('bgArcRow').style.display = s.render.bg !== 'none' && (sh === 'round' || sh === 'bowl') ? '' : 'none';
    syncPics(s);
    setVal('bdSel', s.backdrop.kind); setVal('bdDepth', s.backdrop.depth); setOut('oBdDepth', fmtLen(s.backdrop.depth, u, 1));
    $('bdRow').style.display = sh === 'bowl' ? 'none' : ''; $('bdDepthRow').style.display = sh !== 'bowl' && s.backdrop.kind !== 'none' ? '' : 'none';
    ($('bdShuffle') as HTMLButtonElement).disabled = s.backdrop.kind === 'none';
    setVal('bgArc', s.render.bgArc); setOut('oBgArc', s.render.bgArc >= 360 ? '360° (all round)' : `${s.render.bgArc}°`); setVal('glassSel', String(s.render.glass)); setVal('glassType', s.render.glassType);
    const t = glassThickness(A, s.render.glass);
    $('glassHint').textContent = (s.render.glass === 'auto' ? 'Auto: ' : 'Glass: ') + t + ' mm (' + fmtLen(t, u, 2) + ')';

    $('standOn').checked = s.stand.show; setVal('standFinish', s.stand.finish); setVal('standStyle', s.stand.style); setVal('standH', s.stand.height);
    setOut('oStandH', fmt(s.stand.height));
    const tb = s.stand.table, tr = tableRange(s);
    $('tableRows').style.display = tableOn(s) ? '' : 'none';
    const word = s.stand.style === 'custom' ? 'Stand' : 'Table';
    $('tableTopLab').textContent = `${word} top`; $('tableDLab').textContent = `${word} depth`;
    $('tableRect').classList.toggle('on', tb.shape === 'rect'); $('tableRound').classList.toggle('on', tb.shape === 'round');
    $('tableLLab').textContent = `${word} ${tb.shape === 'round' ? 'diameter' : 'length'}`; $('tableDRow').style.display = tb.shape === 'round' ? 'none' : '';
    $('tableL').min = String(Math.ceil(tr.minL)); $('tableD').min = String(Math.ceil(tr.minD)); $('tableL').max = $('tableD').max = String(TABLE_MAX);
    $('tableX').min = String(Math.floor(tr.x0)); $('tableX').max = String(Math.ceil(tr.x1)); $('tableZ').min = String(Math.floor(tr.z0)); $('tableZ').max = String(Math.ceil(tr.z1));
    setVal('tableL', tb.L); setVal('tableD', tb.D); setVal('tableX', tb.x); setVal('tableZ', tb.z);
    setOut('oTableL', fmt(tb.L)); setOut('oTableD', fmt(tb.D));
    const off = (v: number, neg: string, pos: string) => (Math.abs(v) < 1 ? 'Centred' : `${fmt(Math.abs(v))} ${v < 0 ? neg : pos}`);
    setOut('oTableX', off(tb.x, 'left', 'right')); setOut('oTableZ', off(tb.z, 'forward', 'back'));
    $('wallOn').checked = s.wall.show; setVal('wallColor', s.wall.color);
    for (const [id, side] of [['wallBack', 'back'], ['wallLeft', 'left'], ['wallRight', 'right'], ['wallCorner', 'corner']] as const)
      $(id).classList.toggle('on', s.wall.show && s.wall.side === side);

    setVal('wallGap', wallGap(s)); setOut('oWallGap', fmt(wallGap(s)));
    setVal('ceilH', ceilingH(s.wall)); setOut('oCeilH', fmtHeight(ceilingH(s.wall), u));
    $('personOn').checked = s.person.show; setVal('personH', s.person.height); setOut('oPersonH', fmtHeight(s.person.height, u));
    for (const [id, side] of PSIDES) $(id).classList.toggle('on', s.person.show && s.person.side === side);
    }
    if (env || fishSet) syncAq();

    // stocking list: one row per species, in order of arrival (rebuilt only when the counts change)
    // a dimorphic species has a row per sex present: '<id>' male, '<id>~f' female
    const counts = new Map<string, number>();
    for (const f of s.fish) {
      const sp = getSpecies(f.species), k = sp?.female && f.sex === 'f' ? f.species + '~f' : f.species;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const sig = [...counts].join() + '|' + u + '|' + isSalt(s);
    if (sig !== listSig) {
      listSig = sig; const list = $<HTMLDivElement>('list');
      list.innerHTML = '';
      for (const [key, n] of counts) {
        const [id, fem] = key.split('~'), sp = getSpecies(id); if (!sp) continue;
        const sex: Sex | undefined = fem ? 'f' : undefined, who = esc(rowName(sp, sex));
        const row = document.createElement('div'), off = !fitsWater(sp, s); row.className = off ? 'sr misfit' : 'sr';
        // an animal that does not live in this tank's water is marked in its row (audit #12)
        row.innerHTML = `<span class="nm" title="${esc(sp.sci)}${off ? ` · does not live in ${isSalt(s) ? 'saltwater' : 'freshwater'}` : ''}">${off ? '<b class="tag bad">✕ wrong water</b> ' : ''}${who}</span><button class="dn" title="One fewer (the last one takes ${who} off the list)" aria-label="One fewer">−</button><input type="number" min="0" max="${LIMITS.maxFish}" value="${n}" aria-label="How many ${who}"><button class="up" title="One more" aria-label="One more">+</button>`;
        row.querySelector<HTMLElement>('.nm')!.onclick = () => { pickId = id; previewSex = sex; preview.hidden = false; renderResults(); };
        row.querySelector<HTMLButtonElement>('.dn')!.onclick = () => setCount(sp, k => k - 1, sex);
        row.querySelector<HTMLButtonElement>('.up')!.onclick = () => setCount(sp, k => k + 1, sex);
        const box = row.querySelector('input')!;
        box.onchange = () => { const v = Math.round(+box.value); if (Number.isFinite(v) && box.value !== '') setCount(sp, () => Math.max(0, v), sex); else box.value = String(n); };
        list.append(row);
      }
      if (!counts.size) list.innerHTML = '<span class="hint">No animals yet. Pick a species above and press Add.</span>';
      const nMis = misfits(s).length;
      if (nMis) {
        const note = document.createElement('div'); note.className = 'misnote';
        note.innerHTML = `<span>${nMis} ${nMis > 1 ? 'animals do' : 'animal does'} not live in ${isSalt(s) ? 'saltwater' : 'freshwater'}.</span>`;
        const rm = document.createElement('button'); rm.textContent = `Remove ${nMis}`; rm.title = $('wMisfitDel').title; rm.onclick = removeMisfits;
        note.append(rm); list.append(note);
      }
      renderResults();
    }
    const f = sel();
    if (f && f.id !== lastSelId) openSec('fish');
    lastSelId = f?.id ?? null;
    $('selBox').classList.toggle('off', !f);
    const fsp = f && getSpecies(f.species), dim = !!fsp?.female;
    $('sexRow').hidden = !dim;
    $('sexM').classList.toggle('on', dim && f!.sex !== 'f'); $('sexF').classList.toggle('on', dim && f!.sex === 'f');

    if (env || fishSet) {
    const sub = s.substrate, smax = Math.round(A.H * 0.5);
    setVal('subType', sub.show ? sub.type : 'bare');
    const cu = sub.custom, two = cu.grain2 !== 'none';
    $('subCustom').hidden = !sub.show || sub.type !== 'custom';
    setVal('subG1', cu.grain); setVal('subC1', cu.color); setVal('subG2', cu.grain2); setVal('subC2', cu.color2);
    $('subC2').hidden = $('subShareRow').hidden = $('subMixRow').hidden = $('subMixHint').hidden = !two;
    $('subShareL').textContent = !two ? 'Share' : cu.grain2 === cu.grain ? 'Colour 2' : GRAIN_LOOK[cu.grain2 as keyof typeof GRAIN_LOOK].label;
    setVal('subShare', cu.share); setOut('oSubShare', `${cu.share} %`);
    setVal('subMix', Math.round(cu.mix * 100)); setOut('oSubMix', cu.mix <= 0 ? 'None' : cu.mix >= 1 ? 'Full' : `${Math.round(cu.mix * 100)} %`);
    for (const [id, k] of Object.entries(SUBK)) { $(id).max = String(smax); setVal(id, sub[k]); setOut('o' + id[0].toUpperCase() + id.slice(1), fmt(sub[k])); }

    const te = s.terrain, editing = viewer.terrainEdit.on && te.on;
    // the map hides the front-left point: it steps aside while points are edited, and comes back after (audit #43)
    if (editing && mapCb.checked) { mapHeld = true; mapCb.checked = false; applyMap(); } else if (!editing && mapHeld) { mapHeld = false; mapCb.checked = true; applyMap(); }
    $('terOn').checked = te.on; setVal('terCols', te.cols);
    setOut('oTerCols', !te.h.length ? `${te.cols} across` : te.radial ? `${te.rows} ${te.arc ? 'arc' : 'ring'}${te.rows > 1 ? 's' : ''}, ${te.h.length} points` : `${te.cols} × ${te.rows} points`);
    for (const id of ['terEdit', 'terFlat', 'terCols']) ($(id) as HTMLInputElement).disabled = !te.on;
    $('terEdit').classList.toggle('on', editing); $('terEdit').textContent = editing ? 'Done editing' : 'Edit points';
    $('terHint').textContent = !te.on ? 'Custom terrain turns the floor into a grid of points you can push down or pull up, with a smooth surface through them. It starts from the current floor.'
      : editing ? 'Drag a dot up or down. Drag empty space to orbit; look from above to reach the back points.' : 'Corner sliders are off while custom terrain is on.';
    $('subDepth').hidden = !sub.show; $('subBare').hidden = sub.show; // no depth to set on a bare bottom (audit #40)
    for (const id of ['subBL', 'subBR', 'subFL', 'subFR', 'subLevel', 'subFB', 'subLR', 'subCorner']) ($(id) as HTMLInputElement).disabled = te.on || !sub.show;

    const wa = s.water;
    $('wOn').checked = wa.on;
    for (const id of ['cond', 'wLevel', 'wOpac', 'wColor', 'wClear', 'wTannin', 'wGreen', 'wReef', 'wOcean', 'wFresh', 'wSalt']) ($(id) as HTMLInputElement).disabled = !wa.on;
    $('wTypeOff').hidden = wa.on; // says why Type is greyed (audit #37)
    $('wFresh').classList.toggle('on', !wa.salt); $('wSalt').classList.toggle('on', !!wa.salt);
    for (const id of ['wTannin', 'wGreen']) $(id).style.display = wa.salt ? 'none' : '';
    for (const id of ['wReef', 'wOcean']) $(id).style.display = wa.salt ? '' : 'none';
    document.querySelectorAll<HTMLElement>('.lib [data-salt], #layout option[value="reef"]').forEach(e => e.style.display = isSalt(s) ? '' : 'none');
    $('plantsTitle').textContent = isSalt(s) ? 'Plants & Corals' : 'Plants';
    { // growth Time: while a move is still growing plants, the slider shows where it is going
      const t = growGoal?.t ?? s.grow.time, plants = s.items.filter(it => it.kind === 'plant'), over = plants.filter(it => (it.growth ?? 0) >= 1).length;
      setVal('growFeed', growGoal?.feed ?? s.grow.feed); setVal('growTime', Math.round(t * 100));
      setOut('oGrowTime', `${Math.round(t * 100)} %`);
      $('growHint').textContent = !plants.length ? '' : growLeft ? `Growing: ${growLeft} plant${growLeft > 1 ? 's' : ''} to go` : t === 0 ? 'Time 0: as planted' : `${over} of ${plants.length} plants overgrown`;
    }
    const mis = misfits(s);
    $('wMisfitRow').style.display = mis.length ? '' : 'none';
    if (mis.length) {
      const by = new Map<string, number>();
      for (const f of mis) { const nm = getSpecies(f.species)?.name ?? f.species; by.set(nm, (by.get(nm) ?? 0) + 1); }
      $('wMisfit').textContent = `Not ${isSalt(s) ? 'saltwater' : 'freshwater'} animals: ${[...by].map(([nm, n]) => `${n} ${nm}`).join(', ')}.`;
      $('wMisfitDel').textContent = `Remove ${mis.length}`;
    }
    const wk = `${isSalt(s)}`; if (wk !== waterKind) { waterKind = wk; renderResults(); } // the species list follows the water
    setVal('wLevel', wa.level); setOut('oLevel', wa.level >= 1 ? 'Full' : `${fmt(waterY(A, wa.level))} high`);
    const cl = s.condition.level; setVal('cond', Math.round(cl * 100)); setOut('oCond', cl <= 0 ? 'Pristine' : cl < 0.35 ? 'A few weeks' : cl < 0.7 ? 'Overdue' : 'Neglected');
    setVal('wOpac', wa.opacity); setOut('oOpac', wa.opacity < 0.01 ? 'Clear' : Math.round(wa.opacity * 100) + '%'); setVal('wColor', wa.color);

    const l = s.light, fx = fixtureOf(l); setVal('lType', fx);
    ($('lType') as HTMLSelectElement).querySelector<HTMLOptionElement>('option[value=pendant]')!.disabled = s.lid === 'hood'; ($('lCount') as HTMLInputElement).max = String(countMax(l));
    // the fixture's usual ranges on the sliders (lightout FIX_SPEC); set before the values so they are not clipped
    { const sp = FIX_SPEC[fx], pw = powerRange(l, s.tank), lim = (id: string, lo: number, hi: number) => Object.assign($(id) as HTMLInputElement, { min: String(lo), max: String(hi) });
      lim('lH', Math.max(sp?.h[0] ?? 20, 20), sp?.h[1] ?? 900); lim('lCone', sp?.cone?.[0] ?? 15, sp?.cone?.[1] ?? 120); lim('lW', 1, pw?.[1] ?? 400); lim('lRows', 1, sp?.maxRows ?? 4); }
    for (const [id, k] of Object.entries(lKeys)) setVal(id, l[k] ?? 0);
    // spots: the slider sets the longest row; say the total when the rows make it more (Nathan 2026-10-12: "3" showed 5)
    const total = l.type === 'spot' ? emitters(s.tank, l).length : l.count;
    setOut('oCount', total > l.count ? `${l.count} · ${total} total` : String(l.count)); setOut('oRows', String(l.rows)); setOut('oBright', '×' + l.bright.toFixed(2)); setOut('oK', l.kelvin + ' K'); setOut('oRoom', l.room.toFixed(2));
    $('lCountRow').style.display = l.type === 'spot' || l.type === 'tube' ? '' : 'none';
    $('lCountLab').textContent = l.type === 'tube' ? 'Tubes' : 'Bulbs';
    for (const id of ['lRowsRow', 'lPatRow', 'lSpRow', 'lConeRow']) $(id).style.display = l.type === 'spot' ? '' : 'none';
    if (l.pattern === 'fit' && l.type === 'spot') for (const id of ['lRowsRow', 'lSpRow']) $(id).style.display = 'none'; // placed by the outline
    // tubes: centre-to-centre spacing too, which sizes the hood (lightout tubeLayout); shown as the spacing in effect
    const tl = l.type === 'tube' ? tubeLayout(s.tank, l) : null;
    if (tl) $('lSpRow').style.display = '';
    Object.assign($('lSp') as HTMLInputElement, tl ? { max: String(TUBE_SP_MAX), step: '5' } : { max: '1500', step: '10' }); setVal('lSp', l.spacing ?? 0);
    setVal('lPat', l.pattern); setOut('oLSp', tl ? (tl.set ? `${fmt(tl.s)} · hood ${fmt(tl.depth)} deep` : 'Auto') : l.spacing ? fmt(l.spacing) : 'Auto'); setOut('oLCone', l.cone + '°');
    setOut('oLH', s.lid === 'hood' ? 'In hood' : fmt(l.height) + ' above');
    $('lHRow').style.display = l.type === 'flat' ? 'none' : ''; ($('lH') as HTMLInputElement).disabled = s.lid === 'hood';
    $('lMountRow').style.display = l.type === 'flat' || s.lid === 'hood' ? 'none' : ''; setVal('lMount', mountOf(l));
    // bars (tubes, LED bar): front to back, as far as the housing stays over the tank (lightout barZ)
    const barDep = tl ? tl.depth : l.type === 'led' ? ledBarDepth(s.tank) : 0, pm = Math.floor(posMax(s.tank, barDep) / 5) * 5, pv = clamp(l.pos ?? 0, -pm, pm);
    $('lPosRow').style.display = $('lPosOptRow').style.display = barDep && s.lid !== 'hood' ? '' : 'none';
    Object.assign($('lPos') as HTMLInputElement, { min: String(-pm), max: String(pm) }); setVal('lPos', pv);
    // said as the light's centre (the middle of its rows) from the back glass; "· even" when it is where Optimize puts it
    const best = barDep && s.lid !== 'hood' ? bestPos(s.tank, l) : null;
    setOut('oLPos', `${fmt(s.tank.D / 2 - pv)} from back${best != null && Math.abs(best - pv) < 1 ? ' · even' : ''}`);
    $('lMount').querySelector('option[value=legs]')!.textContent = fx === 'puck' ? 'Clipped to the rim, on goosenecks' : 'On legs, resting on the tank rim';
    // light output (lane K): power, what is inside the fixture, a measured PAR, and the estimate; while the power is
    // set, Brightness is an exposure on top of the brightness the light gives (x1/4-16, in stops)
    // tubes and halide pendants: the power is the lamps' (W each x how many), shown instead of the slider
    const W = wattsOf(s), watts = W > 0, fixedW = fx === 'tube' || fx === 'pendant';
    $('lWRow').style.display = fx === 'flat' ? 'none' : ''; setOut('oLW', watts ? `${W} W${(l.watts ?? 0) > 0 || fixedW ? '' : ' · typical'}` : 'Not set'); setVal('lW', W);
    $('lW').hidden = fixedW; $('lWFixed').hidden = !fixedW;
    if (fx === 'tube') { const t = tubeOf(l, s.tank); $('lWFixed').textContent = `${l.count} × ${t.w} W, ${t.inch} in tube${l.count > 1 ? 's' : ''} (${fmt(t.len)} long)`; }
    if (fx === 'pendant') { const n = emitters(s.tank, l).length; $('lWFixed').textContent = `${n} × ${l.bulbW ?? 150} W bulb${n > 1 ? 's' : ''}`; }
    $('lBulbRow').style.display = fx === 'pendant' ? '' : 'none'; setVal('lBulb', String(l.bulbW ?? 150));
    if (techFor !== fx) { techFor = fx; $('lTech').replaceChildren(...techsFor(fx).map(t => new Option(TECHS[t].label, t))); }
    setVal('lTech', techOf(l)); $('lTechRow').style.display = fx === 'flat' ? 'none' : '';
    // colour temp: the lamp's usual range marked under the slider; past it, a note
    { const [ka, kb] = TECHS[techOf(l)].k, x = (k: number) => (k - 2700) / (20000 - 2700) * 100, band = $('lKBand');
      band.style.background = `linear-gradient(to right, transparent ${x(ka)}%, var(--accent) ${x(ka)}%, var(--accent) ${Math.max(x(kb), x(ka) + 1)}%, transparent ${Math.max(x(kb), x(ka) + 1)}%)`;
      band.title = `Usual for ${TECHS[techOf(l)].label}: ${ka.toLocaleString('en-US')}-${kb.toLocaleString('en-US')} K`;
      const off = fx !== 'flat' && (l.kelvin < ka || l.kelvin > kb); $('lKNote').hidden = !off; band.hidden = fx === 'flat';
      if (off) $('lKNote').textContent = `${l.kelvin.toLocaleString('en-US')} K is not a colour ${TECHS[techOf(l)].label} usually comes in (usually ${ka.toLocaleString('en-US')}-${kb.toLocaleString('en-US')} K).`; }
    $('lParRow').style.display = watts ? '' : 'none'; setOut('oLPar', l.par ? `${l.par} µmol` : 'Estimate');
    const lo = watts ? lightOutCached(s) : null;
    $('lOut').textContent = lo ? lightReadout(lo) : 'Set Power to estimate the light (PAR and lux) at the substrate.'; $('lOut').hidden = l.type === 'flat';
    $('lBrightLab').textContent = watts ? 'Exposure' : 'Brightness';
    $('lBrightLab').parentElement!.style.display = l.type === 'flat' ? 'none' : ''; // no fixture: nothing to brighten
    $('lBrightLab').title = watts ? 'Like a camera: how bright the render looks for the light the fixture gives (x1/4 to x16; high washes out). The PAR and lux do not change' : '';
    Object.assign($('lBright') as HTMLInputElement, watts ? { min: String(Math.log2(EXP_MIN)), max: String(Math.log2(EXP_MAX)) } : { min: '0.2', max: '2.5' });
    setVal('lBright', watts ? Math.log2(Math.min(Math.max(l.bright, EXP_MIN), EXP_MAX)) : l.bright);
    if (watts) setOut('oBright', '×' + Math.min(Math.max(l.bright, EXP_MIN), EXP_MAX).toFixed(2));
    const mapOn = s.render.beams && l.type !== 'flat';
    $('lUnitRow').style.display = mapOn && watts ? '' : 'none'; setVal('lUnit', l.mapUnit ?? 'par'); mapKey(watts ? l.mapUnit ?? 'par' : 'rel');
    // the map layer: from the floor up to the water surface (the tank top when dry)
    { const top = Math.round(s.water.on ? waterY(s.tank, s.water.level) : s.tank.H); $('lSliceRow').style.display = mapOn && watts ? '' : 'none';
      ($('lSlice') as HTMLInputElement).max = String(top); $('lShellsRow').style.display = mapOn ? '' : 'none'; ($('lShells') as HTMLInputElement).checked = !!l.mapShells;
      // without Power the level has no PAR to compare with: the row stays in sight, greyed, with a note (Nathan 2026-10-15)
      ($('lShells') as HTMLInputElement).disabled = !watts; $('lShellsRow').classList.toggle('off', !watts);
      $('lShellsNote').hidden = !(mapOn && !watts);
      // dark spots: the level (PAR, or lux at 50 per µmol) and how much of the water is below it, and where it is darkest
      const dk = mapOn && watts && !!l.mapShells, du = l.mapUnit ?? 'par', dl = darkOf(l, du);
      $('lDarkRow').style.display = dk ? '' : 'none'; $('lDarkOut').hidden = !dk;
      Object.assign($('lDark') as HTMLInputElement, du === 'lux' ? { min: '250', max: '5000', step: '250' } : { min: '5', max: '100', step: '5' }); setVal('lDark', dl);
      setOut('oLDark', du === 'lux' ? `${dl.toLocaleString('en-US')} lux` : `${dl} PAR`);
      const ds = dk ? darkStats(s, s.tank) : null, du2 = du === 'lux' ? 'lux' : 'PAR';
      if (ds) $('lDarkOut').textContent = ds.share > 0
        ? `${Math.max(1, Math.round(ds.share * 100))}% of the water is below ${dl.toLocaleString('en-US')} ${du2}; darkest ${Math.round(ds.min).toLocaleString('en-US')} ${du2}, ${ds.where}.`
        : `No dark spots: all the water gets at least ${dl.toLocaleString('en-US')} ${du2} (least ${Math.round(ds.min).toLocaleString('en-US')}, ${ds.where}).`; setVal('lSlice', l.mapSlice ?? 0); setOut('oLSlice', l.mapSlice ? `${fmt(l.mapSlice)} up` : 'Off'); }
    { const u = l.mapUnit ?? 'par', r = MAP_STEP[u], v = mapStepOf(l, u); $('lStepRow').style.display = mapOn && watts ? '' : 'none';
      Object.assign($('lStep') as HTMLInputElement, { min: String(r.min), max: String(r.max), step: String(r.by) }); setVal('lStep', v);
      setOut('oLStep', u === 'lux' ? `${v.toLocaleString('en-US')} lux` : `${v} PAR`); }
    $('lBeams').checked = s.render.beams && l.type !== 'flat'; $('lBeams').parentElement!.title = l.type === 'flat' ? 'No fixture: pick one under Fixture to see the light map' : ''; /* audit #44 */ $('lMapKey').style.display = s.render.beams && l.type !== 'flat' ? '' : 'none';
    $('lMapBare').hidden = !(s.render.beams && l.type !== 'flat' && !s.substrate.show); /* the map needs a floor to draw on (audit #17) */ ($('lBeams') as HTMLInputElement).disabled = l.type === 'flat';
    }

    if (cam) {
    const c = s.camera;
    for (const [id, k] of Object.entries(camKeys)) setVal(id, c[k]);
    setOut('oDist', fmt(c.dist)); setOut('oAz', c.az + '°'); setOut('oEl', c.el + '°'); setOut('oZoom', '×' + c.zoom.toFixed(2));
    // no steep-angle warning: the fish are 3D now, not flat cards (Nathan 2026-10-13)
    $('camHint').textContent = 'Distance is from your eye to the front glass, the same for every tank. Zoom only crops; it never changes perspective.';
    }
    if (env || itemSet) {

    ($('split') as HTMLButtonElement).disabled = store.split;
    $('splitHint').textContent = store.split ? 'Two tanks is the most: Delete one on its tab to split again. Each view’s tab (top of the view) opens on hover: what differs, Download that tank on its own, or Delete it. Save and Download at the top keep both tanks together.' : 'Copy this tank into a second, independent one beside it, then change anything in either.';
    setVal('edge', s.render.edge); $('gridOn').checked = s.render.grid; setVal('pop', Math.round(s.render.pop * 100)); setOut('oPop', s.render.pop ? `${Math.round(s.render.pop * 100)} %` : 'off');
    setVal('layoutComp', s.layout.comp ?? 'any'); ($('layoutComp') as HTMLSelectElement).disabled = s.layout.id === 'none';
    setVal('layout', s.layout.id); // "Bare tank" says there is nothing in it, which stops being true once a piece is added by hand (G2, 2026-10-14)
    $('layoutHint').textContent = s.layout.id === 'none' && s.items.length ? 'A starter set replaces every piece; or add, move and remove pieces yourself.' : LAYOUTS[s.layout.id].hint;
    ($('layoutShuffle') as HTMLButtonElement).disabled = s.layout.id === 'none';
    const dn = s.layout.dens ?? DEFAULT_DENS;
    for (const [k, inp, out] of DENS_IN) { setVal(inp, dn[k]); setOut(out, stopName(k, dn[k])); ($(inp) as HTMLInputElement).disabled = s.layout.id === 'none'; }
    const nk = (k: ItemKind) => s.items.filter(q => q.kind === k).length;
    for (const [sec, out, btn] of [['hardscape', 'itemCountHard', 'itemsClearHard'], ['plants', 'itemCountPlant', 'itemsClearPlant']] as const) {
      const ks = (Object.keys(KINDS) as ItemKind[]).filter(k => scapeSec(k) === sec && nk(k));
      $(out).textContent = ks.length ? ks.map(k => `${nk(k)} ${nk(k) === 1 && k !== 'wood' ? KINDS[k].toLowerCase().replace(/s$/, '') : KINDS[k].toLowerCase()}`).join(', ') : 'Nothing placed yet. Pick one above to add it.';
      ($(btn) as HTMLButtonElement).disabled = !ks.length;
    }
    }
    if (env || item) {
    const it = it0;
    if (it && it.id !== lastItem) openSec(scapeSec(it.kind));
    lastItem = it?.id ?? null;
    $('itemBox').hidden = !it;
    if (it) {
      const v = LIBRARY[it.variant], [l, h, w] = itemDims(it);
      $('itemName').innerHTML = `${esc(v.label)} <i>${fmt(l)} × ${fmt(h)} high × ${fmt(w)}</i>`;
      $('iSizeLab').textContent = it.kind === 'plant' ? (isPatch(it.variant) ? 'Width' : 'Height') : it.variant === 'manzanita' ? 'Height' : it.kind === 'coral' ? 'Width' : 'Length';
      const probe = { ...it, size: 1e6 }; clampItem(probe, A);
      $('iSize').min = String(Math.min(v.min, probe.size)); $('iSize').max = String(probe.size);
      setVal('iSize', it.size); setOut('oISize', fmt(it.size));
      // a plant has a Growth instead of a size (lane GR1, 2026-10-15): until moved, the growth its saved size stands for
      const plant = it.kind === 'plant';
      $('iSizeRow').style.display = plant ? 'none' : ''; $('iGrowthRow').style.display = plant ? '' : 'none';
      if (plant) { const g = it.growth ?? growthOf(it.variant as PlantType, it.size); setVal('iGrowth', Math.round(g * 100)); setOut('oIGrowth', growthWord(g)); }
      // a clump's spread and count, a floater's spread and density: its own once moved, else what the seed gives it
      // ("auto"); a spread up to the far corner of the tank from where it stands
      const clump = it.kind === 'plant' && isClump(it.variant), float = it.kind === 'plant' && isFloat(it.variant);
      const show = (sel: string, on: boolean) => document.querySelectorAll<HTMLElement>(sel).forEach(e => { e.style.display = on ? '' : 'none'; }); // (.row sets display, so not hidden)
      show('#itemBox .clump', clump); show('#itemBox .float', float); show('#itemBox .spread', hasSpread(it.variant) && it.kind === 'plant');
      if (clump || float) {
        const auto = clump ? clumpAuto(it.variant as PlantType, it.seed, it.size).spread : Math.round(itemDims({ ...it, spread: undefined, growth: 1 })[0]), sp = it.spread ?? auto;
        $('iSpread').min = '10'; $('iSpread').max = String(Math.max(sp, spreadMax(A, it.x, it.depth)));
        setVal('iSpread', sp); setOut('oISpread', fmt(sp) + (it.spread == null ? ' auto' : ''));
      }
      if (clump) { const n = it.stems ?? clumpAuto(it.variant as PlantType, it.seed, it.size).stems; setVal('iStems', n); setOut('oIStems', n + (it.stems == null ? ' auto' : '')); }
      if (float) { const d = it.dens ?? 1; setVal('iDens', Math.round(d * 100)); setOut('oIDens', Math.round(d * 100) + '%' + (it.dens == null ? ' auto' : '')); }
      setVal('iYaw', it.yaw); setOut('oIYaw', it.yaw + '°'); setVal('iPitch', it.pitch); setOut('oIPitch', it.pitch + '°'); setVal('iTilt', it.tilt); setOut('oITilt', it.tilt + '°');
      $('iLift').min = String(-Math.round(A.H * LIFT_SINK)); $('iLift').max = String(Math.round(A.H)); setVal('iLift', Math.round(it.lift));
      setOut('oILift', Math.abs(it.lift) < 1 ? 'On the ground' : it.lift < 0 ? fmt(-it.lift) + ' in' : fmt(it.lift));
    }
    }
    plantList(s);
    syncJson();
  }

  // ---------- after each draw: viewport labels + readout (same frame as the render) ----------
  let tabSig = '';
  /** The stocking level in a view's label, always there (Nathan 2026-10-09): a hint with no fish; the AqAdvisor answer
   *  with ↻ to ask again; the last answer in yellow once the fish or the tank have changed since it was asked. */
  const aqChip = (s: TankSetup, slot: string, i: number) => {
    const q = aqQuery(s);
    if (!q) return `<span class="aq none">${!s.fish.length ? 'Add fish to show stocking level' : !s.water.on ? 'Add water to show stocking level' : isSalt(s) ? 'Stocking: not available for saltwater (AqAdvisor gives none)' : 'No fish AqAdvisor can count'}</span>`;
    const url = esc(aqAdvisorUrl(q));
    if (!AQ_PROXY) return `<a class="aq" href="${url}" target="_blank" rel="noopener" title="This tank's stocking on aqadvisor.com">Stocking on AqAdvisor ↗</a>`;
    const key = aqKey(q), got = aqDone.get(key), last = aqLast.get(slot), busy = aqBusy.has(key);
    const stale = got === undefined && last !== undefined;
    // ↻ only when there is something to fetch (Nathan 2026-10-09): never checked, out of date, or the last try failed;
    // hidden once this tank's current answer is shown
    const re = got !== undefined || aqUp !== 'up' ? '' : `<button class="aqre${stale ? ' stale' : ''}" data-aq="${i}"${busy ? ' disabled' : ''} title="${stale ? 'The fish or the tank changed since this was checked: click to refresh the stocking level' : 'Ask AqAdvisor for this tank’s stocking level'}" aria-label="Refresh stocking level">↻</button>`;
    const pct = got ?? last;
    // a failed refresh says so, next to the old number it could not replace (it used to hide behind it)
    const err = aqErr.get(key);
    const down = aqUp === 'down';
    const text = busy ? `Stocking: ${aqWaitText(key)}` : pct !== undefined ? `Stocking ${pct}% (AqAdvisor)${err ? `, not updated: ${err}` : stale && down ? ', can’t check right now' : ''}`
      : down ? 'Stocking: open on AqAdvisor ↗' : err ?? 'Stocking: not checked';
    const cls = `aq${stale ? ' stale' : pct !== undefined && pct > 100 ? ' over' : ''}`;
    // 'down' = our checker (a Cloudflare server) can't reach aqadvisor.com. The site often still opens in a browser: it
    // shuts out the checker for about 30 minutes at a time, several times a day (health log, 2026-10-13..15)
    const tip = down && !stale ? 'The stocking checker can’t reach aqadvisor.com right now (it is often shut out for about 30 minutes). The site itself usually still opens: click for this tank on aqadvisor.com' : stale && err ? `Out of date, and the refresh failed (${err}). This is the level before the last change.` : stale ? 'Out of date: the fish or the tank changed since this was checked. Press ↻ to refresh.' : 'AqAdvisor’s stocking level for this tank (aqadvisor.com); click for the full report';
    return `<span class="aqwrap"><a class="${cls}" href="${url}" target="_blank" rel="noopener" title="${tip}">${esc(text)}</a>${re}</span>`;
  };
  viewer.onDrawn(() => {
    const g = G(), active = viewer.active, split = active.length > 1;
    const diff = split ? tankDiff(g.tanks[0], g.tanks[1], g.units) : [];
    const hidden = $('app').classList.contains('collapsed');
    const sig = JSON.stringify([diff, hidden, g.units, g.active, store.targets, g.camLock, active.map(v => [v.x, v.w]), active.map((v, i) => aqChip(v.S, v.key, i))]);
    if (sig !== tabSig) {
      tabSig = sig;
      for (const [i, id] of [[0, 'labA'], [1, 'labB']] as const) {
        const el = $<HTMLDivElement>(id), vp = active[i];
        // only while comparing (Nathan 2026-10-14): one tank's size, stocking and Split all live in the panel already
        el.style.display = vp && split ? '' : 'none';
        if (!vp || !split) { el.innerHTML = ''; continue; }
        // top-right corner of each view (Nathan 2026-10-08); the top-left holds the panel toggle and Undo / Redo
        // (on a phone in split view they reach past the middle into view B too: final check item 2)
        const vt = document.querySelector<HTMLElement>('.viewtools')!, tools = Math.max(0, vt.offsetLeft + vt.offsetWidth + 8 - vp.x);
        // too narrow beside them (a phone in split view): the tab drops below them instead of under them (audit #7)
        const below = tools > 0 && vp.w - 16 - tools < 150;
        el.style.top = below ? (vt.offsetTop + vt.offsetHeight + 6) + 'px' : '';
        el.style.right = (viewer.host.clientWidth - vp.x - vp.w + 8) + 'px'; el.style.maxWidth = (below ? vp.w - 16 : Math.max(80, vp.w - 16 - tools)) + 'px'; // clear of them
        const ed = store.isEditing(i);
        el.classList.add('tab'); el.classList.toggle('on', ed);
        // the "Edit" box: the panel's changes apply to every view ticked here
        const only = ed && store.targets.length === 1;
        const box = `<label class="edbox" title="${only ? `Untick to close the panel` : ed ? `The panel's changes apply to Tank ${vp.key}` : `Apply the panel's changes to Tank ${vp.key} (opens the panel)`}">` +
          `<input type="checkbox" data-edit="${i}"${ed ? ' checked' : ''}> Edit</label>`;
        // packed in two rows (Nathan 2026-10-09): stocking + Edit on top; then what differs (nothing = the same tank,
        // no labels) and Save, Delete flowing together, wrapping only when the view is too narrow.
        // The second row stays folded until the tab is hovered (Nathan 2026-10-09); the ▾ hint carries the count.
        const hint = `<span class="more" aria-hidden="true">${diff.length ? `${diff.length} diff${diff.length === 1 ? '' : 's'} ` : ''}▾</span>`;
        el.innerHTML = `<div class="hd"><b class="tabkey" title="Tank ${vp.key}">${vp.key}</b>${aqChip(vp.S, vp.key, i)}${hint}${box}</div>` + `<div class="diffs">${diff.map((d, k) => `<span>${esc(d[i])}<button class="match" data-match="${i},${k}" title="Copy Tank ${active[1 - i].key}’s value into Tank ${vp.key}" aria-label="Copy from Tank ${active[1 - i].key}: ${esc(d[i])}">⇄ ${active[1 - i].key}</button></span>`).join('')}` +
          `<div class="acts"><button class="close" data-save="${i}" title="Download Tank ${vp.key} on its own as a single-tank file">Download</button>` +
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
    const m = f && viewer.measure(f), sp = f && speciesOf(f);
    if (!f || !m || !sp) { ro.innerHTML = '<span class="hint">Select a fish to see its size on screen.</span>'; return; }
    const a = m.sideAngle, cls = a < 40 ? 'ok' : a < 55 ? 'warn' : 'bad';
    const txt = a < 40 ? 'reads fine' : a < 55 ? 'marginal' : 'too thin: card looks flat';
    let html = `<div><span><b>${esc(sp.name)}${sp.sex === 'f' ? ' ♀' : getSpecies(f.species)!.female ? ' ♂' : ''}</b> <i>${esc(sp.sci)}</i></span><span>${f.tl ? `${fmt(f.tl)} (adult ${fmt(sp.tl)})` : `adult ${fmt(sp.tl)}`}</span></div>
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
    sync(kind === 'load');
    if (kind === 'select') return;
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      store.saveLocal();
      $('saveState').textContent = 'Autosaved';
    }, 400);
  });

  // flush a pending autosave when the tab closes or reloads
  addEventListener('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); store.saveLocal(); } });

  renderResults();
  sync();
  return { status, showStart, openShared };
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
