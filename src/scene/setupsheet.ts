// Setup sheet / shopping list (lane SH, 2026-10-16): everything needed to build the current tank, worked out from the
// scene alone (no model calls, nothing random). Pure data: ui/setupsheet.ts draws it and writes the .txt / .csv.
import { GRAIN_LOOK, SUBSTRATES } from '../art/placeholder';
import { getSpecies, speciesOf } from '../data/species';
import { FIXTURES, TECHS, fixtureOf, techOf, wattsOf } from './lightout';
import { LIBRARY, KINDS, itemDims } from './items';
import { IN, fmtDims, fmtLen, glassThickness, volume, waterY } from './physics';
import { SHAPES, footprint, inside, shapeOf } from './shape';
import { groundHeight } from './terrain';
import type { Scene, TankSetup } from './types';
import { ownedGearLines } from './ownedGear';
import { tankWeight } from './weight';

export interface SheetRow { item: string; qty: string; detail: string }
export interface SheetSection { title: string; rows: SheetRow[] }
export interface Sheet { title: string; sections: SheetSection[]; note: string }

/** Substrate bag sizes (litres of loose substrate) assumed until the user edits the field: a 20 lb / 9 kg bag of aquarium
 *  gravel or sand (1.6 kg per litre), an 8 US quart bag of terrarium soil. */
export const BAG_L = { aquarium: 9 / 1.6, terra: 8 * 0.946353 };
/** Bags are ordered with this much spare (settling, trimming). */
export const SPARE = 1.1;
const TERRA = new Set(['soil', 'tsand', 'clay', 'bark', 'layered']);
export const isTerraSub = (type: string) => TERRA.has(type);

/** Rough weight model for hardscape: bounding box x fill x density (kg per litre). Approximate and labelled so. */
const FILL: Record<string, [fill: number, kgL: number]> = {
  slate: [0.8, 2.7], ledge: [0.8, 2.7], lava: [0.55, 1.6], dragon: [0.5, 2.2], liverock: [0.45, 1.8],
  branch: [0.15, 0.8], manzanita: [0.1, 0.8], spider: [0.12, 0.8], climb: [0.08, 0.8], mopani: [0.5, 1.0],
  corkflat: [0.25, 0.2], corktube: [0.25, 0.2], coconut: [0.3, 0.5], tube: [0.3, 1.8], arch: [0.35, 2.7], halflog: [0.35, 0.6],
};
const DEFAULT_FILL: Record<string, [number, number]> = { stone: [0.5, 2.7], wood: [0.3, 0.8], cave: [0.35, 2.0] };
export function pieceKg(it: { kind: string; variant: string; seed: number; size: number }) {
  const [x, y, z] = itemDims(it as Parameters<typeof itemDims>[0]);
  const [fill, d] = FILL[it.variant] ?? DEFAULT_FILL[it.kind] ?? [0.4, 2];
  return (x * y * z) / 1e6 * fill * d;
}

/** Ground volume by a grid over the floor, litres: under the water line, above it, and the share of floor above water. */
export function groundVolume(S: TankSetup, n = 60) {
  const T = S.tank, top = S.water.on ? waterY(T, S.water.level) : 0, fp = footprint(T);
  const cells: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = T.L * (i + 0.5) / n, d = T.D * (j + 0.5) / n; if (inside(T, x, d)) cells.push([x, d]); }
  const cell = fp.area / Math.max(1, cells.length) / 1e6; // litres per mm of height
  let under = 0, over = 0, land = 0, lo = Infinity, hi = 0;
  for (const [x, d] of cells) {
    const g = groundHeight(S, T, x, d);
    under += Math.min(g, top) * cell; over += Math.max(0, g - top) * cell;
    if (g > top && S.water.on) land++;
    lo = Math.min(lo, g); hi = Math.max(hi, g);
  }
  let edgeLo = Infinity; // the shallowest ground at the glass: what the drainage layer is cut from (render/build.ts)
  for (const e of fp.edges) for (let k = 0; k <= 8; k++) edgeLo = Math.min(edgeLo, groundHeight(S, T, e.a[0] + (e.b[0] - e.a[0]) * k / 8, e.a[1] + (e.b[1] - e.a[1]) * k / 8));
  return { litres: under + over, under, over, landShare: cells.length ? land / cells.length : 0, lo: cells.length ? lo : 0, hi, edgeLo: isFinite(edgeLo) ? edgeLo : 0, area: fp.area / 1e6 };
}

const r1 = (v: number) => +v.toFixed(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export interface SheetOpts { /** Litres of loose substrate in one bag; absent = the assumed default for the ground type. */ bagL?: number }

/** Default bag size (litres) for this tank's ground. */
export const defaultBagL = (S: TankSetup) => (isTerraSub(S.substrate.type) ? BAG_L.terra : BAG_L.aquarium);

export function buildSheet(scene: Scene, index = scene.active, opts: SheetOpts = {}): Sheet {
  const S = scene.tanks[index] ?? scene.tanks[0], T = S.tank, u = scene.units;
  const kg = (v: number) => (u === 'in' ? `${Math.round(v * 2.20462)} lb` : `${Math.round(v)} kg`);
  const vol = (l: number) => (u === 'in' ? `${r1(l / 3.785411784)} gal` : `${r1(l)} L`);
  const vc = volume(T), wt = tankWeight(S), gv = S.substrate.show ? groundVolume(S) : null;
  const sections: SheetSection[] = [];

  // ---- tank
  const t = glassThickness(T, S.render.glass);
  const tank: SheetRow[] = [
    { item: 'Shape', qty: '', detail: SHAPES[shapeOf(T)] },
    { item: 'Interior size', qty: '', detail: fmtDims(T, u).replace(/^.*?(?=\d+(\.\d+)? ×)/, '') },
    { item: 'Glass', qty: '', detail: `${+t.toFixed(1)} mm (${r1(t / IN)}″) ${S.render.glassType === 'lowiron' ? 'low-iron' : 'standard'}` },
    { item: 'Capacity', qty: '', detail: `${vol(vc.litres)} to the brim` },
  ];
  if (S.water.on) {
    tank.push({ item: 'Water', qty: '', detail: `${vol(wt.waterLitres)} at the water line${S.water.salt ? ' (saltwater)' : ''}` });
    if (gv && gv.landShare > 0.02) tank.push({ item: 'Land / water split', qty: '', detail: `${Math.round(gv.landShare * 100)} % land, ${Math.round((1 - gv.landShare) * 100)} % water (by floor area)` });
  } else tank.push({ item: 'Water', qty: '', detail: 'none (dry tank)' });
  tank.push({ item: 'Lid', qty: '', detail: { open: 'open top', glass: 'glass canopy', hood: 'hood with lights inside', mesh: 'screen (mesh) top' }[S.lid] });
  if (S.doors === 'hinged' || S.doors === 'sliding') tank.push({ item: 'Front doors', qty: '', detail: S.doors === 'hinged' ? 'hinged glass doors' : 'sliding glass doors' });
  if (S.stand.show) tank.push({ item: 'Stand', qty: '', detail: `${S.stand.style}, ${S.stand.finish}, ${fmtLen(S.stand.height, u, 0)} high` });
  // hardscape weight is shown below; the filled total adds it
  const hard = S.items.filter(i => i.kind === 'stone' || i.kind === 'wood' || i.kind === 'cave');
  const hardKg = hard.reduce((a, i) => a + pieceKg(i), 0);
  tank.push({ item: 'Weight, filled', qty: '', detail: `≈ ${kg(wt.total + hardKg)}: water ${kg(wt.water)}, substrate ${kg(wt.substrate)}, glass ${kg(wt.glass)}${hard.length ? `, hardscape ≈ ${kg(hardKg)}` : ''}; not stand, plants or equipment` });
  sections.push({ title: 'Tank', rows: tank });

  // ---- substrate
  const sub = S.substrate, subRows: SheetRow[] = [];
  if (!gv || gv.litres < 0.05) subRows.push({ item: 'Substrate', qty: '', detail: 'none' });
  else {
    const bag = opts.bagL ?? defaultBagL(S), bagTxt = u === 'in' ? `${r1(bag / 0.946353)} qt` : `${r1(bag)} L`;
    let name: string;
    if (sub.type === 'custom') {
      const c = sub.custom, g2 = c.grain2 !== 'none' ? ` mixed with ${GRAIN_LOOK[c.grain2].label.toLowerCase()} (${c.share} %)` : '';
      name = `Custom: ${GRAIN_LOOK[c.grain].label.toLowerCase()}${g2}`;
    } else name = SUBSTRATES[sub.type].label;
    let main = gv.litres, drain = 0;
    if (sub.type === 'layered') {
      const dh = Math.min(45, Math.max(8, 0.5 * gv.edgeLo)); // as drawn: 50 % of the shallowest ground, 8-45 mm
      drain = Math.min(gv.litres, dh * gv.area);
      main = gv.litres - drain;
    }
    const bags = (l: number) => Math.max(1, Math.ceil(l * SPARE / bag));
    subRows.push({ item: name, qty: plural(bags(main), 'bag'), detail: `${vol(main)} ≈ ${kg(main * 1.6)} loose; bags of ${bagTxt} (assumed, change it above), +10 % spare` });
    if (drain > 0) subRows.push({ item: 'Drainage layer: expanded clay balls', qty: plural(bags(drain), 'bag'), detail: `${vol(drain)} under the soil, with a mesh sheet on top` });
    const prof = `${fmtLen(gv.lo, u, 1)} at the shallowest, ${fmtLen(gv.hi, u, 1)} at the deepest`;
    subRows.push({ item: 'Ground profile', qty: '', detail: S.terrain.on ? `custom terrain, ${prof}` : prof });
    if (sub.litter) subRows.push({ item: `Leaf litter (${sub.litter.leaf})`, qty: '', detail: `${sub.litter.density} % cover, loose leaves on top; not counted in the bags` });
  }
  sections.push({ title: 'Substrate', rows: subRows });

  // ---- hardscape, by kind and variant
  const group = (kinds: string[]) => {
    const rows: SheetRow[] = [], by = new Map<string, typeof S.items>();
    for (const it of S.items.filter(i => kinds.includes(i.kind))) by.set(it.variant, [...(by.get(it.variant) ?? []), it]);
    for (const [v, list] of by) {
      const lv = LIBRARY[v], sizes = list.map(i => i.size), lo = Math.min(...sizes), hi = Math.max(...sizes);
      const sz = lo === hi ? fmtLen(lo, u, 0) : `${fmtLen(lo, u, 0)} to ${fmtLen(hi, u, 0)}`;
      const isHard = kinds.includes('stone');
      rows.push({ item: lv?.label ?? v, qty: String(list.length), detail: isHard ? `${lv?.kind === 'stone' ? 'stone' : lv?.kind ?? ''}, ${sz} long; ≈ ${kg(list.reduce((a, i) => a + pieceKg(i), 0))} in all` : `${sz} ${lv?.kind === 'coral' ? 'wide' : 'tall'}` });
    }
    return rows;
  };
  const hr = group(['stone', 'wood', 'cave']);
  sections.push({ title: 'Hardscape', rows: hr.length ? hr : [{ item: 'None', qty: '', detail: '' }] });
  const pr = group(['plant']);
  sections.push({ title: 'Plants', rows: pr.length ? [...pr, { item: 'Total', qty: String(S.items.filter(i => i.kind === 'plant').length), detail: '' }] : [{ item: 'None', qty: '', detail: '' }] });
  const cr = group(['coral']);
  if (cr.length) sections.push({ title: KINDS.coral, rows: cr });
  const fr = group(['artificial']); // lane P4
  if (fr.length) sections.push({ title: KINDS.artificial, rows: fr });

  // ---- animals
  const an = new Map<string, number>();
  for (const f of S.fish) an.set(f.species, (an.get(f.species) ?? 0) + 1);
  const arows: SheetRow[] = [];
  for (const [id, n] of an) {
    const sp = getSpecies(id), sps = sp ? speciesOf({ species: id }) ?? sp : undefined;
    arows.push({ item: sp?.name ?? id, qty: String(n), detail: sps ? `${sp?.sci ?? ''}; adult ≈ ${fmtLen(sps.tl, u, sps.tl >= 100 ? 0 : 1)}` : '' });
  }
  sections.push({ title: 'Animals', rows: arows.length ? arows : [{ item: 'None', qty: '', detail: '' }] });

  // ---- equipment (only what the scene holds)
  const L = S.light, fx = fixtureOf(L), eq: SheetRow[] = [];
  if (fx !== 'flat' && !L.owned) {
    const w = Math.round(wattsOf(S));
    eq.push({ item: FIXTURES[fx].label, qty: String(fx === 'led' ? 1 : L.count), detail: `${TECHS[techOf(L)].label}, ${L.kelvin} K${w ? `, ${w} W in all` : ''}${L.par ? `, PAR ${L.par} at the substrate (as set)` : ''}` });
  }
  if (eq.length) sections.push({ title: 'Equipment', rows: eq });
  const have = ownedGearLines(S); // lane GM6: gear marked "I own one"
  if (have.length) sections.push({ title: 'Already have', rows: have.map(h => ({ item: h.label, qty: '', detail: h.note === 'you have' ? 'you have it: $0' : `you have it: $0 (${h.note})` })) });

  return {
    title: scene.name || 'Untitled tank',
    sections,
    note: 'Planned from the 3D model: weights and bag counts are approximate. Not included: filter, heater, pumps, test kits, stand.',
  };
}

// ---- export formats
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export const sheetCsv = (s: Sheet) => ['Section,Item,Qty,Detail', ...s.sections.flatMap(x => x.rows.map(r => [x.title, r.item, r.qty, r.detail].map(q).join(',')))].join('\r\n') + '\r\n';
export function sheetText(s: Sheet) {
  const out = [s.title, '='.repeat(Math.max(8, s.title.length)), ''];
  for (const x of s.sections) {
    out.push(x.title.toUpperCase());
    for (const r of x.rows) out.push(`  ${r.item}${r.qty ? ` x ${r.qty}` : ''}${r.detail ? ` - ${r.detail}` : ''}`);
    out.push('');
  }
  out.push(s.note);
  return out.join('\n') + '\n';
}
