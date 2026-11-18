// Lane PB1 (R100, 2026-11-17): the Plumbing view. A schematic over the viewer (the 3D view stays underneath, untouched): the side cutaway on desktop,
// the flat portrait drawing under 700 px (PV1 mockups 02a / 02b). Draws logic/plumbing.ts; nothing here computes flow.
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { mmToIn } from '../units';
import { plumbingOf, wrap, type Flow, type Plumb, type PNode } from './logic/plumbing';

const COL: Record<Flow, string> = { clean: '#47a3ff', dirty: '#6f88a8', co2: '#34d57f', heat: '#ff5b52', cold: '#6fe0e8', waste: '#b8935f', air: '#cfe3f5' };
const TXT: Record<Flow, string> = { clean: 'pbtc', dirty: 'pbtd', co2: 'pbtg', heat: 'pbth', cold: 'pbtk', waste: 'pbtw', air: 'pbta' };

/** The Tank | Plumbing switch, top left of the viewer. */
export function PlumbSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="ov pbswitch glass" role="tablist" aria-label="View">
      <div class="seg">
        <button type="button" role="tab" class={on ? '' : 'on'} aria-selected={!on} onClick={() => onChange(false)}>Tank</button>
        <button type="button" role="tab" class={on ? 'on' : ''} aria-selected={on} title="How water, heat and CO₂ move between the equipment" onClick={() => onChange(true)}>Plumbing</button>
      </div>
    </div>
  );
}

// ---- drawing helpers (SVG)
const Defs = () => (
  <defs>
    <linearGradient id="pbwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a6fc0" stop-opacity=".34" /><stop offset="1" stop-color="#1c4c86" stop-opacity=".18" /></linearGradient>
    {(Object.keys(COL) as Flow[]).map(f => <marker id={`pba-${f}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={COL[f]} /></marker>)}
  </defs>
);
/** A moving-dash connection with a faint track under it; `dots` rides on top (CO2 / heat). */
function Pipe({ d, flow, w = 3, dots, arrow = true, faint, off = 0 }: { d: string; flow: Flow; w?: number; dots?: boolean; arrow?: boolean; faint?: boolean; off?: number }) {
  const c = COL[flow];
  return dots
    ? <path d={d} class="pbflow dots" stroke={c} stroke-width={w + 1.5} style={`--o:${off}px`} />
    : <g class={faint ? 'pbfaint' : ''}><path d={d} class="pbtrk" stroke={c} stroke-width={w * 3} /><path d={d} class="pbflow" stroke={c} stroke-width={w} style={`--o:${off}px`} marker-end={arrow ? `url(#pba-${flow})` : undefined} /></g>;
}
const Txt = ({ x, y, c = 'pbt2', a = 'start', children }: { x: number; y: number; c?: string; a?: 'start' | 'middle' | 'end'; children: string }) => <text x={x} y={y} class={c} text-anchor={a}>{children}</text>;
const capOf = (w: number, mid = false) => Math.max(8, Math.floor((w - (mid ? 10 : 20)) / 5.7));
/** A gear box: the whole name (wrapped to two lines, small type), then detail lines; `stroke` tints the outline, `dash` marks optional gear. */
function Box({ x, y, w, h, n, stroke, dash, mid, big }: { x: number; y: number; w: number; h: number; n: { name: string; lines: string[] }; stroke?: string; dash?: boolean; mid?: boolean; big?: boolean }) {
  const tx = mid ? x + w / 2 : x + 10, a = mid ? 'middle' : 'start', cap = capOf(w, mid);
  const nl = wrap(n.name, cap), rows: string[] = [];
  for (const l of n.lines) rows.push(...wrap(l, Math.floor(cap * 1.08), 2).slice(0, 2));
  const y0 = y + 17 + (nl.length - 1) * 13 + 15, fit = Math.max(0, Math.floor((y + h - 5 - y0) / 12) + 1);
  return (
    <g>
      <title>{[n.name, ...n.lines].join(' · ')}</title>
      <rect x={x} y={y} width={w} height={h} rx={8} class={`pbbox${dash ? ' dash' : ''}`} style={stroke ? `stroke:${stroke}` : undefined} />
      {nl.map((l, i) => <Txt x={tx} y={y + 17 + i * 13} c={big ? 'pbt1 big' : 'pbt1'} a={a}>{l}</Txt>)}
      {rows.slice(0, fit).map((l, i) => <Txt x={tx} y={y0 + i * 12} c="pbt2" a={a}>{l}</Txt>)}
    </g>
  );
}
/** Heat added by a heater: eight short straight arrows pointing outward in every direction (the view's flat arrow style, warm red), with a gentle outward pulse (still under Pause or reduced motion). */
function HeatHalo({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const arrows = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45 + (i % 2 ? 0 : 0), r = (deg * Math.PI) / 180, edge = (rx * ry) / Math.hypot(ry * Math.cos(r), rx * Math.sin(r)) + 6;
    return <path d={`M${edge.toFixed(1)} 0 L${(edge + 20).toFixed(1)} 0`} transform={`translate(${cx} ${cy}) rotate(${deg})`} class="pbray" marker-end="url(#pba-heat)" />;
  });
  return <g class="pbheat" style={`transform-origin:${cx}px ${cy}px`} pointer-events="none">{arrows}</g>;
}
const Plants = ({ x0, x1, base, k = 1 }: { x0: number; x1: number; base: number; k?: number }) => {
  const hs = [31, 45, 27, 40, 33, 48, 29, 38, 32, 42], out = [];
  for (let x = x0, i = 0; x <= x1; x += 40 * k, i++) { const h = hs[i % hs.length] * k, s = i % 2 ? -1 : 1; out.push(<path d={`M${x} ${base} q${-9 * s} ${-h} 0 ${-2 * h} M${x + 6} ${base} q${8 * s} ${-h * 0.66} 2 ${-1.4 * h}`} class="pbplant" />); }
  return <>{out}</>;
};
const faintArrows = (xs: number[], y0: number, y1: number, flow: Flow) => xs.map(x => <Pipe d={`M${x} ${y0} L${x} ${y1}`} flow={flow} w={2} faint />);

/** The gear that sits in the tank (heater, diffuser, powerhead, fan), left to right at tank row `y`; a heater radiates softly in all directions. */
function InTank({ items, x0, x1, y }: { items: PNode[]; x0: number; x1: number; y: number }) {
  if (!items.length) return null;
  const step = Math.min(140, (x1 - x0) / items.length), w = step - 12;
  return <>{items.map((n, i) => {
    const x = x0 + i * step, cx = x + w / 2, flow: Flow = n.kind === 'heater' ? 'heat' : n.kind === 'chiller' ? 'cold' : n.id === 'diffuser' ? 'co2' : 'clean';
    const arrows = flow === 'clean' ? <Pipe d={`M${x + w + 2} ${y + 12} L${x + w + 26} ${y + 12}`} flow="clean" w={2.5} /> : flow === 'cold' ? faintArrows([cx - 30, cx, cx + 30], y - 50, y - 22, 'cold') : flow === 'co2' ? [cx - 28, cx, cx + 28].map(ax => <Pipe d={`M${ax} ${y - 6} L${ax} ${y - 40}`} flow={flow} w={2.5} />) : null;
    const nl = wrap(n.name, Math.max(10, Math.floor((step - 4) / 5.5)));
    return (
      <g>
        <title>{[n.name, ...n.lines].join(' · ')}</title>
        {flow === 'heat' ? <HeatHalo cx={cx} cy={y + 12} rx={w / 2} ry={12} /> : null}
        <rect x={x} y={y} width={w} height={24} rx={flow === 'heat' ? 12 : 6} class="pbbox" style={`stroke:${flow === 'clean' ? COL.dirty : COL[flow]};fill:${flow === 'heat' ? '#3a1d20' : flow === 'co2' ? '#173a2b' : flow === 'cold' ? '#12333a' : ''}`} />
        {arrows}
        {nl.map((l, k) => <Txt x={cx} y={y + 38 + k * 12} c={`${TXT[flow]} s`} a="middle">{l}</Txt>)}
        {n.lines[0] ? <Txt x={cx} y={y + 38 + nl.length * 12} c="pbt3" a="middle">{n.lines[0]}</Txt> : null}
      </g>
    );
  })}</>;
}

/** The sponge filter drawn as it works (desktop): the air pump's airline enters at the base, bubbles rise in the lift tube and carry water up and out the top; water is drawn in through the sponge. */
function SpongeCutaway({ f, air }: { f: PNode; air?: PNode }) {
  const pores = [[462, 222], [480, 240], [458, 258], [518, 226], [526, 250], [470, 272], [512, 270], [504, 240]];
  return (
    <g>
      <title>{`${f.name} · ${f.lines.join(' · ')}`}</title>
      <Pipe d="M488 110 L300 118 Q190 124 190 200" flow="clean" arrow={false} />
      <Pipe d="M190 200 Q190 262 300 262 L446 252" flow="dirty" />
      <rect x={450} y={205} width={90} height={80} rx={10} fill="#3a3f47" stroke="#5b6472" />
      {pores.map(([px, py]) => <ellipse cx={px} cy={py} rx={3.5} ry={2.5} fill="#272b31" />)}
      {[225, 272].map(ay => <Pipe d={`M420 ${ay} L446 ${ay}`} flow="dirty" w={2} />)}
      {[240, 268].map(ay => <Pipe d={`M568 ${ay} L544 ${ay}`} flow="dirty" w={2} />)}
      <rect x={489} y={112} width={12} height={156} rx={3} fill="#9bb3cc" fill-opacity=".22" stroke="#9bb3cc" stroke-opacity=".7" />
      <path d="M495 112 L495 110 Q495 108 487 108 L470 108" fill="none" stroke="#9bb3cc" stroke-opacity=".7" stroke-width="2" />
      <path d="M495 268 L495 118" class="pbflow dots pbbub" stroke={COL.air} stroke-width="4.5" />
      <Pipe d="M472 108 L452 108" flow="clean" w={2.5} />
      <path d="M705 190 L705 60 L604 60 L604 289 L495 289 L495 268" class="pbflow" fill="none" stroke={COL.air} stroke-width="1.6" style="--o:0px" />
      <Txt x={713} y={128} c="pbta s">airline</Txt>
      <Txt x={440} y={192} c="pbtd s" a="end">water drawn in</Txt><Txt x={440} y={204} c="pbtd s" a="end">through the sponge</Txt>
      <Txt x={508} y={150} c="pbta s">bubbles lift the</Txt><Txt x={508} y={162} c="pbta s">water up the tube</Txt>
      <Txt x={440} y={99} c="pbtc s" a="end">out the top, with the air</Txt>
      {air ? <Box x={640} y={190} w={140} h={54} n={air} /> : null}
    </g>
  );
}

const hasCo2 = (p: Plumb) => p.nodes.some(n => n.id === 'co2');

/** The cutaway (desktop): the tank in section on a stand, the gear drawn around it. */
function Cutaway({ p, dims }: { p: Plumb; dims: string }) {
  const chain = p.chain, n = chain.length, co2 = p.nodes.find(x => x.id === 'co2');
  const sump = p.loop === 'sump', canister = p.loop === 'canister', hob = p.loop === 'hob', inT = p.loop === 'inTank';
  const x0 = sump ? 720 : 470, retX = Math.max(canister || sump ? 730 : 700, (canister || sump ? x0 + n * 115 : 700) + 20), W = hob ? 870 : retX + 90, short = hob || inT, VH = short ? 370 : 520;
  const heat = p.nodes.filter(x => x.kind === 'heater' && !x.inTank), inline = chain.find(x => x.kind === 'inline');
  const loopFilter = hob || canister ? p.filters.find(f => !f.inTank)! : undefined, inTankFilter = inT ? p.filters[0] : undefined, sponge = inT && inTankFilter?.fkind === 'sponge';
  const tankItems = p.inTank, diffIdx = tankItems.findIndex(x => x.id === 'diffuser');
  const itemStep = tankItems.length ? Math.min(140, (hob ? 400 : inT ? 200 : 420) / tankItems.length) : 0;
  const diffCx = diffIdx >= 0 ? 200 + diffIdx * itemStep + (itemStep - 12) / 2 : 0;
  const chainY = sump ? 470 : 420;
  // the return: out of the filter / pump, along the chain, up the right and over the rim into the tank
  const startRet = sump ? { x: 680, y: 490 } : { x: 420, y: 440 };
  const retD = `M${startRet.x} ${startRet.y} L${retX} ${startRet.y} L${retX} 85 L555 85 L555 118`;
  const retY = startRet.y;
  const entries = chain.map((c, i) => ({ c, x: x0 + i * 115 }));
  const co2Start = inline ? entries.find(e => e.c.id === inline.id)!.x + 52 : 0;
  const heatEntry = heat[0] ? entries.find(e => e.c.id === heat[0].id)!.x + 52 : 0;
  return (
    <svg class="pbdiag" viewBox={`0 40 ${W} ${VH}`} role="img" aria-label="Plumbing: side cutaway of the tank and its equipment" preserveAspectRatio="xMidYMid meet">
      <Defs />
      <rect x={92} y={95} width={516} height={205} fill="url(#pbwater)" /><rect x={92} y={270} width={516} height={30} class="pbsub" />
      <g opacity=".7"><Plants x0={230} x1={590} base={272} /></g>
      <path d="M92 95 H608" stroke="#47a3ff" stroke-opacity=".5" /><rect x={90} y={70} width={520} height={230} rx={3} class="pbglass" />
      <Txt x={92} y={61} c="pbt2">{dims}</Txt>

      {/* in-tank circulation of the loop */}
      {canister ? <Pipe d="M548 124 L280 132 Q158 136 150 190 L150 238" flow="clean" arrow={false} /> : null}
      {hob ? <Pipe d="M548 150 Q548 200 480 196 L250 196 Q150 196 150 240 Q150 282 250 282 L400 282" flow="clean" arrow={false} /> : null}
      {inT && inTankFilter && !sponge ? <><Pipe d="M470 205 L330 205 Q190 205 190 245" flow="clean" arrow={false} /><Pipe d="M190 245 Q190 282 330 282 L470 282" flow="dirty" /></> : null}

      {/* canister: intake hose out of the tank, the box, the chain, the return */}
      {canister && loopFilter ? <>
        <Pipe d={`M150 238 L150 410 L300 410`} flow="dirty" />
        <rect x={300} y={370} width={120} height={170} rx={8} class="pbbox" />
        <title>{[loopFilter.name, ...loopFilter.lines].join(' · ')}</title>{wrap(loopFilter.name, 19).map((l, i) => <Txt x={310} y={388 + i * 13} c="pbt1">{l}</Txt>)}
        {loopFilter.lines.slice(0, 3).map((l, i) => <Txt x={310} y={418 + i * 12}>{l}</Txt>)}
        <rect x={312} y={450} width={96} height={78} rx={4} fill="#11151b" stroke="#2f3644" /><Txt x={360} y={484} c="pbt3" a="middle">foam · bio rings</Txt><Txt x={360} y={500} c="pbt3" a="middle">carbon</Txt>
        <Pipe d={retD} flow="clean" w={3.5} /><Txt x={retX + 12} y={250} c="pbtc">return hose</Txt><Txt x={160} y={360} c="pbtd">intake hose</Txt><Txt x={566} y={150} c="pbtc">outflow</Txt>
      </> : null}
      {/* HOB: the box on the rim, the intake tube, the outflow lip */}
      {hob && loopFilter ? <>
        <Pipe d="M520 282 L596 282 L596 140 L640 140" flow="dirty" /><Txt x={604} y={215} c="pbtd">intake tube</Txt>
        <Pipe d="M650 84 L566 84 Q548 84 548 106 L548 150" flow="clean" /><Txt x={452} y={176} c="pbtc">outflow lip</Txt>
        <Box x={640} y={62} w={200} h={100} n={{ name: loopFilter.name, lines: loopFilter.lines }} big />
      </> : null}
      {inT && inTankFilter && !sponge ? <><Box x={470} y={190} w={130} h={92} n={{ name: inTankFilter.name, lines: inTankFilter.lines }} /></> : null}
      {sponge && inTankFilter ? <SpongeCutaway f={inTankFilter} air={p.nodes.find(x => x.id === 'airpump')} /> : null}

      {/* sump: overflow box, drain, the sump with its skimmer and return pump, the return */}
      {sump ? <>
        <rect x={566} y={95} width={40} height={140} class="pbbox" /><Txt x={586} y={160} c="pbt3" a="middle">over-</Txt><Txt x={586} y={173} c="pbt3" a="middle">flow</Txt>
        <Pipe d="M586 235 L586 345" flow="dirty" /><Txt x={596} y={290} c="pbtd">drain</Txt>
        <rect x={230} y={345} width={470} height={195} rx={8} class="pbbox" /><Txt x={242} y={364} c="pbt1">{`Sump${p.sumpDims ? ` · ${p.sumpDims}` : ''}`}</Txt>
        <rect x={242} y={450} width={100} height={78} rx={4} fill="#11151b" stroke="#2f3644" /><Txt x={292} y={494} c="pbt3" a="middle">baffles · bio</Txt>
        {p.nodes.find(x => x.id === 'skimmer') ? <><Box x={364} y={380} w={130} h={84} n={p.nodes.find(x => x.id === 'skimmer')!} /><Pipe d="M364 410 L250 410" flow="waste" /><Box x={110} y={388} w={110} h={46} n={{ name: 'Skimmate cup', lines: [] }} /></> : null}
        {p.nodes.find(x => x.id === 'ato') ? <><Box x={96} y={466} w={124} h={56} n={p.nodes.find(x => x.id === 'ato')!} /><Pipe d="M220 494 L242 494" flow="clean" /></> : null}
        <Box x={560} y={450} w={120} h={80} n={{ name: 'Return pump', lines: [p.sums.returnGph ? `${p.sums.returnGph} GPH rated` : '', ''].filter(Boolean) }} />
        <Pipe d={retD} flow="clean" w={3.5} /><Txt x={retX + 12} y={250} c="pbtc">return line</Txt>
      </> : null}

      {/* heat and CO2 ride the return from where they join */}
      {heat[0] ? <Pipe d={`M${heatEntry} ${retY} L${retX} ${retY} L${retX} 85 L555 85 L555 118`} flow="heat" dots off={3} /> : null}
      {co2 && inline ? <Pipe d={`M${co2Start} ${retY} L${retX} ${retY} L${retX} 85 L555 85 L555 118`} flow="co2" dots off={7} /> : null}
      {/* chain boxes (in-line heater / reactor, UV, chiller) sit on the return */}
      {entries.map(({ c, x }) => <Box x={x} y={chainY - 6} w={105} h={56} mid n={{ name: c.name.replace('In-line ', '').replace(/^./, m => m.toUpperCase()), lines: [c.name.startsWith('In-line') ? 'in-line' : '', c.lines.at(-1) ?? ''].filter(Boolean) }} stroke={c.kind === 'heater' ? COL.heat : c.kind === 'chiller' ? COL.cold : undefined} />)}
      {co2 && inline ? <><Box x={co2Start - 52} y={chainY + 76} w={105} h={52} mid n={{ name: co2.name, lines: co2.lines }} /><Pipe d={`M${co2Start} ${chainY + 76} L${co2Start} ${chainY + 52}`} flow="co2" /></> : null}
      {co2 && !inline ? <><Box x={diffCx - 52} y={348} w={104} h={52} mid n={{ name: co2.name, lines: co2.lines.slice(0, 1) }} /><Pipe d={`M${diffCx} 348 L${diffCx} ${258}`} flow="co2" /></> : null}
      {/* in-tank gear */}
      <InTank items={tankItems} x0={200} x1={sponge ? 400 : hob || inT ? 460 : 600} y={sponge ? 168 : 214} />
      {/* CO2 sinks */}
      {hasCo2(p) ? <>
        {faintArrows([330, 400, 470, 540].filter(x => !inT || x < 420), 150, 178, 'co2')}<Txt x={430} y={196} c="pbtg" a="middle">plant uptake</Txt>
        {faintArrows([190, 270, 350, 430, 510], 104, 78, 'co2')}<Txt x={330} y={64} c="pbtg">off-gassing at the surface</Txt>
      </> : null}
    </svg>
  );
}

/** The flat portrait drawing (phone): the tank on top, the loop running down the page and back up the right edge. */
function Flat({ p, dims }: { p: Plumb; dims: string }) {
  const co2 = p.nodes.find(x => x.id === 'co2'), loopF = p.loop === 'canister' || p.loop === 'hob' ? p.filters.find(f => !f.inTank) : p.loop === 'sump' ? p.filters.find(f => f.id === 'sump') : undefined;
  const sponge = p.loop === 'inTank' && p.filters[0]?.fkind === 'sponge' ? p.filters[0] : undefined;
  const items = [...p.inTank, ...(p.loop === 'inTank' && !sponge ? p.filters.slice(0, 1) : [])];
  const withSump = p.loop === 'sump';
  const sk = p.nodes.find(x => x.id === 'skimmer'), ato = p.nodes.find(x => x.id === 'ato');
  const step = items.length ? Math.min(100, 282 / items.length) : 0;
  type Slot = { n: PNode | { name: string; lines: string[] }; y: number; h: number; flow: Flow; id: string };
  const slots: Slot[] = []; let y = 206;
  const fl = (s: Slot, gap = 50) => { slots.push(s); y += s.h + gap; };
  if (loopF) {
    const lines = withSump ? [...(p.sumpDims ? [p.sumpDims] : []), ...(sk ? [`Skimmer: ${sk.name}`] : []), ...(p.sums.returnGph ? [`Return pump ${p.sums.returnGph} GPH rated`] : []), 'baffles · bio media'] : loopF.lines;
    fl({ n: { name: withSump ? 'Sump' : loopF.name, lines }, y, h: withSump ? 86 : 84, flow: 'dirty', id: loopF.id });
  }
  for (const c of p.chain) fl({ n: c, y, h: 60, flow: 'clean', id: c.id });
  const lastBottom = slots.length ? slots.at(-1)!.y + slots.at(-1)!.h : 168, retY = lastBottom + 50, H = (slots.length ? retY : Math.max(262, 170 + (co2 ? 80 : 0))) + 56;
  const inl = p.chain.find(c => c.kind === 'inline'), heatN = p.chain.find(c => c.kind === 'heater');
  const sideY = (id: string) => slots.find(s => s.id === id)?.y;
  const sides: { n: PNode; y: number; flow: Flow }[] = []; let free = 186;
  const place = (n: PNode | undefined, flow: Flow, at?: number) => { if (!n) return; const yy = at ?? free; if (at === undefined) free += 66; sides.push({ n, y: yy, flow }); };
  place(p.nodes.find(x => x.id === 'airpump'), 'air'); place(co2, 'co2', inl ? sideY(inl.id) : undefined); place(ato, 'clean'); place(p.nodes.find(x => x.id === 'skimmate'), 'waste');
  const RX = 368, mid = 129;
  const dTop = slots.length ? `M60 168 L60 ${slots[0].y}` : '';
  return (
    <svg class="pbdiag port" viewBox={`0 0 390 ${H}`} role="img" aria-label="Flat plumbing diagram, phone layout" preserveAspectRatio="xMidYMin meet">
      <Defs />
      <rect x={14} y={8} width={320} height={160} rx={8} class="pbbox" /><Txt x={26} y={28} c="pbt1">{dims}</Txt>
      <rect x={26} y={40} width={296} height={80} rx={6} fill="url(#pbwater)" /><rect x={26} y={108} width={296} height={12} class="pbsub" /><g opacity=".7"><Plants x0={90} x1={300} base={110} k={0.6} /></g>
      {items.map((n, i) => {
        const x = 30 + i * step, w = step - 8, flow: Flow = n.kind === 'heater' ? 'heat' : n.kind === 'chiller' ? 'cold' : n.id === 'diffuser' ? 'co2' : n.kind === 'filter' ? 'dirty' : 'clean', nl = wrap(n.name, Math.max(8, Math.floor((w - 6) / 5.2)));
        return <g><title>{[n.name, ...n.lines].join(' · ')}</title>{flow === 'heat' ? <HeatHalo cx={x + w / 2} cy={95} rx={w / 2} ry={11} /> : null}<rect x={x} y={84} width={w} height={nl.length > 1 ? 32 : 22} rx={flow === 'heat' ? 11 : 5} class="pbbox" style={`stroke:${COL[flow]}`} />{nl.map((l, k) => <Txt x={x + w / 2} y={98 + k * 11} c={`${TXT[flow]} s`} a="middle">{l}</Txt>)}{flow === 'co2' ? faintArrows([x + w / 2], 80, 62, 'co2') : null}</g>;
      })}
      {sponge ? <g><title>{`${sponge.name} · ${sponge.lines.join(' · ')}`}</title>
        <rect x={236} y={78} width={52} height={36} rx={6} fill="#3a3f47" stroke="#5b6472" /><rect x={259} y={50} width={7} height={40} rx={2} fill="#9bb3cc" fill-opacity=".25" stroke="#9bb3cc" stroke-opacity=".7" />
        <path d="M262.500 88 L262.500 54" class="pbflow dots pbbub" stroke={COL.air} stroke-width="3.5" />
        {[90, 104].map(ay => <Pipe d={`M222 ${ay} L234 ${ay}`} flow="dirty" w={1.6} />)}{[96].map(ay => <Pipe d={`M304 ${ay} L290 ${ay}`} flow="dirty" w={1.6} />)}
        <Pipe d="M259 52 L240 52" flow="clean" w={1.8} />
        <Txt x={26} y={142} c="pbt3">{wrap('Air from the pump lifts water up the tube: in through the sponge, out the top with the bubbles.', 60)[0]}</Txt><Txt x={26} y={154} c="pbt3">{wrap('Air from the pump lifts water up the tube: in through the sponge, out the top with the bubbles.', 60)[1] ?? ''}</Txt></g> : null}
      {co2 ? <>{faintArrows([240, 280, 310], 82, 54, 'co2')}<Txt x={316} y={48} c="pbtg" a="end">off-gassing</Txt></> : null}
      {slots.length ? <><Pipe d={dTop} flow="dirty" /><Txt x={70} y={190} c="pbtd">{withSump ? 'overflow drain' : 'intake'}</Txt></> : null}
      {slots.length ? <>
        <Pipe d={`M${mid} ${lastBottom} L${mid} ${retY} L${RX} ${retY} L${RX} 70 L336 70`} flow="clean" w={3} />
        {heatN ? <Pipe d={`M${mid} ${slots.find(s => s.id === heatN.id)!.y + 60} L${mid} ${retY} L${RX} ${retY} L${RX} 70`} flow="heat" dots off={3} /> : null}
        {co2 && inl ? <Pipe d={`M${mid} ${slots.find(s => s.id === inl.id)!.y + 60} L${mid} ${retY} L${RX} ${retY} L${RX} 70`} flow="co2" dots off={7} /> : null}
        <Txt x={RX - 8} y={retY + 22} c="pbtc" a="end">{`clean${co2 && inl ? ', gassed' : ''}${heatN ? ', warmed' : ''} return`}</Txt>
      </> : null}
      {slots.map((s, i) => <g>
        <Box x={14} y={s.y} w={230} h={s.h} n={s.n} stroke={s.flow === 'clean' && 'kind' in s.n && s.n.kind === 'heater' ? COL.heat : s.flow === 'clean' && 'kind' in s.n && s.n.kind === 'chiller' ? COL.cold : undefined} />
        {i ? <Pipe d={`M${mid} ${slots[i - 1].y + slots[i - 1].h} L${mid} ${s.y}`} flow="clean" /> : null}
      </g>)}
      {sides.map(s => <g><Box x={252} y={s.y} w={124} h={56} n={{ name: s.n.name, lines: s.n.lines.slice(0, 1) }} />
        {s.flow === 'co2' && inl ? <Pipe d={`M252 ${s.y + 28} L246 ${s.y + 28}`} flow="co2" /> : s.flow === 'air' ? <Pipe d={`M314 ${s.y} L314 ${s.y - 22}`} flow="air" /> : s.flow === 'co2' ? <Pipe d={`M305 ${s.y} L305 ${s.y - 22}`} flow="co2" /> : s.flow === 'waste' ? <Pipe d={`M252 ${s.y + 28} L246 ${s.y + 28}`} flow="waste" /> : <Pipe d={`M305 ${s.y} L305 ${s.y - 22}`} flow="clean" />}</g>)}
    </svg>
  );
}

const Legend = ({ p }: { p: Plumb }) => {
  const e = (f: Flow, t: string, dot = false) => <span><u class={dot ? 'dot' : ''} style={`border-color:${COL[f]}`} />{t}</span>;
  return (
    <div class="pblegend glass">
      {e('clean', 'clean water')}{p.edges.some(x => x.flow === 'dirty') ? e('dirty', 'dirty water to the filter') : null}
      {hasCo2(p) ? e('co2', 'CO₂ in, then out through plants + the surface', true) : null}
      {p.edges.some(x => x.flow === 'heat') ? e('heat', 'heat in at the heater', true) : null}
      {p.edges.some(x => x.flow === 'air') ? e('air', 'air from the pump') : null}
      {p.edges.some(x => x.flow === 'cold') ? e('cold', 'cooling') : null}{p.edges.some(x => x.flow === 'waste') ? e('waste', 'skimmate') : null}
    </div>
  );
};

/** The Plumbing view over the viewer. `overflowGph`: the overflow box's rated flow once lane PB2 has one (absent = nothing is checked). */
export function PlumbingView({ store, phone, overflowGph }: { store: Store; phone: boolean; overflowGph?: number }) {
  const [paused, setPaused] = useState(() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } });
  const S = store.tank, p = plumbingOf(S, { overflowGph }), T = S.tank;
  const dims = `${Math.round(mmToIn(T.L))} × ${Math.round(mmToIn(T.D))} × ${Math.round(mmToIn(T.H))} in · ${Math.round(p.gal)} gal`;
  const extra = p.filters.filter(f => f.kind === 'filter').length - (p.loop === 'none' || p.loop === 'sump' ? 0 : 1);
  return (
    <div class={`pbview${paused ? ' paused' : ''}${phone ? ' ph' : ''}`} role="region" aria-label="Plumbing view">
      {p.empty ? (
        <div class="pbempty"><h3>No equipment yet</h3><p>The Plumbing view draws how water, heat and CO₂ move between your gear. Add a filter, heater or CO₂ under Equipment and it appears here.</p></div>
      ) : phone ? <Flat p={p} dims={dims} /> : <Cutaway p={p} dims={dims} />}
      <div class="pbchips">
        {p.sums.filterGph ? <span class="pbchip glass"><b>Turnover</b> {p.sums.filterGph} GPH ÷ {Math.round(p.gal)} gal = {p.sums.turnover}×/hr</span> : null}
        {p.sums.heaterW ? <span class="pbchip glass"><b>Heater</b> {p.sums.heaterW} W ≈ {p.sums.wPerGal} W/gal</span> : null}
        {p.sums.circGph ? <span class="pbchip glass"><b>Circulation</b> {p.sums.circGph} GPH ÷ {Math.round(p.gal)} gal = {Math.round(p.sums.circGph / p.gal * 10) / 10}×/hr</span> : null}
        {p.sums.returnGph && p.sums.overflowGph ? <span class="pbchip glass"><b>Overflow</b> {p.sums.overflowGph} GPH rated</span> : null}
        {extra > 0 ? <span class="pbchip glass">+ {extra} more filter{extra > 1 ? 's' : ''}: {p.filters.filter(f => f.kind === 'filter').slice(1).map(f => f.name).join(', ')}</span> : null}
        {p.warnings.map(w => <span class="pbchip pbwarn glass" role="status">{w}</span>)}
      </div>
      {p.empty ? null : <div class="pbbot"><Legend p={p} /><button type="button" class="btn glass sm" onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '❚❚ Pause'}</button></div>}
    </div>
  );
}
