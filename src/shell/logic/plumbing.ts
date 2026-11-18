// Lane PB1 (R100, 2026-11-17): the Plumbing view's data. Pure: a list of connections (A -> B, what rides it, the GPH or watts the gear
// states) derived from the tank's equipment (techParts, IL1's return-hose gear), plus plain sums. NO fluid dynamics, no heat loss, RATED
// flow only (Nathan 2026-11-16). The view (shell/plumbing.tsx) draws it; nothing here touches the DOM.
import type { TankSetup } from '../../scene/types';
import { rowsFor, techOf, techParts, type TechPiece } from '../../scene/tech';
import { volume } from '../../scene/physics';
import { OVERFLOW_PRODUCTS, filterProduct, heaterProduct, inlineProduct, productName, pumpProduct, reefProduct } from '../../data/gearCatalog';
import { FILTER_MODELS } from '../../demand/gear';

/** What rides a connection: clean water, dirty water to the filter, CO2 (green), heat (red), cooling (cyan), skimmate. */
export type Flow = 'clean' | 'dirty' | 'co2' | 'heat' | 'cold' | 'waste' | 'air';
export type NodeKind = 'tank' | 'filter' | 'inline' | 'heater' | 'chiller' | 'co2' | 'pump' | 'skimmer' | 'ato' | 'sump' | 'uv' | 'sink';
export interface PNode {
  id: string; kind: NodeKind; name: string;
  /** small lines under the name: rated GPH, watts, what is inside */
  lines: string[];
  gph?: number; watts?: number;
  /** filters: the filter kind (sponge, internal, hob, canister, sump), so the view can draw each its own way */
  fkind?: string;
  /** drawn inside the tank (heater, powerhead, sponge) rather than outside it */
  inTank?: boolean;
}
export interface PEdge { from: string; to: string; flow: Flow; gph?: number; watts?: number }
/** How the main water loop is drawn: none = no loop (an empty or air-only tank). */
export type Loop = 'none' | 'inTank' | 'hob' | 'canister' | 'sump';
export interface Plumb {
  gal: number; loop: Loop;
  nodes: PNode[]; edges: PEdge[];
  /** the filter node(s) of the loop, the return-hose chain (in flow order, filter -> tank) and the in-tank gear */
  filters: PNode[]; chain: PNode[]; inTank: PNode[];
  sums: { filterGph: number; turnover: number; circGph: number; heaterW: number; wPerGal: number; returnGph?: number; overflowGph?: number };
  warnings: string[];
  empty: boolean;
}
export interface PlumbOpts {
  /** the overflow box's rated GPH (lane PB2); absent = no overflow data, nothing is checked */
  overflowGph?: number;
}

const filterName = (p: TechPiece) => {
  const fp = filterProduct(p.product);
  if (fp) return productName(fp);
  return FILTER_MODELS.find(m => m.id === p.model)?.label ?? 'Filter';
};
const FILTER_INSIDE: Record<string, string> = { sponge: 'sponge · bacteria', internal: 'sponge · bio media', hob: 'sponge · carbon · bio media', canister: 'foam · bio rings · carbon', sump: 'baffles · bio media' };
const round = (n: number, d = 0) => { const k = 10 ** d; return Math.round(n * k) / k; };

export function plumbingOf(S: TankSetup, opts: PlumbOpts = {}): Plumb {
  const gal = volume(S.tank).gallons, t = techOf(S), parts = techParts(S);
  // the overflow box the tank chose (PB2, data/gear/overflows.json): the maker's rated GPH; an explicit opts.overflowGph wins
  const ovf = OVERFLOW_PRODUCTS.find(o => o.id === t.products?.overflow), overflowGph = opts.overflowGph ?? ovf?.ratedGph;
  const nodes: PNode[] = [{ id: 'tank', kind: 'tank', name: 'Tank', lines: [] }], edges: PEdge[] = [];
  const filters: PNode[] = [], chain: PNode[] = [], inTank: PNode[] = [];
  const add = (n: PNode) => { nodes.push(n); return n; };
  const warnings: string[] = [];
  let filterGph = 0, heaterW = 0, circGph = 0, returnGph: number | undefined;

  // ---- filters: one node per unit; a sump setup is the sump + its return pump
  const fPieces = parts.filter(p => p.gear === 'filter');
  const kindOf = (p: TechPiece) => p.option;
  const pumpPiece = parts.find(p => p.gear === 'returnpump');
  const sumpPiece = parts.find(p => p.gear === 'sump');
  const external = fPieces.find(p => kindOf(p) === 'canister') ?? fPieces.find(p => kindOf(p) === 'hob');
  let loop: Loop = 'none';
  fPieces.forEach((p, i) => {
    const k = kindOf(p), each = p.gph ?? 0, total = each * (p.n || 1);
    if (k !== 'sump') filterGph += total;
    const lines = [`${each ? `${round(each)} GPH rated` : 'air driven'}${p.n > 1 ? ` × ${p.n}` : ''}`, ...(p.watts ? [`${round(p.watts * (p.n || 1))} W`] : []), FILTER_INSIDE[k] ?? ''].filter(Boolean);
    const node = add({ id: `filter${i}`, kind: 'filter', name: p.n > 1 ? `${filterName(p)}` : filterName(p), lines, gph: total || undefined, watts: p.watts, fkind: k, inTank: k === 'sponge' || k === 'internal' });
    filters.push(node);
  });
  if (sumpPiece || (pumpPiece && !fPieces.length)) {
    const sump = add({ id: 'sump', kind: 'sump', name: 'Sump', lines: ['baffles · bio media'] });
    filters.push(sump);
    loop = 'sump';
    if (pumpPiece?.gph) { returnGph = pumpPiece.gph; filterGph += pumpPiece.gph; }
  } else if (external) loop = kindOf(external) === 'canister' ? 'canister' : 'hob';
  else if (fPieces.length) loop = 'inTank';
  const mainFilter = loop === 'sump' ? nodes.find(n => n.id === 'sump') : loop === 'canister' || loop === 'hob' ? filters[fPieces.indexOf(external!)] : undefined;

  // ---- the return hose chain, filter -> tank: a canister's in-line gear (IL1), then UV and chiller
  const cPiece = fPieces.find(p => kindOf(p) === 'canister');
  const inlineIds = loop === 'canister' ? cPiece?.inline ?? [] : [];
  let co2Inline: PNode | undefined;
  for (const id of inlineIds) {
    const ip = inlineProduct(id); if (!ip) continue;
    const isHeat = ip.kind === 'heater', name = ip.kind === 'heater' ? 'In-line heater' : ip.kind === 'reactor' ? 'In-line CO₂ reactor' : 'In-line CO₂ diffuser';
    const n = add({ id: `inline-${id}`, kind: ip.kind === 'heater' ? 'heater' : 'inline', name, lines: [productName(ip), ...(isHeat && ip.watts ? [`${ip.watts} W`] : [])], watts: isHeat ? ip.watts : undefined });
    if (isHeat) heaterW += ip.watts ?? 0; else co2Inline ??= n;
    chain.push(n);
  }
  // heaters: in the tank, one node each; a heater built into a filter is that filter's
  for (const f of fPieces) { const fp = filterProduct(f.product); if (fp?.heater && fp.kind === kindOf(f)) { heaterW += fp.heater.w; const n = nodes.find(x => x.id === `filter${fPieces.indexOf(f)}`); if (n) { n.lines.push(`${fp.heater.w} W heater built in`); edges.push({ from: n.id, to: 'tank', flow: 'heat', watts: fp.heater.w }); } } }
  for (const h of parts.filter(p => p.gear === 'heater')) {
    const hp = heaterProduct(h.product), w = h.watts ?? 0; heaterW += w;
    const n = add({ id: `heater-${h.row}`, kind: 'heater', name: hp ? productName(hp) : 'Heater', lines: [`${round(w)} W`], watts: w, inTank: true });
    inTank.push(n); edges.push({ from: n.id, to: 'tank', flow: 'heat', watts: w });
  }
  // the inline heaters' heat rides the return hose
  for (const n of chain.filter(c => c.kind === 'heater')) edges.push({ from: n.id, to: 'tank', flow: 'heat', watts: n.watts });

  // UV and chiller sit on the return where there is a loop to sit on
  const uv = parts.find(p => p.gear === 'uv');
  if (uv && loop !== 'none' && loop !== 'inTank') chain.push(add({ id: 'uv', kind: 'uv', name: 'UV sterilizer', lines: uv.watts ? [`${round(uv.watts)} W`] : [], watts: uv.watts }));
  const ch = parts.find(p => p.gear === 'chiller'), fan = parts.find(p => p.gear === 'chillerfan');
  if (ch) {
    const cp = reefProduct('chiller', ch.product ?? t.products?.chiller);
    const n = add({ id: 'chiller', kind: 'chiller', name: cp ? productName(cp) : 'Chiller', lines: ['cools the return'] });
    if (loop !== 'none' && loop !== 'inTank') { chain.push(n); edges.push({ from: n.id, to: 'tank', flow: 'cold' }); } else { n.inTank = true; inTank.push(n); edges.push({ from: n.id, to: 'tank', flow: 'cold' }); }
  } else if (fan) { const n = add({ id: 'fan', kind: 'chiller', name: 'Cooling fan', lines: ['cools the surface'], inTank: true }); inTank.push(n); edges.push({ from: n.id, to: 'tank', flow: 'cold' }); }

  // ---- water edges: tank -> (intake) -> filter -> chain -> tank
  if (loop === 'canister' || loop === 'hob' || loop === 'sump') {
    const f = mainFilter!, gph = f.gph ?? returnGph;
    edges.push({ from: 'tank', to: f.id, flow: 'dirty', gph });
    let prev = f.id;
    for (const c of chain) { edges.push({ from: prev, to: c.id, flow: 'clean', gph }); prev = c.id; }
    edges.push({ from: prev, to: 'tank', flow: 'clean', gph });
  } else if (loop === 'inTank') for (const f of filters) edges.push({ from: 'tank', to: f.id, flow: 'dirty', gph: f.gph }), edges.push({ from: f.id, to: 'tank', flow: 'clean', gph: f.gph });

  // ---- a sponge filter is air driven: the air pump feeds it through an airline
  const spongeNode = filters.find(f => f.fkind === 'sponge');
  if (spongeNode) {
    const ap = parts.find(x => x.gear === 'airpump'), pp = pumpProduct(ap?.product);
    const a = add({ id: 'airpump', kind: 'pump', name: pp ? productName(pp) : 'Air pump', lines: [ap?.watts ? `${round(ap.watts)} W` : 'air line to the sponge'] });
    edges.push({ from: a.id, to: spongeNode.id, flow: 'air' });
  }

  // ---- CO2: cylinder (or the kit) -> the in-line reactor if there is one, else a diffuser in the tank; out through plants and the surface
  const co2 = parts.find(p => p.row === 'co2' && ['co2kit', 'co2cart', 'diyco2'].includes(p.gear));
  if (co2) {
    const cyl = add({ id: 'co2', kind: 'co2', name: co2.gear === 'co2kit' ? 'CO₂ cylinder' : co2.gear === 'co2cart' ? 'CO₂ cartridge' : 'DIY CO₂', lines: co2.gear === 'co2kit' ? ['regulator · bubble counter'] : [] });
    if (co2Inline) edges.push({ from: cyl.id, to: co2Inline.id, flow: 'co2' });
    else { const d = add({ id: 'diffuser', kind: 'inline', name: 'CO₂ diffuser', lines: ['in the tank'], inTank: true }); inTank.push(d); edges.push({ from: cyl.id, to: d.id, flow: 'co2' }, { from: d.id, to: 'tank', flow: 'co2' }); }
    const plants = add({ id: 'plants', kind: 'sink', name: 'plant uptake', lines: [] }), air = add({ id: 'air', kind: 'sink', name: 'off-gassing at the surface', lines: [] });
    edges.push({ from: 'tank', to: plants.id, flow: 'co2' }, { from: 'tank', to: air.id, flow: 'co2' });
    if (co2Inline) edges.push({ from: co2Inline.id, to: 'tank', flow: 'co2' });
  }

  // ---- skimmer, top-off, in-tank pumps
  const sk = rowsFor(S).some(r => r.id === 'skimmer') && (t.rows.skimmer ?? 'none') !== 'none' ? { watts: parts.find(p => p.row === 'skimmer')?.watts, product: undefined as string | undefined } : undefined;
  if (sk) {
    const sp = reefProduct('skimmer', sk.product ?? t.products?.skimmer);
    const n = add({ id: 'skimmer', kind: 'skimmer', name: sp ? productName(sp) : 'Protein skimmer', lines: sp?.watts ? [`${round(sp.watts)} W`] : sk.watts ? [`${round(sk.watts)} W`] : [] });
    const w = add({ id: 'skimmate', kind: 'sink', name: 'skimmate', lines: [] });
    edges.push({ from: loop === 'sump' ? 'sump' : 'tank', to: n.id, flow: 'dirty' }, { from: n.id, to: loop === 'sump' ? 'sump' : 'tank', flow: 'clean' }, { from: n.id, to: w.id, flow: 'waste' });
    if (loop !== 'sump') n.inTank = true;
  }
  const ato = parts.find(p => p.row === 'ato');
  if (ato) { const n = add({ id: 'ato', kind: 'ato', name: 'Auto top-off', lines: ['fresh RO/DI water'] }); edges.push({ from: n.id, to: loop === 'sump' ? 'sump' : 'tank', flow: 'clean' }); }
  for (const p of parts.filter(x => x.row === 'flow')) {
    const pp = pumpProduct(p.product), total = (p.gph ?? 0) * (p.n || 1); circGph += total;
    const n = add({ id: `pump-${p.row}-${p.gear}`, kind: 'pump', name: pp ? productName(pp) : p.gear === 'wavemaker' ? 'Wavemaker' : 'Powerhead', lines: [`${p.n > 1 ? `${p.n} × ` : ''}${p.gph ? `${round(p.gph)} GPH rated` : 'flow'}`, ...(p.watts ? [`${round(p.watts * (p.n || 1))} W`] : [])], gph: total || undefined, watts: p.watts, inTank: true });
    inTank.push(n); edges.push({ from: n.id, to: 'tank', flow: 'clean', gph: total || undefined });
  }

  // ---- sums
  const sums: Plumb['sums'] = { filterGph: round(filterGph), turnover: gal > 0 ? round(filterGph / gal, 1) : 0, circGph: round(circGph), heaterW: round(heaterW), wPerGal: gal > 0 ? round(heaterW / gal, 1) : 0, returnGph, overflowGph };
  if (loop === 'sump' && returnGph !== undefined && overflowGph !== undefined && returnGph > overflowGph) warnings.push(`The return pump (${round(returnGph)} GPH rated) out-runs the overflow${ovf ? ` (${productName(ovf)}, ` : ' ('}${round(overflowGph)} GPH rated): the display would flood.`);
  return { gal, loop, nodes, edges, filters, chain, inTank, sums, warnings, empty: nodes.length === 1 };
}

/** Greedy word wrap to at most `max` lines of `cap` characters; only a name still too long after that is cut with an ellipsis (the <title> tooltip carries the whole name). */
export function wrap(text: string, cap: number, max = 2): string[] {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w; else if ((cur + ' ' + w).length <= cap) cur += ' ' + w; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > max) { const keep = out.slice(0, max); keep[max - 1] = (keep[max - 1] + ' ' + out.slice(max).join(' ')).trim(); out.length = 0; out.push(...keep); }
  return out.map(l => (l.length > cap + 2 ? `${l.slice(0, cap - 1)}…` : l));
}
