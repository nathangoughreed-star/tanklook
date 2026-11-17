// SK1 (2026-11-17): the "Starters and kits" browse screen. Full screen (DG1 fit rules: centred, 100dvh, scrolls inside), tabs Starters /
// Bundles / On sale. A deal card shows its picture, price, $ and % saved against the parts, store, checked date and what is in the box;
// one click starts a tank from it exactly as the old chooser did (files.startDeal: pin the bundle price, load the catalog tank + gear).
import { useState } from 'preact/hooks';
import type { Files } from './files';
import { examplesInScope } from '../examples';
import { pic, picUrl } from '../ui/featuredDeals';
import { KIT_TAB_LABEL, SORTS, SORT_LABEL, cardOf, defaultSort, entriesFor, kitsModel, type KitTab, type KitsModel } from './logic/kits';
import type { DealSort, DealEntry } from '../ui/startEntries';

/** The starter examples as picture cards (the Open window's Examples tab and the Starters tab share this). */
export function ExampleGrid({ files }: { files: Files }) {
  return <div class="libgrid kitgrid">{examplesInScope().map(x => (
    <div class="card libcard"><button type="button" class="libopen" title={x.hint} onClick={() => void files.openExample(x.id)}>
      <img src={x.thumb} alt="" loading="lazy" /><b class="t">{x.name}</b><span class="m">{x.hint}</span></button></div>))}</div>;
}

function DealCardView({ e, files }: { e: DealEntry; files: Files }) {
  const c = cardOf(e), url = picUrl(c.id);
  return (
    <div class="card libcard dealcard" data-deal={c.id}>
      <div class="dealpic">{url ? <img src={url} alt="" loading="lazy" /> : <span dangerouslySetInnerHTML={{ __html: pic(e.deal, e.scene) }} />}</div>
      <b class="t">{c.title}</b>
      <span class="m dealstore">{c.store} · {c.gal} gal · checked {c.checked}{c.ends ? ` · sale ends ${c.ends}` : ''}</span>
      <span class="dealprice"><b>{c.price}</b>{c.was ? <> <s>{c.was}</s></> : null}{c.off ? <> <b class="off">{c.off}% off</b></> : null}</span>
      {c.saved ? <span class="dealsave">Saves {c.saved}{c.savedPct ? ` (${c.savedPct})` : ''} vs the parts</span> : <span class="m">{c.savingLine}</span>}
      <span class="m dealbox">Comes with: {c.comes.join(', ')}{c.notIncluded.length ? `. Not included: ${c.notIncluded.join(', ')}` : ''}</span>
      {c.guessed.length ? <span class="m"><i>Guessed: {c.guessed.join('; ')}</i></span> : null}
      <span class="acts"><button type="button" class="btn primary sm" onClick={() => void files.startDeal(e.deal, e.scene)}>Start from this</button>
        <a class="btn ghost sm" href={c.url} target="_blank" rel="noopener" title="Opens the retailer's page in a new tab (not a sponsored link)">See it at {c.store} ↗</a></span>
    </div>
  );
}

/** One deal tab: sort chips + cards. Stateless so it renders in a test. */
export function DealTab({ model, tab, by, onSort, files }: { model: KitsModel; tab: 'sale' | 'bundles'; by: DealSort; onSort: (s: DealSort) => void; files: Files }) {
  return <>
    <div class="dealsort" role="group" aria-label="Sort the deals">{SORTS.map(s => (
      <button type="button" class={`chip${by === s ? ' on' : ''}`} aria-pressed={by === s} onClick={() => onSort(s)}>{SORT_LABEL[s]}</button>))}</div>
    <div class="libgrid kitgrid">{entriesFor(model, tab, by).map(e => <DealCardView e={e} files={files} />)}</div>
    <p class="hint dealnote">{model.note}</p>
  </>;
}

export function KitsScreen({ files, Dialog, want }: { files: Files; Dialog: (p: { title: string; onClose: () => void; children: preact.ComponentChildren; wide?: boolean; full?: boolean }) => preact.VNode; want?: KitTab }) {
  const [model] = useState(() => kitsModel(Date.now(), undefined, want));
  const [tab, setTab] = useState<KitTab>(model.land);
  const [sort, setSort] = useState<Record<'sale' | 'bundles', DealSort>>({ sale: defaultSort('sale'), bundles: defaultSort('bundles') });
  return (
    <Dialog title="Starters and kits" full onClose={() => files.close()}>
      <div class="kitwrap">
        <div class="seg full" role="tablist">{model.tabs.map(t => (
          <button type="button" role="tab" aria-selected={tab === t} class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {KIT_TAB_LABEL[t]}{t === 'bundles' ? ` (${model.bundles.length})` : t === 'sale' ? ` (${model.sale.length})` : ''}</button>))}</div>
        {tab === 'starters' ? <ExampleGrid files={files} />
          : <DealTab model={model} tab={tab} by={sort[tab]} onSort={s => setSort({ ...sort, [tab]: s })} files={files} />}
        <div class="acts"><button type="button" class="btn ghost" onClick={() => files.openStart()}>Back</button></div>
      </div>
    </Dialog>
  );
}
