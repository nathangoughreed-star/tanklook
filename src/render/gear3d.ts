// Tech gear drawn in the tank (lane TG, Nathan 2026-10-19): filters, heaters, air, CO2, UV, flow and reef gear, built
// procedurally to the real class's size (gear-models.json: gph / watts -> body size) and placed on the back wall at one
// side, intake low and outlet high, clear of the hardscape. Everything a tank's gear is made of merges into four meshes
// (lit in-tank parts, lit room parts, clear parts, glowing indicators), so the whole set costs four draw calls.
// What is drawn: the tank's `tech` through lane TM's techParts (scene/tech.ts); a file without it, the inferred gear.
import * as THREE from 'three';
import { FILTER_MODELS, HEATER_MODELS } from '../demand/gear';
import { filterState, heatLoss, techOf, techParts, type GearPlace } from '../scene/tech';
import { filterProduct, genericHeaterW, pumpProduct } from '../data/gearCatalog';
import { backdropDepth, clamp } from '../scene/physics';
import type { Tank, TankSetup } from '../scene/types';
import { GearSpot, GearPick, GearSide, Bucket, Kit, GearWall, Frame, frame, Spot } from './gear/common';
import { heater } from './gear/heater';
import { hob, sponge, internal, canister } from './gear/filter';
import { sump, skimmerHob, uv, ato, surfaceSkim, chillerFan } from './gear/reef';
import { airstone, powerhead } from './gear/pump';
import { co2 } from './gear/co2';
import { clearOnTop, TOP, BESIDE } from './gear/dry';
export { heaterLength } from './gear/heater';
export { DROP_COLOURS, type GearPick, type GearSide, type GearSpot, type GearWall } from './gear/common';
export { lidTop, onTop, clearOnTop } from './gear/dry';

// ---------- what is drawn ----------

/** Gear classes beyond gear-models.json's filters and heaters. */
export const EXTRA_GEAR = ['airstone', 'co2', 'uv', 'powerhead', 'wavemaker', 'skimmer', 'sump', 'ato', 'heatdome', 'uvb', 'mister', 'fogger', 'heatmat', 'thermostat', 'gauge', 'handmister', 'timer', 'surfskim', 'chillerfan'] as const;
/** A dry tank's gear on the top (2026-10-21): the basking dome, the UVB tube, the misting nozzle, the fogger's outlet. */
const LID_GEAR = new Set(['heatdome', 'uvb', 'mister', 'fogger']);
export type ExtraGear = (typeof EXTRA_GEAR)[number];
/** Whether a file without `tech` draws the gear the demand engine infers (true) or none (false): Nathan chose A (2026-10-19). */
export const DRAW_INFERRED = true;
/** The stocking screen of path 1 shows the animals' bare tank first: no filter, heater or other gear until the build is chosen. A view
 *  state, not the tank's (the scene keeps whatever gear it has); the caller rebuilds the viewer after flipping it. */
export const gearView = { on: true };

/** The tank's gear as picks: from lane TM's techParts (scene/tech.ts), which also fills a file without `tech` with the
 *  inferred gear (a HOB up to 60 gal, else a canister; a heater; salt: skimmer; CO2 when the plants are fed CO2). */
export function gearPicks(S: TankSetup): GearPick[] {
  if (!gearView.on || (!S.tech && !DRAW_INFERRED)) return [];
  const out: GearPick[] = [], parts = techParts(S), sump = parts.some(p => p.gear === 'sump');
  for (const p of parts) {
    const place = spotOf(S, p.place), pick = (id: string) => out.push({ id, row: p.row, ...(p.n > 1 ? { n: p.n } : {}), ...(p.product && p.gear !== 'airpump' ? { product: p.product } : {}), ...(place ? { place } : {}) });
    switch (p.gear) {
      case 'filter': if (p.model && !(S.stockFirst && filterState(S) !== 'chosen')) out.push({ id: p.model, row: p.row, ...(p.n > 1 ? { n: p.n } : {}), ...(p.product ? { product: p.product } : {}), ...(place ? { place } : {}) }); break;
      case 'heater': if (p.model) out.push({ id: p.model, row: p.row, watts: p.watts ?? genericHeaterW(heatLoss(S, techOf(S)).needW), ...(p.product ? { product: p.product } : {}), ...(place ? { place } : {}) }); break; // one pick per heater (scene/tech techParts)
      case 'sump': pick('sump'); break;
      case 'co2kit': case 'diyco2': case 'co2cart': pick('co2'); break;
      case 'surfaceskim': pick('surfskim'); break;
      case 'chillerfan': pick('chillerfan'); break;
      case 'airpump': pick('airstone'); break;
      case 'uv': pick('uv'); break;
      case 'ato': pick('ato'); break;
      case 'skimmerhob': pick('skimmer'); break;
      case 'skimmer': if (!sump) pick('skimmer'); break; // a sump skimmer is drawn in the sump
      case 'powerhead': pick('powerhead'); break;
      case 'wavemaker': pick('wavemaker'); break;
      case 'heatdome': pick('heatdome'); break;
      case 'uvbtube': case 'uvblow': pick('uvb'); break;
      case 'heatmat': case 'gauge': case 'handmister': case 'timer': pick(p.gear); break;
      case 'thermoonoff': case 'thermodim': pick('thermostat'); break;
      case 'mister': pick('mister'); break;
      case 'fogger': pick('fogger'); break;
      default: break; // dosing, test kits, RO/DI, the chiller: not in the tank
    }
  }
  return out;
}
/** TechSetup.place (0..1 shares) as mm on the wall the pieces are built on. */
export function spotOf(S: TankSetup, p?: GearPlace): GearSpot | undefined {
  if (!p) return undefined;
  const q = p, wall = q.wall, at = clamp(q.at ?? 0, 0, 1);
  const T = S.tank, Db = T.D - backdropDepth(S.backdrop, T), extra = { ...(q.y != null ? { y: clamp(q.y, 0, 1) } : {}), ...(q.lean != null ? { lean: clamp(q.lean, -90, 90) } : {}) };
  if (wall === 'floor') return { wall, u: at * T.L, d: clamp(q.y ?? 0.8, 0, 1) * T.D };
  if (wall === 'lid') return { wall, u: at * T.L, d: clamp(q.y ?? 0.5, 0, 1) * T.D };
  if (wall === 'back') return { wall, u: at * T.L, ...extra };
  return { wall, u: (1 - at) * Db, ...extra }; // side walls: at 0 = front end
}
/** How a piece mounts, which gates where the owner may drag it: on any glass (free height), on a rim (slides along it),
 *  on the floor, on the top (anywhere there is surface: mesh, glass, hood, or the rim with no lid), or not at all (in the stand). */
export type GearMount = 'glass' | 'rim' | 'floor' | 'lid' | 'fixed';
export function mountOf(id: string): GearMount {
  if (LID_GEAR.has(id)) return 'lid';
  const fm = isFilter(id);
  if (fm) return fm.kind === 'sponge' ? 'floor' : fm.kind === 'internal' ? 'glass' : 'rim';
  if (isHeater(id)) return 'glass';
  return ({ airstone: 'floor', co2: 'glass', uv: 'glass', powerhead: 'glass', wavemaker: 'glass', skimmer: 'rim', sump: 'rim', ato: 'rim', surfskim: 'glass', chillerfan: 'rim' } as Record<string, GearMount>)[id] ?? 'fixed';
}

// ---------- show / hide (Viewer "Show equipment") ----------

const SHOW_KEY = 'tanklook-show-gear';
let shown = true;
try { shown = localStorage.getItem(SHOW_KEY) !== '0'; } catch { /* private window */ }
let live: THREE.Object3D[] = [];
export const gearShown = () => shown;
/** Show or hide every built tank's gear in place (no rebuild); remembered in this browser. */
export function setGearShown(on: boolean) {
  shown = on;
  try { localStorage.setItem(SHOW_KEY, on ? '1' : '0'); } catch { /* private window */ }
  live = live.filter(o => o.parent);
  for (const o of live) o.visible = on;
}

/** The back corner away from the scape's weight (its hardscape's centre of volume), else left. */
export function gearSide(T: Tank, solids: THREE.Box3[]): GearSide {
  let m = 0, mx = 0;
  for (const b of solids) { const s = b.getSize(new THREE.Vector3()), v = s.x * s.y * s.z; m += v; mx += v * (b.min.x + b.max.x) / 2; }
  if (!m) return 'left';
  const c = mx / m / T.L;
  return c < 0.45 ? 'right' : 'left';
}

// ---------- the set ----------

const isFilter = (id: string) => FILTER_MODELS.find(m => m.id === id);
const isHeater = (id: string) => HEATER_MODELS.find(m => m.id === id);

/** A piece the owner can grab: its tech row, id, how it mounts and its box (in the tank, not the parts in the stand). */
export interface GearPiece { row: string; id: string; mount: GearMount; box: THREE.Box3 }

/** Build the gear for `picks` (default: gearPicks(S)) in tank S, clear of the solid pieces `solids` (world boxes). The
 *  first mesh carries the grabbable pieces (userData.gearPieces). */
export function buildGear(S: TankSetup, T: Tank, solids: THREE.Box3[], picks = gearPicks(S), side?: GearSide): THREE.Mesh[] {
  if (!picks.length) return [];
  const kit = new Kit(), dflt = side ?? gearSide(T, solids), frames = new Map<string, Frame>(), pieces: GearPiece[] = [];
  const fr = (wall: GearWall) => { const k = wall; let f = frames.get(k); if (!f) frames.set(k, f = frame(S, T, kit, dflt, solids, wall)); return f; };
  const back = fr('back'), opp: GearWall = dflt === 'left' ? 'right' : 'left';
  // a placed piece on the back wall or the floor: its spot in the back frame's u (which runs from the default corner)
  const spot = (p: GearPick, u: number) => {
    const q = p.place; if (!q || q.wall === 'lid') return { f: back, sp: { u } as Spot };
    if (q.wall === 'floor') { const x = q.u; return { f: back, sp: { u: dflt === 'left' ? x : T.L - x, fixed: true, b: T.D - backdropDepth(S.backdrop, T) - (q.d ?? 0) } }; }
    if (q.wall === 'back') return { f: back, sp: { u: dflt === 'left' ? q.u : T.L - q.u, fixed: true, y: q.y, lean: q.lean } };
    return { f: fr(q.wall), sp: { u: q.u, fixed: true, y: q.y, lean: q.lean } };
  };
  // each piece's box: what the kit gained while building it, above the stand
  const track = (p: GearPick, build: () => void, all = false) => {
    const n0 = (Object.keys(kit.parts) as Bucket[]).map(k => kit.parts[k].length); build();
    const box = new THREE.Box3(), v = new THREE.Vector3();
    // the parts in the water first (cords, hoses and bodies outside the glass would make a box as big as the tank)
    for (const only of (all ? [['wet', 'clear', 'glow', 'room']] : [['wet', 'clear', 'glow'], ['wet', 'clear', 'glow', 'room']]) as Bucket[][]) {
      (Object.keys(kit.parts) as Bucket[]).forEach((k, i) => { if (only.includes(k)) for (const g of kit.parts[k].slice(n0[i])) { const a = g.attributes.position; for (let j = 0; j < a.count; j += 3) { v.fromBufferAttribute(a, j); if (v.y > -25) box.expandByPoint(v); } } });
      if (!box.isEmpty()) break;
    }
    if (!box.isEmpty() && p.row) pieces.push({ row: p.row, id: p.id, mount: mountOf(p.id), box });
  };
  const get = (id: string) => picks.find(p => p.id === id), has = (id: string) => !!get(id);
  // every heater and every filter (Nathan 2026-10-20: as many as the owner adds); the first filter feeds the UV and CO2
  const fps = picks.filter(p => isFilter(p.id)), hps = picks.filter(p => isHeater(p.id)), fm = fps[0] && isFilter(fps[0].id);
  let cursor = 22, outlet: { f: Frame; u: number } = { f: back, u: 120 };
  const after = () => Math.max(cursor, ...back.taken.map(r => r[1])) + 10;
  // the owner's pieces first (they keep their spot), then the rest fill in round them in the default corner
  for (const pass of [true, false]) {
    const go = (p: GearPick | undefined) => !!p && !!p.place === pass;
    if (go(get('sump'))) { const { f, sp } = spot(get('sump')!, cursor); track(get('sump')!, () => sump(f, sp)); if (f === back && !pass) cursor = after(); outlet = { f, u: sp.u + 40 }; }
    // the heater in the corner, the filter's intake next to it, so the intake draws the warm water through the tank
    for (const hp of hps) { const hm = isHeater(hp.id); if (!hm || !go(hp)) continue; for (let i = 0; i < (hp.n ?? 1); i++) { const { f, sp } = spot(hp, i ? after() : cursor); if (i && hp.place) sp.u += 90 * i; /* a second placed heater beside the first */ track(hp, () => heater(f, hp.watts ?? hm.watts, sp, hp.product)); if (!pass) cursor = after(); } }
    fps.forEach((fp, k) => {
      const fk = isFilter(fp.id); if (!fk || !go(fp)) return;
      const { f, sp } = spot(fp, k && !fp.place ? after() : cursor), n0 = f.taken.length;
      const prod = filterProduct(fp.product), pk = prod?.kind === fk.kind ? prod : undefined;
      track(fp, () => { if (fk.kind === 'hob') hob(f, fk, sp, pk); else if (fk.kind === 'canister') canister(f, fk, sp, pk); else if (fk.kind === 'sponge') sponge(f, fk, sp, pk); else internal(f, fk, sp, pk); });
      const mine = f.taken.slice(n0);
      if (mine.length && !k) outlet = { f, u: fk.kind === 'canister' ? mine[mine.length - 1][0] + 35 : (mine[0][0] + mine[0][1]) / 2 };
    });
    if (!pass) cursor = after();
    const one = (id: string, b: (f: Frame, sp: Spot, pk?: GearPick) => void, u = () => after()) => { const p = get(id); if (!go(p)) return; const { f, sp } = spot(p!, u()); track(p!, () => b(f, sp, p)); };
    one('uv', (f, sp, pk) => uv(f, sp, has('sump') ? undefined : fm, pk), () => fm?.kind === 'canister' || has('sump') ? outlet.u + 40 : cursor);
    if (!has('sump')) one('skimmer', skimmerHob);
    one('surfskim', surfaceSkim); one('chillerfan', chillerFan);
    one('airstone', airstone);
    if (!has('sump')) one('ato', ato);
    // CO2 under the filter's outlet, on that wall, unless the owner moved it
    const cp = get('co2');
    if (go(cp)) { const s0 = spot(cp!, outlet.u), f = cp!.place ? s0.f : outlet.f; track(cp!, () => co2(f, s0.sp, cp!.co2)); }
    // powerheads on the side glass (default: the near one on the gear side, a second or the wavemaker on the other)
    const ph = get('powerhead'), wm = get('wavemaker'), Db = T.D - backdropDepth(S.backdrop, T);
    if (go(ph)) { const s0 = ph!.place ? spot(ph!, 0) : { f: fr(dflt), sp: { u: Db * 0.7, y: 0.7 } as Spot }; track(ph!, () => powerhead(s0.f, s0.sp, false, pumpProduct(ph!.product))); if ((ph!.n ?? 1) > 1) powerhead(fr(opp), { u: Db * 0.45, y: 0.55 }, false, pumpProduct(ph!.product)); }
    if (go(wm)) { const s0 = wm!.place ? spot(wm!, 0) : { f: fr(opp), sp: { u: Db * 0.45, y: 0.55 } as Spot }; track(wm!, () => powerhead(s0.f, s0.sp, true, pumpProduct(wm!.product))); }
  }
  // a dry tank's top gear: anywhere on the top, the owner's spot or its default; the whole body is its grab box
  const taken: [number, number, number, number][] = [], tops = picks.filter(p => TOP[p.id]);
  for (const p of [...tops.filter(p => p.place?.wall === 'lid'), ...tops.filter(p => p.place?.wall !== 'lid')]) { // the owner's spots first; the others find room
    const top = TOP[p.id], q = p.place?.wall === 'lid' ? p.place : undefined, [hx, hd] = top.half(S, T);
    const at = clearOnTop(S, T, q ? { x: q.u, d: q.d ?? T.D / 2 } : top.at(T), hx, hd, taken);
    taken.push([at.x, at.d, hx, hd]);
    let tail = () => {}; track(p, () => { tail = top.build(S, T, kit, at); }, true); tail();
  }
  for (const p of picks) BESIDE[p.id]?.(S, T, kit);
  const out = kit.meshes();
  for (const m of out) m.visible = shown;
  if (out[0]) out[0].userData.gearPieces = pieces;
  live = live.filter(o => o.parent).concat(out);
  return out;
}

/** World boxes of the tank's solid pieces (hardscape, not plants). */
export const solidBoxes = (meshes: THREE.Mesh[]) => meshes.filter(m => !m.userData.plant).map(m => new THREE.Box3().setFromObject(m));

/** The part key: what the gear's look depends on beyond the scene's envKey (the hardscape it keeps clear of, the plants' feed). */
export const gearKey = (S: TankSetup, hard: string[]) => 'gear' + JSON.stringify(gearPicks(S)) + hard.join('');

/** The review sheet's gear models (review.html): id, label, the picks that show it (with what it hangs on) and the tank. */
export const GEAR_LOOKS: { id: string; label: string; picks: GearPick[]; salt?: boolean }[] = [
  ...FILTER_MODELS.map(m => ({ id: m.id, label: `${m.label} · ${m.gph} gph`, picks: [{ id: m.id }] })),
  ...HEATER_MODELS.map(m => ({ id: m.id, label: m.label, picks: [{ id: m.id }] })),
  { id: 'airstone', label: 'Air pump + airstone', picks: [{ id: 'airstone' }] },
  { id: 'co2', label: 'CO2: diffuser, bubble counter, drop checker, cylinder', picks: [{ id: 'co2' }] },
  { id: 'uv-internal', label: 'UV sterilizer (internal)', picks: [{ id: 'uv' }, { id: 'hob-s' }] },
  { id: 'uv-inline', label: 'UV sterilizer (inline, canister)', picks: [{ id: 'uv' }, { id: 'canister-m' }] },
  { id: 'powerhead', label: 'Powerhead', picks: [{ id: 'powerhead' }], salt: true },
  { id: 'wavemaker', label: 'Wavemaker', picks: [{ id: 'wavemaker' }], salt: true },
  { id: 'skimmer', label: 'Protein skimmer (HOB)', picks: [{ id: 'skimmer' }], salt: true },
  { id: 'sump', label: 'Sump: overflow, return, skimmer', picks: [{ id: 'sump' }], salt: true },
  { id: 'ato', label: 'ATO sensor', picks: [{ id: 'ato' }], salt: true },
];
/** One review model: its meshes built in tank S (left back corner), as a group centred on its box. */
export function gearModel(S: TankSetup, look: (typeof GEAR_LOOKS)[number]) {
  const S2 = { ...S, water: { ...S.water, on: true, salt: !!look.salt }, stand: { ...S.stand, show: true, style: 'frame' as const } };
  const g = new THREE.Group(); for (const m of buildGear(S2, S2.tank, [], look.picks, 'left')) g.add(m);
  const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  for (const m of g.children) { m.position.sub(c); m.visible = true; } // a review model is always shown
  return g;
}
