// UI2 shell step 8 (lane S8, 2026-11-13): the Print section (screen map §2a, mockup 08): three presets, part ticks, Print / .txt / .csv and a live paper
// preview. Draws logic/print.ts. The panel (`PrintSection`) and the paper (`PrintPaper`, beside the panel in the viewer area; inside the panel on a
// phone) share one small module-level state, so App only has to place the two.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import type { UserProfile } from '../demand/types';
import { BAG_L, defaultBagL } from '../scene/setupsheet';
import { Icon } from './ui';
import {
  PRESETS, presetById, loadPrefs, savePrefs, choosePreset, toggleTick, tickCount, paperOf, paperText, paperCsv, fileName, type Paper, type PaperGroup, type PrintPrefs,
} from './logic/print';

// ---- shared state (preset, ticks, bag size): one per page
let prefs: PrintPrefs = loadPrefs();
let bagL: number | undefined;
const subs = new Set<() => void>();
const setPrefs = (p: PrintPrefs) => { prefs = p; savePrefs(p); subs.forEach(f => f()); };
const setBag = (v: number | undefined) => { bagL = v; subs.forEach(f => f()); };
function useShared() { const [, n] = useState(0); useEffect(() => { const f = () => n(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []); return { prefs, bagL }; }

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const PRINT_PHONE = '(max-width: 699px)';

function saveText(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** The page now, rebuilt 200 ms after the scene settles (a camera move or a selection does not rebuild it). */
function usePaper(store: Store, profile: () => UserProfile, getViewer: () => Viewer | undefined): Paper {
  const { prefs: p, bagL: bag } = useShared();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let t = 0;
    const off = store.subscribe(kind => { if (kind === 'view' || kind === 'select') return; clearTimeout(t); t = window.setTimeout(() => setTick(n => n + 1), 200); });
    return () => { off(); clearTimeout(t); };
  }, [store]);
  const ticks = p.ticks[p.preset];
  return useMemo(() => {
    const shot = ticks.includes('picture') && p.preset !== 'setup' ? (() => { try { return getViewer()?.reportShot() ?? ''; } catch { return ''; } })() : '';
    return paperOf(p.preset, new Set(ticks), { scene: store.scene, active: store.scene.active, profile: profile(), bagL: bag, shot });
  }, [p.preset, ticks.join(','), bag, tick, store]);
}

function Lines({ g, prices }: { g: PaperGroup; prices: boolean }) {
  return (
    <section class="pp-sec">
      <h2><span>{g.title}</span>{prices && g.id !== 'owned' ? <b>{usd(g.total ?? 0)}</b> : g.id === 'owned' && prices ? <b>$0</b> : null}</h2>
      {g.lines.map(l => (
        <div class={`pp-row${l.sub ? ' sub' : ''}`}><span class="q">{l.qty}</span><span class="n">{l.name}</span><span class="nt">{l.note}</span>{prices ? <span class="p">{l.usd === null ? '' : usd(l.usd)}</span> : null}</div>
      ))}
    </section>
  );
}

function Sheet({ p }: { p: Paper }) {
  return (
    <>
      <h1>{p.title}</h1><p class="pp-sub">{p.sub}</p>
      {p.empty ? <p class="pp-none">Nothing is ticked: tick a part on the left to put it on the page.</p> : null}
      {p.kind === 'shopping' ? <>
        {p.shot ? <figure class="pp-shot"><img src={p.shot} alt="The tank from the front" /></figure> : null}
        {p.groups.map(g => <Lines g={g} prices={p.prices} />)}
        {p.owned ? (p.owned.lines.length ? <Lines g={p.owned} prices={p.prices} /> : <section class="pp-sec"><h2><span>Already owned</span></h2><p class="pp-none">None marked.</p></section>) : null}
        {p.where ? <section class="pp-sec"><h2><span>Where to buy</span></h2>{p.where.length ? p.where.map(w => <p class="pp-where">{w}</p>) : <p class="pp-none">No sales tracked for these items right now.</p>}</section> : null}
        {p.totals ? <div class="pp-tot"><div><span>To buy</span><b>{p.totals.toBuy}</b></div><div class="dim"><span>Already owned (not counted)</span><span>{p.totals.ownedCount}</span></div><div class="dim"><span>Monthly upkeep</span><span>{p.totals.monthly}</span></div>{p.totals.spread ? <p class="pp-note">{p.totals.spread}</p> : null}</div> : null}
      </> : null}
      {p.kind === 'setup' && p.sheet ? <>
        {p.sheet.sections.map(s => <section class="pp-sec"><h2><span>{s.title}</span></h2>{s.rows.map(r => <div class="pp-row"><span class="n">{r.item}</span><span class="q r">{r.qty}</span><span class="nt">{r.detail}</span></div>)}</section>)}
        <p class="pp-note">{p.sheet.note}</p>
      </> : null}
      {p.kind === 'report' && p.html ? <div class="pp-report" dangerouslySetInnerHTML={{ __html: p.html.replace(/^<header class="rp-head">[\s\S]*?<\/header>/, '') }} /> : null}
    </>
  );
}

/** The live paper preview. */
export function PrintPaper({ store, profile, getViewer, inline }: { store: Store; profile: () => UserProfile; getViewer: () => Viewer | undefined; inline?: boolean }) {
  const p = usePaper(store, profile, getViewer);
  return (
    <div class={inline ? 'paperinline' : 'ov paperview'}>
      <article class="paper" aria-label="Paper preview" id="ui2paper"><Sheet p={p} /></article>
    </div>
  );
}

/** Print: the paper is copied into its own element that only the print stylesheet shows (shell.css), then the browser's print dialog opens. */
function printNow() {
  const src = document.getElementById('ui2paper'); if (!src) return;
  document.getElementById('ui2print')?.remove();
  const host = document.createElement('div'); host.id = 'ui2print'; host.append(src.cloneNode(true)); document.body.append(host);
  const done = () => { host.remove(); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done); window.print();
}

export function PrintSection({ store, profile, getViewer, phone }: { store: Store; profile: () => UserProfile; getViewer: () => Viewer | undefined; phone: boolean }) {
  const { prefs: p, bagL: bag } = useShared();
  const preset = presetById(p.preset), ticks = new Set(p.ticks[p.preset]);
  const paper = usePaper(store, profile, getViewer);
  const S = store.tank, metric = store.scene.units === 'cm';
  const bagShown = (bag ?? defaultBagL(S)) / (metric ? 1 : 0.946353);
  const out = (ext: 'txt' | 'csv') => saveText(ext === 'txt' ? paperText(paper) : paperCsv(paper), ext === 'txt' ? 'text/plain' : 'text/csv', fileName(store.scene.name, p.preset, ext));
  return (
    <>
      <div class="sgroup"><h3>What to print</h3>
        <div class="presets" role="radiogroup" aria-label="What to print">
          {PRESETS.map(x => <button type="button" role="radio" aria-checked={p.preset === x.id} class={`card preset${p.preset === x.id ? ' sel' : ''}`} onClick={() => setPrefs(choosePreset(p, x.id))}><b>{x.title}</b><span>{x.blurb}</span></button>)}
        </div>
      </div>
      <div class="sgroup"><h3>Parts <span class="n">{tickCount(preset, ticks)} of {preset.parts.length}</span></h3>
        <div class="ticks">{preset.parts.map(x => (
          <label class="tick"><input type="checkbox" checked={ticks.has(x.id)} onChange={() => setPrefs(toggleTick(p, x.id))} /><span>{x.label}</span>{x.note ? <span class="hint">{x.note}</span> : null}</label>))}
        </div>
        {p.preset === 'setup' ? (
          <label class="row bagrow" title={`Loose substrate in one bag. The bag counts are worked out from this (about ${BAG_L.aquarium.toFixed(1)} L / ${BAG_L.terra.toFixed(1)} L are assumed).`}>
            <span class="lbl">Bag size</span>
            <span class="val"><input class="input num" type="number" min="0.5" step="0.5" inputMode="decimal" aria-label="Bag size" value={+bagShown.toFixed(1)}
              onChange={e => { const v = parseFloat((e.target as HTMLInputElement).value); setBag(v > 0 ? v * (metric ? 1 : 0.946353) : undefined); }} /><span class="unit">{metric ? 'L' : 'qt'}</span></span>
          </label>) : null}
        <div class="hint">A preset only picks which parts are ticked; change any tick and the page follows.</div>
      </div>
      {phone ? <PrintPaper store={store} profile={profile} getViewer={getViewer} inline /> : null}
      <div class="printbar">
        <button type="button" class="btn primary" disabled={paper.empty} onClick={printNow}><Icon name="print" /> Print</button>
        <button type="button" class="btn" disabled={paper.empty} onClick={() => out('txt')}>.txt</button>
        <button type="button" class="btn" disabled={paper.empty} onClick={() => out('csv')}>.csv</button>
      </div>
    </>
  );
}
