// PL2 (Nathan 2026-11-17): the Plants workspace's "In this tank" card. One row per species (picture, name x count, light / CO2 / fertiliser
// each against the tank with a met mark), an overall line, and the buttons for what is missing. All numbers and edits come from logic/plantNeeds.ts.
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { UserProfile } from '../demand';
import { demandFor } from './logic/checks';
import { plantNeedsView, type NeedCell, type PlantRow } from './logic/plantNeeds';
import { PlantArt } from './plants';
import { openSection } from './open';

const Cell = ({ k, c }: { k: string; c: NeedCell }) => (
  <span class={`pncell ${c.met ? 'met' : 'unmet'}`} title={`${k}: ${c.need}. This tank: ${c.have}.`}>
    <b aria-hidden="true">{c.met ? '✓' : '✗'}</b><span class="pnk">{k}</span> <span class="pnneed">{c.need}</span>
    <span class="pnhave">{c.have}</span><span class="sr">{c.met ? 'met' : 'not met'}</span>
  </span>
);

function Row({ r, onPick }: { r: PlantRow; onPick: () => void }) {
  return (
    <div class={`pnrow ${r.met ? 'met' : 'unmet'}`} data-plant={r.variant}>
      <button type="button" class="pnpic" title={`Select the first ${r.label}`} onClick={onPick}><PlantArt id={r.variant} /></button>
      <div class="pnbody">
        <div class="pnname"><b>{r.label}</b> <span class="dim">×{r.n}</span><span class={`pnmark ${r.met ? 'met' : 'unmet'}`} title={r.met ? 'Has what it needs' : 'Missing something'}>{r.met ? '✓ Met' : '✗ Not met'}</span></div>
        {r.plain ? <div class="hint pnplain">{r.plain}</div> : <div class="pncells">{r.light ? <Cell k="Light" c={r.light} /> : null}{r.co2 ? <Cell k="CO2" c={r.co2} /> : null}{r.ferts ? <Cell k={r.kind === 'coral' ? 'Dosing' : 'Ferts'} c={r.ferts} /> : null}</div>}
      </div>
    </div>
  );
}

export function PlantNeedsCard({ store, profile }: { store: Store; profile: () => UserProfile }) {
  const S = store.tank, [done, setDone] = useState('');
  const v = plantNeedsView(S, T => demandFor(T, store.scene.active, profile()).totals.setupUsd);
  const run = (label: string, apply: (t: typeof S) => void) => { store.edit(t => { apply(t); }); setDone(label); };
  if (!v.rows.length) return <div class="wstray"><div class="wstrayh"><b>In this tank</b></div><div class="hint">No plants yet. Pick one on the right to add it.</div></div>;
  return (
    <div class="pncard" aria-label="Plants in this tank">
      <div class="wstrayh"><b>In this tank</b><span class="hint">{v.total} plant{v.total === 1 ? '' : 's'}</span></div>
      <div class={`pnsum ${v.ok ? 'ok' : 'warn'}`} role="status"><span><b aria-hidden="true">{v.ok ? '✓' : '!'}</b> {v.summary}</span>
        <span class="pntank">Tank: light {v.tank.light}; CO2 {v.tank.co2}; ferts {v.tank.ferts}</span></div>
      {v.fixes.length || v.replace || v.remove ? (
        <div class="pnacts" role="group" aria-label="Fix these plants">
          {v.fixes.map(f => <button type="button" class="btn sm primary" title={f.describe} onClick={() => run(f.label, f.apply)}>{f.label}</button>)}
          {v.replace ? <button type="button" class="btn sm" title={v.replace.describe} disabled={!v.replace.count} onClick={() => run(v.replace!.label, v.replace!.apply)}>{v.replace.label}{v.replace.count ? ` (${v.replace.count})` : ''}</button> : null}
          {v.remove ? <button type="button" class="btn sm ghost" title={v.remove.describe} onClick={() => run(v.remove!.label, v.remove!.apply)}>{v.remove.label}</button> : null}
        </div>
      ) : null}
      {v.replace ? <div class="hint pnswaps">{v.replace.swaps.map(s => <div>{s.to ? <>{s.fromLabel} ×{s.n} → <b>{s.toLabel}</b></> : <>{s.fromLabel} ×{s.n}: no comparable plant suits this tank, so it stays</>}</div>)}</div> : null}
      {done ? <div class="hint" role="status">Done: {done}. Ctrl+Z undoes it.</div> : null}
      {v.co2Sys ? <div class="pnrowx"><span>CO2 system added: {v.co2Sys.label}.</span> <button type="button" class="linkbtn" onClick={() => openSection('equipment', 'co2')}>Edit it further in Equipment</button></div> : null}
      {v.fert ? (
        <div class="pnrowx pnfert"><span class="lbl">Fertiliser</span>
          <select class="select" aria-label="Fertiliser" value={v.fert.current?.id} onChange={e => run('Fertiliser changed', t => v.fert!.pick(t, (e.target as HTMLSelectElement).value))}>
            {v.fert.options.map(o => <option value={o.id}>{o.label}</option>)}</select>
          <span class="hint">{v.fert.current ? `${v.fert.current.dose} · about $${Math.round(v.fert.current.monthlyUsd)}/mo${v.fert.current.setupUsd >= 0.5 ? ` + $${Math.round(v.fert.current.setupUsd)} to set up` : ''}` : ''}</span></div>
      ) : null}
      <div class="pnrows">{v.rows.map(r => <Row r={r} onPick={() => { const it = S.items.find(x => x.variant === r.variant); if (it) store.selectItem(it.id); }} />)}</div>
    </div>
  );
}
