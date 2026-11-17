// Lane TP1 (R109): the filter controls of the picker's commercial list. Pure view over logic/tankFilter.ts. On a wide window the panel
// opens in place under the "Filters (n)" button; under 700 px the same panel is a bottom sheet with a Done button.
import { useState } from 'preact/hooks';
import { SHAPE_CLASSES, SORTS, activeCount, type Range, type ShapeClass, type SortKey, type TankFilter } from './logic/tankFilter';
import type { Units } from './logic/tank';

const CM = 2.54;
/** An open-ended min / max pair of number boxes; `scale` turns the stored value into the shown one (inches to cm). */
function RangeRow({ label, unit, r, set, scale = 1, step = 1, ph }: { label: string; unit: string; r: Range; set: (r: Range) => void; scale?: number; step?: number; ph?: [string, string] }) {
  const show = (x: number | null) => x == null ? '' : String(+(x * scale).toFixed(1));
  const parse = (t: string): number | null => { const n = parseFloat(t); return Number.isFinite(n) && n >= 0 ? n / scale : null; };
  return (
    <div class="frow"><span class="lbl">{label}</span>
      <span class="frange">
        <input class="input num" type="number" inputMode="decimal" min="0" step={step} placeholder={ph?.[0] ?? 'min'} aria-label={`${label} minimum`} value={show(r[0])} onInput={e => set([parse((e.target as HTMLInputElement).value), r[1]])} />
        <span class="unit">to</span>
        <input class="input num" type="number" inputMode="decimal" min="0" step={step} placeholder={ph?.[1] ?? 'max'} aria-label={`${label} maximum`} value={show(r[1])} onInput={e => set([r[0], parse((e.target as HTMLInputElement).value)])} />
        <span class="unit">{unit}</span>
      </span></div>
  );
}
function Seg<T extends string>({ label, v, opts, set }: { label: string; v: T; opts: [T, string][]; set: (v: T) => void }) {
  return <div class="frow"><span class="lbl">{label}</span><div class="seg" role="group" aria-label={label}>{opts.map(([k, t]) => <button type="button" class={v === k ? 'on' : ''} aria-pressed={v === k} onClick={() => set(k)}>{t}</button>)}</div></div>;
}

export function TankFilters({ f, set, shown, total, brands, u, extra = 0, onClear }: { f: TankFilter; set: (f: TankFilter) => void; shown: number; total: number; brands: [string, number][]; u: Units; /** quick chips set outside this panel (size, fits, on sale) */ extra?: number; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const n = activeCount(f) + extra, sz = u === 'in' ? 'in' : 'cm', k = u === 'in' ? 1 : CM;
  const up = (p: Partial<TankFilter>) => set({ ...f, ...p });
  const togShape = (s: ShapeClass) => up({ shapes: f.shapes.includes(s) ? f.shapes.filter(x => x !== s) : [...f.shapes, s] });
  const togBrand = (b: string) => up({ brands: f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b] });
  const panel = (
    <div class="tfpanel" role="group" aria-label="Tank filters">
      <div class="tfhead"><b>Filters</b><span class="hint" data-testid="tf-count">{shown} of {total} shown</span><button type="button" class="btn sm ghost tfdone" onClick={() => setOpen(false)}>Done</button></div>
      <RangeRow label="Capacity" unit="gal" r={f.gal} set={r => up({ gal: r })} />
      <RangeRow label="Length" unit={sz} r={f.L} set={r => up({ L: r })} scale={k} />
      <RangeRow label="Width (front to back)" unit={sz} r={f.D} set={r => up({ D: r })} scale={k} />
      <RangeRow label="Height" unit={sz} r={f.H} set={r => up({ H: r })} scale={k} />
      <RangeRow label="Price" unit="$" r={f.price} set={r => up({ price: r })} step={10} />
      <Seg label="Rim" v={f.rim} set={rim => up({ rim })} opts={[['any', 'Any'], ['rimmed', 'Rimmed'], ['rimless', 'Rimless']]} />
      <Seg label="Material" v={f.mat} set={mat => up({ mat })} opts={[['any', 'Any'], ['glass', 'Glass'], ['acrylic', 'Acrylic']]} />
      <Seg label="Sold as" v={f.build} set={build => up({ build })} opts={[['any', 'Any'], ['tank', 'Tank only'], ['kit', 'Kit']]} />
      <div class="frow col"><span class="lbl">Shape</span><div class="chips">{SHAPE_CLASSES.map(([s, t]) => <button type="button" class={`chip${f.shapes.includes(s) ? ' on' : ''}`} aria-pressed={f.shapes.includes(s)} onClick={() => togShape(s)}>{t}</button>)}</div></div>
      <div class="frow col"><span class="lbl">Maker {f.brands.length ? <span class="n">({f.brands.length})</span> : null}</span>
        <div class="chips brands">{brands.slice(0, 40).map(([b, c]) => <button type="button" class={`chip${f.brands.includes(b) ? ' on' : ''}`} aria-pressed={f.brands.includes(b)} onClick={() => togBrand(b)}>{b} <span class="n">{c}</span></button>)}</div></div>
    </div>
  );
  return (
    <div class="tfilters">
      <div class="tfbar">
        <button type="button" class={`btn sm tfbtn${open ? ' on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>Filters{n ? ` (${n})` : ''}</button>
        <label class="tfsort"><span class="unit">Sort</span><select class="select" aria-label="Sort by" value={f.sort} onChange={e => up({ sort: (e.target as HTMLSelectElement).value as SortKey })}>{SORTS.map(([k2, t]) => <option value={k2}>{t}</option>)}</select></label>
        <button type="button" class="btn sm ghost" disabled={!n} onClick={onClear} title="Clear every filter">Clear</button>
      </div>
      {open ? <><div class="tfscrim" onClick={() => setOpen(false)} />{panel}</> : null}
    </div>
  );
}
